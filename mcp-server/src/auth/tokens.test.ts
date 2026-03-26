/**
 * Tests for TokenManager and RBAC middleware.
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ToolContext } from "../tool-registry.js";
import { createRbacMiddleware } from "./rbac.js";
import { type IdentityToken, TokenManager } from "./tokens.js";

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

// ---------------------------------------------------------------------------
// TokenManager
// ---------------------------------------------------------------------------

describe("TokenManager", () => {
	const secret = "test-secret-key-for-hmac-signing";

	it("requires a non-empty secret", () => {
		assert.throws(() => new TokenManager(""), /non-empty secret/);
	});

	it("issues a valid token", () => {
		const tm = new TokenManager(secret);
		const token = tm.issueToken("agent-1", "agent", "proj-1", "sess-1");
		assert.equal(token.agentId, "agent-1");
		assert.equal(token.role, "agent");
		assert.equal(token.projectId, "proj-1");
		assert.equal(token.sessionId, "sess-1");
		assert.ok(token.signature.length > 0);
		assert.ok(token.expiresAt > token.issuedAt);
	});

	it("verifies a valid token", () => {
		const tm = new TokenManager(secret);
		const token = tm.issueToken("agent-1", "agent", "proj-1", "sess-1");
		const result = tm.verifyToken(token);
		assert.equal(result.valid, true);
		assert.equal(result.reason, undefined);
	});

	it("rejects token with tampered signature", () => {
		const tm = new TokenManager(secret);
		const token = tm.issueToken("agent-1", "agent", "proj-1", "sess-1");
		token.signature = "tampered";
		const result = tm.verifyToken(token);
		assert.equal(result.valid, false);
		assert.ok(result.reason?.includes("signature"));
	});

	it("rejects token with tampered agentId", () => {
		const tm = new TokenManager(secret);
		const token = tm.issueToken("agent-1", "agent", "proj-1", "sess-1");
		token.agentId = "agent-2";
		const result = tm.verifyToken(token);
		assert.equal(result.valid, false);
	});

	it("rejects expired token", () => {
		const tm = new TokenManager(secret);
		const token = tm.issueToken("agent-1", "agent", "proj-1", "sess-1", 1); // 1ms TTL
		// Wait for expiration
		const start = Date.now();
		while (Date.now() - start < 5) {
			/* spin */
		}
		const result = tm.verifyToken(token);
		assert.equal(result.valid, false);
		assert.ok(result.reason?.includes("expired"));
	});

	it("respects custom TTL", () => {
		const tm = new TokenManager(secret);
		const token = tm.issueToken("agent-1", "agent", "proj-1", "sess-1", 5000);
		assert.ok(token.expiresAt - token.issuedAt <= 5000);
		assert.ok(token.expiresAt - token.issuedAt >= 4999);
	});

	it("revokeAllBefore invalidates old tokens", () => {
		const tm = new TokenManager(secret);
		const oldToken = tm.issueToken("agent-1", "agent", "proj-1", "sess-1");
		const revokeEpoch = Date.now() + 100;
		tm.revokeAllBefore(revokeEpoch);
		const result = tm.verifyToken(oldToken);
		assert.equal(result.valid, false);
		assert.ok(result.reason?.includes("revoked"));
	});

	it("revokeAllBefore does not affect newer tokens", () => {
		const tm = new TokenManager(secret);
		const revokeEpoch = Date.now() - 10000;
		tm.revokeAllBefore(revokeEpoch);
		const newToken = tm.issueToken("agent-1", "agent", "proj-1", "sess-1");
		const result = tm.verifyToken(newToken);
		assert.equal(result.valid, true);
	});

	it("different secrets produce different signatures", () => {
		const tm1 = new TokenManager("secret-a");
		const tm2 = new TokenManager("secret-b");
		const token = tm1.issueToken("agent-1", "agent", "proj-1", "sess-1");
		const result = tm2.verifyToken(token);
		assert.equal(result.valid, false);
	});
});

// ---------------------------------------------------------------------------
// RBAC Middleware
// ---------------------------------------------------------------------------

describe("RBAC Middleware", () => {
	const secret = "test-rbac-secret";

	it("rejects when no token is provided", async () => {
		const tm = new TokenManager(secret);
		const middleware = createRbacMiddleware(tm);
		await assert.rejects(
			() => middleware("test_tool", {}, makeContext()),
			(err: any) => err.message.includes("no identity token"),
		);
	});

	it("rejects invalid token", async () => {
		const tm = new TokenManager(secret);
		const middleware = createRbacMiddleware(tm);
		const badToken: IdentityToken = {
			agentId: "test-agent",
			role: "agent",
			projectId: "proj-1",
			sessionId: "test-session",
			issuedAt: Date.now(),
			expiresAt: Date.now() + 3600000,
			signature: "invalid",
		};
		const ctx = { ...makeContext(), _token: badToken } as any;
		await assert.rejects(
			() => middleware("test_tool", {}, ctx),
			(err: any) => err.message.includes("Authentication failed"),
		);
	});

	it("accepts valid token with matching agentId", async () => {
		const tm = new TokenManager(secret);
		const middleware = createRbacMiddleware(tm);
		const token = tm.issueToken(
			"test-agent",
			"agent",
			"proj-1",
			"test-session",
		);
		const ctx = { ...makeContext({ role: "agent" }), _token: token } as any;
		await middleware("test_tool", {}, ctx); // should not throw
	});

	it("rejects when agentId mismatch", async () => {
		const tm = new TokenManager(secret);
		const middleware = createRbacMiddleware(tm);
		const token = tm.issueToken(
			"other-agent",
			"agent",
			"proj-1",
			"test-session",
		);
		const ctx = { ...makeContext(), _token: token } as any;
		await assert.rejects(
			() => middleware("test_tool", {}, ctx),
			(err: any) => err.message.includes("agentId does not match"),
		);
	});
});
