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

export interface ChatRequest {
  messages: Message[];
  sources: string[];
  mode: ResponseMode;
  lang?: string;
}
