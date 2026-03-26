/**
 * Context Intelligence (CE-06 to CE-10)
 *
 * Builds on ContextProfileManager and Context Optimization to provide:
 *   CE-06: Context window utilization dashboard
 *   CE-07: Context overflow handling with graduated degradation
 *   CE-08: Dynamic context allocation by task complexity
 *   CE-09: Context preloading with feedback tracking
 *   CE-10: Context audit trail with snapshot diffing
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

import {
  ContextProfileManager,
  ContextZone,
  type ContextItem,
} from "./context-profile";
import {
  ContextCompressor,
  CompressionStrategy,
  RelevanceScorer,
} from "./context-optimization";

// ---------------------------------------------------------------------------
// CE-06: Context Window Utilization Dashboard
// ---------------------------------------------------------------------------

export interface CompressionEvent {
  timestamp: number;
  strategy: string;
  itemsRemoved: number;
  tokensSaved: number;
  trigger: string;
}

export interface UtilizationDashboardData {
  timestamp: number;
  overall: { used: number; total: number; percent: number };
  byZone: Record<string, { used: number; max: number; percent: number }>;
  topItems: { id: string; zone: string; tokens: number; relevance: number }[];
  compressionEvents: CompressionEvent[];
  anomalies: string[];
}

export class ContextDashboard {
  private compressionLog: CompressionEvent[] = [];
  private snapshots: UtilizationDashboardData[] = [];
  private readonly manager: ContextProfileManager;
  private readonly scorer: RelevanceScorer;

  constructor(manager: ContextProfileManager, scorer: RelevanceScorer) {
    this.manager = manager;
    this.scorer = scorer;
  }

  takeSnapshot(): UtilizationDashboardData {
    const overall = this.manager.getOverallUtilization();
    const zoneUtil = this.manager.getZoneUtilization();

    const byZone: Record<string, { used: number; max: number; percent: number }> = {};
    for (const zone of [ContextZone.Standing, ContextZone.Session, ContextZone.Working]) {
      byZone[zone] = zoneUtil[zone];
    }

    const allItems = this.manager.getItems();
    const ranked = this.scorer.rankItems(allItems);
    const scoreMap = new Map(ranked.map((r) => [r.itemId, r.score]));

    // Top 10 items by token count
    const sorted = [...allItems].sort((a, b) => b.tokenCount - a.tokenCount);
    const topItems = sorted.slice(0, 10).map((item) => ({
      id: item.id,
      zone: item.zone,
      tokens: item.tokenCount,
      relevance: scoreMap.get(item.id) ?? 0,
    }));

    const anomalies = this.detectAnomalies();

    const snapshot: UtilizationDashboardData = {
      timestamp: Date.now(),
      overall: { used: overall.used, total: overall.total, percent: overall.percent },
      byZone,
      topItems,
      compressionEvents: [...this.compressionLog],
      anomalies,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  logCompression(event: CompressionEvent): void {
    this.compressionLog.push(event);
  }

  getSnapshots(limit?: number): UtilizationDashboardData[] {
    if (limit != null && limit > 0) {
      return this.snapshots.slice(-limit);
    }
    return [...this.snapshots];
  }

  detectAnomalies(): string[] {
    const anomalies: string[] = [];
    const overall = this.manager.getOverallUtilization();
    const zoneUtil = this.manager.getZoneUtilization();

    // Standing zone > 25% of total budget
    const standingPercent = overall.total > 0
      ? (zoneUtil[ContextZone.Standing].used / overall.total) * 100
      : 0;
    if (standingPercent > 25) {
      anomalies.push("standing > 25%");
    }

    // Overall > 90%
    if (overall.percent > 90) {
      anomalies.push("overall > 90%");
    }

    // Working zone growing > 5% per snapshot without checkpoint
    if (this.snapshots.length >= 2) {
      const prev = this.snapshots[this.snapshots.length - 1];
      const prevWorking = prev.byZone[ContextZone.Working];
      const currWorking = zoneUtil[ContextZone.Working];
      if (prevWorking && currWorking.max > 0) {
        const growth = ((currWorking.used - prevWorking.used) / currWorking.max) * 100;
        if (growth > 5) {
          anomalies.push("working growth without checkpoint");
        }
      }
    }

    return anomalies;
  }

  getUtilizationOverTime(): { timestamp: number; percent: number }[] {
    return this.snapshots.map((s) => ({
      timestamp: s.timestamp,
      percent: s.overall.percent,
    }));
  }
}

// ---------------------------------------------------------------------------
// CE-07: Context Overflow Handling
// ---------------------------------------------------------------------------

export interface OverflowAction {
  level: "warning" | "compress" | "emergency" | "handoff";
  threshold: number;
  actions: string[];
  triggered: boolean;
  triggeredAt?: number;
}

export class ContextOverflowHandler {
  private actions: OverflowAction[];
  private log: { timestamp: number; level: string; actions: string[]; tokensFreed: number }[] = [];
  private readonly manager: ContextProfileManager;
  private readonly compressor: ContextCompressor;

  constructor(manager: ContextProfileManager, compressor: ContextCompressor) {
    this.manager = manager;
    this.compressor = compressor;
    this.actions = [
      {
        level: "warning",
        threshold: 80,
        actions: ["log warning"],
        triggered: false,
      },
      {
        level: "compress",
        threshold: 90,
        actions: ["compress session context", "checkpoint"],
        triggered: false,
      },
      {
        level: "emergency",
        threshold: 95,
        actions: ["minimum-viable-context", "keep standing + current task only"],
        triggered: false,
      },
      {
        level: "handoff",
        threshold: 100,
        actions: ["forced checkpoint", "session handoff"],
        triggered: false,
      },
    ];
  }

  check(): OverflowAction | null {
    const overall = this.manager.getOverallUtilization();
    let highestTriggered: OverflowAction | null = null;

    for (const action of this.actions) {
      if (overall.percent >= action.threshold) {
        action.triggered = true;
        action.triggeredAt = Date.now();
        highestTriggered = action;
      }
    }

    return highestTriggered;
  }

  handleWarning(): void {
    const now = Date.now();
    this.log.push({
      timestamp: now,
      level: "warning",
      actions: ["logged warning"],
      tokensFreed: 0,
    });
  }

  handleCompress(): { freedTokens: number; removedItems: number } {
    const result = this.compressor.compress(CompressionStrategy.Evict, 80);
    const freedTokens = result.savedTokens;
    const removedItems = result.removed.length;

    this.log.push({
      timestamp: Date.now(),
      level: "compress",
      actions: result.removed.map((item) => `removed ${item.id}`),
      tokensFreed: freedTokens,
    });

    return { freedTokens, removedItems };
  }

  handleEmergency(): { freedTokens: number; removedItems: number; remainingItems: number } {
    // Keep only standing zone items and the highest-priority working item (current task)
    const allItems = this.manager.getItems();
    const toRemove = allItems.filter((item) => {
      if (item.zone === ContextZone.Standing) return false;
      return true;
    });

    // Keep the single highest-priority working item
    const workingItems = allItems
      .filter((i) => i.zone === ContextZone.Working)
      .sort((a, b) => b.priority - a.priority);
    const keepWorkingId = workingItems.length > 0 ? workingItems[0].id : null;

    let freedTokens = 0;
    let removedItems = 0;
    const removedIds: string[] = [];

    for (const item of toRemove) {
      if (item.id === keepWorkingId) continue;
      freedTokens += item.tokenCount;
      removedItems++;
      removedIds.push(item.id);
      this.manager.removeItem(item.id);
    }

    this.log.push({
      timestamp: Date.now(),
      level: "emergency",
      actions: removedIds.map((id) => `removed ${id}`),
      tokensFreed: freedTokens,
    });

    const remainingItems = this.manager.getItems().length;
    return { freedTokens, removedItems, remainingItems };
  }

  handleHandoff(): { checkpointData: string; reason: string } {
    const checkpointData = this.manager.serialize();
    const reason = "Context utilization at 100% — forced checkpoint and session handoff";

    this.log.push({
      timestamp: Date.now(),
      level: "handoff",
      actions: ["forced checkpoint", "session handoff"],
      tokensFreed: 0,
    });

    return { checkpointData, reason };
  }

  getLog(): { timestamp: number; level: string; actions: string[]; tokensFreed: number }[] {
    return [...this.log];
  }
}

// ---------------------------------------------------------------------------
// CE-08: Dynamic Context Allocation
// ---------------------------------------------------------------------------

export interface AllocationProfile {
  name: string;
  complexity: "simple" | "standard" | "complex";
  standing: { min: number; max: number };
  session: { min: number; max: number };
  working: { min: number; max: number };
}

export class DynamicContextAllocator {
  private profiles: AllocationProfile[] = [
    {
      name: "simple",
      complexity: "simple",
      standing: { min: 15, max: 20 },
      session: { min: 40, max: 50 },
      working: { min: 30, max: 40 },
    },
    {
      name: "standard",
      complexity: "standard",
      standing: { min: 15, max: 25 },
      session: { min: 50, max: 65 },
      working: { min: 20, max: 30 },
    },
    {
      name: "complex",
      complexity: "complex",
      standing: { min: 20, max: 25 },
      session: { min: 55, max: 65 },
      working: { min: 15, max: 25 },
    },
  ];
  private currentComplexity: "simple" | "standard" | "complex" = "standard";
  private allocationLog: { timestamp: number; from: string; to: string; reason: string }[] = [];
  private readonly manager: ContextProfileManager;

  constructor(manager: ContextProfileManager) {
    this.manager = manager;
  }

  setComplexity(complexity: "simple" | "standard" | "complex"): void {
    const from = this.currentComplexity;
    if (from === complexity) return;

    this.currentComplexity = complexity;
    this.allocationLog.push({
      timestamp: Date.now(),
      from,
      to: complexity,
      reason: `Switched from ${from} to ${complexity}`,
    });
  }

  getCurrentProfile(): AllocationProfile {
    const profile = this.profiles.find((p) => p.complexity === this.currentComplexity);
    return profile ?? this.profiles[1]; // fallback to standard
  }

  addProfile(profile: AllocationProfile): void {
    // Replace if same name exists
    const index = this.profiles.findIndex((p) => p.name === profile.name);
    if (index >= 0) {
      this.profiles[index] = profile;
    } else {
      this.profiles.push(profile);
    }
  }

  getProfiles(): AllocationProfile[] {
    return [...this.profiles];
  }

  getAllocationLog(): { timestamp: number; from: string; to: string; reason: string }[] {
    return [...this.allocationLog];
  }
}

// ---------------------------------------------------------------------------
// CE-09: Context Preloading
// ---------------------------------------------------------------------------

export interface PreloadSource {
  type: "file-dependency" | "historical" | "skill-trigger" | "interface-contract";
  content: string;
  priority: number;
  tokenEstimate: number;
}

export class ContextPreloader {
  private predictions: Map<string, PreloadSource[]> = new Map();
  private feedbackLog: { source: string; used: boolean }[] = [];
  private readonly manager: ContextProfileManager;

  constructor(manager: ContextProfileManager) {
    this.manager = manager;
  }

  addPrediction(taskType: string, sources: PreloadSource[]): void {
    this.predictions.set(taskType, sources);
  }

  preload(taskType: string): { loaded: PreloadSource[]; skipped: PreloadSource[]; reason?: string } {
    const sources = this.predictions.get(taskType);
    if (!sources || sources.length === 0) {
      return { loaded: [], skipped: [], reason: "no predictions for task type" };
    }

    const loaded: PreloadSource[] = [];
    const skipped: PreloadSource[] = [];

    // Sort by priority descending — load highest priority first
    const sorted = [...sources].sort((a, b) => b.priority - a.priority);

    for (const source of sorted) {
      try {
        this.manager.addItem(ContextZone.Working, source.content, {
          priority: source.priority,
          source: `preload:${source.type}`,
          compressible: true,
        });
        loaded.push(source);
      } catch {
        skipped.push(source);
      }
    }

    const reason = skipped.length > 0 ? "some items skipped due to budget constraints" : undefined;
    return { loaded, skipped, reason };
  }

  recordFeedback(source: string, used: boolean): void {
    this.feedbackLog.push({ source, used });
  }

  getAccuracy(): number {
    if (this.feedbackLog.length === 0) return 0;
    const usedCount = this.feedbackLog.filter((f) => f.used).length;
    return (usedCount / this.feedbackLog.length) * 100;
  }

  getPredictions(taskType: string): PreloadSource[] {
    return this.predictions.get(taskType) ?? [];
  }
}

// ---------------------------------------------------------------------------
// CE-10: Context Audit Trail
// ---------------------------------------------------------------------------

export interface ContextSnapshot {
  id: string;
  timestamp: number;
  trigger: string;
  agentId: string;
  items: { id: string; zone: string; tokens: number; source: string }[];
  totalTokens: number;
  gaps: string[];
  compressionHistory: { itemId: string; action: string; timestamp: number }[];
}

export class ContextAuditTrail {
  private snapshots: ContextSnapshot[] = [];
  private compressionHistory: { itemId: string; action: string; timestamp: number }[] = [];
  private readonly manager: ContextProfileManager;

  constructor(manager: ContextProfileManager) {
    this.manager = manager;
  }

  capture(trigger: string, agentId: string, gaps?: string[]): ContextSnapshot {
    const allItems = this.manager.getItems();
    const snapshot: ContextSnapshot = {
      id: `snap_${randomUUID()}`,
      timestamp: Date.now(),
      trigger,
      agentId,
      items: allItems.map((item) => ({
        id: item.id,
        zone: item.zone,
        tokens: item.tokenCount,
        source: item.source,
      })),
      totalTokens: allItems.reduce((sum, i) => sum + i.tokenCount, 0),
      gaps: gaps ?? [],
      compressionHistory: [...this.compressionHistory],
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  getSnapshots(filter?: {
    agentId?: string;
    trigger?: string;
    since?: number;
  }): ContextSnapshot[] {
    if (!filter) return [...this.snapshots];

    return this.snapshots.filter((s) => {
      if (filter.agentId != null && s.agentId !== filter.agentId) return false;
      if (filter.trigger != null && s.trigger !== filter.trigger) return false;
      if (filter.since != null && s.timestamp < filter.since) return false;
      return true;
    });
  }

  getDiff(
    snapshotAId: string,
    snapshotBId: string,
  ): { added: string[]; removed: string[]; changed: string[] } {
    const snapA = this.snapshots.find((s) => s.id === snapshotAId);
    const snapB = this.snapshots.find((s) => s.id === snapshotBId);

    if (!snapA || !snapB) {
      return { added: [], removed: [], changed: [] };
    }

    const idsA = new Map(snapA.items.map((i) => [i.id, i]));
    const idsB = new Map(snapB.items.map((i) => [i.id, i]));

    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    for (const [id, itemB] of idsB) {
      if (!idsA.has(id)) {
        added.push(id);
      } else {
        const itemA = idsA.get(id)!;
        if (itemA.tokens !== itemB.tokens || itemA.zone !== itemB.zone) {
          changed.push(id);
        }
      }
    }

    for (const id of idsA.keys()) {
      if (!idsB.has(id)) {
        removed.push(id);
      }
    }

    return { added, removed, changed };
  }

  logCompression(itemId: string, action: string): void {
    this.compressionHistory.push({
      itemId,
      action,
      timestamp: Date.now(),
    });
  }

  getCompressionHistory(since?: number): { itemId: string; action: string; timestamp: number }[] {
    if (since != null) {
      return this.compressionHistory.filter((h) => h.timestamp >= since);
    }
    return [...this.compressionHistory];
  }
}
