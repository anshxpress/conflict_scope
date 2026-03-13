"use client";

import { FC, useEffect, useMemo, useState } from "react";
import type { EventType, ConfidenceLevel } from "@/types";
import { EVENT_TYPE_LABELS, CONFIDENCE_LABELS } from "@/types";
import { formatCountry } from "@/lib/countryFlags";

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
  const [countryQuery, setCountryQuery] = useState(selectedCountry);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);

  useEffect(() => {
    setCountryQuery(selectedCountry);
  }, [selectedCountry]);

  const hasFilters = selectedCountry || selectedType || selectedConfidence;
  const filteredCountries = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    if (!query) return countries;

    return countries.filter((country) => {
      const formatted = formatCountry(country).toLowerCase();
      return (
        country.toLowerCase().includes(query) ||
        formatted.includes(query)
      );
    });
  }, [countries, countryQuery]);

  const exactCountryMatch = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    if (!query) return "";

    return (
      countries.find((country) => country.toLowerCase() === query) ?? ""
    );
  }, [countries, countryQuery]);

  const handleCountrySelect = (country: string) => {
    setCountryQuery(country);
    onCountryChange(country);
    setCountryMenuOpen(false);
  };

  const handleCountryBlur = () => {
    window.setTimeout(() => {
      if (exactCountryMatch || countryQuery.trim() === "") {
        handleCountrySelect(exactCountryMatch);
        return;
      }

      setCountryQuery(selectedCountry);
      setCountryMenuOpen(false);
    }, 120);
  };

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
          <div className="relative">
            <input
              type="text"
              value={countryQuery}
              onChange={(e) => {
                setCountryQuery(e.target.value);
                setCountryMenuOpen(true);
              }}
              onFocus={() => setCountryMenuOpen(true)}
              onBlur={handleCountryBlur}
              placeholder="Search or select a country"
              className="w-full bg-cs-dark border border-cs-border text-gray-300 text-sm rounded px-2 py-1.5 pr-8 focus:outline-none focus:border-cs-accent"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCountryMenuOpen((open) => !open)}
              className="absolute inset-y-0 right-2 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Toggle country list"
            >
              <svg
                className={`w-4 h-4 transition-transform ${countryMenuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {countryMenuOpen && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-cs-border bg-cs-dark shadow-2xl">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleCountrySelect("")}
                  className={`w-full px-2 py-2 text-left text-sm transition-colors ${selectedCountry === "" ? "bg-cs-panel text-gray-100" : "text-gray-300 hover:bg-cs-panel/70"}`}
                >
                  All Countries
                </button>
                <div className="max-h-56 overflow-y-auto border-t border-cs-border/60">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => (
                      <button
                        key={country}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleCountrySelect(country)}
                        className={`w-full px-2 py-2 text-left text-sm transition-colors ${selectedCountry === country ? "bg-cs-panel text-gray-100" : "text-gray-300 hover:bg-cs-panel/70"}`}
                      >
                        {formatCountry(country)}
                      </button>
                    ))
                  ) : (
                    <div className="px-2 py-2 text-sm text-gray-500">
                      No matching countries
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
