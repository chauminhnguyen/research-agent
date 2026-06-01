import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const dataset = searchParams.get("dataset");

  let query = supabase.from("results").select("*");

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }
  if (dataset) {
    query = query.eq("dataset", dataset);
  }

  const { data: results, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const body = await request.json();
  const {
    session_id,
    metric_name,
    metric_value,
    dataset,
    role,
    source_paper,
    source_authors,
    source_year,
    source_section,
    raw_highlight,
  } = body;

  if (!session_id || !metric_name) {
    return NextResponse.json(
      { error: "session_id and metric_name are required" },
      { status: 400 }
    );
  }

  const { data: result, error } = await supabase
    .from("results")
    .insert({
      session_id,
      metric_name,
      metric_value: metric_value || null,
      dataset: dataset || null,
      role: role || "baseline",
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

  return NextResponse.json({ result }, { status: 201 });
}
