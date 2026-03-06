import nlp from "compromise";
import type { EventType } from "../../../db/schema";

export interface ExtractedEvent {
  title: string;
  description: string;
  eventType: EventType;
  locations: string[];
  country: string;
  isConflictRelated: boolean;
  keywords: string[];
}

// ── War-related keyword dictionaries ────────────────────

const WAR_KEYWORDS: Record<EventType, string[]> = {
  airstrike: [
    "airstrike",
    "air strike",
    "air raid",
    "aerial bombardment",
    "air assault",
    "bombing raid",
    "aerial attack",
  ],
  missile_strike: [
    "missile",
    "rocket attack",
    "ballistic",
    "cruise missile",
    "missile strike",
    "rocket strike",
    "icbm",
    "missile launch",
  ],
  explosion: [
    "explosion",
    "blast",
    "detonation",
    "bomb",
    "ied",
    "car bomb",
    "suicide bomb",
    "improvised explosive",
  ],
  drone_strike: [
    "drone strike",
    "drone attack",
    "uav",
    "unmanned aerial",
    "kamikaze drone",
    "shahed",
    "drone warfare",
  ],
  infrastructure_attack: [
    "infrastructure attack",
    "power grid",
    "power plant attack",
    "bridge destroyed",
    "dam attack",
    "pipeline attack",
    "refinery attack",
    "energy infrastructure",
  ],
  armed_conflict: [
    "armed conflict",
    "firefight",
    "battle",
    "combat",
    "clashes",
    "skirmish",
    "offensive",
    "invasion",
    "siege",
    "military operation",
    "troops",
    "ground assault",
    "shelling",
    "artillery",
    "war",
    "warfare",
    "casualties",
    "killed",
    "wounded",
    "soldiers",
    "military",
  ],
};

const ALL_WAR_KEYWORDS = Object.values(WAR_KEYWORDS).flat();

// ── Known conflict-related country/region list ──────────

const CONFLICT_REGIONS = new Set([
  "ukraine",
  "russia",
  "syria",
  "yemen",
  "sudan",
  "myanmar",
  "ethiopia",
  "somalia",
  "libya",
  "iraq",
  "afghanistan",
  "palestine",
  "israel",
  "gaza",
  "lebanon",
  "mali",
  "burkina faso",
  "niger",
  "democratic republic of congo",
  "drc",
  "congo",
  "haiti",
  "pakistan",
  "iran",
  "taiwan",
  "north korea",
]);

/**
 * Process a news article through the NLP pipeline to extract structured conflict event data.
 */
export function extractConflictEvent(
  title: string,
  content: string,
  sourceName: string
): ExtractedEvent | null {
  const combinedText = `${title}. ${content}`.toLowerCase();

  // Step 1: Check if conflict-related
  const matchedKeywords = ALL_WAR_KEYWORDS.filter((kw) =>
    combinedText.includes(kw)
  );
  if (matchedKeywords.length === 0) return null;

  // Step 2: Classify event type
  const eventType = classifyEventType(combinedText);

  // Step 3: Extract locations using compromise NLP
  const doc = nlp(`${title}. ${content}`);
  const places = doc.places().out("array") as string[];
  const organizations = doc.organizations().out("array") as string[];

  // Also extract proper nouns that might be locations
  const topics = doc.topics().out("array") as string[];

  // Combine and deduplicate locations
  const allLocations = [...new Set([...places, ...topics])].filter(
    (loc) => loc.length > 2 && !isOrganization(loc, organizations)
  );

  // Step 4: Detect country
  const country = detectCountry(combinedText, allLocations);
  if (!country) return null;

  // Step 5: Build description
  const description = content.length > 500 ? content.slice(0, 500) + "..." : content;

  return {
    title,
    description,
    eventType,
    locations: allLocations.slice(0, 5), // Top 5 locations
    country,
    isConflictRelated: true,
    keywords: matchedKeywords,
  };
}

function classifyEventType(text: string): EventType {
  let bestType: EventType = "armed_conflict";
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(WAR_KEYWORDS)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestType = type as EventType;
    }
  }

  return bestType;
}

function detectCountry(text: string, locations: string[]): string | null {
  // Check locations against known conflict regions
  for (const loc of locations) {
    const lower = loc.toLowerCase();
    for (const region of CONFLICT_REGIONS) {
      if (lower.includes(region) || region.includes(lower)) {
        return capitalizeFirst(region);
      }
    }
  }

  // Check text directly for country mentions
  for (const region of CONFLICT_REGIONS) {
    if (text.includes(region)) {
      return capitalizeFirst(region);
    }
  }

  // If we find locations but no known country, try to use them
  if (locations.length > 0) {
    return locations[0]; // Will be geocoded later to resolve real country
  }

  return null;
}

function isOrganization(name: string, orgs: string[]): boolean {
  const orgWords = [
    "nato",
    "un",
    "reuters",
    "bbc",
    "pentagon",
    "kremlin",
    "hamas",
    "hezbollah",
    "isis",
    "al qaeda",
    "wagner",
  ];
  const lower = name.toLowerCase();
  if (orgWords.some((o) => lower.includes(o))) return true;
  if (orgs.some((o) => o.toLowerCase() === lower)) return true;
  return false;
}

function capitalizeFirst(s: string): string {
  return s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
