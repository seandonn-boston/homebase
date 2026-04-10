# TODO: Admiral Module Reconnection (Phase 19)

> Source: `plan/ROADMAP.md` Phase 19, `plan/stream-42-admiral-module-reconnection.md`

**Resolves rating-review weakness:** Large TS sub-trees in `admiral/security/`, `governance/`, `quality/`, `brain/`, `fleet/`, `knowledge/`, `intent/`, `context/` are not integrated into the hook pipeline.

**Phase exit:** Every TS file under `admiral/` is `reachable`, `test-only`, or under `deferred/`. Zero orphans. Per-directory deletion ADRs for substantially-deleted directories.

---

## Triage

- [ ] **MR-01** — For every orphaned module from Stream 39, decide `wire` / `delete` / `defer`. Output `admiral/docs/module-triage.md`. Default: `delete`.
- [ ] **MR-02** — Group triage by directory; produce per-directory summary with dominant disposition.

## Wire

- [ ] **MR-03** — Wire `admiral/security/` modules to `zero_trust_validator.sh`, `prohibitions_enforcer.sh`, or `privilege_check.sh` with smoke tests.
- [ ] **MR-04** — Wire remaining directories (`governance/`, `quality/`, `brain/`, `fleet/`, `knowledge/`, `intent/`, `context/`) to hooks or CLIs in `admiral/bin/`. Each wired module gets a smoke test.

## Delete

- [ ] **MR-05** — Delete `delete`-disposition modules and their tests. Verify `cd admiral && npm test` still passes after each deletion.
- [ ] **MR-06** — Write deletion ADRs for every directory with ≥3 deletions.

## Defer

- [ ] **MR-07** — Move `defer`-disposition modules to `<dir>/deferred/` with banner comment and tracking ticket reference. Add `test:deferred` script.

## Status Update

- [ ] **MR-08** — Update `IMPLEMENTATION_STATUS.md` to remove false-positive "Not started" labels.
- [ ] **MR-09** — Re-run reachable-modules audit; confirm zero orphans (excluding `deferred/`); update `plan/index.md`.
