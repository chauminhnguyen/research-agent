"use client";

import * as React from "react";
import { type ResearchQuestion, type QuestionStatus } from "@/lib/types";

interface QuestionFormProps {
  question?: ResearchQuestion | null;
  onSubmit: (data: { question: string; hypothesis?: string; status?: QuestionStatus }) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: QuestionStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
];

export function QuestionForm({ question, onSubmit, onCancel }: QuestionFormProps) {
  const [questionText, setQuestionText] = React.useState(question?.question || "");
  const [hypothesis, setHypothesis] = React.useState(question?.hypothesis || "");
  const [status, setStatus] = React.useState<QuestionStatus>(question?.status || "open");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        question: questionText.trim(),
        hypothesis: hypothesis.trim() || undefined,
        status,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Question */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#4d4d4d" }}>
          Research Question
        </label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="What question are you trying to answer?"
          rows={2}
          className="w-full px-3 py-2 rounded-md text-sm resize-none"
          style={{
            border: "1px solid #ebebeb",
            background: "#ffffff",
            color: "#171717",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#50e3c2")}
          onBlur={(e) => (e.target.style.borderColor = "#ebebeb")}
          autoFocus
        />
      </div>

      {/* Hypothesis */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#4d4d4d" }}>
          Hypothesis (optional)
        </label>
        <textarea
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder="What do you hypothesize as the answer?"
          rows={2}
          className="w-full px-3 py-2 rounded-md text-sm resize-none"
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

      {/* Status */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#4d4d4d" }}>
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className="px-3 py-1 rounded-md text-xs transition-colors"
              style={{
                background: status === opt.value ? "#171717" : "#f5f5f5",
                color: status === opt.value ? "#ffffff" : "#4d4d4d",
                border: "none",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={!questionText.trim() || isSubmitting}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            background: questionText.trim() ? "#50e3c2" : "#ebebeb",
            color: "#171717",
            border: "none",
            cursor: questionText.trim() ? "pointer" : "not-allowed",
          }}
        >
          {isSubmitting ? "Saving..." : question ? "Update Question" : "Create Question"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-sm transition-colors"
          style={{
            background: "#f5f5f5",
            color: "#4d4d4d",
            border: "none",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
