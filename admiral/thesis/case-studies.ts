/**
 * Before/After Case Studies (TV-03)
 *
 * Framework for documenting real enforcement events with counterfactual
 * analysis and true positive / false positive classification.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CaseStudy {
  id: string;
  title: string;
  timestamp: string;
  task: string;
  context: string;
  agentAction: string;
  hookFired: string;
  hookReason: string;
  counterfactual: string;
  estimatedImpact: ImpactAssessment;
  classification: "true-positive" | "false-positive";
  evidence: string[];
  tags: string[];
}

export interface ImpactAssessment {
  severity: "critical" | "high" | "medium" | "low";
  blastRadius: string;
  remediationCost: "hours" | "days" | "weeks";
  description: string;
}

export interface CaseStudyIndex {
  totalStudies: number;
  truePositives: number;
  falsePositives: number;
  truePositiveRate: number;
  bySeverity: Record<string, number>;
  byHook: Record<string, number>;
  studies: CaseStudySummary[];
}

export interface CaseStudySummary {
  id: string;
  title: string;
  classification: string;
  severity: string;
  hookFired: string;
}

// ---------------------------------------------------------------------------
// Case Study Registry
// ---------------------------------------------------------------------------

export class CaseStudyRegistry {
  private studies: CaseStudy[] = [];

  add(study: Omit<CaseStudy, "id" | "timestamp">): CaseStudy {
    const full: CaseStudy = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...study,
    };
    this.studies.push(full);
    return full;
  }

  get(id: string): CaseStudy | undefined {
    return this.studies.find((s) => s.id === id);
  }

  list(): readonly CaseStudy[] {
    return this.studies;
  }

  getIndex(): CaseStudyIndex {
    const tp = this.studies.filter((s) => s.classification === "true-positive").length;
    const fp = this.studies.filter((s) => s.classification === "false-positive").length;
    const total = this.studies.length;

    const bySeverity: Record<string, number> = {};
    const byHook: Record<string, number> = {};
    for (const s of this.studies) {
      bySeverity[s.estimatedImpact.severity] = (bySeverity[s.estimatedImpact.severity] ?? 0) + 1;
      byHook[s.hookFired] = (byHook[s.hookFired] ?? 0) + 1;
    }

    return {
      totalStudies: total,
      truePositives: tp,
      falsePositives: fp,
      truePositiveRate: total > 0 ? Math.round((tp / total) * 100) : 0,
      bySeverity,
      byHook,
      studies: this.studies.map((s) => ({
        id: s.id,
        title: s.title,
        classification: s.classification,
        severity: s.estimatedImpact.severity,
        hookFired: s.hookFired,
      })),
    };
  }

  formatStudy(study: CaseStudy): string {
    return [
      `# Case Study: ${study.title}`,
      "",
      `**Classification:** ${study.classification}`,
      `**Severity:** ${study.estimatedImpact.severity}`,
      `**Hook:** ${study.hookFired}`,
      `**Date:** ${study.timestamp}`,
      "",
      "## Task & Context",
      study.task,
      "",
      "## Agent Action",
      study.agentAction,
      "",
      "## Hook Response",
      `**Hook:** ${study.hookFired}`,
      `**Reason:** ${study.hookReason}`,
      "",
      "## Counterfactual Analysis",
      study.counterfactual,
      "",
      "## Impact Assessment",
      `- **Severity:** ${study.estimatedImpact.severity}`,
      `- **Blast Radius:** ${study.estimatedImpact.blastRadius}`,
      `- **Remediation Cost:** ${study.estimatedImpact.remediationCost}`,
      `- ${study.estimatedImpact.description}`,
      "",
      "## Evidence",
      ...study.evidence.map((e) => `- ${e}`),
    ].join("\n");
  }
}
