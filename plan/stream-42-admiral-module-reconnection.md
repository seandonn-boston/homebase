# Stream 42: Admiral Module Reconnection

> Using the reachable-modules audit from Stream 39 (Phase 16), either wire the orphaned TypeScript sub-trees in `admiral/` into the hook pipeline OR delete them. No third option. The current state — large, untested, architecturally-sound-but-dead sub-trees — is the most misleading part of the codebase.

**Phase:** 19 — Admiral Module Reconnection (Credibility Closure Tier)

**Scope:** `admiral/security/` (17 TS), `admiral/governance/` (19 TS), `admiral/quality/` (26 TS), `admiral/brain/` (27 TS, where not actively integrated), `admiral/fleet/` (11 TS), `admiral/knowledge/` (10 TS), `admiral/intent/` (10 TS), `admiral/context/` (6 TS) all contain substantial TypeScript modules with parallel `.test.ts` files but no documented invocation path from the hook pipeline. The Phase 14+ rating audit flagged these as "false implementation" — they exist as files but never affect runtime. This stream operates on the data from Stream 39's `reachable-modules.md` and forces a reconnect-or-delete decision for every orphaned module.

**Resolves rating-review weakness:** "Module disconnection — large TS sub-trees in `admiral/` are not integrated into the hook pipeline."

**Principle:** A module that nothing imports is dead code. Dead code that has tests is misleading dead code. The framework's spec-implementation score must reflect what actually runs, not what was once typed.

---

## 42.1 Triage

- [ ] **MR-01: Read `reachable-modules.md` and produce a triage spreadsheet**
  - **Description:** For every TS file flagged `orphaned` in Stream 39's `admiral/docs/reachable-modules.md`, decide one of three dispositions: `wire` (a real consumer exists or a hook can call it), `delete` (no consumer, no plan), `defer` (spec gap acknowledged, kept under a feature flag with a tracking ticket). Output as `admiral/docs/module-triage.md`. Default disposition: `delete`. `wire` and `defer` require a written justification.
  - **Done when:** Triage spreadsheet exists with disposition + justification for every orphaned module.
  - **Files:** `admiral/docs/module-triage.md` (new)
  - **Size:** L
  - **Depends on:** Stream 39 (TR-05)

- [ ] **MR-02: Group triage by directory and assign per-directory owners**
  - **Description:** Group the triage decisions from MR-01 by directory (`security/`, `governance/`, `quality/`, etc.). For each directory, list the count of `wire` / `delete` / `defer` decisions and the dominant disposition. This identifies which directories will be substantially deleted vs. wired.
  - **Done when:** Per-directory summary exists at the top of `module-triage.md`.
  - **Files:** `admiral/docs/module-triage.md`
  - **Size:** S
  - **Depends on:** MR-01

## 42.2 Wire

- [ ] **MR-03: Wire `admiral/security/` modules to enforcement hooks**
  - **Description:** For every `wire` disposition in `admiral/security/`, create the import path. Most security modules are good candidates for invocation by `zero_trust_validator.sh`, `prohibitions_enforcer.sh`, or `privilege_check.sh`. Add a smoke test per wired module that proves it executes when its hook fires. Update the hook to invoke the module via `node` if the module is TypeScript (or via direct shell invocation if compiled).
  - **Done when:** Every `wire` module under `security/` has a documented call site in a hook and a smoke test that runs in CI.
  - **Files:** `.hooks/zero_trust_validator.sh`, `.hooks/prohibitions_enforcer.sh`, `.hooks/privilege_check.sh`, `admiral/security/**.ts`, `admiral/tests/test_security_wiring.sh` (new)
  - **Size:** L
  - **Depends on:** MR-02, Phase 18

- [ ] **MR-04: Wire `admiral/governance/`, `quality/`, `brain/`, `fleet/`, `knowledge/`, `intent/`, `context/` modules**
  - **Description:** Repeat MR-03 for the remaining directories. Each `wire` module must end up with a hook call site, a CLI in `admiral/bin/`, or a control-plane import. Modules with no realistic call site are downgraded to `delete` or `defer` and the triage table is updated.
  - **Done when:** Every `wire` module across all directories has a documented call site and a smoke test.
  - **Files:** `.hooks/*.sh` (multiple), `admiral/bin/*` (new CLIs as needed), `admiral/tests/test_*_wiring.sh` (new)
  - **Size:** XL
  - **Depends on:** MR-02, Phase 18

## 42.3 Delete

- [ ] **MR-05: Delete `delete`-disposition modules and their tests**
  - **Description:** For every `delete` disposition in MR-01, remove the source file, the test file, and any references in `admiral/package.json`, tsconfig, or imports. Verify the admiral test suite still passes after each deletion (incremental commits).
  - **Done when:** Every `delete` module is removed. `cd admiral && npm test` still passes. No dangling imports.
  - **Files:** `admiral/security/**`, `admiral/governance/**`, `admiral/quality/**`, `admiral/brain/**`, `admiral/fleet/**`, `admiral/knowledge/**`, `admiral/intent/**`, `admiral/context/**` (selective deletions)
  - **Size:** L
  - **Depends on:** MR-02

- [ ] **MR-06: Write deletion ADRs**
  - **Description:** For every directory where ≥3 modules were deleted, write a one-paragraph ADR in `docs/adr/` explaining: what was deleted, why (pick one: spec gap, duplicate of working module, never integrated, superseded), and what is preserved if any. ADRs follow the existing numbering scheme.
  - **Done when:** Per-directory deletion ADRs exist for every substantially-deleted directory.
  - **Files:** `docs/adr/0NN-deletion-*.md` (multiple new files)
  - **Size:** M
  - **Depends on:** MR-05

## 42.4 Defer

- [ ] **MR-07: Move `defer`-disposition modules under a feature flag**
  - **Description:** For every `defer` disposition, move the module to `admiral/<dir>/deferred/` with a README explaining what the module is for, what blocks integration, and what tracking ticket owns it. Add a banner comment to each file: `// DEFERRED: not wired into runtime. See deferred/README.md.` Tests for deferred modules are kept but excluded from the default `npm test` run (use a separate `test:deferred` script).
  - **Done when:** Every `defer` module is under a `deferred/` subdirectory with a banner and a tracking ticket reference.
  - **Files:** `admiral/<dir>/deferred/**`, `admiral/package.json` (add `test:deferred`)
  - **Size:** M
  - **Depends on:** MR-02

## 42.5 Status Update

- [ ] **MR-08: Update `IMPLEMENTATION_STATUS.md` to remove false-positive "Not started" labels**
  - **Description:** The current `admiral/IMPLEMENTATION_STATUS.md` labels several spec parts as "Not started" even though `admiral/` contains TS modules for them. After Phase 19, the labels should reflect reality: `Done` for wired modules, `Deferred` for `defer` modules, `Not started` only where no code exists.
  - **Done when:** `IMPLEMENTATION_STATUS.md` accurately labels every spec part.
  - **Files:** `admiral/IMPLEMENTATION_STATUS.md`
  - **Size:** S
  - **Depends on:** MR-03, MR-04, MR-05, MR-07

- [ ] **MR-09: Re-run reachable-modules audit and confirm zero orphans**
  - **Description:** After MR-03..MR-07, re-run the audit script from Stream 39 and confirm that every TS file under `admiral/` is `reachable`, `test-only`, or under `deferred/`. The orphan count should be zero. Update `plan/index.md`.
  - **Done when:** `reachable-modules.md` shows zero orphans (excluding `deferred/`). `plan/index.md` reflects.
  - **Files:** `admiral/docs/reachable-modules.md`, `plan/index.md`
  - **Size:** S
  - **Depends on:** MR-03, MR-04, MR-05, MR-07

---

## Dependencies

| Item | Depends on |
|------|-----------|
| MR-01 (triage) | Stream 39 (TR-05) |
| MR-02 (per-dir summary) | MR-01 |
| MR-03 (wire security) | MR-02, Phase 18 |
| MR-04 (wire other dirs) | MR-02, Phase 18 |
| MR-05 (delete) | MR-02 |
| MR-06 (deletion ADRs) | MR-05 |
| MR-07 (defer) | MR-02 |
| MR-08 (status update) | MR-03, MR-04, MR-05, MR-07 |
| MR-09 (re-audit) | MR-03, MR-04, MR-05, MR-07 |

---

## Exit Criteria

- Every TS file under `admiral/` is `reachable`, `test-only`, or under `deferred/`.
- `reachable-modules.md` shows zero orphans (excluding `deferred/`).
- Every directory with ≥3 deletions has a deletion ADR.
- Every wired module has a smoke test that runs in CI.
- `IMPLEMENTATION_STATUS.md` accurately labels every spec part.
- `plan/index.md` reflects the new orphan count (0).
