# TODO: Brain Knowledge System & Data Ecosystem

Source streams: Stream 11 (Brain B1-B3), Stream 20 (Data Ecosystem)

---

## Competitive Urgency

Brain is Admiral's primary competitive moat. Ship B2 within **120 days** before Perplexity Comet persists user-AI interaction patterns. Build B-21 (graduation metrics) concurrently with B1 completion to accelerate the B1→B2 graduation decision. Compounding value means each day of operation strengthens the moat.

---

## B1 Completion

- [x] **B-01** Automatic brain entry creation from hooks — `brain_writer.sh` library called by `prohibitions_enforcer.sh`, `loop_detector.sh`, `scope_boundary_guard.sh`
- [ ] **B-02** Brain retrieval in hooks — `brain_context_router.sh` actively queries Brain, injects matching entries as structured context on Propose/Escalate-tier calls
- [ ] **B-03** Demand signal tracking — record zero-result queries to `.brain/_demand/`, expose via `brain_audit --demand`
- [ ] **B-04** Contradiction scan on write — keyword overlap detection, warning with conflicting entry paths, non-blocking (entry still written with `contradicts` metadata)
- [ ] **B-05** Brain entry consolidation — `brain_consolidate` utility merges overlapping entries with provenance, archives originals to `.brain/_archived/`
- [ ] **B-06** Brain B1 comprehensive tests — 20+ tests covering all utilities, edge cases (empty brain, special chars, long content), concurrent access

## Brain Self-Instrumentation & Integrity

- [ ] **B-21b** Brain Stale Detection — `brain_context_router` emits BRAIN STALE advisory when last brain_query was 20+ tool calls ago; complements BRAIN BYPASS; enforces SO-05/SO-11
- [ ] **B-21c** Möbius Loop `_meta` namespace — Brain self-instrumentation recording health snapshots, knowledge gaps, query patterns, graduation assessments in reserved `_meta` project; all agents read, only Admiral/orchestrator/Brain MCP write
- [ ] **B-21d** Contradiction resolution workflow — Full resolution protocol: writing agent chooses supersede, diverge, or withdraw on conflict; retrieval returns both sides with explicit conflict flag; escalation when decisions depend on conflicting entries
- [ ] **B-21e** Decision entry schema — Formalized JSON schema for decision entries (decision, alternatives, reasoning, authority tier, agent, outcome); validated by brain_record; canonical format for causality tracing integration

## B1 Excellence

- [ ] **B-22** Brain entry versioning — supersession chain tracking, rollback support
- [ ] **B-23** Brain entry expiration — TTL-based expiration, auto-archive, pre-expiry warnings
- [ ] **B-24** Cross-project knowledge sharing — share entries across projects with permissions, provenance maintained
- [ ] **B-25** Brain usage analytics — per-entry usage tracking, analytics endpoint, gap detection, ROI
- [ ] **B-26** Brain backup and restore — automated backup with point-in-time recovery, integrity verification
- [ ] **B-27** Brain schema migration testing — test B1→B2→B3 migrations, all types covered, metadata preserved, edge cases
- [ ] **B-28** Brain entry templates — 5+ pre-defined templates for common entry types, `--template` flag, validation

## B2 SQLite Core

- [ ] **B-07** SQLite schema creation — entries, links, embeddings, demand_signals tables with versioned migration system
- [ ] **B-08** Entry migration from B1 to B2 — parse `.brain/` JSON, validate, insert into SQLite; idempotent with migration report
- [ ] **B-09** SQLite-based query interface — FTS5 full-text search, date range/category/project filters, backward-compatible CLI

## B2 Semantic Search

- [ ] **B-10** Embedding generation pipeline — pluggable backends (API or pre-computed), model version tracking, re-embedding on model change
- [ ] **B-11** Similarity search — cosine distance, `brain_query --semantic "topic"`, blend keyword and semantic signals

## B3 Production

- [ ] **B-12** MCP server scaffold — 8 tool endpoints (brain_record, brain_query, brain_retrieve, brain_strengthen, brain_supersede, brain_status, brain_audit, brain_purge)
- [ ] **B-13** Postgres + pgvector schema deployment — migrations, rollback, connection pooling
- [ ] **B-14** Identity token lifecycle — create, rotate, revoke; configurable TTL, overlapping validity window, immediate revocation
- [ ] **B-15** Access control enforcement — per-agent per-entry clearance levels (read-only, contributor, admin), write scoping by project, access decisions logged

## B3 Advanced

- [ ] **B-16** Multi-signal retrieval pipeline — keyword (FTS), semantic (pgvector), temporal (recency), link-based (graph proximity); configurable weights, query-time signal selection
- [ ] **B-17** Multi-hop link traversal — supports/contradicts/supersedes/related_to relationships, configurable depth, cycle detection, traversal path in results
- [ ] **B-18** Quarantine integration — external content passes 5-layer pipeline before brain ingestion, `quarantine_status` metadata
- [ ] **B-19** Sensitivity classification — public/internal/confidential/restricted levels, queries filter by agent clearance, bulk reclassification
- [ ] **B-20** Audit logging — append-only log of all operations, queryable by time/agent/operation/entry, configurable retention

## Graduation & Provenance

- [ ] **B-21** Graduation measurement system — hit rate (>=85%), precision (>=90%), entry count (>=50) for B1-to-B2; reuse rate (>=30%), semantic precision (>=80%) for B2-to-B3; dashboard in control plane with per-criterion pass/fail and 30-day trends
- [ ] **B-29** Provenance-aware Brain writes and queries — source_agent, source_type (direct observation / MCP-derived / A2A / handoff), source_server, confidence level; queries return provenance metadata with filtering/weighting by trust

## Knowledge Graph

- [ ] **DE-01** Knowledge graph implementation — 6 link types (supports, contradicts, supersedes, related_to, derived_from, caused_by), confidence scores, bidirectional traversal, multi-hop queries (3+ hops), integrated with `brain_query`

## Knowledge Maintenance Agents

- [ ] **DE-02** Knowledge gardener agent — staleness detection (90-day decay), contradiction surfacing, duplicate consolidation (cosine >0.95), orphan detection, metadata hygiene; Propose-tier only, structured maintenance report
- [ ] **DE-03** Knowledge curator agent — metadata enrichment, format standardization, description enhancement, link suggestion, quality scoring (0-1); produces improvement proposals with before/after comparisons
- [ ] **DE-04** Knowledge harvester agent — extract knowledge from git diffs, PR descriptions, commit messages, code review comments; source attribution, Data Sensitivity Protocol filtering

## Knowledge Operations

- [ ] **DE-05** Feedback loop: code review outcomes to Brain — accepted patterns strengthen entries, rejected patterns weaken; entries with >50% rejection rate flagged for supersession
- [ ] **DE-06** Feedback loop: test results to Brain — pass strengthens, fail weakens with failure context; new lessons proposed when test failures reveal knowledge gaps
- [ ] **DE-07** Knowledge quality metrics — freshness, accuracy proxy, usage frequency, contradiction rate, coverage, link density; periodic Brain Health Report with trends
- [ ] **DE-08** Cross-session knowledge transfer — session-end capture, session-start loading of relevant entries, repeat-failure prevention
- [ ] **DE-09** Knowledge export/import — self-contained JSON archive, filtered subsets (category/tag/date/quality), PII stripping via Data Sensitivity Protocol, merge with deduplication on import
- [ ] **DE-10** Knowledge search API — REST endpoints (search, entry, links, health, stats) in control plane; semantic search, authentication, rate limiting

---

## Dependencies

- **B1 completion (B-01 to B-06)** is prerequisite to B2 (B-07 to B-11)
- **B2 graduation** is prerequisite to B3 (B-12 to B-20)
- **B-29** (provenance) depends on B-01 (B1 completion baseline)
- **B-18** (quarantine) depends on B-12 (MCP scaffold) and Stream 21 quarantine pipeline (SD-04)
- **B-21** (graduation metrics) should be built early to measure B1 and validate B2 readiness
- **DE-01** (knowledge graph) is prerequisite to DE-02, DE-03, DE-05, DE-06, DE-07, DE-09
- **DE-10** (search API) depends on DE-07 (quality metrics)
- **DE-04** (harvester) and **DE-08** (session transfer) have no DE dependencies
- B3 internal parallelism: B-14/B-15 (identity/access) are independent of B-16/B-17 (retrieval/graph)
- B1 internal parallelism: B-03 (demand signals) and B-04 (contradiction) are independent
