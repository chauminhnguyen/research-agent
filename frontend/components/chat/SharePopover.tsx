"use client";

import * as React from "react";
import { Share2 } from "lucide-react";

interface SharePopoverProps {
  messageId: string;
  summary: string;
  onShare?: (messageId: string, targetFolder: "code" | "paper", summary: string) => void;
}

export function SharePopover({ messageId, summary, onShare }: SharePopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const [sharedTo, setSharedTo] = React.useState<Set<string>>(new Set());
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleShare = async (targetFolder: "code" | "paper") => {
    if (!onShare || isSharing || sharedTo.has(targetFolder)) return;
    
    setIsSharing(true);
    try {
      await onShare(messageId, targetFolder, summary);
      setSharedTo((prev) => new Set(prev).add(targetFolder));
    } catch (error) {
      console.error("Failed to share:", error);
    } finally {
      setIsSharing(false);
      setIsOpen(false);
    }
  };

  return (
    <div ref={popoverRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
        style={{
          background: "#f5f5f5",
          color: "#4d4d4d",
          border: "1px solid #ebebeb",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f0f0f0";
          e.currentTarget.style.borderColor = "#50e3c2";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#f5f5f5";
          e.currentTarget.style.borderColor = "#ebebeb";
        }}
      >
        <Share2 className="w-3 h-3" />
        Share to...
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 py-1 rounded-md shadow-lg z-10 min-w-[140px]"
          style={{
            background: "#ffffff",
            border: "1px solid #ebebeb",
          }}
        >
          <p className="px-3 py-1.5 text-xs" style={{ color: "#888888" }}>
            Share to:
          </p>
          
          <button
            onClick={() => handleShare("code")}
            disabled={isSharing || sharedTo.has("code")}
            className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors"
            style={{
              background: sharedTo.has("code") ? "#f0f9f6" : "transparent",
              color: sharedTo.has("code") ? "#10b981" : "#171717",
              cursor: sharedTo.has("code") ? "default" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!sharedTo.has("code")) {
                e.currentTarget.style.background = "#f5f5f5";
              }
            }}
            onMouseLeave={(e) => {
              if (!sharedTo.has("code")) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Code
            {sharedTo.has("code") && <span className="ml-auto text-green-600">✓</span>}
          </button>
          
          <button
            onClick={() => handleShare("paper")}
            disabled={isSharing || sharedTo.has("paper")}
            className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors"
            style={{
              background: sharedTo.has("paper") ? "#f0f9f6" : "transparent",
              color: sharedTo.has("paper") ? "#10b981" : "#171717",
              cursor: sharedTo.has("paper") ? "default" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!sharedTo.has("paper")) {
                e.currentTarget.style.background = "#f5f5f5";
              }
            }}
            onMouseLeave={(e) => {
              if (!sharedTo.has("paper")) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Paper
            {sharedTo.has("paper") && <span className="ml-auto text-green-600">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
