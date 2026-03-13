import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { eventsRoutes } from "./routes/events";
import { infrastructureRoutes } from "./routes/infrastructure";
import { statsRoutes } from "./routes/stats";
import { riskMapRoutes } from "./routes/risk-map";
import { commodityRoutes } from "./routes/commodities";

export function createApp() {
  const app = new Elysia()
    .use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      })
    )
    .get("/health", () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "conflictscope-api",
    }))
    .group("/api/v1", (app) =>
      app
        .use(eventsRoutes)
        .use(infrastructureRoutes)
        .use(statsRoutes)
        .use(riskMapRoutes)
        .use(commodityRoutes)
    );

  return app;
}
