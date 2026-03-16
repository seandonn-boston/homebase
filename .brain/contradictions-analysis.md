# Internal Contradictions Analysis

**Date:** 2026-03-16
**Scope:** Unresolved contradictions weakening the Admiral Framework's underpinning claims

## Core Thesis Under Examination

> "Deterministic enforcement beats advisory guidance." — AGENTS.md line 7

---

## Critical Contradictions

### 1. Enforcement Coverage Rule Violates Itself

**Part 3 states:** "Security and scope constraints MUST be hook-enforced."

**Standing Orders Enforcement Map shows:** Only 5 of 15 Standing Orders have hook coverage. Safety-tier orders SO-12 (Zero-Trust) and SO-14 (Compliance/Ethics) are advisory-only. SO-3 (Scope Boundaries) has no hook despite Part 3 requiring one.

**Impact:** The framework's central claim demands enforcement, but its governance foundation is overwhelmingly advisory.

### 2. Token Budget Gate Paradox

**Part 3 specifies** `token_budget_gate` as an E1 enforcement hook (hard-block at 100% utilization).

**Reference-constants.md says** this hook was removed because it caused unrecoverable deadlocks.

**Part 3 is not updated** to reflect the removal.

**Impact:** The spec prescribes a mechanism known to cause system failure. Reveals that deterministic enforcement can be self-defeating, and that the spec is internally inconsistent.

### 3. PLAN.md Decoupled from Reality

- PLAN.md claims Phase 1.1 (version consistency at v0.7.0-alpha) is COMPLETE
- Actual codebase is at v0.8.5-alpha (three minor versions ahead)
- PLAN.md claims Phase 1.3 (Enforcement Language Refinement) is NOT STARTED, but Part 3 already contains the distinction it describes as needed

**Impact:** The governance tracking document is itself untracked.

---

## Moderate Contradictions

### 4. Standing Orders JSON vs Spec Text Divergence

SO-05 JSON requires brain queries before Propose/Escalate decisions. Part 11 spec text makes no such requirement, relegating brain integration to an advisory hook.

### 5. Spec Claims Hooks That Don't Exist

AGENTS.md references spec-repo hooks as deployed enforcement. Only hook manifests exist — no executable implementations.

### 6. Standing Orders Placement Acknowledged as Design Error

Index.md calls their Part 11 placement a "design error" and says they should come first. The error is documented but not fixed.

### 7. Spec Debt Outside Ground Truth Chain

`spec-debt.md` documents unresolved load-bearing decisions but AGENTS.md Ground Truth section does not reference it. Known unknowns are invisible to the governance system.

---

## Root Pattern

The project evolved faster than its governance artifacts could track, and the enforcement mechanisms meant to prevent drift don't exist yet. The framework's thesis — deterministic enforcement beats advisory guidance — is itself governed almost entirely by advisory guidance at this stage.

## Recommendations

1. **Immediate:** Reconcile Part 3 with reference-constants.md on token_budget_gate removal
2. **Immediate:** Update PLAN.md version references and phase completion status
3. **Short-term:** Reconcile SO-05 JSON with Part 11 spec text
4. **Short-term:** Add spec-debt.md to AGENTS.md Ground Truth section
5. **Medium-term:** Implement hook coverage for Safety-tier Standing Orders or revise Part 3 enforcement coverage rule to reflect phased rollout
