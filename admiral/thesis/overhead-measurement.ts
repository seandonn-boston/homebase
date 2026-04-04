/**
 * Governance Overhead Measurement (TV-07)
 *
 * Measures the 5 categories of governance overhead:
 * hook latency, token consumption, delays, context overhead, interruptions.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HookLatencyRecord {
  hookId: string;
  latencyMs: number;
  timestamp: string;
}

export interface OverheadSnapshot {
  timestamp: string;
  hookLatency: PercentileStats;
  tokenOverhead: TokenOverhead;
  governanceDelays: DelayMetrics;
  contextOverhead: ContextOverhead;
  interruptionCost: InterruptionMetrics;
  overallRatio: number;
  withinHardCap: boolean;
}

export interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

export interface TokenOverhead {
  governanceTokens: number;
  totalTokens: number;
  ratio: number;
}

export interface DelayMetrics {
  hookWaitMs: number;
  escalationWaitMs: number;
  approvalWaitMs: number;
  totalDelayMs: number;
}

export interface ContextOverhead {
  standingContextTokens: number;
  constraintTokens: number;
  identityTokens: number;
  totalContextTokens: number;
  overheadPercent: number;
}

export interface InterruptionMetrics {
  interruptionCount: number;
  totalInterruptionMs: number;
  avgInterruptionMs: number;
}

// ---------------------------------------------------------------------------
// Overhead Tracker
// ---------------------------------------------------------------------------

const HARD_CAP_PERCENT = 25;

export class OverheadTracker {
  private hookLatencies: HookLatencyRecord[] = [];
  private governanceTokens = 0;
  private totalTokens = 0;
  private delays: DelayMetrics = { hookWaitMs: 0, escalationWaitMs: 0, approvalWaitMs: 0, totalDelayMs: 0 };
  private context: ContextOverhead = { standingContextTokens: 0, constraintTokens: 0, identityTokens: 0, totalContextTokens: 0, overheadPercent: 0 };
  private interruptions: { durationMs: number }[] = [];

  recordHookLatency(hookId: string, latencyMs: number): void {
    this.hookLatencies.push({ hookId, latencyMs, timestamp: new Date().toISOString() });
  }

  recordTokens(governance: number, total: number): void {
    this.governanceTokens += governance;
    this.totalTokens += total;
  }

  recordDelay(type: "hook" | "escalation" | "approval", ms: number): void {
    if (type === "hook") this.delays.hookWaitMs += ms;
    else if (type === "escalation") this.delays.escalationWaitMs += ms;
    else this.delays.approvalWaitMs += ms;
    this.delays.totalDelayMs = this.delays.hookWaitMs + this.delays.escalationWaitMs + this.delays.approvalWaitMs;
  }

  recordContext(standing: number, constraints: number, identity: number, totalContext: number): void {
    this.context = {
      standingContextTokens: standing,
      constraintTokens: constraints,
      identityTokens: identity,
      totalContextTokens: totalContext,
      overheadPercent: totalContext > 0 ? Math.round(((standing + constraints + identity) / totalContext) * 100) : 0,
    };
  }

  recordInterruption(durationMs: number): void {
    this.interruptions.push({ durationMs });
  }

  computeSnapshot(): OverheadSnapshot {
    const latencies = this.hookLatencies.map((r) => r.latencyMs).sort((a, b) => a - b);
    const hookLatency: PercentileStats = {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      count: latencies.length,
    };

    const tokenRatio = this.totalTokens > 0 ? this.governanceTokens / this.totalTokens : 0;
    const tokenOverhead: TokenOverhead = {
      governanceTokens: this.governanceTokens,
      totalTokens: this.totalTokens,
      ratio: Math.round(tokenRatio * 10000) / 100,
    };

    const totalInterruptMs = this.interruptions.reduce((s, i) => s + i.durationMs, 0);
    const interruptionCost: InterruptionMetrics = {
      interruptionCount: this.interruptions.length,
      totalInterruptionMs: totalInterruptMs,
      avgInterruptionMs: this.interruptions.length > 0 ? Math.round(totalInterruptMs / this.interruptions.length) : 0,
    };

    const overallRatio = Math.round(tokenRatio * 100 * 100) / 100;

    return {
      timestamp: new Date().toISOString(),
      hookLatency,
      tokenOverhead,
      governanceDelays: { ...this.delays },
      contextOverhead: { ...this.context },
      interruptionCost,
      overallRatio,
      withinHardCap: overallRatio <= HARD_CAP_PERCENT,
    };
  }

  getLatencyCount(): number {
    return this.hookLatencies.length;
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}
