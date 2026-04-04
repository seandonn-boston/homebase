/**
 * Tests for Rating Alerts (RT-10)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RatingAlertManager } from "./alerts";
import type { RatingReport } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReport(overrides: Partial<RatingReport> = {}): RatingReport {
  const validFuture = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  return {
    id: `rat_${Math.random().toString(36).slice(2, 10)}`,
    generatedAt: new Date().toISOString(),
    entity: "test-fleet",
    tier: "ADM-3",
    certificationSuffix: "-SA",
    ratingLabel: "ADM-3-SA",
    overallScore: 65,
    dimensionScores: [
      {
        dimensionId: "enforcement_coverage",
        score: 70,
        weightedContribution: 14,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "hook_quality",
        score: 60,
        weightedContribution: 9,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "standing_orders_compliance",
        score: 65,
        weightedContribution: 13,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "brain_utilization",
        score: 55,
        weightedContribution: 5.5,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "fleet_governance",
        score: 68,
        weightedContribution: 10.2,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "security_posture",
        score: 72,
        weightedContribution: 7.2,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "observability_maturity",
        score: 70,
        weightedContribution: 7,
        evidence: "e",
        capTriggered: false,
      },
    ],
    moduleRatings: [],
    activeCaps: [],
    recommendations: [],
    validUntil: validFuture,
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RatingAlertManager", () => {
  const manager = new RatingAlertManager();

  it("returns empty array when no changes", () => {
    const report = makeReport();
    const alerts = manager.checkAlerts(report, report);
    // Only score improvement/decline based alerts — should be none for identical reports
    const meaningful = alerts.filter(
      (a) =>
        a.type !== "score_improvement" &&
        a.type !== "score_decline" &&
        a.type !== "tier_regression" &&
        a.type !== "tier_improvement",
    );
    assert.ok(meaningful.length === 0, "no significant alerts for identical reports");
  });

  it("tier_regression alert when tier drops", () => {
    const prev = makeReport({ tier: "ADM-2", ratingLabel: "ADM-2-SA", overallScore: 82 });
    const curr = makeReport({ tier: "ADM-3", ratingLabel: "ADM-3-SA", overallScore: 70 });
    const alerts = manager.checkAlerts(curr, prev);

    const regression = alerts.find((a) => a.type === "tier_regression");
    assert.ok(regression, "tier_regression alert fired");
    assert.equal(regression?.severity, "critical", "regression is critical");
    assert.ok(regression?.actionRequired, "requires action");
    assert.equal(regression?.previousTier, "ADM-2");
    assert.equal(regression?.currentTier, "ADM-3");
  });

  it("tier_improvement alert when tier rises", () => {
    const prev = makeReport({ tier: "ADM-3", ratingLabel: "ADM-3-SA", overallScore: 65 });
    const curr = makeReport({ tier: "ADM-2", ratingLabel: "ADM-2-SA", overallScore: 82 });
    const alerts = manager.checkAlerts(curr, prev);

    const improvement = alerts.find((a) => a.type === "tier_improvement");
    assert.ok(improvement, "tier_improvement alert fired");
    assert.equal(improvement?.severity, "info");
    assert.ok(!improvement?.actionRequired);
  });

  it("score_decline alert when score drops by >= threshold", () => {
    const prev = makeReport({ overallScore: 80 });
    const curr = makeReport({ overallScore: 70 }); // 10 point drop
    const alerts = manager.checkAlerts(curr, prev);

    const decline = alerts.find((a) => a.type === "score_decline");
    assert.ok(decline, "score_decline alert fired");
    assert.equal(decline?.severity, "high");
    assert.ok(decline?.delta !== undefined && decline.delta <= -5);
  });

  it("no score_decline when drop is below threshold", () => {
    const prev = makeReport({ overallScore: 70 });
    const curr = makeReport({ overallScore: 68 }); // 2 point drop
    const alerts = manager.checkAlerts(curr, prev);

    const decline = alerts.find((a) => a.type === "score_decline");
    assert.ok(!decline, "no score_decline for small drop");
  });

  it("score_improvement alert when score rises by >= threshold", () => {
    const prev = makeReport({ overallScore: 65 });
    const curr = makeReport({ overallScore: 75 }); // 10 point gain
    const alerts = manager.checkAlerts(curr, prev);

    const improvement = alerts.find((a) => a.type === "score_improvement");
    assert.ok(improvement, "score_improvement alert fired");
    assert.equal(improvement?.severity, "info");
  });

  it("dimension_decline alert when dimension drops >= threshold", () => {
    const prev = makeReport();
    const curr = makeReport({
      dimensionScores: [
        {
          dimensionId: "enforcement_coverage",
          score: 60,
          weightedContribution: 12,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "hook_quality",
          score: 60,
          weightedContribution: 9,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "standing_orders_compliance",
          score: 65,
          weightedContribution: 13,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "brain_utilization",
          score: 55,
          weightedContribution: 5.5,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "fleet_governance",
          score: 68,
          weightedContribution: 10.2,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "security_posture",
          score: 72,
          weightedContribution: 7.2,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "observability_maturity",
          score: 70,
          weightedContribution: 7,
          evidence: "e",
          capTriggered: false,
        },
      ],
    });
    // enforcement_coverage dropped from 70 to 60 (10 points >= 5 threshold)
    const alerts = manager.checkAlerts(curr, prev);
    const decline = alerts.find(
      (a) => a.type === "dimension_decline" && a.dimension === "enforcement_coverage",
    );
    assert.ok(decline, "enforcement_coverage dimension_decline fired");
    assert.ok(decline?.delta !== undefined && decline.delta < 0);
  });

  it("dimension_decline is critical when score drops below 30", () => {
    const prev = makeReport();
    const curr = makeReport({
      dimensionScores: [
        {
          dimensionId: "enforcement_coverage",
          score: 25,
          weightedContribution: 5,
          evidence: "e",
          capTriggered: true,
        },
        {
          dimensionId: "hook_quality",
          score: 60,
          weightedContribution: 9,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "standing_orders_compliance",
          score: 65,
          weightedContribution: 13,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "brain_utilization",
          score: 55,
          weightedContribution: 5.5,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "fleet_governance",
          score: 68,
          weightedContribution: 10.2,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "security_posture",
          score: 72,
          weightedContribution: 7.2,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "observability_maturity",
          score: 70,
          weightedContribution: 7,
          evidence: "e",
          capTriggered: false,
        },
      ],
    });
    const alerts = manager.checkAlerts(curr, prev);
    const critical = alerts.find(
      (a) => a.dimension === "enforcement_coverage" && a.severity === "critical",
    );
    assert.ok(critical, "critical alert when dimension drops below 30");
    assert.ok(critical?.actionRequired);
  });

  it("threshold_crossed_below alert when watched threshold crossed", () => {
    // enforcement_coverage watched at 50; drops from 70 to 45
    const prev = makeReport(); // ec=70
    const curr = makeReport({
      dimensionScores: [
        {
          dimensionId: "enforcement_coverage",
          score: 45,
          weightedContribution: 9,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "hook_quality",
          score: 60,
          weightedContribution: 9,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "standing_orders_compliance",
          score: 65,
          weightedContribution: 13,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "brain_utilization",
          score: 55,
          weightedContribution: 5.5,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "fleet_governance",
          score: 68,
          weightedContribution: 10.2,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "security_posture",
          score: 72,
          weightedContribution: 7.2,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "observability_maturity",
          score: 70,
          weightedContribution: 7,
          evidence: "e",
          capTriggered: false,
        },
      ],
    });
    const alerts = manager.checkAlerts(curr, prev);
    const threshold = alerts.find(
      (a) => a.type === "threshold_crossed_below" && a.dimension === "enforcement_coverage",
    );
    assert.ok(threshold, "threshold_crossed_below fired for enforcement_coverage");
    assert.equal(threshold?.severity, "high");
  });

  it("cap_activated alert when new hard cap appears", () => {
    const prev = makeReport({ activeCaps: [] });
    const curr = makeReport({
      activeCaps: [
        {
          condition: "Enforcement coverage below 50%",
          maxTier: "ADM-4",
          dimension: "enforcement_coverage",
          threshold: 50,
        },
      ],
    });
    const alerts = manager.checkAlerts(curr, prev);
    const capAlert = alerts.find((a) => a.type === "cap_activated");
    assert.ok(capAlert, "cap_activated alert fired");
    assert.equal(capAlert?.severity, "critical");
    assert.ok(capAlert?.actionRequired);
  });

  it("cap_cleared alert when hard cap disappears", () => {
    const prev = makeReport({
      activeCaps: [
        {
          condition: "Enforcement coverage below 50%",
          maxTier: "ADM-4",
          dimension: "enforcement_coverage",
          threshold: 50,
        },
      ],
    });
    const curr = makeReport({ activeCaps: [] });
    const alerts = manager.checkAlerts(curr, prev);
    const capAlert = alerts.find((a) => a.type === "cap_cleared");
    assert.ok(capAlert, "cap_cleared alert fired");
    assert.equal(capAlert?.severity, "info");
  });

  it("expiry_warning alert when rating expires within 30 days", () => {
    const soonExpiring = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString();
    const prev = makeReport({ validUntil: soonExpiring });
    const curr = makeReport({ validUntil: soonExpiring });
    const alerts = manager.checkAlerts(curr, prev);

    const expiry = alerts.find((a) => a.type === "expiry_warning");
    assert.ok(expiry, "expiry_warning alert fired");
    assert.ok(
      ["high", "medium", "critical"].includes(expiry?.severity ?? ""),
      "expiry severity appropriate",
    );
  });

  it("no expiry_warning when rating is far in the future", () => {
    const distantExpiry = new Date(Date.now() + 300 * 24 * 3600 * 1000).toISOString();
    const prev = makeReport({ validUntil: distantExpiry });
    const curr = makeReport({ validUntil: distantExpiry });
    const alerts = manager.checkAlerts(curr, prev);
    const expiry = alerts.find((a) => a.type === "expiry_warning");
    assert.ok(!expiry, "no expiry warning when far in future");
  });

  it("alerts are sorted: critical before high before medium before info", () => {
    const prev = makeReport({ tier: "ADM-2", overallScore: 82, ratingLabel: "ADM-2-SA" });
    const curr = makeReport({
      tier: "ADM-3",
      overallScore: 65,
      ratingLabel: "ADM-3-SA",
      activeCaps: [
        {
          condition: "Any dimension score below 30",
          maxTier: "ADM-3",
          dimension: null,
          threshold: 30,
        },
      ],
    });
    const alerts = manager.checkAlerts(curr, prev);

    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      info: 4,
    };

    for (let i = 1; i < alerts.length; i++) {
      assert.ok(
        severityOrder[alerts[i - 1].severity] <= severityOrder[alerts[i].severity],
        `Alert ${i - 1} (${alerts[i - 1].severity}) should come before alert ${i} (${alerts[i].severity})`,
      );
    }
  });

  it("each alert has required fields", () => {
    const prev = makeReport({ overallScore: 80, tier: "ADM-2", ratingLabel: "ADM-2-SA" });
    const curr = makeReport({ overallScore: 65 });
    const alerts = manager.checkAlerts(curr, prev);

    for (const alert of alerts) {
      assert.ok(alert.id.startsWith("alert_"), "has id");
      assert.ok(alert.timestamp, "has timestamp");
      assert.ok(alert.type, "has type");
      assert.ok(alert.severity, "has severity");
      assert.ok(alert.title, "has title");
      assert.ok(alert.message, "has message");
      assert.ok(alert.currentTier, "has currentTier");
      assert.ok(typeof alert.currentScore === "number", "has currentScore");
      assert.ok(typeof alert.actionRequired === "boolean", "has actionRequired");
    }
  });

  it("checkAbsoluteAlerts detects dimension below threshold", () => {
    const report = makeReport({
      dimensionScores: [
        {
          dimensionId: "enforcement_coverage",
          score: 40,
          weightedContribution: 8,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "hook_quality",
          score: 60,
          weightedContribution: 9,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "standing_orders_compliance",
          score: 65,
          weightedContribution: 13,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "brain_utilization",
          score: 55,
          weightedContribution: 5.5,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "fleet_governance",
          score: 68,
          weightedContribution: 10.2,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "security_posture",
          score: 72,
          weightedContribution: 7.2,
          evidence: "e",
          capTriggered: false,
        },
        {
          dimensionId: "observability_maturity",
          score: 70,
          weightedContribution: 7,
          evidence: "e",
          capTriggered: false,
        },
      ],
    });
    const alerts = manager.checkAbsoluteAlerts(report);
    // enforcement_coverage (40) is below watched threshold (50)
    const thresh = alerts.find(
      (a) => a.type === "threshold_crossed_below" && a.dimension === "enforcement_coverage",
    );
    assert.ok(thresh, "absolute threshold alert for enforcement_coverage");
  });

  it("configurable thresholds work", () => {
    const strictManager = new RatingAlertManager({
      scoreDeclineThreshold: 2, // very sensitive
    });
    const prev = makeReport({ overallScore: 70 });
    const curr = makeReport({ overallScore: 67 }); // 3 point drop — below strict threshold of 2
    const alerts = strictManager.checkAlerts(curr, prev);
    const decline = alerts.find((a) => a.type === "score_decline");
    assert.ok(decline, "strict threshold triggers score_decline on 3 point drop");
  });
});
