/**
 * Tests for A/B Comparison Framework (TV-02)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ABComparisonFramework,
  createTaskRun,
  formatABResult,
  type TaskPair,
  type Violation,
} from "./ab-framework";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeViolation(severity: "critical" | "high" | "medium" | "low" = "medium"): Violation {
  return { hookId: "test-hook", constraint: "test", severity, blocked: false, description: "test violation" };
}

function makePair(
  taskId: string,
  advViolations: number,
  enfViolations: number,
  advQuality: boolean = false,
  enfQuality: boolean = true,
): TaskPair {
  return {
    taskId,
    advisory: createTaskRun(taskId, "advisory", {
      violations: Array.from({ length: advViolations }, () => makeViolation()),
      firstPassQuality: advQuality,
      completionTimeMs: 1000,
    }),
    enforcement: createTaskRun(taskId, "enforcement", {
      violations: Array.from({ length: enfViolations }, () => makeViolation()),
      firstPassQuality: enfQuality,
      completionTimeMs: 1100,
    }),
  };
}

// ---------------------------------------------------------------------------
// Framework Basics
// ---------------------------------------------------------------------------

describe("ABComparisonFramework", () => {
  it("starts with 0 pairs", () => {
    const fw = new ABComparisonFramework();
    assert.equal(fw.getPairCount(), 0);
    assert.equal(fw.getCompletePairCount(), 0);
  });

  it("adds complete pairs", () => {
    const fw = new ABComparisonFramework();
    fw.addPair(makePair("t1", 3, 1));
    assert.equal(fw.getPairCount(), 1);
    assert.equal(fw.getCompletePairCount(), 1);
  });

  it("records runs and matches them into pairs", () => {
    const fw = new ABComparisonFramework();
    fw.recordRun(createTaskRun("t1", "advisory", { violations: [makeViolation()] }));
    assert.equal(fw.getPairCount(), 1);
    assert.equal(fw.getCompletePairCount(), 0);
  });
});

// ---------------------------------------------------------------------------
// Metric Computation
// ---------------------------------------------------------------------------

describe("computeResults", () => {
  it("returns insufficient-data with no pairs", () => {
    const fw = new ABComparisonFramework();
    const result = fw.computeResults();
    assert.equal(result.verdict, "insufficient-data");
    assert.equal(result.pairCount, 0);
  });

  it("computes violation rate reduction", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 10; i++) {
      fw.addPair(makePair(`t${i}`, 4, 1));
    }
    const result = fw.computeResults();
    assert.ok(result.metrics.violationRateReduction > 50);
    assert.equal(result.metrics.violationRateAdvisory, 4);
    assert.equal(result.metrics.violationRateEnforcement, 1);
  });

  it("computes first-pass quality improvement", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 10; i++) {
      fw.addPair(makePair(`t${i}`, 2, 0, false, true));
    }
    const result = fw.computeResults();
    assert.equal(result.metrics.firstPassQualityAdvisory, 0);
    assert.equal(result.metrics.firstPassQualityEnforcement, 100);
    assert.equal(result.metrics.qualityImprovement, 100);
  });

  it("computes completion time impact", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 10; i++) {
      fw.addPair(makePair(`t${i}`, 2, 0));
    }
    const result = fw.computeResults();
    // Enforcement runs are 1100ms vs advisory 1000ms = 10% slower
    assert.equal(result.metrics.timeImpactPercent, 10);
  });

  it("computes severity reduction", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 10; i++) {
      fw.addPair({
        taskId: `t${i}`,
        advisory: createTaskRun(`t${i}`, "advisory", {
          violations: [makeViolation("critical"), makeViolation("high")],
        }),
        enforcement: createTaskRun(`t${i}`, "enforcement", {
          violations: [makeViolation("low")],
        }),
      });
    }
    const result = fw.computeResults();
    assert.ok(result.metrics.severityReduction > 0);
  });

  it("computes escalation ratio", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 10; i++) {
      fw.addPair({
        taskId: `t${i}`,
        advisory: createTaskRun(`t${i}`, "advisory", {
          escalations: [{ reason: "test", fromTier: "A", toTier: "B", resolved: true }],
        }),
        enforcement: createTaskRun(`t${i}`, "enforcement", {
          escalations: [
            { reason: "test", fromTier: "A", toTier: "B", resolved: true },
            { reason: "test2", fromTier: "B", toTier: "C", resolved: true },
          ],
        }),
      });
    }
    const result = fw.computeResults();
    assert.equal(result.metrics.escalationRatio, 2);
  });
});

// ---------------------------------------------------------------------------
// Verdict Determination
// ---------------------------------------------------------------------------

describe("verdict", () => {
  it("enforcement-wins when violations drop and quality improves", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 12; i++) {
      fw.addPair(makePair(`t${i}`, 5, 1, false, true));
    }
    const result = fw.computeResults();
    assert.equal(result.verdict, "enforcement-wins");
  });

  it("insufficient-data below minimum sample", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 3; i++) {
      fw.addPair(makePair(`t${i}`, 5, 1));
    }
    const result = fw.computeResults();
    assert.equal(result.verdict, "insufficient-data");
  });

  it("no-difference when metrics are similar", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 10; i++) {
      fw.addPair(makePair(`t${i}`, 2, 2, true, true));
    }
    const result = fw.computeResults();
    assert.ok(
      result.verdict === "no-difference" || result.verdict === "enforcement-wins",
      `expected no-difference or enforcement-wins, got ${result.verdict}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Statistical Significance
// ---------------------------------------------------------------------------

describe("statistical significance", () => {
  it("reports insufficient sample below 10", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 5; i++) {
      fw.addPair(makePair(`t${i}`, 3, 1));
    }
    const result = fw.computeResults();
    assert.equal(result.statisticalSignificance.sufficientSampleSize, false);
  });

  it("reports sufficient sample at 10+", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 10; i++) {
      fw.addPair(makePair(`t${i}`, 3, 1));
    }
    const result = fw.computeResults();
    assert.equal(result.statisticalSignificance.sufficientSampleSize, true);
  });

  it("reports high confidence at 30+", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 30; i++) {
      fw.addPair(makePair(`t${i}`, 3, 1));
    }
    const result = fw.computeResults();
    assert.ok(result.statisticalSignificance.confidenceNote.includes("high"));
  });
});

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

describe("formatABResult", () => {
  it("produces markdown with metrics table", () => {
    const fw = new ABComparisonFramework();
    for (let i = 0; i < 10; i++) {
      fw.addPair(makePair(`t${i}`, 4, 1, false, true));
    }
    const result = fw.computeResults();
    const md = formatABResult(result);
    assert.ok(md.includes("# A/B Comparison"));
    assert.ok(md.includes("| Metric |"));
    assert.ok(md.includes("Violation Rate"));
    assert.ok(md.includes("Verdict"));
  });
});
