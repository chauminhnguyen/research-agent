"use client";

import * as React from "react";
import { type NodeReference, type NodeType } from "@/lib/types";
import { api } from "@/lib/api";
import { Search, X, Sparkles } from "lucide-react";

interface BuiltFromSelectorProps {
  sessionId: string;
  currentText: string;
  selectedNodes: NodeReference[];
  onAdd: (node: NodeReference) => void;
  onRemove: (nodeType: string, nodeId: string) => void;
}

const NODE_TYPE_COLORS: Record<NodeType, { bg: string; text: string; border: string }> = {
  concept: { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" },
  method: { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  result: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  insight: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  research_question: { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
  idea: { bg: "#e0e7ff", text: "#3730a3", border: "#a5b4fc" },
  experiment: { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
};

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  concept: "Concept",
  method: "Method",
  result: "Result",
  insight: "Insight",
  research_question: "Question",
  idea: "Idea",
  experiment: "Experiment",
};

export function BuiltFromSelector({
  sessionId,
  currentText,
  selectedNodes,
  onAdd,
  onRemove,
}: BuiltFromSelectorProps) {
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<NodeReference[]>([]);
  const [suggestions, setSuggestions] = React.useState<NodeReference[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-suggest based on current text
  React.useEffect(() => {
    if (currentText.length > 10) {
      const timer = setTimeout(async () => {
        try {
          const { suggestions: s } = await api.nodes.suggest(currentText, sessionId, 5);
          // Filter out already selected nodes
          const filtered = s.filter(
            (suggestion) =>
              !selectedNodes.some(
                (n) => n.node_type === suggestion.node_type && n.node_id === suggestion.node_id
              )
          );
          setSuggestions(filtered);
        } catch (error) {
          console.error("Failed to get suggestions:", error);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [currentText, sessionId, selectedNodes]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { results } = await api.nodes.search(searchQuery, sessionId);
      // Filter out already selected nodes
      const filtered = results.filter(
        (r) =>
          !selectedNodes.some((n) => n.node_type === r.node_type && n.node_id === r.node_id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error("Failed to search nodes:", error);
    } finally {
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleAddFromSuggestion = (node: NodeReference) => {
    onAdd(node);
    setSuggestions((prev) =>
      prev.filter((s) => !(s.node_type === node.node_type && s.node_id === node.node_id))
    );
  };

  const handleAddFromSearch = (node: NodeReference) => {
    onAdd(node);
    setSearchResults((prev) =>
      prev.filter((r) => !(r.node_type === node.node_type && r.node_id === node.node_id))
    );
  };

  return (
    <div className="space-y-3">
      {/* Selected Nodes */}
      {selectedNodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedNodes.map((node) => {
            const colors = NODE_TYPE_COLORS[node.node_type];
            return (
              <div
                key={`${node.node_type}-${node.node_id}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
                style={{
                  background: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <span className="font-medium">{NODE_TYPE_LABELS[node.node_type]}:</span>
                <span className="truncate max-w-[150px]">{node.title}</span>
                <button
                  onClick={() => onRemove(node.node_type, node.node_id)}
                  className="ml-1 p-0.5 rounded hover:opacity-70"
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: "#888888" }}>
            <Sparkles className="w-3 h-3" />
            Suggested based on your text
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((node) => {
              const colors = NODE_TYPE_COLORS[node.node_type];
              return (
                <button
                  key={`suggest-${node.node_type}-${node.node_id}`}
                  onClick={() => handleAddFromSuggestion(node)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-opacity hover:opacity-80"
                  style={{
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    cursor: "pointer",
                  }}
                >
                  <span className="font-medium">{NODE_TYPE_LABELS[node.node_type]}</span>
                  <span className="truncate max-w-[120px]">{node.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Toggle */}
      {!showSearch ? (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors"
          style={{
            background: "#f5f5f5",
            color: "#4d4d4d",
            border: "1px dashed #d1d5db",
            cursor: "pointer",
          }}
        >
          <Search className="w-3.5 h-3.5" />
          Search and add more nodes
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search nodes by title, paper, or content..."
              className="flex-1 px-3 py-2 rounded-md text-sm"
              style={{
                border: "1px solid #ebebeb",
                background: "#ffffff",
                color: "#171717",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#50e3c2")}
              onBlur={(e) => (e.target.style.borderColor = "#ebebeb")}
            />
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="p-2 rounded-md transition-colors"
              style={{
                background: "#f5f5f5",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X className="w-4 h-4" style={{ color: "#4d4d4d" }} />
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md border" style={{ borderColor: "#ebebeb" }}>
              {searchResults.map((node) => {
                const colors = NODE_TYPE_COLORS[node.node_type];
                return (
                  <button
                    key={`result-${node.node_type}-${node.node_id}`}
                    onClick={() => handleAddFromSearch(node)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                    style={{
                      background: "#ffffff",
                      border: "none",
                      borderBottom: "1px solid #ebebeb",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
                    <span
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {NODE_TYPE_LABELS[node.node_type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "#171717" }}>
                        {node.title}
                      </p>
                      {node.subtitle && (
                        <p className="text-xs truncate" style={{ color: "#888888" }}>
                          {node.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {isSearching && (
            <div className="text-xs text-center py-2" style={{ color: "#888888" }}>
              Searching...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
