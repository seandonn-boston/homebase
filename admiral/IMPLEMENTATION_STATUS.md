# Admiral Framework — Implementation Status

Tracks the gap between what the spec defines and what is implemented as runnable code.

> **Last updated:** 2026-03-23 | **Spec version:** v0.17.1-alpha | **Control plane:** v0.6.0-alpha

## Status Legend

| Symbol | Meaning |
|--------|---------|
| Done | Implemented and tested |
| Partial | Core logic exists, not feature-complete |
| Not started | Specified but no implementation |

---

## Spec Part Status Matrix

| # | Spec Part | Status | Implementation | Notes |
|---|-----------|--------|----------------|-------|
| 1 | Strategy & Context Engineering | Partial | `admiral/bin/`, `admiral/templates/`, `admiral/schemas/`, `admiral/standing-orders/`, `.hooks/brain_context_router.sh` | Ground Truth templates, readiness assessment, Go/No-Go gate, task criteria, spec-first pipeline, boundaries validation all implemented; Standing Orders loaded at session start; Brain context routing as hook |
| 2 | Deterministic Enforcement | Partial | `.hooks/prohibitions_enforcer.sh`, `.hooks/scope_boundary_guard.sh`, `.hooks/pre_tool_use_adapter.sh` | Bypass/irreversible patterns hard-block (exit 2); secrets advisory-only; scope boundary advisory |
| 3 | Fleet Composition | Not started | — | 71 agent roles defined in spec; no fleet orchestration code |
| 4 | Brain Knowledge System | Partial | `.brain/`, `.hooks/brain_context_router.sh` | B1 schema defined; brain context router suggests queries; B2/B3 not started |
| 5 | Execution Patterns | Not started | — | Spec defines parallelism, handoff, escalation patterns; no runtime |
| 6 | Quality Assurance | Partial | `control-plane/src/runaway-detector.ts` | SPC-based anomaly detection, loop/spike/recursive detection; no SDLC gates |
| 7 | Operations | Partial | `control-plane/src/server.ts`, `control-plane/src/ingest.ts` | HTTP API, event ingestion, /health endpoint; no alerting pipeline |
| 8 | Platform Integration | Partial | `.hooks/`, `.claude/` | Claude Code hooks implemented; no other platform adapters |
| 9 | Security (Zero Trust) | Partial | `.hooks/zero_trust_validator.sh` | Injection detection, blast-radius checks, privilege escalation detection; advisory only |
| 10 | Meta-Agent Governance | Not started | — | No agent-governing-agents infrastructure |
| 11 | Universal Protocols | Partial | `admiral/lib/state.sh` | Session state management, atomic writes; no cross-agent protocol |
| 12 | Data Ecosystem | Partial | `control-plane/src/events.ts`, `control-plane/src/trace.ts` | Event stream, execution traces, JSONL journal; no long-term analytics |

---

## Hook Implementation Status

| Hook | File | Enforcement Level | Tested |
|------|------|-------------------|--------|
| Prohibitions Enforcer | `.hooks/prohibitions_enforcer.sh` | Hard-block (bypass/irreversible) | Yes |
| Scope Boundary Guard | `.hooks/scope_boundary_guard.sh` | Advisory | Yes |
| Zero Trust Validator | `.hooks/zero_trust_validator.sh` | Advisory | Yes |
| Pre-Work Validator | `.hooks/pre_work_validator.sh` | Advisory | Yes |
| Loop Detector | `.hooks/loop_detector.sh` | Advisory | Yes |
| Token Budget Tracker | `.hooks/token_budget_tracker.sh` | Advisory | Yes |
| Context Health Check | `.hooks/context_health_check.sh` | Advisory | Yes |
| Brain Context Router | `.hooks/brain_context_router.sh` | Advisory | Yes |
| Compliance Ethics Advisor | `.hooks/compliance_ethics_advisor.sh` | Advisory | Yes |
| Context Baseline | `.hooks/context_baseline.sh` | SessionStart | Yes |
| Session Start Adapter | `.hooks/session_start_adapter.sh` | SessionStart | Yes |
| Pre-Tool-Use Adapter | `.hooks/pre_tool_use_adapter.sh` | Orchestrator | Yes |
| Post-Tool-Use Adapter | `.hooks/post_tool_use_adapter.sh` | Orchestrator | Yes |

---

## Control Plane Modules

| Module | File | Status | Tests |
|--------|------|--------|-------|
| Event System | `src/events.ts` | Done | Yes (via runaway-detector tests) |
| Execution Traces | `src/trace.ts` | Done | Yes |
| Runaway Detector | `src/runaway-detector.ts` | Done | 24 tests |
| SPC Monitor | `src/runaway-detector.ts` | Done | Yes (Western Electric rules) |
| Instrumentation | `src/instrumentation.ts` | Done | — |
| HTTP Server | `src/server.ts` | Done | — |
| Journal Ingester | `src/ingest.ts` | Done | — |
| Dashboard | `src/dashboard/` | Done | — |

---

## What's Next

Priority items to close the spec-implementation gap:

1. **Fleet orchestration runtime** — Multi-agent routing, handoff, and escalation (Spec Parts 3, 5)
2. **B2/B3 Brain levels** — Persistent knowledge beyond B1 session memory (Spec Part 4)
3. **Alerting pipeline** — Push alerts from control plane to external systems (Spec Part 7)
4. **SDLC quality gates** — Automated review, test generation, coverage tracking (Spec Part 6)
5. **Cross-platform adapters** — Beyond Claude Code: Cursor, Windsurf, API-direct (Spec Part 8)
