"use client";

import type { FC } from "react";
import { useCountryRisk } from "@/lib/hooks";
import { RISK_COLORS, RISK_LABELS, EVENT_TYPE_LABELS } from "@/types";
import type { RiskLevel, EventType } from "@/types";

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
            {country}
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
