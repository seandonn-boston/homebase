/**
 * Governance API Server (GP-01 + GP-01b)
 *
 * REST API server exposing governance capabilities:
 * - Policy management (CRUD)
 * - Agent management (registry, status)
 * - Audit trail (query)
 * - Fleet health (status, tasks, resources)
 * - Brain access (query, record)
 * - Visibility pillar endpoints (fleet-status, task-progress, resources, decisions, failures)
 *
 * Extends control plane server architecture. Authentication enforced on all endpoints.
 * API versioning: /api/v1/...
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import * as http from "node:http";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiConfig {
  port: number;
  /** Simple token-based auth (production would use JWT/OAuth) */
  authTokens: Set<string>;
  /** Enable CORS */
  cors: boolean;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
  authenticated: boolean;
  authToken: string | null;
}

export interface ApiResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export type RouteHandler = (req: ApiRequest) => ApiResponse | Promise<ApiResponse>;

export interface Route {
  method: HttpMethod;
  pattern: string;
  handler: RouteHandler;
  description: string;
}

// ---------------------------------------------------------------------------
// Data Stores (in-memory for Phase 1)
// ---------------------------------------------------------------------------

export interface PolicyRecord {
  id: string;
  name: string;
  version: number;
  enforcement: "enforce" | "monitor" | "disabled";
  scope: "fleet-wide" | "per-role" | "per-project";
  rules: unknown[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  rationale: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  resource: string;
  details: Record<string, unknown>;
}

export interface FleetStatus {
  totalAgents: number;
  activeAgents: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  healthStatus: "healthy" | "degraded" | "unhealthy";
}

export interface TaskProgress {
  id: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  assignedAgent: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ResourceUsage {
  tokenBudget: number;
  tokensConsumed: number;
  apiCalls: number;
  costEstimate: number;
}

export interface DecisionRecord {
  id: string;
  timestamp: string;
  agent: string;
  decision: string;
  authorityTier: string;
  outcome: string;
}

export interface FailureRecord {
  id: string;
  timestamp: string;
  agent: string;
  type: string;
  description: string;
  recovered: boolean;
}

// ---------------------------------------------------------------------------
// Governance API Server
// ---------------------------------------------------------------------------

export class GovernanceApiServer {
  private server: http.Server | null = null;
  private config: ApiConfig;
  private routes: Route[] = [];

  // In-memory stores
  private policies: Map<string, PolicyRecord[]> = new Map(); // id -> versions (append-only)
  private auditLog: AuditEntry[] = [];
  private fleetStatus: FleetStatus = {
    totalAgents: 0, activeAgents: 0, queuedTasks: 0,
    completedTasks: 0, failedTasks: 0, healthStatus: "healthy",
  };
  private tasks: TaskProgress[] = [];
  private resources: ResourceUsage = { tokenBudget: 0, tokensConsumed: 0, apiCalls: 0, costEstimate: 0 };
  private decisions: DecisionRecord[] = [];
  private failures: FailureRecord[] = [];

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      port: config.port ?? 4520,
      authTokens: config.authTokens ?? new Set(["dev-token"]),
      cors: config.cors ?? true,
    };
    this.registerRoutes();
  }

  // ---------------------------------------------------------------------------
  // Route Registration
  // ---------------------------------------------------------------------------

  private registerRoutes(): void {
    // Health
    this.route("GET", "/health", () => this.handleHealth(), "Health check");

    // Visibility Pillar (GP-01b)
    this.route("GET", "/api/v1/fleet-status", () => this.handleFleetStatus(), "Fleet status");
    this.route("GET", "/api/v1/task-progress", () => this.handleTaskProgress(), "Task progress");
    this.route("GET", "/api/v1/resources", () => this.handleResources(), "Resource usage");
    this.route("GET", "/api/v1/decisions", () => this.handleDecisions(), "Decision log");
    this.route("GET", "/api/v1/failures", () => this.handleFailures(), "Failure log");

    // Policy Management
    this.route("GET", "/api/v1/policies", () => this.handleListPolicies(), "List policies");
    this.route("GET", "/api/v1/policies/:id", (req) => this.handleGetPolicy(req), "Get policy");
    this.route("POST", "/api/v1/policies", (req) => this.handleCreatePolicy(req), "Create policy");
    this.route("PUT", "/api/v1/policies/:id", (req) => this.handleUpdatePolicy(req), "Update policy");

    // Audit Trail
    this.route("GET", "/api/v1/audit", (req) => this.handleAuditTrail(req), "Query audit trail");

    // Rating
    this.route("GET", "/api/v1/rating", () => this.handleRating(), "Current rating");
  }

  private route(method: HttpMethod, pattern: string, handler: RouteHandler, description: string): void {
    this.routes.push({ method, pattern, handler, description });
  }

  // ---------------------------------------------------------------------------
  // Server Lifecycle
  // ---------------------------------------------------------------------------

  start(): Promise<number> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.config.port, () => {
        const addr = this.server!.address() as { port: number };
        resolve(addr.port);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Request Handling
  // ---------------------------------------------------------------------------

  /** Exposed for testing without starting the HTTP server */
  handleApiRequest(req: ApiRequest): ApiResponse | Promise<ApiResponse> {
    // Auth check (skip for health and OPTIONS)
    if (req.path !== "/health" && req.method !== "OPTIONS") {
      if (!req.authenticated) {
        return { status: 401, body: { error: "Authentication required", code: "UNAUTHORIZED" } };
      }
    }

    // Route matching
    for (const route of this.routes) {
      if (route.method !== req.method) continue;
      const params = matchRoute(route.pattern, req.path);
      if (params !== null) {
        req.params = params;
        return route.handler(req);
      }
    }

    return { status: 404, body: { error: "Not found", code: "NOT_FOUND" } };
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || "/", `http://localhost:${this.config.port}`);

    // CORS
    if (this.config.cors) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Parse auth
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const authenticated = token !== null && this.config.authTokens.has(token);

    // Parse query
    const query: Record<string, string> = {};
    for (const [k, v] of url.searchParams) {
      query[k] = v;
    }

    // Parse body
    let body: unknown = null;
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      body = await readBody(req);
    }

    const apiReq: ApiRequest = {
      method: req.method as HttpMethod,
      path: url.pathname,
      params: {},
      query,
      body,
      headers: req.headers as Record<string, string>,
      authenticated,
      authToken: token,
    };

    const apiRes = await this.handleApiRequest(apiReq);

    res.setHeader("Content-Type", "application/json");
    res.writeHead(apiRes.status);
    res.end(JSON.stringify(apiRes.body));
  }

  // ---------------------------------------------------------------------------
  // Route Handlers
  // ---------------------------------------------------------------------------

  private handleHealth(): ApiResponse {
    return {
      status: 200,
      body: {
        status: "ok",
        version: "1.0.0",
        uptime: process.uptime(),
        endpoints: this.routes.map((r) => ({ method: r.method, path: r.pattern, description: r.description })),
      },
    };
  }

  // Visibility Pillar (GP-01b)
  private handleFleetStatus(): ApiResponse {
    return { status: 200, body: this.fleetStatus };
  }

  private handleTaskProgress(): ApiResponse {
    return { status: 200, body: { tasks: this.tasks, total: this.tasks.length } };
  }

  private handleResources(): ApiResponse {
    return { status: 200, body: this.resources };
  }

  private handleDecisions(): ApiResponse {
    return { status: 200, body: { decisions: this.decisions, total: this.decisions.length } };
  }

  private handleFailures(): ApiResponse {
    return { status: 200, body: { failures: this.failures, total: this.failures.length } };
  }

  // Policy Management
  private handleListPolicies(): ApiResponse {
    const latest: PolicyRecord[] = [];
    for (const [, versions] of this.policies) {
      if (versions.length > 0) {
        latest.push(versions[versions.length - 1]);
      }
    }
    return { status: 200, body: { policies: latest, total: latest.length } };
  }

  private handleGetPolicy(req: ApiRequest): ApiResponse {
    const versions = this.policies.get(req.params.id);
    if (!versions || versions.length === 0) {
      return { status: 404, body: { error: "Policy not found", code: "NOT_FOUND" } };
    }
    const version = req.query.version ? Number(req.query.version) : undefined;
    if (version !== undefined) {
      const found = versions.find((v) => v.version === version);
      if (!found) return { status: 404, body: { error: "Version not found", code: "NOT_FOUND" } };
      return { status: 200, body: found };
    }
    return { status: 200, body: { current: versions[versions.length - 1], versions: versions.length } };
  }

  private handleCreatePolicy(req: ApiRequest): ApiResponse {
    const body = req.body as Partial<PolicyRecord>;
    if (!body || !body.name) {
      return { status: 400, body: { error: "name is required", code: "VALIDATION_ERROR" } };
    }

    const id = randomUUID();
    const policy: PolicyRecord = {
      id,
      name: body.name,
      version: 1,
      enforcement: body.enforcement ?? "monitor",
      scope: body.scope ?? "fleet-wide",
      rules: body.rules ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.authToken ?? "unknown",
      rationale: (body as { rationale?: string }).rationale ?? "",
    };

    this.policies.set(id, [policy]);
    this.addAuditEntry("policy.created", req.authToken ?? "unknown", `policy/${id}`, { name: body.name });

    return { status: 201, body: policy };
  }

  private handleUpdatePolicy(req: ApiRequest): ApiResponse {
    const versions = this.policies.get(req.params.id);
    if (!versions || versions.length === 0) {
      return { status: 404, body: { error: "Policy not found", code: "NOT_FOUND" } };
    }

    const current = versions[versions.length - 1];
    const body = req.body as Partial<PolicyRecord>;

    const updated: PolicyRecord = {
      ...current,
      name: body.name ?? current.name,
      version: current.version + 1,
      enforcement: body.enforcement ?? current.enforcement,
      scope: body.scope ?? current.scope,
      rules: body.rules ?? current.rules,
      updatedAt: new Date().toISOString(),
      rationale: (body as { rationale?: string }).rationale ?? current.rationale,
    };

    versions.push(updated); // Append-only
    this.addAuditEntry("policy.updated", req.authToken ?? "unknown", `policy/${req.params.id}`, {
      version: updated.version,
      changes: Object.keys(body),
    });

    return { status: 200, body: updated };
  }

  // Audit Trail
  private handleAuditTrail(req: ApiRequest): ApiResponse {
    let entries = [...this.auditLog];

    if (req.query.action) {
      entries = entries.filter((e) => e.action === req.query.action);
    }
    if (req.query.actor) {
      entries = entries.filter((e) => e.actor === req.query.actor);
    }
    if (req.query.since) {
      entries = entries.filter((e) => e.timestamp >= req.query.since);
    }

    const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 100;
    entries = entries.slice(-limit);

    return { status: 200, body: { entries, total: entries.length } };
  }

  // Rating
  private handleRating(): ApiResponse {
    // Placeholder — would integrate with calculate-rating.ts
    return {
      status: 200,
      body: {
        rating: "ADM-4",
        displayRating: "ADM-4-SA",
        message: "Use /api/v1/rating/calculate for full computation",
      },
    };
  }

  // ---------------------------------------------------------------------------
  // State Management (for external callers)
  // ---------------------------------------------------------------------------

  updateFleetStatus(status: Partial<FleetStatus>): void {
    Object.assign(this.fleetStatus, status);
  }

  addTask(task: TaskProgress): void {
    this.tasks.push(task);
  }

  updateResources(resources: Partial<ResourceUsage>): void {
    Object.assign(this.resources, resources);
  }

  addDecision(decision: DecisionRecord): void {
    this.decisions.push(decision);
  }

  addFailure(failure: FailureRecord): void {
    this.failures.push(failure);
  }

  addAuditEntry(action: string, actor: string, resource: string, details: Record<string, unknown> = {}): void {
    this.auditLog.push({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      actor,
      resource,
      details,
    });
  }

  getRoutes(): Route[] {
    return [...this.routes];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split("/");
  const pathParts = path.split("/");

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}

function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on("error", () => resolve(null));
  });
}
