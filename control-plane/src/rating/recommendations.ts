/**
 * Admiral Framework — Improvement Recommendations (RT-06)
 *
 * RecommendationEngine class.
 * Maps dimension gaps to concrete actions with effort estimates (S/M/L).
 * Identifies prerequisites (which improvements enable others).
 * Prioritizes by impact (points gained per effort unit).
 * getRecommendations(report) returns sorted list.
 *
 * Zero external dependencies.
 */

import { RATING_DIMENSIONS, RATING_TIERS, type DimensionId, type RatingReport, type RatingTierCode } from "./types";

// ---------------------------------------------------------------------------
// Recommendation types
// ---------------------------------------------------------------------------

export type EffortLevel = "S" | "M" | "L";

export interface Recommendation {
  /** Unique action identifier */
  id: string;
  /** Title of the recommendation */
  title: string;
  /** Detailed description of what to do */
  description: string;
  /** Which dimension this affects */
  dimension: DimensionId;
  /** Expected score improvement for this dimension (0-100 points) */
  estimatedGain: number;
  /** Effort level: S = days, M = weeks, L = months */
  effort: EffortLevel;
  /** Impact score: estimatedGain / effortUnit */
  impactScore: number;
  /** IDs of other recommendations that should be done first */
  prerequisites: string[];
  /** Whether this recommendation is triggered by a hard cap */
  addressesCap: boolean;
  /** Priority tier: 0=critical, 1=high, 2=medium, 3=low */
  priority: 0 | 1 | 2 | 3;
  /** Current score of the dimension this addresses */
  currentScore: number;
  /** Target score after implementing this recommendation */
  targetScore: number;
}

// ---------------------------------------------------------------------------
// Effort units (for impact/effort ratio calculation)
// ---------------------------------------------------------------------------

const EFFORT_UNITS: Record<EffortLevel, number> = {
  S: 1,
  M: 3,
  L: 9,
};

// ---------------------------------------------------------------------------
// Action catalog
// ---------------------------------------------------------------------------

interface ActionTemplate {
  id: string;
  title: string;
  description: string;
  dimension: DimensionId;
  /** Minimum current score to trigger this recommendation */
  triggerIfBelow: number;
  /** Expected gain in dimension score */
  estimatedGain: number;
  effort: EffortLevel;
  prerequisites: string[];
  addressesCap: boolean;
}

const ACTION_CATALOG: ActionTemplate[] = [
  // -------------------------------------------------------------------------
  // Enforcement Coverage
  // -------------------------------------------------------------------------
  {
    id: "ec-001",
    title: "Deploy PreToolUse hook for safety-critical constraints",
    description:
      "Implement a PreToolUse hook that fires before every tool invocation. " +
      "Map your Standing Orders to enforcement tiers and block prohibited actions deterministically. " +
      "Reference: admiral/standing-orders/ for the constraint inventory.",
    dimension: "enforcement_coverage",
    triggerIfBelow: 50,
    estimatedGain: 30,
    effort: "M",
    prerequisites: [],
    addressesCap: true,
  },
  {
    id: "ec-002",
    title: "Deploy PostToolUse audit hook",
    description:
      "Add a PostToolUse hook that logs all tool invocations with agent identity, " +
      "action taken, and outcome. This creates an audit trail and enables violation detection.",
    dimension: "enforcement_coverage",
    triggerIfBelow: 70,
    estimatedGain: 15,
    effort: "S",
    prerequisites: ["ec-001"],
    addressesCap: false,
  },
  {
    id: "ec-003",
    title: "Deploy SessionStart identity verification hook",
    description:
      "Add a SessionStart hook that validates agent identity tokens, loads the correct " +
      "context profile, and enforces session-scoped credentials before any work begins.",
    dimension: "enforcement_coverage",
    triggerIfBelow: 80,
    estimatedGain: 10,
    effort: "S",
    prerequisites: ["ec-001"],
    addressesCap: false,
  },
  {
    id: "ec-004",
    title: "Map all Standing Orders to hook enforcement points",
    description:
      "Audit all 15 Standing Orders against the hook inventory. Each order should " +
      "have a corresponding enforcement mechanism. Document gaps and remediate.",
    dimension: "enforcement_coverage",
    triggerIfBelow: 90,
    estimatedGain: 10,
    effort: "M",
    prerequisites: ["ec-001", "ec-002"],
    addressesCap: false,
  },

  // -------------------------------------------------------------------------
  // Hook Quality
  // -------------------------------------------------------------------------
  {
    id: "hq-001",
    title: "Add error handling to all hooks",
    description:
      "Ensure all bash hooks use `set -euo pipefail`. Add try/catch or error callbacks " +
      "to TypeScript hooks. Hooks that fail silently are governance theater.",
    dimension: "hook_quality",
    triggerIfBelow: 50,
    estimatedGain: 25,
    effort: "S",
    prerequisites: [],
    addressesCap: false,
  },
  {
    id: "hq-002",
    title: "Add structured logging to hooks",
    description:
      "All hooks should emit structured JSON logs (timestamp, hook_name, action, agent_id, " +
      "result). This enables audit trail analysis and violation detection.",
    dimension: "hook_quality",
    triggerIfBelow: 70,
    estimatedGain: 20,
    effort: "S",
    prerequisites: ["hq-001"],
    addressesCap: false,
  },
  {
    id: "hq-003",
    title: "Implement hook latency monitoring",
    description:
      "Add timing instrumentation to all hooks. Alert if hook latency exceeds 200ms. " +
      "Governance hooks must not become performance bottlenecks.",
    dimension: "hook_quality",
    triggerIfBelow: 80,
    estimatedGain: 10,
    effort: "M",
    prerequisites: ["hq-002"],
    addressesCap: false,
  },

  // -------------------------------------------------------------------------
  // Standing Orders Compliance
  // -------------------------------------------------------------------------
  {
    id: "so-001",
    title: "Deploy all 15 Standing Orders",
    description:
      "Ensure all 15 Admiral Standing Orders are documented in admiral/standing-orders/ " +
      "and referenced in AGENTS.md. Each order must have explicit enforcement status.",
    dimension: "standing_orders_compliance",
    triggerIfBelow: 40,
    estimatedGain: 35,
    effort: "M",
    prerequisites: [],
    addressesCap: false,
  },
  {
    id: "so-002",
    title: "Add Standing Orders compliance check to CI",
    description:
      "Create a CI script that verifies Standing Orders are referenced in active hooks " +
      "and AGENTS.md. Fail the build if any order lacks an enforcement mechanism.",
    dimension: "standing_orders_compliance",
    triggerIfBelow: 70,
    estimatedGain: 20,
    effort: "S",
    prerequisites: ["so-001"],
    addressesCap: false,
  },
  {
    id: "so-003",
    title: "Configure SessionStart hook to load Standing Orders context",
    description:
      "The SessionStart hook should load relevant Standing Orders into the agent's " +
      "active context. This prevents instruction decay and context starvation.",
    dimension: "standing_orders_compliance",
    triggerIfBelow: 85,
    estimatedGain: 10,
    effort: "S",
    prerequisites: ["so-001", "ec-003"],
    addressesCap: false,
  },

  // -------------------------------------------------------------------------
  // Brain Utilization
  // -------------------------------------------------------------------------
  {
    id: "bu-001",
    title: "Initialize the Brain (.brain directory)",
    description:
      "Create a .brain directory and seed it with initial knowledge entries. " +
      "Start capturing: architectural decisions, recurring patterns, known issues, " +
      "and context that agents should reuse across sessions.",
    dimension: "brain_utilization",
    triggerIfBelow: 20,
    estimatedGain: 40,
    effort: "S",
    prerequisites: [],
    addressesCap: true,
  },
  {
    id: "bu-002",
    title: "Implement brain lookup before task start",
    description:
      "Add a pattern where agents query .brain before starting any new task. " +
      "Capture the brain reuse rate as a metric. Target: >50% of tasks reference brain.",
    dimension: "brain_utilization",
    triggerIfBelow: 50,
    estimatedGain: 25,
    effort: "M",
    prerequisites: ["bu-001"],
    addressesCap: false,
  },
  {
    id: "bu-003",
    title: "Add brain entry freshness scoring",
    description:
      "Tag each brain entry with a timestamp and usefulness score. Archive entries " +
      "older than 90 days that haven't been accessed. Maintain a freshness index.",
    dimension: "brain_utilization",
    triggerIfBelow: 75,
    estimatedGain: 15,
    effort: "S",
    prerequisites: ["bu-001", "bu-002"],
    addressesCap: false,
  },

  // -------------------------------------------------------------------------
  // Fleet Governance
  // -------------------------------------------------------------------------
  {
    id: "fg-001",
    title: "Deploy governance-platform core infrastructure",
    description:
      "Stand up the governance-platform with fleet coordination protocols, " +
      "handoff contracts, and recovery mechanisms. This is the foundation for " +
      "ADM-3+ governance.",
    dimension: "fleet_governance",
    triggerIfBelow: 30,
    estimatedGain: 35,
    effort: "L",
    prerequisites: [],
    addressesCap: false,
  },
  {
    id: "fg-002",
    title: "Implement recovery ladder",
    description:
      "Deploy the 5-step recovery ladder: local retry → checkpoint restore → " +
      "reduced scope → escalation → graceful degradation. Log all recovery events.",
    dimension: "fleet_governance",
    triggerIfBelow: 60,
    estimatedGain: 20,
    effort: "M",
    prerequisites: ["fg-001"],
    addressesCap: false,
  },
  {
    id: "fg-003",
    title: "Implement governance token accounting",
    description:
      "Track governance_tokens / total_tokens ratio. Target: <10% governance overhead. " +
      "Alert if overhead exceeds 25% (ADM-3 hard cap threshold).",
    dimension: "fleet_governance",
    triggerIfBelow: 80,
    estimatedGain: 10,
    effort: "S",
    prerequisites: ["fg-001"],
    addressesCap: false,
  },

  // -------------------------------------------------------------------------
  // Security Posture
  // -------------------------------------------------------------------------
  {
    id: "sp-001",
    title: "Implement agent identity and authentication",
    description:
      "Deploy auth.ts with session-scoped credentials, agent identity tokens, " +
      "and authority tier enforcement. No agent should operate without identity binding.",
    dimension: "security_posture",
    triggerIfBelow: 40,
    estimatedGain: 30,
    effort: "M",
    prerequisites: [],
    addressesCap: false,
  },
  {
    id: "sp-002",
    title: "Deploy input validation for all agent inputs",
    description:
      "Implement input-validation.ts with schema validation for all external inputs. " +
      "Prevents prompt injection, context poisoning, and malformed data attacks.",
    dimension: "security_posture",
    triggerIfBelow: 60,
    estimatedGain: 20,
    effort: "S",
    prerequisites: ["sp-001"],
    addressesCap: false,
  },
  {
    id: "sp-003",
    title: "Run full attack corpus",
    description:
      "Execute all 18+ Admiral attack corpus scenarios against the fleet. " +
      "Document failures and remediate. Target: >70% pass rate (ADM-3 threshold).",
    dimension: "security_posture",
    triggerIfBelow: 80,
    estimatedGain: 15,
    effort: "M",
    prerequisites: ["sp-001", "sp-002"],
    addressesCap: true,
  },

  // -------------------------------------------------------------------------
  // Observability Maturity
  // -------------------------------------------------------------------------
  {
    id: "om-001",
    title: "Add structured logging baseline",
    description:
      "Deploy structured-logging.ts and logger.ts with consistent log format. " +
      "Every agent operation should emit a structured log entry with timestamp, " +
      "agent_id, operation, and outcome.",
    dimension: "observability_maturity",
    triggerIfBelow: 30,
    estimatedGain: 30,
    effort: "S",
    prerequisites: [],
    addressesCap: false,
  },
  {
    id: "om-002",
    title: "Deploy distributed tracing",
    description:
      "Implement distributed-tracing.ts with trace context propagation. " +
      "Every request should have a trace ID that spans across agent boundaries. " +
      "Required for full audit trail completeness.",
    dimension: "observability_maturity",
    triggerIfBelow: 60,
    estimatedGain: 25,
    effort: "M",
    prerequisites: ["om-001"],
    addressesCap: false,
  },
  {
    id: "om-003",
    title: "Implement SLO tracking",
    description:
      "Deploy slo-tracker.ts to monitor first-pass quality rate, recovery success rate, " +
      "and governance overhead. Set alert thresholds at ADM hard-cap levels.",
    dimension: "observability_maturity",
    triggerIfBelow: 80,
    estimatedGain: 10,
    effort: "S",
    prerequisites: ["om-002"],
    addressesCap: false,
  },
];

// ---------------------------------------------------------------------------
// RecommendationEngine
// ---------------------------------------------------------------------------

export class RecommendationEngine {
  /**
   * Get prioritized recommendations for a rating report.
   * Sorted by: priority (critical first), then impact score (descending).
   */
  getRecommendations(report: RatingReport): Recommendation[] {
    const recs: Recommendation[] = [];

    for (const template of ACTION_CATALOG) {
      const dimScore = report.dimensionScores.find(
        (d) => d.dimensionId === template.dimension,
      );
      const currentScore = dimScore?.score ?? 0;

      if (currentScore >= template.triggerIfBelow) continue;

      const effortUnit = EFFORT_UNITS[template.effort];
      const impactScore = Math.round((template.estimatedGain / effortUnit) * 10) / 10;

      const targetScore = Math.min(100, currentScore + template.estimatedGain);

      const priority = this.determinePriority(
        currentScore,
        template.addressesCap,
        dimScore?.capTriggered ?? false,
      );

      recs.push({
        id: template.id,
        title: template.title,
        description: template.description,
        dimension: template.dimension,
        estimatedGain: template.estimatedGain,
        effort: template.effort,
        impactScore,
        prerequisites: template.prerequisites,
        addressesCap: template.addressesCap,
        priority,
        currentScore,
        targetScore,
      });
    }

    return this.sort(recs);
  }

  /**
   * Get the set of recommendations needed to reach the next tier.
   */
  getNextTierRecommendations(
    report: RatingReport,
  ): { targetTier: RatingTierCode; recommendations: Recommendation[] } {
    const currentTierCode = report.tier;
    const nextTier = this.nextTier(currentTierCode);
    if (!nextTier) {
      return { targetTier: currentTierCode, recommendations: [] };
    }

    const all = this.getRecommendations(report);
    const targetMinScore = RATING_TIERS[nextTier].minScore;

    // Filter to recommendations that would close the gap
    const gap = targetMinScore - report.overallScore;
    const relevant = all.filter((r) => {
      const dim = RATING_DIMENSIONS[r.dimension];
      const weightedGain = (r.estimatedGain * dim.weight) / 100;
      return weightedGain > 0 || r.addressesCap;
    });

    return { targetTier: nextTier, recommendations: relevant };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private determinePriority(
    currentScore: number,
    addressesCap: boolean,
    capTriggered: boolean,
  ): 0 | 1 | 2 | 3 {
    if (capTriggered || (addressesCap && currentScore < 30)) return 0;
    if (currentScore < 40) return 1;
    if (currentScore < 60) return 2;
    return 3;
  }

  private sort(recs: Recommendation[]): Recommendation[] {
    return [...recs].sort((a, b) => {
      // First by priority (lower = more urgent)
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Then by impact score (higher = better)
      return b.impactScore - a.impactScore;
    });
  }

  private nextTier(tier: RatingTierCode): RatingTierCode | null {
    const progression: Record<RatingTierCode, RatingTierCode | null> = {
      "ADM-5": "ADM-4",
      "ADM-4": "ADM-3",
      "ADM-3": "ADM-2",
      "ADM-2": "ADM-1",
      "ADM-1": null,
    };
    return progression[tier];
  }
}
