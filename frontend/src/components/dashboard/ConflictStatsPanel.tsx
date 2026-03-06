"use client";

import { FC, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import type { StatsResponse, CountryStats } from "@/types";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "#9ca3af", font: { size: 10 } },
    },
    tooltip: {
      backgroundColor: "#111827",
      titleColor: "#f9fafb",
      bodyColor: "#9ca3af",
      borderColor: "#1f2937",
      borderWidth: 1,
    },
  },
};

interface ConflictStatsPanelProps {
  stats: StatsResponse | undefined;
  countryStats: CountryStats | undefined;
  selectedCountry: string;
}

const ConflictStatsPanel: FC<ConflictStatsPanelProps> = ({
  stats,
  countryStats,
  selectedCountry,
}) => {
  if (!stats) {
    return (
      <div className="bg-cs-panel border border-cs-border rounded-lg p-4">
        <div className="text-xs text-gray-500 text-center py-4">
          Loading statistics…
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cs-panel border border-cs-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        {selectedCountry
          ? `${selectedCountry} Statistics`
          : "Global Statistics"}
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Total Events"
          value={
            selectedCountry && countryStats
              ? countryStats.totalEvents
              : stats.totalEvents
          }
          color="#ef4444"
        />
        <StatCard
          label="Countries"
          value={stats.byCountry.length}
          color="#3b82f6"
        />
        <StatCard
          label="High Confidence"
          value={
            stats.byConfidence.find((c) => c.confidence === "high")?.count ?? 0
          }
          color="#22c55e"
        />
        <StatCard
          label="Last Event"
          value={
            stats.lastRecordedEvent
              ? new Date(stats.lastRecordedEvent).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"
          }
          color="#eab308"
        />
      </div>

      {/* Event types donut chart */}
      <div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
          Events by Type
        </div>
        <div className="h-36">
          <Doughnut
            data={{
              labels: (selectedCountry && countryStats
                ? countryStats.byType
                : stats.byType
              ).map(
                (t) =>
                  EVENT_TYPE_LABELS[
                    t.eventType as keyof typeof EVENT_TYPE_LABELS
                  ] ?? t.eventType,
              ),
              datasets: [
                {
                  data: (selectedCountry && countryStats
                    ? countryStats.byType
                    : stats.byType
                  ).map((t) => t.count),
                  backgroundColor: (selectedCountry && countryStats
                    ? countryStats.byType
                    : stats.byType
                  ).map(
                    (t) =>
                      (EVENT_TYPE_COLORS[
                        t.eventType as keyof typeof EVENT_TYPE_COLORS
                      ] ?? "#6b7280") + "cc",
                  ),
                  borderColor: "#111827",
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              ...CHART_DEFAULTS,
              plugins: {
                ...CHART_DEFAULTS.plugins,
                legend: {
                  position: "right",
                  labels: {
                    color: "#9ca3af",
                    font: { size: 9 },
                    padding: 8,
                    boxWidth: 10,
                  },
                },
              },
              cutout: "65%",
            }}
          />
        </div>
      </div>

      {/* Top countries bar chart */}
      {!selectedCountry && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            Top Conflict Countries
          </div>
          <div className="h-36">
            <Bar
              data={{
                labels: stats.byCountry.slice(0, 8).map((c) => c.country),
                datasets: [
                  {
                    label: "Events",
                    data: stats.byCountry.slice(0, 8).map((c) => c.count),
                    backgroundColor: "#ef444466",
                    borderColor: "#ef4444",
                    borderWidth: 1,
                    borderRadius: 3,
                  },
                ],
              }}
              options={{
                ...CHART_DEFAULTS,
                indexAxis: "y",
                scales: {
                  x: {
                    ticks: { color: "#6b7280", font: { size: 9 } },
                    grid: { color: "#1f2937" },
                  },
                  y: {
                    ticks: { color: "#9ca3af", font: { size: 9 } },
                    grid: { display: false },
                  },
                },
                plugins: {
                  ...CHART_DEFAULTS.plugins,
                  legend: { display: false },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Monthly trend for selected country */}
      {selectedCountry &&
        countryStats &&
        countryStats.monthlyTrend.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
              Monthly Trend
            </div>
            <div className="h-32">
              <Line
                data={{
                  labels: countryStats.monthlyTrend.map((m) => m.month),
                  datasets: [
                    {
                      label: "Events",
                      data: countryStats.monthlyTrend.map((m) => m.count),
                      borderColor: "#ef4444",
                      backgroundColor: "#ef444422",
                      borderWidth: 2,
                      fill: true,
                      tension: 0.4,
                      pointRadius: 3,
                      pointBackgroundColor: "#ef4444",
                    },
                  ],
                }}
                options={{
                  ...CHART_DEFAULTS,
                  scales: {
                    x: {
                      ticks: { color: "#6b7280", font: { size: 8 } },
                      grid: { color: "#1f2937" },
                    },
                    y: {
                      ticks: { color: "#6b7280", font: { size: 9 } },
                      grid: { color: "#1f2937" },
                    },
                  },
                  plugins: {
                    ...CHART_DEFAULTS.plugins,
                    legend: { display: false },
                  },
                }}
              />
            </div>
          </div>
        )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number | string;
  color: string;
}

const StatCard: FC<StatCardProps> = ({ label, value, color }) => (
  <div className="bg-cs-dark rounded p-2.5 border border-cs-border">
    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
      {label}
    </div>
    <div className="text-lg font-bold font-mono" style={{ color }}>
      {typeof value === "number" ? value.toLocaleString() : value}
    </div>
  </div>
);

export default ConflictStatsPanel;
