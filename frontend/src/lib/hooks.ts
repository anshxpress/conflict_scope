import useSWR from "swr";
import { api } from "./api";
import type {
  EventsResponse,
  InfrastructureItem,
  StatsResponse,
  ConflictEvent,
  RiskMap,
  CountryRiskDetails,
  CommodityPrices,
  CountryResource,
  CommodityName,
  CommodityHistoryResponse,
  CommodityInsightsResponse,
  CommodityForecastResponse,
  CommodityAlert,
  CommodityOverview,
} from "@/types";

const REFRESH_INTERVAL = 60_000; // 1 minute auto-refresh

export function useEvents(params?: {
  country?: string;
  type?: string;
  from?: string;
  to?: string;
  confidence?: string;
}) {
  const key = ["events", JSON.stringify(params)];
  return useSWR<EventsResponse>(key, () => api.getEvents(params), {
    refreshInterval: REFRESH_INTERVAL,
    revalidateOnFocus: false,
  });
}

export function useInfrastructure(params?: {
  type?: string;
  country?: string;
}) {
  const key = ["infrastructure", JSON.stringify(params)];
  return useSWR<{ data: InfrastructureItem[] }>(
    key,
    () => api.getInfrastructure(params),
    {
      revalidateOnFocus: false,
    }
  );
}

export function useStats() {
  return useSWR<StatsResponse>("stats", () => api.getStats(), {
    refreshInterval: REFRESH_INTERVAL,
    revalidateOnFocus: false,
  });
}

export function useEvent(id: string | null) {
  return useSWR<ConflictEvent>(
    id ? ["event", id] : null,
    () => api.getEvent(id!),
    { revalidateOnFocus: false }
  );
}

/** Refreshes every 5 minutes — risk levels change slowly. */
export function useRiskMap() {
  return useSWR<RiskMap>("risk-map", () => api.getRiskMap(), {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });
}

/** Loads detail stats for a single country (shown in CountryRiskPanel). */
export function useCountryRisk(country: string | null) {
  return useSWR<CountryRiskDetails>(
    country ? ["country-risk", country] : null,
    () => api.getCountryRiskDetails(country!),
    { revalidateOnFocus: false }
  );
}

/** Fetches latest commodity prices — refreshes every 30 min. */
export function useCommodityPrices() {
  return useSWR<CommodityPrices>("commodity-prices", () => api.getCommodityPrices(), {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  });
}

/** Fetches all country→resource mappings — refreshes every hour. */
export function useResources() {
  return useSWR<CountryResource[]>("resources", () => api.getResources(), {
    refreshInterval: 60 * 60 * 1000,
    revalidateOnFocus: false,
  });
}

/** Commodity history for timeline overlay. */
export function useCommodityHistory(
  commodity: CommodityName | null,
  hours = 24 * 7
) {
  return useSWR<CommodityHistoryResponse>(
    commodity ? ["commodity-history", commodity, hours] : null,
    () => api.getCommodityHistory(commodity!, { hours }),
    {
      refreshInterval: 15 * 60 * 1000,
      revalidateOnFocus: false,
    }
  );
}

/** Event-linked commodity impact insights. */
export function useCommodityInsights(
  commodity: CommodityName | null,
  hours = 24 * 7
) {
  return useSWR<CommodityInsightsResponse>(
    commodity ? ["commodity-insights", commodity, hours] : null,
    () => api.getCommodityInsights({ commodity: commodity!, hours }),
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
    }
  );
}

/** Strict-verified forecast for commodity, optimized for panel prediction overlay. */
export function useCommodityForecast(
  commodity: CommodityName | null,
  hours = 24 * 7
) {
  return useSWR<CommodityForecastResponse>(
    commodity ? ["commodity-forecast", commodity, hours] : null,
    () => api.getCommodityForecast(commodity!, { hours }),
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
    }
  );
}

/** Generated commodity alerts. */
export function useCommodityAlerts(
  commodity?: CommodityName,
  limit = 50
) {
  return useSWR<CommodityAlert[]>(
    ["commodity-alerts", commodity ?? "all", limit],
    () => api.getCommodityAlerts({ commodity, limit }),
    {
      refreshInterval: 60 * 1000,
      revalidateOnFocus: false,
    }
  );
}

/** Aggregated widget payload for geopolitical commodity panel. */
export function useCommodityOverview() {
  return useSWR<CommodityOverview>(
    "commodity-overview",
    () => api.getCommodityOverview(),
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
    }
  );
}
