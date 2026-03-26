import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GovernanceEvent, GovernanceEventBus } from "./framework";
import { ArbiterAgent } from "./arbiter";

describe("ArbiterAgent", () => {
  let bus: GovernanceEventBus;
  let arbiter: ArbiterAgent;
  const now = Date.now();

  beforeEach(() => {
    bus = new GovernanceEventBus(500);
    arbiter = new ArbiterAgent(bus);
  });

  // -----------------------------------------------------------------------
  // Conflict detection
  // -----------------------------------------------------------------------

  describe("detectConflicts", () => {
    it("detects contradictory outputs for same task", () => {
      const events: GovernanceEvent[] = [
        { id: "e1", timestamp: now, type: "compliance_finding", sourceAgent: "agent-a", severity: "low", data: { taskId: "t1", output: "yes" } },
        { id: "e2", timestamp: now, type: "compliance_finding", sourceAgent: "agent-b", severity: "low", data: { taskId: "t1", output: "no" } },
      ];

      const conflicts = arbiter.detectConflicts(events);
      assert.equal(conflicts.length, 1);
      assert.equal(conflicts[0].type, "contradictory_output");
      assert.ok(conflicts[0].agents.includes("agent-a"));
      assert.ok(conflicts[0].agents.includes("agent-b"));
    });

    it("no conflict when same task has same output", () => {
      const events: GovernanceEvent[] = [
        { id: "e1", timestamp: now, type: "compliance_finding", sourceAgent: "agent-a", severity: "low", data: { taskId: "t1", output: "yes" } },
        { id: "e2", timestamp: now, type: "compliance_finding", sourceAgent: "agent-b", severity: "low", data: { taskId: "t1", output: "yes" } },
      ];

      const conflicts = arbiter.detectConflicts(events);
      const contradictions = conflicts.filter((c) => c.type === "contradictory_output");
      assert.equal(contradictions.length, 0);
    });

    it("detects scope overlap on same file", () => {
      const events: GovernanceEvent[] = [
        { id: "e1", timestamp: now, type: "scope_drift", sourceAgent: "agent-a", severity: "low", data: { filePath: "src/shared.ts" } },
        { id: "e2", timestamp: now, type: "scope_drift", sourceAgent: "agent-b", severity: "low", data: { filePath: "src/shared.ts" } },
      ];

      const conflicts = arbiter.detectConflicts(events);
      const overlaps = conflicts.filter((c) => c.type === "scope_overlap");
      assert.equal(overlaps.length, 1);
      assert.ok(overlaps[0].agents.includes("agent-a"));
    });

    it("no scope overlap when different files", () => {
      const events: GovernanceEvent[] = [
        { id: "e1", timestamp: now, type: "scope_drift", sourceAgent: "agent-a", severity: "low", data: { filePath: "src/a.ts" } },
        { id: "e2", timestamp: now, type: "scope_drift", sourceAgent: "agent-b", severity: "low", data: { filePath: "src/b.ts" } },
      ];

      const conflicts = arbiter.detectConflicts(events);
      const overlaps = conflicts.filter((c) => c.type === "scope_overlap");
      assert.equal(overlaps.length, 0);
    });

    it("detects authority ambiguity from multiple intervention sources", () => {
      const events: GovernanceEvent[] = [
        { id: "e1", timestamp: now, type: "intervention", sourceAgent: "sentinel", targetAgent: "agent-x", severity: "high", data: {} },
        { id: "e2", timestamp: now, type: "intervention", sourceAgent: "compliance", targetAgent: "agent-x", severity: "high", data: {} },
      ];

      const conflicts = arbiter.detectConflicts(events);
      const ambiguities = conflicts.filter((c) => c.type === "authority_ambiguity");
      assert.equal(ambiguities.length, 1);
      assert.ok(ambiguities[0].agents.includes("sentinel"));
      assert.ok(ambiguities[0].agents.includes("compliance"));
    });
  });

  // -----------------------------------------------------------------------
  // Resolution by precedence
  // -----------------------------------------------------------------------

  describe("resolveByPrecedence", () => {
    it("higher tier agent wins", () => {
      const conflict = {
        id: "c1",
        type: "contradictory_output" as const,
        agents: ["agent-low", "agent-high"],
        description: "test",
        evidence: {},
        timestamp: now,
      };

      const resolution = arbiter.resolveByPrecedence(conflict, {
        "agent-low": 1,
        "agent-high": 5,
      });

      assert.equal(resolution.strategy, "precedence");
      assert.equal(resolution.winner, "agent-high");
      assert.equal(resolution.conflictId, "c1");
    });

    it("stores resolution in history", () => {
      const conflict = {
        id: "c2",
        type: "scope_overlap" as const,
        agents: ["a", "b"],
        description: "test",
        evidence: {},
        timestamp: now,
      };

      arbiter.resolveByPrecedence(conflict, { a: 3, b: 1 });
      const history = arbiter.getResolutions();
      assert.equal(history.length, 1);
      assert.equal(history[0].conflictId, "c2");
    });
  });

  // -----------------------------------------------------------------------
  // Resolution by evidence
  // -----------------------------------------------------------------------

  describe("resolveByEvidence", () => {
    it("uses provided evidence for resolution", () => {
      const conflict = {
        id: "c3",
        type: "contradictory_output" as const,
        agents: ["agent-a", "agent-b"],
        description: "test",
        evidence: {},
        timestamp: now,
      };

      const resolution = arbiter.resolveByEvidence(conflict, {
        preferredAgent: "agent-b",
        rationale: "agent-b has fresher data",
      });

      assert.equal(resolution.strategy, "evidence");
      assert.equal(resolution.winner, "agent-b");
      assert.equal(resolution.rationale, "agent-b has fresher data");
    });
  });

  // -----------------------------------------------------------------------
  // Escalation to admiral
  // -----------------------------------------------------------------------

  describe("escalateToAdmiral", () => {
    it("creates escalation resolution", () => {
      const conflict = {
        id: "c4",
        type: "authority_ambiguity" as const,
        agents: ["a", "b"],
        description: "test",
        evidence: {},
        timestamp: now,
      };

      const resolution = arbiter.escalateToAdmiral(conflict);
      assert.equal(resolution.strategy, "escalation");
      assert.equal(resolution.resolvedBy, "admiral");
      assert.ok(resolution.rationale.includes("escalated"));
    });

    it("emits conflict event on bus", () => {
      const received: GovernanceEvent[] = [];
      bus.subscribe({ types: ["conflict"] }, (e) => received.push(e));

      const conflict = {
        id: "c5",
        type: "scope_overlap" as const,
        agents: ["a", "b"],
        description: "test",
        evidence: {},
        timestamp: now,
      };

      arbiter.escalateToAdmiral(conflict);
      assert.equal(received.length, 1);
      assert.equal(received[0].severity, "critical");
    });
  });

  // -----------------------------------------------------------------------
  // analyze
  // -----------------------------------------------------------------------

  describe("analyze", () => {
    it("returns findings for detected conflicts", () => {
      const events: GovernanceEvent[] = [
        { id: "e1", timestamp: now, type: "compliance_finding", sourceAgent: "agent-a", severity: "low", data: { taskId: "t1", output: "yes" } },
        { id: "e2", timestamp: now, type: "compliance_finding", sourceAgent: "agent-b", severity: "low", data: { taskId: "t1", output: "no" } },
      ];

      const findings = arbiter.analyze(events);
      assert.ok(findings.length >= 1);
      assert.equal(findings[0].type, "conflict");
    });
  });

  // -----------------------------------------------------------------------
  // Resolution history
  // -----------------------------------------------------------------------

  describe("getResolutions", () => {
    it("returns all resolutions in order", () => {
      const c1 = { id: "c1", type: "scope_overlap" as const, agents: ["a", "b"], description: "", evidence: {}, timestamp: now };
      const c2 = { id: "c2", type: "scope_overlap" as const, agents: ["c", "d"], description: "", evidence: {}, timestamp: now };

      arbiter.resolveByPrecedence(c1, { a: 1, b: 2 });
      arbiter.escalateToAdmiral(c2);

      const resolutions = arbiter.getResolutions();
      assert.equal(resolutions.length, 2);
      assert.equal(resolutions[0].conflictId, "c1");
      assert.equal(resolutions[1].conflictId, "c2");
    });
  });
});
