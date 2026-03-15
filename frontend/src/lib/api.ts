import type {
  EventsResponse,
  InfrastructureItem,
  StatsResponse,
  CountryStats,
  ConflictEvent,
  RiskMap,
  CountryRiskDetails,
  CommodityPrices,
  CountryResource,
  CommodityHistoryResponse,
  CommodityInsightsResponse,
  CommodityForecastResponse,
  CommodityAlert,
  CommodityName,
  CommodityWebhookRegistration,
  CommodityOverview,
} from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://conflictscope-api.onrender.com"
    : "http://localhost:3001");
const API_BASE = `${API_URL}/api/v1`;

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  /**
   * Fetch conflict events with optional filters.
   */
  getEvents(params?: {
    country?: string;
    type?: string;
    from?: string;
    to?: string;
    confidence?: string;
    limit?: number;
    offset?: number;
  }): Promise<EventsResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, String(value));
        }
      }
    }
    const qs = searchParams.toString();
    return fetchJSON(`/events${qs ? `?${qs}` : ""}`);
  },

  /**
   * Fetch a single event with its sources.
   */
  getEvent(id: string): Promise<ConflictEvent> {
    return fetchJSON(`/events/${encodeURIComponent(id)}`);
  },

  /**
   * Fetch infrastructure data.
   */
  getInfrastructure(params?: {
    type?: string;
    country?: string;
  }): Promise<{ data: InfrastructureItem[] }> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value) searchParams.set(key, value);
      }
    }
    const qs = searchParams.toString();
    return fetchJSON(`/infrastructure${qs ? `?${qs}` : ""}`);
  },

  /**
   * Fetch global conflict statistics.
   */
  getStats(): Promise<StatsResponse> {
    return fetchJSON("/stats");
  },

  /**
   * Fetch statistics for a specific country.
   */
  getCountryStats(country: string): Promise<CountryStats> {
    return fetchJSON(`/stats/${encodeURIComponent(country)}`);
  },

  /**
   * Fetch country → risk-level map for the choropleth map layer.
   */
  getRiskMap(): Promise<RiskMap> {
    return fetchJSON("/risk-map");
  },

  /**
   * Fetch detailed risk stats for a single country (for CountryRiskPanel).
   */
  getCountryRiskDetails(country: string): Promise<CountryRiskDetails> {
    return fetchJSON(`/risk-map/country/${encodeURIComponent(country)}`);
  },

  /**
   * Fetch latest commodity prices (gold, silver, oil).
   */
  getCommodityPrices(): Promise<CommodityPrices> {
    return fetchJSON("/commodities/prices");
  },

  /**
   * Fetch all country→resource mappings.
   */
  getResources(): Promise<CountryResource[]> {
    return fetchJSON("/commodities/resources");
  },

  /**
   * Fetch resources for a specific country.
   */
  getCountryResources(country: string): Promise<{ country: string; resources: string[] }> {
    return fetchJSON(`/commodities/resources/${encodeURIComponent(country)}`);
  },

  /**
   * Fetch historical price points for a commodity.
   */
  getCommodityHistory(
    commodity: CommodityName,
    params?: { hours?: number }
  ): Promise<CommodityHistoryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.hours) searchParams.set("hours", String(params.hours));
    const qs = searchParams.toString();
    return fetchJSON(`/commodities/history/${encodeURIComponent(commodity)}${qs ? `?${qs}` : ""}`);
  },

  /**
   * Fetch event-linked commodity impact insights.
   */
  getCommodityInsights(params?: {
    commodity?: CommodityName;
    hours?: number;
  }): Promise<CommodityInsightsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.commodity) searchParams.set("commodity", params.commodity);
    if (params?.hours) searchParams.set("hours", String(params.hours));
    const qs = searchParams.toString();
    return fetchJSON(`/commodities/insights${qs ? `?${qs}` : ""}`);
  },

  /**
   * Fetch strict-verified forecast signals for a commodity.
   */
  getCommodityForecast(
    commodity: CommodityName,
    params?: { hours?: number }
  ): Promise<CommodityForecastResponse> {
    const searchParams = new URLSearchParams();
    if (params?.hours) searchParams.set("hours", String(params.hours));
    const qs = searchParams.toString();
    return fetchJSON(
      `/commodities/forecast/${encodeURIComponent(commodity)}${qs ? `?${qs}` : ""}`
    );
  },

  /**
   * Fetch generated commodity alerts.
   */
  getCommodityAlerts(params?: {
    commodity?: CommodityName;
    limit?: number;
  }): Promise<CommodityAlert[]> {
    const searchParams = new URLSearchParams();
    if (params?.commodity) searchParams.set("commodity", params.commodity);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return fetchJSON(`/commodities/alerts${qs ? `?${qs}` : ""}`);
  },

  /**
   * Fetch aggregated insight payload for dashboard cards.
   */
  getCommodityOverview(): Promise<CommodityOverview> {
    return fetchJSON("/commodities/overview");
  },

  /**
   * Register/update commodity alert webhook.
   */
  registerCommodityWebhook(body: {
    name: string;
    url: string;
    secret?: string;
    enabled?: boolean;
  }): Promise<CommodityWebhookRegistration> {
    return fetchJSON(`/commodities/webhooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  /**
   * Dispatch an alert to all enabled webhooks.
   */
  dispatchCommodityAlert(alertId: string): Promise<{
    dispatched: number;
    failed: number;
  }> {
    return fetchJSON(`/commodities/alerts/${encodeURIComponent(alertId)}/dispatch`, {
      method: "POST",
    });
  },
};
