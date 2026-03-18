# Codebase Assessment — Homebase Repository

**Date:** 2026-03-18
**Spec version:** v0.18.9-alpha
**Control plane:** v0.6.0-alpha

---

## Executive Summary

Homebase is a monorepo implementing the **Admiral Framework** — an AI agent fleet governance system. It contains a comprehensive specification (~114 files, 80+ markdown docs in `aiStrat/`), an early-stage TypeScript control plane, a Bash-based hook enforcement layer, and supporting research/thesis documents. The project is in **alpha — specification-heavy, implementation-light** — with a clear gap between what the spec defines and what is runnable code.

---

## Repository Structure

| Directory | Purpose | Size/Scale |
|---|---|---|
| `aiStrat/` | Framework specification (frozen, protected) | ~80 markdown files, 13 spec parts + appendices |
| `admiral/` | Implementation config, standing orders, status tracking | 16 standing order JSON files, config, status docs |
| `control-plane/` | TypeScript MVP — observability, runaway detection, traces | ~2,400 LOC across 10 source files |
| `.hooks/` | Bash enforcement hooks for Claude Code | ~1,300 LOC across 12 hooks + 430 LOC test suite |
| `.brain/` | Contradictions analysis (B1 knowledge system) | 1 file |
| `research/` | Market intelligence, competitive analysis | ~6,700 lines across 17 documents |
| `thesis/` | Strategic thesis documents | ~1,100 lines across 6 documents |
| `.claude/` | Claude Code configuration | `settings.local.json` |
| `.github/workflows/` | CI/CD automation | 3 workflows (spec validation, version bump, AI monitor) |

---

## Health Metrics

### Build & Test Status

| Component | Status | Details |
|---|---|---|
| **Control plane build** (`tsc`) | **PASS** | Clean compilation, zero errors |
| **Control plane tests** | **PASS** | 77 tests, 0 failures, 7 suites |
| **Biome lint** | **PASS** | 10 files checked, no issues |
| **Hook tests** | **PASS** | 59 tests, 0 failures |
| **Zero runtime dependencies** | **ENFORCED** | `package.json` has devDependencies only |

### Code Quality Indicators

- **Consistent conventions:** Conventional Commits in git history, snake_case hooks, structured JSON brain entries
- **Test coverage:** Strong for control plane (runaway detector, event/trace ingestion, SPC integration); hooks have comprehensive test suite
- **Linting:** Biome configured and clean
- **Type safety:** TypeScript strict mode, declarations emitted

---

## Spec-to-Implementation Gap Analysis

Based on `admiral/IMPLEMENTATION_STATUS.md` and direct code inspection:

| Spec Part | Status | What Exists |
|---|---|---|
| Part 1 — Strategy | Partial | Standing orders loaded at session start; brain context routing |
| Part 2 — Context Engineering | Partial | Context baseline hook, health check hook |
| Part 3 — Enforcement | **Partial (strongest area)** | Prohibitions enforcer (hard-block), scope boundary guard, pre/post tool adapters, zero-trust validator |
| Part 4 — Fleet Composition | Not started | 71 agent roles in spec, no fleet orchestration code |
| Part 5 — Brain Knowledge System | Partial | B1 schema defined, brain context router hook; B2/B3 not started |
| Part 6 — Execution Patterns | Not started | No parallelism, handoff, or escalation runtime |
| Part 7 — Quality Assurance | Partial | SPC-based runaway detector (Western Electric rules); no SDLC gates |
| Part 8 — Operations | Partial | HTTP server, event ingestion, /health endpoint; no alerting |
| Part 9 — Platform Integration | Partial | Claude Code hooks only; no Cursor/Windsurf/API-direct adapters |
| Part 10 — Meta-Agent Governance | Not started | No agent-governing-agents infrastructure |
| Part 11 — Universal Protocols | Partial | Session state management, standing orders (16 total); no cross-agent protocol |
| Part 12 — Data Ecosystem | Partial | Event stream, execution traces, JSONL journal; no long-term analytics |
| Part 13 — Protocol Integration (MCP + A2A) | Not started | Spec recently added; cross-references in place |

**Implementation coverage estimate:** ~25-30% of spec surface area has runnable code.

---

## Enforcement Layer (Hooks)

The hook system is the most mature implementation area. 12 hooks run as Claude Code pre/post tool-use adapters:

| Hook | Enforcement | Purpose |
|---|---|---|
| `prohibitions_enforcer.sh` | **Hard-block** (exit 2) | Blocks bypass patterns, irreversible commands, credential access |
| `scope_boundary_guard.sh` | **Hard-block** (exit 2) | Protects `aiStrat/`, `.github/workflows/` from unauthorized writes |
| `pre_tool_use_adapter.sh` | Router | Dispatches to specific enforcement hooks |
| `post_tool_use_adapter.sh` | Router | Post-action validation, injection detection |
| `zero_trust_validator.sh` | Advisory | Injection detection, blast-radius checks |
| `loop_detector.sh` | Advisory | Detects repetitive tool call patterns |
| `token_budget_tracker.sh` | Advisory | Tracks token usage against session budget |
| `pre_work_validator.sh` | Advisory | Validates context before work begins |
| `brain_context_router.sh` | Advisory | Suggests brain queries for relevant context |
| `compliance_ethics_advisor.sh` | Advisory | Flags PII, credentials, compliance risks |
| `context_health_check.sh` | Advisory | Monitors context window health |
| `context_baseline.sh` | Informational | Establishes session context baseline |

**Notable:** Only 2 hooks hard-block (prohibitions, scope boundary). The rest are advisory — they warn but don't prevent. This matches the spec's enforcement spectrum philosophy.

---

## Control Plane Architecture

Zero-dependency TypeScript service (`@admiral/control-plane@0.6.0-alpha`):

| Module | LOC | Role |
|---|---|---|
| `runaway-detector.ts` | 571 | SPC-based anomaly detection — loops, token spikes, scope explosion, recursive patterns |
| `events.ts` | 134 | Typed event system for agent lifecycle (tool_call, token_spent, subtask_created, etc.) |
| `trace.ts` | 188 | Execution trace capture and analysis |
| `ingest.ts` | 201 | JSONL journal ingestion |
| `server.ts` | 191 | HTTP API surface |
| `instrumentation.ts` | 96 | Hook-based agent instrumentation |
| `cli.ts` | 62 | CLI entry point |
| `index.ts` | 57 | Public API exports |

**Test quality:** 77 tests covering runaway detection (24 tests), SPC integration (6 tests), event/trace ingestion. Uses Node.js built-in test runner (no test framework dependency).

---

## CI/CD

| Workflow | Trigger | Status |
|---|---|---|
| **Spec Validation** | Push/PR touching `aiStrat/` | Validates VERSION semver, JSON/YAML syntax, markdown cross-references |
| **Version Bump** | PR merge to `main` | Auto-bumps version from conventional commits, creates git tags |
| **AI Landscape Monitor** | Daily 07:00 UTC / Weekly Monday | Scans AI ecosystem, generates digests, creates issues |

---

## Standing Orders

16 standing orders loaded at session start via `session_start_adapter.sh`:

SO-01 through SO-15 (identity discipline, output routing, scope boundaries, context honesty, decision authority, recovery protocol, checkpointing, quality standards, communication format, prohibitions, context discovery, zero trust, bias awareness, compliance/ethics, pre-work validation) + SO-16 (protocol governance, recently added).

---

## Strengths

1. **Spec depth** — 13-part specification is thorough, well-cross-referenced, and internally consistent
2. **Hook enforcement works** — Demonstrated by this session: scope boundary guard correctly blocked `aiStrat/` writes
3. **Zero-dependency policy** — Control plane has no runtime deps, only devDependencies (TypeScript, Biome)
4. **Test discipline** — 77 + 59 = 136 automated tests, all passing
5. **Clean build** — No lint errors, no type errors, no test failures
6. **Conventional Commits** — Consistent commit history enabling automated versioning
7. **Self-documenting** — AGENTS.md, IMPLEMENTATION_STATUS.md, README.md are comprehensive and current

## Risks & Gaps

1. **Spec-implementation gap is large** — ~70% of the spec has no runnable code. Fleet composition (71 roles), execution patterns, meta-agent governance, and the data ecosystem are entirely unimplemented
2. **Single-platform lock-in** — Hooks only work with Claude Code. No adapters for Cursor, Windsurf, or API-direct usage
3. **Advisory-heavy enforcement** — 10 of 12 hooks are advisory only. Determined agents can ignore warnings
4. **No integration tests** — Control plane modules are unit-tested but there's no end-to-end test of the full event→detect→alert pipeline
5. **Brain is barely started** — B1 schema exists, but only 1 file in `.brain/`. B2/B3 levels (the persistent knowledge architecture) are unimplemented
6. **No alerting pipeline** — Runaway detector can detect anomalies but has no way to push alerts to external systems
7. **Session state is ephemeral** — `.admiral/session_state.json` is runtime-only, not persisted across sessions

## Recommendations (Priority Order)

1. **Promote advisory hooks to enforcement** — Scope boundary guard already demonstrates the pattern. Loop detector and token budget tracker should hard-block, not just warn
2. **Build the event→alert pipeline** — Connect runaway detector output to GitHub Issues or Slack notifications
3. **Implement B1 brain persistence** — The brain context router hook exists but routes to almost nothing. Populate `.brain/` with operational knowledge
4. **Add integration tests** — Test the full flow: event ingestion → trace analysis → runaway detection → alert
5. **Create a second platform adapter** — Even a minimal Cursor/Windsurf adapter proves the spec's platform-agnostic claims
6. **Close the fleet composition gap** — Even a 3-5 agent routing prototype would validate the orchestration spec
