/**
 * Rating Comparison Benchmarks (RT-08)
 *
 * Contextualizes Admiral rating against external standards:
 * pristine repo benchmarks, industry averages, and spec targets.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type { RatingTier } from "./rating-model";
import { TIER_DEFINITIONS, CORE_BENCHMARKS, compareTiers } from "./rating-model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BenchmarkProfile {
  name: string;
  description: string;
  estimatedRating: RatingTier;
  metrics: Record<string, number | null>;
  methodology: string;
}

export interface ComparisonResult {
  currentRating: RatingTier;
  benchmarks: BenchmarkProfile[];
  position: string;
  gapsToLeader: string[];
}

// ---------------------------------------------------------------------------
// Pristine Repo Benchmarks
// ---------------------------------------------------------------------------

export const PRISTINE_REPO_BENCHMARKS: readonly BenchmarkProfile[] = [
  {
    name: "SQLite",
    description: "Exemplary C codebase with 100% branch coverage, aviation-grade testing",
    estimatedRating: "ADM-1",
    metrics: {
      "first-pass-quality": 95,
      "recovery-success-rate": 99,
      "enforcement-coverage": 95,
      "context-efficiency": null,
      "governance-overhead": 5,
      "coordination-overhead": null,
      "knowledge-reuse": null,
    },
    methodology: "Estimated from public documentation of testing practices, code review policies, and release process rigor",
  },
  {
    name: "TigerBeetle",
    description: "Deterministic database with simulation testing and formal verification",
    estimatedRating: "ADM-1",
    metrics: {
      "first-pass-quality": 92,
      "recovery-success-rate": 98,
      "enforcement-coverage": 90,
      "context-efficiency": null,
      "governance-overhead": 8,
      "coordination-overhead": null,
      "knowledge-reuse": null,
    },
    methodology: "Estimated from public talks, blog posts, and repository analysis of testing infrastructure",
  },
  {
    name: "Go Standard Library",
    description: "Highly reviewed, backward-compatible standard library with comprehensive tests",
    estimatedRating: "ADM-2",
    metrics: {
      "first-pass-quality": 88,
      "recovery-success-rate": 90,
      "enforcement-coverage": 80,
      "context-efficiency": null,
      "governance-overhead": 10,
      "coordination-overhead": null,
      "knowledge-reuse": null,
    },
    methodology: "Estimated from Go project review process documentation and test coverage reports",
  },
];

// ---------------------------------------------------------------------------
// Industry Average Benchmarks
// ---------------------------------------------------------------------------

export const INDUSTRY_AVERAGES: readonly BenchmarkProfile[] = [
  {
    name: "Open Source Governance Frameworks",
    description: "Average of comparable governance/policy frameworks on GitHub",
    estimatedRating: "ADM-4",
    metrics: {
      "first-pass-quality": 50,
      "recovery-success-rate": 55,
      "enforcement-coverage": 30,
      "context-efficiency": 0.1,
      "governance-overhead": 20,
      "coordination-overhead": 15,
      "knowledge-reuse": 10,
    },
    methodology: "Estimated from survey of 10+ governance framework repositories (OPA, Sentinel, Cedar) by code quality indicators",
  },
  {
    name: "AI Agent Platforms (average)",
    description: "Average of agent orchestration platforms (LangChain, CrewAI, AutoGen)",
    estimatedRating: "ADM-4",
    metrics: {
      "first-pass-quality": 55,
      "recovery-success-rate": 50,
      "enforcement-coverage": 20,
      "context-efficiency": 0.15,
      "governance-overhead": 15,
      "coordination-overhead": 20,
      "knowledge-reuse": 15,
    },
    methodology: "Estimated from repository analysis of testing, error handling, and governance patterns",
  },
  {
    name: "Enterprise CLI Tools (average)",
    description: "Average of well-maintained enterprise CLI tools",
    estimatedRating: "ADM-3",
    metrics: {
      "first-pass-quality": 70,
      "recovery-success-rate": 75,
      "enforcement-coverage": 50,
      "context-efficiency": null,
      "governance-overhead": 10,
      "coordination-overhead": null,
      "knowledge-reuse": null,
    },
    methodology: "Estimated from survey of enterprise CLI tools (aws-cli, gcloud, terraform) by test coverage and release process",
  },
];

// ---------------------------------------------------------------------------
// Spec-Defined Targets
// ---------------------------------------------------------------------------

export const SPEC_TARGETS: readonly BenchmarkProfile[] = [
  {
    name: "Admiral Spec — Full Adoption",
    description: "The spec's stated target for a fully-governed deployment",
    estimatedRating: "ADM-1",
    metrics: {
      "first-pass-quality": 90,
      "recovery-success-rate": 95,
      "enforcement-coverage": 100,
      "context-efficiency": 0.3,
      "governance-overhead": 10,
      "coordination-overhead": 10,
      "knowledge-reuse": 50,
    },
    methodology: "Directly from Admiral spec ADM-1 tier thresholds",
  },
  {
    name: "Admiral Spec — Operational Minimum",
    description: "The spec's stated minimum for operational deployment",
    estimatedRating: "ADM-3",
    metrics: {
      "first-pass-quality": 60,
      "recovery-success-rate": 70,
      "enforcement-coverage": 60,
      "context-efficiency": 0.15,
      "governance-overhead": 20,
      "coordination-overhead": 18,
      "knowledge-reuse": 25,
    },
    methodology: "Directly from Admiral spec ADM-3 tier thresholds",
  },
];

// ---------------------------------------------------------------------------
// Comparison Logic
// ---------------------------------------------------------------------------

export function compareAgainstBenchmarks(
  currentRating: RatingTier,
  currentMetrics: Record<string, number | null>,
): ComparisonResult {
  const allBenchmarks = [...PRISTINE_REPO_BENCHMARKS, ...INDUSTRY_AVERAGES, ...SPEC_TARGETS];

  // Determine position relative to benchmarks
  const betterThan = allBenchmarks.filter(
    (b) => compareTiers(currentRating, b.estimatedRating) < 0,
  );
  const sameTier = allBenchmarks.filter(
    (b) => compareTiers(currentRating, b.estimatedRating) === 0,
  );
  const worseThan = allBenchmarks.filter(
    (b) => compareTiers(currentRating, b.estimatedRating) > 0,
  );

  const tierDef = TIER_DEFINITIONS.get(currentRating);
  let position: string;
  if (betterThan.length === allBenchmarks.length) {
    position = "Above all benchmarks — leading the field.";
  } else if (worseThan.length === allBenchmarks.length) {
    position = "Below all benchmarks — significant improvement needed.";
  } else {
    position =
      `Better than ${betterThan.length} benchmark(s), ` +
      `equal to ${sameTier.length}, ` +
      `below ${worseThan.length}. ` +
      `Current tier: ${currentRating} (${tierDef?.grade ?? ""}).`;
  }

  // Calculate gaps to best benchmark
  const gapsToLeader: string[] = [];
  const leader = allBenchmarks.find((b) => b.estimatedRating === "ADM-1") ?? allBenchmarks[0];
  if (leader) {
    for (const def of CORE_BENCHMARKS) {
      const current = currentMetrics[def.id] ?? null;
      const target = leader.metrics[def.id] ?? null;
      if (current !== null && target !== null) {
        const gap = def.higherIsBetter ? target - current : current - target;
        if (gap > 0) {
          gapsToLeader.push(
            `${def.name}: current=${current}, ${leader.name} target=${target} (gap: ${gap.toFixed(1)})`,
          );
        }
      }
    }
  }

  return {
    currentRating,
    benchmarks: allBenchmarks,
    position,
    gapsToLeader,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatBenchmarkComparison(result: ComparisonResult): string {
  const lines: string[] = [
    "# Rating Benchmark Comparison",
    "",
    `**Current Rating:** ${result.currentRating}`,
    `**Position:** ${result.position}`,
    "",
    "## Benchmark Profiles",
    "",
    "| Benchmark | Rating | Source |",
    "|-----------|--------|--------|",
  ];

  for (const b of result.benchmarks) {
    lines.push(`| ${b.name} | ${b.estimatedRating} | ${b.methodology.slice(0, 60)}... |`);
  }

  if (result.gapsToLeader.length > 0) {
    lines.push("", "## Gaps to Leader", "");
    for (const g of result.gapsToLeader) {
      lines.push(`- ${g}`);
    }
  }

  return lines.join("\n");
}
