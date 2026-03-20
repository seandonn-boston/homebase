# Admiral Framework — TODO / Execution Plan

**Last updated:** 2026-03-20
**Source:** plan/index.md (34 streams, ~463 items)

## Conventions

- **Phase** = large epic with one slush branch and one PR to main (requires human Admiral approval to merge)
- **Task** = chunk of work branching off the phase slush branch; one PR back into the slush branch (no human approval needed)
- **Subtask** = one atomic commit on the task branch
- Every Task's **first** subtask is TDD (write failing tests) wherever applicable
- Every Task's and Phase's **final** subtask is: _Run test suite, run linters, cleanup, and pass CI pipeline_
- Slush branch naming: `slush/phase-N-<slug>`
- Task branch naming: `task/N.M-<slug>`

---

## Phase 1: Spec Debt & Foundation
**Slush branch:** `slush/phase-1-spec-debt-foundation`
**PR to main:** Requires human Admiral approval

### Definition of Done
- Ground Truth templates exist for Mission, Boundaries, and Success Criteria in YAML/JSON with a validator that confirms no empty required fields
- Project readiness assessment tool (`readiness_assess.sh`) produces one of three states (Ready, Partially Ready, Not Ready) with a full breakdown
- Go/No-Go gate (`go_no_go_gate.sh`) exits non-zero and blocks fleet deployment when a project is Not Ready
- Spec debt inventory (`docs/spec-proposals/debt-inventory.md`) documents all active items with severity, impact, and resolution path
- Priority matrix (`docs/spec-proposals/priority-matrix.md`) classifies every gap as blocking, constraining, or cosmetic with affected streams identified
- Standing Orders enforcement map is complete: every SO has either a hook, a proposed hook, or an explicit advisory-only justification with alternative monitoring
- Hook manifest audit (`docs/spec-proposals/hook-manifest-audit.md`) cross-references all spec-referenced hooks against actual manifests with no undocumented orphans
- `zero_trust_validator.sh` scans ALL tool responses (not just WebFetch/WebSearch) and escalates MCP injection detections to CRITICAL severity
- Unit test files exist for `trace.ts`, `ingest.ts`, `instrumentation.ts`, and `events.ts`, each meeting stated coverage thresholds
- All hooks use shared `jq_helpers.sh` and `hook_utils.sh` libraries with no ad-hoc error handling patterns remaining
- CI coverage threshold gate fails the pipeline on any coverage regression
- `ADMIRAL_STYLE.md` exists at repo root and is referenced from `CONTRIBUTING.md` and `AGENTS.md`
- `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1) and `LICENSE` (MIT) exist at repo root
- All items above pass CI: tests green, linters clean, ShellCheck clean

---

### Task 1.1: Strategy Triangle Foundation (ST-01, ST-02, ST-03)
**Branch:** `task/1.1-strategy-triangle-foundation` (branches off `slush/phase-1-spec-debt-foundation`)
**PR:** → `slush/phase-1-spec-debt-foundation`

#### 1.1.1 — Write failing tests (TDD)
Write failing tests for the Ground Truth validator (`validate_ground_truth.sh`), the readiness assessment script (`readiness_assess.sh`), and the Go/No-Go gate (`go_no_go_gate.sh`): verify that a blank template fails validation, that a project missing CI config is assessed as Not Ready, and that the gate exits non-zero for a Not Ready project.

#### 1.1.2 — Create Ground Truth YAML templates and JSON schema
Author `admiral/strategy/templates/mission.yaml`, `boundaries.yaml`, and `success-criteria.yaml` with all required fields from the spec (Project Identity, Success State, Stakeholders, Current Phase, Pipeline Entry; Non-Goals, Hard Constraints, Resource Budgets, Quality Floor, LLM-Last; Functional, Quality, Completeness, Negative, Failure, Judgment Boundaries), and define `admiral/strategy/ground-truth.schema.json` covering all vertices.

#### 1.1.3 — Implement Ground Truth generator and validator
Write `admiral/strategy/generate_ground_truth.sh` (CLI that produces a blank Ground Truth document from the templates) and `admiral/strategy/validate_ground_truth.sh` (validates a filled-in document has no empty required fields and reports specific missing fields).

#### 1.1.4 — Implement project readiness assessment tool
Write `admiral/strategy/readiness_assess.sh` and the `admiral/strategy/readiness_checks/` directory of per-check scripts; the tool accepts a project root and Ground Truth path, checks Ground Truth completeness, CI configuration, test suite, linter config, and documented conventions, and outputs Ready/Partially Ready/Not Ready with a full breakdown and preparation path for Not Ready projects.

#### 1.1.5 — Implement Go/No-Go deployment gate
Write `admiral/strategy/go_no_go_gate.sh`, which invokes the readiness assessment, exits non-zero for Not Ready projects, restricts Partially Ready projects to Starter profile with a gap warning, and appends any bypass with justification to `admiral/strategy/override_log.jsonl`.

#### 1.1.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 1.2: Spec Debt Inventory and Prioritization (SD-01, SD-02)
**Branch:** `task/1.2-spec-debt-inventory` (branches off `slush/phase-1-spec-debt-foundation`)
**PR:** → `slush/phase-1-spec-debt-foundation`

#### 1.2.1 — Write failing tests (TDD)
Write a lint/structure test that validates `docs/spec-proposals/debt-inventory.md` and `docs/spec-proposals/priority-matrix.md` conform to their required schemas (required sections present, no empty severity or impact fields, every item classified).

#### 1.2.2 — Audit spec-debt.md and spec-gaps.md and produce debt inventory
Read `spec-debt.md` and `spec-gaps.md` comprehensively; for each active item document the specific spec section affected, the nature of the gap, the downstream implementation impact, and a proposed resolution path; write the result to `docs/spec-proposals/debt-inventory.md` as a living document.

#### 1.2.3 — Cross-reference debt items against all plan streams and produce priority matrix
Classify each gap in the inventory as blocking, constraining, or cosmetic against the relevant stream and task; assign target resolution dates to blocking gaps; write the result to `docs/spec-proposals/priority-matrix.md`.

#### 1.2.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 1.3: Standing Orders Enforcement Map Completion and Hook Manifest Audit (SD-04, SD-05)
**Branch:** `task/1.3-enforcement-map-hook-audit` (branches off `slush/phase-1-spec-debt-foundation`)
**PR:** → `slush/phase-1-spec-debt-foundation`

#### 1.3.1 — Write failing tests (TDD)
Write a validation script that reads the enforcement map and asserts every SO has a documented enforcement strategy entry (hook reference, proposed hook manifest, or explicit advisory justification); write a second test that asserts every spec-referenced hook name appears in either `aiStrat/hooks/` or `.hooks/` with a manifest.

#### 1.3.2 — Complete the Standing Orders enforcement map
For each of the 8 advisory-only Standing Orders, produce either a proposed hook definition with manifest (name, lifecycle event, enforced behavior, SO reference, pass/fail criteria, blocking classification) or an explicit advisory-only justification with alternative monitoring strategy; give special attention to SO-14 (Compliance, Ethics, Legal) as the safety-tier gap; write results to `docs/spec-proposals/amendments/enforcement-map-completion.md`.

#### 1.3.3 — Perform hook manifest audit
Enumerate all hooks referenced in the spec; compare against actual manifests in `aiStrat/hooks/` and `.hooks/`; document missing manifests (referenced in spec but no manifest), orphan manifests (manifest exists but not spec-referenced), and write proposals for missing manifest content; write the full cross-reference to `docs/spec-proposals/hook-manifest-audit.md`.

#### 1.3.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 1.4: Extend Zero Trust Validator to All Tool Responses (SEC-13)
**Branch:** `task/1.4-zero-trust-all-tools` (branches off `slush/phase-1-spec-debt-foundation`)
**PR:** → `slush/phase-1-spec-debt-foundation`

#### 1.4.1 — Write failing tests (TDD)
Write `admiral/tests/test_zero_trust_all_tools.sh` with test cases that feed synthetic MCP tool responses containing injection markers into `zero_trust_validator.sh` and assert they are detected and flagged at CRITICAL severity; write a control case confirming a clean MCP response passes without false-positive.

#### 1.4.2 — Remove tool name filter and add MCP severity escalation
Edit `.hooks/zero_trust_validator.sh` to remove the WebFetch/WebSearch tool name restriction (lines 24–35) so injection marker scanning applies to all tool responses; add logic that escalates detections originating from MCP tool responses to CRITICAL severity versus the standard severity used for web-sourced detections.

#### 1.4.3 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 1.5: Unit Tests for Untested Control Plane Modules (T-01 to T-04)
**Branch:** `task/1.5-unit-tests-untested-modules` (branches off `slush/phase-1-spec-debt-foundation`)
**PR:** → `slush/phase-1-spec-debt-foundation`

#### 1.5.1 — Write failing tests for trace.ts (TDD)
Create `control-plane/src/trace.test.ts` with failing stubs covering `buildTrace()`, `buildAgentTrace()`, `renderAscii()`, and `getStats()`, including tree building with nested hierarchies, empty streams, and single-event streams, targeting ≥80% branch coverage.

#### 1.5.2 — Implement trace.test.ts to passing
Fill in the test cases so all assertions pass and branch coverage meets the ≥80% threshold.

#### 1.5.3 — Write and pass ingest.test.ts
Create `control-plane/src/ingest.test.ts` covering `ingestNewLines()`, `start()`/`stop()`, and `getStats()` with valid JSONL, malformed lines, missing file, file growth, and offset tracking scenarios, achieving ≥80% branch coverage.

#### 1.5.4 — Write and pass instrumentation.test.ts
Create `control-plane/src/instrumentation.test.ts` covering every public method of `AgentInstrumentation` including null agent and missing field edge cases, achieving ≥90% branch coverage.

#### 1.5.5 — Write and pass events.test.ts
Create `control-plane/src/events.test.ts` covering `EventStream` ID generation, listener lifecycle, eviction, filters, and counters, verifying event ordering and listener cleanup, achieving ≥90% branch coverage.

#### 1.5.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 1.6: Standardize Hook Shared Libraries (Q-01, Q-02)
**Branch:** `task/1.6-hook-shared-libraries` (branches off `slush/phase-1-spec-debt-foundation`)
**PR:** → `slush/phase-1-spec-debt-foundation`

#### 1.6.1 — Write failing tests (TDD)
Write `admiral/tests/test_jq_helpers.sh` with failing tests for each planned helper function (`jq_get_field`, `jq_set_field`, `jq_array_append`, `jq_validate`); write `admiral/tests/test_hook_utils.sh` with failing tests for `hook_log`, `hook_fail_soft`, `hook_fail_hard`, and `hook_pass`, asserting correct exit codes and log output format.

#### 1.6.2 — Create jq_helpers.sh shared library
Implement `admiral/lib/jq_helpers.sh` with `jq_get_field()`, `jq_set_field()`, `jq_array_append()`, and `jq_validate()` functions extracted from common patterns across the hook scripts.

#### 1.6.3 — Create hook_utils.sh shared error handling library
Implement `admiral/lib/hook_utils.sh` with `hook_log()`, `hook_fail_soft()`, `hook_fail_hard()`, and `hook_pass()` functions, enforcing consistent exit codes, structured JSON logging, and fail-open/fail-closed behavior per ADR-004.

#### 1.6.4 — Refactor all hooks to use shared libraries
Update all 13 `.hooks/*.sh` scripts to source and use `jq_helpers.sh` and `hook_utils.sh`, removing all inline jq duplication and ad-hoc error handling patterns; verify no inconsistent patterns remain.

#### 1.6.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 1.7: Coverage Enforcement Gate in CI (T-09, C-01)
**Branch:** `task/1.7-coverage-enforcement-gate` (branches off `slush/phase-1-spec-debt-foundation`)
**PR:** → `slush/phase-1-spec-debt-foundation`

#### 1.7.1 — Write failing tests (TDD)
Write a CI script test that simulates a coverage report below threshold and asserts the gate script exits non-zero, and a second case at or above threshold that asserts exit zero.

#### 1.7.2 — Implement coverage threshold gate script
Write a parser script that reads `--experimental-test-coverage` output, compares total branch coverage against a configurable threshold stored in a config file, and exits non-zero with a descriptive message on regression.

#### 1.7.3 — Integrate coverage gate into CI workflow
Modify `.github/workflows/control-plane-ci.yml` to invoke the coverage gate script after the test run; document the threshold value and the process for raising it in `CONTRIBUTING.md`.

#### 1.7.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 1.8: Documentation Quick Wins — ADMIRAL_STYLE, CoC, and LICENSE (D-01, D-02, D-03)
**Branch:** `task/1.8-documentation-quick-wins` (branches off `slush/phase-1-spec-debt-foundation`)
**PR:** → `slush/phase-1-spec-debt-foundation`

#### 1.8.1 — Write failing tests (TDD)
Write a CI lint script that asserts `ADMIRAL_STYLE.md`, `CODE_OF_CONDUCT.md`, and `LICENSE` exist at repo root, that `CONTRIBUTING.md` contains references to all three, and that `AGENTS.md` contains a reference to `ADMIRAL_STYLE.md`; run the script and confirm it fails before any files are created.

#### 1.8.2 — Create ADMIRAL_STYLE.md
Author `ADMIRAL_STYLE.md` covering naming conventions (kebab-case vs snake_case contexts), error handling patterns, jq usage patterns, exit code taxonomy, "why" comment standards, testing requirements, and commit message format, in a TigerBeetle-style single reference document.

#### 1.8.3 — Create CODE_OF_CONDUCT.md
Add `CODE_OF_CONDUCT.md` at repo root using Contributor Covenant v2.1 with correct project contact information.

#### 1.8.4 — Create LICENSE file
Add `LICENSE` at repo root with the MIT license text, correct year, and correct copyright holder matching `package.json`.

#### 1.8.5 — Update CONTRIBUTING.md and AGENTS.md with cross-references
Add references to `ADMIRAL_STYLE.md`, `CODE_OF_CONDUCT.md`, and `LICENSE` in `CONTRIBUTING.md`; add a reference to `ADMIRAL_STYLE.md` in `AGENTS.md`.

#### 1.8.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

## Phase 2: Spec Debt Resolution & Self-Enforcement
**Slush branch:** `slush/phase-2-spec-debt-resolution`
**PR to main:** Requires human Admiral approval

### Definition of Done
- Every active spec gap identified in `spec-debt.md` and `spec-gaps.md` has a formal amendment proposal in `docs/spec-proposals/amendments/`
- A priority matrix classifies every gap as blocking, constraining, or cosmetic with affected stream cross-references
- A constants registry (`admiral/config/reference_constants.sh`) exists and every value in `reference-constants.md` is audited against the implementation
- A spec version tracking manifest maps every major implementation component to its target spec version
- Spec compliance tests exist for Standing Orders, reference constants, and Brain schema, and all pass in CI
- A changelog bridge document exists mapping spec versions to implementation status
- Spec gap proposals are written for fleet orchestration protocol, Brain graduation automation, and cross-platform hook normalization
- TypeScript event IDs use `crypto.randomUUID()`, a typed error hierarchy exists in `control-plane/src/errors.ts`, and `server.ts` uses declarative routing
- JSON schema validation exists for hook payloads and session state
- A bash dependency checker runs in CI
- A pre-commit hook validates AGENTS.md format, ADR template compliance, and Standing Order format for staged files
- A CI job warns on `fix:` commits that include no test file changes
- A CI documentation discipline check enforces module doc comments and hook header blocks
- All tests pass, all linters are clean, and CI is green

---

### Task 2.1: Spec Debt Inventory & Amendment Proposals
**Branch:** `task/2.1-spec-debt-inventory-and-amendments` (branches off `slush/phase-2-spec-debt-resolution`)
**PR:** → `slush/phase-2-spec-debt-resolution`

#### 2.1.1 — Write failing tests (TDD)
Write a test script at `admiral/tests/spec_compliance/test_spec_proposals.sh` that asserts the existence and structural validity of required proposal files (`docs/spec-proposals/debt-inventory.md`, `docs/spec-proposals/priority-matrix.md`, and the `docs/spec-proposals/amendments/` directory), confirming each file contains the required sections before the files are authored.

#### 2.1.2 — Author the spec debt inventory
Audit `spec-debt.md` and `spec-gaps.md` comprehensively and write `docs/spec-proposals/debt-inventory.md` classifying every active item by severity, implementation impact, and proposed resolution path.

#### 2.1.3 — Author the priority matrix
Cross-reference the debt inventory against all plan streams and write `docs/spec-proposals/priority-matrix.md` classifying each gap as blocking, constraining, or cosmetic with the specific stream or task it affects and target resolution dates for blocking items.

#### 2.1.4 — Author all formal amendment proposals (SD-03)
For every active gap identified in the inventory, write a self-contained proposal file under `docs/spec-proposals/amendments/` following the standard format: Gap ID, affected spec section with file and line range, current text, proposed text, rationale, and impact assessment.

#### 2.1.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 2.2: Reference Constants Registry & Spec Version Tracking
**Branch:** `task/2.2-constants-registry-and-version-tracking` (branches off `slush/phase-2-spec-debt-resolution`)
**PR:** → `slush/phase-2-spec-debt-resolution`

#### 2.2.1 — Write failing tests (TDD)
Write tests in `admiral/tests/spec_compliance/test_constants.sh` that assert every constant named in `reference-constants.md` is present in `admiral/config/reference_constants.sh` with a matching value, and write a test in `admiral/tests/spec_compliance/test_version_manifest.sh` that validates `admiral/config/spec_version_manifest.json` is valid JSON and contains an entry for each major implementation component.

#### 2.2.2 — Audit reference constants against the implementation (SD-06)
Audit `reference-constants.md` and for each constant record whether it is implemented, missing, or divergent; document findings in `docs/spec-proposals/constants-audit.md`.

#### 2.2.3 — Implement the constants registry
Create `admiral/config/reference_constants.sh` as a single-source-of-truth shell constants file whose values exactly match the spec, covering all thresholds, timeouts, scoring thresholds, and behavioral parameters identified in the audit.

#### 2.2.4 — Implement spec version tracking (SD-07)
Create `admiral/config/spec_version_manifest.json` mapping every major implementation component (hook, agent, Brain feature, control plane module) to the spec version it targets, and document the maintenance process in `docs/spec-proposals/version-tracking.md`.

#### 2.2.5 — Author the changelog bridge (SD-09)
Write `docs/spec-proposals/changelog-bridge.md` mirroring the spec's version history, recording implementation status for each spec change, and defining a computable "spec freshness" score.

#### 2.2.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 2.3: Spec Compliance Test Suite
**Branch:** `task/2.3-spec-compliance-tests` (branches off `slush/phase-2-spec-debt-resolution`)
**PR:** → `slush/phase-2-spec-debt-resolution`

#### 2.3.1 — Write failing tests (TDD)
Write a meta-test at `admiral/tests/spec_compliance/test_compliance_suite_exists.sh` that asserts the compliance test directory contains at minimum one test file per spec part (Parts 1–12), failing until the full suite is populated.

#### 2.3.2 — Implement Standing Orders compliance test (SD-08)
Write `admiral/tests/spec_compliance/test_standing_orders.sh` that verifies each of the 16 SOs maps to at least one hook or CI enforcement mechanism, referencing the specific spec section for each assertion.

#### 2.3.3 — Implement constants compliance test (SD-08)
Write `admiral/tests/spec_compliance/test_constants.sh` that verifies every value in `admiral/config/reference_constants.sh` matches the corresponding value in `reference-constants.md`, with each assertion referencing the relevant spec section.

#### 2.3.4 — Implement Brain schema compliance test (SD-08)
Write `admiral/tests/spec_compliance/test_brain_schema.sh` that validates the Brain's runtime schema against the schema defined in Part 5 of the spec, failing with a message that identifies any divergent field.

#### 2.3.5 — Integrate compliance suite into CI
Add a `spec-compliance` job to the appropriate GitHub Actions workflow that runs all tests in `admiral/tests/spec_compliance/` and computes a compliance score (passing tests / total tests) as a visible CI output.

#### 2.3.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 2.4: Spec Gap Proposals — Fleet, Brain, Cross-Platform
**Branch:** `task/2.4-spec-gap-proposals` (branches off `slush/phase-2-spec-debt-resolution`)
**PR:** → `slush/phase-2-spec-debt-resolution`

#### 2.4.1 — Write failing tests (TDD)
Write a test in `admiral/tests/spec_compliance/test_spec_proposals.sh` (extending Task 2.1's test) that asserts `docs/spec-proposals/amendments/fleet-orchestration-protocol.md`, `brain-graduation-automation.md`, and `cross-platform-hook-normalization.md` each exist and contain their five required answer sections, failing until all three files are present.

#### 2.4.2 — Author the fleet orchestration protocol proposal (SD-10)
Write `docs/spec-proposals/amendments/fleet-orchestration-protocol.md` providing concrete protocol definitions for agent selection, unavailability handling, task assignment format, dependency and parallelism tracking, and Orchestrator context management, with rationale and alternatives for each design choice.

#### 2.4.3 — Author the Brain graduation automation proposal (SD-11)
Write `docs/spec-proposals/amendments/brain-graduation-automation.md` answering who initiates graduation, reversibility, the migration process, Brain availability during migration, and pre-commit dry-run behavior, including a graduation decision flowchart.

#### 2.4.4 — Author the cross-platform hook normalization proposal (SD-12)
Write `docs/spec-proposals/amendments/cross-platform-hook-normalization.md` defining the canonical hook interface, handling of platform-limited lifecycle events, payload normalization strategy, a platform compatibility matrix template, and management of platform-specific hooks.

#### 2.4.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 2.5: TypeScript Quality Improvements
**Branch:** `task/2.5-typescript-quality` (branches off `slush/phase-2-spec-debt-resolution`)
**PR:** → `slush/phase-2-spec-debt-resolution`

#### 2.5.1 — Write failing tests (TDD)
Write or extend tests in `control-plane/src/events.test.ts` to assert that generated event IDs match the pattern `evt_[0-9a-f-]{36}` (UUID format), and write tests in `control-plane/src/server.test.ts` that assert all known API routes resolve without manual URL splitting logic.

#### 2.5.2 — Replace Date.now() event IDs with crypto.randomUUID() (Q-05)
Update `control-plane/src/events.ts` to generate event IDs using `crypto.randomUUID()` with the format `evt_<uuid>`, and update all existing tests that assert against the old ID format.

#### 2.5.3 — Add typed error hierarchy (Q-06)
Create `control-plane/src/errors.ts` defining `AdmiralError` as a base class plus `NotFoundError`, `ValidationError`, `StateCorruptionError`, and `IngestionError`, then replace all `err instanceof Error ? err.message : String(err)` patterns in `server.ts` and `ingest.ts` with typed catches using the new hierarchy.

#### 2.5.4 — Implement declarative routing in server.ts (Q-08)
Replace the manual `url.split("/")` URL parsing and the `agentId !== "resume"` guard in `control-plane/src/server.ts` with a declarative route table that makes the full API surface visible at a glance.

#### 2.5.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 2.6: Schema Validation & Bash Dependency Checker
**Branch:** `task/2.6-schema-validation-and-deps` (branches off `slush/phase-2-spec-debt-resolution`)
**PR:** → `slush/phase-2-spec-debt-resolution`

#### 2.6.1 — Write failing tests (TDD)
Write tests in `admiral/tests/test_schema_validation.sh` that feed a known-invalid hook payload to `admiral/lib/schema_validate.sh` and assert a non-zero exit with a logged error, and feed a known-invalid `session_state.json` to the state writer and assert it is rejected; also write a test that runs `admiral/bin/check_deps` in an environment with a missing dependency and asserts a non-zero exit.

#### 2.6.2 — Define JSON schemas for hook payloads (A-01)
Create `admiral/schemas/` and populate it with JSON schema files for PreToolUse and PostToolUse hook input and output payloads, ensuring the schemas reflect the contracts described in Part 3 of the spec.

#### 2.6.3 — Implement schema validation library and wire into adapters (A-01)
Create `admiral/lib/schema_validate.sh` with a `validate_schema()` function that uses `jq` to check a JSON value against a schema file, then apply validation to `.hooks/pre_tool_use_adapter.sh` and `.hooks/post_tool_use_adapter.sh` with fail-open behavior per ADR-004.

#### 2.6.4 — Add session state schema validation (A-06)
Create `admiral/schemas/session_state.schema.json` defining required fields, types, and allowed values for `session_state.json`, then update `admiral/lib/state.sh` to validate every write against this schema, logging and rejecting malformed mutations.

#### 2.6.5 — Implement the bash dependency checker (A-04)
Create `admiral/bin/check_deps` as an executable script that checks for `jq >= 1.6`, `sha256sum` or `shasum`, `uuidgen`, `date`, `flock`, and `shellcheck`, reports versions for each, and exits non-zero if any critical dependency is missing; integrate the script into the CI workflow.

#### 2.6.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 2.7: Self-Enforcement Hooks & CI Discipline
**Branch:** `task/2.7-self-enforcement-hooks` (branches off `slush/phase-2-spec-debt-resolution`)
**PR:** → `slush/phase-2-spec-debt-resolution`

#### 2.7.1 — Write failing tests (TDD)
Write tests in `admiral/tests/test_documentation.sh` that scan existing `.ts` source files and `.hooks/*.sh` files for required header blocks, asserting violations are detected and reported with file paths and line numbers; also stage a mock `fix:` commit with no test file changes in a test environment and assert the CI job emits a warning annotation.

#### 2.7.2 — Implement the CI test discipline check (P-01)
Add a `test-discipline` job to `.github/workflows/control-plane-ci.yml` and a parallel check to `.github/workflows/hook-tests.yml` that detects `fix:` commits containing no test file changes and emits a visible warning annotation on the PR.

#### 2.7.3 — Implement the CI documentation discipline check (P-02)
Create `admiral/tests/test_documentation.sh` that validates three invariants — module-level doc comments in `control-plane/src/*.ts` files, header blocks in `.hooks/*.sh` files, and required sections in `docs/adr/*.md` files — then add a `doc-discipline` job to `.github/workflows/control-plane-ci.yml` that runs this script and reports all violations.

#### 2.7.4 — Extend the pre-commit hook for self-enforcement (P-05)
Extend `.githooks/pre-commit` to validate staged files against three additional checks: AGENTS.md section header hierarchy and internal links, ADR template compliance for staged `docs/adr/*.md` files, and Standing Order format compliance for staged `admiral/standing-orders/*.md` files, scoping all checks to staged files only via `git diff --cached --name-only` to keep the hook under five seconds.

#### 2.7.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

## Phase 3: Spec Gaps — Critical
**Slush branch:** `slush/phase-3-spec-gaps-critical`
**PR to main:** Requires human Admiral approval

### Definition of Done
- All four missing hooks (S-01 through S-04) are implemented, tested, and integrated into the session start and pre-tool-use flows
- `protocol_registry_guard.sh` blocks calls to unregistered MCP servers at PreToolUse with exit code 2 and maintains `admiral/config/approved_mcp_servers.json`
- Standing Orders enforcement map (`admiral/docs/standing-orders-enforcement-map.md`) exists with all 16 SOs mapped to enforcement type and responsible file(s)
- Standing Orders coverage report (`SO-17`) runs in CI and produces machine-parseable JSON output
- Brain B1 auto-records entries from at least 3 hooks without manual intervention
- Brain B1 retrieval in `brain_context_router.sh` returns structured context blocks on Propose/Escalate-tier calls
- Demand signal tracking records failed queries to `.brain/_demand/` and is visible via `brain_audit --demand`
- Handoff protocol schema (`admiral/handoff/schema.json`) is defined and `validate.sh` rejects incomplete handoffs
- Escalation pipeline flows through all 5 steps and persists outcomes as Brain precedent
- Agent registry loads from configuration, validates entries, and provides a lookup API
- Task routing engine accepts a task description and returns a routing decision with justification
- All new code has corresponding tests; CI is green; linters are clean across all modified files

---

### Task 3.1: Missing Session-Start Hooks — Identity and Tier Validation
**Branch:** `task/3.1-identity-tier-validation-hooks` (branches off `slush/phase-3-spec-gaps-critical`)
**PR:** → `slush/phase-3-spec-gaps-critical`

#### 3.1.1 — Write failing tests (TDD)
Write test scripts for `identity_validation.sh` and `tier_validation.sh` covering valid identity, invalid agent ID, role mismatch, tier mismatch on critical tasks, and tier mismatch warnings; all tests must fail before implementation begins.

#### 3.1.2 — Implement `identity_validation.sh`
Create `.hooks/identity_validation.sh` that fires at SessionStart, validates agent ID, role, and tier fields against the fleet registry, and exits with code 2 on invalid identity while logging the result to state.

#### 3.1.3 — Implement `tier_validation.sh`
Create `.hooks/tier_validation.sh` that validates the model tier assigned to an agent against its role requirements, emits a warning (exit 0) on soft mismatches, and hard-blocks (exit 2) critical tier mismatches.

#### 3.1.4 — Wire both hooks into the session start adapter
Update `.hooks/session_start_adapter.sh` (or equivalent) to invoke `identity_validation.sh` and `tier_validation.sh` in sequence before any agent work begins.

#### 3.1.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 3.2: Missing Hook — Governance Heartbeat Monitor
**Branch:** `task/3.2-governance-heartbeat-monitor` (branches off `slush/phase-3-spec-gaps-critical`)
**PR:** → `slush/phase-3-spec-gaps-critical`

#### 3.2.1 — Write failing tests (TDD)
Write test cases for `governance_heartbeat_monitor.sh` covering: heartbeat emitted on schedule, alert triggered after threshold exceeded, heartbeat history written to state, and no alert when heartbeat is current.

#### 3.2.2 — Implement `governance_heartbeat_monitor.sh`
Create `.hooks/governance_heartbeat_monitor.sh` that emits heartbeat checks on a configurable interval, alerts when a governance agent (Sentinel, Arbiter) misses a heartbeat beyond the threshold, and records heartbeat history to state.

#### 3.2.3 — Integrate with the alerting pipeline stub
Wire the heartbeat monitor's alert output to a structured log destination so alerts are externally observable even before the full alerting pipeline (S-15) is complete.

#### 3.2.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 3.3: Missing Hook — Protocol Registry Guard with MCP Server Enforcement
**Branch:** `task/3.3-protocol-registry-guard` (branches off `slush/phase-3-spec-gaps-critical`)
**PR:** → `slush/phase-3-spec-gaps-critical`

#### 3.3.1 — Write failing tests (TDD)
Write test cases covering: approved MCP server call passes, unregistered MCP server call is blocked with exit code 2, unauthorized protocol change is rejected, registered protocol change proceeds, and blocked attempts are logged with agent identity and target endpoint.

#### 3.3.2 — Create `admiral/config/approved_mcp_servers.json` registry
Define the approved MCP server registry schema and seed it with the initially known approved servers, including trust classification fields aligned with the SO-16 Server Addition Checklist.

#### 3.3.3 — Implement protocol change governance in `protocol_registry_guard.sh`
Create `.hooks/protocol_registry_guard.sh` and implement the first enforcement surface: validate protocol modifications (new, modified, deprecated) against SO-16 rules, require proper approval workflow, enforce versioning and backwards-compatibility checks, and block unauthorized changes with exit code 2.

#### 3.3.4 — Implement MCP server registration enforcement in `protocol_registry_guard.sh`
Add the second enforcement surface to the same hook: intercept every PreToolUse event, extract the target MCP server identifier, compare against `approved_mcp_servers.json`, and hard-block calls to unregistered servers while logging the requesting agent identity and target endpoint.

#### 3.3.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 3.4: Standing Orders Enforcement Map and Coverage Report
**Branch:** `task/3.4-standing-orders-enforcement-map` (branches off `slush/phase-3-spec-gaps-critical`)
**PR:** → `slush/phase-3-spec-gaps-critical`

#### 3.4.1 — Write failing tests (TDD)
Write tests for `standing_orders_coverage.sh` (SO-17) covering: all 16 SOs appear in output, each entry includes enforcement type classification, JSON output is well-formed, and coverage percentage is calculated correctly.

#### 3.4.2 — Author `admiral/docs/standing-orders-enforcement-map.md`
Create the enforcement map document mapping all 16 Standing Orders to their enforcement mechanism (hook, instruction embedding, or guidance-only), the specific file(s) responsible, and a note on any enforcement gaps discovered during the mapping exercise.

#### 3.4.3 — Implement `admiral/reports/standing_orders_coverage.sh`
Create the automated coverage report script (SO-17) that reads the enforcement map, classifies each SO's enforcement type, calculates overall coverage percentage, identifies gaps, and outputs both a human-readable summary and machine-parseable JSON.

#### 3.4.4 — Integrate the coverage report into CI
Add the `standing_orders_coverage.sh` report as a CI check step so enforcement coverage is tracked on every merge.

#### 3.4.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 3.5: Brain B1 — Automatic Entry Creation from Hooks
**Branch:** `task/3.5-brain-b1-auto-recording` (branches off `slush/phase-3-spec-gaps-critical`)
**PR:** → `slush/phase-3-spec-gaps-critical`

#### 3.5.1 — Write failing tests (TDD)
Write tests verifying that `prohibitions_enforcer.sh`, `loop_detector.sh`, and `scope_boundary_guard.sh` each emit a correctly structured Brain entry to `.brain/` on a triggering event, without manual intervention.

#### 3.5.2 — Create `admiral/lib/brain_writer.sh` shared library
Implement the shared Brain writer library that hooks call to emit entries, handling field validation, file naming, and atomic write to prevent corruption on concurrent hook invocations.

#### 3.5.3 — Wire `prohibitions_enforcer.sh` to emit Brain entries
Modify `.hooks/prohibitions_enforcer.sh` to call `brain_writer.sh` whenever a hard-block event fires, recording the category, content, and source agent automatically.

#### 3.5.4 — Wire `loop_detector.sh` and `scope_boundary_guard.sh` to emit Brain entries
Modify `.hooks/loop_detector.sh` and `.hooks/scope_boundary_guard.sh` to call `brain_writer.sh` on significant events (detected loop, boundary violation), completing the minimum three-hook requirement.

#### 3.5.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 3.6: Brain B1 — Retrieval in Hooks and Demand Signal Tracking
**Branch:** `task/3.6-brain-b1-retrieval-demand` (branches off `slush/phase-3-spec-gaps-critical`)
**PR:** → `slush/phase-3-spec-gaps-critical`

#### 3.6.1 — Write failing tests (TDD)
Write tests for the enhanced `brain_context_router.sh` covering: matching entries returned as structured context blocks on Propose-tier calls, no entries returned when Brain is empty (demand signal recorded), and `brain_audit --demand` listing the failed query.

#### 3.6.2 — Enhance `brain_context_router.sh` to actively query and inject context
Update `.hooks/brain_context_router.sh` to invoke `brain_query` with keywords extracted from the current task context on Propose/Escalate-tier tool calls and inject matching entries as structured context blocks in the hook response JSON, rather than only detecting that a query was skipped.

#### 3.6.3 — Implement demand signal tracking in `brain_query`
Modify `admiral/bin/brain_query` to record failed queries (zero results) to `.brain/_demand/` with query term, timestamp, calling agent, and task context, then create the `.brain/_demand/` directory and expose the signals via a new `brain_audit --demand` flag.

#### 3.6.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 3.7: Handoff Protocol
**Branch:** `task/3.7-handoff-protocol` (branches off `slush/phase-3-spec-gaps-critical`)
**PR:** → `slush/phase-3-spec-gaps-critical`

#### 3.7.1 — Write failing tests (TDD)
Write tests for `admiral/handoff/validate.sh` covering: a complete, well-formed handoff passes validation, a handoff missing required fields is rejected with a specific field-level error, and handoff history is appended to the audit log after acceptance.

#### 3.7.2 — Define `admiral/handoff/schema.json`
Create the `admiral/handoff/` directory and define the `handoff/v1.schema.json` JSON Schema specifying all required fields (source agent, target agent, context summary, state snapshot, intent, open decisions) and their types.

#### 3.7.3 — Implement `admiral/handoff/validate.sh`
Create `admiral/handoff/validate.sh` that validates a handoff payload against `schema.json`, rejects incomplete handoffs with a structured error naming each missing field, and appends accepted handoffs to a handoff history log for audit.

#### 3.7.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 3.8: Escalation Pipeline
**Branch:** `task/3.8-escalation-pipeline` (branches off `slush/phase-3-spec-gaps-critical`)
**PR:** → `slush/phase-3-spec-gaps-critical`

#### 3.8.1 — Write failing tests (TDD)
Write tests for the full five-step escalation pipeline covering: intake classifies issue type and severity, Brain is queried for precedent at step 2, three or more resolution paths are generated at step 3, a decision is recorded with authority level at step 4, and outcome is persisted as a Brain precedent entry at step 5.

#### 3.8.2 — Implement `admiral/escalation/intake.sh`
Create the intake step that classifies the incoming issue by type and severity and emits a structured intake record that subsequent pipeline steps consume.

#### 3.8.3 — Implement `admiral/escalation/resolve.sh` with Brain precedent query
Create the resolution step that queries the Brain for matching precedent at step 2, generates ranked candidate resolution paths at step 3, and formats them for Admiral selection.

#### 3.8.4 — Implement `admiral/escalation/pipeline.sh` orchestrator
Create the pipeline orchestrator that sequences all five steps, enforces step ordering, records the Admiral's decision with authority tracking at step 4, and persists the outcome as a new Brain entry at step 5.

#### 3.8.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 3.9: Agent Registry
**Branch:** `task/3.9-agent-registry` (branches off `slush/phase-3-spec-gaps-critical`)
**PR:** → `slush/phase-3-spec-gaps-critical`

#### 3.9.1 — Write failing tests (TDD)
Write tests for the agent registry covering: registry loads from configuration file, invalid entries (conflicting permissions, invalid tier) are rejected with actionable error messages, lookup by agent ID returns the correct record, lookup by capability returns all matching agents, and lookup by tier filters correctly.

#### 3.9.2 — Define the agent registry configuration schema
Design the JSON schema for `admiral/fleet/registry.json` specifying required fields per entry: agent ID, role, capabilities list, model tier, tool permissions (allowed and denied), and routing rules.

#### 3.9.3 — Implement `admiral/fleet/registry.sh` with validation and lookup API
Create `admiral/fleet/registry.sh` that loads the registry from configuration, validates every entry against spec constraints (valid tiers, no overlapping allowed/denied tool lists), and exposes a lookup API (by ID, by capability, by tier) returning structured JSON responses.

#### 3.9.4 — Seed the registry with representative agent entries
Populate `admiral/fleet/registry.json` with a representative set of agent entries (at minimum: Orchestrator, Sentinel, and one domain worker) sufficient to exercise routing and permission features in subsequent tasks.

#### 3.9.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 3.10: Task Routing Engine
**Branch:** `task/3.10-task-routing-engine` (branches off `slush/phase-3-spec-gaps-critical`)
**PR:** → `slush/phase-3-spec-gaps-critical`

#### 3.10.1 — Write failing tests (TDD)
Write tests for the task routing engine covering: a task requiring a specific capability is routed to a capable agent, a task requiring a minimum tier is not routed to a lower-tier agent, file ownership rules take precedence when two agents are equally capable, and the routing decision includes a justification field.

#### 3.10.2 — Implement the core routing algorithm in `control-plane/src/task-router.ts`
Create `control-plane/src/task-router.ts` with the core routing algorithm: accept a task description and metadata, query the agent registry for capable agents, apply routing rules (file ownership, specialization score, tier requirements), select the optimal agent, and return a structured routing decision with justification.

#### 3.10.3 — Integrate routing with the agent registry
Wire `task-router.ts` to call the agent registry lookup API so routing decisions are always based on live registry state rather than hardcoded agent knowledge.

#### 3.10.4 — Expose routing via a control-plane API endpoint
Add a `/api/route-task` endpoint to `control-plane/src/server.ts` that accepts a task payload and returns the routing decision, making the router callable from hooks and external tooling.

#### 3.10.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

## Phase 4: Fleet & Orchestration
**Slush branch:** `slush/phase-4-fleet-orchestration`
**PR to main:** Requires human Admiral approval

### Definition of Done
- All 71 core agent definitions and 34 extended agent definitions exist as structured markdown and JSON files under `fleet/agents/definitions/`
- Every agent definition passes the JSON Schema validator (F-12a/F-12b) with zero schema violations
- Tool list disjointness is enforced for all agents (available ∩ denied = ∅)
- Model tier assignments are correct and enforced for all agents
- A machine-readable agent capability registry (`fleet/agents/registry/agent-registry.json`) is generated from definitions and queryable by the Orchestrator
- Routing engine resolves all 86 task-type mappings from `fleet/routing-rules.md` with fallbacks and constraint enforcement
- File-ownership routing, capability-match fallback, and escalation path are all exercised by integration tests
- Model tier validation hook fires on every SessionStart and rejects under-tiered sessions
- Degradation policy engine enforces per-agent overrides including the Security Auditor Blocked policy
- Context injection pipeline assembles three-layer context in the correct order and enforces budget allocation
- Handoff contract validator covers all contract categories defined in `fleet/interface-contracts.md`
- Multi-agent pipeline execution runs end-to-end with validated handoffs between steps
- Fleet health monitor collects per-agent and fleet-wide metrics and fires classified alerts with deduplication
- Task decomposition engine produces subtasks with valid single-agent assignments and detects artificial splits
- File ownership conflict resolution runs before task execution and logs resolution rationale
- Fleet scaling policies enforce fleet size limits and cooldown periods
- Agent warm-up and cool-down are logged and tracked against cold-start baseline
- CI pipeline is green: all tests pass, all linters are clean, fleet validation workflow passes

---

### Task 4.1: Agent Definition Schema and Validator
**Branch:** `task/4.1-agent-definition-schema-validator` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.1.1 — Write failing tests (TDD)
Write failing tests for JSON Schema validation, tool list disjointness enforcement, model tier range validation, and routing-table consistency checks before any schema or validator code exists.

#### 4.1.2 — Define agent definition JSON Schema
Create `fleet/agents/schema/agent-definition.schema.json` capturing Identity, Authority, Constraints, Tool Registry, Model Tier, Context Injection, Interface Contracts, File Ownership, API Resilience, and Prompt Anatomy metadata sections with all required fields and type constraints.

#### 4.1.3 — Implement the agent definition validator
Create `fleet/agents/schema/validate.sh` (or `validate.ts`) that checks all definition files against the schema, validates tool list disjointness, verifies model tier values are in {1,2,3,4}, and confirms every routing-table agent reference has a corresponding definition file.

#### 4.1.4 — Add CI workflow for fleet validation
Create `.github/workflows/fleet-validation.yml` so the validator runs automatically on every PR and produces clear, field-referenced error messages on failure.

#### 4.1.5 — Create agent definition template generator
Create `fleet/agents/schema/generate-agent.sh` (or `generate-agent.ts`) that scaffolds valid, schema-passing definition file pairs (markdown + JSON) from an agent name and category, with placeholder values and guidance comments throughout.

#### 4.1.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.2: Command Layer Agent Definitions (F-01)
**Branch:** `task/4.2-command-layer-agent-definitions` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.2.1 — Write failing tests (TDD)
Write failing schema validation tests asserting that each of the four command layer agent definition files exists and passes the schema, with specific assertions on required fields such as tier assignment, Authority decision tiers, and interface contracts.

#### 4.2.2 — Define the Orchestrator agent
Create `fleet/agents/definitions/orchestrator.{md,json}` with all five prompt anatomy sections, Tier 1 model assignment, full routing logic, decomposition rules, and handoff interface contracts for every specialist category.

#### 4.2.3 — Define the Triage Agent
Create `fleet/agents/definitions/triage.{md,json}` with Tier 3 model assignment, explicit machine-parseable classification taxonomy, priority levels, and the structured output format consumed by the Orchestrator.

#### 4.2.4 — Define the Mediator agent
Create `fleet/agents/definitions/mediator.{md,json}` with Tier 1 model assignment, explicit conflict detection criteria, resolution strategies, escalation triggers, and interface contracts for receiving conflict reports and emitting resolutions.

#### 4.2.5 — Define the Context Curator agent
Create `fleet/agents/definitions/context-curator.{md,json}` with Tier 2 model assignment, explicit context assembly algorithm, budget allocation rules per priority tier, and the three-question context sufficiency check.

#### 4.2.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.3: Engineering Agent Definitions (F-02)
**Branch:** `task/4.3-engineering-agent-definitions` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.3.1 — Write failing tests (TDD)
Write failing schema validation tests asserting that all backend, frontend, cross-cutting, and infrastructure engineering agent definition files exist, pass the schema, carry Tier 2 assignments, and include explicit Does NOT Do boundaries and file ownership patterns.

#### 4.3.2 — Define backend engineering agents
Create definition file pairs for Backend Implementer, API Designer, Database Agent, Integration Agent, Queue & Messaging Agent, and Cache Strategist under `fleet/agents/definitions/`, each with Tier 2 assignment, negative tool lists, file ownership patterns, and handoff contracts matching `fleet/interface-contracts.md`.

#### 4.3.3 — Define frontend engineering agents
Create definition file pairs for Frontend Implementer, Interaction Designer, Accessibility Auditor, Responsive Layout Agent, State Management Agent, and Design Systems Agent, each with UI-specific tool registries, accessibility requirements, and handoff contracts with design and QA agents.

#### 4.3.4 — Define cross-cutting engineering agents
Create definition file pairs for Refactoring Agent, Dependency Manager, Technical Writer, and Diagram Agent, each with cross-boundary file ownership rules and collaboration contracts that prevent scope conflicts.

#### 4.3.5 — Define infrastructure engineering agents
Create definition file pairs for DevOps Agent, Infrastructure Agent, Containerization Agent, and Observability Agent, each with IaC-specific tool registries and deployment authority appropriately restricted to Propose or Escalate tiers.

#### 4.3.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.4: Quality and Governance Agent Definitions (F-03, F-04)
**Branch:** `task/4.4-quality-governance-agent-definitions` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.4.1 — Write failing tests (TDD)
Write failing schema validation tests asserting that all quality agent definitions include an explicit QA conflict-of-interest constraint and that all governance agent definitions include escalation trigger thresholds and structured finding output formats.

#### 4.4.2 — Define quality agents
Create definition file pairs for QA Agent, Unit Test Writer, E2E Test Writer, Performance Tester, Chaos Agent, and Regression Guardian, each with the explicit conflict-of-interest constraint (never review own work) and rejection handoff contracts matching `fleet/interface-contracts.md` Quality Handoffs.

#### 4.4.3 — Define governance agents
Create definition file pairs for Token Budgeter, Drift Monitor, Hallucination Auditor, Bias Sentinel, Loop Breaker, Context Health Monitor, and Contradiction Detector, each with failure mode detection criteria, Brain query access, structured findings output, and explicit escalation vs. auto-resolve conditions.

#### 4.4.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.5: Specialist and Extended Agent Definitions (F-05 through F-11)
**Branch:** `task/4.5-specialist-extended-agent-definitions` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.5.1 — Write failing tests (TDD)
Write failing schema validation tests asserting correct tier assignments for each specialist category (Incident Response Agent Tier 1, Security Auditor Tier 2 Blocked, scale agents Tier 1, adversarial meta agents Tier 1) and that coverage reaches 100% of the fleet catalog.

#### 4.5.2 — Define lifecycle agents (F-05)
Create definition file pairs for Release Orchestrator, Incident Response Agent (Tier 1), Feature Flag Strategist, and Migration Agent, each with event-driven trigger patterns, appropriate authority tiers for production-impacting decisions, and API resilience policies.

#### 4.5.3 — Define security agents (F-06)
Create definition file pairs for Security Auditor (Tier 2, Blocked degradation policy), Penetration Tester, Compliance Agent, and Privacy Agent, each with OWASP classification familiarity, structured vulnerability reporting format, and trust boundary awareness requirements.

#### 4.5.4 — Define scale agents (F-07)
Create definition file pairs for all 12 scale agents under `fleet/agents/definitions/scale/`, all Tier 1 except Capacity Horizon Scanner (Tier 2), each using the common output schema (analysis_type, scope, findings, confidence_level, methodology, limitations, recommendations, audit_trail).

#### 4.5.5 — Define meta agents (F-08)
Create definition file pairs for Pattern Enforcer and Dependency Sentinel (Tier 3), Role Crystallizer, Devil's Advocate, and Red Team Agent (all Tier 1), plus Simulated User, Persona Agent, Seo Crawler, and UX Researcher, with explicit rules distinguishing constructive adversarial challenge from obstruction.

#### 4.5.6 — Define extended data and domain agents (F-09, F-10)
Create definition file pairs for all data and domain specialization agents under `fleet/agents/definitions/extras/`, with domain-specific compliance requirements (PCI, GDPR), correct tier assignments, and handoff contracts matching `fleet/interface-contracts.md` Domain & Data Handoffs.

#### 4.5.7 — Define ecosystem agents and produce coverage report (F-11)
Create definition file pairs for remaining agents (Copywriter, Contract Test Writer, and any uncovered roles), then produce `fleet/agents/definitions/coverage-report.md` confirming 100% coverage of the 71 core and 34 extended agents with no routing table references to undefined agents.

#### 4.5.8 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.6: Agent Capability Registry (F-13)
**Branch:** `task/4.6-agent-capability-registry` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.6.1 — Write failing tests (TDD)
Write failing tests asserting that the registry generation script produces a valid JSON file containing all 71+ agents, that each entry includes name, capabilities, tool permissions, model tier, file ownership patterns, and availability status, and that the registry becomes stale when a definition file is modified without regenerating.

#### 4.6.2 — Implement the registry generation script
Create `fleet/agents/registry/generate-registry.sh` (or `generate-registry.ts`) that reads all agent definition JSON files as the single source of truth and produces `fleet/agents/registry/agent-registry.json` with all required fields.

#### 4.6.3 — Wire registry regeneration into CI
Configure the CI pipeline and a pre-commit hook to regenerate the registry automatically on any agent definition change, failing the build when the committed registry is out of sync with the definitions.

#### 4.6.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.7: Routing Rules Engine (O-01)
**Branch:** `task/4.7-routing-rules-engine` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.7.1 — Write failing tests (TDD)
Write failing unit tests covering all 86 task-type routing rules, constraint enforcement (no self-review, no Does NOT Do violations), file ownership single- and multi-owner scenarios, capability-match fallback with confidence scoring, and the full fallback chain ending in escalation.

#### 4.7.2 — Implement task-type routing
Create `fleet/routing/engine.ts` and `fleet/routing/rules.json` (generated from `fleet/routing-rules.md`) implementing the primary routing strategy: given a task type, return the primary agent, fallback agent, or escalation signal while enforcing all routing constraints.

#### 4.7.3 — Implement file-ownership routing
Create `fleet/routing/file-ownership.ts` and `fleet/routing/ownership-config.schema.json` implementing project-configurable file path to agent ownership mapping, with a decomposition signal when multiple agents own files in the same task.

#### 4.7.4 — Implement capability-match fallback routing
Create `fleet/routing/capability-match.ts` implementing registry-based capability matching with ranked candidates and confidence scores, escalating when confidence falls below threshold and integrating as the final fallback in the routing chain.

#### 4.7.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.8: Model Tier Selection and Enforcement (O-02)
**Branch:** `task/4.8-model-tier-enforcement` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.8.1 — Write failing tests (TDD)
Write failing tests for SessionStart tier validation (valid, too low, missing assignment), all degradation paths (retry backoff, Degraded fallback, Blocked queuing, no cascading degradation, recovery), and promotion/demotion recommendation thresholds.

#### 4.8.2 — Implement the SessionStart tier validation hook
Create `.hooks/tier_validation.sh` and `.hooks/tests/test_tier_validation.sh` that read the agent's tier assignment from its definition file at session start and reject the session if the instantiated model does not meet the minimum tier.

#### 4.8.3 — Implement the degradation policy engine
Create `fleet/routing/degradation.ts` implementing exponential backoff retry (1s, 2s, 4s, 8s, max 30s, 4 retries), Degraded fallback with doubled governance audit rate and task cap, Blocked queuing with Admiral alert, per-agent overrides, and recovery protocol switching back to primary on the next task after API recovery.

#### 4.8.4 — Implement tier promotion and demotion tracking
Create `fleet/routing/tier-tracking.ts` that records first-pass quality rates, rework costs, and A/B test results per agent per tier, persisting to the Brain and surfacing promotion or demotion recommendations when thresholds defined in `fleet/model-tiers.md` are crossed.

#### 4.8.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.9: Context Injection Pipeline (O-03)
**Branch:** `task/4.9-context-injection-pipeline` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.9.1 — Write failing tests (TDD)
Write failing tests for three-layer context assembly order, context budget enforcement per priority tier, the three-question context sufficiency check, category-specific checklist validation (missing critical vs. missing Identity/Authority/Constraints), and lazy skill file loading triggered by file patterns.

#### 4.9.2 — Implement three-layer context assembly
Create `fleet/context/assembler.ts` that composes Layer 1 (Fleet Context), Layer 2 (Project Context), and Layer 3 (Task Context) in the Identity → Authority → Constraints → Knowledge → Task order defined in `fleet/prompt-anatomy.md`, tracking and enforcing context budget per priority tier.

#### 4.9.3 — Implement category-specific context checklists
Create `fleet/context/checklists.ts` and `fleet/context/checklists.json` that validate the presence of required context items for each agent category at session start, producing warnings for missing optional items and hard errors when Identity, Authority, or Constraints are absent.

#### 4.9.4 — Implement progressive disclosure via skill files
Create `fleet/context/skills.ts` implementing lazy skill file loading triggered by file glob patterns or keywords, consuming context budget from the Medium priority tier, and logging each load event for observability.

#### 4.9.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.10: Handoff Contract Validation and Protocol (O-04, O-05)
**Branch:** `task/4.10-handoff-contract-validation-protocol` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.10.1 — Write failing tests (TDD)
Write failing tests for handoff payload validation against all contract categories, structured rejection with specific field references, repeated-violation (3+) alert triggering, full handoff serialization round-trip, and multi-agent pipeline step failure handling (retry, skip, abort).

#### 4.10.2 — Implement handoff contract validation
Create `fleet/handoff/validator.ts` and `fleet/handoff/contracts.json` (generated from `fleet/interface-contracts.md`) that validate agent-to-agent handoff payloads for all contract types, reject invalid payloads via the Orchestrator with field-specific error messages, and alert on three or more repeated violations for the same agent pair in a session.

#### 4.10.3 — Implement the handoff protocol
Create `fleet/handoff/protocol.ts` and `fleet/handoff/v1.schema.json` implementing context transfer, state serialization, contract validation, and routing for agent-to-agent handoffs, with a metadata extension point supporting governance, security, and domain-specific fields.

#### 4.10.4 — Implement multi-agent pipeline orchestration
Create `fleet/orchestration/pipeline.ts` that executes sequential agent pipelines with validated handoffs at each step, tracks per-step status, handles step failures with structured retry/skip/abort options, and produces a consolidated pipeline trace on completion.

#### 4.10.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.11: Fleet Health Monitoring and Task Decomposition (O-06, O-07)
**Branch:** `task/4.11-fleet-health-monitoring-decomposition` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.11.1 — Write failing tests (TDD)
Write failing tests for metric collection and fleet-wide aggregation, alert threshold crossing and deduplication, dashboard API response shape, task decomposition producing single-agent subtasks, and artificial decomposition detection triggering escalation.

#### 4.11.2 — Implement fleet health monitoring
Create `fleet/monitoring/health.ts` collecting per-agent metrics (utilization, response time, error rate, token consumption, task throughput) and fleet-wide aggregates, exposing them via API for the Control Plane.

#### 4.11.3 — Implement the alert classification system
Create `fleet/monitoring/alerts.ts` implementing CRITICAL/HIGH/MEDIUM/LOW severity classification, deduplication, suppression windows, and severity gating to prevent alert fatigue.

#### 4.11.4 — Implement the task decomposition engine
Create `fleet/orchestration/decomposition.ts` that breaks complex tasks into subtasks with single-agent assignments, acceptance criteria, context file lists, and budget allocations, detecting and escalating artificial splits where a single concern is divided across multiple agents.

#### 4.11.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 4.12: Fleet Scaling, Conflict Resolution, and Agent Lifecycle (O-08, O-09, O-10)
**Branch:** `task/4.12-scaling-conflict-resolution-lifecycle` (branches off `slush/phase-4-fleet-orchestration`)
**PR:** → `slush/phase-4-fleet-orchestration`

#### 4.12.1 — Write failing tests (TDD)
Write failing tests for file ownership conflict detection before task execution, resolution strategy priority ordering (decompose → primary/reviewer → escalate), scaling trigger thresholds and fleet size limits, cooldown period enforcement preventing oscillation, and warm-up latency measurement against cold-start baseline.

#### 4.12.2 — Implement file ownership conflict resolution
Create `fleet/routing/conflict-resolution.ts` that detects overlapping file ownership before task execution and applies resolution strategies in priority order (decompose, designate primary with reviewer, escalate to Architect), logging every resolution decision with rationale.

#### 4.12.3 — Implement fleet scaling policies
Create `fleet/orchestration/scaling.ts` and `fleet/orchestration/scaling-config.schema.json` monitoring queue depth, agent utilization, and task wait times, producing scaling recommendations when triggers fire, enforcing fleet size limits (warn at 12 active specialists, hard limit configurable), and enforcing cooldown periods between scale events.

#### 4.12.4 — Implement agent warm-up and cool-down
Create `fleet/orchestration/lifecycle.ts` that pre-loads Layer 1 and Layer 2 context for anticipated agents before task assignment, releases context after a configurable idle period, restores context correctly on reactivation, and records warm-up latency savings versus cold-start baseline.

#### 4.12.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

## Phase 5: Robustness & Security
**Slush branch:** `slush/phase-5-robustness-security`
**PR to main:** Requires human Admiral approval

### Definition of Done
- All edge case tests (T-05 through T-08) pass, covering server, hooks, state concurrency, and quarantine pipeline
- All SEC-01 through SEC-05 security items are implemented and verified against the full 30-entry attack corpus
- Attack corpus runner executes all 30 ATK entries in a single command and produces a structured JSON report
- `zero_trust_validator.sh` scans all tool responses (not just WebFetch/WebSearch), with CRITICAL severity for MCP-sourced injection
- Cascade containment circuit breakers are implemented and tested with synthetic compromise scenarios
- Data sensitivity (S-20) and security audit trail (S-22) are operational and append-only
- Hook/control-plane bridge (A-02) and unified event log (A-07) are implemented with bidirectional event flow
- CI matrix builds pass on ubuntu and macOS (C-02)
- CodeQL security scanning is active and blocks on high/critical findings (C-03)
- End-to-end integration test stage passes in CI (C-04)
- No open high/critical security findings in dependency audit
- All linters (ShellCheck, ESLint, TypeScript strict) are clean
- CI is fully green on the slush branch before PR to main is opened

---

### Task 5.1: Edge Case & Robustness Testing
**Branch:** `task/5.1-edge-case-robustness-testing` (branches off `slush/phase-5-robustness-security`)
**PR:** → `slush/phase-5-robustness-security`

#### 5.1.1 — Write failing tests (TDD)
Write failing test stubs for all four edge case areas: server malformed-input handling (T-05), hook error handling (T-06), state concurrency under flock (T-07), and quarantine pipeline integration (T-08); all stubs must fail before any implementation is touched.

#### 5.1.2 — Add server edge case tests (T-05)
Extend `control-plane/src/server.test.ts` with at least five new test cases covering URLs with special characters, very long URLs, concurrent requests, and missing required headers, verifying that the server returns appropriate error codes and does not crash or leak resources.

#### 5.1.3 — Add hook edge case tests (T-06)
Extend `.hooks/tests/test_hooks.sh` with at least ten new edge case tests covering malformed JSON, missing `jq`, empty stdin, oversized payloads, Unicode in tool names, and concurrent hook execution, confirming every hook fails open per ADR-004 without panicking.

#### 5.1.4 — Add state concurrency tests (T-07)
Create `admiral/tests/test_state_concurrency.sh` that spawns multiple subshells simultaneously performing read-modify-write operations on shared session state and asserts that `flock`-based locking prevents data loss and corruption across all concurrent writes.

#### 5.1.5 — Add quarantine pipeline integration tests (T-08)
Create `admiral/monitor/quarantine/tests/test_pipeline_integration.sh` covering known-good and known-bad inputs through all five quarantine layers end-to-end, verifying every layer fires correctly and that all attack corpus items are quarantined while clean items pass.

#### 5.1.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 5.2: Attack Corpus Automation (SEC-01)
**Branch:** `task/5.2-attack-corpus-automation` (branches off `slush/phase-5-robustness-security`)
**PR:** → `slush/phase-5-robustness-security`

#### 5.2.1 — Write failing tests (TDD)
Write failing test assertions that verify the attack corpus runner script exists, accepts all 30 ATK entries, produces a structured JSON report, and updates `times_passed`/`times_failed`/`last_tested` metadata fields on each entry.

#### 5.2.2 — Create ATK-0019 through ATK-0030 corpus entries
Author the twelve new attack corpus JSON files (`aiStrat/attack-corpus/ATK-0019.json` through `ATK-0030.json`) covering temporal threats, MCP-specific vectors, A2A cascade attacks, trust transitivity, and Brain poisoning as defined in `admiral/MCP-SECURITY-ANALYSIS.md` Section 8.

#### 5.2.3 — Implement `attack_corpus_runner.sh`
Create `admiral/tests/attack_corpus_runner.sh` that iterates through all 30 ATK entries, injects each trigger into the quarantine pipeline or a simulated agent session, records pass/fail per scenario with severity weighting, updates corpus entry metadata, and writes `admiral/tests/attack_corpus_report.json`.

#### 5.2.4 — Validate spec coverage for all 30 entries
Run the corpus runner in spec-validation mode (no live runtime required) and confirm all 30 entries produce valid structured results; document any entries that require runtime validation and mark them appropriately in the report.

#### 5.2.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 5.3: Injection Defense Layers (SEC-02, SEC-03, SEC-12)
**Branch:** `task/5.3-injection-defense-layers` (branches off `slush/phase-5-robustness-security`)
**PR:** → `slush/phase-5-robustness-security`

#### 5.3.1 — Write failing tests (TDD)
Write failing tests for Layer 1 pattern matching, Layer 2 structural/schema validation, and boundary input validation, covering known attack signatures (ATK-0008, ATK-0011, ATK-0012), encoding bypass attempts, and oversized/null-byte inputs.

#### 5.3.2 — Implement Layer 1 pattern-based input sanitization (SEC-02)
Create or extend `admiral/monitor/quarantine/layer1_patterns.sh` with regex-based detection of imperative instruction overrides, authority claims, Standing Order manipulation, and role reassignment attempts; detection must complete in under 10ms per input and return structured JSON results.

#### 5.3.3 — Implement Layer 2 structural validation (SEC-03)
Create or extend `admiral/monitor/quarantine/layer2_structural.sh` to validate all external inputs (handoff documents, brain entries, hook payloads, event log entries) against their JSON schemas, with encoding normalization to block base64 and Unicode bypass attempts.

#### 5.3.4 — Implement boundary input validation (SEC-12)
Create `control-plane/src/input-validation.ts` and `admiral/lib/input_validation.sh` to enforce maximum input sizes, allowed character sets, and null-byte rejection at every external-facing boundary before any processing occurs; return structured 413-equivalent errors for oversized inputs.

#### 5.3.5 — Write and verify layer-specific test suites
Create `admiral/monitor/quarantine/tests/test_layer1.sh`, `test_layer2.sh`, and `control-plane/src/input-validation.test.ts`, each verifying detection of known attack vectors and a false positive rate below 1% on a benign input corpus.

#### 5.3.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 5.4: Privilege Hardening & Secret Scanning (SEC-04, SEC-05)
**Branch:** `task/5.4-privilege-hardening-secret-scanning` (branches off `slush/phase-5-robustness-security`)
**PR:** → `slush/phase-5-robustness-security`

#### 5.4.1 — Write failing tests (TDD)
Write failing tests for authority tier self-escalation attempts (ATK-0003), tool invocation outside declared allowlists, identity token forgery, and secret pattern detection in brain entry content.

#### 5.4.2 — Implement privilege escalation hardening (SEC-04)
Create `.hooks/privilege_check.sh` that verifies agents cannot modify their own authority tier, cannot invoke tools outside their declared allowlist, and cannot forge or transfer session-scoped identity tokens; every privilege check result is logged to the audit trail.

#### 5.4.3 — Implement secret scanning for brain writes (SEC-05)
Create `admiral/monitor/quarantine/secret_scanner.sh` that detects API keys (`sk-`, `ghp_`, `AKIA` prefixes), JWT tokens, PEM private keys, and credential-bearing connection strings before any brain write completes; detected secrets are quarantined and logged, not stored.

#### 5.4.4 — Write privilege escalation and secret scanner tests
Create `admiral/tests/test_privilege_escalation.sh` verifying ATK-0003 defense and tool allowlist enforcement, and `admiral/monitor/quarantine/tests/test_secret_scanner.sh` verifying detection of all major secret formats with a false positive rate below 2%.

#### 5.4.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 5.5: Data Sensitivity & Security Audit Trail (S-20, S-22)
**Branch:** `task/5.5-data-sensitivity-audit-trail` (branches off `slush/phase-5-robustness-security`)
**PR:** → `slush/phase-5-robustness-security`

#### 5.5.1 — Write failing tests (TDD)
Write failing tests verifying that PII patterns are intercepted before brain writes, that the security audit log receives entries from all hook sources, and that the log is append-only with correct field structure.

#### 5.5.2 — Implement PII detection sanitizer (S-20)
Create `admiral/security/sanitizer.sh` with regex-based detection for email addresses, SSNs, credit card numbers, API keys, and JWT tokens; the sanitizer must run before every brain write operation and produce a sanitization report with a measurable false positive rate below 5%.

#### 5.5.3 — Implement security audit trail (S-22)
Create `admiral/security/audit.sh` and wire it into `.hooks/prohibitions_enforcer.sh` and `.hooks/zero_trust_validator.sh` so that all security-relevant events (blocked tool uses, injection detections, privilege escalation attempts, PII detections, zero-trust failures) are written as structured JSONL entries to `admiral/logs/security.jsonl`.

#### 5.5.4 — Verify audit log append-only behavior and field completeness
Add tests confirming that every audit entry includes timestamp, event type, agent ID, action taken, and details fields, and that no existing entries can be overwritten or deleted by the logging mechanism.

#### 5.5.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 5.6: Hook/Control-Plane Bridge & Unified Event Log (A-02, A-07)
**Branch:** `task/5.6-hook-control-plane-bridge` (branches off `slush/phase-5-robustness-security`)
**PR:** → `slush/phase-5-robustness-security`

#### 5.6.1 — Write failing tests (TDD)
Write failing tests asserting that loop detection events originating in `.hooks/loop_detector.sh` appear in the control plane event stream, that RunawayDetector alerts are readable by hooks as file-based signals, and that both systems share a coherent unified event timeline.

#### 5.6.2 — Implement hook-to-control-plane signal bridge (A-02)
Wire `loop_detector.sh` to write JSONL entries to `event_log.jsonl` and configure the control plane `JournalIngester` to ingest that log; implement file-based signal output from `RunawayDetector` alerts so hooks can read control plane decisions, closing bidirectional visibility.

#### 5.6.3 — Create `admiral/lib/event_log.sh` and unify event writing (A-07)
Create `admiral/lib/event_log.sh` as a single shared event writing library for both hooks and the control plane, ensuring events from both systems land in one JSONL log with a coherent timestamp-ordered timeline visible in the control plane dashboard.

#### 5.6.4 — Verify bidirectional event visibility end-to-end
Write integration tests confirming that a loop detected in hooks produces a control plane event and that a RunawayDetector alert produces a signal readable by the hook layer, with no events lost or duplicated.

#### 5.6.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 5.7: MCP/A2A Security Hardening (SEC-13, SEC-14)
**Branch:** `task/5.7-mcp-a2a-security-hardening` (branches off `slush/phase-5-robustness-security`)
**PR:** → `slush/phase-5-robustness-security`

#### 5.7.1 — Write failing tests (TDD)
Write failing tests verifying that injection patterns in MCP tool responses are detected (ATK-0027 scenario), that detected MCP injections receive CRITICAL severity, and that cascade containment correctly quarantines brain entries and suspends A2A connections upon a synthetic server-compromise signal.

#### 5.7.2 — Extend `zero_trust_validator.sh` to scan all tool responses (SEC-13)
Remove the `WebFetch`/`WebSearch` tool name filter from `.hooks/zero_trust_validator.sh` so that injection marker scanning applies universally to all tool responses; escalate severity to CRITICAL for MCP-sourced injection detections to distinguish compromise signals from expected web injection.

#### 5.7.3 — Implement cascade containment circuit breakers (SEC-14)
Create `admiral/security/circuit_breaker.sh` and `admiral/security/contamination_graph.sh` to automate the containment cascade on MCP server compromise: quarantine affected brain entries, suspend involved A2A connections, and compute a data-lineage contamination graph tracing which agents and entries are potentially tainted.

#### 5.7.4 — Write tests for zero-trust universal scanning and circuit breaker mechanics
Create `admiral/tests/test_zero_trust_all_tools.sh` verifying injection detection in synthetic MCP tool responses and `admiral/tests/test_circuit_breaker.sh` verifying contamination graph computation and containment actions with synthetic compromise scenarios.

#### 5.7.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 5.8: CI Matrix Builds & CodeQL Security Scanning (C-02, C-03)
**Branch:** `task/5.8-ci-matrix-codeql` (branches off `slush/phase-5-robustness-security`)
**PR:** → `slush/phase-5-robustness-security`

#### 5.8.1 — Write failing tests (TDD)
Add CI configuration stubs for the matrix and CodeQL workflows that are structurally valid but will fail on first run due to missing or incorrect job definitions, confirming the baseline before implementation.

#### 5.8.2 — Add matrix CI builds across ubuntu and macOS (C-02)
Extend `.github/workflows/control-plane-ci.yml` and `.github/workflows/hook-tests.yml` to run TypeScript tests and hook tests on both `ubuntu-latest` and `macos-latest`, identifying and fixing any platform-specific divergence in bash utilities (`flock`, `sha256sum`, `date`).

#### 5.8.3 — Add CodeQL security scanning workflow (C-03)
Create `.github/workflows/codeql.yml` to run GitHub CodeQL analysis for TypeScript and bash on every PR and on a weekly schedule, configured to block merges on high or critical severity findings.

#### 5.8.4 — Add dependency vulnerability scanning workflow (SEC-08 prerequisite)
Create `.github/workflows/dependency-audit.yml` running `npm audit` on every PR and on a daily schedule against the main branch, blocking merges on critical or high severity findings and producing a structured JSON report.

#### 5.8.5 — Verify all matrix jobs and security scans pass
Confirm ubuntu and macOS matrix jobs both go green, CodeQL reports no blocking findings, and the dependency audit reports no critical or high vulnerabilities.

#### 5.8.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 5.9: End-to-End Integration Test Stage (C-04)
**Branch:** `task/5.9-integration-test-stage` (branches off `slush/phase-5-robustness-security`)
**PR:** → `slush/phase-5-robustness-security`

#### 5.9.1 — Write failing tests (TDD)
Write failing end-to-end test stubs in `admiral/tests/test_integration_e2e.sh` that assert a running control plane server receives hook-emitted events, that alerts fire and are visible in the event stream, and that a clean server shutdown produces no orphaned processes.

#### 5.9.2 — Implement end-to-end smoke test (C-14 prerequisite)
Create `admiral/tests/test_smoke.sh` and integrate it into `.github/workflows/control-plane-ci.yml` as a smoke test job that starts the control plane server, hits the health endpoint expecting a 200 response, sends a test event, retrieves it back, and shuts down cleanly in under 30 seconds.

#### 5.9.3 — Implement full integration test suite (C-04)
Create `admiral/tests/test_integration_e2e.sh` and `.github/workflows/integration-tests.yml` to exercise the complete hooks-plus-control-plane path: trigger hook execution, verify the resulting events appear in the control plane event stream, verify RunawayDetector alerts fire correctly, and confirm the unified event log contains all expected entries.

#### 5.9.4 — Wire integration tests into CI as a required gate
Configure the integration test workflow to run on every PR targeting the slush branch and main, treating failures as blocking, and confirm the full pipeline (smoke + integration) passes end-to-end.

#### 5.9.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

## Phase 6: Brain Evolution
**Slush branch:** `slush/phase-6-brain-evolution`
**PR to main:** Requires human Admiral approval

### Definition of Done
- All B1 brain utilities (`brain_query`, `brain_record`, `brain_retrieve`, `brain_audit`, `brain_consolidate`, `brain_writer.sh`) have a passing test suite with 20+ tests covering edge cases, CRUD operations, and concurrent access
- B2 SQLite schema is created, versioned, and migration from B1 is idempotent and complete
- SQLite-based `brain_query` returns results in <100ms for 1000+ entries with FTS5 full-text search and backward-compatible CLI interface
- Embedding generation pipeline stores vectors in SQLite with model version tracking; `brain_query --semantic` returns results ranked by similarity
- B3 MCP server scaffold starts, registers all 8 tool endpoints, and responds to `brain_status` and `brain_query`
- Postgres + pgvector schema is deployed, versioned, and migration-tracked
- All brain entries include provenance fields (`source_agent`, `source_type`, `source_server`, `confidence`); queries return provenance metadata and support filtering by provenance trust
- All tests pass, linters are clean, and CI is green across all tasks

---

### Task 6.1: B1 Comprehensive Test Suite (B-06)
**Branch:** `task/6.1-b1-comprehensive-tests` (branches off `slush/phase-6-brain-evolution`)
**PR:** → `slush/phase-6-brain-evolution`

#### 6.1.1 — Write failing tests (TDD)
Author `admiral/tests/test_brain_b1.sh` with 20+ failing test cases covering CRUD operations for `brain_record`, `brain_query`, `brain_retrieve`, `brain_audit`, `brain_consolidate`, and `brain_writer.sh`, including edge cases for empty brain, special characters, invalid inputs, and concurrent access.

#### 6.1.2 — Implement tests for brain_record and brain_query
Write test cases covering record creation with required fields (project, category, title, content, source_agent), category validation, and keyword-based query matching including zero-result edge cases.

#### 6.1.3 — Implement tests for brain_retrieve, brain_audit, and demand signals
Write test cases covering entry retrieval by ID, audit reporting, and demand signal recording when `brain_query` returns zero results including `brain_audit --demand` output validation.

#### 6.1.4 — Implement tests for brain_consolidate
Write test cases covering detection of redundant entries by keyword overlap, merging into a consolidated entry with preserved provenance, and archiving of originals to `.brain/_archived/`.

#### 6.1.5 — Implement tests for brain_writer.sh and concurrent access
Write test cases verifying that `brain_writer.sh` emits correctly structured entries, and that two parallel `brain_record` calls do not corrupt `.brain/` data.

#### 6.1.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 6.2: B2 SQLite Schema and B1-to-B2 Migration (B-07, B-08)
**Branch:** `task/6.2-b2-schema-and-migration` (branches off `slush/phase-6-brain-evolution`)
**PR:** → `slush/phase-6-brain-evolution`

#### 6.2.1 — Write failing tests (TDD)
Author failing tests for schema creation, table structure validation, index presence, migration idempotency, and migration report output covering all B1 entry types and demand signals.

#### 6.2.2 — Create SQLite schema with versioned migration system
Write `admiral/brain/b2/schema.sql` defining `entries`, `links`, `embeddings`, and `demand_signals` tables with indexes on `project`, `category`, and `created_at`, and write `admiral/brain/b2/migrate.sh` with version tracking so schema can evolve without data loss.

#### 6.2.3 — Implement B1-to-B2 migration script
Write `admiral/brain/b2/migrate_from_b1.sh` to parse `.brain/` JSON files, validate required fields, insert into the `entries` table, migrate demand signals from `.brain/_demand/`, and generate a migration report showing counts, skipped entries, and validation warnings.

#### 6.2.4 — Verify idempotency and provenance preservation
Run the migration script twice against a fixture brain and assert that entry counts remain unchanged and all metadata fields (timestamps, source_agent, category) are preserved faithfully.

#### 6.2.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 6.3: B2 SQLite Query Interface (B-09)
**Branch:** `task/6.3-b2-sqlite-query-interface` (branches off `slush/phase-6-brain-evolution`)
**PR:** → `slush/phase-6-brain-evolution`

#### 6.3.1 — Write failing tests (TDD)
Author failing tests for FTS5 keyword search, `--since`/`--until` date range filtering, category and project filters, result limiting, performance assertion (<100ms for 1000+ entries), and backward-compatibility with all existing B1 `brain_query` call signatures.

#### 6.3.2 — Create FTS5-indexed SQLite query script
Write `admiral/brain/b2/query.sh` implementing SQL queries with FTS5 full-text search, date range filtering, category/project filters, and result limiting.

#### 6.3.3 — Update brain_query dispatcher to use B2 when SQLite DB exists
Modify `admiral/bin/brain_query` to detect the presence of the SQLite database and dispatch to `admiral/brain/b2/query.sh`, falling back to the grep-based implementation when only B1 files are present.

#### 6.3.4 — Validate backward compatibility with existing hooks and scripts
Run all existing hooks and scripts that invoke `brain_query` against the B2 backend and confirm output format and exit codes are unchanged.

#### 6.3.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 6.4: B2 Semantic Search — Embeddings and Similarity (B-10, B-11)
**Branch:** `task/6.4-b2-semantic-search` (branches off `slush/phase-6-brain-evolution`)
**PR:** → `slush/phase-6-brain-evolution`

#### 6.4.1 — Write failing tests (TDD)
Author failing tests for embedding generation with at least one backend, vector storage in the `embeddings` table with model version tracking, `brain_query --semantic` returning results ranked by cosine similarity, blended keyword+semantic ranking, and re-embedding behavior on model version change.

#### 6.4.2 — Implement pluggable embedding generation pipeline
Write `admiral/brain/b2/embed.sh` supporting at least one backend (external API or pre-computed vectors), storing output vectors in the `embeddings` table with `model_version`, and operating in offline mode using pre-computed embeddings when no API is available.

#### 6.4.3 — Implement cosine similarity search
Write `admiral/brain/b2/search.sh` computing cosine distance application-side or via a SQLite custom function, returning entries ranked by similarity score for a given query vector.

#### 6.4.4 — Integrate semantic search into brain_query and blend with keyword results
Update `admiral/bin/brain_query` to route `--semantic` queries through `admiral/brain/b2/search.sh` and fuse semantic and keyword relevance scores so that keyword matches boost semantic ranking.

#### 6.4.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 6.5: B3 MCP Server Scaffold (B-12)
**Branch:** `task/6.5-b3-mcp-server-scaffold` (branches off `slush/phase-6-brain-evolution`)
**PR:** → `slush/phase-6-brain-evolution`

#### 6.5.1 — Write failing tests (TDD)
Author failing tests for server startup and port/socket binding, tool registration and discoverability for all 8 endpoints (`brain_record`, `brain_query`, `brain_retrieve`, `brain_strengthen`, `brain_supersede`, `brain_status`, `brain_audit`, `brain_purge`), and valid MCP request/response lifecycle for `brain_status` and `brain_query`.

#### 6.5.2 — Scaffold MCP server entry point and tool registration
Create `admiral/brain/b3/mcp-server/index.ts` with server startup logic, port/socket binding from configuration, and MCP protocol tool registration for all 8 endpoints.

#### 6.5.3 — Implement brain_status and brain_query tool handlers
Write the tool handler modules in `admiral/brain/b3/mcp-server/tools/` for `brain_status` (health and stats response) and `brain_query` (proxies to the B2 query layer), completing the minimum viable request/response cycle.

#### 6.5.4 — Implement stub handlers for remaining six tool endpoints
Add stub implementations for `brain_record`, `brain_retrieve`, `brain_strengthen`, `brain_supersede`, `brain_audit`, and `brain_purge` that return structured not-yet-implemented responses so the server remains fully discoverable.

#### 6.5.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 6.6: B3 Postgres Schema Deployment (B-13)
**Branch:** `task/6.6-b3-postgres-schema` (branches off `slush/phase-6-brain-evolution`)
**PR:** → `slush/phase-6-brain-evolution`

#### 6.6.1 — Write failing tests (TDD)
Author failing tests for schema deployment (tables, pgvector extension, indexes), migration version tracking, forward migration idempotency, rollback capability, and connection pooling configuration validity.

#### 6.6.2 — Create Postgres schema with pgvector and migration tracking
Write `admiral/brain/b3/schema/` SQL migration files defining all tables (entries, links, embeddings, demand_signals), enabling the pgvector extension, creating indexes, and recording migration version in a schema_migrations table.

#### 6.6.3 — Write deployment and rollback scripts
Write `admiral/brain/b3/deploy.sh` to apply migrations in order, verify the schema post-deployment, and support rollback to a previous version without data loss.

#### 6.6.4 — Configure connection pooling
Add connection pooling configuration (pool size, timeout, retry policy) and validate the configuration is loaded correctly at deploy time.

#### 6.6.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 6.7: Provenance-Aware Brain Writes and Queries (B-29)
**Branch:** `task/6.7-provenance-aware-brain` (branches off `slush/phase-6-brain-evolution`)
**PR:** → `slush/phase-6-brain-evolution`

#### 6.7.1 — Write failing tests (TDD)
Author failing tests in `admiral/tests/test_brain_provenance.sh` covering provenance field presence on new entries, correct default confidence values per source classification, provenance metadata returned by `brain_query`, filtering and weighting of results by provenance trust level, and propagation of provenance through the write path for all source types.

#### 6.7.2 — Define provenance schema and confidence defaults
Write `admiral/brain/provenance.sh` defining provenance field structure (`source_agent`, `source_type`, `source_server`, `confidence`), enumerating source classifications (direct observation, derived from MCP tool response, received via A2A, received via handoff), and specifying the default confidence score for each classification.

#### 6.7.3 — Integrate provenance fields into brain_record
Modify `admiral/bin/brain_record` to accept and validate provenance arguments, apply confidence defaults based on source classification when not explicitly supplied, and persist all provenance fields in the written entry.

#### 6.7.4 — Expose provenance metadata in brain_query output
Update `admiral/bin/brain_query` (and the B2/B3 query layers) to include provenance fields in all query results and support `--min-confidence` and `--source-type` filter flags so agents can weight results by provenance trust rather than solely by semantic relevance.

#### 6.7.5 — Validate provenance propagation end-to-end
Run integration tests confirming that entries written by hooks (via `brain_writer.sh`) carry correct provenance, that MCP-derived entries receive lower default confidence than direct-observation entries, and that `brain_query` filtering by source type returns only matching entries.

#### 6.7.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.
---

## Phase 7: MCP & Platform
**Slush branch:** `slush/phase-7-mcp-platform`
**PR to main:** Requires human Admiral approval

### Definition of Done
- MCP server starts and accepts connections via both stdio and HTTP+SSE transports
- All Brain MCP tools (brain_query, brain_record, brain_retrieve, brain_strengthen, brain_audit, brain_purge) are implemented, schema-validated, and role-gated
- All Fleet MCP tools (fleet_status, agent_registry, task_route) are implemented and return structured data
- MCP behavioral baselining hook fires on every PostToolUse invocation and records per-tool metrics
- Trust decay mechanics operate on configurable schedules; missed verification windows reduce trust tier
- Tool manifest snapshots are captured at registration and compared at runtime; schema drift triggers a hard block
- Binary hash verification gates server startup; hash mismatch drops trust to zero and blocks launch
- Canary injection and verification are operational; canary-in-egress detection is active
- Platform adapter interface is defined as a typed TypeScript interface with full JSDoc
- Claude Code adapter refactor is complete; all existing hooks pass the shared adapter test suite unchanged
- Observability foundation is live: structured JSON logging across all hooks and control plane modules, distributed tracing with propagated trace/span IDs, Prometheus-compatible `/metrics` endpoint, and aggregated `/health` endpoint
- All new code is covered by tests; CI pipeline is green; linters report zero violations

---

### Task 7.1: MCP Server Scaffold and Configuration
**Branch:** `task/7.1-mcp-server-scaffold` (branches off `slush/phase-7-mcp-platform`)
**PR:** → `slush/phase-7-mcp-platform`

#### 7.1.1 — Write failing tests (TDD)
Write failing tests for server startup, tool discovery endpoint, concurrent request handling, stdio and HTTP+SSE transport connections, health check endpoint, and configuration schema validation at startup.

#### 7.1.2 — Implement core MCP server
Create `mcp-server/src/server.ts`, `transport.ts`, and `registry.ts` implementing the MCP JSON-RPC protocol with tool discovery, concurrent request handling, and dual-transport support (stdio and HTTP+SSE).

#### 7.1.3 — Implement MCP server configuration system
Create `mcp-server/src/config.ts`, `config.schema.json`, and `config.default.json` to load and validate per-deployment tool enablement, agent-to-tool access mappings, and per-project overrides at startup.

#### 7.1.4 — Implement MCP server health and usage metrics endpoint
Create `mcp-server/src/health.ts` and `mcp-server/src/metrics.ts` exposing a `/health` endpoint with storage backend connectivity status and a metrics API tracking per-tool request counts, latency percentiles, and error rates.

#### 7.1.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 7.2: Brain MCP Tools
**Branch:** `task/7.2-brain-mcp-tools` (branches off `slush/phase-7-mcp-platform`)
**PR:** → `slush/phase-7-mcp-platform`

#### 7.2.1 — Write failing tests (TDD)
Write failing tests for all six Brain tools covering input schema validation, B1 file-based backend behavior, role-based access enforcement (Admiral-only tools reject non-Admiral callers), usefulness score increments, and link traversal depth.

#### 7.2.2 — Implement brain_query and brain_record tools
Create `brain-query.ts` and `brain-record.ts` supporting keyword matching at B1, category and temporal filters for queries, required-field enforcement for records, and duplicate detection on record creation.

#### 7.2.3 — Implement brain_retrieve and brain_strengthen tools
Create `brain-retrieve.ts` (entry fetch with configurable-depth link traversal returning full context chains) and `brain_strengthen.ts` (usefulness score increment with agent attribution).

#### 7.2.4 — Implement brain_audit and brain_purge tools (Admiral-only)
Create `brain-audit.ts` (chronological audit trail filterable by agent, time range, and operation) and `brain-purge.ts` (confirmation-gated permanent deletion with self-audit record), both enforcing Admiral-role-only access at the MCP server middleware layer.

#### 7.2.5 — Define and wire JSON schemas for all Brain tools
Create versioned JSON Schema files under `mcp-server/schemas/` for every Brain tool's input, output, and error surfaces, and enforce schema validation at the server level before tool execution.

#### 7.2.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 7.3: Fleet MCP Tools
**Branch:** `task/7.3-fleet-mcp-tools` (branches off `slush/phase-7-mcp-platform`)
**PR:** → `slush/phase-7-mcp-platform`

#### 7.3.1 — Write failing tests (TDD)
Write failing tests for fleet_status (agent count, task counts, budget summary, active alerts), agent_registry (capability query ranking, availability filtering), and task_route (read-only enforcement, confidence score in response, full routing chain invocation).

#### 7.3.2 — Implement fleet_status tool
Create `fleet-status.ts` returning structured fleet state (active agents, queued tasks, budget utilization, alert summary) with filtering support by agent role, health status, and task state.

#### 7.3.3 — Implement agent_registry tool
Create `agent-registry.ts` accepting free-text or structured capability queries and returning ranked agents with capabilities, availability, model tier, and file ownership patterns.

#### 7.3.4 — Implement task_route tool
Create `task-route.ts` returning a routing recommendation (agent, confidence, fallback) by invoking the full routing chain without executing the assignment, enforcing read-only semantics.

#### 7.3.5 — Define and wire JSON schemas for all Fleet tools
Create versioned JSON Schema files under `mcp-server/schemas/` for fleet_status, agent_registry, and task_route, and enforce schema validation at the server level.

#### 7.3.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 7.4: MCP Authentication, RBAC, and Integration Tests
**Branch:** `task/7.4-mcp-auth-and-tests` (branches off `slush/phase-7-mcp-platform`)
**PR:** → `slush/phase-7-mcp-platform`

#### 7.4.1 — Write failing tests (TDD)
Write failing tests covering token issuance, validation, expiry, revocation (including fleet-wide epoch increment), RBAC enforcement for every tool with authorized and unauthorized callers, and all five MCP test levels (connection, permissions, identity, lifecycle integration, OWASP security).

#### 7.4.2 — Implement identity token issuance and validation
Create `mcp-server/src/auth/tokens.ts` and `auth/middleware.ts` implementing cryptographically signed tokens with agent_id, role, project_id, session_id, and expiry fields, validated on every request with emergency epoch-based fleet-wide revocation.

#### 7.4.3 — Implement role-based access control middleware
Create `mcp-server/src/auth/rbac.ts` and `auth/permissions.json` enforcing per-tool access by caller role from the identity token, rejecting unauthorized calls with a clear error before tool execution.

#### 7.4.4 — Implement MCP test levels 1–3 (connection, permissions, identity)
Create `tests/level1-connection.test.ts`, `level2-permissions.test.ts`, and `level3-identity.test.ts` verifying tool discovery, per-role permission boundaries, and zero-trust identity enforcement across all valid and invalid token scenarios.

#### 7.4.5 — Implement MCP test levels 4–5 (integration and security)
Create `tests/level4-integration.test.ts` (full Brain lifecycle through MCP) and `tests/level5-security.test.ts` (OWASP MCP Top 10: SSRF, injection, excessive permissions, undeclared egress).

#### 7.4.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 7.5: MCP Behavioral Baselining and Trust Decay
**Branch:** `task/7.5-mcp-behavioral-security` (branches off `slush/phase-7-mcp-platform`)
**PR:** → `slush/phase-7-mcp-platform`

#### 7.5.1 — Write failing tests (TDD)
Write failing tests for behavioral baseline recording (response size distribution, latency distribution, egress patterns), anomaly alert firing (new shadow tool, P99 response size exceeded, new egress destination), trust decay on missed verification windows, trust freeze on tool discovery diff, and manifest snapshot mismatch blocking new tools.

#### 7.5.2 — Implement mcp_behavior_monitor PostToolUse hook
Create `.hooks/mcp_behavior_monitor.sh` and `admiral/config/mcp_baselines/` to record per-server per-tool behavioral baselines (response size, latency, egress patterns) into hook_state and fire alerts on statistical anomalies; baselines reset on version update and trigger heightened scrutiny.

#### 7.5.3 — Implement trust decay scheduler
Create `admiral/fleet/mcp_trust_decay.sh` to run scheduled re-verification of MCP servers on a configurable cadence, decay effective trust tier on missed verification windows, and freeze trust on tool discovery diffs pending Level 4–5 re-testing.

#### 7.5.4 — Implement tool manifest snapshot and continuous comparison
Create `admiral/fleet/mcp_manifest_guard.sh` and `admiral/config/mcp_manifests/` to capture cryptographic snapshots of declared tool manifests at registration and compare them at runtime on a configurable interval, blocking new or changed tools until re-vetted.

#### 7.5.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 7.6: Version Hash Verification and Canary Operations
**Branch:** `task/7.6-mcp-hash-canary` (branches off `slush/phase-7-mcp-platform`)
**PR:** → `slush/phase-7-mcp-platform`

#### 7.6.1 — Write failing tests (TDD)
Write failing tests for binary hash recording at server registration, startup block on hash mismatch, trust zeroing on mismatch, canary injection at configurable rate, canary verification on PostToolUse, and canary-in-egress detection.

#### 7.6.2 — Implement binary hash verification gate
Create `admiral/fleet/mcp_hash_verify.sh` to record SHA-256 hashes of server binaries at registration time and verify them before each server startup, blocking launch and dropping trust to zero on mismatch.

#### 7.6.3 — Implement canary operations framework
Create `admiral/fleet/mcp_canary.sh` to inject cryptographically tagged canary markers into a randomized subset of tool invocations via PreToolUse, verify unmodified passage via PostToolUse, and detect canary markers in outbound egress traffic as a data exfiltration signal.

#### 7.6.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 7.7: Platform Adapter Interface and Claude Code Refactor
**Branch:** `task/7.7-platform-adapter-interface` (branches off `slush/phase-7-mcp-platform`)
**PR:** → `slush/phase-7-mcp-platform`

#### 7.7.1 — Write failing tests (TDD)
Write failing tests for the Claude Code adapter covering hook payload translation (Claude Code JSON format to Admiral hook contract), context injection (CLAUDE.md and `.claude/skills/` assembly), configuration loading, event emission, and backward compatibility with all existing hook behaviors.

#### 7.7.2 — Define the abstract platform adapter interface
Create `platform/adapter-interface.ts` as a typed TypeScript interface with JSDoc-documented methods for lifecycle hooks, context injection, tool permission enforcement, configuration loading, event emission, and subagent coordination; each method's contract specifies typed inputs, outputs, and error handling.

#### 7.7.3 — Extract Claude Code-specific logic into the adapter
Create `platform/claude-code/adapter.ts`, `hooks.ts`, `context.ts`, and `config.ts`, consolidating all Claude Code-specific payload formats, `.claude/` directory conventions, and tool names into one adapter module that implements the interface without changing any existing hook behavior.

#### 7.7.4 — Build the shared platform adapter test suite
Create `platform/tests/shared-suite.ts` with standardized test cases for every adapter interface method, verify the Claude Code adapter passes the full suite, and document extension points for adapter-specific tests.

#### 7.7.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 7.8: Observability Foundation — Structured Logging and Distributed Tracing
**Branch:** `task/7.8-observability-logging-tracing` (branches off `slush/phase-7-mcp-platform`)
**PR:** → `slush/phase-7-mcp-platform`

#### 7.8.1 — Write failing tests (TDD)
Write failing tests for structured log output shape (all required JSON fields present on every entry), trace ID propagation across hook invocations and control plane API calls, span parent-child relationships, and trace reconstruction from a session ID.

#### 7.8.2 — Implement structured logging standard
Create `admiral/lib/log.sh` (a `log_structured` function replacing all operational `echo` calls in hooks) and `control-plane/src/logger.ts` (replacing all `console.log` calls), both emitting valid JSON log entries with timestamp, level, component, correlation ID, message, and context fields.

#### 7.8.3 — Migrate existing hooks and control plane to structured logging
Update all existing hook scripts to call `log_structured` for operational output and update all existing control plane modules to use the new logger, leaving no raw echo or console.log for operational events.

#### 7.8.4 — Implement distributed tracing with correlation IDs
Create `admiral/lib/tracing.sh` and `control-plane/src/tracing.ts` generating a trace ID at session start, propagating it with span IDs through every hook invocation and control plane API call, recording span start/end times and status, and exposing a query endpoint to reconstruct the full operation tree for a session ID.

#### 7.8.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 7.9: Observability — Metrics, Health, and Alerting
**Branch:** `task/7.9-observability-metrics-health` (branches off `slush/phase-7-mcp-platform`)
**PR:** → `slush/phase-7-mcp-platform`

#### 7.9.1 — Write failing tests (TDD)
Write failing tests for Prometheus-format `/metrics` output (all required metric names, labels, and histogram buckets), `/health` endpoint response structure (per-component status, degradation details, sub-500ms response when components are unhealthy), alert deduplication within a window, escalation on unacknowledged alerts, and webhook delivery.

#### 7.9.2 — Implement Prometheus-compatible metrics collection
Create `control-plane/src/metrics.ts` and wire a `/metrics` endpoint in `server.ts` collecting hook execution latency histograms, hook pass/fail counters, event throughput, brain query latency, active sessions gauge, and governance overhead ratio with appropriate component/operation/status labels.

#### 7.9.3 — Implement health check aggregation endpoint
Create `control-plane/src/health.ts` and wire a `/health` endpoint in `server.ts` aggregating per-component health probes (hooks, control plane, brain, event log) into a single structured response that always replies within 500ms.

#### 7.9.4 — Implement alert routing, deduplication, and escalation
Create `control-plane/src/alerting.ts` and `admiral/config/alert-rules.json` routing alerts by severity and component to configurable webhook channels, deduplicating repeated alerts within a window, escalating unacknowledged alerts after a timeout, and storing alert history queryable via API.

#### 7.9.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 7.10: Observability — Log Aggregation and SLO Tracking
**Branch:** `task/7.10-observability-logs-slos` (branches off `slush/phase-7-mcp-platform`)
**PR:** → `slush/phase-7-mcp-platform`

#### 7.10.1 — Write failing tests (TDD)
Write failing tests for log query API filtering (time range, component, level, correlation ID, full-text), log rotation bounds (configurable max size and retention), SLO error budget calculation correctness over a 30-day window, and error budget consumption alerts.

#### 7.10.2 — Implement log aggregation and query API
Create `control-plane/src/log-aggregator.ts` centralizing hook and control plane structured logs into an append-only, rotating store, and wire a `/api/logs` endpoint in `server.ts` supporting time range, component, level, correlation ID, and full-text filters with sub-1-second query response for up to 24 hours of logs.

#### 7.10.3 — Implement SLO/SLI definitions and error budget tracking
Create `admiral/docs/slo-definitions.md` specifying measurement methods for all 7 core benchmarks, and create `control-plane/src/slo-tracker.ts` calculating 30-day rolling error budgets, exposing SLO status via API, and firing alerts when budget consumption rate exceeds threshold.

#### 7.10.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.
---

## Phase 8: Governance & Autonomy
**Slush branch:** `slush/phase-8-governance-autonomy`
**PR to main:** Requires human Admiral approval

### Definition of Done
- Governance agent framework (`admiral/governance/base.sh`, `types.sh`) is implemented and instantiates all three core governance agents (Sentinel, Arbiter, Compliance Monitor)
- Governance event bus supports pub/sub with filtering and durable event storage; all governance agents communicate via the bus
- Governance rule engine evaluates threshold, pattern, temporal, and composite rules against fleet event streams with declarative rule configuration
- Governance intervention protocol implements all four escalation levels (Warn, Restrict, Suspend, Terminate) with entry criteria, cooldown, and reversal path
- Governance agent self-governance prevents self-modification (hook-enforced), rate-limits interventions, and runs a meta-Sentinel over governance agents
- Trust level data model covers all four autonomy stages with per-category tracking and full stage transition history
- Trust scoring, promotion, and demotion engines operate correctly; trust persists across sessions via Brain storage with decay enforcement
- Trust-based permission gating dynamically adjusts hook enforcement based on agent trust level per category
- Knowledge graph links Brain entries with all six link types; multi-hop traversal works to at least three hops
- Knowledge maintenance agents (Gardener, Curator, Harvester) produce structured proposal reports and respect the Data Sensitivity Protocol
- Feedback loops connect code review outcomes and test results back to Brain entry strength scores
- Cascade containment circuit breakers (SEC-14) quarantine Brain entries, suspend A2A connections, and produce a contamination graph on MCP server compromise
- A2A payload content inspection (S-44) runs all incoming A2A messages through quarantine Layers 1-2 before execution
- Data classification labels (S-45) are enforced at origin; cross-classification transfers require Admiral approval gates
- All tests pass, all linters are clean, and CI is green across the slush branch before PR to main

---

### Task 8.1: Governance Agent Foundation
**Branch:** `task/8.1-governance-agent-foundation` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.1.1 — Write failing tests (TDD)
Write failing tests for the governance agent base class covering event subscription interface, finding report format, intervention action types, audit log integration, and the self-modification prohibition.

#### 8.1.2 — Implement governance agent base class and types
Create `admiral/governance/base.sh` and `admiral/governance/types.sh` defining the shared interface for all governance agents: event subscription, finding emission, intervention authority levels (warn, restrict, suspend, terminate), and audit trail hooks.

#### 8.1.3 — Enforce self-modification prohibition via hooks
Add a hook guard that prevents governance agents from modifying their own configuration, authority tier, or rule set, logging all blocked attempts to the audit trail.

#### 8.1.4 — Implement governance event bus (MG-05)
Create `admiral/governance/event_bus.sh` with pub/sub support, event filtering by type, agent, and severity, and durable event storage to a log file suitable for audit; include the event schema directory at `admiral/governance/events/`.

#### 8.1.5 — Write governance event bus integration tests
Verify event flow between publisher and subscriber, filtering by all supported dimensions, and durable storage persistence across process restarts.

#### 8.1.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.2: Governance Rule Engine and Intervention Protocol
**Branch:** `task/8.2-rule-engine-intervention` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.2.1 — Write failing tests (TDD)
Write failing tests for the rule engine covering threshold, pattern, temporal, and composite rule types, plus failing tests for each of the four intervention escalation levels.

#### 8.2.2 — Implement the governance rule engine (MG-06)
Create `admiral/governance/rule_engine.sh` that evaluates condition-action rule pairs loaded from `admiral/governance/rules/` configuration files; support threshold, pattern, temporal, and AND/OR composite rule types; log all rule change events with author and rationale.

#### 8.2.3 — Implement the governance intervention protocol (MG-07)
Create `admiral/governance/intervention.sh` implementing the four-level escalation ladder (Warn, Restrict, Suspend, Terminate) with documented entry criteria, cooldown periods, reversal paths, and structured audit records for every intervention.

#### 8.2.4 — Wire rule engine findings into the intervention protocol
Connect rule engine violation signals to the intervention dispatcher so that a rule match automatically selects and executes the appropriate intervention level.

#### 8.2.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.3: Core Governance Agents — Sentinel, Arbiter, Compliance Monitor
**Branch:** `task/8.3-core-governance-agents` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.3.1 — Write failing tests (TDD)
Write failing tests for Sentinel (loop detection, budget monitoring, scope drift, automatic intervention), Arbiter (contradictory outputs, precedence resolution, escalation path), and Compliance Monitor (per-SO compliance scoring, hook bypass detection, degradation trend flagging).

#### 8.3.2 — Implement the Sentinel agent (MG-02)
Create `admiral/governance/sentinel.sh` with cross-session loop detection, per-agent budget burn rate monitoring, scope drift detection over a session, and automatic intervention triggering via the intervention protocol.

#### 8.3.3 — Implement the Arbiter agent (MG-03)
Create `admiral/governance/arbiter.sh` with contradictory output detection, precedence-based and evidence-based conflict resolution, and structured escalation reports to the Admiral when neither strategy resolves the conflict; handle multi-operator directive conflicts per the authority matrix.

#### 8.3.4 — Implement the Compliance Monitor agent (MG-04)
Create `admiral/governance/compliance_monitor.sh` that validates all 16 Standing Orders: verifying hook enforcement is active for mechanically-enforceable SOs, sampling agent outputs for judgment-assisted SOs, and tracking advisory SO compliance trends over time; produce a periodic compliance report with per-SO scores.

#### 8.3.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.4: Governance Self-Governance, Metrics, and Dashboard
**Branch:** `task/8.4-governance-oversight` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.4.1 — Write failing tests (TDD)
Write failing tests for self-governance (self-modification blocked, intervention rate limiting, meta-Sentinel detection of runaway governance), governance metrics computation (all six KPIs), and dashboard rendering with synthetic data.

#### 8.4.2 — Implement governance agent self-governance (MG-09)
Create `admiral/governance/self_governance.sh` that rate-limits governance agent interventions, instantiates a meta-Sentinel over governance agents themselves, and writes governance actions to a separate tamper-evident audit trail that governance agents cannot modify.

#### 8.4.3 — Implement governance metrics and KPIs (MG-10)
Create `admiral/governance/metrics.sh` computing intervention rate, false positive rate, detection latency, resolution time, compliance score trend, and governance overhead; persist metrics across sessions and expose them for export.

#### 8.4.4 — Implement governance audit dashboard (MG-08)
Create `admiral/governance/dashboard.sh` rendering active findings, intervention history, per-SO compliance scores, governance agent health, and false positive rates from governance event bus data in CLI format.

#### 8.4.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.5: Multi-Operator Governance, Operator Handoff, and Fallback Decomposer
**Branch:** `task/8.5-multi-operator-fallback` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.5.1 — Write failing tests (TDD)
Write failing tests for the operator role authority matrix (Owner/Operator/Observer), same-tier conflict resolution (conservative action wins), operator handoff state export/import, and fallback decomposer mode activation and reversion.

#### 8.5.2 — Implement multi-operator governance (MG-11)
Create `admiral/governance/multi-operator.sh` and `admiral/governance/operator-roles.json` enforcing the Owner/Operator/Observer authority matrix, same-tier conservative conflict resolution, and maximum two-to-three operator limits per fleet; Emergency Halt is non-negotiable regardless of role.

#### 8.5.3 — Implement operator handoff procedure (MG-12)
Create `admiral/governance/operator-handoff.sh` that exports complete fleet state (trust calibration, roster, Brain health, task manifest) for incoming operator review, records acknowledgement, and handles identity token revocation for the outgoing operator and renewal for the incoming operator.

#### 8.5.4 — Implement fallback decomposer mode (MG-13)
Create `admiral/governance/fallback-decomposer.sh` that activates when the Orchestrator fails, generates one-to-three macro-tasks, routes only to Tier 1 specialists, enforces serial execution and a five-minute duration limit, and automatically reverts when the Orchestrator recovers.

#### 8.5.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.6: Trust Level Data Model and Scoring Engine
**Branch:** `task/8.6-trust-model-scoring` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.6.1 — Write failing tests (TDD)
Write failing tests for the trust level data model (all four stages, per-category tracking, serialization), trust score calculation (success/failure/partial outcomes at varying severity), and trust persistence round-trip (write in session A, load in session B).

#### 8.6.2 — Implement the trust level data model (AU-01)
Create `fleet/autonomy/trust-model.ts` and `fleet/autonomy/types.ts` representing all four autonomy stages with decision authority mappings, per-category trust tracking fields (`agent_id`, `category`, `current_stage`, `trust_score`, `consecutive_successes`, `consecutive_failures`, `last_exercised`, `stage_transition_history`), and serialization for Brain persistence.

#### 8.6.3 — Implement the trust scoring engine (AU-02)
Create `fleet/autonomy/trust-scoring.ts` that increments trust scores on success (weighted by decision severity), resets category scores on failure, and partially increments on partial success; maintain score history for trend analysis.

#### 8.6.4 — Implement trust persistence with decay (AU-06)
Create `fleet/autonomy/persistence.ts` that reads and writes trust state to the Brain at session boundaries, writes immediately on trust state changes, and fires trust decay for categories not exercised within the configured inactivity window.

#### 8.6.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.7: Trust Promotion, Demotion, Permission Gating, and Routing
**Branch:** `task/8.7-trust-gates-routing` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.7.1 — Write failing tests (TDD)
Write failing tests for trust-based permission gating (same action requires approval at Stage 1, executes autonomously at Stage 3), automatic demotion triggers (critical failure, model change, security incident), promotion prerequisite verification, and trust-aware routing (sensitive tasks blocked from low-trust agents).

#### 8.7.2 — Implement automatic trust demotion (AU-04)
Create `fleet/autonomy/demotion.ts` that fires category-specific demotion on failure, triggers fleet-wide revert to Stage 2 on major model changes, and triggers fleet-wide Stage 1 for security categories on a security incident; all demotion events are logged with reason and previous stage.

#### 8.7.3 — Implement automatic trust promotion (AU-05)
Create `fleet/autonomy/promotion.ts` that detects when graduation criteria are met (rubber-stamping signal, exception rate threshold, minimum observation period, no recent critical failures), surfaces a promotion recommendation to the operator, and records the promotion decision with full context on approval.

#### 8.7.4 — Implement trust-based permission gating (AU-03)
Create `fleet/autonomy/permission-gate.ts` and `.hooks/trust_gate.sh` so that hooks dynamically check the agent's trust level per category and allow autonomous execution when trust is sufficient, with configurable Propose/Autonomous boundaries per category.

#### 8.7.5 — Implement trust-aware routing (AU-09)
Create `fleet/autonomy/trust-routing.ts` that extends the routing engine to enforce minimum trust stage thresholds for sensitivity-annotated tasks, prefer higher-trust agents among qualifying candidates, and escalate when no agent meets the threshold.

#### 8.7.6 — Implement human trust override (AU-08)
Create `fleet/autonomy/override.ts` enforcing that any operator may demote but only Owner-level operators may promote beyond Stage 2; every override requires a reason string and is persisted in the Brain with full context; the dashboard distinguishes earned from overridden trust changes.

#### 8.7.7 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.8: Trust Dashboard and Reporting
**Branch:** `task/8.8-trust-dashboard-reporting` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.8.1 — Write failing tests (TDD)
Write failing tests for trust dashboard rendering (per-agent trust by category, trends, decay warnings, the autonomy matrix), and trust analytics reports (fleet distribution, trust velocity, demotion frequency, cost correlation, override frequency).

#### 8.8.2 — Implement the trust dashboard (AU-07)
Create `fleet/autonomy/dashboard.ts` and `fleet/autonomy/dashboard-api.ts` rendering per-agent trust levels by category with trend indicators, promotion and demotion history, upcoming graduation signals, trust decay warnings at 25 days of inactivity, and the full autonomy matrix; expose data via API for the Fleet Control Plane.

#### 8.8.3 — Implement trust reporting and analytics (AU-10)
Create `fleet/autonomy/reporting.ts` generating weekly trust distribution reports covering fleet stage distribution, trust velocity, demotion pattern analysis, trust-cost correlation, and operator override frequency; store reports in the Brain as structured JSON with human-readable markdown counterparts.

#### 8.8.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.9: Knowledge Graph and Brain Link Infrastructure
**Branch:** `task/8.9-knowledge-graph` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.9.1 — Write failing tests (TDD)
Write failing tests for all six link types (`supports`, `contradicts`, `supersedes`, `related_to`, `derived_from`, `caused_by`), bidirectional traversal, multi-hop queries to at least three hops, and link strength adjustment on outcome data.

#### 8.9.2 — Create the entry links database schema (DE-01)
Create `admiral/brain/schema/entry_links.sql` adding the `entry_links` table with columns for link type, confidence score, and directionality to the existing Brain schema.

#### 8.9.3 — Implement the knowledge graph link interface (DE-01)
Create `admiral/brain/links.sh` exposing create-link, traverse-link (bidirectional), and multi-hop query operations; integrate with the existing `brain_query` interface so link-aware queries work transparently.

#### 8.9.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.10: Knowledge Maintenance Agents — Gardener, Curator, Harvester
**Branch:** `task/8.10-knowledge-maintenance-agents` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.10.1 — Write failing tests (TDD)
Write failing tests for each Gardener detection category (stale, contradictions, near-duplicates, orphans, metadata gaps), each Curator improvement type (metadata enrichment, format standardization, description enhancement, link suggestion, quality scoring), and Harvester extraction from each source type (diff, PR description, commit message, review comment) plus sensitive data rejection.

#### 8.10.2 — Implement the Knowledge Gardener agent (DE-02)
Create `admiral/brain/gardener.sh` that detects stale entries, contradictory entry pairs, near-duplicate entries (cosine similarity above threshold), orphaned entries, and metadata gaps; produce a structured maintenance report with recommended actions using Propose-tier output only (no autonomous modification).

#### 8.10.3 — Implement the Knowledge Curator agent (DE-03)
Create `admiral/brain/curator.sh` that proposes metadata enrichment, format standardization, description improvements, new link suggestions, and quality scores (0-1) for Brain entries; all outputs are improvement proposals, not direct edits.

#### 8.10.4 — Implement the Knowledge Harvester agent (DE-04)
Create `admiral/brain/harvester.sh` that extracts knowledge proposals from git diffs, PR descriptions, commit messages, and code review comments; format proposals as Brain entries with source attribution; filter all output through the Data Sensitivity Protocol to prevent PII or credentials from entering the Brain.

#### 8.10.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.11: Feedback Loops — Code Review and Test Outcomes
**Branch:** `task/8.11-feedback-loops` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.11.1 — Write failing tests (TDD)
Write failing tests for the full code review feedback loop (Brain entry queried, code accepted in review, entry strengthened; code rejected, entry weakened with reason), the full test outcome feedback loop (test pass strengthens entry, test fail weakens entry and proposes a lesson entry), and high-rejection-rate flagging above fifty percent.

#### 8.11.2 — Implement the code review feedback loop (DE-05)
Create `admiral/brain/feedback/review_loop.sh` that captures code review accept and reject events, links them to the Brain entries that influenced the reviewed code, updates entry strength scores accordingly, and flags entries with rejection rates above fifty percent for supersession.

#### 8.11.3 — Implement the test outcome feedback loop (DE-06)
Create `admiral/brain/feedback/test_loop.sh` that links test pass and fail events to the Brain entries that influenced the code under test, updates entry strength scores, and proposes new Brain lesson entries when test failures reveal knowledge gaps.

#### 8.11.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.12: Cascade Containment Circuit Breakers (SEC-14)
**Branch:** `task/8.12-cascade-containment` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.12.1 — Write failing tests (TDD)
Write failing tests for automated containment on MCP server compromise: Brain entry quarantine (entries excluded from queries but not deleted), A2A connection suspension for affected agents, and contamination graph computation tracing data lineage through agents and Brain entries.

#### 8.12.2 — Implement the contamination graph tracer
Create `admiral/security/contamination_graph.sh` that, given a flagged MCP server, traces data lineage through all agents that consumed its outputs, through Brain entries those agents wrote, and through agents that subsequently read those entries; produce a structured contamination graph.

#### 8.12.3 — Implement the cascade containment circuit breaker (SEC-14)
Create `admiral/security/circuit_breaker.sh` that on compromise detection: marks implicated Brain entries as quarantined and excludes them from query results, suspends A2A connections for affected agents, invokes the contamination graph tracer, and completes the full containment sequence within hook chain response time.

#### 8.12.4 — Write integration tests verifying end-to-end cascade mechanics
Verify with synthetic compromise scenarios that Brain quarantine, A2A suspension, and contamination graph output are all produced correctly when the circuit breaker fires.

#### 8.12.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.13: A2A Payload Content Inspection (S-44)
**Branch:** `task/8.13-a2a-content-inspection` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.13.1 — Write failing tests (TDD)
Write failing tests for A2A message quarantine Layer 1 (injection pattern detection) and Layer 2 (schema validation), behavioral anomaly flagging on statistically unusual outputs, and taint tracking recording agent contribution chains.

#### 8.13.2 — Implement A2A payload content inspection (S-44)
Create `admiral/protocols/a2a_content_inspector.sh` that passes all incoming A2A messages through quarantine Layers 1 and 2 before execution, flags output anomalies against behavioral baselines, and attaches taint flags recording which agents contributed to each payload up to the configured maximum taint depth.

#### 8.13.3 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 8.14: Data Classification Tags and Cross-Server Flow Control (S-45)
**Branch:** `task/8.14-data-classification` (branches off `slush/phase-8-governance-autonomy`)
**PR:** → `slush/phase-8-governance-autonomy`

#### 8.14.1 — Write failing tests (TDD)
Write failing tests for label assignment at origin, server sensitivity ceiling enforcement (data above ceiling is rejected), cross-classification transfer gating (requires Admiral approval), and provenance tracking following data through the pipeline.

#### 8.14.2 — Define data classification labels and server sensitivity configuration (S-45)
Create `admiral/protocols/data_classification.sh` defining the four sensitivity labels (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`) and `admiral/config/server_sensitivity.json` mapping each MCP server to its maximum receiving sensitivity level.

#### 8.14.3 — Implement cross-classification transfer approval gates
Extend `data_classification.sh` so that any data flow from a higher-sensitivity origin to a lower-sensitivity destination is intercepted and requires explicit Admiral authorization before proceeding; attach provenance metadata to all data objects flowing through the pipeline.

#### 8.14.4 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.
---

## Phase 9: Strategic & Excellence
**Slush branch:** `slush/phase-9-strategic-excellence`
**PR to main:** Requires human Admiral approval

### Definition of Done
- At least 5 compliance crosswalk documents published under `docs/compliance/` covering OWASP Agentic Top 10, NIST SP 800-207, Forrester AEGIS, KPMG TACO, McKinsey Agentic Organization, and Singapore IMDA
- Simulation harness replays 10+ recorded hook sequences with deterministic, byte-identical results
- Chaos test suite exercises 20+ failure scenarios and every hook survives with fail-open behavior
- End-to-end session simulation covers 50+ tool cycles with consistent state, accurate token counts, and correct loop detection
- All 6 automated code review check categories (QA-01) are implemented and running in CI in under 30 seconds
- Test skeleton generator (QA-02) produces parseable skeletons for both `.ts` and `.sh` files
- Multi-stage quality pipeline (QA-03) runs all 6 stages in order and stops on Blocker failures
- Quality metrics collected (QA-04) for all modules, covering 6 metric types with timestamps
- Quality trend analyzer (QA-05) detects declining trends and generates actionable, module-scoped alerts
- Rating system JSON schema (RT-01) represents all tiers, dimensions, cap rules, and gate requirements
- Rating calculation script (RT-02) produces a truthful, reproducible Rating Report against the homebase repo
- Rating CI job (RT-03) runs on every governance-impacting change, stores historical artifacts, and posts PR summaries
- Rating badges (RT-04) generate correct SVG for all 5 tiers with color coding and certification suffix
- Rating history (RT-05) stored as append-only JSONL with per-dimension tracking and plateau detection
- Thesis metrics definition (TV-01) states both thesis claims with null hypotheses, measurable metrics, and evidence thresholds
- A/B advisory-vs-enforcement framework (TV-02) can run the same task in both modes and collect 5 defined metrics
- At least 5 case studies (TV-03) documented from real Admiral usage with counterfactual analysis
- Longitudinal quality tracking (TV-04) correlates governance milestones with quality changes across at least 3 milestones
- Developer experience survey framework (TV-05) is defined, scored, and has a completed baseline survey
- All tests pass, linters are clean, and CI is green

---

### Task 9.1: Compliance Crosswalk Documents
**Branch:** `task/9.1-compliance-crosswalks` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.1.1 — Write failing tests (TDD)
Write a shell test suite that asserts each expected compliance document exists under `docs/compliance/`, contains required section headings (risk mapping, gap analysis, coverage summary), and cross-references specific Standing Order clauses and hook file paths that must be present; all assertions fail because the documents do not yet exist.

#### 9.1.2 — Author OWASP Agentic Top 10 crosswalk (R-01)
Create `docs/compliance/owasp-agentic-mapping.md` mapping each OWASP Agentic Top 10 risk to the specific Standing Order clauses, hook implementations, and architectural decisions that mitigate it, with an honest gap analysis for any partially-covered risks.

#### 9.1.3 — Author NIST Zero Trust alignment (R-04)
Create `docs/compliance/nist-zero-trust.md` mapping Admiral identity tokens and access control mechanisms to NIST SP 800-207 sections and SPIFFE/SPIRE identity concepts, articulating where Admiral enforces zero trust and where traditional trust boundaries remain.

#### 9.1.4 — Author Forrester AEGIS crosswalk (R-02)
Create `docs/compliance/aegis-crosswalk.md` mapping Admiral to all 6 AEGIS domains and 39 controls with per-domain coverage percentages and full/partial/planned status for every control.

#### 9.1.5 — Author KPMG TACO tagging document (R-03)
Create `docs/compliance/taco-tagging.md` classifying all 71 agent roles defined in the Admiral spec into TACO categories (Taskers, Automators, Collaborators, Orchestrators) with a coverage summary and rationale for non-obvious assignments.

#### 9.1.6 — Author McKinsey Agentic Organization mapping (R-05)
Create `docs/compliance/mckinsey-mapping.md` mapping Admiral's 11 spec parts to McKinsey's 5 pillars of the Agentic Organization and demonstrating how Admiral governance agents realize McKinsey's concept of embedded control agents.

#### 9.1.7 — Author Singapore IMDA regulatory alignment (R-06)
Create `docs/compliance/imda-alignment.md` mapping Admiral's Tool & Capability Registry to IMDA's action-space concept and Decision Authority Tiers to IMDA autonomy levels, producing a document suitable for enterprise procurement review in Singapore-regulated industries.

#### 9.1.8 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 9.2: Simulation Testing (X-01)
**Branch:** `task/9.2-simulation-testing` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.2.1 — Write failing tests (TDD)
Write a test harness that asserts `admiral/simulation/replay.sh` exists, accepts a recording path argument, produces byte-identical output on two consecutive replays of the same sequence, and emits a clear diff on divergence; all assertions fail because the files do not yet exist.

#### 9.2.2 — Build hook invocation recorder
Implement the recording mechanism that captures real hook invocation sequences (input payload, environment variables, and output) to timestamped files under `admiral/simulation/recordings/` during test or live sessions.

#### 9.2.3 — Implement deterministic replay harness
Create `admiral/simulation/replay.sh` that feeds a recorded sequence through the hook pipeline, normalizes non-deterministic values (timestamps, process IDs, random seeds), and asserts byte-identical output across runs.

#### 9.2.4 — Seed 10+ recorded sequences and validate replay
Record at least 10 diverse hook invocation sequences (spanning PreToolUse, PostToolUse, and SessionStart), replay each twice, and confirm zero divergence; document any identified sources of non-determinism and their normalization strategy.

#### 9.2.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 9.3: Chaos Testing for Hooks (X-02)
**Branch:** `task/9.3-chaos-testing` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.3.1 — Write failing tests (TDD)
Write a test that asserts `admiral/tests/chaos/chaos_runner.sh` exists, can enumerate scenario files in `admiral/tests/chaos/scenarios/`, executes each scenario, and verifies that the hook under test exits cleanly with fail-open behavior; all assertions fail because neither the runner nor the scenarios exist.

#### 9.3.2 — Build chaos runner framework
Create `admiral/tests/chaos/chaos_runner.sh` that discovers scenario scripts, injects each failure condition into the hook execution environment, captures exit codes and output, and produces a structured pass/fail report per scenario.

#### 9.3.3 — Implement 20+ failure scenario scripts
Create individual scenario files under `admiral/tests/chaos/scenarios/` covering: missing `jq`, corrupted state file, 1MB+ payload, simulated slow disk, concurrent hook execution, read-only filesystem, missing environment variables, and malformed JSON input, among others, each documenting its failure mode, expected behavior, and actual behavior.

#### 9.3.4 — Verify fail-open compliance across all scenarios
Run the full chaos suite against every hook and confirm that no hook causes Claude Code to hang, crash, or block the developer workflow under any chaos condition; document any failures found and remediate them before this subtask is marked complete.

#### 9.3.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 9.4: End-to-End Session Simulation (X-03)
**Branch:** `task/9.4-e2e-session-simulation` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.4.1 — Write failing tests (TDD)
Write a test that asserts `admiral/tests/test_e2e_session.sh` exists, executes without error, and produces a structured result verifying session state consistency, correct token accumulation, loop detection firing at the right threshold, and uncorrupted brain entries; all assertions fail because the script does not yet exist.

#### 9.4.2 — Build session lifecycle simulator
Create `admiral/tests/test_e2e_session.sh` that fires a SessionStart hook, then drives 50+ synthetic PreToolUse/PostToolUse cycles across diverse tool types (Bash, Read, Write, Edit, Grep) with realistic payloads.

#### 9.4.3 — Add state consistency and token tracking assertions
After the simulated session, assert that state file is well-formed JSON, token counts accumulated correctly across all cycles, and no state corruption occurred at any point.

#### 9.4.4 — Validate loop detection and brain persistence
Assert that the loop detection mechanism fires when the synthetic input crosses the configured threshold, and that brain entries written during the simulation are readable and intact after the session completes.

#### 9.4.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 9.5: Quality Assurance — Automated Code Review and Test Generation (QA-01, QA-02)
**Branch:** `task/9.5-qa-code-review-test-gen` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.5.1 — Write failing tests (TDD)
Write tests for `admiral/quality/code_review.sh` asserting it detects each of the 6 check categories (naming convention, cyclomatic complexity, test presence, import hygiene, documentation presence, file size), assigns correct severity levels, and produces output matching the Part 7 QA Issue Report template; write tests for `admiral/quality/test_generator.sh` asserting it produces parseable test skeletons with edge case placeholders for both `.ts` and `.sh` inputs; all assertions fail because neither script exists.

#### 9.5.2 — Implement 6-category automated code review
Create `admiral/quality/code_review.sh` and `admiral/config/review_rules.json` implementing all 6 check categories with configurable thresholds, Blocker/Major/Minor/Cosmetic severity assignment, and structured output in the Part 7 QA Issue Report format.

#### 9.5.3 — Validate review runs within 30 seconds and meets false-positive target
Run the code review against representative changesets, measure wall-clock execution time, and confirm it completes under 30 seconds; manually evaluate false positive rate against 20+ sample cases and confirm it is below 5%.

#### 9.5.4 — Implement test skeleton generator
Create `admiral/quality/test_generator.sh` and template files (`admiral/quality/templates/test_template.ts`, `admiral/quality/templates/test_template.sh`) that analyze public API surface of a given source file and emit a compilable/parseable test skeleton with describe/it blocks and edge case placeholders.

#### 9.5.5 — Integrate both tools into CI
Add CI steps that run the automated code review on every PR and invoke the test generator for any newly created source file that lacks a corresponding test file.

#### 9.5.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 9.6: Quality Assurance — Pipeline, Metrics, and Trend Analysis (QA-03, QA-04, QA-05)
**Branch:** `task/9.6-qa-pipeline-metrics-trends` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.6.1 — Write failing tests (TDD)
Write tests for `admiral/quality/pipeline.sh` asserting the 6 stages run in order, the pipeline halts on the first Blocker failure, and the final output is a summary JSON with per-stage pass/fail and timing; write tests for `admiral/quality/metrics_collector.sh` asserting all 6 metric types are collected per module with timestamps; write tests for `admiral/quality/trend_analyzer.sh` asserting declining trends over 3+ consecutive periods are detected and alerts include module, metric, magnitude, and commits; all assertions fail because the scripts do not yet exist.

#### 9.6.2 — Implement multi-stage quality pipeline
Create `admiral/quality/pipeline.sh` that runs Lint, Type-check, Test, Coverage, Security, and Review stages in sequence, halts on Blocker-severity failures, collects full reports for non-Blocker issues, and produces a summary JSON with per-stage results and timing.

#### 9.6.3 — Implement quality metrics collector
Create `admiral/quality/metrics_collector.sh` and `admiral/quality/metrics/` directory structure to gather per-module cyclomatic complexity, test coverage percentage, code churn rate, defect density, lint violation count, and test-to-code ratio, storing results as timestamped JSON.

#### 9.6.4 — Implement quality trend analyzer
Create `admiral/quality/trend_analyzer.sh` that computes moving averages over configurable windows, detects 3+ consecutive declining measurement periods, generates structured alerts naming the module, metric, magnitude, and causative commits, and produces both human-readable and JSON trend reports.

#### 9.6.5 — Wire pipeline, metrics, and trends into CI
Add CI jobs that run the quality pipeline on every PR, collect metrics and append to the historical store on every merge to the slush branch, and run trend analysis on a scheduled cadence.

#### 9.6.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 9.7: Rating System — Data Model and Calculation (RT-01, RT-02)
**Branch:** `task/9.7-rating-data-model-calculation` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.7.1 — Write failing tests (TDD)
Write tests for `admiral/rating/schema/rating_model.json` asserting it is valid JSON Schema, contains all 5 rating tiers, all 7 core dimensions, all hard cap rules, and all Human Judgment Gate requirements from the reference; write tests for `admiral/rating/calculate_rating.sh` asserting it collects or marks as insufficient all 7 core benchmarks, applies hard caps correctly, and produces a Rating Report in the reference format; all assertions fail because the files do not yet exist.

#### 9.7.2 — Define rating system data model
Create `admiral/rating/schema/rating_model.json` encoding the 5 tiers (ADM-1 through ADM-5), 7 core evaluation dimensions with their Phase 1 metric thresholds, hard cap rules, Human Judgment Gate requirements, and certification tier suffixes (-SA, -IA).

#### 9.7.3 — Implement automated rating calculation script
Create `admiral/rating/calculate_rating.sh` that collects the 7 core benchmarks from operational data (marking any without sufficient data as "insufficient data" with a collection plan), applies hard cap logic from the data model, and produces a Rating Report in the reference format (ENTITY, CATEGORY, RATING, EVIDENCE SUMMARY, GATE VERDICTS, RATIONALE, CONDITIONS, RECOMMENDED IMPROVEMENTS).

#### 9.7.4 — Run self-assessment against homebase repo and validate truthfulness
Execute the rating calculation script against the current homebase repository, review the produced Rating Report for accuracy against observable facts (expected result is ADM-4 or ADM-5), and confirm that hard caps are applied and evidence summaries cite real artifacts.

#### 9.7.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 9.8: Rating System — CI Integration, Badges, and History (RT-03, RT-04, RT-05)
**Branch:** `task/9.8-rating-ci-badges-history` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.8.1 — Write failing tests (TDD)
Write tests for the CI workflow asserting the rating job runs and stores an artifact; write tests for `admiral/rating/badge_generator.sh` asserting it produces valid SVG with correct color coding and certification suffix for all 5 tier inputs; write tests for `admiral/rating/history_tracker.sh` asserting it appends to a JSONL file without modifying prior entries, tracks all 7 per-dimension scores, and produces a trend summary for configurable time windows; all assertions fail because the files do not yet exist.

#### 9.8.2 — Implement rating CI job
Create `.github/workflows/rating-ci.yml` and `admiral/rating/ci_report.sh` to run the rating calculation on every governance-impacting PR and on a weekly schedule, compare results against the previous stored rating, alert on regressions, store results as CI artifacts, and post a rating summary comment on PRs.

#### 9.8.3 — Implement rating badge generator
Create `admiral/rating/badge_generator.sh` and `admiral/rating/badges/` directory that generates SVG badges with tier-appropriate color coding (gold/green/blue/yellow/red) and the certification tier suffix, updating automatically from the latest CI rating result.

#### 9.8.4 — Implement rating history tracker
Create `admiral/rating/history_tracker.sh` and `admiral/rating/history/rating_log.jsonl` as an append-only log that captures every rating calculation with timestamp, all 7 per-dimension scores, and linkage to the causative commit; implement plateau detection that identifies when the rating has been static for an extended period and suggests specific actions.

#### 9.8.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 9.9: Thesis Validation — Metrics Definition and A/B Framework (TV-01, TV-02)
**Branch:** `task/9.9-thesis-metrics-ab-framework` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.9.1 — Write failing tests (TDD)
Write tests asserting `admiral/thesis/metrics_definition.md` exists and contains both thesis claims with null hypotheses and evidence thresholds; write tests for `admiral/thesis/ab_framework.sh` asserting it accepts a task definition and mode flag (advisory/enforcement), executes the task under the specified mode, and writes a structured result JSON with all 5 required metrics to `admiral/thesis/results/`; all assertions fail because the files do not yet exist.

#### 9.9.2 — Define thesis metrics with null hypotheses and evidence thresholds
Create `admiral/thesis/metrics_definition.md` and `admiral/thesis/metrics_schema.json` specifying measurable metrics for both thesis claims ("deterministic enforcement beats advisory guidance" and "AI agents can be governed as a workforce"), with null hypothesis statements, evidence-for thresholds, evidence-against thresholds, and concrete measurement methods.

#### 9.9.3 — Implement A/B advisory-vs-enforcement comparison framework
Create `admiral/thesis/ab_framework.sh` that runs a given task under advisory mode (hooks warn but do not block) and enforcement mode (hooks hard-block), collecting violation rate, violation severity, first-pass quality, task completion time, and escalation rate for each run, and storing structured result JSON under `admiral/thesis/results/`.

#### 9.9.4 — Run 10+ task pairs through both modes and verify result structure
Execute at least 10 identical task definitions through both advisory and enforcement modes, confirm all 5 metrics are captured per run, and verify the result files conform to the metrics schema; document the minimum sample size required for statistical significance.

#### 9.9.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 9.10: Thesis Validation — Case Studies and Quality Tracking (TV-03, TV-04)
**Branch:** `task/9.10-thesis-case-studies-quality-tracking` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.10.1 — Write failing tests (TDD)
Write tests asserting `admiral/thesis/case_study_index.json` exists and references at least 5 case study files each with the required fields (task, agent action, hook fired, counterfactual, estimated impact, true/false-positive classification); write tests for `admiral/thesis/quality_tracking.sh` asserting it appends a timestamped quality snapshot to a log and correlates milestones with before/after quality changes; all assertions fail because the files do not yet exist.

#### 9.10.2 — Define case study template and document 5 real cases
Create `admiral/thesis/case_studies/template.md` with fields for task context, agent action, hook that fired, counterfactual analysis, estimated impact, and true/false-positive classification; then document at least 5 case studies drawn from actual Admiral development usage in `admiral/thesis/case_studies/`.

#### 9.10.3 — Build case study index
Create `admiral/thesis/case_study_index.json` referencing all documented case studies with aggregate true-positive and false-positive counts, enabling programmatic analysis of enforcement accuracy.

#### 9.10.4 — Implement longitudinal quality tracking
Create `admiral/thesis/quality_tracking.sh` and `admiral/thesis/milestones.json` to record first-pass quality rate, defect density, escalation rate, and governance coverage percentage at each governance milestone, with trend visualization showing quality and governance coverage trajectories correlated across at least 3 annotated milestones.

#### 9.10.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 9.11: Thesis Validation — Developer Experience Survey (TV-05)
**Branch:** `task/9.11-thesis-dev-experience-survey` (branches off `slush/phase-9-strategic-excellence`)
**PR:** → `slush/phase-9-strategic-excellence`

#### 9.11.1 — Write failing tests (TDD)
Write tests asserting `admiral/thesis/surveys/template.md` exists and contains scored questions covering friction, trust, productivity impact, and perceived value; assert `admiral/thesis/surveys/scoring.md` defines the governance NPS calculation; assert `admiral/thesis/surveys/results/` directory exists with at least one completed baseline result file; all assertions fail because the files do not yet exist.

#### 9.11.2 — Define survey template and scoring methodology
Create `admiral/thesis/surveys/template.md` with scored and open-ended questions completable in under 5 minutes covering friction, trust, productivity impact, and perceived value; create `admiral/thesis/surveys/scoring.md` documenting the governance-adapted Net Promoter Score calculation and qualitative feedback categories (what helps, what hinders, what's missing).

#### 9.11.3 — Document administration process and results storage format
Define the quarterly survey cadence, anonymization mechanism, and the JSON structure for `admiral/thesis/surveys/results/` so that results accumulate and can be trended across administrations.

#### 9.11.4 — Complete and store a baseline survey
Conduct the first administration of the survey (Admiral self-assessment, N=1 minimum), store the result in the defined format, and confirm the scoring script produces a valid governance NPS from the baseline data.

#### 9.11.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

## Phase 10: Future-Proofing
**Slush branch:** `slush/phase-10-future-proofing`
**PR to main:** Requires human Admiral approval

### Definition of Done
- Agent definitions carry semantic version numbers; running sessions are unaffected by mid-session definition changes; rollback to a prior version works without disrupting active sessions
- Agent marketplace package schema is defined and prototype `publish`/`install` workflow exists with at least two example packages
- Plugin manifest schema covers all three extension points (hook, agent, integration); lifecycle management works; plugin loading adds less than 10ms overhead
- Multi-repository hub-and-spoke prototype governs at least two repositories with shared Standing Orders and per-repo overrides
- Per-agent performance profiling tracks all specified metrics; profile reports generate on demand and on schedule
- Cost optimization engine recommends model tiers based on task complexity, quality requirements, and budget; all three optimization strategies are implemented and outcomes are logged
- Intent capture schema validates all six elements; progressive completion warnings fire for missing required fields by authority tier
- Intent decomposition engine produces a task graph of sub-intents from a high-level intent, each inheriting parent constraints, with authority tiers and dependencies identified
- Intent validation detects incomplete, ambiguous, contradictory, and unachievable intents; structured reports include per-check results and improvement suggestions
- Intent tracking dashboard renders active intents, sub-intent progress graphs, health indicators, and constraint-violation alerts; intent history is queryable
- Governance API server serves all required endpoints with authentication enforced and API versioning in place
- Policy management API supports versioned create/read/update/deactivate with changes logged (author, timestamp, rationale)
- Multi-tenant isolation enforced at the data layer; global policies apply cross-tenant; cross-tenant data leakage is prevented
- Governance policy language (DSL) supports all seven capabilities; linter catches common errors; ten example policies demonstrate expressiveness
- Governance event stream delivers real-time SSE and polling endpoints with filtering and replay from last-seen event ID
- All test suites pass, linters are clean, and CI is green across every task in this phase

---

### Task 10.1: Agent Lifecycle Management — Versioning and Marketplace
**Branch:** `task/10.1-agent-lifecycle-versioning-marketplace` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.1.1 — Write failing tests (TDD)
Write failing tests for agent version registration, version lookup by session, rollback invocation, and the package publish/install workflow to establish the contracts that implementation must satisfy.

#### 10.1.2 — Implement semantic versioning for agent definitions (IF-01)
Create `admiral/versioning/agent-versions.ts` and `admiral/versioning/version-registry.json` that assign semantic version numbers to agent definition files (AGENTS.md sections, Standing Orders, hook configurations) and record each version with role, effective date, changelog, and compatibility notes.

#### 10.1.3 — Enforce per-session version pinning and rollback
Embed the active agent definition version in session metadata at session start so that mid-session definition changes do not affect running sessions, and implement a rollback command that reverts the registry to a prior version without interrupting active sessions.

#### 10.1.4 — Define agent marketplace package format and prototype CLI (IF-02)
Create `admiral/marketplace/package-schema.json` defining the bundle format (agent identity, hooks, Standing Orders, brain entry templates, test scenarios), implement a prototype `admiral/cli/agent-package.sh` with `publish` and `install` subcommands, and produce at least two example packages in `admiral/marketplace/examples/` alongside a trust-boundary and sandboxing design document in `admiral/marketplace/README.md`.

#### 10.1.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.2: Plugin System Architecture (IF-03)
**Branch:** `task/10.2-plugin-system-architecture` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.2.1 — Write failing tests (TDD)
Write failing tests for plugin manifest validation, lifecycle transitions (install → enable → disable → uninstall), and per-extension-point loading for hook, agent, and integration plugin types.

#### 10.2.2 — Define plugin manifest schema for all three extension points
Create `admiral/plugins/manifest-schema.json` declaring the required fields (name, version, extension point, required permissions, configuration schema, lifecycle hooks) for hook plugins, agent plugins, and integration plugins.

#### 10.2.3 — Implement plugin loader with sandboxed permission enforcement
Create `admiral/plugins/loader.sh` that reads a plugin manifest, validates declared permissions, and executes lifecycle hooks (install, enable, disable, uninstall) without granting access beyond declared scope; measure and assert loading overhead remains below 10ms per plugin.

#### 10.2.4 — Create one example plugin per extension point
Populate `admiral/plugins/examples/` with three working example plugins — one hook plugin, one agent plugin, and one integration plugin — each demonstrating the manifest format and lifecycle hooks end to end.

#### 10.2.5 — Write plugin developer documentation
Create `admiral/docs/plugin-development.md` covering the manifest format, permission model, lifecycle contract, sandboxing boundaries, and a step-by-step tutorial based on the example plugins.

#### 10.2.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.3: Multi-Repository Support (IF-04)
**Branch:** `task/10.3-multi-repository-support` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.3.1 — Write failing tests (TDD)
Write failing tests for central config reference resolution, shared Standing Order propagation, per-repo override application, and cross-repository brain access control decisions.

#### 10.3.2 — Define central configuration schema
Create `admiral/multi-repo/central-config-schema.json` describing the hub configuration structure: shared Standing Orders, enforcement spectrum defaults, authority tier mappings, and brain access control entries.

#### 10.3.3 — Implement repo-link tool for hub-and-spoke registration
Create `admiral/multi-repo/repo-link.sh` that registers a spoke repository against the central hub config and applies shared governance policies with any per-repo overrides declared in the spoke.

#### 10.3.4 — Design cross-repository brain access model and prototype governance across two repositories
Document the access control model for cross-repo brain queries (which roles may read which namespaces) in `admiral/multi-repo/README.md`, and produce a working prototype demonstrating policy enforcement across two linked repositories.

#### 10.3.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.4: Agent Performance Profiling (IF-05)
**Branch:** `task/10.4-agent-performance-profiling` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.4.1 — Write failing tests (TDD)
Write failing tests for metric collection (token usage, first-pass quality rate, revision depth, time-to-completion, context utilization, authority tier usage, brain query effectiveness), report generation, and the queryable profile API.

#### 10.4.2 — Implement per-agent metric collection
Create `control-plane/src/agent-profiler.ts` that instruments agent sessions to capture all required metrics on each task completion and persists them in a queryable store.

#### 10.4.3 — Implement on-demand and scheduled profile report generation
Extend the profiler to generate per-agent profile reports showing metric trends over a configurable time window, triggerable on demand and on a weekly schedule, with at least three agents exercised against realistic synthetic data.

#### 10.4.4 — Expose profiler data via API for dashboard integration
Add a query interface to `agent-profiler.ts` that returns profile data in structured JSON so downstream consumers (cost optimizer, dashboard) can retrieve it without parsing reports.

#### 10.4.5 — Write agent profiling documentation
Create `admiral/docs/agent-profiling.md` describing the tracked metrics, how to interpret profile reports, and how to integrate profiler output with the cost optimization engine.

#### 10.4.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.5: Cost Optimization Engine (IF-06)
**Branch:** `task/10.5-cost-optimization-engine` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.5.1 — Write failing tests (TDD)
Write failing tests for the three optimization strategies (minimize cost, maximize quality, balanced Pareto), recommendation logging, and outcome tracking feedback loop.

#### 10.5.2 — Implement model tier recommendation engine
Create `control-plane/src/cost-optimizer.ts` that ingests task complexity estimates, quality requirements (from authority tier), and remaining budget, then queries the agent profiler API (IF-05) for historical performance data to recommend an optimal model tier.

#### 10.5.3 — Implement configurable optimization strategies
Add support for the three named strategies — minimize cost, maximize quality, and balanced — as selectable modes in `admiral/config/cost-optimization.json`, with each strategy producing traceable recommendations logged to the audit trail.

#### 10.5.4 — Implement recommendation outcome tracking
Record the actual task outcome (quality score, token count) alongside each recommendation so the engine can detect systematic over- or under-estimation and surface accuracy trends.

#### 10.5.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.6: Intent Capture Schema and Validation (IE-01, IE-03)
**Branch:** `task/10.6-intent-capture-schema-validation` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.6.1 — Write failing tests (TDD)
Write failing tests for schema validation of all six intent elements, progressive completion warnings by authority tier, text rendering output, and the five validation check categories (completeness, ambiguity, constraint consistency, achievability, scope estimation).

#### 10.6.2 — Implement intent capture JSON schema
Create `admiral/intent/schema.json` defining the six intent elements (goal, priority, constraints, failure modes, judgment boundaries, values) with required-field rules keyed to authority tier and progressive-completion warnings for missing optional elements.

#### 10.6.3 — Implement intent rendering and CLI tooling
Create `admiral/intent/intent.sh` that renders a captured intent as structured text matching the spec pattern format and validates a given intent document against the schema, reporting pass/warn/fail per element.

#### 10.6.4 — Implement intent validator with five check categories
Create `admiral/intent/validate.sh` that checks completeness, ambiguity (flagging at least ten common vague patterns), constraint consistency (detecting direct contradictions), achievability against fleet composition and tooling, and scope against available budget; produce a structured per-check report with improvement suggestions.

#### 10.6.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.7: Intent Decomposition Engine (IE-02)
**Branch:** `task/10.7-intent-decomposition-engine` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.7.1 — Write failing tests (TDD)
Write failing tests for sub-intent extraction, downward constraint propagation, authority tier assignment, dependency graph construction, and agent category mapping across at least three example intents of varying complexity.

#### 10.7.2 — Implement sub-intent extraction with constraint propagation
Create `admiral/intent/decompose.sh` that accepts a validated high-level intent and produces a structured list of sub-intents, each carrying the parent's constraints, failure modes, and values in full (constraints flow down, not up).

#### 10.7.3 — Implement authority tier assignment and dependency resolution
Extend the decomposition engine to assess the risk level of each sub-intent and assign the appropriate authority tier, then build a dependency graph identifying which sub-intents must complete before others can start.

#### 10.7.4 — Implement agent category mapping output
Add a final decomposition step that proposes the most qualified agent category for each sub-intent, producing a complete, machine-readable task graph with intent-rich assignments per the six-element pattern.

#### 10.7.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.8: Intent Tracking Dashboard (IE-04)
**Branch:** `task/10.8-intent-tracking-dashboard` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.8.1 — Write failing tests (TDD)
Write failing tests for dashboard rendering across all intent status states, sub-intent progress graph output, health indicator logic, constraint-violation alert triggering, and intent history query results using synthetic intent data.

#### 10.8.2 — Implement CLI intent tracking view
Create `admiral/intent/dashboard.sh` that reads the intent store and renders active intents (with status), sub-intent progress trees, health indicators (blocked, constraint-violated, drifted), and a queryable intent history in structured CLI output.

#### 10.8.3 — Implement constraint-violation alert detection
Add logic that compares in-progress agent work events against the constraint and judgment boundary fields of each active intent and emits a real-time alert entry when a potential violation is detected.

#### 10.8.4 — Integrate with control plane intent view (if applicable)
Create `control-plane/src/intent-view.ts` that exposes the intent tracking data over the control plane API so the governance dashboard and external consumers can query intent status programmatically.

#### 10.8.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.9: Governance API Server (GP-01)
**Branch:** `task/10.9-governance-api-server` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.9.1 — Write failing tests (TDD)
Write failing tests for each required endpoint (`GET /api/v1/health`, `GET /api/v1/fleet/status`, `GET /api/v1/policies`, `GET /api/v1/audit/events`), authentication enforcement on all routes, API versioning headers, and structured error responses for invalid requests.

#### 10.9.2 — Implement authentication middleware
Create `control-plane/src/auth.ts` providing authentication middleware that validates bearer tokens on all governance API routes and rejects unauthenticated requests with a structured 401 response.

#### 10.9.3 — Implement core governance API endpoints
Create `control-plane/src/governance-api.ts` extending the existing control plane server with the four required governance endpoints, all scoped under `/api/v1/`, returning structured JSON responses.

#### 10.9.4 — Validate API versioning and error handling contract
Confirm that all routes carry the `/api/v1/` prefix, that unrecognised routes return structured 404 responses, and that malformed request bodies return structured 400 responses with actionable error messages.

#### 10.9.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.10: Policy Management API (GP-02)
**Branch:** `task/10.10-policy-management-api` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.10.1 — Write failing tests (TDD)
Write failing tests for policy create, read, update (version creation), deactivate, version history retrieval, access control enforcement, and audit log entries verifying author and rationale are recorded on every change.

#### 10.10.2 — Implement versioned policy data model
Define the policy record structure (id, name, description, rule definition, enforcement level, scope, version, author, rationale, timestamp, status) and the append-only versioning strategy where each update creates a new record rather than mutating the previous one.

#### 10.10.3 — Implement CRUD endpoints for policy management
Create `control-plane/src/policies.ts` exposing `POST /api/v1/policies` (create), `GET /api/v1/policies/:id` (read), `PUT /api/v1/policies/:id` (update, creates new version), and `DELETE /api/v1/policies/:id` (deactivate, preserves history), all authenticated and audit-logged.

#### 10.10.4 — Validate policy change audit trail completeness
Verify that every create, update, and deactivate operation produces an audit entry with the change author, timestamp, and rationale, and that deactivated policies remain fully retrievable through their version history.

#### 10.10.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.11: Multi-Tenant Support (GP-03)
**Branch:** `task/10.11-multi-tenant-support` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.11.1 — Write failing tests (TDD)
Write failing tests for tenant creation and isolation (policies, audit trails, Brain namespaces), global policy enforcement across tenants, cross-tenant data leakage prevention at the data layer, and tenant-scoped authentication.

#### 10.11.2 — Implement tenant data model and isolation layer
Create `control-plane/src/tenants.ts` with a tenant record structure and data-layer scoping that namespaces all policies, audit events, and Brain entries by tenant ID, preventing cross-tenant data access regardless of API-layer behavior.

#### 10.11.3 — Implement global policy enforcement across tenants
Add the concept of global policies (data sensitivity, emergency halt) that are applied to all tenants at query time and cannot be overridden by tenant-scoped configurations.

#### 10.11.4 — Implement tenant-scoped authentication and cross-tenant access controls
Extend `control-plane/src/auth.ts` to scope API tokens to a specific tenant and require elevated privileges for any cross-tenant read, with all cross-tenant access attempts recorded in the audit trail.

#### 10.11.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.12: Governance Policy Language / DSL (GP-04)
**Branch:** `task/10.12-governance-policy-language` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.12.1 — Write failing tests (TDD)
Write failing tests for parsing threshold, pattern, temporal, and composition rules; evaluating rules against synthetic governance event data; inheritance from global policies; and linter detection of conflicting rules, unreachable conditions, and invalid syntax.

#### 10.12.2 — Define and implement policy language grammar
Create `admiral/governance/policy_language/parser.sh` implementing a JSON/YAML-based policy grammar supporting threshold rules, pattern rules, temporal rules, scope selectors, action definitions, AND/OR/NOT composition, and policy inheritance; also produce a human-readable text rendering for Admiral review.

#### 10.12.3 — Implement policy evaluator
Create `admiral/governance/policy_language/evaluator.sh` that applies a parsed policy to a stream of governance events and fires the declared action (log, warn, restrict, suspend, escalate) when conditions are met.

#### 10.12.4 — Implement policy linter
Create `admiral/governance/policy_language/linter.sh` that validates policy syntax and statically detects common errors: conflicting rules, unreachable conditions, missing required action definitions, and structural loops.

#### 10.12.5 — Write ten example policies demonstrating language expressiveness
Populate `admiral/governance/policy_language/examples/` with at least ten policy files covering distinct rule types, scope selectors, and composition patterns, each passing the linter without errors.

#### 10.12.6 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.

---

### Task 10.13: Governance Event Streaming (GP-05)
**Branch:** `task/10.13-governance-event-streaming` (branches off `slush/phase-10-future-proofing`)
**PR:** → `slush/phase-10-future-proofing`

#### 10.13.1 — Write failing tests (TDD)
Write failing tests for SSE event delivery, polling endpoint pagination by timestamp, event filtering by type/severity/agent/tenant, consistent event schema validation, and replay from a last-seen event ID after simulated disconnection.

#### 10.13.2 — Define governance event schema
Establish the canonical event record structure (event_id, timestamp, type, severity, source, detail, tenant_id) as a shared type used by both the SSE endpoint and the polling endpoint.

#### 10.13.3 — Implement SSE event streaming endpoint
Create `control-plane/src/event-stream.ts` exposing `GET /api/v1/events/stream` as a Server-Sent Events endpoint that pushes governance events from the internal event bus (MG-05) to connected consumers in real time, with tenant-scoped filtering applied at the stream boundary.

#### 10.13.4 — Implement polling endpoint with filtering and replay
Expose `GET /api/v1/events?since=<timestamp>` returning a paginated JSON list of governance events, with query-parameter filtering by type, severity, agent, and tenant, and support for resuming from a last-seen event ID to handle consumer disconnections gracefully.

#### 10.13.5 — Run test suite, run linters, cleanup, and pass CI pipeline
Ensure all tests pass, linters are clean, and CI is green before merging.
