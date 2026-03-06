"use client";

import { FC } from "react";
import type { EventType, ConfidenceLevel } from "@/types";
import { EVENT_TYPE_LABELS, CONFIDENCE_LABELS } from "@/types";

interface FilterPanelProps {
  selectedCountry: string;
  selectedType: string;
  selectedConfidence: string;
  countries: string[];
  onCountryChange: (country: string) => void;
  onTypeChange: (type: string) => void;
  onConfidenceChange: (confidence: string) => void;
  onReset: () => void;
}

const EVENT_TYPES: EventType[] = [
  "airstrike",
  "missile_strike",
  "explosion",
  "drone_strike",
  "infrastructure_attack",
  "armed_conflict",
];

const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["low", "medium", "high"];

const FilterPanel: FC<FilterPanelProps> = ({
  selectedCountry,
  selectedType,
  selectedConfidence,
  countries,
  onCountryChange,
  onTypeChange,
  onConfidenceChange,
  onReset,
}) => {
  const hasFilters = selectedCountry || selectedType || selectedConfidence;

  return (
    <div className="bg-cs-panel border border-cs-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
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
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
        </h3>
        {hasFilters && (
          <button
            onClick={onReset}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Country filter */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Country</label>
          <select
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="w-full bg-cs-dark border border-cs-border text-gray-300 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-cs-accent"
          >
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Event type filter */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Event Type</label>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full bg-cs-dark border border-cs-border text-gray-300 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-cs-accent"
          >
            <option value="">All Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Confidence filter */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Confidence</label>
          <select
            value={selectedConfidence}
            onChange={(e) => onConfidenceChange(e.target.value)}
            className="w-full bg-cs-dark border border-cs-border text-gray-300 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-cs-accent"
          >
            <option value="">All Levels</option>
            {CONFIDENCE_LEVELS.map((c) => (
              <option key={c} value={c}>
                {CONFIDENCE_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
