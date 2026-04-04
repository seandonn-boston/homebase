/**
 * Tests for Agent Performance Profiler (IF-05)
 */

import { beforeEach, describe, expect, it } from "vitest";
import { AgentProfiler } from "./agent-profiler";

const makeSample = (overrides: Partial<Parameters<AgentProfiler["record"]>[1]> = {}) => ({
  taskId: "task-1",
  tokensUsed: { input: 1000, output: 500, total: 1500 },
  durationMs: 3000,
  revisions: 1,
  qualityScore: 0.9,
  authorityTier: 2,
  brainQueries: 4,
  brainHits: 3,
  ...overrides,
});

describe("AgentProfiler", () => {
  let profiler: AgentProfiler;

  beforeEach(() => {
    profiler = new AgentProfiler();
  });

  it("records samples and lists agents", () => {
    profiler.record("agent-a", makeSample());
    profiler.record("agent-b", makeSample());
    expect(profiler.listAgents()).toEqual(["agent-a", "agent-b"]);
  });

  it("generates a summary with correct averages", () => {
    profiler.record("a1", makeSample({ qualityScore: 0.8 }));
    profiler.record("a1", makeSample({ qualityScore: 1.0 }));
    const summary = profiler.summarize("a1");
    expect(summary).toBeDefined();
    expect(summary!.sampleCount).toBe(2);
    expect(summary!.qualityRate).toBe(0.9);
    expect(summary!.avgTokensPerTask).toBe(1500);
  });

  it("calculates brain query effectiveness", () => {
    profiler.record("a1", makeSample({ brainQueries: 10, brainHits: 7 }));
    const summary = profiler.summarize("a1");
    expect(summary!.brainQueryEffectiveness).toBe(0.7);
  });

  it("computes authority tier distribution", () => {
    profiler.record("a1", makeSample({ authorityTier: 1 }));
    profiler.record("a1", makeSample({ authorityTier: 1 }));
    profiler.record("a1", makeSample({ authorityTier: 3 }));
    const summary = profiler.summarize("a1");
    expect(summary!.authorityTierDistribution).toEqual({ 1: 2, 3: 1 });
  });

  it("returns recent samples", () => {
    for (let i = 0; i < 5; i++) {
      profiler.record("a1", makeSample({ taskId: `t-${i}` }));
    }
    const recent = profiler.recentSamples("a1", 2);
    expect(recent).toHaveLength(2);
    expect(recent[0].taskId).toBe("t-3");
  });

  it("compares two agents", () => {
    profiler.record("a1", makeSample({ qualityScore: 0.95 }));
    profiler.record("a2", makeSample({ qualityScore: 0.75 }));
    const cmp = profiler.compare("a1", "a2");
    expect(cmp).toBeDefined();
    expect(cmp!.a.qualityRate).toBeGreaterThan(cmp!.b.qualityRate);
  });

  it("returns undefined for unknown agents", () => {
    expect(profiler.summarize("unknown")).toBeUndefined();
    expect(profiler.compare("a", "b")).toBeUndefined();
  });

  it("clears agent data", () => {
    profiler.record("a1", makeSample());
    profiler.clear("a1");
    expect(profiler.summarize("a1")).toBeUndefined();
  });
});
