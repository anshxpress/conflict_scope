import { runPipeline } from "./pipeline";

const INTERVAL = parseInt(
  process.env.FEED_CHECK_INTERVAL || "600000",
  10
);

// On first start, look back 24 hours to seed recent history from all feeds.
// After that, only look back the normal 30-minute window each tick.
const FIRST_RUN_LOOKBACK_MINUTES = 24 * 60; // 1440 min
const REGULAR_LOOKBACK_MINUTES = 30;

let isRunning = false;
let isFirstRun = true;
let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the periodic feed processing scheduler.
 * Checks feeds every 10 minutes (configurable).
 */
export function startScheduler(): void {
  console.log(
    `[Scheduler] Starting feed scheduler (interval: ${INTERVAL / 1000}s)`
  );

  // Run immediately on start
  runSafe();

  // Then run on interval
  intervalId = setInterval(runSafe, INTERVAL);
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Scheduler] Stopped feed scheduler");
  }
}

async function runSafe(): Promise<void> {
  if (isRunning) {
    console.log("[Scheduler] Pipeline already running, skipping...");
    return;
  }

  isRunning = true;
  const lookback = isFirstRun ? FIRST_RUN_LOOKBACK_MINUTES : REGULAR_LOOKBACK_MINUTES;
  isFirstRun = false;

  try {
    await runPipeline(lookback);
  } catch (err) {
    console.error("[Scheduler] Unhandled pipeline error:", err);
  } finally {
    isRunning = false;
  }
}
