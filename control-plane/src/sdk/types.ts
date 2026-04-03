/**
 * Admiral Framework — Governance SDK Types (GP-07)
 *
 * All request/response interfaces for the Governance SDK client.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface GovernanceSdkConfig {
  baseUrl: string;
  token: string;
  /** Maximum retry attempts for transient failures. Default: 3. */
  maxRetries?: number;
  /** Initial backoff delay in ms. Default: 200. */
  initialBackoffMs?: number;
}

// ---------------------------------------------------------------------------
// Common shapes
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime_ms: number;
  policies: number;
  auditEvents: number;
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export type PolicyEnforcement = "enforce" | "monitor" | "disabled";
export type PolicyScope = "fleet" | "role" | "project";
export type PolicyStatus = "active" | "inactive";

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  version: number;
  enforcement: PolicyEnforcement;
  scope: PolicyScope;
  rule: Record<string, unknown>;
  status: PolicyStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  rationale?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationReason?: string;
}

export interface CreatePolicyRequest {
  name: string;
  description?: string;
  enforcement?: PolicyEnforcement;
  scope?: PolicyScope;
  rule?: Record<string, unknown>;
  createdBy: string;
}

export interface UpdatePolicyRequest {
  name?: string;
  description?: string;
  enforcement?: PolicyEnforcement;
  scope?: PolicyScope;
  rule?: Record<string, unknown>;
  updatedBy: string;
  rationale: string;
}

export interface PolicyListOptions {
  status?: PolicyStatus;
  enforcement?: PolicyEnforcement;
  scope?: PolicyScope;
}

// ---------------------------------------------------------------------------
// Audit events
// ---------------------------------------------------------------------------

export type AuditEventSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: AuditEventSeverity;
  source: string;
  detail: Record<string, unknown>;
}

export interface AuditEventQueryOptions {
  since?: string;
  type?: string;
  severity?: AuditEventSeverity;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Fleet status
// ---------------------------------------------------------------------------

export type AgentRunStatus = "running" | "paused" | "stopped" | "unknown";

export interface FleetAgentStatus {
  agentId: string;
  status: AgentRunStatus;
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
// Visibility
// ---------------------------------------------------------------------------

export interface VisibilitySnapshot {
  timestamp: string;
  activeAgents: number;
  totalEvents: number;
  recentViolations: number;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type ReportType = "compliance" | "kpi" | "fleet_health" | "audit" | "trend";

export interface GenerateReportRequest {
  type: ReportType;
  startDate: string;
  endDate: string;
  tenantId?: string;
}

export interface ReportResult {
  id: string;
  type: ReportType;
  generatedAt: string;
  startDate: string;
  endDate: string;
  json: Record<string, unknown>;
  text: string;
}

// ---------------------------------------------------------------------------
// Governance events (for SSE streaming)
// ---------------------------------------------------------------------------

export type GovernanceEventType =
  | "policy_violation"
  | "policy_created"
  | "policy_updated"
  | "policy_deactivated"
  | "agent_intervention"
  | "agent_started"
  | "agent_stopped"
  | "audit_event"
  | "fleet_status_change"
  | "budget_exceeded"
  | "health_check"
  | "config_changed"
  | "webhook_fired"
  | "report_generated"
  | "system_event";

export type GovernanceEventSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface GovernanceStreamEvent {
  id: string;
  timestamp: string;
  type: GovernanceEventType;
  severity: GovernanceEventSeverity;
  source: string;
  detail: Record<string, unknown>;
  tenantId?: string;
  agentId?: string;
}

export type EventHandler = (event: GovernanceStreamEvent) => void;

export interface EventSubscriptionOptions {
  type?: GovernanceEventType;
  severity?: GovernanceEventSeverity;
  agentId?: string;
  tenantId?: string;
  lastEventId?: string;
}

// ---------------------------------------------------------------------------
// SDK errors
// ---------------------------------------------------------------------------

export class GovernanceSdkError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = "GovernanceSdkError";
  }
}

export class GovernanceNotFoundError extends GovernanceSdkError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 404);
    this.name = "GovernanceNotFoundError";
  }
}

export class GovernanceValidationError extends GovernanceSdkError {
  constructor(message: string) {
    super(message, 400);
    this.name = "GovernanceValidationError";
  }
}
