export interface Message {
  id: string;
  folder_id?: string;
  role: "user" | "assistant";
  content: string;
  is_shareable?: boolean;
  created_at: string;
  timestamp?: Date;
}

export interface Folder {
  id: string;
  session_id: string;
  type: "ideas" | "code" | "paper";
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  title: string;
  stage: "ideation" | "prototyping" | "writing" | "published";
  folders: Folder[];
  created_at: string;
}

export interface SharedContext {
  id: string;
  message_id: string;
  session_id: string;
  target_folder: "code" | "paper";
  summary: string;
  pinned_order: number;
  accepted_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  folder_id: string;
  folder_type: "ideas" | "code" | "paper";
  session_id: string;
  messages: ChatMessage[];
}

export interface FolderMessages {
  ideas: Message[];
  code: Message[];
  paper: Message[];
}

export interface MemoryHit {
  id: string;
  content: string;
  score: number;
  distance?: number;
  metadata?: {
    session_id?: string;
    folder_id?: string;
    created_at?: string;
    event_type?: string;
  };
}

// Node Types for Ideas Workspace
export type NodeType = "concept" | "method" | "result" | "insight" | "research_question" | "idea" | "experiment";

export type QuestionStatus = "open" | "in_progress" | "answered" | "closed";
export type IdeaStatus = "draft" | "active" | "implemented" | "archived";
export type MethodStatus = "to_implement" | "in_progress" | "done" | "abandoned";
export type ExperimentStatus = "planned" | "running" | "completed" | "failed";
export type ResultRole = "baseline" | "sota" | "comparison";
export type InsightOrigin = "paper" | "self" | "synthesis";

export interface BaseNode {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface SourceInfo {
  source_paper?: string;
  source_authors?: string;
  source_year?: number;
  source_section?: string;
  raw_highlight?: string;
}

export interface Concept extends BaseNode, SourceInfo {
  title: string;
  definition?: string;
}

export interface Method extends BaseNode, SourceInfo {
  title: string;
  algorithm_sketch?: string;
  complexity?: string;
  implementation_status: MethodStatus;
  adapt_notes?: string;
}

export interface Result extends BaseNode, SourceInfo {
  metric_name: string;
  metric_value?: string;
  dataset?: string;
  role: ResultRole;
}

export interface Insight extends BaseNode, SourceInfo {
  content: string;
  origin: InsightOrigin;
}

export interface ResearchQuestion extends BaseNode {
  question: string;
  hypothesis?: string;
  status: QuestionStatus;
}

export interface Idea extends BaseNode {
  title: string;
  contribution?: string;
  status: IdeaStatus;
}

export interface Experiment extends BaseNode {
  idea_id?: string;
  title: string;
  description?: string;
  status: ExperimentStatus;
  code_entry?: string;
  config_path?: string;
  notes?: string;
  results_json?: ExperimentResults;
}

export interface ExperimentResults {
  metrics?: Array<{ name: string; value: string }>;
  delta_vs_baseline?: Record<string, string>;
  notes?: string;
}

export interface IdeaDependency {
  id: string;
  idea_id: string;
  node_type: NodeType;
  node_id: string;
  adapt_notes?: string;
  created_at: string;
}

export interface QuestionInsight {
  id: string;
  question_id: string;
  insight_id: string;
  created_at: string;
}

export interface ExperimentMethod {
  id: string;
  experiment_id: string;
  method_id: string;
  adapt_notes?: string;
  created_at: string;
}

export interface ExperimentBaseline {
  id: string;
  experiment_id: string;
  result_id: string;
  created_at: string;
}

export interface ConceptMethod {
  id: string;
  concept_id: string;
  method_id: string;
  created_at: string;
}

// Union type for all nodes
export type WikiNode =
  | Concept
  | Method
  | Result
  | Insight
  | ResearchQuestion
  | Idea
  | Experiment;

// Reference to a node (for dependencies)
export interface NodeReference {
  node_type: NodeType;
  node_id: string;
  title: string;
  subtitle?: string;
}

// Node with search context
export interface NodeSearchResult extends WikiNode {
  node_type: NodeType;
  rank?: number;
}

// API Request/Response types
export interface CreateIdeaData {
  title: string;
  contribution?: string;
  status?: IdeaStatus;
}

export interface UpdateIdeaData {
  title?: string;
  contribution?: string;
  status?: IdeaStatus;
}

export interface CreateQuestionData {
  question: string;
  hypothesis?: string;
  status?: QuestionStatus;
}

export interface UpdateQuestionData {
  question?: string;
  hypothesis?: string;
  status?: QuestionStatus;
}

export interface CreateConceptData {
  title: string;
  definition?: string;
}

export interface CreateMethodData {
  title: string;
  algorithm_sketch?: string;
  complexity?: string;
  implementation_status?: MethodStatus;
}

export interface CreateResultData {
  metric_name: string;
  metric_value?: string;
  dataset?: string;
  role?: ResultRole;
}

export interface CreateInsightData {
  content: string;
  origin: InsightOrigin;
}

export interface CreateExperimentData {
  idea_id?: string;
  title: string;
  description?: string;
  status?: ExperimentStatus;
  code_entry?: string;
  config_path?: string;
}

export interface AddDependencyData {
  node_type: NodeType;
  node_id: string;
  adapt_notes?: string;
}

export interface NodeSearchFilters {
  types?: NodeType[];
  session_id?: string;
  status?: QuestionStatus | IdeaStatus | MethodStatus | ExperimentStatus;
}

// Dependency check for deletion
export interface DependencyCheck {
  can_delete: boolean;
  dependents: Array<{
    type: "idea" | "experiment";
    id: string;
    title: string;
  }>;
}

// ── Paper-related Types ───────────────────────────────────────────────────────────

export interface Chunk {
  idx: number;
  text: string;
  page: number;
  bbox?: [number, number, number, number];
  chunk_type: "body" | "heading" | "caption" | "code" | "equation";
}

export interface DocumentIndex {
  sections: Record<string, number>;      // "3.1" → chunk_idx
  figures: Record<string, string>;        // "1" → caption text
  tables: Record<string, string>;
  equations: Record<string, string>;
  bibliography: Record<string, { authors: string; title: string; year: number }>;
}

export interface Paper {
  id: string;
  session_id: string;
  source: "arxiv" | "tavily" | "semantic_scholar";
  external_id?: string;
  title: string;
  authors: string[];
  abstract?: string;
  url: string;
  pdf_url?: string;
  open_access: boolean;
  is_paywall: boolean;
  chunks_json?: Chunk[];
  document_index?: DocumentIndex;
  chunks_url?: string;  // for large papers
  parsed_at?: string;
  created_at: string;
}

export interface PaperCard {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  source: "arxiv" | "tavily" | "semantic_scholar";
  openAccessPdf?: string;
  url: string;
  year?: number;
  score: number;
}

export interface EnrichedContext {
  highlight_text: string;
  expanded_chunks: Chunk[];
  boundary_text: string;
  boundary_type: string;
  resolved_refs: Array<[ref_type: string, ref_id: string, content: string]>;
}

export interface EnrichRequest {
  highlight_text: string;
  highlight_chunk_idx: number;
  highlight_end_char: number;
  window?: number;
  fetch_abstracts?: boolean;
}

export interface SaveRequest {
  enriched_context: EnrichedContext;
  node_type: NodeType;
  custom_title?: string;
}

export interface WikiNodeSaveResponse {
  id: string;
  node_type: string;
  title: string;
  content: string;
  source_paper: string;
  raw_highlight: string;
}
