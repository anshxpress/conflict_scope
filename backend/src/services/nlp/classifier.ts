export type GlobalCategory =
  | "War / Conflict"
  | "Government / Laws / Policies"
  | "Economy / Markets"
  | "Commodities"
  | "Technology"
  | "Health"
  | "Infrastructure"
  | "Trade"
  | "Environment"
  | "Energy";

const KEYWORDS: Record<GlobalCategory, string[]> = {
  "War / Conflict": [
    "airstrike", "airstrikes", "air strike", "missile strike", "rocket strike", "drone strike", "shelling", "bombing",
    "bomb blast", "ceasefire", "peace talks", "troops", "military operation", "invasion", "clash", "clashes",
    "combat", "armed forces", "war zone", "active combat", "casualty", "casualties", "frontline", "hostilities",
    "peacekeeping", "conflict", "militia", "insurgency", "rebels", "defense ministry", "nato", "pentagon",
    "war crimes", "sieges", "battle", "battles", "infantry", "tank", "tanks", "nuclear threat", "cease-fire",
  ],
  "Government / Laws / Policies": [
    "policy", "policies", "decree", "legislation", "election", "parliament", "senate", "congress", "supreme court",
    "regulation", "constitution", "governance", "democracy", "referendum", "bilateral relations", "summit",
    "geopolitical", "political", "leader", "prime minister", "president", "chancellor", "cabinet", "veto",
    "bill", "vetoed", "court ruling", "sanctions", "diplomacy", "diplomatic", "embassy", "treaty",
  ],
  "Economy / Markets": [
    "economy", "economic", "market", "markets", "gdp", "inflation", "recession", "interest rate", "interest rates",
    "central bank", "fiscal", "monetary", "bonds", "yield", "treasuries", "nasdaq", "dow jones", "sp 500",
    "stock market", "financial", "currency", "forex", "exchange rate", "investors", "growth rate", "assets",
    "banking sector", "debt", "deficit", "bankruptcy", "economic crisis",
  ],
  "Commodities": [
    "gold", "silver", "crude oil", "lithium", "cobalt", "nickel", "copper", "aluminum", "wheat", "corn", "soybean",
    "agricultural", "precious metals", "industrial metals", "commodities", "commodity", "grain deal", "fertilizer",
    "mining", "extraction", "rare earth", "bullion", "safe-haven", "platinum", "palladium", "steel",
  ],
  "Technology": [
    "silicon", "ai", "artificial intelligence", "chip", "semiconductor", "semiconductors", "cyberattack",
    "cybersecurity", "hacker", "hackers", "software", "supercomputer", "quantum computing", "5g", "telecom",
    "algorithms", "big tech", "tech giant", "hardware", "data center", "cloud computing", "machine learning",
    "cyber espionage", "microchip", "broadband",
  ],
  "Health": [
    "pandemic", "epidemic", "outbreak", "virus", "vaccine", "vaccines", "who", "fda", "medical", "clinical trial",
    "health care", "healthcare", "disease", "diseases", "pathogen", "infectious", "hospital", "hospitals",
    "pharmaceutical", "public health", "mental health", "quarantine", "biotech",
  ],
  "Infrastructure": [
    "airport", "airports", "seaport", "seaports", "railway", "railways", "highway", "highways", "bridge", "bridges",
    "power grid", "water supply", "reservoir", "dam", "dams", "telecom tower", "logistics", "shipping port",
    "harbor", "transportation network", "subway", "train line", "civil infrastructure", "utilities", "supply routes",
  ],
  "Trade": [
    "tariffs", "tariff", "trade agreement", "trade restrictions", "export ban", "import ban", "customs",
    "wto", "world trade organization", "trade war", "shipping lanes", "cargo ship", "cargo vessel", "supply chain",
    "bilateral trade", "free trade", "embargo", "exports", "imports", "trade deficit", "maritime trade",
  ],
  "Environment": [
    "climate change", "global warming", "emissions", "carbon tax", "deforestation", "biodiversity",
    "wildfire", "wildfires", "hurricane", "typhoon", "cyclone", "earthquake", "tsunami", "flood", "flooding",
    "drought", "pollution", "conservation", "renewable energy", "sustainability", "cop28", "natural disaster",
  ],
  "Energy": [
    "nuclear power", "nuclear reactor", "solar energy", "wind farm", "wind energy", "coal power", "natural gas",
    "lng", "liquefied natural gas", "pipeline", "pipelines", "oil refinery", "refineries", "opec", "oil barrel",
    "crude barrels", "electricity generation", "biofuel", "geothermal", "hydroelectric", "energy export",
    "power plant", "grid capacity",
  ],
};

/**
 * Classify a news article based on title, description, and content.
 * Applies a weighted scoring system to determine the most relevant of the 10 categories.
 */
export function classifyArticle(
  title: string,
  description: string,
  content: string
): GlobalCategory {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  const contentLower = content.toLowerCase();

  const scores: Record<GlobalCategory, number> = {
    "War / Conflict": 0,
    "Government / Laws / Policies": 0,
    "Economy / Markets": 0,
    "Commodities": 0,
    "Technology": 0,
    "Health": 0,
    "Infrastructure": 0,
    "Trade": 0,
    "Environment": 0,
    "Energy": 0,
  };

  for (const [category, keywords] of Object.entries(KEYWORDS) as [GlobalCategory, string[]][]) {
    for (const word of keywords) {
      // Word boundary regex for strict keyword matching
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedWord}\\b`, "gi");

      // Score title matches (weight: 3.0)
      const titleMatches = titleLower.match(regex);
      if (titleMatches) {
        scores[category] += titleMatches.length * 3.0;
      }

      // Score description matches (weight: 1.5)
      const descMatches = descLower.match(regex);
      if (descMatches) {
        scores[category] += descMatches.length * 1.5;
      }

      // Score content matches (weight: 1.0)
      const contentMatches = contentLower.match(regex);
      if (contentMatches) {
        scores[category] += contentMatches.length * 1.0;
      }
    }
  }

  // Find the category with the highest score
  let bestCategory: GlobalCategory = "Government / Laws / Policies"; // Default fallback
  let maxScore = 0;

  for (const [category, score] of Object.entries(scores) as [GlobalCategory, number][]) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  // Secondary context adjustment: if article mentions "war" or "conflict" keywords but scored slightly lower than generic policies
  if (maxScore === 0) {
    if (titleLower.includes("war") || titleLower.includes("military") || titleLower.includes("clash")) {
      return "War / Conflict";
    }
  }

  return bestCategory;
}
