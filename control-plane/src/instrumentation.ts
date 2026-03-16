/**
 * Admiral Instrumentation Hook
 *
 * Lightweight hook that agent frameworks integrate to emit events
 * into the Admiral event stream. Framework-agnostic by design.
 */

import type { EventStream, EventType } from "./events";

export interface InstrumentationConfig {
  agentId: string;
  agentName: string;
  defaultTaskId?: string;
}

export class AgentInstrumentation {
  private stream: EventStream;
  private config: InstrumentationConfig;
  private tokenCount = 0;

  constructor(stream: EventStream, config: InstrumentationConfig) {
    this.stream = stream;
    this.config = config;
  }

  started(data: Record<string, unknown> = {}) {
    return this.emit("agent_started", data);
  }

  stopped(data: Record<string, unknown> = {}) {
    return this.emit("agent_stopped", data);
  }

  taskAssigned(taskId: string, description: string, data: Record<string, unknown> = {}) {
    return this.emit("task_assigned", { taskId, description, ...data }, undefined, taskId);
  }

  taskCompleted(taskId: string, data: Record<string, unknown> = {}) {
    return this.emit("task_completed", { taskId, ...data }, undefined, taskId);
  }

  taskFailed(taskId: string, error: string, data: Record<string, unknown> = {}) {
    return this.emit("task_failed", { taskId, error, ...data }, undefined, taskId);
  }

  toolCalled(toolName: string, args: Record<string, unknown> = {}, taskId?: string) {
    return this.emit("tool_called", { tool: toolName, args }, undefined, taskId);
  }

  toolResult(toolName: string, result: unknown, taskId?: string) {
    return this.emit("tool_result", { tool: toolName, result }, undefined, taskId);
  }

  tokenSpent(count: number, model?: string, taskId?: string) {
    this.tokenCount += count;
    return this.emit("token_spent", { count, total: this.tokenCount, model }, undefined, taskId);
  }

  subtaskCreated(
    parentTaskId: string,
    subtaskId: string,
    description: string,
    targetAgent?: string,
  ) {
    return this.emit(
      "subtask_created",
      { parentTaskId, subtaskId, description, targetAgent },
      undefined,
      parentTaskId,
    );
  }

  policyViolation(rule: string, details: string, taskId?: string) {
    return this.emit("policy_violation", { rule, details }, undefined, taskId);
  }

  getTotalTokens(): number {
    return this.tokenCount;
  }

  private emit(
    type: EventType,
    data: Record<string, unknown>,
    parentEventId?: string,
    taskId?: string,
  ) {
    return this.stream.emit(
      this.config.agentId,
      this.config.agentName,
      type,
      data,
      parentEventId,
      taskId ?? this.config.defaultTaskId,
    );
  }
}
