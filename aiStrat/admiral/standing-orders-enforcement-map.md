<!-- Admiral Framework v0.2.0-alpha -->
# Standing Orders → Enforcement Mechanism Map

> **Audience:** Implementers and auditors verifying that standing orders have deterministic enforcement where required. This document maps each of the 15 standing orders to its enforcement mechanism (or documents the gap).

-----

## Coverage Summary

- **Hook-enforced:** 13 of 15 (87%)
- **Partially enforced:** 1 of 15 (7%)
- **Advisory only (no hook):** 1 of 15 (7%)

> **v0.2.0-alpha update:** 9 new hook manifests added, bringing coverage from 4/15 to 13/15. Hook manifests define the enforcement contract; implementations will follow as the framework moves from specification to code. The enforcement spectrum (part3-enforcement.md, Section 08) classifies constraints as requiring either **hard enforcement** (hooks) or **soft enforcement** (standing orders + agent compliance).

-----

## Complete Mapping

| SO # | Standing Order | Priority Tier | Hook Enforcement | Adoption Level | Enforcement Mechanism |
|------|---------------|--------------|-----------------|----------------|----------------------|
| 1 | Identity Discipline | Safety | **Enforced** | Level 1 | `identity_validation` (SessionStart) — validates agent identity token and auth config artifact |
| 2 | Output Routing | Operational | **No hook** | — | Advisory — agents must route outputs to correct channels; enforcement via interface contracts and routing rules |
| 3 | Scope Boundaries | Safety | **Enforced** | Level 1 | `scope_boundary_check` (PreToolUse) — validates tool invocations against agent's declared scope boundaries |
| 4 | Context Honesty | Integrity | **No hook** | — | Advisory — agents instructed to flag gaps and assumptions; deterministic enforcement of subjective judgment is not feasible |
| 5 | Decision Authority | Operational | **Enforced** | Level 1 | `decision_authority_gate` (PreToolUse) — blocks operations that exceed the agent's assigned authority tier |
| 6 | Recovery Protocol | Operational | **Enforced** | Level 1 | `loop_detector` (PostToolUse) — enforces recovery ladder by detecting and breaking retry loops |
| 7 | Handoff Protocol | Operational | **Enforced** | Level 2 | `handoff_completeness` (PreCommit) — validates handoff documents against v1.schema.json |
| 8 | Quality Standards | Quality | **Enforced** | Level 2 | `quality_gate` (PostToolUse) — validates output quality against acceptance criteria |
| 9 | Assumption Flagging | Operational | **Enforced** | Level 2 | `assumption_tracker` (PostToolUse) — tracks and flags unvalidated assumptions |
| 10 | Prohibitions | Safety | **Partial** | Level 1 | `token_budget_gate` (PreToolUse) enforces budget exhaustion prohibition; `scope_boundary_check` enforces scope prohibitions; remaining prohibitions advisory |
| 11 | Context Discovery | Operational | **Enforced** | Level 1 | `context_baseline` (SessionStart) + `context_health_check` (PostToolUse) — validates critical context presence |
| 12 | Zero-Trust Self-Protection | Safety | **Enforced** | Level 3 | `zero_trust_validation` (PreToolUse) — validates identity tokens, input provenance, rejects unverified external content |
| 13 | Information Handling | Integrity | **Enforced** | Level 3 | `data_sensitivity_gate` (PreToolUse) — validates data sensitivity classification and agent clearance |
| 14 | Compliance, Ethics, Legal | Safety | **Enforced** | Level 3 | `compliance_check` (PreToolUse) — validates operations against compliance deny-list and ethical guidelines |
| 15 | Pre-Work Validation | Operational | **Enforced** | Level 1 | `pre_work_validation` (SessionStart) — validates pre-work checklist completion before task execution |

-----

## Remaining Gaps

### Advisory-Only Orders (by design)

**SO 2 — Output Routing**
- Output routing correctness is enforced structurally via interface contracts and routing rules, not via a runtime hook.
- A hook cannot deterministically validate whether an agent's output went to the "correct" channel without understanding task semantics.
- Enforcement approach: interface contracts + routing rules provide structural enforcement; runtime validation deferred to governance agents at Level 3+.

**SO 4 — Context Honesty**
- Requires agents to flag gaps in their own understanding — a subjective judgment that cannot be deterministically validated by a hook.
- Enforcement approach: the `assumption_tracker` hook (SO 9) partially addresses this by tracking unvalidated assumptions. Full context honesty requires agent-level metacognition which remains advisory.

### Partially Enforced Orders

**SO 10 — Prohibitions (3 of 5 enforced)**
- Budget exhaustion: `token_budget_gate` ✓
- Out-of-scope file modifications: `scope_boundary_check` ✓
- Disabling enforcement: advisory (hooks cannot prevent their own disabling without OS-level enforcement)
- Storing secrets in plaintext: advisory (recommend future `secret_detection` hook)
- Irreversible changes without approval: `decision_authority_gate` partially covers this ✓

-----

## Enforcement Progression Path

As the framework matures through levels, enforcement coverage should increase:

| Level | Coverage | Hooks Active | Focus |
|-------|----------|-------------|-------|
| Level 1 | 7/15 | `identity_validation`, `loop_detector`, `token_budget_gate`, `token_budget_tracker`, `context_baseline`, `context_health_check`, `scope_boundary_check`, `decision_authority_gate`, `pre_work_validation` | Runtime essentials: identity, budget, loops, context, scope, authority, pre-work |
| Level 2 | 10/15 | Level 1 + `handoff_completeness`, `quality_gate`, `assumption_tracker` | Add handoff validation, output quality, assumption tracking |
| Level 3 | 13/15 | Level 2 + `zero_trust_validation`, `compliance_check`, `data_sensitivity_gate` | Add zero-trust, compliance, data sensitivity — security hardening |
| Level 4+ | 13-14/15 | Level 3 + potential `secret_detection` | Near-complete; remaining gaps are advisory by design (SO 2, SO 4) |

-----

## Cross-References

- Standing Orders source: `part11-protocols.md`
- Enforcement spectrum: `part3-enforcement.md`, Section 08
- Hook implementations: `hooks/` directory
- Hook manifest schema: `hooks/manifest.schema.json`
- Reference constants for hook behavior: `reference-constants.md`
