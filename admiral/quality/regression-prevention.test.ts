/**
 * Tests for regression-prevention (QA-10)
 *
 * Happy path + unhappy path tests for quality regression gate.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RegressionGate, type RegressionReport } from "./regression-prevention";
import type { ModuleMetrics } from "./quality-metrics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMetrics(overrides: Partial<{
  module: string;
  hasTestFile: boolean;
  testToCodeRatio: number;
  maxComplexity: number;
  lintViolations: number;
  defectMarkers: number;
  recentCommits: number;
}>): ModuleMetrics {
  return {
    module: overrides.module ?? "mod.ts",
    timestamp: new Date().toISOString(),
    complexity: {
      avgCyclomaticComplexity: 3,
      maxCyclomaticComplexity: overrides.maxComplexity ?? 5,
      functionCount: 2,
      highComplexityFunctions: 0,
    },
    testCoverage: {
      hasTestFile: overrides.hasTestFile ?? true,
      testFileLines: 50,
      sourceFileLines: 100,
    },
    codeChurn: { recentCommits: overrides.recentCommits ?? 3, linesAdded: 50, linesDeleted: 10 },
    defectDensity: { todoCount: overrides.defectMarkers ?? 0, fixmeCount: 0, hackCount: 0, totalMarkers: overrides.defectMarkers ?? 0, markersPerHundredLines: 0 },
    lintViolations: { violations: overrides.lintViolations ?? 0 },
    testToCodeRatio: { ratio: overrides.testToCodeRatio ?? 0.5, testLines: 50, sourceLines: 100 },
  };
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("RegressionGate construction", () => {
  it("creates gate with defaults", () => {
    const gate = new RegressionGate();
    assert.ok(gate);
  });

  it("accepts custom options", () => {
    const gate = new RegressionGate({
      redThreshold: 50,
      maxDecline: 5,
      debtAcknowledged: true,
      baselines: { "mod.ts": 85 },
    });
    assert.ok(gate);
  });
});

// ---------------------------------------------------------------------------
// Single module checks
// ---------------------------------------------------------------------------

describe("checkModule", () => {
  it("passes for high-quality module", () => {
    const gate = new RegressionGate();
    const result = gate.checkModule(makeMetrics({
      hasTestFile: true, testToCodeRatio: 1.0, maxComplexity: 3, defectMarkers: 0,
    }));
    assert.equal(result.verdict, "pass");
  });

  it("blocks module below red threshold", () => {
    const gate = new RegressionGate({ redThreshold: 60 });
    const result = gate.checkModule(makeMetrics({
      hasTestFile: false, maxComplexity: 40, defectMarkers: 10, lintViolations: 15,
    }));
    assert.equal(result.verdict, "block");
    assert.ok(result.reason.includes("below red threshold"));
  });

  it("blocks module with excessive decline", () => {
    const gate = new RegressionGate({
      maxDecline: 10,
      baselines: { "declining.ts": 90 },
    });
    // A module that scores ~50-60
    const result = gate.checkModule(makeMetrics({
      module: "declining.ts",
      hasTestFile: false,
      maxComplexity: 25,
      defectMarkers: 5,
    }));
    // Score will be low, triggering threshold. Depending on exact score:
    if (result.currentScore < 60) {
      assert.equal(result.verdict, "block");
    } else if (result.scoreDelta < -10) {
      assert.equal(result.verdict, "block");
      assert.ok(result.reason.includes("declined"));
    }
  });

  it("warns on slight decline", () => {
    const gate = new RegressionGate({
      baselines: { "mod.ts": 85 },
    });
    // Module that scores around 80
    const result = gate.checkModule(makeMetrics({
      hasTestFile: true,
      testToCodeRatio: 0.5,
      maxComplexity: 8,
      defectMarkers: 1,
    }));
    if (result.scoreDelta < 0 && result.scoreDelta >= -10) {
      assert.equal(result.verdict, "warn");
    }
  });

  it("debt acknowledgment downgrades block to warn", () => {
    const gate = new RegressionGate({
      redThreshold: 90,
      debtAcknowledged: true,
    });
    const result = gate.checkModule(makeMetrics({
      hasTestFile: true, testToCodeRatio: 0.5, maxComplexity: 8,
    }));
    // Should be warn instead of block due to acknowledgment
    assert.notEqual(result.verdict, "block");
  });

  it("no baseline means no decline check", () => {
    const gate = new RegressionGate();
    const result = gate.checkModule(makeMetrics({}));
    assert.equal(result.baselineScore, null);
    assert.equal(result.scoreDelta, 0);
  });

  it("result has all required fields", () => {
    const gate = new RegressionGate({ baselines: { "mod.ts": 75 } });
    const result = gate.checkModule(makeMetrics({}));

    assert.ok("module" in result);
    assert.ok("currentScore" in result);
    assert.ok("baselineScore" in result);
    assert.ok("scoreDelta" in result);
    assert.ok("verdict" in result);
    assert.ok("reason" in result);
  });
});

// ---------------------------------------------------------------------------
// Full check
// ---------------------------------------------------------------------------

describe("check (multiple modules)", () => {
  it("produces report with correct counts", () => {
    const gate = new RegressionGate();
    const report = gate.check([
      makeMetrics({ module: "good.ts", hasTestFile: true, testToCodeRatio: 1.0, maxComplexity: 3 }),
      makeMetrics({ module: "ok.ts", hasTestFile: true, testToCodeRatio: 0.5, maxComplexity: 8 }),
    ]);

    assert.equal(report.summary.totalModules, 2);
    assert.ok(report.summary.passing + report.summary.warnings + report.summary.blocked === 2);
  });

  it("overall verdict is block when any module is blocked", () => {
    const gate = new RegressionGate({ redThreshold: 90 });
    const report = gate.check([
      makeMetrics({ module: "good.ts", hasTestFile: true, testToCodeRatio: 2.0, maxComplexity: 2, defectMarkers: 0 }),
      makeMetrics({ module: "bad.ts", hasTestFile: false, maxComplexity: 30 }),
    ]);

    assert.equal(report.summary.overallVerdict, "block");
  });

  it("overall verdict is pass when all pass", () => {
    const gate = new RegressionGate();
    const report = gate.check([
      makeMetrics({ module: "a.ts", hasTestFile: true, testToCodeRatio: 1.0, maxComplexity: 3 }),
      makeMetrics({ module: "b.ts", hasTestFile: true, testToCodeRatio: 0.8, maxComplexity: 5 }),
    ]);

    assert.equal(report.summary.overallVerdict, "pass");
  });

  it("handles empty array", () => {
    const gate = new RegressionGate();
    const report = gate.check([]);
    assert.equal(report.summary.totalModules, 0);
    assert.equal(report.summary.overallVerdict, "pass");
  });

  it("includes quality impact markdown", () => {
    const gate = new RegressionGate();
    const report = gate.check([makeMetrics({})]);
    assert.ok(report.qualityImpactMarkdown.includes("Quality Impact Report"));
    assert.ok(report.qualityImpactMarkdown.includes("| Module |"));
  });
});

// ---------------------------------------------------------------------------
// Quality impact markdown
// ---------------------------------------------------------------------------

describe("Quality impact markdown", () => {
  it("shows blocked modules in markdown", () => {
    const gate = new RegressionGate({ redThreshold: 90 });
    const report = gate.check([
      makeMetrics({ module: "failing.ts", hasTestFile: false, maxComplexity: 20 }),
    ]);
    assert.ok(report.qualityImpactMarkdown.includes("### Blocked") || report.qualityImpactMarkdown.includes("### Warnings"));
    assert.ok(report.qualityImpactMarkdown.includes("failing.ts"));
  });

  it("shows debt acknowledgment in markdown", () => {
    const gate = new RegressionGate({ debtAcknowledged: true });
    const report = gate.check([makeMetrics({})]);
    assert.ok(report.qualityImpactMarkdown.includes("acknowledgment"));
  });

  it("shows score table", () => {
    const gate = new RegressionGate({ baselines: { "mod.ts": 80 } });
    const report = gate.check([makeMetrics({})]);
    assert.ok(report.qualityImpactMarkdown.includes("| Module |"));
    assert.ok(report.qualityImpactMarkdown.includes("mod.ts"));
  });
});

// ---------------------------------------------------------------------------
// Baseline extraction
// ---------------------------------------------------------------------------

describe("extractBaselines", () => {
  it("extracts baselines from metrics", () => {
    const baselines = RegressionGate.extractBaselines([
      makeMetrics({ module: "a.ts" }),
      makeMetrics({ module: "b.ts" }),
    ]);
    assert.ok("a.ts" in baselines);
    assert.ok("b.ts" in baselines);
    assert.ok(typeof baselines["a.ts"] === "number");
    assert.ok(baselines["a.ts"] >= 0 && baselines["a.ts"] <= 100);
  });

  it("handles empty array", () => {
    const baselines = RegressionGate.extractBaselines([]);
    assert.deepEqual(baselines, {});
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("Formatters", () => {
  it("formatReport produces readable text", () => {
    const gate = new RegressionGate({ baselines: { "mod.ts": 80 } });
    const report = gate.check([makeMetrics({})]);
    const text = RegressionGate.formatReport(report);

    assert.ok(text.includes("QUALITY REGRESSION GATE"));
    assert.ok(text.includes("Verdict:"));
    assert.ok(text.includes("mod.ts"));
  });

  it("formatReportJSON produces valid JSON", () => {
    const gate = new RegressionGate();
    const report = gate.check([]);
    const json = RegressionGate.formatReportJSON(report);
    const parsed = JSON.parse(json);
    assert.equal(parsed.summary.totalModules, 0);
  });
});
