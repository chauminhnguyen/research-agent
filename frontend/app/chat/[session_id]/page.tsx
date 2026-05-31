"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InputBar } from "@/components/chat/InputBar";
import { MemoryPanel } from "@/components/memory/MemoryPanel";
import { api } from "@/lib/api";
import { type Session, type ChatRequest } from "@/lib/types";
import { ArrowLeft, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

export default function SessionChatPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.session_id as string;
  
  const [session, setSession] = React.useState<Session | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [selectedModule, setSelectedModule] = React.useState("ideas");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSidebar, setShowSidebar] = React.useState(true);
  const [initialLoading, setInitialLoading] = React.useState(true);

  React.useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const sessionData = await api.sessions.get(sessionId);
      setSession(sessionData);
      setSelectedModule(sessionData.module);
      
      const history = await api.sessions.history(sessionId);
      const loadedMessages: Message[] = [];
      
      for (const event of history.events) {
        const e = event as { event_type: string; content: { role?: string; message?: string } };
        if (e.event_type === "chat_turn" && e.content?.role && e.content?.message) {
          loadedMessages.push({
            id: `msg-${loadedMessages.length}`,
            role: e.content.role as "user" | "assistant",
            content: e.content.message,
            module: sessionData.module,
            timestamp: new Date(),
          });
        }
      }
      
      setMessages(loadedMessages);
    } catch (error) {
      console.error("Failed to load session:", error);
      router.push("/chat");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSend = async (messageText: string, module: string) => {
    setIsLoading(true);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      module,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

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

  if (initialLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas-soft">
        <div className="text-body">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-canvas border-r border-hairline flex flex-col transition-all duration-300",
          showSidebar ? "w-64" : "w-0 overflow-hidden"
        )}
      >
        <div className="p-4 border-b border-hairline">
          <Link
            href="/chat"
            className="flex items-center gap-2 text-body hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sessions</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-canvas-soft">
        <header className="h-14 px-4 flex items-center justify-between border-b border-hairline bg-canvas">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-sm hover:bg-canvas-soft transition-colors"
            >
              <Menu className="w-4 h-4 text-body" />
            </button>
            {session && (
              <div>
                <h1 className="font-medium text-ink">{session.topic}</h1>
                <p className="text-xs text-mute capitalize">{session.module} Module</p>
              </div>
            )}
          </div>
        </header>

        <ChatWindow messages={messages} isLoading={isLoading} currentModule={selectedModule} />

        <InputBar
          onSend={handleSend}
          isLoading={isLoading}
          selectedModule={selectedModule}
          onModuleChange={setSelectedModule}
        />
      </main>

      <MemoryPanel sessionId={sessionId} />
    </div>
  );
}
