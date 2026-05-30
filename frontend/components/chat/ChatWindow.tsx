"use client";

import * as React from "react";
import { MessageBubble } from "./MessageBubble";
import { ToolCallCard } from "./ToolCallCard";

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

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  currentModule?: string;
}

export function ChatWindow({ messages, isLoading, currentModule }: ChatWindowProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="#50e3c2"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="#50e3c2"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="#50e3c2"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
            How can I help?
          </h2>

          {/* Subtitle */}
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "#4d4d4d" }}>
            Ask anything — from research ideas and code to academic writing.
          </p>

          {/* Quick-start cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                title: "Ideas",
                desc: "Literature & hypotheses",
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="2.5" stroke="#50e3c2" strokeWidth="1.5" />
                    <path
                      d="M12 2V5M12 19V22M22 12H19M5 12H2M19.07 4.93L16.95 7.05M7.05 16.95L4.93 19.07M19.07 19.07L16.95 16.95M7.05 7.05L4.93 4.93"
                      stroke="#50e3c2"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
              {
                title: "Coding",
                desc: "Write & debug code",
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <polyline points="16 18 22 12 16 6" stroke="#50e3c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="8 6 2 12 8 18" stroke="#50e3c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
              {
                title: "Paper",
                desc: "Draft & polish",
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#50e3c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2V8H20" stroke="#50e3c2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 13H16M8 17H12" stroke="#50e3c2" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="text-left"
                style={{
                  background: "#ffffff",
                  borderRadius: "8px",
                  padding: "12px 10px",
                  border: "1px solid #ebebeb",
                  boxShadow: "0px 1px 1px #00000005, 0px 2px 2px #0000000a",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#50e3c2";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#ebebeb";
                }}
              >
                <div className="mb-2">{item.icon}</div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: "#171717", letterSpacing: "-0.28px" }}>
                  {item.title}
                </p>
                <p className="text-xs" style={{ color: "#888888", lineHeight: "14px" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
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
            module={message.module}
            timestamp={message.timestamp}
          />

          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.toolCalls.map((call, idx) => (
                <ToolCallCard
                  key={idx}
                  tool={call.tool}
                  input={call.input}
                  output={call.output}
                />
              ))}
            </div>
          )}
        </div>
      ))}

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
