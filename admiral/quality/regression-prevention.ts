/**
 * Quality Regression Prevention (QA-10)
 *
 * CI gate that blocks merges dropping a module below the red threshold (60)
 * or declining by more than 10 points. Exception via quality-debt
 * acknowledgment label requiring Admiral approval. Posts quality impact
 * report to the PR. Runs in < 60s.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type { ModuleMetrics } from "./quality-metrics";
import { QualityScoreEngine, type ModuleQualityScore, type QualityScoreOptions } from "./quality-score";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GateVerdict = "pass" | "block" | "warn";

export interface RegressionCheckResult {
  module: string;
  currentScore: number;
  baselineScore: number | null;
  scoreDelta: number;
  verdict: GateVerdict;
  reason: string;
}

export interface RegressionReport {
  timestamp: string;
  results: RegressionCheckResult[];
  summary: RegressionSummary;
  qualityImpactMarkdown: string;
}

export interface RegressionSummary {
  totalModules: number;
  passing: number;
  blocked: number;
  warnings: number;
  overallVerdict: GateVerdict;
  hasDebtAcknowledgment: boolean;
}

export interface RegressionOptions {
  /** Score below which merges are blocked (default 60) */
  redThreshold?: number;
  /** Maximum allowed score decline in points (default 10) */
  maxDecline?: number;
  /** Whether quality-debt acknowledgment label is present (default false) */
  debtAcknowledged?: boolean;
  /** Baseline scores per module (from prior run) */
  baselines?: Record<string, number>;
  /** Quality score engine options */
  scoreOptions?: QualityScoreOptions;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_RED_THRESHOLD = 60;
const DEFAULT_MAX_DECLINE = 10;

// ---------------------------------------------------------------------------
// Regression Gate
// ---------------------------------------------------------------------------

export class RegressionGate {
  private readonly redThreshold: number;
  private readonly maxDecline: number;
  private readonly debtAcknowledged: boolean;
  private readonly baselines: Record<string, number>;
  private readonly scoreEngine: QualityScoreEngine;

  constructor(options: RegressionOptions = {}) {
    this.redThreshold = options.redThreshold ?? DEFAULT_RED_THRESHOLD;
    this.maxDecline = options.maxDecline ?? DEFAULT_MAX_DECLINE;
    this.debtAcknowledged = options.debtAcknowledged ?? false;
    this.baselines = options.baselines ?? {};
    this.scoreEngine = new QualityScoreEngine(options.scoreOptions);
  }

  /** Check a single module for regression */
  checkModule(metrics: ModuleMetrics): RegressionCheckResult {
    const scored = this.scoreEngine.scoreModule(metrics);
    const baseline = this.baselines[metrics.module] ?? null;
    const delta = baseline !== null ? scored.composite - baseline : 0;

    let verdict: GateVerdict = "pass";
    let reason = "Score within acceptable range";

    // Check absolute threshold
    if (scored.composite < this.redThreshold) {
      if (this.debtAcknowledged) {
        verdict = "warn";
        reason = `Score ${scored.composite} below red threshold ${this.redThreshold} (acknowledged via quality-debt label)`;
      } else {
        verdict = "block";
        reason = `Score ${scored.composite} below red threshold ${this.redThreshold}`;
      }
    }
    // Check relative decline (only if not already blocked)
    else if (baseline !== null && delta < -this.maxDecline) {
      if (this.debtAcknowledged) {
        verdict = "warn";
        reason = `Score declined ${Math.abs(delta)} points (${baseline} → ${scored.composite}), exceeds max ${this.maxDecline} (acknowledged)`;
      } else {
        verdict = "block";
        reason = `Score declined ${Math.abs(delta)} points (${baseline} → ${scored.composite}), exceeds max decline of ${this.maxDecline}`;
      }
    }
    // Slight decline warning
    else if (baseline !== null && delta < 0) {
      verdict = "warn";
      reason = `Score declined ${Math.abs(delta)} points (${baseline} → ${scored.composite})`;
    }

    return {
      module: metrics.module,
      currentScore: scored.composite,
      baselineScore: baseline,
      scoreDelta: baseline !== null ? delta : 0,
      verdict,
      reason,
    };
  }

  /** Check all modules and produce a regression report */
  check(metricsArray: ModuleMetrics[]): RegressionReport {
    const results = metricsArray.map((m) => this.checkModule(m));

    const passing = results.filter((r) => r.verdict === "pass").length;
    const blocked = results.filter((r) => r.verdict === "block").length;
    const warnings = results.filter((r) => r.verdict === "warn").length;

    const overallVerdict: GateVerdict = blocked > 0 ? "block" : warnings > 0 ? "warn" : "pass";

    const summary: RegressionSummary = {
      totalModules: results.length,
      passing,
      blocked,
      warnings,
      overallVerdict,
      hasDebtAcknowledgment: this.debtAcknowledged,
    };

    const qualityImpactMarkdown = this.generateImpactMarkdown(results, summary);

    return {
      timestamp: new Date().toISOString(),
      results,
      summary,
      qualityImpactMarkdown,
    };
  }

  /** Extract baselines from current scores (for future comparisons) */
  static extractBaselines(metricsArray: ModuleMetrics[], engine?: QualityScoreEngine): Record<string, number> {
    const scorer = engine ?? new QualityScoreEngine();
    const baselines: Record<string, number> = {};
    for (const m of metricsArray) {
      const scored = scorer.scoreModule(m);
      baselines[m.module] = scored.composite;
    }
    return baselines;
  }

  // -------------------------------------------------------------------------
  // Quality impact markdown (for PR posting)
  // -------------------------------------------------------------------------

  private generateImpactMarkdown(results: RegressionCheckResult[], summary: RegressionSummary): string {
    const lines: string[] = [];
    const icon = summary.overallVerdict === "pass" ? "PASS" : summary.overallVerdict === "warn" ? "WARN" : "BLOCK";

    lines.push(`## Quality Impact Report [${icon}]`);
    lines.push("");
    lines.push(`> ${summary.totalModules} modules checked: ${summary.passing} passing, ${summary.warnings} warnings, ${summary.blocked} blocked`);
    if (summary.hasDebtAcknowledgment) {
      lines.push("> Quality-debt acknowledgment label present");
    }
    lines.push("");

    // Blocked modules
    const blockedResults = results.filter((r) => r.verdict === "block");
    if (blockedResults.length > 0) {
      lines.push("### Blocked");
      lines.push("");
      for (const r of blockedResults) {
        lines.push(`- **${r.module}**: ${r.reason}`);
      }
      lines.push("");
    }

    // Warnings
    const warnResults = results.filter((r) => r.verdict === "warn");
    if (warnResults.length > 0) {
      lines.push("### Warnings");
      lines.push("");
      for (const r of warnResults) {
        lines.push(`- **${r.module}**: ${r.reason}`);
      }
      lines.push("");
    }

    // Score table
    if (results.length > 0) {
      lines.push("### Scores");
      lines.push("");
      lines.push("| Module | Score | Baseline | Delta | Verdict |");
      lines.push("|--------|-------|----------|-------|---------|");
      for (const r of results) {
        const baselineStr = r.baselineScore !== null ? String(r.baselineScore) : "N/A";
        const deltaStr = r.baselineScore !== null ? `${r.scoreDelta >= 0 ? "+" : ""}${r.scoreDelta}` : "N/A";
        lines.push(`| \`${r.module}\` | ${r.currentScore} | ${baselineStr} | ${deltaStr} | ${r.verdict.toUpperCase()} |`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  // -------------------------------------------------------------------------
  // Formatters
  // -------------------------------------------------------------------------

  static formatReport(report: RegressionReport): string {
    const lines: string[] = [];

    lines.push("=".repeat(55));
    lines.push("  QUALITY REGRESSION GATE");
    lines.push(`  ${report.timestamp}`);
    lines.push("=".repeat(55));
    lines.push("");
    lines.push(`Verdict: ${report.summary.overallVerdict.toUpperCase()}`);
    lines.push(`Modules: ${report.summary.totalModules} (${report.summary.passing} pass, ${report.summary.warnings} warn, ${report.summary.blocked} block)`);
    if (report.summary.hasDebtAcknowledgment) {
      lines.push("Quality-debt acknowledgment: YES");
    }
    lines.push("");

    for (const r of report.results) {
      const icon = r.verdict === "pass" ? "[OK]" : r.verdict === "warn" ? "[WARN]" : "[BLOCK]";
      const baseStr = r.baselineScore !== null ? `baseline:${r.baselineScore}` : "no baseline";
      lines.push(`${icon} ${r.module}: ${r.currentScore} (${baseStr}, delta:${r.scoreDelta})`);
      if (r.verdict !== "pass") {
        lines.push(`  -> ${r.reason}`);
      }
    }

    lines.push("");
    lines.push("=".repeat(55));
    return lines.join("\n");
  }

  static formatReportJSON(report: RegressionReport): string {
    return JSON.stringify(report, null, 2);
  }
}
