# Stream 34: Agent Execution Runtime

> The core engine that spawns agent sessions, manages task queues, tracks execution state, and collects results. This is the central piece that turns Admiral from a policy engine into an operating system for agent fleets.

**Scope:** Build the runtime that accepts tasks (from intent decomposition or direct assignment), spawns agent sessions with appropriate context, tracks their execution state through a lifecycle (pending → running → complete/failed), collects results, and handles failure modes (timeouts, retries, crashes). The runtime must be crash-recoverable — execution state persists so that interrupted work can resume.

**Principle:** A governance framework without an execution runtime is a set of rules with no referee on the field. The execution runtime is the referee — it ensures agents are spawned correctly, work within their constraints, and their results are captured.

---

## 34.1 Session Lifecycle Engine

- [ ] **EX-01: Session spawner — Core engine that creates and manages agent sessions**
  - **Description:** Implement the engine that accepts a task specification (agent ID, task description, resource limits) and spawns an agent session. The spawner must: (1) resolve the agent definition from the fleet registry, (2) assemble the agent's context profile (standing + session + task context), (3) initialize session state (pending), (4) transition to running when execution begins, (5) emit session lifecycle events (session.spawned, session.started, session.completed, session.failed) to the control plane event stream. Builds on `admiral/lib/session_lifecycle.sh` state machine.
  - **Done when:** Sessions can be spawned for any registered agent. State transitions are tracked and persisted. Lifecycle events are emitted. Invalid agent IDs are rejected with clear errors. Session metadata (agent, task, timestamps, state) is queryable.
  - **Files:** `control-plane/src/execution-runtime.ts` (new), `control-plane/src/execution-runtime.test.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 3 (Fleet Management), Part 5 (Execution Patterns)
  - **Depends on:** Stream 8 (execution patterns), Stream 14 (agent definitions), Stream 15 (routing)

- [ ] **EX-02: Task queue — Queue and schedule tasks for agent execution**
  - **Description:** Implement a task queue that accepts incoming tasks, prioritizes them (CRITICAL > HIGH > MEDIUM > LOW), and dispatches them to available agent sessions. The queue must: (1) accept tasks with priority, deadline, and agent affinity, (2) dequeue in priority order with FIFO within same priority, (3) track task state (queued → dispatched → running → complete/failed), (4) support task cancellation, (5) emit queue metrics (depth, wait time, throughput). The queue is in-memory with persistence to disk for crash recovery.
  - **Done when:** Tasks can be enqueued and dequeued by priority. Task state transitions are tracked. Cancellation works for queued and running tasks. Queue depth and wait time metrics are emitted. Queue state survives server restart via disk persistence.
  - **Files:** `control-plane/src/task-queue.ts` (new), `control-plane/src/task-queue.test.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 5 (Execution Patterns)
  - **Depends on:** EX-01

- [ ] **EX-03: Execution state persistence — Persist execution state for crash recovery**
  - **Description:** Persist the execution runtime state (active sessions, task queue, execution history) to disk so that the runtime can recover after a crash. State is written atomically (write-tmp + rename) to prevent corruption. On startup, the runtime checks for persisted state and resumes: queued tasks are re-dispatched, running tasks are marked as interrupted and either retried or failed based on retry policy. State file uses JSONL for append-friendly writes with periodic compaction.
  - **Done when:** Runtime state is persisted to disk on every state transition. Crash recovery restores the queue and session states. Interrupted tasks are retried or marked failed per policy. Atomic writes prevent corruption. State file compaction prevents unbounded growth.
  - **Files:** `control-plane/src/execution-state.ts` (new), `control-plane/src/execution-state.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 5 (Execution Patterns)
  - **Depends on:** EX-01, EX-02

---

## 34.2 Task Lifecycle Management

- [ ] **EX-04: Timeout and retry handling — Enforce resource limits and retry failed tasks**
  - **Description:** Enforce per-session resource limits: (1) wall-clock timeout (configurable, default 5 minutes), (2) token budget (from agent definition), (3) file-write cap (configurable, default 50 files). When a limit is hit, the session is terminated gracefully (teardown phase) and the task is marked as failed with the specific limit that was exceeded. Failed tasks can be retried up to a configurable max (default 2 retries) with exponential backoff. Permanent failures (all retries exhausted) trigger an escalation event.
  - **Done when:** Wall-clock timeout terminates sessions. Token budget overrun is detected and terminates sessions. File-write cap is enforced. Retries work with exponential backoff. Permanent failures emit escalation events. All limit types are configurable per agent definition.
  - **Files:** `control-plane/src/execution-limits.ts` (new), `control-plane/src/execution-limits.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 3 (Fleet Management), Part 5 (Execution Patterns)
  - **Depends on:** EX-01

- [ ] **EX-05: Result aggregation — Collect and report execution results**
  - **Description:** Collect results from completed agent sessions and aggregate them into a structured report. Each result includes: session ID, agent ID, task ID, status (complete/failed/timeout), duration, token usage, files modified, test results, and any escalation events. Aggregation produces: (1) per-task result summary, (2) per-agent performance metrics, (3) fleet-wide execution summary. Results are stored in the control plane event store and queryable via the API.
  - **Done when:** Results are collected from all completed sessions. Per-task summaries include all required fields. Per-agent metrics are computed (avg duration, success rate, token efficiency). Fleet summary is generated. Results are queryable via existing API endpoints.
  - **Files:** `control-plane/src/result-aggregator.ts` (new), `control-plane/src/result-aggregator.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 5 (Execution Patterns), Part 7 (Operations)
  - **Depends on:** EX-01, EX-03

- [ ] **EX-06: Task decomposition interface — Accept intent and produce subtask graph**
  - **Description:** Define the interface between the intent/routing layer and the execution runtime. The decomposition interface accepts a high-level task description and produces a directed acyclic graph (DAG) of subtasks, each assigned to a specific agent with resource limits and dependencies. Builds on the existing task decomposition engine (O-07) by adding: (1) DAG validation (no cycles, all agents exist, dependencies are satisfiable), (2) critical path calculation, (3) parallel execution opportunities identification. The interface is consumed by the task queue (EX-02) for scheduling.
  - **Done when:** High-level tasks can be decomposed into subtask DAGs. DAG validation catches cycles and invalid agent references. Critical path is calculated. Parallel opportunities are identified. The DAG is consumable by the task queue for scheduling. Integration with existing O-07 decomposition engine is complete.
  - **Files:** `control-plane/src/task-decomposition.ts` (new), `control-plane/src/task-decomposition.test.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 5 (Execution Patterns)
  - **Depends on:** EX-01, EX-02, O-07

---

## Dependencies

| Item | Depends on |
|------|-----------|
| EX-01 (session spawner) | Stream 8, Stream 14, Stream 15 (existing) |
| EX-02 (task queue) | EX-01 |
| EX-03 (state persistence) | EX-01, EX-02 |
| EX-04 (timeouts/retries) | EX-01 |
| EX-05 (result aggregation) | EX-01, EX-03 |
| EX-06 (task decomposition) | EX-01, EX-02, O-07 (existing) |
