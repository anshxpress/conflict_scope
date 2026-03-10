import { createApp } from "./server/app";
import { startScheduler, stopScheduler } from "./services/workers/scheduler";

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

  // Start the in-process scheduler unless Railway cron service is used instead.
  // Set ENABLE_SCHEDULER=false on the web service when using a separate cron worker.
  if (process.env.ENABLE_SCHEDULER !== "false") {
    startScheduler();
  }
});

// ── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown() {
  console.log("\n[Server] Shutting down gracefully…");
  stopScheduler();
  server.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export type App = typeof app;
