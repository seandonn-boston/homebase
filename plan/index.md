# Admiral Framework — Comprehensive Roadmap Index

**Last updated:** 2026-03-19

**Target:** Transform homebase from a strong prototype into a showcase-quality, fully-governed, spec-complete AI agent orchestration platform — a codebase that earns a 10/10 on every dimension.

**Thesis:** A pristine codebase is not about perfection — it is about predictability, discoverability, and confidence. Every file should justify its existence. Every behavior should be tested. Every decision should be documented. A stranger should be able to clone this repo and ship a contribution within 30 minutes.

---

## Current Score

| Dimension | Score | Target | Key Gaps |
|---|---|---|---|
| Testing | 5/10 | 10/10 | No trace/ingest/instrumentation unit tests, no fuzz/property tests, no coverage gates |
| Code Quality Tooling | 7/10 | 10/10 | Missing coverage gates, security scanning, typed error hierarchy |
| Architecture | 5/10 | 10/10 | No hook/control-plane integration, no schema validation, no fleet orchestration |
| Spec Implementation | 3/10 | 10/10 | 8/15 hooks (53%), fleet 0%, brain B2/B3 0%, execution patterns 0%, meta-governance 0% |
| Documentation | 6/10 | 10/10 | Missing ADMIRAL_STYLE.md, LICENSE, CoC, runbook, troubleshooting guide |
| CI/CD | 7/10 | 10/10 | Missing coverage gates, matrix builds, security scanning, benchmarks |
| Consistency | 6/10 | 10/10 | Bash hook jq pattern variance, naming inconsistencies, scattered config |
| Contributor Experience | 7/10 | 10/10 | Missing CoC, LICENSE, "good first issue" labels, troubleshooting guide |
| Error Handling | 5/10 | 10/10 | No typed error hierarchy, silent failures possible, hook errors invisible |
| Performance | 2/10 | 10/10 | No benchmarks of any kind |
| Brain & Knowledge | 2/10 | 10/10 | B1 file-based only, manual, no auto-recording, no semantic search |
| Fleet & Orchestration | 1/10 | 10/10 | 71 roles defined, only Claude Code governed, no routing/handoff/parallel |
| Security & Compliance | 4/10 | 10/10 | Missing data sensitivity L1-L2, audit trail, privilege escalation hardening |
| Strategic Positioning | 2/10 | 10/10 | Missing OWASP/AEGIS/NIST/McKinsey/IMDA crosswalks |
| **Overall** | **4/10** | **10/10** | Strong foundation, critical gaps in spec implementation |

---

## Table of Contents

### Part I: Codebase Quality (Streams 1-6)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 1 | [Testing](stream-01-testing.md) | `stream-01-testing.md` | T-01 to T-22 | Unit tests, edge cases, coverage, benchmarks |
| 2 | [Code Quality & Consistency](stream-02-code-quality.md) | `stream-02-code-quality.md` | Q-01 to Q-14 | Bash standardization, TS quality, consistency |
| 3 | [Architecture & Design](stream-03-architecture.md) | `stream-03-architecture.md` | A-01 to A-12 | Schema validation, bridges, pipeline abstractions |
| 4 | [Documentation](stream-04-documentation.md) | `stream-04-documentation.md` | D-01 to D-19 | Style guide, ADRs, guides, glossary |
| 5 | [CI/CD & Infrastructure](stream-05-ci-cd.md) | `stream-05-ci-cd.md` | C-01 to C-15 | Coverage gates, matrix builds, automation |
| 6 | [Self-Enforcement](stream-06-self-enforcement.md) | `stream-06-self-enforcement.md` | P-01 to P-10 | Meta-governance, dog-fooding, drift detection |

### Part II: Spec Implementation (Streams 7A-7D, 8)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 7A | [Hooks & Fleet](stream-07a-hooks-and-fleet.md) | `stream-07a-hooks-and-fleet.md` | S-01 to S-09 | Missing hooks, fleet orchestration (Part 3) |
| 7B | [Execution, Quality & Ops](stream-07b-execution-quality-ops.md) | `stream-07b-execution-quality-ops.md` | S-10 to S-17 | Execution patterns, quality gates, alerting (Parts 5, 6, 7) |
| 7C | [Platform, Security & Governance](stream-07c-platform-security-governance.md) | `stream-07c-platform-security-governance.md` | S-18 to S-25 | Platform adapters, security, meta-governance (Parts 8, 9, 10) |
| 7D | [Protocols, Ecosystem & Gaps](stream-07d-protocols-ecosystem-gaps.md) | `stream-07d-protocols-ecosystem-gaps.md` | S-26 to S-43 | Protocols, data ecosystem, additional spec gaps (Parts 11, 12, Ext) |
| 8 | [Brain Knowledge System](stream-08-brain-system.md) | `stream-08-brain-system.md` | B-01 to B-28 | B1 completion, B2 SQLite, B3 production, graduation, excellence |

### Part III: Fleet & Multi-Agent (Streams 11-15)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 11 | [Fleet Agent Definitions](stream-11-fleet-agent-definitions.md) | `stream-11-fleet-agent-definitions.md` | F-01 to F-14 | All 71 agent roles, schema, registry, templates |
| 12 | [Fleet Routing & Orchestration](stream-12-fleet-routing-and-orchestration.md) | `stream-12-fleet-routing-and-orchestration.md` | O-01 to O-10 | Routing rules, model tiers, context injection, handoff |
| 13 | [MCP Integration](stream-13-mcp-integration.md) | `stream-13-mcp-integration.md` | M-01 to M-09 | MCP server, brain/fleet/governance tools, auth |
| 14 | [Platform Adapters](stream-14-platform-adapters.md) | `stream-14-platform-adapters.md` | PA-01 to PA-09 | Adapter interface, Claude Code, Cursor, Windsurf, API-direct |
| 15 | [Progressive Autonomy](stream-15-progressive-autonomy.md) | `stream-15-progressive-autonomy.md` | AU-01 to AU-10 | Trust levels, scoring, promotion/demotion, routing |

### Part IV: Governance & Data (Streams 16-20)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 16 | [Meta-Governance](stream-16-meta-governance.md) | `stream-16-meta-governance.md` | MG-01 to MG-10 | Sentinel, Arbiter, Compliance Monitor, self-governance |
| 17 | [Data Ecosystem](stream-17-data-ecosystem.md) | `stream-17-data-ecosystem.md` | DE-01 to DE-10 | Knowledge graph, gardener/curator/harvester agents, feedback loops |
| 18 | [Spec Debt Resolution](stream-18-spec-debt-resolution.md) | `stream-18-spec-debt-resolution.md` | SD-01 to SD-12 | Spec gaps, amendment proposals, compliance testing |
| 19 | [Intent Engineering](stream-19-intent-engineering.md) | `stream-19-intent-engineering.md` | IE-01 to IE-08 | Intent capture, decomposition, validation, tracking |
| 20 | [Governance Platform](stream-20-governance-platform.md) | `stream-20-governance-platform.md` | GP-01 to GP-10 | API server, multi-tenant, policy DSL, SDK, webhooks |

### Part V: Hardening & Observability (Streams 21-25)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 21 | [Security Hardening](stream-21-security-hardening.md) | `stream-21-security-hardening.md` | SEC-01 to SEC-12 | Attack corpus automation, injection layers, SBOM, rate limiting |
| 22 | [Observability](stream-22-observability.md) | `stream-22-observability.md` | OB-01 to OB-10 | Structured logging, distributed tracing, metrics, SLOs |
| 23 | [Developer Experience](stream-23-developer-experience.md) | `stream-23-developer-experience.md` | DX-01 to DX-12 | Dev containers, one-command setup, debugging guides |
| 24 | [Monitoring & Scanner](stream-24-monitoring-and-scanner.md) | `stream-24-monitoring-and-scanner.md` | MON-01 to MON-10 | Scanner, daily digests, handoff validation |
| 25 | [Inevitable Features](stream-25-inevitable-features.md) | `stream-25-inevitable-features.md` | IF-01 to IF-12 | Versioning, marketplace, plugins, multi-repo, A/B testing |

### Part VI: Strategic & Excellence (Streams 9-10, 26-30)

| # | Stream | File | Items | Focus |
|---|---|---|---|---|
| 9 | [Strategic Positioning](stream-09-strategic-positioning.md) | `stream-09-strategic-positioning.md` | R-01 to R-13 | OWASP, AEGIS, NIST, McKinsey, IMDA, ISO, EU AI Act |
| 10 | [Exemplary Codebase](stream-10-exemplary-codebase.md) | `stream-10-exemplary-codebase.md` | X-01 to X-18 | Simulation testing, chaos, profiling, contract testing |
| 26 | [Standing Orders Implementation](stream-26-standing-orders-implementation.md) | `stream-26-standing-orders-implementation.md` | SO-01 to SO-17 | All 16 SOs enforced with automated mechanisms |
| 27 | [Context Engineering](stream-27-context-engineering.md) | `stream-27-context-engineering.md` | CE-01 to CE-10 | Context profiles, budgets, compression, relevance scoring |
| 28 | [Quality Assurance System](stream-28-quality-assurance-system.md) | `stream-28-quality-assurance-system.md` | QA-01 to QA-10 | Code review automation, quality gates, tech debt tracking |
| 29 | [Rating System](stream-29-rating-system.md) | `stream-29-rating-system.md` | RT-01 to RT-10 | Rating dimensions, automated calculation, badges, dashboards |
| 30 | [Thesis Validation](stream-30-thesis-validation.md) | `stream-30-thesis-validation.md` | TV-01 to TV-10 | Metrics, case studies, ROI, academic paper |

---

## Item Count Summary

| Part | Streams | Items | Description |
|---|---|---|---|
| Part I: Codebase Quality | 1-6 | ~83 items | Testing, quality, architecture, docs, CI, self-enforcement |
| Part II: Spec Implementation | 7-8 | ~71 items | Core spec gaps and brain system |
| Part III: Fleet & Multi-Agent | 11-15 | ~57 items | Agent definitions, routing, MCP, adapters, autonomy |
| Part IV: Governance & Data | 16-20 | ~50 items | Meta-governance, data ecosystem, spec debt, intent, platform |
| Part V: Hardening & Observability | 21-25 | ~56 items | Security, observability, DX, monitoring, future features |
| Part VI: Strategic & Excellence | 9-10, 26-30 | ~88 items | Positioning, excellence, SOs, context, QA, rating, thesis |
| **Total** | **30 streams** | **~405 items** | **Complete roadmap** |

---

## Execution Guide

### Phase 1: Foundation (Sessions 1-8) — Quality Baseline
1. T-01 to T-04 — Unit tests for untested modules
2. Q-01, Q-02 — Standardize hooks
3. T-09, C-01 — Coverage enforcement
4. D-01, D-02, D-03 — Documentation quick wins (ADMIRAL_STYLE, CoC, LICENSE)

### Phase 2: Self-Enforcement (Sessions 9-14) — Eat Our Own Dog Food
5. Q-05, Q-06, Q-08 — TypeScript quality
6. A-01, A-04, A-06 — Schema validation
7. P-01, P-02, P-05 — Self-enforcement hooks

### Phase 3: Spec Gaps — Critical (Sessions 15-24) — Close the Gap
8. S-01 to S-04 — Missing hooks
9. S-05, SO-17 — Standing Orders enforcement map
10. B-01 to B-03 — Brain B1 completion
11. S-10, S-11 — Handoff + escalation
12. S-06, S-07 — Agent registry + task routing

### Phase 4: Fleet & Orchestration (Sessions 25-36) — Multi-Agent Reality
13. F-01 to F-04 — Core agent definitions
14. O-01 to O-03 — Routing and model tiers
15. F-12, F-13 — Agent schema and registry

### Phase 5: Robustness & Security (Sessions 37-48) — Hardening
16. T-05 to T-08 — Edge case testing
17. SEC-01 to SEC-05 — Security hardening
18. S-20, S-22 — Data sensitivity, audit trail
19. A-02, A-07 — Hook/control-plane bridge
20. C-02 to C-04 — CI matrix, security scanning

### Phase 6: Brain Evolution (Sessions 49-60) — Knowledge System
21. B-06 — Brain B1 comprehensive tests
22. B-07 to B-09 — Brain B2 core
23. B-10, B-11 — Brain B2 semantic
24. B-12, B-13 — Brain B3 scaffold

### Phase 7: Observability & Platform (Sessions 61-72) — Operations
25. OB-01 to OB-04 — Observability stack
26. S-15 to S-17 — Alerting, persistent store, health
27. PA-01, PA-02 — Platform adapter interface
28. M-01 to M-03 — MCP integration

### Phase 8: Governance & Autonomy (Sessions 73-84) — Intelligence
29. MG-01 to MG-04 — Meta-governance agents
30. AU-01 to AU-05 — Progressive autonomy
31. DE-01 to DE-04 — Data ecosystem

### Phase 9: Strategic & Excellence (Sessions 85-100) — Showcase
32. R-01, R-04 — OWASP, NIST alignment
33. R-02, R-03, R-05, R-06 — Compliance crosswalks
34. X-01 to X-03 — Simulation, chaos, e2e testing
35. QA-01 to QA-05 — Quality assurance system
36. RT-01 to RT-05 — Rating system
37. TV-01 to TV-05 — Thesis validation

### Phase 10: Future-Proofing (Sessions 100+) — Vision
38. IF-01 to IF-06 — Inevitable features
39. IE-01 to IE-04 — Intent engineering
40. GP-01 to GP-05 — Governance platform

---

## Cross-Stream Dependencies

```
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

# Governance dependencies
S-05 (enforcement map) ← MG-02 (Sentinel)
S-23 (Sentinel pattern) ← MG-02 (full Sentinel)
AU-01 (trust model) ← AU-03 (trust gating) ← AU-09 (trust routing)

# Security dependencies
S-20, S-21 (data sensitivity) ← B-12 (MCP server)
SEC-01 (attack corpus) ← SEC-10 (regression tests)

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
- [ ] All ~405 items across 30 streams are complete
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

- [PLAN.md](../PLAN.md) — Legacy single-file plan (preserved for reference)
- [AGENTS.md](../AGENTS.md) — Agent governance and decision authority
- [admiral/IMPLEMENTATION_STATUS.md](../admiral/IMPLEMENTATION_STATUS.md) — Spec-to-implementation tracking
- [admiral/SPEC-DEBT-NEXT-STEPS.md](../admiral/SPEC-DEBT-NEXT-STEPS.md) — Spec debt resolution
- [aiStrat/admiral/spec/index.md](../aiStrat/admiral/spec/index.md) — Spec table of contents
- [aiStrat/admiral/reference/spec-debt.md](../aiStrat/admiral/reference/spec-debt.md) — Specification debt
- [aiStrat/admiral/reference/spec-gaps.md](../aiStrat/admiral/reference/spec-gaps.md) — Specification gaps
- [research/pristine-github-repositories.md](../research/pristine-github-repositories.md) — Pristine codebase patterns
- [research/pristine-repos-gap-analysis.md](../research/pristine-repos-gap-analysis.md) — Gap analysis
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Contributor guide
