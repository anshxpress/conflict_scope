/**
 * Commodity price worker — fetches gold, silver, and crude oil prices
 * every 30 minutes and stores them in the `commodities` table.
 *
 * Uses open/free APIs:
 *   - metals-api (gold/silver): https://api.metals.live/v1/spot
 *   - Open Exchange Rates / commodity proxy fallbacks
 *   - EIA (US Energy Information Admin) for oil: https://api.eia.gov/v2/petroleum/pri/spt/data/
 *
 * We chain multiple free sources so at least one works in production.
 */

import { db, schema } from "../../../db";
import { desc, eq } from "drizzle-orm";

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let intervalId: ReturnType<typeof setInterval> | null = null;

// ── Seed resources data (runs once on first start) ─────────────────────────

const RESOURCE_DATA: { country: string; resource: string }[] = [
  // Oil producers
  { country: "Saudi Arabia", resource: "oil" },
  { country: "Russia", resource: "oil" },
  { country: "United States", resource: "oil" },
  { country: "Iraq", resource: "oil" },
  { country: "Iran", resource: "oil" },
  { country: "United Arab Emirates", resource: "oil" },
  { country: "Kuwait", resource: "oil" },
  { country: "Venezuela", resource: "oil" },
  { country: "Libya", resource: "oil" },
  { country: "Nigeria", resource: "oil" },
  { country: "Canada", resource: "oil" },
  { country: "Kazakhstan", resource: "oil" },
  // Gold producers
  { country: "China", resource: "gold" },
  { country: "Russia", resource: "gold" },
  { country: "Australia", resource: "gold" },
  { country: "United States", resource: "gold" },
  { country: "Canada", resource: "gold" },
  { country: "Ghana", resource: "gold" },
  { country: "South Africa", resource: "gold" },
  { country: "Peru", resource: "gold" },
  { country: "Indonesia", resource: "gold" },
  { country: "Uzbekistan", resource: "gold" },
  { country: "Mexico", resource: "gold" },
  { country: "Sudan", resource: "gold" },
  // Silver producers
  { country: "Mexico", resource: "silver" },
  { country: "Peru", resource: "silver" },
  { country: "China", resource: "silver" },
  { country: "Russia", resource: "silver" },
  { country: "Poland", resource: "silver" },
  { country: "Australia", resource: "silver" },
  { country: "Bolivia", resource: "silver" },
  { country: "Chile", resource: "silver" },
  { country: "Argentina", resource: "silver" },
  { country: "Canada", resource: "silver" },
];

export async function seedResources(): Promise<void> {
  try {
    const existing = await db.select().from(schema.resources).limit(1);
    if (existing.length > 0) {
      console.log("[CommodityWorker] Resources already seeded, skipping.");
      return;
    }
    await db.insert(schema.resources).values(RESOURCE_DATA);
    console.log(`[CommodityWorker] Seeded ${RESOURCE_DATA.length} resource entries.`);
  } catch (err) {
    console.error("[CommodityWorker] Failed to seed resources:", err);
  }
}

// ── Price fetchers ─────────────────────────────────────────────────────────

interface PriceResult {
  gold: number | null;
  silver: number | null;
  oil: number | null;
}

/**
 * Fetch a commodity price from Yahoo Finance by ticker symbol.
 * Works for GC=F (gold), SI=F (silver), CL=F (oil).
 */
async function fetchYahooPrice(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
    };
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" ? price : null;
  } catch {
    return null;
  }
}

/**
 * metals.live free API — fallback if Yahoo is down.
 * Response is an array of objects like [{ gold: 2165.45, silver: 24.12, ... }]
 */
async function fetchMetalsLive(): Promise<{ gold: number | null; silver: number | null }> {
  try {
    const res = await fetch("https://api.metals.live/v1/spot", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { gold: null, silver: null };
    const data = await res.json() as unknown;
    // Handle both array [{ gold, silver }] and object { gold, silver }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") return { gold: null, silver: null };
    const r = row as Record<string, unknown>;
    return {
      gold: typeof r.gold === "number" ? r.gold : null,
      silver: typeof r.silver === "number" ? r.silver : null,
    };
  } catch {
    return { gold: null, silver: null };
  }
}

async function fetchAllPrices(): Promise<PriceResult> {
  // Fetch all three in parallel from Yahoo Finance
  const [gold, silver, oil] = await Promise.all([
    fetchYahooPrice("GC=F"),
    fetchYahooPrice("SI=F"),
    fetchYahooPrice("CL=F"),
  ]);

  // If Yahoo failed for metals, try metals.live as fallback
  let finalGold = gold;
  let finalSilver = silver;
  if (finalGold === null || finalSilver === null) {
    console.log("[CommodityWorker] Yahoo metals failed, trying metals.live fallback...");
    const fallback = await fetchMetalsLive();
    finalGold = finalGold ?? fallback.gold;
    finalSilver = finalSilver ?? fallback.silver;
  }

  console.log(`[CommodityWorker] Prices — gold: ${finalGold}, silver: ${finalSilver}, oil: ${oil}`);
  return { gold: finalGold, silver: finalSilver, oil };
}

// ── DB storage ─────────────────────────────────────────────────────────────

async function storePrices(prices: PriceResult): Promise<void> {
  const now = new Date();
  const rows: { commodity: string; price: number; currency: string; source: string }[] = [];

  if (prices.gold !== null)
    rows.push({ commodity: "gold", price: prices.gold, currency: "USD/oz", source: "yahoo-finance" });
  if (prices.silver !== null)
    rows.push({ commodity: "silver", price: prices.silver, currency: "USD/oz", source: "yahoo-finance" });
  if (prices.oil !== null)
    rows.push({ commodity: "oil", price: prices.oil, currency: "USD/barrel", source: "yahoo-finance" });

  if (rows.length === 0) {
    console.warn("[CommodityWorker] No prices fetched — skipping DB write.");
    return;
  }

  for (const row of rows) {
    await db.insert(schema.commodities).values({
      commodity: row.commodity,
      price: row.price,
      currency: row.currency,
      timestamp: now,
      source: row.source,
    });
    console.log(`[CommodityWorker] Stored ${row.commodity}: ${row.price} ${row.currency}`);
  }
}

// ── Main runner ────────────────────────────────────────────────────────────

async function runCommodityUpdate(): Promise<void> {
  console.log("[CommodityWorker] Fetching commodity prices...");
  try {
    const prices = await fetchAllPrices();
    await storePrices(prices);
  } catch (err) {
    console.error("[CommodityWorker] Error during price update:", err);
  }
}

export function startCommodityWorker(): void {
  console.log("[CommodityWorker] Starting (interval: 30min)");
  // Seed resources DB on start
  seedResources().catch(console.error);
  // Immediate first run
  runCommodityUpdate().catch(console.error);
  // Periodic
  intervalId = setInterval(() => {
    runCommodityUpdate().catch(console.error);
  }, INTERVAL_MS);
}

export function stopCommodityWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
