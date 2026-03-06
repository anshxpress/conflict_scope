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
});

const RSS_FEEDS = [
  {
    name: "Reuters World",
    url: "https://feeds.reuters.com/Reuters/worldNews",
  },
  {
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  {
    name: "GDELT",
    url: "https://api.gdeltproject.org/api/v2/doc/doc?query=conflict%20OR%20war%20OR%20attack&mode=ArtList&format=rss&maxrecords=50&sort=DateDesc",
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
    RSS_FEEDS.map((feed) => fetchSingleFeed(feed.name, feed.url, cutoff))
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

async function fetchSingleFeed(
  sourceName: string,
  url: string,
  cutoff: Date
): Promise<FeedArticle[]> {
  const feed = await parser.parseURL(url);
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
