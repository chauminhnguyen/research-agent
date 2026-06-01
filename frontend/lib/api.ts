import type {
  Session,
  Folder,
  Message,
  SharedContext,
  ChatMessage,
  MemoryHit,
  Idea,
  CreateIdeaData,
  UpdateIdeaData,
  ResearchQuestion,
  CreateQuestionData,
  UpdateQuestionData,
  Method,
  CreateMethodData,
  MethodStatus,
  Concept,
  CreateConceptData,
  Result,
  CreateResultData,
  Insight,
  CreateInsightData,
  Experiment,
  CreateExperimentData,
  IdeaDependency,
  AddDependencyData,
  NodeReference,
  NodeType,
  NodeSearchFilters,
  DependencyCheck,
  PaperCard,
  Paper,
  Chunk,
  DocumentIndex,
  EnrichedContext,
  EnrichRequest,
  SaveRequest,
  WikiNodeSaveResponse,
} from "@/lib/types";

const BASE = process.env.AGENT_API_URL || "http://localhost:8000";

export const api = {
  sessions: {
    list: async (): Promise<{ sessions: Session[] }> => {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },

    create: async (title: string): Promise<Session> => {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      return res.json();
    },

    get: async (sessionId: string): Promise<Session> => {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  },

  folders: {
    getMessages: async (folderId: string): Promise<Message[]> => {
      const res = await fetch(`/api/messages?folder_id=${encodeURIComponent(folderId)}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  },

  chat: {
    streamUrl: "/api/chat",
  },

  share: {
    create: async (data: {
      message_id: string;
      session_id: string;
      target_folder: "code" | "paper";
      summary: string;
    }): Promise<{ ok: boolean }> => {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to share");
      return res.json();
    },

    getForFolder: async (
      sessionId: string,
      targetFolder: "code" | "paper"
    ): Promise<SharedContext[]> => {
      const params = new URLSearchParams({
        session_id: sessionId,
        target_folder: targetFolder,
      });
      const res = await fetch(`/api/shared-contexts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch shared contexts");
      return res.json();
    },
  },

  memory: {
    recall: async (
      query: string,
      sessionId?: string,
      limit: number = 5
    ): Promise<{ hits: MemoryHit[]; query: string }> => {
      const params = new URLSearchParams({
        q: query,
        limit: String(limit),
      });
      if (sessionId) params.set("session_id", sessionId);

      const res = await fetch(`/api/memory?${params}`);
      if (!res.ok) throw new Error("Failed to recall memory");
      return res.json();
    },
  },

  // Ideas API
  ideas: {
    list: async (sessionId: string): Promise<Idea[]> => {
      const params = new URLSearchParams({ session_id: sessionId });
      const res = await fetch(`/api/ideas?${params}`);
      if (!res.ok) throw new Error("Failed to fetch ideas");
      const data = await res.json();
      return data.ideas || [];
    },

    create: async (data: CreateIdeaData & { session_id: string }): Promise<Idea> => {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create idea");
      const result = await res.json();
      return result.idea;
    },

    update: async (id: string, data: UpdateIdeaData): Promise<Idea> => {
      const res = await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update idea");
      const result = await res.json();
      return result.idea;
    },

    delete: async (id: string): Promise<void> => {
      const res = await fetch(`/api/ideas/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete idea");
      }
    },

    getDependencies: async (ideaId: string): Promise<{
      dependencies: IdeaDependency[];
      nodes: Record<string, unknown>;
    }> => {
      const res = await fetch(`/api/ideas/${ideaId}/dependencies`);
      if (!res.ok) throw new Error("Failed to fetch dependencies");
      return res.json();
    },

    addDependency: async (ideaId: string, data: AddDependencyData): Promise<IdeaDependency> => {
      const res = await fetch(`/api/ideas/${ideaId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add dependency");
      const result = await res.json();
      return result.dependency;
    },

    removeDependency: async (ideaId: string, nodeId: string): Promise<void> => {
      const params = new URLSearchParams({ node_id: nodeId });
      const res = await fetch(`/api/ideas/${ideaId}/dependencies?${params}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove dependency");
    },
  },

  // Questions API
  questions: {
    list: async (sessionId: string, status?: string): Promise<ResearchQuestion[]> => {
      const params = new URLSearchParams({ session_id: sessionId });
      if (status) params.set("status", status);
      const res = await fetch(`/api/questions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();
      return data.questions || [];
    },

    create: async (data: CreateQuestionData & { session_id: string }): Promise<ResearchQuestion> => {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create question");
      const result = await res.json();
      return result.question;
    },

    update: async (id: string, data: UpdateQuestionData): Promise<ResearchQuestion> => {
      const res = await fetch(`/api/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update question");
      const result = await res.json();
      return result.question;
    },

    delete: async (id: string): Promise<void> => {
      const res = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete question");
    },
  },

  // Methods API
  methods: {
    list: async (sessionId: string, status?: MethodStatus): Promise<Method[]> => {
      const params = new URLSearchParams({ session_id: sessionId });
      if (status) params.set("status", status);
      const res = await fetch(`/api/methods?${params}`);
      if (!res.ok) throw new Error("Failed to fetch methods");
      const data = await res.json();
      return data.methods || [];
    },

    create: async (data: CreateMethodData & { session_id: string }): Promise<Method> => {
      const res = await fetch("/api/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create method");
      const result = await res.json();
      return result.method;
    },

    update: async (id: string, data: Partial<Method>): Promise<Method> => {
      const res = await fetch(`/api/methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update method");
      const result = await res.json();
      return result.method;
    },

    delete: async (id: string): Promise<void> => {
      const res = await fetch(`/api/methods/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete method");
      }
    },
  },

  // Concepts API
  concepts: {
    list: async (sessionId: string): Promise<Concept[]> => {
      const params = new URLSearchParams({ session_id: sessionId });
      const res = await fetch(`/api/concepts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch concepts");
      const data = await res.json();
      return data.concepts || [];
    },

    create: async (data: CreateConceptData & { session_id: string }): Promise<Concept> => {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create concept");
      const result = await res.json();
      return result.concept;
    },

    delete: async (id: string): Promise<void> => {
      const res = await fetch(`/api/concepts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete concept");
      }
    },
  },

  // Results API
  results: {
    list: async (sessionId: string): Promise<Result[]> => {
      const params = new URLSearchParams({ session_id: sessionId });
      const res = await fetch(`/api/results?${params}`);
      if (!res.ok) throw new Error("Failed to fetch results");
      const data = await res.json();
      return data.results || [];
    },

    create: async (data: CreateResultData & { session_id: string }): Promise<Result> => {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create result");
      const result = await res.json();
      return result.result;
    },

    delete: async (id: string): Promise<void> => {
      const res = await fetch(`/api/results/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete result");
      }
    },
  },

  // Insights API
  insights: {
    list: async (sessionId: string, origin?: string): Promise<Insight[]> => {
      const params = new URLSearchParams({ session_id: sessionId });
      if (origin) params.set("origin", origin);
      const res = await fetch(`/api/insights?${params}`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      const data = await res.json();
      return data.insights || [];
    },

    create: async (data: CreateInsightData & { session_id: string }): Promise<Insight> => {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create insight");
      const result = await res.json();
      return result.insight;
    },

    delete: async (id: string): Promise<void> => {
      const res = await fetch(`/api/insights/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete insight");
      }
    },
  },

  // Experiments API
  experiments: {
    list: async (sessionId: string, ideaId?: string): Promise<Experiment[]> => {
      const params = new URLSearchParams({ session_id: sessionId });
      if (ideaId) params.set("idea_id", ideaId);
      const res = await fetch(`/api/experiments?${params}`);
      if (!res.ok) throw new Error("Failed to fetch experiments");
      const data = await res.json();
      return data.experiments || [];
    },

    create: async (data: CreateExperimentData & { session_id: string }): Promise<Experiment> => {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create experiment");
      const result = await res.json();
      return result.experiment;
    },

    update: async (id: string, data: Partial<Experiment>): Promise<Experiment> => {
      const res = await fetch(`/api/experiments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update experiment");
      const result = await res.json();
      return result.experiment;
    },

    delete: async (id: string): Promise<void> => {
      const res = await fetch(`/api/experiments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete experiment");
    },
  },

  // Nodes API (search and suggest)
  nodes: {
    search: async (
      query: string,
      sessionId: string,
      filters?: NodeSearchFilters
    ): Promise<{ results: NodeReference[]; query: string }> => {
      const params = new URLSearchParams({
        q: query,
        session_id: sessionId,
      });
      if (filters?.types?.length) {
        params.set("types", filters.types.join(","));
      }
      const res = await fetch(`/api/nodes/search?${params}`);
      if (!res.ok) throw new Error("Failed to search nodes");
      return res.json();
    },

    suggest: async (
      text: string,
      sessionId: string,
      limit: number = 5
    ): Promise<{ suggestions: NodeReference[] }> => {
      const params = new URLSearchParams({
        text,
        session_id: sessionId,
        limit: String(limit),
      });
      const res = await fetch(`/api/nodes/suggest?${params}`);
      if (!res.ok) throw new Error("Failed to get suggestions");
      return res.json();
    },

    getAll: async (
      sessionId: string
    ): Promise<{
      concepts: Concept[];
      methods: Method[];
      results: Result[];
      insights: Insight[];
      questions: ResearchQuestion[];
    }> => {
      const params = new URLSearchParams({ session_id: sessionId });
      const res = await fetch(`/api/nodes?${params}`);
      if (!res.ok) throw new Error("Failed to fetch nodes");
      return res.json();
    },

    checkDependencies: async (
      nodeType: NodeType,
      nodeId: string
    ): Promise<DependencyCheck> => {
      const params = new URLSearchParams({
        node_type: nodeType,
        node_id: nodeId,
      });
      const res = await fetch(`/api/nodes/dependencies?${params}`);
      if (!res.ok) throw new Error("Failed to check dependencies");
      return res.json();
    },
  },

  // Papers API
  papers: {
    search: async (query: string, sources?: string[]): Promise<PaperCard[]> => {
      const res = await fetch("/api/papers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, sources: sources || ["arxiv", "tavily", "semantic_scholar"], max_results: 20 }),
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },

    get: async (paperId: string): Promise<Paper> => {
      const res = await fetch(`/api/papers/${encodeURIComponent(paperId)}`);
      if (!res.ok) throw new Error("Failed to fetch paper");
      return res.json();
    },

    fetch: async (paperId: string): Promise<{ status: string; chunks_count: number; index_summary: object }> => {
      const res = await fetch(`/api/papers/${encodeURIComponent(paperId)}/fetch`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to fetch paper");
      return res.json();
    },

    getChunks: async (paperId: string): Promise<{ chunks: Chunk[]; index: DocumentIndex }> => {
      const res = await fetch(`/api/papers/${encodeURIComponent(paperId)}/chunks`);
      if (!res.ok) throw new Error("Failed to get chunks");
      return res.json();
    },

    enrich: async (paperId: string, req: EnrichRequest): Promise<EnrichedContext> => {
      const res = await fetch(`/api/papers/${encodeURIComponent(paperId)}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error("Enrichment failed");
      return res.json();
    },

    save: async (paperId: string, req: SaveRequest): Promise<WikiNodeSaveResponse> => {
      const res = await fetch(`/api/papers/${encodeURIComponent(paperId)}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
  },
};
