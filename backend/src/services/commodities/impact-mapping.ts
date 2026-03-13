import type {
  CommodityName,
  ConfidenceLevel,
  GeoEventCategory,
  ImpactSeverity,
} from "../../../db/schema";

export interface PoliticalSignal {
  leaderName: string | null;
  policyAction: string | null;
  category: GeoEventCategory;
  triggerType: string;
}

export interface CommodityImpactMatch {
  commodity: CommodityName;
  category: GeoEventCategory;
  triggerType: string;
  confidenceScore: ConfidenceLevel;
  leaderName: string | null;
  policyAction: string | null;
  rationale: string;
}

interface MappingRule {
  triggerType: string;
  category: GeoEventCategory;
  keywords: string[];
  commodities: CommodityName[];
  confidence: ConfidenceLevel;
}

const LEADER_REGEX = [
  /(?:president|prime minister|pm|chancellor|minister|energy minister|foreign minister)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}),\s*(?:president|prime minister|pm|minister|chancellor)/,
];

const POLICY_ACTION_PATTERNS: Array<{ action: string; terms: string[]; category: GeoEventCategory }> = [
  {
    action: "production cut announced",
    terms: ["production cut", "output cut", "supply cut", "reduce production"],
    category: "policy",
  },
  {
    action: "energy export restrictions",
    terms: ["export ban", "export restriction", "energy export", "shipment halted"],
    category: "policy",
  },
  {
    action: "sanctions threatened",
    terms: ["threatened sanctions", "new sanctions", "sanctions package", "embargo"],
    category: "economic",
  },
  {
    action: "trade restrictions announced",
    terms: ["trade restrictions", "tariffs", "import duties", "trade ban"],
    category: "economic",
  },
  {
    action: "military escalation declared",
    terms: ["military escalation", "state of war", "escalation", "retaliation"],
    category: "political",
  },
  {
    action: "new law or regulation introduced",
    terms: ["new law", "regulation", "bill passed", "executive order", "decree"],
    category: "policy",
  },
];

const MAPPING_RULES: MappingRule[] = [
  {
    triggerType: "refinery_attack",
    category: "military",
    keywords: ["refinery attack", "refinery struck", "refinery bombed", "oil facility attacked"],
    commodities: ["oil"],
    confidence: "high",
  },
  {
    triggerType: "pipeline_explosion",
    category: "military",
    keywords: ["pipeline explosion", "pipeline attack", "pipeline damaged"],
    commodities: ["oil"],
    confidence: "high",
  },
  {
    triggerType: "production_cut",
    category: "policy",
    keywords: ["production cut", "output cut", "opec cut", "supply cut"],
    commodities: ["oil"],
    confidence: "high",
  },
  {
    triggerType: "energy_export_sanctions",
    category: "economic",
    keywords: ["sanctions on energy exports", "energy sanctions", "oil export sanctions"],
    commodities: ["oil", "gold"],
    confidence: "high",
  },
  {
    triggerType: "military_escalation",
    category: "political",
    keywords: ["military escalation", "retaliatory strike", "regional escalation", "war escalation"],
    commodities: ["gold"],
    confidence: "medium",
  },
  {
    triggerType: "political_instability",
    category: "political",
    keywords: ["political instability", "government crisis", "leadership crisis", "coup attempt"],
    commodities: ["gold", "silver"],
    confidence: "medium",
  },
  {
    triggerType: "trade_restrictions",
    category: "economic",
    keywords: ["trade restrictions", "tariffs", "import ban", "export ban"],
    commodities: ["silver", "oil"],
    confidence: "medium",
  },
  {
    triggerType: "mining_regulation",
    category: "policy",
    keywords: ["mining regulation", "mining law", "ore export ban", "royalty hike"],
    commodities: ["gold", "silver"],
    confidence: "medium",
  },
];

export function extractPoliticalSignal(title: string, description: string): PoliticalSignal {
  const fullText = `${title}. ${description}`;
  const lower = fullText.toLowerCase();

  let leaderName: string | null = null;
  for (const re of LEADER_REGEX) {
    const m = re.exec(fullText);
    if (m?.[1]) {
      leaderName = m[1].trim();
      break;
    }
  }

  let policyAction: string | null = null;
  let category: GeoEventCategory = "military";
  for (const pattern of POLICY_ACTION_PATTERNS) {
    if (pattern.terms.some((term) => lower.includes(term))) {
      policyAction = pattern.action;
      category = pattern.category;
      break;
    }
  }

  const triggerType = policyAction
    ? policyAction.replace(/\s+/g, "_")
    : "general_geopolitical_event";

  return { leaderName, policyAction, category, triggerType };
}

function severityBoost(impacts: Array<{ severity: ImpactSeverity }>): ConfidenceLevel {
  const hasCritical = impacts.some((i) => i.severity === "critical");
  const hasHigh = impacts.some((i) => i.severity === "high");
  if (hasCritical) return "high";
  if (hasHigh) return "medium";
  return "low";
}

export function mapEventToCommodities(input: {
  title: string;
  description: string;
  eventType: string;
  impacts: Array<{ severity: ImpactSeverity }>;
}): CommodityImpactMatch[] {
  const lower = `${input.title}. ${input.description}`.toLowerCase();
  const politicalSignal = extractPoliticalSignal(input.title, input.description);
  const matches: CommodityImpactMatch[] = [];

  for (const rule of MAPPING_RULES) {
    if (!rule.keywords.some((kw) => lower.includes(kw))) continue;

    for (const commodity of rule.commodities) {
      matches.push({
        commodity,
        category: rule.category,
        triggerType: rule.triggerType,
        confidenceScore:
          rule.confidence === "high"
            ? "high"
            : severityBoost(input.impacts) === "high"
              ? "high"
              : rule.confidence,
        leaderName: politicalSignal.leaderName,
        policyAction: politicalSignal.policyAction,
        rationale: `Mapped via ${rule.triggerType} rule from geopolitical signal`,
      });
    }
  }

  if (matches.length === 0) {
    // Fallback safe-haven mapping for military shocks.
    if (["airstrike", "missile_strike", "armed_conflict"].includes(input.eventType)) {
      matches.push({
        commodity: "gold",
        category: "military",
        triggerType: "safe_haven_flow",
        confidenceScore: severityBoost(input.impacts),
        leaderName: politicalSignal.leaderName,
        policyAction: politicalSignal.policyAction,
        rationale: "Military escalation fallback mapping to gold safe-haven demand",
      });
    }
  }

  const dedup = new Map<string, CommodityImpactMatch>();
  for (const m of matches) {
    dedup.set(`${m.commodity}:${m.triggerType}`, m);
  }
  return [...dedup.values()];
}
