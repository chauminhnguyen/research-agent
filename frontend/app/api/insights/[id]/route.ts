import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: insight, error } = await supabase
    .from("insights")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ insight });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const body = await request.json();
  const { content, origin } = body;

  const updates: Record<string, unknown> = {};
  if (content !== undefined) updates.content = content;
  if (origin !== undefined) updates.origin = origin;
  updates.updated_at = new Date().toISOString();

  const { data: insight, error } = await supabase
    .from("insights")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ insight });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Check if insight is linked to questions
  const { data: questionInsights } = await supabase
    .from("question_insights")
    .select("id")
    .eq("insight_id", id);

  if (questionInsights && questionInsights.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete insight linked to research questions",
        dependents: questionInsights.length,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("insights").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
