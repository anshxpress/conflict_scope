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
  uniqueIndex,
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

export const riskLevelEnum = pgEnum("risk_level", [
  "red",
  "orange",
  "green",
]);

export const impactTypeEnum = pgEnum("impact_type", [
  "civilian_casualties",
  "military_casualties",
  "infrastructure_damage",
  "power_plant_damage",
  "airport_damage",
  "oil_refinery_damage",
  "residential_destruction",
  "refugee_displacement",
  "government_building_damage",
  "bridge_destroyed",
  "communication_disruption",
  "water_supply_damage",
  "hospital_damage",
  "school_damage",
  "transportation_disruption",
]);

export const impactSeverityEnum = pgEnum("impact_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

// ── Articles Table ─────────────────────────────────────

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 512 }).notNull(),
    content: text("content"),
    source: varchar("source", { length: 256 }).notNull(),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    urlIdx: uniqueIndex("articles_url_idx").on(table.url),
    sourceIdx: index("articles_source_idx").on(table.source),
    publishedIdx: index("articles_published_idx").on(table.publishedAt),
  })
);

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
    articleId: uuid("article_id").references(() => articles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    countryIdx: index("events_country_idx").on(table.country),
    typeIdx: index("events_type_idx").on(table.eventType),
    timestampIdx: index("events_timestamp_idx").on(table.timestamp),
    geoIdx: index("events_geo_idx").on(table.latitude, table.longitude),
    articleIdx: index("events_article_idx").on(table.articleId),
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

// ── Impacts Table ──────────────────────────────────────

export const impacts = pgTable(
  "impacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    impactType: impactTypeEnum("impact_type").notNull(),
    description: text("description"),
    severity: impactSeverityEnum("severity").notNull().default("medium"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    eventIdIdx: index("impacts_event_id_idx").on(table.eventId),
    typeIdx: index("impacts_type_idx").on(table.impactType),
  })
);

// ── Country Risk Table ─────────────────────────────────

export const countryRisk = pgTable(
  "country_risk",
  {
    country: varchar("country", { length: 128 }).primaryKey(),
    riskLevel: riskLevelEnum("risk_level").notNull().default("green"),
    eventsLast14Days: integer("events_last_14_days").notNull().default(0),
    eventsLast30Days: integer("events_last_30_days").notNull().default(0),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

// ── Type exports for application use ───────────────────

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Impact = typeof impacts.$inferSelect;
export type NewImpact = typeof impacts.$inferInsert;
export type CountryRisk = typeof countryRisk.$inferSelect;
export type NewCountryRisk = typeof countryRisk.$inferInsert;
export type Infrastructure = typeof infrastructure.$inferSelect;
export type NewInfrastructure = typeof infrastructure.$inferInsert;
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type ConfidenceLevel = (typeof confidenceEnum.enumValues)[number];
export type InfrastructureType =
  (typeof infrastructureTypeEnum.enumValues)[number];
export type ImpactType = (typeof impactTypeEnum.enumValues)[number];
export type ImpactSeverity = (typeof impactSeverityEnum.enumValues)[number];
export type RiskLevel = (typeof riskLevelEnum.enumValues)[number];
