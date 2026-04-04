/**
 * Admiral Framework — Execution Limits & Retry Handler (EX-04)
 *
 * Enforces per-session resource limits (wall-clock timeout, token budget,
 * file-write cap), manages retry logic with exponential backoff, and
 * emits escalation events when permanent failures occur.
 *
 * Design:
 * - Wraps ExecutionRuntime to add automatic limit enforcement
 * - Configurable max retries with exponential backoff
 * - Permanent failures (all retries exhausted) emit escalation events
 * - All limit types are configurable per agent or per task
 */

import type { EventStream } from "./events";
import type { ExecutionRuntime, Session, SessionConfig } from "./execution-runtime";

// ── Types ──────────────────────────────────────────────────────

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface LimitEnforcerConfig {
  retryPolicy: RetryPolicy;
  checkIntervalMs: number;
}

export interface RetryRecord {
  taskId: string;
  sessionConfig: SessionConfig;
  attemptCount: number;
  failures: FailureRecord[];
  nextRetryAt?: number;
  exhausted: boolean;
}

export interface FailureRecord {
  attempt: number;
  sessionId: string;
  reason: string;
  limitType?: string;
  timestamp: number;
}

export interface EscalationEvent {
  taskId: string;
  agentId: string;
  reason: string;
  attemptCount: number;
  failures: FailureRecord[];
  timestamp: number;
}

// ── Defaults ───────────────────────────────────────────────────

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

const DEFAULT_CONFIG: LimitEnforcerConfig = {
  retryPolicy: DEFAULT_RETRY_POLICY,
  checkIntervalMs: 1000,
};

// ── LimitEnforcer ──────────────────────────────────────────────

export class LimitEnforcer {
  private runtime: ExecutionRuntime;
  private stream: EventStream;
  private config: LimitEnforcerConfig;
  private retryRecords: Map<string, RetryRecord> = new Map();
  private checkTimer: ReturnType<typeof setInterval> | undefined;
  private retryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private escalationListeners: ((event: EscalationEvent) => void)[] = [];

  constructor(
    runtime: ExecutionRuntime,
    stream: EventStream,
    config?: Partial<LimitEnforcerConfig>,
  ) {
    this.runtime = runtime;
    this.stream = stream;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      retryPolicy: { ...DEFAULT_RETRY_POLICY, ...config?.retryPolicy },
    };
  }

  /**
   * Start periodic limit checking for all running sessions.
   */
  start(): void {
    if (this.checkTimer) return;

    this.checkTimer = setInterval(() => {
      this.checkAllLimits();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop periodic limit checking and clear all retry timers.
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }

    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
  }

  /**
   * Register a listener for escalation events (permanent failures).
   */
  onEscalation(listener: (event: EscalationEvent) => void): () => void {
    this.escalationListeners.push(listener);
    return () => {
      this.escalationListeners = this.escalationListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Register a task for retry tracking. Call this when spawning a session
   * that should be retried on failure.
   */
  registerForRetry(
    taskId: string,
    sessionConfig: SessionConfig,
    _policy?: Partial<RetryPolicy>,
  ): void {
    this.retryRecords.set(taskId, {
      taskId,
      sessionConfig,
      attemptCount: 1,
      failures: [],
      exhausted: false,
    });
  }

  /**
   * Handle a session failure. If retries remain, schedule a retry.
   * If retries are exhausted, emit an escalation event.
   */
  handleFailure(session: Session, reason: string, limitType?: string): RetryRecord | undefined {
    const taskId = session.taskId;
    const record = this.retryRecords.get(taskId);

    if (!record) return undefined;

    const failure: FailureRecord = {
      attempt: record.attemptCount,
      sessionId: session.sessionId,
      reason,
      limitType,
      timestamp: Date.now(),
    };

    record.failures.push(failure);

    if (record.attemptCount >= this.config.retryPolicy.maxRetries + 1) {
      // All retries exhausted — escalate
      record.exhausted = true;
      this.emitEscalation(record);
      return record;
    }

    // Schedule retry with exponential backoff
    record.attemptCount++;
    const delay = this.calculateBackoff(record.attemptCount - 1);
    record.nextRetryAt = Date.now() + delay;

    const timer = setTimeout(() => {
      this.retryTimers.delete(taskId);
      this.executeRetry(record);
    }, delay);
    this.retryTimers.set(taskId, timer);

    return record;
  }

  /**
   * Check all running sessions for limit violations.
   */
  checkAllLimits(): void {
    const runningSessions = this.runtime.getSessionsByState("running");

    for (const session of runningSessions) {
      const limitType = this.runtime.checkLimits(session.sessionId);
      if (limitType) {
        this.runtime.limitSession(session.sessionId, limitType);
        this.handleFailure(session, `Exceeded ${limitType}`, limitType);
      }
    }
  }

  /**
   * Get retry record for a task.
   */
  getRetryRecord(taskId: string): RetryRecord | undefined {
    return this.retryRecords.get(taskId);
  }

  /**
   * Get all retry records.
   */
  getAllRetryRecords(): RetryRecord[] {
    return Array.from(this.retryRecords.values());
  }

  /**
   * Get all escalated (permanently failed) tasks.
   */
  getEscalatedTasks(): RetryRecord[] {
    return this.getAllRetryRecords().filter((r) => r.exhausted);
  }

  // ── Private helpers ────────────────────────────────────────

  private calculateBackoff(attempt: number): number {
    const delay =
      this.config.retryPolicy.baseDelayMs *
      this.config.retryPolicy.backoffMultiplier ** (attempt - 1);
    return Math.min(delay, this.config.retryPolicy.maxDelayMs);
  }

  private executeRetry(record: RetryRecord): void {
    try {
      const session = this.runtime.spawn(record.sessionConfig);
      this.runtime.startSession(session.sessionId);
    } catch (err) {
      // If spawn fails, treat as another failure
      const failure: FailureRecord = {
        attempt: record.attemptCount,
        sessionId: "spawn_failed",
        reason: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      };
      record.failures.push(failure);

      if (record.attemptCount >= this.config.retryPolicy.maxRetries + 1) {
        record.exhausted = true;
        this.emitEscalation(record);
      }
    }
  }

  private emitEscalation(record: RetryRecord): void {
    const event: EscalationEvent = {
      taskId: record.taskId,
      agentId: record.sessionConfig.agentId,
      reason: `All ${record.attemptCount} attempts failed`,
      attemptCount: record.attemptCount,
      failures: record.failures,
      timestamp: Date.now(),
    };

    // Emit to EventStream
    this.stream.emit(record.sessionConfig.agentId, record.sessionConfig.agentName, "task_failed", {
      runtimeEvent: "session.escalation",
      escalation: event,
    });

    // Notify listeners
    for (const listener of this.escalationListeners) {
      listener(event);
    }
  }
}
