export interface ConflictEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: EventType;
  country: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  confidenceScore: ConfidenceLevel;
  sourceUrl: string;
  articleId?: string | null;
  createdAt: string;
  sources?: EventSource[];
  impacts?: EventImpact[];
}

export interface EventSource {
  id: string;
  eventId: string;
  sourceName: string;
  articleUrl: string;
  publishedDate: string | null;
}

export interface EventImpact {
  id: string;
  eventId: string;
  impactType: ImpactType;
  description: string | null;
  severity: ImpactSeverity;
}

export type ImpactType =
  | "civilian_casualties"
  | "military_casualties"
  | "infrastructure_damage"
  | "power_plant_damage"
  | "airport_damage"
  | "oil_refinery_damage"
  | "residential_destruction"
  | "refugee_displacement"
  | "government_building_damage"
  | "bridge_destroyed"
  | "communication_disruption"
  | "water_supply_damage"
  | "hospital_damage"
  | "school_damage"
  | "transportation_disruption";

export type ImpactSeverity = "low" | "medium" | "high" | "critical";

export interface InfrastructureItem {
  id: string;
  name: string;
  type: InfrastructureType;
  latitude: number;
  longitude: number;
  country: string;
}

export interface StatsResponse {
  totalEvents: number;
  byType: { eventType: string; count: number }[];
  byCountry: { country: string; count: number }[];
  byConfidence: { confidence: string; count: number }[];
  lastRecordedEvent: string | null;
}

export interface CountryStats {
  country: string;
  totalEvents: number;
  byType: { eventType: string; count: number }[];
  lastRecordedEvent: string | null;
  monthlyTrend: { month: string; count: number }[];
}

export interface EventsResponse {
  data: ConflictEvent[];
  total: number;
  limit: number;
  offset: number;
}

export type EventType =
  | "airstrike"
  | "missile_strike"
  | "explosion"
  | "drone_strike"
  | "infrastructure_attack"
  | "armed_conflict";

export type ConfidenceLevel = "low" | "medium" | "high";

export type InfrastructureType =
  | "airport"
  | "seaport"
  | "power_plant"
  | "oil_refinery"
  | "government_building";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  airstrike: "Airstrike",
  missile_strike: "Missile Strike",
  explosion: "Explosion",
  drone_strike: "Drone Strike",
  infrastructure_attack: "Infrastructure Attack",
  armed_conflict: "Armed Conflict",
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  airstrike: "#ef4444",
  missile_strike: "#f97316",
  explosion: "#eab308",
  drone_strike: "#a855f7",
  infrastructure_attack: "#f59e0b",
  armed_conflict: "#dc2626",
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  low: "Low Confidence",
  medium: "Medium Confidence",
  high: "High Confidence",
};

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  low: "#7f1d1d",
  medium: "#854d0e",
  high: "#166534",
};

export const INFRASTRUCTURE_TYPE_LABELS: Record<InfrastructureType, string> = {
  airport: "Airport",
  seaport: "Seaport",
  power_plant: "Power Plant",
  oil_refinery: "Oil Refinery",
  government_building: "Government Building",
};

// ── Risk map types ─────────────────────────────────────

export type RiskLevel = "red" | "orange" | "green";

/** Keyed by country name as stored in the DB (Nominatim English name). */
export type RiskMap = Record<string, RiskLevel>;

export interface CountryRiskDetails {
  country: string;
  riskLevel: RiskLevel;
  events14Days: number;
  events30Days: number;
  recentEvents: Array<{
    id: string;
    title: string;
    eventType: string;
    timestamp: string;
    latitude: number;
    longitude: number;
  }>;
  recentImpacts: Array<{
    id: string;
    eventId: string;
    impactType: ImpactType;
    description: string | null;
    severity: ImpactSeverity;
  }>;
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  red: "#ef4444",
  orange: "#f97316",
  green: "#22c55e",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  red: "High Risk - events in last 14 days",
  orange: "Recent Activity - events 15-30 days ago",
  green: "No Recent Events",
};

// ── Commodity types ────────────────────────────────────

export type CommodityName = "gold" | "silver" | "oil";

export interface CommodityPrice {
  price: number;
  currency: string;
  timestamp: string;
  source: string;
}

export type CommodityPrices = Record<CommodityName, CommodityPrice | null> & {
  usdToInr?: number;
};

export interface CountryResource {
  country: string;
  resources: CommodityName[];
}

export const COMMODITY_ICONS: Record<CommodityName, string> = {
  gold: "🟡",
  silver: "⚪",
  oil: "🛢",
};

export const COMMODITY_LABELS: Record<CommodityName, string> = {
  gold: "Gold",
  silver: "Silver",
  oil: "Crude Oil",
};

// ── Impact type display ────────────────────────────────

export const IMPACT_TYPE_LABELS: Record<ImpactType, string> = {
  civilian_casualties: "Civilian Casualties",
  military_casualties: "Military Casualties",
  infrastructure_damage: "Infrastructure Damage",
  power_plant_damage: "Power Plant Damage",
  airport_damage: "Airport Damage",
  oil_refinery_damage: "Oil Refinery Damage",
  residential_destruction: "Residential Destruction",
  refugee_displacement: "Refugee Displacement",
  government_building_damage: "Government Building Damage",
  bridge_destroyed: "Bridge Destroyed",
  communication_disruption: "Communication Disruption",
  water_supply_damage: "Water Supply Damage",
  hospital_damage: "Hospital Damage",
  school_damage: "School Damage",
  transportation_disruption: "Transportation Disruption",
};

export const IMPACT_TYPE_ICONS: Record<ImpactType, string> = {
  civilian_casualties: "👥",
  military_casualties: "🎖️",
  infrastructure_damage: "🏗️",
  power_plant_damage: "⚡",
  airport_damage: "✈️",
  oil_refinery_damage: "🛢️",
  residential_destruction: "🏚️",
  refugee_displacement: "🚶",
  government_building_damage: "🏛️",
  bridge_destroyed: "🌉",
  communication_disruption: "📡",
  water_supply_damage: "💧",
  hospital_damage: "🏥",
  school_damage: "🏫",
  transportation_disruption: "🚂",
};

export const SEVERITY_COLORS: Record<ImpactSeverity, string> = {
  low: "#6b7280",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

export const SEVERITY_LABELS: Record<ImpactSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};


