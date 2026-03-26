import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { TrustStage, TrustStore } from "./trust-model";
import { TrustScoringEngine } from "./trust-scoring";

describe("TrustScoringEngine", () => {
	let store: TrustStore;
	let engine: TrustScoringEngine;

	beforeEach(() => {
		store = new TrustStore({
			minConsecutiveSuccesses: 5,
			minDecisionsForPromotion: 5,
		});
		engine = new TrustScoringEngine(store, {
			promotionThreshold: 5,
			promotionMinDays: 5,
			decayDays: 30,
		});
		store.initializeAgent("agent-1", ["code", "security", "testing"]);
	});

	describe("recordOutcome (AU-02)", () => {
		it("increments score on success with severity weighting", () => {
			const record = engine.recordOutcome(
				"agent-1",
				"code",
				"success",
				"medium",
			);
			assert.ok(record.score > 0);
			assert.equal(record.consecutiveSuccesses, 1);
		});

		it("decrements score on failure", () => {
			// Pump up the score first
			for (let i = 0; i < 5; i++)
				engine.recordOutcome("agent-1", "code", "success", "low");
			const before = store.getRecord("agent-1", "code")!.score;
			engine.recordOutcome("agent-1", "code", "failure", "medium");
			const after = store.getRecord("agent-1", "code")!.score;
			assert.ok(after < before);
		});

		it("critical failure has larger impact than low", () => {
			store.initializeAgent("agent-a", ["cat"]);
			store.initializeAgent("agent-b", ["cat"]);
			// Set both to same score
			for (let i = 0; i < 10; i++) {
				store.recordDecision("agent-a", "cat", "success");
				store.recordDecision("agent-b", "cat", "success");
			}
			const scoreBeforeA = store.getRecord("agent-a", "cat")!.score;
			const scoreBeforeB = store.getRecord("agent-b", "cat")!.score;
			assert.equal(scoreBeforeA, scoreBeforeB);

			engine.recordOutcome("agent-a", "cat", "failure", "low");
			engine.recordOutcome("agent-b", "cat", "failure", "critical");
			const scoreAfterA = store.getRecord("agent-a", "cat")!.score;
			const scoreAfterB = store.getRecord("agent-b", "cat")!.score;
			assert.ok(
				scoreAfterB < scoreAfterA,
				"critical should have larger negative impact",
			);
		});

		it("partial outcome resets consecutive successes", () => {
			engine.recordOutcome("agent-1", "code", "success", "low");
			engine.recordOutcome("agent-1", "code", "success", "low");
			engine.recordOutcome("agent-1", "code", "partial", "low");
			const record = store.getRecord("agent-1", "code")!;
			assert.equal(record.consecutiveSuccesses, 0);
		});

		it("throws for unknown agent/category", () => {
			assert.throws(
				() => engine.recordOutcome("nonexistent", "code", "success", "low"),
				/No trust record/,
			);
		});
	});

	describe("getPermissionLevel (AU-03)", () => {
		it("returns ManualOversight permissions for stage 1", () => {
			const perms = engine.getPermissionLevel("agent-1", "code");
			assert.equal(perms.stage, TrustStage.ManualOversight);
			assert.equal(perms.requiresApproval, true);
			assert.ok(perms.allowedActions.includes("read"));
			assert.ok(perms.allowedActions.includes("suggest"));
		});

		it("returns defaults for unknown agent", () => {
			const perms = engine.getPermissionLevel("ghost", "whatever");
			assert.equal(perms.stage, TrustStage.ManualOversight);
			assert.equal(perms.requiresApproval, true);
		});

		it("returns expanded permissions for higher stages", () => {
			store.initializeAgent("agent-high", ["code"], TrustStage.PartialAutonomy);
			const perms = engine.getPermissionLevel("agent-high", "code");
			assert.equal(perms.stage, TrustStage.PartialAutonomy);
			assert.equal(perms.requiresApproval, false);
			assert.ok(perms.allowedActions.includes("write"));
		});
	});

	describe("canActAutonomously (AU-03)", () => {
		it("returns false at ManualOversight stage", () => {
			assert.equal(engine.canActAutonomously("agent-1", "code", "low"), false);
		});

		it("returns false at AssistedAutomation stage", () => {
			store.initializeAgent(
				"agent-aa",
				["code"],
				TrustStage.AssistedAutomation,
			);
			assert.equal(engine.canActAutonomously("agent-aa", "code", "low"), false);
		});

		it("returns true for low risk at PartialAutonomy", () => {
			store.initializeAgent("agent-pa", ["code"], TrustStage.PartialAutonomy);
			assert.equal(engine.canActAutonomously("agent-pa", "code", "low"), true);
		});

		it("returns true for medium risk at PartialAutonomy", () => {
			store.initializeAgent("agent-pa", ["code"], TrustStage.PartialAutonomy);
			assert.equal(
				engine.canActAutonomously("agent-pa", "code", "medium"),
				true,
			);
		});

		it("returns false for high risk at PartialAutonomy", () => {
			store.initializeAgent("agent-pa", ["code"], TrustStage.PartialAutonomy);
			assert.equal(
				engine.canActAutonomously("agent-pa", "code", "high"),
				false,
			);
		});

		it("returns true for high risk at FullAutonomy", () => {
			store.initializeAgent("agent-fa", ["code"], TrustStage.FullAutonomy);
			assert.equal(engine.canActAutonomously("agent-fa", "code", "high"), true);
		});

		it("returns false for unknown agent", () => {
			assert.equal(engine.canActAutonomously("ghost", "code", "low"), false);
		});
	});

	describe("handleFailure / demotion (AU-04)", () => {
		it("demotes on critical failure", () => {
			store.initializeAgent("agent-crit", ["code"], TrustStage.PartialAutonomy);
			const result = engine.handleFailure("agent-crit", "code", "critical");
			assert.equal(result.demoted, true);
			assert.equal(result.newStage, TrustStage.ManualOversight);
		});

		it("does not demote below ManualOversight", () => {
			const result = engine.handleFailure("agent-1", "code", "critical");
			assert.equal(result.demoted, false);
		});

		it("demotes on 3+ consecutive low/medium failures", () => {
			store.initializeAgent("agent-3f", ["code"], TrustStage.PartialAutonomy);
			// Use recordOutcome which tracks failures and triggers handleFailure internally
			engine.recordOutcome("agent-3f", "code", "failure", "low");
			engine.recordOutcome("agent-3f", "code", "failure", "low");
			// Third failure should trigger the 3+ consecutive failure demotion
			engine.recordOutcome("agent-3f", "code", "failure", "low");
			const record = store.getRecord("agent-3f", "code")!;
			assert.ok(
				record.stage < TrustStage.PartialAutonomy,
				"Should have been demoted from PartialAutonomy",
			);
		});
	});

	describe("handleModelChange (AU-04)", () => {
		it("reverts all categories to stage 2", () => {
			store.initializeAgent(
				"agent-mc",
				["code", "security"],
				TrustStage.FullAutonomy,
			);
			engine.handleModelChange("agent-mc");
			const codeRecord = store.getRecord("agent-mc", "code")!;
			const secRecord = store.getRecord("agent-mc", "security")!;
			assert.equal(codeRecord.stage, TrustStage.AssistedAutomation);
			assert.equal(secRecord.stage, TrustStage.AssistedAutomation);
		});

		it("does not demote if already at stage 2 or below", () => {
			store.initializeAgent("agent-low", ["code"], TrustStage.ManualOversight);
			engine.handleModelChange("agent-low");
			assert.equal(
				store.getRecord("agent-low", "code")!.stage,
				TrustStage.ManualOversight,
			);
		});

		it("resets consecutive successes on model change", () => {
			store.initializeAgent("agent-mc2", ["code"], TrustStage.FullAutonomy);
			for (let i = 0; i < 5; i++)
				store.recordDecision("agent-mc2", "code", "success");
			engine.handleModelChange("agent-mc2");
			assert.equal(
				store.getRecord("agent-mc2", "code")!.consecutiveSuccesses,
				0,
			);
		});
	});

	describe("handleSecurityIncident (AU-04)", () => {
		it("reverts security categories to stage 1", () => {
			store.initializeAgent(
				"agent-sec",
				["security", "code"],
				TrustStage.FullAutonomy,
			);
			engine.handleSecurityIncident("agent-sec");
			assert.equal(
				store.getRecord("agent-sec", "security")!.stage,
				TrustStage.ManualOversight,
			);
		});

		it("leaves non-security categories untouched", () => {
			store.initializeAgent(
				"agent-sec2",
				["security", "code"],
				TrustStage.FullAutonomy,
			);
			engine.handleSecurityIncident("agent-sec2");
			assert.equal(
				store.getRecord("agent-sec2", "code")!.stage,
				TrustStage.FullAutonomy,
			);
		});
	});

	describe("checkPromotionEligibility (AU-05)", () => {
		it("returns eligible when all criteria met", () => {
			store.initializeAgent(
				"agent-promo",
				["code"],
				TrustStage.AssistedAutomation,
			);
			for (let i = 0; i < 6; i++)
				store.recordDecision("agent-promo", "code", "success");
			const result = engine.checkPromotionEligibility("agent-promo", "code");
			assert.equal(result.eligible, true);
			assert.ok(result.currentStreak >= 5);
		});

		it("returns ineligible with insufficient successes", () => {
			store.initializeAgent("agent-promo2", ["code"]);
			store.recordDecision("agent-promo2", "code", "success");
			const result = engine.checkPromotionEligibility("agent-promo2", "code");
			assert.equal(result.eligible, false);
			assert.ok(result.reason.includes("Insufficient consecutive"));
		});

		it("returns ineligible at max stage", () => {
			store.initializeAgent("agent-max", ["code"], TrustStage.FullAutonomy);
			const result = engine.checkPromotionEligibility("agent-max", "code");
			assert.equal(result.eligible, false);
			assert.ok(result.reason.includes("maximum"));
		});

		it("returns ineligible for unknown agent", () => {
			const result = engine.checkPromotionEligibility("ghost", "code");
			assert.equal(result.eligible, false);
		});
	});

	describe("requestPromotion (AU-05)", () => {
		it("promotes when eligible", () => {
			store.initializeAgent("agent-p", ["code"], TrustStage.AssistedAutomation);
			for (let i = 0; i < 6; i++)
				store.recordDecision("agent-p", "code", "success");
			const result = engine.requestPromotion("agent-p", "code", "admiral");
			assert.equal(result.promoted, true);
			assert.equal(result.newStage, TrustStage.PartialAutonomy);
		});

		it("rejects when not eligible", () => {
			const result = engine.requestPromotion("agent-1", "code", "admiral");
			assert.equal(result.promoted, false);
			assert.equal(result.newStage, TrustStage.ManualOversight);
		});
	});

	describe("applyDecay", () => {
		it("decays inactive records by one stage", () => {
			const decayEngine = new TrustScoringEngine(store, { decayDays: 0 }); // 0 days = immediate decay for testing
			store.initializeAgent(
				"agent-decay",
				["code"],
				TrustStage.PartialAutonomy,
			);
			// Backdate lastUpdated
			const record = store.getRecord("agent-decay", "code")!;
			record.lastUpdated = Date.now() - 100_000; // well past 0 days threshold
			const result = decayEngine.applyDecay();
			assert.ok(result.decayed.length > 0);
			assert.equal(
				store.getRecord("agent-decay", "code")!.stage,
				TrustStage.AssistedAutomation,
			);
		});

		it("does not decay ManualOversight records", () => {
			const decayEngine = new TrustScoringEngine(store, { decayDays: 0 });
			const record = store.getRecord("agent-1", "code")!;
			record.lastUpdated = Date.now() - 100_000;
			const result = decayEngine.applyDecay();
			const decayedIds = result.decayed.map(
				(r) => `${r.agentId}::${r.category}`,
			);
			assert.ok(!decayedIds.includes("agent-1::code"));
		});

		it("does not decay recently active records", () => {
			store.initializeAgent("agent-active", ["code"], TrustStage.FullAutonomy);
			const result = engine.applyDecay(); // default 30 day decay
			const decayedIds = result.decayed.map(
				(r) => `${r.agentId}::${r.category}`,
			);
			assert.ok(!decayedIds.includes("agent-active::code"));
		});
	});
});
