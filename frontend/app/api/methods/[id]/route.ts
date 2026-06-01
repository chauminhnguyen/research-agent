import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: method, error } = await supabase
    .from("methods")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ method });
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
    algorithm_sketch,
    complexity,
    implementation_status,
    adapt_notes,
  } = body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (algorithm_sketch !== undefined) updates.algorithm_sketch = algorithm_sketch;
  if (complexity !== undefined) updates.complexity = complexity;
  if (implementation_status !== undefined) updates.implementation_status = implementation_status;
  if (adapt_notes !== undefined) updates.adapt_notes = adapt_notes;
  updates.updated_at = new Date().toISOString();

  const { data: method, error } = await supabase
    .from("methods")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ method });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Check if method has dependents
  const { data: expMethods } = await supabase
    .from("experiment_methods")
    .select("id")
    .eq("method_id", id);

  if (expMethods && expMethods.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete method used in experiments",
        dependents: expMethods.length,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("methods").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
