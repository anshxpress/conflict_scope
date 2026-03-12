import { createApp } from "./server/app";
import { startScheduler, stopScheduler } from "./services/workers/scheduler";
import { startCommodityWorker, stopCommodityWorker } from "./services/workers/commodity-worker";

// ── Global error handlers — prevent crashes from unhandled async errors ──────

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled rejection:", reason);
});

// ── Boot ─────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   ConflictScope API Server                   ║
  ║   Running on http://localhost:${PORT}          ║
  ║   Environment: ${process.env.NODE_ENV || "development"}               ║
  ╚══════════════════════════════════════════════╝
  `);

  // Start the RSS feed processing scheduler
  // Set DISABLE_SCHEDULER=true when GitHub Actions handles the worker cron.
  if (process.env.DISABLE_SCHEDULER !== "true") {
    startScheduler();
    startCommodityWorker();
  } else {
    console.log("[Server] Scheduler disabled — workers handled by GitHub Actions.");
  }
});

// ── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown() {
  console.log("\n[Server] Shutting down gracefully…");
  stopScheduler();
  stopCommodityWorker();
  server.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export type App = typeof app;
