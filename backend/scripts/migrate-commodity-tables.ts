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

  console.log("[Migrate] Done.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[Migrate] Error:", err);
  process.exit(1);
});
