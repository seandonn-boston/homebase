# Level 2: Core Fleet — Implementation Plan

## Key Insight from Spec

The spec is explicit: **Level 2 is definitions and contracts, not live orchestration.** The Orchestrator is a role definition. Routing rules are a decision table. Interface contracts are templates. The sophisticated multi-agent runtime is Level 3+.

Most Level 2 deliverables are **models + configuration**, not runtime enforcement. The hooks from Level 1 carry forward unchanged. What Level 2 adds is the fleet vocabulary: who does what, how they talk to each other, and how work persists.

## Existing Foundation (Level 1)

Already built and tested (34 admiral tests):
- `AgentDefinition` with scope, tools, authority, guardrails, context discovery
- `DecisionAuthority` with 4 tiers + calibration rules
- `ConstraintClassification` with enforcement spectrum
- `Mission`, `Boundaries`, `SuccessCriteria`, `ResourceBudgets`
- 15 Standing Orders with rendering + injection
- `EscalationReport` + `EmergencyHaltReport` with routing
- Hook engine with self-healing, dependency resolution, topological ordering
- Runtime adapter bridging Claude Code ↔ Admiral hooks

## What Level 2 Requires (12 Checklist Items)

Grouped by implementation type:

### New Models to Build (6 files)

1. **`admiral/models/fleet.py`** — Fleet Composition (Sec 11)
   - `FleetRoster`: agents list, validate 5-12 count, lookup by role/category
   - `RoutingRule`: task_type → agent_role mapping with priority + fallback
   - `RoutingTable`: collection of rules with `route(task_type)` method
   - Leverages existing `AgentDefinition`, `InterfaceContractRef`

2. **`admiral/models/handoff.py`** — Handoff Protocol (Sec 38)
   - `HandoffDocument`: from_agent, to_agent, via, task, deliverable, acceptance_criteria, context_files, constraints, assumptions, open_questions
   - `validate_handoff()`: validate completeness, reject with specifics
   - `render()` method matching Section 38 template

3. **`admiral/models/checkpoint.py`** — Institutional Memory (Sec 24)
   - `Checkpoint`: session, completed, in_progress, blocked, next, decisions_made, recovery_actions, resources_consumed, assumptions
   - `DecisionRecord`: timestamp, decision, alternatives, rationale, authority_tier
   - `DecisionLog`: append-only collection with query methods
   - `HandoffBrief`: session-end narrative for next-session loading

4. **`admiral/models/work.py`** — Work Decomposition (Sec 18)
   - `WorkChunk`: entry_state, exit_state, budget (tokens/time), quality_gates, agent_role
   - `ChunkState` enum: PENDING, IN_PROGRESS, COMPLETED, BLOCKED, FAILED
   - `Decomposition`: goal → ordered chunks with sequencing
   - 40% budget ceiling validation

5. **`admiral/models/context.py`** — Context Window Strategy (Sec 06)
   - `ContextProfile`: standing_context, session_context, on_demand_context per role
   - `ContextBudget`: standing (15-25%), session (50-65%), working (20-30%)
   - `SacrificeOrder`: what compresses first (working → session → never standing)
   - `RefreshTrigger` enum: CHUNK_BOUNDARY, PROPOSE_RESOLUTION, DRIFT_DETECTED

6. **`admiral/models/ground_truth.py`** — Ground Truth (Sec 05)
   - `GroundTruth`: ontology, tech_stack, access_permissions, known_issues, config_status
   - `TechStackEntry`: name, version (exact), purpose
   - `KnownIssue`: description, workaround, severity
   - Validation: versions must be exact ("React 19.1", not "React")

### Existing Models to Extend (2 files)

7. **`admiral/models/authority.py`** — Decision Authority (Sec 09)
   - Add default concrete examples for common decisions (architecture change → PROPOSE, code pattern → AUTONOMOUS, etc.)
   - Add `project_maturity_calibration()` factory method

8. **`admiral/models/agent.py`** — Model Selection (Sec 13)
   - Add `model_rationale` field to `AgentDefinition`
   - Add `context_budget_kb` field for context requirement verification

### New Protocol (1 file)

9. **`admiral/models/handoff.py`** — Handoff validation logic
   - `validate_handoff(doc: HandoffDocument) → list[str]` — returns missing fields

### Tests (1 file)

10. **`admiral/tests/test_level2.py`** — Comprehensive Level 2 tests
    - Fleet roster validation (count bounds, role uniqueness, routing completeness)
    - Handoff document completeness validation
    - Checkpoint serialization/deserialization
    - Work chunk budget ceiling enforcement
    - Context profile budget allocation validation
    - Ground truth version exactness validation
    - Decision authority default examples
    - Routing table dispatch correctness

### Documentation Updates (2 files)

11. **`admiral/LEVEL1_STATUS.md`**
    - Keep level-specific status tracking until a cross-level status document is introduced

12. **`admiral/__init__.py`**
    - Update docstring to reflect Level 2 architecture
    - Add Level 2 exports

## Implementation Order

The order follows dependency chains — each step only uses what's already built:

1. **Ground Truth model** — no dependencies, foundational context
2. **Context Profile model** — depends on nothing, defines how context loads
3. **Work Chunk model** — depends on `ResourceBudgets` (exists)
4. **Checkpoint + Decision Log models** — depends on `WorkChunk`
5. **Handoff model + protocol** — depends on `AgentDefinition` (exists)
6. **Fleet Roster + Routing** — depends on `AgentDefinition`, `HandoffDocument`
7. **Extend authority.py** — depends on nothing, adds defaults
8. **Extend agent.py** — depends on nothing, adds fields
9. **Tests** — after all models
10. **Documentation + exports** — last

## What This Plan Does NOT Include

Per the spec, these are Level 3+:
- Governance agents (Token Budgeter, Hallucination Auditor, Loop Breaker)
- Brain / persistent memory (Postgres + pgvector)
- Live multi-agent orchestration runtime
- A2A cross-process agent communication
- Identity tokens (HMAC-SHA256)
- Dynamic model switching
- Swarm patterns
- Fleet observability / tracing

## Scope Check

The spec says Level 2 time-to-build is "2-4 hours" for configuration. Since we're building the framework (not configuring an existing tool), expect longer. But the models are straightforward Pydantic classes — the patterns are established from Level 1. No new runtime hooks, no new CLI adapters, no async complexity.
