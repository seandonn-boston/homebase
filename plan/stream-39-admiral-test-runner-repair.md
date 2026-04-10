# Stream 39: Admiral Test Runner Repair & Reachable-Modules Audit

> Replace the boilerplate `admiral/package.json` test script with a real harness, run every existing `.test.ts` and `tests/**/*.sh`, and produce an authoritative inventory of which TypeScript modules under `admiral/` are reachable from the hook pipeline.

**Phase:** 16 — Admiral Test Runner Repair & Integration Audit (Credibility Closure Tier)

**Scope:** `admiral/package.json` is currently `npm init` default boilerplate (`"test": "echo \"Error: no test specified\" && exit 1"`). The directory contains 60+ `.test.ts` files in `security/`, `governance/`, `quality/`, `brain/`, `fleet/`, `knowledge/`, `intent/`, `context/` that have never run. This stream wires a real test runner over them, runs them in CI, and produces a reachable-modules audit that maps every TypeScript file to its consumers.

**Resolves rating-review weakness:** "Admiral's `package.json` is `npm init` default boilerplate — TS modules in security/, governance/, quality/, brain/, fleet/ etc. do not run."

**Principle:** A test that does not run is documentation, not validation. The Phase 14+ rating audit could not score admiral/ TS modules because none of them had ever executed.

---

## 39.1 Test Runner Repair

- [ ] **TR-01: Replace `admiral/package.json` boilerplate with real scripts**
  - **Description:** Replace the `"test": "echo \"Error: no test specified\"..."` line with a working test harness. Add `test`, `test:ts`, `test:sh`, `lint`, `build` scripts. Wire `test:ts` to `node --test "**/*.test.ts"` (with appropriate glob expansion). Wire `test:sh` to a shell driver that finds and runs every `tests/**/*.sh`. Wire `test` as the union of both. Wire `lint` to Biome. Wire `build` to `tsc`.
  - **Done when:** `cd admiral && npm test` runs and reports a pass/fail summary covering both TS and shell tests.
  - **Files:** `admiral/package.json`, `admiral/scripts/run-shell-tests.sh` (new)
  - **Size:** M
  - **Depends on:** Phase 15 (DV-02, DV-03)

- [ ] **TR-02: Add tsconfig and node:test glob handling**
  - **Description:** `node --test` needs explicit file paths or shell-expanded globs. Update `admiral/tsconfig.json` to compile `.test.ts` files alongside source. Add a glob expansion script (`scripts/find-tests.sh`) that produces a newline-separated list of compiled `.test.js` paths for `node --test` to consume. Verify that every `.test.ts` under `admiral/` is discovered.
  - **Done when:** `find-tests.sh` lists every `.test.ts` file. `node --test "$(find-tests.sh)"` runs all of them.
  - **Files:** `admiral/tsconfig.json`, `admiral/scripts/find-tests.sh` (new)
  - **Size:** M
  - **Depends on:** TR-01

- [ ] **TR-03: First-run report — capture which tests fail vs pass on day one**
  - **Description:** Run the full admiral test suite for the first time and capture the results in `admiral/docs/first-run-results.md`. Report: total tests, passing, failing, errored, runtime. For every failure, capture the file, test name, and error excerpt. This becomes the baseline for Phase 19 (Module Reconnection) decisions.
  - **Done when:** `first-run-results.md` exists with categorized failures and the total pass/fail counts.
  - **Files:** `admiral/docs/first-run-results.md` (new)
  - **Size:** M
  - **Depends on:** TR-02

## 39.2 Reachable-Modules Audit

- [ ] **TR-04: Build the import graph for every TS file under `admiral/`**
  - **Description:** Use a static-analysis script (or `madge`, or a custom AST walker) to produce the import graph for every `.ts` file under `admiral/`. For each file, list its importers. A file with zero importers and no `bin/` entry point is `orphaned`. A file imported only by `.test.ts` files is `test-only`. A file imported by a hook, a CLI in `admiral/bin/`, or a control-plane module is `reachable`.
  - **Done when:** Import graph for every admiral/ TS file is captured in machine-readable form.
  - **Files:** `admiral/scripts/build-import-graph.sh` (new), `admiral/docs/import-graph.json` (new)
  - **Size:** L
  - **Depends on:** TR-01

- [ ] **TR-05: Produce `admiral/docs/reachable-modules.md`**
  - **Description:** Translate the import graph into a human-readable report. For each TS file under `admiral/`, list: path, status (`reachable` / `test-only` / `orphaned`), importer count, top 3 importers (or "none"). Group by directory (`security/`, `governance/`, `quality/`, etc.) so Phase 19 can make per-directory reconnect-or-delete decisions.
  - **Done when:** `reachable-modules.md` exists with every admiral TS file categorized.
  - **Files:** `admiral/docs/reachable-modules.md` (new)
  - **Size:** M
  - **Depends on:** TR-04

- [ ] **TR-06: Quantify orphan count in plan/index.md**
  - **Description:** Add a row to `plan/index.md` titled "Orphaned admiral/ modules" with the count from TR-05. This becomes a tracked metric for Phase 19 to drive to zero. Also add the test-pass rate from TR-03.
  - **Done when:** `plan/index.md` shows orphaned-module count and admiral test-pass rate.
  - **Files:** `plan/index.md`
  - **Size:** S
  - **Depends on:** TR-03, TR-05

## 39.3 CI Integration

- [ ] **TR-07: Add CI workflow `.github/workflows/admiral-ci.yml`**
  - **Description:** Create a new GitHub Actions workflow that runs `cd admiral && npm install && npm test` on every PR. Cache `node_modules` for performance. Upload `first-run-results.md` and `reachable-modules.md` as workflow artifacts so reviewers can inspect them.
  - **Done when:** `admiral-ci.yml` exists, runs on every PR, and uploads the reports as artifacts.
  - **Files:** `.github/workflows/admiral-ci.yml` (new)
  - **Size:** M
  - **Depends on:** TR-03, TR-05

- [ ] **TR-08: Block merges if admiral test pass rate drops**
  - **Description:** Add a CI step that compares the current admiral test pass rate against the committed baseline in `first-run-results.md`. If the pass rate drops below the baseline, fail the build. This protects against regressions while orphaned modules are reconnected or deleted in Phase 19.
  - **Done when:** CI fails if admiral test pass rate falls below the baseline.
  - **Files:** `admiral/scripts/check-test-rate.sh` (new), `.github/workflows/admiral-ci.yml`
  - **Size:** S
  - **Depends on:** TR-07

---

## Dependencies

| Item | Depends on |
|------|-----------|
| TR-01 (script repair) | Phase 15 (versions pinned) |
| TR-02 (tsconfig + globs) | TR-01 |
| TR-03 (first-run report) | TR-02 |
| TR-04 (import graph) | TR-01 |
| TR-05 (reachable-modules report) | TR-04 |
| TR-06 (plan/index.md) | TR-03, TR-05 |
| TR-07 (CI workflow) | TR-03, TR-05 |
| TR-08 (rate-drop guard) | TR-07 |

---

## Exit Criteria

- `cd admiral && npm test` runs every `.test.ts` and every `tests/**/*.sh` and reports a pass/fail summary.
- `admiral/docs/first-run-results.md` records the day-one pass rate.
- `admiral/docs/reachable-modules.md` lists every admiral/ TS file with `reachable`, `test-only`, or `orphaned` status.
- `plan/index.md` reports orphan count and test-pass rate.
- CI runs admiral tests on every PR and blocks regressions.
