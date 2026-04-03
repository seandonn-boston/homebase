/**
 * Admiral Framework — Rating Dashboard (RT-09)
 *
 * Generate dashboard data: rating badge, per-dimension scores, history trend,
 * module heatmap, gate status, next-tier requirements.
 * getDashboardData(calculator, history) returns structured dashboard view.
 *
 * Zero external dependencies.
 */

import { generateBadge } from "./badges";
import { RATING_DIMENSIONS, RATING_TIERS, type DimensionId, type ModuleRating, type RatingReport, type RatingTierCode } from "./types";
import type { RatingHistory, TrendResult } from "./history";
import type { Recommendation } from "./recommendations";

// ---------------------------------------------------------------------------
// Dashboard data types
// ---------------------------------------------------------------------------

export interface DimensionCard {
  dimensionId: DimensionId;
  name: string;
  score: number;
  weight: number;
  weightedContribution: number;
  /** "excellent" (>=80) | "good" (>=60) | "warning" (>=40) | "critical" (<40) */
  status: "excellent" | "good" | "warning" | "critical";
  capTriggered: boolean;
  evidence: string;
  trend?: TrendResult;
}

export interface ModuleHeatmapCell {
  module: string;
  moduleName: string;
  classification: "critical" | "standard" | "support";
  tier: RatingTierCode;
  overallScore: number;
  /** Heat value 0-1 (0=cold/bad, 1=hot/good) */
  heat: number;
  capsProject: boolean;
}

export interface GateStatus {
  gateId: string;
  name: string;
  description: string;
  /** "required" | "optional" */
  requirement: "required" | "optional";
  /** "passed" | "pending" | "failed" | "not_applicable" */
  status: "passed" | "pending" | "failed" | "not_applicable";
}

export interface NextTierRequirement {
  targetTier: RatingTierCode;
  targetTierName: string;
  currentScore: number;
  targetScore: number;
  scoreGap: number;
  /** Top recommendations to close the gap */
  topActions: string[];
  /** Estimated effort: "S" | "M" | "L" */
  overallEffort: "S" | "M" | "L";
}

export interface HistorySummary {
  totalEntries: number;
  oldestEntry?: string;
  latestEntry?: string;
  trend30d?: TrendResult;
  trend7d?: TrendResult;
}

export interface DashboardData {
  /** ISO 8601 timestamp when dashboard was generated */
  generatedAt: string;
  /** The entity being rated */
  entity: string;
  /** Current rating label (e.g., "ADM-3-SA") */
  ratingLabel: string;
  /** Current tier */
  tier: RatingTierCode;
  /** Tier name */
  tierName: string;
  /** Overall score */
  overallScore: number;
  /** SVG badge HTML */
  badgeSvg: string;
  /** Number of active hard caps */
  activeCapsCount: number;
  /** Per-dimension cards */
  dimensions: DimensionCard[];
  /** Module heatmap data */
  moduleHeatmap: ModuleHeatmapCell[];
  /** Human Judgment Gate statuses */
  gates: GateStatus[];
  /** Next-tier requirements */
  nextTier: NextTierRequirement | null;
  /** History summary */
  history: HistorySummary;
  /** Expiration date */
  validUntil: string;
  /** Top 5 recommendations */
  topRecommendations: Recommendation[];
  /** Snapshot of the full report */
  reportId: string;
}

// ---------------------------------------------------------------------------
// Dashboard generator
// ---------------------------------------------------------------------------

export interface DashboardOptions {
  /** Number of history entries to use for trend calculation (default: 10) */
  trendWindow?: number;
  /** Recommendations to surface in dashboard (pre-computed) */
  recommendations?: Recommendation[];
}

export function getDashboardData(
  report: RatingReport,
  history: RatingHistory,
  options: DashboardOptions = {},
): DashboardData {
  const trendWindow = options.trendWindow ?? 10;
  const recommendations = options.recommendations ?? [];

  const dimensions = buildDimensionCards(report, history, trendWindow);
  const moduleHeatmap = buildModuleHeatmap(report.moduleRatings);
  const gates = buildGateStatuses(report);
  const nextTier = buildNextTierRequirement(report, recommendations);
  const historySummary = buildHistorySummary(history, trendWindow);

  const tierData = RATING_TIERS[report.tier];
  const badgeSvg = generateBadge(report.tier, report.certificationSuffix);

  return {
    generatedAt: new Date().toISOString(),
    entity: report.entity,
    ratingLabel: report.ratingLabel,
    tier: report.tier,
    tierName: tierData.name,
    overallScore: report.overallScore,
    badgeSvg,
    activeCapsCount: report.activeCaps.length,
    dimensions,
    moduleHeatmap,
    gates,
    nextTier,
    history: historySummary,
    validUntil: report.validUntil,
    topRecommendations: recommendations.slice(0, 5),
    reportId: report.id,
  };
}

// ---------------------------------------------------------------------------
// Dimension cards
// ---------------------------------------------------------------------------

function buildDimensionCards(
  report: RatingReport,
  history: RatingHistory,
  trendWindow: number,
): DimensionCard[] {
  return report.dimensionScores.map((ds) => {
    const dim = RATING_DIMENSIONS[ds.dimensionId];

    let status: DimensionCard["status"];
    if (ds.score >= 80) status = "excellent";
    else if (ds.score >= 60) status = "good";
    else if (ds.score >= 40) status = "warning";
    else status = "critical";

    let trend: TrendResult | undefined;
    if (history.size >= 2) {
      trend = history.getTrend(ds.dimensionId, trendWindow);
    }

    return {
      dimensionId: ds.dimensionId,
      name: dim.name,
      score: ds.score,
      weight: dim.weight,
      weightedContribution: ds.weightedContribution,
      status,
      capTriggered: ds.capTriggered,
      evidence: ds.evidence,
      trend,
    };
  });
}

// ---------------------------------------------------------------------------
// Module heatmap
// ---------------------------------------------------------------------------

function buildModuleHeatmap(moduleRatings: ModuleRating[]): ModuleHeatmapCell[] {
  return moduleRatings.map((mod) => {
    const heat = mod.overallScore / 100;
    const moduleName = mod.module.split("/").pop() ?? mod.module;

    return {
      module: mod.module,
      moduleName,
      classification: mod.classification,
      tier: mod.tier,
      overallScore: mod.overallScore,
      heat: Math.round(heat * 100) / 100,
      capsProject: mod.capsProjectRating,
    };
  });
}

// ---------------------------------------------------------------------------
// Gate statuses
// ---------------------------------------------------------------------------

const GATE_CATALOG: Array<{
  gateId: string;
  name: string;
  description: string;
  requirement: "required" | "optional";
  requiredForTier: RatingTierCode;
}> = [
  {
    gateId: "HJG-A1",
    name: "Output Trustworthiness",
    description: "Review sample of agent outputs for hallucination and strategic alignment.",
    requirement: "required",
    requiredForTier: "ADM-3",
  },
  {
    gateId: "HJG-A2",
    name: "Boundary Adequacy",
    description: "Assess whether declared boundaries are appropriate for the deployment context.",
    requirement: "required",
    requiredForTier: "ADM-3",
  },
  {
    gateId: "HJG-A3",
    name: "Novel Situation Response",
    description: "Evaluate agent responses to scenarios not covered by instructions.",
    requirement: "required",
    requiredForTier: "ADM-2",
  },
  {
    gateId: "HJG-F1",
    name: "Strategic Alignment",
    description: "Does the fleet output serve the organization's actual goals?",
    requirement: "required",
    requiredForTier: "ADM-2",
  },
  {
    gateId: "HJG-F2",
    name: "Failure Mode Completeness",
    description: "Are the documented failure modes the real risks for this deployment?",
    requirement: "required",
    requiredForTier: "ADM-2",
  },
  {
    gateId: "HJG-F3",
    name: "Governance Architecture Fitness",
    description: "Is the enforcement spectrum correctly calibrated?",
    requirement: "required",
    requiredForTier: "ADM-2",
  },
  {
    gateId: "HJG-F4",
    name: "Trust Calibration Review",
    description: "Are the current autonomy levels appropriate given the fleet's track record?",
    requirement: "required",
    requiredForTier: "ADM-2",
  },
];

function buildGateStatuses(report: RatingReport): GateStatus[] {
  const tierRank: Record<RatingTierCode, number> = {
    "ADM-1": 5, "ADM-2": 4, "ADM-3": 3, "ADM-4": 2, "ADM-5": 1,
  };
  const currentRank = tierRank[report.tier];

  return GATE_CATALOG.map((g) => {
    const requiredRank = tierRank[g.requiredForTier];

    let status: GateStatus["status"];
    if (currentRank >= requiredRank + 1) {
      // Project tier exceeds the gate requirement — gate likely passed
      status = "passed";
    } else if (currentRank === requiredRank) {
      // At the gate threshold — pending
      status = "pending";
    } else if (currentRank < requiredRank - 1) {
      // Too far below to need this gate yet
      status = "not_applicable";
    } else {
      status = "pending";
    }

    return {
      gateId: g.gateId,
      name: g.name,
      description: g.description,
      requirement: g.requirement,
      status,
    };
  });
}

// ---------------------------------------------------------------------------
// Next-tier requirements
// ---------------------------------------------------------------------------

const NEXT_TIER: Record<RatingTierCode, RatingTierCode | null> = {
  "ADM-5": "ADM-4",
  "ADM-4": "ADM-3",
  "ADM-3": "ADM-2",
  "ADM-2": "ADM-1",
  "ADM-1": null,
};

function buildNextTierRequirement(
  report: RatingReport,
  recommendations: Recommendation[],
): NextTierRequirement | null {
  const next = NEXT_TIER[report.tier];
  if (!next) return null;

  const nextTierData = RATING_TIERS[next];
  const targetScore = nextTierData.minScore;
  const scoreGap = Math.max(0, targetScore - report.overallScore);

  const topActions = recommendations
    .filter((r) => r.priority <= 1)
    .slice(0, 5)
    .map((r) => r.title);

  // Estimate effort based on gap size
  let overallEffort: "S" | "M" | "L";
  if (scoreGap <= 5) overallEffort = "S";
  else if (scoreGap <= 20) overallEffort = "M";
  else overallEffort = "L";

  return {
    targetTier: next,
    targetTierName: nextTierData.name,
    currentScore: report.overallScore,
    targetScore,
    scoreGap,
    topActions,
    overallEffort,
  };
}

// ---------------------------------------------------------------------------
// History summary
// ---------------------------------------------------------------------------

function buildHistorySummary(
  history: RatingHistory,
  trendWindow: number,
): HistorySummary {
  const all = history.getHistory();

  if (all.length === 0) {
    return { totalEntries: 0 };
  }

  const summary: HistorySummary = {
    totalEntries: all.length,
    oldestEntry: all[0].timestamp,
    latestEntry: all[all.length - 1].timestamp,
  };

  if (all.length >= 2) {
    summary.trend30d = history.getTrend("overall", Math.min(trendWindow, all.length));
    if (all.length >= 7) {
      summary.trend7d = history.getTrend("overall", Math.min(7, all.length));
    }
  }

  return summary;
}
