"use client";

import { useState, useRef, useEffect, type FC } from "react";

interface Update {
  version: string;
  date: string;
  status: "live" | "in-progress" | "planned";
  title: string;
  items: string[];
}

const UPDATES: Update[] = [
  {
    version: "1.1",
    date: "Q2 2026",
    status: "in-progress",
    title: "Market Intelligence",
    items: [
      "Live commodity price ticker linked to conflict zones",
      "Custom alert thresholds for oil, gold & grain price spikes",
      "Economic impact scoring per conflict event",
    ],
  },
  {
    version: "1.2",
    date: "Q3 2026",
    status: "planned",
    title: "Supply Chain Layer",
    items: [
      "Global shipping route disruption tracker",
      "Trade corridor risk overlay on map",
      "Port/chokepoint status monitoring (Hormuz, Suez, Bab el-Mandeb)",
    ],
  },
  {
    version: "1.3",
    date: "Q4 2026",
    status: "planned",
    title: "Advanced Analytics",
    items: [
      "Conflict escalation prediction model",
      "Refugee movement corridor visualization",
      "Arms trade flow mapping",
      "Historical conflict timeline playback",
    ],
  },
  {
    version: "1.0",
    date: "Mar 2026",
    status: "live",
    title: "Core Platform",
    items: [
      "Real-time conflict event tracking from 15+ OSINT sources",
      "Interactive risk map with country-level threat scoring",
      "Critical infrastructure monitoring layer",
      "NLP-powered event extraction & confidence scoring",
    ],
  },
];

const STATUS_STYLES = {
  live: { bg: "bg-green-500/20", text: "text-green-400", label: "LIVE" },
  "in-progress": {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    label: "IN PROGRESS",
  },
  planned: { bg: "bg-blue-500/20", text: "text-blue-400", label: "PLANNED" },
};

const UpdatesPanel: FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-cs-dark transition-colors"
        aria-label="Updates & Roadmap"
        title="Updates & Roadmap"
      >
        <svg
          className="w-4.5 h-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
          />
        </svg>
        {/* Yellow dot badge */}
        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-yellow-500 rounded-full border border-cs-panel" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-cs-panel border border-cs-border rounded-lg shadow-2xl z-[9999] overflow-hidden max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-cs-border flex items-center justify-between sticky top-0 bg-cs-panel">
            <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
              Updates & Roadmap
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-semibold">
              3 UPCOMING
            </span>
          </div>

          <div className="p-2 space-y-1">
            {UPDATES.map((u) => {
              const style = STATUS_STYLES[u.status];
              return (
                <div
                  key={u.version}
                  className="p-3 rounded-md hover:bg-cs-dark/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-gray-200">
                        v{u.version}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 ${style.bg} ${style.text} rounded font-bold`}
                      >
                        {style.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">{u.date}</span>
                  </div>

                  <h4 className="text-[11px] font-semibold text-gray-300 mb-1.5">
                    {u.title}
                  </h4>

                  <ul className="space-y-1">
                    {u.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-[10px] text-gray-500"
                      >
                        <span
                          className={`mt-1 w-1 h-1 rounded-full shrink-0 ${
                            u.status === "live"
                              ? "bg-green-500"
                              : u.status === "in-progress"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                          }`}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-cs-border">
            <p className="text-[10px] text-gray-600 text-center">
              Have a feature request? Open an issue on{" "}
              <a
                href="https://github.com/anshxpress/conflict_scope/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cs-accent hover:underline"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdatesPanel;
