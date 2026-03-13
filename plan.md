# Admiral Framework — Project Plan

## Where We Are

The Admiral Framework (v0.2.0-alpha) is a **complete specification** for AI agent fleet orchestration. It is a pure specification project: zero executable code, zero runtime dependencies. Every artifact is a design document.

**What exists today (71 files across 15 groups):**

- **Doctrine:** 15 markdown files (~6,340 lines) covering strategy, context engineering, enforcement, fleet composition, Brain architecture, execution patterns, quality assurance, operations, platform integration, meta-agent governance, and universal protocols. Internally consistent with cross-references.
- **Fleet catalog:** 71 core agents (67 specialists + 4 command) plus 29 extended/reserve agents. Full routing rules (67 task types), interface contracts, model tier assignments, prompt anatomy, context injection guides.
- **Brain:** Three maturity levels fully specified (file → SQLite → Postgres+pgvector). Production SQL schema with sensitive data guard trigger. ~60 SQL tests.
- **Hooks:** 8 core hook manifests with JSON Schema validation. Manifest-first design. No runtime implementations — manifests only.
- **Monitor:** Five-layer immune system (quarantine) architecture. Intelligence source catalog. Scan cadence defined.
- **Attack corpus:** 18 seed scenarios across 6 categories. Entry schema. Feedback pipeline from Red Team / Incident Response / Chaos agents.
- **Handoff:** JSON Schema (v1) for structured inter-agent transfers.
- **Supporting docs:** Reference constants (29 sections), spec gaps audit (14 gaps identified), standing orders enforcement map, intent engineering guide.
- **Research & thesis:** AI models timeline, agent toolkit landscape, LLM agents research, investment thesis, fundamental truths.

**What does NOT exist:**

- No hook runtime engine (hooks are manifests, not executables)
- No Brain implementation (schema exists, no ORM/MCP server)
- No Monitor scanning code
- No Orchestrator runtime
- No governance agent implementations
- No CLI tooling or dashboards
- No platform integration code

---

## Where We're Going

The framework needs three things to reach v1.0:

1. **Specification completeness** — resolve the 14 identified gaps where the spec makes behavioral claims without concrete constants
2. **Adopter readiness** — make it effortless for someone to pick up the spec and start building
3. **Validation** — prove the spec works by deploying it on a real project

---

## Phase 1: Harden the Specification (v0.3.0)

**Goal:** Eliminate all vague behavioral claims. Every threshold, trigger, and boundary in the spec should be a concrete number that an implementer can code against without interpretation.

### 1a. Resolve Critical Spec Gaps (7 items)

These are load-bearing — runtime behavior depends on interpreting subjective terms today.

| # | File | Vague Phrase | Resolution |
|---|------|-------------|------------|
| 1 | part2-context.md | "rarely exceed 50K" standing context | Hard ceiling 50K tokens; warning at 45K |
| 2 | part5-brain.md | "metrics don't improve" for Brain advancement | Hit ≥85%, Precision ≥90%, Reuse ≥30%, Δ ≥5% |
| 3 | part5-brain.md | "Low and stable" supersession rate | <10%/quarter healthy; >15% warning |
| 4 | part6-execution.md | "consistently uses less than 20%" | 2 consecutive chunks or 3+ in a session |
| 5 | part8-operations.md | "significant scope change" | >15% expansion = Strategic |
| 6 | part8-operations.md | Health metric gray zones (no Yellow) | Add Yellow zones: 50–75% FPQR, 70–85% accuracy, 25–35% overhead |
| 7 | part8-operations.md | Orchestrator overhead graduated response | 5-tier scale: <20% Normal → 50%+ Critical |

**Deliverable:** Updated spec files with concrete constants. Mirror all new constants in `reference-constants.md`.

### 1b. Resolve Moderate Spec Gaps (6 items)

| # | File | Vague Phrase | Resolution |
|---|------|-------------|------------|
| 8 | part2-context.md | "loaded early" | First 5–10% of context window |
| 9 | part7-quality.md | "reviewed carefully" | ≥2 tests, ≥50% review, ≥10% sampling |
| 10 | part7-quality.md | "declining finding counts" | >30% session-over-session decrease |
| 11 | part10-admiral.md | "consecutive successful" decisions | 5 consecutive; reset on failure |
| 12 | part11-protocols.md | "enough context" | ≥80% confidence to proceed |
| 13 | part9-platform.md | "narrower Autonomous tiers" | Shift 1 tier down from interactive baseline |

### 1c. Resolve Minor Gap + Establish Lint Rule

| # | File | Resolution |
|---|------|------------|
| 14 | part8-operations.md | Escalation rate: 5–10% decrease per session; plateau at 3+ stable sessions |

Establish a "no vague thresholds" review rule: every behavioral claim in the spec must have a number or explicitly cite another document that provides one.

### 1d. Version Bump

- Bump all version markers from `v0.2.0-alpha` to `v0.3.0-alpha`
- Update MANIFEST.md with any file-level changes

---

## Phase 2: Adopter Experience (v0.4.0)

**Goal:** A new adopter should be able to go from zero to Level 1 deployment in under 2 hours using only the spec.

### 2a. Level 1 Quick-Start Package

Create a self-contained starter kit (specification artifacts, not code) that an adopter copies into their project:

- **AGENTS.md template** — pre-filled with Admiral patterns, under 150 lines, with placeholders for project-specific values (mission, boundaries, success criteria)
- **Hook manifest starter set** — the 3 required Level 1 hooks (token_budget_gate, token_budget_tracker, loop_detector) as copyable manifest files with inline comments explaining every field
- **Standing Orders injection guide** — step-by-step for loading all 15 Standing Orders into agent context, platform-specific examples (Claude Code, Cursor, generic)
- **Pre-flight checklist (interactive)** — the Level 1 checklist from Appendix A reformatted as a standalone document adopters check off as they go

### 2b. Platform Integration Guides

Expand Appendix E with concrete, tested walkthroughs:

- **Claude Code** — AGENTS.md, CLAUDE.md, .claude/hooks/, skills, agents
- **Cursor** — .cursorrules, custom instructions, available hook points
- **Generic Agent SDK** — how to map Admiral concepts to any agent framework's primitives

### 2c. Worked Examples

Add 2-3 additional worked examples at different scales:

- **Solo developer + Claude Code** (Level 1) — the simplest possible Admiral deployment
- **Small team, 3 agents** (Level 2) — Orchestrator + 2 specialists with handoff contracts
- **Existing project retrofit** — how to introduce Admiral to a project already using agents without governance

---

## Phase 3: Validation (v0.5.0)

**Goal:** Deploy Admiral on a real project and feed lessons back into the spec.

### 3a. Self-Hosting: Admiral Governs Admiral

Use the Admiral Framework to govern development of the Admiral Framework itself (bootstrap). This means:

- Define mission, boundaries, success criteria for the aiStrat project using Admiral's own templates
- Deploy Level 1 hooks (token budget, loop detection, context health) as live enforcement in the development environment
- Load Standing Orders into the development agent's context
- Track what works, what breaks, and what the spec doesn't cover

### 3b. External Pilot

Identify one external project (real codebase, real team) willing to adopt Admiral at Level 1-2. Document:

- Time to adopt
- Friction points (where the spec was unclear or wrong)
- What the spec assumes that isn't true in practice
- Measurable outcomes (token waste reduction, error rate changes, developer confidence)

### 3c. Spec Revision Cycle

Feed findings from 3a and 3b back into the spec:

- Fix any gaps discovered during validation
- Update time-to-value estimates based on real data
- Add the validation projects as case studies in Appendix D
- Update Implementation Status Map (Appendix G) based on actual implementation experience

---

## Phase 4: Reference Implementation (v1.0.0-rc)

**Goal:** Ship a minimal, working reference implementation alongside the spec so adopters can see Admiral in action, not just read about it.

### 4a. Hook Runtime Engine (Level 1)

The minimum viable runtime — parse hook manifests, resolve dependencies (DFS cycle detection), execute in topological order (Kahn's algorithm), persist session state.

Implement the 3 required Level 1 hooks:
- `token_budget_gate` (PreToolUse) — blocks actions at 100% budget
- `token_budget_tracker` (PostToolUse) — tracks tokens, alerts at 80%/90%
- `loop_detector` (PostToolUse) — detects error signature recurrence

### 4b. Brain Level 1 (File-Based)

The simplest possible Brain — JSON files in `.brain/project/`, grep-based retrieval, git-versioned. No infrastructure beyond the filesystem.

### 4c. Agent Instantiation (Level 1)

Parse agent definitions from markdown. Generate system prompts following prompt anatomy (Identity → Authority → Constraints → Knowledge → Task). Inject Standing Orders.

### 4d. Packaging

- Ship as a standalone Python package with zero non-standard dependencies
- Test suite covering all Level 1 enforcement guarantees
- Clear separation between framework code and project configuration
- Documentation: "from pip install to governed agent in 30 minutes"

---

## Phase 5: Maturity (v1.0.0+)

**Goal:** Production-grade framework for teams running multi-agent fleets.

This phase is intentionally underspecified — the right priorities will emerge from Phase 3 and 4 feedback. Likely candidates:

- **Level 2 Fleet Orchestrator** — routing engine, handoff validation, interface contract enforcement
- **Brain Level 2** — SQLite + embeddings with cosine similarity retrieval
- **Governance agents** — Token Budgeter, Hallucination Auditor, Loop Breaker (the Level 3 minimum set)
- **Continuous Monitor** — GitHub API scanner, quarantine pipeline, digest generation
- **Fleet observability** — traces, metrics, decision logs
- **Brain Level 3** — Postgres + pgvector, MCP server, zero-trust access control

---

## What This Plan Does NOT Include

- Building all four adoption levels before validating Level 1
- A timeline — the right pace depends on feedback loops, not calendar dates
- Features nobody has asked for yet — Phase 5 is deliberately vague because Phase 3 will tell us what matters
- Ecosystem integrations (LangGraph, CrewAI, AutoGen adapters) — these are downstream consumer concerns, not framework concerns

---

## Principles Governing This Plan

1. **Spec before code.** The specification is the product. Code is a downstream consumer. Fix the spec first.
2. **Validate before scaling.** Don't build Level 4 until Level 1 is battle-tested.
3. **Concrete over aspirational.** Every phase has a specific deliverable and a clear definition of done.
4. **Progressive adoption applies to us too.** We eat our own dogfood — the plan follows the same Level 1 → Level 2 → Level 3 → Level 4 progression the framework prescribes.
5. **No premature infrastructure.** Brain Level 3, identity tokens, and zero-trust access control are Phase 5 concerns. Building them now violates the framework's own Boundaries principle.
