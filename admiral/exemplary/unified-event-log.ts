/**
 * Cross-System Unified Event Log (X-07)
 *
 * Single JSONL event log for shell hooks and TypeScript control plane.
 * Query interface with filtering.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventSource = "hook" | "control-plane" | "brain" | "fleet" | "governance";

export interface UnifiedEvent {
  id: string;
  timestamp: string;
  source: EventSource;
  eventType: string;
  sessionId: string;
  agentId: string | null;
  data: Record<string, unknown>;
}

export interface EventQuery {
  source?: EventSource;
  eventType?: string;
  sessionId?: string;
  timeRange?: { start: string; end: string };
  limit?: number;
}

// ---------------------------------------------------------------------------
// Event Log
// ---------------------------------------------------------------------------

export class UnifiedEventLog {
  private events: UnifiedEvent[] = [];
  private filePath: string | null;
  private maxInMemory: number;

  constructor(filePath?: string, maxInMemory = 10000) {
    this.filePath = filePath ?? null;
    this.maxInMemory = maxInMemory;
  }

  append(event: Omit<UnifiedEvent, "id" | "timestamp">): UnifiedEvent {
    const full: UnifiedEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    this.events.push(full);
    if (this.events.length > this.maxInMemory) {
      this.events = this.events.slice(-this.maxInMemory);
    }

    if (this.filePath) {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(this.filePath, JSON.stringify(full) + "\n", "utf-8");
    }

    return full;
  }

  query(q: EventQuery = {}): UnifiedEvent[] {
    let results = [...this.events];

    if (q.source) results = results.filter((e) => e.source === q.source);
    if (q.eventType) results = results.filter((e) => e.eventType === q.eventType);
    if (q.sessionId) results = results.filter((e) => e.sessionId === q.sessionId);
    if (q.timeRange) {
      results = results.filter((e) =>
        e.timestamp >= q.timeRange!.start && e.timestamp <= q.timeRange!.end,
      );
    }

    const limit = q.limit ?? 100;
    return results.slice(-limit);
  }

  loadFromFile(): number {
    if (!this.filePath || !existsSync(this.filePath)) return 0;
    const content = readFileSync(this.filePath, "utf-8");
    let loaded = 0;
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        this.events.push(JSON.parse(line));
        loaded++;
      } catch { /* skip malformed */ }
    }
    return loaded;
  }

  getCount(): number {
    return this.events.length;
  }
}
