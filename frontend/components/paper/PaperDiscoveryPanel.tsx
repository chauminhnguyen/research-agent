"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { PaperCard } from "@/lib/types";
import { Search, FileText, Globe, BookOpen, Loader2 } from "lucide-react";

interface PaperDiscoveryPanelProps {
  sessionId: string;
  onPaperSelect: (paperId: string) => void;
  onClose?: () => void;
}

type Source = "arxiv" | "tavily" | "semantic_scholar";

const SOURCE_CONFIG: Record<Source, { label: string; icon: typeof FileText; color: string }> = {
  arxiv: { label: "arXiv", icon: BookOpen, color: "bg-orange-100 text-orange-700" },
  tavily: { label: "Tavily", icon: Globe, color: "bg-blue-100 text-blue-700" },
  semantic_scholar: { label: "S2", icon: FileText, color: "bg-green-100 text-green-700" },
};

export function PaperDiscoveryPanel({ sessionId, onPaperSelect, onClose }: PaperDiscoveryPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaperCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<Source[]>(["arxiv", "tavily", "semantic_scholar"]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const papers = await api.papers.search(query.trim(), selectedSources);
      setResults(papers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSource = (source: Source) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Paper Discovery</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="p-4 border-b space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for papers..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
        </div>

        {/* Source Filters */}
        <div className="flex gap-2">
          {(["arxiv", "tavily", "semantic_scholar"] as Source[]).map((source) => {
            const config = SOURCE_CONFIG[source];
            const Icon = config.icon;
            const isSelected = selectedSources.includes(source);
            return (
              <button
                key={source}
                type="button"
                onClick={() => toggleSource(source)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                  isSelected ? config.color : "bg-gray-100 text-gray-500"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label}
              </button>
            );
          })}
        </div>
      </form>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 text-red-600 bg-red-50 rounded-lg m-4">
            {error}
          </div>
        )}

        {results.length === 0 && !isSearching && !error && query && (
          <div className="p-8 text-center text-gray-500">
            No papers found. Try different keywords.
          </div>
        )}

        {results.length > 0 && (
          <div className="divide-y">
            {results.map((paper) => {
              const config = SOURCE_CONFIG[paper.source as Source];
              const Icon = config?.icon || FileText;
              return (
                <button
                  key={paper.id}
                  onClick={() => onPaperSelect(paper.id)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Icon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${config?.color || "bg-gray-100 text-gray-600"}`}>
                          {config?.label || paper.source}
                        </span>
                        {paper.year && (
                          <span className="text-xs text-gray-500">{paper.year}</span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
                        {paper.title}
                      </h3>
                      {paper.authors.length > 0 && (
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {paper.authors.join(", ")}
                        </p>
                      )}
                      {paper.abstract && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                          {paper.abstract}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
