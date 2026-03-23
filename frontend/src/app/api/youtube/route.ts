import { NextResponse } from "next/server";
import { CHANNELS, CHANNEL_NAMES } from "@/lib/youtubeChannels";

// ============================
// YOUTUBE API CONFIG
// ============================

const API_KEY = process.env.YOUTUBE_API_KEY!;
const BASE_URL = "https://www.googleapis.com/youtube/v3/search";

// ============================
// IN-MEMORY CACHE
// ============================

interface CacheEntry {
  data: YouTubeMediaResponse;
  timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ============================
// TYPES
// ============================

interface VideoItem {
  videoId: string;
  title: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  thumbnail: string;
  live: boolean;
  duration?: string;
  viewCount?: string;
}

interface YouTubeMediaResponse {
  news: VideoItem[];
  global: VideoItem[];
}

// ============================
// UTILITY FUNCTIONS
// ============================

function getLast24HoursISO(): string {
  const now = new Date();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return past.toISOString();
}

// TEMPORARILY DISABLED for testing - was too strict
// function isRelevant(title: string): boolean {
//   const t = title.toLowerCase();
//   const keywords = [
//     "war",
//     "conflict",
//     "military",
//     "attack",
//     "breaking",
//     "news",
//     "tension",
//     "strike",
//     "defense",
//     "border",
//     "war",
//     "युद्ध",
//     "हमला",
//     "जंग",
//   ];
//   return keywords.some((keyword) => t.includes(keyword));
// }

// Always return true to show all videos for testing
function isRelevant(title: string): boolean {
  console.log(`[DEBUG isRelevant] Checking title: "${title}"`);
  const result = true;
  console.log(`[DEBUG isRelevant] Result: ${result}`);
  return result;
}

function isNotShort(title: string): boolean {
  return !title.toLowerCase().includes("shorts");
}

// ============================
// FETCH FROM YOUTUBE
// ============================

async function fetchChannelVideos(channelId: string): Promise<VideoItem[]> {
  const publishedAfter = getLast24HoursISO();
  const maxResults = 5;

  const url = `${BASE_URL}?part=snippet&channelId=${channelId}&order=date&maxResults=${maxResults}&type=video&publishedAfter=${publishedAfter}&key=${API_KEY}`;

  console.log(`[DEBUG fetchChannelVideos] Fetching from channel: ${channelId}`);
  console.log(`[DEBUG fetchChannelVideos] URL: ${url.replace(API_KEY, '***API_KEY***')}`);

  try {
    const res = await fetch(url);
    console.log(`[DEBUG fetchChannelVideos] Response status: ${res.status}`);

    if (!res.ok) {
      console.error(`YouTube API error for channel ${channelId}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    console.log(`[DEBUG fetchChannelVideos] Raw items count: ${data.items?.length || 0}`);

    if (!data.items || !Array.isArray(data.items)) {
      console.log(`[DEBUG fetchChannelVideos] No items found for channel: ${channelId}`);
      return [];
    }

    const videos = data.items
      .filter((item: any) => item.id?.videoId)
      .map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
        live: item.snippet.liveBroadcastContent === "live",
      }));

    console.log(`[DEBUG fetchChannelVideos] Mapped ${videos.length} videos from channel: ${channelId}`);
    videos.forEach((v: VideoItem) => console.log(`[DEBUG fetchChannelVideos]   - "${v.title}"`));

    return videos;
  } catch (err) {
    console.error(`Error fetching videos for channel ${channelId}:`, err);
    return [];
  }
}

// ============================
// ENRICH VIDEOS WITH DETAILS
// ============================

async function enrichVideos(videos: VideoItem[]): Promise<VideoItem[]> {
  if (videos.length === 0) return videos;

  try {
    const ids = videos.map((v) => v.videoId).join(",");
    const vidUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${ids}&key=${API_KEY}`;

    const vr = await fetch(vidUrl);
    if (!vr.ok) return videos;

    const vdata = await vr.json();
    const enrichmentMap: Record<string, any> = {};

    for (const v of vdata.items || []) {
      enrichmentMap[v.id] = {
        duration: v.contentDetails?.duration,
        viewCount: v.statistics?.viewCount,
        liveBroadcastContent: v.snippet?.liveBroadcastContent,
      };
    }

    return videos.map((video) => ({
      ...video,
      duration: enrichmentMap[video.videoId]?.duration,
      viewCount: enrichmentMap[video.videoId]?.viewCount,
      live: enrichmentMap[video.videoId]?.liveBroadcastContent === "live" || video.live,
    }));
  } catch (err) {
    console.error("Error enriching videos:", err);
    return videos;
  }
}

// ============================
// FILTER + CLEAN
// ============================

function cleanVideos(videos: VideoItem[]): VideoItem[] {
  console.log(`[DEBUG cleanVideos] Input videos count: ${videos.length}`);
  
  const afterRelevance = videos
    .filter((v) => isRelevant(v.title));
  
  console.log(`[DEBUG cleanVideos] After isRelevant filter: ${afterRelevance.length}`);
  
  const afterShorts = afterRelevance
    .filter((v) => isNotShort(v.title));
  
  console.log(`[DEBUG cleanVideos] After shorts filter: ${afterShorts.length}`);
  
  const result = afterShorts.slice(0, 10);
  console.log(`[DEBUG cleanVideos] Final result count: ${result.length}`);
  
  return result;
}

// ============================
// SORT BY DATE
// ============================

function sortByDate<T extends { publishedAt: string }>(arr: T[]): T[] {
  return arr.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

// ============================
// CURATED FALLBACK DATA
// ============================

const CURATED: VideoItem[] = [
  {
    videoId: "bTqVqk7FSmY",
    title: "India conflict updates - breaking news coverage",
    channel: "NDTV",
    channelId: "UCZFMm1mMw0F81Z37aaEzTUA",
    publishedAt: new Date().toISOString(),
    thumbnail: "https://img.youtube.com/vi/bTqVqk7FSmY/hqdefault.jpg",
    live: false,
  },
  {
    videoId: "kXYiU_JCYtU",
    title: "Military developments and strategic analysis",
    channel: "BBC News",
    channelId: "UC16niRr50-MSBwiO3YDb3RA",
    publishedAt: new Date().toISOString(),
    thumbnail: "https://img.youtube.com/vi/kXYiU_JCYtU/hqdefault.jpg",
    live: false,
  },
  {
    videoId: "V-_O7nl0Ii0",
    title: "Hindi: Latest war and conflict news coverage",
    channel: "Times Now Navbharat",
    channelId: "UCMk9Tdc-d1BIcAFaSppiVkw",
    publishedAt: new Date().toISOString(),
    thumbnail: "https://img.youtube.com/vi/V-_O7nl0Ii0/hqdefault.jpg",
    live: false,
  },
];

// ============================
// MAIN FETCH FUNCTION
// ============================

async function getYouTubeMedia(): Promise<YouTubeMediaResponse> {
  // Return cached data if valid
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    console.log(`[DEBUG getYouTubeMedia] Returning cached data`);
    return cache.data;
  }

  console.log(`[DEBUG getYouTubeMedia] No cache, fetching fresh data...`);

  const result: YouTubeMediaResponse = {
    news: [],
    global: [],
  };

  // ========================
  // FETCH ALL CHANNELS
  // ========================

  console.log(`[DEBUG getYouTubeMedia] === FETCHING NEWS CHANNELS ===`);
  // News channels
  for (const channelId of CHANNELS.news) {
    const videos = await fetchChannelVideos(channelId);
    const cleaned = cleanVideos(videos);
    console.log(`[DEBUG getYouTubeMedia] News channel ${channelId}: ${cleaned.length} videos after cleaning`);
    result.news.push(...cleaned);
  }

  console.log(`[DEBUG getYouTubeMedia] === FETCHING GLOBAL CHANNELS ===`);
  // Global channels
  for (const channelId of CHANNELS.global) {
    const videos = await fetchChannelVideos(channelId);
    const cleaned = cleanVideos(videos);
    console.log(`[DEBUG getYouTubeMedia] Global channel ${channelId}: ${cleaned.length} videos after cleaning`);
    result.global.push(...cleaned);
  }

  // Analysis category disabled for now

  // ========================
  // SORT BY LATEST
  // ========================

  result.news = sortByDate(result.news);
  result.global = sortByDate(result.global);
  console.log(`[DEBUG getYouTubeMedia] After sorting - News: ${result.news.length}, Global: ${result.global.length}`);

  // ========================
  // ENRICH WITH DETAILS
  // ========================

  result.news = await enrichVideos(result.news);
  result.global = await enrichVideos(result.global);
  // enrich analysis removed

  // ========================
  // CACHE RESULT
  // ========================

  cache = {
    data: result,
    timestamp: Date.now(),
  };

  console.log(`[DEBUG getYouTubeMedia] Final result - News: ${result.news.length}, Global: ${result.global.length}`);

  return result;
}

// ============================
// API ROUTE HANDLER
// ============================

export async function GET(req: Request) {
  console.log(`[DEBUG GET] API Key present: ${API_KEY ? 'YES' : 'NO'}`);
  
  try {
    // Check for API key
    if (!API_KEY) {
      console.warn("[DEBUG GET] YOUTUBE_API_KEY not configured, returning curated data");
      return NextResponse.json(
        {
          news: CURATED,
          global: CURATED,
        },
        { headers: { "Cache-Control": "public, s-maxage=300" } }
      );
    }

    // Get categorized data
    const data = await getYouTubeMedia();

    // Check if we got any real data, fallback to curated if empty
    const hasData = data.news.length > 0 || data.global.length > 0;

    console.log(`[DEBUG GET] Has real data: ${hasData} (News: ${data.news.length}, Global: ${data.global.length})`);

    if (!hasData) {
      console.log(`[DEBUG GET] No data, returning CURATED fallback`);
      return NextResponse.json(
        {
          news: CURATED,
          global: CURATED,
        },
        { headers: { "Cache-Control": "public, s-maxage=300" } }
      );
    }

    console.log(`[DEBUG GET] Returning real YouTube data`);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=600", // 10 min cache
      },
    });
  } catch (err) {
    console.error("YouTube API route error:", err);
    return NextResponse.json(
      {
        news: CURATED,
        global: CURATED,
      },
      { status: 200 }
    );
  }
}
