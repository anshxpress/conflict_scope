"use client";

import { FC, useMemo } from "react";

interface TimelineSliderProps {
  events: { timestamp: string }[];
  value: [Date, Date];
  onChange: (range: [Date, Date]) => void;
}

const TimelineSlider: FC<TimelineSliderProps> = ({
  events,
  value,
  onChange,
}) => {
  const { minTime, maxTime } = useMemo(() => {
    if (events.length === 0) {
      const now = new Date();
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { minTime: yearAgo.getTime(), maxTime: now.getTime() };
    }

    const timestamps = events.map((e) => new Date(e.timestamp).getTime());
    return {
      minTime: Math.min(...timestamps),
      maxTime: Math.max(...timestamps),
    };
  }, [events]);

  const startPct =
    ((value[0].getTime() - minTime) / (maxTime - minTime || 1)) * 100;
  const endPct =
    ((value[1].getTime() - minTime) / (maxTime - minTime || 1)) * 100;

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseInt(e.target.value, 10);
    const newStart = new Date(time);
    if (newStart < value[1]) {
      onChange([newStart, value[1]]);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseInt(e.target.value, 10);
    const newEnd = new Date(time);
    if (newEnd > value[0]) {
      onChange([value[0], newEnd]);
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="bg-cs-panel border border-cs-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Timeline
        </h3>
        <span className="text-xs text-gray-500">
          {formatDate(value[0])} — {formatDate(value[1])}
        </span>
      </div>

      <div className="relative">
        {/* Track highlight */}
        <div
          className="absolute h-1 bg-cs-accent rounded top-[10px]"
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
          }}
        />

        <div className="flex flex-col gap-1">
          <input
            type="range"
            min={minTime}
            max={maxTime}
            value={value[0].getTime()}
            onChange={handleStartChange}
            className="w-full"
            aria-label="Timeline start"
          />
          <input
            type="range"
            min={minTime}
            max={maxTime}
            value={value[1].getTime()}
            onChange={handleEndChange}
            className="w-full"
            aria-label="Timeline end"
          />
        </div>
      </div>

      <div className="flex justify-between mt-1 text-[10px] text-gray-600">
        <span>{formatDate(new Date(minTime))}</span>
        <span>{formatDate(new Date(maxTime))}</span>
      </div>
    </div>
  );
};

export default TimelineSlider;
