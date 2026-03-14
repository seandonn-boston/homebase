/**
 * Admiral Runaway Detection
 *
 * Watches the event stream and detects common agent failure patterns:
 * - Repeated tool calls (loops)
 * - Recursive task creation (fork bombs)
 * - Token budget spikes
 *
 * When a pattern is detected, Admiral emits an alert and optionally
 * pauses the offending agent.
 */

import { AgentEvent, EventStream } from "./events";

export interface Alert {
  id: string;
  timestamp: number;
  type: "loop_detected" | "recursive_tasks" | "token_spike";
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
  /** Called when an alert fires — return true to pause the agent */
  onAlert?: (alert: Alert) => boolean | Promise<boolean>;
}

const DEFAULT_CONFIG: DetectorConfig = {
  maxRepeatedToolCalls: 5,
  repeatWindowMs: 30_000,
  maxSubtasks: 10,
  subtaskWindowMs: 60_000,
  tokenSpikePerMinute: 50_000,
};

let alertCounter = 0;

export class RunawayDetector {
  private config: DetectorConfig;
  private stream: EventStream;
  private alerts: Alert[] = [];
  private pausedAgents: Set<string> = new Set();
  private unsubscribe: (() => void) | null = null;

  constructor(stream: EventStream, config: Partial<DetectorConfig> = {}) {
    this.stream = stream;
    this.config = { ...DEFAULT_CONFIG, ...config };
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
    }
    if (event.type === "subtask_created") {
      this.checkRecursiveTasks(event);
    }
    if (event.type === "token_spent") {
      this.checkTokenSpike(event);
    }
  }

  private checkRepeatedToolCalls(event: AgentEvent): void {
    const now = event.timestamp;
    const windowStart = now - this.config.repeatWindowMs;
    const toolName = event.data.tool as string;

    const recentSameToolCalls = this.stream
      .getEventsByAgent(event.agentId)
      .filter(
        (e) =>
          e.type === "tool_called" &&
          e.data.tool === toolName &&
          e.timestamp >= windowStart
      );

    if (recentSameToolCalls.length >= this.config.maxRepeatedToolCalls) {
      this.fireAlert({
        type: "loop_detected",
        severity: recentSameToolCalls.length >= this.config.maxRepeatedToolCalls * 2
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
      .filter(
        (e) => e.type === "subtask_created" && e.timestamp >= windowStart
      );

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
      .filter(
        (e) => e.type === "token_spent" && e.timestamp >= oneMinuteAgo
      );

    const totalTokens = recentTokenEvents.reduce(
      (sum, e) => sum + (e.data.count as number),
      0
    );

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

  private fireAlert(
    partial: Omit<Alert, "id" | "timestamp" | "resolved">
  ): void {
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
