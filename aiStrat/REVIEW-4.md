<!-- Admiral Framework v0.2.0-alpha -->
# Admiral Framework v0.2.0-alpha — Fourth-Pass Review: Cross-System Integrity Audit

**Reviewer:** Claude Opus 4.6
**Date:** 2026-03-10
**Scope:** Cross-file consistency, spec-implementation alignment, broken promises, and MANIFEST accuracy across all 69 files in aiStrat/*
**Method:** Seven independent audit passes from different angles (MANIFEST accuracy, structural formatting, file completeness, description quality, cross-file consistency, broken promises, spec-implementation gaps)

---

## Summary

This review goes beyond individual file quality (covered by REVIEW through REVIEW-3) to examine whether the **system of files agrees with itself**. Prior reviews evaluated files in isolation. This review evaluates the framework as an integrated specification.

**Issues found:** 31 total (10 fixed in this session, 21 remaining)
**Files modified:** 12 files across 3 commits

---

## Issues Fixed in This Session

### Commit 1: MANIFEST Description Accuracy

| # | File | Fix |
|---|---|---|
| 1 | `MANIFEST.md` | Fixed `interface-contracts.md` line count: 475 → 479 |
| 2 | `MANIFEST.md` | Fixed `routing-rules.md` task type count: ~80 → ~67 |
| 3 | `MANIFEST.md` | Fixed `index.md` glossary term count: ~90 → ~97 |
| 4 | `MANIFEST.md` | Fixed ToC section count: "41 sections" → "41 sections + 2 sub-sections" |
| 5 | `MANIFEST.md` | Removed empty/stray code block between part11 and intent-engineering entries |
| 6 | `MANIFEST.md` | Added missing API Resilience/Degradation section to `model-tiers.md` description |
| 7 | `MANIFEST.md` | Added missing 3rd multi-model pattern to `model-tiers.md` description |
| 8 | `MANIFEST.md` | Added missing 5th graduation criterion to `brain/level2-spec.md` description |
| 9 | `MANIFEST.md` | Clarified ranking signal rationale scope in `brain/README.md` description |
| 10 | `admiral/index.md` | Added `brain_purge` to Knowledge Protocol glossary entry (was listing 7 of 8 MCP tools) |

### Commit 2: Cross-File Consistency and Spec-Implementation Gaps

| # | File | Fix |
|---|---|---|
| 1 | `admiral/part4-fleet.md` | Fixed stale "67" agent count → "71" (line 52) |
| 2 | `admiral/part4-fleet.md` | Clarified "71 (67 specialists + 4 command)" to prevent misreading as 75 |
| 3 | `admiral/part4-fleet.md` | Renamed phantom "Design Agent" → "Design Systems Agent" |
| 4 | `fleet/interface-contracts.md` | Renamed "Design Agent" → "Design Systems Agent" in handoff contract |
| 5 | `admiral/part11-protocols.md` | Renamed "Design Agent" → "Design Systems Agent" in protocol reference |
| 6 | `fleet/agents/engineering/frontend/agents.md` | Renamed "Design Agent" → "Design Systems Agent" in constraint |
| 7 | `CAPITALIZATION-PLAN.md` | Fixed governance minimum from 2 agents to 3 (added Loop Breaker) |
| 8 | `brain/schema/001_initial.sql` | Added `purge_regulation` column (brain_purge contract promised storage but schema lacked it) |
| 9 | `brain/README.md` | Documented 5 implicit fields on brain_record derived from identity token |
| 10 | `CLAUDE.md` | Clarified that `.claude/` subdirectories are created on demand, not pre-existing |

---

## Remaining Issues (Unfixed)

### Priority 1 — Trivial Fixes (wording/documentation)

#### R4-01: "Context Strategy" shorthand is ambiguous
- **Files:** `admiral/part7-quality.md` lines 103, 109, 110, 124
- **Issue:** Uses "Context Strategy (06)" as shorthand, but Section 06 is titled "Context Window Strategy." Since Section 04 is "Context Engineering," the shorthand "Context Strategy" is ambiguous.
- **Fix:** Replace "Context Strategy (06)" with "Context Window Strategy (06)" in all 3-4 instances.

#### R4-02: `brain_audit` return contract omits available columns
- **File:** `brain/README.md` line 117
- **Issue:** Return format shows `{ timestamp, agent_id, operation, project, entry_ids, result, risk_flags }` but omits `session_id`, `ip_or_source`, and `details` which are in the schema.
- **Fix:** Add the missing fields to the return contract.

#### R4-03: Core Fleet table doesn't indicate Level 3 governance additions
- **File:** `admiral/part4-fleet.md` lines 38-50
- **Issue:** The Core Fleet lists 11 agents in a flat table. Agents 9-11 (Token Budgeter, Hallucination Auditor, Loop Breaker) are governance agents that `index.md` says are not required until Level 3. The table should annotate this.
- **Fix:** Add a note below the table: "Agents 9-11 are governance additions for Level 3+. At Level 2, deploy agents 1-8 only."

#### R4-04: Scale/Extended agents unrepresented in routing-rules.md
- **File:** `fleet/routing-rules.md`
- **Issue:** 12 Scale agents and 17 Extended Scale agents are defined but have zero routing entries. No explanation is given for their absence.
- **Fix:** Add a note in routing-rules.md: "Scale and Extended Scale agents are advisory/analytical and are invoked by the Orchestrator on demand rather than routed by task type."

### Priority 2 — Moderate Fixes (spec alignment)

#### R4-05: Level 2 spec missing columns present in Level 3 schema
- **File:** `brain/level2-spec.md`
- **Issue:** The Level 2 SQLite schema lacks `last_accessed_at` (needed for decay awareness), and the Level 2 `audit_log` lacks `session_id`, `entry_ids`, `risk_flags`, and `ip_or_source` (present in Level 3 Postgres schema). No L2→L3 audit_log migration path is documented.
- **Fix:** Add missing columns to L2 spec. Add migration notes for audit_log data.

#### R4-06: `sensitivity` not settable via any MCP tool
- **File:** `brain/README.md` (brain_record contract)
- **Issue:** The schema has `sensitivity` (standard/elevated/restricted) and README describes sensitivity classification "at write time," but the brain_record contract has no `sensitivity` parameter. It was documented as an implicit field derived from the identity token, but this means callers cannot explicitly classify entries.
- **Fix:** Consider adding `sensitivity` as an optional parameter to brain_record (defaults to `standard`).

#### R4-07: `approved` workflow has no MCP tool surface
- **File:** `brain/README.md`
- **Issue:** The schema has `approved BOOLEAN DEFAULT true` with a comment that "seed candidates arrive with approved = false" and "Admiral flips to true after review." No MCP tool provides an approval mechanism. Admiral must use raw SQL.
- **Fix:** Either add a `brain_approve` tool contract or document that approval is an Admiral-only SQL operation outside the MCP layer.

#### R4-08: `source_agent`/`source_session` not in brain_record return
- **File:** `brain/README.md` (brain_record contract)
- **Issue:** These are documented as implicit (identity token-derived), but the brain_record return is just `{ id: UUID }`. It should confirm the derived values so callers can verify.
- **Fix:** Expand return to `{ id: UUID, source_agent: string, source_session: string }`.

### Priority 3 — Substantial Fixes (file creation)

#### R4-09: Zero attack corpus data files
- **File:** `attack-corpus/README.md`
- **Issue:** README describes 18 seed scenarios and claims "Level 1 (file-based)" storage with "seed entries as YAML/JSON files," but the directory contains only README.md. The 18 scenarios exist only as prose.
- **Fix:** Create 18 YAML files (ATK-0001.yaml through ATK-0018.yaml) from the prose descriptions, following the entry schema defined in the README.

#### R4-10: Zero hook implementations
- **Files:** `hooks/README.md`, `hooks/` directory
- **Issue:** README defines 8 reference hooks with full JSON manifests, directory convention (`hooks/[hook-name]/hook.manifest.json`), and describes hooks as "the deterministic enforcement layer." Zero hook directories or manifest files exist.
- **Fix:** Create 8 hook directories with `hook.manifest.json` files extracted from the README's reference manifests.

#### R4-11: Attack corpus ID ordering contradicts stated rationale
- **File:** `attack-corpus/README.md`
- **Issue:** README states ordering is by "descending leverage." The actual ID assignment puts Prompt Injection (ATK-0016 to 0018) after Failure Scenarios (ATK-0011 to 0013) and Chaos Scenarios (ATK-0014 to 0015), but the stated ordering rationale would place Prompt Injection higher.
- **Fix:** Either reorder the IDs or update the ordering rationale to match the actual sequence.

### Priority 4 — Observations (design decisions, not bugs)

#### R4-12: Fleet size range 5-12 vs 8-12
- **Files:** `index.md` glossary, `part4-fleet.md` lines 12 and 82
- **Issue:** "5-12" is the general recommendation; "8-12" is the upper-bound anti-pattern note. Different contexts, but the lower bound shifting from 5 to 8 within the same file could confuse readers.

#### R4-13: Triage Agent has no routing entry
- **File:** `fleet/routing-rules.md`
- **Issue:** The Triage Agent is a command agent invoked by the Orchestrator for work classification, not routed to by task type. This is intentional but undocumented.

#### R4-14: Core agent routes to Extended agent
- **File:** `fleet/agents/lifecycle.md` line 218
- **Issue:** Monorepo Coordinator lists "Build/Deploy Pipeline Topologist" (an Extended Scale agent) in its "Output Goes To" section. In deployments without Extended agents, this is a dangling reference.

#### R4-15: "Specialist" label includes non-implementation agents
- **File:** `fleet/specialists.md` line 61
- **Issue:** "67 specialists" includes Governance (7), Scale (12), and Meta (4) agents that monitor/analyze rather than implement. The label is technically correct per the catalog but conflicts with the intuitive meaning in doctrine context.

#### R4-16: model-tiers.md uses collective references
- **File:** `fleet/model-tiers.md`
- **Issue:** Phrases like "All Data & Analytics agents (extras/)" prevent mechanical verification of tier assignments. New agents added to these categories silently inherit the collective rule.

#### R4-17: Level 2 `embedding_model` has no tool surface
- **File:** `brain/README.md`
- **Issue:** The schema tracks which model produced each embedding for future migrations, but no MCP tool addresses querying by model or triggering re-embedding.

#### R4-18: Prompt anatomy glossary attribution
- **File:** `admiral/index.md` glossary
- **Issue:** Glossary attributes "Prompt anatomy" to "Section 04" but the detailed specification lives in `fleet/prompt-anatomy.md`. Could reference both.

---

## Audit Methodology

Seven independent passes were run, each from a different angle:

1. **MANIFEST content accuracy** — Verified every 2026-03-10 file description against source
2. **MANIFEST structural formatting** — Checked markdown consistency, fence balance, group organization
3. **File completeness** — Reconciled MANIFEST entries against filesystem (all 68 files confirmed)
4. **Description quality** — Deep comparison of prose descriptions to actual file content
5. **Cross-file consistency** — Checked claims that span multiple files for agreement
6. **Broken promises** — Found TODOs, missing implementations, referenced-but-absent content
7. **Spec-implementation gaps** — Verified schemas, agent rosters, config claims against disk

---

## Files Modified in This Session

```
aiStrat/MANIFEST.md                                  (5 fixes)
aiStrat/admiral/index.md                             (1 fix: glossary brain_purge)
aiStrat/admiral/part4-fleet.md                       (3 fixes: count, wording, Design Agent)
aiStrat/admiral/part11-protocols.md                  (1 fix: Design Agent)
aiStrat/CAPITALIZATION-PLAN.md                       (1 fix: governance minimum)
aiStrat/CLAUDE.md                                    (1 fix: directory claims)
aiStrat/brain/README.md                              (2 fixes: ranking rationale, implicit fields)
aiStrat/brain/schema/001_initial.sql                 (1 fix: purge_regulation column)
aiStrat/fleet/interface-contracts.md                 (1 fix: Design Agent)
aiStrat/fleet/agents/engineering/frontend/agents.md  (1 fix: Design Agent)
```
