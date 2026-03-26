/**
 * Tests for Trust Operations (AU-06 to AU-11).
 */

import { describe, it, beforeEach } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { TrustStore, TrustStage } from "./trust-model";
import { TrustScoringEngine } from "./trust-scoring";
import {
  TrustPersistence,
  TrustDashboard,
  TrustOverride,
  TrustAwareRouter,
  TrustReporter,
  TrustApprovalApi,
} from "./trust-operations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore(): TrustStore {
  const store = new TrustStore({ minConsecutiveSuccesses: 3, minDecisionsForPromotion: 3 });
  store.initializeAgent("agent-1", ["code", "deploy", "security"]);
  store.initializeAgent("agent-2", ["code", "deploy"]);
  return store;
}

function makeScoring(store: TrustStore): TrustScoringEngine {
  return new TrustScoringEngine(store, {
    promotionThreshold: 3,
    promotionMinDays: 3,
    decayDays: 30,
    criticalFailureDemotionStage: TrustStage.ManualOversight,
  });
}

function buildUpAgent(store: TrustStore, agentId: string, category: string, successes: number): void {
  for (let i = 0; i < successes; i++) {
    store.recordDecision(agentId, category, "success");
  }
}

// ---------------------------------------------------------------------------
// AU-06: TrustPersistence
// ---------------------------------------------------------------------------

describe("TrustPersistence", () => {
  it("saves and loads trust state", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "helm-trust-"));
    try {
      const store = makeStore();
      buildUpAgent(store, "agent-1", "code", 5);

      const persistence = new TrustPersistence(store, tmpDir);
      await persistence.save();

      // Create new store and load
      const newStore = new TrustStore({ minConsecutiveSuccesses: 3, minDecisionsForPromotion: 3 });
      const newPersistence = new TrustPersistence(newStore, tmpDir);
      await newPersistence.load();

      const record = newStore.getRecord("agent-1", "code");
      assert.ok(record !== undefined);
      assert.equal(record.consecutiveSuccesses, 5);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("load is no-op when file does not exist", async () => {
    const tmpDir = path.join(os.tmpdir(), "nonexistent-trust-dir-" + Date.now());
    const store = makeStore();
    const persistence = new TrustPersistence(store, tmpDir);
    await persistence.load(); // should not throw
  });

  it("applyDecay demotes inactive categories", () => {
    const store = makeStore();
    // Set lastUpdated to 60 days ago
    const record = store.getRecord("agent-1", "code")!;
    record.lastUpdated = Date.now() - 60 * 24 * 60 * 60 * 1000;
    record.stage = TrustStage.AssistedAutomation;

    const persistence = new TrustPersistence(store, "/tmp/unused");
    const decayed = persistence.applyDecay(30);
    assert.ok(decayed.length > 0);
    assert.equal(decayed[0].stage, TrustStage.ManualOversight);
  });
});

// ---------------------------------------------------------------------------
// AU-07: TrustDashboard
// ---------------------------------------------------------------------------

describe("TrustDashboard", () => {
  it("getAgentView returns categories for an agent", () => {
    const store = makeStore();
    const scoring = makeScoring(store);
    const dashboard = new TrustDashboard(store, scoring);

    const view = dashboard.getAgentView("agent-1");
    assert.equal(view.agentId, "agent-1");
    assert.equal(view.categories.length, 3);
  });

  it("getFleetView returns fleet-wide summary", () => {
    const store = makeStore();
    const scoring = makeScoring(store);
    const dashboard = new TrustDashboard(store, scoring);

    const view = dashboard.getFleetView();
    assert.equal(view.totalAgents, 2);
    assert.ok(view.autonomyMatrix.length > 0);
  });

  it("getPromotionCandidates returns eligible agents", () => {
    const store = makeStore();
    const scoring = makeScoring(store);
    buildUpAgent(store, "agent-1", "code", 5);

    const dashboard = new TrustDashboard(store, scoring);
    const candidates = dashboard.getPromotionCandidates();
    assert.ok(candidates.some((c) => c.agentId === "agent-1" && c.category === "code"));
  });

  it("getDecayWarnings returns agents approaching decay", () => {
    const store = makeStore();
    const scoring = makeScoring(store);
    // Set lastUpdated to 25 days ago
    const record = store.getRecord("agent-1", "code")!;
    record.lastUpdated = Date.now() - 25 * 24 * 60 * 60 * 1000;
    record.stage = TrustStage.AssistedAutomation;

    const dashboard = new TrustDashboard(store, scoring);
    const warnings = dashboard.getDecayWarnings(20);
    assert.ok(warnings.length > 0);
  });
});

// ---------------------------------------------------------------------------
// AU-08: TrustOverride
// ---------------------------------------------------------------------------

describe("TrustOverride", () => {
  it("overrides trust stage and records history", () => {
    const store = makeStore();
    const override = new TrustOverride(store);

    const result = override.override(
      "agent-1",
      "code",
      TrustStage.PartialAutonomy,
      "admin",
      "emergency promotion",
    );
    assert.equal(result.stage, TrustStage.PartialAutonomy);
    assert.ok(result.history.length > 0);
    assert.ok(result.history[result.history.length - 1].reason.includes("override"));
  });

  it("getOverrides returns all override entries", () => {
    const store = makeStore();
    const override = new TrustOverride(store);
    override.override("agent-1", "code", TrustStage.AssistedAutomation, "admin", "reason-a");
    override.override("agent-2", "deploy", TrustStage.PartialAutonomy, "admin", "reason-b");
    assert.equal(override.getOverrides().length, 2);
  });

  it("throws for unknown agent/category", () => {
    const store = makeStore();
    const override = new TrustOverride(store);
    assert.throws(
      () => override.override("unknown", "code", TrustStage.AssistedAutomation, "admin", "test"),
      /No trust record/,
    );
  });
});

// ---------------------------------------------------------------------------
// AU-09: TrustAwareRouter
// ---------------------------------------------------------------------------

describe("TrustAwareRouter", () => {
  it("meetsMinimumTrust checks agent trust stage", () => {
    const store = makeStore();
    const router = new TrustAwareRouter(store);
    assert.equal(
      router.meetsMinimumTrust("agent-1", "code", TrustStage.ManualOversight),
      true,
    );
    assert.equal(
      router.meetsMinimumTrust("agent-1", "code", TrustStage.AssistedAutomation),
      false,
    );
  });

  it("filterByTrust returns only qualifying agents", () => {
    const store = makeStore();
    // Promote agent-1 in code
    buildUpAgent(store, "agent-1", "code", 10);
    store.promoteAgent("agent-1", "code", "admin");

    const router = new TrustAwareRouter(store);
    const filtered = router.filterByTrust(
      ["agent-1", "agent-2"],
      "code",
      TrustStage.AssistedAutomation,
    );
    assert.ok(filtered.includes("agent-1"));
    assert.ok(!filtered.includes("agent-2"));
  });

  it("getBestTrustedAgent returns highest scoring agent", () => {
    const store = makeStore();
    buildUpAgent(store, "agent-1", "code", 5);
    buildUpAgent(store, "agent-2", "code", 2);

    const router = new TrustAwareRouter(store);
    const best = router.getBestTrustedAgent(["agent-1", "agent-2"], "code");
    assert.equal(best, "agent-1");
  });

  it("getBestTrustedAgent returns null when no records exist", () => {
    const store = makeStore();
    const router = new TrustAwareRouter(store);
    assert.equal(router.getBestTrustedAgent(["unknown-1"], "code"), null);
  });
});

// ---------------------------------------------------------------------------
// AU-10: TrustReporter
// ---------------------------------------------------------------------------

describe("TrustReporter", () => {
  it("generates a report with trust distribution", () => {
    const store = makeStore();
    const reporter = new TrustReporter(store);
    const report = reporter.generateReport();
    assert.equal(report.totalAgents, 2);
    assert.ok(report.categories.length > 0);
    assert.ok(report.timestamp > 0);
  });

  it("counts demotions and overrides", () => {
    const store = makeStore();
    buildUpAgent(store, "agent-1", "code", 10);
    store.promoteAgent("agent-1", "code", "admin");
    store.demoteAgent("agent-1", "code", "test demotion");

    const reporter = new TrustReporter(store);
    const report = reporter.generateReport();
    assert.ok(report.demotionFrequency >= 1);
  });

  it("reports category-level averages", () => {
    const store = makeStore();
    buildUpAgent(store, "agent-1", "code", 5);

    const reporter = new TrustReporter(store);
    const report = reporter.generateReport();
    const codeCategory = report.categories.find((c) => c.category === "code");
    assert.ok(codeCategory !== undefined);
    assert.ok(codeCategory.avgScore >= 0);
  });
});

// ---------------------------------------------------------------------------
// AU-11: TrustApprovalApi
// ---------------------------------------------------------------------------

describe("TrustApprovalApi", () => {
  it("getPendingPromotions returns eligible agents", () => {
    const store = makeStore();
    const scoring = makeScoring(store);
    buildUpAgent(store, "agent-1", "code", 5);

    const api = new TrustApprovalApi(scoring, store);
    const pending = api.getPendingPromotions();
    assert.ok(pending.some((p) => p.agentId === "agent-1"));
  });

  it("approvePromotion promotes the agent", () => {
    const store = makeStore();
    const scoring = makeScoring(store);
    buildUpAgent(store, "agent-1", "code", 5);

    const api = new TrustApprovalApi(scoring, store);
    const result = api.approvePromotion("agent-1", "code", "admin", "good track record");
    assert.equal(result.promoted, true);
    assert.equal(result.newStage, TrustStage.AssistedAutomation);
  });

  it("deferPromotion hides agent from pending list", () => {
    const store = makeStore();
    const scoring = makeScoring(store);
    buildUpAgent(store, "agent-1", "code", 5);

    const api = new TrustApprovalApi(scoring, store);
    api.deferPromotion("agent-1", "code", "needs more evaluation");
    const pending = api.getPendingPromotions();
    assert.ok(!pending.some((p) => p.agentId === "agent-1" && p.category === "code"));
  });

  it("approvePromotion clears deferred state", () => {
    const store = makeStore();
    const scoring = makeScoring(store);
    buildUpAgent(store, "agent-1", "code", 5);

    const api = new TrustApprovalApi(scoring, store);
    api.deferPromotion("agent-1", "code", "wait");
    // Now approve
    const result = api.approvePromotion("agent-1", "code", "admin", "approved");
    assert.equal(result.promoted, true);
  });
});
