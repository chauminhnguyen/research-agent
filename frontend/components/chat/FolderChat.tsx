"use client";

import * as React from "react";
import { MessageBubble } from "./MessageBubble";
import { SharePopover } from "./SharePopover";
import type { Message } from "@/lib/types";

interface Paper {
  title: string;
  url: string;
  abstract?: string;
  note?: string;
}

interface FolderChatProps {
  messages: Message[];
  isLoading: boolean;
  currentFolder: "ideas" | "code" | "paper";
  shareableIdeas?: Map<string, string>;
  onShare?: (messageId: string, targetFolder: "code" | "paper", summary: string) => void;
  searchResults?: { query: string; papers: Paper[] } | null;
  onPaperClick?: (paper: Paper) => void;
}

export function FolderChat({
  messages,
  isLoading,
  currentFolder,
  shareableIdeas = new Map(),
  onShare,
  searchResults,
  onPaperClick,
}: FolderChatProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center relative overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {/* Atmospheric backdrop */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(80, 227, 194, 0.12), transparent), radial-gradient(ellipse 50% 30% at 80% 100%, rgba(0, 124, 240, 0.06), transparent)",
          }}
        />

        <div className="relative z-10 max-w-[480px] mx-auto">
          {/* Geometric icon */}
          <div
            className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              background: "rgba(80, 227, 194, 0.12)",
              border: "1px solid rgba(80, 227, 194, 0.25)",
            }}
          >
            {currentFolder === "ideas" && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="2.5" stroke="#50e3c2" strokeWidth="1.5" />
                <path
                  d="M12 2V5M12 19V22M22 12H19M5 12H2M19.07 4.93L16.95 7.05M7.05 16.95L4.93 19.07M19.07 19.07L16.95 16.95M7.05 7.05L4.93 4.93"
                  stroke="#50e3c2"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {currentFolder === "code" && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <polyline points="16 18 22 12 16 6" stroke="#50e3c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="8 6 2 12 8 18" stroke="#50e3c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {currentFolder === "paper" && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#50e3c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2V8H20" stroke="#50e3c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          {/* Headline */}
          <h2
            className="mb-2"
            style={{
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "-0.96px",
              color: "#171717",
              lineHeight: "28px",
            }}
          >
            {currentFolder === "ideas" && "Start Ideating"}
            {currentFolder === "code" && "Start Coding"}
            {currentFolder === "paper" && "Start Writing"}
          </h2>

          {/* Subtitle */}
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "#4d4d4d" }}>
            {currentFolder === "ideas" && "Brainstorm research ideas and explore hypotheses."}
            {currentFolder === "code" && "Implement, debug, and refactor code."}
            {currentFolder === "paper" && "Draft and polish your research paper."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
      {messages.map((message) => (
        <div key={message.id}>
          <MessageBubble
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
          />

          {/* Share button for shareable ideas */}
          {currentFolder === "ideas" &&
           message.role === "assistant" &&
           message.id.startsWith("assistant-") &&
           shareableIdeas.has(message.id) && (
            <div className="mt-2 ml-12">
              <SharePopover
                messageId={message.id}
                summary={shareableIdeas.get(message.id) || ""}
                onShare={onShare}
              />
            </div>
          )}
        </div>
      ))}

      {/* Paper Search Results */}
      {searchResults && searchResults.papers.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#50e3c2" strokeWidth="2">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
              <path d="M14 2V8H20" />
            </svg>
            <span className="text-sm font-medium" style={{ color: "#171717" }}>
              Papers Found ({searchResults.papers.length})
            </span>
          </div>

          {searchResults.papers.map((paper, idx) => (
            <div
              key={idx}
              className="rounded-lg p-3 cursor-pointer transition-all hover:shadow-md"
              style={{
                background: "#ffffff",
                border: "1px solid #ebebeb",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
              onClick={() => {
                window.open(paper.url, "_blank");
                onPaperClick?.(paper);
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center"
                  style={{ background: "rgba(80, 227, 194, 0.1)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#50e3c2" strokeWidth="2">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" />
                    <path d="M14 2V8H20" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className="text-sm font-medium mb-1 line-clamp-2"
                    style={{ color: "#171717", lineHeight: "1.4" }}
                  >
                    {paper.title}
                  </h4>
                  {paper.abstract && (
                    <p
                      className="text-xs mb-2 line-clamp-2"
                      style={{ color: "#4d4d4d", lineHeight: "1.5" }}
                    >
                      {paper.abstract}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "#f5f5f5",
                        color: "#888888",
                        fontFamily: "monospace",
                      }}
                    >
                      {new URL(paper.url).hostname.replace("www.", "")}
                    </span>
                    {paper.note && (
                      <span className="text-xs" style={{ color: "#50e3c2" }}>
                        {paper.note}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-start">
          <div
            className="rounded-md px-4 py-3"
            style={{
              background: "#171717",
              boxShadow: "0px 0 0 1px rgba(0,0,0,0.05) inset",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full animate-spin"
                style={{
                  border: "2px solid rgba(80, 227, 194, 0.3)",
                  borderTopColor: "#50e3c2",
                }}
              />
              <span className="text-xs font-mono" style={{ color: "#50e3c2" }}>
                Thinking...
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
