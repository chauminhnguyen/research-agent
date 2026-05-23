const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  credentials?: RequestCredentials;
}

async function apiFetch<T>(path: string, options?: FetchOptions): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Request failed");
  }

  return res.json();
}

export interface User {
  id: string;
  email: string;
}

export interface Session {
  id: string;
  user_id: string;
  topic: string;
  module: "ideas" | "coding" | "paper";
  created_at: string;
  updated_at: string;
}

export interface ChatRequest {
  message: string;
  session_id: string;
  module: "ideas" | "coding" | "paper";
}

export interface ChatResponse {
  content: string;
  module: string;
  session_id: string;
}

export interface MemoryHit {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  distance?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      apiFetch<TokenResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      apiFetch<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => apiFetch<User>("/auth/me"),
  },
  sessions: {
    list: () => apiFetch<{ sessions: Session[] }>("/sessions"),
    create: (topic: string, module: string = "ideas") =>
      apiFetch<Session>("/sessions", {
        method: "POST",
        body: JSON.stringify({ topic, module }),
      }),
    get: (sessionId: string) => apiFetch<Session>(`/sessions/${sessionId}`),
    history: (sessionId: string) =>
      apiFetch<{ session: Session; events: unknown[] }>(`/sessions/${sessionId}/history`),
  },
  chat: {
    invoke: (body: ChatRequest) =>
      apiFetch<ChatResponse>("/chat/invoke", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    streamUrl: (body: ChatRequest) => `${BASE}/chat/stream`,
  },
  memory: {
    recall: (query: string, sessionId?: string, limit: number = 5) => {
      const params = new URLSearchParams({ q: query, limit: limit.toString() });
      if (sessionId) params.append("session_id", sessionId);
      return apiFetch<{ hits: MemoryHit[]; query: string }>(`/memory/recall?${params}`);
    },
    history: (sessionId: string) =>
      apiFetch<{ events: unknown[] }>(`/memory/history/${sessionId}`),
  },
};
