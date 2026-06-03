import { db, schema } from "../../../db";
import { eq, gte, sql } from "drizzle-orm";
import { runPipelineForCategory } from "./pipeline";
import { recalculateConnections } from "./connections";
import { CATEGORY_ROUTES } from "../news/category_router";

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
let rotationIndex = 0;

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
 * Scheduler tick executed every 2 minutes.
 * Triggers category-specific pipeline on a rotating schedule.
 */
async function onSchedulerTick(): Promise<void> {
  try {
    await ensureSourceBudgets();
    await checkAndResetDailyQuotas();

    const isBurstMode = await detectBurstMode();
    if (isBurstMode) {
      console.log(`[Scheduler] [BURST MODE ACTIVE] Higher-priority keywords detected in recent articles.`);
    }

    const categories = Object.keys(CATEGORY_ROUTES);
    if (categories.length > 0) {
      const targetCategory = categories[rotationIndex % categories.length];
      rotationIndex = (rotationIndex + 1) % categories.length;

      console.log(`[Scheduler] [ROTATION] Triggering ingestion for category="${targetCategory}" (lookback: ${isBurstMode ? "15m" : "30m"})`);
      const lookback = isBurstMode ? 15 : 30;
      await runPipelineForCategory(targetCategory, lookback);
    }

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
