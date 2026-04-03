/**
 * Admiral Framework — Governance SDK SSE Events (GP-07)
 *
 * Handles SSE subscription with auto-reconnect logic.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import * as http from "node:http";
import * as https from "node:https";
import type { EventHandler, EventSubscriptionOptions, GovernanceStreamEvent } from "./types";

// ---------------------------------------------------------------------------
// SSE subscriber
// ---------------------------------------------------------------------------

export interface EventSubscription {
  /** Stop receiving events and close the connection. */
  close(): void;
  /** Whether the subscription is currently active. */
  readonly isActive: boolean;
}

export class SseEventSubscriber implements EventSubscription {
  private active = true;
  private request: http.ClientRequest | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEventId: string | undefined;
  private reconnectAttempt = 0;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly options: EventSubscriptionOptions,
    private readonly handler: EventHandler,
    private readonly initialBackoffMs: number = 200,
    private readonly maxReconnectAttempts: number = 10,
  ) {
    this.lastEventId = options.lastEventId;
    this.connect();
  }

  get isActive(): boolean {
    return this.active;
  }

  close(): void {
    this.active = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.request) {
      this.request.destroy();
      this.request = null;
    }
  }

  private buildPath(): string {
    const params = new URLSearchParams();
    if (this.options.type) params.set("type", this.options.type);
    if (this.options.severity) params.set("severity", this.options.severity);
    if (this.options.agentId) params.set("agentId", this.options.agentId);
    if (this.options.tenantId) params.set("tenantId", this.options.tenantId);
    if (this.lastEventId) params.set("lastEventId", this.lastEventId);
    const qs = params.toString();
    return `/api/v1/events/stream${qs ? `?${qs}` : ""}`;
  }

  private connect(): void {
    if (!this.active) return;

    const url = new URL(this.baseUrl);
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;

    const path = this.buildPath();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    };

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path,
      method: "GET",
      headers,
    };

    let buffer = "";

    const req = transport.request(options, (res) => {
      if (!this.active) {
        res.destroy();
        return;
      }

      this.reconnectAttempt = 0;

      res.setEncoding("utf-8");
      res.on("data", (chunk: string) => {
        buffer += chunk;
        // Process complete SSE messages (delimited by double newline)
        const messages = buffer.split("\n\n");
        buffer = messages.pop() ?? "";
        for (const message of messages) {
          this.processMessage(message);
        }
      });

      res.on("end", () => {
        if (this.active) this.scheduleReconnect();
      });

      res.on("error", () => {
        if (this.active) this.scheduleReconnect();
      });
    });

    req.on("error", () => {
      if (this.active) this.scheduleReconnect();
    });

    req.end();
    this.request = req;
  }

  private processMessage(message: string): void {
    let eventData: string | null = null;
    let eventId: string | null = null;

    for (const line of message.split("\n")) {
      if (line.startsWith("data: ")) {
        eventData = line.slice(6);
      } else if (line.startsWith("id: ")) {
        eventId = line.slice(4);
      }
      // Ignore comment lines (starting with :) and other fields
    }

    if (eventData) {
      try {
        const event = JSON.parse(eventData) as GovernanceStreamEvent;
        if (eventId) this.lastEventId = eventId;
        this.handler(event);
      } catch {
        // Malformed JSON — skip
      }
    }
  }

  private scheduleReconnect(): void {
    if (!this.active) return;
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.active = false;
      return;
    }

    const delay = this.initialBackoffMs * 2 ** this.reconnectAttempt;
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
