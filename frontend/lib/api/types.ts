/**
 * Type definitions for the chatbot API
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export interface ChatRequest {
  query: string;
}

export interface Citation {
  document: string;
  section: string | null;
  pages: number[];
  statute_codes: string[];
  relevance: number;
}

export interface ApiResponse {
  answer: string;
  citations: Citation[];
  query: string;
}

