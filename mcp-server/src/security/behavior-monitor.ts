/**
 * Behavior Monitor (M-10)
 *
 * Statistical baseline tracking with anomaly detection for MCP server tools.
 * Uses running mean/variance for memory-efficient baseline computation.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BehaviorBaseline {
  serverId: string;
  toolName: string;
  avgResponseSize: number;
  avgLatencyMs: number;
  avgEgressBytes: number;
  errorRate: number;
  sampleCount: number;
  lastUpdated: number;
}

export interface BehaviorAnomaly {
  type: "shadow_tool" | "exfiltration" | "c2_pattern" | "covert_channel" | "response_size" | "latency";
  serverId: string;
  tool: string;
  expected: number;
  actual: number;
  deviation: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Internal running stats
// ---------------------------------------------------------------------------

interface RunningStats {
  mean: number;
  m2: number;   // sum of squares of differences from current mean
  count: number;
}

function pushStat(stats: RunningStats, value: number): void {
  stats.count++;
  const delta = value - stats.mean;
  stats.mean += delta / stats.count;
  const delta2 = value - stats.mean;
  stats.m2 += delta * delta2;
}

function stddev(stats: RunningStats): number {
  if (stats.count < 2) return 0;
  return Math.sqrt(stats.m2 / (stats.count - 1));
}

// ---------------------------------------------------------------------------
// Internal tool stats
// ---------------------------------------------------------------------------

interface ToolStats {
  responseSize: RunningStats;
  latencyMs: RunningStats;
  egressBytes: RunningStats;
  errors: number;
  total: number;
  lastUpdated: number;
}

function createToolStats(): ToolStats {
  return {
    responseSize: { mean: 0, m2: 0, count: 0 },
    latencyMs: { mean: 0, m2: 0, count: 0 },
    egressBytes: { mean: 0, m2: 0, count: 0 },
    errors: 0,
    total: 0,
    lastUpdated: 0,
  };
}

const MAX_ANOMALIES = 1000;

// ---------------------------------------------------------------------------
// BehaviorMonitor
// ---------------------------------------------------------------------------

export class BehaviorMonitor {
  private stats: Map<string, ToolStats> = new Map();
  private anomalies: BehaviorAnomaly[] = [];
  private deviationThreshold: number;

  constructor(deviationThreshold: number = 3.0) {
    this.deviationThreshold = deviationThreshold;
  }

  private key(serverId: string, tool: string): string {
    return `${serverId}::${tool}`;
  }

  recordObservation(
    serverId: string,
    tool: string,
    metrics: { responseSize: number; latencyMs: number; egressBytes: number; error: boolean },
  ): void {
    const k = this.key(serverId, tool);
    let ts = this.stats.get(k);
    if (!ts) {
      ts = createToolStats();
      this.stats.set(k, ts);
    }

    ts.total++;
    if (metrics.error) ts.errors++;
    ts.lastUpdated = Date.now();

    // Check anomalies before updating baseline (so we compare against prior baseline)
    if (ts.responseSize.count >= 5) {
      const sd = stddev(ts.responseSize);
      if (sd > 0) {
        const dev = Math.abs(metrics.responseSize - ts.responseSize.mean) / sd;
        if (dev >= this.deviationThreshold) {
          this.anomalies.push({
            type: "response_size",
            serverId,
            tool,
            expected: ts.responseSize.mean,
            actual: metrics.responseSize,
            deviation: dev,
            timestamp: Date.now(),
          });
        }
      }
    }

    if (ts.latencyMs.count >= 5) {
      const sd = stddev(ts.latencyMs);
      if (sd > 0) {
        const dev = Math.abs(metrics.latencyMs - ts.latencyMs.mean) / sd;
        if (dev >= this.deviationThreshold) {
          this.anomalies.push({
            type: "latency",
            serverId,
            tool,
            expected: ts.latencyMs.mean,
            actual: metrics.latencyMs,
            deviation: dev,
            timestamp: Date.now(),
          });
        }
      }
    }

    if (ts.egressBytes.count >= 5) {
      const sd = stddev(ts.egressBytes);
      if (sd > 0) {
        const dev = Math.abs(metrics.egressBytes - ts.egressBytes.mean) / sd;
        if (dev >= this.deviationThreshold) {
          this.anomalies.push({
            type: "exfiltration",
            serverId,
            tool,
            expected: ts.egressBytes.mean,
            actual: metrics.egressBytes,
            deviation: dev,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Trim anomalies to bounded size
    if (this.anomalies.length > MAX_ANOMALIES) {
      this.anomalies.splice(0, this.anomalies.length - MAX_ANOMALIES);
    }

    // Update baselines
    pushStat(ts.responseSize, metrics.responseSize);
    pushStat(ts.latencyMs, metrics.latencyMs);
    pushStat(ts.egressBytes, metrics.egressBytes);
  }

  getBaseline(serverId: string, tool: string): BehaviorBaseline | undefined {
    const ts = this.stats.get(this.key(serverId, tool));
    if (!ts) return undefined;

    return {
      serverId,
      toolName: tool,
      avgResponseSize: ts.responseSize.mean,
      avgLatencyMs: ts.latencyMs.mean,
      avgEgressBytes: ts.egressBytes.mean,
      errorRate: ts.total > 0 ? ts.errors / ts.total : 0,
      sampleCount: ts.total,
      lastUpdated: ts.lastUpdated,
    };
  }

  checkAnomalies(serverId: string, tool: string): BehaviorAnomaly[] {
    return this.anomalies.filter(
      (a) => a.serverId === serverId && a.tool === tool,
    );
  }

  resetBaseline(serverId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.stats.keys()) {
      if (key.startsWith(`${serverId}::`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.stats.delete(key);
    }
    this.anomalies = this.anomalies.filter((a) => a.serverId !== serverId);
  }

  getAllAnomalies(): BehaviorAnomaly[] {
    return [...this.anomalies];
  }
}
