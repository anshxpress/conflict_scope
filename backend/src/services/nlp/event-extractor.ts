import nlp from "compromise";
import type { EventType, ImpactType, ImpactSeverity } from "../../../db/schema";

export interface ExtractedImpact {
  impactType: ImpactType;
  description: string;
  severity: ImpactSeverity;
}

export interface ExtractedEvent {
  title: string;
  description: string;
  eventType: EventType;
  eventCategory?: "military" | "political" | "economic" | "policy";
  locations: string[];
  country: string;
  isConflictRelated: boolean;
  keywords: string[];
  leaderName?: string | null;
  policyAction?: string | null;
  affectedCommodities?: Array<"gold" | "silver" | "oil">;
  impacts: ExtractedImpact[];
}

// ── Helper: word-boundary match ─────────────────────────────────────────────
// Prevents substring false positives like "heartwarming" → "war",
// "therapist" → "the rapist", "Israel" → "is real", etc.
const _wbCache = new Map<string, RegExp>();
function wordMatch(text: string, word: string): boolean {
  let re = _wbCache.get(word);
  if (!re) {
    re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i");
    _wbCache.set(word, re);
  }
  return re.test(text);
}

// ── War-related keyword dictionaries ────────────────────────────────────────

const WAR_KEYWORDS: Record<EventType, string[]> = {
  airstrike: [
    "airstrike",
    "airstrikes",
    "air strike",
    "air strikes",
    "air raid",
    "air raids",
    "aerial bombardment",
    "air assault",
    "bombing raid",
    "aerial attack",
    "bomb dropped",
    "bombs dropped",
  ],
  missile_strike: [
    "missile strike",
    "missile attack",
    "missile barrage",
    "missile launch",
    "rocket strike",
    "rocket attack",
    "rocket barrage",
    "ballistic missile",
    "cruise missile",
    "hypersonic missile",
    "kamikaze drone",
    "shahed drone",
    "icbm",
  ],
  explosion: [
    "suicide bombing",
    "suicide bomb",
    "car bomb",
    "truck bomb",
    "roadside bomb",
    "ied detonated",
    "bomb blast",
    "bomb exploded",
    "explosive device",
    "improvised explosive",
  ],
  drone_strike: [
    "drone strike",
    "drone attack",
    "drone barrage",
    "uav strike",
    "uav attack",
    "unmanned aerial vehicle",
    "drone warfare",
  ],
  infrastructure_attack: [
    "power grid attack",
    "power plant attacked",
    "power station bombed",
    "bridge destroyed",
    "bridge bombed",
    "dam attack",
    "dam bombed",
    "pipeline attacked",
    "refinery attacked",
    "energy infrastructure",
    "port attacked",
    "railway bombed",
    "railway attacked",
    // Maritime / shipping attacks
    "vessel attacked",
    "vessel seized",
    "vessel struck",
    "ship attacked",
    "ship seized",
    "ship struck",
    "cargo ship attacked",
    "cargo vessel attacked",
    "tanker attacked",
    "tanker seized",
    "tanker struck",
    "oil tanker attacked",
    "merchant vessel",
    "commercial vessel",
    "drone attack on ship",
    "drone struck vessel",
    "missile struck vessel",
    "missile hit ship",
    "warship attacked",
    "naval vessel",
    "hijacked vessel",
    "piracy attack",
    "armed attack on vessel",
    "strait of hormuz attack",
    "red sea attack",
    "bab el-mandeb",
    "houthi attack on ship",
    "houthi missile ship",
    "houthi drone ship",
  ],
  armed_conflict: [
    "military offensive",
    "ground offensive",
    "counter-offensive",
    "armed offensive",
    "troops advance",
    "troops retreat",
    "advancing forces",
    "artillery barrage",
    "artillery shelling",
    "mortar attack",
    "mortar fire",
    "heavy shelling",
    "civilians killed",
    "civilians dead",
    "civilian casualties",
    "soldiers killed",
    "troops killed",
    "killed in strike",
    "killed in attack",
    "killed in combat",
    "ceasefire",
    "cease-fire",
    "peace talks",
    "war crimes",
    "genocide",
    "ethnic cleansing",
    "coup attempt",
    "military coup",
    "coup d'état",
    "rebel advance",
    "rebel offensive",
    "rebel forces",
    "insurgent attack",
    "insurgent forces",
    "terrorist attack",
    "invasion of",
    "invasion force",
    "siege of",
    "under siege",
    "blockade",
    "annexed",
    "annexation",
    "military occupation",
    "occupied territory",
    "frontline",
    "front line",
    "war zone",
    "active combat",
    "nuclear threat",
    "nuclear strike",
    "sanctions imposed",
    "sanctions against",
    "arms embargo",
  ],
};

const ALL_WAR_KEYWORDS = Object.values(WAR_KEYWORDS).flat();

const POLITICAL_ECONOMIC_KEYWORDS = [
  "sanctions",
  "trade restrictions",
  "tariffs",
  "export ban",
  "production cut",
  "output cut",
  "energy law",
  "mining regulation",
  "economic policy",
  "peace negotiations",
  "diplomatic tension",
  "leader said",
  "announced policy",
  "threatened sanctions",
  "energy exports",
  "production announcement",
];

const LEADER_CUES = [
  "president",
  "prime minister",
  "energy minister",
  "foreign minister",
  "chancellor",
  "minister",
];

// ── Weak words: require ADDITIONAL context to count ─────────────────────────
//
// These words appear regularly in entertainment, sports, and non-conflict
// journalism. A single weak-word match alone is NOT enough to flag an article
// as conflict-related — at least one SPECIFIC keyword from ALL_WAR_KEYWORDS
// must also be present.
const WEAK_STANDALONE_WORDS = new Set([
  "war", "wars", "battle", "battles", "combat", "fight", "fights",
  "troop", "troops", "military", "soldier", "soldiers", "army", "navy",
  "weapon", "weapons", "bomb", "bombs", "explosion", "blast", "blasts",
  "casualties", "killed", "wounded", "died",
  "conflict", "crisis", "tension", "tensions",
]);

// ── Entertainment / noise disqualifiers ─────────────────────────────────────
//
// If ANY of these appear in the article TITLE (lowercased), the article is
// almost certainly entertainment, satire, or promotional content.
// Exception: articles that also contain a HARD_CONFLICT_TITLE_SIGNAL pass.
const ENTERTAINMENT_TITLE_DISQUALIFIERS: string[] = [
  // Streaming platforms
  "netflix", "hbo max", "hbo original", "disney+", "amazon prime video",
  "apple tv+", "hulu", "paramount+", "peacock original",
  // Review / trailer / promo
  "movie review", "film review", "series review", "tv review",
  "movie trailer", "official trailer", "teaser trailer",
  "first look:", "exclusive clip",
  // Awards & ceremonies
  "oscar nominations", "oscar winner", "academy award",
  "emmy nominations", "emmy winner",
  "bafta winner", "golden globe winner", "golden globe nominations",
  "sag award", "critics choice award",
  // Release/premiere  
  "box office", "hits theaters", "in theaters",
  "streaming now", "now streaming", "available on",
  "season finale", "series finale",
  "season premiere", "series premiere",
  "release date announced",
  // Entertainment formats
  "movie", "film festival", "short film",
  "war film", "war movie", "battle scene", "combat scene",
  "action movie", "action film", "thriller film",
  "biopic", "docudrama", "mockumentary",
  "romantic comedy", "romcom",
  "sequel announced", "prequel announced", "reboot announced",
  "spin-off announced",
  // Music
  "new album", "album review", "debut album",
  "new single", "music video",
  "grammy award", "grammy nomination",
  "chart-topping", "number one single",
  // Sports (specific high-signal terms)
  "super bowl", "world cup final", "world cup winner",
  "fifa world cup", "icc world cup",
  "premier league title", "la liga title",
  "nba finals", "nfl draft", "nfl game",
  "cricket world cup",
  "tennis grand slam", "wimbledon",
  "boxing match", "mma fight", "ufc",
  // Celebrity
  "red carpet", "fashion week", "met gala",
  "celebrity", "pop star", "celebrity couple",
  // Promo / spam
  "sponsored content", "advertisement", "advertorial",
  "buy now", "limited offer",
  // Gaming / fiction
  "video game trailer", "video game review", "game review",
  "esports tournament",
  "sci-fi novel", "fantasy novel",
  "fictional account",
  // Opinion / analysis (not real events)
  "opinion:", "op-ed:", "analysis:", "editorial:",
  "book review:", "podcast review", "satire",
  // Human-interest / feel-good / lifestyle (not conflict)
  "heartwarming", "heart-warming",
  "feel-good", "feelgood",
  "wedding", "bride", "groom", "marriage ceremony",
  "love story", "romantic",
  "recipe", "cooking", "chef",
  "travel guide", "vacation", "holiday destination",
  "cute video", "adorable", "goes viral",
  "inspiring story", "uplifting",
  "baby born", "newborn",
  "reunion", "reunited",
  "fashion", "beauty tips", "skincare",
  "bollywood", "hollywood", "tollywood", "nollywood",
  "tv show", "reality show", "talent show",
  "band wowing", "wowing",
];

// ── Hard conflict title signals ──────────────────────────────────────────────
//
// If a title contains ANY of these, it is a real conflict event regardless
// of any entertainment signals that might also be present.
const HARD_CONFLICT_TITLE_SIGNALS: string[] = [
  "airstrike", "airstrikes", "air strike", "air raid",
  "missile strike", "missile attack", "missile barrage",
  "rocket strike", "rocket attack",
  "drone strike", "drone attack",
  "ballistic missile", "cruise missile",
  "artillery barrage", "heavy shelling", "mortar attack",
  "ceasefire", "cease-fire",
  "military offensive", "ground offensive", "counter-offensive",
  "war crimes", "genocide", "ethnic cleansing",
  "military coup", "coup attempt",
  "invasion of", "invaded", "annexation",
  "nuclear strike", "nuclear attack",
  "civilians killed", "civilians dead", "civilian casualties",
  "soldiers killed", "troops killed", "killed in strike",
  "idf strikes", "idf bombs", "idf raids",
  "rebel advance", "rebel offensive",
  "siege of", "under siege", "humanitarian corridor",
  "terrorist attack in", "bomb attack in",
  "sanctions imposed on", "new sanctions against",
  "arms embargo",
  // Maritime hard signals
  "vessel attacked", "ship attacked", "tanker attacked",
  "vessel seized", "ship seized", "tanker seized",
  "cargo ship attacked", "cargo vessel attacked",
  "drone struck vessel", "missile struck vessel",
  "houthi attack on ship", "attack in strait of hormuz",
  "attack in red sea", "attack in gulf of aden",
];

// ── Active conflict countries / geopolitical flashpoints ────────────────────
//
// Extended list covering all currently active or recently active theatres.
const CONFLICT_REGIONS = new Set([
  // Active hot wars
  "ukraine", "russia",
  "israel", "palestine", "gaza", "west bank",
  "syria",
  "yemen",
  "sudan", "south sudan",
  "myanmar", "burma",
  "ethiopia", "tigray", "amhara",
  "somalia",
  "mali",
  "burkina faso",
  "niger",
  "chad",
  "cameroon",
  "nigeria",
  "democratic republic of congo", "drc", "congo",
  "central african republic",
  "mozambique",
  "libya",
  "afghanistan",
  "iraq",
  "pakistan",
  "kashmir",
  "haiti",
  // Geopolitical flashpoints / escalation risk
  "iran",
  "taiwan", "south china sea",
  "north korea",
  "lebanon",
  "hezbollah",
  "hamas",
  "azerbaijan", "armenia", "nagorno-karabakh",
  "kosovo", "serbia", "balkans",
  "venezuela",
  "colombia",
  "mexico",
  "philippines",
  "mozambique",
  "zimbabwe",
  "eritrea",
  "angola",
  "senegal",
  "guinea",
  "bangladesh",
  "sri lanka",
  "myanmar junta",
]);

// ── Geopolitical / real-event anchor terms ───────────────────────────────────
//
// Real conflict news usually contains at least one of these anchors.
// We use this to distinguish reports of events from retrospectives, analyses,
// or fictional/metaphorical uses of war language.
const GEOPOLITICAL_ANCHORS: string[] = [
  // Government / military actors
  "ministry of defence", "ministry of defense",
  "pentagon", "kremlin", "white house", "nato",
  "united nations", "un security council", "icc",
  "idf", "army", "air force", "navy", "armed forces",
  "rebel group", "militia", "paramilitary",
  "government forces", "opposition forces",
  // Humanitarian terms (appear in real coverage)
  "refugees", "displaced", "evacuated", "humanitarian",
  "aid workers", "casualty", "casualties", "fatalities",
  "wounded", "injured", "survivors",
  // Geopolitical terms
  "sovereignty", "territorial", "occupation",
  "annexation", "sanctions", "embargo",
  "diplomacy", "de-escalation",
  "peacekeeping", "peacekeeper",
];

/**
 * Process a news article through the NLP pipeline to extract structured
 * conflict event data.
 *
 * Returns null if:
 *  - Article is entertainment, sports, satire, or promotional content
 *  - Too few specific conflict keywords (likely noise / weak metaphor match)
 *  - No identifiable geographic location for geocoding
 *  - Based purely on opinion/analysis, not a reportable event
 */
export function extractConflictEvent(
  title: string,
  content: string,
  sourceName: string
): ExtractedEvent | null {
  const titleLower = title.toLowerCase();
  const combinedText = `${title}. ${content}`.toLowerCase();

  // ── Gate 1: Entertainment / noise blocker ──────────────────────────────
  // Reject articles whose titles clearly signal entertainment, sports, reviews,
  // trailers, or promotional content. Hard conflict signals override this gate.
  const hasHardConflict = HARD_CONFLICT_TITLE_SIGNALS.some((s) =>
    titleLower.includes(s)
  );

  if (!hasHardConflict) {
    const entertainmentMatch = ENTERTAINMENT_TITLE_DISQUALIFIERS.find((s) =>
      titleLower.includes(s)
    );
    if (entertainmentMatch) {
      console.debug(
        `[NLP] Rejected (entertainment noise "${entertainmentMatch}"): ${title}`
      );
      return null;
    }
  }

  // ── Gate 2: Specific war-keyword count threshold ───────────────────────
  // Must have ≥2 specific keyword matches in the combined text, OR
  // ≥1 specific keyword match directly in the title.
  // "Specific" means: from ALL_WAR_KEYWORDS (not weak standalone words alone).
  const specificMatches = ALL_WAR_KEYWORDS.filter((kw) =>
    combinedText.includes(kw)
  );
  const politicalEconomicMatches = POLITICAL_ECONOMIC_KEYWORDS.filter((kw) =>
    combinedText.includes(kw)
  );
  const titleSpecificMatches = ALL_WAR_KEYWORDS.filter((kw) =>
    titleLower.includes(kw)
  );
  const titlePolicyMatches = POLITICAL_ECONOMIC_KEYWORDS.filter((kw) =>
    titleLower.includes(kw)
  );

  const hasEnoughKeywords =
    specificMatches.length >= 2 ||
    titleSpecificMatches.length >= 1 ||
    politicalEconomicMatches.length >= 1 ||
    titlePolicyMatches.length >= 1;

  if (!hasEnoughKeywords) {
    // Last chance: allow weak conflict wording only when geopolitical context is strong.
    // Use word-boundary matching for weak words to prevent substring matches
    // like "heartwarming" → "war" or "otherapist" → "the rapist".
    const hasWeakWord = [...WEAK_STANDALONE_WORDS].some((w) =>
      wordMatch(combinedText, w)
    );
    const hasAnchor = GEOPOLITICAL_ANCHORS.some((a) =>
      combinedText.includes(a)
    );
    const hasConflictRegionContext = [...CONFLICT_REGIONS].some((r) =>
      combinedText.includes(r)
    );

    if (!(hasWeakWord && (hasAnchor || hasConflictRegionContext || hasHardConflict))) {
      console.debug(
        `[NLP] Rejected (insufficient keywords war=${specificMatches.length}, geoEco=${politicalEconomicMatches.length}): ${title}`
      );
      return null;
    }
  }

  // ── Gate 3: Geopolitical relevance ────────────────────────────────────
  // Must reference a known conflict region OR have a geopolitical anchor
  // to avoid false positives from fictional/metaphorical usage.
  const hasConflictRegion = [...CONFLICT_REGIONS].some((r) =>
    combinedText.includes(r)
  );
  const hasGeoAnchor = GEOPOLITICAL_ANCHORS.some((a) =>
    combinedText.includes(a)
  );

  if (!hasConflictRegion && !hasGeoAnchor && !hasHardConflict) {
    console.debug(
      `[NLP] Rejected (no geopolitical anchor): ${title}`
    );
    return null;
  }

  // ── Classify event type ────────────────────────────────────────────────
  const eventType = classifyEventType(combinedText);

  // ── Extract locations using compromise NLP ─────────────────────────────
  const doc = nlp(`${title}. ${content}`);
  const places = doc.places().out("array") as string[];
  const organizations = doc.organizations().out("array") as string[];
  const topics = doc.topics().out("array") as string[];

  const allLocations = [...new Set([...places, ...topics])].filter(
    (loc) => loc.length > 2 && !isOrganization(loc, organizations)
  );

  // ── Detect country ─────────────────────────────────────────────────────
  const country = detectCountry(combinedText, allLocations);
  if (!country) {
    console.debug(`[NLP] Rejected (no country detected): ${title}`);
    return null;
  }

  // ── Build description ──────────────────────────────────────────────────
  const description =
    content.length > 500 ? content.slice(0, 500) + "..." : content;

  const allMatchedKeywords = [
    ...specificMatches,
    ...[...WEAK_STANDALONE_WORDS].filter((w) => wordMatch(combinedText, w)),
  ];

  // ── Extract impacts ────────────────────────────────────────────────────
  const impacts = extractImpacts(combinedText);
  const leaderName = extractLeaderName(title, content);
  const policyAction = extractPolicyAction(combinedText);
  const eventCategory = classifyEventCategory(eventType, politicalEconomicMatches.length);
  const affectedCommodities = inferCommodities(combinedText);

  return {
    title,
    description,
    eventType,
    eventCategory,
    locations: allLocations.slice(0, 5),
    country,
    isConflictRelated: true,
    keywords: [...new Set([...allMatchedKeywords, ...politicalEconomicMatches])],
    leaderName,
    policyAction,
    affectedCommodities,
    impacts,
  };
}

// ── Impact extraction ────────────────────────────────────────────────────

const IMPACT_PATTERNS: {
  type: ImpactType;
  patterns: string[];
  defaultSeverity: ImpactSeverity;
}[] = [
  {
    type: "civilian_casualties",
    patterns: [
      "civilian casualties", "civilians killed", "civilians dead",
      "civilian deaths", "women and children killed", "civilian toll",
      "noncombatant deaths", "civilian fatalities", "people killed",
      "residents killed", "inhabitants killed", "deaths reported",
      "killed in the attack", "killed in strike", "killed in bombing",
    ],
    defaultSeverity: "high",
  },
  {
    type: "military_casualties",
    patterns: [
      "soldiers killed", "troops killed", "military casualties",
      "combatants killed", "fighters killed", "personnel killed",
      "officers killed", "servicemen killed", "military deaths",
      "soldiers dead", "troops dead",
    ],
    defaultSeverity: "high",
  },
  {
    type: "infrastructure_damage",
    patterns: [
      "infrastructure damage", "infrastructure destroyed",
      "infrastructure attacked", "critical infrastructure",
      "energy infrastructure", "railway bombed", "railway attacked",
      "port attacked", "port damaged", "road destroyed",
    ],
    defaultSeverity: "high",
  },
  {
    type: "power_plant_damage",
    patterns: [
      "power plant", "power station", "power grid",
      "electricity cut", "power outage", "blackout",
      "energy facility", "substation attacked", "transformer destroyed",
    ],
    defaultSeverity: "critical",
  },
  {
    type: "airport_damage",
    patterns: [
      "airport attacked", "airport bombed", "airport damaged",
      "airfield struck", "runway destroyed", "air base hit",
      "airbase attacked",
    ],
    defaultSeverity: "critical",
  },
  {
    type: "oil_refinery_damage",
    patterns: [
      "refinery attacked", "refinery fire", "refinery exploded",
      "refinery damaged", "oil depot", "fuel depot",
      "oil facility", "petroleum facility", "oil storage",
      "oil terminal", "fuel storage",
    ],
    defaultSeverity: "critical",
  },
  {
    type: "residential_destruction",
    patterns: [
      "residential buildings destroyed", "residential buildings damaged",
      "homes destroyed", "houses destroyed", "apartments destroyed",
      "residential area", "residential district", "neighborhood bombed",
      "housing damaged", "buildings collapsed", "apartment block",
      "residential block",
    ],
    defaultSeverity: "high",
  },
  {
    type: "refugee_displacement",
    patterns: [
      "refugees", "displaced", "displacement", "evacuated",
      "evacuation", "fled their homes", "forced to flee",
      "internally displaced", "refugee crisis", "refugee camp",
      "mass exodus", "humanitarian corridor", "fled the country",
    ],
    defaultSeverity: "high",
  },
  {
    type: "government_building_damage",
    patterns: [
      "government building", "parliament attacked", "ministry building",
      "presidential palace", "city hall attacked", "municipal building",
      "administrative building",
    ],
    defaultSeverity: "high",
  },
  {
    type: "bridge_destroyed",
    patterns: [
      "bridge destroyed", "bridge bombed", "bridge collapsed",
      "bridge damaged", "bridge attacked",
    ],
    defaultSeverity: "high",
  },
  {
    type: "communication_disruption",
    patterns: [
      "communication disrupted", "internet outage", "phone lines cut",
      "communication blackout", "telecom tower", "cell tower destroyed",
      "internet cut", "communications down",
    ],
    defaultSeverity: "medium",
  },
  {
    type: "water_supply_damage",
    patterns: [
      "water supply", "water treatment", "water infrastructure",
      "water system", "dam attacked", "dam bombed", "dam damaged",
      "reservoir attacked", "water shortage",
    ],
    defaultSeverity: "critical",
  },
  {
    type: "hospital_damage",
    patterns: [
      "hospital attacked", "hospital bombed", "hospital damaged",
      "hospital destroyed", "medical facility", "clinic attacked",
      "health facility", "medical center",
    ],
    defaultSeverity: "critical",
  },
  {
    type: "school_damage",
    patterns: [
      "school attacked", "school bombed", "school destroyed",
      "school damaged", "university attacked", "university bombed",
      "educational facility",
    ],
    defaultSeverity: "high",
  },
  {
    type: "transportation_disruption",
    patterns: [
      "transportation disrupted", "rail service", "train service",
      "highway blocked", "road blocked", "supply routes cut",
      "logistics disrupted", "supply chain disrupted",
    ],
    defaultSeverity: "medium",
  },
];

// Regex to extract casualty numbers from text
const CASUALTY_NUMBER_RE =
  /(\d{1,6})\s+(?:people |civilians |soldiers |troops |persons |fighters |combatants )?(?:killed|dead|died|casualties|fatalities|wounded|injured)/i;

function extractImpacts(text: string): ExtractedImpact[] {
  const found: ExtractedImpact[] = [];
  const seen = new Set<ImpactType>();

  for (const { type, patterns, defaultSeverity } of IMPACT_PATTERNS) {
    for (const p of patterns) {
      if (text.includes(p) && !seen.has(type)) {
        seen.add(type);

        // Try to extract a number of casualties for casualty types
        let description = p;
        let severity = defaultSeverity;

        if (
          type === "civilian_casualties" ||
          type === "military_casualties"
        ) {
          const numMatch = CASUALTY_NUMBER_RE.exec(text);
          if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            description = `${num} ${type === "civilian_casualties" ? "civilian" : "military"} casualties reported`;
            if (num >= 100) severity = "critical";
            else if (num >= 10) severity = "high";
            else severity = "medium";
          }
        }

        found.push({ impactType: type, description, severity });
        break; // One match per impact type is enough
      }
    }
  }

  return found;
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

function classifyEventCategory(
  eventType: EventType,
  politicalEconomicMatchCount: number
): "military" | "political" | "economic" | "policy" {
  if (eventType === "infrastructure_attack" || eventType === "airstrike" || eventType === "missile_strike") {
    return "military";
  }
  if (politicalEconomicMatchCount === 0) return "military";

  if (politicalEconomicMatchCount > 0) return "economic";
  return "political";
}

function extractLeaderName(title: string, content: string): string | null {
  const text = `${title}. ${content}`;
  const patterns = [
    /(?:president|prime minister|pm|chancellor|minister|energy minister|foreign minister)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}),\s*(?:president|prime minister|pm|minister|chancellor)/,
  ];

  for (const re of patterns) {
    const m = re.exec(text);
    if (m?.[1]) return m[1].trim();
  }

  const lowered = text.toLowerCase();
  const hasCue = LEADER_CUES.some((cue) => lowered.includes(cue));
  return hasCue ? "Unknown Leader" : null;
}

function extractPolicyAction(text: string): string | null {
  if (text.includes("production cut") || text.includes("output cut")) {
    return "Production cut announced";
  }
  if (text.includes("sanctions") || text.includes("embargo")) {
    return "Sanctions action";
  }
  if (text.includes("export ban") || text.includes("trade restrictions") || text.includes("tariffs")) {
    return "Trade restriction announced";
  }
  if (text.includes("energy law") || text.includes("mining regulation") || text.includes("decree")) {
    return "New policy or law introduced";
  }
  return null;
}

function inferCommodities(text: string): Array<"gold" | "silver" | "oil"> {
  const out = new Set<"gold" | "silver" | "oil">();
  if (text.includes("oil") || text.includes("refinery") || text.includes("pipeline") || text.includes("energy export")) {
    out.add("oil");
  }
  if (text.includes("gold") || text.includes("safe-haven") || text.includes("bullion")) {
    out.add("gold");
  }
  if (text.includes("silver") || text.includes("industrial metals") || text.includes("trade restrictions")) {
    out.add("silver");
  }
  return [...out];
}

function detectCountry(text: string, locations: string[]): string | null {
  // Check extracted locations against known conflict regions first
  for (const loc of locations) {
    const lower = loc.toLowerCase();
    for (const region of CONFLICT_REGIONS) {
      if (lower.includes(region) || region.includes(lower)) {
        return capitalizeFirst(region);
      }
    }
  }

  // Scan full text for conflict region mentions
  for (const region of CONFLICT_REGIONS) {
    if (text.includes(region)) {
      return capitalizeFirst(region);
    }
  }

  // Fall back to the first extracted location (will be geocoded)
  if (locations.length > 0) {
    return locations[0];
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
    "idf",
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
