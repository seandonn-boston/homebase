/**
 * Admiral Framework — Metrics Collection (OB-03)
 *
 * Prometheus-compatible metrics collection for all Admiral components.
 * Exposes hook latency histograms, pass/fail counters, event throughput,
 * brain query latency, active sessions, and governance overhead ratio.
 */

export interface Histogram {
  observe(value: number): void;
  getStats(): {
    count: number;
    sum: number;
    buckets: Array<{ le: number; count: number }>;
  };
}

export interface Counter {
  inc(labels?: Record<string, string>, value?: number): void;
  get(labels?: Record<string, string>): number;
  getAll(): Array<{ labels: Record<string, string>; value: number }>;
}

export interface Gauge {
  set(value: number): void;
  inc(value?: number): void;
  dec(value?: number): void;
  get(): number;
}

/** Simple histogram with configurable buckets */
class SimpleHistogram implements Histogram {
  private bucketBounds: number[];
  private bucketCounts: number[];
  private totalCount = 0;
  private totalSum = 0;

  constructor(buckets: number[]) {
    this.bucketBounds = [...buckets].sort((a, b) => a - b);
    this.bucketCounts = new Array(this.bucketBounds.length).fill(0);
  }

  observe(value: number): void {
    this.totalCount++;
    this.totalSum += value;
    for (let i = 0; i < this.bucketBounds.length; i++) {
      if (value <= this.bucketBounds[i]) {
        this.bucketCounts[i]++;
      }
    }
  }

  getStats() {
    return {
      count: this.totalCount,
      sum: this.totalSum,
      buckets: this.bucketBounds.map((le, i) => ({
        le,
        count: this.bucketCounts[i],
      })),
    };
  }
}

/** Simple counter with optional labels */
class SimpleCounter implements Counter {
  private values: Map<string, number> = new Map();

  private key(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return "";
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
  }

  inc(labels?: Record<string, string>, value = 1): void {
    const k = this.key(labels);
    this.values.set(k, (this.values.get(k) ?? 0) + value);
  }

  get(labels?: Record<string, string>): number {
    return this.values.get(this.key(labels)) ?? 0;
  }

  getAll(): Array<{ labels: Record<string, string>; value: number }> {
    return Array.from(this.values.entries()).map(([k, v]) => ({
      labels: k
        ? Object.fromEntries(
            k.split(",").map((pair) => {
              const [key, val] = pair.split("=");
              return [key, val.replace(/"/g, "")];
            }),
          )
        : {},
      value: v,
    }));
  }
}

/** Simple gauge */
class SimpleGauge implements Gauge {
  private value = 0;

  set(v: number): void {
    this.value = v;
  }
  inc(v = 1): void {
    this.value += v;
  }
  dec(v = 1): void {
    this.value -= v;
  }
  get(): number {
    return this.value;
  }
}

/** Default latency buckets (in ms) */
const LATENCY_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

export class MetricsCollector {
  // Hook metrics
  readonly hookLatency: Record<string, Histogram> = {};
  readonly hookResults: Counter = new SimpleCounter();
  // Event metrics
  readonly eventThroughput: Counter = new SimpleCounter();
  // Brain metrics
  readonly brainQueryLatency: Histogram = new SimpleHistogram(LATENCY_BUCKETS);
  readonly brainEntryCount: Gauge = new SimpleGauge();
  // Session metrics
  readonly activeSessions: Gauge = new SimpleGauge();
  // API metrics
  readonly apiLatency: Record<string, Histogram> = {};
  readonly apiRequests: Counter = new SimpleCounter();
  // Governance
  readonly governanceOverhead: Gauge = new SimpleGauge();

  /** Record a hook execution */
  recordHookExecution(
    hookName: string,
    durationMs: number,
    result: "pass" | "fail" | "error",
  ): void {
    if (!this.hookLatency[hookName]) {
      this.hookLatency[hookName] = new SimpleHistogram(LATENCY_BUCKETS);
    }
    this.hookLatency[hookName].observe(durationMs);
    this.hookResults.inc({ hook: hookName, result });
  }

  /** Record an event */
  recordEvent(eventType: string): void {
    this.eventThroughput.inc({ type: eventType });
  }

  /** Record a brain query */
  recordBrainQuery(durationMs: number): void {
    this.brainQueryLatency.observe(durationMs);
  }

  /** Record an API request */
  recordApiRequest(
    endpoint: string,
    durationMs: number,
    status: number,
  ): void {
    if (!this.apiLatency[endpoint]) {
      this.apiLatency[endpoint] = new SimpleHistogram(LATENCY_BUCKETS);
    }
    this.apiLatency[endpoint].observe(durationMs);
    this.apiRequests.inc({ endpoint, status: String(status) });
  }

  /** Render all metrics in Prometheus exposition format */
  toPrometheus(): string {
    const lines: string[] = [];

    // Hook latency histograms
    lines.push("# HELP admiral_hook_duration_ms Hook execution latency in milliseconds");
    lines.push("# TYPE admiral_hook_duration_ms histogram");
    for (const [hook, hist] of Object.entries(this.hookLatency)) {
      const stats = hist.getStats();
      for (const b of stats.buckets) {
        lines.push(
          `admiral_hook_duration_ms_bucket{hook="${hook}",le="${b.le}"} ${b.count}`,
        );
      }
      lines.push(
        `admiral_hook_duration_ms_bucket{hook="${hook}",le="+Inf"} ${stats.count}`,
      );
      lines.push(`admiral_hook_duration_ms_sum{hook="${hook}"} ${stats.sum}`);
      lines.push(
        `admiral_hook_duration_ms_count{hook="${hook}"} ${stats.count}`,
      );
    }

    // Hook results counter
    lines.push("# HELP admiral_hook_results_total Hook execution results");
    lines.push("# TYPE admiral_hook_results_total counter");
    for (const entry of this.hookResults.getAll()) {
      const labels = Object.entries(entry.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      lines.push(`admiral_hook_results_total{${labels}} ${entry.value}`);
    }

    // Event throughput
    lines.push("# HELP admiral_events_total Events processed");
    lines.push("# TYPE admiral_events_total counter");
    for (const entry of this.eventThroughput.getAll()) {
      const labels = Object.entries(entry.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      lines.push(`admiral_events_total{${labels}} ${entry.value}`);
    }

    // Brain query latency
    lines.push(
      "# HELP admiral_brain_query_duration_ms Brain query latency in milliseconds",
    );
    lines.push("# TYPE admiral_brain_query_duration_ms histogram");
    const bqStats = this.brainQueryLatency.getStats();
    for (const b of bqStats.buckets) {
      lines.push(
        `admiral_brain_query_duration_ms_bucket{le="${b.le}"} ${b.count}`,
      );
    }
    lines.push(
      `admiral_brain_query_duration_ms_bucket{le="+Inf"} ${bqStats.count}`,
    );
    lines.push(`admiral_brain_query_duration_ms_sum ${bqStats.sum}`);
    lines.push(`admiral_brain_query_duration_ms_count ${bqStats.count}`);

    // Brain entry count
    lines.push("# HELP admiral_brain_entries Brain entry count");
    lines.push("# TYPE admiral_brain_entries gauge");
    lines.push(`admiral_brain_entries ${this.brainEntryCount.get()}`);

    // Active sessions
    lines.push("# HELP admiral_active_sessions Active sessions");
    lines.push("# TYPE admiral_active_sessions gauge");
    lines.push(`admiral_active_sessions ${this.activeSessions.get()}`);

    // Governance overhead
    lines.push(
      "# HELP admiral_governance_overhead_ratio Governance overhead as ratio of total tokens",
    );
    lines.push("# TYPE admiral_governance_overhead_ratio gauge");
    lines.push(
      `admiral_governance_overhead_ratio ${this.governanceOverhead.get()}`,
    );

    // API latency
    lines.push(
      "# HELP admiral_api_duration_ms API request latency in milliseconds",
    );
    lines.push("# TYPE admiral_api_duration_ms histogram");
    for (const [endpoint, hist] of Object.entries(this.apiLatency)) {
      const stats = hist.getStats();
      for (const b of stats.buckets) {
        lines.push(
          `admiral_api_duration_ms_bucket{endpoint="${endpoint}",le="${b.le}"} ${b.count}`,
        );
      }
      lines.push(
        `admiral_api_duration_ms_bucket{endpoint="${endpoint}",le="+Inf"} ${stats.count}`,
      );
      lines.push(
        `admiral_api_duration_ms_sum{endpoint="${endpoint}"} ${stats.sum}`,
      );
      lines.push(
        `admiral_api_duration_ms_count{endpoint="${endpoint}"} ${stats.count}`,
      );
    }

    return lines.join("\n") + "\n";
  }
}
