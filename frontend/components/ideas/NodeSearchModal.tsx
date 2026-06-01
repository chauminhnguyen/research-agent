"use client";

import * as React from "react";
import { type NodeType, type NodeReference, type Concept, type Method, type Result, type Insight, type ResearchQuestion } from "@/lib/types";
import { api } from "@/lib/api";
import { Search, X, Filter } from "lucide-react";

interface NodeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onSelect: (node: NodeReference) => void;
  title?: string;
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

const FILTER_TYPES: NodeType[] = [
  "concept",
  "method",
  "result",
  "insight",
  "research_question",
];

export function NodeSearchModal({ isOpen, onClose, sessionId, onSelect, title = "Search Nodes" }: NodeSearchModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeFilters, setActiveFilters] = React.useState<NodeType[]>([]);
  const [results, setResults] = React.useState<NodeReference[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [allNodes, setAllNodes] = React.useState<{
    concepts: Concept[];
    methods: Method[];
    results: Result[];
    insights: Insight[];
    questions: ResearchQuestion[];
  } | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      loadAllNodes();
    }
  }, [isOpen, sessionId]);

  const loadAllNodes = async () => {
    try {
      const data = await api.nodes.getAll(sessionId);
      setAllNodes(data);
    } catch (error) {
      console.error("Failed to load nodes:", error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim() && activeFilters.length === 0) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      if (searchQuery.trim()) {
        const { results: r } = await api.nodes.search(
          searchQuery,
          sessionId,
          activeFilters.length > 0 ? { types: activeFilters } : undefined
        );
        setResults(r);
      } else {
        // Just filter existing nodes by type
        const nodes: NodeReference[] = [];
        if (allNodes) {
          if (activeFilters.length === 0 || activeFilters.includes("concept")) {
            nodes.push(...allNodes.concepts.map((c) => ({
              node_type: "concept" as NodeType,
              node_id: c.id,
              title: c.title,
              subtitle: c.definition,
            })));
          }
          if (activeFilters.length === 0 || activeFilters.includes("method")) {
            nodes.push(...allNodes.methods.map((m) => ({
              node_type: "method" as NodeType,
              node_id: m.id,
              title: m.title,
              subtitle: m.algorithm_sketch,
            })));
          }
          if (activeFilters.length === 0 || activeFilters.includes("result")) {
            nodes.push(...allNodes.results.map((r) => ({
              node_type: "result" as NodeType,
              node_id: r.id,
              title: r.metric_name,
              subtitle: r.dataset ? `${r.dataset}: ${r.metric_value}` : r.metric_value,
            })));
          }
          if (activeFilters.length === 0 || activeFilters.includes("insight")) {
            nodes.push(...allNodes.insights.map((i) => ({
              node_type: "insight" as NodeType,
              node_id: i.id,
              title: i.content.slice(0, 80) + (i.content.length > 80 ? "..." : ""),
              subtitle: i.source_paper,
            })));
          }
          if (activeFilters.length === 0 || activeFilters.includes("research_question")) {
            nodes.push(...allNodes.questions.map((q) => ({
              node_type: "research_question" as NodeType,
              node_id: q.id,
              title: q.question,
              subtitle: q.hypothesis,
            })));
          }
        }
        setResults(nodes);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && (searchQuery.trim() || activeFilters.length > 0)) {
        performSearch();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilters, isOpen]);

  const toggleFilter = (type: NodeType) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSelect = (node: NodeReference) => {
    onSelect(node);
    onClose();
    setSearchQuery("");
    setResults([]);
    setActiveFilters([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col"
        style={{ background: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid #ebebeb" }}
        >
          <h3 className="font-medium text-sm" style={{ color: "#171717" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ cursor: "pointer", background: "transparent", border: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X className="w-4 h-4" style={{ color: "#4d4d4d" }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #ebebeb" }}>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#888888" }}
            />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, paper, or content..."
              className="w-full pl-9 pr-4 py-2 rounded-md text-sm"
              style={{
                border: "1px solid #ebebeb",
                background: "#ffffff",
                color: "#171717",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#50e3c2")}
              onBlur={(e) => (e.target.style.borderColor = "#ebebeb")}
            />
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs" style={{ color: "#888888" }}>
              <Filter className="w-3 h-3 inline mr-1" />
              Filter:
            </span>
            {FILTER_TYPES.map((type) => {
              const colors = NODE_TYPE_COLORS[type];
              const isActive = activeFilters.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className="px-2 py-1 rounded text-xs transition-colors"
                  style={{
                    background: isActive ? colors.bg : "#f5f5f5",
                    color: isActive ? colors.text : "#4d4d4d",
                    border: isActive ? `1px solid ${colors.border}` : "1px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  {NODE_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="w-5 h-5 rounded-full animate-spin"
                style={{
                  border: "2px solid rgba(80, 227, 194, 0.3)",
                  borderTopColor: "#50e3c2",
                }}
              />
            </div>
          ) : results.length > 0 ? (
            <div>
              {results.map((node) => {
                const colors = NODE_TYPE_COLORS[node.node_type];
                return (
                  <button
                    key={`${node.node_type}-${node.node_id}`}
                    onClick={() => handleSelect(node)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
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
                      className="px-2 py-0.5 rounded text-xs flex-shrink-0 mt-0.5"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {NODE_TYPE_LABELS[node.node_type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: "#171717", lineHeight: "1.4" }}>
                        {node.title}
                      </p>
                      {node.subtitle && (
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{ color: "#888888", lineHeight: "1.4" }}
                        >
                          {node.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : searchQuery || activeFilters.length > 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: "#888888" }}>
                No nodes found matching your search.
              </p>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: "#888888" }}>
                Type to search or select a filter to browse.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
