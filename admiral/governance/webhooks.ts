/**
 * Governance Webhook Integrations (GP-10)
 *
 * Outbound webhooks to Slack, PagerDuty, Jira, and generic HTTP.
 * Event type filtering, severity thresholds, rate limiting, retry.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import * as http from "node:http";
import * as https from "node:https";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebhookTarget = "slack" | "pagerduty" | "jira" | "generic";

export interface WebhookRegistration {
  id: string;
  target: WebhookTarget;
  url: string;
  eventTypes: string[];
  severityThreshold: "critical" | "high" | "medium" | "low";
  enabled: boolean;
  rateLimit: number; // Max events per minute
  retryAttempts: number;
  retryDelayMs: number;
  createdAt: string;
  metadata: Record<string, string>;
}

export interface WebhookPayload {
  id: string;
  timestamp: string;
  eventType: string;
  severity: string;
  summary: string;
  details: Record<string, unknown>;
  source: string;
}

export interface DeliveryResult {
  webhookId: string;
  payloadId: string;
  status: "delivered" | "failed" | "rate-limited" | "filtered";
  statusCode: number | null;
  error: string | null;
  timestamp: string;
  attempts: number;
}

// ---------------------------------------------------------------------------
// Webhook Manager
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export class WebhookManager {
  private registrations: Map<string, WebhookRegistration> = new Map();
  private deliveryLog: DeliveryResult[] = [];
  private rateCounts: Map<string, { count: number; windowStart: number }> = new Map();

  /**
   * Register a webhook endpoint.
   */
  register(reg: Omit<WebhookRegistration, "id" | "createdAt">): WebhookRegistration {
    const id = randomUUID();
    const full: WebhookRegistration = {
      ...reg,
      id,
      createdAt: new Date().toISOString(),
    };
    this.registrations.set(id, full);
    return full;
  }

  /**
   * Unregister a webhook.
   */
  unregister(id: string): boolean {
    return this.registrations.delete(id);
  }

  /**
   * List all registrations.
   */
  list(): WebhookRegistration[] {
    return [...this.registrations.values()];
  }

  /**
   * Get a registration by ID.
   */
  get(id: string): WebhookRegistration | undefined {
    return this.registrations.get(id);
  }

  /**
   * Update a registration.
   */
  update(id: string, updates: Partial<WebhookRegistration>): WebhookRegistration | null {
    const existing = this.registrations.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id: existing.id, createdAt: existing.createdAt };
    this.registrations.set(id, updated);
    return updated;
  }

  /**
   * Dispatch an event to all matching webhooks.
   */
  async dispatch(payload: WebhookPayload): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const [, reg] of this.registrations) {
      if (!reg.enabled) continue;

      // Event type filter
      if (reg.eventTypes.length > 0 && !reg.eventTypes.includes(payload.eventType)) {
        results.push(this.logDelivery(reg.id, payload.id, "filtered", null, null, 0));
        continue;
      }

      // Severity threshold filter
      const eventSev = SEVERITY_ORDER[payload.severity] ?? 3;
      const thresholdSev = SEVERITY_ORDER[reg.severityThreshold] ?? 3;
      if (eventSev > thresholdSev) {
        results.push(this.logDelivery(reg.id, payload.id, "filtered", null, null, 0));
        continue;
      }

      // Rate limiting
      if (this.isRateLimited(reg.id, reg.rateLimit)) {
        results.push(this.logDelivery(reg.id, payload.id, "rate-limited", null, null, 0));
        continue;
      }

      // Format payload for target
      const formatted = formatForTarget(reg.target, payload, reg.metadata);

      // Deliver with retries
      let lastError: string | null = null;
      let statusCode: number | null = null;
      let delivered = false;

      for (let attempt = 1; attempt <= reg.retryAttempts; attempt++) {
        try {
          statusCode = await deliverPayload(reg.url, formatted);
          if (statusCode >= 200 && statusCode < 300) {
            delivered = true;
            break;
          }
          lastError = `HTTP ${statusCode}`;
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
        }

        if (attempt < reg.retryAttempts) {
          await new Promise((r) => setTimeout(r, reg.retryDelayMs * attempt));
        }
      }

      this.incrementRateCount(reg.id);
      results.push(this.logDelivery(
        reg.id, payload.id,
        delivered ? "delivered" : "failed",
        statusCode,
        lastError,
        reg.retryAttempts,
      ));
    }

    return results;
  }

  /**
   * Get delivery log.
   */
  getDeliveryLog(limit = 100): DeliveryResult[] {
    return this.deliveryLog.slice(-limit);
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private isRateLimited(webhookId: string, limit: number): boolean {
    const now = Date.now();
    const entry = this.rateCounts.get(webhookId);
    if (!entry || now - entry.windowStart > 60000) {
      return false;
    }
    return entry.count >= limit;
  }

  private incrementRateCount(webhookId: string): void {
    const now = Date.now();
    const entry = this.rateCounts.get(webhookId);
    if (!entry || now - entry.windowStart > 60000) {
      this.rateCounts.set(webhookId, { count: 1, windowStart: now });
    } else {
      entry.count++;
    }
  }

  private logDelivery(
    webhookId: string, payloadId: string,
    status: DeliveryResult["status"],
    statusCode: number | null, error: string | null,
    attempts: number,
  ): DeliveryResult {
    const result: DeliveryResult = {
      webhookId, payloadId, status, statusCode, error,
      timestamp: new Date().toISOString(), attempts,
    };
    this.deliveryLog.push(result);
    return result;
  }
}

// ---------------------------------------------------------------------------
// Payload Formatting
// ---------------------------------------------------------------------------

function formatForTarget(
  target: WebhookTarget,
  payload: WebhookPayload,
  metadata: Record<string, string>,
): unknown {
  switch (target) {
    case "slack":
      return {
        text: `[${payload.severity.toUpperCase()}] ${payload.summary}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${payload.eventType}* — ${payload.summary}\n_Severity: ${payload.severity}_`,
            },
          },
        ],
        channel: metadata.channel,
      };

    case "pagerduty":
      return {
        routing_key: metadata.routingKey,
        event_action: payload.severity === "critical" ? "trigger" : "acknowledge",
        payload: {
          summary: payload.summary,
          severity: payload.severity,
          source: payload.source,
          custom_details: payload.details,
        },
      };

    case "jira":
      return {
        fields: {
          project: { key: metadata.projectKey ?? "GOV" },
          summary: `[${payload.severity}] ${payload.summary}`,
          description: JSON.stringify(payload.details, null, 2),
          issuetype: { name: metadata.issueType ?? "Bug" },
          priority: { name: severityToJiraPriority(payload.severity) },
        },
      };

    case "generic":
    default:
      return payload;
  }
}

function severityToJiraPriority(severity: string): string {
  switch (severity) {
    case "critical": return "Highest";
    case "high": return "High";
    case "medium": return "Medium";
    case "low": return "Low";
    default: return "Medium";
  }
}

// ---------------------------------------------------------------------------
// HTTP Delivery
// ---------------------------------------------------------------------------

function deliverPayload(url: string, body: unknown): Promise<number> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === "https:" ? https : http;

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      },
      (res) => {
        res.resume(); // Consume response
        resolve(res.statusCode ?? 500);
      },
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Webhook delivery timeout"));
    });

    req.write(JSON.stringify(body));
    req.end();
  });
}
