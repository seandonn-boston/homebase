/**
 * Tests for Rating Benchmarks (RT-08)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BenchmarkComparator, BENCHMARKS } from "./benchmarks";
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
      { dimensionId: "enforcement_coverage", score: 70, weightedContribution: 14, evidence: "e", capTriggered: false },
      { dimensionId: "hook_quality", score: 60, weightedContribution: 9, evidence: "e", capTriggered: false },
      { dimensionId: "standing_orders_compliance", score: 65, weightedContribution: 13, evidence: "e", capTriggered: false },
      { dimensionId: "brain_utilization", score: 55, weightedContribution: 5.5, evidence: "e", capTriggered: false },
      { dimensionId: "fleet_governance", score: 68, weightedContribution: 10.2, evidence: "e", capTriggered: false },
      { dimensionId: "security_posture", score: 62, weightedContribution: 6.2, evidence: "e", capTriggered: false },
      { dimensionId: "observability_maturity", score: 70, weightedContribution: 7, evidence: "e", capTriggered: false },
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

describe("BENCHMARKS catalog", () => {
  it("has all 7 benchmarks", () => {
    const ids = Object.keys(BENCHMARKS);
    assert.equal(ids.length, 7, "7 benchmarks defined");
  });

  it("each benchmark has 7 dimension scores", () => {
    for (const [id, b] of Object.entries(BENCHMARKS)) {
      const dims = Object.keys(b.dimensionScores);
      assert.equal(dims.length, 7, `benchmark ${id} has 7 dimension scores`);
    }
  });

  it("pristine benchmark is ADM-1", () => {
    assert.equal(BENCHMARKS.pristine.tier, "ADM-1");
    assert.ok(BENCHMARKS.pristine.overallScore >= 95);
  });

  it("industry_average benchmark is ADM-4", () => {
    assert.equal(BENCHMARKS.industry_average.tier, "ADM-4");
    assert.ok(BENCHMARKS.industry_average.overallScore < 60);
  });

  it("spec_target benchmark is ADM-2", () => {
    assert.equal(BENCHMARKS.spec_target.tier, "ADM-2");
  });
});

describe("BenchmarkComparator.compareToBenchmark", () => {
  const comparator = new BenchmarkComparator();

  it("returns all required fields", () => {
    const report = makeReport();
    const result = comparator.compareToBenchmark(report, BENCHMARKS.spec_target);

    assert.ok(result.reportId, "has reportId");
    assert.ok(result.benchmarkId, "has benchmarkId");
    assert.ok(result.benchmarkName, "has benchmarkName");
    assert.ok(result.currentTier, "has currentTier");
    assert.ok(result.benchmarkTier, "has benchmarkTier");
    assert.ok(result.tierStatus, "has tierStatus");
    assert.ok(typeof result.overallGap === "number", "overallGap is number");
    assert.ok(Array.isArray(result.dimensionGaps), "has dimensionGaps");
    assert.ok(Array.isArray(result.strengths), "has strengths");
    assert.ok(Array.isArray(result.weaknesses), "has weaknesses");
    assert.ok(Array.isArray(result.closingActions), "has closingActions");
    assert.ok(typeof result.targetScore === "number", "has targetScore");
  });

  it("gap is negative when project is behind benchmark", () => {
    const report = makeReport({ overallScore: 65 });
    const result = comparator.compareToBenchmark(report, BENCHMARKS.spec_target);
    // spec_target overallScore = 85, so gap should be 65-85 = -20
    assert.ok(result.overallGap < 0, "negative gap when behind");
    assert.equal(result.tierStatus, "behind", "tier status: behind");
  });

  it("gap is positive when project is ahead of benchmark", () => {
    const report = makeReport({ overallScore: 95, tier: "ADM-1" });
    const result = comparator.compareToBenchmark(
      report,
      BENCHMARKS.industry_average,
    );
    assert.ok(result.overallGap > 0, "positive gap when ahead");
    assert.equal(result.tierStatus, "ahead", "tier status: ahead");
  });

  it("dimension gaps identify strengths and weaknesses", () => {
    // Make a report where enforcement_coverage is strong but brain_utilization is weak
    const report = makeReport({
      dimensionScores: [
        { dimensionId: "enforcement_coverage", score: 95, weightedContribution: 19, evidence: "e", capTriggered: false },
        { dimensionId: "hook_quality", score: 60, weightedContribution: 9, evidence: "e", capTriggered: false },
        { dimensionId: "standing_orders_compliance", score: 65, weightedContribution: 13, evidence: "e", capTriggered: false },
        { dimensionId: "brain_utilization", score: 20, weightedContribution: 2, evidence: "e", capTriggered: false },
        { dimensionId: "fleet_governance", score: 68, weightedContribution: 10.2, evidence: "e", capTriggered: false },
        { dimensionId: "security_posture", score: 62, weightedContribution: 6.2, evidence: "e", capTriggered: false },
        { dimensionId: "observability_maturity", score: 70, weightedContribution: 7, evidence: "e", capTriggered: false },
      ],
    });

    const result = comparator.compareToBenchmark(report, BENCHMARKS.spec_target);
    assert.ok(
      result.strengths.includes("enforcement_coverage"),
      "enforcement_coverage is a strength",
    );
    assert.ok(
      result.weaknesses.includes("brain_utilization"),
      "brain_utilization is a weakness",
    );
  });

  it("has 7 dimension gaps", () => {
    const report = makeReport();
    const result = comparator.compareToBenchmark(report, BENCHMARKS.spec_target);
    assert.equal(result.dimensionGaps.length, 7, "7 dimension gaps");
  });

  it("tierStatus 'meeting' when tiers match", () => {
    const report = makeReport({ tier: "ADM-2", overallScore: 82 });
    const result = comparator.compareToBenchmark(report, BENCHMARKS.adm2_floor);
    assert.equal(result.tierStatus, "meeting");
  });

  it("closingActions is non-empty when behind", () => {
    const report = makeReport({ overallScore: 40, tier: "ADM-4" });
    const result = comparator.compareToBenchmark(report, BENCHMARKS.spec_target);
    assert.ok(result.closingActions.length > 0, "has closing actions when behind");
  });

  it("closingActions mentions meeting/exceeding when ahead", () => {
    const report = makeReport({ overallScore: 99, tier: "ADM-1" });
    const result = comparator.compareToBenchmark(
      report,
      BENCHMARKS.industry_average,
    );
    assert.ok(
      result.closingActions[0].includes("meets or exceeds"),
      "first action mentions meeting benchmark",
    );
  });
});

describe("BenchmarkComparator.compareToAll", () => {
  it("returns comparisons for all benchmarks", () => {
    const comparator = new BenchmarkComparator();
    const report = makeReport();
    const all = comparator.compareToAll(report);
    const ids = Object.keys(all);
    assert.equal(ids.length, 7, "7 benchmark comparisons");
  });
});

describe("BenchmarkComparator.getRelevantBenchmark", () => {
  it("ADM-3 project gets adm2_floor as relevant benchmark", () => {
    const comparator = new BenchmarkComparator();
    const report = makeReport({ tier: "ADM-3" });
    const benchmark = comparator.getRelevantBenchmark(report);
    assert.equal(benchmark.id, "adm2_floor");
  });

  it("ADM-1 project gets pristine as relevant benchmark", () => {
    const comparator = new BenchmarkComparator();
    const report = makeReport({ tier: "ADM-1", overallScore: 96 });
    const benchmark = comparator.getRelevantBenchmark(report);
    assert.equal(benchmark.id, "pristine");
  });

  it("ADM-5 project gets adm4_floor as relevant benchmark", () => {
    const comparator = new BenchmarkComparator();
    const report = makeReport({ tier: "ADM-5", overallScore: 10 });
    const benchmark = comparator.getRelevantBenchmark(report);
    assert.equal(benchmark.id, "adm4_floor");
  });
});
