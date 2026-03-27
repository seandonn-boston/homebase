/**
 * Admiral Framework — Governance Reporting (GP-06)
 *
 * Five report types: compliance, KPI, fleet health, audit, and trend analysis.
 * Each report produces JSON + human-readable text.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import type * as http from "node:http";
import type { GovernanceEvent } from "./event-stream";
import type { GovernancePolicy } from "./policies";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ReportType = "compliance" | "kpi" | "fleet_health" | "audit" | "trend";

export interface ReportRequest {
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
// Individual report data shapes
// ---------------------------------------------------------------------------

export interface PolicyComplianceSummary {
  policyId: string;
  policyName: string;
  enforcement: string;
  violations: number;
  complianceRate: number;
}

export interface ComplianceReport {
  totalPolicies: number;
  activePolicies: number;
  totalViolations: number;
  overallComplianceRate: number;
  byPolicy: PolicyComplianceSummary[];
}

export interface KpiReport {
  interventionRate: number;
  falsePositiveRate: number;
  avgResolutionTimeMs: number;
  governanceOverheadPercent: number;
  totalEvents: number;
  totalInterventions: number;
  totalFalsePositives: number;
}

export interface AgentHealthSummary {
  agentId: string;
  status: string;
  eventCount: number;
  errorCount: number;
  errorRate: number;
  budgetUsedPercent: number;
  qualityScore: number;
}

export interface FleetHealthReport {
  totalAgents: number;
  runningAgents: number;
  erroredAgents: number;
  overallErrorRate: number;
  avgBudgetUsedPercent: number;
  avgQualityScore: number;
  agents: AgentHealthSummary[];
}

export interface TrendPeriod {
  period: string;
  startDate: string;
  endDate: string;
  totalEvents: number;
  violations: number;
  interventions: number;
  complianceRate: number;
}

export interface TrendReport {
  periods: TrendPeriod[];
  violationTrend: "increasing" | "decreasing" | "stable";
  complianceTrend: "improving" | "degrading" | "stable";
}

// ---------------------------------------------------------------------------
// Data context injected into the reporter
// ---------------------------------------------------------------------------

export interface ReporterContext {
  getEvents(startDate: string, endDate: string): GovernanceEvent[];
  getPolicies(): GovernancePolicy[];
  getAgentStatuses(): Array<{
    agentId: string;
    status: string;
    budgetUsedPercent: number;
    qualityScore: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
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

function pathOnly(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 10_000) / 100;
}

// ---------------------------------------------------------------------------
// Report text formatters
// ---------------------------------------------------------------------------

function complianceText(report: ComplianceReport, req: ReportRequest): string {
  const lines: string[] = [
    `COMPLIANCE REPORT`,
    `Period: ${formatDate(req.startDate)} — ${formatDate(req.endDate)}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `SUMMARY`,
    `  Total Policies:      ${report.totalPolicies}`,
    `  Active Policies:     ${report.activePolicies}`,
    `  Total Violations:    ${report.totalViolations}`,
    `  Overall Compliance:  ${report.overallComplianceRate}%`,
    ``,
    `BY POLICY`,
    ...report.byPolicy.map(
      (p) =>
        `  [${p.enforcement.toUpperCase()}] ${p.policyName.padEnd(40)} violations: ${String(p.violations).padStart(5)}  compliance: ${p.complianceRate}%`,
    ),
  ];
  return lines.join("\n");
}

function kpiText(report: KpiReport, req: ReportRequest): string {
  const lines: string[] = [
    `KPI REPORT`,
    `Period: ${formatDate(req.startDate)} — ${formatDate(req.endDate)}`,
    ``,
    `  Total Events:               ${report.totalEvents}`,
    `  Total Interventions:        ${report.totalInterventions}`,
    `  Intervention Rate:          ${report.interventionRate}%`,
    `  False Positives:            ${report.totalFalsePositives}`,
    `  False Positive Rate:        ${report.falsePositiveRate}%`,
    `  Avg Resolution Time:        ${report.avgResolutionTimeMs}ms`,
    `  Governance Overhead:        ${report.governanceOverheadPercent}%`,
  ];
  return lines.join("\n");
}

function fleetHealthText(report: FleetHealthReport, req: ReportRequest): string {
  const lines: string[] = [
    `FLEET HEALTH REPORT`,
    `Period: ${formatDate(req.startDate)} — ${formatDate(req.endDate)}`,
    ``,
    `  Total Agents:        ${report.totalAgents}`,
    `  Running:             ${report.runningAgents}`,
    `  Errored:             ${report.erroredAgents}`,
    `  Overall Error Rate:  ${report.overallErrorRate}%`,
    `  Avg Budget Used:     ${report.avgBudgetUsedPercent}%`,
    `  Avg Quality Score:   ${report.avgQualityScore}`,
    ``,
    `AGENT DETAIL`,
    ...report.agents.map(
      (a) =>
        `  ${a.agentId.padEnd(36)} status: ${a.status.padEnd(10)} errors: ${a.errorCount.toString().padStart(4)}  budget: ${a.budgetUsedPercent}%  quality: ${a.qualityScore}`,
    ),
  ];
  return lines.join("\n");
}

function auditText(events: GovernanceEvent[], req: ReportRequest): string {
  const lines: string[] = [
    `AUDIT REPORT`,
    `Period: ${formatDate(req.startDate)} — ${formatDate(req.endDate)}`,
    `Total Events: ${events.length}`,
    ``,
    ...events.map(
      (e) =>
        `[${e.timestamp}] [${e.severity.toUpperCase().padEnd(8)}] ${e.type.padEnd(30)} source: ${e.source}  id: ${e.id}`,
    ),
  ];
  return lines.join("\n");
}

function trendText(report: TrendReport, req: ReportRequest): string {
  const lines: string[] = [
    `TREND ANALYSIS REPORT`,
    `Period: ${formatDate(req.startDate)} — ${formatDate(req.endDate)}`,
    ``,
    `  Violation Trend:   ${report.violationTrend}`,
    `  Compliance Trend:  ${report.complianceTrend}`,
    ``,
    `PERIODS`,
    ...report.periods.map(
      (p) =>
        `  ${p.period.padEnd(12)} events: ${String(p.totalEvents).padStart(5)}  violations: ${String(p.violations).padStart(4)}  interventions: ${String(p.interventions).padStart(4)}  compliance: ${p.complianceRate}%`,
    ),
  ];
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// GovernanceReporter
// ---------------------------------------------------------------------------

export class GovernanceReporter {
  private context: ReporterContext;

  constructor(context: ReporterContext) {
    this.context = context;
  }

  // -------------------------------------------------------------------------
  // Generate any report type
  // -------------------------------------------------------------------------

  generate(req: ReportRequest): ReportResult {
    const id = `rpt_${randomUUID()}`;
    const generatedAt = new Date().toISOString();

    let json: Record<string, unknown>;
    let text: string;

    switch (req.type) {
      case "compliance": {
        const data = this.buildComplianceReport(req);
        json = data as unknown as Record<string, unknown>;
        text = complianceText(data, req);
        break;
      }
      case "kpi": {
        const data = this.buildKpiReport(req);
        json = data as unknown as Record<string, unknown>;
        text = kpiText(data, req);
        break;
      }
      case "fleet_health": {
        const data = this.buildFleetHealthReport(req);
        json = data as unknown as Record<string, unknown>;
        text = fleetHealthText(data, req);
        break;
      }
      case "audit": {
        const events = this.getEventsInRange(req);
        json = { events, total: events.length };
        text = auditText(events, req);
        break;
      }
      case "trend": {
        const data = this.buildTrendReport(req);
        json = data as unknown as Record<string, unknown>;
        text = trendText(data, req);
        break;
      }
      default: {
        const _exhaustive: never = req.type;
        throw new Error(`Unknown report type: ${String(_exhaustive)}`);
      }
    }

    return {
      id,
      type: req.type,
      generatedAt,
      startDate: req.startDate,
      endDate: req.endDate,
      json,
      text,
    };
  }

  // -------------------------------------------------------------------------
  // Compliance report
  // -------------------------------------------------------------------------

  private buildComplianceReport(req: ReportRequest): ComplianceReport {
    const events = this.getEventsInRange(req);
    const policies = this.context.getPolicies();

    const violations = events.filter((e) => e.type === "policy_violation");
    const totalViolations = violations.length;

    const byPolicy: PolicyComplianceSummary[] = policies.map((p) => {
      const pViolations = violations.filter((v) => v.detail.policyId === p.id).length;
      // Compliance: if policy is active and has no violations, it's 100%
      // Otherwise: (events - violations) / events * 100 (bounded to non-negative)
      const compliance =
        pViolations === 0
          ? 100
          : Math.max(0, Math.round((1 - pViolations / Math.max(1, events.length)) * 10_000) / 100);
      return {
        policyId: p.id,
        policyName: p.name,
        enforcement: p.enforcement,
        violations: pViolations,
        complianceRate: compliance,
      };
    });

    const activePolicies = policies.filter((p) => p.status === "active").length;
    const overallCompliance =
      events.length === 0 ? 100 : pct(events.length - totalViolations, events.length);

    return {
      totalPolicies: policies.length,
      activePolicies,
      totalViolations,
      overallComplianceRate: overallCompliance,
      byPolicy,
    };
  }

  // -------------------------------------------------------------------------
  // KPI report
  // -------------------------------------------------------------------------

  private buildKpiReport(req: ReportRequest): KpiReport {
    const events = this.getEventsInRange(req);
    const totalEvents = events.length;
    const interventions = events.filter((e) => e.type === "agent_intervention");
    const totalInterventions = interventions.length;

    // False positives: interventions where detail.falsePositive === true
    const totalFalsePositives = interventions.filter((e) => e.detail.falsePositive === true).length;

    // Resolution time: average of detail.resolutionTimeMs where present
    const resolutionTimes = interventions
      .map((e) => e.detail.resolutionTimeMs)
      .filter((t): t is number => typeof t === "number" && t > 0);
    const avgResolutionTimeMs =
      resolutionTimes.length > 0
        ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
        : 0;

    // Governance overhead: interventions / total events * 100
    const governanceOverheadPercent = pct(totalInterventions, totalEvents);

    return {
      interventionRate: pct(totalInterventions, totalEvents),
      falsePositiveRate: pct(totalFalsePositives, totalInterventions),
      avgResolutionTimeMs,
      governanceOverheadPercent,
      totalEvents,
      totalInterventions,
      totalFalsePositives,
    };
  }

  // -------------------------------------------------------------------------
  // Fleet health report
  // -------------------------------------------------------------------------

  private buildFleetHealthReport(req: ReportRequest): FleetHealthReport {
    const events = this.getEventsInRange(req);
    const agentStatuses = this.context.getAgentStatuses();

    const agentEventCounts = new Map<string, number>();
    const agentErrorCounts = new Map<string, number>();
    for (const e of events) {
      if (!e.agentId) continue;
      agentEventCounts.set(e.agentId, (agentEventCounts.get(e.agentId) ?? 0) + 1);
      if (e.severity === "critical" || e.type === "policy_violation") {
        agentErrorCounts.set(e.agentId, (agentErrorCounts.get(e.agentId) ?? 0) + 1);
      }
    }

    const agents: AgentHealthSummary[] = agentStatuses.map((a) => {
      const eventCount = agentEventCounts.get(a.agentId) ?? 0;
      const errorCount = agentErrorCounts.get(a.agentId) ?? 0;
      return {
        agentId: a.agentId,
        status: a.status,
        eventCount,
        errorCount,
        errorRate: pct(errorCount, eventCount),
        budgetUsedPercent: a.budgetUsedPercent,
        qualityScore: a.qualityScore,
      };
    });

    const runningAgents = agentStatuses.filter((a) => a.status === "running").length;
    const erroredAgents = agents.filter((a) => a.errorRate > 50).length;
    const totalEvents = events.length;
    const totalErrors = agents.reduce((s, a) => s + a.errorCount, 0);
    const avgBudget =
      agents.length > 0
        ? Math.round(agents.reduce((s, a) => s + a.budgetUsedPercent, 0) / agents.length)
        : 0;
    const avgQuality =
      agents.length > 0
        ? Math.round(agents.reduce((s, a) => s + a.qualityScore, 0) / agents.length)
        : 0;

    return {
      totalAgents: agentStatuses.length,
      runningAgents,
      erroredAgents,
      overallErrorRate: pct(totalErrors, totalEvents),
      avgBudgetUsedPercent: avgBudget,
      avgQualityScore: avgQuality,
      agents,
    };
  }

  // -------------------------------------------------------------------------
  // Trend report — splits range into periods and compares
  // -------------------------------------------------------------------------

  private buildTrendReport(req: ReportRequest): TrendReport {
    const startMs = Date.parse(req.startDate);
    const endMs = Date.parse(req.endDate);
    const rangeMs = endMs - startMs;

    // Split into at most 4 equal periods
    const numPeriods = Math.min(4, Math.max(1, Math.floor(rangeMs / (1000 * 60 * 60))));
    const periodMs = rangeMs / numPeriods;

    const periods: TrendPeriod[] = [];
    for (let i = 0; i < numPeriods; i++) {
      const pStart = new Date(startMs + i * periodMs).toISOString();
      const pEnd = new Date(startMs + (i + 1) * periodMs).toISOString();
      const events = this.context.getEvents(pStart, pEnd);
      const violations = events.filter((e) => e.type === "policy_violation").length;
      const interventions = events.filter((e) => e.type === "agent_intervention").length;
      const compliance = pct(events.length - violations, events.length);
      periods.push({
        period: `P${i + 1}`,
        startDate: pStart,
        endDate: pEnd,
        totalEvents: events.length,
        violations,
        interventions,
        complianceRate: compliance,
      });
    }

    // Determine trends from first to last period
    let violationTrend: TrendReport["violationTrend"] = "stable";
    let complianceTrend: TrendReport["complianceTrend"] = "stable";

    if (periods.length >= 2) {
      const firstViol = periods[0].violations;
      const lastViol = periods[periods.length - 1].violations;
      if (lastViol > firstViol * 1.1) violationTrend = "increasing";
      else if (lastViol < firstViol * 0.9) violationTrend = "decreasing";

      const firstComp = periods[0].complianceRate;
      const lastComp = periods[periods.length - 1].complianceRate;
      if (lastComp > firstComp + 2) complianceTrend = "improving";
      else if (lastComp < firstComp - 2) complianceTrend = "degrading";
    }

    return { periods, violationTrend, complianceTrend };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private getEventsInRange(req: ReportRequest): GovernanceEvent[] {
    return this.context.getEvents(req.startDate, req.endDate);
  }

  // -------------------------------------------------------------------------
  // HTTP handler — POST /api/v1/reports/generate
  // -------------------------------------------------------------------------

  async handleGenerateReport(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Invalid JSON body" }));
      return;
    }

    if (typeof body !== "object" || body === null) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Request body must be a JSON object" }));
      return;
    }

    const input = body as Record<string, unknown>;
    const VALID_TYPES: ReportType[] = ["compliance", "kpi", "fleet_health", "audit", "trend"];

    if (!input.type || !VALID_TYPES.includes(input.type as ReportType)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error: `Field 'type' must be one of: ${VALID_TYPES.join(", ")}`,
        }),
      );
      return;
    }

    if (!input.startDate || typeof input.startDate !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Field 'startDate' is required" }));
      return;
    }

    if (!input.endDate || typeof input.endDate !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Field 'endDate' is required" }));
      return;
    }

    const reportReq: ReportRequest = {
      type: input.type as ReportType,
      startDate: input.startDate as string,
      endDate: input.endDate as string,
      tenantId: input.tenantId as string | undefined,
    };

    try {
      const result = this.generate(reportReq);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: result }, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: message }));
    }
  }

  // -------------------------------------------------------------------------
  // Route matcher
  // -------------------------------------------------------------------------

  route(req: http.IncomingMessage, res: http.ServerResponse): boolean {
    const rawUrl = req.url ?? "/";
    const path = pathOnly(rawUrl);
    const method = req.method ?? "GET";

    if (path === "/api/v1/reports/generate" && method === "POST") {
      this.handleGenerateReport(req, res).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: message }));
      });
      return true;
    }

    return false;
  }
}
