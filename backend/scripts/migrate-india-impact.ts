import { db } from "../db";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("[Migration] Running manual DB migration for India Impact Engine...");

  // 1. Alter articles table to ensure all required fields exist
  console.log("[Migration] Altering articles table to add columns...");
  
  await db.execute(sql`
    ALTER TABLE articles 
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS body TEXT,
    ADD COLUMN IF NOT EXISTS image TEXT,
    ADD COLUMN IF NOT EXISTS countries TEXT[],
    ADD COLUMN IF NOT EXISTS entities TEXT[],
    ADD COLUMN IF NOT EXISTS category VARCHAR(128),
    ADD COLUMN IF NOT EXISTS city VARCHAR(128),
    ADD COLUMN IF NOT EXISTS state VARCHAR(128),
    ADD COLUMN IF NOT EXISTS district VARCHAR(128),
    ADD COLUMN IF NOT EXISTS country VARCHAR(128),
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS categories TEXT[],
    ADD COLUMN IF NOT EXISTS importance_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS show_in_feed INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS language VARCHAR(64) NOT NULL DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS duplicate_count INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS source_count INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS title_hash VARCHAR(256)
  `);

  // 2. Create indexes for articles table
  console.log("[Migration] Creating indexes on articles table...");
  await db.execute(sql`CREATE INDEX IF NOT EXISTS articles_importance_idx ON articles(importance_score)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS articles_show_in_feed_idx ON articles(show_in_feed)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS articles_title_hash_idx ON articles(title_hash)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS articles_category_idx ON articles(category)`);

  // 3. Create raw_articles table if not exists
  console.log("[Migration] Creating raw_articles table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS raw_articles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      content TEXT,
      url TEXT NOT NULL,
      source VARCHAR(256) NOT NULL,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS raw_articles_url_idx ON raw_articles(url)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS raw_articles_published_idx ON raw_articles(published_at)`);

  // 4. Create article_embeddings table if not exists
  console.log("[Migration] Creating article_embeddings table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS article_embeddings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      embedding DOUBLE PRECISION[] NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS article_embeddings_article_idx ON article_embeddings(article_id)`);

  // 5. Create countries table if not exists
  console.log("[Migration] Creating countries table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS countries (
      id VARCHAR(128) PRIMARY KEY,
      risk_level risk_level NOT NULL DEFAULT 'green',
      risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      news_count INTEGER NOT NULL DEFAULT 0,
      last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // 6. Create country_events table if not exists
  console.log("[Migration] Creating country_events table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS country_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      country_id VARCHAR(128) NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
      article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      category VARCHAR(128) NOT NULL,
      severity DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS country_events_country_idx ON country_events(country_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS country_events_article_idx ON country_events(article_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS country_events_category_idx ON country_events(category)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS country_events_published_idx ON country_events(published_at)`);

  // 7. Create country_metrics table if not exists
  console.log("[Migration] Creating country_metrics table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS country_metrics (
      country VARCHAR(128) PRIMARY KEY,
      score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      articles JSONB NOT NULL DEFAULT '[]'::JSONB,
      categories JSONB NOT NULL DEFAULT '{}'::JSONB,
      commodities JSONB NOT NULL DEFAULT '[]'::JSONB,
      videos JSONB NOT NULL DEFAULT '[]'::JSONB,
      timeline JSONB NOT NULL DEFAULT '[]'::JSONB,
      last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // 8. Create country_connections table if not exists
  console.log("[Migration] Creating country_connections table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS country_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_country VARCHAR(128) NOT NULL,
      target_country VARCHAR(128) NOT NULL,
      category VARCHAR(128) NOT NULL,
      connection_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      event_count INTEGER NOT NULL DEFAULT 0,
      severity DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS country_conn_source_idx ON country_connections(source_country)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS country_conn_target_idx ON country_connections(target_country)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS country_conn_uniq_idx ON country_connections(source_country, target_country, category)`);

  // 9. Create source_budget table if not exists
  console.log("[Migration] Creating source_budget table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS source_budget (
      source VARCHAR(128) PRIMARY KEY,
      daily_limit INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      remaining INTEGER NOT NULL,
      cooldown_until TIMESTAMPTZ,
      last_fetch TIMESTAMPTZ,
      enabled INTEGER NOT NULL DEFAULT 1,
      consecutive_failures INTEGER NOT NULL DEFAULT 0
    )
  `);

  // 10. Backfill any existing articles in db to have a default importance score
  console.log("[Migration] Backfilling existing articles importance score...");
  await db.execute(sql`
    UPDATE articles 
    SET importance_score = 65, show_in_feed = 1 
    WHERE importance_score IS NULL OR importance_score = 0
  `);

  console.log("[Migration] DB migration completed successfully!");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("[Migration] Migration failed:", err);
  process.exit(1);
});
