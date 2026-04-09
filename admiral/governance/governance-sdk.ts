/**
 * Governance SDK (GP-07)
 *
 * TypeScript client SDK wrapping all governance API endpoints with
 * typed interfaces. Handles auth, retry, and errors.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import * as http from "node:http";
import type { PolicyRecord, FleetStatus, ResourceUsage, AuditEntry, TaskProgress, DecisionRecord, FailureRecord } from "./api-server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SdkConfig {
  baseUrl: string;
  authToken: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface SdkResponse<T> {
  status: number;
  data: T;
}

export class GovernanceSdkError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "GovernanceSdkError";
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// SDK Client
// ---------------------------------------------------------------------------

export class GovernanceSdk {
  private config: Required<SdkConfig>;

  constructor(config: SdkConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ""),
      authToken: config.authToken,
      timeout: config.timeout ?? 30000,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
    };
  }

  // Health
  async health(): Promise<SdkResponse<{ status: string; version: string }>> {
    return this.get("/health");
  }

  // Visibility Pillar
  async fleetStatus(): Promise<SdkResponse<FleetStatus>> {
    return this.get("/api/v1/fleet-status");
  }

  async taskProgress(): Promise<SdkResponse<{ tasks: TaskProgress[]; total: number }>> {
    return this.get("/api/v1/task-progress");
  }

  async resources(): Promise<SdkResponse<ResourceUsage>> {
    return this.get("/api/v1/resources");
  }

  async decisions(): Promise<SdkResponse<{ decisions: DecisionRecord[]; total: number }>> {
    return this.get("/api/v1/decisions");
  }

  async failures(): Promise<SdkResponse<{ failures: FailureRecord[]; total: number }>> {
    return this.get("/api/v1/failures");
  }

  // Policy Management
  async listPolicies(): Promise<SdkResponse<{ policies: PolicyRecord[]; total: number }>> {
    return this.get("/api/v1/policies");
  }

  async getPolicy(id: string): Promise<SdkResponse<{ current: PolicyRecord; versions: number }>> {
    return this.get(`/api/v1/policies/${id}`);
  }

  async createPolicy(policy: Partial<PolicyRecord>): Promise<SdkResponse<PolicyRecord>> {
    return this.post("/api/v1/policies", policy);
  }

  async updatePolicy(id: string, updates: Partial<PolicyRecord>): Promise<SdkResponse<PolicyRecord>> {
    return this.put(`/api/v1/policies/${id}`, updates);
  }

  // Audit Trail
  async queryAudit(filter?: {
    action?: string;
    actor?: string;
    since?: string;
    limit?: number;
  }): Promise<SdkResponse<{ entries: AuditEntry[]; total: number }>> {
    const params = new URLSearchParams();
    if (filter?.action) params.set("action", filter.action);
    if (filter?.actor) params.set("actor", filter.actor);
    if (filter?.since) params.set("since", filter.since);
    if (filter?.limit) params.set("limit", String(filter.limit));
    const qs = params.toString();
    return this.get(`/api/v1/audit${qs ? `?${qs}` : ""}`);
  }

  // Rating
  async rating(): Promise<SdkResponse<{ rating: string; displayRating: string }>> {
    return this.get("/api/v1/rating");
  }

  // ---------------------------------------------------------------------------
  // HTTP Helpers
  // ---------------------------------------------------------------------------

  private async get<T>(path: string): Promise<SdkResponse<T>> {
    return this.request("GET", path);
  }

  private async post<T>(path: string, body: unknown): Promise<SdkResponse<T>> {
    return this.request("POST", path, body);
  }

  private async put<T>(path: string, body: unknown): Promise<SdkResponse<T>> {
    return this.request("PUT", path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<SdkResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this.doRequest<T>(method, path, body);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (e instanceof GovernanceSdkError && e.status < 500) {
          throw e; // Don't retry client errors
        }
        if (attempt < this.config.retryAttempts) {
          await new Promise((r) => setTimeout(r, this.config.retryDelayMs * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  private doRequest<T>(method: string, path: string, body?: unknown): Promise<SdkResponse<T>> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.config.baseUrl);

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.authToken}`,
        },
        timeout: this.config.timeout,
      };

      const req = http.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          let data: T;
          try {
            data = JSON.parse(raw) as T;
          } catch {
            data = raw as unknown as T;
          }

          const status = res.statusCode ?? 500;
          if (status >= 400) {
            const errorBody = data as unknown as { error?: string; code?: string };
            reject(new GovernanceSdkError(
              errorBody?.error ?? `HTTP ${status}`,
              status,
              errorBody?.code ?? "UNKNOWN",
            ));
            return;
          }

          resolve({ status, data });
        });
      });

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      if (body !== undefined) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
}
