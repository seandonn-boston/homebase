/**
 * Tests for Admiral Task Queue (EX-02)
 */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { type TaskPriority, TaskQueue } from "./task-queue";

describe("TaskQueue — enqueue and dequeue", () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it("enqueues a task in queued state", () => {
    const task = queue.enqueue({ description: "Test task" });
    assert.equal(task.state, "queued");
    assert.equal(task.description, "Test task");
    assert.equal(task.priority, "medium"); // default
    assert.ok(task.taskId.startsWith("task_"));
    assert.ok(task.createdAt > 0);
  });

  it("dequeues tasks in priority order", () => {
    queue.enqueue({ description: "Low", priority: "low" });
    queue.enqueue({ description: "Critical", priority: "critical" });
    queue.enqueue({ description: "High", priority: "high" });
    queue.enqueue({ description: "Medium", priority: "medium" });

    assert.equal(queue.dequeue()!.description, "Critical");
    assert.equal(queue.dequeue()!.description, "High");
    assert.equal(queue.dequeue()!.description, "Medium");
    assert.equal(queue.dequeue()!.description, "Low");
  });

  it("dequeues FIFO within same priority", () => {
    queue.enqueue({ description: "First", priority: "high" });
    queue.enqueue({ description: "Second", priority: "high" });
    queue.enqueue({ description: "Third", priority: "high" });

    assert.equal(queue.dequeue()!.description, "First");
    assert.equal(queue.dequeue()!.description, "Second");
    assert.equal(queue.dequeue()!.description, "Third");
  });

  it("returns undefined when queue is empty", () => {
    assert.equal(queue.dequeue(), undefined);
  });

  it("transitions dequeued task to dispatched", () => {
    queue.enqueue({ description: "Test" });
    const task = queue.dequeue()!;
    assert.equal(task.state, "dispatched");
    assert.ok(task.dispatchedAt);
  });

  it("rejects enqueue when queue is full", () => {
    const q = new TaskQueue({ maxQueueDepth: 2 });
    q.enqueue({ description: "A" });
    q.enqueue({ description: "B" });
    assert.throws(() => q.enqueue({ description: "C" }), /Queue is full/);
  });

  it("generates unique task IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(queue.enqueue({ description: `Task ${i}` }).taskId);
    }
    assert.equal(ids.size, 50);
  });

  it("peek returns next task without removing", () => {
    queue.enqueue({ description: "First", priority: "high" });
    queue.enqueue({ description: "Second", priority: "low" });

    const peeked = queue.peek();
    assert.equal(peeked!.description, "First");
    assert.equal(queue.getDepth(), 2); // Still in queue
  });
});

describe("TaskQueue — state transitions", () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it("transitions dispatched → running", () => {
    queue.enqueue({ description: "Test" });
    const task = queue.dequeue()!;
    const running = queue.markRunning(task.taskId, "ses_1");
    assert.equal(running.state, "running");
    assert.equal(running.sessionId, "ses_1");
    assert.ok(running.startedAt);
  });

  it("transitions running → complete", () => {
    queue.enqueue({ description: "Test" });
    const task = queue.dequeue()!;
    queue.markRunning(task.taskId, "ses_1");
    const done = queue.markComplete(task.taskId, { output: "result" });
    assert.equal(done.state, "complete");
    assert.deepEqual(done.result, { output: "result" });
    assert.ok(done.completedAt);
  });

  it("transitions running → failed", () => {
    queue.enqueue({ description: "Test" });
    const task = queue.dequeue()!;
    queue.markRunning(task.taskId, "ses_1");
    const failed = queue.markFailed(task.taskId, "Oops");
    assert.equal(failed.state, "failed");
    assert.equal(failed.error, "Oops");
  });

  it("rejects invalid transitions", () => {
    queue.enqueue({ description: "Test" });
    const task = queue.dequeue()!;
    queue.markRunning(task.taskId, "ses_1");
    queue.markComplete(task.taskId);

    assert.throws(() => queue.markRunning(task.taskId, "ses_2"), /Cannot mark task/);
    assert.throws(() => queue.markFailed(task.taskId, "err"), /Cannot fail task/);
  });

  it("fails queued tasks directly", () => {
    const task = queue.enqueue({ description: "Test" });
    const failed = queue.markFailed(task.taskId, "Cancelled before dispatch");
    assert.equal(failed.state, "failed");
    assert.equal(queue.getDepth(), 0); // Removed from queue
  });
});

describe("TaskQueue — cancellation", () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it("cancels a queued task", () => {
    const task = queue.enqueue({ description: "Test" });
    const cancelled = queue.cancel(task.taskId);
    assert.equal(cancelled.state, "cancelled");
    assert.equal(queue.getDepth(), 0);
  });

  it("cancels a running task", () => {
    queue.enqueue({ description: "Test" });
    const task = queue.dequeue()!;
    queue.markRunning(task.taskId, "ses_1");
    const cancelled = queue.cancel(task.taskId);
    assert.equal(cancelled.state, "cancelled");
  });

  it("rejects cancel on completed task", () => {
    queue.enqueue({ description: "Test" });
    const task = queue.dequeue()!;
    queue.markRunning(task.taskId, "ses_1");
    queue.markComplete(task.taskId);
    assert.throws(() => queue.cancel(task.taskId), /Cannot cancel/);
  });
});

describe("TaskQueue — queries", () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it("gets task by ID", () => {
    const task = queue.enqueue({ description: "Test" });
    assert.equal(queue.getTask(task.taskId)?.description, "Test");
    assert.equal(queue.getTask("nonexistent"), undefined);
  });

  it("gets tasks by state", () => {
    queue.enqueue({ description: "A" });
    queue.enqueue({ description: "B" });
    const task = queue.dequeue()!;
    queue.markRunning(task.taskId, "ses_1");

    assert.equal(queue.getTasksByState("queued").length, 1);
    assert.equal(queue.getTasksByState("running").length, 1);
    assert.equal(queue.getTasksByState("complete").length, 0);
  });

  it("gets queued tasks in priority order", () => {
    queue.enqueue({ description: "Low", priority: "low" });
    queue.enqueue({ description: "High", priority: "high" });

    const queued = queue.getQueuedTasks();
    assert.equal(queued[0].description, "High");
    assert.equal(queued[1].description, "Low");
  });

  it("returns all tasks", () => {
    queue.enqueue({ description: "A" });
    queue.enqueue({ description: "B" });
    queue.dequeue(); // dispatched

    assert.equal(queue.getAllTasks().length, 2);
  });
});

describe("TaskQueue — metrics", () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it("tracks comprehensive metrics", () => {
    queue.enqueue({ description: "A", priority: "critical" });
    queue.enqueue({ description: "B", priority: "high" });
    queue.enqueue({ description: "C", priority: "low" });

    const task = queue.dequeue()!;
    queue.markRunning(task.taskId, "ses_1");
    queue.markComplete(task.taskId);

    const task2 = queue.dequeue()!;
    queue.markRunning(task2.taskId, "ses_2");
    queue.markFailed(task2.taskId, "error");

    const metrics = queue.getMetrics();
    assert.equal(metrics.totalEnqueued, 3);
    assert.equal(metrics.totalDispatched, 2);
    assert.equal(metrics.totalCompleted, 1);
    assert.equal(metrics.totalFailed, 1);
    assert.equal(metrics.depth, 1);
    assert.equal(metrics.byPriority.low, 1);
  });

  it("computes average wait time", () => {
    queue.enqueue({ description: "A" });
    queue.dequeue();

    const metrics = queue.getMetrics();
    assert.ok(metrics.avgWaitTimeMs >= 0);
  });
});

describe("TaskQueue — persistence", () => {
  let tmpDir: string;
  let persistPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "task-queue-test-"));
    persistPath = join(tmpDir, "queue-state.json");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("persists state to disk", () => {
    const queue = new TaskQueue({ persistPath });
    queue.enqueue({ description: "A", priority: "high" });
    queue.enqueue({ description: "B", priority: "low" });

    assert.ok(existsSync(persistPath));
    const data = JSON.parse(readFileSync(persistPath, "utf8"));
    assert.equal(data.tasks.length, 2);
    assert.equal(data.queue.length, 2);
  });

  it("restores state from disk", () => {
    const q1 = new TaskQueue({ persistPath });
    q1.enqueue({ description: "Surviving task", priority: "high" });
    q1.enqueue({ description: "Completed", priority: "low" });
    const task = q1.dequeue()!;
    q1.markRunning(task.taskId, "ses_1");
    q1.markComplete(task.taskId);

    // Create new queue and restore
    const q2 = new TaskQueue({ persistPath });
    const { restored } = q2.restore();
    assert.equal(restored, 2);
    assert.equal(q2.getDepth(), 1); // Only the queued task
    assert.equal(q2.getQueuedTasks()[0].description, "Completed"); // Wait, this is wrong...
  });

  it("marks interrupted tasks as failed on restore", () => {
    const q1 = new TaskQueue({ persistPath });
    q1.enqueue({ description: "Running task" });
    const task = q1.dequeue()!;
    q1.markRunning(task.taskId, "ses_1");
    // Simulate crash — q1 persisted with running task

    const q2 = new TaskQueue({ persistPath });
    const { interrupted } = q2.restore();
    assert.equal(interrupted.length, 1);
    assert.equal(interrupted[0], task.taskId);

    const restored = q2.getTask(task.taskId);
    assert.equal(restored!.state, "failed");
    assert.ok(restored!.error!.includes("Interrupted"));
  });

  it("handles missing persist file gracefully", () => {
    const queue = new TaskQueue({ persistPath: "/nonexistent/path.json" });
    const { restored } = queue.restore();
    assert.equal(restored, 0);
  });
});

describe("TaskQueue — priority insertion edge cases", () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it("handles mixed priority insertions correctly", () => {
    queue.enqueue({ description: "Med-1", priority: "medium" });
    queue.enqueue({ description: "Crit-1", priority: "critical" });
    queue.enqueue({ description: "Med-2", priority: "medium" });
    queue.enqueue({ description: "Low-1", priority: "low" });
    queue.enqueue({ description: "Crit-2", priority: "critical" });
    queue.enqueue({ description: "High-1", priority: "high" });

    const order: string[] = [];
    let task = queue.dequeue();
    while (task) {
      order.push(task.description);
      task = queue.dequeue();
    }

    assert.deepEqual(order, ["Crit-1", "Crit-2", "High-1", "Med-1", "Med-2", "Low-1"]);
  });

  it("preserves agent affinity and metadata", () => {
    const task = queue.enqueue({
      description: "Test",
      agentAffinity: "security-auditor",
      metadata: { source: "hook", severity: "high" },
    });

    assert.equal(task.agentAffinity, "security-auditor");
    assert.deepEqual(task.metadata, { source: "hook", severity: "high" });
  });

  it("preserves deadline", () => {
    const deadline = Date.now() + 60000;
    const task = queue.enqueue({ description: "Urgent", deadline });
    assert.equal(task.deadline, deadline);
  });
});
