import { createApp } from "./server/app";
import { startScheduler } from "./services/workers/scheduler";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = createApp();

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   ConflictScope API Server                   ║
  ║   Running on http://localhost:${PORT}          ║
  ║   Environment: ${process.env.NODE_ENV || "development"}               ║
  ╚══════════════════════════════════════════════╝
  `);

  // Start the RSS feed processing scheduler
  startScheduler();
});

export type App = typeof app;
