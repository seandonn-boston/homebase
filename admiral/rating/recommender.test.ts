/**
 * Tests for Rating Improvement Recommender (RT-06)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateRecommendations,
  formatRecommendations,
} from "./recommender";
import type { RatingReport, RatingTier } from "./rating-model";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReport(overrides: Partial<RatingReport> = {}): RatingReport {
  return {
    entity: "test",
    category: "platform",
    rating: "ADM-4" as RatingTier,
    certificationSuffix: "-SA",
    displayRating: "ADM-4-SA",
    timestamp: new Date().toISOString(),
    benchmarks: [
      { benchmarkId: "first-pass-quality", value: 55, status: "measured", source: "test" },
      { benchmarkId: "recovery-success-rate", value: 60, status: "measured", source: "test" },
      { benchmarkId: "enforcement-coverage", value: 45, status: "measured", source: "test" },
      { benchmarkId: "context-efficiency", value: 0.12, status: "measured", source: "test" },
      { benchmarkId: "governance-overhead", value: 22, status: "measured", source: "test" },
      { benchmarkId: "coordination-overhead", value: 15, status: "measured", source: "test" },
      { benchmarkId: "knowledge-reuse", value: 10, status: "measured", source: "test" },
    ],
    gateVerdicts: [],
    activeHardCaps: [],
    rationale: "test",
    conditions: [],
    recommendedImprovements: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateRecommendations
// ---------------------------------------------------------------------------

describe("generateRecommendations", () => {
  it("produces recommendations for ADM-4 to ADM-3", () => {
    const report = makeReport();
    const result = generateRecommendations(report);
    assert.equal(result.currentRating, "ADM-4");
    assert.equal(result.nextTier, "ADM-3");
    assert.ok(result.recommendations.length > 0);
  });

  it("hard cap recommendations get highest priority", () => {
    const report = makeReport({
      activeHardCaps: [
        { ruleId: "low-enforcement", maxTier: "ADM-4", currentValue: 45, threshold: 50 },
      ],
    });
    const result = generateRecommendations(report);
    const hardCapRec = result.recommendations.find((r) => r.id.startsWith("resolve-cap"));
    assert.ok(hardCapRec);
    assert.equal(hardCapRec!.priority, 1);
  });

  it("identifies benchmark gaps", () => {
    const report = makeReport();
    const result = generateRecommendations(report);
    const fpqRec = result.recommendations.find((r) => r.benchmarkId === "first-pass-quality");
    assert.ok(fpqRec);
    assert.ok(fpqRec!.gap! > 0);
  });

  it("recommends gate evaluation when gates are missing", () => {
    const report = makeReport();
    const result = generateRecommendations(report);
    const gateRec = result.recommendations.find((r) => r.id === "evaluate-gates");
    assert.ok(gateRec);
    assert.ok(gateRec!.action.includes("6"));
  });

  it("recommends fixing failed gates", () => {
    const report = makeReport({
      gateVerdicts: [
        { gateId: "HJG-1", passed: false, evaluator: "test", evidence: "Failed alignment", evaluatedAt: new Date().toISOString() },
      ],
    });
    const result = generateRecommendations(report);
    const fixRec = result.recommendations.find((r) => r.id === "fix-gate-HJG-1");
    assert.ok(fixRec);
  });

  it("includes plan references for benchmark improvements", () => {
    const report = makeReport();
    const result = generateRecommendations(report);
    const ecRec = result.recommendations.find((r) => r.benchmarkId === "enforcement-coverage");
    if (ecRec) {
      assert.ok(ecRec.planReferences.length > 0);
      assert.ok(ecRec.planReferences.some((r) => r.includes("Stream 7")));
    }
  });

  it("includes progression steps", () => {
    const report = makeReport();
    const result = generateRecommendations(report);
    assert.ok(result.progression.length > 0);
    const step = result.progression.find((p) => p.fromTier === "ADM-4");
    assert.ok(step);
    assert.equal(step!.toTier, "ADM-3");
  });

  it("returns no next tier for ADM-1", () => {
    const report = makeReport({ rating: "ADM-1" as RatingTier });
    const result = generateRecommendations(report);
    assert.equal(result.nextTier, null);
  });

  it("handles ADM-5 with useful recommendations", () => {
    const report = makeReport({
      rating: "ADM-5" as RatingTier,
      benchmarks: [],
      gateVerdicts: [],
    });
    const result = generateRecommendations(report);
    assert.equal(result.nextTier, "ADM-4");
    // Should recommend gate evaluation at minimum
    const gateRec = result.recommendations.find((r) => r.id === "evaluate-gates");
    assert.ok(gateRec);
  });

  it("sorts recommendations by priority", () => {
    const report = makeReport({
      activeHardCaps: [
        { ruleId: "low-enforcement", maxTier: "ADM-4", currentValue: 45, threshold: 50 },
      ],
    });
    const result = generateRecommendations(report);
    for (let i = 1; i < result.recommendations.length; i++) {
      assert.ok(
        result.recommendations[i].priority >= result.recommendations[i - 1].priority,
        "recommendations should be sorted by priority",
      );
    }
  });

  it("assigns effort sizes based on gap magnitude", () => {
    const report = makeReport();
    const result = generateRecommendations(report);
    for (const rec of result.recommendations) {
      assert.ok(["S", "M", "L"].includes(rec.effort));
    }
  });
});

// ---------------------------------------------------------------------------
// formatRecommendations
// ---------------------------------------------------------------------------

describe("formatRecommendations", () => {
  it("produces markdown with key sections", () => {
    const report = makeReport();
    const result = generateRecommendations(report);
    const md = formatRecommendations(result);
    assert.ok(md.includes("# Rating Improvement Recommendations"));
    assert.ok(md.includes("Current Rating:** ADM-4"));
    assert.ok(md.includes("Prioritized Actions"));
  });

  it("includes progression path", () => {
    const report = makeReport();
    const result = generateRecommendations(report);
    const md = formatRecommendations(result);
    assert.ok(md.includes("Rating Progression Path"));
    assert.ok(md.includes("ADM-4"));
    assert.ok(md.includes("ADM-3"));
  });

  it("handles ADM-1 gracefully", () => {
    const result = generateRecommendations(
      makeReport({ rating: "ADM-1" as RatingTier, benchmarks: [], activeHardCaps: [], gateVerdicts: [] }),
    );
    const md = formatRecommendations(result);
    assert.ok(md.includes("ADM-1 Premier"));
  });
});
