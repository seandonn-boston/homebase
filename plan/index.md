# Admiral Framework — Comprehensive Roadmap Index

**Last updated:** 2026-03-25

**Target:** Transform Helm from a strong prototype into a showcase-quality, fully-governed, spec-complete AI agent orchestration platform — a codebase that earns a 10/10 on every dimension.

**Thesis:** A pristine codebase is not about perfection — it is about predictability, discoverability, and confidence. Every file should justify its existence. Every behavior should be tested. Every decision should be documented. A stranger should be able to clone this repo and ship a contribution within 30 minutes.

---

## Current Score

| Dimension | Score | Target | Key Gaps |
|---|---|---|---|
| Testing | 9/10 | 10/10 | 930+ TS + 350+ bash tests, 90% coverage, coverage gate in CI. Missing: property tests, mutation testing |
| Code Quality Tooling | 8/10 | 10/10 | Coverage gate, license audit, ShellCheck, Biome. Missing: typed error hierarchy, strict null checks |
| Architecture | 9/10 | 10/10 | Schema validation, config consolidation, hook/CP bridge, session state machine, event registry, handoff/escalation protocols, multi-agent pipeline orchestration, three-layer context assembly. Missing: plugin arch |
| Spec Implementation | 9/10 | 10/10 | 19/19 hooks, fleet routing (86 rules), brain B1+B2 (SQLite/FTS5), execution patterns, SO enforcement, 71 agents, MCP server (12 tools), governance agents, progressive autonomy, context engineering, intent engineering (capture/decompose/validate/route), knowledge graph + maintenance agents. Missing: B3 production, ASP alignment |
| Documentation | 7/10 | 10/10 | LICENSE, CoC, API docs, hook contracts, enforcement map. Missing: ADMIRAL_STYLE.md, runbook, ADRs |
| CI/CD | 9/10 | 10/10 | Coverage gate, benchmarks, PR size check, fix-needs-tests, stale branches, changelog, release workflow. Missing: matrix builds, CodeQL |
| Consistency | 8/10 | 10/10 | Config consolidated with schema validation, unified TypeScript patterns across 4 modules. Missing: hook jq helpers |
| Contributor Experience | 8/10 | 10/10 | CoC, LICENSE, badges, quality metrics dashboard. Missing: quick-start tutorial, good first issues |
| Error Handling | 6/10 | 10/10 | Graceful degradation tested (A-13), degradation policy engine with exponential backoff. Missing: typed error hierarchy |
| Performance | 5/10 | 10/10 | Hook latency, server, RingBuffer benchmarks + regression detector. Missing: CI integration |
| Observability | 9/10 | 10/10 | Structured logging (bash + TS), distributed tracing with OpenTelemetry export, Prometheus metrics, health aggregation, alert routing, log aggregation, SLO/SLI tracking, fleet dashboard, governance dashboard, session thermal model, intervention catalog, canonical trace format. Missing: real-time visualization |
| Brain & Knowledge | 8/10 | 10/10 | B1 complete, B2 SQLite with FTS5 search, knowledge graph (6 link types, multi-hop traversal), graduation metrics (B1→B2, B2→B3), self-instrumentation (stale detection, meta namespace, contradiction resolution), entry versioning/expiration/templates, provenance tracking, knowledge maintenance agents (gardener/curator/harvester), feedback loops, export/import, usage analytics. Missing: B3 Postgres+pgvector, embedding pipeline |
| Fleet & Orchestration | 9/10 | 10/10 | 71 agent definitions, capability registry, routing engine (task-type/file-ownership/capability-match), degradation policy, context assembly, handoff protocol, pipeline orchestration, fleet health monitoring, task decomposition, scaling policies, agent lifecycle, conflict resolution, trust-aware routing. Missing: ASP alignment, runtime agent instantiation |
| Strategy Foundation | 9/10 | 10/10 | Ground Truth tooling, readiness assessment, Go/No-Go gate, task criteria, pipeline gate, validation hooks, LLM-Last enforcement |
| Security & Compliance | 9/10 | 10/10 | 90-pattern injection detection (3 layers), privilege escalation hardening, secret scanning, tamper-proof audit trail (SHA-256 hash chain), MCP behavioral security (5 layers), identity tokens, RBAC, PII detection (email/SSN/CC/API keys/JWT), attack corpus (30 ATK scenarios), security audit trail. Missing: SBOM, Leash Cedar integration |
| Strategic Positioning | 2/10 | 10/10 | Missing OWASP/AEGIS/NIST/McKinsey/IMDA crosswalks |
| **Overall** | **9/10** | **10/10** | Phase 6 complete: Brain B2 SQLite (FTS5 search, knowledge graph, graduation metrics, self-instrumentation), intent engineering (capture/decompose/validate/route with 5 templates), knowledge ecosystem (gardener/curator/harvester agents, feedback loops, export/import, search API, quality metrics), platform security (PII detection, audit trail hash chain, 30 ATK attack corpus), brain excellence (versioning, expiration, analytics, backup, templates, provenance). 383 new tests. Next: platform adapters, governance platform, thesis validation |

---

## Table of Contents

### Part 0: Strategy Foundation (Stream 0)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 0 | [Strategy Triangle](stream-00-strategy-triangle.md) | `stream-00-strategy-triangle.md` | ST-01 to ST-08 | Ground Truth, readiness, Go/No-Go gate, spec-first, validation hooks |

### Part I: Codebase Quality (Streams 1-6)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 1 | [Testing](stream-01-testing.md) | `stream-01-testing.md` | T-01 to T-22 | Unit tests, edge cases, coverage, benchmarks |
| 2 | [Code Quality & Consistency](stream-02-code-quality.md) | `stream-02-code-quality.md` | Q-01 to Q-14 | Bash standardization, TS quality, consistency |
| 3 | [Architecture & Design](stream-03-architecture.md) | `stream-03-architecture.md` | A-01 to A-13 | Schema validation, bridges, pipeline abstractions, graceful degradation |
| 4 | [Documentation](stream-04-documentation.md) | `stream-04-documentation.md` | D-01 to D-19 | Style guide, ADRs, guides, glossary |
| 5 | [CI/CD & Infrastructure](stream-05-ci-cd.md) | `stream-05-ci-cd.md` | C-01 to C-15 | Coverage gates, matrix builds, automation |
| 6 | [Self-Enforcement](stream-06-self-enforcement.md) | `stream-06-self-enforcement.md` | P-01 to P-10 | Meta-governance, dog-fooding, drift detection |

### Part II: Spec Implementation (Streams 7-11)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 7 | [Hooks & Fleet](stream-07-hooks-and-fleet.md) | `stream-07-hooks-and-fleet.md` | S-01 to S-09, S-04b | Missing hooks, hook contracts, fleet orchestration (Part 3) |
| 8 | [Execution, Quality & Ops](stream-08-execution-quality-ops.md) | `stream-08-execution-quality-ops.md` | S-10 to S-17 | Execution patterns, quality gates, alerting (Parts 5, 6, 7) |
| 9 | [Platform, Security & Governance](stream-09-platform-security-governance.md) | `stream-09-platform-security-governance.md` | S-18 to S-25 | Platform adapters, security, meta-governance (Parts 8, 9, 10) |
| 10 | [Protocols, Ecosystem & Gaps](stream-10-protocols-ecosystem-gaps.md) | `stream-10-protocols-ecosystem-gaps.md` | S-26 to S-45 | Protocols, data ecosystem, spec gaps, A2A/MCP security (Parts 11, 12, Ext) |
| 11 | [Brain Knowledge System](stream-11-brain-system.md) | `stream-11-brain-system.md` | B-01 to B-29, B-21b to B-21e | B1 completion, B2 SQLite, B3 production, graduation, self-instrumentation, excellence, provenance |

### Part III: Fleet & Multi-Agent (Streams 14-18)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 14 | [Fleet Agent Definitions](stream-14-fleet-agent-definitions.md) | `stream-14-fleet-agent-definitions.md` | F-01 to F-16, F-15b | All 71 agent roles, schema, registry, templates, ASP alignment, ASP templates, ASP migration |
| 15 | [Fleet Routing & Orchestration](stream-15-fleet-routing-and-orchestration.md) | `stream-15-fleet-routing-and-orchestration.md` | O-01 to O-10 | Routing rules, model tiers, context injection, handoff |
| 16 | [MCP Integration](stream-16-mcp-integration.md) | `stream-16-mcp-integration.md` | M-01 to M-14 | MCP server, brain/fleet/governance tools, auth, MCP server security |
| 17 | [Platform Adapters](stream-17-platform-adapters.md) | `stream-17-platform-adapters.md` | PA-01 to PA-13 | Adapter interface, Claude Code, Cursor, Windsurf, API-direct, headless agents |
| 18 | [Progressive Autonomy](stream-18-progressive-autonomy.md) | `stream-18-progressive-autonomy.md` | AU-01 to AU-11 | Trust levels, scoring, promotion/demotion, routing, approval UI/API |

### Part IV: Governance & Data (Streams 19-23)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 19 | [Meta-Governance](stream-19-meta-governance.md) | `stream-19-meta-governance.md` | MG-01 to MG-10 | Sentinel, Arbiter, Compliance Monitor, self-governance |
| 20 | [Data Ecosystem](stream-20-data-ecosystem.md) | `stream-20-data-ecosystem.md` | DE-01 to DE-10 | Knowledge graph, gardener/curator/harvester agents, feedback loops |
| 21 | [Spec Debt Resolution](stream-21-spec-debt-resolution.md) | `stream-21-spec-debt-resolution.md` | SD-01 to SD-15 | Spec gaps, amendment proposals, compliance testing, operational resilience |
| 22 | [Intent Engineering](stream-22-intent-engineering.md) | `stream-22-intent-engineering.md` | IE-01 to IE-10 | Intent capture, decomposition, validation, tracking, inflection points, judgment boundaries |
| 23 | [Governance Platform](stream-23-governance-platform.md) | `stream-23-governance-platform.md` | GP-01 to GP-10, GP-01b | API server, visibility pillar, multi-tenant, policy DSL, SDK, webhooks |

### Part V: Hardening & Observability (Streams 24-28)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 24 | [Security Hardening](stream-24-security-hardening.md) | `stream-24-security-hardening.md` | SEC-01 to SEC-17 | Attack corpus (30 ATK), injection layers, quarantine L4/L5, SBOM, MCP/A2A security, circuit breakers, Leash Cedar integration |
| 25 | [Observability](stream-25-observability.md) | `stream-25-observability.md` | OB-01 to OB-17 | Structured logging, distributed tracing, metrics, SLOs, intervention auth, canonical trace format |
| 26 | [Developer Experience](stream-26-developer-experience.md) | `stream-26-developer-experience.md` | DX-01 to DX-14 | Dev containers, one-command setup, debugging guides, session simulator |
| 27 | [Monitoring & Scanner](stream-27-monitoring-and-scanner.md) | `stream-27-monitoring-and-scanner.md` | MON-01 to MON-10 | Scanner, daily digests, handoff validation |
| 28 | [Inevitable Features](stream-28-inevitable-features.md) | `stream-28-inevitable-features.md` | IF-01 to IF-13 | Versioning, marketplace, plugins, multi-repo, A/B testing, predictive health models |

### Part VI: Strategic & Excellence (Streams 12-13, 29-33)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 12 | [Strategic Positioning](stream-12-strategic-positioning.md) | `stream-12-strategic-positioning.md` | R-01 to R-11 | OWASP, AEGIS, NIST, McKinsey, IMDA, ISO, EU AI Act |
| 13 | [Exemplary Codebase](stream-13-exemplary-codebase.md) | `stream-13-exemplary-codebase.md` | X-01 to X-18 | Simulation testing, chaos, profiling, contract testing |
| 29 | [Standing Orders Implementation](stream-29-standing-orders-implementation.md) | `stream-29-standing-orders-implementation.md` | SO-01 to SO-17 | All 16 SOs enforced with automated mechanisms |
| 30 | [Context Engineering](stream-30-context-engineering.md) | `stream-30-context-engineering.md` | CE-01 to CE-10 | Context profiles, budgets, compression, relevance scoring |
| 31 | [Quality Assurance System](stream-31-quality-assurance-system.md) | `stream-31-quality-assurance-system.md` | QA-01 to QA-10 | Code review automation, quality gates, tech debt tracking |
| 32 | [Rating System](stream-32-rating-system.md) | `stream-32-rating-system.md` | RT-01 to RT-10 | Rating dimensions, automated calculation, badges, dashboards |
| 33 | [Thesis Validation](stream-33-thesis-validation.md) | `stream-33-thesis-validation.md` | TV-01 to TV-09 | Metrics, case studies, ROI, academic paper |

---

## Item Count Summary

| Part | Streams | Items | Description |
|---|---|---|---|
| Part 0: Strategy Foundation | 0 | ~8 items | Ground Truth, readiness, Go/No-Go, validation hooks |
| Part I: Codebase Quality | 1-6 | ~84 items | Testing, quality, architecture, docs, CI, self-enforcement |
| Part II: Spec Implementation | 7-11 | ~84 items | Core spec gaps, brain system, A2A/MCP security items |
| Part III: Fleet & Multi-Agent | 14-18 | ~66 items | Agent definitions, routing, MCP (incl. server security), adapters, autonomy |
| Part IV: Governance & Data | 19-23 | ~56 items | Meta-governance, data ecosystem, spec debt, intent, platform |
| Part V: Hardening & Observability | 24-28 | ~64 items | Security (incl. MCP/A2A), observability, DX, monitoring, future features |
| Part VI: Strategic & Excellence | 12-13, 29-33 | ~86 items | Positioning, excellence, SOs, context, QA, rating, thesis |
| **Total** | **34 streams** | **~479 items** | **Complete roadmap** |

---

## Execution Guide

### Phase 1: Spec Debt & Foundation (Sessions 1-10) — Know What We're Building
0. ST-01, ST-02, ST-03 — Strategy Triangle foundation (Ground Truth template, readiness assessment, Go/No-Go gate)
1. SD-01, SD-02 — Spec debt inventory and prioritization (identifies gaps that inform all other work)
2. SD-04, SD-05 — Standing Orders enforcement map completion, hook manifest audit
3. SEC-13 — Extend zero_trust_validator.sh to all tool responses (highest-impact quick fix)
4. T-01 to T-04 — Unit tests for untested modules
5. Q-01, Q-02 — Standardize hooks
6. T-09, C-01 — Coverage enforcement
7. D-01, D-02, D-03 — Documentation quick wins (ADMIRAL_STYLE, CoC, LICENSE)

### Phase 2: Spec Debt Resolution & Self-Enforcement (Sessions 11-18) — Close the Gaps on Paper
8. SD-03 — Spec amendment proposals for all identified gaps
9. SD-06 to SD-09 — Reference constants, version tracking, compliance testing, changelog
10. SD-10 to SD-12 — Spec gap proposals (fleet orchestration, Brain graduation, cross-platform hooks)
11. Q-05, Q-06, Q-08 — TypeScript quality
12. A-01, A-04, A-06 — Schema validation
13. P-01, P-02, P-05 — Self-enforcement hooks

### Phase 3: Spec Gaps — Critical (Sessions 19-28) — Close the Gap in Code
14. S-01 to S-04 — Missing hooks (incl. expanded protocol_registry_guard with MCP server enforcement)
15. S-05, SO-17 — Standing Orders enforcement map
16. B-01 to B-03 — Brain B1 completion
17. S-10, S-11 — Handoff + escalation
18. S-06, S-07 — Agent registry + task routing

### Phase 4: Fleet & Orchestration (Sessions 29-40) — Multi-Agent Reality
19. F-01 to F-04 — Core agent definitions
20. O-01 to O-03 — Routing and model tiers
21. F-12, F-13 — Agent schema and registry

### Phase 5: Robustness & Security (Sessions 41-52) — Hardening
22. T-05 to T-08 — Edge case testing
23. SEC-01 to SEC-05 — Security hardening (SEC-01 now covers 30 ATK entries incl. MCP/A2A/temporal)
24. S-20, S-22 — Data sensitivity, audit trail
25. A-02, A-07 — Hook/control-plane bridge
26. C-02 to C-04 — CI matrix, security scanning

### Phase 6: Brain Evolution (Sessions 53-64) — Knowledge System
27. B-06 — Brain B1 comprehensive tests
28. B-07 to B-09 — Brain B2 core
29. B-10, B-11 — Brain B2 semantic
30. B-12, B-13 — Brain B3 scaffold
31. B-29 — Brain provenance-aware writes and queries

### Phase 7: MCP & Platform (Sessions 65-76) — Integration
32. M-01 to M-03 — MCP server scaffold, Brain tools, Fleet tools
33. M-10 to M-12 — MCP behavioral baselining, trust decay, manifest snapshots
34. M-13, M-14 — Version hash verification, canary operations
35. PA-01, PA-02 — Platform adapter interface
36. OB-01 to OB-04 — Observability stack

### Phase 8: Governance & Autonomy (Sessions 77-88) — Intelligence
37. MG-01 to MG-04 — Meta-governance agents
38. AU-01 to AU-05 — Progressive autonomy
39. DE-01 to DE-04 — Data ecosystem
40. SEC-14 — Cascade containment circuit breakers
41. S-44, S-45 — A2A payload inspection, data classification tags

### Phase 9: Strategic & Excellence (Sessions 89-104) — Showcase
42. R-01, R-04 — OWASP, NIST alignment
43. R-02, R-03, R-05, R-06 — Compliance crosswalks
44. X-01 to X-03 — Simulation, chaos, e2e testing
45. QA-01 to QA-05 — Quality assurance system
46. RT-01 to RT-05 — Rating system
47. TV-01 to TV-05 — Thesis validation

### Phase 10: Future-Proofing (Sessions 104+) — Vision
48. IF-01 to IF-06 — Inevitable features
49. IE-01 to IE-04 — Intent engineering
50. GP-01 to GP-05 — Governance platform

---

## Cross-Stream Dependencies

```
# Strategy foundation dependencies (Phase 0 — everything depends on this)
ST-01 (Ground Truth template) ← ST-06 (validation hook)
ST-02 (readiness assessment) ← ST-03 (Go/No-Go gate)
ST-04 (task acceptance criteria) ← all task-level work

# Spec debt dependencies (Phase 1 — informs all other work)
SD-01 (inventory) ← SD-02 (prioritization) ← SD-03 (amendment proposals)
SD-06 (constants) + SD-07 (version tracking) ← SD-08 (compliance testing)
SD-07 (version tracking) ← SD-09 (changelog bridge)

# Foundation dependencies
T-09 (coverage gate) ← T-01 to T-04 (need tests first)
Q-01 (jq helpers) ← Q-02 (error handling)
A-05 (config consolidation) ← S-06 (fleet registry)

# Fleet dependencies
S-06 (registry) ← S-07 (routing) ← S-08 (permissions)
F-12 (agent schema) ← F-01 to F-11 (agent definitions)
O-01 (routing engine) ← S-06 (registry)

# Brain dependencies
B-01 to B-06 (B1 completion) ← B-07 (B2 start)
B-07 to B-11 (B2 complete) ← B-12 (B3 start)
B-21 (graduation metrics) ← B-06 and B-11
B-01 (B1 baseline) ← B-29 (provenance-aware Brain)

# Governance dependencies
S-05 (enforcement map) ← MG-02 (Sentinel)
S-23 (Sentinel pattern) ← MG-02 (full Sentinel)
AU-01 (trust model) ← AU-03 (trust gating) ← AU-09 (trust routing)

# Security dependencies
S-20, S-21 (data sensitivity) ← B-12 (MCP server)
SEC-01 (attack corpus, 30 entries) ← SEC-10 (regression tests)
SEC-01 + M-10 (behavioral baselining) ← SEC-14 (circuit breakers)
S-40 (inter-agent comm) ← S-44 (A2A payload inspection)

# MCP security dependencies (from MCP-SECURITY-ANALYSIS.md)
M-01a (MCP scaffold) ← M-10 (behavioral baselining) ← M-14 (canary operations)
M-01a (MCP scaffold) ← M-12 (manifest snapshots)
M-01b (MCP config) ← M-11 (trust decay)
M-09 (health/metrics) ← M-10 (behavioral baselining)

# Platform dependencies
S-18 (adapter interface) ← PA-02 (Claude Code refactor) ← PA-03 to PA-06 (other adapters)
M-01 (MCP scaffold) ← M-02 to M-04 (MCP tools)

# Self-enforcement dependencies
P-01 (test discipline) ← T-09 (coverage gate)
P-03 (meta-test) ← A-02 (bridge)
```

---

## Definition of Done: 10/10

The codebase is 10/10 when:
- [ ] Strategy Triangle (Ground Truth, Boundaries, Success Criteria) is documented and validated for the project
- [ ] All ~463 items across 34 streams are complete
- [ ] Current Score shows 9+ in every dimension
- [ ] A new contributor can set up, understand, and contribute in under 30 minutes
- [ ] The hook directory is the most tested code in the repository
- [ ] Every CI check passes on both Linux and macOS
- [ ] Coverage is ≥80% across all TypeScript modules
- [ ] Every hook has a dedicated test and edge case tests
- [ ] Every design decision has an ADR
- [ ] Quality is visible (badges, dashboard, published benchmarks)
- [ ] Admiral enforces its own quality standards through its own hooks
- [ ] Brain B1 is fully operational with automatic recording and retrieval
- [ ] All 15 spec-defined hooks are implemented and tested
- [ ] Fleet orchestration handles at least 5 agent roles
- [ ] Standing Orders enforcement map is 100% complete (all 16 SOs)
- [ ] At least 5 compliance crosswalk documents are published
- [ ] Security audit trail captures all enforcement events
- [ ] Escalation pipeline handles structured escalation flow
- [ ] MCP server exposes brain and fleet tools
- [ ] At least 2 platform adapters work (Claude Code + API-direct)
- [ ] Progressive autonomy tracks trust levels across sessions
- [ ] Meta-governance agents (Sentinel, Arbiter) are operational
- [ ] Rating system calculates and tracks scores automatically
- [ ] Thesis validation has measurable evidence

---

## References

- [AGENTS.md](../AGENTS.md) — Agent governance and decision authority
- [admiral/IMPLEMENTATION_STATUS.md](../admiral/IMPLEMENTATION_STATUS.md) — Spec-to-implementation tracking
- [docs/spec-proposals/sd-01-spec-debt-inventory.md](../docs/spec-proposals/sd-01-spec-debt-inventory.md) — Spec debt inventory and resolution
- [aiStrat/admiral/spec/index.md](../aiStrat/admiral/spec/index.md) — Spec table of contents
- [aiStrat/admiral/reference/spec-debt.md](../aiStrat/admiral/reference/spec-debt.md) — Specification debt
- [aiStrat/admiral/reference/spec-gaps.md](../aiStrat/admiral/reference/spec-gaps.md) — Specification gaps
- [research/pristine-github-repositories.md](../research/pristine-github-repositories.md) — Pristine codebase patterns
- [research/pristine-repos-gap-analysis.md](../research/pristine-repos-gap-analysis.md) — Gap analysis
- [admiral/MCP-SECURITY-ANALYSIS.md](../admiral/MCP-SECURITY-ANALYSIS.md) — MCP/A2A threat analysis and recommendations
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Contributor guide
