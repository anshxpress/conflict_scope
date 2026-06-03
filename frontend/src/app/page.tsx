"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  useEvents,
  useInfrastructure,
  useStats,
  useRiskMap,
  useResources,
} from "@/lib/hooks";
import { api } from "@/lib/api";
import useSWR from "swr";
import FilterPanel from "@/components/dashboard/FilterPanel";
import EventDetailsPanel from "@/components/dashboard/EventDetailsPanel";
import ArticleDetailsPanel from "@/components/dashboard/ArticleDetailsPanel";
import CitySelectorModal from "@/components/dashboard/CitySelectorModal";
import InfrastructureLayerToggle from "@/components/dashboard/InfrastructureLayerToggle";
import ConflictStatsPanel from "@/components/dashboard/ConflictStatsPanel";
import LiveEventFeed from "@/components/dashboard/LiveEventFeed";
import CountryRiskPanel from "@/components/dashboard/CountryRiskPanel";
import NotificationBell from "@/components/dashboard/NotificationBell";
import UpdatesPanel from "@/components/dashboard/UpdatesPanel";
import CommodityPanel from "@/components/dashboard/CommodityPanel";
import CommodityInsightsPanel from "@/components/dashboard/CommodityInsightsPanel";
import SmoothScroll from "@/components/SmoothScroll";
import type {
  ConflictEvent,
  InfrastructureType,
  RiskMap,
  CommodityName,
} from "@/types";

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

const WarMediaPanel = dynamic(
  () => import("@/components/media/WarMediaPanel"),
  { ssr: false },
);

const TimelineSlider = dynamic(
  () => import("@/components/timeline/TimelineSlider"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-cs-panel border border-cs-border rounded-lg px-4 py-3 text-xs text-gray-500">
        Initializing timeline...
      </div>
    ),
  },
);

const ALL_FEED_CATEGORIES = [
  "Politics", "Economy", "Jobs", "Technology", "Health", "Education",
  "Markets", "Transport", "Weather", "Safety", "Local", "International",
  "Government", "Tax", "Fuel", "Banking", "Housing", "Utilities", "Infrastructure",
] as const;
type FeedCategory = (typeof ALL_FEED_CATEGORIES)[number];

export default function DashboardPage() {
  // ── Tab State ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"map" | "home" | "foryou" | "city" | "state" | "india" | "world">("map");
  const [indiaFeedOpen, setIndiaFeedOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string | null>(null);

  // ── Category multi-select filter (all checked by default) ──
  const [selectedCategories, setSelectedCategories] = useState<Set<FeedCategory>>(
    new Set(ALL_FEED_CATEGORIES)
  );

  const toggleCategory = (cat: FeedCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      if (typeof window !== "undefined") {
        localStorage.setItem("preferred-categories", JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const handleCategoryTabSelect = (cat: string | null) => {
    setActiveCategoryTab(cat);
    if (typeof window !== "undefined") {
      if (cat) {
        localStorage.setItem("active-category-tab", cat);
      } else {
        localStorage.removeItem("active-category-tab");
      }
    }
  };

  const allCatsSelected = selectedCategories.size === ALL_FEED_CATEGORIES.length;

  // ── Personalized Location Engine ────────────────────────
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [cityModalOpen, setCityModalOpen] = useState(false);

  // ── Read History Recommendation Tracking ────────────────
  const [readIds, setReadIds] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCity = localStorage.getItem("user-city");
      const savedState = localStorage.getItem("user-state");
      if (savedCity && savedState) {
        setSelectedCity(savedCity);
        setSelectedState(savedState);
      } else {
        // Trigger modal for new users
        setCityModalOpen(true);
      }
      setReadIds(localStorage.getItem("user-read-ids") || "");

      // Load preferred categories
      const savedCats = localStorage.getItem("preferred-categories");
      if (savedCats) {
        try {
          const parsed = JSON.parse(savedCats);
          setSelectedCategories(new Set(parsed));
        } catch (e) {
          // Ignore
        }
      }

      // Load active category tab
      const savedCatTab = localStorage.getItem("active-category-tab");
      if (savedCatTab) {
        setActiveCategoryTab(savedCatTab);
      }
    }
  }, []);

  const handleCitySelect = (city: string, state: string) => {
    setSelectedCity(city);
    setSelectedState(state);
    if (typeof window !== "undefined") {
      localStorage.setItem("user-city", city);
      localStorage.setItem("user-state", state);
    }
  };

  const handleArticleRead = (id: string) => {
    if (typeof window === "undefined") return;
    const current = localStorage.getItem("user-read-ids") || "";
    const ids = current.split(",").filter((i) => i.length > 0);
    if (!ids.includes(id)) {
      ids.push(id);
      const newStr = ids.join(",");
      localStorage.setItem("user-read-ids", newStr);
      setReadIds(newStr);
    }
  };

  // ── Filters ───────────────────────────────────────────
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedConfidence, setSelectedConfidence] = useState("");

  // ── Timeline ──────────────────────────────────────────
  const [timeRange, setTimeRange] = useState<[Date, Date]>(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return [start, now];
  });

  // ── Map layer toggles ──────────────────────────────────
  const [showEvents, setShowEvents] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showInfrastructure, setShowInfrastructure] = useState(false);
  const [activeInfraTypes, setActiveInfraTypes] = useState<
    Set<InfrastructureType>
  >(new Set(["airport", "power_plant"]));

  // ── Sidebar state ──────────────────────────────────────
  const [sidebarTab, setSidebarTab] = useState<"filters" | "stats" | "feed">(
    "feed",
  );
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(
    null,
  );
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  // Country selected by clicking a polygon on the map
  const [selectedMapCountry, setSelectedMapCountry] = useState<string | null>(
    null,
  );
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [warPanelOpen, setWarPanelOpen] = useState(false);
  
  // Selected commodity opens right panel with full analysis
  const [selectedCommodity, setSelectedCommodity] =
    useState<CommodityName | null>(null);

  // ── Data fetching ──────────────────────────────────────
  const filterParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (selectedCountry) p.country = selectedCountry;
    if (selectedType) p.type = selectedType;
    if (selectedConfidence) p.confidence = selectedConfidence;
    p.from = timeRange[0].toISOString();
    p.to = timeRange[1].toISOString();
    p.limit = "500";
    return p;
  }, [selectedCountry, selectedType, selectedConfidence, timeRange]);

  // SWR for primary intelligence feeds
  const feedParams = useMemo(() => {
    const params: Record<string, string> = {
      limit: "50",
      minScore: "60",  // Importance threshold — only show articles scoring 60+
    };
    if (activeTab === "city" && selectedCity) {
      params.city = selectedCity;
      if (selectedState) params.state = selectedState;
    } else if (activeTab === "state" && selectedState) {
      params.state = selectedState;
    } else if (activeTab === "india") {
      params.country = "India";
    } else if (activeTab === "world") {
      params.country = "International";
    } else if (activeTab === "home") {
      if (selectedCity) params.city = selectedCity;
      if (selectedState) params.state = selectedState;
    }

    if (activeCategoryTab) {
      params.categories = activeCategoryTab;
    } else {
      if (activeTab === "home") {
        if (selectedCategories.size > 0 && selectedCategories.size < ALL_FEED_CATEGORIES.length) {
          params.preferredCategories = Array.from(selectedCategories).join(",");
        }
      } else {
        if (selectedCategories.size > 0 && selectedCategories.size < ALL_FEED_CATEGORIES.length) {
          params.categories = Array.from(selectedCategories).join(",");
        }
      }
    }
    return params;
  }, [activeTab, activeCategoryTab, selectedCity, selectedState, selectedCategories]);

  const {
    data: feedData,
    mutate: refreshFeed,
    isValidating: isFeedLoading,
  } = useSWR(
    indiaFeedOpen && activeTab !== "foryou" ? ["newsFeed", feedParams] : null,
    () => api.getNewsFeed(feedParams),
    { revalidateOnFocus: false, refreshInterval: 60000 }
  );

  const {
    data: recData,
    mutate: refreshRecs,
    isValidating: isRecsLoading,
  } = useSWR(
    indiaFeedOpen && activeTab === "foryou" ? ["recommendations", readIds] : null,
    () => api.getRecommendations(readIds),
    { revalidateOnFocus: false }
  );

  const {
    data: eventsData,
    mutate: refreshEvents,
    isValidating: isRefreshingEvents,
  } = useEvents(filterParams);
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
  const { data: resourcesData } = useResources();

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
    setSelectedArticle(null);
    setSelectedMapCountry(null);
    setSelectedCommodity(null);
    setRightPanelOpen(true);
  }, []);

  const handleCountrySelect = useCallback((country: string) => {
    setSelectedMapCountry(country);
    setSelectedEvent(null);
    setSelectedArticle(null);
    setSelectedCommodity(null);
    setRightPanelOpen(true);
  }, []);

  const handleCommoditySelect = useCallback((commodity: CommodityName) => {
    setSelectedCommodity((prev) => {
      if (prev === commodity) {
        setRightPanelOpen(false);
        return null;
      }
      setSelectedMapCountry(null);
      setSelectedEvent(null);
      setSelectedArticle(null);
      setRightPanelOpen(true);
      return commodity;
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedCountry("");
    setSelectedType("");
    setSelectedConfidence("");
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setTimeRange([start, now]);
  }, []);

  const handleToggleInfraType = useCallback((type: InfrastructureType) => {
    setActiveInfraTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const rightPanelVisible =
    rightPanelOpen &&
    (selectedEvent !== null ||
      selectedMapCountry !== null ||
      selectedCommodity !== null ||
      selectedArticle !== null);

  const feedTabs = [
    { id: "home", label: "Home Feed", icon: "🏠" },
    { id: "foryou", label: "For You", icon: "⭐" },
    { id: "city", label: "City Feed", icon: "🏙️" },
    { id: "state", label: "State Feed", icon: "🏛️" },
    { id: "india", label: "India National", icon: "🇮🇳" },
    { id: "world", label: "World", icon: "🌍" },
  ];

  const handleFeedTabSelect = (tabId: string) => {
    setActiveTab(tabId as any);
    setIndiaFeedOpen(true);
  };

  // ── Helpers for personalized India Feed ──
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    Politics:      { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20" },
    Economy:       { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    Jobs:          { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/20" },
    Technology:    { bg: "bg-violet-500/10", text: "text-violet-400",  border: "border-violet-500/20" },
    Health:        { bg: "bg-pink-500/10",   text: "text-pink-400",    border: "border-pink-500/20" },
    Education:     { bg: "bg-amber-500/10",  text: "text-amber-400",   border: "border-amber-500/20" },
    Markets:       { bg: "bg-teal-500/10",   text: "text-teal-400",    border: "border-teal-500/20" },
    Transport:     { bg: "bg-orange-500/10", text: "text-orange-400",  border: "border-orange-500/20" },
    Weather:       { bg: "bg-cyan-500/10",   text: "text-cyan-400",    border: "border-cyan-500/20" },
    Safety:        { bg: "bg-rose-500/10",   text: "text-rose-400",    border: "border-rose-500/20" },
    Local:         { bg: "bg-lime-500/10",   text: "text-lime-400",    border: "border-lime-500/20" },
    International: { bg: "bg-indigo-500/10", text: "text-indigo-400",  border: "border-indigo-500/20" },
    Government:    { bg: "bg-indigo-500/10",  text: "text-indigo-400",  border: "border-indigo-500/20" },
    Tax:           { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20" },
    Fuel:          { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/20" },
    Banking:       { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    Housing:       { bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/20" },
    Utilities:     { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/20" },
    Infrastructure: { bg: "bg-violet-500/10", text: "text-violet-400",  border: "border-violet-500/20" },
  };

  const getScope = (art: any): { label: string; icon: string; cls: string } => {
    if (selectedCity && art.city && art.city.toLowerCase() === selectedCity.toLowerCase())
      return { label: "Local", icon: "📍", cls: "text-lime-400 bg-lime-400/10 border-lime-400/20" };
    if (selectedState && art.state && art.state.toLowerCase().includes(selectedState.toLowerCase().slice(0, 4)))
      return { label: "State", icon: "🏛️", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
    if (art.country === "India" || activeTab === "india")
      return { label: "National", icon: "🇮🇳", cls: "text-orange-400 bg-orange-400/10 border-orange-400/20" };
    return { label: "World", icon: "🌍", cls: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" };
  };

  const FEED_TAB_LABELS: Record<string, string> = {
    home: selectedCity ? `${selectedCity}, ${selectedState}` : "Home",
    foryou: "Recommended for You",
    city: selectedCity || "City",
    state: selectedState || "State",
    india: "India National",
    world: "World",
  };

  return (
    <div className="flex flex-col h-screen bg-cs-dark overflow-hidden">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Visually hidden screen-reader and SEO text */}
      <div className="sr-only">
        <h1>ConflictScope – India Personalized Intelligence Feed</h1>
        <p>
          ConflictScope is a premium real-time geopolitical intelligence dashboard tracking city, state, national, and international updates.
        </p>
      </div>

      {/* ── Top NavBar ────────────────────────────────── */}
      <header className="shrink-0 h-12 bg-cs-panel border-b border-cs-border flex items-center px-4 gap-4 z-[9999]">
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
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-wider text-gray-100">
              CONFLICT<span className="text-cs-accent">SCOPE</span>
            </span>
            <a
              href="https://github.com/anshxpress"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-gray-500 transition opacity-0 hover:opacity-100"
              aria-label="Open GitHub profile"
            >
              @xa
            </a>
          </div>
        </div>

        <div className="h-4 w-px bg-cs-border" />

        <span className="text-xs text-gray-500">
          Open Global Conflict Intelligence Dashboard
        </span>

        {/* Badges: event count + active hot-zone count */}
        <div className="ml-auto flex items-center gap-3">
          <UpdatesPanel />
          <NotificationBell />
          {/* TV toggle */}
          <button
            onClick={() => setWarPanelOpen((v) => !v)}
            title="Open War Media TV"
            className="p-1 rounded hover:bg-cs-border/40"
          >
            <svg
              className="w-5 h-5 text-gray-300"
              viewBox="0 0 24 24"
              fill="none"
            >
              <rect
                x="3"
                y="6"
                width="18"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M8 3l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="h-4 w-px bg-cs-border" />
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
            <span className="text-xs text-gray-500">Live Pipeline</span>
          </div>
        </div>
      </header>

      {/* War Media Panel overlay */}
      <WarMediaPanel
        open={warPanelOpen}
        onClose={() => setWarPanelOpen(false)}
      />

      {/* City Selector Modal */}
      <CitySelectorModal
        isOpen={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        onSelect={handleCitySelect}
      />

      {/* ── Main Layout ────────────────────────────────── */}
      <main id="main-content" className="relative flex flex-1 overflow-hidden" tabIndex={-1}>
        {/* ── Left Sidebar (pinned) ── */}
        <div
          className={`relative shrink-0 flex flex-col transition-all duration-300 bg-cs-panel border-r border-cs-border z-40 ${
            leftPanelOpen ? "w-72" : "w-0"
          } overflow-hidden`}
        >
          <SmoothScroll className="w-72 flex flex-col flex-1 min-h-0 overflow-y-auto p-3 gap-3">
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
                onRefresh={refreshEvents}
                isRefreshing={isRefreshingEvents}
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

          {/* Commodity panel — pinned to bottom of sidebar */}
          <div className="w-72 shrink-0">
            <CommodityPanel
              onCommoditySelect={handleCommoditySelect}
              selectedCommodity={selectedCommodity}
            />
          </div>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* ── Dashboard Content Area ────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {/* Subheader: Nav bar with India Feed button */}
          <div className="flex items-center bg-cs-panel border-b border-cs-border shrink-0 p-2 gap-2 overflow-x-auto z-40">
            {/* Map view button */}
            <button
              onClick={() => { setActiveTab("map"); setIndiaFeedOpen(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === "map" && !indiaFeedOpen
                  ? "bg-cs-blue text-white shadow-md shadow-cs-blue/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-cs-border/40"
              }`}
            >
              <span>🗺️</span>
              <span>Geospatial Map</span>
            </button>

            {/* Preference News button — collapses all personalized feed views */}
            <button
              id="preference-news-toggle"
              onClick={() => {
                setIndiaFeedOpen((v) => !v);
                if (!indiaFeedOpen && activeTab === "map") setActiveTab("home");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                indiaFeedOpen
                  ? "bg-cs-blue text-white shadow-md shadow-cs-blue/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-cs-border/40"
              }`}
            >
              <span>🇮🇳</span>
              <span>Preference News</span>
              <svg
                className={`w-3 h-3 ml-0.5 transition-transform ${indiaFeedOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* City selector — right aligned */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCityModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cs-dark border border-cs-border hover:border-cs-blue/50 text-gray-300 hover:text-white transition-all"
              >
                <span>📍</span>
                <span>
                  {selectedCity ? `${selectedCity}, ${selectedState.slice(0, 3)}` : "Select City"}
                </span>
              </button>
            </div>
          </div>

          {/* India Feed: expandable tab row — shown only when indiaFeedOpen */}
          {indiaFeedOpen && (
            <div className="shrink-0 bg-cs-dark/80 border-b border-cs-border z-40">
              {/* Feed sub-tabs */}
              <div className="flex items-center p-2 gap-1.5 overflow-x-auto">
                {feedTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleFeedTabSelect(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      activeTab === tab.id
                        ? "bg-cs-blue/20 text-cs-blue border border-cs-blue/40"
                        : "text-gray-500 hover:text-gray-200 hover:bg-cs-border/30"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
              {/* ── Category Tabs (Horizontal Scrollable) ── */}
              <div className="flex items-center px-3 pb-2 gap-1.5 overflow-x-auto border-t border-cs-border/40 pt-2">
                <button
                  onClick={() => handleCategoryTabSelect(null)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 border ${
                    activeCategoryTab === null
                      ? "bg-cs-blue text-white border-cs-blue shadow-sm"
                      : "text-gray-400 hover:text-gray-200 border-cs-border/60 hover:border-cs-border bg-cs-dark/40"
                  }`}
                >
                  All Categories
                </button>
                {ALL_FEED_CATEGORIES.map((cat) => {
                  const isSelected = activeCategoryTab === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryTabSelect(isSelected ? null : cat)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 border ${
                        isSelected
                          ? "bg-cs-blue text-white border-cs-blue shadow-sm"
                          : "text-gray-400 hover:text-gray-200 border-cs-border/60 hover:border-cs-border bg-cs-dark/40"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
              {/* ── CATEGORIES checkbox filter bar ── */}
              <div className="border-t border-cs-border/60 px-3 py-2 bg-cs-dark/40">
                <div className="flex items-start gap-3">
                  {/* Label */}
                  <div className="flex flex-col items-start gap-1 shrink-0 pt-0.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-cs-accent">
                      [Categories]
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setSelectedCategories(new Set(ALL_FEED_CATEGORIES));
                          if (typeof window !== "undefined") {
                            localStorage.setItem("preferred-categories", JSON.stringify(ALL_FEED_CATEGORIES));
                          }
                        }}
                        className="text-[8px] font-bold uppercase tracking-wider text-gray-600 hover:text-cs-accent transition-colors"
                      >
                        All
                      </button>
                      <span className="text-[8px] text-gray-700">·</span>
                      <button
                        onClick={() => {
                          setSelectedCategories(new Set());
                          if (typeof window !== "undefined") {
                            localStorage.setItem("preferred-categories", JSON.stringify([]));
                          }
                        }}
                        className="text-[8px] font-bold uppercase tracking-wider text-gray-600 hover:text-cs-accent transition-colors"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  {/* Checkbox grid */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                    {ALL_FEED_CATEGORIES.map((cat) => (
                      <label
                        key={cat}
                        className="flex items-center gap-1.5 cursor-pointer group select-none"
                      >
                        <span
                          onClick={() => toggleCategory(cat)}
                          className={`flex items-center justify-center w-3.5 h-3.5 rounded-sm border transition-all shrink-0 ${
                            selectedCategories.has(cat)
                              ? "bg-cs-accent border-cs-accent"
                              : "border-cs-border bg-cs-dark/60 group-hover:border-cs-accent/50"
                          }`}
                        >
                          {selectedCategories.has(cat) && (
                            <svg className="w-2 h-2 text-white" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span
                          onClick={() => toggleCategory(cat)}
                          className={`text-[10px] font-semibold transition-colors ${
                            selectedCategories.has(cat)
                              ? "text-gray-200"
                              : "text-gray-600 group-hover:text-gray-400"
                          }`}
                        >
                          {cat}
                        </span>
                      </label>
                    ))}
                  </div>
                  {/* Active count badge */}
                  {!allCatsSelected && (
                    <span className="ml-auto shrink-0 text-[9px] font-bold text-cs-accent bg-cs-accent/10 border border-cs-accent/20 px-1.5 py-0.5 rounded">
                      {selectedCategories.size}/{ALL_FEED_CATEGORIES.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab content conditional display */}
          {activeTab === "map" && !indiaFeedOpen ? (
            /* 🗺️ GEOSPATIAL MAP VIEW TABS */
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
              <div className="flex-1 h-0 relative">
                <MapView
                  events={showEvents ? events : []}
                  infrastructure={filteredInfra}
                  showHeatmap={showHeatmap}
                  showInfrastructure={showInfrastructure}
                  selectedEvent={selectedEvent}
                  onEventSelect={handleEventSelect}
                  riskMap={riskMap}
                  onCountrySelect={handleCountrySelect}
                  selectedCountry={selectedMapCountry}
                  resources={resourcesData ?? []}
                />

                {/* Map legends */}
                <div className="absolute bottom-8 left-4 bg-cs-panel/90 border border-cs-border rounded-lg p-3 text-[10px] text-gray-400 z-[1000] backdrop-blur-sm space-y-3">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                      Country Risk
                    </div>
                    <div className="space-y-1">
                      {[
                        { color: "#ef4444", label: "Events <= 14 days" },
                        { color: "#f97316", label: "Events 15-30 days" },
                        { color: "#22c55e", opacity: 0.3, label: "No recent events" },
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Slider */}
              <div className="shrink-0 px-4 py-3 border-t border-cs-border bg-cs-panel/80 z-30">
                <TimelineSlider
                  events={timelineEvents}
                  value={timeRange}
                  onChange={setTimeRange}
                />
              </div>
            </div>
          ) : indiaFeedOpen ? (
            /* 📰 INDIA PERSONALIZED FEED */
            <div className="flex-1 overflow-y-auto bg-cs-dark">
              {isFeedLoading || isRecsLoading ? (
                /* Skeleton loader */
                <div className="p-6 space-y-4">
                  <div className="h-8 w-64 bg-cs-panel/60 rounded-lg animate-pulse" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1,2,3,4,5,6].map((i) => (
                      <div key={i} className="h-52 bg-cs-panel/60 border border-cs-border/40 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : activeTab === "foryou" && (!readIds || recData?.data?.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-xs mx-auto gap-3 py-16">
                  <div className="w-16 h-16 rounded-2xl bg-cs-panel border border-cs-border flex items-center justify-center text-3xl">⭐</div>
                  <h3 className="text-sm font-bold text-gray-200 tracking-wide">No Recommendations Yet</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Open and read a few articles. The engine will learn your interests and build a tailored feed.
                  </p>
                </div>
              ) : activeTab === "city" && !selectedCity ? (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-xs mx-auto gap-3 py-16">
                  <div className="w-16 h-16 rounded-2xl bg-cs-panel border border-cs-border flex items-center justify-center text-3xl">🏙️</div>
                  <h3 className="text-sm font-bold text-gray-200 tracking-wide">Select Your City</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">Choose a city to see hyperlocal news and updates for your district.</p>
                  <button
                    onClick={() => setCityModalOpen(true)}
                    className="mt-1 px-5 py-2 bg-cs-accent hover:bg-cs-accent/80 text-xs font-bold text-white rounded-lg transition-all shadow-lg shadow-cs-accent/20"
                  >
                    Pick City
                  </button>
                </div>
              ) : (() => {
                const rawArticles = (activeTab === "foryou" ? recData?.data : feedData?.data) || [];
                const filteredArticles = rawArticles.filter((art: any) => {
                  if (activeCategoryTab) {
                    return art.categories?.includes(activeCategoryTab) || art.category === activeCategoryTab;
                  }
                  return (
                    allCatsSelected ||
                    selectedCategories.size === 0 ||
                    art.categories?.some((c: string) => selectedCategories.has(c as FeedCategory))
                  );
                });
                const readSet = new Set(readIds.split(",").filter(Boolean));
                const scopeLabel = FEED_TAB_LABELS[activeTab] || "India";

                if (filteredArticles.length === 0) return (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20 gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-cs-panel border border-cs-border flex items-center justify-center text-3xl">📰</div>
                    <h3 className="text-sm font-bold text-gray-400 tracking-wide">No News Found</h3>
                    <p className="text-xs text-gray-600">
                      {selectedCategories.size === 0
                        ? "Select at least one category above."
                        : "No recent updates match your filters."}
                    </p>
                  </div>
                );

                const [featured, ...rest] = filteredArticles;

                return (
                  <div className="p-5 space-y-5">
                    {/* ── Personalized header bar ── */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 rounded-full bg-cs-accent" />
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-cs-accent">
                            {scopeLabel}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {filteredArticles.length} article{filteredArticles.length !== 1 ? "s" : ""}
                            {!allCatsSelected && ` · ${selectedCategories.size} categor${selectedCategories.size !== 1 ? "ies" : "y"}`}
                          </p>
                        </div>
                      </div>
                      {selectedCity && (
                        <button
                          onClick={() => setCityModalOpen(true)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cs-panel border border-cs-border hover:border-cs-accent/40 transition-all"
                        >
                          <span className="text-[10px]">📍</span>
                          <span className="text-[10px] font-semibold text-gray-400">
                            {selectedCity}
                            {selectedState && `, ${selectedState.slice(0, 2).toUpperCase()}`}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* ── Featured article (first, full-width) ── */}
                    {featured && (() => {
                      const scope = getScope(featured);
                      const isRead = readSet.has(featured.id);
                      const catKey = featured.categories?.[0] as string;
                      const cc = CAT_COLORS[catKey] ?? { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20" };
                      return (
                        <div
                          onClick={() => {
                            setSelectedArticle(featured);
                            setSelectedEvent(null);
                            setSelectedMapCountry(null);
                            setSelectedCommodity(null);
                            setRightPanelOpen(true);
                            handleArticleRead(featured.id);
                          }}
                          className={`relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 group ${
                            selectedArticle?.id === featured.id
                              ? "bg-cs-panel border-cs-accent ring-1 ring-cs-accent/30"
                              : isRead
                                ? "bg-cs-panel/40 border-cs-border/50 hover:border-cs-accent/30"
                                : "bg-cs-panel border-cs-border hover:border-cs-accent/40 shadow-lg"
                          }`}
                        >
                          {isRead && (
                            <div className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider text-gray-600 bg-cs-dark/60 px-1.5 py-0.5 rounded">Read</div>
                          )}
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {featured.categories?.slice(0, 3).map((cat: string) => {
                                  const c = CAT_COLORS[cat] ?? cc;
                                  return (
                                    <span key={cat} className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>
                                      {cat}
                                    </span>
                                  );
                                })}
                                {featured.importanceScore >= 90 && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border bg-red-500/15 text-red-400 border-red-500/30">🔴 Critical</span>
                                )}
                                {featured.importanceScore >= 75 && featured.importanceScore < 90 && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border bg-orange-500/15 text-orange-400 border-orange-500/30">🟠 High</span>
                                )}
                                {featured.importanceScore >= 60 && featured.importanceScore < 75 && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border bg-yellow-500/15 text-yellow-400 border-yellow-500/30">🟡 Notable</span>
                                )}
                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${scope.cls} ml-auto`}>
                                  {scope.icon} {scope.label}
                                </span>
                              </div>
                              <h2 className={`text-sm font-bold leading-snug transition-colors ${
                                isRead ? "text-gray-500" : "text-gray-100 group-hover:text-cs-accent"
                              }`}>
                                {featured.title}
                              </h2>
                              <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                {featured.description || featured.content || "Open for AI summary…"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-cs-border/50">
                            <span className="text-[9px] font-semibold text-gray-600 uppercase tracking-wider">{featured.source}</span>
                            <span className="text-[9px] text-gray-600">{timeAgo(featured.publishedAt)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Rest: responsive grid ── */}
                    {rest.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rest.map((art: any) => {
                          const scope = getScope(art);
                          const isRead = readSet.has(art.id);
                          const catKey = art.categories?.[0] as string;
                          const cc = CAT_COLORS[catKey] ?? { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20" };
                          return (
                            <div
                              key={art.id}
                              onClick={() => {
                                setSelectedArticle(art);
                                setSelectedEvent(null);
                                setSelectedMapCountry(null);
                                setSelectedCommodity(null);
                                setRightPanelOpen(true);
                                handleArticleRead(art.id);
                              }}
                              className={`relative cursor-pointer rounded-2xl border flex flex-col justify-between p-4 transition-all duration-200 group ${
                                selectedArticle?.id === art.id
                                  ? "bg-cs-panel border-cs-accent ring-1 ring-cs-accent/30"
                                  : isRead
                                    ? "bg-cs-panel/30 border-cs-border/40 hover:border-cs-accent/30 opacity-60"
                                    : "bg-cs-panel border-cs-border hover:border-cs-accent/40 shadow-md"
                              }`}
                            >
                              <div className="space-y-2">
                                {/* Category + scope + time row */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {art.categories?.slice(0, 2).map((cat: string) => {
                                    const c = CAT_COLORS[cat] ?? cc;
                                    return (
                                      <span key={cat} className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>
                                        {cat}
                                      </span>
                                    );
                                  })}
                                  {art.importanceScore >= 90 && (
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border bg-red-500/15 text-red-400 border-red-500/30">🔴</span>
                                  )}
                                  {art.importanceScore >= 75 && art.importanceScore < 90 && (
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border bg-orange-500/15 text-orange-400 border-orange-500/30">🟠</span>
                                  )}
                                  {art.importanceScore >= 60 && art.importanceScore < 75 && (
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border bg-yellow-500/15 text-yellow-400 border-yellow-500/30">🟡</span>
                                  )}
                                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${scope.cls} ml-auto`}>
                                    {scope.icon} {scope.label}
                                  </span>
                                </div>

                                {/* Title */}
                                <h3 className={`text-xs font-bold leading-snug line-clamp-3 transition-colors ${
                                  isRead ? "text-gray-600" : "text-gray-200 group-hover:text-cs-accent"
                                }`}>
                                  {art.title}
                                </h3>

                                {/* Snippet */}
                                <p className="text-[10px] text-gray-600 line-clamp-2 leading-relaxed">
                                  {art.description || art.content || ""}
                                </p>
                              </div>

                              {/* Footer */}
                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-cs-border/40">
                                <span className="text-[9px] font-semibold text-gray-600 uppercase tracking-wide truncate max-w-[50%]">{art.source}</span>
                                <div className="flex items-center gap-2">
                                  {isRead && <span className="text-[8px] text-gray-700 font-bold uppercase">Read</span>}
                                  <span className="text-[9px] text-gray-700">{timeAgo(art.publishedAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : null}
        </div>

        {/* ── Right Panel ────────────────────────────────── */}
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
            {selectedCommodity && !selectedMapCountry && !selectedEvent && (
              <CommodityInsightsPanel
                commodity={selectedCommodity}
                onClose={() => {
                  setSelectedCommodity(null);
                  setRightPanelOpen(false);
                }}
              />
            )}
            {selectedArticle && !selectedMapCountry && !selectedEvent && !selectedCommodity && (
              <div className="p-3 h-full">
                <ArticleDetailsPanel
                  article={selectedArticle}
                  onClose={() => {
                    setSelectedArticle(null);
                    setRightPanelOpen(false);
                  }}
                />
              </div>
            )}
          </SmoothScroll>
        </div>
      </main>
    </div>
  );
}
