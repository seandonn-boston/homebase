/**
 * Tests for trend-analysis (QA-05)
 *
 * Happy path + unhappy path tests for quality trend analysis.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TrendAnalyzer, type TrendReport, type TrendMetricName } from "./trend-analysis";
import type { MetricsSnapshot, ModuleMetrics } from "./quality-metrics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModule(name: string, overrides: Partial<{
  avgComplexity: number;
  maxComplexity: number;
  defectMarkers: number;
  testToCodeRatio: number;
  recentCommits: number;
}>): ModuleMetrics {
  return {
    module: name,
    timestamp: new Date().toISOString(),
    complexity: {
      avgCyclomaticComplexity: overrides.avgComplexity ?? 5,
      maxCyclomaticComplexity: overrides.maxComplexity ?? 8,
      functionCount: 3,
      highComplexityFunctions: 0,
    },
    testCoverage: { hasTestFile: true, testFileLines: 50, sourceFileLines: 100 },
    codeChurn: { recentCommits: overrides.recentCommits ?? 3, linesAdded: 50, linesDeleted: 10 },
    defectDensity: { todoCount: overrides.defectMarkers ?? 0, fixmeCount: 0, hackCount: 0, totalMarkers: overrides.defectMarkers ?? 0, markersPerHundredLines: 0 },
    lintViolations: { violations: 0 },
    testToCodeRatio: { ratio: overrides.testToCodeRatio ?? 0.5, testLines: 50, sourceLines: 100 },
  };
}

function makeSnapshot(modules: ModuleMetrics[]): MetricsSnapshot {
  return {
    timestamp: new Date().toISOString(),
    rootDir: "/test",
    modules,
    summary: { totalModules: modules.length, avgComplexity: 0, totalDefectMarkers: 0, modulesWithTests: 0, modulesWithoutTests: 0, avgTestToCodeRatio: 0 },
  };
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("TrendAnalyzer construction", () => {
  it("creates analyzer with default options", () => {
    const analyzer = new TrendAnalyzer();
    assert.ok(analyzer);
  });

  it("accepts custom options", () => {
    const analyzer = new TrendAnalyzer({
      minConsecutiveDecline: 5,
      minMagnitude: 0.2,
      thresholds: { avgComplexity: { warn: 8, critical: 12 } },
    });
    assert.ok(analyzer);
  });
});

// ---------------------------------------------------------------------------
// Empty / minimal inputs
// ---------------------------------------------------------------------------

describe("analyze — edge cases", () => {
  it("handles empty snapshot list", () => {
    const analyzer = new TrendAnalyzer();
    const report = analyzer.analyze([]);
    assert.equal(report.alerts.length, 0);
    assert.equal(report.averages.length, 0);
    assert.equal(report.summary.totalModules, 0);
  });

  it("handles single snapshot (no trend possible)", () => {
    const analyzer = new TrendAnalyzer();
    const report = analyzer.analyze([
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 5 })]),
    ]);
    assert.equal(report.alerts.length, 0);
    assert.ok(report.averages.length > 0);
  });

  it("handles two snapshots (not enough for default 3-period trend)", () => {
    const analyzer = new TrendAnalyzer();
    const report = analyzer.analyze([
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 5 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 6 })]),
    ]);
    assert.equal(report.alerts.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Declining trend detection
// ---------------------------------------------------------------------------

describe("analyze — declining trends", () => {
  it("detects declining complexity (3 consecutive increases)", () => {
    const analyzer = new TrendAnalyzer({ minConsecutiveDecline: 3 });
    const snapshots = [
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 5 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 6 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 7 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 8 })]),
    ];
    const report = analyzer.analyze(snapshots);

    const complexityAlerts = report.alerts.filter(
      (a) => a.metric === "avgComplexity" && a.direction === "declining",
    );
    assert.ok(complexityAlerts.length > 0, "Should detect declining complexity");
    assert.equal(complexityAlerts[0].consecutivePeriods, 3);
    assert.equal(complexityAlerts[0].currentValue, 8);
  });

  it("detects declining test-to-code ratio (decrease = worse)", () => {
    const analyzer = new TrendAnalyzer({ minConsecutiveDecline: 3 });
    const snapshots = [
      makeSnapshot([makeModule("mod.ts", { testToCodeRatio: 0.8 })]),
      makeSnapshot([makeModule("mod.ts", { testToCodeRatio: 0.6 })]),
      makeSnapshot([makeModule("mod.ts", { testToCodeRatio: 0.4 })]),
      makeSnapshot([makeModule("mod.ts", { testToCodeRatio: 0.2 })]),
    ];
    const report = analyzer.analyze(snapshots);

    const ratioAlerts = report.alerts.filter(
      (a) => a.metric === "testToCodeRatio" && a.direction === "declining",
    );
    assert.ok(ratioAlerts.length > 0, "Should detect declining test ratio");
  });

  it("detects increasing defect markers as declining", () => {
    const analyzer = new TrendAnalyzer({ minConsecutiveDecline: 3, minMagnitude: 0.05 });
    const snapshots = [
      makeSnapshot([makeModule("mod.ts", { defectMarkers: 1 })]),
      makeSnapshot([makeModule("mod.ts", { defectMarkers: 2 })]),
      makeSnapshot([makeModule("mod.ts", { defectMarkers: 3 })]),
      makeSnapshot([makeModule("mod.ts", { defectMarkers: 4 })]),
    ];
    const report = analyzer.analyze(snapshots);

    const defectAlerts = report.alerts.filter(
      (a) => a.metric === "defectMarkers" && a.direction === "declining",
    );
    assert.ok(defectAlerts.length > 0, "Should detect increasing defect markers as decline");
  });

  it("does not alert when trend is too short", () => {
    const analyzer = new TrendAnalyzer({ minConsecutiveDecline: 5 });
    const snapshots = [
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 5 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 6 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 7 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 8 })]),
    ];
    const report = analyzer.analyze(snapshots);

    const complexityAlerts = report.alerts.filter(
      (a) => a.metric === "avgComplexity" && a.direction === "declining",
    );
    assert.equal(complexityAlerts.length, 0);
  });

  it("does not alert when magnitude is below threshold", () => {
    const analyzer = new TrendAnalyzer({ minConsecutiveDecline: 3, minMagnitude: 0.5 });
    const snapshots = [
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 10 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 10.1 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 10.2 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 10.3 })]),
    ];
    const report = analyzer.analyze(snapshots);

    const complexityAlerts = report.alerts.filter(
      (a) => a.metric === "avgComplexity" && a.direction === "declining",
    );
    assert.equal(complexityAlerts.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Improving trend detection
// ---------------------------------------------------------------------------

describe("analyze — improving trends", () => {
  it("detects improving complexity (3 consecutive decreases)", () => {
    const analyzer = new TrendAnalyzer({ minConsecutiveDecline: 3 });
    const snapshots = [
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 12 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 10 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 8 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 6 })]),
    ];
    const report = analyzer.analyze(snapshots);

    const improvingAlerts = report.alerts.filter(
      (a) => a.metric === "avgComplexity" && a.direction === "improving",
    );
    assert.ok(improvingAlerts.length > 0, "Should detect improving complexity");
  });

  it("detects improving test ratio (3 consecutive increases)", () => {
    const analyzer = new TrendAnalyzer({ minConsecutiveDecline: 3 });
    const snapshots = [
      makeSnapshot([makeModule("mod.ts", { testToCodeRatio: 0.2 })]),
      makeSnapshot([makeModule("mod.ts", { testToCodeRatio: 0.4 })]),
      makeSnapshot([makeModule("mod.ts", { testToCodeRatio: 0.6 })]),
      makeSnapshot([makeModule("mod.ts", { testToCodeRatio: 0.8 })]),
    ];
    const report = analyzer.analyze(snapshots);

    const improvingAlerts = report.alerts.filter(
      (a) => a.metric === "testToCodeRatio" && a.direction === "improving",
    );
    assert.ok(improvingAlerts.length > 0);
  });
});

// ---------------------------------------------------------------------------
// Moving averages
// ---------------------------------------------------------------------------

describe("analyze — moving averages", () => {
  it("computes 7-day average when enough data", () => {
    const analyzer = new TrendAnalyzer();
    const snapshots: MetricsSnapshot[] = [];
    for (let i = 0; i < 10; i++) {
      snapshots.push(makeSnapshot([makeModule("mod.ts", { avgComplexity: 5 + i })]));
    }
    const report = analyzer.analyze(snapshots);

    const avg = report.averages.find((a) => a.module === "mod.ts" && a.metric === "avgComplexity");
    assert.ok(avg);
    assert.notEqual(avg.avg7, null);
    assert.ok(typeof avg.avg7 === "number");
  });

  it("returns null for 7-day average with less than 7 data points", () => {
    const analyzer = new TrendAnalyzer();
    const snapshots = [
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 5 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 6 })]),
    ];
    const report = analyzer.analyze(snapshots);

    const avg = report.averages.find((a) => a.module === "mod.ts" && a.metric === "avgComplexity");
    assert.ok(avg);
    assert.equal(avg.avg7, null);
  });

  it("computes 30-day average when enough data", () => {
    const analyzer = new TrendAnalyzer();
    const snapshots: MetricsSnapshot[] = [];
    for (let i = 0; i < 35; i++) {
      snapshots.push(makeSnapshot([makeModule("mod.ts", { avgComplexity: 5 })]));
    }
    const report = analyzer.analyze(snapshots);

    const avg = report.averages.find((a) => a.module === "mod.ts" && a.metric === "avgComplexity");
    assert.ok(avg);
    assert.notEqual(avg.avg30, null);
    assert.equal(avg.avg30, 5);
  });

  it("preserves raw values in averages", () => {
    const analyzer = new TrendAnalyzer();
    const snapshots = [
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 3 })]),
      makeSnapshot([makeModule("mod.ts", { avgComplexity: 7 })]),
    ];
    const report = analyzer.analyze(snapshots);

    const avg = report.averages.find((a) => a.module === "mod.ts" && a.metric === "avgComplexity");
    assert.ok(avg);
    assert.deepEqual(avg.values, [3, 7]);
    assert.equal(avg.latest, 7);
  });
});

// ---------------------------------------------------------------------------
// Multi-module tracking
// ---------------------------------------------------------------------------

describe("analyze — multiple modules", () => {
  it("tracks trends per module independently", () => {
    const analyzer = new TrendAnalyzer({ minConsecutiveDecline: 3 });
    const snapshots = [
      makeSnapshot([
        makeModule("a.ts", { avgComplexity: 5 }),
        makeModule("b.ts", { avgComplexity: 10 }),
      ]),
      makeSnapshot([
        makeModule("a.ts", { avgComplexity: 6 }),
        makeModule("b.ts", { avgComplexity: 9 }),
      ]),
      makeSnapshot([
        makeModule("a.ts", { avgComplexity: 7 }),
        makeModule("b.ts", { avgComplexity: 8 }),
      ]),
      makeSnapshot([
        makeModule("a.ts", { avgComplexity: 8 }),
        makeModule("b.ts", { avgComplexity: 7 }),
      ]),
    ];
    const report = analyzer.analyze(snapshots);

    // a.ts complexity is declining (increasing), b.ts is improving (decreasing)
    const aDecline = report.alerts.find(
      (a) => a.module === "a.ts" && a.metric === "avgComplexity" && a.direction === "declining",
    );
    const bImprove = report.alerts.find(
      (a) => a.module === "b.ts" && a.metric === "avgComplexity" && a.direction === "improving",
    );
    assert.ok(aDecline, "a.ts should show declining complexity");
    assert.ok(bImprove, "b.ts should show improving complexity");
  });

  it("summary counts modules correctly", () => {
    const analyzer = new TrendAnalyzer();
    const snapshots = [
      makeSnapshot([makeModule("a.ts", {}), makeModule("b.ts", {}), makeModule("c.ts", {})]),
    ];
    const report = analyzer.analyze(snapshots);
    assert.equal(report.summary.totalModules, 3);
  });
});

// ---------------------------------------------------------------------------
// Alert messages
// ---------------------------------------------------------------------------

describe("alert messages", () => {
  it("alert includes module name, metric, and values", () => {
    const analyzer = new TrendAnalyzer({ minConsecutiveDecline: 3 });
    const snapshots = [
      makeSnapshot([makeModule("engine.ts", { avgComplexity: 5 })]),
      makeSnapshot([makeModule("engine.ts", { avgComplexity: 7 })]),
      makeSnapshot([makeModule("engine.ts", { avgComplexity: 9 })]),
      makeSnapshot([makeModule("engine.ts", { avgComplexity: 11 })]),
    ];
    const report = analyzer.analyze(snapshots);
    const alert = report.alerts.find((a) => a.module === "engine.ts" && a.direction === "declining");

    assert.ok(alert);
    assert.ok(alert.message.includes("engine.ts"));
    assert.ok(alert.message.includes("avgComplexity"));
    assert.ok(alert.magnitude > 0);
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("Formatters", () => {
  it("formatReport produces readable text", () => {
    const report: TrendReport = {
      timestamp: "2026-03-27T00:00:00Z",
      alerts: [
        {
          module: "mod.ts",
          metric: "avgComplexity",
          direction: "declining",
          magnitude: 0.5,
          currentValue: 15,
          previousValue: 10,
          consecutivePeriods: 3,
          message: "mod.ts: avgComplexity declining for 3 periods (10 → 15, 50% change)",
        },
      ],
      averages: [],
      summary: { totalModules: 1, decliningMetrics: 1, improvingMetrics: 0, stableMetrics: 4, criticalAlerts: 1 },
    };

    const text = TrendAnalyzer.formatReport(report);
    assert.ok(text.includes("QUALITY TREND ANALYSIS"));
    assert.ok(text.includes("[WARN]"));
    assert.ok(text.includes("mod.ts"));
  });

  it("formatReport handles no alerts", () => {
    const report: TrendReport = {
      timestamp: "2026-03-27T00:00:00Z",
      alerts: [],
      averages: [],
      summary: { totalModules: 0, decliningMetrics: 0, improvingMetrics: 0, stableMetrics: 0, criticalAlerts: 0 },
    };

    const text = TrendAnalyzer.formatReport(report);
    assert.ok(text.includes("No trend alerts"));
  });

  it("formatReportJSON produces valid JSON", () => {
    const report: TrendReport = {
      timestamp: "2026-03-27T00:00:00Z",
      alerts: [],
      averages: [],
      summary: { totalModules: 0, decliningMetrics: 0, improvingMetrics: 0, stableMetrics: 0, criticalAlerts: 0 },
    };

    const json = TrendAnalyzer.formatReportJSON(report);
    const parsed = JSON.parse(json);
    assert.equal(parsed.summary.totalModules, 0);
  });
});

// ---------------------------------------------------------------------------
// Structure validation
// ---------------------------------------------------------------------------

describe("Report structure", () => {
  it("report has all required fields", () => {
    const analyzer = new TrendAnalyzer();
    const report = analyzer.analyze([
      makeSnapshot([makeModule("mod.ts", {})]),
    ]);

    assert.ok("timestamp" in report);
    assert.ok("alerts" in report);
    assert.ok("averages" in report);
    assert.ok("summary" in report);
    assert.ok(Array.isArray(report.alerts));
    assert.ok(Array.isArray(report.averages));
    assert.ok("totalModules" in report.summary);
    assert.ok("decliningMetrics" in report.summary);
    assert.ok("improvingMetrics" in report.summary);
    assert.ok("stableMetrics" in report.summary);
    assert.ok("criticalAlerts" in report.summary);
  });
});
