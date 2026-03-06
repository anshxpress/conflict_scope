import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { eventsRoutes } from "./routes/events";
import { infrastructureRoutes } from "./routes/infrastructure";
import { statsRoutes } from "./routes/stats";

export function createApp() {
  const app = new Elysia()
    .use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET"],
      })
    )
    .get("/health", () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "conflictscope-api",
    }))
    .use(eventsRoutes)
    .use(infrastructureRoutes)
    .use(statsRoutes);

  return app;
}
