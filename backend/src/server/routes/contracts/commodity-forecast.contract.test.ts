import { describe, expect, it } from "bun:test";
import { toCommodityForecastApiResponse } from "./commodity-forecast";

describe("commodity forecast endpoint contract", () => {
  it("returns stable fallback shape when forecast is unavailable", () => {
    const res = toCommodityForecastApiResponse({
      commodity: "oil",
      forecast: null,
    });

    expect(res).toEqual({
      commodity: "oil",
      strictVerification: true,
      modelVersion: "strict-impact-hybrid-v1",
      basePrice: null,
      baseTimestamp: null,
      horizons: [],
    });
  });

  it("maps full forecast payload to endpoint response contract", () => {
    const res = toCommodityForecastApiResponse({
      commodity: "gold",
      forecast: {
        commodity: "gold",
        strictVerification: true,
        modelVersion: "strict-impact-hybrid-v1",
        basePrice: 3012.25,
        baseTimestamp: "2026-03-14T12:00:00.000Z",
        horizons: [
          {
            windowHours: 1,
            direction: "up",
            confidencePercent: 61.4,
            predictedPrice: 3016.4,
            predictedChangePercent: 0.14,
            priceRangeMin: 3009.9,
            priceRangeMax: 3023.2,
            verifiedEventCount: 2,
            signalStrength: 0.44,
          },
          {
            windowHours: 24,
            direction: "down",
            confidencePercent: 58.9,
            predictedPrice: 2994.2,
            predictedChangePercent: -0.6,
            priceRangeMin: 2942.6,
            priceRangeMax: 3048.1,
            verifiedEventCount: 3,
            signalStrength: 0.81,
          },
        ],
      },
    });

    expect(res.commodity).toBe("gold");
    expect(res.strictVerification).toBe(true);
    expect(res.modelVersion).toBe("strict-impact-hybrid-v1");
    expect(typeof res.basePrice).toBe("number");
    expect(typeof res.baseTimestamp).toBe("string");
    expect(res.horizons).toHaveLength(2);

    for (const horizon of res.horizons) {
      expect([1, 24]).toContain(horizon.windowHours);
      expect(["up", "down", "neutral"]).toContain(horizon.direction);
      expect(typeof horizon.confidencePercent).toBe("number");
      expect(typeof horizon.predictedPrice).toBe("number");
      expect(typeof horizon.predictedChangePercent).toBe("number");
      expect(typeof horizon.priceRangeMin).toBe("number");
      expect(typeof horizon.priceRangeMax).toBe("number");
      expect(typeof horizon.verifiedEventCount).toBe("number");
      expect(typeof horizon.signalStrength).toBe("number");
    }
  });
});
