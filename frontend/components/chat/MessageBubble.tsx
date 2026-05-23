"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  module?: string;
  timestamp?: Date;
}

export function MessageBubble({ role, content, module, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";
  const isSystem = role === "system";
  
  const moduleColors = {
    ideas: "bg-gradient-to-r from-cyan-500/10 to-transparent",
    coding: "bg-gradient-to-r from-violet-500/10 to-transparent",
    paper: "bg-gradient-to-r from-highlight-pink/10 to-transparent",
  };

  return (
    <div className={cn(
      "flex w-full",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-3",
        isUser && "bg-primary text-on-primary",
        !isUser && !isSystem && "bg-canvas border border-hairline shadow-soft",
        isSystem && "bg-canvas-soft text-body italic text-sm",
        module && !isUser && moduleColors[module as keyof typeof moduleColors] || ""
      )}>
        {module && !isUser && (
          <div className="text-xs font-mono text-mute mb-1 uppercase tracking-wide">
            {module}
          </div>
        )}
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {timestamp && (
          <div className="text-xs text-mute mt-2 font-mono">
            {timestamp.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
