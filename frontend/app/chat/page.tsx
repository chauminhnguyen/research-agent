"use client";

import * as React from "react";
import Link from "next/link";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InputBar } from "@/components/chat/InputBar";
import { MemoryPanel } from "@/components/memory/MemoryPanel";
import { UserButton } from "@/components/auth/UserButton";
import { api, type Session, type ChatRequest } from "@/lib/api";
import { useUser } from "@clerk/clerk-react";
import { Plus, MessageSquare, Settings, Menu } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  module?: string;
  timestamp: Date;
  toolCalls?: Array<{
    tool: string;
    input: Record<string, unknown>;
    output?: string;
  }>;
}

export default function ChatPage() {
  useUser();
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [currentSession, setCurrentSession] = React.useState<Session | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [selectedModule, setSelectedModule] = React.useState("ideas");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSidebar, setShowSidebar] = React.useState(true);

  React.useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const result = await api.sessions.list();
      setSessions(result.sessions);
      if (result.sessions.length > 0 && !currentSession) {
        setCurrentSession(result.sessions[0]);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  const createSession = async () => {
    try {
      const session = await api.sessions.create("New Research", selectedModule);
      setSessions([session, ...sessions]);
      setCurrentSession(session);
      setMessages([]);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleSend = async (messageText: string, module: string) => {
    if (!currentSession) {
      const session = await api.sessions.create("New Research", module);
      setSessions([session, ...sessions]);
      setCurrentSession(session);
    }

    const sessionId = currentSession?.id || sessions[0]?.id;
    if (!sessionId) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      module,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const body: ChatRequest = {
        message: messageText,
        session_id: sessionId,
        module: module as "ideas" | "coding" | "paper",
      };

      const response = await fetch(api.chat.streamUrl(body), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        module,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "token") {
                assistantMessage.content += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id ? { ...m, content: assistantMessage.content } : m
                  )
                );
              } else if (data.type === "tool_call") {
                if (!assistantMessage.toolCalls) assistantMessage.toolCalls = [];
                assistantMessage.toolCalls.push({ tool: data.tool, input: data.input });
              } else if (data.type === "tool_result") {
                if (assistantMessage.toolCalls?.length) {
                  assistantMessage.toolCalls[assistantMessage.toolCalls.length - 1].output = data.output;
                }
              } else if (data.type === "done") {
                break;
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "system", content: "Failed to get response. Please try again.", timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#fafafa" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300 flex-shrink-0"
        style={{
          width: showSidebar ? "220px" : "0px",
          overflow: showSidebar ? "visible" : "hidden",
          background: "#ffffff",
          borderRight: "1px solid #ebebeb",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-3 flex-shrink-0"
          style={{ height: "52px", borderBottom: "1px solid #ebebeb" }}
        >
          <div
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: "#50e3c2" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17L12 22L22 17" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-semibold text-sm" style={{ color: "#171717", letterSpacing: "-0.28px" }}>
            Research
          </span>
        </div>

        {/* New Session */}
        <div className="px-2 pt-3 pb-2">
          <button
            onClick={createSession}
            className="w-full flex items-center gap-1.5 transition-colors"
            style={{
              height: "30px",
              padding: "0 10px",
              background: "#171717",
              color: "#ffffff",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              letterSpacing: "-0.28px",
            }}
          >
            <Plus className="w-3 h-3" />
            New chat
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <div className="text-xs font-mono px-2 mb-1.5" style={{ color: "#888888", letterSpacing: "0px" }}>
            Today
          </div>
          {sessions.length === 0 ? (
            <div className="px-2 py-3 text-xs" style={{ color: "#888888" }}>
              No sessions yet
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setCurrentSession(session)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  background: currentSession?.id === session.id ? "#f5f5f5" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: "1px",
                }}
                onMouseEnter={(e) => {
                  if (currentSession?.id !== session.id) e.currentTarget.style.background = "#fafafa";
                }}
                onMouseLeave={(e) => {
                  if (currentSession?.id !== session.id) e.currentTarget.style.background = "transparent";
                }}
              >
                <p className="text-xs truncate" style={{ color: currentSession?.id === session.id ? "#171717" : "#4d4d4d", letterSpacing: "-0.28px" }}>
                  {session.topic}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-2 py-2 flex-shrink-0" style={{ borderTop: "1px solid #ebebeb" }}>
          <Link
            href="/settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              borderRadius: "6px",
              color: "#4d4d4d",
              textDecoration: "none",
              fontSize: "12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fafafa";
              e.currentTarget.style.color = "#171717";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#4d4d4d";
            }}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Center Column — constrained to ~600px */}
      <main
        className="flex flex-col flex-1 overflow-hidden"
        style={{ minWidth: 0 }}
      >
        {/* Top Bar */}
        <header
          className="flex items-center justify-between px-4 flex-shrink-0"
          style={{
            height: "52px",
            borderBottom: "1px solid #ebebeb",
            background: "#ffffff",
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 rounded transition-colors"
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Menu className="w-4 h-4" style={{ color: "#4d4d4d" }} />
            </button>
            {currentSession && (
              <h1 className="font-medium text-sm" style={{ color: "#171717", letterSpacing: "-0.28px" }}>
                {currentSession.topic}
              </h1>
            )}
          </div>
          <UserButton />
        </header>

        {/* Chat — scrollable, max-width 600px centered */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="w-full max-w-[600px] mx-auto flex flex-col flex-1 min-h-0">
            <ChatWindow messages={messages} isLoading={isLoading} currentModule={selectedModule} />
            <InputBar
              onSend={handleSend}
              isLoading={isLoading}
              selectedModule={selectedModule}
              onModuleChange={setSelectedModule}
            />
          </div>
        </div>
      </main>

      {/* Memory Panel */}
      <MemoryPanel sessionId={currentSession?.id} />
    </div>
  );
}
