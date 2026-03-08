"use client";

import { FC, useMemo, useCallback, useRef } from "react";

interface TimelineSliderProps {
  events: { timestamp: string }[];
  value: [Date, Date];
  onChange: (range: [Date, Date]) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

const PRESETS = [
  { label: "24h", days: 1 },
  { label: "3d", days: 3 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
] as const;

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const TimelineSlider: FC<TimelineSliderProps> = ({
  events,
  value,
  onChange,
}) => {
  // Fixed 30-day window — computed once at mount, never shifts on re-render
  const { windowStart, windowEnd } = useRef({
    windowEnd: Date.now(),
    windowStart: Date.now() - WINDOW_DAYS * DAY_MS,
  }).current;

  const range = windowEnd - windowStart;

  // Clamp selection within window (keep at least 1-hour gap)
  const selStart = Math.max(
    windowStart,
    Math.min(value[0].getTime(), value[1].getTime() - DAY_MS),
  );
  const selEnd = Math.min(
    windowEnd,
    Math.max(value[1].getTime(), value[0].getTime() + DAY_MS),
  );

  const startPct = ((selStart - windowStart) / range) * 100;
  const endPct = ((selEnd - windowStart) / range) * 100;

  // Z-index: when thumbs are close, let each still be independently draggable
  const startZ = startPct >= endPct - 2 ? 4 : 3;
  const endZ = endPct <= startPct + 2 ? 4 : 3;

  // ── Event density sparkline (30 equal-width buckets) ─────────────
  const densityBuckets = useMemo(() => {
    const N = 30;
    const bucketSize = range / N;
    const counts = new Array<number>(N).fill(0);
    for (const ev of events) {
      const t = new Date(ev.timestamp).getTime();
      const idx = Math.floor((t - windowStart) / bucketSize);
      if (idx >= 0 && idx < N) counts[idx]++;
    }
    const maxCount = Math.max(...counts, 1);
    return counts.map((c) => c / maxCount);
  }, [events, windowStart, range]);

  // ── Active preset detection ───────────────────────────────────────
  const durationMs = selEnd - selStart;
  const endIsNow = windowEnd - selEnd < DAY_MS * 0.5;
  const activePreset =
    PRESETS.find(
      (p) => Math.abs(durationMs - p.days * DAY_MS) < DAY_MS * 0.5 && endIsNow,
    )?.label ?? null;

  // ── Duration badge display string ─────────────────────────────────
  const durLabel = (() => {
    const days = Math.round(durationMs / DAY_MS);
    if (days >= 1) return `${days}d`;
    const hrs = Math.round(durationMs / (60 * 60 * 1000));
    return `${hrs}h`;
  })();

  // ── Slider input handlers ─────────────────────────────────────────
  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = parseInt(e.target.value, 10);
      const clamped = Math.max(windowStart, Math.min(t, selEnd - DAY_MS));
      onChange([new Date(clamped), new Date(selEnd)]);
    },
    [windowStart, selEnd, onChange],
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = parseInt(e.target.value, 10);
      const clamped = Math.min(windowEnd, Math.max(t, selStart + DAY_MS));
      onChange([new Date(selStart), new Date(clamped)]);
    },
    [windowEnd, selStart, onChange],
  );

  // ── Date-picker handlers ──────────────────────────────────────────
  const handleStartDate = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.value) return;
      const d = new Date(e.target.value).getTime();
      const clamped = Math.max(windowStart, Math.min(d, selEnd - DAY_MS));
      onChange([new Date(clamped), new Date(selEnd)]);
    },
    [windowStart, selEnd, onChange],
  );

  const handleEndDate = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.value) return;
      const d = new Date(e.target.value).getTime();
      const clamped = Math.min(windowEnd, Math.max(d, selStart + DAY_MS));
      onChange([new Date(selStart), new Date(clamped)]);
    },
    [windowEnd, selStart, onChange],
  );

  // ── Preset handler ────────────────────────────────────────────────
  const applyPreset = useCallback(
    (days: number) => {
      const newEnd = windowEnd;
      const newStart = Math.max(windowStart, windowEnd - days * DAY_MS);
      onChange([new Date(newStart), new Date(newEnd)]);
    },
    [windowStart, windowEnd, onChange],
  );

  // ── Reset ─────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    onChange([new Date(windowStart), new Date(windowEnd)]);
  }, [windowStart, windowEnd, onChange]);

  const isDefault =
    selStart <= windowStart + DAY_MS && selEnd >= windowEnd - DAY_MS;

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="bg-cs-panel border border-cs-border rounded-lg px-4 pt-3 pb-2">
      {/* ── Row 1: Clock icon + TIMELINE label + preset buttons + Reset ── */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <svg
            className="w-3.5 h-3.5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
            Timeline
          </span>
        </div>

        {/* Preset quick-select buttons */}
        <div className="flex items-center gap-1 ml-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                activePreset === p.label
                  ? "bg-cs-accent/20 border-cs-accent text-cs-accent font-semibold"
                  : "border-cs-border text-gray-500 hover:border-gray-500 hover:text-gray-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Reset — only appears when selection is narrowed */}
        <button
          onClick={handleReset}
          className={`shrink-0 text-[10px] px-2 py-0.5 rounded transition-all duration-200 ${
            isDefault
              ? "opacity-0 pointer-events-none"
              : "text-cs-accent border border-cs-accent/40 hover:bg-cs-accent/10"
          }`}
          aria-label="Reset timeline"
        >
          Reset
        </button>
      </div>

      {/* ── Row 2: From / To date pickers + duration badge ─────────── */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-gray-600 shrink-0">From</span>
        <input
          type="date"
          value={toInputDate(new Date(selStart))}
          min={toInputDate(new Date(windowStart))}
          max={toInputDate(new Date(selEnd - DAY_MS))}
          onChange={handleStartDate}
          className="text-[11px] bg-cs-dark border border-cs-border rounded px-1.5 py-0.5 text-gray-300 focus:outline-none focus:border-cs-accent/60"
        />
        <span className="text-gray-600 text-[10px]">→</span>
        <input
          type="date"
          value={toInputDate(new Date(selEnd))}
          min={toInputDate(new Date(selStart + DAY_MS))}
          max={toInputDate(new Date(windowEnd))}
          onChange={handleEndDate}
          className="text-[11px] bg-cs-dark border border-cs-border rounded px-1.5 py-0.5 text-gray-300 focus:outline-none focus:border-cs-accent/60"
        />
        <span className="ml-1 text-[10px] font-mono text-cs-accent bg-cs-accent/10 border border-cs-accent/20 px-1.5 py-0.5 rounded">
          {durLabel}
        </span>
      </div>

      {/* ── Row 3: sparkline + dual-thumb slider ───────────────────── */}
      <div className="relative" style={{ height: 52 }}>
        {/* Density sparkline — above the slider */}
        <div className="absolute inset-x-0 top-0" style={{ height: 20 }}>
          <div className="flex items-end gap-px h-full w-full">
            {densityBuckets.map((h, i) => {
              const bucketStart =
                windowStart + (i / densityBuckets.length) * range;
              const inRange = bucketStart >= selStart && bucketStart <= selEnd;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-colors"
                  style={{
                    height: `${Math.max(8, h * 100)}%`,
                    backgroundColor: inRange
                      ? "rgba(239,68,68,0.7)"
                      : "rgba(75,85,99,0.4)",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Slider track — below the sparkline */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: 28 }}>
          {/* Grey base track */}
          <div
            className="absolute rounded-full bg-gray-700"
            style={{
              top: "50%",
              transform: "translateY(-50%)",
              left: 0,
              right: 0,
              height: 4,
            }}
          />
          {/* Red filled portion between the selection thumbs */}
          <div
            className="absolute rounded-full bg-cs-accent"
            style={{
              top: "50%",
              transform: "translateY(-50%)",
              left: `${startPct}%`,
              width: `${Math.max(0, endPct - startPct)}%`,
              height: 4,
            }}
          />

          {/* Start thumb */}
          <input
            type="range"
            min={windowStart}
            max={windowEnd}
            step={60 * 60 * 1000}
            value={selStart}
            onChange={handleStartChange}
            className="timeline-range"
            style={{ position: "absolute", width: "100%", zIndex: startZ }}
            aria-label="Range start"
          />

          {/* End thumb */}
          <input
            type="range"
            min={windowStart}
            max={windowEnd}
            step={60 * 60 * 1000}
            value={selEnd}
            onChange={handleEndChange}
            className="timeline-range"
            style={{ position: "absolute", width: "100%", zIndex: endZ }}
            aria-label="Range end"
          />
        </div>
      </div>

      {/* ── Row 4: window boundary date labels ─────────────────────── */}
      <div className="flex justify-between mt-0.5 text-[10px] text-gray-600 select-none">
        <span>{fmt(new Date(windowStart))}</span>
        <span>{fmt(new Date(windowEnd))}</span>
      </div>
    </div>
  );
};

export default TimelineSlider;
