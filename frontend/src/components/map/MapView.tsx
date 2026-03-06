"use client";

import { useEffect, useRef, useState, useCallback, type FC } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import type { ConflictEvent, InfrastructureItem, EventType } from "@/types";
import { EVENT_TYPE_COLORS } from "@/types";

interface MapViewProps {
  events: ConflictEvent[];
  infrastructure: InfrastructureItem[];
  showHeatmap: boolean;
  showInfrastructure: boolean;
  selectedEvent: ConflictEvent | null;
  onEventSelect: (event: ConflictEvent) => void;
  filteredTimeRange?: [Date, Date] | null;
}

// Marker icon factory
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

const MapView: FC<MapViewProps> = ({
  events,
  infrastructure,
  showHeatmap,
  showInfrastructure,
  selectedEvent,
  onEventSelect,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const eventLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const infraLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30, 35],
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
      minZoom: 2,
      maxZoom: 18,
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
    };
  }, []);

  // Update event markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old layer
    if (eventLayerRef.current) {
      map.removeLayer(eventLayerRef.current);
    }

    // @ts-ignore - markerClusterGroup exists via plugin
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const count = cluster.getChildCount();
        let size = "small";
        let color = "#eab308";
        if (count > 50) {
          size = "large";
          color = "#ef4444";
        } else if (count > 10) {
          size = "medium";
          color = "#f97316";
        }
        return L.divIcon({
          className: `marker-cluster marker-cluster-${size}`,
          html: `<div style="
            width:40px;height:40px;
            border-radius:50%;
            background:${color};
            opacity:0.85;
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:bold;font-size:12px;
            border:2px solid rgba(255,255,255,0.5);
            box-shadow:0 0 12px ${color};
          ">${count}</div>`,
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
            ${event.eventType.replace("_", " ")} • ${event.country}
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

  // Update infrastructure layer
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
            ${item.type.replace("_", " ")} • ${item.country}
          </div>
        </div>
      `);
      layer.addLayer(marker);
    }

    layer.addTo(map);
    infraLayerRef.current = layer;
  }, [infrastructure, showInfrastructure]);

  // Update heatmap
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

    // @ts-ignore - heat is from leaflet.heat plugin
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

  // Fly to selected event
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
