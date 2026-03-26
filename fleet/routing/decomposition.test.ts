import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
	type DecompositionResult,
	type Subtask,
	TaskDecomposer,
} from "./decomposition";
import { RoutingEngine } from "./engine";

// Minimal routing config that resolves task types to agents
const routingEngine = new RoutingEngine({
	rules: [
		{
			taskType: "code",
			primaryAgent: "coder",
			fallbackAgent: "admiral",
			escalationTarget: "admiral",
			constraints: [],
		},
		{
			taskType: "review",
			primaryAgent: "reviewer",
			fallbackAgent: "admiral",
			escalationTarget: "admiral",
			constraints: [],
		},
		{
			taskType: "design",
			primaryAgent: "architect",
			fallbackAgent: "admiral",
			escalationTarget: "admiral",
			constraints: [],
		},
		{
			taskType: "test",
			primaryAgent: "tester",
			fallbackAgent: "admiral",
			escalationTarget: "admiral",
			constraints: [],
		},
	],
	fileOwnership: [],
	capabilities: [],
});

describe("TaskDecomposer", () => {
	let decomposer: TaskDecomposer;

	beforeEach(() => {
		decomposer = new TaskDecomposer(routingEngine);
	});

	describe("decompose", () => {
		it("creates single subtask with no hints", () => {
			const result = decomposer.decompose("build feature", "code", 10000);
			assert.equal(result.subtasks.length, 1);
			assert.equal(result.subtasks[0].agentId, "coder");
			assert.equal(result.subtasks[0].budgetTokens, 10000);
		});

		it("creates subtask per hint", () => {
			const result = decomposer.decompose("build feature", "code", 9000, [
				{ aspect: "design", suggestedAgent: "architect" },
				{ aspect: "code", suggestedAgent: "coder" },
				{ aspect: "review", suggestedAgent: "reviewer" },
			]);
			assert.equal(result.subtasks.length, 3);
			assert.equal(result.totalBudget, 9000);
		});

		it("routes hints without suggestedAgent via routing engine", () => {
			const result = decomposer.decompose("work", "code", 6000, [
				{ aspect: "code" },
				{ aspect: "review" },
			]);
			const agents = result.subtasks.map((s) => s.agentId);
			assert.ok(agents.includes("coder"));
			assert.ok(agents.includes("reviewer"));
		});

		it("warns on artificial split", () => {
			const result = decomposer.decompose("work", "code", 6000, [
				{ aspect: "code", suggestedAgent: "coder" },
				{ aspect: "code", suggestedAgent: "coder" },
			]);
			assert.ok(result.warnings.some((w) => w.includes("Artificial split")));
		});

		it("distributes budget evenly with remainder to first", () => {
			const result = decomposer.decompose("work", "code", 10, [
				{ aspect: "code", suggestedAgent: "coder" },
				{ aspect: "review", suggestedAgent: "reviewer" },
				{ aspect: "test", suggestedAgent: "tester" },
			]);
			// 10 / 3 = 3 each, remainder 1 to first
			const budgets = result.subtasks.map((s) => s.budgetTokens);
			assert.equal(
				budgets.reduce((a, b) => a + b, 0),
				10,
			);
		});
	});

	describe("validateDecomposition", () => {
		it("returns no errors for valid decomposition", () => {
			const result = decomposer.decompose("work", "code", 6000, [
				{ aspect: "code", suggestedAgent: "coder" },
				{ aspect: "review", suggestedAgent: "reviewer" },
			]);
			const errors = decomposer.validateDecomposition(result);
			assert.equal(errors.length, 0);
		});

		it("detects unknown dependency", () => {
			const result: DecompositionResult = {
				originalTask: "test",
				subtasks: [
					{
						id: "s1",
						description: "a",
						agentId: "x",
						acceptanceCriteria: [],
						budgetTokens: 100,
						dependencies: ["missing"],
						order: 0,
					},
				],
				totalBudget: 100,
				warnings: [],
			};
			const errors = decomposer.validateDecomposition(result);
			assert.ok(errors.some((e) => e.includes("unknown subtask")));
		});

		it("detects circular dependencies", () => {
			const result: DecompositionResult = {
				originalTask: "test",
				subtasks: [
					{
						id: "s1",
						description: "a",
						agentId: "x",
						acceptanceCriteria: [],
						budgetTokens: 50,
						dependencies: ["s2"],
						order: 0,
					},
					{
						id: "s2",
						description: "b",
						agentId: "y",
						acceptanceCriteria: [],
						budgetTokens: 50,
						dependencies: ["s1"],
						order: 1,
					},
				],
				totalBudget: 100,
				warnings: [],
			};
			const errors = decomposer.validateDecomposition(result);
			assert.ok(errors.some((e) => e.includes("Circular")));
		});

		it("detects budget overrun", () => {
			const result: DecompositionResult = {
				originalTask: "test",
				subtasks: [
					{
						id: "s1",
						description: "a",
						agentId: "x",
						acceptanceCriteria: [],
						budgetTokens: 600,
						dependencies: [],
						order: 0,
					},
					{
						id: "s2",
						description: "b",
						agentId: "y",
						acceptanceCriteria: [],
						budgetTokens: 600,
						dependencies: [],
						order: 1,
					},
				],
				totalBudget: 1000,
				warnings: [],
			};
			const errors = decomposer.validateDecomposition(result);
			assert.ok(errors.some((e) => e.includes("budget exceeded")));
		});
	});

	describe("detectArtificialSplit", () => {
		it("returns false for single subtask", () => {
			const subtasks: Subtask[] = [
				{
					id: "s1",
					description: "a",
					agentId: "x",
					acceptanceCriteria: [],
					budgetTokens: 100,
					dependencies: [],
					order: 0,
				},
			];
			assert.equal(decomposer.detectArtificialSplit(subtasks), false);
		});

		it("returns true when all subtasks share an agent", () => {
			const subtasks: Subtask[] = [
				{
					id: "s1",
					description: "a",
					agentId: "x",
					acceptanceCriteria: [],
					budgetTokens: 50,
					dependencies: [],
					order: 0,
				},
				{
					id: "s2",
					description: "b",
					agentId: "x",
					acceptanceCriteria: [],
					budgetTokens: 50,
					dependencies: [],
					order: 1,
				},
			];
			assert.equal(decomposer.detectArtificialSplit(subtasks), true);
		});

		it("returns false when subtasks have different agents", () => {
			const subtasks: Subtask[] = [
				{
					id: "s1",
					description: "a",
					agentId: "x",
					acceptanceCriteria: [],
					budgetTokens: 50,
					dependencies: [],
					order: 0,
				},
				{
					id: "s2",
					description: "b",
					agentId: "y",
					acceptanceCriteria: [],
					budgetTokens: 50,
					dependencies: [],
					order: 1,
				},
			];
			assert.equal(decomposer.detectArtificialSplit(subtasks), false);
		});
	});

	describe("getExecutionOrder", () => {
		it("returns single group for independent tasks", () => {
			const subtasks: Subtask[] = [
				{
					id: "s1",
					description: "a",
					agentId: "x",
					acceptanceCriteria: [],
					budgetTokens: 50,
					dependencies: [],
					order: 0,
				},
				{
					id: "s2",
					description: "b",
					agentId: "y",
					acceptanceCriteria: [],
					budgetTokens: 50,
					dependencies: [],
					order: 1,
				},
			];
			const groups = decomposer.getExecutionOrder(subtasks);
			assert.equal(groups.length, 1);
			assert.equal(groups[0].length, 2);
		});

		it("respects dependencies across groups", () => {
			const subtasks: Subtask[] = [
				{
					id: "s1",
					description: "a",
					agentId: "x",
					acceptanceCriteria: [],
					budgetTokens: 50,
					dependencies: [],
					order: 0,
				},
				{
					id: "s2",
					description: "b",
					agentId: "y",
					acceptanceCriteria: [],
					budgetTokens: 50,
					dependencies: ["s1"],
					order: 1,
				},
			];
			const groups = decomposer.getExecutionOrder(subtasks);
			assert.equal(groups.length, 2);
			assert.equal(groups[0][0].id, "s1");
			assert.equal(groups[1][0].id, "s2");
		});

		it("handles empty input", () => {
			const groups = decomposer.getExecutionOrder([]);
			assert.equal(groups.length, 0);
		});
	});
});
