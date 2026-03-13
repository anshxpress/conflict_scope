/**
 * Creates the new commodities and resources tables directly using Drizzle's
 * push functionality (no migration files needed for this project).
 *
 * Run with:
 *   cd backend && bun run scripts/migrate-commodity-tables.ts
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("[Migrate] Creating commodities table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS commodities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      commodity VARCHAR(64) NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      currency VARCHAR(32) NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source VARCHAR(256) NOT NULL
    )
  `);

  console.log("[Migrate] Creating resources table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS resources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      country VARCHAR(128) NOT NULL,
      resource VARCHAR(64) NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS resources_country_idx ON resources(country)
  `);

  console.log("[Migrate] Creating event_commodity_refs table...");
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE geo_event_category AS ENUM ('military', 'political', 'economic', 'policy');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE commodity_name AS ENUM ('gold', 'silver', 'oil');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE alert_level AS ENUM ('info', 'warning', 'critical');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_commodity_refs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      commodity commodity_name NOT NULL,
      category geo_event_category NOT NULL,
      trigger_type VARCHAR(128) NOT NULL,
      leader_name VARCHAR(256),
      policy_action VARCHAR(256),
      confidence_score confidence_level NOT NULL DEFAULT 'medium',
      rationale TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS event_commodity_refs_event_id_idx
    ON event_commodity_refs(event_id)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS event_commodity_refs_commodity_idx
    ON event_commodity_refs(commodity)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS event_commodity_refs_category_idx
    ON event_commodity_refs(category)
  `);

  console.log("[Migrate] Creating commodity_correlations table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS commodity_correlations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      commodity commodity_name NOT NULL,
      window_hours INTEGER NOT NULL,
      event_timestamp TIMESTAMPTZ NOT NULL,
      price_before DOUBLE PRECISION,
      price_after DOUBLE PRECISION,
      absolute_change DOUBLE PRECISION,
      percent_change DOUBLE PRECISION,
      market_reaction DOUBLE PRECISION,
      severity_factor DOUBLE PRECISION NOT NULL DEFAULT 1,
      commodity_weight DOUBLE PRECISION NOT NULL DEFAULT 1,
      price_change_factor DOUBLE PRECISION NOT NULL DEFAULT 1,
      impact_score DOUBLE PRECISION,
      source VARCHAR(256),
      computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS commodity_corr_event_id_idx
    ON commodity_correlations(event_id)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS commodity_corr_commodity_idx
    ON commodity_correlations(commodity)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS commodity_corr_window_idx
    ON commodity_correlations(window_hours)
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS commodity_corr_event_window_idx
    ON commodity_correlations(event_id, commodity, window_hours)
  `);

  console.log("[Migrate] Creating commodity_alerts table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS commodity_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID REFERENCES events(id) ON DELETE SET NULL,
      commodity commodity_name NOT NULL,
      title VARCHAR(256) NOT NULL,
      cause TEXT NOT NULL,
      level alert_level NOT NULL DEFAULT 'warning',
      price_change_percent DOUBLE PRECISION,
      impact_score DOUBLE PRECISION,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS commodity_alerts_commodity_idx
    ON commodity_alerts(commodity)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS commodity_alerts_level_idx
    ON commodity_alerts(level)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS commodity_alerts_created_idx
    ON commodity_alerts(created_at)
  `);

  console.log("[Migrate] Creating commodity_webhooks table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS commodity_webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(128) NOT NULL,
      url TEXT NOT NULL,
      secret VARCHAR(256),
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS commodity_webhooks_url_idx
    ON commodity_webhooks(url)
  `);

  console.log("[Migrate] Done.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[Migrate] Error:", err);
  process.exit(1);
});
