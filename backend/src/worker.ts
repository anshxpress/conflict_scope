/**
 * Railway cron worker entry point.
 *
 * Runs the conflict-event pipeline once, then exits with code 0 on success
 * or code 1 on failure.  Configure as a Cron Service in the Railway dashboard:
 *
 *   Start command : bun run src/worker.ts
 *   Schedule      : * /10 * * * *   (every 10 minutes — remove the space)
 *
 * Required env vars: DATABASE_URL, NODE_ENV
 */

import { runPipeline } from "./services/workers/pipeline";

process.on("uncaughtException", (err) => {
  console.error("[Worker] Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Worker] Unhandled rejection:", reason);
  process.exit(1);
});

console.log("[Worker] Cron pipeline starting…");

runPipeline()
  .then((count) => {
    console.log(`[Worker] Pipeline complete — new events created: ${count}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Worker] Pipeline failed:", err);
    process.exit(1);
  });
