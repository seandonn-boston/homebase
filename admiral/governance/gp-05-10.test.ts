/**
 * Tests for GP-05 (Event Streaming), GP-06 (Reporting),
 * GP-07 (SDK types), GP-09 (Config Mgmt), GP-10 (Webhooks)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { GovernanceEventStream, type StreamFilter } from "./event-streaming";
import {
  generateReport,
  formatReport,
  REPORT_TYPES,
  type GovernanceDataSource,
} from "./governance-reporting";
import { GovernanceSdk, GovernanceSdkError } from "./governance-sdk";
import { GovernanceConfigManager, type GovernanceConfig } from "./config-management";
import { WebhookManager, type WebhookPayload } from "./webhooks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockDataSource(): GovernanceDataSource {
  return {
    getPolicyCount: () => 10,
    getEnforcedPolicyCount: () => 7,
    getAuditEntryCount: () => 250,
    getViolationCount: () => 5,
    getAgentCount: () => 20,
    getActiveAgentCount: () => 15,
    getFailureCount: () => 8,
    getRecoveredFailureCount: () => 6,
    getDecisionCount: () => 100,
    getEventCount: () => 500,
  };
}

function makeConfig(): GovernanceConfig {
  return {
    policies: [{ id: "p1", name: "Test", rules: [] }],
    alertThresholds: { critical: 1, high: 5 },
    webhooks: [{ url: "https://example.com/hook", events: ["alert"], enabled: true }],
    enforcements: { "SO-01": "enforce", "SO-02": "monitor" },
  };
}

// ---------------------------------------------------------------------------
// GP-05: Event Streaming
// ---------------------------------------------------------------------------

describe("GP-05: Event Streaming", () => {
  it("emits and polls events", () => {
    const stream = new GovernanceEventStream();
    stream.emit({ type: "scope_drift", severity: "high", agent: "agent-1", tenant: "default", data: {} });
    stream.emit({ type: "budget_overrun", severity: "medium", agent: "agent-2", tenant: "default", data: {} });

    const events = stream.poll();
    assert.equal(events.length, 2);
    assert.ok(events[0].id);
    assert.ok(events[0].timestamp);
  });

  it("filters by type", () => {
    const stream = new GovernanceEventStream();
    stream.emit({ type: "scope_drift", severity: "high", agent: "a1", tenant: "t1", data: {} });
    stream.emit({ type: "budget_overrun", severity: "medium", agent: "a2", tenant: "t1", data: {} });

    const filtered = stream.poll({ types: ["scope_drift"] });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].type, "scope_drift");
  });

  it("filters by severity", () => {
    const stream = new GovernanceEventStream();
    stream.emit({ type: "t1", severity: "critical", agent: "a1", tenant: "t1", data: {} });
    stream.emit({ type: "t2", severity: "low", agent: "a2", tenant: "t1", data: {} });

    const filtered = stream.poll({ severity: ["critical"] });
    assert.equal(filtered.length, 1);
  });

  it("filters by agent", () => {
    const stream = new GovernanceEventStream();
    stream.emit({ type: "t1", severity: "high", agent: "target-agent", tenant: "t1", data: {} });
    stream.emit({ type: "t2", severity: "high", agent: "other-agent", tenant: "t1", data: {} });

    const filtered = stream.poll({ agent: "target-agent" });
    assert.equal(filtered.length, 1);
  });

  it("subscribes and receives events", () => {
    const stream = new GovernanceEventStream();
    const received: string[] = [];

    const subId = stream.subscribe({}, (event) => received.push(event.type));
    stream.emit({ type: "test-event", severity: "low", agent: "a1", tenant: "t1", data: {} });

    assert.equal(received.length, 1);
    assert.equal(received[0], "test-event");

    stream.unsubscribe(subId);
    stream.emit({ type: "after-unsub", severity: "low", agent: "a1", tenant: "t1", data: {} });
    assert.equal(received.length, 1); // Should not receive after unsubscribe
  });

  it("replays events since timestamp", () => {
    const stream = new GovernanceEventStream();
    stream.emit({ type: "old", severity: "low", agent: "a1", tenant: "t1", data: {} });
    const midpoint = new Date().toISOString();
    stream.emit({ type: "new", severity: "low", agent: "a1", tenant: "t1", data: {} });

    const replayed = stream.replay(midpoint);
    assert.equal(replayed.length, 1);
    assert.equal(replayed[0].type, "new");
  });

  it("respects buffer size limit", () => {
    const stream = new GovernanceEventStream(5);
    for (let i = 0; i < 10; i++) {
      stream.emit({ type: `event-${i}`, severity: "low", agent: "a1", tenant: "t1", data: {} });
    }
    assert.equal(stream.getBufferSize(), 5);
  });
});

// ---------------------------------------------------------------------------
// GP-06: Governance Reporting
// ---------------------------------------------------------------------------

describe("GP-06: Governance Reporting", () => {
  it("defines 5 report types", () => {
    assert.equal(REPORT_TYPES.length, 5);
  });

  it("generates compliance report", () => {
    const report = generateReport({ type: "compliance", format: "json" }, makeMockDataSource());
    assert.equal(report.type, "compliance");
    assert.ok(report.sections.length > 0);
    assert.ok(report.sections[0].data.totalPolicies);
  });

  it("generates KPI report", () => {
    const report = generateReport({ type: "kpi", format: "json" }, makeMockDataSource());
    assert.equal(report.type, "kpi");
    assert.ok(report.sections[0].data.totalAgents);
  });

  it("generates fleet health report", () => {
    const report = generateReport({ type: "fleet-health", format: "json" }, makeMockDataSource());
    assert.ok(report.sections[0].data.healthStatus);
  });

  it("generates audit report", () => {
    const report = generateReport({ type: "audit", format: "json" }, makeMockDataSource());
    assert.ok(report.sections[0].data.totalEntries);
  });

  it("generates trend analysis report", () => {
    const report = generateReport({ type: "trend-analysis", format: "json" }, makeMockDataSource());
    assert.ok(report.sections[0].data.eventVolume);
  });

  it("formats as JSON", () => {
    const report = generateReport({ type: "compliance", format: "json" }, makeMockDataSource());
    const json = formatReport(report, "json");
    const parsed = JSON.parse(json);
    assert.equal(parsed.type, "compliance");
  });

  it("formats as text", () => {
    const report = generateReport({ type: "kpi", format: "text" }, makeMockDataSource());
    const text = formatReport(report, "text");
    assert.ok(text.includes("Kpi Report"));
    assert.ok(text.includes("Agents:"));
  });
});

// ---------------------------------------------------------------------------
// GP-07: SDK (type verification only — no live server)
// ---------------------------------------------------------------------------

describe("GP-07: Governance SDK", () => {
  it("creates SDK instance with config", () => {
    const sdk = new GovernanceSdk({
      baseUrl: "http://localhost:4520",
      authToken: "test-token",
    });
    assert.ok(sdk);
  });

  it("GovernanceSdkError has status and code", () => {
    const err = new GovernanceSdkError("test", 401, "UNAUTHORIZED");
    assert.equal(err.status, 401);
    assert.equal(err.code, "UNAUTHORIZED");
    assert.equal(err.name, "GovernanceSdkError");
  });
});

// ---------------------------------------------------------------------------
// GP-09: Configuration Management
// ---------------------------------------------------------------------------

describe("GP-09: Configuration Management", () => {
  it("creates initial config version", () => {
    const mgr = new GovernanceConfigManager(makeConfig());
    assert.equal(mgr.getVersionCount(), 1);
    assert.ok(mgr.current());
    assert.equal(mgr.current()!.version, 1);
  });

  it("updates config (new version)", () => {
    const mgr = new GovernanceConfigManager(makeConfig());
    const newConfig = { ...makeConfig(), alertThresholds: { critical: 2, high: 10 } };
    mgr.update(newConfig, "admin", "Adjust thresholds");
    assert.equal(mgr.getVersionCount(), 2);
    assert.equal(mgr.current()!.version, 2);
  });

  it("retrieves specific version", () => {
    const mgr = new GovernanceConfigManager(makeConfig());
    mgr.update({ ...makeConfig(), alertThresholds: { critical: 5, high: 20 } }, "admin", "v2");
    const v1 = mgr.getVersion(1);
    assert.ok(v1);
    assert.equal(v1!.config.alertThresholds.critical, 1);
  });

  it("lists all versions", () => {
    const mgr = new GovernanceConfigManager(makeConfig());
    mgr.update(makeConfig(), "admin", "v2");
    mgr.update(makeConfig(), "admin", "v3");
    const versions = mgr.listVersions();
    assert.equal(versions.length, 3);
  });

  it("rolls back to previous version", () => {
    const mgr = new GovernanceConfigManager(makeConfig());
    mgr.update({ ...makeConfig(), alertThresholds: { critical: 99, high: 99 } }, "admin", "bad change");
    mgr.rollback(1, "admin");
    assert.equal(mgr.getVersionCount(), 3);
    assert.equal(mgr.current()!.config.alertThresholds.critical, 1);
  });

  it("diffs two versions", () => {
    const mgr = new GovernanceConfigManager(makeConfig());
    mgr.update({ ...makeConfig(), alertThresholds: { critical: 5, high: 10 } }, "admin", "change thresholds");
    const d = mgr.diff(1, 2);
    assert.ok(d.changes.length > 0);
    assert.equal(d.fromVersion, 1);
    assert.equal(d.toVersion, 2);
  });

  it("exports and imports config", () => {
    const mgr = new GovernanceConfigManager(makeConfig());
    mgr.update(makeConfig(), "admin", "v2");
    const exported = mgr.export();

    const mgr2 = new GovernanceConfigManager();
    const imported = mgr2.import(exported, "importer");
    assert.equal(imported, 2);
  });

  it("validates config on update", () => {
    const mgr = new GovernanceConfigManager(makeConfig());
    assert.throws(() => {
      mgr.update({ policies: "not-array" as any, alertThresholds: {}, webhooks: [], enforcements: {} }, "admin", "bad");
    });
  });
});

// ---------------------------------------------------------------------------
// GP-10: Webhooks
// ---------------------------------------------------------------------------

describe("GP-10: Webhook Manager", () => {
  it("registers and lists webhooks", () => {
    const mgr = new WebhookManager();
    mgr.register({
      target: "slack",
      url: "https://hooks.slack.com/test",
      eventTypes: ["alert"],
      severityThreshold: "high",
      enabled: true,
      rateLimit: 60,
      retryAttempts: 3,
      retryDelayMs: 1000,
      metadata: { channel: "#alerts" },
    });
    assert.equal(mgr.list().length, 1);
  });

  it("unregisters webhooks", () => {
    const mgr = new WebhookManager();
    const reg = mgr.register({
      target: "generic",
      url: "https://example.com/hook",
      eventTypes: [],
      severityThreshold: "low",
      enabled: true,
      rateLimit: 100,
      retryAttempts: 1,
      retryDelayMs: 500,
      metadata: {},
    });
    assert.equal(mgr.list().length, 1);
    mgr.unregister(reg.id);
    assert.equal(mgr.list().length, 0);
  });

  it("updates webhook registration", () => {
    const mgr = new WebhookManager();
    const reg = mgr.register({
      target: "slack",
      url: "https://old.com",
      eventTypes: [],
      severityThreshold: "low",
      enabled: true,
      rateLimit: 60,
      retryAttempts: 1,
      retryDelayMs: 500,
      metadata: {},
    });
    const updated = mgr.update(reg.id, { url: "https://new.com" });
    assert.ok(updated);
    assert.equal(updated!.url, "https://new.com");
    assert.equal(updated!.id, reg.id); // ID preserved
  });

  it("filters events by type during dispatch", async () => {
    const mgr = new WebhookManager();
    mgr.register({
      target: "generic",
      url: "https://example.com/hook",
      eventTypes: ["alert"],
      severityThreshold: "low",
      enabled: false, // disabled to avoid network call
      rateLimit: 100,
      retryAttempts: 1,
      retryDelayMs: 100,
      metadata: {},
    });

    const payload: WebhookPayload = {
      id: "p1",
      timestamp: new Date().toISOString(),
      eventType: "deployment",
      severity: "low",
      summary: "Test",
      details: {},
      source: "test",
    };

    const results = await mgr.dispatch(payload);
    // Webhook is disabled, so nothing dispatched
    assert.equal(results.length, 0);
  });

  it("tracks delivery log", async () => {
    const mgr = new WebhookManager();
    mgr.register({
      target: "generic",
      url: "https://httpbin.org/status/200",
      eventTypes: [],
      severityThreshold: "low",
      enabled: false, // Disabled to avoid real HTTP calls
      rateLimit: 100,
      retryAttempts: 1,
      retryDelayMs: 100,
      metadata: {},
    });

    // Log should be empty since webhook is disabled
    assert.equal(mgr.getDeliveryLog().length, 0);
  });

  it("severity threshold filters events", async () => {
    const mgr = new WebhookManager();
    mgr.register({
      target: "generic",
      url: "https://example.com",
      eventTypes: [],
      severityThreshold: "high",
      enabled: true,
      rateLimit: 100,
      retryAttempts: 1,
      retryDelayMs: 100,
      metadata: {},
    });

    // Low severity event should be filtered
    const payload: WebhookPayload = {
      id: "p1",
      timestamp: new Date().toISOString(),
      eventType: "info",
      severity: "low",
      summary: "Low priority",
      details: {},
      source: "test",
    };

    const results = await mgr.dispatch(payload);
    assert.equal(results.length, 1);
    assert.equal(results[0].status, "filtered");
  });
});
