/**
 * Redis Client — ConflictScope
 *
 * Singleton Upstash Redis client with a safe wrapper layer.
 * Every operation is wrapped in try/catch so that a Redis outage
 * never crashes the API — all callers fall back to Postgres transparently.
 *
 * Redis acts as TEMPORARY MEMORY ONLY.
 * Supabase/Postgres remains the single source of truth.
 */

import { Redis } from "@upstash/redis";

// ── Singleton ─────────────────────────────────────────────────────────────────

let _client: Redis | null = null;

function getClient(): Redis | null {
  if (_client) return _client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — Redis disabled."
    );
    return null;
  }

  try {
    _client = new Redis({ url, token });
    console.log("[Redis] Client initialized.");
  } catch (err) {
    console.error("[Redis] Failed to initialize client:", err);
    return null;
  }

  return _client;
}

// ── Safe wrapper ──────────────────────────────────────────────────────────────

export const redis = {
  /**
   * Retrieve a JSON-serializable value from Redis.
   * Returns null if the key doesn't exist or Redis is unavailable.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const client = getClient();
      if (!client) return null;
      const value = await client.get<T>(key);
      return value ?? null;
    } catch (err) {
      console.error(`[Redis] get("${key}") failed:`, err);
      return null;
    }
  },

  /**
   * Store a JSON-serializable value with an optional TTL (seconds).
   * Silently no-ops if Redis is unavailable.
   */
  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const client = getClient();
      if (!client) return;
      if (ttlSeconds !== undefined) {
        await client.set(key, value, { ex: ttlSeconds });
      } else {
        await client.set(key, value);
      }
    } catch (err) {
      console.error(`[Redis] set("${key}") failed:`, err);
    }
  },

  /**
   * Delete one or more keys.
   * Silently no-ops if Redis is unavailable.
   */
  async del(...keys: string[]): Promise<void> {
    try {
      const client = getClient();
      if (!client) return;
      await client.del(...keys);
    } catch (err) {
      console.error(`[Redis] del(${keys.join(", ")}) failed:`, err);
    }
  },

  /**
   * Check whether a key exists.
   * Returns false if Redis is unavailable.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = getClient();
      if (!client) return false;
      const result = await client.exists(key);
      return result === 1;
    } catch (err) {
      console.error(`[Redis] exists("${key}") failed:`, err);
      return false;
    }
  },

  /**
   * Invalidate all keys matching a pattern prefix.
   * Useful for bulk-clearing a cache namespace.
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    try {
      const client = getClient();
      if (!client) return;
      const keys = await client.keys(`${prefix}*`);
      if (keys.length > 0) {
        await client.del(...keys);
        console.log(`[Redis] Invalidated ${keys.length} keys with prefix "${prefix}"`);
      }
    } catch (err) {
      console.error(`[Redis] invalidatePrefix("${prefix}") failed:`, err);
    }
  },

  /** Returns true when the Redis client is configured and reachable. */
  async isAvailable(): Promise<boolean> {
    try {
      const client = getClient();
      if (!client) return false;
      await client.ping();
      return true;
    } catch {
      return false;
    }
  },
};

// ── TTL constants (seconds) ───────────────────────────────────────────────────

export const TTL = {
  NEWS: 10 * 60,          // 10 minutes
  COUNTRY: 30 * 60,       // 30 minutes
  AI: 15 * 60,            // 15 minutes
  FEED: 10 * 60,          // 10 minutes
  EMBEDDING: 30 * 24 * 3600, // 30 days
  RISK_MAP: 5 * 60,       // 5 minutes
  COMMODITY_PRICES: 5 * 60,  // 5 minutes
  COMMODITY_OVERVIEW: 10 * 60, // 10 minutes
  VIDEOS: 15 * 60,        // 15 minutes
} as const;
