/**
 * Trust Data Model (AU-01)
 *
 * Four-stage trust ladder for fleet agents.
 * Tracks per-agent, per-category trust levels with promotion/demotion rules.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum TrustStage {
  ManualOversight = 1,
  AssistedAutomation = 2,
  PartialAutonomy = 3,
  FullAutonomy = 4,
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TrustTransition {
  from: TrustStage;
  to: TrustStage;
  reason: string;
  timestamp: number;
  approvedBy?: string;
}

export interface TrustRecord {
  agentId: string;
  category: string;
  stage: TrustStage;
  score: number; // 0-100
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  totalDecisions: number;
  lastUpdated: number;
  history: TrustTransition[];
}

export interface FleetTrustSummary {
  totalAgents: number;
  byStage: Record<TrustStage, number>;
  averageScore: number;
  recentDemotions: number; // last 24h
  recentPromotions: number;
}

export interface TrustStoreConfig {
  /** Minimum consecutive successes before promotion is allowed. */
  minConsecutiveSuccesses: number;
  /** Minimum total decisions before promotion is allowed. */
  minDecisionsForPromotion: number;
}

const DEFAULT_CONFIG: TrustStoreConfig = {
  minConsecutiveSuccesses: 10,
  minDecisionsForPromotion: 7,
};

// ---------------------------------------------------------------------------
// TrustStore
// ---------------------------------------------------------------------------

export class TrustStore {
  private records: Map<string, TrustRecord> = new Map();
  private readonly config: TrustStoreConfig;

  constructor(config: Partial<TrustStoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // --- Key helpers ---

  private key(agentId: string, category: string): string {
    return `${agentId}::${category}`;
  }

  // --- Read operations ---

  getRecord(agentId: string, category: string): TrustRecord | undefined {
    return this.records.get(this.key(agentId, category));
  }

  getAgentRecords(agentId: string): TrustRecord[] {
    const results: TrustRecord[] = [];
    for (const record of this.records.values()) {
      if (record.agentId === agentId) results.push(record);
    }
    return results;
  }

  getAllRecords(): TrustRecord[] {
    return Array.from(this.records.values());
  }

  // --- Write operations ---

  setRecord(record: TrustRecord): void {
    this.records.set(this.key(record.agentId, record.category), record);
  }

  initializeAgent(
    agentId: string,
    categories: string[],
    initialStage: TrustStage = TrustStage.ManualOversight,
  ): void {
    const now = Date.now();
    for (const category of categories) {
      const k = this.key(agentId, category);
      if (!this.records.has(k)) {
        this.records.set(k, {
          agentId,
          category,
          stage: initialStage,
          score: initialStage === TrustStage.ManualOversight ? 0 : 25 * (initialStage - 1),
          consecutiveSuccesses: 0,
          consecutiveFailures: 0,
          totalDecisions: 0,
          lastUpdated: now,
          history: [],
        });
      }
    }
  }

  // --- Decision recording ---

  recordDecision(
    agentId: string,
    category: string,
    outcome: "success" | "failure" | "partial",
  ): TrustRecord {
    const record = this.records.get(this.key(agentId, category));
    if (!record) {
      throw new Error(`No trust record for agent=${agentId} category=${category}`);
    }

    record.totalDecisions++;
    record.lastUpdated = Date.now();

    if (outcome === "success") {
      record.consecutiveSuccesses++;
      record.consecutiveFailures = 0;
      record.score = Math.min(100, record.score + 2);
    } else if (outcome === "failure") {
      record.consecutiveFailures++;
      record.consecutiveSuccesses = 0;
      record.score = Math.max(0, record.score - 10);
      this.applyDemotion(record, "failure", false);
    } else {
      // partial — mild penalty
      record.consecutiveSuccesses = 0;
      record.score = Math.max(0, record.score - 3);
    }

    return record;
  }

  // --- Promotion / Demotion ---

  promoteAgent(agentId: string, category: string, approvedBy: string): TrustRecord {
    const record = this.records.get(this.key(agentId, category));
    if (!record) {
      throw new Error(`No trust record for agent=${agentId} category=${category}`);
    }
    if (record.stage >= TrustStage.FullAutonomy) {
      throw new Error("Agent is already at maximum trust stage");
    }
    if (record.consecutiveSuccesses < this.config.minConsecutiveSuccesses) {
      throw new Error(
        `Insufficient consecutive successes: ${record.consecutiveSuccesses}/${this.config.minConsecutiveSuccesses}`,
      );
    }
    if (record.totalDecisions < this.config.minDecisionsForPromotion) {
      throw new Error(
        `Insufficient total decisions: ${record.totalDecisions}/${this.config.minDecisionsForPromotion}`,
      );
    }

    const from = record.stage;
    const to = (record.stage + 1) as TrustStage;
    record.stage = to;
    record.lastUpdated = Date.now();
    record.history.push({
      from,
      to,
      reason: "promotion",
      timestamp: record.lastUpdated,
      approvedBy,
    });

    return record;
  }

  demoteAgent(agentId: string, category: string, reason: string): TrustRecord {
    const record = this.records.get(this.key(agentId, category));
    if (!record) {
      throw new Error(`No trust record for agent=${agentId} category=${category}`);
    }
    this.applyDemotion(record, reason, true);
    return record;
  }

  private applyDemotion(record: TrustRecord, reason: string, critical: boolean): void {
    if (record.stage === TrustStage.ManualOversight) return;

    const from = record.stage;
    const to = critical ? TrustStage.ManualOversight : ((record.stage - 1) as TrustStage);
    record.stage = to;
    record.lastUpdated = Date.now();
    record.history.push({
      from,
      to,
      reason,
      timestamp: record.lastUpdated,
    });
  }

  // --- Fleet summary ---

  getFleetTrustSummary(): FleetTrustSummary {
    const agentIds = new Set<string>();
    const byStage: Record<TrustStage, number> = {
      [TrustStage.ManualOversight]: 0,
      [TrustStage.AssistedAutomation]: 0,
      [TrustStage.PartialAutonomy]: 0,
      [TrustStage.FullAutonomy]: 0,
    };
    let scoreSum = 0;
    let scoreCount = 0;
    let recentDemotions = 0;
    let recentPromotions = 0;
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const record of this.records.values()) {
      agentIds.add(record.agentId);
      byStage[record.stage]++;
      scoreSum += record.score;
      scoreCount++;

      for (const transition of record.history) {
        if (transition.timestamp >= twentyFourHoursAgo) {
          if (transition.to < transition.from) {
            recentDemotions++;
          } else if (transition.to > transition.from) {
            recentPromotions++;
          }
        }
      }
    }

    return {
      totalAgents: agentIds.size,
      byStage,
      averageScore: scoreCount > 0 ? scoreSum / scoreCount : 0,
      recentDemotions,
      recentPromotions,
    };
  }

  // --- Serialization ---

  serialize(): string {
    return JSON.stringify({
      records: Array.from(this.records.entries()),
      config: this.config,
    });
  }

  static deserialize(json: string): TrustStore {
    const data = JSON.parse(json) as {
      records: [string, TrustRecord][];
      config: TrustStoreConfig;
    };
    const store = new TrustStore(data.config);
    for (const [key, record] of data.records) {
      store.records.set(key, record);
    }
    return store;
  }
}
