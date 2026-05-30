import { createServerClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const body = await req.json();
  const { folder_id, session_id, target_folder } = body;

  // Get count for pinned_order
  const { count } = await supabase
    .from("shared_contexts")
    .select("*", { count: "exact", head: true })
    .eq("session_id", session_id)
    .eq("target_folder", target_folder);

  const { data, error } = await supabase
    .from("shared_contexts")
    .insert({
      message_id: body.message_id,
      session_id,
      target_folder,
      summary: body.summary,
      pinned_order: (count ?? 0) + 1,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, id: data.id });
}
