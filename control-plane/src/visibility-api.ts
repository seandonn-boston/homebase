/**
 * Admiral Framework — Visibility Pillar API (GP-01b)
 *
 * Pillar 1 of 4 in the Governance Platform: Visibility.
 * Provides read-only views into fleet health, task progress,
 * resource consumption, decision history, and failure patterns.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import * as http from "node:http";
import { parseQuery, pathOnly, sendJson } from "./http-helpers";

// ---------------------------------------------------------------------------
// View interfaces — public API surface
// ---------------------------------------------------------------------------

export interface FleetStatusView {
  totalAgents: number;
  byStatus: Record<string, number>; // running, paused, stopped
  byRole: Record<string, number>;
  lastUpdated: string;
}

export interface TaskProgressView {
  activeTasks: number;
  completedToday: number;
  blockedTasks: number;
  tasks: Array<{
    id: string;
    name: string;
    assignee: string;
    status: string;
    progress: number; // 0–100
    startedAt: string;
  }>;
}

export interface ResourceConsumptionView {
  tokenBudget: { used: number; total: number; pct: number };
  costEstimate: { current: number; projected: number; currency: string };
  modelUsage: Record<string, number>;
}

export interface DecisionHistoryView {
  decisions: Array<{
    id: string;
    timestamp: string;
    type: string;
    agent: string;
    description: string;
    outcome: string;
  }>;
  total: number;
}

export interface FailurePatternView {
  patterns: Array<{
    signature: string;
    count: number;
    lastSeen: string;
    severity: string;
    affectedAgents: string[];
    suggestedAction: string;
  }>;
  totalFailures24h: number;
}

// ---------------------------------------------------------------------------
// Internal data-store shapes
// ---------------------------------------------------------------------------

export interface AgentRecord {
  agentId: string;
  status: "running" | "paused" | "stopped";
  role: string;
  lastSeen: string;
}

export interface TaskRecord {
  id: string;
  name: string;
  assignee: string;
  status: "active" | "blocked" | "completed";
  progress: number;
  startedAt: string;
  completedAt?: string;
}

export interface ResourceRecord {
  tokensUsed: number;
  tokensTotal: number;
  costCurrent: number;
  costProjected: number;
  currency: string;
  modelUsage: Record<string, number>;
}

export interface DecisionRecord {
  id: string;
  timestamp: string;
  type: string;
  agent: string;
  description: string;
  outcome: string;
}

export interface FailureRecord {
  signature: string;
  timestamp: string;
  severity: string;
  affectedAgent: string;
  suggestedAction: string;
}

// ---------------------------------------------------------------------------
// In-memory stores passed into VisibilityApi
// ---------------------------------------------------------------------------

export interface VisibilityStores {
  agents?: AgentRecord[];
  tasks?: TaskRecord[];
  resources?: ResourceRecord;
  decisions?: DecisionRecord[];
  failures?: FailureRecord[];
}

// ---------------------------------------------------------------------------
// VisibilityApi — the core data-access class
// ---------------------------------------------------------------------------

export class VisibilityApi {
  private agents: AgentRecord[];
  private tasks: TaskRecord[];
  private resources: ResourceRecord;
  private decisions: DecisionRecord[];
  private failures: FailureRecord[];

  constructor(stores?: VisibilityStores) {
    this.agents = stores?.agents ?? [];
    this.tasks = stores?.tasks ?? [];
    this.resources = stores?.resources ?? {
      tokensUsed: 0,
      tokensTotal: 1_000_000,
      costCurrent: 0,
      costProjected: 0,
      currency: "USD",
      modelUsage: {},
    };
    this.decisions = stores?.decisions ?? [];
    this.failures = stores?.failures ?? [];
  }

  // -------------------------------------------------------------------------
  // Public view methods
  // -------------------------------------------------------------------------

  getFleetStatus(): FleetStatusView {
    const byStatus: Record<string, number> = {};
    const byRole: Record<string, number> = {};

    for (const agent of this.agents) {
      byStatus[agent.status] = (byStatus[agent.status] ?? 0) + 1;
      byRole[agent.role] = (byRole[agent.role] ?? 0) + 1;
    }

    return {
      totalAgents: this.agents.length,
      byStatus,
      byRole,
      lastUpdated: new Date().toISOString(),
    };
  }

  getTaskProgress(): TaskProgressView {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const activeTasks = this.tasks.filter((t) => t.status === "active");
    const blockedTasks = this.tasks.filter((t) => t.status === "blocked");
    const completedToday = this.tasks.filter((t) => {
      if (t.status !== "completed" || !t.completedAt) return false;
      return Date.parse(t.completedAt) >= startOfDay;
    });

    return {
      activeTasks: activeTasks.length,
      completedToday: completedToday.length,
      blockedTasks: blockedTasks.length,
      tasks: [...activeTasks, ...blockedTasks].map((t) => ({
        id: t.id,
        name: t.name,
        assignee: t.assignee,
        status: t.status,
        progress: t.progress,
        startedAt: t.startedAt,
      })),
    };
  }

  getResourceConsumption(): ResourceConsumptionView {
    const r = this.resources;
    const pct = r.tokensTotal > 0 ? Math.round((r.tokensUsed / r.tokensTotal) * 100) : 0;
    return {
      tokenBudget: { used: r.tokensUsed, total: r.tokensTotal, pct },
      costEstimate: {
        current: r.costCurrent,
        projected: r.costProjected,
        currency: r.currency,
      },
      modelUsage: { ...r.modelUsage },
    };
  }

  getDecisionHistory(since?: string): DecisionHistoryView {
    let decisions = [...this.decisions];

    if (since) {
      const sinceMs = Date.parse(since);
      if (!Number.isNaN(sinceMs)) {
        decisions = decisions.filter((d) => Date.parse(d.timestamp) >= sinceMs);
      }
    }

    return {
      decisions: decisions.map((d) => ({
        id: d.id,
        timestamp: d.timestamp,
        type: d.type,
        agent: d.agent,
        description: d.description,
        outcome: d.outcome,
      })),
      total: decisions.length,
    };
  }

  getFailurePatterns(): FailurePatternView {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1_000;

    // Aggregate failures by signature
    const bySignature = new Map<
      string,
      {
        count: number;
        lastSeen: string;
        severity: string;
        affectedAgents: Set<string>;
        suggestedAction: string;
      }
    >();

    let totalFailures24h = 0;

    for (const failure of this.failures) {
      const ts = Date.parse(failure.timestamp);
      if (ts >= twentyFourHoursAgo) {
        totalFailures24h++;
      }

      const existing = bySignature.get(failure.signature);
      if (existing) {
        existing.count++;
        if (ts > Date.parse(existing.lastSeen)) {
          existing.lastSeen = failure.timestamp;
        }
        existing.affectedAgents.add(failure.affectedAgent);
      } else {
        bySignature.set(failure.signature, {
          count: 1,
          lastSeen: failure.timestamp,
          severity: failure.severity,
          affectedAgents: new Set([failure.affectedAgent]),
          suggestedAction: failure.suggestedAction,
        });
      }
    }

    const patterns = Array.from(bySignature.entries()).map(([signature, data]) => ({
      signature,
      count: data.count,
      lastSeen: data.lastSeen,
      severity: data.severity,
      affectedAgents: Array.from(data.affectedAgents),
      suggestedAction: data.suggestedAction,
    }));

    return { patterns, totalFailures24h };
  }

  // -------------------------------------------------------------------------
  // Mutation helpers (for testing / data ingestion)
  // -------------------------------------------------------------------------

  /** Add or replace an agent record. */
  upsertAgent(agent: AgentRecord): void {
    const idx = this.agents.findIndex((a) => a.agentId === agent.agentId);
    if (idx >= 0) {
      this.agents[idx] = agent;
    } else {
      this.agents.push(agent);
    }
  }

  /** Add a task record. */
  addTask(task: TaskRecord): void {
    this.tasks.push(task);
  }

  /** Set resource snapshot. */
  setResources(r: ResourceRecord): void {
    this.resources = r;
  }

  /** Append a decision record. */
  addDecision(decision: Omit<DecisionRecord, "id"> & { id?: string }): DecisionRecord {
    const record: DecisionRecord = {
      id: decision.id ?? randomUUID(),
      timestamp: decision.timestamp,
      type: decision.type,
      agent: decision.agent,
      description: decision.description,
      outcome: decision.outcome,
    };
    this.decisions.push(record);
    return record;
  }

  /** Append a failure record. */
  addFailure(failure: FailureRecord): void {
    this.failures.push(failure);
  }
}

// ---------------------------------------------------------------------------
// HTTP route handler — plugs into the governance API server or a standalone
// ---------------------------------------------------------------------------

/**
 * handleVisibilityRequest — route visibility requests.
 *
 * Call this from a parent HTTP server's request handler when the path starts
 * with /api/v1/visibility/.
 *
 * Returns `true` if the route was handled, `false` if it fell through.
 */
export function handleVisibilityRequest(
  api: VisibilityApi,
  method: string,
  rawUrl: string,
  res: http.ServerResponse,
): boolean {
  if (method !== "GET") return false;

  const path = pathOnly(rawUrl);
  const query = parseQuery(rawUrl);

  if (path === "/api/v1/visibility/fleet-status") {
    sendJson(res, 200, { success: true, data: api.getFleetStatus() });
    return true;
  }

  if (path === "/api/v1/visibility/task-progress") {
    sendJson(res, 200, { success: true, data: api.getTaskProgress() });
    return true;
  }

  if (path === "/api/v1/visibility/resources") {
    sendJson(res, 200, { success: true, data: api.getResourceConsumption() });
    return true;
  }

  if (path === "/api/v1/visibility/decisions") {
    sendJson(res, 200, { success: true, data: api.getDecisionHistory(query.since) });
    return true;
  }

  if (path === "/api/v1/visibility/failures") {
    sendJson(res, 200, { success: true, data: api.getFailurePatterns() });
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// VisibilityServer — standalone HTTP server for the visibility pillar
// ---------------------------------------------------------------------------

export class VisibilityServer {
  private server: http.Server | null = null;
  readonly api: VisibilityApi;

  constructor(stores?: VisibilityStores) {
    this.api = new VisibilityApi(stores);
  }

  start(port = 0): Promise<number> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        const method = req.method ?? "GET";
        const rawUrl = req.url ?? "/";
        const handled = handleVisibilityRequest(this.api, method, rawUrl, res);
        if (!handled) {
          sendJson(res, 404, { success: false, error: "Not found" });
        }
      });
      this.server.listen(port, () => {
        const addr = this.server!.address() as { port: number };
        resolve(addr.port);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => resolve());
    });
  }
}
