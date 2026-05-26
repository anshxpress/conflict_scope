"use client";

import type { FC } from "react";
import { useCountryRisk, useCountryConnections } from "@/lib/hooks";
import {
  RISK_COLORS,
  COMMODITY_ICONS,
  COMMODITY_LABELS,
  type RiskLevel,
  type CommodityName,
} from "@/types";
import { getFlag } from "@/lib/countryFlags";

interface CountryRiskPanelProps {
  country: string;
  onClose: () => void;
}

const RISK_BG: Record<RiskLevel, string> = {
  red: "bg-red-950/60 border-red-800/50",
  orange: "bg-orange-950/60 border-orange-800/50",
  green: "bg-green-950/60 border-green-800/50",
};

const RISK_TEXT: Record<RiskLevel, string> = {
  red: "text-red-400",
  orange: "text-orange-400",
  green: "text-green-400",
};

const CATEGORY_COLORS: Record<string, string> = {
  "War / Conflict": "bg-red-500",
  "Government / Laws / Policies": "bg-blue-500",
  "Economy / Markets": "bg-emerald-500",
  "Commodities": "bg-amber-500",
  "Technology": "bg-purple-500",
  "Health": "bg-teal-500",
  "Infrastructure": "bg-sky-500",
  "Trade": "bg-indigo-500",
  "Environment": "bg-green-500",
  "Energy": "bg-yellow-500",
};

const CountryRiskPanel: FC<CountryRiskPanelProps> = ({ country, onClose }) => {
  const { data, isLoading } = useCountryRisk(country);
  const { data: connectionsData, isLoading: connectionsLoading } = useCountryConnections(country);
  const flag = getFlag(country) || "";

  const riskLevel: RiskLevel = (data?.riskLevel as RiskLevel) ?? "green";
  const color = RISK_COLORS[riskLevel];
  const score = data?.score ?? 0;
  const articlesCount = data?.articles?.length ?? 0;

  return (
    <div className="flex flex-col h-full bg-cs-panel border-l border-cs-border font-sans select-none">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between p-4 border-b border-cs-border transition-colors duration-300"
        style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-100 flex items-center gap-2 truncate">
            {flag && <span className="text-xl shrink-0">{flag}</span>}
            <span className="truncate">{country}</span>
          </h2>
          {data && (
            <span
              className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${RISK_BG[riskLevel]} ${RISK_TEXT[riskLevel]}`}
            >
              {riskLevel === "red"
                ? "● High Threat"
                : riskLevel === "orange"
                  ? "◔ Recent Activity"
                  : "○ Stable / Green"}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 ml-2 p-1 text-gray-400 hover:text-gray-200 rounded hover:bg-cs-dark/40 transition-all duration-200"
          aria-label="Close panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-xs gap-2 py-12">
          <div className="w-6 h-6 border-2 border-cs-accent border-t-transparent rounded-full animate-spin" />
          <span>Assembling intelligence...</span>
        </div>
      ) : data ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Threat Metric Dial */}
          <div className="bg-cs-dark/60 rounded-xl p-4 border border-cs-border/60 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Threat Risk Index</div>
              <div className="text-xs text-gray-400 leading-snug">
                Based on event severity, news frequency, and active conflict parameters.
              </div>
            </div>
            <div className="relative shrink-0 flex items-center justify-center w-16 h-16 rounded-full border-2 border-cs-border/60" style={{ borderColor: `${color}33` }}>
              <div className="absolute inset-1 rounded-full flex flex-col items-center justify-center" style={{ background: `${color}08` }}>
                <span className="text-lg font-bold font-mono text-gray-100">{score}</span>
                <span className="text-[8px] text-gray-500 font-semibold uppercase">Index</span>
              </div>
              <svg className="w-16 h-16 -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="transparent"
                  stroke={color}
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - score / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
            </div>
          </div>

          {/* Influence Connections Network */}
          <div className="space-y-3 bg-cs-dark/40 rounded-xl p-4 border border-cs-border/60">
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
              <span>🌐</span> Geopolitical Connection Flow
            </h3>

            {connectionsLoading ? (
              <div className="flex items-center gap-2 text-[11px] text-gray-500 py-2">
                <div className="w-3.5 h-3.5 border-2 border-cs-accent border-t-transparent rounded-full animate-spin" />
                <span>Computing influence network...</span>
              </div>
            ) : connectionsData && connectionsData.routes.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400">Total Influence Routes:</span>
                  <span className="text-cs-accent font-mono font-bold">{connectionsData.routes.length}</span>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {connectionsData.routes
                    .sort((a, b) => b.score - a.score)
                    .map((route, index) => {
                      const colorClass = CATEGORY_COLORS[route.category] || "bg-gray-500";
                      const flagEmoji = getFlag(route.destination) || "🏳️";
                      return (
                        <div key={index} className="flex items-center justify-between bg-cs-panel/40 border border-cs-border/30 rounded-lg p-2 hover:border-cs-border/80 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">{flagEmoji}</span>
                            <span className="text-[11px] text-gray-200 truncate font-medium">{route.destination}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold text-white ${colorClass}`}>
                              {route.category}
                            </span>
                            <span className="text-[11px] font-bold font-mono text-gray-400">
                              {route.score}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-gray-500 py-2 italic text-center">
                No active geopolitical connections detected.
              </div>
            )}
          </div>

          {/* Top Categories Breakdown */}
          {data.categories && Object.keys(data.categories).length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                <span>📈</span> Category Breakdown
              </h3>
              <div className="space-y-2">
                {Object.entries(data.categories)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([cat, count]) => {
                    const total = Object.values(data.categories).reduce((acc: number, val: any) => acc + val, 0) as number;
                    const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-gray-300 truncate max-w-[80%]">{cat}</span>
                          <span className="text-gray-500 font-mono font-semibold">{count as number}</span>
                        </div>
                        <div className="w-full bg-cs-dark h-1.5 rounded-full overflow-hidden border border-cs-border/30">
                          <div
                            className={`h-full rounded-full ${CATEGORY_COLORS[cat] || "bg-gray-500"} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Strategic Resources & Commodities */}
          {data.commodities && data.commodities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                <span>⚡</span> Commodity Market Effects
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {data.commodities.map((c: string) => (
                  <div
                    key={c}
                    className="flex items-center gap-1.5 bg-cs-dark/80 rounded-lg px-2.5 py-1.5 border border-cs-border/60 shadow-sm"
                  >
                    <span className="text-sm shrink-0">
                      {COMMODITY_ICONS[c as CommodityName] ?? "🔹"}
                    </span>
                    <span className="text-[11px] text-gray-300 font-medium">
                      {COMMODITY_LABELS[c as CommodityName] ?? c}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chronological Timeline */}
          {data.timeline && data.timeline.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                <span>📅</span> Geopolitical Timeline
              </h3>
              <div className="relative pl-3 border-l border-cs-border/70 space-y-4 ml-1">
                {data.timeline.map((t: any, idx: number) => {
                  const colorClass = CATEGORY_COLORS[t.category] || "bg-gray-500";
                  return (
                    <div key={idx} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[16.5px] top-1.5 w-2 h-2 rounded-full border border-cs-panel ${colorClass}`} />
                      <div className="text-[10px] text-gray-500 font-mono flex items-center justify-between">
                        <span>
                          {new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                        {t.source && (
                          <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold bg-cs-dark/30 border border-cs-border/40 rounded px-1.5 py-0.5 leading-none">
                            {t.source}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-200 leading-snug font-medium">
                        {t.url ? (
                          <a
                            href={t.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-cs-accent hover:underline transition-all duration-200 block"
                          >
                            {t.title} <span className="text-[9px] text-gray-500 inline-block font-sans">↗</span>
                          </a>
                        ) : (
                          t.title
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* YouTube Video Panel */}
          {data.videos && data.videos.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
                <span>📺</span> Related Video Intelligence
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {data.videos.map((v: any) => (
                  <a
                    key={v.videoId}
                    href={`https://www.youtube.com/watch?v=${v.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-2.5 p-2 rounded-lg bg-cs-dark/40 border border-cs-border/60 hover:bg-cs-dark/80 hover:border-cs-accent/30 transition-all duration-200"
                  >
                    <div className="relative shrink-0 w-24 h-14 bg-black rounded overflow-hidden shadow-sm">
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <span className="text-[11px] text-gray-200 font-medium leading-snug line-clamp-2 hover:text-cs-accent">
                        {v.title}
                      </span>
                      <span className="text-[9px] text-gray-500 truncate">{v.channel}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Recent Articles list with duplicate indicators */}
          {data.articles && data.articles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                Deduplicated News Stream
              </h3>
              <div className="space-y-2">
                {data.articles.map((art: any) => (
                  <div
                    key={art.id}
                    className="bg-cs-dark/40 border border-cs-border/60 rounded-xl p-3.5 hover:border-cs-border/90 hover:bg-cs-dark/60 transition-all duration-200"
                  >
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-gray-200 leading-snug hover:text-cs-accent hover:underline block"
                    >
                      {art.title}
                    </a>

                    {art.description && (
                      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed line-clamp-2">
                        {art.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-cs-border/30">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_COLORS[art.category] || "bg-gray-500"}`} />
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{art.category}</span>
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono">
                        {art.source}
                      </span>
                    </div>

                    {art.duplicateCount && art.duplicateCount > 1 && (
                      <div className="mt-2 flex items-center gap-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 rounded-lg px-2.5 py-1 text-[9px] font-semibold tracking-wide w-fit">
                        <span>🛡️</span>
                        <span>{art.duplicateCount - 1} duplicate sources blocked</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty fallback */}
          {articlesCount === 0 && (
            <div className="py-12 text-center bg-cs-dark/30 rounded-xl border border-cs-border/40 text-gray-500 text-xs">
              No recent global intelligence recorded.
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs py-12">
          Select a country to view threat intelligence.
        </div>
      )}
    </div>
  );
};

export default CountryRiskPanel;
