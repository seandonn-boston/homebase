/**
 * Tests for Admiral Execution Limits & Retry Handler (EX-04)
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { type EscalationEvent, LimitEnforcer } from "./execution-limits";
import { ExecutionRuntime, type SessionConfig } from "./execution-runtime";

function makeConfig(overrides?: Partial<SessionConfig>): SessionConfig {
  return {
    agentId: "test-agent",
    agentName: "Test Agent",
    taskDescription: "Test task",
    ...overrides,
  };
}

describe("LimitEnforcer — limit checking", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;
  let enforcer: LimitEnforcer;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
    enforcer = new LimitEnforcer(runtime, stream);
  });

  afterEach(() => {
    enforcer.stop();
    runtime.shutdown();
  });

  it("detects and enforces token budget violation", () => {
    const session = runtime.spawn(makeConfig({ tokenBudget: 100 }));
    runtime.startSession(session.sessionId);
    runtime.recordTokens(session.sessionId, 200);

    enforcer.checkAllLimits();

    const updated = runtime.getSession(session.sessionId)!;
    assert.equal(updated.state, "failed");
    assert.equal(updated.result?.status, "limit_exceeded");
  });

  it("detects and enforces file write cap violation", () => {
    const session = runtime.spawn(makeConfig({ maxFileWrites: 2 }));
    runtime.startSession(session.sessionId);
    runtime.recordFileWrite(session.sessionId);
    runtime.recordFileWrite(session.sessionId);
    runtime.recordFileWrite(session.sessionId);

    enforcer.checkAllLimits();

    const updated = runtime.getSession(session.sessionId)!;
    assert.equal(updated.state, "failed");
  });

  it("does not enforce when within limits", () => {
    const session = runtime.spawn(makeConfig({ tokenBudget: 1000 }));
    runtime.startSession(session.sessionId);
    runtime.recordTokens(session.sessionId, 100);

    enforcer.checkAllLimits();

    const updated = runtime.getSession(session.sessionId)!;
    assert.equal(updated.state, "running");
  });
});

describe("LimitEnforcer — retry logic", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;
  let enforcer: LimitEnforcer;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
    enforcer = new LimitEnforcer(runtime, stream, {
      retryPolicy: {
        maxRetries: 2,
        baseDelayMs: 10, // Short delays for testing
        maxDelayMs: 100,
        backoffMultiplier: 2,
      },
    });
  });

  afterEach(() => {
    enforcer.stop();
    runtime.shutdown();
  });

  it("registers task for retry tracking", () => {
    const config = makeConfig({ taskId: "task-1" });
    enforcer.registerForRetry("task-1", config);

    const record = enforcer.getRetryRecord("task-1");
    assert.ok(record);
    assert.equal(record.attemptCount, 1);
    assert.equal(record.exhausted, false);
  });

  it("handles failure and increments attempt count", () => {
    const config = makeConfig({ taskId: "task-1" });
    const session = runtime.spawn(config);
    runtime.startSession(session.sessionId);

    enforcer.registerForRetry("task-1", config);
    const record = enforcer.handleFailure(session, "test failure");

    assert.ok(record);
    assert.equal(record.attemptCount, 2); // Incremented for next attempt
    assert.equal(record.failures.length, 1);
    assert.equal(record.failures[0].reason, "test failure");
    assert.equal(record.exhausted, false);
  });

  it("schedules retry with backoff", async () => {
    const config = makeConfig({ taskId: "task-retry" });
    const session = runtime.spawn(config);
    runtime.startSession(session.sessionId);

    enforcer.registerForRetry("task-retry", config);
    const record = enforcer.handleFailure(session, "temporary failure");

    assert.ok(record);
    assert.ok(record.nextRetryAt);
    assert.ok(record.nextRetryAt > Date.now());

    // Wait for retry to execute
    await new Promise((resolve) => setTimeout(resolve, 50));

    // The retry should have spawned a new session
    const sessions = runtime.getSessionsByAgent("test-agent");
    assert.ok(sessions.length >= 2); // Original + retry
  });

  it("escalates after all retries exhausted", () => {
    const config = makeConfig({ taskId: "task-exhaust" });

    enforcer.registerForRetry("task-exhaust", config);
    const record = enforcer.getRetryRecord("task-exhaust")!;

    // Simulate 3 failures (initial + 2 retries)
    const s1 = runtime.spawn(config);
    runtime.startSession(s1.sessionId);
    enforcer.handleFailure(s1, "fail 1");

    const s2 = runtime.spawn(config);
    runtime.startSession(s2.sessionId);
    enforcer.handleFailure(s2, "fail 2");

    const s3 = runtime.spawn(config);
    runtime.startSession(s3.sessionId);
    const finalRecord = enforcer.handleFailure(s3, "fail 3");

    assert.ok(finalRecord);
    assert.equal(finalRecord.exhausted, true);
    assert.equal(finalRecord.failures.length, 3);
  });

  it("emits escalation event when retries exhausted", () => {
    const escalations: EscalationEvent[] = [];
    enforcer.onEscalation((e) => escalations.push(e));

    const config = makeConfig({ taskId: "task-esc" });
    enforcer.registerForRetry("task-esc", config);

    // Exhaust all retries
    for (let i = 0; i < 3; i++) {
      const s = runtime.spawn(config);
      runtime.startSession(s.sessionId);
      enforcer.handleFailure(s, `fail ${i + 1}`);
    }

    assert.equal(escalations.length, 1);
    assert.equal(escalations[0].taskId, "task-esc");
    assert.equal(escalations[0].agentId, "test-agent");
    assert.equal(escalations[0].attemptCount, 3);
  });

  it("returns undefined for unregistered tasks", () => {
    const session = runtime.spawn(makeConfig());
    runtime.startSession(session.sessionId);

    const result = enforcer.handleFailure(session, "no retry");
    assert.equal(result, undefined);
  });
});

describe("LimitEnforcer — exponential backoff calculation", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;
  let enforcer: LimitEnforcer;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
    enforcer = new LimitEnforcer(runtime, stream, {
      retryPolicy: {
        maxRetries: 5,
        baseDelayMs: 100,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      },
    });
  });

  afterEach(() => {
    enforcer.stop();
    runtime.shutdown();
  });

  it("increases delay with each retry", () => {
    const config = makeConfig({ taskId: "task-backoff" });
    enforcer.registerForRetry("task-backoff", config);

    const s1 = runtime.spawn(config);
    runtime.startSession(s1.sessionId);
    const r1 = enforcer.handleFailure(s1, "fail 1")!;
    const delay1 = r1.nextRetryAt! - Date.now();

    // Second attempt should have longer delay
    const s2 = runtime.spawn(config);
    runtime.startSession(s2.sessionId);
    const r2 = enforcer.handleFailure(s2, "fail 2")!;
    const delay2 = r2.nextRetryAt! - Date.now();

    assert.ok(delay2 > delay1, `Second delay (${delay2}) should exceed first (${delay1})`);
  });
});

describe("LimitEnforcer — periodic checking", () => {
  it("automatically checks limits on interval", async () => {
    const stream = new EventStream();
    const runtime = new ExecutionRuntime(stream);
    const enforcer = new LimitEnforcer(runtime, stream, { checkIntervalMs: 20 });

    const session = runtime.spawn(makeConfig({ tokenBudget: 100 }));
    runtime.startSession(session.sessionId);
    runtime.recordTokens(session.sessionId, 200);

    enforcer.start();

    // Wait for check interval
    await new Promise((resolve) => setTimeout(resolve, 50));

    const updated = runtime.getSession(session.sessionId)!;
    assert.equal(updated.state, "failed");

    enforcer.stop();
    runtime.shutdown();
  });
});

describe("LimitEnforcer — escalation listener management", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;
  let enforcer: LimitEnforcer;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
    enforcer = new LimitEnforcer(runtime, stream, {
      retryPolicy: { maxRetries: 0, baseDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 },
    });
  });

  afterEach(() => {
    enforcer.stop();
    runtime.shutdown();
  });

  it("unsubscribes escalation listeners", () => {
    const escalations: EscalationEvent[] = [];
    const unsub = enforcer.onEscalation((e) => escalations.push(e));

    // First escalation — should be captured
    const config1 = makeConfig({ taskId: "t1" });
    enforcer.registerForRetry("t1", config1);
    const s1 = runtime.spawn(config1);
    runtime.startSession(s1.sessionId);
    enforcer.handleFailure(s1, "fail");

    assert.equal(escalations.length, 1);

    // Unsubscribe
    unsub();

    // Second escalation — should NOT be captured
    const config2 = makeConfig({ taskId: "t2" });
    enforcer.registerForRetry("t2", config2);
    const s2 = runtime.spawn(config2);
    runtime.startSession(s2.sessionId);
    enforcer.handleFailure(s2, "fail");

    assert.equal(escalations.length, 1); // Still 1
  });
});

describe("LimitEnforcer — queries", () => {
  let stream: EventStream;
  let runtime: ExecutionRuntime;
  let enforcer: LimitEnforcer;

  beforeEach(() => {
    stream = new EventStream();
    runtime = new ExecutionRuntime(stream);
    enforcer = new LimitEnforcer(runtime, stream, {
      retryPolicy: { maxRetries: 1, baseDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 },
    });
  });

  afterEach(() => {
    enforcer.stop();
    runtime.shutdown();
  });

  it("lists all retry records", () => {
    enforcer.registerForRetry("t1", makeConfig({ taskId: "t1" }));
    enforcer.registerForRetry("t2", makeConfig({ taskId: "t2" }));

    assert.equal(enforcer.getAllRetryRecords().length, 2);
  });

  it("lists escalated tasks only", () => {
    const config1 = makeConfig({ taskId: "t1" });
    enforcer.registerForRetry("t1", config1);

    // Exhaust retries for t1
    const s1 = runtime.spawn(config1);
    runtime.startSession(s1.sessionId);
    enforcer.handleFailure(s1, "fail 1");

    const s2 = runtime.spawn(config1);
    runtime.startSession(s2.sessionId);
    enforcer.handleFailure(s2, "fail 2");

    // t2 is not exhausted
    enforcer.registerForRetry("t2", makeConfig({ taskId: "t2" }));

    assert.equal(enforcer.getEscalatedTasks().length, 1);
    assert.equal(enforcer.getEscalatedTasks()[0].taskId, "t1");
  });
});
