/**
 * Mock response data for development/testing
 * TODO: Remove this file when connecting to real API in production
 */

import type { ApiResponse } from "./types";

/**
 * Mock responses based on query keywords
 * TODO: Replace with actual API integration
 */
export function getMockResponse(query: string): ApiResponse {
  const lowerQuery = query.toLowerCase();
  
  // Mock responses matching the API format
  if (lowerQuery.includes("hello")) {
    return {
      answer: "Hello! How can I help you today? This is a mock response for testing purposes.",
      citations: [
        {
          document: "mock-document-001.pdf",
          section: null,
          pages: [1, 2],
          statute_codes: [],
          relevance: 0.85,
        },
      ],
      query: query,
    };
  }
  
  if (lowerQuery.includes("help")) {
    return {
      answer: "I'm here to assist you. What would you like to know?",
      citations: [
        {
          document: "mock-document-002.pdf",
          section: "Section 5",
          pages: [10, 11],
          statute_codes: [],
          relevance: 0.78,
        },
      ],
      query: query,
    };
  }
  
  // Default response
  return {
    answer: `Based on the provided information, I received your query: "${query}". This is a mock response. In production, this will be replaced with actual API responses from the legal document database.`,
    citations: [
      {
        document: "mock-document-003.pdf",
        section: null,
        pages: [5],
        statute_codes: [],
        relevance: 0.65,
      },
      {
        document: "mock-document-004.pdf",
        section: "Section 12",
        pages: [20, 21],
        statute_codes: [],
        relevance: 0.62,
      },
    ],
    query: query,
  };
}

