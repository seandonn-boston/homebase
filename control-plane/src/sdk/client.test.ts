/**
 * Tests for Governance SDK Client (GP-07)
 */

import assert from "node:assert/strict";
import * as http from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { GovernanceClient } from "./client";
import { GovernanceSdkError, GovernanceValidationError } from "./types";

// ---------------------------------------------------------------------------
// Minimal mock API server
// ---------------------------------------------------------------------------

interface RouteHandler {
  (req: http.IncomingMessage, res: http.ServerResponse): void;
}

class MockApiServer {
  private server: http.Server;
  private routes: Map<string, RouteHandler> = new Map();
  port = 0;

  constructor() {
    this.server = http.createServer((req, res) => {
      const key = `${req.method ?? "GET"} ${(req.url ?? "/").split("?")[0]}`;
      const handler = this.routes.get(key);
      if (handler) {
        handler(req, res);
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Not found" }));
      }
    });
  }

  on(method: string, path: string, handler: RouteHandler): this {
    this.routes.set(`${method} ${path}`, handler);
    return this;
  }

  sendJson(res: http.ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(0, () => {
        this.port = (this.server.address() as { port: number }).port;
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: string) => { data += chunk; });
    req.on("end", () => resolve(data));
  });
}

function makePolicy() {
  const now = new Date().toISOString();
  return {
    id: "pol-1",
    name: "Test Policy",
    description: "",
    version: 1,
    enforcement: "monitor",
    scope: "fleet",
    rule: {},
    status: "active",
    createdAt: now,
    updatedAt: now,
    createdBy: "sdk-test",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GovernanceClient — getHealth", () => {
  let mock: MockApiServer;
  let client: GovernanceClient;

  beforeEach(async () => {
    mock = new MockApiServer();
    mock.on("GET", "/api/v1/health", (_req, res) => {
      mock.sendJson(res, 200, {
        success: true,
        data: { status: "healthy", uptime_ms: 12345, policies: 3, auditEvents: 10 },
      });
    });
    await mock.start();
    client = new GovernanceClient({ baseUrl: `http://127.0.0.1:${mock.port}`, token: "test-token" });
  });

  afterEach(() => mock.stop());

  it("returns health status", async () => {
    const health = await client.getHealth();
    assert.equal(health.status, "healthy");
    assert.equal(health.policies, 3);
  });
});

describe("GovernanceClient — listPolicies", () => {
  let mock: MockApiServer;
  let client: GovernanceClient;

  beforeEach(async () => {
    mock = new MockApiServer();
    mock.on("GET", "/api/v1/policies", (_req, res) => {
      mock.sendJson(res, 200, {
        success: true,
        data: [makePolicy()],
        metadata: { total: 1, page: 1, pageSize: 1 },
      });
    });
    await mock.start();
    client = new GovernanceClient({ baseUrl: `http://127.0.0.1:${mock.port}`, token: "tok" });
  });

  afterEach(() => mock.stop());

  it("returns policy list", async () => {
    const policies = await client.listPolicies();
    assert.equal(policies.length, 1);
    assert.equal(policies[0].id, "pol-1");
  });
});

describe("GovernanceClient — createPolicy", () => {
  let mock: MockApiServer;
  let client: GovernanceClient;

  beforeEach(async () => {
    mock = new MockApiServer();
    mock.on("POST", "/api/v1/policies", async (req, res) => {
      const body = await readBody(req);
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (!parsed.name) {
        mock.sendJson(res, 400, { success: false, error: "name required" });
        return;
      }
      mock.sendJson(res, 201, { success: true, data: { ...makePolicy(), name: String(parsed.name) } });
    });
    await mock.start();
    client = new GovernanceClient({ baseUrl: `http://127.0.0.1:${mock.port}`, token: "tok" });
  });

  afterEach(() => mock.stop());

  it("creates a policy", async () => {
    const policy = await client.createPolicy({ name: "My Policy", createdBy: "sdk" });
    assert.equal(policy.name, "My Policy");
  });

  it("throws GovernanceValidationError on 400", async () => {
    await assert.rejects(
      () => client.createPolicy({ name: "", createdBy: "sdk" }),
      (err) => err instanceof GovernanceValidationError,
    );
  });
});

describe("GovernanceClient — updatePolicy", () => {
  let mock: MockApiServer;
  let client: GovernanceClient;

  beforeEach(async () => {
    mock = new MockApiServer();
    mock.on("PUT", "/api/v1/policies/pol-1", async (req, res) => {
      const body = await readBody(req);
      const parsed = JSON.parse(body) as Record<string, unknown>;
      mock.sendJson(res, 200, { success: true, data: { ...makePolicy(), version: 2, rationale: parsed.rationale } });
    });
    await mock.start();
    client = new GovernanceClient({ baseUrl: `http://127.0.0.1:${mock.port}`, token: "tok" });
  });

  afterEach(() => mock.stop());

  it("updates a policy", async () => {
    const updated = await client.updatePolicy("pol-1", { updatedBy: "user", rationale: "fix it" });
    assert.equal(updated.version, 2);
  });
});

describe("GovernanceClient — deactivatePolicy", () => {
  let mock: MockApiServer;
  let client: GovernanceClient;

  beforeEach(async () => {
    mock = new MockApiServer();
    mock.on("DELETE", "/api/v1/policies/pol-1", (_req, res) => {
      mock.sendJson(res, 200, { success: true, data: { ...makePolicy(), status: "inactive" } });
    });
    await mock.start();
    client = new GovernanceClient({ baseUrl: `http://127.0.0.1:${mock.port}`, token: "tok" });
  });

  afterEach(() => mock.stop());

  it("deactivates a policy", async () => {
    const deactivated = await client.deactivatePolicy("pol-1");
    assert.equal(deactivated.status, "inactive");
  });
});

describe("GovernanceClient — getAuditEvents", () => {
  let mock: MockApiServer;
  let client: GovernanceClient;

  beforeEach(async () => {
    mock = new MockApiServer();
    mock.on("GET", "/api/v1/audit/events", (_req, res) => {
      mock.sendJson(res, 200, {
        success: true,
        data: [{ id: "evt-1", timestamp: new Date().toISOString(), type: "policy.created", severity: "info", source: "api", detail: {} }],
      });
    });
    await mock.start();
    client = new GovernanceClient({ baseUrl: `http://127.0.0.1:${mock.port}`, token: "tok" });
  });

  afterEach(() => mock.stop());

  it("returns audit events", async () => {
    const events = await client.getAuditEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].id, "evt-1");
  });
});

describe("GovernanceClient — getFleetStatus", () => {
  let mock: MockApiServer;
  let client: GovernanceClient;

  beforeEach(async () => {
    mock = new MockApiServer();
    mock.on("GET", "/api/v1/fleet/status", (_req, res) => {
      mock.sendJson(res, 200, {
        success: true,
        data: { totalAgents: 2, running: 1, paused: 0, stopped: 1, agents: [] },
      });
    });
    await mock.start();
    client = new GovernanceClient({ baseUrl: `http://127.0.0.1:${mock.port}`, token: "tok" });
  });

  afterEach(() => mock.stop());

  it("returns fleet status", async () => {
    const status = await client.getFleetStatus();
    assert.equal(status.totalAgents, 2);
    assert.equal(status.running, 1);
  });
});

describe("GovernanceClient — generateReport", () => {
  let mock: MockApiServer;
  let client: GovernanceClient;

  beforeEach(async () => {
    mock = new MockApiServer();
    mock.on("POST", "/api/v1/reports/generate", async (req, res) => {
      const body = await readBody(req);
      const parsed = JSON.parse(body) as Record<string, unknown>;
      mock.sendJson(res, 200, {
        success: true,
        data: {
          id: "rpt-1",
          type: parsed.type,
          generatedAt: new Date().toISOString(),
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          json: {},
          text: "Report text",
        },
      });
    });
    await mock.start();
    client = new GovernanceClient({ baseUrl: `http://127.0.0.1:${mock.port}`, token: "tok" });
  });

  afterEach(() => mock.stop());

  it("generates a report", async () => {
    const report = await client.generateReport({
      type: "compliance",
      startDate: new Date(Date.now() - 3600_000).toISOString(),
      endDate: new Date().toISOString(),
    });
    assert.equal(report.id, "rpt-1");
    assert.equal(report.type, "compliance");
  });
});

describe("GovernanceClient — retry logic", () => {
  it("retries on 503 and succeeds", async () => {
    let attempts = 0;
    const mock = new MockApiServer();
    mock.on("GET", "/api/v1/health", (_req, res) => {
      attempts++;
      if (attempts < 2) {
        mock.sendJson(res, 503, { success: false, error: "Service Unavailable" });
      } else {
        mock.sendJson(res, 200, { success: true, data: { status: "healthy", uptime_ms: 1, policies: 0, auditEvents: 0 } });
      }
    });
    await mock.start();

    const client = new GovernanceClient({
      baseUrl: `http://127.0.0.1:${mock.port}`,
      token: "tok",
      maxRetries: 3,
      initialBackoffMs: 5,
    });

    const health = await client.getHealth();
    assert.equal(health.status, "healthy");
    assert.equal(attempts, 2);

    await mock.stop();
  });

  it("throws GovernanceSdkError after exhausting retries", async () => {
    const mock = new MockApiServer();
    mock.on("GET", "/api/v1/health", (_req, res) => {
      mock.sendJson(res, 503, { success: false, error: "Service Unavailable" });
    });
    await mock.start();

    const client = new GovernanceClient({
      baseUrl: `http://127.0.0.1:${mock.port}`,
      token: "tok",
      maxRetries: 1,
      initialBackoffMs: 5,
    });

    await assert.rejects(
      () => client.getHealth(),
      (err) => err instanceof GovernanceSdkError,
    );

    await mock.stop();
  });

  it("throws GovernanceSdkError on 401 without retrying", async () => {
    let attempts = 0;
    const mock = new MockApiServer();
    mock.on("GET", "/api/v1/health", (_req, res) => {
      attempts++;
      mock.sendJson(res, 401, { success: false, error: "Unauthorized" });
    });
    await mock.start();

    const client = new GovernanceClient({
      baseUrl: `http://127.0.0.1:${mock.port}`,
      token: "bad-token",
      maxRetries: 3,
      initialBackoffMs: 5,
    });

    await assert.rejects(
      () => client.getHealth(),
      (err) => err instanceof GovernanceSdkError,
    );
    // 401 is not retried — should only be 1 attempt
    assert.equal(attempts, 1);

    await mock.stop();
  });
});

describe("GovernanceClient — subscribeToEvents", () => {
  it("returns an EventSubscription that can be closed", (t, done) => {
    const mock = new MockApiServer();
    mock.on("GET", "/api/v1/events/stream", (_req, res) => {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(":connected\n\n");
      // Keep connection open briefly
      setTimeout(() => res.end(), 200);
    });

    mock.start().then(() => {
      const client = new GovernanceClient({
        baseUrl: `http://127.0.0.1:${mock.port}`,
        token: "tok",
        initialBackoffMs: 5000, // prevent reconnect during test
      });

      const sub = client.subscribeToEvents(() => {});
      assert.ok(sub !== null);
      assert.ok(typeof sub.close === "function");
      assert.ok(typeof sub.isActive === "boolean");

      setTimeout(() => {
        sub.close();
        assert.equal(sub.isActive, false);
        mock.stop().then(() => done());
      }, 50);
    });
  });
});
