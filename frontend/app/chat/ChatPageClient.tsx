"use client";

import * as React from "react";
import Link from "next/link";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InputBar } from "@/components/chat/InputBar";
import { FolderChat } from "@/components/chat/FolderChat";
import { PinnedContext } from "@/components/chat/PinnedContext";
import { UserButton } from "@/components/auth/UserButton";
import { api } from "@/lib/api";
import { type Session, type Folder, type Message, type SharedContext } from "@/lib/types";
import { useUser } from "@clerk/clerk-react";
import { Plus, MessageSquare, Settings, Menu, Lightbulb } from "lucide-react";
import { IdeasPanel } from "@/components/ideas/IdeasPanel";
import { PaperDiscoveryPanel } from "@/components/paper/PaperDiscoveryPanel";
import { PaperReader } from "@/components/paper/PaperReader";

const FOLDER_LABELS = {
  ideas: "Ideas",
  code: "Code",
  paper: "Paper",
};

const FOLDER_ICONS = {
  ideas: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2V5M12 19V22M22 12H19M5 12H2M19.07 4.93L16.95 7.05M7.05 16.95L4.93 19.07M19.07 19.07L16.95 16.95M7.05 7.05L4.93 4.93"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  code: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  paper: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13H16M8 17H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

interface ChatPageClientProps {
  initialSessions: Session[];
}

export function ChatPageClient({ initialSessions }: ChatPageClientProps) {
  useUser();
  
  const [sessions, setSessions] = React.useState<Session[]>(initialSessions);
  const [currentSession, setCurrentSession] = React.useState<Session | null>(initialSessions[0] || null);
  const [currentFolder, setCurrentFolder] = React.useState<"ideas" | "code" | "paper">("ideas");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [pinnedContexts, setPinnedContexts] = React.useState<SharedContext[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSidebar, setShowSidebar] = React.useState(true);
  const [shareableIdeas, setShareableIdeas] = React.useState<Map<string, string>>(new Map());
  const [showIdeasPanel, setShowIdeasPanel] = React.useState(false);
  const [selectedPaperId, setSelectedPaperId] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<{query: string, papers: any[]} | null>(null);

  // Clear search results when folder changes
  React.useEffect(() => {
    setSearchResults(null);
  }, [currentFolder]);

  // Load sessions on mount
  React.useEffect(() => {
    loadSessions();
  }, []);

  // Load messages when folder changes
  React.useEffect(() => {
    if (currentSession) {
      loadMessagesForFolder();
      if (currentFolder !== "ideas") {
        loadPinnedContexts();
      } else {
        setPinnedContexts([]);
      }
    }
  }, [currentSession, currentFolder]);

  const loadSessions = async () => {
    try {
      const result = await api.sessions.list();
      const sessionsData = result.sessions || [];
      setSessions(sessionsData);
      if (sessionsData.length > 0 && !currentSession) {
        setCurrentSession(sessionsData[0]);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  const loadMessagesForFolder = async () => {
    if (!currentSession) return;
    
    const folders = currentSession.folders || [];
    const folder = folders.find((f) => f.type === currentFolder);
    if (!folder) return;

    try {
      const msgs = await api.folders.getMessages(folder.id);
      setMessages(msgs.map((m) => ({ ...m, timestamp: new Date(m.created_at) })));
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    }
  };

  const loadPinnedContexts = async () => {
    if (!currentSession) return;

    try {
      const contexts = await api.share.getForFolder(currentSession.id, currentFolder as "code" | "paper");
      setPinnedContexts(contexts);
    } catch (error) {
      console.error("Failed to load pinned contexts:", error);
      setPinnedContexts([]);
    }
  };

  const createSession = async () => {
    try {
      const session = await api.sessions.create("New Research");
      setSessions([session, ...sessions]);
      setCurrentSession(session);
      setCurrentFolder("ideas");
      setMessages([]);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleSend = async (messageText: string, module: string) => {
    // Ensure we have a session
    if (!currentSession) {
      try {
        const session = await api.sessions.create("New Research");
        setSessions([session, ...sessions]);
        setCurrentSession(session);
      } catch (error) {
        console.error("Failed to create session:", error);
        return;
      }
    }

    const session = currentSession!;
    const folders = session.folders || [];
    const folder = folders.find((f) => f.type === currentFolder);
    if (!folder) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      folder_id: folder.id,
      role: "user",
      content: messageText,
      created_at: new Date().toISOString(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setSearchResults(null); // Clear previous search results

    try {
      const body = {
        folder_id: folder.id,
        folder_type: currentFolder,
        session_id: session.id,
        messages: [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: messageText },
        ],
      };

      const response = await fetch(api.chat.streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let shareable: string | null = null;
      let papersData: any = null;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const data = JSON.parse(dataStr);

              if (data.delta) {
                assistantContent += data.delta;
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg && lastMsg.role === "user") {
                    return [
                      ...prev,
                      {
                        id: `assistant-${Date.now()}`,
                        folder_id: folder.id,
                        role: "assistant",
                        content: assistantContent,
                        created_at: new Date().toISOString(),
                        timestamp: new Date(),
                      },
                    ];
                  } else if (lastMsg && lastMsg.role === "assistant" && lastMsg.id.startsWith("assistant-")) {
                    return prev.map((m) =>
                      m.id === lastMsg.id ? { ...m, content: assistantContent } : m
                    );
                  }
                  return prev;
                });
              } else if (data.shareable) {
                shareable = data.shareable;
              } else if (data.papers) {
                papersData = data.papers;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Handle paper search results - show as interactive cards
      if (papersData && papersData.new_papers && papersData.new_papers.length > 0) {
        setSearchResults({
          query: papersData.query || "",
          papers: papersData.new_papers
        });
      }

      // Add shareable idea to state if present
      if (shareable && currentFolder === "ideas") {
        const msgId = `assistant-${Date.now()}`;
        setShareableIdeas((prev) => new Map(prev).set(msgId, shareable!));
      }

      // Refresh messages to get persisted data
      await loadMessagesForFolder(); // Load persisted messages with real IDs
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Failed to get response. Please try again.",
          created_at: new Date().toISOString(),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (messageId: string, targetFolder: "code" | "paper", summary: string) => {
    if (!currentSession) return;

    try {
      await api.share.create({
        message_id: messageId,
        session_id: currentSession.id,
        target_folder: targetFolder,
        summary,
      });

      // If we're sharing to the folder we're currently viewing, refresh pinned contexts
      if (currentFolder === targetFolder) {
        await loadPinnedContexts();
      }
    } catch (error) {
      console.error("Failed to share:", error);
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
            Sessions
          </div>
          {sessions.length === 0 ? (
            <div className="px-2 py-3 text-xs" style={{ color: "#888888" }}>
              No sessions yet
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setCurrentSession(session);
                  setCurrentFolder("ideas");
                }}
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
                  {session.title}
                </p>
                <p className="text-xs truncate" style={{ color: "#888888", fontSize: "10px" }}>
                  {formatDate(session.created_at)}
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

      {/* Main Content */}
      <main className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0 }}>
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
                {currentSession.title}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentFolder === "ideas" && currentSession && (
              <button
                onClick={() => setShowIdeasPanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-xs"
                style={{
                  background: "#171717",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#171717")}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                My Work
              </button>
            )}
            <UserButton />
          </div>
        </header>

        {/* Folder Tabs */}
        <div
          className="flex items-center px-4 flex-shrink-0"
          style={{
            height: "48px",
            borderBottom: "1px solid #ebebeb",
            background: "#ffffff",
            gap: "4px",
          }}
        >
          {(["ideas", "code", "paper"] as const).map((folderType) => (
            <button
              key={folderType}
              onClick={() => setCurrentFolder(folderType)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors"
              style={{
                background: currentFolder === folderType ? "#f5f5f5" : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: currentFolder === folderType ? 500 : 400,
                color: currentFolder === folderType ? "#171717" : "#4d4d4d",
              }}
            >
              {FOLDER_ICONS[folderType]}
              {FOLDER_LABELS[folderType]}
            </button>
          ))}
        </div>

        {/* Pinned Context for Code/Paper */}
        {currentFolder !== "ideas" && pinnedContexts.length > 0 && (
          <div
            className="px-4 py-2 flex-shrink-0"
            style={{
              borderBottom: "1px solid #ebebeb",
              background: "#fffef8",
            }}
          >
            <p className="text-xs font-medium mb-1.5" style={{ color: "#888888" }}>
              Pinned Ideas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pinnedContexts.map((ctx) => (
                <div
                  key={ctx.id}
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    background: "#fef9c3",
                    color: "#713f12",
                    border: "1px solid #fde047",
                  }}
                >
                  {ctx.summary}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col max-w-[600px] mx-auto">
              <FolderChat
                messages={messages}
                isLoading={isLoading}
                currentFolder={currentFolder}
                shareableIdeas={shareableIdeas}
                onShare={handleShare}
                searchResults={searchResults}
                onPaperClick={(paper) => {
                  console.log("Paper clicked:", paper);
                }}
              />
              <InputBar
                onSend={handleSend}
                isLoading={isLoading}
                selectedModule={currentFolder}
                onModuleChange={(module) => setCurrentFolder(module as "ideas" | "code" | "paper")}
              />
            </div>

            {/* Side Panel (Ideas or Papers) */}
            {currentSession && (
              <>
                {selectedPaperId ? (
                  <PaperReader
                    paperId={selectedPaperId}
                    onClose={() => setSelectedPaperId(null)}
                  />
                ) : currentFolder === "ideas" && showIdeasPanel ? (
                  <IdeasPanel
                    sessionId={currentSession.id}
                    isOpen={showIdeasPanel}
                    onClose={() => setShowIdeasPanel(false)}
                  />
                ) : currentFolder === "paper" ? (
                  <div className="w-80 border-l bg-white flex flex-col">
                    <PaperDiscoveryPanel
                      sessionId={currentSession.id}
                      onPaperSelect={(id) => setSelectedPaperId(id)}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
