/**
 * Admiral Framework — Alert Routing (OB-05)
 *
 * Severity-based alert routing with deduplication, escalation,
 * and webhook delivery.
 */

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface Alert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  component: string;
  message: string;
  details: Record<string, unknown>;
  acknowledged: boolean;
  resolved: boolean;
  escalated: boolean;
  dedup_key: string;
}

export interface AlertRule {
  severity: AlertSeverity;
  channels: string[];
  escalateAfterMs: number;
  suppressDuringMaintenance: boolean;
}

export interface WebhookConfig {
  name: string;
  url: string;
  severities: AlertSeverity[];
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export class AlertRouter {
  private alerts: Map<string, Alert> = new Map();
  private dedupWindow: Map<string, number> = new Map();
  private rules: AlertRule[];
  private webhooks: WebhookConfig[];
  private maintenanceMode = false;
  private dedupWindowMs: number;
  private idCounter = 0;

  constructor(opts?: {
    rules?: AlertRule[];
    webhooks?: WebhookConfig[];
    dedupWindowMs?: number;
  }) {
    this.rules = opts?.rules ?? DEFAULT_RULES;
    this.webhooks = opts?.webhooks ?? [];
    this.dedupWindowMs = opts?.dedupWindowMs ?? 300_000; // 5 minutes
  }

  /** Fire a new alert */
  fire(
    severity: AlertSeverity,
    component: string,
    message: string,
    details?: Record<string, unknown>,
  ): Alert | null {
    const dedupKey = `${severity}:${component}:${message}`;

    // Deduplication check
    const lastFired = this.dedupWindow.get(dedupKey);
    if (lastFired && Date.now() - lastFired < this.dedupWindowMs) {
      return null; // Suppressed duplicate
    }

    // Maintenance mode suppression
    if (this.maintenanceMode) {
      const rule = this.rules.find((r) => r.severity === severity);
      if (rule?.suppressDuringMaintenance) return null;
    }

    const alert: Alert = {
      id: `alert-${++this.idCounter}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity,
      component,
      message,
      details: details ?? {},
      acknowledged: false,
      resolved: false,
      escalated: false,
      dedup_key: dedupKey,
    };

    this.alerts.set(alert.id, alert);
    this.dedupWindow.set(dedupKey, Date.now());

    return alert;
  }

  /** Acknowledge an alert */
  acknowledge(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  /** Resolve an alert */
  resolve(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    alert.resolved = true;
    return true;
  }

  /** Get all active (unresolved) alerts */
  getActive(): Alert[] {
    return Array.from(this.alerts.values())
      .filter((a) => !a.resolved)
      .sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
      );
  }

  /** Get all alerts */
  getAll(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /** Get alerts by severity */
  getBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alerts.values()).filter(
      (a) => a.severity === severity,
    );
  }

  /** Check for alerts needing escalation */
  checkEscalation(): Alert[] {
    const escalated: Alert[] = [];
    const now = Date.now();

    for (const alert of this.alerts.values()) {
      if (alert.resolved || alert.acknowledged || alert.escalated) continue;

      const rule = this.rules.find((r) => r.severity === alert.severity);
      if (!rule) continue;

      const alertAge = now - new Date(alert.timestamp).getTime();
      if (alertAge >= rule.escalateAfterMs) {
        alert.escalated = true;
        escalated.push(alert);
      }
    }

    return escalated;
  }

  /** Enter/exit maintenance mode */
  setMaintenanceMode(enabled: boolean): void {
    this.maintenanceMode = enabled;
  }

  isMaintenanceMode(): boolean {
    return this.maintenanceMode;
  }

  /** Get alert summary counts */
  getSummary(): Record<AlertSeverity, { active: number; total: number }> {
    const summary: Record<
      AlertSeverity,
      { active: number; total: number }
    > = {
      critical: { active: 0, total: 0 },
      high: { active: 0, total: 0 },
      medium: { active: 0, total: 0 },
      low: { active: 0, total: 0 },
    };

    for (const alert of this.alerts.values()) {
      summary[alert.severity].total++;
      if (!alert.resolved) summary[alert.severity].active++;
    }

    return summary;
  }
}

const DEFAULT_RULES: AlertRule[] = [
  {
    severity: "critical",
    channels: ["immediate"],
    escalateAfterMs: 300_000, // 5 min
    suppressDuringMaintenance: false,
  },
  {
    severity: "high",
    channels: ["operational"],
    escalateAfterMs: 900_000, // 15 min
    suppressDuringMaintenance: false,
  },
  {
    severity: "medium",
    channels: ["monitoring"],
    escalateAfterMs: 3_600_000, // 1 hour
    suppressDuringMaintenance: true,
  },
  {
    severity: "low",
    channels: ["digest"],
    escalateAfterMs: 86_400_000, // 24 hours
    suppressDuringMaintenance: true,
  },
];
