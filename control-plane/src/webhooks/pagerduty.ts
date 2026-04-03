/**
 * Admiral Framework — PagerDuty Webhook Formatter (GP-10)
 *
 * Formats governance events as PagerDuty Events API v2 payloads.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type { PagerDutyPayload, WebhookEvent, WebhookEventSeverity } from "./types";

// ---------------------------------------------------------------------------
// Severity mapping — Admiral → PagerDuty
// ---------------------------------------------------------------------------

const PD_SEVERITY_MAP: Record<WebhookEventSeverity, string> = {
  critical: "critical",
  high: "error",
  medium: "warning",
  low: "info",
  info: "info",
};

// ---------------------------------------------------------------------------
// Event type → action mapping
// Resolved events get "resolve"; everything else is "trigger"
// ---------------------------------------------------------------------------

const RESOLVED_TYPES = new Set(["agent_stopped", "policy_deactivated"]);

function getEventAction(event: WebhookEvent): PagerDutyPayload["event_action"] {
  if (RESOLVED_TYPES.has(event.type)) return "resolve";
  return "trigger";
}

function formatSummary(event: WebhookEvent): string {
  const typeLabel = event.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const parts = [`[Admiral] ${typeLabel}`];
  if (event.agentId) parts.push(`Agent: ${event.agentId}`);
  if (event.tenantId) parts.push(`Tenant: ${event.tenantId}`);
  return parts.join(" | ");
}

// ---------------------------------------------------------------------------
// PagerDuty formatter
// ---------------------------------------------------------------------------

export function formatPagerDutyPayload(event: WebhookEvent, routingKey = ""): PagerDutyPayload {
  return {
    routing_key: routingKey,
    event_action: getEventAction(event),
    dedup_key: `admiral_${event.type}_${event.agentId ?? event.source}_${event.tenantId ?? "global"}`,
    payload: {
      summary: formatSummary(event),
      severity: PD_SEVERITY_MAP[event.severity] ?? "info",
      source: event.source,
      timestamp: event.timestamp,
      custom_details: {
        event_id: event.id,
        event_type: event.type,
        agent_id: event.agentId,
        tenant_id: event.tenantId,
        ...event.detail,
      },
    },
  };
}
