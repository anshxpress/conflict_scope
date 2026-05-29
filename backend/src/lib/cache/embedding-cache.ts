/**
 * Embedding Cache
 *
 * Avoids recomputing expensive 384-dim sentence-transformer embeddings
 * by caching them keyed on a SHA-256 hash of the article text.
 *
 * Key: embedding:<sha256(text)>   TTL: 30 days
 */

import { redis, TTL } from "../redis";

const PREFIX = "embedding:";

/**
 * Compute a SHA-256 hex digest of a string using the Web Crypto API.
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const embeddingCache = {
  /** Build the Redis key for an embedding from article text. */
  async key(text: string): Promise<string> {
    const hash = await sha256(text.trim());
    return `${PREFIX}${hash}`;
  },

  /**
   * Retrieve a cached embedding vector.
   * Returns null on cache miss or Redis unavailability.
   */
  async get(text: string): Promise<number[] | null> {
    const k = await embeddingCache.key(text);
    const cached = await redis.get<number[]>(k);
    if (cached) {
      console.log(`[EmbeddingCache] HIT (hash=${k.slice(10, 18)}…)`);
    }
    return cached;
  },

  /**
   * Cache an embedding vector for 30 days.
   * @param text   The source text that was embedded.
   * @param vector The 384-dim float array produced by the model.
   */
  async set(text: string, vector: number[]): Promise<void> {
    const k = await embeddingCache.key(text);
    await redis.set(k, vector, TTL.EMBEDDING);
    console.log(`[EmbeddingCache] SET (hash=${k.slice(10, 18)}…, dims=${vector.length}, TTL=${TTL.EMBEDDING}s)`);
  },

  /** Invalidate a specific embedding (rarely needed). */
  async invalidate(text: string): Promise<void> {
    const k = await embeddingCache.key(text);
    await redis.del(k);
  },
};
