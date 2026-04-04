/**
 * Admiral Framework — Automated Rating Calculator (RT-02)
 *
 * RatingCalculator class that:
 * - Collects dimension scores by analyzing codebase state
 * - Applies weighted formula across 7 dimensions
 * - Applies hard cap rules
 * - Produces RatingReport with overall tier, per-dimension scores, recommendations
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  buildRatingLabel,
  type CertificationSuffix,
  compareTiers,
  type DimensionId,
  type DimensionScore,
  HARD_CAP_RULES,
  type HardCapRule,
  RATING_DIMENSIONS,
  type RatingReport,
  type RatingTierCode,
  scoreToTier,
} from "./types";

// ---------------------------------------------------------------------------
// Calculator input
// ---------------------------------------------------------------------------

export interface CalculatorInput {
  /** Root directory of the project */
  projectRoot: string;
  /** Name/identifier of what is being rated */
  entity: string;
  /** Certification suffix */
  certificationSuffix?: CertificationSuffix;
  /** Git commit SHA at time of rating */
  commitSha?: string;
  /** Override dimension scores directly (for testing / CI injection) */
  dimensionOverrides?: Partial<Record<DimensionId, number>>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal probe results
// ---------------------------------------------------------------------------

interface ProbeResult {
  score: number;
  evidence: string;
}

// ---------------------------------------------------------------------------
// RatingCalculator
// ---------------------------------------------------------------------------

export class RatingCalculator {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  calculate(input: CalculatorInput): RatingReport {
    const dimensionScores = this.collectDimensionScores(input.dimensionOverrides ?? {});

    const overallScore = this.computeWeightedScore(dimensionScores);

    const { tier, activeCaps } = this.applyHardCaps(scoreToTier(overallScore), dimensionScores);

    const suffix = input.certificationSuffix ?? "";
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    const recommendations = this.buildRecommendations(dimensionScores, tier);

    const report: RatingReport = {
      id: `rat_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      generatedAt: now.toISOString(),
      entity: input.entity,
      tier,
      certificationSuffix: suffix,
      ratingLabel: buildRatingLabel(tier, suffix),
      overallScore,
      dimensionScores,
      moduleRatings: [],
      activeCaps,
      recommendations,
      validUntil: validUntil.toISOString(),
      commitSha: input.commitSha,
      metadata: input.metadata ?? {},
    };

    return report;
  }

  // -------------------------------------------------------------------------
  // Dimension probes
  // -------------------------------------------------------------------------

  private collectDimensionScores(
    overrides: Partial<Record<DimensionId, number>>,
  ): DimensionScore[] {
    const probes: Array<[DimensionId, () => ProbeResult]> = [
      ["enforcement_coverage", () => this.probeEnforcementCoverage()],
      ["hook_quality", () => this.probeHookQuality()],
      ["standing_orders_compliance", () => this.probeStandingOrdersCompliance()],
      ["brain_utilization", () => this.probeBrainUtilization()],
      ["fleet_governance", () => this.probeFleetGovernance()],
      ["security_posture", () => this.probeSecurityPosture()],
      ["observability_maturity", () => this.probeObservabilityMaturity()],
    ];

    return probes.map(([id, probe]) => {
      const dim = RATING_DIMENSIONS[id];
      const result =
        id in overrides
          ? {
              score: overrides[id] as number,
              evidence: "Score provided via override",
            }
          : probe();

      const score = clamp(result.score, 0, 100);
      return {
        dimensionId: id,
        score,
        weightedContribution: (score * dim.weight) / 100,
        evidence: result.evidence,
        capTriggered: false,
      };
    });
  }

  private computeWeightedScore(scores: DimensionScore[]): number {
    const total = scores.reduce((sum, s) => sum + s.weightedContribution, 0);
    return Math.round(total * 10) / 10;
  }

  private applyHardCaps(
    rawTier: RatingTierCode,
    dimensionScores: DimensionScore[],
  ): { tier: RatingTierCode; activeCaps: HardCapRule[] } {
    const activeCaps: HardCapRule[] = [];
    let effectiveTier = rawTier;

    for (const rule of HARD_CAP_RULES) {
      let triggered = false;

      if (rule.dimension === null && rule.threshold !== undefined) {
        // Any-dimension threshold (e.g., any dimension below 30)
        for (const ds of dimensionScores) {
          if (ds.score < rule.threshold) {
            triggered = true;
            ds.capTriggered = true;
            ds.capRule = rule.condition;
          }
        }
      } else if (rule.dimension !== null && rule.threshold !== undefined) {
        const ds = dimensionScores.find((d) => d.dimensionId === rule.dimension);
        if (ds && ds.score < rule.threshold) {
          triggered = true;
          ds.capTriggered = true;
          ds.capRule = rule.condition;
        }
      }

      if (triggered) {
        activeCaps.push(rule);
        if (compareTiers(rule.maxTier, effectiveTier) < 0) {
          effectiveTier = rule.maxTier;
        }
      }
    }

    return { tier: effectiveTier, activeCaps };
  }

  // -------------------------------------------------------------------------
  // Individual dimension probes
  // -------------------------------------------------------------------------

  private probeEnforcementCoverage(): ProbeResult {
    // Look for hook scripts in .hooks/ or admiral/hooks
    const hookPaths = [
      join(this.projectRoot, ".hooks"),
      join(this.projectRoot, "admiral", "hooks"),
    ];

    let hookCount = 0;
    for (const p of hookPaths) {
      if (existsSync(p)) {
        hookCount += countFiles(p, [".sh", ".ts", ".js"]);
      }
    }

    // Look for standing orders
    const soPath = join(this.projectRoot, "admiral", "standing-orders");
    const soCount = existsSync(soPath) ? countFiles(soPath, [".md", ".json"]) : 0;

    // Look for hook config in .claude/settings.local.json
    const claudeSettings = join(this.projectRoot, ".claude", "settings.local.json");
    const hasClaudeSettings = existsSync(claudeSettings);

    // Heuristic scoring
    let score = 0;
    if (hookCount >= 5) score += 40;
    else if (hookCount >= 2) score += 25;
    else if (hookCount >= 1) score += 15;

    if (soCount >= 5) score += 30;
    else if (soCount >= 2) score += 20;
    else if (soCount >= 1) score += 10;

    if (hasClaudeSettings) score += 20;

    // Look for policies
    const policiesPath = join(this.projectRoot, "admiral", "governance");
    if (existsSync(policiesPath)) score += 10;

    const evidence = [
      `hooks: ${hookCount}`,
      `standing-orders: ${soCount}`,
      `claude settings: ${hasClaudeSettings}`,
    ].join("; ");

    return { score: clamp(score, 0, 100), evidence };
  }

  private probeHookQuality(): ProbeResult {
    const hookPaths = [
      join(this.projectRoot, ".hooks"),
      join(this.projectRoot, "admiral", "hooks"),
    ];

    let totalHooks = 0;
    let hookWithErrorHandling = 0;
    let hookWithLogging = 0;

    for (const p of hookPaths) {
      if (!existsSync(p)) continue;
      const files = collectFiles(p, [".sh"]);
      for (const f of files) {
        totalHooks++;
        const content = safeReadFile(f);
        if (content.includes("set -e") || content.includes("set -euo pipefail"))
          hookWithErrorHandling++;
        if (content.includes("echo") || content.includes("log")) hookWithLogging++;
      }
    }

    if (totalHooks === 0) {
      return { score: 10, evidence: "No hook files found" };
    }

    const errorHandlingPct = hookWithErrorHandling / totalHooks;
    const loggingPct = hookWithLogging / totalHooks;
    const score = Math.round(30 + errorHandlingPct * 40 + loggingPct * 30);

    const evidence = [
      `total hooks: ${totalHooks}`,
      `with error handling: ${hookWithErrorHandling}`,
      `with logging: ${hookWithLogging}`,
    ].join("; ");

    return { score, evidence };
  }

  private probeStandingOrdersCompliance(): ProbeResult {
    const soPath = join(this.projectRoot, "admiral", "standing-orders");
    if (!existsSync(soPath)) {
      return { score: 5, evidence: "No standing-orders directory found" };
    }

    const soFiles = countFiles(soPath, [".md", ".json"]);
    if (soFiles === 0) {
      return { score: 10, evidence: "Standing-orders directory empty" };
    }

    // Check for AGENTS.md / CLAUDE.md which reference standing orders
    const agentsMd = existsSync(join(this.projectRoot, "AGENTS.md"));
    const claudeMd = existsSync(join(this.projectRoot, "CLAUDE.md"));

    // Check for brain entries referencing standing orders
    const brainPath = join(this.projectRoot, ".brain");
    const hasBrain = existsSync(brainPath);

    let score = 30; // base: standing orders exist
    if (soFiles >= 10) score += 30;
    else if (soFiles >= 5) score += 20;
    else score += 10;

    if (agentsMd) score += 15;
    if (claudeMd) score += 10;
    if (hasBrain) score += 15;

    const evidence = [
      `standing-order files: ${soFiles}`,
      `AGENTS.md: ${agentsMd}`,
      `CLAUDE.md: ${claudeMd}`,
      `brain: ${hasBrain}`,
    ].join("; ");

    return { score: clamp(score, 0, 100), evidence };
  }

  private probeBrainUtilization(): ProbeResult {
    const brainPath = join(this.projectRoot, ".brain");
    if (!existsSync(brainPath)) {
      return { score: 0, evidence: "No .brain directory found" };
    }

    const brainFiles = countFiles(brainPath, [".json", ".md"]);
    if (brainFiles === 0) {
      return { score: 5, evidence: ".brain directory empty" };
    }

    // Check for recent brain activity (files modified in last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentFiles = collectFiles(brainPath, [".json", ".md"]).filter((f) => {
      try {
        return statSync(f).mtimeMs > thirtyDaysAgo;
      } catch {
        return false;
      }
    });

    let score = 20; // base: brain exists
    if (brainFiles >= 20) score += 30;
    else if (brainFiles >= 10) score += 20;
    else if (brainFiles >= 5) score += 10;

    const recencyPct = brainFiles > 0 ? recentFiles.length / brainFiles : 0;
    score += Math.round(recencyPct * 50);

    const evidence = [`brain entries: ${brainFiles}`, `recent (30d): ${recentFiles.length}`].join(
      "; ",
    );

    return { score: clamp(score, 0, 100), evidence };
  }

  private probeFleetGovernance(): ProbeResult {
    // Check governance artifacts
    const govPath = join(this.projectRoot, "admiral", "governance");
    const govFiles = existsSync(govPath) ? countFiles(govPath, [".sh", ".ts", ".json", ".md"]) : 0;

    // Check governance-platform
    const gpPath = join(this.projectRoot, "admiral", "governance-platform");
    const gpFiles = existsSync(gpPath) ? countFiles(gpPath, [".sh", ".ts", ".json", ".md"]) : 0;

    // Check control-plane
    const cpSrc = join(this.projectRoot, "control-plane", "src");
    const cpFiles = existsSync(cpSrc) ? countFiles(cpSrc, [".ts"]) : 0;

    let score = 0;
    if (govFiles >= 5) score += 30;
    else if (govFiles >= 2) score += 20;
    else if (govFiles >= 1) score += 10;

    if (gpFiles >= 5) score += 20;
    else if (gpFiles >= 1) score += 10;

    if (cpFiles >= 20) score += 30;
    else if (cpFiles >= 10) score += 20;
    else if (cpFiles >= 5) score += 10;

    // Check for fleet config
    const fleetConfig = join(this.projectRoot, "admiral", "config.json");
    if (existsSync(fleetConfig)) score += 20;

    const evidence = [
      `governance files: ${govFiles}`,
      `governance-platform files: ${gpFiles}`,
      `control-plane modules: ${cpFiles}`,
      `fleet config: ${existsSync(fleetConfig)}`,
    ].join("; ");

    return { score: clamp(score, 0, 100), evidence };
  }

  private probeSecurityPosture(): ProbeResult {
    const secPath = join(this.projectRoot, "admiral", "security");
    const secFiles = existsSync(secPath) ? countFiles(secPath, [".sh", ".ts", ".json", ".md"]) : 0;

    // Check for security audit output
    const auditPath = join(this.projectRoot, ".admiral");
    const hasAudit = existsSync(auditPath);

    // Check for auth in control-plane
    const authTs = join(this.projectRoot, "control-plane", "src", "auth.ts");
    const hasAuth = existsSync(authTs);

    // Check for input validation
    const inputVal = join(this.projectRoot, "control-plane", "src", "input-validation.ts");
    const hasInputVal = existsSync(inputVal);

    let score = 10; // baseline
    if (secFiles >= 5) score += 30;
    else if (secFiles >= 2) score += 20;
    else if (secFiles >= 1) score += 10;

    if (hasAudit) score += 15;
    if (hasAuth) score += 20;
    if (hasInputVal) score += 25;

    const evidence = [
      `security files: ${secFiles}`,
      `audit dir: ${hasAudit}`,
      `auth.ts: ${hasAuth}`,
      `input-validation.ts: ${hasInputVal}`,
    ].join("; ");

    return { score: clamp(score, 0, 100), evidence };
  }

  private probeObservabilityMaturity(): ProbeResult {
    const cpSrc = join(this.projectRoot, "control-plane", "src");

    const hasTracing = existsSync(join(cpSrc, "tracing.ts"));
    const hasMetrics = existsSync(join(cpSrc, "metrics.ts"));
    const hasLogger = existsSync(join(cpSrc, "logger.ts"));
    const hasStructuredLogging = existsSync(join(cpSrc, "structured-logging.ts"));
    const hasDistTracing = existsSync(join(cpSrc, "distributed-tracing.ts"));
    const hasSloTracker = existsSync(join(cpSrc, "slo-tracker.ts"));
    const hasEventStream = existsSync(join(cpSrc, "event-stream.ts"));

    let score = 0;
    if (hasTracing) score += 15;
    if (hasMetrics) score += 15;
    if (hasLogger) score += 15;
    if (hasStructuredLogging) score += 15;
    if (hasDistTracing) score += 15;
    if (hasSloTracker) score += 10;
    if (hasEventStream) score += 15;

    const evidence = [
      `tracing: ${hasTracing}`,
      `metrics: ${hasMetrics}`,
      `logger: ${hasLogger}`,
      `structured-logging: ${hasStructuredLogging}`,
      `distributed-tracing: ${hasDistTracing}`,
      `slo-tracker: ${hasSloTracker}`,
      `event-stream: ${hasEventStream}`,
    ].join("; ");

    return { score: clamp(score, 0, 100), evidence };
  }

  // -------------------------------------------------------------------------
  // Recommendations
  // -------------------------------------------------------------------------

  private buildRecommendations(scores: DimensionScore[], tier: RatingTierCode): string[] {
    const recs: Array<{ text: string; priority: number }> = [];

    for (const ds of scores) {
      const dim = RATING_DIMENSIONS[ds.dimensionId];
      if (ds.score < 30) {
        recs.push({
          text: `CRITICAL: ${dim.name} score (${ds.score}) is below 30. This caps the overall rating at ADM-3. ${getDimensionAdvice(ds.dimensionId, "critical")}`,
          priority: 0,
        });
      } else if (ds.score < 60) {
        recs.push({
          text: `HIGH: Improve ${dim.name} (${ds.score}/100). ${getDimensionAdvice(ds.dimensionId, "high")}`,
          priority: 1,
        });
      } else if (ds.score < 80) {
        recs.push({
          text: `MEDIUM: Strengthen ${dim.name} (${ds.score}/100). ${getDimensionAdvice(ds.dimensionId, "medium")}`,
          priority: 2,
        });
      }
    }

    if (tier === "ADM-4" || tier === "ADM-5") {
      recs.push({
        text: "Deploy core governance hooks (PreToolUse, PostToolUse, SessionStart) to establish enforcement spectrum.",
        priority: 0,
      });
    }

    return recs.sort((a, b) => a.priority - b.priority).map((r) => r.text);
  }
}

// ---------------------------------------------------------------------------
// Advice per dimension
// ---------------------------------------------------------------------------

function getDimensionAdvice(id: DimensionId, severity: "critical" | "high" | "medium"): string {
  const advice: Record<DimensionId, Record<string, string>> = {
    enforcement_coverage: {
      critical: "Implement deterministic hooks for all safety-critical constraints immediately.",
      high: "Add hooks for top-priority constraints. Map Standing Orders to enforcement tiers.",
      medium:
        "Extend hook coverage to remaining constraints. Audit hook inventory against Standing Orders.",
    },
    hook_quality: {
      critical: "Add error handling (set -euo pipefail) and logging to all hooks.",
      high: "Improve hook reliability: add structured logging, retry logic, and failure reporting.",
      medium: "Harden hooks with timeout handling and audit trail output.",
    },
    standing_orders_compliance: {
      critical: "Deploy all 15 Standing Orders and add enforcement hooks immediately.",
      high: "Audit compliance against all 15 Standing Orders. Remediate violations.",
      medium: "Add automated compliance checks to CI pipeline.",
    },
    brain_utilization: {
      critical: "Create .brain directory and start capturing institutional knowledge entries.",
      high: "Increase brain reuse rate. Add brain lookups before starting new tasks.",
      medium: "Improve brain entry freshness. Archive stale entries. Add usefulness scoring.",
    },
    fleet_governance: {
      critical: "Deploy governance-platform with fleet coordination protocols.",
      high: "Add recovery mechanisms. Improve handoff success rate.",
      medium: "Reduce governance overhead. Optimize coordination token ratio.",
    },
    security_posture: {
      critical: "Implement authentication, input validation, and run security audit immediately.",
      high: "Run full attack corpus. Address identity violation risks.",
      medium: "Extend security coverage. Add authorization checks to all endpoints.",
    },
    observability_maturity: {
      critical: "Add basic logging and tracing to establish observability baseline.",
      high: "Add distributed tracing, metrics collection, and SLO tracking.",
      medium: "Improve audit trail completeness. Add per-operation attribution.",
    },
  };

  return advice[id][severity] ?? "";
}

// ---------------------------------------------------------------------------
// File system helpers
// ---------------------------------------------------------------------------

function countFiles(dir: string, extensions: string[]): number {
  return collectFiles(dir, extensions).length;
}

function collectFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > 5) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith(".") && depth > 0) continue;
      const full = join(current, entry);
      let stat: ReturnType<typeof statSync>;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full, depth + 1);
      } else if (extensions.some((ext) => entry.endsWith(ext))) {
        results.push(full);
      }
    }
  }

  walk(dir, 0);
  return results;
}

function safeReadFile(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
