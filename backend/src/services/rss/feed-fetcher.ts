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
    "User-Agent": "ConflictScope/1.0 (OSINT Research Platform)",
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
    url: "https://www.reuters.com/world/rss",
  },
  // Associated Press — foundational global wire service
  {
    name: "Associated Press",
    url: "https://apnews.com/hub/ap-top-news?outputType=rss",
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
    url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
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
      "User-Agent": "ConflictScope/1.0 (OSINT Research Platform)",
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
