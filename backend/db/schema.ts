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
  jsonb,
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

export const geoEventCategoryEnum = pgEnum("geo_event_category", [
  "military",
  "political",
  "economic",
  "policy",
]);

export const commodityNameEnum = pgEnum("commodity_name", [
  "gold",
  "silver",
  "oil",
]);

export const alertLevelEnum = pgEnum("alert_level", [
  "info",
  "warning",
  "critical",
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
    description: text("description"),
    body: text("body"),
    source: varchar("source", { length: 256 }).notNull(),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    image: text("image"),
    countries: text("countries").array(),
    entities: text("entities").array(),
    category: varchar("category", { length: 128 }),
    city: varchar("city", { length: 128 }),
    state: varchar("state", { length: 128 }),
    district: varchar("district", { length: 128 }),
    country: varchar("country", { length: 128 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    categories: text("categories").array(),
    importanceScore: integer("importance_score").notNull().default(0),
    showInFeed: integer("show_in_feed").notNull().default(1),
    language: varchar("language", { length: 64 }).notNull().default("en"),
    duplicateCount: integer("duplicate_count").notNull().default(1),
    sourceCount: integer("source_count").notNull().default(1),
    titleHash: varchar("title_hash", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    urlIdx: uniqueIndex("articles_url_idx").on(table.url),
    sourceIdx: index("articles_source_idx").on(table.source),
    publishedIdx: index("articles_published_idx").on(table.publishedAt),
    titleHashIdx: index("articles_title_hash_idx").on(table.titleHash),
    categoryIdx: index("articles_category_idx").on(table.category),
    importanceIdx: index("articles_importance_idx").on(table.importanceScore),
    showInFeedIdx: index("articles_show_in_feed_idx").on(table.showInFeed),
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

// ── Commodities Table ──────────────────────────────────

export const commodities = pgTable("commodities", {
  id: uuid("id").primaryKey().defaultRandom(),
  commodity: varchar("commodity", { length: 64 }).notNull(), // gold | silver | oil
  price: doublePrecision("price").notNull(),
  currency: varchar("currency", { length: 32 }).notNull(), // "USD/oz" | "USD/barrel"
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  source: varchar("source", { length: 256 }).notNull(),
});

// ── Resources Table ────────────────────────────────────

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    country: varchar("country", { length: 128 }).notNull(),
    resource: varchar("resource", { length: 64 }).notNull(), // gold | silver | oil
  },
  (table) => ({
    countryIdx: index("resources_country_idx").on(table.country),
  })
);

// ── Event Commodity References ─────────────────────────

export const eventCommodityRefs = pgTable(
  "event_commodity_refs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    commodity: commodityNameEnum("commodity").notNull(),
    category: geoEventCategoryEnum("category").notNull(),
    triggerType: varchar("trigger_type", { length: 128 }).notNull(),
    leaderName: varchar("leader_name", { length: 256 }),
    policyAction: varchar("policy_action", { length: 256 }),
    confidenceScore: confidenceEnum("confidence_score").notNull().default("medium"),
    rationale: text("rationale"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    eventIdIdx: index("event_commodity_refs_event_id_idx").on(table.eventId),
    commodityIdx: index("event_commodity_refs_commodity_idx").on(table.commodity),
    categoryIdx: index("event_commodity_refs_category_idx").on(table.category),
  })
);

// ── Commodity Correlations ─────────────────────────────

export const commodityCorrelations = pgTable(
  "commodity_correlations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    commodity: commodityNameEnum("commodity").notNull(),
    windowHours: integer("window_hours").notNull(),
    eventTimestamp: timestamp("event_timestamp", { withTimezone: true }).notNull(),
    priceBefore: doublePrecision("price_before"),
    priceAfter: doublePrecision("price_after"),
    absoluteChange: doublePrecision("absolute_change"),
    percentChange: doublePrecision("percent_change"),
    marketReaction: doublePrecision("market_reaction"),
    severityFactor: doublePrecision("severity_factor").notNull().default(1),
    commodityWeight: doublePrecision("commodity_weight").notNull().default(1),
    priceChangeFactor: doublePrecision("price_change_factor").notNull().default(1),
    impactScore: doublePrecision("impact_score"),
    source: varchar("source", { length: 256 }),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    eventIdIdx: index("commodity_corr_event_id_idx").on(table.eventId),
    commodityIdx: index("commodity_corr_commodity_idx").on(table.commodity),
    windowIdx: index("commodity_corr_window_idx").on(table.windowHours),
    uniqueEventWindowIdx: uniqueIndex("commodity_corr_event_window_idx").on(
      table.eventId,
      table.commodity,
      table.windowHours
    ),
  })
);

// ── Commodity Alerts ───────────────────────────────────

export const commodityAlerts = pgTable(
  "commodity_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    commodity: commodityNameEnum("commodity").notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    cause: text("cause").notNull(),
    level: alertLevelEnum("level").notNull().default("warning"),
    priceChangePercent: doublePrecision("price_change_percent"),
    impactScore: doublePrecision("impact_score"),
    acknowledged: integer("acknowledged").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    commodityIdx: index("commodity_alerts_commodity_idx").on(table.commodity),
    levelIdx: index("commodity_alerts_level_idx").on(table.level),
    createdIdx: index("commodity_alerts_created_idx").on(table.createdAt),
  })
);

// ── Commodity Webhooks ─────────────────────────────────

export const commodityWebhooks = pgTable(
  "commodity_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 128 }).notNull(),
    url: text("url").notNull(),
    secret: varchar("secret", { length: 256 }),
    enabled: integer("enabled").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    urlIdx: uniqueIndex("commodity_webhooks_url_idx").on(table.url),
  })
);

// ── Raw Articles Table ───────────────────────────────────

export const rawArticles = pgTable(
  "raw_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    content: text("content"),
    url: text("url").notNull(),
    source: varchar("source", { length: 256 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    urlIdx: uniqueIndex("raw_articles_url_idx").on(table.url),
    publishedIdx: index("raw_articles_published_idx").on(table.publishedAt),
  })
);

// ── Article Embeddings Table ─────────────────────────────

export const articleEmbeddings = pgTable(
  "article_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    embedding: doublePrecision("embedding").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    articleIdx: index("article_embeddings_article_idx").on(table.articleId),
  })
);

// ── Countries Table ──────────────────────────────────────

export const countries = pgTable(
  "countries",
  {
    id: varchar("id", { length: 128 }).primaryKey(), // country name (e.g. India)
    riskLevel: riskLevelEnum("risk_level").notNull().default("green"),
    riskScore: doublePrecision("risk_score").notNull().default(0.0),
    newsCount: integer("news_count").notNull().default(0),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

// ── Country Events Table ─────────────────────────────────

export const countryEvents = pgTable(
  "country_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countryId: varchar("country_id", { length: 128 })
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 128 }).notNull(),
    severity: doublePrecision("severity").notNull().default(1.0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    countryIdx: index("country_events_country_idx").on(table.countryId),
    articleIdx: index("country_events_article_idx").on(table.articleId),
    categoryIdx: index("country_events_category_idx").on(table.category),
    publishedIdx: index("country_events_published_idx").on(table.publishedAt),
  })
);

// ── Country Metrics Table ────────────────────────────────

export const countryMetrics = pgTable(
  "country_metrics",
  {
    country: varchar("country", { length: 128 }).primaryKey(),
    score: doublePrecision("score").notNull().default(0.0),
    articles: jsonb("articles").notNull().default([]),
    categories: jsonb("categories").notNull().default({}),
    commodities: jsonb("commodities").notNull().default([]),
    videos: jsonb("videos").notNull().default([]),
    timeline: jsonb("timeline").notNull().default([]),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

// ── Country Connections Table ─────────────────────────────

export const countryConnections = pgTable(
  "country_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceCountry: varchar("source_country", { length: 128 }).notNull(),
    targetCountry: varchar("target_country", { length: 128 }).notNull(),
    category: varchar("category", { length: 128 }).notNull(),
    connectionScore: doublePrecision("connection_score").notNull().default(0.0),
    eventCount: integer("event_count").notNull().default(0),
    severity: doublePrecision("severity").notNull().default(1.0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sourceIdx: index("country_conn_source_idx").on(table.sourceCountry),
    targetIdx: index("country_conn_target_idx").on(table.targetCountry),
    uniqueSourceTargetCategoryIdx: uniqueIndex("country_conn_uniq_idx").on(
      table.sourceCountry,
      table.targetCountry,
      table.category
    ),
  })
);


// ── Source Budget Table (Quota Engine) ────────────────────

export const sourceBudget = pgTable("source_budget", {
  source: varchar("source", { length: 128 }).primaryKey(),
  dailyLimit: integer("daily_limit").notNull(),
  used: integer("used").notNull().default(0),
  remaining: integer("remaining").notNull(),
  cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
  lastFetch: timestamp("last_fetch", { withTimezone: true }),
  enabled: integer("enabled").notNull().default(1),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
});

// ── Type exports for application use ───────────────────

export type SourceBudget = typeof sourceBudget.$inferSelect;
export type NewSourceBudget = typeof sourceBudget.$inferInsert;
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
export type Commodity = typeof commodities.$inferSelect;
export type NewCommodity = typeof commodities.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type EventCommodityRef = typeof eventCommodityRefs.$inferSelect;
export type NewEventCommodityRef = typeof eventCommodityRefs.$inferInsert;
export type CommodityCorrelation = typeof commodityCorrelations.$inferSelect;
export type NewCommodityCorrelation = typeof commodityCorrelations.$inferInsert;
export type CommodityAlert = typeof commodityAlerts.$inferSelect;
export type NewCommodityAlert = typeof commodityAlerts.$inferInsert;
export type CommodityWebhook = typeof commodityWebhooks.$inferSelect;
export type NewCommodityWebhook = typeof commodityWebhooks.$inferInsert;
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type ConfidenceLevel = (typeof confidenceEnum.enumValues)[number];
export type InfrastructureType =
  (typeof infrastructureTypeEnum.enumValues)[number];
export type ImpactType = (typeof impactTypeEnum.enumValues)[number];
export type ImpactSeverity = (typeof impactSeverityEnum.enumValues)[number];
export type RiskLevel = (typeof riskLevelEnum.enumValues)[number];
export type GeoEventCategory = (typeof geoEventCategoryEnum.enumValues)[number];
export type CommodityName = (typeof commodityNameEnum.enumValues)[number];
export type AlertLevel = (typeof alertLevelEnum.enumValues)[number];

export type RawArticle = typeof rawArticles.$inferSelect;
export type NewRawArticle = typeof rawArticles.$inferInsert;
export type ArticleEmbedding = typeof articleEmbeddings.$inferSelect;
export type NewArticleEmbedding = typeof articleEmbeddings.$inferInsert;
export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;
export type CountryEvent = typeof countryEvents.$inferSelect;
export type NewCountryEvent = typeof countryEvents.$inferInsert;
export type CountryMetrics = typeof countryMetrics.$inferSelect;
export type NewCountryMetrics = typeof countryMetrics.$inferInsert;
export type CountryConnections = typeof countryConnections.$inferSelect;
export type NewCountryConnections = typeof countryConnections.$inferInsert;

