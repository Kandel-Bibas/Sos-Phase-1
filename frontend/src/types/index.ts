export interface Citation {
  document: string;
  pages: number[];
  relevance: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  citations?: Citation[];
}

export interface ChatConfig {
  apiEndpoint: string;
}
