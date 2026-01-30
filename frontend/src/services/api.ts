import axios, { AxiosError } from 'axios';
import type { Citation } from '../types';

interface ApiResponse {
  answer?: string;
  response?: string;
  message?: string;
  citations?: Citation[];
  error?: string;
}

export class ChatService {
  private apiEndpoint: string;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  async sendMessage(message: string): Promise<{ answer: string; citations?: Citation[] }> {
    try {
      // Input sanitization
      const sanitizedMessage = message.trim();
      
      if (!sanitizedMessage) {
        throw new Error('Message cannot be empty');
      }

      console.log('📤 Sending request to:', this.apiEndpoint);
      console.log('📤 Request body:', { query: sanitizedMessage });

      const response = await axios.post<ApiResponse>(
        this.apiEndpoint,
        {
          query: sanitizedMessage,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutes timeout
        }
      );

      console.log('📥 Response received:', response.data);

      // Handle different response formats
      const data = response.data;
      const answerText = data.answer || data.response || data.message;

      if (!answerText) {
        throw new Error('Invalid response format from server');
      }

      return {
        answer: answerText,
        citations: data.citations || [],
      };
    } catch (error) {
      console.error('❌ Error occurred:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse>;
        
        if (axiosError.response) {
          // Server responded with error
          console.error('❌ Server response error:', axiosError.response.status, axiosError.response.data);
          const errorMessage = axiosError.response.data?.error || 
                              axiosError.response.data?.message ||
                              `Server error: ${axiosError.response.status}`;
          throw new Error(errorMessage);
        } else if (axiosError.request) {
          // Request made but no response
          console.error('❌ No response received. This might be a CORS or network issue.');
          console.error('❌ Check: 1) Is the endpoint correct? 2) Is CORS enabled on AWS API Gateway?');
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
