# PLAN2.md — Task Decomposition & Dependency Graph

**Version:** v0.7.0-alpha
**Last Updated:** 2026-03-15
**Tracks:** PLAN.md Phase 1-2 (current active phases)

---

## Phase 1: Specification Integrity — Task Decomposition

### 1.1 Version Consistency [COMPLETE]
- [x] Sync `aiStrat/VERSION` → v0.7.0-alpha
- [x] Update `aiStrat/admiral/spec/index.md` line 5 → v0.7.0-alpha
- [x] Update `AGENTS.md` line 37 → v0.7.0-alpha
- [ ] Add version cross-check to `spec-validation.yml` CI workflow

### 1.2 Ground Truth References [COMPLETE]
- [x] Create `PLAN.md` with phases, milestones, exit criteria
- [x] Create `PLAN2.md` with task decomposition

### 1.3 Enforcement Language Refinement
- [ ] Read `aiStrat/admiral/spec/part3-enforcement.md` fully
- [ ] Add subsection "Enforcement vs. Monitoring" defining:
  - Enforcement = prevents execution (hook exit != 0)
  - Monitoring = detects and reports (hook exit = 0, advisory)
  - Current state = all hooks are monitoring
  - Why sufficient = hard-blocking causes deadlocks in current runtimes
- [ ] Update enforcement spectrum diagram to show monitoring-vs-enforcement axis
- [ ] Verify no other spec sections contradict the new language

### 1.4 Standing Orders Classification
- [ ] Read `aiStrat/admiral/spec/part11-protocols.md` fully
- [ ] Classify each SO: `Mechanical | Judgment-Assisted | Advisory`
- [ ] Add enforcement mechanism column to Standing Orders table
- [ ] Update `standing-orders-enforcement-map.md` to reflect classification

### 1.5 Empirical Claims Qualification
- [ ] Audit `thesis/ai-fundamental-truths.md` for unqualified claims
- [ ] Audit `aiStrat/admiral/spec/part1-strategy.md` for unqualified claims
- [ ] Add source scope notes (e.g., "GitHub-hosted code" vs. "all code")
- [ ] Distinguish "data shows X" from "we project X based on Y"

### 1.6 Research-to-Spec Pipeline
- [ ] Integrate "AI Work OS" framing into `index.md` introduction
- [ ] Map 9-rung engineering ladder to 5-profile scaling matrix
- [ ] Add "Why Admiral" competitive differentiation section
- [ ] Create `certification-process.md` extension
- [ ] Integrate 5 systems-thinking lenses into Part 1

---

## Phase 2: Fortune 500 Adoption Simulation — Task Decomposition

### 2.1 Directory Structure & Data Model
- [ ] Create `research/adoption-sim/` directory tree
- [ ] Define `fortune500.json` schema
- [ ] Define `scenario-definitions.json` schema
- [ ] Define `sectors.json` schema
- [ ] Define `weights.json` scoring configuration
- [ ] Write `README.md` explaining the simulation

### 2.2 Data Collection — Top 100 Companies
- [ ] Get Fortune 500 list (2025) with revenue and sector
- [ ] Map to GICS sector classifications
- [ ] For top 100 by revenue, extract from 2025 10-K/Q4 earnings:
  - AI capex mentions and amounts
  - AI/agent tooling references
  - Cloud provider signals
  - Governance posture indicators
  - Engineering headcount estimates
  - Tech spend as % of revenue
- [ ] Source all data from public filings (SEC EDGAR, earnings transcripts)
- [ ] Record data_source and data_date for each entry

### 2.3 Scenario Engine
- [ ] Define 7 core scenarios (Baseline, Regulatory Trigger, Agent Explosion, Budget Crunch, Competitor Capture, Incident Catalyst, Walk-Away)
- [ ] Implement scoring engine: (company_profile, scenario) → score (0-100)
- [ ] Apply 8-factor weighted scoring model
- [ ] Apply walk-away factor deductions
- [ ] Generate per-company score reports

### 2.4 Sector Analysis
- [ ] Aggregate company scores by GICS sector
- [ ] Generate sector-level adoption likelihood table
- [ ] Identify top 3 sectors and bottom 3 sectors
- [ ] Write sector-summary.md report

### 2.5 Prospect Rankings
- [ ] Rank all scored companies by adoption likelihood
- [ ] Identify top 20 prospects with rationale
- [ ] Identify bottom 20 (most likely walk-aways) with rationale
- [ ] Write top-prospects.md report

### 2.6 Walk-Away Analysis
- [ ] For each top-50 prospect, model primary walk-away scenario
- [ ] Classify walk-away factors: structural vs. temporal
- [ ] Identify which factors Admiral can address vs. cannot
- [ ] Write deal-walkaway-analysis.md report

### 2.7 Trend Infrastructure
- [ ] Create snapshot system (timestamped result saves)
- [ ] Build diff tool comparing two snapshots
- [ ] Define alert thresholds (sector ±10, company ±15, walk-away >30%)
- [ ] Create quarterly evaluation template

---

## Dependency Graph

```
1.1 Version Fix ──────────────────────┐
1.2 Ground Truth ─────────────────────┤
                                      ├──→ Phase 1 Complete
1.3 Enforcement Language ─────────────┤
1.4 Standing Orders Classification ───┤
1.5 Empirical Claims ────────────────┤
1.6 Research-to-Spec ────────────────┘

2.1 Directory Structure ──→ 2.2 Data Collection ──→ 2.3 Scenario Engine ──→ 2.4 Sector Analysis
                                                                          ──→ 2.5 Prospect Rankings
                                                                          ──→ 2.6 Walk-Away Analysis
                                                     2.3 + 2.4 + 2.5 ────→ 2.7 Trend Infrastructure

Phase 1 and Phase 2 run in parallel (no dependencies between them)
```

---

## Notes

- Phase 1 tasks modify `aiStrat/` files — requires explicit approval per AGENTS.md Decision Authority
- Phase 2 creates new files under `research/adoption-sim/` — Autonomous tier (new analysis, low risk)
- All Phase 2 data must be from confirmed 2025 sources, no predictions or projections
