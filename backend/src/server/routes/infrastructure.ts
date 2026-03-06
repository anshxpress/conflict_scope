import { Elysia, t } from "elysia";
import { db, schema } from "../../../db";
import { eq } from "drizzle-orm";

export const infrastructureRoutes = new Elysia({
  prefix: "/infrastructure",
}).get(
  "/",
  async ({ query }) => {
    if (query.type) {
      const results = await db
        .select()
        .from(schema.infrastructure)
        .where(
          eq(
            schema.infrastructure.type,
            query.type as (typeof schema.infrastructureTypeEnum.enumValues)[number]
          )
        );
      return { data: results };
    }

    if (query.country) {
      const results = await db
        .select()
        .from(schema.infrastructure)
        .where(eq(schema.infrastructure.country, query.country));
      return { data: results };
    }

    const results = await db.select().from(schema.infrastructure);
    return { data: results };
  },
  {
    query: t.Object({
      type: t.Optional(t.String()),
      country: t.Optional(t.String()),
    }),
  }
);
