/**
 * AI Worker — Redis-Accelerated
 *
 * Wraps any AI/LLM call with aiCache so that identical questions
 * never trigger a redundant API call within the 15-minute window.
 *
 * Usage:
 *   import { cachedAiCall } from "./ai.worker";
 *
 *   const result = await cachedAiCall(
 *     "Summarise the conflict situation in Sudan",
 *     async () => myLlmClient.generate(prompt)
 *   );
 */

import { aiCache, type CachedAiResponse } from "../../lib/cache/ai-cache";

/**
 * Run an AI call with Redis caching.
 *
 * @param question    The user question / prompt (used as cache key).
 * @param generator   Async function that actually calls the LLM.
 * @returns           The AI response, either from cache or freshly generated.
 */
export async function cachedAiCall(
  question: string,
  generator: () => Promise<CachedAiResponse>
): Promise<CachedAiResponse & { fromCache?: boolean }> {
  // 1. Check Redis cache
  const cached = await aiCache.get(question);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // 2. Generate fresh response
  console.log("[AiWorker] Cache miss — calling LLM…");
  const response = await generator();

  // 3. Store in Redis (non-blocking)
  aiCache.set(question, response).catch((err) =>
    console.error("[AiWorker] Cache write failed:", err)
  );

  return { ...response, fromCache: false };
}

/**
 * Invalidate the cached response for a specific question.
 * Call this when the underlying data changes and stale answers would be harmful.
 */
export async function invalidateAiCache(question: string): Promise<void> {
  await aiCache.invalidate(question);
}
