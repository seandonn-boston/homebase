# AGENTS.md — Admiral Implementation Project

This project implements the Admiral Framework specification (`aiStrat/`) as working Python code.

## Mission

This project is the **Admiral Framework reference implementation** — a Python package that replicates every specification component in `aiStrat/` as executable, testable code.

It is successful when every spec section has a corresponding implementation with passing tests, and the framework can govern its own construction (dogfooding from commit zero).

It is built for framework adopters who need a working implementation of Admiral's governance model.

Current phase: **greenfield**.
Pipeline entry: Fleet takes over at **Implementation**.

## Boundaries

NON-GOALS: This project does not provide a hosted service. It does not build a UI. It does not replace the specification — it implements it. It does not create an orchestration runtime (that's CrewAI/LangGraph territory).

CONSTRAINTS: Must use Python 3.11+. Must use Pydantic for data models. Must use pytest for testing. Must remain spec-faithful — every model traces to a spec section.

BUDGETS: 200,000 tokens per task. Agents may only modify files in `admiral/`. No modifications to `aiStrat/` without explicit approval (spec updates are separate tasks).

QUALITY FLOOR: All tests pass. No lint errors. Every public class has a docstring referencing its spec section.

LLM-LAST: Deterministic tools handle: testing, linting, type checking, formatting, schema validation. LLM handles: design decisions, code generation, documentation.

## Success Criteria

FUNCTIONAL: All Level 1 and Level 2 tests pass. Hook engine discovers, validates, and executes hooks. Standing Orders load and render. Escalation reports generate correctly. Fleet models validate composition, routing, tool registries, and recovery ladders.

QUALITY: `python -m pytest admiral/tests/ -v` exits 0. Every model validates against its spec schema where a JSON schema exists.

COMPLETENESS: AGENTS.md, CLAUDE.md, all Level 1 models, all Level 1 hooks, all Level 2 models (fleet, routing, tools, context, ground truth, checkpoints, handoff, recovery, protocol integration), all protocols, all tests.

NEGATIVE: No files modified outside `admiral/` (except `.github/CODEOWNERS` and `.claude/hooks.json`). No secrets in code. No disabled quality gates.

VERIFICATION: Self-Check for Level 1.

## Standing Orders

All 15 Standing Orders from Section 36 apply. Priority when conflicts arise:
1. **Safety** (SO 10, 12, 14)
2. **Authority** (SO 5, 6)
3. **Process** (SO 7, 8, 15)
4. **Communication** (SO 2, 4, 9)
5. **Scope** (SO 1, 3, 11, 13)

Load the full set via: `from admiral.protocols.standing_orders import load_standing_orders`

## Enforcement Classification (Level 1)

| Category | Hook (deterministic) | Instruction (firm) |
|---|---|---|
| Security | — | Use secure patterns |
| Scope | token_budget_gate | Stay within task scope |
| Quality | context_health_check | Write clean code |
| Process | token_budget_tracker, loop_detector | Follow spec-first pipeline |
| Cost | token_budget_gate | Be mindful of token usage |

Level 2+ hooks (tier_validation, identity_validation, governance_heartbeat_monitor) are deferred.

## Live Enforcement

Hooks are wired into Claude Code via `.claude/hooks.json` and fire through the runtime adapter (`admiral/runtime/hook_adapter.py`):

- **SessionStart**: Resets session state, fires `context_baseline`, injects Standing Orders
- **PreToolUse**: Fires `token_budget_gate` — blocks if budget exhausted
- **PostToolUse**: Fires `token_budget_tracker`, `loop_detector`, `context_health_check`

State persists across hook invocations in `.admiral/session_state.json`.

## Design Principles

1. Hooks over instructions
2. Zero-trust continuous verification
3. Defense in depth
4. Context is currency
5. Progressive adoption
6. Specification as product
7. Tool-agnostic by default

## Key Entry Points

| I need to... | Start here |
|---|---|
| Understand the spec | `aiStrat/admiral/index.md` |
| See all spec files | `aiStrat/MANIFEST.md` |
| See implementation | `admiral/` package |
| Run tests | `python -m pytest admiral/tests/ -v` |
| See data models | `admiral/models/` |
| See hook engine | `admiral/hooks/engine.py` |
| See Standing Orders | `admiral/protocols/standing_orders.py` |
| See runtime adapter | `admiral/runtime/hook_adapter.py` |
| See fleet models | `admiral/models/fleet.py` |
| See tool registry | `admiral/models/tool_registry.py` |
| See recovery ladder | `admiral/models/recovery.py` |
| See handoff protocol | `admiral/protocols/handoff_protocol.py` |
| See Level 1 status | `admiral/LEVEL1_STATUS.md` |
| See Level 2 status | `admiral/LEVEL2_STATUS.md` |

## Adoption Level

This project is currently at **Level 2: Core Fleet** — fleet composition, routing, tool registries, context profiles, ground truth, work decomposition, checkpoints, handoff protocol, protocol integration, and failure recovery are all modeled with tested Pydantic classes. Level 1 hooks remain deployed as live enforcement. Graduating to Level 3 when governance agents perform verification.
