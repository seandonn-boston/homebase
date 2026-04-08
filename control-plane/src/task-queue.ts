/**
 * Admiral Framework — Task Queue (EX-02)
 *
 * Priority queue that accepts incoming tasks, prioritizes them
 * (CRITICAL > HIGH > MEDIUM > LOW), dispatches them to agent sessions,
 * and persists state to disk for crash recovery.
 *
 * Design:
 * - In-memory priority queue with FIFO within same priority
 * - Task state tracking: queued → dispatched → running → complete/failed
 * - Disk persistence via JSONL with atomic writes
 * - Task cancellation for queued and running tasks
 * - Queue metrics: depth, wait time, throughput
 */

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ── Types ──────────────────────────────────────────────────────

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskState = "queued" | "dispatched" | "running" | "complete" | "failed" | "cancelled";

export interface Task {
  taskId: string;
  description: string;
  priority: TaskPriority;
  state: TaskState;
  agentAffinity?: string;
  deadline?: number;
  createdAt: number;
  dispatchedAt?: number;
  startedAt?: number;
  completedAt?: number;
  sessionId?: string;
  result?: unknown;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface EnqueueOptions {
  description: string;
  priority?: TaskPriority;
  agentAffinity?: string;
  deadline?: number;
  metadata?: Record<string, unknown>;
}

export interface QueueConfig {
  persistPath?: string;
  maxQueueDepth: number;
}

export interface QueueMetrics {
  depth: number;
  totalEnqueued: number;
  totalDispatched: number;
  totalCompleted: number;
  totalFailed: number;
  totalCancelled: number;
  avgWaitTimeMs: number;
  byPriority: Record<TaskPriority, number>;
}

// ── Priority ordering ──────────────────────────────────────────

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ── Defaults ───────────────────────────────────────────────────

const DEFAULT_CONFIG: QueueConfig = {
  maxQueueDepth: 1000,
};

// ── TaskQueue ──────────────────────────────────────────────────

export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private queue: string[] = []; // Task IDs in priority order
  private config: QueueConfig;
  private taskCounter = 0;
  private totalEnqueued = 0;
  private totalDispatched = 0;
  private totalCompleted = 0;
  private totalFailed = 0;
  private totalCancelled = 0;
  private waitTimes: number[] = [];

  constructor(config?: Partial<QueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a task to the queue. Returns the created task.
   */
  enqueue(options: EnqueueOptions): Task {
    if (this.queue.length >= this.config.maxQueueDepth) {
      throw new Error(`Task queue full (${this.config.maxQueueDepth} tasks). Wait for tasks to complete or increase maxQueueDepth.`);
    }

    this.taskCounter++;
    const taskId = `task_${Date.now()}_${this.taskCounter}`;
    const priority = options.priority ?? "medium";

    const task: Task = {
      taskId,
      description: options.description,
      priority,
      state: "queued",
      agentAffinity: options.agentAffinity,
      deadline: options.deadline,
      createdAt: Date.now(),
      metadata: options.metadata ?? {},
    };

    this.tasks.set(taskId, task);
    this.insertInOrder(taskId, priority);
    this.totalEnqueued++;

    this.persist();
    return task;
  }

  /**
   * Dequeue the highest-priority task. Returns undefined if queue is empty.
   * Transitions the task to "dispatched" state.
   */
  dequeue(): Task | undefined {
    if (this.queue.length === 0) return undefined;

    const taskId = this.queue.shift()!;
    const task = this.tasks.get(taskId)!;

    task.state = "dispatched";
    task.dispatchedAt = Date.now();
    this.totalDispatched++;

    // Track wait time
    const waitTime = task.dispatchedAt - task.createdAt;
    this.waitTimes.push(waitTime);
    if (this.waitTimes.length > 100) this.waitTimes.shift();

    this.persist();
    return task;
  }

  /**
   * Peek at the next task without dequeuing it.
   */
  peek(): Task | undefined {
    if (this.queue.length === 0) return undefined;
    return this.tasks.get(this.queue[0]);
  }

  /**
   * Mark a task as running (typically called when the session starts).
   */
  markRunning(taskId: string, sessionId: string): Task {
    const task = this.getTaskOrThrow(taskId);

    if (task.state !== "dispatched") {
      throw new Error(
        `Cannot mark task ${taskId} as running: state is "${task.state}", expected "dispatched".`,
      );
    }

    task.state = "running";
    task.startedAt = Date.now();
    task.sessionId = sessionId;

    this.persist();
    return task;
  }

  /**
   * Mark a task as complete.
   */
  markComplete(taskId: string, result?: unknown): Task {
    const task = this.getTaskOrThrow(taskId);

    if (task.state !== "running" && task.state !== "dispatched") {
      throw new Error(`Cannot complete task ${taskId}: state is "${task.state}".`);
    }

    task.state = "complete";
    task.completedAt = Date.now();
    task.result = result;
    this.totalCompleted++;

    this.persist();
    return task;
  }

  /**
   * Mark a task as failed.
   */
  markFailed(taskId: string, error: string): Task {
    const task = this.getTaskOrThrow(taskId);

    if (task.state === "complete" || task.state === "cancelled") {
      throw new Error(`Cannot fail task ${taskId}: state is "${task.state}".`);
    }

    // Remove from queue if still queued
    if (task.state === "queued") {
      this.queue = this.queue.filter((id) => id !== taskId);
    }

    task.state = "failed";
    task.completedAt = Date.now();
    task.error = error;
    this.totalFailed++;

    this.persist();
    return task;
  }

  /**
   * Cancel a queued or running task.
   */
  cancel(taskId: string): Task {
    const task = this.getTaskOrThrow(taskId);

    if (task.state === "complete" || task.state === "cancelled") {
      throw new Error(`Cannot cancel task ${taskId}: state is "${task.state}".`);
    }

    // Remove from queue if still queued
    if (task.state === "queued") {
      this.queue = this.queue.filter((id) => id !== taskId);
    }

    task.state = "cancelled";
    task.completedAt = Date.now();
    this.totalCancelled++;

    this.persist();
    return task;
  }

  // ── Queries ────────────────────────────────────────────────

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getTasksByState(state: TaskState): Task[] {
    const results: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.state === state) results.push(task);
    }
    return results;
  }

  getQueuedTasks(): Task[] {
    return this.queue.map((id) => this.tasks.get(id)!);
  }

  getDepth(): number {
    return this.queue.length;
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getMetrics(): QueueMetrics {
    const byPriority: Record<TaskPriority, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const id of this.queue) {
      const task = this.tasks.get(id);
      if (task) byPriority[task.priority]++;
    }

    const avgWaitTimeMs =
      this.waitTimes.length > 0
        ? this.waitTimes.reduce((sum, t) => sum + t, 0) / this.waitTimes.length
        : 0;

    return {
      depth: this.queue.length,
      totalEnqueued: this.totalEnqueued,
      totalDispatched: this.totalDispatched,
      totalCompleted: this.totalCompleted,
      totalFailed: this.totalFailed,
      totalCancelled: this.totalCancelled,
      avgWaitTimeMs,
      byPriority,
    };
  }

  // ── Persistence ────────────────────────────────────────────

  /**
   * Save queue state to disk (atomic write).
   */
  persist(): void {
    if (!this.config.persistPath) return;

    const state = {
      tasks: Array.from(this.tasks.entries()),
      queue: this.queue,
      taskCounter: this.taskCounter,
      totalEnqueued: this.totalEnqueued,
      totalDispatched: this.totalDispatched,
      totalCompleted: this.totalCompleted,
      totalFailed: this.totalFailed,
      totalCancelled: this.totalCancelled,
    };

    const tmpPath = `${this.config.persistPath}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(state), "utf8");
    renameSync(tmpPath, this.config.persistPath);
  }

  /**
   * Restore queue state from disk.
   * Queued tasks are re-queued. Running/dispatched tasks are marked as failed
   * (interrupted by crash) and can be retried by the caller.
   */
  restore(): { restored: number; interrupted: string[] } {
    if (!this.config.persistPath) return { restored: 0, interrupted: [] };

    let data: string;
    try {
      data = readFileSync(this.config.persistPath, "utf8");
    } catch {
      return { restored: 0, interrupted: [] };
    }

    const state = JSON.parse(data) as {
      tasks: [string, Task][];
      queue: string[];
      taskCounter: number;
      totalEnqueued: number;
      totalDispatched: number;
      totalCompleted: number;
      totalFailed: number;
      totalCancelled: number;
    };

    const interrupted: string[] = [];

    this.tasks = new Map(state.tasks);
    this.taskCounter = state.taskCounter;
    this.totalEnqueued = state.totalEnqueued;
    this.totalDispatched = state.totalDispatched;
    this.totalCompleted = state.totalCompleted;
    this.totalFailed = state.totalFailed;
    this.totalCancelled = state.totalCancelled;

    // Rebuild queue from persisted state, marking interrupted tasks
    this.queue = [];
    for (const id of state.queue) {
      const task = this.tasks.get(id);
      if (task && task.state === "queued") {
        this.queue.push(id);
      }
    }

    // Mark running/dispatched tasks as failed (interrupted by crash)
    for (const task of this.tasks.values()) {
      if (task.state === "running" || task.state === "dispatched") {
        task.state = "failed";
        task.completedAt = Date.now();
        task.error = "Interrupted by crash — restore marked as failed";
        this.totalFailed++;
        interrupted.push(task.taskId);
      }
    }

    return { restored: this.tasks.size, interrupted };
  }

  // ── Private helpers ────────────────────────────────────────

  private getTaskOrThrow(taskId: string): Task {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    return task;
  }

  /**
   * Insert a task ID into the queue in priority order.
   * Within the same priority, new tasks go at the end (FIFO).
   */
  private insertInOrder(taskId: string, priority: TaskPriority): void {
    const order = PRIORITY_ORDER[priority];

    // Find insertion point: after all tasks with equal or higher priority
    let insertAt = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const existingTask = this.tasks.get(this.queue[i]);
      if (existingTask && PRIORITY_ORDER[existingTask.priority] > order) {
        insertAt = i;
        break;
      }
    }

    this.queue.splice(insertAt, 0, taskId);
  }
}
