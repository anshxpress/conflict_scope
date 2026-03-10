/**
 * Standalone pipeline runner — called by GitHub Actions cron.
 * Also usable locally:  bun run scripts/run-pipeline.ts
 */
import { runPipeline } from "../src/services/workers/pipeline";

console.log("[Runner] Starting standalone pipeline...");

try {
  const created = await runPipeline(30);
  console.log(`[Runner] Pipeline complete. Created ${created} new events.`);
  process.exit(0);
} catch (err) {
  console.error("[Runner] Pipeline failed:", err);
  process.exit(1);
}
