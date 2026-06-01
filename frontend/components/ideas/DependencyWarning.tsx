"use client";

import * as React from "react";
import { AlertTriangle, X, Archive, Trash2 } from "lucide-react";

interface DependentItem {
  type: string;
  id: string;
  title: string;
}

interface DependencyWarningProps {
  isOpen: boolean;
  onClose: () => void;
  nodeTitle: string;
  dependents: DependentItem[];
  onArchive: () => void;
  onDelete: () => void;
}

export function DependencyWarning({
  isOpen,
  onClose,
  nodeTitle,
  dependents,
  onArchive,
  onDelete,
}: DependencyWarningProps) {
  if (!isOpen) return null;

  const typeGroups = dependents.reduce((acc, dep) => {
    if (!acc[dep.type]) acc[dep.type] = [];
    acc[dep.type].push(dep);
    return acc;
  }, {} as Record<string, DependentItem[]>);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl max-w-md w-full mx-4"
        style={{ background: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid #ebebeb" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#fef3c7" }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm" style={{ color: "#171717" }}>
              Cannot Delete
            </h3>
            <p className="text-xs" style={{ color: "#888888" }}>
              This {nodeTitle ? "node" : "item"} has dependents
            </p>
          </div>
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

        {/* Content */}
        <div className="px-4 py-3">
          <p className="text-sm mb-3" style={{ color: "#4d4d4d" }}>
            Deleting this node would break the knowledge graph. The following items
            depend on it:
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(typeGroups).map(([type, items]) => (
              <div key={type}>
                <p className="text-xs font-medium mb-1 capitalize" style={{ color: "#888888" }}>
                  {type}s ({items.length})
                </p>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="px-2 py-1.5 rounded text-xs"
                    style={{
                      background: "#f5f5f5",
                      color: "#4d4d4d",
                      marginBottom: "4px",
                    }}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-md" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "#166534" }}>
              Recommended Action
            </p>
            <p className="text-xs" style={{ color: "#15803d" }}>
              Archive this node instead of deleting. Archived nodes are hidden from
              view but their lineage is preserved.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid #ebebeb" }}
        >
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: "#f5f5f5",
              color: "#4d4d4d",
              border: "none",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onArchive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: "#50e3c2",
              color: "#171717",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Archive className="w-3.5 h-3.5" />
            Archive
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
