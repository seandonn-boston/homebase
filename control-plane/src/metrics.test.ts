/**
 * Tests for MetricsCollector (OB-03)
 */

import { describe, it, expect, beforeEach } from "vitest";
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
    expect(stats.count).toBe(3);
    expect(stats.sum).toBe(190);

    expect(metrics.hookResults.get({ hook: "zero_trust_validator", result: "pass" })).toBe(2);
    expect(metrics.hookResults.get({ hook: "zero_trust_validator", result: "fail" })).toBe(1);
  });

  it("records events by type", () => {
    metrics.recordEvent("tool_called");
    metrics.recordEvent("tool_called");
    metrics.recordEvent("task_completed");

    expect(metrics.eventThroughput.get({ type: "tool_called" })).toBe(2);
    expect(metrics.eventThroughput.get({ type: "task_completed" })).toBe(1);
  });

  it("records brain query latency", () => {
    metrics.recordBrainQuery(50);
    metrics.recordBrainQuery(200);

    const stats = metrics.brainQueryLatency.getStats();
    expect(stats.count).toBe(2);
    expect(stats.sum).toBe(250);
  });

  it("tracks gauges correctly", () => {
    metrics.activeSessions.set(5);
    expect(metrics.activeSessions.get()).toBe(5);

    metrics.activeSessions.inc();
    expect(metrics.activeSessions.get()).toBe(6);

    metrics.activeSessions.dec(2);
    expect(metrics.activeSessions.get()).toBe(4);
  });

  it("renders Prometheus exposition format", () => {
    metrics.recordHookExecution("test_hook", 10, "pass");
    metrics.recordEvent("tool_called");
    metrics.activeSessions.set(3);

    const output = metrics.toPrometheus();

    expect(output).toContain("# HELP admiral_hook_duration_ms");
    expect(output).toContain("# TYPE admiral_hook_duration_ms histogram");
    expect(output).toContain('admiral_hook_duration_ms_bucket{hook="test_hook"');
    expect(output).toContain("# HELP admiral_hook_results_total");
    expect(output).toContain('admiral_hook_results_total{hook="test_hook",result="pass"} 1');
    expect(output).toContain('admiral_events_total{type="tool_called"} 1');
    expect(output).toContain("admiral_active_sessions 3");
  });

  it("histogram buckets are cumulative", () => {
    metrics.recordHookExecution("h", 5, "pass");   // fits in 5ms bucket
    metrics.recordHookExecution("h", 50, "pass");  // fits in 50ms bucket
    metrics.recordHookExecution("h", 500, "pass"); // fits in 500ms bucket

    const stats = metrics.hookLatency["h"].getStats();
    const bucket5 = stats.buckets.find(b => b.le === 5);
    const bucket50 = stats.buckets.find(b => b.le === 50);
    const bucket500 = stats.buckets.find(b => b.le === 500);

    expect(bucket5?.count).toBe(1);
    expect(bucket50?.count).toBe(2);  // cumulative: 5ms + 50ms
    expect(bucket500?.count).toBe(3); // cumulative: all three
  });

  it("records API requests with endpoint and status", () => {
    metrics.recordApiRequest("/health", 5, 200);
    metrics.recordApiRequest("/health", 3, 200);
    metrics.recordApiRequest("/api/events", 15, 200);

    expect(metrics.apiRequests.get({ endpoint: "/health", status: "200" })).toBe(2);
    expect(metrics.apiRequests.get({ endpoint: "/api/events", status: "200" })).toBe(1);
  });
});
