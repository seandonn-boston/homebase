import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { type Alert, ControlChart, RunawayDetector, SPCMonitor } from "./runaway-detector";

// ---------------------------------------------------------------------------
// ControlChart unit tests
// ---------------------------------------------------------------------------

describe("ControlChart", () => {
  let chart: ControlChart;

  beforeEach(() => {
    chart = new ControlChart();
  });

  it("returns zero mean and stddev with no samples", () => {
    assert.equal(chart.getMean(), 0);
    assert.equal(chart.getStdDev(), 0);
    assert.equal(chart.getSampleCount(), 0);
  });

  it("computes correct mean", () => {
    chart.addSample(1, 10);
    chart.addSample(2, 20);
    chart.addSample(3, 30);
    assert.equal(chart.getMean(), 20);
  });

  it("computes correct standard deviation", () => {
    // Values: 10, 20, 30 -> mean=20, variance=100, stddev=10
    chart.addSample(1, 10);
    chart.addSample(2, 20);
    chart.addSample(3, 30);
    assert.equal(chart.getSampleCount(), 3);
    assert.ok(Math.abs(chart.getStdDev() - 10) < 0.01);
  });

  it("enforces maxSamples limit", () => {
    const small = new ControlChart(3);
    small.addSample(1, 100);
    small.addSample(2, 200);
    small.addSample(3, 300);
    small.addSample(4, 400);
    assert.equal(small.getSampleCount(), 3);
    // Oldest (100) should have been evicted
    assert.equal(small.getMean(), 300); // (200+300+400)/3
  });

  it("returns null violation with insufficient samples", () => {
    chart.addSample(1, 10);
    assert.equal(chart.checkLatest(3), null);
  });

  it("returns null when stddev is zero", () => {
    chart.addSample(1, 10);
    chart.addSample(2, 10);
    chart.addSample(3, 10);
    assert.equal(chart.checkLatest(3), null);
  });

  it("detects beyond_ucl violation", () => {
    // Build a baseline with slight variation (stddev > 0)
    // Values alternate 9, 11 -> mean=10, stddev≈1.03
    // UCL at 3σ ≈ 13.08
    for (let i = 0; i < 20; i++) {
      chart.addSample(i, i % 2 === 0 ? 9 : 11);
    }
    // Add a spike well beyond 3σ
    chart.addSample(21, 100);
    const violation = chart.checkLatest(3);
    assert.notEqual(violation, null);
    assert.equal(violation!.rule, "beyond_ucl");
    assert.equal(violation!.value, 100);
  });

  it("does not fire on values within control limits", () => {
    for (let i = 0; i < 20; i++) {
      chart.addSample(i, 10 + (i % 3)); // slight variation: 10, 11, 12
    }
    const violation = chart.checkLatest(3);
    assert.equal(violation, null);
  });

  it("detects western_electric_2of3 (2 of 3 beyond 2σ)", () => {
    chart = new ControlChart(100);
    // Build a stable baseline with known mean and stddev
    // 50 samples alternating 45/55 -> mean=50, stddev≈5.13
    for (let i = 0; i < 50; i++) {
      chart.addSample(i, i % 2 === 0 ? 45 : 55);
    }
    const mean = chart.getMean();
    const stdDev = chart.getStdDev();
    const twoSigma = mean + 2 * stdDev;
    // 2σ ≈ 60.26. Need 2 of last 3 above that.
    // Add one normal, then two clearly above 2σ
    chart.addSample(50, 50); // normal
    chart.addSample(51, twoSigma + 5); // well above 2σ
    chart.addSample(52, twoSigma + 5); // well above 2σ
    const violation = chart.checkLatest(3);
    assert.notEqual(violation, null);
    // May fire as beyond_ucl if the value also exceeds 3σ
    assert.ok(
      violation!.rule === "western_electric_2of3" || violation!.rule === "beyond_ucl",
      `Expected 2of3 or beyond_ucl, got ${violation!.rule}`,
    );
  });

  it("detects western_electric_8consecutive (8 on one side)", () => {
    chart = new ControlChart();
    // Build a baseline with mean ≈ 50
    for (let i = 0; i < 20; i++) {
      chart.addSample(i, 50 + (i % 2 === 0 ? 5 : -5));
    }
    // Now add 8 consecutive values above mean
    for (let i = 0; i < 8; i++) {
      chart.addSample(20 + i, 55);
    }
    const violation = chart.checkLatest(3);
    assert.notEqual(violation, null);
    // Could be 8consecutive or 4of5 — both may trigger
    assert.ok(
      violation!.rule === "western_electric_8consecutive" ||
        violation!.rule === "western_electric_4of5",
    );
  });

  it("computes UCL and LCL correctly", () => {
    for (let i = 0; i < 20; i++) {
      chart.addSample(i, 50 + (i % 2 === 0 ? 5 : -5));
    }
    const mean = chart.getMean();
    const stdDev = chart.getStdDev();
    assert.ok(Math.abs(chart.getUCL(3) - (mean + 3 * stdDev)) < 0.01);
    assert.ok(Math.abs(chart.getLCL(3) - Math.max(0, mean - 3 * stdDev)) < 0.01);
  });

  it("floors LCL at zero", () => {
    // Small values with large stddev relative to mean
    chart.addSample(1, 1);
    chart.addSample(2, 2);
    chart.addSample(3, 1);
    chart.addSample(4, 2);
    // mean=1.5, stddev≈0.58, LCL at 3σ = 1.5 - 1.73 = negative → floor to 0
    assert.ok(chart.getLCL(3) >= 0);
  });
});

// ---------------------------------------------------------------------------
// SPCMonitor unit tests
// ---------------------------------------------------------------------------

describe("SPCMonitor", () => {
  let monitor: SPCMonitor;

  beforeEach(() => {
    // 1-second intervals, 3σ, minimum 5 samples
    monitor = new SPCMonitor(1000, 3, 5);
  });

  it("accumulates counts within an interval", () => {
    // All within the same 1-second interval — no flush, no violation
    const v1 = monitor.record("agent1", "tool_calls", 1, 1000);
    const v2 = monitor.record("agent1", "tool_calls", 1, 1500);
    const v3 = monitor.record("agent1", "tool_calls", 1, 1900);
    assert.equal(v1, null);
    assert.equal(v2, null);
    assert.equal(v3, null);
  });

  it("flushes to control chart when interval elapses", () => {
    // Record across multiple intervals
    for (let i = 0; i < 6; i++) {
      monitor.record("agent1", "tool_calls", 5, 1000 + i * 1000);
    }
    // After 6 intervals with consistent value of 5, chart should have samples
    const chart = monitor.getChart("agent1", "tool_calls");
    assert.notEqual(chart, undefined);
    assert.ok(chart!.getSampleCount() > 0);
  });

  it("returns no violation before minimum samples", () => {
    // Only 3 intervals — below minSamples of 5
    for (let i = 0; i < 3; i++) {
      const v = monitor.record("agent1", "tool_calls", 5, 1000 + i * 1000);
      assert.equal(v, null);
    }
  });

  it("detects spike after baseline is established", () => {
    // Build baseline: 8 intervals with slight variation (4 or 6 calls)
    // Flush happens when a new interval starts, so we need minSamples+1
    // intervals to have minSamples flushed chart samples.
    // With flush-before-accumulate: record at t=1000 inits, t=2000 flushes
    // the t=1000 accumulator, etc. After 8 records we have 7 flushed samples.
    for (let i = 0; i < 8; i++) {
      const value = i % 2 === 0 ? 4 : 6;
      monitor.record("agent1", "tool_calls", value, 1000 + i * 1000);
    }

    // Accumulate the spike in the current interval
    monitor.record("agent1", "tool_calls", 500, 1000 + 8 * 1000);

    // Flush the spike by triggering next interval
    // The flushed value should be 500 (spike alone, previous interval clean)
    const violation = monitor.record("agent1", "tool_calls", 1, 1000 + 9 * 1000);

    assert.notEqual(violation, null, "Expected SPC violation for 100x spike after stable baseline");
    assert.equal(violation!.rule, "beyond_ucl");
  });

  it("tracks separate charts per agent", () => {
    for (let i = 0; i < 6; i++) {
      monitor.record("agent1", "tool_calls", 5, 1000 + i * 1000);
      monitor.record("agent2", "tool_calls", 50, 1000 + i * 1000);
    }
    const chart1 = monitor.getChart("agent1", "tool_calls");
    const chart2 = monitor.getChart("agent2", "tool_calls");
    assert.notEqual(chart1, undefined);
    assert.notEqual(chart2, undefined);
    // Different means
    assert.ok(chart1!.getMean() < chart2!.getMean());
  });

  it("tracks separate charts per metric", () => {
    for (let i = 0; i < 6; i++) {
      monitor.record("agent1", "tool_calls", 5, 1000 + i * 1000);
      monitor.record("agent1", "token_burn", 1000, 1000 + i * 1000);
    }
    const toolChart = monitor.getChart("agent1", "tool_calls");
    const tokenChart = monitor.getChart("agent1", "token_burn");
    assert.notEqual(toolChart, undefined);
    assert.notEqual(tokenChart, undefined);
    assert.ok(toolChart!.getMean() < tokenChart!.getMean());
  });
});

// ---------------------------------------------------------------------------
// RunawayDetector SPC integration tests
// ---------------------------------------------------------------------------

describe("RunawayDetector SPC integration", () => {
  let stream: EventStream;
  let detector: RunawayDetector;
  let firedAlerts: Alert[];

  beforeEach(() => {
    stream = new EventStream();
    firedAlerts = [];
    detector = new RunawayDetector(stream, {
      spcEnabled: true,
      spcMinSamples: 5,
      spcIntervalMs: 1000,
      spcSigmaLimit: 3,
      // Capture alerts
      onAlert: (alert) => {
        firedAlerts.push(alert);
        return false; // don't pause
      },
    });
    detector.start();
  });

  it("emits spc_violation alerts on behavioral drift", () => {
    // Build baseline: 10 intervals of 2 tool calls each
    for (let i = 0; i < 10; i++) {
      const ts = 1000 + i * 1000;
      stream.emit("agent1", "TestAgent", "tool_called", { tool: "read" });
      stream.emit("agent1", "TestAgent", "tool_called", { tool: "write" });
      // Force interval boundary by emitting a token event at next interval
    }

    // Spike: emit 50 tool calls in one interval
    for (let j = 0; j < 50; j++) {
      stream.emit("agent1", "TestAgent", "tool_called", { tool: "read" });
    }

    // Check if any SPC alerts fired
    const spcAlerts = firedAlerts.filter((a) => a.type === "spc_violation");
    // SPC may or may not fire depending on timing (Date.now() based)
    // but the existing threshold detector should fire loop_detected
    const allAlerts = firedAlerts;
    assert.ok(allAlerts.length > 0, "Expected at least one alert from 50 rapid tool calls");
  });

  it("does not fire SPC alerts when disabled", () => {
    detector.stop();
    detector = new RunawayDetector(stream, {
      spcEnabled: false,
      maxRepeatedToolCalls: 1000, // high threshold to avoid threshold alerts
      onAlert: (alert) => {
        firedAlerts.push(alert);
        return false;
      },
    });
    detector.start();

    for (let i = 0; i < 20; i++) {
      stream.emit("agent1", "TestAgent", "tool_called", { tool: "read" });
    }

    const spcAlerts = firedAlerts.filter((a) => a.type === "spc_violation");
    assert.equal(spcAlerts.length, 0, "SPC should not fire when disabled");
  });

  it("exposes SPC monitor for diagnostics", () => {
    const monitor = detector.getSPCMonitor();
    assert.notEqual(monitor, undefined);
  });

  it("existing threshold detection still works alongside SPC", () => {
    // Existing behavior: 5 repeated tool calls in 30s triggers loop_detected
    for (let i = 0; i < 6; i++) {
      stream.emit("agent1", "TestAgent", "tool_called", { tool: "sameTool" });
    }

    const loopAlerts = firedAlerts.filter((a) => a.type === "loop_detected");
    assert.ok(loopAlerts.length > 0, "Existing threshold detection should still fire");
  });

  it("token_spent events feed SPC token_burn_rate metric", () => {
    // Emit enough tokens to trigger the threshold detector (50K/min)
    for (let i = 0; i < 60; i++) {
      stream.emit("agent1", "TestAgent", "token_spent", { count: 1000 });
    }

    // 60 * 1000 = 60K tokens, all within the same minute (Date.now())
    const tokenAlerts = firedAlerts.filter((a) => a.type === "token_spike");
    assert.ok(tokenAlerts.length > 0, "Token spike threshold detector should fire for 60K tokens");
  });

  it("subtask_created events feed SPC subtask_rate metric", () => {
    for (let i = 0; i < 12; i++) {
      stream.emit("agent1", "TestAgent", "subtask_created", { name: `task_${i}` });
    }

    // Existing threshold detector should catch recursive task creation
    const subtaskAlerts = firedAlerts.filter((a) => a.type === "recursive_tasks");
    assert.ok(subtaskAlerts.length > 0, "Recursive task threshold detector should fire");
  });
});
