/**
 * Trust Scoring Engine (AU-02 to AU-05)
 *
 * Builds on TrustStore to provide:
 *   AU-02: Score calculation with severity weighting
 *   AU-03: Permission gating per trust stage
 *   AU-04: Demotion on failure, model change, security incidents
 *   AU-05: Promotion eligibility and approval workflow
 *   Decay: Inactive categories decay after configurable days
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { TrustStore, TrustStage, type TrustRecord } from "./trust-model";

// ---------------------------------------------------------------------------
// Interfaces & Config
// ---------------------------------------------------------------------------

export interface TrustScoringConfig {
  promotionThreshold: number;
  promotionMinDays: number;
  criticalFailureDemotionStage: TrustStage;
  decayDays: number;
}

const DEFAULT_SCORING_CONFIG: TrustScoringConfig = {
  promotionThreshold: 10,
  promotionMinDays: 7,
  criticalFailureDemotionStage: TrustStage.ManualOversight,
  decayDays: 30,
};

/** Permission mappings per trust stage. */
const STAGE_PERMISSIONS: Record<
  TrustStage,
  { requiresApproval: boolean; allowedActions: string[]; maxRisk: "low" | "medium" | "high" }
> = {
  [TrustStage.ManualOversight]: {
    requiresApproval: true,
    allowedActions: ["read", "suggest"],
    maxRisk: "low",
  },
  [TrustStage.AssistedAutomation]: {
    requiresApproval: true,
    allowedActions: ["read", "suggest", "draft", "test"],
    maxRisk: "low",
  },
  [TrustStage.PartialAutonomy]: {
    requiresApproval: false,
    allowedActions: ["read", "suggest", "draft", "test", "write", "deploy-staging"],
    maxRisk: "medium",
  },
  [TrustStage.FullAutonomy]: {
    requiresApproval: false,
    allowedActions: ["read", "suggest", "draft", "test", "write", "deploy-staging", "deploy-prod", "configure"],
    maxRisk: "high",
  },
};

/** Severity score impacts. */
const SEVERITY_IMPACT: Record<string, { successDelta: number; failureDelta: number }> = {
  low: { successDelta: 1, failureDelta: -3 },
  medium: { successDelta: 2, failureDelta: -8 },
  high: { successDelta: 3, failureDelta: -15 },
  critical: { successDelta: 0, failureDelta: -30 },
};

const SECURITY_CATEGORIES = ["security", "access-control", "secrets", "authentication", "authorization"];

// ---------------------------------------------------------------------------
// TrustScoringEngine
// ---------------------------------------------------------------------------

export class TrustScoringEngine {
  private readonly store: TrustStore;
  private readonly config: TrustScoringConfig;

  constructor(store: TrustStore, config?: Partial<TrustScoringConfig>) {
    this.store = store;
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config };
  }

  // --- AU-02: Score calculation ---

  recordOutcome(
    agentId: string,
    category: string,
    outcome: "success" | "failure" | "partial",
    severity: "low" | "medium" | "high" | "critical",
  ): TrustRecord {
    const record = this.store.getRecord(agentId, category);
    if (!record) {
      throw new Error(`No trust record for agent=${agentId} category=${category}`);
    }

    record.totalDecisions++;
    record.lastUpdated = Date.now();

    const impact = SEVERITY_IMPACT[severity];

    if (outcome === "success") {
      record.consecutiveSuccesses++;
      record.consecutiveFailures = 0;
      record.score = Math.min(100, record.score + impact.successDelta);
    } else if (outcome === "failure") {
      record.consecutiveFailures++;
      record.consecutiveSuccesses = 0;
      record.score = Math.max(0, record.score + impact.failureDelta);
      // Auto-demotion for failures
      this.handleFailure(agentId, category, severity);
    } else {
      // partial
      record.consecutiveSuccesses = 0;
      record.score = Math.max(0, record.score - 2);
    }

    return { ...record };
  }

  // --- AU-03: Permission gating ---

  getPermissionLevel(
    agentId: string,
    category: string,
  ): { stage: TrustStage; requiresApproval: boolean; allowedActions: string[] } {
    const record = this.store.getRecord(agentId, category);
    if (!record) {
      // Unknown agent defaults to maximum restriction
      return {
        stage: TrustStage.ManualOversight,
        requiresApproval: true,
        allowedActions: ["read", "suggest"],
      };
    }

    const perms = STAGE_PERMISSIONS[record.stage];
    return {
      stage: record.stage,
      requiresApproval: perms.requiresApproval,
      allowedActions: [...perms.allowedActions],
    };
  }

  canActAutonomously(
    agentId: string,
    category: string,
    actionRisk: "low" | "medium" | "high",
  ): boolean {
    const record = this.store.getRecord(agentId, category);
    if (!record) return false;

    const perms = STAGE_PERMISSIONS[record.stage];
    if (perms.requiresApproval) return false;

    const riskLevels = ["low", "medium", "high"];
    const maxIndex = riskLevels.indexOf(perms.maxRisk);
    const requestIndex = riskLevels.indexOf(actionRisk);
    return requestIndex <= maxIndex;
  }

  // --- AU-04: Demotion ---

  handleFailure(
    agentId: string,
    category: string,
    severity: "low" | "medium" | "high" | "critical",
  ): { demoted: boolean; newStage: TrustStage; reason: string } {
    const record = this.store.getRecord(agentId, category);
    if (!record) {
      return { demoted: false, newStage: TrustStage.ManualOversight, reason: "No record found" };
    }

    if (severity === "critical") {
      const from = record.stage;
      if (from > this.config.criticalFailureDemotionStage) {
        this.store.demoteAgent(agentId, category, `critical failure in ${category}`);
        return {
          demoted: true,
          newStage: record.stage,
          reason: `Critical failure: demoted from stage ${from} to ${record.stage}`,
        };
      }
      return { demoted: false, newStage: record.stage, reason: "Already at minimum stage" };
    }

    if (severity === "high" && record.consecutiveFailures >= 2) {
      if (record.stage > TrustStage.ManualOversight) {
        const from = record.stage;
        this.store.demoteAgent(agentId, category, `repeated high-severity failures in ${category}`);
        return {
          demoted: true,
          newStage: record.stage,
          reason: `Repeated high-severity failures: demoted from stage ${from}`,
        };
      }
    }

    if (record.consecutiveFailures >= 3 && record.stage > TrustStage.ManualOversight) {
      const from = record.stage;
      this.store.demoteAgent(agentId, category, `3+ consecutive failures in ${category}`);
      return {
        demoted: true,
        newStage: record.stage,
        reason: `3+ consecutive failures: demoted from stage ${from}`,
      };
    }

    return { demoted: false, newStage: record.stage, reason: "No demotion triggered" };
  }

  handleModelChange(agentId: string): void {
    const records = this.store.getAgentRecords(agentId);
    for (const record of records) {
      if (record.stage > TrustStage.AssistedAutomation) {
        const from = record.stage;
        record.stage = TrustStage.AssistedAutomation;
        record.consecutiveSuccesses = 0;
        record.lastUpdated = Date.now();
        record.history.push({
          from,
          to: TrustStage.AssistedAutomation,
          reason: "model change revert",
          timestamp: Date.now(),
        });
      }
    }
  }

  handleSecurityIncident(agentId: string): void {
    const records = this.store.getAgentRecords(agentId);
    for (const record of records) {
      if (SECURITY_CATEGORIES.includes(record.category)) {
        if (record.stage > TrustStage.ManualOversight) {
          const from = record.stage;
          record.stage = TrustStage.ManualOversight;
          record.consecutiveSuccesses = 0;
          record.lastUpdated = Date.now();
          record.history.push({
            from,
            to: TrustStage.ManualOversight,
            reason: "security incident",
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  // --- AU-05: Promotion ---

  checkPromotionEligibility(
    agentId: string,
    category: string,
  ): { eligible: boolean; reason: string; currentStreak: number; requiredStreak: number } {
    const record = this.store.getRecord(agentId, category);
    if (!record) {
      return {
        eligible: false,
        reason: "No trust record found",
        currentStreak: 0,
        requiredStreak: this.config.promotionThreshold,
      };
    }

    if (record.stage >= TrustStage.FullAutonomy) {
      return {
        eligible: false,
        reason: "Already at maximum trust stage",
        currentStreak: record.consecutiveSuccesses,
        requiredStreak: this.config.promotionThreshold,
      };
    }

    if (record.consecutiveSuccesses < this.config.promotionThreshold) {
      return {
        eligible: false,
        reason: `Insufficient consecutive successes: ${record.consecutiveSuccesses}/${this.config.promotionThreshold}`,
        currentStreak: record.consecutiveSuccesses,
        requiredStreak: this.config.promotionThreshold,
      };
    }

    if (record.totalDecisions < this.config.promotionMinDays) {
      return {
        eligible: false,
        reason: `Insufficient total decisions: ${record.totalDecisions}/${this.config.promotionMinDays}`,
        currentStreak: record.consecutiveSuccesses,
        requiredStreak: this.config.promotionThreshold,
      };
    }

    return {
      eligible: true,
      reason: "Meets all promotion criteria",
      currentStreak: record.consecutiveSuccesses,
      requiredStreak: this.config.promotionThreshold,
    };
  }

  requestPromotion(
    agentId: string,
    category: string,
    approvedBy: string,
  ): { promoted: boolean; newStage: TrustStage } {
    const eligibility = this.checkPromotionEligibility(agentId, category);
    if (!eligibility.eligible) {
      const record = this.store.getRecord(agentId, category);
      return {
        promoted: false,
        newStage: record?.stage ?? TrustStage.ManualOversight,
      };
    }

    const record = this.store.promoteAgent(agentId, category, approvedBy);
    return { promoted: true, newStage: record.stage };
  }

  // --- Decay ---

  applyDecay(): { decayed: TrustRecord[] } {
    const decayed: TrustRecord[] = [];
    const now = Date.now();
    const decayThreshold = this.config.decayDays * 24 * 60 * 60 * 1000;

    const allRecords = this.store.getAllRecords();
    for (const record of allRecords) {
      if (now - record.lastUpdated > decayThreshold && record.stage > TrustStage.ManualOversight) {
        const from = record.stage;
        record.stage = (record.stage - 1) as TrustStage;
        record.consecutiveSuccesses = 0;
        record.lastUpdated = now;
        record.history.push({
          from,
          to: record.stage,
          reason: `inactivity decay (>${this.config.decayDays} days)`,
          timestamp: now,
        });
        decayed.push({ ...record });
      }
    }

    return { decayed };
  }
}
