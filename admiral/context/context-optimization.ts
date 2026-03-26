/**
 * Context Optimization (CE-02 to CE-05)
 *
 * Builds on ContextProfileManager to provide:
 *   CE-02: Budget tracking with threshold alerts and sacrifice ordering
 *   CE-03: Compression strategies (summarize, prioritize, evict)
 *   CE-04: Relevance scoring across five dimensions
 *   CE-05: Injection ordering (Loading Order Protocol)
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import {
  ContextProfileManager,
  ContextZone,
  type ContextItem,
} from "./context-profile";

// ---------------------------------------------------------------------------
// CE-02: Budget Tracker
// ---------------------------------------------------------------------------

const MAX_SNAPSHOTS = 500;

export interface BudgetSnapshot {
  timestamp: number;
  overall: { used: number; total: number; percent: number };
  byZone: Record<ContextZone, { used: number; max: number; percent: number }>;
}

export class ContextBudgetTracker {
  private readonly manager: ContextProfileManager;
  private snapshots: BudgetSnapshot[] = [];

  constructor(manager: ContextProfileManager) {
    this.manager = manager;
  }

  trackUsage(): BudgetSnapshot {
    const overall = this.manager.getOverallUtilization();
    const byZone = this.manager.getZoneUtilization();

    const snapshot: BudgetSnapshot = {
      timestamp: Date.now(),
      overall: { used: overall.used, total: overall.total, percent: overall.percent },
      byZone,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots.splice(0, this.snapshots.length - MAX_SNAPSHOTS);
    }
    return snapshot;
  }

  getHistorical(): BudgetSnapshot[] {
    return [...this.snapshots];
  }

  checkThresholds(): { warning: boolean; emergency: boolean; percentage: number } {
    const overall = this.manager.getOverallUtilization();
    return {
      warning: overall.percent >= 75,
      emergency: overall.percent >= 90,
      percentage: overall.percent,
    };
  }

  triggerSacrificeOrder(): ContextItem[] {
    if (!this.manager.isOverBudget()) return [];
    const overall = this.manager.getOverallUtilization();
    return this.manager.evictToFit(overall.total);
  }
}

// ---------------------------------------------------------------------------
// CE-03: Compression Strategies
// ---------------------------------------------------------------------------

export enum CompressionStrategy {
  Summarize = "summarize",
  Prioritize = "prioritize",
  Evict = "evict",
}

export class ContextCompressor {
  private readonly manager: ContextProfileManager;

  constructor(manager: ContextProfileManager) {
    this.manager = manager;
  }

  compress(
    strategy: CompressionStrategy,
    targetPercent: number,
  ): { removed: ContextItem[]; compressed: ContextItem[]; savedTokens: number } {
    const overall = this.manager.getOverallUtilization();
    const targetTokens = Math.floor(overall.total * (targetPercent / 100));
    const removed: ContextItem[] = [];
    const compressed: ContextItem[] = [];
    let savedTokens = 0;

    if (strategy === CompressionStrategy.Evict) {
      // Remove lowest-priority items until under target
      const evicted = this.manager.evictToFit(targetTokens);
      for (const item of evicted) {
        removed.push(item);
        savedTokens += item.tokenCount;
      }
    } else if (strategy === CompressionStrategy.Prioritize) {
      // Remove items below priority 30, then evict if still over
      const items = this.manager.getItems()
        .filter((i) => i.zone !== ContextZone.Standing && i.priority < 30);
      // Sort by priority ascending
      items.sort((a, b) => a.priority - b.priority);
      for (const item of items) {
        if (this.manager.getOverallUtilization().used <= targetTokens) break;
        this.manager.removeItem(item.id);
        removed.push(item);
        savedTokens += item.tokenCount;
      }
    } else if (strategy === CompressionStrategy.Summarize) {
      // "Summarize" compressible items by truncating content to ~50%
      const items = this.manager.getItems()
        .filter((i) => i.compressible)
        .sort((a, b) => a.priority - b.priority);

      for (const item of items) {
        if (this.manager.getOverallUtilization().used <= targetTokens) break;
        // Remove and re-add with truncated content
        const halfLen = Math.floor(item.content.length / 2);
        const truncated = item.content.substring(0, halfLen) + " [truncated]";
        this.manager.removeItem(item.id);
        const saved = item.tokenCount;
        const newItem = this.manager.addItem(item.zone, truncated, {
          priority: item.priority,
          source: item.source,
          compressible: item.compressible,
        });
        savedTokens += saved - newItem.tokenCount;
        compressed.push(newItem);
      }
    }

    return { removed, compressed, savedTokens };
  }

  autoCompress(): {
    strategy: CompressionStrategy;
    result: { removed: ContextItem[]; compressed: ContextItem[]; savedTokens: number };
  } {
    const overall = this.manager.getOverallUtilization();

    if (overall.percent < 85) {
      return {
        strategy: CompressionStrategy.Evict,
        result: { removed: [], compressed: [], savedTokens: 0 },
      };
    }

    // At 85%+: try summarize first, then prioritize, then evict
    if (overall.percent < 92) {
      const result = this.compress(CompressionStrategy.Summarize, 80);
      return { strategy: CompressionStrategy.Summarize, result };
    }

    if (overall.percent < 96) {
      const result = this.compress(CompressionStrategy.Prioritize, 80);
      return { strategy: CompressionStrategy.Prioritize, result };
    }

    const result = this.compress(CompressionStrategy.Evict, 80);
    return { strategy: CompressionStrategy.Evict, result };
  }
}

// ---------------------------------------------------------------------------
// CE-04: Relevance Scoring
// ---------------------------------------------------------------------------

export interface RelevanceScore {
  itemId: string;
  score: number;
  dimensions: {
    recency: number;
    frequency: number;
    semanticProximity: number;
    authorityWeight: number;
    dependency: number;
  };
}

export class RelevanceScorer {
  constructor() {}

  score(item: ContextItem, currentTask?: string): RelevanceScore {
    const recency = this.scoreRecency(item);
    const frequency = this.scoreFrequency(item);
    const semanticProximity = this.scoreSemanticProximity(item, currentTask);
    const authorityWeight = this.scoreAuthorityWeight(item);
    const dependency = this.scoreDependency(item);

    return {
      itemId: item.id,
      score: recency + frequency + semanticProximity + authorityWeight + dependency,
      dimensions: { recency, frequency, semanticProximity, authorityWeight, dependency },
    };
  }

  rankItems(items: ContextItem[], currentTask?: string): RelevanceScore[] {
    return items
      .map((item) => this.score(item, currentTask))
      .sort((a, b) => b.score - a.score);
  }

  // --- Dimension scorers (each returns 0-20) ---

  private scoreRecency(item: ContextItem): number {
    const ageMs = Date.now() - item.lastAccessed;
    const ageHours = ageMs / (1000 * 60 * 60);
    // < 1 hour = 20, decays linearly over 24 hours to 0
    return Math.max(0, Math.min(20, 20 - (ageHours / 24) * 20));
  }

  private scoreFrequency(item: ContextItem): number {
    // Use priority as a proxy for frequency (higher priority ≈ more frequently used)
    return Math.min(20, (item.priority / 100) * 20);
  }

  private scoreSemanticProximity(item: ContextItem, currentTask?: string): number {
    if (!currentTask) return 10; // neutral when no task context

    // Simple keyword overlap between item source/content and task description
    const taskWords = new Set(currentTask.toLowerCase().split(/\s+/));
    const itemWords = (item.source + " " + item.content.substring(0, 200))
      .toLowerCase()
      .split(/\s+/);

    let matches = 0;
    for (const word of itemWords) {
      if (word.length > 3 && taskWords.has(word)) matches++;
    }

    return Math.min(20, matches * 4);
  }

  private scoreAuthorityWeight(item: ContextItem): number {
    // Standing zone items have highest authority
    if (item.zone === ContextZone.Standing) return 20;
    if (item.zone === ContextZone.Session) return 12;
    return 6; // Working zone
  }

  private scoreDependency(item: ContextItem): number {
    // Required items get full dependency score, compressible items get less
    if (!item.compressible) return 20;
    // Higher priority items are more likely to be depended upon
    return Math.min(20, (item.priority / 100) * 15);
  }
}

// ---------------------------------------------------------------------------
// CE-05: Injection Ordering (Loading Order Protocol)
// ---------------------------------------------------------------------------

export class ContextInjector {
  private readonly manager: ContextProfileManager;
  private readonly scorer: RelevanceScorer;

  constructor(manager: ContextProfileManager, scorer: RelevanceScorer) {
    this.manager = manager;
    this.scorer = scorer;
  }

  assembleContext(currentTask?: string): { ordered: ContextItem[]; totalTokens: number } {
    const allItems = this.manager.getItems();

    // Group by zone
    const standing = allItems.filter((i) => i.zone === ContextZone.Standing);
    const session = allItems.filter((i) => i.zone === ContextZone.Session);
    const working = allItems.filter((i) => i.zone === ContextZone.Working);

    // Sort within each group by relevance (highest first)
    const sortByRelevance = (items: ContextItem[]): ContextItem[] => {
      const scores = this.scorer.rankItems(items, currentTask);
      const scoreMap = new Map(scores.map((s) => [s.itemId, s.score]));
      return [...items].sort(
        (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0),
      );
    };

    // Loading Order Protocol:
    //   1. Identity/constraints first (Standing zone — primacy)
    //   2. Reference in middle (Session zone)
    //   3. Task last (Working zone — recency)
    // Constraints always win over task context on conflict
    const ordered = [
      ...sortByRelevance(standing),
      ...sortByRelevance(session),
      ...sortByRelevance(working),
    ];

    const totalTokens = ordered.reduce((sum, item) => sum + item.tokenCount, 0);

    return { ordered, totalTokens };
  }
}
