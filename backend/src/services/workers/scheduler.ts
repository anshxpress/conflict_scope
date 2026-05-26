import { db, schema } from "../../../db";
import { eq, gte, sql } from "drizzle-orm";
import { runPipelineForSource } from "./pipeline";
import { recalculateConnections } from "./connections";

const TICK_INTERVAL = 2 * 60 * 1000; // 2 minutes tick

const DEFAULT_LIMITS: Record<string, number> = {
  rss: 10000,
  gdelt: 10000,
  gnews: 100,
  newsapi: 100,
  youtube: 10000,
};

let isRunningMap: Record<string, boolean> = {
  rss: false,
  gdelt: false,
  gnews: false,
  newsapi: false,
  youtube: false,
};

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Ensures all sources have a budget entry in the database.
 */
async function ensureSourceBudgets(): Promise<void> {
  for (const [source, limit] of Object.entries(DEFAULT_LIMITS)) {
    try {
      const [existing] = await db
        .select()
        .from(schema.sourceBudget)
        .where(eq(schema.sourceBudget.source, source))
        .limit(1);

      if (!existing) {
        await db
          .insert(schema.sourceBudget)
          .values({
            source,
            dailyLimit: limit,
            used: 0,
            remaining: limit,
            enabled: 1,
            consecutiveFailures: 0,
          })
          .onConflictDoNothing({ target: schema.sourceBudget.source });
        console.log(`[Scheduler] Initialized budget for source: ${source} (limit: ${limit})`);
      }
    } catch (err) {
      console.error(`[Scheduler] Failed to initialize budget for ${source}:`, err);
    }
  }
}

/**
 * Checks if the calendar day of last fetch is different from today, and resets the quota.
 */
async function checkAndResetDailyQuotas(): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const budgets = await db.select().from(schema.sourceBudget);
  for (const b of budgets) {
    if (b.lastFetch) {
      const lastFetchDate = new Date(b.lastFetch);
      lastFetchDate.setUTCHours(0, 0, 0, 0);

      if (lastFetchDate.getTime() !== today.getTime()) {
        await db
          .update(schema.sourceBudget)
          .set({
            used: 0,
            remaining: b.dailyLimit,
            enabled: 1,
            consecutiveFailures: 0,
            cooldownUntil: null,
          })
          .where(eq(schema.sourceBudget.source, b.source));
        console.log(`[Scheduler] Daily reset applied for ${b.source}. Quota refreshed.`);
      }
    }
  }
}

/**
 * Checks if any keyword exists in articles in the last 60 minutes to trigger Burst Mode.
 */
async function detectBurstMode(): Promise<boolean> {
  try {
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentArticles = await db
      .select({ title: schema.articles.title })
      .from(schema.articles)
      .where(gte(schema.articles.createdAt, sixtyMinutesAgo))
      .limit(100);

    const burstKeywords = ["war", "oil", "sanction", "election", "earthquake"];
    for (const art of recentArticles) {
      const titleLower = art.title.toLowerCase();
      if (burstKeywords.some((kw) => titleLower.includes(kw))) {
        return true;
      }
    }
  } catch (err) {
    console.error("[Scheduler] Error detecting burst mode:", err);
  }
  return false;
}

/**
 * Evaluates whether a source should be fetched, based on active interval, burst mode, and quota status.
 */
async function evaluateAndFetchSource(source: string, isBurstMode: boolean): Promise<void> {
  if (isRunningMap[source]) return;

  const [budget] = await db
    .select()
    .from(schema.sourceBudget)
    .where(eq(schema.sourceBudget.source, source))
    .limit(1);

  if (!budget) return;

  // 1. Quota constraints checks
  if (budget.enabled === 0) {
    console.log(`[Scheduler] Source ${source} is disabled due to failures. Skipping.`);
    return;
  }

  const now = new Date();
  if (budget.cooldownUntil && now < budget.cooldownUntil) {
    console.log(`[Scheduler] Source ${source} is in cooldown until ${budget.cooldownUntil.toISOString()}. Skipping.`);
    return;
  }

  // Quota usage modes
  const remainingPct = budget.remaining / budget.dailyLimit;
  if (remainingPct < 0.20) {
    console.log(`[Scheduler] Quota pause active for ${source} (<20% remaining). Skipping.`);
    return;
  }

  const isSlowMode = remainingPct >= 0.20 && remainingPct <= 0.50;

  // 2. Determine target fetch interval based on Burst Mode & Quota Slow Mode
  let baseIntervalMin = 15; // default fallback

  if (source === "rss") {
    baseIntervalMin = isBurstMode ? 5 : 15;
  } else if (source === "gdelt") {
    baseIntervalMin = isBurstMode ? 3 : 10;
  } else if (source === "gnews") {
    baseIntervalMin = isBurstMode ? 10 : 30;
  } else if (source === "newsapi") {
    baseIntervalMin = isBurstMode ? 20 : 45;
  } else if (source === "youtube") {
    // YouTube is "event only", meaning we do not fetch it in regular scheduler ticks
    // It is fetched dynamically on-demand inside the Country API.
    return;
  }

  // Double interval if in slow mode
  if (isSlowMode) {
    baseIntervalMin *= 2;
    console.log(`[Scheduler] Quota Slow Mode active for ${source} (20-50% remaining). Interval doubled to ${baseIntervalMin}m.`);
  }

  // 3. Check time since last fetch
  if (budget.lastFetch) {
    const elapsedMs = now.getTime() - new Date(budget.lastFetch).getTime();
    const intervalMs = baseIntervalMin * 60 * 1000;
    if (elapsedMs < intervalMs) {
      // Not yet time
      return;
    }
  }

  // 4. Trigger Ingestion
  isRunningMap[source] = true;
  console.log(`[Scheduler] Triggering fetch for ${source} (${isBurstMode ? "BURST" : "NORMAL"} mode, interval: ${baseIntervalMin}m)`);

  try {
    const lookbackMinutes = baseIntervalMin;
    await runPipelineForSource(source as any, lookbackMinutes);

    // Update lastFetch and reset failures
    await db
      .update(schema.sourceBudget)
      .set({
        lastFetch: new Date(),
        consecutiveFailures: 0,
      })
      .where(eq(schema.sourceBudget.source, source));
  } catch (err) {
    console.error(`[Scheduler] Error running pipeline for ${source}:`, err);
    
    // Quota Engine failure cooldown rules
    const nextFailures = budget.consecutiveFailures + 1;
    const updateObj: Record<string, any> = {
      consecutiveFailures: nextFailures,
    };

    if (nextFailures >= 3) {
      const cooldownPeriod = new Date(Date.now() + 30 * 60 * 1000); // 30 mins cooldown
      updateObj.enabled = 0;
      updateObj.cooldownUntil = cooldownPeriod;
      console.warn(`[QuotaEngine] Source ${source} failed 3 times consecutively. Disabling & setting 30-minute cooldown.`);
    }

    await db
      .update(schema.sourceBudget)
      .set(updateObj)
      .where(eq(schema.sourceBudget.source, source));
  } finally {
    isRunningMap[source] = false;
  }
}

/**
 * Scheduler tick executed every 2 minutes.
 */
async function onSchedulerTick(): Promise<void> {
  try {
    await ensureSourceBudgets();
    await checkAndResetDailyQuotas();

    const isBurstMode = await detectBurstMode();
    if (isBurstMode) {
      console.log(`[Scheduler] [BURST MODE ACTIVE] Higher-priority keywords detected in recent articles.`);
    }

    // Evaluate GDELT, RSS, GNews, NewsAPI
    const activeSources = ["rss", "gdelt", "gnews", "newsapi"];
    await Promise.all(
      activeSources.map((source) => evaluateAndFetchSource(source, isBurstMode))
    );

    // Recalculate country influence connections
    await recalculateConnections();
  } catch (err) {
    console.error("[Scheduler] Error in scheduler tick:", err);
  }
}

/**
 * Start the periodic feed processing scheduler.
 * Executes every 2 minutes.
 */
export function startScheduler(): void {
  console.log(`[Scheduler] Starting ConflictScope V2 Scheduler state machine (tick interval: ${TICK_INTERVAL / 1000}s)`);

  // Run initial tick immediately
  onSchedulerTick();

  // Then schedule periodic ticks
  intervalId = setInterval(onSchedulerTick, TICK_INTERVAL);
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Scheduler] Stopped feed scheduler");
  }
}
