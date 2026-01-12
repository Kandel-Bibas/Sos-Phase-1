/**
 * API client for chatbot
 */

import { getApiUrl } from "./config";
import type { ApiResponse, ChatRequest } from "./types";
// TODO: Remove this import when switching to production API

/**
 * Send a chat query and get the complete response
 * Request body format: { "query": "user query" }
 * Response format: { "answer": "...", "citations": [...], "query": "..." }
 *
 * TODO: Remove mock implementation when connecting to real API
 */
export async function sendChatQuery(
	request: ChatRequest,
): Promise<ApiResponse> {
	// ============================================
	// MOCK IMPLEMENTATION (DEVELOPMENT ONLY)
	// TODO: Remove this entire section when connecting to real API
	// ============================================
	// Simulate API delay
	// await new Promise((resolve) => setTimeout(resolve, 500));

	// return getMockResponse(request.query);

	// ============================================
	// PRODUCTION API CODE (COMMENTED OUT)
	// TODO: Uncomment this section and remove mock implementation above
	// ============================================
	const response = await fetch(getApiUrl("chat"), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query: request.query }),
	});

	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`);
	}

	const data: ApiResponse = await response.json();
	return data;
}
