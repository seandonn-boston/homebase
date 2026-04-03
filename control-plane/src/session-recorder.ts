/**
 * Admiral Framework — Session Recording (IF-08)
 *
 * Records tool invocations, hook executions, brain queries, and
 * handoffs during a session. Supports retention policies and
 * anonymization for compliance.
 */

export type EventKind = "tool" | "hook" | "brain-query" | "handoff" | "decision" | "error";

export interface RecordedEvent {
  seq: number;
  kind: EventKind;
  timestamp: string;
  agentId: string;
  detail: Record<string, unknown>;
  durationMs: number;
  success: boolean;
}

export interface SessionRecording {
  sessionId: string;
  agentId: string;
  startedAt: string;
  endedAt: string | null;
  events: RecordedEvent[];
  metadata: Record<string, unknown>;
  anonymized: boolean;
}

export interface RetentionPolicy {
  maxAgeDays: number;
  maxRecordings: number;
  anonymizeAfterDays: number;
}

const DEFAULT_RETENTION: RetentionPolicy = {
  maxAgeDays: 90,
  maxRecordings: 10_000,
  anonymizeAfterDays: 30,
};

const SENSITIVE_KEYS = ["password", "secret", "token", "key", "credential", "auth"];

function anonymizeValue(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
      result[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      result[k] = anonymizeValue(v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}

/**
 * Records events during agent sessions for later replay and analysis.
 */
export class SessionRecorder {
  private recordings: Map<string, SessionRecording> = new Map();
  private retention: RetentionPolicy;
  private seqCounters: Map<string, number> = new Map();

  constructor(retention?: Partial<RetentionPolicy>) {
    this.retention = { ...DEFAULT_RETENTION, ...retention };
  }

  /**
   * Start recording a new session.
   */
  startSession(
    sessionId: string,
    agentId: string,
    metadata: Record<string, unknown> = {},
  ): SessionRecording {
    if (this.recordings.has(sessionId)) {
      throw new Error(`Session '${sessionId}' already being recorded.`);
    }
    const rec: SessionRecording = {
      sessionId,
      agentId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      events: [],
      metadata,
      anonymized: false,
    };
    this.recordings.set(sessionId, rec);
    this.seqCounters.set(sessionId, 0);
    this.enforceRetention();
    return rec;
  }

  /**
   * Record an event in an active session.
   */
  recordEvent(
    sessionId: string,
    kind: EventKind,
    agentId: string,
    detail: Record<string, unknown>,
    durationMs: number,
    success: boolean,
  ): RecordedEvent {
    const rec = this.recordings.get(sessionId);
    if (!rec) throw new Error(`Session '${sessionId}' not found.`);
    if (rec.endedAt) throw new Error(`Session '${sessionId}' already ended.`);

    const seq = (this.seqCounters.get(sessionId) ?? 0) + 1;
    this.seqCounters.set(sessionId, seq);

    const event: RecordedEvent = {
      seq,
      kind,
      timestamp: new Date().toISOString(),
      agentId,
      detail,
      durationMs,
      success,
    };
    rec.events.push(event);
    return event;
  }

  /**
   * End a session recording.
   */
  endSession(sessionId: string): SessionRecording | undefined {
    const rec = this.recordings.get(sessionId);
    if (!rec) return undefined;
    rec.endedAt = new Date().toISOString();
    return rec;
  }

  /**
   * Get a session recording.
   */
  getRecording(sessionId: string): SessionRecording | undefined {
    return this.recordings.get(sessionId);
  }

  /**
   * Anonymize a session recording (redact sensitive fields).
   */
  anonymize(sessionId: string): boolean {
    const rec = this.recordings.get(sessionId);
    if (!rec || rec.anonymized) return false;
    for (const event of rec.events) {
      event.detail = anonymizeValue(event.detail);
    }
    rec.metadata = anonymizeValue(rec.metadata);
    rec.anonymized = true;
    return true;
  }

  /**
   * Export a recording as a serializable object.
   */
  exportRecording(sessionId: string): SessionRecording | undefined {
    const rec = this.recordings.get(sessionId);
    if (!rec) return undefined;
    return JSON.parse(JSON.stringify(rec));
  }

  /**
   * Import a previously exported recording.
   */
  importRecording(recording: SessionRecording): void {
    this.recordings.set(recording.sessionId, recording);
  }

  /**
   * List all session IDs.
   */
  listSessions(): string[] {
    return [...this.recordings.keys()];
  }

  /**
   * Enforce retention policy — drop oldest recordings if over limit.
   */
  private enforceRetention(): void {
    if (this.recordings.size <= this.retention.maxRecordings) return;
    const sorted = [...this.recordings.entries()].sort(
      (a, b) => new Date(a[1].startedAt).getTime() - new Date(b[1].startedAt).getTime(),
    );
    const toRemove = sorted.length - this.retention.maxRecordings;
    for (let i = 0; i < toRemove; i++) {
      this.recordings.delete(sorted[i][0]);
    }
  }
}
