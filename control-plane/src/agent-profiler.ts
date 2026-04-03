/**
 * Admiral Framework — Agent Performance Profiler (IF-05)
 *
 * Per-agent profiling: token usage, quality rate, revision depth,
 * time distribution, authority tier usage, and brain query effectiveness.
 */

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface ProfileSample {
  timestamp: string;
  taskId: string;
  tokensUsed: TokenUsage;
  durationMs: number;
  revisions: number;
  qualityScore: number; // 0-1
  authorityTier: number;
  brainQueries: number;
  brainHits: number; // queries that returned useful results
}

export interface AgentProfile {
  agentId: string;
  samples: ProfileSample[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSummary {
  agentId: string;
  sampleCount: number;
  avgTokensPerTask: number;
  avgDurationMs: number;
  avgRevisionDepth: number;
  qualityRate: number;
  authorityTierDistribution: Record<number, number>;
  brainQueryEffectiveness: number; // hit rate 0-1
  tokenEfficiency: number; // quality per 1000 tokens
}

const MAX_SAMPLES_PER_AGENT = 10_000;

/**
 * Profiles agent performance across multiple dimensions.
 */
export class AgentProfiler {
  private profiles: Map<string, AgentProfile> = new Map();

  /**
   * Record a performance sample for an agent.
   */
  record(agentId: string, sample: Omit<ProfileSample, "timestamp">): ProfileSample {
    const full: ProfileSample = {
      ...sample,
      timestamp: new Date().toISOString(),
    };

    let profile = this.profiles.get(agentId);
    if (!profile) {
      profile = {
        agentId,
        samples: [],
        createdAt: full.timestamp,
        updatedAt: full.timestamp,
      };
      this.profiles.set(agentId, profile);
    }

    if (profile.samples.length >= MAX_SAMPLES_PER_AGENT) {
      // Drop oldest 10%
      const drop = Math.floor(MAX_SAMPLES_PER_AGENT * 0.1);
      profile.samples = profile.samples.slice(drop);
    }

    profile.samples.push(full);
    profile.updatedAt = full.timestamp;
    return full;
  }

  /**
   * Generate a summary for the given agent.
   */
  summarize(agentId: string): ProfileSummary | undefined {
    const profile = this.profiles.get(agentId);
    if (!profile || profile.samples.length === 0) return undefined;

    const { samples } = profile;
    const n = samples.length;

    const totalTokens = samples.reduce((s, p) => s + p.tokensUsed.total, 0);
    const totalDuration = samples.reduce((s, p) => s + p.durationMs, 0);
    const totalRevisions = samples.reduce((s, p) => s + p.revisions, 0);
    const totalQuality = samples.reduce((s, p) => s + p.qualityScore, 0);
    const totalBrainQueries = samples.reduce((s, p) => s + p.brainQueries, 0);
    const totalBrainHits = samples.reduce((s, p) => s + p.brainHits, 0);

    const tierDist: Record<number, number> = {};
    for (const s of samples) {
      tierDist[s.authorityTier] = (tierDist[s.authorityTier] ?? 0) + 1;
    }

    const avgTokens = totalTokens / n;
    const qualityRate = totalQuality / n;

    return {
      agentId,
      sampleCount: n,
      avgTokensPerTask: Math.round(avgTokens),
      avgDurationMs: Math.round(totalDuration / n),
      avgRevisionDepth: Number((totalRevisions / n).toFixed(2)),
      qualityRate: Number(qualityRate.toFixed(3)),
      authorityTierDistribution: tierDist,
      brainQueryEffectiveness:
        totalBrainQueries > 0 ? Number((totalBrainHits / totalBrainQueries).toFixed(3)) : 0,
      tokenEfficiency: avgTokens > 0 ? Number(((qualityRate * 1000) / avgTokens).toFixed(4)) : 0,
    };
  }

  /**
   * Compare two agents across key metrics.
   */
  compare(agentA: string, agentB: string): { a: ProfileSummary; b: ProfileSummary } | undefined {
    const a = this.summarize(agentA);
    const b = this.summarize(agentB);
    if (!a || !b) return undefined;
    return { a, b };
  }

  /**
   * Get the last N samples for an agent.
   */
  recentSamples(agentId: string, count = 10): ProfileSample[] {
    const profile = this.profiles.get(agentId);
    if (!profile) return [];
    return profile.samples.slice(-count);
  }

  /**
   * List all profiled agents.
   */
  listAgents(): string[] {
    return [...this.profiles.keys()];
  }

  /**
   * Clear all samples for an agent.
   */
  clear(agentId: string): void {
    this.profiles.delete(agentId);
  }
}
