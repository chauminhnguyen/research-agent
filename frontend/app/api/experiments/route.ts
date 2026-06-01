import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const ideaId = searchParams.get("idea_id");
  const status = searchParams.get("status");

  let query = supabase.from("experiments").select("*");

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }
  if (ideaId) {
    query = query.eq("idea_id", ideaId);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data: experiments, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ experiments });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const body = await request.json();
  const {
    session_id,
    idea_id,
    title,
    description,
    status,
    code_entry,
    config_path,
  } = body;

  if (!session_id || !title) {
    return NextResponse.json(
      { error: "session_id and title are required" },
      { status: 400 }
    );
  }

  const { data: experiment, error } = await supabase
    .from("experiments")
    .insert({
      session_id,
      idea_id: idea_id || null,
      title,
      description: description || null,
      status: status || "planned",
      code_entry: code_entry || null,
      config_path: config_path || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ experiment }, { status: 201 });
}
