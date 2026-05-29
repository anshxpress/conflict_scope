/**
 * Country Intelligence Cache
 *
 * Caches the full country intelligence payload (articles, metrics,
 * timeline, commodities, videos) to avoid repeating expensive DB
 * aggregation and API calls.
 *
 * Key: country:<Name>   TTL: 30 minutes
 */

import { redis, TTL } from "../redis";

export interface CachedCountryPayload {
  country: string;
  score: number;
  riskLevel: string;
  // JSON columns from Drizzle ORM are typed as `unknown`; accept both forms
  articles: unknown[] | unknown;
  categories: Record<string, number> | unknown;
  commodities: unknown[] | unknown;
  videos: unknown[] | unknown;
  timeline: unknown[] | unknown;
  cached: boolean;
  [key: string]: unknown;
}

const PREFIX = "country:";

export const countryCache = {
  /** Build the canonical Redis key for a country name. */
  key(country: string): string {
    // Normalise to Title Case, e.g. "india" → "India"
    const normalised = country
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return `${PREFIX}${normalised}`;
  },

  /** Get cached country intelligence. Returns null on miss or Redis down. */
  async get(country: string): Promise<CachedCountryPayload | null> {
    const cached = await redis.get<CachedCountryPayload>(countryCache.key(country));
    if (cached) {
      console.log(`[CountryCache] HIT for country="${country}"`);
    }
    return cached;
  },

  /** Store country intelligence payload with 30-minute TTL. */
  async set(country: string, payload: CachedCountryPayload): Promise<void> {
    // Mark as serving from Redis cache
    const toStore: CachedCountryPayload = { ...payload, cached: true };
    await redis.set(countryCache.key(country), toStore, TTL.COUNTRY);
    console.log(`[CountryCache] SET for country="${country}" (TTL=${TTL.COUNTRY}s)`);
  },

  /** Evict a specific country's cache (e.g. after a pipeline run). */
  async invalidate(country: string): Promise<void> {
    await redis.del(countryCache.key(country));
    console.log(`[CountryCache] INVALIDATED for country="${country}"`);
  },

  /** Evict all country cache entries. */
  async invalidateAll(): Promise<void> {
    await redis.invalidatePrefix(PREFIX);
  },
};
