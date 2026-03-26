/**
 * Fleet Scaling & Agent Lifecycle (O-09, O-10)
 *
 * Evaluates scaling policies against fleet metrics to produce scaling
 * decisions, and manages agent lifecycle states (idle → warming →
 * active → cooling → terminated) with idle timeout detection.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ScalingPolicy {
  triggerType: "queue-depth" | "utilization" | "wait-time";
  threshold: number;
  action: "scale-up" | "scale-down" | "warn";
  cooldownMs: number;
  maxFleetSize: number;  // warn at 12
}

export interface AgentLifecycle {
  agentId: string;
  state: "idle" | "warming" | "active" | "cooling" | "terminated";
  lastActive: number;
  contextLoaded: boolean;
  warmUpStarted?: number;
  coolDownStarted?: number;
}

export interface ScalingDecision {
  trigger: string;
  action: "scale-up" | "scale-down" | "warn";
  reason: string;
  currentValue: number;
  threshold: number;
}

// ---------------------------------------------------------------------------
// FleetScaler
// ---------------------------------------------------------------------------

export class FleetScaler {
  private policies: ScalingPolicy[];
  private lastTriggered: Map<string, number> = new Map();

  constructor(policies: ScalingPolicy[]) {
    this.policies = [...policies];
  }

  evaluate(metrics: {
    queueDepth: number;
    avgUtilization: number;
    avgWaitMs: number;
  }): ScalingDecision[] {
    const decisions: ScalingDecision[] = [];
    const now = Date.now();

    for (const policy of this.policies) {
      // Check cooldown
      const lastTime = this.lastTriggered.get(policy.triggerType) ?? 0;
      if (now - lastTime < policy.cooldownMs) continue;

      let currentValue: number;
      switch (policy.triggerType) {
        case "queue-depth":
          currentValue = metrics.queueDepth;
          break;
        case "utilization":
          currentValue = metrics.avgUtilization;
          break;
        case "wait-time":
          currentValue = metrics.avgWaitMs;
          break;
      }

      if (currentValue >= policy.threshold) {
        this.lastTriggered.set(policy.triggerType, now);
        decisions.push({
          trigger: policy.triggerType,
          action: policy.action,
          reason: `${policy.triggerType} (${currentValue}) >= threshold (${policy.threshold})`,
          currentValue,
          threshold: policy.threshold,
        });
      }
    }

    return decisions;
  }

  getActivePolicies(): ScalingPolicy[] {
    return [...this.policies];
  }

  addPolicy(policy: ScalingPolicy): void {
    // Replace existing policy with same trigger type
    this.policies = this.policies.filter(
      (p) => p.triggerType !== policy.triggerType,
    );
    this.policies.push(policy);
  }

  removePolicy(triggerType: string): void {
    this.policies = this.policies.filter((p) => p.triggerType !== triggerType);
    this.lastTriggered.delete(triggerType);
  }
}

// ---------------------------------------------------------------------------
// AgentLifecycleManager
// ---------------------------------------------------------------------------

const DEFAULT_IDLE_TIMEOUT_MS = 300_000; // 5 minutes

export class AgentLifecycleManager {
  private agents: Map<string, AgentLifecycle> = new Map();
  private idleTimeoutMs: number;

  constructor(idleTimeoutMs: number = DEFAULT_IDLE_TIMEOUT_MS) {
    this.idleTimeoutMs = idleTimeoutMs;
  }

  warmUp(agentId: string): AgentLifecycle {
    const now = Date.now();
    const agent: AgentLifecycle = {
      agentId,
      state: "warming",
      lastActive: now,
      contextLoaded: false,
      warmUpStarted: now,
    };
    this.agents.set(agentId, agent);
    return { ...agent };
  }

  activate(agentId: string): AgentLifecycle {
    const agent = this.ensureAgent(agentId);
    agent.state = "active";
    agent.lastActive = Date.now();
    agent.contextLoaded = true;
    return { ...agent };
  }

  coolDown(agentId: string): AgentLifecycle {
    const agent = this.ensureAgent(agentId);
    agent.state = "cooling";
    agent.coolDownStarted = Date.now();
    return { ...agent };
  }

  terminate(agentId: string): AgentLifecycle {
    const agent = this.ensureAgent(agentId);
    agent.state = "terminated";
    agent.contextLoaded = false;
    return { ...agent };
  }

  getState(agentId: string): AgentLifecycle | undefined {
    const agent = this.agents.get(agentId);
    return agent ? { ...agent } : undefined;
  }

  getActive(): AgentLifecycle[] {
    return Array.from(this.agents.values())
      .filter((a) => a.state === "active")
      .map((a) => ({ ...a }));
  }

  getIdle(): AgentLifecycle[] {
    return Array.from(this.agents.values())
      .filter((a) => a.state === "idle")
      .map((a) => ({ ...a }));
  }

  checkIdleAgents(): AgentLifecycle[] {
    const now = Date.now();
    return Array.from(this.agents.values())
      .filter(
        (a) =>
          a.state === "idle" && now - a.lastActive > this.idleTimeoutMs,
      )
      .map((a) => ({ ...a }));
  }

  // --- Internal helpers ----------------------------------------------------

  private ensureAgent(agentId: string): AgentLifecycle {
    let agent = this.agents.get(agentId);
    if (!agent) {
      agent = {
        agentId,
        state: "idle",
        lastActive: Date.now(),
        contextLoaded: false,
      };
      this.agents.set(agentId, agent);
    }
    return agent;
  }
}
