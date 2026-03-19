# Admiral Framework — Project Roadmap

> **Bird's Eye View** — A phased execution plan covering all 34 streams in dependency order.
> No deadlines. No sprints. Just the right order to build things so nothing blocks.

---

## How to Read This Document

The work is organized into **9 Phases**. Each phase contains streams that can be worked **concurrently** within that phase, but phases themselves have dependency relationships — a phase generally cannot start until the prior phase's foundational outputs exist. Some streams span multiple phases (noted with `(continues)` markers).

**Key:**
- **Streams** are the unit of work (Stream 0–33)
- **Phases** group streams by dependency tier — what can run in parallel
- **→ Feeds** shows what downstream work a stream unlocks
- **← Needs** shows what upstream work must exist first

---

## Dependency Overview

```
Phase 0  Strategy & Spec Clarity
  │
Phase 1  Codebase Quality Foundation
  │
Phase 2  Architecture, CI/CD & Self-Enforcement
  │
Phase 3  Core Spec Implementation (Hooks, SOs, Brain B1)
  │
Phase 4  Fleet Definition, Security & Observability
  │
Phase 5  Fleet Orchestration, MCP & Autonomy
  │
Phase 6  Knowledge Ecosystem, Context & Intent
  │
Phase 7  Platform Scale & Governance-as-a-Service
  │
Phase 8  Excellence, Validation & Strategic Positioning
```

---

## Phase 0 — Strategy & Spec Clarity

> Establish the strategic foundation and resolve spec ambiguity so every downstream stream builds on solid ground.

| Stream | Name | Scope | Feeds → |
|--------|------|-------|---------|
| **00** | Strategy Triangle | Ground Truth templates, readiness gates, deployment guards | All streams (mission/boundary/success criteria) |
| **21** | Spec Debt Resolution | Spec gap inventory, amendment proposals, enforcement map, version tracking | All implementation streams (clear specs prevent rework) |

**Why first:** Every stream implements against the spec and operates within strategy boundaries. Ambiguous specs and missing strategy definitions cause cascading rework. These two streams are pure planning/specification work with no code dependencies.

**Concurrency:** Streams 0 and 21 are fully independent and can run in parallel.

**Exit criteria:** Ground Truth templates exist and are machine-readable. Spec debt is inventoried with blocking gaps identified and amendment proposals drafted.

---

## Phase 1 — Codebase Quality Foundation

> Make the existing codebase testable, consistent, documented, and contributor-friendly before building new systems on top of it.

| Stream | Name | Scope | ← Needs | Feeds → |
|--------|------|-------|---------|---------|
| **01** | Testing | Unit tests for untested modules, edge cases, benchmarks, coverage gates | — | Streams 2, 5, 6, 13 |
| **02** | Code Quality | Shared jq helpers, error handling standards, typed errors, exit code taxonomy | — | Streams 3, 6 |
| **04** | Documentation | Style guide, CoC, LICENSE, ADRs, glossary, contributor docs | — | Streams 6, 26 |
| **26** | Developer Experience | One-command setup, dev containers, hook CLI, local CI runner | — | All contributor-facing streams |

**Why second:** You cannot enforce quality (Phase 2) without tests, standards, and docs to enforce. You cannot build architecture (Phase 2) without consistent patterns. You cannot onboard contributors without DX.

**Concurrency:** All four streams are independent and can run fully in parallel.

**Exit criteria:** All existing modules have unit tests. Coding standards are documented and followed. Contributors can set up and run the project with one command.

---

## Phase 2 — Architecture, CI/CD & Self-Enforcement

> Formalize system contracts, automate quality enforcement in CI, and make the framework enforce its own standards.

| Stream | Name | Scope | ← Needs | Feeds → |
|--------|------|-------|---------|---------|
| **03** | Architecture | JSON schema validation, hooks↔control-plane bridge, session state machine, event registry, plugin system | Streams 1, 2 | Streams 5, 6, 7, 8, 13 |
| **05** | CI/CD | Multi-stage pipelines, coverage gates, security scanning, matrix builds, release automation | Stream 1 | Streams 6, 13 |
| **06** | Self-Enforcement | Test discipline, doc discipline, meta-test, quality dashboard, drift detection, compliance audit | Streams 1, 2, 3, 4 | Streams 8, 13 |
| **27** | Monitoring & Scanner | Ecosystem scanner, daily digests, weekly reports, codebase health metrics | — | Streams 31, 32 |

**Why third:** Schema validation (Stream 3) is prerequisite for almost all spec implementation. CI gates (Stream 5) catch regressions as new systems are built. Self-enforcement (Stream 6) ensures quality doesn't degrade under velocity. Monitoring (Stream 27) provides the measurement foundation.

**Concurrency:** Streams 3 and 5 can start together. Stream 6 needs partial output from Streams 1–4 (can start mid-phase as those deliver). Stream 27 is independent.

**Exit criteria:** Hook payloads are schema-validated. CI pipeline enforces coverage, linting, and security. The framework detects its own quality drift. Ecosystem monitoring is operational.

---

## Phase 3 — Core Spec Implementation

> Close the critical gaps: missing hooks, Standing Orders enforcement, execution patterns, and Brain B1 completion.

| Stream | Name | Scope | ← Needs | Feeds → |
|--------|------|-------|---------|---------|
| **07** | Hooks & Fleet Foundation | 4 missing hooks, SO enforcement map, agent registry, task routing engine, permission matrix | Streams 0, 3 | Streams 8, 14, 15 |
| **08** | Execution Patterns & Ops | Handoff, escalation, parallel coordination, quality gates, alerting, cost attribution, fleet lifecycle, decision log | Stream 7 | Streams 9, 14, 15, 16 |
| **29** | Standing Orders Implementation | Deterministic enforcement for all 16 SOs (identity, scope, communication, authority, recovery, quality, prohibitions, zero-trust, etc.) | Stream 0 | Streams 6, 19 |
| **11** | Brain System (B1) | Automatic entry creation, retrieval, demand signals, contradiction detection, consolidation | Stream 3 | Streams 11 (B2), 16, 20 |

**Why fourth:** These streams implement the core Admiral runtime. Missing hooks (Stream 7) are spec gaps that block fleet work. Execution patterns (Stream 8) enable multi-agent coordination. Standing Orders (Stream 29) are the governance backbone. Brain B1 (Stream 11) is institutional memory.

**Concurrency:** Streams 7 and 29 can start together (both depend on Phase 0+2, not each other). Stream 8 starts after Stream 7 delivers the registry/routing foundation. Brain B1 (Stream 11) is independent of hooks work and can run in parallel with all three.

**Exit criteria:** All spec-defined hooks exist. All 16 Standing Orders have deterministic enforcement. Handoff, escalation, and parallel coordination work. Brain B1 is complete with automatic entry creation and retrieval.

---

## Phase 4 — Fleet Definition, Security & Observability

> Define every agent, harden the security posture, and build the observability stack before orchestrating the fleet.

| Stream | Name | Scope | ← Needs | Feeds → |
|--------|------|-------|---------|---------|
| **14** | Fleet Agent Definitions | Machine-readable definitions for 71 core + 34 extended agents, JSON schema, validator, capability registry | Stream 7 | Stream 15 |
| **24** | Security Hardening | Attack corpus, injection detection, privilege escalation hardening, secret scanning, audit tamper detection, SBOM, cascade containment | Stream 3 | Streams 9, 13, 16 |
| **25** | Observability | Structured logging, distributed tracing, metrics collection, health aggregation, alerting, SLO/SLI, control plane (CP1→CP3) | Stream 3 | Streams 19, 23, 28 |

**Why fifth:** Agent definitions (Stream 14) must exist before routing can work (Phase 5). Security (Stream 24) must be baked in before the fleet scales. Observability (Stream 25) must exist before governance agents can monitor anything.

**Concurrency:** All three streams are independent and can run fully in parallel.

**Exit criteria:** All agent roles have machine-readable definitions with validated schemas. Security has defense-in-depth with 30+ adversarial test scenarios. Structured logging, tracing, and metrics are operational across all components.

---

## Phase 5 — Fleet Orchestration, MCP & Autonomy

> Wire agents together with routing, expose capabilities via MCP, and implement the trust framework that lets agents earn independence.

| Stream | Name | Scope | ← Needs | Feeds → |
|--------|------|-------|---------|---------|
| **15** | Fleet Routing & Orchestration | Routing engines (task-type, file-ownership, capability), model tier enforcement, context injection, handoff validation, fleet health, task decomposition, conflict resolution | Streams 7, 8, 14 | Streams 17, 22, 23 |
| **16** | MCP Integration | MCP server (stdio + HTTP+SSE), Brain/Fleet/Governance tools, identity tokens, RBAC, schema definitions, integration tests (L1–L5), client SDK, advanced MCP security | Streams 11 (B1), 14 | Streams 17, 20, 23 |
| **18** | Progressive Autonomy | Trust data model (4 stages), scoring engine, permission gating, auto-promotion/demotion, trust persistence, trust-aware routing | Streams 11 (B1), 15 | Streams 19, 23 |
| **19** | Meta-Governance | Sentinel, Arbiter, Compliance Monitor agents, event bus, rule engine, intervention protocol, self-governance constraints | Streams 15, 25 | Streams 23, 28 |
| **30** | Context Engineering | Context profiles (3 zones), budget tracking, compression, relevance scoring, injection ordering, overflow handling, dynamic allocation, preloading | Stream 15 | Streams 22, 28 |

**Why sixth:** Routing (Stream 15) is the nervous system connecting agents to tasks — it needs agent definitions (Phase 4) and execution patterns (Phase 3). MCP (Stream 16) is how agents access capabilities programmatically. Progressive autonomy (Stream 18) prevents governance from being a bottleneck at scale. Meta-governance (Stream 19) is the fleet's immune system. Context engineering (Stream 30) maximizes every agent's effectiveness.

**Concurrency:** Streams 15 and 16 can start together. Stream 18 can start once Stream 15 delivers basic routing. Stream 19 needs Stream 15 + 25. Stream 30 can start once Stream 15 delivers context assembly.

**Exit criteria:** Tasks route to the right agents automatically. All Admiral capabilities are accessible via MCP tools. Agents earn and lose trust based on performance. Governance agents monitor the fleet autonomously. Context windows are optimally utilized.

---

## Phase 6 — Knowledge Ecosystem, Intent & Protocols

> Evolve the Brain into a living knowledge system, implement intent engineering, and close remaining protocol gaps.

| Stream | Name | Scope | ← Needs | Feeds → |
|--------|------|-------|---------|---------|
| **11** | Brain System (B2 + B3) *(continues)* | SQLite with FTS5, embedding pipeline, similarity search (B2) → Postgres+pgvector, MCP server, knowledge graph, quarantine, audit logging (B3) | Stream 11 (B1), 16 | Streams 20, 22 |
| **20** | Data Ecosystem | Knowledge graph, maintenance agents (gardener, curator, harvester), feedback loops, quality metrics, cross-session transfer | Streams 11, 16 | Streams 22, 28 |
| **22** | Intent Engineering | Intent capture schema (6 elements), decomposition engine, validation, tracking, intent-to-agent mapping, outcome learning, templates, conflict detection | Streams 15, 20 | Streams 23, 28 |
| **10** | Protocols & Ecosystem Gaps | Human referral, paid resource authorization, context budget validation, feedback loops, 13+ additional spec gaps, A2A content inspection, data classification | Streams 7, 8 | Streams 9, 23 |
| **09** | Platform Security Governance | Adapter architecture, PII detection, security audit trail, Sentinel agent, authority tracking, governance dashboard | Streams 8, 24 | Streams 17, 23 |

**Why seventh:** Brain B2/B3 (Stream 11) needs the MCP server (Phase 5) to expose tools. Data ecosystem (Stream 20) needs Brain persistence. Intent engineering (Stream 22) needs routing and knowledge. Protocols (Stream 10) and platform security (Stream 9) fill remaining spec gaps.

**Concurrency:** Brain B2 and Data Ecosystem can start together. Intent Engineering starts once routing and knowledge foundations exist. Streams 9 and 10 are independent of each other but both need Phase 3 outputs.

**Exit criteria:** Brain has graduated through B2 to B3 with semantic search. Knowledge grows, self-maintains, and transfers across sessions. Intent engineering captures structured goals and learns from outcomes. All protocol gaps are closed.

---

## Phase 7 — Platform Scale & Governance-as-a-Service

> Extend Admiral beyond Claude Code, build the quality/rating measurement systems, and package governance as a deployable service.

| Stream | Name | Scope | ← Needs | Feeds → |
|--------|------|-------|---------|---------|
| **17** | Platform Adapters | Adapter interface, Claude Code refactor, Cursor/Windsurf/API-direct/VS Code adapters, event-driven agents, scheduled agents | Streams 15, 16 | Stream 23 |
| **31** | Quality Assurance System | Automated code review, test generation, quality gate pipeline, metrics collection, trend analysis, debt tracking, complexity budgets, quality scores | Streams 5, 27 | Streams 32, 33 |
| **32** | Rating System | Rating data model (5 tiers), automated calculation, CI integration, badges, history tracking, improvement recommendations, module ratings, benchmarks | Streams 27, 31 | Streams 33, 12 |
| **23** | Governance Platform | REST API, policy management, multi-tenant (deferred), event streaming, reporting, SDK, deployment guide, webhooks (Slack, PagerDuty, Jira) | Streams 16, 18, 19 | Stream 28 |

**Why eighth:** Platform adapters (Stream 17) need routing and MCP to exist. Quality assurance (Stream 31) and rating (Stream 32) need measurement infrastructure. Governance platform (Stream 23) needs all core governance capabilities stable.

**Concurrency:** Stream 17 and Streams 31/32 are independent tracks. Stream 32 follows Stream 31. Stream 23 can run in parallel with Stream 17.

**Exit criteria:** Admiral governance works on Cursor, Windsurf, VS Code, and CI/CD — not just Claude Code. Quality is measured automatically with composite scores. Rating system calculates ADM-1 through ADM-5 tiers. Governance is deployable as a service with API and SDK.

---

## Phase 8 — Excellence, Validation & Strategic Positioning

> Push beyond 10/10, prove the thesis with evidence, position for enterprise adoption, and build the inevitable future features.

| Stream | Name | Scope | ← Needs | Feeds → |
|--------|------|-------|---------|---------|
| **13** | Exemplary Codebase | Simulation testing, chaos engineering, profiling, contract testing, security pentesting, load testing, architecture visualization | Streams 1, 3, 5, 6, 7, 24 | — (capstone) |
| **33** | Thesis Validation | Metrics definition, A/B comparison (advisory vs enforcement), case studies, quality tracking, DX survey, false positive tracking, ROI model, academic paper outline | Streams 31, 32 | Stream 12 |
| **12** | Strategic Positioning | OWASP crosswalk, NIST/ISO/EU AI Act alignment, competitive matrix, enterprise playbook, open-source strategy, academic positioning | Streams 32, 33 | — (capstone) |
| **28** | Inevitable Features | Agent versioning, plugin architecture, multi-repo, performance profiling, cost optimization, session replay, collaboration patterns, real-time dashboard, A/B testing, marketplace concept | Streams 15, 19, 20, 25 | — (capstone) |

**Why last:** These streams are the capstone. Exemplary codebase (Stream 13) requires almost everything else to exist. Thesis validation (Stream 33) needs measurement systems producing data. Strategic positioning (Stream 12) needs implementation depth and validation evidence. Inevitable features (Stream 28) extend a stable platform.

**Concurrency:** All four streams are independent and can run fully in parallel.

**Exit criteria:** Codebase withstands chaos testing and adversarial scenarios. The thesis "deterministic enforcement beats advisory guidance" has quantitative evidence. Admiral is positioned against OWASP, NIST, ISO, and competitors. Future-proofing infrastructure exists for versioning, plugins, and multi-repo.

---

## Stream-to-Phase Map (Quick Reference)

| Stream | Name | Phase(s) |
|--------|------|----------|
| 00 | Strategy Triangle | 0 |
| 01 | Testing | 1 |
| 02 | Code Quality | 1 |
| 03 | Architecture | 2 |
| 04 | Documentation | 1 |
| 05 | CI/CD | 2 |
| 06 | Self-Enforcement | 2 |
| 07 | Hooks & Fleet Foundation | 3 |
| 08 | Execution Patterns & Ops | 3 |
| 09 | Platform Security Governance | 6 |
| 10 | Protocols & Ecosystem Gaps | 6 |
| 11 | Brain System | 3 (B1), 6 (B2+B3) |
| 12 | Strategic Positioning | 8 |
| 13 | Exemplary Codebase | 8 |
| 14 | Fleet Agent Definitions | 4 |
| 15 | Fleet Routing & Orchestration | 5 |
| 16 | MCP Integration | 5 |
| 17 | Platform Adapters | 7 |
| 18 | Progressive Autonomy | 5 |
| 19 | Meta-Governance | 5 |
| 20 | Data Ecosystem | 6 |
| 21 | Spec Debt Resolution | 0 |
| 22 | Intent Engineering | 6 |
| 23 | Governance Platform | 7 |
| 24 | Security Hardening | 4 |
| 25 | Observability | 4 |
| 26 | Developer Experience | 1 |
| 27 | Monitoring & Scanner | 2 |
| 28 | Inevitable Features | 8 |
| 29 | Standing Orders Implementation | 3 |
| 30 | Context Engineering | 5 |
| 31 | Quality Assurance System | 7 |
| 32 | Rating System | 7 |
| 33 | Thesis Validation | 8 |

---

## Concurrency Gantt View

Each row is a phase. Streams listed on the same row can execute in parallel.

```
Phase 0  ║ [Stream 00: Strategy] [Stream 21: Spec Debt]
         ║
Phase 1  ║ [Stream 01: Testing] [Stream 02: Code Quality] [Stream 04: Docs] [Stream 26: DX]
         ║
Phase 2  ║ [Stream 03: Architecture] [Stream 05: CI/CD] [Stream 27: Monitoring]
         ║          └──→ [Stream 06: Self-Enforcement] (starts mid-phase)
         ║
Phase 3  ║ [Stream 07: Hooks+Fleet] [Stream 29: Standing Orders] [Stream 11-B1: Brain B1]
         ║          └──→ [Stream 08: Execution Patterns] (after Stream 07 registry)
         ║
Phase 4  ║ [Stream 14: Agent Definitions] [Stream 24: Security] [Stream 25: Observability]
         ║
Phase 5  ║ [Stream 15: Routing] [Stream 16: MCP]
         ║       └──→ [Stream 18: Autonomy] [Stream 19: Meta-Gov] [Stream 30: Context]
         ║
Phase 6  ║ [Stream 11-B2/B3: Brain Evolution] [Stream 09: Platform Security] [Stream 10: Protocols]
         ║       └──→ [Stream 20: Data Ecosystem] [Stream 22: Intent Engineering]
         ║
Phase 7  ║ [Stream 17: Adapters] [Stream 23: Governance Platform] [Stream 31: QA System]
         ║                                                               └──→ [Stream 32: Rating]
         ║
Phase 8  ║ [Stream 13: Exemplary] [Stream 33: Thesis] [Stream 28: Inevitable] [Stream 12: Strategy]
```

---

## Critical Path

The longest dependency chain through the project:

```
Stream 00 (Strategy)
  → Stream 03 (Architecture — schema validation)
    → Stream 07 (Hooks & Fleet — agent registry)
      → Stream 14 (Agent Definitions — machine-readable specs)
        → Stream 15 (Routing & Orchestration — wires agents together)
          → Stream 16 (MCP — exposes capabilities as tools)
            → Stream 23 (Governance Platform — deploys as service)
```

Any delay on this chain delays the entire project. Streams off the critical path have float and can shift without impact.

---

## Phase Transition Rules

1. **A phase can start when its `← Needs` streams have delivered their foundational outputs** — not necessarily 100% complete. For example, Phase 2 needs test files from Stream 1, not every benchmark.

2. **Streams within a phase should be staffed in parallel** whenever possible to maximize throughput.

3. **A stream that spans phases** (e.g., Brain B1 in Phase 3 → B2/B3 in Phase 6) has natural graduation gates — B1 must be complete before B2 begins.

4. **Phase 8 streams are capstones** — they integrate and validate everything built before them. They should not start until the systems they measure/test/position are stable.

5. **No phase requires all prior phases to be 100% complete.** The dependency is on specific outputs, not phase-level completion. Use the `← Needs` column to determine readiness.
