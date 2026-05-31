import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const targetFolder = searchParams.get("target_folder");

  if (!sessionId || !targetFolder) {
    return Response.json(
      { error: "session_id and target_folder are required" },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("shared_contexts")
    .select("*")
    .eq("session_id", sessionId)
    .eq("target_folder", targetFolder)
    .order("pinned_order", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data || []);
}
