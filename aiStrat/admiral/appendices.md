<!-- Admiral Framework v0.2.1-alpha -->
# APPENDICES

-----

## A — Pre-Flight Checklist

Before deploying any new fleet, verify every item. If any box is unchecked, the fleet is not ready.

**Part 1 — Strategy**

- [ ] **Mission (01):** Project identity, success state, stakeholders, phase, pipeline entry point.
- [ ] **Boundaries (02):** Non-goals, hard constraints, resource budgets, quality floor, LLM-Last boundary.
- [ ] **Success Criteria (03):** Functional, quality, completeness, and negative criteria. Machine-verifiable where possible.

**Part 2 — Context**

- [ ] **Context Engineering (04):** Instructions follow prompt anatomy (Identity → Authority → Constraints → Knowledge → Task). Tested with probes.
- [ ] **Ground Truth (05):** Ontology, naming, tech stack versions, access/permissions, known issues, configuration artifacts.
- [ ] **Context Window Strategy (06):** Profiles per role. Loading order, refresh triggers, sacrifice order. Progressive disclosure.
- [ ] **Configuration File Strategy (07):** AGENTS.md under 150 lines. Tool-specific pointers (CLAUDE.md, etc.) configured. Skills, agent files, path rules defined. All version-controlled.

**Part 3 — Enforcement**

- [ ] **Deterministic Enforcement (08):** Every constraint classified Hook / Instruction / Guidance. Critical safety as hooks. Self-healing loops.
- [ ] **Decision Authority (09):** Four tiers with concrete examples. Calibrated to project maturity.
- [ ] **Configuration Security (10):** Security audit checklist completed. MCP servers audited and pinned. CODEOWNERS set.

**Part 4 — Fleet**

- [ ] **Fleet Composition (11):** Roster with roles, "Does NOT Do" boundaries, routing, interface contracts. 5–12 agents.
- [ ] **Tool & Capability Registry (12):** Per-agent tool registry including negative tool list and MCP servers.
- [ ] **Model Selection (13):** Every role assigned to tier with rationale. Context requirements verified.
- [ ] **Protocol Integration (14):** MCP servers registered and pinned. A2A configured if needed.

**Part 5 — The Brain**

- [ ] **Brain Architecture (15):** Postgres + pgvector deployed. Schema created. Embedding model selected. HNSW index built.
- [ ] **Knowledge Protocol (16):** Brain MCP server running and registered. Access control configured per role. All agents have brain_query and brain_record in their tool registry.
- [ ] **Intelligence Lifecycle (17):** Capture triggers defined (chunk boundaries, decisions, failures). Review cadence scheduled. Cross-project namespace established if multi-fleet.
- [ ] **Continuous Monitor:** Monitor configured with watched repos, search queries, and RSS feeds. Scheduler (cron or CI workflow) enabled. Quarantine layer active. Digest review cadence matches scan cadence. Seed candidate approval workflow established.

**Part 6 — Execution**

- [ ] **Work Decomposition (18):** Chunks with entry/exit states, budgets, quality gates. Spec-first pipeline if applicable.
- [ ] **Parallel Execution (19):** Parallelization criteria. Coordination patterns. Divergence detection.
- [ ] **Swarm Patterns (20):** Confirmed hierarchical fleet sufficient, or swarm topology defined.

**Part 7 — Quality**

- [ ] **Quality Assurance (21):** Verification levels per task type. Self-healing loops operational. QA template ready.
- [ ] **Failure Recovery (22):** Recovery ladder documented. Max retries set. Escalation template ready.
- [ ] **Failure Modes (23):** Configuration reviewed against catalog. Mitigations in place.

**Part 8 — Operations**

- [ ] **Institutional Memory (24):** Persistence pattern selected. Decision log location established. Checkpoint template ready.
- [ ] **Adaptation Protocol (25):** Change tiers defined. Cascade map understood. Pause Protocol documented.
- [ ] **Cost Management (26):** Per-session and per-phase budgets. Cost tracking in place. LLM-Last implemented.
- [ ] **Fleet Health Metrics (27):** Metrics selected. Collection rhythm defined.
- [ ] **Fleet Scaling (28):** Lifecycle phase identified. Scaling signals understood. Size upper bound set.
- [ ] **Inter-Fleet Governance (29):** Knowledge boundaries set. Sharing protocol defined. Review cadence scheduled.

**Part 9 — Platform**

- [ ] **Fleet Observability (30):** Instrumentation strategy defined. Trace correlation configured. Sampling policy set. Dashboard or trace viewer operational.
- [ ] **CI/CD & Event-Driven Operations (31):** Event-driven agent definitions created per trigger type. Context bootstrap sequences configured. Cost caps set per invocation. Result routing configured.
- [ ] **Fleet Evaluation (32):** Baseline metrics established. Evaluation cadence defined. A/B testing methodology understood. First evaluation report template ready.

**Part 10 — The Admiral**

- [ ] **Admiral Self-Calibration (33):** Bottleneck signals known. Trust log initialized. Growth stage assessed.
- [ ] **Human-Expert Routing (34):** Expert Roster defined. Routing triggers documented. Consultation template ready.

-----

## B — Quick-Start Sequence

Structured around the four Adoption Levels (see index.md). Complete each level before advancing.

### Level 1: Disciplined Solo (30 minutes)

1. **Mission (01)** — What you are building. What success looks like.
2. **Boundaries (02)** — What you are NOT building. Resource budgets.
3. **Success Criteria (03)** — Machine-verifiable definition of "done."
4. **Deterministic Enforcement (08)** — Classify constraints. Implement hooks for safety-critical ones.
5. **Configuration File Strategy (07)** — AGENTS.md (<150 lines). Tool-specific pointers configured. Standing Orders loaded.
6. **Configuration Security (10)** — Audit configs. Pin MCP servers. Set CODEOWNERS.

**You can start working here.** One agent with clear Identity, Scope, Boundaries, and hooks.

### Level 2: Core Fleet (2-4 hours)

7. **Ground Truth (05)** — Tech stack, tools, access, vocabulary.
8. **Fleet Composition (11)** — 5-8 agents, roles, routing, interface contracts.
9. **Decision Authority (09)** — Four authority tiers for this project's risk profile.
10. **Tool & Capability Registry (12)** — Available and unavailable tools per agent.
11. **Model Selection (13)** — Assign each role to a tier. Verify context fit.
12. **Context Engineering (04)** — Write system prompts per prompt anatomy. Run probes.
13. **Context Window Strategy (06)** — Profiles, loading order, progressive disclosure.
14. **Work Decomposition (18)** — Break first phase into chunks.
15. **Institutional Memory (24)** — File-based checkpoints and handoff documents.

### Level 3: Governed Fleet (1-2 days)

16. **Governance agents** — Deploy Token Budgeter, Hallucination Auditor, and Loop Breaker minimum. Add remaining governance agents as needed.
17. **Cost Management (26)** — Per-session and per-phase budgets. Cost tracking active.
18. **Brain Level 1-2** — File-based or SQLite Brain. Validate that persistent memory improves retrieval before scaling (see Section 15, "Start Simple").
19. **Quality Assurance (21)** — Verification levels per task type. Self-healing loops operational.
20. **Failure Recovery (22)** — Recovery ladder documented. Max retries set.

### Level 4: Full Framework (1-2 weeks)

21. **Brain Architecture (15)** — Deploy Postgres + pgvector. Create schema. Register Brain MCP server.
22. **Knowledge Protocol (16)** — Configure zero-trust access control. Identity tokens. Add brain_query and brain_record to agent tool registries.
23. **Protocol Integration (14)** — Register MCP servers. Configure A2A if needed.
24. **Continuous Monitor** — Configure watched repos, RSS feeds. Enable GitHub Actions workflow. Quarantine layer active.
25. **Fleet Observability (30)** — Instrumentation strategy. Trace correlation. Dashboards.
26. **Remaining sections** — Adaptation (25), Metrics (27), Scaling (28), Governance (29), CI/CD Operations (31), Evaluation (32), Admiral (33), Expert Routing (34).

**The most common mistake is starting at Level 4.** See Case Study 2 (Appendix D) for what happens when you over-engineer from day one.

-----

## C — Worked Example: SaaS Task Manager

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

-----

## E — Platform Integration Patterns

The Admiral Framework is platform-agnostic. These patterns show how to apply Admiral concepts with specific tools. Each pattern maps framework sections to platform-native features.

### Pattern 0: Cross-Tool Foundation

Regardless of which tool you use, the foundation is the same:

- **AGENTS.md** → Section 07, Configuration File Strategy (Part 2 — Context). The canonical, model-agnostic instruction file. Keep under 150 lines.
- Tool-specific entry points (CLAUDE.md, .cursorrules, etc.) → Thin pointers to AGENTS.md plus tool-specific configuration only.
- For tools that don't natively read AGENTS.md, the tool-specific file opens with "Read AGENTS.md for full project instructions."
- Sync tools (Ruler, rule-porter) can automate distribution if maintaining multiple tool-specific files becomes a burden.

### Pattern 1: Admiral with Claude Code

- **CLAUDE.md** → Pointer to AGENTS.md + Claude Code-specific config (hooks, `.claude/` directory, permissions).
- **Hooks** → Part 3 Deterministic Enforcement. Claude Code hooks map directly to the Hook Execution Model (Section 08). PreToolUse, PostToolUse, and other lifecycle hooks ARE the enforcement layer.
- **Skills** (`.claude/skills/*.md`) → Part 2 Progressive Disclosure (Section 07). Skills are the native mechanism for on-demand context loading.
- **Agent definitions** (`.claude/agents/*.md`) → Part 4 Fleet Composition (Section 11). Define agent roles with Identity, Scope, Does NOT Do, Output routing.
- **Claude Code's built-in subagent** → Swarm Patterns (Section 20). The Agent tool enables parallel work with coordination.

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

The Admiral Framework uses [semantic versioning](https://semver.org/): **MAJOR.MINOR.PATCH** with pre-release labels (e.g., v0.1.0-alpha, v0.2.0-alpha, v1.0.0).

- **MAJOR** (e.g., v0.x → v1.0): Indicates production readiness. Pre-1.0 versions (v0.x.y) are in development — the API surface, Standing Orders, agent definition format, Brain schema, and enforcement model may change without notice. Post-1.0 major bumps indicate breaking changes requiring migration.
- **MINOR** (e.g., v0.1.0 → v0.2.0): New agent definitions, additional appendices, structural changes, or non-breaking extensions.
- **PATCH** (e.g., v0.1.0 → v0.1.1): Fixes, corrections, clarifications. No structural changes.
- **Pre-release label** (e.g., `-alpha`, `-beta`, `-rc.1`): Indicates maturity stage. `alpha` = active development, `beta` = feature-complete but unvalidated, `rc` = release candidate.

### Migration Between Versions

When upgrading a fleet to a new MAJOR version:

1. **Read the changelog.** Identify breaking changes that affect your adoption level. Level 1 fleets are affected only by Standing Order changes; Level 4 fleets may need Brain schema migrations.
2. **Update Standing Orders first.** These are the operational core — agents must operate under the new orders before other changes propagate.
3. **Follow the Cascade Map** (Section 25). Changes propagate: Standing Orders → Agent Definitions → Routing Rules → Interface Contracts → Brain Schema.
4. **Re-run the Pre-Flight Checklist** (Appendix A) against the new version.
5. **Reset trust calibration** for any agents whose scope or authority changed.

### Agent Definition Versioning

Agent definitions do not carry individual version numbers. They are versioned collectively with the framework. When a specific agent definition changes between versions, the changelog notes the affected agent and the nature of the change.

-----

## G — Implementation Status Map (March 2026)

**Current as of March 2026. Re-assess quarterly or when the Monitor surfaces relevant ecosystem changes.**

This appendix maps every major framework component to its real-world implementation difficulty **and its current implementation status within this framework**. Use this to understand what exists today, what requires custom engineering, and what remains purely aspirational.

**Implementation categories:**
- **Category 1 — Available today.** Native platform features or existing tools. No custom engineering required.
- **Category 2 — Moderate custom work.** Days to weeks of standard engineering. No specialized infrastructure skills needed.
- **Category 3 — Significant infrastructure.** Weeks to months. Requires specialized skills (database administration, security engineering, distributed systems).

**Implementation status (honest assessment):**
- **SPECIFIED** — Architecture and behavior are documented. No executable code exists.
- **PARTIAL** — Some implementation exists (e.g., SQL schema, JSON Schema) but the component is not operational.
- **OPERATIONAL** — The component can be used as-is with no additional engineering.

| Component | Cat. | Status | What Exists | What's Missing |
|---|---|---|---|---|
| **AGENTS.md / config files** | 1 | OPERATIONAL | AGENTS.md, CLAUDE.md, templates | Nothing — usable today |
| **Hooks (PreToolUse / PostToolUse)** | 1 | SPECIFIED | 11 hook specifications, manifest schema, 11 manifests | Zero executable hook implementations |
| **Standing Orders** | 1 | OPERATIONAL | 15 orders with enforcement classification | Nothing — text loaded into context |
| **Agent definitions** | 1 | OPERATIONAL | 100 agent definitions (71 core + 29 extended) | Nothing — usable as specifications |
| **Self-healing quality loops** | 1 | SPECIFIED | Pattern described in Section 08 | Requires hook implementations to function |
| **Recovery ladder** | 1 | OPERATIONAL | 5-step ladder with templates | Nothing — advisory, works as instructions |
| **Brain Level 1 (file-based)** | 1 | SPECIFIED | File format spec (`brain/level1-spec.md`) | No `.brain/` directory, no shell wrappers |
| **Routing rules** | 2 | SPECIFIED | Decision tree (`fleet/routing-rules.md`) | No orchestrator implementation |
| **Brain Level 2 (SQLite + embeddings)** | 2 | SPECIFIED | SQLite schema spec (`brain/level2-spec.md`) | No database, no embedding pipeline |
| **Governance agents** | 2 | SPECIFIED | 7 agent definitions, ownership table | No executable monitoring |
| **Quarantine immune system** | 2 | SPECIFIED | 5-layer architecture, 18 seed attack scenarios | No regex patterns, no trained classifier, no TF-IDF dictionary |
| **Continuous Monitor** | 2–3 | SPECIFIED | Architecture spec (`monitor/README.md`) | No scanner, no state persistence, no digest generator |
| **Fleet observability / metrics** | 2–3 | SPECIFIED | Instrumentation strategy (Section 30) | No trace format, no dashboards |
| **Brain Level 3 (Postgres + pgvector)** | 3 | PARTIAL | SQL schema (`001_initial.sql`), test suite (919 lines) | No Postgres deployment, no MCP server, no embedding model |
| **Brain Level 4 (full specification)** | 3 | SPECIFIED | Architecture in `brain/README.md` | Everything beyond the SQL schema |
| **Identity tokens / zero-trust** | 3 | SPECIFIED | Architecture in Sections 10, 16 | No token service, no key management, no validation |
| **Handoff protocol** | 1 | PARTIAL | JSON Schema (`handoff/v1.schema.json`), text templates | No runtime translation layer |
| **Attack corpus** | 2 | PARTIAL | Specification + 18 seed scenarios | 18 seeds insufficient for classifier training; need 500+ |
| **Cross-project intelligence** | 3 | SPECIFIED | Architecture in Section 17 | Everything |

**Honest summary:** Of the 19 major components, **4 are operational** (config files, Standing Orders, agent definitions, recovery ladder), **3 are partially implemented** (Brain L3 schema, handoff schema, attack corpus seeds), and **12 are specification-only**. The framework is a comprehensive design document, not a toolkit. This is appropriate for v0.2.1-alpha but must be understood by adopters.

**What breaks if each component fails:**

| Missing Component | Impact if Absent |
|---|---|
| **Hooks** | All safety constraints degrade to advisory. Context pressure will erode compliance. This is the highest-risk gap. |
| **Brain** | No cross-session learning. Each session starts from scratch. Acceptable at Level 1-2. |
| **Governance agents** | Silent quality degradation over multi-session projects. Acceptable for short projects (<1 week). |
| **Quarantine** | External intelligence cannot be safely ingested. Do not deploy the Monitor without quarantine. |
| **Identity tokens** | All identity is self-declared. Any agent can claim any role. Acceptable for single-operator fleets; unacceptable for multi-operator. |
| **Handoff runtime** | Agents use text-format handoffs (which work). JSON validation is unavailable. Acceptable — text format is sufficient for most fleets. |

> **ANTI-PATTERN: CATEGORY 3 BEFORE CATEGORY 1** — Deploying Postgres + pgvector + identity tokens before implementing hooks and standing orders. The highest-impact, lowest-cost improvements are all Category 1. A fleet with comprehensive hooks and no Brain outperforms a fleet with a full Brain and no hooks.

-----

## H — Framework Validation Protocol

**How to measure whether the Admiral Framework improves fleet outcomes.**

The framework demands Success Criteria for every task (Section 03) but must validate itself with the same rigor. This protocol defines how to measure framework effectiveness, what to measure, and when to conclude the framework is not providing value.

### Baseline Measurement (Before Framework Adoption)

Before applying the framework, measure baseline performance on 3-5 representative tasks:

| Metric | How to Measure | Baseline Value |
|---|---|---|
| **First-pass quality rate** | % of tasks passing all quality gates on first attempt | Record per-task |
| **Rework rate** | % of completed tasks requiring correction after acceptance | Record per-task |
| **Constraint violation rate** | Count of scope violations, secret exposures, unauthorized changes | Record per-session |
| **Token efficiency** | Useful output tokens / total tokens consumed | Record per-session |
| **Time to completion** | Wall-clock time from task assignment to acceptance | Record per-task |

### Framework Measurement (After Adoption)

Measure the same metrics after adopting each level for at least 2 weeks:

**Level 1 validation (hooks + Standing Orders):**
- Constraint violation rate should decrease measurably vs. baseline
- Hook-prevented violations should be logged (each log entry is evidence the hook caught something instructions would have missed)
- If constraint violation rate does not decrease after 2 weeks, the hooks are not targeting the right constraints — recalibrate

**Level 2 validation (multi-agent coordination):**
- First-pass quality rate should improve over baseline
- Orchestrator overhead should be <20% of total fleet tokens
- Handoff rejection rate should be <20% (well-formed handoffs)
- If orchestrator overhead exceeds 40%, the fleet is over-sized — reduce agent count

**Level 3 validation (governance agents):**
- Governance agents should produce at least 1 actionable finding per week that would not have been caught otherwise
- False positive rate on governance alerts should be <30%
- If no actionable findings emerge after 3 weeks, governance agents are theater — remove or reconfigure

**Level 4 validation (Brain + Monitor + zero-trust):**
- Brain retrieval hit rate should exceed 30% (entries written are later retrieved and used)
- Monitor should surface at least 1 finding per month that changes fleet behavior
- Zero-trust overhead should not block legitimate work more than 5% of the time

### Validation Cadence

| Event | Action |
|---|---|
| **After each adoption level** | Compare metrics to baseline. Document delta. Decide whether to advance, hold, or retreat. |
| **Monthly (Level 2+)** | Review governance findings. Calculate ROI: cost of governance vs. cost of failures caught. |
| **Quarterly** | Full framework review. Are the metrics improving, stable, or degrading? Is the framework earning its overhead? |
| **After any framework change** | Re-measure affected metrics for 1 week to detect regressions. |

### What "Not Providing Value" Looks Like

The framework is not providing value if, after a good-faith trial:

1. Metrics are flat or worse than baseline after 4 weeks at the current level
2. The Admiral spends more time on framework maintenance than on productive decisions
3. Agents produce lower-quality output with framework context loaded (context stuffing)
4. The team routes around the framework rather than through it (governance bypass)

When this happens: drop to a lower adoption level, not to zero. Level 1 (hooks + Standing Orders) has the highest ROI-to-effort ratio and should be the last thing abandoned.

-----

*The Fleet Admiral Framework · v0.2.1-alpha*

*Context is the currency of autonomous AI. The Brain is where that currency compounds.*
