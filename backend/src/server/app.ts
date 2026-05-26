import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { eventsRoutes } from "./routes/events";
import { infrastructureRoutes } from "./routes/infrastructure";
import { statsRoutes } from "./routes/stats";
import { riskMapRoutes } from "./routes/risk-map";
import { commodityRoutes } from "./routes/commodities";
import { countryRoutes } from "./routes/country";

export function createApp() {
  const app = new Elysia()
    .use(
      cors({
        origin: true, // Dynamically allow any origin (localhost, 127.0.0.1, local network IP)
        credentials: true,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["content-type", "authorization", "accept"],
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
        .use(countryRoutes)
    );

  return app;
}
