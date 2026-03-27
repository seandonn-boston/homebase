/**
 * Admiral Framework — Governance Event Stream (GP-05)
 *
 * Server-Sent Events (SSE) endpoint plus polling endpoint for governance events.
 * Events are stored in a ring buffer and can be filtered by type, severity,
 * agent, and tenant. Supports replay from last-seen event ID after disconnect.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import type * as http from "node:http";
import { RingBuffer } from "./ring-buffer";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type GovernanceEventType =
  | "policy_violation"
  | "policy_created"
  | "policy_updated"
  | "policy_deactivated"
  | "agent_intervention"
  | "agent_started"
  | "agent_stopped"
  | "audit_event"
  | "fleet_status_change"
  | "budget_exceeded"
  | "health_check"
  | "config_changed"
  | "webhook_fired"
  | "report_generated"
  | "system_event";

export type GovernanceEventSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface GovernanceEvent {
  id: string;
  timestamp: string;
  type: GovernanceEventType;
  severity: GovernanceEventSeverity;
  source: string;
  detail: Record<string, unknown>;
  tenantId?: string;
  agentId?: string;
}

export interface EventStreamConfig {
  /**
   * Maximum number of events to buffer. Oldest are evicted when exceeded.
   * Default: 5000.
   */
  bufferCapacity: number;
}

export interface EventFilter {
  since?: string;
  type?: GovernanceEventType;
  severity?: GovernanceEventSeverity;
  agentId?: string;
  tenantId?: string;
  afterId?: string;
}

// ---------------------------------------------------------------------------
// SSE subscriber handle
// ---------------------------------------------------------------------------

interface SseSubscriber {
  id: string;
  res: http.ServerResponse;
  filter: EventFilter;
  lastEventId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseQuery(url: string): Record<string, string> {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return {};
  const qs = url.slice(qIdx + 1);
  const result: Record<string, string> = {};
  for (const pair of qs.split("&")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) {
      result[decodeURIComponent(pair)] = "";
    } else {
      result[decodeURIComponent(pair.slice(0, eqIdx))] = decodeURIComponent(pair.slice(eqIdx + 1));
    }
  }
  return result;
}

function pathOnly(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

function matchesFilter(event: GovernanceEvent, filter: EventFilter): boolean {
  if (filter.type && event.type !== filter.type) return false;
  if (filter.severity && event.severity !== filter.severity) return false;
  if (filter.agentId && event.agentId !== filter.agentId) return false;
  if (filter.tenantId && event.tenantId !== filter.tenantId) return false;
  if (filter.since) {
    const sinceMs = Date.parse(filter.since);
    if (!Number.isNaN(sinceMs) && Date.parse(event.timestamp) < sinceMs) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// GovernanceEventStream
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: EventStreamConfig = {
  bufferCapacity: 5_000,
};

export class GovernanceEventStream {
  private buffer: RingBuffer<GovernanceEvent>;
  private subscribers: Map<string, SseSubscriber> = new Map();
  private config: EventStreamConfig;

  constructor(config: Partial<EventStreamConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.buffer = new RingBuffer<GovernanceEvent>(this.config.bufferCapacity);
  }

  // -------------------------------------------------------------------------
  // Emit — store event and push to SSE subscribers
  // -------------------------------------------------------------------------

  emit(
    type: GovernanceEventType,
    severity: GovernanceEventSeverity,
    source: string,
    detail: Record<string, unknown> = {},
    opts: { tenantId?: string; agentId?: string } = {},
  ): GovernanceEvent {
    const event: GovernanceEvent = {
      id: `gevt_${randomUUID()}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      source,
      detail,
      tenantId: opts.tenantId,
      agentId: opts.agentId,
    };

    this.buffer.push(event);
    this.pushToSubscribers(event);
    return event;
  }

  private pushToSubscribers(event: GovernanceEvent): void {
    for (const [id, sub] of this.subscribers) {
      if (!matchesFilter(event, sub.filter)) continue;
      try {
        sub.res.write(`id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`);
        sub.lastEventId = event.id;
      } catch {
        // Subscriber disconnected — clean up
        this.subscribers.delete(id);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Query — filter buffered events
  // -------------------------------------------------------------------------

  query(filter: EventFilter): GovernanceEvent[] {
    let events = this.buffer.toArray();

    // After-ID replay: find the event with that ID, return everything after
    if (filter.afterId) {
      const idx = events.findIndex((e) => e.id === filter.afterId);
      if (idx !== -1) {
        events = events.slice(idx + 1);
      }
    }

    return events.filter((e) => matchesFilter(e, filter));
  }

  // -------------------------------------------------------------------------
  // SSE subscription management
  // -------------------------------------------------------------------------

  subscribe(res: http.ServerResponse, filter: EventFilter): string {
    const subId = `sub_${randomUUID()}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.writeHead(200);

    // Send a comment to establish connection
    res.write(`:connected\n\n`);

    // Replay events since last-seen ID if provided
    if (filter.afterId) {
      const replay = this.query(filter);
      for (const event of replay) {
        try {
          res.write(`id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`);
        } catch {
          return subId;
        }
      }
    }

    const sub: SseSubscriber = { id: subId, res, filter };
    this.subscribers.set(subId, sub);

    // Remove subscriber on close
    res.on("close", () => {
      this.subscribers.delete(subId);
    });

    return subId;
  }

  unsubscribe(subId: string): boolean {
    return this.subscribers.delete(subId);
  }

  get subscriberCount(): number {
    return this.subscribers.size;
  }

  get bufferedEventCount(): number {
    return this.buffer.size;
  }

  // -------------------------------------------------------------------------
  // HTTP request handlers — to be mounted by the server
  // -------------------------------------------------------------------------

  handleSseRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const rawUrl = req.url ?? "/";
    const query = parseQuery(rawUrl);
    const filter: EventFilter = {
      type: query.type as GovernanceEventType | undefined,
      severity: query.severity as GovernanceEventSeverity | undefined,
      agentId: query.agentId,
      tenantId: query.tenantId,
      afterId: query.lastEventId,
    };
    this.subscribe(res, filter);
  }

  handlePollRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const rawUrl = req.url ?? "/";
    const query = parseQuery(rawUrl);
    const filter: EventFilter = {
      since: query.since,
      type: query.type as GovernanceEventType | undefined,
      severity: query.severity as GovernanceEventSeverity | undefined,
      agentId: query.agentId,
      tenantId: query.tenantId,
      afterId: query.afterId,
    };

    const events = this.query(filter);
    const payload = JSON.stringify(
      { success: true, data: events, metadata: { total: events.length } },
      null,
      2,
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(payload);
  }

  // -------------------------------------------------------------------------
  // Route matcher — returns true if it handled the request
  // -------------------------------------------------------------------------

  route(req: http.IncomingMessage, res: http.ServerResponse): boolean {
    const rawUrl = req.url ?? "/";
    const path = pathOnly(rawUrl);
    const method = req.method ?? "GET";

    if (path === "/api/v1/events/stream" && method === "GET") {
      this.handleSseRequest(req, res);
      return true;
    }

    if (path === "/api/v1/events" && method === "GET") {
      this.handlePollRequest(req, res);
      return true;
    }

    return false;
  }
}
