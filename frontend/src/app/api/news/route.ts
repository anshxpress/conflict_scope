import { NextResponse } from "next/server";

// ============================
// HTML ENTITY DECODER
// ============================

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'");
}

// ============================
// EXTRACT TAG CONTENT
// ============================

function extractTag(block: string, tag: string): string | undefined {
  // Handle both <tag>value</tag> and CDATA: <tag><![CDATA[value]]></tag>
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`,
    "i"
  );
  const m = block.match(re);
  if (!m) return undefined;
  return decodeHtml((m[1] ?? m[2] ?? "").trim());
}

// ============================
// RSS ITEM TYPE
// ============================

type NewsItem = {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
};

// ============================
// RSS FEEDS BY LANGUAGE
// ============================

const RSS_FEEDS: Record<string, string[]> = {
  hi: [
    "https://news.google.com/rss/search?q=युद्ध+भारत+सेना&hl=hi&gl=IN&ceid=IN:hi",
    "https://news.google.com/rss/search?q=पाकिस्तान+भारत+संघर्ष&hl=hi&gl=IN&ceid=IN:hi",
  ],
  en: [
    "https://news.google.com/rss/search?q=india+war+military&hl=en-IN&gl=IN&ceid=IN:en",
    "https://news.google.com/rss/search?q=india+border+conflict+attack&hl=en-IN&gl=IN&ceid=IN:en",
  ],
};

// ============================
// FETCH + PARSE ONE RSS FEED
// ============================

async function fetchRssFeed(
  rssUrl: string,
  cutoff: number
): Promise<NewsItem[]> {
  try {
    const res = await fetch(rssUrl, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[News] RSS fetch failed ${res.status}: ${rssUrl}`);
      return [];
    }

    const text = await res.text();
    const itemMatches = text.match(/<item[\s\S]*?<\/item>/g);
    if (!itemMatches) {
      console.warn(`[News] No <item> tags found in: ${rssUrl}`);
      return [];
    }

    const items: NewsItem[] = [];

    for (const block of itemMatches) {
      const title = extractTag(block, "title");
      const source = extractTag(block, "source");
      const pubDateStr = extractTag(block, "pubDate");

      // FIX: Use <guid> for URL (more reliable than <link> in Google RSS)
      const link =
        extractTag(block, "guid") || extractTag(block, "link") || "";

      // Skip if no title or link
      if (!title || !link) continue;

      // Filter by time cutoff
      const pubDate = pubDateStr ? Date.parse(pubDateStr) : 0;
      if (!pubDate || isNaN(pubDate) || pubDate < cutoff) continue;

      items.push({ title, link, source, pubDate: pubDateStr });
    }

    console.log(`[News] ${rssUrl.slice(0, 60)}... → ${items.length} items`);
    return items;
  } catch (err) {
    console.error(`[News] Error fetching ${rssUrl}:`, err);
    return [];
  }
}

// ============================
// DEDUPLICATE BY TITLE
// ============================

function deduplicateByTitle(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================
// SORT BY DATE
// ============================

function sortByDate(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
    const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
    return tb - ta;
  });
}

// ============================
// API ROUTE HANDLER
// ============================

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lang = url.searchParams.get("lang") ?? "en";
    const hours = Math.min(
      168,
      Math.max(1, parseInt(url.searchParams.get("hours") ?? "48", 10))
    );

    console.log(`[News] GET /api/news?lang=${lang}&hours=${hours}`);

    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const feeds = RSS_FEEDS[lang] ?? RSS_FEEDS["en"];

    // FIX: Fetch all feeds in parallel
    const results = await Promise.all(
      feeds.map((feedUrl) => fetchRssFeed(feedUrl, cutoff))
    );

    const allItems = results.flat();
    const deduped = deduplicateByTitle(allItems);
    const sorted = sortByDate(deduped);

    console.log(
      `[News] lang=${lang} hours=${hours} → ${allItems.length} raw, ${sorted.length} after dedup`
    );

    // FIX: Always return array (never { items: [] })
    return NextResponse.json(sorted, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  } catch (err) {
    console.error("[News] Route error:", err);
    // FIX: Return empty array on error, not { items: [] }
    return NextResponse.json([], { status: 200 });
  }
}