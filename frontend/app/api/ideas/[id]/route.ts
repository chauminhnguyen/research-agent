import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: idea, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ idea });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const body = await request.json();
  const { title, contribution, status } = body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (contribution !== undefined) updates.contribution = contribution;
  if (status !== undefined) updates.status = status;
  updates.updated_at = new Date().toISOString();

  const { data: idea, error } = await supabase
    .from("ideas")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ idea });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Check if idea has dependencies (experiments)
  const { data: experiments } = await supabase
    .from("experiments")
    .select("id, title")
    .eq("idea_id", id);

  if (experiments && experiments.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete idea with dependent experiments",
        dependents: experiments,
      },
      { status: 409 }
    );
  }

  // Delete dependencies first
  await supabase.from("idea_dependencies").delete().eq("idea_id", id);

  const { error } = await supabase.from("ideas").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
