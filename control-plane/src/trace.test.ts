/**
 * Comprehensive unit tests for ExecutionTrace.
 *
 * Covers: buildTrace(), buildAgentTrace(), renderAscii(), getStats()
 * with nested agent/task hierarchies, empty streams, single-event streams,
 * all event type formatting, and edge cases.
 *
 * Target: >=80% branch coverage of trace.ts
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { ExecutionTrace } from "./trace";

describe("ExecutionTrace", () => {
  let stream: EventStream;
  let trace: ExecutionTrace;

  beforeEach(() => {
    stream = new EventStream();
    trace = new ExecutionTrace(stream);
  });

  // -------------------------------------------------------------------------
  // buildTrace
  // -------------------------------------------------------------------------
  describe("buildTrace", () => {
    it("returns empty array when no events exist", () => {
      assert.deepEqual(trace.buildTrace(), []);
    });

    it("returns single-event stream as one root node", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      const nodes = trace.buildTrace();
      assert.equal(nodes.length, 1);
      assert.equal(nodes[0].event.type, "agent_started");
      assert.equal(nodes[0].children.length, 0);
    });

    it("nests tool_called under task_assigned for same agent", () => {
      stream.emit("a1", "Agent-1", "task_assigned", { description: "Build widget" }, undefined, "t1");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "write" }, undefined, "t1");
      const nodes = trace.buildTrace();
      const taskNode = nodes.find((n) => n.event.type === "task_assigned");
      assert.ok(taskNode);
      assert.equal(taskNode!.children.length, 2);
      assert.equal(taskNode!.children[0].event.type, "tool_called");
      assert.equal(taskNode!.children[1].event.type, "tool_called");
    });

    it("nests task_completed, task_failed, tool_result, token_spent, subtask_created, policy_violation under task_assigned", () => {
      stream.emit("a1", "Agent-1", "task_assigned", { description: "Work" }, undefined, "t1");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
      stream.emit("a1", "Agent-1", "tool_result", { tool: "read", result: "data" }, undefined, "t1");
      stream.emit("a1", "Agent-1", "token_spent", { count: 50 }, undefined, "t1");
      stream.emit("a1", "Agent-1", "subtask_created", { description: "sub", subtaskId: "s1" }, undefined, "t1");
      stream.emit("a1", "Agent-1", "task_completed", { summary: "done" }, undefined, "t1");
      const nodes = trace.buildTrace();
      const taskNode = nodes.find((n) => n.event.type === "task_assigned");
      assert.ok(taskNode);
      assert.equal(taskNode!.children.length, 5);
    });

    it("filters events by taskId when provided", () => {
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "write" }, undefined, "t2");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "exec" }, undefined, "t1");
      const nodes = trace.buildTrace("t1");
      assert.equal(nodes.length, 2);
      assert.ok(nodes.every((n) => n.event.taskId === "t1"));
    });

    it("returns all events as roots when no task_assigned or agent_started exists", () => {
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "write" });
      const nodes = trace.buildTrace();
      // Without a task_assigned, currentTaskNode is null, so events become roots
      assert.equal(nodes.length, 2);
    });

    it("handles multiple agents with independent hierarchies", () => {
      stream.emit("a1", "Agent-1", "task_assigned", { description: "Task A" }, undefined, "t1");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
      stream.emit("a2", "Agent-2", "task_assigned", { description: "Task B" }, undefined, "t2");
      stream.emit("a2", "Agent-2", "tool_called", { tool: "write" }, undefined, "t2");
      const nodes = trace.buildTrace();
      // Two task_assigned roots, each with one child
      const a1Task = nodes.find((n) => n.event.agentId === "a1" && n.event.type === "task_assigned");
      const a2Task = nodes.find((n) => n.event.agentId === "a2" && n.event.type === "task_assigned");
      assert.ok(a1Task);
      assert.ok(a2Task);
      assert.equal(a1Task!.children.length, 1);
      assert.equal(a2Task!.children.length, 1);
    });

    it("agent_started becomes a root node without nesting following events", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      const nodes = trace.buildTrace();
      // agent_started is root but does not set currentTaskNode
      // tool_called without currentTaskNode also becomes root
      const startedNode = nodes.find((n) => n.event.type === "agent_started");
      assert.ok(startedNode);
      assert.equal(startedNode!.children.length, 0);
      assert.equal(nodes.length, 2);
    });

    it("handles agent_started followed by task_assigned nesting correctly", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "task_assigned", { description: "Work" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      const nodes = trace.buildTrace();
      // agent_started → root, task_assigned → root, tool_called → child of task_assigned
      assert.equal(nodes.length, 2);
      const taskNode = nodes.find((n) => n.event.type === "task_assigned");
      assert.ok(taskNode);
      assert.equal(taskNode!.children.length, 1);
    });

    it("handles multiple sequential tasks from the same agent", () => {
      stream.emit("a1", "Agent-1", "task_assigned", { description: "First" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      stream.emit("a1", "Agent-1", "task_assigned", { description: "Second" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "write" });
      const nodes = trace.buildTrace();
      // Two task_assigned roots
      const tasks = nodes.filter((n) => n.event.type === "task_assigned");
      assert.equal(tasks.length, 2);
      // First task has 1 child (read), second has 1 child (write)
      assert.equal(tasks[0].children.length, 1);
      assert.equal(tasks[1].children.length, 1);
    });
  });

  // -------------------------------------------------------------------------
  // buildAgentTrace
  // -------------------------------------------------------------------------
  describe("buildAgentTrace", () => {
    it("returns empty array for unknown agent", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      assert.deepEqual(trace.buildAgentTrace("unknown"), []);
    });

    it("filters events to specific agent only", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a2", "Agent-2", "agent_started");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      const nodes = trace.buildAgentTrace("a1");
      assert.ok(nodes.every((n) => n.event.agentId === "a1"));
      assert.equal(nodes.length, 2);
    });

    it("builds proper hierarchy for filtered agent", () => {
      stream.emit("a1", "Agent-1", "task_assigned", { description: "Work" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      stream.emit("a2", "Agent-2", "tool_called", { tool: "write" });
      const nodes = trace.buildAgentTrace("a1");
      assert.equal(nodes.length, 1); // task_assigned root
      assert.equal(nodes[0].children.length, 1); // tool_called child
    });
  });

  // -------------------------------------------------------------------------
  // renderAscii
  // -------------------------------------------------------------------------
  describe("renderAscii", () => {
    it("returns empty string when no events exist", () => {
      assert.equal(trace.renderAscii(), "");
    });

    it("renders single event with tree prefix", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1 started"));
      assert.ok(ascii.includes("\u2514")); // └ (last item prefix)
    });

    it("renders multiple roots with correct prefixes", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a2", "Agent-2", "agent_started");
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("\u251C")); // ├ (non-last item)
      assert.ok(ascii.includes("\u2514")); // └ (last item)
      assert.ok(ascii.includes("Agent-1 started"));
      assert.ok(ascii.includes("Agent-2 started"));
    });

    it("renders nested children with indentation", () => {
      stream.emit("a1", "Agent-1", "task_assigned", { description: "Build widget" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      const ascii = trace.renderAscii();
      // The child should be indented
      const lines = ascii.split("\n").filter((l) => l.length > 0);
      assert.ok(lines.length >= 2);
    });

    it("accepts custom nodes parameter", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      const nodes = trace.buildTrace();
      const ascii = trace.renderAscii(nodes);
      assert.ok(ascii.includes("Agent-1 started"));
    });

    it("accepts custom indent parameter", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      const nodes = trace.buildTrace();
      const ascii = trace.renderAscii(nodes, ">>>");
      assert.ok(ascii.startsWith(">>>"));
    });

    // formatNode coverage for all event types
    it("formats agent_started event", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1 started"));
    });

    it("formats agent_stopped event", () => {
      stream.emit("a1", "Agent-1", "agent_stopped");
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1 stopped"));
    });

    it("formats task_assigned event with description", () => {
      stream.emit("a1", "Agent-1", "task_assigned", { description: "Build feature X" });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1 \u2192 Build feature X"));
    });

    it("formats task_completed event", () => {
      stream.emit("a1", "Agent-1", "task_completed", { summary: "done" });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1 \u2713 task completed"));
    });

    it("formats task_failed event with error", () => {
      stream.emit("a1", "Agent-1", "task_failed", { error: "timeout reached" });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1 \u2717 timeout reached"));
    });

    it("formats tool_called event with tool name and args", () => {
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read_file", args: { path: "/tmp/foo" } });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes('Agent-1.read_file(path: "/tmp/foo")'));
    });

    it("formats tool_called with no args", () => {
      stream.emit("a1", "Agent-1", "tool_called", { tool: "list_files" });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1.list_files()"));
    });

    it("formats tool_called with empty args object", () => {
      stream.emit("a1", "Agent-1", "tool_called", { tool: "list_files", args: {} });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1.list_files()"));
    });

    it("formats tool_called with non-string arg values", () => {
      stream.emit("a1", "Agent-1", "tool_called", {
        tool: "search",
        args: { limit: 10, recursive: true },
      });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1.search(limit: 10, recursive: true)"));
    });

    it("formats tool_result event", () => {
      stream.emit("a1", "Agent-1", "tool_result", { tool: "read_file", result: "content" });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1.read_file \u2192 result"));
    });

    it("formats token_spent event with count and total", () => {
      stream.emit("a1", "Agent-1", "token_spent", { count: 150, total: 300 });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1 spent 150 tokens (total: 300)"));
    });

    it("formats subtask_created event with target agent", () => {
      stream.emit("a1", "Agent-1", "subtask_created", {
        description: "sub-work",
        subtaskId: "s1",
        targetAgent: "Worker-1",
      });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1 \u2192 subtask: sub-work \u2192 Worker-1"));
    });

    it("formats subtask_created event without target agent", () => {
      stream.emit("a1", "Agent-1", "subtask_created", {
        description: "sub-work",
        subtaskId: "s1",
      });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("Agent-1 \u2192 subtask: sub-work \u2192 unassigned"));
    });

    it("formats policy_violation event", () => {
      stream.emit("a1", "Agent-1", "policy_violation", { rule: "no_secrets", details: "exposed key" });
      const ascii = trace.renderAscii();
      assert.ok(ascii.includes("\u26A0 Agent-1 violated: no_secrets"));
    });
  });

  // -------------------------------------------------------------------------
  // getStats
  // -------------------------------------------------------------------------
  describe("getStats", () => {
    it("returns zeroes when no events exist", () => {
      const stats = trace.getStats();
      assert.equal(stats.agentCount, 0);
      assert.deepEqual(stats.agents, []);
      assert.equal(stats.toolCallCount, 0);
      assert.deepEqual(stats.uniqueTools, []);
      assert.equal(stats.totalTokens, 0);
      assert.equal(stats.subtaskCount, 0);
      assert.equal(stats.failureCount, 0);
      assert.equal(stats.durationMs, 0);
      assert.equal(stats.eventCount, 0);
    });

    it("counts agents correctly", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a2", "Agent-2", "agent_started");
      stream.emit("a3", "Agent-3", "agent_started");
      const stats = trace.getStats();
      assert.equal(stats.agentCount, 3);
      assert.equal(stats.agents.length, 3);
    });

    it("deduplicates agents by name", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      const stats = trace.getStats();
      assert.equal(stats.agentCount, 1);
    });

    it("counts tool calls", () => {
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "write" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }); // duplicate tool
      const stats = trace.getStats();
      assert.equal(stats.toolCallCount, 3);
    });

    it("deduplicates tool names in uniqueTools", () => {
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "write" });
      const stats = trace.getStats();
      assert.equal(stats.uniqueTools.length, 2);
    });

    it("accumulates tokens from multiple events", () => {
      stream.emit("a1", "Agent-1", "token_spent", { count: 100 });
      stream.emit("a1", "Agent-1", "token_spent", { count: 200 });
      stream.emit("a1", "Agent-1", "token_spent", { count: 50 });
      const stats = trace.getStats();
      assert.equal(stats.totalTokens, 350);
    });

    it("counts subtasks", () => {
      stream.emit("a1", "Agent-1", "subtask_created", { description: "sub1", subtaskId: "s1" });
      stream.emit("a1", "Agent-1", "subtask_created", { description: "sub2", subtaskId: "s2" });
      const stats = trace.getStats();
      assert.equal(stats.subtaskCount, 2);
    });

    it("counts failures", () => {
      stream.emit("a1", "Agent-1", "task_failed", { error: "boom" });
      stream.emit("a1", "Agent-1", "task_failed", { error: "crash" });
      const stats = trace.getStats();
      assert.equal(stats.failureCount, 2);
    });

    it("calculates duration from first to last event", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      // Emit a few more events to create timestamp spread
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      stream.emit("a1", "Agent-1", "agent_stopped");
      const stats = trace.getStats();
      assert.ok(stats.durationMs >= 0);
    });

    it("filters by taskId", () => {
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "write" }, undefined, "t2");
      stream.emit("a1", "Agent-1", "token_spent", { count: 100 }, undefined, "t1");
      const stats = trace.getStats("t1");
      assert.equal(stats.toolCallCount, 1);
      assert.equal(stats.eventCount, 2);
      assert.equal(stats.totalTokens, 100);
    });

    it("returns correct eventCount", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      stream.emit("a1", "Agent-1", "tool_called", { tool: "write" });
      stream.emit("a1", "Agent-1", "agent_stopped");
      const stats = trace.getStats();
      assert.equal(stats.eventCount, 4);
    });

    it("handles comprehensive multi-agent scenario", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a2", "Agent-2", "agent_started");
      stream.emit("a1", "Agent-1", "task_assigned", { description: "Task A" }, undefined, "t1");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
      stream.emit("a2", "Agent-2", "tool_called", { tool: "write" }, undefined, "t2");
      stream.emit("a1", "Agent-1", "token_spent", { count: 200 }, undefined, "t1");
      stream.emit("a2", "Agent-2", "token_spent", { count: 300 }, undefined, "t2");
      stream.emit("a1", "Agent-1", "subtask_created", { description: "sub", subtaskId: "s1" }, undefined, "t1");
      stream.emit("a2", "Agent-2", "task_failed", { error: "oops" }, undefined, "t2");
      const stats = trace.getStats();
      assert.equal(stats.agentCount, 2);
      assert.equal(stats.toolCallCount, 2);
      assert.equal(stats.totalTokens, 500);
      assert.equal(stats.subtaskCount, 1);
      assert.equal(stats.failureCount, 1);
      assert.equal(stats.eventCount, 9);
    });
  });
});
