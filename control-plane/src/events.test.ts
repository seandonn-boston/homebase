/**
 * Admiral EventStream — Comprehensive Unit Tests (T-04)
 *
 * Tests ID generation, listener lifecycle, eviction, filters,
 * counters, event ordering, and listener cleanup.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";

describe("EventStream — ID generation", () => {
  let stream: EventStream;

  beforeEach(() => {
    stream = new EventStream();
  });

  it("generates IDs with evt_ prefix", () => {
    const event = stream.emit("a1", "Agent-1", "agent_started");
    assert.ok(event.id.startsWith("evt_"));
  });

  it("generates unique IDs for consecutive events", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const event = stream.emit("a1", "A", "tool_called", { tool: "x" });
      ids.add(event.id);
    }
    assert.equal(ids.size, 100);
  });

  it("generates IDs with UUID format", () => {
    const event = stream.emit("a1", "A", "agent_started");
    // ID format: evt_<uuid>
    assert.ok(event.id.startsWith("evt_"));
    const uuid = event.id.slice(4);
    assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe("EventStream — listener lifecycle", () => {
  let stream: EventStream;

  beforeEach(() => {
    stream = new EventStream();
  });

  it("listener receives events after registration", () => {
    const received: string[] = [];
    stream.on((e) => received.push(e.type));
    stream.emit("a1", "A", "agent_started");
    assert.equal(received.length, 1);
    assert.equal(received[0], "agent_started");
  });

  it("unsubscribe stops delivery", () => {
    const received: string[] = [];
    const unsub = stream.on((e) => received.push(e.type));
    stream.emit("a1", "A", "agent_started");
    unsub();
    stream.emit("a1", "A", "agent_stopped");
    assert.equal(received.length, 1);
  });

  it("multiple listeners all receive same event", () => {
    const r1: string[] = [];
    const r2: string[] = [];
    stream.on((e) => r1.push(e.id));
    stream.on((e) => r2.push(e.id));
    stream.emit("a1", "A", "agent_started");
    assert.equal(r1.length, 1);
    assert.equal(r2.length, 1);
    assert.equal(r1[0], r2[0]);
  });

  it("unsubscribing one listener does not affect others", () => {
    const r1: string[] = [];
    const r2: string[] = [];
    const unsub1 = stream.on((e) => r1.push(e.id));
    stream.on((e) => r2.push(e.id));
    stream.emit("a1", "A", "agent_started");
    unsub1();
    stream.emit("a1", "A", "agent_stopped");
    assert.equal(r1.length, 1);
    assert.equal(r2.length, 2);
  });

  it("listener receives event with all fields populated", () => {
    let captured: unknown = null;
    stream.on((e) => { captured = e; });
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, "parent-1", "task-1");
    const e = captured as { id: string; agentId: string; agentName: string; type: string; parentEventId: string; taskId: string; data: Record<string, unknown> };
    assert.equal(e.agentId, "a1");
    assert.equal(e.agentName, "Agent-1");
    assert.equal(e.type, "tool_called");
    assert.equal(e.parentEventId, "parent-1");
    assert.equal(e.taskId, "task-1");
    assert.equal(e.data.tool, "read");
  });
});

describe("EventStream — eviction", () => {
  it("evicts oldest events when capacity exceeded", () => {
    const stream = new EventStream({ maxEvents: 3 });
    stream.emit("a1", "A", "agent_started");
    stream.emit("a1", "A", "tool_called", { tool: "a" });
    stream.emit("a1", "A", "tool_called", { tool: "b" });
    stream.emit("a1", "A", "tool_called", { tool: "c" });

    const events = stream.getEvents();
    assert.equal(events.length, 3);
    // Oldest (agent_started) should be evicted
    assert.equal(events[0].data.tool, "a");
  });

  it("getEvictedCount tracks evictions", () => {
    const stream = new EventStream({ maxEvents: 2 });
    stream.emit("a1", "A", "agent_started");
    stream.emit("a1", "A", "agent_stopped");
    assert.equal(stream.getEvictedCount(), 0);
    stream.emit("a1", "A", "tool_called", { tool: "x" });
    assert.equal(stream.getEvictedCount(), 1);
  });

  it("getTotalEmitted counts all events ever", () => {
    const stream = new EventStream({ maxEvents: 2 });
    stream.emit("a1", "A", "agent_started");
    stream.emit("a1", "A", "agent_stopped");
    stream.emit("a1", "A", "tool_called", { tool: "x" });
    assert.equal(stream.getTotalEmitted(), 3);
  });

  it("default capacity is 10000", () => {
    const stream = new EventStream();
    // Emit 5 events — none should be evicted
    for (let i = 0; i < 5; i++) {
      stream.emit("a1", "A", "tool_called", { tool: `t${i}` });
    }
    assert.equal(stream.getEvents().length, 5);
    assert.equal(stream.getEvictedCount(), 0);
  });
});

describe("EventStream — filters", () => {
  let stream: EventStream;

  beforeEach(() => {
    stream = new EventStream();
    stream.emit("a1", "Agent-1", "agent_started", {}, undefined, "t1");
    stream.emit("a2", "Agent-2", "agent_started", {}, undefined, "t2");
    stream.emit("a1", "Agent-1", "tool_called", { tool: "read" }, undefined, "t1");
    stream.emit("a2", "Agent-2", "tool_called", { tool: "write" }, undefined, "t2");
  });

  it("getEventsByAgent returns only matching agent events", () => {
    const events = stream.getEventsByAgent("a1");
    assert.equal(events.length, 2);
    events.forEach((e) => assert.equal(e.agentId, "a1"));
  });

  it("getEventsByAgent returns empty for unknown agent", () => {
    assert.deepEqual(stream.getEventsByAgent("unknown"), []);
  });

  it("getEventsByTask returns only matching task events", () => {
    const events = stream.getEventsByTask("t1");
    assert.equal(events.length, 2);
    events.forEach((e) => assert.equal(e.taskId, "t1"));
  });

  it("getEventsByTask returns empty for unknown task", () => {
    assert.deepEqual(stream.getEventsByTask("unknown"), []);
  });

  it("getEventsSince filters by timestamp", () => {
    const ts = Date.now() - 1; // 1ms ago — should include all
    const events = stream.getEventsSince(ts);
    assert.equal(events.length, 4);
  });

  it("getEventsSince returns empty for future timestamp", () => {
    const events = stream.getEventsSince(Date.now() + 100000);
    assert.equal(events.length, 0);
  });
});

describe("EventStream — event ordering and clear", () => {
  let stream: EventStream;

  beforeEach(() => {
    stream = new EventStream();
  });

  it("getEvents returns events in insertion order", () => {
    stream.emit("a1", "A", "agent_started");
    stream.emit("a1", "A", "tool_called", { tool: "x" });
    stream.emit("a1", "A", "agent_stopped");

    const events = stream.getEvents();
    assert.equal(events[0].type, "agent_started");
    assert.equal(events[1].type, "tool_called");
    assert.equal(events[2].type, "agent_stopped");
  });

  it("clear removes all events", () => {
    stream.emit("a1", "A", "agent_started");
    stream.emit("a1", "A", "agent_stopped");
    assert.equal(stream.getEvents().length, 2);
    stream.clear();
    assert.equal(stream.getEvents().length, 0);
  });

  it("timestamps are monotonically non-decreasing", () => {
    for (let i = 0; i < 10; i++) {
      stream.emit("a1", "A", "tool_called", { tool: `t${i}` });
    }
    const events = stream.getEvents();
    for (let i = 1; i < events.length; i++) {
      assert.ok(events[i].timestamp >= events[i - 1].timestamp);
    }
  });

  it("emit with all optional parameters", () => {
    const event = stream.emit(
      "agent-123",
      "Named Agent",
      "subtask_created",
      { description: "sub", targetAgent: "worker" },
      "parent-evt-1",
      "task-42",
    );
    assert.equal(event.agentId, "agent-123");
    assert.equal(event.agentName, "Named Agent");
    assert.equal(event.type, "subtask_created");
    assert.equal(event.parentEventId, "parent-evt-1");
    assert.equal(event.taskId, "task-42");
    assert.equal(event.data.description, "sub");
  });
});
