/**
 * Tests for AttackCorpus (SEC-01)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AttackCorpus, type AttackScenario } from "./attack-corpus.js";

describe("AttackCorpus", () => {
	describe("scenario management", () => {
		it("should add and retrieve a scenario", () => {
			const corpus = new AttackCorpus();
			const scenario: AttackScenario = {
				id: "ATK-TEST",
				name: "Test scenario",
				category: "injection",
				severity: "high",
				description: "A test attack",
				trigger: "test input",
				expectedDefense: "block it",
				timesPassed: 0,
				timesFailed: 0,
			};
			corpus.addScenario(scenario);
			assert.deepEqual(corpus.getScenario("ATK-TEST"), scenario);
		});

		it("should return undefined for unknown scenario", () => {
			const corpus = new AttackCorpus();
			assert.equal(corpus.getScenario("ATK-NOPE"), undefined);
		});

		it("should list all scenarios", () => {
			const corpus = new AttackCorpus();
			corpus.addScenario({
				id: "ATK-A",
				name: "A",
				category: "injection",
				severity: "low",
				description: "",
				trigger: "",
				expectedDefense: "",
				timesPassed: 0,
				timesFailed: 0,
			});
			corpus.addScenario({
				id: "ATK-B",
				name: "B",
				category: "privilege",
				severity: "high",
				description: "",
				trigger: "",
				expectedDefense: "",
				timesPassed: 0,
				timesFailed: 0,
			});
			assert.equal(corpus.getAllScenarios().length, 2);
		});

		it("should filter by category", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			const mcpScenarios = corpus.getByCategory("mcp");
			assert.ok(mcpScenarios.length > 0);
			assert.ok(mcpScenarios.every((s) => s.category === "mcp"));
		});
	});

	describe("result tracking", () => {
		it("should record a passing result", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			corpus.recordResult({
				scenarioId: "ATK-0001",
				passed: true,
				defenseActivated: true,
				details: "Injection blocked successfully",
				timestamp: Date.now(),
			});
			const scenario = corpus.getScenario("ATK-0001");
			assert.equal(scenario!.timesPassed, 1);
			assert.equal(scenario!.timesFailed, 0);
		});

		it("should record a failing result", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			corpus.recordResult({
				scenarioId: "ATK-0001",
				passed: false,
				defenseActivated: false,
				details: "Injection bypassed defense",
				timestamp: Date.now(),
			});
			const scenario = corpus.getScenario("ATK-0001");
			assert.equal(scenario!.timesFailed, 1);
		});

		it("should update lastTested on result", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			const before = corpus.getScenario("ATK-0001")!.lastTested;
			corpus.recordResult({
				scenarioId: "ATK-0001",
				passed: true,
				defenseActivated: true,
				details: "OK",
				timestamp: Date.now(),
			});
			assert.ok(corpus.getScenario("ATK-0001")!.lastTested! > (before ?? 0));
		});
	});

	describe("getReport", () => {
		it("should show all untested for fresh corpus", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			const report = corpus.getReport();
			assert.equal(report.total, 30);
			assert.equal(report.untested, 30);
			assert.equal(report.passed, 0);
			assert.equal(report.failed, 0);
		});

		it("should track passed/failed correctly", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			corpus.recordResult({
				scenarioId: "ATK-0001",
				passed: true,
				defenseActivated: true,
				details: "",
				timestamp: Date.now(),
			});
			corpus.recordResult({
				scenarioId: "ATK-0002",
				passed: false,
				defenseActivated: false,
				details: "",
				timestamp: Date.now(),
			});
			const report = corpus.getReport();
			assert.equal(report.passed, 1);
			assert.equal(report.failed, 1);
			assert.equal(report.untested, 28);
		});

		it("should break down by severity", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			corpus.recordResult({
				scenarioId: "ATK-0001",
				passed: true,
				defenseActivated: true,
				details: "",
				timestamp: Date.now(),
			});
			const report = corpus.getReport();
			assert.ok("critical" in report.bySeverity);
			assert.equal(report.bySeverity["critical"].passed, 1);
		});
	});

	describe("createDefaultCorpus", () => {
		it("should create corpus with exactly 30 scenarios", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			assert.equal(corpus.getAllScenarios().length, 30);
		});

		it("should have IDs from ATK-0001 to ATK-0030", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			for (let i = 1; i <= 30; i++) {
				const id = `ATK-${String(i).padStart(4, "0")}`;
				assert.ok(corpus.getScenario(id), `Missing scenario ${id}`);
			}
		});

		it("should include MCP and A2A categories", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			const categories = new Set(
				corpus.getAllScenarios().map((s) => s.category),
			);
			assert.ok(categories.has("mcp"));
			assert.ok(categories.has("a2a"));
		});

		it("should have all scenarios start with zero pass/fail counts", () => {
			const corpus = AttackCorpus.createDefaultCorpus();
			for (const s of corpus.getAllScenarios()) {
				assert.equal(s.timesPassed, 0);
				assert.equal(s.timesFailed, 0);
			}
		});
	});
});
