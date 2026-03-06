import { Elysia, t } from "elysia";
import { db, schema } from "../../../db";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";

export const eventsRoutes = new Elysia({ prefix: "/events" })
  // GET /events — list events with optional filters
  .get(
    "/",
    async ({ query }) => {
      const conditions = [];

      if (query.country) {
        conditions.push(eq(schema.events.country, query.country));
      }

      if (query.type) {
        conditions.push(
          eq(
            schema.events.eventType,
            query.type as (typeof schema.eventTypeEnum.enumValues)[number]
          )
        );
      }

      if (query.from) {
        conditions.push(gte(schema.events.timestamp, new Date(query.from)));
      }

      if (query.to) {
        conditions.push(lte(schema.events.timestamp, new Date(query.to)));
      }

      if (query.confidence) {
        conditions.push(
          eq(
            schema.events.confidenceScore,
            query.confidence as (typeof schema.confidenceEnum.enumValues)[number]
          )
        );
      }

      const limit = Math.min(parseInt(query.limit ?? "200", 10), 1000);
      const offset = parseInt(query.offset ?? "0", 10);

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [events, totalResult] = await Promise.all([
        db
          .select()
          .from(schema.events)
          .where(where)
          .orderBy(desc(schema.events.timestamp))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count() })
          .from(schema.events)
          .where(where),
      ]);

      return {
        data: events,
        total: totalResult[0]?.total ?? 0,
        limit,
        offset,
      };
    },
    {
      query: t.Object({
        country: t.Optional(t.String()),
        type: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        confidence: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
    }
  )

  // GET /events/:id — single event with sources
  .get("/:id", async ({ params }) => {
    const [event] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, params.id))
      .limit(1);

    if (!event) {
      return { error: "Event not found" };
    }

    const eventSources = await db
      .select()
      .from(schema.sources)
      .where(eq(schema.sources.eventId, params.id));

    return { ...event, sources: eventSources };
  });
