"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCallCardProps {
  tool: string;
  input: Record<string, unknown>;
  output?: string;
  isCollapsed?: boolean;
}

export function ToolCallCard({ tool, input, output, isCollapsed: initialCollapsed = true }: ToolCallCardProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(initialCollapsed);

  return (
    <div className="bg-canvas border border-hairline rounded-md overflow-hidden shadow-soft">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-2 bg-canvas-soft hover:bg-hairline transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono bg-violet-100 text-violet-700">
            Tool
          </span>
          <span className="text-sm font-medium text-ink">{tool}</span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-mute" />
        ) : (
          <ChevronUp className="w-4 h-4 text-mute" />
        )}
      </button>
      
      {!isCollapsed && (
        <div className="p-4 space-y-3 border-t border-hairline">
          <div>
            <h4 className="text-xs font-mono text-mute uppercase tracking-wide mb-1">Input</h4>
            <pre className="text-xs font-mono bg-primary text-on-primary p-2 rounded-sm overflow-x-auto">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
          
          {output && (
            <div>
              <h4 className="text-xs font-mono text-mute uppercase tracking-wide mb-1">Output</h4>
              <pre className="text-xs font-mono bg-canvas-soft-2 text-ink p-2 rounded-sm overflow-x-auto border border-hairline">
                {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
