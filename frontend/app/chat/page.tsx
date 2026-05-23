"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InputBar } from "@/components/chat/InputBar";
import { MemoryPanel } from "@/components/memory/MemoryPanel";
import { api, type Session, type ChatRequest } from "@/lib/api";
import { Plus, MessageSquare, Settings, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
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
        headers: {
          "Content-Type": "application/json",
        },
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
                if (!assistantMessage.toolCalls) {
                  assistantMessage.toolCalls = [];
                }
                assistantMessage.toolCalls.push({
                  tool: data.tool,
                  input: data.input,
                });
              } else if (data.type === "tool_result") {
                if (assistantMessage.toolCalls && assistantMessage.toolCalls.length > 0) {
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
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "system",
        content: "Failed to get response. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-canvas border-r border-hairline flex flex-col transition-all duration-300",
          showSidebar ? "w-64" : "w-0 overflow-hidden"
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-gradient-develop-start to-gradient-develop-end flex items-center justify-center">
              <span className="text-white text-sm">🔬</span>
            </div>
            <span className="font-semibold text-ink">Research Agent</span>
          </div>
        </div>

        {/* New Session */}
        <div className="p-4">
          <button
            onClick={createSession}
            className="w-full flex items-center justify-center gap-2 h-10 bg-primary text-on-primary rounded-sm hover:bg-gray-800 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className="text-xs font-mono text-mute uppercase tracking-wide px-2 mb-2">
            Sessions
          </div>
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setCurrentSession(session)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-sm mb-1 transition-colors flex items-center gap-2",
                currentSession?.id === session.id
                  ? "bg-canvas-soft text-ink"
                  : "text-body hover:bg-canvas-soft hover:text-ink"
              )}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{session.topic}</p>
                <p className="text-xs text-mute">{formatDate(session.updated_at)}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-hairline space-y-2">
          <Link
            href="/settings"
            className="flex items-center gap-2 text-body hover:text-ink px-3 py-2 rounded-sm hover:bg-canvas-soft transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-body hover:text-ink px-3 py-2 rounded-sm hover:bg-canvas-soft transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-canvas-soft">
        {/* Top Bar */}
        <header className="h-14 px-4 flex items-center justify-between border-b border-hairline bg-canvas">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-sm hover:bg-canvas-soft transition-colors"
            >
              <Menu className="w-4 h-4 text-body" />
            </button>
            {currentSession && (
              <div>
                <h1 className="font-medium text-ink">{currentSession.topic}</h1>
                <p className="text-xs text-mute capitalize">{currentSession.module} Module</p>
              </div>
            )}
          </div>
        </header>

        {/* Chat */}
        <ChatWindow messages={messages} isLoading={isLoading} currentModule={selectedModule} />

        {/* Input */}
        <InputBar
          onSend={handleSend}
          isLoading={isLoading}
          selectedModule={selectedModule}
          onModuleChange={setSelectedModule}
        />
      </main>

      {/* Memory Panel */}
      <MemoryPanel sessionId={currentSession?.id} />
    </div>
  );
}
