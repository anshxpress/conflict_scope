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
  const titleSpecificMatches = ALL_WAR_KEYWORDS.filter((kw) =>
    titleLower.includes(kw)
  );

  const hasEnoughKeywords =
    specificMatches.length >= 2 || titleSpecificMatches.length >= 1;

  if (!hasEnoughKeywords) {
    // Last chance: does the text have a weak word AND a geopolitical anchor?
    const hasWeakWord = [...WEAK_STANDALONE_WORDS].some((w) =>
      combinedText.includes(w)
    );
    const hasAnchor = GEOPOLITICAL_ANCHORS.some((a) =>
      combinedText.includes(a)
    );
    if (!(hasWeakWord && hasAnchor && specificMatches.length >= 1)) {
      console.debug(
        `[NLP] Rejected (insufficient keywords ${specificMatches.length}): ${title}`
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
    ...[...WEAK_STANDALONE_WORDS].filter((w) => combinedText.includes(w)),
  ];

  return {
    title,
    description,
    eventType,
    locations: allLocations.slice(0, 5),
    country,
    isConflictRelated: true,
    keywords: [...new Set(allMatchedKeywords)],
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
