import type {
  EventsResponse,
  InfrastructureItem,
  StatsResponse,
  CountryStats,
  ConflictEvent,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_BASE = `${API_URL}/api/v1`;

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
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
};
