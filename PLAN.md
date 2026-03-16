# PLAN.md — Admiral Framework Implementation Plan

**Last Updated:** 2026-03-16
**Status:** Phase 1 Complete

---

## Current Phase: Reference Implementation Wedge

### Phase 1: Specification Integrity (Complete — Weeks 1-4)

**Objective:** Resolve all internal contradictions, close the research-to-spec pipeline, and establish the codebase as internally consistent.

| Milestone | Status | Exit Criteria |
|---|---|---|
| Version consistency across all files | Complete | Single source of truth in `aiStrat/VERSION`; CI propagates to index.md, AGENTS.md, README.md, appendices.md. No version strings in non-CI-managed files. |
| Ground truth references valid | Complete | PLAN.md and PLAN2.md exist and are current |
| Enforcement language refined | Complete | Part 3 distinguishes enforcement vs. monitoring; hooks tagged by function (Enforcement/Monitoring) |
| Standing Orders classified by mechanism | Complete | Each SO classified as Mechanical / Judgment-Assisted / Advisory in enforcement map |
| Empirical claims qualified | Complete | Sales pitch has Sources & Data Provenance table; PLAN.md cites sources; benchmarks updated |
| Research-to-spec pipeline closed | Complete | `research-to-spec-pipeline.md` formalizes OS reframe (R-01), engineering ladder mapping (R-02), certification process (R-03) |

### Phase 2: Market Validation via Simulation (Complete — Weeks 2-8)

**Objective:** Build a Fortune 500 adoption simulation using confirmed 2025 financial data. Test the thesis against real company profiles at scale.

| Milestone | Status | Exit Criteria |
|---|---|---|
| Top 100 company profiles built | Complete | fortune500.json: 100 companies with confirmed FY2025 10-K/earnings data, 8 pre-scored factors each |
| 7 core scenarios defined | Complete | scenario-definitions.json: Baseline, Regulatory, Agent Explosion, Budget Crunch, Competitor Capture, Incident Catalyst, Walk-Away |
| Scoring engine operational | Complete | score.sh: 100 companies × 7 scenarios = 700 scored results with tier classification |
| Sector-level analysis complete | Complete | 10 sectors ranked per scenario; Utilities, Health Care, Energy lead; IT lowest (build-internally penalty) |
| Walk-away analysis for top 50 | Complete | deal-walkaway-analysis.md: structural vs. temporal walk-aways, cross-scenario comparison, factor distribution |
| Trend monitoring infrastructure | Complete | monitor.sh: quarterly/monthly re-score pipeline with snapshot.sh, diff.sh, and alert generation |

### Phase 3: Reference Implementation Wedge (Current — Weeks 4-12)

**Objective:** Wire hooks to control plane, prove single-agent observability, demonstrate the wedge.

| Milestone | Status | Exit Criteria |
|---|---|---|
| Hooks → control plane connected | Not Started | Event log ingested by control plane |
| Dashboard renders real data | Not Started | Session state, budget, hooks, alerts visible |
| Brain B1 round-trip tested | Not Started | Record → query → retrieve verified |
| 5 starter agent configs created | Not Started | .claude/agents/*.md following prompt-anatomy |
| Traced multi-agent session documented | Not Started | Full session trace in admiral/examples/ |
| SDLC-in-CI loop operational | Not Started | Issue label triggers autonomous implement→review→revise cycle with circuit breakers; see `admiral/sdlc/` |

### Phase 4: IP Protection (Months 1-6)

**Objective:** File provisional patents on core innovations, begin trademark process.

| Milestone | Status | Exit Criteria |
|---|---|---|
| Invention dates documented | Not Started | Git history extracted for all 23 opportunities |
| Provisional #1 filed (Enforcement Spectrum) | Not Started | Filed with patent counsel |
| Provisional #2 filed (Brain Architecture) | Not Started | Filed with patent counsel |
| Provisional #3 filed (Intent Engineering or Agent Identity) | Not Started | Filed with patent counsel |
| Trademark applications filed | Not Started | "Admiral Framework" and "Intent Engineering" |

### Phase 5: Commercialization (Months 3-12)

**Objective:** Begin generating revenue through consulting, certification, and ecosystem licensing.

| Milestone | Status | Exit Criteria |
|---|---|---|
| Entity incorporated (LLC/C-corp) | Not Started | Legal entity exists for SBIR/patent purposes |
| NSF SBIR Phase I application submitted | Not Started | Application complete and submitted |
| Cloud credits obtained (Google/AWS) | Not Started | Credits active |
| Practitioner certification beta launched | Not Started | Exam outline defined, beta cohort identified |
| First paying consulting engagement | Not Started | Revenue generated |

---

## Strategic Context

Admiral is positioned as the operational infrastructure for AI agent workforces. The market is early but forming: $8.5B autonomous AI agent market in 2026, projected $35-45B by 2030 (Deloitte, "AI Agents and Multiagent Systems," 2025). The governance gap identified in the spec is real and unfilled — Gartner predicts 40% of agentic AI deployments will be canceled by 2027 due to costs, unclear value, or poor risk controls ("Predicts 2025: AI Agents," October 2025).

The plan sequences: specification integrity first (credibility), market validation second (evidence), reference implementation third (proof), IP protection in parallel (defense), commercialization as the thesis proves out (revenue).

> **Data provenance:** Market claims in this document are sourced from analyst reports current as of March 2026. Full source table with scope and caveats: `aiStrat/sales-pitch-30min-guide.md`, Sources & Data Provenance section.

---

## Decision Authority for Plan Changes

| Change Type | Tier |
|---|---|
| Task reprioritization within a phase | Autonomous |
| Adding tasks to a phase | Autonomous |
| Removing or deferring a milestone | Propose |
| Adding a new phase | Propose |
| Changing phase sequencing | Escalate |
| Changing strategic direction | Escalate |
