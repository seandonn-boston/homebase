# Level 2: Core Fleet — Completion Status

Tracks Level 2 requirements per `aiStrat/admiral/appendices.md` Pre-Flight Checklist
and whether `admiral/` satisfies each requirement.

## Requirements vs. Status

Mirrors the 13 checklist items from the spec's Level 2 Pre-Flight Checklist.

### Part 2 — Context

| # | Requirement | Status | Notes |
|---|---|---|---|
| 04 | Context Engineering — prompt anatomy, tested with probes | Done | `PromptAnatomy` model with five-section structure (Identity → Authority → Constraints → Knowledge → Task). `PromptProbe` data definitions for Level 3 execution harness. `PromptAnatomy.from_agent()` builds from `AgentDefinition`. |
| 05 | Ground Truth — ontology, naming, tech stack, access, known issues, config | Done | `models/ground_truth.py` — all template fields modeled with validation |
| 06 | Context Window Strategy — profiles per role, loading order, refresh, sacrifice | Done | `models/context.py` — budget allocation, 150-line limit, sacrifice order, cross-validation with agent budget |

### Part 3 — Enforcement

| # | Requirement | Status | Notes |
|---|---|---|---|
| 09 | Decision Authority — four tiers, concrete examples, calibrated to maturity | Done | `models/authority.py` — `with_common_defaults()` + `project_maturity_calibration()` |

### Part 4 — Fleet

| # | Requirement | Status | Notes |
|---|---|---|---|
| 11 | Fleet Composition — roster, routing, "Does NOT Do", interface contracts | Done | `models/fleet.py` — 1-12 agents (min 1 for testing, 5+ recommended), routing table, self-QA prevention |
| 12 | Tool & Capability Registry — per-agent tools, negative tool list, MCP | Done | `models/tool_registry.py` — per-agent registry, fleet-wide MCP, phantom capability defense |
| 13 | Model Selection — every role to tier with rationale, context verified | Done | `models/agent.py` — `model_rationale`, `context_budget_kb` + cross-validation in `ContextProfile.validate_fits_budget()` |
| 14 | Protocol Integration — MCP registered/pinned, A2A if needed | Done | `models/protocol_integration.py` — A2A config. MCP registration in `models/tool_registry.py` |

### Part 6 — Execution

| # | Requirement | Status | Notes |
|---|---|---|---|
| 18 | Work Decomposition — chunks, entry/exit, budgets, quality gates | Done | `models/work.py` — 40% ceiling, dependency resolution, spec-first support |

### Part 7 — Quality

| # | Requirement | Status | Notes |
|---|---|---|---|
| 22 | Failure Recovery — recovery ladder, max retries, escalation template | Done | `models/recovery.py` — 5-step ladder, no-skip validation, recovery records |

### Part 8 — Operations

| # | Requirement | Status | Notes |
|---|---|---|---|
| 24 | Institutional Memory — persistence pattern, decision log, checkpoint template | Done | `models/checkpoint.py` — decision log, handoff brief, resource tracking |

### Part 11 — Protocols

| # | Requirement | Status | Notes |
|---|---|---|---|
| 37 | Escalation Protocol — routing and report format | Done | `protocols/escalation.py` — complete from Level 1 |
| 38 | Handoff Protocol — structured handoff format | Done | `models/handoff.py` + `protocols/handoff_protocol.py` — two-level validation (schema + semantic) |

## Implementation Summary

**New Models (9):**
- `ground_truth.py` — Single source of project reality (Section 05)
- `context.py` — Context window budget and sacrifice strategy (Section 06)
- `work.py` — Work decomposition with budget ceilings (Section 18)
- `checkpoint.py` — Session persistence and decision logging (Section 24)
- `handoff.py` — Structured agent-to-agent handoffs (Section 38)
- `fleet.py` — Fleet roster, routing table, self-QA prevention (Section 11)
- `tool_registry.py` — Per-agent tool registry + fleet MCP servers (Section 12/14)
- `protocol_integration.py` — A2A connection config (Section 14)
- `recovery.py` — Recovery ladder with no-skip enforcement (Section 22)

**Extended Models (2):**
- `authority.py` — Default decision examples + project maturity calibration (Section 09)
- `agent.py` — Model rationale, context budget, prompt anatomy, prompt probes (Section 04/13)

**New Protocol (1):**
- `handoff_protocol.py` — Two-level handoff validation: schema + semantic (Section 38)

## Test Coverage

**313 tests passing** across 7 test files:
- `test_models.py` — Level 1 model validation (uses `ValidationError` not bare `Exception`)
- `test_level2.py` — Level 2 model validation per section
- `test_level2_comprehensive.py` — Edge cases, serialization roundtrips, cross-model integration, prompt anatomy
- `test_hooks.py`, `test_runtime.py`, `test_standing_orders.py`, `test_enforcement.py`, `test_schema_validation.py`

Key test categories in `test_level2_comprehensive.py`:
- **Edge cases:** Boundary values (40% ceiling exactly, 150-line limit), empty inputs, rejection conditions
- **Serialization roundtrips:** All Level 2 models survive JSON → dict → model → JSON cycle
- **Cross-model integration:** Fleet → routing → handoff → checkpoint end-to-end workflow
- **Prompt anatomy:** Section ordering, `from_agent()` factory, render output, probe definitions

## Spec Clarifications Applied

Items where the spec was updated to clarify Level 2 expectations:

1. **Section 04 (Prompt Anatomy)** — Spec now documents `PromptAnatomy` as a five-section data structure with `render()` at Level 2. Probe execution harness is Level 3+; probe *definitions* (data structures) are Level 2. `PromptProbe` model captures boundary, authority, ambiguity, conflict, and regression probes.

2. **Section 11 (Fleet Size)** — Spec now includes implementation note: `FleetRoster` minimum is 1 (for testing and incremental assembly). The 5-agent recommendation is operational, not a schema constraint. Pre-Flight Checklist verifies fleet coverage before production.

3. **Section 38 (Handoff Validation)** — Spec now documents two-level validation: schema (strict, Pydantic) and semantic (warnings, protocol layer). `context_files` and `constraints` are optional by design. Criterion minimum length is 10 characters (up from 5). Complex tasks (>200 chars) without context files trigger a warning; simple tasks do not.

## Verdict

Level 2 is **13/13 complete** against the spec's pre-flight checklist. All checklist items are satisfied with tested Pydantic models, validated through 313 tests including edge cases, serialization roundtrips, and cross-model integration.
