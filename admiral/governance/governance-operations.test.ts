/**
 * Tests for Governance Operations (MG-08 to MG-13).
 */

import { describe, it, beforeEach } from "node:test";
import * as assert from "node:assert/strict";

import { GovernanceEventBus, InterventionLevel } from "./framework";
import { InterventionProtocol } from "./intervention";
import {
  GovernanceAuditDashboard,
  GovernanceSelfGovernance,
  GovernanceMetrics,
  MultiOperatorGovernance,
  OperatorHandoff,
  FallbackDecomposer,
} from "./governance-operations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBus(): GovernanceEventBus {
  return new GovernanceEventBus(1000);
}

function makeProtocol(bus: GovernanceEventBus): InterventionProtocol {
  return new InterventionProtocol(bus);
}

// ---------------------------------------------------------------------------
// MG-08: GovernanceAuditDashboard
// ---------------------------------------------------------------------------

describe("GovernanceAuditDashboard", () => {
  it("getActiveFindingsView returns governance findings", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    bus.emit({ type: "scope_drift", severity: "high", sourceAgent: "agent-1", data: {} });
    bus.emit({ type: "compliance_finding", severity: "medium", targetAgent: "agent-2", data: {} });

    const dashboard = new GovernanceAuditDashboard(bus, protocol);
    const findings = dashboard.getActiveFindingsView();
    assert.ok(findings.length >= 2);
  });

  it("getInterventionHistory returns interventions", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    protocol.warn("agent-1", "test warning", "system");

    const dashboard = new GovernanceAuditDashboard(bus, protocol);
    const history = dashboard.getInterventionHistory();
    assert.ok(history.length >= 1);
  });

  it("getInterventionHistory respects limit", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    protocol.warn("agent-1", "w1", "system");
    protocol.warn("agent-2", "w2", "system");
    protocol.warn("agent-3", "w3", "system");

    const dashboard = new GovernanceAuditDashboard(bus, protocol);
    assert.equal(dashboard.getInterventionHistory(2).length, 2);
  });

  it("getFalsePositiveRate returns ratio of reversed interventions", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    const i1 = protocol.warn("agent-1", "test", "system");
    protocol.warn("agent-2", "test", "system");
    protocol.reverse(i1.id, "admin", "false positive");

    const dashboard = new GovernanceAuditDashboard(bus, protocol);
    assert.equal(dashboard.getFalsePositiveRate(), 0.5);
  });

  it("getComplianceScorecard returns per-order compliance", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    bus.emit({ type: "scope_drift", severity: "low", data: { orderId: "order-1" } });
    bus.emit({ type: "compliance_finding", severity: "high", data: { orderId: "order-1" } });

    const dashboard = new GovernanceAuditDashboard(bus, protocol);
    const scorecard = dashboard.getComplianceScorecard();
    assert.ok(scorecard.length > 0);
    const order1 = scorecard.find((s) => s.orderId === "order-1");
    assert.ok(order1 !== undefined);
    assert.ok(order1.compliance < 1); // has a compliance finding
  });

  it("getGovernanceAgentHealth tracks agent activity", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    bus.emit({ type: "scope_drift", severity: "low", sourceAgent: "gov-agent-1", data: {} });

    const dashboard = new GovernanceAuditDashboard(bus, protocol);
    const health = dashboard.getGovernanceAgentHealth();
    assert.ok(health.some((h) => h.agentId === "gov-agent-1" && h.healthy));
  });
});

// ---------------------------------------------------------------------------
// MG-09: GovernanceSelfGovernance
// ---------------------------------------------------------------------------

describe("GovernanceSelfGovernance", () => {
  it("blocks self-modification of governance config", () => {
    const bus = makeBus();
    const sg = new GovernanceSelfGovernance(bus);
    const result = sg.validateNoSelfModification("gov-1", "governance-framework");
    assert.equal(result.allowed, false);
    assert.ok(result.reason.includes("prohibited"));
  });

  it("allows modification of non-governance config", () => {
    const bus = makeBus();
    const sg = new GovernanceSelfGovernance(bus);
    const result = sg.validateNoSelfModification("gov-1", "fleet-routing");
    assert.equal(result.allowed, true);
  });

  it("checks budget limits correctly", () => {
    const bus = makeBus();
    const sg = new GovernanceSelfGovernance(bus);
    assert.equal(sg.checkBudgetLimits("agent-1", 50, 100).withinLimits, true);
    assert.equal(sg.checkBudgetLimits("agent-1", 150, 100).withinLimits, false);
  });

  it("enforces intervention rate limits", () => {
    const bus = makeBus();
    const sg = new GovernanceSelfGovernance(bus);

    // Allow up to 2 interventions per window
    assert.equal(sg.checkInterventionRateLimit("agent-1", 60000, 2).allowed, true);
    assert.equal(sg.checkInterventionRateLimit("agent-1", 60000, 2).allowed, true);
    assert.equal(sg.checkInterventionRateLimit("agent-1", 60000, 2).allowed, false);
  });

  it("maintains audit trail", () => {
    const bus = makeBus();
    const sg = new GovernanceSelfGovernance(bus);
    sg.validateNoSelfModification("gov-1", "something");
    sg.checkBudgetLimits("agent-1", 50, 100);
    const trail = sg.getAuditTrail();
    assert.equal(trail.length, 2);
  });
});

// ---------------------------------------------------------------------------
// MG-10: GovernanceMetrics
// ---------------------------------------------------------------------------

describe("GovernanceMetrics", () => {
  it("getInterventionRate counts all interventions", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    protocol.warn("agent-1", "w1", "system");
    protocol.restrict("agent-2", "r1", "system");

    const metrics = new GovernanceMetrics(bus, protocol);
    assert.equal(metrics.getInterventionRate(), 2);
  });

  it("getInterventionRate filters by window", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    protocol.warn("agent-1", "w1", "system");

    const metrics = new GovernanceMetrics(bus, protocol);
    assert.equal(metrics.getInterventionRate(60000), 1);
  });

  it("getFalsePositiveRate computes ratio", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    const i1 = protocol.warn("agent-1", "w1", "system");
    protocol.warn("agent-2", "w2", "system");
    protocol.reverse(i1.id, "admin", "oops");

    const metrics = new GovernanceMetrics(bus, protocol);
    assert.equal(metrics.getFalsePositiveRate(), 0.5);
  });

  it("getComplianceScore reduces on compliance findings", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    bus.emit({ type: "compliance_finding", severity: "high", data: {} });
    bus.emit({ type: "scope_drift", severity: "low", data: {} });

    const metrics = new GovernanceMetrics(bus, protocol);
    const score = metrics.getComplianceScore();
    assert.ok(score < 100);
    assert.ok(score >= 0);
  });

  it("recordDetection and getDetectionLatency work", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    const metrics = new GovernanceMetrics(bus, protocol);

    metrics.recordDetection("d1", 1000, 1500);
    metrics.recordDetection("d2", 2000, 2200);
    assert.equal(metrics.getDetectionLatency(), 350); // (500+200)/2
  });

  it("recordResolution and getResolutionTime work", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    const metrics = new GovernanceMetrics(bus, protocol);

    metrics.recordResolution("r1", 1000, 2000);
    assert.equal(metrics.getResolutionTime(), 1000);
  });

  it("exportMetrics returns all metric keys", () => {
    const bus = makeBus();
    const protocol = makeProtocol(bus);
    const metrics = new GovernanceMetrics(bus, protocol);
    const exported = metrics.exportMetrics();
    assert.ok("interventionRate" in exported);
    assert.ok("falsePositiveRate" in exported);
    assert.ok("complianceScore" in exported);
    assert.ok("governanceOverhead" in exported);
  });
});

// ---------------------------------------------------------------------------
// MG-11: MultiOperatorGovernance
// ---------------------------------------------------------------------------

describe("MultiOperatorGovernance", () => {
  it("adds operators up to the limit", () => {
    const mog = new MultiOperatorGovernance(2);
    mog.addOperator("op-1", "owner");
    mog.addOperator("op-2", "operator");
    assert.throws(
      () => mog.addOperator("op-3", "observer"),
      /Maximum operator limit/,
    );
  });

  it("removes operators", () => {
    const mog = new MultiOperatorGovernance(3);
    mog.addOperator("op-1", "owner");
    mog.removeOperator("op-1");
    assert.equal(mog.getOperators().length, 0);
  });

  it("resolves conflict in favor of higher authority", () => {
    const mog = new MultiOperatorGovernance(3);
    mog.addOperator("op-1", "owner");
    mog.addOperator("op-2", "operator");
    const result = mog.resolveConflict("op-1", "op-2", "terminate");
    assert.equal(result.winner, "op-1");
  });

  it("resolves same-tier conflict conservatively", () => {
    const mog = new MultiOperatorGovernance(3);
    mog.addOperator("op-1", "operator");
    mog.addOperator("op-2", "operator");
    const result = mog.resolveConflict("op-1", "op-2", "risky-action");
    assert.equal(result.winner, "op-2"); // conservative wins
  });

  it("canPerformAction checks permission level", () => {
    const mog = new MultiOperatorGovernance(3);
    mog.addOperator("op-1", "owner");
    mog.addOperator("op-2", "observer");
    assert.equal(mog.canPerformAction("op-1", "terminate"), true);
    assert.equal(mog.canPerformAction("op-2", "terminate"), false);
    assert.equal(mog.canPerformAction("op-2", "read"), true);
  });

  it("getOperators returns all registered operators", () => {
    const mog = new MultiOperatorGovernance(3);
    mog.addOperator("op-1", "owner");
    mog.addOperator("op-2", "operator");
    assert.equal(mog.getOperators().length, 2);
  });
});

// ---------------------------------------------------------------------------
// MG-12: OperatorHandoff
// ---------------------------------------------------------------------------

describe("OperatorHandoff", () => {
  it("exportState returns empty state when nothing imported", () => {
    const handoff = new OperatorHandoff();
    const state = handoff.exportState();
    assert.ok(Array.isArray(state.roster));
    assert.ok(state.exportedAt > 0);
  });

  it("importState and acknowledgeHandoff work", () => {
    const handoff = new OperatorHandoff();
    const state = {
      roster: [{ agentId: "a-1", state: "running" }],
      trustState: { test: true },
      brainHealth: { entries: 100, lastWrite: Date.now() },
      activeTasks: [{ taskId: "t-1", agent: "a-1", status: "active" }],
      exportedAt: Date.now(),
      exportedBy: "op-1",
    };
    handoff.importState(state, "op-2");
    assert.equal(handoff.isAcknowledged(), false);
    assert.equal(handoff.acknowledgeHandoff("op-2"), true);
    assert.equal(handoff.isAcknowledged(), true);
  });

  it("acknowledgeHandoff returns false when no state imported", () => {
    const handoff = new OperatorHandoff();
    assert.equal(handoff.acknowledgeHandoff("op-1"), false);
  });
});

// ---------------------------------------------------------------------------
// MG-13: FallbackDecomposer
// ---------------------------------------------------------------------------

describe("FallbackDecomposer", () => {
  it("starts inactive", () => {
    const decomposer = new FallbackDecomposer();
    assert.equal(decomposer.isActive(), false);
  });

  it("activate and deactivate toggle state", () => {
    const decomposer = new FallbackDecomposer();
    decomposer.activate("primary decomposer offline");
    assert.equal(decomposer.isActive(), true);
    assert.equal(decomposer.getActivationReason(), "primary decomposer offline");
    decomposer.deactivate();
    assert.equal(decomposer.isActive(), false);
  });

  it("throws when decomposing while inactive", () => {
    const decomposer = new FallbackDecomposer();
    assert.throws(
      () => decomposer.decompose("some task"),
      /not active/,
    );
  });

  it("decomposes into 1-3 subtasks", () => {
    const decomposer = new FallbackDecomposer(3, 300_000);
    decomposer.activate("test");
    const result = decomposer.decompose("build feature X");
    assert.ok(result.subtasks.length >= 1);
    assert.ok(result.subtasks.length <= 3);
    // Each subtask should be routed to tier1-specialist
    for (const subtask of result.subtasks) {
      assert.equal(result.routing[subtask], "tier1-specialist");
    }
  });

  it("respects maxTasks limit", () => {
    const decomposer = new FallbackDecomposer(2, 300_000);
    decomposer.activate("test");
    const result = decomposer.decompose("complex task");
    assert.ok(result.subtasks.length <= 2);
  });

  it("checkTimeout detects expired duration", () => {
    const decomposer = new FallbackDecomposer(3, 100); // 100ms timeout
    decomposer.activate("test");
    // Manually set activatedAt to the past
    (decomposer as any).activatedAt = Date.now() - 200;
    assert.equal(decomposer.checkTimeout(), true);
  });

  it("checkTimeout returns false when within duration", () => {
    const decomposer = new FallbackDecomposer(3, 300_000);
    decomposer.activate("test");
    assert.equal(decomposer.checkTimeout(), false);
  });

  it("checkTimeout returns false when inactive", () => {
    const decomposer = new FallbackDecomposer();
    assert.equal(decomposer.checkTimeout(), false);
  });
});
