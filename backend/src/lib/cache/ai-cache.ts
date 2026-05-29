/**
 * AI Response Cache
 *
 * Avoids redundant LLM calls by caching AI responses keyed on a
 * SHA-256 hash of the input question/prompt.
 *
 * Key: ai:<sha256(question)>   TTL: 15 minutes
 */

import { redis, TTL } from "../redis";

export interface CachedAiResponse {
  question: string;
  response: string;
  summary?: string;
  recommendation?: string;
  generatedAt: string;
  [key: string]: unknown;
}

const PREFIX = "ai:";

/**
 * Compute a SHA-256 hex digest of a string using the Web Crypto API
 * (available in Bun/Node 18+ without any import).
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const aiCache = {
  /** Build the Redis key for an AI question. */
  async key(question: string): Promise<string> {
    const hash = await sha256(question.trim().toLowerCase());
    return `${PREFIX}${hash}`;
  },

  /** Retrieve a cached AI response. Returns null on miss or Redis down. */
  async get(question: string): Promise<CachedAiResponse | null> {
    const k = await aiCache.key(question);
    const cached = await redis.get<CachedAiResponse>(k);
    if (cached) {
      console.log(`[AiCache] HIT for question hash=${k.slice(3, 11)}…`);
    }
    return cached;
  },

  /** Cache an AI response with 15-minute TTL. */
  async set(question: string, response: CachedAiResponse): Promise<void> {
    const k = await aiCache.key(question);
    await redis.set(k, response, TTL.AI);
    console.log(`[AiCache] SET hash=${k.slice(3, 11)}… (TTL=${TTL.AI}s)`);
  },

  /** Invalidate a specific question's cached response. */
  async invalidate(question: string): Promise<void> {
    const k = await aiCache.key(question);
    await redis.del(k);
  },

  /** Invalidate all AI cache entries. */
  async invalidateAll(): Promise<void> {
    await redis.invalidatePrefix(PREFIX);
  },
};
