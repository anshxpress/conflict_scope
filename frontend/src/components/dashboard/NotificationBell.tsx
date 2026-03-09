"use client";

import { useState, useRef, useEffect, type FC } from "react";

interface CommodityAlert {
  commodity: string;
  icon: string;
  price: string;
  change: string;
  direction: "up" | "down";
  reason: string;
}

const COMMODITY_ALERTS: CommodityAlert[] = [
  {
    commodity: "Gold (XAU/USD)",
    icon: "Au",
    price: "$3,120.40",
    change: "+2.4%",
    direction: "up",
    reason: "Safe-haven demand surges amid Middle East escalation",
  },
  {
    commodity: "Silver (XAG/USD)",
    icon: "Ag",
    price: "$34.85",
    change: "+1.8%",
    direction: "up",
    reason: "Industrial + safe-haven demand from conflict uncertainty",
  },
  {
    commodity: "Crude Oil (Brent)",
    icon: "CL",
    price: "$86.72",
    change: "+3.1%",
    direction: "up",
    reason: "Supply disruption fears from Strait of Hormuz tensions",
  },
];

const UPCOMING_FEATURES = [
  "Live commodity price ticker from war-impacted markets",
  "Custom alert thresholds for price spikes",
  "Supply chain disruption tracker",
  "Refugee movement corridor visualization",
];

const NotificationBell: FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-cs-dark transition-colors"
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
        {/* Badge dot */}
        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-yellow-500 rounded-full border border-cs-panel" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-cs-panel border border-cs-border rounded-lg shadow-2xl z-[9999] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-cs-border flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
              War-Impact Alerts
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-semibold">
              LIVE
            </span>
          </div>

          {/* Commodity prices */}
          <div className="p-2 space-y-1">
            {COMMODITY_ALERTS.map((a) => (
              <div
                key={a.commodity}
                className="flex items-start gap-3 p-2.5 rounded-md hover:bg-cs-dark/60 transition-colors"
              >
                {/* Icon badge */}
                <div
                  className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                    a.commodity.includes("Gold")
                      ? "bg-yellow-500/20 text-yellow-400"
                      : a.commodity.includes("Silver")
                        ? "bg-gray-400/20 text-gray-300"
                        : "bg-orange-500/20 text-orange-400"
                  }`}
                >
                  {a.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-200 truncate">
                      {a.commodity}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono ${
                        a.direction === "up"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {a.direction === "up" ? "▲" : "▼"} {a.change}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-gray-400">
                    {a.price}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                    {a.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-cs-border" />

          {/* Upcoming features */}
          <div className="px-4 py-3">
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
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                Coming Soon
              </span>
            </div>
            <ul className="space-y-1.5">
              {UPCOMING_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-[10px] text-gray-500"
                >
                  <span className="text-gray-600 mt-0.5">+</span>
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
