import type { CommodityName } from "../../../../db/schema";
import type { CommodityForecastResponse } from "../../../services/commodities/forecast-engine";

export interface CommodityForecastApiResponse {
  commodity: CommodityName;
  strictVerification: true;
  modelVersion: string;
  basePrice: number | null;
  baseTimestamp: string | null;
  horizons: Array<{
    windowHours: 1 | 24;
    direction: "up" | "down" | "neutral";
    confidencePercent: number;
    predictedPrice: number;
    predictedChangePercent: number;
    priceRangeMin: number;
    priceRangeMax: number;
    verifiedEventCount: number;
    signalStrength: number;
  }>;
}

export function toCommodityForecastApiResponse(params: {
  commodity: CommodityName;
  forecast: CommodityForecastResponse | null;
}): CommodityForecastApiResponse {
  if (!params.forecast) {
    return {
      commodity: params.commodity,
      strictVerification: true,
      modelVersion: "strict-impact-hybrid-v1",
      basePrice: null,
      baseTimestamp: null,
      horizons: [],
    };
  }

  return {
    commodity: params.forecast.commodity,
    strictVerification: true,
    modelVersion: params.forecast.modelVersion,
    basePrice: params.forecast.basePrice,
    baseTimestamp: params.forecast.baseTimestamp,
    horizons: params.forecast.horizons.map((h) => ({
      windowHours: h.windowHours,
      direction: h.direction,
      confidencePercent: h.confidencePercent,
      predictedPrice: h.predictedPrice,
      predictedChangePercent: h.predictedChangePercent,
      priceRangeMin: h.priceRangeMin,
      priceRangeMax: h.priceRangeMax,
      verifiedEventCount: h.verifiedEventCount,
      signalStrength: h.signalStrength,
    })),
  };
}
