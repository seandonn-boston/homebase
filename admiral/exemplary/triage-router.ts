/**
 * Triage Router Agent (X-06)
 *
 * Assigns tasks based on type, capabilities, load, and availability.
 * Logs routing decisions with rationale.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentCapability {
  agentId: string;
  capabilities: string[];
  currentLoad: number; // 0-100
  available: boolean;
  modelTier: string;
}

export interface TaskRequest {
  id: string;
  type: string;
  requiredCapabilities: string[];
  complexity: "low" | "medium" | "high";
  priority: number;
}

export interface RoutingDecision {
  taskId: string;
  assignedAgent: string | null;
  rationale: string;
  confidence: number;
  alternatives: string[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Triage Router
// ---------------------------------------------------------------------------

export class TriageRouter {
  private agents: Map<string, AgentCapability> = new Map();
  private decisions: RoutingDecision[] = [];

  registerAgent(agent: AgentCapability): void {
    this.agents.set(agent.agentId, agent);
  }

  removeAgent(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  route(task: TaskRequest): RoutingDecision {
    const candidates = this.findCandidates(task);

    if (candidates.length === 0) {
      const decision: RoutingDecision = {
        taskId: task.id, assignedAgent: null,
        rationale: "No available agents with required capabilities",
        confidence: 0, alternatives: [],
        timestamp: new Date().toISOString(),
      };
      this.decisions.push(decision);
      return decision;
    }

    // Score candidates
    const scored = candidates.map((agent) => ({
      agent,
      score: this.scoreAgent(agent, task),
    })).sort((a, b) => b.score - a.score);

    const best = scored[0];
    const decision: RoutingDecision = {
      taskId: task.id,
      assignedAgent: best.agent.agentId,
      rationale: `Best match: ${best.agent.agentId} (score: ${best.score}, ` +
        `load: ${best.agent.currentLoad}%, capabilities: ${best.agent.capabilities.length})`,
      confidence: Math.min(100, best.score),
      alternatives: scored.slice(1, 4).map((s) => s.agent.agentId),
      timestamp: new Date().toISOString(),
    };
    this.decisions.push(decision);
    return decision;
  }

  private findCandidates(task: TaskRequest): AgentCapability[] {
    return [...this.agents.values()].filter((agent) => {
      if (!agent.available) return false;
      if (agent.currentLoad >= 90) return false;
      for (const req of task.requiredCapabilities) {
        if (!agent.capabilities.includes(req)) return false;
      }
      return true;
    });
  }

  private scoreAgent(agent: AgentCapability, task: TaskRequest): number {
    let score = 50;
    score += (100 - agent.currentLoad) * 0.3; // Lower load = better
    score += agent.capabilities.length * 2; // More capabilities = more versatile
    if (task.complexity === "high" && agent.modelTier === "tier-1") score += 20;
    if (task.complexity === "low" && agent.modelTier === "tier-3") score += 10;
    return Math.round(score);
  }

  getDecisions(): readonly RoutingDecision[] {
    return this.decisions;
  }

  getAgentCount(): number {
    return this.agents.size;
  }
}
