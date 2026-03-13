import { Elysia, t } from "elysia";
import { db, schema } from "../../../db";
import { eq, sql, count, max, desc } from "drizzle-orm";

export const statsRoutes = new Elysia({ prefix: "/stats" })
  // GET /stats — global statistics
  .get("/", async () => {
    const [totalEvents] = await db
      .select({ total: count() })
      .from(schema.events);

    const byType = await db
      .select({
        eventType: schema.events.eventType,
        count: count(),
      })
      .from(schema.events)
      .groupBy(schema.events.eventType);

    const byCountry = await db
      .select({
        country: schema.events.country,
        count: count(),
      })
      .from(schema.events)
      .groupBy(schema.events.country)
      .orderBy(desc(count()));

    const byConfidence = await db
      .select({
        confidence: schema.events.confidenceScore,
        count: count(),
      })
      .from(schema.events)
      .groupBy(schema.events.confidenceScore);

    const [latestEvent] = await db
      .select({
        timestamp: max(schema.events.timestamp),
      })
      .from(schema.events);

    return {
      totalEvents: totalEvents?.total ?? 0,
      byType,
      byCountry,
      byConfidence,
      lastRecordedEvent: latestEvent?.timestamp ?? null,
    };
  })

  // GET /stats/:country — statistics for a single country
  .get("/:country", async ({ params }) => {
    const country = decodeURIComponent(params.country);

    const [totalEvents] = await db
      .select({ total: count() })
      .from(schema.events)
      .where(eq(schema.events.country, country));

    const byType = await db
      .select({
        eventType: schema.events.eventType,
        count: count(),
      })
      .from(schema.events)
      .where(eq(schema.events.country, country))
      .groupBy(schema.events.eventType);

    const [latestEvent] = await db
      .select({
        timestamp: max(schema.events.timestamp),
      })
      .from(schema.events)
      .where(eq(schema.events.country, country));

    // Monthly trend
    const monthlyTrend = await db
      .select({
        month: sql<string>`to_char(${schema.events.timestamp}, 'YYYY-MM')`,
        count: count(),
      })
      .from(schema.events)
      .where(eq(schema.events.country, country))
      .groupBy(sql`to_char(${schema.events.timestamp}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${schema.events.timestamp}, 'YYYY-MM')`);

    return {
      country,
      totalEvents: totalEvents?.total ?? 0,
      byType,
      lastRecordedEvent: latestEvent?.timestamp ?? null,
      monthlyTrend,
    };
  });
