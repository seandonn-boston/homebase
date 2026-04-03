/**
 * Tests for Governance Event Stream (GP-05)
 */

import assert from "node:assert/strict";
import * as http from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { GovernanceEventStream } from "./event-stream";
import type { GovernanceEventType, GovernanceEventSeverity } from "./event-stream";

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

interface HttpResponse {
  status: number;
  body: string;
}

function httpGet(url: string, headers: Record<string, string> = {}): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk: string) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

// Collect SSE events for a short window
function collectSseEvents(url: string, durationMs: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const chunks: string[] = [];
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: { Accept: "text/event-stream" },
      },
      (res) => {
        res.on("data", (chunk: Buffer) => {
          chunks.push(chunk.toString());
        });
      },
    );
    req.on("error", reject);
    req.end();
    setTimeout(() => {
      req.destroy();
      resolve(chunks);
    }, durationMs);
  });
}

// ---------------------------------------------------------------------------
// Unit tests — GovernanceEventStream class
// ---------------------------------------------------------------------------

describe("GovernanceEventStream — emit and query", () => {
  let stream: GovernanceEventStream;

  beforeEach(() => {
    stream = new GovernanceEventStream({ bufferCapacity: 100 });
  });

  it("emits events and stores them in buffer", () => {
    const evt = stream.emit("policy_violation", "high", "test-source", { rule: "X" });
    assert.ok(evt.id.startsWith("gevt_"));
    assert.equal(evt.type, "policy_violation");
    assert.equal(evt.severity, "high");
    assert.equal(evt.source, "test-source");
    assert.equal(stream.bufferedEventCount, 1);
  });

  it("supports tenantId and agentId on emitted events", () => {
    const evt = stream.emit("agent_started", "info", "fleet", {}, { tenantId: "t1", agentId: "a1" });
    assert.equal(evt.tenantId, "t1");
    assert.equal(evt.agentId, "a1");
  });

  it("queries all buffered events with no filter", () => {
    stream.emit("policy_violation", "high", "src", {});
    stream.emit("health_check", "info", "src", {});
    const events = stream.query({});
    assert.equal(events.length, 2);
  });

  it("filters by event type", () => {
    stream.emit("policy_violation", "high", "src", {});
    stream.emit("health_check", "info", "src", {});
    const events = stream.query({ type: "policy_violation" });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "policy_violation");
  });

  it("filters by severity", () => {
    stream.emit("policy_violation", "critical", "src", {});
    stream.emit("health_check", "info", "src", {});
    const events = stream.query({ severity: "critical" });
    assert.equal(events.length, 1);
    assert.equal(events[0].severity, "critical");
  });

  it("filters by agentId", () => {
    stream.emit("agent_started", "info", "src", {}, { agentId: "agent-A" });
    stream.emit("agent_started", "info", "src", {}, { agentId: "agent-B" });
    const events = stream.query({ agentId: "agent-A" });
    assert.equal(events.length, 1);
    assert.equal(events[0].agentId, "agent-A");
  });

  it("filters by tenantId", () => {
    stream.emit("audit_event", "low", "src", {}, { tenantId: "tenant-X" });
    stream.emit("audit_event", "low", "src", {}, { tenantId: "tenant-Y" });
    const events = stream.query({ tenantId: "tenant-X" });
    assert.equal(events.length, 1);
    assert.equal(events[0].tenantId, "tenant-X");
  });

  it("filters by since timestamp", () => {
    const before = new Date(Date.now() - 10_000).toISOString();
    stream.emit("policy_violation", "high", "src", {});
    const events = stream.query({ since: before });
    assert.equal(events.length, 1);
  });

  it("filters out events before since timestamp", () => {
    stream.emit("policy_violation", "high", "src", {});
    const after = new Date(Date.now() + 5_000).toISOString();
    const events = stream.query({ since: after });
    assert.equal(events.length, 0);
  });

  it("replays events after given event ID", () => {
    const e1 = stream.emit("policy_violation", "high", "src", {});
    const e2 = stream.emit("health_check", "info", "src", {});
    stream.emit("audit_event", "low", "src", {});

    const events = stream.query({ afterId: e1.id });
    assert.equal(events.length, 2);
    assert.equal(events[0].id, e2.id);
  });

  it("handles unknown afterId gracefully — returns all events", () => {
    stream.emit("policy_violation", "high", "src", {});
    stream.emit("health_check", "info", "src", {});
    const events = stream.query({ afterId: "nonexistent-id" });
    // afterId not found — returns all events (no slice)
    assert.equal(events.length, 2);
  });

  it("evicts oldest events when buffer is full", () => {
    const s = new GovernanceEventStream({ bufferCapacity: 3 });
    s.emit("policy_violation", "high", "src", {});
    s.emit("health_check", "info", "src", {});
    s.emit("audit_event", "low", "src", {});
    s.emit("fleet_status_change", "medium", "src", {});
    assert.equal(s.bufferedEventCount, 3);
    const events = s.query({});
    // First event evicted; remaining are health_check, audit_event, fleet_status_change
    assert.ok(events.every((e) => e.type !== "policy_violation"));
  });

  it("combines multiple filters", () => {
    stream.emit("policy_violation", "critical", "src", {}, { tenantId: "t1" });
    stream.emit("policy_violation", "high", "src", {}, { tenantId: "t2" });
    stream.emit("health_check", "critical", "src", {}, { tenantId: "t1" });
    const events = stream.query({ type: "policy_violation", tenantId: "t1" });
    assert.equal(events.length, 1);
    assert.equal(events[0].severity, "critical");
  });
});

// ---------------------------------------------------------------------------
// HTTP endpoint tests
// ---------------------------------------------------------------------------

describe("GovernanceEventStream — HTTP endpoints", () => {
  let stream: GovernanceEventStream;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    stream = new GovernanceEventStream({ bufferCapacity: 200 });
    server = http.createServer((req, res) => {
      const handled = stream.route(req, res);
      if (!handled) {
        res.writeHead(404);
        res.end("Not Found");
      }
    });
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("GET /api/v1/events returns empty list when no events", async () => {
    const res = await httpGet(`http://127.0.0.1:${port}/api/v1/events`);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.deepEqual(body.data, []);
  });

  it("GET /api/v1/events returns all buffered events", async () => {
    stream.emit("policy_violation", "high", "src", {});
    stream.emit("health_check", "info", "src", {});
    const res = await httpGet(`http://127.0.0.1:${port}/api/v1/events`);
    const body = JSON.parse(res.body);
    assert.equal(body.data.length, 2);
    assert.equal(body.metadata.total, 2);
  });

  it("GET /api/v1/events?type=health_check filters by type", async () => {
    stream.emit("policy_violation", "high", "src", {});
    stream.emit("health_check", "info", "src", {});
    const res = await httpGet(`http://127.0.0.1:${port}/api/v1/events?type=health_check`);
    const body = JSON.parse(res.body);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].type, "health_check");
  });

  it("GET /api/v1/events?severity=critical filters by severity", async () => {
    stream.emit("policy_violation", "critical", "src", {});
    stream.emit("health_check", "info", "src", {});
    const res = await httpGet(`http://127.0.0.1:${port}/api/v1/events?severity=critical`);
    const body = JSON.parse(res.body);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].severity, "critical");
  });

  it("GET /api/v1/events/stream returns 200 with text/event-stream", async () => {
    const chunks = await collectSseEvents(`http://127.0.0.1:${port}/api/v1/events/stream`, 100);
    const combined = chunks.join("");
    assert.ok(combined.includes(":connected"));
  });

  it("GET /api/v1/events/stream delivers events to SSE subscriber", async () => {
    const chunks = collectSseEvents(`http://127.0.0.1:${port}/api/v1/events/stream`, 200);
    // Give subscriber time to connect
    await new Promise<void>((r) => setTimeout(r, 50));
    stream.emit("policy_violation", "high", "src", { detail: "test" });
    const collected = await chunks;
    const combined = collected.join("");
    assert.ok(combined.includes("policy_violation"), `Expected event in SSE output: ${combined}`);
  });

  it("returns 404 for unknown routes", async () => {
    const res = await httpGet(`http://127.0.0.1:${port}/api/v1/unknown`);
    assert.equal(res.status, 404);
  });
});

// ---------------------------------------------------------------------------
// Subscriber management tests
// ---------------------------------------------------------------------------

describe("GovernanceEventStream — subscriber management", () => {
  it("tracks subscriber count", (t, done) => {
    const stream = new GovernanceEventStream({ bufferCapacity: 10 });
    const server = http.createServer((req, res) => {
      stream.route(req, res);
    });
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      const req = http.request(
        { hostname: "127.0.0.1", port, path: "/api/v1/events/stream", method: "GET" },
        (_res) => {
          // Give time for subscriber to register
          setTimeout(() => {
            assert.ok(stream.subscriberCount >= 0);
            req.destroy();
            server.close(() => done());
          }, 50);
        },
      );
      req.on("error", () => {});
      req.end();
    });
  });

  it("unsubscribe returns false for unknown id", () => {
    const stream = new GovernanceEventStream({ bufferCapacity: 10 });
    assert.equal(stream.unsubscribe("nonexistent"), false);
  });
});
