# Internal Contradictions Analysis

**Date:** 2026-03-17
**Scope:** Tracking contradictions in the Admiral Framework, with resolution status and evidence

## Core Thesis Under Examination

> "Deterministic enforcement beats advisory guidance." — AGENTS.md line 7

---

## Resolved Contradictions

### ~~1. Enforcement Coverage Rule Violates Itself~~ → PARTIALLY RESOLVED

**Original finding:** Part 3 states "Security and scope constraints MUST be hook-enforced." Only 5 of 15 Standing Orders had hook coverage. Safety-tier orders SO-12 (Zero-Trust) and SO-14 (Compliance/Ethics) were advisory-only. SO-3 (Scope Boundaries) had no enforcement despite Part 3 requiring it.

**Resolution:**
- **SO-03 (Scope Boundaries):** Upgraded from advisory to conditional enforcement — hard-blocks writes to protected paths (exit 2), allows reads (exit 0). Session override via `ADMIRAL_SCOPE_OVERRIDE` lets the Admiral pre-authorize access without disabling enforcement globally. Verified by design rule: after blocking a write, agent retains read, escalation, and alternative paths.
- **SO-12 (Zero-Trust):** Upgraded to selective enforcement — hard-blocks privilege escalation attempts (`sudo`, `chmod 777`), remains advisory for blast-radius and untrusted data warnings (which require judgment).
- **SO-14 (Compliance/Ethics):** New advisory hook (`compliance_ethics_advisor.sh`) flags PII patterns and compliance-sensitive writes. Remains advisory because compliance determinations are inherently judgment-based — hard enforcement would create false positives.
- **Theoretical foundation:** The Privileged Escalation Guarantee (Part 3) resolves the apparent tension between "enforcement beats advisory" and the practical need for advisory monitoring. Enforcement works for *action-specific* dangerous operations (where blocking one action leaves alternatives). Monitoring works for *state-level* awareness (where blocking all actions creates deadlocks). The Escalation Resolution System (Part 11) ensures monitoring-surfaced concerns still have teeth — they route to the Admiral for structured resolution.

**Remaining gap:** 8 of 15 Standing Orders still have no hook coverage. The enforcement coverage rule is satisfied for security and scope categories; governance and process categories remain advisory by design (they require judgment, not deterministic checks). Part 3's enforcement coverage rule should be clarified to distinguish between enforceable constraints (deterministic check exists) and judgment-requiring constraints (advisory + escalation is the correct pattern).

**Evidence:** Part 3 Privileged Escalation Guarantee, Part 11 Escalation Resolution System, `.hooks/scope_boundary_guard.sh`, `.hooks/zero_trust_validator.sh`, `.hooks/compliance_ethics_advisor.sh`

### ~~2. Token Budget Gate Paradox~~ → RESOLVED

**Original finding:** Part 3 specified `token_budget_gate` as an E1 enforcement hook (hard-block at 100% utilization). Reference-constants.md said this hook was removed because it caused unrecoverable deadlocks. Part 3 was not updated to reflect the removal.

**Resolution:** Part 3 now explicitly documents the replacement: `token_budget_checkpoint` (monitoring, always exit 0) replaced the original `token_budget_gate` (enforcement, exit 2). The Note field in the hook specification explains why. The Privileged Escalation Guarantee formalizes the design principle: no hook may hard-block in a way that eliminates all agent paths, including escalation. The enforcement/monitoring distinction table in Part 3 uses this exact case as the canonical example.

**Evidence:** Part 3 `token_budget_checkpoint` hook spec (line ~167), Part 3 Privileged Escalation Guarantee, `aiStrat/admiral/reference/reference-constants.md`

### ~~3. PLAN.md Decoupled from Reality~~ → RESOLVED

**Original finding:** PLAN.md claimed Phase 1.1 (version consistency at v0.7.0-alpha) was COMPLETE while actual codebase was at v0.8.5-alpha. Phase 1.3 (Enforcement Language Refinement) was listed as NOT STARTED but Part 3 already contained the distinction.

**Resolution:** PLAN.md has been updated. All Phase 1 milestones are marked Complete with accurate exit criteria. New milestone added for "Enforcement thesis resolution" tracking the Privileged Escalation Guarantee and Escalation Resolution System work.

**Evidence:** `PLAN.md` Phase 1 and Phase 3 milestone tables

---

## Moderate Contradictions

### 4. Standing Orders JSON vs Spec Text Divergence → ACKNOWLEDGED

SO-05 JSON requires brain queries before Propose/Escalate decisions. Part 11 spec text makes no such requirement, relegating brain integration to an advisory hook (`brain_context_router`).

**Status:** The divergence is intentional at the current profile level. The JSON represents the target behavior; the spec text reflects the enforcement-possible behavior. The `brain_context_router` hook bridges the gap by detecting Propose/Escalate decisions without prior `brain_query` and emitting advisory alerts. Full enforcement (hard-block on missing brain_query) is deferred to E2+ when the Brain MCP server is production-stable.

### 5. Spec Claims Hooks That Don't Exist → PARTIALLY RESOLVED

AGENTS.md references spec-repo hooks as deployed enforcement. Only hook manifests existed — no executable implementations.

**Status:** As of v0.8.5-alpha, 12 executable hooks exist in `.hooks/` with 34+ unit tests. The enforcement gap identified in SD-01 (spec-debt) has been resolved. Remaining gap: hooks specified in Part 3 for E2+ and E3+ deployment levels do not have implementations yet, which is by design (they await their consumers).

### 6. Standing Orders Placement Acknowledged as Design Error → OPEN

Index.md calls their Part 11 placement a "design error" and says they should come first. The error is documented but not fixed.

**Status:** Unchanged. This is a spec organization issue, not a functional one. The `PREREQUISITE: Read Standing Orders (Part 11)` note in Part 3 mitigates the reading-order problem. A full reorder would require renumbering all cross-references.

### 7. Spec Debt Outside Ground Truth Chain → RESOLVED

`spec-debt.md` documents unresolved load-bearing decisions but AGENTS.md Ground Truth section did not reference it. Known unknowns were invisible to the governance system.

**Resolution:** `spec-debt.md` added to AGENTS.md Ground Truth section.

**Evidence:** `AGENTS.md` Ground Truth section

---

## Root Pattern — Revised

The original analysis concluded: "The framework's thesis — deterministic enforcement beats advisory guidance — is itself governed almost entirely by advisory guidance at this stage."

**Updated assessment:** The framework now has a defensible enforcement model with three layers:

1. **Deterministic enforcement** (hooks with exit 2) — for action-specific dangerous operations where a deterministic check exists and blocking one action leaves alternatives. SO-10 (Prohibitions), SO-03 (Scope Boundaries), SO-12 (Zero-Trust privilege escalation).

2. **Deterministic monitoring** (hooks with exit 0 + alerts) — for state-level awareness and judgment-requiring constraints where hard-blocking would create deadlocks or false positives. Token budget, loop detection, context health, untrusted data, compliance patterns.

3. **Guaranteed escalation path** — the Privileged Escalation Guarantee ensures monitoring-surfaced concerns and enforcement blocks always have a resolution path. The Escalation Resolution System (Part 11) catches escalations, evaluates them with Brain precedent, generates recommended resolution paths, and presents the Admiral with structured decision options (continue, redirect, stop).

The thesis "deterministic enforcement beats advisory guidance" holds because:
- Advisory alone is insufficient (context pressure degrades compliance)
- Enforcement alone is insufficient (it can deadlock)
- Enforcement + monitoring + guaranteed escalation resolution = a closed loop where every constraint is either enforced deterministically, monitored with escalation teeth, or both

## Remaining Recommendations

1. **Short-term:** Clarify Part 3 enforcement coverage rule to distinguish enforceable constraints (deterministic check exists) from judgment-requiring constraints (advisory + escalation is correct)
2. **Medium-term:** Implement E2+ hooks (governance heartbeat, tier validation) when their consumers exist
3. **Medium-term:** Fix Standing Orders placement (Part 11 → earlier in spec) if a major version change provides the opportunity
