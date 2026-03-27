/**
 * Admiral Framework — Governance SDK Client (GP-07)
 *
 * Typed client wrapping the Governance API with retry logic.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import * as http from "node:http";
import * as https from "node:https";
import type { EventSubscription } from "./events";
import { SseEventSubscriber } from "./events";
import type {
  ApiResponse,
  AuditEvent,
  AuditEventQueryOptions,
  CreatePolicyRequest,
  EventHandler,
  EventSubscriptionOptions,
  FleetStatus,
  GenerateReportRequest,
  GovernancePolicy,
  GovernanceSdkConfig,
  HealthStatus,
  PolicyListOptions,
  ReportResult,
  UpdatePolicyRequest,
  VisibilitySnapshot,
} from "./types";
import { GovernanceNotFoundError, GovernanceSdkError, GovernanceValidationError } from "./types";

// ---------------------------------------------------------------------------
// Internal HTTP helper
// ---------------------------------------------------------------------------

interface RawResponse {
  statusCode: number;
  body: string;
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return pairs.length > 0 ? `?${pairs.join("&")}` : "";
}

// ---------------------------------------------------------------------------
// GovernanceClient
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_BACKOFF_MS = 200;

export class GovernanceClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly maxRetries: number;
  private readonly initialBackoffMs: number;

  constructor(config: GovernanceSdkConfig) {
    // Strip trailing slash
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.initialBackoffMs = config.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;
  }

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------

  async getHealth(): Promise<HealthStatus> {
    const res = await this.request("GET", "/api/v1/health");
    const body = this.parseBody<HealthStatus>(res);
    return body.data!;
  }

  // -------------------------------------------------------------------------
  // Policies
  // -------------------------------------------------------------------------

  async listPolicies(options: PolicyListOptions = {}): Promise<GovernancePolicy[]> {
    const qs = buildQueryString({
      status: options.status,
      enforcement: options.enforcement,
      scope: options.scope,
    });
    const res = await this.request("GET", `/api/v1/policies${qs}`);
    const body = this.parseBody<GovernancePolicy[]>(res);
    return body.data ?? [];
  }

  async createPolicy(req: CreatePolicyRequest): Promise<GovernancePolicy> {
    const res = await this.request("POST", "/api/v1/policies", req);
    const body = this.parseBody<GovernancePolicy>(res);
    return body.data!;
  }

  async updatePolicy(id: string, req: UpdatePolicyRequest): Promise<GovernancePolicy> {
    const res = await this.request("PUT", `/api/v1/policies/${encodeURIComponent(id)}`, req);
    const body = this.parseBody<GovernancePolicy>(res);
    return body.data!;
  }

  async deactivatePolicy(id: string): Promise<GovernancePolicy> {
    const res = await this.request("DELETE", `/api/v1/policies/${encodeURIComponent(id)}`);
    const body = this.parseBody<GovernancePolicy>(res);
    return body.data!;
  }

  // -------------------------------------------------------------------------
  // Audit events
  // -------------------------------------------------------------------------

  async getAuditEvents(options: AuditEventQueryOptions = {}): Promise<AuditEvent[]> {
    const qs = buildQueryString({
      since: options.since,
      type: options.type,
      severity: options.severity,
    });
    const res = await this.request("GET", `/api/v1/audit/events${qs}`);
    const body = this.parseBody<AuditEvent[]>(res);
    return body.data ?? [];
  }

  // -------------------------------------------------------------------------
  // Fleet status
  // -------------------------------------------------------------------------

  async getFleetStatus(): Promise<FleetStatus> {
    const res = await this.request("GET", "/api/v1/fleet/status");
    const body = this.parseBody<FleetStatus>(res);
    return body.data!;
  }

  // -------------------------------------------------------------------------
  // Visibility
  // -------------------------------------------------------------------------

  async getVisibility(): Promise<VisibilitySnapshot> {
    const res = await this.request("GET", "/api/v1/visibility");
    const body = this.parseBody<VisibilitySnapshot>(res);
    return body.data!;
  }

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------

  async generateReport(req: GenerateReportRequest): Promise<ReportResult> {
    const res = await this.request("POST", "/api/v1/reports/generate", req);
    const body = this.parseBody<ReportResult>(res);
    return body.data!;
  }

  // -------------------------------------------------------------------------
  // Event streaming
  // -------------------------------------------------------------------------

  subscribeToEvents(
    handler: EventHandler,
    options: EventSubscriptionOptions = {},
  ): EventSubscription {
    return new SseEventSubscriber(
      this.baseUrl,
      this.token,
      options,
      handler,
      this.initialBackoffMs,
    );
  }

  // -------------------------------------------------------------------------
  // HTTP transport with retry
  // -------------------------------------------------------------------------

  private request(method: string, path: string, body?: unknown, attempt = 0): Promise<RawResponse> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl + path);
      const isHttps = url.protocol === "https:";
      const transport = isHttps ? https : http;

      const bodyStr = body !== undefined ? JSON.stringify(body) : "";
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "Content-Length": String(Buffer.byteLength(bodyStr)),
      };

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? "443" : "80"),
        path: url.pathname + url.search,
        method,
        headers,
      };

      const req = transport.request(options, (res) => {
        let respBody = "";
        res.on("data", (chunk: string) => {
          respBody += chunk;
        });
        res.on("end", () => {
          const statusCode = res.statusCode ?? 0;

          // Retry on 503 or 429
          if ((statusCode === 503 || statusCode === 429) && attempt < this.maxRetries) {
            const delay = this.initialBackoffMs * 2 ** attempt;
            setTimeout(() => {
              this.request(method, path, body, attempt + 1)
                .then(resolve)
                .catch(reject);
            }, delay);
            return;
          }

          resolve({ statusCode, body: respBody });
        });
        res.on("error", (err: Error) => {
          if (attempt < this.maxRetries) {
            const delay = this.initialBackoffMs * 2 ** attempt;
            setTimeout(() => {
              this.request(method, path, body, attempt + 1)
                .then(resolve)
                .catch(reject);
            }, delay);
          } else {
            reject(err);
          }
        });
      });

      req.on("error", (err: Error) => {
        if (attempt < this.maxRetries) {
          const delay = this.initialBackoffMs * 2 ** attempt;
          setTimeout(() => {
            this.request(method, path, body, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          reject(err);
        }
      });

      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  private parseBody<T>(raw: RawResponse): ApiResponse<T> {
    let parsed: ApiResponse<T>;
    try {
      parsed = JSON.parse(raw.body) as ApiResponse<T>;
    } catch {
      throw new GovernanceSdkError(
        `Failed to parse response body: ${raw.body.slice(0, 200)}`,
        raw.statusCode,
      );
    }

    if (raw.statusCode === 404) {
      throw new GovernanceNotFoundError("Resource", String(raw.statusCode));
    }

    if (raw.statusCode === 400) {
      throw new GovernanceValidationError(parsed.error ?? "Validation error");
    }

    if (raw.statusCode === 401) {
      throw new GovernanceSdkError("Unauthorized: invalid or missing token", 401);
    }

    if (raw.statusCode >= 400) {
      throw new GovernanceSdkError(
        parsed.error ?? `Request failed with status ${raw.statusCode}`,
        raw.statusCode,
        parsed,
      );
    }

    return parsed;
  }
}
