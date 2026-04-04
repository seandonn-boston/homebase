/**
 * Rating Dashboard (RT-09)
 *
 * Generates dashboard data and text output for the control plane.
 * Displays: overall rating, per-dimension scores, history trend,
 * per-module heatmap, active hard caps, gate status, next-tier requirements.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type { RatingTier, RatingReport, BenchmarkResult } from "./rating-model";
import { TIER_DEFINITIONS, TIER_COLORS, CORE_BENCHMARKS, TIER_ELIGIBILITY, HUMAN_JUDGMENT_GATES } from "./rating-model";
import { generateBadgeMarkdown } from "./badge-generator";
import type { ModuleRatingReport } from "./module-rating";
import type { TrendSummary } from "./history-tracker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardData {
  /** Current rating with badge */
  rating: RatingTier;
  displayRating: string;
  badge: string;
  color: string;

  /** Per-dimension scores */
  dimensions: DimensionDisplay[];

  /** Module heatmap */
  moduleHeatmap: ModuleHeatmapEntry[];

  /** Active hard caps */
  hardCaps: string[];

  /** Gate status */
  gateStatus: GateStatusEntry[];

  /** Next tier requirements */
  nextTierRequirements: string[];

  /** Trend indicators */
  trendDirection: "improving" | "declining" | "stable" | "unknown";
  recentTransitions: number;
}

export interface DimensionDisplay {
  name: string;
  value: number | null;
  unit: string;
  status: "green" | "yellow" | "red" | "unknown";
  target: number;
}

export interface ModuleHeatmapEntry {
  module: string;
  rating: RatingTier;
  color: string;
  criticality: string;
}

export interface GateStatusEntry {
  gateId: string;
  name: string;
  status: "passed" | "failed" | "not-evaluated";
}

// ---------------------------------------------------------------------------
// Dashboard Builder
// ---------------------------------------------------------------------------

export function buildDashboard(
  report: RatingReport,
  moduleReport?: ModuleRatingReport,
  trendSummary?: TrendSummary,
): DashboardData {
  const badge = generateBadgeMarkdown({
    tier: report.rating,
    suffix: report.certificationSuffix,
  });
  const color = TIER_COLORS.get(report.rating) ?? "red";

  // Per-dimension scores
  const nextTier = getNextTier(report.rating);
  const nextEligibility = nextTier ? TIER_ELIGIBILITY.get(nextTier) : null;

  const dimensions: DimensionDisplay[] = CORE_BENCHMARKS.map((def) => {
    const benchmark = report.benchmarks.find((b) => b.benchmarkId === def.id);
    const value = benchmark?.status === "measured" ? benchmark.value : null;
    const threshold = nextEligibility?.thresholds.find((t) => t.benchmarkId === def.id);
    const target = threshold?.value ?? def.targetValue;

    let status: DimensionDisplay["status"] = "unknown";
    if (value !== null) {
      const meetsTarget = def.higherIsBetter ? value >= target : value <= target;
      const meetsMidpoint = def.higherIsBetter ? value >= target * 0.7 : value <= target * 1.3;
      status = meetsTarget ? "green" : meetsMidpoint ? "yellow" : "red";
    }

    return { name: def.name, value, unit: def.unit, status, target };
  });

  // Module heatmap
  const moduleHeatmap: ModuleHeatmapEntry[] = (moduleReport?.modules ?? []).map((m) => ({
    module: m.module,
    rating: m.rating,
    color: TIER_COLORS.get(m.rating) ?? "red",
    criticality: m.criticality,
  }));

  // Hard caps
  const hardCaps = report.activeHardCaps.map((c) => {
    return `${c.ruleId}: max ${c.maxTier} (current: ${c.currentValue ?? "N/A"}, threshold: ${c.threshold ?? "N/A"})`;
  });

  // Gate status
  const evaluatedGates = new Set(report.gateVerdicts.map((v) => v.gateId));
  const gateStatus: GateStatusEntry[] = HUMAN_JUDGMENT_GATES.map((g) => {
    const verdict = report.gateVerdicts.find((v) => v.gateId === g.id);
    return {
      gateId: g.id,
      name: g.name,
      status: verdict ? (verdict.passed ? "passed" : "failed") : "not-evaluated",
    };
  });

  // Next tier requirements
  const nextTierRequirements: string[] = [];
  if (nextTier) {
    const tierDef = TIER_DEFINITIONS.get(nextTier);
    nextTierRequirements.push(`Target: ${nextTier} (${tierDef?.grade ?? ""})`);
    for (const dim of dimensions) {
      if (dim.status === "red" || dim.status === "yellow") {
        nextTierRequirements.push(`Improve ${dim.name}: ${dim.value ?? "N/A"} → ${dim.target}`);
      }
    }
    const passedGates = report.gateVerdicts.filter((v) => v.passed).length;
    if (tierDef && passedGates < tierDef.minGatesPassed) {
      nextTierRequirements.push(
        `Pass ${tierDef.minGatesPassed - passedGates} more Human Judgment Gate(s)`,
      );
    }
  }

  // Trend direction
  let trendDirection: DashboardData["trendDirection"] = "unknown";
  let recentTransitions = 0;
  if (trendSummary) {
    const window30 = trendSummary.windows.find((w) => w.label === "30-day");
    if (window30 && window30.entries.length >= 2) {
      const improving = window30.benchmarkTrends.filter((t) => t.direction === "improving").length;
      const declining = window30.benchmarkTrends.filter((t) => t.direction === "declining").length;
      trendDirection = improving > declining ? "improving" : declining > improving ? "declining" : "stable";
    }
    recentTransitions = trendSummary.transitions.filter((t) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(t.timestamp) >= thirtyDaysAgo;
    }).length;
  }

  return {
    rating: report.rating,
    displayRating: report.displayRating,
    badge,
    color,
    dimensions,
    moduleHeatmap,
    hardCaps,
    gateStatus,
    nextTierRequirements,
    trendDirection,
    recentTransitions,
  };
}

function getNextTier(current: RatingTier): RatingTier | null {
  const order: RatingTier[] = ["ADM-1", "ADM-2", "ADM-3", "ADM-4", "ADM-5"];
  const idx = order.indexOf(current);
  return idx > 0 ? order[idx - 1] : null;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatDashboard(data: DashboardData): string {
  const lines: string[] = [
    "# Admiral Rating Dashboard",
    "",
    `${data.badge}`,
    "",
    `**Rating:** ${data.displayRating} | **Trend:** ${data.trendDirection} | **Recent Transitions:** ${data.recentTransitions}`,
    "",
    "## Benchmark Scores",
    "",
    "| Benchmark | Value | Target | Status |",
    "|-----------|-------|--------|--------|",
  ];

  for (const d of data.dimensions) {
    const icon = d.status === "green" ? "OK" : d.status === "yellow" ? "WARN" : d.status === "red" ? "FAIL" : "?";
    const val = d.value !== null ? (d.unit === "percent" ? `${d.value}%` : `${d.value}`) : "N/A";
    const target = d.unit === "percent" ? `${d.target}%` : `${d.target}`;
    lines.push(`| ${d.name} | ${val} | ${target} | ${icon} |`);
  }

  if (data.gateStatus.length > 0) {
    lines.push("", "## Human Judgment Gates", "");
    lines.push("| Gate | Status |");
    lines.push("|------|--------|");
    for (const g of data.gateStatus) {
      const icon = g.status === "passed" ? "PASS" : g.status === "failed" ? "FAIL" : "---";
      lines.push(`| ${g.name} | ${icon} |`);
    }
  }

  if (data.hardCaps.length > 0) {
    lines.push("", "## Active Hard Caps", "");
    for (const c of data.hardCaps) {
      lines.push(`- ${c}`);
    }
  }

  if (data.moduleHeatmap.length > 0) {
    lines.push("", "## Module Heatmap", "");
    lines.push("| Module | Rating | Criticality |");
    lines.push("|--------|--------|-------------|");
    for (const m of data.moduleHeatmap) {
      lines.push(`| ${m.module} | ${m.rating} | ${m.criticality} |`);
    }
  }

  if (data.nextTierRequirements.length > 0) {
    lines.push("", "## Next Tier Requirements", "");
    for (const r of data.nextTierRequirements) {
      lines.push(`- ${r}`);
    }
  }

  return lines.join("\n");
}
