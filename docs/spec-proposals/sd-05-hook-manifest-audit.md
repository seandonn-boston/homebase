# SD-05: Hook Manifest Completeness Audit

> Cross-reference all spec-referenced hooks against actual manifests in `aiStrat/hooks/` and implementations in `.hooks/`. Identify missing manifests, orphan manifests, and propose new manifest content.
>
> Date: 2026-03-20

---

## Methodology

Three sources were cross-referenced:
1. **Spec manifests** — `aiStrat/hooks/*/hook.manifest.json` (12 manifests)
2. **Implementations** — `.hooks/*.sh` (13 scripts, of which 3 are adapters)
3. **Spec references** — hooks referenced in Part 3 (Enforcement) README, SD-04 enforcement map

---

## Cross-Reference Matrix

### Hooks With Both Manifest AND Implementation (5)

| Hook Name | Manifest | Implementation | Match? | Notes |
|-----------|----------|---------------|--------|-------|
| context_baseline | `aiStrat/hooks/context_baseline/` | `.hooks/context_baseline.sh` | Yes | SessionStart; SO-11 |
| context_health_check | `aiStrat/hooks/context_health_check/` | `.hooks/context_health_check.sh` | Yes | PostToolUse; SO-11 |
| loop_detector | `aiStrat/hooks/loop_detector/` | `.hooks/loop_detector.sh` | Yes | PostToolUse; SO-06 |
| token_budget_tracker | `aiStrat/hooks/token_budget_tracker/` | `.hooks/token_budget_tracker.sh` | Yes | PostToolUse; SO-10 |
| identity_validation | `aiStrat/hooks/identity_validation/` | `.hooks/session_start_adapter.sh` (partial) | Partial | Manifest exists; implementation is embedded in session_start_adapter, not standalone |

### Hooks With Manifest But NO Implementation (6 — Missing Implementations)

| Hook Name | Manifest Location | Event | Status | Stream Task |
|-----------|-------------------|-------|--------|-------------|
| governance_heartbeat_monitor | `aiStrat/hooks/governance_heartbeat_monitor/` | Periodic | Not implemented | S-03 (Stream 7) |
| tier_validation | `aiStrat/hooks/tier_validation/` | SessionStart | Not implemented | S-02 (Stream 7) |
| link_validator | `aiStrat/hooks/link_validator/` | PreCommit | Not implemented | Not yet assigned |
| manifest_freshness | `aiStrat/hooks/manifest_freshness/` | SessionStart | Not implemented | Not yet assigned |
| standing_order_integrity | `aiStrat/hooks/standing_order_integrity/` | SessionStart | Not implemented | Not yet assigned |
| version_consistency | `aiStrat/hooks/version_consistency/` | PreCommit | Not implemented | Not yet assigned |

### Hooks With Implementation But NO Manifest (7 — Orphan Implementations)

| Hook Name | Implementation | Event | SO Enforced | Manifest Needed? |
|-----------|---------------|-------|-------------|-----------------|
| prohibitions_enforcer | `.hooks/prohibitions_enforcer.sh` | PreToolUse | SO-10 | **Yes** — core enforcement hook |
| scope_boundary_guard | `.hooks/scope_boundary_guard.sh` | PreToolUse | SO-03 | **Yes** — core enforcement hook |
| zero_trust_validator | `.hooks/zero_trust_validator.sh` | PostToolUse | SO-12 | **Yes** — core enforcement hook |
| pre_work_validator | `.hooks/pre_work_validator.sh` | PreToolUse | SO-15 | **Yes** — core enforcement hook |
| brain_context_router | `.hooks/brain_context_router.sh` | PostToolUse | SO-11 | **Yes** — Brain integration hook |
| compliance_ethics_advisor | `.hooks/compliance_ethics_advisor.sh` | PostToolUse | SO-14 | **Yes** — safety-tier hook |
| token_budget_gate | `aiStrat/hooks/token_budget_gate/` (manifest only) | PreToolUse | SO-10 | Has manifest, no impl in .hooks/ |

### Adapter Scripts (not hooks themselves — no manifest needed)

| Script | Purpose |
|--------|---------|
| `.hooks/session_start_adapter.sh` | Routes SessionStart to individual hooks |
| `.hooks/pre_tool_use_adapter.sh` | Routes PreToolUse to individual hooks |
| `.hooks/post_tool_use_adapter.sh` | Routes PostToolUse to individual hooks |

---

## Hooks Referenced in Spec But Missing Both Manifest AND Implementation

These hooks are referenced in the spec (Part 3 Enforcement, SD-04 enforcement map) but have neither manifest nor implementation:

| Hook Name | Spec Reference | Event | SO | Priority |
|-----------|---------------|-------|-----|----------|
| decision_authority_enforcer | SD-04 proposal | PreToolUse | SO-05 | Medium |
| protocol_registry_guard | Part 3 + SD-04 | PreToolUse | SO-16 | Medium |
| output_routing_validator | SD-04 proposal | PostToolUse | SO-02 | Low |
| checkpoint_reminder | SD-04 proposal | PostToolUse | SO-07 | Low |
| compliance_boundary_check | SD-04 proposal | PreToolUse | SO-14 | **HIGH** |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Hooks with manifest + implementation | 5 |
| Hooks with manifest, no implementation | 6 |
| Hooks with implementation, no manifest (orphans) | 7 |
| Hooks referenced in spec, missing both | 5 |
| Adapter scripts (no manifest needed) | 3 |
| **Total unique hooks in ecosystem** | **23** |

---

## Proposed New Manifests

The 7 orphan implementations need manifests to comply with the manifest-first design. Proposed manifest content:

### prohibitions_enforcer

```json
{
  "name": "prohibitions_enforcer",
  "version": "1.0.0",
  "events": ["PreToolUse"],
  "timeout_ms": 5000,
  "requires": [],
  "input_contract": "v1",
  "description": "Enforces SO-10 prohibitions: detects bypass patterns, secrets exposure, privilege escalation, and irreversible operations. Hard-blocks on bypass/irreversible; advisory on secrets."
}
```

### scope_boundary_guard

```json
{
  "name": "scope_boundary_guard",
  "version": "1.0.0",
  "events": ["PreToolUse"],
  "timeout_ms": 5000,
  "requires": [],
  "input_contract": "v1",
  "description": "Enforces SO-03 scope boundaries: hard-blocks write operations to protected paths (spec files, CI config, agent settings). Supports session-scoped Admiral override."
}
```

### zero_trust_validator

```json
{
  "name": "zero_trust_validator",
  "version": "1.0.0",
  "events": ["PostToolUse"],
  "timeout_ms": 5000,
  "requires": [],
  "input_contract": "v1",
  "description": "Enforces SO-12 zero-trust self-protection: flags untrusted external data, detects prompt injection markers, assesses blast radius, flags excessive access scope. Advisory only."
}
```

### pre_work_validator

```json
{
  "name": "pre_work_validator",
  "version": "1.0.0",
  "events": ["PreToolUse"],
  "timeout_ms": 5000,
  "requires": [],
  "input_contract": "v1",
  "description": "Enforces SO-15 pre-work validation: checks standing orders loaded, token budget defined, sufficient context gathered before first substantive write operation. Advisory only."
}
```

### brain_context_router

```json
{
  "name": "brain_context_router",
  "version": "1.0.0",
  "events": ["PostToolUse"],
  "timeout_ms": 5000,
  "requires": [],
  "input_contract": "v1",
  "description": "Routes context to Brain B1 for recording and suggests relevant Brain queries based on current task context. Supports SO-11 context discovery."
}
```

### compliance_ethics_advisor

```json
{
  "name": "compliance_ethics_advisor",
  "version": "1.0.0",
  "events": ["PostToolUse"],
  "timeout_ms": 5000,
  "requires": [],
  "input_contract": "v1",
  "description": "Advisory hook for SO-14 compliance, ethics, and legal awareness. Flags potential compliance concerns for human review. Advisory only — never blocks."
}
```

---

## Recommendations

1. **Create manifests for 6 orphan implementations** (prohibitions_enforcer, scope_boundary_guard, zero_trust_validator, pre_work_validator, brain_context_router, compliance_ethics_advisor) — these are proposed above as `docs/spec-proposals/` content since manifests live in `aiStrat/hooks/` which is read-only. Admiral approval required to add them.

2. **Implement 6 missing-implementation hooks** during Phase 3 (Stream 7): governance_heartbeat_monitor, tier_validation, link_validator, manifest_freshness, standing_order_integrity, version_consistency.

3. **Create manifests + implementations for 5 SD-04 proposed hooks** during Phase 3: compliance_boundary_check (HIGH), decision_authority_enforcer, protocol_registry_guard, output_routing_validator, checkpoint_reminder.

4. **Reconcile identity_validation** — the manifest exists but implementation is embedded in session_start_adapter rather than being a standalone hook. Either extract to standalone or update manifest to document the adapter pattern.
