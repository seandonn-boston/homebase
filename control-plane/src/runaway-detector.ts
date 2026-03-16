/**
 * Admiral Runaway Detection
 *
 * Watches the event stream and detects common agent failure patterns:
 * - Repeated tool calls (loops)
 * - Recursive task creation (fork bombs)
 * - Token budget spikes
 * - Statistical process control (SPC) — detects behavioral drift
 *   using control charts rather than fixed thresholds
 *
 * When a pattern is detected, Admiral emits an alert and optionally
 * pauses the offending agent.
 */

import * as fs from "node:fs";
import type { AgentEvent, EventStream } from "./events";

export interface Alert {
  id: string;
  timestamp: number;
  type: "loop_detected" | "recursive_tasks" | "token_spike" | "spc_violation";
  severity: "warning" | "critical";
  agentId: string;
  agentName: string;
  message: string;
  details: Record<string, unknown>;
  resolved: boolean;
}

export interface DetectorConfig {
  /** Max repeated identical tool calls before alert (default: 5) */
  maxRepeatedToolCalls: number;
  /** Time window in ms to check for repeated calls (default: 30000) */
  repeatWindowMs: number;
  /** Max subtasks created by one agent in a window before alert (default: 10) */
  maxSubtasks: number;
  /** Time window in ms for subtask creation (default: 60000) */
  subtaskWindowMs: number;
  /** Token spend per minute that triggers alert (default: 50000) */
  tokenSpikePerMinute: number;
  /** Enable SPC-based anomaly detection (default: true) */
  spcEnabled: boolean;
  /** Minimum samples before SPC analysis activates (default: 10) */
  spcMinSamples: number;
  /** SPC sampling interval in ms (default: 60000 — one sample per minute) */
  spcIntervalMs: number;
  /** Number of standard deviations for control limits (default: 3) */
  spcSigmaLimit: number;
  /** Called when an alert fires — return true to pause the agent */
  onAlert?: (alert: Alert) => boolean | Promise<boolean>;
}

const DEFAULT_CONFIG: DetectorConfig = {
  maxRepeatedToolCalls: 5,
  repeatWindowMs: 30_000,
  maxSubtasks: 10,
  subtaskWindowMs: 60_000,
  tokenSpikePerMinute: 50_000,
  spcEnabled: true,
  spcMinSamples: 10,
  spcIntervalMs: 60_000,
  spcSigmaLimit: 3,
};

// ---------------------------------------------------------------------------
// Statistical Process Control (SPC)
//
// Instead of fixed thresholds, SPC builds a model of "normal" from observed
// behavior and detects when the process leaves its characteristic pattern.
// This catches gradual drift that fixed thresholds miss, and avoids false
// positives on legitimately intensive (but consistent) workloads.
// ---------------------------------------------------------------------------

/**
 * A single sample in a control chart — one observation of a metric
 * over a fixed interval.
 */
interface SPCSample {
  timestamp: number;
  value: number;
}

/**
 * Rolling control chart for a single metric per agent.
 * Implements Shewhart control chart with Western Electric rules.
 */
export class ControlChart {
  private samples: SPCSample[] = [];
  private readonly maxSamples: number;

  constructor(maxSamples = 100) {
    this.maxSamples = maxSamples;
  }

  addSample(timestamp: number, value: number): void {
    this.samples.push({ timestamp, value });
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getSampleCount(): number {
    return this.samples.length;
  }

  /**
   * Compute the mean (center line) of all samples.
   */
  getMean(): number {
    if (this.samples.length === 0) return 0;
    const sum = this.samples.reduce((s, sample) => s + sample.value, 0);
    return sum / this.samples.length;
  }

  /**
   * Compute the standard deviation of all samples.
   */
  getStdDev(): number {
    if (this.samples.length < 2) return 0;
    const mean = this.getMean();
    const variance =
      this.samples.reduce((s, sample) => s + (sample.value - mean) ** 2, 0) /
      (this.samples.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * Get the upper control limit (UCL = mean + sigma * stddev).
   */
  getUCL(sigma: number): number {
    return this.getMean() + sigma * this.getStdDev();
  }

  /**
   * Get the lower control limit (LCL = mean - sigma * stddev, floored at 0).
   */
  getLCL(sigma: number): number {
    return Math.max(0, this.getMean() - sigma * this.getStdDev());
  }

  /**
   * Compute mean of all samples EXCEPT the latest.
   * Used for violation checks — the latest point is tested against
   * the baseline, not against a distribution that includes itself.
   */
  private getBaselineMean(): number {
    if (this.samples.length < 2) return 0;
    const baseline = this.samples.slice(0, -1);
    const sum = baseline.reduce((s, sample) => s + sample.value, 0);
    return sum / baseline.length;
  }

  /**
   * Compute standard deviation of all samples EXCEPT the latest.
   */
  private getBaselineStdDev(): number {
    if (this.samples.length < 3) return 0;
    const baseline = this.samples.slice(0, -1);
    const mean = this.getBaselineMean();
    const variance =
      baseline.reduce((s, sample) => s + (sample.value - mean) ** 2, 0) / (baseline.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * Check if the latest value violates control limits.
   * Control limits are computed from the BASELINE (all samples except
   * the latest), so a single spike cannot dilute its own detection.
   * Returns null if no violation, or a description of the violation.
   */
  checkLatest(sigma: number): SPCViolation | null {
    if (this.samples.length < 2) return null;
    const latest = this.samples[this.samples.length - 1];
    const mean = this.getBaselineMean();
    const stdDev = this.getBaselineStdDev();

    if (stdDev === 0) return null; // No variation — no violation possible

    const ucl = mean + sigma * stdDev;
    const lcl = Math.max(0, mean - sigma * stdDev);

    // Rule 1: Single point beyond control limits
    if (latest.value > ucl) {
      return {
        rule: "beyond_ucl",
        message: `Value ${latest.value.toFixed(1)} exceeds upper control limit ${ucl.toFixed(1)} (mean=${mean.toFixed(1)}, σ=${stdDev.toFixed(1)})`,
        value: latest.value,
        mean,
        stdDev,
        ucl,
        lcl,
      };
    }

    // Rule 2 (Western Electric): 2 of 3 consecutive points beyond 2σ
    const twoSigma = mean + 2 * stdDev;
    if (this.samples.length >= 3) {
      const last3 = this.samples.slice(-3);
      const beyondTwoSigma = last3.filter((s) => s.value > twoSigma).length;
      if (beyondTwoSigma >= 2) {
        return {
          rule: "western_electric_2of3",
          message: `2 of last 3 values beyond 2σ (${twoSigma.toFixed(1)}). Trend detected.`,
          value: latest.value,
          mean,
          stdDev,
          ucl,
          lcl,
        };
      }
    }

    // Rule 3 (Western Electric): 4 of 5 consecutive points beyond 1σ
    const oneSigma = mean + 1 * stdDev;
    if (this.samples.length >= 5) {
      const last5 = this.samples.slice(-5);
      const beyondOneSigma = last5.filter((s) => s.value > oneSigma).length;
      if (beyondOneSigma >= 4) {
        return {
          rule: "western_electric_4of5",
          message: `4 of last 5 values beyond 1σ (${oneSigma.toFixed(1)}). Sustained elevation.`,
          value: latest.value,
          mean,
          stdDev,
          ucl,
          lcl,
        };
      }
    }

    // Rule 4 (Western Electric): 8 consecutive points on one side of center
    if (this.samples.length >= 8) {
      const last8 = this.samples.slice(-8);
      const allAbove = last8.every((s) => s.value > mean);
      const allBelow = last8.every((s) => s.value < mean);
      if (allAbove || allBelow) {
        return {
          rule: "western_electric_8consecutive",
          message: `8 consecutive values ${allAbove ? "above" : "below"} center line (${mean.toFixed(1)}). Systematic shift.`,
          value: latest.value,
          mean,
          stdDev,
          ucl,
          lcl,
        };
      }
    }

    return null;
  }
}

interface SPCViolation {
  rule: string;
  message: string;
  value: number;
  mean: number;
  stdDev: number;
  ucl: number;
  lcl: number;
}

/**
 * Tracks SPC control charts for each agent across three metrics:
 * tool call rate, token burn rate, and subtask creation rate.
 */
export class SPCMonitor {
  /** Map of agentId -> metric name -> ControlChart */
  private charts: Map<string, Map<string, ControlChart>> = new Map();
  /** Map of agentId -> metric name -> accumulated count in current interval */
  private currentInterval: Map<string, Map<string, number>> = new Map();
  /** Map of agentId -> last interval flush timestamp */
  private lastFlush: Map<string, number> = new Map();

  private intervalMs: number;
  private sigmaLimit: number;
  private minSamples: number;

  constructor(intervalMs: number, sigmaLimit: number, minSamples: number) {
    this.intervalMs = intervalMs;
    this.sigmaLimit = sigmaLimit;
    this.minSamples = minSamples;
  }

  /**
   * Record an event for an agent. Accumulates counts per interval,
   * flushes to the control chart when the interval elapses.
   * Returns any SPC violation detected on flush.
   */
  record(agentId: string, metric: string, count: number, timestamp: number): SPCViolation | null {
    // Initialize maps if needed
    if (!this.currentInterval.has(agentId)) {
      this.currentInterval.set(agentId, new Map());
      this.lastFlush.set(agentId, timestamp);
      this.charts.set(agentId, new Map());
    }

    const agentIntervals = this.currentInterval.get(agentId)!;
    const agentCharts = this.charts.get(agentId)!;

    // Check if interval has elapsed BEFORE adding current count.
    // This ensures the flushed value represents the PREVIOUS interval
    // cleanly, without contamination from the current event.
    const lastFlush = this.lastFlush.get(agentId)!;
    let violation: SPCViolation | null = null;

    if (timestamp - lastFlush >= this.intervalMs) {
      // Flush: push accumulated counts from the previous interval
      this.lastFlush.set(agentId, timestamp);

      for (const [metricName, value] of agentIntervals) {
        if (!agentCharts.has(metricName)) {
          agentCharts.set(metricName, new ControlChart());
        }
        const chart = agentCharts.get(metricName)!;
        chart.addSample(timestamp, value);

        // Only check for violations after minimum samples collected
        if (chart.getSampleCount() >= this.minSamples) {
          const v = chart.checkLatest(this.sigmaLimit);
          if (v && metricName === metric) {
            violation = v;
          }
        }
      }

      // Reset interval accumulators
      for (const key of agentIntervals.keys()) {
        agentIntervals.set(key, 0);
      }
    }

    // Add current event's count to the NEW interval's accumulator
    agentIntervals.set(metric, (agentIntervals.get(metric) ?? 0) + count);

    return violation;
  }

  /**
   * Get the control chart for an agent and metric.
   * Useful for diagnostics and visualization.
   */
  getChart(agentId: string, metric: string): ControlChart | undefined {
    return this.charts.get(agentId)?.get(metric);
  }
}

let alertCounter = 0;

export class RunawayDetector {
  private config: DetectorConfig;
  private stream: EventStream;
  private alerts: Alert[] = [];
  private pausedAgents: Set<string> = new Set();
  private unsubscribe: (() => void) | null = null;
  private spcMonitor: SPCMonitor;

  constructor(stream: EventStream, config: Partial<DetectorConfig> = {}) {
    this.stream = stream;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.spcMonitor = new SPCMonitor(
      this.config.spcIntervalMs,
      this.config.spcSigmaLimit,
      this.config.spcMinSamples,
    );
  }

  /**
   * Load detector config from admiral/config.json, merging with defaults.
   * Returns only the detector section. Falls back to defaults if file is missing.
   */
  static loadConfigFromFile(configPath: string): Partial<DetectorConfig> {
    try {
      const content = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(content);
      return parsed.detector || {};
    } catch {
      return {};
    }
  }

  /** Get the active configuration (read-only) */
  getConfig(): Readonly<DetectorConfig> {
    return { ...this.config };
  }

  /**
   * Get the SPC monitor for external diagnostics.
   */
  getSPCMonitor(): SPCMonitor {
    return this.spcMonitor;
  }

  start(): void {
    this.unsubscribe = this.stream.on((event) => this.analyze(event));
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter((a) => !a.resolved);
  }

  getPausedAgents(): Set<string> {
    return new Set(this.pausedAgents);
  }

  resumeAgent(agentId: string): void {
    this.pausedAgents.delete(agentId);
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) alert.resolved = true;
  }

  isAgentPaused(agentId: string): boolean {
    return this.pausedAgents.has(agentId);
  }

  private analyze(event: AgentEvent): void {
    if (event.type === "tool_called") {
      this.checkRepeatedToolCalls(event);
      this.checkSPC(event, "tool_call_rate", 1);
    }
    if (event.type === "subtask_created") {
      this.checkRecursiveTasks(event);
      this.checkSPC(event, "subtask_rate", 1);
    }
    if (event.type === "token_spent") {
      this.checkTokenSpike(event);
      this.checkSPC(event, "token_burn_rate", event.data.count as number);
    }
  }

  private checkSPC(event: AgentEvent, metric: string, count: number): void {
    if (!this.config.spcEnabled) return;

    const violation = this.spcMonitor.record(event.agentId, metric, count, event.timestamp);

    if (violation) {
      this.fireAlert({
        type: "spc_violation",
        severity: violation.rule === "beyond_ucl" ? "warning" : "critical",
        agentId: event.agentId,
        agentName: event.agentName,
        message: `SPC ${metric}: ${violation.message}`,
        details: {
          metric,
          rule: violation.rule,
          value: violation.value,
          mean: violation.mean,
          stdDev: violation.stdDev,
          ucl: violation.ucl,
          lcl: violation.lcl,
        },
      });
    }
  }

  private checkRepeatedToolCalls(event: AgentEvent): void {
    const now = event.timestamp;
    const windowStart = now - this.config.repeatWindowMs;
    const toolName = event.data.tool as string;

    const recentSameToolCalls = this.stream
      .getEventsByAgent(event.agentId)
      .filter(
        (e) => e.type === "tool_called" && e.data.tool === toolName && e.timestamp >= windowStart,
      );

    if (recentSameToolCalls.length >= this.config.maxRepeatedToolCalls) {
      this.fireAlert({
        type: "loop_detected",
        severity:
          recentSameToolCalls.length >= this.config.maxRepeatedToolCalls * 2
            ? "critical"
            : "warning",
        agentId: event.agentId,
        agentName: event.agentName,
        message: `Loop detected: ${event.agentName} called ${toolName} ${recentSameToolCalls.length} times in ${this.config.repeatWindowMs / 1000}s`,
        details: {
          tool: toolName,
          repeats: recentSameToolCalls.length,
          windowMs: this.config.repeatWindowMs,
        },
      });
    }
  }

  private checkRecursiveTasks(event: AgentEvent): void {
    const now = event.timestamp;
    const windowStart = now - this.config.subtaskWindowMs;

    const recentSubtasks = this.stream
      .getEventsByAgent(event.agentId)
      .filter((e) => e.type === "subtask_created" && e.timestamp >= windowStart);

    if (recentSubtasks.length >= this.config.maxSubtasks) {
      this.fireAlert({
        type: "recursive_tasks",
        severity: "critical",
        agentId: event.agentId,
        agentName: event.agentName,
        message: `Recursive task creation: ${event.agentName} created ${recentSubtasks.length} subtasks in ${this.config.subtaskWindowMs / 1000}s`,
        details: {
          subtaskCount: recentSubtasks.length,
          windowMs: this.config.subtaskWindowMs,
        },
      });
    }
  }

  private checkTokenSpike(event: AgentEvent): void {
    const now = event.timestamp;
    const oneMinuteAgo = now - 60_000;

    const recentTokenEvents = this.stream
      .getEventsByAgent(event.agentId)
      .filter((e) => e.type === "token_spent" && e.timestamp >= oneMinuteAgo);

    const totalTokens = recentTokenEvents.reduce((sum, e) => sum + (e.data.count as number), 0);

    if (totalTokens >= this.config.tokenSpikePerMinute) {
      this.fireAlert({
        type: "token_spike",
        severity: "warning",
        agentId: event.agentId,
        agentName: event.agentName,
        message: `Token spike: ${event.agentName} spent ${totalTokens} tokens in the last minute`,
        details: {
          tokensPerMinute: totalTokens,
          threshold: this.config.tokenSpikePerMinute,
        },
      });
    }
  }

  private fireAlert(partial: Omit<Alert, "id" | "timestamp" | "resolved">): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${++alertCounter}`,
      timestamp: Date.now(),
      resolved: false,
      ...partial,
    };

    this.alerts.push(alert);

    if (this.config.onAlert) {
      const shouldPause = this.config.onAlert(alert);
      if (shouldPause instanceof Promise) {
        shouldPause.then((pause) => {
          if (pause) this.pausedAgents.add(alert.agentId);
        });
      } else if (shouldPause) {
        this.pausedAgents.add(alert.agentId);
      }
    }

    if (alert.severity === "critical") {
      this.pausedAgents.add(alert.agentId);
    }
  }
}
