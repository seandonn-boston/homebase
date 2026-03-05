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
- [ ] **Configuration File Strategy (07):** CLAUDE.md under 150 lines. Skills, agent files, path rules defined. All version-controlled.

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
5. **Configuration File Strategy (07)** — CLAUDE.md (<150 lines). Standing Orders loaded.
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

**Challenge (Week 2):** A PR modifies the CLAUDE.md to add a new "Autonomous" permission for the Backend Implementer to modify authentication middleware. The configuration security hook flags it — CODEOWNERS requires Admiral approval for CLAUDE.md changes. Admiral reviews and rejects: auth changes require Propose tier.

**Challenge (Week 4):** The Continuous Monitor ingests a new library version. The quarantine layer's injection detection flags suspicious content in the changelog (embedded prompt injection attempt). Entry is quarantined and converted to a FAILURE Brain entry that teaches the fleet what the attack pattern looks like.

**Lesson:** Zero-trust enforcement caught two incidents that advisory instructions would have missed. The configuration security hook prevented an authority escalation. The quarantine layer prevented memory poisoning. Both were silent — no human noticed until the audit log was reviewed.

**Metrics:**

- Two security incidents caught by hooks (zero caught by instructions alone in control fleet).
- Zero false positives from quarantine over 6 weeks.
- Identity token overhead: <2% of request latency.

-----

## E — Platform Integration Patterns

The Admiral Framework is platform-agnostic. These patterns show how to apply Admiral concepts with specific tools. Each pattern maps framework sections to platform-native features.

### Pattern 1: Admiral with Claude Code

- **CLAUDE.md** → Part 7 Configuration File Strategy. Keep under 150 lines. Use the sacrifice order: Identity → Authority → Constraints → Knowledge → Task.
- **Hooks** → Part 3 Deterministic Enforcement. Claude Code hooks map directly to the Hook Execution Model (Section 08). PreToolUse, PostToolUse, and other lifecycle hooks ARE the enforcement layer.
- **Skills** (.claude/skills/*.md) → Part 2 Progressive Disclosure (Section 07). Skills are the native mechanism for on-demand context loading.
- **agents.md** → Part 4 Fleet Composition (Section 11). Define agent roles with Identity, Scope, Does NOT Do, Output routing.
- **Claude Code's built-in subagent** → Swarm Patterns (Section 20). The Agent tool enables parallel work with coordination.

> **Note:** Claude Code is the closest native implementation of the Admiral model. Most framework concepts map directly to Claude Code features.

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

The Admiral Framework uses semantic versioning: **MAJOR.MINOR** (e.g., v5.0, v5.1, v6.0).

- **MAJOR** (e.g., v5 → v6): Breaking changes to Standing Orders, agent definition format, Brain schema, or enforcement model. Requires migration.
- **MINOR** (e.g., v5.0 → v5.1): New agent definitions, additional appendices, clarifications, or non-breaking extensions. Backwards compatible.

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

*The Fleet Admiral Framework · v5.0*

*Context is the currency of autonomous AI. The Brain is where that currency compounds.*
