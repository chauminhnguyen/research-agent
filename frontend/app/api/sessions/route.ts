import { createServerClient } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const supabase = createServerClient();
  
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*, folders(id, type, created_at)")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ sessions });
}

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { title } = await req.json();
  
  // Get Clerk user ID
  const { userId } = await auth();
  
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({ title, user_id: userId })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Create the three folders
  const { error: foldersError } = await supabase.from("folders").insert([
    { session_id: session.id, type: "ideas" },
    { session_id: session.id, type: "code" },
    { session_id: session.id, type: "paper" },
  ]);

  if (foldersError) {
    return Response.json({ error: foldersError.message }, { status: 500 });
  }

  // Fetch the complete session with folders
  const { data: fullSession } = await supabase
    .from("sessions")
    .select("*, folders(id, type, created_at)")
    .eq("id", session.id)
    .single();

  return Response.json(fullSession);
}
