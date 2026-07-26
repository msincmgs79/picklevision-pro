// Gemini config for the AI coach. Reuses the SAME provider + key as the AI shot
// breakdown (gemini-2.5-flash), so there's one AI provider, one key, one bill.
// The key lives only in the server environment (GEMINI_API_KEY) — never in the
// repo, and never sent to the browser (this is used server-side only).
export const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
export const geminiConfigured = !!GEMINI_KEY;

// The coaching model — same family as the breakdown. One constant to tune.
export const COACH_MODEL = "gemini-2.5-flash";

// Streaming (SSE) endpoint for a given model. The key is sent as the
// `x-goog-api-key` header (not in the URL) — see the route.
export function geminiStreamUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
}
