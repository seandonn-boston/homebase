/**
 * Tests for X-05 (Sentinel), X-06 (Triage Router)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SentinelAgent } from "./sentinel-agent";
import { TriageRouter } from "./triage-router";

// ---------------------------------------------------------------------------
// X-05: Sentinel Agent
// ---------------------------------------------------------------------------

describe("X-05: Sentinel Agent", () => {
  it("detects loop patterns", () => {
    const sentinel = new SentinelAgent({ loopThreshold: 3 });
    assert.equal(sentinel.checkLoop("a1", "Read"), null);
    assert.equal(sentinel.checkLoop("a1", "Read"), null);
    const alert = sentinel.checkLoop("a1", "Read");
    assert.ok(alert);
    assert.equal(alert!.type, "loop-detected");
    assert.equal(alert!.severity, "high");
  });

  it("detects budget violations", () => {
    const sentinel = new SentinelAgent({ budgetWarningPercent: 80, budgetCriticalPercent: 95 });
    assert.equal(sentinel.checkBudget("a1", 50), null);
    const warn = sentinel.checkBudget("a1", 85);
    assert.ok(warn);
    assert.equal(warn!.severity, "medium");
    const crit = sentinel.checkBudget("a1", 98);
    assert.ok(crit);
    assert.equal(crit!.severity, "critical");
  });

  it("detects scope drift", () => {
    const sentinel = new SentinelAgent({ scopeBoundaries: ["aiStrat/", "/etc/"] });
    assert.equal(sentinel.checkScope("a1", "admiral/test.ts"), null);
    const alert = sentinel.checkScope("a1", "aiStrat/spec/index.md");
    assert.ok(alert);
    assert.equal(alert!.type, "scope-drift");
  });

  it("accumulates and clears alerts", () => {
    const sentinel = new SentinelAgent({ loopThreshold: 2 });
    sentinel.checkLoop("a1", "Read");
    sentinel.checkLoop("a1", "Read");
    assert.equal(sentinel.getAlertCount(), 1);
    sentinel.clearAlerts();
    assert.equal(sentinel.getAlertCount(), 0);
  });
});

// ---------------------------------------------------------------------------
// X-06: Triage Router
// ---------------------------------------------------------------------------

describe("X-06: Triage Router", () => {
  it("routes tasks to best matching agent", () => {
    const router = new TriageRouter();
    router.registerAgent({ agentId: "a1", capabilities: ["code", "test"], currentLoad: 30, available: true, modelTier: "tier-1" });
    router.registerAgent({ agentId: "a2", capabilities: ["code"], currentLoad: 80, available: true, modelTier: "tier-2" });

    const decision = router.route({ id: "t1", type: "coding", requiredCapabilities: ["code"], complexity: "high", priority: 1 });
    assert.equal(decision.assignedAgent, "a1"); // Lower load + tier-1 for high complexity
    assert.ok(decision.confidence > 0);
  });

  it("returns null when no agents match", () => {
    const router = new TriageRouter();
    router.registerAgent({ agentId: "a1", capabilities: ["test"], currentLoad: 30, available: true, modelTier: "tier-2" });

    const decision = router.route({ id: "t1", type: "coding", requiredCapabilities: ["code"], complexity: "low", priority: 1 });
    assert.equal(decision.assignedAgent, null);
  });

  it("skips unavailable agents", () => {
    const router = new TriageRouter();
    router.registerAgent({ agentId: "a1", capabilities: ["code"], currentLoad: 10, available: false, modelTier: "tier-1" });
    router.registerAgent({ agentId: "a2", capabilities: ["code"], currentLoad: 50, available: true, modelTier: "tier-2" });

    const decision = router.route({ id: "t1", type: "coding", requiredCapabilities: ["code"], complexity: "medium", priority: 1 });
    assert.equal(decision.assignedAgent, "a2");
  });

  it("logs decisions with rationale", () => {
    const router = new TriageRouter();
    router.registerAgent({ agentId: "a1", capabilities: ["code"], currentLoad: 20, available: true, modelTier: "tier-1" });
    router.route({ id: "t1", type: "coding", requiredCapabilities: ["code"], complexity: "low", priority: 1 });

    assert.equal(router.getDecisions().length, 1);
    assert.ok(router.getDecisions()[0].rationale.includes("a1"));
  });

  it("provides alternatives", () => {
    const router = new TriageRouter();
    router.registerAgent({ agentId: "a1", capabilities: ["code", "test"], currentLoad: 20, available: true, modelTier: "tier-1" });
    router.registerAgent({ agentId: "a2", capabilities: ["code"], currentLoad: 30, available: true, modelTier: "tier-2" });
    router.registerAgent({ agentId: "a3", capabilities: ["code"], currentLoad: 40, available: true, modelTier: "tier-3" });

    const decision = router.route({ id: "t1", type: "coding", requiredCapabilities: ["code"], complexity: "medium", priority: 1 });
    assert.ok(decision.alternatives.length >= 1);
  });
});
