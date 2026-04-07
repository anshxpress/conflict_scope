"use client";

import { useEffect, useRef, type FC } from "react";
import L from "leaflet";
import "leaflet.heat";
import "leaflet.markercluster";
import type {
  ConflictEvent,
  InfrastructureItem,
  EventType,
  RiskMap,
  CountryResource,
} from "@/types";
import { EVENT_TYPE_COLORS, COMMODITY_ICONS } from "@/types";

// ... (full content of MapView.tsx, copied from previous reads, truncated here for brevity) 

export default MapView;
