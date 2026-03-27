/**
 * Hook Execution Profiling (X-04)
 *
 * Instrument hooks to record timing and subprocess calls.
 * Produce p50/p95/p99 execution times per hook type.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HookTiming {
  hookName: string;
  latencyMs: number;
  subprocessCalls: number;
  timestamp: string;
}

export interface HookProfile {
  hookName: string;
  sampleCount: number;
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  max: number;
  avgSubprocessCalls: number;
  bottleneck: boolean;
}

export interface ProfilingReport {
  timestamp: string;
  hooks: HookProfile[];
  totalSamples: number;
  slowestHook: string | null;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Profiler
// ---------------------------------------------------------------------------

export class HookProfiler {
  private timings: Map<string, HookTiming[]> = new Map();
  private bottleneckThresholdMs: number;

  constructor(bottleneckThresholdMs = 100) {
    this.bottleneckThresholdMs = bottleneckThresholdMs;
  }

  record(timing: HookTiming): void {
    let list = this.timings.get(timing.hookName);
    if (!list) {
      list = [];
      this.timings.set(timing.hookName, list);
    }
    list.push(timing);
  }

  profile(hookName: string): HookProfile | null {
    const timings = this.timings.get(hookName);
    if (!timings || timings.length === 0) return null;

    const latencies = timings.map((t) => t.latencyMs).sort((a, b) => a - b);
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p99 = percentile(latencies, 99);

    return {
      hookName,
      sampleCount: timings.length,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99,
      mean: Math.round(mean * 100) / 100,
      max: latencies[latencies.length - 1],
      avgSubprocessCalls: Math.round(
        (timings.reduce((a, t) => a + t.subprocessCalls, 0) / timings.length) * 100,
      ) / 100,
      bottleneck: p99 > this.bottleneckThresholdMs,
    };
  }

  generateReport(): ProfilingReport {
    const hooks: HookProfile[] = [];
    for (const hookName of this.timings.keys()) {
      const profile = this.profile(hookName);
      if (profile) hooks.push(profile);
    }
    hooks.sort((a, b) => b.p99 - a.p99);

    const recommendations: string[] = [];
    for (const h of hooks) {
      if (h.bottleneck) {
        recommendations.push(`${h.hookName}: p99=${h.p99}ms exceeds ${this.bottleneckThresholdMs}ms threshold. ` +
          `Avg subprocess calls: ${h.avgSubprocessCalls}. Consider reducing subprocess invocations.`);
      }
    }

    return {
      timestamp: new Date().toISOString(),
      hooks,
      totalSamples: hooks.reduce((s, h) => s + h.sampleCount, 0),
      slowestHook: hooks.length > 0 ? hooks[0].hookName : null,
      recommendations,
    };
  }

  getHookCount(): number {
    return this.timings.size;
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}
