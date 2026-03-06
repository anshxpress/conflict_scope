import { runPipeline } from "./pipeline";

const INTERVAL = parseInt(
  process.env.FEED_CHECK_INTERVAL || "600000",
  10
);

let isRunning = false;
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
  try {
    await runPipeline();
  } catch (err) {
    console.error("[Scheduler] Unhandled pipeline error:", err);
  } finally {
    isRunning = false;
  }
}
