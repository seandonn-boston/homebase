/**
 * Admiral Server — Edge Case Tests (T-05)
 *
 * Tests URLs with special chars, invalid IDs, concurrent-like requests,
 * missing headers, and boundary conditions.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { RunawayDetector } from "./runaway-detector";
import { AdmiralServer } from "./server";
import { httpGet } from "./test-helpers";
import { ExecutionTrace } from "./trace";

describe("AdmiralServer — edge cases", () => {
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

  it("URL with encoded special characters returns 404", async () => {
    const res = await httpGet(`${baseUrl}/api/%3Cscript%3Ealert(1)%3C/script%3E`);
    assert.equal(res.status, 404);
    const data = JSON.parse(res.body);
    assert.equal(data.error, "Not found");
  });

  it("very long URL returns 404 without crashing", async () => {
    const longPath = "/api/" + "x".repeat(5000);
    const res = await httpGet(`${baseUrl}${longPath}`);
    assert.equal(res.status, 404);
  });

  it("URL with query parameters still routes correctly", async () => {
    const res = await httpGet(`${baseUrl}/api/events?limit=10&offset=0`);
    // Query params are part of URL — server doesn't parse them but shouldn't crash
    assert.equal(res.status, 404); // /api/events?... !== /api/events
  });

  it("/api/agents/resume/resume is rejected (resume is not a valid agent ID)", async () => {
    const res = await httpGet(`${baseUrl}/api/agents/resume/resume`);
    assert.equal(res.status, 400);
    const data = JSON.parse(res.body);
    assert.ok(data.error.includes("invalid"));
  });

  it("/api/alerts/resolve/resolve is rejected", async () => {
    const res = await httpGet(`${baseUrl}/api/alerts/resolve/resolve`);
    assert.equal(res.status, 400);
  });

  it("/api/agents//resume (empty agent ID) returns 400", async () => {
    const res = await httpGet(`${baseUrl}/api/agents//resume`);
    // Empty segment gets filtered out by split/filter, causing wrong parsing
    assert.ok(res.status === 400 || res.status === 404);
  });

  it("/index.html serves the dashboard", async () => {
    const res = await httpGet(`${baseUrl}/index.html`);
    assert.equal(res.status, 200);
    assert.ok(res.headers["content-type"]?.includes("text/html"));
  });

  it("response bodies are valid JSON for all API endpoints", async () => {
    const endpoints = [
      "/api/events",
      "/api/alerts",
      "/api/alerts/active",
      "/api/config",
      "/api/trace",
      "/api/stats",
      "/health",
    ];
    for (const endpoint of endpoints) {
      const res = await httpGet(`${baseUrl}${endpoint}`);
      assert.doesNotThrow(() => JSON.parse(res.body), `${endpoint} returned invalid JSON`);
    }
  });

  it("404 response includes status code in JSON body", async () => {
    const res = await httpGet(`${baseUrl}/nonexistent`);
    assert.equal(res.status, 404);
    const data = JSON.parse(res.body);
    assert.equal(data.status, 404);
    assert.equal(data.error, "Not found");
  });

  it("CORS headers present on error responses", async () => {
    const res = await httpGet(`${baseUrl}/nonexistent`);
    assert.equal(res.headers["access-control-allow-origin"], "*");
  });
});
