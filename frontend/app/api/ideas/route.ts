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

  const { data: ideas, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ideas });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const body = await request.json();
  const { session_id, title, contribution, status } = body;

  if (!session_id || !title) {
    return NextResponse.json(
      { error: "session_id and title are required" },
      { status: 400 }
    );
  }

  const { data: idea, error } = await supabase
    .from("ideas")
    .insert({
      session_id,
      title,
      contribution: contribution || null,
      status: status || "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ idea }, { status: 201 });
}
