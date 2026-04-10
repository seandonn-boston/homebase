# TODO: Legacy Carryover Sweep & Documentation Reconciliation (Phase 23)

> Source: `plan/ROADMAP.md` Phase 23, `plan/stream-46-legacy-carryover-sweep.md`

**Resolves:** 14 carryover items hidden under "COMPLETE" status markers in Phases 9–13. Phase 10 has no Status: line. Stream 37 reconciliation report was never published. `IMPLEMENTATION_STATUS.md` is six spec versions stale and missing rows for Part 13 and ASP. Spec/runtime drift on "15 vs 16 Standing Orders".

**Phase exit:** Every carryover item closed or moved to Phase 24 with a tracking pointer. Reconciliation report published. `IMPLEMENTATION_STATUS.md` current to v0.23.15-alpha with all 13 spec parts + ASP. Standing Orders count drift resolved with CI enforcement.

---

## Carryovers from Phase 9 (`todo/04`)

- [ ] **LC-A08** — Hook execution pipeline abstraction (5-phase lifecycle: load → validate → execute → emit → report). *Originally A-08; deferred to closed Phase 3.*
- [ ] **LC-A09** — Plugin architecture for hook extensions (`admiral/plugins/hooks/`, manifest schema, example plugin). *Originally A-09; deferred to closed Phase 3. Depends on LC-A08.*
- [ ] **LC-D04** — Inline `# why:` comments on every regex/threshold/state mutation across all 21 hooks. *Originally D-04; deferred to closed Phase 2.*
- [ ] **LC-C03** — CodeQL security scanning enabled with PR-blocking on high/critical, weekly scheduled scan. *Originally C-03; deferred "requires GitHub Advanced Security setup" — that setup is in scope.*

> **Note:** C-02 (matrix CI builds) is owned by Phase 15 / DV-06 and is NOT relisted here. P-09 (SO compliance audit) is owned by Phase 18 / PE-09. P-10 (Hook coverage report) is owned by Phase 17 / HD-07. All three are struck through in `todo/04` with redirect pointers.

## Carryovers from Phase 10 (`todo/08`)

- [ ] **LC-B12** — MCP server scaffold full completion: 8 tool endpoints with JSON-RPC handlers, schema validation, error responses, integration tests. *Originally B-12; partial.*
- [ ] **LC-B16** — Multi-signal retrieval pipeline (FTS + pgvector + temporal + graph) with configurable weights and result fusion. *Originally B-16; never started.*
- [ ] **LC-B18** — Quarantine integration with brain ingestion: all external content passes 5-layer pipeline before write; `quarantine_status` metadata. *Originally B-18; partial.*
- [ ] **LC-DE10** — Knowledge search REST API in control plane (search, entry, links, health, stats endpoints) with auth and rate limiting. *Originally DE-10; never started; was a Phase 10 exit criterion. Depends on LC-B16.*

## Carryovers from Phase 12 (`todo/06`, `todo/11`)

- [ ] **LC-O02a** — `tier_validation` SessionStart hook full completion: reject sessions where active model doesn't meet agent's minimum tier. *Originally O-02a; partial.*
- [ ] **LC-AU10** — Trust reporting and analytics: fleet-wide distribution, velocity, demotion frequency, trust-cost correlation, override frequency; stored in Brain `_meta`. *Originally AU-10; partial.*

> **Note:** F-15 (ASP full alignment) belongs with Fleet F4 and is owned by Phase 24 / Stream 47 (F4-07 through F4-10). Struck through in `todo/06` with redirect pointer.

## Carryovers from Phase 13 (`todo/09`)

- [ ] **LC-M07c** — MCP Level 5 security tests covering OWASP MCP Top 10 (SSRF, injection, excessive permissions, undeclared egress monitoring). *Originally M-07c; partial.*
- [ ] **LC-OB09** — Incident timeline reconstruction: chronological timeline with causal links, anomaly flagging, <5s for 1000 events, markdown + JSON output. *Originally OB-09; partial.*

## Stream 37 Reconciliation Report (Missing Deliverable)

- [ ] **LC-RC01** — Build and publish `docs/reconciliation-report-2026-04-10.md`. Walk every `[x]` checkbox in `plan/todo/*.md`, locate the claimed file/test, verify existence and that the test passes. Flag false completions.
- [ ] **LC-RC02** — Add CI job that runs the reconciliation script on every PR and fails if a previously-checked item now has missing files or failing tests. Depends on LC-RC01.

## Documentation Reconciliation

- [ ] **LC-DR01** — Update `admiral/IMPLEMENTATION_STATUS.md` from v0.17.1-alpha to current spec v0.23.15-alpha. Walk every change between the two versions and update implementation state.
- [ ] **LC-DR02** — Add row for Part 13 (MCP Integration) to `IMPLEMENTATION_STATUS.md`. Depends on LC-DR01.
- [ ] **LC-DR03** — Add row for Agent Spec Protocol (ASP) sub-spec to `IMPLEMENTATION_STATUS.md`. Note that full alignment is owned by Phase 24 / Stream 47. Depends on LC-DR01.
- [ ] **LC-DR04** — Reconcile "15 vs 16 Standing Orders" drift between `aiStrat/admiral/spec/index.md:130` (says 15) and runtime (carries 16). Pick canonical count, update wrong side, write ADR, add `scripts/check-so-count.sh` CI guard.
