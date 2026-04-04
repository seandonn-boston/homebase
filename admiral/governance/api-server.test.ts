/**
 * Tests for Governance API Server (GP-01 + GP-01b)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GovernanceApiServer,
  type ApiRequest,
  type HttpMethod,
} from "./api-server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    method: "GET",
    path: "/health",
    params: {},
    query: {},
    body: null,
    headers: {},
    authenticated: true,
    authToken: "dev-token",
    ...overrides,
  };
}

function createServer(): GovernanceApiServer {
  return new GovernanceApiServer({ port: 0, authTokens: new Set(["test-token"]) });
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

describe("Health endpoint", () => {
  it("returns health status", async () => {
    const server = createServer();
    const res = await server.handleApiRequest(makeReq({ path: "/health" }));
    assert.equal(res.status, 200);
    const body = res.body as { status: string; endpoints: unknown[] };
    assert.equal(body.status, "ok");
    assert.ok(body.endpoints.length > 0);
  });

  it("does not require auth", async () => {
    const server = createServer();
    const res = await server.handleApiRequest(makeReq({ path: "/health", authenticated: false }));
    assert.equal(res.status, 200);
  });
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

describe("Authentication", () => {
  it("rejects unauthenticated requests", async () => {
    const server = createServer();
    const res = await server.handleApiRequest(makeReq({
      path: "/api/v1/fleet-status",
      authenticated: false,
    }));
    assert.equal(res.status, 401);
  });

  it("allows authenticated requests", async () => {
    const server = createServer();
    const res = await server.handleApiRequest(makeReq({
      path: "/api/v1/fleet-status",
      authenticated: true,
    }));
    assert.equal(res.status, 200);
  });
});

// ---------------------------------------------------------------------------
// GP-01b: Visibility Pillar
// ---------------------------------------------------------------------------

describe("Visibility Pillar (GP-01b)", () => {
  it("returns fleet status", async () => {
    const server = createServer();
    server.updateFleetStatus({ totalAgents: 5, activeAgents: 3 });
    const res = await server.handleApiRequest(makeReq({ path: "/api/v1/fleet-status" }));
    assert.equal(res.status, 200);
    const body = res.body as { totalAgents: number; activeAgents: number };
    assert.equal(body.totalAgents, 5);
    assert.equal(body.activeAgents, 3);
  });

  it("returns task progress", async () => {
    const server = createServer();
    server.addTask({
      id: "t1", description: "Test task", status: "in-progress",
      assignedAgent: "agent-1", startedAt: new Date().toISOString(), completedAt: null,
    });
    const res = await server.handleApiRequest(makeReq({ path: "/api/v1/task-progress" }));
    assert.equal(res.status, 200);
    const body = res.body as { tasks: unknown[]; total: number };
    assert.equal(body.total, 1);
  });

  it("returns resource usage", async () => {
    const server = createServer();
    server.updateResources({ tokensConsumed: 50000, apiCalls: 100 });
    const res = await server.handleApiRequest(makeReq({ path: "/api/v1/resources" }));
    assert.equal(res.status, 200);
    const body = res.body as { tokensConsumed: number };
    assert.equal(body.tokensConsumed, 50000);
  });

  it("returns decisions", async () => {
    const server = createServer();
    server.addDecision({
      id: "d1", timestamp: new Date().toISOString(),
      agent: "orchestrator", decision: "route to agent-1",
      authorityTier: "Autonomous", outcome: "success",
    });
    const res = await server.handleApiRequest(makeReq({ path: "/api/v1/decisions" }));
    assert.equal(res.status, 200);
    const body = res.body as { decisions: unknown[]; total: number };
    assert.equal(body.total, 1);
  });

  it("returns failures", async () => {
    const server = createServer();
    server.addFailure({
      id: "f1", timestamp: new Date().toISOString(),
      agent: "agent-1", type: "timeout",
      description: "Task timed out", recovered: true,
    });
    const res = await server.handleApiRequest(makeReq({ path: "/api/v1/failures" }));
    assert.equal(res.status, 200);
    const body = res.body as { failures: unknown[]; total: number };
    assert.equal(body.total, 1);
  });
});

// ---------------------------------------------------------------------------
// Policy Management
// ---------------------------------------------------------------------------

describe("Policy Management", () => {
  it("creates a policy", async () => {
    const server = createServer();
    const res = await server.handleApiRequest(makeReq({
      method: "POST",
      path: "/api/v1/policies",
      body: { name: "Test Policy", enforcement: "enforce", scope: "fleet-wide", rationale: "testing" },
    }));
    assert.equal(res.status, 201);
    const body = res.body as { id: string; name: string; version: number };
    assert.equal(body.name, "Test Policy");
    assert.equal(body.version, 1);
    assert.ok(body.id);
  });

  it("rejects policy without name", async () => {
    const server = createServer();
    const res = await server.handleApiRequest(makeReq({
      method: "POST",
      path: "/api/v1/policies",
      body: { enforcement: "enforce" },
    }));
    assert.equal(res.status, 400);
  });

  it("lists policies", async () => {
    const server = createServer();
    await server.handleApiRequest(makeReq({
      method: "POST", path: "/api/v1/policies",
      body: { name: "P1" },
    }));
    await server.handleApiRequest(makeReq({
      method: "POST", path: "/api/v1/policies",
      body: { name: "P2" },
    }));
    const res = await server.handleApiRequest(makeReq({ path: "/api/v1/policies" }));
    assert.equal(res.status, 200);
    const body = res.body as { policies: unknown[]; total: number };
    assert.equal(body.total, 2);
  });

  it("gets a specific policy", async () => {
    const server = createServer();
    const createRes = await server.handleApiRequest(makeReq({
      method: "POST", path: "/api/v1/policies",
      body: { name: "Get Test" },
    }));
    const id = (createRes.body as { id: string }).id;
    const res = await server.handleApiRequest(makeReq({ path: `/api/v1/policies/${id}` }));
    assert.equal(res.status, 200);
    const body = res.body as { current: { name: string } };
    assert.equal(body.current.name, "Get Test");
  });

  it("returns 404 for unknown policy", async () => {
    const server = createServer();
    const res = await server.handleApiRequest(makeReq({ path: "/api/v1/policies/nonexistent" }));
    assert.equal(res.status, 404);
  });

  it("updates a policy (append-only versioning)", async () => {
    const server = createServer();
    const createRes = await server.handleApiRequest(makeReq({
      method: "POST", path: "/api/v1/policies",
      body: { name: "V1" },
    }));
    const id = (createRes.body as { id: string }).id;

    const updateRes = await server.handleApiRequest(makeReq({
      method: "PUT", path: `/api/v1/policies/${id}`,
      body: { name: "V2", rationale: "name change" },
    }));
    assert.equal(updateRes.status, 200);
    const body = updateRes.body as { version: number; name: string };
    assert.equal(body.version, 2);
    assert.equal(body.name, "V2");
  });
});

// ---------------------------------------------------------------------------
// Audit Trail
// ---------------------------------------------------------------------------

describe("Audit Trail", () => {
  it("records and queries audit entries", async () => {
    const server = createServer();
    // Create a policy to generate audit entries
    await server.handleApiRequest(makeReq({
      method: "POST", path: "/api/v1/policies",
      body: { name: "Audit Test" },
    }));

    const res = await server.handleApiRequest(makeReq({ path: "/api/v1/audit" }));
    assert.equal(res.status, 200);
    const body = res.body as { entries: { action: string }[]; total: number };
    assert.ok(body.total > 0);
    assert.ok(body.entries.some((e) => e.action === "policy.created"));
  });

  it("filters by action", async () => {
    const server = createServer();
    server.addAuditEntry("test.action", "tester", "resource/1");
    server.addAuditEntry("other.action", "tester", "resource/2");

    const res = await server.handleApiRequest(makeReq({
      path: "/api/v1/audit",
      query: { action: "test.action" },
    }));
    const body = res.body as { entries: { action: string }[]; total: number };
    assert.equal(body.total, 1);
    assert.equal(body.entries[0].action, "test.action");
  });
});

// ---------------------------------------------------------------------------
// Route Discovery
// ---------------------------------------------------------------------------

describe("Route Discovery", () => {
  it("has versioned API routes", () => {
    const server = createServer();
    const routes = server.getRoutes();
    const apiRoutes = routes.filter((r) => r.pattern.startsWith("/api/v1"));
    assert.ok(apiRoutes.length >= 10, `expected >=10 API routes, got ${apiRoutes.length}`);
  });

  it("returns 404 for unknown routes", async () => {
    const server = createServer();
    const res = await server.handleApiRequest(makeReq({ path: "/api/v1/nonexistent" }));
    assert.equal(res.status, 404);
  });
});
