import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CommodityInsightsPanel from "./CommodityInsightsPanel";

vi.mock("@/lib/hooks", () => ({
  useCommodityPrices: () => ({
    data: {
      usdToInr: 83.5,
      gold: {
        price: 3045.2,
        currency: "USD/oz",
        timestamp: "2026-03-14T09:00:00.000Z",
        source: "mock",
      },
      silver: null,
      oil: null,
    },
  }),
  useCommodityHistory: () => ({
    data: {
      commodity: "gold",
      points: [
        { price: 3000, timestamp: "2026-03-14T01:00:00.000Z", source: "mock" },
        { price: 3010, timestamp: "2026-03-14T02:00:00.000Z", source: "mock" },
        { price: 3020, timestamp: "2026-03-14T03:00:00.000Z", source: "mock" },
      ],
    },
    isLoading: false,
  }),
  useCommodityInsights: () => ({
    data: {
      commodity: "gold",
      insights: [
        {
          id: "ins-1",
          eventId: "ev-1",
          eventTitle: "Refinery disruption in key shipping lane",
          eventType: "armed_conflict",
          country: "qatar",
          triggerType: "refinery_attack",
          category: "economic",
          leaderName: null,
          policyAction: null,
          windowHours: 24,
          eventTimestamp: "2026-03-14T02:30:00.000Z",
          priceBefore: 2995,
          priceAfter: 3021,
          absoluteChange: 26,
          percentChange: 0.86,
          impactScore: 71,
          sourceCount: 3,
          hasTrustedSource: true,
          eventConfidence: "high",
          referenceConfidence: "high",
          isStrictlyVerified: true,
        },
      ],
    },
    isLoading: false,
  }),
  useCommodityAlerts: () => ({ data: [] }),
  useCommodityForecast: () => ({
    data: {
      commodity: "gold",
      strictVerification: true,
      modelVersion: "strict-impact-hybrid-v1",
      basePrice: 3045.2,
      baseTimestamp: "2026-03-14T09:00:00.000Z",
      horizons: [
        {
          windowHours: 1,
          direction: "up",
          confidencePercent: 55.3,
          predictedPrice: 3049.4,
          predictedChangePercent: 0.14,
          priceRangeMin: 3038.1,
          priceRangeMax: 3060.1,
          verifiedEventCount: 1,
          signalStrength: 0.34,
        },
        {
          windowHours: 24,
          direction: "up",
          confidencePercent: 68.1,
          predictedPrice: 3071.2,
          predictedChangePercent: 0.85,
          priceRangeMin: 3032.4,
          priceRangeMax: 3111.8,
          verifiedEventCount: 2,
          signalStrength: 0.72,
        },
      ],
    },
    isLoading: false,
  }),
}));

describe("CommodityInsightsPanel", () => {
  it("renders strict verified prediction and badges", () => {
    render(
      <CommodityInsightsPanel commodity="gold" onClose={() => undefined} />,
    );

    expect(screen.getByText("Strict Verified Prediction")).toBeInTheDocument();
    expect(screen.getByText(/expected in\s*24\s*h/i)).toBeInTheDocument();
    expect(screen.getByText(/68\.1/)).toBeInTheDocument();
    expect(screen.getByText(/Verified Source/i)).toBeInTheDocument();
    expect(screen.getByText(/3 sources/i)).toBeInTheDocument();
  });

  it("switches forecast card between 24h and 1h horizons", () => {
    render(
      <CommodityInsightsPanel commodity="gold" onClose={() => undefined} />,
    );

    expect(screen.getByText(/expected in\s*24\s*h/i)).toBeInTheDocument();
    expect(screen.getByText(/68\.1/)).toBeInTheDocument();
    expect(screen.getByText(/Verified events:\s*2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /1h Forecast/i }));

    expect(screen.getByText(/expected in\s*1\s*h/i)).toBeInTheDocument();
    expect(screen.getByText(/55\.3/)).toBeInTheDocument();
    expect(screen.getByText(/Verified events:\s*1/i)).toBeInTheDocument();
  });
});
