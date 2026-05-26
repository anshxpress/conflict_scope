import { pipeline } from "@xenova/transformers";

// Lazy-loaded pipeline instance
let featureExtractor: any = null;

async function getExtractor() {
  if (!featureExtractor) {
    console.log("[Embeddings] Initializing Xenova/all-MiniLM-L12-v2 ONNX pipeline...");
    featureExtractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L12-v2");
    console.log("[Embeddings] ONNX pipeline successfully initialized.");
  }
  return featureExtractor;
}

// ── Async Inference Queue ──────────────────────────────────────────────────
// Ensures only one ONNX inference runs at a time to prevent high memory usage
// and thread conflicts under Bun.

type QueueTask = {
  text: string;
  resolve: (value: number[]) => void;
  reject: (err: any) => void;
};

const queue: QueueTask[] = [];
let processing = false;

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  const task = queue.shift()!;
  try {
    const extractor = await getExtractor();
    const output = await extractor(task.text, { pooling: "mean", normalize: true });
    const embedding = Array.from(output.data) as number[];
    task.resolve(embedding);
  } catch (err) {
    console.error("[Embeddings] Error in queue feature extraction:", err);
    task.reject(err);
  } finally {
    processing = false;
    processQueue(); // Process next in queue
  }
}

/**
 * Generate a 384-dimensional semantic embedding for the given text.
 * Runs inside a serial queue for resource safety.
 */
export function getEmbedding(text: string): Promise<number[]> {
  return new Promise<number[]>((resolve, reject) => {
    queue.push({ text, resolve, reject });
    processQueue();
  });
}

/**
 * Compute the cosine similarity between two vectors.
 * Returns a value between -1.0 and 1.0.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    console.warn(`[Embeddings] Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
    return 0;
  }

  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
