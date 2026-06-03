import { CATEGORY_ROUTES } from "./category_router";
import {
  fetchGNewsArticles,
  fetchNewsApiArticles,
  fetchNewsDataArticles,
  fetchGdeltArticles,
  fetchAllFeeds,
  FeedArticle
} from "../rss/feed-fetcher";
import { redis } from "../../lib/redis";

/**
 * Fetch category-specific news from targeted APIs and RSS feeds.
 * Uses query caching to conserve API quotas.
 */
export async function fetchNews(
  category: string,
  sinceMinutes: number = 30
): Promise<FeedArticle[]> {
  const route = CATEGORY_ROUTES[category];
  if (!route) {
    console.warn(`[FetchEngine] No category route found for "${category}"`);
    return [];
  }

  console.log(`[FetchEngine] Ingesting for category "${category}" using queries: ${route.queries.join(", ")}`);
  
  const allCategoryArticles: FeedArticle[] = [];

  // Loop through queries & sources
  for (const query of route.queries) {
    // Combine query with "India" to keep it country-centric as per system guidelines
    const searchQuery = `"${query}" India`;

    const apiFetches = route.sources.map(async (source) => {
      // Don't call RSS in query loop; RSS is a bulk fetch handled separately
      if (source === "rss" || source === "gdelt" || source === "youtube") return [];

      const cacheKey = `news:query:cache:${source}:${query.replace(/\s+/g, "_")}`;
      
      // 1. Try Cache First
      try {
        const cached = await redis.get<FeedArticle[]>(cacheKey);
        if (cached) {
          console.log(`[FetchEngine] Cache HIT for ${source} query="${query}"`);
          return cached;
        }
      } catch (err) {
        console.warn(`[FetchEngine] Redis cache read error:`, err);
      }

      // 2. Fetch Fresh
      console.log(`[FetchEngine] Cache MISS for ${source} query="${query}". Fetching from API...`);
      let articles: FeedArticle[] = [];
      try {
        if (source === "gnews") {
          articles = await fetchGNewsArticles(sinceMinutes, searchQuery);
        } else if (source === "newsapi") {
          articles = await fetchNewsApiArticles(sinceMinutes, searchQuery);
        } else if (source === "newsdata") {
          articles = await fetchNewsDataArticles(sinceMinutes, searchQuery);
        }

        // Cache the result for 10 minutes (600 seconds)
        if (articles.length > 0) {
          await redis.set(cacheKey, articles, 10 * 60);
        }
      } catch (err) {
        console.error(`[FetchEngine] Failed fetching ${source} for query "${query}":`, err);
      }

      return articles;
    });

    const results = await Promise.allSettled(apiFetches);
    for (const r of results) {
      if (r.status === "fulfilled") {
        allCategoryArticles.push(...r.value);
      }
    }
  }

  // ── GDELT Special Query Ingestion ──
  if (route.sources.includes("gdelt")) {
    // Build GDELT OR query for all category terms
    const orTerms = route.queries.map((q) => `"${q}"`).join(" OR ");
    const gdeltQuery = `(${orTerms}) (India OR Delhi OR Mumbai OR Bengaluru OR Chennai OR Kolkata OR Hyderabad OR Pune)`;
    const cacheKey = `news:query:cache:gdelt:${category}`;

    try {
      const cached = await redis.get<FeedArticle[]>(cacheKey);
      if (cached) {
        allCategoryArticles.push(...cached);
      } else {
        const gdeltArticles = await fetchGdeltArticles(sinceMinutes, gdeltQuery);
        if (gdeltArticles.length > 0) {
          await redis.set(cacheKey, gdeltArticles, 10 * 60);
        }
        allCategoryArticles.push(...gdeltArticles);
      }
    } catch (err) {
      console.warn(`[FetchEngine] GDELT ingestion failed for category "${category}":`, err);
    }
  }

  // ── RSS Bulk Fetch & Local Filter ──
  if (route.sources.includes("rss")) {
    try {
      // RSS fetchAllFeeds retrieves all RSS items in bulk
      const rssArticles = await fetchAllFeeds(sinceMinutes);
      
      // Filter RSS articles by category query terms locally
      const filteredRss = rssArticles.filter((article) => {
        const titleLower = article.title.toLowerCase();
        const descLower = (article.content || "").toLowerCase();
        const text = `${titleLower} ${descLower}`;
        return route.queries.some((q) => text.includes(q.toLowerCase()));
      });

      console.log(`[FetchEngine] RSS local filtering for "${category}" kept ${filteredRss.length}/${rssArticles.length} articles`);
      allCategoryArticles.push(...filteredRss);
    } catch (err) {
      console.error(`[FetchEngine] RSS ingestion failed for category "${category}":`, err);
    }
  }

  // Deduplicate merged results locally before passing to pipeline
  const seenUrls = new Set<string>();
  const uniqueArticles = allCategoryArticles.filter((article) => {
    if (seenUrls.has(article.link)) return false;
    seenUrls.add(article.link);
    return true;
  });

  console.log(`[FetchEngine] Category "${category}" ingestion complete. Merged ${uniqueArticles.length} unique articles.`);
  return uniqueArticles;
}
