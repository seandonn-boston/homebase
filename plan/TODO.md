# Project TODO — Admiral Framework Implementation

> Canonical task list. Each Phase is an Epic. Each X.Y is a task (branch + PR).
> Each X.Y.Z is a subtask (commit). Branch convention: `task/X.Y-short-name`.
>
> **Sizes:** [S] < 1hr | [M] 1-3hr | [L] 3+hr | [XL] multi-day
>
> **Note:** Hooks currently use `claude/` branch prefix. Update hooks for `task/` compatibility before Phase 1.

---

## Phase 0 — Foundation: Strategy Triangle + Spec Debt

**Goal:** Establish the strategic foundation and resolve spec gaps that block downstream work.
**Done when:** Ground Truth templates exist, readiness tooling works, spec debt inventory is complete, and blocking spec gaps have proposals.

### 0.1 Ground Truth Templates [L] `task/0.1-ground-truth-templates`

> Depends on: nothing (foundational)

- [ ] 0.1.1 Write tests for Ground Truth schema validation (TDD)
- [ ] 0.1.2 Create Mission template (`admiral/strategy/templates/mission.yaml`)
- [ ] 0.1.3 Create Boundaries template (`admiral/strategy/templates/boundaries.yaml`)
- [ ] 0.1.4 Create Success Criteria template (`admiral/strategy/templates/success-criteria.yaml`)
- [ ] 0.1.5 Create JSON schema (`admiral/strategy/ground-truth.schema.json`)
- [ ] 0.1.6 Build `generate_ground_truth.sh` CLI to scaffold blank Ground Truth
- [ ] 0.1.7 Build validator for required fields
- [ ] 0.1.8 Cleanup: lint, shellcheck, docs

**Ref:** Stream 0 — ST-01 | Part 1 — Strategy Triangle

### 0.2 Project Readiness Assessment [L] `task/0.2-readiness-assessment`

> Depends on: 0.1

- [ ] 0.2.1 Write tests for readiness states (Ready/Partial/Not Ready) (TDD)
- [ ] 0.2.2 Implement `readiness_assess.sh` with per-check scripts
- [ ] 0.2.3 Check: Ground Truth completeness (via 0.1 validator)
- [ ] 0.2.4 Check: CI config, test suite, linter config, documented conventions
- [ ] 0.2.5 Output preparation path for Not Ready projects
- [ ] 0.2.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 0 — ST-02 | Part 1 — Strategy Triangle

### 0.3 Go/No-Go Deployment Gate [M] `task/0.3-go-no-go-gate`

> Depends on: 0.2

- [ ] 0.3.1 Write tests for gate pass/fail/override behavior (TDD)
- [ ] 0.3.2 Implement `go_no_go_gate.sh` wrapping readiness assessment
- [ ] 0.3.3 Add override mechanism with append-only justification log
- [ ] 0.3.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 0 — ST-03 | Part 1 — Strategy Triangle

### 0.4 Task Acceptance Criteria Template [M] `task/0.4-task-criteria`

> Depends on: 0.1

- [ ] 0.4.1 Write tests for task criteria validation (TDD)
- [ ] 0.4.2 Create task criteria YAML template and JSON schema
- [ ] 0.4.3 Build `validate_task_criteria.sh`
- [ ] 0.4.4 Reject tasks missing required criteria fields
- [ ] 0.4.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 0 — ST-04 | Part 1 — Strategy Triangle

### 0.5 Spec-First Pipeline Gate [M] `task/0.5-spec-first-gate`

> Depends on: 0.1

- [ ] 0.5.1 Write tests for pipeline stage enforcement (TDD)
- [ ] 0.5.2 Create `pipeline_manifest.yaml` mapping stages to artifacts
- [ ] 0.5.3 Implement `spec_first_gate.sh`
- [ ] 0.5.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 0 — ST-05 | Part 1 — Strategy Triangle

### 0.6 Strategy Validation Hook [M] `task/0.6-strategy-validation-hook`

> Depends on: 0.1, Stream 7 (hook infrastructure)

- [ ] 0.6.1 Write tests for SessionStart validation behavior (TDD)
- [ ] 0.6.2 Implement `.hooks/strategy_triangle_validate.sh`
- [ ] 0.6.3 Implement reusable `validate_ground_truth.sh`
- [ ] 0.6.4 Register in hooks manifest, verify <2s execution
- [ ] 0.6.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 0 — ST-06 | Part 1 — Strategy Triangle

### 0.7 LLM-Last + Boundaries Enforcement [M] `task/0.7-llm-last-boundaries`

> Depends on: 0.1, 0.6

- [ ] 0.7.1 Write tests for LLM-Last and boundaries checklist (TDD)
- [ ] 0.7.2 Create `llm-last.yaml` reference template
- [ ] 0.7.3 Create `boundaries_checklist.yaml` with required categories
- [ ] 0.7.4 Implement `validate_llm_last.sh` and `validate_boundaries.sh`
- [ ] 0.7.5 Integrate into readiness assessment (0.2) and session hook (0.6)
- [ ] 0.7.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 0 — ST-07, ST-08 | Part 1 — Strategy Triangle

### 0.8 Spec Debt Inventory [M] `task/0.8-spec-debt-inventory`

> Depends on: nothing

- [ ] 0.8.1 Audit `spec-debt.md` and `spec-gaps.md` comprehensively
- [ ] 0.8.2 Create `docs/spec-proposals/debt-inventory.md`
- [ ] 0.8.3 Cross-reference against all plan streams for blocking gaps
- [ ] 0.8.4 Create `docs/spec-proposals/priority-matrix.md`

**Ref:** Stream 21 — SD-01, SD-02

### 0.9 Spec Amendment Proposals [L] `task/0.9-spec-amendments`

> Depends on: 0.8

- [ ] 0.9.1 Create `docs/spec-proposals/amendments/` directory
- [ ] 0.9.2 Write amendment for each active spec gap (standard format)
- [ ] 0.9.3 Write fleet orchestration protocol proposal (SD-10)
- [ ] 0.9.4 Write Brain graduation automation proposal (SD-11)
- [ ] 0.9.5 Write cross-platform hook normalization proposal (SD-12)

**Ref:** Stream 21 — SD-03, SD-10, SD-11, SD-12

### 0.10 Enforcement Map + Constants Audit [M] `task/0.10-enforcement-audit`

> Depends on: nothing

- [ ] 0.10.1 Audit SO enforcement map, propose hooks for advisory-only SOs
- [ ] 0.10.2 Address SO-14 (Compliance/Ethics/Legal) enforcement gap
- [ ] 0.10.3 Audit hook manifests vs spec references
- [ ] 0.10.4 Audit reference constants vs implementation
- [ ] 0.10.5 Create `admiral/config/reference_constants.sh` registry

**Ref:** Stream 21 — SD-04, SD-05, SD-06

### 0.11 Spec Version Tracking [M] `task/0.11-spec-versioning`

> Depends on: 0.10

- [ ] 0.11.1 Create `admiral/config/spec_version_manifest.json`
- [ ] 0.11.2 Map each component to its target spec version
- [ ] 0.11.3 Create `docs/spec-proposals/changelog-bridge.md`
- [ ] 0.11.4 Create spec compliance test scaffolding

**Ref:** Stream 21 — SD-07, SD-08, SD-09

---

## Phase 1 — Code Quality: Testing + Standards + Docs + DX

**Goal:** Bring testing, code quality, documentation, and developer experience to production grade.
**Done when:** ≥80% test coverage, all hooks standardized, core docs complete, one-command setup works.

### 1.1 Unit Tests — Untested Modules [M] `task/1.1-unit-tests-core`

> Depends on: nothing

- [ ] 1.1.1 Add `trace.test.ts` — ≥80% branch coverage (TDD)
- [ ] 1.1.2 Add `ingest.test.ts` — ≥80% branch coverage
- [ ] 1.1.3 Add `instrumentation.test.ts` — ≥90% branch coverage
- [ ] 1.1.4 Add `events.test.ts` — ≥90% branch coverage
- [ ] 1.1.5 Cleanup: verify all tests pass, no flaky tests

**Ref:** Stream 1 — T-01 through T-04

### 1.2 Edge Case + Robustness Tests [M] `task/1.2-edge-case-tests`

> Depends on: 1.1

- [ ] 1.2.1 Add malformed JSON edge cases to `server.test.ts` (TDD)
- [ ] 1.2.2 Add hook edge cases: malformed JSON, missing jq, empty stdin, huge payloads
- [ ] 1.2.3 Add quarantine edge cases: empty queue, corrupt entries, concurrent ops
- [ ] 1.2.4 Cleanup: verify fail-open behavior per ADR-004

**Ref:** Stream 1 — T-05 through T-07

### 1.3 Shared jq Helpers Library [L] `task/1.3-jq-helpers`

> Depends on: nothing

- [ ] 1.3.1 Write tests for jq helper functions (TDD)
- [ ] 1.3.2 Create `admiral/lib/jq_helpers.sh` with `jq_get_field`, `jq_set_field`, etc.
- [ ] 1.3.3 Refactor all hooks to use shared helpers
- [ ] 1.3.4 Cleanup: shellcheck, verify no inline jq duplication

**Ref:** Stream 2 — Q-01

### 1.4 Hook Error Handling Standardization [L] `task/1.4-hook-error-handling`

> Depends on: 1.3

- [ ] 1.4.1 Write tests for `hook_log`, `hook_fail_soft`, `hook_fail_hard`, `hook_pass` (TDD)
- [ ] 1.4.2 Create `admiral/lib/hook_utils.sh`
- [ ] 1.4.3 Refactor all 13 hooks to use shared error handling
- [ ] 1.4.4 Standardize hook headers (purpose, exit codes, SO ref, last modified)
- [ ] 1.4.5 Add CI check for hook header compliance
- [ ] 1.4.6 Cleanup: shellcheck, verify consistent exit codes

**Ref:** Stream 2 — Q-02, Q-03, Q-04

### 1.5 TypeScript Quality [M] `task/1.5-ts-quality`

> Depends on: 1.1

- [ ] 1.5.1 Replace `Date.now()` event IDs with `crypto.randomUUID()` (TDD)
- [ ] 1.5.2 Create `AdmiralError` typed error hierarchy
- [ ] 1.5.3 Replace all `err instanceof Error ? err.message : String(err)` patterns
- [ ] 1.5.4 Cleanup: verify all tests pass with new error types

**Ref:** Stream 2 — Q-05, Q-06

### 1.6 Core Documentation [L] `task/1.6-core-docs`

> Depends on: nothing

- [ ] 1.6.1 Create `ADMIRAL_STYLE.md` (naming, error handling, jq, exit codes, testing)
- [ ] 1.6.2 Add `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1)
- [ ] 1.6.3 Add `LICENSE` file (MIT)
- [ ] 1.6.4 Add inline "why" comments to all 13 hooks
- [ ] 1.6.5 Add usage examples to templates
- [ ] 1.6.6 Update `CONTRIBUTING.md` and `AGENTS.md` references
- [ ] 1.6.7 Cleanup: verify all cross-references valid

**Ref:** Stream 4 — D-01 through D-05

### 1.7 One-Command Setup + Dev Container [M] `task/1.7-dev-setup`

> Depends on: nothing

- [ ] 1.7.1 Create `setup.sh` / `Makefile` with `make setup` target
- [ ] 1.7.2 Dependency checks with platform-specific install instructions
- [ ] 1.7.3 Create `.devcontainer/` configuration
- [ ] 1.7.4 Add `make dev` (hot reload), `make ci` (local CI), `make ide` targets
- [ ] 1.7.5 Verify fresh clone + `make setup` → all tests pass
- [ ] 1.7.6 Cleanup: test on macOS + Linux

**Ref:** Stream 26 — DX-01, DX-02, DX-04, DX-06, DX-08

### 1.8 Hook Development CLI [M] `task/1.8-hook-cli`

> Depends on: 1.4

- [ ] 1.8.1 Write tests for scaffold/test/validate commands (TDD)
- [ ] 1.8.2 Create `admiral/cli/hook-cli.sh` with `scaffold`, `test`, `validate`
- [ ] 1.8.3 Create hook template encoding all conventions
- [ ] 1.8.4 Cleanup: verify generated hooks pass all validators

**Ref:** Stream 26 — DX-05

### 1.9 Interactive Dev Guide [M] `task/1.9-dev-guide`

> Depends on: 1.7, 1.8

- [ ] 1.9.1 Write walkthrough: adding a new hook
- [ ] 1.9.2 Write walkthrough: adding a control plane API endpoint
- [ ] 1.9.3 Write walkthrough: adding a Standing Order
- [ ] 1.9.4 Write remaining walkthroughs (Brain entry, quarantine, attack corpus)
- [ ] 1.9.5 Test each walkthrough from scratch

**Ref:** Stream 26 — DX-03

---

## Phase 2 — Architecture: Integration + CI/CD + Self-Enforcement + Monitoring

**Goal:** Bridge control plane and hooks, harden CI, enforce self-discipline, launch scanner.
**Done when:** Events flow bidirectionally, CI has coverage gates + security scanning, scanner runs daily.

### 2.1 Hook–Control Plane Bridge [L] `task/2.1-hook-cp-bridge`

> Depends on: 1.3, 1.4

- [ ] 2.1.1 Write integration tests for bidirectional event flow (TDD)
- [ ] 2.1.2 Create shared signal mechanism (hooks → JSONL → control plane)
- [ ] 2.1.3 Create reverse signal (control plane alerts → file-based → hooks)
- [ ] 2.1.4 Bridge loop_detector.sh events into JSONL for control plane
- [ ] 2.1.5 Cleanup: verify events visible in both systems

**Ref:** Stream 3 — A-02

### 2.2 Schema Validation [L] `task/2.2-schema-validation`

> Depends on: 2.1

- [ ] 2.2.1 Write tests for schema validation (TDD)
- [ ] 2.2.2 Define JSON schemas for hook I/O in `admiral/schemas/`
- [ ] 2.2.3 Create `admiral/lib/schema_validate.sh`
- [ ] 2.2.4 Apply validation to adapters (fail-open per ADR-004)
- [ ] 2.2.5 Add session state schema validation
- [ ] 2.2.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 3 — A-01, A-06

### 2.3 Unified Event Log [L] `task/2.3-unified-event-log`

> Depends on: 2.1

- [ ] 2.3.1 Write tests for unified event log (TDD)
- [ ] 2.3.2 Create `admiral/lib/event_log.sh` shared writer
- [ ] 2.3.3 Update control plane ingestion for unified format
- [ ] 2.3.4 Update dashboard to show hook events in timeline
- [ ] 2.3.5 Document API endpoints (`control-plane/API.md`)
- [ ] 2.3.6 Cleanup: verify coherent timeline

**Ref:** Stream 3 — A-07, A-03

### 2.4 CI Quality Gates [M] `task/2.4-ci-quality-gates`

> Depends on: nothing

- [ ] 2.4.1 Add coverage threshold gate (configurable, ratcheting)
- [ ] 2.4.2 Add matrix builds (ubuntu + macOS)
- [ ] 2.4.3 Add CodeQL security scanning workflow
- [ ] 2.4.4 Add dependency license audit
- [ ] 2.4.5 Add reproducible build verification
- [ ] 2.4.6 Cleanup: verify all gates pass on current codebase

**Ref:** Stream 5 — C-01, C-02, C-03, C-08, C-09

### 2.5 CI Integration + Performance [L] `task/2.5-ci-integration`

> Depends on: 2.1, 2.4

- [ ] 2.5.1 Write end-to-end smoke test (TDD)
- [ ] 2.5.2 Create integration test stage (server + hooks + events)
- [ ] 2.5.3 Add benchmark regression detection with PR comments
- [ ] 2.5.4 Cleanup: verify all CI jobs pass

**Ref:** Stream 5 — C-04, C-05, C-14

### 2.6 Self-Enforcement [M] `task/2.6-self-enforcement`

> Depends on: 1.1, 1.4

- [ ] 2.6.1 CI check: `fix:` commits require test changes
- [ ] 2.6.2 CI check: documentation invariants (module docs, hook headers, ADR format)
- [ ] 2.6.3 Extend pre-commit: AGENTS.md, ADR, SO format validation
- [ ] 2.6.4 Add duplication detection (`jscpd` or custom)
- [ ] 2.6.5 Cleanup: verify all existing files pass new checks

**Ref:** Stream 6 — P-01, P-02, P-05, P-06

### 2.7 Meta-Governance Tests [L] `task/2.7-meta-governance`

> Depends on: 2.1, 2.6

- [ ] 2.7.1 Write meta-test: Admiral tests its own hooks (TDD)
- [ ] 2.7.2 Start control plane → run hooks → ingest → query → assert
- [ ] 2.7.3 Build spec-implementation drift detector
- [ ] 2.7.4 Build plan auto-validation (task counts, orphan refs, duplicate IDs)
- [ ] 2.7.5 Cleanup: integrate into CI

**Ref:** Stream 6 — P-03, P-07, P-08

### 2.8 Quality Metrics Dashboard [L] `task/2.8-quality-dashboard`

> Depends on: 2.5, 2.7

- [ ] 2.8.1 Write tests for quality metrics collection (TDD)
- [ ] 2.8.2 Create `quality-metrics.ts` — collect test count, coverage, hook count, etc.
- [ ] 2.8.3 Add `/dashboard/quality` route to server
- [ ] 2.8.4 CI writes metrics artifact for dashboard consumption
- [ ] 2.8.5 Cleanup: screenshot in README, verify auto-refresh

**Ref:** Stream 6 — P-04

### 2.9 Scanner Core [L] `task/2.9-scanner-core`

> Depends on: nothing

- [ ] 2.9.1 Write tests for scanner state management (TDD)
- [ ] 2.9.2 Implement `admiral/monitor/state.sh` (atomic updates, schema validation)
- [ ] 2.9.3 Implement scanner for all 5 scan types
- [ ] 2.9.4 Implement findings classification (HIGH/MEDIUM/LOW)
- [ ] 2.9.5 HIGH findings auto-create GitHub issues
- [ ] 2.9.6 Cleanup: verify all scan types execute, state persists

**Ref:** Stream 27 — MON-01, MON-04

### 2.10 Scanner Reporting + Integration [M] `task/2.10-scanner-reporting`

> Depends on: 2.9

- [ ] 2.10.1 Implement daily digest generation
- [ ] 2.10.2 Implement scan result history (append-only JSONL, 90d retention)
- [ ] 2.10.3 Implement weekly trend reports with text visualizations
- [ ] 2.10.4 Implement custom scan rules framework
- [ ] 2.10.5 Add scanner CI integration (per-PR checks)
- [ ] 2.10.6 Cleanup: verify daily/weekly automation, CI < 60s

**Ref:** Stream 27 — MON-02, MON-03, MON-05, MON-06, MON-07

---

## Phase 3 — Fleet: Hooks, Definitions, Routing [Placeholder]

**Goal:** Implement hook infrastructure, agent definitions, and fleet routing.
**Done when:** Fleet standup works, agents are defined, routing dispatches correctly.

> Streams: 7 (Hooks & Fleet), 14 (Fleet Agent Definitions), 15 (Fleet Routing & Orchestration)
>
> Detail tasks to be expanded when Phase 2 is ≥50% complete.

### 3.1 Hook Lifecycle Infrastructure [XL] `task/3.1-hook-lifecycle`
### 3.2 Fleet Agent Definitions [L] `task/3.2-agent-definitions`
### 3.3 Fleet Routing + Orchestration [XL] `task/3.3-fleet-routing`
### 3.4 Changelog Automation [M] `task/3.4-changelog-automation`

**Ref:** Streams 7, 14, 15 | Stream 26 — DX-11

---

## Phase 4 — Brain: Architecture + Data Ecosystem [Placeholder]

**Goal:** Implement Brain storage, advancement criteria, and data ecosystem.
**Done when:** B1 file-based Brain works, entries are queryable, advancement path is clear.

> Streams: 11 (Brain System), 20 (Data Ecosystem)
>
> Detail tasks to be expanded when Phase 3 is ≥50% complete.

### 4.1 Brain B1 File-Based Storage [L] `task/4.1-brain-b1`
### 4.2 Brain Entry Types + Schema [M] `task/4.2-brain-entries`
### 4.3 Brain Query Interface [M] `task/4.3-brain-query`
### 4.4 Data Ecosystem Foundation [L] `task/4.4-data-ecosystem`

**Ref:** Streams 11, 20

---

## Phase 5 — Governance: Execution Quality + Progressive Autonomy [Placeholder]

**Goal:** Implement execution quality ops, progressive autonomy tiers, and governance platform.
**Done when:** Quality gates enforce standards, autonomy tiers work, governance dashboard exists.

> Streams: 8 (Execution Quality Ops), 18 (Progressive Autonomy), 23 (Governance Platform)
>
> Detail tasks to be expanded when Phase 4 is ≥50% complete.

### 5.1 Execution Quality Gates [L] `task/5.1-quality-gates`
### 5.2 Progressive Autonomy Tiers [L] `task/5.2-autonomy-tiers`
### 5.3 Governance Dashboard [XL] `task/5.3-governance-dashboard`

**Ref:** Streams 8, 18, 23

---

## Phase 6 — Platform: MCP, Adapters, Security [Placeholder]

**Goal:** MCP integration, platform adapters, and security hardening.
**Done when:** MCP servers work, at least 2 platform adapters exist, security audit passes.

> Streams: 16 (MCP Integration), 17 (Platform Adapters), 24 (Security Hardening)
>
> Detail tasks to be expanded when Phase 5 is ≥50% complete.

### 6.1 MCP Server Integration [L] `task/6.1-mcp-servers`
### 6.2 Platform Adapters [XL] `task/6.2-platform-adapters`
### 6.3 Security Hardening [L] `task/6.3-security-hardening`

**Ref:** Streams 16, 17, 24

---

## Phase 7 — Advanced: Observability, Context Engineering, QA [Placeholder]

**Goal:** Observability infrastructure, context engineering, and QA system.
**Done when:** Observability pipeline works, context is optimized, QA system validates quality.

> Streams: 25 (Observability), 30 (Context Engineering), 31 (Quality Assurance System)
>
> Detail tasks to be expanded when Phase 6 is ≥50% complete.

### 7.1 Observability Pipeline [L] `task/7.1-observability`
### 7.2 Context Engineering [L] `task/7.2-context-engineering`
### 7.3 QA System [L] `task/7.3-qa-system`

**Ref:** Streams 25, 30, 31

---

## Phase 8 — Strategic: Positioning, Validation, Meta-Governance [Placeholder]

**Goal:** Strategic positioning, thesis validation, rating system, and meta-governance.
**Done when:** Strategic metrics tracked, thesis validated, rating system operational.

> Streams: 9 (Platform Security Governance), 10 (Protocols & Ecosystem), 12 (Strategic Positioning),
> 13 (Exemplary Codebase), 19 (Meta-Governance), 22 (Intent Engineering),
> 28 (Inevitable Features), 29 (Standing Orders Implementation),
> 32 (Rating System), 33 (Thesis Validation)
>
> Detail tasks to be expanded when Phase 7 is ≥50% complete.

### 8.1 Meta-Governance System [L] `task/8.1-meta-governance`
### 8.2 Rating System [L] `task/8.2-rating-system`
### 8.3 Thesis Validation [M] `task/8.3-thesis-validation`
### 8.4 Strategic Positioning [M] `task/8.4-strategic-positioning`
### 8.5 Remaining Streams [XL] `task/8.5-remaining-streams`

**Ref:** Streams 9, 10, 12, 13, 19, 22, 28, 29, 32, 33

---

## Cross-Cutting Concerns

### Dependency Graph (Critical Path)

```
Phase 0: 0.1 ──→ 0.2 ──→ 0.3
           ├──→ 0.4
           ├──→ 0.5
           ├──→ 0.6 ──→ 0.7
           0.8 ──→ 0.9
           0.10 ──→ 0.11

Phase 1: 1.1 ──→ 1.2
          1.3 ──→ 1.4 ──→ 1.8 ──→ 1.9
          1.1 ──→ 1.5
          1.6 (parallel)
          1.7 ──→ 1.9

Phase 2: 2.1 ──→ 2.2, 2.3, 2.5
          2.4 ──→ 2.5
          2.1 + 2.6 ──→ 2.7 ──→ 2.8
          2.9 ──→ 2.10
```

### Phase Gate Criteria

| Phase | Gate |
|-------|------|
| 0 → 1 | Ground Truth templates validated, readiness tool runs, spec debt inventory complete |
| 1 → 2 | ≥80% test coverage, all hooks use shared libs, `make setup` works |
| 2 → 3 | Events flow bidirectionally, CI gates green, scanner runs daily |
| 3 → 4 | Fleet standup works, agents defined, routing dispatches |
| 4 → 5 | Brain B1 operational, entries queryable |
| 5 → 6 | Quality gates enforce, autonomy tiers work |
| 6 → 7 | MCP works, ≥2 adapters, security audit passes |
| 7 → 8 | Observability pipeline works, context optimized |
