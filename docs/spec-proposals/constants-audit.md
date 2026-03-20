# SD-06: Reference Constants Implementation Audit

> Cross-reference every constant in `reference-constants.md` against the implementation codebase. Report: implemented (matching), implemented (divergent), or missing.
>
> **Last updated:** 2026-03-20

---

## Methodology

Searched all hook scripts (`.hooks/*.sh`), library code (`admiral/lib/`), and configuration (`admiral/config.json`) for each constant defined in `reference-constants.md`. Constants are grouped by implementation status.

---

## Fully Implemented (Matching)

### Token Estimates per Tool (Section 1)

All 11 tool estimates match exactly between spec and implementation.

| Tool | Spec | config.json | state.sh | Status |
|------|------|-------------|----------|--------|
| Bash | 500 | line 20 | line 149 | MATCH |
| Read | 1,000 | line 21 | line 150 | MATCH |
| Write | 800 | line 22 | line 151 | MATCH |
| Edit | 600 | line 23 | line 152 | MATCH |
| Glob | 300 | line 24 | line 153 | MATCH |
| Grep | 500 | line 25 | line 154 | MATCH |
| WebFetch | 2,000 | line 26 | line 155 | MATCH |
| WebSearch | 1,500 | line 27 | line 156 | MATCH |
| Agent | 5,000 | line 28 | line 157 | MATCH |
| NotebookEdit | 800 | line 29 | line 158 | MATCH |
| Default | 500 | line 30 | line 159 | MATCH |

**Source files:** `admiral/config.json`, `admiral/lib/state.sh`

### Loop Detection Thresholds (Section 6)

| Constant | Spec | config.json | loop_detector.sh | Status |
|----------|------|-------------|------------------|--------|
| MAX_SAME_ERROR | 3 | line 14 | line 24 | MATCH |
| MAX_TOTAL_ERRORS | 10 | line 15 | line 25 | MATCH |
| SUCCESS_DECAY | 1 | line 16 | line 26 | MATCH |

Values read from `config.json` with correct fallback defaults in shell.

### Exit Code Conventions (Section 8)

| Exit Code | Meaning | Usage | Status |
|-----------|---------|-------|--------|
| 0 | Pass | All advisory hooks | MATCH |
| 1 | Soft fail | Error diagnostics | MATCH |
| 2 | Hard block | `prohibitions_enforcer`, `scope_boundary_guard` | MATCH |

Verified across all hook scripts in `.hooks/`.

### Hook Timeout Defaults (Section 18)

| Hook | Spec | Implemented | Status |
|------|------|-------------|--------|
| Global default | 30s | 30s | MATCH |
| token_budget_tracker | 5s | 5s | MATCH |
| loop_detector | 5s | 5s | MATCH |
| context_health_check | 10s | 10s | MATCH |
| context_baseline | 10s | 10s | MATCH |

### Context Health Check Frequency (Section 19)

| Constant | Spec | Implementation | Status |
|----------|------|----------------|--------|
| Invocation interval | Every 10 tool calls | `post_tool_use_adapter.sh:93` `TOOL_CALL_COUNT % 10 == 0` | MATCH |

Hardcoded — not yet configurable via config.json.

### Context Budget Validation (Section 2)

Standing + Session + Working must sum to 100%. This constraint is documented and enforced conceptually. No runtime validation code exists (appropriate — context profiles are not yet configurable at runtime).

---

## Divergent Implementation

### Token Budget Alert Thresholds (Section 5)

| Threshold | Spec | Implementation | Status |
|-----------|------|----------------|--------|
| >= 90% | ESCALATION alert | Implemented in `token_budget_tracker.sh:37-39` | MATCH |
| >= 80% | WARNING alert | **NOT IMPLEMENTED** | MISSING |

The spec requires **both** thresholds to be checked independently. Only the 90% threshold is present. The 80% warning should be added.

**Recommendation:** Add 80% warning threshold to `token_budget_tracker.sh`.

### Session State Schema (Section 9)

| Field | Spec | Implementation | Status |
|-------|------|----------------|--------|
| session_id | Required | Present | MATCH |
| started_at | Required | Present | MATCH |
| tokens_used | Required | Present | MATCH |
| token_budget | Required | Present | MATCH |
| tool_call_count | Required | Present | MATCH |
| hook_state | Required | Present (with hook-specific substates) | MATCH |
| context.standing_context_tokens | Required | Present | MATCH |
| context.standing_context_present | Required | Present | MATCH |
| context.total_capacity | Spec includes | **MISSING** | DIVERGENT |
| context.current_utilization | Spec includes | **MISSING** | DIVERGENT |

`current_utilization` is computed on-the-fly in `token_budget_tracker.sh` rather than persisted. This is a reasonable optimization — computed fields don't need persistence. `total_capacity` is redundant with `token_budget`. Consider documenting these as "computed, not persisted" in reference-constants.md.

---

## Not Implemented (Design-Stage Only)

These constants are defined in the spec but have no runtime enforcement. This is expected — they describe capabilities beyond the current Starter/Team profile.

| Constant Group | Spec Section | Why Not Implemented |
|----------------|--------------|---------------------|
| Quality metric thresholds | Section 24 | Dashboard/monitoring metrics — no hook enforcement needed |
| Governance heartbeat monitor | Section 20 | Fleet-level feature (F3+) — single-agent sessions don't need heartbeats |
| Standing context 50K ceiling | Section 21 | Field exists in state schema; enforcement deferred to context profile implementation |
| Fleet constants (1-12 agents) | Section 15 | Fleet composition not yet runtime-configurable |
| Swarm pattern constants | Section 23 | Swarm patterns not yet implemented |
| Brain configuration | Section 27 | Brain B2+ features not yet runtime |
| A2A protocol timeout | Section 26 | A2A protocol not yet implemented |
| Admiral fallback decomposer | Section 25 | Orchestrator failure detection not yet implemented |

---

## Summary

| Category | Count | Percentage |
|----------|-------|------------|
| Fully matching | 28 constants | 72% |
| Divergent | 3 constants | 8% |
| Not implemented (expected) | 8 groups | 20% |

**Action items:**
1. Add 80% warning threshold to `token_budget_tracker.sh`
2. Document `total_capacity` and `current_utilization` as computed-not-persisted in reference-constants.md
3. Make context health check frequency configurable via config.json (currently hardcoded)
