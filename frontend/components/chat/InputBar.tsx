"use client";

import * as React from "react";
import { Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface InputBarProps {
  onSend: (message: string, module: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  selectedModule?: string;
  onModuleChange?: (module: string) => void;
}

const modules = [
  { id: "ideas", label: "Ideas" },
  { id: "coding", label: "Coding" },
  { id: "paper", label: "Paper" },
];

export function InputBar({
  onSend,
  disabled,
  isLoading,
  selectedModule = "ideas",
  onModuleChange,
}: InputBarProps) {
  const [message, setMessage] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim(), selectedModule);
      setMessage("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  return (
    <div
      className="flex-shrink-0 px-4 pb-4"
      style={{ borderTop: "1px solid transparent" }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Segmented module tabs */}
        <div
          className="flex items-center self-start"
          style={{
            background: "#f5f5f5",
            borderRadius: "8px",
            padding: "3px",
            gap: "2px",
          }}
        >
          {modules.map((mod) => {
            const active = selectedModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onModuleChange?.(mod.id)}
                disabled={disabled || isLoading}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: disabled || isLoading ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  letterSpacing: "-0.28px",
                  transition: "all 0.15s",
                  background: active ? "#50e3c2" : "transparent",
                  color: active ? "#171717" : "#4d4d4d",
                  opacity: disabled || isLoading ? 0.5 : 1,
                }}
              >
                {mod.label}
              </button>
            );
          })}
        </div>

        {/* Input with send button inside */}
        <div
          className="flex items-end gap-2"
          style={{
            background: "#ffffff",
            border: "1px solid #ebebeb",
            borderRadius: "12px",
            padding: "6px 6px 6px 14px",
            boxShadow: "0px 1px 1px #00000005, 0px 2px 2px #0000000a, 0px 0 0 1px #00000014 inset",
            transition: "border-color 0.15s",
          }}
          onFocusCapture={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "#50e3c2";
          }}
          onBlurCapture={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "#ebebeb";
          }}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={disabled || isLoading}
            rows={1}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "14px",
              lineHeight: "20px",
              color: "#171717",
              background: "transparent",
              fontFamily: "inherit",
              maxHeight: "120px",
              overflowY: "auto",
            }}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "none",
              cursor: message.trim() && !isLoading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.15s",
              background: message.trim() && !isLoading ? "#50e3c2" : "#f5f5f5",
              color: message.trim() && !isLoading ? "#171717" : "#a1a1a1",
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <p className="text-xs font-mono text-center" style={{ color: "#a1a1a1" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
