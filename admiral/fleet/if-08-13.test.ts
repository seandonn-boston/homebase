/**
 * Tests for IF-08 (Replay), IF-11 (Collaboration), IF-13 (Predictions)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SessionRecorder } from "./agent-replay";
import { pipeline, broadcast, consensus, delegation } from "./collaboration-patterns";
import {
  predictContextExhaustion,
  predictBudgetExhaustion,
  predictQualityDegradation,
  predictRetryLoopRisk,
  predictToolFailureCascade,
  predictOrchestratorOverload,
  runAllPredictions,
  type PredictionInput,
  type PredictionType,
} from "./prediction-models";

// ---------------------------------------------------------------------------
// IF-08: Session Replay
// ---------------------------------------------------------------------------

describe("IF-08: Session Replay", () => {
  it("records and replays sessions", () => {
    const recorder = new SessionRecorder();
    const sid = recorder.startSession("agent-1");
    recorder.recordEvent(sid, "tool", "agent-1", { tool: "Read" }, 50);
    recorder.recordEvent(sid, "hook", "agent-1", { hook: "pre_tool" }, 10);
    recorder.endSession(sid);

    const recording = recorder.getRecording(sid);
    assert.ok(recording);
    assert.equal(recording!.events.length, 2);
    assert.ok(recording!.endedAt);
  });

  it("compares two sessions", () => {
    const recorder = new SessionRecorder();
    const s1 = recorder.startSession("a1");
    recorder.recordEvent(s1, "tool", "a1", {}, 100);
    recorder.recordEvent(s1, "hook", "a1", {}, 20);
    recorder.endSession(s1);

    const s2 = recorder.startSession("a1");
    recorder.recordEvent(s2, "tool", "a1", {}, 80);
    recorder.recordEvent(s2, "brain-query", "a1", {}, 30);
    recorder.endSession(s2);

    const comparison = recorder.compare(s1, s2);
    assert.ok(comparison);
    assert.equal(comparison!.eventCountDiff, 0);
    assert.equal(comparison!.divergencePoints.length, 1);
  });

  it("anonymizes sessions", () => {
    const recorder = new SessionRecorder();
    const sid = recorder.startSession("secret-agent", { secret: "data" });
    recorder.recordEvent(sid, "tool", "secret-agent", { file: "/etc/passwd" }, 50);
    recorder.anonymize(sid);

    const recording = recorder.getRecording(sid);
    assert.equal(recording!.agentId, "anonymized");
    assert.deepEqual(recording!.metadata, {});
  });
});

// ---------------------------------------------------------------------------
// IF-11: Collaboration Patterns
// ---------------------------------------------------------------------------

const mockExecutor = async (agentId: string, input: unknown) => `${agentId}:${input}`;
const failingExecutor = async () => { throw new Error("fail"); };

describe("IF-11: Collaboration Patterns", () => {
  it("pipeline passes output sequentially", async () => {
    const result = await pipeline(["a1", "a2", "a3"], "start", mockExecutor);
    assert.equal(result.success, true);
    assert.equal(result.pattern, "pipeline");
    assert.equal(result.output, "a3:a2:a1:start");
  });

  it("pipeline stops on failure", async () => {
    const result = await pipeline(["a1", "fail"], "start", async (id, input) => {
      if (id === "fail") throw new Error("boom");
      return `${id}:${input}`;
    });
    assert.equal(result.success, false);
  });

  it("broadcast sends to all in parallel", async () => {
    const result = await broadcast(["a1", "a2", "a3"], "input", mockExecutor);
    assert.equal(result.success, true);
    assert.equal(result.pattern, "broadcast");
    const outputs = result.output as string[];
    assert.equal(outputs.length, 3);
  });

  it("consensus achieves quorum", async () => {
    const sameAnswer = async (_: string, input: unknown) => "agreed";
    const result = await consensus(["a1", "a2", "a3"], "q", sameAnswer);
    assert.equal(result.success, true);
    assert.equal(result.output, "agreed");
  });

  it("delegation assigns specific tasks", async () => {
    const result = await delegation([
      { agentId: "a1", input: "task1" },
      { agentId: "a2", input: "task2" },
    ], mockExecutor);
    assert.equal(result.success, true);
    assert.equal(result.tasks.length, 2);
  });
});

// ---------------------------------------------------------------------------
// IF-13: Prediction Models
// ---------------------------------------------------------------------------

function makeInput(values: number[], limit = 100, warning = 80): PredictionInput {
  return {
    dataPoints: values,
    timestamps: values.map((_, i) => new Date(Date.now() - (values.length - i) * 60000).toISOString()),
    limit,
    warningThreshold: warning,
  };
}

describe("IF-13: Prediction Models", () => {
  it("predicts context exhaustion", () => {
    const pred = predictContextExhaustion(makeInput([50, 60, 70, 80, 90]));
    assert.ok(["high", "critical"].includes(pred.riskLevel));
    assert.equal(pred.type, "context-exhaustion");
  });

  it("predicts budget exhaustion", () => {
    const pred = predictBudgetExhaustion(makeInput([10, 30, 50, 70, 90]));
    assert.ok(["high", "critical"].includes(pred.riskLevel));
  });

  it("detects quality degradation", () => {
    const pred = predictQualityDegradation(makeInput([90, 85, 78, 70, 60], 100, 50));
    assert.ok(["high", "critical"].includes(pred.riskLevel));
  });

  it("detects retry loop risk", () => {
    const pred = predictRetryLoopRisk(makeInput([0, 1, 2, 4, 5], 10, 3));
    assert.ok(["medium", "high", "critical"].includes(pred.riskLevel));
  });

  it("detects tool failure cascade", () => {
    const pred = predictToolFailureCascade(makeInput([100, 300, 600, 1000, 1500], 5000));
    assert.ok(["medium", "high", "critical"].includes(pred.riskLevel));
  });

  it("detects orchestrator overload", () => {
    const pred = predictOrchestratorOverload(makeInput([30, 50, 70, 85, 95]));
    assert.ok(["high", "critical"].includes(pred.riskLevel));
  });

  it("runs all 6 predictions", () => {
    const inputs: Record<PredictionType, PredictionInput> = {
      "context-exhaustion": makeInput([50, 60, 70]),
      "budget-exhaustion": makeInput([20, 40, 60]),
      "quality-degradation": makeInput([90, 85, 80]),
      "retry-loop-risk": makeInput([0, 1, 2]),
      "tool-failure-cascade": makeInput([100, 150, 200]),
      "orchestrator-overload": makeInput([30, 40, 50]),
    };
    const predictions = runAllPredictions(inputs);
    assert.equal(predictions.length, 6);
    const types = predictions.map((p) => p.type);
    assert.ok(types.includes("context-exhaustion"));
    assert.ok(types.includes("orchestrator-overload"));
  });

  it("low risk for stable metrics", () => {
    const pred = predictContextExhaustion(makeInput([20, 20, 20, 20, 20]));
    assert.equal(pred.riskLevel, "low");
  });
});
