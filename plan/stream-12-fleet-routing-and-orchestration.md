# Stream 12: Fleet Routing & Orchestration — Making Multi-Agent Work Real

> *"Routing rules that communicate intent produce better specialist output." — Admiral Spec, Part 4*

**Scope:** This stream covers the concrete implementation of the routing engine, model tier enforcement, context injection pipeline, interface contract validation, agent-to-agent handoffs, fleet health monitoring, task decomposition, conflict resolution, scaling policies, and agent lifecycle management. These are the runtime systems that turn a collection of agent definitions (Stream 11) into a coordinated fleet.

**Current state:** Routing rules exist as a markdown table in `fleet/routing-rules.md`. Model tiers are documented in `fleet/model-tiers.md`. Context injection patterns are described in `fleet/context-injection.md`. Interface contracts are specified in `fleet/interface-contracts.md`. None of these have executable implementations. The Orchestrator cannot actually route a task, enforce a model tier, inject context, or validate a handoff.

**Why this matters:** Agent definitions without routing are a phone book without a switchboard. The routing engine is the mechanism that translates "this task needs a database expert" into "route to Database Agent with schema context and backward-compatibility constraint." Without it, multi-agent orchestration is manual coordination — the Admiral must personally assign every task to every agent.

---

## O-01: Routing Rules Engine

- [ ] **O-01a: Task-type routing implementation**
  - **Description:** Implement the primary routing strategy: match task type to agent. Parse the routing table from `fleet/routing-rules.md` (86 task type -> agent mappings with fallbacks) into a machine-readable format. The engine must resolve primary agent, fallback agent, and "no match" escalation. Must enforce routing constraints: never route to an agent whose "Does NOT Do" list includes the task type, never route QA to the agent that produced the work.
  - **Done when:** Routing engine accepts a task type string and returns the primary agent, fallback agent, or escalation signal. All 86 routing rules from the routing table are loaded. Constraint violations (self-review, Does NOT Do) are rejected with clear error messages. Unit tests cover all routing rules plus constraint enforcement.
  - **Files:** `fleet/routing/engine.ts` (new), `fleet/routing/engine.test.ts` (new), `fleet/routing/rules.json` (new, generated from routing-rules.md)
  - **Size:** L
  - **Spec ref:** `fleet/routing-rules.md` — Route by Task Type

- [ ] **O-01b: File-ownership routing implementation**
  - **Description:** Implement the secondary routing strategy: match file paths to agent ownership. File ownership is project-specific and must be configurable per deployment. The engine must accept a list of files a task will modify and return the owning agent(s). When multiple agents own different files in the same task, the engine must signal a decomposition requirement.
  - **Done when:** Routing engine accepts file paths and returns owning agents. Ownership patterns are configurable via a project-specific config file. Multi-owner tasks produce a decomposition signal. Unit tests cover single-owner, multi-owner, and unowned file scenarios.
  - **Files:** `fleet/routing/file-ownership.ts` (new), `fleet/routing/file-ownership.test.ts` (new), `fleet/routing/ownership-config.schema.json` (new)
  - **Size:** M
  - **Spec ref:** `fleet/routing-rules.md` — Route by File Ownership

- [ ] **O-01c: Capability-matching routing**
  - **Description:** Implement routing by capability matching against the agent capability registry (Stream 11, F-13). When task-type and file-ownership routing both fail to produce a clear assignment, the engine falls back to capability matching: compare task requirements against agent capabilities in the registry and return the best-match agent. Must include a confidence score for the match and escalate when confidence is below threshold.
  - **Done when:** Capability matching produces ranked agent candidates with confidence scores. Low-confidence matches trigger escalation. Integration tests verify the fallback chain: task-type -> file-ownership -> capability-match -> escalation.
  - **Files:** `fleet/routing/capability-match.ts` (new), `fleet/routing/capability-match.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 4 — Routing Logic, `fleet/routing-rules.md` — Escalate Ambiguous Routing
  - **Depends on:** Stream 11 F-13 (agent capability registry)

---

## O-02: Model Tier Selection and Enforcement

- [ ] **O-02a: Model tier validation hook**
  - **Description:** Implement the `SessionStart: tier_validation` hook that validates the instantiated model against the tier specified in the agent's definition. A compromised orchestrator or misconfigured deployment that silently downgrades the Security Auditor from Tier 1 to Tier 3 must be caught and rejected. The hook reads the agent's tier assignment from its definition file and compares against the actual model being used.
  - **Done when:** SessionStart hook exists, validates model tier on every agent session start, rejects sessions where model does not meet minimum tier, logs tier validation results. Tests cover valid tier, invalid tier (too low), and missing tier assignment.
  - **Files:** `.hooks/tier_validation.sh` (new), `.hooks/tests/test_tier_validation.sh` (new)
  - **Size:** M
  - **Spec ref:** `fleet/model-tiers.md` — Enforcement section

- [ ] **O-02b: Degradation policy engine**
  - **Description:** Implement the API resilience degradation policy engine. When a model API fails (HTTP 5xx or timeout > 30s), the engine retries with exponential backoff (1s, 2s, 4s, 8s, max 30s, 4 retries). After retries exhausted, it consults the agent's degradation policy: if Degraded, switch to fallback model with 2x governance audit rate and cap degraded-mode tasks; if Blocked, queue the task and alert the Admiral. Must enforce per-agent overrides (Security Auditor: Blocked, Orchestrator: Degraded max 3 tasks).
  - **Done when:** Degradation engine handles retry, fallback, and blocking. Per-agent overrides from `fleet/model-tiers.md` are enforced. No cascading degradation (Tier 1 -> Tier 2 fallback cannot further degrade to Tier 3). Recovery protocol switches back to primary on next task after API recovery. Unit tests cover all degradation paths.
  - **Files:** `fleet/routing/degradation.ts` (new), `fleet/routing/degradation.test.ts` (new)
  - **Size:** L
  - **Spec ref:** `fleet/model-tiers.md` — API Resilience: Degradation Policies

- [ ] **O-02c: Model tier promotion/demotion tracking**
  - **Description:** Implement tracking for tier promotion and demotion signals. Record first-pass quality rates per agent per tier, rework costs, and A/B test results. When rework cost exceeds tier upgrade cost, surface a promotion recommendation. When output quality is indistinguishable between tiers, surface a demotion recommendation. Integrate with Brain for persistence.
  - **Done when:** Tier performance metrics are tracked per agent. Promotion and demotion recommendations are generated based on the signals defined in `fleet/model-tiers.md`. Recommendations are recorded in the Brain for trend analysis.
  - **Files:** `fleet/routing/tier-tracking.ts` (new), `fleet/routing/tier-tracking.test.ts` (new)
  - **Size:** M
  - **Spec ref:** `fleet/model-tiers.md` — Promotion and Demotion Signals

---

## O-03: Context Injection Pipeline

- [ ] **O-03a: Three-layer context assembly**
  - **Description:** Implement the context injection pipeline that assembles the three-layer context stack for each agent: Layer 1 (Fleet Context — agent definition, standing orders, protocols), Layer 2 (Project Context — ground truth, boundaries, tech stack), Layer 3 (Task Context — specific assignment from Orchestrator). Must respect the assembly order from `fleet/prompt-anatomy.md`: Identity -> Authority -> Constraints -> Knowledge -> Task. Must enforce context budget allocation per the priority table in `fleet/context-injection.md`.
  - **Done when:** Context assembler produces a complete prompt for any agent given its definition file, project context, and task assignment. Assembly order is enforced (Identity first, Task last). Context budget is tracked and enforced per priority tier. Context sufficiency check passes (agent can answer "what is my role?", "what may I decide?", "what must I not do?").
  - **Files:** `fleet/context/assembler.ts` (new), `fleet/context/assembler.test.ts` (new)
  - **Size:** L
  - **Spec ref:** `fleet/context-injection.md`, `fleet/prompt-anatomy.md`

- [ ] **O-03b: Category-specific context checklists**
  - **Description:** Implement the category-specific context injection checklists from `fleet/context-injection.md`. Engineering agents need architecture overview, API contracts, database schema, test patterns, CI/CD pipeline. Quality agents need acceptance criteria format, quality floor, test infrastructure. Security agents need trust boundaries, compliance requirements, auth architecture, data classification. Governance agents need fleet roster, agent definitions, quality thresholds, decision log, failure mode priorities.
  - **Done when:** Each agent category has a context checklist that is validated at session start. Missing critical context items produce warnings. Missing Identity/Authority/Constraints produce errors (session cannot start). Context checklists are configurable per project.
  - **Files:** `fleet/context/checklists.ts` (new), `fleet/context/checklists.test.ts` (new), `fleet/context/checklists.json` (new)
  - **Size:** M
  - **Spec ref:** `fleet/context-injection.md` — Project Context Checklist
  - **Depends on:** O-03a

- [ ] **O-03c: Progressive disclosure via skills**
  - **Description:** Implement Pattern 2 from context injection: progressive disclosure via skill files. Context too large to fit in standing context loads on demand when relevant file patterns or keywords are encountered. Must define the skill file format, the trigger patterns (file globs, keywords), and the loading mechanism for each platform adapter.
  - **Done when:** Skill files load automatically when matching file patterns are touched. Loading is lazy (not at session start). Loaded skills consume context budget from the Medium priority tier. Skill loading is logged for observability.
  - **Files:** `fleet/context/skills.ts` (new), `fleet/context/skills.test.ts` (new)
  - **Size:** M
  - **Spec ref:** `fleet/context-injection.md` — Injection Patterns, Pattern 2

---

## O-04: Interface Contract Validation

- [ ] **O-04: Handoff contract validation**
  - **Description:** Implement validation of agent-to-agent handoffs against the interface contracts defined in `fleet/interface-contracts.md`. When Agent A hands off to Agent B, the handoff payload must conform to the contract for that agent pair. Validate required fields are present, types are correct, and acceptance criteria are included. Reject handoffs that violate contracts, routing the rejection through the Orchestrator (never directly back to sender). Track repeated contract violations — 3+ rejections for the same agent pair signals decomposition failure.
  - **Done when:** Handoff validator checks payloads against contracts for all defined agent pairs. Missing or malformed fields produce structured rejection with specific field references. Repeated violations (3+ per session) trigger decomposition review alert. All contract types from interface-contracts.md are covered: Engineering, Quality, Security, Cross-Category, Governance, Scale Agent, Lifecycle, Meta & Autonomous, Adversarial, Domain & Data.
  - **Files:** `fleet/handoff/validator.ts` (new), `fleet/handoff/validator.test.ts` (new), `fleet/handoff/contracts.json` (new, generated from interface-contracts.md)
  - **Size:** L
  - **Spec ref:** `fleet/interface-contracts.md`, Part 4 — Interface Contracts

---

## O-05: Agent-to-Agent Handoff Protocol

- [ ] **O-05a: Handoff protocol implementation**
  - **Description:** Implement the full handoff protocol for agent-to-agent transfers. A handoff includes: context transfer (what the receiving agent needs to know), state serialization (what work has been done so far), validation (does the handoff conform to the interface contract), and routing (which agent receives the handoff). Must support the handoff schema defined in `fleet/interface-contracts.md` including the `metadata` extension point for domain-specific fields.
  - **Done when:** Handoff protocol produces serialized handoff documents that conform to `handoff/v1.schema.json`. Receiving agents can reconstruct context from the handoff document alone. Metadata extension point supports governance, security, and domain-specific fields. Round-trip test: Agent A produces handoff -> validator checks -> Agent B receives and can act.
  - **Files:** `fleet/handoff/protocol.ts` (new), `fleet/handoff/protocol.test.ts` (new), `fleet/handoff/v1.schema.json` (new)
  - **Size:** L
  - **Spec ref:** `fleet/interface-contracts.md` — Schema Extensions for Domain-Specific Contracts
  - **Depends on:** O-04

- [ ] **O-05b: Multi-agent pipeline orchestration**
  - **Description:** Implement sequential multi-agent pipelines where each step's output becomes the next step's input via the handoff protocol. Example from spec: API Designer -> Database Agent -> Backend Implementer -> Unit Test Writer -> QA Agent. The Orchestrator must track pipeline progress, handle step failures (retry, skip, or abort), and ensure handoffs between steps are validated.
  - **Done when:** Multi-agent pipelines execute with validated handoffs between each step. Pipeline progress is tracked with status per step. Step failures produce structured error with options (retry, skip, abort). Pipeline completion produces a consolidated trace. Integration test runs a 3+ step pipeline end-to-end.
  - **Files:** `fleet/orchestration/pipeline.ts` (new), `fleet/orchestration/pipeline.test.ts` (new)
  - **Size:** L
  - **Spec ref:** `fleet/routing-rules.md` — Multi-Agent Tasks
  - **Depends on:** O-05a

---

## O-06: Fleet Health Monitoring

- [ ] **O-06: Fleet health monitoring implementation**
  - **Description:** Implement real-time fleet health monitoring that tracks agent utilization, response times, error rates, token consumption, and task throughput across the fleet. This feeds the Fleet Control Plane (CP2+) with the data it needs for the Fleet Status View. Must track per-agent metrics and fleet-wide aggregates. Implement the alert classification system (CRITICAL/HIGH/MEDIUM/LOW) with deduplication, suppression windows, and severity gating to prevent alert fatigue.
  - **Done when:** Fleet health monitor collects and aggregates metrics from all active agents. Alert system fires on threshold crossings with proper classification. Deduplication prevents alert storms. Dashboard data is available via API for the Control Plane to consume. Metrics include: agent utilization, task throughput, error rate (rolling 1h), budget burn rate, first-pass quality rate (rolling).
  - **Files:** `fleet/monitoring/health.ts` (new), `fleet/monitoring/health.test.ts` (new), `fleet/monitoring/alerts.ts` (new), `fleet/monitoring/alerts.test.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 9 — Fleet Observability, Fleet Control Plane extension — CP2 Alert System

---

## O-07: Task Decomposition Engine

- [ ] **O-07: Task decomposition engine**
  - **Description:** Implement the Orchestrator's task decomposition capability. Given a complex task, the engine breaks it into subtasks assignable to individual agents. Each subtask must have: clear agent assignment, acceptance criteria, context file list, and budget allocation. Decomposition must produce natural boundaries — splitting a single concern across agents is wrong and should trigger escalation instead. Must detect when decomposition produces subtasks that are artificial or fragile.
  - **Done when:** Decomposition engine accepts a task description and produces a list of subtasks with agent assignments, acceptance criteria, and context requirements. Decomposition validates that each subtask maps to exactly one agent (no multi-agent subtasks). Artificial decompositions (splitting a single concern) are detected and escalated. Integration with routing engine (O-01) for agent assignment.
  - **Files:** `fleet/orchestration/decomposition.ts` (new), `fleet/orchestration/decomposition.test.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 4 — Routing Logic, `fleet/routing-rules.md` — Escalate Ambiguous Routing
  - **Depends on:** O-01a, O-01b

---

## O-08: Conflict Resolution for Overlapping File Ownership

- [ ] **O-08: File ownership conflict resolution**
  - **Description:** Implement conflict resolution for when two agents both claim write access to the same file. This occurs when a task touches files owned by different agents (e.g., a migration that modifies both `db/migrations/` and `src/services/`). Resolution strategies: decompose the task so each agent touches only its owned files, designate a primary owner with the other agent reviewing, or escalate to the Architect for boundary redesign.
  - **Done when:** Conflict detector identifies overlapping file ownership at task assignment time (before execution, not during). Resolution strategies are applied in priority order: decompose -> primary/reviewer -> escalate. Resolution decisions are logged with rationale. Unit tests cover two-agent overlap, three-agent overlap, and unowned files.
  - **Files:** `fleet/routing/conflict-resolution.ts` (new), `fleet/routing/conflict-resolution.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 4 — Tool Interaction Contracts (ownership boundaries, conflict resolution)
  - **Depends on:** O-01b

---

## O-09: Fleet Scaling Policies

- [ ] **O-09: Fleet scaling policies**
  - **Description:** Implement rules for when to spawn additional agent instances vs. queue tasks. Define scaling triggers: queue depth exceeding threshold, agent utilization above 80% for sustained period, task wait time exceeding SLA. Define scaling limits: maximum agents per role, maximum total fleet size (the spec warns against fleet bloat above 12 active specialists). Implement cooldown periods to prevent scaling oscillation.
  - **Done when:** Scaling policy engine monitors queue depth, utilization, and wait times. Scaling recommendations are produced when triggers fire. Fleet size limits are enforced (warn at 12, hard limit configurable). Cooldown periods prevent rapid scale-up/scale-down cycles. Scaling decisions are logged for trend analysis.
  - **Files:** `fleet/orchestration/scaling.ts` (new), `fleet/orchestration/scaling.test.ts` (new), `fleet/orchestration/scaling-config.schema.json` (new)
  - **Size:** M
  - **Spec ref:** Part 4 — Fleet Composition (anti-pattern: fleet bloat), Fleet Control Plane extension — CP4 Fleet Scaling

---

## O-10: Agent Warm-up and Cool-down

- [ ] **O-10: Agent warm-up and cool-down**
  - **Description:** Implement context pre-loading for anticipated tasks (warm-up) and context release for idle agents (cool-down). Warm-up: when the Orchestrator's decomposition produces tasks for an agent that is not yet active, pre-load that agent's Layer 1 and Layer 2 context so it is ready to execute immediately when assigned. Cool-down: when an agent has been idle for a configurable period, release its context to free memory and reduce costs. Cool-down agents retain their trust level and Brain entries but must re-load context on next activation.
  - **Done when:** Warm-up pre-loads agent context before task assignment. Cool-down releases context after configurable idle period. Re-activation after cool-down re-loads context correctly. Warm-up/cool-down events are logged for observability. Metrics track warm-up latency savings vs. baseline cold-start.
  - **Files:** `fleet/orchestration/lifecycle.ts` (new), `fleet/orchestration/lifecycle.test.ts` (new)
  - **Size:** M
  - **Spec ref:** `fleet/context-injection.md` — The Context Stack, Part 9 — Fleet Observability
  - **Depends on:** O-03a
