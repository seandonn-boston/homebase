/**
 * Governance Reporting (GP-06)
 *
 * Generates five report types from governance data:
 * compliance, KPI, fleet health, audit, trend analysis.
 * Supports JSON and human-readable text output.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportType = "compliance" | "kpi" | "fleet-health" | "audit" | "trend-analysis";

export interface ReportRequest {
  type: ReportType;
  timeRange?: { start: string; end: string };
  format: "json" | "text";
}

export interface ReportSection {
  title: string;
  data: Record<string, unknown>;
  text: string;
}

export interface GovernanceReport {
  type: ReportType;
  generatedAt: string;
  timeRange: { start: string; end: string };
  sections: ReportSection[];
}

export interface GovernanceDataSource {
  getPolicyCount(): number;
  getEnforcedPolicyCount(): number;
  getAuditEntryCount(): number;
  getViolationCount(): number;
  getAgentCount(): number;
  getActiveAgentCount(): number;
  getFailureCount(): number;
  getRecoveredFailureCount(): number;
  getDecisionCount(): number;
  getEventCount(): number;
}

// ---------------------------------------------------------------------------
// Report Generators
// ---------------------------------------------------------------------------

function generateComplianceReport(source: GovernanceDataSource): ReportSection[] {
  const totalPolicies = source.getPolicyCount();
  const enforced = source.getEnforcedPolicyCount();
  const violations = source.getViolationCount();
  const coverage = totalPolicies > 0 ? (enforced / totalPolicies) * 100 : 0;

  return [
    {
      title: "Policy Compliance",
      data: { totalPolicies, enforced, coverage: Math.round(coverage), violations },
      text: `${enforced}/${totalPolicies} policies enforced (${Math.round(coverage)}%). ${violations} violations detected.`,
    },
  ];
}

function generateKpiReport(source: GovernanceDataSource): ReportSection[] {
  const agents = source.getAgentCount();
  const active = source.getActiveAgentCount();
  const decisions = source.getDecisionCount();
  const events = source.getEventCount();
  const failures = source.getFailureCount();
  const recovered = source.getRecoveredFailureCount();
  const recoveryRate = failures > 0 ? (recovered / failures) * 100 : 100;

  return [
    {
      title: "Governance KPIs",
      data: {
        totalAgents: agents,
        activeAgents: active,
        totalDecisions: decisions,
        totalEvents: events,
        failureCount: failures,
        recoveryRate: Math.round(recoveryRate),
      },
      text: [
        `Agents: ${active}/${agents} active`,
        `Decisions: ${decisions}`,
        `Events: ${events}`,
        `Recovery rate: ${Math.round(recoveryRate)}% (${recovered}/${failures})`,
      ].join("\n"),
    },
  ];
}

function generateFleetHealthReport(source: GovernanceDataSource): ReportSection[] {
  const agents = source.getAgentCount();
  const active = source.getActiveAgentCount();
  const failures = source.getFailureCount();
  const recovered = source.getRecoveredFailureCount();

  let healthStatus: "healthy" | "degraded" | "unhealthy";
  const failureRate = agents > 0 ? (failures - recovered) / agents : 0;
  if (failureRate > 0.3) healthStatus = "unhealthy";
  else if (failureRate > 0.1) healthStatus = "degraded";
  else healthStatus = "healthy";

  return [
    {
      title: "Fleet Health",
      data: { agents, active, failures, recovered, healthStatus, failureRate: Math.round(failureRate * 100) },
      text: `Fleet: ${healthStatus}. ${active}/${agents} agents active. ${failures} failures (${recovered} recovered).`,
    },
  ];
}

function generateAuditReport(source: GovernanceDataSource): ReportSection[] {
  const entries = source.getAuditEntryCount();
  const decisions = source.getDecisionCount();
  const violations = source.getViolationCount();

  return [
    {
      title: "Audit Summary",
      data: { totalEntries: entries, decisions, violations },
      text: `${entries} audit entries. ${decisions} decisions recorded. ${violations} violations logged.`,
    },
  ];
}

function generateTrendReport(source: GovernanceDataSource): ReportSection[] {
  const events = source.getEventCount();
  const decisions = source.getDecisionCount();
  const failures = source.getFailureCount();

  return [
    {
      title: "Trend Analysis",
      data: {
        eventVolume: events,
        decisionVolume: decisions,
        failureVolume: failures,
        note: "Per-period trending requires historical data accumulation",
      },
      text: `Current period: ${events} events, ${decisions} decisions, ${failures} failures.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

const GENERATORS: Record<ReportType, (source: GovernanceDataSource) => ReportSection[]> = {
  compliance: generateComplianceReport,
  kpi: generateKpiReport,
  "fleet-health": generateFleetHealthReport,
  audit: generateAuditReport,
  "trend-analysis": generateTrendReport,
};

export function generateReport(
  request: ReportRequest,
  source: GovernanceDataSource,
): GovernanceReport {
  const generator = GENERATORS[request.type];
  const now = new Date().toISOString();

  return {
    type: request.type,
    generatedAt: now,
    timeRange: request.timeRange ?? { start: now, end: now },
    sections: generator(source),
  };
}

export function formatReport(report: GovernanceReport, format: "json" | "text"): string {
  if (format === "json") {
    return JSON.stringify(report, null, 2);
  }

  const lines: string[] = [
    `# ${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report`,
    `Generated: ${report.generatedAt}`,
    "",
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`, "", section.text, "");
  }

  return lines.join("\n");
}

export const REPORT_TYPES: readonly ReportType[] = ["compliance", "kpi", "fleet-health", "audit", "trend-analysis"];
