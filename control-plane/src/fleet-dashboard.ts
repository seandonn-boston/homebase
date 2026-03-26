/**
 * Admiral Framework — Fleet Dashboard (OB-12)
 *
 * Provides a real-time fleet-level view of all running agents,
 * health status, resource consumption, attention items, and recent events.
 */

import { AgentEvent, EventStream } from "./events";

export interface FleetDashboardData {
  running: { agentId: string; task: string; duration: number }[];
  healthy: { agentId: string; status: string }[];
  consuming: { agentId: string; tokens: number; cost: number }[];
  attention: { agentId: string; reason: string; severity: string }[];
  recent: { agentId: string; event: string; timestamp: number }[];
}

/**
 * Aggregates EventStream data into fleet-level dashboard views.
 */
export class FleetDashboard {
  private eventStream: EventStream;

  constructor(eventStream: EventStream) {
    this.eventStream = eventStream;
  }

  /**
   * Compute the current fleet status from the event stream.
   */
  getFleetStatus(): FleetDashboardData {
    const events = this.eventStream.getEvents();
    const now = Date.now();

    // Track agent states
    const agentStarted = new Map<string, AgentEvent>();
    const agentStopped = new Set<string>();
    const agentTasks = new Map<string, AgentEvent>();
    const agentTokens = new Map<string, number>();
    const violations: AgentEvent[] = [];

    for (const event of events) {
      switch (event.type) {
        case "agent_started":
          agentStarted.set(event.agentId, event);
          agentStopped.delete(event.agentId);
          break;
        case "agent_stopped":
          agentStopped.add(event.agentId);
          break;
        case "task_assigned":
          agentTasks.set(event.agentId, event);
          break;
        case "task_completed":
        case "task_failed":
          agentTasks.delete(event.agentId);
          break;
        case "token_spent":
          agentTokens.set(
            event.agentId,
            (agentTokens.get(event.agentId) ?? 0) +
              ((event.data.tokens as number) ?? 0),
          );
          break;
        case "policy_violation":
          violations.push(event);
          break;
      }
    }

    // Running agents with active tasks
    const running: FleetDashboardData["running"] = [];
    for (const [agentId, taskEvent] of agentTasks.entries()) {
      if (!agentStopped.has(agentId)) {
        running.push({
          agentId,
          task: (taskEvent.data.task as string) ?? taskEvent.taskId ?? "unknown",
          duration: now - taskEvent.timestamp,
        });
      }
    }

    // Healthy agents (started and not stopped)
    const healthy: FleetDashboardData["healthy"] = [];
    for (const [agentId] of agentStarted) {
      healthy.push({
        agentId,
        status: agentStopped.has(agentId) ? "stopped" : "running",
      });
    }

    // Token consumption
    const consuming: FleetDashboardData["consuming"] = [];
    for (const [agentId, tokens] of agentTokens) {
      consuming.push({
        agentId,
        tokens,
        cost: tokens * 0.00001, // rough estimate
      });
    }

    // Attention items from violations
    const attention: FleetDashboardData["attention"] = violations.map((v) => ({
      agentId: v.agentId,
      reason: (v.data.reason as string) ?? v.data.message as string ?? "policy violation",
      severity: (v.data.severity as string) ?? "high",
    }));

    // Recent events (last 20)
    const recent: FleetDashboardData["recent"] = events
      .slice(-20)
      .reverse()
      .map((e) => ({
        agentId: e.agentId,
        event: e.type,
        timestamp: e.timestamp,
      }));

    return { running, healthy, consuming, attention, recent };
  }

  /**
   * Get detailed info for a single agent.
   */
  getAgentDetail(
    agentId: string,
  ): { events: AgentEvent[]; metrics: Record<string, number> } {
    const events = this.eventStream.getEventsByAgent(agentId);

    let tokenTotal = 0;
    let taskCount = 0;
    let violationCount = 0;
    let toolCallCount = 0;

    for (const e of events) {
      if (e.type === "token_spent") tokenTotal += (e.data.tokens as number) ?? 0;
      if (e.type === "task_completed" || e.type === "task_failed") taskCount++;
      if (e.type === "policy_violation") violationCount++;
      if (e.type === "tool_called") toolCallCount++;
    }

    return {
      events,
      metrics: {
        tokenTotal,
        taskCount,
        violationCount,
        toolCallCount,
        eventCount: events.length,
      },
    };
  }

  /**
   * Get recent alerts from policy violations.
   */
  getAlerts(): { severity: string; message: string; timestamp: number }[] {
    const events = this.eventStream.getEvents();
    return events
      .filter((e) => e.type === "policy_violation")
      .map((e) => ({
        severity: (e.data.severity as string) ?? "high",
        message: (e.data.reason as string) ?? (e.data.message as string) ?? "policy violation",
        timestamp: e.timestamp,
      }));
  }
}
