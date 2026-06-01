import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import type { NodeType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const sessionId = searchParams.get("session_id");
  const typesParam = searchParams.get("types");

  if (!query || !sessionId) {
    return NextResponse.json(
      { error: "q and session_id are required" },
      { status: 400 }
    );
  }

  const types = typesParam ? (typesParam.split(",") as NodeType[]) : null;

  // Build search results from all node types
  const results: Array<{
    node_type: NodeType;
    id: string;
    title: string;
    subtitle?: string;
    search_text: string;
    created_at: string;
  }> = [];

  const searchQuery = `%${query}%`;

  // Search concepts
  if (!types || types.includes("concept")) {
    const { data: concepts } = await supabase
      .from("concepts")
      .select("id, title, definition, source_paper, search_text, created_at")
      .eq("session_id", sessionId)
      .or(`title.ilike.${searchQuery},definition.ilike.${searchQuery},source_paper.ilike.${searchQuery}`);

    if (concepts) {
      results.push(
        ...concepts.map((c) => ({
          node_type: "concept" as NodeType,
          id: c.id,
          title: c.title,
          subtitle: c.definition ? c.definition.slice(0, 100) + (c.definition.length > 100 ? "..." : "") : undefined,
          search_text: c.search_text,
          created_at: c.created_at,
        }))
      );
    }
  }

  // Search methods
  if (!types || types.includes("method")) {
    const { data: methods } = await supabase
      .from("methods")
      .select("id, title, algorithm_sketch, source_paper, search_text, created_at, implementation_status")
      .eq("session_id", sessionId)
      .or(`title.ilike.${searchQuery},algorithm_sketch.ilike.${searchQuery},source_paper.ilike.${searchQuery}`);

    if (methods) {
      results.push(
        ...methods.map((m) => ({
          node_type: "method" as NodeType,
          id: m.id,
          title: m.title,
          subtitle: m.algorithm_sketch ? m.algorithm_sketch.slice(0, 100) + (m.algorithm_sketch.length > 100 ? "..." : "") : undefined,
          search_text: m.search_text,
          created_at: m.created_at,
          implementation_status: m.implementation_status,
        }))
      );
    }
  }

  // Search results
  if (!types || types.includes("result")) {
    const { data: resultRows } = await supabase
      .from("results")
      .select("id, metric_name, metric_value, dataset, source_paper, search_text, created_at")
      .eq("session_id", sessionId)
      .or(`metric_name.ilike.${searchQuery},dataset.ilike.${searchQuery},source_paper.ilike.${searchQuery}`);

    if (resultRows) {
      results.push(
        ...resultRows.map((r) => ({
          node_type: "result" as NodeType,
          id: r.id,
          title: r.metric_name,
          subtitle: r.dataset ? `${r.dataset}${r.metric_value ? `: ${r.metric_value}` : ""}` : undefined,
          search_text: r.search_text,
          created_at: r.created_at,
        }))
      );
    }
  }

  // Search insights
  if (!types || types.includes("insight")) {
    const { data: insights } = await supabase
      .from("insights")
      .select("id, content, source_paper, search_text, created_at, origin")
      .eq("session_id", sessionId)
      .or(`content.ilike.${searchQuery},source_paper.ilike.${searchQuery}`);

    if (insights) {
      results.push(
        ...insights.map((i) => ({
          node_type: "insight" as NodeType,
          id: i.id,
          title: i.content.slice(0, 80) + (i.content.length > 80 ? "..." : ""),
          subtitle: i.source_paper || undefined,
          search_text: i.search_text,
          created_at: i.created_at,
          origin: i.origin,
        }))
      );
    }
  }

  // Search research questions
  if (!types || types.includes("research_question")) {
    const { data: questions } = await supabase
      .from("research_questions")
      .select("id, question, hypothesis, search_text, created_at, status")
      .eq("session_id", sessionId)
      .or(`question.ilike.${searchQuery},hypothesis.ilike.${searchQuery}`);

    if (questions) {
      results.push(
        ...questions.map((q) => ({
          node_type: "research_question" as NodeType,
          id: q.id,
          title: q.question,
          subtitle: q.hypothesis ? `Hypothesis: ${q.hypothesis.slice(0, 60)}...` : undefined,
          search_text: q.search_text,
          created_at: q.created_at,
          status: q.status,
        }))
      );
    }
  }

  // Search ideas
  if (!types || types.includes("idea")) {
    const { data: ideas } = await supabase
      .from("ideas")
      .select("id, title, contribution, search_text, created_at, status")
      .eq("session_id", sessionId)
      .or(`title.ilike.${searchQuery},contribution.ilike.${searchQuery}`);

    if (ideas) {
      results.push(
        ...ideas.map((i) => ({
          node_type: "idea" as NodeType,
          id: i.id,
          title: i.title,
          subtitle: i.contribution ? i.contribution.slice(0, 100) + (i.contribution.length > 100 ? "..." : "") : undefined,
          search_text: i.search_text,
          created_at: i.created_at,
          status: i.status,
        }))
      );
    }
  }

  // Sort by relevance (simple: matching title first)
  results.sort((a, b) => {
    const aInTitle = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    const bInTitle = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    return bInTitle - aInTitle;
  });

  return NextResponse.json({ results, query });
}
