/**
 * Admiral Framework — Execution State Persistence (EX-03)
 *
 * Persists execution runtime state (active sessions, execution history)
 * to disk so the runtime can recover after a crash. Uses atomic writes
 * (write-tmp + rename) to prevent corruption. Supports JSONL append
 * mode for session history with periodic compaction.
 */

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import type { Session } from "./execution-runtime";

// ── Types ──────────────────────────────────────────────────────

export interface ExecutionStateConfig {
  statePath: string;
  historyPath?: string;
  maxHistoryEntries: number;
}

export interface PersistedState {
  sessions: [string, Session][];
  spawnCounter: number;
  persistedAt: number;
}

export interface HistoryEntry {
  sessionId: string;
  agentId: string;
  agentName: string;
  taskId: string;
  state: string;
  createdAt: number;
  completedAt?: number;
  duration?: number;
  tokensUsed: number;
  fileWriteCount: number;
  resultStatus?: string;
  error?: string;
  timestamp: number;
}

export interface RestoreResult {
  restoredSessions: number;
  interruptedSessions: string[];
  spawnCounter: number;
}

// ── Defaults ───────────────────────────────────────────────────

const DEFAULT_CONFIG: ExecutionStateConfig = {
  statePath: ".admiral/execution-state.json",
  maxHistoryEntries: 5000,
};

// ── ExecutionStatePersistence ──────────────────────────────────

export class ExecutionStatePersistence {
  private config: ExecutionStateConfig;

  constructor(config: Partial<ExecutionStateConfig> & { statePath: string }) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Persist current runtime state to disk (atomic write).
   */
  saveState(sessions: Map<string, Session>, spawnCounter: number): void {
    const state: PersistedState = {
      sessions: Array.from(sessions.entries()),
      spawnCounter,
      persistedAt: Date.now(),
    };

    const tmpPath = `${this.config.statePath}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(state), "utf8");
    renameSync(tmpPath, this.config.statePath);
  }

  /**
   * Restore runtime state from disk.
   * Running/pending sessions are marked as failed (interrupted by crash).
   */
  restoreState(): RestoreResult {
    let data: string;
    try {
      data = readFileSync(this.config.statePath, "utf8");
    } catch {
      return { restoredSessions: 0, interruptedSessions: [], spawnCounter: 0 };
    }

    let state: PersistedState;
    try {
      state = JSON.parse(data) as PersistedState;
    } catch {
      return { restoredSessions: 0, interruptedSessions: [], spawnCounter: 0 };
    }

    const interrupted: string[] = [];
    const sessions = new Map<string, Session>(state.sessions);

    // Mark active sessions as failed (interrupted by crash)
    for (const [id, session] of sessions) {
      if (session.state === "running" || session.state === "pending") {
        session.state = "failed";
        session.completedAt = Date.now();
        session.result = {
          status: "failure",
          error: "Interrupted by crash — restored from persisted state",
        };
        interrupted.push(id);
      }
    }

    return {
      restoredSessions: sessions.size,
      interruptedSessions: interrupted,
      spawnCounter: state.spawnCounter,
    };
  }

  /**
   * Append a completed session to the history log (JSONL).
   */
  appendHistory(session: Session): void {
    if (!this.config.historyPath) return;

    const entry: HistoryEntry = {
      sessionId: session.sessionId,
      agentId: session.agentId,
      agentName: session.agentName,
      taskId: session.taskId,
      state: session.state,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      duration: session.completedAt
        ? session.completedAt - (session.startedAt ?? session.createdAt)
        : undefined,
      tokensUsed: session.tokensUsed,
      fileWriteCount: session.fileWriteCount,
      resultStatus: session.result?.status,
      error: session.result?.error,
      timestamp: Date.now(),
    };

    const line = JSON.stringify(entry) + "\n";

    try {
      const { appendFileSync } = require("node:fs") as typeof import("node:fs");
      appendFileSync(this.config.historyPath, line, "utf8");
    } catch {
      // Non-critical — history is supplementary
    }

    this.compactHistoryIfNeeded();
  }

  /**
   * Read session history from the JSONL file.
   */
  readHistory(limit?: number): HistoryEntry[] {
    if (!this.config.historyPath) return [];

    let data: string;
    try {
      data = readFileSync(this.config.historyPath, "utf8");
    } catch {
      return [];
    }

    const entries: HistoryEntry[] = [];
    for (const line of data.split("\n")) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line) as HistoryEntry);
      } catch {
        // Skip malformed lines
      }
    }

    if (limit && entries.length > limit) {
      return entries.slice(-limit);
    }

    return entries;
  }

  /**
   * Compact history file if it exceeds max entries.
   * Keeps the most recent entries.
   */
  private compactHistoryIfNeeded(): void {
    if (!this.config.historyPath) return;

    const entries = this.readHistory();
    if (entries.length <= this.config.maxHistoryEntries) return;

    const keep = entries.slice(-this.config.maxHistoryEntries);
    const data = keep.map((e) => JSON.stringify(e)).join("\n") + "\n";

    const tmpPath = `${this.config.historyPath}.tmp`;
    writeFileSync(tmpPath, data, "utf8");
    renameSync(tmpPath, this.config.historyPath);
  }
}
