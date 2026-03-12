import { Elysia } from "elysia";
import { db, schema } from "../../../db";
import { desc, eq } from "drizzle-orm";

/** Fetch USD→INR rate from frankfurter.app (free, no API key). */
async function fetchUsdToInr(): Promise<number> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=INR", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return 83.5; // reasonable fallback
    const json = await res.json() as { rates?: { INR?: number } };
    return json?.rates?.INR ?? 83.5;
  } catch {
    return 83.5;
  }
}

export const commodityRoutes = new Elysia({ prefix: "/commodities" })
  /**
   * GET /commodities/prices
   * Returns the latest price for each commodity (gold, silver, oil)
   * plus the live USD→INR exchange rate.
   */
  .get("/prices", async () => {
    const commodities = ["gold", "silver", "oil"] as const;
    const result: Record<
      string,
      { price: number; currency: string; timestamp: string; source: string } | null
    > = {};

    for (const commodity of commodities) {
      const [row] = await db
        .select()
        .from(schema.commodities)
        .where(eq(schema.commodities.commodity, commodity))
        .orderBy(desc(schema.commodities.timestamp))
        .limit(1);
      result[commodity] = row
        ? {
            price: row.price,
            currency: row.currency,
            timestamp: row.timestamp.toISOString(),
            source: row.source,
          }
        : null;
    }

    const usdToInr = await fetchUsdToInr();
    return { ...result, usdToInr };
  })

  /**
   * GET /commodities/resources
   * Returns all country→resource mappings.
   * Response: [{ country: "Russia", resources: ["oil", "gold"] }, ...]
   */
  .get("/resources", async () => {
    const rows = await db.select().from(schema.resources);

    // Group by country
    const map: Record<string, string[]> = {};
    for (const row of rows) {
      if (!map[row.country]) map[row.country] = [];
      map[row.country].push(row.resource);
    }

    return Object.entries(map).map(([country, resources]) => ({
      country,
      resources,
    }));
  })

  /**
   * GET /commodities/resources/:country
   * Returns resources for a specific country.
   */
  .get("/resources/:country", async ({ params }) => {
    const rows = await db
      .select()
      .from(schema.resources)
      .where(eq(schema.resources.country, decodeURIComponent(params.country)));
    return { country: decodeURIComponent(params.country), resources: rows.map((r) => r.resource) };
  });
