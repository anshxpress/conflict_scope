import type { ConfidenceLevel } from "../../../db/schema";

const TRUSTED_SOURCES = new Set([
  "reuters",
  "reuters world",
  "bbc",
  "bbc world",
  "al jazeera",
  "associated press",
  "ap",
  "afp",
  // Current active feed sources
  "the guardian",
  "dw world",
  "sky news world",
  "npr world",
]);

export interface VerificationResult {
  confidence: ConfidenceLevel;
  sourceCount: number;
  hasTrustedSource: boolean;
}

/**
 * Calculate confidence score for an event based on corroborating sources.
 *
 * Logic:
 *   1 source → low
 *   2 sources → medium
 *   3+ sources → high
 *   Trusted source bonus: promotes low → medium
 */
export function calculateConfidence(
  sourceNames: string[]
): VerificationResult {
  const uniqueSources = new Set(
    sourceNames.map((s) => s.toLowerCase().trim())
  );
  const sourceCount = uniqueSources.size;
  const hasTrustedSource = [...uniqueSources].some((s) =>
    TRUSTED_SOURCES.has(s)
  );

  let confidence: ConfidenceLevel;

  if (sourceCount >= 3) {
    confidence = "high";
  } else if (sourceCount === 2) {
    confidence = "medium";
  } else {
    // Single source: boost if trusted
    confidence = hasTrustedSource ? "medium" : "low";
  }

  return { confidence, sourceCount, hasTrustedSource };
}

/**
 * Check if a source name is in the trusted list.
 */
export function isTrustedSource(sourceName: string): boolean {
  return TRUSTED_SOURCES.has(sourceName.toLowerCase().trim());
}
