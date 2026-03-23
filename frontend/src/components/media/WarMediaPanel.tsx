"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDuration(iso: string | undefined) {
  if (!iso) return "";
  // Simple ISO 8601 duration parser (PT#H#M#S)
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = Number(m[1] || 0);
  const mm = Number(m[2] || 0);
  const ss = Number(m[3] || 0);

  const hours = h ? String(h) : "";
  const minutes = String(mm).padStart(h ? 2 : 1, "0");
  const seconds = String(ss).padStart(2, "0");

  if (h) {
    return `${hours}:${minutes}:${seconds}`;
  }
  return `${minutes}:${seconds}`;
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
};

type TabType = "news" | "global" | "hi" | "en";

export default function WarMediaPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: ytData } = useSWR<YouTubeMediaResponse>(
    open ? "/api/youtube" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    },
  );

  const { data: hiNews } = useSWR<NewsItem[]>(
    open ? "/api/news?lang=hi" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    },
  );

  const { data: enNews } = useSWR<NewsItem[]>(
    open ? "/api/news?lang=en" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    },
  );

  const [tab, setTab] = useState<TabType>("news");
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (open) setCurrent(0);
  }, [open, tab]);

  if (!open) return null;

  // Get videos for current category
  const getCurrentVideos = (): VideoItem[] => {
    if (!ytData) return [];

    console.log(
      "[DEBUG WarMediaPanel] ytData received:",
      JSON.stringify(ytData),
    );

    switch (tab) {
      case "news":
        return ytData.news || [];
      case "global":
        return ytData.global || [];
      default:
        return ytData.news || [];
    }
  };

  const ytItems = getCurrentVideos();
  const hiItems = hiNews ?? [];
  const enItems = enNews ?? [];

  const getCategoryTitle = () => {
    switch (tab) {
      case "news":
        return "News";
      case "global":
        return "Global";
      case "hi":
        return "Hindi News";
      case "en":
        return "India News";
      default:
        return "";
    }
  };

  const getCategoryCount = (category: "news" | "global") => {
    if (!ytData) return 0;
    return ytData[category].length;
  };

  const renderYouTube = () => {
    const item = ytItems[current];
    return (
      <div className="flex flex-col h-full">
        <div className="w-full h-44 bg-black rounded overflow-hidden">
          {item ? (
            <iframe
              title={item.title}
              src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&rel=0&modestbranding=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              No videos available
            </div>
          )}
        </div>

        <div className="mt-2">
          <div className="text-sm font-semibold">{item?.title ?? "-"}</div>
          <div className="text-xs text-gray-400">
            {item?.channel ?? "-"} •{" "}
            {item?.publishedAt
              ? new Date(item.publishedAt).toLocaleString()
              : ""}
            {item?.viewCount
              ? ` • ${Number(item.viewCount).toLocaleString()} views`
              : ""}
            {item?.live ? " • 🔴 LIVE" : ""}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            className="px-3 py-1 bg-cs-panel border border-cs-border rounded text-sm hover:bg-cs-border/30"
            disabled={current === 0}
          >
            ◀ Prev
          </button>
          <span className="text-xs text-gray-400 mx-auto">
            {current + 1} / {ytItems.length || 1}
          </span>
          <button
            onClick={() =>
              setCurrent((c) => Math.min((ytItems.length || 1) - 1, c + 1))
            }
            className="px-3 py-1 bg-cs-panel border border-cs-border rounded text-sm hover:bg-cs-border/30"
            disabled={current >= (ytItems.length || 1) - 1}
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
                i === current
                  ? "bg-cs-accent/10 border border-cs-accent/30"
                  : ""
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
                <div className="text-xs font-medium truncate">{v.title}</div>
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

  const renderNewsList = (items: NewsItem[]) => (
    <div className="flex flex-col h-full">
      <div className="overflow-y-auto max-h-80 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">
            No news available
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
              <div className="text-xs text-gray-400">{it.source}</div>
            </a>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed right-6 top-16 w-96 bg-cs-panel border border-cs-border rounded-lg p-3 z-[2000] shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">📺 War Media TV</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
          ✕
        </button>
      </div>

      {/* Category tabs for YouTube */}
      <div className="mt-3 flex items-center gap-1 text-xs overflow-x-auto pb-1">
        <button
          onClick={() => setTab("news")}
          className={`px-2 py-1 rounded whitespace-nowrap ${
            tab === "news"
              ? "bg-cs-accent/20 text-cs-accent"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          News ({getCategoryCount("news")})
        </button>
        <button
          onClick={() => setTab("global")}
          className={`px-2 py-1 rounded whitespace-nowrap ${
            tab === "global"
              ? "bg-cs-accent/20 text-cs-accent"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Global ({getCategoryCount("global")})
        </button>
        {/* Analysis tab removed */}
        <div className="w-px h-4 bg-cs-border mx-1" />
        <button
          onClick={() => setTab("hi")}
          className={`px-2 py-1 rounded whitespace-nowrap ${
            tab === "hi"
              ? "bg-cs-accent/20 text-cs-accent"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Hindi
        </button>
        <button
          onClick={() => setTab("en")}
          className={`px-2 py-1 rounded whitespace-nowrap ${
            tab === "en"
              ? "bg-cs-accent/20 text-cs-accent"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          India
        </button>
      </div>

      {/* Category label */}
      <div className="mt-2 text-xs text-gray-500 border-t border-cs-border pt-2">
        Category: {getCategoryTitle()}
      </div>

      {/* Content */}
      <div className="mt-2">
        {(tab === "news" || tab === "global") && renderYouTube()}
        {tab === "hi" && renderNewsList(hiItems)}
        {tab === "en" && renderNewsList(enItems)}
      </div>
    </div>
  );
}
