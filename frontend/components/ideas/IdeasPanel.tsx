"use client";

import * as React from "react";
import { api } from "@/lib/api";
import {
  type Idea,
  type ResearchQuestion,
  type Experiment,
  type IdeaStatus,
  type QuestionStatus,
  type ExperimentStatus,
} from "@/lib/types";
import { IdeasList } from "./IdeasList";
import { QuestionList } from "./QuestionList";
import { ExperimentsList } from "./ExperimentsList";
import { IdeaForm } from "./IdeaForm";
import { QuestionForm } from "./QuestionForm";
import { Plus, X, ChevronRight } from "lucide-react";

interface IdeasPanelProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "questions" | "ideas" | "experiments";

const TAB_CONFIG = {
  questions: { label: "Questions", icon: "?" },
  ideas: { label: "Ideas", icon: "💡" },
  experiments: { label: "Experiments", icon: "⚗️" },
};

export function IdeasPanel({ sessionId, isOpen, onClose }: IdeasPanelProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>("ideas");
  const [ideas, setIdeas] = React.useState<Idea[]>([]);
  const [questions, setQuestions] = React.useState<ResearchQuestion[]>([]);
  const [experiments, setExperiments] = React.useState<Experiment[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showIdeaForm, setShowIdeaForm] = React.useState(false);
  const [showQuestionForm, setShowQuestionForm] = React.useState(false);
  const [editingIdea, setEditingIdea] = React.useState<Idea | null>(null);
  const [editingQuestion, setEditingQuestion] = React.useState<ResearchQuestion | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, sessionId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ideasData, questionsData, experimentsData] = await Promise.all([
        api.ideas.list(sessionId),
        api.questions.list(sessionId),
        api.experiments.list(sessionId),
      ]);
      setIdeas(ideasData);
      setQuestions(questionsData);
      setExperiments(experimentsData);
    } catch (error) {
      console.error("Failed to load ideas workspace data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIdea = async (data: { title: string; contribution?: string; status?: IdeaStatus }) => {
    try {
      const newIdea = await api.ideas.create({ ...data, session_id: sessionId });
      setIdeas((prev) => [newIdea, ...prev]);
      setShowIdeaForm(false);
      setEditingIdea(null);
    } catch (error) {
      console.error("Failed to create idea:", error);
    }
  };

  const handleUpdateIdea = async (id: string, data: { title?: string; contribution?: string; status?: IdeaStatus }) => {
    try {
      const updated = await api.ideas.update(id, data);
      setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setEditingIdea(null);
    } catch (error) {
      console.error("Failed to update idea:", error);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      await api.ideas.delete(id);
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error("Failed to delete idea:", error);
      alert("Cannot delete idea: it may have dependent experiments.");
    }
  };

  const handleCreateQuestion = async (data: { question: string; hypothesis?: string; status?: QuestionStatus }) => {
    try {
      const newQuestion = await api.questions.create({ ...data, session_id: sessionId });
      setQuestions((prev) => [newQuestion, ...prev]);
      setShowQuestionForm(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error("Failed to create question:", error);
    }
  };

  const handleUpdateQuestion = async (id: string, data: { question?: string; hypothesis?: string; status?: QuestionStatus }) => {
    try {
      const updated = await api.questions.update(id, data);
      setQuestions((prev) => prev.map((q) => (q.id === id ? updated : q)));
      setEditingQuestion(null);
    } catch (error) {
      console.error("Failed to update question:", error);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await api.questions.delete(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (error) {
      console.error("Failed to delete question:", error);
    }
  };

  const handleCreateExperiment = async (data: { title: string; idea_id?: string; description?: string }) => {
    try {
      const newExperiment = await api.experiments.create({ ...data, session_id: sessionId });
      setExperiments((prev) => [newExperiment, ...prev]);
    } catch (error) {
      console.error("Failed to create experiment:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: "360px",
        background: "#ffffff",
        borderLeft: "1px solid #ebebeb",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: "52px",
          borderBottom: "1px solid #ebebeb",
        }}
      >
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-sm" style={{ color: "#171717", letterSpacing: "-0.28px" }}>
            My Work
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <X className="w-4 h-4" style={{ color: "#4d4d4d" }} />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex px-4 pt-2 pb-1 flex-shrink-0"
        style={{ gap: "4px" }}
      >
        {(Object.keys(TAB_CONFIG) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-xs"
            style={{
              background: activeTab === tab ? "#f5f5f5" : "transparent",
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === tab ? 500 : 400,
              color: activeTab === tab ? "#171717" : "#4d4d4d",
            }}
          >
            <span>{TAB_CONFIG[tab].icon}</span>
            <span>{TAB_CONFIG[tab].label}</span>
            {tab === "ideas" && ideas.length > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded text-xs"
                style={{ background: "#ebebeb", color: "#4d4d4d", fontSize: "10px" }}
              >
                {ideas.length}
              </span>
            )}
            {tab === "questions" && questions.length > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded text-xs"
                style={{ background: "#ebebeb", color: "#4d4d4d", fontSize: "10px" }}
              >
                {questions.length}
              </span>
            )}
            {tab === "experiments" && experiments.length > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded text-xs"
                style={{ background: "#ebebeb", color: "#4d4d4d", fontSize: "10px" }}
              >
                {experiments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div
              className="w-5 h-5 rounded-full animate-spin"
              style={{
                border: "2px solid rgba(80, 227, 194, 0.3)",
                borderTopColor: "#50e3c2",
              }}
            />
          </div>
        ) : (
          <>
            {activeTab === "ideas" && (
              <>
                {showIdeaForm || editingIdea ? (
                  <div className="p-4">
                    <IdeaForm
                      idea={editingIdea}
                      sessionId={sessionId}
                      onSubmit={editingIdea ? (data) => handleUpdateIdea(editingIdea.id, data) : handleCreateIdea}
                      onCancel={() => {
                        setShowIdeaForm(false);
                        setEditingIdea(null);
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="p-4">
                      <button
                        onClick={() => setShowIdeaForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-md transition-colors text-sm"
                        style={{
                          background: "#171717",
                          color: "#ffffff",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#171717")}
                      >
                        <Plus className="w-4 h-4" />
                        New Idea
                      </button>
                    </div>
                    <IdeasList
                      ideas={ideas}
                      onEdit={setEditingIdea}
                      onDelete={handleDeleteIdea}
                      onRunExperiment={handleCreateExperiment}
                    />
                  </>
                )}
              </>
            )}

            {activeTab === "questions" && (
              <>
                {showQuestionForm || editingQuestion ? (
                  <div className="p-4">
                    <QuestionForm
                      question={editingQuestion}
                      onSubmit={editingQuestion ? (data) => handleUpdateQuestion(editingQuestion.id, data) : handleCreateQuestion}
                      onCancel={() => {
                        setShowQuestionForm(false);
                        setEditingQuestion(null);
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="p-4">
                      <button
                        onClick={() => setShowQuestionForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-md transition-colors text-sm"
                        style={{
                          background: "#171717",
                          color: "#ffffff",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#171717")}
                      >
                        <Plus className="w-4 h-4" />
                        New Question
                      </button>
                    </div>
                    <QuestionList
                      questions={questions}
                      onEdit={setEditingQuestion}
                      onDelete={handleDeleteQuestion}
                    />
                  </>
                )}
              </>
            )}

            {activeTab === "experiments" && (
              <ExperimentsList
                experiments={experiments}
                ideas={ideas}
                onUpdate={async (id, data) => {
                  try {
                    const updated = await api.experiments.update(id, data);
                    setExperiments((prev) => prev.map((e) => (e.id === id ? updated : e)));
                  } catch (error) {
                    console.error("Failed to update experiment:", error);
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await api.experiments.delete(id);
                    setExperiments((prev) => prev.filter((e) => e.id !== id));
                  } catch (error) {
                    console.error("Failed to delete experiment:", error);
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
