import { Elysia } from "elysia";
import { db, schema } from "../../../db";
import { and, eq, gte, desc, count } from "drizzle-orm";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const riskMapRoutes = new Elysia({ prefix: "/risk-map" })
  /**
   * GET /risk-map
   * Returns country → "red" | "orange" for all countries with events.
   * Countries with no events in 30 days are absent (frontend treats as "green").
   */
  .get("/", async () => {
    const now = Date.now();
    const fourteenDaysAgo = new Date(now - FOURTEEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now - THIRTY_DAYS_MS);

    const recentEvents = await db
      .select({
        country: schema.events.country,
        timestamp: schema.events.timestamp,
      })
      .from(schema.events)
      .where(gte(schema.events.timestamp, thirtyDaysAgo));

    const risk: Record<string, "red" | "orange"> = {};

    for (const event of recentEvents) {
      const country = event.country?.trim();
      if (!country) continue;
      if (risk[country] === "red") continue;

      const ts = new Date(event.timestamp).getTime();
      if (ts >= fourteenDaysAgo.getTime()) {
        risk[country] = "red";
      } else {
        risk[country] = "orange";
      }
    }

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
    };
  });
