"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDuration(iso: string | undefined) {
  if (!iso) return "";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = Number(m[1] || 0);
  const mm = Number(m[2] || 0);
  const ss = Number(m[3] || 0);
  const hours = h ? String(h) : "";
  const minutes = String(mm).padStart(h ? 2 : 1, "0");
  const seconds = String(ss).padStart(2, "0");
  return h ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

type VideoItem = {
  videoId: string;
  title: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  thumbnail: string;
  live: boolean;
  duration?: string;
  viewCount?: string;
};

type YouTubeMediaResponse = {
  news: VideoItem[];
  global: VideoItem[];
};

type NewsItem = {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
};

type TabType = "news" | "global" | "hi" | "en";

export default function WarMediaPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabType>("news");
  const [current, setCurrent] = useState(0);
  const [selectedHours, setSelectedHours] = useState(48);

  // FIX: Pass hours to YouTube API too
  const { data: ytData, isLoading: ytLoading } = useSWR<YouTubeMediaResponse>(
    open ? `/api/youtube?hours=${selectedHours}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const { data: hiNews, isLoading: hiLoading } = useSWR<NewsItem[]>(
    open ? `/api/news?lang=hi&hours=${selectedHours}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const { data: enNews, isLoading: enLoading } = useSWR<NewsItem[]>(
    open ? `/api/news?lang=en&hours=${selectedHours}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  // FIX: Reset current video index when tab or hours changes
  useEffect(() => {
    setCurrent(0);
  }, [tab, selectedHours]);

  if (!open) return null;

  const getCurrentVideos = (): VideoItem[] => {
    if (!ytData || !Array.isArray(ytData.news)) return [];
    switch (tab) {
      case "news":   return ytData.news ?? [];
      case "global": return ytData.global ?? [];
      default:       return ytData.news ?? [];
    }
  };

  const ytItems = getCurrentVideos();
  // FIX: Guard against API returning non-array on error
  const hiItems = Array.isArray(hiNews) ? hiNews : [];
  const enItems = Array.isArray(enNews) ? enNews : [];

  const getCategoryTitle = () => {
    switch (tab) {
      case "news":   return "News";
      case "global": return "Global";
      case "hi":     return "Hindi News";
      case "en":     return "India News";
      default:       return "";
    }
  };

  const getCategoryCount = (category: "news" | "global") => {
    if (!ytData) return "…";
    return ytData[category]?.length ?? 0;
  };

  // ============================
  // LOADING SPINNER
  // ============================

  const isCurrentTabLoading =
    (tab === "news" || tab === "global") ? ytLoading :
    tab === "hi" ? hiLoading :
    enLoading;

  const renderLoading = () => (
    <div className="flex items-center justify-center py-10 text-sm text-gray-400 gap-2">
      <span className="animate-spin">⏳</span> Loading...
    </div>
  );

  // ============================
  // YOUTUBE PLAYER
  // ============================

  const renderYouTube = () => {
    if (ytLoading) return renderLoading();

    const item = ytItems[current];
    return (
      <div className="flex flex-col h-full">
        <div className="w-full h-44 bg-black rounded overflow-hidden">
          {item ? (
            <iframe
              key={item.videoId} // force re-mount on video change
              title={item.title}
              src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&rel=0&modestbranding=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              No videos found in last {selectedHours}h
            </div>
          )}
        </div>

        {item && (
          <div className="mt-2">
            <div className="text-sm font-semibold line-clamp-2">{item.title}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {item.channel}
              {item.publishedAt && ` • ${new Date(item.publishedAt).toLocaleString()}`}
              {item.viewCount && ` • ${Number(item.viewCount).toLocaleString()} views`}
              {item.live && " • 🔴 LIVE"}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="px-3 py-1 bg-cs-panel border border-cs-border rounded text-sm hover:bg-cs-border/30 disabled:opacity-40"
          >
            ◀ Prev
          </button>
          <span className="text-xs text-gray-400 mx-auto">
            {ytItems.length === 0 ? "0 / 0" : `${current + 1} / ${ytItems.length}`}
          </span>
          <button
            onClick={() => setCurrent((c) => Math.min(ytItems.length - 1, c + 1))}
            disabled={current >= ytItems.length - 1}
            className="px-3 py-1 bg-cs-panel border border-cs-border rounded text-sm hover:bg-cs-border/30 disabled:opacity-40"
          >
            Next ▶
          </button>
        </div>

        <div className="mt-3 overflow-y-auto max-h-40 space-y-2">
          {ytItems.map((v, i) => (
            <button
              key={v.videoId}
              onClick={() => setCurrent(i)}
              className={`w-full flex items-center gap-2 p-2 rounded hover:bg-cs-border/30 text-left ${
                i === current ? "bg-cs-accent/10 border border-cs-accent/30" : ""
              }`}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={
                    v.thumbnail ||
                    `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`
                  }
                  alt="thumb"
                  className="w-24 h-14 object-cover rounded"
                />
                {v.duration && (
                  <div className="absolute right-1 bottom-1 text-[10px] bg-black/70 text-white px-1 rounded">
                    {formatDuration(v.duration)}
                  </div>
                )}
                {v.live && (
                  <div className="absolute left-1 top-1 text-[10px] bg-red-600 text-white px-1 rounded font-bold">
                    LIVE
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium line-clamp-2">{v.title}</div>
                <div className="text-[10px] text-gray-400">{v.channel}</div>
                <div className="text-[10px] text-gray-500">
                  {new Date(v.publishedAt).toLocaleDateString()}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ============================
  // NEWS LIST
  // ============================

  const renderNewsList = (items: NewsItem[], loading: boolean) => {
    if (loading) return renderLoading();

    return (
      <div className="flex flex-col h-full">
        <div className="overflow-y-auto max-h-80 space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">
              No news found in last {selectedHours}h
            </div>
          ) : (
            items.map((it, idx) => (
              <a
                key={idx}
                href={it.link}
                target="_blank"
                rel="noreferrer"
                className="block p-2 rounded bg-cs-panel border border-cs-border hover:bg-cs-border/30"
              >
                <div className="text-sm font-medium">{it.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {it.source}
                  {it.pubDate && ` • ${new Date(it.pubDate).toLocaleString()}`}
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    );
  };

  // ============================
  // RENDER
  // ============================

  return (
    <div className="fixed right-6 top-16 w-96 bg-cs-panel border border-cs-border rounded-lg p-3 z-[2000] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">📺 War Media TV</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Last:</span>
            <select
              value={selectedHours}
              onChange={(e) => setSelectedHours(parseInt(e.target.value, 10))}
              className="bg-cs-dark border border-cs-border text-gray-300 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-cs-accent"
            >
              <option value={6}>6h</option>
              <option value={12}>12h</option>
              <option value={24}>24h</option>
              <option value={48}>48h</option>
              <option value={72}>72h</option>
            </select>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex items-center gap-1 text-xs overflow-x-auto pb-1">
        {(["news", "global"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2 py-1 rounded whitespace-nowrap ${
              tab === t
                ? "bg-cs-accent/20 text-cs-accent"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)} ({getCategoryCount(t)})
          </button>
        ))}
        <div className="w-px h-4 bg-cs-border mx-1" />
        <button
          onClick={() => setTab("hi")}
          className={`px-2 py-1 rounded whitespace-nowrap ${
            tab === "hi"
              ? "bg-cs-accent/20 text-cs-accent"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Hindi {hiItems.length > 0 && `(${hiItems.length})`}
        </button>
        <button
          onClick={() => setTab("en")}
          className={`px-2 py-1 rounded whitespace-nowrap ${
            tab === "en"
              ? "bg-cs-accent/20 text-cs-accent"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          India {enItems.length > 0 && `(${enItems.length})`}
        </button>
      </div>

      {/* Category label */}
      <div className="mt-2 text-xs text-gray-500 border-t border-cs-border pt-2">
        {getCategoryTitle()} — last {selectedHours}h
        {isCurrentTabLoading && (
          <span className="ml-2 text-yellow-500 animate-pulse">● fetching</span>
        )}
      </div>

      {/* Content */}
      <div className="mt-2">
        {(tab === "news" || tab === "global") && renderYouTube()}
        {tab === "hi" && renderNewsList(hiItems, hiLoading)}
        {tab === "en" && renderNewsList(enItems, enLoading)}
      </div>
    </div>
  );
}