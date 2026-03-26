/**
 * Tests for McpTrustDecay (M-11).
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { McpTrustDecay } from "./trust-decay.js";

describe("McpTrustDecay", () => {
  it("registers a server with default trust", () => {
    const decay = new McpTrustDecay();
    const trust = decay.registerServer("srv-1");
    assert.equal(trust.serverId, "srv-1");
    assert.equal(trust.trustLevel, 100);
    assert.equal(trust.frozen, false);
  });

  it("registers a server with custom initial trust", () => {
    const decay = new McpTrustDecay();
    const trust = decay.registerServer("srv-1", 75);
    assert.equal(trust.trustLevel, 75);
  });

  it("verify resets trust to 100", () => {
    const decay = new McpTrustDecay();
    decay.registerServer("srv-1", 50);
    const trust = decay.verify("srv-1");
    assert.equal(trust.trustLevel, 100);
  });

  it("verify does not change trust when frozen", () => {
    const decay = new McpTrustDecay();
    decay.registerServer("srv-1", 50);
    decay.freezeTrust("srv-1", "audit required");
    const trust = decay.verify("srv-1");
    assert.equal(trust.trustLevel, 50);
  });

  it("freezes and unfreezes trust", () => {
    const decay = new McpTrustDecay();
    decay.registerServer("srv-1");
    const frozen = decay.freezeTrust("srv-1", "suspicious");
    assert.equal(frozen.frozen, true);
    assert.equal(frozen.frozenReason, "suspicious");

    const unfrozen = decay.unfreezeTrust("srv-1");
    assert.equal(unfrozen.frozen, false);
    assert.equal(unfrozen.frozenReason, undefined);
  });

  it("isTrusted checks against minimum threshold", () => {
    const decay = new McpTrustDecay();
    decay.registerServer("srv-1", 60);
    assert.equal(decay.isTrusted("srv-1", 50), true);
    assert.equal(decay.isTrusted("srv-1", 70), false);
    assert.equal(decay.isTrusted("unknown"), false);
  });

  it("applies decay for missed verification windows", () => {
    const decay = new McpTrustDecay();
    decay.registerServer("srv-1");
    // Manually set lastVerified to the past
    const trust = decay.getTrust("srv-1")!;
    // Access internal for testing: set lastVerified to 2 days ago
    const internalTrust = (decay as any).servers.get("srv-1");
    internalTrust.lastVerified = Date.now() - 2 * 86_400_000;
    internalTrust.verificationCadence = 86_400_000;
    internalTrust.decayRate = 5;

    const decayed = decay.applyDecay();
    assert.equal(decayed.length, 1);
    // 2 missed windows * 5 = 10 points decay from 100
    assert.equal(decayed[0].trustLevel, 90);
  });

  it("getAllTrust returns all registered servers", () => {
    const decay = new McpTrustDecay();
    decay.registerServer("srv-1");
    decay.registerServer("srv-2");
    assert.equal(decay.getAllTrust().length, 2);
  });
});
