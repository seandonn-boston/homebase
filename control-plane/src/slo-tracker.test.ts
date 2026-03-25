/**
 * Tests for SLO/SLI Tracker (OB-08)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SLOTracker, CORE_SLIS, CORE_SLOS } from "./slo-tracker";

describe("SLOTracker", () => {
  let tracker: SLOTracker;

  beforeEach(() => {
    tracker = new SLOTracker();
  });

  it("initializes with core SLIs and SLOs", () => {
    const status = tracker.getAllStatus();
    expect(status.length).toBe(CORE_SLIS.length);
  });

  it("tracks good observations (below threshold)", () => {
    tracker.observe("hook_latency_p99", 50); // good (< 100ms)
    tracker.observe("hook_latency_p99", 80); // good
    tracker.observe("hook_latency_p99", 150); // bad (> 100ms)

    const status = tracker.getStatus("hook_latency_p99");
    expect(status).not.toBeNull();
    expect(status!.observationCount).toBe(3);
    expect(status!.current).toBeCloseTo(2 / 3);
  });

  it("tracks good observations (above threshold)", () => {
    tracker.observe("first_pass_quality", 0.80); // good (> 0.75)
    tracker.observe("first_pass_quality", 0.60); // bad
    tracker.observe("first_pass_quality", 0.90); // good

    const status = tracker.getStatus("first_pass_quality");
    expect(status!.current).toBeCloseTo(2 / 3);
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
    expect(status!.current).toBeCloseTo(0.98);
    expect(status!.inViolation).toBe(true);
    expect(status!.errorBudgetConsumedPct).toBe(100); // Capped at 100%
  });

  it("returns empty status for unknown SLI", () => {
    expect(tracker.getStatus("nonexistent")).toBeNull();
  });

  it("ignores observations for unknown SLIs", () => {
    tracker.observe("nonexistent", 42);
    expect(tracker.getStatus("nonexistent")).toBeNull();
  });

  it("reports no violation when no observations", () => {
    const status = tracker.getStatus("hook_latency_p99");
    expect(status!.inViolation).toBe(false);
    expect(status!.current).toBe(1);
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
    const obs = (t as any).observations.get("test");
    obs[0].timestamp = Date.now() - 200;

    const pruned = t.prune();
    expect(pruned).toBe(1);
  });
});
