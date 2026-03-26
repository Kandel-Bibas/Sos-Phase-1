import axios, { AxiosError } from 'axios';
import type { Citation, ResearchFilters, ResponseMetadata, ApiResponse, VerificationResult } from '../types';

export interface ChatResponse {
  answer: string;
  citations?: Citation[];
  intent?: string;
  metadata?: ResponseMetadata;
  verification?: VerificationResult;
}

export class ChatService {
  private apiEndpoint: string;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  async sendMessage(
    message: string,
    options?: {
      filters?: ResearchFilters;
      history?: { role: string; content: string }[];
      mode?: 'research' | 'compare' | 'count';
    }
  ): Promise<ChatResponse> {
    try {
      const sanitizedMessage = message.trim();

      if (!sanitizedMessage) {
        throw new Error('Message cannot be empty');
      }

      const requestBody: Record<string, unknown> = {
        query: sanitizedMessage,
      };

      // Phase 2: add filters, history, mode if provided
      if (options?.filters) {
        requestBody.filters = options.filters;
      }
      if (options?.history) {
        requestBody.history = options.history;
      }
      if (options?.mode) {
        requestBody.mode = options.mode;
      }

      const response = await axios.post<ApiResponse>(
        this.apiEndpoint,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        }
      );

      const data = response.data;
      const answerText = data.answer || data.response || data.message;

      if (!answerText) {
        throw new Error('Invalid response format from server');
      }

      return {
        answer: answerText,
        citations: data.citations || [],
        intent: data.intent,
        metadata: data.metadata,
        verification: data.verification,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse>;

        if (axiosError.response) {
          const errorMessage = axiosError.response.data?.error ||
                              axiosError.response.data?.message ||
                              `Server error: ${axiosError.response.status}`;
          throw new Error(errorMessage);
        } else if (axiosError.request) {
          throw new Error('No response from server. Check console for details.');
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('An unexpected error occurred');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiEndpoint);
  }
}

export const createChatService = (apiEndpoint: string): ChatService => {
  return new ChatService(apiEndpoint);
};
