"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useCallback } from "react";
import {
  useEvents,
  useInfrastructure,
  useStats,
  useRiskMap,
} from "@/lib/hooks";
import { api } from "@/lib/api";
import useSWR from "swr";
import FilterPanel from "@/components/dashboard/FilterPanel";
import EventDetailsPanel from "@/components/dashboard/EventDetailsPanel";
import InfrastructureLayerToggle from "@/components/dashboard/InfrastructureLayerToggle";
import ConflictStatsPanel from "@/components/dashboard/ConflictStatsPanel";
import LiveEventFeed from "@/components/dashboard/LiveEventFeed";
import CountryRiskPanel from "@/components/dashboard/CountryRiskPanel";
import NotificationBell from "@/components/dashboard/NotificationBell";
import TimelineSlider from "@/components/timeline/TimelineSlider";
import SmoothScroll from "@/components/SmoothScroll";
import type { ConflictEvent, InfrastructureType, RiskMap } from "@/types";

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-cs-dark">
      <div className="text-center space-y-3">
        <div className="inline-block w-10 h-10 border-2 border-cs-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500">Initializing map...</p>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  // â”€â”€ Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedConfidence, setSelectedConfidence] = useState("");

  // â”€â”€ Timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [timeRange, setTimeRange] = useState<[Date, Date] | null>(null);

  // â”€â”€ Map layer toggles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showEvents, setShowEvents] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showInfrastructure, setShowInfrastructure] = useState(false);
  const [activeInfraTypes, setActiveInfraTypes] = useState<
    Set<InfrastructureType>
  >(new Set(["airport", "power_plant"]));

  // â”€â”€ Sidebar state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [sidebarTab, setSidebarTab] = useState<"filters" | "stats" | "feed">(
    "feed",
  );
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(
    null,
  );
  // Country selected by clicking a polygon on the map
  const [selectedMapCountry, setSelectedMapCountry] = useState<string | null>(
    null,
  );
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // â”€â”€ Data fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filterParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (selectedCountry) p.country = selectedCountry;
    if (selectedType) p.type = selectedType;
    if (selectedConfidence) p.confidence = selectedConfidence;
    if (timeRange?.[0]) p.from = timeRange[0].toISOString();
    if (timeRange?.[1]) p.to = timeRange[1].toISOString();
    p.limit = "500";
    return p;
  }, [selectedCountry, selectedType, selectedConfidence, timeRange]);

  const { data: eventsData } = useEvents(filterParams);
  const { data: infraData } = useInfrastructure(
    showInfrastructure ? {} : undefined,
  );
  const { data: statsData } = useStats();
  const { data: countryStats } = useSWR(
    selectedCountry ? ["countryStats", selectedCountry] : null,
    () => api.getCountryStats(selectedCountry),
    { revalidateOnFocus: false },
  );
  const { data: riskMapData } = useRiskMap();

  const events = eventsData?.data ?? [];
  const infrastructure = infraData?.data ?? [];
  const riskMap: RiskMap = riskMapData ?? {};

  // Derive countries list
  const countries = useMemo(() => {
    if (!statsData) return [];
    return statsData.byCountry.map((c) => c.country).sort();
  }, [statsData]);

  // Filter infrastructure by active types
  const filteredInfra = useMemo(
    () =>
      showInfrastructure
        ? infrastructure.filter((i) => activeInfraTypes.has(i.type))
        : [],
    [infrastructure, showInfrastructure, activeInfraTypes],
  );

  // Initialize timeline range from events
  const timelineEvents = useMemo(
    () => eventsData?.data?.map((e) => ({ timestamp: e.timestamp })) ?? [],
    [eventsData],
  );

  const handleEventSelect = useCallback((ev: ConflictEvent) => {
    setSelectedEvent(ev);
    setSelectedMapCountry(null);
    setRightPanelOpen(true);
  }, []);

  const handleCountrySelect = useCallback((country: string) => {
    setSelectedMapCountry(country);
    setSelectedEvent(null);
    setRightPanelOpen(true);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedCountry("");
    setSelectedType("");
    setSelectedConfidence("");
    setTimeRange(null);
  }, []);

  const handleToggleInfraType = useCallback((type: InfrastructureType) => {
    setActiveInfraTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // Right panel shows either country details or event details
  const rightPanelVisible =
    rightPanelOpen && (selectedEvent !== null || selectedMapCountry !== null);

  return (
    <div className="flex flex-col h-screen bg-cs-dark overflow-hidden">
      {/* â”€â”€ Top NavBar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="shrink-0 h-12 bg-cs-panel border-b border-cs-border flex items-center px-4 gap-4 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 relative">
            <div
              className="absolute inset-0 rounded-full bg-cs-accent/20 animate-ping"
              style={{ animationDuration: "3s" }}
            />
            <div className="relative w-6 h-6 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <circle cx="12" cy="12" r="3" fill="#ef4444" />
                <path
                  d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                />
                <path
                  d="M2 12h20M12 2v20"
                  stroke="#ef4444"
                  strokeWidth="0.75"
                  strokeOpacity="0.3"
                />
              </svg>
            </div>
          </div>
          <span className="text-sm font-bold tracking-wider text-gray-100">
            CONFLICT<span className="text-cs-accent">SCOPE</span>
          </span>
        </div>

        <div className="h-4 w-px bg-cs-border" />

        <span className="text-xs text-gray-500">
          Open Global Conflict Intelligence Dashboard
        </span>

        {/* Badges: event count + active hot-zone count */}
        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />
          <div className="h-4 w-px bg-cs-border" />
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
            <span className="text-xs text-gray-500">Live</span>
          </div>
          {statsData && (
            <div className="text-xs text-gray-500">
              <span className="text-gray-300 font-mono font-bold">
                {statsData.totalEvents.toLocaleString()}
              </span>{" "}
              events tracked
            </div>
          )}
          {riskMapData && (
            <div className="text-xs text-gray-500">
              <span className="text-red-400 font-mono font-bold">
                {Object.values(riskMapData).filter((v) => v === "red").length}
              </span>{" "}
              active hot zones
            </div>
          )}
        </div>
      </header>

      {/* â”€â”€ Main Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* â”€â”€ Left Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div
          className={`relative shrink-0 flex flex-col transition-all duration-300 bg-cs-panel border-r border-cs-border z-40 ${
            leftPanelOpen ? "w-72" : "w-0"
          } overflow-hidden`}
        >
          <SmoothScroll className="w-72 flex flex-col h-full overflow-y-auto p-3 gap-3">
            {/* Sidebar tabs */}
            <div className="flex bg-cs-dark rounded-lg p-0.5 shrink-0">
              {(["feed", "filters", "stats"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={`flex-1 text-xs py-1.5 rounded-md capitalize transition-colors ${
                    sidebarTab === tab
                      ? "bg-cs-panel text-gray-200"
                      : "text-gray-500 hover:text-gray-400"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {sidebarTab === "feed" && (
              <LiveEventFeed
                events={events}
                onEventSelect={handleEventSelect}
                selectedEventId={selectedEvent?.id ?? null}
              />
            )}

            {sidebarTab === "filters" && (
              <>
                <FilterPanel
                  selectedCountry={selectedCountry}
                  selectedType={selectedType}
                  selectedConfidence={selectedConfidence}
                  countries={countries}
                  onCountryChange={setSelectedCountry}
                  onTypeChange={setSelectedType}
                  onConfidenceChange={setSelectedConfidence}
                  onReset={handleResetFilters}
                />
                <InfrastructureLayerToggle
                  showInfrastructure={showInfrastructure}
                  showHeatmap={showHeatmap}
                  showEvents={showEvents}
                  onToggleInfrastructure={() =>
                    setShowInfrastructure((v) => !v)
                  }
                  onToggleHeatmap={() => setShowHeatmap((v) => !v)}
                  onToggleEvents={() => setShowEvents((v) => !v)}
                  activeInfraTypes={activeInfraTypes}
                  onToggleInfraType={handleToggleInfraType}
                />
              </>
            )}

            {sidebarTab === "stats" && (
              <ConflictStatsPanel
                stats={statsData}
                countryStats={countryStats}
                selectedCountry={selectedCountry}
              />
            )}
          </SmoothScroll>
        </div>

        {/* Left panel toggle button */}
        <button
          onClick={() => setLeftPanelOpen((v) => !v)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-cs-panel border border-cs-border border-l-0 px-1 py-3 rounded-r text-gray-500 hover:text-gray-300 transition-colors"
          style={{
            left: leftPanelOpen ? "288px" : "0px",
            transition: "left 300ms",
          }}
          aria-label="Toggle left panel"
        >
          <svg
            className={`w-3 h-3 transition-transform ${leftPanelOpen ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* â”€â”€ Map Area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Map itself */}
          <div className="flex-1 relative">
            <MapView
              events={showEvents ? events : []}
              infrastructure={filteredInfra}
              showHeatmap={showHeatmap}
              showInfrastructure={showInfrastructure}
              selectedEvent={selectedEvent}
              onEventSelect={handleEventSelect}
              riskMap={riskMap}
              onCountrySelect={handleCountrySelect}
            />

            {/* Map legend overlay - risk colours + event types */}
            <div className="absolute bottom-8 left-4 bg-cs-panel/90 border border-cs-border rounded-lg p-3 text-[10px] text-gray-400 z-[1000] backdrop-blur-sm space-y-3">
              {/* Country risk legend */}
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                  Country Risk
                </div>
                <div className="space-y-1">
                  {[
                    { color: "#ef4444", label: "Events <= 14 days" },
                    { color: "#f97316", label: "Events 15-30 days" },
                    {
                      color: "#22c55e",
                      opacity: 0.3,
                      label: "No recent events",
                    },
                  ].map(({ color, label, opacity }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ background: color, opacity: opacity ?? 0.5 }}
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event marker legend */}
              <div className="border-t border-cs-border pt-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                  Event Markers
                </div>
                <div className="space-y-1">
                  {[
                    { color: "#ef4444", label: "Airstrike" },
                    { color: "#f97316", label: "Missile Strike" },
                    { color: "#eab308", label: "Explosion" },
                    { color: "#a855f7", label: "Drone Strike" },
                    { color: "#f59e0b", label: "Infra Attack" },
                    { color: "#dc2626", label: "Armed Conflict" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: color }}
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                  {showInfrastructure && (
                    <div className="flex items-center gap-2 border-t border-cs-border pt-1 mt-1">
                      <span className="w-2 h-2 rounded-full shrink-0 bg-cs-blue" />
                      <span>Infrastructure</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="shrink-0 px-4 py-3 border-t border-cs-border bg-cs-panel/80 z-30">
            <TimelineSlider
              events={timelineEvents}
              value={
                timeRange ?? [
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  new Date(),
                ]
              }
              onChange={setTimeRange}
            />
          </div>
        </div>

        {/* â”€â”€ Right Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div
          className={`shrink-0 transition-all duration-300 bg-cs-panel border-l border-cs-border z-40 overflow-hidden ${
            rightPanelVisible ? "w-80" : "w-0"
          }`}
        >
          <SmoothScroll className="w-80 h-full overflow-y-auto">
            {selectedMapCountry && (
              <CountryRiskPanel
                country={selectedMapCountry}
                onClose={() => {
                  setSelectedMapCountry(null);
                  setRightPanelOpen(false);
                }}
              />
            )}
            {selectedEvent && !selectedMapCountry && (
              <div className="p-3 h-full">
                <EventDetailsPanel
                  event={selectedEvent}
                  onClose={() => {
                    setSelectedEvent(null);
                    setRightPanelOpen(false);
                  }}
                />
              </div>
            )}
          </SmoothScroll>
        </div>
      </div>
    </div>
  );
}
