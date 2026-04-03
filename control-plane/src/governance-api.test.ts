/**
 * Tests for Governance API Server (GP-01)
 */

import assert from "node:assert/strict";
import * as http from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { GovernanceApiServer } from "./governance-api";

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

interface HttpResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function httpGet(url: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk: string) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
      })
      .on("error", reject);
  });
}

function httpRequest(
  url: string,
  method: string,
  body?: unknown,
  token?: string,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = body !== undefined ? JSON.stringify(body) : "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(bodyStr)),
    };
    if (token !== undefined) {
      headers.Authorization = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers,
      },
      (res) => {
        let respBody = "";
        res.on("data", (chunk: string) => {
          respBody += chunk;
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode!,
            headers: res.headers,
            body: respBody,
          }),
        );
      },
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

/** Authenticated GET helper — uses the default dev token. */
function authGet(url: string): Promise<HttpResponse> {
  return httpRequest(url, "GET", undefined, "admiral-dev-token");
}

/** Authenticated POST helper. */
function authPost(url: string, body: unknown): Promise<HttpResponse> {
  return httpRequest(url, "POST", body, "admiral-dev-token");
}

/** Authenticated PUT helper. */
function authPut(url: string, body: unknown): Promise<HttpResponse> {
  return httpRequest(url, "PUT", body, "admiral-dev-token");
}

/** Authenticated DELETE helper. */
function authDelete(url: string): Promise<HttpResponse> {
  return httpRequest(url, "DELETE", undefined, "admiral-dev-token");
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("GovernanceApiServer", () => {
  let server: GovernanceApiServer;
  let baseUrl: string;

  beforeEach(async () => {
    server = new GovernanceApiServer();
    const port = await server.start(0);
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    await server.stop();
  });

  // -------------------------------------------------------------------------
  // Health endpoint (no auth required)
  // -------------------------------------------------------------------------

  describe("GET /api/v1/health", () => {
    it("returns 200 without authentication", async () => {
      const res = await httpGet(`${baseUrl}/api/v1/health`);
      assert.equal(res.status, 200);
    });

    it("returns healthy status with expected fields", async () => {
      const res = await httpGet(`${baseUrl}/api/v1/health`);
      const data = JSON.parse(res.body);
      assert.equal(data.success, true);
      assert.equal(data.data.status, "healthy");
      assert.equal(typeof data.data.uptime_ms, "number");
      assert.equal(typeof data.data.policies, "number");
      assert.equal(typeof data.data.auditEvents, "number");
    });

    it("returns JSON content-type", async () => {
      const res = await httpGet(`${baseUrl}/api/v1/health`);
      assert.ok(res.headers["content-type"]?.includes("application/json"));
    });
  });

  // -------------------------------------------------------------------------
  // Authentication enforcement
  // -------------------------------------------------------------------------

  describe("Authentication", () => {
    it("returns 401 for fleet/status without token", async () => {
      const res = await httpGet(`${baseUrl}/api/v1/fleet/status`);
      assert.equal(res.status, 401);
      const data = JSON.parse(res.body);
      assert.equal(data.success, false);
      assert.ok(data.error.toLowerCase().includes("unauthorized"));
    });

    it("returns 401 for policies without token", async () => {
      const res = await httpGet(`${baseUrl}/api/v1/policies`);
      assert.equal(res.status, 401);
    });

    it("returns 401 with invalid token", async () => {
      const res = await httpRequest(`${baseUrl}/api/v1/policies`, "GET", undefined, "wrong-token");
      assert.equal(res.status, 401);
    });

    it("returns 401 with malformed Authorization header", async () => {
      const res = await new Promise<HttpResponse>((resolve, reject) => {
        const req = http.request(
          {
            hostname: "localhost",
            port: parseInt(new URL(baseUrl).port, 10),
            path: "/api/v1/policies",
            method: "GET",
            headers: { Authorization: "NotBearer token" },
          },
          (r) => {
            let body = "";
            r.on("data", (c: string) => {
              body += c;
            });
            r.on("end", () => resolve({ status: r.statusCode!, headers: r.headers, body }));
          },
        );
        req.on("error", reject);
        req.end();
      });
      assert.equal(res.status, 401);
    });

    it("accepts valid Bearer token", async () => {
      const res = await authGet(`${baseUrl}/api/v1/policies`);
      assert.equal(res.status, 200);
    });
  });

  // -------------------------------------------------------------------------
  // Fleet status
  // -------------------------------------------------------------------------

  describe("GET /api/v1/fleet/status", () => {
    it("returns fleet overview with zero agents when none registered", async () => {
      const res = await authGet(`${baseUrl}/api/v1/fleet/status`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.success, true);
      assert.equal(data.data.totalAgents, 0);
      assert.equal(data.data.running, 0);
    });

    it("returns fleet data when agents are registered", async () => {
      const agentServer = new GovernanceApiServer([
        { agentId: "a1", status: "running", lastSeen: new Date().toISOString() },
        { agentId: "a2", status: "paused", lastSeen: new Date().toISOString() },
        { agentId: "a3", status: "stopped", lastSeen: null },
      ]);
      const port = await agentServer.start(0);
      const agentBase = `http://localhost:${port}`;

      try {
        const res = await authGet(`${agentBase}/api/v1/fleet/status`);
        assert.equal(res.status, 200);
        const data = JSON.parse(res.body);
        assert.equal(data.data.totalAgents, 3);
        assert.equal(data.data.running, 1);
        assert.equal(data.data.paused, 1);
        assert.equal(data.data.stopped, 1);
        assert.equal(data.data.agents.length, 3);
      } finally {
        await agentServer.stop();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Policy CRUD
  // -------------------------------------------------------------------------

  describe("GET /api/v1/policies", () => {
    it("returns empty list initially", async () => {
      const res = await authGet(`${baseUrl}/api/v1/policies`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.success, true);
      assert.deepEqual(data.data, []);
      assert.equal(data.metadata.total, 0);
    });

    it("returns all created policies", async () => {
      await authPost(`${baseUrl}/api/v1/policies`, { name: "P1" });
      await authPost(`${baseUrl}/api/v1/policies`, { name: "P2" });
      const res = await authGet(`${baseUrl}/api/v1/policies`);
      const data = JSON.parse(res.body);
      assert.equal(data.data.length, 2);
      assert.equal(data.metadata.total, 2);
    });
  });

  describe("POST /api/v1/policies", () => {
    it("creates a policy with required fields only", async () => {
      const res = await authPost(`${baseUrl}/api/v1/policies`, { name: "Test Policy" });
      assert.equal(res.status, 201);
      const data = JSON.parse(res.body);
      assert.equal(data.success, true);
      assert.equal(data.data.name, "Test Policy");
      assert.equal(typeof data.data.id, "string");
      assert.equal(data.data.version, 1);
      assert.equal(data.data.status, "active");
      assert.equal(data.data.enforcement, "monitor");
      assert.equal(data.data.scope, "fleet");
    });

    it("creates a policy with all fields specified", async () => {
      const payload = {
        name: "Strict Policy",
        description: "Enforces hard limits",
        enforcement: "enforce",
        scope: "role",
        rule: { maxCalls: 100 },
        createdBy: "operator-1",
      };
      const res = await authPost(`${baseUrl}/api/v1/policies`, payload);
      assert.equal(res.status, 201);
      const data = JSON.parse(res.body);
      assert.equal(data.data.enforcement, "enforce");
      assert.equal(data.data.scope, "role");
      assert.deepEqual(data.data.rule, { maxCalls: 100 });
      assert.equal(data.data.createdBy, "operator-1");
    });

    it("returns 400 when name is missing", async () => {
      const res = await authPost(`${baseUrl}/api/v1/policies`, { enforcement: "monitor" });
      assert.equal(res.status, 400);
      const data = JSON.parse(res.body);
      assert.equal(data.success, false);
      assert.ok(data.error.includes("name"));
    });

    it("returns 400 when name is empty string", async () => {
      const res = await authPost(`${baseUrl}/api/v1/policies`, { name: "  " });
      assert.equal(res.status, 400);
    });

    it("returns 400 for invalid enforcement value", async () => {
      const res = await authPost(`${baseUrl}/api/v1/policies`, {
        name: "P",
        enforcement: "invalid-value",
      });
      assert.equal(res.status, 400);
      const data = JSON.parse(res.body);
      assert.ok(data.error.includes("enforcement"));
    });

    it("returns 400 for invalid scope value", async () => {
      const res = await authPost(`${baseUrl}/api/v1/policies`, {
        name: "P",
        scope: "universe",
      });
      assert.equal(res.status, 400);
      const data = JSON.parse(res.body);
      assert.ok(data.error.includes("scope"));
    });

    it("returns 400 for invalid JSON body", async () => {
      const res = await new Promise<HttpResponse>((resolve, reject) => {
        const port = parseInt(new URL(baseUrl).port, 10);
        const req = http.request(
          {
            hostname: "localhost",
            port,
            path: "/api/v1/policies",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer admiral-dev-token",
            },
          },
          (r) => {
            let body = "";
            r.on("data", (c: string) => {
              body += c;
            });
            r.on("end", () => resolve({ status: r.statusCode!, headers: r.headers, body }));
          },
        );
        req.on("error", reject);
        req.write("not-valid-json{{{");
        req.end();
      });
      assert.equal(res.status, 400);
    });

    it("appends an audit event on successful creation", async () => {
      await authPost(`${baseUrl}/api/v1/policies`, { name: "Audited Policy" });
      const auditRes = await authGet(`${baseUrl}/api/v1/audit/events`);
      const auditData = JSON.parse(auditRes.body);
      const created = auditData.data.find((e: { type: string }) => e.type === "policy.created");
      assert.ok(created, "Expected a policy.created audit event");
      assert.equal(created.severity, "info");
    });
  });

  describe("GET /api/v1/policies/:id", () => {
    it("returns the policy by id", async () => {
      const createRes = await authPost(`${baseUrl}/api/v1/policies`, { name: "Fetch Me" });
      const created = JSON.parse(createRes.body).data;
      const res = await authGet(`${baseUrl}/api/v1/policies/${created.id}`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.data.id, created.id);
      assert.equal(data.data.name, "Fetch Me");
    });

    it("returns 404 for unknown id", async () => {
      const res = await authGet(`${baseUrl}/api/v1/policies/nonexistent-id`);
      assert.equal(res.status, 404);
      const data = JSON.parse(res.body);
      assert.equal(data.success, false);
      assert.ok(data.error.includes("nonexistent-id"));
    });
  });

  describe("PUT /api/v1/policies/:id", () => {
    it("updates policy fields and bumps version", async () => {
      const createRes = await authPost(`${baseUrl}/api/v1/policies`, {
        name: "Original",
        enforcement: "monitor",
      });
      const created = JSON.parse(createRes.body).data;

      const updateRes = await authPut(`${baseUrl}/api/v1/policies/${created.id}`, {
        name: "Updated",
        enforcement: "enforce",
      });
      assert.equal(updateRes.status, 200);
      const updated = JSON.parse(updateRes.body).data;
      assert.equal(updated.name, "Updated");
      assert.equal(updated.enforcement, "enforce");
      assert.equal(updated.version, 2);
    });

    it("preserves unmodified fields", async () => {
      const createRes = await authPost(`${baseUrl}/api/v1/policies`, {
        name: "Keep Fields",
        description: "Original desc",
        scope: "role",
      });
      const created = JSON.parse(createRes.body).data;

      const updateRes = await authPut(`${baseUrl}/api/v1/policies/${created.id}`, {
        name: "New Name",
      });
      const updated = JSON.parse(updateRes.body).data;
      assert.equal(updated.description, "Original desc");
      assert.equal(updated.scope, "role");
    });

    it("returns 404 for unknown policy id", async () => {
      const res = await authPut(`${baseUrl}/api/v1/policies/ghost`, { name: "X" });
      assert.equal(res.status, 404);
    });

    it("returns 400 for invalid enforcement in update", async () => {
      const createRes = await authPost(`${baseUrl}/api/v1/policies`, { name: "P" });
      const id = JSON.parse(createRes.body).data.id;
      const res = await authPut(`${baseUrl}/api/v1/policies/${id}`, {
        enforcement: "bad-value",
      });
      assert.equal(res.status, 400);
    });

    it("appends an audit event on successful update", async () => {
      const createRes = await authPost(`${baseUrl}/api/v1/policies`, { name: "Upd Audit" });
      const id = JSON.parse(createRes.body).data.id;
      await authPut(`${baseUrl}/api/v1/policies/${id}`, { name: "New Name" });

      const auditRes = await authGet(`${baseUrl}/api/v1/audit/events`);
      const events = JSON.parse(auditRes.body).data;
      const updEv = events.find((e: { type: string }) => e.type === "policy.updated");
      assert.ok(updEv, "Expected a policy.updated audit event");
    });

    it("successive updates increment version monotonically", async () => {
      const createRes = await authPost(`${baseUrl}/api/v1/policies`, { name: "Version Test" });
      const id = JSON.parse(createRes.body).data.id;
      await authPut(`${baseUrl}/api/v1/policies/${id}`, { name: "V2" });
      const res = await authPut(`${baseUrl}/api/v1/policies/${id}`, { name: "V3" });
      const data = JSON.parse(res.body).data;
      assert.equal(data.version, 3);
    });
  });

  describe("DELETE /api/v1/policies/:id", () => {
    it("deactivates an active policy", async () => {
      const createRes = await authPost(`${baseUrl}/api/v1/policies`, { name: "To Deactivate" });
      const id = JSON.parse(createRes.body).data.id;

      const delRes = await authDelete(`${baseUrl}/api/v1/policies/${id}`);
      assert.equal(delRes.status, 200);
      const data = JSON.parse(delRes.body);
      assert.equal(data.data.status, "inactive");
    });

    it("policy still retrievable after deactivation", async () => {
      const createRes = await authPost(`${baseUrl}/api/v1/policies`, { name: "Deactivated" });
      const id = JSON.parse(createRes.body).data.id;
      await authDelete(`${baseUrl}/api/v1/policies/${id}`);

      const getRes = await authGet(`${baseUrl}/api/v1/policies/${id}`);
      assert.equal(getRes.status, 200);
      const data = JSON.parse(getRes.body).data;
      assert.equal(data.status, "inactive");
    });

    it("returns 404 for unknown policy id", async () => {
      const res = await authDelete(`${baseUrl}/api/v1/policies/ghost`);
      assert.equal(res.status, 404);
    });

    it("appends a deactivation audit event", async () => {
      const createRes = await authPost(`${baseUrl}/api/v1/policies`, { name: "Del Audit" });
      const id = JSON.parse(createRes.body).data.id;
      await authDelete(`${baseUrl}/api/v1/policies/${id}`);

      const auditRes = await authGet(`${baseUrl}/api/v1/audit/events`);
      const events = JSON.parse(auditRes.body).data;
      const ev = events.find((e: { type: string }) => e.type === "policy.deactivated");
      assert.ok(ev, "Expected a policy.deactivated audit event");
    });
  });

  // -------------------------------------------------------------------------
  // Audit events
  // -------------------------------------------------------------------------

  describe("GET /api/v1/audit/events", () => {
    it("returns empty list initially", async () => {
      const res = await authGet(`${baseUrl}/api/v1/audit/events`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.success, true);
      assert.deepEqual(data.data, []);
    });

    it("returns events in insertion order", async () => {
      server.appendAuditEvent("test.a", "info", "test", {});
      server.appendAuditEvent("test.b", "high", "test", {});
      const res = await authGet(`${baseUrl}/api/v1/audit/events`);
      const events = JSON.parse(res.body).data;
      assert.equal(events[0].type, "test.a");
      assert.equal(events[1].type, "test.b");
    });

    it("filters by type", async () => {
      server.appendAuditEvent("alpha", "info", "test", {});
      server.appendAuditEvent("beta", "info", "test", {});
      server.appendAuditEvent("alpha", "info", "test", {});

      const res = await authGet(`${baseUrl}/api/v1/audit/events?type=alpha`);
      const events = JSON.parse(res.body).data;
      assert.equal(events.length, 2);
      assert.ok(events.every((e: { type: string }) => e.type === "alpha"));
    });

    it("filters by severity", async () => {
      server.appendAuditEvent("ev", "critical", "test", {});
      server.appendAuditEvent("ev", "low", "test", {});
      server.appendAuditEvent("ev", "critical", "test", {});

      const res = await authGet(`${baseUrl}/api/v1/audit/events?severity=critical`);
      const events = JSON.parse(res.body).data;
      assert.equal(events.length, 2);
    });

    it("filters by since timestamp", async () => {
      // Manually inject an event with a past timestamp
      const past = new Date(Date.now() - 60_000).toISOString();
      server.appendAuditEvent("old.event", "info", "test", {});
      // Patch its timestamp to the past
      const evList = (server as unknown as { auditStore: { events: { timestamp: string }[] } })
        .auditStore.events;
      evList[evList.length - 1].timestamp = past;

      server.appendAuditEvent("new.event", "info", "test", {});

      const since = new Date(Date.now() - 30_000).toISOString();
      const res = await authGet(
        `${baseUrl}/api/v1/audit/events?since=${encodeURIComponent(since)}`,
      );
      const events = JSON.parse(res.body).data;
      assert.equal(events.length, 1);
      assert.equal(events[0].type, "new.event");
    });

    it("combines multiple filters", async () => {
      server.appendAuditEvent("X", "critical", "test", {});
      server.appendAuditEvent("X", "low", "test", {});
      server.appendAuditEvent("Y", "critical", "test", {});

      const res = await authGet(`${baseUrl}/api/v1/audit/events?type=X&severity=critical`);
      const events = JSON.parse(res.body).data;
      assert.equal(events.length, 1);
      assert.equal(events[0].type, "X");
      assert.equal(events[0].severity, "critical");
    });

    it("includes metadata with total count", async () => {
      server.appendAuditEvent("ev", "info", "test", {});
      const res = await authGet(`${baseUrl}/api/v1/audit/events`);
      const data = JSON.parse(res.body);
      assert.equal(data.metadata.total, 1);
    });
  });

  // -------------------------------------------------------------------------
  // CORS and general behaviour
  // -------------------------------------------------------------------------

  describe("CORS and general", () => {
    it("OPTIONS returns 204 with CORS headers", async () => {
      const res = await new Promise<HttpResponse>((resolve, reject) => {
        const port = parseInt(new URL(baseUrl).port, 10);
        const req = http.request(
          { hostname: "localhost", port, path: "/api/v1/policies", method: "OPTIONS" },
          (r) => {
            let body = "";
            r.on("data", (c: string) => {
              body += c;
            });
            r.on("end", () => resolve({ status: r.statusCode!, headers: r.headers, body }));
          },
        );
        req.on("error", reject);
        req.end();
      });
      assert.equal(res.status, 204);
      assert.equal(res.headers["access-control-allow-origin"], "*");
    });

    it("all responses include CORS origin header", async () => {
      const res = await authGet(`${baseUrl}/api/v1/policies`);
      assert.equal(res.headers["access-control-allow-origin"], "*");
    });

    it("returns 404 for unknown route", async () => {
      const res = await authGet(`${baseUrl}/api/v1/unknown`);
      assert.equal(res.status, 404);
      const data = JSON.parse(res.body);
      assert.equal(data.success, false);
    });

    it("returns 404 for routes outside /api/v1/", async () => {
      const res = await authGet(`${baseUrl}/api/v2/policies`);
      assert.equal(res.status, 404);
    });
  });
});
