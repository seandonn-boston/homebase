/**
 * Tests for Fleet Dashboard (OB-12)
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { FleetDashboard } from "./fleet-dashboard";

describe("FleetDashboard", () => {
  let stream: EventStream;
  let dashboard: FleetDashboard;

  beforeEach(() => {
    stream = new EventStream();
    dashboard = new FleetDashboard(stream);
  });

  it("reports running agents with active tasks", () => {
    stream.emit("agent-1", "Agent One", "agent_started");
    stream.emit("agent-1", "Agent One", "task_assigned", {
      task: "implement feature",
    });

    const status = dashboard.getFleetStatus();
    assert.strictEqual(status.running.length, 1);
    assert.strictEqual(status.running[0].agentId, "agent-1");
    assert.strictEqual(status.running[0].task, "implement feature");
  });

  it("tracks token consumption per agent", () => {
    stream.emit("agent-1", "Agent One", "agent_started");
    stream.emit("agent-1", "Agent One", "token_spent", { tokens: 1000 });
    stream.emit("agent-1", "Agent One", "token_spent", { tokens: 500 });

    const status = dashboard.getFleetStatus();
    assert.strictEqual(status.consuming.length, 1);
    assert.strictEqual(status.consuming[0].tokens, 1500);
  });

  it("reports policy violations as attention items", () => {
    stream.emit("agent-1", "Agent One", "policy_violation", {
      reason: "scope violation",
      severity: "high",
    });

    const status = dashboard.getFleetStatus();
    assert.strictEqual(status.attention.length, 1);
    assert.strictEqual(status.attention[0].reason, "scope violation");
  });

  it("provides agent detail with metrics", () => {
    stream.emit("agent-1", "Agent One", "agent_started");
    stream.emit("agent-1", "Agent One", "tool_called", { tool: "bash" });
    stream.emit("agent-1", "Agent One", "token_spent", { tokens: 200 });
    stream.emit("agent-1", "Agent One", "task_completed", {});

    const detail = dashboard.getAgentDetail("agent-1");
    assert.strictEqual(detail.events.length, 4);
    assert.strictEqual(detail.metrics.tokenTotal, 200);
    assert.strictEqual(detail.metrics.taskCount, 1);
    assert.strictEqual(detail.metrics.toolCallCount, 1);
  });

  it("returns alerts from policy violations", () => {
    stream.emit("agent-1", "Agent One", "policy_violation", {
      reason: "budget exceeded",
      severity: "critical",
    });

    const alerts = dashboard.getAlerts();
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0].severity, "critical");
    assert.strictEqual(alerts[0].message, "budget exceeded");
  });

  it("shows recent events in reverse chronological order", () => {
    stream.emit("agent-1", "Agent One", "agent_started");
    stream.emit("agent-1", "Agent One", "task_assigned", { task: "t1" });
    stream.emit("agent-1", "Agent One", "task_completed", {});

    const status = dashboard.getFleetStatus();
    assert.strictEqual(status.recent.length, 3);
    assert.strictEqual(status.recent[0].event, "task_completed");
    assert.strictEqual(status.recent[2].event, "agent_started");
  });
});
