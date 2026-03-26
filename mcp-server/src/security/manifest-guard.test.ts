/**
 * Tests for ManifestGuard (M-12).
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { ManifestGuard } from "./manifest-guard.js";

const TOOLS_A = [
  { name: "read", description: "Read a file", inputSchema: { type: "object" } },
  { name: "write", description: "Write a file", inputSchema: { type: "object" } },
];

const TOOLS_B = [
  { name: "read", description: "Read a file", inputSchema: { type: "object" } },
  { name: "write", description: "Write a file MODIFIED", inputSchema: { type: "object" } },
  { name: "exec", description: "Execute command", inputSchema: { type: "object" } },
];

describe("ManifestGuard", () => {
  it("takes a snapshot of tool manifests", () => {
    const guard = new ManifestGuard();
    const snap = guard.takeSnapshot("srv-1", TOOLS_A);
    assert.equal(snap.serverId, "srv-1");
    assert.equal(snap.tools.length, 2);
    assert.equal(snap.verified, true);
  });

  it("getSnapshot returns undefined for unknown server", () => {
    const guard = new ManifestGuard();
    assert.equal(guard.getSnapshot("unknown"), undefined);
  });

  it("compare with no prior snapshot treats everything as added", () => {
    const guard = new ManifestGuard();
    const diff = guard.compare("srv-1", TOOLS_A);
    assert.equal(diff.added.length, 2);
    assert.equal(diff.isClean, false);
  });

  it("compare detects no changes when tools are identical", () => {
    const guard = new ManifestGuard();
    guard.takeSnapshot("srv-1", TOOLS_A);
    const diff = guard.compare("srv-1", TOOLS_A);
    assert.equal(diff.isClean, true);
    assert.equal(diff.unchanged.length, 2);
    assert.equal(diff.added.length, 0);
    assert.equal(diff.removed.length, 0);
    assert.equal(diff.changed.length, 0);
  });

  it("compare detects added tools", () => {
    const guard = new ManifestGuard();
    guard.takeSnapshot("srv-1", TOOLS_A);
    const diff = guard.compare("srv-1", TOOLS_B);
    assert.ok(diff.added.includes("exec"));
    assert.equal(diff.isClean, false);
  });

  it("compare detects changed tools (description/schema modified)", () => {
    const guard = new ManifestGuard();
    guard.takeSnapshot("srv-1", TOOLS_A);
    const diff = guard.compare("srv-1", TOOLS_B);
    assert.ok(diff.changed.includes("write"));
  });

  it("compare detects removed tools", () => {
    const guard = new ManifestGuard();
    guard.takeSnapshot("srv-1", TOOLS_B);
    const diff = guard.compare("srv-1", TOOLS_A);
    assert.ok(diff.removed.includes("exec"));
    assert.equal(diff.isClean, false);
  });

  it("retrieves a previously taken snapshot", () => {
    const guard = new ManifestGuard();
    guard.takeSnapshot("srv-1", TOOLS_A);
    const snap = guard.getSnapshot("srv-1");
    assert.ok(snap !== undefined);
    assert.equal(snap.tools.length, 2);
  });
});
