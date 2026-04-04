/**
 * Rating Improvement Recommender (RT-06)
 *
 * Analyzes current rating and produces specific, prioritized actions
 * to improve it. Maps gaps to concrete actions with effort estimates.
 * Implements the Rating Progression table (ADM-5 to ADM-1).
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import {
  type RatingTier,
  type RatingReport,
  type BenchmarkResult,
  CORE_BENCHMARKS,
  TIER_ELIGIBILITY,
  HARD_CAP_RULES,
  TIER_DEFINITIONS,
  compareTiers,
} from "./rating-model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EffortSize = "S" | "M" | "L";

export interface Recommendation {
  id: string;
  priority: number; // 1 = highest
  action: string;
  benchmarkId: string | null;
  gap: number | null;
  effort: EffortSize;
  impact: string;
  /** Reference to existing plan stream items */
  planReferences: string[];
}

export interface ProgressionStep {
  fromTier: RatingTier;
  toTier: RatingTier;
  requirements: string[];
  keyActions: string[];
}

export interface RecommendationReport {
  currentRating: RatingTier;
  nextTier: RatingTier | null;
  recommendations: Recommendation[];
  progression: ProgressionStep[];
}

// ---------------------------------------------------------------------------
// Rating Progression Table
// ---------------------------------------------------------------------------

const PROGRESSION_STEPS: readonly ProgressionStep[] = [
  {
    fromTier: "ADM-5",
    toTier: "ADM-4",
    requirements: [
      "Pass at least 1 Human Judgment Gate",
      "First-pass quality >= 40%",
      "Recovery success rate >= 50%",
      "Enforcement coverage >= 30%",
    ],
    keyActions: [
      "Implement basic governance hooks (identity validation, scope boundary)",
      "Set up test infrastructure with passing test suite",
      "Create enforcement map for Standing Orders",
      "Document governance boundaries and authority tiers",
      "Submit for self-assessment (HJG-1: Strategic Alignment)",
    ],
  },
  {
    fromTier: "ADM-4",
    toTier: "ADM-3",
    requirements: [
      "Pass at least 4 Human Judgment Gates",
      "First-pass quality >= 60%",
      "Enforcement coverage >= 60%",
      "Recovery success rate >= 70%",
      "No identity violations",
      "No unauthorized authority escalations",
      "Governance overhead <= 25%",
      "Knowledge reuse >= 15%",
    ],
    keyActions: [
      "Address all active hard caps — they impose automatic ceilings",
      "Implement remaining core hooks (all spec-defined hooks)",
      "Wire Brain knowledge system into hooks and workflows",
      "Add error recovery protocols with graceful degradation",
      "Pass HJG-1 (Strategic Alignment), HJG-2 (Boundary Adequacy), HJG-3 (Failure Mode Completeness), HJG-5 (Contextual Fitness)",
      "Plan refs: Stream 7 (hooks), Stream 11 (brain), Stream 29 (standing orders)",
    ],
  },
  {
    fromTier: "ADM-3",
    toTier: "ADM-2",
    requirements: [
      "Pass all 6 Human Judgment Gates",
      "First-pass quality >= 75%",
      "Enforcement coverage >= 80%",
      "Recovery success rate >= 85%",
      "Governance overhead <= 15%",
      "Coordination overhead <= 15%",
      "Knowledge reuse >= 35%",
      "Attack corpus tested with >= 70% pass rate",
    ],
    keyActions: [
      "Build and run attack corpus with 30+ scenarios",
      "Achieve >80% enforcement coverage on safety-critical constraints",
      "Optimize governance overhead to <15% of total execution",
      "Implement fleet coordination patterns with measured overhead",
      "Grow Brain knowledge base with active retrieval in workflows",
      "Pass HJG-4 (Trust Appropriateness) and HJG-6 (Novel Situation Response)",
      "Plan refs: Stream 24 (security), Stream 15 (routing), Stream 18 (autonomy)",
    ],
  },
  {
    fromTier: "ADM-2",
    toTier: "ADM-1",
    requirements: [
      "All 7 core benchmarks at or above ADM-1 thresholds",
      "First-pass quality >= 90%",
      "Enforcement coverage = 100%",
      "Recovery success rate >= 95%",
      "Governance overhead <= 10%",
      "Knowledge reuse >= 50%",
      "Attack corpus pass rate >= 70%",
      "Novel situation response evaluated and approved",
    ],
    keyActions: [
      "Achieve 100% enforcement coverage on all safety-critical constraints",
      "Optimize all benchmarks to meet ADM-1 thresholds",
      "Complete attack corpus with adversarial testing",
      "Verify novel situation handling with human evaluators",
      "Ensure all Human Judgment Gates remain passed",
      "Demonstrate unsupervised operation within boundaries",
      "Plan refs: Stream 13 (exemplary), Stream 33 (thesis validation)",
    ],
  },
];

// ---------------------------------------------------------------------------
// Recommendation Generation
// ---------------------------------------------------------------------------

function getNextTier(current: RatingTier): RatingTier | null {
  const order: RatingTier[] = ["ADM-1", "ADM-2", "ADM-3", "ADM-4", "ADM-5"];
  const idx = order.indexOf(current);
  return idx > 0 ? order[idx - 1] : null;
}

function generateBenchmarkRecommendations(
  report: RatingReport,
  nextTier: RatingTier | null,
): Recommendation[] {
  if (!nextTier) return [];

  const eligibility = TIER_ELIGIBILITY.get(nextTier);
  if (!eligibility) return [];

  const recs: Recommendation[] = [];
  let priority = 10; // Start mid-range; hard cap recs get higher priority

  const benchmarkMap = new Map(
    report.benchmarks
      .filter((b) => b.status === "measured" && b.value !== null)
      .map((b) => [b.benchmarkId, b.value as number]),
  );

  for (const threshold of eligibility.thresholds) {
    const current = benchmarkMap.get(threshold.benchmarkId);
    const def = CORE_BENCHMARKS.find((b) => b.id === threshold.benchmarkId);
    if (!def) continue;

    if (current === undefined) {
      recs.push({
        id: `collect-${threshold.benchmarkId}`,
        priority: priority++,
        action: `Start collecting data for ${def.name} — currently no measurement`,
        benchmarkId: threshold.benchmarkId,
        gap: null,
        effort: "M",
        impact: `Required for ${nextTier} eligibility`,
        planReferences: [],
      });
      continue;
    }

    const meetsThreshold = def.higherIsBetter
      ? current >= threshold.value
      : current <= threshold.value;

    if (!meetsThreshold) {
      const gap = def.higherIsBetter
        ? threshold.value - current
        : current - threshold.value;

      const effort: EffortSize = gap > 20 ? "L" : gap > 10 ? "M" : "S";

      recs.push({
        id: `improve-${threshold.benchmarkId}`,
        priority: priority++,
        action: `Improve ${def.name} from ${current}${def.unit === "percent" ? "%" : ""} to ${threshold.value}${def.unit === "percent" ? "%" : ""} (gap: ${gap.toFixed(1)})`,
        benchmarkId: threshold.benchmarkId,
        gap,
        effort,
        impact: `Removes ${nextTier} eligibility blocker`,
        planReferences: getPlanReferences(threshold.benchmarkId),
      });
    }
  }

  return recs;
}

function generateHardCapRecommendations(report: RatingReport): Recommendation[] {
  return report.activeHardCaps.map((cap, i) => {
    const rule = HARD_CAP_RULES.find((r) => r.id === cap.ruleId);
    return {
      id: `resolve-cap-${cap.ruleId}`,
      priority: i + 1, // Hard caps get highest priority
      action: `Remove hard cap: ${rule?.condition ?? cap.ruleId} — currently capping at ${cap.maxTier}`,
      benchmarkId: rule?.benchmarkId ?? null,
      gap: cap.currentValue !== null && cap.threshold !== null ? Math.abs(cap.currentValue - cap.threshold) : null,
      effort: "L" as EffortSize,
      impact: `Removes ${cap.maxTier} ceiling — highest priority improvement`,
      planReferences: rule?.benchmarkId ? getPlanReferences(rule.benchmarkId) : [],
    };
  });
}

function generateGateRecommendations(report: RatingReport): Recommendation[] {
  const evaluated = new Set(report.gateVerdicts.map((v) => v.gateId));
  const failed = report.gateVerdicts.filter((v) => !v.passed);

  const recs: Recommendation[] = [];
  let priority = 5;

  for (const fv of failed) {
    recs.push({
      id: `fix-gate-${fv.gateId}`,
      priority: priority++,
      action: `Address failed Human Judgment Gate: ${fv.gateId} — evidence: ${fv.evidence.slice(0, 100)}`,
      benchmarkId: null,
      gap: null,
      effort: "L",
      impact: "Failed gates impose rating ceilings",
      planReferences: [],
    });
  }

  if (evaluated.size < 6) {
    recs.push({
      id: "evaluate-gates",
      priority: priority++,
      action: `Evaluate ${6 - evaluated.size} remaining Human Judgment Gates (${evaluated.size}/6 evaluated)`,
      benchmarkId: null,
      gap: null,
      effort: "M",
      impact: "More gates passed enables higher tiers",
      planReferences: [],
    });
  }

  return recs;
}

function getPlanReferences(benchmarkId: string): string[] {
  const refs: Record<string, string[]> = {
    "first-pass-quality": ["Stream 1 (testing)", "Stream 31 (QA system)"],
    "recovery-success-rate": ["Stream 8 (execution patterns)", "Stream 3 (architecture)"],
    "enforcement-coverage": ["Stream 7 (hooks)", "Stream 29 (standing orders)"],
    "context-efficiency": ["Stream 30 (context engineering)"],
    "governance-overhead": ["Stream 6 (self-enforcement)", "Stream 25 (observability)"],
    "coordination-overhead": ["Stream 15 (fleet routing)", "Stream 8 (execution patterns)"],
    "knowledge-reuse": ["Stream 11 (brain system)", "Stream 20 (data ecosystem)"],
  };
  return refs[benchmarkId] ?? [];
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

export function generateRecommendations(report: RatingReport): RecommendationReport {
  const nextTier = getNextTier(report.rating);

  const hardCapRecs = generateHardCapRecommendations(report);
  const gateRecs = generateGateRecommendations(report);
  const benchmarkRecs = generateBenchmarkRecommendations(report, nextTier);

  // Combine and sort by priority
  const all = [...hardCapRecs, ...gateRecs, ...benchmarkRecs].sort(
    (a, b) => a.priority - b.priority,
  );

  // Get applicable progression steps — include the step from current tier and adjacent
  const progression = PROGRESSION_STEPS.filter(
    (s) => s.fromTier === report.rating || s.toTier === report.rating,
  );

  return {
    currentRating: report.rating,
    nextTier,
    recommendations: all,
    progression,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatRecommendations(recReport: RecommendationReport): string {
  const lines: string[] = [
    "# Rating Improvement Recommendations",
    "",
    `**Current Rating:** ${recReport.currentRating} (${TIER_DEFINITIONS.get(recReport.currentRating)?.grade ?? ""})`,
    `**Next Tier:** ${recReport.nextTier ?? "Already at ADM-1 Premier"}`,
    "",
  ];

  if (recReport.recommendations.length === 0) {
    lines.push("No recommendations — all benchmarks meet the next tier's thresholds.");
    return lines.join("\n");
  }

  lines.push("## Prioritized Actions", "");
  lines.push("| # | Action | Effort | Impact |");
  lines.push("|---|--------|--------|--------|");

  for (const rec of recReport.recommendations) {
    lines.push(`| ${rec.priority} | ${rec.action} | ${rec.effort} | ${rec.impact} |`);
  }

  if (recReport.recommendations.some((r) => r.planReferences.length > 0)) {
    lines.push("", "## Plan References", "");
    for (const rec of recReport.recommendations) {
      if (rec.planReferences.length > 0) {
        lines.push(`- **${rec.action.split(" — ")[0]}**: ${rec.planReferences.join(", ")}`);
      }
    }
  }

  if (recReport.progression.length > 0) {
    lines.push("", "## Rating Progression Path", "");
    for (const step of recReport.progression) {
      lines.push(`### ${step.fromTier} → ${step.toTier}`);
      lines.push("");
      lines.push("**Requirements:**");
      for (const r of step.requirements) {
        lines.push(`- ${r}`);
      }
      lines.push("", "**Key Actions:**");
      for (const a of step.keyActions) {
        lines.push(`- ${a}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
