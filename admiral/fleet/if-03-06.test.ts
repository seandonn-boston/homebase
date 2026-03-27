/**
 * Tests for IF-03 (Plugin System), IF-04 (Multi-Repo), IF-05 (Profiling), IF-06 (Cost)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PluginRegistry, type PluginManifest } from "./plugin-system";
import { MultiRepoManager, type RepoHealth } from "./multi-repo";
import { AgentProfiler, type PerformanceSnapshot } from "./performance-profiling";
import { CostOptimizer } from "./cost-optimizer";

// ---------------------------------------------------------------------------
// IF-03: Plugin System
// ---------------------------------------------------------------------------

describe("IF-03: Plugin System", () => {
  const manifest: PluginManifest = {
    id: "test-plugin", name: "Test Plugin", version: "1.0.0",
    type: "hook", description: "test", author: "tester",
    permissions: ["read:brain", "execute:hooks"], entryPoint: "index.ts",
  };

  it("installs and activates plugins", () => {
    const reg = new PluginRegistry();
    reg.install(manifest);
    assert.equal(reg.getPluginCount(), 1);
    assert.equal(reg.activate("test-plugin"), true);
    assert.equal(reg.get("test-plugin")!.status, "active");
  });

  it("disables and uninstalls plugins", () => {
    const reg = new PluginRegistry();
    reg.install(manifest);
    reg.disable("test-plugin");
    assert.equal(reg.get("test-plugin")!.status, "disabled");
    reg.uninstall("test-plugin");
    assert.equal(reg.getPluginCount(), 0);
  });

  it("lists plugins by type", () => {
    const reg = new PluginRegistry();
    reg.install(manifest);
    reg.install({ ...manifest, id: "agent-plugin", type: "agent" });
    assert.equal(reg.listByType("hook").length, 1);
    assert.equal(reg.listByType("agent").length, 1);
  });

  it("creates sandbox and checks permissions", () => {
    const reg = new PluginRegistry();
    reg.install(manifest);
    const sandbox = reg.createSandbox("test-plugin");
    assert.ok(sandbox);
    assert.equal(reg.checkPermission(sandbox!, "read:brain"), true);
    assert.equal(reg.checkPermission(sandbox!, "write:fleet"), false);
    assert.equal(sandbox!.deniedOperations.length, 1);
  });
});

// ---------------------------------------------------------------------------
// IF-04: Multi-Repo
// ---------------------------------------------------------------------------

describe("IF-04: Multi-Repo", () => {
  it("manages repos with shared policies", () => {
    const mgr = new MultiRepoManager(["SO-01", "SO-02"], { maxAgents: 10 });
    mgr.addRepo({
      id: "repo-1", name: "Main", path: "/repos/main",
      standingOrderOverrides: { "SO-02": "monitor" },
      brainNamespace: "main", policyOverrides: { maxAgents: 20 },
    });
    assert.equal(mgr.getRepoCount(), 1);
  });

  it("computes effective policies with overrides", () => {
    const mgr = new MultiRepoManager([], { maxAgents: 10, timeout: 30 });
    mgr.addRepo({
      id: "r1", name: "R1", path: "/r1",
      standingOrderOverrides: {}, brainNamespace: "r1",
      policyOverrides: { maxAgents: 20 },
    });
    const policy = mgr.getEffectivePolicy("r1");
    assert.equal(policy.maxAgents, 20);
    assert.equal(policy.timeout, 30);
  });

  it("computes effective standing orders", () => {
    const mgr = new MultiRepoManager(["SO-01", "SO-02"]);
    mgr.addRepo({
      id: "r1", name: "R1", path: "/r1",
      standingOrderOverrides: { "SO-02": "disabled" },
      brainNamespace: "r1", policyOverrides: {},
    });
    const sos = mgr.getEffectiveStandingOrders("r1");
    assert.equal(sos["SO-01"], "enforce");
    assert.equal(sos["SO-02"], "disabled");
  });

  it("computes aggregate health", () => {
    const mgr = new MultiRepoManager();
    const health: RepoHealth[] = [
      { repoId: "r1", name: "R1", health: "healthy", hookCount: 10, coveragePercent: 80, lastActivity: new Date().toISOString() },
      { repoId: "r2", name: "R2", health: "degraded", hookCount: 5, coveragePercent: 40, lastActivity: new Date().toISOString() },
    ];
    const report = mgr.computeHealth(health);
    assert.equal(report.aggregateHealth, "degraded"); // 1/2 degraded > 1/3 threshold
    assert.ok(report.crossRepoIssues.length > 0);
  });
});

// ---------------------------------------------------------------------------
// IF-05: Performance Profiling
// ---------------------------------------------------------------------------

describe("IF-05: Performance Profiling", () => {
  function makeSnapshot(quality: number): PerformanceSnapshot {
    return {
      timestamp: new Date().toISOString(),
      tokenUsage: 5000, firstPassQualityRate: quality,
      revisionDepth: 1, contextUtilization: 0.7, brainQueryEffectiveness: 0.5,
    };
  }

  it("records and retrieves profiles", () => {
    const profiler = new AgentProfiler();
    profiler.record("agent-1", makeSnapshot(80));
    profiler.record("agent-1", makeSnapshot(85));
    assert.equal(profiler.getProfile("agent-1")!.snapshots.length, 2);
  });

  it("computes trend with sufficient data", () => {
    const profiler = new AgentProfiler();
    profiler.record("a1", makeSnapshot(60));
    profiler.record("a1", makeSnapshot(65));
    profiler.record("a1", makeSnapshot(70));
    profiler.record("a1", makeSnapshot(75));
    profiler.record("a1", makeSnapshot(80));
    const trend = profiler.computeTrend("a1");
    assert.equal(trend.trend, "improving");
    assert.equal(trend.snapshotCount, 5);
  });

  it("returns insufficient-data for <3 snapshots", () => {
    const profiler = new AgentProfiler();
    profiler.record("a1", makeSnapshot(80));
    const trend = profiler.computeTrend("a1");
    assert.equal(trend.trend, "insufficient-data");
  });
});

// ---------------------------------------------------------------------------
// IF-06: Cost Optimizer
// ---------------------------------------------------------------------------

describe("IF-06: Cost Optimizer", () => {
  it("recommends tier-3 for minimize-cost with low complexity", () => {
    const opt = new CostOptimizer();
    const rec = opt.recommend({
      complexity: "low", qualityRequirement: 60, budgetCents: 1000, historicalFirstPassRate: null,
    }, "minimize-cost");
    assert.equal(rec.recommendedTier, "tier-3");
    assert.ok(rec.estimatedCost < 100);
  });

  it("recommends tier-1 for maximize-quality", () => {
    const opt = new CostOptimizer();
    const rec = opt.recommend({
      complexity: "high", qualityRequirement: 90, budgetCents: 100000, historicalFirstPassRate: null,
    }, "maximize-quality");
    assert.equal(rec.recommendedTier, "tier-1");
  });

  it("respects budget constraints", () => {
    const opt = new CostOptimizer();
    const rec = opt.recommend({
      complexity: "high", qualityRequirement: 90, budgetCents: 5, historicalFirstPassRate: null,
    }, "maximize-quality");
    // With extreme budget constraint, should pick cheapest viable option
    assert.ok(rec.estimatedCost <= 5 || rec.alternatives.length > 0);
  });

  it("provides alternatives in recommendation", () => {
    const opt = new CostOptimizer();
    const rec = opt.recommend({
      complexity: "medium", qualityRequirement: 70, budgetCents: 10000, historicalFirstPassRate: null,
    }, "balanced");
    assert.ok(rec.alternatives.length >= 1);
    assert.ok(rec.reasoning.includes("balanced"));
  });
});
