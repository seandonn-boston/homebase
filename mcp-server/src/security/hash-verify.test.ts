/**
 * Tests for BinaryHashVerifier (M-13).
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { BinaryHashVerifier } from "./hash-verify.js";

describe("BinaryHashVerifier", () => {
  it("registers and verifies a matching hash", () => {
    const verifier = new BinaryHashVerifier();
    verifier.registerHash("srv-1", "abc123");
    const result = verifier.verify("srv-1", "abc123");
    assert.equal(result.valid, true);
  });

  it("rejects a mismatched hash", () => {
    const verifier = new BinaryHashVerifier();
    verifier.registerHash("srv-1", "abc123");
    const result = verifier.verify("srv-1", "xyz789");
    assert.equal(result.valid, false);
    assert.ok(result.reason?.includes("mismatch"));
  });

  it("rejects verification for unregistered server", () => {
    const verifier = new BinaryHashVerifier();
    const result = verifier.verify("unknown", "abc123");
    assert.equal(result.valid, false);
    assert.ok(result.reason?.includes("not registered"));
  });

  it("revokes a server", () => {
    const verifier = new BinaryHashVerifier();
    verifier.registerHash("srv-1", "abc123");
    verifier.revokeServer("srv-1");
    const result = verifier.verify("srv-1", "abc123");
    assert.equal(result.valid, false);
  });

  it("lists registered servers", () => {
    const verifier = new BinaryHashVerifier();
    verifier.registerHash("srv-1", "aaa");
    verifier.registerHash("srv-2", "bbb");
    const servers = verifier.getRegisteredServers();
    assert.equal(servers.length, 2);
    assert.ok(servers.some((s) => s.serverId === "srv-1"));
  });

  it("overwrites hash on re-register", () => {
    const verifier = new BinaryHashVerifier();
    verifier.registerHash("srv-1", "old-hash");
    verifier.registerHash("srv-1", "new-hash");
    assert.equal(verifier.verify("srv-1", "new-hash").valid, true);
    assert.equal(verifier.verify("srv-1", "old-hash").valid, false);
  });
});
