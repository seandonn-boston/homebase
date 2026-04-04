import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { IdentityTokenManager } from "./identity-tokens";

describe("IdentityTokenManager", () => {
	let manager: IdentityTokenManager;

	beforeEach(() => {
		// 1 hour TTL, 1 minute overlap for testing
		manager = new IdentityTokenManager(3600_000, 60_000);
	});

	describe("create", () => {
		it("creates a token with correct fields", () => {
			const token = manager.create({ agentId: "agent-1" });
			assert.ok(token.id);
			assert.equal(token.agentId, "agent-1");
			assert.ok(token.token.startsWith("ait_"));
			assert.equal(token.status, "active");
			assert.ok(token.expiresAt > token.createdAt);
		});

		it("uses custom TTL", () => {
			const token = manager.create({ agentId: "agent-1", ttlMs: 5000 });
			assert.equal(token.expiresAt - token.createdAt, 5000);
		});

		it("creates unique tokens", () => {
			const t1 = manager.create({ agentId: "agent-1" });
			const t2 = manager.create({ agentId: "agent-1" });
			assert.notEqual(t1.id, t2.id);
			assert.notEqual(t1.token, t2.token);
		});
	});

	describe("validate", () => {
		it("validates active token", () => {
			const token = manager.create({ agentId: "agent-1" });
			const result = manager.validate(token.token);
			assert.equal(result.valid, true);
			assert.equal(result.agentId, "agent-1");
		});

		it("rejects unknown token", () => {
			const result = manager.validate("ait_nonexistent");
			assert.equal(result.valid, false);
			assert.ok(result.reason.includes("not found"));
		});

		it("rejects expired token", () => {
			const token = manager.create({ agentId: "agent-1", ttlMs: 1000 });
			const futureTime = Date.now() + 2000;
			const result = manager.validate(token.token, futureTime);
			assert.equal(result.valid, false);
			assert.ok(result.reason.includes("expired"));
		});

		it("rejects revoked token", () => {
			const token = manager.create({ agentId: "agent-1" });
			manager.revoke(token.id);
			const result = manager.validate(token.token);
			assert.equal(result.valid, false);
			assert.ok(result.reason.includes("revoked"));
		});
	});

	describe("rotate", () => {
		it("creates new token and marks old as rotated", () => {
			const original = manager.create({ agentId: "agent-1" });
			const result = manager.rotate(original.id);

			assert.ok(result);
			assert.equal(result.oldToken.status, "rotated");
			assert.equal(result.newToken.status, "active");
			assert.equal(result.newToken.agentId, "agent-1");
			assert.equal(result.oldToken.rotatedTo, result.newToken.id);
		});

		it("old token valid during overlap window", () => {
			const original = manager.create({ agentId: "agent-1" });
			const result = manager.rotate(original.id)!;

			// Old token should still validate during overlap
			const oldValidation = manager.validate(result.oldToken.token);
			assert.equal(oldValidation.valid, true);
			assert.ok(oldValidation.reason.includes("overlap"));
		});

		it("old token expires after overlap window", () => {
			const original = manager.create({ agentId: "agent-1" });
			const result = manager.rotate(original.id)!;

			// After overlap window
			const futureTime = Date.now() + 120_000;
			const oldValidation = manager.validate(result.oldToken.token, futureTime);
			assert.equal(oldValidation.valid, false);
		});

		it("returns null for non-active token", () => {
			const token = manager.create({ agentId: "agent-1" });
			manager.revoke(token.id);
			assert.equal(manager.rotate(token.id), null);
		});

		it("returns null for unknown token", () => {
			assert.equal(manager.rotate("nonexistent"), null);
		});
	});

	describe("revoke", () => {
		it("revokes an active token", () => {
			const token = manager.create({ agentId: "agent-1" });
			assert.equal(manager.revoke(token.id), true);
			assert.equal(manager.getToken(token.id)?.status, "revoked");
			assert.ok(manager.getToken(token.id)?.revokedAt);
		});

		it("returns false for already revoked", () => {
			const token = manager.create({ agentId: "agent-1" });
			manager.revoke(token.id);
			assert.equal(manager.revoke(token.id), false);
		});

		it("returns false for unknown token", () => {
			assert.equal(manager.revoke("nonexistent"), false);
		});
	});

	describe("revokeAllForAgent", () => {
		it("revokes all tokens for agent", () => {
			manager.create({ agentId: "agent-1" });
			manager.create({ agentId: "agent-1" });
			manager.create({ agentId: "agent-2" });

			const count = manager.revokeAllForAgent("agent-1");
			assert.equal(count, 2);
			assert.equal(manager.getActiveTokens("agent-1").length, 0);
			assert.equal(manager.getActiveTokens("agent-2").length, 1);
		});
	});

	describe("getActiveTokens", () => {
		it("returns only active tokens", () => {
			manager.create({ agentId: "agent-1" });
			manager.create({ agentId: "agent-1" });
			const t3 = manager.create({ agentId: "agent-1" });
			manager.revoke(t3.id);

			assert.equal(manager.getActiveTokens("agent-1").length, 2);
		});

		it("returns empty for unknown agent", () => {
			assert.equal(manager.getActiveTokens("unknown").length, 0);
		});
	});

	describe("pruneExpired", () => {
		it("marks expired tokens", () => {
			manager.create({ agentId: "agent-1", ttlMs: 1000 });
			manager.create({ agentId: "agent-1", ttlMs: 1000 });
			manager.create({ agentId: "agent-1", ttlMs: 999_999 });

			const pruned = manager.pruneExpired(Date.now() + 2000);
			assert.equal(pruned, 2);
		});
	});

	describe("getStats", () => {
		it("returns correct counts", () => {
			manager.create({ agentId: "a1" });
			manager.create({ agentId: "a1" });
			const t3 = manager.create({ agentId: "a1" });
			manager.revoke(t3.id);

			const stats = manager.getStats();
			assert.equal(stats.active, 2);
			assert.equal(stats.revoked, 1);
		});
	});
});
