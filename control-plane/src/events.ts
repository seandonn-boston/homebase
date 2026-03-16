/**
 * Admiral Event Stream
 *
 * Every meaningful action an agent takes emits an event.
 * Admiral collects these events into a unified stream.
 */

export type EventType =
  | "agent_started"
  | "agent_stopped"
  | "task_assigned"
  | "task_completed"
  | "task_failed"
  | "tool_called"
  | "tool_result"
  | "token_spent"
  | "policy_violation"
  | "subtask_created";

export interface AgentEvent {
  id: string;
  timestamp: number;
  agentId: string;
  agentName: string;
  type: EventType;
  parentEventId?: string;
  taskId?: string;
  data: Record<string, unknown>;
}

export type EventListener = (event: AgentEvent) => void;

let eventCounter = 0;

function generateId(): string {
  return `evt_${Date.now()}_${++eventCounter}`;
}

export class EventStream {
  private events: AgentEvent[] = [];
  private listeners: EventListener[] = [];

  emit(
    agentId: string,
    agentName: string,
    type: EventType,
    data: Record<string, unknown> = {},
    parentEventId?: string,
    taskId?: string,
  ): AgentEvent {
    const event: AgentEvent = {
      id: generateId(),
      timestamp: Date.now(),
      agentId,
      agentName,
      type,
      parentEventId,
      taskId,
      data,
    };

    this.events.push(event);

    for (const listener of this.listeners) {
      listener(event);
    }

    return event;
  }

  on(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getEvents(): AgentEvent[] {
    return [...this.events];
  }

  getEventsByAgent(agentId: string): AgentEvent[] {
    return this.events.filter((e) => e.agentId === agentId);
  }

  getEventsByTask(taskId: string): AgentEvent[] {
    return this.events.filter((e) => e.taskId === taskId);
  }

  getEventsSince(timestamp: number): AgentEvent[] {
    return this.events.filter((e) => e.timestamp >= timestamp);
  }

  clear(): void {
    this.events = [];
  }
}
