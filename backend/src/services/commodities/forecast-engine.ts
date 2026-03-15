import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db, schema } from "../../../db";
import type { CommodityName, ConfidenceLevel } from "../../../db/schema";
import { isTrustedSource } from "../verification/confidence";

type ForecastDirection = "up" | "down" | "neutral";

interface HorizonForecast {
  windowHours: 1 | 24;
  direction: ForecastDirection;
  confidencePercent: number;
  predictedPrice: number;
  predictedChangePercent: number;
  priceRangeMin: number;
  priceRangeMax: number;
  verifiedEventCount: number;
  signalStrength: number;
}

export interface CommodityForecastResponse {
  commodity: CommodityName;
  strictVerification: true;
  modelVersion: string;
  basePrice: number;
  baseTimestamp: string;
  horizons: HorizonForecast[];
}

const HORIZONS = [1, 24] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number): number {
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function linearSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const sumX = ((n - 1) * n) / 2;
  const sumY = values.reduce((s, y) => s + y, 0);
  const sumXY = values.reduce((s, y, x) => s + x * y, 0);
  const sumXX = values.reduce((s, _, x) => s + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function hasMinConfidence(c: ConfidenceLevel | null): boolean {
  return c === "medium" || c === "high";
}

export function isStrictlyVerifiedSignal(input: {
  eventConfidence: ConfidenceLevel | null;
  referenceConfidence: ConfidenceLevel | null;
  hasTrustedSource: boolean;
}): boolean {
  return (
    hasMinConfidence(input.eventConfidence) &&
    hasMinConfidence(input.referenceConfidence) &&
    input.hasTrustedSource
  );
}

export async function computeCommodityForecast(params: {
  commodity: CommodityName;
  historyHours?: number;
}): Promise<CommodityForecastResponse | null> {
  const historyHours = Math.max(24, Math.min(params.historyHours ?? 24 * 7, 24 * 30));
  const since = new Date(Date.now() - historyHours * 60 * 60 * 1000);

  const priceRows = await db
    .select({
      price: schema.commodities.price,
      timestamp: schema.commodities.timestamp,
    })
    .from(schema.commodities)
    .where(
      and(
        eq(schema.commodities.commodity, params.commodity),
        gte(schema.commodities.timestamp, since)
      )
    )
    .orderBy(schema.commodities.timestamp);

  if (priceRows.length < 3) return null;

  const latest = priceRows[priceRows.length - 1];
  const latestPrice = latest.price;
  const priceValues = priceRows.map((r) => r.price);

  const returns = priceValues
    .slice(1)
    .map((v, i) => (priceValues[i] === 0 ? 0 : ((v - priceValues[i]) / priceValues[i]) * 100));
  const volatilityPct = stddev(returns);

  const avgStepMinutes =
    mean(
      priceRows
        .slice(1)
        .map((r, i) => (r.timestamp.getTime() - priceRows[i].timestamp.getTime()) / 60000)
        .filter((m) => Number.isFinite(m) && m > 0)
    ) || 60;

  const slopePerStep = linearSlope(priceValues);
  const trendPctPerHour =
    latestPrice === 0 ? 0 : ((slopePerStep / latestPrice) * 100 * 60) / avgStepMinutes;

  const correlationsSince = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const corrRows = await db
    .select({
      eventId: schema.commodityCorrelations.eventId,
      windowHours: schema.commodityCorrelations.windowHours,
      percentChange: schema.commodityCorrelations.percentChange,
      impactScore: schema.commodityCorrelations.impactScore,
      eventTimestamp: schema.commodityCorrelations.eventTimestamp,
      eventConfidence: schema.events.confidenceScore,
      refConfidence: schema.eventCommodityRefs.confidenceScore,
    })
    .from(schema.commodityCorrelations)
    .innerJoin(schema.events, eq(schema.events.id, schema.commodityCorrelations.eventId))
    .leftJoin(
      schema.eventCommodityRefs,
      and(
        eq(schema.eventCommodityRefs.eventId, schema.commodityCorrelations.eventId),
        eq(schema.eventCommodityRefs.commodity, schema.commodityCorrelations.commodity)
      )
    )
    .where(
      and(
        eq(schema.commodityCorrelations.commodity, params.commodity),
        gte(schema.commodityCorrelations.computedAt, correlationsSince)
      )
    )
    .orderBy(desc(schema.commodityCorrelations.computedAt))
    .limit(200);

  const eventIds = [...new Set(corrRows.map((r) => r.eventId))];
  const trustedByEvent = new Map<string, boolean>();

  if (eventIds.length > 0) {
    const sourceRows = await db
      .select({
        eventId: schema.sources.eventId,
        sourceName: schema.sources.sourceName,
      })
      .from(schema.sources)
      .where(inArray(schema.sources.eventId, eventIds));

    for (const row of sourceRows) {
      const hasTrusted = trustedByEvent.get(row.eventId) ?? false;
      if (!hasTrusted && isTrustedSource(row.sourceName)) {
        trustedByEvent.set(row.eventId, true);
      }
      if (!trustedByEvent.has(row.eventId)) {
        trustedByEvent.set(row.eventId, false);
      }
    }
  }

  const horizons: HorizonForecast[] = HORIZONS.map((windowHours) => {
    const verifiedRows = corrRows.filter(
      (row) =>
        row.windowHours === windowHours &&
        row.percentChange != null &&
        isStrictlyVerifiedSignal({
          eventConfidence: row.eventConfidence,
          referenceConfidence: row.refConfidence,
          hasTrustedSource: trustedByEvent.get(row.eventId) === true,
        })
    );

    const weightedEventSignal = (() => {
      if (verifiedRows.length === 0) return 0;
      let weightedSum = 0;
      let totalWeight = 0;

      for (const row of verifiedRows) {
        const ageHours =
          (Date.now() - new Date(row.eventTimestamp).getTime()) / (60 * 60 * 1000);
        const recencyWeight = Math.exp(-Math.max(0, ageHours) / 24);
        const impactWeight = clamp((row.impactScore ?? 35) / 100, 0.1, 1.2);
        const weight = recencyWeight * impactWeight;
        weightedSum += (row.percentChange ?? 0) * weight;
        totalWeight += weight;
      }

      return totalWeight > 0 ? weightedSum / totalWeight : 0;
    })();

    const trendComponent = trendPctPerHour * windowHours;
    const predictedChangePercent = roundTo(
      weightedEventSignal * 0.7 + trendComponent * 0.3,
      3
    );
    const predictedPrice = roundTo(latestPrice * (1 + predictedChangePercent / 100), 4);

    const rangeHalfPct = Math.max(
      0.2,
      Math.abs(predictedChangePercent) * 0.35,
      volatilityPct * Math.sqrt(windowHours)
    );

    const confidencePercent = (() => {
      if (verifiedRows.length === 0) {
        const baseNoNews = 30 + Math.abs(trendComponent) * 8 - volatilityPct * 5;
        return roundTo(clamp(baseNoNews, 18, 55), 1);
      }
      const base =
        50 +
        verifiedRows.length * 5 +
        Math.abs(weightedEventSignal) * 4 +
        Math.abs(trendComponent) * 2 -
        volatilityPct * 6;
      return roundTo(clamp(base, 30, 92), 1);
    })();

    const direction: ForecastDirection =
      predictedChangePercent > 0.12
        ? "up"
        : predictedChangePercent < -0.12
          ? "down"
          : "neutral";

    return {
      windowHours,
      direction,
      confidencePercent,
      predictedPrice,
      predictedChangePercent,
      priceRangeMin: roundTo(predictedPrice * (1 - rangeHalfPct / 100), 4),
      priceRangeMax: roundTo(predictedPrice * (1 + rangeHalfPct / 100), 4),
      verifiedEventCount: verifiedRows.length,
      signalStrength: roundTo(clamp(Math.abs(weightedEventSignal), 0, 100), 3),
    };
  });

  return {
    commodity: params.commodity,
    strictVerification: true,
    modelVersion: "strict-impact-hybrid-v1",
    basePrice: latestPrice,
    baseTimestamp: latest.timestamp.toISOString(),
    horizons,
  };
}
