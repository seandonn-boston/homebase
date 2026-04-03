/**
 * Tests for Cost Optimization Engine (IF-06)
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { ModelTier, TaskProfile } from "./cost-optimizer";
import { CostOptimizer } from "./cost-optimizer";

const TIERS: ModelTier[] = [
  {
    id: "cheap",
    name: "Cheap",
    costPer1kTokens: 0.1,
    qualityRating: 0.6,
    maxContext: 16_000,
    latencyMs: 100,
  },
  {
    id: "mid",
    name: "Mid",
    costPer1kTokens: 1.0,
    qualityRating: 0.85,
    maxContext: 64_000,
    latencyMs: 400,
  },
  {
    id: "top",
    name: "Top",
    costPer1kTokens: 5.0,
    qualityRating: 0.98,
    maxContext: 200_000,
    latencyMs: 1200,
  },
];

const makeTask = (overrides: Partial<TaskProfile> = {}): TaskProfile => ({
  taskId: "t-1",
  complexity: "medium",
  estimatedTokens: 5000,
  requiresLargeContext: false,
  qualityThreshold: 0.7,
  ...overrides,
});

describe("CostOptimizer", () => {
  let optimizer: CostOptimizer;

  beforeEach(() => {
    optimizer = new CostOptimizer([...TIERS]);
  });

  it("recommends cheapest tier for minimize-cost", () => {
    const rec = optimizer.recommend(makeTask(), "minimize-cost");
    expect(rec.recommendedTier).toBe("cheap");
  });

  it("recommends best tier for maximize-quality", () => {
    const rec = optimizer.recommend(makeTask(), "maximize-quality");
    expect(rec.recommendedTier).toBe("top");
  });

  it("recommends balanced tier by value ratio", () => {
    const rec = optimizer.recommend(makeTask(), "balanced");
    // cheap: 0.6/0.1=6, mid: 0.85/1=0.85, top: 0.98/5=0.196 — cheap wins on ratio
    expect(rec.recommendedTier).toBe("cheap");
  });

  it("filters tiers below quality threshold", () => {
    const rec = optimizer.recommend(makeTask({ qualityThreshold: 0.9 }), "minimize-cost");
    expect(rec.recommendedTier).toBe("top");
  });

  it("filters tiers with insufficient context", () => {
    const rec = optimizer.recommend(
      makeTask({ requiresLargeContext: true, estimatedTokens: 100_000 }),
      "minimize-cost",
    );
    expect(rec.recommendedTier).toBe("top");
  });

  it("records outcomes and calculates savings", () => {
    optimizer.recommend(makeTask({ taskId: "t-1" }), "minimize-cost");
    optimizer.recordOutcome("t-1", "cheap", 5000, 0.7);
    const savings = optimizer.calculateSavings();
    expect(savings.totalActual).toBeLessThan(savings.totalBaseline);
    expect(savings.saved).toBeGreaterThan(0);
  });

  it("tracks recommendation accuracy", () => {
    optimizer.recommend(makeTask({ taskId: "t-1" }), "minimize-cost");
    optimizer.recordOutcome("t-1", "cheap", 5000, 0.7); // matched
    optimizer.recordOutcome("t-2", "top", 5000, 0.9); // not matched (no rec for t-2 with top)
    expect(optimizer.accuracy()).toBe(0.5);
  });

  it("estimates cost correctly", () => {
    const rec = optimizer.recommend(makeTask({ estimatedTokens: 10_000 }), "minimize-cost");
    // cheap: 10k/1k * 0.1 = 1.0
    expect(rec.estimatedCost).toBe(1.0);
  });
});
