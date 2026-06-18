import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { eventsRoutes } from "./routes/events";
import { infrastructureRoutes } from "./routes/infrastructure";
import { statsRoutes } from "./routes/stats";
import { riskMapRoutes } from "./routes/risk-map";
import { commodityRoutes } from "./routes/commodities";
import { countryRoutes } from "./routes/country";
import { newsRoutes } from "./routes/news";
import { liveFeedEmitter } from "../lib/events";

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
    .ws("/ws", {
      open(ws) {
        ws.subscribe("events");
        ws.subscribe("news");
        console.log("[WS] Client connected to live feed rooms");
      },
      close(ws) {
        ws.unsubscribe("events");
        ws.unsubscribe("news");
        console.log("[WS] Client disconnected");
      },
    })
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
        .use(newsRoutes)
    );

  // Bind emitter to broadcast real-time events to all connected clients
  liveFeedEmitter.removeAllListeners("new-event");
  liveFeedEmitter.removeAllListeners("new-article");

  liveFeedEmitter.on("new-event", (event) => {
    try {
      app.server?.publish("events", JSON.stringify({ type: "new-event", data: event }));
    } catch (err) {
      console.error("[WS] Failed to publish new-event:", err);
    }
  });

  liveFeedEmitter.on("new-article", (article) => {
    try {
      app.server?.publish("news", JSON.stringify({ type: "new-article", data: article }));
    } catch (err) {
      console.error("[WS] Failed to publish new-article:", err);
    }
  });

  return app;
}
