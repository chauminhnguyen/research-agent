import { createServerClient } from "@/lib/supabase-server";
import { ChatPageClient } from "./ChatPageClient";
import type { Session } from "@/lib/types";

export default async function ChatPage() {
  let initialSessions: Session[] = [];

  try {
    const supabase = await createServerClient();
    const { data: sessions } = await supabase
      .from("sessions")
      .select("*, folders(id, type, created_at)")
      .order("created_at", { ascending: false });

    initialSessions = sessions || [];
  } catch (error) {
    console.error("Failed to load sessions:", error);
  }

  return <ChatPageClient initialSessions={initialSessions} />;
}
