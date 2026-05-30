import { createServerClient } from "@/lib/supabase";
import type { Session, Folder, Message, SharedContext, ChatMessage } from "@/lib/types";

const BASE = process.env.AGENT_API_URL || "http://localhost:8000";

export const api = {
  sessions: {
    list: async (): Promise<{ sessions: Session[] }> => {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },

    create: async (title: string): Promise<Session> => {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      return res.json();
    },

    get: async (sessionId: string): Promise<Session> => {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  },

  folders: {
    getMessages: async (folderId: string): Promise<Message[]> => {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("folder_id", folderId)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
  },

  chat: {
    streamUrl: "/api/chat",
  },

  share: {
    create: async (data: {
      message_id: string;
      session_id: string;
      target_folder: "code" | "paper";
      summary: string;
    }): Promise<{ ok: boolean }> => {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to share");
      return res.json();
    },

    getForFolder: async (
      sessionId: string,
      targetFolder: "code" | "paper"
    ): Promise<SharedContext[]> => {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from("shared_contexts")
        .select("*")
        .eq("session_id", sessionId)
        .eq("target_folder", targetFolder)
        .order("pinned_order", { ascending: true });

      if (error) throw new Error(error.message);
      return data || [];
    },
  },
};
