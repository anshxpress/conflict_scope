import { db, schema } from "../../../db";
import { eq, gte, sql, count, and, ilike } from "drizzle-orm";
import { fetchAllFeeds, fetchGdeltArticles } from "../rss/feed-fetcher";
import { extractConflictEvent } from "../nlp/event-extractor";
import { geocodeFirstMatch } from "../geocoding/nominatim";
import { calculateConfidence } from "../verification/confidence";
import { mapEventToCommodities } from "../commodities/impact-mapping";
import { computeCommodityCorrelations } from "../commodities/correlation-engine";

/**
 * Main pipeline: Fetch → Store Article → Extract → Geocode → Store Event + Impacts → Risk
 *
 * Runs on a scheduled interval to process new conflict events from RSS feeds.
 * @param sinceMinutes  How far back to look in RSS feeds (default 30 min).
 */
export async function runPipeline(sinceMinutes = 30): Promise<number> {
  console.log(`\n[Pipeline] Starting conflict event pipeline (lookback: ${sinceMinutes}min)...`);
  const startTime = Date.now();
  let eventsCreated = 0;
  let impactsCreated = 0;
  let commodityMappingsCreated = 0;
  let articlesStored = 0;

  try {
    // Step 1: Fetch new articles from all RSS feeds + GDELT aggregator
    const [rssArticles, gdeltArticles] = await Promise.all([
      fetchAllFeeds(sinceMinutes),
      fetchGdeltArticles(sinceMinutes),
    ]);
    const articles = [...rssArticles, ...gdeltArticles];
    console.log(
      `[Pipeline] Fetched ${articles.length} articles (${rssArticles.length} RSS + ${gdeltArticles.length} GDELT)`
    );

    if (articles.length === 0) {
      await recalculateCountryRisk();
      return 0;
    }

    // Step 2-7: Process each article through NLP
    for (const article of articles) {
      try {
        // Check for duplicate by URL (in both sources and articles tables)
        const [existingSource] = await db
          .select({ id: schema.sources.id })
          .from(schema.sources)
          .where(eq(schema.sources.articleUrl, article.link))
          .limit(1);

        if (existingSource) continue;

        // Store raw article
        let articleId: string | undefined;
        try {
          const [stored] = await db
            .insert(schema.articles)
            .values({
              title: article.title,
              content: article.content,
              source: article.sourceName,
              url: article.link,
              publishedAt: article.publishedDate,
            })
            .onConflictDoNothing({ target: schema.articles.url })
            .returning({ id: schema.articles.id });
          articleId = stored?.id;
          if (articleId) articlesStored++;
        } catch {
          // Article may already exist - that's fine, continue
        }

        // Run NLP extraction — returns null for entertainment/noise/off-topic
        const extracted = extractConflictEvent(
          article.title,
          article.content,
          article.sourceName
        );

        if (!extracted || !extracted.isConflictRelated) {
          continue;
        }

        // Step 8: Geocode the location
        const geoResult = await geocodeFirstMatch(extracted.locations);
        if (!geoResult) {
          console.warn(
            `[Pipeline] Could not geocode locations for: ${article.title}`
          );
          continue;
        }

        // Deduplicate at event level: same/very-similar title within 24 hours
        // This catches the same story published by multiple RSS sources
        const titleWords = extracted.title
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 6)
          .join(" ");
        if (titleWords.length > 0) {
          const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const [dupEvent] = await db
            .select({ id: schema.events.id })
            .from(schema.events)
            .where(
              and(
                ilike(schema.events.title, `%${titleWords}%`),
                gte(schema.events.timestamp, cutoff24h)
              )
            )
            .limit(1);
          if (dupEvent) {
            console.debug(`[Pipeline] Skipped duplicate event: ${extracted.title}`);
            continue;
          }
        }

        // Calculate confidence
        const verification = calculateConfidence([article.sourceName]);

        // Step 9: Store event in database
        const [event] = await db
          .insert(schema.events)
          .values({
            title: extracted.title,
            description: extracted.description,
            eventType: extracted.eventType,
            country: geoResult.country || extracted.country,
            latitude: geoResult.latitude,
            longitude: geoResult.longitude,
            timestamp: article.publishedDate,
            confidenceScore: verification.confidence,
            sourceUrl: article.link,
            articleId: articleId ?? null,
          })
          .returning({ id: schema.events.id });

        // Store source reference
        await db.insert(schema.sources).values({
          eventId: event.id,
          sourceName: article.sourceName,
          articleUrl: article.link,
          publishedDate: article.publishedDate,
        });

        // Store extracted impacts
        if (extracted.impacts.length > 0) {
          await db.insert(schema.impacts).values(
            extracted.impacts.map((imp) => ({
              eventId: event.id,
              impactType: imp.impactType,
              description: imp.description,
              severity: imp.severity,
            }))
          );
          impactsCreated += extracted.impacts.length;
        }

        // Map and persist geopolitical commodity impacts
        const mappedImpacts = mapEventToCommodities({
          title: extracted.title,
          description: extracted.description,
          eventType: extracted.eventType,
          impacts: extracted.impacts,
        });

        if (mappedImpacts.length > 0) {
          await db.insert(schema.eventCommodityRefs).values(
            mappedImpacts.map((m) => ({
              eventId: event.id,
              commodity: m.commodity,
              category: extracted.eventCategory ?? m.category,
              triggerType: m.triggerType,
              leaderName: extracted.leaderName ?? m.leaderName,
              policyAction: extracted.policyAction ?? m.policyAction,
              confidenceScore: m.confidenceScore,
              rationale: m.rationale,
            }))
          );
          commodityMappingsCreated += mappedImpacts.length;

          await computeCommodityCorrelations({
            eventId: event.id,
            eventTimestamp: article.publishedDate,
            impacts: extracted.impacts,
            matches: mappedImpacts,
          });
        }

        eventsCreated++;
        console.log(
          `[Pipeline] Created event: "${extracted.title}" [${extracted.eventType}] in ${geoResult.country} (${extracted.impacts.length} impacts, ${mappedImpacts.length} commodity links)`
        );
      } catch (err) {
        console.error(
          `[Pipeline] Error processing article "${article.title}":`,
          err
        );
      }
    }

    // Cross-reference: update confidence for events with multiple sources
    await updateMultiSourceConfidence();

    // Recalculate persisted country risk levels
    await recalculateCountryRisk();
  } catch (err) {
    console.error("[Pipeline] Fatal pipeline error:", err);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[Pipeline] Complete. Created ${eventsCreated} events, ${impactsCreated} impacts, ${commodityMappingsCreated} commodity links, ${articlesStored} articles in ${duration}s\n`
  );
  return eventsCreated;
}

/**
 * After processing all new articles, recalculate confidence for events
 * that now have multiple corroborating sources.
 */
async function updateMultiSourceConfidence(): Promise<void> {
  // Find events with source counts
  const eventSourceCounts = await db
    .select({
      eventId: schema.sources.eventId,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.sources)
    .groupBy(schema.sources.eventId);

  for (const { eventId, count } of eventSourceCounts) {
    let newConfidence: "low" | "medium" | "high";
    if (count >= 3) newConfidence = "high";
    else if (count === 2) newConfidence = "medium";
    else continue; // Already handled at insert

    await db
      .update(schema.events)
      .set({ confidenceScore: newConfidence })
      .where(eq(schema.events.id, eventId));
  }
}

/**
 * Recalculate and persist country-level risk scores in the country_risk table.
 * Called after every pipeline run.
 */
async function recalculateCountryRisk(): Promise<void> {
  const now = Date.now();
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Get event counts per country for 14d and 30d windows
  const recentEvents = await db
    .select({
      country: schema.events.country,
      timestamp: schema.events.timestamp,
    })
    .from(schema.events)
    .where(gte(schema.events.timestamp, thirtyDaysAgo));

  const countryCounts: Record<string, { e14: number; e30: number }> = {};
  for (const ev of recentEvents) {
    const c = ev.country;
    if (!c) continue;
    if (!countryCounts[c]) countryCounts[c] = { e14: 0, e30: 0 };
    countryCounts[c].e30++;
    if (new Date(ev.timestamp).getTime() >= fourteenDaysAgo.getTime()) {
      countryCounts[c].e14++;
    }
  }

  // Upsert each country's risk
  for (const [country, counts] of Object.entries(countryCounts)) {
    const riskLevel: "red" | "orange" | "green" =
      counts.e14 > 0 ? "red" : counts.e30 > 0 ? "orange" : "green";

    await db
      .insert(schema.countryRisk)
      .values({
        country,
        riskLevel,
        eventsLast14Days: counts.e14,
        eventsLast30Days: counts.e30,
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.countryRisk.country,
        set: {
          riskLevel,
          eventsLast14Days: counts.e14,
          eventsLast30Days: counts.e30,
          lastUpdated: new Date(),
        },
      });
  }

  console.log(
    `[Pipeline] Updated risk levels for ${Object.keys(countryCounts).length} countries`
  );
}
