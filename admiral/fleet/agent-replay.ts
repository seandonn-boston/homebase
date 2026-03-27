/**
 * Agent Replay and Debugging (IF-08)
 *
 * Record and replay agent sessions. Captures tool invocations,
 * hook executions, brain queries, handoffs, and model API calls.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReplayEventType = "tool" | "hook" | "brain-query" | "handoff" | "model-call";

export interface ReplayEvent {
  id: string;
  timestamp: string;
  type: ReplayEventType;
  agentId: string;
  data: Record<string, unknown>;
  durationMs: number;
}

export interface SessionRecording {
  sessionId: string;
  agentId: string;
  startedAt: string;
  endedAt: string | null;
  events: ReplayEvent[];
  metadata: Record<string, unknown>;
}

export interface ReplayComparison {
  sessionA: string;
  sessionB: string;
  eventCountDiff: number;
  durationDiff: number;
  divergencePoints: { index: number; typeA: string; typeB: string }[];
}

// ---------------------------------------------------------------------------
// Session Recorder
// ---------------------------------------------------------------------------

export class SessionRecorder {
  private recordings: Map<string, SessionRecording> = new Map();
  private maxRetentionDays: number;

  constructor(maxRetentionDays = 30) {
    this.maxRetentionDays = maxRetentionDays;
  }

  startSession(agentId: string, metadata: Record<string, unknown> = {}): string {
    const sessionId = randomUUID();
    this.recordings.set(sessionId, {
      sessionId, agentId,
      startedAt: new Date().toISOString(),
      endedAt: null, events: [], metadata,
    });
    return sessionId;
  }

  recordEvent(sessionId: string, type: ReplayEventType, agentId: string, data: Record<string, unknown>, durationMs: number): ReplayEvent | null {
    const recording = this.recordings.get(sessionId);
    if (!recording) return null;
    const event: ReplayEvent = {
      id: randomUUID(), timestamp: new Date().toISOString(),
      type, agentId, data, durationMs,
    };
    recording.events.push(event);
    return event;
  }

  endSession(sessionId: string): boolean {
    const recording = this.recordings.get(sessionId);
    if (!recording) return false;
    recording.endedAt = new Date().toISOString();
    return true;
  }

  getRecording(sessionId: string): SessionRecording | undefined {
    return this.recordings.get(sessionId);
  }

  compare(sessionA: string, sessionB: string): ReplayComparison | null {
    const a = this.recordings.get(sessionA);
    const b = this.recordings.get(sessionB);
    if (!a || !b) return null;

    const divergencePoints: ReplayComparison["divergencePoints"] = [];
    const minLen = Math.min(a.events.length, b.events.length);
    for (let i = 0; i < minLen; i++) {
      if (a.events[i].type !== b.events[i].type) {
        divergencePoints.push({ index: i, typeA: a.events[i].type, typeB: b.events[i].type });
      }
    }

    const durationA = a.events.reduce((s, e) => s + e.durationMs, 0);
    const durationB = b.events.reduce((s, e) => s + e.durationMs, 0);

    return {
      sessionA, sessionB,
      eventCountDiff: a.events.length - b.events.length,
      durationDiff: durationA - durationB,
      divergencePoints,
    };
  }

  anonymize(sessionId: string): boolean {
    const recording = this.recordings.get(sessionId);
    if (!recording) return false;
    recording.agentId = "anonymized";
    recording.metadata = {};
    for (const event of recording.events) {
      event.agentId = "anonymized";
      event.data = { type: event.type, durationMs: event.durationMs };
    }
    return true;
  }

  cleanup(): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.maxRetentionDays);
    const cutoffStr = cutoff.toISOString();
    let removed = 0;
    for (const [id, rec] of this.recordings) {
      if (rec.endedAt && rec.endedAt < cutoffStr) {
        this.recordings.delete(id);
        removed++;
      }
    }
    return removed;
  }

  getSessionCount(): number {
    return this.recordings.size;
  }
}
