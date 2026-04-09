/**
 * Admiral Framework — Slack Webhook Formatter (GP-10)
 *
 * Formats governance events as Slack Block Kit messages.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type { SlackPayload, WebhookEvent } from "./types";

// ---------------------------------------------------------------------------
// Severity → emoji mapping
// ---------------------------------------------------------------------------

const SEVERITY_EMOJI: Record<string, string> = {
  critical: ":red_circle:",
  high: ":large_orange_circle:",
  medium: ":large_yellow_circle:",
  low: ":large_blue_circle:",
  info: ":white_circle:",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#E01E5A",
  high: "#ECB22E",
  medium: "#36C5F0",
  low: "#2EB67D",
  info: "#E8E8E8",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Slack formatter
// ---------------------------------------------------------------------------

export function formatSlackPayload(event: WebhookEvent): SlackPayload {
  const emoji = SEVERITY_EMOJI[event.severity] ?? ":white_circle:";

  const title = `${emoji} ${formatEventType(event.type)}`;
  const fields = [
    { type: "mrkdwn", text: `*Severity:*\n${capitalize(event.severity)}` },
    { type: "mrkdwn", text: `*Source:*\n${event.source}` },
    { type: "mrkdwn", text: `*Time:*\n${event.timestamp}` },
    { type: "mrkdwn", text: `*Event ID:*\n${event.id}` },
  ];

  if (event.tenantId) {
    fields.push({ type: "mrkdwn", text: `*Tenant:*\n${event.tenantId}` });
  }
  if (event.agentId) {
    fields.push({ type: "mrkdwn", text: `*Agent:*\n${event.agentId}` });
  }

  const detailStr =
    Object.keys(event.detail).length > 0
      ? `\`\`\`${JSON.stringify(event.detail, null, 2)}\`\`\``
      : "_No additional details_";

  const payload: SlackPayload = {
    text: `${emoji} Admiral Governance Alert: ${formatEventType(event.type)}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: title },
      },
      {
        type: "section",
        fields,
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Details:*\n${detailStr}` },
      },
      {
        type: "divider",
      },
    ],
  };

  return payload;
}
