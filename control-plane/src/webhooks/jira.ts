/**
 * Admiral Framework — Jira Webhook Formatter (GP-10)
 *
 * Formats governance events as Jira issue creation payloads.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type { JiraPayload, WebhookEvent, WebhookEventSeverity } from "./types";

// ---------------------------------------------------------------------------
// Priority mapping — Admiral → Jira
// ---------------------------------------------------------------------------

const JIRA_PRIORITY_MAP: Record<WebhookEventSeverity, string> = {
  critical: "Highest",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Lowest",
};

// ---------------------------------------------------------------------------
// Issue type mapping
// ---------------------------------------------------------------------------

function getIssueType(event: WebhookEvent): string {
  switch (event.type) {
    case "policy_violation":
      return "Bug";
    case "budget_exceeded":
      return "Bug";
    case "agent_intervention":
      return "Task";
    case "fleet_status_change":
      return "Task";
    default:
      return "Task";
  }
}

function formatSummary(event: WebhookEvent): string {
  const typeLabel = event.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const suffix = event.agentId ? ` [${event.agentId}]` : "";
  return `[Admiral] ${typeLabel}${suffix}`;
}

function formatDescription(event: WebhookEvent): string {
  const lines: string[] = [
    `h3. Admiral Governance Event`,
    ``,
    `*Event ID:* ${event.id}`,
    `*Type:* ${event.type}`,
    `*Severity:* ${event.severity}`,
    `*Source:* ${event.source}`,
    `*Timestamp:* ${event.timestamp}`,
  ];

  if (event.agentId) lines.push(`*Agent ID:* ${event.agentId}`);
  if (event.tenantId) lines.push(`*Tenant ID:* ${event.tenantId}`);

  if (Object.keys(event.detail).length > 0) {
    lines.push(``);
    lines.push(`h4. Details`);
    lines.push(`{code:json}`);
    lines.push(JSON.stringify(event.detail, null, 2));
    lines.push(`{code}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Jira formatter
// ---------------------------------------------------------------------------

export interface JiraFormatterOptions {
  projectKey?: string;
}

export function formatJiraPayload(
  event: WebhookEvent,
  options: JiraFormatterOptions = {},
): JiraPayload {
  const projectKey = options.projectKey ?? "ADM";

  const labels = ["admiral", `severity-${event.severity}`, `type-${event.type.replace(/_/g, "-")}`];
  if (event.tenantId) labels.push(`tenant-${event.tenantId}`);
  if (event.agentId) labels.push(`agent-${event.agentId}`);

  return {
    fields: {
      project: { key: projectKey },
      summary: formatSummary(event),
      description: formatDescription(event),
      issuetype: { name: getIssueType(event) },
      priority: { name: JIRA_PRIORITY_MAP[event.severity] ?? "Medium" },
      labels,
      customfield_details: {
        event_id: event.id,
        event_type: event.type,
        source: event.source,
        agent_id: event.agentId,
        tenant_id: event.tenantId,
      },
    },
  };
}
