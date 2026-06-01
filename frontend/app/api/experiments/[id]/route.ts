import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Get experiment
  const { data: experiment, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Get associated methods
  const { data: methods } = await supabase
    .from("experiment_methods")
    .select("*, method:methods(*)")
    .eq("experiment_id", id);

  // Get associated baselines
  const { data: baselines } = await supabase
    .from("experiment_baselines")
    .select("*, result:results(*)")
    .eq("experiment_id", id);

  return NextResponse.json({ experiment, methods, baselines });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const body = await request.json();
  const {
    title,
    description,
    status,
    code_entry,
    config_path,
    notes,
    results_json,
  } = body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (code_entry !== undefined) updates.code_entry = code_entry;
  if (config_path !== undefined) updates.config_path = config_path;
  if (notes !== undefined) updates.notes = notes;
  if (results_json !== undefined) updates.results_json = results_json;
  updates.updated_at = new Date().toISOString();

  const { data: experiment, error } = await supabase
    .from("experiments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ experiment });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Delete associated records first
  await supabase.from("experiment_methods").delete().eq("experiment_id", id);
  await supabase.from("experiment_baselines").delete().eq("experiment_id", id);

  const { error } = await supabase.from("experiments").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
