/**
 * Tests for Visibility Pillar API (GP-01b)
 */

import assert from "node:assert/strict";
import * as http from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  type AgentRecord,
  type FailureRecord,
  type ResourceRecord,
  VisibilityApi,
  VisibilityServer,
} from "./visibility-api";

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

interface HttpResponse {
  status: number;
  body: string;
}

function httpGet(url: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk: string) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode!, body }));
      })
      .on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// VisibilityApi unit tests (no HTTP)
// ---------------------------------------------------------------------------

describe("VisibilityApi", () => {
  let api: VisibilityApi;

  beforeEach(() => {
    api = new VisibilityApi();
  });

  // -------------------------------------------------------------------------
  // getFleetStatus
  // -------------------------------------------------------------------------

  describe("getFleetStatus()", () => {
    it("returns zero counts when no agents registered", () => {
      const view = api.getFleetStatus();
      assert.equal(view.totalAgents, 0);
      assert.deepEqual(view.byStatus, {});
      assert.deepEqual(view.byRole, {});
      assert.ok(typeof view.lastUpdated === "string");
    });

    it("counts agents by status", () => {
      api.upsertAgent({ agentId: "a1", status: "running", role: "worker", lastSeen: "" });
      api.upsertAgent({ agentId: "a2", status: "running", role: "worker", lastSeen: "" });
      api.upsertAgent({ agentId: "a3", status: "paused", role: "supervisor", lastSeen: "" });
      api.upsertAgent({ agentId: "a4", status: "stopped", role: "worker", lastSeen: "" });

      const view = api.getFleetStatus();
      assert.equal(view.totalAgents, 4);
      assert.equal(view.byStatus.running, 2);
      assert.equal(view.byStatus.paused, 1);
      assert.equal(view.byStatus.stopped, 1);
    });

    it("counts agents by role", () => {
      api.upsertAgent({ agentId: "a1", status: "running", role: "worker", lastSeen: "" });
      api.upsertAgent({ agentId: "a2", status: "running", role: "worker", lastSeen: "" });
      api.upsertAgent({ agentId: "a3", status: "running", role: "supervisor", lastSeen: "" });

      const view = api.getFleetStatus();
      assert.equal(view.byRole.worker, 2);
      assert.equal(view.byRole.supervisor, 1);
    });

    it("upsertAgent replaces existing agent", () => {
      api.upsertAgent({ agentId: "a1", status: "running", role: "worker", lastSeen: "" });
      api.upsertAgent({ agentId: "a1", status: "stopped", role: "worker", lastSeen: "" });

      const view = api.getFleetStatus();
      assert.equal(view.totalAgents, 1);
      assert.equal(view.byStatus.stopped, 1);
      assert.equal(view.byStatus.running, undefined);
    });

    it("lastUpdated is a valid ISO string", () => {
      const view = api.getFleetStatus();
      assert.ok(!Number.isNaN(Date.parse(view.lastUpdated)));
    });
  });

  // -------------------------------------------------------------------------
  // getTaskProgress
  // -------------------------------------------------------------------------

  describe("getTaskProgress()", () => {
    it("returns zero counts when no tasks", () => {
      const view = api.getTaskProgress();
      assert.equal(view.activeTasks, 0);
      assert.equal(view.completedToday, 0);
      assert.equal(view.blockedTasks, 0);
      assert.deepEqual(view.tasks, []);
    });

    it("counts active and blocked tasks", () => {
      api.addTask({
        id: "t1",
        name: "Task One",
        assignee: "agent-1",
        status: "active",
        progress: 50,
        startedAt: new Date().toISOString(),
      });
      api.addTask({
        id: "t2",
        name: "Task Two",
        assignee: "agent-2",
        status: "blocked",
        progress: 20,
        startedAt: new Date().toISOString(),
      });
      api.addTask({
        id: "t3",
        name: "Task Three",
        assignee: "agent-3",
        status: "completed",
        progress: 100,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      const view = api.getTaskProgress();
      assert.equal(view.activeTasks, 1);
      assert.equal(view.blockedTasks, 1);
      assert.equal(view.completedToday, 1);
      assert.equal(view.tasks.length, 2); // active + blocked only
    });

    it("only counts completedToday for tasks completed since midnight", () => {
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1_000).toISOString();
      api.addTask({
        id: "t1",
        name: "Old",
        assignee: "a",
        status: "completed",
        progress: 100,
        startedAt: yesterday,
        completedAt: yesterday,
      });
      api.addTask({
        id: "t2",
        name: "Today",
        assignee: "b",
        status: "completed",
        progress: 100,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      const view = api.getTaskProgress();
      assert.equal(view.completedToday, 1);
    });

    it("task view includes required fields", () => {
      api.addTask({
        id: "t1",
        name: "Sample",
        assignee: "agent-x",
        status: "active",
        progress: 75,
        startedAt: "2026-01-01T00:00:00.000Z",
      });
      const view = api.getTaskProgress();
      const t = view.tasks[0];
      assert.equal(t.id, "t1");
      assert.equal(t.name, "Sample");
      assert.equal(t.assignee, "agent-x");
      assert.equal(t.status, "active");
      assert.equal(t.progress, 75);
      assert.equal(t.startedAt, "2026-01-01T00:00:00.000Z");
    });
  });

  // -------------------------------------------------------------------------
  // getResourceConsumption
  // -------------------------------------------------------------------------

  describe("getResourceConsumption()", () => {
    it("returns default zeros when no resources set", () => {
      const view = api.getResourceConsumption();
      assert.equal(view.tokenBudget.used, 0);
      assert.equal(view.tokenBudget.total, 1_000_000);
      assert.equal(view.tokenBudget.pct, 0);
      assert.equal(view.costEstimate.currency, "USD");
    });

    it("calculates percentage correctly", () => {
      api.setResources({
        tokensUsed: 250_000,
        tokensTotal: 1_000_000,
        costCurrent: 5.0,
        costProjected: 20.0,
        currency: "USD",
        modelUsage: { "claude-sonnet": 250_000 },
      });
      const view = api.getResourceConsumption();
      assert.equal(view.tokenBudget.pct, 25);
      assert.equal(view.costEstimate.current, 5.0);
      assert.equal(view.costEstimate.projected, 20.0);
    });

    it("handles zero total without dividing by zero", () => {
      api.setResources({
        tokensUsed: 0,
        tokensTotal: 0,
        costCurrent: 0,
        costProjected: 0,
        currency: "USD",
        modelUsage: {},
      });
      const view = api.getResourceConsumption();
      assert.equal(view.tokenBudget.pct, 0);
    });

    it("returns model usage map", () => {
      api.setResources({
        tokensUsed: 100,
        tokensTotal: 1_000,
        costCurrent: 0.01,
        costProjected: 0.1,
        currency: "USD",
        modelUsage: { "model-a": 60, "model-b": 40 },
      });
      const view = api.getResourceConsumption();
      assert.equal(view.modelUsage["model-a"], 60);
      assert.equal(view.modelUsage["model-b"], 40);
    });
  });

  // -------------------------------------------------------------------------
  // getDecisionHistory
  // -------------------------------------------------------------------------

  describe("getDecisionHistory()", () => {
    it("returns empty when no decisions", () => {
      const view = api.getDecisionHistory();
      assert.equal(view.total, 0);
      assert.deepEqual(view.decisions, []);
    });

    it("returns all decisions when no since filter", () => {
      api.addDecision({
        timestamp: "2026-01-01T00:00:00.000Z",
        type: "escalate",
        agent: "agent-1",
        description: "Escalated due to budget",
        outcome: "approved",
      });
      api.addDecision({
        timestamp: "2026-01-02T00:00:00.000Z",
        type: "pause",
        agent: "agent-2",
        description: "Paused for review",
        outcome: "pending",
      });
      const view = api.getDecisionHistory();
      assert.equal(view.total, 2);
      assert.equal(view.decisions.length, 2);
    });

    it("filters by since timestamp", () => {
      api.addDecision({
        timestamp: "2026-01-01T00:00:00.000Z",
        type: "old",
        agent: "a",
        description: "old",
        outcome: "ok",
      });
      api.addDecision({
        timestamp: "2026-06-01T00:00:00.000Z",
        type: "recent",
        agent: "b",
        description: "recent",
        outcome: "ok",
      });
      const view = api.getDecisionHistory("2026-03-01T00:00:00.000Z");
      assert.equal(view.total, 1);
      assert.equal(view.decisions[0].type, "recent");
    });

    it("ignores invalid since timestamp and returns all", () => {
      api.addDecision({
        timestamp: "2026-01-01T00:00:00.000Z",
        type: "ev",
        agent: "a",
        description: "d",
        outcome: "o",
      });
      const view = api.getDecisionHistory("not-a-date");
      assert.equal(view.total, 1);
    });

    it("auto-generates id when not provided", () => {
      const record = api.addDecision({
        timestamp: new Date().toISOString(),
        type: "test",
        agent: "a",
        description: "d",
        outcome: "o",
      });
      assert.ok(typeof record.id === "string");
      assert.ok(record.id.length > 0);
    });

    it("preserves provided id", () => {
      const record = api.addDecision({
        id: "custom-id-123",
        timestamp: new Date().toISOString(),
        type: "test",
        agent: "a",
        description: "d",
        outcome: "o",
      });
      assert.equal(record.id, "custom-id-123");
    });
  });

  // -------------------------------------------------------------------------
  // getFailurePatterns
  // -------------------------------------------------------------------------

  describe("getFailurePatterns()", () => {
    it("returns empty when no failures", () => {
      const view = api.getFailurePatterns();
      assert.equal(view.totalFailures24h, 0);
      assert.deepEqual(view.patterns, []);
    });

    it("groups failures by signature", () => {
      const now = new Date().toISOString();
      const failure: FailureRecord = {
        signature: "OOM-crash",
        timestamp: now,
        severity: "high",
        affectedAgent: "agent-1",
        suggestedAction: "Increase memory limit",
      };
      api.addFailure(failure);
      api.addFailure({ ...failure, affectedAgent: "agent-2" });

      const view = api.getFailurePatterns();
      assert.equal(view.patterns.length, 1);
      assert.equal(view.patterns[0].signature, "OOM-crash");
      assert.equal(view.patterns[0].count, 2);
      assert.equal(view.patterns[0].affectedAgents.length, 2);
    });

    it("counts only failures within the last 24h", () => {
      const recent = new Date().toISOString();
      const old = new Date(Date.now() - 25 * 60 * 60 * 1_000).toISOString();

      api.addFailure({
        signature: "err",
        timestamp: old,
        severity: "low",
        affectedAgent: "a",
        suggestedAction: "retry",
      });
      api.addFailure({
        signature: "err",
        timestamp: recent,
        severity: "low",
        affectedAgent: "b",
        suggestedAction: "retry",
      });

      const view = api.getFailurePatterns();
      assert.equal(view.totalFailures24h, 1);
    });

    it("tracks lastSeen as most recent failure timestamp per signature", () => {
      const t1 = "2026-03-25T10:00:00.000Z";
      const t2 = "2026-03-25T12:00:00.000Z";

      api.addFailure({
        signature: "timeout",
        timestamp: t1,
        severity: "medium",
        affectedAgent: "a",
        suggestedAction: "check network",
      });
      api.addFailure({
        signature: "timeout",
        timestamp: t2,
        severity: "medium",
        affectedAgent: "b",
        suggestedAction: "check network",
      });

      const view = api.getFailurePatterns();
      assert.equal(view.patterns[0].lastSeen, t2);
    });

    it("pattern includes all required fields", () => {
      api.addFailure({
        signature: "disk-full",
        timestamp: new Date().toISOString(),
        severity: "critical",
        affectedAgent: "agent-5",
        suggestedAction: "Free disk space",
      });

      const view = api.getFailurePatterns();
      const p = view.patterns[0];
      assert.equal(p.signature, "disk-full");
      assert.equal(p.count, 1);
      assert.equal(p.severity, "critical");
      assert.deepEqual(p.affectedAgents, ["agent-5"]);
      assert.equal(p.suggestedAction, "Free disk space");
    });
  });
});

// ---------------------------------------------------------------------------
// VisibilityServer HTTP integration tests
// ---------------------------------------------------------------------------

describe("VisibilityServer", () => {
  let srv: VisibilityServer;
  let baseUrl: string;

  beforeEach(async () => {
    srv = new VisibilityServer();
    const port = await srv.start(0);
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    await srv.stop();
  });

  it("GET /api/v1/visibility/fleet-status returns 200 with view", async () => {
    const res = await httpGet(`${baseUrl}/api/v1/visibility/fleet-status`);
    assert.equal(res.status, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.success, true);
    assert.equal(typeof data.data.totalAgents, "number");
    assert.ok("byStatus" in data.data);
    assert.ok("byRole" in data.data);
    assert.ok("lastUpdated" in data.data);
  });

  it("GET /api/v1/visibility/task-progress returns 200 with view", async () => {
    const res = await httpGet(`${baseUrl}/api/v1/visibility/task-progress`);
    assert.equal(res.status, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.success, true);
    assert.equal(typeof data.data.activeTasks, "number");
    assert.equal(typeof data.data.completedToday, "number");
    assert.equal(typeof data.data.blockedTasks, "number");
    assert.ok(Array.isArray(data.data.tasks));
  });

  it("GET /api/v1/visibility/resources returns 200 with view", async () => {
    const res = await httpGet(`${baseUrl}/api/v1/visibility/resources`);
    assert.equal(res.status, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.success, true);
    assert.ok("tokenBudget" in data.data);
    assert.ok("costEstimate" in data.data);
    assert.ok("modelUsage" in data.data);
  });

  it("GET /api/v1/visibility/decisions returns 200 with view", async () => {
    const res = await httpGet(`${baseUrl}/api/v1/visibility/decisions`);
    assert.equal(res.status, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data.decisions));
    assert.equal(typeof data.data.total, "number");
  });

  it("GET /api/v1/visibility/decisions?since filters correctly", async () => {
    srv.api.addDecision({
      timestamp: "2026-01-01T00:00:00.000Z",
      type: "old",
      agent: "a",
      description: "d",
      outcome: "o",
    });
    srv.api.addDecision({
      timestamp: "2026-06-01T00:00:00.000Z",
      type: "recent",
      agent: "b",
      description: "d",
      outcome: "o",
    });

    const since = encodeURIComponent("2026-03-01T00:00:00.000Z");
    const res = await httpGet(`${baseUrl}/api/v1/visibility/decisions?since=${since}`);
    const data = JSON.parse(res.body);
    assert.equal(data.data.total, 1);
    assert.equal(data.data.decisions[0].type, "recent");
  });

  it("GET /api/v1/visibility/failures returns 200 with view", async () => {
    const res = await httpGet(`${baseUrl}/api/v1/visibility/failures`);
    assert.equal(res.status, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data.patterns));
    assert.equal(typeof data.data.totalFailures24h, "number");
  });

  it("returns 404 for unknown visibility route", async () => {
    const res = await httpGet(`${baseUrl}/api/v1/visibility/unknown`);
    assert.equal(res.status, 404);
    const data = JSON.parse(res.body);
    assert.equal(data.success, false);
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const port = parseInt(new URL(baseUrl).port, 10);
    const res = await new Promise<{ status: number; headers: http.IncomingHttpHeaders }>(
      (resolve, reject) => {
        const req = http.request(
          {
            hostname: "localhost",
            port,
            path: "/api/v1/visibility/fleet-status",
            method: "OPTIONS",
          },
          (r) => {
            r.resume();
            r.on("end", () => resolve({ status: r.statusCode!, headers: r.headers }));
          },
        );
        req.on("error", reject);
        req.end();
      },
    );
    assert.equal(res.status, 204);
    assert.equal(res.headers["access-control-allow-origin"], "*");
  });

  it("fleet-status reflects agents added after construction", async () => {
    const agents: AgentRecord[] = [
      { agentId: "x1", status: "running", role: "worker", lastSeen: new Date().toISOString() },
      { agentId: "x2", status: "paused", role: "supervisor", lastSeen: new Date().toISOString() },
    ];
    for (const a of agents) {
      srv.api.upsertAgent(a);
    }

    const res = await httpGet(`${baseUrl}/api/v1/visibility/fleet-status`);
    const data = JSON.parse(res.body);
    assert.equal(data.data.totalAgents, 2);
    assert.equal(data.data.byStatus.running, 1);
    assert.equal(data.data.byStatus.paused, 1);
  });

  it("resources endpoint reflects updated resource data", async () => {
    const r: ResourceRecord = {
      tokensUsed: 300_000,
      tokensTotal: 1_000_000,
      costCurrent: 3.0,
      costProjected: 10.0,
      currency: "USD",
      modelUsage: { "claude-sonnet": 300_000 },
    };
    srv.api.setResources(r);

    const res = await httpGet(`${baseUrl}/api/v1/visibility/resources`);
    const data = JSON.parse(res.body);
    assert.equal(data.data.tokenBudget.used, 300_000);
    assert.equal(data.data.tokenBudget.pct, 30);
    assert.equal(data.data.costEstimate.current, 3.0);
  });
});
