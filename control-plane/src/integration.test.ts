import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { type Alert, createAdmiral } from "./index";

describe("End-to-end pipeline", () => {
  let admiral: ReturnType<typeof createAdmiral>;

  afterEach(() => {
    admiral?.shutdown();
  });

  it("createAdmiral returns stream, detector, trace, instrument, shutdown", () => {
    admiral = createAdmiral();
    assert.ok(admiral.stream);
    assert.ok(admiral.detector);
    assert.ok(admiral.trace);
    assert.equal(typeof admiral.instrument, "function");
    assert.equal(typeof admiral.shutdown, "function");
  });

  it("instrument creates working AgentInstrumentation", () => {
    admiral = createAdmiral();
    const inst = admiral.instrument("a1", "TestAgent");
    assert.ok(inst);
    inst.toolCalled("read", { file: "test.ts" });
    const events = admiral.stream.getEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "tool_called");
    assert.equal(events[0].data.tool, "read");
  });

  it("repeated tool calls trigger loop_detected alert", () => {
    const alerts: Alert[] = [];
    admiral = createAdmiral({
      maxRepeatedToolCalls: 3,
      repeatWindowMs: 60_000,
      onAlert: (alert) => {
        alerts.push(alert);
        return false;
      },
    });

    const inst = admiral.instrument("a1", "TestAgent");
    inst.toolCalled("read");
    inst.toolCalled("read");
    inst.toolCalled("read");

    assert.ok(alerts.length > 0);
    assert.equal(alerts[0].type, "loop_detected");
  });

  it("critical alerts auto-pause agents", () => {
    admiral = createAdmiral({
      maxSubtasks: 2,
      subtaskWindowMs: 60_000,
    });

    const inst = admiral.instrument("a1", "TestAgent");
    inst.subtaskCreated("t1", "subtask-1", "SubAgent");
    inst.subtaskCreated("t1", "subtask-2", "SubAgent");

    assert.ok(admiral.detector.isAgentPaused("a1"));
  });

  it("resumeAgent unpauses agent", () => {
    admiral = createAdmiral({
      maxSubtasks: 2,
      subtaskWindowMs: 60_000,
    });

    const inst = admiral.instrument("a1", "TestAgent");
    inst.subtaskCreated("t1", "subtask-1", "SubAgent");
    inst.subtaskCreated("t1", "subtask-2", "SubAgent");

    assert.ok(admiral.detector.isAgentPaused("a1"));
    admiral.detector.resumeAgent("a1");
    assert.ok(!admiral.detector.isAgentPaused("a1"));
  });

  it("resolveAlert marks alert resolved", () => {
    const alerts: Alert[] = [];
    admiral = createAdmiral({
      maxRepeatedToolCalls: 3,
      repeatWindowMs: 60_000,
      onAlert: (alert) => {
        alerts.push(alert);
        return false;
      },
    });

    const inst = admiral.instrument("a1", "TestAgent");
    for (let i = 0; i < 3; i++) inst.toolCalled("read");

    assert.ok(alerts.length > 0);
    const alertId = alerts[0].id;
    admiral.detector.resolveAlert(alertId);

    const active = admiral.detector.getActiveAlerts();
    assert.ok(!active.find((a) => a.id === alertId));
  });

  it("trace builds tree from instrumented events", () => {
    admiral = createAdmiral();
    const inst = admiral.instrument("a1", "TestAgent");
    inst.taskAssigned("task-1", "Do something");
    inst.toolCalled("read", { file: "x.ts" });
    inst.taskCompleted("task-1", { result: "Done" });

    const tree = admiral.trace.buildTrace();
    assert.ok(tree.length > 0);
  });

  it("shutdown stops detector", () => {
    admiral = createAdmiral();
    admiral.shutdown();
    // After shutdown, emitting events should not throw
    admiral.stream.emit("a1", "TestAgent", "tool_called", { tool: "read" });
    // Detector should no longer generate alerts since it's stopped
    assert.deepEqual(admiral.detector.getAlerts(), []);
  });

  it("token spike triggers token_spike alert", () => {
    const alerts: Alert[] = [];
    admiral = createAdmiral({
      tokenSpikePerMinute: 100,
      onAlert: (alert) => {
        alerts.push(alert);
        return false;
      },
    });

    const inst = admiral.instrument("a1", "TestAgent");
    inst.tokenSpent(50);
    inst.tokenSpent(60);

    const tokenAlerts = alerts.filter((a) => a.type === "token_spike");
    assert.ok(tokenAlerts.length > 0);
  });
});
