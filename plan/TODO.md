# TODO — Admiral Framework Implementation

> Structured as Phase/Task/Subtask hierarchy for systematic execution.
> See `plan/index.md` for the full roadmap and stream details.

## Legend

| Level | Format | Git Workflow | Approval |
|-------|--------|-------------|----------|
| **Phase (X)** | Epic | Slush branch → PR to `main` | Requires Admiral (human) approval |
| **Task (X.Y)** | Chunk of work | Branch off phase → PR to phase branch | No human approval needed |
| **Subtask (X.Y.Z)** | Single commit | Commit on task branch | No PR needed |

### Conventions
- Each Task's **first subtask** is TDD (write tests first) wherever applicable
- Each Task's **last subtask** is "Run test suite, linters, cleanup, pass CI"
- Each Phase's **last task** is a full integration verification
- Original stream item IDs (ST-01, T-01, etc.) are preserved for traceability
- Dependencies are noted inline where relevant

---

## Phase 1: Strategy Foundation & Spec Debt
**Slush branch:** `slush/phase-1-strategy-foundation`
**PR:** → `main` (requires Admiral approval)

### Definition of Done
- [ ] Ground Truth templates (Mission, Boundaries, Success Criteria) exist in machine-readable YAML/JSON with JSON Schema validation
- [ ] Project readiness assessment tool outputs Ready/Partially Ready/Not Ready with detailed breakdown
- [ ] Go/No-Go gate blocks fleet deployment without complete Strategy Triangle
- [ ] Spec debt inventory is complete with every gap classified as blocking, constraining, or cosmetic
- [ ] Standing Orders enforcement map documents enforcement mechanisms for all 16 SOs
- [ ] Hook manifest audit cross-references spec-defined hooks against actual implementations
- [ ] Unit tests exist for trace, ingest, instrumentation, and events modules with >=80% branch coverage
- [ ] Shared jq helpers library exists and all hooks use it (no inconsistent jq patterns)
- [ ] Hook error handling is standardized across all 13 hooks via shared functions
- [ ] Coverage threshold gate is active in CI and fails on regression
- [ ] ADMIRAL_STYLE.md, CODE_OF_CONDUCT.md, and LICENSE exist at repo root
- [ ] All CI checks pass on the slush branch

### Task 1.1: Ground Truth Templates and Schema
**Branch:** `task/1.1-ground-truth-templates` → PR to `slush/phase-1-strategy-foundation`

- [ ] 1.1.1: Write tests for Ground Truth template validation — schema validation, required field checks, empty field detection, blank document generation (TDD)
- [ ] 1.1.2: Create machine-readable templates for Mission, Boundaries, and Success Criteria in YAML (ST-01)
- [ ] 1.1.3: Create `ground-truth.schema.json` with all spec-defined fields (Project Identity, Success State, Stakeholders, Current Phase, Pipeline Entry, Non-Goals, Hard Constraints, Resource Budgets, Quality Floor, LLM-Last, Functional/Quality/Completeness/Negative/Failure/Judgment Boundaries) (ST-01)
- [ ] 1.1.4: Build `generate_ground_truth.sh` CLI to generate a blank Ground Truth document from templates (ST-01)
- [ ] 1.1.5: Build Ground Truth validator that confirms filled-in documents have no empty required fields (ST-01)
- [ ] 1.1.6: Create LLM-Last boundary enforcement template and validation script (ST-07; depends on 1.1.2)
- [ ] 1.1.7: Create Boundaries checklist validator — reports present, empty, and missing categories; distinguishes "intentionally N/A" from "not addressed" (ST-08; depends on 1.1.2)
- [ ] 1.1.8: Run test suite, linters, cleanup, pass CI

### Task 1.2: Readiness Assessment and Go/No-Go Gate
**Branch:** `task/1.2-readiness-gate` → PR to `slush/phase-1-strategy-foundation`

- [ ] 1.2.1: Write tests for readiness assessment and Go/No-Go gate — test Ready, Partially Ready, Not Ready states with various Ground Truth completeness levels (TDD)
- [ ] 1.2.2: Build `readiness_assess.sh` — accepts project root and Ground Truth document path, checks Ground Truth completeness (via Task 1.1 validator), CI config existence, test suite existence, linter config, documented conventions (ST-02; depends on Task 1.1)
- [ ] 1.2.3: Build `go_no_go_gate.sh` — runs readiness assessment, exits non-zero on "Not Ready", permits only Starter profile for "Partially Ready", supports Admiral override with recorded justification in `override_log.jsonl` (ST-03; depends on 1.2.2)
- [ ] 1.2.4: Run test suite, linters, cleanup, pass CI

### Task 1.3: Task-Level Strategy Templates
**Branch:** `task/1.3-task-strategy` → PR to `slush/phase-1-strategy-foundation`

- [ ] 1.3.1: Write tests for task acceptance criteria validation — required fields, missing fields rejection, judgment boundaries field (TDD)
- [ ] 1.3.2: Create task acceptance criteria template in YAML/JSON with all required fields: functional criteria, quality criteria, completeness criteria, negative criteria, verification level, failure guidance, judgment boundaries (ST-04; depends on Task 1.1)
- [ ] 1.3.3: Build `validate_task_criteria.sh` — rejects tasks submitted without criteria, lists missing fields (ST-04)
- [ ] 1.3.4: Build `spec_first_gate.sh` — validates Pipeline entry field from Ground Truth, verifies upstream pipeline stage documents exist (ST-05; depends on Task 1.1)
- [ ] 1.3.5: Run test suite, linters, cleanup, pass CI

### Task 1.4: Spec Debt Inventory and Prioritization
**Branch:** `task/1.4-spec-debt-inventory` → PR to `slush/phase-1-strategy-foundation`

- [ ] 1.4.1: TDD does not apply — this task produces analysis documents, not code
- [ ] 1.4.2: Audit `spec-debt.md` and `spec-gaps.md` comprehensively; document each gap with spec section, nature, downstream impact, resolution path (SD-01)
- [ ] 1.4.3: Cross-reference spec debt inventory against all plan streams; classify each gap as blocking, constraining, or cosmetic; produce prioritized resolution queue (SD-02; depends on 1.4.2)
- [ ] 1.4.4: Run test suite, linters, cleanup, pass CI

### Task 1.5: Enforcement Map and Hook Manifest Audit
**Branch:** `task/1.5-enforcement-map` → PR to `slush/phase-1-strategy-foundation`

- [ ] 1.5.1: TDD does not apply — this task produces audit documents, not code
- [ ] 1.5.2: Complete Standing Orders enforcement map — for each advisory-only SO, define a proposed hook or document why SO is inherently advisory with alternative monitoring; address SO-14 critical gap specifically (SD-04)
- [ ] 1.5.3: Audit all spec-referenced hooks against actual manifests and implementations; identify missing manifests, orphan manifests, and propose new manifest content (SD-05)
- [ ] 1.5.4: Run test suite, linters, cleanup, pass CI

### Task 1.6: Unit Tests for Untested Modules
**Branch:** `task/1.6-untested-module-tests` → PR to `slush/phase-1-strategy-foundation`

- [ ] 1.6.1: Write `trace.test.ts` — test `buildTrace()`, `buildAgentTrace()`, `renderAscii()`, `getStats()` with nested hierarchies, empty streams, single-event streams; target >=80% branch coverage (T-01; TDD)
- [ ] 1.6.2: Write `ingest.test.ts` — test `ingestNewLines()`, `start()`/`stop()`, `getStats()` with valid JSONL, malformed lines, missing file, file growth, offset tracking; target >=80% branch coverage (T-02; TDD)
- [ ] 1.6.3: Write `instrumentation.test.ts` — test all public methods, edge cases (null agents, missing fields); target >=90% branch coverage (T-03; TDD)
- [ ] 1.6.4: Write `events.test.ts` — test ID generation, listener lifecycle, eviction, filters, counters, event ordering, listener cleanup; target >=90% branch coverage (T-04; TDD)
- [ ] 1.6.5: Run test suite, linters, cleanup, pass CI

### Task 1.7: Hook Standardization
**Branch:** `task/1.7-hook-standardization` → PR to `slush/phase-1-strategy-foundation`

- [ ] 1.7.1: Write tests for shared jq helpers — test `jq_get_field()`, `jq_set_field()`, `jq_array_append()`, `jq_validate()` with valid and invalid inputs (TDD)
- [ ] 1.7.2: Create `admiral/lib/jq_helpers.sh` with shared jq functions; refactor all hooks to use shared helpers (Q-01)
- [ ] 1.7.3: Write tests for shared hook error handling functions — test `hook_log()`, `hook_fail_soft()`, `hook_fail_hard()`, `hook_pass()` (TDD)
- [ ] 1.7.4: Create `admiral/lib/hook_utils.sh` with standardized error handling; refactor all 13 hooks to use shared functions (Q-02; depends on 1.7.2)
- [ ] 1.7.5: Run test suite, linters, cleanup, pass CI

### Task 1.8: Coverage Enforcement
**Branch:** `task/1.8-coverage-enforcement` → PR to `slush/phase-1-strategy-foundation`

- [ ] 1.8.1: Write test verifying that CI coverage gate correctly fails on regression (TDD)
- [ ] 1.8.2: Add coverage threshold gate to CI — parse `--experimental-test-coverage` output, fail below configurable threshold, document threshold in CONTRIBUTING.md (T-09, C-01; depends on Task 1.6)
- [ ] 1.8.3: Run test suite, linters, cleanup, pass CI

### Task 1.9: Documentation Quick Wins
**Branch:** `task/1.9-docs-quick-wins` → PR to `slush/phase-1-strategy-foundation`

- [ ] 1.9.1: TDD does not apply — documentation-only task
- [ ] 1.9.2: Create ADMIRAL_STYLE.md — naming conventions, error handling patterns, jq patterns, exit code taxonomy, comment standards, testing requirements, commit format; reference from CONTRIBUTING.md and AGENTS.md (D-01)
- [ ] 1.9.3: Add CODE_OF_CONDUCT.md — Contributor Covenant v2.1; reference from CONTRIBUTING.md (D-02)
- [ ] 1.9.4: Add LICENSE file — MIT license at repo root with correct year and holder (D-03)
- [ ] 1.9.5: Run test suite, linters, cleanup, pass CI

### Task 1.10: Phase 1 Integration Check
**Branch:** `task/1.10-phase1-integration` → PR to `slush/phase-1-strategy-foundation`

- [ ] 1.10.1: Run full test suite (TypeScript + bash hooks), linters (Biome, ShellCheck), cleanup, pass CI pipeline
- [ ] 1.10.2: Verify coverage threshold gate is active and passing
- [ ] 1.10.3: Verify all Ground Truth templates, validators, and gates function end-to-end
- [ ] 1.10.4: Verify spec debt inventory and enforcement map are complete and internally consistent

---

## Phase 2: Codebase Quality & Self-Enforcement
**Slush branch:** `slush/phase-2-codebase-quality`
**PR:** → `main` (requires Admiral approval)

### Definition of Done
- [ ] Spec amendment proposals exist for all active spec gaps in standard format
- [ ] Reference constants are audited with implementation status (implemented/missing/divergent)
- [ ] Spec compliance tests exist for at least one test per spec part (Parts 1-12)
- [ ] Spec version tracking manifest maps implementation components to target spec versions
- [ ] TypeScript uses `crypto.randomUUID()` for event IDs, typed error hierarchy exists, strict null checks enabled
- [ ] JSON schema validation exists for hook payloads and session state
- [ ] Bash dependency checker runs in CI
- [ ] CI runs on ubuntu + macOS matrix with CodeQL security scanning
- [ ] Self-enforcement hooks validate test discipline, documentation discipline, and pre-commit standards
- [ ] Deduplication detection reports in CI on every PR
- [ ] All CI checks pass on the slush branch

### Task 2.1: Spec Amendment Proposals
**Branch:** `task/2.1-spec-amendments` → PR to `slush/phase-2-codebase-quality`

- [ ] 2.1.1: TDD does not apply — this task produces proposal documents, not code
- [ ] 2.1.2: Create formal spec amendment proposals for each active gap — standard format with Gap ID, affected section, current text, proposed text, rationale, impact assessment (SD-03; depends on Tasks 1.4, 1.5)
- [ ] 2.1.3: Run test suite, linters, cleanup, pass CI

### Task 2.2: Reference Constants and Version Tracking
**Branch:** `task/2.2-constants-versioning` → PR to `slush/phase-2-codebase-quality`

- [ ] 2.2.1: Write tests for reference constants registry — verify constants load correctly, detect divergent values, flag missing constants (TDD)
- [ ] 2.2.2: Audit `reference-constants.md` against codebase; document implementation status for each constant; create `admiral/config/reference_constants.sh` constants registry (SD-06)
- [ ] 2.2.3: Create spec version tracking manifest mapping implementation components to target spec versions; flag where implementation lags behind current spec (SD-07)
- [ ] 2.2.4: Create spec changelog bridge document — maps spec versions to implementation status, computes "spec freshness" score (SD-09; depends on 2.2.3)
- [ ] 2.2.5: Run test suite, linters, cleanup, pass CI

### Task 2.3: Spec Compliance Testing
**Branch:** `task/2.3-spec-compliance` → PR to `slush/phase-2-codebase-quality`

- [ ] 2.3.1: Write spec compliance tests for Standing Orders enforcement, reference constants, Brain schema, and protocol formats (TDD; SD-08; depends on Tasks 2.2)
- [ ] 2.3.2: Create `admiral/tests/spec_compliance/` directory with at least one compliance test per spec part (Parts 1-12)
- [ ] 2.3.3: Integrate compliance tests into CI; compute compliance score (tests passing / total)
- [ ] 2.3.4: Run test suite, linters, cleanup, pass CI

### Task 2.4: Spec Gap Proposals
**Branch:** `task/2.4-spec-gap-proposals` → PR to `slush/phase-2-codebase-quality`

- [ ] 2.4.1: TDD does not apply — this task produces proposal documents, not code
- [ ] 2.4.2: Write fleet orchestration protocol spec gap proposal — agent selection, unavailability handling, task assignment format, dependency tracking, Orchestrator context management (SD-10; depends on Task 1.4)
- [ ] 2.4.3: Write Brain graduation automation spec gap proposal — initiation, reversibility, migration process, migration availability, dry-run mode (SD-11; depends on Task 1.4)
- [ ] 2.4.4: Write cross-platform hook normalization spec gap proposal — canonical hook interface, platform limitations, payload normalization, cross-platform testing, platform-specific hooks (SD-12; depends on Task 1.4)
- [ ] 2.4.5: Run test suite, linters, cleanup, pass CI

### Task 2.5: TypeScript Quality Improvements
**Branch:** `task/2.5-typescript-quality` → PR to `slush/phase-2-codebase-quality`

- [ ] 2.5.1: Write tests for new event ID format (`evt_<uuid>`) and typed error hierarchy (TDD)
- [ ] 2.5.2: Replace `Date.now()` event IDs with `crypto.randomUUID()`; update all existing tests (Q-05)
- [ ] 2.5.3: Create `control-plane/src/errors.ts` with AdmiralError base class plus NotFoundError, ValidationError, StateCorruptionError, IngestionError; replace all `err instanceof Error ? err.message : String(err)` patterns (Q-06)
- [ ] 2.5.4: Improve `server.ts` URL routing — replace manual `url.split("/")` with declarative route table; eliminate `agentId !== "resume"` guard (Q-08)
- [ ] 2.5.5: Run test suite, linters, cleanup, pass CI

### Task 2.6: Schema Validation
**Branch:** `task/2.6-schema-validation` → PR to `slush/phase-2-codebase-quality`

- [ ] 2.6.1: Write tests for hook payload schema validation and session state schema validation — valid payloads, invalid payloads (fail-open per ADR-004), malformed JSON (TDD)
- [ ] 2.6.2: Define JSON schemas for hook I/O in `admiral/schemas/`; create `admiral/lib/schema_validate.sh` validation function; apply to adapters (A-01)
- [ ] 2.6.3: Create `admiral/schemas/session_state.schema.json`; validate session_state.json at every write; catch malformed state writes (A-06; depends on 2.6.2)
- [ ] 2.6.4: Create `admiral/bin/check_deps` — check for jq >= 1.6, sha256sum/shasum, uuidgen, date, flock, shellcheck; run in CI (A-04)
- [ ] 2.6.5: Run test suite, linters, cleanup, pass CI

### Task 2.7: CI Matrix Builds and Security Scanning
**Branch:** `task/2.7-ci-matrix-security` → PR to `slush/phase-2-codebase-quality`

- [ ] 2.7.1: TDD does not apply — CI configuration task
- [ ] 2.7.2: Add matrix CI builds — run TypeScript tests and hook tests on ubuntu + macOS; fix platform-specific failures (C-02)
- [ ] 2.7.3: Add CodeQL security scanning workflow — TypeScript + bash analysis on PRs and weekly schedule; block on high/critical findings (C-03)
- [ ] 2.7.4: Run test suite, linters, cleanup, pass CI

### Task 2.8: Self-Enforcement Hooks
**Branch:** `task/2.8-self-enforcement` → PR to `slush/phase-2-codebase-quality`

- [ ] 2.8.1: Write tests for test discipline check, doc discipline check, and pre-commit validation extensions (TDD)
- [ ] 2.8.2: Add CI check requiring test additions for `fix:` commits — warn on `fix:` commit with no test file changes (P-01)
- [ ] 2.8.3: Add CI validation for documentation presence — module-level doc comments in `.ts` files, header comments in `.hooks/*.sh`, ADR template compliance (P-02)
- [ ] 2.8.4: Extend `.githooks/pre-commit` to validate AGENTS.md format, ADR template compliance, Standing Order format; keep < 5 seconds by scoping to staged files only (P-05)
- [ ] 2.8.5: Run test suite, linters, cleanup, pass CI

### Task 2.9: Deduplication and Plan Validation
**Branch:** `task/2.9-dedup-plan-validation` → PR to `slush/phase-2-codebase-quality`

- [ ] 2.9.1: Write tests for deduplication detection script and plan validation script (TDD)
- [ ] 2.9.2: Add deduplication detection in CI — track duplication percentage, warn on PRs exceeding 15% threshold, report top-5 duplicated fragments (P-06)
- [ ] 2.9.3: Add plan auto-validation in CI — verify `plan/index.md` item counts match stream files, no orphaned task references, no duplicate task IDs (P-08)
- [ ] 2.9.4: Run test suite, linters, cleanup, pass CI

### Task 2.10: Phase 2 Integration Check
**Branch:** `task/2.10-phase2-integration` → PR to `slush/phase-2-codebase-quality`

- [ ] 2.10.1: Run full test suite (TypeScript + bash hooks), linters (Biome, ShellCheck), cleanup, pass CI pipeline
- [ ] 2.10.2: Verify CI matrix passes on both ubuntu and macOS
- [ ] 2.10.3: Verify CodeQL scanning produces no high/critical findings
- [ ] 2.10.4: Verify spec compliance tests pass with documented compliance score
- [ ] 2.10.5: Verify self-enforcement hooks correctly flag violations on intentionally broken test inputs

---

## Phase 3: Critical Spec Implementation
**Slush branch:** `slush/phase-3-spec-implementation`
**PR:** → `main` (requires Admiral approval)

### Definition of Done
- [ ] All 4 missing hooks (identity_validation, tier_validation, governance_heartbeat_monitor, protocol_registry_guard) are implemented and tested
- [ ] Standing Orders enforcement map document exists with complete mapping of all 16 SOs
- [ ] Handoff protocol implemented with JSON schema validation and audit logging
- [ ] Escalation pipeline implements all 5 spec-defined steps
- [ ] At least 6 Standing Order enforcement hooks from Stream 29 are implemented and tested
- [ ] Standing Orders enforcement completeness report generates and runs in CI
- [ ] Inline "why" comments exist for all non-obvious hook logic
- [ ] Hook troubleshooting guide covers all 13+ hooks
- [ ] ADRs exist for hook payload schema, event ID generation, and Standing Orders enforcement tiers
- [ ] All CI checks pass on the slush branch

### Task 3.1: Missing Hooks — Identity and Tier Validation
**Branch:** `task/3.1-missing-hooks-identity` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.1.1: Write tests for identity_validation.sh and tier_validation.sh — valid identities, invalid identities, tier mismatches, critical mismatches (TDD)
- [ ] 3.1.2: Implement `identity_validation.sh` — SessionStart hook validating agent identity fields (ID, role, tier) against registry; block invalid identities with exit code 2 (S-01)
- [ ] 3.1.3: Implement `tier_validation.sh` — validate model tier assignment against agent role requirements; warn on mismatch, block critical mismatches (S-02)
- [ ] 3.1.4: Run test suite, linters, cleanup, pass CI

### Task 3.2: Missing Hooks — Governance and Protocol
**Branch:** `task/3.2-missing-hooks-governance` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.2.1: Write tests for governance_heartbeat_monitor.sh and protocol_registry_guard.sh — heartbeat detection, missing heartbeat alerts, MCP server registry enforcement, unauthorized server blocking (TDD)
- [ ] 3.2.2: Implement `governance_heartbeat_monitor.sh` — check heartbeat signals on configurable interval, alert on missing heartbeat after threshold (S-03)
- [ ] 3.2.3: Implement `protocol_registry_guard.sh` — validate protocol changes against SO-16 rules, maintain approved MCP server registry, hard-block calls to unregistered servers (S-04)
- [ ] 3.2.4: Run test suite, linters, cleanup, pass CI

### Task 3.3: Standing Orders Enforcement Map
**Branch:** `task/3.3-enforcement-map` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.3.1: TDD does not apply — documentation/mapping task
- [ ] 3.3.2: Create `admiral/docs/standing-orders-enforcement-map.md` with complete mapping of all 16 SOs — enforcement type (hook/instruction/guidance), responsible files, enforcement gaps (S-05)
- [ ] 3.3.3: Run test suite, linters, cleanup, pass CI

### Task 3.4: Handoff Protocol
**Branch:** `task/3.4-handoff-protocol` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.4.1: Write tests for handoff schema validation — valid handoffs, incomplete handoffs (missing required fields), handoff history logging (TDD)
- [ ] 3.4.2: Define handoff JSON schema in `admiral/handoff/schema.json` (S-10)
- [ ] 3.4.3: Implement `admiral/handoff/validate.sh` — validate handoffs against schema, reject incomplete handoffs with specific errors, log handoff history for audit (S-10)
- [ ] 3.4.4: Run test suite, linters, cleanup, pass CI

### Task 3.5: Escalation Pipeline
**Branch:** `task/3.5-escalation-pipeline` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.5.1: Write tests for all 5 escalation steps — intake classification, Brain precedent query, resolution path ranking, Admiral decision recording, outcome persistence (TDD)
- [ ] 3.5.2: Implement `admiral/escalation/intake.sh` — classify issue by type and severity (S-11)
- [ ] 3.5.3: Implement `admiral/escalation/resolve.sh` — query Brain for precedent, generate ranked candidate solutions (S-11)
- [ ] 3.5.4: Implement `admiral/escalation/pipeline.sh` — orchestrate all 5 steps sequentially, record decision with authority level, persist outcome as precedent (S-11)
- [ ] 3.5.5: Run test suite, linters, cleanup, pass CI

### Task 3.6: Standing Orders Enforcement — Identity, Scope, and Communication
**Branch:** `task/3.6-so-enforcement-identity-scope` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.6.1: Write tests for identity validation hook, scope boundary hard-blocking, and output routing validation (TDD)
- [ ] 3.6.2: Implement identity discipline enforcement hook — validate agent identity consistency, detect role drift patterns (SO-01)
- [ ] 3.6.3: Enhance `scope_boundary_guard.sh` to hard-block out-of-scope modifications; add "Does NOT Do" list violation detection; support `ADMIRAL_SCOPE_OVERRIDE` for Escalate-tier (SO-03)
- [ ] 3.6.4: Implement output routing validator — validate every agent output has a declared destination, hold-and-prompt on missing routing, flag invalid recipients (SO-02)
- [ ] 3.6.5: Implement communication format validator — validate inter-agent communications follow SO-09 structured format (AGENT, TASK, STATUS, OUTPUT, ASSUMPTIONS, ROUTING SUGGESTIONS, OUTPUT GOES TO); exempt direct tool outputs (SO-09)
- [ ] 3.6.6: Run test suite, linters, cleanup, pass CI

### Task 3.7: Standing Orders Enforcement — Authority, Recovery, and Checkpointing
**Branch:** `task/3.7-so-enforcement-authority-recovery` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.7.1: Write tests for decision authority validation, recovery ladder enforcement, checkpoint interval enforcement (TDD)
- [ ] 3.7.2: Implement decision authority validator — classify actions by authority tier, block Propose-tier actions without proposals, block Escalate-tier actions without Admiral approval (SO-05)
- [ ] 3.7.3: Implement recovery ladder enforcer — track recovery progression per failure, detect identical retries, prevent ladder step skipping, validate escalation reports for recovery attempt evidence (SO-06)
- [ ] 3.7.4: Implement checkpoint enforcer — track tool uses and elapsed time since last checkpoint, pause agent when checkpoint overdue, validate checkpoint content for required fields (SO-07)
- [ ] 3.7.5: Run test suite, linters, cleanup, pass CI

### Task 3.8: Standing Orders Enforcement — Quality and Pre-Work Validation
**Branch:** `task/3.8-so-enforcement-quality` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.8.1: Write tests for quality standards enforcement, prohibitions edge cases, and pre-work validation enhancements (TDD)
- [ ] 3.8.2: Implement quality standards enforcer — block task completion when quality gates not run or failing, cross-reference tool use trace for check execution evidence (SO-08)
- [ ] 3.8.3: Harden prohibitions hook against edge cases — encoded secrets, split-across-lines patterns, indirect file modification, self-approval, budget continuation; add regression tests from attack corpus (SO-10)
- [ ] 3.8.4: Enhance `pre_work_validator.sh` — reject vague success criteria, verify budget presence, confirm scope boundaries, enforce hard decision front-loading for Propose/Escalate-tier decisions (SO-15)
- [ ] 3.8.5: Run test suite, linters, cleanup, pass CI

### Task 3.9: Standing Orders Enforcement Completeness Report
**Branch:** `task/3.9-so-completeness-report` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.9.1: Write tests for enforcement completeness report — verify report correctly maps SOs to mechanisms, calculates coverage percentage, identifies gaps (TDD)
- [ ] 3.9.2: Implement `admiral/reports/standing_orders_coverage.sh` — map each SO to enforcement mechanism(s), report enforcement type (hard-block/soft-warning/advisory-only/none), calculate coverage percentage, identify gaps with remediation recommendations (SO-17)
- [ ] 3.9.3: Integrate report into CI; produce both human-readable summary and machine-parseable JSON output
- [ ] 3.9.4: Run test suite, linters, cleanup, pass CI

### Task 3.10: Documentation — Inline Comments and ADRs
**Branch:** `task/3.10-docs-inline-adrs` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.10.1: TDD does not apply — documentation-only task
- [ ] 3.10.2: Add inline "why" comments to all 13+ hooks — regex patterns, thresholds, state mutations, exit code decisions, jq filters; magic numbers must reference sources (D-04)
- [ ] 3.10.3: Create ADR for hook payload schema — JSON over stdin/stdout rationale, fail-open on malformed payloads, schema evolution strategy (D-06)
- [ ] 3.10.4: Create ADR for event ID generation — UUID vs timestamp+counter vs ULID trade-offs (D-07)
- [ ] 3.10.5: Create ADR for Standing Orders enforcement tiers — hook-enforced vs advisory vs guidance-only, rationale for each tier assignment (D-12)
- [ ] 3.10.6: Run test suite, linters, cleanup, pass CI

### Task 3.11: Documentation — Operational Guides
**Branch:** `task/3.11-docs-operational` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.11.1: TDD does not apply — documentation-only task
- [ ] 3.11.2: Create hook troubleshooting guide — all 13+ hooks with failure modes, debugging steps, command-line examples for isolated testing (D-09)
- [ ] 3.11.3: Add usage examples to templates — purpose, when to use, example invocation, expected output for each template (D-05)
- [ ] 3.11.4: Run test suite, linters, cleanup, pass CI

### Task 3.12: Phase 3 Integration Check
**Branch:** `task/3.12-phase3-integration` → PR to `slush/phase-3-spec-implementation`

- [ ] 3.12.1: Run full test suite (TypeScript + bash hooks), linters (Biome, ShellCheck), cleanup, pass CI pipeline
- [ ] 3.12.2: Verify all 4 missing hooks (S-01 through S-04) are implemented and passing tests
- [ ] 3.12.3: Verify handoff protocol and escalation pipeline function end-to-end
- [ ] 3.12.4: Verify Standing Orders enforcement completeness report shows measurable improvement over Phase 1 baseline
- [ ] 3.12.5: Verify all new ADRs follow template format (Status, Context, Decision, Consequences)
## Phase 4: Fleet & Orchestration
**Slush branch:** `slush/phase-4-fleet-orchestration`
**PR:** → `main` (requires Admiral approval)

### Definition of Done
- [ ] All 71 core agent roles have machine-readable definitions that pass schema validation
- [ ] Agent definition JSON Schema enforces required fields, tool list disjointness, and model tier validity
- [ ] Agent capability registry is generated from definitions and queryable by the Orchestrator
- [ ] Routing engine resolves task-type, file-ownership, and capability-match strategies with constraint enforcement
- [ ] Model tier validation hook rejects sessions with insufficient tier assignments
- [ ] Context injection pipeline assembles three-layer context stack with budget enforcement
- [ ] Handoff protocol produces validated, schema-conformant handoff documents between agents
- [ ] Multi-agent pipeline executes a 3+ step sequential pipeline end-to-end with validated handoffs
- [ ] Fleet health monitoring collects per-agent metrics and fires classified alerts
- [ ] All new code has tests; CI passes on all platforms

### Task 4.1: Agent Definition Schema & Tooling
**Branch:** `task/4.1-agent-schema-tooling` → PR to `slush/phase-4-fleet-orchestration`

- [ ] 4.1.1: Write tests for agent schema validation — JSON Schema compliance, tool list disjointness, tier validity (TDD) (F-12a)
- [ ] 4.1.2: Create agent definition JSON Schema with all required sections: Identity, Authority, Constraints, Tool Registry, Model Tier, Context Injection, Interface Contracts, File Ownership (F-12a)
- [ ] 4.1.3: Implement agent definition validator as CI check — schema compliance, routing table consistency, interface contract completeness (F-12b)
- [ ] 4.1.4: Create agent definition template generator — scaffolds md + json from name and category (F-14)
- [ ] 4.1.5: Run test suite, linters, cleanup, pass CI

### Task 4.2: Command Layer Agent Definitions
**Branch:** `task/4.2-command-agents` → PR to `slush/phase-4-fleet-orchestration`

- [ ] 4.2.1: Write validation tests for command agent definitions against schema (TDD) (F-01)
- [ ] 4.2.2: Create Orchestrator agent definition — Identity, Authority tiers, routing logic, decomposition rules, Tier 1 Flagship (F-01a)
- [ ] 4.2.3: Create Triage Agent definition — classification taxonomy, priority levels, Tier 3 Utility (F-01b)
- [ ] 4.2.4: Create Mediator agent definition — conflict detection, resolution strategies, Tier 1 Flagship (F-01c)
- [ ] 4.2.5: Create Context Curator agent definition — context assembly algorithm, budget allocation, Tier 2 Workhorse (F-01d)
- [ ] 4.2.6: Run test suite, linters, cleanup, pass CI

### Task 4.3: Engineering Agent Definitions
**Branch:** `task/4.3-engineering-agents` → PR to `slush/phase-4-fleet-orchestration`

- [ ] 4.3.1: Write validation tests for engineering agent definitions against schema (TDD) (F-02)
- [ ] 4.3.2: Create backend engineering agent definitions — Backend Implementer, API Designer, Database Agent, Integration Agent, Queue & Messaging, Cache Strategist (F-02a)
- [ ] 4.3.3: Create frontend engineering agent definitions — Frontend Implementer, Interaction Designer, Accessibility Auditor, Responsive Layout, State Management, Design Systems (F-02b)
- [ ] 4.3.4: Create cross-cutting agent definitions — Refactoring Agent, Dependency Manager, Technical Writer, Diagram Agent (F-02c)
- [ ] 4.3.5: Create infrastructure agent definitions — DevOps, Infrastructure, Containerization, Observability agents with restricted deployment authority (F-02d)
- [ ] 4.3.6: Run test suite, linters, cleanup, pass CI

### Task 4.4: Quality, Governance & Specialist Agent Definitions
**Branch:** `task/4.4-specialist-agents` → PR to `slush/phase-4-fleet-orchestration`

- [ ] 4.4.1: Write validation tests for quality, governance, and specialist agent definitions against schema (TDD) (F-03, F-04, F-05, F-06)
- [ ] 4.4.2: Create quality agent definitions — QA Agent (never self-reviews), Unit Test Writer, E2E Test Writer, Performance Tester, Chaos Agent, Regression Guardian (F-03)
- [ ] 4.4.3: Create governance agent definitions — Token Budgeter, Drift Monitor, Hallucination Auditor, Bias Sentinel, Loop Breaker, Context Health Monitor, Contradiction Detector (F-04)
- [ ] 4.4.4: Create lifecycle agent definitions — Release Orchestrator, Incident Response (Tier 1), Feature Flag Strategist, Migration Agent (F-05)
- [ ] 4.4.5: Create security agent definitions — Security Auditor (Blocked degradation), Penetration Tester, Compliance Agent, Privacy Agent (F-06)
- [ ] 4.4.6: Run test suite, linters, cleanup, pass CI

### Task 4.5: Scale, Meta, Extended & Ecosystem Agent Definitions
**Branch:** `task/4.5-extended-agents` → PR to `slush/phase-4-fleet-orchestration`

- [ ] 4.5.1: Write validation tests for scale, meta, and extended agent definitions against schema (TDD) (F-07, F-08, F-09, F-10, F-11)
- [ ] 4.5.2: Create scale agent definitions — all 12 scale agents with common output schema, Tier 1 Flagship (F-07)
- [ ] 4.5.3: Create meta agent definitions — Pattern Enforcer, Dependency Sentinel, Role Crystallizer, Devil's Advocate, Red Team, Simulated User, Persona Agent, UX Researcher, SEO Crawler (F-08)
- [ ] 4.5.4: Create data agent definitions (extended) — Data Engineer, Analytics Implementer, ML Engineer, Data Validator, Visualization Agent (F-09)
- [ ] 4.5.5: Create domain specialization agent definitions (extended) — Auth & Identity, Payment & Billing, Search & Relevance, Real-time Systems, Media Processing, Notification, i18n, SDK/DX, Monorepo Coordinator (F-10)
- [ ] 4.5.6: Create remaining ecosystem agent definitions and produce 100% coverage report (F-11)
- [ ] 4.5.7: Run test suite, linters, cleanup, pass CI

### Task 4.6: Agent Capability Registry
**Branch:** `task/4.6-capability-registry` → PR to `slush/phase-4-fleet-orchestration`
**Depends on:** Tasks 4.1-4.5 (F-12a, F-12b, F-01 through F-11)

- [ ] 4.6.1: Write tests for registry generation and querying — capability lookup, completeness, regeneration (TDD) (F-13)
- [ ] 4.6.2: Implement registry generation script that produces consolidated JSON from all agent definitions (F-13)
- [ ] 4.6.3: Verify registry includes all 71+ core agents and 34 extended agents; auto-regenerates on definition changes (F-13)
- [ ] 4.6.4: Run test suite, linters, cleanup, pass CI

### Task 4.7: Routing Rules Engine
**Branch:** `task/4.7-routing-engine` → PR to `slush/phase-4-fleet-orchestration`
**Depends on:** Task 4.6 (F-13 capability registry)

- [ ] 4.7.1: Write tests for routing engine — all 86 routing rules, constraint enforcement, fallback chains (TDD) (O-01a)
- [ ] 4.7.2: Implement task-type routing — parse routing table, resolve primary/fallback agents, enforce "Does NOT Do" and self-review constraints (O-01a)
- [ ] 4.7.3: Implement file-ownership routing — configurable ownership patterns, multi-owner decomposition signals (O-01b)
- [ ] 4.7.4: Implement capability-matching routing — ranked candidates with confidence scores, low-confidence escalation (O-01c)
- [ ] 4.7.5: Implement file ownership conflict resolution — decompose, primary/reviewer, or escalate strategies (O-08)
- [ ] 4.7.6: Run test suite, linters, cleanup, pass CI

### Task 4.8: Model Tier Enforcement
**Branch:** `task/4.8-model-tier-enforcement` → PR to `slush/phase-4-fleet-orchestration`

- [ ] 4.8.1: Write tests for tier validation hook and degradation engine — valid tier, too-low tier, retry, fallback, blocking (TDD) (O-02a, O-02b)
- [ ] 4.8.2: Implement SessionStart tier_validation hook — reject sessions where model does not meet minimum tier (O-02a)
- [ ] 4.8.3: Implement degradation policy engine — exponential backoff retry, per-agent Degraded/Blocked policies, no cascading degradation (O-02b)
- [ ] 4.8.4: Implement tier promotion/demotion tracking — quality rates, rework costs, recommendations persisted to Brain (O-02c)
- [ ] 4.8.5: Run test suite, linters, cleanup, pass CI

### Task 4.9: Context Injection Pipeline
**Branch:** `task/4.9-context-injection` → PR to `slush/phase-4-fleet-orchestration`

- [ ] 4.9.1: Write tests for context assembly — layer ordering, budget enforcement, sufficiency checks (TDD) (O-03a)
- [ ] 4.9.2: Implement three-layer context assembly — Fleet (Layer 1), Project (Layer 2), Task (Layer 3) with prompt anatomy ordering (O-03a)
- [ ] 4.9.3: Implement category-specific context checklists — engineering, quality, security, governance checklists validated at session start (O-03b)
- [ ] 4.9.4: Implement progressive disclosure via skills — lazy loading on file pattern/keyword triggers (O-03c)
- [ ] 4.9.5: Run test suite, linters, cleanup, pass CI

### Task 4.10: Handoff Protocol & Multi-Agent Pipelines
**Branch:** `task/4.10-handoff-pipelines` → PR to `slush/phase-4-fleet-orchestration`
**Depends on:** Task 4.7 (O-01 routing engine)

- [ ] 4.10.1: Write tests for handoff validation and protocol — contract enforcement, round-trip serialization, pipeline execution (TDD) (O-04, O-05a, O-05b)
- [ ] 4.10.2: Implement handoff contract validation — check payloads against interface contracts, reject violations, track repeated failures (O-04)
- [ ] 4.10.3: Implement handoff protocol — context transfer, state serialization, metadata extension point, schema v1 (O-05a)
- [ ] 4.10.4: Implement multi-agent pipeline orchestration — sequential pipelines, step tracking, failure handling (retry/skip/abort) (O-05b)
- [ ] 4.10.5: Run test suite, linters, cleanup, pass CI

### Task 4.11: Fleet Health, Scaling & Lifecycle
**Branch:** `task/4.11-fleet-health-scaling` → PR to `slush/phase-4-fleet-orchestration`
**Depends on:** Task 4.9 (O-03a context assembly for warm-up)

- [ ] 4.11.1: Write tests for fleet health monitoring, scaling policies, and warm-up/cool-down (TDD) (O-06, O-09, O-10)
- [ ] 4.11.2: Implement fleet health monitoring — per-agent metrics, fleet aggregates, classified alerts with deduplication (O-06)
- [ ] 4.11.3: Implement task decomposition engine — subtask generation with agent assignment, detect artificial splits (O-07)
- [ ] 4.11.4: Implement fleet scaling policies — queue depth, utilization, wait-time triggers with cooldown and fleet size limits (O-09)
- [ ] 4.11.5: Implement agent warm-up and cool-down — context pre-loading, idle release, re-activation (O-10)
- [ ] 4.11.6: Run test suite, linters, cleanup, pass CI

### Task 4.12: Phase 4 Integration Check
**Branch:** `task/4.12-phase4-integration` → PR to `slush/phase-4-fleet-orchestration`

- [ ] 4.12.1: Integration test: end-to-end task flow — task submission → routing → context injection → agent execution → handoff → QA review (no TDD — integration-level verification)
- [ ] 4.12.2: Verify all agent definitions pass schema validation in CI
- [ ] 4.12.3: Verify capability registry is complete and routing table references no undefined agents
- [ ] 4.12.4: Run full test suite, linters, cleanup, pass CI pipeline

---

## Phase 5: Robustness & Security Hardening
**Slush branch:** `slush/phase-5-security-hardening`
**PR:** → `main` (requires Admiral approval)

### Definition of Done
- [ ] Attack corpus test runner executes all 30 ATK scenarios and produces structured reports
- [ ] Injection detection layers (pattern-based, structural, input boundary validation) are operational
- [ ] Privilege escalation is blocked — agents cannot self-escalate authority tiers or invoke unauthorized tools
- [ ] Secret scanning prevents API keys, tokens, and passwords from being stored in the Brain
- [ ] Audit trail has tamper detection via hash chain with startup verification
- [ ] SBOM generation produces valid CycloneDX/SPDX document in CI
- [ ] Data sensitivity layers (pattern-based PII, database-level rejection) are operational
- [ ] Security audit trail captures all enforcement events from all hooks
- [ ] Rate limiting protects control plane API from denial-of-service
- [ ] Security regression test suite runs in CI and blocks merges on failure
- [ ] Platform adapter interface is defined and Claude Code adapter refactored to implement it

### Task 5.1: Attack Corpus Expansion & Automation
**Branch:** `task/5.1-attack-corpus` → PR to `slush/phase-5-security-hardening`

- [ ] 5.1.1: Write tests for attack corpus runner — scenario iteration, report generation, metadata updates (TDD) (SEC-01)
- [ ] 5.1.2: Create ATK-0019 through ATK-0030 entries from MCP-SECURITY-ANALYSIS.md Section 8 templates (SEC-01)
- [ ] 5.1.3: Build attack corpus test runner — iterates all 30 scenarios, verifies defenses activate, produces structured JSON report (SEC-01)
- [ ] 5.1.4: Create security regression test framework with at least 5 seed tests derived from attack corpus (SEC-10)
- [ ] 5.1.5: Add security regression tests to CI — block merges on failure (SEC-10)
- [ ] 5.1.6: Run test suite, linters, cleanup, pass CI

### Task 5.2: Injection Defense Layers
**Branch:** `task/5.2-injection-defense` → PR to `slush/phase-5-security-hardening`

- [ ] 5.2.1: Write tests for injection detection — ATK-0008/0011/0012 patterns, false positive rates, structural validation (TDD) (SEC-02, SEC-03, SEC-12)
- [ ] 5.2.2: Implement Layer 1 pattern-based input sanitization — imperative overrides, authority claims, SO manipulation, role reassignment; < 10ms latency (SEC-02)
- [ ] 5.2.3: Implement Layer 2 structural validation — JSON schema validation for handoffs, brain entries, hook payloads; encoding normalization for base64/Unicode bypass (SEC-03)
- [ ] 5.2.4: Implement input boundary validation — max input sizes, character set constraints, null byte blocking at all external interfaces (SEC-12)
- [ ] 5.2.5: Extend `zero_trust_validator.sh` to scan ALL tool responses, not just WebFetch/WebSearch; CRITICAL severity for MCP-sourced injection (SEC-13)
- [ ] 5.2.6: Run test suite, linters, cleanup, pass CI

### Task 5.3: Privilege Escalation Hardening & Secret Scanning
**Branch:** `task/5.3-privilege-secrets` → PR to `slush/phase-5-security-hardening`

- [ ] 5.3.1: Write tests for privilege checks and secret scanning — ATK-0003 defense, tool allowlist enforcement, secret pattern detection (TDD) (SEC-04, SEC-05)
- [ ] 5.3.2: Implement privilege escalation hardening — block authority tier self-modification, tool invocation outside allowlist, identity token forging (SEC-04)
- [ ] 5.3.3: Implement secret scanning for brain entries — API keys, JWTs, PEM keys, connection strings; quarantine detected secrets; < 2% false positive rate (SEC-05)
- [ ] 5.3.4: Run test suite, linters, cleanup, pass CI

### Task 5.4: Data Sensitivity & PII Detection
**Branch:** `task/5.4-data-sensitivity` → PR to `slush/phase-5-security-hardening`

- [ ] 5.4.1: Write tests for PII detection layers — OWASP PII patterns, database triggers, false positive rates (TDD) (S-20, S-21)
- [ ] 5.4.2: Implement Layer 1 pattern-based PII detection — email, SSN, credit card, API keys, JWT tokens; sanitization report; < 5% false positive rate (S-20)
- [ ] 5.4.3: Implement Layer 2 database-level PII rejection triggers for B2/B3 Brain tables (S-21)
- [ ] 5.4.4: Run test suite, linters, cleanup, pass CI

### Task 5.5: Security Audit Trail & Tamper Detection
**Branch:** `task/5.5-audit-trail` → PR to `slush/phase-5-security-hardening`

- [ ] 5.5.1: Write tests for audit trail — event capture from all hooks, hash chain integrity, tamper detection (TDD) (S-22, SEC-06)
- [ ] 5.5.2: Implement security audit trail — persistent log of all security events from prohibitions_enforcer, zero_trust_validator, sanitizer, and database triggers (S-22)
- [ ] 5.5.3: Implement audit trail hash chain — SHA-256 prev_hash per entry, startup validation, chain checkpoints, tamper alerts (SEC-06)
- [ ] 5.5.4: Write security incident response playbook — detection, containment, investigation, remediation, post-mortem for 4 critical scenarios (SEC-07)
- [ ] 5.5.5: Run test suite, linters, cleanup, pass CI

### Task 5.6: Supply Chain Security & Infrastructure
**Branch:** `task/5.6-supply-chain` → PR to `slush/phase-5-security-hardening`

- [ ] 5.6.1: Write tests for rate limiter — token bucket algorithm, per-endpoint limits, 429 responses (TDD) (SEC-11)
- [ ] 5.6.2: Add dependency vulnerability scanning to CI — `npm audit` or equivalent; block on critical/high; daily scheduled scan (SEC-08)
- [ ] 5.6.3: Implement SBOM generation — CycloneDX/SPDX format covering npm and system dependencies; CI artifact (SEC-09)
- [ ] 5.6.4: Implement rate limiting for control plane API — per-endpoint token bucket, configurable limits, 429 with Retry-After (SEC-11)
- [ ] 5.6.5: Run test suite, linters, cleanup, pass CI

### Task 5.7: Platform Adapter Interface & Cascade Containment
**Branch:** `task/5.7-adapter-circuit-breaker` → PR to `slush/phase-5-security-hardening`

- [ ] 5.7.1: Write tests for adapter interface contract and circuit breaker containment (TDD) (S-18, SEC-14)
- [ ] 5.7.2: Define generic platform adapter interface — session lifecycle, hook dispatch, tool permission check, event emission methods (S-18)
- [ ] 5.7.3: Refactor Claude Code adapter to implement the generic interface, proving it is sufficient (S-18)
- [ ] 5.7.4: Implement cascade containment circuit breakers — quarantine Brain entries from compromised MCP servers, suspend A2A connections, compute contamination graph (SEC-14). **Depends on:** SEC-01 (attack corpus), Stream 16 M-10 (behavioral baselining)
- [ ] 5.7.5: Run test suite, linters, cleanup, pass CI

### Task 5.8: Phase 5 Integration Check
**Branch:** `task/5.8-phase5-integration` → PR to `slush/phase-5-security-hardening`

- [ ] 5.8.1: Run full attack corpus (30 scenarios) and verify structured report generation
- [ ] 5.8.2: Verify all injection defense layers chain correctly — boundary validation → pattern matching → structural validation
- [ ] 5.8.3: Verify audit trail captures events end-to-end from all security hooks with intact hash chain
- [ ] 5.8.4: Run full test suite, linters, cleanup, pass CI pipeline

---

## Phase 6: Brain Knowledge System
**Slush branch:** `slush/phase-6-brain-system`
**PR:** → `main` (requires Admiral approval)

### Definition of Done
- [ ] B1 file-based brain is fully operational with automatic recording from hooks, retrieval in hooks, demand tracking, contradiction detection, and consolidation
- [ ] B1 has 20+ comprehensive tests covering all utilities and edge cases
- [ ] Graduation measurement system tracks hit rate, precision, reuse rate, and agent task completion improvement
- [ ] B2 SQLite brain has schema, FTS5 full-text search, and backward-compatible CLI interface
- [ ] B2 embedding generation and similarity search are operational with at least one backend
- [ ] B1-to-B2 migration is idempotent and preserves all metadata
- [ ] B3 MCP server scaffold exposes 8 tool endpoints
- [ ] B3 has identity tokens, access control, multi-signal retrieval, and knowledge graph traversal
- [ ] Provenance-aware writes tag entries with source classification and confidence levels
- [ ] Brain entry versioning, expiration, cross-project sharing, analytics, backup/restore, migration testing, and templates are complete
- [ ] Graduation dependency chain is respected: B1 complete → B2 starts → B2 complete → B3 starts

### Task 6.1: Brain B1 Comprehensive Tests
**Branch:** `task/6.1-brain-b1-tests` → PR to `slush/phase-6-brain-system`

- [ ] 6.1.1: Write comprehensive test suite for all B1 utilities — brain_query, brain_record, brain_retrieve, brain_audit; CRUD, edge cases (empty brain, special characters, long content), concurrent access (TDD) (B-06)
- [ ] 6.1.2: Verify all existing B1 functionality passes; identify gaps for B-01 through B-05
- [ ] 6.1.3: Run test suite, linters, cleanup, pass CI

### Task 6.2: Brain B1 Completion
**Branch:** `task/6.2-brain-b1-completion` → PR to `slush/phase-6-brain-system`
**Depends on:** Task 6.1 (tests written first)

- [ ] 6.2.1: Implement automatic brain entry creation from hooks — brain_writer.sh library called by prohibitions_enforcer, loop_detector, scope_boundary_guard (B-01)
- [ ] 6.2.2: Implement brain retrieval in hooks — brain_context_router actively queries Brain and injects matching entries as context (B-02)
- [ ] 6.2.3: Implement demand signal tracking — record failed queries to .brain/_demand/, expose via brain_audit --demand (B-03)
- [ ] 6.2.4: Implement contradiction scan on write — keyword overlap detection, warning with conflicting entry paths, non-blocking (B-04)
- [ ] 6.2.5: Implement brain entry consolidation — brain_consolidate utility, merge redundant entries with provenance, archive originals (B-05)
- [ ] 6.2.6: Extend test suite for new B1 features — brain_writer, brain_consolidate, demand signals, contradiction detection (B-06)
- [ ] 6.2.7: Run test suite, linters, cleanup, pass CI

### Task 6.3: Provenance-Aware Brain
**Branch:** `task/6.3-brain-provenance` → PR to `slush/phase-6-brain-system`
**Depends on:** Task 6.2 (B-01 B1 completion baseline)

- [ ] 6.3.1: Write tests for provenance fields — source_agent, source_type, source_server, confidence; propagation and filtering (TDD) (B-29)
- [ ] 6.3.2: Add provenance fields to brain_record — source classification (direct observation / MCP-derived / A2A / handoff), confidence defaults by source type (B-29)
- [ ] 6.3.3: Update brain queries to return provenance metadata; enable filtering/weighting by provenance trust (B-29)
- [ ] 6.3.4: Run test suite, linters, cleanup, pass CI

### Task 6.4: Graduation Measurement System
**Branch:** `task/6.4-graduation-metrics` → PR to `slush/phase-6-brain-system`
**Depends on:** Task 6.2 (B1 must be complete to measure)

- [ ] 6.4.1: Write tests for graduation metrics — hit rate, precision, entry count thresholds, dashboard endpoint (TDD) (B-21)
- [ ] 6.4.2: Implement per-session metric collection — hit rate (>=85%), precision (>=90%), entry count (>=50) for B1→B2 (B-21)
- [ ] 6.4.3: Implement B2→B3 graduation criteria — reuse rate (>=30%), agent task completion improvement (>=5%), semantic search precision (>=80%) (B-21)
- [ ] 6.4.4: Implement graduation dashboard endpoint in control plane with per-criterion pass/fail and 30-day trend data (B-21)
- [ ] 6.4.5: Run test suite, linters, cleanup, pass CI

### Task 6.5: Brain B2 Core — SQLite & Migration
**Branch:** `task/6.5-brain-b2-core` → PR to `slush/phase-6-brain-system`
**Depends on:** Task 6.2 (B1 complete), Task 6.4 (graduation metrics validate B1 readiness)

- [ ] 6.5.1: Write tests for B2 schema, migration, and query interface — table creation, FTS5, idempotent migration, backward-compatible CLI (TDD) (B-07, B-08, B-09)
- [ ] 6.5.2: Create SQLite schema — entries, links, embeddings, demand_signals tables with versioned migration system (B-07)
- [ ] 6.5.3: Implement B1-to-B2 entry migration — parse JSON, validate, insert, migrate demand signals; idempotent with report (B-08)
- [ ] 6.5.4: Implement SQLite-based query interface — FTS5 full-text search, date range/category/project filters, backward-compatible CLI (B-09)
- [ ] 6.5.5: Run test suite, linters, cleanup, pass CI

### Task 6.6: Brain B2 Semantic — Embeddings & Similarity
**Branch:** `task/6.6-brain-b2-semantic` → PR to `slush/phase-6-brain-system`
**Depends on:** Task 6.5 (B2 core schema and query interface)

- [ ] 6.6.1: Write tests for embedding generation and similarity search — backend pluggability, model versioning, blended ranking (TDD) (B-10, B-11)
- [ ] 6.6.2: Implement embedding generation pipeline — pluggable backends (API or pre-computed), model version tracking, re-embedding support (B-10)
- [ ] 6.6.3: Implement similarity search — cosine distance, `brain_query --semantic "topic"`, blend keyword and semantic signals (B-11)
- [ ] 6.6.4: Run test suite, linters, cleanup, pass CI

### Task 6.7: Brain B3 Scaffold — MCP Server & Storage
**Branch:** `task/6.7-brain-b3-scaffold` → PR to `slush/phase-6-brain-system`
**Depends on:** Task 6.6 (B2 complete), Task 6.4 (graduation metrics validate B2 readiness)

- [ ] 6.7.1: Write tests for MCP server scaffold — tool registration, request/response lifecycle, health check (TDD) (B-12)
- [ ] 6.7.2: Implement MCP server with 8 tool endpoints: brain_record, brain_query, brain_retrieve, brain_strengthen, brain_supersede, brain_status, brain_audit, brain_purge (B-12)
- [ ] 6.7.3: Implement Postgres + pgvector schema deployment — migrations, rollback, connection pooling (B-13)
- [ ] 6.7.4: Run test suite, linters, cleanup, pass CI

### Task 6.8: Brain B3 Identity & Access Control
**Branch:** `task/6.8-brain-b3-identity` → PR to `slush/phase-6-brain-system`
**Depends on:** Task 6.7 (B3 scaffold)

- [ ] 6.8.1: Write tests for identity tokens and access control — CRUD, expiry, rotation, revocation, clearance levels, audit logging (TDD) (B-14, B-15)
- [ ] 6.8.2: Implement identity token lifecycle — create, rotate, revoke; configurable TTL, overlapping validity for rotation, immediate revocation (B-14)
- [ ] 6.8.3: Implement access control enforcement — per-agent per-entry clearance, write scoping by project, admin restrictions, access decisions logged (B-15)
- [ ] 6.8.4: Run test suite, linters, cleanup, pass CI

### Task 6.9: Brain B3 Retrieval & Knowledge Graph
**Branch:** `task/6.9-brain-b3-retrieval` → PR to `slush/phase-6-brain-system`
**Depends on:** Task 6.7 (B3 scaffold)

- [ ] 6.9.1: Write tests for multi-signal retrieval and graph traversal — signal fusion, query-time selection, cycle detection, hop limits (TDD) (B-16, B-17)
- [ ] 6.9.2: Implement multi-signal retrieval pipeline — keyword (FTS), semantic (pgvector), temporal (recency), link-based (graph proximity); configurable weights and query-time signal selection (B-16)
- [ ] 6.9.3: Implement multi-hop link traversal — supports/contradicts/supersedes/related_to relationships, configurable depth, cycle detection, traversal path in results (B-17)
- [ ] 6.9.4: Run test suite, linters, cleanup, pass CI

### Task 6.10: Brain B3 Quarantine, Sensitivity & Audit
**Branch:** `task/6.10-brain-b3-compliance` → PR to `slush/phase-6-brain-system`
**Depends on:** Task 6.7 (B3 scaffold)

- [ ] 6.10.1: Write tests for quarantine integration, sensitivity classification, and audit logging (TDD) (B-18, B-19, B-20)
- [ ] 6.10.2: Implement quarantine integration — external content passes 5-layer pipeline before brain ingestion, quarantine_status metadata (B-18)
- [ ] 6.10.3: Implement sensitivity classification — public/internal/confidential/restricted levels, queries filter by agent clearance, bulk reclassification (B-19)
- [ ] 6.10.4: Implement brain audit logging — append-only log of all operations, queryable by time/agent/operation/entry, configurable retention (B-20)
- [ ] 6.10.5: Run test suite, linters, cleanup, pass CI

### Task 6.11: Brain Excellence
**Branch:** `task/6.11-brain-excellence` → PR to `slush/phase-6-brain-system`

- [ ] 6.11.1: Write tests for versioning, expiration, sharing, analytics, backup, and templates (TDD) (B-22 through B-28)
- [ ] 6.11.2: Implement brain entry versioning — supersession chain tracking, rollback support (B-22)
- [ ] 6.11.3: Implement brain entry expiration — optional TTL, auto-archive, pre-expiry warnings (B-23)
- [ ] 6.11.4: Implement cross-project knowledge sharing — shareable entries with permissions, provenance maintained (B-24)
- [ ] 6.11.5: Implement brain usage analytics — per-entry usage tracking, analytics endpoint, gap detection (B-25)
- [ ] 6.11.6: Implement brain backup and restore — scheduled backups, point-in-time recovery, integrity verification (B-26)
- [ ] 6.11.7: Implement brain schema migration testing — B1→B2→B3 migrations, metadata preservation, edge cases (B-27)
- [ ] 6.11.8: Create brain entry templates — 5+ templates for common types, --template flag, validation (B-28)
- [ ] 6.11.9: Run test suite, linters, cleanup, pass CI

### Task 6.12: Phase 6 Integration Check
**Branch:** `task/6.12-phase6-integration` → PR to `slush/phase-6-brain-system`

- [ ] 6.12.1: End-to-end test: hook event → automatic brain entry → query retrieval → context injection in subsequent agent session
- [ ] 6.12.2: Verify graduation metrics dashboard shows accurate B1 and B2 readiness scores
- [ ] 6.12.3: Verify provenance chain: MCP-sourced data → agent brain write → provenance metadata → query weighting
- [ ] 6.12.4: Verify B1→B2→B3 migration path preserves all entries, metadata, and demand signals
- [ ] 6.12.5: Run full test suite, linters, cleanup, pass CI pipeline

---

## Phase 7: MCP Integration & Platform Adapters
**Slush branch:** `slush/phase-7-mcp-platform`
**PR:** → `main` (requires Admiral approval)

### Definition of Done
- [ ] MCP server starts, accepts connections via stdio and HTTP+SSE, and serves tool discovery
- [ ] All Brain MCP tools (query, record, retrieve, strengthen, audit, purge) are operational
- [ ] Fleet and Governance MCP tools return structured responses
- [ ] Zero-trust identity tokens are issued, validated, and revocable
- [ ] Role-based access control enforces per-tool permissions
- [ ] MCP test Levels 1-5 pass in CI
- [ ] MCP client SDK connects via both transports with typed tool wrappers
- [ ] MCP server health endpoint and usage metrics are operational
- [ ] Behavioral baselining, trust decay, manifest snapshots, hash verification, and canary operations are active
- [ ] Platform adapter interface is defined with full TypeScript types
- [ ] Claude Code adapter refactored to implement adapter interface with no behavior change
- [ ] At least one additional adapter (API-direct) passes the shared test suite
- [ ] Platform capability matrix documents feature coverage per platform

### Task 7.1: MCP Server Foundation
**Branch:** `task/7.1-mcp-server-foundation` → PR to `slush/phase-7-mcp-platform`

- [ ] 7.1.1: Write tests for MCP server startup, connection, and tool discovery (TDD) (M-01a)
- [ ] 7.1.2: Implement core MCP server with stdio and HTTP+SSE transports (M-01a)
- [ ] 7.1.3: Implement MCP server configuration system with per-tool enable/disable and agent-to-tool mappings (M-01b)
- [ ] 7.1.4: Implement MCP server health endpoint and usage metrics collection (M-09)
- [ ] 7.1.5: Run test suite, linters, cleanup, pass CI

### Task 7.2: Brain MCP Tools
**Branch:** `task/7.2-brain-mcp-tools` → PR to `slush/phase-7-mcp-platform`

- [ ] 7.2.1: Write tests for brain_query and brain_record tools (TDD) (M-02a, M-02b)
- [ ] 7.2.2: Implement brain_query tool with keyword matching at B1 and optional filters (M-02a)
- [ ] 7.2.3: Implement brain_record tool with required field enforcement and duplicate detection (M-02b)
- [ ] 7.2.4: Write tests for brain_retrieve and brain_strengthen tools (TDD) (M-02c)
- [ ] 7.2.5: Implement brain_retrieve with link traversal and brain_strengthen with usefulness scoring (M-02c)
- [ ] 7.2.6: Write tests for brain_audit and brain_purge tools (TDD) (M-02d)
- [ ] 7.2.7: Implement brain_audit and brain_purge with Admiral-only RBAC enforcement (M-02d)
- [ ] 7.2.8: Run test suite, linters, cleanup, pass CI

### Task 7.3: Fleet & Governance MCP Tools
**Branch:** `task/7.3-fleet-governance-mcp-tools` → PR to `slush/phase-7-mcp-platform`

- [ ] 7.3.1: Write tests for fleet_status and agent_registry tools (TDD) (M-03a, M-03b)
- [ ] 7.3.2: Implement fleet_status tool returning fleet state with filtering (M-03a)
- [ ] 7.3.3: Implement agent_registry query tool with capability matching (M-03b; depends on Stream 14 F-13)
- [ ] 7.3.4: Implement task_route tool with read-only routing recommendations (M-03c; depends on Stream 15 O-01)
- [ ] 7.3.5: Write tests for governance tools (TDD) (M-04a, M-04b, M-04c)
- [ ] 7.3.6: Implement standing_order_status tool (M-04a)
- [ ] 7.3.7: Implement compliance_check tool with Standing Order validation (M-04b)
- [ ] 7.3.8: Implement escalation_file tool with structured escalation records (M-04c)
- [ ] 7.3.9: Run test suite, linters, cleanup, pass CI

### Task 7.4: MCP Authentication, Authorization & Schemas
**Branch:** `task/7.4-mcp-auth-schemas` → PR to `slush/phase-7-mcp-platform`

- [ ] 7.4.1: Write tests for identity token issuance, validation, expiration, and revocation (TDD) (M-05a)
- [ ] 7.4.2: Implement zero-trust identity token system with cryptographic signing and epoch-based fleet revocation (M-05a)
- [ ] 7.4.3: Write tests for RBAC middleware with authorized and unauthorized callers per tool (TDD) (M-05b)
- [ ] 7.4.4: Implement role-based access control middleware enforcing per-tool permissions (M-05b; depends on M-05a)
- [ ] 7.4.5: Create JSON Schema definitions for all MCP tool inputs, outputs, and errors with versioning (M-06)
- [ ] 7.4.6: Run test suite, linters, cleanup, pass CI

### Task 7.5: MCP Testing & Client SDK
**Branch:** `task/7.5-mcp-testing-sdk` → PR to `slush/phase-7-mcp-platform`

- [ ] 7.5.1: Write Level 1 connection validation and Level 2 permission boundary tests (M-07a)
- [ ] 7.5.2: Write Level 3 identity/access control and Level 4 full lifecycle integration tests (M-07b; depends on M-05a, M-02a-c)
- [ ] 7.5.3: Write Level 5 OWASP MCP Top 10 security tests — SSRF, injection, excessive permissions, egress monitoring (M-07c)
- [ ] 7.5.4: Write tests for MCP client SDK connection and tool invocation (TDD) (M-08)
- [ ] 7.5.5: Implement lightweight client SDK with both transports, auto token injection, typed errors, and retry logic (M-08)
- [ ] 7.5.6: Run test suite, linters, cleanup, pass CI

### Task 7.6: MCP Server Security
**Branch:** `task/7.6-mcp-server-security` → PR to `slush/phase-7-mcp-platform`

- [ ] 7.6.1: Write tests for behavioral baselining with synthetic anomaly data (TDD) (M-10)
- [ ] 7.6.2: Implement mcp_behavior_monitor PostToolUse hook with per-server, per-tool baselines and anomaly alerting (M-10; depends on M-01a, M-09)
- [ ] 7.6.3: Implement trust decay for MCP servers with scheduled re-verification and tool discovery diffing (M-11; depends on M-01b)
- [ ] 7.6.4: Implement tool manifest snapshot capture and runtime comparison with drift detection (M-12; depends on M-01a)
- [ ] 7.6.5: Implement version pinning with binary hash verification blocking startup on mismatch (M-13)
- [ ] 7.6.6: Write tests for canary injection, verification, and egress detection (TDD) (M-14)
- [ ] 7.6.7: Implement canary operations framework with randomized injection and exfiltration detection (M-14; depends on M-10)
- [ ] 7.6.8: Run test suite, linters, cleanup, pass CI

### Task 7.7: Platform Adapter Interface & Claude Code Refactor
**Branch:** `task/7.7-platform-adapter-interface` → PR to `slush/phase-7-mcp-platform`

- [ ] 7.7.1: Write tests for adapter interface contract compliance (TDD) (PA-01)
- [ ] 7.7.2: Define abstract platform adapter interface covering lifecycle hooks, context injection, tool permissions, config loading, event emission, and subagent coordination (PA-01)
- [ ] 7.7.3: Extract all Claude Code-specific logic into adapter implementing the interface (PA-02a; depends on PA-01)
- [ ] 7.7.4: Write comprehensive Claude Code adapter tests verifying backward compatibility (PA-02b; depends on PA-02a)
- [ ] 7.7.5: Create shared adapter test suite exercising every interface method (PA-08; depends on PA-01, PA-02a)
- [ ] 7.7.6: Run test suite, linters, cleanup, pass CI

### Task 7.8: Additional Platform Adapters
**Branch:** `task/7.8-platform-adapters` → PR to `slush/phase-7-mcp-platform`

- [ ] 7.8.1: Write tests for API-direct adapter using shared test suite (TDD) (PA-05)
- [ ] 7.8.2: Implement headless API-direct adapter with programmatic lifecycle hooks and JSON-lines event emission (PA-05; depends on PA-01)
- [ ] 7.8.3: Implement Cursor IDE adapter translating to .cursorrules with gap analysis (PA-03; depends on PA-01)
- [ ] 7.8.4: Implement Windsurf adapter translating to .windsurfrules with gap analysis (PA-04; depends on PA-01)
- [ ] 7.8.5: Scaffold VS Code extension with fleet status sidebar and alert notifications (PA-06; depends on PA-01, M-01)
- [ ] 7.8.6: Implement platform-specific context injection strategies respecting per-platform size limits (PA-09; depends on PA-01)
- [ ] 7.8.7: Create platform capability matrix documenting feature coverage per adapter (PA-07; depends on PA-02a, PA-03, PA-04, PA-05, PA-06)
- [ ] 7.8.8: Run test suite, linters, cleanup, pass CI

### Task 7.9: Event-Driven & Scheduled Agent Patterns
**Branch:** `task/7.9-event-driven-agents` → PR to `slush/phase-7-mcp-platform`

- [ ] 7.9.1: Write tests for event-driven trigger patterns and authority narrowing (TDD) (PA-10, PA-11)
- [ ] 7.9.2: Implement event-driven agent framework with trigger conditions, context bootstrap, authority levels, and cost caps (PA-10)
- [ ] 7.9.3: Implement headless agent authority narrowing defaulting to Autonomous-1 tier, enforced by hook (PA-11)
- [ ] 7.9.4: Implement scheduled agent runner with cron-like scheduling and cost circuit breakers (PA-12)
- [ ] 7.9.5: Implement context bootstrap for headless agents — event payload, Ground Truth, Brain query, scope constraints (PA-13)
- [ ] 7.9.6: Run test suite, linters, cleanup, pass CI

### Task 7.10: Phase 7 Integration Verification
**Branch:** `task/7.10-phase-7-integration` → PR to `slush/phase-7-mcp-platform`

- [ ] 7.10.1: Run full MCP test Levels 1-5 against the complete MCP server with all tools
- [ ] 7.10.2: Verify Claude Code adapter passes shared test suite with no behavior regression
- [ ] 7.10.3: Verify API-direct adapter passes shared test suite end-to-end
- [ ] 7.10.4: Run full test suite, linters, cleanup, pass CI pipeline

---

## Phase 8: Governance, Autonomy & Data
**Slush branch:** `slush/phase-8-governance-autonomy-data`
**PR:** → `main` (requires Admiral approval)

### Definition of Done
- [ ] Governance agent framework supports instantiation of Sentinel, Arbiter, and Compliance Monitor
- [ ] Governance event bus supports pub/sub with durable storage for audit
- [ ] Governance rule engine evaluates threshold, pattern, temporal, and composite rules
- [ ] Intervention protocol implements warn/restrict/suspend/terminate escalation ladder
- [ ] Governance agents cannot modify their own configuration (hook-enforced)
- [ ] Trust level data model tracks per-agent, per-category stages 1-4
- [ ] Trust-based permission gating dynamically adjusts hook enforcement
- [ ] Trust persists across sessions via Brain storage with decay
- [ ] Knowledge graph links are navigable with multi-hop traversal
- [ ] Knowledge maintenance agents (gardener, curator, harvester) produce structured proposals
- [ ] Feedback loops connect code review and test outcomes to Brain entries
- [ ] Intent capture schema validates all six elements with progressive completion
- [ ] Intent decomposition produces task graphs with inherited constraints

### Task 8.1: Governance Agent Framework & Event Bus
**Branch:** `task/8.1-governance-framework` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.1.1: Write tests for governance event bus pub/sub, filtering, and durable storage (TDD) (MG-05)
- [ ] 8.1.2: Implement governance event bus with fleet events, governance findings, and intervention events (MG-05)
- [ ] 8.1.3: Write tests for governance agent base template — event subscription, finding emission, self-modification prohibition (TDD) (MG-01)
- [ ] 8.1.4: Implement governance agent framework with base class, finding report format, and intervention authority types (MG-01)
- [ ] 8.1.5: Run test suite, linters, cleanup, pass CI

### Task 8.2: Core Governance Agents
**Branch:** `task/8.2-core-governance-agents` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.2.1: Write tests for Sentinel detection of loops, budget anomalies, and scope drift (TDD) (MG-02)
- [ ] 8.2.2: Implement Sentinel agent with cross-session loop detection, budget burn rate monitoring, scope drift detection, and automatic intervention (MG-02; depends on MG-01, MG-05)
- [ ] 8.2.3: Write tests for Arbiter conflict detection and resolution strategies (TDD) (MG-03)
- [ ] 8.2.4: Implement Arbiter agent with precedence-based, evidence-based, and escalation resolution strategies (MG-03; depends on MG-01, MG-05)
- [ ] 8.2.5: Write tests for Compliance Monitor per-SO scoring across enforcement types (TDD) (MG-04)
- [ ] 8.2.6: Implement Compliance Monitor with mechanical, judgment-assisted, and advisory SO compliance checking (MG-04; depends on MG-01, MG-05)
- [ ] 8.2.7: Run test suite, linters, cleanup, pass CI

### Task 8.3: Governance Infrastructure
**Branch:** `task/8.3-governance-infrastructure` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.3.1: Write tests for governance rule engine — threshold, pattern, temporal, and composite rules (TDD) (MG-06)
- [ ] 8.3.2: Implement governance rule engine with declarative JSON/YAML rules and version-controlled rule changes (MG-06; depends on MG-05)
- [ ] 8.3.3: Write tests for intervention protocol escalation ladder including cooldown and reversal (TDD) (MG-07)
- [ ] 8.3.4: Implement governance intervention protocol — warn, restrict, suspend, terminate with entry criteria and audit records (MG-07; depends on MG-01, MG-05)
- [ ] 8.3.5: Implement governance agent self-governance — self-modification prohibition, intervention rate limits, meta-Sentinel, tamper-evident audit trail (MG-09; depends on MG-01, MG-02, MG-06)
- [ ] 8.3.6: Run test suite, linters, cleanup, pass CI

### Task 8.4: Governance Oversight, Multi-Operator & Metrics
**Branch:** `task/8.4-governance-oversight` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.4.1: Write tests for governance audit dashboard rendering (TDD) (MG-08)
- [ ] 8.4.2: Implement governance audit dashboard — active findings, intervention history, compliance scorecard, false positive tracking (MG-08; depends on MG-05, MG-07)
- [ ] 8.4.3: Implement governance metrics and KPIs — intervention rate, false positive rate, detection latency, resolution time, compliance trend, overhead (MG-10; depends on MG-05, MG-07)
- [ ] 8.4.4: Implement multi-operator governance with Owner/Operator/Observer roles and authority matrix (MG-11)
- [ ] 8.4.5: Implement operator handoff procedure — state export, acknowledgment, token revocation/renewal (MG-12)
- [ ] 8.4.6: Implement fallback decomposer mode — Admiral as temporary Orchestrator with macro-tasks, Tier 1 only, 5-minute limit (MG-13)
- [ ] 8.4.7: Run test suite, linters, cleanup, pass CI

### Task 8.5: Trust Model & Scoring
**Branch:** `task/8.5-trust-model` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.5.1: Write tests for trust level data model — stage-to-authority mapping for all stage/category combinations (TDD) (AU-01)
- [ ] 8.5.2: Implement trust level data model with four stages, per-agent per-category tracking, and transition history (AU-01)
- [ ] 8.5.3: Write tests for trust scoring — success, failure, partial outcomes with severity weighting (TDD) (AU-02)
- [ ] 8.5.4: Implement trust score calculation engine with category-specific scoring and trend history (AU-02; depends on AU-01)
- [ ] 8.5.5: Run test suite, linters, cleanup, pass CI

### Task 8.6: Trust Gating, Promotion & Demotion
**Branch:** `task/8.6-trust-gating` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.6.1: Write tests for trust-based permission gating showing same action at different stages (TDD) (AU-03)
- [ ] 8.6.2: Implement trust-based permission gating integrating with hook system for dynamic enforcement (AU-03; depends on AU-01, AU-02)
- [ ] 8.6.3: Write tests for trust demotion triggers — critical failure, quality drop, model change, security incident (TDD) (AU-04)
- [ ] 8.6.4: Implement automatic trust demotion with category-specific resets and fleet-wide reverts (AU-04; depends on AU-01, AU-02)
- [ ] 8.6.5: Write tests for trust promotion — graduation signal detection and prerequisite verification (TDD) (AU-05)
- [ ] 8.6.6: Implement trust promotion with operator approval, consecutive success tracking, and prerequisite checks (AU-05; depends on AU-01, AU-02)
- [ ] 8.6.7: Run test suite, linters, cleanup, pass CI

### Task 8.7: Trust Persistence, Override & Routing
**Branch:** `task/8.7-trust-persistence` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.7.1: Write tests for trust persistence — cross-session load/save and decay mechanics (TDD) (AU-06)
- [ ] 8.7.2: Implement trust persistence via Brain storage with immediate writes and 30-day inactivity decay (AU-06; depends on AU-01, M-02a, M-02b)
- [ ] 8.7.3: Implement human trust override with reason requirement, audit trail, and tiered override authority (AU-08; depends on AU-01, AU-06)
- [ ] 8.7.4: Implement trust-aware routing — minimum trust thresholds for sensitive tasks with escalation on no qualifying agent (AU-09; depends on AU-01, Stream 15 O-01)
- [ ] 8.7.5: Run test suite, linters, cleanup, pass CI

### Task 8.8: Trust Dashboard & Reporting
**Branch:** `task/8.8-trust-dashboard` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.8.1: Write tests for trust dashboard rendering with synthetic fleet data (TDD) (AU-07)
- [ ] 8.8.2: Implement trust dashboard — per-agent levels, trends, promotions/demotions, decay warnings, autonomy matrix (AU-07; depends on AU-01, AU-06)
- [ ] 8.8.3: Implement trust reporting — fleet-wide distribution, velocity, demotion frequency, cost correlation, override frequency (AU-10; depends on AU-01, AU-06, AU-07)
- [ ] 8.8.4: Run test suite, linters, cleanup, pass CI

### Task 8.9: Knowledge Graph & Maintenance Agents
**Branch:** `task/8.9-knowledge-graph` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.9.1: Write tests for knowledge graph link creation, bidirectional traversal, and multi-hop queries (TDD) (DE-01)
- [ ] 8.9.2: Implement knowledge graph with 6 link types, confidence scores, and entry_links table (DE-01)
- [ ] 8.9.3: Write tests for knowledge gardener — staleness, contradiction, duplicate, orphan, metadata detection (TDD) (DE-02)
- [ ] 8.9.4: Implement knowledge gardener agent with Propose-tier maintenance reports (DE-02; depends on DE-01)
- [ ] 8.9.5: Implement knowledge curator agent — metadata enrichment, format standardization, link suggestion, quality scoring (DE-03; depends on DE-01)
- [ ] 8.9.6: Write tests for knowledge harvester extraction from diffs, PRs, commits, and reviews (TDD) (DE-04)
- [ ] 8.9.7: Implement knowledge harvester with sensitive data filtering and source attribution (DE-04)
- [ ] 8.9.8: Run test suite, linters, cleanup, pass CI

### Task 8.10: Feedback Loops, Knowledge Quality & Access
**Branch:** `task/8.10-feedback-knowledge-access` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.10.1: Write tests for code review feedback loop — accept/reject strengthening/weakening (TDD) (DE-05)
- [ ] 8.10.2: Implement code review outcome feedback loop with entry strengthening/weakening and rejection tracking (DE-05; depends on DE-01)
- [ ] 8.10.3: Implement test result feedback loop with failure-driven lesson creation (DE-06; depends on DE-01)
- [ ] 8.10.4: Implement knowledge quality metrics — freshness, accuracy proxy, usage frequency, contradiction rate, coverage, link density (DE-07; depends on DE-01)
- [ ] 8.10.5: Implement cross-session knowledge transfer — session-end capture, session-start loading, repeat-failure prevention (DE-08)
- [ ] 8.10.6: Implement knowledge export/import with filtered subsets, PII stripping, and merge conflict resolution (DE-09; depends on DE-01)
- [ ] 8.10.7: Implement knowledge search REST API with semantic search, link traversal, health metrics, and rate limiting (DE-10; depends on DE-07)
- [ ] 8.10.8: Run test suite, linters, cleanup, pass CI

### Task 8.11: Intent Engineering
**Branch:** `task/8.11-intent-engineering` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.11.1: Write tests for intent capture schema validation and progressive completion (TDD) (IE-01)
- [ ] 8.11.2: Implement intent capture schema with six elements, authority-tier-based required fields, and text rendering (IE-01)
- [ ] 8.11.3: Implement intent validation — completeness, ambiguity detection, constraint consistency, achievability, scope estimation (IE-03; depends on IE-01)
- [ ] 8.11.4: Implement intent decomposition engine producing task graphs with inherited constraints and agent mapping (IE-02; depends on IE-01)
- [ ] 8.11.5: Implement intent tracking dashboard — active intents, sub-intent progress, health indicators, constraint violation alerts (IE-04; depends on IE-01, IE-02)
- [ ] 8.11.6: Implement intent-to-agent mapping with model tier selection, multi-agent coordination, and fallback routing (IE-05; depends on IE-01, IE-03)
- [ ] 8.11.7: Implement intent history and learning — outcome recording, pattern extraction, routing effectiveness, Brain integration (IE-06; depends on IE-01, IE-05)
- [ ] 8.11.8: Create 5 intent templates (bug fix, feature, refactoring, code review, security audit) passing validation (IE-07; depends on IE-01, IE-03)
- [ ] 8.11.9: Implement intent conflict detection — goal contradiction, constraint violation, resource contention, scope overlap, priority inversion (IE-08; depends on IE-01, IE-03)
- [ ] 8.11.10: Run test suite, linters, cleanup, pass CI

### Task 8.12: Phase 8 Integration Verification
**Branch:** `task/8.12-phase-8-integration` → PR to `slush/phase-8-governance-autonomy-data`

- [ ] 8.12.1: Verify governance agents detect and intervene on synthetic fleet event streams
- [ ] 8.12.2: Verify trust levels persist across simulated session boundaries
- [ ] 8.12.3: Verify knowledge graph traversal integrates with brain_query MCP tool
- [ ] 8.12.4: Run full test suite, linters, cleanup, pass CI pipeline

---

## Phase 9: Observability, DX & Quality
**Slush branch:** `slush/phase-9-observability-dx-quality`
**PR:** → `main` (requires Admiral approval)

### Definition of Done
- [ ] All hooks use structured JSON logging via log_structured
- [ ] Distributed tracing propagates correlation IDs across hooks, control plane, and brain
- [ ] Prometheus-compatible /metrics endpoint exposes all core benchmarks
- [ ] /health endpoint aggregates component health into a single status
- [ ] Alert routing delivers critical/high/medium/low alerts to configured channels
- [ ] SLO tracking calculates error budgets over 30-day rolling windows
- [ ] Dev container starts with all tools available and tests passing
- [ ] `make setup` produces a fully working development environment on macOS and Linux
- [ ] Scanner executes all 5 scan types and generates daily digests
- [ ] Context profiles track per-zone token allocation with hard limit enforcement
- [ ] Quality gate pipeline runs 6 stages with self-healing feedback loop
- [ ] Quality scores are calculated per module with regression prevention in CI
- [ ] Control plane dashboards (CP1-CP3) are progressively implemented

### Task 9.1: Structured Logging & Distributed Tracing
**Branch:** `task/9.1-logging-tracing` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.1.1: Write tests for structured log output format validation (TDD) (OB-01)
- [ ] 9.1.2: Implement log_structured function for hooks and structured logger for control plane with required fields (OB-01)
- [ ] 9.1.3: Replace all echo statements in hooks and console.log in control plane with structured logging (OB-01)
- [ ] 9.1.4: Write tests for trace propagation across hooks, control plane, and brain (TDD) (OB-02)
- [ ] 9.1.5: Implement distributed tracing with trace ID and span ID propagation, parent-child relationships, and trace reconstruction (OB-02; depends on OB-01)
- [ ] 9.1.6: Run test suite, linters, cleanup, pass CI

### Task 9.2: Metrics, Health & SLOs
**Branch:** `task/9.2-metrics-health-slos` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.2.1: Write tests for Prometheus metrics collection and /metrics endpoint (TDD) (OB-03)
- [ ] 9.2.2: Implement metrics collection — hook latency, pass/fail rate, event throughput, brain query latency, governance overhead (OB-03)
- [ ] 9.2.3: Write tests for health check aggregation with degraded components (TDD) (OB-04)
- [ ] 9.2.4: Implement /health endpoint aggregating hooks, control plane, brain, and event log health probes (OB-04)
- [ ] 9.2.5: Define SLIs for all 7 core benchmarks and implement SLO tracking with error budget alerting (OB-08; depends on OB-03)
- [ ] 9.2.6: Run test suite, linters, cleanup, pass CI

### Task 9.3: Alerting & Log Aggregation
**Branch:** `task/9.3-alerting-logs` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.3.1: Write tests for alert routing with deduplication, escalation, and suppression (TDD) (OB-05)
- [ ] 9.3.2: Implement alert routing rules by severity and component with webhook notification delivery (OB-05; depends on OB-03, OB-04)
- [ ] 9.3.3: Write tests for log aggregation query API — time range, component, level, correlation ID (TDD) (OB-06)
- [ ] 9.3.4: Implement centralized log aggregation with append-only storage, rotation, and query API (OB-06; depends on OB-01)
- [ ] 9.3.5: Run test suite, linters, cleanup, pass CI

### Task 9.4: Dashboard & Analysis
**Branch:** `task/9.4-dashboard-analysis` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.4.1: Write tests for dashboard data endpoints (TDD) (OB-07)
- [ ] 9.4.2: Enhance control plane dashboard with real-time event timeline, hook visualization, and brain query log (OB-07; depends on OB-03, OB-04)
- [ ] 9.4.3: Implement incident timeline reconstruction from session ID with anomaly flagging (OB-09; depends on OB-02, OB-06)
- [ ] 9.4.4: Implement performance regression detection in CI using statistical methods against baselines (OB-10; depends on OB-03)
- [ ] 9.4.5: Implement session thermal model — descriptive budgets, advisory warnings, no hard blocks at 100% (OB-15)
- [ ] 9.4.6: Run test suite, linters, cleanup, pass CI

### Task 9.5: Control Plane Progressive Implementation
**Branch:** `task/9.5-control-plane-cp1-cp3` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.5.1: Write tests for CP1 CLI dashboard event logging and terminal display (TDD) (OB-11)
- [ ] 9.5.2: Implement CP1 CLI dashboard — JSON-lines event logging, terminal status display, runaway detection (OB-11)
- [ ] 9.5.3: Implement CP2 Fleet Dashboard — fleet status, agent drill-down, task flow, 4-tier alert system (OB-12)
- [ ] 9.5.4: Implement CP3 Governance Dashboard — governance agent health, decision authority visualization, intervention trail (OB-13; depends on Stream 19 MG-01)
- [ ] 9.5.5: Write tests for intervention catalog actions (TDD) (OB-14)
- [ ] 9.5.6: Implement intervention catalog — 10 operator actions with confirmation, audit logging, and reversal paths (OB-14)
- [ ] 9.5.7: Run test suite, linters, cleanup, pass CI

### Task 9.6: Developer Environment Setup
**Branch:** `task/9.6-dev-environment` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.6.1: Implement one-command setup script checking dependencies, installing npm packages, linking git hooks, running tests (DX-02)
- [ ] 9.6.2: Create dev container configuration with all dependencies pre-installed and tests passing (DX-01; depends on DX-02)
- [ ] 9.6.3: Provide IDE configuration templates — VS Code settings, launch configs, recommended extensions (DX-08)
- [ ] 9.6.4: Implement hot reload for control plane with `make dev` target preserving state across restarts (DX-04)
- [ ] 9.6.5: Run test suite, linters, cleanup, pass CI

### Task 9.7: Developer Workflow Tooling
**Branch:** `task/9.7-dev-workflow` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.7.1: Write tests for hook development CLI — scaffold, test, validate commands (TDD) (DX-05)
- [ ] 9.7.2: Implement hook development CLI with scaffold template encoding best practices, test runner, and convention validator (DX-05)
- [ ] 9.7.3: Implement local CI runner via `make ci` with all checks, timing summary, and fail-fast/continue modes (DX-06)
- [ ] 9.7.4: Implement changelog automation from conventional commits with breaking change highlighting (DX-11)
- [ ] 9.7.5: Implement Pre-Flight Checklist tooling — 54 verification items across 5 profiles with structured pass/fail report (DX-13)
- [ ] 9.7.6: Run test suite, linters, cleanup, pass CI

### Task 9.8: Documentation & Onboarding
**Branch:** `task/9.8-docs-onboarding` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.8.1: Create interactive development guide with 6 step-by-step walkthroughs for common tasks (DX-03; depends on DX-02, DX-05). Note: TDD not applicable — documentation-only task.
- [ ] 9.8.2: Audit and improve all error messages across hooks, control plane, and CLI tools — 20+ improvements with before/after (DX-07)
- [ ] 9.8.3: Create debugging guide covering hooks, control plane, and brain queries with troubleshooting decision trees (DX-09)
- [ ] 9.8.4: Create working code examples for every API endpoint — copy-paste executable with error cases (DX-10)
- [ ] 9.8.5: Catalog and maintain 15+ good first issues with acceptance criteria and suggested approaches (DX-12; depends on DX-02, DX-06)
- [ ] 9.8.6: Run test suite, linters, cleanup, pass CI

### Task 9.9: Scanner Core & State Management
**Branch:** `task/9.9-scanner-core` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.9.1: Write tests for scanner state management — atomic updates, query functions, schema validation (TDD) (MON-04)
- [ ] 9.9.2: Implement scanner state management with per-source tracking, atomic updates, and schema-validated reads/writes (MON-04)
- [ ] 9.9.3: Implement handoff validation against v1.schema.json — schema conformance, field constraints, referential integrity (MON-10)
- [ ] 9.9.4: Write tests for scanner execution across all 5 scan types (TDD) (MON-01)
- [ ] 9.9.5: Implement scanner with full/models/patterns/releases/discover scan types, priority classification, and GitHub issue creation (MON-01; depends on MON-04)
- [ ] 9.9.6: Run test suite, linters, cleanup, pass CI

### Task 9.10: Scanner Reporting & Integration
**Branch:** `task/9.10-scanner-reporting` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.10.1: Implement daily digest generation combining external findings and codebase health metrics (MON-02; depends on MON-01)
- [ ] 9.10.2: Implement scan result history with append-only JSONL, query functions, and retention policy (MON-06; depends on MON-04)
- [ ] 9.10.3: Implement custom scan rules with JSON/YAML definitions, scaffold command, and 3 example rules (MON-05; depends on MON-01)
- [ ] 9.10.4: Implement weekly trend reports with direction indicators, deltas, and text-based visualizations (MON-03; depends on MON-02, MON-06)
- [ ] 9.10.5: Implement scanner CI integration running PR-relevant checks with annotations (MON-07; depends on MON-01, MON-05)
- [ ] 9.10.6: Implement scanner alert thresholds — failure rate, HIGH count, metric degradation, staleness (MON-08; depends on MON-01, MON-06)
- [ ] 9.10.7: Implement scanner dashboard integration in control plane — scan status, findings, history timeline (MON-09; depends on MON-02, MON-06)
- [ ] 9.10.8: Run test suite, linters, cleanup, pass CI

### Task 9.11: Context Engineering
**Branch:** `task/9.11-context-engineering` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.11.1: Write tests for context profile zones, token tracking, and 50K standing context hard limit (TDD) (CE-01)
- [ ] 9.11.2: Implement context profile with three zones, allocation tracking, and machine-parseable profile template (CE-01)
- [ ] 9.11.3: Implement context budget tracker comparing actual vs allocated usage with sacrifice order triggering (CE-02; depends on CE-01)
- [ ] 9.11.4: Write tests for context compression preserving identity and constraints (TDD) (CE-03)
- [ ] 9.11.5: Implement three compression strategies — summarization, prioritization, eviction with configurable sacrifice order (CE-03; depends on CE-01, CE-02)
- [ ] 9.11.6: Implement context relevance scoring across 5 dimensions — recency, frequency, semantic proximity, authority weight, dependency (CE-04; depends on CE-01)
- [ ] 9.11.7: Implement context injection ordering enforcing primacy/recency zones with section markers (CE-05; depends on CE-01)
- [ ] 9.11.8: Run test suite, linters, cleanup, pass CI

### Task 9.12: Context Lifecycle & Intelligence
**Branch:** `task/9.12-context-lifecycle` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.12.1: Write tests for context overflow handling at 80%/90%/95%/100% thresholds (TDD) (CE-07)
- [ ] 9.12.2: Implement context overflow handler with graduated response and mandatory logging of every compression action (CE-07; depends on CE-01, CE-02, CE-03)
- [ ] 9.12.3: Implement dynamic context allocation adjusting zone percentages based on task complexity (CE-08; depends on CE-01, CE-02)
- [ ] 9.12.4: Implement context window utilization dashboard with anomaly highlighting (CE-06; depends on CE-01, CE-02)
- [ ] 9.12.5: Implement predictive context preloading from file dependencies, Brain history, skill triggers, and interface contracts (CE-09; depends on CE-01, CE-04)
- [ ] 9.12.6: Implement context audit trail — snapshots at decision points, gap recording, compression/eviction history, source attribution (CE-10; depends on CE-01, CE-02)
- [ ] 9.12.7: Run test suite, linters, cleanup, pass CI

### Task 9.13: Quality Assurance Pipeline
**Branch:** `task/9.13-quality-pipeline` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.13.1: Write tests for automated code review across 6 check categories (TDD) (QA-01)
- [ ] 9.13.2: Implement automated code review — naming, complexity, test presence, import hygiene, documentation, file size with structured QA Issue Reports (QA-01)
- [ ] 9.13.3: Implement test generation framework producing skeletons for .ts and .sh files with edge case placeholders (QA-02)
- [ ] 9.13.4: Implement multi-stage quality gate pipeline — lint, type-check, test, coverage, security, review with self-healing loop (QA-03; depends on QA-01)
- [ ] 9.13.5: Implement quality metrics collection per module — complexity, coverage, churn, defect density, lint violations, test ratio (QA-04)
- [ ] 9.13.6: Run test suite, linters, cleanup, pass CI

### Task 9.14: Quality Intelligence & Regression Prevention
**Branch:** `task/9.14-quality-intelligence` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.14.1: Write tests for quality trend analysis with declining trend detection (TDD) (QA-05)
- [ ] 9.14.2: Implement quality trend analysis with moving averages, decline alerts, and commit-linked notifications (QA-05; depends on QA-04)
- [ ] 9.14.3: Implement technical debt tracker — TODO/FIXME scanning, complexity outliers, skipped tests, dependency vulnerabilities, duplication (QA-06; depends on QA-04)
- [ ] 9.14.4: Implement code complexity budget with per-module limits, complexity credits, and ratchet enforcement (QA-07; depends on QA-04)
- [ ] 9.14.5: Implement review checklist automation generating risk-appropriate checklists with auto-filled verifiable items (QA-08)
- [ ] 9.14.6: Implement composite quality score per module with 6 weighted dimensions and green/yellow/red classification (QA-09; depends on QA-04)
- [ ] 9.14.7: Implement quality regression prevention CI gate blocking merges below threshold with exception mechanism (QA-10; depends on QA-09, QA-04)
- [ ] 9.14.8: Run test suite, linters, cleanup, pass CI

### Task 9.15: Phase 9 Integration Verification
**Branch:** `task/9.15-phase-9-integration` → PR to `slush/phase-9-observability-dx-quality`

- [ ] 9.15.1: Verify structured logging, tracing, and metrics flow end-to-end from hooks through control plane
- [ ] 9.15.2: Verify dev container starts and full test suite passes inside container
- [ ] 9.15.3: Verify scanner produces a daily digest with both external and internal metrics
- [ ] 9.15.4: Run full test suite, linters, cleanup, pass CI pipeline

---

## Phase 10: Strategic Excellence & Future-Proofing
**Slush branch:** `slush/phase-10-strategic-excellence`
**PR:** → `main` (requires Admiral approval)

### Definition of Done
- [ ] At least 5 compliance crosswalk documents are published (OWASP, AEGIS, NIST, ISO 42001, EU AI Act)
- [ ] Competitive differentiation matrix covers 5 frameworks across 10+ dimensions
- [ ] Simulation testing replays 10+ recorded sequences deterministically
- [ ] Chaos testing runs 20+ failure scenarios with all hooks surviving gracefully
- [ ] Contract testing validates hook-to-control-plane JSON boundaries
- [ ] Security penetration testing suite covers 30+ attack scenarios
- [ ] Governance API server serves policy, fleet, audit, and health endpoints
- [ ] Rating system calculates current ratings with all 7 core benchmarks
- [ ] Rating badges, history tracking, and CI integration are operational
- [ ] Thesis validation framework has metrics, A/B comparison, and case studies
- [ ] Agent versioning and plugin system architecture are implemented

### Task 10.1: Compliance Crosswalks
**Branch:** `task/10.1-compliance-crosswalks` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.1.1: Create OWASP Agentic Top 10 crosswalk mapping each risk to Admiral SOs and hooks with gap analysis (R-01). Note: TDD not applicable — documentation-only task.
- [ ] 10.1.2: Create NIST SP 800-207 zero trust alignment mapping Admiral identity primitives to SPIFFE/SPIRE concepts (R-04)
- [ ] 10.1.3: Create Forrester AEGIS framework crosswalk with coverage percentage per domain across 39 controls (R-02)
- [ ] 10.1.4: Create KPMG TACO framework tagging for all 71 agent roles with distribution statistics (R-03)
- [ ] 10.1.5: Create McKinsey Agentic Organization mapping — 11 spec parts to 5 pillars (R-05)
- [ ] 10.1.6: Create Singapore IMDA regulatory alignment document for procurement review (R-06)
- [ ] 10.1.7: Create ISO 42001 AI Management System clause-by-clause mapping with Statement of Applicability template (R-08)
- [ ] 10.1.8: Create EU AI Act compliance mapping — risk classification, transparency, human oversight, technical documentation (R-09)
- [ ] 10.1.9: Run test suite, linters, cleanup, pass CI

### Task 10.2: Strategic Positioning & Community
**Branch:** `task/10.2-strategic-positioning` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.2.1: Create competitive differentiation matrix comparing Admiral against LangGraph, CrewAI, AutoGen, Semantic Kernel across 10+ dimensions (R-10). Note: TDD not applicable — documentation-only task.
- [ ] 10.2.2: Create enterprise adoption playbook covering discovery through operationalization with decision framework templates (R-11)
- [ ] 10.2.3: Create AI Work OS positioning document with complete OS-to-Admiral concept mapping (R-07)
- [ ] 10.2.4: Define open-source community strategy — governance model, contribution workflow, release cadence, licensing analysis (R-12)
- [ ] 10.2.5: Create academic research positioning with literature survey of 20+ papers and conference paper outline (R-13)
- [ ] 10.2.6: Run test suite, linters, cleanup, pass CI

### Task 10.3: Simulation & Chaos Testing
**Branch:** `task/10.3-simulation-chaos` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.3.1: Write tests for simulation replay determinism with timestamp normalization (TDD) (X-01)
- [ ] 10.3.2: Implement deterministic simulation testing harness replaying 10+ recorded hook sequences (X-01; depends on A-01)
- [ ] 10.3.3: Write chaos test scenarios for 20+ failure modes — missing jq, corrupted state, huge payloads, slow disk, concurrent execution (TDD) (X-02)
- [ ] 10.3.4: Implement chaos testing for hooks verifying fail-open behavior per ADR-004 under all scenarios (X-02; depends on T-06)
- [ ] 10.3.5: Implement end-to-end Claude Code session simulation — 50+ hook cycles with consistent state progression (X-03; depends on S-01 through S-04)
- [ ] 10.3.6: Run test suite, linters, cleanup, pass CI

### Task 10.4: Contract Testing, Security & Performance
**Branch:** `task/10.4-contract-security-perf` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.4.1: Write contract test schemas for every hook-to-control-plane boundary (TDD) (X-13)
- [ ] 10.4.2: Implement contract testing between hooks and control plane with edge cases and CI integration (X-13; depends on A-01)
- [ ] 10.4.3: Write security penetration test scenarios covering 30+ attacks across 5 categories (TDD) (X-14)
- [ ] 10.4.4: Implement security penetration testing suite with extensible runner and security posture report (X-14; depends on S-19, S-20)
- [ ] 10.4.5: Implement load testing for control plane — 1000+ concurrent connections, soak test, breaking point identification (X-15; depends on X-07)
- [ ] 10.4.6: Run test suite, linters, cleanup, pass CI

### Task 10.5: Codebase Excellence Tooling
**Branch:** `task/10.5-codebase-excellence` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.5.1: Write tests for hook execution profiler timing report accuracy (TDD) (X-04)
- [ ] 10.5.2: Implement hook execution profiling with p50/p95/p99 timing per hook and bottleneck identification (X-04)
- [ ] 10.5.3: Implement cross-system unified event log for hooks and control plane with query interface (X-07)
- [ ] 10.5.4: Implement automated API documentation generation from server.ts route definitions with CI drift detection (X-08)
- [ ] 10.5.5: Add dependency license audit CI step with incompatible license gating and allowlist mechanism (X-09)
- [ ] 10.5.6: Add reproducible build verification — two consecutive builds produce byte-identical artifacts (X-10)
- [ ] 10.5.7: Auto-generate architecture diagrams from codebase structure — hook flow, event flow, brain layers (X-11)
- [ ] 10.5.8: Implement git history quality audit — conventional commits, large files, secret scanning, merge hygiene (X-16)
- [ ] 10.5.9: Implement documentation coverage report with per-file checking and prioritized undocumented areas (X-17)
- [ ] 10.5.10: Run test suite, linters, cleanup, pass CI

### Task 10.6: Governance Platform Core
**Branch:** `task/10.6-governance-platform` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.6.1: Write tests for governance API server endpoints — health, fleet status, policies, audit events (TDD) (GP-01)
- [ ] 10.6.2: Implement governance API server with REST endpoints, authentication, and API versioning (GP-01)
- [ ] 10.6.3: Implement policy management API — CRUD with versioning, deactivation, and change logging (GP-02; depends on GP-01, MG-06)
- [ ] 10.6.4: Implement governance event streaming via SSE and polling with filtering and replay (GP-05; depends on GP-01, MG-05)
- [ ] 10.6.5: Implement governance reporting — compliance, KPI, fleet health, audit, and trend reports (GP-06; depends on GP-01, MG-10)
- [ ] 10.6.6: Run test suite, linters, cleanup, pass CI

### Task 10.7: Governance Platform Integration & Deployment
**Branch:** `task/10.7-governance-deployment` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.7.1: Write tests for governance SDK client operations (TDD) (GP-07)
- [ ] 10.7.2: Implement governance SDK with typed wrappers, event subscription, retry logic, and shell CLI wrapper (GP-07; depends on GP-01, GP-02, GP-05)
- [ ] 10.7.3: Implement governance configuration management — version history, diff, rollback, validation, export/import (GP-09; depends on GP-01, GP-02)
- [ ] 10.7.4: Implement governance webhook integrations — Slack, PagerDuty, Jira, generic HTTP with filtering and rate limiting (GP-10; depends on GP-01, GP-05)
- [ ] 10.7.5: Write governance deployment guide covering single-operator, team, security hardening, runbook, and integration recipes (GP-08; depends on GP-01). Note: TDD not applicable — documentation-only task.
- [ ] 10.7.6: Run test suite, linters, cleanup, pass CI

### Task 10.8: Agent Lifecycle & Extensibility
**Branch:** `task/10.8-agent-lifecycle` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.8.1: Write tests for agent versioning — mid-session stability, rollback, version registry (TDD) (IF-01)
- [ ] 10.8.2: Implement agent versioning with semantic versions, running session isolation, rollback, and version registry (IF-01)
- [ ] 10.8.3: Write tests for plugin lifecycle — install, enable, disable, uninstall with sandboxing (TDD) (IF-03)
- [ ] 10.8.4: Implement plugin system architecture with manifest schema for hook/agent/integration plugins and sandbox enforcement (IF-03)
- [ ] 10.8.5: Design multi-repository governance with hub-and-spoke model, shared Standing Orders, and per-repo overrides (IF-04; depends on IF-01)
- [ ] 10.8.6: Run test suite, linters, cleanup, pass CI

### Task 10.9: Performance, Cost & Collaboration
**Branch:** `task/10.9-perf-cost-collab` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.9.1: Write tests for agent performance profiling metrics collection (TDD) (IF-05)
- [ ] 10.9.2: Implement per-agent performance profiling — token usage, first-pass quality, revision depth, context efficiency (IF-05)
- [ ] 10.9.3: Implement cost optimization engine with 3 strategies — minimize cost, maximize quality, balanced (IF-06; depends on IF-05)
- [ ] 10.9.4: Implement session recording and replay with structured capture, replay comparison, and anonymization (IF-08)
- [ ] 10.9.5: Implement 4 agent collaboration patterns — pipeline, broadcast, consensus, delegation with handoff validation (IF-11)
- [ ] 10.9.6: Implement real-time collaboration dashboard with SSE updates, task board, event stream, and resource meters (IF-12)
- [ ] 10.9.7: Run test suite, linters, cleanup, pass CI

### Task 10.10: Rating System Data Model & Calculation
**Branch:** `task/10.10-rating-system` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.10.1: Write tests for rating data model schema validation — tiers, caps, gates (TDD) (RT-01)
- [ ] 10.10.2: Implement rating system data model with JSON schema covering 5 tiers, 7 dimensions, hard caps, and gate requirements (RT-01)
- [ ] 10.10.3: Write tests for rating calculation against known input/output pairs (TDD) (RT-02)
- [ ] 10.10.4: Implement automated rating calculation collecting 7 core benchmarks, applying hard caps, and producing Rating Reports (RT-02; depends on RT-01)
- [ ] 10.10.5: Implement rating improvement recommendations mapping gaps to concrete actions with effort estimates (RT-06; depends on RT-01, RT-02)
- [ ] 10.10.6: Run test suite, linters, cleanup, pass CI

### Task 10.11: Rating CI, Badges & Tracking
**Branch:** `task/10.11-rating-ci-badges` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.11.1: Implement rating CI integration — weekly scheduled runs, PR comments, regression alerts, artifact storage (RT-03; depends on RT-02)
- [ ] 10.11.2: Implement rating badge generation — SVG badges for all 5 tiers with color coding and certification suffix (RT-04; depends on RT-02)
- [ ] 10.11.3: Implement rating history tracking with append-only JSONL, per-dimension trends, transition commit links, and plateau detection (RT-05; depends on RT-02)
- [ ] 10.11.4: Implement per-module ratings with critical module identification and consistency metrics (RT-07; depends on RT-02)
- [ ] 10.11.5: Implement rating comparison benchmarks against pristine repos, industry averages, and spec targets (RT-08; depends on RT-02)
- [ ] 10.11.6: Implement rating dashboard — current rating, dimension scores, history trend, module heatmap, gate status (RT-09; depends on RT-02, RT-05, RT-07)
- [ ] 10.11.7: Implement rating alerts for regressions, hard cap violations, dimension decline, gate invalidation, and expiration (RT-10; depends on RT-02, RT-05)
- [ ] 10.11.8: Run test suite, linters, cleanup, pass CI

### Task 10.12: Thesis Validation Framework
**Branch:** `task/10.12-thesis-validation` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.12.1: Define thesis metrics with measurement methods, evidence thresholds, and null hypotheses (TV-01). Note: TDD not applicable — design/documentation task.
- [ ] 10.12.2: Write tests for A/B comparison framework measuring advisory vs enforcement (TDD) (TV-02)
- [ ] 10.12.3: Implement advisory vs enforcement A/B comparison framework collecting 5 metrics per run with statistical methodology (TV-02; depends on TV-01)
- [ ] 10.12.4: Create before/after case study framework with template, counterfactual analysis, and true/false positive classification (TV-03)
- [ ] 10.12.5: Implement agent quality improvement tracking correlating governance milestones with quality metrics (TV-04; depends on TV-01)
- [ ] 10.12.6: Create developer experience survey framework with NPS-adapted scoring and administration process (TV-05)
- [ ] 10.12.7: Implement false positive tracking — per-hook rates, developer-hours lost, mean time to resolve (TV-06)
- [ ] 10.12.8: Implement governance overhead measurement — hook latency, token ratio, context overhead, interruption cost (TV-07)
- [ ] 10.12.9: Implement ROI calculation model with 4 cost categories, 5 benefit categories, and breakeven analysis (TV-08; depends on TV-06, TV-07)
- [ ] 10.12.10: Create community feedback collection framework with channels, taxonomy, triage process, and issue templates (TV-10)
- [ ] 10.12.11: Run test suite, linters, cleanup, pass CI

### Task 10.13: Exemplary Agent Implementations
**Branch:** `task/10.13-exemplary-agents` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.13.1: Write tests for Sentinel governance agent detection capabilities (TDD) (X-05)
- [ ] 10.13.2: Implement Sentinel governance agent detecting loops, budget overruns, and scope drift with auditable interventions (X-05; depends on S-23)
- [ ] 10.13.3: Write tests for Triage Router routing decisions across 5+ task types (TDD) (X-06)
- [ ] 10.13.4: Implement Triage Router agent assigning tasks by type, capability, load, and availability with logged rationale (X-06; depends on S-06, S-07)
- [ ] 10.13.5: Run test suite, linters, cleanup, pass CI

### Task 10.14: Phase 10 Integration Verification
**Branch:** `task/10.14-phase-10-integration` → PR to `slush/phase-10-strategic-excellence`

- [ ] 10.14.1: Verify at least 5 compliance crosswalks are complete and consistent
- [ ] 10.14.2: Verify rating system produces a truthful self-assessment against current codebase
- [ ] 10.14.3: Verify governance API serves all core endpoints with authentication
- [ ] 10.14.4: Verify thesis validation framework collects at least one metric end-to-end
- [ ] 10.14.5: Run full test suite, linters, cleanup, pass CI pipeline
