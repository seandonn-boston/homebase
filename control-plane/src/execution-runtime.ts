/**
 * Admiral Framework — Agent Execution Runtime (EX-01)
 *
 * Core engine that spawns agent sessions, manages their lifecycle,
 * tracks execution state, and emits lifecycle events. This is the
 * piece that turns Admiral from a policy engine into an operating
 * system for agent fleets.
 *
 * Design principles:
 * - Decoupled: sits outside agents, observes via events
 * - Event-driven: every state transition emits to EventStream
 * - Fleet-aware: resolves agent definitions, respects constraints
 * - Thermal-integrated: tracks token budgets per session
 */

import type { AgentEvent, EventStream } from "./events";
import type { SessionThermalModel } from "./session-thermal";

// ── Types ──────────────────────────────────────────────────────

export type SessionState = "pending" | "running" | "complete" | "failed";

export interface SessionConfig {
  agentId: string;
  agentName: string;
  taskDescription: string;
  taskId?: string;
  tokenBudget?: number;
  wallClockTimeoutMs?: number;
  maxFileWrites?: number;
  metadata?: Record<string, unknown>;
}

export interface Session {
  sessionId: string;
  agentId: string;
  agentName: string;
  taskId: string;
  taskDescription: string;
  state: SessionState;
  tokenBudget: number;
  wallClockTimeoutMs: number;
  maxFileWrites: number;
  fileWriteCount: number;
  tokensUsed: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: SessionResult;
  metadata: Record<string, unknown>;
}

export interface SessionResult {
  status: "success" | "failure" | "timeout" | "limit_exceeded";
  output?: unknown;
  error?: string;
  limitType?: "wall_clock" | "token_budget" | "file_write_cap";
}

export interface RuntimeConfig {
  defaultWallClockTimeoutMs: number;
  defaultTokenBudget: number;
  defaultMaxFileWrites: number;
  maxConcurrentSessions: number;
}

export interface RuntimeStats {
  totalSpawned: number;
  totalCompleted: number;
  totalFailed: number;
  activeSessions: number;
  pendingSessions: number;
}

// ── Event types emitted by the runtime ─────────────────────────

export type RuntimeEventType =
  | "session.spawned"
  | "session.started"
  | "session.completed"
  | "session.failed"
  | "session.timeout"
  | "session.limit_exceeded";

// ── Defaults ───────────────────────────────────────────────────

const DEFAULT_CONFIG: RuntimeConfig = {
  defaultWallClockTimeoutMs: 5 * 60 * 1000, // 5 minutes
  defaultTokenBudget: 0, // 0 = unlimited
  defaultMaxFileWrites: 50,
  maxConcurrentSessions: 10,
};

// ── ExecutionRuntime ───────────────────────────────────────────

export class ExecutionRuntime {
  private sessions: Map<string, Session> = new Map();
  private config: RuntimeConfig;
  private stream: EventStream;
  private thermal: SessionThermalModel | undefined;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private spawnCounter = 0;

  constructor(stream: EventStream, config?: Partial<RuntimeConfig>, thermal?: SessionThermalModel) {
    this.stream = stream;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.thermal = thermal;
  }

  /**
   * Spawn a new agent session. The session starts in "pending" state.
   * Call startSession() to transition it to "running".
   */
  spawn(sessionConfig: SessionConfig): Session {
    const activeSessions = this.getSessionsByState("running").length;
    if (activeSessions >= this.config.maxConcurrentSessions) {
      throw new Error(
        `Max concurrent sessions (${this.config.maxConcurrentSessions}) reached. ` +
          `Wait for a session to complete or increase maxConcurrentSessions. ` +
          `Agent: ${sessionConfig.agentId}.`,
      );
    }

    this.spawnCounter++;
    const sessionId = `ses_${Date.now()}_${this.spawnCounter}`;
    const taskId = sessionConfig.taskId ?? `task_${Date.now()}_${this.spawnCounter}`;

    const session: Session = {
      sessionId,
      agentId: sessionConfig.agentId,
      agentName: sessionConfig.agentName,
      taskId,
      taskDescription: sessionConfig.taskDescription,
      state: "pending",
      tokenBudget: sessionConfig.tokenBudget ?? this.config.defaultTokenBudget,
      wallClockTimeoutMs: sessionConfig.wallClockTimeoutMs ?? this.config.defaultWallClockTimeoutMs,
      maxFileWrites: sessionConfig.maxFileWrites ?? this.config.defaultMaxFileWrites,
      fileWriteCount: 0,
      tokensUsed: 0,
      createdAt: Date.now(),
      metadata: sessionConfig.metadata ?? {},
    };

    this.sessions.set(sessionId, session);

    // Initialize thermal tracking if available
    if (this.thermal) {
      this.thermal.createSession(sessionId, session.tokenBudget);
    }

    // Emit spawn event
    this.emitLifecycleEvent(session, "session.spawned", {
      taskDescription: session.taskDescription,
      tokenBudget: session.tokenBudget,
      wallClockTimeoutMs: session.wallClockTimeoutMs,
      maxFileWrites: session.maxFileWrites,
    });

    return session;
  }

  /**
   * Transition a session from "pending" to "running".
   * Starts the wall-clock timeout timer.
   */
  startSession(sessionId: string): Session {
    const session = this.getSessionOrThrow(sessionId);

    if (session.state !== "pending") {
      throw new Error(
        `Cannot start session ${sessionId}: state is "${session.state}", expected "pending".`,
      );
    }

    session.state = "running";
    session.startedAt = Date.now();

    // Start wall-clock timeout
    if (session.wallClockTimeoutMs > 0) {
      const timer = setTimeout(() => {
        this.timeoutSession(sessionId);
      }, session.wallClockTimeoutMs);
      this.timers.set(sessionId, timer);
    }

    this.emitLifecycleEvent(session, "session.started", {});

    return session;
  }

  /**
   * Record token consumption for a session.
   * Returns the updated session. Does NOT enforce limits —
   * limit enforcement is handled by checkLimits().
   */
  recordTokens(sessionId: string, tokens: number): Session {
    const session = this.getSessionOrThrow(sessionId);

    if (session.state !== "running") {
      throw new Error(
        `Cannot record tokens for session ${sessionId}: state is "${session.state}".`,
      );
    }

    session.tokensUsed += tokens;

    if (this.thermal) {
      this.thermal.recordConsumption(sessionId, tokens);
    }

    return session;
  }

  /**
   * Record a file write for a session.
   */
  recordFileWrite(sessionId: string): Session {
    const session = this.getSessionOrThrow(sessionId);

    if (session.state !== "running") {
      throw new Error(
        `Cannot record file write for session ${sessionId}: state is "${session.state}".`,
      );
    }

    session.fileWriteCount++;
    return session;
  }

  /**
   * Check if a session has exceeded any resource limits.
   * Returns the limit type that was exceeded, or null if within limits.
   */
  checkLimits(sessionId: string): "token_budget" | "file_write_cap" | null {
    const session = this.getSessionOrThrow(sessionId);

    if (session.tokenBudget > 0 && session.tokensUsed > session.tokenBudget) {
      return "token_budget";
    }

    if (session.fileWriteCount > session.maxFileWrites) {
      return "file_write_cap";
    }

    return null;
  }

  /**
   * Complete a session successfully.
   */
  completeSession(sessionId: string, output?: unknown): Session {
    const session = this.getSessionOrThrow(sessionId);

    if (session.state !== "running") {
      throw new Error(
        `Cannot complete session ${sessionId}: state is "${session.state}", expected "running".`,
      );
    }

    session.state = "complete";
    session.completedAt = Date.now();
    session.result = { status: "success", output };

    this.clearTimer(sessionId);

    this.emitLifecycleEvent(session, "session.completed", {
      duration: session.completedAt - (session.startedAt ?? session.createdAt),
      tokensUsed: session.tokensUsed,
      fileWrites: session.fileWriteCount,
    });

    return session;
  }

  /**
   * Fail a session with an error.
   */
  failSession(sessionId: string, error: string): Session {
    const session = this.getSessionOrThrow(sessionId);

    if (session.state !== "running" && session.state !== "pending") {
      throw new Error(`Cannot fail session ${sessionId}: state is "${session.state}".`);
    }

    session.state = "failed";
    session.completedAt = Date.now();
    session.result = { status: "failure", error };

    this.clearTimer(sessionId);

    this.emitLifecycleEvent(session, "session.failed", {
      error,
      duration: session.completedAt - (session.startedAt ?? session.createdAt),
      tokensUsed: session.tokensUsed,
    });

    return session;
  }

  /**
   * Terminate a session due to a resource limit being exceeded.
   */
  limitSession(
    sessionId: string,
    limitType: "token_budget" | "file_write_cap" | "wall_clock",
  ): Session {
    const session = this.getSessionOrThrow(sessionId);

    if (session.state !== "running") {
      throw new Error(`Cannot limit session ${sessionId}: state is "${session.state}".`);
    }

    session.state = "failed";
    session.completedAt = Date.now();
    session.result = {
      status: "limit_exceeded",
      limitType,
      error: `Session exceeded ${limitType} limit`,
    };

    this.clearTimer(sessionId);

    this.emitLifecycleEvent(session, "session.limit_exceeded", {
      limitType,
      duration: session.completedAt - (session.startedAt ?? session.createdAt),
      tokensUsed: session.tokensUsed,
      fileWrites: session.fileWriteCount,
    });

    return session;
  }

  // ── Queries ────────────────────────────────────────────────

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionsByState(state: SessionState): Session[] {
    const results: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.state === state) {
        results.push(session);
      }
    }
    return results;
  }

  getSessionsByAgent(agentId: string): Session[] {
    const results: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.agentId === agentId) {
        results.push(session);
      }
    }
    return results;
  }

  getSessionsByTask(taskId: string): Session[] {
    const results: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.taskId === taskId) {
        results.push(session);
      }
    }
    return results;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getStats(): RuntimeStats {
    let totalCompleted = 0;
    let totalFailed = 0;
    let activeSessions = 0;
    let pendingSessions = 0;

    for (const session of this.sessions.values()) {
      switch (session.state) {
        case "complete":
          totalCompleted++;
          break;
        case "failed":
          totalFailed++;
          break;
        case "running":
          activeSessions++;
          break;
        case "pending":
          pendingSessions++;
          break;
      }
    }

    return {
      totalSpawned: this.spawnCounter,
      totalCompleted,
      totalFailed,
      activeSessions,
      pendingSessions,
    };
  }

  /**
   * Shut down the runtime: cancel all timers and fail any running sessions.
   */
  shutdown(): void {
    for (const [sessionId, timer] of this.timers) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }

    for (const session of this.sessions.values()) {
      if (session.state === "running" || session.state === "pending") {
        session.state = "failed";
        session.completedAt = Date.now();
        session.result = { status: "failure", error: "Runtime shutdown" };
      }
    }
  }

  // ── Private helpers ────────────────────────────────────────

  private getSessionOrThrow(sessionId: string): Session {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  private clearTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }

  private timeoutSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== "running") return;

    this.limitSession(sessionId, "wall_clock");
  }

  private emitLifecycleEvent(
    session: Session,
    eventType: RuntimeEventType,
    data: Record<string, unknown>,
  ): AgentEvent {
    // Map runtime event types to EventStream types
    const streamType = this.mapEventType(eventType);

    return this.stream.emit(
      session.agentId,
      session.agentName,
      streamType,
      {
        sessionId: session.sessionId,
        runtimeEvent: eventType,
        ...data,
      },
      undefined,
      session.taskId,
    );
  }

  private mapEventType(
    runtimeEvent: RuntimeEventType,
  ): "agent_started" | "agent_stopped" | "task_completed" | "task_failed" {
    switch (runtimeEvent) {
      case "session.spawned":
        return "agent_started";
      case "session.started":
        return "agent_started";
      case "session.completed":
        return "task_completed";
      case "session.failed":
        return "task_failed";
      case "session.timeout":
        return "task_failed";
      case "session.limit_exceeded":
        return "task_failed";
    }
  }
}
