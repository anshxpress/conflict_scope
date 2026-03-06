import { db, schema } from "../../../db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { fetchAllFeeds } from "../rss/feed-fetcher";
import { extractConflictEvent } from "../nlp/event-extractor";
import { geocodeFirstMatch } from "../geocoding/nominatim";
import { calculateConfidence } from "../verification/confidence";

/**
 * Main pipeline: Fetch → Extract → Geocode → Store
 *
 * Runs on a scheduled interval to process new conflict events from RSS feeds.
 */
export async function runPipeline(): Promise<number> {
  console.log("\n[Pipeline] Starting conflict event pipeline...");
  const startTime = Date.now();
  let eventsCreated = 0;

  try {
    // Step 1: Fetch new articles from all RSS feeds
    const articles = await fetchAllFeeds(30);
    console.log(
      `[Pipeline] Fetched ${articles.length} articles from all feeds`
    );

    if (articles.length === 0) return 0;

    // Step 2-7: Process each article through NLP
    for (const article of articles) {
      try {
        // Check for duplicate by URL
        const existing = await db
          .select({ id: schema.sources.id })
          .from(schema.sources)
          .where(eq(schema.sources.articleUrl, article.link))
          .limit(1);

        if (existing.length > 0) continue;

        // Run NLP extraction
        const extracted = extractConflictEvent(
          article.title,
          article.content,
          article.sourceName
        );

        if (!extracted || !extracted.isConflictRelated) continue;

        // Step 8: Geocode the location
        const geoResult = await geocodeFirstMatch(extracted.locations);
        if (!geoResult) {
          console.warn(
            `[Pipeline] Could not geocode locations for: ${article.title}`
          );
          continue;
        }

        // Calculate confidence
        const verification = calculateConfidence([article.sourceName]);

        // Step 9: Store in database
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
          })
          .returning({ id: schema.events.id });

        // Store source reference
        await db.insert(schema.sources).values({
          eventId: event.id,
          sourceName: article.sourceName,
          articleUrl: article.link,
          publishedDate: article.publishedDate,
        });

        eventsCreated++;
        console.log(
          `[Pipeline] Created event: "${extracted.title}" [${extracted.eventType}] in ${geoResult.country}`
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
  } catch (err) {
    console.error("[Pipeline] Fatal pipeline error:", err);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[Pipeline] Complete. Created ${eventsCreated} events in ${duration}s\n`
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
