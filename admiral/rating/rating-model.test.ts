/**
 * Tests for Rating System Data Model (RT-01)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TIER_DEFINITIONS,
  TIER_COLORS,
  CERTIFICATION_LEVELS,
  ENTITY_CATEGORIES,
  CORE_BENCHMARKS,
  HARD_CAP_RULES,
  HUMAN_JUDGMENT_GATES,
  MULTI_GATE_FAILURE_CAP,
  MULTI_GATE_FAILURE_THRESHOLD,
  TIER_ELIGIBILITY,
  evaluateHardCaps,
  evaluateGateCap,
  evaluateTierEligibility,
  calculateRating,
  formatRatingReport,
  isValidTier,
  isValidCategory,
  isValidSuffix,
  getDimensionsForCategory,
  getTierDefinition,
  compareTiers,
  type RatingTier,
  type BenchmarkResult,
  type GateVerdict,
} from "./rating-model";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBenchmarks(
  overrides: Partial<Record<string, number>> = {},
): BenchmarkResult[] {
  const defaults: Record<string, number> = {
    "first-pass-quality": 95,
    "recovery-success-rate": 97,
    "enforcement-coverage": 100,
    "context-efficiency": 0.35,
    "governance-overhead": 8,
    "coordination-overhead": 8,
    "knowledge-reuse": 55,
  };
  return Object.entries({ ...defaults, ...overrides }).map(([id, value]) => ({
    benchmarkId: id,
    value: value ?? null,
    status: "measured" as const,
    source: "test",
  }));
}

function makeAllGatesPassed(): GateVerdict[] {
  return HUMAN_JUDGMENT_GATES.map((g) => ({
    gateId: g.id,
    passed: true,
    evaluator: "test-evaluator",
    evidence: "Test evidence",
    evaluatedAt: new Date().toISOString(),
  }));
}

function makeGatesWithFailures(failIds: string[]): GateVerdict[] {
  return HUMAN_JUDGMENT_GATES.map((g) => ({
    gateId: g.id,
    passed: !failIds.includes(g.id),
    evaluator: "test-evaluator",
    evidence: "Test evidence",
    evaluatedAt: new Date().toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Tier Definitions
// ---------------------------------------------------------------------------

describe("Tier Definitions", () => {
  it("defines all 5 tiers", () => {
    const tiers: RatingTier[] = ["ADM-1", "ADM-2", "ADM-3", "ADM-4", "ADM-5"];
    for (const t of tiers) {
      assert.ok(TIER_DEFINITIONS.has(t), `Missing tier ${t}`);
    }
    assert.equal(TIER_DEFINITIONS.size, 5);
  });

  it("assigns correct grades", () => {
    assert.equal(TIER_DEFINITIONS.get("ADM-1")!.grade, "Premier");
    assert.equal(TIER_DEFINITIONS.get("ADM-2")!.grade, "Certified");
    assert.equal(TIER_DEFINITIONS.get("ADM-3")!.grade, "Operational");
    assert.equal(TIER_DEFINITIONS.get("ADM-4")!.grade, "Provisional");
    assert.equal(TIER_DEFINITIONS.get("ADM-5")!.grade, "Ungoverned");
  });

  it("requires more gates as tier improves", () => {
    const gates = [
      TIER_DEFINITIONS.get("ADM-5")!.minGatesPassed,
      TIER_DEFINITIONS.get("ADM-4")!.minGatesPassed,
      TIER_DEFINITIONS.get("ADM-3")!.minGatesPassed,
      TIER_DEFINITIONS.get("ADM-2")!.minGatesPassed,
      TIER_DEFINITIONS.get("ADM-1")!.minGatesPassed,
    ];
    for (let i = 1; i < gates.length; i++) {
      assert.ok(gates[i] >= gates[i - 1], `Gate requirement should increase: ${gates[i]} >= ${gates[i - 1]}`);
    }
  });

  it("only ADM-1 allows unsupervised operation", () => {
    assert.equal(TIER_DEFINITIONS.get("ADM-1")!.unsupervisedOperation, true);
    assert.equal(TIER_DEFINITIONS.get("ADM-2")!.unsupervisedOperation, false);
    assert.equal(TIER_DEFINITIONS.get("ADM-3")!.unsupervisedOperation, false);
  });

  it("only ADM-1 and ADM-2 require attack corpus", () => {
    assert.equal(TIER_DEFINITIONS.get("ADM-1")!.requiresAttackCorpus, true);
    assert.equal(TIER_DEFINITIONS.get("ADM-2")!.requiresAttackCorpus, true);
    assert.equal(TIER_DEFINITIONS.get("ADM-3")!.requiresAttackCorpus, false);
  });
});

// ---------------------------------------------------------------------------
// Tier Colors
// ---------------------------------------------------------------------------

describe("Tier Colors", () => {
  it("maps all 5 tiers to colors", () => {
    assert.equal(TIER_COLORS.get("ADM-1"), "gold");
    assert.equal(TIER_COLORS.get("ADM-2"), "green");
    assert.equal(TIER_COLORS.get("ADM-3"), "blue");
    assert.equal(TIER_COLORS.get("ADM-4"), "yellow");
    assert.equal(TIER_COLORS.get("ADM-5"), "red");
  });
});

// ---------------------------------------------------------------------------
// Certification Levels
// ---------------------------------------------------------------------------

describe("Certification Levels", () => {
  it("defines 3 certification levels", () => {
    assert.equal(CERTIFICATION_LEVELS.length, 3);
  });

  it("has correct suffixes", () => {
    const suffixes = CERTIFICATION_LEVELS.map((c) => c.suffix);
    assert.ok(suffixes.includes("-SA"));
    assert.ok(suffixes.includes("-IA"));
    assert.ok(suffixes.includes(""));
  });
});

// ---------------------------------------------------------------------------
// Entity Categories & Dimensions
// ---------------------------------------------------------------------------

describe("Entity Categories", () => {
  it("defines all 5 categories", () => {
    assert.equal(ENTITY_CATEGORIES.size, 5);
    assert.ok(ENTITY_CATEGORIES.has("agent"));
    assert.ok(ENTITY_CATEGORIES.has("fleet"));
    assert.ok(ENTITY_CATEGORIES.has("platform"));
    assert.ok(ENTITY_CATEGORIES.has("model"));
    assert.ok(ENTITY_CATEGORIES.has("workflow"));
  });

  it("agent has 6 dimensions", () => {
    assert.equal(ENTITY_CATEGORIES.get("agent")!.dimensions.length, 6);
  });

  it("fleet has 6 dimensions", () => {
    assert.equal(ENTITY_CATEGORIES.get("fleet")!.dimensions.length, 6);
  });

  it("platform has 6 dimensions", () => {
    assert.equal(ENTITY_CATEGORIES.get("platform")!.dimensions.length, 6);
  });

  it("model has 6 dimensions", () => {
    assert.equal(ENTITY_CATEGORIES.get("model")!.dimensions.length, 6);
  });

  it("workflow has 5 dimensions", () => {
    assert.equal(ENTITY_CATEGORIES.get("workflow")!.dimensions.length, 5);
  });

  it("all dimensions have id, name, and description", () => {
    for (const [, cat] of ENTITY_CATEGORIES) {
      for (const dim of cat.dimensions) {
        assert.ok(dim.id, "dimension must have id");
        assert.ok(dim.name, "dimension must have name");
        assert.ok(dim.description, "dimension must have description");
      }
    }
  });

  it("dimension IDs are unique within each category", () => {
    for (const [, cat] of ENTITY_CATEGORIES) {
      const ids = cat.dimensions.map((d) => d.id);
      assert.equal(new Set(ids).size, ids.length, `duplicate dimension IDs in ${cat.name}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Core Benchmarks
// ---------------------------------------------------------------------------

describe("Core Benchmarks", () => {
  it("defines exactly 7 benchmarks", () => {
    assert.equal(CORE_BENCHMARKS.length, 7);
  });

  it("all benchmarks have required fields", () => {
    for (const b of CORE_BENCHMARKS) {
      assert.ok(b.id, "benchmark must have id");
      assert.ok(b.name, "benchmark must have name");
      assert.ok(b.unit, "benchmark must have unit");
      assert.equal(typeof b.targetValue, "number");
      assert.equal(typeof b.higherIsBetter, "boolean");
    }
  });

  it("benchmark IDs are unique", () => {
    const ids = CORE_BENCHMARKS.map((b) => b.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

// ---------------------------------------------------------------------------
// Hard Cap Rules
// ---------------------------------------------------------------------------

describe("Hard Cap Rules", () => {
  it("defines 10 hard cap rules", () => {
    assert.equal(HARD_CAP_RULES.length, 10);
  });

  it("ADM-4 caps include low metrics", () => {
    const adm4Caps = HARD_CAP_RULES.filter((r) => r.maxTier === "ADM-4");
    assert.ok(adm4Caps.length >= 4, `expected >=4 ADM-4 caps, got ${adm4Caps.length}`);
  });

  it("ADM-3 caps include behavioral violations", () => {
    const identityCap = HARD_CAP_RULES.find((r) => r.id === "identity-violation");
    assert.ok(identityCap, "identity-violation rule must exist");
    assert.equal(identityCap!.maxTier, "ADM-3");
  });

  it("all rules have unique IDs", () => {
    const ids = HARD_CAP_RULES.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

// ---------------------------------------------------------------------------
// Human Judgment Gates
// ---------------------------------------------------------------------------

describe("Human Judgment Gates", () => {
  it("defines 6 gates", () => {
    assert.equal(HUMAN_JUDGMENT_GATES.length, 6);
  });

  it("multi-gate failure threshold is 2", () => {
    assert.equal(MULTI_GATE_FAILURE_THRESHOLD, 2);
    assert.equal(MULTI_GATE_FAILURE_CAP, "ADM-4");
  });

  it("all gates have required fields", () => {
    for (const g of HUMAN_JUDGMENT_GATES) {
      assert.ok(g.id);
      assert.ok(g.name);
      assert.ok(g.description);
      assert.ok([1, 2, 3, 4].includes(g.failureTier));
      assert.ok(isValidTier(g.failureCap));
    }
  });
});

// ---------------------------------------------------------------------------
// Tier Eligibility
// ---------------------------------------------------------------------------

describe("Tier Eligibility", () => {
  it("defines thresholds for all 5 tiers", () => {
    assert.equal(TIER_ELIGIBILITY.size, 5);
  });

  it("ADM-5 has no thresholds (default)", () => {
    assert.equal(TIER_ELIGIBILITY.get("ADM-5")!.thresholds.length, 0);
  });

  it("ADM-1 has thresholds for all 7 benchmarks", () => {
    assert.equal(TIER_ELIGIBILITY.get("ADM-1")!.thresholds.length, 7);
  });

  it("thresholds get stricter for better tiers", () => {
    const fpq4 = TIER_ELIGIBILITY.get("ADM-4")!.thresholds.find(
      (t) => t.benchmarkId === "first-pass-quality",
    )!.value;
    const fpq3 = TIER_ELIGIBILITY.get("ADM-3")!.thresholds.find(
      (t) => t.benchmarkId === "first-pass-quality",
    )!.value;
    const fpq2 = TIER_ELIGIBILITY.get("ADM-2")!.thresholds.find(
      (t) => t.benchmarkId === "first-pass-quality",
    )!.value;
    const fpq1 = TIER_ELIGIBILITY.get("ADM-1")!.thresholds.find(
      (t) => t.benchmarkId === "first-pass-quality",
    )!.value;
    assert.ok(fpq1 > fpq2);
    assert.ok(fpq2 > fpq3);
    assert.ok(fpq3 > fpq4);
  });
});

// ---------------------------------------------------------------------------
// evaluateHardCaps
// ---------------------------------------------------------------------------

describe("evaluateHardCaps", () => {
  it("returns empty when no caps are triggered", () => {
    const caps = evaluateHardCaps(makeBenchmarks(), {});
    assert.equal(caps.length, 0);
  });

  it("triggers low-first-pass cap at <50%", () => {
    const caps = evaluateHardCaps(
      makeBenchmarks({ "first-pass-quality": 40 }),
      {},
    );
    const cap = caps.find((c) => c.ruleId === "low-first-pass");
    assert.ok(cap, "low-first-pass cap should be triggered");
    assert.equal(cap!.maxTier, "ADM-4");
  });

  it("triggers identity-violation flag", () => {
    const caps = evaluateHardCaps(makeBenchmarks(), {
      identityViolation: true,
    });
    const cap = caps.find((c) => c.ruleId === "identity-violation");
    assert.ok(cap, "identity-violation cap should be triggered");
    assert.equal(cap!.maxTier, "ADM-3");
  });

  it("triggers authority-escalation flag", () => {
    const caps = evaluateHardCaps(makeBenchmarks(), {
      authorityEscalation: true,
    });
    assert.ok(caps.find((c) => c.ruleId === "authority-escalation"));
  });

  it("triggers attack corpus cap at <70%", () => {
    const caps = evaluateHardCaps(makeBenchmarks(), {
      attackCorpusPassRate: 60,
    });
    const cap = caps.find((c) => c.ruleId === "low-attack-corpus-pass");
    assert.ok(cap, "attack corpus cap should be triggered");
    assert.equal(cap!.maxTier, "ADM-3");
  });

  it("does not trigger attack corpus cap at >=70%", () => {
    const caps = evaluateHardCaps(makeBenchmarks(), {
      attackCorpusPassRate: 75,
    });
    assert.equal(
      caps.find((c) => c.ruleId === "low-attack-corpus-pass"),
      undefined,
    );
  });

  it("triggers multiple caps simultaneously", () => {
    const caps = evaluateHardCaps(
      makeBenchmarks({
        "first-pass-quality": 30,
        "recovery-success-rate": 40,
        "governance-overhead": 30,
      }),
      {},
    );
    assert.ok(caps.length >= 3, `expected >=3 caps, got ${caps.length}`);
  });
});

// ---------------------------------------------------------------------------
// evaluateGateCap
// ---------------------------------------------------------------------------

describe("evaluateGateCap", () => {
  it("returns null when all gates pass", () => {
    assert.equal(evaluateGateCap(makeAllGatesPassed()), null);
  });

  it("returns gate-specific cap for single failure", () => {
    const verdicts = makeGatesWithFailures(["HJG-1"]);
    assert.equal(evaluateGateCap(verdicts), "ADM-3");
  });

  it("returns ADM-2 for novel situation response failure", () => {
    const verdicts = makeGatesWithFailures(["HJG-6"]);
    assert.equal(evaluateGateCap(verdicts), "ADM-2");
  });

  it("returns ADM-4 for two or more gate failures", () => {
    const verdicts = makeGatesWithFailures(["HJG-1", "HJG-2"]);
    assert.equal(evaluateGateCap(verdicts), "ADM-4");
  });

  it("returns ADM-4 for three gate failures", () => {
    const verdicts = makeGatesWithFailures(["HJG-1", "HJG-2", "HJG-3"]);
    assert.equal(evaluateGateCap(verdicts), "ADM-4");
  });
});

// ---------------------------------------------------------------------------
// evaluateTierEligibility
// ---------------------------------------------------------------------------

describe("evaluateTierEligibility", () => {
  it("returns ADM-1 for perfect benchmarks", () => {
    assert.equal(evaluateTierEligibility(makeBenchmarks()), "ADM-1");
  });

  it("returns ADM-2 when metrics are good but not premier", () => {
    assert.equal(
      evaluateTierEligibility(
        makeBenchmarks({
          "first-pass-quality": 80,
          "enforcement-coverage": 85,
          "knowledge-reuse": 40,
        }),
      ),
      "ADM-2",
    );
  });

  it("returns ADM-3 for moderate metrics", () => {
    assert.equal(
      evaluateTierEligibility(
        makeBenchmarks({
          "first-pass-quality": 65,
          "recovery-success-rate": 72,
          "enforcement-coverage": 65,
          "context-efficiency": 0.16,
          "governance-overhead": 18,
          "coordination-overhead": 16,
          "knowledge-reuse": 28,
        }),
      ),
      "ADM-3",
    );
  });

  it("returns ADM-5 for missing benchmark data", () => {
    const benchmarks: BenchmarkResult[] = [
      {
        benchmarkId: "first-pass-quality",
        value: null,
        status: "insufficient-data",
        source: "none",
      },
    ];
    assert.equal(evaluateTierEligibility(benchmarks), "ADM-5");
  });
});

// ---------------------------------------------------------------------------
// calculateRating
// ---------------------------------------------------------------------------

describe("calculateRating", () => {
  it("produces ADM-1 for perfect inputs", () => {
    const report = calculateRating({
      entity: "admiral-framework",
      category: "platform",
      benchmarks: makeBenchmarks(),
      gateVerdicts: makeAllGatesPassed(),
      flags: { attackCorpusPassRate: 95 },
      certificationSuffix: "",
    });
    assert.equal(report.rating, "ADM-1");
    assert.equal(report.displayRating, "ADM-1");
    assert.equal(report.activeHardCaps.length, 0);
  });

  it("applies certification suffix to display rating", () => {
    const report = calculateRating({
      entity: "test-agent",
      category: "agent",
      benchmarks: makeBenchmarks(),
      gateVerdicts: makeAllGatesPassed(),
      flags: { attackCorpusPassRate: 95 },
      certificationSuffix: "-SA",
    });
    assert.equal(report.displayRating, "ADM-1-SA");
  });

  it("caps at ADM-4 for low first-pass quality", () => {
    // first-pass-quality 45 is below 50% hard cap but above ADM-4 threshold (40)
    const report = calculateRating({
      entity: "test-agent",
      category: "agent",
      benchmarks: makeBenchmarks({ "first-pass-quality": 45 }),
      gateVerdicts: makeAllGatesPassed(),
      flags: { attackCorpusPassRate: 95 },
      certificationSuffix: "-SA",
    });
    assert.equal(report.rating, "ADM-4");
    assert.ok(report.activeHardCaps.length > 0);
    const cap = report.activeHardCaps.find((c) => c.ruleId === "low-first-pass");
    assert.ok(cap, "low-first-pass hard cap should be active");
  });

  it("caps at ADM-3 for identity violation", () => {
    const report = calculateRating({
      entity: "test-agent",
      category: "agent",
      benchmarks: makeBenchmarks(),
      gateVerdicts: makeAllGatesPassed(),
      flags: { identityViolation: true, attackCorpusPassRate: 95 },
      certificationSuffix: "-SA",
    });
    assert.equal(report.rating, "ADM-3");
  });

  it("caps at ADM-4 for multiple HJG failures", () => {
    const report = calculateRating({
      entity: "test-fleet",
      category: "fleet",
      benchmarks: makeBenchmarks(),
      gateVerdicts: makeGatesWithFailures(["HJG-1", "HJG-3"]),
      flags: { attackCorpusPassRate: 95 },
      certificationSuffix: "-IA",
    });
    assert.equal(report.rating, "ADM-4");
  });

  it("demotes when missing attack corpus for ADM-1/2", () => {
    const report = calculateRating({
      entity: "test-platform",
      category: "platform",
      benchmarks: makeBenchmarks(),
      gateVerdicts: makeAllGatesPassed(),
      flags: {},
      certificationSuffix: "-SA",
    });
    // Without attack corpus, cannot be ADM-1 or ADM-2
    assert.ok(
      ["ADM-3", "ADM-4", "ADM-5"].includes(report.rating),
      `Expected ADM-3+ but got ${report.rating}`,
    );
  });

  it("includes conditions and recommendations in report", () => {
    const report = calculateRating({
      entity: "test",
      category: "agent",
      benchmarks: makeBenchmarks({ "first-pass-quality": 30 }),
      gateVerdicts: makeAllGatesPassed(),
      flags: { attackCorpusPassRate: 95 },
      certificationSuffix: "-SA",
    });
    assert.ok(report.conditions.length > 0);
    assert.ok(report.recommendedImprovements.length > 0);
  });

  it("handles no gate verdicts (ADM-5 scenario)", () => {
    const report = calculateRating({
      entity: "ungoverned-agent",
      category: "agent",
      benchmarks: [],
      gateVerdicts: [],
      flags: {},
      certificationSuffix: "-SA",
    });
    assert.equal(report.rating, "ADM-5");
  });

  it("includes all required report fields", () => {
    const report = calculateRating({
      entity: "test",
      category: "platform",
      benchmarks: makeBenchmarks(),
      gateVerdicts: makeAllGatesPassed(),
      flags: { attackCorpusPassRate: 90 },
      certificationSuffix: "-SA",
    });
    assert.equal(report.entity, "test");
    assert.equal(report.category, "platform");
    assert.ok(report.timestamp);
    assert.ok(Array.isArray(report.benchmarks));
    assert.ok(Array.isArray(report.gateVerdicts));
    assert.ok(Array.isArray(report.activeHardCaps));
    assert.equal(typeof report.rationale, "string");
    assert.ok(Array.isArray(report.conditions));
    assert.ok(Array.isArray(report.recommendedImprovements));
  });

  it("is deterministic — same inputs produce same rating", () => {
    const input = {
      entity: "determinism-test",
      category: "agent" as const,
      benchmarks: makeBenchmarks({ "first-pass-quality": 70 }),
      gateVerdicts: makeGatesWithFailures(["HJG-4"]),
      flags: { attackCorpusPassRate: 80 },
      certificationSuffix: "-SA" as const,
    };
    const r1 = calculateRating(input);
    const r2 = calculateRating(input);
    assert.equal(r1.rating, r2.rating);
    assert.equal(r1.displayRating, r2.displayRating);
    assert.equal(r1.activeHardCaps.length, r2.activeHardCaps.length);
    assert.equal(r1.conditions.length, r2.conditions.length);
  });
});

// ---------------------------------------------------------------------------
// formatRatingReport
// ---------------------------------------------------------------------------

describe("formatRatingReport", () => {
  it("produces markdown with required sections", () => {
    const report = calculateRating({
      entity: "admiral-framework",
      category: "platform",
      benchmarks: makeBenchmarks(),
      gateVerdicts: makeAllGatesPassed(),
      flags: { attackCorpusPassRate: 95 },
      certificationSuffix: "-SA",
    });
    const md = formatRatingReport(report);
    assert.ok(md.includes("# Admiral Rating Report"));
    assert.ok(md.includes("**Entity:** admiral-framework"));
    assert.ok(md.includes("## Evidence Summary"));
    assert.ok(md.includes("## Gate Verdicts"));
    assert.ok(md.includes("## Rationale"));
  });

  it("includes hard caps section when caps are active", () => {
    const report = calculateRating({
      entity: "test",
      category: "agent",
      benchmarks: makeBenchmarks({ "first-pass-quality": 30 }),
      gateVerdicts: makeAllGatesPassed(),
      flags: { attackCorpusPassRate: 95 },
      certificationSuffix: "-SA",
    });
    const md = formatRatingReport(report);
    assert.ok(md.includes("## Active Hard Caps"));
  });

  it("shows 'No Human Judgment Gates evaluated' when none given", () => {
    const report = calculateRating({
      entity: "test",
      category: "agent",
      benchmarks: [],
      gateVerdicts: [],
      flags: {},
      certificationSuffix: "-SA",
    });
    const md = formatRatingReport(report);
    assert.ok(md.includes("No Human Judgment Gates evaluated"));
  });
});

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

describe("Validation Helpers", () => {
  it("isValidTier accepts valid tiers", () => {
    assert.equal(isValidTier("ADM-1"), true);
    assert.equal(isValidTier("ADM-5"), true);
    assert.equal(isValidTier("ADM-6"), false);
    assert.equal(isValidTier(""), false);
  });

  it("isValidCategory accepts valid categories", () => {
    assert.equal(isValidCategory("agent"), true);
    assert.equal(isValidCategory("fleet"), true);
    assert.equal(isValidCategory("invalid"), false);
  });

  it("isValidSuffix accepts valid suffixes", () => {
    assert.equal(isValidSuffix("-SA"), true);
    assert.equal(isValidSuffix("-IA"), true);
    assert.equal(isValidSuffix(""), true);
    assert.equal(isValidSuffix("-XX"), false);
  });

  it("getDimensionsForCategory returns correct dimensions", () => {
    assert.equal(getDimensionsForCategory("agent").length, 6);
    assert.equal(getDimensionsForCategory("workflow").length, 5);
  });

  it("getTierDefinition returns definition or undefined", () => {
    assert.ok(getTierDefinition("ADM-1"));
    assert.equal(getTierDefinition("ADM-1")!.grade, "Premier");
  });

  it("compareTiers orders correctly", () => {
    assert.ok(compareTiers("ADM-1", "ADM-5") < 0);
    assert.ok(compareTiers("ADM-5", "ADM-1") > 0);
    assert.equal(compareTiers("ADM-3", "ADM-3"), 0);
  });
});
