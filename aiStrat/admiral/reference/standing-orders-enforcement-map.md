# Standing Orders → Enforcement Mechanism Map

> **Audience:** Implementers and auditors verifying that standing orders have deterministic enforcement where required. This document maps each of the 16 standing orders to its enforcement mechanism (or documents the gap).

-----

## Coverage Summary

- **Hook-enforced:** 8 of 16 (50%)
- **Partially enforced:** 0 of 16 (0%)
- **Advisory only (no hook):** 8 of 16 (50%)

**By mechanism type:**

| Mechanism | Count | Standing Orders | Hook Coverage |
|-----------|-------|----------------|---------------|
| **Mechanical** | 6 | SO 1, 3, 6, 8, 10, 15 | 5/6 (83%) — SO 8 (Quality Standards) is mechanical but delegates to project CI |
| **Judgment-Assisted** | 7 | SO 5, 7, 9, 11, 12, 14, 16 | 2/7 (29%) — SO 11, 12 have advisory hooks; SO 5, 7, 9, 14, 16 have no hooks |
| **Advisory** | 3 | SO 2, 4, 13 | 0/3 (0%) — no deterministic check possible |

The enforcement spectrum (part3-enforcement.md, Deterministic Enforcement) classifies constraints as requiring either **enforcement** (hooks that block) or **monitoring** (hooks that observe and alert). Safety-critical orders should trend toward enforcement hooks; judgment-assisted orders should trend toward monitoring hooks. Advisory orders remain instruction-only by design.

-----

## Mechanism Classification

Each standing order is classified by the **type of mechanism** required to uphold it:

| Mechanism | Definition | Enforcement Implication |
|-----------|-----------|----------------------|
| **Mechanical** | Can be checked by a deterministic program with zero judgment. Binary pass/fail. | Must be a hook. Agent compliance is irrelevant — the check fires regardless. |
| **Judgment-Assisted** | Requires agent interpretation, but a hook can detect violations or provide advisory context to assist. | Hook provides monitoring/alerting; agent applies judgment within the hook's guardrails. |
| **Advisory** | Inherently requires agent judgment with no deterministic check possible. | Relies on standing order text in context. No hook can meaningfully enforce this. |

## Complete Mapping

| SO # | Standing Order | Priority Tier | Mechanism | Hook Enforcement | Enforcement Mechanism |
|------|---------------|--------------|-----------|-----------------|----------------------|
| 1 | Identity Discipline | Safety | **Mechanical** | **Enforced** | `identity_validation` (SessionStart) — validates agent identity token and auth config artifact |
| 2 | Output Routing | Operational | **Advisory** | **No hook** | Advisory — agents must route outputs to correct channels; no deterministic validation possible (routing correctness requires semantic understanding) |
| 3 | Scope Boundaries | Safety | **Mechanical** | **Enforced** | `scope_boundary_guard` (PreToolUse) — validates file operations against protected directory boundaries; flags `aiStrat/`, `.github/workflows/`, `.claude/settings` modifications |
| 4 | Context Honesty | Integrity | **Advisory** | **No hook** | Advisory — agents instructed to flag gaps and assumptions; confidence assessment is inherently a judgment call |
| 5 | Decision Authority | Operational | **Judgment-Assisted** | **No hook** | Advisory — references Decision Authority framework (Part 09) but no runtime hook enforces tier assignments. A hook could detect Propose/Escalate-tier keywords in autonomous actions (judgment-assisted), but full enforcement requires semantic understanding of decision scope |
| 6 | Recovery Protocol | Operational | **Mechanical** | **Enforced** | `loop_detector` (PostToolUse) — enforces recovery ladder by detecting and breaking retry loops via `(hook_name, error_signature)` tuple tracking |
| 7 | Checkpointing | Operational | **Judgment-Assisted** | **No hook** | Advisory — agents must produce checkpoints. A hook could verify checkpoint artifacts exist at task boundaries (mechanical component), but checkpoint completeness requires judgment |
| 8 | Quality Standards | Quality | **Mechanical** | **No hook** | Advisory — "every code change must pass automated checks" but enforcement delegated to project CI, not Admiral hooks. Fully mechanical when CI gates exist; the gap is Admiral hook integration, not mechanism type |
| 9 | Communication Format | Operational | **Judgment-Assisted** | **No hook** | Advisory — structured format documented but no parser/validator enforces it. A hook could validate structural elements (AGENT, TASK, STATUS fields present) while content quality requires judgment |
| 10 | Prohibitions | Safety | **Mechanical** | **Enforced** | `prohibitions_enforcer` (PreToolUse) — detects enforcement bypass patterns, secret/credential exposure, and irreversible operations; `token_budget_checkpoint` (PreToolUse) warns on budget exhaustion |
| 11 | Context Discovery | Operational | **Judgment-Assisted** | **Advisory** | `context_baseline` (SessionStart) + `context_health_check` (PostToolUse) — warns if critical context missing (advisory, never blocks). Hook detects missing context mechanically; agent decides whether context is sufficient (judgment) |
| 12 | Zero-Trust Self-Protection | Safety | **Judgment-Assisted** | **Enforced** | `zero_trust_validator` (PostToolUse) — flags untrusted external data (WebFetch/WebSearch), detects prompt injection markers, assesses blast radius of write operations, flags excessive access scope. Hook detects risk signals mechanically; agent applies risk assessment judgment |
| 13 | Bias Awareness | Integrity | **Advisory** | **No hook** | Advisory — metacognitive discipline with no deterministic enforcement; bias recognition is inherently a judgment activity |
| 14 | Compliance, Ethics, Legal | Safety | **Judgment-Assisted** | **No hook** | Advisory — critical safety boundary but relies on agent judgment. A hook could enforce a configurable deny-list (mechanical component) while legal/ethical judgment remains advisory |
| 15 | Pre-Work Validation | Operational | **Mechanical** | **Enforced** | `pre_work_validator` (PreToolUse) — validates Standing Orders loaded, budget defined, and sufficient context gathered before first substantive write operation |
| 16 | Protocol Governance | Operational | **Judgment-Assisted** | **No hook** | Advisory — MCP server registration and A2A connection testing are partially mechanical (server name against approved list), but trust classification and security review require judgment. A `protocol_registry_guard` PreToolUse hook could enforce the mechanical component. |

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
| E1 | 4/16 (achieved) | Budget, loops, identity, context — the runtime essentials |
| E2 | 8/16 (current) | Added scope boundaries, prohibitions enforcement, zero-trust validation, pre-work validation |
| E3 | 12/16 (target) | Add compliance boundaries, output routing validation, checkpoint verification, quality gate integration |
| E3 + Production profile | 16/16 (target) | Full deterministic enforcement; all advisory orders graduate to hooks |
| E3 + Enterprise profile | 16/16 + cross-fleet | Cross-fleet enforcement coordination, multi-operator hook policies |

-----

## Spec Repository Self-Enforcement

The Admiral Framework must eat its own dogfood. While the spec repository is not a runtime fleet, it has analogous governance needs. The following spec-repo hooks enforce framework discipline on the spec itself:

| Spec-Repo Hook | Analogous Standing Order | What It Enforces | Manifest |
|---|---|---|---|
| `version_consistency` | SO 1 (Identity Discipline) | All files carry correct version string | `hooks/version_consistency/hook.manifest.json` |
| `manifest_freshness` | SO 11 (Context Discovery) | MANIFEST.md reflects actual file inventory | `hooks/manifest_freshness/hook.manifest.json` |
| `link_validator` | SO 4 (Context Honesty) | Markdown cross-references resolve to existing files | `hooks/link_validator/hook.manifest.json` |
| `standing_order_integrity` | SO 3 (Scope Boundaries) | All 16 Standing Orders present and numbered correctly | `hooks/standing_order_integrity/hook.manifest.json` |

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
