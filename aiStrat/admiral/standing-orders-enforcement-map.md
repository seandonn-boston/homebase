<!-- Admiral Framework v0.3.0-alpha -->
# Standing Orders → Enforcement Mechanism Map

> **Audience:** Implementers and auditors verifying that standing orders have deterministic enforcement where required. This document maps each of the 15 standing orders to its enforcement mechanism (or documents the gap).

-----

## Coverage Summary

- **Hook-enforced:** 4 of 15 (27%)
- **Partially enforced:** 1 of 15 (7%)
- **Advisory only (no hook):** 10 of 15 (67%)

The enforcement spectrum (part3-enforcement.md, Section 08) classifies constraints as requiring either **hard enforcement** (hooks) or **soft enforcement** (standing orders + agent compliance). Safety-critical orders should trend toward hard enforcement as the framework matures.

-----

## Complete Mapping

| SO # | Standing Order | Priority Tier | Hook Enforcement | Enforcement Mechanism |
|------|---------------|--------------|-----------------|----------------------|
| 1 | Identity Discipline | Safety | **Enforced** | `identity_validation` (SessionStart) — validates agent identity token and auth config artifact |
| 2 | Output Routing | Operational | **No hook** | Advisory — agents must route outputs to correct channels; no deterministic validation |
| 3 | Scope Boundaries | Safety | **No hook** | Advisory — "Does NOT Do" list stated as hard constraint but lacks hook enforcement |
| 4 | Context Honesty | Integrity | **No hook** | Advisory — agents instructed to flag gaps and assumptions; no deterministic validation |
| 5 | Decision Authority | Operational | **No hook** | Advisory — references Decision Authority framework (Part 09) but no runtime hook enforces tier assignments |
| 6 | Recovery Protocol | Operational | **Enforced** | `loop_detector` (PostToolUse) — enforces recovery ladder by detecting and breaking retry loops |
| 7 | Checkpointing | Operational | **No hook** | Advisory — agents must produce checkpoints; no automated validation that they occur |
| 8 | Quality Standards | Quality | **No hook** | Advisory — "every code change must pass automated checks" but enforcement delegated to project CI, not Admiral hooks |
| 9 | Communication Format | Operational | **No hook** | Advisory — structured format documented but no parser/validator enforces it |
| 10 | Prohibitions | Safety | **Partial** | `token_budget_gate` (PreToolUse) enforces budget exhaustion prohibition; remaining 4 prohibitions are advisory only |
| 11 | Context Discovery | Operational | **Enforced** | `context_baseline` (SessionStart) + `context_health_check` (PostToolUse) — validates critical context presence |
| 12 | Zero-Trust Self-Protection | Safety | **No hook** | Advisory — establishes principles but relies on agent judgment for risk assessment |
| 13 | Bias Awareness | Integrity | **No hook** | Advisory — metacognitive discipline with no deterministic enforcement |
| 14 | Compliance, Ethics, Legal | Safety | **No hook** | Advisory — critical safety boundary but relies on agent judgment |
| 15 | Pre-Work Validation | Operational | **No hook** | Advisory — checklist of pre-work steps but no gate blocks work initiation without completing them |

-----

## Critical Gaps

### Safety-Tier Orders Without Hook Enforcement

These standing orders are classified as Safety-tier (highest priority) but lack deterministic enforcement:

**SO 3 — Scope Boundaries**
- Part 3, Section 08 explicitly classifies "Scope boundaries" as requiring hard enforcement via hooks.
- No hook currently validates that an agent operates within its assigned scope.
- **Recommended:** Implement a `scope_boundary_gate` (PreToolUse) that validates file paths and tool operations against the agent's declared scope.

**SO 10 — Prohibitions (4 of 5 unenforced)**
- Only budget exhaustion is hook-enforced (`token_budget_gate`).
- Unenforced prohibitions:
  1. No file modifications outside assigned scope
  2. No disabling enforcement mechanisms
  3. No storing secrets in plaintext
  4. No irreversible changes without explicit approval
- **Recommended:** Implement `scope_file_gate` (PreToolUse/Write/Edit) and `secret_detection` (PostToolUse) hooks.

**SO 12 — Zero-Trust Self-Protection**
- Principles are well-defined but entirely advisory.
- **Recommended:** Implement `input_validation` hook for external data sources.

**SO 14 — Compliance, Ethics, Legal**
- Critical safety boundary with zero deterministic enforcement.
- **Recommended:** At minimum, implement a `compliance_boundary_check` that validates actions against a configurable deny-list.

### Operational Orders Worth Enforcing

**SO 5 — Decision Authority**
- The Decision Authority framework (Part 09) defines clear tier assignments, but nothing prevents an agent from making an ESCALATE-tier decision autonomously.
- **Recommended:** Implement `decision_authority_gate` (PreToolUse) that intercepts high-risk actions and validates tier.

**SO 15 — Pre-Work Validation**
- Four checklist items (scope, Ground Truth, contracts, acceptance criteria) must be completed before work begins, but no gate blocks work initiation.
- **Recommended:** Implement `pre_work_gate` (SessionStart) that verifies all four items are present.

-----

## Enforcement Progression Path

As the framework matures through levels, enforcement coverage should increase:

| Level | Expected Coverage | Focus |
|-------|------------------|-------|
| Level 1 | 4/15 (current) | Budget, loops, identity, context — the runtime essentials |
| Level 2 | 8/15 (target) | Add scope boundaries, decision authority, pre-work validation, secret detection |
| Level 3 | 12/15 (target) | Add compliance boundaries, output routing validation, checkpoint verification, quality gate integration |
| Level 4 | 15/15 (target) | Full deterministic enforcement; all advisory orders graduate to hooks |
| Level 5 | 15/15 + cross-fleet | Cross-fleet enforcement coordination, multi-operator hook policies |

-----

## Spec Repository Self-Enforcement

The Admiral Framework must eat its own dogfood. While the spec repository is not a runtime fleet, it has analogous governance needs. The following spec-repo hooks enforce framework discipline on the spec itself:

| Spec-Repo Hook | Analogous Standing Order | What It Enforces | Manifest |
|---|---|---|---|
| `version_consistency` | SO 1 (Identity Discipline) | All files carry correct version string | `hooks/version_consistency/hook.manifest.json` |
| `manifest_freshness` | SO 11 (Context Discovery) | MANIFEST.md reflects actual file inventory | `hooks/manifest_freshness/hook.manifest.json` |
| `link_validator` | SO 4 (Context Honesty) | Markdown cross-references resolve to existing files | `hooks/link_validator/hook.manifest.json` |
| `standing_order_integrity` | SO 3 (Scope Boundaries) | All 15 Standing Orders present and numbered correctly | `hooks/standing_order_integrity/hook.manifest.json` |

These hooks are specification-only (manifests without executables), consistent with the framework's current state. They document the enforcement intent for the spec repository. Implementation targets:
- **Level 1 (current):** Manifest-only — enforcement is manual
- **Level 2:** CI workflow validation (`.github/workflows/spec-validation.yml`)
- **Level 3:** Live hooks in Claude Code (`.claude/hooks/`)

This progression mirrors the framework's own enforcement spectrum: start with documentation, graduate to CI, then to live hooks.

-----

## Cross-References

- Standing Orders source: `part11-protocols.md`
- Enforcement spectrum: `part3-enforcement.md`, Section 08
- Hook implementations: `hooks/` directory
- Hook manifest schema: `hooks/manifest.schema.json`
- Reference constants for hook behavior: `reference-constants.md`
