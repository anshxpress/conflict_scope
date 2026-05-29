/**
 * News Cache
 *
 * Caches news API responses by topic/country keyword.
 * Key: news:<topic>   TTL: 10 minutes
 *
 * Usage:
 *   const cached = await newsCache.get("india");
 *   if (cached) return cached;
 *   const fresh = await fetchNews("india");
 *   await newsCache.set("india", fresh);
 *   return fresh;
 */

import { redis, TTL } from "../redis";

export interface CachedNewsItem {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  source: string;
  publishedAt: string;
  category: string;
  duplicateCount?: number;
  [key: string]: unknown;
}

export interface CachedNewsFeed {
  topic: string;
  articles: CachedNewsItem[];
  fetchedAt: string;
}

const PREFIX = "news:";

export const newsCache = {
  /** Build the canonical Redis key for a news topic. */
  key(topic: string): string {
    return `${PREFIX}${topic.toLowerCase().replace(/\s+/g, "_")}`;
  },

  /** Get cached news for a topic. Returns null on miss or Redis down. */
  async get(topic: string): Promise<CachedNewsFeed | null> {
    const cached = await redis.get<CachedNewsFeed>(newsCache.key(topic));
    if (cached) {
      console.log(`[NewsCache] HIT for topic="${topic}"`);
    }
    return cached;
  },

  /** Store news articles for a topic with 10-minute TTL. */
  async set(topic: string, feed: CachedNewsFeed): Promise<void> {
    await redis.set(newsCache.key(topic), feed, TTL.NEWS);
    console.log(`[NewsCache] SET for topic="${topic}" (TTL=${TTL.NEWS}s)`);
  },

  /** Remove cached news for a topic (e.g. after forced refresh). */
  async invalidate(topic: string): Promise<void> {
    await redis.del(newsCache.key(topic));
    console.log(`[NewsCache] INVALIDATED for topic="${topic}"`);
  },

  /** Remove all news cache entries. */
  async invalidateAll(): Promise<void> {
    await redis.invalidatePrefix(PREFIX);
  },
};
