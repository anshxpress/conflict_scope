"use client";

import { useState, useRef, useEffect, type FC } from "react";
import { useCommodityPrices, useCommodityAlerts } from "@/lib/hooks";
import { COMMODITY_ICONS, COMMODITY_LABELS } from "@/types";
import type { CommodityName } from "@/types";

const TROY_OZ_TO_GRAMS = 31.1035;

function toIndianPrice(
  commodity: CommodityName,
  usdPrice: number,
  rate: number,
): string {
  if (commodity === "gold") {
    return `₹${Math.round((usdPrice / TROY_OZ_TO_GRAMS) * 10 * rate).toLocaleString("en-IN")}/10g`;
  }
  if (commodity === "silver") {
    return `₹${Math.round((usdPrice / TROY_OZ_TO_GRAMS) * 1000 * rate).toLocaleString("en-IN")}/kg`;
  }
  return `₹${Math.round(usdPrice * rate).toLocaleString("en-IN")}/bbl`;
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

const UPCOMING_FEATURES = [
  "Custom alert thresholds for price spikes",
  "Supply chain disruption tracker",
  "Refugee movement corridor visualization",
];

const NotificationBell: FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Live SWR data
  const { data: priceData } = useCommodityPrices();
  const { data: alertsData, isLoading: alertsLoading } = useCommodityAlerts(undefined, 10);

  const rate = priceData?.usdToInr ?? 83.5;
  const alerts = alertsData ?? [];
  const unreadCount = alerts.length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Bell button with glowing pulse dot if alerts are present */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-cs-dark transition-all duration-200"
        aria-label="Notifications"
      >
        <svg
          className="w-4.5 h-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-cs-panel animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-cs-panel border border-cs-border rounded-lg shadow-2xl z-[9999] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-cs-border flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
              War-Impact Alerts
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-semibold animate-pulse">
              LIVE
            </span>
          </div>

          {/* Live Spot Prices Grid */}
          <div className="px-3 py-2 bg-cs-dark/30 border-b border-cs-border grid grid-cols-3 gap-1.5">
            {/* Gold */}
            <div className="bg-cs-panel/40 p-1.5 rounded border border-cs-border/40 text-center">
              <div className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Gold</div>
              {priceData?.gold?.price ? (
                <>
                  <div className="text-[11px] font-bold font-mono text-yellow-400 mt-0.5">
                    ${priceData.gold.price.toFixed(1)}
                  </div>
                  <div className="text-[7px] text-gray-600 truncate">
                    {toIndianPrice("gold", priceData.gold.price, rate)}
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-gray-600 mt-0.5 font-mono animate-pulse">...</div>
              )}
            </div>
            {/* Silver */}
            <div className="bg-cs-panel/40 p-1.5 rounded border border-cs-border/40 text-center">
              <div className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Silver</div>
              {priceData?.silver?.price ? (
                <>
                  <div className="text-[11px] font-bold font-mono text-gray-300 mt-0.5">
                    ${priceData.silver.price.toFixed(1)}
                  </div>
                  <div className="text-[7px] text-gray-600 truncate">
                    {toIndianPrice("silver", priceData.silver.price, rate)}
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-gray-600 mt-0.5 font-mono animate-pulse">...</div>
              )}
            </div>
            {/* Oil */}
            <div className="bg-cs-panel/40 p-1.5 rounded border border-cs-border/40 text-center">
              <div className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Brent Oil</div>
              {priceData?.oil?.price ? (
                <>
                  <div className="text-[11px] font-bold font-mono text-orange-400 mt-0.5">
                    ${priceData.oil.price.toFixed(1)}
                  </div>
                  <div className="text-[7px] text-gray-600 truncate">
                    {toIndianPrice("oil", priceData.oil.price, rate)}
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-gray-600 mt-0.5 font-mono animate-pulse">...</div>
              )}
            </div>
          </div>

          {/* Commodity Alerts Feed */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-cs-border">
            {alertsLoading ? (
              <div className="py-8 text-center text-[10px] text-gray-600 animate-pulse font-mono">
                Connecting to intelligence grid...
              </div>
            ) : alerts.length > 0 ? (
              alerts.slice(0, 5).map((a) => {
                const isUp = (a.priceChangePercent ?? 0) >= 0;
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-2.5 p-2 rounded-md bg-cs-dark/20 hover:bg-cs-dark/50 border border-cs-border/30 hover:border-cs-border/60 transition-all duration-200"
                  >
                    {/* Badge */}
                    <div
                      className={`shrink-0 w-8 h-8 rounded flex flex-col items-center justify-center text-[9px] font-bold ${
                        a.commodity === "gold"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : a.commodity === "silver"
                            ? "bg-gray-400/10 text-gray-300 border border-gray-400/20"
                            : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      }`}
                    >
                      <span className="text-xs leading-none">{COMMODITY_ICONS[a.commodity]}</span>
                      <span className="text-[6px] uppercase tracking-wider font-semibold mt-0.5">
                        {a.commodity === "gold" ? "Au" : a.commodity === "silver" ? "Ag" : "CL"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-bold text-gray-200 capitalize truncate">
                          {COMMODITY_LABELS[a.commodity]} Impact
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {a.priceChangePercent !== null && (
                            <span
                              className={`text-[9px] font-bold font-mono ${
                                isUp ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {isUp ? "▲" : "▼"}{Math.abs(a.priceChangePercent).toFixed(1)}%
                            </span>
                          )}
                          <span
                            className={`text-[7px] uppercase font-bold tracking-wider px-1 py-0.5 rounded border leading-none ${
                              a.level === "critical"
                                ? "text-red-400 bg-red-950/40 border-red-800/50"
                                : a.level === "warning"
                                  ? "text-yellow-400 bg-yellow-950/40 border-yellow-800/50"
                                  : "text-blue-400 bg-blue-950/40 border-blue-800/50"
                            }`}
                          >
                            {a.level}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] font-semibold text-gray-300 mt-0.5 leading-snug">
                        {a.title}
                      </p>
                      <p className="text-[9px] text-gray-500 mt-0.5 leading-snug">
                        {a.cause}
                      </p>
                      <div className="flex items-center justify-between text-[7px] text-gray-600 mt-1 font-mono">
                        <span>Score: {a.impactScore?.toFixed(0) ?? "N/A"}</span>
                        <span>{formatRel(a.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Premium Empty State */
              <div className="py-8 px-4 text-center">
                <div className="w-9 h-9 bg-cs-dark/50 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-600 border border-cs-border/40 text-sm">
                  🛡️
                </div>
                <p className="text-[10px] font-bold text-gray-400 leading-snug">
                  No active geopolitical alerts
                </p>
                <p className="text-[8px] text-gray-600 mt-0.5 max-w-[180px] mx-auto leading-relaxed">
                  Monitoring global wire feeds & commodity markets in real-time.
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-cs-border" />

          {/* Upcoming features */}
          <div className="px-4 py-3 bg-cs-dark/10">
            <div className="flex items-center gap-1.5 mb-2">
              <svg
                className="w-3 h-3 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">
                Future Intelligence Roadmap
              </span>
            </div>
            <ul className="space-y-1">
              {UPCOMING_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-1.5 text-[9px] text-gray-500 leading-tight"
                >
                  <span className="text-gray-600 mt-0.5">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
