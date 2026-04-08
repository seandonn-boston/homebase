/**
 * Performance Regression Detection (OB-10)
 *
 * Compares current metrics against statistical baselines (rolling
 * averages + stddev). Detects > 20% latency increase or > 20%
 * throughput decrease.
 */

export interface MetricBaseline {
  name: string;
  mean: number;
  stddev: number;
  sampleCount: number;
  lastUpdated: number;
}

export interface RegressionResult {
  metric: string;
  current: number;
  baseline: MetricBaseline;
  deviation: number;
  percentChange: number;
  isRegression: boolean;
  severity: "none" | "warning" | "critical";
}

export class PerfRegressionDetector {
  private baselines: Map<string, MetricBaseline> = new Map();
  private warningThreshold: number;
  private criticalThreshold: number;

  constructor(warningThreshold = 0.2, criticalThreshold = 0.5) {
    this.warningThreshold = warningThreshold;
    this.criticalThreshold = criticalThreshold;
  }

  updateBaseline(name: string, values: number[]): MetricBaseline {
    if (values.length === 0) throw new Error("Cannot compute baseline from empty values");

    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);

    const baseline: MetricBaseline = {
      name,
      mean,
      stddev,
      sampleCount: values.length,
      lastUpdated: Date.now(),
    };

    this.baselines.set(name, baseline);
    return baseline;
  }

  check(name: string, currentValue: number): RegressionResult {
    const baseline = this.baselines.get(name);
    if (!baseline) {
      return {
        metric: name,
        current: currentValue,
        baseline: { name, mean: currentValue, stddev: 0, sampleCount: 0, lastUpdated: 0 },
        deviation: 0,
        percentChange: 0,
        isRegression: false,
        severity: "none",
      };
    }

    const deviation = baseline.stddev > 0 ? (currentValue - baseline.mean) / baseline.stddev : 0;
    const percentChange = baseline.mean > 0 ? (currentValue - baseline.mean) / baseline.mean : 0;

    let severity: "none" | "warning" | "critical" = "none";
    let isRegression = false;

    if (Math.abs(percentChange) >= this.criticalThreshold) {
      severity = "critical";
      isRegression = true;
    } else if (Math.abs(percentChange) >= this.warningThreshold) {
      severity = "warning";
      isRegression = true;
    }

    return {
      metric: name,
      current: currentValue,
      baseline,
      deviation,
      percentChange,
      isRegression,
      severity,
    };
  }

  checkAll(metrics: Record<string, number>): RegressionResult[] {
    return Object.entries(metrics).map(([name, value]) => this.check(name, value));
  }

  getBaseline(name: string): MetricBaseline | undefined {
    return this.baselines.get(name);
  }

  getAllBaselines(): MetricBaseline[] {
    return Array.from(this.baselines.values());
  }
}
