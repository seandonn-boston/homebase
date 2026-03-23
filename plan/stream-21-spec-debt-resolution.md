# Stream 21: Spec Debt Resolution — Completing the Specification

> *"A specification that is incomplete is worse than no specification at all — it creates false confidence." — Leslie Lamport (paraphrased)*

**Scope:** Address all known specification gaps and incomplete areas documented in `spec-debt.md` and `spec-gaps.md`. This stream is unique: its deliverables are specification amendments and proposals, not code. The `aiStrat/` directory is read-only, so all proposals are written to `docs/spec-proposals/` for Admiral review and eventual integration into the spec. Items in this stream require explicit approval before any spec changes are made.

**Why this matters:** Implementation built on an incomplete spec will either diverge from intent (building the wrong thing) or stall at ambiguity boundaries (unable to build anything). Spec debt compounds — every implementation decision made without spec guidance becomes a de facto spec that may conflict with the eventual specification. Resolving spec debt before or during implementation prevents expensive rework.

**Important:** All items in this stream produce proposals in `docs/spec-proposals/`. The `aiStrat/` directory is read-only and requires Admiral approval for any modifications. Spec proposals should reference the specific spec section they amend, include rationale, and provide before/after text.

---

## 21.1 Spec Debt Inventory and Prioritization

- [x] **SD-01: Document all spec-debt items as plan tasks with resolution paths**
  - **Description:** Audit `spec-debt.md` and `spec-gaps.md` comprehensively. For each active debt item, document: the specific spec section affected, the nature of the gap (missing detail, unvalidated claim, internal inconsistency), the downstream implementation impact (what cannot be built without resolution), and a proposed resolution path. Currently `spec-debt.md` has 2 active items (SD-02: benchmark targets lack empirical basis, SD-05: data ecosystem is thin) and `spec-gaps.md` has all 14 gaps resolved. This task captures the full inventory and identifies any additional gaps discovered during implementation work across all streams.
  - **Done when:** A comprehensive spec debt inventory exists with each item classified by severity, implementation impact, and resolution path. New gaps discovered during implementation are added. The inventory is maintained as a living document.
  - **Files:** `docs/spec-proposals/debt-inventory.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `spec-debt.md`, `spec-gaps.md`
  - **Depends on:** —

- [x] **SD-02: Identify which spec gaps block implementation and prioritize accordingly**
  - **Description:** Cross-reference the spec debt inventory (SD-01) against all plan streams (Streams 1-20) to identify which spec gaps actively block implementation work. Classify each gap as: (1) **blocking** — implementation cannot proceed without spec clarification; (2) **constraining** — implementation can proceed but may need rework when spec is clarified; (3) **cosmetic** — spec language could be improved but implementation is unaffected. Produce a prioritized resolution queue where blocking gaps are resolved first.
  - **Done when:** Every spec gap is classified as blocking, constraining, or cosmetic with the specific stream/task it affects. A prioritized resolution queue exists. Blocking gaps have target resolution dates.
  - **Files:** `docs/spec-proposals/priority-matrix.md` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** `spec-debt.md`, all plan streams
  - **Depends on:** SD-01

---

## 21.2 Spec Amendment Proposals

- [x] **SD-03: Create spec amendment proposals for each gap**
  - **Description:** For each active spec gap identified in SD-01 and SD-02, write a formal amendment proposal. Each proposal follows a standard format: (1) **Gap ID and title** — reference to the original spec-debt or spec-gaps entry; (2) **Affected spec section** — exact file and line range; (3) **Current text** — the existing spec language (or absence thereof); (4) **Proposed text** — the amended language with concrete thresholds, definitions, or missing content; (5) **Rationale** — why this change is needed and what implementation it unblocks; (6) **Impact assessment** — what existing implementations (if any) would need updating. Proposals are written to `docs/spec-proposals/` and require Admiral review before any spec modification.
  - **Done when:** Every active spec gap has a corresponding amendment proposal in the standard format. Proposals are self-contained and reviewable independently. Each proposal clearly identifies the spec file and section to be amended.
  - **Files:** `docs/spec-proposals/amendments/` (new directory with one file per proposal)
  - **Size:** L (3+ hours)
  - **Spec ref:** All active items in `spec-debt.md`
  - **Depends on:** SD-01, SD-02

---

## 21.3 Enforcement and Compliance Completeness

- [x] **SD-04: Standing Orders enforcement map completion**
  - **Description:** Ensure every Standing Order maps to at least one enforcement mechanism. Currently the enforcement map (`standing-orders-enforcement-map.md`) shows 8/16 SOs with hook enforcement and 8/16 advisory-only. The E3 target is 12/16. For each advisory-only SO, produce a proposal that either: (1) defines a hook that can partially enforce it (judgment-assisted), or (2) documents why the SO is inherently advisory with no deterministic enforcement possible, plus alternative monitoring strategies. Focus on the critical gap: SO-14 (Compliance, Ethics, Legal) is safety-tier with zero enforcement.
  - **Done when:** Every SO has a documented enforcement strategy — either an existing hook, a proposed hook with manifest, or an explicit justification for advisory-only status with alternative monitoring. The SO-14 gap has a concrete proposal. The enforcement map progression path to E3 is actionable.
  - **Files:** `docs/spec-proposals/amendments/enforcement-map-completion.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `standing-orders-enforcement-map.md`; Part 3 — Deterministic Enforcement; Part 11 — Standing Orders
  - **Depends on:** —

- [x] **SD-05: Hook manifest completeness**
  - **Description:** Audit all hooks defined or referenced in the spec and ensure each has a corresponding manifest in the hooks directory. A hook manifest defines: hook name, lifecycle event (PreToolUse/PostToolUse/SessionStart), what it enforces, which Standing Order(s) it supports, pass/fail criteria, and the advisory-vs-blocking classification. Compare the spec's references to hooks against the actual manifests in `aiStrat/hooks/` and the implementation in `.hooks/`. Document any hooks that are referenced in the spec but have no manifest, and any manifests that exist but are not referenced in the spec.
  - **Done when:** A complete cross-reference exists between spec-referenced hooks and actual manifests. Missing manifests are identified with proposed content. Orphan manifests (exist but not referenced) are identified. Proposals for new manifests are written.
  - **Files:** `docs/spec-proposals/hook-manifest-audit.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 3 — Deterministic Enforcement; `standing-orders-enforcement-map.md`; `hooks/` directory
  - **Depends on:** —

- [x] **SD-06: Reference constants implementation**
  - **Description:** Audit `reference-constants.md` and verify that every constant defined there is implemented in the codebase. Reference constants include thresholds (standing context ceiling at 50K tokens, Brain advancement criteria, supersession rate boundaries, etc.), timeouts, scoring thresholds, and behavioral parameters. For each constant, verify: (1) it is defined in a configuration file or code constant that can be referenced at runtime; (2) the implemented value matches the spec value; (3) the constant is actually used by the relevant hook, agent, or system component. Document any constants that are specified but not implemented, and any implementation values that diverge from spec.
  - **Done when:** Every reference constant has an implementation audit result (implemented/missing/divergent). Missing constants have implementation proposals. Divergent values are flagged with rationale for which value is correct. A constants registry exists in the codebase that mirrors `reference-constants.md`.
  - **Files:** `docs/spec-proposals/constants-audit.md` (new), `admiral/config/reference_constants.sh` (new, if constants registry does not exist)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `reference-constants.md`
  - **Depends on:** —

---

## 21.4 Spec Versioning and Compliance

- [x] **SD-07: Spec version tracking**
  - **Description:** Implement a mechanism to track which spec version each implementation feature targets. As the spec evolves (currently at v0.10.0-alpha), implementations built against earlier spec versions may drift. Create a version tracking manifest that maps: (1) each implementation component (hook, agent, Brain feature, control plane module) to the spec version it was built against; (2) spec version changelog entries to the implementation changes they require; (3) a "spec compliance gap" indicator showing where implementation lags behind the current spec version.
  - **Done when:** A spec version tracking manifest exists. Every major implementation component is mapped to its target spec version. Spec version changes trigger a diff showing what implementation work is needed. The manifest is maintainable as the spec evolves.
  - **Files:** `docs/spec-proposals/version-tracking.md` (new), `admiral/config/spec_version_manifest.json` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** All spec parts (versioning concern)
  - **Depends on:** —

- [x] **SD-08: Spec compliance testing**
  - **Description:** Create automated tests that verify implementation matches spec requirements. For each testable spec requirement, write a test that: (1) references the specific spec section being tested (part, section, line); (2) verifies the implementation behavior matches the spec's stated behavior; (3) fails with a descriptive message identifying the spec-implementation divergence. Start with the most mechanical requirements: Standing Order enforcement (are the right hooks active?), reference constants (are thresholds correct?), Brain schema (does it match the spec schema?), and protocol formats (do handoffs, escalations, and checkpoints follow the spec formats?).
  - **Done when:** At least one compliance test exists per spec part (Parts 1-12). Tests reference specific spec sections. Tests can be run as part of CI. Test failures clearly identify spec-implementation divergence. A compliance score (tests passing / total tests) is computed.
  - **Files:** `admiral/tests/spec_compliance/` (new directory), `admiral/tests/spec_compliance/test_standing_orders.sh` (new), `admiral/tests/spec_compliance/test_constants.sh` (new), `admiral/tests/spec_compliance/test_brain_schema.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** All spec parts
  - **Depends on:** SD-06, SD-07

- [x] **SD-09: Spec changelog tracking**
  - **Description:** Establish a process for tracking which spec changes are reflected in implementation and which are pending. Create a changelog bridge document that: (1) mirrors the spec's version history; (2) for each spec change, records whether the implementation has been updated to match; (3) flags spec changes that require implementation work but have not been addressed; (4) provides a "spec freshness" score indicating how current the implementation is relative to the spec. This prevents the common failure mode where the spec evolves but implementations silently fall behind.
  - **Done when:** A changelog bridge document exists mapping spec versions to implementation status. The document is structured for easy updates as new spec versions are released. A "spec freshness" score is computable. The process for updating the bridge when spec changes occur is documented.
  - **Files:** `docs/spec-proposals/changelog-bridge.md` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** Spec CHANGELOG (if exists), all spec parts
  - **Depends on:** SD-07

---

## 21.5 Spec Gap Proposals — Underspecified Areas

- [x] **SD-10: Spec gap proposal — Fleet orchestration protocol details**
  - **Description:** The spec defines the Orchestrator role and its responsibilities (task decomposition, agent routing, coordination) but underspecifies the orchestration protocol itself. Missing details include: (1) how the Orchestrator selects which agent to assign a task to when multiple agents qualify; (2) how the Orchestrator handles agent unavailability (timeout, crash, context exhaustion); (3) the precise format and content of Orchestrator-to-agent task assignments beyond the Handoff Protocol; (4) how the Orchestrator tracks task dependencies and parallelism constraints; (5) how the Orchestrator manages its own context window when coordinating many agents. Write a spec amendment proposal that provides concrete protocol details for fleet orchestration.
  - **Done when:** Proposal covers all five underspecified areas with concrete protocol definitions (formats, algorithms, thresholds). Proposal is consistent with existing spec (Parts 4, 6, 8, 11). Proposal includes rationale for each design choice and alternatives considered.
  - **Files:** `docs/spec-proposals/amendments/fleet-orchestration-protocol.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 4 — Fleet Composition; Part 6 — Execution; Part 8 — Operations; Part 11 — Handoff Protocol
  - **Depends on:** SD-01

- [x] **SD-11: Spec gap proposal — Brain graduation automation**
  - **Description:** The spec defines Brain levels (B1 file-based through B3 Postgres+pgvector) and advancement criteria but does not specify whether graduation from one level to the next is manual or automatic. Questions to address: (1) who initiates graduation — the Admiral, a governance agent, or the system itself when metrics are met?; (2) is graduation reversible — can a Brain be downgraded if metrics decline at the higher level?; (3) what is the migration process — how are entries transferred between storage backends without data loss?; (4) what happens during migration — is the Brain read-only, or does it continue accepting entries?; (5) how is graduation tested before committing — is there a dry-run or shadow mode? Write a spec amendment proposal addressing all five questions.
  - **Done when:** Proposal answers all five questions with concrete recommendations. Includes a graduation decision flowchart. Addresses data migration safety. Proposal is consistent with Part 5 (Brain Architecture) and Part 12 (Data Ecosystem).
  - **Files:** `docs/spec-proposals/amendments/brain-graduation-automation.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 5 — Brain Architecture (Brain levels, advancement criteria)
  - **Depends on:** SD-01

- [x] **SD-12: Spec gap proposal — Cross-platform hook normalization**
  - **Description:** The spec defines hooks as the deterministic enforcement layer but does not specify how hooks adapt across different AI coding platforms (Claude Code, Cursor, Windsurf, etc.). Each platform has different hook lifecycle events, payload formats, and execution environments. Questions to address: (1) what is the canonical hook interface that all platform adapters must translate to/from?; (2) how are platform-specific limitations handled — what if a platform does not support PostToolUse?; (3) how are hook payloads normalized — different platforms provide different fields; (4) how is hook behavior tested across platforms — is there a platform compatibility matrix?; (5) how are platform-specific hooks (that only make sense on one platform) managed alongside universal hooks? Write a spec amendment proposal defining the cross-platform hook normalization strategy.
  - **Done when:** Proposal defines a canonical hook interface independent of platform. Addresses all five questions. Includes a platform compatibility matrix template. Proposal is consistent with Part 3 (Deterministic Enforcement) and Part 2 (Configuration File Strategy).
  - **Files:** `docs/spec-proposals/amendments/cross-platform-hook-normalization.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 3 — Deterministic Enforcement; Part 2 — Context Engineering (Configuration File Strategy)
  - **Depends on:** SD-01

---

## 21.6 Operational Resilience & Evolution

- [x] **SD-13: Reference constants synchronization enforcement**
  - **Description:** Establish a CI-enforced synchronization mechanism between `reference-constants.md` and the codebase. Currently SD-06 audits constants once, but constants can drift again after any spec update or code change. This item creates a machine-readable constants registry (`admiral/config/reference_constants.json`) that is the single source of truth, a validation script that compares the registry against both the spec's `reference-constants.md` and all code references, and a CI check that fails on any divergence. Constants include: standing context ceiling (50K tokens), Brain advancement thresholds, supersession rate boundaries, hook timeout defaults (30s), governance overhead cap (25%), and all other spec-defined numeric values.
  - **Done when:** Machine-readable constants registry exists. CI check validates registry matches spec and code references. Any constant change requires updating the registry first. Drift detection runs on every PR. Documentation shows how to add new constants.
  - **Files:** `admiral/config/reference_constants.json` (new), `admiral/scripts/validate_constants.sh` (new), `.github/workflows/control-plane-ci.yml` (modify)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `reference-constants.md`
  - **Depends on:** SD-06

- [x] **SD-14: Spec evolution backwards compatibility assessment**
  - **Description:** Create a formal process for assessing the impact of spec changes on existing implementations. When the spec evolves (version increments, new sections, changed requirements), existing implementations may silently become non-compliant. This item establishes: (1) a spec change impact template documenting which implementations are affected by each spec change; (2) a backwards compatibility classification (breaking, additive, cosmetic) for each change; (3) a migration guide template for breaking changes; (4) an automated diff tool that compares spec versions and flags sections with implementation references. This prevents the failure mode where the spec grows but implementations silently fall behind.
  - **Done when:** Impact assessment template exists. At least one spec version transition has a completed impact assessment. Automated spec diff tool identifies changed sections. Breaking changes have migration guides. Process is documented for future spec authors.
  - **Files:** `docs/spec-proposals/evolution/impact-template.md` (new), `admiral/scripts/spec_diff.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** All spec parts (process concern)
  - **Depends on:** SD-07, SD-09

- [ ] **SD-15: Admiral self-upgrade and migration path**
  - **Description:** Define how an operator upgrades between Admiral versions without losing state, brain entries, configuration, or governance continuity. Currently there is no plan for what happens when Admiral itself is updated — hooks may change signatures, brain schemas may evolve, standing order enforcement may shift, and configuration formats may be incompatible. This item defines: (1) a version manifest tracking the current Admiral version and its component versions (hooks, brain schema, config format, control plane API); (2) a migration framework that runs version-specific migration scripts on upgrade; (3) a rollback mechanism if migration fails; (4) a pre-upgrade compatibility check that warns about breaking changes before they happen; (5) documentation of the upgrade process.
  - **Done when:** Version manifest exists tracking Admiral component versions. Migration framework can run versioned migration scripts. Pre-upgrade compatibility check warns about breaking changes. Rollback mechanism reverts a failed migration. Upgrade process is documented with step-by-step instructions.
  - **Files:** `admiral/config/version_manifest.json` (new), `admiral/scripts/upgrade.sh` (new), `admiral/migrations/` (new directory), `docs/upgrade-guide.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** — (operational gap)
  - **Depends on:** SD-07
