/**
 * Tests for Webhooks (GP-10)
 */

import assert from "node:assert/strict";
import * as http from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { formatSlackPayload } from "./slack";
import { formatPagerDutyPayload } from "./pagerduty";
import { formatJiraPayload } from "./jira";
import { formatGenericPayload, signPayload, deliverWebhook } from "./generic";
import { WebhookDispatcher } from "./dispatcher";
import { meetsSeverityThreshold } from "./types";
import type { WebhookEvent } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    id: `gevt_${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    type: "policy_violation",
    severity: "high",
    source: "test-source",
    detail: { rule: "no-shell-exec" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Severity threshold tests
// ---------------------------------------------------------------------------

describe("meetsSeverityThreshold", () => {
  it("critical meets critical threshold", () => {
    assert.equal(meetsSeverityThreshold("critical", "critical"), true);
  });

  it("critical meets high threshold", () => {
    assert.equal(meetsSeverityThreshold("critical", "high"), true);
  });

  it("critical meets info threshold", () => {
    assert.equal(meetsSeverityThreshold("critical", "info"), true);
  });

  it("info does NOT meet critical threshold", () => {
    assert.equal(meetsSeverityThreshold("info", "critical"), false);
  });

  it("low meets medium threshold", () => {
    // low(3) > medium(2) → does not meet threshold
    assert.equal(meetsSeverityThreshold("low", "medium"), false);
  });

  it("high meets high threshold", () => {
    assert.equal(meetsSeverityThreshold("high", "high"), true);
  });
});

// ---------------------------------------------------------------------------
// Slack formatter tests
// ---------------------------------------------------------------------------

describe("formatSlackPayload", () => {
  it("returns a payload with text and blocks", () => {
    const event = makeEvent({ type: "policy_violation", severity: "critical" });
    const payload = formatSlackPayload(event);
    assert.ok(payload.text.includes("policy_violation") || payload.text.includes("Policy Violation"));
    assert.ok(Array.isArray(payload.blocks));
    assert.ok(payload.blocks!.length > 0);
  });

  it("includes severity emoji for critical", () => {
    const event = makeEvent({ severity: "critical" });
    const payload = formatSlackPayload(event);
    assert.ok(payload.text.includes(":red_circle:"));
  });

  it("includes agentId in fields when present", () => {
    const event = makeEvent({ agentId: "agent-X" });
    const payload = formatSlackPayload(event);
    const allText = JSON.stringify(payload);
    assert.ok(allText.includes("agent-X"));
  });

  it("includes tenantId when present", () => {
    const event = makeEvent({ tenantId: "tenant-Y" });
    const payload = formatSlackPayload(event);
    const allText = JSON.stringify(payload);
    assert.ok(allText.includes("tenant-Y"));
  });

  it("handles event with no detail gracefully", () => {
    const event = makeEvent({ detail: {} });
    const payload = formatSlackPayload(event);
    const allText = JSON.stringify(payload);
    assert.ok(allText.includes("No additional details"));
  });
});

// ---------------------------------------------------------------------------
// PagerDuty formatter tests
// ---------------------------------------------------------------------------

describe("formatPagerDutyPayload", () => {
  it("returns a valid PD payload structure", () => {
    const event = makeEvent({ type: "policy_violation", severity: "critical" });
    const payload = formatPagerDutyPayload(event, "test-routing-key");
    assert.equal(payload.routing_key, "test-routing-key");
    assert.equal(payload.event_action, "trigger");
    assert.equal(payload.payload.severity, "critical");
    assert.ok(payload.payload.summary.includes("Policy Violation") || payload.payload.summary.includes("policy_violation"));
  });

  it("maps admiral severity to PD severity correctly", () => {
    assert.equal(formatPagerDutyPayload(makeEvent({ severity: "high" })).payload.severity, "error");
    assert.equal(formatPagerDutyPayload(makeEvent({ severity: "medium" })).payload.severity, "warning");
    assert.equal(formatPagerDutyPayload(makeEvent({ severity: "low" })).payload.severity, "info");
    assert.equal(formatPagerDutyPayload(makeEvent({ severity: "info" })).payload.severity, "info");
  });

  it("uses resolve action for agent_stopped events", () => {
    const event = makeEvent({ type: "agent_stopped" });
    const payload = formatPagerDutyPayload(event);
    assert.equal(payload.event_action, "resolve");
  });

  it("includes dedup_key", () => {
    const event = makeEvent({ agentId: "agent-1" });
    const payload = formatPagerDutyPayload(event);
    assert.ok(typeof payload.dedup_key === "string");
    assert.ok(payload.dedup_key!.includes("agent-1"));
  });

  it("includes custom_details with event info", () => {
    const event = makeEvent({ detail: { extra: "data" } });
    const payload = formatPagerDutyPayload(event);
    assert.equal(payload.payload.custom_details.event_id, event.id);
    assert.equal(payload.payload.custom_details.extra, "data");
  });
});

// ---------------------------------------------------------------------------
// Jira formatter tests
// ---------------------------------------------------------------------------

describe("formatJiraPayload", () => {
  it("returns valid Jira issue fields", () => {
    const event = makeEvent({ type: "policy_violation", severity: "critical" });
    const payload = formatJiraPayload(event, { projectKey: "TEST" });
    assert.equal(payload.fields.project.key, "TEST");
    assert.equal(payload.fields.priority.name, "Highest");
    assert.ok(payload.fields.summary.includes("Policy Violation") || payload.fields.summary.includes("policy_violation"));
    assert.ok(Array.isArray(payload.fields.labels));
  });

  it("defaults to ADM project key", () => {
    const event = makeEvent();
    const payload = formatJiraPayload(event);
    assert.equal(payload.fields.project.key, "ADM");
  });

  it("maps severity to Jira priority", () => {
    assert.equal(formatJiraPayload(makeEvent({ severity: "high" })).fields.priority.name, "High");
    assert.equal(formatJiraPayload(makeEvent({ severity: "medium" })).fields.priority.name, "Medium");
    assert.equal(formatJiraPayload(makeEvent({ severity: "low" })).fields.priority.name, "Low");
    assert.equal(formatJiraPayload(makeEvent({ severity: "info" })).fields.priority.name, "Lowest");
  });

  it("includes severity and type labels", () => {
    const event = makeEvent({ severity: "high", type: "policy_violation" });
    const payload = formatJiraPayload(event);
    assert.ok(payload.fields.labels.includes("severity-high"));
    assert.ok(payload.fields.labels.includes("type-policy-violation"));
  });

  it("uses Bug issue type for policy_violation", () => {
    const event = makeEvent({ type: "policy_violation" });
    const payload = formatJiraPayload(event);
    assert.equal(payload.fields.issuetype.name, "Bug");
  });

  it("includes detail in description", () => {
    const event = makeEvent({ detail: { rule: "no-shell", count: 3 } });
    const payload = formatJiraPayload(event);
    assert.ok(payload.fields.description.includes("no-shell"));
  });
});

// ---------------------------------------------------------------------------
// Generic formatter tests
// ---------------------------------------------------------------------------

describe("formatGenericPayload", () => {
  it("wraps event with timestamp and webhookId", () => {
    const event = makeEvent();
    const payload = formatGenericPayload(event, "sub-1");
    assert.deepEqual(payload.event, event);
    assert.equal(payload.webhookId, "sub-1");
    assert.ok(typeof payload.timestamp === "string");
  });
});

describe("signPayload", () => {
  it("returns hex HMAC-SHA256 signature", () => {
    const sig = signPayload('{"test":1}', "my-secret");
    assert.equal(typeof sig, "string");
    assert.equal(sig.length, 64);
    // Deterministic
    assert.equal(signPayload('{"test":1}', "my-secret"), sig);
  });

  it("different body produces different signature", () => {
    const sig1 = signPayload("body1", "secret");
    const sig2 = signPayload("body2", "secret");
    assert.notEqual(sig1, sig2);
  });
});

// ---------------------------------------------------------------------------
// Generic delivery tests — uses a local mock HTTP server
// ---------------------------------------------------------------------------

describe("deliverWebhook", () => {
  let server: http.Server;
  let port: number;
  let receivedBodies: string[];
  let receivedHeaders: http.IncomingHttpHeaders[];

  beforeEach(async () => {
    receivedBodies = [];
    receivedHeaders = [];
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk: string) => { body += chunk; });
      req.on("end", () => {
        receivedBodies.push(body);
        receivedHeaders.push(req.headers);
        res.writeHead(200);
        res.end("OK");
      });
    });
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("delivers payload to endpoint and returns success", async () => {
    const result = await deliverWebhook({
      url: `http://127.0.0.1:${port}/hook`,
      payload: { test: "data" },
    });
    assert.equal(result.success, true);
    assert.equal(result.statusCode, 200);
    assert.equal(receivedBodies.length, 1);
    const body = JSON.parse(receivedBodies[0]) as { test: string };
    assert.equal(body.test, "data");
  });

  it("includes HMAC signature header when secret provided", async () => {
    const payload = { event: "test" };
    await deliverWebhook({
      url: `http://127.0.0.1:${port}/hook`,
      payload,
      secret: "my-secret",
    });
    const sigHeader = receivedHeaders[0]["x-admiral-signature"] as string;
    assert.ok(sigHeader, "Signature header should be present");
    assert.ok(sigHeader.startsWith("sha256="));
  });

  it("includes custom headers", async () => {
    await deliverWebhook({
      url: `http://127.0.0.1:${port}/hook`,
      payload: {},
      headers: { "X-Custom-Header": "my-value" },
    });
    assert.equal(receivedHeaders[0]["x-custom-header"], "my-value");
  });

  it("returns failure for non-2xx status", async () => {
    server.removeAllListeners("request");
    server.on("request", (_req, res) => {
      res.writeHead(500);
      res.end("Error");
    });
    const result = await deliverWebhook({
      url: `http://127.0.0.1:${port}/hook`,
      payload: {},
    });
    assert.equal(result.success, false);
    assert.equal(result.statusCode, 500);
  });

  it("returns failure for invalid URL", async () => {
    const result = await deliverWebhook({
      url: "not-a-url",
      payload: {},
    });
    assert.equal(result.success, false);
    assert.ok(result.error?.includes("Invalid URL"));
  });

  it("returns failure on connection error", async () => {
    const result = await deliverWebhook({
      url: "http://127.0.0.1:1", // port 1 should refuse
      payload: {},
    });
    assert.equal(result.success, false);
  });
});

// ---------------------------------------------------------------------------
// WebhookDispatcher tests
// ---------------------------------------------------------------------------

describe("WebhookDispatcher — subscription management", () => {
  it("adds and retrieves a subscription", () => {
    const dispatcher = new WebhookDispatcher();
    const sub = dispatcher.addSubscription({
      name: "Test Hook",
      url: "http://example.com/hook",
      format: "generic",
    });
    assert.ok(sub.id.startsWith("whsub_"));
    assert.equal(sub.name, "Test Hook");
    assert.equal(sub.enabled, true);
    assert.equal(dispatcher.subscriptionCount, 1);
  });

  it("removes a subscription", () => {
    const dispatcher = new WebhookDispatcher();
    const sub = dispatcher.addSubscription({
      name: "Hook",
      url: "http://example.com",
      format: "generic",
    });
    const removed = dispatcher.removeSubscription(sub.id);
    assert.equal(removed, true);
    assert.equal(dispatcher.subscriptionCount, 0);
  });

  it("removeSubscription returns false for unknown id", () => {
    const dispatcher = new WebhookDispatcher();
    assert.equal(dispatcher.removeSubscription("nonexistent"), false);
  });

  it("enables and disables subscription", () => {
    const dispatcher = new WebhookDispatcher();
    const sub = dispatcher.addSubscription({
      name: "Hook",
      url: "http://example.com",
      format: "generic",
    });
    dispatcher.disableSubscription(sub.id);
    assert.equal(dispatcher.getSubscription(sub.id)!.enabled, false);
    dispatcher.enableSubscription(sub.id);
    assert.equal(dispatcher.getSubscription(sub.id)!.enabled, true);
  });

  it("throws on missing name", () => {
    const dispatcher = new WebhookDispatcher();
    assert.throws(
      () => dispatcher.addSubscription({ name: "", url: "http://x.com", format: "generic" }),
      /name is required/i,
    );
  });

  it("throws on invalid format", () => {
    const dispatcher = new WebhookDispatcher();
    assert.throws(
      () =>
        dispatcher.addSubscription({
          name: "Hook",
          url: "http://x.com",
          format: "invalid" as "generic",
        }),
      /Invalid format/i,
    );
  });

  it("listSubscriptions returns all", () => {
    const dispatcher = new WebhookDispatcher();
    dispatcher.addSubscription({ name: "A", url: "http://a.com", format: "slack" });
    dispatcher.addSubscription({ name: "B", url: "http://b.com", format: "generic" });
    assert.equal(dispatcher.listSubscriptions().length, 2);
  });
});

describe("WebhookDispatcher — filtering", () => {
  let dispatcher: WebhookDispatcher;
  let server: http.Server;
  let port: number;
  let deliveryCount: number;

  beforeEach(async () => {
    deliveryCount = 0;
    dispatcher = new WebhookDispatcher({ maxRetries: 0, initialBackoffMs: 5 });
    server = http.createServer((_req, res) => {
      deliveryCount++;
      let body = "";
      _req.on("data", (c: string) => { body += c; });
      _req.on("end", () => {
        res.writeHead(200);
        res.end("OK");
      });
    });
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("dispatches to matching event type", async () => {
    dispatcher.addSubscription({
      name: "violations only",
      url: `http://127.0.0.1:${port}/hook`,
      format: "generic",
      eventTypes: ["policy_violation"],
    });
    await dispatcher.dispatch(makeEvent({ type: "policy_violation" }));
    assert.equal(deliveryCount, 1);
    await dispatcher.dispatch(makeEvent({ type: "health_check" }));
    assert.equal(deliveryCount, 1); // health_check filtered out
  });

  it("dispatches to all types when eventTypes is empty", async () => {
    dispatcher.addSubscription({
      name: "all events",
      url: `http://127.0.0.1:${port}/hook`,
      format: "generic",
      eventTypes: [],
    });
    await dispatcher.dispatch(makeEvent({ type: "policy_violation" }));
    await dispatcher.dispatch(makeEvent({ type: "health_check" }));
    assert.equal(deliveryCount, 2);
  });

  it("filters by severity threshold", async () => {
    dispatcher.addSubscription({
      name: "critical only",
      url: `http://127.0.0.1:${port}/hook`,
      format: "generic",
      minSeverity: "critical",
    });
    await dispatcher.dispatch(makeEvent({ severity: "critical" }));
    assert.equal(deliveryCount, 1);
    await dispatcher.dispatch(makeEvent({ severity: "info" }));
    assert.equal(deliveryCount, 1); // info filtered out
  });

  it("does not dispatch to disabled subscriptions", async () => {
    const sub = dispatcher.addSubscription({
      name: "disabled",
      url: `http://127.0.0.1:${port}/hook`,
      format: "generic",
    });
    dispatcher.disableSubscription(sub.id);
    await dispatcher.dispatch(makeEvent());
    assert.equal(deliveryCount, 0);
  });
});

describe("WebhookDispatcher — rate limiting", () => {
  let dispatcher: WebhookDispatcher;
  let server: http.Server;
  let port: number;
  let deliveryCount: number;

  beforeEach(async () => {
    deliveryCount = 0;
    dispatcher = new WebhookDispatcher({ maxRetries: 0, initialBackoffMs: 0 });
    server = http.createServer((_req, res) => {
      deliveryCount++;
      let body = "";
      _req.on("data", (c: string) => { body += c; });
      _req.on("end", () => {
        res.writeHead(200);
        res.end("OK");
      });
    });
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("enforces maxEventsPerMinute limit", async () => {
    dispatcher.addSubscription({
      name: "rate limited",
      url: `http://127.0.0.1:${port}/hook`,
      format: "generic",
      maxEventsPerMinute: 2,
    });
    // Send 5 events
    for (let i = 0; i < 5; i++) {
      await dispatcher.dispatch(makeEvent());
    }
    // Only first 2 should be delivered within the same minute window
    assert.equal(deliveryCount, 2);
  });

  it("no rate limit when maxEventsPerMinute is 0", async () => {
    dispatcher.addSubscription({
      name: "unlimited",
      url: `http://127.0.0.1:${port}/hook`,
      format: "generic",
      maxEventsPerMinute: 0,
    });
    for (let i = 0; i < 5; i++) {
      await dispatcher.dispatch(makeEvent());
    }
    assert.equal(deliveryCount, 5);
  });
});

describe("WebhookDispatcher — retry with backoff", () => {
  it("retries on server error and returns result", async () => {
    let attempts = 0;
    const server = http.createServer((_req, res) => {
      let body = "";
      _req.on("data", (c: string) => { body += c; });
      _req.on("end", () => {
        attempts++;
        if (attempts < 2) {
          res.writeHead(500);
          res.end("Error");
        } else {
          res.writeHead(200);
          res.end("OK");
        }
      });
    });
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    const port = (server.address() as { port: number }).port;

    const dispatcher = new WebhookDispatcher({ maxRetries: 2, initialBackoffMs: 5 });
    dispatcher.addSubscription({
      name: "retry test",
      url: `http://127.0.0.1:${port}/hook`,
      format: "generic",
    });

    const results = await dispatcher.dispatch(makeEvent());
    assert.equal(results.length, 1);
    assert.equal(results[0].success, true);
    assert.equal(attempts, 2);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns failure after exhausting retries", async () => {
    const server = http.createServer((_req, res) => {
      let body = "";
      _req.on("data", (c: string) => { body += c; });
      _req.on("end", () => {
        res.writeHead(500);
        res.end("Error");
      });
    });
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    const port = (server.address() as { port: number }).port;

    const dispatcher = new WebhookDispatcher({ maxRetries: 1, initialBackoffMs: 5 });
    dispatcher.addSubscription({
      name: "always fails",
      url: `http://127.0.0.1:${port}/hook`,
      format: "generic",
    });

    const results = await dispatcher.dispatch(makeEvent());
    assert.equal(results.length, 1);
    assert.equal(results[0].success, false);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("does not retry on 4xx client errors", async () => {
    let attempts = 0;
    const server = http.createServer((_req, res) => {
      let body = "";
      _req.on("data", (c: string) => { body += c; });
      _req.on("end", () => {
        attempts++;
        res.writeHead(400);
        res.end("Bad Request");
      });
    });
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    const port = (server.address() as { port: number }).port;

    const dispatcher = new WebhookDispatcher({ maxRetries: 3, initialBackoffMs: 5 });
    dispatcher.addSubscription({
      name: "client error",
      url: `http://127.0.0.1:${port}/hook`,
      format: "generic",
    });

    await dispatcher.dispatch(makeEvent());
    assert.equal(attempts, 1, "Should not retry on 400 client error");

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

describe("WebhookDispatcher — format routing", () => {
  it("dispatches slack format with correct content-type", async () => {
    let receivedBody = "";
    const server = http.createServer((_req, res) => {
      let body = "";
      _req.on("data", (c: string) => { body += c; });
      _req.on("end", () => {
        receivedBody = body;
        res.writeHead(200);
        res.end("OK");
      });
    });
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    const port = (server.address() as { port: number }).port;

    const dispatcher = new WebhookDispatcher({ maxRetries: 0 });
    dispatcher.addSubscription({
      name: "slack",
      url: `http://127.0.0.1:${port}/hook`,
      format: "slack",
    });

    await dispatcher.dispatch(makeEvent({ type: "policy_violation", severity: "high" }));
    const body = JSON.parse(receivedBody) as { text: string; blocks: unknown[] };
    assert.ok(typeof body.text === "string");
    assert.ok(Array.isArray(body.blocks));

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("dispatches pagerduty format", async () => {
    let receivedBody = "";
    const server = http.createServer((_req, res) => {
      let body = "";
      _req.on("data", (c: string) => { body += c; });
      _req.on("end", () => {
        receivedBody = body;
        res.writeHead(202);
        res.end("Accepted");
      });
    });
    await new Promise<void>((resolve) => { server.listen(0, () => resolve()); });
    const port = (server.address() as { port: number }).port;

    const dispatcher = new WebhookDispatcher({ maxRetries: 0 });
    dispatcher.addSubscription({
      name: "pagerduty",
      url: `http://127.0.0.1:${port}/hook`,
      format: "pagerduty",
    });

    await dispatcher.dispatch(makeEvent({ type: "policy_violation", severity: "critical" }));
    const body = JSON.parse(receivedBody) as { event_action: string; payload: { severity: string } };
    assert.ok(typeof body.event_action === "string");
    assert.equal(body.payload.severity, "critical");

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
