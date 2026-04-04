import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { AccessController } from "./access-control";

describe("AccessController", () => {
	let ac: AccessController;

	beforeEach(() => {
		ac = new AccessController();
		ac.grant({
			agentId: "reader",
			level: "read-only",
			scope: "*",
			grantedBy: "Admiral",
			grantedAt: new Date().toISOString(),
		});
		ac.grant({
			agentId: "writer",
			level: "contributor",
			scope: "helm",
			grantedBy: "Admiral",
			grantedAt: new Date().toISOString(),
		});
		ac.grant({
			agentId: "admin-agent",
			level: "admin",
			scope: "*",
			grantedBy: "Admiral",
			grantedAt: new Date().toISOString(),
		});
	});

	describe("checkAccess", () => {
		it("allows read for read-only agent", () => {
			const d = ac.checkAccess("reader", "e1", "read");
			assert.equal(d.allowed, true);
		});

		it("blocks write for read-only agent", () => {
			const d = ac.checkAccess("reader", "e1", "write");
			assert.equal(d.allowed, false);
			assert.ok(d.reason.includes("insufficient"));
		});

		it("allows write for contributor", () => {
			const d = ac.checkAccess("writer", "e1", "write", "helm");
			assert.equal(d.allowed, true);
		});

		it("blocks delete for contributor", () => {
			const d = ac.checkAccess("writer", "e1", "delete", "helm");
			assert.equal(d.allowed, false);
		});

		it("allows all operations for admin", () => {
			assert.equal(ac.checkAccess("admin-agent", "e1", "read").allowed, true);
			assert.equal(ac.checkAccess("admin-agent", "e1", "write").allowed, true);
			assert.equal(ac.checkAccess("admin-agent", "e1", "delete").allowed, true);
			assert.equal(ac.checkAccess("admin-agent", "e1", "admin").allowed, true);
		});

		it("defaults unknown agents to read-only", () => {
			const d = ac.checkAccess("unknown", "e1", "read");
			assert.equal(d.allowed, true);
			const d2 = ac.checkAccess("unknown", "e1", "write");
			assert.equal(d2.allowed, false);
		});
	});

	describe("scope-based access", () => {
		it("respects scope matching", () => {
			const d = ac.checkAccess("writer", "e1", "write", "helm");
			assert.equal(d.allowed, true);
		});

		it("denies out-of-scope writes", () => {
			const d = ac.checkAccess("writer", "e1", "write", "other-project");
			assert.equal(d.allowed, false);
		});

		it("wildcard scope matches everything", () => {
			assert.equal(ac.checkAccess("reader", "e1", "read", "any-scope").allowed, true);
		});
	});

	describe("entry overrides", () => {
		it("override takes precedence over grants", () => {
			ac.setEntryOverride({
				entryId: "special-entry",
				agentId: "reader",
				level: "admin",
				setBy: "Admiral",
				setAt: new Date().toISOString(),
			});
			const d = ac.checkAccess("reader", "special-entry", "delete");
			assert.equal(d.allowed, true);
		});

		it("replaces existing override for same agent", () => {
			ac.setEntryOverride({
				entryId: "e1",
				agentId: "reader",
				level: "admin",
				setBy: "a",
				setAt: new Date().toISOString(),
			});
			ac.setEntryOverride({
				entryId: "e1",
				agentId: "reader",
				level: "read-only",
				setBy: "a",
				setAt: new Date().toISOString(),
			});
			const d = ac.checkAccess("reader", "e1", "write");
			assert.equal(d.allowed, false);
		});
	});

	describe("filterReadable", () => {
		it("filters entries by read access", () => {
			ac.setEntryOverride({
				entryId: "secret",
				agentId: "reader",
				level: "read-only",
				setBy: "a",
				setAt: "",
			});
			// reader has wildcard read-only, can read all
			const readable = ac.filterReadable(["e1", "e2", "secret"], "reader");
			assert.equal(readable.length, 3);
		});
	});

	describe("filterWritable", () => {
		it("filters entries by write access", () => {
			const scopes = new Map([
				["e1", "helm"],
				["e2", "helm"],
				["e3", "other"],
			]);
			const writable = ac.filterWritable(["e1", "e2", "e3"], "writer", scopes);
			assert.equal(writable.length, 2);
		});
	});

	describe("decision log", () => {
		it("logs all access decisions", () => {
			ac.checkAccess("reader", "e1", "read");
			ac.checkAccess("reader", "e1", "write");
			assert.equal(ac.getDecisionLog().length, 2);
		});

		it("filters by agent", () => {
			ac.checkAccess("reader", "e1", "read");
			ac.checkAccess("writer", "e1", "write", "helm");
			assert.equal(ac.getAgentDecisions("reader").length, 1);
		});
	});

	describe("grant management", () => {
		it("returns agent grants", () => {
			assert.equal(ac.getAgentGrants("reader").length, 1);
		});

		it("revokes all grants", () => {
			const count = ac.revokeAll("reader");
			assert.equal(count, 1);
			assert.equal(ac.getAgentGrants("reader").length, 0);
		});
	});

	describe("expired grants", () => {
		it("ignores expired grants", () => {
			ac.grant({
				agentId: "temp-writer",
				level: "contributor",
				scope: "*",
				grantedBy: "Admiral",
				grantedAt: "2024-01-01T00:00:00Z",
				expiresAt: "2024-01-02T00:00:00Z",
			});
			const d = ac.checkAccess("temp-writer", "e1", "write");
			assert.equal(d.allowed, false);
		});
	});
});
