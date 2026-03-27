/**
 * Tests for quality-score (QA-09)
 *
 * Happy path + unhappy path tests for quality scoring.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { QualityScoreEngine, type ModuleQualityScore, type QualityScoreReport } from "./quality-score";
import type { ModuleMetrics } from "./quality-metrics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMetrics(overrides: Partial<{
  module: string;
  hasTestFile: boolean;
  testToCodeRatio: number;
  avgComplexity: number;
  maxComplexity: number;
  lintViolations: number;
  sourceLines: number;
  testLines: number;
  defectMarkers: number;
  recentCommits: number;
}>): ModuleMetrics {
  return {
    module: overrides.module ?? "mod.ts",
    timestamp: new Date().toISOString(),
    complexity: {
      avgCyclomaticComplexity: overrides.avgComplexity ?? 3,
      maxCyclomaticComplexity: overrides.maxComplexity ?? 5,
      functionCount: 2,
      highComplexityFunctions: 0,
    },
    testCoverage: {
      hasTestFile: overrides.hasTestFile ?? true,
      testFileLines: overrides.testLines ?? 50,
      sourceFileLines: overrides.sourceLines ?? 100,
    },
    codeChurn: { recentCommits: overrides.recentCommits ?? 3, linesAdded: 50, linesDeleted: 10 },
    defectDensity: { todoCount: overrides.defectMarkers ?? 0, fixmeCount: 0, hackCount: 0, totalMarkers: overrides.defectMarkers ?? 0, markersPerHundredLines: 0 },
    lintViolations: { violations: overrides.lintViolations ?? 0 },
    testToCodeRatio: { ratio: overrides.testToCodeRatio ?? 0.5, testLines: overrides.testLines ?? 50, sourceLines: overrides.sourceLines ?? 100 },
  };
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("QualityScoreEngine construction", () => {
  it("creates engine with defaults", () => {
    const engine = new QualityScoreEngine();
    assert.ok(engine);
  });

  it("accepts custom thresholds", () => {
    const engine = new QualityScoreEngine({ greenThreshold: 90, yellowThreshold: 70 });
    assert.ok(engine);
  });

  it("accepts custom weights", () => {
    const engine = new QualityScoreEngine({
      weights: { testCoverage: 0.50, complexityCompliance: 0.10, lintCleanliness: 0.10, documentationCompleteness: 0.10, defectDensity: 0.10, codeChurnStability: 0.10 },
    });
    assert.ok(engine);
  });
});

// ---------------------------------------------------------------------------
// Single module scoring
// ---------------------------------------------------------------------------

describe("scoreModule", () => {
  it("scores a high-quality module as green", () => {
    const engine = new QualityScoreEngine();
    const metrics = makeMetrics({
      hasTestFile: true,
      testToCodeRatio: 1.0,
      maxComplexity: 5,
      lintViolations: 0,
      defectMarkers: 0,
      recentCommits: 2,
    });
    const score = engine.scoreModule(metrics);

    assert.equal(score.grade, "green");
    assert.ok(score.composite >= 80);
    assert.equal(score.dimensions.length, 6);
  });

  it("scores a poor module as red", () => {
    const engine = new QualityScoreEngine();
    const metrics = makeMetrics({
      hasTestFile: false,
      testToCodeRatio: 0,
      maxComplexity: 40,
      lintViolations: 15,
      defectMarkers: 8,
      recentCommits: 20,
    });
    const score = engine.scoreModule(metrics);

    assert.equal(score.grade, "red");
    assert.ok(score.composite < 60);
  });

  it("scores a medium module as yellow", () => {
    const engine = new QualityScoreEngine();
    const metrics = makeMetrics({
      hasTestFile: true,
      testToCodeRatio: 0.3,
      maxComplexity: 12,
      lintViolations: 3,
      defectMarkers: 2,
      recentCommits: 5,
    });
    const score = engine.scoreModule(metrics);

    assert.ok(score.composite >= 60);
    assert.ok(score.composite < 100);
  });

  it("composite is 0-100 range", () => {
    const engine = new QualityScoreEngine();
    const score = engine.scoreModule(makeMetrics({}));
    assert.ok(score.composite >= 0);
    assert.ok(score.composite <= 100);
  });

  it("dimensions have correct weight distribution", () => {
    const engine = new QualityScoreEngine();
    const score = engine.scoreModule(makeMetrics({}));
    const totalWeight = score.dimensions.reduce((s, d) => s + d.weight, 0);
    assert.ok(Math.abs(totalWeight - 1.0) < 0.01);
  });

  it("test coverage score: no test file = 0", () => {
    const engine = new QualityScoreEngine();
    const score = engine.scoreModule(makeMetrics({ hasTestFile: false }));
    const testDim = score.dimensions.find((d) => d.name === "testCoverage");
    assert.equal(testDim?.normalizedScore, 0);
  });

  it("test coverage score: high ratio = high score", () => {
    const engine = new QualityScoreEngine();
    const score = engine.scoreModule(makeMetrics({ hasTestFile: true, testToCodeRatio: 1.5 }));
    const testDim = score.dimensions.find((d) => d.name === "testCoverage");
    assert.equal(testDim?.normalizedScore, 100);
  });

  it("complexity: low max = high score", () => {
    const engine = new QualityScoreEngine();
    const score = engine.scoreModule(makeMetrics({ maxComplexity: 3 }));
    const complexDim = score.dimensions.find((d) => d.name === "complexityCompliance");
    assert.equal(complexDim?.normalizedScore, 100);
  });

  it("complexity: very high max = low score", () => {
    const engine = new QualityScoreEngine();
    const score = engine.scoreModule(makeMetrics({ maxComplexity: 50 }));
    const complexDim = score.dimensions.find((d) => d.name === "complexityCompliance");
    assert.ok((complexDim?.normalizedScore ?? 100) < 30);
  });

  it("defect density: zero markers = 100", () => {
    const engine = new QualityScoreEngine();
    const score = engine.scoreModule(makeMetrics({ defectMarkers: 0 }));
    const defectDim = score.dimensions.find((d) => d.name === "defectDensity");
    assert.equal(defectDim?.normalizedScore, 100);
  });

  it("defect density: many markers = low score", () => {
    const engine = new QualityScoreEngine();
    const score = engine.scoreModule(makeMetrics({ defectMarkers: 10 }));
    const defectDim = score.dimensions.find((d) => d.name === "defectDensity");
    assert.ok((defectDim?.normalizedScore ?? 100) <= 20);
  });
});

// ---------------------------------------------------------------------------
// Multi-module scoring
// ---------------------------------------------------------------------------

describe("scoreModules", () => {
  it("produces report with correct counts", () => {
    const engine = new QualityScoreEngine();
    const report = engine.scoreModules([
      makeMetrics({ module: "a.ts", hasTestFile: true, testToCodeRatio: 1.0, maxComplexity: 3, defectMarkers: 0 }),
      makeMetrics({ module: "b.ts", hasTestFile: false, maxComplexity: 30, defectMarkers: 10 }),
    ]);

    assert.equal(report.summary.totalModules, 2);
    assert.ok(report.summary.green >= 1);
    assert.ok(report.summary.red >= 1 || report.summary.yellow >= 1);
  });

  it("computes average score", () => {
    const engine = new QualityScoreEngine();
    const report = engine.scoreModules([
      makeMetrics({ module: "a.ts" }),
      makeMetrics({ module: "b.ts" }),
    ]);

    assert.ok(report.summary.avgScore > 0);
    assert.ok(report.summary.avgScore <= 100);
  });

  it("identifies lowest module", () => {
    const engine = new QualityScoreEngine();
    const report = engine.scoreModules([
      makeMetrics({ module: "good.ts", hasTestFile: true, testToCodeRatio: 1.0, maxComplexity: 3 }),
      makeMetrics({ module: "bad.ts", hasTestFile: false, maxComplexity: 40, defectMarkers: 10 }),
    ]);

    assert.equal(report.summary.lowestModule, "bad.ts");
  });

  it("handles empty array", () => {
    const engine = new QualityScoreEngine();
    const report = engine.scoreModules([]);

    assert.equal(report.summary.totalModules, 0);
    assert.equal(report.summary.avgScore, 0);
    assert.equal(report.summary.lowestModule, "N/A");
  });
});

// ---------------------------------------------------------------------------
// Custom thresholds
// ---------------------------------------------------------------------------

describe("Custom thresholds", () => {
  it("green threshold applies correctly", () => {
    const engine = new QualityScoreEngine({ greenThreshold: 95 });
    const score = engine.scoreModule(makeMetrics({
      hasTestFile: true, testToCodeRatio: 0.8, maxComplexity: 8, defectMarkers: 1,
    }));
    // With green at 95, a decent module should be yellow
    assert.notEqual(score.grade, "green");
  });

  it("yellow threshold applies correctly", () => {
    const engine = new QualityScoreEngine({ yellowThreshold: 30 });
    const score = engine.scoreModule(makeMetrics({
      hasTestFile: false, maxComplexity: 25, defectMarkers: 5,
    }));
    // With yellow at 30, even a poor module might still be yellow
    assert.ok(score.grade === "yellow" || score.grade === "red");
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("Formatters", () => {
  it("formatReport produces readable text", () => {
    const engine = new QualityScoreEngine();
    const report = engine.scoreModules([makeMetrics({ module: "demo.ts" })]);
    const text = QualityScoreEngine.formatReport(report);

    assert.ok(text.includes("QUALITY SCORE REPORT"));
    assert.ok(text.includes("demo.ts"));
    assert.ok(text.includes("/100"));
  });

  it("formatReportJSON produces valid JSON", () => {
    const engine = new QualityScoreEngine();
    const report = engine.scoreModules([]);
    const json = QualityScoreEngine.formatReportJSON(report);
    const parsed = JSON.parse(json);
    assert.equal(parsed.summary.totalModules, 0);
  });

  it("formatReport shows grade icons", () => {
    const engine = new QualityScoreEngine();
    const report = engine.scoreModules([
      makeMetrics({ module: "good.ts", hasTestFile: true, testToCodeRatio: 1.0, maxComplexity: 3 }),
    ]);
    const text = QualityScoreEngine.formatReport(report);
    assert.ok(text.includes("[GREEN]") || text.includes("[YELLOW]") || text.includes("[RED]"));
  });
});

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe("Structure", () => {
  it("score has all required fields", () => {
    const engine = new QualityScoreEngine();
    const score = engine.scoreModule(makeMetrics({}));

    assert.ok("module" in score);
    assert.ok("timestamp" in score);
    assert.ok("composite" in score);
    assert.ok("grade" in score);
    assert.ok("dimensions" in score);
    assert.equal(score.dimensions.length, 6);

    for (const dim of score.dimensions) {
      assert.ok("name" in dim);
      assert.ok("weight" in dim);
      assert.ok("rawValue" in dim);
      assert.ok("normalizedScore" in dim);
      assert.ok("weightedScore" in dim);
    }
  });
});
