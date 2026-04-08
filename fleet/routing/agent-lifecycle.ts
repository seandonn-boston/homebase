/**
 * Agent Warm-up and Cool-down (O-10)
 *
 * Context pre-loading for anticipated tasks and idle release
 * after configurable period. Re-activation with context reload.
 */

export interface WarmupConfig {
  preloadContextMs: number;
  idleTimeoutMs: number;
  cooldownGracePeriodMs: number;
}

export interface AgentThermalState {
  agentId: string;
  status: "cold" | "warming" | "warm" | "active" | "cooling" | "idle";
  lastActiveAt: number;
  warmupStartedAt?: number;
  contextLoaded: boolean;
  anticipatedTasks: string[];
}

const DEFAULT_CONFIG: WarmupConfig = {
  preloadContextMs: 5000,
  idleTimeoutMs: 300000, // 5 minutes
  cooldownGracePeriodMs: 30000, // 30 seconds
};

export class AgentLifecycleManager {
  private agents: Map<string, AgentThermalState> = new Map();
  private config: WarmupConfig;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(config?: Partial<WarmupConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  warmup(agentId: string, anticipatedTasks: string[] = []): AgentThermalState {
    let state = this.agents.get(agentId);
    if (!state) {
      state = {
        agentId,
        status: "cold",
        lastActiveAt: 0,
        contextLoaded: false,
        anticipatedTasks: [],
      };
      this.agents.set(agentId, state);
    }

    state.status = "warming";
    state.warmupStartedAt = Date.now();
    state.anticipatedTasks = anticipatedTasks;

    // Simulate context loading
    const timer = setTimeout(() => {
      state!.status = "warm";
      state!.contextLoaded = true;
      this.timers.delete(`warmup_${agentId}`);
    }, this.config.preloadContextMs);
    this.timers.set(`warmup_${agentId}`, timer);

    return state;
  }

  activate(agentId: string): AgentThermalState {
    const state = this.getOrCreate(agentId);
    state.status = "active";
    state.lastActiveAt = Date.now();
    state.contextLoaded = true;

    // Cancel idle timer if any
    this.clearTimer(`idle_${agentId}`);
    return state;
  }

  deactivate(agentId: string): AgentThermalState {
    const state = this.getOrCreate(agentId);
    state.status = "cooling";
    state.lastActiveAt = Date.now();

    // Start idle timer
    const timer = setTimeout(() => {
      state.status = "idle";
      state.contextLoaded = false;
      state.anticipatedTasks = [];
      this.timers.delete(`idle_${agentId}`);
    }, this.config.idleTimeoutMs);
    this.timers.set(`idle_${agentId}`, timer);

    return state;
  }

  getState(agentId: string): AgentThermalState | undefined {
    return this.agents.get(agentId);
  }

  getAllStates(): AgentThermalState[] {
    return Array.from(this.agents.values());
  }

  shutdown(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  private getOrCreate(agentId: string): AgentThermalState {
    let state = this.agents.get(agentId);
    if (!state) {
      state = {
        agentId,
        status: "cold",
        lastActiveAt: 0,
        contextLoaded: false,
        anticipatedTasks: [],
      };
      this.agents.set(agentId, state);
    }
    return state;
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}
