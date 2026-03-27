/**
 * Admiral Framework — Governance API Server (GP-01)
 *
 * A REST API server providing governance lifecycle operations:
 * policy CRUD, audit event querying, and fleet status.
 *
 * All routes are under /api/v1/.
 * All routes except GET /api/v1/health require Bearer token authentication.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import * as http from "node:http";
import { isAuthenticated } from "./auth";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  version: number;
  enforcement: "enforce" | "monitor" | "disabled";
  scope: "fleet" | "role" | "project";
  rule: Record<string, unknown>;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  source: string;
  detail: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: { total: number; page: number; pageSize: number };
}

// ---------------------------------------------------------------------------
// Fleet status types (reads from in-memory registry; extensible to file I/O)
// ---------------------------------------------------------------------------

export interface FleetAgentStatus {
  agentId: string;
  status: "running" | "paused" | "stopped" | "unknown";
  lastSeen: string | null;
}

export interface FleetStatus {
  totalAgents: number;
  running: number;
  paused: number;
  stopped: number;
  agents: FleetAgentStatus[];
}

// ---------------------------------------------------------------------------
// In-memory store types
// ---------------------------------------------------------------------------

interface PolicyStore {
  [id: string]: GovernancePolicy;
}

interface AuditStore {
  events: AuditEvent[];
}

// ---------------------------------------------------------------------------
// Helper — read and parse JSON body from request
// ---------------------------------------------------------------------------

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON in request body"));
      }
    });
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Helper — parse URL search params into a plain object
// ---------------------------------------------------------------------------

function parseQuery(url: string): Record<string, string> {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) {
    return {};
  }
  const qs = url.slice(qIdx + 1);
  const result: Record<string, string> = {};
  for (const pair of qs.split("&")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) {
      result[decodeURIComponent(pair)] = "";
    } else {
      result[decodeURIComponent(pair.slice(0, eqIdx))] = decodeURIComponent(pair.slice(eqIdx + 1));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helper — trim query string from a path segment string
// ---------------------------------------------------------------------------

function pathOnly(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

// ---------------------------------------------------------------------------
// GovernanceApiServer
// ---------------------------------------------------------------------------

export class GovernanceApiServer {
  private server: http.Server | null = null;
  private policies: PolicyStore = {};
  private auditStore: AuditStore = { events: [] };
  private startedAt: number = Date.now();

  // Optional fleet registry data injected at construction time.
  // In a production system this would be replaced by a live registry reader.
  private fleetAgents: FleetAgentStatus[];

  constructor(fleetAgents?: FleetAgentStatus[]) {
    this.fleetAgents = fleetAgents ?? [];
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  start(port = 0): Promise<number> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
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

  // -------------------------------------------------------------------------
  // Audit helpers (accessible for testing / external ingestion)
  // -------------------------------------------------------------------------

  /** Append an event to the audit trail. */
  appendAuditEvent(
    type: string,
    severity: AuditEvent["severity"],
    source: string,
    detail: Record<string, unknown>,
  ): AuditEvent {
    const event: AuditEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      severity,
      source,
      detail,
    };
    this.auditStore.events.push(event);
    return event;
  }

  // -------------------------------------------------------------------------
  // Request dispatcher
  // -------------------------------------------------------------------------

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const rawUrl = req.url ?? "/";
    const path = pathOnly(rawUrl);
    const method = req.method ?? "GET";

    // Health check — no auth required
    if (path === "/api/v1/health" && method === "GET") {
      this.serveHealth(res);
      return;
    }

    // All other routes require authentication
    if (!isAuthenticated(req)) {
      this.sendJson<null>(res, 401, {
        success: false,
        error: "Unauthorized: valid Bearer token required",
      });
      return;
    }

    // Route dispatch
    this.dispatch(method, path, rawUrl, req, res).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[governance-api] Unhandled error: ${message}`);
      this.sendJson<null>(res, 500, {
        success: false,
        error: "Internal server error",
      });
    });
  }

  private async dispatch(
    method: string,
    path: string,
    rawUrl: string,
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    // /api/v1/fleet/status
    if (path === "/api/v1/fleet/status" && method === "GET") {
      this.serveFleetStatus(res);
      return;
    }

    // /api/v1/policies  (collection)
    if (path === "/api/v1/policies") {
      if (method === "GET") {
        this.listPolicies(res);
        return;
      }
      if (method === "POST") {
        await this.createPolicy(req, res);
        return;
      }
    }

    // /api/v1/policies/:id  (item)
    const policyItemMatch = path.match(/^\/api\/v1\/policies\/([^/]+)$/);
    if (policyItemMatch) {
      const id = decodeURIComponent(policyItemMatch[1]);
      if (method === "GET") {
        this.getPolicy(id, res);
        return;
      }
      if (method === "PUT") {
        await this.updatePolicy(id, req, res);
        return;
      }
      if (method === "DELETE") {
        this.deactivatePolicy(id, res);
        return;
      }
    }

    // /api/v1/audit/events
    if (path === "/api/v1/audit/events" && method === "GET") {
      this.queryAuditEvents(rawUrl, res);
      return;
    }

    // Fallthrough — 404
    this.sendJson<null>(res, 404, { success: false, error: "Not found" });
  }

  // -------------------------------------------------------------------------
  // Route handlers
  // -------------------------------------------------------------------------

  private serveHealth(res: http.ServerResponse): void {
    this.sendJson(res, 200, {
      success: true,
      data: {
        status: "healthy",
        uptime_ms: Date.now() - this.startedAt,
        policies: Object.keys(this.policies).length,
        auditEvents: this.auditStore.events.length,
      },
    });
  }

  private serveFleetStatus(res: http.ServerResponse): void {
    const agents = this.fleetAgents;
    const status: FleetStatus = {
      totalAgents: agents.length,
      running: agents.filter((a) => a.status === "running").length,
      paused: agents.filter((a) => a.status === "paused").length,
      stopped: agents.filter((a) => a.status === "stopped").length,
      agents,
    };
    this.sendJson<FleetStatus>(res, 200, { success: true, data: status });
  }

  private listPolicies(res: http.ServerResponse): void {
    const list = Object.values(this.policies);
    this.sendJson<GovernancePolicy[]>(res, 200, {
      success: true,
      data: list,
      metadata: { total: list.length, page: 1, pageSize: list.length },
    });
  }

  private getPolicy(id: string, res: http.ServerResponse): void {
    const policy = this.policies[id];
    if (!policy) {
      this.sendJson<null>(res, 404, {
        success: false,
        error: `Policy not found: ${id}`,
      });
      return;
    }
    this.sendJson<GovernancePolicy>(res, 200, { success: true, data: policy });
  }

  private async createPolicy(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      this.sendJson<null>(res, 400, {
        success: false,
        error: "Invalid JSON body",
      });
      return;
    }

    const validation = this.validatePolicyInput(body);
    if (!validation.ok) {
      this.sendJson<null>(res, 400, { success: false, error: validation.error });
      return;
    }

    const input = body as Record<string, unknown>;
    const now = new Date().toISOString();
    const policy: GovernancePolicy = {
      id: randomUUID(),
      name: String(input.name),
      description: String(input.description ?? ""),
      version: 1,
      enforcement: (input.enforcement as GovernancePolicy["enforcement"]) ?? "monitor",
      scope: (input.scope as GovernancePolicy["scope"]) ?? "fleet",
      rule: (input.rule as Record<string, unknown>) ?? {},
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: String(input.createdBy ?? "api"),
    };

    this.policies[policy.id] = policy;
    this.appendAuditEvent("policy.created", "info", "governance-api", {
      policyId: policy.id,
      name: policy.name,
    });

    this.sendJson<GovernancePolicy>(res, 201, { success: true, data: policy });
  }

  private async updatePolicy(
    id: string,
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const existing = this.policies[id];
    if (!existing) {
      this.sendJson<null>(res, 404, {
        success: false,
        error: `Policy not found: ${id}`,
      });
      return;
    }

    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      this.sendJson<null>(res, 400, {
        success: false,
        error: "Invalid JSON body",
      });
      return;
    }

    if (typeof body !== "object" || body === null) {
      this.sendJson<null>(res, 400, { success: false, error: "Body must be a JSON object" });
      return;
    }

    const input = body as Record<string, unknown>;
    const now = new Date().toISOString();

    // Validate enforcement and scope if provided
    const VALID_ENFORCEMENT = ["enforce", "monitor", "disabled"] as const;
    const VALID_SCOPE = ["fleet", "role", "project"] as const;

    if (
      input.enforcement !== undefined &&
      !VALID_ENFORCEMENT.includes(input.enforcement as GovernancePolicy["enforcement"])
    ) {
      this.sendJson<null>(res, 400, {
        success: false,
        error: `Invalid enforcement value: ${String(input.enforcement)}`,
      });
      return;
    }

    if (
      input.scope !== undefined &&
      !VALID_SCOPE.includes(input.scope as GovernancePolicy["scope"])
    ) {
      this.sendJson<null>(res, 400, {
        success: false,
        error: `Invalid scope value: ${String(input.scope)}`,
      });
      return;
    }

    // Create new version (immutable history pattern — store updated copy)
    const updated: GovernancePolicy = {
      ...existing,
      name: input.name !== undefined ? String(input.name) : existing.name,
      description:
        input.description !== undefined ? String(input.description) : existing.description,
      enforcement:
        input.enforcement !== undefined
          ? (input.enforcement as GovernancePolicy["enforcement"])
          : existing.enforcement,
      scope:
        input.scope !== undefined ? (input.scope as GovernancePolicy["scope"]) : existing.scope,
      rule: input.rule !== undefined ? (input.rule as Record<string, unknown>) : existing.rule,
      version: existing.version + 1,
      updatedAt: now,
    };

    this.policies[id] = updated;
    this.appendAuditEvent("policy.updated", "info", "governance-api", {
      policyId: id,
      newVersion: updated.version,
    });

    this.sendJson<GovernancePolicy>(res, 200, { success: true, data: updated });
  }

  private deactivatePolicy(id: string, res: http.ServerResponse): void {
    const existing = this.policies[id];
    if (!existing) {
      this.sendJson<null>(res, 404, {
        success: false,
        error: `Policy not found: ${id}`,
      });
      return;
    }

    const deactivated: GovernancePolicy = {
      ...existing,
      status: "inactive",
      updatedAt: new Date().toISOString(),
    };
    this.policies[id] = deactivated;

    this.appendAuditEvent("policy.deactivated", "info", "governance-api", {
      policyId: id,
    });

    this.sendJson<GovernancePolicy>(res, 200, {
      success: true,
      data: deactivated,
    });
  }

  private queryAuditEvents(rawUrl: string, res: http.ServerResponse): void {
    const query = parseQuery(rawUrl);
    let events = [...this.auditStore.events];

    // Filter by since (ISO timestamp)
    if (query.since) {
      const sinceMs = Date.parse(query.since);
      if (!Number.isNaN(sinceMs)) {
        events = events.filter((e) => Date.parse(e.timestamp) >= sinceMs);
      }
    }

    // Filter by type
    if (query.type) {
      events = events.filter((e) => e.type === query.type);
    }

    // Filter by severity
    if (query.severity) {
      events = events.filter((e) => e.severity === query.severity);
    }

    this.sendJson<AuditEvent[]>(res, 200, {
      success: true,
      data: events,
      metadata: { total: events.length, page: 1, pageSize: events.length },
    });
  }

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  private validatePolicyInput(body: unknown): { ok: true } | { ok: false; error: string } {
    if (typeof body !== "object" || body === null) {
      return { ok: false, error: "Body must be a JSON object" };
    }
    const input = body as Record<string, unknown>;

    if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
      return { ok: false, error: "Field 'name' is required and must be a non-empty string" };
    }

    const VALID_ENFORCEMENT = ["enforce", "monitor", "disabled"];
    if (
      input.enforcement !== undefined &&
      !VALID_ENFORCEMENT.includes(input.enforcement as string)
    ) {
      return {
        ok: false,
        error: `Invalid enforcement '${String(input.enforcement)}'. Must be one of: ${VALID_ENFORCEMENT.join(", ")}`,
      };
    }

    const VALID_SCOPE = ["fleet", "role", "project"];
    if (input.scope !== undefined && !VALID_SCOPE.includes(input.scope as string)) {
      return {
        ok: false,
        error: `Invalid scope '${String(input.scope)}'. Must be one of: ${VALID_SCOPE.join(", ")}`,
      };
    }

    if (
      input.rule !== undefined &&
      (typeof input.rule !== "object" || input.rule === null || Array.isArray(input.rule))
    ) {
      return { ok: false, error: "Field 'rule' must be a JSON object" };
    }

    return { ok: true };
  }

  // -------------------------------------------------------------------------
  // Response helpers
  // -------------------------------------------------------------------------

  private sendJson<T>(res: http.ServerResponse, status: number, payload: ApiResponse<T>): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload, null, 2));
  }
}
