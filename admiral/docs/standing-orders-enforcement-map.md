# Standing Orders → Enforcement Mechanism Map

> **Audience:** Implementers and auditors verifying that standing orders have deterministic enforcement where required.
> **Auto-generated summary available via:** `admiral/bin/enforcement_completeness_report`

-----

## Coverage Summary

- **Hook-enforced:** 12 of 16 (75%)
- **Advisory only (no hook):** 4 of 16 (25%)

**By mechanism type:**

| Mechanism | Count | Standing Orders | Hook Coverage |
|-----------|-------|----------------|---------------|
| **Mechanical** | 6 | SO 1, 3, 6, 8, 10, 15 | 6/6 (100%) — SO 8 delegates to project CI but pre_work_validator verifies |
| **Judgment-Assisted** | 7 | SO 5, 7, 9, 11, 12, 14, 16 | 5/7 (71%) — SO 5 (brain_context_router), SO 11 (context hooks), SO 12 (zero_trust), SO 14 (compliance_ethics), SO 16 (protocol_registry_guard) |
| **Advisory** | 3 | SO 2, 4, 13 | 1/3 (33%) — SO 13 has no deterministic check possible |

-----

## Complete Mapping

| SO # | Standing Order | Priority | Mechanism | Enforcement | Hook(s) | Notes |
|------|---------------|----------|-----------|-------------|---------|-------|
| 1 | Identity Discipline | Safety | Mechanical | **Hard-block** | `identity_validation` (SessionStart), `tier_validation` (SessionStart) | Validates agent ID against fleet registry; validates model tier against role requirements |
| 2 | Output Routing | Operational | Advisory | **No hook** | — | Routing correctness requires semantic understanding; no deterministic validation possible |
| 3 | Scope Boundaries | Safety | Mechanical | **Hard-block** | `scope_boundary_guard` (PreToolUse) | Blocks writes to `aiStrat/`, `.github/workflows/`, `.claude/settings`; session override via `ADMIRAL_SCOPE_OVERRIDE` |
| 4 | Context Honesty | Integrity | Advisory | **No hook** | — | Confidence assessment is inherently judgment; agents instructed to flag gaps |
| 5 | Decision Authority | Operational | Judgment-Assisted | **Advisory** | `brain_context_router` (PostToolUse) | Detects Propose/Escalate-tier decisions without prior brain_query; emits BRAIN BYPASS/STALE alerts |
| 6 | Recovery Protocol | Operational | Mechanical | **Advisory** | `loop_detector` (PostToolUse) | Detects retry loops via `(hook_name, error_signature)` tuple; decay on success |
| 7 | Checkpointing | Operational | Judgment-Assisted | **No hook** | — | Checkpoint completeness requires judgment; future: verify checkpoint artifacts at task boundaries |
| 8 | Quality Standards | Quality | Mechanical | **Advisory** | `pre_work_validator` (PreToolUse) | Validates standing orders loaded, budget defined; quality gate integration via CI |
| 9 | Communication Format | Operational | Judgment-Assisted | **No hook** | — | Structured format documented but no parser/validator; future: validate structural elements |
| 10 | Prohibitions | Safety | Mechanical | **Hard-block** | `prohibitions_enforcer` (PreToolUse), `token_budget_tracker` (PostToolUse) | Blocks bypass patterns, secret exposure, irreversible ops; budget warnings |
| 11 | Context Discovery | Operational | Judgment-Assisted | **Advisory** | `context_baseline` (SessionStart), `context_health_check` (PostToolUse) | Warns on missing critical context; agent decides sufficiency |
| 12 | Zero-Trust Self-Protection | Safety | Judgment-Assisted | **Advisory** | `zero_trust_validator` (PostToolUse) | Flags untrusted external data, prompt injection, blast radius; agent applies risk judgment |
| 13 | Bias Awareness | Integrity | Advisory | **No hook** | — | Metacognitive discipline with no deterministic check possible |
| 14 | Compliance, Ethics, Legal | Safety | Judgment-Assisted | **Advisory** | `compliance_ethics_advisor` (PostToolUse) | Detects PII patterns, regulated domains; advisory alerts |
| 15 | Pre-Work Validation | Operational | Mechanical | **Advisory** | `pre_work_validator` (PreToolUse) | Validates standing orders loaded, budget defined, sufficient context before substantive work |
| 16 | Protocol Governance | Operational | Judgment-Assisted | **Hard-block** | `protocol_registry_guard` (PreToolUse) | Blocks unapproved MCP servers (OWASP MCP09); advisory on protocol config changes; rejects `latest` version tags |

-----

## Enforcement Progression

| Level | Coverage | Status |
|-------|---------|--------|
| E1 | 4/16 (25%) | Achieved — budget, loops, identity, context |
| E2 | 8/16 (50%) | Achieved — added scope, prohibitions, zero-trust, pre-work |
| E3 | 12/16 (75%) | **Current** — added identity_validation, tier_validation, protocol_registry_guard, governance_heartbeat, compliance_ethics |
| E3+ | 16/16 (100%) | Target — remaining: SO-02 (output routing), SO-04 (context honesty), SO-07 (checkpointing), SO-09 (communication format) |

-----

## Cross-References

- Standing Orders source: `admiral/standing-orders/so*.json`
- Enforcement spectrum: `aiStrat/admiral/spec/part3-enforcement.md`
- Hook implementations: `.hooks/` directory
- Completeness report: `admiral/bin/enforcement_completeness_report`
