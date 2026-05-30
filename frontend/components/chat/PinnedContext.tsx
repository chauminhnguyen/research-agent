"use client";

import * as React from "react";
import type { SharedContext } from "@/lib/types";

interface PinnedContextProps {
  contexts: SharedContext[];
  targetFolder: "code" | "paper";
}

export function PinnedContext({ contexts, targetFolder }: PinnedContextProps) {
  if (contexts.length === 0) {
    return null;
  }

  return (
    <div
      className="px-4 py-2 flex-shrink-0"
      style={{
        borderBottom: "1px solid #fde047",
        background: "#fffef8",
      }}
    >
      <p className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: "#713f12" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L12 22M12 2L8 6M12 2L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Pinned from Ideas
      </p>
      <div className="flex flex-wrap gap-1.5">
        {contexts.map((ctx) => (
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
  );
}
