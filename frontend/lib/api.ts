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
      const res = await fetch(`/api/messages?folder_id=${encodeURIComponent(folderId)}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
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
      const params = new URLSearchParams({
        session_id: sessionId,
        target_folder: targetFolder,
      });
      const res = await fetch(`/api/shared-contexts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch shared contexts");
      return res.json();
    },
  },
};
