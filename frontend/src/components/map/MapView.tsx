"use client";

import { useEffect, useRef, useState, useMemo, type FC } from "react";
import type {
  ConflictEvent,
  InfrastructureItem,
  RiskMap,
  CountryResource,
} from "@/types";
import { EVENT_TYPE_COLORS } from "@/types";
import { useCountryConnections } from "@/lib/hooks";
import Globe from "react-globe.gl";

// ── Types ───────────────────────────────────────────────────────────────────

interface MapViewProps {
  events: ConflictEvent[];
  infrastructure: InfrastructureItem[];
  showHeatmap: boolean;
  showInfrastructure: boolean;
  selectedEvent: ConflictEvent | null;
  onEventSelect: (event: ConflictEvent) => void;
  /** Country name → "red" | "orange" | "green". Drives the choropleth layer. */
  riskMap: RiskMap;
  /** Called when the user clicks a country polygon. Passes the DB country name. */
  onCountrySelect: (country: string) => void;
  selectedCountry: string | null;
  /** Resource data for icon markers on map. */
  resources?: CountryResource[];
}

// ── Country name normalisation ─────────────────────────────────────────────

const GEO_TO_DB: Record<string, string> = {
  "United States of America": "United States",
  "United Republic of Tanzania": "Tanzania",
  "North Macedonia": "Macedonia",
};

function resolveDbName(geoAdmin: string): string {
  return GEO_TO_DB[geoAdmin] ?? geoAdmin;
}

// ── Country centroids (lat/lng) for centroid bubble placement ──────────────

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  "India": [20.5937, 78.9629],
  "Saudi Arabia": [23.8859, 45.0792],
  "Russia": [61.5240, 105.3188],
  "Ukraine": [48.3794, 31.1656],
  "United States": [37.0902, -95.7129],
  "China": [35.8617, 104.1954],
  "Iran": [32.4279, 53.6880],
  "Israel": [31.0461, 34.8516],
  "Palestine": [31.9522, 35.2332],
  "United Kingdom": [55.3781, -3.4360],
  "Germany": [51.1657, 10.4515],
  "France": [46.2276, 2.2137],
  "Japan": [36.2048, 138.2529],
  "Yemen": [15.5527, 48.5164],
  "Syria": [34.8021, 38.9968],
  "Sudan": [12.8628, 30.2176],
  "Pakistan": [30.3753, 69.3451],
  "Taiwan": [23.6978, 120.9605],
  "Venezuela": [6.4238, -66.5897],
  "Iraq": [33.2232, 43.6793],
  "Canada": [56.0, -96.0],
  "Australia": [-27.0, 133.0],
  "Brazil": [-14.2350, -51.9250],
  "South Africa": [-30.5595, 22.9375],
  "Egypt": [26.8206, 30.8025],
  "Turkey": [38.9637, 35.2433],
  "South Korea": [35.9078, 127.7669],
  "Mexico": [23.6345, -102.5528],
  "Indonesia": [-0.7893, 113.9213],
  "Nigeria": [9.0820, 8.6753],
  "Argentina": [-38.4161, -63.6167],
  "New Zealand": [-40.9006, 174.8860],
  "Italy": [41.8719, 12.5674],
  "Spain": [40.4637, -3.7492],
  "Poland": [51.9194, 19.1451],
  "Colombia": [4.5709, -74.2973],
  "Philippines": [12.8797, 121.7740],
  "Vietnam": [14.0583, 108.2772],
  "Thailand": [15.8700, 100.9925],
  "Libya": [26.3351, 17.2283],
  "Lebanon": [33.8547, 35.8623],
  "Jordan": [30.5852, 36.2384],
  "Kenya": [-1.2921, 36.8219],
  "Ethiopia": [9.1450, 40.4897],
  "Afghanistan": [33.9391, 67.7100],
};

const RISK_FILL: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  green: "#22c55e",
};

const CATEGORY_COLORS: Record<string, string> = {
  Conflict: "#ef4444",
  Commodity: "#eab308",
  Trade: "#3b82f6",
  Policy: "#f97316",
  Technology: "#a855f7",
  Health: "#22c55e",
};

const COMMODITY_ICONS: Record<string, string> = {
  gold: "🟡",
  silver: "⚪",
  oil: "🛢",
};

const MapView: FC<MapViewProps> = ({
  events,
  infrastructure,
  showHeatmap,
  showInfrastructure,
  selectedEvent,
  onEventSelect,
  riskMap,
  onCountrySelect,
  selectedCountry,
  resources = [],
}) => {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 1. Fetch GeoJSON for the country polygons choropleth layer
  useEffect(() => {
    fetch("/data/countries.geojson")
      .then((r) => r.json())
      .then((data) => {
        setGeoJsonData(data);
      })
      .catch((err) => console.error("[GlobeView] Failed to load GeoJSON:", err));
  }, []);

  // 2. Measure container dynamically for absolute responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height: Math.max(400, height) });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 3. Inject glowing pulse CSS animation keyframes
  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "globe-bubble-glow-style";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.innerHTML = `
        @keyframes red-pulse {
          0% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0); }
        }
        @keyframes orange-pulse {
          0% { box-shadow: 0 0 0 0px rgba(249, 115, 22, 0.7); }
          70% { box-shadow: 0 0 0 12px rgba(249, 115, 22, 0); }
          100% { box-shadow: 0 0 0 0px rgba(249, 115, 22, 0); }
        }
        @keyframes green-pulse {
          0% { box-shadow: 0 0 0 0px rgba(34, 197, 94, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0px rgba(34, 197, 94, 0); }
        }
        .red-glow-bubble { animation: red-pulse 1.8s infinite; }
        .orange-glow-bubble { animation: orange-pulse 2s infinite; }
        .green-glow-bubble { animation: green-pulse 2.2s infinite; }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  // 4. Fetch dynamic country connections from SWR hook (refreshes every 60s)
  const { data: connectionsData } = useCountryConnections(selectedCountry);

  // 5. Compute top 10 influence routes for active connection arcs on the Globe
  const activeArcs = useMemo(() => {
    if (!selectedCountry || !connectionsData || !connectionsData.routes) return [];

    const arcsList: any[] = [];
    const targetCentroid = COUNTRY_CENTROIDS[selectedCountry];
    if (!targetCentroid) return [];

    // Limit to top 10 strongest routes per requirements
    const topRoutes = connectionsData.routes
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    for (const route of topRoutes) {
      const sourceCentroid = COUNTRY_CENTROIDS[route.destination];
      if (!sourceCentroid) continue;

      const color = CATEGORY_COLORS[route.category] || "#f97316";

      // Map connection score & intensity into custom stroke widths (thickness) and speeds (animate time)
      let stroke = 0.5;
      let animateTime = 4000;
      if (route.intensity === "double" || route.score >= 100) {
        stroke = 2.0;
        animateTime = 800; // double pulse, fast movement
      } else if (route.intensity === "high" || route.score >= 50) {
        stroke = 1.3;
        animateTime = 1400; // fast speed
      } else if (route.intensity === "medium" || route.score >= 20) {
        stroke = 0.8;
        animateTime = 2400; // medium speed
      } else {
        stroke = 0.4;
        animateTime = 4000; // thin, slow movement
      }

      arcsList.push({
        startLat: sourceCentroid[0],
        startLng: sourceCentroid[1],
        endLat: targetCentroid[0],
        endLng: targetCentroid[1],
        color,
        stroke,
        dashLength: 0.35,
        dashGap: 0.2,
        dashAnimateTime: animateTime,
      });
    }

    return arcsList;
  }, [selectedCountry, connectionsData]);

  // ── Labels layer for country names ─────────────────────────────────────────
  const labels = useMemo(() => {
    return Object.entries(COUNTRY_CENTROIDS).map(([country, coords]) => {
      const level = riskMap[country] || "green";
      
      const color = level === "red"
        ? "#f87171" // bright glowing red
        : level === "orange"
          ? "#fb923c" // bright glowing orange
          : "rgba(156, 163, 175, 0.45)"; // subtle gray for stable countries

      const size = level === "red" ? 0.95 : level === "orange" ? 0.8 : 0.65;
      const dotRadius = level === "red" ? 0.22 : level === "orange" ? 0.15 : 0.06;

      return {
        lat: coords[0],
        lng: coords[1],
        text: country,
        color,
        size,
        dotRadius,
        alt: 0.008,
      };
    });
  }, [riskMap]);

  // 6. Compile HTML Element Markers: Centroid Bubble, Events, Infrastructure, Resources
  const markers = useMemo(() => {
    const list: Array<{
      lat: number;
      lng: number;
      alt: number;
      html: string;
      onClick?: () => void;
    }> = [];

    // Centroid Bubble (Only shows when a country is active/clicked)
    if (selectedCountry) {
      const coords = COUNTRY_CENTROIDS[selectedCountry];
      if (coords) {
        const level = riskMap[selectedCountry] || "green";
        const color = RISK_FILL[level] || RISK_FILL.green;
        const eventsCount = events.filter(e => e.country.toLowerCase() === selectedCountry.toLowerCase()).length;
        const logRadius = Math.max(16, Math.log2(eventsCount + 1) * 10);
        const glowClass = level === "red" ? "red-glow-bubble" : level === "orange" ? "orange-glow-bubble" : "green-glow-bubble";

        list.push({
          lat: coords[0],
          lng: coords[1],
          alt: 0.02,
          html: `
            <div class="${glowClass}" style="
              width: ${logRadius * 1.8}px;
              height: ${logRadius * 1.8}px;
              border-radius: 50%;
              background: ${color}2b;
              border: 2.2px solid ${color};
              display: flex;
              align-items: center;
              justify-content: center;
              backdrop-filter: blur(4px);
              transform: translate(-50%, -50%);
            ">
              <div style="
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: ${color};
                box-shadow: 0 0 8px ${color};
              "></div>
            </div>
          `,
        });
      }
    }

    // Infrastructure Markers
    if (showInfrastructure) {
      for (const item of infrastructure) {
        list.push({
          lat: item.latitude,
          lng: item.longitude,
          alt: 0.012,
          html: `
            <div style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #3b82f6;
              border: 1.5px solid rgba(255,255,255,0.7);
              box-shadow: 0 0 6px rgba(59,130,246,0.7);
              transform: translate(-50%, -50%);
            " title="${item.name} (${item.type.replace(/_/g, ' ')})"></div>
          `,
        });
      }
    }

    // Commodity Resources Markers (Placed slightly north of country centroids)
    if (resources && resources.length > 0) {
      for (const entry of resources) {
        if (!entry.resources || entry.resources.length === 0) continue;
        const coords = COUNTRY_CENTROIDS[entry.country];
        if (!coords) continue;

        const icons = entry.resources
          .map((r) => COMMODITY_ICONS[r] ?? "")
          .filter(Boolean)
          .join(" ");

        if (!icons) continue;

        list.push({
          lat: coords[0] + 2.8, // nudge north slightly to avoid centroid overlaps
          lng: coords[1],
          alt: 0.008,
          html: `
            <div style="
              font-size: 11px;
              line-height: 1;
              text-shadow: 0 1px 3px rgba(0,0,0,0.9);
              white-space: nowrap;
              pointer-events: none;
              filter: drop-shadow(0 0 2px rgba(0,0,0,0.8));
              transform: translate(-50%, -50%);
              background: rgba(11, 15, 25, 0.7);
              border: 1px solid rgba(255,255,255,0.15);
              padding: 2.5px 5px;
              border-radius: 4px;
              color: white;
            ">${icons}</div>
          `,
        });
      }
    }

    // Geopolitical Conflict Event Markers
    for (const ev of events) {
      const color = EVENT_TYPE_COLORS[ev.eventType] || "#ef4444";
      const isSelected = selectedEvent?.id === ev.id;
      const size = isSelected ? 12 : showHeatmap ? 14 : 7;
      const shadow = isSelected ? `0 0 10px 4px ${color}` : `0 0 6px ${color}`;

      list.push({
        lat: ev.latitude,
        lng: ev.longitude,
        alt: 0.015,
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: ${color};
            border: 1px solid rgba(255,255,255,0.8);
            box-shadow: ${shadow};
            transform: translate(-50%, -50%);
            transition: all 0.2s ease-in-out;
          " title="${ev.title}"></div>
        `,
        onClick: () => onEventSelect(ev),
      });
    }

    return list;
  }, [events, infrastructure, showInfrastructure, resources, selectedCountry, riskMap, selectedEvent, showHeatmap, onEventSelect]);

  // 7. Globe camera control effects
  useEffect(() => {
    if (!globeRef.current) return;

    if (selectedCountry) {
      const coords = COUNTRY_CENTROIDS[selectedCountry];
      if (coords) {
        // Fly smoothly to target centroid, shifting camera slightly south for breathing space
        globeRef.current.pointOfView(
          { lat: coords[0] - 11, lng: coords[1], altitude: 1.25 },
          1400
        );
      }
    } else {
      // Zoom back out to global view
      globeRef.current.pointOfView({ lat: 25, lng: 15, altitude: 2.2 }, 1400);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (!globeRef.current || !selectedEvent) return;
    // Focus in on single event
    globeRef.current.pointOfView(
      { lat: selectedEvent.latitude, lng: selectedEvent.longitude, altitude: 0.65 },
      1400
    );
  }, [selectedEvent]);

  const handleResetView = () => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 25, lng: 15, altitude: 2.2 }, 1200);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ minHeight: "400px" }}>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Choropleth layers
        polygonsData={geoJsonData ? geoJsonData.features : []}
        polygonCapColor={(feat: any) => {
          const admin = feat?.properties?.ADMIN ?? "";
          const dbName = resolveDbName(admin);
          const level = riskMap[dbName];
          return level && level !== "green"
            ? `${RISK_FILL[level]}4a` // 29% opacity for threat risk zones
            : "rgba(34, 197, 94, 0.05)"; // stable / green
        }}
        polygonSideColor={() => "rgba(255, 255, 255, 0.02)"}
        polygonStrokeColor={() => "#1c2430"}
        polygonStrokeWidth={0.5}
        polygonAltitude={0.005}
        onPolygonClick={(feat: any) => {
          const admin = feat?.properties?.ADMIN ?? "";
          const dbName = resolveDbName(admin);
          onCountrySelect(dbName);
        }}

        // HTML elements markers
        htmlElementsData={markers}
        htmlElement={(d: any) => {
          const el = document.createElement("div");
          el.innerHTML = d.html;
          if (d.onClick) {
            el.onclick = d.onClick;
            el.style.cursor = "pointer";
          }
          return el;
        }}
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlAltitude={(d: any) => d.alt}

        // Labeled country names
        labelsData={labels}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng}
        labelText={(d: any) => d.text}
        labelColor={(d: any) => d.color}
        labelSize={(d: any) => d.size}
        labelDotRadius={(d: any) => d.dotRadius}
        labelAltitude={(d: any) => d.alt}

        // Animated connection layer (arcs with continuous glowing pulses)
        arcsData={activeArcs}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={(d: any) => d.color}
        arcStroke={(d: any) => d.stroke}
        arcDashLength={(d: any) => d.dashLength}
        arcDashGap={(d: any) => d.dashGap}
        arcDashAnimateTime={(d: any) => d.dashAnimateTime}
        arcAltitudeAutoScale={0.4}
      />

      <button
        type="button"
        onClick={handleResetView}
        className="absolute top-4 left-4 z-[1001] rounded-md border border-cs-border bg-cs-panel/90 px-3 py-1.5 text-xs font-medium text-gray-200 shadow-md backdrop-blur-sm transition-colors hover:border-gray-500 hover:text-white"
        title="Reset map to full view"
        aria-label="Reset map to full view"
      >
        Full View
      </button>
    </div>
  );
};

export default MapView;
