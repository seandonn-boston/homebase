/**
 * Tests for MetricsCollector (OB-03)
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MetricsCollector } from "./metrics";

describe("MetricsCollector", () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it("records hook executions with latency and result", () => {
    metrics.recordHookExecution("zero_trust_validator", 15, "pass");
    metrics.recordHookExecution("zero_trust_validator", 25, "pass");
    metrics.recordHookExecution("zero_trust_validator", 150, "fail");

    const stats = metrics.hookLatency["zero_trust_validator"].getStats();
    assert.strictEqual(stats.count, 3);
    assert.strictEqual(stats.sum, 190);

    assert.strictEqual(metrics.hookResults.get({ hook: "zero_trust_validator", result: "pass" }), 2);
    assert.strictEqual(metrics.hookResults.get({ hook: "zero_trust_validator", result: "fail" }), 1);
  });

  it("records events by type", () => {
    metrics.recordEvent("tool_called");
    metrics.recordEvent("tool_called");
    metrics.recordEvent("task_completed");

    assert.strictEqual(metrics.eventThroughput.get({ type: "tool_called" }), 2);
    assert.strictEqual(metrics.eventThroughput.get({ type: "task_completed" }), 1);
  });

  it("records brain query latency", () => {
    metrics.recordBrainQuery(50);
    metrics.recordBrainQuery(200);

    const stats = metrics.brainQueryLatency.getStats();
    assert.strictEqual(stats.count, 2);
    assert.strictEqual(stats.sum, 250);
  });

  it("tracks gauges correctly", () => {
    metrics.activeSessions.set(5);
    assert.strictEqual(metrics.activeSessions.get(), 5);

    metrics.activeSessions.inc();
    assert.strictEqual(metrics.activeSessions.get(), 6);

    metrics.activeSessions.dec(2);
    assert.strictEqual(metrics.activeSessions.get(), 4);
  });

  it("renders Prometheus exposition format", () => {
    metrics.recordHookExecution("test_hook", 10, "pass");
    metrics.recordEvent("tool_called");
    metrics.activeSessions.set(3);

    const output = metrics.toPrometheus();

    assert.ok(output.includes("# HELP admiral_hook_duration_ms"));
    assert.ok(output.includes("# TYPE admiral_hook_duration_ms histogram"));
    assert.ok(output.includes('admiral_hook_duration_ms_bucket{hook="test_hook"'));
    assert.ok(output.includes("# HELP admiral_hook_results_total"));
    assert.ok(output.includes('admiral_hook_results_total{hook="test_hook",result="pass"} 1'));
    assert.ok(output.includes('admiral_events_total{type="tool_called"} 1'));
    assert.ok(output.includes("admiral_active_sessions 3"));
  });

  it("histogram buckets are cumulative", () => {
    metrics.recordHookExecution("h", 5, "pass");   // fits in 5ms bucket
    metrics.recordHookExecution("h", 50, "pass");  // fits in 50ms bucket
    metrics.recordHookExecution("h", 500, "pass"); // fits in 500ms bucket

    const stats = metrics.hookLatency["h"].getStats();
    const bucket5 = stats.buckets.find(b => b.le === 5);
    const bucket50 = stats.buckets.find(b => b.le === 50);
    const bucket500 = stats.buckets.find(b => b.le === 500);

    assert.strictEqual(bucket5?.count, 1);
    assert.strictEqual(bucket50?.count, 2);  // cumulative: 5ms + 50ms
    assert.strictEqual(bucket500?.count, 3); // cumulative: all three
  });

  it("records API requests with endpoint and status", () => {
    metrics.recordApiRequest("/health", 5, 200);
    metrics.recordApiRequest("/health", 3, 200);
    metrics.recordApiRequest("/api/events", 15, 200);

    assert.strictEqual(metrics.apiRequests.get({ endpoint: "/health", status: "200" }), 2);
    assert.strictEqual(metrics.apiRequests.get({ endpoint: "/api/events", status: "200" }), 1);
  });
});
