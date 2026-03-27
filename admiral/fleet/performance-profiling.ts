/**
 * Agent Performance Profiling (IF-05)
 *
 * Per-agent profiling: token usage, first-pass quality, revision depth,
 * context utilization, brain query effectiveness. Trend reports.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentProfile {
  agentId: string;
  snapshots: PerformanceSnapshot[];
}

export interface PerformanceSnapshot {
  timestamp: string;
  tokenUsage: number;
  firstPassQualityRate: number;
  revisionDepth: number;
  contextUtilization: number;
  brainQueryEffectiveness: number;
}

export interface AgentTrend {
  agentId: string;
  snapshotCount: number;
  avgTokenUsage: number;
  avgFirstPassQuality: number;
  avgRevisionDepth: number;
  avgContextUtilization: number;
  avgBrainEffectiveness: number;
  trend: "improving" | "declining" | "stable" | "insufficient-data";
}

// ---------------------------------------------------------------------------
// Profiler
// ---------------------------------------------------------------------------

export class AgentProfiler {
  private profiles: Map<string, AgentProfile> = new Map();

  record(agentId: string, snapshot: PerformanceSnapshot): void {
    let profile = this.profiles.get(agentId);
    if (!profile) {
      profile = { agentId, snapshots: [] };
      this.profiles.set(agentId, profile);
    }
    profile.snapshots.push(snapshot);
  }

  getProfile(agentId: string): AgentProfile | undefined {
    return this.profiles.get(agentId);
  }

  computeTrend(agentId: string): AgentTrend {
    const profile = this.profiles.get(agentId);
    if (!profile || profile.snapshots.length < 3) {
      return {
        agentId, snapshotCount: profile?.snapshots.length ?? 0,
        avgTokenUsage: 0, avgFirstPassQuality: 0, avgRevisionDepth: 0,
        avgContextUtilization: 0, avgBrainEffectiveness: 0,
        trend: "insufficient-data",
      };
    }

    const s = profile.snapshots;
    const avg = (fn: (s: PerformanceSnapshot) => number) =>
      Math.round((s.reduce((acc, snap) => acc + fn(snap), 0) / s.length) * 100) / 100;

    const first3 = s.slice(0, 3);
    const last3 = s.slice(-3);
    const earlyQuality = first3.reduce((a, snap) => a + snap.firstPassQualityRate, 0) / 3;
    const lateQuality = last3.reduce((a, snap) => a + snap.firstPassQualityRate, 0) / 3;
    const delta = lateQuality - earlyQuality;
    const trend = delta > 3 ? "improving" : delta < -3 ? "declining" : "stable";

    return {
      agentId,
      snapshotCount: s.length,
      avgTokenUsage: avg((s) => s.tokenUsage),
      avgFirstPassQuality: avg((s) => s.firstPassQualityRate),
      avgRevisionDepth: avg((s) => s.revisionDepth),
      avgContextUtilization: avg((s) => s.contextUtilization),
      avgBrainEffectiveness: avg((s) => s.brainQueryEffectiveness),
      trend,
    };
  }

  listAgents(): string[] {
    return [...this.profiles.keys()];
  }

  getAgentCount(): number {
    return this.profiles.size;
  }
}
