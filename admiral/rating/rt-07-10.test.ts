/**
 * Tests for RT-07 (Module Rating), RT-08 (Benchmarks),
 * RT-09 (Dashboard), RT-10 (Alerts)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

import { calculateModuleRatings, formatModuleRatings } from "./module-rating";
import { compareAgainstBenchmarks, formatBenchmarkComparison, PRISTINE_REPO_BENCHMARKS, INDUSTRY_AVERAGES, SPEC_TARGETS } from "./benchmark-comparison";
import { buildDashboard, formatDashboard } from "./rating-dashboard";
import { evaluateAlerts, formatAlerts, type RatingAlert } from "./rating-alerts";
import type { RatingReport, RatingTier } from "./rating-model";
import type { HistoryEntry, TrendSummary } from "./history-tracker";

const PROJECT_ROOT = join(__dirname, "../..");

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
      { benchmarkId: "first-pass-quality", value: 65, status: "measured", source: "test" },
      { benchmarkId: "recovery-success-rate", value: 70, status: "measured", source: "test" },
      { benchmarkId: "enforcement-coverage", value: 56, status: "measured", source: "test" },
      { benchmarkId: "context-efficiency", value: 0.2, status: "measured", source: "test" },
      { benchmarkId: "governance-overhead", value: 12, status: "measured", source: "test" },
      { benchmarkId: "coordination-overhead", value: 8, status: "measured", source: "test" },
      { benchmarkId: "knowledge-reuse", value: 30, status: "measured", source: "test" },
    ],
    gateVerdicts: [],
    activeHardCaps: [],
    rationale: "test",
    conditions: [],
    recommendedImprovements: [],
    ...overrides,
  };
}

function makeEntry(rating: RatingTier, daysAgo: number): HistoryEntry {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    timestamp: date.toISOString(),
    commitSha: "abc" + daysAgo,
    commitMessage: `test commit ${daysAgo}`,
    rating,
    displayRating: `${rating}-SA`,
    benchmarks: {
      "first-pass-quality": 65,
      "recovery-success-rate": 70,
      "enforcement-coverage": 56,
      "context-efficiency": 0.2,
      "governance-overhead": 12,
      "coordination-overhead": 8,
      "knowledge-reuse": 30,
    },
    activeHardCaps: 0,
    gatesEvaluated: 0,
    gatesPassed: 0,
  };
}

// ---------------------------------------------------------------------------
// RT-07: Module Ratings
// ---------------------------------------------------------------------------

describe("RT-07: Module Ratings", () => {
  it("discovers and rates modules", () => {
    const report = calculateModuleRatings(PROJECT_ROOT);
    assert.ok(report.modules.length > 0);
    assert.ok(report.timestamp);
  });

  it("identifies critical modules and computes project cap", () => {
    const report = calculateModuleRatings(PROJECT_ROOT);
    const critical = report.modules.filter((m) => m.criticality === "critical");
    assert.ok(critical.length > 0);
  });

  it("formats as markdown table", () => {
    const report = calculateModuleRatings(PROJECT_ROOT);
    const md = formatModuleRatings(report);
    assert.ok(md.includes("Per-Module Rating Report"));
    assert.ok(md.includes("| Module |"));
  });
});

// ---------------------------------------------------------------------------
// RT-08: Benchmark Comparison
// ---------------------------------------------------------------------------

describe("RT-08: Benchmark Comparison", () => {
  it("defines pristine repo benchmarks", () => {
    assert.ok(PRISTINE_REPO_BENCHMARKS.length >= 3);
    for (const b of PRISTINE_REPO_BENCHMARKS) {
      assert.ok(b.name);
      assert.ok(b.estimatedRating);
      assert.ok(b.methodology);
    }
  });

  it("defines industry averages", () => {
    assert.ok(INDUSTRY_AVERAGES.length >= 2);
  });

  it("defines spec targets", () => {
    assert.ok(SPEC_TARGETS.length >= 2);
    const fullAdoption = SPEC_TARGETS.find((t) => t.name.includes("Full"));
    assert.ok(fullAdoption);
    assert.equal(fullAdoption!.estimatedRating, "ADM-1");
  });

  it("compares current rating against benchmarks", () => {
    const result = compareAgainstBenchmarks("ADM-4", {
      "first-pass-quality": 55,
      "enforcement-coverage": 45,
    });
    assert.ok(result.position);
    assert.ok(result.benchmarks.length > 0);
  });

  it("identifies gaps to leader", () => {
    const result = compareAgainstBenchmarks("ADM-4", {
      "first-pass-quality": 55,
      "enforcement-coverage": 45,
    });
    assert.ok(result.gapsToLeader.length > 0);
  });

  it("formats comparison as markdown", () => {
    const result = compareAgainstBenchmarks("ADM-3", {});
    const md = formatBenchmarkComparison(result);
    assert.ok(md.includes("Benchmark Comparison"));
    assert.ok(md.includes("| Benchmark |"));
  });
});

// ---------------------------------------------------------------------------
// RT-09: Dashboard
// ---------------------------------------------------------------------------

describe("RT-09: Dashboard", () => {
  it("builds dashboard data from report", () => {
    const data = buildDashboard(makeReport());
    assert.equal(data.rating, "ADM-4");
    assert.ok(data.badge);
    assert.ok(data.color);
    assert.ok(data.dimensions.length > 0);
    assert.ok(data.gateStatus.length > 0);
  });

  it("includes per-dimension scores", () => {
    const data = buildDashboard(makeReport());
    assert.equal(data.dimensions.length, 7);
    for (const d of data.dimensions) {
      assert.ok(d.name);
      assert.ok(["green", "yellow", "red", "unknown"].includes(d.status));
    }
  });

  it("includes gate status for all 6 gates", () => {
    const data = buildDashboard(makeReport());
    assert.equal(data.gateStatus.length, 6);
    // All should be not-evaluated when no verdicts provided
    for (const g of data.gateStatus) {
      assert.equal(g.status, "not-evaluated");
    }
  });

  it("includes next tier requirements", () => {
    const data = buildDashboard(makeReport());
    assert.ok(data.nextTierRequirements.length > 0);
  });

  it("formats dashboard as markdown", () => {
    const data = buildDashboard(makeReport());
    const md = formatDashboard(data);
    assert.ok(md.includes("Admiral Rating Dashboard"));
    assert.ok(md.includes("Benchmark Scores"));
    assert.ok(md.includes("Human Judgment Gates"));
  });
});

// ---------------------------------------------------------------------------
// RT-10: Alerts
// ---------------------------------------------------------------------------

describe("RT-10: Alerts", () => {
  it("detects rating regression", () => {
    const current = makeReport({ rating: "ADM-5" });
    const previous = [makeEntry("ADM-4", 1)];
    const report = evaluateAlerts(current, previous);
    const regression = report.alerts.find((a) => a.trigger === "rating-regression");
    assert.ok(regression);
    assert.equal(regression!.severity, "critical");
  });

  it("no alerts when rating improves", () => {
    const current = makeReport({ rating: "ADM-3" });
    const previous = [makeEntry("ADM-4", 1)];
    const report = evaluateAlerts(current, previous);
    assert.equal(
      report.alerts.filter((a) => a.trigger === "rating-regression").length,
      0,
    );
  });

  it("detects active hard caps", () => {
    const current = makeReport({
      activeHardCaps: [
        { ruleId: "low-first-pass", maxTier: "ADM-4", currentValue: 40, threshold: 50 },
      ],
    });
    const report = evaluateAlerts(current, []);
    const capAlert = report.alerts.find((a) => a.trigger === "hard-cap-crossed");
    assert.ok(capAlert);
    assert.equal(capAlert!.severity, "high");
  });

  it("detects gate invalidation", () => {
    const current = makeReport({ gateVerdicts: [] });
    const previous: HistoryEntry[] = [{
      ...makeEntry("ADM-4", 1),
      gatesPassed: 3,
    }];
    const report = evaluateAlerts(current, previous);
    const gateAlert = report.alerts.find((a) => a.trigger === "gate-invalidated");
    assert.ok(gateAlert);
  });

  it("sorts alerts by severity", () => {
    const current = makeReport({
      rating: "ADM-5",
      activeHardCaps: [
        { ruleId: "low-first-pass", maxTier: "ADM-4", currentValue: 40, threshold: 50 },
      ],
    });
    const previous = [makeEntry("ADM-4", 1)];
    const report = evaluateAlerts(current, previous);
    if (report.alerts.length >= 2) {
      const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < report.alerts.length; i++) {
        assert.ok(
          severityOrder[report.alerts[i].severity] >= severityOrder[report.alerts[i - 1].severity],
          "alerts should be sorted by severity",
        );
      }
    }
  });

  it("produces alert summary counts", () => {
    const current = makeReport({
      activeHardCaps: [
        { ruleId: "low-first-pass", maxTier: "ADM-4", currentValue: 40, threshold: 50 },
      ],
    });
    const report = evaluateAlerts(current, []);
    assert.equal(typeof report.summary.total, "number");
    assert.equal(typeof report.summary.critical, "number");
    assert.equal(typeof report.summary.high, "number");
  });

  it("formats alerts as markdown", () => {
    const current = makeReport({
      activeHardCaps: [
        { ruleId: "low-first-pass", maxTier: "ADM-4", currentValue: 40, threshold: 50 },
      ],
    });
    const report = evaluateAlerts(current, []);
    const md = formatAlerts(report);
    assert.ok(md.includes("Rating Alerts"));
    assert.ok(md.includes("| Severity |"));
  });

  it("handles no alerts gracefully", () => {
    const report = evaluateAlerts(makeReport(), []);
    const md = formatAlerts(report);
    assert.ok(md.includes("No alerts"));
  });
});
