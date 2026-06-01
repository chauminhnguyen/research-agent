"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import type { Paper, Chunk, DocumentIndex, EnrichedContext, EnrichRequest, NodeType } from "@/lib/types";
import { HighlightPopup } from "./HighlightPopup";
import { SaveToWikiModal } from "./SaveToWikiModal";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

interface PaperReaderProps {
  paperId: string;
  onClose: () => void;
  onAsk?: (context: EnrichedContext) => void;
}

interface Selection {
  text: string;
  chunkIdx: number;
  endChar: number;
  rect: DOMRect;
}

export function PaperReader({ paperId, onClose, onAsk }: PaperReaderProps) {
  const [paper, setPaper] = useState<Paper | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [index, setIndex] = useState<DocumentIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Load paper and chunks
  useEffect(() => {
    const loadPaper = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch paper metadata and chunks in parallel
        const [paperData, chunksData] = await Promise.all([
          api.papers.get(paperId),
          api.papers.getChunks(paperId),
        ]);

        setPaper(paperData);
        setChunks(chunksData.chunks);
        setIndex(chunksData.index);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load paper");
      } finally {
        setIsLoading(false);
      }
    };

    loadPaper();
  }, [paperId]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !contentRef.current) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    // Find which chunk contains the selection
    const range = sel.getRangeAt(0);
    const container = contentRef.current;
    const chunkElements = container.querySelectorAll("[data-chunk-idx]");

    let chunkIdx = 0;
    let endChar = 0;

    for (const el of chunkElements) {
      const idx = parseInt(el.getAttribute("data-chunk-idx") || "0", 10);
      const textContent = el.textContent || "";
      
      if (el.contains(range.startContainer)) {
        chunkIdx = idx;
        // Calculate end char relative to chunk start
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(el);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        endChar = preCaretRange.toString().length;
        break;
      }
    }

    const rect = range.getBoundingClientRect();

    setSelection({
      text,
      chunkIdx,
      endChar,
      rect,
    });
  }, []);

  // Clear selection when clicking elsewhere
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest(".selection-popup")) {
      // Don't clear if clicking on popup
      setSelection(null);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelection(null);
        setSaveModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Group chunks by page
  const chunksByPage = chunks.reduce((acc, chunk) => {
    const page = chunk.page;
    if (!acc[page]) acc[page] = [];
    acc[page].push(chunk);
    return acc;
  }, {} as Record<number, Chunk[]>);

  const totalPages = Math.max(...Object.keys(chunksByPage).map(Number), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-red-600 mb-4">{error || "Paper not found"}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentChunks = chunksByPage[currentPage] || [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{paper.title}</h2>
          <p className="text-sm text-gray-500 truncate">
            {paper.authors.join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {/* Zoom Controls */}
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Page Navigation */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[4rem] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="ml-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-8" onClick={handleClick}>
        <div
          ref={contentRef}
          className="max-w-3xl mx-auto bg-white shadow-lg"
          style={{ fontSize: `${zoom}em`, transformOrigin: "top center" }}
          onMouseUp={handleMouseUp}
        >
          {currentChunks.map((chunk) => (
            <div
              key={chunk.idx}
              data-chunk-idx={chunk.idx}
              className={`prose prose-sm max-w-none ${
                chunk.chunk_type === "heading"
                  ? "text-xl font-bold mt-6 mb-2"
                  : chunk.chunk_type === "caption"
                  ? "text-gray-600 italic"
                  : chunk.chunk_type === "equation"
                  ? "text-center my-4"
                  : chunk.chunk_type === "code"
                  ? "font-mono bg-gray-50 p-4 rounded"
                  : ""
              }`}
            >
              {chunk.text}
            </div>
          ))}
        </div>
      </div>

      {/* Selection Popup */}
      {selection && (
        <HighlightPopup
          position={{
            x: selection.rect.left + selection.rect.width / 2,
            y: selection.rect.top - 10,
          }}
          highlightText={selection.text}
          chunkIdx={selection.chunkIdx}
          endChar={selection.endChar}
          onAsk={() => {
            // TODO: Implement ask functionality
            setSelection(null);
          }}
          onSave={() => {
            setSaveModalOpen(true);
          }}
          onDismiss={() => setSelection(null)}
        />
      )}

      {/* Save Modal */}
      {saveModalOpen && selection && paper && (
        <SaveToWikiModal
          paperId={paperId}
          paperTitle={paper.title}
          highlightText={selection.text}
          chunkIdx={selection.chunkIdx}
          endChar={selection.endChar}
          onClose={() => {
            setSaveModalOpen(false);
            setSelection(null);
          }}
          onSaved={() => {
            setSaveModalOpen(false);
            setSelection(null);
          }}
        />
      )}
    </div>
  );
}
