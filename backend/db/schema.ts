import {
  pgTable,
  uuid,
  text,
  varchar,
  doublePrecision,
  timestamp,
  pgEnum,
  integer,
  index,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────

export const eventTypeEnum = pgEnum("event_type", [
  "airstrike",
  "missile_strike",
  "explosion",
  "drone_strike",
  "infrastructure_attack",
  "armed_conflict",
]);

export const confidenceEnum = pgEnum("confidence_level", [
  "low",
  "medium",
  "high",
]);

export const infrastructureTypeEnum = pgEnum("infrastructure_type", [
  "airport",
  "seaport",
  "power_plant",
  "oil_refinery",
  "government_building",
]);

// ── Events Table ───────────────────────────────────────

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 512 }).notNull(),
    description: text("description"),
    eventType: eventTypeEnum("event_type").notNull(),
    country: varchar("country", { length: 128 }).notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    confidenceScore: confidenceEnum("confidence_score")
      .notNull()
      .default("low"),
    sourceUrl: text("source_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    countryIdx: index("events_country_idx").on(table.country),
    typeIdx: index("events_type_idx").on(table.eventType),
    timestampIdx: index("events_timestamp_idx").on(table.timestamp),
    geoIdx: index("events_geo_idx").on(table.latitude, table.longitude),
  })
);

// ── Sources Table ──────────────────────────────────────

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sourceName: varchar("source_name", { length: 256 }).notNull(),
    articleUrl: text("article_url").notNull(),
    publishedDate: timestamp("published_date", { withTimezone: true }),
  },
  (table) => ({
    eventIdIdx: index("sources_event_id_idx").on(table.eventId),
  })
);

// ── Infrastructure Table ───────────────────────────────

export const infrastructure = pgTable(
  "infrastructure",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 512 }).notNull(),
    type: infrastructureTypeEnum("type").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    country: varchar("country", { length: 128 }).notNull(),
  },
  (table) => ({
    typeIdx: index("infra_type_idx").on(table.type),
    countryIdx: index("infra_country_idx").on(table.country),
  })
);

// ── Type exports for application use ───────────────────

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Infrastructure = typeof infrastructure.$inferSelect;
export type NewInfrastructure = typeof infrastructure.$inferInsert;
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type ConfidenceLevel = (typeof confidenceEnum.enumValues)[number];
export type InfrastructureType =
  (typeof infrastructureTypeEnum.enumValues)[number];
