/**
 * Platform Adapter Test Suite (PA-08 + PA-02b)
 *
 * Shared tests covering all platform adapters, the capability matrix,
 * event-driven framework, scheduled runner, and authority narrowing.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import type {
	AdapterEvent,
	ContextInjection,
	HookPayload,
} from "./adapter-interface";
import { ClaudeCodeAdapter } from "./adapters/claude-code";
import { CursorAdapter } from "./adapters/cursor";
import {
	EventDrivenAgentFramework,
	HeadlessAdapter,
	HeadlessAuthorityNarrower,
	HeadlessContextBootstrap,
	ScheduledAgentRunner,
} from "./adapters/headless";
import { VSCodeAdapter } from "./adapters/vscode";
import { WindsurfAdapter } from "./adapters/windsurf";
import {
	CAPABILITY_MATRIX,
	getCapabilityMatrix,
	getGapAnalysis,
	getPlatformCapabilities,
} from "./capability-matrix";

// ── Test helpers ────────────────────────────────────────────────────

function makeContext(overrides?: Partial<ContextInjection>): ContextInjection {
	return {
		standing: ["identity: helm", "constraint: no-prod-writes"],
		session: ["project: technomancy"],
		working: ["task: implement PA-01"],
		totalBudget: 50_000,
		...overrides,
	};
}

function makeHookPayload(overrides?: Partial<HookPayload>): HookPayload {
	return {
		hookName: "pre-commit",
		event: "tool_call",
		agentId: "helm",
		data: { tool: "bash", command: "git status" },
		...overrides,
	};
}

// ── Claude Code Adapter (PA-02) ─────────────────────────────────────

describe("ClaudeCodeAdapter", () => {
	let adapter: ClaudeCodeAdapter;

	beforeEach(() => {
		adapter = new ClaudeCodeAdapter();
	});

	it("has correct platform identity", () => {
		assert.equal(adapter.platformId, "claude-code");
		assert.equal(adapter.platformName, "Claude Code");
	});

	it("reports full capabilities", () => {
		assert.equal(adapter.capabilities.hooks, true);
		assert.equal(adapter.capabilities.contextInjection, true);
		assert.equal(adapter.capabilities.toolPermissions, true);
		assert.equal(adapter.capabilities.configLoading, true);
		assert.equal(adapter.capabilities.eventEmission, true);
		assert.equal(adapter.capabilities.subagentCoordination, true);
		assert.equal(adapter.capabilities.mcpServer, true);
	});

	it("initializes and shuts down", async () => {
		assert.equal(adapter.isInitialized(), false);
		await adapter.initialize({ hooksDir: ".hooks" });
		assert.equal(adapter.isInitialized(), true);
		await adapter.shutdown();
		assert.equal(adapter.isInitialized(), false);
	});

	it("executeHook returns allow when not initialized", async () => {
		const result = await adapter.executeHook(makeHookPayload());
		assert.equal(result.allow, false);
		assert.equal(result.message, "Adapter not initialized");
	});

	it("executeHook returns allow:true when no hook script found", async () => {
		await adapter.initialize({ hooksDir: "/nonexistent" });
		const result = await adapter.executeHook(makeHookPayload());
		assert.equal(result.allow, true);
	});

	it("injectContext assembles standing/session/working sections", async () => {
		await adapter.initialize({});
		const ctx = makeContext();
		await adapter.injectContext("helm", ctx);

		assert.ok(adapter._lastInjectedContext.includes("Standing Context"));
		assert.ok(adapter._lastInjectedContext.includes("Session Context"));
		assert.ok(adapter._lastInjectedContext.includes("Working Context"));
		assert.ok(adapter._lastInjectedContext.includes("identity: helm"));
		assert.ok(adapter._lastInjectedContext.includes("task: implement PA-01"));
	});

	it("injectContext throws when not initialized", async () => {
		await assert.rejects(() => adapter.injectContext("helm", makeContext()), {
			message: "Adapter not initialized",
		});
	});

	it("checkToolPermission allows all when no restrictions", async () => {
		await adapter.initialize({});
		assert.equal(await adapter.checkToolPermission("helm", "bash"), true);
		assert.equal(await adapter.checkToolPermission("helm", "read"), true);
	});

	it("checkToolPermission enforces allowlist", async () => {
		await adapter.initialize({ allowedTools: ["read", "write"] });
		assert.equal(await adapter.checkToolPermission("helm", "read"), true);
		assert.equal(await adapter.checkToolPermission("helm", "bash"), false);
	});

	it("checkToolPermission returns false when not initialized", async () => {
		assert.equal(await adapter.checkToolPermission("helm", "bash"), false);
	});

	it("loadConfig returns empty object for missing file", async () => {
		await adapter.initialize({});
		const result = await adapter.loadConfig("/nonexistent/config.json");
		assert.deepEqual(result, {});
	});

	it("on/emit dispatches events to listeners", async () => {
		await adapter.initialize({});
		const received: AdapterEvent[] = [];
		adapter.on("test_event", (e) => received.push(e));

		const event: AdapterEvent = {
			type: "test_event",
			timestamp: Date.now(),
			data: { foo: "bar" },
		};
		adapter.emit(event);

		assert.equal(received.length, 1);
		assert.equal(received[0].type, "test_event");
		assert.deepEqual(received[0].data, { foo: "bar" });
	});

	it("emit does not dispatch to unrelated listeners", async () => {
		await adapter.initialize({});
		const received: AdapterEvent[] = [];
		adapter.on("other_event", (e) => received.push(e));

		adapter.emit({
			type: "test_event",
			timestamp: Date.now(),
			data: {},
		});

		assert.equal(received.length, 0);
	});
});

// ── Cursor Adapter (PA-03) ──────────────────────────────────────────

describe("CursorAdapter", () => {
	let adapter: CursorAdapter;

	beforeEach(() => {
		adapter = new CursorAdapter();
	});

	it("has correct platform identity", () => {
		assert.equal(adapter.platformId, "cursor");
		assert.equal(adapter.platformName, "Cursor IDE");
	});

	it("reports limited capabilities", () => {
		assert.equal(adapter.capabilities.hooks, false);
		assert.equal(adapter.capabilities.contextInjection, true);
		assert.equal(adapter.capabilities.toolPermissions, false);
		assert.equal(adapter.capabilities.mcpServer, true);
		assert.equal(adapter.capabilities.subagentCoordination, false);
	});

	it("executeHook returns not supported", async () => {
		await adapter.initialize({});
		const result = await adapter.executeHook(makeHookPayload());
		assert.equal(result.allow, false);
		assert.ok(result.message?.includes("not supported"));
	});

	it("generateCursorRules produces .cursorrules content", () => {
		const rules = adapter.generateCursorRules(
			["Always follow Admiral governance", "Never modify production"],
			["No direct DB writes", "Use approved tools only"],
		);

		assert.ok(rules.includes("Admiral Framework Governance"));
		assert.ok(rules.includes("Standing Orders"));
		assert.ok(rules.includes("Always follow Admiral governance"));
		assert.ok(rules.includes("Constraints"));
		assert.ok(rules.includes("No direct DB writes"));
	});

	it("generateCursorRules handles empty arrays", () => {
		const rules = adapter.generateCursorRules([], []);
		assert.ok(rules.includes("Admiral Framework Governance"));
		assert.ok(!rules.includes("Standing Orders"));
		assert.ok(!rules.includes("Constraints"));
	});

	it("injectContext populates _lastInjectedContext", async () => {
		await adapter.initialize({});
		await adapter.injectContext("helm", makeContext());
		assert.ok(adapter._lastInjectedContext.includes("Admiral Framework"));
	});
});

// ── Windsurf Adapter (PA-04) ────────────────────────────────────────

describe("WindsurfAdapter", () => {
	let adapter: WindsurfAdapter;

	beforeEach(() => {
		adapter = new WindsurfAdapter();
	});

	it("has correct platform identity", () => {
		assert.equal(adapter.platformId, "windsurf");
		assert.equal(adapter.platformName, "Windsurf/Codeium");
	});

	it("generateWindsurfRules produces .windsurfrules content", () => {
		const rules = adapter.generateWindsurfRules(
			["Follow governance"],
			["No prod writes"],
		);

		assert.ok(rules.includes("Admiral Framework Governance for Windsurf"));
		assert.ok(rules.includes("Standing Orders"));
		assert.ok(rules.includes("Follow governance"));
		assert.ok(rules.includes("Constraints"));
		assert.ok(rules.includes("No prod writes"));
	});

	it("generateWindsurfRules handles empty arrays", () => {
		const rules = adapter.generateWindsurfRules([], []);
		assert.ok(rules.includes("Windsurf"));
		assert.ok(!rules.includes("Standing Orders"));
	});

	it("executeHook returns not supported", async () => {
		await adapter.initialize({});
		const result = await adapter.executeHook(makeHookPayload());
		assert.equal(result.allow, false);
	});
});

// ── Headless Adapter (PA-05) ────────────────────────────────────────

describe("HeadlessAdapter", () => {
	let adapter: HeadlessAdapter;

	beforeEach(() => {
		adapter = new HeadlessAdapter();
	});

	it("has correct platform identity", () => {
		assert.equal(adapter.platformId, "headless");
		assert.equal(adapter.platformName, "Headless API-Direct");
	});

	it("initializes and shuts down", async () => {
		assert.equal(adapter.isInitialized(), false);
		await adapter.initialize({});
		assert.equal(adapter.isInitialized(), true);
		await adapter.shutdown();
		assert.equal(adapter.isInitialized(), false);
	});

	it("emits events as JSON-lines", async () => {
		await adapter.initialize({});
		adapter.emit({
			type: "test",
			timestamp: 1000,
			data: { key: "value" },
		});

		const log = adapter.getEventLog();
		assert.equal(log.length, 1);
		const parsed = JSON.parse(log[0]);
		assert.equal(parsed.type, "test");
		assert.deepEqual(parsed.data, { key: "value" });
	});

	it("injectContext uses programmatic format", async () => {
		await adapter.initialize({});
		await adapter.injectContext("helm", makeContext());

		assert.ok(
			adapter._lastInjectedContext.includes("[standing] identity: helm"),
		);
		assert.ok(
			adapter._lastInjectedContext.includes("[session] project: technomancy"),
		);
		assert.ok(
			adapter._lastInjectedContext.includes("[working] task: implement PA-01"),
		);
	});

	it("checkToolPermission enforces allowlist", async () => {
		await adapter.initialize({ allowedTools: ["read"] });
		assert.equal(await adapter.checkToolPermission("helm", "read"), true);
		assert.equal(await adapter.checkToolPermission("helm", "bash"), false);
	});

	it("on/emit dispatches to listeners", async () => {
		await adapter.initialize({});
		const events: AdapterEvent[] = [];
		adapter.on("hook_executed", (e) => events.push(e));

		adapter.emit({
			type: "hook_executed",
			timestamp: Date.now(),
			data: {},
		});

		assert.equal(events.length, 1);
	});
});

// ── VS Code Adapter (PA-06) ────────────────────────────────────────

describe("VSCodeAdapter", () => {
	let adapter: VSCodeAdapter;

	beforeEach(() => {
		adapter = new VSCodeAdapter();
	});

	it("has correct platform identity", () => {
		assert.equal(adapter.platformId, "vscode");
		assert.equal(adapter.platformName, "VS Code Extension");
	});

	it("returns extension config", async () => {
		await adapter.initialize({
			extensionConfig: {
				fleetStatusSidebar: true,
				mcpServerUrl: "http://localhost:3000",
			},
		});
		const extConfig = adapter.getExtensionConfig();
		assert.equal(extConfig.fleetStatusSidebar, true);
		assert.equal(extConfig.mcpServerUrl, "http://localhost:3000");
	});
});

// ── Capability Matrix (PA-07) ───────────────────────────────────────

describe("CapabilityMatrix", () => {
	it("contains all five platforms", () => {
		const matrix = getCapabilityMatrix();
		assert.equal(matrix.platforms.length, 5);
	});

	it("each platform has required fields", () => {
		for (const p of CAPABILITY_MATRIX.platforms) {
			assert.ok(p.platform, "platform name required");
			assert.ok(
				["full", "partial", "none"].includes(p.hooks),
				`hooks must be full/partial/none, got ${p.hooks}`,
			);
			assert.ok(
				["full", "partial", "none"].includes(p.contextInjection),
				`contextInjection must be valid`,
			);
			assert.ok(
				["full", "partial", "none"].includes(p.toolPermissions),
				`toolPermissions must be valid`,
			);
			assert.ok(
				["full", "partial", "none"].includes(p.mcpServer),
				`mcpServer must be valid`,
			);
			assert.ok(
				["full", "partial", "none"].includes(p.subagents),
				`subagents must be valid`,
			);
			assert.ok(typeof p.notes === "string");
		}
	});

	it("Claude Code has full capabilities", () => {
		const cc = getPlatformCapabilities("claude-code");
		assert.ok(cc);
		assert.equal(cc.hooks, "full");
		assert.equal(cc.contextInjection, "full");
		assert.equal(cc.toolPermissions, "full");
		assert.equal(cc.mcpServer, "full");
		assert.equal(cc.subagents, "full");
	});

	it("getPlatformCapabilities returns undefined for unknown", () => {
		assert.equal(getPlatformCapabilities("unknown-platform"), undefined);
	});

	it("getGapAnalysis returns gaps for Cursor", () => {
		const gaps = getGapAnalysis("cursor");
		assert.ok(gaps.length > 0);
		assert.ok(gaps.some((g) => g.includes("hooks")));
		assert.ok(gaps.some((g) => g.includes("toolPermissions")));
		assert.ok(gaps.some((g) => g.includes("subagents")));
	});

	it("getGapAnalysis returns empty for Claude Code", () => {
		const gaps = getGapAnalysis("claude-code");
		assert.equal(gaps.length, 0);
	});

	it("getGapAnalysis handles unknown platform", () => {
		const gaps = getGapAnalysis("nonexistent");
		assert.equal(gaps.length, 1);
		assert.ok(gaps[0].includes("not found"));
	});
});

// ── Event-driven Agent Framework (PA-10) ────────────────────────────

describe("EventDrivenAgentFramework", () => {
	let framework: EventDrivenAgentFramework;

	beforeEach(() => {
		framework = new EventDrivenAgentFramework();
	});

	it("adds and retrieves triggers", () => {
		framework.addTrigger({
			event: "pr_opened",
			authorityLevel: 1,
			allowedActions: ["review", "comment"],
			resultRouting: "github",
			costCap: 5.0,
		});

		const triggers = framework.getTriggers();
		assert.equal(triggers.length, 1);
		assert.equal(triggers[0].event, "pr_opened");
	});

	it("matchTrigger finds correct trigger", () => {
		framework.addTrigger({
			event: "ci_failure",
			authorityLevel: 1,
			allowedActions: ["diagnose"],
			resultRouting: "slack",
			costCap: 2.0,
		});

		const match = framework.matchTrigger("ci_failure");
		assert.ok(match);
		assert.equal(match.event, "ci_failure");
		assert.equal(match.costCap, 2.0);
	});

	it("matchTrigger returns undefined for no match", () => {
		assert.equal(framework.matchTrigger("nonexistent"), undefined);
	});

	it("removeTrigger removes by event", () => {
		framework.addTrigger({
			event: "webhook",
			authorityLevel: 1,
			allowedActions: [],
			resultRouting: "log",
			costCap: 1.0,
		});

		framework.removeTrigger("webhook");
		assert.equal(framework.getTriggers().length, 0);
	});

	it("addTrigger replaces existing trigger for same event", () => {
		framework.addTrigger({
			event: "pr_opened",
			authorityLevel: 1,
			allowedActions: ["review"],
			resultRouting: "github",
			costCap: 5.0,
		});
		framework.addTrigger({
			event: "pr_opened",
			authorityLevel: 2,
			allowedActions: ["review", "approve"],
			resultRouting: "github",
			costCap: 10.0,
		});

		const triggers = framework.getTriggers();
		assert.equal(triggers.length, 1);
		assert.equal(triggers[0].authorityLevel, 2);
	});
});

// ── Authority Narrowing (PA-11) ─────────────────────────────────────

describe("HeadlessAuthorityNarrower", () => {
	let narrower: HeadlessAuthorityNarrower;

	beforeEach(() => {
		narrower = new HeadlessAuthorityNarrower();
	});

	it("returns Autonomous-1 as default tier", () => {
		const auth = narrower.getDefaultAuthority();
		assert.equal(auth.tier, "Autonomous-1");
	});

	it("default authority has safety restrictions", () => {
		const auth = narrower.getDefaultAuthority();
		assert.ok(auth.restrictions.includes("cannot_merge_prs"));
		assert.ok(auth.restrictions.includes("cannot_delete_branches"));
		assert.ok(auth.restrictions.includes("cannot_modify_production"));
	});

	it("isAllowed rejects restricted actions", () => {
		assert.equal(narrower.isAllowed("cannot_merge_prs"), false);
		assert.equal(narrower.isAllowed("cannot_delete_branches"), false);
		assert.equal(narrower.isAllowed("cannot_modify_production"), false);
	});

	it("isAllowed permits unrestricted actions", () => {
		assert.equal(narrower.isAllowed("read_file"), true);
		assert.equal(narrower.isAllowed("run_tests"), true);
	});
});

// ── Scheduled Agent Runner (PA-12) ──────────────────────────────────

describe("ScheduledAgentRunner", () => {
	let runner: ScheduledAgentRunner;

	beforeEach(() => {
		runner = new ScheduledAgentRunner();
	});

	it("addAgent creates agent with zero totalCost", () => {
		const agent = runner.addAgent({
			id: "lint-bot",
			name: "Lint Bot",
			schedule: "0 * * * *",
			task: "run-lint",
			costCap: 1.0,
			monthlyBudget: 30.0,
		});

		assert.equal(agent.totalCost, 0);
		assert.equal(agent.id, "lint-bot");
	});

	it("removeAgent removes by id", () => {
		runner.addAgent({
			id: "bot-1",
			name: "Bot 1",
			schedule: "0 * * * *",
			task: "task",
			costCap: 1.0,
			monthlyBudget: 10.0,
		});

		runner.removeAgent("bot-1");
		assert.equal(runner.getAgents().length, 0);
	});

	it("shouldRun returns true for never-run agent within budget", () => {
		runner.addAgent({
			id: "bot",
			name: "Bot",
			schedule: "* * * * *",
			task: "task",
			costCap: 1.0,
			monthlyBudget: 10.0,
		});

		assert.equal(runner.shouldRun("bot", Date.now()), true);
	});

	it("shouldRun returns false for unknown agent", () => {
		assert.equal(runner.shouldRun("nonexistent", Date.now()), false);
	});

	it("shouldRun returns false when over budget", () => {
		runner.addAgent({
			id: "expensive",
			name: "Expensive Bot",
			schedule: "* * * * *",
			task: "task",
			costCap: 1.0,
			monthlyBudget: 5.0,
		});

		// Blow the budget
		runner.recordRun("expensive", 6.0);
		assert.equal(runner.shouldRun("expensive", Date.now()), false);
	});

	it("shouldRun respects minimum interval", () => {
		runner.addAgent({
			id: "fast",
			name: "Fast Bot",
			schedule: "* * * * *",
			task: "task",
			costCap: 1.0,
			monthlyBudget: 100.0,
		});

		runner.recordRun("fast", 0.1);
		// Immediately after a run, should not run again
		assert.equal(runner.shouldRun("fast", Date.now()), false);
	});

	it("isWithinBudget tracks cumulative cost", () => {
		runner.addAgent({
			id: "tracker",
			name: "Tracker",
			schedule: "0 * * * *",
			task: "task",
			costCap: 1.0,
			monthlyBudget: 3.0,
		});

		assert.equal(runner.isWithinBudget("tracker"), true);
		runner.recordRun("tracker", 1.5);
		assert.equal(runner.isWithinBudget("tracker"), true);
		runner.recordRun("tracker", 1.5);
		assert.equal(runner.isWithinBudget("tracker"), false);
	});

	it("recordRun updates lastRun timestamp", () => {
		runner.addAgent({
			id: "ts-check",
			name: "TS Check",
			schedule: "0 * * * *",
			task: "task",
			costCap: 1.0,
			monthlyBudget: 10.0,
		});

		runner.recordRun("ts-check", 0.5);
		const agents = runner.getAgents();
		const agent = agents.find((a) => a.id === "ts-check");
		assert.ok(agent);
		assert.ok(agent.lastRun !== undefined);
		assert.ok(agent.totalCost === 0.5);
	});
});

// ── Context Bootstrap (PA-13) ───────────────────────────────────────

describe("HeadlessContextBootstrap", () => {
	let bootstrap: HeadlessContextBootstrap;

	beforeEach(() => {
		bootstrap = new HeadlessContextBootstrap();
	});

	it("assembles context from event payload and ground truth", () => {
		const ctx = bootstrap.assembleContext(
			{ task: "run lint", branch: "feature/lint" },
			"AGENTS.md content here",
			["brain entry 1", "brain entry 2"],
		);

		assert.equal(ctx.standing.length, 1);
		assert.equal(ctx.standing[0], "AGENTS.md content here");
		assert.equal(ctx.session.length, 2);
		assert.ok(ctx.session[0].includes("[brain]"));
		assert.equal(ctx.working.length, 2);
		assert.ok(ctx.working[0].includes("Task:"));
		assert.ok(ctx.working[1].includes("Branch:"));
	});

	it("uses default budget when not specified", () => {
		const ctx = bootstrap.assembleContext({}, "truth", []);
		assert.equal(ctx.totalBudget, 100_000);
	});

	it("respects custom token budget", () => {
		const ctx = bootstrap.assembleContext({ tokenBudget: 50_000 }, "truth", []);
		assert.equal(ctx.totalBudget, 50_000);
	});

	it("handles issue field in event payload", () => {
		const ctx = bootstrap.assembleContext({ issue: "#42" }, "truth", []);
		assert.ok(ctx.working.some((w) => w.includes("Issue: #42")));
	});

	it("returns empty working when no relevant payload fields", () => {
		const ctx = bootstrap.assembleContext({}, "truth", []);
		assert.equal(ctx.working.length, 0);
	});
});
