# Stream 6: The Philosophical Gap — From "Good Enough" to "Showcase"

> *"Pristine repositories practice what they preach. SQLite's testing strategy IS the product." — [research/pristine-repos-gap-analysis.md](../research/pristine-repos-gap-analysis.md)*

**Current score:** Self-Enforcement aspects spread across Testing (5/10), CI/CD (7/10), Consistency (6/10)
**Target score:** 9/10 across all self-enforcement dimensions

These items transform the hooks directory from "implementation code" into "the single best demonstration of what Admiral makes possible." The philosophical gap is not about missing features — it is about the distance between what Admiral *enforces on others* and what it *demands of itself*. Closing this gap is what separates a tool from a movement.

---

## 6.1 Self-Enforced Discipline

- [ ] **P-01: Admiral enforces its own test discipline**
  - **Description:** Create a CI check that requires test additions for any bug fix commit. When a commit message starts with `fix:`, verify that at least one test file was also modified or added in the same commit. This is the SQLite principle: every bug that escapes is a regression test gap, and the system itself must prevent that gap from persisting. The check should be a soft-fail (warning annotation) initially, escalating to hard-fail once the test suite reaches critical mass (after T-09 coverage gate is in place).
  - **Done when:** CI warns on `fix:` commit with no associated test changes. A PR with `fix:` in the title and zero test file changes receives a visible warning annotation.
  - **Files:** `.github/workflows/control-plane-ci.yml` (modify — add test-discipline job), `.github/workflows/hook-tests.yml` (modify — add parallel check for `.sh` test changes)
  - **Size:** M
  - **Spec ref:** SQLite — regression test for every bug fix is non-negotiable

- [ ] **P-02: Admiral enforces its own documentation discipline**
  - **Description:** Create a CI validation script that checks three documentation invariants: (1) every `.ts` source file in `control-plane/src/` (excluding test files and `index.ts`) has a module-level doc comment within the first 10 lines, (2) every `.sh` file in `.hooks/` has a header comment block containing at minimum: purpose, exit codes, and Standing Order reference, (3) every ADR in `docs/adr/` follows the template format (contains Status, Context, Decision, and Consequences sections). The script should output a clear report listing all violations with file paths and line numbers.
  - **Done when:** CI validates documentation presence and all existing files pass. The validation script is itself documented with a header comment.
  - **Files:** `admiral/tests/test_documentation.sh` (new), `.github/workflows/control-plane-ci.yml` (modify — add doc-discipline job)
  - **Size:** M
  - **Spec ref:** Go `golint` — enforces doc comments on every exported symbol; the Go team considers undocumented exports to be bugs

---

## 6.2 Meta-Governance — The System Observes Itself

- [ ] **P-03: Create a "meta-test" — Admiral tests its own hooks**
  - **Description:** This is the capstone self-referential test. The test starts the Admiral control plane server, then executes the hook test suite (`.hooks/tests/test_hooks.sh`), which writes events to `event_log.jsonl`. The control plane ingests those events via `JournalIngester`. The test then queries the control plane API (`/api/events`, `/api/agents`) and verifies that: (a) hook execution events were ingested, (b) the `RunawayDetector` did not fire false positives during normal test execution, (c) event counts match the expected number of hook invocations, (d) the execution trace (`/api/traces`) shows a coherent timeline. This proves that Admiral can observe, analyze, and reason about its own behavior — the ultimate dog-fooding test.
  - **Done when:** A single test script starts the control plane, runs hook tests, ingests events, queries the API, and asserts correctness. The test passes in CI.
  - **Files:** `admiral/tests/test_self_observation.sh` (new), `.github/workflows/integration-tests.yml` (modify — add self-observation job)
  - **Size:** L
  - **Depends on:** A-02 (bridge control plane and hooks), T-06 (hook edge cases)
  - **Spec ref:** TigerBeetle — the system tests itself under its own governance; a compiler that cannot compile itself is not finished

- [ ] **P-04: Publish quality metrics dashboard**
  - **Description:** Extend the control plane dashboard to display codebase quality metrics as a first-class feature. Metrics to surface: total test count (TS + bash), line coverage percentage, hook count (implemented / total from spec), Standing Order count, ADR count, last benchmark results (hook latency p95, server throughput), and a "quality trend" indicator showing direction of change. Data sources: CI artifacts (coverage reports, test counts), file system scans (count `.test.ts` files, count `docs/adr/*.md`, count `.hooks/*.sh`), and benchmark output files. The dashboard should be accessible at `/dashboard/quality` and auto-refresh.
  - **Done when:** Dashboard shows all listed metrics. Metrics update automatically from CI data (either via file artifacts or a lightweight metrics file that CI writes). A screenshot of the dashboard is linked from README.md.
  - **Files:** `control-plane/src/server.ts` (modify — add `/dashboard/quality` route), `control-plane/src/quality-metrics.ts` (new — metrics collection logic), `.github/workflows/control-plane-ci.yml` (modify — write metrics artifact)
  - **Size:** L
  - **Depends on:** T-09 (coverage gate), T-11/T-12 (benchmarks), T-10 (coverage badge)
  - **Spec ref:** Every pristine project makes its quality posture visible — badges, dashboards, published test results; the act of measuring changes behavior

---

## 6.3 Self-Enforcement — Eating Our Own Dog Food

- [ ] **P-05: Pre-commit hook enforcement of own standards**
  - **Description:** Extend the existing `.githooks/pre-commit` hook (which already runs ShellCheck on `.sh` and Biome on `.ts`) to also validate: (a) AGENTS.md format consistency — section headers follow the defined hierarchy, no broken internal links, (b) ADR template compliance — any staged `docs/adr/*.md` file contains required sections (Status, Context, Decision, Consequences), (c) Standing Order format — any staged `admiral/standing-orders/*.md` file follows the SO template. The hook must remain fast (< 5 seconds total) by only checking staged files, not the entire repo. Use `git diff --cached --name-only` to scope checks. Each validation failure should print the file, line number, and specific violation.
  - **Done when:** Pre-commit hook catches ShellCheck violations, Biome errors, AGENTS.md inconsistencies, ADR template violations, and SO format issues before they reach CI. All currently committed files pass the expanded checks.
  - **Files:** `.githooks/pre-commit` (modify — extend existing hook with AGENTS.md/ADR/SO validation functions)
  - **Size:** M
  - **Spec ref:** Self-dog-fooding — Admiral's own development workflow should be the most rigorously enforced workflow in the repository

- [ ] **P-06: Deduplication detection in CI**
  - **Description:** Add a CI step that detects code duplication across the codebase, with particular focus on bash hooks (where copy-paste patterns are most likely to accumulate). Use `jscpd` (zero-config, supports bash and TypeScript) or a lightweight custom script that computes similarity hashes for function bodies. Track the "refactoring ratio" — the percentage of commits that reduce duplication vs. those that increase it. Report metrics: total duplicate blocks, total duplicated lines, duplication percentage, and top-5 most duplicated fragments with file locations. The check should warn (not block) when duplication exceeds a threshold (start at 15%, ratchet down). This directly addresses the GitClear research finding that AI-assisted coding increases code duplication by 2-3x when unchecked.
  - **Done when:** CI reports duplication metrics on every PR. Duplication percentage is visible in CI output. PRs that increase duplication above threshold receive a warning annotation.
  - **Files:** `.github/workflows/control-plane-ci.yml` (modify — add duplication-detection job), `admiral/tests/test_duplication.sh` (new — bash-specific duplication detection for hooks)
  - **Size:** M
  - **Spec ref:** GitClear research on AI code quality degradation — "moved code" and duplication are the primary quality signals that degrade under AI-assisted development

---

## 6.4 Automated Drift and Compliance Detection

- [ ] **P-07: Spec-implementation drift detector**
  - **Description:** CI job that compares spec-defined features against implementation status, warns on drift. Parses the Admiral Framework specification (all 12 parts) to extract defined features, hooks, protocols, and agents, then scans the codebase for corresponding implementations. Produces a drift report showing: features defined in spec but missing from code, code that has no spec backing (potential unauthorized additions), and features where spec and implementation diverge (e.g., spec says 5 escalation steps but code implements 3). The detector should be incremental — only report new drift introduced by the current PR, not pre-existing gaps.
  - **Done when:** CI job runs on every PR and produces a drift report. Report distinguishes between pre-existing drift and newly introduced drift. New drift introduced by a PR triggers a warning annotation. Report is parseable (JSON output) for dashboard integration (P-04).
  - **Files:** `.github/workflows/spec-drift.yml` (new), `admiral/tests/spec_drift_detector.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 10 — Meta-Governance

- [ ] **P-08: PLAN.md auto-validation**
  - **Description:** CI check that verifies PLAN.md task counts match actual items, no orphaned references. Parses PLAN.md to extract all task IDs (T-XX, H-XX, A-XX, etc.), counts items per stream, and validates: (1) summary table counts match actual item counts in each stream, (2) no task ID is referenced in "Depends on" fields that does not exist as an actual task, (3) no duplicate task IDs exist across the entire plan, (4) all task IDs follow the correct prefix convention for their stream. Prevents the plan document itself from accumulating inconsistencies as items are added, completed, or reorganized.
  - **Done when:** CI check validates PLAN.md on every PR that modifies it. Mismatched counts, orphaned references, and duplicate IDs cause the check to fail with specific error messages identifying the discrepancy.
  - **Files:** `admiral/tests/test_plan_validation.sh` (new), `.github/workflows/control-plane-ci.yml` (modify — add plan-validation job)
  - **Size:** M

- [ ] **P-09: Standing Order compliance audit**
  - **Description:** Automated scan that verifies each Standing Order has at least one enforcement mechanism — a hook, a CI check, or an instruction embedding. Parses all 16 Standing Orders from `admiral/standing-orders/`, then cross-references against: (1) hook files in `.hooks/` that reference the SO in their header comments, (2) CI workflow files that enforce SO requirements, (3) AGENTS.md sections that embed SO instructions. Produces a compliance matrix showing each SO's enforcement status: "enforced" (automated hook/CI), "instructed" (embedded in agent instructions), "advisory" (guidance only, no enforcement), or "unenforced" (no mechanism at all). SOs with "unenforced" status are flagged as critical gaps.
  - **Done when:** Compliance audit runs in CI and produces a machine-readable matrix (JSON). Any SO with zero enforcement mechanisms triggers a warning. The audit itself is documented as an enforcement mechanism for SO-16 (protocol governance).
  - **Files:** `admiral/tests/test_so_compliance.sh` (new), `admiral/docs/so-compliance-matrix.json` (new — generated output)
  - **Size:** M
  - **Depends on:** S-05 (Standing Orders enforcement map)

- [ ] **P-10: Hook coverage report**
  - **Description:** Generate a report showing which spec-defined hooks exist vs. missing. Parses the Admiral Framework specification to extract all defined hook points (session start, session end, pre-tool-use, post-tool-use, notification, etc.), then scans `.hooks/` for corresponding implementations. Report includes: (1) implemented hooks with their spec compliance status (does the implementation match spec requirements?), (2) spec-defined hooks with no implementation, (3) implemented hooks with no spec backing (custom additions), (4) hook-to-Standing-Order coverage (which SOs have hook enforcement, which do not). Output as both human-readable markdown and machine-readable JSON for dashboard integration.
  - **Done when:** Report generates successfully and accurately reflects the current state. Report is generated as part of CI and artifacts are uploaded. JSON output integrates with quality metrics dashboard (P-04). Report distinguishes between "missing entirely" and "implemented but incomplete."
  - **Files:** `admiral/tests/hook_coverage_report.sh` (new), `.github/workflows/control-plane-ci.yml` (modify — add hook-coverage job)
  - **Size:** M
  - **Depends on:** S-05 (Standing Orders enforcement map)

---

## Stream 6 Summary

| Subsection | Items | Total Size |
|---|---|---|
| 6.1 Self-Enforced Discipline | P-01, P-02 | 2M |
| 6.2 Meta-Governance | P-03, P-04 | 2L |
| 6.3 Self-Enforcement | P-05, P-06 | 2M |
| 6.4 Drift and Compliance | P-07, P-08, P-09, P-10 | 1L + 3M |
| **Totals** | **10 items** | **3L + 7M** |

**Critical path:** P-03 depends on A-02 and T-06. P-04 depends on T-09, T-10, T-11/T-12. P-09 and P-10 depend on S-05. Start with P-01, P-02, P-05, P-06 (no dependencies).

**Recommended execution order:**
1. **Independent:** P-01 (test discipline), P-02 (doc discipline), P-05 (pre-commit), P-06 (dedup) — no dependencies, immediate value.
2. **Drift detection:** P-07 (spec drift), P-08 (plan validation) — requires parsing infrastructure but no other stream dependencies.
3. **Compliance:** P-09 (SO compliance), P-10 (hook coverage) — depend on S-05 enforcement map.
4. **Capstone:** P-03 (meta-test), P-04 (dashboard) — depend on multiple other streams, build last.
