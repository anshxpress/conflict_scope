import { Elysia } from "elysia";
import { db, schema } from "../../../db";
import { eq, and, gte } from "drizzle-orm";
import { updateCountryMetrics, dbMemoryBuffer } from "../../services/workers/pipeline";
import { countryCache } from "../../lib/cache/country-cache";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache (V2 Standard)

export const countryRoutes = new Elysia({ prefix: "/country" })
  /**
   * GET /api/v1/country/:country
   * Returns comprehensive cached intelligence for a single country.
   * If cache is expired (>10m) or missing, recalculates dynamically before serving.
   */
  .get("/:country", async ({ params, set }) => {
    const rawCountry = decodeURIComponent(params.country);
    
    // Standardize input string
    const country = rawCountry
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    try {
      // ── L1: Redis cache check ────────────────────────────────────────────
      const redisHit = await countryCache.get(country);
      if (redisHit) {
        set.headers["Cache-Control"] = "public, max-age=600";
        return redisHit;
      }

      // ── L2: Postgres / DB cache check ────────────────────────────────────
      // 1. Look for pre-calculated cache in country_metrics
      const [cached] = await db
        .select({
          country: schema.countryMetrics.country,
          score: schema.countryMetrics.score,
          articles: schema.countryMetrics.articles,
          categories: schema.countryMetrics.categories,
          commodities: schema.countryMetrics.commodities,
          videos: schema.countryMetrics.videos,
          timeline: schema.countryMetrics.timeline,
          lastUpdated: schema.countryMetrics.lastUpdated,
          riskLevel: schema.countries.riskLevel,
        })
        .from(schema.countryMetrics)
        .leftJoin(schema.countries, eq(schema.countryMetrics.country, schema.countries.id))
        .where(eq(schema.countryMetrics.country, country))
        .limit(1);

      const now = Date.now();

      if (cached) {
        const cacheAge = now - new Date(cached.lastUpdated).getTime();
        
        if (cacheAge < CACHE_TTL_MS) {
          // Cache hit: promote to Redis and serve!
          set.headers["Cache-Control"] = "public, max-age=600"; // 10m CDN cache
          const payload = {
            country: cached.country,
            score: cached.score,
            riskLevel: cached.riskLevel || "green",
            articles: cached.articles,
            categories: cached.categories,
            commodities: cached.commodities,
            videos: cached.videos,
            timeline: cached.timeline,
            cached: true,
          };
          // Promote to Redis for the next 30 minutes (non-blocking)
          countryCache.set(country, payload).catch(() => {});
          return payload;
        }
      }

      console.log(`[Country API] Cache miss/expired for "${country}". Recalculating...`);

      // 2. Cache miss: trigger incremental pre-calculation
      await updateCountryMetrics(country);

      // 3. Retrieve newly generated metrics
      const [fresh] = await db
        .select({
          country: schema.countryMetrics.country,
          score: schema.countryMetrics.score,
          articles: schema.countryMetrics.articles,
          categories: schema.countryMetrics.categories,
          commodities: schema.countryMetrics.commodities,
          videos: schema.countryMetrics.videos,
          timeline: schema.countryMetrics.timeline,
          lastUpdated: schema.countryMetrics.lastUpdated,
          riskLevel: schema.countries.riskLevel,
        })
        .from(schema.countryMetrics)
        .leftJoin(schema.countries, eq(schema.countryMetrics.country, schema.countries.id))
        .where(eq(schema.countryMetrics.country, country))
        .limit(1);

      if (!fresh) {
        // Return empty payload if no events recorded
        return {
          country,
          score: 0,
          riskLevel: "green",
          articles: [],
          categories: {},
          commodities: [],
          videos: [],
          timeline: [],
          cached: false,
        };
      }

      // V2: extended CDN cache control to match the 30-minute standard
      set.headers["Cache-Control"] = "public, max-age=1800";
      const freshPayload = {
        country: fresh.country,
        score: fresh.score,
        riskLevel: fresh.riskLevel || "green",
        articles: fresh.articles,
        categories: fresh.categories,
        commodities: fresh.commodities,
        videos: fresh.videos,
        timeline: fresh.timeline,
        cached: false,
      };
      // Store fresh result in Redis for subsequent requests (non-blocking)
      countryCache.set(country, freshPayload).catch(() => {});
      return freshPayload;

    } catch (err) {
      console.error(`[Country API] Error serving intelligence for ${country}:`, err);

      // --- FAILOVER RECUPERATION: Search memory queue buffer ---
      try {
        const memoryArticles = dbMemoryBuffer.filter((item) =>
          item.countries?.some((c: string) => c.toLowerCase() === country.toLowerCase())
        );

        if (memoryArticles.length > 0) {
          console.log(`[Country API] [FAILOVER ACTIVE] Serving ${memoryArticles.length} buffered articles from memory.`);
          const categories: Record<string, number> = {};
          const timeline: any[] = [];
          const commodities = new Set<string>();

          for (const item of memoryArticles) {
            categories[item.category] = (categories[item.category] || 0) + 1;
            timeline.push({
              date: item.publishedAt,
              title: item.title,
              category: item.category,
              severity: 1.0,
              url: item.url,
              source: item.source,
            });
            const textLower = `${item.title} ${item.content}`.toLowerCase();
            if (textLower.includes("oil")) commodities.add("oil");
            if (textLower.includes("gold")) commodities.add("gold");
            if (textLower.includes("silver")) commodities.add("silver");
          }

          return {
            country,
            score: Math.min(100, memoryArticles.length * 15),
            riskLevel: "orange",
            articles: memoryArticles.slice(0, 10).map((a, index) => ({
              id: `mem-${index}`,
              title: a.title,
              description: a.description,
              url: a.url,
              source: a.source,
              publishedAt: a.publishedAt,
              category: a.category,
              duplicateCount: 1,
            })),
            categories,
            commodities: Array.from(commodities),
            videos: [],
            timeline: timeline.slice(0, 8),
            cached: false,
            failover: true,
          };
        }
      } catch (memErr) {
        console.error("[Country API] Error retrieving failover memory items:", memErr);
      }

      // --- CRITICAL RECOVERY: Return stale safe state rather than 500/crashing ---
      console.warn(`[Country API] [FAILOVER STALE] Returning stale fallback empty state for ${country} to maintain uptime.`);
      return {
        country,
        score: 0,
        riskLevel: "green",
        articles: [],
        categories: {},
        commodities: [],
        videos: [],
        timeline: [],
        cached: false,
        stale: true,
      };
    }
  })

  /**
   * GET /api/v1/country/connections/:country
   * Returns top country influence connection routes for a target country.
   * Leverages 5-minute database cache and recalculates dynamically if stale.
   */
  .get("/connections/:country", async ({ params, set }) => {
    const rawCountry = decodeURIComponent(params.country);

    // Standardize input string to Pascal Case
    const country = rawCountry
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    try {
      // 1. Check DB for cached connections updated in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const cachedConnections = await db
        .select({
          destination: schema.countryConnections.sourceCountry,
          score: schema.countryConnections.connectionScore,
          category: schema.countryConnections.category,
        })
        .from(schema.countryConnections)
        .where(
          and(
            eq(schema.countryConnections.targetCountry, country),
            gte(schema.countryConnections.updatedAt, fiveMinutesAgo)
          )
        );

      if (cachedConnections.length > 0) {
        const routes = cachedConnections.map((c) => {
          let intensity = "low";
          if (c.score >= 100) intensity = "double";
          else if (c.score >= 50) intensity = "high";
          else if (c.score >= 20) intensity = "medium";

          return {
            destination: c.destination,
            score: c.score,
            category: c.category,
            intensity,
          };
        });

        // Add 60s CDN cache control for fast UI switches
        set.headers["Cache-Control"] = "public, max-age=60";
        return {
          country,
          routes,
        };
      }

      console.log(`[Country Connections API] Cache miss/expired for connections of "${country}". Recalculating...`);

      // 2. Cache miss: trigger full connections calculation dynamically
      const { recalculateConnections } = await import("../../services/workers/connections");
      await recalculateConnections();

      // 3. Query updated connections from database
      const freshConnections = await db
        .select({
          destination: schema.countryConnections.sourceCountry,
          score: schema.countryConnections.connectionScore,
          category: schema.countryConnections.category,
        })
        .from(schema.countryConnections)
        .where(eq(schema.countryConnections.targetCountry, country));

      const routes = freshConnections.map((c) => {
        let intensity = "low";
        if (c.score >= 100) intensity = "double";
        else if (c.score >= 50) intensity = "high";
        else if (c.score >= 20) intensity = "medium";

        return {
          destination: c.destination,
          score: c.score,
          category: c.category,
          intensity,
        };
      });

      set.headers["Cache-Control"] = "public, max-age=60";
      return {
        country,
        routes,
      };

    } catch (err) {
      console.error(`[Country Connections API] Failed serving connections for ${country}:`, err);
      // Return safe fallback to prevent UI crashes in production
      return {
        country,
        routes: [],
      };
    }
  });
