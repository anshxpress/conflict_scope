/**
 * Embedding Worker — Redis-Accelerated
 *
 * Wraps the existing @xenova/transformers pipeline with embeddingCache
 * so that identical article texts are never re-embedded. The 384-dim
 * vectors are stored in Redis for 30 days.
 *
 * Usage:
 *   import { getEmbedding } from "./embedding.worker";
 *   const vec = await getEmbedding("Article text here...");
 */

import { embeddingCache } from "../../lib/cache/embedding-cache";

let _pipeline: ((text: string) => Promise<{ data: Float32Array }>) | null = null;

async function loadPipeline() {
  if (_pipeline) return _pipeline;
  // Lazy import to avoid heavy startup cost when embedding isn't needed.
  const { pipeline } = await import("@xenova/transformers");
  const pipe = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  ) as unknown as (text: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>;
  _pipeline = (text: string) =>
    pipe(text, { pooling: "mean", normalize: true });
  return _pipeline;
}

/**
 * Get the embedding for a text string.
 * Checks Redis first; computes and caches on miss.
 *
 * @param text  Source text to embed (article title + description recommended).
 * @returns     384-dim normalised float array.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  // 1. Redis cache check
  const cached = await embeddingCache.get(text);
  if (cached) return cached;

  // 2. Compute embedding
  console.log("[EmbeddingWorker] Computing embedding for new text…");
  const pipe = await loadPipeline();
  const output = await pipe(text);
  const vector = Array.from(output.data) as number[];

  // 3. Store in Redis (fire-and-forget — don't block on cache write)
  embeddingCache.set(text, vector).catch((err) =>
    console.error("[EmbeddingWorker] Cache write failed:", err)
  );

  return vector;
}
