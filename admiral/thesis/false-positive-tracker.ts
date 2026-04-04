/**
 * False Positive Tracking (TV-06)
 *
 * Tracks every governance false positive with per-incident details
 * and aggregate metrics.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FalsePositiveIncident {
  id: string;
  timestamp: string;
  hookId: string;
  actionBlocked: string;
  whyLegitimate: string;
  blockedDurationMs: number;
  workaround: string;
  hookTuned: boolean;
  severity: "high" | "medium" | "low";
}

export interface FalsePositiveMetrics {
  totalIncidents: number;
  byHook: Record<string, number>;
  falsePositiveRate: number;
  totalBlockedMs: number;
  totalBlockedHours: number;
  avgResolutionMs: number;
  hooksTuned: number;
}

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

export class FalsePositiveTracker {
  private incidents: FalsePositiveIncident[] = [];
  private totalHookFirings = 0;

  recordIncident(incident: Omit<FalsePositiveIncident, "id" | "timestamp">): FalsePositiveIncident {
    const full: FalsePositiveIncident = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...incident,
    };
    this.incidents.push(full);
    return full;
  }

  recordHookFiring(): void {
    this.totalHookFirings++;
  }

  recordHookFirings(count: number): void {
    this.totalHookFirings += count;
  }

  computeMetrics(): FalsePositiveMetrics {
    const byHook: Record<string, number> = {};
    let totalBlocked = 0;

    for (const inc of this.incidents) {
      byHook[inc.hookId] = (byHook[inc.hookId] ?? 0) + 1;
      totalBlocked += inc.blockedDurationMs;
    }

    const total = this.incidents.length;
    return {
      totalIncidents: total,
      byHook,
      falsePositiveRate: this.totalHookFirings > 0
        ? Math.round((total / this.totalHookFirings) * 10000) / 100
        : 0,
      totalBlockedMs: totalBlocked,
      totalBlockedHours: Math.round((totalBlocked / 3600000) * 100) / 100,
      avgResolutionMs: total > 0 ? Math.round(totalBlocked / total) : 0,
      hooksTuned: this.incidents.filter((i) => i.hookTuned).length,
    };
  }

  getIncidents(): readonly FalsePositiveIncident[] {
    return this.incidents;
  }

  getIncidentCount(): number {
    return this.incidents.length;
  }
}
