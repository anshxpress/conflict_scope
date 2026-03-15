import { describe, expect, it } from "bun:test";
import { isStrictlyVerifiedSignal } from "./forecast-engine";

describe("isStrictlyVerifiedSignal", () => {
  it("accepts medium/high confidence with trusted source", () => {
    const result = isStrictlyVerifiedSignal({
      eventConfidence: "high",
      referenceConfidence: "medium",
      hasTrustedSource: true,
    });

    expect(result).toBe(true);
  });

  it("rejects when trusted source is missing", () => {
    const result = isStrictlyVerifiedSignal({
      eventConfidence: "high",
      referenceConfidence: "high",
      hasTrustedSource: false,
    });

    expect(result).toBe(false);
  });

  it("rejects low event confidence", () => {
    const result = isStrictlyVerifiedSignal({
      eventConfidence: "low",
      referenceConfidence: "high",
      hasTrustedSource: true,
    });

    expect(result).toBe(false);
  });

  it("rejects low reference confidence", () => {
    const result = isStrictlyVerifiedSignal({
      eventConfidence: "high",
      referenceConfidence: "low",
      hasTrustedSource: true,
    });

    expect(result).toBe(false);
  });
});
