"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

interface Article {
  id: string;
  title: string;
  description?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  country?: string;
  categories?: string[];
  importanceScore?: number;
}

interface SearchResult {
  query: string;
  articles: Article[];
  timestamp: Date;
}

interface GlobalChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalChatBot({ isOpen, onClose }: GlobalChatBotProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.searchNews(q, 20);
      setResults((prev) => [
        ...prev,
        { query: q, articles: data, timestamp: new Date() },
      ]);
      setInput("");
    } catch (err) {
      console.error("Search error:", err);
      setError("Could not fetch news. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const timeAgo = (iso?: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "Just now";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-cs-border bg-cs-panel w-[420px] max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between bg-cs-dark border-b border-cs-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-cs-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35" />
          </svg>
          <h3 className="text-sm font-bold text-gray-200">News Search</h3>
          <span className="text-[10px] text-gray-500 bg-cs-border/50 rounded px-1.5 py-0.5">Live DB</span>
        </div>
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <button
              onClick={() => setResults([])}
              title="Clear results"
              className="text-gray-500 hover:text-red-400 transition-colors p-1"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors p-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Results scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
        {results.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
            <svg className="w-10 h-10 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-gray-500 text-sm">Type a keyword to search the latest news from our database</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Russia Ukraine", "Gaza", "Oil prices", "India military"].map((kw) => (
                <button
                  key={kw}
                  onClick={() => { setInput(kw); setTimeout(() => handleSearch(), 0); }}
                  className="text-xs px-2.5 py-1 rounded-full bg-cs-border/50 text-gray-400 hover:bg-cs-blue/20 hover:text-cs-blue transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        )}

        {results.map((result, ri) => (
          <div key={ri} className="space-y-2">
            {/* Query badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-cs-blue bg-cs-blue/10 rounded-full px-2.5 py-1">
                🔍 "{result.query}"
              </span>
              <span className="text-[10px] text-gray-600">{formatTime(result.timestamp)}</span>
              <span className="text-[10px] text-gray-600 ml-auto">{result.articles.length} results</span>
            </div>

            {result.articles.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm bg-cs-dark/50 rounded-xl border border-cs-border">
                No articles found for "{result.query}"
              </div>
            ) : (
              <div className="space-y-2">
                {result.articles.map((article) => (
                  <a
                    key={article.id}
                    href={article.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-cs-dark/60 border border-cs-border hover:border-cs-blue/50 rounded-xl p-3 transition-all hover:bg-cs-dark group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs text-cs-blue font-medium truncate">
                        {article.source || "Unknown"}
                      </span>
                      <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(article.publishedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-200 font-medium leading-snug group-hover:text-white line-clamp-2">
                      {article.title}
                    </p>
                    {article.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {article.country && (
                        <span className="text-[10px] text-gray-600 bg-cs-border/40 rounded px-1.5 py-0.5">
                          {article.country}
                        </span>
                      )}
                      {(article.categories || []).slice(0, 2).map((cat) => (
                        <span key={cat} className="text-[10px] text-yellow-600/80 bg-yellow-600/10 rounded px-1.5 py-0.5">
                          {cat}
                        </span>
                      ))}
                      {article.importanceScore != null && (
                        <span className="ml-auto text-[10px] text-gray-600">
                          Score: {article.importanceScore}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 p-3 bg-cs-dark/40 rounded-xl border border-cs-border">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-cs-blue rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-cs-blue rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-cs-blue rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs text-gray-500">Searching database…</span>
          </div>
        )}

        {error && (
          <div className="p-3 text-xs text-red-400 bg-red-900/10 rounded-xl border border-red-900/30">
            {error}
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSearch} className="shrink-0 border-t border-cs-border bg-cs-dark p-3 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search news by keyword…"
          disabled={loading}
          className="flex-1 bg-cs-panel border border-cs-border rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cs-blue/50 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-cs-blue/20 hover:bg-cs-blue/40 border border-cs-blue/30 text-cs-blue rounded-xl px-3 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </form>
    </div>
  );
}
