"use client";

import * as React from "react";
import { type Experiment, type Idea, type ExperimentStatus } from "@/lib/types";
import { Edit2, Trash2, ChevronDown, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

interface ExperimentsListProps {
  experiments: Experiment[];
  ideas: Idea[];
  onUpdate: (id: string, data: Partial<Experiment>) => void;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<ExperimentStatus, { icon: typeof Clock; color: string; label: string }> = {
  planned: { icon: Clock, color: "#888888", label: "Planned" },
  running: { icon: AlertCircle, color: "#f59e0b", label: "Running" },
  completed: { icon: CheckCircle, color: "#10b981", label: "Completed" },
  failed: { icon: XCircle, color: "#ef4444", label: "Failed" },
};

export function ExperimentsList({ experiments, ideas, onUpdate, onDelete }: ExperimentsListProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const getIdeaTitle = (ideaId?: string) => {
    if (!ideaId) return null;
    const idea = ideas.find((i) => i.id === ideaId);
    return idea?.title;
  };

  if (experiments.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm" style={{ color: "#888888" }}>
          No experiments yet. Run an experiment from an idea to track your results.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 pb-4">
      {experiments.map((experiment) => {
        const isExpanded = expandedId === experiment.id;
        const statusConfig = STATUS_CONFIG[experiment.status];
        const StatusIcon = statusConfig.icon;
        const ideaTitle = getIdeaTitle(experiment.idea_id);

        return (
          <div
            key={experiment.id}
            className="rounded-lg border transition-all"
            style={{
              border: `1px solid ${isExpanded ? "#50e3c2" : "#ebebeb"}`,
              background: "#ffffff",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : experiment.id)}
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
                    {experiment.title}
                  </p>
                  {ideaTitle && (
                    <p className="text-xs truncate" style={{ color: "#888888" }}>
                      From: {ideaTitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <StatusIcon className="w-3.5 h-3.5" style={{ color: statusConfig.color }} />
                <span className="text-xs" style={{ color: statusConfig.color }}>
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-3 pb-3">
                {experiment.description && (
                  <p
                    className="text-xs mb-3"
                    style={{ color: "#4d4d4d", lineHeight: "1.5" }}
                  >
                    {experiment.description}
                  </p>
                )}

                {experiment.results_json && (
                  <div className="mb-3 p-2 rounded" style={{ background: "#f5f5f5" }}>
                    <p className="text-xs font-medium mb-1" style={{ color: "#888888" }}>
                      Results
                    </p>
                    {experiment.results_json.metrics?.map((m, i) => (
                      <p key={i} className="text-xs" style={{ color: "#4d4d4d" }}>
                        {m.name}: <strong>{m.value}</strong>
                      </p>
                    ))}
                  </div>
                )}

                {/* Status update buttons */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(Object.keys(STATUS_CONFIG) as ExperimentStatus[]).map((status) => {
                    const config = STATUS_CONFIG[status];
                    const Icon = config.icon;
                    return (
                      <button
                        key={status}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(experiment.id, { status });
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                        style={{
                          background: experiment.status === status ? config.color + "20" : "#f5f5f5",
                          color: experiment.status === status ? config.color : "#4d4d4d",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          if (experiment.status !== status) {
                            e.currentTarget.style.background = "#ebebeb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (experiment.status !== status) {
                            e.currentTarget.style.background = "#f5f5f5";
                          }
                        }}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Open results form
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
                    Log Results
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this experiment?")) {
                        onDelete(experiment.id);
                      }
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
    </div>
  );
}
