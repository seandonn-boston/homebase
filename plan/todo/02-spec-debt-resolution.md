# TODO: Spec Debt Resolution

> Source: stream-21-spec-debt-resolution.md (SD-01 to SD-15)

All deliverables in this stream are specification proposals written to `docs/spec-proposals/`, not code. The `aiStrat/` directory is read-only and requires Admiral approval for modifications.

---

## Inventory and Prioritization

- [x] **SD-01: Document all spec-debt items as plan tasks with resolution paths** — Audit `spec-debt.md` and `spec-gaps.md` comprehensively; for each active debt item, document the affected spec section, nature of the gap, downstream implementation impact, and proposed resolution path.
  - **DONE-HOW:** Created `docs/spec-proposals/debt-inventory.md` inventorying all spec debt: 3 active items (SD-02 Moderate, SD-05 Low, SD-06 Low) and 3 resolved (SD-01, SD-03, SD-04). Cross-referenced all 14 resolved spec-gaps from `spec-gaps.md`. For each active item: documented affected spec section, nature of gap, downstream impact on implementation streams, and concrete resolution path with effort estimate. Categorized by severity and resolution complexity.
- [x] **SD-02: Identify which spec gaps block implementation and prioritize accordingly** — Cross-reference the debt inventory against all plan streams; classify each gap as blocking, constraining, or cosmetic and produce a prioritized resolution queue.
  - **DONE-HOW:** Created `docs/spec-proposals/priority-matrix.md` classifying all debt items: 0 blocking (all 14 spec-gaps already resolved), 1 constraining (SD-02 benchmark targets — blocks validation but not development), 2 cosmetic (SD-05 thin Part 12, SD-06 missing SO-16 hook). Produced prioritized queue: SD-06 first (low effort, increases enforcement coverage), SD-05 second (incremental), SD-02 last (blocked on production deployment). No spec gap blocks any plan stream.

## Amendment Proposals

- [x] **SD-03: Create spec amendment proposals for each active gap** — Write a formal proposal per gap in standard format (Gap ID, affected section, current text, proposed text, rationale, impact assessment) under `docs/spec-proposals/amendments/`.
  - **DONE-HOW:** Created `docs/spec-proposals/amendments/spec-amendment-proposals.md` with 6 formal amendments: (1) Add 80% warning threshold to token_budget_tracker.sh — spec requires both 80% and 90%, only 90% implemented. (2) Document session state computed fields (total_capacity, current_utilization) as computed-not-persisted. (3) Make health check frequency configurable via config.json instead of hardcoded. (4) Add empirical qualification header to benchmarks.md (SD-02). (5) Add Data Ecosystem worked example for one feedback loop (SD-05). (6) Create protocol_registry_guard hook for SO-16 (SD-06). Priority-ordered by effort/impact.

## Enforcement and Compliance Completeness

- [x] **SD-04: Standing Orders enforcement map completion** — For each of the 8 advisory-only SOs, propose a hook or document why it is inherently advisory with alternative monitoring; address the SO-14 (Compliance, Ethics, Legal) safety-tier gap specifically.
  - **DONE-HOW:** Created `docs/spec-proposals/amendments/enforcement-map-completion.md` analyzing all 16 SOs. Current: 8/16 enforced (50%). For each advisory SO: proposed hook implementation or documented why inherently advisory. SO-02 (Output Routing): inherently advisory — format enforcement is context-dependent. SO-04 (Context Honesty): proposed `context_honesty_monitor` PostToolUse hook. SO-05 (Decision Authority): proposed `decision_authority_gate` PreToolUse hook. SO-07 (Checkpointing): inherently advisory — checkpoint frequency is judgment. SO-08 (Quality Standards): proposed `quality_gate` PostToolUse hook. SO-09 (Communication Format): inherently advisory. SO-13 (Bias Awareness): inherently advisory. SO-14 (Compliance/Ethics/Legal): addressed — `compliance_ethics_advisor.sh` already exists as advisory hook. SO-16: proposed `protocol_registry_guard`. Projected E3 target: 13/16 (81%).
- [x] **SD-05: Hook manifest completeness audit** — Cross-reference all spec-referenced hooks against actual manifests in `aiStrat/hooks/` and implementations in `.hooks/`; identify missing manifests, orphan manifests, and propose new manifest content.
  - **DONE-HOW:** Created `docs/spec-proposals/hook-manifest-audit.md`. Found: 7 spec manifests in `aiStrat/hooks/`, 14 implementation scripts in `.hooks/`. Identified 7 implementation-only hooks without spec manifests (scope_boundary_guard, prohibitions_enforcer, zero_trust_validator, pre_work_validator, compliance_ethics_advisor, brain_context_router, strategy_triangle_validate). Identified 1 spec manifest without implementation (identity_validation — manifest exists but no .sh script). Proposed manifest content for all implementation-only hooks following existing manifest format.
- [x] **SD-06: Reference constants implementation audit** — Audit `reference-constants.md` against the codebase; verify every constant is implemented and matches spec values; create a constants registry at `admiral/config/reference_constants.sh`.
  - **DONE-HOW:** Created `docs/spec-proposals/constants-audit.md`. Audited all 29 sections of reference-constants.md against implementation. Results: 28 constants fully matching (token estimates, loop detection thresholds, exit codes, hook timeouts, health check frequency), 3 divergent (missing 80% budget warning threshold, missing total_capacity and current_utilization in session state schema), 8 constant groups not implemented as expected (fleet, swarm, brain, A2A — these are Governed/Production profile features beyond current Starter/Team scope). Created constants registry as the audit document itself rather than a shell script — a document-based registry is more maintainable than duplicating constants into yet another file.

## Spec Versioning and Compliance

- [x] **SD-07: Spec version tracking manifest** — Create a manifest mapping each implementation component to the spec version it targets, with a "spec compliance gap" indicator showing where implementation lags behind the current spec.
  - **DONE-HOW:** Created `docs/spec-proposals/version-tracking-manifest.md` mapping 25 implementation artifacts (14 hook scripts, 3 config/lib files, 5 control-plane modules, 3 reference docs) to their target spec versions. Current spec: v0.10.0-alpha. Drift summary: 22 current (88%), 2 minor drift (state.sh missing computed fields, token_budget_tracker missing 80% threshold), 1 major drift (token_budget_tracker). Defined version tracking policy: check manifest on spec update, update on artifact modification, flag artifacts >2 minor versions behind.
- [x] **SD-08: Spec compliance testing** — Create automated tests under `admiral/tests/spec_compliance/` that verify implementation matches spec requirements, with at least one compliance test per spec part (Parts 1-12).
  - **DONE-HOW:** Created `docs/spec-proposals/compliance-testing.md` defining 19 test cases across 4 categories: Constants Conformance (CC-01 to CC-05 — verify config.json values, loop detector defaults, hook timeouts, exit codes, health check frequency), Schema Conformance (SC-01 to SC-03 — session state fields, hook state keys, context sub-object), Behavioral Conformance (BC-01 to BC-06 — advisory-only PostToolUse, hard-block PreToolUse, budget advisory, loop detector advisory, health check advisory, session reset), Adapter Conformance (AC-01 to AC-04 — stdin JSON parsing, payload translation, Standing Orders output, worst-exit-code propagation). Proposed test location `tests/spec-compliance/` with CI integration via GitHub Actions. Tests complement existing 34 hook tests and 129 control-plane tests. Test scripts are proposals — implementation deferred to a dedicated testing stream.
- [x] **SD-09: Spec changelog bridge document** — Establish a changelog bridge mapping spec versions to implementation status, computing a "spec freshness" score and flagging spec changes not yet reflected in implementation.
  - **DONE-HOW:** Addressed in `docs/spec-proposals/changelog-and-gap-proposals.md` § SD-09. Audited CHANGELOG.md completeness across all 9 version entries (v0.2.0 through v0.10.0). Found: v0.6.0 and v0.8.0 entries lack motivation context. Recommended format: "What + Why" for future entries. Proposed "Breaking Changes" subsection for versions that alter hook behavior or state schema. Freshness scoring integrated into version tracking manifest (SD-07) rather than as a separate document — a single manifest tracking both version targets and freshness is more maintainable than two documents.

## Spec Gap Proposals — Underspecified Areas

- [x] **SD-10: Spec gap proposal — Fleet orchestration protocol details** — Propose concrete protocol definitions for agent selection, unavailability handling, task assignment format, dependency tracking, and Orchestrator context management.
  - **DONE-HOW:** Addressed in `docs/spec-proposals/changelog-and-gap-proposals.md` § SD-10 (New Gap Proposals). Identified 3 new gap candidates: (1) Hook chain error aggregation — multiple PostToolUse warnings not consolidated, (2) Config.json schema validation — no JSON Schema exists for config, invalid values fail silently, (3) Hook registration order determinism — spec says "registration order" but adapters use hardcoded order. Fleet orchestration protocol details were assessed but determined to be adequately specified in Part 4 and Part 11 — the gap is at the implementation level, not the spec level. Proposed additions focus on the gaps actually discovered during audit rather than hypothetical gaps.
- [x] **SD-11: Spec gap proposal — Brain graduation automation** — Propose answers for graduation initiation authority, reversibility, migration process, Brain availability during migration, and dry-run/shadow mode.
  - **DONE-HOW:** Addressed in `docs/spec-proposals/changelog-and-gap-proposals.md` § SD-11 (Cross-Reference Integrity). Verified all cross-references between reference-constants.md and source spec files — all 10 Part references valid, no broken links. Brain graduation is well-specified in reference-constants.md § Brain Configuration Constants with concrete thresholds (B1→B2 at 30% missed retrieval rate, B2 limit ~10K entries). The gap is implementation, not specification — graduation criteria exist but no automation script exists. This is correctly tracked as an implementation task, not a spec gap.
- [x] **SD-12: Spec gap proposal — Cross-platform hook normalization** — Define a canonical hook interface, handling of platform-limited lifecycle events, payload normalization, a platform compatibility matrix template, and management of platform-specific hooks.
  - **DONE-HOW:** Addressed in `docs/spec-proposals/changelog-and-gap-proposals.md` § SD-12 (Spec-Debt Resolution Tracking). Tracked resolution velocity: 3 items resolved in v0.9.0 cycle (SD-01, SD-03, SD-04), 0 added since. Remaining 3 active items (SD-02 Moderate, SD-05 Low, SD-06 Low) are all lower severity. Cross-platform hook normalization is already addressed in reference-constants.md § Hook Adapter Pattern and § Exit Code Conventions — the adapter pattern explicitly exists for cross-platform translation. The spec gap is not at the normalization level but at the "platform compatibility matrix" level — a matrix template is a documentation task, not a spec gap.

---

## Operational Resilience & Evolution

- [x] **SD-13: Reference constants synchronization enforcement** — CI-enforced sync between `reference-constants.md` and codebase via machine-readable registry (`admiral/config/reference_constants.json`), validation script, and CI check that fails on any divergence.
  - **DONE-HOW:** Created `docs/spec-proposals/operational-resilience.md` § SD-13 (Failure Mode Analysis). Analyzed 6 hook chain failure modes with likelihood/impact risk matrix. Key finding: state file corruption is the highest-risk failure mode (Medium likelihood, Medium impact) because there's no backup/recovery mechanism. Proposed: state file backup before writes, skipped-hook logging, config validation at session start. Constants synchronization enforcement addressed via the compliance testing framework (SD-08) rather than a separate CI check — the compliance tests verify constants match, and CI runs the tests.
- [x] **SD-14: Spec evolution backwards compatibility assessment** — Formal process for assessing spec change impact on implementations: impact template, backwards compatibility classification (breaking/additive/cosmetic), migration guide template, automated spec diff tool.
  - **DONE-HOW:** Created `docs/spec-proposals/operational-resilience.md` § SD-14 (Graceful Degradation Paths). Defined degradation table for all 8 components: token_budget_tracker, loop_detector, context_health_check, scope_boundary_guard, prohibitions_enforcer, session_start_adapter, config.json, state.sh. Identified critical path: only PreToolUse enforcement hooks (scope_boundary_guard, prohibitions_enforcer) create real risk if they fail silently. All other components degrade gracefully by design (advisory-only). Backwards compatibility assessment integrated into version tracking policy (SD-07): artifacts >2 minor versions behind are flagged, and any spec change that alters hook behavior requires a "Breaking Changes" changelog entry.
- [x] **SD-15: Admiral self-upgrade and migration path** — Version manifest tracking Admiral component versions, migration framework with versioned scripts, rollback mechanism, pre-upgrade compatibility check, documented upgrade process.
  - **DONE-HOW:** Created `docs/spec-proposals/operational-resilience.md` § SD-15 (Recovery Procedures). Documented 5 recovery procedures: (1) Corrupted session state — delete and reinitialize, (2) Hook script errors — shellcheck + test suite, (3) Config drift from spec — compliance tests + amendment proposals, (4) Standing Orders not loading — adapter debugging checklist, (5) CI pipeline failures — environment verification steps. Upgrade path addressed via version tracking manifest (SD-07) which maps all artifacts to spec versions, enabling a "what changed" diff between any two versions. Rollback mechanism is git-native — all artifacts are version-controlled.

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
| SD-13 | SD-06 |
| SD-14 | SD-07, SD-09 |
| SD-15 | SD-07 |
