import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { BrainAuditLog } from "./audit-logging";

describe("BrainAuditLog", () => {
	let log: BrainAuditLog;

	beforeEach(() => {
		log = new BrainAuditLog();
	});

	describe("record", () => {
		it("records an operation", () => {
			const entry = log.record("insert", "agent-1", "entry-1", { title: "Test" });
			assert.ok(entry.id);
			assert.equal(entry.operation, "insert");
			assert.equal(entry.agentId, "agent-1");
			assert.equal(entry.entryId, "entry-1");
			assert.ok(entry.timestamp > 0);
		});

		it("increments count", () => {
			log.record("insert", "a1");
			log.record("query", "a2");
			assert.equal(log.getCount(), 2);
		});

		it("records without entryId", () => {
			const entry = log.record("query", "agent-1");
			assert.equal(entry.entryId, undefined);
		});
	});

	describe("query", () => {
		beforeEach(() => {
			log.record("insert", "agent-1", "e1");
			log.record("query", "agent-2", "e1");
			log.record("update", "agent-1", "e1");
			log.record("delete", "agent-1", "e2");
		});

		it("returns all entries without filter", () => {
			assert.equal(log.query({}).length, 4);
		});

		it("filters by operation", () => {
			const result = log.query({ operation: "insert" });
			assert.equal(result.length, 1);
			assert.equal(result[0].operation, "insert");
		});

		it("filters by agentId", () => {
			const result = log.query({ agentId: "agent-1" });
			assert.equal(result.length, 3);
		});

		it("filters by entryId", () => {
			const result = log.query({ entryId: "e1" });
			assert.equal(result.length, 3);
		});

		it("applies limit", () => {
			const result = log.query({ limit: 2 });
			assert.equal(result.length, 2);
		});
	});

	describe("getEntryHistory", () => {
		it("returns operations for a specific entry", () => {
			log.record("insert", "a1", "e1");
			log.record("update", "a1", "e1");
			log.record("insert", "a1", "e2");

			const history = log.getEntryHistory("e1");
			assert.equal(history.length, 2);
		});
	});

	describe("getAgentActivity", () => {
		it("returns operations by a specific agent", () => {
			log.record("insert", "agent-1", "e1");
			log.record("query", "agent-2");
			log.record("update", "agent-1", "e1");

			const activity = log.getAgentActivity("agent-1");
			assert.equal(activity.length, 2);
		});
	});

	describe("getSummary", () => {
		it("returns correct summary", () => {
			log.record("insert", "a1", "e1");
			log.record("query", "a2");
			log.record("insert", "a1", "e2");

			const summary = log.getSummary();
			assert.equal(summary.totalEntries, 3);
			assert.equal(summary.operationCounts.insert, 2);
			assert.equal(summary.operationCounts.query, 1);
			assert.equal(summary.uniqueAgents, 2);
			assert.ok(summary.oldestEntry);
			assert.ok(summary.newestEntry);
		});

		it("returns empty summary for empty log", () => {
			const summary = log.getSummary();
			assert.equal(summary.totalEntries, 0);
			assert.equal(summary.uniqueAgents, 0);
		});
	});

	describe("retention policy", () => {
		it("enforces maxEntries", () => {
			const limited = new BrainAuditLog({ maxEntries: 3 });
			limited.record("insert", "a1");
			limited.record("insert", "a1");
			limited.record("insert", "a1");
			limited.record("insert", "a1");
			limited.record("insert", "a1");

			assert.equal(limited.getCount(), 3);
		});

		it("can update retention policy", () => {
			log.record("insert", "a1");
			log.record("insert", "a1");
			log.record("insert", "a1");

			log.setRetention({ maxEntries: 2 });
			assert.equal(log.getCount(), 2);
		});
	});

	describe("exportJsonl", () => {
		it("exports as JSONL", () => {
			log.record("insert", "a1", "e1");
			log.record("query", "a2");

			const jsonl = log.exportJsonl();
			const lines = jsonl.split("\n");
			assert.equal(lines.length, 2);
			assert.ok(JSON.parse(lines[0]).operation === "insert");
			assert.ok(JSON.parse(lines[1]).operation === "query");
		});
	});
});
