/**
 * Admiral Execution Trace
 *
 * Builds a reasoning tree from the event stream, showing
 * which agents spawned which tasks, which tools were called,
 * and how work flowed through the system.
 */

import { AgentEvent, EventStream } from "./events";

export interface TraceNode {
  event: AgentEvent;
  children: TraceNode[];
}

export class ExecutionTrace {
  private stream: EventStream;

  constructor(stream: EventStream) {
    this.stream = stream;
  }

  /**
   * Build a trace tree for a given root task.
   * Returns a forest (multiple roots) if agents operated independently.
   */
  buildTrace(taskId?: string): TraceNode[] {
    const events = taskId
      ? this.stream.getEventsByTask(taskId)
      : this.stream.getEvents();

    return this.buildForest(events);
  }

  /**
   * Build a trace tree for a specific agent.
   */
  buildAgentTrace(agentId: string): TraceNode[] {
    const events = this.stream.getEventsByAgent(agentId);
    return this.buildForest(events);
  }

  /**
   * Render the trace as an ASCII tree for terminal/dashboard display.
   */
  renderAscii(nodes?: TraceNode[], indent: string = ""): string {
    const roots = nodes ?? this.buildTrace();
    const lines: string[] = [];

    for (let i = 0; i < roots.length; i++) {
      const node = roots[i];
      const isLast = i === roots.length - 1;
      const prefix = indent + (isLast ? "\u2514 " : "\u251C ");
      const childIndent = indent + (isLast ? "  " : "\u2502 ");

      lines.push(prefix + this.formatNode(node));

      if (node.children.length > 0) {
        lines.push(this.renderAscii(node.children, childIndent));
      }
    }

    return lines.join("\n");
  }

  /**
   * Get summary statistics for the trace.
   */
  getStats(taskId?: string): TraceStats {
    const events = taskId
      ? this.stream.getEventsByTask(taskId)
      : this.stream.getEvents();

    const agents = new Set(events.map((e) => e.agentName));
    const toolCalls = events.filter((e) => e.type === "tool_called");
    const tools = new Set(toolCalls.map((e) => e.data.tool as string));
    const tokenEvents = events.filter((e) => e.type === "token_spent");
    const totalTokens = tokenEvents.reduce(
      (sum, e) => sum + (e.data.count as number),
      0
    );
    const subtasks = events.filter((e) => e.type === "subtask_created");
    const failures = events.filter((e) => e.type === "task_failed");

    const duration =
      events.length > 0
        ? events[events.length - 1].timestamp - events[0].timestamp
        : 0;

    return {
      agentCount: agents.size,
      agents: [...agents],
      toolCallCount: toolCalls.length,
      uniqueTools: [...tools],
      totalTokens,
      subtaskCount: subtasks.length,
      failureCount: failures.length,
      durationMs: duration,
      eventCount: events.length,
    };
  }

  private buildForest(events: AgentEvent[]): TraceNode[] {
    const nodeMap = new Map<string, TraceNode>();
    const roots: TraceNode[] = [];

    // Create nodes
    for (const event of events) {
      nodeMap.set(event.id, { event, children: [] });
    }

    // Build tree structure based on agent hierarchy and event ordering
    // Group by agent, then nest tool_called under task_assigned
    const agentGroups = new Map<string, AgentEvent[]>();
    for (const event of events) {
      const group = agentGroups.get(event.agentId) || [];
      group.push(event);
      agentGroups.set(event.agentId, group);
    }

    // For each agent, build a local tree
    for (const [, agentEvents] of agentGroups) {
      let currentTaskNode: TraceNode | null = null;

      for (const event of agentEvents) {
        const node = nodeMap.get(event.id)!;

        if (
          event.type === "agent_started" ||
          event.type === "task_assigned"
        ) {
          roots.push(node);
          if (event.type === "task_assigned") {
            currentTaskNode = node;
          }
        } else if (currentTaskNode) {
          currentTaskNode.children.push(node);
        } else {
          roots.push(node);
        }
      }
    }

    return roots;
  }

  private formatNode(node: TraceNode): string {
    const e = node.event;
    const time = new Date(e.timestamp).toLocaleTimeString();

    switch (e.type) {
      case "agent_started":
        return `[${time}] ${e.agentName} started`;
      case "agent_stopped":
        return `[${time}] ${e.agentName} stopped`;
      case "task_assigned":
        return `[${time}] ${e.agentName} \u2192 ${e.data.description}`;
      case "task_completed":
        return `[${time}] ${e.agentName} \u2713 task completed`;
      case "task_failed":
        return `[${time}] ${e.agentName} \u2717 ${e.data.error}`;
      case "tool_called":
        return `[${time}] ${e.agentName}.${e.data.tool}(${this.summarizeArgs(e.data.args as Record<string, unknown>)})`;
      case "tool_result":
        return `[${time}] ${e.agentName}.${e.data.tool} \u2192 result`;
      case "token_spent":
        return `[${time}] ${e.agentName} spent ${e.data.count} tokens (total: ${e.data.total})`;
      case "subtask_created":
        return `[${time}] ${e.agentName} \u2192 subtask: ${e.data.description} \u2192 ${e.data.targetAgent || "unassigned"}`;
      case "policy_violation":
        return `[${time}] \u26A0 ${e.agentName} violated: ${e.data.rule}`;
      default:
        return `[${time}] ${e.agentName} ${e.type}`;
    }
  }

  private summarizeArgs(args?: Record<string, unknown>): string {
    if (!args) return "";
    const entries = Object.entries(args);
    if (entries.length === 0) return "";
    return entries
      .map(([k, v]) => {
        const val = typeof v === "string" ? `"${v}"` : JSON.stringify(v);
        return `${k}: ${val}`;
      })
      .join(", ");
  }
}

export interface TraceStats {
  agentCount: number;
  agents: string[];
  toolCallCount: number;
  uniqueTools: string[];
  totalTokens: number;
  subtaskCount: number;
  failureCount: number;
  durationMs: number;
  eventCount: number;
}
