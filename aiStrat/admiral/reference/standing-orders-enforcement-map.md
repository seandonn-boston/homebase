# Standing Orders → Enforcement Mechanism Map

> **Audience:** Implementers and auditors verifying that standing orders have deterministic enforcement where required. This document maps each of the 15 standing orders to its enforcement mechanism (or documents the gap).

-----

## Coverage Summary

- **Hook-enforced:** 8 of 15 (53%)
- **Partially enforced:** 0 of 15 (0%)
- **Advisory only (no hook):** 7 of 15 (47%)

The enforcement spectrum (part3-enforcement.md, Deterministic Enforcement) classifies constraints as requiring either **hard enforcement** (hooks) or **soft enforcement** (standing orders + agent compliance). Safety-critical orders should trend toward hard enforcement as the framework matures.

-----

## Complete Mapping

| SO # | Standing Order | Priority Tier | Hook Enforcement | Enforcement Mechanism |
|------|---------------|--------------|-----------------|----------------------|
| 1 | Identity Discipline | Safety | **Enforced** | `identity_validation` (SessionStart) — validates agent identity token and auth config artifact |
| 2 | Output Routing | Operational | **No hook** | Advisory — agents must route outputs to correct channels; no deterministic validation |
| 3 | Scope Boundaries | Safety | **Enforced** | `scope_boundary_guard` (PreToolUse) — validates file operations against protected directory boundaries; flags `aiStrat/`, `.github/workflows/`, `.claude/settings` modifications |
| 4 | Context Honesty | Integrity | **No hook** | Advisory — agents instructed to flag gaps and assumptions; no deterministic validation |
| 5 | Decision Authority | Operational | **No hook** | Advisory — references Decision Authority framework (Part 09) but no runtime hook enforces tier assignments |
| 6 | Recovery Protocol | Operational | **Enforced** | `loop_detector` (PostToolUse) — enforces recovery ladder by detecting and breaking retry loops |
| 7 | Checkpointing | Operational | **No hook** | Advisory — agents must produce checkpoints; no automated validation that they occur |
| 8 | Quality Standards | Quality | **No hook** | Advisory — "every code change must pass automated checks" but enforcement delegated to project CI, not Admiral hooks |
| 9 | Communication Format | Operational | **No hook** | Advisory — structured format documented but no parser/validator enforces it |
| 10 | Prohibitions | Safety | **Enforced** | `prohibitions_enforcer` (PreToolUse) — detects enforcement bypass patterns, secret/credential exposure, and irreversible operations; `token_budget_checkpoint` (PreToolUse) warns on budget exhaustion |
| 11 | Context Discovery | Operational | **Advisory** | `context_baseline` (SessionStart) + `context_health_check` (PostToolUse) — warns if critical context missing (advisory, never blocks) |
| 12 | Zero-Trust Self-Protection | Safety | **Enforced** | `zero_trust_validator` (PostToolUse) — flags untrusted external data (WebFetch/WebSearch), detects prompt injection markers, assesses blast radius of write operations, flags excessive access scope |
| 13 | Bias Awareness | Integrity | **No hook** | Advisory — metacognitive discipline with no deterministic enforcement |
| 14 | Compliance, Ethics, Legal | Safety | **No hook** | Advisory — critical safety boundary but relies on agent judgment |
| 15 | Pre-Work Validation | Operational | **Enforced** | `pre_work_validator` (PreToolUse) — validates Standing Orders loaded, budget defined, and sufficient context gathered before first substantive write operation |

-----

## Critical Gaps

### Safety-Tier Orders Without Hook Enforcement

One safety-tier order remains without hook enforcement:

**SO 14 — Compliance, Ethics, Legal**
- Critical safety boundary with zero deterministic enforcement.
- **Recommended:** At minimum, implement a `compliance_boundary_check` that validates actions against a configurable deny-list.

### Resolved Safety-Tier Gaps (E2)

The following safety-tier gaps were resolved in E2:

- **SO 3 — Scope Boundaries:** `scope_boundary_guard` (PreToolUse) validates file operations against protected directory boundaries.
- **SO 10 — Prohibitions:** `prohibitions_enforcer` (PreToolUse) detects enforcement bypass, secret exposure, and irreversible operations. Combined with existing `token_budget_checkpoint` for budget rule.
- **SO 12 — Zero-Trust Self-Protection:** `zero_trust_validator` (PostToolUse) flags untrusted external data, detects prompt injection markers, assesses blast radius, and flags excessive scope.

### Operational Orders Worth Enforcing

**SO 5 — Decision Authority**
- The Decision Authority framework (Part 09) defines clear tier assignments, but nothing prevents an agent from making an ESCALATE-tier decision autonomously.
- **Recommended:** Implement `decision_authority_gate` (PreToolUse) that intercepts high-risk actions and validates tier.

### Resolved Operational Gaps (E2)

- **SO 15 — Pre-Work Validation:** `pre_work_validator` (PreToolUse) validates Standing Orders loaded, budget defined, and sufficient context gathered before first substantive write operation.

-----

## Enforcement Progression Path

As the framework matures through levels, enforcement coverage should increase:

| Enforcement Level | Expected Coverage | Focus |
|-------------------|------------------|-------|
| E1 | 4/15 (achieved) | Budget, loops, identity, context — the runtime essentials |
| E2 | 8/15 (current) | Added scope boundaries, prohibitions enforcement, zero-trust validation, pre-work validation |
| E3 | 12/15 (target) | Add compliance boundaries, output routing validation, checkpoint verification, quality gate integration |
| E3 + Production profile | 15/15 (target) | Full deterministic enforcement; all advisory orders graduate to hooks |
| E3 + Enterprise profile | 15/15 + cross-fleet | Cross-fleet enforcement coordination, multi-operator hook policies |

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
- **E1 (current):** Manifest-only — enforcement is manual
- **E2:** CI workflow validation (`.github/workflows/spec-validation.yml`)
- **E3:** Live hooks in Claude Code (`.claude/hooks/`)

This progression mirrors the framework's own enforcement spectrum: start with documentation, graduate to CI, then to live hooks.

-----

## Cross-References

- Standing Orders source: `../spec/part11-protocols.md`
- Enforcement spectrum: `../spec/part3-enforcement.md`, Deterministic Enforcement
- Hook implementations: `hooks/` directory
- Hook manifest schema: `hooks/manifest.schema.json`
- Reference constants for hook behavior: `reference-constants.md`
