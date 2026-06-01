"use client";

import * as React from "react";
import { type Idea, type IdeaStatus } from "@/lib/types";
import { api } from "@/lib/api";
import { Play, Edit2, Trash2, ChevronDown } from "lucide-react";
import { DependencyWarning } from "./DependencyWarning";

interface IdeasListProps {
  ideas: Idea[];
  onEdit: (idea: Idea) => void;
  onDelete: (id: string) => void;
  onRunExperiment: (data: { title: string; idea_id: string }) => void;
}

const STATUS_COLORS: Record<IdeaStatus, { bg: string; text: string }> = {
  draft: { bg: "#f5f5f5", text: "#4d4d4d" },
  active: { bg: "#dbeafe", text: "#1e40af" },
  implemented: { bg: "#d1fae5", text: "#065f46" },
  archived: { bg: "#fef3c7", text: "#92400e" },
};

const STATUS_LABELS: Record<IdeaStatus, string> = {
  draft: "Draft",
  active: "Active",
  implemented: "Implemented",
  archived: "Archived",
};

export function IdeasList({ ideas, onEdit, onDelete, onRunExperiment }: IdeasListProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = React.useState<{
    id: string;
    title: string;
    dependents: Array<{ type: string; id: string; title: string }>;
  } | null>(null);

  const handleDeleteClick = async (idea: Idea) => {
    try {
      const { can_delete, dependents } = await api.nodes.checkDependencies("idea", idea.id);
      if (!can_delete) {
        setDeleteWarning({
          id: idea.id,
          title: idea.title,
          dependents,
        });
      } else {
        onDelete(idea.id);
      }
    } catch (error) {
      console.error("Failed to check dependencies:", error);
      // Proceed with deletion on error
      onDelete(idea.id);
    }
  };

  const handleArchiveAndDelete = () => {
    if (deleteWarning) {
      // Archive the idea by setting status to archived
      api.ideas.update(deleteWarning.id, { status: "archived" }).then(() => {
        onDelete(deleteWarning.id);
      });
    }
    setDeleteWarning(null);
  };

  const handleForceDelete = () => {
    if (deleteWarning) {
      onDelete(deleteWarning.id);
    }
    setDeleteWarning(null);
  };

  if (ideas.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm" style={{ color: "#888888" }}>
          No ideas yet. Create your first idea to start tracking your research.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 pb-4">
      {ideas.map((idea) => {
        const isExpanded = expandedId === idea.id;
        const colors = STATUS_COLORS[idea.status];

        return (
          <div
            key={idea.id}
            className="rounded-lg border transition-all"
            style={{
              border: `1px solid ${isExpanded ? "#50e3c2" : "#ebebeb"}`,
              background: "#ffffff",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : idea.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ChevronDown
                  className="w-4 h-4 flex-shrink-0 transition-transform"
                  style={{
                    color: "#888888",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "#171717", letterSpacing: "-0.28px" }}
                  >
                    {idea.title}
                  </p>
                </div>
              </div>
              <span
                className="px-2 py-0.5 rounded text-xs flex-shrink-0 ml-2"
                style={{ background: colors.bg, color: colors.text }}
              >
                {STATUS_LABELS[idea.status]}
              </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-3 pb-3">
                {idea.contribution && (
                  <p
                    className="text-xs mb-3"
                    style={{ color: "#4d4d4d", lineHeight: "1.5" }}
                  >
                    {idea.contribution}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRunExperiment({
                        title: `Experiment: ${idea.title}`,
                        idea_id: idea.id,
                      });
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{
                      background: "#50e3c2",
                      color: "#171717",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <Play className="w-3 h-3" />
                    Run
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(idea);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{
                      background: "#f5f5f5",
                      color: "#4d4d4d",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#ebebeb";
                      e.currentTarget.style.color = "#171717";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f5f5f5";
                      e.currentTarget.style.color = "#4d4d4d";
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(idea);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{
                      background: "#fef2f2",
                      color: "#dc2626",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fef2f2")}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {/* Delete Warning Modal */}
      {deleteWarning && (
        <DependencyWarning
          isOpen={true}
          onClose={() => setDeleteWarning(null)}
          nodeTitle={deleteWarning.title}
          dependents={deleteWarning.dependents}
          onArchive={handleArchiveAndDelete}
          onDelete={handleForceDelete}
        />
      )}
    </div>
  );
}
