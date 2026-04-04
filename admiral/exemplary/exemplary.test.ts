/**
 * Tests for Stream 13 Exemplary Codebase tools
 * X-01 (Simulation), X-04 (Profiling), X-07 (Event Log),
 * X-08 (API Docs), X-09 (License), X-16 (Git Audit), X-17 (Doc Coverage)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { normalize, hashOutput, runSimulation, type HookEvent } from "./simulation-testing";
import { HookProfiler } from "./hook-profiling";
import { UnifiedEventLog } from "./unified-event-log";
import { extractApiEndpoints, generateApiDocs, auditGitHistory, checkDocCoverage } from "./code-quality-tools";

const PROJECT_ROOT = join(__dirname, "../..");

// ---------------------------------------------------------------------------
// X-01: Simulation Testing
// ---------------------------------------------------------------------------

describe("X-01: Simulation Testing", () => {
  it("normalizes timestamps and UUIDs", () => {
    const input = "Event at 2026-03-27T12:00:00.000Z with id a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const normalized = normalize(input);
    assert.ok(normalized.includes("<TIMESTAMP>"));
    assert.ok(normalized.includes("<UUID>"));
    assert.ok(!normalized.includes("2026"));
  });

  it("produces stable hash for normalized output", () => {
    const a = hashOutput("Event at 2026-03-27T12:00:00Z done");
    const b = hashOutput("Event at 2026-03-28T15:30:00Z done");
    assert.equal(a, b);
  });

  it("runs simulation and detects determinism", () => {
    const events: HookEvent[] = [
      { hookName: "pre_tool", payload: { tool: "Read" }, expectedOutput: "ALLOW" },
      { hookName: "post_tool", payload: { tool: "Read" }, expectedOutput: "OK" },
    ];
    const result = runSimulation(events, () => "ALLOW");
    // First event matches, second diverges
    assert.equal(result.totalEvents, 2);
    assert.equal(result.matched, 1);
    assert.equal(result.diverged, 1);
    assert.equal(result.deterministic, false);
  });

  it("reports deterministic when all match", () => {
    const events: HookEvent[] = [
      { hookName: "h1", payload: {}, expectedOutput: "OK" },
      { hookName: "h2", payload: {}, expectedOutput: "OK" },
    ];
    const result = runSimulation(events, () => "OK");
    assert.equal(result.deterministic, true);
  });
});

// ---------------------------------------------------------------------------
// X-04: Hook Profiling
// ---------------------------------------------------------------------------

describe("X-04: Hook Profiling", () => {
  it("records timings and computes percentiles", () => {
    const profiler = new HookProfiler(50);
    for (let i = 1; i <= 100; i++) {
      profiler.record({ hookName: "test_hook", latencyMs: i, subprocessCalls: i % 3, timestamp: new Date().toISOString() });
    }
    const profile = profiler.profile("test_hook");
    assert.ok(profile);
    assert.equal(profile!.sampleCount, 100);
    assert.equal(profile!.p50, 50);
    assert.ok(profile!.p95 >= 95);
    assert.ok(profile!.p99 >= 99);
    assert.equal(profile!.bottleneck, true); // p99 > 50ms threshold
  });

  it("generates report with recommendations", () => {
    const profiler = new HookProfiler(10);
    for (let i = 0; i < 20; i++) {
      profiler.record({ hookName: "slow_hook", latencyMs: 50 + i, subprocessCalls: 3, timestamp: new Date().toISOString() });
      profiler.record({ hookName: "fast_hook", latencyMs: 2, subprocessCalls: 0, timestamp: new Date().toISOString() });
    }
    const report = profiler.generateReport();
    assert.equal(report.hooks.length, 2);
    assert.equal(report.slowestHook, "slow_hook");
    assert.ok(report.recommendations.length > 0);
  });
});

// ---------------------------------------------------------------------------
// X-07: Unified Event Log
// ---------------------------------------------------------------------------

describe("X-07: Unified Event Log", () => {
  it("appends and queries events", () => {
    const log = new UnifiedEventLog();
    log.append({ source: "hook", eventType: "pre_tool", sessionId: "s1", agentId: "a1", data: {} });
    log.append({ source: "control-plane", eventType: "alert", sessionId: "s1", agentId: null, data: {} });
    log.append({ source: "brain", eventType: "query", sessionId: "s2", agentId: "a2", data: {} });

    assert.equal(log.getCount(), 3);
    assert.equal(log.query({ source: "hook" }).length, 1);
    assert.equal(log.query({ sessionId: "s1" }).length, 2);
  });

  it("respects max in-memory limit", () => {
    const log = new UnifiedEventLog(undefined, 5);
    for (let i = 0; i < 10; i++) {
      log.append({ source: "hook", eventType: `e${i}`, sessionId: "s1", agentId: null, data: {} });
    }
    assert.equal(log.getCount(), 5);
  });
});

// ---------------------------------------------------------------------------
// X-08: API Documentation
// ---------------------------------------------------------------------------

describe("X-08: API Documentation", () => {
  it("extracts endpoints from api-server.ts", () => {
    const serverPath = join(PROJECT_ROOT, "admiral", "governance", "api-server.ts");
    const endpoints = extractApiEndpoints(serverPath);
    assert.ok(endpoints.length >= 10, `expected >=10 endpoints, got ${endpoints.length}`);
  });

  it("generates markdown docs", () => {
    const endpoints = [
      { method: "GET", path: "/health", description: "Health check" },
      { method: "GET", path: "/api/v1/policies", description: "List policies" },
    ];
    const md = generateApiDocs(endpoints);
    assert.ok(md.includes("# API Documentation"));
    assert.ok(md.includes("| GET |"));
  });
});

// ---------------------------------------------------------------------------
// X-16: Git History Audit
// ---------------------------------------------------------------------------

describe("X-16: Git History Audit", () => {
  it("audits git history", () => {
    const result = auditGitHistory(PROJECT_ROOT, 50);
    assert.ok(result.totalCommits > 0);
    assert.ok(result.conventionalRate >= 0);
    assert.equal(typeof result.score, "number");
  });
});

// ---------------------------------------------------------------------------
// X-17: Documentation Coverage
// ---------------------------------------------------------------------------

describe("X-17: Documentation Coverage", () => {
  it("checks TypeScript doc coverage", () => {
    const result = checkDocCoverage(join(PROJECT_ROOT, "admiral", "rating"), ".ts");
    assert.ok(result.totalFiles > 0);
    assert.ok(result.coveragePercent >= 0);
  });
});
