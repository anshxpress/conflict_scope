import { db, schema } from "../db";
import { eq, desc } from "drizzle-orm";
import { mapEventToCommodities } from "../src/services/commodities/impact-mapping";
import { computeCommodityCorrelations } from "../src/services/commodities/correlation-engine";
import { updateCountryMetrics } from "../src/services/workers/pipeline";

async function main() {
  console.log("═══ Seeding Commodity Price History & Calculating Correlations ═══\n");

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const interval = 6 * 60 * 60 * 1000; // 6 hours

  // 1. Seed 30-Day Commodity Price History
  console.log("[Prices] Generating 30-day historical price points for gold, silver, and oil...");
  
  // Base prices and daily volatility/trends
  const goldBase = 2200;
  const silverBase = 24.5;
  const oilBase = 76.0;

  const pricePoints: Array<{
    commodity: string;
    price: number;
    currency: string;
    timestamp: Date;
    source: string;
  }> = [];

  for (let offset = thirtyDays; offset >= 0; offset -= interval) {
    const timestamp = new Date(now - offset);
    const dayIndex = (thirtyDays - offset) / (24 * 60 * 60 * 1000);

    // Create realistic curves/volatility
    // Gold: steady upward trend with safe-haven spikes
    const goldVolatility = Math.sin(dayIndex / 3) * 35 + (dayIndex * 3) + Math.cos(dayIndex) * 12;
    const goldPrice = Math.max(1800, goldBase + goldVolatility);

    // Silver: mirrors gold but with higher beta/variance
    const silverVolatility = Math.sin(dayIndex / 2.5) * 1.5 + (dayIndex * 0.1) + Math.cos(dayIndex * 1.5) * 0.6;
    const silverPrice = Math.max(15, silverBase + silverVolatility);

    // Oil: geopolitical supply tension peaks
    const oilVolatility = Math.sin(dayIndex / 4.5) * 4.5 + Math.cos(dayIndex / 2) * 2.2 - (dayIndex * 0.05);
    const oilPrice = Math.max(50, oilBase + oilVolatility);

    pricePoints.push(
      { commodity: "gold", price: parseFloat(goldPrice.toFixed(2)), currency: "USD/oz", timestamp, source: "yahoo-finance" },
      { commodity: "silver", price: parseFloat(silverPrice.toFixed(2)), currency: "USD/oz", timestamp, source: "yahoo-finance" },
      { commodity: "oil", price: parseFloat(oilPrice.toFixed(2)), currency: "USD/barrel", timestamp, source: "yahoo-finance" }
    );
  }

  // Clear existing price history to prevent duplicate seeding
  console.log("[Prices] Wiping legacy price records...");
  await db.delete(schema.commodities);

  console.log(`[Prices] Inserting ${pricePoints.length} price history rows...`);
  // Insert in chunks of 100 for safety under bun/postgres pg-driver
  const chunkSize = 100;
  for (let i = 0; i < pricePoints.length; i += chunkSize) {
    const chunk = pricePoints.slice(i, i + chunkSize);
    await db.insert(schema.commodities).values(chunk);
  }
  console.log("[Prices] Price history successfully seeded.");

  // 2. Shift Legacy Event Timestamps to Today (Live Feed Visibility Fix)
  console.log("\n[Events] Shifting selected historical conflict events to today for immediate live feed visibility...");
  
  // Find standard seeded events
  const allEvents = await db.select().from(schema.events);
  console.log(`[Events] Found ${allEvents.length} events in the database.`);

  if (allEvents.length > 0) {
    // Let's shift the first 3 events to today (e.g. 2h ago, 6h ago, 12h ago)
    const timesToShift = [
      new Date(now - 2 * 60 * 60 * 1000),   // 2 hours ago
      new Date(now - 6 * 60 * 60 * 1000),   // 6 hours ago
      new Date(now - 12 * 60 * 60 * 1000),  // 12 hours ago
    ];

    for (let i = 0; i < Math.min(3, allEvents.length); i++) {
      const ev = allEvents[i];
      const targetTime = timesToShift[i];

      console.log(`[Events] Shifting "${ev.title}" to ${targetTime.toISOString()}`);
      await db
        .update(schema.events)
        .set({ timestamp: targetTime })
        .where(eq(schema.events.id, ev.id));
      
      // Update sources publishedDate as well
      await db
        .update(schema.sources)
        .set({ publishedDate: targetTime })
        .where(eq(schema.sources.eventId, ev.id));
    }
  }

  // 3. Calculate Geopolitical Commodity Correlations & Alerts
  console.log("\n[Correlations] Calculating commodity insights across all events...");
  
  // Reload all events with newly updated timestamps
  const updatedEvents = await db.select().from(schema.events);
  let correlationsComputed = 0;

  for (const ev of updatedEvents) {
    // Get associated impacts
    const impacts = await db
      .select({ severity: schema.impacts.severity })
      .from(schema.impacts)
      .where(eq(schema.impacts.eventId, ev.id));

    // Determine commodity matches
    const matches = mapEventToCommodities({
      title: ev.title,
      description: ev.description || "",
      eventType: ev.eventType,
      impacts,
    });

    if (matches.length > 0) {
      console.log(`[Correlations] Event "${ev.title}" matches ${matches.length} commodities.`);
      
      // Insert references to event_commodity_refs
      for (const match of matches) {
        await db
          .insert(schema.eventCommodityRefs)
          .values({
            eventId: ev.id,
            commodity: match.commodity,
            category: match.category,
            triggerType: match.triggerType,
            leaderName: match.leaderName,
            policyAction: match.policyAction,
            confidenceScore: match.confidenceScore,
            rationale: match.rationale,
            createdAt: ev.timestamp,
          });
      }

      // Compute correlations
      await computeCommodityCorrelations({
        eventId: ev.id,
        eventTimestamp: ev.timestamp,
        impacts,
        matches,
      });

      correlationsComputed++;
    }
  }

  console.log(`[Correlations] Computed correlations for ${correlationsComputed} matching events.`);

  // 4. Update metrics cache for affected countries
  console.log("\n[Metrics] Triggering dynamic cache compiler for affected countries...");
  const uniqueCountries = Array.from(new Set(updatedEvents.map((e) => e.country)));
  for (const country of uniqueCountries) {
    await updateCountryMetrics(country);
  }
  console.log("[Metrics] Cache compilation completed.");

  console.log("\n═══ Seeding Script Finished Successfully! ═══");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n[Fatal] Seeding error:", err);
  process.exit(1);
});
