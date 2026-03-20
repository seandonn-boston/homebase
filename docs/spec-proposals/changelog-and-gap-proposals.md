# SD-09 through SD-12: Changelog, Gap Proposals, and Spec Hygiene

> **Last updated:** 2026-03-20

---

## SD-09: Changelog Completeness Audit

### Current State

`aiStrat/admiral/spec/CHANGELOG.md` covers v0.2.0-alpha through v0.10.0-alpha (9 entries). Each entry documents what changed but not _why_ — missing motivation context.

### Findings

| Version | Entries | Motivation Documented | Status |
|---------|---------|----------------------|--------|
| v0.10.0 | 4 items | Partial — "Phase 1/2 complete" but no problem statement | Adequate |
| v0.9.0 | 2 items | Yes — references SD-01, SD-03, SD-04 | Good |
| v0.8.0 | 4 items | Partial — "codebase review fixes" is vague | Adequate |
| v0.7.0 | 4 items | Yes — "eliminated all deadlock vectors" explains why | Good |
| v0.6.0 | 1 item | No — "Phase 4 completion" says nothing | Poor |
| v0.5.x | 5 items | Yes — references spec-gaps, trust model | Good |
| v0.4.0 | 6 items | Yes — "removed dual numbering" explains motivation | Good |
| v0.3.x | 4 items | Partial | Adequate |
| v0.2.0 | 1 item | Baseline — no prior state to compare | N/A |

### Recommendations

1. Retroactively add 1-line motivation to v0.6.0 and v0.8.0 entries
2. Adopt format: `**What:** <change>. **Why:** <motivation>.` for future entries
3. Add a "Breaking Changes" subsection for any version that changes hook behavior or state schema

---

## SD-10: New Gap Proposals

### Gap Candidate 1: Hook Chain Error Aggregation

**Observation:** When multiple PostToolUse hooks fire (token_budget_tracker → loop_detector → context_health_check), each runs independently. If two hooks emit warnings simultaneously, the agent receives two separate warning blocks. No aggregation or priority ordering exists.

**Proposed spec addition:** Define warning priority order and optional aggregation format so agents receive a single consolidated warning block per tool call.

**Severity:** Low — current behavior works, but verbose warnings may consume context budget.

### Gap Candidate 2: Config.json Schema Validation

**Observation:** `admiral/config.json` is loaded by multiple hooks but has no schema definition. Invalid config values (e.g., negative `maxSameError`, non-numeric `successDecay`) would produce silent failures.

**Proposed spec addition:** Define a JSON Schema for `config.json` and validate at session start.

**Severity:** Moderate — prevents configuration-induced silent failures.

### Gap Candidate 3: Hook Registration Order Determinism

**Observation:** `reference-constants.md` § Hook Dependency Algorithms specifies "registration order" tie-breaking. Current adapter scripts call hooks in hardcoded order. No discovery mechanism defines or validates registration order.

**Proposed spec addition:** Document the canonical hook registration order in `reference-constants.md` or `config.json`.

**Severity:** Low — hardcoded order is deterministic, but fragile if hooks are added.

---

## SD-11: Cross-Reference Integrity

### Methodology

Checked all `reference-constants.md` section references against source spec files.

| Reference | Target | Status |
|-----------|--------|--------|
| "Context Profiles (Part 2)" | part2-context.md | Valid |
| "Deterministic Enforcement (Part 3)" | part3-enforcement.md | Valid |
| "Fleet Composition (Part 4)" | part4-fleet.md | Valid |
| "Work Decomposition (Part 6)" | part6-execution.md | Valid |
| "part5-brain.md" | part5-brain.md | Valid |
| "part7-quality.md" | part7-quality.md | Valid |
| "part8-operations.md" | part8-operations.md | Valid |
| "part9-platform.md" | part9-platform.md | Valid |
| "part10-admiral.md" | part10-admiral.md | Valid |
| "part11-protocols.md" | part11-protocols.md | Valid |

All cross-references are valid. No broken links found.

---

## SD-12: Spec-Debt Resolution Tracking

### Active Debt Items (from `spec-debt.md`)

| ID | Title | Severity | Resolution Path | Blocked By |
|----|-------|----------|----------------|------------|
| SD-02 | Benchmark targets lack empirical basis | Moderate | Run real-world validation | Need production deployment |
| SD-05 | Data Ecosystem is thinnest doctrine part | Low | Add worked examples | Effort — not blocked |
| SD-06 | SO-16 lacks hook enforcement | Low | Implement `protocol_registry_guard` | Effort — not blocked |

### Resolution Velocity

| Period | Resolved | Added | Net |
|--------|----------|-------|-----|
| v0.9.0 cycle | 3 (SD-01, SD-03, SD-04) | 0 | -3 |
| v0.10.0 cycle | 0 | 0 | 0 |

Debt inventory is shrinking. 3 items resolved in v0.9.0, none added since. Remaining items are lower severity (Moderate, Low, Low).

### Projected Resolution

- **SD-06** (protocol registry guard): Can be implemented in next hook development cycle. Low effort.
- **SD-05** (data ecosystem): Incremental — add one worked example per release cycle.
- **SD-02** (benchmarks): Blocked until real-world deployment. Cannot be resolved speculatively.
