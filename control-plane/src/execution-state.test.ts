/**
 * Tests for Admiral Execution State Persistence (EX-03)
 */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Session } from "./execution-runtime";
import { ExecutionStatePersistence } from "./execution-state";

function makeSession(overrides?: Partial<Session>): Session {
  return {
    sessionId: `ses_${Date.now()}`,
    agentId: "test-agent",
    agentName: "Test Agent",
    taskId: "task_1",
    taskDescription: "Test task",
    state: "running",
    tokenBudget: 1000,
    wallClockTimeoutMs: 300000,
    maxFileWrites: 50,
    fileWriteCount: 0,
    tokensUsed: 0,
    createdAt: Date.now(),
    metadata: {},
    ...overrides,
  };
}

describe("ExecutionStatePersistence — state save/restore", () => {
  let tmpDir: string;
  let statePath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "exec-state-test-"));
    statePath = join(tmpDir, "state.json");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("saves state to disk", () => {
    const persistence = new ExecutionStatePersistence({ statePath });
    const sessions = new Map<string, Session>();
    sessions.set("ses_1", makeSession({ sessionId: "ses_1", state: "running" }));
    sessions.set("ses_2", makeSession({ sessionId: "ses_2", state: "complete" }));

    persistence.saveState(sessions, 5);

    assert.ok(existsSync(statePath));
    const data = JSON.parse(readFileSync(statePath, "utf8"));
    assert.equal(data.sessions.length, 2);
    assert.equal(data.spawnCounter, 5);
    assert.ok(data.persistedAt > 0);
  });

  it("restores state from disk", () => {
    const persistence = new ExecutionStatePersistence({ statePath });
    const sessions = new Map<string, Session>();
    sessions.set("ses_1", makeSession({ sessionId: "ses_1", state: "complete" }));

    persistence.saveState(sessions, 3);

    const result = persistence.restoreState();
    assert.equal(result.restoredSessions, 1);
    assert.equal(result.spawnCounter, 3);
    assert.equal(result.interruptedSessions.length, 0);
  });

  it("marks running sessions as failed on restore", () => {
    const persistence = new ExecutionStatePersistence({ statePath });
    const sessions = new Map<string, Session>();
    sessions.set("ses_1", makeSession({ sessionId: "ses_1", state: "running" }));
    sessions.set("ses_2", makeSession({ sessionId: "ses_2", state: "pending" }));
    sessions.set("ses_3", makeSession({ sessionId: "ses_3", state: "complete" }));

    persistence.saveState(sessions, 3);

    const result = persistence.restoreState();
    assert.equal(result.interruptedSessions.length, 2);
    assert.ok(result.interruptedSessions.includes("ses_1"));
    assert.ok(result.interruptedSessions.includes("ses_2"));
  });

  it("handles missing state file gracefully", () => {
    const persistence = new ExecutionStatePersistence({ statePath: "/nonexistent/path.json" });
    const result = persistence.restoreState();
    assert.equal(result.restoredSessions, 0);
    assert.equal(result.interruptedSessions.length, 0);
    assert.equal(result.spawnCounter, 0);
  });

  it("handles corrupted state file gracefully", () => {
    writeFileSync(statePath, "not valid json{{{", "utf8");
    const persistence = new ExecutionStatePersistence({ statePath });
    const result = persistence.restoreState();
    assert.equal(result.restoredSessions, 0);
  });

  it("uses atomic writes (tmp + rename)", () => {
    const persistence = new ExecutionStatePersistence({ statePath });
    const sessions = new Map<string, Session>();
    sessions.set("ses_1", makeSession({ sessionId: "ses_1" }));

    persistence.saveState(sessions, 1);

    // tmp file should not exist after save
    assert.ok(!existsSync(`${statePath}.tmp`));
    assert.ok(existsSync(statePath));
  });
});

describe("ExecutionStatePersistence — history", () => {
  let tmpDir: string;
  let statePath: string;
  let historyPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "exec-state-test-"));
    statePath = join(tmpDir, "state.json");
    historyPath = join(tmpDir, "history.jsonl");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("appends completed session to history", () => {
    const persistence = new ExecutionStatePersistence({ statePath, historyPath });
    const session = makeSession({
      sessionId: "ses_1",
      state: "complete",
      completedAt: Date.now(),
      tokensUsed: 500,
      fileWriteCount: 3,
      result: { status: "success" },
    });

    persistence.appendHistory(session);

    const entries = persistence.readHistory();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].sessionId, "ses_1");
    assert.equal(entries[0].tokensUsed, 500);
    assert.equal(entries[0].resultStatus, "success");
  });

  it("appends multiple sessions", () => {
    const persistence = new ExecutionStatePersistence({ statePath, historyPath });

    for (let i = 0; i < 5; i++) {
      persistence.appendHistory(
        makeSession({
          sessionId: `ses_${i}`,
          state: "complete",
          completedAt: Date.now(),
        }),
      );
    }

    const entries = persistence.readHistory();
    assert.equal(entries.length, 5);
  });

  it("reads history with limit", () => {
    const persistence = new ExecutionStatePersistence({ statePath, historyPath });

    for (let i = 0; i < 10; i++) {
      persistence.appendHistory(
        makeSession({
          sessionId: `ses_${i}`,
          state: "complete",
          completedAt: Date.now(),
        }),
      );
    }

    const entries = persistence.readHistory(3);
    assert.equal(entries.length, 3);
    assert.equal(entries[0].sessionId, "ses_7"); // Last 3
  });

  it("compacts history when exceeding max entries", () => {
    const persistence = new ExecutionStatePersistence({
      statePath,
      historyPath,
      maxHistoryEntries: 5,
    });

    for (let i = 0; i < 10; i++) {
      persistence.appendHistory(
        makeSession({
          sessionId: `ses_${i}`,
          state: "complete",
          completedAt: Date.now(),
        }),
      );
    }

    const entries = persistence.readHistory();
    assert.ok(entries.length <= 5);
    // Should have kept the most recent entries
    assert.equal(entries[entries.length - 1].sessionId, "ses_9");
  });

  it("returns empty array for missing history file", () => {
    const persistence = new ExecutionStatePersistence({
      statePath,
      historyPath: "/nonexistent.jsonl",
    });
    assert.deepEqual(persistence.readHistory(), []);
  });

  it("records failed session with error", () => {
    const persistence = new ExecutionStatePersistence({ statePath, historyPath });
    const session = makeSession({
      state: "failed",
      completedAt: Date.now(),
      result: { status: "failure", error: "Something broke" },
    });

    persistence.appendHistory(session);

    const entries = persistence.readHistory();
    assert.equal(entries[0].resultStatus, "failure");
    assert.equal(entries[0].error, "Something broke");
  });

  it("calculates duration correctly", () => {
    const persistence = new ExecutionStatePersistence({ statePath, historyPath });
    const now = Date.now();
    const session = makeSession({
      state: "complete",
      startedAt: now - 5000,
      completedAt: now,
    });

    persistence.appendHistory(session);

    const entries = persistence.readHistory();
    assert.equal(entries[0].duration, 5000);
  });
});
