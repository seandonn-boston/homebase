/**
 * Admiral Framework — Governance Dashboard (OB-13)
 *
 * Provides a governance-focused view: agent health, decision authority,
 * intervention history, and policy status.
 */

import type { EventStream } from "./events";

export interface GovernanceDashboardData {
  agents: { agentId: string; healthy: boolean; lastFinding: number }[];
  decisionAuthority: {
    agentId: string;
    level: string;
    overrides: number;
  }[];
  interventionHistory: {
    id: string;
    level: string;
    target: string;
    timestamp: number;
  }[];
  policyStatus: {
    policyId: string;
    enabled: boolean;
    violations: number;
  }[];
}

/**
 * Aggregates EventStream data into governance-level dashboard views.
 */
export class GovernanceDashboard {
  private eventStream: EventStream;

  constructor(eventStream: EventStream) {
    this.eventStream = eventStream;
  }

  /**
   * Compute full governance dashboard data from the event stream.
   */
  getData(): GovernanceDashboardData {
    const events = this.eventStream.getEvents();

    // Track agents: last seen, violations
    const agentLastSeen = new Map<string, number>();
    const agentViolations = new Map<string, number>();
    const agentStopped = new Set<string>();
    const policyViolations = new Map<string, number>();
    const interventions: GovernanceDashboardData["interventionHistory"] = [];

    for (const event of events) {
      agentLastSeen.set(event.agentId, event.timestamp);

      if (event.type === "agent_stopped") {
        agentStopped.add(event.agentId);
      }
      if (event.type === "agent_started") {
        agentStopped.delete(event.agentId);
      }

      if (event.type === "policy_violation") {
        agentViolations.set(event.agentId, (agentViolations.get(event.agentId) ?? 0) + 1);

        const policyId =
          (event.data.policyId as string) ?? (event.data.policy as string) ?? "unknown";
        policyViolations.set(policyId, (policyViolations.get(policyId) ?? 0) + 1);
      }

      // Detect intervention events from data tags
      if (event.data.intervention === true) {
        interventions.push({
          id: event.id,
          level: (event.data.level as string) ?? "operator",
          target: event.agentId,
          timestamp: event.timestamp,
        });
      }
    }

    // Build agents list
    const agents: GovernanceDashboardData["agents"] = [];
    for (const [agentId, _lastSeen] of agentLastSeen) {
      agents.push({
        agentId,
        healthy: !agentStopped.has(agentId),
        lastFinding: agentViolations.get(agentId) ?? 0,
      });
    }

    // Decision authority — derive from events
    const decisionAuthority: GovernanceDashboardData["decisionAuthority"] = [];
    for (const [agentId] of agentLastSeen) {
      const overrides = agentViolations.get(agentId) ?? 0;
      decisionAuthority.push({
        agentId,
        level: overrides > 5 ? "restricted" : "standard",
        overrides,
      });
    }

    // Policy status
    const policyStatus: GovernanceDashboardData["policyStatus"] = [];
    for (const [policyId, violations] of policyViolations) {
      policyStatus.push({
        policyId,
        enabled: true,
        violations,
      });
    }

    return {
      agents,
      decisionAuthority,
      interventionHistory: interventions,
      policyStatus,
    };
  }
}
