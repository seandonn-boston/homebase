import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	RegressionTestSuite,
	createSeededSuite,
} from "./regression-test-suite";
import type { RegressionTest } from "./regression-test-suite";

describe("RegressionTestSuite", () => {
	let suite: RegressionTestSuite;

	beforeEach(() => {
		suite = new RegressionTestSuite();
	});

	describe("test registration", () => {
		it("registers and retrieves tests", () => {
			const test: RegressionTest = {
				id: "TEST-001",
				issueRef: "ATK-0001",
				title: "Test injection",
				category: "injection",
				severity: "critical",
				defense: "prohibitions_enforcer",
				testFn: () => ({
					id: "TEST-001",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			};
			suite.addTest(test);
			assert.equal(suite.getAllTests().length, 1);
			assert.equal(suite.getAllTests()[0].id, "TEST-001");
		});

		it("creates registry entry on registration", () => {
			suite.addTest({
				id: "TEST-001",
				issueRef: "ATK-0001",
				title: "Test",
				category: "injection",
				severity: "critical",
				defense: "test",
				testFn: () => ({
					id: "TEST-001",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			});
			const entry = suite.getTestForIssue("ATK-0001");
			assert.ok(entry);
			assert.equal(entry.testId, "TEST-001");
			assert.ok(entry.addedAt);
		});
	});

	describe("runAll", () => {
		it("runs all registered tests", () => {
			suite.addTest({
				id: "T1",
				issueRef: "I1",
				title: "Pass test",
				category: "injection",
				severity: "low",
				defense: "d1",
				testFn: () => ({
					id: "T1",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			});
			suite.addTest({
				id: "T2",
				issueRef: "I2",
				title: "Fail test",
				category: "privilege",
				severity: "high",
				defense: "d2",
				testFn: () => ({
					id: "T2",
					passed: false,
					defenseHeld: false,
					details: "regression",
					durationMs: 0,
				}),
			});
			const summary = suite.runAll();
			assert.equal(summary.totalTests, 2);
			assert.equal(summary.passed, 1);
			assert.equal(summary.failed, 1);
			assert.equal(summary.blocking, true);
		});

		it("non-blocking when all pass", () => {
			suite.addTest({
				id: "T1",
				issueRef: "I1",
				title: "Pass",
				category: "injection",
				severity: "low",
				defense: "d1",
				testFn: () => ({
					id: "T1",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			});
			const summary = suite.runAll();
			assert.equal(summary.blocking, false);
		});

		it("handles test exceptions gracefully", () => {
			suite.addTest({
				id: "T1",
				issueRef: "I1",
				title: "Crash test",
				category: "injection",
				severity: "low",
				defense: "d1",
				testFn: () => {
					throw new Error("test crashed");
				},
			});
			const summary = suite.runAll();
			assert.equal(summary.failed, 1);
			assert.ok(summary.results[0].details.includes("test crashed"));
		});

		it("updates registry on run", () => {
			suite.addTest({
				id: "T1",
				issueRef: "I1",
				title: "Test",
				category: "injection",
				severity: "low",
				defense: "d1",
				testFn: () => ({
					id: "T1",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			});
			suite.runAll();
			const entry = suite.getTestForIssue("I1");
			assert.ok(entry?.lastRun);
			assert.equal(entry?.lastResult, "pass");
		});
	});

	describe("runByCategory", () => {
		it("runs only tests in specified category", () => {
			suite.addTest({
				id: "T1",
				issueRef: "I1",
				title: "Injection",
				category: "injection",
				severity: "low",
				defense: "d1",
				testFn: () => ({
					id: "T1",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			});
			suite.addTest({
				id: "T2",
				issueRef: "I2",
				title: "Privilege",
				category: "privilege",
				severity: "low",
				defense: "d2",
				testFn: () => ({
					id: "T2",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			});
			const summary = suite.runByCategory("injection");
			assert.equal(summary.totalTests, 1);
			assert.equal(summary.results[0].id, "T1");
		});
	});

	describe("registry", () => {
		it("returns all registry entries", () => {
			suite.addTest({
				id: "T1",
				issueRef: "ATK-0001",
				title: "Test",
				category: "injection",
				severity: "low",
				defense: "d1",
				testFn: () => ({
					id: "T1",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			});
			suite.addTest({
				id: "T2",
				issueRef: "ATK-0003",
				title: "Test2",
				category: "privilege",
				severity: "low",
				defense: "d2",
				testFn: () => ({
					id: "T2",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			});
			const entries = suite.getRegistry();
			assert.equal(entries.length, 2);
		});

		it("returns undefined for unknown issue", () => {
			assert.equal(suite.getTestForIssue("unknown"), undefined);
		});
	});

	describe("hasTestForScenario", () => {
		it("returns true when scenario has test", () => {
			suite.addTest({
				id: "T1",
				issueRef: "I1",
				scenarioRef: "ATK-0001",
				title: "Test",
				category: "injection",
				severity: "low",
				defense: "d1",
				testFn: () => ({
					id: "T1",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			});
			assert.equal(suite.hasTestForScenario("ATK-0001"), true);
			assert.equal(suite.hasTestForScenario("ATK-9999"), false);
		});
	});

	describe("run history", () => {
		it("tracks multiple runs", () => {
			suite.addTest({
				id: "T1",
				issueRef: "I1",
				title: "Test",
				category: "injection",
				severity: "low",
				defense: "d1",
				testFn: () => ({
					id: "T1",
					passed: true,
					defenseHeld: true,
					details: "ok",
					durationMs: 0,
				}),
			});
			suite.runAll();
			suite.runAll();
			assert.equal(suite.getRunHistory().length, 2);
		});
	});
});

describe("createSeededSuite", () => {
	it("creates a suite with at least 5 seeded tests", () => {
		const suite = createSeededSuite();
		assert.ok(suite.getAllTests().length >= 5);
	});

	it("all seeded tests pass (defenses hold)", () => {
		const suite = createSeededSuite();
		const summary = suite.runAll();
		assert.equal(summary.failed, 0, `${summary.failed} seeded tests failed`);
		assert.equal(summary.blocking, false);
	});

	it("covers injection and privilege categories", () => {
		const suite = createSeededSuite();
		const tests = suite.getAllTests();
		const categories = new Set(tests.map((t) => t.category));
		assert.ok(categories.has("injection"));
		assert.ok(categories.has("privilege"));
	});

	it("maps to attack corpus entries", () => {
		const suite = createSeededSuite();
		assert.ok(suite.hasTestForScenario("ATK-0001"));
		assert.ok(suite.hasTestForScenario("ATK-0003"));
		assert.ok(suite.hasTestForScenario("ATK-0010"));
	});

	it("registry maps ATK IDs to tests", () => {
		const suite = createSeededSuite();
		const entry = suite.getTestForIssue("ATK-0001");
		assert.ok(entry);
		assert.equal(entry.testId, "REG-001");
	});
});
