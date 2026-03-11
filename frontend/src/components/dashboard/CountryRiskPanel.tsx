"use client";

import type { FC } from "react";
import { useCountryRisk } from "@/lib/hooks";
import { RISK_COLORS, RISK_LABELS, EVENT_TYPE_LABELS, IMPACT_TYPE_LABELS, IMPACT_TYPE_ICONS, SEVERITY_COLORS, SEVERITY_LABELS } from "@/types";
import type { RiskLevel, EventType, ImpactType, ImpactSeverity } from "@/types";
import { getFlag } from "@/lib/countryFlags";
import { getCountryProfile } from "@/lib/countryLeaders";

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

const CountryRiskPanel: FC<CountryRiskPanelProps> = ({ country, onClose }) => {
  const { data, isLoading } = useCountryRisk(country);
  const profile = getCountryProfile(country);

  const riskLevel: RiskLevel = data?.riskLevel ?? "green";
  const color = RISK_COLORS[riskLevel];

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-cs-panel">
      {/* Header */}
      <div
        className="shrink-0 flex items-start justify-between p-4 border-b border-cs-border"
        style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-100 truncate">
            {getFlag(country) ? `${getFlag(country)} ${country}` : country}
          </h2>
          {data && (
            <span
              className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${RISK_BG[riskLevel]}`}
              style={{ color }}
            >
              {riskLevel === "red"
                ? "● High Risk"
                : riskLevel === "orange"
                  ? "◔ Recent Activity"
                  : "○ No Recent Events"}
            </span>
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

      {/* Body */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
          Loading…
        </div>
      ) : data ? (
        <div className="flex-1 p-4 space-y-5">
          {/* Risk description */}
          <p className={`text-xs ${RISK_TEXT[riskLevel]}`}>
            {RISK_LABELS[riskLevel]}
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Events — last 14 days"
              value={data.events14Days}
              highlight={data.events14Days > 0 ? "red" : undefined}
            />
            <StatCard
              label="Events — last 30 days"
              value={data.events30Days}
              highlight={data.events30Days > 0 ? "orange" : undefined}
            />
          </div>

          {/* Recent events */}
          {data.recentEvents.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                Recent Events
              </h3>
              <ul className="space-y-1.5">
                {data.recentEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="bg-cs-dark rounded p-2.5 border border-cs-border/50"
                  >
                    <p className="text-xs text-gray-200 leading-snug line-clamp-2">
                      {ev.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] bg-cs-panel px-1.5 py-0.5 rounded text-gray-400 capitalize">
                        {EVENT_TYPE_LABELS[ev.eventType as EventType] ??
                          ev.eventType.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-gray-600 ml-auto">
                        {formatRelativeTime(ev.timestamp)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.recentEvents.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-4">
              No conflict events recorded for this country.
            </p>
          )}

          {/* Recent Impacts */}
          {data.recentImpacts && data.recentImpacts.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Recent Impacts
              </h3>
              <ul className="space-y-1">
                {(() => {
                  // Deduplicate impacts by type, keep first occurrence
                  const seen = new Set<string>();
                  return data.recentImpacts.filter((imp) => {
                    if (seen.has(imp.impactType)) return false;
                    seen.add(imp.impactType);
                    return true;
                  }).map((imp) => (
                    <li
                      key={imp.id}
                      className="flex items-center gap-2.5 bg-cs-dark rounded px-2.5 py-2 border border-cs-border/50"
                    >
                      <span className="text-sm shrink-0">
                        {IMPACT_TYPE_ICONS[imp.impactType as ImpactType] ?? "⚠️"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-200 block truncate">
                          {IMPACT_TYPE_LABELS[imp.impactType as ImpactType] ?? imp.impactType.replace(/_/g, " ")}
                        </span>
                        {imp.description && (
                          <span className="text-[10px] text-gray-500 block truncate">
                            {imp.description}
                          </span>
                        )}
                      </div>
                      <span
                        className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{
                          color: SEVERITY_COLORS[imp.severity as ImpactSeverity] ?? "#6b7280",
                          backgroundColor: `${SEVERITY_COLORS[imp.severity as ImpactSeverity] ?? "#6b7280"}20`,
                        }}
                      >
                        {SEVERITY_LABELS[imp.severity as ImpactSeverity] ?? imp.severity}
                      </span>
                    </li>
                  ));
                })()}
              </ul>
            </div>
          )}

          {/* Key Political Leaders */}
          {profile && profile.leaders.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Key Political Leaders
              </h3>
              <ul className="space-y-1">
                {profile.leaders.map((l, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between bg-cs-dark rounded px-2.5 py-2 border border-cs-border/50"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-gray-200 font-medium truncate block">
                        {l.name}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate block">
                        {l.position}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono text-blue-400/60 ml-2">
                      #{i + 1}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Wealthiest Individuals */}
          {profile && profile.richest.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Wealthiest Individuals
              </h3>
              <ul className="space-y-1">
                {profile.richest.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between bg-cs-dark rounded px-2.5 py-2 border border-cs-border/50"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-gray-200 font-medium truncate block">
                        {r.name}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate block">
                        {r.industry}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-mono text-yellow-400 font-bold ml-2">
                      {r.netWorth}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No profile data fallback */}
          {!profile && (
            <div className="bg-cs-dark/40 rounded p-3 border border-cs-border/30 text-center">
              <p className="text-[10px] text-gray-600">
                Leader and billionaire data not yet available for this country.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
          No data available.
        </div>
      )}
    </div>
  );
};

// ── Helper components ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: "red" | "orange";
}) {
  const valueColor =
    highlight === "red"
      ? "text-red-400"
      : highlight === "orange"
        ? "text-orange-400"
        : "text-gray-400";

  return (
    <div className="bg-cs-dark rounded p-3 border border-cs-border/50">
      <div className={`text-lg font-bold font-mono ${valueColor}`}>{value}</div>
      <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">
        {label}
      </div>
    </div>
  );
}

// ── Utility ────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default CountryRiskPanel;
