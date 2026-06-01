"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { EnrichedContext, NodeType, EnrichRequest, SaveRequest } from "@/lib/types";
import { X, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface SaveToWikiModalProps {
  paperId: string;
  paperTitle: string;
  highlightText: string;
  chunkIdx: number;
  endChar: number;
  onClose: () => void;
  onSaved: () => void;
}

const NODE_TYPES: { value: NodeType; label: string; description: string }[] = [
  { value: "concept", label: "Concept", description: "Definition or theory from the paper" },
  { value: "method", label: "Method", description: "Technique or algorithm" },
  { value: "result", label: "Result", description: "Experimental result or benchmark" },
  { value: "insight", label: "Insight", description: "Observation or research note" },
  { value: "research_question", label: "Question", description: "Research question" },
  { value: "idea", label: "Idea", description: "Novel idea or contribution" },
  { value: "experiment", label: "Experiment", description: "Experiment description" },
];

type SaveState = "idle" | "enriching" | "saving" | "success" | "error";

export function SaveToWikiModal({
  paperId,
  paperTitle,
  highlightText,
  chunkIdx,
  endChar,
  onClose,
  onSaved,
}: SaveToWikiModalProps) {
  const [selectedType, setSelectedType] = useState<NodeType>("concept");
  const [customTitle, setCustomTitle] = useState("");
  const [enrichedContext, setEnrichedContext] = useState<EnrichedContext | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Fetch enriched context when modal opens
  useEffect(() => {
    const fetchEnrichedContext = async () => {
      setSaveState("enriching");
      try {
        const req: EnrichRequest = {
          highlight_text: highlightText,
          highlight_chunk_idx: chunkIdx,
          highlight_end_char: endChar,
          window: 3,
          fetch_abstracts: false,
        };

        const context = await api.papers.enrich(paperId, req);
        setEnrichedContext(context);
        setSaveState("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to enrich context");
        setSaveState("error");
      }
    };

    fetchEnrichedContext();
  }, [paperId, highlightText, chunkIdx, endChar]);

  const handleSave = async () => {
    if (!enrichedContext) return;

    setSaveState("saving");
    setError(null);

    try {
      const req: SaveRequest = {
        enriched_context: enrichedContext,
        node_type: selectedType,
        custom_title: customTitle || undefined,
      };

      await api.papers.save(paperId, req);
      setSaveState("success");
      setTimeout(() => {
        onSaved();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaveState("error");
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && saveState !== "saving") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saveState]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={saveState !== "saving" ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Save to Wiki</h2>
          <button
            onClick={onClose}
            disabled={saveState === "saving"}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Source Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Source Paper</p>
            <p className="text-sm font-medium truncate">{paperTitle}</p>
          </div>

          {/* Highlighted Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Highlighted Text
            </label>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm italic">
              &ldquo;{highlightText.length > 200 ? highlightText.slice(0, 200) + "..." : highlightText}&rdquo;
            </div>
          </div>

          {/* Enriched Context Preview */}
          {saveState === "enriching" && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Enriching context...</span>
            </div>
          )}

          {saveState === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {enrichedContext && saveState !== "enriching" && (
            <>
              {/* Enriched Text */}
              {enrichedContext.boundary_text && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enriched Context ({enrichedContext.boundary_type})
                  </label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    {enrichedContext.boundary_text.length > 300
                      ? enrichedContext.boundary_text.slice(0, 300) + "..."
                      : enrichedContext.boundary_text}
                  </div>
                </div>
              )}

              {/* Resolved References */}
              {enrichedContext.resolved_refs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cross-References ({enrichedContext.resolved_refs.length})
                  </label>
                  <div className="space-y-1">
                    {enrichedContext.resolved_refs.slice(0, 5).map(([type, id, content], i) => (
                      <div key={i} className="text-sm bg-gray-50 rounded p-2">
                        <span className="font-medium text-gray-600 uppercase text-xs">
                          {type} {id}
                        </span>
                        : {content.length > 100 ? content.slice(0, 100) + "..." : content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Node Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Node Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {NODE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  disabled={saveState === "saving" || saveState === "enriching"}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedType === type.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  } disabled:opacity-50`}
                >
                  <p className="font-medium text-sm">{type.label}</p>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Title (optional)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Auto-generated from content"
              disabled={saveState === "saving" || saveState === "enriching"}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={saveState === "saving" || saveState === "enriching"}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!enrichedContext || saveState === "saving" || saveState === "enriching"}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saveState === "success" ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Saved!
              </>
            ) : (
              "Save to Wiki"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
