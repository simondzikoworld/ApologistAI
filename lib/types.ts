export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Source {
  url: string;
  content: string;
  fetchedAt: number;
}

export type ResponseMode = "simple" | "detailed" | "challenge";

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: ResponseMode;
  lang: string;
  messages: Message[];
}

export interface ChatRequest {
  messages: Message[];
  sources: string[];
  mode: ResponseMode;
  lang?: string;
}
