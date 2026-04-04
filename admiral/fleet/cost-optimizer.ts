/**
 * Cost Optimization Engine (IF-06)
 *
 * Recommends optimal model tiers per task based on complexity,
 * quality requirements, budget, and historical performance.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelTier = "tier-1" | "tier-2" | "tier-3";
export type OptimizationStrategy = "minimize-cost" | "maximize-quality" | "balanced";

export interface TaskProfile {
  complexity: "low" | "medium" | "high";
  qualityRequirement: number; // 0-100
  budgetCents: number;
  historicalFirstPassRate: number | null;
}

export interface ModelTierConfig {
  tier: ModelTier;
  name: string;
  costPerKToken: number;
  avgFirstPassQuality: number;
  avgLatencyMs: number;
  maxContextTokens: number;
}

export interface CostRecommendation {
  recommendedTier: ModelTier;
  estimatedCost: number;
  estimatedQuality: number;
  reasoning: string;
  alternatives: { tier: ModelTier; cost: number; quality: number }[];
}

// ---------------------------------------------------------------------------
// Model Tier Definitions
// ---------------------------------------------------------------------------

export const MODEL_TIERS: readonly ModelTierConfig[] = [
  {
    tier: "tier-1",
    name: "Premium (Opus-class)",
    costPerKToken: 15,
    avgFirstPassQuality: 92,
    avgLatencyMs: 3000,
    maxContextTokens: 200000,
  },
  {
    tier: "tier-2",
    name: "Standard (Sonnet-class)",
    costPerKToken: 3,
    avgFirstPassQuality: 82,
    avgLatencyMs: 1500,
    maxContextTokens: 200000,
  },
  {
    tier: "tier-3",
    name: "Economy (Haiku-class)",
    costPerKToken: 0.25,
    avgFirstPassQuality: 68,
    avgLatencyMs: 500,
    maxContextTokens: 200000,
  },
];

// ---------------------------------------------------------------------------
// Cost Optimizer
// ---------------------------------------------------------------------------

export class CostOptimizer {
  private tiers: ModelTierConfig[];

  constructor(tiers?: ModelTierConfig[]) {
    this.tiers = tiers ?? [...MODEL_TIERS];
  }

  recommend(task: TaskProfile, strategy: OptimizationStrategy): CostRecommendation {
    const scored = this.tiers.map((tier) => ({
      tier,
      score: this.scoreTier(tier, task, strategy),
      estimatedCost: this.estimateCost(tier, task),
      quality: tier.avgFirstPassQuality,
    }));

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    return {
      recommendedTier: best.tier.tier,
      estimatedCost: best.estimatedCost,
      estimatedQuality: best.quality,
      reasoning: this.buildReasoning(best.tier, task, strategy),
      alternatives: scored.slice(1).map((s) => ({
        tier: s.tier.tier,
        cost: s.estimatedCost,
        quality: s.quality,
      })),
    };
  }

  private scoreTier(
    tier: ModelTierConfig,
    task: TaskProfile,
    strategy: OptimizationStrategy,
  ): number {
    const meetsQuality = tier.avgFirstPassQuality >= task.qualityRequirement;
    const estimatedCost = this.estimateCost(tier, task);
    const withinBudget = estimatedCost <= task.budgetCents;

    if (!withinBudget) return -1000;

    let score = 0;

    switch (strategy) {
      case "minimize-cost":
        score = 100 - (estimatedCost / task.budgetCents) * 100;
        if (meetsQuality) score += 50;
        break;

      case "maximize-quality":
        score = tier.avgFirstPassQuality;
        if (!meetsQuality) score -= 50;
        break;

      case "balanced":
        score = tier.avgFirstPassQuality * 0.6 +
          (1 - estimatedCost / task.budgetCents) * 100 * 0.4;
        if (meetsQuality) score += 20;
        break;
    }

    return Math.round(score * 100) / 100;
  }

  private estimateCost(tier: ModelTierConfig, task: TaskProfile): number {
    const complexityMultiplier =
      task.complexity === "high" ? 3 : task.complexity === "medium" ? 1.5 : 1;
    const estimatedTokens = 5000 * complexityMultiplier;
    return Math.round(tier.costPerKToken * (estimatedTokens / 1000) * 100) / 100;
  }

  private buildReasoning(
    tier: ModelTierConfig,
    task: TaskProfile,
    strategy: OptimizationStrategy,
  ): string {
    return `${tier.name} recommended for ${task.complexity}-complexity task ` +
      `(strategy: ${strategy}). Expected quality: ${tier.avgFirstPassQuality}%, ` +
      `requirement: ${task.qualityRequirement}%.`;
  }
}
