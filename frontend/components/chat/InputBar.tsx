"use client";

import * as React from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface InputBarProps {
  onSend: (message: string, module: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  selectedModule?: string;
  onModuleChange?: (module: string) => void;
}

const modules = [
  { id: "ideas", label: "Ideas", icon: "💡" },
  { id: "coding", label: "Coding", icon: "💻" },
  { id: "paper", label: "Paper", icon: "📝" },
];

export function InputBar({ 
  onSend, 
  disabled, 
  isLoading,
  selectedModule = "ideas",
  onModuleChange
}: InputBarProps) {
  const [message, setMessage] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim(), selectedModule);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-hairline bg-canvas p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Module selector */}
        <div className="flex gap-2 justify-center">
          {modules.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => onModuleChange?.(mod.id)}
              disabled={disabled || isLoading}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                selectedModule === mod.id
                  ? "bg-primary text-on-primary"
                  : "bg-canvas-soft text-body hover:bg-hairline"
              )}
            >
              <span>{mod.icon}</span>
              <span>{mod.label}</span>
            </button>
          ))}
        </div>
        
        {/* Input area */}
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or start a research topic..."
            disabled={disabled || isLoading}
            className="min-h-[60px] max-h-[200px] resize-none"
            rows={1}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className={cn(
              "h-10 w-10 flex items-center justify-center rounded-sm transition-all self-end",
              message.trim() && !isLoading
                ? "bg-primary text-on-primary hover:bg-gray-800"
                : "bg-hairline text-mute cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <p className="text-xs text-mute text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
