import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "../../../db";
import type { CommodityName, ImpactSeverity } from "../../../db/schema";
import type { CommodityImpactMatch } from "./impact-mapping";

const WINDOWS_HOURS = [1, 6, 24] as const;

const SEVERITY_WEIGHTS: Record<ImpactSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const COMMODITY_WEIGHTS: Record<CommodityName, number> = {
  gold: 1.2,
  silver: 1.0,
  oil: 1.4,
};

function roundTo(value: number, decimals: number): number {
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
}

function computeSeverityFactor(
  impacts: Array<{ severity: ImpactSeverity }>,
): number {
  if (impacts.length === 0) return 1;
  const total = impacts.reduce(
    (acc, i) => acc + SEVERITY_WEIGHTS[i.severity],
    0,
  );
  return total / impacts.length;
}

function computeImpactScore(params: {
  severityFactor: number;
  commodityWeight: number;
  priceChangePercent: number;
}): { score: number; priceChangeFactor: number; marketReaction: number } {
  const marketReaction = Math.abs(params.priceChangePercent);
  const priceChangeFactor = Math.min(10, 1 + marketReaction / 2);
  const raw =
    params.severityFactor * params.commodityWeight * priceChangeFactor;
  const score = Math.min(100, roundTo(raw * 8, 2));
  return { score, priceChangeFactor, marketReaction };
}

async function findPriceBefore(
  commodity: CommodityName,
  eventTs: Date,
  windowHours: number,
) {
  const floor = new Date(eventTs.getTime() - windowHours * 60 * 60 * 1000);
  const [row] = await db
    .select()
    .from(schema.commodities)
    .where(
      and(
        eq(schema.commodities.commodity, commodity),
        lte(schema.commodities.timestamp, eventTs),
        gte(schema.commodities.timestamp, floor),
      ),
    )
    .orderBy(desc(schema.commodities.timestamp))
    .limit(1);
  return row;
}

async function findPriceAfter(
  commodity: CommodityName,
  eventTs: Date,
  windowHours: number,
) {
  const ceil = new Date(eventTs.getTime() + windowHours * 60 * 60 * 1000);
  const [row] = await db
    .select()
    .from(schema.commodities)
    .where(
      and(
        eq(schema.commodities.commodity, commodity),
        gte(schema.commodities.timestamp, eventTs),
        lte(schema.commodities.timestamp, ceil),
      ),
    )
    .orderBy(asc(schema.commodities.timestamp))
    .limit(1);
  return row;
}

async function createAlertIfNeeded(params: {
  eventId: string;
  commodity: CommodityName;
  windowHours: number;
  triggerType: string;
  priceChangePercent: number;
  impactScore: number;
}) {
  const pct = roundTo(params.priceChangePercent, 2);
  if (Math.abs(pct) < 2 && params.impactScore < 60) return;

  const direction = pct >= 0 ? "spike" : "drop";
  const level =
    params.impactScore >= 75 || Math.abs(pct) >= 4 ? "critical" : "warning";
  const title = `${params.commodity.toUpperCase()} ${params.windowHours}h market movement alert`;

  const [existingAlert] = await db
    .select({ id: schema.commodityAlerts.id })
    .from(schema.commodityAlerts)
    .where(
      and(
        eq(schema.commodityAlerts.eventId, params.eventId),
        eq(schema.commodityAlerts.commodity, params.commodity),
        eq(schema.commodityAlerts.title, title),
      ),
    )
    .limit(1);

  if (existingAlert) return;

  await db.insert(schema.commodityAlerts).values({
    eventId: params.eventId,
    commodity: params.commodity,
    title,
    cause: `${params.triggerType.replace(/_/g, " ")} (${params.windowHours}h) caused ${direction} of ${pct}%`,
    level,
    priceChangePercent: pct,
    impactScore: params.impactScore,
  });
}

export async function computeCommodityCorrelations(input: {
  eventId: string;
  eventTimestamp: Date;
  impacts: Array<{ severity: ImpactSeverity }>;
  matches: CommodityImpactMatch[];
}): Promise<void> {
  if (input.matches.length === 0) return;

  const severityFactor = computeSeverityFactor(input.impacts);

  for (const match of input.matches) {
    for (const windowHours of WINDOWS_HOURS) {
      const [before, after] = await Promise.all([
        findPriceBefore(match.commodity, input.eventTimestamp, windowHours),
        findPriceAfter(match.commodity, input.eventTimestamp, windowHours),
      ]);

      if (!before || !after) continue;

      const absoluteChange = after.price - before.price;
      const percentChange =
        before.price === 0 ? 0 : (absoluteChange / before.price) * 100;
      const commodityWeight = COMMODITY_WEIGHTS[match.commodity];
      const score = computeImpactScore({
        severityFactor,
        commodityWeight,
        priceChangePercent: percentChange,
      });

      await db
        .insert(schema.commodityCorrelations)
        .values({
          eventId: input.eventId,
          commodity: match.commodity,
          windowHours,
          eventTimestamp: input.eventTimestamp,
          priceBefore: roundTo(before.price, 4),
          priceAfter: roundTo(after.price, 4),
          absoluteChange: roundTo(absoluteChange, 4),
          percentChange: roundTo(percentChange, 4),
          marketReaction: roundTo(score.marketReaction, 4),
          severityFactor: roundTo(severityFactor, 4),
          commodityWeight,
          priceChangeFactor: roundTo(score.priceChangeFactor, 4),
          impactScore: score.score,
          source: `${before.source}->${after.source}`,
        })
        .onConflictDoUpdate({
          target: [
            schema.commodityCorrelations.eventId,
            schema.commodityCorrelations.commodity,
            schema.commodityCorrelations.windowHours,
          ],
          set: {
            eventTimestamp: input.eventTimestamp,
            priceBefore: roundTo(before.price, 4),
            priceAfter: roundTo(after.price, 4),
            absoluteChange: roundTo(absoluteChange, 4),
            percentChange: roundTo(percentChange, 4),
            marketReaction: roundTo(score.marketReaction, 4),
            severityFactor: roundTo(severityFactor, 4),
            commodityWeight,
            priceChangeFactor: roundTo(score.priceChangeFactor, 4),
            impactScore: score.score,
            source: `${before.source}->${after.source}`,
            computedAt: new Date(),
          },
        });

      await createAlertIfNeeded({
        eventId: input.eventId,
        commodity: match.commodity,
        windowHours,
        triggerType: match.triggerType,
        priceChangePercent: percentChange,
        impactScore: score.score,
      });
    }
  }
}
