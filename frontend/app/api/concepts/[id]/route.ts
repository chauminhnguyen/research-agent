import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: concept, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ concept });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const body = await request.json();
  const { title, definition } = body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (definition !== undefined) updates.definition = definition;
  updates.updated_at = new Date().toISOString();

  const { data: concept, error } = await supabase
    .from("concepts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ concept });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Check if concept has dependents
  const { data: conceptMethods } = await supabase
    .from("concept_methods")
    .select("id")
    .eq("concept_id", id);

  if (conceptMethods && conceptMethods.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete concept with linked methods",
        dependents: conceptMethods.length,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("concepts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
