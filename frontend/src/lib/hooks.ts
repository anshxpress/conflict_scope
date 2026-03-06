import useSWR from "swr";
import { api } from "./api";
import type {
  EventsResponse,
  InfrastructureItem,
  StatsResponse,
  ConflictEvent,
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
