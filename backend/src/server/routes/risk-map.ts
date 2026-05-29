import { Elysia } from "elysia";
import { db, schema } from "../../../db";
import { and, eq, gte, desc, count, sql } from "drizzle-orm";
import { redis, TTL } from "../../lib/redis";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Normalise non-English country names that Nominatim occasionally stores in
 * the database back to standard English names so they can be matched against
 * the GeoJSON ADMIN property on the choropleth layer.
 */
const COUNTRY_NORMALIZE: Record<string, string> = {
  // Arabic
  "لبنان": "Lebanon",
  "سوريا": "Syria",
  "العراق": "Iraq",
  "الأردن": "Jordan",
  "اليمن": "Yemen",
  "السودان": "Sudan",
  "ليبيا": "Libya",
  "مصر": "Egypt",
  "المملكة العربية السعودية": "Saudi Arabia",
  "الإمارات العربية المتحدة": "United Arab Emirates",
  // Persian
  "ایران": "Iran",
  "پاکستان": "Pakistan",
  "افغانستان": "Afghanistan",
  // Russian/Cyrillic
  "Россия": "Russia",
  "Україна": "Ukraine",
  "Беларусь": "Belarus",
  // Hebrew
  "ישראל": "Israel",
  // Greek/Turkish
  "Κύπρος - Kıbrıs": "Cyprus",
  // Transliteration variants
  "Türkmenistan": "Turkmenistan",
};

function normalizeCountry(name: string): string {
  return COUNTRY_NORMALIZE[name?.trim()] ?? name?.trim();
}

export const riskMapRoutes = new Elysia({ prefix: "/risk-map" })
  /**
   * GET /risk-map
   * Returns country → "red" | "orange" for all countries with events.
   * Countries with no events in 14 days are green (frontend treats absent as "green").
   */
  .get("/", async () => {
    // ── L1: Redis cache check ────────────────────────────────────────────
    const RISK_MAP_KEY = "risk-map:global";
    const cachedRiskMap = await redis.get<Record<string, "red" | "orange">>(RISK_MAP_KEY);
    if (cachedRiskMap) {
      console.log("[RiskMapAPI] Redis cache HIT for global risk map.");
      return cachedRiskMap;
    }

    // ── L2: Postgres fetch ───────────────────────────────────────────────
    const now = Date.now();
    const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS);
    const fourteenDaysAgo = new Date(now - FOURTEEN_DAYS_MS);

    const recentEvents = await db
      .select({
        country: schema.countryEvents.countryId,
        publishedAt: schema.countryEvents.publishedAt,
      })
      .from(schema.countryEvents)
      .where(gte(schema.countryEvents.publishedAt, fourteenDaysAgo));

    const risk: Record<string, "red" | "orange"> = {};

    for (const event of recentEvents) {
      if (!event.country) continue;
      const country = normalizeCountry(event.country);
      if (risk[country] === "red") continue;

      const ts = event.publishedAt ? new Date(event.publishedAt).getTime() : 0;
      if (ts >= sevenDaysAgo.getTime()) {
        risk[country] = "red";
      } else {
        risk[country] = "orange";
      }
    }

    // Store in Redis for 5 minutes (non-blocking)
    redis.set(RISK_MAP_KEY, risk, TTL.RISK_MAP).catch(() => {});

    return risk;
  })

  /**
   * GET /risk-map/country/:country
   * Returns detailed conflict stats for a single country — used by the CountryRiskPanel.
   */
  .get("/country/:country", async ({ params }) => {
    const country = decodeURIComponent(params.country);
    const now = Date.now();
    const fourteenDaysAgo = new Date(now - FOURTEEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now - THIRTY_DAYS_MS);

    // Count events in 14-day window
    const [cnt14] = await db
      .select({ total: count() })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.country, country),
          gte(schema.events.timestamp, fourteenDaysAgo)
        )
      );

    // Count events in 30-day window (includes 14-day)
    const [cnt30] = await db
      .select({ total: count() })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.country, country),
          gte(schema.events.timestamp, thirtyDaysAgo)
        )
      );

    // Recent events (last 10)
    const recentEvents = await db
      .select({
        id: schema.events.id,
        title: schema.events.title,
        eventType: schema.events.eventType,
        timestamp: schema.events.timestamp,
        latitude: schema.events.latitude,
        longitude: schema.events.longitude,
      })
      .from(schema.events)
      .where(eq(schema.events.country, country))
      .orderBy(desc(schema.events.timestamp))
      .limit(10);

    // Fetch impacts for recent events
    const eventIds = recentEvents.map((e) => e.id);
    let recentImpacts: Array<{
      id: string;
      eventId: string;
      impactType: string;
      description: string | null;
      severity: string;
    }> = [];
    if (eventIds.length > 0) {
      recentImpacts = await db
        .select({
          id: schema.impacts.id,
          eventId: schema.impacts.eventId,
          impactType: schema.impacts.impactType,
          description: schema.impacts.description,
          severity: schema.impacts.severity,
        })
        .from(schema.impacts)
        .where(
          sql`${schema.impacts.eventId} IN (${sql.join(
            eventIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        );
    }

    const events14 = cnt14?.total ?? 0;
    const events30 = cnt30?.total ?? 0;
    const riskLevel: "red" | "orange" | "green" =
      events14 > 0 ? "red" : events30 > 0 ? "orange" : "green";

    return {
      country,
      riskLevel,
      events14Days: events14,
      events30Days: events30,
      recentEvents,
      recentImpacts,
    };
  });
