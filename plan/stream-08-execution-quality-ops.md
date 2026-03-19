# Stream 8: Execution Patterns, Quality Gates & Operations (Spec Parts 5, 6, 7)

> *"Only tested implementation is truth." — The Admiral Philosophy*

**Current score:** 3/10 | **Target:** 8/10

Execution patterns (handoff, escalation, parallel), quality gates, and alerting pipeline — all specified, none implemented.

---

### 8.1 Execution Patterns (Part 5)

The spec defines three execution patterns — handoff, escalation, and parallel coordination. None are implemented. These patterns are how agents collaborate; without them, multi-agent work is just sequential single-agent work repeated.

- [ ] **S-10: Handoff protocol**
  - **Description:** Structured agent-to-agent handoff with JSON schema validation. When one agent completes its portion of work and needs another agent to continue, the handoff protocol ensures all necessary context, state, and intent are transferred completely. Incomplete handoffs are the primary cause of lost context in multi-agent systems.
  - **Done when:** Handoff schema (`handoff/v1.schema.json`) is defined, handoffs are validated against schema before acceptance, incomplete handoffs (missing required fields) are rejected with specific error, handoff history is logged for audit.
  - **Files:** `admiral/handoff/` (new directory), `admiral/handoff/schema.json` (new), `admiral/handoff/validate.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 5

- [ ] **S-11: Escalation pipeline**
  - **Description:** Implements the spec's 5-step escalation process: (1) intake — classify the issue by type and severity; (2) evaluation — determine root cause and query Brain for precedent; (3) resolution path generation — produce candidate solutions ranked by confidence; (4) Admiral decision — select resolution path with authority tracking; (5) execution — apply the chosen resolution and record the outcome as new precedent. This is the conflict resolution backbone of the entire framework.
  - **Done when:** Escalation flows through all 5 steps sequentially, Brain is queried for precedent at step 2, multiple resolution paths are generated at step 3, decision is recorded with authority level at step 4, outcome is persisted as precedent at step 5.
  - **Files:** `admiral/escalation/pipeline.sh` (new), `admiral/escalation/intake.sh` (new), `admiral/escalation/resolve.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 5, Part 11

- [ ] **S-12: Parallel execution coordinator**
  - **Description:** Coordinates parallel agent tasks with dependency tracking. Determines which tasks can run concurrently (no shared file ownership, no data dependencies) and which must be sequenced. Manages the lifecycle of parallel task groups: dispatch, monitor, collect results, detect failures.
  - **Done when:** Coordinator accepts a task graph with dependency edges, schedules independent tasks for parallel execution, blocks dependent tasks until prerequisites complete, handles partial failure (one task fails, others continue or abort based on policy).
  - **Files:** `control-plane/src/parallel-coordinator.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 5

---

### 8.2 Quality Assurance Gates (Part 6)

The spec defines SDLC quality automation — automated gates that prevent low-quality work from merging. Currently, quality is entirely advisory; nothing enforces it.

- [ ] **S-13: SDLC quality gate hooks**
  - **Description:** Pre-merge quality gates that enforce minimum standards: test coverage above configured threshold, linting passes with zero errors, review checklist is complete (no unchecked items). These gates transform quality standards from "should" to "must."
  - **Done when:** Quality gates block merges that fail any configured requirement, thresholds are configurable per-project, gate results are reported with specific failures (not just pass/fail), integrates with CI pipeline.
  - **Files:** `.githooks/pre-push` (new), `admiral/quality/gates.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 6

- [ ] **S-14: Structured code review checklist**
  - **Description:** Automated code review validation against a structured checklist covering security (no hardcoded secrets, input validation), performance (no N+1 queries, no unbounded loops), readability (naming conventions, documentation of non-obvious logic), and correctness (error handling, edge cases).
  - **Done when:** PR template includes the full checklist, CI validates that all checklist items are explicitly addressed (checked or marked N/A), incomplete reviews are flagged, review completion percentage is tracked.
  - **Files:** `.github/PULL_REQUEST_TEMPLATE.md`, `admiral/quality/review_checklist.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 6

---

### 8.3 Operations & Alerting (Part 7)

The control plane exists but operates as a closed system. Events are collected but not pushed externally. Health checks are minimal. Event storage is volatile.

- [ ] **S-15: Alerting pipeline**
  - **Description:** Push alerts from the control plane to external systems via configurable endpoints (webhook URL, local file, structured log). The RunawayDetector already identifies problems — this item ensures those problems reach humans or external systems rather than silently accumulating in an in-memory buffer.
  - **Done when:** Alerts flow from RunawayDetector (and other detectors) to at least one configured endpoint, alert payload includes severity/source/timestamp/details, delivery failures are retried with backoff, alert configuration is loaded from config file.
  - **Files:** `control-plane/src/alerting.ts` (new), `control-plane/src/server.ts`
  - **Size:** L
  - **Spec ref:** Part 7

- [ ] **S-16: Persistent event store**
  - **Description:** Long-term event storage beyond the in-memory ring buffer. Writes events to a JSONL file on disk so that event history survives server restarts. The in-memory ring buffer is appropriate for real-time queries but insufficient for historical analysis or post-incident investigation.
  - **Done when:** Events are written to a JSONL file on disk as they are ingested, file is rotated at configurable size threshold, events persist across server restarts, historical events can be queried from disk when not in memory.
  - **Files:** `control-plane/src/persistent-store.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 7

- [ ] **S-17: Health check endpoint enhancement**
  - **Description:** Expand the /api/health endpoint to expose comprehensive diagnostics: hook execution statistics (success/failure/skip counts), state file age (detect stale state), event ingestion lag (time between event creation and processing), alert rate (alerts per minute over sliding window).
  - **Done when:** `/api/health` returns all listed diagnostics in structured JSON, each metric includes current value and threshold status (healthy/degraded/critical), endpoint remains fast (sub-100ms response time).
  - **Files:** `control-plane/src/server.ts`
  - **Size:** M
  - **Spec ref:** Part 7

---

### 8.4 Cost Management (Part 8)

The spec defines cost tracking across four token dimensions and budget enforcement with circuit breakers. No cost attribution or budget enforcement exists today — token spend is invisible and unbounded.

- [ ] **S-18a: Per-agent cost attribution**
  - **Description:** Track token costs in four dimensions (input, output, thinking, tool call) attributed to each agent. Reveals which agents waste tokens and enables data-driven optimization of prompts and tool usage patterns.
  - **Done when:** Every agent invocation records token counts across all four dimensions, costs are aggregated per-agent and per-task, a summary report can be generated showing top token consumers, data is persisted for trend analysis.
  - **Files:** `admiral/cost/attribution.sh` (new), `control-plane/src/cost-tracker.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 8 — Cost Management

- [ ] **S-18b: Cost budget enforcement**
  - **Description:** Configurable per-agent and per-task token budgets with circuit breakers. When budget is exceeded, agent is paused and escalated. Prevents runaway token spend from a single agent or task consuming disproportionate resources.
  - **Done when:** Per-agent and per-task budgets are configurable, circuit breaker triggers when budget threshold is reached, agent is paused on breach with escalation to Admiral, budget state survives restarts.
  - **Files:** `admiral/cost/budget.sh` (new), `admiral/cost/circuit-breaker.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 8 — Cost Dimensions

- [ ] **S-18c: Metered service broker**
  - **Description:** Credential vault for paid external services, session-scoped allocation, fair-split billing, audit trail. Ensures paid API keys are not shared unsafely and usage is tracked per-agent for cost accountability.
  - **Done when:** Credential vault stores and issues scoped credentials, session-scoped allocation prevents credential leakage, usage is tracked per-agent with fair-split billing, audit trail records every credential checkout/checkin.
  - **Files:** `admiral/cost/service-broker.sh` (new), `admiral/cost/credential-vault.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 8 — Metered Service Broker; Part 11 — Paid Resource Authorization Protocol

---

### 8.5 Fleet Lifecycle Management (Part 8)

The spec defines a six-phase fleet lifecycle with distinct Admiral responsibilities per phase and project-type-specific preparation workflows. No lifecycle state machine or phase management exists today — fleet scaling is ad hoc.

- [ ] **S-19a: Fleet lifecycle state machine**
  - **Description:** Implement six phases (Preparation → Standup → Acceleration → Steady State → Wind-Down → Dormant) with entry/exit criteria, Admiral focus areas per phase. Provides structure for how a fleet of agents is spun up, managed, and retired.
  - **Done when:** State machine enforces phase transitions with entry/exit criteria validation, current phase is persisted and queryable, Admiral focus areas are loaded per phase, invalid transitions are rejected with explanation.
  - **Files:** `admiral/lifecycle/state-machine.sh` (new), `admiral/lifecycle/phases.json` (new)
  - **Size:** L
  - **Spec ref:** Part 8 — Fleet Scaling & Lifecycle

- [ ] **S-19b: Fleet preparation phase workflows**
  - **Description:** Four project-type workflows (greenfield, existing-documented, existing-undocumented, legacy) with preparation checklists per type. Each project type has different prerequisites before agents can be productive.
  - **Done when:** All four project-type workflows are defined with specific checklists, preparation phase selects correct workflow based on project classification, checklist completion is tracked and gates entry to Standup phase.
  - **Files:** `admiral/lifecycle/preparation.sh` (new), `admiral/lifecycle/workflows/` (new directory)
  - **Size:** M
  - **Spec ref:** Part 8 — Preparation Phase

- [ ] **S-19c: Agent retirement protocol**
  - **Description:** Complete in-flight work, update routing, archive Brain entries with retirement tag, reset trust scores. Ensures clean agent removal without orphaned work or stale state.
  - **Done when:** Retirement protocol completes or reassigns in-flight work, routing tables are updated to remove retired agent, Brain entries are tagged with retirement metadata, trust scores are reset, retirement is logged for audit.
  - **Files:** `admiral/lifecycle/retirement.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 8 — Fleet Scaling & Lifecycle

---

### 8.6 Adaptation & Institutional Memory (Part 8)

The spec defines change classification, fleet pause protocols, checkpoint files, and decision logs. These are the mechanisms for adapting to requirement changes mid-flight and preserving institutional knowledge across sessions.

- [ ] **S-20a: Change classification system**
  - **Description:** Three-tier classification (Tactical/Strategic/Full Pivot) with cascade map showing which framework artifacts must be updated when changes occur. Prevents under-reaction to major changes and over-reaction to minor ones.
  - **Done when:** Changes are classified into one of three tiers, cascade map defines affected artifacts per tier, classification triggers appropriate update workflow, cascade map is configurable per project.
  - **Files:** `admiral/adaptation/classify.sh` (new), `admiral/adaptation/cascade-map.json` (new)
  - **Size:** M
  - **Spec ref:** Part 8 — Adaptation Protocol

- [ ] **S-20b: Fleet pause protocol**
  - **Description:** Structured fleet pause for strategic changes: checkpoint all agents, pause routing, apply changes, validate, resume. Prevents agents from working against outdated instructions during significant changes.
  - **Done when:** Fleet pause checkpoints all active agents, routing is suspended during pause, changes are applied and validated before resume, resume restores agents from checkpoints, partial pause (subset of agents) is supported.
  - **Files:** `admiral/adaptation/fleet-pause.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 8 — Adaptation Protocol

- [ ] **S-20c: Checkpoint file format**
  - **Description:** Structured checkpoint files with completed/in-progress/blocked/decisions/assumptions/resources sections. Used for session persistence across restarts and fleet pause/resume cycles.
  - **Done when:** Checkpoint schema is defined and validated, checkpoints capture all required sections, checkpoints can be written and restored reliably, checkpoint age and staleness are tracked.
  - **Files:** `admiral/memory/checkpoint-schema.json` (new), `admiral/memory/checkpoint.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 8 — Institutional Memory

- [ ] **S-20d: Decision log**
  - **Description:** Append-only decision log recording timestamp, decision, alternatives, rationale, authority tier used. Provides institutional memory of why decisions were made, enabling future agents and humans to understand historical context.
  - **Done when:** Decision log schema is defined, decisions are appended immutably, each entry includes timestamp/decision/alternatives/rationale/authority, log is queryable by time range and decision type, log survives restarts.
  - **Files:** `admiral/memory/decision-log.sh` (new), `admiral/memory/decision-schema.json` (new)
  - **Size:** M
  - **Spec ref:** Part 8 — Institutional Memory

---

## Summary

| Subsection | Items | Total Size | Spec Parts Covered |
|---|---|---|---|
| 8.1 Execution Patterns | S-10 through S-12 | 3L | Part 5 |
| 8.2 Quality Gates | S-13 through S-14 | 2M | Part 6 |
| 8.3 Operations & Alerting | S-15 through S-17 | 1L + 2M | Part 7 |
| 8.4 Cost Management | S-18a through S-18c | 2L + 1M | Part 8 |
| 8.5 Fleet Lifecycle Management | S-19a through S-19c | 1L + 2M | Part 8 |
| 8.6 Adaptation & Institutional Memory | S-20a through S-20d | 4M | Part 8 |
| **Totals** | **18 items** | **7L + 11M** | **4 spec parts** |

**Status:** All 18 items (S-10 through S-20d) are unimplemented. S-10 through S-17 cover execution patterns, quality gates, and operations/alerting. S-18 through S-20 items are newly added to close Part 8 coverage gaps — cost management, fleet lifecycle, adaptation protocols, and institutional memory were identified in gap analysis as specified but not previously tracked.

**Critical dependencies within this scope:**
- S-15 (alerting pipeline) must exist before S-03 (governance heartbeat monitor, defined in 7.1) can deliver alerts externally.
- S-10 (handoff) and S-11 (escalation) are prerequisites for meaningful parallel coordination (S-12), since parallel tasks need a structured way to hand off results and escalate conflicts.
- S-18a (cost attribution) must exist before S-18b (budget enforcement), since budgets require measurement.
- S-19a (lifecycle state machine) must exist before S-19b (preparation workflows) and S-19c (retirement protocol), since both operate within the lifecycle framework.
- S-20c (checkpoint file format) must exist before S-20b (fleet pause protocol), since fleet pause depends on checkpointing agents.

**Recommended execution order within this scope:**
1. S-10 (handoff protocol) — foundational schema that other coordination patterns build on.
2. S-11 (escalation pipeline) — conflict resolution backbone; unblocks parallel work by defining what happens when parallel tasks conflict.
3. S-13 (quality gate hooks) — blocking enforcement; high leverage for immediate quality improvement.
4. S-14 (code review checklist) — pairs with S-13 to complete the quality gate picture.
5. S-15 (alerting pipeline) — makes the control plane observable externally.
6. S-16 (persistent event store) — makes history durable; pairs with S-15.
7. S-17 (health check enhancement) — final observability layer; depends on S-15 and S-16 being in place to have metrics worth reporting.
8. S-12 (parallel coordinator) — largest item; depends on S-10 and S-11 being stable.
9. S-18a (cost attribution) — measurement foundation for cost management.
10. S-18b (cost budget enforcement) — depends on S-18a for token tracking data.
11. S-18c (metered service broker) — credential vault and billing; can parallel with S-18b.
12. S-19a (fleet lifecycle state machine) — framework for lifecycle phases.
13. S-19b (fleet preparation workflows) — depends on S-19a for phase management.
14. S-19c (agent retirement protocol) — depends on S-19a for lifecycle transitions.
15. S-20a (change classification) — foundation for adaptation protocol.
16. S-20c (checkpoint file format) — schema needed before fleet pause.
17. S-20b (fleet pause protocol) — depends on S-20c for checkpointing.
18. S-20d (decision log) — independent; can be built any time after S-20a.
