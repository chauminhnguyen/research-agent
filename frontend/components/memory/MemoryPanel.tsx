"use client";

import * as React from "react";
import { Search, Clock, FileText, Lightbulb, Code, BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import { type MemoryHit } from "@/lib/types";

interface MemoryPanelProps {
  sessionId?: string;
  currentQuery?: string;
}

export function MemoryPanel({ sessionId, currentQuery }: MemoryPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [width, setWidth] = React.useState(280);
  const [query, setQuery] = React.useState(currentQuery || "");
  const [hits, setHits] = React.useState<MemoryHit[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (currentQuery && currentQuery.length > 2) {
      setQuery(currentQuery);
      performRecall(currentQuery);
    }
  }, [currentQuery]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(newWidth, 220), 480));
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const performRecall = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setHits([]);
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.memory.recall(searchQuery, sessionId, 5);
      setHits(result.hits);
    } catch (error) {
      console.error("Failed to recall memory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performRecall(query);
  };

  const getIcon = (eventType?: string) => {
    switch (eventType) {
      case "paper_read":
        return <BookOpen className="w-3.5 h-3.5" style={{ color: "#7928ca" }} />;
      case "hypothesis":
        return <Lightbulb className="w-3.5 h-3.5" style={{ color: "#f5a623" }} />;
      case "code_saved":
        return <Code className="w-3.5 h-3.5" style={{ color: "#50e3c2" }} />;
      default:
        return <FileText className="w-3.5 h-3.5" style={{ color: "#888888" }} />;
    }
  };

  return (
    <div
      ref={panelRef}
      className="flex flex-col flex-shrink-0 relative"
      style={{
        width: isExpanded ? `${width}px` : "0px",
        overflow: "hidden",
        background: "#ffffff",
        borderLeft: isExpanded ? "1px solid #ebebeb" : "none",
        transition: isResizing ? "none" : "width 0.3s ease",
      }}
    >
      {/* Resize handle */}
      {isExpanded && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10"
          onMouseDown={() => setIsResizing(true)}
          style={{ background: "transparent" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(80, 227, 194, 0.3)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        />
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 flex-shrink-0"
        style={{ height: "52px", borderBottom: "1px solid #ebebeb" }}
      >
        {isExpanded && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: "#4d4d4d" }} />
            <span className="text-sm font-medium" style={{ color: "#171717", letterSpacing: "-0.28px" }}>
              Memory
            </span>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded transition-colors"
          style={{ cursor: "pointer", marginLeft: isExpanded ? "auto" : "0" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {isExpanded ? (
            <svg className="w-3.5 h-3.5" style={{ color: "#4d4d4d" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" style={{ color: "#4d4d4d" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Search */}
          <form onSubmit={handleSearch} className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#888888" }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search memory..."
                style={{
                  width: "100%",
                  height: "32px",
                  paddingLeft: "28px",
                  paddingRight: "10px",
                  fontSize: "12px",
                  background: "#fafafa",
                  border: "1px solid #ebebeb",
                  borderRadius: "6px",
                  color: "#171717",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#50e3c2")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#ebebeb")}
              />
            </div>
          </form>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {isLoading ? (
              <div className="text-center py-6 text-xs" style={{ color: "#888888" }}>
                Searching...
              </div>
            ) : hits.length > 0 ? (
              <>
                <div className="text-xs font-mono mb-2" style={{ color: "#888888", letterSpacing: "0px" }}>
                  Relevant Memories
                </div>
                {hits.map((hit) => (
                  <div
                    key={hit.id}
                    style={{
                      padding: "10px",
                      background: "#fafafa",
                      borderRadius: "6px",
                      border: "1px solid #ebebeb",
                      marginBottom: "6px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "#50e3c2")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "#ebebeb")}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="mt-0.5 flex-shrink-0">{getIcon(hit.metadata?.event_type as string)}</div>
                      <p className="text-xs leading-relaxed" style={{ color: "#4d4d4d", lineHeight: "16px" }}>
                        {hit.content}
                      </p>
                    </div>
                    {hit.distance !== undefined && (
                      <div className="mt-1.5 text-xs font-mono" style={{ color: "#a1a1a1" }}>
                        Relevance: {Math.round((1 - hit.distance) * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : query.length > 2 ? (
              <div className="text-center py-6 text-xs" style={{ color: "#888888" }}>
                No memories found
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Clock className="w-7 h-7 mb-2" style={{ color: "#d4d4d4" }} />
                <p className="text-xs text-center leading-relaxed" style={{ color: "#888888" }}>
                  Your conversation context will appear here
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
