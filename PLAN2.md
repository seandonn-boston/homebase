# PLAN2.md — Task Decomposition & Dependency Graph

**Last Updated:** 2026-03-16
**Tracks:** PLAN.md Phases 1-2 (complete) and Phase 3 (current)

---

## Phase 1: Specification Integrity — Task Decomposition [COMPLETE]

### 1.1 Version Consistency [COMPLETE]
- [x] Sync `aiStrat/VERSION` → v0.10.0-alpha <!-- no-version-sync -->
- [x] Update `aiStrat/admiral/spec/index.md` line 5 → v0.10.0-alpha <!-- no-version-sync -->
- [x] Update `AGENTS.md` line 39 → v0.10.0-alpha <!-- no-version-sync -->
- [x] Sync PLAN.md, PLAN2.md, sales-pitch version references
- [ ] Add version cross-check to `spec-validation.yml` CI workflow

### 1.2 Ground Truth References [COMPLETE]
- [x] Create `PLAN.md` with phases, milestones, exit criteria
- [x] Create `PLAN2.md` with task decomposition

### 1.3 Enforcement Language Refinement [COMPLETE]
- [x] Read `aiStrat/admiral/spec/part3-enforcement.md` fully
- [x] Add "Enforcement vs. Monitoring" distinction (Part 3 now defines enforcement spectrum with monitoring/enforcement axis)
- [x] Hooks tagged by function: Enforcement hooks (exit 2 = hard block) vs. Monitoring hooks (exit 0 = advisory)
- [x] Verify no other spec sections contradict the new language

### 1.4 Standing Orders Classification [COMPLETE]
- [x] Read `aiStrat/admiral/spec/part11-protocols.md` fully
- [x] Classify each SO: `Mechanical | Judgment-Assisted | Advisory`
- [x] Update `standing-orders-enforcement-map.md` to reflect classification

### 1.5 Empirical Claims Qualification [COMPLETE]
- [x] Sales pitch has Sources & Data Provenance table with scope and caveats
- [x] PLAN.md cites sources (Deloitte, Gartner with dates)
- [x] Benchmarks updated with informed-estimate qualification

### 1.6 Research-to-Spec Pipeline [COMPLETE]
- [x] Create `research-to-spec-pipeline.md` formalizing incorporation process
- [x] Incorporate R-01 (AI Work OS reframe) — positioning updated
- [x] Incorporate R-02 (Engineering ladder mapping) — reference material documented
- [x] Incorporate R-03 (Certification process) — tiers and pricing defined

---

## Phase 2: Fortune 500 Adoption Simulation — Task Decomposition [COMPLETE]

### 2.1 Directory Structure & Data Model [COMPLETE]
- [x] Create `research/adoption-sim/` directory tree
- [x] Define `fortune500.json` schema
- [x] Define `scenario-definitions.json` schema
- [x] Define `sectors.json` schema
- [x] Define `weights.json` scoring configuration
- [x] Write `README.md` explaining the simulation

### 2.2 Data Collection — Top 100 Companies [COMPLETE]
- [x] Get Fortune 500 list (2025) with revenue and sector
- [x] Map to GICS sector classifications
- [x] Extract from 2025 10-K/Q4 earnings for top 100 by revenue
- [x] Source all data from public filings (SEC EDGAR, earnings transcripts)
- [x] Record data_source and data_date for each entry

### 2.3 Scenario Engine [COMPLETE]
- [x] Define 7 core scenarios
- [x] Implement scoring engine: `score.sh`
- [x] Apply 8-factor weighted scoring model
- [x] Apply walk-away factor deductions
- [x] Generate per-company score reports

### 2.4 Sector Analysis [COMPLETE]
- [x] Aggregate company scores by GICS sector
- [x] Generate sector-level adoption likelihood table
- [x] Write `sector-summary.md` report

### 2.5 Prospect Rankings [COMPLETE]
- [x] Rank all scored companies by adoption likelihood
- [x] Write `top-prospects.md` report

### 2.6 Walk-Away Analysis [COMPLETE]
- [x] Model primary walk-away scenario for top 50
- [x] Classify walk-away factors: structural vs. temporal
- [x] Write `deal-walkaway-analysis.md` report

### 2.7 Trend Infrastructure [COMPLETE]
- [x] Create snapshot system (`snapshot.sh`)
- [x] Build diff tool (`diff.sh`)
- [x] Create monitoring pipeline (`monitor.sh`)
- [x] Create report generation (`generate-reports.sh`)

---

## Phase 3: Reference Implementation Wedge — Task Decomposition [CURRENT]

### 3.1 Hooks → Control Plane Connection
- [ ] Modify `.hooks/post_tool_use_adapter.sh` to emit structured events to `.admiral/event_log.jsonl`
- [ ] Add JSONL ingestion to `control-plane/src/server.ts`
- [ ] Verify event flow: hook fires → event logged → control plane ingests → dashboard renders

### 3.2 Dashboard Renders Real Data
- [ ] Connect `control-plane/src/dashboard/index.html` to live event stream
- [ ] Display: session state, token budget utilization, hook fire counts, alerts

### 3.3 Brain B1 Round-Trip
- [ ] Verify `admiral/bin/brain_record`, `brain_query`, `brain_retrieve` end-to-end
- [ ] Write integration test: record → query → retrieve → verify content
- [ ] Document round-trip in `admiral/examples/brain-b1-walkthrough.md`

### 3.4 Starter Agent Configs
- [ ] Create `.claude/agents/` directory
- [ ] Create 5 agent configs following `fleet/prompt-anatomy.md`
- [ ] Include at minimum: Orchestrator, Backend Implementer, QA Agent

### 3.5 Traced Multi-Agent Session
- [ ] Run real multi-agent session with hooks, brain, and control plane active
- [ ] Capture full execution trace
- [ ] Document in `admiral/examples/`

---

## Dependency Graph

```
Phase 1 ─────────────────────────────────────────── COMPLETE
Phase 2 ─────────────────────────────────────────── COMPLETE

3.1 Hooks→CP Connection ──→ 3.2 Dashboard Real Data
3.3 Brain B1 Round-Trip  ──→ 3.5 Traced Multi-Agent Session
3.4 Starter Agent Configs ──→ 3.5 Traced Multi-Agent Session

3.1 + 3.3 + 3.4 ──→ 3.5 Traced Multi-Agent Session
```

---

## Notes

- Phase 1 tasks modified `aiStrat/` files — required explicit approval per AGENTS.md Decision Authority
- Phase 2 created new files under `research/adoption-sim/` — Autonomous tier (new analysis, low risk)
- Phase 3 creates implementation code in `admiral/`, `control-plane/`, `.hooks/`, `.claude/agents/` — Autonomous tier for implementation code
- Remaining open item from 1.1: version cross-check in CI workflow (deferred to Phase 3 infrastructure work)
