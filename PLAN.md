# PLAN.md — Admiral Framework Implementation Plan

**Version:** v0.7.0-alpha
**Last Updated:** 2026-03-15
**Status:** Phase 1 Active

---

## Current Phase: Specification Hardening + Market Validation

### Phase 1: Specification Integrity (Current — Weeks 1-4)

**Objective:** Resolve all internal contradictions, close the research-to-spec pipeline, and establish the codebase as internally consistent.

| Milestone | Status | Exit Criteria |
|---|---|---|
| Version consistency across all files | Complete | VERSION, index.md, AGENTS.md all say v0.7.0-alpha |
| Ground truth references valid | Complete | PLAN.md and PLAN2.md exist and are current |
| Enforcement language refined | Not Started | Part 3 distinguishes enforcement vs. monitoring |
| Standing Orders classified by mechanism | Not Started | Each SO marked Mechanical / Judgment-Assisted / Advisory |
| Empirical claims qualified | Not Started | All data claims cite source and scope |
| Research-to-spec pipeline closed | Not Started | OS reframe, engineering ladder mapping, certification process defined |

### Phase 2: Market Validation via Simulation (Weeks 2-8)

**Objective:** Build a Fortune 500 adoption simulation using confirmed 2025 financial data. Test the thesis against real company profiles at scale.

| Milestone | Status | Exit Criteria |
|---|---|---|
| Top 100 company profiles built | Not Started | fortune500.json with confirmed data from 10-K/earnings |
| 7 core scenarios defined | Not Started | scenario-definitions.json with parameterized templates |
| Scoring engine operational | Not Started | Takes (company, scenario) → adoption score (0-100) |
| Sector-level analysis complete | Not Started | Per-sector adoption likelihood with evidence |
| Walk-away analysis for top 50 | Not Started | Each prospect has documented walk-away scenario |
| Trend monitoring infrastructure | Not Started | Snapshot system, diff tool, quarterly cadence |

### Phase 3: Reference Implementation Wedge (Weeks 4-12)

**Objective:** Wire hooks to control plane, prove single-agent observability, demonstrate the wedge.

| Milestone | Status | Exit Criteria |
|---|---|---|
| Hooks → control plane connected | Not Started | Event log ingested by control plane |
| Dashboard renders real data | Not Started | Session state, budget, hooks, alerts visible |
| Brain B1 round-trip tested | Not Started | Record → query → retrieve verified |
| 5 starter agent configs created | Not Started | .claude/agents/*.md following prompt-anatomy |
| Traced multi-agent session documented | Not Started | Full session trace in admiral/examples/ |

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

Admiral is positioned as the operational infrastructure for AI agent workforces. The market is early but forming: $8.5B autonomous AI agent market (2026), projected $35-45B by 2030. The governance gap identified in the spec is real and unfilled.

The plan sequences: specification integrity first (credibility), market validation second (evidence), reference implementation third (proof), IP protection in parallel (defense), commercialization as the thesis proves out (revenue).

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
