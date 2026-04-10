# TODO: Admiral Test Runner Repair & Reachable-Modules Audit (Phase 16)

> Source: `plan/ROADMAP.md` Phase 16, `plan/stream-39-admiral-test-runner-repair.md`

**Resolves rating-review weakness:** `admiral/package.json` is `npm init` default boilerplate; 60+ `.test.ts` files have never run.

**Phase exit:** `cd admiral && npm test` runs every `.test.ts` and `tests/**/*.sh`; reachable-modules report committed; CI runs admiral tests on every PR.

---

## Test Runner Repair

- [ ] **TR-01** — Replace `admiral/package.json` boilerplate with real `test`, `test:ts`, `test:sh`, `lint`, `build` scripts.
- [ ] **TR-02** — Update `admiral/tsconfig.json` and add `scripts/find-tests.sh` glob expander for `node:test`.
- [ ] **TR-03** — Run the full admiral test suite for the first time; capture results in `admiral/docs/first-run-results.md`.

## Reachable-Modules Audit

- [ ] **TR-04** — Build the import graph for every TS file under `admiral/`. Output `admiral/docs/import-graph.json`.
- [ ] **TR-05** — Translate import graph into `admiral/docs/reachable-modules.md` with `reachable` / `test-only` / `orphaned` per file.
- [ ] **TR-06** — Quantify orphan count and admiral test-pass rate in `plan/index.md`.

## CI Integration

- [ ] **TR-07** — Create `.github/workflows/admiral-ci.yml` running `npm install && npm test` on every PR; upload reports as artifacts.
- [ ] **TR-08** — Add baseline check that fails CI if admiral test pass rate drops below the committed baseline.
