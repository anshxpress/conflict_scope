import { db, schema } from "../../../db";
import { eq, gte, sql, count, and, desc } from "drizzle-orm";
import {
  fetchAllFeeds,
  fetchGdeltArticles,
  fetchGNewsArticles,
  fetchNewsApiArticles,
  fetchYouTubeArticles,
} from "../rss/feed-fetcher";
import { getEmbedding, cosineSimilarity } from "../nlp/embeddings";
import { classifyArticle } from "../nlp/classifier";
import { detectCountries } from "../nlp/country-detector";
import { geocodeLocation } from "../geocoding/nominatim";
import { mapEventToCommodities } from "../commodities/impact-mapping";
import { computeCommodityCorrelations } from "../commodities/correlation-engine";

// Memory buffer for database failures (Postgres crash recovery)
export const dbMemoryBuffer: any[] = [];
const MAX_BUFFER_SIZE = 500;

// Demonyms and capital mapping to standard country coordinates (fallback if Nominatim fails)
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "India": [20.5937, 78.9629],
  "Saudi Arabia": [23.8859, 45.0792],
  "Russia": [61.5240, 105.3188],
  "Ukraine": [48.3794, 31.1656],
  "United States": [37.0902, -95.7129],
  "China": [35.8617, 104.1954],
  "Iran": [32.4279, 53.6880],
  "Israel": [31.0461, 34.8516],
  "Palestine": [31.9522, 35.2332],
  "United Kingdom": [55.3781, -3.4360],
  "Germany": [51.1657, 10.4515],
  "France": [46.2276, 2.2137],
  "Japan": [36.2048, 138.2529],
  "Yemen": [15.5527, 48.5164],
  "Syria": [34.8021, 38.9968],
  "Sudan": [12.8628, 30.2176],
  "Pakistan": [30.3753, 69.3451],
  "Taiwan": [23.6978, 120.9605],
  "Venezuela": [6.4238, -66.5897],
  "Iraq": [33.2232, 43.6793],
};

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "cant", "cannot", "could",
  "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during", "each", "few", "for",
  "from", "further", "had", "hadnt", "has", "hasnt", "have", "havent", "having", "he", "hed", "hell", "hes",
  "her", "here", "heres", "hers", "herself", "him", "himself", "his", "how", "hows", "i", "id", "ill", "im",
  "ive", "if", "in", "into", "is", "isnt", "it", "its", "itself", "lets", "me", "more", "most", "mustnt", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours",
  "ourselves", "out", "over", "own", "same", "shant", "she", "shed", "shell", "shes", "should", "shouldnt",
  "so", "some", "such", "than", "that", "thats", "the", "their", "theirs", "them", "themselves", "then",
  "there", "theres", "these", "they", "theyd", "theyll", "theyre", "theyve", "this", "those", "through",
  "to", "too", "under", "until", "up", "very", "was", "wasnt", "we", "wed", "well", "were", "weve", "werent",
  "what", "whats", "when", "whens", "where", "wheres", "which", "while", "who", "whos", "whom", "why", "whys",
  "with", "wont", "would", "wouldnt", "you", "youd", "youll", "youre", "youve", "your", "yours", "yourself",
  "yourselves"
]);

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 0 && !STOPWORDS.has(word))
    .join(" ");
}

/**
 * Increments quota usage for a source.
 */
async function recordQuotaUsage(sourceName: string) {
  try {
    const [budget] = await db
      .select()
      .from(schema.sourceBudget)
      .where(eq(schema.sourceBudget.source, sourceName))
      .limit(1);

    if (budget) {
      const newUsed = budget.used + 1;
      const newRemaining = Math.max(0, budget.dailyLimit - newUsed);
      await db
        .update(schema.sourceBudget)
        .set({
          used: newUsed,
          remaining: newRemaining,
          lastFetch: new Date(),
        })
        .where(eq(schema.sourceBudget.source, sourceName));
      console.log(`[QuotaEngine] Recorded request for ${sourceName}. Remaining: ${newRemaining}/${budget.dailyLimit}`);
    }
  } catch (err) {
    console.error(`[QuotaEngine] Failed to record quota for ${sourceName}:`, err);
  }
}

/**
 * Flushes memory-buffered articles from previous database connection failures.
 */
async function flushMemoryBuffer() {
  if (dbMemoryBuffer.length === 0) return;
  console.log(`[Pipeline] DB is healthy. Attempting to flush ${dbMemoryBuffer.length} articles from memory buffer...`);
  const items = [...dbMemoryBuffer];
  dbMemoryBuffer.length = 0; // Clear
  let successfullyFlushed = 0;

  for (const item of items) {
    try {
      // URL deduplication check
      const [existing] = await db
        .select()
        .from(schema.articles)
        .where(eq(schema.articles.url, item.url))
        .limit(1);

      if (existing) {
        await db
          .update(schema.articles)
          .set({
            duplicateCount: existing.duplicateCount + 1,
          })
          .where(eq(schema.articles.id, existing.id));
        continue;
      }

      await db.insert(schema.articles).values(item);
      successfullyFlushed++;
    } catch (err) {
      console.error("[Pipeline] Failed to flush article, pushing back to buffer:", err);
      if (dbMemoryBuffer.length < MAX_BUFFER_SIZE) {
        dbMemoryBuffer.push(item);
      }
    }
  }
  console.log(`[Pipeline] Successfully flushed ${successfullyFlushed} articles from buffer.`);
}

/**
 * Main platform pipeline entry point (delegates to individual source ingestion pipelines).
 */
export async function runPipeline(sinceMinutes = 30): Promise<number> {
  const rssCount = await runPipelineForSource("rss", sinceMinutes);
  const gdeltCount = await runPipelineForSource("gdelt", sinceMinutes);
  const gnewsCount = await runPipelineForSource("gnews", sinceMinutes);
  const newsapiCount = await runPipelineForSource("newsapi", sinceMinutes);
  return rssCount + gdeltCount + gnewsCount + newsapiCount;
}

/**
 * Ingests and processes articles for a specific target source.
 */
export async function runPipelineForSource(
  sourceName: "rss" | "gdelt" | "gnews" | "newsapi" | "youtube",
  sinceMinutes = 30
): Promise<number> {
  console.log(`\n[Pipeline] Starting Ingestion for source "${sourceName}" (lookback: ${sinceMinutes}m)...`);
  const startTime = Date.now();

  let rawArticlesSaved = 0;
  let articlesStored = 0;
  let duplicatesMerged = 0;
  const affectedCountries = new Set<string>();

  try {
    // Attempt to flush memory buffer if DB is up
    await flushMemoryBuffer();
  } catch (dbTestErr) {
    console.warn("[Pipeline] Database check failed, skipping buffer flush.", dbTestErr);
  }

  // 1. Fetch raw articles from target source
  let rawArticles: any[] = [];
  try {
    if (sourceName === "rss") {
      rawArticles = await fetchAllFeeds(sinceMinutes);
    } else if (sourceName === "gdelt") {
      rawArticles = await fetchGdeltArticles(sinceMinutes);
    } else if (sourceName === "gnews") {
      rawArticles = await fetchGNewsArticles(sinceMinutes);
    } else if (sourceName === "newsapi") {
      rawArticles = await fetchNewsApiArticles(sinceMinutes);
    } else if (sourceName === "youtube") {
      rawArticles = await fetchYouTubeArticles(sinceMinutes);
    }

    // Success! Record quota usage
    await recordQuotaUsage(sourceName);
  } catch (fetchErr) {
    console.error(`[Pipeline] Failed to fetch articles for ${sourceName}:`, fetchErr);
    throw fetchErr; // rethrow to trigger consecutive failures logic in scheduler
  }

  console.log(`[Pipeline] Source "${sourceName}" returned ${rawArticles.length} raw articles.`);
  if (rawArticles.length === 0) {
    return 0;
  }

  // Load recent embeddings from last 24h for Layer 3 semantic checks
  let recentEmbeddings: any[] = [];
  try {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    recentEmbeddings = await db
      .select({
        id: schema.articles.id,
        title: schema.articles.title,
        body: schema.articles.body,
        description: schema.articles.description,
        url: schema.articles.url,
        titleHash: schema.articles.titleHash,
        duplicateCount: schema.articles.duplicateCount,
        sourceCount: schema.articles.sourceCount,
        embedding: schema.articleEmbeddings.embedding,
      })
      .from(schema.articleEmbeddings)
      .innerJoin(schema.articles, eq(schema.articleEmbeddings.articleId, schema.articles.id))
      .where(gte(schema.articleEmbeddings.createdAt, cutoff24h));
  } catch (dbErr) {
    console.warn("[Pipeline] Failed to load recent embeddings due to DB error. Dynamic semantic deduplication will be bypassed.", dbErr);
  }

  for (const raw of rawArticles) {
    try {
      // --- UNIFIED NORMALIZATION OBJECT ---
      const normalized = {
        title: raw.title || "",
        content: raw.content || "",
        description: raw.content ? raw.content.slice(0, 300) : "",
        body: raw.content || "",
        url: raw.link || raw.url,
        source: raw.sourceName || sourceName,
        publishedAt: raw.publishedDate || new Date(),
        language: "en",
        countries: [] as string[],
        entities: [] as string[],
        category: "",
      };

      // Extract countries using headline prioritized NER
      const countriesList = detectCountries(normalized.title, normalized.description, normalized.body);
      if (countriesList.length === 0) {
        // Skip if no country detected
        continue;
      }
      normalized.countries = countriesList;

      // Classify category into 10 groups
      const category = classifyArticle(normalized.title, normalized.description, normalized.body);
      normalized.category = category;

      // Save to raw_articles audit table (ignore if DB is down)
      try {
        await db
          .insert(schema.rawArticles)
          .values({
            title: normalized.title,
            content: normalized.content,
            url: normalized.url,
            source: normalized.source,
            publishedAt: normalized.publishedAt,
          })
          .onConflictDoNothing({ target: schema.rawArticles.url });
        rawArticlesSaved++;
      } catch (rawErr) {
        // Safe to ignore raw audit failure
      }

      // ── DEDUPLICATION LAYER 1: Exact URL Match ──
      let existingByUrl: any = null;
      try {
        [existingByUrl] = await db
          .select({
            id: schema.articles.id,
            duplicateCount: schema.articles.duplicateCount,
            sourceCount: schema.articles.sourceCount,
            body: schema.articles.body,
          })
          .from(schema.articles)
          .where(eq(schema.articles.url, normalized.url))
          .limit(1);
      } catch (dbErr) {
        // If DB down, existingByUrl remains null
      }

      if (existingByUrl) {
        try {
          const newBodyLen = normalized.content.length;
          const oldBodyLen = (existingByUrl.body || "").length;
          const updateObj: Record<string, any> = {
            duplicateCount: existingByUrl.duplicateCount + 1,
            sourceCount: existingByUrl.sourceCount + 1,
          };
          if (newBodyLen > oldBodyLen) {
            updateObj.body = normalized.content;
            updateObj.description = normalized.description;
          }
          await db
            .update(schema.articles)
            .set(updateObj)
            .where(eq(schema.articles.id, existingByUrl.id));
          duplicatesMerged++;
        } catch (dbErr) {
          console.error("[Pipeline] DB failed during URL deduplication update:", dbErr);
        }
        continue;
      }

      // ── DEDUPLICATION LAYER 2: Normalized Title Hash ──
      const titleHash = normalizeTitle(normalized.title);
      let existingByTitle: any = null;
      if (titleHash.length > 0) {
        try {
          [existingByTitle] = await db
            .select({
              id: schema.articles.id,
              duplicateCount: schema.articles.duplicateCount,
              sourceCount: schema.articles.sourceCount,
              body: schema.articles.body,
            })
            .from(schema.articles)
            .where(eq(schema.articles.titleHash, titleHash))
            .limit(1);
        } catch (dbErr) {
          // If DB down, existingByTitle remains null
        }
      }

      if (existingByTitle) {
        try {
          const newBodyLen = normalized.content.length;
          const oldBodyLen = (existingByTitle.body || "").length;
          const updateObj: Record<string, any> = {
            duplicateCount: existingByTitle.duplicateCount + 1,
            sourceCount: existingByTitle.sourceCount + 1,
          };
          if (newBodyLen > oldBodyLen) {
            updateObj.body = normalized.content;
            updateObj.description = normalized.description;
          }
          await db
            .update(schema.articles)
            .set(updateObj)
            .where(eq(schema.articles.id, existingByTitle.id));
          duplicatesMerged++;
        } catch (dbErr) {
          console.error("[Pipeline] DB failed during Title Hash deduplication update:", dbErr);
        }
        continue;
      }

      // ── DEDUPLICATION LAYER 3: Semantic Embeddings similarity (sentence-transformers) ──
      let newEmbedding: number[] | null = null;
      try {
        const textToEmbed = `${normalized.title} ${normalized.description}`;
        newEmbedding = await getEmbedding(textToEmbed);
      } catch (embedErr) {
        console.warn("[Pipeline] Embedding generation failed. Falling back to Stage 2 Title Deduplication only.", embedErr);
      }

      let semanticDuplicate = false;
      let matchedArticle: any = null;
      let matchedSimilarity = 0;

      if (newEmbedding && recentEmbeddings.length > 0) {
        for (const existing of recentEmbeddings) {
          const sim = cosineSimilarity(newEmbedding, existing.embedding);
          if (sim >= 0.85) {
            semanticDuplicate = true;
            if (sim > matchedSimilarity) {
              matchedSimilarity = sim;
              matchedArticle = existing;
            }
          }
        }
      }

      if (semanticDuplicate && matchedArticle) {
        // --- UPGRADED CONFLICTSCOPE BRACKETS ---
        // >= 0.97: Duplicate
        // 0.92-0.97: Near duplicate
        // 0.85-0.92: Cluster (skip merging, save as unique)
        if (matchedSimilarity >= 0.92) {
          try {
            const newBodyLen = normalized.content.length;
            const oldBodyLen = (matchedArticle.body || "").length;
            const updateObj: Record<string, any> = {
              duplicateCount: matchedArticle.duplicateCount + 1,
              sourceCount: matchedArticle.sourceCount + 1,
            };
            if (newBodyLen > oldBodyLen) {
              updateObj.body = normalized.content;
              updateObj.description = normalized.description;
            }
            await db
              .update(schema.articles)
              .set(updateObj)
              .where(eq(schema.articles.id, matchedArticle.id));
            duplicatesMerged++;
          } catch (dbErr) {
            console.error("[Pipeline] DB failed during Semantic duplicate update:", dbErr);
          }
          continue;
        } else {
          console.log(`[Pipeline] Article similarity is ${matchedSimilarity.toFixed(3)} (0.85 - 0.92). Ingesting as related cluster node: "${normalized.title}"`);
        }
      }

      // ── UNIQUE ARTICLE PROCESSING (SAVE TO DATABASE) ──
      let storedArticleId = "";
      try {
        const [storedArticle] = await db
          .insert(schema.articles)
          .values({
            title: normalized.title,
            content: normalized.content,
            description: normalized.description,
            body: normalized.body,
            source: normalized.source,
            url: normalized.url,
            publishedAt: normalized.publishedAt,
            countries: normalized.countries,
            category: normalized.category,
            language: normalized.language,
            titleHash,
          })
          .returning({ id: schema.articles.id });

        storedArticleId = storedArticle.id;

        // Store high-dimensional embedding if available
        if (newEmbedding) {
          await db
            .insert(schema.articleEmbeddings)
            .values({
              articleId: storedArticle.id,
              embedding: newEmbedding,
            });
        }

        articlesStored++;
      } catch (dbErr) {
        // --- DATABASE FAILURE RECOVERY BUFFER ---
        console.error(`[Pipeline] Database insertion failed for "${normalized.title}". Queuing in-memory buffer.`, dbErr);
        if (dbMemoryBuffer.length < MAX_BUFFER_SIZE) {
          dbMemoryBuffer.push({
            title: normalized.title,
            content: normalized.content,
            description: normalized.description,
            body: normalized.body,
            source: normalized.source,
            url: normalized.url,
            publishedAt: normalized.publishedAt,
            countries: normalized.countries,
            category: normalized.category,
            language: normalized.language,
            titleHash,
          });
        }
        continue;
      }

      // ── Legacy Event Mapping & Commodity Correlation ──
      if (storedArticleId) {
        try {
          const firstCountry = countriesList[0];
          const [lat, lng] = COUNTRY_COORDS[firstCountry] || [20.0, 77.0];

          let legacyEventType: any = "armed_conflict";
          const titleLower = normalized.title.toLowerCase();
          if (titleLower.includes("airstrike") || titleLower.includes("bombing") || titleLower.includes("bomb")) {
            legacyEventType = "airstrike";
          } else if (titleLower.includes("missile") || titleLower.includes("rocket")) {
            legacyEventType = "missile_strike";
          } else if (titleLower.includes("drone") || titleLower.includes("uav")) {
            legacyEventType = "drone_strike";
          } else if (titleLower.includes("explosion") || titleLower.includes("blast")) {
            legacyEventType = "explosion";
          } else if (titleLower.includes("refinery") || titleLower.includes("pipeline") || titleLower.includes("port") || titleLower.includes("power")) {
            legacyEventType = "infrastructure_attack";
          }

          const [storedEvent] = await db
            .insert(schema.events)
            .values({
              title: normalized.title,
              description: normalized.description,
              eventType: legacyEventType,
              country: firstCountry,
              latitude: lat,
              longitude: lng,
              timestamp: normalized.publishedAt,
              confidenceScore: "high",
              sourceUrl: normalized.url,
              articleId: storedArticleId,
            })
            .returning({ id: schema.events.id });

          await db.insert(schema.sources).values({
            eventId: storedEvent.id,
            sourceName: normalized.source,
            articleUrl: normalized.url,
            publishedDate: normalized.publishedAt,
          });

          const impactsList = [{ severity: "medium" as const }];

          const commodityMatches = mapEventToCommodities({
            title: normalized.title,
            description: normalized.body,
            eventType: legacyEventType,
            impacts: impactsList,
          });

          if (commodityMatches.length > 0) {
            for (const match of commodityMatches) {
              await db
                .insert(schema.eventCommodityRefs)
                .values({
                  eventId: storedEvent.id,
                  commodity: match.commodity,
                  category: match.category,
                  triggerType: match.triggerType,
                  leaderName: match.leaderName,
                  policyAction: match.policyAction,
                  confidenceScore: match.confidenceScore,
                  rationale: match.rationale,
                  createdAt: normalized.publishedAt,
                });
            }

            await computeCommodityCorrelations({
              eventId: storedEvent.id,
              eventTimestamp: normalized.publishedAt,
              impacts: impactsList,
              matches: commodityMatches,
            });
          }
        } catch (err) {
          console.error(`[Pipeline] Failed legacy event mapping for "${normalized.title}":`, err);
        }
      }

      // ── Connect event to countries ──
      for (const country of countriesList) {
        affectedCountries.add(country);

        try {
          // Ensure country exists in database
          await db
            .insert(schema.countries)
            .values({
              id: country,
              riskLevel: "green",
              riskScore: 0.0,
              newsCount: 0,
              lastUpdated: new Date(),
            })
            .onConflictDoNothing({ target: schema.countries.id });

          // Map country relation (countryEvents table)
          if (storedArticleId) {
            await db
              .insert(schema.countryEvents)
              .values({
                countryId: country,
                articleId: storedArticleId,
                category,
                severity: 1.0,
                publishedAt: normalized.publishedAt,
              });
          }
        } catch (err) {
          console.error(`[Pipeline] Failed linking country relation for ${country}:`, err);
        }
      }

    } catch (err) {
      console.error(`[Pipeline] Error processing raw article "${raw.title}":`, err);
    }
  }

  // --- Dynamic incremental caching updates ---
  // In V2, we only cache general map risk levels here. Detailed intelligence is compiled dynamically on-demand.
  if (affectedCountries.size > 0) {
    console.log(`[Pipeline] Recalculating metrics and caching for ${affectedCountries.size} affected countries...`);
    for (const countryName of affectedCountries) {
      try {
        await updateCountryMetrics(countryName);
      } catch (err) {
        console.error(`[Pipeline] Dynamic metrics compilation failed for ${countryName}:`, err);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Pipeline] Source "${sourceName}" execution complete in ${duration}s.`);
  console.log(`[Pipeline] Audited Raw Articles: ${rawArticlesSaved}, Unique Stored: ${articlesStored}, Duplicates Blocked: ${duplicatesMerged}`);

  return articlesStored;
}

/**
 * Pre-calculates and caches the 10-minute country metrics for the interactive Map Centroid Bubble system
 */
export async function updateCountryMetrics(specificCountry?: string): Promise<void> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let targetCountries: string[] = [];
  if (specificCountry) {
    targetCountries = [specificCountry];
  } else {
    // Get all countries with events in last 30 days
    const countriesList = await db
      .selectDistinct({ countryId: schema.countryEvents.countryId })
      .from(schema.countryEvents)
      .where(gte(schema.countryEvents.publishedAt, thirtyDaysAgo));
    targetCountries = countriesList.map((c) => c.countryId);
  }

  for (const country of targetCountries) {
    try {
      // Get all articles for this country in the last 30 days
      const events = await db
        .select({
          id: schema.articles.id,
          title: schema.articles.title,
          description: schema.articles.description,
          body: schema.articles.body,
          url: schema.articles.url,
          source: schema.articles.source,
          publishedAt: schema.articles.publishedAt,
          image: schema.articles.image,
          category: schema.articles.category,
          duplicateCount: schema.articles.duplicateCount,
          severity: schema.countryEvents.severity,
        })
        .from(schema.countryEvents)
        .innerJoin(schema.articles, eq(schema.countryEvents.articleId, schema.articles.id))
        .where(
          and(
            eq(schema.countryEvents.countryId, country),
            gte(schema.countryEvents.publishedAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(schema.articles.publishedAt));

      if (events.length === 0) {
        // Safe reset if no recent events
        await db
          .insert(schema.countries)
          .values({
            id: country,
            riskLevel: "green",
            riskScore: 0.0,
            newsCount: 0,
            lastUpdated: new Date(),
          })
          .onConflictDoUpdate({
            target: schema.countries.id,
            set: {
              riskLevel: "green",
              riskScore: 0.0,
              newsCount: 0,
              lastUpdated: new Date(),
            },
          });

        await db
          .insert(schema.countryMetrics)
          .values({
            country,
            score: 0,
            articles: [],
            categories: {},
            commodities: [],
            videos: [],
            timeline: [],
            lastUpdated: new Date(),
          })
          .onConflictDoUpdate({
            target: schema.countryMetrics.country,
            set: {
              score: 0,
              articles: [],
              categories: {},
              commodities: [],
              videos: [],
              timeline: [],
              lastUpdated: new Date(),
            },
          });
        continue;
      }

      // Check date ranges to determine risk level
      let riskLevel: "red" | "orange" | "green" = "green";
      const newsCount = events.length;

      let hasRecent7d = false;
      let hasRecent14d = false;

      for (const ev of events) {
        if (!ev.publishedAt) continue;
        const ts = new Date(ev.publishedAt).getTime();
        if (ts >= sevenDaysAgo.getTime()) {
          hasRecent7d = true;
        } else if (ts >= fourteenDaysAgo.getTime()) {
          hasRecent14d = true;
        }
      }

      if (hasRecent7d) {
        riskLevel = "red";
      } else if (hasRecent14d) {
        riskLevel = "orange";
      } else {
        riskLevel = "green";
      }

      // Calculate risk score: intensity = severity * volume
      let totalSeverity = 0;
      const categoryCounts: Record<string, number> = {};
      const timelineNodes: any[] = [];
      const affectedCommodities = new Set<string>();

      for (const ev of events) {
        totalSeverity += ev.severity || 1.0;
        
        // Count categories
        const cat = ev.category || "Government / Laws / Policies";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        // Collect affected commodities
        const textToSearch = `${ev.title} ${ev.description} ${ev.body}`.toLowerCase();
        if (textToSearch.includes("oil") || textToSearch.includes("refinery") || textToSearch.includes("pipeline") || textToSearch.includes("crude")) {
          affectedCommodities.add("oil");
        }
        if (textToSearch.includes("gold") || textToSearch.includes("safe-haven") || textToSearch.includes("bullion")) {
          affectedCommodities.add("gold");
        }
        if (textToSearch.includes("silver") || textToSearch.includes("industrial metals")) {
          affectedCommodities.add("silver");
        }

        // Add to timeline
        timelineNodes.push({
          date: ev.publishedAt,
          title: ev.title,
          category: cat,
          severity: ev.severity || 1.0,
          url: ev.url,
          source: ev.source,
        });
      }

      const avgSeverity = totalSeverity / newsCount;
      // Risk score representing severity * volume
      const score = Math.min(100, Math.round(Math.log2(newsCount + 1) * avgSeverity * 15));

      // Fetch matching YouTube videos from the last 7 days for this country
      const recentVideos = await db
        .select({
          id: schema.articles.id,
          title: schema.articles.title,
          url: schema.articles.url,
          source: schema.articles.source,
          publishedAt: schema.articles.publishedAt,
        })
        .from(schema.articles)
        .where(
          and(
            sql`${schema.articles.source} LIKE 'YouTube%'`,
            gte(schema.articles.publishedAt, sevenDaysAgo)
          )
        );

      const countryLower = country.toLowerCase();
      const filteredVideos = recentVideos
        .filter((v) => 
          v.title.toLowerCase().includes(countryLower) || 
          v.source.toLowerCase().includes(countryLower)
        )
        .slice(0, 5)
        .map((v) => {
          const videoId = v.url.match(/(?:v=|\/embed\/|\/watch\?v=|\/v\/|youtu\.be\/|\/vi\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1] || "";
          return {
            videoId,
            title: v.title,
            channel: v.source.replace("YouTube:", ""),
            publishedAt: v.publishedAt,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          };
        });

      // Update countries table
      await db
        .insert(schema.countries)
        .values({
          id: country,
          riskLevel,
          riskScore: score,
          newsCount,
          lastUpdated: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.countries.id,
          set: {
            riskLevel,
            riskScore: score,
            newsCount,
            lastUpdated: new Date(),
          },
        });

      // Update country metrics table
      await db
        .insert(schema.countryMetrics)
        .values({
          country,
          score,
          articles: events.slice(0, 10).map(e => ({
            id: e.id,
            title: e.title,
            description: e.description,
            url: e.url,
            source: e.source,
            publishedAt: e.publishedAt,
            image: e.image,
            category: e.category,
            duplicateCount: e.duplicateCount,
          })),
          categories: categoryCounts,
          commodities: Array.from(affectedCommodities),
          videos: filteredVideos,
          timeline: timelineNodes.slice(0, 8),
          lastUpdated: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.countryMetrics.country,
          set: {
            score,
            articles: events.slice(0, 10).map(e => ({
              id: e.id,
              title: e.title,
              description: e.description,
              url: e.url,
              source: e.source,
              publishedAt: e.publishedAt,
              image: e.image,
              category: e.category,
              duplicateCount: e.duplicateCount,
            })),
            categories: categoryCounts,
            commodities: Array.from(affectedCommodities),
            videos: filteredVideos,
            timeline: timelineNodes.slice(0, 8),
            lastUpdated: new Date(),
          },
        });

    } catch (err) {
      console.error(`[Metrics] Error calculating metrics for country ${country}:`, err);
    }
  }
}
