/**
 * Admiral AgentInstrumentation — Additional Edge Case Tests (T-03)
 *
 * Supplements existing tests in events-trace-ingest.test.ts with
 * edge cases: empty/missing data, null-like values, multiple
 * instances, token accumulation boundaries.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { AgentInstrumentation } from "./instrumentation";

describe("AgentInstrumentation — edge cases", () => {
  let stream: EventStream;
  let inst: AgentInstrumentation;

  beforeEach(() => {
    stream = new EventStream();
    inst = new AgentInstrumentation(stream, {
      agentId: "edge-agent",
      agentName: "EdgeAgent",
    });
  });

  it("started with no data defaults to empty object", () => {
    const event = inst.started();
    assert.equal(event.type, "agent_started");
    assert.equal(event.agentId, "edge-agent");
  });

  it("stopped with no data defaults to empty object", () => {
    const event = inst.stopped();
    assert.equal(event.type, "agent_stopped");
  });

  it("taskAssigned with extra data merges correctly", () => {
    const event = inst.taskAssigned("t1", "Build feature", { priority: "high", tags: ["core"] });
    assert.equal(event.data.description, "Build feature");
    assert.equal(event.data.priority, "high");
    assert.deepEqual(event.data.tags, ["core"]);
  });

  it("taskCompleted with no extra data", () => {
    const event = inst.taskCompleted("t1");
    assert.equal(event.type, "task_completed");
    assert.equal(event.data.taskId, "t1");
  });

  it("taskFailed with extra data merges correctly", () => {
    const event = inst.taskFailed("t1", "timeout", { retries: 3 });
    assert.equal(event.data.error, "timeout");
    assert.equal(event.data.retries, 3);
  });

  it("toolCalled with no taskId uses defaultTaskId if set", () => {
    const instWithDefault = new AgentInstrumentation(stream, {
      agentId: "a1",
      agentName: "A",
      defaultTaskId: "default-t",
    });
    const event = instWithDefault.toolCalled("bash");
    assert.equal(event.taskId, "default-t");
  });

  it("toolCalled with no taskId and no default leaves taskId undefined", () => {
    const event = inst.toolCalled("bash");
    assert.equal(event.taskId, undefined);
  });

  it("toolResult with complex result object", () => {
    const result = { lines: ["a", "b"], count: 2, nested: { x: 1 } };
    const event = inst.toolResult("read_file", result);
    assert.deepEqual(event.data.result, result);
  });

  it("toolResult with null result", () => {
    const event = inst.toolResult("write_file", null);
    assert.equal(event.data.result, null);
  });

  it("tokenSpent with zero count", () => {
    const event = inst.tokenSpent(0);
    assert.equal(event.data.count, 0);
    assert.equal(event.data.total, 0);
    assert.equal(inst.getTotalTokens(), 0);
  });

  it("tokenSpent accumulates correctly over many calls", () => {
    for (let i = 0; i < 100; i++) {
      inst.tokenSpent(10);
    }
    assert.equal(inst.getTotalTokens(), 1000);
    const event = inst.tokenSpent(5);
    assert.equal(event.data.total, 1005);
  });

  it("tokenSpent with model parameter", () => {
    const event = inst.tokenSpent(500, "claude-opus-4-6");
    assert.equal(event.data.model, "claude-opus-4-6");
  });

  it("tokenSpent without model parameter", () => {
    const event = inst.tokenSpent(500);
    assert.equal(event.data.model, undefined);
  });

  it("subtaskCreated with empty description", () => {
    const event = inst.subtaskCreated("p1", "s1", "");
    assert.equal(event.data.description, "");
  });

  it("policyViolation without taskId", () => {
    const event = inst.policyViolation("scope_boundary", "wrote to protected path");
    assert.equal(event.type, "policy_violation");
    assert.equal(event.taskId, undefined);
  });

  it("multiple instances on same stream don't interfere", () => {
    const inst2 = new AgentInstrumentation(stream, {
      agentId: "agent-2",
      agentName: "Agent2",
    });

    inst.tokenSpent(100);
    inst2.tokenSpent(200);

    assert.equal(inst.getTotalTokens(), 100);
    assert.equal(inst2.getTotalTokens(), 200);
    assert.equal(stream.getEvents().length, 2);
  });

  it("events from different instances have correct agent metadata", () => {
    const inst2 = new AgentInstrumentation(stream, {
      agentId: "agent-2",
      agentName: "Agent2",
    });

    inst.started();
    inst2.started();

    const events = stream.getEvents();
    assert.equal(events[0].agentId, "edge-agent");
    assert.equal(events[0].agentName, "EdgeAgent");
    assert.equal(events[1].agentId, "agent-2");
    assert.equal(events[1].agentName, "Agent2");
  });

  it("all methods return the emitted AgentEvent", () => {
    const e1 = inst.started();
    assert.ok(e1.id.startsWith("evt_"));

    const e2 = inst.stopped();
    assert.ok(e2.id.startsWith("evt_"));

    const e3 = inst.taskAssigned("t1", "desc");
    assert.ok(e3.id.startsWith("evt_"));

    const e4 = inst.taskCompleted("t1");
    assert.ok(e4.id.startsWith("evt_"));

    const e5 = inst.taskFailed("t1", "err");
    assert.ok(e5.id.startsWith("evt_"));

    const e6 = inst.toolCalled("tool");
    assert.ok(e6.id.startsWith("evt_"));

    const e7 = inst.toolResult("tool", null);
    assert.ok(e7.id.startsWith("evt_"));

    const e8 = inst.tokenSpent(1);
    assert.ok(e8.id.startsWith("evt_"));

    const e9 = inst.subtaskCreated("p", "s", "d");
    assert.ok(e9.id.startsWith("evt_"));

    const e10 = inst.policyViolation("r", "d");
    assert.ok(e10.id.startsWith("evt_"));
  });
});
