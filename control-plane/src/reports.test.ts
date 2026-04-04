/**
 * Tests for Governance Reporting (GP-06)
 */

import assert from "node:assert/strict";
import * as http from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { GovernanceEvent } from "./event-stream";
import type { GovernancePolicy } from "./policies";
import type { ReporterContext, ReportType } from "./reports";
import { GovernanceReporter } from "./reports";

// ---------------------------------------------------------------------------
// Mock context
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<GovernanceEvent> = {}): GovernanceEvent {
  return {
    id: `gevt_${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    type: "health_check",
    severity: "info",
    source: "test",
    detail: {},
    ...overrides,
  };
}

function makePolicy(overrides: Partial<GovernancePolicy> = {}): GovernancePolicy {
  const now = new Date().toISOString();
  return {
    id: `pol_${Math.random().toString(36).slice(2)}`,
    name: "Test Policy",
    description: "",
    version: 1,
    enforcement: "monitor",
    scope: "fleet",
    rule: {},
    status: "active",
    createdAt: now,
    updatedAt: now,
    createdBy: "test",
    ...overrides,
  };
}

function makeContext(
  events: GovernanceEvent[] = [],
  policies: GovernancePolicy[] = [],
): ReporterContext {
  return {
    getEvents(startDate: string, endDate: string) {
      const startMs = Date.parse(startDate);
      const endMs = Date.parse(endDate);
      return events.filter((e) => {
        const t = Date.parse(e.timestamp);
        return t >= startMs && t <= endMs;
      });
    },
    getPolicies() {
      return policies;
    },
    getAgentStatuses() {
      return [
        { agentId: "agent-1", status: "running", budgetUsedPercent: 50, qualityScore: 90 },
        { agentId: "agent-2", status: "stopped", budgetUsedPercent: 80, qualityScore: 70 },
      ];
    },
  };
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function httpPost(url: string, body: unknown): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = JSON.stringify(body);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(bodyStr)),
        },
      },
      (res) => {
        let respBody = "";
        res.on("data", (chunk: string) => {
          respBody += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: respBody }));
      },
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Unit tests — report generation
// ---------------------------------------------------------------------------

describe("GovernanceReporter — compliance report", () => {
  it("generates compliance report with no events or policies", () => {
    const reporter = new GovernanceReporter(makeContext());
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date().toISOString();
    const result = reporter.generate({ type: "compliance", startDate: start, endDate: end });

    assert.ok(result.id.startsWith("rpt_"));
    assert.equal(result.type, "compliance");
    assert.ok(result.text.includes("COMPLIANCE REPORT"));
    const data = result.json as { totalPolicies: number; overallComplianceRate: number };
    assert.equal(data.totalPolicies, 0);
    assert.equal(data.overallComplianceRate, 100);
  });

  it("counts violations per policy", () => {
    const policy = makePolicy({ id: "pol-1", name: "NoOp Policy" });
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date(Date.now() + 1000).toISOString();
    const events = [
      makeEvent({ type: "policy_violation", detail: { policyId: "pol-1" } }),
      makeEvent({ type: "policy_violation", detail: { policyId: "pol-1" } }),
      makeEvent({ type: "health_check" }),
    ];
    const reporter = new GovernanceReporter(makeContext(events, [policy]));
    const result = reporter.generate({ type: "compliance", startDate: start, endDate: end });
    const data = result.json as {
      totalViolations: number;
      byPolicy: Array<{ violations: number }>;
    };
    assert.equal(data.totalViolations, 2);
    assert.equal(data.byPolicy[0].violations, 2);
  });

  it("compliance report text includes policy name", () => {
    const policy = makePolicy({ name: "Security Policy" });
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date(Date.now() + 1000).toISOString();
    const reporter = new GovernanceReporter(makeContext([], [policy]));
    const result = reporter.generate({ type: "compliance", startDate: start, endDate: end });
    assert.ok(result.text.includes("Security Policy"));
  });
});

describe("GovernanceReporter — KPI report", () => {
  it("generates KPI report with zero events", () => {
    const reporter = new GovernanceReporter(makeContext());
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date().toISOString();
    const result = reporter.generate({ type: "kpi", startDate: start, endDate: end });
    const data = result.json as { interventionRate: number; totalEvents: number };
    assert.equal(data.totalEvents, 0);
    assert.equal(data.interventionRate, 0);
  });

  it("calculates intervention rate correctly", () => {
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date(Date.now() + 1000).toISOString();
    const events = [
      makeEvent({ type: "agent_intervention" }),
      makeEvent({ type: "agent_intervention" }),
      makeEvent({ type: "health_check" }),
      makeEvent({ type: "health_check" }),
    ];
    const reporter = new GovernanceReporter(makeContext(events));
    const result = reporter.generate({ type: "kpi", startDate: start, endDate: end });
    const data = result.json as { interventionRate: number; totalInterventions: number };
    assert.equal(data.totalInterventions, 2);
    assert.equal(data.interventionRate, 50);
  });

  it("calculates false positive rate from detail flag", () => {
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date(Date.now() + 1000).toISOString();
    const events = [
      makeEvent({ type: "agent_intervention", detail: { falsePositive: true } }),
      makeEvent({ type: "agent_intervention", detail: { falsePositive: false } }),
    ];
    const reporter = new GovernanceReporter(makeContext(events));
    const result = reporter.generate({ type: "kpi", startDate: start, endDate: end });
    const data = result.json as { falsePositiveRate: number };
    assert.equal(data.falsePositiveRate, 50);
  });

  it("calculates avg resolution time from detail", () => {
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date(Date.now() + 1000).toISOString();
    const events = [
      makeEvent({ type: "agent_intervention", detail: { resolutionTimeMs: 1000 } }),
      makeEvent({ type: "agent_intervention", detail: { resolutionTimeMs: 3000 } }),
    ];
    const reporter = new GovernanceReporter(makeContext(events));
    const result = reporter.generate({ type: "kpi", startDate: start, endDate: end });
    const data = result.json as { avgResolutionTimeMs: number };
    assert.equal(data.avgResolutionTimeMs, 2000);
  });
});

describe("GovernanceReporter — fleet health report", () => {
  it("generates fleet health report", () => {
    const reporter = new GovernanceReporter(makeContext());
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date().toISOString();
    const result = reporter.generate({ type: "fleet_health", startDate: start, endDate: end });
    assert.ok(result.text.includes("FLEET HEALTH REPORT"));
    const data = result.json as { totalAgents: number; agents: unknown[] };
    assert.equal(data.totalAgents, 2);
    assert.equal(data.agents.length, 2);
  });

  it("includes agent utilization data", () => {
    const reporter = new GovernanceReporter(makeContext());
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date().toISOString();
    const result = reporter.generate({ type: "fleet_health", startDate: start, endDate: end });
    const data = result.json as { avgBudgetUsedPercent: number };
    assert.equal(data.avgBudgetUsedPercent, 65); // (50+80)/2
  });
});

describe("GovernanceReporter — audit report", () => {
  it("returns complete event log for period", () => {
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date(Date.now() + 1000).toISOString();
    const events = [
      makeEvent({ type: "policy_violation" }),
      makeEvent({ type: "health_check" }),
      makeEvent({ type: "audit_event" }),
    ];
    const reporter = new GovernanceReporter(makeContext(events));
    const result = reporter.generate({ type: "audit", startDate: start, endDate: end });
    assert.ok(result.text.includes("AUDIT REPORT"));
    const data = result.json as { total: number };
    assert.equal(data.total, 3);
  });

  it("excludes events outside period", () => {
    const start = new Date(Date.now() + 10_000).toISOString();
    const end = new Date(Date.now() + 20_000).toISOString();
    const events = [makeEvent({ type: "health_check" })];
    const reporter = new GovernanceReporter(makeContext(events));
    const result = reporter.generate({ type: "audit", startDate: start, endDate: end });
    const data = result.json as { total: number };
    assert.equal(data.total, 0);
  });
});

describe("GovernanceReporter — trend report", () => {
  it("generates trend report with stable trend when no events", () => {
    const reporter = new GovernanceReporter(makeContext());
    const start = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const end = new Date().toISOString();
    const result = reporter.generate({ type: "trend", startDate: start, endDate: end });
    assert.ok(result.text.includes("TREND ANALYSIS REPORT"));
    const data = result.json as { violationTrend: string; complianceTrend: string };
    assert.ok(["stable", "increasing", "decreasing"].includes(data.violationTrend));
    assert.ok(["stable", "improving", "degrading"].includes(data.complianceTrend));
  });

  it("creates multiple periods", () => {
    const reporter = new GovernanceReporter(makeContext());
    const start = new Date(Date.now() - 8 * 3600_000).toISOString();
    const end = new Date().toISOString();
    const result = reporter.generate({ type: "trend", startDate: start, endDate: end });
    const data = result.json as { periods: unknown[] };
    assert.ok(data.periods.length >= 1);
  });
});

// ---------------------------------------------------------------------------
// HTTP endpoint tests
// ---------------------------------------------------------------------------

describe("GovernanceReporter — HTTP endpoint", () => {
  let reporter: GovernanceReporter;
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    reporter = new GovernanceReporter(makeContext());
    server = http.createServer((req, res) => {
      const handled = reporter.route(req, res);
      if (!handled) {
        res.writeHead(404);
        res.end("Not Found");
      }
    });
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("POST /api/v1/reports/generate returns 200 for valid request", async () => {
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date().toISOString();
    const res = await httpPost(`http://127.0.0.1:${port}/api/v1/reports/generate`, {
      type: "compliance",
      startDate: start,
      endDate: end,
    });
    assert.equal(res.status, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.type, "compliance");
    assert.ok(body.data.id.startsWith("rpt_"));
  });

  it("returns 400 for invalid report type", async () => {
    const res = await httpPost(`http://127.0.0.1:${port}/api/v1/reports/generate`, {
      type: "invalid_type",
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    });
    assert.equal(res.status, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.success, false);
  });

  it("returns 400 when startDate is missing", async () => {
    const res = await httpPost(`http://127.0.0.1:${port}/api/v1/reports/generate`, {
      type: "kpi",
      endDate: new Date().toISOString(),
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 when endDate is missing", async () => {
    const res = await httpPost(`http://127.0.0.1:${port}/api/v1/reports/generate`, {
      type: "kpi",
      startDate: new Date().toISOString(),
    });
    assert.equal(res.status, 400);
  });

  it("generates all five report types successfully", async () => {
    const start = new Date(Date.now() - 3600_000).toISOString();
    const end = new Date(Date.now() + 1000).toISOString();
    const types: ReportType[] = ["compliance", "kpi", "fleet_health", "audit", "trend"];
    for (const type of types) {
      const res = await httpPost(`http://127.0.0.1:${port}/api/v1/reports/generate`, {
        type,
        startDate: start,
        endDate: end,
      });
      assert.equal(res.status, 200, `Report type '${type}' should return 200`);
      const body = JSON.parse(res.body);
      assert.equal(body.success, true, `Report type '${type}' should succeed`);
    }
  });

  it("returns 404 for unknown routes", async () => {
    const parsed = new URL(`http://127.0.0.1:${port}/api/v1/unknown`);
    const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        { hostname: parsed.hostname, port: parsed.port, path: parsed.pathname, method: "GET" },
        (r) => {
          let body = "";
          r.on("data", (c: string) => {
            body += c;
          });
          r.on("end", () => resolve({ status: r.statusCode ?? 0, body }));
        },
      );
      req.on("error", reject);
      req.end();
    });
    assert.equal(res.status, 404);
  });
});
