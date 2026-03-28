/**
 * Tests for SLO/SLI Tracker (OB-08)
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { CORE_SLIS, SLOTracker } from "./slo-tracker";

describe("SLOTracker", () => {
  let tracker: SLOTracker;

  beforeEach(() => {
    tracker = new SLOTracker();
  });

  it("initializes with core SLIs and SLOs", () => {
    const status = tracker.getAllStatus();
    assert.strictEqual(status.length, CORE_SLIS.length);
  });

  it("tracks good observations (below threshold)", () => {
    tracker.observe("hook_latency_p99", 50); // good (< 100ms)
    tracker.observe("hook_latency_p99", 80); // good
    tracker.observe("hook_latency_p99", 150); // bad (> 100ms)

    const status = tracker.getStatus("hook_latency_p99");
    assert.ok(status !== null);
    assert.strictEqual(status!.observationCount, 3);
    assert.ok(Math.abs(status!.current - 2 / 3) < 0.001);
  });

  it("tracks good observations (above threshold)", () => {
    tracker.observe("first_pass_quality", 0.8); // good (> 0.75)
    tracker.observe("first_pass_quality", 0.6); // bad
    tracker.observe("first_pass_quality", 0.9); // good

    const status = tracker.getStatus("first_pass_quality");
    assert.ok(Math.abs(status!.current - 2 / 3) < 0.001);
  });

  it("calculates error budget correctly", () => {
    // Custom tracker with known SLO
    const t = new SLOTracker(
      [
        {
          name: "test",
          description: "test",
          unit: "ms",
          goodThreshold: 100,
          direction: "below",
        },
      ],
      [{ sli: "test", target: 0.99, windowMs: 86400000 }],
    );

    // 100 observations, 98 good = 98% (below 99% target)
    for (let i = 0; i < 98; i++) t.observe("test", 50);
    for (let i = 0; i < 2; i++) t.observe("test", 200);

    const status = t.getStatus("test");
    assert.ok(Math.abs(status!.current - 0.98) < 0.001);
    assert.strictEqual(status!.inViolation, true);
    assert.strictEqual(status!.errorBudgetConsumedPct, 100); // Capped at 100%
  });

  it("returns empty status for unknown SLI", () => {
    assert.strictEqual(tracker.getStatus("nonexistent"), null);
  });

  it("ignores observations for unknown SLIs", () => {
    tracker.observe("nonexistent", 42);
    assert.strictEqual(tracker.getStatus("nonexistent"), null);
  });

  it("reports no violation when no observations", () => {
    const status = tracker.getStatus("hook_latency_p99");
    assert.strictEqual(status!.inViolation, false);
    assert.strictEqual(status!.current, 1);
  });

  it("prunes old observations", () => {
    const t = new SLOTracker(
      [
        {
          name: "test",
          description: "test",
          unit: "ms",
          goodThreshold: 100,
          direction: "below",
        },
      ],
      [{ sli: "test", target: 0.99, windowMs: 100 }],
    );

    t.observe("test", 50);
    // Manually age the observation
    // biome-ignore lint/suspicious/noExplicitAny: accessing private field for test
    const obs = (t as any).observations.get("test");
    obs[0].timestamp = Date.now() - 200;

    const pruned = t.prune();
    assert.strictEqual(pruned, 1);
  });
});
