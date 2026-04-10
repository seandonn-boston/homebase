# Stream 45: Spec-to-Code Rebalance & Rating Re-Audit

> Close the loop on the Phase 14+ rating audit. Inventory every Markdown file, tag each as implemented/in-progress/deferred/speculative/historical, quarantine speculative content under `research/future/`, and re-run the helm/ and admiral/ rating exercise against the post-Phase-21 codebase. Publish the before/after delta. **This is the capstone of the Credibility Closure Tier.**

**Phase:** 22 — Spec-to-Code Ratio Rebalance & Rating Re-Audit (Credibility Closure Tier)

**Scope:** The Phase 14+ rating review counted 365 Markdown files vs 363 TS + 194 shell — specs, plans, and research compounded faster than running code. This stream tags every `.md` file with one of five status labels, moves speculative content to a clearly-labeled `research/future/` zone, converts deferred items into tracked plan tickets, and re-runs the helm/ + admiral/ rating audit to quantify whether Phases 15–21 actually moved the needle.

**Resolves rating-review weakness:** "Spec-to-code ratio inverted — 365 MD vs 363 TS + 194 sh; documentation outpaces runnable code."

**Principle:** A spec that nothing implements is a wish. A wish unmarked is misleading. Quantifying the gap is the prerequisite to closing it.

---

## 45.1 Markdown Inventory

- [ ] **RB-01: Tag every `.md` file with a status label**
  - **Description:** Walk every directory containing Markdown (`aiStrat/`, `research/`, `thesis/`, `plan/`, `docs/`, root) and produce a tagged inventory. For each `.md` file, assign one of: `implemented` (the spec/plan corresponds to running code), `in-progress` (active work), `deferred` (acknowledged for later, has a tracking ticket), `speculative` (forward-looking, no tracked work), `historical` (records past decisions, e.g., ADRs and audit reports). Output as `docs/docs-inventory.json`.
  - **Done when:** Every `.md` file has a tag in `docs-inventory.json`. Total file count matches `find . -name '*.md' -not -path './.git/*' | wc -l`.
  - **Files:** `docs/docs-inventory.json` (new), `scripts/inventory-docs.sh` (new)
  - **Size:** L
  - **Depends on:** Phases 15–21 (so the inventory reflects post-tier reality)

- [ ] **RB-02: Produce per-directory summary report**
  - **Description:** Aggregate `docs-inventory.json` into a per-directory summary in `docs/docs-inventory-summary.md`. For each directory, report: total `.md` count, count by status label, and any status-imbalance flags (e.g., `aiStrat/` is 90%+ `implemented` after Phases 15–21, but `research/` is 60%+ `speculative`).
  - **Done when:** Summary report exists with per-directory aggregation.
  - **Files:** `docs/docs-inventory-summary.md` (new)
  - **Size:** S
  - **Depends on:** RB-01

## 45.2 Quarantine Speculative Content

- [ ] **RB-03: Create `research/future/` with banner READMEs**
  - **Description:** Create a `research/future/` subdirectory with a top-level `README.md` declaring: "This directory contains speculative or forward-looking content that is not part of the implemented framework. Files here describe possible future directions, hypothetical features, or thought experiments. None of this content represents a commitment or a tracked plan item." Add a CI lint rule that fails if any file under `research/future/` is referenced from `aiStrat/`, `admiral/`, or `plan/` (since those are the implementation tiers).
  - **Done when:** `research/future/` exists with banner README and the cross-reference lint rule.
  - **Files:** `research/future/README.md` (new), `scripts/check-future-references.sh` (new)
  - **Size:** S
  - **Depends on:** —

- [ ] **RB-04: Move `speculative` files to `research/future/`**
  - **Description:** For every `.md` tagged `speculative` in RB-01, move it to `research/future/`. Preserve the relative path (e.g., `research/future-operations.md` → `research/future/future-operations.md` if it was tagged speculative). Update any references in non-implementation tiers (other research/, thesis/, README, etc.).
  - **Done when:** Every `speculative` file is under `research/future/`. References updated. Cross-reference lint passes.
  - **Files:** Multiple file moves
  - **Size:** M
  - **Depends on:** RB-01, RB-03

## 45.3 Convert Deferred to Tracked

- [ ] **RB-05: Convert `deferred` items to plan tickets**
  - **Description:** For every `.md` tagged `deferred` in RB-01 that does not already have a corresponding plan item, create a plan item in the appropriate stream file (or open a new lightweight stream if no fit exists). Each new plan item must reference the source `.md` and assign a phase. Document each conversion in `docs/deferred-to-tickets.md`.
  - **Done when:** Every `deferred` file has a corresponding plan item. Conversion log exists.
  - **Files:** `plan/stream-*.md` (extensions), `docs/deferred-to-tickets.md` (new)
  - **Size:** L
  - **Depends on:** RB-01

## 45.4 Rating Re-Audit

- [ ] **RB-06: Re-run helm/ rating audit against post-Phase-21 codebase**
  - **Description:** Repeat the helm/ rating exercise from `docs/rating-audit-2026-post-phase-14.md`. Score every dimension on the 1-10 scale (Top-level files, control-plane, aiStrat, plan, docs, hooks, .github, fleet/monitor/etc, scripts). For each dimension, document: previous score (from baseline 7.5/10 overall), new score, evidence cited, what changed. Output as `docs/rating-audit-2026-post-phase-21-helm.md`.
  - **Done when:** Re-audit document exists with before/after scores per dimension and evidence.
  - **Files:** `docs/rating-audit-2026-post-phase-21-helm.md` (new)
  - **Size:** L
  - **Depends on:** RB-01, RB-04, RB-05

- [ ] **RB-07: Re-run admiral/ rating audit against post-Phase-21 codebase**
  - **Description:** Repeat the admiral/ rating exercise. Score per subdirectory (lib, tests, standing-orders, schemas, security/governance/quality, brain/fleet/knowledge/intent/context, bin/config/monitor, docs/top-level). For each, document previous score (baseline 6.8/10), new score, evidence, what changed. Pay particular attention to the `so_enforcement.sh` stub closure (Phase 18) and the orphaned-module reconnection (Phase 19). Output as `docs/rating-audit-2026-post-phase-21-admiral.md`.
  - **Done when:** Re-audit document exists with before/after scores per subdirectory and evidence.
  - **Files:** `docs/rating-audit-2026-post-phase-21-admiral.md` (new)
  - **Size:** L
  - **Depends on:** RB-01, RB-04, RB-05

- [ ] **RB-08: Publish the rating delta and Markdown ratio**
  - **Description:** Combine RB-06 and RB-07 into a single `docs/rating-audit-2026-post-phase-21.md` summary with: (1) helm/ before/after table, (2) admiral/ before/after table, (3) the new Markdown-to-runnable-code ratio (recompute the file counts that produced 365 MD vs 363 TS + 194 shell), (4) a bullet list of every weakness from the original audit and its disposition (resolved / partially-resolved / outstanding), (5) the next action if any weakness remains.
  - **Done when:** Combined summary exists with the rating delta, the new file ratio, and the per-weakness disposition.
  - **Files:** `docs/rating-audit-2026-post-phase-21.md` (new)
  - **Size:** M
  - **Depends on:** RB-06, RB-07

- [ ] **RB-09: Update `plan/index.md` with the new scores**
  - **Description:** Update the score table at the top of `plan/index.md` to reflect the post-Phase-22 reality. Update the "Last updated" date. Add a row for "Spec-to-code ratio" with the new number from RB-08.
  - **Done when:** `plan/index.md` reflects the new scores and the new ratio.
  - **Files:** `plan/index.md`
  - **Size:** S
  - **Depends on:** RB-08

---

## Dependencies

| Item | Depends on |
|------|-----------|
| RB-01 (inventory) | Phases 15–21 (post-tier reality) |
| RB-02 (summary) | RB-01 |
| RB-03 (future/ dir) | — |
| RB-04 (move speculative) | RB-01, RB-03 |
| RB-05 (defer to tickets) | RB-01 |
| RB-06 (helm re-audit) | RB-01, RB-04, RB-05 |
| RB-07 (admiral re-audit) | RB-01, RB-04, RB-05 |
| RB-08 (delta publish) | RB-06, RB-07 |
| RB-09 (plan/index.md) | RB-08 |

---

## Exit Criteria

- Every `.md` file has a status tag in `docs-inventory.json`.
- `research/future/` exists with a banner README and the cross-reference lint rule.
- Every `speculative` file is under `research/future/`.
- Every `deferred` file has a corresponding plan ticket.
- Helm/ and admiral/ rating audits are re-run with before/after scores per dimension.
- The new Markdown-to-runnable-code ratio is published.
- `plan/index.md` reflects the post-Phase-22 scores.
- Per-weakness disposition (resolved / partial / outstanding) is published for every weakness from the original audit.
