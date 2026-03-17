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

export interface EventStreamConfig {
  /** Maximum number of events to retain. Oldest events are evicted when exceeded. Default: 10000 */
  maxEvents: number;
}

const DEFAULT_STREAM_CONFIG: EventStreamConfig = {
  maxEvents: 10_000,
};

let eventCounter = 0;

function generateId(): string {
  return `evt_${Date.now()}_${++eventCounter}`;
}

export class EventStream {
  private events: AgentEvent[] = [];
  private listeners: EventListener[] = [];
  private config: EventStreamConfig;
  private evictedCount = 0;

  constructor(config: Partial<EventStreamConfig> = {}) {
    this.config = { ...DEFAULT_STREAM_CONFIG, ...config };
  }

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

    // Evict oldest events when over capacity
    if (this.events.length > this.config.maxEvents) {
      const overflow = this.events.length - this.config.maxEvents;
      this.events.splice(0, overflow);
      this.evictedCount += overflow;
    }

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

  /** Number of events evicted since stream creation */
  getEvictedCount(): number {
    return this.evictedCount;
  }

  /** Total events ever emitted (retained + evicted) */
  getTotalEmitted(): number {
    return this.events.length + this.evictedCount;
  }

  clear(): void {
    this.events = [];
  }
}
