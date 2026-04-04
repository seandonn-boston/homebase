/**
 * End-to-End Multi-Agent Orchestration Tests (E2E-01, E2E-02, E2E-03)
 *
 * Proves that two or more agents can hand off work and complete a task
 * through the Admiral orchestration layer. Uses real ExecutionRuntime
 * and mock agents (no LLM API calls).
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { LimitEnforcer } from "./execution-limits";
import { ExecutionRuntime, type SessionConfig } from "./execution-runtime";
import { ResultAggregator } from "./result-aggregator";
import {
  assertHandoffValid,
  assertSessionComplete,
  assertSessionFailed,
  MockAgent,
} from "./test-helpers/mock-agent";

// ── Test Setup ───────────────────────────────────────────────

describe("E2E-01: Multi-Agent Test Harness", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("creates mock agents with predefined behaviors", () => {
    const agent = new MockAgent({
      agentId: "analyzer",
      agentName: "Code Analyzer",
      behavior: "succeed",
    });

    assert.equal(agent.config.agentId, "analyzer");
    assert.equal(agent.config.behavior, "succeed");
  });

  it("spawns and executes a mock agent session", async () => {
    const agent = new MockAgent({
      agentId: "analyzer",
      agentName: "Code Analyzer",
      behavior: "succeed",
      output: { findings: ["issue-1", "issue-2"] },
      tokensUsed: 500,
    });

    const session = runtime.spawn({
      agentId: agent.config.agentId,
      agentName: agent.config.agentName,
      taskDescription: "Analyze code",
    });
    runtime.startSession(session.sessionId);

    const result = await agent.execute(runtime, session.sessionId);

    assertSessionComplete(result.session);
    assert.deepEqual(result.output, { findings: ["issue-1", "issue-2"] });
    assert.equal(result.session.tokensUsed, 500);
  });

  it("creates valid handoff payloads", () => {
    const agent = new MockAgent({
      agentId: "analyzer",
      agentName: "Code Analyzer",
      behavior: "succeed",
    });

    const handoff = agent.createHandoff("task-1", "fixer", { analysis: "needs fix" });

    assertHandoffValid(handoff);
    assert.equal(handoff.fromAgent, "analyzer");
    assert.equal(handoff.toAgent, "fixer");
    assert.equal(handoff.taskId, "task-1");
  });

  it("tracks events across multi-agent sessions", async () => {
    const events: string[] = [];
    stream.on((e) => events.push(`${e.agentId}:${e.type}`));

    const agent1 = new MockAgent({ agentId: "agent-a", agentName: "A", behavior: "succeed" });
    const agent2 = new MockAgent({ agentId: "agent-b", agentName: "B", behavior: "succeed" });

    const s1 = runtime.spawn({ agentId: "agent-a", agentName: "A", taskDescription: "Task A" });
    runtime.startSession(s1.sessionId);
    await agent1.execute(runtime, s1.sessionId);

    const s2 = runtime.spawn({ agentId: "agent-b", agentName: "B", taskDescription: "Task B" });
    runtime.startSession(s2.sessionId);
    await agent2.execute(runtime, s2.sessionId);

    // Both agents should have emitted lifecycle events
    assert.ok(events.some((e) => e.startsWith("agent-a:")));
    assert.ok(events.some((e) => e.startsWith("agent-b:")));
  });
});

// ── E2E-02: Happy Path ─────────────────────────────────────────

describe("E2E-02: Happy Path — Agent A → handoff → Agent B → result", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("completes a two-agent task with handoff", async () => {
    const taskId = "task-code-review";

    // Agent A: Analyzer
    const analyzer = new MockAgent({
      agentId: "analyzer",
      agentName: "Code Analyzer",
      behavior: "produce_output",
      output: { findings: ["SQL injection in query.ts", "Missing input validation"] },
      tokensUsed: 800,
      fileWrites: 0,
    });

    // Agent B: Fixer
    const fixer = new MockAgent({
      agentId: "fixer",
      agentName: "Code Fixer",
      behavior: "succeed",
      output: { fixes_applied: 2, files_modified: ["query.ts"] },
      tokensUsed: 1200,
      fileWrites: 2,
    });

    // Step 1: Spawn and execute Agent A
    const sessionA = runtime.spawn({
      agentId: analyzer.config.agentId,
      agentName: analyzer.config.agentName,
      taskDescription: "Analyze code for security issues",
      taskId,
    });
    runtime.startSession(sessionA.sessionId);
    const resultA = await analyzer.execute(runtime, sessionA.sessionId);

    // Verify Agent A completed
    assertSessionComplete(resultA.session);
    assert.ok(resultA.output);

    // Step 2: Create handoff from A to B
    const handoff = analyzer.createHandoff(taskId, "fixer", resultA.output);
    assertHandoffValid(handoff);

    // Step 3: Spawn and execute Agent B with handoff context
    const sessionB = runtime.spawn({
      agentId: fixer.config.agentId,
      agentName: fixer.config.agentName,
      taskDescription: "Fix issues found by analyzer",
      taskId,
      metadata: { handoff },
    });
    runtime.startSession(sessionB.sessionId);
    const resultB = await fixer.execute(runtime, sessionB.sessionId);

    // Step 4: Verify Agent B completed
    assertSessionComplete(resultB.session);

    // Step 5: Aggregate results
    const aggregator = new ResultAggregator();
    const taskSummary = aggregator.summarizeTask(taskId, runtime.getAllSessions());

    assert.equal(taskSummary.sessions.length, 2);
    assert.equal(taskSummary.finalStatus, "success");
    assert.equal(taskSummary.totalTokens, 2000); // 800 + 1200
    assert.equal(taskSummary.totalFileWrites, 2);

    // Verify both agents contributed
    const agentIds = taskSummary.sessions.map((s) => s.agentId);
    assert.ok(agentIds.includes("analyzer"));
    assert.ok(agentIds.includes("fixer"));

    // Verify all state transitions are correct
    const allSessions = runtime.getAllSessions();
    assert.ok(allSessions.every((s) => s.state === "complete"));
  });

  it("preserves handoff context through the pipeline", async () => {
    const analyzer = new MockAgent({
      agentId: "analyzer",
      agentName: "Analyzer",
      behavior: "produce_output",
      output: { severity: "high", details: "Critical finding" },
    });

    const s1 = runtime.spawn({
      agentId: "analyzer",
      agentName: "Analyzer",
      taskDescription: "Analyze",
      taskId: "t1",
    });
    runtime.startSession(s1.sessionId);
    const r1 = await analyzer.execute(runtime, s1.sessionId);

    const handoff = analyzer.createHandoff("t1", "fixer", r1.output);

    // Verify handoff carries the analysis results
    assert.deepEqual(handoff.results, { severity: "high", details: "Critical finding" });
    assert.equal(handoff.fromAgent, "analyzer");
    assert.equal(handoff.toAgent, "fixer");
  });
});

// ── E2E-03: Failure and Re-route ───────────────────────────────

describe("E2E-03: Failure Path — Agent A fails → re-route to Agent B", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("re-routes task when primary agent fails", async () => {
    const taskId = "task-reroute";

    // Agent A: will fail
    const primaryAgent = new MockAgent({
      agentId: "primary",
      agentName: "Primary Agent",
      behavior: "fail",
      error: "Connection timeout",
    });

    // Agent B: fallback
    const fallbackAgent = new MockAgent({
      agentId: "fallback",
      agentName: "Fallback Agent",
      behavior: "succeed",
      output: { result: "completed by fallback" },
    });

    // Step 1: Attempt with primary agent
    const sessionA = runtime.spawn({
      agentId: primaryAgent.config.agentId,
      agentName: primaryAgent.config.agentName,
      taskDescription: "Process data",
      taskId,
    });
    runtime.startSession(sessionA.sessionId);
    const resultA = await primaryAgent.execute(runtime, sessionA.sessionId);

    // Verify primary agent failed
    assertSessionFailed(resultA.session);
    assert.equal(resultA.session.result?.error, "Connection timeout");

    // Step 2: Detect failure and re-route to fallback
    const sessionB = runtime.spawn({
      agentId: fallbackAgent.config.agentId,
      agentName: fallbackAgent.config.agentName,
      taskDescription: "Process data (re-routed from primary)",
      taskId,
      metadata: { rerouted: true, originalAgent: "primary", failureReason: "Connection timeout" },
    });
    runtime.startSession(sessionB.sessionId);
    const resultB = await fallbackAgent.execute(runtime, sessionB.sessionId);

    // Verify fallback succeeded
    assertSessionComplete(resultB.session);

    // Step 3: Verify execution history shows failure → re-route → success
    const taskSessions = runtime.getSessionsByTask(taskId);
    assert.equal(taskSessions.length, 2);

    const failed = taskSessions.find((s) => s.state === "failed");
    const succeeded = taskSessions.find((s) => s.state === "complete");
    assert.ok(failed);
    assert.ok(succeeded);
    assert.equal(failed.agentId, "primary");
    assert.equal(succeeded.agentId, "fallback");

    // Step 4: Aggregate shows partial status (one failed, one succeeded)
    const aggregator = new ResultAggregator();
    const summary = aggregator.summarizeTask(taskId, runtime.getAllSessions());
    assert.equal(summary.finalStatus, "partial");
  });

  it("emits escalation when all agents fail", async () => {
    const enforcer = new LimitEnforcer(runtime, stream, {
      retryPolicy: { maxRetries: 0, baseDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 },
    });

    const escalations: unknown[] = [];
    enforcer.onEscalation((e) => escalations.push(e));

    const failingAgent = new MockAgent({
      agentId: "failing",
      agentName: "Failing Agent",
      behavior: "fail",
      error: "Permanent failure",
    });

    const config: SessionConfig = {
      agentId: "failing",
      agentName: "Failing Agent",
      taskDescription: "Doomed task",
      taskId: "task-doom",
    };

    enforcer.registerForRetry("task-doom", config);

    const session = runtime.spawn(config);
    runtime.startSession(session.sessionId);
    await failingAgent.execute(runtime, session.sessionId);
    enforcer.handleFailure(session, "Permanent failure");

    // With maxRetries: 0, should escalate immediately
    assert.equal(escalations.length, 1);

    enforcer.stop();
  });

  it("tracks re-route metadata through the pipeline", async () => {
    const primaryAgent = new MockAgent({
      agentId: "primary",
      agentName: "Primary",
      behavior: "fail",
      error: "OOM",
    });

    const s1 = runtime.spawn({
      agentId: "primary",
      agentName: "Primary",
      taskDescription: "Task",
      taskId: "t1",
    });
    runtime.startSession(s1.sessionId);
    await primaryAgent.execute(runtime, s1.sessionId);

    // Re-route with metadata
    const s2 = runtime.spawn({
      agentId: "backup",
      agentName: "Backup",
      taskDescription: "Task (rerouted)",
      taskId: "t1",
      metadata: {
        rerouted: true,
        originalAgent: s1.agentId,
        originalSessionId: s1.sessionId,
        failureReason: s1.result?.error,
      },
    });

    // Verify metadata captures the failure chain
    assert.equal(s2.metadata.rerouted, true);
    assert.equal(s2.metadata.originalAgent, "primary");
    assert.equal(s2.metadata.failureReason, "OOM");
  });
});

// ── Fleet Summary Integration ──────────────────────────────────

describe("E2E: Fleet-wide metrics across multi-agent scenarios", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("produces accurate fleet summary after multi-agent work", async () => {
    // Simulate a realistic scenario: 3 agents, 2 tasks
    const agents = [
      new MockAgent({ agentId: "a1", agentName: "A1", behavior: "succeed", tokensUsed: 100 }),
      new MockAgent({ agentId: "a2", agentName: "A2", behavior: "succeed", tokensUsed: 200 }),
      new MockAgent({
        agentId: "a3",
        agentName: "A3",
        behavior: "fail",
        error: "err",
        tokensUsed: 50,
      }),
    ];

    const configs: SessionConfig[] = [
      { agentId: "a1", agentName: "A1", taskDescription: "T1", taskId: "t1" },
      { agentId: "a2", agentName: "A2", taskDescription: "T1", taskId: "t1" },
      { agentId: "a3", agentName: "A3", taskDescription: "T2", taskId: "t2" },
    ];

    for (let i = 0; i < configs.length; i++) {
      const session = runtime.spawn(configs[i]);
      runtime.startSession(session.sessionId);
      await agents[i].execute(runtime, session.sessionId);
    }

    const aggregator = new ResultAggregator();
    const fleet = aggregator.computeFleetSummary(runtime.getAllSessions());

    assert.equal(fleet.totalSessions, 3);
    assert.equal(fleet.completedSessions, 2);
    assert.equal(fleet.failedSessions, 1);
    assert.equal(fleet.uniqueAgents, 3);
    assert.equal(fleet.uniqueTasks, 2);
    assert.equal(fleet.totalTokensUsed, 350);
  });
});
