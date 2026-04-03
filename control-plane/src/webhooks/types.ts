/**
 * Admiral Framework — Webhook Types (GP-10)
 *
 * Shared types for the webhook dispatch system.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Event payload that triggers webhooks
// ---------------------------------------------------------------------------

export type WebhookEventType =
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

export type WebhookEventSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface WebhookEvent {
  id: string;
  timestamp: string;
  type: WebhookEventType;
  severity: WebhookEventSeverity;
  source: string;
  detail: Record<string, unknown>;
  tenantId?: string;
  agentId?: string;
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export type WebhookFormat = "slack" | "pagerduty" | "jira" | "generic";

export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  format: WebhookFormat;
  /** Event types to deliver. Empty array = all types. */
  eventTypes: WebhookEventType[];
  /** Minimum severity to deliver. undefined = all severities. */
  minSeverity?: WebhookEventSeverity;
  /** Maximum events per minute (rate limiting). 0 = unlimited. */
  maxEventsPerMinute: number;
  enabled: boolean;
  /** Custom headers to include with requests */
  headers?: Record<string, string>;
  /** Secret for HMAC signing (generic format only) */
  secret?: string;
}

export interface CreateSubscriptionRequest {
  name: string;
  url: string;
  format: WebhookFormat;
  eventTypes?: WebhookEventType[];
  minSeverity?: WebhookEventSeverity;
  maxEventsPerMinute?: number;
  headers?: Record<string, string>;
  secret?: string;
}

// ---------------------------------------------------------------------------
// Formatted payloads (what gets sent to each endpoint)
// ---------------------------------------------------------------------------

export interface SlackPayload {
  text: string;
  blocks?: SlackBlock[];
}

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: Array<{ type: string; text: string }>;
}

export interface PagerDutyPayload {
  routing_key: string;
  event_action: "trigger" | "acknowledge" | "resolve";
  payload: {
    summary: string;
    severity: string;
    source: string;
    timestamp: string;
    custom_details: Record<string, unknown>;
  };
  dedup_key?: string;
}

export interface JiraPayload {
  fields: {
    project: { key: string };
    summary: string;
    description: string;
    issuetype: { name: string };
    priority: { name: string };
    labels: string[];
    customfield_details?: Record<string, unknown>;
  };
}

export interface GenericPayload {
  event: WebhookEvent;
  timestamp: string;
  webhookId: string;
}

// ---------------------------------------------------------------------------
// Dispatch result
// ---------------------------------------------------------------------------

export interface WebhookDeliveryResult {
  subscriptionId: string;
  eventId: string;
  success: boolean;
  statusCode?: number;
  attempt: number;
  timestamp: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Severity ordering for threshold comparisons
// ---------------------------------------------------------------------------

export const SEVERITY_ORDER: Record<WebhookEventSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

/** Returns true if event severity meets or exceeds the minimum threshold */
export function meetsSeverityThreshold(
  eventSeverity: WebhookEventSeverity,
  minSeverity: WebhookEventSeverity,
): boolean {
  return SEVERITY_ORDER[eventSeverity] <= SEVERITY_ORDER[minSeverity];
}
