/**
 * Admiral Event Stream
 *
 * Every meaningful action an agent takes emits an event.
 * Admiral collects these events into a unified stream.
 */

import * as crypto from "node:crypto";
import { RingBuffer } from "./ring-buffer";

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
  /**
   * Maximum number of events to retain. Oldest events are evicted when exceeded.
   * Default: 10000. Keep this well above RunawayDetector's analysis windows
   * (default: 5 calls in 30s, 10 subtasks in 60s) to avoid evicting events
   * the detector still needs for pattern matching.
   */
  maxEvents: number;
}

const DEFAULT_STREAM_CONFIG: EventStreamConfig = {
  maxEvents: 10_000,
};

export class EventStream {
  private events: RingBuffer<AgentEvent>;
  private listeners: EventListener[] = [];
  private config: EventStreamConfig;
  constructor(config: Partial<EventStreamConfig> = {}) {
    this.config = { ...DEFAULT_STREAM_CONFIG, ...config };
    this.events = new RingBuffer(this.config.maxEvents);
  }

  private generateId(): string {
    return `evt_${crypto.randomUUID()}`;
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
      id: this.generateId(),
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
    return this.events.toArray();
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
    return this.events.evictedCount;
  }

  /** Total events ever emitted (retained + evicted) */
  getTotalEmitted(): number {
    return this.events.size + this.events.evictedCount;
  }

  clear(): void {
    this.events.clear();
  }
}
