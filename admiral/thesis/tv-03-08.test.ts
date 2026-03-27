/**
 * Tests for TV-03 (Case Studies), TV-04 (Quality Tracking),
 * TV-05 (Survey), TV-06 (False Positives), TV-07 (Overhead), TV-08 (ROI)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CaseStudyRegistry } from "./case-studies";
import { QualityTracker } from "./quality-tracking";
import { SurveyProcessor, GOVERNANCE_SURVEY } from "./survey-framework";
import { FalsePositiveTracker } from "./false-positive-tracker";
import { OverheadTracker } from "./overhead-measurement";
import { calculateROI, runSensitivityAnalysis, formatROI } from "./roi-model";

// ---------------------------------------------------------------------------
// TV-03: Case Studies
// ---------------------------------------------------------------------------

describe("TV-03: Case Studies", () => {
  it("adds and retrieves case studies", () => {
    const reg = new CaseStudyRegistry();
    const cs = reg.add({
      title: "Scope violation caught",
      task: "Implement feature X",
      context: "Agent attempted to modify protected file",
      agentAction: "Wrote to aiStrat/",
      hookFired: "scope_boundary_guard",
      hookReason: "aiStrat/ is read-only",
      counterfactual: "Would have corrupted spec files",
      estimatedImpact: { severity: "high", blastRadius: "spec integrity", remediationCost: "hours", description: "Spec corruption" },
      classification: "true-positive",
      evidence: ["Hook log shows write attempt", "File was in protected path"],
      tags: ["scope", "spec-protection"],
    });
    assert.ok(cs.id);
    assert.equal(reg.list().length, 1);
  });

  it("computes true/false positive rates", () => {
    const reg = new CaseStudyRegistry();
    for (let i = 0; i < 4; i++) {
      reg.add({
        title: `TP ${i}`, task: "t", context: "c", agentAction: "a",
        hookFired: "hook-a", hookReason: "r", counterfactual: "cf",
        estimatedImpact: { severity: "medium", blastRadius: "local", remediationCost: "hours", description: "d" },
        classification: "true-positive", evidence: [], tags: [],
      });
    }
    reg.add({
      title: "FP", task: "t", context: "c", agentAction: "a",
      hookFired: "hook-b", hookReason: "r", counterfactual: "cf",
      estimatedImpact: { severity: "low", blastRadius: "none", remediationCost: "hours", description: "d" },
      classification: "false-positive", evidence: [], tags: [],
    });
    const idx = reg.getIndex();
    assert.equal(idx.truePositives, 4);
    assert.equal(idx.falsePositives, 1);
    assert.equal(idx.truePositiveRate, 80);
  });

  it("formats case study as markdown", () => {
    const reg = new CaseStudyRegistry();
    const cs = reg.add({
      title: "Test", task: "t", context: "c", agentAction: "a",
      hookFired: "h", hookReason: "r", counterfactual: "cf",
      estimatedImpact: { severity: "high", blastRadius: "b", remediationCost: "days", description: "d" },
      classification: "true-positive", evidence: ["e1"], tags: [],
    });
    const md = reg.formatStudy(cs);
    assert.ok(md.includes("# Case Study: Test"));
    assert.ok(md.includes("Counterfactual"));
  });
});

// ---------------------------------------------------------------------------
// TV-04: Quality Tracking
// ---------------------------------------------------------------------------

describe("TV-04: Quality Tracking", () => {
  it("tracks snapshots and milestones", () => {
    const tracker = new QualityTracker();
    tracker.addSnapshot({ timestamp: "2026-01-01", firstPassQualityRate: 60, defectDensity: 5, escalationRate: 10, governanceCoverage: 30, milestoneId: null });
    tracker.addMilestone({ id: "m1", timestamp: "2026-01-15", description: "Added scope hooks", governanceCoverage: 50, hookCount: 10, soEnforced: 5 });
    tracker.addSnapshot({ timestamp: "2026-02-01", firstPassQualityRate: 70, defectDensity: 3, escalationRate: 8, governanceCoverage: 50, milestoneId: "m1" });
    assert.equal(tracker.getSnapshotCount(), 2);
  });

  it("computes correlations between milestones and quality", () => {
    const tracker = new QualityTracker();
    tracker.addSnapshot({ timestamp: "2026-01-01", firstPassQualityRate: 55, defectDensity: 8, escalationRate: 15, governanceCoverage: 20, milestoneId: null });
    tracker.addSnapshot({ timestamp: "2026-01-10", firstPassQualityRate: 58, defectDensity: 7, escalationRate: 14, governanceCoverage: 25, milestoneId: null });
    tracker.addMilestone({ id: "m1", timestamp: "2026-01-15", description: "Hooks added", governanceCoverage: 40, hookCount: 8, soEnforced: 4 });
    tracker.addSnapshot({ timestamp: "2026-01-20", firstPassQualityRate: 68, defectDensity: 4, escalationRate: 10, governanceCoverage: 40, milestoneId: "m1" });
    tracker.addSnapshot({ timestamp: "2026-02-01", firstPassQualityRate: 72, defectDensity: 3, escalationRate: 8, governanceCoverage: 45, milestoneId: null });

    const trend = tracker.computeTrend();
    assert.equal(trend.correlations.length, 1);
    assert.ok(trend.correlations[0].qualityDelta > 0);
    assert.equal(trend.overallTrend, "improving");
  });

  it("handles insufficient data", () => {
    const tracker = new QualityTracker();
    tracker.addSnapshot({ timestamp: "2026-01-01", firstPassQualityRate: 60, defectDensity: 5, escalationRate: 10, governanceCoverage: 30, milestoneId: null });
    const trend = tracker.computeTrend();
    assert.equal(trend.overallTrend, "insufficient-data");
  });
});

// ---------------------------------------------------------------------------
// TV-05: Survey Framework
// ---------------------------------------------------------------------------

describe("TV-05: Survey Framework", () => {
  it("defines survey questions", () => {
    assert.ok(GOVERNANCE_SURVEY.length >= 9);
    const categories = new Set(GOVERNANCE_SURVEY.map((q) => q.category));
    assert.ok(categories.has("friction"));
    assert.ok(categories.has("trust"));
    assert.ok(categories.has("productivity"));
    assert.ok(categories.has("value"));
  });

  it("processes responses and computes NPS", () => {
    const processor = new SurveyProcessor();
    processor.addResponse({ nps: 9, friction: 2, "trust-hooks": 4, productivity: 4 });
    processor.addResponse({ nps: 3, friction: 4, "trust-hooks": 2, productivity: 2 });
    processor.addResponse({ nps: 10, friction: 1, "trust-hooks": 5, productivity: 5 });

    const results = processor.computeResults();
    assert.equal(results.responseCount, 3);
    // 2 promoters, 1 detractor = (2-1)/3 * 100 = 33
    assert.equal(results.nps, 33);
    assert.ok(results.categoryScores.friction);
  });

  it("handles empty responses", () => {
    const processor = new SurveyProcessor();
    const results = processor.computeResults();
    assert.equal(results.responseCount, 0);
    assert.equal(results.nps, 0);
  });
});

// ---------------------------------------------------------------------------
// TV-06: False Positive Tracking
// ---------------------------------------------------------------------------

describe("TV-06: False Positive Tracking", () => {
  it("records incidents and computes metrics", () => {
    const tracker = new FalsePositiveTracker();
    tracker.recordHookFirings(100);
    tracker.recordIncident({
      hookId: "scope_guard", actionBlocked: "write to docs/",
      whyLegitimate: "Updating documentation", blockedDurationMs: 30000,
      workaround: "Manually approved", hookTuned: true, severity: "medium",
    });
    tracker.recordIncident({
      hookId: "scope_guard", actionBlocked: "write to config/",
      whyLegitimate: "Updating config", blockedDurationMs: 15000,
      workaround: "None needed", hookTuned: false, severity: "low",
    });

    const metrics = tracker.computeMetrics();
    assert.equal(metrics.totalIncidents, 2);
    assert.equal(metrics.falsePositiveRate, 2);
    assert.equal(metrics.byHook["scope_guard"], 2);
    assert.equal(metrics.hooksTuned, 1);
    assert.equal(metrics.totalBlockedMs, 45000);
  });

  it("handles zero hook firings", () => {
    const tracker = new FalsePositiveTracker();
    const metrics = tracker.computeMetrics();
    assert.equal(metrics.falsePositiveRate, 0);
  });
});

// ---------------------------------------------------------------------------
// TV-07: Overhead Measurement
// ---------------------------------------------------------------------------

describe("TV-07: Overhead Measurement", () => {
  it("computes hook latency percentiles", () => {
    const tracker = new OverheadTracker();
    for (let i = 1; i <= 100; i++) {
      tracker.recordHookLatency("test-hook", i);
    }
    const snapshot = tracker.computeSnapshot();
    assert.equal(snapshot.hookLatency.count, 100);
    assert.equal(snapshot.hookLatency.p50, 50);
    assert.ok(snapshot.hookLatency.p95 >= 95);
    assert.ok(snapshot.hookLatency.p99 >= 99);
  });

  it("computes token overhead ratio", () => {
    const tracker = new OverheadTracker();
    tracker.recordTokens(200, 1000);
    tracker.recordTokens(100, 500);
    const snapshot = tracker.computeSnapshot();
    assert.equal(snapshot.tokenOverhead.governanceTokens, 300);
    assert.equal(snapshot.tokenOverhead.totalTokens, 1500);
    assert.equal(snapshot.tokenOverhead.ratio, 20);
    assert.equal(snapshot.withinHardCap, true);
  });

  it("detects hard cap violation", () => {
    const tracker = new OverheadTracker();
    tracker.recordTokens(400, 1000);
    const snapshot = tracker.computeSnapshot();
    assert.equal(snapshot.withinHardCap, false);
  });

  it("tracks interruptions", () => {
    const tracker = new OverheadTracker();
    tracker.recordInterruption(5000);
    tracker.recordInterruption(3000);
    const snapshot = tracker.computeSnapshot();
    assert.equal(snapshot.interruptionCost.interruptionCount, 2);
    assert.equal(snapshot.interruptionCost.totalInterruptionMs, 8000);
    assert.equal(snapshot.interruptionCost.avgInterruptionMs, 4000);
  });
});

// ---------------------------------------------------------------------------
// TV-08: ROI Model
// ---------------------------------------------------------------------------

describe("TV-08: ROI Model", () => {
  const baseCosts = {
    implementationHours: 200,
    maintenanceHoursPerMonth: 10,
    runtimeTokenCostPerMonth: 50,
    falsePositiveHoursPerMonth: 2,
    hourlyRate: 100,
  };
  const baseBenefits = {
    bugsPrevented: 3,
    avgBugCostHours: 8,
    securityIncidentsPrevented: 0.5,
    avgIncidentCostHours: 40,
    reworkReductionPercent: 20,
    baseReworkHoursPerMonth: 40,
    knowledgePreservationHoursPerMonth: 5,
    onboardingAccelerationHoursPerAgent: 4,
    newAgentsPerMonth: 2,
    hourlyRate: 100,
  };

  it("calculates monthly costs and benefits", () => {
    const result = calculateROI(baseCosts, baseBenefits);
    assert.ok(result.monthlyCost > 0);
    assert.ok(result.monthlyBenefit > 0);
    assert.ok(result.netMonthlyValue !== 0);
  });

  it("computes breakeven months", () => {
    const result = calculateROI(baseCosts, baseBenefits);
    assert.ok(result.breakEvenMonths === null || result.breakEvenMonths > 0);
  });

  it("includes cost and benefit breakdowns", () => {
    const result = calculateROI(baseCosts, baseBenefits);
    assert.ok(result.costBreakdown.maintenance > 0);
    assert.ok(result.benefitBreakdown.bugsPrevented > 0);
  });

  it("runs sensitivity analysis", () => {
    const analyses = runSensitivityAnalysis(baseCosts, baseBenefits);
    assert.ok(analyses.length >= 6);
    const sensitive = analyses.find((a) => a.mostSensitive);
    assert.ok(sensitive);
  });

  it("formats ROI as markdown", () => {
    const result = calculateROI(baseCosts, baseBenefits);
    const md = formatROI(result);
    assert.ok(md.includes("# ROI Analysis"));
    assert.ok(md.includes("Monthly Cost"));
    assert.ok(md.includes("Break-Even"));
  });
});
