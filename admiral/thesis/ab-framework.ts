/**
 * Advisory vs Enforcement A/B Comparison Framework (TV-02)
 *
 * Runs identical tasks under advisory-only (A) and enforcement (B) modes.
 * Measures: violation rate, violation severity, first-pass quality,
 * completion time, and escalation rate.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GovernanceMode = "advisory" | "enforcement";

export interface TaskDefinition {
  id: string;
  name: string;
  description: string;
  constraints: string[];
  expectedBehavior: string;
}

export interface TaskRun {
  id: string;
  taskId: string;
  mode: GovernanceMode;
  timestamp: string;
  violations: Violation[];
  escalations: Escalation[];
  completionTimeMs: number;
  firstPassQuality: boolean;
  output: string;
}

export interface Violation {
  hookId: string;
  constraint: string;
  severity: "critical" | "high" | "medium" | "low";
  blocked: boolean;
  description: string;
}

export interface Escalation {
  reason: string;
  fromTier: string;
  toTier: string;
  resolved: boolean;
}

export interface TaskPair {
  taskId: string;
  advisory: TaskRun;
  enforcement: TaskRun;
}

// ---------------------------------------------------------------------------
// A/B Metrics
// ---------------------------------------------------------------------------

export interface ABMetrics {
  violationRateAdvisory: number;
  violationRateEnforcement: number;
  violationRateReduction: number;

  avgSeverityAdvisory: number;
  avgSeverityEnforcement: number;
  severityReduction: number;

  firstPassQualityAdvisory: number;
  firstPassQualityEnforcement: number;
  qualityImprovement: number;

  avgTimeAdvisory: number;
  avgTimeEnforcement: number;
  timeImpactPercent: number;

  escalationRateAdvisory: number;
  escalationRateEnforcement: number;
  escalationRatio: number;
}

export interface ABResult {
  pairCount: number;
  metrics: ABMetrics;
  statisticalSignificance: StatisticalResult;
  verdict: "enforcement-wins" | "advisory-wins" | "no-difference" | "insufficient-data";
  summary: string;
}

export interface StatisticalResult {
  sufficientSampleSize: boolean;
  minimumRequired: number;
  actual: number;
  confidenceNote: string;
}

// ---------------------------------------------------------------------------
// Severity Scoring
// ---------------------------------------------------------------------------

const SEVERITY_SCORES: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ---------------------------------------------------------------------------
// A/B Framework
// ---------------------------------------------------------------------------

export class ABComparisonFramework {
  private tasks: Map<string, TaskDefinition> = new Map();
  private pairs: TaskPair[] = [];

  /**
   * Register a task for A/B comparison.
   */
  registerTask(task: TaskDefinition): void {
    this.tasks.set(task.id, task);
  }

  /**
   * Record a task run result.
   */
  recordRun(run: TaskRun): void {
    const existingPairIdx = this.pairs.findIndex(
      (p) => p.taskId === run.taskId && (
        (run.mode === "advisory" && !p.advisory.id) ||
        (run.mode === "enforcement" && !p.enforcement.id)
      ),
    );

    if (existingPairIdx >= 0) {
      if (run.mode === "advisory") {
        this.pairs[existingPairIdx].advisory = run;
      } else {
        this.pairs[existingPairIdx].enforcement = run;
      }
      return;
    }

    // Start a new pair
    const emptyRun: TaskRun = {
      id: "",
      taskId: run.taskId,
      mode: run.mode === "advisory" ? "enforcement" : "advisory",
      timestamp: "",
      violations: [],
      escalations: [],
      completionTimeMs: 0,
      firstPassQuality: false,
      output: "",
    };

    this.pairs.push({
      taskId: run.taskId,
      advisory: run.mode === "advisory" ? run : emptyRun,
      enforcement: run.mode === "enforcement" ? run : emptyRun,
    });
  }

  /**
   * Add a complete pair directly.
   */
  addPair(pair: TaskPair): void {
    this.pairs.push(pair);
  }

  /**
   * Compute A/B comparison results.
   */
  computeResults(): ABResult {
    const completePairs = this.pairs.filter(
      (p) => p.advisory.id && p.enforcement.id,
    );

    if (completePairs.length === 0) {
      return {
        pairCount: 0,
        metrics: emptyMetrics(),
        statisticalSignificance: {
          sufficientSampleSize: false,
          minimumRequired: 10,
          actual: 0,
          confidenceNote: "No complete task pairs available.",
        },
        verdict: "insufficient-data",
        summary: "No complete A/B task pairs. Cannot compute comparison.",
      };
    }

    const metrics = computeMetrics(completePairs);
    const significance = assessSignificance(completePairs.length);
    const verdict = determineVerdict(metrics, significance);

    return {
      pairCount: completePairs.length,
      metrics,
      statisticalSignificance: significance,
      verdict,
      summary: buildSummary(metrics, completePairs.length, verdict),
    };
  }

  getPairCount(): number {
    return this.pairs.length;
  }

  getCompletePairCount(): number {
    return this.pairs.filter((p) => p.advisory.id && p.enforcement.id).length;
  }

  getPairs(): readonly TaskPair[] {
    return this.pairs;
  }
}

// ---------------------------------------------------------------------------
// Metric Computation
// ---------------------------------------------------------------------------

function computeMetrics(pairs: TaskPair[]): ABMetrics {
  const n = pairs.length;

  // Violation rates
  const advViolations = pairs.reduce((s, p) => s + p.advisory.violations.length, 0);
  const enfViolations = pairs.reduce((s, p) => s + p.enforcement.violations.length, 0);
  const violationRateAdvisory = advViolations / n;
  const violationRateEnforcement = enfViolations / n;
  const violationRateReduction = violationRateAdvisory > 0
    ? ((violationRateAdvisory - violationRateEnforcement) / violationRateAdvisory) * 100
    : 0;

  // Severity
  const advSeverity = pairs.flatMap((p) => p.advisory.violations.map((v) => SEVERITY_SCORES[v.severity] ?? 1));
  const enfSeverity = pairs.flatMap((p) => p.enforcement.violations.map((v) => SEVERITY_SCORES[v.severity] ?? 1));
  const avgSeverityAdvisory = advSeverity.length > 0 ? advSeverity.reduce((a, b) => a + b, 0) / advSeverity.length : 0;
  const avgSeverityEnforcement = enfSeverity.length > 0 ? enfSeverity.reduce((a, b) => a + b, 0) / enfSeverity.length : 0;

  // First-pass quality
  const advQuality = pairs.filter((p) => p.advisory.firstPassQuality).length / n * 100;
  const enfQuality = pairs.filter((p) => p.enforcement.firstPassQuality).length / n * 100;

  // Completion time
  const avgTimeAdvisory = pairs.reduce((s, p) => s + p.advisory.completionTimeMs, 0) / n;
  const avgTimeEnforcement = pairs.reduce((s, p) => s + p.enforcement.completionTimeMs, 0) / n;
  const timeImpactPercent = avgTimeAdvisory > 0
    ? ((avgTimeEnforcement - avgTimeAdvisory) / avgTimeAdvisory) * 100
    : 0;

  // Escalation rates
  const advEscalations = pairs.reduce((s, p) => s + p.advisory.escalations.length, 0) / n;
  const enfEscalations = pairs.reduce((s, p) => s + p.enforcement.escalations.length, 0) / n;
  const escalationRatio = advEscalations > 0 ? enfEscalations / advEscalations : enfEscalations > 0 ? Infinity : 1;

  return {
    violationRateAdvisory,
    violationRateEnforcement,
    violationRateReduction: round(violationRateReduction),
    avgSeverityAdvisory: round(avgSeverityAdvisory),
    avgSeverityEnforcement: round(avgSeverityEnforcement),
    severityReduction: round(avgSeverityAdvisory - avgSeverityEnforcement),
    firstPassQualityAdvisory: round(advQuality),
    firstPassQualityEnforcement: round(enfQuality),
    qualityImprovement: round(enfQuality - advQuality),
    avgTimeAdvisory: round(avgTimeAdvisory),
    avgTimeEnforcement: round(avgTimeEnforcement),
    timeImpactPercent: round(timeImpactPercent),
    escalationRateAdvisory: round(advEscalations),
    escalationRateEnforcement: round(enfEscalations),
    escalationRatio: round(escalationRatio === Infinity ? 99 : escalationRatio),
  };
}

function emptyMetrics(): ABMetrics {
  return {
    violationRateAdvisory: 0, violationRateEnforcement: 0, violationRateReduction: 0,
    avgSeverityAdvisory: 0, avgSeverityEnforcement: 0, severityReduction: 0,
    firstPassQualityAdvisory: 0, firstPassQualityEnforcement: 0, qualityImprovement: 0,
    avgTimeAdvisory: 0, avgTimeEnforcement: 0, timeImpactPercent: 0,
    escalationRateAdvisory: 0, escalationRateEnforcement: 0, escalationRatio: 0,
  };
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

// ---------------------------------------------------------------------------
// Statistical Assessment
// ---------------------------------------------------------------------------

function assessSignificance(sampleSize: number): StatisticalResult {
  const minimum = 10;
  return {
    sufficientSampleSize: sampleSize >= minimum,
    minimumRequired: minimum,
    actual: sampleSize,
    confidenceNote: sampleSize >= 30
      ? "Large sample — high confidence in results."
      : sampleSize >= minimum
        ? "Minimum sample met — moderate confidence. More data strengthens conclusions."
        : `Below minimum sample (${minimum}). Results are directional only.`,
  };
}

function determineVerdict(
  metrics: ABMetrics,
  significance: StatisticalResult,
): ABResult["verdict"] {
  if (!significance.sufficientSampleSize) return "insufficient-data";

  let enforcementWins = 0;
  let advisoryWins = 0;

  if (metrics.violationRateReduction > 30) enforcementWins++;
  else if (metrics.violationRateReduction < 5) advisoryWins++;

  if (metrics.qualityImprovement > 5) enforcementWins++;
  else if (metrics.qualityImprovement < -5) advisoryWins++;

  if (metrics.timeImpactPercent < 15) enforcementWins++;
  else if (metrics.timeImpactPercent > 30) advisoryWins++;

  if (metrics.severityReduction > 0.5) enforcementWins++;
  else if (metrics.severityReduction < -0.5) advisoryWins++;

  if (enforcementWins > advisoryWins) return "enforcement-wins";
  if (advisoryWins > enforcementWins) return "advisory-wins";
  return "no-difference";
}

function buildSummary(metrics: ABMetrics, pairCount: number, verdict: ABResult["verdict"]): string {
  const lines = [
    `A/B Comparison: ${pairCount} task pairs.`,
    `Violation rate: ${metrics.violationRateReduction}% reduction under enforcement.`,
    `First-pass quality: ${metrics.qualityImprovement > 0 ? "+" : ""}${metrics.qualityImprovement} percentage points.`,
    `Completion time impact: ${metrics.timeImpactPercent > 0 ? "+" : ""}${metrics.timeImpactPercent}%.`,
    `Verdict: ${verdict}.`,
  ];
  return lines.join(" ");
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatABResult(result: ABResult): string {
  const lines: string[] = [
    "# A/B Comparison: Advisory vs Enforcement",
    "",
    `**Task Pairs:** ${result.pairCount}`,
    `**Verdict:** ${result.verdict}`,
    `**Sample Size:** ${result.statisticalSignificance.actual}/${result.statisticalSignificance.minimumRequired} (${result.statisticalSignificance.confidenceNote})`,
    "",
    "## Metrics",
    "",
    "| Metric | Advisory (A) | Enforcement (B) | Delta |",
    "|--------|-------------|-----------------|-------|",
    `| Violation Rate | ${result.metrics.violationRateAdvisory}/task | ${result.metrics.violationRateEnforcement}/task | ${result.metrics.violationRateReduction}% reduction |`,
    `| Avg Severity | ${result.metrics.avgSeverityAdvisory} | ${result.metrics.avgSeverityEnforcement} | ${result.metrics.severityReduction} reduction |`,
    `| First-Pass Quality | ${result.metrics.firstPassQualityAdvisory}% | ${result.metrics.firstPassQualityEnforcement}% | ${result.metrics.qualityImprovement > 0 ? "+" : ""}${result.metrics.qualityImprovement}pp |`,
    `| Completion Time | ${result.metrics.avgTimeAdvisory}ms | ${result.metrics.avgTimeEnforcement}ms | ${result.metrics.timeImpactPercent > 0 ? "+" : ""}${result.metrics.timeImpactPercent}% |`,
    `| Escalation Rate | ${result.metrics.escalationRateAdvisory}/task | ${result.metrics.escalationRateEnforcement}/task | ${result.metrics.escalationRatio}x |`,
    "",
    "## Summary",
    "",
    result.summary,
  ];

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Test Data Helpers
// ---------------------------------------------------------------------------

export function createTaskRun(
  taskId: string,
  mode: GovernanceMode,
  overrides: Partial<Omit<TaskRun, "id" | "taskId" | "mode">> = {},
): TaskRun {
  return {
    id: randomUUID(),
    taskId,
    mode,
    timestamp: new Date().toISOString(),
    violations: [],
    escalations: [],
    completionTimeMs: 1000,
    firstPassQuality: true,
    output: "test output",
    ...overrides,
  };
}
