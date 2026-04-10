# TODO: Spec-to-Code Rebalance & Rating Re-Audit (Phase 22)

> Source: `plan/ROADMAP.md` Phase 22, `plan/stream-45-spec-code-rebalance-and-reaudit.md`

**Resolves rating-review weakness:** Spec-to-code ratio inverted — 365 Markdown vs 363 TS + 194 shell. Documentation outpaces runnable code.

**Phase exit:** Every `.md` tagged in `docs-inventory.json`. Speculative content under `research/future/`. Deferred items have plan tickets. Helm/ + admiral/ rating re-audit published with before/after delta. `plan/index.md` updated.

**This is the capstone of the Credibility Closure Tier.**

---

## Markdown Inventory

- [ ] **RB-01** — Tag every `.md` file as `implemented` / `in-progress` / `deferred` / `speculative` / `historical`. Output `docs/docs-inventory.json`.
- [ ] **RB-02** — Per-directory summary in `docs/docs-inventory-summary.md` with status-imbalance flags.

## Quarantine Speculative

- [ ] **RB-03** — Create `research/future/` with banner README and `scripts/check-future-references.sh` lint rule.
- [ ] **RB-04** — Move every `speculative` file to `research/future/`; update references; lint passes.

## Convert Deferred

- [ ] **RB-05** — Convert every `deferred` file without a corresponding plan item into a tracked plan ticket. Document in `docs/deferred-to-tickets.md`.

## Rating Re-Audit

- [ ] **RB-06** — Re-run helm/ rating audit (baseline 7.5/10). Output `docs/rating-audit-2026-post-phase-21-helm.md` with before/after per dimension.
- [ ] **RB-07** — Re-run admiral/ rating audit (baseline 6.8/10). Output `docs/rating-audit-2026-post-phase-21-admiral.md` with before/after per subdirectory.
- [ ] **RB-08** — Combine into `docs/rating-audit-2026-post-phase-21.md`. Include new Markdown-to-runnable-code ratio and per-weakness disposition (resolved / partial / outstanding).
- [ ] **RB-09** — Update `plan/index.md` score table with post-Phase-22 reality and the new ratio.
