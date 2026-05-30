"use client";

import * as React from "react";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  module?: string;
  timestamp?: Date;
}

export function MessageBubble({ role, content, module, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";
  const isSystem = role === "system";

  return (
    <div className="flex w-full" style={{ justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={
          isUser
            ? {
                maxWidth: "80%",
                background: "#171717",
                color: "#ffffff",
                borderRadius: "18px 18px 4px 18px",
                padding: "10px 14px",
              }
            : isSystem
            ? {
                maxWidth: "80%",
                background: "#f5f5f5",
                color: "#4d4d4d",
                borderRadius: "18px",
                padding: "10px 14px",
                fontStyle: "italic",
                fontSize: "13px",
              }
            : {
                maxWidth: "80%",
                background: "#ffffff",
                color: "#171717",
                borderRadius: "4px 18px 18px 18px",
                padding: "10px 14px",
                border: "1px solid #ebebeb",
                boxShadow: "0px 1px 1px #00000005, 0px 2px 2px #0000000a",
              }
        }
      >
        {module && !isUser && (
          <div
            className="text-xs font-mono mb-1 uppercase tracking-wide"
            style={{ color: "#50e3c2", letterSpacing: "0px" }}
          >
            {module}
          </div>
        )}
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap" style={{ fontSize: "14px", lineHeight: "22px" }}>
            {content}
          </p>
        </div>
        {timestamp && (
          <div className="text-xs font-mono mt-1.5" style={{ color: isUser ? "rgba(255,255,255,0.4)" : "#a1a1a1" }}>
            {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
