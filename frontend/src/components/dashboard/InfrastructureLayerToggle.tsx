"use client";

import { FC } from "react";
import { INFRASTRUCTURE_TYPE_LABELS } from "@/types";
import type { InfrastructureType } from "@/types";

interface InfraLayerToggleProps {
  showInfrastructure: boolean;
  showHeatmap: boolean;
  showEvents: boolean;
  onToggleInfrastructure: () => void;
  onToggleHeatmap: () => void;
  onToggleEvents: () => void;
  activeInfraTypes: Set<InfrastructureType>;
  onToggleInfraType: (type: InfrastructureType) => void;
}

const INFRA_TYPES: InfrastructureType[] = [
  "airport",
  "seaport",
  "power_plant",
  "oil_refinery",
  "government_building",
];

const INFRA_ICONS: Record<InfrastructureType, string> = {
  airport: "✈",
  seaport: "⚓",
  power_plant: "⚡",
  oil_refinery: "🛢",
  government_building: "🏛",
};

const InfrastructureLayerToggle: FC<InfraLayerToggleProps> = ({
  showInfrastructure,
  showHeatmap,
  showEvents,
  onToggleInfrastructure,
  onToggleHeatmap,
  onToggleEvents,
  activeInfraTypes,
  onToggleInfraType,
}) => {
  return (
    <div className="bg-cs-panel border border-cs-border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
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
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        Map Layers
      </h3>

      {/* Primary toggles */}
      <div className="space-y-2 mb-3">
        <Toggle
          label="Conflict Events"
          active={showEvents}
          color="#ef4444"
          onToggle={onToggleEvents}
        />
        <Toggle
          label="Conflict Heatmap"
          active={showHeatmap}
          color="#f97316"
          onToggle={onToggleHeatmap}
        />
        <Toggle
          label="Infrastructure"
          active={showInfrastructure}
          color="#3b82f6"
          onToggle={onToggleInfrastructure}
        />
      </div>

      {/* Infrastructure sub-types */}
      {showInfrastructure && (
        <div className="border-t border-cs-border pt-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            Infrastructure Types
          </div>
          <div className="space-y-1.5">
            {INFRA_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => onToggleInfraType(type)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                  activeInfraTypes.has(type)
                    ? "bg-cs-blue/20 text-cs-blue"
                    : "text-gray-500 hover:text-gray-400"
                }`}
              >
                <span className="w-5 text-center text-sm">
                  {INFRA_ICONS[type]}
                </span>
                <span>{INFRASTRUCTURE_TYPE_LABELS[type]}</span>
                {activeInfraTypes.has(type) && (
                  <svg
                    className="w-3 h-3 ml-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface ToggleProps {
  label: string;
  active: boolean;
  color: string;
  onToggle: () => void;
}

const Toggle: FC<ToggleProps> = ({ label, active, color, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between group"
    aria-pressed={active}
  >
    <div className="flex items-center gap-2">
      <span
        className="w-3 h-3 rounded-full transition-opacity"
        style={{ background: color, opacity: active ? 1 : 0.3 }}
      />
      <span
        className={`text-xs transition-colors ${active ? "text-gray-300" : "text-gray-600"}`}
      >
        {label}
      </span>
    </div>
    {/* Toggle switch */}
    <div
      className={`relative w-8 h-4 rounded-full transition-colors ${
        active ? "bg-cs-accent/50" : "bg-gray-700"
      }`}
    >
      <div
        className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${
          active ? "translate-x-4 bg-cs-accent" : "translate-x-0.5 bg-gray-500"
        }`}
      />
    </div>
  </button>
);

export default InfrastructureLayerToggle;
