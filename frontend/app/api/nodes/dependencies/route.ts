import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// Check dependencies before deletion
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const nodeType = searchParams.get("node_type");
  const nodeId = searchParams.get("node_id");

  if (!nodeType || !nodeId) {
    return NextResponse.json(
      { error: "node_type and node_id are required" },
      { status: 400 }
    );
  }

  const dependents: Array<{ type: string; id: string; title: string }> = [];

  switch (nodeType) {
    case "concept": {
      const { data } = await supabase
        .from("concept_methods")
        .select("method:methods(id, title)")
        .eq("concept_id", nodeId);
      if (data) {
        for (const d of data) {
          if (d.method) {
            dependents.push({ type: "method", id: d.method.id, title: d.method.title });
          }
        }
      }
      break;
    }

    case "method": {
      const { data } = await supabase
        .from("experiment_methods")
        .select("experiment:experiments(id, title)")
        .eq("method_id", nodeId);
      if (data) {
        for (const d of data) {
          if (d.experiment) {
            dependents.push({ type: "experiment", id: d.experiment.id, title: d.experiment.title });
          }
        }
      }
      break;
    }

    case "result": {
      const { data } = await supabase
        .from("experiment_baselines")
        .select("experiment:experiments(id, title)")
        .eq("result_id", nodeId);
      if (data) {
        for (const d of data) {
          if (d.experiment) {
            dependents.push({ type: "experiment", id: d.experiment.id, title: d.experiment.title });
          }
        }
      }
      break;
    }

    case "insight": {
      const { data } = await supabase
        .from("question_insights")
        .select("question:research_questions(id, question)")
        .eq("insight_id", nodeId);
      if (data) {
        for (const d of data) {
          if (d.question) {
            dependents.push({
              type: "research_question",
              id: d.question.id,
              title: d.question.question.slice(0, 50) + (d.question.question.length > 50 ? "..." : ""),
            });
          }
        }
      }
      break;
    }

    case "idea": {
      const { data } = await supabase
        .from("experiments")
        .select("id, title")
        .eq("idea_id", nodeId);
      if (data) {
        dependents.push(...data.map((e) => ({ type: "experiment", id: e.id, title: e.title })));
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({
    can_delete: dependents.length === 0,
    dependents,
  });
}
