"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ToolCallCardProps {
  tool: string;
  input: Record<string, unknown>;
  output?: string;
  isCollapsed?: boolean;
}

export function ToolCallCard({
  tool,
  input,
  output,
  isCollapsed: initialCollapsed = true,
}: ToolCallCardProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(initialCollapsed);

  return (
    <div
      style={{
        background: "#171717",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0px 0 0 1px rgba(0,0,0,0.05) inset",
      }}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 transition-colors"
        style={{ background: "rgba(255,255,255,0.03)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
              background: "rgba(80, 227, 194, 0.12)",
              color: "#50e3c2",
              border: "1px solid rgba(80, 227, 194, 0.25)",
              letterSpacing: "0px",
            }}
          >
            Tool
          </span>
          <span className="text-sm" style={{ color: "#ffffff", letterSpacing: "-0.28px" }}>
            {tool}
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4" style={{ color: "#888888" }} />
        ) : (
          <ChevronUp className="w-4 h-4" style={{ color: "#888888" }} />
        )}
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <h4
              className="text-xs font-mono mb-1.5 uppercase"
              style={{ color: "#888888", letterSpacing: "0px" }}
            >
              Input
            </h4>
            <pre
              className="text-xs font-mono p-3 rounded"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#e0e0e0",
                lineHeight: "18px",
                overflowX: "auto",
              }}
            >
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>

          {output && (
            <div>
              <h4
                className="text-xs font-mono mb-1.5 uppercase"
                style={{ color: "#888888", letterSpacing: "0px" }}
              >
                Output
              </h4>
              <pre
                className="text-xs font-mono p-3 rounded"
                style={{
                  background: "rgba(80, 227, 194, 0.05)",
                  color: "#50e3c2",
                  lineHeight: "18px",
                  border: "1px solid rgba(80, 227, 194, 0.12)",
                  overflowX: "auto",
                }}
              >
                {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
