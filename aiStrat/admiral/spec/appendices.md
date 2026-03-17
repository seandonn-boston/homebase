# APPENDICES

-----

## A — Pre-Flight Checklist

Before deploying, verify the items for your target profile. Each profile includes all items from lower profiles. **Only check items for your current profile** — checking ahead encourages premature implementation.

> **Bootstrap note:** If you are deploying for the first time, follow [`QUICKSTART.md`](../../QUICKSTART.md) first — it provides a linear, step-by-step bootstrap sequence. Then return to this checklist to verify completeness. Bootstrap sequence: (1) follow QUICKSTART.md; (2) run this Pre-Flight Checklist to verify nothing was missed.

### Step 0 — Project Readiness Assessment

Before checking Starter items, assess whether the project is ready for fleet deployment. See Project Readiness Assessment (Part 1) for the full framework.

- [ ] **Can you write the Mission statement right now?** If no: you need a strategy session, not Admiral. Enter Preparation phase (Fleet Scaling & Lifecycle, Part 8).
- [ ] **Do documented coding conventions exist?** If no: document them first. The fleet cannot enforce conventions that don't exist. Deploying enforcement without documented conventions produces Convention Inference (failure mode #21, Part 7) — the fleet treats historical accidents as intentional decisions.
- [ ] **Do quality gates exist (CI, tests, linting)?** If no: scaffold them before deploying enforcement hooks. Hooks enforce quality gates. Without gates, hooks have nothing to enforce.
- [ ] **Does someone understand the codebase well enough to define scope boundaries?** If no: study the codebase first — with deterministic tools and human judgment, not with an agent. An agent mapping an unfamiliar codebase produces confident-sounding output that may not reflect reality (Archaeology Hallucination, failure mode #22, Part 7).
- [ ] **Has the team agreed on what decisions the fleet can make autonomously?** If no: default to everything as Propose/Escalate. Widen Autonomous tier after the fleet demonstrates competence per Progressive Autonomy (progressive-autonomy.md).

**If all five are checked:** Proceed to Starter Profile below.
**If 1–2 are unchecked:** Proceed to Starter with those items as immediate tasks during the first session. Ground Truth will be completed during Standup.
**If 3+ are unchecked:** Enter Preparation phase (Fleet Scaling & Lifecycle, Part 8). Complete the human work before deploying the fleet.

### Starter Profile

**Part 1 — Strategy**

- [ ] **Mission (01):** Project identity, success state, stakeholders, phase, pipeline entry point.
- [ ] **Boundaries (02):** Non-goals, hard constraints, resource budgets, quality floor, LLM-Last boundary.
- [ ] **Success Criteria (03):** Functional, quality, completeness, negative, failure, and judgment boundary criteria. Machine-verifiable where possible.

**Part 2 — Context**

- [ ] **Configuration File Strategy (07):** AGENTS.md under 150 lines. Tool-specific pointers (CLAUDE.md, etc.) configured. All version-controlled.

**Part 3 — Enforcement**

- [ ] **Deterministic Enforcement (08):** Every constraint classified Hook / Instruction / Guidance. Safety-critical constraints deployed as live hooks (token budget, loop detection, context health). Self-healing loops operational. Hooks are running in the agent runtime — not just tested as code.
- [ ] **Configuration Security (10):** Audit configs. Set CODEOWNERS. Pin MCP servers if applicable.

**Part 11 — Protocols**

- [ ] **Standing Orders (36):** All 15 Standing Orders loaded into agent standing context. Referenced from AGENTS.md.

**Identity**

- [ ] **Simple identity model:** Agent-id + role defined. No cryptographic signing required. The identity *model* exists and can be progressively hardened at higher profiles.

**Scope boundary check — do NOT have at Starter:**

- [ ] No handoff protocols implemented (no agents to hand off to).
- [ ] No escalation routing implemented (no agents to route through).
- [ ] No governance heartbeat monitors (no governance agents exist).
- [ ] No tier validation hooks (no fleet roster exists).
- [ ] No empty placeholder packages for future profiles.
- [ ] No HMAC-SHA256 identity tokens (S2/B3 concern).

### Team Profile

Everything from Starter, plus:

**Part 2 — Context**

- [ ] **Context Engineering (04):** Instructions follow prompt anatomy (Identity → Authority → Constraints → Knowledge → Task). Tested with probes.
- [ ] **Ground Truth (05):** Ontology, naming, tech stack versions, access/permissions, known issues, configuration artifacts.
- [ ] **Context Window Strategy (06):** Profiles per role. Loading order, refresh triggers, sacrifice order. Progressive disclosure.

**Part 3 — Enforcement**

- [ ] **Decision Authority (09):** Four tiers with concrete examples. Calibrated to project maturity.

**Part 4 — Fleet**

- [ ] **Fleet Composition (11):** Roster with roles, "Does NOT Do" boundaries, routing, interface contracts. 5–12 agents.
- [ ] **Tool & Capability Registry (12):** Per-agent tool registry including negative tool list and MCP servers.
- [ ] **Model Selection (13):** Every role assigned to tier with rationale. Context requirements verified.
- [ ] **Protocol Integration (14):** MCP servers registered and pinned. A2A configured if needed.

**Part 6 — Execution**

- [ ] **Work Decomposition (18):** Chunks with entry/exit states, budgets, quality gates. Spec-first pipeline if applicable.

**Part 7 — Quality**

- [ ] **Failure Recovery (22):** Recovery ladder documented. Max retries set. Escalation template ready.

**Part 8 — Operations**

- [ ] **Institutional Memory (24):** Persistence pattern selected. Decision log location established. Checkpoint template ready.

**Part 11 — Protocols**

- [ ] **Escalation Protocol (37):** Escalation routing and report format defined.
- [ ] **Handoff Protocol (38):** Structured handoff format for inter-agent transfers.

> **Implementation Notes (from reference implementation — `admiral/`):**
>
> The Team profile checklist mixes two categories of requirement that should be distinguished:
> 1. **Model requirements** (Pydantic classes, data structures, validation logic) — testable without deployment.
> 2. **Deployment requirements** (running MCP servers, probe testing, populated fleet rosters) — require runtime infrastructure.
>
> Specific gaps identified during implementation:
> - **Context Engineering** "tested with probes": No probe framework is defined in the spec. `AgentDefinition.prompt_anchor` provides the structure; probe testing requires a runtime harness (arguably Governed profile).
> - **Fleet Composition** "5-12 agents": The model supports 1-12 agents. Populating a roster with concrete agent definitions is a configuration task, not a framework task. Consider clarifying the distinction.
> - **Failure Recovery** "Recovery ladder": The spec's 5-step ladder (Retry → Fallback → Backtrack → Isolate → Escalate) is cross-cutting — it touches context management, fleet routing, and escalation protocol. The model enforces no-skip progression but the runtime integration spans multiple systems.
> - **Time estimates**: The "~2 hours per item" estimate does not account for cross-model validation (e.g., context budget ↔ agent definition) or test writing. Realistic implementation is 3-4 hours per item with tests.
> - **Protocol Integration** "A2A configured if needed": A2A is primarily a F3+ concern (cross-process communication between governance agents). The model exists for when it is needed. The spec's "if needed" qualifier means this is conditionally complete at Team profile.
> - **Standing Order 12** has exactly 7 rules (verified in reference implementation). Like SO 11's 6 rules, this is a fixed count that implementations should validate.
> - **LLM-Last boundary enforcement** (Boundaries, Part 1) is a documentation concern — it defines which tools are deterministic vs. which require LLM judgment. It does not require a hook or runtime check until the Governed profile when governance agents verify compliance.
> - **Async hook execution** is deferred to Governed profile and above. The manifest schema accepts the `async` field for forward compatibility, but Starter and Team runtimes should execute all hooks synchronously.

### Governed Profile

Everything from Starter and Team, plus:

**Part 7 — Quality**

- [ ] **Quality Assurance (21):** Verification levels per task type. Self-healing loops operational. QA template ready.
- [ ] **Failure Modes (23):** Configuration reviewed against catalog. Mitigations in place.

**Part 8 — Operations**

- [ ] **Cost Management (26):** Per-session and per-phase budgets. Cost tracking in place. LLM-Last implemented.
- [ ] **Metered Service Broker (26):** If the fleet shares pooled API keys or subscription accounts, deploy a service broker with credential vault, session management, and fair-split billing. See Cost Management (Part 8), "Metered Service Broker."
- [ ] **Fleet Health Metrics (27):** Metrics selected. Collection rhythm defined.
- [ ] **Fleet Scaling (28):** Lifecycle phase identified. Scaling signals understood. Size upper bound set.

**Governance**

- [ ] **Governance agents deployed:** Token Budgeter, Hallucination Auditor, Loop Breaker minimum. Governance heartbeat monitor hook now active.
- [ ] **B3 (COMPLETE):** Postgres + pgvector deployed. Schema created. MCP server running. Identity tokens implemented. Zero-trust access control configured. See `brain/level3-spec.md`.
- [ ] **Intelligence Lifecycle (17):** Capture triggers defined (chunk boundaries, decisions, failures). Review cadence scheduled.
- [ ] **Quarantine layer:** Spec-only quarantine for external intelligence active.

### Production Profile

Everything from previous profiles, plus:

**Part 6 — Execution**

- [ ] **Parallel Execution (19):** Parallelization criteria. Coordination patterns. Divergence detection.
- [ ] **Swarm Patterns (20):** Confirmed hierarchical fleet sufficient, or swarm topology defined.

**Part 8 — Operations**

- [ ] **Adaptation Protocol (25):** Change tiers defined. Cascade map understood. Pause Protocol documented.
- [ ] **Continuous Monitor:** Monitor configured with watched repos, search queries, and RSS feeds. Scheduler (cron or CI workflow) enabled. Quarantine layer operational. Digest review cadence matches scan cadence.

**Part 9 — Platform**

- [ ] **Fleet Observability (30):** Instrumentation strategy defined. Trace correlation configured. Sampling policy set. Dashboard or trace viewer operational.
- [ ] **CI/CD & Event-Driven Operations (31):** Event-driven agent definitions created per trigger type. Context bootstrap sequences configured. Cost caps set per invocation. Result routing configured.
- [ ] **Fleet Evaluation (32):** Baseline metrics established. Evaluation cadence defined. A/B testing methodology understood. First evaluation report template ready.

**Part 10 — The Admiral**

- [ ] **Admiral Self-Calibration (33):** Bottleneck signals known. Trust log initialized. Growth stage assessed. Intent fluency self-assessed.
- [ ] **Intent completeness:** Task assignments communicate goal, priority, constraints, failure modes, judgment boundaries, and values. See [`intent-engineering.md`](../extensions/intent-engineering.md).
- [ ] **Human-Expert Routing (34):** Expert Roster defined. Routing triggers documented. Consultation template ready.

**Enforcement**

- [ ] **Full Standing Orders enforcement:** All 15 Standing Orders with hook-based enforcement.
- [ ] **Configuration Security (10):** Full security audit checklist completed. MCP servers audited and pinned.

### Enterprise Profile

Everything from previous profiles, plus:

- [ ] **Cross-fleet Brain federation:** Cross-project namespace established. Multi-fleet query authorization.
- [ ] **Multi-Operator Governance (35):** Multiple admirals with coordinated authority. Knowledge boundaries set. Sharing protocol defined.
- [ ] **Inter-Fleet Governance (29):** Cross-fleet hooks coordinated. Review cadence scheduled.

-----

## B — Quick-Start Sequence

Structured around the five Quick-Start Profiles (see index.md). Complete each profile before advancing. Each profile progressively deepens intent operationalization: The Starter profile establishes the **intent foundation** (what are we building, what constrains us, how do we know we're done). The Team profile makes intent **operational** (who enforces it, with what tools, how do they coordinate). The Governed profile adds **intent governance** (how do we detect when intent is being violated). The Production profile makes intent **persistent** (how do we remember what we learned, scale safely).

### Starter Profile (30 minutes to configure, 1-2 days to implement)

> **Time estimate clarification:** "30 minutes" is for **configuring** an existing tool (writing AGENTS.md, setting up hooks in Claude Code or your platform). If you are **building a framework implementation** (writing the hook engine, data models, etc.), expect 1-2 days for the Starter profile. The reference implementation (Admiral-builds-Admiral) took ~5,500 lines of Python and 148 tests to reach verified Starter completion. See Case Study 4 (Appendix D).

1. **Standing Orders (36)** — Load the 15 non-negotiable rules into agent context. These govern everything that follows. Despite their Part 11 position, Standing Orders are a Starter prerequisite — read them before implementing anything else.
2. **Mission (01)** — What you are building. What success looks like.
3. **Boundaries (02)** — What you are NOT building. Resource budgets.
4. **Success Criteria (03)** — Machine-verifiable definition of "done."
5. **Configuration File Strategy (07)** — Create AGENTS.md (<150 lines). Tool-specific pointers configured. Reference Standing Orders from AGENTS.md.
6. **Deterministic Enforcement (08)** — Classify constraints (see classification decision process in Deterministic Enforcement, Part 3). **Deploy** hooks for safety-critical ones as live enforcement in your agent runtime (e.g., `.claude/hooks/` for Claude Code, equivalent for other platforms). "Deploy" means the hooks run and block violations in real sessions — not just that the hook code exists and passes tests. Only deploy `E1` hooks (token budget, loop detection, context health). Standing Orders define the *content* that hooks enforce.
7. **Configuration Security (10)** — Audit configs. Pin MCP servers (if applicable at this profile). Set CODEOWNERS.

> **Critical sequencing insight (from implementation):** Implementers naturally organize work by *code architecture* (data models → engine → tests). Admiral organizes by *operational maturity*. These are different orderings. If you build the hook engine before creating AGENTS.md and loading Standing Orders, you have infrastructure without governance — the dogfooding loop is broken. **Create AGENTS.md and Standing Orders first**, then build the infrastructure to enforce them.

**You can start working here.** One agent with clear Identity, Scope, Boundaries, and hooks.

> **Note on Identity Tokens:** At Starter profile, simplified identity (agent-id + role, no cryptographic signing) is sufficient. Full cryptographic token signing with expiry and cross-project access control is an S2/B3 concern (Decision Authority, Part 3; vulnerability 8.3.2), deployed alongside the complete Brain. However, the identity *model* should be defined at Starter so it can be progressively hardened. **Do not implement cryptographic identity at Starter** — it has no consumer until zero-trust access control is deployed at the Governed profile.

> **Starter scope boundary — do NOT build these yet:**
> - Handoff protocols or session handoff documents (Handoff Protocol, Part 11) — there is one agent, no one to hand off to.
> - Escalation routing or escalation reports (Escalation Protocol, Part 11) — there is one agent, no chain to escalate through.
> - Governance heartbeat monitor hook — there are no governance agents until the Governed profile.
> - Tier validation hook — there is no fleet roster or model tier assignments until the Team profile.
> - Identity validation hook with hash checking — simplified identity (agent-id + role) is sufficient.
> - Empty placeholder packages/directories for future profiles — create directories when you need them.
>
> If you find yourself building multi-agent infrastructure for a single agent, stop. You are building ahead of your target profile. Define the *models* so they can grow, but do not implement features that have no consumer.

### Team Profile (2-4 hours)

8. **Ground Truth (05)** — Tech stack, tools, access, vocabulary.
9. **Fleet Composition (11)** — 5-8 agents, roles, routing, interface contracts.
10. **Decision Authority (09)** — Four authority tiers for this project's risk profile.
11. **Tool & Capability Registry (12)** — Available and unavailable tools per agent.
12. **Model Selection (13)** — Assign each role to a tier. Verify context fit.
13. **Context Engineering (04)** — Write system prompts per prompt anatomy. Run probes.
14. **Context Window Strategy (06)** — Profiles, loading order, progressive disclosure.
15. **Work Decomposition (18)** — Break first phase into chunks.
16. **Institutional Memory (24)** — File-based checkpoints and handoff documents.

### Governed Profile (1-2 days)

17. **Governance agents** — Deploy Token Budgeter, Hallucination Auditor, and Loop Breaker minimum. Add remaining governance agents as needed.
18. **Cost Management (26)** — Per-session and per-phase budgets. Cost tracking active. If the fleet shares pooled API keys or subscription accounts, deploy the metered service broker.
19. **B3 (COMPLETE)** — Deploy Postgres + pgvector. Create schema. Register Brain MCP server. Implement identity tokens and zero-trust access control. See `brain/level3-spec.md`.
20. **Quality Assurance (21)** — Verification levels per task type. Self-healing loops operational.
21. **Failure Recovery (22)** — Recovery ladder documented. Max retries set.

### Production Profile (1-2 weeks)

22. **Full fleet deployment** — Scale agents for review cycles. Full enforcement coverage.
23. **Protocol Integration (14)** — Register MCP servers. Configure A2A if needed.
24. **Continuous Monitor** — Configure watched repos, RSS feeds. Enable GitHub Actions workflow. Quarantine layer operational.
25. **Fleet Observability (30)** — Instrumentation strategy. Trace correlation. Dashboards.
26. **Remaining sections** — Adaptation (25), Metrics (27), Scaling (28), CI/CD Operations (31), Evaluation (32), Admiral (33), Expert Routing (34).

### Enterprise Profile (2-4 weeks)

27. **Cross-fleet Brain federation** — Multi-project namespace. Cross-fleet query authorization.
28. **Multi-Operator Governance (35)** — Multiple admirals. Knowledge sharing protocols. Inter-Fleet Governance (29).
29. **Cross-fleet hooks** — Coordinated enforcement policies across fleets.

**The most common mistake is starting at the Enterprise profile.** See Case Study 2 (Appendix D) for what happens when you over-engineer from day one.

-----

## C — Worked Example: SaaS Task Manager

> **Profile note:** This example deploys a Governed profile fleet (8 agents including governance agents). The Mission, Boundaries, Success Criteria, and Enforcement sections apply at Starter. The Fleet Roster and governance failure scenarios demonstrate Governed profile capabilities — if you are at Starter or Team, they show where you are headed, not what you need now.

A concrete application for a mid-complexity greenfield project.

### Mission (01)

> This project is a collaborative task management application for small teams (5–20 members).
>
> It is successful when a team can create projects, assign tasks, track progress through customizable workflows, and receive notifications — all within sub-200ms UI response time.
>
> Built for small-team leads and individual contributors who need lightweight project tracking without enterprise overhead.
>
> Current phase: greenfield. Pipeline entry: Fleet takes over at Task Decomposition.

### Boundaries (02)

> NON-GOALS: No Gantt charts. No resource allocation. No time tracking. No mobile app. No SSO (email/password only for v1).
>
> CONSTRAINTS: Next.js 15, TypeScript 5.7, PostgreSQL 16, Tailwind 4.0. Ship MVP in 6 weeks. WCAG 2.1 AA.
>
> BUDGETS: 50K tokens per task. 30 minutes per task. Agents modify only `src/` and `prisma/`.
>
> QUALITY FLOOR: ESLint zero errors. All new code tested. Lighthouse accessibility 90+. No `any` types.
>
> LLM-LAST: Formatting (Prettier), linting (ESLint), type checking (tsc), import sorting handled by deterministic tools. LLM for: implementation logic, code review, design decisions.

### Success Criteria (03)

> `npm run lint` exits 0. `npm run test` exits 0, all pass. `npm run build` succeeds. `npx tsc --noEmit` exits 0. No files outside `src/` and `prisma/` modified. Lighthouse accessibility 90+.

### Enforcement (08)

> HOOKS:
>
> - PreToolUse (Write/Edit): Block modifications outside `src/` and `prisma/`.
> - PostToolUse (Write/Edit): Run `npx tsc --noEmit` and `npx eslint`. Self-healing loop.
> - PreCommit: Run `npm test`. Block commit if tests fail.
> - SessionStart: Load last checkpoint from `.claude/checkpoints/latest.md`.

### Fleet Roster (11)

> FLEET: TaskFlow
>
> ORCHESTRATOR: Claude Opus 4.6 — Tier 1. Autonomous for implementation, Propose for schema and API.
>
> SPECIALISTS:
>
> - Architect (Tier 1): System structure, API design, schema decisions. Owns `docs/architecture/`. Does NOT write implementation code.
> - Frontend Implementer (Tier 2, Sonnet): UI components, pages, client state. Owns `src/app/`, `src/components/`. Does NOT modify API or schemas.
> - Backend Implementer (Tier 2, Sonnet): API routes, business logic. Owns `src/api/`, `src/lib/server/`. Does NOT modify UI or schemas.
> - Database Agent (Tier 2, Sonnet): Schema, migrations, queries. Owns `prisma/`. Does NOT modify application code.
> - QA Agent (Tier 2, Sonnet): Reviews all output. Read-only access. Does NOT fix issues directly.
>
> ROUTING: Database → Database Agent. UI → Frontend Implementer. API → Backend Implementer. Cross-cutting → Architect decomposes. All completed work → QA before acceptance.

### Decision Authority (09)

> ENFORCED (hooks): File scope boundaries, test execution, type checking, linting.
>
> AUTONOMOUS: Component naming, file structure within owned dirs, test implementation, CSS, internal refactors.
>
> PROPOSE: New tables, new endpoints, new dependencies, architecture patterns (first use), auth flow.
>
> ESCALATE: Scope additions, budget overruns >120%, security concerns, tech stack deviation.

### First Task Decomposition (18)

> GOAL: Core task board — create, view, move tasks across workflow columns.
>
> CHUNKS:
>
> 1. **Schema** — Entry: Mission + Boundaries — Exit: Prisma schema with Task, Project, Column; migration clean — Budget: 20K tokens — Owner: Database Agent — Gates: `npx prisma migrate dev` succeeds
> 2. **API layer** — Entry: Schema approved — Exit: CRUD endpoints, integration tests pass — Budget: 30K tokens — Owner: Backend Implementer — Gates: `npm test`, tsc clean
> 3. **Board UI** — Entry: API contracts defined — Exit: Kanban board renders, drag-to-move — Budget: 40K tokens — Owner: Frontend Implementer — Gates: tsc, lint, Lighthouse 90+
> 4. **QA pass** — Entry: Board UI complete — Exit: All Blocker/Major resolved — Budget: 15K tokens — Owner: QA → Frontend Implementer for fixes
>
> SEQUENCE: 1 → 2 → 3 → 4. Chunks 2 and 3 staggered via Contract-First Parallelism once API contracts are defined.

### When Things Go Wrong: Failure Scenarios

The happy path above is what happens when everything works. The scenarios below show what happens when things fail — and how the framework's governance, recovery, and enforcement systems respond. All three scenarios occur within the same TaskFlow project.

#### Scenario 1: Hallucination Caught During Chunk 2 (API Layer)

**What happens:**
The Backend Implementer builds the CRUD endpoints for the task board. During implementation, it references a Prisma client method `prisma.task.updateManyAndReturn()` — a method that does not exist in the project's Prisma version (5.22). It wraps this in a batch update handler and reports the chunk as complete.

**Governance response:**
1. The **Hallucination Auditor** spot-checks the Backend Implementer's output. It compares the referenced Prisma method against the Ground Truth (tech stack: Prisma 5.22) and the actual Prisma client type definitions in `node_modules/.prisma/client`. The method does not exist.
2. The Auditor produces a hallucination report:

> HALLUCINATION: Tool Hallucination
>
> CLAIM: "Used prisma.task.updateManyAndReturn() for batch status updates"
>
> EVIDENCE: Method does not exist in Prisma Client 5.22. Nearest valid method: prisma.task.updateMany() (returns count, not records). To return records, use prisma.$transaction() with individual updates.
>
> SEVERITY: Blocker — endpoint will throw at runtime.
>
> AFFECTED: src/api/tasks/batch-update.ts:34-47

3. The **Orchestrator** receives the report, routes the correction back to the Backend Implementer with the Auditor's evidence attached.
4. The Backend Implementer fixes the endpoint using `prisma.$transaction()` with individual updates.
5. The **PostToolUse hook** runs `npm test` and `npx tsc --noEmit`. Both pass. The self-healing loop completes.
6. The Orchestrator marks Chunk 2 as complete after the fix.

**What would have happened without governance:**
The hallucinated method would have passed code review (it looks plausible), passed type checking only if the types were loosely defined, and failed at runtime when a user first tries to batch-move tasks. The bug would surface as a production error, not a development catch.

**Framework mechanisms used:** Hallucination Auditor (detection), Ground Truth (evidence), Recovery Ladder step 1 (retry with variation), self-healing loop (verification).

#### Scenario 2: Scope Creep and Completion Bias During Chunk 3 (Board UI)

**What happens:**
The Frontend Implementer builds the kanban board. While implementing drag-to-move, it decides to also implement:
- Keyboard shortcuts for moving tasks between columns
- A "quick add" floating action button
- Animated transitions between columns with spring physics

Each addition is individually reasonable. Together they consume 35K of the 40K token budget before the core drag-to-move is fully tested.

**Governance response:**
1. The **Drift Monitor** detects scope creep. The task spec says "Kanban board renders, drag-to-move." Keyboard shortcuts, quick-add button, and animations are not in the acceptance criteria or the Boundaries.
2. The **Token Budgeter** flags that 87% of the chunk budget is consumed with the core feature only partially tested (Lighthouse score not yet verified).
3. The **Bias Sentinel** identifies this as **completion bias** — the agent is producing more features at lower quality rather than fewer features at full quality. The core drag-to-move works but has no automated tests and hasn't been checked for accessibility.

**Conflict resolution (Governance Coordination):**
Per the Authoritative Ownership Table, completion bias is the **root cause** (authoritative owner: Bias Sentinel). Scope creep is the **symptom** (co-detector: Drift Monitor). Budget consumption is a **signal** (co-detector: Token Budgeter).

The Orchestrator receives a single grouped incident:
- Root cause: Completion bias (Bias Sentinel)
- Supporting evidence: Scope creep on 3 unrequested features (Drift Monitor), budget 87% consumed (Token Budgeter)

4. The **Orchestrator** intervenes:
   - Reverts the 3 unrequested features (they are outside the task spec).
   - Re-scopes the remaining budget to: complete drag-to-move testing, verify Lighthouse accessibility 90+, run `tsc` and lint.
   - The keyboard shortcuts, quick-add, and animations are logged as potential future tasks — not rejected, but not in scope for this chunk.

5. The Frontend Implementer completes the core feature within the remaining 5K token budget. Lighthouse scores 94. All gates pass.

**What would have happened without governance:**
The chunk would deliver a visually impressive but undertested board. The animated transitions would break for users with `prefers-reduced-motion`. The accessibility score would be below the 90 floor. These would be caught at QA (Chunk 4) and sent back for rework, doubling the effective cost.

**Framework mechanisms used:** Drift Monitor (scope creep detection), Token Budgeter (budget signal), Bias Sentinel (root cause: completion bias), Governance Coordination (deduplication, authoritative ownership), Recovery Ladder step 1 (retry with corrected scope).

#### Scenario 3: Recovery Ladder Escalation During Chunk 1 (Schema)

**What happens:**
The Database Agent designs the Prisma schema for Task, Project, and Column. The `npx prisma migrate dev` gate fails:

```
Error: Migration failed: relation "Column" conflicts with PostgreSQL reserved word
```

**Recovery ladder:**
1. **Retry with variation (attempt 1):** The Database Agent renames the table to `TaskColumn`. The PostToolUse hook runs `npx prisma migrate dev` again. Migration succeeds — but `npx tsc --noEmit` fails because the Backend Implementer's API stubs (written based on the contract-first parallel agreement) reference `prisma.column`, not `prisma.taskColumn`.

2. **Retry with variation (attempt 2):** The Database Agent uses Prisma's `@@map("task_columns")` attribute to keep the Prisma model name `Column` while mapping to a non-reserved table name. Migration succeeds. Type checking succeeds.

3. The **self-healing loop** re-runs both gates: migration clean, tsc clean. Both pass.

4. But then the **Contradiction Detector** fires: the API contract (defined by the Architect in the contract-first phase) specifies the endpoint as `/api/columns`, while the Backend Implementer's stubs use `/api/task-columns` (updated when they saw the initial rename). The contract and the stubs are inconsistent.

5. The Orchestrator routes the contradiction to the **Mediator**. The Mediator reviews:
   - The API contract says `/api/columns` — this was the Architect's decision.
   - The Backend stubs say `/api/task-columns` — this was a reactive change to the Database Agent's first rename attempt.
   - The database now uses `Column` as the Prisma model name (with `@@map`), so the original contract is valid.
   - Resolution: Revert the Backend stubs to `/api/columns`. The Architect's contract was correct.

6. The Backend Implementer reverts the endpoint name. All gates pass. Chunk 1 completes.

**What would have happened without governance:**
The table rename would have cascaded silently. The Backend Implementer would have built endpoints against the wrong path. The Frontend Implementer would have consumed the API contract (not the stubs) and built the UI against `/api/columns`. At integration, the frontend would call an endpoint that doesn't exist. The bug would be diagnosed as "the API is broken" when the actual root cause was a schema naming conflict that cascaded through a parallel work stream.

**Framework mechanisms used:** Self-healing loop (PostToolUse hook → fix → recheck), Recovery Ladder steps 1-2 (retry with variation), Contradiction Detector (inter-agent inconsistency), Mediator (conflict resolution), Contract-First Parallelism (the contract was the source of truth that enabled resolution).

-----

## D — Case Studies

These case studies are synthesized from patterns observed across multiple agent fleet deployments. They illustrate what works, what fails, and why governance matters.

### Case Study 1: The Ungoverned Sprint

**Setup:** 6-agent fleet (Orchestrator, 2 Implementers, QA, Database, Architect). No governance agents. No Brain. File-based checkpoints only. 3-week sprint.

**Week 1:** High productivity. 14 tasks completed. First-pass quality rate: 78%.

**Week 2:** Sycophantic drift emerges. QA findings per review drop from 3.2 to 0.8. Two subtle bugs ship — Backend Implementer hallucinated an API endpoint that didn't exist, QA didn't catch it. Convention erosion: three different error handling patterns now coexist.

**Week 3:** Scope creep compounds. Frontend Implementer "helpfully" adds 3 unrequested features totaling 40K extra tokens. Retry loops waste 15% of session budgets. A refactoring task breaks an implicit contract between two services (nobody tracked implicit contracts). Total rework: 22% of all completed work.

**Lesson:** Without Drift Monitor, Hallucination Auditor, and Loop Breaker, failures compound silently. The fleet doesn't know it's failing until rework costs are already paid.

**Metrics:**

- First-pass quality degraded from 78% → 54% over 3 weeks.
- Token waste from loops: 15%.
- Rework rate: 22%.
- Estimated governance overhead to prevent: ~8% of session tokens.

### Case Study 2: The Over-Engineered Fleet

**Setup:** 42-agent fleet for a CRUD application. Full Brain with Postgres + pgvector. All 7 governance agents. 12 scale agents deployed simultaneously. Token budgets set but not enforced via hooks (instructions only).

**Result:** Orchestrator spends 60% of its token budget routing between 42 agents. Governance agents produce more reports than the Admiral can review. Scale agents generate findings for systems that don't exist yet. The Brain accumulates 400 entries in week 1 — 90% are never retrieved (write-only memory anti-pattern).

**Pivot:** Reduced to 8-agent core fleet. Disabled Brain until week 3. Deployed only 3 governance agents (Token Budgeter, Hallucination Auditor, Loop Breaker). Added scale agents only for pre-release review.

**Lesson:** Administrative overhead scales with fleet size. The optimal fleet is the smallest fleet that covers the project's actual needs. Start with the Core Fleet (8 agents). Add specialists only when the Orchestrator reports routing gaps.

**Metrics:**

- Orchestrator overhead dropped from 60% to 15% of token budget.
- Task throughput increased 3x.
- Brain entries with >0 retrievals went from 10% to 65%.

### Case Study 3: The Security-First Fleet

**Setup:** 8-agent fleet building a healthcare data API. Zero-trust from day one: identity tokens on all Brain access, model tier enforcement via hooks, file scope boundaries enforced, configuration security audit before first session.

**Challenge (Week 2):** A PR modifies the AGENTS.md to add a new "Autonomous" permission for the Backend Implementer to modify authentication middleware. The configuration security hook flags it — CODEOWNERS requires Admiral approval for agent configuration changes. Admiral reviews and rejects: auth changes require Propose tier.

**Challenge (Week 4):** The Continuous Monitor ingests a new library version. The quarantine layer's injection detection flags suspicious content in the changelog (embedded prompt injection attempt). Entry is quarantined and converted to a FAILURE Brain entry that teaches the fleet what the attack pattern looks like.

**Lesson:** Zero-trust enforcement caught two incidents that advisory instructions would have missed. The configuration security hook prevented an authority escalation. The quarantine layer prevented memory poisoning. Both were silent — no human noticed until the audit log was reviewed.

**Metrics:**

- Two security incidents caught by hooks (zero caught by instructions alone in control fleet).
- Zero false positives from quarantine over 6 weeks.
- Identity token overhead: <2% of request latency.

### Case Study 4: Admiral Builds Admiral (Reference Implementation)

**Setup:** Single-agent implementation using Claude Code. Goal: implement Admiral Framework as working Python code, governed by Admiral's own doctrine. Dogfooding from commit zero. Branch: `claude/admiral-competitor-research-GVKNX`.

**Phase 1 Plan:** Organized by code architecture — data models first, then hook engine, then tests. Deferred Standing Orders and AGENTS.md to later phases because they appeared in Part 11 (late in the document) and seemed like "configuration, not code."

**What went right:**
- Core data models faithfully replicate every spec section (8 model files, Pydantic validation).
- Hook engine implements full Deterministic Enforcement (Part 3): discovery, topological dependency resolution, fail-fast chain execution, self-healing with cycle detection.
- All 8 hook implementations match their spec definitions exactly.
- Identity tokens use HMAC-SHA256 signing, session-scoped, non-delegable — per vulnerability 8.3.2 mitigation.
- 89 tests passing on first commit.

**What went wrong:**
1. **Standing Orders deferred to Phase 4.** Part 11's structural position (last part) made it seem like a late-stage concern. It is Starter. The plan had a design error that contradicted the spec's own Quick-Start Profiles.
2. **AGENTS.md created last, not first.** Without AGENTS.md, the project had no declared Mission, Boundaries, or Success Criteria. The fleet was operating without any profile despite having Starter infrastructure.
3. **Dogfooding loop was broken.** The whole point was "Admiral governs its own construction." But without AGENTS.md and Standing Orders loaded, Admiral wasn't governing anything — it was just a Python package that implements Admiral's spec.
4. **`platform/` package name shadowed Python's stdlib `platform` module.** Crashed the test runner. Renamed to `platform_ops/`. The spec's Part 9 category name ("Platform") is a known naming hazard for Python, Go, and other languages with `platform` in their stdlib.
5. **Self-healing loop parameters unspecified.** The spec describes the concept but not: max retries, error signature format, cycle detection algorithm, session-wide retry limits. Implementers must design these.
6. **Hook manifests in `aiStrat/hooks/` are specification-only.** No executables exist. A runtime that discovers hooks from these directories finds manifests but no code to execute.

**Corrective actions (same session):**
- Created `admiral/AGENTS.md` (85 lines, under 150-line rule) with Mission, Boundaries, Success Criteria, Standing Orders reference, Enforcement Classification.
- Created `admiral/CLAUDE.md` as thin pointer.
- Modeled all 15 Standing Orders as structured data with loader, priority sorting, and context injection renderer — validating that Standing Orders can be programmatically injected into every agent context.
- Modeled EscalationReport and EmergencyHaltReport per Escalation Protocol (Part 11), confirming the escalation protocol is implementable as specified.
- Added schema validation tests against authoritative JSON schemas in `aiStrat/`.
- Set `.github/CODEOWNERS` per Configuration Security (Part 3).
- Applied 4 spec patches (SPEC-1 through SPEC-4) to aiStrat/ to fix the gaps that caused these errors.
- *Note: The reference implementation (`broker/` POC) was subsequently removed. Its learnings are captured in the spec; the spec is the deliverable.*

**Lesson:** The most dangerous anti-pattern for framework implementers is **organizing by code architecture instead of profile progression**. Admiral's profiles exist for a reason — they represent operational capability, not code modules. Starter means "you can start working here," which requires governance artifacts (AGENTS.md, Standing Orders) before infrastructure (hook engine, data models). Building the engine without the governance is like building a car without a steering wheel — it runs, but it can't be directed.

**Second lesson:** Spec documents read sequentially can mislead about priority. Standing Orders are in Part 11 but required at Starter. Cross-references and the Minimum Viable Reading Path help, but implementers who read parts in order will naturally defer Part 11 content. The spec now includes explicit sequencing warnings.

**Phase 1 review (post-completion):**

A review of the completed Phase 1 against the Starter spec found three categories of issues:

1. **Over-engineering beyond Starter:** HMAC-SHA256 identity tokens (S2/B3), governance heartbeat monitor (Governed profile), tier validation hook (Team profile), escalation/handoff protocols (Team profile and above), and 15 empty placeholder packages for future profiles. Root causes traced to spec structure: reading path said "Full file" for part3-enforcement.md (Deterministic Enforcement through Configuration Security), SO 6 hyperlinked directly to Escalation Protocol (Part 11). Spec patched: reading path narrowed to "Deterministic Enforcement only," SO 6 made self-contained, level tags added to hook specs, Pre-Flight Checklist restructured by profile with negative checklist.

2. **Implementation bugs:** Standing Order 11 missing its 6th rule (Context Profile). `HookEngine.discover()` warned on incomplete manifests instead of rejecting per spec. Error signatures used full stdout instead of first-line-plus-exit-code per glossary. All fixed.

3. **Test gaps:** Boundary conditions at exact thresholds (80%, 90%, 100%). Self-healing cycle detection (consecutive identical signatures). Partial critical sections. Hook timeout. Subprocess execution (all prior tests used handler injection). 22 new tests added.

**Metrics:**
- Phase 1 first commit: 47 files, 4,227 lines, 89 tests (80% Starter complete — missing governance artifacts).
- Phase 1 corrective commit: +10 files, +1,016 lines, 31 new tests (100% Starter complete).
- Post-review commit: +124 lines, 6 new tests (126 total tests, all coverage gaps closed).
- Post-review edge case commit: 3 bug fixes, 22 new tests (148 total). 8 spec patches.
- Total Starter phase: ~5,500 lines of Python, 148 passing tests, 35 implementation files.
- Time: ~2 days implementation + review cycle.

-----

## E — Platform Integration Patterns

The Admiral Framework is platform-agnostic. These patterns show how to apply Admiral concepts with specific tools. Each pattern maps framework sections to platform-native features.

### Pattern 0: Cross-Tool Foundation

Regardless of which tool you use, the foundation is the same:

- **AGENTS.md** → Configuration File Strategy (Part 2 — Context). The canonical, model-agnostic instruction file. Keep under 150 lines.
- Tool-specific entry points (CLAUDE.md, .cursorrules, etc.) → Thin pointers to AGENTS.md plus tool-specific configuration only.
- For tools that don't natively read AGENTS.md, the tool-specific file opens with "Read AGENTS.md for full project instructions."
- Sync tools (Ruler, rule-porter) can automate distribution if maintaining multiple tool-specific files becomes a burden.

### Pattern 1: Admiral with Claude Code

- **CLAUDE.md** → Pointer to AGENTS.md + Claude Code-specific config (hooks, `.claude/` directory, permissions).
- **Hooks** → Part 3 Deterministic Enforcement. Claude Code hooks map directly to the Hook Execution Model (Deterministic Enforcement, Part 3). PreToolUse, PostToolUse, and other lifecycle hooks ARE the enforcement layer.
- **Skills** (`.claude/skills/*.md`) → Part 2 Progressive Disclosure (Configuration File Strategy). Skills are the native mechanism for on-demand context loading.
- **Agent definitions** (`.claude/agents/*.md`) → Part 4 Fleet Composition. Define agent roles with Identity, Scope, Does NOT Do, Output routing.
- **Claude Code's built-in subagent** → Swarm Patterns (Part 6). The Agent tool enables parallel work with coordination.

> **Note:** Claude Code is the closest native implementation of the Admiral model. Most framework concepts map directly to Claude Code features. As of March 2026, Claude Code does not natively read AGENTS.md — use the CLAUDE.md pointer pattern.

### Pattern 1b: Admiral with Cursor

- **AGENTS.md** → Read natively by Cursor. Contains the same project instructions as any other tool.
- **`.cursor/rules/`** → Path-scoped rules (equivalent to Claude Code's `.claude/rules/*.md`). Progressive disclosure by directory.
- **Enforcement** → Cursor lacks native hook support equivalent to Claude Code. Use CI gates, pre-commit hooks, and linter integration for deterministic enforcement.
- **Agent definitions** → Use `.cursorrules` or project-level AGENTS.md sections to define agent behavior.

### Pattern 1c: Admiral with Copilot / Gemini CLI / Codex

- **AGENTS.md** → Read natively by all three. No tool-specific pointer file needed.
- **Enforcement** → Varies by tool. Map the Hook Execution Model to each tool's available enforcement mechanisms (CI gates, pre-commit hooks, linters).
- **Standing Orders** → Load into system prompt or AGENTS.md preamble.
- **Skills/Progressive disclosure** → Tool-dependent. Use AGENTS.md sections or tool-native mechanisms where available.

### Pattern 2: Admiral with Multi-Agent SDK (e.g., Anthropic Agent SDK)

- **Agent definitions** (fleet/) → Agent class constructors with system prompts assembled per prompt-anatomy.md.
- **Routing rules** → Agent handoff logic. Map the routing decision tree (fleet/routing-rules.md) to the SDK's handoff mechanism.
- **Hooks** → Tool wrapping. Wrap tool calls with pre/post validation logic that mirrors the Hook Execution Model.
- **Brain** → External tool registered with agents. Implement brain_query and brain_record as tools available to all agents.
- **Governance agents** → Separate agent instances running in parallel, monitoring shared state.
- **Standing Orders** → Prepended to every agent's system prompt as binding constraints.

> **Note:** SDKs provide the runtime; Admiral provides the operational doctrine. The SDK handles message passing; Admiral defines what messages should say, who should receive them, and what constraints govern the exchange.

> **Implementation Note — `platform` naming conflict:** In Python, `platform` is a stdlib module. If your implementation uses a `platform/` package (matching Part 9's "Platform" category), the name will shadow the stdlib and cause import failures (e.g., `platform.system()` becomes unavailable). Use an alternative name such as `platform_ops/` for the implementation package. This applies to any language where "platform" conflicts with a standard library module.

### Implementation Pitfalls (Learned from Admiral-builds-Admiral)

These pitfalls were discovered during the reference implementation (Case Study 4, Appendix D). Each was encountered in practice, not theorized.

**Build-Order Pitfalls:**

| Pitfall | What Happens | Fix |
|---|---|---|
| **Infrastructure before config** | You build hooks, models, and engines — then realize you have no Mission, no Boundaries, no Standing Orders. The fleet operates without any profile despite having Starter code. | Define AGENTS.md and Standing Orders first (30 min). Then build the code that enforces them (1-2 days). |
| **Organizing by code architecture** | Grouping code as models → hooks → fleet → governance → protocols. Standing Orders end up in the last package because they're in Part 11 of the spec. | Organize by profile progression: config → enforcement → coordination → governance → persistence. Standing Orders are Starter despite their Part 11 position. |
| **Deferring Standing Orders** | "We'll add Standing Orders in Phase 4 with the other protocols." But the spec says Standing Orders are Starter — they define what hooks enforce. Without them, hooks have no semantic content. | Standing Orders are the content. Hooks are the enforcement. You need both at Starter. See Standing Orders (Part 11) and the co-requirement note in Deterministic Enforcement (Part 3). |

**Python-Specific Pitfalls:**

| Pitfall | What Happens | Fix |
|---|---|---|
| **`platform` stdlib shadow** | `import platform` resolves to your package, not the stdlib. `platform.system()` fails. Especially pernicious under `pytest`, which manipulates `sys.path` — your tests may shadow stdlib modules even when production code does not. | Name it `platform_ops/` or similar. Check all category names against your language's stdlib before creating packages. Test your import paths under pytest specifically. |
| **`from __future__ import annotations`** | Deferred annotation evaluation masks import errors at definition time. A model referencing a non-existent type appears to work until runtime. Tests pass until you actually instantiate the model. | Run type-checking (`mypy` or `pyright`) in CI. Don't rely solely on runtime tests to catch import/type issues. |
| **Pydantic model ↔ JSON Schema divergence** | Your Pydantic model replicates a JSON Schema's fields, but the two drift silently over time. Fields added to the schema don't appear in the model. | Add a validation test: load the canonical JSON Schema, generate instances from your Pydantic model, validate instances against the schema. The Admiral reference implementation does this for `v1.schema.json` and `manifest.schema.json`. |
| **Hook manifest without executable** | Spec hook directories contain `hook.manifest.json` but no executable. The hook engine discovers manifests but has nothing to run. | Spec manifests are specification-only artifacts. Implementations live in the consuming project. Document this clearly (see `hooks/README.md` implementation note). |

**General Agent Framework Pitfalls:**

| Pitfall | What Happens | Fix |
|---|---|---|
| **Self-healing without cycle detection** | The self-healing loop retries the same failing fix forever. Token budget burns to zero with no progress. | Track `(hook_name, hash(error_output))` tuples. If the same error recurs after a fix attempt, break immediately. Max 3 retries per hook, 10 per session. See Deterministic Enforcement (Part 3) implementation parameters. |
| **Config time ≠ build time** | "Starter in 30 minutes" is true for configuration (AGENTS.md, Standing Orders, Ground Truth). Code implementation takes 1-2 days. Implementers expect runnable code in 30 minutes, then discover the gap. | Distinguish config time from build time in project planning. 30 minutes gets you governed. 1-2 days gets you automated. |
| **Standing Orders bootstrap problem** | Standing Orders define what hooks enforce. Hooks fire at SessionStart. If Standing Orders loading is itself a hook, you have a circular dependency. | Standing Orders loading is a pre-hook bootstrap step, not a hook. Load Standing Orders → discover hooks → resolve dependencies → execute hooks. |

### Pattern 3: Admiral with LangGraph / CrewAI / AutoGen

These frameworks handle orchestration (routing, handoffs, tool calls). Admiral adds what they typically lack:

- **Governance agents:** Most frameworks have no equivalent. Implement as monitoring nodes in the graph or as "observer" agents in the crew.
- **Enforcement spectrum:** Most frameworks rely on instructions. Add hook-equivalent validation at graph edges or as pre/post-processing steps.
- **Decision authority tiers:** Not natively supported. Implement as metadata on agent roles, checked by the orchestrator before accepting actions.
- **Brain/persistent memory:** Most frameworks offer simple memory. The Brain specification provides the schema and retrieval pipeline for a more capable alternative.
- **Standing Orders:** Load as shared system prompt context across all agents.

> **Note:** Admiral is complementary, not competitive, with these frameworks. They solve "how do agents communicate?" Admiral solves "what should agents communicate, under what constraints, with what governance?"

-----

## F — Framework Versioning

### Version Policy

The Admiral Framework uses [semantic versioning](https://semver.org/): **MAJOR.MINOR.PATCH** with pre-release labels (e.g., v0.1.0-alpha, v0.3.1-alpha, v1.0.0). <!-- no-version-sync -->

- **MAJOR** (e.g., v0.x → v1.0): Indicates production readiness. Pre-1.0 versions (v0.x.y) are in development — the API surface, Standing Orders, agent definition format, Brain schema, and enforcement model may change without notice. Post-1.0 major bumps indicate breaking changes requiring migration.
- **MINOR** (e.g., v0.2.0 → v0.3.0): New agent definitions, additional appendices, structural changes, or non-breaking extensions.
- **PATCH** (e.g., v0.1.0 → v0.1.1): Fixes, corrections, clarifications. No structural changes.
- **Pre-release label** (e.g., `-alpha`, `-beta`, `-rc.1`): Indicates maturity stage. `alpha` = active development, `beta` = feature-complete but unvalidated, `rc` = release candidate.

### Migration Between Versions

When upgrading a fleet to a new MAJOR version:

1. **Read the changelog.** Identify breaking changes that affect your target profile. Starter fleets are affected only by Standing Order changes; Production fleets may need Brain schema migrations.
2. **Update Standing Orders first.** These are the operational core — agents must operate under the new orders before other changes propagate.
3. **Follow the Cascade Map** (Strategic Adaptation, Part 8). Changes propagate: Standing Orders → Agent Definitions → Routing Rules → Interface Contracts → Brain Schema.
4. **Re-run the Pre-Flight Checklist** (Appendix A) against the new version.
5. **Reset trust calibration** for any agents whose scope or authority changed.

### Agent Definition Versioning

Agent definitions do not carry individual version numbers. They are versioned collectively with the framework. When a specific agent definition changes between versions, the changelog notes the affected agent and the nature of the change.

-----

## G — Implementation Status Map (March 2026)

**Current as of March 2026. Re-assess quarterly or when the Monitor surfaces relevant ecosystem changes.**

This appendix maps every major framework component to its real-world implementation difficulty. Use this to plan adoption timelines, allocate engineering resources, and avoid over-investing in infrastructure before the lighter approaches hit their limits.

**Categories:**
- **Category 1 — Available today.** Native platform features or existing tools. No custom engineering required.
- **Category 2 — Moderate custom work.** Days to weeks of standard engineering. No specialized infrastructure skills needed.
- **Category 3 — Significant infrastructure.** Weeks to months. Requires specialized skills (database administration, security engineering, distributed systems).

| Component | Cat. | Concrete Tooling | Custom Work Required |
|---|---|---|---|
| **AGENTS.md / config files** | 1 | Any AI coding tool, any text editor | None — write markdown, commit to repo. Tool-specific pointers (CLAUDE.md, etc.) as needed. |
| **Hooks (PreToolUse / PostToolUse)** | 1 | Agent runtime hooks (e.g., Claude Code hooks), shell scripts, CI gates | Write hook scripts, version-control alongside fleet config |
| **Standing Orders** | 1 | System prompt content, AGENTS.md | None — text loaded into agent context |
| **Agent definitions** | 1 | AGENTS.md sections, tool-specific agent files, Agent SDK agent constructors | Write agent specifications per prompt anatomy (Context Engineering, Part 2) |
| **Self-healing quality loops** | 1 | Hook exit codes + agent retry (Deterministic Enforcement, Part 3) | Configure hooks for linter/type-checker/test; retry logic is built-in |
| **Recovery ladder** | 1 | Agent instructions + hooks | Define fallback/backtrack strategies per agent; hook enforcement for max retries |
| **Brain B1 (file-based)** | 1 | JSON files + grep + git | Create `.brain/` directory, write JSON files (see `brain/level1-spec.md`) |
| **Routing rules** | 2 | Custom orchestrator logic, Agent SDK handoffs | Implement routing decision tree; map task types to agent roles |
| **Brain B2 (SQLite + embeddings)** | 2 | SQLite + embedding API or local model | Set up SQLite schema, embedding generation, cosine similarity search (see `brain/level2-spec.md`) |
| **Governance agents** | 2 | Agent definitions + monitoring hooks | Write agent definitions, configure detection patterns, wire outputs to Orchestrator |
| **Quarantine immune system** | 2 | Regex patterns + LLM classifier | Implement 4-layer validation pipeline (structural, injection, semantic, antibody) |
| **Continuous Monitor** | 2–3 | GitHub API + scheduler (cron/Actions) + quarantine | Implement scanner, state persistence, digest generation, seed writing |
| **Fleet observability / metrics** | 2–3 | Custom dashboards + structured logging | Define trace format, implement log aggregation, build or configure dashboards |
| **Brain B3 (COMPLETE Brain)** | 3 | Postgres 16 + pgvector + MCP server + identity service | Database deployment, schema creation, HNSW index tuning, MCP server implementation, zero-trust access control, sensitivity classification, audit logging |
| **Cross-project intelligence** | 3 | Brain B3 + `_global` namespace | Multi-project Brain deployment, cross-project query authorization, knowledge promotion workflow |

**Reading this table:**

- **Time-to-value vs. implementation effort:** The adoption time estimates in the Quick-Start Profiles table (index.md) assume you are *configuring existing tools*. These categories describe effort to *build custom tooling*. Category 1 components can be adopted in minutes but implementing them as custom code is a separate engineering effort. See the "Config time vs. build time" note in index.md.
- **Starter profile** (Appendix B) uses only Category 1 components. Zero custom infrastructure.
- **Team profile** adds some Category 2 components (routing rules, file-based checkpoints). Moderate engineering effort.
- **Governed profile** adds governance agents (Category 2) and the complete Brain (Category 3). This is where infrastructure investment is justified by proven fleet value at lower profiles.
- **Production profile** adds fleet-wide enforcement, observability, and monitor. Builds on Governed infrastructure.
- **Enterprise profile** adds cross-fleet coordination. Enterprise-scale infrastructure.

> **ANTI-PATTERN: CATEGORY 3 BEFORE CATEGORY 1** — Deploying Postgres + pgvector + identity tokens before implementing hooks and standing orders. The highest-impact, lowest-cost improvements are all Category 1. A fleet with comprehensive hooks and no Brain outperforms a fleet with a full Brain and no hooks.

-----

### Version History

See [`CHANGELOG.md`](CHANGELOG.md) for the full version history.

-----

*The Fleet Admiral Framework · v0.18.4-alpha.1773760184756

*Context is the currency of autonomous AI. Intent is its purpose. The Brain is where both compound.*
