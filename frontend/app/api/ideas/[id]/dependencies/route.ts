import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Get all dependencies for this idea
  const { data: dependencies, error } = await supabase
    .from("idea_dependencies")
    .select("*")
    .eq("idea_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch node details for each dependency
  const nodeTypes = ["concept", "method", "result", "insight", "research_question"];
  const nodeMap: Record<string, unknown> = {};

  for (const dep of dependencies || []) {
    const tableName = dep.node_type === "research_question" ? "research_questions" : `${dep.node_type}s`;
    if (!nodeMap[tableName]) {
      const ids = dependencies
        .filter((d) => {
          const dTable = d.node_type === "research_question" ? "research_questions" : `${d.node_type}s`;
          return dTable === tableName;
        })
        .map((d) => d.node_id);

      if (ids.length > 0) {
        const { data: nodes } = await supabase
          .from(tableName)
          .select("id, title, content, question, definition, metric_name")
          .in("id", ids);
        if (nodes) {
          nodeMap[tableName] = nodes;
        }
      }
    }
  }

  return NextResponse.json({ dependencies, nodes: nodeMap });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const body = await request.json();
  const { node_type, node_id, adapt_notes } = body;

  if (!node_type || !node_id) {
    return NextResponse.json(
      { error: "node_type and node_id are required" },
      { status: 400 }
    );
  }

  const { data: dependency, error } = await supabase
    .from("idea_dependencies")
    .insert({
      idea_id: id,
      node_type,
      node_id,
      adapt_notes: adapt_notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ dependency }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get("node_id");

  if (!nodeId) {
    return NextResponse.json(
      { error: "node_id query parameter is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("idea_dependencies")
    .delete()
    .eq("idea_id", id)
    .eq("node_id", nodeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
