# SD-05: Hook Manifest Completeness Audit

> Cross-reference all spec-referenced hooks against actual manifests and implementations.
>
> **Last updated:** 2026-03-20

---

## Manifest vs Implementation Cross-Reference

### Spec Manifests (in `aiStrat/hooks/`)

| Hook | Manifest | Implementation in `.hooks/` | Status |
|------|----------|---------------------------|--------|
| `context_baseline` | `context_baseline/hook.manifest.json` | `context_baseline.sh` | Match |
| `context_health_check` | `context_health_check/hook.manifest.json` | `context_health_check.sh` | Match |
| `governance_heartbeat_monitor` | `governance_heartbeat_monitor/hook.manifest.json` | — | **Manifest only** |
| `identity_validation` | `identity_validation/hook.manifest.json` | — | **Manifest only** |
| `link_validator` | `link_validator/hook.manifest.json` | — | **Manifest only** (spec-repo hook) |
| `loop_detector` | `loop_detector/hook.manifest.json` | `loop_detector.sh` | Match |
| `manifest_freshness` | `manifest_freshness/hook.manifest.json` | — | **Manifest only** (spec-repo hook) |
| `standing_order_integrity` | `standing_order_integrity/hook.manifest.json` | — | **Manifest only** (spec-repo hook) |
| `tier_validation` | `tier_validation/hook.manifest.json` | — | **Manifest only** |
| `token_budget_gate` | `token_budget_gate/hook.manifest.json` | — | **Manifest only** |
| `token_budget_tracker` | `token_budget_tracker/hook.manifest.json` | `token_budget_tracker.sh` | Match |
| `version_consistency` | `version_consistency/hook.manifest.json` | — | **Manifest only** (spec-repo hook) |

### Implementations Without Manifests (in `.hooks/`)

| Hook | Implementation | Spec Manifest | Status |
|------|---------------|---------------|--------|
| `brain_context_router.sh` | `.hooks/brain_context_router.sh` | — | **Orphan** (no manifest) |
| `compliance_ethics_advisor.sh` | `.hooks/compliance_ethics_advisor.sh` | — | **Orphan** (no manifest) |
| `pre_work_validator.sh` | `.hooks/pre_work_validator.sh` | — | **Orphan** (no manifest) |
| `prohibitions_enforcer.sh` | `.hooks/prohibitions_enforcer.sh` | — | **Orphan** (no manifest) |
| `scope_boundary_guard.sh` | `.hooks/scope_boundary_guard.sh` | — | **Orphan** (no manifest) |
| `zero_trust_validator.sh` | `.hooks/zero_trust_validator.sh` | — | **Orphan** (no manifest) |
| `strategy_triangle_validate.sh` | `.hooks/strategy_triangle_validate.sh` | — | **Orphan** (no manifest) |
| `pre_tool_use_adapter.sh` | `.hooks/pre_tool_use_adapter.sh` | — | **Adapter** (not a hook) |
| `post_tool_use_adapter.sh` | `.hooks/post_tool_use_adapter.sh` | — | **Adapter** (not a hook) |
| `session_start_adapter.sh` | `.hooks/session_start_adapter.sh` | — | **Adapter** (not a hook) |

---

## Summary

| Category | Count | Items |
|----------|-------|-------|
| **Matched** (manifest + implementation) | 5 | context_baseline, context_health_check, loop_detector, token_budget_tracker, (token_budget_gate maps to token_budget_checkpoint behavior in prohibitions_enforcer) |
| **Manifest only** (no implementation) | 4 | identity_validation, tier_validation, governance_heartbeat_monitor, token_budget_gate |
| **Spec-repo only** (not runtime hooks) | 4 | link_validator, manifest_freshness, standing_order_integrity, version_consistency |
| **Orphan** (implementation, no manifest) | 7 | brain_context_router, compliance_ethics_advisor, pre_work_validator, prohibitions_enforcer, scope_boundary_guard, zero_trust_validator, strategy_triangle_validate |
| **Adapters** (orchestration, not hooks) | 3 | pre_tool_use_adapter, post_tool_use_adapter, session_start_adapter |

---

## Recommended Actions

### 1. Create manifests for orphan hooks

These hooks exist and work but have no manifest in `aiStrat/hooks/`. Proposed manifests:

| Hook | Event | Timeout | SO Reference |
|------|-------|---------|-------------|
| `brain_context_router` | PreToolUse | 5s | SO-11 (Context Discovery) |
| `compliance_ethics_advisor` | PostToolUse | 5s | SO-14 (Compliance/Ethics) |
| `pre_work_validator` | PreToolUse | 5s | SO-15 (Pre-Work Validation) |
| `prohibitions_enforcer` | PreToolUse | 5s | SO-10 (Prohibitions) |
| `scope_boundary_guard` | PreToolUse | 5s | SO-03 (Scope Boundaries) |
| `zero_trust_validator` | PostToolUse | 10s | SO-12 (Zero-Trust) |
| `strategy_triangle_validate` | SessionStart | 10s | SO-15 (Pre-Work Validation) |

### 2. Implement manifest-only hooks

4 hooks have manifests but no implementation:

| Hook | Priority | Rationale |
|------|----------|-----------|
| `identity_validation` | High | Safety-tier SO-01; manifest defines clear contract |
| `tier_validation` | High | Enables SO-05 decision authority enforcement |
| `governance_heartbeat_monitor` | Medium | Periodic check; less urgent than per-call hooks |
| `token_budget_gate` | Low | Partially covered by `prohibitions_enforcer` budget warnings |

### 3. Spec-repo hooks

The 4 spec-repo hooks (link_validator, manifest_freshness, standing_order_integrity, version_consistency) are correctly manifest-only — they document enforcement intent for the spec repository itself. No action needed until spec-repo CI is implemented.
