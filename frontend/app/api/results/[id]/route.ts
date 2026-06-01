import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: result, error } = await supabase
    .from("results")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ result });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const body = await request.json();
  const { metric_name, metric_value, dataset, role } = body;

  const updates: Record<string, unknown> = {};
  if (metric_name !== undefined) updates.metric_name = metric_name;
  if (metric_value !== undefined) updates.metric_value = metric_value;
  if (dataset !== undefined) updates.dataset = dataset;
  if (role !== undefined) updates.role = role;
  updates.updated_at = new Date().toISOString();

  const { data: result, error } = await supabase
    .from("results")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ result });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Check if result is used as baseline
  const { data: baselines } = await supabase
    .from("experiment_baselines")
    .select("id")
    .eq("result_id", id);

  if (baselines && baselines.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete result used as baseline in experiments",
        dependents: baselines.length,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("results").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
