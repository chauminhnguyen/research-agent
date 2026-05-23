"use client";

import * as React from "react";
import { Search, Clock, FileText, Lightbulb, Code, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type MemoryHit } from "@/lib/api";

interface MemoryPanelProps {
  sessionId?: string;
  currentQuery?: string;
}

export function MemoryPanel({ sessionId, currentQuery }: MemoryPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [query, setQuery] = React.useState(currentQuery || "");
  const [hits, setHits] = React.useState<MemoryHit[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (currentQuery && currentQuery.length > 2) {
      setQuery(currentQuery);
      performRecall(currentQuery);
    }
  }, [currentQuery]);

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
        return <BookOpen className="w-4 h-4 text-violet-600" />;
      case "hypothesis":
        return <Lightbulb className="w-4 h-4 text-warning" />;
      case "code_saved":
        return <Code className="w-4 h-4 text-cyan-600" />;
      default:
        return <FileText className="w-4 h-4 text-body" />;
    }
  };

  return (
    <div
      className={cn(
        "h-full border-l border-hairline bg-canvas flex flex-col transition-all duration-300",
        isExpanded ? "w-80" : "w-12"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-hairline flex items-center justify-between">
        {isExpanded && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-body" />
            <span className="text-sm font-medium text-ink">Memory</span>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-sm hover:bg-canvas-soft transition-colors"
        >
          {isExpanded ? (
            <svg className="w-4 h-4 text-body" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-body" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Search */}
          <form onSubmit={handleSearch} className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search memory..."
                className="w-full h-9 pl-9 pr-3 text-sm bg-canvas-soft border border-hairline rounded-sm focus:border-link focus:outline-none focus:ring-1 focus:ring-link"
              />
            </div>
          </form>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-body text-sm">
                Searching...
              </div>
            ) : hits.length > 0 ? (
              <>
                <div className="text-xs font-mono text-mute uppercase tracking-wide">
                  Relevant Memories
                </div>
                {hits.map((hit) => (
                  <div
                    key={hit.id}
                    className="p-3 bg-canvas-soft rounded-sm border border-hairline hover:border-hairline-strong transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {getIcon(hit.metadata?.event_type as string)}
                      <p className="text-sm text-ink line-clamp-3 flex-1">
                        {hit.content}
                      </p>
                    </div>
                    {hit.distance !== undefined && (
                      <div className="mt-2 text-xs text-mute font-mono">
                        Relevance: {Math.round((1 - hit.distance) * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : query.length > 2 ? (
              <div className="text-center py-8 text-body text-sm">
                No memories found
              </div>
            ) : (
              <div className="text-center py-8 text-body text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 text-mute opacity-50" />
                <p>Your conversation context will appear here</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
