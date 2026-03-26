/**
 * Context Profile (CE-01)
 *
 * Manages per-agent context budgets across three zones: Standing, Session, Working.
 * Enforces allocation limits, sacrifice ordering, and utilization warnings.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Enums & Interfaces
// ---------------------------------------------------------------------------

export enum ContextZone {
  Standing = "standing",
  Session = "session",
  Working = "working",
}

export interface ZoneAllocation {
  zone: ContextZone;
  percentMin: number;
  percentMax: number;
  currentTokens: number;
  maxTokens: number;
  hardLimit?: number;
}

export interface ContextItem {
  id: string;
  zone: ContextZone;
  content: string;
  tokenCount: number;
  priority: number; // 0-100
  source: string;
  addedAt: number;
  lastAccessed: number;
  compressible: boolean;
}

export interface ContextProfile {
  agentId: string;
  totalBudget: number;
  zones: Record<ContextZone, ZoneAllocation>;
  items: ContextItem[];
}

export interface AddItemOptions {
  priority?: number; // default 50
  source?: string;
  compressible?: boolean; // default true
}

// ---------------------------------------------------------------------------
// Default zone configuration
// ---------------------------------------------------------------------------

interface ZoneConfig {
  percentMin: number;
  percentMax: number;
  hardLimit?: number;
}

const DEFAULT_ZONE_CONFIG: Record<ContextZone, ZoneConfig> = {
  [ContextZone.Standing]: { percentMin: 15, percentMax: 25, hardLimit: 50_000 },
  [ContextZone.Session]: { percentMin: 50, percentMax: 65 },
  [ContextZone.Working]: { percentMin: 20, percentMax: 30 },
};

// ---------------------------------------------------------------------------
// ContextProfileManager
// ---------------------------------------------------------------------------

export class ContextProfileManager {
  private readonly agentId: string;
  private readonly totalBudget: number;
  private zones: Record<ContextZone, ZoneAllocation>;
  private items: ContextItem[] = [];

  constructor(agentId: string, totalBudget: number) {
    this.agentId = agentId;
    this.totalBudget = totalBudget;
    this.zones = this.buildZones(totalBudget);
  }

  private buildZones(budget: number): Record<ContextZone, ZoneAllocation> {
    const result = {} as Record<ContextZone, ZoneAllocation>;
    for (const zone of [ContextZone.Standing, ContextZone.Session, ContextZone.Working]) {
      const cfg = DEFAULT_ZONE_CONFIG[zone];
      const computedMax = Math.floor(budget * (cfg.percentMax / 100));
      result[zone] = {
        zone,
        percentMin: cfg.percentMin,
        percentMax: cfg.percentMax,
        currentTokens: 0,
        maxTokens: cfg.hardLimit != null ? Math.min(computedMax, cfg.hardLimit) : computedMax,
        hardLimit: cfg.hardLimit,
      };
    }
    return result;
  }

  // --- Add / Remove ---

  addItem(zone: ContextZone, content: string, options: AddItemOptions = {}): ContextItem {
    const tokenCount = this.estimateTokens(content);
    const allocation = this.zones[zone];

    if (allocation.currentTokens + tokenCount > allocation.maxTokens) {
      throw new Error(
        `Zone ${zone} would exceed budget: ${allocation.currentTokens + tokenCount}/${allocation.maxTokens}`,
      );
    }

    // Standing zone items are never compressible
    const compressible = zone === ContextZone.Standing ? false : (options.compressible ?? true);

    const now = Date.now();
    const item: ContextItem = {
      id: `ctx_${randomUUID()}`,
      zone,
      content,
      tokenCount,
      priority: options.priority ?? 50,
      source: options.source ?? "unknown",
      addedAt: now,
      lastAccessed: now,
      compressible,
    };

    this.items.push(item);
    allocation.currentTokens += tokenCount;
    return item;
  }

  removeItem(itemId: string): boolean {
    const index = this.items.findIndex((i) => i.id === itemId);
    if (index === -1) return false;

    const item = this.items[index];
    this.zones[item.zone].currentTokens -= item.tokenCount;
    this.items.splice(index, 1);
    return true;
  }

  // --- Utilization ---

  getZoneUtilization(): Record<ContextZone, { used: number; max: number; percent: number }> {
    const result = {} as Record<ContextZone, { used: number; max: number; percent: number }>;
    for (const zone of [ContextZone.Standing, ContextZone.Session, ContextZone.Working]) {
      const alloc = this.zones[zone];
      result[zone] = {
        used: alloc.currentTokens,
        max: alloc.maxTokens,
        percent: alloc.maxTokens > 0 ? (alloc.currentTokens / alloc.maxTokens) * 100 : 0,
      };
    }
    return result;
  }

  getOverallUtilization(): { used: number; total: number; percent: number } {
    let used = 0;
    for (const zone of [ContextZone.Standing, ContextZone.Session, ContextZone.Working]) {
      used += this.zones[zone].currentTokens;
    }
    return {
      used,
      total: this.totalBudget,
      percent: this.totalBudget > 0 ? (used / this.totalBudget) * 100 : 0,
    };
  }

  isOverBudget(): boolean {
    return this.getOverallUtilization().used > this.totalBudget;
  }

  // --- Sacrifice & Eviction ---

  /**
   * Returns items ordered by eviction priority:
   * 1. Working zone first, then Session, never Standing
   * 2. Within zone: compressible before non-compressible
   * 3. Within those: lowest priority first
   * 4. Ties: oldest first
   */
  getSacrificeOrder(): ContextItem[] {
    const zoneOrder: Record<ContextZone, number> = {
      [ContextZone.Working]: 0,
      [ContextZone.Session]: 1,
      [ContextZone.Standing]: 2,
    };

    return this.items
      .filter((item) => item.zone !== ContextZone.Standing)
      .sort((a, b) => {
        // Zone order
        const za = zoneOrder[a.zone];
        const zb = zoneOrder[b.zone];
        if (za !== zb) return za - zb;

        // Compressible first
        if (a.compressible !== b.compressible) return a.compressible ? -1 : 1;

        // Lowest priority first
        if (a.priority !== b.priority) return a.priority - b.priority;

        // Oldest first
        return a.addedAt - b.addedAt;
      });
  }

  /**
   * Evict items until total usage is at or below targetTokens.
   * Returns the evicted items.
   */
  evictToFit(targetTokens: number): ContextItem[] {
    const evicted: ContextItem[] = [];
    const sacrificeOrder = this.getSacrificeOrder();

    for (const item of sacrificeOrder) {
      if (this.getOverallUtilization().used <= targetTokens) break;
      this.removeItem(item.id);
      evicted.push(item);
    }

    return evicted;
  }

  // --- Query ---

  getItems(zone?: ContextZone): ContextItem[] {
    if (zone != null) {
      return this.items.filter((i) => i.zone === zone);
    }
    return [...this.items];
  }

  // --- Serialization ---

  serialize(): string {
    return JSON.stringify({
      agentId: this.agentId,
      totalBudget: this.totalBudget,
      zones: this.zones,
      items: this.items,
    });
  }

  static deserialize(json: string): ContextProfileManager {
    const data = JSON.parse(json) as ContextProfile;
    const manager = new ContextProfileManager(data.agentId, data.totalBudget);
    manager.zones = data.zones;
    manager.items = data.items;
    return manager;
  }

  // --- Token estimation ---

  /** Simple heuristic: ~4 chars per token (GPT-family average). */
  private estimateTokens(content: string): number {
    return Math.max(1, Math.ceil(content.length / 4));
  }
}
