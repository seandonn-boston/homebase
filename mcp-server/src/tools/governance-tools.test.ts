/**
 * Tests for Governance tools.
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import type { ToolContext } from "../tool-registry.js";
import { ToolRegistry } from "../tool-registry.js";
import {
	registerGovernanceTools,
	type StandingOrder,
} from "./governance-tools.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<ToolContext> = {}): ToolContext {
	return {
		agentId: "test-agent",
		role: "admiral",
		sessionId: "test-session",
		requestId: "1",
		...overrides,
	};
}

function createTempSODir(orders: StandingOrder[]): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gov-test-"));
	for (const order of orders) {
		fs.writeFileSync(
			path.join(dir, `${order.id}.json`),
			JSON.stringify(order, null, 2),
			"utf-8",
		);
	}
	return dir;
}

const SAMPLE_ORDERS: StandingOrder[] = [
	{
		id: "so-001",
		name: "No Direct Production Access",
		description: "Agents must not directly modify production systems",
		enforcement: "hard-block",
		rules: [
			{
				id: "r-001",
				condition: "modify production deploy",
				action: "block",
				category: "security",
			},
		],
		violationCount: 3,
		lastViolation: 1700000000000,
	},
	{
		id: "so-002",
		name: "Code Review Required",
		description: "All code changes must be reviewed",
		enforcement: "soft-warn",
		rules: [
			{
				id: "r-002",
				condition: "commit merge without review",
				action: "warn",
				category: "process",
			},
		],
		violationCount: 0,
	},
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Governance tools", () => {
	let soDir: string;
	let registry: ToolRegistry;

	before(() => {
		soDir = createTempSODir(SAMPLE_ORDERS);
		registry = new ToolRegistry();
		registerGovernanceTools(registry, soDir);
	});

	after(() => {
		fs.rmSync(soDir, { recursive: true, force: true });
	});

	// standing_order_status
	describe("standing_order_status", () => {
		it("returns all standing orders", async () => {
			const result = (await registry.invoke(
				"standing_order_status",
				{},
				makeContext(),
			)) as any;
			assert.ok(Array.isArray(result.orders));
			assert.equal(result.orders.length, 2);
		});

		it("includes violation counts", async () => {
			const result = (await registry.invoke(
				"standing_order_status",
				{},
				makeContext(),
			)) as any;
			const so1 = result.orders.find(
				(o: any) => o.name === "No Direct Production Access",
			);
			assert.ok(so1);
			assert.equal(so1.violationCount, 3);
			assert.equal(so1.lastViolation, 1700000000000);
		});

		it("is accessible by observer (universal)", async () => {
			const result = (await registry.invoke(
				"standing_order_status",
				{},
				makeContext({ role: "observer" }),
			)) as any;
			assert.ok(result.orders);
		});
	});

	// compliance_check
	describe("compliance_check", () => {
		it("detects violations for matching actions", async () => {
			const result = (await registry.invoke(
				"compliance_check",
				{ action: "modify production deployment", agent: "agent-x" },
				makeContext(),
			)) as any;
			assert.equal(result.compliant, false);
			assert.ok(result.violations.length > 0);
		});

		it("returns compliant for safe actions", async () => {
			const result = (await registry.invoke(
				"compliance_check",
				{ action: "read documentation", agent: "agent-x" },
				makeContext(),
			)) as any;
			assert.equal(result.compliant, true);
			assert.equal(result.violations.length, 0);
		});

		it("requires action and agent params", async () => {
			await assert.rejects(
				() => registry.invoke("compliance_check", {}, makeContext()),
				(err: any) => err.code !== undefined,
			);
		});

		it("requires agent+ role", async () => {
			await assert.rejects(
				() =>
					registry.invoke(
						"compliance_check",
						{ action: "test", agent: "a" },
						makeContext({ role: "observer" }),
					),
				(err: any) => err.message.includes("Insufficient role"),
			);
		});
	});

	// escalation_file
	describe("escalation_file", () => {
		it("files an escalation and routes to admiral for critical", async () => {
			const result = (await registry.invoke(
				"escalation_file",
				{
					severity: "critical",
					subject: "Security breach",
					description: "Unauthorized access detected",
					agent: "agent-x",
				},
				makeContext(),
			)) as any;
			assert.ok(result.id);
			assert.equal(result.filed, true);
			assert.equal(result.routedTo, "admiral");
		});

		it("routes medium escalations to lieutenant", async () => {
			const result = (await registry.invoke(
				"escalation_file",
				{
					severity: "medium",
					subject: "Performance issue",
					description: "Slow response times",
					agent: "agent-y",
				},
				makeContext(),
			)) as any;
			assert.equal(result.routedTo, "lieutenant");
		});

		it("routes low escalations to agent", async () => {
			const result = (await registry.invoke(
				"escalation_file",
				{
					severity: "low",
					subject: "Minor issue",
					description: "Cosmetic problem",
					agent: "agent-z",
				},
				makeContext(),
			)) as any;
			assert.equal(result.routedTo, "agent");
		});

		it("creates escalation file on disk", async () => {
			const result = (await registry.invoke(
				"escalation_file",
				{
					severity: "high",
					subject: "Test Esc",
					description: "Test description",
					agent: "agent-w",
				},
				makeContext(),
			)) as any;
			const escPath = path.join(soDir, "escalations", `${result.id}.json`);
			assert.ok(fs.existsSync(escPath));
		});

		it("requires all params", async () => {
			await assert.rejects(
				() =>
					registry.invoke(
						"escalation_file",
						{ severity: "low" },
						makeContext(),
					),
				(err: any) => err.code !== undefined,
			);
		});
	});
});
