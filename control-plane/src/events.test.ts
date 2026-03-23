/**
 * Comprehensive unit tests for EventStream.
 *
 * Covers: ID generation, listener lifecycle, eviction via RingBuffer
 * overflow, filters (by agent, task, timestamp), counters
 * (getEvictedCount, getTotalEmitted), event ordering, listener cleanup.
 *
 * Target: >=90% branch coverage of events.ts
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";

describe("EventStream", () => {
  let stream: EventStream;

  beforeEach(() => {
    stream = new EventStream();
  });

  // -------------------------------------------------------------------------
  // Event emission and ID generation
  // -------------------------------------------------------------------------
  describe("emit and ID generation", () => {
    it("returns an AgentEvent with correct fields", () => {
      const event = stream.emit("a1", "Agent-1", "agent_started", { foo: "bar" });
      assert.ok(event.id.startsWith("evt_"));
      assert.equal(event.agentId, "a1");
      assert.equal(event.agentName, "Agent-1");
      assert.equal(event.type, "agent_started");
      assert.deepEqual(event.data, { foo: "bar" });
      assert.ok(event.timestamp > 0);
    });

    it("generates unique IDs across emissions", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const event = stream.emit("a1", "Agent-1", "agent_started");
        ids.add(event.id);
      }
      assert.equal(ids.size, 100);
    });

    it("ID format includes timestamp and counter", () => {
      const event = stream.emit("a1", "Agent-1", "agent_started");
      const parts = event.id.split("_");
      assert.equal(parts[0], "evt");
      assert.ok(Number(parts[1]) > 0); // timestamp
      assert.ok(Number(parts[2]) > 0); // counter
    });

    it("defaults data to empty object", () => {
      const event = stream.emit("a1", "Agent-1", "agent_started");
      assert.deepEqual(event.data, {});
    });

    it("includes optional parentEventId", () => {
      const event = stream.emit("a1", "Agent-1", "tool_called", {}, "parent_1");
      assert.equal(event.parentEventId, "parent_1");
    });

    it("includes optional taskId", () => {
      const event = stream.emit("a1", "Agent-1", "tool_called", {}, undefined, "task_1");
      assert.equal(event.taskId, "task_1");
    });

    it("includes both parentEventId and taskId", () => {
      const event = stream.emit("a1", "Agent-1", "tool_called", {}, "parent_1", "task_1");
      assert.equal(event.parentEventId, "parent_1");
      assert.equal(event.taskId, "task_1");
    });
  });

  // -------------------------------------------------------------------------
  // Event retrieval
  // -------------------------------------------------------------------------
  describe("getEvents", () => {
    it("returns empty array initially", () => {
      assert.deepEqual(stream.getEvents(), []);
    });

    it("returns all emitted events", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "agent_stopped");
      assert.equal(stream.getEvents().length, 2);
    });

    it("returns a copy, not a reference", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      const events = stream.getEvents();
      events.length = 0;
      assert.equal(stream.getEvents().length, 1);
    });

    it("preserves insertion order", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "tool_called", { tool: "read" });
      stream.emit("a1", "Agent-1", "agent_stopped");
      const events = stream.getEvents();
      assert.equal(events[0].type, "agent_started");
      assert.equal(events[1].type, "tool_called");
      assert.equal(events[2].type, "agent_stopped");
    });
  });

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------
  describe("getEventsByAgent", () => {
    it("filters by agentId", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a2", "Agent-2", "agent_started");
      stream.emit("a1", "Agent-1", "agent_stopped");
      const a1Events = stream.getEventsByAgent("a1");
      assert.equal(a1Events.length, 2);
      assert.ok(a1Events.every((e) => e.agentId === "a1"));
    });

    it("returns empty array for unknown agent", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      assert.deepEqual(stream.getEventsByAgent("unknown"), []);
    });
  });

  describe("getEventsByTask", () => {
    it("filters by taskId", () => {
      stream.emit("a1", "Agent-1", "task_assigned", {}, undefined, "t1");
      stream.emit("a1", "Agent-1", "tool_called", {}, undefined, "t1");
      stream.emit("a1", "Agent-1", "tool_called", {}, undefined, "t2");
      const t1Events = stream.getEventsByTask("t1");
      assert.equal(t1Events.length, 2);
      assert.ok(t1Events.every((e) => e.taskId === "t1"));
    });

    it("returns empty array for unknown taskId", () => {
      stream.emit("a1", "Agent-1", "tool_called", {}, undefined, "t1");
      assert.deepEqual(stream.getEventsByTask("unknown"), []);
    });

    it("excludes events without taskId", () => {
      stream.emit("a1", "Agent-1", "agent_started"); // no taskId
      stream.emit("a1", "Agent-1", "tool_called", {}, undefined, "t1");
      assert.equal(stream.getEventsByTask("t1").length, 1);
    });
  });

  describe("getEventsSince", () => {
    it("filters by timestamp", () => {
      const e1 = stream.emit("a1", "Agent-1", "agent_started");
      const ts = e1.timestamp + 1;
      stream.emit("a1", "Agent-1", "agent_stopped");
      const since = stream.getEventsSince(ts);
      assert.ok(since.every((e) => e.timestamp >= ts));
    });

    it("returns all events when timestamp is 0", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "agent_stopped");
      const since = stream.getEventsSince(0);
      assert.equal(since.length, 2);
    });

    it("returns empty array when timestamp is in the future", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      const since = stream.getEventsSince(Date.now() + 100000);
      assert.equal(since.length, 0);
    });
  });

  // -------------------------------------------------------------------------
  // Listeners
  // -------------------------------------------------------------------------
  describe("listeners", () => {
    it("listener is called for every emitted event", () => {
      const received: string[] = [];
      stream.on((event) => received.push(event.type));
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "agent_stopped");
      assert.deepEqual(received, ["agent_started", "agent_stopped"]);
    });

    it("returns an unsubscribe function", () => {
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

    it("unsubscribing one listener does not affect others", () => {
      let count1 = 0;
      let count2 = 0;
      const unsub1 = stream.on(() => count1++);
      stream.on(() => count2++);
      stream.emit("a1", "Agent-1", "agent_started");
      unsub1();
      stream.emit("a1", "Agent-1", "agent_stopped");
      assert.equal(count1, 1);
      assert.equal(count2, 2);
    });

    it("listener receives the full event object", () => {
      let captured: unknown = null;
      stream.on((event) => {
        captured = event;
      });
      const emitted = stream.emit("a1", "Agent-1", "agent_started", { key: "val" });
      assert.deepEqual(captured, emitted);
    });
  });

  // -------------------------------------------------------------------------
  // Eviction (RingBuffer overflow)
  // -------------------------------------------------------------------------
  describe("eviction", () => {
    it("evicts oldest events when maxEvents is exceeded", () => {
      const smallStream = new EventStream({ maxEvents: 5 });
      for (let i = 0; i < 10; i++) {
        smallStream.emit("a1", "Agent-1", "tool_called", { index: i });
      }
      const events = smallStream.getEvents();
      assert.equal(events.length, 5);
      // Should have the last 5 events (indices 5-9)
      assert.equal(events[0].data.index, 5);
      assert.equal(events[4].data.index, 9);
    });

    it("getEvictedCount tracks evicted events", () => {
      const smallStream = new EventStream({ maxEvents: 3 });
      assert.equal(smallStream.getEvictedCount(), 0);
      for (let i = 0; i < 7; i++) {
        smallStream.emit("a1", "Agent-1", "tool_called");
      }
      assert.equal(smallStream.getEvictedCount(), 4); // 7 - 3 = 4 evicted
    });

    it("getTotalEmitted tracks all events ever emitted", () => {
      const smallStream = new EventStream({ maxEvents: 3 });
      for (let i = 0; i < 7; i++) {
        smallStream.emit("a1", "Agent-1", "tool_called");
      }
      assert.equal(smallStream.getTotalEmitted(), 7);
    });

    it("getEvictedCount is zero when under capacity", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "agent_stopped");
      assert.equal(stream.getEvictedCount(), 0);
    });

    it("getTotalEmitted equals getEvents().length when no evictions", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "agent_stopped");
      assert.equal(stream.getTotalEmitted(), stream.getEvents().length);
    });
  });

  // -------------------------------------------------------------------------
  // Clear
  // -------------------------------------------------------------------------
  describe("clear", () => {
    it("removes all events", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.emit("a1", "Agent-1", "agent_stopped");
      assert.equal(stream.getEvents().length, 2);
      stream.clear();
      assert.equal(stream.getEvents().length, 0);
    });

    it("allows new events after clear", () => {
      stream.emit("a1", "Agent-1", "agent_started");
      stream.clear();
      stream.emit("a1", "Agent-1", "agent_stopped");
      assert.equal(stream.getEvents().length, 1);
      assert.equal(stream.getEvents()[0].type, "agent_stopped");
    });
  });

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------
  describe("configuration", () => {
    it("uses default maxEvents when not specified", () => {
      const defaultStream = new EventStream();
      // Default is 10000 — emit a few and verify no eviction
      for (let i = 0; i < 100; i++) {
        defaultStream.emit("a1", "Agent-1", "tool_called");
      }
      assert.equal(defaultStream.getEvents().length, 100);
      assert.equal(defaultStream.getEvictedCount(), 0);
    });

    it("accepts partial config", () => {
      const customStream = new EventStream({ maxEvents: 50 });
      for (let i = 0; i < 60; i++) {
        customStream.emit("a1", "Agent-1", "tool_called");
      }
      assert.equal(customStream.getEvents().length, 50);
      assert.equal(customStream.getEvictedCount(), 10);
    });
  });
});
