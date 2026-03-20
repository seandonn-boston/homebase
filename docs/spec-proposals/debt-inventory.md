# Spec Debt Inventory

> **SD-01 deliverable.** Comprehensive inventory of all spec debt items with affected sections, gap nature, downstream impact, and resolution paths.
>
> **Sources:** `aiStrat/admiral/reference/spec-debt.md`, `aiStrat/admiral/reference/spec-gaps.md`, `admiral/IMPLEMENTATION_STATUS.md`, implementation audit.
>
> **Last updated:** 2026-03-20

---

## Summary

| Category | Active | Resolved | Total |
|----------|--------|----------|-------|
| Spec Debt (aspirational claims) | 2 | 3 | 5 |
| Spec Gaps (vague behavioral claims) | 0 | 14 | 14 |
| Implementation Gaps (spec defined, not built) | 12 | — | 12 |
| **Total active items** | **14** | **17** | **31** |

---

## Active Spec Debt (from spec-debt.md)

### DEBT-01: Benchmark Targets Lack Empirical Basis

- **Spec ref:** `benchmarks.md`
- **Severity:** Moderate
- **Nature:** Unvalidated claim — targets (First-pass quality >75%, Auto-recovery >80%) are informed estimates with no empirical data.
- **Downstream impact:** Streams 32 (Rating System), 33 (Thesis Validation) build on these targets. Invalid targets mean invalid scoring.
- **Resolution path:** Run end-to-end validation on a real project. Populate benchmarks with actual measurements. Adjust targets if reality diverges. **Blocked until:** fleet is operational enough to produce measurements.
- **Classification:** Constraining — implementation can proceed with estimated targets, but ratings may need recalibration.

### DEBT-02: Data Ecosystem (Part 12) Is Thin

- **Spec ref:** `part12-data-ecosystem.md`
- **Severity:** Low
- **Nature:** Conceptual spec without reference implementations — 6 feedback loops, 7 datasets, 5 ecosystem agents defined but none implemented.
- **Downstream impact:** Stream 20 (Data Ecosystem) has no reference implementation to build against. Design decisions are unguided.
- **Resolution path:** Continue deepening with worked examples. Validate at least one feedback loop end-to-end during real-world deployment.
- **Classification:** Constraining — implementation can invent patterns, but may diverge from spec intent.

### DEBT-03: SO-16 Protocol Governance Lacks Hook Enforcement

- **Spec ref:** `spec-debt.md` SD-06, SO-16
- **Severity:** Low
- **Nature:** Standing Order with zero enforcement — compliance is advisory only.
- **Downstream impact:** Stream 7 (Hooks & Fleet), Stream 29 (Standing Orders Implementation). MCP server calls are ungoverned.
- **Resolution path:** Implement `protocol_registry_guard` PreToolUse hook that validates MCP server calls against an approved server list. Hook manifest already exists in `aiStrat/hooks/`.
- **Classification:** Constraining — other hooks work without this, but MCP integration (Stream 16) will need it.

---

## Resolved Spec Debt (historical record)

| ID | Title | Resolved | Resolution |
|----|-------|----------|------------|
| SD-01 (spec) | Hook Coverage vs. Enforcement Spectrum | 2026-03-15 | Increased from 4/15 to 8/15 hooks enforced |
| SD-03 (spec) | Fleet Catalog Without Validation | 2026-03-16 | Updated language to "production patterns observed" |
| SD-04 (spec) | Monitor Layers 3-5 Unimplemented | 2026-03-16 | Reference implementations + 39 tests |

---

## Resolved Spec Gaps (all 14 — historical record)

All 14 vague behavioral claims resolved in v0.8.1-alpha with concrete thresholds added to source spec files and mirrored in `reference-constants.md`. See `spec-gaps.md` for full history.

---

## Implementation Gaps (spec defined, not built)

These are areas where the spec is clear but the implementation doesn't exist yet. Identified by cross-referencing `IMPLEMENTATION_STATUS.md` against the spec.

### IMPL-01: Missing Hooks (4 of 15 spec-defined)

- **Spec ref:** Part 3 — Deterministic Enforcement; `aiStrat/hooks/` manifests
- **Nature:** Hook manifests exist in spec but no implementation in `.hooks/`.
- **Missing hooks:**
  - `identity_validation` — SessionStart; validates agent identity is established
  - `tier_validation` — SessionStart; validates decision authority tiers are loaded
  - `governance_heartbeat_monitor` — Periodic; confirms governance is alive
  - `protocol_registry_guard` — PreToolUse; validates MCP/protocol calls against approved list
- **Downstream impact:** Streams 7, 29. Cannot reach 100% hook coverage (Part 3 completion sprint target).
- **Classification:** Blocking for Part 3 completion.

### IMPL-02: Fleet Orchestration Runtime

- **Spec ref:** Parts 3, 5 (Fleet Composition, Execution Patterns)
- **Nature:** 71 agent roles defined in spec, zero runtime orchestration code.
- **Missing:** Agent registry, task routing engine, handoff protocol, parallel coordination, escalation pipeline.
- **Downstream impact:** Streams 7, 8, 14, 15. All fleet-related work blocked.
- **Classification:** Blocking for Streams 14, 15.

### IMPL-03: Brain B2/B3 Levels

- **Spec ref:** Part 5 — Brain Architecture
- **Nature:** B1 partial (brain_query, brain_record exist). B2 (SQLite+FTS5) and B3 (Postgres+pgvector) not started.
- **Downstream impact:** Streams 11, 16, 20. Knowledge system cannot scale beyond session-level JSON files.
- **Classification:** Blocking for Streams 11 (B2/B3 phase), 20.

### IMPL-04: Execution Patterns

- **Spec ref:** Part 5 — Execution Patterns
- **Nature:** Spec defines parallelism, handoff, escalation patterns. No runtime exists.
- **Downstream impact:** Stream 8. Multi-agent coordination impossible.
- **Classification:** Blocking for Stream 8.

### IMPL-05: SDLC Quality Gates

- **Spec ref:** Part 6 — Quality Assurance
- **Nature:** SPC-based anomaly detection exists (runaway-detector.ts) but no automated review, test generation, or coverage tracking integrated into the SDLC.
- **Downstream impact:** Streams 31, 32.
- **Classification:** Constraining — manual quality gates work but don't scale.

### IMPL-06: Alerting Pipeline

- **Spec ref:** Part 7 — Operations
- **Nature:** HTTP API and event ingestion exist. No push alerts to external systems.
- **Downstream impact:** Stream 25 (Observability).
- **Classification:** Constraining.

### IMPL-07: Cross-Platform Adapters

- **Spec ref:** Part 8 — Platform Integration
- **Nature:** Only Claude Code hooks implemented. No Cursor, Windsurf, API-direct, or headless agent adapters.
- **Downstream impact:** Stream 17.
- **Classification:** Constraining — Claude Code works, but platform portability thesis unproven.

### IMPL-08: Meta-Agent Governance

- **Spec ref:** Part 10 — Meta-Agent Governance
- **Nature:** No agent-governing-agents infrastructure. Sentinel, Arbiter, Compliance Monitor not implemented.
- **Downstream impact:** Stream 19.
- **Classification:** Constraining — governance works without meta-agents but requires human oversight.

### IMPL-09: Cross-Agent Protocol

- **Spec ref:** Part 11 — Universal Protocols
- **Nature:** Session state management exists (state.sh). No cross-agent communication protocol.
- **Downstream impact:** Streams 10, 15.
- **Classification:** Blocking for multi-agent work.

### IMPL-10: Long-Term Analytics

- **Spec ref:** Part 12 — Data Ecosystem
- **Nature:** Event stream and JSONL journal exist. No long-term analytics, no feedback loops.
- **Downstream impact:** Stream 20, 33.
- **Classification:** Constraining.

### IMPL-11: Strategy Triangle Tooling (NOW RESOLVED)

- **Spec ref:** Part 1 — Strategy Triangle
- **Nature:** ~~No Ground Truth templates, readiness assessment, or deployment gates.~~
- **Resolution:** Implemented in ST-01 through ST-08. See `plan/todo/01-strategy-foundation.md`.
- **Classification:** Resolved.

### IMPL-12: Standing Orders Enforcement Completeness

- **Spec ref:** Part 11 — Standing Orders; enforcement map
- **Nature:** 8/16 SOs have hook enforcement (50%). 8 are advisory-only. SO-14 (Compliance, Ethics, Legal) is safety-tier with zero enforcement.
- **Downstream impact:** Streams 29, 7.
- **Classification:** Constraining — existing enforcement works but coverage is below E3 target of 12/16.

---

## Underspecified Areas (spec gaps requiring amendment proposals)

These are areas where the spec itself needs clarification before implementation can proceed confidently.

### UNDERSPEC-01: Fleet Orchestration Protocol Details

- **Spec ref:** Parts 4, 6, 8
- **Nature:** Orchestrator role defined but protocol underspecified — agent selection, unavailability handling, task assignment format, dependency tracking, context management.
- **Downstream impact:** Streams 14, 15 cannot implement routing without protocol clarity.
- **Classification:** Blocking — needs SD-10 amendment proposal.

### UNDERSPEC-02: Brain Graduation Automation

- **Spec ref:** Part 5 — Brain Architecture
- **Nature:** Advancement criteria defined but process unspecified — who initiates, reversibility, migration process, availability during migration, dry-run mode.
- **Downstream impact:** Stream 11 (B2/B3 phase) needs clarity before implementing graduation.
- **Classification:** Constraining — B1 work proceeds, B2 graduation blocked. Needs SD-11 amendment proposal.

### UNDERSPEC-03: Cross-Platform Hook Normalization

- **Spec ref:** Parts 3, 8
- **Nature:** Hooks defined for one platform (Claude Code). No canonical hook interface, no payload normalization, no platform compatibility matrix.
- **Downstream impact:** Stream 17 (Platform Adapters) cannot design adapter interface.
- **Classification:** Constraining — Claude Code works, other adapters need spec. Needs SD-12 amendment proposal.

---

## Cross-Reference to Plan Streams

| Debt Item | Affected Streams | Classification |
|-----------|-----------------|----------------|
| DEBT-01 (benchmarks) | 32, 33 | Constraining |
| DEBT-02 (data ecosystem) | 20 | Constraining |
| DEBT-03 (SO-16 enforcement) | 7, 16, 29 | Constraining |
| IMPL-01 (missing hooks) | 7, 29 | Blocking |
| IMPL-02 (fleet orchestration) | 7, 8, 14, 15 | Blocking |
| IMPL-03 (Brain B2/B3) | 11, 16, 20 | Blocking (for B2+ work) |
| IMPL-04 (execution patterns) | 8 | Blocking |
| IMPL-05 (SDLC gates) | 31, 32 | Constraining |
| IMPL-06 (alerting) | 25 | Constraining |
| IMPL-07 (adapters) | 17 | Constraining |
| IMPL-08 (meta-governance) | 19 | Constraining |
| IMPL-09 (cross-agent protocol) | 10, 15 | Blocking |
| IMPL-10 (analytics) | 20, 33 | Constraining |
| IMPL-12 (SO enforcement) | 7, 29 | Constraining |
| UNDERSPEC-01 (fleet protocol) | 14, 15 | Blocking |
| UNDERSPEC-02 (brain graduation) | 11 | Constraining |
| UNDERSPEC-03 (cross-platform hooks) | 17 | Constraining |
