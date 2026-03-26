import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GovernanceEvent, GovernanceEventBus } from "./framework";
import { ComplianceMonitorAgent, StandingOrderDef } from "./compliance-monitor";

describe("ComplianceMonitorAgent", () => {
  let bus: GovernanceEventBus;
  let monitor: ComplianceMonitorAgent;
  const now = Date.now();

  const orders: StandingOrderDef[] = [
    { id: "SO-001", name: "Branch naming", enforcement: "mechanical", hookName: "branch-check" },
    { id: "SO-002", name: "Code quality", enforcement: "judgment" },
    { id: "SO-003", name: "Documentation", enforcement: "advisory" },
  ];

  beforeEach(() => {
    bus = new GovernanceEventBus(500);
    monitor = new ComplianceMonitorAgent(bus, orders);
  });

  // -----------------------------------------------------------------------
  // Mechanical compliance
  // -----------------------------------------------------------------------

  describe("checkMechanicalCompliance", () => {
    it("calculates pass rate from hook events", () => {
      const events: GovernanceEvent[] = [
        { id: "e1", timestamp: now, type: "compliance_finding", severity: "low", data: { hookName: "branch-check", result: "pass" } },
        { id: "e2", timestamp: now, type: "compliance_finding", severity: "low", data: { hookName: "branch-check", result: "pass" } },
        { id: "e3", timestamp: now, type: "compliance_finding", severity: "low", data: { hookName: "branch-check", result: "fail" } },
      ];

      const results = monitor.checkMechanicalCompliance(events);
      assert.equal(results.length, 1);
      assert.equal(results[0].orderId, "SO-001");
      assert.equal(results[0].mechanicalCompliance, 67); // 2/3 rounded
      assert.equal(results[0].violationCount, 1);
      assert.equal(results[0].enforced, true);
    });

    it("returns 100% when no hook events exist", () => {
      const results = monitor.checkMechanicalCompliance([]);
      assert.equal(results.length, 1);
      assert.equal(results[0].mechanicalCompliance, 100);
    });

    it("tracks last violation timestamp", () => {
      const events: GovernanceEvent[] = [
        { id: "e1", timestamp: now - 5000, type: "compliance_finding", severity: "low", data: { hookName: "branch-check", result: "fail" } },
        { id: "e2", timestamp: now - 1000, type: "compliance_finding", severity: "low", data: { hookName: "branch-check", result: "fail" } },
      ];

      const results = monitor.checkMechanicalCompliance(events);
      assert.equal(results[0].lastViolation, now - 1000);
    });
  });

  // -----------------------------------------------------------------------
  // Judgment compliance
  // -----------------------------------------------------------------------

  describe("checkJudgmentCompliance", () => {
    it("calculates compliance from sampled events", () => {
      const events: GovernanceEvent[] = [
        { id: "e1", timestamp: now, type: "compliance_finding", severity: "low", data: { orderId: "SO-002", compliant: true } },
        { id: "e2", timestamp: now, type: "compliance_finding", severity: "low", data: { orderId: "SO-002", compliant: true } },
        { id: "e3", timestamp: now, type: "compliance_finding", severity: "low", data: { orderId: "SO-002", compliant: false } },
        { id: "e4", timestamp: now, type: "compliance_finding", severity: "low", data: { orderId: "SO-002", compliant: true } },
      ];

      const results = monitor.checkJudgmentCompliance(events);
      assert.equal(results.length, 1);
      assert.equal(results[0].orderId, "SO-002");
      assert.equal(results[0].judgmentCompliance, 75); // 3/4
      assert.equal(results[0].violationCount, 1);
    });

    it("returns 100% when no judgment events", () => {
      const results = monitor.checkJudgmentCompliance([]);
      assert.equal(results.length, 1);
      assert.equal(results[0].judgmentCompliance, 100);
    });
  });

  // -----------------------------------------------------------------------
  // Report generation
  // -----------------------------------------------------------------------

  describe("generateReport", () => {
    it("generates a report with all orders", () => {
      // Emit some events onto the bus so getRecentEvents picks them up
      bus.emit({ type: "compliance_finding", severity: "low", data: { hookName: "branch-check", result: "pass" } });
      bus.emit({ type: "compliance_finding", severity: "low", data: { orderId: "SO-002", compliant: true } });

      const report = monitor.generateReport(60_000);
      assert.ok(report.timestamp > 0);
      assert.ok(report.period.from < report.period.to);
      assert.ok(report.orders.length >= 2); // mechanical + judgment + advisory
      assert.ok(report.overallScore >= 0);
      assert.ok(report.overallScore <= 100);
    });

    it("includes advisory orders as stable", () => {
      const report = monitor.generateReport(60_000);
      const advisory = report.orders.find((o) => o.orderId === "SO-003");
      assert.ok(advisory);
      assert.equal(advisory!.trend, "stable");
    });

    it("computes overall score as average", () => {
      bus.emit({ type: "compliance_finding", severity: "low", data: { hookName: "branch-check", result: "pass" } });

      const report = monitor.generateReport(60_000);
      assert.ok(typeof report.overallScore === "number");
    });
  });

  // -----------------------------------------------------------------------
  // Trend tracking
  // -----------------------------------------------------------------------

  describe("getComplianceTrend", () => {
    it("returns empty array with no history", () => {
      const trend = monitor.getComplianceTrend("SO-001");
      assert.deepEqual(trend, []);
    });

    it("tracks scores across multiple reports", () => {
      // Generate multiple reports to build history
      bus.emit({ type: "compliance_finding", severity: "low", data: { hookName: "branch-check", result: "pass" } });
      monitor.generateReport(60_000);

      bus.emit({ type: "compliance_finding", severity: "low", data: { hookName: "branch-check", result: "fail" } });
      monitor.generateReport(60_000);

      const trend = monitor.getComplianceTrend("SO-001", 5);
      assert.equal(trend.length, 2);
      assert.ok(trend.every((s) => typeof s === "number"));
    });
  });

  // -----------------------------------------------------------------------
  // analyze
  // -----------------------------------------------------------------------

  describe("analyze", () => {
    it("returns findings for low-compliance orders", () => {
      const events: GovernanceEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `e${i}`,
        timestamp: now,
        type: "compliance_finding" as const,
        severity: "low" as const,
        data: { hookName: "branch-check", result: "fail" },
      }));

      const findings = monitor.analyze(events);
      assert.ok(findings.length >= 1);
      assert.equal(findings[0].type, "compliance_finding");
    });

    it("returns empty for fully compliant events", () => {
      const events: GovernanceEvent[] = [
        { id: "e1", timestamp: now, type: "compliance_finding", severity: "low", data: { hookName: "branch-check", result: "pass" } },
      ];

      const findings = monitor.analyze(events);
      assert.equal(findings.length, 0);
    });
  });
});
