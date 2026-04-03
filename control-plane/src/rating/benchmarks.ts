/**
 * Admiral Framework — Rating Benchmarks (RT-08)
 *
 * Compare project rating against benchmarks.
 * Benchmarks: pristine repos (from research), industry average, spec target.
 * compareToBenchmark(report, benchmark) returns gap analysis.
 *
 * Zero external dependencies.
 */

import { RATING_DIMENSIONS, compareTiers, type DimensionId, type RatingReport, type RatingTierCode } from "./types";

// ---------------------------------------------------------------------------
// Benchmark types
// ---------------------------------------------------------------------------

export type BenchmarkId =
  | "pristine"
  | "industry_average"
  | "spec_target"
  | "adm1_floor"
  | "adm2_floor"
  | "adm3_floor"
  | "adm4_floor";

export interface Benchmark {
  id: BenchmarkId;
  name: string;
  description: string;
  /** Expected tier for a system at this benchmark */
  tier: RatingTierCode;
  /** Expected overall score */
  overallScore: number;
  /** Expected per-dimension scores */
  dimensionScores: Record<DimensionId, number>;
}

// ---------------------------------------------------------------------------
// Benchmark catalog
// ---------------------------------------------------------------------------

export const BENCHMARKS: Record<BenchmarkId, Benchmark> = {
  pristine: {
    id: "pristine",
    name: "Pristine Repository",
    description:
      "A repository with full Admiral governance, all hooks deployed, complete standing orders, " +
      "active brain utilization, and verified security posture. ADM-1 equivalent.",
    tier: "ADM-1",
    overallScore: 97,
    dimensionScores: {
      enforcement_coverage: 98,
      hook_quality: 96,
      standing_orders_compliance: 98,
      brain_utilization: 95,
      fleet_governance: 97,
      security_posture: 96,
      observability_maturity: 98,
    },
  },
  industry_average: {
    id: "industry_average",
    name: "Industry Average",
    description:
      "Typical AI-assisted development project with basic governance. " +
      "Some hooks deployed, partial standing orders, minimal brain utilization.",
    tier: "ADM-4",
    overallScore: 38,
    dimensionScores: {
      enforcement_coverage: 35,
      hook_quality: 30,
      standing_orders_compliance: 40,
      brain_utilization: 20,
      fleet_governance: 45,
      security_posture: 42,
      observability_maturity: 38,
    },
  },
  spec_target: {
    id: "spec_target",
    name: "Admiral Spec Target",
    description:
      "The target profile defined in the Admiral spec for a governed deployment. " +
      "ADM-2 with all Human Judgment Gates passed and full enforcement spectrum.",
    tier: "ADM-2",
    overallScore: 85,
    dimensionScores: {
      enforcement_coverage: 85,
      hook_quality: 82,
      standing_orders_compliance: 88,
      brain_utilization: 80,
      fleet_governance: 84,
      security_posture: 83,
      observability_maturity: 85,
    },
  },
  adm1_floor: {
    id: "adm1_floor",
    name: "ADM-1 Minimum",
    description: "Minimum scores to qualify for ADM-1 Premier rating.",
    tier: "ADM-1",
    overallScore: 95,
    dimensionScores: {
      enforcement_coverage: 95,
      hook_quality: 92,
      standing_orders_compliance: 95,
      brain_utilization: 90,
      fleet_governance: 93,
      security_posture: 92,
      observability_maturity: 94,
    },
  },
  adm2_floor: {
    id: "adm2_floor",
    name: "ADM-2 Minimum",
    description: "Minimum scores to qualify for ADM-2 Governed rating.",
    tier: "ADM-2",
    overallScore: 80,
    dimensionScores: {
      enforcement_coverage: 80,
      hook_quality: 78,
      standing_orders_compliance: 82,
      brain_utilization: 75,
      fleet_governance: 79,
      security_posture: 78,
      observability_maturity: 80,
    },
  },
  adm3_floor: {
    id: "adm3_floor",
    name: "ADM-3 Minimum",
    description: "Minimum scores to qualify for ADM-3 Developing rating.",
    tier: "ADM-3",
    overallScore: 60,
    dimensionScores: {
      enforcement_coverage: 60,
      hook_quality: 58,
      standing_orders_compliance: 62,
      brain_utilization: 55,
      fleet_governance: 59,
      security_posture: 58,
      observability_maturity: 60,
    },
  },
  adm4_floor: {
    id: "adm4_floor",
    name: "ADM-4 Minimum",
    description: "Minimum scores to qualify for ADM-4 Minimal rating.",
    tier: "ADM-4",
    overallScore: 30,
    dimensionScores: {
      enforcement_coverage: 30,
      hook_quality: 28,
      standing_orders_compliance: 30,
      brain_utilization: 25,
      fleet_governance: 30,
      security_posture: 28,
      observability_maturity: 30,
    },
  },
};

// ---------------------------------------------------------------------------
// Gap analysis types
// ---------------------------------------------------------------------------

export interface DimensionGap {
  dimensionId: DimensionId;
  dimensionName: string;
  currentScore: number;
  benchmarkScore: number;
  gap: number;
  /** "ahead" | "meeting" | "behind" */
  status: "ahead" | "meeting" | "behind";
  /** Weighted contribution of this gap to overall gap */
  weightedGap: number;
}

export interface BenchmarkComparison {
  reportId: string;
  benchmarkId: BenchmarkId;
  benchmarkName: string;
  /** The project's current tier */
  currentTier: RatingTierCode;
  /** The benchmark's expected tier */
  benchmarkTier: RatingTierCode;
  /** Tier comparison: "ahead" | "meeting" | "behind" */
  tierStatus: "ahead" | "meeting" | "behind";
  /** Overall score gap (positive = ahead of benchmark, negative = behind) */
  overallGap: number;
  /** Per-dimension gap analysis */
  dimensionGaps: DimensionGap[];
  /** Dimensions where the project is ahead of the benchmark */
  strengths: DimensionId[];
  /** Dimensions where the project is behind the benchmark */
  weaknesses: DimensionId[];
  /** Suggested actions to close the gap, in priority order */
  closingActions: string[];
  /** Estimated overall score needed to match this benchmark */
  targetScore: number;
}

// ---------------------------------------------------------------------------
// Benchmark comparator
// ---------------------------------------------------------------------------

export class BenchmarkComparator {
  /**
   * Compare a rating report against a known benchmark.
   * Returns a gap analysis with strengths, weaknesses, and closing actions.
   */
  compareToBenchmark(
    report: RatingReport,
    benchmark: Benchmark,
  ): BenchmarkComparison {
    const overallGap = report.overallScore - benchmark.overallScore;

    const dimensionGaps: DimensionGap[] = [];
    const strengths: DimensionId[] = [];
    const weaknesses: DimensionId[] = [];

    for (const dimId of Object.keys(benchmark.dimensionScores) as DimensionId[]) {
      const dim = RATING_DIMENSIONS[dimId];
      const currentScore =
        report.dimensionScores.find((d) => d.dimensionId === dimId)?.score ?? 0;
      const benchmarkScore = benchmark.dimensionScores[dimId];
      const gap = currentScore - benchmarkScore;
      const weightedGap = (gap * dim.weight) / 100;

      let status: "ahead" | "meeting" | "behind";
      if (gap > 2) status = "ahead";
      else if (gap >= -2) status = "meeting";
      else status = "behind";

      dimensionGaps.push({
        dimensionId: dimId,
        dimensionName: dim.name,
        currentScore,
        benchmarkScore,
        gap,
        status,
        weightedGap: Math.round(weightedGap * 10) / 10,
      });

      if (status === "ahead") strengths.push(dimId);
      if (status === "behind") weaknesses.push(dimId);
    }

    // Sort weaknesses by gap size (worst first)
    const sortedWeaknesses = [...weaknesses].sort((a, b) => {
      const gapA = dimensionGaps.find((d) => d.dimensionId === a)?.gap ?? 0;
      const gapB = dimensionGaps.find((d) => d.dimensionId === b)?.gap ?? 0;
      return gapA - gapB;
    });

    const tierStatus = compareTierStatus(report.tier, benchmark.tier);
    const closingActions = this.buildClosingActions(
      dimensionGaps,
      sortedWeaknesses,
      overallGap,
      benchmark,
    );

    return {
      reportId: report.id,
      benchmarkId: benchmark.id,
      benchmarkName: benchmark.name,
      currentTier: report.tier,
      benchmarkTier: benchmark.tier,
      tierStatus,
      overallGap: Math.round(overallGap * 10) / 10,
      dimensionGaps,
      strengths,
      weaknesses: sortedWeaknesses,
      closingActions,
      targetScore: benchmark.overallScore,
    };
  }

  /**
   * Compare against all built-in benchmarks and return full picture.
   */
  compareToAll(report: RatingReport): Record<BenchmarkId, BenchmarkComparison> {
    const results = {} as Record<BenchmarkId, BenchmarkComparison>;
    for (const [id, benchmark] of Object.entries(BENCHMARKS) as [BenchmarkId, Benchmark][]) {
      results[id] = this.compareToBenchmark(report, benchmark);
    }
    return results;
  }

  /**
   * Find the most relevant benchmark for the current rating.
   * Returns the next-tier benchmark if below ADM-1, or pristine if at ADM-1.
   */
  getRelevantBenchmark(report: RatingReport): Benchmark {
    const tierToBenchmark: Record<RatingTierCode, BenchmarkId> = {
      "ADM-5": "adm4_floor",
      "ADM-4": "adm3_floor",
      "ADM-3": "adm2_floor",
      "ADM-2": "adm1_floor",
      "ADM-1": "pristine",
    };
    return BENCHMARKS[tierToBenchmark[report.tier]];
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private buildClosingActions(
    gaps: DimensionGap[],
    weaknesses: DimensionId[],
    overallGap: number,
    benchmark: Benchmark,
  ): string[] {
    const actions: string[] = [];

    if (overallGap >= 0) {
      actions.push(
        `Project meets or exceeds ${benchmark.name} overall score (gap: +${overallGap.toFixed(1)}).`,
      );
    } else {
      actions.push(
        `Close overall gap of ${Math.abs(overallGap).toFixed(1)} points to reach ${benchmark.name}.`,
      );
    }

    for (const dimId of weaknesses.slice(0, 5)) {
      const gap = gaps.find((g) => g.dimensionId === dimId);
      if (!gap) continue;
      const dim = RATING_DIMENSIONS[dimId];
      actions.push(
        `Improve ${dim.name} by ${Math.abs(gap.gap).toFixed(0)} points ` +
          `(current: ${gap.currentScore}, target: ${gap.benchmarkScore}).`,
      );
    }

    return actions;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compareTierStatus(
  current: RatingTierCode,
  target: RatingTierCode,
): "ahead" | "meeting" | "behind" {
  const diff = compareTiers(current, target);
  if (diff > 0) return "ahead";
  if (diff === 0) return "meeting";
  return "behind";
}
