"use client";

import { FC } from "react";
import type { ConflictEvent } from "@/types";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  CONFIDENCE_LABELS,
  CONFIDENCE_COLORS,
} from "@/types";

interface EventDetailsPanelProps {
  event: ConflictEvent | null;
  onClose: () => void;
}

const EventDetailsPanel: FC<EventDetailsPanelProps> = ({ event, onClose }) => {
  if (!event) return null;

  const color = EVENT_TYPE_COLORS[event.eventType] || "#ef4444";
  const confidenceColor = CONFIDENCE_COLORS[event.confidenceScore];

  return (
    <div className="bg-cs-panel border border-cs-border rounded-lg overflow-hidden animate-fade-in">
      {/* Header bar colored by event type */}
      <div className="h-1 w-full" style={{ background: color }} />

      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-100 leading-snug flex-1">
            {event.title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close event detail"
            className="shrink-0 text-gray-600 hover:text-gray-300 transition-colors mt-0.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: color + "33", color }}
          >
            {EVENT_TYPE_LABELS[event.eventType]}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white"
            style={{ background: confidenceColor }}
          >
            {CONFIDENCE_LABELS[event.confidenceScore]}
          </span>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              Country
            </div>
            <div className="text-xs text-gray-300 mt-0.5">{event.country}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              Date
            </div>
            <div className="text-xs text-gray-300 mt-0.5">
              {new Date(event.timestamp).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              Coordinates
            </div>
            <div className="text-xs text-gray-300 mt-0.5 font-mono">
              {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
              ID
            </div>
            <div className="text-xs text-gray-600 mt-0.5 font-mono truncate">
              {event.id.slice(0, 8)}…
            </div>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="mb-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              Description
            </div>
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">
              {event.description}
            </p>
          </div>
        )}

        {/* Sources */}
        {event.sources && event.sources.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              Sources ({event.sources.length})
            </div>
            <ul className="space-y-1">
              {event.sources.map((src) => (
                <li key={src.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cs-blue shrink-0" />
                  <span className="text-xs text-cs-blue">{src.sourceName}</span>
                  {src.publishedDate && (
                    <span className="text-[10px] text-gray-600 ml-auto">
                      {new Date(src.publishedDate).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Source link */}
        <a
          href={event.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-cs-blue hover:underline"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          View original article
        </a>
      </div>
    </div>
  );
};

export default EventDetailsPanel;
