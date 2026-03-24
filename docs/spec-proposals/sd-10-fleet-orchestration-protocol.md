# SD-10: Spec Gap Proposal — Fleet Orchestration Protocol Details

> Proposes concrete protocol definitions for the five underspecified areas identified in UNDERSPEC-01 (SD-01 inventory).
>
> Affected streams: 7, 8, 14, 15
>
> Priority: Blocking (Priority 1 per SD-02 queue)
>
> Date: 2026-03-20

---

## 1. Agent Selection Algorithm

### Current State

`fleet/routing-rules.md` provides a three-tier decision tree (task type, file ownership, escalation) with 86+ task-type mappings and fallback agents. However, it does not specify:

- How the Orchestrator selects between multiple eligible agents
- How capability matching works when multiple agents share a task type
- How agent load, availability, and performance history factor into selection
- Tiebreaking rules when primary and fallback agents are both eligible

### Proposed Protocol

#### Selection Pipeline

The Orchestrator selects an agent through a four-stage pipeline. Each stage narrows the candidate set. If any stage produces an empty set, the pipeline falls back to the previous stage's output and proceeds to escalation.

```
Stage 1: Eligibility Filter
  → Filter by task type match (routing-rules.md table)
  → Exclude agents whose "Does NOT Do" list covers the task
  → Exclude agents currently in error/recovery state
  → Output: eligible_agents[]

Stage 2: Capability Match
  → Score each eligible agent by capability alignment:
    - exact_match: task type is agent's primary responsibility → 3 points
    - fallback_match: task type is in agent's fallback column → 1 point
    - file_ownership: agent owns files touched by the task → 2 points (additive)
  → Output: scored_agents[] (sorted descending)

Stage 3: Availability Check
  → For each scored agent (highest first):
    - Status must be: available | idle | completing_current
    - If agent is completing_current, estimated completion must be
      within the task's deadline tolerance (default: 1 chunk duration)
    - Queue depth must be < max_queue_depth (default: 3 pending tasks)
  → Output: available_agents[] (preserving score order)

Stage 4: Tiebreak
  → If multiple agents share the top score:
    1. Prefer the agent with lowest queue depth
    2. Prefer the agent with highest historical first-pass quality rate
       for this task type (if metrics exist)
    3. Prefer the agent listed first in the routing table (stable ordering)
  → Output: selected_agent
```

#### Selection Failure

If the pipeline produces no available agent:

1. **Queue the task** with the highest-scored eligible agent (even if busy), provided queue depth < max_queue_depth.
2. If all eligible agents are at max queue depth, **escalate to Admiral** with the task and the list of eligible-but-full agents.
3. The Orchestrator must NOT assign a task to an ineligible agent as a workaround. Wrong-agent assignment produces output that compounds errors downstream (see routing-rules.md § Failure mode: Wrong routing).

#### Configuration

```yaml
# fleet-config.yaml (project-specific)
selection:
  max_queue_depth: 3          # max pending tasks per agent
  deadline_tolerance: "1_chunk" # how far ahead to look for agent availability
  history_weight: true          # use historical quality metrics in tiebreak
  fallback_to_queue: true       # queue tasks when preferred agent is busy
```

---

## 2. Agent Unavailability Handling

### Current State

Part 4 (Protocol Integration) specifies A2A failure handling for cross-process agents: offline detection, mid-flight failure, network partition. Part 6 (Swarm Patterns) specifies queen/worker failure for swarm deployments. Neither covers the common case: what does the Orchestrator do when an in-session agent becomes unavailable (context exhaustion, crash, budget depletion, timeout)?

### Proposed Protocol

#### Unavailability Detection

| Signal | Detection Method | Response Time |
|--------|-----------------|---------------|
| **Heartbeat timeout** | Agent fails to respond within `heartbeat_interval` (default: 60s for long tasks, 15s for interactive) | Immediate |
| **Budget exhaustion** | Agent's token_budget_remaining reaches 0 | Predictive — warn at 10% remaining |
| **Context exhaustion** | Agent reports context window full or output quality degrades detectably | Agent self-reports or governance agent flags |
| **Explicit failure** | Agent returns error status in handoff | Immediate |
| **Silent failure** | No heartbeat, no error, no output after `max_silence` (default: 120s) | After timeout |

#### Recovery Ladder

When an agent becomes unavailable, the Orchestrator follows this recovery ladder in order:

```
Level 1: RETRY (same agent)
  Condition: transient failure (timeout, single error)
  Action: Retry the current subtask with the same agent
  Limit: 1 retry per subtask

Level 2: CHECKPOINT + REASSIGN (same role, different instance)
  Condition: retry failed, or budget/context exhaustion
  Action:
    1. Collect the agent's last checkpoint (partial work output)
    2. Select a new agent instance for the same role via the Selection Pipeline
    3. Inject checkpoint as context into the new agent
    4. Resume from the last completed subtask boundary
  Limit: 2 reassignments per task

Level 3: FALLBACK (different role)
  Condition: no agent available for the primary role
  Action:
    1. Select the fallback agent from the routing table
    2. Provide full task context plus checkpoint
    3. Flag output for additional QA review (fallback agents
       may not match primary quality for the task type)
  Limit: 1 fallback per task

Level 4: ESCALATE (to Admiral)
  Condition: all recovery levels exhausted
  Action:
    1. Package: task description, attempted agents, failure reasons,
       partial work collected, impact on dependent tasks
    2. Escalate using the Escalation Protocol (Part 11)
    3. Suspend dependent tasks until Admiral responds
```

#### Partial Work Preservation

When an agent fails mid-task, the Orchestrator must preserve whatever work was produced:

- **Committed work** (files written, tests passing): Retained as-is.
- **Uncommitted work** (in-progress changes): Stashed or captured in a checkpoint handoff.
- **No work produced**: Task returns to the queue with original context.

The checkpoint handoff uses the standard handoff schema (v1) with `session_handoff.in_progress` populated:

```json
{
  "from": "Backend Implementer (instance-1, FAILED)",
  "to": "Backend Implementer (instance-2)",
  "via": "Orchestrator",
  "task": "Continue: implement user preferences endpoint",
  "deliverable": "<partial work from failed agent>",
  "acceptance_criteria": ["<original criteria>"],
  "session_handoff": {
    "session_id": "<failed session>",
    "agent": "Backend Implementer",
    "completed": ["schema migration", "model definition"],
    "in_progress": ["API route handler — 60% complete"],
    "blocked": [],
    "decisions_made": ["Used JSONB for preferences storage — see ADR-042"],
    "next_session_should": ["Complete route handler", "Write tests"],
    "critical_context": ["preferences schema uses JSONB, not relational"]
  }
}
```

---

## 3. Task Assignment Message Format

### Current State

The handoff schema (`handoff/v1.schema.json`) defines agent-to-agent handoffs. The interface contracts define domain-specific content within handoffs. However, neither specifies the Orchestrator's initial task assignment to an agent — the message that begins work.

The handoff schema is close but conflates two different actions:
- **Handoff**: Agent A completed work, passing results to Agent B
- **Assignment**: Orchestrator dispatches a new task to an agent

### Proposed Protocol

#### Task Assignment Schema

Task assignments extend the handoff v1 schema with assignment-specific fields in `metadata.assignment`. This avoids a separate schema while making assignments distinguishable from handoffs.

```json
{
  "$schema": "handoff/v1",
  "from": "Orchestrator",
  "to": "Backend Implementer",
  "via": "Orchestrator",
  "task": "Implement user preferences API endpoint",
  "deliverable": "Working endpoint with tests",
  "acceptance_criteria": [
    "GET /api/preferences returns current user preferences",
    "PUT /api/preferences updates preferences with validation",
    "400 on invalid input with descriptive error",
    "Unit tests cover happy path and validation errors",
    "Follows existing API patterns in src/api/"
  ],
  "context_files": [
    "src/api/routes/user.ts",
    "db/migrations/042_preferences.sql",
    "docs/api/openapi.yaml"
  ],
  "constraints": {
    "token_budget_remaining": 50000,
    "deadline": "session"
  },
  "assumptions": [],
  "open_questions": [],
  "metadata": {
    "assignment": {
      "assignment_id": "task-2026-0320-001",
      "parent_goal": "User preferences feature (GOAL-042)",
      "sequence_position": 3,
      "sequence_total": 5,
      "depends_on_completed": ["task-2026-0320-001-chunk-1", "task-2026-0320-001-chunk-2"],
      "blocks": ["task-2026-0320-001-chunk-4"],
      "priority": "normal",
      "routing_reason": "task_type:server_side_logic → Backend Implementer (score: 5, exact_match + file_ownership)",
      "intent": "Backward-compatible endpoint — existing mobile clients will consume this. No breaking changes to user.ts exports."
    }
  }
}
```

#### Required Assignment Fields

| Field | Type | Description |
|-------|------|-------------|
| `assignment_id` | string | Unique identifier for tracking and dependency resolution |
| `parent_goal` | string | The higher-level goal this task serves (traceability) |
| `sequence_position` | integer | Position in the task sequence (1-indexed) |
| `sequence_total` | integer | Total tasks in the sequence |
| `depends_on_completed` | string[] | Assignment IDs that must be complete before this starts |
| `blocks` | string[] | Assignment IDs that cannot start until this completes |
| `priority` | enum | `critical`, `normal`, `low` — affects queue ordering |
| `routing_reason` | string | Why the Orchestrator selected this agent (auditable) |
| `intent` | string | The "why" behind the task — enables better agent trade-offs per routing-rules.md guidance |

#### Assignment vs. Handoff Discrimination

Consumers distinguish assignments from handoffs by checking `metadata.assignment`:
- Present → this is an Orchestrator assignment (new work)
- Absent → this is an agent-to-agent handoff (continuation of work)

---

## 4. Dependency Tracking Between Agents

### Current State

Part 6 (Parallel Execution Strategy) defines when to parallelize vs. serialize and describes coordination patterns (contract-first, checkpoint sync, ownership isolation). The interface contracts define what flows between agent pairs. Neither specifies how the Orchestrator tracks and enforces dependencies across a task graph.

### Proposed Protocol

#### Task Dependency Graph

The Orchestrator maintains a directed acyclic graph (DAG) of task assignments. Each node is a task assignment (with `assignment_id`). Edges represent `depends_on` / `blocks` relationships.

```
GOAL: "User preferences feature"

  [API Design]          [Schema Migration]
  (API Designer)        (Database Agent)
       \                    /
        \                  /
         v                v
      [Implement Endpoint]
      (Backend Implementer)
              |
              v
        [Write Tests]
        (Unit Test Writer)
              |
              v
         [QA Review]
         (QA Agent)
```

#### DAG Operations

| Operation | Trigger | Action |
|-----------|---------|--------|
| **Add node** | Orchestrator decomposes a goal | Create assignment, insert into DAG, compute edges from `depends_on`/`blocks` |
| **Complete node** | Agent returns successful handoff | Mark complete, evaluate if blocked downstream nodes are now unblocked |
| **Fail node** | Agent fails or is unavailable | Mark failed, suspend all transitive dependents, trigger recovery ladder |
| **Re-queue node** | Recovery produces a new assignment | Replace failed node, preserve edges, re-evaluate blocked nodes |
| **Cancel subtree** | Admiral or Orchestrator cancels a goal | Mark node and all transitive dependents as cancelled |

#### Scheduling Rules

1. **A task may only be dispatched when all `depends_on` assignments are marked complete.** No speculative execution — the cost of rework from stale dependencies exceeds the parallelism benefit.
2. **Tasks with no dependencies are immediately eligible for dispatch** (subject to agent availability).
3. **When a task completes, the Orchestrator scans all direct dependents** and dispatches any whose dependencies are now fully satisfied.
4. **Circular dependencies are a decomposition error.** The Orchestrator validates the DAG is acyclic at decomposition time. If a cycle is detected, escalate to the Architect for re-decomposition.

#### Dependency State Machine

Each task node has a state:

```
PENDING → READY → DISPATCHED → IN_PROGRESS → COMPLETED
                                    ↓
                                  FAILED → RETRYING → (back to DISPATCHED)
                                    ↓
                                SUSPENDED (dependent on failed upstream)
                                    ↓
                                CANCELLED
```

Transitions:
- `PENDING → READY`: all `depends_on` nodes reach COMPLETED
- `READY → DISPATCHED`: agent selected and assignment sent
- `DISPATCHED → IN_PROGRESS`: agent acknowledges receipt
- `IN_PROGRESS → COMPLETED`: agent returns successful handoff
- `IN_PROGRESS → FAILED`: agent fails (timeout, error, unavailability)
- `FAILED → RETRYING`: recovery ladder activates
- `PENDING/READY → SUSPENDED`: upstream dependency fails
- `SUSPENDED → PENDING`: upstream dependency recovers (re-evaluate readiness)
- Any state → `CANCELLED`: explicit cancellation

#### Reporting

The Orchestrator can report dependency status to the Admiral on request:

```
GOAL: User preferences feature
  [COMPLETED] API Design (API Designer) — 12,000 tokens
  [COMPLETED] Schema Migration (Database Agent) — 8,000 tokens
  [IN_PROGRESS] Implement Endpoint (Backend Implementer) — 23,000/50,000 tokens
  [PENDING] Write Tests (Unit Test Writer) — blocked by: Implement Endpoint
  [PENDING] QA Review (QA Agent) — blocked by: Write Tests

  Progress: 2/5 complete, 1 in progress, 2 blocked
  Budget: 43,000/150,000 tokens consumed (29%)
```

---

## 5. Orchestrator Context Management Strategy

### Current State

`fleet/context-injection.md` defines the three-layer context stack (Fleet → Project → Task) for specialist agents. `admiral/spec/part2-context.md` defines context loading discipline including the 50K standing context ceiling. Neither addresses the Orchestrator's unique challenge: it must hold fleet-wide state (roster, routing rules, dependency graph, active assignments) alongside project context, all within its own context window.

### Proposed Protocol

#### Orchestrator Context Budget

The Orchestrator's context window is divided into five zones. The allocations assume a 200K token context window (Tier 1 flagship model); percentages scale proportionally for larger windows.

| Zone | Allocation | Content | Eviction Policy |
|------|-----------|---------|-----------------|
| **Identity & Authority** | 5% (10K) | Orchestrator ASP, Standing Orders, decision authority matrix | Never evict |
| **Fleet State** | 15% (30K) | Agent roster, current status, routing rules, capability registry | Compress inactive agents |
| **Project Context** | 15% (30K) | Ground truth, boundaries, architecture overview, conventions | Summarize on pressure |
| **Active Task Graph** | 25% (50K) | Current DAG, active assignments, recent handoffs, dependency state | Evict completed subtrees |
| **Working Memory** | 40% (80K) | Current reasoning, decomposition, routing decisions, handoff construction | Natural turnover |

#### Context Pressure Management

When the Orchestrator approaches context limits (>85% utilization):

**Level 1 — Compress completed work:**
- Replace completed task nodes with one-line summaries: `[COMPLETED] API Design → spec at docs/api/pref-endpoint.yaml`
- Remove handoff payloads for completed tasks (deliverables are in files, not context)

**Level 2 — Externalize fleet state:**
- Write current DAG state to `admiral/state/task_graph.json`
- Write agent status to `admiral/state/fleet_status.json`
- Retain only active/blocked nodes in context
- Re-read from files when needed for scheduling decisions

**Level 3 — Session boundary:**
- If compression is insufficient, the Orchestrator creates a session handoff (Part 11)
- The handoff captures: DAG state, active assignments, decisions made, next actions
- A new Orchestrator session loads the handoff and resumes

#### What the Orchestrator Must Never Evict

Per the context budget guidelines in `fleet/context-injection.md`, the Orchestrator must always retain:

1. **Its own identity and authority** (who am I, what may I decide)
2. **Active dependency edges** (what blocks what — losing this causes dispatch errors)
3. **Agent "Does NOT Do" boundaries** for currently active agents (losing this causes wrong routing)
4. **Standing Orders** (governance backbone — cannot be reconstructed)

#### Orchestrator Checkpoint Protocol

The Orchestrator checkpoints its state at regular intervals to enable recovery:

| Trigger | Checkpoint Content | Location |
|---------|-------------------|----------|
| After each task completion | Updated DAG, agent status, metrics | `admiral/state/checkpoint.json` |
| At context pressure Level 2 | Full externalized state | `admiral/state/` directory |
| At session boundary | Session handoff per Part 11 | Handoff document |
| On Orchestrator failure | Last valid checkpoint | `admiral/state/checkpoint.json` |

---

## Impact Assessment

### Streams Unblocked

| Stream | What This Unblocks |
|--------|-------------------|
| **7** (Hooks & Fleet Foundation) | Agent registry and task routing engine can be implemented against concrete selection/assignment protocols |
| **8** (Execution Patterns & Ops) | Dependency tracking DAG provides the runtime model for parallel coordination, handoff, and escalation |
| **14** (Fleet Agent Definitions) | Machine-readable agent definitions can include capability scores referenced by the selection algorithm |
| **15** (Fleet Routing & Orchestration) | All five protocols directly feed the routing engine implementation |

### Backward Compatibility

- **Handoff v1 schema**: No breaking changes. Task assignments use the existing `metadata` extension point.
- **Routing rules**: No changes to the routing table. The selection algorithm adds scoring on top of existing rules.
- **Context injection**: No changes. The Orchestrator context strategy is additive to the existing three-layer model.

### New Artifacts Required for Implementation

| Artifact | Stream | Description |
|----------|--------|-------------|
| `admiral/schemas/task-assignment.v1.schema.json` | 15 | JSON Schema extending handoff v1 with required `metadata.assignment` fields |
| `admiral/schemas/task-graph.v1.schema.json` | 15 | JSON Schema for the externalized DAG state |
| `admiral/schemas/fleet-status.v1.schema.json` | 15 | JSON Schema for externalized fleet status |
| `fleet/selection-algorithm.md` | 14 | Reference documentation for the selection pipeline |
| `fleet/unavailability-protocol.md` | 7 | Reference documentation for the recovery ladder |

### Open Questions for Admiral Review

1. **Speculative execution**: Should the Orchestrator ever dispatch tasks before all dependencies complete? The current proposal says no — is this too conservative for latency-sensitive workflows?
2. **Agent instance identity**: The protocol assumes agents can have multiple instances (e.g., two Backend Implementers). Should the spec formally define instance identity vs. role identity?
3. **Cross-session DAG persistence**: Should the DAG survive across Orchestrator sessions by default, or only when explicitly checkpointed?
4. **Selection algorithm weights**: The proposed capability scores (3/2/1) are initial values. Should these be project-configurable, or should they be spec-fixed to ensure consistent behavior?

---

## Relationship to Other SD Tasks

| Task | Relationship |
|------|-------------|
| **SD-03** (Amendment proposals) | This proposal is a candidate amendment to Part 4 (Fleet) and Part 6 (Execution) |
| **SD-11** (Brain graduation) | Orchestrator context management strategy informs Brain checkpoint storage |
| **SD-12** (Cross-platform hooks) | Agent unavailability signals may differ across platforms — normalization needed |
| **SD-06** (Reference constants) | Selection algorithm defaults (max_queue_depth, deadline_tolerance) should be added to reference constants |
