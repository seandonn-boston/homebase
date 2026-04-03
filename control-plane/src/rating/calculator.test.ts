/**
 * Tests for Rating Calculator (RT-02)
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { RatingCalculator } from "./calculator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "rating-calc-test-"));
  // Create minimal structure
  mkdirSync(join(dir, ".hooks"), { recursive: true });
  mkdirSync(join(dir, "admiral", "standing-orders"), { recursive: true });
  mkdirSync(join(dir, "admiral", "governance"), { recursive: true });
  mkdirSync(join(dir, "control-plane", "src"), { recursive: true });
  mkdirSync(join(dir, ".brain"), { recursive: true });
  mkdirSync(join(dir, "admiral", "security"), { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RatingCalculator", () => {
  let tmpDir: string;

  before(() => {
    tmpDir = makeTempProject();
  });

  after(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("produces a report with all required fields", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({ projectRoot: tmpDir, entity: "test-fleet" });

    assert.ok(report.id.startsWith("rat_"), "id has rat_ prefix");
    assert.ok(report.generatedAt, "has generatedAt");
    assert.equal(report.entity, "test-fleet");
    assert.ok(["ADM-1", "ADM-2", "ADM-3", "ADM-4", "ADM-5"].includes(report.tier), "valid tier");
    assert.ok(report.overallScore >= 0 && report.overallScore <= 100, "score in range");
    assert.equal(report.dimensionScores.length, 7, "7 dimension scores");
    assert.ok(Array.isArray(report.activeCaps), "has activeCaps");
    assert.ok(Array.isArray(report.recommendations), "has recommendations");
    assert.ok(report.validUntil, "has validUntil");
  });

  it("applies dimension overrides correctly", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({
      projectRoot: tmpDir,
      entity: "test",
      dimensionOverrides: {
        enforcement_coverage: 90,
        hook_quality: 85,
        standing_orders_compliance: 88,
        brain_utilization: 75,
        fleet_governance: 80,
        security_posture: 82,
        observability_maturity: 78,
      },
    });

    const ec = report.dimensionScores.find((d) => d.dimensionId === "enforcement_coverage");
    assert.equal(ec?.score, 90, "enforcement_coverage override respected");
    assert.ok(report.overallScore > 60, "high overrides yield good score");
  });

  it("hard cap: any dimension below 30 caps at ADM-3", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({
      projectRoot: tmpDir,
      entity: "test",
      dimensionOverrides: {
        enforcement_coverage: 95,
        hook_quality: 95,
        standing_orders_compliance: 95,
        brain_utilization: 25, // below 30!
        fleet_governance: 95,
        security_posture: 95,
        observability_maturity: 95,
      },
    });

    assert.ok(
      ["ADM-3", "ADM-4", "ADM-5"].includes(report.tier),
      `tier ${report.tier} should be ADM-3 or worse due to hard cap`,
    );
    assert.ok(
      report.activeCaps.some((c) => c.condition.includes("below 30")),
      "hard cap recorded",
    );
  });

  it("enforcement coverage below 50 caps at ADM-4", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({
      projectRoot: tmpDir,
      entity: "test",
      dimensionOverrides: {
        enforcement_coverage: 40, // below 50
        hook_quality: 80,
        standing_orders_compliance: 80,
        brain_utilization: 80,
        fleet_governance: 80,
        security_posture: 80,
        observability_maturity: 80,
      },
    });

    assert.ok(
      ["ADM-4", "ADM-5"].includes(report.tier),
      `tier ${report.tier} should be capped at ADM-4`,
    );
  });

  it("high scores produce ADM-2 or better", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({
      projectRoot: tmpDir,
      entity: "test",
      dimensionOverrides: {
        enforcement_coverage: 95,
        hook_quality: 92,
        standing_orders_compliance: 90,
        brain_utilization: 88,
        fleet_governance: 91,
        security_posture: 89,
        observability_maturity: 93,
      },
    });

    assert.ok(
      ["ADM-1", "ADM-2"].includes(report.tier),
      `tier ${report.tier} should be ADM-2 or better with high scores`,
    );
    assert.equal(report.activeCaps.length, 0, "no caps with high scores");
  });

  it("uses certification suffix correctly", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({
      projectRoot: tmpDir,
      entity: "test",
      certificationSuffix: "-SA",
    });

    assert.ok(report.ratingLabel.endsWith("-SA"), "rating label includes -SA");
  });

  it("includes commitSha in report when provided", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({
      projectRoot: tmpDir,
      entity: "test",
      commitSha: "abc1234",
    });

    assert.equal(report.commitSha, "abc1234");
  });

  it("validUntil is approximately 1 year from generatedAt", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({ projectRoot: tmpDir, entity: "test" });

    const generated = new Date(report.generatedAt);
    const valid = new Date(report.validUntil);
    const diffMs = valid.getTime() - generated.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    assert.ok(diffDays >= 364 && diffDays <= 366, "validUntil ~1 year out");
  });

  it("produces recommendations for low-scoring dimensions", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({
      projectRoot: tmpDir,
      entity: "test",
      dimensionOverrides: {
        enforcement_coverage: 10,
        hook_quality: 50,
        standing_orders_compliance: 80,
        brain_utilization: 80,
        fleet_governance: 80,
        security_posture: 80,
        observability_maturity: 80,
      },
    });

    assert.ok(report.recommendations.length > 0, "has recommendations");
    const criticalRec = report.recommendations.find((r) => r.includes("CRITICAL"));
    assert.ok(criticalRec, "has critical recommendation for low score");
  });

  it("weighted score formula: all 100s = 100", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({
      projectRoot: tmpDir,
      entity: "test",
      dimensionOverrides: {
        enforcement_coverage: 100,
        hook_quality: 100,
        standing_orders_compliance: 100,
        brain_utilization: 100,
        fleet_governance: 100,
        security_posture: 100,
        observability_maturity: 100,
      },
    });

    assert.equal(report.overallScore, 100, "all 100s yields score of 100");
  });

  it("weighted score formula: all 0s = 0", () => {
    const calc = new RatingCalculator(tmpDir);
    const report = calc.calculate({
      projectRoot: tmpDir,
      entity: "test",
      dimensionOverrides: {
        enforcement_coverage: 0,
        hook_quality: 0,
        standing_orders_compliance: 0,
        brain_utilization: 0,
        fleet_governance: 0,
        security_posture: 0,
        observability_maturity: 0,
      },
    });

    assert.equal(report.overallScore, 0, "all 0s yields score of 0");
    assert.equal(report.tier, "ADM-5", "all 0s yields ADM-5");
  });
});
