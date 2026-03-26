import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { PipelineOrchestrator, type Pipeline } from "./pipeline";
import { HandoffProtocol } from "./handoff";

// Minimal contracts for handoff creation
const protocol = new HandoffProtocol([]);

describe("PipelineOrchestrator", () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator(new HandoffProtocol([]));
  });

  const twoSteps = [
    { agentId: "agent-a", taskType: "code", acceptanceCriteria: ["compiles"] },
    { agentId: "agent-b", taskType: "review", acceptanceCriteria: ["approved"] },
  ];

  const threeSteps = [
    { agentId: "agent-a", taskType: "design", acceptanceCriteria: ["spec ready"] },
    { agentId: "agent-b", taskType: "code", acceptanceCriteria: ["compiles"] },
    { agentId: "agent-c", taskType: "review", acceptanceCriteria: ["approved"] },
  ];

  describe("createPipeline", () => {
    it("creates a pipeline with pending steps", () => {
      const p = orchestrator.createPipeline("test-pipe", twoSteps);
      assert.ok(p.id.startsWith("pipeline_"));
      assert.equal(p.name, "test-pipe");
      assert.equal(p.steps.length, 2);
      assert.equal(p.status, "running");
      assert.equal(p.failurePolicy, "abort");
    });

    it("marks first step as running", () => {
      const p = orchestrator.createPipeline("test-pipe", twoSteps);
      assert.equal(p.steps[0].status, "running");
      assert.ok(p.steps[0].startedAt);
      assert.equal(p.steps[1].status, "pending");
    });

    it("uses custom failure policy", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps, "retry");
      assert.equal(p.failurePolicy, "retry");
    });

    it("handles empty steps gracefully", () => {
      const p = orchestrator.createPipeline("empty", []);
      assert.equal(p.steps.length, 0);
      assert.equal(p.status, "pending");
    });

    it("assigns unique step IDs", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps);
      assert.notEqual(p.steps[0].id, p.steps[1].id);
    });
  });

  describe("advanceStep", () => {
    it("completes current step and advances to next", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps);
      const next = orchestrator.advanceStep(p.id, { result: "ok" }, 500);
      assert.equal(next.agentId, "agent-b");
      assert.equal(next.status, "running");

      const updated = orchestrator.getPipeline(p.id)!;
      assert.equal(updated.steps[0].status, "completed");
      assert.equal(updated.steps[0].tokensBurned, 500);
    });

    it("marks pipeline completed when last step advances", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps);
      orchestrator.advanceStep(p.id, { r: 1 });
      orchestrator.advanceStep(p.id, { r: 2 });

      const updated = orchestrator.getPipeline(p.id)!;
      assert.equal(updated.status, "completed");
      assert.ok(updated.completedAt);
    });

    it("throws for unknown pipeline", () => {
      assert.throws(() => orchestrator.advanceStep("bad-id", {}), /not found/);
    });

    it("throws for non-running pipeline", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps);
      orchestrator.abortPipeline(p.id, "test");
      assert.throws(() => orchestrator.advanceStep(p.id, {}), /not running/);
    });
  });

  describe("failStep — abort policy", () => {
    it("aborts pipeline on failure", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps, "abort");
      const { pipeline, nextAction } = orchestrator.failStep(p.id, "crash");
      assert.equal(nextAction, "abort");
      assert.equal(pipeline.status, "failed");
      assert.equal(pipeline.steps[0].error, "crash");
    });
  });

  describe("failStep — skip policy", () => {
    it("skips failed step and advances to next", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps, "skip");
      const { pipeline, nextAction } = orchestrator.failStep(p.id, "flaky");
      assert.equal(nextAction, "skip");
      assert.equal(pipeline.steps[0].status, "skipped");
      assert.equal(pipeline.steps[1].status, "running");
    });

    it("completes pipeline when last step is skipped", () => {
      const p = orchestrator.createPipeline("pipe", [twoSteps[0]], "skip");
      const { pipeline } = orchestrator.failStep(p.id, "err");
      assert.equal(pipeline.status, "completed");
    });
  });

  describe("failStep — retry policy", () => {
    it("retries within max retries", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps, "retry");
      const { nextAction } = orchestrator.failStep(p.id, "transient");
      assert.equal(nextAction, "retry");

      const step = orchestrator.getCurrentStep(p.id);
      assert.equal(step?.status, "running"); // still running for retry
    });

    it("aborts after exhausting retries", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps, "retry");
      // maxRetries defaults to 3
      orchestrator.failStep(p.id, "err1");
      orchestrator.failStep(p.id, "err2");
      orchestrator.failStep(p.id, "err3");
      const { nextAction } = orchestrator.failStep(p.id, "err4");
      assert.equal(nextAction, "abort");
      assert.equal(orchestrator.getPipeline(p.id)!.status, "failed");
    });
  });

  describe("abortPipeline", () => {
    it("aborts running pipeline and marks steps", () => {
      const p = orchestrator.createPipeline("pipe", threeSteps);
      const aborted = orchestrator.abortPipeline(p.id, "cancelled");
      assert.equal(aborted.status, "aborted");
      assert.equal(aborted.steps[0].status, "failed");
      assert.equal(aborted.steps[0].error, "cancelled");
      assert.equal(aborted.steps[1].status, "skipped");
      assert.equal(aborted.steps[2].status, "skipped");
    });
  });

  describe("queries", () => {
    it("getAllPipelines returns all", () => {
      orchestrator.createPipeline("p1", twoSteps);
      orchestrator.createPipeline("p2", twoSteps);
      assert.equal(orchestrator.getAllPipelines().length, 2);
    });

    it("getActivePipelines returns only running", () => {
      const p1 = orchestrator.createPipeline("p1", twoSteps);
      orchestrator.createPipeline("p2", twoSteps);
      orchestrator.abortPipeline(p1.id, "done");
      assert.equal(orchestrator.getActivePipelines().length, 1);
    });

    it("getCurrentStep returns running step", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps);
      const step = orchestrator.getCurrentStep(p.id);
      assert.equal(step?.agentId, "agent-a");
    });

    it("getCurrentStep returns undefined for unknown pipeline", () => {
      assert.equal(orchestrator.getCurrentStep("nope"), undefined);
    });
  });

  describe("getTrace", () => {
    it("returns trace with total tokens and duration", () => {
      const p = orchestrator.createPipeline("pipe", twoSteps);
      orchestrator.advanceStep(p.id, { r: 1 }, 100);
      orchestrator.advanceStep(p.id, { r: 2 }, 200);

      const trace = orchestrator.getTrace(p.id);
      assert.equal(trace.totalTokens, 300);
      assert.ok(trace.duration >= 0);
      assert.equal(trace.steps.length, 2);
    });

    it("throws for unknown pipeline", () => {
      assert.throws(() => orchestrator.getTrace("bad"), /not found/);
    });
  });
});
