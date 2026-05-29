/**
 * News Worker — Redis-Accelerated
 *
 * Wraps any news API fetch with newsCache. Identical topic queries
 * within the 10-minute TTL window are served from Redis, reducing
 * external API calls significantly.
 *
 * Usage:
 *   import { cachedNewsFetch } from "./news.worker";
 *
 *   const feed = await cachedNewsFetch("ukraine", async () => {
 *     return fetchFromNewsApi("ukraine");
 *   });
 */

import { newsCache, type CachedNewsFeed } from "../../lib/cache/news-cache";

/**
 * Fetch news for a topic with Redis caching.
 *
 * @param topic     The topic/country keyword (e.g. "india", "ukraine").
 * @param fetcher   Async function that calls the actual news API.
 * @returns         The news feed, from cache or freshly fetched.
 */
export async function cachedNewsFetch(
  topic: string,
  fetcher: () => Promise<CachedNewsFeed>
): Promise<CachedNewsFeed & { fromCache?: boolean }> {
  // 1. Check Redis
  const cached = await newsCache.get(topic);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // 2. Fetch fresh
  console.log(`[NewsWorker] Cache miss — fetching news for topic="${topic}"…`);
  const feed = await fetcher();

  // 3. Store in Redis (non-blocking)
  newsCache.set(topic, feed).catch((err) =>
    console.error("[NewsWorker] Cache write failed:", err)
  );

  return { ...feed, fromCache: false };
}

/**
 * Force-refresh the news cache for a topic.
 * Useful after a manual pipeline trigger or webhook event.
 */
export async function refreshNewsTopic(
  topic: string,
  fetcher: () => Promise<CachedNewsFeed>
): Promise<CachedNewsFeed> {
  await newsCache.invalidate(topic);
  const feed = await fetcher();
  await newsCache.set(topic, feed);
  return feed;
}
