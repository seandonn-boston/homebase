/**
 * Tests for Admiral Result Aggregator (EX-05)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Session } from "./execution-runtime";
import { ResultAggregator } from "./result-aggregator";

function makeSession(overrides: Partial<Session> & { sessionId: string }): Session {
  return {
    agentId: "agent-1",
    agentName: "Agent One",
    taskId: "task-1",
    taskDescription: "Test",
    state: "complete",
    tokenBudget: 1000,
    wallClockTimeoutMs: 300000,
    maxFileWrites: 50,
    fileWriteCount: 5,
    tokensUsed: 200,
    createdAt: 1000,
    startedAt: 1100,
    completedAt: 2100,
    result: { status: "success" },
    metadata: {},
    ...overrides,
  };
}

describe("ResultAggregator — task summaries", () => {
  const aggregator = new ResultAggregator();

  it("summarizes a single-session task", () => {
    const sessions = [makeSession({ sessionId: "s1", taskId: "t1" })];
    const summary = aggregator.summarizeTask("t1", sessions);

    assert.equal(summary.taskId, "t1");
    assert.equal(summary.sessions.length, 1);
    assert.equal(summary.finalStatus, "success");
    assert.equal(summary.totalTokens, 200);
    assert.equal(summary.totalFileWrites, 5);
    assert.equal(summary.totalDuration, 1000); // 2100 - 1100
  });

  it("summarizes a multi-session task", () => {
    const sessions = [
      makeSession({ sessionId: "s1", taskId: "t1", tokensUsed: 100, fileWriteCount: 3 }),
      makeSession({ sessionId: "s2", taskId: "t1", tokensUsed: 200, fileWriteCount: 7 }),
    ];
    const summary = aggregator.summarizeTask("t1", sessions);

    assert.equal(summary.sessions.length, 2);
    assert.equal(summary.totalTokens, 300);
    assert.equal(summary.totalFileWrites, 10);
  });

  it("filters to correct task", () => {
    const sessions = [
      makeSession({ sessionId: "s1", taskId: "t1" }),
      makeSession({ sessionId: "s2", taskId: "t2" }),
    ];
    const summary = aggregator.summarizeTask("t1", sessions);
    assert.equal(summary.sessions.length, 1);
  });

  it("computes task status: success", () => {
    const sessions = [makeSession({ sessionId: "s1", taskId: "t1", state: "complete" })];
    assert.equal(aggregator.summarizeTask("t1", sessions).finalStatus, "success");
  });

  it("computes task status: failure", () => {
    const sessions = [
      makeSession({
        sessionId: "s1",
        taskId: "t1",
        state: "failed",
        result: { status: "failure", error: "err" },
      }),
    ];
    assert.equal(aggregator.summarizeTask("t1", sessions).finalStatus, "failure");
  });

  it("computes task status: partial", () => {
    const sessions = [
      makeSession({ sessionId: "s1", taskId: "t1", state: "complete" }),
      makeSession({
        sessionId: "s2",
        taskId: "t1",
        state: "failed",
        result: { status: "failure", error: "err" },
      }),
    ];
    assert.equal(aggregator.summarizeTask("t1", sessions).finalStatus, "partial");
  });

  it("computes task status: pending", () => {
    const sessions = [makeSession({ sessionId: "s1", taskId: "t1", state: "running" })];
    assert.equal(aggregator.summarizeTask("t1", sessions).finalStatus, "pending");
  });

  it("returns pending for empty sessions", () => {
    assert.equal(aggregator.summarizeTask("t1", []).finalStatus, "pending");
  });
});

describe("ResultAggregator — agent metrics", () => {
  const aggregator = new ResultAggregator();

  it("computes metrics for an agent", () => {
    const sessions = [
      makeSession({ sessionId: "s1", agentId: "a1", state: "complete", tokensUsed: 100 }),
      makeSession({ sessionId: "s2", agentId: "a1", state: "complete", tokensUsed: 300 }),
      makeSession({
        sessionId: "s3",
        agentId: "a1",
        state: "failed",
        tokensUsed: 50,
        result: { status: "failure", error: "err" },
      }),
    ];

    const metrics = aggregator.computeAgentMetrics("a1", sessions);

    assert.equal(metrics.agentId, "a1");
    assert.equal(metrics.totalSessions, 3);
    assert.equal(metrics.completedSessions, 2);
    assert.equal(metrics.failedSessions, 1);
    assert.ok(Math.abs(metrics.successRate - 2 / 3) < 0.001);
    assert.equal(metrics.totalTokensUsed, 450);
    assert.equal(metrics.avgTokensPerSession, 150);
  });

  it("returns zeros for unknown agent", () => {
    const metrics = aggregator.computeAgentMetrics("unknown", []);
    assert.equal(metrics.totalSessions, 0);
    assert.equal(metrics.successRate, 0);
  });

  it("computes all agent metrics", () => {
    const sessions = [
      makeSession({ sessionId: "s1", agentId: "a1" }),
      makeSession({ sessionId: "s2", agentId: "a2" }),
      makeSession({ sessionId: "s3", agentId: "a1" }),
    ];

    const allMetrics = aggregator.computeAllAgentMetrics(sessions);
    assert.equal(allMetrics.length, 2);

    const a1 = allMetrics.find((m) => m.agentId === "a1");
    assert.equal(a1!.totalSessions, 2);
  });
});

describe("ResultAggregator — fleet summary", () => {
  const aggregator = new ResultAggregator();

  it("computes fleet-wide summary", () => {
    const sessions = [
      makeSession({ sessionId: "s1", agentId: "a1", taskId: "t1", state: "complete" }),
      makeSession({ sessionId: "s2", agentId: "a2", taskId: "t1", state: "complete" }),
      makeSession({
        sessionId: "s3",
        agentId: "a1",
        taskId: "t2",
        state: "failed",
        result: { status: "failure", error: "e" },
      }),
      makeSession({ sessionId: "s4", agentId: "a3", taskId: "t3", state: "running" }),
    ];

    const summary = aggregator.computeFleetSummary(sessions);

    assert.equal(summary.totalSessions, 4);
    assert.equal(summary.activeSessions, 1);
    assert.equal(summary.completedSessions, 2);
    assert.equal(summary.failedSessions, 1);
    assert.ok(Math.abs(summary.overallSuccessRate - 2 / 3) < 0.001);
    assert.equal(summary.uniqueAgents, 3);
    assert.equal(summary.uniqueTasks, 3);
    assert.ok(summary.generatedAt > 0);
  });

  it("handles empty session list", () => {
    const summary = aggregator.computeFleetSummary([]);
    assert.equal(summary.totalSessions, 0);
    assert.equal(summary.overallSuccessRate, 0);
    assert.equal(summary.avgSessionDuration, 0);
  });
});
