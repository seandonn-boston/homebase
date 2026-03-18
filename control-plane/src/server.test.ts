import assert from "node:assert/strict";
import * as http from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { RunawayDetector } from "./runaway-detector";
import { AdmiralServer } from "./server";
import { ExecutionTrace } from "./trace";

/** Make a GET request and return { status, headers, body }. */
function httpGet(
  url: string,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
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

/** Make an OPTIONS request. */
function httpOptions(
  url: string,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      { hostname: parsed.hostname, port: parsed.port, path: parsed.pathname, method: "OPTIONS" },
      (res) => {
        let body = "";
        res.on("data", (chunk: string) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("AdmiralServer", () => {
  let stream: EventStream;
  let detector: RunawayDetector;
  let trace: ExecutionTrace;
  let server: AdmiralServer;
  let baseUrl: string;

  beforeEach(async () => {
    stream = new EventStream();
    detector = new RunawayDetector(stream);
    trace = new ExecutionTrace(stream);
    server = new AdmiralServer(stream, detector, trace);
    const port = await server.start(0);
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    await server.stop();
  });

  describe("health endpoint", () => {
    it("GET /health returns 200 with healthy status when no events", async () => {
      const res = await httpGet(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.status, "healthy");
      assert.equal(typeof data.uptime_ms, "number");
      assert.equal(data.events.total, 0);
      assert.equal(data.events.last_event_age_ms, null);
    });

    it("GET /health returns 200 with healthy status when events exist", async () => {
      stream.emit("a1", "Agent1", "tool_called", { tool: "read" });
      const res = await httpGet(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.status, "healthy");
      assert.equal(data.events.total, 1);
      assert.equal(typeof data.events.last_event_age_ms, "number");
    });

    it("GET /health includes alert counts", async () => {
      const res = await httpGet(`${baseUrl}/health`);
      const data = JSON.parse(res.body);
      assert.equal(data.alerts.active, 0);
      assert.equal(data.alerts.total, 0);
    });
  });

  describe("API endpoints", () => {
    it("GET /api/events returns empty array initially", async () => {
      const res = await httpGet(`${baseUrl}/api/events`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.deepEqual(data, []);
    });

    it("GET /api/events returns emitted events", async () => {
      stream.emit("a1", "Agent1", "tool_called", { tool: "read" });
      stream.emit("a1", "Agent1", "tool_result", { tool: "read" });
      const res = await httpGet(`${baseUrl}/api/events`);
      const data = JSON.parse(res.body);
      assert.equal(data.length, 2);
      assert.equal(data[0].type, "tool_called");
      assert.equal(data[1].type, "tool_result");
    });

    it("GET /api/alerts returns empty array initially", async () => {
      const res = await httpGet(`${baseUrl}/api/alerts`);
      assert.equal(res.status, 200);
      assert.deepEqual(JSON.parse(res.body), []);
    });

    it("GET /api/alerts/active returns empty array initially", async () => {
      const res = await httpGet(`${baseUrl}/api/alerts/active`);
      assert.equal(res.status, 200);
      assert.deepEqual(JSON.parse(res.body), []);
    });

    it("GET /api/config returns detector config", async () => {
      const res = await httpGet(`${baseUrl}/api/config`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.equal(typeof data.maxRepeatedToolCalls, "number");
      assert.equal(typeof data.spcEnabled, "boolean");
    });

    it("GET /api/trace returns trace tree", async () => {
      const res = await httpGet(`${baseUrl}/api/trace`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(JSON.parse(res.body)));
    });

    it("GET /api/trace/ascii returns plain text", async () => {
      const res = await httpGet(`${baseUrl}/api/trace/ascii`);
      assert.equal(res.status, 200);
      assert.ok(res.headers["content-type"]?.includes("text/plain"));
    });

    it("GET /api/stats returns trace stats", async () => {
      const res = await httpGet(`${baseUrl}/api/stats`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.ok("trace" in data);
    });

    it("GET /api/session returns 404 when no session state file", async () => {
      const res = await httpGet(`${baseUrl}/api/session`);
      assert.equal(res.status, 404);
      const data = JSON.parse(res.body);
      assert.ok(data.error);
    });
  });

  describe("agent control endpoints", () => {
    it("GET /api/agents/:id/resume resumes a paused agent", async () => {
      const res = await httpGet(`${baseUrl}/api/agents/agent-1/resume`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.resumed, "agent-1");
    });

    it("GET /api/alerts/:id/resolve resolves an alert", async () => {
      const res = await httpGet(`${baseUrl}/api/alerts/alert-1/resolve`);
      assert.equal(res.status, 200);
      const data = JSON.parse(res.body);
      assert.equal(data.resolved, "alert-1");
    });
  });

  describe("CORS and general", () => {
    it("OPTIONS returns 204 with CORS headers", async () => {
      const res = await httpOptions(`${baseUrl}/api/events`);
      assert.equal(res.status, 204);
      assert.equal(res.headers["access-control-allow-origin"], "*");
    });

    it("GET /unknown returns 404 with JSON error", async () => {
      const res = await httpGet(`${baseUrl}/unknown`);
      assert.equal(res.status, 404);
      const data = JSON.parse(res.body);
      assert.equal(data.error, "Not found");
      assert.equal(data.status, 404);
    });

    it("GET / returns HTML", async () => {
      const res = await httpGet(`${baseUrl}/`);
      assert.equal(res.status, 200);
      assert.ok(res.headers["content-type"]?.includes("text/html"));
    });

    it("all responses include Access-Control-Allow-Origin", async () => {
      const res = await httpGet(`${baseUrl}/api/events`);
      assert.equal(res.headers["access-control-allow-origin"], "*");
    });
  });
});
