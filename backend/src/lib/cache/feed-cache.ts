/**
 * User Feed Cache
 *
 * Caches personalised article feeds per user to avoid re-scoring
 * on every page refresh.
 *
 * Key: feed:<userId>   TTL: 10 minutes
 */

import { redis, TTL } from "../redis";

export interface CachedFeedArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category: string;
  score?: number;
  [key: string]: unknown;
}

export interface CachedFeedPayload {
  userId: string;
  articles: CachedFeedArticle[];
  categories: Record<string, number>;
  generatedAt: string;
}

const PREFIX = "feed:";

export const feedCache = {
  /** Build the Redis key for a user's personalised feed. */
  key(userId: string): string {
    return `${PREFIX}${userId}`;
  },

  /** Retrieve a user's cached feed. Returns null on miss or Redis down. */
  async get(userId: string): Promise<CachedFeedPayload | null> {
    const cached = await redis.get<CachedFeedPayload>(feedCache.key(userId));
    if (cached) {
      console.log(`[FeedCache] HIT for userId="${userId}"`);
    }
    return cached;
  },

  /** Cache a personalised feed with 10-minute TTL. */
  async set(userId: string, payload: CachedFeedPayload): Promise<void> {
    await redis.set(feedCache.key(userId), payload, TTL.FEED);
    console.log(`[FeedCache] SET for userId="${userId}" (TTL=${TTL.FEED}s)`);
  },

  /** Evict a specific user's feed cache (e.g. after preference update). */
  async invalidate(userId: string): Promise<void> {
    await redis.del(feedCache.key(userId));
    console.log(`[FeedCache] INVALIDATED for userId="${userId}"`);
  },

  /** Evict all feed cache entries. */
  async invalidateAll(): Promise<void> {
    await redis.invalidatePrefix(PREFIX);
  },
};
