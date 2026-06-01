import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const status = searchParams.get("status");

  let query = supabase.from("methods").select("*");

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }
  if (status) {
    query = query.eq("implementation_status", status);
  }

  const { data: methods, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ methods });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const body = await request.json();
  const {
    session_id,
    title,
    algorithm_sketch,
    complexity,
    implementation_status,
    source_paper,
    source_authors,
    source_year,
    source_section,
    raw_highlight,
  } = body;

  if (!session_id || !title) {
    return NextResponse.json(
      { error: "session_id and title are required" },
      { status: 400 }
    );
  }

  const { data: method, error } = await supabase
    .from("methods")
    .insert({
      session_id,
      title,
      algorithm_sketch: algorithm_sketch || null,
      complexity: complexity || null,
      implementation_status: implementation_status || "to_implement",
      source_paper: source_paper || null,
      source_authors: source_authors || null,
      source_year: source_year || null,
      source_section: source_section || null,
      raw_highlight: raw_highlight || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ method }, { status: 201 });
}
