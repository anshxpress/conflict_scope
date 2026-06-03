"use client";

import { FC, useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface Article {
  id: string;
  title: string;
  description?: string;
  body?: string;
  content?: string;
  source: string;
  url: string;
  publishedAt: string;
  categories?: string[];
  city?: string;
  state?: string;
  country?: string;
}

interface ArticleDetailsPanelProps {
  article: Article | null;
  onClose: () => void;
}

const ArticleDetailsPanel: FC<ArticleDetailsPanelProps> = ({ article, onClose }) => {
  const [summary, setSummary] = useState("");
  const [impact, setImpact] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(false);

  // Chat states
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "model"; content: string }>>([]);
  const [userInput, setUserInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset states when the article changes
  useEffect(() => {
    setSummary("");
    setImpact("");
    setChatMessages([]);
    setUserInput("");
    
    if (article) {
      loadAiSummary(article.id);
      loadAiImpact(article.id);
    }
  }, [article]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (!article) return null;

  const loadAiSummary = async (id: string) => {
    setLoadingSummary(true);
    try {
      const res = await api.getArticleSummary(id);
      setSummary(res.summary);
    } catch (err) {
      console.error("Failed loading AI summary:", err);
      setSummary("Failed to load AI summary. Please check your network or try again.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadAiImpact = async (id: string) => {
    setLoadingImpact(true);
    try {
      const res = await api.getArticleImpact(id);
      setImpact(res.impact);
    } catch (err) {
      console.error("Failed loading AI impact:", err);
      setImpact("Failed to load impact report. Please check your network or try again.");
    } finally {
      setLoadingImpact(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || sendingChat) return;

    const userMsg = userInput.trim();
    setUserInput("");
    
    // Add user message to UI
    const updatedHistory = [...chatMessages, { role: "user" as const, content: userMsg }];
    setChatMessages(updatedHistory);
    setSendingChat(true);

    try {
      // Call Gemini API passing history (exclude the message we are currently sending)
      const res = await api.chatAboutArticle(article.id, userMsg, chatMessages);
      setChatMessages([...updatedHistory, { role: "model" as const, content: res.response }]);
    } catch (err) {
      console.error("Failed sending message:", err);
      setChatMessages([
        ...updatedHistory,
        { role: "model" as const, content: "Could not deliver your message. AI is currently offline." },
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div className="bg-cs-panel border border-cs-border rounded-lg overflow-hidden animate-fade-in flex flex-col h-full">
      {/* Accent Header bar */}
      <div className="h-1 w-full bg-cs-blue" />

      {/* Panel Scroll Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[85vh]">
        {/* Header Title & Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-sm font-bold text-gray-100 leading-snug">
              {article.title}
            </h2>
            <div className="text-[10px] text-gray-500 font-medium mt-1">
              Source: <span className="text-gray-300 font-bold">{article.source}</span> •{" "}
              {new Date(article.publishedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close article details"
            className="shrink-0 text-gray-500 hover:text-gray-200 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Location tree labels & Category tags */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-b border-cs-border/60 py-2.5">
          {article.categories?.map((cat) => (
            <span
              key={cat}
              className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-cs-blue/10 text-cs-blue border border-cs-blue/20"
            >
              {cat}
            </span>
          ))}
          
          {/* Location Tree Hierarchy */}
          {(article.city || article.state || article.country) && (
            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 ml-auto">
              <svg className="w-3.5 h-3.5 text-cs-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>
                {[article.city, article.state, article.country].filter(Boolean).join(" • ")}
              </span>
            </div>
          )}
        </div>

        {/* Article Summary (bullet points) */}
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-cs-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            AI Summary
          </h3>
          {loadingSummary ? (
            <div className="space-y-2 py-1 animate-pulse">
              <div className="h-3 bg-cs-border rounded w-[95%]" />
              <div className="h-3 bg-cs-border rounded w-[90%]" />
              <div className="h-3 bg-cs-border rounded w-[75%]" />
            </div>
          ) : (
            <div className="text-xs text-gray-300 leading-relaxed font-medium whitespace-pre-line bg-cs-dark/30 rounded-lg p-3 border border-cs-border/40">
              {summary}
            </div>
          )}
        </div>

        {/* Ordinary Citizens' Impact */}
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-cs-accent-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Citizens' Impact
          </h3>
          {loadingImpact ? (
            <div className="space-y-2 py-1 animate-pulse">
              <div className="h-3 bg-cs-border rounded w-[90%]" />
              <div className="h-3 bg-cs-border rounded w-[80%]" />
            </div>
          ) : (
            <div className="text-xs text-gray-300 leading-relaxed font-medium bg-cs-dark/30 rounded-lg p-3 border border-cs-border/40">
              {impact}
            </div>
          )}
        </div>

        {/* Link to original */}
        <div className="pt-1">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cs-blue hover:underline"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Original Source
          </a>
        </div>

        {/* Interactive AI Chat Box */}
        <div className="border-t border-cs-border/60 pt-4 flex flex-col min-h-[250px]">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-2.5">
            <svg className="w-3.5 h-3.5 text-cs-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Ask AI about this news
          </h3>

          {/* Messages Display */}
          <div className="flex-1 bg-cs-dark/40 border border-cs-border/80 rounded-lg p-3 min-h-[140px] max-h-[200px] overflow-y-auto space-y-2 flex.col">
            {chatMessages.length === 0 ? (
              <p className="text-[11px] text-gray-600 text-center py-8">
                Ask how this news impacts travel, costs, or local policies.
              </p>
            ) : (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col space-y-0.5 rounded px-2.5 py-1.5 text-xs max-w-[90%] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-cs-blue/10 text-gray-200 border border-cs-blue/20 self-end ml-auto"
                      : "bg-cs-panel text-gray-300 border border-cs-border self-start mr-auto"
                  }`}
                >
                  <span className="font-semibold text-[9px] text-gray-500 uppercase">
                    {msg.role === "user" ? "You" : "AI"}
                  </span>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              ))
            )}
            {sendingChat && (
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 bg-cs-panel border border-cs-border rounded px-2.5 py-1.5 self-start">
                <span className="inline-block w-2.5 h-2.5 border-2 border-cs-blue border-t-transparent rounded-full animate-spin" />
                <span>AI is compiling reply...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form */}
          <form onSubmit={handleSendChat} className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Ask a question..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={sendingChat}
              className="flex-1 bg-cs-dark border border-cs-border rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cs-blue transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!userInput.trim() || sendingChat}
              className="px-3 py-1.5 rounded-lg bg-cs-blue hover:bg-cs-blue/80 disabled:bg-cs-border text-xs text-white font-bold transition-all shrink-0 flex items-center justify-center"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetailsPanel;
