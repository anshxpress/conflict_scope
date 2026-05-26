import Parser from "rss-parser";
import { parse as parseHTML } from "node-html-parser";

export interface FeedArticle {
  title: string;
  link: string;
  content: string;
  sourceName: string;
  publishedDate: Date;
}

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  // tolerate feeds that omit XML namespace declarations
  customFields: { feed: [], item: [] },
});

interface FeedDef {
  name: string;
  url: string;
  fallback?: string;
}

const RSS_FEEDS: FeedDef[] = [
  // ── PRIMARY WIRE SERVICES ───────────────────────────────────────────────────

  // Reuters — world's largest international wire service
  {
    name: "Reuters",
    url: "https://news.yahoo.com/rss/reuters",
  },
  // Associated Press — foundational global wire service
  {
    name: "Associated Press",
    url: "https://news.yahoo.com/rss/associated-press",
  },

  // ── PRIMARY BROADCASTERS ────────────────────────────────────────────────────

  // BBC
  {
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
  },
  // Al Jazeera
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  // CNN International
  {
    name: "CNN International",
    url: "http://rss.cnn.com/rss/edition_world.rss",
  },

  // ── SECONDARY QUALITY SOURCES ───────────────────────────────────────────────

  // The Guardian — world
  {
    name: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
  },
  // New York Times — world
  {
    name: "New York Times",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  },
  // DW (Deutsche Welle)
  {
    name: "DW World",
    url: "https://rss.dw.com/rdf/rss-en-world",
  },
  // Sky News world
  {
    name: "Sky News World",
    url: "https://feeds.skynews.com/feeds/rss/world.xml",
  },
  // NPR World News
  {
    name: "NPR World",
    url: "https://feeds.npr.org/1004/rss.xml",
  },

  // ── REGIONAL GAP FEEDS ──────────────────────────────────────────────────────

  // France 24 — Africa (Mali, DRC, Niger, Burkina Faso, Sudan, Ethiopia)
  {
    name: "France 24 Africa",
    url: "https://www.france24.com/en/africa/rss",
  },
  // France 24 — Middle East (Gaza, Syria, Iraq, Iran, Yemen, Lebanon)
  {
    name: "France 24 Middle East",
    url: "https://www.france24.com/en/middle-east/rss",
  },
  // France 24 — Americas (Mexico, Colombia, Venezuela, Haiti, Brazil)
  {
    name: "France 24 Americas",
    url: "https://www.france24.com/en/americas/rss",
  },

  // UN News — authoritative global (peacekeeping, UNHCR, humanitarian ops)
  {
    name: "UN News",
    url: "https://news.google.com/rss/search?q=site:news.un.org&hl=en-US&gl=US&ceid=US:en",
  },

  // ReliefWeb — humanitarian crises (displacement, aid corridors, camp sieges)
  {
    name: "ReliefWeb",
    url: "https://reliefweb.int/updates/rss.xml",
  },

  // Middle East Eye — investigative depth on Gaza, Yemen, Libya, Lebanon
  {
    name: "Middle East Eye",
    url: "https://www.middleeasteye.net/rss",
  },

  // The Hindu — South Asia: India, Afghanistan, Pakistan, Sri Lanka
  {
    name: "The Hindu",
    url: "https://www.thehindu.com/news/international/?service=rss",
  },

  // South China Morning Post — China, Taiwan, North Korea, SE Asia (Myanmar, Philippines)
  {
    name: "South China Morning Post",
    url: "https://www.scmp.com/rss/91/feed",
  },

  // ── MARITIME / SHIPPING THREAT FEEDS ────────────────────────────────────────

  // gCaptain — #1 maritime news source, covers ship attacks, Hormuz, Bab el-Mandeb
  {
    name: "gCaptain",
    url: "https://gcaptain.com/feed/",
  },
  // Lloyd's List — authoritative shipping intelligence
  {
    name: "Lloyd's List",
    url: "https://lloydslist.maritimeintelligence.informa.com/rss-feeds",
    fallback: "https://gcaptain.com/feed/",
  },
  // Splash 247 — vessel incidents, piracy, armed shipping attack reports
  {
    name: "Splash 247",
    url: "https://splash247.com/feed/",
  },
];

/**
 * Fetch all configured RSS feeds and return articles from the last N minutes.
 */
export async function fetchAllFeeds(
  sinceMinutes: number = 30
): Promise<FeedArticle[]> {
  const cutoff = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const allArticles: FeedArticle[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) =>
      fetchSingleFeedWithFallback(feed.name, feed.url, feed.fallback, cutoff)
    )
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allArticles.push(...result.value);
    } else {
      console.warn(`[RSS] Feed fetch failed: ${result.reason}`);
    }
  }

  return allArticles;
}

async function fetchSingleFeedWithFallback(
  sourceName: string,
  url: string,
  fallbackUrl: string | undefined,
  cutoff: Date
): Promise<FeedArticle[]> {
  try {
    return await fetchSingleFeed(sourceName, url, cutoff);
  } catch (primaryErr) {
    if (fallbackUrl) {
      console.warn(
        `[RSS] ${sourceName} primary failed (${primaryErr}), trying fallback…`
      );
      return await fetchSingleFeed(sourceName, fallbackUrl, cutoff);
    }
    throw primaryErr;
  }
}

async function fetchSingleFeed(
  sourceName: string,
  url: string,
  cutoff: Date
): Promise<FeedArticle[]> {
  // Manually fetch so we can strip BOM/leading whitespace before parsing.
  // Some feeds (e.g. UN News) prepend a UTF-8 BOM (U+FEFF) which causes
  // rss-parser to throw "Non-whitespace before first tag".
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/rss+xml, application/atom+xml, text/xml, */*",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  const rawText = await response.text();
  // Strip UTF-8 BOM (U+FEFF) and any leading whitespace
  const xmlText = rawText.replace(/^\uFEFF/, "").trimStart();

  const feed = await parser.parseString(xmlText);
  const articles: FeedArticle[] = [];

  for (const item of feed.items ?? []) {
    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
    if (pubDate < cutoff) continue;

    const rawContent =
      item.contentSnippet || item.content || item.summary || "";
    const cleanContent = stripHTML(rawContent);

    if (!item.title || !item.link) continue;

    articles.push({
      title: item.title,
      link: item.link,
      content: cleanContent,
      sourceName,
      publishedDate: pubDate,
    });
  }

  console.log(
    `[RSS] ${sourceName}: fetched ${articles.length} articles since cutoff`
  );
  return articles;
}

function stripHTML(html: string): string {
  try {
    const root = parseHTML(html);
    return root.textContent.trim();
  } catch {
    return html.replace(/<[^>]*>/g, "").trim();
  }
}

// ── GDELT DOC 2.0 Aggregator ────────────────────────────────────────────────
// Queries GDELT's global event database for English-language conflict articles
// from reputable domains. Supplements the RSS feeds above.

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;     // "20260309T060000Z"
  domain: string;
  language: string;
  sourcecountry: string;
}

// Only accept GDELT articles from known-quality English-language domains
const GDELT_TRUSTED_DOMAINS = new Set([
  "reuters.com",
  "apnews.com",
  "bbc.com", "bbc.co.uk",
  "aljazeera.com",
  "cnn.com",
  "theguardian.com",
  "nytimes.com",
  "france24.com",
  "dw.com",
  "npr.org",
]);

/**
 * Fetch conflict-related articles from the GDELT DOC 2.0 API.
 * Returns articles matching conflict keywords, filtered to English +
 * trusted domains only.
 */
export async function fetchGdeltArticles(
  sinceMinutes: number = 30
): Promise<FeedArticle[]> {
  const timespan = `${sinceMinutes}min`;
  const query = encodeURIComponent(
    "(airstrike OR missile OR shelling OR bombing OR ceasefire OR invasion OR troops OR military operation)"
  );
  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc` +
    `?query=${query}&mode=ArtList&maxrecords=50&format=json&timespan=${timespan}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "ConflictScope/1.0 (OSINT Research Platform)" },
    });

    if (!res.ok) {
      console.warn(`[GDELT] HTTP ${res.status}`);
      return [];
    }

    const json = (await res.json()) as { articles?: GdeltArticle[] };
    const raw = json.articles ?? [];

    const articles: FeedArticle[] = [];
    for (const a of raw) {
      if (a.language !== "English") continue;
      const domain = a.domain?.toLowerCase();
      if (!GDELT_TRUSTED_DOMAINS.has(domain)) continue;

      // Parse GDELT seendate format "20260309T060000Z"
      const year = a.seendate.slice(0, 4);
      const month = a.seendate.slice(4, 6);
      const day = a.seendate.slice(6, 8);
      const hour = a.seendate.slice(9, 11);
      const min = a.seendate.slice(11, 13);
      const sec = a.seendate.slice(13, 15);
      const pubDate = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);

      articles.push({
        title: a.title,
        link: a.url,
        content: "",   // GDELT doesn't provide body text; NLP uses title
        sourceName: `GDELT:${domain}`,
        publishedDate: pubDate,
      });
    }

    console.log(
      `[GDELT] Fetched ${articles.length} trusted English articles (of ${raw.length} total)`
    );
    return articles;
  } catch (err) {
    console.warn("[GDELT] Fetch failed:", err);
    return [];
  }
}

/**
 * Fetch conflict articles from GNews API using user key.
 */
export async function fetchGNewsArticles(
  sinceMinutes: number = 30
): Promise<FeedArticle[]> {
  const apiKey = process.env.GNEWS_KEY;
  if (!apiKey) {
    console.log("[GNews] No API key found, skipping.");
    return [];
  }

  const cutoff = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const query = encodeURIComponent("airstrike OR missile OR shelling OR explosion OR ceasefire");
  const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&token=${apiKey}&max=15`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[GNews] HTTP error ${res.status}`);
      return [];
    }
    const json = (await res.json()) as {
      articles?: Array<{
        title: string;
        url: string;
        description?: string;
        content?: string;
        publishedAt: string;
        source?: { name?: string };
      }>;
    };

    const articles: FeedArticle[] = [];
    for (const a of json.articles ?? []) {
      const pubDate = a.publishedAt ? new Date(a.publishedAt) : new Date();
      if (pubDate < cutoff) continue;

      articles.push({
        title: a.title,
        link: a.url,
        content: stripHTML(a.description || a.content || ""),
        sourceName: `GNews:${a.source?.name || "Unknown"}`,
        publishedDate: pubDate,
      });
    }

    console.log(`[GNews] Fetched ${articles.length} articles since cutoff`);
    return articles;
  } catch (err) {
    console.warn("[GNews] Fetch failed:", err);
    return [];
  }
}

/**
 * Fetch conflict articles from NewsAPI using user key.
 */
export async function fetchNewsApiArticles(
  sinceMinutes: number = 30
): Promise<FeedArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    console.log("[NewsAPI] No API key found, skipping.");
    return [];
  }

  const cutoff = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const query = encodeURIComponent("(airstrike OR missile OR shelling OR explosion OR ceasefire)");
  const url = `https://newsapi.org/v2/everything?q=${query}&language=en&pageSize=15&sortBy=publishedAt&apiKey=${apiKey}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ConflictScope/1.0 (OSINT Research Platform)",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`[NewsAPI] HTTP error ${res.status}`);
      return [];
    }
    const json = (await res.json()) as {
      articles?: Array<{
        title: string;
        url: string;
        description?: string;
        content?: string;
        publishedAt: string;
        source?: { name?: string };
      }>;
    };

    const articles: FeedArticle[] = [];
    for (const a of json.articles ?? []) {
      const pubDate = a.publishedAt ? new Date(a.publishedAt) : new Date();
      if (pubDate < cutoff) continue;

      articles.push({
        title: a.title,
        link: a.url,
        content: stripHTML(a.description || a.content || ""),
        sourceName: `NewsAPI:${a.source?.name || "Unknown"}`,
        publishedDate: pubDate,
      });
    }

    console.log(`[NewsAPI] Fetched ${articles.length} articles since cutoff`);
    return articles;
  } catch (err) {
    console.warn("[NewsAPI] Fetch failed:", err);
    return [];
  }
}

/**
 * Fetch conflict articles from NewsData.io API using user key.
 */
export async function fetchNewsDataArticles(
  sinceMinutes: number = 30
): Promise<FeedArticle[]> {
  const apiKey = process.env.NEWSDATA_KEY;
  if (!apiKey) {
    console.log("[NewsData] No API key found, skipping.");
    return [];
  }

  const cutoff = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const query = encodeURIComponent("airstrike OR missile OR shelling OR explosion OR ceasefire");
  const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${query}&language=en`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[NewsData] HTTP error ${res.status}`);
      return [];
    }
    const json = (await res.json()) as {
      results?: Array<{
        title: string;
        link: string;
        description?: string;
        content?: string;
        pubDate?: string;
        source_id?: string;
      }>;
    };

    const articles: FeedArticle[] = [];
    for (const a of json.results ?? []) {
      const pubDate = a.pubDate ? new Date(a.pubDate) : new Date();
      if (pubDate < cutoff) continue;

      articles.push({
        title: a.title,
        link: a.link,
        content: stripHTML(a.description || a.content || ""),
        sourceName: `NewsData:${a.source_id || "Unknown"}`,
        publishedDate: pubDate,
      });
    }

    console.log(`[NewsData] Fetched ${articles.length} articles since cutoff`);
    return articles;
  } catch (err) {
    console.warn("[NewsData] Fetch failed:", err);
    return [];
  }
}

/**
 * Aggregates all enabled third-party APIs (GNews, NewsAPI, NewsData.io).
 */
export async function fetchThirdPartyNews(
  sinceMinutes: number = 30
): Promise<FeedArticle[]> {
  console.log(`[Pipeline] Querying active third-party news APIs (lookback: ${sinceMinutes}m)...`);
  const [gnews, newsapi, newsdata] = await Promise.allSettled([
    fetchGNewsArticles(sinceMinutes),
    fetchNewsApiArticles(sinceMinutes),
    fetchNewsDataArticles(sinceMinutes),
  ]);

  const allArticles: FeedArticle[] = [];

  if (gnews.status === "fulfilled") allArticles.push(...gnews.value);
  else console.warn("[Pipeline] GNews fetch failed:", gnews.reason);

  if (newsapi.status === "fulfilled") allArticles.push(...newsapi.value);
  else console.warn("[Pipeline] NewsAPI fetch failed:", newsapi.reason);

  if (newsdata.status === "fulfilled") allArticles.push(...newsdata.value);
  else console.warn("[Pipeline] NewsData fetch failed:", newsdata.reason);

  console.log(`[Pipeline] Ingested ${allArticles.length} total articles from third-party APIs`);
  return allArticles;
}

const YOUTUBE_CHANNELS = [
  "UCZFMm1mMw0F81Z37aaEzTUA", // NDTV
  "UCt4t-jeY85JegMlZ-E5UWtA", // Aaj Tak
  "UC_gUM8rL-Lrg6O3adPW9K1g", // WION
  "UC6RJ7-PaXg6TIH2BzZfTV7w", // Times Now
  "UCMk9Tdc-d1BIcAFaSppiVkw", // Times Now Navbharat
  "UCilbgr035NJ7BIkVPMeLyWA", // Republic TV
  "UC16niRr50-MSBwiO3YDb3RA", // BBC News
  "UCupvZG-5ko_eiXAupbDfxWw", // CNN
  "UCNye-wNBqNL5ZzHSJj3l8Bg", // Al Jazeera English
  "UCknLrEdhRCp1aegoMqRaCZg", // DW News
  "UChqUTb7kYRX8-EiaN3XFrSQ", // Reuters
];

/**
 * Fetch latest YouTube videos from configured global news channels via RSS feeds.
 */
export async function fetchYouTubeArticles(
  sinceMinutes: number = 30
): Promise<FeedArticle[]> {
  console.log(`[YouTube RSS] Fetching videos from channels (lookback: ${sinceMinutes}m)...`);
  const cutoff = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const articles: FeedArticle[] = [];

  const results = await Promise.allSettled(
    YOUTUBE_CHANNELS.map(async (channelId) => {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        });
        if (!response.ok) return [];
        const rawText = await response.text();
        const xmlText = rawText.replace(/^\uFEFF/, "").trimStart();
        const feed = await parser.parseString(xmlText);
        const channelTitle = feed.title || `YouTube Channel: ${channelId}`;

        const channelVideos: FeedArticle[] = [];
        for (const item of feed.items ?? []) {
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
          if (pubDate < cutoff) continue;
          if (!item.title || !item.link) continue;

          channelVideos.push({
            title: item.title,
            link: item.link,
            content: item.contentSnippet || item.title,
            sourceName: `YouTube:${channelTitle.replace(" - YouTube", "")}`,
            publishedDate: pubDate,
          });
        }
        return channelVideos;
      } catch (err) {
        console.warn(`[YouTube RSS] Failed for channel ${channelId}:`, err);
        return [];
      }
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      articles.push(...r.value);
    }
  }

  console.log(`[YouTube RSS] Fetched ${articles.length} videos since cutoff`);
  return articles;
}

