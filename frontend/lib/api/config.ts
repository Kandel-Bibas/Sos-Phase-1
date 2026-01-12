/**
 * API configuration and endpoint definitions
 * Configure via NEXT_PUBLIC_API_URL environment variable
 *
 * TODO: Verify API endpoints match your production API structure
 * TODO: Add authentication headers if required (API keys, tokens, etc.)
 * TODO: Update default API_BASE_URL to production URL
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// TODO: Update these endpoints to match your production API routes
export const API_ENDPOINTS = {
	chat: "/prod/query",
	// TODO: Remove stream endpoint if not used in production
	// stream: "/api/chat/stream",
} as const;

/**
 * Get full URL for an endpoint
 * TODO: Add authentication headers or query parameters if needed
 */
export function getApiUrl(endpoint: keyof typeof API_ENDPOINTS): string {
	return `${API_BASE_URL}${API_ENDPOINTS[endpoint]}`;
}
