/**
 * Governance Event Streaming (GP-05)
 *
 * Exposes real-time governance events via SSE and polling endpoints.
 * Supports filtering by type, severity, agent, and tenant.
 * Buffers events for replay after disconnect.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GovernanceStreamEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  agent: string;
  tenant: string;
  data: Record<string, unknown>;
}

export interface StreamFilter {
  types?: string[];
  severity?: string[];
  agent?: string;
  tenant?: string;
  since?: string;
}

export type StreamSubscriber = (event: GovernanceStreamEvent) => void;

// ---------------------------------------------------------------------------
// Event Buffer
// ---------------------------------------------------------------------------

export class GovernanceEventStream {
  private buffer: GovernanceStreamEvent[] = [];
  private readonly maxBufferSize: number;
  private subscribers: Map<string, { filter: StreamFilter; callback: StreamSubscriber }> = new Map();

  constructor(maxBufferSize = 10000) {
    this.maxBufferSize = maxBufferSize;
  }

  emit(event: Omit<GovernanceStreamEvent, "id" | "timestamp">): GovernanceStreamEvent {
    const full: GovernanceStreamEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    this.buffer.push(full);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.maxBufferSize);
    }

    // Notify subscribers
    for (const [, sub] of this.subscribers) {
      if (matchesFilter(full, sub.filter)) {
        sub.callback(full);
      }
    }

    return full;
  }

  /**
   * Poll for events matching filter.
   */
  poll(filter: StreamFilter = {}, limit = 100): GovernanceStreamEvent[] {
    let events = this.buffer;

    if (filter.since) {
      events = events.filter((e) => e.timestamp > filter.since!);
    }

    events = events.filter((e) => matchesFilter(e, filter));

    return events.slice(-limit);
  }

  /**
   * Subscribe for real-time events.
   */
  subscribe(filter: StreamFilter, callback: StreamSubscriber): string {
    const id = randomUUID();
    this.subscribers.set(id, { filter, callback });
    return id;
  }

  unsubscribe(id: string): boolean {
    return this.subscribers.delete(id);
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Replay buffered events since a timestamp for reconnection.
   */
  replay(since: string, filter: StreamFilter = {}): GovernanceStreamEvent[] {
    return this.buffer
      .filter((e) => e.timestamp > since)
      .filter((e) => matchesFilter(e, filter));
  }
}

function matchesFilter(event: GovernanceStreamEvent, filter: StreamFilter): boolean {
  if (filter.types && filter.types.length > 0 && !filter.types.includes(event.type)) {
    return false;
  }
  if (filter.severity && filter.severity.length > 0 && !filter.severity.includes(event.severity)) {
    return false;
  }
  if (filter.agent && event.agent !== filter.agent) {
    return false;
  }
  if (filter.tenant && event.tenant !== filter.tenant) {
    return false;
  }
  return true;
}
