/**
 * Arbiter Agent (MG-03)
 *
 * Detects and resolves conflicts between agents: contradictory outputs,
 * scope overlaps, and authority ambiguity. Extends GovernanceAgent.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import {
  GovernanceAgent,
  GovernanceEvent,
  GovernanceEventBus,
  GovernanceFinding,
  InterventionLevel,
} from "./framework";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Conflict {
  id: string;
  type: "contradictory_output" | "scope_overlap" | "authority_ambiguity";
  agents: string[];
  description: string;
  evidence: Record<string, unknown>;
  timestamp: number;
}

export interface Resolution {
  conflictId: string;
  strategy: "precedence" | "evidence" | "escalation";
  winner?: string;
  rationale: string;
  resolvedBy: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// ArbiterAgent
// ---------------------------------------------------------------------------

export class ArbiterAgent extends GovernanceAgent {
  readonly agentId = "arbiter";
  readonly name = "Arbiter";

  private resolutions: Resolution[] = [];

  constructor(bus: GovernanceEventBus) {
    super(bus, InterventionLevel.Restrict);
  }

  // -----------------------------------------------------------------------
  // GovernanceAgent contract
  // -----------------------------------------------------------------------

  analyze(events: GovernanceEvent[]): GovernanceFinding[] {
    const conflicts = this.detectConflicts(events);
    return conflicts.map((c) => ({
      agentId: c.agents[0] ?? "unknown",
      type: "conflict" as const,
      severity: "high" as const,
      description: c.description,
      evidence: c.evidence,
      recommendedAction: InterventionLevel.Warn,
    }));
  }

  // -----------------------------------------------------------------------
  // Conflict detection
  // -----------------------------------------------------------------------

  detectConflicts(events: GovernanceEvent[]): Conflict[] {
    const conflicts: Conflict[] = [];

    // 1. Contradictory outputs: same taskId with different outputs from different agents
    const taskGroups = new Map<string, GovernanceEvent[]>();
    for (const event of events) {
      const taskId = event.data.taskId as string | undefined;
      if (!taskId) continue;
      const arr = taskGroups.get(taskId) ?? [];
      arr.push(event);
      taskGroups.set(taskId, arr);
    }

    for (const [taskId, group] of taskGroups) {
      const agents = [...new Set(group.map((e) => e.sourceAgent).filter(Boolean))] as string[];
      if (agents.length < 2) continue;

      // Check for different outputs
      const outputs = group.map((e) => JSON.stringify(e.data.output));
      const uniqueOutputs = [...new Set(outputs)];
      if (uniqueOutputs.length > 1) {
        conflicts.push({
          id: `conflict_${randomUUID()}`,
          type: "contradictory_output",
          agents,
          description: `Contradictory outputs for task ${taskId} from agents: ${agents.join(", ")}`,
          evidence: { taskId, agentOutputs: Object.fromEntries(group.map((e) => [e.sourceAgent, e.data.output])) },
          timestamp: Date.now(),
        });
      }
    }

    // 2. Scope overlaps: overlapping file paths between concurrent agents
    const fileGroups = new Map<string, Set<string>>();
    for (const event of events) {
      const filePath = event.data.filePath as string | undefined;
      if (!filePath || !event.sourceAgent) continue;
      const agents = fileGroups.get(filePath) ?? new Set();
      agents.add(event.sourceAgent);
      fileGroups.set(filePath, agents);
    }

    for (const [filePath, agents] of fileGroups) {
      if (agents.size < 2) continue;
      const agentList = [...agents];
      conflicts.push({
        id: `conflict_${randomUUID()}`,
        type: "scope_overlap",
        agents: agentList,
        description: `Scope overlap on ${filePath}: agents ${agentList.join(", ")} operating on same file`,
        evidence: { filePath, agents: agentList },
        timestamp: Date.now(),
      });
    }

    // 3. Authority ambiguity: conflicting authority claims (intervention events for same target)
    const interventionTargets = new Map<string, Set<string>>();
    for (const event of events) {
      if (event.type !== "intervention" || !event.targetAgent || !event.sourceAgent) continue;
      const requestors = interventionTargets.get(event.targetAgent) ?? new Set();
      requestors.add(event.sourceAgent);
      interventionTargets.set(event.targetAgent, requestors);
    }

    for (const [target, requestors] of interventionTargets) {
      if (requestors.size < 2) continue;
      const agentList = [...requestors];
      conflicts.push({
        id: `conflict_${randomUUID()}`,
        type: "authority_ambiguity",
        agents: agentList,
        description: `Authority ambiguity: multiple agents (${agentList.join(", ")}) issuing interventions against ${target}`,
        evidence: { targetAgent: target, requestingAgents: agentList },
        timestamp: Date.now(),
      });
    }

    return conflicts;
  }

  // -----------------------------------------------------------------------
  // Resolution strategies
  // -----------------------------------------------------------------------

  resolveByPrecedence(conflict: Conflict, agentTiers: Record<string, number>): Resolution {
    const ranked = [...conflict.agents].sort(
      (a, b) => (agentTiers[b] ?? 0) - (agentTiers[a] ?? 0),
    );
    const winner = ranked[0];
    const resolution: Resolution = {
      conflictId: conflict.id,
      strategy: "precedence",
      winner,
      rationale: `Agent ${winner} has highest tier (${agentTiers[winner] ?? 0}) among conflicting agents`,
      resolvedBy: this.agentId,
      timestamp: Date.now(),
    };
    this.resolutions.push(resolution);
    return resolution;
  }

  resolveByEvidence(conflict: Conflict, evidence: Record<string, unknown>): Resolution {
    const winner = evidence.preferredAgent as string | undefined;
    const resolution: Resolution = {
      conflictId: conflict.id,
      strategy: "evidence",
      winner,
      rationale: (evidence.rationale as string) ?? "Resolved by evidence analysis",
      resolvedBy: this.agentId,
      timestamp: Date.now(),
    };
    this.resolutions.push(resolution);
    return resolution;
  }

  escalateToAdmiral(conflict: Conflict): Resolution {
    const resolution: Resolution = {
      conflictId: conflict.id,
      strategy: "escalation",
      rationale: `Conflict ${conflict.id} cannot be resolved automatically — escalated to Admiral`,
      resolvedBy: "admiral",
      timestamp: Date.now(),
    };
    this.resolutions.push(resolution);

    this.bus.emit({
      type: "conflict",
      severity: "critical",
      sourceAgent: this.agentId,
      data: { conflict, escalatedTo: "admiral" },
    });

    return resolution;
  }

  getResolutions(): Resolution[] {
    return [...this.resolutions];
  }
}
