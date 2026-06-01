"use client";

import * as React from "react";
import { type Idea, type IdeaStatus, type NodeReference } from "@/lib/types";
import { api } from "@/lib/api";
import { BuiltFromSelector } from "./BuiltFromSelector";
import { X } from "lucide-react";

interface IdeaFormProps {
  idea?: Idea | null;
  sessionId: string;
  onSubmit: (data: { title: string; contribution?: string; status?: IdeaStatus }) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: IdeaStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "implemented", label: "Implemented" },
  { value: "archived", label: "Archived" },
];

export function IdeaForm({ idea, sessionId, onSubmit, onCancel }: IdeaFormProps) {
  const [title, setTitle] = React.useState(idea?.title || "");
  const [contribution, setContribution] = React.useState(idea?.contribution || "");
  const [status, setStatus] = React.useState<IdeaStatus>(idea?.status || "draft");
  const [dependencies, setDependencies] = React.useState<NodeReference[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), contribution: contribution.trim() || undefined, status });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDependency = (node: NodeReference) => {
    if (!dependencies.some((d) => d.node_type === node.node_type && d.node_id === node.node_id)) {
      setDependencies((prev) => [...prev, node]);
    }
  };

  const handleRemoveDependency = (nodeType: string, nodeId: string) => {
    setDependencies((prev) => prev.filter((d) => !(d.node_type === nodeType && d.node_id === nodeId)));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#4d4d4d" }}>
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My research idea..."
          className="w-full px-3 py-2 rounded-md text-sm"
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

      {/* Contribution */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#4d4d4d" }}>
          Your Contribution
        </label>
        <textarea
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          placeholder="Describe your idea and how it contributes to the research..."
          rows={4}
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

      {/* Built From */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#4d4d4d" }}>
          Built From
        </label>
        <BuiltFromSelector
          sessionId={sessionId}
          currentText={`${title} ${contribution}`}
          selectedNodes={dependencies}
          onAdd={handleAddDependency}
          onRemove={handleRemoveDependency}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            background: title.trim() ? "#50e3c2" : "#ebebeb",
            color: "#171717",
            border: "none",
            cursor: title.trim() ? "pointer" : "not-allowed",
          }}
        >
          {isSubmitting ? "Saving..." : idea ? "Update Idea" : "Create Idea"}
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
