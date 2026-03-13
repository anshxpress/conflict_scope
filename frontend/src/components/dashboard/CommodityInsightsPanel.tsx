"use client";

import type { FC } from "react";
import { useState, useMemo } from "react";
import {
  useCommodityPrices,
  useCommodityHistory,
  useCommodityInsights,
  useCommodityAlerts,
} from "@/lib/hooks";
import { COMMODITY_ICONS, COMMODITY_LABELS } from "@/types";
import type { CommodityName, CommodityAlertLevel } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────

const COMMODITY_COLORS: Record<CommodityName, string> = {
  gold: "#f59e0b",
  silver: "#9ca3af",
  oil: "#6b7280",
};

const ALERT_STYLES: Record<
  CommodityAlertLevel,
  { bg: string; text: string; border: string }
> = {
  info: {
    bg: "bg-blue-950/40",
    text: "text-blue-400",
    border: "border-blue-800/50",
  },
  warning: {
    bg: "bg-yellow-950/40",
    text: "text-yellow-400",
    border: "border-yellow-800/50",
  },
  critical: {
    bg: "bg-red-950/50",
    text: "text-red-400",
    border: "border-red-800/50",
  },
};

const TROY_OZ_TO_GRAMS = 31.1035;

function toUsdLabel(commodity: CommodityName, usdPrice: number): string {
  return commodity === "oil"
    ? `$${usdPrice.toFixed(2)} / bbl`
    : `$${usdPrice.toFixed(2)} / oz`;
}

function toIndianPrice(
  commodity: CommodityName,
  usdPrice: number,
  rate: number,
): string {
  if (commodity === "gold") {
    return `₹${Math.round((usdPrice / TROY_OZ_TO_GRAMS) * 10 * rate).toLocaleString("en-IN")} / 10g`;
  }
  if (commodity === "silver") {
    return `₹${Math.round((usdPrice / TROY_OZ_TO_GRAMS) * 1000 * rate).toLocaleString("en-IN")} / kg`;
  }
  return `₹${Math.round(usdPrice * rate).toLocaleString("en-IN")} / bbl`;
}

function formatRel(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TRIGGER_LABELS: Record<string, string> = {
  refinery_attack: "Refinery Attack",
  pipeline_explosion: "Pipeline Explosion",
  production_cut: "Production Cut",
  energy_export_sanctions: "Export Sanctions",
  military_escalation: "Military Escalation",
  trade_restrictions: "Trade Restrictions",
  mining_regulation: "Mining Regulation",
  safe_haven_demand: "Safe-Haven Demand",
};

// These map to the `windowHours` field stored on each correlation row.
// "All" (0) means no filter — show every window size.
const WINDOW_OPTIONS = [
  { label: "All", windowHours: 0 },
  { label: "1h", windowHours: 1 },
  { label: "6h", windowHours: 6 },
  { label: "24h", windowHours: 24 },
] as const;

// ── Mini SVG sparkline ─────────────────────────────────────────────────────

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const W = 130;
  const H = 36;
  const d = points
    .map((p, i) => {
      const x = ((i / (points.length - 1)) * W).toFixed(1);
      const y = (H - ((p - min) / range) * H).toFixed(1);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const pct = ((last - first) / first) * 100;
  return (
    <div className="flex items-center gap-3">
      <svg
        width={W}
        height={H}
        className="overflow-visible shrink-0"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient
            id={`sg-${color.replace("#", "")}`}
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d={d}
          stroke={`url(#sg-${color.replace("#", "")})`}
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* End dot */}
        <circle
          cx={W}
          cy={(H - ((last - min) / range) * H).toFixed(1)}
          r="2.5"
          fill={color}
        />
      </svg>
      <div className="text-right">
        <div
          className={`text-xs font-mono font-semibold ${pct >= 0 ? "text-green-400" : "text-red-400"}`}
        >
          {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
        </div>
        <div className="text-[9px] text-gray-600 mt-0.5">
          {points.length} pts
        </div>
      </div>
    </div>
  );
}

// ── Impact score bar ───────────────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-cs-dark rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-gray-400 w-6 text-right tabular-nums">
        {score.toFixed(0)}
      </span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

interface CommodityInsightsPanelProps {
  commodity: CommodityName;
  onClose: () => void;
}

const CommodityInsightsPanel: FC<CommodityInsightsPanelProps> = ({
  commodity,
  onClose,
}) => {
  // 0 = show all window sizes; 1 / 6 / 24 = filter event list by correlation window
  const [windowFilter, setWindowFilter] = useState<0 | 1 | 6 | 24>(0);

  const color = COMMODITY_COLORS[commodity];

  const { data: priceData } = useCommodityPrices();
  const { data: historyData, isLoading: historyLoading } = useCommodityHistory(
    commodity,
    168,
  );
  // Always fetch the full 7-day dataset; filtering is done client-side below.
  const { data: insightsData, isLoading: insightsLoading } =
    useCommodityInsights(commodity, 168);
  const { data: alertsData } = useCommodityAlerts(commodity, 10);

  const rate =
    (priceData as { usdToInr?: number } | undefined)?.usdToInr ?? 83.5;
  const currentPrice = priceData?.[commodity];

  const sparklinePoints = useMemo(
    () => historyData?.points.map((p) => p.price) ?? [],
    [historyData],
  );

  const allInsights = insightsData?.insights ?? [];
  // Apply optional windowHours filter from the tab picker
  const insights =
    windowFilter === 0
      ? allInsights
      : allInsights.filter((i) => i.windowHours === windowFilter);
  const alerts = alertsData ?? [];

  // Per-window summary always derived from the FULL dataset (no windowFilter applied)
  const windowSummary = useMemo(() => {
    return ([1, 6, 24] as const).map((w) => {
      const subset = (insightsData?.insights ?? []).filter(
        (i) => i.windowHours === w,
      );
      if (!subset.length) return { w, avg: null, pct: null };
      const avgImpact =
        subset.reduce((s, i) => s + (i.impactScore ?? 0), 0) / subset.length;
      const avgPct =
        subset.reduce((s, i) => s + (i.percentChange ?? 0), 0) / subset.length;
      return { w, avg: avgImpact, pct: avgPct };
    });
  }, [insightsData]);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-cs-panel">
      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-start justify-between p-4 border-b border-cs-border"
        style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl leading-none">
              {COMMODITY_ICONS[commodity]}
            </span>
            <h2 className="text-sm font-bold" style={{ color }}>
              {COMMODITY_LABELS[commodity]}
            </h2>
            <span className="text-[9px] uppercase tracking-wider text-gray-600 border border-cs-border rounded px-1.5 py-0.5">
              Geopolitical Analysis
            </span>
          </div>
          {currentPrice ? (
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-sm font-mono font-bold text-gray-100">
                {toUsdLabel(commodity, currentPrice.price)}
              </span>
              <span className="text-[10px] text-gray-500">
                {toIndianPrice(commodity, currentPrice.price, rate)}
              </span>
              <span className="text-[9px] text-gray-600">
                · {formatRel(currentPrice.timestamp)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-600">Price unavailable</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 ml-2 p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
          aria-label="Close panel"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 p-4 space-y-5">
        {/* Price Sparkline */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
            7-Day Price Trend
          </div>
          <div className="bg-cs-dark rounded-lg p-3 border border-cs-border/50">
            {historyLoading ? (
              <div className="h-9 flex items-center justify-center text-[10px] text-gray-600">
                Loading…
              </div>
            ) : sparklinePoints.length >= 2 ? (
              <Sparkline points={sparklinePoints} color={color} />
            ) : (
              <div className="h-9 flex items-center text-[10px] text-gray-600">
                No history data yet — prices will appear after the next worker
                run.
              </div>
            )}
          </div>
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <span className="text-red-400">⚠</span> Active Alerts
              <span className="ml-auto bg-red-900/40 text-red-400 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                {alerts.length}
              </span>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => {
                const s = ALERT_STYLES[alert.level];
                return (
                  <div
                    key={alert.id}
                    className={`rounded-lg p-2.5 border ${s.bg} ${s.border}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] text-gray-200 leading-snug">
                        {alert.title}
                      </p>
                      <span
                        className={`shrink-0 text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded border ${s.text} ${s.border}`}
                      >
                        {alert.level}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                      {alert.cause}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {alert.priceChangePercent != null && (
                        <span
                          className={`text-[10px] font-mono font-semibold ${alert.priceChangePercent >= 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {alert.priceChangePercent >= 0 ? "▲" : "▼"}{" "}
                          {Math.abs(alert.priceChangePercent).toFixed(2)}%
                        </span>
                      )}
                      {alert.impactScore != null && (
                        <span className="text-[10px] text-gray-500">
                          Score:{" "}
                          <span className="font-mono text-gray-300">
                            {alert.impactScore.toFixed(0)}
                          </span>
                        </span>
                      )}
                      <span className="text-[9px] text-gray-600 ml-auto">
                        {formatRel(alert.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Response Summary (1h / 6h / 24h) */}
        {insights.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
              Avg. Price Response by Window
            </div>
            <div className="grid grid-cols-3 gap-2">
              {windowSummary.map(({ w, avg, pct }) =>
                avg === null ? (
                  <div
                    key={w}
                    className="bg-cs-dark rounded p-2 border border-cs-border/50 text-center"
                  >
                    <div className="text-[10px] text-gray-600 font-mono">
                      {w}h
                    </div>
                    <div className="text-[9px] text-gray-600 mt-0.5">–</div>
                  </div>
                ) : (
                  <div
                    key={w}
                    className="bg-cs-dark rounded p-2.5 border border-cs-border/50 text-center"
                  >
                    <div className="text-[10px] text-gray-500 font-mono">
                      {w}h
                    </div>
                    <div
                      className={`text-xs font-mono font-bold mt-0.5 ${(pct ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {(pct ?? 0) >= 0 ? "▲" : "▼"}
                      {Math.abs(pct ?? 0).toFixed(1)}%
                    </div>
                    <div className="text-[9px] text-gray-600 mt-0.5">
                      score {avg.toFixed(0)}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Geopolitical Event Insights */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
            <span>🔍</span> Event Impact Insights
            {insights.length > 0 && (
              <span className="ml-auto text-[9px] text-gray-600 font-mono">
                {insights.length} events
              </span>
            )}
          </div>

          {/* Window picker — filters event list by correlation window size */}
          <div className="flex bg-cs-dark rounded-lg p-0.5 mb-3">
            {WINDOW_OPTIONS.map((opt) => (
              <button
                key={opt.windowHours}
                onClick={() =>
                  setWindowFilter(opt.windowHours as 0 | 1 | 6 | 24)
                }
                className={`flex-1 text-[10px] py-1 rounded-md transition-colors ${
                  windowFilter === opt.windowHours
                    ? "bg-cs-panel text-gray-200"
                    : "text-gray-500 hover:text-gray-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {insightsLoading ? (
            <div className="py-5 text-center text-[10px] text-gray-600">
              Loading insights…
            </div>
          ) : insights.length === 0 ? (
            <div className="py-5 text-center text-[10px] text-gray-600">
              No geopolitical impact events found for this window.
              <br />
              <span className="text-[9px] text-gray-700">
                Events are mapped automatically when the pipeline runs.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {insights.slice(0, 10).map((item) => {
                const pct = item.percentChange;
                const score = item.impactScore ?? 0;
                return (
                  <div
                    key={item.id}
                    className="bg-cs-dark rounded-lg p-2.5 border border-cs-border/50"
                  >
                    <p className="text-[11px] text-gray-200 leading-snug line-clamp-2">
                      {item.eventTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[9px] bg-cs-panel px-1.5 py-0.5 rounded text-gray-400 capitalize">
                        {item.country}
                      </span>
                      {item.category && (
                        <span className="text-[9px] border border-cs-border px-1.5 py-0.5 rounded text-gray-500 capitalize">
                          {item.category}
                        </span>
                      )}
                      {item.triggerType && (
                        <span className="text-[9px] border border-cs-border px-1.5 py-0.5 rounded text-gray-500">
                          {TRIGGER_LABELS[item.triggerType] ??
                            item.triggerType.replace(/_/g, " ")}
                        </span>
                      )}
                      {item.leaderName && (
                        <span className="text-[9px] text-purple-400 border border-purple-900/50 bg-purple-950/30 px-1.5 py-0.5 rounded">
                          👤 {item.leaderName}
                        </span>
                      )}
                    </div>
                    {pct != null && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-gray-600">
                            {item.windowHours}h window ·{" "}
                            {formatRel(item.eventTimestamp)}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-semibold ${pct >= 0 ? "text-green-400" : "text-red-400"}`}
                          >
                            {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                          </span>
                        </div>
                        <ScoreBar score={score} color={color} />
                      </div>
                    )}
                    {item.policyAction && (
                      <p className="text-[9px] text-gray-600 mt-1.5 italic line-clamp-1">
                        Policy: {item.policyAction}
                      </p>
                    )}
                    {item.priceBefore != null && item.priceAfter != null && (
                      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-gray-600">
                        <span>${item.priceBefore.toFixed(2)}</span>
                        <span className="text-gray-700">→</span>
                        <span className="text-gray-400">
                          ${item.priceAfter.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommodityInsightsPanel;
