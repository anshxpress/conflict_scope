"use client";

import { useState, useRef, useEffect, useMemo, type FC } from "react";
import type { ConflictEvent } from "@/types";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/types";
import { formatCountry } from "@/lib/countryFlags";
import { useLiveSocket } from "@/lib/useLiveSocket";

interface LiveEventFeedProps {
  events: ConflictEvent[];
  articles: any[];
  selectedCategories: Set<string>;
  selectedCity: string;
  selectedState: string;
  onEventSelect: (event: ConflictEvent) => void;
  selectedEventId: string | null;
  onArticleSelect: (article: any) => void;
  selectedArticleId: string | null;
  onRefresh?: () => unknown;
  isRefreshing?: boolean;
}

const LiveEventFeed: FC<LiveEventFeedProps> = ({
  events,
  articles,
  selectedCategories,
  selectedCity,
  selectedState,
  onEventSelect,
  selectedEventId,
  onArticleSelect,
  selectedArticleId,
  onRefresh,
  isRefreshing = false,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [liveEvents, setLiveEvents] = useState<ConflictEvent[]>([]);
  const [liveArticles, setLiveArticles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(new Set());



  // Sync state when props change
  useEffect(() => {
    // Clear live buffer items that have now been incorporated into props
    setLiveEvents((prev) => prev.filter((le) => !events.some((e) => e.id === le.id)));
    setLiveArticles((prev) => prev.filter((la) => !articles.some((a) => a.id === la.id)));
  }, [events, articles]);

  // Connect WebSockets
  useLiveSocket({
    onNewEvent: (newEvent: ConflictEvent) => {
      setLiveEvents((prev) => [newEvent, ...prev]);
      setNewlyArrivedIds((prev) => {
        const next = new Set(prev);
        next.add(newEvent.id);
        return next;
      });

      // Fade out highlight border after 8 seconds
      setTimeout(() => {
        setNewlyArrivedIds((prev) => {
          const next = new Set(prev);
          next.delete(newEvent.id);
          return next;
        });
      }, 8000);
    },
    onNewArticle: (newArticle: any) => {
      setLiveArticles((prev) => [newArticle, ...prev]);
      setNewlyArrivedIds((prev) => {
        const next = new Set(prev);
        next.add(newArticle.id);
        return next;
      });

      setTimeout(() => {
        setNewlyArrivedIds((prev) => {
          const next = new Set(prev);
          next.delete(newArticle.id);
          return next;
        });
      }, 8000);
    },
  });

  // De-duplicate and merge collections
  const allEvents = useMemo(() => {
    const map = new Map<string, ConflictEvent>();
    events.forEach((e) => map.set(e.id, e));
    liveEvents.forEach((e) => map.set(e.id, e));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [events, liveEvents]);

  const allArticles = useMemo(() => {
    const map = new Map<string, any>();
    articles.forEach((a) => map.set(a.id, a));
    liveArticles.forEach((a) => map.set(a.id, a));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }, [articles, liveArticles]);

  const mergedFeed = useMemo(() => {
    const items: Array<
      | { type: "event"; timestamp: number; data: ConflictEvent; id: string }
      | { type: "article"; timestamp: number; data: any; id: string }
    > = [];

    allEvents.forEach((e) => {
      items.push({
        type: "event",
        timestamp: new Date(e.timestamp).getTime(),
        data: e,
        id: e.id,
      });
    });

    allArticles.forEach((a) => {
      items.push({
        type: "article",
        timestamp: new Date(a.publishedAt).getTime(),
        data: a,
        id: a.id,
      });
    });

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [allEvents, allArticles]);

  // Apply preference & search filtering
  const filteredFeed = useMemo(() => {
    return mergedFeed.filter((item) => {
      // 1. Text Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const title = item.data.title.toLowerCase();
        const desc = (item.data.description || "").toLowerCase();
        const country = (item.data.country || "").toLowerCase();
        const source = (item.data.source || "").toLowerCase();
        const isMatched =
          title.includes(query) ||
          desc.includes(query) ||
          country.includes(query) ||
          source.includes(query);
        if (!isMatched) return false;
      }

      // 2. Location Preference Filter (Skip/Clear = bypass/show all)
      if (selectedCity || selectedState) {
        const d = item.data;
        let locMatch = false;

        if (selectedCity && d.city && d.city.toLowerCase() === selectedCity.toLowerCase()) {
          locMatch = true;
        } else if (selectedState && d.state && d.state.toLowerCase() === selectedState.toLowerCase()) {
          locMatch = true;
        } else if (d.country === "India") {
          locMatch = true; // India national level
        } else if (d.country && d.country !== "India" && d.country !== selectedCity && d.country !== selectedState) {
          locMatch = true; // World level
        }

        if (!locMatch) return false;
      }

      // 3. Category Checklist Preference Filter
      if (item.type === "article") {
        const cats = item.data.categories || [item.data.category];
        return cats.some((c: string) => selectedCategories.has(c));
      } else {
        // Events: match if Safety, International, or Infrastructure are checked
        return (
          selectedCategories.has("Safety") ||
          selectedCategories.has("International") ||
          selectedCategories.has("Infrastructure")
        );
      }
    });
  }, [mergedFeed, searchQuery, selectedCategories, selectedCity, selectedState]);

  // Scroll to top when new elements arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [filteredFeed.length]);

  return (
    <div className="bg-cs-panel border-t border-cs-border flex flex-col overflow-hidden flex-1 min-h-0">
      {/* Dynamic Style injection for glows */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes item-glow {
          0% { background-color: rgba(34, 197, 94, 0.18); border-left-color: #22c55e; }
          100% { background-color: transparent; border-left-color: transparent; }
        }
        .animate-live-glow {
          animation: item-glow 8s ease-out forwards;
          border-left-width: 3px;
        }
      `}} />

      {/* Header */}
      <div className="flex flex-col gap-2.5 px-4 py-3 border-b border-cs-border shrink-0 bg-cs-dark/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cs-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cs-accent" />
            </span>
            Live
          </h3>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              type="button"
              onClick={() => {
                if (onRefresh) void onRefresh();
              }}
              disabled={!onRefresh || isRefreshing}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-cs-border text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh live feed"
              title="Refresh live feed"
            >
              <svg
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{filteredFeed.length} News</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search feed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-cs-dark border border-cs-border rounded-md pl-8 pr-3 py-1 text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-cs-blue transition-colors"
          />
          <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Feed list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto divide-y divide-cs-border/60"
        style={{ maxHeight: "calc(100vh - 380px)", minHeight: "220px" }}
      >
        {filteredFeed.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-12 px-4 space-y-1">
            <div>No matching items found</div>
            <div className="text-[10px] text-gray-700">Try tweaking your search or category filters</div>
          </div>
        ) : (
          <ul>
            {filteredFeed.map((item) => {
              const isGlow = newlyArrivedIds.has(item.id);
              if (item.type === "event") {
                const isSelected = item.id === selectedEventId;
                return (
                  <EventItem
                    key={item.id}
                    event={item.data}
                    isSelected={isSelected}
                    isGlow={isGlow}
                    onClick={() => onEventSelect(item.data)}
                  />
                );
              } else {
                const isSelected = item.id === selectedArticleId;
                return (
                  <ArticleItem
                    key={item.id}
                    article={item.data}
                    isSelected={isSelected}
                    isGlow={isGlow}
                    onClick={() => onArticleSelect(item.data)}
                  />
                );
              }
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

// ── Event Item Component ───────────────────────────────────────────

interface EventItemProps {
  event: ConflictEvent;
  isSelected: boolean;
  isGlow: boolean;
  onClick: () => void;
}

const EventItem: FC<EventItemProps> = ({ event, isSelected, isGlow, onClick }) => {
  const color = EVENT_TYPE_COLORS[event.eventType] || "#ef4444";
  const formattedTime = formatRelativeTime(event.timestamp);

  // Confidence level colors
  const confidenceLabels = { low: "LOW", medium: "MED", high: "HIGH" };
  const confidenceColors = {
    low: "text-red-400 bg-red-500/10 border-red-500/20",
    medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    high: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };

  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 hover:bg-cs-dark/40 border-l-2 transition-all duration-300 ${isGlow ? "animate-live-glow" : "border-l-transparent"
          } ${isSelected ? "bg-cs-dark border-l-cs-accent" : ""}`}
      >
        <div className="flex items-start gap-2.5">
          {/* Kinetic Conflict indicator */}
          <span className="mt-1.5 shrink-0 flex h-2 w-2 relative">
            {isGlow && (
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: color }}
              />
            )}
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: color }} />
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-200 line-clamp-2 leading-snug">
              {event.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-gray-500">
                {formatCountry(event.country)}
              </span>
              <span className="text-[9px] text-gray-700">•</span>
              <span className="text-[10px]" style={{ color: color + "cc" }}>
                {EVENT_TYPE_LABELS[event.eventType]}
              </span>
              <span className="text-[9px] text-gray-700">•</span>
              {/* Confidence Badge */}
              <span
                className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded border leading-none ${confidenceColors[event.confidenceScore] || confidenceColors.low
                  }`}
              >
                {confidenceLabels[event.confidenceScore] || "LOW"}
              </span>
              <span className="text-[10px] text-gray-600 ml-auto whitespace-nowrap">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
};

// ── Article Item Component ──────────────────────────────────────────

interface ArticleItemProps {
  article: any;
  isSelected: boolean;
  isGlow: boolean;
  onClick: () => void;
}

const ArticleItem: FC<ArticleItemProps> = ({ article, isSelected, isGlow, onClick }) => {
  const formattedTime = formatRelativeTime(article.publishedAt);
  const cat = article.categories?.[0] || article.category || "General";

  // Score levels
  let scoreColor = "text-gray-400 bg-gray-500/10 border-gray-500/20";
  let scoreLabel = "Noted";
  if (article.importanceScore >= 90) {
    scoreColor = "text-red-400 bg-red-500/10 border-red-500/20";
    scoreLabel = "CRITICAL";
  } else if (article.importanceScore >= 75) {
    scoreColor = "text-orange-400 bg-orange-500/10 border-orange-500/20";
    scoreLabel = "HIGH";
  } else if (article.importanceScore >= 60) {
    scoreColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    scoreLabel = "NOTABLE";
  }

  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 hover:bg-cs-dark/40 border-l-2 transition-all duration-300 ${isGlow ? "animate-live-glow" : "border-l-transparent"
          } ${isSelected ? "bg-cs-dark border-l-cs-blue" : ""}`}
      >
        <div className="flex items-start gap-2.5">
          {/* News Item indicator */}
          <span className="mt-1.5 shrink-0 text-[10px]" title="News article">
            📰
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 line-clamp-2 leading-snug">
              {article.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-gray-500">
                {formatCountry(article.country || "International")}
              </span>
              <span className="text-[9px] text-gray-700">•</span>
              {/* Category tag */}
              <span className="text-[9px] font-bold text-cs-blue uppercase tracking-wider">
                {cat}
              </span>
              <span className="text-[9px] text-gray-700">•</span>
              {/* Importance Badge */}
              <span
                className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded border leading-none ${scoreColor}`}
              >
                {scoreLabel}
              </span>
              <span className="text-[10px] text-gray-600 ml-auto whitespace-nowrap">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
};

// ── Time formatter ──

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default LiveEventFeed;
