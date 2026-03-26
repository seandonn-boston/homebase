import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DEFAULT_ROUTING_RULES, type RoutingRule } from "./default-rules";
import {
	type AgentCapability,
	type FileOwnershipRule,
	RoutingEngine,
	type RoutingRequest,
} from "./engine";

// ─── Test fixtures ───────────────────────────────────────────────────

const TEST_RULES: RoutingRule[] = [
	{
		taskType: "ui-component-implementation",
		primaryAgent: "frontend-implementer",
		fallbackAgent: "responsive-layout-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "security-audit",
		primaryAgent: "security-auditor",
		fallbackAgent: "penetration-tester",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "unit-test-writing",
		primaryAgent: "unit-test-writer",
		fallbackAgent: "qa-agent",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "api-design",
		primaryAgent: "api-designer",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
];

const TEST_FILE_OWNERSHIP: FileOwnershipRule[] = [
	{ pattern: "src/components/**", owner: "frontend-implementer", priority: 10 },
	{
		pattern: "src/components/ui/**",
		owner: "design-systems-agent",
		priority: 20,
	},
	{ pattern: "src/api/**", owner: "backend-implementer", priority: 10 },
	{ pattern: "tests/**", owner: "qa-agent", priority: 5 },
	{ pattern: "**/*.test.ts", owner: "unit-test-writer", priority: 15 },
];

const TEST_CAPABILITIES: AgentCapability[] = [
	{
		agentId: "frontend-implementer",
		role: "Frontend Implementer",
		modelTier: "mid",
		capabilities: ["react", "typescript", "css", "html", "component-design"],
	},
	{
		agentId: "backend-implementer",
		role: "Backend Implementer",
		modelTier: "mid",
		capabilities: ["node", "typescript", "api", "database", "rest"],
	},
	{
		agentId: "security-auditor",
		role: "Security Auditor",
		modelTier: "high",
		capabilities: [
			"vulnerability-analysis",
			"penetration-testing",
			"compliance",
			"owasp",
		],
	},
	{
		agentId: "qa-agent",
		role: "QA Agent",
		modelTier: "mid",
		capabilities: ["testing", "test-strategy", "regression", "automation"],
	},
];

// ─── Tests ───────────────────────────────────────────────────────────

describe("RoutingEngine", () => {
	let engine: RoutingEngine;

	beforeEach(() => {
		engine = new RoutingEngine({
			rules: TEST_RULES,
			fileOwnership: TEST_FILE_OWNERSHIP,
			capabilities: TEST_CAPABILITIES,
		});
	});

	describe("routeByTaskType", () => {
		it("returns primary agent on exact match", () => {
			const result = engine.routeByTaskType("ui-component-implementation");
			assert.ok(result);
			assert.equal(result.agent, "frontend-implementer");
			assert.equal(result.strategy, "task-type");
			assert.equal(result.confidence, 1.0);
			assert.equal(result.fallback, "responsive-layout-agent");
		});

		it("returns primary agent on normalized/fuzzy match", () => {
			// Use different casing and spaces instead of hyphens
			const result = engine.routeByTaskType("UI Component Implementation");
			assert.ok(result);
			assert.equal(result.agent, "frontend-implementer");
			assert.equal(result.strategy, "task-type");
			assert.equal(result.confidence, 0.85);
		});

		it("returns null for unknown task type", () => {
			const result = engine.routeByTaskType("quantum-flux-capacitor-tuning");
			assert.equal(result, null);
		});
	});

	describe("routeByFileOwnership", () => {
		it("matches single file to correct owner", () => {
			const result = engine.routeByFileOwnership(["src/api/users.ts"]);
			assert.ok(result);
			assert.equal(result.agent, "backend-implementer");
			assert.equal(result.strategy, "file-ownership");
			assert.equal(result.confidence, 1.0);
		});

		it("matches multiple files and picks majority owner", () => {
			const result = engine.routeByFileOwnership([
				"src/components/Button.tsx",
				"src/components/Card.tsx",
				"src/api/auth.ts",
			]);
			assert.ok(result);
			// 2 component files vs 1 api file — frontend wins
			assert.equal(result.agent, "frontend-implementer");
		});

		it("resolves overlapping patterns by priority (higher wins)", () => {
			// src/components/ui/** has priority 20, src/components/** has priority 10
			const result = engine.routeByFileOwnership([
				"src/components/ui/Button.tsx",
			]);
			assert.ok(result);
			assert.equal(result.agent, "design-systems-agent");
		});

		it("returns null for unmatched files", () => {
			const result = engine.routeByFileOwnership(["random/unowned/file.txt"]);
			assert.equal(result, null);
		});

		it("returns null for empty file list", () => {
			const result = engine.routeByFileOwnership([]);
			assert.equal(result, null);
		});
	});

	describe("routeByCapability", () => {
		it("ranks agents by capability match count", () => {
			const result = engine.routeByCapability(["typescript", "react", "css"]);
			assert.ok(result);
			assert.equal(result.agent, "frontend-implementer");
			assert.equal(result.strategy, "capability-match");
			assert.equal(result.confidence, 1.0); // 3/3 matched
		});

		it("selects best partial match when no agent has all capabilities", () => {
			const result = engine.routeByCapability(["typescript", "api", "graphql"]);
			assert.ok(result);
			assert.equal(result.agent, "backend-implementer");
			// 2/3 matched (typescript + api)
			assert.ok(result.confidence > 0.5);
			assert.ok(result.confidence < 1.0);
		});

		it("returns null when no capabilities match", () => {
			const result = engine.routeByCapability([
				"quantum-computing",
				"teleportation",
			]);
			assert.equal(result, null);
		});

		it("returns null for empty capabilities list", () => {
			const result = engine.routeByCapability([]);
			assert.equal(result, null);
		});
	});

	describe("route (orchestrator)", () => {
		it("prefers task-type match when available", () => {
			const result = engine.route({
				taskType: "security-audit",
				filePaths: ["src/api/auth.ts"],
				requiredCapabilities: ["typescript"],
			});
			assert.equal(result.agent, "security-auditor");
			assert.equal(result.strategy, "task-type");
		});

		it("falls through to file-ownership when task-type unrecognized", () => {
			const result = engine.route({
				taskType: "unknown-task-type",
				filePaths: ["src/api/users.ts"],
			});
			assert.equal(result.agent, "backend-implementer");
			assert.equal(result.strategy, "file-ownership");
		});

		it("falls through to capability-match as third strategy", () => {
			const result = engine.route({
				taskType: "unknown-task-type",
				filePaths: ["no/match/here.xyz"],
				requiredCapabilities: ["react", "component-design"],
			});
			assert.equal(result.agent, "frontend-implementer");
			assert.equal(result.strategy, "capability-match");
		});

		it("escalates to admiral when nothing matches", () => {
			const result = engine.route({
				taskType: "unknown-task-type",
				filePaths: ["no/match/here.xyz"],
				requiredCapabilities: ["quantum-computing"],
			});
			assert.equal(result.agent, "admiral");
			assert.equal(result.strategy, "escalation");
			assert.equal(result.confidence, 0);
		});

		it("escalates when request is completely empty", () => {
			const result = engine.route({});
			assert.equal(result.agent, "admiral");
			assert.equal(result.strategy, "escalation");
		});
	});

	describe("validateRoute", () => {
		it("detects self-review constraint violation", () => {
			const result = engine.route({ taskType: "security-audit" });
			assert.equal(result.agent, "security-auditor");

			const violations = engine.validateRoute(result, {
				requestingAgent: "security-auditor",
				acceptanceCriteria: ["code passes audit"],
			});
			assert.ok(violations.length > 0);
			assert.ok(violations.some((v) => v.includes("Self-review violation")));
		});

		it("does not flag self-review when agents differ", () => {
			const result = engine.route({ taskType: "security-audit" });
			const violations = engine.validateRoute(result, {
				requestingAgent: "backend-implementer",
				acceptanceCriteria: ["code passes audit"],
			});
			assert.ok(!violations.some((v) => v.includes("Self-review")));
		});

		it("does not flag self-review when rule has no no-self-review constraint", () => {
			const result = engine.route({ taskType: "ui-component-implementation" });
			assert.equal(result.agent, "frontend-implementer");

			const violations = engine.validateRoute(result, {
				requestingAgent: "frontend-implementer",
				acceptanceCriteria: ["component renders"],
			});
			assert.ok(!violations.some((v) => v.includes("Self-review")));
		});

		it("flags missing acceptance criteria", () => {
			const result = engine.route({ taskType: "api-design" });
			const violations = engine.validateRoute(result, {
				requestingAgent: "architect",
			});
			assert.ok(
				violations.some((v) => v.includes("Missing acceptance criteria")),
			);
		});

		it("flags missing acceptance criteria when array is empty", () => {
			const result = engine.route({ taskType: "api-design" });
			const violations = engine.validateRoute(result, {
				requestingAgent: "architect",
				acceptanceCriteria: [],
			});
			assert.ok(
				violations.some((v) => v.includes("Missing acceptance criteria")),
			);
		});

		it("returns empty array when all checks pass", () => {
			const result = engine.route({ taskType: "api-design" });
			const violations = engine.validateRoute(result, {
				requestingAgent: "architect",
				acceptanceCriteria: ["API follows RESTful conventions"],
			});
			assert.equal(violations.length, 0);
		});
	});

	describe("DEFAULT_ROUTING_RULES", () => {
		it("contains 86 task-type rules", () => {
			assert.equal(DEFAULT_ROUTING_RULES.length, 86);
		});

		it("all rules have required fields", () => {
			for (const rule of DEFAULT_ROUTING_RULES) {
				assert.ok(rule.taskType, `Missing taskType`);
				assert.ok(
					rule.primaryAgent,
					`Missing primaryAgent for ${rule.taskType}`,
				);
				assert.ok(
					rule.escalationTarget,
					`Missing escalationTarget for ${rule.taskType}`,
				);
				assert.ok(
					Array.isArray(rule.constraints),
					`constraints not array for ${rule.taskType}`,
				);
			}
		});

		it("has no duplicate task types", () => {
			const types = DEFAULT_ROUTING_RULES.map((r) => r.taskType);
			const unique = new Set(types);
			assert.equal(unique.size, types.length, "Duplicate task types found");
		});

		it("works with RoutingEngine constructor", () => {
			const fullEngine = new RoutingEngine({
				rules: DEFAULT_ROUTING_RULES,
				fileOwnership: [],
				capabilities: [],
			});
			const result = fullEngine.routeByTaskType("incident-response");
			assert.ok(result);
			assert.equal(result.agent, "incident-response-agent");
		});
	});
});
