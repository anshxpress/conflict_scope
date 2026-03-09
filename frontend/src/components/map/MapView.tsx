"use client";

import { useEffect, useRef, type FC } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import type {
  ConflictEvent,
  InfrastructureItem,
  EventType,
  RiskMap,
} from "@/types";
import { EVENT_TYPE_COLORS } from "@/types";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MapViewProps {
  events: ConflictEvent[];
  infrastructure: InfrastructureItem[];
  showHeatmap: boolean;
  showInfrastructure: boolean;
  selectedEvent: ConflictEvent | null;
  onEventSelect: (event: ConflictEvent) => void;
  /** Country name â†’ "red" | "orange" | "green". Drives the choropleth layer. */
  riskMap: RiskMap;
  /** Called when the user clicks a country polygon. Passes the DB country name. */
  onCountrySelect: (country: string) => void;
}

// â”€â”€ Country name normalisation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// GeoJSON (Natural Earth) uses `ADMIN` names which occasionally differ from
// the English names Nominatim stores in the database.  This lookup normalises
// GeoJSON names â†’ DB names before matching against the riskMap keys.
//
// Maps GeoJSON ADMIN property values → DB country names where they differ.
// Natural Earth 110m uses full English names in ADMIN, so most countries need
// no mapping at all (pass-through).  Only the exceptions are listed here.
const GEO_TO_DB: Record<string, string> = {
  "United States of America": "United States",
  "United Republic of Tanzania": "Tanzania",
  "North Macedonia": "Macedonia",
};

function resolveDbName(geoAdmin: string): string {
  return GEO_TO_DB[geoAdmin] ?? geoAdmin;
}

// â”€â”€ Choropleth styling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RISK_FILL: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  green: "#22c55e",
};

function countryStyle(riskLevel: string | undefined): L.PathOptions {
  const fill = RISK_FILL[riskLevel ?? "green"] ?? RISK_FILL.green;
  return {
    fillColor: fill,
    fillOpacity: riskLevel && riskLevel !== "green" ? 0.45 : 0.08,
    color: "#374151",
    weight: 0.5,
    opacity: 0.6,
  };
}

// â”€â”€ Marker helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function createEventIcon(eventType: EventType): L.DivIcon {
  const color = EVENT_TYPE_COLORS[eventType] || "#ef4444";
  return L.divIcon({
    className: "custom-event-marker",
    html: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${color};
          opacity:0.3;
        " class="event-marker-pulse"></div>
        <div style="
          position:absolute;top:4px;left:4px;
          width:16px;height:16px;
          border-radius:50%;
          background:${color};
          border:2px solid rgba(255,255,255,0.8);
          box-shadow:0 0 8px ${color};
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const infraIcon = L.divIcon({
  className: "custom-infra-marker",
  html: `
    <div style="
      width:12px;height:12px;
      border-radius:50%;
      background:#3b82f6;
      border:2px solid rgba(255,255,255,0.6);
      box-shadow:0 0 6px rgba(59,130,246,0.6);
    "></div>
  `,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MapView: FC<MapViewProps> = ({
  events,
  infrastructure,
  showHeatmap,
  showInfrastructure,
  selectedEvent,
  onEventSelect,
  riskMap,
  onCountrySelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const eventLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const infraLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);

  // Keep a ref to the latest riskMap so the GeoJSON style function always
  // reads the current value without needing to recreate the layer.
  const riskMapRef = useRef<RiskMap>(riskMap);

  // â”€â”€ Map initialisation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30, 20],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
      minZoom: 2,
      maxZoom: 18,
      // Smooth zoom: fractional steps + easing
      zoomSnap: 0.25,
      zoomDelta: 0.25,
      wheelDebounceTime: 80,
      wheelPxPerZoomLevel: 120,
      zoomAnimation: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      geoJsonLayerRef.current = null;
    };
  }, []);

  // â”€â”€ GeoJSON countries choropleth layer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    fetch("/data/countries.geojson")
      .then((r) => r.json())
      .then((geo) => {
        const map = mapRef.current;
        if (!map) return;

        const layer = L.geoJSON(geo, {
          style: (feature) => {
            const admin: string = feature?.properties?.ADMIN ?? "";
            const dbName = resolveDbName(admin);
            const level = riskMapRef.current[dbName];
            return countryStyle(level);
          },
          onEachFeature: (feature, featureLayer) => {
            featureLayer.on({
              click: () => {
                const admin: string = feature?.properties?.ADMIN ?? "";
                const dbName = resolveDbName(admin);
                onCountrySelect(dbName);
              },
              mouseover: (e) => {
                const l = e.target as L.Path;
                l.setStyle({ weight: 1.5, color: "#9ca3af", fillOpacity: 0.6 });
              },
              mouseout: (e) => {
                layer.resetStyle(e.target as L.Path);
              },
            });
          },
        });

        layer.addTo(map);
        geoJsonLayerRef.current = layer;
      })
      .catch((err) =>
        console.error("[MapView] Failed to load countries GeoJSON:", err),
      );
    // Only run on mount â€” subsequent riskMap changes use the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // â”€â”€ Re-style choropleth when riskMap prop changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    riskMapRef.current = riskMap;
    const layer = geoJsonLayerRef.current;
    if (!layer) return;

    layer.setStyle((feature) => {
      const admin: string = feature?.properties?.ADMIN ?? "";
      const dbName = resolveDbName(admin);
      const level = riskMap[dbName];
      return countryStyle(level);
    });
  }, [riskMap]);

  // â”€â”€ Event markers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (eventLayerRef.current) {
      map.removeLayer(eventLayerRef.current);
    }

    // @ts-ignore
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (c: L.MarkerCluster) => {
        const n = c.getChildCount();
        const color = n > 50 ? "#ef4444" : n > 10 ? "#f97316" : "#eab308";
        return L.divIcon({
          className: `marker-cluster`,
          html: `<div style="
            width:40px;height:40px;
            border-radius:50%;
            background:${color};
            opacity:0.85;
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:bold;font-size:12px;
            border:2px solid rgba(255,255,255,0.5);
            box-shadow:0 0 12px ${color};
          ">${n}</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      },
    });

    for (const event of events) {
      const marker = L.marker([event.latitude, event.longitude], {
        icon: createEventIcon(event.eventType),
      });

      marker.bindPopup(`
        <div style="min-width:200px;">
          <h3 style="margin:0 0 4px;font-size:14px;font-weight:600;color:#f9fafb;">
            ${escapeHtml(event.title)}
          </h3>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">
            ${event.eventType.replace(/_/g, " ")} &bull; ${escapeHtml(event.country)}
          </div>
          <div style="font-size:11px;color:#6b7280;">
            ${new Date(event.timestamp).toLocaleString()}
          </div>
          <div style="margin-top:6px;font-size:10px;padding:2px 6px;
            border-radius:10px;display:inline-block;
            background:${
              event.confidenceScore === "high"
                ? "#166534"
                : event.confidenceScore === "medium"
                  ? "#854d0e"
                  : "#7f1d1d"
            };color:white;">
            ${event.confidenceScore} confidence
          </div>
        </div>
      `);

      marker.on("click", () => onEventSelect(event));
      cluster.addLayer(marker);
    }

    map.addLayer(cluster);
    eventLayerRef.current = cluster;
  }, [events, onEventSelect]);

  // â”€â”€ Infrastructure layer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (infraLayerRef.current) {
      map.removeLayer(infraLayerRef.current);
      infraLayerRef.current = null;
    }

    if (!showInfrastructure || infrastructure.length === 0) return;

    const layer = L.layerGroup();

    for (const item of infrastructure) {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: infraIcon,
      });
      marker.bindPopup(`
        <div>
          <h4 style="margin:0;font-size:12px;color:#93c5fd;">${escapeHtml(item.name)}</h4>
          <div style="font-size:11px;color:#9ca3af;">
            ${item.type.replace(/_/g, " ")} &bull; ${escapeHtml(item.country)}
          </div>
        </div>
      `);
      layer.addLayer(marker);
    }

    layer.addTo(map);
    infraLayerRef.current = layer;
  }, [infrastructure, showInfrastructure]);

  // â”€â”€ Heatmap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!showHeatmap || events.length === 0) return;

    const heatData: [number, number, number][] = events.map((e) => [
      e.latitude,
      e.longitude,
      0.5,
    ]);

    // @ts-ignore
    const heat = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: {
        0.2: "#fef08a",
        0.5: "#f97316",
        0.8: "#ef4444",
        1.0: "#dc2626",
      },
    });

    heat.addTo(map);
    heatLayerRef.current = heat;
  }, [events, showHeatmap]);

  // â”€â”€ Fly to selected event â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (selectedEvent && mapRef.current) {
      mapRef.current.flyTo(
        [selectedEvent.latitude, selectedEvent.longitude],
        10,
        { duration: 1.5 },
      );
    }
  }, [selectedEvent]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ minHeight: "400px" }}
    />
  );
};

function escapeHtml(str: string): string {
  const div =
    typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.textContent = str;
    return div.innerHTML;
  }
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default MapView;
