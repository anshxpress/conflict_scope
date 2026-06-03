import { getEmbedding, cosineSimilarity } from "./embeddings";
import { CATEGORY_ROUTES } from "../news/category_router";

// ── Full India-impact category taxonomy ─────────────────────────────────────

export type ProjectCategory =
  | "Politics"
  | "Economy"
  | "Jobs"
  | "Technology"
  | "Health"
  | "Education"
  | "Markets"
  | "Transport"
  | "Weather"
  | "Safety"
  | "Local"
  | "International"
  // New India-specific categories
  | "Government"
  | "Tax"
  | "Fuel"
  | "Banking"
  | "Housing"
  | "Utilities"
  | "Infrastructure";

const CATEGORY_ANCHORS: Record<ProjectCategory, string> = {
  Politics:       "government policies, laws, elections, parliament, prime minister, cabinet, political leaders, democracy, constitution, voting",
  Economy:        "economy, GDP, inflation, fiscal deficit, taxation, central bank, monetary policy, trade agreements, growth rate, financial crisis",
  Jobs:           "employment, unemployment rates, layoffs, job hiring, wages, salary hikes, labor laws, work opportunities, recruitment",
  Technology:     "artificial intelligence, software development, semiconductors, microchips, cyberattacks, internet connectivity, big tech, cybersecurity, ISRO, 5G",
  Health:         "healthcare services, virus outbreaks, vaccines, public health, clinical trials, hospitals, medicine prices, pandemics, medical science, Ayushman",
  Education:      "school boards, college admissions, university education, student exams, syllabus curriculum, educational policy, NEET, JEE, CBSE, literacy",
  Markets:        "stock markets, commodity prices, trading, financial shares, gold rates, crude oil prices, sensex, nifty indices, mutual funds, crypto",
  Transport:      "railways, highways, public transport, air travel, flight delays, metro trains, road safety, shipping, logistics, toll, NHAI, IRCTC",
  Weather:        "monsoon rain, heatwaves, cyclones, storms, flood alerts, climate change, temperature forecasts, IMD, drought, cold wave",
  Safety:         "crime alerts, accidents, public safety, fire breakouts, security threats, civil conflict, explosions, disaster response, police investigations",
  Local:          "city updates, civic services, municipality works, water supply, power grid failures, street lighting, waste management, neighborhood issues",
  International:  "world news, foreign relations, bilateral summits, global conflicts, United Nations policies, trade blockades, overseas events",
  Government:     "government scheme, ministry announcement, PIB, central government, state government, policy decision, ordinance, notification, official release",
  Tax:            "income tax, GST, TDS, ITR filing, tax return, tax slab, tax exemption, tax deadline, direct tax, indirect tax, customs duty",
  Fuel:           "petrol price, diesel price, LPG cylinder, CNG price, fuel hike, fuel cut, pump price, oil price, fuel subsidy, auto fuel",
  Banking:        "RBI, bank rate, interest rate, EMI, home loan, personal loan, UPI, NEFT, RTGS, banking regulation, bank merger, SBI, HDFC, ICICI",
  Housing:        "real estate, property prices, rent, flat, apartment, RERA, housing scheme, affordable housing, home loan, property tax, construction",
  Utilities:      "electricity bill, water bill, gas connection, power tariff, electricity supply, DISCOM, municipal tax, utility charges, subsidy",
  Infrastructure: "road project, highway construction, power plant, dam, bridge, metro project, airport, port, NHAI, smart city, infrastructure spend",
};

// ── Category keywords (multi-label hybrid matching) ──────────────────────────

const KEYWORDS: Record<ProjectCategory, string[]> = {
  Politics:       ["politics", "government", "election", "policy", "pm", "modi", "cabinet", "parliament", "bill", "legislation", "supreme court", "assembly", "mla", "mp", "governance", "president", "chief minister"],
  Economy:        ["economy", "economic", "gdp", "inflation", "tax", "gst", "fiscal", "budget", "finance minister", "recession", "rbi", "central bank", "growth"],
  Jobs:           ["jobs", "job", "employment", "unemployment", "hiring", "layoffs", "wages", "salary", "workforce", "recruit", "recruitment", "labor", "vacancies", "fresher"],
  Technology:     ["technology", "ai", "artificial intelligence", "software", "semiconductor", "chip", "cybersecurity", "cyberattack", "internet", "5g", "digital", "isro", "startup", "app"],
  Health:         ["health", "medical", "hospital", "covid", "virus", "vaccine", "outbreak", "disease", "healthcare", "who", "doctor", "medicine", "ayushman", "aiims"],
  Education:      ["education", "school", "college", "university", "student", "exam", "cbse", "results", "syllabus", "board", "teacher", "neet", "jee", "admission"],
  Markets:        ["markets", "market", "stock", "shares", "trading", "nifty", "sensex", "gold", "silver", "crude", "oil price", "commodity", "investors", "mutual fund"],
  Transport:      ["transport", "railway", "train", "highway", "flight", "metro", "bus", "road", "aviation", "traffic", "irctc", "nhai", "toll", "auto"],
  Weather:        ["weather", "rain", "monsoon", "flood", "heatwave", "cyclone", "storm", "forecast", "temperature", "imd", "meteorological", "drought", "cold wave"],
  Safety:         ["safety", "security", "crime", "accident", "fire", "blast", "explosion", "arrest", "police", "threat", "disaster", "emergency", "rescue"],
  Local:          ["local", "city", "civic", "municipality", "corporation", "bmc", "ward", "residents", "water supply", "power cut", "garbage", "civic body"],
  International:  ["international", "global", "world", "foreign", "un", "united nations", "bilateral", "ukraine", "russia", "china", "us", "diplomatic", "nato", "pakistan"],
  Government:     ["government scheme", "pib", "ministry", "minister", "policy launch", "scheme launch", "central government", "state government", "ordinance", "notification", "press release"],
  Tax:            ["income tax", "gst", "tds", "itr", "tax return", "tax slab", "tax exemption", "tax deadline", "direct tax", "customs duty", "tax filing", "refund"],
  Fuel:           ["petrol", "diesel", "lpg", "cng", "fuel price", "fuel hike", "pump price", "oil price", "fuel subsidy", "cylinder price", "auto fuel", "petroleum"],
  Banking:        ["rbi", "bank rate", "interest rate", "emi", "home loan", "personal loan", "upi", "neft", "rtgs", "bank merger", "sbi", "hdfc", "icici", "repo rate"],
  Housing:        ["real estate", "property", "rent", "flat", "apartment", "rera", "housing scheme", "affordable housing", "home loan", "property tax", "construction"],
  Utilities:      ["electricity bill", "water bill", "gas connection", "power tariff", "electricity supply", "discom", "municipal tax", "utility", "subsidy"],
  Infrastructure: ["road project", "highway construction", "power plant", "dam", "bridge", "metro project", "airport", "port", "nhai", "smart city", "infrastructure"],
};

// ── Hard-exclude noise keywords ───────────────────────────────────────────────

const IGNORE_KEYWORDS = [
  "bollywood", "hollywood", "celebrity", "actor", "actress", "wedding", "dating",
  "divorce", "box office", "fashion show", "instagram", "tiktok", "viral video",
  "viral photo", "cricket gossip", "sports gossip", "petty theft", "minor scuffle",
  "horoscope", "zodiac", "rumors", "romance", "starring", "red carpet", "premiere",
  "celeb", "fan following", "item song", "ott release", "netflix show", "web series gossip",
  "ipl auction", "ipl team", "sports bet", "match prediction",
];

// ── High-importance signals in title/description ─────────────────────────────

const HIGH_IMPACT_SIGNALS = [
  // Fuel & cost of living
  "petrol price", "diesel price", "lpg price", "lpg cylinder", "fuel hike", "fuel cut",
  // Tax & finance
  "income tax", "gst rate", "tax deadline", "itr filing", "emi", "interest rate", "repo rate",
  // Government actions
  "new policy", "new scheme", "government announces", "pib", "ordinance passed",
  "budget allocation", "cabinet approves", "scheme launched",
  // Health emergencies
  "health alert", "disease outbreak", "epidemic", "hospital shortage", "medicine price",
  // Jobs & economy
  "job loss", "mass layoff", "unemployment", "salary cut", "wage hike",
  "company shuts", "factory closed", "strike", "bandh",
  // Weather extremes  
  "flood warning", "cyclone alert", "heatwave warning", "cold wave", "imd alert", "drought declared",
  // Infrastructure
  "power cut", "water shortage", "road closed", "metro delay", "train cancelled",
  // Safety
  "explosion", "major accident", "building collapse", "fire breaks out", "death toll",
  // Markets
  "sensex crash", "rupee falls", "gold price", "inflation rises",
  // Ordinary life impact
  "price rise", "price hike", "shortage", "deadline", "affects crore",
];

// ── Source trust scores (0–20) ────────────────────────────────────────────────

const SOURCE_TRUST: Record<string, number> = {
  // Government / PIB (highest trust)
  "PIB India": 20, "PIB Economy": 20,
  "India Meteorological Dept": 18,
  // Tier-1 India news
  "The Hindu National": 16, "The Hindu International": 15,
  "NDTV India": 15, "NDTV Business": 15, "NDTV Health": 14,
  "Indian Express": 14,
  "Economic Times India": 15, "ET Markets": 14,
  "Livemint Markets": 14, "Livemint Economy": 14,
  "Business Standard India": 14,
  "Times of India": 13,
  "Moneycontrol Personal Finance": 14,
  // International quality
  "Reuters": 13, "Associated Press": 13,
  "BBC World": 12, "The Guardian": 12,
  "Al Jazeera": 12, "DW World": 11, "NPR World": 11,
  "Sky News World": 10,
  // GDELT-sourced (domain-flagged)
  "GDELT:reuters.com": 13, "GDELT:apnews.com": 13, "GDELT:bbc.com": 12,
};

function getSourceTrust(source: string): number {
  // Exact match
  if (SOURCE_TRUST[source] !== undefined) return SOURCE_TRUST[source];
  // Prefix match (for GNews:X / NewsAPI:X / NewsData:X)
  const lower = source.toLowerCase();
  if (lower.startsWith("pib")) return 20;
  if (lower.startsWith("gnews:")) return 10;
  if (lower.startsWith("newsapi:")) return 10;
  if (lower.startsWith("newsdata:")) return 10;
  if (lower.startsWith("youtube:")) return 8;
  if (lower.startsWith("gdelt:")) return 9;
  return 7; // Unknown source
}

// ── High-impact category set ──────────────────────────────────────────────────

const HIGH_IMPACT_CATS = new Set(["Fuel", "Tax", "Banking", "Government", "Health", "Jobs", "Weather", "Infrastructure"]);
const MEDIUM_IMPACT_CATS = new Set(["Economy", "Education", "Markets", "Transport", "Housing", "Utilities", "Safety"]);
const LOW_IMPACT_CATS = new Set(["Politics", "Technology", "Local", "International"]);

// ── Embedding cache ───────────────────────────────────────────────────────────

let cachedCategoryEmbeddings: Record<ProjectCategory, number[]> | null = null;

async function getCategoryEmbeddings(): Promise<Record<ProjectCategory, number[]>> {
  if (cachedCategoryEmbeddings) return cachedCategoryEmbeddings;

  const result = {} as Record<ProjectCategory, number[]>;
  for (const [category, text] of Object.entries(CATEGORY_ANCHORS) as [ProjectCategory, string][]) {
    try {
      result[category] = await getEmbedding(text);
    } catch {
      result[category] = new Array(384).fill(0);
    }
  }
  cachedCategoryEmbeddings = result;
  return cachedCategoryEmbeddings;
}

// ── Multi-label classifier ────────────────────────────────────────────────────

/**
 * Classify a news article using multi-label classification.
 */
export async function classifyArticleMultiLabel(
  title: string,
  description: string,
  content: string,
  articleEmbedding?: number[]
): Promise<string[]> {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  const contentLower = content.toLowerCase();
  const combinedLower = `${titleLower} ${descLower} ${contentLower}`;

  const matched = new Set<string>();

  // 1. Semantic Embedding Matching
  if (articleEmbedding && articleEmbedding.length === 384) {
    const categoryVectors = await getCategoryEmbeddings();
    for (const [category, vector] of Object.entries(categoryVectors) as [ProjectCategory, number[]][]) {
      const sim = cosineSimilarity(articleEmbedding, vector);
      if (sim >= 0.38) matched.add(category);
    }
  }

  // 2. Keyword Frequency Matching (Hybrid corroborator)
  for (const [category, words] of Object.entries(KEYWORDS) as [ProjectCategory, string[]][]) {
    let score = 0;
    for (const word of words) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedWord}\\b`, "gi");
      const titleMatches = titleLower.match(regex);
      if (titleMatches) score += titleMatches.length * 3.0;
      const descMatches = descLower.match(regex);
      if (descMatches) score += descMatches.length * 1.5;
      const contentMatches = contentLower.match(regex);
      if (contentMatches) score += contentMatches.length * 1.0;
    }
    if (score >= 4.5) matched.add(category);
  }

  // Fallback
  if (matched.size === 0) {
    if (combinedLower.includes("global") || combinedLower.includes("world") || combinedLower.includes("international")) {
      matched.add("International");
    } else {
      matched.add("Politics");
    }
  }

  return Array.from(matched);
}

// ── Importance Scoring Engine (0–100) ────────────────────────────────────────

export interface ImportanceScoreResult {
  score: number;
  showInFeed: boolean;  // score >= 60
  reasons: string[];    // debug breakdown
}

/**
 * Score an article's importance to ordinary people on a 0–100 scale.
 *
 * Breakdown:
 *   Category relevance   30 pts
 *   Keyword signals      25 pts
 *   Source trust         20 pts
 *   Geographic proximity 15 pts
 *   Recency              10 pts
 *
 * Hard rules:
 *   - Noise keywords in title → score = 0
 *   - score < 30 → do not store
 *   - 30-59 → store but showInFeed = false
 *   - 60-100 → show in feed
 */
export function scoreArticleImportance(
  title: string,
  description: string,
  body: string,
  categories: string[],
  source: string,
  publishedAt: Date,
  location: { city?: string; state?: string; country?: string } | null,
  userCity?: string,
  userState?: string,
): ImportanceScoreResult {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  const combined = `${titleLower} ${descLower} ${body.toLowerCase()}`;
  const reasons: string[] = [];
  let score = 0;

  // ── HARD EXCLUSION ──
  for (const noise of IGNORE_KEYWORDS) {
    const regex = new RegExp(`\\b${noise}\\b`, "i");
    if (regex.test(titleLower) || regex.test(descLower)) {
      return { score: 0, showInFeed: false, reasons: [`Hard exclude: noise keyword "${noise}"`] };
    }
  }

  // ── 1. POPULATION AFFECTED (up to 20 pts) ──
  let popScore = 0;
  const popHigh = ["crore", "crores", "million", "millions", "lakh", "lakhs", "all citizens", "statewide", "nationwide", "everyone", "populace"];
  const popMed = ["citizens", "residents", "people", "public", "consumers"];
  if (popHigh.some(kw => combined.includes(kw))) {
    popScore = 20;
  } else if (popMed.some(kw => combined.includes(kw))) {
    popScore = 10;
  }
  score += popScore;
  reasons.push(`population=${popScore}`);

  // ── 2. ECONOMIC IMPACT (up to 25 pts) ──
  let econScore = 0;
  const econHigh = ["gst", "tds", "tax", "inflation", "interest rate", "repo rate", "emi", "itr filing", "tax slab", "subsidy", "subsidies"];
  const econMed = ["price", "cost", "loan", "hike", "cut", "rupee", "rs.", "rs ", "inr", "banking", "finance", "spend", "tariff"];
  if (econHigh.some(kw => combined.includes(kw))) {
    econScore = 25;
  } else if (econMed.some(kw => combined.includes(kw))) {
    econScore = 15;
  }
  score += econScore;
  reasons.push(`economic=${econScore}`);

  // ── 3. GEOGRAPHIC RELEVANCE (up to 20 pts) ──
  let geoScore = 5;
  const articleCity = (location?.city || "").toLowerCase();
  const articleState = (location?.state || "").toLowerCase();
  const articleCountry = (location?.country || "").toLowerCase();

  if (articleCity) {
    if (userCity && articleCity.includes(userCity.toLowerCase())) {
      geoScore = 20;
    } else {
      geoScore = 20; // City matching
    }
  } else if (articleState) {
    if (userState && articleState.includes(userState.toLowerCase().slice(0, 5))) {
      geoScore = 15;
    } else {
      geoScore = 15; // State matching
    }
  } else if (articleCountry === "india" || articleCountry.includes("india") || combined.includes("india")) {
    geoScore = 10; // National relevance
  }
  score += geoScore;
  reasons.push(`geo=${geoScore}`);

  // ── 4. RECENCY (up to 15 pts) ──
  const ageMs = Date.now() - publishedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  let recencyScore = 2;

  if (ageHours < 2) recencyScore = 15;
  else if (ageHours < 6) recencyScore = 10;
  else if (ageHours < 24) recencyScore = 5;
  
  score += recencyScore;
  reasons.push(`recency=${recencyScore} (${ageHours.toFixed(1)}h old)`);

  // ── 5. CATEGORY CONFIDENCE (up to 20 pts) ──
  let maxConfidenceScore = 0;
  for (const cat of categories) {
    const words = KEYWORDS[cat as ProjectCategory] || [];
    let matchCount = 0;
    for (const word of words) {
      if (combined.includes(word)) {
        matchCount++;
      }
    }
    const matchRatio = Math.min(1.0, matchCount / 2.0);
    const route = CATEGORY_ROUTES[cat];
    const priority = route ? route.priority : 1;
    const confidence = matchRatio * priority * 6.67;
    if (confidence > maxConfidenceScore) {
      maxConfidenceScore = confidence;
    }
  }
  const finalCatConfidence = Math.min(20, Math.max(0, maxConfidenceScore));
  score += finalCatConfidence;
  reasons.push(`cat_confidence=${finalCatConfidence.toFixed(1)}`);

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  return {
    score: finalScore,
    showInFeed: finalScore >= 60,
    reasons,
  };
}

/**
 * @deprecated Use scoreArticleImportance() instead.
 * Kept for backward compatibility during migration.
 */
export function isArticleImportant(
  title: string,
  description: string,
  content: string,
  categories: string[]
): boolean {
  const result = scoreArticleImportance(
    title, description, content, categories,
    "Unknown", new Date(), null
  );
  return result.score >= 30;
}

// ── Backwards compatibility wrapper ──────────────────────────────────────────

export function classifyArticle(title: string, _description: string, _content: string): string {
  const t = title.toLowerCase();
  if (t.includes("war") || t.includes("conflict") || t.includes("clash")) return "War / Conflict";
  return "Government / Laws / Policies";
}
