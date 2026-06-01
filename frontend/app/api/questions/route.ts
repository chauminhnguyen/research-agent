import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const status = searchParams.get("status");

  let query = supabase.from("research_questions").select("*");

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data: questions, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const body = await request.json();
  const { session_id, question, hypothesis, status } = body;

  if (!session_id || !question) {
    return NextResponse.json(
      { error: "session_id and question are required" },
      { status: 400 }
    );
  }

  const { data: result, error } = await supabase
    .from("research_questions")
    .insert({
      session_id,
      question,
      hypothesis: hypothesis || null,
      status: status || "open",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: result }, { status: 201 });
}
