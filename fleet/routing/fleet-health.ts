/**
 * Fleet Health Monitoring (O-06)
 *
 * Tracks per-agent health metrics (utilization, throughput, error rate,
 * budget burn, first-pass quality), generates alerts with deduplication,
 * and produces fleet-wide health summaries.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface AgentHealthMetrics {
  agentId: string;
  utilization: number;       // 0-100 (% time active)
  throughput: number;        // tasks completed per hour
  errorRate: number;         // errors per 100 tasks
  budgetBurn: number;        // tokens per minute
  firstPassQuality: number;  // % tasks passing on first attempt
  lastUpdated: number;
}

export interface FleetHealthSummary {
  totalAgents: number;
  healthy: number;
  degraded: number;
  blocked: number;
  alerts: HealthAlert[];
  aggregateMetrics: {
    avgUtilization: number;
    avgErrorRate: number;
    totalThroughput: number;
    totalBudgetBurn: number;
  };
}

export interface HealthAlert {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  agentId: string;
  metric: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ERROR_RATE_THRESHOLD = 20;
const UTILIZATION_THRESHOLD = 90;
const BUDGET_BURN_THRESHOLD = 10000; // tokens per minute
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ALERTS = 1000;

// ---------------------------------------------------------------------------
// FleetHealthMonitor
// ---------------------------------------------------------------------------

export class FleetHealthMonitor {
  private metrics: Map<string, AgentHealthMetrics> = new Map();
  private alerts: HealthAlert[] = [];

  constructor() {}

  updateMetrics(agentId: string, partial: Partial<AgentHealthMetrics>): void {
    const existing = this.metrics.get(agentId);
    if (existing) {
      Object.assign(existing, partial, { lastUpdated: Date.now() });
    } else {
      const full: AgentHealthMetrics = {
        agentId,
        utilization: 0,
        throughput: 0,
        errorRate: 0,
        budgetBurn: 0,
        firstPassQuality: 100,
        lastUpdated: Date.now(),
        ...partial,
      };
      this.metrics.set(agentId, full);
    }
  }

  getMetrics(agentId: string): AgentHealthMetrics | undefined {
    const m = this.metrics.get(agentId);
    return m ? { ...m } : undefined;
  }

  getAllMetrics(): AgentHealthMetrics[] {
    return Array.from(this.metrics.values()).map((m) => ({ ...m }));
  }

  getSummary(): FleetHealthSummary {
    const all = this.getAllMetrics();
    let healthy = 0;
    let degraded = 0;
    let blocked = 0;

    for (const m of all) {
      if (m.errorRate > ERROR_RATE_THRESHOLD && m.utilization > UTILIZATION_THRESHOLD) {
        blocked++;
      } else if (m.errorRate > ERROR_RATE_THRESHOLD || m.utilization > UTILIZATION_THRESHOLD) {
        degraded++;
      } else {
        healthy++;
      }
    }

    const totalAgents = all.length;
    const avgUtilization = totalAgents > 0
      ? all.reduce((s, m) => s + m.utilization, 0) / totalAgents
      : 0;
    const avgErrorRate = totalAgents > 0
      ? all.reduce((s, m) => s + m.errorRate, 0) / totalAgents
      : 0;
    const totalThroughput = all.reduce((s, m) => s + m.throughput, 0);
    const totalBudgetBurn = all.reduce((s, m) => s + m.budgetBurn, 0);

    return {
      totalAgents,
      healthy,
      degraded,
      blocked,
      alerts: this.alerts.filter((a) => !a.acknowledged),
      aggregateMetrics: {
        avgUtilization,
        avgErrorRate,
        totalThroughput,
        totalBudgetBurn,
      },
    };
  }

  checkHealth(): HealthAlert[] {
    const newAlerts: HealthAlert[] = [];
    const now = Date.now();

    for (const m of this.metrics.values()) {
      if (m.errorRate > ERROR_RATE_THRESHOLD) {
        const alert = this.maybeCreateAlert(
          m.agentId,
          "errorRate",
          m.errorRate > 50 ? "critical" : "high",
          `Agent "${m.agentId}" error rate ${m.errorRate}% exceeds threshold ${ERROR_RATE_THRESHOLD}%`,
          now,
        );
        if (alert) newAlerts.push(alert);
      }

      if (m.utilization > UTILIZATION_THRESHOLD) {
        const alert = this.maybeCreateAlert(
          m.agentId,
          "utilization",
          "medium",
          `Agent "${m.agentId}" utilization ${m.utilization}% exceeds threshold ${UTILIZATION_THRESHOLD}%`,
          now,
        );
        if (alert) newAlerts.push(alert);
      }

      if (m.budgetBurn > BUDGET_BURN_THRESHOLD) {
        const alert = this.maybeCreateAlert(
          m.agentId,
          "budgetBurn",
          "high",
          `Agent "${m.agentId}" budget burn ${m.budgetBurn} tokens/min exceeds threshold ${BUDGET_BURN_THRESHOLD}`,
          now,
        );
        if (alert) newAlerts.push(alert);
      }
    }

    return newAlerts;
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) alert.acknowledged = true;
  }

  getAlerts(severity?: string): HealthAlert[] {
    if (severity) {
      return this.alerts.filter((a) => a.severity === severity);
    }
    return [...this.alerts];
  }

  // --- Deduplication -------------------------------------------------------

  private maybeCreateAlert(
    agentId: string,
    metric: string,
    severity: "critical" | "high" | "medium" | "low",
    message: string,
    now: number,
  ): HealthAlert | null {
    // Check for existing unacknowledged alert for same agent + metric within window
    const existing = this.alerts.find(
      (a) =>
        a.agentId === agentId &&
        a.metric === metric &&
        !a.acknowledged &&
        now - a.timestamp < DEDUP_WINDOW_MS,
    );

    if (existing) return null;

    const alert: HealthAlert = {
      id: `alert_${randomUUID()}`,
      severity,
      agentId,
      metric,
      message,
      timestamp: now,
      acknowledged: false,
    };

    this.alerts.push(alert);
    if (this.alerts.length > MAX_ALERTS) {
      this.alerts.splice(0, this.alerts.length - MAX_ALERTS);
    }
    return alert;
  }
}
