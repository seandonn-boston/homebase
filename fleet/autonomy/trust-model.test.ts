import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { TrustStage, TrustStore } from "./trust-model";

describe("TrustStore", () => {
	let store: TrustStore;

	beforeEach(() => {
		store = new TrustStore({
			minConsecutiveSuccesses: 3,
			minDecisionsForPromotion: 3,
		});
	});

	describe("initializeAgent", () => {
		it("creates records for each category at ManualOversight by default", () => {
			store.initializeAgent("agent-1", ["code", "security"]);
			const records = store.getAgentRecords("agent-1");
			assert.equal(records.length, 2);
			for (const r of records) {
				assert.equal(r.stage, TrustStage.ManualOversight);
				assert.equal(r.score, 0);
				assert.equal(r.consecutiveSuccesses, 0);
				assert.equal(r.totalDecisions, 0);
			}
		});

		it("creates records at a custom initial stage", () => {
			store.initializeAgent("agent-2", ["code"], TrustStage.AssistedAutomation);
			const record = store.getRecord("agent-2", "code");
			assert.ok(record);
			assert.equal(record.stage, TrustStage.AssistedAutomation);
		});

		it("does not overwrite existing records", () => {
			store.initializeAgent("agent-1", ["code"]);
			const r1 = store.getRecord("agent-1", "code")!;
			r1.score = 50;
			store.setRecord(r1);

			store.initializeAgent("agent-1", ["code"]);
			const r2 = store.getRecord("agent-1", "code")!;
			assert.equal(r2.score, 50);
		});
	});

	describe("recordDecision", () => {
		beforeEach(() => {
			store.initializeAgent("agent-1", ["code"]);
		});

		it("increments consecutiveSuccesses on success", () => {
			store.recordDecision("agent-1", "code", "success");
			const r = store.getRecord("agent-1", "code")!;
			assert.equal(r.consecutiveSuccesses, 1);
			assert.equal(r.consecutiveFailures, 0);
			assert.equal(r.totalDecisions, 1);
			assert.equal(r.score, 2);
		});

		it("resets consecutiveSuccesses on failure", () => {
			store.recordDecision("agent-1", "code", "success");
			store.recordDecision("agent-1", "code", "success");
			store.recordDecision("agent-1", "code", "failure");
			const r = store.getRecord("agent-1", "code")!;
			assert.equal(r.consecutiveSuccesses, 0);
			assert.equal(r.consecutiveFailures, 1);
		});

		it("partial outcome resets consecutive successes with mild penalty", () => {
			store.recordDecision("agent-1", "code", "success");
			store.recordDecision("agent-1", "code", "partial");
			const r = store.getRecord("agent-1", "code")!;
			assert.equal(r.consecutiveSuccesses, 0);
			assert.equal(r.score, 0); // clamped at 0 (was 2 - 3 = -1, but floor is 0)
		});

		it("clamps score to 0-100 range", () => {
			// Push score down past zero
			store.recordDecision("agent-1", "code", "failure");
			const r = store.getRecord("agent-1", "code")!;
			assert.ok(r.score >= 0);
		});

		it("throws for unknown agent/category", () => {
			assert.throws(
				() => store.recordDecision("no-agent", "code", "success"),
				/No trust record/,
			);
		});
	});

	describe("auto-demotion on failure", () => {
		it("demotes one stage on non-critical failure", () => {
			store.initializeAgent("agent-1", ["code"], TrustStage.PartialAutonomy);
			store.recordDecision("agent-1", "code", "failure");
			const r = store.getRecord("agent-1", "code")!;
			assert.equal(r.stage, TrustStage.AssistedAutomation);
			assert.equal(r.history.length, 1);
			assert.equal(r.history[0].reason, "failure");
		});

		it("does not demote below ManualOversight", () => {
			store.initializeAgent("agent-1", ["code"], TrustStage.ManualOversight);
			store.recordDecision("agent-1", "code", "failure");
			const r = store.getRecord("agent-1", "code")!;
			assert.equal(r.stage, TrustStage.ManualOversight);
			assert.equal(r.history.length, 0);
		});
	});

	describe("critical demotion (demoteAgent)", () => {
		it("drops to ManualOversight immediately", () => {
			store.initializeAgent("agent-1", ["code"], TrustStage.FullAutonomy);
			store.demoteAgent("agent-1", "code", "security breach");
			const r = store.getRecord("agent-1", "code")!;
			assert.equal(r.stage, TrustStage.ManualOversight);
			assert.equal(r.history.length, 1);
			assert.equal(r.history[0].from, TrustStage.FullAutonomy);
			assert.equal(r.history[0].to, TrustStage.ManualOversight);
		});

		it("throws for unknown agent", () => {
			assert.throws(
				() => store.demoteAgent("no-agent", "code", "reason"),
				/No trust record/,
			);
		});
	});

	describe("promoteAgent", () => {
		it("promotes agent one stage with sufficient successes", () => {
			store.initializeAgent("agent-1", ["code"]);
			for (let i = 0; i < 3; i++) {
				store.recordDecision("agent-1", "code", "success");
			}
			store.promoteAgent("agent-1", "code", "admin");
			const r = store.getRecord("agent-1", "code")!;
			assert.equal(r.stage, TrustStage.AssistedAutomation);
			assert.equal(r.history.length, 1);
			assert.equal(r.history[0].approvedBy, "admin");
		});

		it("rejects promotion without enough consecutive successes", () => {
			store.initializeAgent("agent-1", ["code"]);
			store.recordDecision("agent-1", "code", "success");
			assert.throws(
				() => store.promoteAgent("agent-1", "code", "admin"),
				/Insufficient consecutive successes/,
			);
		});

		it("rejects promotion without enough total decisions", () => {
			const strictStore = new TrustStore({
				minConsecutiveSuccesses: 1,
				minDecisionsForPromotion: 10,
			});
			strictStore.initializeAgent("agent-1", ["code"]);
			strictStore.recordDecision("agent-1", "code", "success");
			assert.throws(
				() => strictStore.promoteAgent("agent-1", "code", "admin"),
				/Insufficient total decisions/,
			);
		});

		it("rejects promotion at max stage", () => {
			store.initializeAgent("agent-1", ["code"], TrustStage.FullAutonomy);
			for (let i = 0; i < 3; i++) {
				store.recordDecision("agent-1", "code", "success");
			}
			assert.throws(
				() => store.promoteAgent("agent-1", "code", "admin"),
				/already at maximum/,
			);
		});
	});

	describe("getFleetTrustSummary", () => {
		it("returns correct summary for multiple agents", () => {
			store.initializeAgent("agent-1", ["code", "security"]);
			store.initializeAgent("agent-2", ["code"], TrustStage.PartialAutonomy);
			const summary = store.getFleetTrustSummary();
			assert.equal(summary.totalAgents, 2);
			assert.equal(summary.byStage[TrustStage.ManualOversight], 2);
			assert.equal(summary.byStage[TrustStage.PartialAutonomy], 1);
		});

		it("returns zero averageScore for empty store", () => {
			const summary = store.getFleetTrustSummary();
			assert.equal(summary.totalAgents, 0);
			assert.equal(summary.averageScore, 0);
		});

		it("counts recent promotions and demotions", () => {
			store.initializeAgent("agent-1", ["code"]);
			for (let i = 0; i < 3; i++) {
				store.recordDecision("agent-1", "code", "success");
			}
			store.promoteAgent("agent-1", "code", "admin");
			store.demoteAgent("agent-1", "code", "critical");
			const summary = store.getFleetTrustSummary();
			assert.equal(summary.recentPromotions, 1);
			assert.equal(summary.recentDemotions, 1);
		});
	});

	describe("serialization", () => {
		it("round-trips through serialize/deserialize", () => {
			store.initializeAgent("agent-1", ["code", "security"]);
			for (let i = 0; i < 3; i++) {
				store.recordDecision("agent-1", "code", "success");
			}
			store.promoteAgent("agent-1", "code", "admin");

			const json = store.serialize();
			const restored = TrustStore.deserialize(json);

			const original = store.getRecord("agent-1", "code")!;
			const restoredRecord = restored.getRecord("agent-1", "code")!;
			assert.equal(restoredRecord.stage, original.stage);
			assert.equal(restoredRecord.score, original.score);
			assert.equal(
				restoredRecord.consecutiveSuccesses,
				original.consecutiveSuccesses,
			);
			assert.equal(restoredRecord.history.length, original.history.length);

			assert.equal(restored.getAllRecords().length, 2);
		});

		it("preserves config through serialization", () => {
			const json = store.serialize();
			const restored = TrustStore.deserialize(json);
			// Config was minConsecutiveSuccesses=3, verify via promotion requiring 3
			restored.initializeAgent("agent-x", ["code"]);
			for (let i = 0; i < 3; i++) {
				restored.recordDecision("agent-x", "code", "success");
			}
			// Should not throw — 3 successes is enough
			restored.promoteAgent("agent-x", "code", "admin");
			const r = restored.getRecord("agent-x", "code")!;
			assert.equal(r.stage, TrustStage.AssistedAutomation);
		});
	});

	describe("getRecord / setRecord", () => {
		it("returns undefined for non-existent record", () => {
			assert.equal(store.getRecord("nope", "nope"), undefined);
		});

		it("setRecord overwrites existing record", () => {
			store.initializeAgent("agent-1", ["code"]);
			const r = store.getRecord("agent-1", "code")!;
			r.score = 99;
			store.setRecord(r);
			assert.equal(store.getRecord("agent-1", "code")!.score, 99);
		});
	});

	describe("getAllRecords", () => {
		it("returns all records across agents", () => {
			store.initializeAgent("a", ["x", "y"]);
			store.initializeAgent("b", ["z"]);
			assert.equal(store.getAllRecords().length, 3);
		});
	});
});
