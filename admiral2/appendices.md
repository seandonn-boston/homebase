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

**Part 9 — The Admiral**

- [ ] **Admiral Self-Calibration (30):** Bottleneck signals known. Trust log initialized. Growth stage assessed.
- [ ] **Human-Expert Routing (31):** Expert Roster defined. Routing triggers documented. Consultation template ready.

-----

## B — Quick-Start Sequence

Operational order for standing up a new fleet. This minimizes rework — not the document order.

1. **Mission (01)** — What you are building. What success looks like.
2. **Ground Truth (05)** — Tech stack, tools, access, vocabulary.
3. **Boundaries (02)** — What you are NOT building. Resource budgets.
4. **Success Criteria (03)** — Machine-verifiable definition of "done."
5. **Deterministic Enforcement (08)** — Classify constraints. Implement hooks.
6. **Configuration File Strategy (07)** — CLAUDE.md (<150 lines), skills, agent files.
7. **Configuration Security (10)** — Audit configs. Pin MCP servers. Set CODEOWNERS.
8. **Fleet Composition (11)** — Agents, roles, routing, interface contracts.
9. **Decision Authority (09)** — Four authority tiers for this project's risk profile.
10. **Tool & Capability Registry (12)** — Available and unavailable tools per agent.
11. **Model Selection (13)** — Assign each role to a tier. Verify context fit.
12. **Protocol Integration (14)** — Register MCP servers. Configure A2A if needed.
13. **Context Engineering (04)** — Write system prompts. Run probes.
14. **Context Window Strategy (06)** — Profiles, loading order, progressive disclosure.
15. **Brain Architecture (15)** — Deploy Postgres + pgvector. Create schema. Register Brain MCP server.
16. **Knowledge Protocol (16)** — Configure access control. Add brain_query and brain_record to agent tool registries.
17. **Work Decomposition (18)** — Break first phase into chunks.
18. **Cost Management (26)** — Monetary budgets. Cost tracking.
19. **Remaining sections** — QA (21), Recovery (22), Failure Modes (23), Memory (24), Adaptation (25), Metrics (27), Scaling (28), Governance (29), Admiral (30), Expert Routing (31), Intelligence Lifecycle (17).

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

*The Fleet Admiral Framework · v3.2*

*Context is the currency of autonomous AI. The Brain is where that currency compounds.*
