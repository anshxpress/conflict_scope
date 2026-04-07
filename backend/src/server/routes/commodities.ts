import { Elysia, t } from "elysia";
import { db, schema } from "../../../db";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { isTrustedSource } from "../../services/verification/confidence";
import {
  computeCommodityForecast,
  isStrictlyVerifiedSignal,
} from "../../services/commodities/forecast-engine";
import { toCommodityForecastApiResponse } from "./contracts/commodity-forecast";

function confidenceFromRank(
  rank: number | null | undefined,
): "low" | "medium" | "high" | null {
  if (rank === 3) return "high";
  if (rank === 2) return "medium";
  if (rank === 1) return "low";
  return null;
}

/** Fetch USD→INR rate from frankfurter.app (free, no API key). */
async function fetchUsdToInr(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=INR",
      {
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return 83.5; // reasonable fallback
    const json = (await res.json()) as { rates?: { INR?: number } };
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
      {
        price: number;
        currency: string;
        timestamp: string;
        source: string;
      } | null
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
    return {
      country: decodeURIComponent(params.country),
      resources: rows.map((r) => r.resource),
    };
  })

  /**
   * GET /commodities/history/:commodity?hours=168
   * Returns historical price points for commodity timeline overlays.
   */
  .get("/history/:commodity", async ({ params, query }) => {
    const commodity = params.commodity as "gold" | "silver" | "oil";
    if (!schema.commodityNameEnum.enumValues.includes(commodity)) {
      return { error: "Unsupported commodity" };
    }

    const hours = Math.max(
      1,
      Math.min(parseInt(query.hours ?? "168", 10), 24 * 90),
    );
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const rows = await db
      .select({
        price: schema.commodities.price,
        timestamp: schema.commodities.timestamp,
        source: schema.commodities.source,
      })
      .from(schema.commodities)
      .where(
        and(
          eq(schema.commodities.commodity, commodity),
          gte(schema.commodities.timestamp, since),
        ),
      )
      .orderBy(schema.commodities.timestamp);

    return {
      commodity,
      points: rows.map((r) => ({
        price: r.price,
        timestamp: r.timestamp.toISOString(),
        source: r.source,
      })),
    };
  })

  /**
   * GET /commodities/insights?commodity=oil&hours=168
   * Returns latest correlations, associated events, and impact scores.
   */
  .get("/insights", async ({ query }) => {
    const commodity = (query.commodity || "oil") as "gold" | "silver" | "oil";
    if (!schema.commodityNameEnum.enumValues.includes(commodity)) {
      return { error: "Unsupported commodity" };
    }

    const hours = Math.max(
      1,
      Math.min(parseInt(query.hours ?? "168", 10), 24 * 30),
    );
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: schema.commodityCorrelations.id,
        eventId: schema.commodityCorrelations.eventId,
        windowHours: schema.commodityCorrelations.windowHours,
        eventTimestamp: schema.commodityCorrelations.eventTimestamp,
        priceBefore: schema.commodityCorrelations.priceBefore,
        priceAfter: schema.commodityCorrelations.priceAfter,
        absoluteChange: schema.commodityCorrelations.absoluteChange,
        percentChange: schema.commodityCorrelations.percentChange,
        impactScore: schema.commodityCorrelations.impactScore,
        eventTitle: schema.events.title,
        country: schema.events.country,
        eventType: schema.events.eventType,
        eventConfidence: schema.events.confidenceScore,
      })
      .from(schema.commodityCorrelations)
      .innerJoin(
        schema.events,
        eq(schema.events.id, schema.commodityCorrelations.eventId),
      )
      .where(
        and(
          eq(schema.commodityCorrelations.commodity, commodity),
          gte(schema.commodityCorrelations.computedAt, since),
        ),
      )
      .orderBy(desc(schema.commodityCorrelations.impactScore))
      .limit(100);

    const eventIds = [...new Set(rows.map((r) => r.eventId))];
    const sourcesByEvent = new Map<
      string,
      { sourceCount: number; hasTrustedSource: boolean }
    >();
    const refsByEvent = new Map<
      string,
      {
        triggerType: string | null;
        category: string | null;
        leaderName: string | null;
        policyAction: string | null;
        referenceConfidence: "low" | "medium" | "high" | null;
      }
    >();

    if (eventIds.length > 0) {
      const sourceRows = await db
        .select({
          eventId: schema.sources.eventId,
          sourceName: schema.sources.sourceName,
        })
        .from(schema.sources)
        .where(inArray(schema.sources.eventId, eventIds));

      for (const source of sourceRows) {
        const current = sourcesByEvent.get(source.eventId) ?? {
          sourceCount: 0,
          hasTrustedSource: false,
        };
        current.sourceCount += 1;
        if (!current.hasTrustedSource && isTrustedSource(source.sourceName)) {
          current.hasTrustedSource = true;
        }
        sourcesByEvent.set(source.eventId, current);
      }

      const refRows = await db.execute<{
        eventId: string;
        triggerType: string | null;
        category: string | null;
        leaderName: string | null;
        policyAction: string | null;
        confidenceRank: number;
      }>(sql`
        select distinct on (event_id)
          event_id as "eventId",
          trigger_type as "triggerType",
          category as "category",
          leader_name as "leaderName",
          policy_action as "policyAction",
          (
            case confidence_score
              when 'high' then 3
              when 'medium' then 2
              when 'low' then 1
              else 0
            end
          )::int as "confidenceRank"
        from event_commodity_refs
        where commodity = ${commodity}
          and event_id in (${sql.join(
            eventIds.map((id) => sql`${id}`),
            sql`, `,
          )})
        order by
          event_id,
          (
            case confidence_score
              when 'high' then 3
              when 'medium' then 2
              when 'low' then 1
              else 0
            end
          ) desc,
          created_at desc
      `);

      for (const row of refRows) {
        refsByEvent.set(row.eventId, {
          triggerType: row.triggerType,
          category: row.category,
          leaderName: row.leaderName,
          policyAction: row.policyAction,
          referenceConfidence: confidenceFromRank(row.confidenceRank),
        });
      }
    }

    return {
      commodity,
      insights: rows.map((r) => {
        const verification = sourcesByEvent.get(r.eventId) ?? {
          sourceCount: 0,
          hasTrustedSource: false,
        };
        const ref = refsByEvent.get(r.eventId) ?? {
          triggerType: null,
          category: null,
          leaderName: null,
          policyAction: null,
          referenceConfidence: null,
        };
        const eventConfidence = r.eventConfidence;
        const referenceConfidence = ref.referenceConfidence;
        const isStrictlyVerified = isStrictlyVerifiedSignal({
          eventConfidence,
          referenceConfidence,
          hasTrustedSource: verification.hasTrustedSource,
        });

        return {
          id: r.id,
          eventId: r.eventId,
          eventTitle: r.eventTitle,
          eventType: r.eventType,
          country: r.country,
          triggerType: ref.triggerType,
          category: ref.category,
          leaderName: ref.leaderName,
          policyAction: ref.policyAction,
          windowHours: r.windowHours,
          eventTimestamp: r.eventTimestamp.toISOString(),
          priceBefore: r.priceBefore,
          priceAfter: r.priceAfter,
          absoluteChange: r.absoluteChange,
          percentChange: r.percentChange,
          impactScore: r.impactScore,
          sourceCount: verification.sourceCount,
          hasTrustedSource: verification.hasTrustedSource,
          eventConfidence,
          referenceConfidence,
          isStrictlyVerified,
        };
      }),
    };
  })

  /**
   * GET /commodities/forecast/:commodity?hours=168
   * Returns strict-verified forecast signals for 1h and 24h horizons.
   */
  .get("/forecast/:commodity", async ({ params, query }) => {
    const commodity = params.commodity as "gold" | "silver" | "oil";
    if (!schema.commodityNameEnum.enumValues.includes(commodity)) {
      return { error: "Unsupported commodity" };
    }

    const hours = Math.max(
      24,
      Math.min(parseInt(query.hours ?? "168", 10), 24 * 30),
    );
    const forecast = await computeCommodityForecast({
      commodity,
      historyHours: hours,
    });

    return toCommodityForecastApiResponse({ commodity, forecast });
  })

  /**
   * GET /commodities/alerts
   * Returns latest generated commodity alerts.
   */
  .get("/alerts", async ({ query }) => {
    const commodity = query.commodity as "gold" | "silver" | "oil" | undefined;
    const limit = Math.max(1, Math.min(parseInt(query.limit ?? "50", 10), 200));

    const rows = await db
      .select()
      .from(schema.commodityAlerts)
      .where(
        commodity ? eq(schema.commodityAlerts.commodity, commodity) : undefined,
      )
      .orderBy(desc(schema.commodityAlerts.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  })

  /**
   * POST /commodities/webhooks
   * Register a webhook target for commodity alerts.
   */
  .post(
    "/webhooks",
    async ({ body }) => {
      const [created] = await db
        .insert(schema.commodityWebhooks)
        .values({
          name: body.name,
          url: body.url,
          secret: body.secret || null,
          enabled: body.enabled ? 1 : 0,
        })
        .onConflictDoUpdate({
          target: schema.commodityWebhooks.url,
          set: {
            name: body.name,
            secret: body.secret || null,
            enabled: body.enabled ? 1 : 0,
          },
        })
        .returning();

      return {
        id: created.id,
        name: created.name,
        url: created.url,
        enabled: created.enabled === 1,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        url: t.String({ format: "uri" }),
        secret: t.Optional(t.String()),
        enabled: t.Optional(t.Boolean()),
      }),
    },
  )

  /**
   * POST /commodities/alerts/:id/dispatch
   * Dispatches an alert payload to all enabled webhooks.
   */
  .post("/alerts/:id/dispatch", async ({ params }) => {
    const [alert] = await db
      .select()
      .from(schema.commodityAlerts)
      .where(eq(schema.commodityAlerts.id, params.id))
      .limit(1);

    if (!alert) return { error: "Alert not found" };

    const hooks = await db
      .select()
      .from(schema.commodityWebhooks)
      .where(eq(schema.commodityWebhooks.enabled, 1));

    if (hooks.length === 0) {
      return { dispatched: 0, failed: 0, note: "No enabled webhooks" };
    }

    const payload = {
      id: alert.id,
      commodity: alert.commodity,
      title: alert.title,
      cause: alert.cause,
      level: alert.level,
      priceChangePercent: alert.priceChangePercent,
      impactScore: alert.impactScore,
      createdAt: alert.createdAt.toISOString(),
    };

    let dispatched = 0;
    let failed = 0;

    for (const hook of hooks) {
      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(hook.secret
              ? { "x-conflictscope-signature": hook.secret }
              : {}),
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) dispatched++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return {
      dispatched,
      failed,
      payload,
    };
  })

  /**
   * GET /commodities/overview
   * Aggregated panel data for the new geopolitical commodity insight widget.
   */
  .get("/overview", async () => {
    const latestPrices = await db.execute(sql`
      SELECT DISTINCT ON (commodity)
        commodity,
        price,
        currency,
        timestamp,
        source
      FROM commodities
      ORDER BY commodity, timestamp DESC
    `);

    const topImpacts = await db
      .select({
        commodity: schema.commodityCorrelations.commodity,
        impactScore: schema.commodityCorrelations.impactScore,
        percentChange: schema.commodityCorrelations.percentChange,
        eventTitle: schema.events.title,
      })
      .from(schema.commodityCorrelations)
      .innerJoin(
        schema.events,
        eq(schema.events.id, schema.commodityCorrelations.eventId),
      )
      .orderBy(desc(schema.commodityCorrelations.impactScore))
      .limit(9);

    const latestAlerts = await db
      .select()
      .from(schema.commodityAlerts)
      .orderBy(desc(schema.commodityAlerts.createdAt))
      .limit(10);

    return {
      latestPrices: latestPrices as unknown,
      topImpacts,
      latestAlerts: latestAlerts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  });
