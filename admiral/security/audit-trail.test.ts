/**
 * Tests for SecurityAuditTrail (S-22)
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, it } from "node:test";
import { SecurityAuditTrail } from "./audit-trail.js";

describe("SecurityAuditTrail", () => {
	let trail: SecurityAuditTrail;

	beforeEach(() => {
		trail = new SecurityAuditTrail();
	});

	describe("record", () => {
		it("should create an entry with id, timestamp, and hash", () => {
			const entry = trail.record({
				type: "blocked_tool",
				agentId: "agent-1",
				action: "blocked exec",
				details: { tool: "exec" },
				severity: "high",
			});
			assert.ok(entry.id.startsWith("sec_"));
			assert.equal(typeof entry.timestamp, "number");
			assert.ok(entry.hash.length === 64); // SHA-256 hex
		});

		it("should chain hashes: second entry references first", () => {
			const first = trail.record({
				type: "blocked_tool",
				agentId: "a",
				action: "x",
				details: {},
				severity: "low",
			});
			const second = trail.record({
				type: "injection_detected",
				agentId: "b",
				action: "y",
				details: {},
				severity: "high",
			});
			assert.equal(second.prevHash, first.hash);
		});

		it("should not have prevHash on first entry", () => {
			const first = trail.record({
				type: "pii_detected",
				agentId: "a",
				action: "scan",
				details: {},
				severity: "medium",
			});
			assert.equal(first.prevHash, undefined);
		});
	});

	describe("validateChain", () => {
		it("should validate an intact chain", () => {
			trail.record({
				type: "blocked_tool",
				agentId: "a",
				action: "x",
				details: {},
				severity: "low",
			});
			trail.record({
				type: "injection_detected",
				agentId: "b",
				action: "y",
				details: {},
				severity: "high",
			});
			trail.record({
				type: "policy_violation",
				agentId: "c",
				action: "z",
				details: {},
				severity: "critical",
			});
			const result = trail.validateChain();
			assert.equal(result.valid, true);
			assert.equal(result.breakPosition, undefined);
		});

		it("should validate empty chain", () => {
			const result = trail.validateChain();
			assert.equal(result.valid, true);
		});
	});

	describe("query", () => {
		it("should return all entries when no filter", () => {
			trail.record({
				type: "blocked_tool",
				agentId: "a",
				action: "x",
				details: {},
				severity: "low",
			});
			trail.record({
				type: "injection_detected",
				agentId: "b",
				action: "y",
				details: {},
				severity: "high",
			});
			const results = trail.query();
			assert.equal(results.length, 2);
		});

		it("should filter by type", () => {
			trail.record({
				type: "blocked_tool",
				agentId: "a",
				action: "x",
				details: {},
				severity: "low",
			});
			trail.record({
				type: "injection_detected",
				agentId: "b",
				action: "y",
				details: {},
				severity: "high",
			});
			const results = trail.query({ type: "blocked_tool" });
			assert.equal(results.length, 1);
			assert.equal(results[0].type, "blocked_tool");
		});

		it("should filter by agentId", () => {
			trail.record({
				type: "blocked_tool",
				agentId: "agent-x",
				action: "a",
				details: {},
				severity: "low",
			});
			trail.record({
				type: "blocked_tool",
				agentId: "agent-y",
				action: "b",
				details: {},
				severity: "low",
			});
			const results = trail.query({ agentId: "agent-x" });
			assert.equal(results.length, 1);
		});

		it("should filter by severity", () => {
			trail.record({
				type: "blocked_tool",
				agentId: "a",
				action: "x",
				details: {},
				severity: "low",
			});
			trail.record({
				type: "injection_detected",
				agentId: "a",
				action: "y",
				details: {},
				severity: "critical",
			});
			const results = trail.query({ severity: "critical" });
			assert.equal(results.length, 1);
		});
	});

	describe("getStats", () => {
		it("should return correct statistics", () => {
			trail.record({
				type: "blocked_tool",
				agentId: "a",
				action: "x",
				details: {},
				severity: "high",
			});
			trail.record({
				type: "blocked_tool",
				agentId: "b",
				action: "y",
				details: {},
				severity: "low",
			});
			trail.record({
				type: "injection_detected",
				agentId: "c",
				action: "z",
				details: {},
				severity: "high",
			});
			const stats = trail.getStats();
			assert.equal(stats.total, 3);
			assert.equal(stats.bySeverity.high, 2);
			assert.equal(stats.bySeverity.low, 1);
			assert.equal(stats.byType.blocked_tool, 2);
			assert.equal(stats.byType.injection_detected, 1);
		});
	});

	describe("save and load", () => {
		it("should persist and reload entries", async () => {
			const logPath = join(tmpdir(), `audit-test-${randomUUID()}.jsonl`);
			const t1 = new SecurityAuditTrail(logPath);
			t1.record({
				type: "blocked_tool",
				agentId: "a",
				action: "x",
				details: { foo: "bar" },
				severity: "high",
			});
			t1.record({
				type: "pii_detected",
				agentId: "b",
				action: "y",
				details: {},
				severity: "medium",
			});
			await t1.save();

			const t2 = new SecurityAuditTrail(logPath);
			await t2.load();
			const entries = t2.query();
			assert.equal(entries.length, 2);
			assert.equal(entries[0].type, "blocked_tool");

			// Chain should still validate
			const result = t2.validateChain();
			assert.equal(result.valid, true);

			// Cleanup
			try {
				await unlink(logPath);
			} catch {
				// ignore
			}
		});

		it("should handle missing file on load gracefully", async () => {
			const t = new SecurityAuditTrail("/nonexistent/path.jsonl");
			await t.load(); // should not throw
			assert.equal(t.query().length, 0);
		});
	});
});
