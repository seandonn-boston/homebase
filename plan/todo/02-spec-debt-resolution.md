# TODO: Spec Debt Resolution

> Source: stream-21-spec-debt-resolution.md (SD-01 to SD-12)

All deliverables in this stream are specification proposals written to `docs/spec-proposals/`, not code. The `aiStrat/` directory is read-only and requires Admiral approval for modifications.

---

## Inventory and Prioritization

- [ ] **SD-01: Document all spec-debt items as plan tasks with resolution paths** — Audit `spec-debt.md` and `spec-gaps.md` comprehensively; for each active debt item, document the affected spec section, nature of the gap, downstream implementation impact, and proposed resolution path.
- [ ] **SD-02: Identify which spec gaps block implementation and prioritize accordingly** — Cross-reference the debt inventory against all plan streams; classify each gap as blocking, constraining, or cosmetic and produce a prioritized resolution queue.

## Amendment Proposals

- [ ] **SD-03: Create spec amendment proposals for each active gap** — Write a formal proposal per gap in standard format (Gap ID, affected section, current text, proposed text, rationale, impact assessment) under `docs/spec-proposals/amendments/`.

## Enforcement and Compliance Completeness

- [ ] **SD-04: Standing Orders enforcement map completion** — For each of the 8 advisory-only SOs, propose a hook or document why it is inherently advisory with alternative monitoring; address the SO-14 (Compliance, Ethics, Legal) safety-tier gap specifically.
- [ ] **SD-05: Hook manifest completeness audit** — Cross-reference all spec-referenced hooks against actual manifests in `aiStrat/hooks/` and implementations in `.hooks/`; identify missing manifests, orphan manifests, and propose new manifest content.
- [ ] **SD-06: Reference constants implementation audit** — Audit `reference-constants.md` against the codebase; verify every constant is implemented and matches spec values; create a constants registry at `admiral/config/reference_constants.sh`.

## Spec Versioning and Compliance

- [ ] **SD-07: Spec version tracking manifest** — Create a manifest mapping each implementation component to the spec version it targets, with a "spec compliance gap" indicator showing where implementation lags behind the current spec.
- [ ] **SD-08: Spec compliance testing** — Create automated tests under `admiral/tests/spec_compliance/` that verify implementation matches spec requirements, with at least one compliance test per spec part (Parts 1-12).
- [ ] **SD-09: Spec changelog bridge document** — Establish a changelog bridge mapping spec versions to implementation status, computing a "spec freshness" score and flagging spec changes not yet reflected in implementation.

## Spec Gap Proposals — Underspecified Areas

- [ ] **SD-10: Spec gap proposal — Fleet orchestration protocol details** — Propose concrete protocol definitions for agent selection, unavailability handling, task assignment format, dependency tracking, and Orchestrator context management.
- [ ] **SD-11: Spec gap proposal — Brain graduation automation** — Propose answers for graduation initiation authority, reversibility, migration process, Brain availability during migration, and dry-run/shadow mode.
- [ ] **SD-12: Spec gap proposal — Cross-platform hook normalization** — Define a canonical hook interface, handling of platform-limited lifecycle events, payload normalization, a platform compatibility matrix template, and management of platform-specific hooks.

---

## Dependencies

| Task | Depends on |
|------|-----------|
| SD-02 | SD-01 |
| SD-03 | SD-01, SD-02 |
| SD-04 | — |
| SD-05 | — |
| SD-06 | — |
| SD-07 | — |
| SD-08 | SD-06, SD-07 |
| SD-09 | SD-07 |
| SD-10 | SD-01 |
| SD-11 | SD-01 |
| SD-12 | SD-01 |
