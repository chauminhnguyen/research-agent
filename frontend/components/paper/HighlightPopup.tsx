"use client";

import { useEffect, useRef } from "react";
import { MessageSquare, Bookmark } from "lucide-react";

interface HighlightPopupProps {
  position: { x: number; y: number };
  highlightText: string;
  chunkIdx: number;
  endChar: number;
  onAsk: () => void;
  onSave: () => void;
  onDismiss: () => void;
}

export function HighlightPopup({
  position,
  highlightText,
  chunkIdx,
  endChar,
  onAsk,
  onSave,
  onDismiss,
}: HighlightPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!popupRef.current) return;

    const popup = popupRef.current;
    const rect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position
    if (position.x - rect.width / 2 < 10) {
      adjustedX = rect.width / 2 + 10;
    } else if (position.x + rect.width / 2 > viewportWidth - 10) {
      adjustedX = viewportWidth - rect.width / 2 - 10;
    }

    // Adjust vertical position (show above by default)
    if (position.y - rect.height < 10) {
      // Show below if no room above
      adjustedY = position.y + rect.height + 60;
    }

    popup.style.left = `${adjustedX}px`;
    popup.style.top = `${adjustedY}px`;
    popup.style.transform = position.y - rect.height >= 10 ? "translateX(-50%) translateY(-100%)" : "translateX(-50%)";
  }, [position]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onDismiss]);

  // Truncate text for preview
  const previewText = highlightText.length > 100
    ? highlightText.slice(0, 100) + "..."
    : highlightText;

  return (
    <div
      ref={popupRef}
      className="selection-popup fixed z-50 bg-white rounded-xl shadow-xl border p-1 min-w-[200px]"
      style={{
        left: position.x,
        top: position.y,
        transform: "translateX(-50%) translateY(-100%)",
      }}
    >
      {/* Preview */}
      <div className="px-3 py-2 text-xs text-gray-500 italic border-b mb-1">
        &ldquo;{previewText}&rdquo;
      </div>

      {/* Actions */}
      <div className="flex">
        <button
          onClick={onAsk}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Ask
        </button>
        <button
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors"
        >
          <Bookmark className="w-4 h-4" />
          Save
        </button>
      </div>

      {/* Arrow pointer */}
      <div
        className="absolute w-3 h-3 bg-white border-l border-t transform rotate-45"
        style={{
          left: "50%",
          bottom: "-6px",
          marginLeft: "-6px",
          transform: "rotate(-45deg)",
        }}
      />
    </div>
  );
}
