import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GovernanceEvent, GovernanceEventBus, InterventionLevel } from "./framework";
import { InterventionProtocol } from "./intervention";

describe("InterventionProtocol", () => {
  let bus: GovernanceEventBus;
  let protocol: InterventionProtocol;

  beforeEach(() => {
    bus = new GovernanceEventBus(500);
    protocol = new InterventionProtocol(bus);
  });

  // -----------------------------------------------------------------------
  // Four intervention levels
  // -----------------------------------------------------------------------

  describe("intervention levels", () => {
    it("creates a warn intervention", () => {
      const inv = protocol.warn("agent-a", "minor issue", "sentinel");
      assert.equal(inv.level, InterventionLevel.Warn);
      assert.equal(inv.targetAgent, "agent-a");
      assert.equal(inv.requestedBy, "sentinel");
      assert.equal(inv.status, "active");
      assert.ok(inv.id.startsWith("inv_"));
    });

    it("creates a restrict intervention", () => {
      const inv = protocol.restrict("agent-a", "scope violation", "sentinel");
      assert.equal(inv.level, InterventionLevel.Restrict);
    });

    it("creates a suspend intervention", () => {
      const inv = protocol.suspend("agent-a", "repeated failures", "admiral");
      assert.equal(inv.level, InterventionLevel.Suspend);
    });

    it("creates a terminate intervention", () => {
      const inv = protocol.terminate("agent-a", "critical breach", "admiral");
      assert.equal(inv.level, InterventionLevel.Terminate);
    });
  });

  // -----------------------------------------------------------------------
  // Reversal
  // -----------------------------------------------------------------------

  describe("reverse", () => {
    it("reverses an active intervention", () => {
      const inv = protocol.restrict("agent-a", "test", "sentinel");
      const reversed = protocol.reverse(inv.id, "admiral", "false alarm");
      assert.equal(reversed.status, "reversed");
    });

    it("throws for unknown intervention", () => {
      assert.throws(
        () => protocol.reverse("nonexistent", "admin", "reason"),
        /not found/,
      );
    });

    it("throws if already reversed", () => {
      const inv = protocol.warn("agent-a", "test", "sentinel");
      protocol.reverse(inv.id, "admin", "oops");
      assert.throws(
        () => protocol.reverse(inv.id, "admin", "again"),
        /already reversed/,
      );
    });

    it("emits reversal event on bus", () => {
      const received: GovernanceEvent[] = [];
      bus.subscribe({ types: ["intervention"] }, (e) => received.push(e));

      const inv = protocol.restrict("agent-a", "test", "sentinel");
      const createEvents = received.length;
      protocol.reverse(inv.id, "admiral", "resolved");

      assert.ok(received.length > createEvents);
      const lastEvent = received[received.length - 1];
      assert.equal((lastEvent.data as any).action, "reversed");
    });
  });

  // -----------------------------------------------------------------------
  // Query: getActive
  // -----------------------------------------------------------------------

  describe("getActive", () => {
    it("returns active interventions", () => {
      protocol.warn("agent-a", "test1", "sentinel");
      protocol.restrict("agent-b", "test2", "sentinel");

      assert.equal(protocol.getActive().length, 2);
      assert.equal(protocol.getActive("agent-a").length, 1);
      assert.equal(protocol.getActive("agent-c").length, 0);
    });

    it("excludes reversed interventions", () => {
      const inv = protocol.warn("agent-a", "test", "sentinel");
      protocol.reverse(inv.id, "admin", "done");

      assert.equal(protocol.getActive("agent-a").length, 0);
    });
  });

  // -----------------------------------------------------------------------
  // Query: isRestricted / isSuspended
  // -----------------------------------------------------------------------

  describe("isRestricted / isSuspended", () => {
    it("isRestricted returns true for restricted agents", () => {
      protocol.restrict("agent-a", "scope issue", "sentinel");
      assert.equal(protocol.isRestricted("agent-a"), true);
      assert.equal(protocol.isRestricted("agent-b"), false);
    });

    it("isSuspended returns true for suspended agents", () => {
      protocol.suspend("agent-a", "failures", "admiral");
      assert.equal(protocol.isSuspended("agent-a"), true);
      assert.equal(protocol.isSuspended("agent-b"), false);
    });

    it("warn does not count as restricted", () => {
      protocol.warn("agent-a", "minor", "sentinel");
      assert.equal(protocol.isRestricted("agent-a"), false);
    });

    it("terminate counts as suspended", () => {
      protocol.terminate("agent-a", "critical", "admiral");
      assert.equal(protocol.isSuspended("agent-a"), true);
    });
  });

  // -----------------------------------------------------------------------
  // Cooldown
  // -----------------------------------------------------------------------

  describe("cooldown", () => {
    it("sets cooldown on intervention", () => {
      const inv = protocol.warn("agent-a", "test", "sentinel");
      protocol.setCooldown(inv.id, 60_000);
      assert.equal(protocol.isInCooldown("agent-a"), true);
    });

    it("cooldown expires after duration", () => {
      const inv = protocol.warn("agent-a", "test", "sentinel");
      // Set cooldown that already expired (negative duration trick)
      protocol.setCooldown(inv.id, -1);
      assert.equal(protocol.isInCooldown("agent-a"), false);
    });

    it("throws for unknown intervention", () => {
      assert.throws(
        () => protocol.setCooldown("nonexistent", 1000),
        /not found/,
      );
    });

    it("no cooldown by default", () => {
      protocol.warn("agent-a", "test", "sentinel");
      assert.equal(protocol.isInCooldown("agent-a"), false);
    });
  });

  // -----------------------------------------------------------------------
  // Audit trail
  // -----------------------------------------------------------------------

  describe("audit trail", () => {
    it("records creation in audit trail", () => {
      const inv = protocol.warn("agent-a", "test", "sentinel");
      assert.equal(inv.auditTrail.length, 1);
      assert.equal(inv.auditTrail[0].action, "created");
      assert.equal(inv.auditTrail[0].actor, "sentinel");
    });

    it("records reversal in audit trail", () => {
      const inv = protocol.restrict("agent-a", "test", "sentinel");
      const reversed = protocol.reverse(inv.id, "admiral", "false positive");

      assert.equal(reversed.auditTrail.length, 2);
      assert.equal(reversed.auditTrail[1].action, "reversed");
      assert.equal(reversed.auditTrail[1].actor, "admiral");
    });

    it("records cooldown in audit trail", () => {
      const inv = protocol.warn("agent-a", "test", "sentinel");
      protocol.setCooldown(inv.id, 5000);

      const history = protocol.getHistory("agent-a");
      assert.equal(history[0].auditTrail.length, 2);
      assert.equal(history[0].auditTrail[1].action, "cooldown_set");
    });
  });

  // -----------------------------------------------------------------------
  // History
  // -----------------------------------------------------------------------

  describe("getHistory", () => {
    it("returns all interventions including reversed", () => {
      const inv = protocol.warn("agent-a", "t1", "s");
      protocol.restrict("agent-a", "t2", "s");
      protocol.reverse(inv.id, "admin", "done");

      const history = protocol.getHistory("agent-a");
      assert.equal(history.length, 2);
    });

    it("filters by agentId", () => {
      protocol.warn("agent-a", "t1", "s");
      protocol.warn("agent-b", "t2", "s");

      assert.equal(protocol.getHistory("agent-a").length, 1);
      assert.equal(protocol.getHistory().length, 2);
    });
  });
});
