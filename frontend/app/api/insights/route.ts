import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const origin = searchParams.get("origin");

  let query = supabase.from("insights").select("*");

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }
  if (origin) {
    query = query.eq("origin", origin);
  }

  const { data: insights, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ insights });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const body = await request.json();
  const {
    session_id,
    content,
    origin,
    source_paper,
    source_authors,
    source_year,
    source_section,
    raw_highlight,
  } = body;

  if (!session_id || !content || !origin) {
    return NextResponse.json(
      { error: "session_id, content, and origin are required" },
      { status: 400 }
    );
  }

  const { data: insight, error } = await supabase
    .from("insights")
    .insert({
      session_id,
      content,
      origin,
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

  return NextResponse.json({ insight }, { status: 201 });
}
