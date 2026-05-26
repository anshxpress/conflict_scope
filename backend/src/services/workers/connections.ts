import { db, schema } from "../../../db";
import { and, gte, eq, sql } from "drizzle-orm";

/**
 * Maps the 10 NLP classifier categories to the 6 visual connection categories.
 */
export function mapToConnectionCategory(category: string): string {
  if (!category) return "Policy";
  const cat = category.toLowerCase();
  if (cat.includes("conflict") || cat.includes("war")) return "Conflict";
  if (cat.includes("commodity") || cat.includes("energy")) return "Commodity";
  if (cat.includes("trade")) return "Trade";
  if (cat.includes("policy") || cat.includes("government") || cat.includes("economy") || cat.includes("market")) return "Policy";
  if (cat.includes("tech")) return "Technology";
  if (cat.includes("health")) return "Health";
  
  // Fallbacks for other category classifications
  if (cat.includes("infrastructure")) return "Trade";
  if (cat.includes("environment")) return "Health";
  
  return "Policy";
}

/**
 * Scans articles from the last 30 days and compiles bidirectional influence scores.
 */
export async function recalculateConnections(): Promise<void> {
  console.log("[Connections Worker] Starting recalculation of country influence flow...");
  const startTime = Date.now();

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch articles from last 30 days
    const recentArticles = await db
      .select({
        id: schema.articles.id,
        countries: schema.articles.countries,
        category: schema.articles.category,
        publishedAt: schema.articles.publishedAt,
      })
      .from(schema.articles)
      .where(gte(schema.articles.publishedAt, thirtyDaysAgo));

    // Filter to articles that co-mention at least two countries
    const coMentionArticles = recentArticles.filter(
      (art) => art.countries && art.countries.length >= 2
    );

    console.log(`[Connections Worker] Found ${coMentionArticles.length} co-mention articles out of ${recentArticles.length} total from last 30 days.`);

    if (coMentionArticles.length === 0) {
      console.log("[Connections Worker] No country connections to calculate. Clearing table.");
      await db.delete(schema.countryConnections);
      return;
    }

    // 2. Fetch event severities to map each article's impact score
    const severities = await db
      .select({
        articleId: schema.countryEvents.articleId,
        severity: schema.countryEvents.severity,
      })
      .from(schema.countryEvents)
      .where(gte(schema.countryEvents.publishedAt, thirtyDaysAgo));

    const articleSeverityMap: Record<string, number[]> = {};
    for (const s of severities) {
      if (!articleSeverityMap[s.articleId]) {
        articleSeverityMap[s.articleId] = [];
      }
      articleSeverityMap[s.articleId].push(s.severity);
    }

    // 3. Aggregate relationships bidirectionally
    const connections: Record<string, {
      eventCount: number;
      totalSeverity: number;
      latestPublishedAt: Date;
    }> = {};

    for (const art of coMentionArticles) {
      const countriesList = art.countries!;
      const category = mapToConnectionCategory(art.category || "");
      const severityList = articleSeverityMap[art.id] || [];
      const avgSeverity = severityList.length > 0
        ? severityList.reduce((sum, s) => sum + s, 0) / severityList.length
        : 1.0;
      const publishedAt = art.publishedAt ? new Date(art.publishedAt) : new Date();

      // For every pair (A, B) where A !== B, register bidirectional relationships
      for (let i = 0; i < countriesList.length; i++) {
        for (let j = 0; j < countriesList.length; j++) {
          if (i === j) continue;
          const source = countriesList[i];
          const target = countriesList[j];

          const key = `${source}_${target}_${category}`;
          if (!connections[key]) {
            connections[key] = {
              eventCount: 0,
              totalSeverity: 0,
              latestPublishedAt: new Date(0),
            };
          }
          connections[key].eventCount++;
          connections[key].totalSeverity += avgSeverity;
          if (publishedAt.getTime() > connections[key].latestPublishedAt.getTime()) {
            connections[key].latestPublishedAt = publishedAt;
          }
        }
      }
    }

    // 4. Compute connection scores and prepare DB rows
    const rowsToInsert = Object.entries(connections).map(([key, data]) => {
      const [source, target, category] = key.split("_");
      const frequency = data.eventCount;
      const avgSeverity = data.totalSeverity / frequency;

      const now = Date.now();
      const ageDays = (now - data.latestPublishedAt.getTime()) / (1000 * 60 * 60 * 24);
      let recencyWeight = 1.0;
      if (ageDays <= 3) recencyWeight = 2.0;
      else if (ageDays <= 7) recencyWeight = 1.5;
      else if (ageDays <= 14) recencyWeight = 1.2;
      else if (ageDays <= 30) recencyWeight = 1.0;
      else recencyWeight = 0.5;

      // Calculate connection_score: frequency * impact_score * recency_weight
      // Mapped to our target ranges 1-20, 20-50, 50-100, 100+ via scaling factor of 10.
      const score = Math.min(150, Math.round(frequency * avgSeverity * recencyWeight * 10));

      return {
        sourceCountry: source,
        targetCountry: target,
        category,
        connectionScore: score,
        eventCount: frequency,
        severity: avgSeverity,
        updatedAt: new Date(),
      };
    });

    // 5. Save to database: wipe old and write fresh
    await db.delete(schema.countryConnections);

    if (rowsToInsert.length > 0) {
      // Chunk inserts of 100 to stay well clear of PostgreSQL param limit
      for (let i = 0; i < rowsToInsert.length; i += 100) {
        await db.insert(schema.countryConnections).values(rowsToInsert.slice(i, i + 100));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Connections Worker] Successfully updated ${rowsToInsert.length} relationships in ${duration}s.`);

  } catch (err) {
    console.error("[Connections Worker] Error recalculating country connections:", err);
  }
}
