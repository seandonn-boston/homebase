import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DegradationEngine } from "./degradation";

describe("DegradationEngine", () => {
	let engine: DegradationEngine;

	beforeEach(() => {
		engine = new DegradationEngine();
	});

	describe("initial state", () => {
		it("returns healthy for unknown agent", () => {
			assert.equal(engine.getStatus("agent-x"), "healthy");
		});

		it("creates default policy on first access", () => {
			const policy = engine.getPolicy("agent-x");
			assert.equal(policy.agentId, "agent-x");
			assert.equal(policy.status, "healthy");
			assert.equal(policy.consecutiveFailures, 0);
			assert.equal(policy.maxRetries, 4);
		});

		it("returns empty policies list initially", () => {
			assert.equal(engine.getAllPolicies().length, 0);
		});
	});

	describe("recordFailure", () => {
		it("increments consecutive failures on first failure", () => {
			const policy = engine.recordFailure("agent-a");
			assert.equal(policy.consecutiveFailures, 1);
			assert.equal(policy.status, "degraded");
		});

		it("sets lastFailure timestamp", () => {
			const before = Date.now();
			const policy = engine.recordFailure("agent-a");
			assert.ok(policy.lastFailure !== undefined);
			assert.ok(policy.lastFailure! >= before);
		});

		it("transitions to blocked after maxRetries with blocked policy", () => {
			engine.setPolicy("agent-a", "blocked");
			engine.recordFailure("agent-a");
			engine.recordFailure("agent-a");
			engine.recordFailure("agent-a");
			const policy = engine.recordFailure("agent-a");
			assert.equal(policy.consecutiveFailures, 4);
			assert.equal(policy.status, "blocked");
		});

		it("stays degraded after maxRetries with degraded policy", () => {
			engine.setPolicy("agent-a", "degraded");
			engine.recordFailure("agent-a");
			engine.recordFailure("agent-a");
			engine.recordFailure("agent-a");
			const policy = engine.recordFailure("agent-a");
			assert.equal(policy.consecutiveFailures, 4);
			assert.equal(policy.status, "degraded");
		});

		it("logs a non-cascading warning per failure", () => {
			engine.recordFailure("agent-a");
			const warnings = engine.getWarnings();
			assert.equal(warnings.length, 1);
			assert.ok(warnings[0].includes("NOT blocked"));
		});
	});

	describe("recordSuccess", () => {
		it("moves blocked agent to recovering on first success", () => {
			engine.setPolicy("agent-a", "blocked");
			for (let i = 0; i < 4; i++) engine.recordFailure("agent-a");
			assert.equal(engine.getStatus("agent-a"), "blocked");

			engine.recordSuccess("agent-a");
			assert.equal(engine.getStatus("agent-a"), "recovering");
		});

		it("moves degraded agent to recovering on first success", () => {
			engine.recordFailure("agent-a");
			assert.equal(engine.getStatus("agent-a"), "degraded");

			engine.recordSuccess("agent-a");
			assert.equal(engine.getStatus("agent-a"), "recovering");
		});

		it("moves recovering to healthy after two consecutive successes", () => {
			engine.recordFailure("agent-a");
			engine.recordSuccess("agent-a"); // -> recovering
			assert.equal(engine.getStatus("agent-a"), "recovering");

			engine.recordSuccess("agent-a"); // -> healthy
			assert.equal(engine.getStatus("agent-a"), "healthy");
		});

		it("resets consecutive failures on full recovery", () => {
			engine.recordFailure("agent-a");
			engine.recordFailure("agent-a");
			engine.recordSuccess("agent-a");
			engine.recordSuccess("agent-a");
			const policy = engine.getPolicy("agent-a");
			assert.equal(policy.consecutiveFailures, 0);
			assert.equal(policy.status, "healthy");
		});

		it("does nothing for already healthy agent", () => {
			const policy = engine.recordSuccess("agent-a");
			assert.equal(policy.status, "healthy");
		});
	});

	describe("shouldRetry", () => {
		it("returns retry=true, delay=0 for healthy agent", () => {
			const result = engine.shouldRetry("agent-a");
			assert.equal(result.retry, true);
			assert.equal(result.delayMs, 0);
		});

		it("returns retry=false for blocked agent", () => {
			engine.setPolicy("agent-a", "blocked");
			for (let i = 0; i < 4; i++) engine.recordFailure("agent-a");
			const result = engine.shouldRetry("agent-a");
			assert.equal(result.retry, false);
		});

		it("returns exponential backoff delay for degraded agent", () => {
			engine.recordFailure("agent-a");
			const r1 = engine.shouldRetry("agent-a");
			assert.equal(r1.retry, true);
			assert.equal(r1.delayMs, 1000);

			engine.recordFailure("agent-a");
			const r2 = engine.shouldRetry("agent-a");
			assert.equal(r2.delayMs, 2000);

			engine.recordFailure("agent-a");
			const r3 = engine.shouldRetry("agent-a");
			assert.equal(r3.delayMs, 4000);
		});

		it("caps backoff at 30s", () => {
			engine.configure("agent-a", { backoffMs: [50000, 60000] });
			engine.recordFailure("agent-a");
			const result = engine.shouldRetry("agent-a");
			assert.equal(result.delayMs, 30000);
		});
	});

	describe("reset", () => {
		it("removes all state for an agent", () => {
			engine.recordFailure("agent-a");
			engine.recordFailure("agent-a");
			engine.reset("agent-a");
			assert.equal(engine.getStatus("agent-a"), "healthy");
			assert.equal(engine.getPolicy("agent-a").consecutiveFailures, 0);
		});
	});

	describe("configure", () => {
		it("allows custom maxRetries", () => {
			engine.configure("agent-a", { maxRetries: 2 });
			engine.setPolicy("agent-a", "blocked");
			engine.recordFailure("agent-a");
			engine.recordFailure("agent-a");
			assert.equal(engine.getStatus("agent-a"), "blocked");
		});

		it("allows custom backoff schedule", () => {
			engine.configure("agent-a", { backoffMs: [100, 200, 400] });
			engine.recordFailure("agent-a");
			assert.equal(engine.shouldRetry("agent-a").delayMs, 100);
		});
	});

	describe("getAllPolicies", () => {
		it("returns all tracked agents", () => {
			engine.recordFailure("agent-a");
			engine.recordFailure("agent-b");
			const all = engine.getAllPolicies();
			assert.equal(all.length, 2);
			const ids = all.map((p) => p.agentId).sort();
			assert.deepEqual(ids, ["agent-a", "agent-b"]);
		});
	});

	describe("no cascading failures", () => {
		it("one agent blocked does not affect another agent", () => {
			engine.setPolicy("agent-a", "blocked");
			for (let i = 0; i < 4; i++) engine.recordFailure("agent-a");
			assert.equal(engine.getStatus("agent-a"), "blocked");
			assert.equal(engine.getStatus("agent-b"), "healthy");
			assert.equal(engine.shouldRetry("agent-b").retry, true);
		});
	});
});
