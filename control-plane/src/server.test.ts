import assert from "node:assert/strict";
import * as http from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { RunawayDetector } from "./runaway-detector";
import { AdmiralServer } from "./server";
import { ExecutionTrace } from "./trace";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function request(
  port: number,
  path: string,
  method = "GET",
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port, path, method }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode!, headers: res.headers, body }),
      );
    });
    req.on("error", reject);
    req.end();
  });
}

function json(res: { body: string }): unknown {
  return JSON.parse(res.body);
}

// ---------------------------------------------------------------------------
// AdmiralServer integration tests
// ---------------------------------------------------------------------------

describe("AdmiralServer", () => {
  let stream: EventStream;
  let detector: RunawayDetector;
  let trace: ExecutionTrace;
  let server: AdmiralServer;
  let port: number;

  beforeEach(async () => {
    stream = new EventStream();
    detector = new RunawayDetector(stream);
    trace = new ExecutionTrace(stream);
    server = new AdmiralServer(stream, detector, trace, "/tmp/admiral-test");

    // Pick a random high port to avoid collisions
    port = 10000 + Math.floor(Math.random() * 50000);
    await server.start(port);
  });

  afterEach(async () => {
    await server.stop();
  });

  // -----------------------------------------------------------------------
  // Health
  // -----------------------------------------------------------------------

  it("GET /health returns healthy status with no events", async () => {
    const res = await request(port, "/health");
    assert.equal(res.status, 200);
    const data = json(res) as Record<string, unknown>;
    assert.equal(data.status, "healthy");
    assert.ok(typeof data.uptime_ms === "number");
  });

  it("GET /health includes event and alert counts", async () => {
    stream.emit("a1", "Agent-1", "agent_started");
    const res = await request(port, "/health");
    const data = json(res) as { events: { total: number }; alerts: { active: number } };
    assert.equal(data.events.total, 1);
    assert.equal(data.alerts.active, 0);
  });

  // -----------------------------------------------------------------------
  // API routes
  // -----------------------------------------------------------------------

  it("GET /api/events returns event list", async () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
    const res = await request(port, "/api/events");
    assert.equal(res.status, 200);
    const events = json(res) as unknown[];
    assert.equal(events.length, 2);
  });

  it("GET /api/alerts returns empty array initially", async () => {
    const res = await request(port, "/api/alerts");
    assert.equal(res.status, 200);
    assert.deepEqual(json(res), []);
  });

  it("GET /api/alerts/active returns empty array initially", async () => {
    const res = await request(port, "/api/alerts/active");
    assert.equal(res.status, 200);
    assert.deepEqual(json(res), []);
  });

  it("GET /api/config returns detector configuration", async () => {
    const res = await request(port, "/api/config");
    assert.equal(res.status, 200);
    const config = json(res) as Record<string, unknown>;
    assert.ok("maxRepeatedToolCalls" in config);
    assert.ok("spcEnabled" in config);
  });

  it("GET /api/trace returns trace tree", async () => {
    const res = await request(port, "/api/trace");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(json(res)));
  });

  it("GET /api/trace/ascii returns plain text", async () => {
    stream.emit("a1", "Agent-1", "agent_started");
    const res = await request(port, "/api/trace/ascii");
    assert.equal(res.status, 200);
    assert.ok(res.headers["content-type"]?.includes("text/plain"));
  });

  it("GET /api/stats returns trace and ingester stats", async () => {
    const res = await request(port, "/api/stats");
    assert.equal(res.status, 200);
    const stats = json(res) as { trace: Record<string, unknown> };
    assert.ok("trace" in stats);
    assert.ok("eventCount" in stats.trace);
  });

  it("GET /api/session returns 404 when no session state file", async () => {
    const res = await request(port, "/api/session");
    assert.equal(res.status, 404);
  });

  // -----------------------------------------------------------------------
  // Agent and alert management
  // -----------------------------------------------------------------------

  it("GET /api/agents/:id/resume calls resumeAgent", async () => {
    const res = await request(port, "/api/agents/agent-1/resume");
    assert.equal(res.status, 200);
    const data = json(res) as { resumed: string };
    assert.equal(data.resumed, "agent-1");
  });

  it("GET /api/alerts/:id/resolve calls resolveAlert", async () => {
    const res = await request(port, "/api/alerts/alert-1/resolve");
    assert.equal(res.status, 200);
    const data = json(res) as { resolved: string };
    assert.equal(data.resolved, "alert-1");
  });

  // -----------------------------------------------------------------------
  // CORS and edge cases
  // -----------------------------------------------------------------------

  it("OPTIONS request returns 204 with CORS headers", async () => {
    const res = await request(port, "/api/events", "OPTIONS");
    assert.equal(res.status, 204);
    assert.equal(res.headers["access-control-allow-origin"], "*");
    assert.ok(res.headers["access-control-allow-methods"]?.includes("GET"));
  });

  it("GET returns CORS headers on normal requests", async () => {
    const res = await request(port, "/api/events");
    assert.equal(res.headers["access-control-allow-origin"], "*");
  });

  it("GET /unknown returns 404", async () => {
    const res = await request(port, "/does-not-exist");
    assert.equal(res.status, 404);
  });

  it("GET / returns HTML dashboard", async () => {
    const res = await request(port, "/");
    assert.equal(res.status, 200);
    assert.ok(res.headers["content-type"]?.includes("text/html"));
    assert.ok(res.body.includes("Admiral"));
  });
});
