/**
 * Model Tier Promotion/Demotion Tracking (O-02c)
 *
 * Tracks quality rates, rework costs, and A/B results per model tier.
 * Generates promotion/demotion recommendations persisted to Brain.
 */

export interface TierRecord {
  agentId: string;
  currentTier: string;
  qualityRate: number;
  reworkRate: number;
  taskCount: number;
  successCount: number;
  failureCount: number;
  lastUpdated: number;
}

export interface TierRecommendation {
  agentId: string;
  currentTier: string;
  recommendedTier: string;
  direction: "promote" | "demote" | "maintain";
  confidence: number;
  reason: string;
  evidence: {
    qualityRate: number;
    reworkRate: number;
    taskCount: number;
  };
}

const TIER_ORDER = ["tier3_utility", "tier2_workhorse", "tier1_flagship"];

export class TierTracker {
  private records: Map<string, TierRecord> = new Map();

  recordOutcome(agentId: string, tier: string, success: boolean, rework: boolean): void {
    let record = this.records.get(agentId);
    if (!record) {
      record = {
        agentId,
        currentTier: tier,
        qualityRate: 0,
        reworkRate: 0,
        taskCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUpdated: Date.now(),
      };
      this.records.set(agentId, record);
    }

    record.taskCount++;
    if (success) record.successCount++;
    else record.failureCount++;
    record.qualityRate = record.successCount / record.taskCount;
    if (rework) record.reworkRate = (record.reworkRate * (record.taskCount - 1) + 1) / record.taskCount;
    record.currentTier = tier;
    record.lastUpdated = Date.now();
  }

  getRecommendation(agentId: string): TierRecommendation | undefined {
    const record = this.records.get(agentId);
    if (!record || record.taskCount < 5) return undefined;

    const tierIdx = TIER_ORDER.indexOf(record.currentTier);

    if (record.qualityRate >= 0.95 && record.reworkRate < 0.05 && tierIdx < TIER_ORDER.length - 1) {
      return {
        agentId,
        currentTier: record.currentTier,
        recommendedTier: TIER_ORDER[tierIdx + 1],
        direction: "promote",
        confidence: record.qualityRate,
        reason: `Quality rate ${(record.qualityRate * 100).toFixed(0)}% with <5% rework over ${record.taskCount} tasks`,
        evidence: { qualityRate: record.qualityRate, reworkRate: record.reworkRate, taskCount: record.taskCount },
      };
    }

    if (record.qualityRate < 0.7 && tierIdx > 0) {
      return {
        agentId,
        currentTier: record.currentTier,
        recommendedTier: TIER_ORDER[tierIdx - 1],
        direction: "demote",
        confidence: 1 - record.qualityRate,
        reason: `Quality rate ${(record.qualityRate * 100).toFixed(0)}% below 70% threshold over ${record.taskCount} tasks`,
        evidence: { qualityRate: record.qualityRate, reworkRate: record.reworkRate, taskCount: record.taskCount },
      };
    }

    return {
      agentId,
      currentTier: record.currentTier,
      recommendedTier: record.currentTier,
      direction: "maintain",
      confidence: record.qualityRate,
      reason: `Quality rate ${(record.qualityRate * 100).toFixed(0)}% within normal range`,
      evidence: { qualityRate: record.qualityRate, reworkRate: record.reworkRate, taskCount: record.taskCount },
    };
  }

  getRecord(agentId: string): TierRecord | undefined {
    return this.records.get(agentId);
  }

  getAllRecords(): TierRecord[] {
    return Array.from(this.records.values());
  }
}
