import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { JournalIngester } from "./ingest";
import { AgentInstrumentation } from "./instrumentation";
import { ExecutionTrace } from "./trace";

// ---------------------------------------------------------------------------
// EventStream unit tests
// ---------------------------------------------------------------------------

describe("EventStream", () => {
  let stream: EventStream;

  beforeEach(() => {
    stream = new EventStream();
  });

  it("emit returns an AgentEvent with correct fields", () => {
    const event = stream.emit("a1", "Agent-1", "agent_started", { foo: "bar" });
    assert.ok(event.id.startsWith("evt_"));
    assert.equal(event.agentId, "a1");
    assert.equal(event.agentName, "Agent-1");
    assert.equal(event.type, "agent_started");
    assert.deepEqual(event.data, { foo: "bar" });
    assert.ok(event.timestamp > 0);
  });

  it("emit stores events retrievable via getEvents", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a1", "Agent-1", "agent_stopped");
    assert.equal(stream.getEvents().length, 2);
  });

  it("emit includes optional parentEventId and taskId", () => {
    const event = stream.emit("a1", "Agent-1", "tool_called", {}, "parent_1", "task_1");
    assert.equal(event.parentEventId, "parent_1");
    assert.equal(event.taskId, "task_1");
  });

  it("emit defaults data to empty object", () => {
    const event = stream.emit("a1", "Agent-1", "agent_started");
    assert.deepEqual(event.data, {});
  });

  it("getEvents returns a copy, not a reference", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    const events = stream.getEvents();
    // Mutating the returned array should not affect the internal store
    events.length = 0;
    assert.equal(stream.getEvents().length, 1);
  });

  it("getEventsByAgent filters by agentId", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a2", "Agent-2", "agent_started");
    stream.emit("a1", "Agent-1", "agent_stopped");
    const a1Events = stream.getEventsByAgent("a1");
    assert.equal(a1Events.length, 2);
    assert.ok(a1Events.every((e) => e.agentId === "a1"));
  });

  it("getEventsByAgent returns empty array for unknown agent", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    assert.deepEqual(stream.getEventsByAgent("unknown"), []);
  });

  it("getEventsByTask filters by taskId", () => {
    stream.emit("a1", "Agent-1", "task_assigned", {}, undefined, "t1");
    stream.emit("a1", "Agent-1", "tool_called", {}, undefined, "t1");
    stream.emit("a1", "Agent-1", "tool_called", {}, undefined, "t2");
    const t1Events = stream.getEventsByTask("t1");
    assert.equal(t1Events.length, 2);
    assert.ok(t1Events.every((e) => e.taskId === "t1"));
  });

  it("getEventsSince filters by timestamp", () => {
    const e1 = stream.emit("a1", "Agent-1", "agent_started");
    const ts = e1.timestamp + 1;
    // Emit another event slightly later (same ms is fine — filter is >=)
    stream.emit("a1", "Agent-1", "agent_stopped");
    const since = stream.getEventsSince(ts);
    // e2.timestamp >= ts should hold if they share the same ms or later
    assert.ok(since.length <= 2);
    assert.ok(since.every((e) => e.timestamp >= ts));
  });

  it("on listener is called for every emitted event", () => {
    const received: string[] = [];
    stream.on((event) => received.push(event.type));
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a1", "Agent-1", "agent_stopped");
    assert.deepEqual(received, ["agent_started", "agent_stopped"]);
  });

  it("on returns an unsubscribe function", () => {
    const received: string[] = [];
    const unsub = stream.on((event) => received.push(event.type));
    stream.emit("a1", "Agent-1", "agent_started");
    unsub();
    stream.emit("a1", "Agent-1", "agent_stopped");
    assert.deepEqual(received, ["agent_started"]);
  });

  it("multiple listeners all receive events", () => {
    let count1 = 0;
    let count2 = 0;
    stream.on(() => count1++);
    stream.on(() => count2++);
    stream.emit("a1", "Agent-1", "agent_started");
    assert.equal(count1, 1);
    assert.equal(count2, 1);
  });

  it("clear removes all events", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a1", "Agent-1", "agent_stopped");
    assert.equal(stream.getEvents().length, 2);
    stream.clear();
    assert.equal(stream.getEvents().length, 0);
  });
});

// ---------------------------------------------------------------------------
// ExecutionTrace unit tests
// ---------------------------------------------------------------------------

describe("ExecutionTrace", () => {
  let stream: EventStream;
  let trace: ExecutionTrace;

  beforeEach(() => {
    stream = new EventStream();
    trace = new ExecutionTrace(stream);
  });

  it("buildTrace returns empty array when no events exist", () => {
    assert.deepEqual(trace.buildTrace(), []);
  });

  it("buildTrace returns all events as roots when no hierarchy", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    const nodes = trace.buildTrace();
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].event.type, "agent_started");
  });

  it("buildTrace nests tool_called under task_assigned for same agent", () => {
    stream.emit("a1", "Agent-1", "task_assigned", { description: "Do stuff" }, undefined, "t1");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "write" }, undefined, "t1");
    const nodes = trace.buildTrace();
    // task_assigned should be a root with tool_called children
    const taskNode = nodes.find((n) => n.event.type === "task_assigned");
    assert.ok(taskNode);
    assert.equal(taskNode!.children.length, 2);
  });

  it("buildTrace filters by taskId when provided", () => {
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "write" }, undefined, "t2");
    const nodes = trace.buildTrace("t1");
    assert.equal(nodes.length, 1);
  });

  it("buildAgentTrace filters by agentId", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a2", "Agent-2", "agent_started");
    const nodes = trace.buildAgentTrace("a1");
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].event.agentId, "a1");
  });

  it("renderAscii produces non-empty string for events", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read", args: { path: "/tmp" } });
    const ascii = trace.renderAscii();
    assert.ok(ascii.length > 0);
    assert.ok(ascii.includes("Agent-1"));
  });

  it("renderAscii returns empty string for no events", () => {
    assert.equal(trace.renderAscii(), "");
  });

  it("getStats returns correct counts", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
    stream.emit("a1", "Agent-1", "tool_called", { tool: "write" });
    stream.emit("a1", "Agent-1", "token_spent", { count: 100 });
    stream.emit("a1", "Agent-1", "subtask_created", { description: "sub" });
    stream.emit("a1", "Agent-1", "task_failed", { error: "boom" });
    const stats = trace.getStats();
    assert.equal(stats.agentCount, 1);
    assert.deepEqual(stats.agents, ["Agent-1"]);
    assert.equal(stats.toolCallCount, 2);
    assert.deepEqual(stats.uniqueTools.sort(), ["read", "write"]);
    assert.equal(stats.totalTokens, 100);
    assert.equal(stats.subtaskCount, 1);
    assert.equal(stats.failureCount, 1);
    assert.equal(stats.eventCount, 6);
  });

  it("getStats returns zeroes when no events exist", () => {
    const stats = trace.getStats();
    assert.equal(stats.agentCount, 0);
    assert.equal(stats.toolCallCount, 0);
    assert.equal(stats.totalTokens, 0);
    assert.equal(stats.durationMs, 0);
    assert.equal(stats.eventCount, 0);
  });

  it("getStats filters by taskId", () => {
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "write" }, undefined, "t2");
    const stats = trace.getStats("t1");
    assert.equal(stats.toolCallCount, 1);
    assert.equal(stats.eventCount, 1);
  });

  it("getStats counts multiple agents correctly", () => {
    stream.emit("a1", "Agent-1", "agent_started");
    stream.emit("a2", "Agent-2", "agent_started");
    const stats = trace.getStats();
    assert.equal(stats.agentCount, 2);
    assert.ok(stats.agents.includes("Agent-1"));
    assert.ok(stats.agents.includes("Agent-2"));
  });

  it("getStats deduplicates tool names", () => {
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
    stream.emit("a1", "Agent-1", "tool_called", { tool: "write" });
    const stats = trace.getStats();
    assert.equal(stats.toolCallCount, 3);
    assert.equal(stats.uniqueTools.length, 2);
  });
});

// ---------------------------------------------------------------------------
// AgentInstrumentation unit tests
// ---------------------------------------------------------------------------

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

  it("started emits agent_started event", () => {
    const event = inst.started({ reason: "init" });
    assert.equal(event.type, "agent_started");
    assert.equal(event.agentId, "agent-1");
    assert.equal(event.agentName, "TestAgent");
    assert.equal(event.data.reason, "init");
  });

  it("stopped emits agent_stopped event", () => {
    const event = inst.stopped();
    assert.equal(event.type, "agent_stopped");
  });

  it("taskAssigned emits task_assigned with taskId on event", () => {
    const event = inst.taskAssigned("t1", "Build the widget");
    assert.equal(event.type, "task_assigned");
    assert.equal(event.taskId, "t1");
    assert.equal(event.data.description, "Build the widget");
    assert.equal(event.data.taskId, "t1");
  });

  it("taskCompleted emits task_completed", () => {
    const event = inst.taskCompleted("t1", { summary: "done" });
    assert.equal(event.type, "task_completed");
    assert.equal(event.taskId, "t1");
    assert.equal(event.data.summary, "done");
  });

  it("taskFailed emits task_failed with error", () => {
    const event = inst.taskFailed("t1", "timeout");
    assert.equal(event.type, "task_failed");
    assert.equal(event.data.error, "timeout");
    assert.equal(event.taskId, "t1");
  });

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

  it("tokenSpent accumulates tokens and emits event with total", () => {
    const e1 = inst.tokenSpent(100, "gpt-4");
    assert.equal(e1.type, "token_spent");
    assert.equal(e1.data.count, 100);
    assert.equal(e1.data.total, 100);
    assert.equal(e1.data.model, "gpt-4");

    const e2 = inst.tokenSpent(200);
    assert.equal(e2.data.count, 200);
    assert.equal(e2.data.total, 300);
  });

  it("getTotalTokens returns accumulated token count", () => {
    assert.equal(inst.getTotalTokens(), 0);
    inst.tokenSpent(50);
    inst.tokenSpent(75);
    assert.equal(inst.getTotalTokens(), 125);
  });

  it("subtaskCreated emits subtask_created with parent task id", () => {
    const event = inst.subtaskCreated("parent-1", "sub-1", "Do subthing", "worker-agent");
    assert.equal(event.type, "subtask_created");
    assert.equal(event.taskId, "parent-1");
    assert.equal(event.data.subtaskId, "sub-1");
    assert.equal(event.data.description, "Do subthing");
    assert.equal(event.data.targetAgent, "worker-agent");
  });

  it("subtaskCreated works without targetAgent", () => {
    const event = inst.subtaskCreated("parent-1", "sub-1", "Do subthing");
    assert.equal(event.data.targetAgent, undefined);
  });

  it("policyViolation emits policy_violation event", () => {
    const event = inst.policyViolation("no_secrets", "exposed API key", "t1");
    assert.equal(event.type, "policy_violation");
    assert.equal(event.data.rule, "no_secrets");
    assert.equal(event.data.details, "exposed API key");
    assert.equal(event.taskId, "t1");
  });

  it("uses defaultTaskId when taskId not provided", () => {
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

// ---------------------------------------------------------------------------
// JournalIngester unit tests
// ---------------------------------------------------------------------------

describe("JournalIngester", () => {
  let stream: EventStream;
  let tmpDir: string;
  let logDir: string;
  let logPath: string;

  beforeEach(() => {
    stream = new EventStream();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admiral-test-"));
    logDir = path.join(tmpDir, ".admiral");
    logPath = path.join(logDir, "event_log.jsonl");
    fs.mkdirSync(logDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("ingestNewLines returns 0 when log file does not exist", () => {
    const ingester = new JournalIngester("/nonexistent/dir", stream);
    assert.equal(ingester.ingestNewLines(), 0);
  });

  it("ingestNewLines returns 0 for empty file", () => {
    fs.writeFileSync(logPath, "");
    const ingester = new JournalIngester(tmpDir, stream);
    assert.equal(ingester.ingestNewLines(), 0);
  });

  it("ingestNewLines ingests valid JSONL lines", () => {
    const lines = [
      JSON.stringify({
        event: "session_start",
        timestamp: "2025-01-01T00:00:00Z",
        trace_id: "t1",
        agent_id: "a1",
        agent_name: "Agent-1",
        model: "claude",
      }),
      JSON.stringify({
        event: "tool_called",
        timestamp: "2025-01-01T00:00:01Z",
        trace_id: "t1",
        agent_id: "a1",
        agent_name: "Agent-1",
        tool: "read_file",
        tool_call_count: 1,
      }),
    ];
    fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    const count = ingester.ingestNewLines();
    assert.equal(count, 2);
    assert.equal(stream.getEvents().length, 2);
  });

  it("ingested events have correct mapped types", () => {
    const lines = [
      JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" }),
      JSON.stringify({
        event: "tool_called",
        timestamp: "2025-01-01T00:00:01Z",
        trace_id: "t1",
        tool: "bash",
      }),
      JSON.stringify({
        event: "token_spent",
        timestamp: "2025-01-01T00:00:02Z",
        trace_id: "t1",
        token_count: 500,
        token_total: 500,
      }),
      JSON.stringify({
        event: "policy_violation",
        timestamp: "2025-01-01T00:00:03Z",
        trace_id: "t1",
        detail: "bad thing",
      }),
    ];
    fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();
    const events = stream.getEvents();
    assert.equal(events[0].type, "agent_started");
    assert.equal(events[1].type, "tool_called");
    assert.equal(events[2].type, "token_spent");
    assert.equal(events[3].type, "policy_violation");
  });

  it("ingestNewLines handles malformed lines gracefully", () => {
    const lines = [
      JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" }),
      "THIS IS NOT JSON",
      JSON.stringify({
        event: "tool_called",
        timestamp: "2025-01-01T00:00:01Z",
        trace_id: "t1",
        tool: "bash",
      }),
    ];
    fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    const count = ingester.ingestNewLines();
    assert.equal(count, 2);
    const stats = ingester.getStats();
    assert.equal(stats.malformedLines, 1);
  });

  it("ingestNewLines tracks offset and only reads new content", () => {
    const line1 = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
    fs.writeFileSync(logPath, line1);

    const ingester = new JournalIngester(tmpDir, stream);
    assert.equal(ingester.ingestNewLines(), 1);
    assert.equal(ingester.getOffset(), Buffer.byteLength(line1));

    // Append a second line
    const line2 = `${JSON.stringify({ event: "tool_called", timestamp: "2025-01-01T00:00:01Z", trace_id: "t1", tool: "bash" })}\n`;
    fs.appendFileSync(logPath, line2);

    assert.equal(ingester.ingestNewLines(), 1);
    assert.equal(stream.getEvents().length, 2);
  });

  it("ingestNewLines returns 0 on second call with no new data", () => {
    const line = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
    fs.writeFileSync(logPath, line);

    const ingester = new JournalIngester(tmpDir, stream);
    assert.equal(ingester.ingestNewLines(), 1);
    assert.equal(ingester.ingestNewLines(), 0);
  });

  it("getStats returns correct cumulative statistics", () => {
    const lines = [
      JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" }),
      "bad json here",
      JSON.stringify({
        event: "tool_called",
        timestamp: "2025-01-01T00:00:01Z",
        trace_id: "t1",
        tool: "bash",
      }),
    ];
    fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();

    const stats = ingester.getStats();
    assert.equal(stats.ingested, 2);
    assert.equal(stats.malformedLines, 1);
    assert.equal(stats.readErrors, 0);
    assert.ok(stats.offset > 0);
  });

  it("getOffset starts at zero", () => {
    const ingester = new JournalIngester(tmpDir, stream);
    assert.equal(ingester.getOffset(), 0);
  });

  it("extracts data fields for session_start events", () => {
    const line = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", model: "claude-3", standing_orders_loaded: 5 })}\n`;
    fs.writeFileSync(logPath, line);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();
    const event = stream.getEvents()[0];
    assert.equal(event.data.model, "claude-3");
    assert.equal(event.data.standing_orders_loaded, 5);
  });

  it("extracts data fields for token_spent events", () => {
    const line = `${JSON.stringify({ event: "token_spent", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", token_count: 250, token_total: 1000 })}\n`;
    fs.writeFileSync(logPath, line);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();
    const event = stream.getEvents()[0];
    assert.equal(event.data.count, 250);
    assert.equal(event.data.total, 1000);
  });

  it("uses default agent values when agent_id and agent_name are missing", () => {
    const line = `${JSON.stringify({ event: "tool_called", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", tool: "bash" })}\n`;
    fs.writeFileSync(logPath, line);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();
    const event = stream.getEvents()[0];
    assert.equal(event.agentId, "claude-code");
    assert.equal(event.agentName, "Claude Code Agent");
  });

  it("maps unknown event types to tool_called", () => {
    const line = `${JSON.stringify({ event: "some_unknown_event", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
    fs.writeFileSync(logPath, line);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();
    const event = stream.getEvents()[0];
    assert.equal(event.type, "tool_called");
  });
});
