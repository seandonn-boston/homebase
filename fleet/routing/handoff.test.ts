import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { HandoffValidator, HandoffProtocol, type HandoffContract, type HandoffPayload } from "./handoff";

const TEST_CONTRACTS: HandoffContract[] = [
  {
    fromRole: "implementer",
    toRole: "reviewer",
    requiredOutputs: ["code", "tests"],
    requiredContext: ["taskId", "acceptanceCriteria"],
  },
  {
    fromRole: "reviewer",
    toRole: "deployer",
    requiredOutputs: ["reviewResult", "approvedFiles"],
    requiredContext: ["taskId"],
  },
  {
    fromRole: "architect",
    toRole: "implementer",
    requiredOutputs: ["design"],
    requiredContext: ["taskId", "requirements"],
  },
];

describe("HandoffValidator", () => {
  let validator: HandoffValidator;

  beforeEach(() => {
    validator = new HandoffValidator(TEST_CONTRACTS);
  });

  describe("getContract", () => {
    it("returns matching contract", () => {
      const contract = validator.getContract("implementer", "reviewer");
      assert.ok(contract);
      assert.deepEqual(contract.requiredOutputs, ["code", "tests"]);
    });

    it("returns undefined for unknown pair", () => {
      const contract = validator.getContract("unknown", "reviewer");
      assert.equal(contract, undefined);
    });
  });

  describe("validate", () => {
    it("passes valid payload", () => {
      const payload: HandoffPayload = {
        id: "handoff-1",
        fromAgent: "implementer",
        toAgent: "reviewer",
        taskId: "task-1",
        context: { taskId: "task-1", acceptanceCriteria: ["works"] },
        outputs: { code: "console.log('hi')", tests: "assert(true)" },
        metadata: { startedAt: 1000, completedAt: 2000, tokensBurned: 500, quality: "pass" },
      };
      const result = validator.validate(payload);
      assert.equal(result.valid, true);
      assert.equal(result.violations.length, 0);
    });

    it("detects missing required outputs", () => {
      const payload: HandoffPayload = {
        id: "handoff-2",
        fromAgent: "implementer",
        toAgent: "reviewer",
        taskId: "task-1",
        context: { taskId: "task-1", acceptanceCriteria: ["works"] },
        outputs: { code: "console.log('hi')" }, // missing "tests"
        metadata: { startedAt: 1000, completedAt: 2000, tokensBurned: 500 },
      };
      const result = validator.validate(payload);
      assert.equal(result.valid, false);
      assert.ok(result.violations.some((v) => v.includes('Missing required output: "tests"')));
    });

    it("detects missing required context", () => {
      const payload: HandoffPayload = {
        id: "handoff-3",
        fromAgent: "implementer",
        toAgent: "reviewer",
        taskId: "task-1",
        context: { taskId: "task-1" }, // missing acceptanceCriteria
        outputs: { code: "x", tests: "y" },
        metadata: { startedAt: 1000, completedAt: 2000, tokensBurned: 100 },
      };
      const result = validator.validate(payload);
      assert.equal(result.valid, false);
      assert.ok(result.violations.some((v) => v.includes("acceptanceCriteria")));
    });

    it("detects invalid metadata (completedAt before startedAt)", () => {
      const payload: HandoffPayload = {
        id: "handoff-4",
        fromAgent: "implementer",
        toAgent: "reviewer",
        taskId: "task-1",
        context: { taskId: "task-1", acceptanceCriteria: ["ok"] },
        outputs: { code: "x", tests: "y" },
        metadata: { startedAt: 5000, completedAt: 1000, tokensBurned: 100 },
      };
      const result = validator.validate(payload);
      assert.equal(result.valid, false);
      assert.ok(result.violations.some((v) => v.includes("completedAt")));
    });

    it("detects negative tokensBurned", () => {
      const payload: HandoffPayload = {
        id: "handoff-5",
        fromAgent: "implementer",
        toAgent: "reviewer",
        taskId: "task-1",
        context: { taskId: "task-1", acceptanceCriteria: ["ok"] },
        outputs: { code: "x", tests: "y" },
        metadata: { startedAt: 1000, completedAt: 2000, tokensBurned: -10 },
      };
      const result = validator.validate(payload);
      assert.equal(result.valid, false);
      assert.ok(result.violations.some((v) => v.includes("tokensBurned")));
    });

    it("reports violation for unknown contract", () => {
      const payload: HandoffPayload = {
        id: "handoff-6",
        fromAgent: "unknown-agent",
        toAgent: "reviewer",
        taskId: "task-1",
        context: {},
        outputs: {},
        metadata: { startedAt: 1000, completedAt: 2000, tokensBurned: 0 },
      };
      const result = validator.validate(payload);
      assert.equal(result.valid, false);
      assert.ok(result.violations.some((v) => v.includes("No contract")));
    });

    it("reports multiple violations at once", () => {
      const payload: HandoffPayload = {
        id: "handoff-7",
        fromAgent: "implementer",
        toAgent: "reviewer",
        taskId: "task-1",
        context: {}, // missing both context keys
        outputs: {}, // missing both output keys
        metadata: { startedAt: 5000, completedAt: 1000, tokensBurned: -1 },
      };
      const result = validator.validate(payload);
      assert.equal(result.valid, false);
      // 2 missing outputs + 2 missing context + bad timestamps + bad tokens = 6
      assert.ok(result.violations.length >= 5);
    });
  });
});

describe("HandoffProtocol", () => {
  let protocol: HandoffProtocol;

  beforeEach(() => {
    protocol = new HandoffProtocol(TEST_CONTRACTS);
  });

  describe("createHandoff", () => {
    it("creates a payload with unique id", () => {
      const h1 = protocol.createHandoff("implementer", "reviewer", "task-1", { taskId: "task-1" }, { code: "x" });
      const h2 = protocol.createHandoff("implementer", "reviewer", "task-1", { taskId: "task-1" }, { code: "y" });
      assert.ok(h1.id.startsWith("handoff_"));
      assert.notEqual(h1.id, h2.id);
    });

    it("sets metadata timestamps", () => {
      const before = Date.now();
      const h = protocol.createHandoff("a", "b", "t1", {}, {});
      assert.ok(h.metadata.startedAt >= before);
      assert.ok(h.metadata.completedAt >= before);
    });
  });

  describe("validateAndRecord", () => {
    it("records valid handoff in history", () => {
      const payload = protocol.createHandoff(
        "implementer", "reviewer", "task-1",
        { taskId: "task-1", acceptanceCriteria: ["ok"] },
        { code: "x", tests: "y" },
      );
      const result = protocol.validateAndRecord(payload);
      assert.equal(result.valid, true);
      assert.equal(protocol.getHistory().length, 1);
    });

    it("records invalid handoff in history and increments failure count", () => {
      const payload = protocol.createHandoff(
        "implementer", "reviewer", "task-1",
        {}, // missing context
        {}, // missing outputs
      );
      const result = protocol.validateAndRecord(payload);
      assert.equal(result.valid, false);
      assert.equal(protocol.getHistory().length, 1);
      assert.equal(protocol.getFailureCount("implementer"), 1);
    });
  });

  describe("getHistory", () => {
    it("filters by taskId when provided", () => {
      const h1 = protocol.createHandoff("implementer", "reviewer", "task-1", { taskId: "task-1", acceptanceCriteria: ["ok"] }, { code: "x", tests: "y" });
      const h2 = protocol.createHandoff("reviewer", "deployer", "task-2", { taskId: "task-2" }, { reviewResult: "pass", approvedFiles: [] });
      protocol.validateAndRecord(h1);
      protocol.validateAndRecord(h2);

      assert.equal(protocol.getHistory("task-1").length, 1);
      assert.equal(protocol.getHistory("task-2").length, 1);
      assert.equal(protocol.getHistory().length, 2);
    });

    it("returns empty array for unknown taskId", () => {
      assert.equal(protocol.getHistory("nonexistent").length, 0);
    });
  });

  describe("getFailureCount", () => {
    it("returns 0 for agent with no failures", () => {
      assert.equal(protocol.getFailureCount("clean-agent"), 0);
    });

    it("accumulates failures across handoffs", () => {
      for (let i = 0; i < 3; i++) {
        const payload = protocol.createHandoff("bad-agent", "reviewer", `task-${i}`, {}, {});
        protocol.validateAndRecord(payload);
      }
      assert.equal(protocol.getFailureCount("bad-agent"), 3);
    });
  });

  describe("needsDecompositionReview", () => {
    it("returns false under 3 failures", () => {
      const payload = protocol.createHandoff("agent-x", "reviewer", "t1", {}, {});
      protocol.validateAndRecord(payload);
      assert.equal(protocol.needsDecompositionReview("agent-x"), false);
    });

    it("returns true at 3+ failures", () => {
      for (let i = 0; i < 3; i++) {
        const payload = protocol.createHandoff("agent-x", "reviewer", `t-${i}`, {}, {});
        protocol.validateAndRecord(payload);
      }
      assert.equal(protocol.needsDecompositionReview("agent-x"), true);
    });
  });
});
