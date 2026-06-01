import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400 }
    );
  }

  const [concepts, methods, results, insights, questions] = await Promise.all([
    supabase.from("concepts").select("id, title, definition").eq("session_id", sessionId),
    supabase.from("methods").select("id, title, implementation_status").eq("session_id", sessionId),
    supabase.from("results").select("id, metric_name, dataset, metric_value").eq("session_id", sessionId),
    supabase.from("insights").select("id, content, origin").eq("session_id", sessionId),
    supabase.from("research_questions").select("id, question, status").eq("session_id", sessionId),
  ]);

  return NextResponse.json({
    concepts: concepts.data || [],
    methods: methods.data || [],
    results: results.data || [],
    insights: insights.data || [],
    questions: questions.data || [],
  });
}
