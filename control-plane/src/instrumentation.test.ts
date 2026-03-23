/**
 * Comprehensive unit tests for AgentInstrumentation.
 *
 * Covers: all public methods, edge cases (empty data, missing fields,
 * default vs explicit taskId), token accumulation, and multiple
 * instrumentation instances on the same stream.
 *
 * Target: >=90% branch coverage of instrumentation.ts
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { AgentInstrumentation } from "./instrumentation";

describe("AgentInstrumentation", () => {
  let stream: EventStream;
  let inst: AgentInstrumentation;

  beforeEach(() => {
    stream = new EventStream();
    inst = new AgentInstrumentation(stream, {
      agentId: "agent-1",
      agentName: "TestAgent",
    });
  });

  // -------------------------------------------------------------------------
  // Construction and config
  // -------------------------------------------------------------------------
  describe("construction", () => {
    it("uses agentId and agentName from config", () => {
      const event = inst.started();
      assert.equal(event.agentId, "agent-1");
      assert.equal(event.agentName, "TestAgent");
    });

    it("does not set defaultTaskId when not provided", () => {
      const event = inst.toolCalled("read_file");
      assert.equal(event.taskId, undefined);
    });

    it("uses defaultTaskId when configured", () => {
      const instWithDefault = new AgentInstrumentation(stream, {
        agentId: "agent-1",
        agentName: "TestAgent",
        defaultTaskId: "default-task",
      });
      const event = instWithDefault.toolCalled("read_file");
      assert.equal(event.taskId, "default-task");
    });

    it("explicit taskId overrides defaultTaskId", () => {
      const instWithDefault = new AgentInstrumentation(stream, {
        agentId: "agent-1",
        agentName: "TestAgent",
        defaultTaskId: "default-task",
      });
      const event = instWithDefault.toolCalled("read_file", {}, "explicit-task");
      assert.equal(event.taskId, "explicit-task");
    });
  });

  // -------------------------------------------------------------------------
  // Lifecycle events
  // -------------------------------------------------------------------------
  describe("lifecycle events", () => {
    it("started emits agent_started event", () => {
      const event = inst.started({ reason: "init" });
      assert.equal(event.type, "agent_started");
      assert.equal(event.data.reason, "init");
    });

    it("started defaults data to empty object", () => {
      const event = inst.started();
      assert.equal(event.type, "agent_started");
      assert.deepEqual(event.data, {});
    });

    it("stopped emits agent_stopped event", () => {
      const event = inst.stopped();
      assert.equal(event.type, "agent_stopped");
    });

    it("stopped with custom data", () => {
      const event = inst.stopped({ reason: "timeout" });
      assert.equal(event.type, "agent_stopped");
      assert.equal(event.data.reason, "timeout");
    });
  });

  // -------------------------------------------------------------------------
  // Task management
  // -------------------------------------------------------------------------
  describe("task management", () => {
    it("taskAssigned emits task_assigned with description", () => {
      const event = inst.taskAssigned("t1", "Build the widget");
      assert.equal(event.type, "task_assigned");
      assert.equal(event.taskId, "t1");
      assert.equal(event.data.description, "Build the widget");
      assert.equal(event.data.taskId, "t1");
    });

    it("taskAssigned merges additional data", () => {
      const event = inst.taskAssigned("t1", "Work", { priority: "high" });
      assert.equal(event.data.priority, "high");
      assert.equal(event.data.description, "Work");
    });

    it("taskCompleted emits task_completed", () => {
      const event = inst.taskCompleted("t1", { summary: "done" });
      assert.equal(event.type, "task_completed");
      assert.equal(event.taskId, "t1");
      assert.equal(event.data.summary, "done");
    });

    it("taskCompleted with empty data", () => {
      const event = inst.taskCompleted("t1");
      assert.equal(event.type, "task_completed");
      assert.equal(event.taskId, "t1");
      assert.equal(event.data.taskId, "t1");
    });

    it("taskFailed emits task_failed with error message", () => {
      const event = inst.taskFailed("t1", "timeout");
      assert.equal(event.type, "task_failed");
      assert.equal(event.data.error, "timeout");
      assert.equal(event.taskId, "t1");
    });

    it("taskFailed merges additional data", () => {
      const event = inst.taskFailed("t1", "crash", { retryable: true });
      assert.equal(event.data.error, "crash");
      assert.equal(event.data.retryable, true);
    });
  });

  // -------------------------------------------------------------------------
  // Tool tracking
  // -------------------------------------------------------------------------
  describe("tool tracking", () => {
    it("toolCalled emits tool_called with tool name and args", () => {
      const event = inst.toolCalled("read_file", { path: "/tmp/foo" }, "t1");
      assert.equal(event.type, "tool_called");
      assert.equal(event.data.tool, "read_file");
      assert.deepEqual(event.data.args, { path: "/tmp/foo" });
      assert.equal(event.taskId, "t1");
    });

    it("toolCalled defaults args to empty object", () => {
      const event = inst.toolCalled("list_files");
      assert.equal(event.data.tool, "list_files");
      assert.deepEqual(event.data.args, {});
    });

    it("toolResult emits tool_result", () => {
      const event = inst.toolResult("read_file", "file contents here", "t1");
      assert.equal(event.type, "tool_result");
      assert.equal(event.data.tool, "read_file");
      assert.equal(event.data.result, "file contents here");
    });

    it("toolResult with complex result object", () => {
      const result = { lines: 42, size: 1024 };
      const event = inst.toolResult("analyze_file", result);
      assert.deepEqual(event.data.result, result);
    });

    it("toolResult with null result", () => {
      const event = inst.toolResult("delete_file", null);
      assert.equal(event.data.result, null);
    });
  });

  // -------------------------------------------------------------------------
  // Token tracking
  // -------------------------------------------------------------------------
  describe("token tracking", () => {
    it("tokenSpent emits token_spent with count and running total", () => {
      const e1 = inst.tokenSpent(100, "gpt-4");
      assert.equal(e1.type, "token_spent");
      assert.equal(e1.data.count, 100);
      assert.equal(e1.data.total, 100);
      assert.equal(e1.data.model, "gpt-4");
    });

    it("tokenSpent accumulates across multiple calls", () => {
      inst.tokenSpent(100);
      const e2 = inst.tokenSpent(200);
      assert.equal(e2.data.count, 200);
      assert.equal(e2.data.total, 300);
    });

    it("tokenSpent without model", () => {
      const event = inst.tokenSpent(50);
      assert.equal(event.data.model, undefined);
    });

    it("tokenSpent with taskId", () => {
      const event = inst.tokenSpent(100, "claude", "t1");
      assert.equal(event.taskId, "t1");
    });

    it("getTotalTokens starts at zero", () => {
      assert.equal(inst.getTotalTokens(), 0);
    });

    it("getTotalTokens returns accumulated count", () => {
      inst.tokenSpent(50);
      inst.tokenSpent(75);
      inst.tokenSpent(25);
      assert.equal(inst.getTotalTokens(), 150);
    });
  });

  // -------------------------------------------------------------------------
  // Subtasks
  // -------------------------------------------------------------------------
  describe("subtasks", () => {
    it("subtaskCreated emits subtask_created with all fields", () => {
      const event = inst.subtaskCreated("parent-1", "sub-1", "Do subthing", "worker-agent");
      assert.equal(event.type, "subtask_created");
      assert.equal(event.taskId, "parent-1");
      assert.equal(event.data.subtaskId, "sub-1");
      assert.equal(event.data.description, "Do subthing");
      assert.equal(event.data.targetAgent, "worker-agent");
    });

    it("subtaskCreated without targetAgent", () => {
      const event = inst.subtaskCreated("parent-1", "sub-1", "Do subthing");
      assert.equal(event.data.targetAgent, undefined);
    });
  });

  // -------------------------------------------------------------------------
  // Policy violations
  // -------------------------------------------------------------------------
  describe("policy violations", () => {
    it("policyViolation emits policy_violation event", () => {
      const event = inst.policyViolation("no_secrets", "exposed API key", "t1");
      assert.equal(event.type, "policy_violation");
      assert.equal(event.data.rule, "no_secrets");
      assert.equal(event.data.details, "exposed API key");
      assert.equal(event.taskId, "t1");
    });

    it("policyViolation without taskId uses default", () => {
      const event = inst.policyViolation("no_secrets", "exposed key");
      assert.equal(event.type, "policy_violation");
      assert.equal(event.taskId, undefined);
    });
  });

  // -------------------------------------------------------------------------
  // Multiple instruments on same stream
  // -------------------------------------------------------------------------
  describe("multiple instruments", () => {
    it("two instruments emit to the same stream independently", () => {
      const inst2 = new AgentInstrumentation(stream, {
        agentId: "agent-2",
        agentName: "OtherAgent",
      });

      inst.started();
      inst2.started();
      inst.toolCalled("read");
      inst2.toolCalled("write");

      const events = stream.getEvents();
      assert.equal(events.length, 4);
      assert.equal(events[0].agentId, "agent-1");
      assert.equal(events[1].agentId, "agent-2");
    });

    it("token counts are independent per instrument", () => {
      const inst2 = new AgentInstrumentation(stream, {
        agentId: "agent-2",
        agentName: "OtherAgent",
      });

      inst.tokenSpent(100);
      inst2.tokenSpent(200);
      inst.tokenSpent(50);

      assert.equal(inst.getTotalTokens(), 150);
      assert.equal(inst2.getTotalTokens(), 200);
    });
  });

  // -------------------------------------------------------------------------
  // Event stream integration
  // -------------------------------------------------------------------------
  describe("stream integration", () => {
    it("all events appear in stream.getEvents()", () => {
      inst.started();
      inst.taskAssigned("t1", "Work");
      inst.toolCalled("read");
      inst.toolResult("read", "data");
      inst.tokenSpent(100);
      inst.subtaskCreated("t1", "s1", "Sub");
      inst.policyViolation("rule", "detail");
      inst.taskCompleted("t1");
      inst.stopped();

      assert.equal(stream.getEvents().length, 9);
    });

    it("events have unique IDs", () => {
      inst.started();
      inst.stopped();
      const events = stream.getEvents();
      assert.notEqual(events[0].id, events[1].id);
    });

    it("events have ascending timestamps", () => {
      inst.started();
      inst.stopped();
      const events = stream.getEvents();
      assert.ok(events[1].timestamp >= events[0].timestamp);
    });
  });
});
