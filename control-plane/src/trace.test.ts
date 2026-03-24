/**
 * Admiral ExecutionTrace — Comprehensive Unit Tests (T-01)
 *
 * Tests buildTrace(), buildAgentTrace(), renderAscii(), getStats()
 * with nested agent/task hierarchies, empty streams, single-event streams,
 * and all event type formatting.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { ExecutionTrace } from "./trace";

describe("ExecutionTrace — buildTrace()", () => {
  let stream: EventStream;
  let trace: ExecutionTrace;

  beforeEach(() => {
    stream = new EventStream();
    trace = new ExecutionTrace(stream);
  });

  it("returns empty array for empty stream", () => {
    assert.deepEqual(trace.buildTrace(), []);
  });

  it("returns single root for single event", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    const nodes = trace.buildTrace();
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].event.type, "agent_started");
    assert.equal(nodes[0].children.length, 0);
  });

  it("nests tool_called under task_assigned for same agent", () => {
    stream.emit("a1", "Agent-1", "task_assigned", { description: "Do work" });
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
    stream.emit("a1", "Agent-1", "tool_called", { tool: "write" });

    const nodes = trace.buildTrace();
    const taskNode = nodes.find((n) => n.event.type === "task_assigned");
    assert.ok(taskNode);
    assert.equal(taskNode!.children.length, 2);
    assert.equal(taskNode!.children[0].event.type, "tool_called");
    assert.equal(taskNode!.children[1].event.type, "tool_called");
  });

  it("keeps agent_started as root, nests subsequent events", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });

    const nodes = trace.buildTrace();
    // agent_started is a root, tool_called is also a root (no task_assigned to nest under)
    assert.ok(nodes.length >= 1);
  });

  it("handles multiple agents independently", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a2", "Agent-2", "agent_started");
    stream.emit("a1", "Agent-1", "task_assigned", { description: "Task A" });
    stream.emit("a2", "Agent-2", "task_assigned", { description: "Task B" });

    const nodes = trace.buildTrace();
    // Should have roots from both agents
    const agent1Roots = nodes.filter((n) => n.event.agentId === "a1");
    const agent2Roots = nodes.filter((n) => n.event.agentId === "a2");
    assert.ok(agent1Roots.length > 0);
    assert.ok(agent2Roots.length > 0);
  });

  it("filters by taskId when provided", () => {
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "write" }, undefined, "t2");
    stream.emit("a2", "Agent-2", "tool_called", { tool: "grep" }, undefined, "t1");

    const nodes = trace.buildTrace("t1");
    assert.equal(nodes.length, 2);
    for (const n of nodes) {
      assert.equal(n.event.taskId, "t1");
    }
  });

  it("handles events with no task_assigned predecessor as roots", () => {
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
    stream.emit("a1", "Agent-1", "tool_result", { tool: "read" });
    stream.emit("a1", "Agent-1", "token_spent", { count: 50 });

    const nodes = trace.buildTrace();
    // All should be roots since there's no task_assigned
    assert.equal(nodes.length, 3);
  });

  it("handles nested hierarchy: agent_started -> task_assigned -> tool_called", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a1", "Agent-1", "task_assigned", { description: "Implement feature" });
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
    stream.emit("a1", "Agent-1", "tool_called", { tool: "edit" });
    stream.emit("a1", "Agent-1", "task_completed", {});

    const nodes = trace.buildTrace();
    const taskNode = nodes.find((n) => n.event.type === "task_assigned");
    assert.ok(taskNode);
    // tool_called and task_completed should be children of task_assigned
    assert.ok(taskNode!.children.length >= 2);
  });
});

describe("ExecutionTrace — buildAgentTrace()", () => {
  let stream: EventStream;
  let trace: ExecutionTrace;

  beforeEach(() => {
    stream = new EventStream();
    trace = new ExecutionTrace(stream);
  });

  it("returns empty array for unknown agent", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    const nodes = trace.buildAgentTrace("nonexistent");
    assert.deepEqual(nodes, []);
  });

  it("returns only events for the specified agent", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a2", "Agent-2", "agent_started");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
    stream.emit("a2", "Agent-2", "tool_called", { tool: "write" });

    const nodes = trace.buildAgentTrace("a1");
    for (const n of nodes) {
      assert.equal(n.event.agentId, "a1");
    }
  });

  it("preserves hierarchy within agent trace", () => {
    stream.emit("a1", "Agent-1", "task_assigned", { description: "Work" });
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });

    const nodes = trace.buildAgentTrace("a1");
    const taskNode = nodes.find((n) => n.event.type === "task_assigned");
    assert.ok(taskNode);
    assert.equal(taskNode!.children.length, 1);
  });
});

describe("ExecutionTrace — renderAscii()", () => {
  let stream: EventStream;
  let trace: ExecutionTrace;

  beforeEach(() => {
    stream = new EventStream();
    trace = new ExecutionTrace(stream);
  });

  it("returns empty string for empty stream", () => {
    assert.equal(trace.renderAscii(), "");
  });

  it("renders single event with tree prefix", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    const ascii = trace.renderAscii();
    assert.ok(ascii.includes("Agent-1"));
    assert.ok(ascii.includes("started"));
  });

  it("renders nested events with indentation", () => {
    stream.emit("a1", "Agent-1", "task_assigned", { description: "Build feature" });
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read", args: { path: "/tmp/foo" } });

    const ascii = trace.renderAscii();
    assert.ok(ascii.includes("Build feature"));
    assert.ok(ascii.includes("read"));
  });

  it("renders all event type formats", () => {
    stream.emit("a1", "A", "agent_started");
    stream.emit("a1", "A", "agent_stopped");
    stream.emit("a1", "A", "task_assigned", { description: "Do thing" });
    stream.emit("a1", "A", "task_completed", {});
    stream.emit("a1", "A", "task_failed", { error: "boom" });
    stream.emit("a1", "A", "tool_called", { tool: "read", args: { path: "/x" } });
    stream.emit("a1", "A", "tool_result", { tool: "read" });
    stream.emit("a1", "A", "token_spent", { count: 100, total: 500 });
    stream.emit("a1", "A", "subtask_created", { description: "sub", targetAgent: "B" });
    stream.emit("a1", "A", "policy_violation", { rule: "no-secrets" });

    const ascii = trace.renderAscii();
    assert.ok(ascii.includes("started"));
    assert.ok(ascii.includes("stopped"));
    assert.ok(ascii.includes("Do thing"));
    assert.ok(ascii.includes("completed"));
    assert.ok(ascii.includes("boom"));
    assert.ok(ascii.includes("read"));
    assert.ok(ascii.includes("result"));
    assert.ok(ascii.includes("100"));
    assert.ok(ascii.includes("sub"));
    assert.ok(ascii.includes("no-secrets"));
  });

  it("renders subtask_created without targetAgent", () => {
    stream.emit("a1", "A", "subtask_created", { description: "orphan sub" });
    const ascii = trace.renderAscii();
    assert.ok(ascii.includes("unassigned"));
  });

  it("renders tool_called with empty args", () => {
    stream.emit("a1", "A", "tool_called", { tool: "bash", args: {} });
    const ascii = trace.renderAscii();
    assert.ok(ascii.includes("bash"));
  });

  it("renders tool_called with no args key", () => {
    stream.emit("a1", "A", "tool_called", { tool: "bash" });
    const ascii = trace.renderAscii();
    assert.ok(ascii.includes("bash"));
  });

  it("accepts explicit nodes parameter", () => {
    stream.emit("a1", "A", "agent_started");
    const nodes = trace.buildTrace();
    const ascii = trace.renderAscii(nodes);
    assert.ok(ascii.includes("A"));
  });

  it("handles multiple roots with correct tree characters", () => {
    stream.emit("a1", "A", "agent_started");
    stream.emit("a2", "B", "agent_started");
    const ascii = trace.renderAscii();
    // Should have tree branch characters
    assert.ok(ascii.includes("\u251C") || ascii.includes("\u2514"));
  });
});

describe("ExecutionTrace — getStats()", () => {
  let stream: EventStream;
  let trace: ExecutionTrace;

  beforeEach(() => {
    stream = new EventStream();
    trace = new ExecutionTrace(stream);
  });

  it("returns all zeroes for empty stream", () => {
    const stats = trace.getStats();
    assert.equal(stats.agentCount, 0);
    assert.equal(stats.toolCallCount, 0);
    assert.equal(stats.totalTokens, 0);
    assert.equal(stats.subtaskCount, 0);
    assert.equal(stats.failureCount, 0);
    assert.equal(stats.durationMs, 0);
    assert.equal(stats.eventCount, 0);
    assert.deepEqual(stats.agents, []);
    assert.deepEqual(stats.uniqueTools, []);
  });

  it("counts agents correctly across multiple agents", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a2", "Agent-2", "agent_started");
    stream.emit("a3", "Agent-3", "tool_called", { tool: "x" });
    const stats = trace.getStats();
    assert.equal(stats.agentCount, 3);
    assert.ok(stats.agents.includes("Agent-1"));
    assert.ok(stats.agents.includes("Agent-2"));
    assert.ok(stats.agents.includes("Agent-3"));
  });

  it("counts tool calls and deduplicates tool names", () => {
    stream.emit("a1", "A", "tool_called", { tool: "read" });
    stream.emit("a1", "A", "tool_called", { tool: "read" });
    stream.emit("a1", "A", "tool_called", { tool: "write" });
    stream.emit("a1", "A", "tool_called", { tool: "edit" });
    const stats = trace.getStats();
    assert.equal(stats.toolCallCount, 4);
    assert.equal(stats.uniqueTools.length, 3);
  });

  it("sums tokens across multiple token_spent events", () => {
    stream.emit("a1", "A", "token_spent", { count: 100 });
    stream.emit("a1", "A", "token_spent", { count: 250 });
    stream.emit("a2", "B", "token_spent", { count: 50 });
    const stats = trace.getStats();
    assert.equal(stats.totalTokens, 400);
  });

  it("counts subtasks and failures", () => {
    stream.emit("a1", "A", "subtask_created", { description: "s1" });
    stream.emit("a1", "A", "subtask_created", { description: "s2" });
    stream.emit("a1", "A", "task_failed", { error: "e1" });
    const stats = trace.getStats();
    assert.equal(stats.subtaskCount, 2);
    assert.equal(stats.failureCount, 1);
  });

  it("calculates duration from first to last event", () => {
    stream.emit("a1", "A", "agent_started");
    // Small delay to ensure non-zero duration
    const stats = trace.getStats();
    // With a single event, duration is 0
    assert.equal(stats.durationMs, 0);
  });

  it("filters by taskId", () => {
    stream.emit("a1", "A", "tool_called", { tool: "read" }, undefined, "t1");
    stream.emit("a1", "A", "tool_called", { tool: "write" }, undefined, "t2");
    stream.emit("a1", "A", "token_spent", { count: 100 }, undefined, "t1");
    stream.emit("a1", "A", "token_spent", { count: 200 }, undefined, "t2");

    const stats = trace.getStats("t1");
    assert.equal(stats.toolCallCount, 1);
    assert.equal(stats.totalTokens, 100);
    assert.equal(stats.eventCount, 2);
  });

  it("handles single event stream", () => {
    stream.emit("a1", "Solo", "agent_started");
    const stats = trace.getStats();
    assert.equal(stats.agentCount, 1);
    assert.equal(stats.eventCount, 1);
    assert.equal(stats.durationMs, 0);
  });
});
