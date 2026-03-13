"use client";

import type { FC } from "react";
import { useCommodityPrices } from "@/lib/hooks";
import { COMMODITY_ICONS, COMMODITY_LABELS } from "@/types";
import type { CommodityName } from "@/types";

const COMMODITY_ORDER: CommodityName[] = ["gold", "silver", "oil"];

const COMMODITY_COLORS: Record<CommodityName, string> = {
  gold: "#f59e0b",
  silver: "#9ca3af",
  oil: "#6b7280",
};

// 1 troy oz = 31.1035 grams
const TROY_OZ_TO_GRAMS = 31.1035;

/**
 * Convert USD spot price (per troy oz or per barrel) to Indian market unit.
 *
 * Gold:   USD/troy oz  → ₹/10g   (MCX standard)
 * Silver: USD/troy oz  → ₹/kg    (MCX standard)
 * Oil:    USD/barrel   → ₹/barrel
 */
function toIndianPrice(
  commodity: CommodityName,
  usdPrice: number,
  rate: number,
): string {
  if (commodity === "gold") {
    // price per 10g in INR
    const per10g = (usdPrice / TROY_OZ_TO_GRAMS) * 10 * rate;
    return `₹${Math.round(per10g).toLocaleString("en-IN")} / 10g`;
  }
  if (commodity === "silver") {
    // price per kg in INR
    const perKg = (usdPrice / TROY_OZ_TO_GRAMS) * 1000 * rate;
    return `₹${Math.round(perKg).toLocaleString("en-IN")} / kg`;
  }
  // oil: USD/barrel → ₹/barrel
  const perBbl = usdPrice * rate;
  return `₹${Math.round(perBbl).toLocaleString("en-IN")} / bbl`;
}

function toUsdLabel(commodity: CommodityName, usdPrice: number): string {
  if (commodity === "oil") {
    return `$${usdPrice.toFixed(2)} / barrel`;
  }
  return `$${usdPrice.toFixed(2)} / oz`;
}

function formatAge(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface CommodityPanelProps {
  onCommoditySelect?: (commodity: CommodityName) => void;
  selectedCommodity?: CommodityName | null;
}

const CommodityPanel: FC<CommodityPanelProps> = ({ onCommoditySelect, selectedCommodity }) => {
  const { data, isLoading, error } = useCommodityPrices();
  const rate = (data as { usdToInr?: number } | undefined)?.usdToInr ?? 83.5;

  return (
    <div className="shrink-0 border-t border-cs-border bg-cs-dark/60">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cs-border/50">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
          Commodity Market
        </span>
        <span className="text-[9px] text-gray-600 flex items-center gap-1">
          <span className="text-orange-400">🇮🇳</span> Indian rates
        </span>
      </div>

      {/* Price rows */}
      <div className="divide-y divide-cs-border/30">
        {isLoading && (
          <div className="px-3 py-3 text-[10px] text-gray-600 text-center">
            Fetching prices…
          </div>
        )}

        {error && (
          <div className="px-3 py-3 text-[10px] text-gray-600 text-center">
            Prices unavailable
          </div>
        )}

        {!isLoading &&
          !error &&
          COMMODITY_ORDER.map((commodity) => {
            const entry = data?.[commodity];
            const color = COMMODITY_COLORS[commodity];
            const isSelected = selectedCommodity === commodity;
            return (
              <div
                key={commodity}
                role="button"
                tabIndex={0}
                onClick={() => onCommoditySelect?.(commodity)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onCommoditySelect?.(commodity);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 transition-colors cursor-pointer select-none ${
                  isSelected
                    ? "bg-cs-panel/70 border-l-2"
                    : "hover:bg-cs-panel/40 border-l-2 border-transparent"
                }`}
                style={isSelected ? { borderLeftColor: COMMODITY_COLORS[commodity] } : undefined}
              >
                {/* Icon */}
                <span className="text-base shrink-0 leading-none">
                  {COMMODITY_ICONS[commodity]}
                </span>

                {/* Name + USD reference */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[11px] font-semibold leading-tight"
                    style={{ color }}
                  >
                    {COMMODITY_LABELS[commodity]}
                  </div>
                  {entry ? (
                    <div className="text-[9px] text-gray-600 mt-0.5">
                      {toUsdLabel(commodity, entry.price)} ·{" "}
                      {formatAge(entry.timestamp)}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-600 mt-0.5">—</div>
                  )}
                </div>

                {/* INR price in Indian market units */}
                {entry ? (
                  <div
                    className="text-[12px] font-mono font-bold tabular-nums shrink-0 text-right"
                    style={{ color }}
                  >
                    {toIndianPrice(commodity, entry.price, rate)}
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-600 font-mono shrink-0">
                    N/A
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default CommodityPanel;
