/**
 * Sentinel Governance Agent (X-05)
 *
 * Monitors for loops, budget violations, and scope drift via unified event log.
 * Reference implementation of Part 10 (Meta-Agent Governance).
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SentinelAlert = {
  type: "loop-detected" | "budget-violation" | "scope-drift" | "authority-violation";
  severity: "critical" | "high" | "medium" | "low";
  agentId: string;
  description: string;
  timestamp: string;
  evidence: Record<string, unknown>;
};

export interface SentinelConfig {
  loopThreshold: number;
  budgetWarningPercent: number;
  budgetCriticalPercent: number;
  scopeBoundaries: string[];
}

// ---------------------------------------------------------------------------
// Sentinel Agent
// ---------------------------------------------------------------------------

export class SentinelAgent {
  private config: SentinelConfig;
  private alerts: SentinelAlert[] = [];
  private recentActions: Map<string, string[]> = new Map();

  constructor(config?: Partial<SentinelConfig>) {
    this.config = {
      loopThreshold: config?.loopThreshold ?? 3,
      budgetWarningPercent: config?.budgetWarningPercent ?? 80,
      budgetCriticalPercent: config?.budgetCriticalPercent ?? 95,
      scopeBoundaries: config?.scopeBoundaries ?? [],
    };
  }

  checkLoop(agentId: string, action: string): SentinelAlert | null {
    let actions = this.recentActions.get(agentId);
    if (!actions) {
      actions = [];
      this.recentActions.set(agentId, actions);
    }
    actions.push(action);
    if (actions.length > 20) actions.splice(0, actions.length - 20);

    const recent = actions.slice(-this.config.loopThreshold);
    if (recent.length >= this.config.loopThreshold && recent.every((a) => a === recent[0])) {
      const alert: SentinelAlert = {
        type: "loop-detected", severity: "high", agentId,
        description: `Agent ${agentId} repeated "${action}" ${this.config.loopThreshold} times`,
        timestamp: new Date().toISOString(),
        evidence: { action, count: this.config.loopThreshold },
      };
      this.alerts.push(alert);
      return alert;
    }
    return null;
  }

  checkBudget(agentId: string, usedPercent: number): SentinelAlert | null {
    if (usedPercent >= this.config.budgetCriticalPercent) {
      const alert: SentinelAlert = {
        type: "budget-violation", severity: "critical", agentId,
        description: `Agent ${agentId} at ${usedPercent}% budget (critical: ${this.config.budgetCriticalPercent}%)`,
        timestamp: new Date().toISOString(),
        evidence: { usedPercent, threshold: this.config.budgetCriticalPercent },
      };
      this.alerts.push(alert);
      return alert;
    }
    if (usedPercent >= this.config.budgetWarningPercent) {
      const alert: SentinelAlert = {
        type: "budget-violation", severity: "medium", agentId,
        description: `Agent ${agentId} at ${usedPercent}% budget (warning: ${this.config.budgetWarningPercent}%)`,
        timestamp: new Date().toISOString(),
        evidence: { usedPercent, threshold: this.config.budgetWarningPercent },
      };
      this.alerts.push(alert);
      return alert;
    }
    return null;
  }

  checkScope(agentId: string, targetPath: string): SentinelAlert | null {
    for (const boundary of this.config.scopeBoundaries) {
      if (targetPath.startsWith(boundary)) {
        const alert: SentinelAlert = {
          type: "scope-drift", severity: "high", agentId,
          description: `Agent ${agentId} attempted to access protected path: ${targetPath}`,
          timestamp: new Date().toISOString(),
          evidence: { targetPath, boundary },
        };
        this.alerts.push(alert);
        return alert;
      }
    }
    return null;
  }

  getAlerts(): readonly SentinelAlert[] {
    return this.alerts;
  }

  getAlertCount(): number {
    return this.alerts.length;
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}
