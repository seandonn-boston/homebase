/**
 * Tests for BehaviorMonitor (M-10).
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { BehaviorMonitor } from "./behavior-monitor.js";

describe("BehaviorMonitor", () => {
  it("starts with no baselines", () => {
    const monitor = new BehaviorMonitor();
    assert.equal(monitor.getBaseline("srv-1", "tool-a"), undefined);
  });

  it("builds a baseline from observations", () => {
    const monitor = new BehaviorMonitor();
    for (let i = 0; i < 10; i++) {
      monitor.recordObservation("srv-1", "tool-a", {
        responseSize: 100,
        latencyMs: 50,
        egressBytes: 200,
        error: false,
      });
    }
    const baseline = monitor.getBaseline("srv-1", "tool-a");
    assert.ok(baseline !== undefined);
    assert.equal(baseline.sampleCount, 10);
    assert.ok(Math.abs(baseline.avgResponseSize - 100) < 1);
    assert.ok(Math.abs(baseline.avgLatencyMs - 50) < 1);
    assert.equal(baseline.errorRate, 0);
  });

  it("tracks error rate in baseline", () => {
    const monitor = new BehaviorMonitor();
    for (let i = 0; i < 8; i++) {
      monitor.recordObservation("srv-1", "tool-a", {
        responseSize: 100,
        latencyMs: 50,
        egressBytes: 200,
        error: false,
      });
    }
    for (let i = 0; i < 2; i++) {
      monitor.recordObservation("srv-1", "tool-a", {
        responseSize: 100,
        latencyMs: 50,
        egressBytes: 200,
        error: true,
      });
    }
    const baseline = monitor.getBaseline("srv-1", "tool-a")!;
    assert.ok(Math.abs(baseline.errorRate - 0.2) < 0.01);
  });

  it("detects response size anomaly", () => {
    const monitor = new BehaviorMonitor(2.0); // lower threshold for testing
    // Build stable baseline with slight variance so stddev > 0
    for (let i = 0; i < 20; i++) {
      monitor.recordObservation("srv-1", "tool-a", {
        responseSize: 100 + (i % 2),
        latencyMs: 50 + (i % 2),
        egressBytes: 200 + (i % 2),
        error: false,
      });
    }
    // Inject anomaly
    monitor.recordObservation("srv-1", "tool-a", {
      responseSize: 100000,
      latencyMs: 50,
      egressBytes: 200,
      error: false,
    });
    const anomalies = monitor.checkAnomalies("srv-1", "tool-a");
    assert.ok(anomalies.length > 0);
    assert.ok(anomalies.some((a) => a.type === "response_size"));
  });

  it("detects latency anomaly", () => {
    const monitor = new BehaviorMonitor(2.0);
    for (let i = 0; i < 20; i++) {
      monitor.recordObservation("srv-1", "tool-a", {
        responseSize: 100 + (i % 2),
        latencyMs: 50 + (i % 2),
        egressBytes: 200 + (i % 2),
        error: false,
      });
    }
    monitor.recordObservation("srv-1", "tool-a", {
      responseSize: 100,
      latencyMs: 50000,
      egressBytes: 200,
      error: false,
    });
    const anomalies = monitor.checkAnomalies("srv-1", "tool-a");
    assert.ok(anomalies.some((a) => a.type === "latency"));
  });

  it("detects exfiltration anomaly via egress bytes", () => {
    const monitor = new BehaviorMonitor(2.0);
    for (let i = 0; i < 20; i++) {
      monitor.recordObservation("srv-1", "tool-a", {
        responseSize: 100 + (i % 2),
        latencyMs: 50 + (i % 2),
        egressBytes: 200 + (i % 2),
        error: false,
      });
    }
    monitor.recordObservation("srv-1", "tool-a", {
      responseSize: 100,
      latencyMs: 50,
      egressBytes: 200000,
      error: false,
    });
    const anomalies = monitor.checkAnomalies("srv-1", "tool-a");
    assert.ok(anomalies.some((a) => a.type === "exfiltration"));
  });

  it("does not flag anomalies within threshold", () => {
    const monitor = new BehaviorMonitor(3.0);
    for (let i = 0; i < 20; i++) {
      monitor.recordObservation("srv-1", "tool-a", {
        responseSize: 100 + (i % 3),
        latencyMs: 50 + (i % 2),
        egressBytes: 200,
        error: false,
      });
    }
    // Slightly elevated but within 3 sigma
    monitor.recordObservation("srv-1", "tool-a", {
      responseSize: 103,
      latencyMs: 52,
      egressBytes: 201,
      error: false,
    });
    const anomalies = monitor.checkAnomalies("srv-1", "tool-a");
    assert.equal(anomalies.length, 0);
  });

  it("resets baseline for a server", () => {
    const monitor = new BehaviorMonitor();
    for (let i = 0; i < 10; i++) {
      monitor.recordObservation("srv-1", "tool-a", {
        responseSize: 100,
        latencyMs: 50,
        egressBytes: 200,
        error: false,
      });
    }
    monitor.resetBaseline("srv-1");
    assert.equal(monitor.getBaseline("srv-1", "tool-a"), undefined);
  });

  it("getAllAnomalies returns all anomalies across servers", () => {
    const monitor = new BehaviorMonitor(2.0);
    for (let i = 0; i < 20; i++) {
      monitor.recordObservation("srv-1", "tool-a", {
        responseSize: 100 + (i % 2),
        latencyMs: 50 + (i % 2),
        egressBytes: 200 + (i % 2),
        error: false,
      });
    }
    monitor.recordObservation("srv-1", "tool-a", {
      responseSize: 100000,
      latencyMs: 50,
      egressBytes: 200,
      error: false,
    });
    assert.ok(monitor.getAllAnomalies().length > 0);
  });

  it("isolates baselines between different servers/tools", () => {
    const monitor = new BehaviorMonitor();
    monitor.recordObservation("srv-1", "tool-a", {
      responseSize: 100,
      latencyMs: 50,
      egressBytes: 200,
      error: false,
    });
    monitor.recordObservation("srv-2", "tool-b", {
      responseSize: 500,
      latencyMs: 100,
      egressBytes: 1000,
      error: false,
    });
    const b1 = monitor.getBaseline("srv-1", "tool-a")!;
    const b2 = monitor.getBaseline("srv-2", "tool-b")!;
    assert.ok(Math.abs(b1.avgResponseSize - 100) < 1);
    assert.ok(Math.abs(b2.avgResponseSize - 500) < 1);
  });
});
