import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import type { NodeType } from "@/lib/types";

// Simple keyword-based auto-suggest
// For MVP, uses basic text matching. Future: embedding-based similarity with pgvector

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");
  const sessionId = searchParams.get("session_id");
  const limit = parseInt(searchParams.get("limit") || "5", 10);

  if (!text || !sessionId) {
    return NextResponse.json(
      { error: "text and session_id are required" },
      { status: 400 }
    );
  }

  // Extract keywords from the text (remove common words)
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "must", "shall", "can", "need", "dare", "ought", "used",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into",
    "through", "during", "before", "after", "above", "below", "between",
    "and", "but", "or", "nor", "so", "yet", "both", "either", "neither",
    "not", "only", "own", "same", "than", "too", "very", "just", "also",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (words.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const results: Array<{
    node_type: NodeType;
    id: string;
    title: string;
    subtitle?: string;
    match_score: number;
  }> = [];

  const searchPattern = words.map((w) => `%${w}%`).join("");

  // Search across all node types
  const nodeTables = [
    { type: "concept" as NodeType, table: "concepts", titleField: "title", subField: "definition" },
    { type: "method" as NodeType, table: "methods", titleField: "title", subField: "algorithm_sketch" },
    { type: "result" as NodeType, table: "results", titleField: "metric_name", subField: "dataset" },
    { type: "insight" as NodeType, table: "insights", titleField: "content", subField: "source_paper" },
    { type: "research_question" as NodeType, table: "research_questions", titleField: "question", subField: "hypothesis" },
    { type: "idea" as NodeType, table: "ideas", titleField: "title", subField: "contribution" },
  ];

  for (const node of nodeTables) {
    const orConditions = words.map(() => `search_text.ilike.${searchPattern}`).join(",");
    const { data: rows } = await supabase
      .from(node.table)
      .select(`id, ${node.titleField}, ${node.subField}, search_text`)
      .eq("session_id", sessionId)
      .or(orConditions)
      .limit(limit);

    if (rows) {
      for (const row of rows) {
        const titleField = node.titleField as keyof typeof row;
        const subField = node.subField as keyof typeof row;
        const title = String(row[titleField] || "");
        const subtitle = row[subField] ? String(row[subField]) : undefined;

        // Calculate match score based on how many keywords match
        let matchScore = 0;
        const searchText = (title + " " + (subtitle || "")).toLowerCase();
        for (const word of words) {
          if (searchText.includes(word)) {
            matchScore++;
          }
        }

        results.push({
          node_type: node.type,
          id: row.id,
          title: node.type === "insight" ? title.slice(0, 80) + (title.length > 80 ? "..." : "") : title,
          subtitle: subtitle && subtitle.length > 100 ? subtitle.slice(0, 100) + "..." : subtitle,
          match_score: matchScore,
        });
      }
    }
  }

  // Sort by match score and deduplicate by type+id
  results.sort((a, b) => b.match_score - a.match_score);

  const seen = new Set<string>();
  const uniqueResults = results.filter((r) => {
    const key = `${r.node_type}-${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ suggestions: uniqueResults.slice(0, limit) });
}
