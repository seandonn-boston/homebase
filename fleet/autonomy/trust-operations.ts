/**
 * Trust Operations (AU-06 to AU-11)
 *
 * Persistence, dashboard, override, trust-aware routing,
 * reporting, and approval API for the fleet trust model.
 * Zero external dependencies — Node.js built-ins only.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { TrustStore, TrustStage, type TrustRecord } from "./trust-model";
import { TrustScoringEngine } from "./trust-scoring";

// ---------------------------------------------------------------------------
// AU-06: Trust Persistence
// ---------------------------------------------------------------------------

export class TrustPersistence {
  private store: TrustStore;
  private brainDir: string;

  constructor(store: TrustStore, brainDir: string) {
    this.store = store;
    this.brainDir = brainDir;
  }

  async save(): Promise<void> {
    const filePath = path.join(this.brainDir, "trust-state.json");
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = this.store.serialize();
    fs.writeFileSync(filePath, data, "utf-8");
  }

  async load(): Promise<void> {
    const filePath = path.join(this.brainDir, "trust-state.json");
    if (!fs.existsSync(filePath)) return;
    const data = fs.readFileSync(filePath, "utf-8");
    const loaded = TrustStore.deserialize(data);
    // Copy loaded records into our store
    for (const record of loaded.getAllRecords()) {
      this.store.setRecord(record);
    }
  }

  applyDecay(maxInactiveDays: number): TrustRecord[] {
    const now = Date.now();
    const threshold = maxInactiveDays * 24 * 60 * 60 * 1000;
    const decayed: TrustRecord[] = [];

    for (const record of this.store.getAllRecords()) {
      if (now - record.lastUpdated > threshold && record.stage > TrustStage.ManualOversight) {
        const from = record.stage;
        record.stage = (record.stage - 1) as TrustStage;
        record.consecutiveSuccesses = 0;
        record.lastUpdated = now;
        record.history.push({
          from,
          to: record.stage,
          reason: `inactivity decay (>${maxInactiveDays} days)`,
          timestamp: now,
        });
        decayed.push({ ...record });
      }
    }

    return decayed;
  }
}

// ---------------------------------------------------------------------------
// AU-07: Trust Dashboard
// ---------------------------------------------------------------------------

export interface AgentTrustView {
  agentId: string;
  categories: { category: string; stage: TrustStage; score: number; trend: "up" | "down" | "stable" }[];
  recentEvents: { type: string; category: string; timestamp: number }[];
}

export interface FleetTrustView {
  totalAgents: number;
  stageDistribution: Record<number, number>;
  averageScore: number;
  recentPromotions: number;
  recentDemotions: number;
  autonomyMatrix: { agentId: string; categories: Record<string, number> }[];
}

export class TrustDashboard {
  private store: TrustStore;
  private scoring: TrustScoringEngine;

  constructor(store: TrustStore, scoring: TrustScoringEngine) {
    this.store = store;
    this.scoring = scoring;
  }

  getAgentView(agentId: string): AgentTrustView {
    const records = this.store.getAgentRecords(agentId);
    const categories = records.map((r) => {
      const trend = this.computeTrend(r);
      return {
        category: r.category,
        stage: r.stage,
        score: r.score,
        trend,
      };
    });

    const recentEvents: { type: string; category: string; timestamp: number }[] = [];
    for (const r of records) {
      for (const h of r.history) {
        recentEvents.push({
          type: h.to > h.from ? "promotion" : "demotion",
          category: r.category,
          timestamp: h.timestamp,
        });
      }
    }
    recentEvents.sort((a, b) => b.timestamp - a.timestamp);

    return { agentId, categories, recentEvents: recentEvents.slice(0, 20) };
  }

  getFleetView(): FleetTrustView {
    const summary = this.store.getFleetTrustSummary();
    const allRecords = this.store.getAllRecords();

    const agentMap = new Map<string, Record<string, number>>();
    for (const r of allRecords) {
      let cats = agentMap.get(r.agentId);
      if (!cats) {
        cats = {};
        agentMap.set(r.agentId, cats);
      }
      cats[r.category] = r.score;
    }

    const autonomyMatrix = Array.from(agentMap.entries()).map(([agentId, categories]) => ({
      agentId,
      categories,
    }));

    return {
      totalAgents: summary.totalAgents,
      stageDistribution: {
        [TrustStage.ManualOversight]: summary.byStage[TrustStage.ManualOversight],
        [TrustStage.AssistedAutomation]: summary.byStage[TrustStage.AssistedAutomation],
        [TrustStage.PartialAutonomy]: summary.byStage[TrustStage.PartialAutonomy],
        [TrustStage.FullAutonomy]: summary.byStage[TrustStage.FullAutonomy],
      },
      averageScore: summary.averageScore,
      recentPromotions: summary.recentPromotions,
      recentDemotions: summary.recentDemotions,
      autonomyMatrix,
    };
  }

  getPromotionCandidates(): { agentId: string; category: string; eligibility: any }[] {
    const candidates: { agentId: string; category: string; eligibility: any }[] = [];
    for (const record of this.store.getAllRecords()) {
      const eligibility = this.scoring.checkPromotionEligibility(record.agentId, record.category);
      if (eligibility.eligible) {
        candidates.push({
          agentId: record.agentId,
          category: record.category,
          eligibility,
        });
      }
    }
    return candidates;
  }

  getDecayWarnings(warningDays: number): TrustRecord[] {
    const now = Date.now();
    const threshold = warningDays * 24 * 60 * 60 * 1000;
    return this.store.getAllRecords().filter(
      (r) => now - r.lastUpdated > threshold && r.stage > TrustStage.ManualOversight,
    );
  }

  private computeTrend(record: TrustRecord): "up" | "down" | "stable" {
    if (record.history.length === 0) return "stable";
    const last = record.history[record.history.length - 1];
    if (last.to > last.from) return "up";
    if (last.to < last.from) return "down";
    return "stable";
  }
}

// ---------------------------------------------------------------------------
// AU-08: Trust Override
// ---------------------------------------------------------------------------

interface OverrideEntry {
  agentId: string;
  category: string;
  operator: string;
  reason: string;
  timestamp: number;
}

export class TrustOverride {
  private store: TrustStore;
  private overrides: OverrideEntry[] = [];

  constructor(store: TrustStore) {
    this.store = store;
  }

  override(
    agentId: string,
    category: string,
    newStage: TrustStage,
    operator: string,
    reason: string,
  ): TrustRecord {
    const record = this.store.getRecord(agentId, category);
    if (!record) throw new Error(`No trust record for agent=${agentId} category=${category}`);

    const from = record.stage;
    record.stage = newStage;
    record.lastUpdated = Date.now();
    record.history.push({
      from,
      to: newStage,
      reason: `override: ${reason}`,
      timestamp: record.lastUpdated,
      approvedBy: operator,
    });

    this.overrides.push({
      agentId,
      category,
      operator,
      reason,
      timestamp: record.lastUpdated,
    });

    return { ...record };
  }

  getOverrides(): OverrideEntry[] {
    return [...this.overrides];
  }
}

// ---------------------------------------------------------------------------
// AU-09: Trust-Aware Router
// ---------------------------------------------------------------------------

export class TrustAwareRouter {
  private store: TrustStore;

  constructor(store: TrustStore) {
    this.store = store;
  }

  meetsMinimumTrust(agentId: string, category: string, minimumStage: TrustStage): boolean {
    const record = this.store.getRecord(agentId, category);
    if (!record) return false;
    return record.stage >= minimumStage;
  }

  filterByTrust(agentIds: string[], category: string, minimumStage: TrustStage): string[] {
    return agentIds.filter((id) => this.meetsMinimumTrust(id, category, minimumStage));
  }

  getBestTrustedAgent(agentIds: string[], category: string): string | null {
    let best: string | null = null;
    let bestScore = -1;

    for (const id of agentIds) {
      const record = this.store.getRecord(id, category);
      if (record && record.score > bestScore) {
        bestScore = record.score;
        best = id;
      }
    }

    return best;
  }
}

// ---------------------------------------------------------------------------
// AU-10: Trust Reporter
// ---------------------------------------------------------------------------

export interface TrustReport {
  timestamp: number;
  totalAgents: number;
  trustDistribution: Record<number, number>;
  averageTrustVelocity: number;
  demotionFrequency: number;
  overrideFrequency: number;
  categories: { category: string; avgScore: number; avgStage: number }[];
}

export class TrustReporter {
  private store: TrustStore;

  constructor(store: TrustStore) {
    this.store = store;
  }

  generateReport(): TrustReport {
    const summary = this.store.getFleetTrustSummary();
    const allRecords = this.store.getAllRecords();

    // Category aggregation
    const catMap = new Map<string, { scoreSum: number; stageSum: number; count: number }>();
    for (const r of allRecords) {
      let cat = catMap.get(r.category);
      if (!cat) {
        cat = { scoreSum: 0, stageSum: 0, count: 0 };
        catMap.set(r.category, cat);
      }
      cat.scoreSum += r.score;
      cat.stageSum += r.stage;
      cat.count++;
    }

    const categories = Array.from(catMap.entries()).map(([category, data]) => ({
      category,
      avgScore: data.count > 0 ? data.scoreSum / data.count : 0,
      avgStage: data.count > 0 ? data.stageSum / data.count : 0,
    }));

    // Count demotions and overrides in history
    let demotions = 0;
    let overrides = 0;
    for (const r of allRecords) {
      for (const h of r.history) {
        if (h.to < h.from) demotions++;
        if (h.reason.startsWith("override:")) overrides++;
      }
    }

    // Average trust velocity: simplified as avg score change from initial
    const totalDecisions = allRecords.reduce((s, r) => s + r.totalDecisions, 0);
    const avgVelocity = totalDecisions > 0
      ? allRecords.reduce((s, r) => s + r.score, 0) / totalDecisions
      : 0;

    return {
      timestamp: Date.now(),
      totalAgents: summary.totalAgents,
      trustDistribution: {
        [TrustStage.ManualOversight]: summary.byStage[TrustStage.ManualOversight],
        [TrustStage.AssistedAutomation]: summary.byStage[TrustStage.AssistedAutomation],
        [TrustStage.PartialAutonomy]: summary.byStage[TrustStage.PartialAutonomy],
        [TrustStage.FullAutonomy]: summary.byStage[TrustStage.FullAutonomy],
      },
      averageTrustVelocity: avgVelocity,
      demotionFrequency: demotions,
      overrideFrequency: overrides,
      categories,
    };
  }
}

// ---------------------------------------------------------------------------
// AU-11: Approval API
// ---------------------------------------------------------------------------

export interface PromotionRequest {
  agentId: string;
  category: string;
  currentStage: TrustStage;
  targetStage: TrustStage;
  evidence: { consecutiveSuccesses: number; daysSinceLastFailure: number };
}

export class TrustApprovalApi {
  private scoring: TrustScoringEngine;
  private store: TrustStore;
  private deferred: Map<string, { reason: string; timestamp: number }> = new Map();

  constructor(scoring: TrustScoringEngine, store: TrustStore) {
    this.scoring = scoring;
    this.store = store;
  }

  getPendingPromotions(): PromotionRequest[] {
    const requests: PromotionRequest[] = [];
    for (const record of this.store.getAllRecords()) {
      const key = `${record.agentId}::${record.category}`;
      if (this.deferred.has(key)) continue;

      const eligibility = this.scoring.checkPromotionEligibility(record.agentId, record.category);
      if (eligibility.eligible) {
        const daysSinceLastFailure = record.consecutiveFailures === 0
          ? Math.floor((Date.now() - record.lastUpdated) / (24 * 60 * 60 * 1000)) + record.consecutiveSuccesses
          : 0;
        requests.push({
          agentId: record.agentId,
          category: record.category,
          currentStage: record.stage,
          targetStage: (record.stage + 1) as TrustStage,
          evidence: {
            consecutiveSuccesses: record.consecutiveSuccesses,
            daysSinceLastFailure,
          },
        });
      }
    }
    return requests;
  }

  approvePromotion(
    agentId: string,
    category: string,
    approvedBy: string,
    _rationale: string,
  ): { promoted: boolean; newStage: TrustStage } {
    const result = this.scoring.requestPromotion(agentId, category, approvedBy);
    // Clear any deferred state
    this.deferred.delete(`${agentId}::${category}`);
    return result;
  }

  deferPromotion(agentId: string, category: string, reason: string): void {
    this.deferred.set(`${agentId}::${category}`, {
      reason,
      timestamp: Date.now(),
    });
  }
}
