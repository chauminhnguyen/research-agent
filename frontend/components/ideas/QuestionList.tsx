"use client";

import * as React from "react";
import { type ResearchQuestion, type QuestionStatus } from "@/lib/types";
import { Edit2, Trash2, ChevronDown } from "lucide-react";

interface QuestionListProps {
  questions: ResearchQuestion[];
  onEdit: (question: ResearchQuestion) => void;
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<QuestionStatus, { bg: string; text: string }> = {
  open: { bg: "#dbeafe", text: "#1e40af" },
  in_progress: { bg: "#fef3c7", text: "#92400e" },
  answered: { bg: "#d1fae5", text: "#065f46" },
  closed: { bg: "#f5f5f5", text: "#4d4d4d" },
};

const STATUS_LABELS: Record<QuestionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  answered: "Answered",
  closed: "Closed",
};

export function QuestionList({ questions, onEdit, onDelete }: QuestionListProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (questions.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm" style={{ color: "#888888" }}>
          No questions yet. Create a research question to structure your investigation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 pb-4">
      {questions.map((question) => {
        const isExpanded = expandedId === question.id;
        const colors = STATUS_COLORS[question.status];

        return (
          <div
            key={question.id}
            className="rounded-lg border transition-all"
            style={{
              border: `1px solid ${isExpanded ? "#50e3c2" : "#ebebeb"}`,
              background: "#ffffff",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : question.id)}
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
                    {question.question}
                  </p>
                </div>
              </div>
              <span
                className="px-2 py-0.5 rounded text-xs flex-shrink-0 ml-2"
                style={{ background: colors.bg, color: colors.text }}
              >
                {STATUS_LABELS[question.status]}
              </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-3 pb-3">
                {question.hypothesis && (
                  <div className="mb-3">
                    <p className="text-xs font-medium mb-1" style={{ color: "#888888" }}>
                      Hypothesis
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "#4d4d4d", lineHeight: "1.5" }}
                    >
                      {question.hypothesis}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(question);
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
                      if (confirm("Are you sure you want to delete this question?")) {
                        onDelete(question.id);
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
