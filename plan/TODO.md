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


## Phase 3 — Fleet: Hooks, Definitions, Routing

**Goal:** Implement hook infrastructure for fleet enforcement, define all agent roles as machine-readable configurations, and build the routing and orchestration runtime.
**Done when:** Fleet standup works, all 71+ agents are defined and validated, routing dispatches correctly, handoffs are contract-validated, and changelog automation is operational.

### 3.1 Standing Orders Enforcement Map [M] `task/3.1-so-enforcement-map`

> Depends on: 1.4 (hook error handling)

- [ ] 3.1.1 Write tests for enforcement map validation — all 16 SOs mapped (TDD)
- [ ] 3.1.2 Create enforcement map with complete SO-to-hook mapping
- [ ] 3.1.3 Classify each SO: hook-enforced, instruction-embedded, or advisory-only
- [ ] 3.1.4 Identify and document enforcement gaps with remediation plan
- [ ] 3.1.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 7 — S-05

### 3.2 Identity and Tier Validation Hooks [L] `task/3.2-identity-tier-hooks`

> Depends on: 3.1, 3.4

- [ ] 3.2.1 Write tests for identity validation — valid/invalid/missing identity fields (TDD)
- [ ] 3.2.2 Implement `.hooks/identity_validation.sh` — validate agent ID, role, tier against registry
- [ ] 3.2.3 Write tests for tier validation — valid tier, too-low tier, missing assignment (TDD)
- [ ] 3.2.4 Implement `.hooks/tier_validation.sh` — validate model tier against agent role requirements
- [ ] 3.2.5 Register both hooks in manifest, verify <2s execution each
- [ ] 3.2.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 7 — S-01, S-02

### 3.3 Governance Heartbeat Monitor [M] `task/3.3-governance-heartbeat`

> Depends on: 1.4 (hook error handling)

- [ ] 3.3.1 Write tests for heartbeat check — configurable interval, threshold alerting (TDD)
- [ ] 3.3.2 Implement `.hooks/governance_heartbeat_monitor.sh`
- [ ] 3.3.3 Log heartbeat history to state, integrate with alerting pipeline
- [ ] 3.3.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 7 — S-03

### 3.4 Agent Registry [L] `task/3.4-agent-registry`

> Depends on: 1.3 (jq helpers), 1.4 (hook error handling)

- [ ] 3.4.1 Write tests for registry — load, validate, lookup by ID/capability/tier (TDD)
- [ ] 3.4.2 Implement `admiral/fleet/registry.sh` — load from config, validate against spec constraints
- [ ] 3.4.3 Provide lookup API returning structured JSON (by ID, by capability, by tier)
- [ ] 3.4.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 7 — S-06

### 3.5 Protocol Registry Guard [L] `task/3.5-protocol-registry-guard`

> Depends on: 3.4

- [ ] 3.5.1 Write tests for protocol change governance — approval workflow, versioning (TDD)
- [ ] 3.5.2 Write tests for MCP server registration enforcement (TDD)
- [ ] 3.5.3 Implement `.hooks/protocol_registry_guard.sh` — validate protocol modifications against SO-16
- [ ] 3.5.4 Create `admiral/config/approved_mcp_servers.json`
- [ ] 3.5.5 Block calls to unregistered MCP servers at PreToolUse
- [ ] 3.5.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 7 — S-04

### 3.6 Tool Permission Matrix [M] `task/3.6-tool-permissions`

> Depends on: 3.4

- [ ] 3.6.1 Write tests for tool permission enforcement — allowed, denied, missing (TDD)
- [ ] 3.6.2 Create `admiral/fleet/permissions.json` — per-agent tool permission matrix
- [ ] 3.6.3 Integrate tool validation into `.hooks/pre_tool_use_adapter.sh`
- [ ] 3.6.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 7 — S-08

### 3.7 Fleet Configuration Validator [M] `task/3.7-fleet-config-validator`

> Depends on: 3.4, 3.6

- [ ] 3.7.1 Write tests for fleet config validation — agent count, tool list overlap, routing conflicts (TDD)
- [ ] 3.7.2 Implement `admiral/fleet/validate_config.sh` — enforce 1-12 agents, disjoint tool lists
- [ ] 3.7.3 Run as pre-flight check before fleet deployment
- [ ] 3.7.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 7 — S-09

### 3.8 Agent Definition Schema and Validator [L] `task/3.8-agent-definition-schema`

> Depends on: nothing (foundational for all agent definitions)

- [ ] 3.8.1 Write tests for schema validation — required fields, tool list disjointness, tier validity (TDD)
- [ ] 3.8.2 Create `fleet/agents/schema/agent-definition.schema.json`
- [ ] 3.8.3 Implement `fleet/agents/schema/validate.sh`
- [ ] 3.8.4 Add CI workflow `.github/workflows/fleet-validation.yml`
- [ ] 3.8.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 14 — F-12a, F-12b

### 3.9 Agent Template Generator [S] `task/3.9-agent-template-gen`

> Depends on: 3.8

- [ ] 3.9.1 Write tests for template generation — name, category, output validation (TDD)
- [ ] 3.9.2 Implement `fleet/agents/schema/generate-agent.sh`
- [ ] 3.9.3 Document generator in CONTRIBUTING.md
- [ ] 3.9.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 14 — F-14

### 3.10 Command Layer Agent Definitions [L] `task/3.10-command-agents`

> Depends on: 3.8

- [ ] 3.10.1 Create Orchestrator definition (Tier 1)
- [ ] 3.10.2 Create Triage Agent definition (Tier 3)
- [ ] 3.10.3 Create Mediator definition (Tier 1)
- [ ] 3.10.4 Create Context Curator definition (Tier 2)
- [ ] 3.10.5 Validate all definitions pass schema validation
- [ ] 3.10.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 14 — F-01a, F-01b, F-01c, F-01d

### 3.11 Engineering Agent Definitions [XL] `task/3.11-engineering-agents`

> Depends on: 3.8

- [ ] 3.11.1 Create backend engineering agents (6: Backend Implementer, API Designer, Database, Integration, Queue & Messaging, Cache Strategist)
- [ ] 3.11.2 Create frontend engineering agents (6: Frontend Implementer, Interaction Designer, Accessibility Auditor, Responsive Layout, State Management, Design Systems)
- [ ] 3.11.3 Create cross-cutting engineering agents (4: Refactoring, Dependency Manager, Technical Writer, Diagram)
- [ ] 3.11.4 Create infrastructure agents (4: DevOps, Infrastructure, Containerization, Observability)
- [ ] 3.11.5 Validate all definitions pass schema validation
- [ ] 3.11.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 14 — F-02a, F-02b, F-02c, F-02d

### 3.12 Quality + Governance Agent Definitions [L] `task/3.12-quality-governance-agents`

> Depends on: 3.8

- [ ] 3.12.1 Create quality agents (6: QA Agent, Unit Test Writer, E2E Test Writer, Performance Tester, Chaos Agent, Regression Guardian) — enforce QA conflict-of-interest constraint
- [ ] 3.12.2 Create governance agents (7: Token Budgeter, Drift Monitor, Hallucination Auditor, Bias Sentinel, Loop Breaker, Context Health Monitor, Contradiction Detector)
- [ ] 3.12.3 Validate all definitions — verify handoff contracts match interface-contracts.md
- [ ] 3.12.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 14 — F-03, F-04

### 3.13 Lifecycle + Security Agent Definitions [M] `task/3.13-lifecycle-security-agents`

> Depends on: 3.8

- [ ] 3.13.1 Create lifecycle agents (4: Release Orchestrator, Incident Response [Tier 1], Feature Flag Strategist, Migration)
- [ ] 3.13.2 Create security agents (4: Security Auditor [Blocked degradation], Penetration Tester, Compliance, Privacy)
- [ ] 3.13.3 Validate all definitions — verify Security Auditor has Blocked degradation policy
- [ ] 3.13.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 14 — F-05, F-06

### 3.14 Scale + Meta Agent Definitions [L] `task/3.14-scale-meta-agents`

> Depends on: 3.8

- [ ] 3.14.1 Create scale agents (12 in `fleet/agents/definitions/scale/`)
- [ ] 3.14.2 Create meta agents (9: Pattern Enforcer, Dependency Sentinel, SEO Crawler, Role Crystallizer, Devil's Advocate, Red Team, Simulated User, Persona Agent, UX Researcher)
- [ ] 3.14.3 Validate all definitions — verify adversarial agents have constructive-challenge rules
- [ ] 3.14.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 14 — F-07, F-08

### 3.15 Extended + Ecosystem Agent Definitions [L] `task/3.15-extended-ecosystem-agents`

> Depends on: 3.8

- [ ] 3.15.1 Create data agents in extras/ (5: Data Engineer, Analytics Implementer, ML Engineer, Data Validator, Visualization)
- [ ] 3.15.2 Create domain agents in extras/ (9: Auth & Identity, Payment & Billing, Search & Relevance, Real-time Systems, Media Processing, Notification Orchestrator, Internationalization, SDK & Dev Experience, Monorepo Coordinator)
- [ ] 3.15.3 Create remaining ecosystem agents (Copywriter, Contract Test Writer, etc.)
- [ ] 3.15.4 Generate coverage report — verify 100% of 71 core + 34 extended agents defined
- [ ] 3.15.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 14 — F-09, F-10, F-11

### 3.16 Agent Capability Registry [M] `task/3.16-capability-registry`

> Depends on: 3.8, 3.10–3.15

- [ ] 3.16.1 Write tests for registry generation — completeness, queryability (TDD)
- [ ] 3.16.2 Implement `fleet/agents/registry/generate-registry.sh` — consolidated JSON from all agent definitions
- [ ] 3.16.3 Verify registry includes all 71+ agents with capabilities, tier, tool permissions, file ownership
- [ ] 3.16.4 Auto-regenerate on agent definition changes
- [ ] 3.16.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 14 — F-13

### 3.17 Task-Type Routing Engine [L] `task/3.17-task-type-routing`

> Depends on: 3.4, 3.16

- [ ] 3.17.1 Write tests for all 86 routing rules plus constraint enforcement (TDD)
- [ ] 3.17.2 Parse `fleet/routing-rules.md` into `fleet/routing/rules.json`
- [ ] 3.17.3 Implement `fleet/routing/engine.ts` — resolve primary agent, fallback, and escalation
- [ ] 3.17.4 Enforce routing constraints: no self-review, no Does-NOT-Do violations
- [ ] 3.17.5 Cleanup: lint, docs

**Ref:** Stream 7 — S-07 | Stream 15 — O-01a

### 3.18 File-Ownership Routing + Conflict Resolution [L] `task/3.18-file-ownership-routing`

> Depends on: 3.17

- [ ] 3.18.1 Write tests for file-ownership routing — single-owner, multi-owner, unowned (TDD)
- [ ] 3.18.2 Implement `fleet/routing/file-ownership.ts` — configurable ownership patterns, decomposition signals
- [ ] 3.18.3 Create `fleet/routing/ownership-config.schema.json`
- [ ] 3.18.4 Write tests for conflict resolution — 2-agent overlap, 3-agent overlap (TDD)
- [ ] 3.18.5 Implement `fleet/routing/conflict-resolution.ts` — decompose, primary/reviewer, or escalate
- [ ] 3.18.6 Cleanup: lint, docs

**Ref:** Stream 15 — O-01b, O-08

### 3.19 Capability-Matching Routing [M] `task/3.19-capability-matching`

> Depends on: 3.16, 3.17, 3.18

- [ ] 3.19.1 Write tests for capability matching — ranked candidates, confidence scores, escalation (TDD)
- [ ] 3.19.2 Implement `fleet/routing/capability-match.ts`
- [ ] 3.19.3 Write integration tests for full fallback chain: task-type → file-ownership → capability-match → escalation
- [ ] 3.19.4 Cleanup: lint, docs

**Ref:** Stream 15 — O-01c

### 3.20 Model Tier Degradation Engine [L] `task/3.20-degradation-engine`

> Depends on: 3.2

- [ ] 3.20.1 Write tests for retry, fallback, and blocking degradation paths (TDD)
- [ ] 3.20.2 Implement `fleet/routing/degradation.ts` — exponential backoff (1s-30s, 4 retries), per-agent policies
- [ ] 3.20.3 Enforce no cascading degradation (Tier 1 → Tier 2 cannot further degrade to Tier 3)
- [ ] 3.20.4 Implement recovery protocol — switch to primary on next task after API recovery
- [ ] 3.20.5 Write tests for tier promotion/demotion tracking (TDD)
- [ ] 3.20.6 Implement `fleet/routing/tier-tracking.ts`
- [ ] 3.20.7 Cleanup: lint, docs

**Ref:** Stream 15 — O-02b, O-02c

### 3.21 Context Injection Pipeline [L] `task/3.21-context-injection`

> Depends on: 3.8, 3.10

- [ ] 3.21.1 Write tests for three-layer context assembly — Identity → Authority → Constraints → Knowledge → Task (TDD)
- [ ] 3.21.2 Implement `fleet/context/assembler.ts` — Layer 1 (Fleet), Layer 2 (Project), Layer 3 (Task) with budget enforcement
- [ ] 3.21.3 Implement context sufficiency check
- [ ] 3.21.4 Write tests for category-specific checklists (TDD)
- [ ] 3.21.5 Implement `fleet/context/checklists.ts` — validate required context per agent category at session start
- [ ] 3.21.6 Write tests for progressive disclosure via skills (TDD)
- [ ] 3.21.7 Implement `fleet/context/skills.ts` — load skill files on matching patterns
- [ ] 3.21.8 Cleanup: lint, docs

**Ref:** Stream 15 — O-03a, O-03b, O-03c

### 3.22 Handoff Protocol and Contract Validation [XL] `task/3.22-handoff-protocol`

> Depends on: 3.17, 3.21

- [ ] 3.22.1 Write tests for handoff contract validation — all contract types from interface-contracts.md (TDD)
- [ ] 3.22.2 Generate `fleet/handoff/contracts.json` from `fleet/interface-contracts.md`
- [ ] 3.22.3 Implement `fleet/handoff/validator.ts` — validate payloads, reject on violation
- [ ] 3.22.4 Create `fleet/handoff/v1.schema.json`
- [ ] 3.22.5 Write tests for handoff protocol — serialize, validate, round-trip (TDD)
- [ ] 3.22.6 Implement `fleet/handoff/protocol.ts` — context transfer, state serialization, routing
- [ ] 3.22.7 Cleanup: lint, docs

**Ref:** Stream 15 — O-04, O-05a

### 3.23 Multi-Agent Pipeline Orchestration [L] `task/3.23-pipeline-orchestration`

> Depends on: 3.22

- [ ] 3.23.1 Write tests for sequential pipeline — step execution, validated handoffs (TDD)
- [ ] 3.23.2 Implement `fleet/orchestration/pipeline.ts` — track progress, handle step failures (retry/skip/abort)
- [ ] 3.23.3 Write integration test for 3+ step pipeline end-to-end
- [ ] 3.23.4 Cleanup: lint, docs

**Ref:** Stream 15 — O-05b

### 3.24 Task Decomposition Engine [L] `task/3.24-task-decomposition`

> Depends on: 3.17, 3.18

- [ ] 3.24.1 Write tests for decomposition — single-agent subtasks, artificial split detection (TDD)
- [ ] 3.24.2 Implement `fleet/orchestration/decomposition.ts`
- [ ] 3.24.3 Each subtask: agent assignment, acceptance criteria, context file list, budget allocation
- [ ] 3.24.4 Detect and escalate artificial decompositions
- [ ] 3.24.5 Cleanup: lint, docs

**Ref:** Stream 15 — O-07

### 3.25 Fleet Health Monitoring [L] `task/3.25-fleet-health`

> Depends on: 3.4, 3.17

- [ ] 3.25.1 Write tests for metrics collection — utilization, throughput, error rate, budget burn (TDD)
- [ ] 3.25.2 Implement `fleet/monitoring/health.ts` — per-agent and fleet-wide aggregation
- [ ] 3.25.3 Write tests for alert system — CRITICAL/HIGH/MEDIUM/LOW classification (TDD)
- [ ] 3.25.4 Implement `fleet/monitoring/alerts.ts` — threshold alerts, deduplication, severity gating
- [ ] 3.25.5 Expose dashboard data via API
- [ ] 3.25.6 Cleanup: lint, docs

**Ref:** Stream 15 — O-06

### 3.26 Fleet Scaling Policies [M] `task/3.26-fleet-scaling`

> Depends on: 3.25

- [ ] 3.26.1 Write tests for scaling triggers — queue depth, utilization, wait time SLA (TDD)
- [ ] 3.26.2 Implement `fleet/orchestration/scaling.ts` — scaling recommendations, fleet size limits (warn at 12)
- [ ] 3.26.3 Create `fleet/orchestration/scaling-config.schema.json`
- [ ] 3.26.4 Implement cooldown periods to prevent oscillation
- [ ] 3.26.5 Cleanup: lint, docs

**Ref:** Stream 15 — O-09

### 3.27 Agent Warm-Up and Cool-Down [M] `task/3.27-agent-lifecycle`

> Depends on: 3.21

- [ ] 3.27.1 Write tests for warm-up — context pre-load before assignment (TDD)
- [ ] 3.27.2 Write tests for cool-down — context release after idle, re-activation (TDD)
- [ ] 3.27.3 Implement `fleet/orchestration/lifecycle.ts`
- [ ] 3.27.4 Log warm-up/cool-down events, track latency savings
- [ ] 3.27.5 Cleanup: lint, docs

**Ref:** Stream 15 — O-10

### 3.28 Changelog Automation [M] `task/3.28-changelog-automation`

> Depends on: nothing

- [ ] 3.28.1 Write tests for conventional commit parsing — feat, fix, docs, BREAKING CHANGE (TDD)
- [ ] 3.28.2 Implement `admiral/scripts/generate_changelog.sh`
- [ ] 3.28.3 Add `make changelog` target
- [ ] 3.28.4 Include commit hash links and scope information
- [ ] 3.28.5 Integrate into release workflow for tagged versions
- [ ] 3.28.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 26 — DX-11

---

## Phase 4 — Brain: Architecture + Data Ecosystem

**Goal:** Implement Brain storage tiers (B1 through B3), graduation metrics, knowledge graph, maintenance agents, and feedback loops.
**Done when:** B1 file-based Brain is complete with auto-recording and querying, B2 SQLite is operational with FTS, graduation metrics measure readiness, knowledge graph links entries, and data ecosystem agents maintain quality.

### 4.1 Brain B1 Auto-Recording + Retrieval [L] `task/4.1-brain-b1-auto`

> Depends on: nothing (foundational)

- [ ] 4.1.1 Write tests for brain_writer.sh and hook-emitted entries (TDD)
- [ ] 4.1.2 Create `admiral/lib/brain_writer.sh` shared library for hook-to-Brain writes
- [ ] 4.1.3 Wire brain_writer into `prohibitions_enforcer.sh`, `loop_detector.sh`, `scope_boundary_guard.sh`
- [ ] 4.1.4 Enhance `brain_context_router.sh` to query Brain and inject matching entries
- [ ] 4.1.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-01, B-02

### 4.2 Brain B1 Demand Signals + Contradiction Detection [M] `task/4.2-brain-demand-contradict`

> Depends on: 4.1

- [ ] 4.2.1 Write tests for demand signal recording and contradiction scanning (TDD)
- [ ] 4.2.2 Implement demand signal tracking — log zero-result queries to `.brain/_demand/`
- [ ] 4.2.3 Expose demand signals via `brain_audit --demand`
- [ ] 4.2.4 Implement contradiction scan on write — keyword overlap detection, non-blocking warning
- [ ] 4.2.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-03, B-04

### 4.3 Brain B1 Consolidation + Comprehensive Tests [M] `task/4.3-brain-consolidate-tests`

> Depends on: 4.2

- [ ] 4.3.1 Write tests for brain_consolidate and full B1 test suite (TDD)
- [ ] 4.3.2 Create `admiral/bin/brain_consolidate` — merge overlapping entries, archive originals
- [ ] 4.3.3 Create `admiral/tests/test_brain_b1.sh` — 20+ tests covering all utilities and edge cases
- [ ] 4.3.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-05, B-06

### 4.4 Brain B1 Excellence [L] `task/4.4-brain-b1-excellence`

> Depends on: 4.3

- [ ] 4.4.1 Write tests for versioning, expiration, templates, and provenance (TDD)
- [ ] 4.4.2 Implement `admiral/brain/versioning.sh` — supersession chain, rollback support
- [ ] 4.4.3 Implement `admiral/brain/expiration.sh` — TTL-based expiration, auto-archive
- [ ] 4.4.4 Implement `admiral/brain/templates/` — 5+ pre-defined entry templates, `--template` flag
- [ ] 4.4.5 Implement `admiral/brain/provenance.sh` — provenance-aware writes (source_agent, source_type, confidence)
- [ ] 4.4.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-22, B-23, B-28, B-29

### 4.5 Brain Graduation Metrics [L] `task/4.5-brain-graduation`

> Depends on: 4.3

- [ ] 4.5.1 Write tests for graduation criteria measurement (TDD)
- [ ] 4.5.2 Create `admiral/brain/graduation-metrics.sh` — hit rate, precision, entry count, reuse rate
- [ ] 4.5.3 Collect metrics per-session, aggregate over rolling 7-day window
- [ ] 4.5.4 Add `/dashboard/graduation` route to control plane
- [ ] 4.5.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-21

### 4.6 Brain B2 Schema + Migration [M] `task/4.6-brain-b2-schema`

> Depends on: 4.3, 4.5

- [ ] 4.6.1 Write tests for SQLite schema creation and B1-to-B2 migration (TDD)
- [ ] 4.6.2 Create `admiral/brain/b2/schema.sql` — entries, links, embeddings, demand_signals tables
- [ ] 4.6.3 Create `admiral/brain/b2/migrate.sh` — migration version tracking
- [ ] 4.6.4 Create `admiral/brain/b2/migrate_from_b1.sh` — idempotent import of `.brain/` JSON into SQLite
- [ ] 4.6.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-07, B-08

### 4.7 Brain B2 Query + Search [L] `task/4.7-brain-b2-query`

> Depends on: 4.6

- [ ] 4.7.1 Write tests for FTS5 query and backward-compatible CLI interface (TDD)
- [ ] 4.7.2 Create `admiral/brain/b2/query.sh` — SQL queries with FTS5, date range, category/project filters
- [ ] 4.7.3 Update `admiral/bin/brain_query` to dispatch to B2 when SQLite DB exists
- [ ] 4.7.4 Implement embedding generation pipeline (`admiral/brain/b2/embed.sh`)
- [ ] 4.7.5 Implement similarity search (`admiral/brain/b2/search.sh`) — cosine distance, `--semantic` flag
- [ ] 4.7.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-09, B-10, B-11

### 4.8 Brain B2 Migration Testing + Analytics [M] `task/4.8-brain-b2-extras`

> Depends on: 4.7

- [ ] 4.8.1 Write tests for migration integrity and analytics (TDD)
- [ ] 4.8.2 Create `admiral/tests/test_brain_migration.sh` — B1-to-B2 coverage, metadata preservation
- [ ] 4.8.3 Create `admiral/brain/analytics.sh` — per-entry usage tracking, gap detection, ROI
- [ ] 4.8.4 Create `admiral/brain/backup.sh` — automated backup with integrity verification
- [ ] 4.8.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-25, B-26, B-27

### 4.9 Brain B3 MCP Server + Storage [XL] `task/4.9-brain-b3-server`

> Depends on: 4.7

- [ ] 4.9.1 Write tests for MCP server scaffold and tool registration (TDD)
- [ ] 4.9.2 Create `admiral/brain/b3/mcp-server/` — 8 tool endpoints (brain_record, brain_query, brain_retrieve, brain_strengthen, brain_supersede, brain_status, brain_audit, brain_purge)
- [ ] 4.9.3 Implement Postgres + pgvector schema with migration tracking and rollback
- [ ] 4.9.4 Implement identity token lifecycle — create, rotate, revoke, TTL
- [ ] 4.9.5 Implement access control — per-agent, per-entry, 3 clearance levels
- [ ] 4.9.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-12, B-13, B-14, B-15

### 4.10 Brain B3 Retrieval + Graph [L] `task/4.10-brain-b3-retrieval`

> Depends on: 4.9

- [ ] 4.10.1 Write tests for multi-signal retrieval and graph traversal (TDD)
- [ ] 4.10.2 Implement multi-signal retrieval pipeline — keyword, semantic, temporal, link-based fusion
- [ ] 4.10.3 Implement multi-hop link traversal — cycle detection, link-type filtering, explainable paths
- [ ] 4.10.4 Implement quarantine integration — 5-layer vetting for external content
- [ ] 4.10.5 Implement sensitivity classification — 4 levels, query filtering, bulk reclassification
- [ ] 4.10.6 Implement audit logging — append-only, queryable by time/agent/operation
- [ ] 4.10.7 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-16, B-17, B-18, B-19, B-20

### 4.11 Brain B3 Cross-Project Sharing [L] `task/4.11-brain-sharing`

> Depends on: 4.10

- [ ] 4.11.1 Write tests for cross-project sharing and permissions (TDD)
- [ ] 4.11.2 Implement `admiral/brain/sharing.sh` — share entries across projects with permissions and provenance
- [ ] 4.11.3 Cleanup: lint, shellcheck, docs

**Ref:** Stream 11 — B-24

### 4.12 Knowledge Graph [L] `task/4.12-knowledge-graph`

> Depends on: 4.7

- [ ] 4.12.1 Write tests for all six link types, bidirectional traversal, and multi-hop queries (TDD)
- [ ] 4.12.2 Create `admiral/brain/schema/entry_links.sql` — link schema with confidence scores
- [ ] 4.12.3 Create `admiral/brain/links.sh` — create links, traverse, multi-hop (3+) queries
- [ ] 4.12.4 Integrate link queries with existing `brain_query` interface
- [ ] 4.12.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 20 — DE-01

### 4.13 Knowledge Maintenance Agents [L] `task/4.13-knowledge-agents`

> Depends on: 4.12

- [ ] 4.13.1 Write tests for gardener, curator, and harvester agents (TDD)
- [ ] 4.13.2 Create `admiral/brain/gardener.sh` — staleness, contradiction, duplicate, orphan detection; Propose-tier only
- [ ] 4.13.3 Create `admiral/brain/curator.sh` — metadata enrichment, format standardization, quality scoring (0-1)
- [ ] 4.13.4 Create `admiral/brain/harvester.sh` — extract knowledge from diffs, PR descriptions, commit messages
- [ ] 4.13.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 20 — DE-02, DE-03, DE-04

### 4.14 Knowledge Feedback Loops [M] `task/4.14-feedback-loops`

> Depends on: 4.12

- [ ] 4.14.1 Write tests for review and test feedback loops (TDD)
- [ ] 4.14.2 Create `admiral/brain/feedback/review_loop.sh` — strengthen on acceptance, weaken on rejection
- [ ] 4.14.3 Create `admiral/brain/feedback/test_loop.sh` — strengthen on pass, weaken on fail, propose from lessons
- [ ] 4.14.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 20 — DE-05, DE-06

### 4.15 Knowledge Quality + Session Transfer [M] `task/4.15-knowledge-quality`

> Depends on: 4.12

- [ ] 4.15.1 Write tests for quality metrics, session transfer, and export/import (TDD)
- [ ] 4.15.2 Create `admiral/brain/metrics.sh` — 6 metrics (freshness, accuracy, usage, contradiction rate, coverage, link density)
- [ ] 4.15.3 Create `admiral/brain/session_transfer.sh` — session-end capture, session-start loading
- [ ] 4.15.4 Create `admiral/brain/export.sh` and `admiral/brain/import.sh` — filtered JSON, PII stripping
- [ ] 4.15.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 20 — DE-07, DE-08, DE-09

### 4.16 Knowledge Search API [L] `task/4.16-knowledge-api`

> Depends on: 4.15

- [ ] 4.16.1 Write tests for all five API endpoints (TDD)
- [ ] 4.16.2 Implement `control-plane/src/brain-api.ts` — `GET /api/brain/search`, `/entry/:id`, `/entry/:id/links`, `/health`, `/stats`
- [ ] 4.16.3 Add authentication and rate limiting
- [ ] 4.16.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 20 — DE-10

---

## Phase 5 — Governance: Execution Quality + Progressive Autonomy + Governance Platform

**Goal:** Implement execution patterns, quality gates, operations infrastructure, cost management, fleet lifecycle, progressive autonomy tiers, and governance platform API.
**Done when:** Handoff/escalation/parallel patterns work, quality gates enforce standards, cost budgets enforce limits, autonomy tiers promote/demote based on outcomes, governance API serves policies and events.

### 5.1 Handoff + Escalation Protocols [L] `task/5.1-handoff-escalation`

> Depends on: Phase 4 Brain (4.3+)

- [ ] 5.1.1 Write tests for handoff schema validation and escalation pipeline steps (TDD)
- [ ] 5.1.2 Create `admiral/handoff/schema.json` and `admiral/handoff/validate.sh`
- [ ] 5.1.3 Create `admiral/escalation/pipeline.sh` — 5-step process (intake, evaluation, resolution, Admiral decision, execution)
- [ ] 5.1.4 Create `admiral/escalation/intake.sh` and `admiral/escalation/resolve.sh`
- [ ] 5.1.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 8 — S-10, S-11

### 5.2 Parallel Coordinator + Quality Gates [L] `task/5.2-parallel-quality`

> Depends on: 5.1

- [ ] 5.2.1 Write tests for parallel coordination and quality gate enforcement (TDD)
- [ ] 5.2.2 Create `control-plane/src/parallel-coordinator.ts` — task graph with dependency edges, concurrent scheduling
- [ ] 5.2.3 Create `admiral/quality/gates.sh` — pre-merge gates for coverage, lint, review checklist
- [ ] 5.2.4 Create `admiral/quality/review_checklist.sh` and update PR template
- [ ] 5.2.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 8 — S-12, S-13, S-14

### 5.3 Alerting Pipeline + Persistent Events [L] `task/5.3-alerting-events`

> Depends on: nothing

- [ ] 5.3.1 Write tests for alerting delivery, retry, and persistent event store (TDD)
- [ ] 5.3.2 Create `control-plane/src/alerting.ts` — push alerts to configurable endpoints, retry with backoff
- [ ] 5.3.3 Create `control-plane/src/persistent-store.ts` — JSONL storage, file rotation, cross-restart persistence
- [ ] 5.3.4 Enhance `/api/health` with hook stats, state file age, ingestion lag, alert rate
- [ ] 5.3.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 8 — S-15, S-16, S-17

### 5.4 Cost Attribution + Budget Enforcement [L] `task/5.4-cost-management`

> Depends on: 5.3

- [ ] 5.4.1 Write tests for cost attribution, budget enforcement, and circuit breaker (TDD)
- [ ] 5.4.2 Create `admiral/cost/attribution.sh` and `control-plane/src/cost-tracker.ts` — per-agent token tracking
- [ ] 5.4.3 Create `admiral/cost/budget.sh` and `admiral/cost/circuit-breaker.sh` — pause and escalate on breach
- [ ] 5.4.4 Create `admiral/cost/service-broker.sh` and `admiral/cost/credential-vault.sh` — session-scoped credentials
- [ ] 5.4.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 8 — S-18a, S-18b, S-18c

### 5.5 Fleet Lifecycle State Machine [L] `task/5.5-fleet-lifecycle`

> Depends on: nothing

- [ ] 5.5.1 Write tests for lifecycle phase transitions and preparation workflows (TDD)
- [ ] 5.5.2 Create `admiral/lifecycle/state-machine.sh` — 6 phases (Preparation through Dormant), entry/exit criteria
- [ ] 5.5.3 Create `admiral/lifecycle/preparation.sh` — 4 project-type workflows (greenfield, existing-documented, existing-undocumented, legacy)
- [ ] 5.5.4 Create `admiral/lifecycle/retirement.sh` — complete in-flight work, update routing, archive Brain entries
- [ ] 5.5.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 8 — S-19a, S-19b, S-19c

### 5.6 Adaptation + Institutional Memory [M] `task/5.6-adaptation-memory`

> Depends on: 5.5

- [ ] 5.6.1 Write tests for change classification, fleet pause, checkpoints, and decision log (TDD)
- [ ] 5.6.2 Create `admiral/adaptation/classify.sh` — 3-tier (Tactical/Strategic/Full Pivot) with cascade map
- [ ] 5.6.3 Create `admiral/memory/checkpoint.sh` — structured checkpoint files with completed/in-progress/blocked/decisions
- [ ] 5.6.4 Create `admiral/adaptation/fleet-pause.sh` — checkpoint all agents, suspend routing, apply, validate, resume
- [ ] 5.6.5 Create `admiral/memory/decision-log.sh` — append-only log with timestamp, decision, alternatives, rationale
- [ ] 5.6.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 8 — S-20a, S-20b, S-20c, S-20d

### 5.7 Trust Level Data Model + Scoring [M] `task/5.7-trust-model`

> Depends on: nothing

- [ ] 5.7.1 Write tests for trust data model, stage-to-authority mapping, and score calculation (TDD)
- [ ] 5.7.2 Create `fleet/autonomy/types.ts` and `fleet/autonomy/trust-model.ts` — 4 stages, per-agent per-category tracking
- [ ] 5.7.3 Create `fleet/autonomy/trust-scoring.ts` — outcome-based scoring, severity weighting, score history
- [ ] 5.7.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 18 — AU-01, AU-02

### 5.8 Trust Permission Gating + Demotion/Promotion [L] `task/5.8-trust-gating`

> Depends on: 5.7

- [ ] 5.8.1 Write tests for permission gating, demotion triggers, and promotion criteria (TDD)
- [ ] 5.8.2 Create `fleet/autonomy/permission-gate.ts` and `.hooks/trust_gate.sh` — dynamic enforcement by trust level
- [ ] 5.8.3 Create `fleet/autonomy/demotion.ts` — automatic demotion on failure, immediate on critical, fleet-wide on security incident
- [ ] 5.8.4 Create `fleet/autonomy/promotion.ts` — detect graduation criteria, surface recommendation, require operator approval
- [ ] 5.8.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 18 — AU-03, AU-04, AU-05

### 5.9 Trust Persistence + Override [M] `task/5.9-trust-persistence`

> Depends on: 5.8, Phase 4 Brain (4.3+)

- [ ] 5.9.1 Write tests for cross-session persistence, trust decay, and manual override (TDD)
- [ ] 5.9.2 Create `fleet/autonomy/persistence.ts` — store trust state in Brain, load at session start, 30-day inactivity decay
- [ ] 5.9.3 Create `fleet/autonomy/override.ts` — manual trust adjustment via CLI/API, reason required, authority enforcement
- [ ] 5.9.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 18 — AU-06, AU-08

### 5.10 Trust Dashboard + Routing + Analytics [L] `task/5.10-trust-dashboard`

> Depends on: 5.9

- [ ] 5.10.1 Write tests for dashboard rendering, trust-aware routing, and report generation (TDD)
- [ ] 5.10.2 Create `fleet/autonomy/dashboard.ts` — per-agent trust by category, trends, decay warnings at 25 days
- [ ] 5.10.3 Create `fleet/autonomy/trust-routing.ts` — integrate trust into routing, minimum thresholds for sensitive tasks
- [ ] 5.10.4 Create `fleet/autonomy/reporting.ts` — fleet trust distribution, velocity, demotion frequency, ROI correlation
- [ ] 5.10.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 18 — AU-07, AU-09, AU-10

### 5.11 Governance API Server [L] `task/5.11-governance-api`

> Depends on: 5.3

- [ ] 5.11.1 Write tests for governance API endpoints and authentication (TDD)
- [ ] 5.11.2 Create `control-plane/src/governance-api.ts` — REST API (`/api/v1/`): health, fleet status, policies, audit events
- [ ] 5.11.3 Create `control-plane/src/auth.ts` — authentication middleware
- [ ] 5.11.4 Create `control-plane/src/policies.ts` — policy CRUD with versioning, deactivation, change logging
- [ ] 5.11.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 23 — GP-01, GP-02

### 5.12 Governance Event Streaming + Reporting [L] `task/5.12-governance-events`

> Depends on: 5.11

- [ ] 5.12.1 Write tests for SSE streaming, polling, filtering, and report generation (TDD)
- [ ] 5.12.2 Create `control-plane/src/event-stream.ts` — SSE endpoint, polling, filtering by type/severity/agent, replay
- [ ] 5.12.3 Create `control-plane/src/reports.ts` — 5 report types (compliance, KPI, fleet health, audit, trend analysis)
- [ ] 5.12.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 23 — GP-05, GP-06

### 5.13 Governance SDK + Configuration Management [L] `task/5.13-governance-sdk`

> Depends on: 5.12

- [ ] 5.13.1 Write tests for SDK client operations and config versioning (TDD)
- [ ] 5.13.2 Create `control-plane/src/sdk/` — typed client, event subscription, authentication, retry
- [ ] 5.13.3 Create `admiral/governance/sdk_wrapper.sh` — shell CLI wrapper
- [ ] 5.13.4 Create `control-plane/src/config-management.ts` — versioned config with history, diffs, rollback
- [ ] 5.13.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 23 — GP-07, GP-09

### 5.14 Governance Webhook Integrations [L] `task/5.14-governance-webhooks`

> Depends on: 5.12

- [ ] 5.14.1 Write tests for webhook payload formatting, filtering, rate limiting, and retry (TDD)
- [ ] 5.14.2 Create `control-plane/src/webhooks/slack.ts` — formatted Slack messages
- [ ] 5.14.3 Create `control-plane/src/webhooks/pagerduty.ts` — incident triggers
- [ ] 5.14.4 Create `control-plane/src/webhooks/jira.ts` — issue creation
- [ ] 5.14.5 Create `control-plane/src/webhooks/generic.ts` — JSON to any HTTP endpoint
- [ ] 5.14.6 Add event type filtering, severity thresholds, rate limiting across all integrations
- [ ] 5.14.7 Cleanup: lint, shellcheck, docs

**Ref:** Stream 23 — GP-10

### 5.15 Governance Deployment Guide [L] `task/5.15-governance-deploy-guide`

> Depends on: 5.11, 5.14

- [ ] 5.15.1 Write single-operator deployment guide (local, minimal config)
- [ ] 5.15.2 Write team deployment guide (shared server, multi-operator, auth setup)
- [ ] 5.15.3 Write infrastructure requirements, security hardening checklist, operational runbook
- [ ] 5.15.4 Write at least 2 integration recipes (CI/CD, chat)

**Ref:** Stream 23 — GP-08

> **Note:** GP-03 (Multi-tenant) and GP-04 (Policy language) are deferred until single-tenant governance is stable.

---

## Phase 6 — Platform: MCP, Adapters, Security

**Goal:** MCP integration, platform adapters, and security hardening.
**Done when:** MCP servers work with auth and behavioral monitoring, at least 4 platform adapters exist (Claude Code, Cursor, Windsurf, API-direct), security audit passes with 30 attack scenarios.

### 6.1 MCP Server Scaffold + Configuration [L] `task/6.1-mcp-server-scaffold`

> Depends on: nothing

- [ ] 6.1.1 Write tests for MCP server startup, tool discovery, and concurrent requests (TDD)
- [ ] 6.1.2 Implement core MCP server with JSON-RPC, stdio and HTTP+SSE transports
- [ ] 6.1.3 Implement configuration system — tool enable/disable, agent-to-tool mappings, version pinning, schema validation
- [ ] 6.1.4 Implement health endpoint and usage metrics — `/health`, per-tool latency percentiles, error rates
- [ ] 6.1.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 16 — M-01a, M-01b, M-09

### 6.2 Brain MCP Tools [L] `task/6.2-brain-mcp-tools`

> Depends on: 6.1, Phase 4 (Brain B1)

- [ ] 6.2.1 Write tests for brain_query and brain_record tools (TDD)
- [ ] 6.2.2 Implement `brain_query` MCP tool — semantic search with category/scope/temporal filters
- [ ] 6.2.3 Implement `brain_record` MCP tool — create entries with required field enforcement, duplicate detection
- [ ] 6.2.4 Implement `brain_retrieve` (ID lookup + link traversal) and `brain_strengthen` (usefulness scoring)
- [ ] 6.2.5 Implement `brain_audit` (Admiral-only) and `brain_purge` (Admiral-only, regulatory deletion)
- [ ] 6.2.6 Cleanup: lint, verify role-based access, docs

**Ref:** Stream 16 — M-02a, M-02b, M-02c, M-02d

### 6.3 Fleet + Governance MCP Tools [L] `task/6.3-fleet-governance-mcp-tools`

> Depends on: 6.1, Phase 3 (Fleet Routing)

- [ ] 6.3.1 Write tests for fleet_status, agent_registry, and task_route tools (TDD)
- [ ] 6.3.2 Implement `fleet_status` — active agents, queued tasks, budget utilization, alert summary
- [ ] 6.3.3 Implement `agent_registry` — capability-based agent discovery
- [ ] 6.3.4 Implement `task_route` — read-only routing recommendation with confidence score
- [ ] 6.3.5 Implement `standing_order_status` — enforcement status, violation counts per SO
- [ ] 6.3.6 Implement `compliance_check` — validate proposed actions against SOs and boundaries
- [ ] 6.3.7 Implement `escalation_file` — structured escalation records with severity routing
- [ ] 6.3.8 Cleanup: lint, verify tool schemas, docs

**Ref:** Stream 16 — M-03a, M-03b, M-03c, M-04a, M-04b, M-04c

### 6.4 MCP Authentication + Authorization [L] `task/6.4-mcp-auth`

> Depends on: 6.1

- [ ] 6.4.1 Write tests for identity token lifecycle — issuance, validation, expiration, revocation (TDD)
- [ ] 6.4.2 Implement identity token system — crypto-signed tokens with agent_id, role, project_id, session_id
- [ ] 6.4.3 Implement auth middleware — validate every MCP request, reject invalid/expired/revoked
- [ ] 6.4.4 Implement role-based access control — per-tool permission matrix, configurable via server config
- [ ] 6.4.5 Cleanup: lint, verify unauthorized callers rejected for every tool, docs

**Ref:** Stream 16 — M-05a, M-05b

### 6.5 MCP Tool Schemas + Client SDK [L] `task/6.5-mcp-schemas-sdk`

> Depends on: 6.2, 6.3

- [ ] 6.5.1 Write tests for schema validation and client SDK connection/retry logic (TDD)
- [ ] 6.5.2 Create JSON Schema definitions (input, output, error) for all 12+ MCP tools, versioned
- [ ] 6.5.3 Enforce schema validation at server level — reject invalid inputs before tool execution
- [ ] 6.5.4 Implement client SDK — connection management, typed tool wrappers, auto token injection, retry
- [ ] 6.5.5 Cleanup: lint, verify all schemas validate, docs

**Ref:** Stream 16 — M-06, M-08

### 6.6 MCP Integration + Security Tests [L] `task/6.6-mcp-tests`

> Depends on: 6.2, 6.3, 6.4

- [ ] 6.6.1 Implement Level 1-2 tests — connection, tool discovery, permission boundary per role (TDD)
- [ ] 6.6.2 Implement Level 3 tests — identity enforcement: valid/no/expired/wrong-project/wrong-role/revoked tokens
- [ ] 6.6.3 Implement Level 4 tests — full Brain lifecycle: record → query → strengthen → supersede → audit
- [ ] 6.6.4 Implement Level 5 tests — OWASP MCP Top 10: SSRF, injection, excessive permissions, undeclared egress
- [ ] 6.6.5 Cleanup: lint, verify all tests runnable in CI, docs

**Ref:** Stream 16 — M-07a, M-07b, M-07c

### 6.7 MCP Behavioral Monitoring [L] `task/6.7-mcp-behavioral-security`

> Depends on: 6.1

- [ ] 6.7.1 Write tests for behavioral baselining, manifest snapshots, and hash verification (TDD)
- [ ] 6.7.2 Implement `mcp_behavior_monitor` PostToolUse hook — per-server/per-tool metrics, alert on anomalies
- [ ] 6.7.3 Implement tool manifest snapshot — cryptographic snapshot at install, runtime diff, block changed tools
- [ ] 6.7.4 Implement version pinning with SHA-256 hash verification — mismatch blocks startup
- [ ] 6.7.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 16 — M-10, M-12, M-13

### 6.8 MCP Trust Decay + Canary Operations [L] `task/6.8-mcp-trust-canary`

> Depends on: 6.7

- [ ] 6.8.1 Write tests for trust decay mechanics and canary injection/verification (TDD)
- [ ] 6.8.2 Implement trust decay — scheduled re-verification, tool discovery diff triggers trust freeze
- [ ] 6.8.3 Implement canary operations — inject known-safe data at random intervals, verify unmodified passage
- [ ] 6.8.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 16 — M-11, M-14

### 6.9 Platform Adapter Interface + Claude Code Refactor [L] `task/6.9-adapter-interface`

> Depends on: nothing

- [ ] 6.9.1 Write tests for adapter interface contract — lifecycle hooks, context injection, tool permissions (TDD)
- [ ] 6.9.2 Define abstract platform adapter interface (`platform/adapter-interface.ts`)
- [ ] 6.9.3 Extract Claude Code-specific logic into adapter (`platform/claude-code/`)
- [ ] 6.9.4 Write Claude Code adapter tests — verify backward compatibility
- [ ] 6.9.5 Cleanup: lint, verify existing hooks unchanged, docs

**Ref:** Stream 17 — PA-01, PA-02a, PA-02b

### 6.10 Cursor + Windsurf Adapters [XL] `task/6.10-cursor-windsurf-adapters`

> Depends on: 6.9

- [ ] 6.10.1 Write tests for Cursor adapter — `.cursorrules` context injection (TDD)
- [ ] 6.10.2 Implement Cursor IDE adapter — standing orders to `.cursorrules`, tool permissions translation
- [ ] 6.10.3 Write tests for Windsurf adapter — `.windsurfrules` context injection (TDD)
- [ ] 6.10.4 Implement Windsurf IDE adapter — standing orders to `.windsurfrules`, Cascade flow integration
- [ ] 6.10.5 Cleanup: lint, verify integration tests for both adapters, docs

**Ref:** Stream 17 — PA-03, PA-04

### 6.11 API-Direct + VS Code Adapters [XL] `task/6.11-api-vscode-adapters`

> Depends on: 6.9, 6.1

- [ ] 6.11.1 Write tests for headless API-direct adapter (TDD)
- [ ] 6.11.2 Implement API-direct adapter — headless agent runtime for CI/CD pipelines
- [ ] 6.11.3 Write tests for VS Code extension scaffold (TDD)
- [ ] 6.11.4 Implement VS Code extension — fleet status sidebar, agent identity status bar, alert notifications
- [ ] 6.11.5 Cleanup: lint, verify end-to-end CI scenario for API-direct, docs

**Ref:** Stream 17 — PA-05, PA-06

### 6.12 Event-Driven + Scheduled Agent Patterns [L] `task/6.12-event-driven-agents`

> Depends on: 6.11

- [ ] 6.12.1 Write tests for event-driven triggers and authority narrowing (TDD)
- [ ] 6.12.2 Implement event-driven agent framework — PR review, CI failure, issue triage triggers
- [ ] 6.12.3 Implement headless agent authority narrowing — default Autonomous-1, enforce via hook
- [ ] 6.12.4 Implement scheduled agent runner — cron-like scheduler with cost circuit breakers
- [ ] 6.12.5 Implement context bootstrap for headless agents — event payload, Ground Truth, Brain query, scope
- [ ] 6.12.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 17 — PA-10, PA-11, PA-12, PA-13

### 6.13 Platform Test Suite + Capability Matrix [M] `task/6.13-platform-testing`

> Depends on: 6.9, 6.10, 6.11

- [ ] 6.13.1 Write shared adapter test suite — standardized tests for every interface method (TDD)
- [ ] 6.13.2 Run shared suite against all adapters, generate per-method pass/fail report
- [ ] 6.13.3 Implement platform-specific context injection strategies — 50K hard limit, identity never truncated
- [ ] 6.13.4 Create platform capability matrix — Full/Partial/None per feature per platform
- [ ] 6.13.5 Cleanup: lint, verify all adapters pass shared suite, docs

**Ref:** Stream 17 — PA-07, PA-08, PA-09

### 6.14 Security — Adversarial Testing + Regression [L] `task/6.14-adversarial-testing`

> Depends on: nothing

- [ ] 6.14.1 Write tests for attack corpus runner (TDD)
- [ ] 6.14.2 Create 12 new ATK entries (ATK-0019 through ATK-0030) — temporal threats, tool description poisoning, cross-server exfiltration, A2A cascade, Brain poisoning
- [ ] 6.14.3 Implement attack corpus test runner — iterate all 30 scenarios, verify defenses, structured JSON report
- [ ] 6.14.4 Implement security regression test framework — registry mapping issues to tests, CI blocks on regression
- [ ] 6.14.5 Cleanup: lint, shellcheck, verify all 30 scenarios execute, docs

**Ref:** Stream 24 — SEC-01, SEC-10

### 6.15 Security — Injection Defense Layers [M] `task/6.15-injection-defense`

> Depends on: nothing

- [ ] 6.15.1 Write tests for Layer 1 pattern matching and Layer 2 structural validation (TDD)
- [ ] 6.15.2 Implement Layer 1 — regex-based input sanitization for injection patterns, < 10ms latency
- [ ] 6.15.3 Implement Layer 2 — JSON schema validation for all external inputs, encoding normalization
- [ ] 6.15.4 Implement boundary input validation — max input sizes, allowed character sets, null byte blocking
- [ ] 6.15.5 Cleanup: lint, shellcheck, verify false positive rate < 1% (L1) and < 2% (L2), docs

**Ref:** Stream 24 — SEC-02, SEC-03, SEC-12

### 6.16 Security — Privilege, Secrets, Audit Integrity [L] `task/6.16-privilege-audit`

> Depends on: nothing

- [ ] 6.16.1 Write tests for privilege escalation defense, secret detection, and hash chain integrity (TDD)
- [ ] 6.16.2 Implement privilege escalation hardening — block self-escalation, tool allowlist, identity token binding
- [ ] 6.16.3 Implement secret scanning for Brain entries — detect API keys, JWTs, PEM keys; quarantine on detection
- [ ] 6.16.4 Implement audit trail tamper detection — SHA-256 hash chain, startup validation, critical alert on break
- [ ] 6.16.5 Create security incident response playbook — 4 critical scenarios
- [ ] 6.16.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 24 — SEC-04, SEC-05, SEC-06, SEC-07

### 6.17 Security — Supply Chain + Infrastructure [M] `task/6.17-supply-chain`

> Depends on: nothing

- [ ] 6.17.1 Write tests for rate limiting behavior (TDD)
- [ ] 6.17.2 Implement dependency vulnerability scanning — `npm audit` in CI, critical/high block merges
- [ ] 6.17.3 Implement SBOM generation — CycloneDX/SPDX format, npm + system dependencies
- [ ] 6.17.4 Implement rate limiting for control plane API — token bucket, 429 with Retry-After, configurable
- [ ] 6.17.5 Cleanup: lint, verify CI workflows, docs

**Ref:** Stream 24 — SEC-08, SEC-09, SEC-11

### 6.18 Security — MCP/A2A Hardening [L] `task/6.18-mcp-a2a-security`

> Depends on: 6.14, 6.7

- [ ] 6.18.1 Write tests for universal scanning and cascade containment (TDD)
- [ ] 6.18.2 Extend `zero_trust_validator.sh` to scan ALL tool responses, escalate MCP-sourced injection to CRITICAL
- [ ] 6.18.3 Implement cascade containment — quarantine Brain entries from affected agents, suspend A2A, compute contamination graph
- [ ] 6.18.4 Cleanup: lint, shellcheck, verify ATK-0027 scenario passes, docs

**Ref:** Stream 24 — SEC-13, SEC-14

---

## Phase 7 — Advanced: Observability, Context Engineering, QA

**Goal:** Observability infrastructure, context engineering optimization, and automated QA system.
**Done when:** Structured logging and tracing work, metrics expose via Prometheus, context profiles manage budget, compression handles overflow, quality pipeline gates CI, and quality scoring tracks modules.

### 7.1 Structured Logging + Distributed Tracing [L] `task/7.1-logging-tracing`

> Depends on: nothing

- [ ] 7.1.1 Write tests for structured log output format and trace ID propagation (TDD)
- [ ] 7.1.2 Implement structured JSON logging — `log_structured` for hooks, structured logger for control plane; required fields: timestamp, level, component, correlation ID, message, context
- [ ] 7.1.3 Implement distributed tracing — trace ID at session start, span IDs with parent-child, propagation through hooks/control plane/brain
- [ ] 7.1.4 Cleanup: lint, shellcheck, verify all components emit structured logs, docs

**Ref:** Stream 25 — OB-01, OB-02

### 7.2 Metrics + Health Checks + SLOs [L] `task/7.2-metrics-health-slos`

> Depends on: 7.1

- [ ] 7.2.1 Write tests for Prometheus metrics, health probe aggregation, and SLO tracking (TDD)
- [ ] 7.2.2 Implement Prometheus-compatible metrics — hook latency, pass/fail rate, event throughput, brain query latency, API latency; expose at `/metrics`
- [ ] 7.2.3 Implement health check aggregation — `/health` endpoint, per-component probes, degradation details, < 500ms
- [ ] 7.2.4 Implement SLO/SLI definitions — 7 core SLIs, 30-day rolling error budgets, alerts on accelerated consumption
- [ ] 7.2.5 Cleanup: lint, verify Prometheus can scrape `/metrics`, docs

**Ref:** Stream 25 — OB-03, OB-04, OB-08

### 7.3 Alerting + Log Aggregation [L] `task/7.3-alerting-logs`

> Depends on: 7.1, 7.2

- [ ] 7.3.1 Write tests for alert routing, deduplication, escalation, and log query API (TDD)
- [ ] 7.3.2 Implement alert routing rules — severity-based channels, deduplication, escalation for unacknowledged, maintenance window suppression, webhook delivery
- [ ] 7.3.3 Implement log aggregation — centralized queryable store, time/component/level/correlation filters, configurable retention, < 1s query for 24h
- [ ] 7.3.4 Cleanup: lint, verify alert history queryable via API, docs

**Ref:** Stream 25 — OB-05, OB-06

### 7.4 Dashboard + Timeline + Perf Regression [L] `task/7.4-dashboard-timeline`

> Depends on: 7.1, 7.2, 7.3

- [ ] 7.4.1 Write tests for incident timeline reconstruction and performance regression detection (TDD)
- [ ] 7.4.2 Enhance dashboard — real-time event timeline, hook latency sparklines, brain query log, auto-refresh
- [ ] 7.4.3 Implement incident timeline reconstruction — given session ID, reconstruct chronological narrative with causal links, < 5s for 1000 events
- [ ] 7.4.4 Implement performance regression detection — statistical comparison against rolling baselines, detect > 20% latency increase, CI PR warnings
- [ ] 7.4.5 Cleanup: lint, verify dashboard auto-refreshes, docs

**Ref:** Stream 25 — OB-07, OB-09, OB-10

### 7.5 Control Plane Progressive — CP1 + CP2 [XL] `task/7.5-cp1-cp2`

> Depends on: 7.1, 7.2

- [ ] 7.5.1 Write tests for CLI dashboard events and fleet status queries (TDD)
- [ ] 7.5.2 Implement CP1 CLI Dashboard — JSON-lines event logging, terminal status display (agent state, task progress, token budget bar, error/retry counts)
- [ ] 7.5.3 Implement CP2 Fleet Dashboard — five fleet status questions (running, healthy, consuming, attention, recent), agent detail drill-down, task flow visualization, 4-tier alert system
- [ ] 7.5.4 Cleanup: lint, verify CP1 terminal rendering, verify CP2 fleet view, docs

**Ref:** Stream 25 — OB-11, OB-12

### 7.6 Control Plane Progressive — CP3 + Interventions + Thermal [L] `task/7.6-cp3-interventions`

> Depends on: 7.5, Phase 5 (meta-governance)

- [ ] 7.6.1 Write tests for governance dashboard views, intervention actions, and thermal model (TDD)
- [ ] 7.6.2 Implement CP3 Governance Dashboard — governance agent health, decision authority visualization, intervention audit trail
- [ ] 7.6.3 Implement intervention catalog — 10 operator actions (pause agent, pause fleet, emergency halt, kill task, adjust budget, override decision, reroute task, promote/demote tier, modify policy, inject context) each with confirmation, audit, reversal
- [ ] 7.6.4 Implement session thermal model — budget as descriptive not prescriptive, default 0 (unlimited), advisory warnings
- [ ] 7.6.5 Cleanup: lint, verify all 10 interventions audit-logged, docs

**Ref:** Stream 25 — OB-13, OB-14, OB-15

### 7.7 Context Profiles + Budget Tracking [L] `task/7.7-context-profiles`

> Depends on: nothing

- [ ] 7.7.1 Write tests for context profile zones, token allocation, and budget overrun behavior (TDD)
- [ ] 7.7.2 Implement context profile data model — three zones (Standing 15-25%, Session 50-65%, Working 20-30%), per-zone token counting, 50K hard limit
- [ ] 7.7.3 Implement context budget tracker — actual vs allocated comparison, overrun warnings, sacrifice order triggering, historical logging
- [ ] 7.7.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 30 — CE-01, CE-02

### 7.8 Context Compression + Relevance Scoring [L] `task/7.8-context-optimization`

> Depends on: 7.7

- [ ] 7.8.1 Write tests for compression strategies, relevance scoring, and eviction ordering (TDD)
- [ ] 7.8.2 Implement three compression strategies — summarization, prioritization, eviction; auto-trigger at 85%; identity/constraints never compressed
- [ ] 7.8.3 Implement relevance scoring — 5 dimensions (recency, frequency, semantic proximity, authority weight, dependency), < 100ms for 100 items
- [ ] 7.8.4 Implement context injection ordering — Loading Order Protocol: primacy zone first, reference middle, current task last; constraint-wins conflict resolution
- [ ] 7.8.5 Cleanup: lint, shellcheck, verify compression preserves essential info, docs

**Ref:** Stream 30 — CE-03, CE-04, CE-05

### 7.9 Context Lifecycle Management [L] `task/7.9-context-lifecycle`

> Depends on: 7.7, 7.8

- [ ] 7.9.1 Write tests for overflow handling at each threshold, dynamic allocation, and dashboard metrics (TDD)
- [ ] 7.9.2 Implement context utilization dashboard — per-zone stacked bar, top-10 largest items, compression events at `/dashboard/context`
- [ ] 7.9.3 Implement context overflow handling — graduated response at 80%/90%/95%/100%, no silent loss, force checkpoint at 100%
- [ ] 7.9.4 Implement dynamic context allocation — task complexity classification (S/M/L) drives zone percentages, 3+ profiles
- [ ] 7.9.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 30 — CE-06, CE-07, CE-08

### 7.10 Context Intelligence [L] `task/7.10-context-intelligence`

> Depends on: 7.7, 7.8

- [ ] 7.10.1 Write tests for predictive preloading and audit trail capture (TDD)
- [ ] 7.10.2 Implement context preloading — 4 sources (file dependencies, Brain patterns, skill triggers, interface contracts), respect zone budgets
- [ ] 7.10.3 Implement context audit trail — snapshot at every Propose/Escalate decision, record gaps, source attribution, queryable by agent/decision/time
- [ ] 7.10.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 30 — CE-09, CE-10

### 7.11 Code Review Automation + Test Generation [L] `task/7.11-code-review-auto`

> Depends on: nothing

- [ ] 7.11.1 Write tests for automated review checks and test skeleton generation (TDD)
- [ ] 7.11.2 Implement automated code review — 6 check categories (naming, complexity, test presence, import hygiene, docs, file size), structured QA Issue Report output, < 30s, < 5% false positive
- [ ] 7.11.3 Implement test generation framework — analyze public API, generate describe/it skeletons with edge case placeholders, for `.ts` and `.sh`
- [ ] 7.11.4 Cleanup: lint, shellcheck, verify generated tests parse, docs

**Ref:** Stream 31 — QA-01, QA-02

### 7.12 Quality Gate Pipeline + Metrics [L] `task/7.12-quality-pipeline`

> Depends on: 7.11

- [ ] 7.12.1 Write tests for pipeline stage ordering, blocker-stop behavior, and metrics collection (TDD)
- [ ] 7.12.2 Implement multi-stage quality pipeline — 6 stages (lint, type-check, test, coverage, security, review), stop on Blocker, summary JSON with timing
- [ ] 7.12.3 Implement quality metrics collection per module — 6 types (complexity, coverage, churn, defect density, lint violations, test-to-code ratio), timestamped JSON, CI integration
- [ ] 7.12.4 Cleanup: lint, verify pipeline runs locally and in CI, docs

**Ref:** Stream 31 — QA-03, QA-04

### 7.13 Quality Intelligence — Trends, Debt, Complexity [L] `task/7.13-quality-intelligence`

> Depends on: 7.12

- [ ] 7.13.1 Write tests for trend detection, debt cataloging, and complexity budget enforcement (TDD)
- [ ] 7.13.2 Implement quality trend analysis — moving averages (7d, 30d), detect 3+ consecutive declines, actionable alerts
- [ ] 7.13.3 Implement technical debt tracker — 5 source categories (TODO/FIXME, high-complexity, skipped tests, outdated deps, duplication), prioritized backlog
- [ ] 7.13.4 Implement complexity budget system — per-module budgets, CI blocks on overrun, complexity credit (net-zero), ratchet enforcement
- [ ] 7.13.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 31 — QA-05, QA-06, QA-07

### 7.14 Quality Scoring + Regression Prevention [L] `task/7.14-quality-scoring`

> Depends on: 7.12

- [ ] 7.14.1 Write tests for quality score calculation, risk-based checklists, and regression gate behavior (TDD)
- [ ] 7.14.2 Implement review checklist automation — risk-classify files, generate risk-appropriate checklists, output markdown for PR
- [ ] 7.14.3 Implement quality score per module — 6 weighted dimensions, green/yellow/red classification, tracked over time
- [ ] 7.14.4 Implement quality regression prevention CI gate — compare PR vs base scores, block below 60 or > 10 point decline, exception via quality-debt label
- [ ] 7.14.5 Cleanup: lint, verify CI gate workflow, docs

**Ref:** Stream 31 — QA-08, QA-09, QA-10

---

## Phase 8 — Strategic: Governance, Validation, Positioning, Excellence

**Goal:** Implement meta-governance agents, complete Standing Orders enforcement, build rating system, validate thesis, engineer structured intent, harden security, close protocol gaps, achieve exemplary codebase quality, and produce strategic positioning documents.
**Done when:** All 16 SOs have automated enforcement, rating system tracks in CI, thesis validation collects evidence, meta-governance agents operate, intent engineering routes intents, and strategic positioning documents exist.

### 8.1 Standing Orders — Identity, Scope & Context Enforcement [L] `task/8.1-so-identity-scope`

> Depends on: Phase 7 complete

- [ ] 8.1.1 Write tests for identity validation — drift detection, role expansion (TDD)
- [ ] 8.1.2 Implement SO-01 identity discipline enforcement hook
- [ ] 8.1.3 Write tests for hard-blocking scope boundary guard (TDD)
- [ ] 8.1.4 Upgrade SO-03 scope_boundary_guard.sh from soft-warning to hard-blocking
- [ ] 8.1.5 Write tests for context discovery validator (TDD)
- [ ] 8.1.6 Implement SO-11 context discovery enforcement hook
- [ ] 8.1.7 Cleanup: lint, shellcheck, docs

**Ref:** Stream 29 — SO-01, SO-03, SO-11

### 8.2 Standing Orders — Communication & Honesty Enforcement [L] `task/8.2-so-communication`

> Depends on: nothing

- [ ] 8.2.1 Write tests for output routing validation (TDD)
- [ ] 8.2.2 Implement SO-02 output routing enforcement hook
- [ ] 8.2.3 Write tests for context honesty detection — fabrication, unsupported claims (TDD)
- [ ] 8.2.4 Implement SO-04 context honesty enforcement hook
- [ ] 8.2.5 Write tests for communication format validation (TDD)
- [ ] 8.2.6 Implement SO-09 communication format enforcement hook
- [ ] 8.2.7 Cleanup: lint, shellcheck, docs

**Ref:** Stream 29 — SO-02, SO-04, SO-09

### 8.3 Standing Orders — Authority & Recovery Enforcement [L] `task/8.3-so-authority-recovery`

> Depends on: nothing

- [ ] 8.3.1 Write tests for decision authority tier validation (TDD)
- [ ] 8.3.2 Implement SO-05 decision authority enforcement hook
- [ ] 8.3.3 Write tests for recovery ladder progression tracking (TDD)
- [ ] 8.3.4 Implement SO-06 recovery protocol enforcement hook
- [ ] 8.3.5 Write tests for checkpoint interval enforcement (TDD)
- [ ] 8.3.6 Implement SO-07 checkpointing enforcement hook
- [ ] 8.3.7 Cleanup: lint, shellcheck, docs

**Ref:** Stream 29 — SO-05, SO-06, SO-07

### 8.4 Standing Orders — Quality & Safety Enforcement [L] `task/8.4-so-quality-safety`

> Depends on: nothing

- [ ] 8.4.1 Write tests for quality standards enforcement (TDD)
- [ ] 8.4.2 Implement SO-08 quality standards enforcement hook
- [ ] 8.4.3 Write tests for prohibitions edge cases — encoded secrets, split patterns, self-approval (TDD)
- [ ] 8.4.4 Harden SO-10 prohibitions hook for all 5 edge case categories
- [ ] 8.4.5 Write tests for enhanced zero-trust validation (TDD)
- [ ] 8.4.6 Enhance SO-12 zero_trust_validator.sh with 5 additional scenarios
- [ ] 8.4.7 Cleanup: lint, shellcheck, docs

**Ref:** Stream 29 — SO-08, SO-10, SO-12

### 8.5 Standing Orders — Bias, Compliance & Protocol Governance [L] `task/8.5-so-bias-compliance`

> Depends on: nothing

- [ ] 8.5.1 Write tests for bias pattern detection — sycophantic drift, confidence uniformity (TDD)
- [ ] 8.5.2 Implement SO-13 bias awareness detection hook
- [ ] 8.5.3 Write tests for compliance/ethics guard — regulated domains, IP violations (TDD)
- [ ] 8.5.4 Implement SO-14 compliance ethics enforcement hook
- [ ] 8.5.5 Write tests for enhanced pre-work validation (TDD)
- [ ] 8.5.6 Enhance SO-15 pre_work_validator.sh with hard-decision front-loading
- [ ] 8.5.7 Write tests for protocol governance guard (TDD)
- [ ] 8.5.8 Implement SO-16 protocol governance enforcement hook
- [ ] 8.5.9 Cleanup: lint, shellcheck, docs

**Ref:** Stream 29 — SO-13, SO-14, SO-15, SO-16

### 8.6 Standing Orders — Enforcement Completeness Report [M] `task/8.6-so-coverage-report`

> Depends on: 8.1, 8.2, 8.3, 8.4, 8.5

- [ ] 8.6.1 Write tests for SO coverage report generation (TDD)
- [ ] 8.6.2 Implement SO-17 enforcement completeness report script
- [ ] 8.6.3 Integrate report into CI with JSON output for dashboard
- [ ] 8.6.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 29 — SO-17

### 8.7 Meta-Governance Framework & Event Bus [L] `task/8.7-meta-gov-framework`

> Depends on: nothing

- [ ] 8.7.1 Write tests for governance agent base template — subscription, findings, interventions (TDD)
- [ ] 8.7.2 Implement MG-01 governance agent framework with self-modification prohibition
- [ ] 8.7.3 Write tests for governance event bus — pub/sub, filtering, durable storage (TDD)
- [ ] 8.7.4 Implement MG-05 governance event bus
- [ ] 8.7.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 19 — MG-01, MG-05

### 8.8 Meta-Governance Rule Engine & Intervention Protocol [L] `task/8.8-meta-gov-rules`

> Depends on: 8.7

- [ ] 8.8.1 Write tests for rule engine — threshold, pattern, temporal, composite rules (TDD)
- [ ] 8.8.2 Implement MG-06 configurable governance rule engine
- [ ] 8.8.3 Write tests for intervention protocol — warn/restrict/suspend/terminate ladder (TDD)
- [ ] 8.8.4 Implement MG-07 governance intervention protocol with cooldown and reversal
- [ ] 8.8.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 19 — MG-06, MG-07

### 8.9 Sentinel Agent [L] `task/8.9-sentinel-agent`

> Depends on: 8.7, 8.8

- [ ] 8.9.1 Write tests for Sentinel — loop detection, budget monitoring, scope drift, intervention (TDD)
- [ ] 8.9.2 Implement MG-02 Sentinel agent with four detection capabilities
- [ ] 8.9.3 Write integration tests with synthetic fleet event streams
- [ ] 8.9.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 19 — MG-02

### 8.10 Arbiter & Compliance Monitor Agents [L] `task/8.10-arbiter-compliance`

> Depends on: 8.7, 8.8

- [ ] 8.10.1 Write tests for Arbiter — contradictory outputs, scope overlap, multi-operator conflicts (TDD)
- [ ] 8.10.2 Implement MG-03 Arbiter agent with three resolution strategies
- [ ] 8.10.3 Write tests for Compliance Monitor — per-SO scoring, bypass detection (TDD)
- [ ] 8.10.4 Implement MG-04 Compliance Monitor agent with periodic reports
- [ ] 8.10.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 19 — MG-03, MG-04

### 8.11 Meta-Governance Self-Governance & Metrics [L] `task/8.11-meta-gov-selfgov`

> Depends on: 8.9, 8.10

- [ ] 8.11.1 Write tests for self-governance — self-modification block, rate limits, meta-Sentinel (TDD)
- [ ] 8.11.2 Implement MG-09 governance agent self-governance safeguards
- [ ] 8.11.3 Write tests for governance metrics — 6 KPIs from event data (TDD)
- [ ] 8.11.4 Implement MG-10 governance metrics and KPI tracking
- [ ] 8.11.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 19 — MG-09, MG-10

### 8.12 Meta-Governance Dashboard, Multi-Operator & Fallback [L] `task/8.12-meta-gov-ops`

> Depends on: 8.9, 8.10

- [ ] 8.12.1 Write tests for governance audit dashboard rendering (TDD)
- [ ] 8.12.2 Implement MG-08 governance audit dashboard (CLI + control plane)
- [ ] 8.12.3 Write tests for multi-operator roles — Owner/Operator/Observer authority matrix (TDD)
- [ ] 8.12.4 Implement MG-11 multi-operator governance with conflict resolution
- [ ] 8.12.5 Implement MG-12 operator handoff procedure with state export
- [ ] 8.12.6 Write tests for fallback decomposer mode (TDD)
- [ ] 8.12.7 Implement MG-13 fallback decomposer mode with auto-revert
- [ ] 8.12.8 Cleanup: lint, shellcheck, docs

**Ref:** Stream 19 — MG-08, MG-11, MG-12, MG-13

### 8.13 Rating System Data Model & Calculation [L] `task/8.13-rating-core`

> Depends on: nothing

- [ ] 8.13.1 Write tests for rating schema validation — tiers, dimensions, caps (TDD)
- [ ] 8.13.2 Implement RT-01 rating data model as JSON schema
- [ ] 8.13.3 Write tests for automated rating calculation (TDD)
- [ ] 8.13.4 Implement RT-02 rating calculation script (7 benchmarks, hard caps, report format)
- [ ] 8.13.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 32 — RT-01, RT-02

### 8.14 Rating CI Integration & Badges [M] `task/8.14-rating-ci`

> Depends on: 8.13

- [ ] 8.14.1 Write tests for CI rating job — regression detection, PR comments (TDD)
- [ ] 8.14.2 Implement RT-03 rating CI integration with weekly scheduled runs
- [ ] 8.14.3 Implement RT-04 SVG badge generation for all 5 tiers
- [ ] 8.14.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 32 — RT-03, RT-04

### 8.15 Rating History, Trends & Recommendations [L] `task/8.15-rating-tracking`

> Depends on: 8.13

- [ ] 8.15.1 Write tests for history tracking — append-only log, transition detection (TDD)
- [ ] 8.15.2 Implement RT-05 rating history tracker with trend summaries
- [ ] 8.15.3 Write tests for improvement recommendation engine (TDD)
- [ ] 8.15.4 Implement RT-06 recommendation engine mapping gaps to concrete actions
- [ ] 8.15.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 32 — RT-05, RT-06

### 8.16 Rating Module-Level, Benchmarks & Alerts [L] `task/8.16-rating-advanced`

> Depends on: 8.13, 8.15

- [ ] 8.16.1 Write tests for per-module rating calculation (TDD)
- [ ] 8.16.2 Implement RT-07 per-module ratings with critical module caps
- [ ] 8.16.3 Write tests for benchmark comparison (TDD)
- [ ] 8.16.4 Implement RT-08 benchmark comparison against pristine repos
- [ ] 8.16.5 Write tests for rating alert triggers (TDD)
- [ ] 8.16.6 Implement RT-10 rating alerts with structured notifications
- [ ] 8.16.7 Cleanup: lint, shellcheck, docs

**Ref:** Stream 32 — RT-07, RT-08, RT-10

### 8.17 Rating Dashboard [L] `task/8.17-rating-dashboard`

> Depends on: 8.15, 8.16

- [ ] 8.17.1 Write tests for rating dashboard data aggregation (TDD)
- [ ] 8.17.2 Implement RT-09 rating dashboard with visual indicators
- [ ] 8.17.3 Integrate per-dimension scores, history trend, module heatmap, hard caps display
- [ ] 8.17.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 32 — RT-09

### 8.18 Thesis Metrics & A/B Framework [L] `task/8.18-thesis-measurement`

> Depends on: nothing

- [ ] 8.18.1 Define thesis metrics with null hypotheses and evidence thresholds (TV-01)
- [ ] 8.18.2 Write tests for A/B comparison framework — advisory vs enforcement modes (TDD)
- [ ] 8.18.3 Implement TV-02 advisory vs enforcement comparison framework
- [ ] 8.18.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 33 — TV-01, TV-02

### 8.19 Thesis Case Studies & Quality Tracking [M] `task/8.19-thesis-evidence`

> Depends on: 8.18

- [ ] 8.19.1 Create TV-03 case study template and document 5+ enforcement case studies
- [ ] 8.19.2 Write tests for quality improvement tracking with governance milestones (TDD)
- [ ] 8.19.3 Implement TV-04 longitudinal quality tracking with correlation analysis
- [ ] 8.19.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 33 — TV-03, TV-04

### 8.20 Thesis Overhead, ROI & Developer Experience [M] `task/8.20-thesis-cost`

> Depends on: nothing

- [ ] 8.20.1 Create TV-05 developer experience survey framework
- [ ] 8.20.2 Write tests for false positive tracking — per-hook rates, developer-hours lost (TDD)
- [ ] 8.20.3 Implement TV-06 false positive tracker
- [ ] 8.20.4 Write tests for governance overhead measurement — 5 categories (TDD)
- [ ] 8.20.5 Implement TV-07 governance overhead measurement against 25% hard cap
- [ ] 8.20.6 Write tests for ROI model calculation (TDD)
- [ ] 8.20.7 Implement TV-08 ROI model with breakeven analysis
- [ ] 8.20.8 Cleanup: lint, shellcheck, docs

**Ref:** Stream 33 — TV-05, TV-06, TV-07, TV-08

### 8.21 Thesis Community Feedback [S] `task/8.21-thesis-feedback`

> Depends on: nothing

- [ ] 8.21.1 Create TV-10 feedback framework with channels, taxonomy, and triage process
- [ ] 8.21.2 Create GitHub issue templates for governance feedback
- [ ] 8.21.3 Cleanup: docs

**Ref:** Stream 33 — TV-10

### 8.22 Intent Capture & Validation [L] `task/8.22-intent-capture`

> Depends on: nothing

- [ ] 8.22.1 Write tests for intent schema — six elements, progressive completion (TDD)
- [ ] 8.22.2 Implement IE-01 intent capture schema with JSON schema and text rendering
- [ ] 8.22.3 Write tests for intent validation — completeness, ambiguity, consistency (TDD)
- [ ] 8.22.4 Implement IE-03 intent validation with 5 check categories
- [ ] 8.22.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 22 — IE-01, IE-03

### 8.23 Intent Decomposition & Routing [L] `task/8.23-intent-decomposition`

> Depends on: 8.22

- [ ] 8.23.1 Write tests for intent decomposition — constraint inheritance, dependency graph (TDD)
- [ ] 8.23.2 Implement IE-02 intent decomposition engine with task graph output
- [ ] 8.23.3 Write tests for intent-to-agent mapping — 5 categories, fallback routing (TDD)
- [ ] 8.23.4 Implement IE-05 intent-to-agent mapping with routing plans
- [ ] 8.23.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 22 — IE-02, IE-05

### 8.24 Intent Dashboard, Templates & Conflict Detection [L] `task/8.24-intent-ops`

> Depends on: 8.22, 8.23

- [ ] 8.24.1 Write tests for intent tracking dashboard (TDD)
- [ ] 8.24.2 Implement IE-04 intent tracking dashboard with sub-intent progress
- [ ] 8.24.3 Create IE-07 intent templates for 5 common task types
- [ ] 8.24.4 Write tests for intent conflict detection — 5 conflict types (TDD)
- [ ] 8.24.5 Implement IE-08 intent conflict detection with resolution recommendations
- [ ] 8.24.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 22 — IE-04, IE-07, IE-08

### 8.25 Intent Learning [M] `task/8.25-intent-learning`

> Depends on: 8.23

- [ ] 8.25.1 Write tests for intent history recording and pattern extraction (TDD)
- [ ] 8.25.2 Implement IE-06 intent history and learning with Brain integration
- [ ] 8.25.3 Cleanup: lint, shellcheck, docs

**Ref:** Stream 22 — IE-06

### 8.26 Security — PII Detection & Audit Trail [L] `task/8.26-security-pii`

> Depends on: nothing

- [ ] 8.26.1 Write tests for pattern-based PII detection — OWASP patterns, <5% false positive (TDD)
- [ ] 8.26.2 Implement S-20 Layer 1 PII detection sanitizer
- [ ] 8.26.3 Write tests for database-level PII rejection triggers (TDD)
- [ ] 8.26.4 Implement S-21 Layer 2 database-level PII rejection for B2/B3
- [ ] 8.26.5 Write tests for security audit trail — append-only, structured entries (TDD)
- [ ] 8.26.6 Implement S-22 security audit trail aggregating all security events
- [ ] 8.26.7 Cleanup: lint, shellcheck, docs

**Ref:** Stream 9 — S-20, S-21, S-22

### 8.27 Platform Adapter Interface & API-Direct Adapter [L] `task/8.27-adapter-interface`

> Depends on: nothing

- [ ] 8.27.1 Define S-18 generic adapter interface with all required methods
- [ ] 8.27.2 Refactor Claude Code adapter to implement the generic interface
- [ ] 8.27.3 Write tests for API-direct adapter — CLI triggers, structured output (TDD)
- [ ] 8.27.4 Implement S-19 API-direct headless adapter
- [ ] 8.27.5 Verify API-direct adapter passes same integration tests as Claude Code adapter
- [ ] 8.27.6 Cleanup: lint, shellcheck, docs

**Ref:** Stream 9 — S-18, S-19

### 8.28 Protocols — Human Referral & Context Budget [M] `task/8.28-protocols-core`

> Depends on: nothing

- [ ] 8.28.1 Write tests for human referral report generation and routing (TDD)
- [ ] 8.28.2 Implement S-26 human referral protocol with template renderer
- [ ] 8.28.3 Write tests for context budget validation — allocation sums, range checks (TDD)
- [ ] 8.28.4 Implement S-28 context budget validation integrated with session start
- [ ] 8.28.5 Write tests for communication format enforcement (TDD)
- [ ] 8.28.6 Implement S-37 communication format enforcement
- [ ] 8.28.7 Cleanup: lint, shellcheck, docs

**Ref:** Stream 10 — S-26, S-28, S-37

### 8.29 Protocols — Resource Broker & Inter-Agent Communication [L] `task/8.29-protocols-advanced`

> Depends on: nothing

- [ ] 8.29.1 Write tests for paid resource broker — credential vault, cost tracking, budget limits (TDD)
- [ ] 8.29.2 Implement S-27 paid resource authorization broker
- [ ] 8.29.3 Write tests for inter-agent communication schema and routing (TDD)
- [ ] 8.29.4 Implement S-40 inter-agent communication protocol
- [ ] 8.29.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 10 — S-27, S-40

### 8.30 Data Ecosystem — Feedback Loop & Ecosystem Agent [L] `task/8.30-data-ecosystem`

> Depends on: nothing

- [ ] 8.30.1 Write tests for feedback loop — query, use, measure, update cycle (TDD)
- [ ] 8.30.2 Implement S-29 feedback loop reference implementation
- [ ] 8.30.3 Write tests for knowledge gardener ecosystem agent (TDD)
- [ ] 8.30.4 Implement S-30 ecosystem agent prototype (knowledge gardener)
- [ ] 8.30.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 10 — S-29, S-30

### 8.31 Spec Gaps — Context, Tokens & Model Tiers [L] `task/8.31-spec-gaps-context`

> Depends on: nothing

- [ ] 8.31.1 Write tests for context engineering profiles — 3 profiles, allocation tracking (TDD)
- [ ] 8.31.2 Implement S-31 context engineering profiles
- [ ] 8.31.3 Write tests for token budget enforcement with alerts (TDD)
- [ ] 8.31.4 Implement S-32 token budget enforcement
- [ ] 8.31.5 Write tests for model tier selection — Opus/Sonnet/Haiku by task type (TDD)
- [ ] 8.31.6 Implement S-33 model tier selection engine
- [ ] 8.31.7 Cleanup: lint, shellcheck, docs

**Ref:** Stream 10 — S-31, S-32, S-33

### 8.32 Spec Gaps — Fleet Lifecycle & State [L] `task/8.32-spec-gaps-fleet`

> Depends on: nothing

- [ ] 8.32.1 Write tests for file ownership rules — glob patterns, validation (TDD)
- [ ] 8.32.2 Implement S-34 file ownership rules engine
- [ ] 8.32.3 Write tests for agent lifecycle states — idle/active/suspended/terminated (TDD)
- [ ] 8.32.4 Implement S-35 agent lifecycle management
- [ ] 8.32.5 Write tests for checkpoint and recovery — interval, restore (TDD)
- [ ] 8.32.6 Implement S-36 checkpoint and recovery system
- [ ] 8.32.7 Write tests for session state versioning and auto-migration (TDD)
- [ ] 8.32.8 Implement S-41 session state versioning
- [ ] 8.32.9 Cleanup: lint, shellcheck, docs

**Ref:** Stream 10 — S-34, S-35, S-36, S-41

### 8.33 Spec Gaps — Safety & Validation [M] `task/8.33-spec-gaps-safety`

> Depends on: nothing

- [ ] 8.33.1 Write tests for bias detection patterns (TDD)
- [ ] 8.33.2 Implement S-38 bias detection
- [ ] 8.33.3 Write tests for compliance/ethics domain rules (TDD)
- [ ] 8.33.4 Implement S-39 compliance and ethics enforcement
- [ ] 8.33.5 Write tests for hook manifest validation against schema (TDD)
- [ ] 8.33.6 Implement S-42 hook manifest validation in CI
- [ ] 8.33.7 Implement S-43 progressive autonomy trust tracking
- [ ] 8.33.8 Cleanup: lint, shellcheck, docs

**Ref:** Stream 10 — S-38, S-39, S-42, S-43

### 8.34 MCP/A2A Security [L] `task/8.34-mcp-a2a-security`

> Depends on: 8.29

- [ ] 8.34.1 Write tests for A2A payload inspection — injection, anomaly, taint tracking (TDD)
- [ ] 8.34.2 Implement S-44 A2A payload content inspection with quarantine integration
- [ ] 8.34.3 Write tests for data classification tags and cross-server flow control (TDD)
- [ ] 8.34.4 Implement S-45 data classification with sensitivity labels and transfer gates
- [ ] 8.34.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 10 — S-44, S-45

### 8.35 Exemplary — Simulation & Chaos Testing [L] `task/8.35-simulation-chaos`

> Depends on: nothing

- [ ] 8.35.1 Write tests for deterministic simulation replay (TDD)
- [ ] 8.35.2 Implement X-01 simulation harness with 10+ recorded sequences
- [ ] 8.35.3 Write tests for chaos injection — 20+ failure scenarios (TDD)
- [ ] 8.35.4 Implement X-02 chaos testing for hooks
- [ ] 8.35.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 13 — X-01, X-02

### 8.36 Exemplary — E2E Session Simulation & Profiling [L] `task/8.36-e2e-profiling`

> Depends on: nothing

- [ ] 8.36.1 Write tests for full session lifecycle simulation — 50+ tool cycles (TDD)
- [ ] 8.36.2 Implement X-03 end-to-end Claude Code session simulation
- [ ] 8.36.3 Write tests for hook execution profiling — p50/p95/p99 timing (TDD)
- [ ] 8.36.4 Implement X-04 hook execution profiler with regression detection
- [ ] 8.36.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 13 — X-03, X-04

### 8.37 Exemplary — Contract Testing & API Docs [L] `task/8.37-contracts-api`

> Depends on: nothing

- [ ] 8.37.1 Write contract schemas for every hook-to-control-plane boundary (TDD)
- [ ] 8.37.2 Implement X-13 contract testing between hooks and control plane
- [ ] 8.37.3 Implement X-08 automated API documentation generation from server.ts
- [ ] 8.37.4 Add CI step verifying generated docs match committed docs
- [ ] 8.37.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 13 — X-13, X-08

### 8.38 Exemplary — Security Pentest & Load Testing [L] `task/8.38-pentest-load`

> Depends on: 8.26

- [ ] 8.38.1 Write tests for security penetration test runner — 30+ attack scenarios (TDD)
- [ ] 8.38.2 Implement X-14 security penetration testing suite with posture report
- [ ] 8.38.3 Write tests for load testing harness — 1000+ connections, soak testing (TDD)
- [ ] 8.38.4 Implement X-15 load testing for control plane server
- [ ] 8.38.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 13 — X-14, X-15

### 8.39 Exemplary — Triage Router & Architecture Visualization [L] `task/8.39-router-arch`

> Depends on: nothing

- [ ] 8.39.1 Write tests for triage router — 5+ task types, fallback routing (TDD)
- [ ] 8.39.2 Implement X-06 triage router agent
- [ ] 8.39.3 Implement X-11 auto-generated architecture diagrams
- [ ] 8.39.4 Add CI step for diagram drift detection
- [ ] 8.39.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 13 — X-06, X-11

### 8.40 Exemplary — Cross-System Event Log [L] `task/8.40-unified-events`

> Depends on: nothing

- [ ] 8.40.1 Write tests for unified event log — both shell and TS systems (TDD)
- [ ] 8.40.2 Implement X-07 cross-system unified JSONL event log
- [ ] 8.40.3 Build query interface with filtering by source, type, time, session
- [ ] 8.40.4 Cleanup: lint, shellcheck, docs

**Ref:** Stream 13 — X-07

### 8.41 Exemplary — Code Quality Tooling [M] `task/8.41-quality-tooling`

> Depends on: nothing

- [ ] 8.41.1 Implement X-09 dependency license audit in CI
- [ ] 8.41.2 Implement X-10 reproducible build verification in CI
- [ ] 8.41.3 Implement X-16 git history quality audit script
- [ ] 8.41.4 Implement X-17 documentation coverage report
- [ ] 8.41.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 13 — X-09, X-10, X-16, X-17

### 8.42 Inevitable Features — Agent Versioning & Plugin System [L] `task/8.42-versioning-plugins`

> Depends on: nothing

- [ ] 8.42.1 Write tests for agent versioning — semantic versions, rollback, session isolation (TDD)
- [ ] 8.42.2 Implement IF-01 agent versioning with version registry
- [ ] 8.42.3 Write tests for plugin system — manifest, lifecycle, sandboxing (TDD)
- [ ] 8.42.4 Implement IF-03 plugin system architecture for 3 extension points
- [ ] 8.42.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 28 — IF-01, IF-03

### 8.43 Inevitable Features — Multi-Repo & Session Replay [L] `task/8.43-multi-repo-replay`

> Depends on: 8.42

- [ ] 8.43.1 Write tests for multi-repo governance — central config, per-repo overrides (TDD)
- [ ] 8.43.2 Implement IF-04 multi-repository support with hub-and-spoke model
- [ ] 8.43.3 Write tests for session recording and replay (TDD)
- [ ] 8.43.4 Implement IF-08 agent replay and debugging with comparison reports
- [ ] 8.43.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 28 — IF-04, IF-08

### 8.44 Inevitable Features — Performance Profiling & Cost Optimization [L] `task/8.44-perf-cost`

> Depends on: nothing

- [ ] 8.44.1 Write tests for agent performance profiling — per-agent metrics (TDD)
- [ ] 8.44.2 Implement IF-05 agent performance profiling with weekly reports
- [ ] 8.44.3 Write tests for cost optimization engine — 3 strategies (TDD)
- [ ] 8.44.4 Implement IF-06 cost optimization engine with outcome tracking
- [ ] 8.44.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 28 — IF-05, IF-06

### 8.45 Inevitable Features — Collaboration Patterns & Real-Time Dashboard [L] `task/8.45-collab-dashboard`

> Depends on: nothing

- [ ] 8.45.1 Write tests for collaboration patterns — pipeline, broadcast, consensus, delegation (TDD)
- [ ] 8.45.2 Implement IF-11 agent collaboration patterns as reusable primitives
- [ ] 8.45.3 Write tests for real-time dashboard — SSE, 20+ agents, 2s update latency (TDD)
- [ ] 8.45.4 Implement IF-12 real-time collaboration dashboard with SSE
- [ ] 8.45.5 Cleanup: lint, shellcheck, docs

**Ref:** Stream 28 — IF-11, IF-12

### 8.46 Strategic Positioning — Compliance Crosswalks [L] `task/8.46-compliance-crosswalks`

> Depends on: 8.26

- [ ] 8.46.1 Create R-01 OWASP Agentic Top 10 crosswalk with SO/hook references
- [ ] 8.46.2 Create R-02 Forrester AEGIS framework alignment with coverage percentages
- [ ] 8.46.3 Create R-04 NIST SP 800-207 zero trust alignment mapping
- [ ] 8.46.4 Create R-08 ISO 42001 AI management system alignment
- [ ] 8.46.5 Create R-09 EU AI Act compliance mapping
- [ ] 8.46.6 Cleanup: cross-reference validation

**Ref:** Stream 12 — R-01, R-02, R-04, R-08, R-09

### 8.47 Strategic Positioning — Industry Alignment [M] `task/8.47-industry-alignment`

> Depends on: nothing

- [ ] 8.47.1 Create R-03 KPMG TACO framework tagging for all agent roles
- [ ] 8.47.2 Create R-05 McKinsey Agentic Organization mapping
- [ ] 8.47.3 Create R-06 Singapore IMDA regulatory alignment
- [ ] 8.47.4 Cleanup: cross-reference validation

**Ref:** Stream 12 — R-03, R-05, R-06

### 8.48 Strategic Positioning — Market & Community [L] `task/8.48-market-community`

> Depends on: 8.46, 8.47

- [ ] 8.48.1 Create R-10 competitive differentiation matrix (vs LangGraph, CrewAI, AutoGen, Semantic Kernel)
- [ ] 8.48.2 Create R-11 enterprise adoption playbook (5 phases, 3 personas)
- [ ] 8.48.3 Create R-12 open-source community strategy
- [ ] 8.48.4 Create R-13 academic research positioning with paper outline
- [ ] 8.48.5 Create R-07 AI Work OS positioning document
- [ ] 8.48.6 Cleanup: cross-reference validation

**Ref:** Stream 12 — R-07, R-10, R-11, R-12, R-13

### 8.49 Deferred Items — Marketplace, A/B Testing, NL Policies [XL] `task/8.49-deferred`

> Depends on: 8.42, 8.44

- [ ] 8.49.1 Implement IF-02 agent marketplace concept with package format
- [ ] 8.49.2 Implement IF-07 A/B testing framework for agents
- [ ] 8.49.3 Implement IF-09 natural language policy authoring compiler
- [ ] 8.49.4 Implement IF-10 governance compliance certification report generator
- [ ] 8.49.5 Implement X-12 contribution complexity analyzer
- [ ] 8.49.6 Implement X-18 accessibility audit for dashboard (WCAG 2.1 AA)
- [ ] 8.49.7 Write TV-09 academic paper outline with 8 sections
- [ ] 8.49.8 Cleanup: lint, shellcheck, docs

**Ref:** Stream 28 — IF-02, IF-07, IF-09, IF-10 | Stream 13 — X-12, X-18 | Stream 33 — TV-09

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

Phase 3: 3.1 ──→ 3.2
          3.4 ──→ 3.5, 3.6 ──→ 3.7
          3.8 ──→ 3.9, 3.10-3.15 ──→ 3.16
          3.4 + 3.16 ──→ 3.17 ──→ 3.18 ──→ 3.19
          3.17 + 3.21 ──→ 3.22 ──→ 3.23
          3.17 + 3.18 ──→ 3.24
          3.4 + 3.17 ──→ 3.25 ──→ 3.26
          3.8 + 3.10 ──→ 3.21 ──→ 3.27
          3.28 (parallel)

Phase 4: 4.1 ──→ 4.2 ──→ 4.3 ──→ 4.4
          4.3 ──→ 4.5, 4.6 ──→ 4.7 ──→ 4.8, 4.12
          4.7 ──→ 4.9 ──→ 4.10 ──→ 4.11
          4.12 ──→ 4.13, 4.14, 4.15 ──→ 4.16

Phase 5: 5.1 ──→ 5.2
          5.3 ──→ 5.4
          5.5 ──→ 5.6
          5.7 ──→ 5.8 ──→ 5.9 ──→ 5.10
          5.3 ──→ 5.11 ──→ 5.12 ──→ 5.13, 5.14
          5.11 + 5.14 ──→ 5.15

Phase 6: 6.1 ──→ 6.2, 6.3, 6.4, 6.7 ──→ 6.8
          6.2 + 6.3 ──→ 6.5
          6.2 + 6.3 + 6.4 ──→ 6.6
          6.9 ──→ 6.10, 6.11 ──→ 6.12
          6.9 + 6.10 + 6.11 ──→ 6.13
          6.14, 6.15, 6.16, 6.17 (parallel)
          6.14 + 6.7 ──→ 6.18

Phase 7: 7.1 ──→ 7.2 ──→ 7.3 ──→ 7.4
          7.1 + 7.2 ──→ 7.5 ──→ 7.6
          7.7 ──→ 7.8 ──→ 7.9
          7.7 + 7.8 ──→ 7.10
          7.11 ──→ 7.12 ──→ 7.13, 7.14

Phase 8: 8.1-8.5 (parallel) ──→ 8.6
          8.7 ──→ 8.8 ──→ 8.9, 8.10 ──→ 8.11, 8.12
          8.13 ──→ 8.14, 8.15 ──→ 8.16 ──→ 8.17
          8.18 ──→ 8.19
          8.22 ──→ 8.23 ──→ 8.24, 8.25
          8.29 ──→ 8.34
          8.42 ──→ 8.43
          8.46 + 8.47 ──→ 8.48
          8.42 + 8.44 ──→ 8.49
```

### Phase Gate Criteria

| Phase | Gate |
|-------|------|
| 0 → 1 | Ground Truth templates validated, readiness tool runs, spec debt inventory complete |
| 1 → 2 | ≥80% test coverage, all hooks use shared libs, `make setup` works |
| 2 → 3 | Events flow bidirectionally, CI gates green, scanner runs daily |
| 3 → 4 | Fleet standup works, 71+ agents defined, routing dispatches, handoffs validated |
| 4 → 5 | Brain B1 operational, B2 SQLite with FTS, knowledge graph links entries |
| 5 → 6 | Quality gates enforce, autonomy tiers promote/demote, governance API serves |
| 6 → 7 | MCP servers work with auth, ≥4 adapters pass shared suite, 30 ATK scenarios pass |
| 7 → 8 | Observability pipeline works, context profiles manage budget, quality pipeline gates CI |

### Summary

| Phase | Tasks | Streams Covered |
|-------|-------|-----------------|
| 0 — Foundation | 11 | 0, 21 |
| 1 — Code Quality | 9 | 1, 2, 4, 26 |
| 2 — Architecture | 10 | 3, 5, 6, 27 |
| 3 — Fleet | 28 | 7, 14, 15, 26 |
| 4 — Brain | 16 | 11, 20 |
| 5 — Governance | 15 | 8, 18, 23 |
| 6 — Platform | 18 | 16, 17, 24 |
| 7 — Advanced | 14 | 25, 30, 31 |
| 8 — Strategic | 49 | 9, 10, 12, 13, 19, 22, 28, 29, 32, 33 |
| **Total** | **170** | **All 34 streams** |
