/**
 * Governance Framework + Event Bus (MG-01, MG-05)
 *
 * Central governance event bus with ring-buffer storage, subscriber filtering,
 * and an abstract GovernanceAgent base class for building governance monitors.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types & Enums
// ---------------------------------------------------------------------------

export type GovernanceEventType =
  | "scope_drift"
  | "budget_overrun"
  | "loop_detected"
  | "trust_violation"
  | "conflict"
  | "intervention"
  | "compliance_finding"
  | "agent_failure";

export interface GovernanceEvent {
  id: string;
  timestamp: number;
  type: GovernanceEventType;
  sourceAgent?: string;
  targetAgent?: string;
  severity: "critical" | "high" | "medium" | "low";
  data: Record<string, unknown>;
}

export interface EventFilter {
  types?: GovernanceEventType[];
  severity?: ("critical" | "high" | "medium" | "low")[];
  sourceAgent?: string;
  targetAgent?: string;
  since?: number;
}

export enum InterventionLevel {
  Warn = 1,
  Restrict = 2,
  Suspend = 3,
  Terminate = 4,
}

export interface GovernanceFinding {
  agentId: string;
  type: GovernanceEventType;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  evidence: Record<string, unknown>;
  recommendedAction: InterventionLevel;
}

export interface InterventionRequest {
  id: string;
  level: InterventionLevel;
  targetAgent: string;
  requestedBy: string;
  reason: string;
  timestamp: number;
  status: "pending" | "approved" | "rejected" | "executed";
}

// ---------------------------------------------------------------------------
// Internal ring buffer (lightweight, avoids cross-module import)
// ---------------------------------------------------------------------------

class RingBuffer<T> {
  private buf: (T | undefined)[];
  private head = 0;
  private count = 0;
  private readonly cap: number;

  constructor(capacity: number) {
    if (capacity < 1) throw new Error("RingBuffer capacity must be >= 1");
    this.cap = capacity;
    this.buf = new Array(capacity);
  }

  push(item: T): void {
    if (this.count < this.cap) {
      this.buf[(this.head + this.count) % this.cap] = item;
      this.count++;
    } else {
      this.buf[this.head] = item;
      this.head = (this.head + 1) % this.cap;
    }
  }

  get size(): number {
    return this.count;
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      result.push(this.buf[(this.head + i) % this.cap] as T);
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Event matching helper
// ---------------------------------------------------------------------------

function matchesFilter(event: GovernanceEvent, filter: EventFilter): boolean {
  if (filter.types && !filter.types.includes(event.type)) return false;
  if (filter.severity && !filter.severity.includes(event.severity)) return false;
  if (filter.sourceAgent && event.sourceAgent !== filter.sourceAgent) return false;
  if (filter.targetAgent && event.targetAgent !== filter.targetAgent) return false;
  if (filter.since != null && event.timestamp < filter.since) return false;
  return true;
}

// ---------------------------------------------------------------------------
// GovernanceEventBus (MG-05)
// ---------------------------------------------------------------------------

interface Subscription {
  id: string;
  filter: EventFilter;
  callback: (event: GovernanceEvent) => void;
}

export class GovernanceEventBus {
  private events: RingBuffer<GovernanceEvent>;
  private subscriptions: Map<string, Subscription> = new Map();

  constructor(maxEvents: number = 5000) {
    this.events = new RingBuffer(maxEvents);
  }

  emit(partial: Omit<GovernanceEvent, "id" | "timestamp">): GovernanceEvent {
    const event: GovernanceEvent = {
      ...partial,
      id: `gov_${randomUUID()}`,
      timestamp: Date.now(),
    };
    this.events.push(event);

    for (const sub of this.subscriptions.values()) {
      if (matchesFilter(event, sub.filter)) {
        sub.callback(event);
      }
    }

    return event;
  }

  subscribe(
    filter: EventFilter,
    callback: (event: GovernanceEvent) => void,
  ): string {
    const id = `sub_${randomUUID()}`;
    this.subscriptions.set(id, { id, filter, callback });
    return id;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  getHistory(filter?: EventFilter): GovernanceEvent[] {
    const all = this.events.toArray();
    if (!filter) return all;
    return all.filter((e) => matchesFilter(e, filter));
  }

  getRecentEvents(windowMs: number): GovernanceEvent[] {
    const cutoff = Date.now() - windowMs;
    return this.events.toArray().filter((e) => e.timestamp >= cutoff);
  }
}

// ---------------------------------------------------------------------------
// GovernanceAgent abstract class (MG-01)
// ---------------------------------------------------------------------------

export abstract class GovernanceAgent {
  abstract readonly agentId: string;
  abstract readonly name: string;

  protected bus: GovernanceEventBus;
  protected interventionAuthority: InterventionLevel;

  /** Self-governance: agents cannot modify their own rules. */
  readonly selfModificationProhibited: true = true;

  constructor(bus: GovernanceEventBus, authority: InterventionLevel = InterventionLevel.Warn) {
    this.bus = bus;
    this.interventionAuthority = authority;
  }

  abstract analyze(events: GovernanceEvent[]): GovernanceFinding[];

  protected emitFinding(finding: GovernanceFinding): void {
    this.bus.emit({
      type: finding.type,
      severity: finding.severity,
      sourceAgent: this.agentId,
      targetAgent: finding.agentId,
      data: {
        description: finding.description,
        evidence: finding.evidence,
        recommendedAction: finding.recommendedAction,
      },
    });
  }

  protected requestIntervention(
    level: InterventionLevel,
    target: string,
    reason: string,
  ): InterventionRequest {
    if (level > this.interventionAuthority) {
      throw new Error(
        `Agent ${this.agentId} lacks authority for intervention level ${level} (max: ${this.interventionAuthority})`,
      );
    }

    const request: InterventionRequest = {
      id: `int_${randomUUID()}`,
      level,
      targetAgent: target,
      requestedBy: this.agentId,
      reason,
      timestamp: Date.now(),
      status: "pending",
    };

    this.bus.emit({
      type: "intervention",
      severity: level >= InterventionLevel.Suspend ? "critical" : "high",
      sourceAgent: this.agentId,
      targetAgent: target,
      data: { interventionRequest: request },
    });

    return request;
  }
}
