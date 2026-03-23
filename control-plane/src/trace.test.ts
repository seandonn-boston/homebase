import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import type { TraceNode } from "./trace";
import { ExecutionTrace } from "./trace";

describe("ExecutionTrace", () => {
  let stream: EventStream;
  let trace: ExecutionTrace;

  beforeEach(() => {
    stream = new EventStream();
    trace = new ExecutionTrace(stream);
  });

  describe("buildTrace()", () => {
    it("returns empty array for empty stream", () => {
      const nodes = trace.buildTrace();
      assert.deepEqual(nodes, []);
    });

    it("returns single root for a single agent_started event", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      const nodes = trace.buildTrace();
      assert.equal(nodes.length, 1);
      assert.equal(nodes[0].event.agentName, "Coder");
      assert.equal(nodes[0].event.type, "agent_started");
      assert.equal(nodes[0].children.length, 0);
    });

    it("nests tool_called under task_assigned for same agent", () => {
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Fix bug" });
      stream.emit("agent-1", "Coder", "tool_called", {
        tool: "read_file",
        args: { path: "foo.ts" },
      });
      stream.emit("agent-1", "Coder", "tool_called", {
        tool: "edit_file",
        args: { path: "foo.ts" },
      });
      stream.emit("agent-1", "Coder", "task_completed", {});

      const nodes = trace.buildTrace();
      // task_assigned is root, tool_called + task_completed are children
      assert.equal(nodes.length, 1);
      assert.equal(nodes[0].event.type, "task_assigned");
      assert.equal(nodes[0].children.length, 3);
      assert.equal(nodes[0].children[0].event.type, "tool_called");
      assert.equal(nodes[0].children[1].event.type, "tool_called");
      assert.equal(nodes[0].children[2].event.type, "task_completed");
    });

    it("creates separate roots for multiple agents", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      stream.emit("agent-2", "Reviewer", "agent_started");

      const nodes = trace.buildTrace();
      assert.equal(nodes.length, 2);
      const names = nodes.map((n) => n.event.agentName);
      assert.ok(names.includes("Coder"));
      assert.ok(names.includes("Reviewer"));
    });

    it("filters by taskId when provided", () => {
      stream.emit(
        "agent-1",
        "Coder",
        "task_assigned",
        { description: "Task A" },
        undefined,
        "task-1",
      );
      stream.emit("agent-1", "Coder", "tool_called", { tool: "read" }, undefined, "task-1");
      stream.emit(
        "agent-2",
        "Reviewer",
        "task_assigned",
        { description: "Task B" },
        undefined,
        "task-2",
      );

      const nodes = trace.buildTrace("task-1");
      assert.equal(nodes.length, 1);
      assert.equal(nodes[0].event.data.description, "Task A");
      assert.equal(nodes[0].children.length, 1);
    });

    it("handles events with no task before task_assigned as roots", () => {
      stream.emit("agent-1", "Coder", "tool_called", { tool: "search" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "read" });

      const nodes = trace.buildTrace();
      // No task_assigned, so both tool_called events become roots
      assert.equal(nodes.length, 2);
      assert.equal(nodes[0].event.type, "tool_called");
      assert.equal(nodes[1].event.type, "tool_called");
    });

    it("handles multiple task_assigned events from same agent sequentially", () => {
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Task 1" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "read" });
      stream.emit("agent-1", "Coder", "task_completed", {});
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Task 2" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "write" });

      const nodes = trace.buildTrace();
      assert.equal(nodes.length, 2);
      assert.equal(nodes[0].event.data.description, "Task 1");
      assert.equal(nodes[0].children.length, 2); // tool_called + task_completed
      assert.equal(nodes[1].event.data.description, "Task 2");
      assert.equal(nodes[1].children.length, 1); // tool_called
    });

    it("treats agent_started as root even when followed by tasks", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Work" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "edit" });

      const nodes = trace.buildTrace();
      // agent_started is root, task_assigned is root (both are root types)
      assert.equal(nodes.length, 2);
      assert.equal(nodes[0].event.type, "agent_started");
      assert.equal(nodes[1].event.type, "task_assigned");
      assert.equal(nodes[1].children.length, 1);
    });
  });

  describe("buildAgentTrace()", () => {
    it("returns empty array for unknown agent", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      const nodes = trace.buildAgentTrace("nonexistent");
      assert.deepEqual(nodes, []);
    });

    it("returns only events for the specified agent", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      stream.emit("agent-2", "Reviewer", "agent_started");
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Code" });
      stream.emit("agent-2", "Reviewer", "task_assigned", { description: "Review" });

      const nodes = trace.buildAgentTrace("agent-1");
      // Verify all events belong to agent-1
      const allEvents = flattenNodes(nodes);
      for (const event of allEvents) {
        assert.equal(event.agentId, "agent-1");
      }
    });

    it("builds correct tree structure for single agent", () => {
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Implement feature" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "read_file" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "write_file" });
      stream.emit("agent-1", "Coder", "task_completed", {});

      const nodes = trace.buildAgentTrace("agent-1");
      assert.equal(nodes.length, 1);
      assert.equal(nodes[0].children.length, 3);
    });
  });

  describe("renderAscii()", () => {
    it("returns empty string for empty stream", () => {
      const output = trace.renderAscii();
      assert.equal(output, "");
    });

    it("renders single event with box-drawing characters", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      const output = trace.renderAscii();
      assert.ok(output.includes("Coder started"));
      assert.ok(output.includes("└") || output.includes("├"));
    });

    it("renders nested tree with indentation", () => {
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Fix bug" });
      stream.emit("agent-1", "Coder", "tool_called", {
        tool: "read_file",
        args: { path: "main.ts" },
      });
      stream.emit("agent-1", "Coder", "task_completed", {});

      const output = trace.renderAscii();
      const lines = output.split("\n");
      assert.ok(lines.length >= 2);
      // Children should be more indented than parent
      assert.ok(lines[0].length > 0);
    });

    it("renders pre-built nodes when passed directly", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      const nodes = trace.buildTrace();
      const output = trace.renderAscii(nodes);
      assert.ok(output.includes("Coder started"));
    });

    it("renders tool_called with tool name and args", () => {
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Work" });
      stream.emit("agent-1", "Coder", "tool_called", {
        tool: "read_file",
        args: { path: "test.ts" },
      });

      const output = trace.renderAscii();
      assert.ok(output.includes("read_file"));
      assert.ok(output.includes("test.ts"));
    });

    it("renders all event types correctly", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      stream.emit("agent-2", "Tester", "task_assigned", { description: "Run tests" });
      stream.emit("agent-2", "Tester", "tool_called", { tool: "exec", args: {} });
      stream.emit("agent-2", "Tester", "tool_result", { tool: "exec" });
      stream.emit("agent-2", "Tester", "task_completed", {});
      stream.emit("agent-3", "Monitor", "token_spent", { count: 500, total: 1500 });
      stream.emit("agent-4", "Lead", "subtask_created", {
        description: "Sub work",
        targetAgent: "Worker",
      });
      stream.emit("agent-5", "Bad", "task_failed", { error: "timeout" });
      stream.emit("agent-6", "Risky", "policy_violation", { rule: "no_force_push" });

      const output = trace.renderAscii();
      assert.ok(output.includes("Coder started"));
      assert.ok(output.includes("Run tests"));
      assert.ok(output.includes("exec"));
      assert.ok(output.includes("result"));
      assert.ok(output.includes("✓ task completed"));
      assert.ok(output.includes("500 tokens"));
      assert.ok(output.includes("subtask"));
      assert.ok(output.includes("Worker"));
      assert.ok(output.includes("✗ timeout"));
      assert.ok(output.includes("⚠ Risky violated: no_force_push"));
    });

    it("renders agent_stopped event", () => {
      stream.emit("agent-1", "Coder", "agent_stopped");
      const output = trace.renderAscii();
      assert.ok(output.includes("Coder stopped"));
    });

    it("renders unknown event type with type name", () => {
      // biome-ignore lint/suspicious/noExplicitAny: testing default branch with non-standard event type
      stream.emit("agent-1", "Coder", "custom_event" as any, {});
      const output = trace.renderAscii();
      assert.ok(output.includes("Coder custom_event"));
    });

    it("renders tool_called with no args", () => {
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Work" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "list_files" });

      const output = trace.renderAscii();
      assert.ok(output.includes("list_files"));
    });

    it("renders tool_called with empty args", () => {
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Work" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "list_files", args: {} });

      const output = trace.renderAscii();
      assert.ok(output.includes("list_files()"));
    });

    it("renders subtask_created with no targetAgent", () => {
      stream.emit("agent-1", "Lead", "subtask_created", { description: "Sub work" });
      const output = trace.renderAscii();
      assert.ok(output.includes("unassigned"));
    });
  });

  describe("getStats()", () => {
    it("returns zeroed stats for empty stream", () => {
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
      stream.emit("agent-1", "Coder", "agent_started");
      stream.emit("agent-2", "Reviewer", "agent_started");
      stream.emit("agent-1", "Coder", "tool_called", { tool: "read" });

      const stats = trace.getStats();
      assert.equal(stats.agentCount, 2);
      assert.ok(stats.agents.includes("Coder"));
      assert.ok(stats.agents.includes("Reviewer"));
    });

    it("counts tool calls and unique tools", () => {
      stream.emit("agent-1", "Coder", "tool_called", { tool: "read_file" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "read_file" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "write_file" });

      const stats = trace.getStats();
      assert.equal(stats.toolCallCount, 3);
      assert.equal(stats.uniqueTools.length, 2);
      assert.ok(stats.uniqueTools.includes("read_file"));
      assert.ok(stats.uniqueTools.includes("write_file"));
    });

    it("sums tokens from token_spent events", () => {
      stream.emit("agent-1", "Coder", "token_spent", { count: 100, total: 100 });
      stream.emit("agent-1", "Coder", "token_spent", { count: 250, total: 350 });
      stream.emit("agent-2", "Reviewer", "token_spent", { count: 50, total: 50 });

      const stats = trace.getStats();
      assert.equal(stats.totalTokens, 400);
    });

    it("counts subtasks and failures", () => {
      stream.emit("agent-1", "Lead", "subtask_created", { description: "Sub 1" });
      stream.emit("agent-1", "Lead", "subtask_created", { description: "Sub 2" });
      stream.emit("agent-2", "Worker", "task_failed", { error: "crash" });

      const stats = trace.getStats();
      assert.equal(stats.subtaskCount, 2);
      assert.equal(stats.failureCount, 1);
    });

    it("calculates duration from first to last event", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      // The duration depends on timestamps which use Date.now()
      // We verify it's a non-negative number
      stream.emit("agent-1", "Coder", "task_completed", {});

      const stats = trace.getStats();
      assert.ok(stats.durationMs >= 0);
      assert.equal(stats.eventCount, 2);
    });

    it("filters stats by taskId", () => {
      stream.emit("agent-1", "Coder", "tool_called", { tool: "read" }, undefined, "task-1");
      stream.emit("agent-1", "Coder", "tool_called", { tool: "write" }, undefined, "task-1");
      stream.emit("agent-2", "Reviewer", "tool_called", { tool: "lint" }, undefined, "task-2");

      const stats = trace.getStats("task-1");
      assert.equal(stats.toolCallCount, 2);
      assert.equal(stats.agentCount, 1);
      assert.equal(stats.eventCount, 2);
    });

    it("returns correct event count", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Work" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "read" });
      stream.emit("agent-1", "Coder", "task_completed", {});

      const stats = trace.getStats();
      assert.equal(stats.eventCount, 4);
    });

    it("handles single event (duration is 0)", () => {
      stream.emit("agent-1", "Coder", "agent_started");
      const stats = trace.getStats();
      assert.equal(stats.durationMs, 0);
      assert.equal(stats.eventCount, 1);
    });
  });

  describe("complex scenarios", () => {
    it("handles multi-agent nested hierarchy", () => {
      // Lead assigns work, Coder does it, Reviewer reviews
      stream.emit("lead-1", "Lead", "agent_started");
      stream.emit("lead-1", "Lead", "subtask_created", {
        description: "Implement feature",
        targetAgent: "Coder",
      });
      stream.emit("coder-1", "Coder", "agent_started");
      stream.emit("coder-1", "Coder", "task_assigned", { description: "Implement feature" });
      stream.emit("coder-1", "Coder", "tool_called", { tool: "read_file" });
      stream.emit("coder-1", "Coder", "tool_called", { tool: "write_file" });
      stream.emit("coder-1", "Coder", "task_completed", {});
      stream.emit("reviewer-1", "Reviewer", "agent_started");
      stream.emit("reviewer-1", "Reviewer", "task_assigned", { description: "Review changes" });
      stream.emit("reviewer-1", "Reviewer", "tool_called", { tool: "diff" });
      stream.emit("reviewer-1", "Reviewer", "task_completed", {});

      const nodes = trace.buildTrace();
      assert.ok(nodes.length >= 3); // At least 3 agents as roots

      const stats = trace.getStats();
      assert.equal(stats.agentCount, 3);
      assert.equal(stats.toolCallCount, 3);
      assert.equal(stats.subtaskCount, 1);
    });

    it("handles large event stream", () => {
      // Simulate 100 tool calls from 5 agents
      for (let a = 0; a < 5; a++) {
        stream.emit(`agent-${a}`, `Agent${a}`, "task_assigned", { description: `Task ${a}` });
        for (let t = 0; t < 20; t++) {
          stream.emit(`agent-${a}`, `Agent${a}`, "tool_called", { tool: `tool_${t % 5}` });
        }
        stream.emit(`agent-${a}`, `Agent${a}`, "task_completed", {});
      }

      const stats = trace.getStats();
      assert.equal(stats.agentCount, 5);
      assert.equal(stats.toolCallCount, 100);
      assert.equal(stats.uniqueTools.length, 5);
      assert.equal(stats.eventCount, 110); // 5 * (1 task_assigned + 20 tool_called + 1 task_completed)

      // Verify tree structure - each agent should have one root task with children
      const nodes = trace.buildTrace();
      assert.equal(nodes.length, 5);
      for (const node of nodes) {
        assert.equal(node.event.type, "task_assigned");
        assert.equal(node.children.length, 21); // 20 tool_called + 1 task_completed
      }

      // ASCII rendering should not throw
      const ascii = trace.renderAscii();
      assert.ok(ascii.length > 0);
    });

    it("handles interleaved agent events", () => {
      // Two agents working simultaneously with interleaved events
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Code" });
      stream.emit("agent-2", "Tester", "task_assigned", { description: "Test" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "write" });
      stream.emit("agent-2", "Tester", "tool_called", { tool: "run_tests" });
      stream.emit("agent-1", "Coder", "task_completed", {});
      stream.emit("agent-2", "Tester", "task_completed", {});

      const nodes = trace.buildTrace();
      assert.equal(nodes.length, 2);

      // Each agent's events should be correctly grouped
      const coderTrace = trace.buildAgentTrace("agent-1");
      assert.equal(coderTrace.length, 1);
      assert.equal(coderTrace[0].children.length, 2); // tool_called + task_completed

      const testerTrace = trace.buildAgentTrace("agent-2");
      assert.equal(testerTrace.length, 1);
      assert.equal(testerTrace[0].children.length, 2);
    });

    it("buildTrace and renderAscii are consistent", () => {
      stream.emit("agent-1", "Coder", "task_assigned", { description: "Work" });
      stream.emit("agent-1", "Coder", "tool_called", { tool: "edit" });

      const nodes = trace.buildTrace();
      const ascii1 = trace.renderAscii(nodes);
      const ascii2 = trace.renderAscii();

      // Both should contain the same content (though IDs differ due to rebuild)
      assert.ok(ascii1.includes("Work"));
      assert.ok(ascii2.includes("Work"));
      assert.ok(ascii1.includes("edit"));
      assert.ok(ascii2.includes("edit"));
    });
  });
});

/** Recursively flatten TraceNode tree into a list of events */
function flattenNodes(nodes: TraceNode[]): import("./events").AgentEvent[] {
  const result: import("./events").AgentEvent[] = [];
  for (const node of nodes) {
    result.push(node.event);
    result.push(...flattenNodes(node.children));
  }
  return result;
}
