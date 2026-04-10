# Stream 40: Hook Test Depth

> Replace the single `.hooks/tests/test_hooks.sh` monolith with per-hook test suites and add hook-pipeline sequencing tests. The current state — 21 hooks sharing 1 test file — was flagged in the Phase 14+ rating audit as the largest test-coverage gap in the repo.

**Phase:** 17 — Hook Test Depth (Credibility Closure Tier)

**Scope:** `.hooks/` contains 21 hook scripts and `.hooks/tests/` contains exactly one file (`test_hooks.sh`, 584 lines). Per-hook regression coverage is therefore impossible to assess and any change to a hook risks silent breakage. This stream splits the monolith into per-hook test files, adds happy + ≥5 negative scenarios per hook, and adds a pipeline-level sequencing test that exercises the full PreToolUse → PostToolUse chain end-to-end.

**Resolves rating-review weakness:** "Hook test surface is thin — 21 hooks, 1 test file."

**Principle:** Regression safety is what makes Phase 18 (enforcement closure) safe. You cannot promote advisory hooks to hard-blocking without locking in the existing per-hook behavior first.

---

## 40.1 Per-Hook Test Files

- [ ] **HD-01: Inventory existing test coverage in `test_hooks.sh`**
  - **Description:** Read `test_hooks.sh` and produce a coverage map: which of the 21 hooks have any test? How many cases per hook? Categorize each existing case as happy, negative, edge, or integration. Output in `docs/hook-test-coverage-baseline.md`. This becomes the gap report for HD-02.
  - **Done when:** `hook-test-coverage-baseline.md` lists every hook with current case count and category breakdown.
  - **Files:** `docs/hook-test-coverage-baseline.md` (new)
  - **Size:** S
  - **Depends on:** —

- [ ] **HD-02: Split `test_hooks.sh` into per-hook files**
  - **Description:** For each `.hooks/<name>.sh`, create `.hooks/tests/test_<name>.sh`. Move the existing cases from the monolith into the per-hook file. Each per-hook file must source the shared assert library, declare its hook under test, and follow the standard header convention from ADMIRAL_STYLE.md.
  - **Done when:** `.hooks/tests/` contains one `test_<hook>.sh` per hook script. The original monolith is preserved as `test_hooks_legacy.sh` until HD-04 confirms parity.
  - **Files:** `.hooks/tests/test_*.sh` (21 new files)
  - **Size:** L
  - **Depends on:** HD-01

- [ ] **HD-03: Add ≥5 negative cases per hook**
  - **Description:** For every `test_<hook>.sh`, add at least 5 negative scenarios from this canonical list: malformed JSON, missing required fields, empty stdin, oversized payload, Unicode in tool names, null values, deeply nested JSON, concurrent invocation, missing dependency, corrupted state. Each case must produce structured error JSON or fail-open per ADR-004.
  - **Done when:** Every per-hook test file has ≥5 negative cases. Total negative case count ≥105.
  - **Files:** `.hooks/tests/test_*.sh` (21 files extended)
  - **Size:** L
  - **Depends on:** HD-02

- [ ] **HD-04: Verify parity with legacy monolith and remove `test_hooks_legacy.sh`**
  - **Description:** Run the new per-hook test files and confirm that every assertion from `test_hooks_legacy.sh` has been migrated. Compare assertion counts, hook coverage, and pass/fail patterns. Once parity is confirmed, delete `test_hooks_legacy.sh`.
  - **Done when:** Legacy monolith deleted. Per-hook files together cover every legacy assertion.
  - **Files:** `.hooks/tests/test_hooks_legacy.sh` (deleted)
  - **Size:** S
  - **Depends on:** HD-03

## 40.2 Pipeline Sequencing Tests

- [ ] **HD-05: Add `test_hook_pipeline_sequencing.sh`**
  - **Description:** Create a pipeline-level test that exercises the full hook chain: `session_start_adapter.sh` → `pre_tool_use_adapter.sh` → tool call → `post_tool_use_adapter.sh`. Verify: (1) session state is initialized exactly once, (2) PreToolUse hooks fire in the documented order, (3) PostToolUse hooks see the state mutations from PreToolUse, (4) hook output JSON is consistent across the chain, (5) state is durably written between hooks.
  - **Done when:** Pipeline sequencing test exists and passes. State consistency is asserted at every hook boundary.
  - **Files:** `.hooks/tests/test_hook_pipeline_sequencing.sh` (new)
  - **Size:** L
  - **Depends on:** HD-04

- [ ] **HD-06: Add `test_hook_idempotency_chain.sh`**
  - **Description:** Run the full hook chain twice with identical input and verify that the second run produces the same exit codes and output as the first (timestamps stripped). This extends the existing per-hook idempotency test (Q-14, Phase 9) to the pipeline level.
  - **Done when:** Pipeline-level idempotency test exists and passes for the full chain.
  - **Files:** `.hooks/tests/test_hook_idempotency_chain.sh` (new)
  - **Size:** M
  - **Depends on:** HD-05

## 40.3 Coverage Metric & CI Enforcement

- [ ] **HD-07: Add hook coverage metric**
  - **Description:** Create `scripts/hook-coverage.sh` that produces a coverage report: for every `.hooks/*.sh`, report whether a `test_<name>.sh` exists, how many cases it has, and how many are negative. Output a percentage: `% of hooks with ≥5 negative cases`. Target: ≥95%.
  - **Done when:** `hook-coverage.sh` exists and reports a percentage. The percentage is committed to `plan/index.md`.
  - **Files:** `scripts/hook-coverage.sh` (new), `plan/index.md`
  - **Size:** M
  - **Depends on:** HD-03

- [ ] **HD-08: CI rule blocking new hooks without test files**
  - **Description:** Add a CI step that fails the build if any `.hooks/*.sh` exists without a matching `.hooks/tests/test_*.sh`. The check runs in `.github/workflows/hook-tests.yml`.
  - **Done when:** CI fails if a PR adds a hook without a test file.
  - **Files:** `.github/workflows/hook-tests.yml`, `scripts/check-hook-test-coverage.sh` (new)
  - **Size:** S
  - **Depends on:** HD-07

---

## Dependencies

| Item | Depends on |
|------|-----------|
| HD-01 (baseline) | — |
| HD-02 (split) | HD-01 |
| HD-03 (negative cases) | HD-02 |
| HD-04 (parity) | HD-03 |
| HD-05 (pipeline) | HD-04 |
| HD-06 (idempotency chain) | HD-05 |
| HD-07 (coverage metric) | HD-03 |
| HD-08 (CI rule) | HD-07 |

---

## Exit Criteria

- One `test_<hook>.sh` exists per hook in `.hooks/`.
- Every per-hook test file has ≥5 negative cases (≥105 total).
- `test_hook_pipeline_sequencing.sh` and `test_hook_idempotency_chain.sh` pass.
- Hook coverage metric ≥95%.
- CI blocks merges of new hooks without test files.
- Legacy `test_hooks.sh` monolith deleted.
