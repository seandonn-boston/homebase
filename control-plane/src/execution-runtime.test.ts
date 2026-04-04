/**
 * Tests for Admiral Agent Execution Runtime (EX-01)
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { ExecutionRuntime, type SessionConfig } from "./execution-runtime";
import { SessionThermalModel } from "./session-thermal";

function makeConfig(overrides?: Partial<SessionConfig>): SessionConfig {
  return {
    agentId: "test-agent",
    agentName: "Test Agent",
    taskDescription: "Test task",
    ...overrides,
  };
}

describe("ExecutionRuntime — session spawning", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("spawns a session in pending state", () => {
    const session = runtime.spawn(makeConfig());
    assert.equal(session.state, "pending");
    assert.ok(session.sessionId.startsWith("ses_"));
    assert.ok(session.taskId.startsWith("task_"));
    assert.equal(session.agentId, "test-agent");
    assert.equal(session.agentName, "Test Agent");
  });

  it("uses provided taskId when given", () => {
    const session = runtime.spawn(makeConfig({ taskId: "custom-task-1" }));
    assert.equal(session.taskId, "custom-task-1");
  });

  it("applies default resource limits", () => {
    const session = runtime.spawn(makeConfig());
    assert.equal(session.tokenBudget, 0); // unlimited
    assert.equal(session.wallClockTimeoutMs, 5 * 60 * 1000);
    assert.equal(session.maxFileWrites, 50);
  });

  it("applies custom resource limits", () => {
    const session = runtime.spawn(
      makeConfig({
        tokenBudget: 10000,
        wallClockTimeoutMs: 30000,
        maxFileWrites: 10,
      }),
    );
    assert.equal(session.tokenBudget, 10000);
    assert.equal(session.wallClockTimeoutMs, 30000);
    assert.equal(session.maxFileWrites, 10);
  });

  it("emits agent_started event on spawn", () => {
    const events: { type: string; data: Record<string, unknown> }[] = [];
    stream.on((e) => events.push({ type: e.type, data: e.data }));

    runtime.spawn(makeConfig());

    assert.equal(events.length, 1);
    assert.equal(events[0].type, "agent_started");
    assert.equal(events[0].data.runtimeEvent, "session.spawned");
  });

  it("generates unique session IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const session = runtime.spawn(makeConfig());
      ids.add(session.sessionId);
    }
    assert.equal(ids.size, 50);
  });

  it("rejects spawn when max concurrent sessions reached", () => {
    const rt = new ExecutionRuntime(stream, { maxConcurrentSessions: 2 });

    const s1 = rt.spawn(makeConfig());
    rt.startSession(s1.sessionId);
    const s2 = rt.spawn(makeConfig());
    rt.startSession(s2.sessionId);

    assert.throws(() => rt.spawn(makeConfig()), /Max concurrent sessions reached/);

    rt.shutdown();
  });

  it("allows spawn after a running session completes", () => {
    const rt = new ExecutionRuntime(stream, { maxConcurrentSessions: 1 });

    const s1 = rt.spawn(makeConfig());
    rt.startSession(s1.sessionId);
    rt.completeSession(s1.sessionId);

    // Should not throw — slot freed
    const s2 = rt.spawn(makeConfig());
    assert.ok(s2.sessionId);

    rt.shutdown();
  });
});

describe("ExecutionRuntime — session lifecycle", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("transitions pending → running", () => {
    const session = runtime.spawn(makeConfig());
    const started = runtime.startSession(session.sessionId);
    assert.equal(started.state, "running");
    assert.ok(started.startedAt);
  });

  it("transitions running → complete", () => {
    const session = runtime.spawn(makeConfig());
    runtime.startSession(session.sessionId);
    const completed = runtime.completeSession(session.sessionId, { data: "result" });
    assert.equal(completed.state, "complete");
    assert.ok(completed.completedAt);
    assert.deepEqual(completed.result, {
      status: "success",
      output: { data: "result" },
    });
  });

  it("transitions running → failed", () => {
    const session = runtime.spawn(makeConfig());
    runtime.startSession(session.sessionId);
    const failed = runtime.failSession(session.sessionId, "Something broke");
    assert.equal(failed.state, "failed");
    assert.equal(failed.result?.status, "failure");
    assert.equal(failed.result?.error, "Something broke");
  });

  it("transitions pending → failed", () => {
    const session = runtime.spawn(makeConfig());
    const failed = runtime.failSession(session.sessionId, "Cancelled before start");
    assert.equal(failed.state, "failed");
  });

  it("rejects invalid state transitions", () => {
    const session = runtime.spawn(makeConfig());
    runtime.startSession(session.sessionId);
    runtime.completeSession(session.sessionId);

    assert.throws(() => runtime.startSession(session.sessionId), /Cannot start session/);

    assert.throws(() => runtime.completeSession(session.sessionId), /Cannot complete session/);

    assert.throws(() => runtime.failSession(session.sessionId, "test"), /Cannot fail session/);
  });

  it("rejects operations on non-existent sessions", () => {
    assert.throws(() => runtime.startSession("nonexistent"), /Session not found/);
  });
});

describe("ExecutionRuntime — resource tracking", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("tracks token consumption", () => {
    const session = runtime.spawn(makeConfig({ tokenBudget: 1000 }));
    runtime.startSession(session.sessionId);
    runtime.recordTokens(session.sessionId, 300);
    runtime.recordTokens(session.sessionId, 200);

    const updated = runtime.getSession(session.sessionId)!;
    assert.equal(updated.tokensUsed, 500);
  });

  it("tracks file writes", () => {
    const session = runtime.spawn(makeConfig());
    runtime.startSession(session.sessionId);
    runtime.recordFileWrite(session.sessionId);
    runtime.recordFileWrite(session.sessionId);

    const updated = runtime.getSession(session.sessionId)!;
    assert.equal(updated.fileWriteCount, 2);
  });

  it("detects token budget exceeded", () => {
    const session = runtime.spawn(makeConfig({ tokenBudget: 100 }));
    runtime.startSession(session.sessionId);
    runtime.recordTokens(session.sessionId, 150);

    assert.equal(runtime.checkLimits(session.sessionId), "token_budget");
  });

  it("detects file write cap exceeded", () => {
    const session = runtime.spawn(makeConfig({ maxFileWrites: 2 }));
    runtime.startSession(session.sessionId);
    runtime.recordFileWrite(session.sessionId);
    runtime.recordFileWrite(session.sessionId);
    runtime.recordFileWrite(session.sessionId);

    assert.equal(runtime.checkLimits(session.sessionId), "file_write_cap");
  });

  it("returns null when within limits", () => {
    const session = runtime.spawn(makeConfig({ tokenBudget: 1000, maxFileWrites: 50 }));
    runtime.startSession(session.sessionId);
    runtime.recordTokens(session.sessionId, 100);
    runtime.recordFileWrite(session.sessionId);

    assert.equal(runtime.checkLimits(session.sessionId), null);
  });

  it("unlimited token budget never exceeds", () => {
    const session = runtime.spawn(makeConfig({ tokenBudget: 0 }));
    runtime.startSession(session.sessionId);
    runtime.recordTokens(session.sessionId, 999999);

    assert.equal(runtime.checkLimits(session.sessionId), null);
  });

  it("rejects token recording on non-running sessions", () => {
    const session = runtime.spawn(makeConfig());
    assert.throws(() => runtime.recordTokens(session.sessionId, 100), /Cannot record tokens/);
  });
});

describe("ExecutionRuntime — limit enforcement", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("limits a session due to token budget", () => {
    const session = runtime.spawn(makeConfig());
    runtime.startSession(session.sessionId);

    const limited = runtime.limitSession(session.sessionId, "token_budget");
    assert.equal(limited.state, "failed");
    assert.equal(limited.result?.status, "limit_exceeded");
    assert.equal(limited.result?.limitType, "token_budget");
  });

  it("limits a session due to file write cap", () => {
    const session = runtime.spawn(makeConfig());
    runtime.startSession(session.sessionId);

    const limited = runtime.limitSession(session.sessionId, "file_write_cap");
    assert.equal(limited.state, "failed");
    assert.equal(limited.result?.limitType, "file_write_cap");
  });

  it("limits a session due to wall clock timeout", () => {
    const session = runtime.spawn(makeConfig());
    runtime.startSession(session.sessionId);

    const limited = runtime.limitSession(session.sessionId, "wall_clock");
    assert.equal(limited.state, "failed");
    assert.equal(limited.result?.limitType, "wall_clock");
  });

  it("emits limit_exceeded event", () => {
    const events: Record<string, unknown>[] = [];
    stream.on((e) => {
      if ((e.data as Record<string, unknown>).runtimeEvent === "session.limit_exceeded") {
        events.push(e.data);
      }
    });

    const session = runtime.spawn(makeConfig());
    runtime.startSession(session.sessionId);
    runtime.limitSession(session.sessionId, "token_budget");

    assert.equal(events.length, 1);
    assert.equal(events[0].limitType, "token_budget");
  });
});

describe("ExecutionRuntime — wall clock timeout", () => {
  let stream: EventStream;

  it("times out a session after wall clock expires", async () => {
    stream = new EventStream();
    const runtime = new ExecutionRuntime(stream);

    const session = runtime.spawn(makeConfig({ wallClockTimeoutMs: 50 }));
    runtime.startSession(session.sessionId);

    // Wait for timeout
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updated = runtime.getSession(session.sessionId)!;
    assert.equal(updated.state, "failed");
    assert.equal(updated.result?.status, "limit_exceeded");
    assert.equal(updated.result?.limitType, "wall_clock");

    runtime.shutdown();
  });

  it("cancels timeout timer when session completes", async () => {
    stream = new EventStream();
    const runtime = new ExecutionRuntime(stream);

    const session = runtime.spawn(makeConfig({ wallClockTimeoutMs: 50 }));
    runtime.startSession(session.sessionId);
    runtime.completeSession(session.sessionId);

    // Wait past timeout — should NOT change state
    await new Promise((resolve) => setTimeout(resolve, 100));

    const updated = runtime.getSession(session.sessionId)!;
    assert.equal(updated.state, "complete");

    runtime.shutdown();
  });
});

describe("ExecutionRuntime — queries", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("queries sessions by state", () => {
    const s1 = runtime.spawn(makeConfig({ agentId: "a1" }));
    runtime.spawn(makeConfig({ agentId: "a2" }));
    runtime.startSession(s1.sessionId);

    assert.equal(runtime.getSessionsByState("running").length, 1);
    assert.equal(runtime.getSessionsByState("pending").length, 1);
    assert.equal(runtime.getSessionsByState("complete").length, 0);
  });

  it("queries sessions by agent", () => {
    runtime.spawn(makeConfig({ agentId: "alpha" }));
    runtime.spawn(makeConfig({ agentId: "alpha" }));
    runtime.spawn(makeConfig({ agentId: "beta" }));

    assert.equal(runtime.getSessionsByAgent("alpha").length, 2);
    assert.equal(runtime.getSessionsByAgent("beta").length, 1);
    assert.equal(runtime.getSessionsByAgent("gamma").length, 0);
  });

  it("queries sessions by task", () => {
    runtime.spawn(makeConfig({ taskId: "t1" }));
    runtime.spawn(makeConfig({ taskId: "t1" }));
    runtime.spawn(makeConfig({ taskId: "t2" }));

    assert.equal(runtime.getSessionsByTask("t1").length, 2);
    assert.equal(runtime.getSessionsByTask("t2").length, 1);
  });

  it("returns all sessions", () => {
    runtime.spawn(makeConfig());
    runtime.spawn(makeConfig());
    runtime.spawn(makeConfig());

    assert.equal(runtime.getAllSessions().length, 3);
  });

  it("returns undefined for unknown session", () => {
    assert.equal(runtime.getSession("nonexistent"), undefined);
  });
});

describe("ExecutionRuntime — stats", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("tracks comprehensive stats", () => {
    const s1 = runtime.spawn(makeConfig());
    runtime.startSession(s1.sessionId);
    runtime.completeSession(s1.sessionId);

    const s2 = runtime.spawn(makeConfig());
    runtime.startSession(s2.sessionId);
    runtime.failSession(s2.sessionId, "error");

    const s3 = runtime.spawn(makeConfig());
    runtime.startSession(s3.sessionId);

    runtime.spawn(makeConfig());

    const stats = runtime.getStats();
    assert.equal(stats.totalSpawned, 4);
    assert.equal(stats.totalCompleted, 1);
    assert.equal(stats.totalFailed, 1);
    assert.equal(stats.activeSessions, 1);
    assert.equal(stats.pendingSessions, 1);
  });
});

describe("ExecutionRuntime — thermal integration", () => {
  let stream: EventStream;
  let thermal: SessionThermalModel;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    thermal = new SessionThermalModel();
    runtime = new ExecutionRuntime(stream, {}, thermal);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("creates thermal session on spawn", () => {
    const session = runtime.spawn(makeConfig({ tokenBudget: 1000 }));
    const state = thermal.getState(session.sessionId);
    assert.ok(state);
    assert.equal(state.budget, 1000);
    assert.equal(state.consumed, 0);
  });

  it("updates thermal state on token recording", () => {
    const session = runtime.spawn(makeConfig({ tokenBudget: 1000 }));
    runtime.startSession(session.sessionId);
    runtime.recordTokens(session.sessionId, 600);

    const state = thermal.getState(session.sessionId);
    assert.ok(state);
    assert.equal(state.consumed, 600);
    assert.equal(state.temperature, "warm"); // 60% = warm
  });
});

describe("ExecutionRuntime — event emission", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
  });

  afterEach(() => {
    runtime.shutdown();
  });

  it("emits events for full lifecycle", () => {
    const runtimeEvents: string[] = [];
    stream.on((e) => {
      const data = e.data as Record<string, unknown>;
      if (data.runtimeEvent) {
        runtimeEvents.push(data.runtimeEvent as string);
      }
    });

    const session = runtime.spawn(makeConfig());
    runtime.startSession(session.sessionId);
    runtime.completeSession(session.sessionId);

    assert.deepEqual(runtimeEvents, ["session.spawned", "session.started", "session.completed"]);
  });

  it("includes session metadata in events", () => {
    const captured: Record<string, unknown>[] = [];
    stream.on((e) => captured.push(e.data));

    const session = runtime.spawn(makeConfig());

    assert.equal(captured[0].sessionId, session.sessionId);
  });

  it("includes task ID in all events", () => {
    const taskIds: (string | undefined)[] = [];
    stream.on((e) => taskIds.push(e.taskId));

    const session = runtime.spawn(makeConfig({ taskId: "my-task" }));
    runtime.startSession(session.sessionId);
    runtime.completeSession(session.sessionId);

    assert.ok(taskIds.every((id) => id === "my-task"));
  });
});

describe("ExecutionRuntime — shutdown", () => {
  it("fails all active sessions on shutdown", () => {
    const stream = new EventStream();
    const runtime = new ExecutionRuntime(stream);

    const s1 = runtime.spawn(makeConfig());
    runtime.startSession(s1.sessionId);

    const s2 = runtime.spawn(makeConfig());

    runtime.shutdown();

    assert.equal(runtime.getSession(s1.sessionId)!.state, "failed");
    assert.equal(runtime.getSession(s1.sessionId)!.result?.error, "Runtime shutdown");
    assert.equal(runtime.getSession(s2.sessionId)!.state, "failed");
  });
});
