/**
 * Intervention Protocol (MG-07)
 *
 * Escalation ladder: Warn → Restrict → Suspend → Terminate.
 * Full audit trail, reversal support, and cooldown enforcement.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import type { GovernanceEventBus } from "./framework";
import { InterventionLevel } from "./framework";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEntry {
  action: string;
  actor: string;
  timestamp: number;
  details: Record<string, unknown>;
}

export interface Intervention {
  id: string;
  level: InterventionLevel;
  targetAgent: string;
  requestedBy: string;
  reason: string;
  timestamp: number;
  status: "pending" | "active" | "reversed" | "expired";
  expiresAt?: number;
  cooldownUntil?: number;
  reversalPath?: string;
  auditTrail: AuditEntry[];
}

// ---------------------------------------------------------------------------
// InterventionProtocol
// ---------------------------------------------------------------------------

export class InterventionProtocol {
  private interventions: Map<string, Intervention> = new Map();
  private bus: GovernanceEventBus;

  constructor(bus: GovernanceEventBus) {
    this.bus = bus;
  }

  // -----------------------------------------------------------------------
  // Apply interventions (escalation ladder)
  // -----------------------------------------------------------------------

  warn(target: string, reason: string, requestedBy: string): Intervention {
    return this.createIntervention(InterventionLevel.Warn, target, reason, requestedBy);
  }

  restrict(target: string, reason: string, requestedBy: string): Intervention {
    return this.createIntervention(InterventionLevel.Restrict, target, reason, requestedBy);
  }

  suspend(target: string, reason: string, requestedBy: string): Intervention {
    return this.createIntervention(InterventionLevel.Suspend, target, reason, requestedBy);
  }

  terminate(target: string, reason: string, requestedBy: string): Intervention {
    return this.createIntervention(InterventionLevel.Terminate, target, reason, requestedBy);
  }

  // -----------------------------------------------------------------------
  // Reversal
  // -----------------------------------------------------------------------

  reverse(interventionId: string, reversedBy: string, reason: string): Intervention {
    const intervention = this.interventions.get(interventionId);
    if (!intervention) {
      throw new Error(`Intervention ${interventionId} not found`);
    }
    if (intervention.status === "reversed") {
      throw new Error(`Intervention ${interventionId} is already reversed`);
    }

    intervention.status = "reversed";
    intervention.auditTrail.push({
      action: "reversed",
      actor: reversedBy,
      timestamp: Date.now(),
      details: { reason },
    });

    this.bus.emit({
      type: "intervention",
      severity: "medium",
      sourceAgent: reversedBy,
      targetAgent: intervention.targetAgent,
      data: {
        interventionId,
        action: "reversed",
        reason,
        level: intervention.level,
      },
    });

    return { ...intervention };
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  getActive(agentId?: string): Intervention[] {
    const now = Date.now();
    const results: Intervention[] = [];
    for (const intervention of this.interventions.values()) {
      // Check expiry
      if (intervention.status === "active" && intervention.expiresAt && intervention.expiresAt <= now) {
        intervention.status = "expired";
        intervention.auditTrail.push({
          action: "expired",
          actor: "system",
          timestamp: now,
          details: { expiresAt: intervention.expiresAt },
        });
        continue;
      }

      if (intervention.status !== "active") continue;
      if (agentId && intervention.targetAgent !== agentId) continue;
      results.push({ ...intervention });
    }
    return results;
  }

  getHistory(agentId?: string): Intervention[] {
    const results: Intervention[] = [];
    for (const intervention of this.interventions.values()) {
      if (agentId && intervention.targetAgent !== agentId) continue;
      results.push({ ...intervention });
    }
    return results;
  }

  isRestricted(agentId: string): boolean {
    return this.getActive(agentId).some(
      (i) => i.level >= InterventionLevel.Restrict && i.level < InterventionLevel.Suspend,
    );
  }

  isSuspended(agentId: string): boolean {
    return this.getActive(agentId).some(
      (i) => i.level >= InterventionLevel.Suspend,
    );
  }

  // -----------------------------------------------------------------------
  // Cooldown
  // -----------------------------------------------------------------------

  setCooldown(interventionId: string, durationMs: number): void {
    const intervention = this.interventions.get(interventionId);
    if (!intervention) {
      throw new Error(`Intervention ${interventionId} not found`);
    }

    intervention.cooldownUntil = Date.now() + durationMs;
    intervention.auditTrail.push({
      action: "cooldown_set",
      actor: "system",
      timestamp: Date.now(),
      details: { durationMs, cooldownUntil: intervention.cooldownUntil },
    });
  }

  isInCooldown(agentId: string): boolean {
    const now = Date.now();
    for (const intervention of this.interventions.values()) {
      if (intervention.targetAgent !== agentId) continue;
      if (intervention.cooldownUntil && intervention.cooldownUntil > now) {
        return true;
      }
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private createIntervention(
    level: InterventionLevel,
    target: string,
    reason: string,
    requestedBy: string,
  ): Intervention {
    const id = `inv_${randomUUID()}`;
    const now = Date.now();

    const intervention: Intervention = {
      id,
      level,
      targetAgent: target,
      requestedBy,
      reason,
      timestamp: now,
      status: "active",
      auditTrail: [
        {
          action: "created",
          actor: requestedBy,
          timestamp: now,
          details: { level, reason },
        },
      ],
    };

    this.interventions.set(id, intervention);

    const levelName = InterventionLevel[level] ?? String(level);
    this.bus.emit({
      type: "intervention",
      severity: level >= InterventionLevel.Suspend ? "critical" : "high",
      sourceAgent: requestedBy,
      targetAgent: target,
      data: {
        interventionId: id,
        action: levelName.toLowerCase(),
        level,
        reason,
      },
    });

    return { ...intervention };
  }
}
