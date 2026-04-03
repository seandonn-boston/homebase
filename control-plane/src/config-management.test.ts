/**
 * Tests for Configuration Management (GP-09)
 */

import assert from "node:assert/strict";
import * as http from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ConfigurationManager } from "./config-management";
import type { ConfigMap, ConfigSchema } from "./config-management";

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function httpRequest(
  url: string,
  method: string,
  body?: unknown,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = body !== undefined ? JSON.stringify(body) : "";
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(bodyStr)),
        },
      },
      (res) => {
        let respBody = "";
        res.on("data", (chunk: string) => { respBody += chunk; });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: respBody }));
      },
    );
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Unit tests — ConfigurationManager class
// ---------------------------------------------------------------------------

describe("ConfigurationManager — apply and retrieve", () => {
  it("returns null when no config set", () => {
    const mgr = new ConfigurationManager();
    assert.equal(mgr.getCurrent(), null);
    assert.equal(mgr.getCurrentConfig(), null);
  });

  it("applies a config and returns version 1", () => {
    const mgr = new ConfigurationManager();
    const v = mgr.apply({ maxAgents: 10, logLevel: "info" }, "alice", "Initial config");
    assert.equal(v.version, 1);
    assert.equal(v.author, "alice");
    assert.equal(v.rationale, "Initial config");
    assert.deepEqual(v.config, { maxAgents: 10, logLevel: "info" });
  });

  it("increments version on each apply", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ a: 1 }, "alice", "first");
    const v2 = mgr.apply({ a: 2 }, "bob", "second");
    assert.equal(v2.version, 2);
    assert.equal(mgr.versionCount, 2);
  });

  it("getCurrent returns the latest version", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ a: 1 }, "alice", "first");
    mgr.apply({ a: 2 }, "bob", "second");
    const current = mgr.getCurrent();
    assert.equal(current?.version, 2);
    assert.deepEqual(current?.config, { a: 2 });
  });

  it("getCurrentConfig returns a deep copy", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ nested: { x: 1 } }, "alice", "init");
    const config = mgr.getCurrentConfig() as { nested: { x: number } };
    config.nested.x = 999;
    const again = mgr.getCurrentConfig() as { nested: { x: number } };
    assert.equal(again.nested.x, 1);
  });

  it("throws on missing author", () => {
    const mgr = new ConfigurationManager();
    assert.throws(() => mgr.apply({}, "", "rationale"), /Author is required/);
  });

  it("throws on missing rationale", () => {
    const mgr = new ConfigurationManager();
    assert.throws(() => mgr.apply({}, "alice", ""), /Rationale is required/);
  });
});

describe("ConfigurationManager — version history", () => {
  it("getHistory returns all versions in order", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ a: 1 }, "alice", "first");
    mgr.apply({ a: 2 }, "bob", "second");
    mgr.apply({ a: 3 }, "carol", "third");
    const history = mgr.getHistory();
    assert.equal(history.length, 3);
    assert.equal(history[0].version, 1);
    assert.equal(history[2].version, 3);
  });

  it("getVersion returns specific version", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ x: 10 }, "alice", "first");
    mgr.apply({ x: 20 }, "bob", "second");
    const v1 = mgr.getVersion(1);
    assert.equal(v1?.version, 1);
    assert.deepEqual(v1?.config, { x: 10 });
  });

  it("getVersion returns null for unknown version", () => {
    const mgr = new ConfigurationManager();
    assert.equal(mgr.getVersion(99), null);
  });
});

describe("ConfigurationManager — diff", () => {
  it("detects added, removed, and changed keys", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ a: 1, b: "old", c: true }, "alice", "v1");
    mgr.apply({ a: 1, b: "new", d: 42 }, "bob", "v2");
    const diff = mgr.diff(1, 2);
    assert.deepEqual(diff.added, { d: 42 });
    assert.deepEqual(diff.removed, { c: true });
    assert.deepEqual(diff.changed, { b: { from: "old", to: "new" } });
    assert.deepEqual(diff.unchanged, ["a"]);
  });

  it("unchanged returns all keys when configs are identical", () => {
    const mgr = new ConfigurationManager();
    const config = { x: 1, y: 2 };
    mgr.apply(config, "alice", "v1");
    mgr.apply({ ...config }, "bob", "v2");
    const diff = mgr.diff(1, 2);
    assert.equal(Object.keys(diff.added).length, 0);
    assert.equal(Object.keys(diff.removed).length, 0);
    assert.equal(Object.keys(diff.changed).length, 0);
    assert.deepEqual(diff.unchanged.sort(), ["x", "y"]);
  });

  it("throws on unknown version", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ a: 1 }, "alice", "v1");
    assert.throws(() => mgr.diff(1, 99), /not found/);
  });
});

describe("ConfigurationManager — rollback", () => {
  it("rollback creates a new version with target config", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ x: 1 }, "alice", "v1");
    mgr.apply({ x: 2 }, "bob", "v2");
    const rolledBack = mgr.rollback(1, "carol");
    assert.equal(rolledBack.version, 3);
    assert.deepEqual(rolledBack.config, { x: 1 });
    assert.equal(rolledBack.rolledBackFromVersion, 1);
    assert.equal(mgr.versionCount, 3);
  });

  it("rollback uses custom rationale when provided", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ x: 1 }, "alice", "v1");
    mgr.apply({ x: 2 }, "bob", "v2");
    const rb = mgr.rollback(1, "carol", "Emergency revert");
    assert.equal(rb.rationale, "Emergency revert");
  });

  it("rollback uses default rationale when not provided", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ x: 1 }, "alice", "v1");
    mgr.apply({ x: 2 }, "bob", "v2");
    const rb = mgr.rollback(1, "carol");
    assert.ok(rb.rationale.includes("1"), "Default rationale should mention version 1");
  });

  it("throws on unknown target version", () => {
    const mgr = new ConfigurationManager();
    assert.throws(() => mgr.rollback(99, "carol"), /not found/);
  });
});

describe("ConfigurationManager — validation", () => {
  const schema: ConfigSchema = {
    fields: {
      maxAgents: { type: "number", required: true, minValue: 1, maxValue: 100 },
      logLevel: { type: "string", required: true, enum: ["info", "warn", "error"] },
      enabled: { type: "boolean" },
      tags: { type: "array" },
    },
  };

  it("validates a valid config", () => {
    const mgr = new ConfigurationManager(schema);
    const result = mgr.validate({ maxAgents: 10, logLevel: "info", enabled: true });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("reports missing required field", () => {
    const mgr = new ConfigurationManager(schema);
    const result = mgr.validate({ logLevel: "info" });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("maxAgents")));
  });

  it("reports wrong type", () => {
    const mgr = new ConfigurationManager(schema);
    const result = mgr.validate({ maxAgents: "ten" as unknown as number, logLevel: "info" });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("type")));
  });

  it("reports out-of-range number", () => {
    const mgr = new ConfigurationManager(schema);
    const result = mgr.validate({ maxAgents: 0, logLevel: "info" });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("maxAgents")));
  });

  it("reports invalid enum value", () => {
    const mgr = new ConfigurationManager(schema);
    const result = mgr.validate({ maxAgents: 5, logLevel: "debug" as "info" });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("logLevel")));
  });

  it("validates successfully without schema", () => {
    const mgr = new ConfigurationManager();
    const result = mgr.validate({ anything: "goes" });
    assert.equal(result.valid, true);
  });

  it("throws when applying invalid config with schema", () => {
    const mgr = new ConfigurationManager(schema);
    assert.throws(
      () => mgr.apply({ maxAgents: 0, logLevel: "info" }, "alice", "bad"),
      /validation failed/i,
    );
  });
});

describe("ConfigurationManager — export/import", () => {
  it("exports and re-imports preserving all versions", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ x: 1 }, "alice", "first");
    mgr.apply({ x: 2 }, "bob", "second");
    const exported = mgr.export();
    assert.equal(exported.versions.length, 2);
    assert.equal(exported.currentVersion, 2);

    const mgr2 = new ConfigurationManager();
    mgr2.import(exported);
    assert.equal(mgr2.versionCount, 2);
    assert.deepEqual(mgr2.getCurrentConfig(), { x: 2 });
  });

  it("throws on invalid export data", () => {
    const mgr = new ConfigurationManager();
    assert.throws(() => mgr.import(null as unknown as ReturnType<typeof mgr.export>));
  });

  it("new apply after import increments from max version", () => {
    const mgr = new ConfigurationManager();
    mgr.apply({ x: 1 }, "alice", "first");
    mgr.apply({ x: 2 }, "bob", "second");
    const exported = mgr.export();

    const mgr2 = new ConfigurationManager();
    mgr2.import(exported);
    const v3 = mgr2.apply({ x: 3 }, "carol", "third");
    assert.equal(v3.version, 3);
  });
});

// ---------------------------------------------------------------------------
// HTTP endpoint tests
// ---------------------------------------------------------------------------

describe("ConfigurationManager — HTTP endpoints", () => {
  let mgr: ConfigurationManager;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    mgr = new ConfigurationManager();
    server = http.createServer((req, res) => {
      const handled = mgr.route(req, res);
      if (!handled) {
        res.writeHead(404);
        res.end("Not Found");
      }
    });
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("GET /api/v1/config returns 404 when no config", async () => {
    const res = await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "GET");
    assert.equal(res.status, 404);
  });

  it("POST /api/v1/config applies config and returns 201", async () => {
    const res = await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { maxAgents: 5 },
      author: "alice",
      rationale: "Initial setup",
    });
    assert.equal(res.status, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.version, 1);
  });

  it("GET /api/v1/config returns current config after apply", async () => {
    await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { maxAgents: 5 },
      author: "alice",
      rationale: "Initial setup",
    });
    const res = await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "GET");
    const body = JSON.parse(res.body);
    assert.equal(body.data.version, 1);
    assert.deepEqual(body.data.config, { maxAgents: 5 });
  });

  it("GET /api/v1/config/history returns all versions", async () => {
    await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { a: 1 }, author: "alice", rationale: "v1",
    });
    await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { a: 2 }, author: "bob", rationale: "v2",
    });
    const res = await httpRequest(`http://127.0.0.1:${port}/api/v1/config/history`, "GET");
    const body = JSON.parse(res.body);
    assert.equal(body.data.length, 2);
  });

  it("GET /api/v1/config/versions/:n returns specific version", async () => {
    await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { x: 1 }, author: "alice", rationale: "v1",
    });
    const res = await httpRequest(`http://127.0.0.1:${port}/api/v1/config/versions/1`, "GET");
    const body = JSON.parse(res.body);
    assert.equal(body.data.version, 1);
  });

  it("POST /api/v1/config/diff returns diff between two versions", async () => {
    await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { x: 1, y: 2 }, author: "alice", rationale: "v1",
    });
    await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { x: 10, z: 3 }, author: "bob", rationale: "v2",
    });
    const res = await httpRequest(`http://127.0.0.1:${port}/api/v1/config/diff`, "POST", {
      versionA: 1,
      versionB: 2,
    });
    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.data.added.z !== undefined);
    assert.ok(body.data.removed.y !== undefined);
  });

  it("POST /api/v1/config/rollback reverts to target version", async () => {
    await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { x: 1 }, author: "alice", rationale: "v1",
    });
    await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { x: 2 }, author: "bob", rationale: "v2",
    });
    const res = await httpRequest(`http://127.0.0.1:${port}/api/v1/config/rollback`, "POST", {
      targetVersion: 1,
      author: "carol",
    });
    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.data.rolledBackFromVersion, 1);
    assert.deepEqual(body.data.config, { x: 1 });
  });

  it("POST /api/v1/config/validate returns validation result", async () => {
    const res = await httpRequest(`http://127.0.0.1:${port}/api/v1/config/validate`, "POST", {
      config: { anything: true },
    });
    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.data.valid, true);
  });

  it("GET /api/v1/config/export returns exported set", async () => {
    await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { x: 1 }, author: "alice", rationale: "v1",
    });
    const res = await httpRequest(`http://127.0.0.1:${port}/api/v1/config/export`, "GET");
    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.data.versions.length, 1);
    assert.equal(body.data.currentVersion, 1);
  });

  it("POST /api/v1/config/import imports config set", async () => {
    // First export from current manager
    await httpRequest(`http://127.0.0.1:${port}/api/v1/config`, "POST", {
      config: { x: 42 }, author: "alice", rationale: "v1",
    });
    const exportRes = await httpRequest(`http://127.0.0.1:${port}/api/v1/config/export`, "GET");
    const exported = JSON.parse(exportRes.body).data;

    // New manager instance
    const mgr2 = new ConfigurationManager();
    const server2 = http.createServer((req, res) => {
      const handled = mgr2.route(req, res);
      if (!handled) { res.writeHead(404); res.end(); }
    });
    await new Promise<void>((resolve) => { server2.listen(0, () => resolve()); });
    const port2 = (server2.address() as { port: number }).port;

    const importRes = await httpRequest(`http://127.0.0.1:${port2}/api/v1/config/import`, "POST", exported);
    assert.equal(importRes.status, 200);
    const body = JSON.parse(importRes.body);
    assert.equal(body.data.imported, 1);

    await new Promise<void>((resolve) => server2.close(() => resolve()));
  });
});
