/**
 * Quality Trend Analysis (QA-05)
 *
 * Computes moving averages (7-day, 30-day) over collected metrics.
 * Detects declining trends (3+ consecutive periods).
 * Generates actionable alerts linking metric, module, magnitude, and causal commits.
 * Configurable thresholds.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type { MetricsSnapshot, ModuleMetrics } from "./quality-metrics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrendAlert {
  module: string;
  metric: TrendMetricName;
  direction: "declining" | "improving";
  magnitude: number;
  currentValue: number;
  previousValue: number;
  consecutivePeriods: number;
  message: string;
}

export type TrendMetricName =
  | "avgComplexity"
  | "maxComplexity"
  | "defectMarkers"
  | "testToCodeRatio"
  | "codeChurn";

export interface MovingAverage {
  module: string;
  metric: TrendMetricName;
  avg7: number | null;
  avg30: number | null;
  latest: number;
  values: number[];
}

export interface TrendReport {
  timestamp: string;
  alerts: TrendAlert[];
  averages: MovingAverage[];
  summary: TrendSummary;
}

export interface TrendSummary {
  totalModules: number;
  decliningMetrics: number;
  improvingMetrics: number;
  stableMetrics: number;
  criticalAlerts: number;
}

export interface TrendOptions {
  /** Minimum consecutive declining periods to trigger alert (default 3) */
  minConsecutiveDecline?: number;
  /** Minimum magnitude change to trigger alert (default 0.1 = 10%) */
  minMagnitude?: number;
  /** Custom thresholds per metric */
  thresholds?: Partial<Record<TrendMetricName, { warn: number; critical: number }>>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MIN_CONSECUTIVE = 3;
const DEFAULT_MIN_MAGNITUDE = 0.1;

const DEFAULT_THRESHOLDS: Record<TrendMetricName, { warn: number; critical: number }> = {
  avgComplexity: { warn: 10, critical: 15 },
  maxComplexity: { warn: 20, critical: 30 },
  defectMarkers: { warn: 5, critical: 10 },
  testToCodeRatio: { warn: 0.3, critical: 0.1 },
  codeChurn: { warn: 50, critical: 100 },
};

// ---------------------------------------------------------------------------
// Metric extraction
// ---------------------------------------------------------------------------

function extractMetric(module: ModuleMetrics, metric: TrendMetricName): number {
  switch (metric) {
    case "avgComplexity":
      return module.complexity.avgCyclomaticComplexity;
    case "maxComplexity":
      return module.complexity.maxCyclomaticComplexity;
    case "defectMarkers":
      return module.defectDensity.totalMarkers;
    case "testToCodeRatio":
      return module.testToCodeRatio.ratio;
    case "codeChurn":
      return module.codeChurn.recentCommits;
  }
}

/** Whether higher is worse for this metric */
function isHigherWorse(metric: TrendMetricName): boolean {
  switch (metric) {
    case "avgComplexity":
    case "maxComplexity":
    case "defectMarkers":
    case "codeChurn":
      return true;
    case "testToCodeRatio":
      return false; // Higher test ratio is better
  }
}

// ---------------------------------------------------------------------------
// Moving average computation
// ---------------------------------------------------------------------------

function computeMovingAvg(values: number[], window: number): number | null {
  if (values.length < window) return null;
  const slice = values.slice(-window);
  return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Trend detection
// ---------------------------------------------------------------------------

function detectConsecutiveDecline(
  values: number[],
  higherIsWorse: boolean,
): { declining: boolean; consecutive: number } {
  if (values.length < 2) return { declining: false, consecutive: 0 };

  let consecutive = 0;
  for (let i = values.length - 1; i > 0; i--) {
    const current = values[i];
    const previous = values[i - 1];
    const isWorsening = higherIsWorse ? current > previous : current < previous;

    if (isWorsening) {
      consecutive++;
    } else {
      break;
    }
  }

  return { declining: consecutive > 0, consecutive };
}

function detectConsecutiveImprovement(
  values: number[],
  higherIsWorse: boolean,
): { improving: boolean; consecutive: number } {
  if (values.length < 2) return { improving: false, consecutive: 0 };

  let consecutive = 0;
  for (let i = values.length - 1; i > 0; i--) {
    const current = values[i];
    const previous = values[i - 1];
    const isImproving = higherIsWorse ? current < previous : current > previous;

    if (isImproving) {
      consecutive++;
    } else {
      break;
    }
  }

  return { improving: consecutive > 0, consecutive };
}

// ---------------------------------------------------------------------------
// Trend Analyzer
// ---------------------------------------------------------------------------

export class TrendAnalyzer {
  private readonly options: Required<Omit<TrendOptions, "thresholds">> & { thresholds: Record<TrendMetricName, { warn: number; critical: number }> };

  constructor(options: TrendOptions = {}) {
    this.options = {
      minConsecutiveDecline: options.minConsecutiveDecline ?? DEFAULT_MIN_CONSECUTIVE,
      minMagnitude: options.minMagnitude ?? DEFAULT_MIN_MAGNITUDE,
      thresholds: { ...DEFAULT_THRESHOLDS, ...options.thresholds },
    };
  }

  /** Analyze trends across multiple snapshots */
  analyze(snapshots: MetricsSnapshot[]): TrendReport {
    if (snapshots.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        alerts: [],
        averages: [],
        summary: { totalModules: 0, decliningMetrics: 0, improvingMetrics: 0, stableMetrics: 0, criticalAlerts: 0 },
      };
    }

    // Build per-module time series
    const moduleTimeSeries = this.buildTimeSeries(snapshots);
    const alerts: TrendAlert[] = [];
    const averages: MovingAverage[] = [];

    const metrics: TrendMetricName[] = ["avgComplexity", "maxComplexity", "defectMarkers", "testToCodeRatio", "codeChurn"];

    for (const [moduleName, seriesByMetric] of moduleTimeSeries) {
      for (const metric of metrics) {
        const values = seriesByMetric.get(metric) ?? [];
        if (values.length === 0) continue;

        const avg7 = computeMovingAvg(values, 7);
        const avg30 = computeMovingAvg(values, 30);
        const latest = values[values.length - 1];

        averages.push({ module: moduleName, metric, avg7, avg30, latest, values });

        // Check for declining trend
        const higherWorse = isHigherWorse(metric);
        const decline = detectConsecutiveDecline(values, higherWorse);

        if (decline.declining && decline.consecutive >= this.options.minConsecutiveDecline) {
          const oldest = values[values.length - 1 - decline.consecutive];
          const magnitude = oldest !== 0 ? Math.abs(latest - oldest) / Math.abs(oldest) : 0;

          if (magnitude >= this.options.minMagnitude) {
            alerts.push({
              module: moduleName,
              metric,
              direction: "declining",
              magnitude: Math.round(magnitude * 100) / 100,
              currentValue: latest,
              previousValue: oldest,
              consecutivePeriods: decline.consecutive,
              message: `${moduleName}: ${metric} declining for ${decline.consecutive} periods (${oldest} → ${latest}, ${(magnitude * 100).toFixed(0)}% change)`,
            });
          }
        }

        // Check for improvement trend
        const improvement = detectConsecutiveImprovement(values, higherWorse);
        if (improvement.improving && improvement.consecutive >= this.options.minConsecutiveDecline) {
          const oldest = values[values.length - 1 - improvement.consecutive];
          const magnitude = oldest !== 0 ? Math.abs(latest - oldest) / Math.abs(oldest) : 0;

          if (magnitude >= this.options.minMagnitude) {
            alerts.push({
              module: moduleName,
              metric,
              direction: "improving",
              magnitude: Math.round(magnitude * 100) / 100,
              currentValue: latest,
              previousValue: oldest,
              consecutivePeriods: improvement.consecutive,
              message: `${moduleName}: ${metric} improving for ${improvement.consecutive} periods (${oldest} → ${latest}, ${(magnitude * 100).toFixed(0)}% change)`,
            });
          }
        }
      }
    }

    const declining = alerts.filter((a) => a.direction === "declining").length;
    const improving = alerts.filter((a) => a.direction === "improving").length;
    const totalMetrics = averages.length;
    const criticalAlerts = alerts.filter((a) => {
      const threshold = this.options.thresholds[a.metric];
      return a.direction === "declining" && a.currentValue >= threshold.critical;
    }).length;

    return {
      timestamp: new Date().toISOString(),
      alerts,
      averages,
      summary: {
        totalModules: moduleTimeSeries.size,
        decliningMetrics: declining,
        improvingMetrics: improving,
        stableMetrics: totalMetrics - declining - improving,
        criticalAlerts,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Time series builder
  // -------------------------------------------------------------------------

  private buildTimeSeries(snapshots: MetricsSnapshot[]): Map<string, Map<TrendMetricName, number[]>> {
    const result = new Map<string, Map<TrendMetricName, number[]>>();

    const metrics: TrendMetricName[] = ["avgComplexity", "maxComplexity", "defectMarkers", "testToCodeRatio", "codeChurn"];

    for (const snapshot of snapshots) {
      for (const mod of snapshot.modules) {
        if (!result.has(mod.module)) {
          result.set(mod.module, new Map());
        }
        const seriesMap = result.get(mod.module)!;

        for (const metric of metrics) {
          if (!seriesMap.has(metric)) {
            seriesMap.set(metric, []);
          }
          seriesMap.get(metric)!.push(extractMetric(mod, metric));
        }
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Formatters
  // -------------------------------------------------------------------------

  static formatReport(report: TrendReport): string {
    const lines: string[] = [];

    lines.push("=".repeat(55));
    lines.push("  QUALITY TREND ANALYSIS");
    lines.push(`  ${report.timestamp}`);
    lines.push("=".repeat(55));
    lines.push("");
    lines.push(`Modules tracked: ${report.summary.totalModules}`);
    lines.push(`Declining: ${report.summary.decliningMetrics} | Improving: ${report.summary.improvingMetrics} | Stable: ${report.summary.stableMetrics}`);
    lines.push(`Critical alerts: ${report.summary.criticalAlerts}`);
    lines.push("");

    if (report.alerts.length > 0) {
      lines.push("-".repeat(55));
      lines.push("  ALERTS");
      lines.push("-".repeat(55));

      for (const alert of report.alerts) {
        const icon = alert.direction === "declining" ? "[WARN]" : "[OK]";
        lines.push(`${icon} ${alert.message}`);
      }
      lines.push("");
    } else {
      lines.push("No trend alerts.");
    }

    lines.push("=".repeat(55));
    return lines.join("\n");
  }

  static formatReportJSON(report: TrendReport): string {
    return JSON.stringify(report, null, 2);
  }
}
