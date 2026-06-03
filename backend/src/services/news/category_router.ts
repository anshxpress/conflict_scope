export interface CategoryRoute {
  category: string;
  sources: string[];
  queries: string[];
  weight: number;      // Importance boosting weight
  priority: number;    // Tiered urgency: 3 (Critical), 2 (Important), 1 (Standard)
}

export const CATEGORY_ROUTES: Record<string, CategoryRoute> = {
  Politics: {
    category: "Politics",
    sources: ["newsapi", "gnews", "rss"],
    queries: ["politics", "parliament", "minister", "government", "policy"],
    weight: 1.0,
    priority: 1,
  },
  Economy: {
    category: "Economy",
    sources: ["newsapi", "gnews", "newsdata", "rss"],
    queries: ["economy", "GDP", "inflation", "budget", "fiscal"],
    weight: 1.2,
    priority: 2,
  },
  Jobs: {
    category: "Jobs",
    sources: ["newsapi", "gnews", "newsdata", "rss"],
    queries: ["jobs", "recruitment", "employment", "hiring", "government jobs"],
    weight: 1.3,
    priority: 2,
  },
  Technology: {
    category: "Technology",
    sources: ["newsapi", "gnews", "newsdata"],
    queries: ["technology", "AI", "software", "cybersecurity", "chips"],
    weight: 1.0,
    priority: 1,
  },
  Health: {
    category: "Health",
    sources: ["newsapi", "gnews", "rss"],
    queries: ["hospital", "healthcare", "medicine", "insurance", "vaccination"],
    weight: 1.3,
    priority: 2,
  },
  Education: {
    category: "Education",
    sources: ["newsdata", "rss"],
    queries: ["education", "schools", "colleges", "universities", "NEET", "JEE", "scholarships", "UGC"],
    weight: 1.2,
    priority: 2,
  },
  Markets: {
    category: "Markets",
    sources: ["gnews", "newsdata", "rss"],
    queries: ["Sensex", "Nifty", "stock market", "commodity price", "gold rate"],
    weight: 1.1,
    priority: 2,
  },
  Transport: {
    category: "Transport",
    sources: ["newsapi", "newsdata", "rss"],
    queries: ["railway", "metro", "traffic", "airport", "bus", "road closure"],
    weight: 1.2,
    priority: 2,
  },
  Weather: {
    category: "Weather",
    sources: ["gnews", "rss"],
    queries: ["rain", "cyclone", "heatwave", "weather", "flood"],
    weight: 1.4,
    priority: 3,
  },
  Safety: {
    category: "Safety",
    sources: ["newsapi", "gnews", "rss"],
    queries: ["accident", "fire accident", "public safety", "blast", "disaster"],
    weight: 1.2,
    priority: 2,
  },
  Local: {
    category: "Local",
    sources: ["rss"],
    queries: ["municipal", "civic issues", "water supply", "garbage", "local residents"],
    weight: 1.5,
    priority: 3,
  },
  International: {
    category: "International",
    sources: ["gdelt", "newsapi", "gnews"],
    queries: ["world news", "foreign relations", "global conflict", "trade agreement"],
    weight: 1.0,
    priority: 1,
  },
  Government: {
    category: "Government",
    sources: ["rss"],
    queries: ["government scheme", "ministry announcement", "PIB", "policy launch"],
    weight: 1.4,
    priority: 2,
  },
  Tax: {
    category: "Tax",
    sources: ["newsapi", "newsdata", "rss"],
    queries: ["income tax", "GST rate", "TDS", "ITR filing", "tax slab"],
    weight: 1.4,
    priority: 3,
  },
  Fuel: {
    category: "Fuel",
    sources: ["newsdata", "gnews", "rss"],
    queries: ["petrol price", "diesel", "oil", "LPG", "fuel price", "subsidy"],
    weight: 1.5,
    priority: 3,
  },
  Banking: {
    category: "Banking",
    sources: ["newsapi", "newsdata", "rss"],
    queries: ["RBI", "banking", "loan", "EMI", "UPI", "payments"],
    weight: 1.4,
    priority: 2,
  },
  Housing: {
    category: "Housing",
    sources: ["newsapi", "newsdata", "rss"],
    queries: ["real estate", "property prices", "rent", "flat", "RERA"],
    weight: 1.2,
    priority: 2,
  },
  Utilities: {
    category: "Utilities",
    sources: ["newsdata", "rss"],
    queries: ["electricity", "water supply", "power outage", "gas", "internet outage"],
    weight: 1.3,
    priority: 2,
  },
  Infrastructure: {
    category: "Infrastructure",
    sources: ["newsapi", "newsdata", "rss"],
    queries: ["highway construction", "metro project", "airport development", "power plant"],
    weight: 1.3,
    priority: 2,
  },
};
