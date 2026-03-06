"use client";

import { FC, useEffect, useRef } from "react";
import type { ConflictEvent } from "@/types";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/types";

interface LiveEventFeedProps {
  events: ConflictEvent[];
  onEventSelect: (event: ConflictEvent) => void;
  selectedEventId: string | null;
}

const LiveEventFeed: FC<LiveEventFeedProps> = ({
  events,
  onEventSelect,
  selectedEventId,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to top when new events arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [events.length]);

  const recentEvents = events.slice(0, 50);

  return (
    <div className="bg-cs-panel border border-cs-border rounded-lg flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cs-border shrink-0">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          {/* Live dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cs-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cs-accent" />
          </span>
          Live Feed
        </h3>
        <span className="text-xs text-gray-600">{events.length} events</span>
      </div>

      {/* Feed list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 400px)", minHeight: "200px" }}
      >
        {recentEvents.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-8">
            No events yet — pipeline is running…
          </div>
        ) : (
          <ul className="divide-y divide-cs-border">
            {recentEvents.map((event) => (
              <EventFeedItem
                key={event.id}
                event={event}
                isSelected={event.id === selectedEventId}
                onClick={() => onEventSelect(event)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

interface EventFeedItemProps {
  event: ConflictEvent;
  isSelected: boolean;
  onClick: () => void;
}

const EventFeedItem: FC<EventFeedItemProps> = ({
  event,
  isSelected,
  onClick,
}) => {
  const color = EVENT_TYPE_COLORS[event.eventType] || "#ef4444";

  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 hover:bg-cs-dark/60 transition-colors ${
          isSelected ? "bg-cs-dark border-l-2 border-cs-accent" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          {/* Color dot */}
          <span
            className="mt-1.5 shrink-0 w-2 h-2 rounded-full"
            style={{ background: color }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-300 line-clamp-2 leading-snug">
              {event.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-500">{event.country}</span>
              <span className="text-[10px] text-gray-600">•</span>
              <span className="text-[10px]" style={{ color: color + "cc" }}>
                {EVENT_TYPE_LABELS[event.eventType]}
              </span>
              <span className="text-[10px] text-gray-600 ml-auto whitespace-nowrap">
                {formatRelativeTime(event.timestamp)}
              </span>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
};

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default LiveEventFeed;
