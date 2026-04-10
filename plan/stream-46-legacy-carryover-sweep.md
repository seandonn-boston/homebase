# Stream 46: Legacy Carryover Sweep & Documentation Reconciliation

> Re-home every item from Phases 9, 10, 12, 13 that was deferred to a closed phase, marked partial without follow-up, or quietly skipped. Publish the missing Stream 37 Roadmap-to-Code Reconciliation report. Bring `admiral/IMPLEMENTATION_STATUS.md` up to spec v0.23.15-alpha.

**Phase:** 23 — Legacy Carryover Sweep & Documentation Reconciliation (Legacy Reconciliation Tier)

**Scope:** A check-state audit across `plan/todo/01–19` reveals 14 items that are unchecked or partial despite their parent phases being marked COMPLETE. Phase 10 has no Status: line at all and quietly carries 4 of those items. Stream 37 (Roadmap-to-Code Reconciliation) was the mechanism designed to detect exactly this kind of drift; there is no evidence it was published. This stream sweeps the carryovers, publishes the reconciliation report, refreshes `admiral/IMPLEMENTATION_STATUS.md` (currently pinned to v0.17.1-alpha — six spec versions behind v0.23.15-alpha), and resolves the "15 vs 16 Standing Orders" drift between spec and runtime.

**Resolves:** Hidden incompleteness in Phases 9–13 carrying false-COMPLETE markers.

**Principle:** The reconciliation mechanism is itself a deliverable. A roadmap that claims items are done without checking is worse than no roadmap, because it manufactures false confidence.

---

## 46.1 Carryover Items (Re-Homed from Closed Phases)

Items below were previously listed in `todo/04`, `todo/06`, `todo/08`, `todo/09`, `todo/11`. They are now owned by this stream. Each origin location has been struck through with a redirect pointer dated 2026-04-10.

### From Phase 9 (Quality Rigor — `todo/04`)

- [ ] **LC-A08: Hook execution pipeline abstraction** — Implement the formal 5-phase hook lifecycle (load → validate → execute → emit → report). Each phase has explicit input/output contracts. Hooks declare which phases they participate in. The pipeline driver enforces ordering and short-circuits on hard-block. *(Originally A-08, deferred to closed Phase 3.)*
  - **Files:** `admiral/lib/hook_pipeline.sh` (new), `docs/adr/0NN-hook-pipeline.md`
  - **Size:** L

- [ ] **LC-A09: Plugin architecture for hook extensions** — Plugin discovery in `admiral/plugins/hooks/`, manifest schema (`plugin.json` with name, version, hook_event, exit_codes), example plugin, plugin loader in the pipeline. *(Originally A-09, deferred to closed Phase 3.)*
  - **Files:** `admiral/plugins/hooks/`, `admiral/lib/plugin_loader.sh` (new), `admiral/schemas/plugin.v1.schema.json`
  - **Size:** L
  - **Depends on:** LC-A08

- [ ] **LC-D04: Inline "why" comments on hook regex/thresholds** — Audit all 21 hooks. Annotate every regex pattern, magic number, threshold, and state mutation with a `# why:` comment explaining the rationale. *(Originally D-04, deferred to closed Phase 2.)*
  - **Files:** `.hooks/*.sh` (all)
  - **Size:** M

- [ ] **LC-C03: CodeQL security scanning** — Enable GitHub Advanced Security CodeQL scanning for TypeScript and bash. Block PRs on high/critical findings. Weekly scheduled scan on main. *(Originally C-03, deferred "requires GitHub Advanced Security setup" — that setup is in scope here.)*
  - **Files:** `.github/workflows/codeql.yml` (new)
  - **Size:** S

### From Phase 10 (Security/Brain B3 — `todo/08`)

- [ ] **LC-B12: MCP server scaffold (8 tool endpoints) — full completion** — Currently partial. Complete the 8 tool endpoints (`brain_record`, `brain_query`, `brain_retrieve`, `brain_strengthen`, `brain_supersede`, `brain_status`, `brain_audit`, `brain_purge`) with full JSON-RPC handlers, request validation against `mcp-tool-schema.v1.schema.json`, error responses, and integration tests. *(Originally B-12.)*
  - **Files:** `mcp-server/src/tools/brain/*.ts`, `mcp-server/src/tools/brain/*.test.ts`
  - **Size:** L

- [ ] **LC-B16: Multi-signal retrieval pipeline** — Combine keyword (FTS5), semantic (pgvector), temporal (recency), and link-based (graph proximity) signals into a single retrieval pipeline. Configurable per-signal weights. Query-time signal selection. Result fusion via reciprocal rank or weighted sum. *(Originally B-16, never started.)*
  - **Files:** `admiral/brain/multi-signal-retrieval.ts` (new), `admiral/brain/multi-signal-retrieval.test.ts` (new)
  - **Size:** XL

- [ ] **LC-B18: Quarantine integration with brain ingestion** — All external content (MCP responses, A2A messages, harvested knowledge) passes the 5-layer quarantine pipeline before brain ingestion. `quarantine_status` metadata recorded on every entry. Quarantined entries are stored separately and require Admiral approval to graduate. *(Originally B-18, partial.)*
  - **Files:** `admiral/brain/quarantine-integration.ts` (extend), `admiral/monitor/quarantine/pipeline.sh`
  - **Size:** L

- [ ] **LC-DE10: Knowledge search REST API** — REST endpoints in `control-plane/`: `GET /api/knowledge/search`, `GET /api/knowledge/entry/:id`, `GET /api/knowledge/links/:id`, `GET /api/knowledge/health`, `GET /api/knowledge/stats`. Semantic search via the multi-signal retrieval pipeline (LC-B16). Authentication via identity tokens. Rate limiting via existing `rate-limiter.ts`. *(Originally DE-10, never started; was a Phase 10 exit criterion that was never met.)*
  - **Files:** `control-plane/src/knowledge-api.ts` (new), `control-plane/src/knowledge-api.test.ts` (new)
  - **Size:** L
  - **Depends on:** LC-B16

### From Phase 12 (DX & Monitoring — `todo/06`, `todo/11`)

- [ ] **LC-O02a: `tier_validation` SessionStart hook** — Currently partial. Reject sessions where the active model does not meet the agent's minimum tier requirement (e.g., a security-auditor agent requires Sonnet+, refuses to start with Haiku). Reads tier requirements from agent definitions, runs at session start, exits 2 if unmet. *(Originally O-02a.)*
  - **Files:** `.hooks/tier_validation.sh` (extend), `.hooks/tests/test_tier_validation.sh`
  - **Size:** M

- [ ] **LC-AU10: Trust reporting and analytics** — Currently partial. Generate fleet-wide trust reports: distribution histogram, trust velocity, demotion frequency, trust-cost correlation, operator override frequency. Store reports in Brain `_meta` namespace for long-term trend analysis. *(Originally AU-10.)*
  - **Files:** `admiral/governance/trust-analytics.ts` (extend), `admiral/governance/trust-analytics.test.ts`
  - **Size:** M

### From Phase 13 (Strategic Positioning — `todo/09`)

- [ ] **LC-M07c: MCP Level 5 security tests (OWASP MCP Top 10)** — Currently partial. Cover: SSRF via MCP tool URLs, injection via tool arguments, excessive permissions on tool invocations, undeclared egress monitoring (catch tools that exfiltrate beyond their declared network scope). One test scenario per OWASP MCP Top 10 category. *(Originally M-07c.)*
  - **Files:** `mcp-server/src/security/owasp-tests.test.ts` (new)
  - **Size:** L

- [ ] **LC-OB09: Incident timeline reconstruction** — Currently partial. Given a session ID, reconstruct the complete chronological timeline with causal links between events. Flag anomalies (gaps, out-of-order events, missing handoff acknowledgements). Complete reconstruction in <5s for sessions with 1000 events. Markdown and JSON output formats. *(Originally OB-09.)*
  - **Files:** `control-plane/src/incident-timeline.ts` (extend), `control-plane/src/incident-timeline.test.ts`
  - **Size:** M

## 46.2 Stream 37 Reconciliation Report (Missing Deliverable)

- [ ] **LC-RC01: Publish the Roadmap-to-Code Reconciliation report** — Stream 37 was a Phase 10 deliverable that defined the format: "audit all roadmap items marked 'done' against actual code; flag false completions; produce a reconciliation report mapping every claimed deliverable to its file/test." There is no evidence this was ever published. Build it now: walk every `[x]` checkbox in `plan/todo/*.md`, locate the claimed file/test, verify existence and that the test passes. Output as `docs/reconciliation-report-2026-04-10.md`.
  - **Files:** `docs/reconciliation-report-2026-04-10.md` (new), `scripts/build-reconciliation-report.sh` (new)
  - **Size:** L
  - **Depends on:** —

- [ ] **LC-RC02: Establish ongoing drift detection** — Add a CI job that runs the reconciliation script on every PR and fails if a previously-checked item now has missing files or failing tests. This makes the Stream 37 mechanism continuous instead of one-shot.
  - **Files:** `.github/workflows/reconciliation-drift.yml` (new)
  - **Size:** S
  - **Depends on:** LC-RC01

## 46.3 Documentation Reconciliation

- [ ] **LC-DR01: Update `admiral/IMPLEMENTATION_STATUS.md` to spec v0.23.15-alpha** — The status file is currently pinned to v0.17.1-alpha (last updated 2026-03-16). The current spec is v0.23.15-alpha (`aiStrat/VERSION`). Walk every change between the two versions, update the status file with current implementation state, and bump the version pin.
  - **Files:** `admiral/IMPLEMENTATION_STATUS.md`
  - **Size:** M

- [ ] **LC-DR02: Add row for Part 13 (MCP Integration)** — `IMPLEMENTATION_STATUS.md` covers Parts 1–12 only. Part 13 (`aiStrat/admiral/spec/part13-mcp-integration.md`, 588 lines) has no row. Add it with current implementation state pointing to `mcp-server/`.
  - **Files:** `admiral/IMPLEMENTATION_STATUS.md`
  - **Size:** S
  - **Depends on:** LC-DR01

- [ ] **LC-DR03: Add row for Agent Spec Protocol (ASP)** — ASP is a sub-spec at `aiStrat/admiral/spec/agent-spec-protocol/` with templates, examples, validation, and an authoring guide. It has no row in `IMPLEMENTATION_STATUS.md`. Add it. Note that full ASP alignment is owned by Phase 24 / Stream 47.
  - **Files:** `admiral/IMPLEMENTATION_STATUS.md`
  - **Size:** S
  - **Depends on:** LC-DR01

- [ ] **LC-DR04: Reconcile "15 vs 16 Standing Orders" drift** — `aiStrat/admiral/spec/index.md:130` says "all 15 Standing Orders" but the runtime carries 16 (`admiral/standing-orders/01-*.json` through `16-*.json`). Pick the canonical count, update whichever side is wrong, document the change in `docs/adr/0NN-standing-orders-count.md`, and add a CI check that fails if the count drifts again.
  - **Files:** `aiStrat/admiral/spec/index.md` OR `admiral/standing-orders/`, `docs/adr/0NN-standing-orders-count.md`, `scripts/check-so-count.sh` (new)
  - **Size:** M

---

## Dependencies

| Item | Depends on |
|------|-----------|
| LC-A09 (plugin arch) | LC-A08 (pipeline abstraction) |
| LC-DE10 (knowledge API) | LC-B16 (multi-signal retrieval) |
| LC-RC02 (drift CI) | LC-RC01 (initial report) |
| LC-DR02, LC-DR03 (Part 13/ASP rows) | LC-DR01 (status file refresh) |

**Phase-level depends on:** Phase 22 (so the carryover audit reflects post-Credibility-Closure reality — some carryovers may already be closed as side-effects of Phases 15–22).

---

## Exit Criteria

- All 14 carryover items either checked (complete) or moved to Phase 24 with a tracking pointer.
- `docs/reconciliation-report-2026-04-10.md` exists and is published.
- CI job runs the reconciliation script on every PR and blocks regressions.
- `admiral/IMPLEMENTATION_STATUS.md` is current to spec v0.23.15-alpha.
- `IMPLEMENTATION_STATUS.md` has rows for all 13 spec parts plus ASP.
- The "15 vs 16 Standing Orders" drift is resolved with one canonical count and CI enforcement.
