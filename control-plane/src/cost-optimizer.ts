/**
 * Admiral Framework — Cost Optimization Engine (IF-06)
 *
 * Recommends optimal model tier for tasks using 3 strategies:
 * minimize cost, maximize quality, balanced. Logs suggestions
 * and tracks outcomes for continuous improvement.
 */

export type OptimizationStrategy = "minimize-cost" | "maximize-quality" | "balanced";

export interface ModelTier {
  id: string;
  name: string;
  costPer1kTokens: number;
  qualityRating: number; // 0-1
  maxContext: number;
  latencyMs: number;
}

export interface TaskProfile {
  taskId: string;
  complexity: "low" | "medium" | "high";
  estimatedTokens: number;
  requiresLargeContext: boolean;
  qualityThreshold: number; // minimum acceptable quality 0-1
}

export interface Recommendation {
  taskId: string;
  strategy: OptimizationStrategy;
  recommendedTier: string;
  estimatedCost: number;
  expectedQuality: number;
  reasoning: string;
  timestamp: string;
}

export interface Outcome {
  taskId: string;
  tierId: string;
  actualTokens: number;
  actualCost: number;
  actualQuality: number;
  matchedRecommendation: boolean;
  timestamp: string;
}

const MAX_LOG_ENTRIES = 5000;

/**
 * Recommends model tiers and tracks cost/quality outcomes.
 */
export class CostOptimizer {
  private tiers: ModelTier[] = [];
  private recommendations: Recommendation[] = [];
  private outcomes: Outcome[] = [];

  constructor(tiers?: ModelTier[]) {
    this.tiers = tiers ?? DEFAULT_TIERS;
  }

  /**
   * Register or update a model tier.
   */
  registerTier(tier: ModelTier): void {
    const idx = this.tiers.findIndex((t) => t.id === tier.id);
    if (idx >= 0) {
      this.tiers[idx] = tier;
    } else {
      this.tiers.push(tier);
    }
  }

  /**
   * Recommend a model tier for a task.
   */
  recommend(task: TaskProfile, strategy: OptimizationStrategy): Recommendation {
    const eligible = this.tiers.filter((t) => {
      if (task.requiresLargeContext && t.maxContext < task.estimatedTokens) return false;
      if (t.qualityRating < task.qualityThreshold) return false;
      return true;
    });

    if (eligible.length === 0) {
      // Fallback to the highest-quality tier
      const best = [...this.tiers].sort((a, b) => b.qualityRating - a.qualityRating)[0];
      return this.buildRecommendation(
        task,
        strategy,
        best,
        "No tier meets constraints; using highest quality",
      );
    }

    let selected: ModelTier;
    let reasoning: string;

    switch (strategy) {
      case "minimize-cost": {
        selected = eligible.sort((a, b) => a.costPer1kTokens - b.costPer1kTokens)[0];
        reasoning = "Lowest cost tier that meets quality threshold";
        break;
      }
      case "maximize-quality": {
        selected = eligible.sort((a, b) => b.qualityRating - a.qualityRating)[0];
        reasoning = "Highest quality tier within eligible set";
        break;
      }
      case "balanced": {
        // Score = quality / cost (value per dollar)
        selected = eligible.sort((a, b) => {
          const valueA = a.qualityRating / (a.costPer1kTokens || 0.001);
          const valueB = b.qualityRating / (b.costPer1kTokens || 0.001);
          return valueB - valueA;
        })[0];
        reasoning = "Best quality-to-cost ratio";
        break;
      }
    }

    return this.buildRecommendation(task, strategy, selected, reasoning);
  }

  private buildRecommendation(
    task: TaskProfile,
    strategy: OptimizationStrategy,
    tier: ModelTier,
    reasoning: string,
  ): Recommendation {
    const rec: Recommendation = {
      taskId: task.taskId,
      strategy,
      recommendedTier: tier.id,
      estimatedCost: (task.estimatedTokens / 1000) * tier.costPer1kTokens,
      expectedQuality: tier.qualityRating,
      reasoning,
      timestamp: new Date().toISOString(),
    };
    this.recommendations.push(rec);
    if (this.recommendations.length > MAX_LOG_ENTRIES) {
      this.recommendations = this.recommendations.slice(-MAX_LOG_ENTRIES);
    }
    return rec;
  }

  /**
   * Record the actual outcome of a task execution.
   */
  recordOutcome(
    taskId: string,
    tierId: string,
    actualTokens: number,
    actualQuality: number,
  ): Outcome {
    const tier = this.tiers.find((t) => t.id === tierId);
    const cost = tier ? (actualTokens / 1000) * tier.costPer1kTokens : 0;
    const rec = this.recommendations.find((r) => r.taskId === taskId);

    const outcome: Outcome = {
      taskId,
      tierId,
      actualTokens,
      actualCost: Number(cost.toFixed(4)),
      actualQuality,
      matchedRecommendation: rec?.recommendedTier === tierId,
      timestamp: new Date().toISOString(),
    };

    this.outcomes.push(outcome);
    if (this.outcomes.length > MAX_LOG_ENTRIES) {
      this.outcomes = this.outcomes.slice(-MAX_LOG_ENTRIES);
    }
    return outcome;
  }

  /**
   * Calculate savings: actual cost vs. what the highest-quality tier would have cost.
   */
  calculateSavings(): { totalActual: number; totalBaseline: number; saved: number; pct: number } {
    const maxTier = [...this.tiers].sort((a, b) => b.costPer1kTokens - a.costPer1kTokens)[0];
    if (!maxTier || this.outcomes.length === 0) {
      return { totalActual: 0, totalBaseline: 0, saved: 0, pct: 0 };
    }

    const totalActual = this.outcomes.reduce((s, o) => s + o.actualCost, 0);
    const totalBaseline = this.outcomes.reduce(
      (s, o) => s + (o.actualTokens / 1000) * maxTier.costPer1kTokens,
      0,
    );
    const saved = totalBaseline - totalActual;
    const pct = totalBaseline > 0 ? Number(((saved / totalBaseline) * 100).toFixed(1)) : 0;

    return {
      totalActual: Number(totalActual.toFixed(4)),
      totalBaseline: Number(totalBaseline.toFixed(4)),
      saved: Number(saved.toFixed(4)),
      pct,
    };
  }

  /**
   * Recommendation accuracy: how often the actual tier matched our suggestion.
   */
  accuracy(): number {
    if (this.outcomes.length === 0) return 0;
    const matched = this.outcomes.filter((o) => o.matchedRecommendation).length;
    return Number((matched / this.outcomes.length).toFixed(3));
  }

  getRecommendations(): Recommendation[] {
    return [...this.recommendations];
  }

  getOutcomes(): Outcome[] {
    return [...this.outcomes];
  }
}

const DEFAULT_TIERS: ModelTier[] = [
  {
    id: "fast",
    name: "Fast / Low Cost",
    costPer1kTokens: 0.25,
    qualityRating: 0.7,
    maxContext: 32_000,
    latencyMs: 200,
  },
  {
    id: "balanced",
    name: "Balanced",
    costPer1kTokens: 1.0,
    qualityRating: 0.85,
    maxContext: 128_000,
    latencyMs: 500,
  },
  {
    id: "premium",
    name: "Premium / High Quality",
    costPer1kTokens: 5.0,
    qualityRating: 0.97,
    maxContext: 200_000,
    latencyMs: 1500,
  },
];
