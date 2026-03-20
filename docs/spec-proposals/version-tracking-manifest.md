# SD-07: Spec Version Tracking Manifest

> Track which spec version each implementation artifact targets. Detect drift between spec evolution and implementation.
>
> **Last updated:** 2026-03-20

---

## Current Spec Version

**v0.10.0-alpha** (March 2026)

Source: `aiStrat/admiral/spec/CHANGELOG.md`

---

## Implementation Artifact Manifest

### Hook Scripts (`.hooks/`)

| Artifact | Targets Spec Version | Last Updated | Drift Status |
|----------|---------------------|--------------|--------------|
| `session_start_adapter.sh` | v0.7.0 | v0.9.0 cycle | Current |
| `pre_tool_use_adapter.sh` | v0.9.0 | v0.9.0 cycle | Current |
| `post_tool_use_adapter.sh` | v0.7.0 | v0.9.0 cycle | Current |
| `token_budget_tracker.sh` | v0.7.0 | v0.7.0 cycle | **Drifted** — missing 80% threshold added in constants |
| `loop_detector.sh` | v0.5.3 | v0.9.0 cycle | Current |
| `context_baseline.sh` | v0.5.0 | v0.7.0 cycle | Current |
| `context_health_check.sh` | v0.7.0 | v0.7.0 cycle | Current |
| `scope_boundary_guard.sh` | v0.9.0 | v0.9.0 cycle | Current |
| `prohibitions_enforcer.sh` | v0.9.0 | v0.9.0 cycle | Current |
| `zero_trust_validator.sh` | v0.9.0 | v0.9.0 cycle | Current |
| `pre_work_validator.sh` | v0.9.0 | v0.9.0 cycle | Current |
| `compliance_ethics_advisor.sh` | v0.9.0 | v0.9.0 cycle | Current |
| `strategy_triangle_validate.sh` | v0.10.0 | v0.10.0 cycle | Current |
| `brain_context_router.sh` | v0.8.0 | v0.9.0 cycle | Current |

### Configuration

| Artifact | Targets Spec Version | Drift Status |
|----------|---------------------|--------------|
| `admiral/config.json` | v0.9.0 | Current |
| `admiral/lib/state.sh` | v0.7.0 | **Minor drift** — missing 2 computed fields from spec schema |
| `admiral/lib/standing_orders.sh` | v0.9.0 | Current |

### Control Plane (`control-plane/`)

| Artifact | Targets Spec Version | Drift Status |
|----------|---------------------|--------------|
| `src/events.ts` | v0.8.0 | Current |
| `src/runaway-detector.ts` | v0.8.0 | Current |
| `src/trace.ts` | v0.8.0 | Current |
| `src/ingest.ts` | v0.8.0 | Current |
| `src/server.ts` | v0.8.0 | Current |

### Reference Specs

| Artifact | Targets Spec Version | Drift Status |
|----------|---------------------|--------------|
| `reference-constants.md` | v0.10.0 | Canonical — defines constants |
| `spec-gaps.md` | v0.5.3 | All 14 gaps resolved |
| `spec-debt.md` | v0.10.0 | 3 active items (SD-02, SD-05, SD-06) |
| `standing-orders-enforcement-map.md` | v0.9.0 | Current |

---

## Drift Summary

| Status | Count | Percentage |
|--------|-------|------------|
| Current | 22 | 88% |
| Minor drift | 2 | 8% |
| Major drift | 1 | 4% |

**Drifted artifacts requiring attention:**

1. `token_budget_tracker.sh` — Missing 80% warning threshold (Amendment 1 in SD-03)
2. `admiral/lib/state.sh` — Missing `total_capacity` and `current_utilization` fields (Amendment 2 in SD-03)

---

## Version Tracking Policy

1. When a spec part is updated, check this manifest for artifacts that target that part
2. When an artifact is modified, update its "Targets Spec Version" entry
3. Run drift check before each release: compare artifact target versions against current spec version
4. Artifacts more than 2 minor versions behind should be flagged for review
