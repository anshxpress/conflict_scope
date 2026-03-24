import { NextResponse } from "next/server";
import { CHANNELS, CHANNEL_NAMES } from "@/lib/youtubeChannels";

// ============================
// ZERO QUOTA: YouTube RSS feeds (no API key, no quota)
// https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
// Returns ~15 most recent videos per channel.
// ============================

interface CacheEntry {
  data: YouTubeMediaResponse;
  timestamp: number;
  hours: number;
}

const g = globalThis as any;
if (!g._ytRssCache) g._ytRssCache = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface VideoItem {
  videoId: string;
  title: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  thumbnail: string;
  live: boolean;
  viewCount?: string;
}

interface YouTubeMediaResponse {
  news: VideoItem[];
  global: VideoItem[];
}

// ============================
// XML HELPERS
// ============================

function extractXml(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// ============================
// FETCH ONE CHANNEL VIA RSS
// ============================

async function fetchChannelRss(
  channelId: string,
  hours: number
): Promise<VideoItem[]> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;

  try {
    const res = await fetch(rssUrl, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      console.error(`[RSS] ${channelId} → HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();

    // Validate: a real channel feed always has <feed xmlns=...>
    if (!xml.includes("<feed")) {
      console.error(`[RSS] ${channelId} → invalid XML (wrong channel ID?)`);
      return [];
    }

    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

    if (entries.length === 0) {
      console.warn(`[RSS] ${channelId} → 0 entries (channel may have no videos)`);
      return [];
    }

    const channelName =
      CHANNEL_NAMES[channelId] ||
      decodeHtml(extractXml(xml, "title")) ||
      channelId;

    // Parse ALL entries first, then decide what to show
    const allVideos: VideoItem[] = [];

    for (const entry of entries) {
      const videoId =
        extractXml(entry, "yt:videoId") ||
        extractAttr(entry, "link", "href").match(/watch\?v=([a-zA-Z0-9_-]+)/)?.[1] ||
        "";

      if (!videoId) continue;

      const title = decodeHtml(extractXml(entry, "title"));
      if (!title) continue;

      // Skip Shorts
      if (title.toLowerCase().includes("#shorts")) continue;

      const publishedAt = extractXml(entry, "published") || new Date().toISOString();
      const thumbnail =
        extractAttr(entry, "media:thumbnail", "url") ||
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const viewCount = extractAttr(entry, "media:statistics", "views") || undefined;

      allVideos.push({
        videoId,
        title,
        channel: channelName,
        channelId,
        publishedAt,
        thumbnail,
        live: false,
        viewCount,
      });
    }

    // Try to return only videos within the requested time window
    const withinWindow = allVideos.filter((v) => {
      const t = Date.parse(v.publishedAt);
      return t && t >= cutoff;
    });

    // KEY FIX: If NO videos fall within the time window (channel posts infrequently),
    // fall back to showing the most recent 3 videos anyway so the panel is never blank.
    const result = withinWindow.length > 0 ? withinWindow : allVideos.slice(0, 3);

    console.log(
      `[RSS] ${channelName}: ${allVideos.length} total → ` +
      `${withinWindow.length} in last ${hours}h` +
      (withinWindow.length === 0 ? ` (showing ${result.length} latest as fallback)` : "")
    );

    return result;
  } catch (err) {
    console.error(`[RSS] ${channelId} fetch error:`, err);
    return [];
  }
}

// ============================
// SORT BY DATE
// ============================

function sortByDate<T extends { publishedAt: string }>(arr: T[]): T[] {
  return [...arr].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

// ============================
// MAIN FETCH
// ============================

async function getYouTubeMedia(hours: number): Promise<YouTubeMediaResponse> {
  const cached: CacheEntry | null = g._ytRssCache;
  if (
    cached &&
    cached.hours === hours &&
    Date.now() - cached.timestamp < CACHE_TTL
  ) {
    console.log(
      `[RSS] Cache hit — news: ${cached.data.news.length}, global: ${cached.data.global.length}`
    );
    return cached.data;
  }

  console.log(`[RSS] Fetching all channels (last ${hours}h)...`);

  const [newsResults, globalResults] = await Promise.all([
    Promise.all(CHANNELS.news.map((id) => fetchChannelRss(id, hours))),
    Promise.all(CHANNELS.global.map((id) => fetchChannelRss(id, hours))),
  ]);

  const result: YouTubeMediaResponse = {
    news: sortByDate(newsResults.flat()),
    global: sortByDate(globalResults.flat()),
  };

  console.log(
    `[RSS] Done — news: ${result.news.length}, global: ${result.global.length}`
  );

  // Log which channels returned 0 results (helps debug wrong channel IDs)
  CHANNELS.news.forEach((id, i) => {
    if (newsResults[i].length === 0) {
      console.warn(`[RSS] ⚠️  news channel ${id} (${CHANNEL_NAMES[id] ?? "unknown"}) returned 0 videos — check channel ID`);
    }
  });
  CHANNELS.global.forEach((id, i) => {
    if (globalResults[i].length === 0) {
      console.warn(`[RSS] ⚠️  global channel ${id} (${CHANNEL_NAMES[id] ?? "unknown"}) returned 0 videos — check channel ID`);
    }
  });

  g._ytRssCache = { data: result, timestamp: Date.now(), hours };
  return result;
}

// ============================
// API ROUTE HANDLER
// ============================

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const hours = Math.min(
      168,
      Math.max(1, parseInt(url.searchParams.get("hours") ?? "48", 10))
    );

    console.log(`[RSS] GET /api/youtube?hours=${hours}`);

    const data = await getYouTubeMedia(hours);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  } catch (err) {
    console.error("[RSS] Route error:", err);
    return NextResponse.json({ news: [], global: [] }, { status: 200 });
  }
}