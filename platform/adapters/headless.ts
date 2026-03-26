/**
 * Headless API-Direct Platform Adapter (PA-05, PA-10, PA-11, PA-12, PA-13)
 *
 * Adapter for CI/CD pipelines and automation — no UI, all programmatic.
 * Supports lifecycle hooks as function calls, JSON-lines event emission,
 * event-driven agent triggers, authority narrowing, scheduled agents,
 * and headless context bootstrap.
 */

import {
  type AdapterEvent,
  type ContextInjection,
  type EventCallback,
  type HookPayload,
  type HookResult,
  type PlatformCapabilities,
  PlatformAdapter,
} from "../adapter-interface";

// ── Headless Adapter ────────────────────────────────────────────────

export class HeadlessAdapter extends PlatformAdapter {
  readonly platformId = "headless";
  readonly platformName = "Headless API-Direct";
  readonly capabilities: PlatformCapabilities = {
    hooks: true,
    contextInjection: true,
    toolPermissions: true,
    configLoading: true,
    eventEmission: true,
    subagentCoordination: false,
    mcpServer: true,
  };

  private config: Record<string, unknown> = {};
  private listeners: Map<string, EventCallback[]> = new Map();
  private initialized = false;
  private eventLog: string[] = [];

  /** Exposed for testing */
  _lastInjectedContext = "";

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.config = { ...config };
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.listeners.clear();
    this.config = {};
    this.eventLog = [];
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Execute hook as a direct function call (no shell script).
   */
  async executeHook(payload: HookPayload): Promise<HookResult> {
    if (!this.initialized) {
      return { allow: false, message: "Adapter not initialized" };
    }

    const hookHandlers = this.config["hookHandlers"] as
      | Record<string, (p: HookPayload) => HookResult>
      | undefined;

    if (hookHandlers && hookHandlers[payload.hookName]) {
      return hookHandlers[payload.hookName](payload);
    }

    return { allow: true };
  }

  /**
   * Programmatic context assembly — no file writes.
   */
  async injectContext(
    agentId: string,
    context: ContextInjection,
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error("Adapter not initialized");
    }

    const assembled = [
      ...context.standing.map((s) => `[standing] ${s}`),
      ...context.session.map((s) => `[session] ${s}`),
      ...context.working.map((s) => `[working] ${s}`),
    ].join("\n");

    this._lastInjectedContext = assembled;

    this.emit({
      type: "context_injected",
      timestamp: Date.now(),
      data: { agentId, budget: context.totalBudget },
    });
  }

  async checkToolPermission(
    agentId: string,
    tool: string,
  ): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    const allowedTools = this.config["allowedTools"];
    if (!Array.isArray(allowedTools)) {
      return true;
    }

    return allowedTools.includes(tool);
  }

  async loadConfig(_path: string): Promise<Record<string, unknown>> {
    return { ...this.config };
  }

  on(event: string, callback: EventCallback): void {
    const existing = this.listeners.get(event) ?? [];
    existing.push(callback);
    this.listeners.set(event, existing);
  }

  /**
   * Emit events as JSON-lines format for pipeline consumption.
   */
  emit(event: AdapterEvent): void {
    const jsonLine = JSON.stringify(event);
    this.eventLog.push(jsonLine);

    const callbacks = this.listeners.get(event.type) ?? [];
    for (const cb of callbacks) {
      cb(event);
    }
  }

  getEventLog(): string[] {
    return [...this.eventLog];
  }
}

// ── PA-10: Event-driven agent triggers ──────────────────────────────

export type TriggerEvent =
  | "pr_opened"
  | "ci_failure"
  | "issue_created"
  | "webhook"
  | "monitor_finding";

export interface AgentTrigger {
  event: TriggerEvent;
  authorityLevel: number;
  allowedActions: string[];
  resultRouting: string;
  costCap: number;
}

export class EventDrivenAgentFramework {
  private triggers: AgentTrigger[] = [];

  addTrigger(trigger: AgentTrigger): void {
    // Remove existing trigger for same event before adding
    this.triggers = this.triggers.filter((t) => t.event !== trigger.event);
    this.triggers.push(trigger);
  }

  removeTrigger(event: string): void {
    this.triggers = this.triggers.filter((t) => t.event !== event);
  }

  getTriggers(): AgentTrigger[] {
    return [...this.triggers];
  }

  matchTrigger(event: string): AgentTrigger | undefined {
    return this.triggers.find((t) => t.event === event);
  }
}

// ── PA-11: Authority narrowing ──────────────────────────────────────

export interface AuthorityProfile {
  tier: string;
  restrictions: string[];
}

export class HeadlessAuthorityNarrower {
  private readonly defaultRestrictions: string[] = [
    "cannot_merge_prs",
    "cannot_delete_branches",
    "cannot_modify_production",
    "cannot_escalate_authority",
    "cannot_approve_own_work",
  ];

  getDefaultAuthority(): AuthorityProfile {
    return {
      tier: "Autonomous-1",
      restrictions: [...this.defaultRestrictions],
    };
  }

  isAllowed(action: string): boolean {
    // All default restrictions are "cannot_*" actions
    return !this.defaultRestrictions.includes(action);
  }
}

// ── PA-12: Scheduled agent runner ───────────────────────────────────

export interface ScheduledAgent {
  id: string;
  name: string;
  /** Cron expression */
  schedule: string;
  task: string;
  costCap: number;
  monthlyBudget: number;
  lastRun?: number;
  totalCost: number;
}

export class ScheduledAgentRunner {
  private agents: ScheduledAgent[] = [];

  addAgent(
    agent: Omit<ScheduledAgent, "lastRun" | "totalCost">,
  ): ScheduledAgent {
    const full: ScheduledAgent = { ...agent, totalCost: 0 };
    this.agents.push(full);
    return full;
  }

  removeAgent(id: string): void {
    this.agents = this.agents.filter((a) => a.id !== id);
  }

  getAgents(): ScheduledAgent[] {
    return [...this.agents];
  }

  /**
   * Simple "should run" check: returns true if enough time has elapsed
   * since lastRun (based on schedule interval, approximated) and agent
   * is within budget.
   */
  shouldRun(id: string, now: number): boolean {
    const agent = this.agents.find((a) => a.id === id);
    if (!agent) return false;
    if (!this.isWithinBudget(id)) return false;

    // If never run, should run
    if (agent.lastRun === undefined) return true;

    // Minimum interval: 60 seconds between runs
    const MIN_INTERVAL_MS = 60_000;
    return now - agent.lastRun >= MIN_INTERVAL_MS;
  }

  recordRun(id: string, cost: number): void {
    const agent = this.agents.find((a) => a.id === id);
    if (!agent) return;

    agent.lastRun = Date.now();
    agent.totalCost += cost;
  }

  isWithinBudget(id: string): boolean {
    const agent = this.agents.find((a) => a.id === id);
    if (!agent) return false;

    return agent.totalCost < agent.monthlyBudget;
  }
}

// ── PA-13: Context bootstrap ────────────────────────────────────────

export class HeadlessContextBootstrap {
  assembleContext(
    eventPayload: Record<string, unknown>,
    groundTruth: string,
    brainEntries: string[],
  ): ContextInjection {
    const standing = [groundTruth];
    const session = brainEntries.map((entry) => `[brain] ${entry}`);
    const working: string[] = [];

    // Extract relevant working context from event payload
    if (eventPayload["task"]) {
      working.push(`Task: ${String(eventPayload["task"])}`);
    }
    if (eventPayload["branch"]) {
      working.push(`Branch: ${String(eventPayload["branch"])}`);
    }
    if (eventPayload["issue"]) {
      working.push(`Issue: ${String(eventPayload["issue"])}`);
    }

    // Budget: default 100k tokens for headless runs
    const totalBudget =
      (eventPayload["tokenBudget"] as number) ?? 100_000;

    return { standing, session, working, totalBudget };
  }
}
