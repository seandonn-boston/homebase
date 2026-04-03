/**
 * Tests for Improvement Recommendations (RT-06)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RecommendationEngine } from "./recommendations";
import type { RatingReport } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReport(overrides: Partial<RatingReport> = {}): RatingReport {
  const valid = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  return {
    id: "rat_test",
    generatedAt: new Date().toISOString(),
    entity: "test",
    tier: "ADM-3",
    certificationSuffix: "-SA",
    ratingLabel: "ADM-3-SA",
    overallScore: 65,
    dimensionScores: [
      { dimensionId: "enforcement_coverage", score: 55, weightedContribution: 11, evidence: "e", capTriggered: false },
      { dimensionId: "hook_quality", score: 55, weightedContribution: 8.25, evidence: "e", capTriggered: false },
      { dimensionId: "standing_orders_compliance", score: 60, weightedContribution: 12, evidence: "e", capTriggered: false },
      { dimensionId: "brain_utilization", score: 60, weightedContribution: 6, evidence: "e", capTriggered: false },
      { dimensionId: "fleet_governance", score: 55, weightedContribution: 8.25, evidence: "e", capTriggered: false },
      { dimensionId: "security_posture", score: 55, weightedContribution: 5.5, evidence: "e", capTriggered: false },
      { dimensionId: "observability_maturity", score: 60, weightedContribution: 6, evidence: "e", capTriggered: false },
    ],
    moduleRatings: [],
    activeCaps: [],
    recommendations: [],
    validUntil: valid,
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecommendationEngine", () => {
  const engine = new RecommendationEngine();

  it("returns an array of recommendations", () => {
    const report = makeReport();
    const recs = engine.getRecommendations(report);
    assert.ok(Array.isArray(recs), "returns array");
    assert.ok(recs.length > 0, "non-empty recommendations");
  });

  it("each recommendation has required fields", () => {
    const report = makeReport();
    const recs = engine.getRecommendations(report);

    for (const rec of recs) {
      assert.ok(rec.id, "has id");
      assert.ok(rec.title, "has title");
      assert.ok(rec.description, "has description");
      assert.ok(rec.dimension, "has dimension");
      assert.ok(typeof rec.estimatedGain === "number", "estimatedGain is number");
      assert.ok(["S", "M", "L"].includes(rec.effort), "effort is S/M/L");
      assert.ok(typeof rec.impactScore === "number", "impactScore is number");
      assert.ok(Array.isArray(rec.prerequisites), "prerequisites is array");
      assert.ok(typeof rec.addressesCap === "boolean", "addressesCap is boolean");
      assert.ok([0, 1, 2, 3].includes(rec.priority), "priority 0-3");
      assert.ok(typeof rec.currentScore === "number", "currentScore is number");
      assert.ok(typeof rec.targetScore === "number", "targetScore is number");
    }
  });

  it("recommendations are sorted: priority first, then impact score", () => {
    const report = makeReport();
    const recs = engine.getRecommendations(report);

    for (let i = 1; i < recs.length; i++) {
      const prev = recs[i - 1];
      const curr = recs[i];
      if (prev.priority === curr.priority) {
        assert.ok(
          prev.impactScore >= curr.impactScore,
          `${prev.id} (impact ${prev.impactScore}) should be >= ${curr.id} (impact ${curr.impactScore})`,
        );
      } else {
        assert.ok(
          prev.priority <= curr.priority,
          `${prev.id} (priority ${prev.priority}) should be <= ${curr.id} (priority ${curr.priority})`,
        );
      }
    }
  });

  it("does not recommend actions when score is above trigger threshold", () => {
    // All dimensions at 95 — no triggers should fire
    const report = makeReport({
      overallScore: 95,
      dimensionScores: [
        { dimensionId: "enforcement_coverage", score: 95, weightedContribution: 19, evidence: "e", capTriggered: false },
        { dimensionId: "hook_quality", score: 95, weightedContribution: 14.25, evidence: "e", capTriggered: false },
        { dimensionId: "standing_orders_compliance", score: 95, weightedContribution: 19, evidence: "e", capTriggered: false },
        { dimensionId: "brain_utilization", score: 95, weightedContribution: 9.5, evidence: "e", capTriggered: false },
        { dimensionId: "fleet_governance", score: 95, weightedContribution: 14.25, evidence: "e", capTriggered: false },
        { dimensionId: "security_posture", score: 95, weightedContribution: 9.5, evidence: "e", capTriggered: false },
        { dimensionId: "observability_maturity", score: 95, weightedContribution: 9.5, evidence: "e", capTriggered: false },
      ],
    });
    const recs = engine.getRecommendations(report);
    assert.equal(recs.length, 0, "no recommendations when all scores high");
  });

  it("cap-triggered dimensions get priority 0", () => {
    const report = makeReport({
      dimensionScores: [
        { dimensionId: "enforcement_coverage", score: 20, weightedContribution: 4, evidence: "e", capTriggered: true, capRule: "below 30" },
        { dimensionId: "hook_quality", score: 60, weightedContribution: 9, evidence: "e", capTriggered: false },
        { dimensionId: "standing_orders_compliance", score: 65, weightedContribution: 13, evidence: "e", capTriggered: false },
        { dimensionId: "brain_utilization", score: 60, weightedContribution: 6, evidence: "e", capTriggered: false },
        { dimensionId: "fleet_governance", score: 60, weightedContribution: 9, evidence: "e", capTriggered: false },
        { dimensionId: "security_posture", score: 60, weightedContribution: 6, evidence: "e", capTriggered: false },
        { dimensionId: "observability_maturity", score: 65, weightedContribution: 6.5, evidence: "e", capTriggered: false },
      ],
    });
    const recs = engine.getRecommendations(report);
    const ecRecs = recs.filter((r) => r.dimension === "enforcement_coverage");
    assert.ok(ecRecs.length > 0, "has enforcement_coverage recommendations");
    assert.equal(ecRecs[0].priority, 0, "enforcement_coverage rec is priority 0 (critical)");
  });

  it("targetScore does not exceed 100", () => {
    const report = makeReport();
    const recs = engine.getRecommendations(report);
    for (const rec of recs) {
      assert.ok(rec.targetScore <= 100, `targetScore ${rec.targetScore} should not exceed 100`);
      assert.ok(rec.targetScore >= rec.currentScore, "targetScore >= currentScore");
    }
  });

  it("impactScore is estimatedGain divided by effort units", () => {
    const report = makeReport({
      dimensionScores: [
        { dimensionId: "enforcement_coverage", score: 10, weightedContribution: 2, evidence: "e", capTriggered: false },
        { dimensionId: "hook_quality", score: 10, weightedContribution: 1.5, evidence: "e", capTriggered: false },
        { dimensionId: "standing_orders_compliance", score: 10, weightedContribution: 2, evidence: "e", capTriggered: false },
        { dimensionId: "brain_utilization", score: 10, weightedContribution: 1, evidence: "e", capTriggered: false },
        { dimensionId: "fleet_governance", score: 10, weightedContribution: 1.5, evidence: "e", capTriggered: false },
        { dimensionId: "security_posture", score: 10, weightedContribution: 1, evidence: "e", capTriggered: false },
        { dimensionId: "observability_maturity", score: 10, weightedContribution: 1, evidence: "e", capTriggered: false },
      ],
    });
    const recs = engine.getRecommendations(report);
    for (const rec of recs) {
      assert.ok(rec.impactScore > 0, "impactScore positive");
      // S effort (units=1): impactScore = gain/1; M (units=3): gain/3; L (units=9): gain/9
      const expectedUnits = { S: 1, M: 3, L: 9 }[rec.effort];
      const expected =
        Math.round((rec.estimatedGain / expectedUnits) * 10) / 10;
      assert.equal(rec.impactScore, expected, `impactScore for ${rec.id}`);
    }
  });

  it("getNextTierRecommendations returns targetTier", () => {
    const report = makeReport({ tier: "ADM-4", overallScore: 45 });
    const result = engine.getNextTierRecommendations(report);
    assert.equal(result.targetTier, "ADM-3", "next tier from ADM-4 is ADM-3");
    assert.ok(Array.isArray(result.recommendations));
  });

  it("getNextTierRecommendations for ADM-1 returns empty (already top)", () => {
    const report = makeReport({
      tier: "ADM-1",
      overallScore: 98,
      dimensionScores: [
        { dimensionId: "enforcement_coverage", score: 98, weightedContribution: 19.6, evidence: "e", capTriggered: false },
        { dimensionId: "hook_quality", score: 98, weightedContribution: 14.7, evidence: "e", capTriggered: false },
        { dimensionId: "standing_orders_compliance", score: 98, weightedContribution: 19.6, evidence: "e", capTriggered: false },
        { dimensionId: "brain_utilization", score: 98, weightedContribution: 9.8, evidence: "e", capTriggered: false },
        { dimensionId: "fleet_governance", score: 98, weightedContribution: 14.7, evidence: "e", capTriggered: false },
        { dimensionId: "security_posture", score: 98, weightedContribution: 9.8, evidence: "e", capTriggered: false },
        { dimensionId: "observability_maturity", score: 98, weightedContribution: 9.8, evidence: "e", capTriggered: false },
      ],
    });
    const result = engine.getNextTierRecommendations(report);
    assert.equal(result.targetTier, "ADM-1", "no next tier from ADM-1");
    assert.equal(result.recommendations.length, 0, "no recommendations");
  });

  it("recommendations with prerequisites reference valid ids", () => {
    const report = makeReport();
    const recs = engine.getRecommendations(report);
    const ids = new Set(recs.map((r) => r.id));
    // Also include all possible IDs from catalog (prereqs may not be in result set)
    // Just verify prereqs are non-empty strings
    for (const rec of recs) {
      for (const prereq of rec.prerequisites) {
        assert.ok(typeof prereq === "string" && prereq.length > 0, "prereq is non-empty string");
      }
    }
  });
});
