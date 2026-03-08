import { Elysia, t } from "elysia";
import { db, schema } from "../../../db";
import { eq, and } from "drizzle-orm";

export const infrastructureRoutes = new Elysia({
  prefix: "/infrastructure",
}).get(
  "/",
  async ({ query }) => {
    const conditions = [];

    if (query.type) {
      conditions.push(
        eq(
          schema.infrastructure.type,
          query.type as (typeof schema.infrastructureTypeEnum.enumValues)[number]
        )
      );
    }

    if (query.country) {
      conditions.push(eq(schema.infrastructure.country, query.country));
    }

    const limit = Math.min(parseInt(query.limit ?? "500", 10), 2000);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select()
      .from(schema.infrastructure)
      .where(where)
      .limit(limit);

    return { data: results };
  },
  {
    query: t.Object({
      type: t.Optional(t.String()),
      country: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  }
);
