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
  metadata?: {
    session_id?: string;
    folder_id?: string;
    created_at?: string;
  };
}
