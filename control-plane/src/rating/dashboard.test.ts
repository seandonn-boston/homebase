/**
 * Tests for Rating Dashboard (RT-09)
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, before, after } from "node:test";
import { getDashboardData } from "./dashboard";
import { RatingHistory } from "./history";
import type { RatingReport } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReport(overrides: Partial<RatingReport> = {}): RatingReport {
  const valid = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  return {
    id: "rat_dash_test",
    generatedAt: new Date().toISOString(),
    entity: "test-fleet",
    tier: "ADM-3",
    certificationSuffix: "-SA",
    ratingLabel: "ADM-3-SA",
    overallScore: 65,
    dimensionScores: [
      { dimensionId: "enforcement_coverage", score: 70, weightedContribution: 14, evidence: "hooks: 3", capTriggered: false },
      { dimensionId: "hook_quality", score: 60, weightedContribution: 9, evidence: "2 hooks with error handling", capTriggered: false },
      { dimensionId: "standing_orders_compliance", score: 65, weightedContribution: 13, evidence: "5 SOs", capTriggered: false },
      { dimensionId: "brain_utilization", score: 55, weightedContribution: 5.5, evidence: "brain: 8 entries", capTriggered: false },
      { dimensionId: "fleet_governance", score: 68, weightedContribution: 10.2, evidence: "governance: 5 files", capTriggered: false },
      { dimensionId: "security_posture", score: 62, weightedContribution: 6.2, evidence: "auth.ts: true", capTriggered: false },
      { dimensionId: "observability_maturity", score: 70, weightedContribution: 7, evidence: "tracing: true", capTriggered: false },
    ],
    moduleRatings: [
      {
        module: "/hooks",
        classification: "critical",
        tier: "ADM-3",
        dimensionScores: [],
        overallScore: 68,
        capsProjectRating: true,
      },
      {
        module: "/control-plane/src",
        classification: "standard",
        tier: "ADM-3",
        dimensionScores: [],
        overallScore: 65,
        capsProjectRating: false,
      },
    ],
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

describe("getDashboardData", () => {
  let tmpDir: string;
  let history: RatingHistory;

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "dashboard-test-"));
    history = new RatingHistory(join(tmpDir, "history.json"));
  });

  after(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("returns all required top-level fields", () => {
    const report = makeReport();
    const data = getDashboardData(report, history);

    assert.ok(data.generatedAt, "has generatedAt");
    assert.equal(data.entity, "test-fleet", "has entity");
    assert.equal(data.ratingLabel, "ADM-3-SA", "has ratingLabel");
    assert.equal(data.tier, "ADM-3", "has tier");
    assert.ok(data.tierName, "has tierName");
    assert.ok(typeof data.overallScore === "number", "has overallScore");
    assert.ok(data.badgeSvg.startsWith("<svg"), "has badgeSvg");
    assert.ok(typeof data.activeCapsCount === "number", "has activeCapsCount");
    assert.ok(Array.isArray(data.dimensions), "has dimensions");
    assert.ok(Array.isArray(data.moduleHeatmap), "has moduleHeatmap");
    assert.ok(Array.isArray(data.gates), "has gates");
    assert.ok(Array.isArray(data.topRecommendations), "has topRecommendations");
    assert.ok(data.history, "has history");
    assert.ok(data.validUntil, "has validUntil");
    assert.equal(data.reportId, "rat_dash_test", "has reportId");
  });

  it("dimensions array has 7 entries", () => {
    const report = makeReport();
    const data = getDashboardData(report, history);
    assert.equal(data.dimensions.length, 7, "7 dimension cards");
  });

  it("each dimension card has required fields", () => {
    const report = makeReport();
    const data = getDashboardData(report, history);

    for (const dim of data.dimensions) {
      assert.ok(dim.dimensionId, "has dimensionId");
      assert.ok(dim.name, "has name");
      assert.ok(typeof dim.score === "number", "has score");
      assert.ok(typeof dim.weight === "number", "has weight");
      assert.ok(
        ["excellent", "good", "warning", "critical"].includes(dim.status),
        `valid status: ${dim.status}`,
      );
      assert.ok(typeof dim.capTriggered === "boolean", "has capTriggered");
    }
  });

  it("dimension status: excellent for score >= 80", () => {
    const report = makeReport({
      dimensionScores: [
        { dimensionId: "enforcement_coverage", score: 85, weightedContribution: 17, evidence: "e", capTriggered: false },
        { dimensionId: "hook_quality", score: 85, weightedContribution: 12.75, evidence: "e", capTriggered: false },
        { dimensionId: "standing_orders_compliance", score: 85, weightedContribution: 17, evidence: "e", capTriggered: false },
        { dimensionId: "brain_utilization", score: 85, weightedContribution: 8.5, evidence: "e", capTriggered: false },
        { dimensionId: "fleet_governance", score: 85, weightedContribution: 12.75, evidence: "e", capTriggered: false },
        { dimensionId: "security_posture", score: 85, weightedContribution: 8.5, evidence: "e", capTriggered: false },
        { dimensionId: "observability_maturity", score: 85, weightedContribution: 8.5, evidence: "e", capTriggered: false },
      ],
    });
    const data = getDashboardData(report, history);
    for (const dim of data.dimensions) {
      assert.equal(dim.status, "excellent", `${dim.dimensionId} should be excellent`);
    }
  });

  it("dimension status: critical for score < 40", () => {
    const report = makeReport({
      dimensionScores: [
        { dimensionId: "enforcement_coverage", score: 20, weightedContribution: 4, evidence: "e", capTriggered: false },
        { dimensionId: "hook_quality", score: 85, weightedContribution: 12.75, evidence: "e", capTriggered: false },
        { dimensionId: "standing_orders_compliance", score: 85, weightedContribution: 17, evidence: "e", capTriggered: false },
        { dimensionId: "brain_utilization", score: 85, weightedContribution: 8.5, evidence: "e", capTriggered: false },
        { dimensionId: "fleet_governance", score: 85, weightedContribution: 12.75, evidence: "e", capTriggered: false },
        { dimensionId: "security_posture", score: 85, weightedContribution: 8.5, evidence: "e", capTriggered: false },
        { dimensionId: "observability_maturity", score: 85, weightedContribution: 8.5, evidence: "e", capTriggered: false },
      ],
    });
    const data = getDashboardData(report, history);
    const ec = data.dimensions.find((d) => d.dimensionId === "enforcement_coverage");
    assert.equal(ec?.status, "critical", "low score is critical");
  });

  it("moduleHeatmap reflects module ratings", () => {
    const report = makeReport();
    const data = getDashboardData(report, history);
    assert.equal(data.moduleHeatmap.length, 2, "2 modules in heatmap");

    const hooksCell = data.moduleHeatmap.find((c) => c.module.includes("hooks"));
    assert.ok(hooksCell, "hooks module in heatmap");
    assert.equal(hooksCell?.classification, "critical");
    assert.ok(hooksCell!.heat >= 0 && hooksCell!.heat <= 1, "heat in 0-1 range");
    assert.ok(hooksCell?.capsProject, "hooks module caps project");
  });

  it("gates array has all HJG entries", () => {
    const report = makeReport();
    const data = getDashboardData(report, history);
    assert.ok(data.gates.length >= 7, "at least 7 gates");

    const gateIds = data.gates.map((g) => g.gateId);
    assert.ok(gateIds.includes("HJG-A1"), "has HJG-A1");
    assert.ok(gateIds.includes("HJG-F1"), "has HJG-F1");
  });

  it("nextTier is null for ADM-1", () => {
    const report = makeReport({ tier: "ADM-1", overallScore: 97 });
    const data = getDashboardData(report, history);
    assert.equal(data.nextTier, null, "no next tier for ADM-1");
  });

  it("nextTier has correct targetTier for ADM-3", () => {
    const report = makeReport({ tier: "ADM-3", overallScore: 65 });
    const data = getDashboardData(report, history);
    assert.ok(data.nextTier, "has nextTier");
    assert.equal(data.nextTier?.targetTier, "ADM-2");
    assert.equal(data.nextTier?.targetTierName, "Governed");
    assert.ok(data.nextTier!.scoreGap >= 0, "scoreGap >= 0");
  });

  it("history summary has totalEntries", () => {
    const report = makeReport();
    const data = getDashboardData(report, history);
    assert.ok(typeof data.history.totalEntries === "number");
  });

  it("history summary shows trend when entries exist", () => {
    const histPath = join(tmpDir, "dash-history-trend.json");
    const h = new RatingHistory(histPath);

    const baseReport = makeReport();
    h.append({ ...baseReport, overallScore: 60, id: "r1" });
    h.append({ ...baseReport, overallScore: 65, id: "r2" });
    h.append({ ...baseReport, overallScore: 70, id: "r3" });

    const data = getDashboardData(baseReport, h);
    assert.ok(data.history.trend30d, "has 30d trend when history exists");
    assert.ok(data.history.trend30d?.direction, "trend has direction");
  });

  it("topRecommendations is limited to 5", () => {
    const report = makeReport();
    const lotsOfRecs = Array.from({ length: 20 }, (_, i) => ({
      id: `rec-${i}`,
      title: `Rec ${i}`,
      description: "",
      dimension: "enforcement_coverage" as const,
      estimatedGain: 10,
      effort: "S" as const,
      impactScore: 10,
      prerequisites: [],
      addressesCap: false,
      priority: 2 as const,
      currentScore: 50,
      targetScore: 60,
    }));
    const data = getDashboardData(report, history, { recommendations: lotsOfRecs });
    assert.ok(data.topRecommendations.length <= 5, "max 5 recommendations");
  });

  it("badgeSvg contains the tier code and suffix", () => {
    const report = makeReport({ tier: "ADM-2", certificationSuffix: "-IA", ratingLabel: "ADM-2-IA" });
    const data = getDashboardData(report, history);
    assert.ok(data.badgeSvg.includes("ADM-2-IA"), "badge has ADM-2-IA");
  });
});
