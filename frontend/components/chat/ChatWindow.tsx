"use client";

import * as React from "react";
import { MessageBubble } from "./MessageBubble";
import { ToolCallCard } from "./ToolCallCard";
import { Loader2 } from "lucide-react";

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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gradient-develop-start to-gradient-develop-end flex items-center justify-center mb-4">
          <span className="text-3xl">🔬</span>
        </div>
        <h2 className="text-xl font-semibold text-ink mb-2">
          Welcome to Research Agent
        </h2>
        <p className="text-body max-w-md">
          Start a conversation by typing a message below. Choose between Ideas, Coding, or Paper Writing modules to tailor your research experience.
        </p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
          {[
            { icon: "💡", title: "Ideas", desc: "Generate research ideas and find literature" },
            { icon: "💻", title: "Coding", desc: "Write, debug, and explain code" },
            { icon: "📝", title: "Paper", desc: "Draft and polish academic writing" },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-canvas border border-hairline rounded-md p-4 shadow-soft"
            >
              <span className="text-2xl">{item.icon}</span>
              <h3 className="font-medium text-ink mt-2">{item.title}</h3>
              <p className="text-sm text-body mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          <div className="bg-canvas border border-hairline rounded-lg px-4 py-3 shadow-soft">
            <div className="flex items-center gap-2 text-body">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
