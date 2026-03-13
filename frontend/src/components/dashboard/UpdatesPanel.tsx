"use client";

import { useState, useRef, useEffect, useCallback, type FC } from "react";
import { createPortal } from "react-dom";

interface Update {
  status: "live" | "in-progress" | "planned";
  label: string;
}

const UPDATES: Update[] = [
  {
    status: "live",
    label: "Real-time Gold, Silver & Crude Oil war-impact tracking",
  },
  {
    status: "live",
    label: "Conflict-driven price spike alerts with OSINT correlation",
  },
  {
    status: "live",
    label: "Live commodity ticker linked to active conflict zones",
  },
  {
    status: "live",
    label: "Custom alert thresholds for oil, gold & grain spikes",
  },
  {
    status: "in-progress",
    label: "Real-time news and impact on india due to war",
  },
];

const DOT_COLOR = {
  live: "bg-green-400",
  "in-progress": "bg-yellow-400",
  planned: "bg-blue-400",
};

const UpdatesPanel: FC = () => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    timeout.current = setTimeout(() => setOpen(false), 250);
  }, []);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="relative"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <div className="relative flex items-center gap-1.5 px-2 py-1 rounded-md text-yellow-400 hover:bg-cs-dark cursor-default transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"
            />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Upcoming Updates
          </span>
        </div>
      </div>

      {/* Portal dropdown — escapes overflow-hidden parents */}
      {open &&
        createPortal(
          <div
            className="fixed w-80 bg-cs-panel border border-cs-border rounded-lg shadow-2xl overflow-hidden"
            style={{ top: pos.top, right: pos.right, zIndex: 99999 }}
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-cs-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
                  Commodity Analytics Updates
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-semibold">
                  ROADMAP
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                We&apos;re building real-time commodity intelligence driven by
                conflict data — track how wars move markets.
              </p>
            </div>

            {/* Items */}
            <div className="p-3 space-y-2">
              {UPDATES.map((u, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span
                    className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLOR[u.status]}`}
                  />
                  <span className="text-[11px] text-gray-400 leading-snug">
                    {u.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="px-4 py-2 border-t border-cs-border flex items-center gap-4">
              {(["live", "in-progress", "planned"] as const).map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[s]}`}
                  />
                  <span className="text-[9px] text-gray-500 uppercase font-semibold">
                    {s === "in-progress" ? "WIP" : s}
                  </span>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default UpdatesPanel;
