# Admiral Framework — TODO

**Created:** 2026-03-20
**Source:** Derived from [plan/index.md](../plan/index.md) roadmap (34 streams, ~463 items)

## Hierarchy

| Level | Scope | Git Artifact | Merge Target | Approval |
|---|---|---|---|---|
| **Phase/Epic X** | Multi-session, multi-agent epic | Slush branch (`slush/phase-X-*`) | `main` | Admiral (human) required |
| **Task X.Y** | Coherent chunk of work within a phase | Task branch (`task/X.Y-*`) | Phase slush branch | No human approval needed |
| **Subtask X.Y.Z** | One commit's worth of work | Commit on task branch | — | — |

## Rules

1. Each Phase has a **Definition of Done**
2. Each Task's **first subtask** is TDD (write tests first) wherever applicable
3. Each Task's **final subtask** is: "Run test suite, linters, cleanup, and pass CI pipeline"
4. Each Phase's **final Task's final subtask** is: "Run full test suite, all linters, cleanup, and pass CI pipeline"

---

## Phase 1: Spec Debt & Foundation
**Branch:** `slush/phase-1-spec-debt-foundation`
**Scope:** Establish the strategic, testing, quality, and documentation foundations. Inventory spec debt, audit enforcement maps and hook manifests, fill unit test gaps for untested modules, standardize hooks, enforce coverage, and deliver documentation quick wins. This phase answers: "What are we building and how do we know it works?"
**Sessions:** 1-10

### Definition of Done
- [ ] Spec debt inventory complete with every gap classified by severity and implementation impact (SD-01, SD-02)
- [ ] Standing Orders enforcement map documents an enforcement strategy for every SO (SD-04)
- [ ] Hook manifest audit cross-references all spec-referenced hooks against actual implementations (SD-05)
- [ ] Zero trust validator scans all tool responses, not just WebFetch/WebSearch (SEC-13)
- [ ] Unit tests exist for trace, ingest, instrumentation, and events modules with >= 80% branch coverage (T-01 through T-04)
- [ ] Shared jq helpers library extracted and adopted by all hooks (Q-01)
- [ ] Standardized hook error handling pattern adopted by all hooks (Q-02)
- [ ] Coverage threshold gate enforced in CI — builds fail on coverage regression (T-09, C-01)
- [ ] Strategy Triangle templates exist in structured format with validation (ST-01, ST-02, ST-03)
- [ ] ADMIRAL_STYLE.md, CODE_OF_CONDUCT.md, and LICENSE files exist and are referenced from CONTRIBUTING.md (D-01, D-02, D-03)
- [ ] Full test suite, all linters, and CI pipeline pass

### Task 1.1: Spec Debt Inventory & Prioritization
**Branch:** `task/1.1-spec-debt-inventory`
**Stream refs:** SD-01, SD-02

- [ ] **1.1.1** Audit `spec-debt.md` and `spec-gaps.md`; draft comprehensive debt inventory with severity, implementation impact, and resolution path for each item (SD-01)
- [ ] **1.1.2** Cross-reference debt inventory against all plan streams; classify each gap as blocking, constraining, or cosmetic; produce prioritized resolution queue (SD-02)
- [ ] **1.1.3** Run test suite, linters, cleanup, and pass CI pipeline

### Task 1.2: Standing Orders Enforcement Map & Hook Manifest Audit
**Branch:** `task/1.2-enforcement-map-hook-audit`
**Stream refs:** SD-04, SD-05

- [ ] **1.2.1** Audit all 16 Standing Orders against existing hooks and CI checks; document enforcement status (enforced, instructed, advisory, unenforced) for each SO (SD-04)
- [ ] **1.2.2** For each advisory-only SO, write a proposal defining a hook, justifying advisory-only status, or proposing alternative monitoring; address SO-14 gap specifically (SD-04)
- [ ] **1.2.3** Cross-reference all spec-referenced hooks against actual manifests in `aiStrat/hooks/` and implementations in `.hooks/`; document missing manifests, orphan manifests, and proposed new manifests (SD-05)
- [ ] **1.2.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 1.3: Zero Trust Validator Extension
**Branch:** `task/1.3-zero-trust-all-tools`
**Stream refs:** SEC-13

- [ ] **1.3.1** Write tests for zero trust validator scanning all tool responses, including MCP tool response injection detection (TDD)
- [ ] **1.3.2** Extend `zero_trust_validator.sh` to scan ALL tool responses for injection patterns, not just WebFetch/WebSearch; apply CRITICAL severity for MCP tool responses (SEC-13)
- [ ] **1.3.3** Run test suite, linters, cleanup, and pass CI pipeline

### Task 1.4: Strategy Triangle Foundation
**Branch:** `task/1.4-strategy-triangle`
**Stream refs:** ST-01, ST-02, ST-03

- [ ] **1.4.1** Write validation tests for Ground Truth document schema — test empty fields, missing required fields, valid documents (TDD)
- [ ] **1.4.2** Create machine-readable templates for Mission, Boundaries, and Success Criteria in YAML; create `ground-truth.schema.json` with all fields from spec; build `generate_ground_truth.sh` CLI to generate blank documents (ST-01)
- [ ] **1.4.3** Create Ground Truth validator that confirms filled-in documents have no empty required fields (ST-01)
- [ ] **1.4.4** Build `readiness_assess.sh` that accepts a project root and Ground Truth path, outputs Ready/Partially Ready/Not Ready with detailed breakdown of gaps (ST-02)
- [ ] **1.4.5** Build `go_no_go_gate.sh` that invokes readiness assessment and exits non-zero for Not Ready projects; permit only Starter profile for Partially Ready; support Admiral override with logged justification (ST-03)
- [ ] **1.4.6** Run test suite, linters, cleanup, and pass CI pipeline

### Task 1.5: Unit Tests for Untested Modules
**Branch:** `task/1.5-unit-tests-untested`
**Stream refs:** T-01, T-02, T-03, T-04

- [ ] **1.5.1** Write `trace.test.ts` — test `buildTrace()`, `buildAgentTrace()`, `renderAscii()`, `getStats()` with nested hierarchies, empty streams, single-event streams; target >= 80% branch coverage (T-01)
- [ ] **1.5.2** Write `ingest.test.ts` — test `JournalIngester` `ingestNewLines()`, `start()`/`stop()`, `getStats()` with valid JSONL, malformed lines, missing file, file growth, offset tracking; target >= 80% branch coverage (T-02)
- [ ] **1.5.3** Write `instrumentation.test.ts` — test all `AgentInstrumentation` public methods, including edge cases for null agents and missing fields; target >= 90% branch coverage (T-03)
- [ ] **1.5.4** Write `events.test.ts` — test EventStream ID generation, listener lifecycle, eviction, filters, counters, event ordering preservation; target >= 90% branch coverage (T-04)
- [ ] **1.5.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 1.6: Hook Standardization
**Branch:** `task/1.6-hook-standardization`
**Stream refs:** Q-01, Q-02

- [ ] **1.6.1** Write tests for shared jq helpers — test `jq_get_field()`, `jq_set_field()`, `jq_array_append()`, `jq_validate()` with valid inputs, missing fields, malformed JSON (TDD)
- [ ] **1.6.2** Create `admiral/lib/jq_helpers.sh` with shared jq helper functions; refactor all hooks to use shared helpers instead of inline jq invocations (Q-01)
- [ ] **1.6.3** Write tests for shared error handling — test `hook_log()`, `hook_fail_soft()`, `hook_fail_hard()`, `hook_pass()` with various error conditions (TDD)
- [ ] **1.6.4** Create `admiral/lib/hook_utils.sh` with standardized error handling pattern; refactor all 13 hooks to use shared functions; ensure consistent exit codes and fail-open/fail-closed behavior per ADR-004 (Q-02)
- [ ] **1.6.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 1.7: Coverage Enforcement in CI
**Branch:** `task/1.7-coverage-enforcement`
**Stream refs:** T-09, C-01

- [ ] **1.7.1** Determine current coverage baseline by running `--experimental-test-coverage` and recording the result
- [ ] **1.7.2** Add coverage threshold gate to CI workflow — parse coverage output, fail if coverage drops below baseline threshold; store threshold in config file for ratcheting (T-09, C-01)
- [ ] **1.7.3** Document coverage threshold policy and ratchet process in CONTRIBUTING.md
- [ ] **1.7.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 1.8: Documentation Quick Wins
**Branch:** `task/1.8-documentation-quick-wins`
**Stream refs:** D-01, D-02, D-03

- [ ] **1.8.1** Create `ADMIRAL_STYLE.md` covering naming conventions, error handling patterns, jq usage patterns, exit code taxonomy, comment standards, testing requirements, and commit message format; reference from CONTRIBUTING.md and AGENTS.md (D-01)
- [ ] **1.8.2** Add `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1) at repo root; reference from CONTRIBUTING.md (D-02)
- [ ] **1.8.3** Add `LICENSE` file (MIT) at repo root with correct year and holder (D-03)
- [ ] **1.8.4** Run full test suite, all linters, cleanup, and pass CI pipeline

---

## Phase 2: Spec Debt Resolution & Self-Enforcement
**Branch:** `slush/phase-2-spec-resolution-self-enforcement`
**Scope:** Close spec gaps with formal amendment proposals, implement reference constants and version tracking, add spec compliance testing, raise TypeScript quality with typed errors and better routing, add JSON schema validation for hook payloads and session state, establish bash dependency checking, and build self-enforcement hooks. This phase answers: "Does the specification match the implementation, and does the system enforce its own rules?"
**Sessions:** 11-18

### Definition of Done
- [ ] Spec amendment proposals exist for every active spec gap in `docs/spec-proposals/amendments/` (SD-03)
- [ ] Reference constants registry exists; every spec-defined constant is audited as implemented, missing, or divergent (SD-06)
- [ ] Spec version tracking manifest maps every implementation component to its target spec version (SD-07)
- [ ] Spec compliance tests exist for at least one requirement per spec part (Parts 1-12) (SD-08)
- [ ] Spec changelog bridge document tracks implementation freshness against spec versions (SD-09)
- [ ] Spec gap proposals exist for fleet orchestration, Brain graduation, and cross-platform hooks (SD-10, SD-11, SD-12)
- [ ] Event IDs use `crypto.randomUUID()` with `evt_<uuid>` format (Q-05)
- [ ] Typed error hierarchy (`AdmiralError` and subtypes) replaces all ad-hoc error handling (Q-06)
- [ ] Server uses declarative route table (Q-08)
- [ ] JSON schemas exist for all hook payloads with fail-open validation (A-01)
- [ ] Session state validated against JSON schema at every write (A-06)
- [ ] Bash dependency checker runs in CI (A-04)
- [ ] CI enforces test discipline and documentation discipline (P-01, P-02)
- [ ] Pre-commit hook validates AGENTS.md, ADR templates, and Standing Order format (P-05)
- [ ] Full test suite, all linters, and CI pipeline pass

### Task 2.1: Spec Amendment Proposals
**Branch:** `task/2.1-spec-amendments`
**Stream refs:** SD-03

- [ ] **2.1.1** Establish amendment proposal template in `docs/spec-proposals/amendments/` with standard format: Gap ID, Affected spec section, Current text, Proposed text, Rationale, Impact assessment (SD-03)
- [ ] **2.1.2** Write amendment proposals for all blocking spec gaps identified in the priority matrix (SD-02) (SD-03)
- [ ] **2.1.3** Write amendment proposals for all constraining spec gaps, each self-contained and independently reviewable (SD-03)
- [ ] **2.1.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 2.2: Reference Constants & Version Tracking
**Branch:** `task/2.2-constants-version-tracking`
**Stream refs:** SD-06, SD-07, SD-09

- [ ] **2.2.1** Write tests for reference constants registry — verify constants load, match expected values, and are queryable by name (TDD)
- [ ] **2.2.2** Audit `reference-constants.md` against codebase; create `admiral/config/reference_constants.sh` as constants registry (SD-06)
- [ ] **2.2.3** Document audit results: implemented, missing, and divergent constants with rationale (SD-06)
- [ ] **2.2.4** Create spec version tracking manifest mapping each implementation component to its target spec version (SD-07)
- [ ] **2.2.5** Create changelog bridge document mapping spec versions to implementation status; define "spec freshness" score (SD-09)
- [ ] **2.2.6** Run test suite, linters, cleanup, and pass CI pipeline

### Task 2.3: Spec Compliance Testing
**Branch:** `task/2.3-spec-compliance-tests`
**Stream refs:** SD-08

- [ ] **2.3.1** Create `admiral/tests/spec_compliance/` directory with test harness and spec-reference convention (SD-08)
- [ ] **2.3.2** Write compliance tests for Standing Order enforcement — verify correct hooks are active for each SO
- [ ] **2.3.3** Write compliance tests for reference constants — verify thresholds match spec values
- [ ] **2.3.4** Write compliance tests for Brain schema — verify schema matches spec structure
- [ ] **2.3.5** Write compliance tests for remaining spec parts to achieve at least one test per part (Parts 1-12)
- [ ] **2.3.6** Run test suite, linters, cleanup, and pass CI pipeline

### Task 2.4: Spec Gap Proposals
**Branch:** `task/2.4-spec-gap-proposals`
**Stream refs:** SD-10, SD-11, SD-12

- [ ] **2.4.1** Write spec gap proposal for fleet orchestration protocol — agent selection, unavailability handling, task assignment format, dependency tracking (SD-10)
- [ ] **2.4.2** Write spec gap proposal for Brain graduation automation — initiation authority, reversibility, migration process, dry-run/shadow mode (SD-11)
- [ ] **2.4.3** Write spec gap proposal for cross-platform hook normalization — canonical hook interface, payload normalization, cross-platform testing (SD-12)
- [ ] **2.4.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 2.5: TypeScript Quality Improvements
**Branch:** `task/2.5-typescript-quality`
**Stream refs:** Q-05, Q-06, Q-08

- [ ] **2.5.1** Write tests for `crypto.randomUUID()` event IDs — verify format `evt_<uuid>`, uniqueness, no collisions (TDD)
- [ ] **2.5.2** Replace `Date.now()` event IDs with `crypto.randomUUID()` in `control-plane/src/events.ts` (Q-05)
- [ ] **2.5.3** Write tests for typed error hierarchy — verify `AdmiralError` subtypes carry correct properties and are catchable by type (TDD)
- [ ] **2.5.4** Create `control-plane/src/errors.ts` with `AdmiralError` base class and subtypes; replace ad-hoc error handling in `server.ts` and `ingest.ts` (Q-06)
- [ ] **2.5.5** Write tests for declarative route table — verify all endpoints resolve, unknown routes return 404, method mismatches return 405 (TDD)
- [ ] **2.5.6** Replace manual `url.split("/")` routing in `server.ts` with declarative route table (Q-08)
- [ ] **2.5.7** Run test suite, linters, cleanup, and pass CI pipeline

### Task 2.6: Schema Validation & Dependency Checking
**Branch:** `task/2.6-schema-validation`
**Stream refs:** A-01, A-04, A-06

- [ ] **2.6.1** Write tests for hook payload schema validation — valid payloads pass, invalid payloads are logged but not blocked (fail-open) (TDD)
- [ ] **2.6.2** Define JSON schemas for all hook I/O in `admiral/schemas/`; create `admiral/lib/schema_validate.sh`; apply to adapter hooks (A-01)
- [ ] **2.6.3** Write tests for session state schema validation — malformed state writes caught, valid writes pass (TDD)
- [ ] **2.6.4** Create `admiral/schemas/session_state.schema.json`; integrate validation into state write paths (A-06)
- [ ] **2.6.5** Create `admiral/bin/check_deps` — check for jq >= 1.6, sha256sum, uuidgen, date, flock, shellcheck; add to CI (A-04)
- [ ] **2.6.6** Run test suite, linters, cleanup, and pass CI pipeline

### Task 2.7: Self-Enforcement Hooks
**Branch:** `task/2.7-self-enforcement`
**Stream refs:** P-01, P-02, P-05

- [ ] **2.7.1** Write tests for test discipline CI check — detect `fix:` commits without test file changes (TDD)
- [ ] **2.7.2** Add CI check that warns on `fix:` commits with no associated test file modifications (P-01)
- [ ] **2.7.3** Write tests for documentation discipline validation (TDD)
- [ ] **2.7.4** Create documentation validation script; add doc-discipline CI job (P-02)
- [ ] **2.7.5** Extend `.githooks/pre-commit` to validate AGENTS.md format, ADR template compliance, and Standing Order format for staged files (P-05)
- [ ] **2.7.6** Run full test suite, all linters, cleanup, and pass CI pipeline

---

## Phase 3: Spec Gaps — Critical
**Branch:** `slush/phase-3-spec-gaps-critical`
**Scope:** Close the specification-to-implementation gap for missing hooks (S-01 to S-04), Standing Orders enforcement map (S-05, SO-17), Brain B1 completion (B-01 to B-03), handoff and escalation protocols (S-10, S-11), and agent registry with task routing (S-06, S-07).
**Sessions:** 19-28

### Definition of Done
- [ ] All four missing hooks (identity_validation, tier_validation, governance_heartbeat_monitor, protocol_registry_guard) are implemented and tested
- [ ] Standing Orders enforcement map documents all 16 SOs with enforcement type and responsible files
- [ ] SO-17 enforcement completeness report runs in CI and produces JSON output
- [ ] Brain B1 automatic entry creation, retrieval in hooks, and demand signal tracking are operational
- [ ] Handoff protocol schema is defined and validated; escalation pipeline flows through all 5 steps
- [ ] Agent registry loads from configuration and provides lookup by ID, capability, and tier
- [ ] Task routing engine routes tasks using registry data and file ownership rules
- [ ] All new code has tests written before implementation (TDD)
- [ ] Full test suite, all linters pass, CI pipeline green

### Task 3.1: Standing Orders Enforcement Map and Coverage Report
**Branch:** `task/3.1-so-enforcement-map`
**Stream refs:** S-05, SO-17

- [ ] **3.1.1** Write tests for enforcement map generation and coverage report (TDD) — test that all 16 SOs are enumerated, enforcement types are classified, coverage percentage is calculated, and JSON output is valid (`admiral/reports/tests/test_so_coverage.sh`)
- [ ] **3.1.2** Create `admiral/docs/standing-orders-enforcement-map.md` with complete mapping of all 16 SOs to their current enforcement mechanisms, identifying enforcement type (hook, CI check, instruction embedding, guidance-only, none) and responsible files
- [ ] **3.1.3** Implement `admiral/reports/standing_orders_coverage.sh` (SO-17) — automated script that maps each SO to enforcement mechanisms, calculates coverage percentage, identifies gaps, and outputs both human-readable summary and machine-parseable JSON
- [ ] **3.1.4** Integrate SO coverage report into CI pipeline
- [ ] **3.1.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 3.2: Identity and Tier Validation Hooks
**Branch:** `task/3.2-identity-tier-hooks`
**Stream refs:** S-01, S-02

- [ ] **3.2.1** Write tests for identity_validation.sh and tier_validation.sh (TDD) — test valid identity acceptance, invalid identity rejection with exit code 2, role drift detection, tier mismatch warnings, and critical tier mismatch blocking
- [ ] **3.2.2** Implement `identity_validation.sh` (S-01) — SessionStart hook that validates agent identity fields against the fleet registry, blocks invalid identities with exit code 2
- [ ] **3.2.3** Implement `tier_validation.sh` (S-02) — SessionStart hook that validates model tier assignment against agent role requirements, warns on non-critical mismatches (exit 0), hard-blocks critical mismatches (exit 2)
- [ ] **3.2.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 3.3: Governance Heartbeat and Protocol Registry Guard
**Branch:** `task/3.3-governance-protocol-hooks`
**Stream refs:** S-03, S-04

- [ ] **3.3.1** Write tests for governance_heartbeat_monitor.sh and protocol_registry_guard.sh (TDD) — test heartbeat emission, missing heartbeat detection, MCP server allow/block behavior, protocol change governance validation
- [ ] **3.3.2** Implement `governance_heartbeat_monitor.sh` (S-03) — hook that emits heartbeat checks on configurable interval, alerts on missing heartbeat after threshold
- [ ] **3.3.3** Create `admiral/config/approved_mcp_servers.json` with initial approved MCP server registry structure
- [ ] **3.3.4** Implement `protocol_registry_guard.sh` (S-04) — PreToolUse hook with two enforcement surfaces: (1) validates protocol changes against SO-16 approval workflow, (2) hard-blocks calls to unregistered MCP servers with exit code 2
- [ ] **3.3.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 3.4: Brain B1 Completion
**Branch:** `task/3.4-brain-b1-completion`
**Stream refs:** B-01, B-02, B-03

- [ ] **3.4.1** Write tests for brain_writer.sh library, enhanced brain_context_router.sh, and demand signal tracking (TDD)
- [ ] **3.4.2** Implement `admiral/lib/brain_writer.sh` (B-01) — shared library for hooks to emit brain entries; wire into `prohibitions_enforcer.sh`, `loop_detector.sh`, and `scope_boundary_guard.sh`
- [ ] **3.4.3** Enhance `brain_context_router.sh` (B-02) — on Propose/Escalate-tier tool calls, invoke `brain_query` and inject matching entries as structured context blocks
- [ ] **3.4.4** Implement demand signal tracking (B-03) — record zero-result queries to `.brain/_demand/`; extend `brain_audit` to support `--demand` flag
- [ ] **3.4.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 3.5: Handoff Protocol and Escalation Pipeline
**Branch:** `task/3.5-handoff-escalation`
**Stream refs:** S-10, S-11

- [ ] **3.5.1** Write tests for handoff schema validation and escalation pipeline steps (TDD) — test schema compliance, incomplete handoff rejection, escalation intake classification, Brain precedent query, resolution path generation
- [ ] **3.5.2** Define handoff JSON schema (`admiral/handoff/schema.json`) with required fields for context transfer, state serialization, source/target agent, task summary, and acceptance criteria
- [ ] **3.5.3** Implement `admiral/handoff/validate.sh` (S-10) — validates handoff payloads against schema, rejects incomplete handoffs with field-level errors
- [ ] **3.5.4** Implement escalation pipeline (`admiral/escalation/pipeline.sh`) (S-11) — orchestrates 5-step flow: intake classification, Brain precedent query, candidate resolution paths, Admiral decision recording, outcome persistence as new Brain precedent
- [ ] **3.5.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 3.6: Agent Registry
**Branch:** `task/3.6-agent-registry`
**Stream refs:** S-06

- [ ] **3.6.1** Write tests for agent registry (TDD) — test configuration loading, lookup by agent ID/capability/tier, rejection of invalid entries, structured JSON response format
- [ ] **3.6.2** Create registry configuration schema defining agent entries with fields for agent ID, capabilities, routing rules, model tier, tool permissions, and file ownership patterns
- [ ] **3.6.3** Implement `admiral/fleet/registry.sh` (S-06) — loads agent registry from config, validates entries against spec constraints, provides lookup API, returns structured JSON
- [ ] **3.6.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 3.7: Task Routing Engine
**Branch:** `task/3.7-task-routing`
**Stream refs:** S-07

- [ ] **3.7.1** Write tests for task routing engine (TDD) — test routing by task type, routing by file ownership, fallback agent selection, constraint enforcement (never self-review), no-match escalation
- [ ] **3.7.2** Implement task routing engine — accepts task description and file list, queries registry (S-06), applies routing rules, selects optimal agent, returns routing decision with justification
- [ ] **3.7.3** Integration test: verify routing engine correctly uses registry data for end-to-end task-to-agent assignment
- [ ] **3.7.4** Run full test suite, all linters, cleanup, and pass CI pipeline

---

## Phase 4: Fleet & Orchestration
**Branch:** `slush/phase-4-fleet-orchestration`
**Scope:** Build multi-agent reality by implementing core agent definitions (F-01 to F-04), agent definition schema and registry tooling (F-12, F-13), and routing and orchestration systems (O-01 to O-03).
**Sessions:** 29-40

### Definition of Done
- [ ] Agent definition JSON schema exists and validates all agent definitions
- [ ] Agent definition validator runs in CI and catches schema violations
- [ ] Machine-readable agent capability registry is generated from definitions
- [ ] Command layer agents (Orchestrator, Triage, Mediator, Context Curator) are fully defined
- [ ] Engineering agents (backend, frontend, cross-cutting, infrastructure) are fully defined
- [ ] Quality agents (QA, test writers, performance, chaos, regression) are fully defined
- [ ] Governance agents (budgeter, drift monitor, hallucination auditor, bias sentinel, loop breaker, context health, contradiction detector) are fully defined
- [ ] Routing engine resolves tasks via task-type, file-ownership, and capability-matching strategies
- [ ] Model tier enforcement validates and enforces tier assignments with degradation policies
- [ ] Context injection pipeline assembles three-layer context stacks with budget enforcement
- [ ] Full test suite, all linters pass, CI pipeline green

### Task 4.1: Agent Definition Schema and Validator
**Branch:** `task/4.1-agent-schema`
**Stream refs:** F-12

- [ ] **4.1.1** Write tests for agent definition JSON schema validation (TDD) — test required field enforcement, tool list disjointness, model tier validity, routing table consistency, interface contract completeness
- [ ] **4.1.2** Create `fleet/agents/schema/agent-definition.schema.json` (F-12a) — Identity, Authority, Constraints, Tool Registry, Model Tier, Context Injection, Interface Contracts, File Ownership, API Resilience, Prompt Anatomy metadata
- [ ] **4.1.3** Implement agent definition validator (`fleet/agents/schema/validate.sh`) (F-12b) — validates all definitions against schema with clear error messages
- [ ] **4.1.4** Add CI workflow (`.github/workflows/fleet-validation.yml`) running validator on every PR touching agent definitions
- [ ] **4.1.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 4.2: Command Layer Agent Definitions
**Branch:** `task/4.2-command-agents`
**Stream refs:** F-01

- [ ] **4.2.1** Write schema validation tests for command layer agents (TDD) — verify schema compliance, prompt anatomy sections, authority tier assignments
- [ ] **4.2.2** Create Orchestrator agent definition (F-01a) — `fleet/agents/definitions/orchestrator.{md,json}` with Tier 1 Flagship, routing logic, decomposition rules, handoff protocols
- [ ] **4.2.3** Create Triage Agent definition (F-01b) — `fleet/agents/definitions/triage.{md,json}` with Tier 3 Utility, classification taxonomy, priority levels
- [ ] **4.2.4** Create Mediator agent definition (F-01c) — `fleet/agents/definitions/mediator.{md,json}` with Tier 1 Flagship, conflict detection criteria, resolution strategies
- [ ] **4.2.5** Create Context Curator agent definition (F-01d) — `fleet/agents/definitions/context-curator.{md,json}` with Tier 2 Workhorse, context assembly algorithm, budget allocation rules
- [ ] **4.2.6** Run test suite, linters, cleanup, and pass CI pipeline

### Task 4.3: Engineering Agent Definitions
**Branch:** `task/4.3-engineering-agents`
**Stream refs:** F-02

- [ ] **4.3.1** Write schema validation tests for all engineering agent definitions (TDD)
- [ ] **4.3.2** Create backend engineering agent definitions (F-02a) — backend-implementer, api-designer, database-agent, integration-agent, queue-messaging, cache-strategist
- [ ] **4.3.3** Create frontend engineering agent definitions (F-02b) — frontend-implementer, interaction-designer, accessibility-auditor, responsive-layout, state-management, design-systems
- [ ] **4.3.4** Create cross-cutting engineering agent definitions (F-02c) — refactoring-agent, dependency-manager, technical-writer, diagram-agent
- [ ] **4.3.5** Create infrastructure agent definitions (F-02d) — devops-agent, infrastructure-agent, containerization-agent, observability-agent
- [ ] **4.3.6** Run test suite, linters, cleanup, and pass CI pipeline

### Task 4.4: Quality Agent Definitions
**Branch:** `task/4.4-quality-agents`
**Stream refs:** F-03

- [ ] **4.4.1** Write schema validation tests for quality agent definitions (TDD) — verify conflict-of-interest constraint, rejection handoff contracts
- [ ] **4.4.2** Create quality agent definitions (F-03) — qa-agent, unit-test-writer, e2e-test-writer, performance-tester, chaos-agent, regression-guardian with explicit conflict-of-interest routing constraints
- [ ] **4.4.3** Run test suite, linters, cleanup, and pass CI pipeline

### Task 4.5: Governance Agent Definitions
**Branch:** `task/4.5-governance-agents`
**Stream refs:** F-04

- [ ] **4.5.1** Write schema validation tests for governance agent definitions (TDD) — verify failure mode detection criteria, escalation triggers, read-access-only tool registries
- [ ] **4.5.2** Create governance agent definitions (F-04) — token-budgeter, drift-monitor, hallucination-auditor, bias-sentinel, loop-breaker, context-health-monitor, contradiction-detector
- [ ] **4.5.3** Run test suite, linters, cleanup, and pass CI pipeline

### Task 4.6: Agent Capability Registry
**Branch:** `task/4.6-capability-registry`
**Stream refs:** F-13

- [ ] **4.6.1** Write tests for registry generation (TDD) — test JSON output validity, all agents present, capability queries return correct agents
- [ ] **4.6.2** Implement registry generation script (F-13) — reads all agent definition JSON files, extracts capabilities, produces consolidated `fleet/agents/registry/agent-registry.json`
- [ ] **4.6.3** Add CI integration to regenerate and validate registry on agent definition changes
- [ ] **4.6.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 4.7: Routing Rules Engine
**Branch:** `task/4.7-routing-engine`
**Stream refs:** O-01

- [ ] **4.7.1** Write tests for all three routing strategies (TDD) — task-type routing against 86 rules, file-ownership routing, capability-matching with confidence scoring, constraint enforcement, fallback chain
- [ ] **4.7.2** Parse routing table from `fleet/routing-rules.md` into `fleet/routing/rules.json`
- [ ] **4.7.3** Implement task-type routing (O-01a) — resolve primary agent, fallback, or escalation with constraint enforcement
- [ ] **4.7.4** Implement file-ownership routing (O-01b) — match file paths to owning agents, signal decomposition for multi-owner tasks
- [ ] **4.7.5** Implement capability-matching routing (O-01c) — query agent registry, return ranked candidates with confidence scores
- [ ] **4.7.6** Integration test: verify complete fallback chain task-type -> file-ownership -> capability-match -> escalation
- [ ] **4.7.7** Run test suite, linters, cleanup, and pass CI pipeline

### Task 4.8: Model Tier Enforcement
**Branch:** `task/4.8-model-tier-enforcement`
**Stream refs:** O-02

- [ ] **4.8.1** Write tests for tier validation hook and degradation policy engine (TDD) — test valid/invalid tier acceptance/rejection, retry with exponential backoff, degradation policies, no cascading degradation
- [ ] **4.8.2** Implement tier validation hook (O-02a) — SessionStart hook comparing actual model against minimum tier
- [ ] **4.8.3** Implement degradation policy engine (O-02b) — exponential backoff retry (1s/2s/4s/8s, max 30s, 4 retries), per-agent Degraded/Blocked policies
- [ ] **4.8.4** Implement tier promotion/demotion tracking (O-02c) — record first-pass quality rates, surface promotion/demotion recommendations
- [ ] **4.8.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 4.9: Context Injection Pipeline
**Branch:** `task/4.9-context-injection`
**Stream refs:** O-03

- [ ] **4.9.1** Write tests for context assembly, category checklists, and progressive disclosure (TDD) — test three-layer stack assembly order, budget enforcement, context sufficiency check, category-specific checklist validation
- [ ] **4.9.2** Implement three-layer context assembly (O-03a) — Layer 1 (Fleet), Layer 2 (Project), Layer 3 (Task) with budget tracking per priority tier
- [ ] **4.9.3** Implement category-specific context checklists (O-03b) — engineering, quality, security, and governance checklists with missing-item warnings/errors
- [ ] **4.9.4** Implement progressive disclosure via skills (O-03c) — skill file format, trigger patterns, lazy loading, Medium priority tier budget
- [ ] **4.9.5** Run full test suite, all linters, cleanup, and pass CI pipeline

---

## Phase 5: Robustness & Security
**Branch:** `slush/phase-5-robustness-security`
**Scope:** Harden the system with edge case testing, security defense-in-depth (adversarial testing, injection defense, privilege hardening, secret scanning), data sensitivity controls, audit trail infrastructure, hook/control-plane integration, and CI matrix with security scanning.
**Sessions:** 41-52

### Definition of Done
- [ ] All edge case tests pass for server, hooks, state concurrency, and quarantine pipeline
- [ ] Attack corpus test runner exercises all 30 ATK scenarios with structured reporting
- [ ] Injection detection layers catch all known attack patterns with < 1% false positive rate
- [ ] Privilege escalation is blocked and logged for all known vectors
- [ ] Secret scanning prevents sensitive data from entering Brain entries
- [ ] Security audit trail captures all security-relevant events in append-only JSONL
- [ ] Hook and control plane share a unified bidirectional event log
- [ ] CI runs on ubuntu + macOS matrix with CodeQL security scanning
- [ ] Full test suite, all linters, and CI pipeline pass

### Task 5.1: Edge Case Testing
**Branch:** `task/5.1-edge-case-testing`
**Stream refs:** T-05, T-06, T-07, T-08

- [ ] **5.1.1** Write edge case tests for server — malformed JSON, special char URLs, concurrent requests, missing headers (TDD)
- [ ] **5.1.2** Write hook edge case tests — malformed JSON, missing jq, empty stdin, huge payloads, Unicode tool names, concurrent execution per ADR-004
- [ ] **5.1.3** Write state.sh concurrent access tests — spawn multiple subshells, verify flock prevents data loss
- [ ] **5.1.4** Write quarantine pipeline integration tests — full 5-layer pipeline with known-good and known-bad inputs
- [ ] **5.1.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 5.2: Attack Corpus Test Automation
**Branch:** `task/5.2-attack-corpus-automation`
**Stream refs:** SEC-01

- [ ] **5.2.1** Write tests for attack corpus runner — define expected pass/fail per ATK scenario (TDD)
- [ ] **5.2.2** Create ATK-0019 through ATK-0030 entries from MCP-SECURITY-ANALYSIS.md templates (MCP, A2A, temporal, Brain poisoning vectors)
- [ ] **5.2.3** Implement attack corpus test runner iterating all 30 ATK scenarios, injecting triggers, verifying defenses
- [ ] **5.2.4** Generate structured JSON report with pass/fail per scenario and severity weighting
- [ ] **5.2.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 5.3: Injection Detection Layers
**Branch:** `task/5.3-injection-detection`
**Stream refs:** SEC-02, SEC-03, SEC-12

- [ ] **5.3.1** Write tests for Layer 1 pattern-based sanitization and Layer 2 structural validation (TDD)
- [ ] **5.3.2** Implement Layer 1 — regex-based input sanitization catching imperative overrides, authority claims, SO manipulation, role reassignment (< 10ms latency)
- [ ] **5.3.3** Implement Layer 2 — JSON schema validation for all external inputs with encoding normalization (base64, URL encoding, Unicode bypass prevention)
- [ ] **5.3.4** Implement boundary input validation — max input sizes, character set enforcement, null byte blocking at all external interfaces
- [ ] **5.3.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 5.4: Privilege Hardening & Secret Scanning
**Branch:** `task/5.4-privilege-and-secrets`
**Stream refs:** SEC-04, SEC-05

- [ ] **5.4.1** Write tests for privilege escalation blocking and secret scanning (TDD)
- [ ] **5.4.2** Implement privilege escalation hardening — block authority tier self-escalation, enforce tool allowlists, verify identity token binding, log to audit trail
- [ ] **5.4.3** Implement secret scanning for Brain entries — detect API keys, JWTs, PEM headers, connection strings; quarantine entries with detected secrets (< 2% false positive rate)
- [ ] **5.4.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 5.5: Data Sensitivity & Audit Trail
**Branch:** `task/5.5-data-sensitivity-audit`
**Stream refs:** S-20, S-22

- [ ] **5.5.1** Write tests for PII pattern detection and audit trail event logging (TDD)
- [ ] **5.5.2** Implement PII detection sanitizer (email, SSN, credit card, API keys, JWT tokens) — runs before every Brain write, < 5% false positive rate
- [ ] **5.5.3** Implement security audit trail — append-only JSONL log capturing blocked tool uses, injection detections, privilege escalation attempts, PII events, zero-trust failures
- [ ] **5.5.4** Wire existing hooks (prohibitions_enforcer, zero_trust_validator) and new sanitizer into the unified audit trail
- [ ] **5.5.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 5.6: Hook/Control-Plane Bridge
**Branch:** `task/5.6-hook-control-plane-bridge`
**Stream refs:** A-02, A-07

- [ ] **5.6.1** Write tests for bidirectional event flow between hooks and control plane (TDD)
- [ ] **5.6.2** Create shared signal mechanism — hooks write to event_log.jsonl, control plane ingests via JournalIngester, RunawayDetector alerts produce file-based signals hooks can read
- [ ] **5.6.3** Implement unified cross-system event log — single JSONL with events from both hooks and control plane
- [ ] **5.6.4** Verify loop detection from either system is visible in both; control plane dashboard shows hook events
- [ ] **5.6.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 5.7: CI Matrix & Security Scanning
**Branch:** `task/5.7-ci-matrix-security`
**Stream refs:** C-02, C-03, C-04

- [ ] **5.7.1** Write integration test scripts for hooks + control plane end-to-end (TDD)
- [ ] **5.7.2** Add matrix CI builds — run TypeScript and hook tests on ubuntu + macOS, fix platform-specific failures
- [ ] **5.7.3** Add CodeQL security scanning workflow — TypeScript + bash analysis on PRs and weekly schedule
- [ ] **5.7.4** Add integration test stage to CI — start server, run hooks, verify events and alerts
- [ ] **5.7.5** Run full test suite, all linters, cleanup, and pass CI pipeline

---

## Phase 6: Brain Evolution
**Branch:** `slush/phase-6-brain-evolution`
**Scope:** Evolve the Brain knowledge system from B1 completion through B2 (SQLite with semantic search) to B3 scaffold (MCP server, Postgres+pgvector), with graduation metrics and provenance-aware writes.
**Sessions:** 53-64

### Definition of Done
- [ ] B1 comprehensive test suite passes with 20+ tests covering all utilities and edge cases
- [ ] B2 SQLite schema created with FTS5, migration from B1 complete and idempotent
- [ ] B2 query interface is backward-compatible and returns results in < 100ms for 1000+ entries
- [ ] B2 embedding generation pipeline supports pluggable backends with model version tracking
- [ ] B2 similarity search blends keyword and semantic signals
- [ ] B3 MCP server scaffold starts, registers 8 tools, handles basic request/response
- [ ] B3 Postgres+pgvector schema deployed with migration tracking and rollback
- [ ] Graduation metrics system measures B1-to-B2 and B2-to-B3 criteria automatically
- [ ] Brain writes include provenance chain (source agent, source type, source server, confidence)
- [ ] Full test suite, all linters, and CI pipeline pass

### Task 6.1: Brain B1 Comprehensive Tests
**Branch:** `task/6.1-brain-b1-tests`
**Stream refs:** B-06

- [ ] **6.1.1** Write comprehensive tests for all B1 utilities: brain_query, brain_record, brain_retrieve, brain_audit, brain_consolidate, brain_writer.sh (TDD for untested paths)
- [ ] **6.1.2** Add edge case tests — empty brain, special characters in titles, very long content, invalid inputs, concurrent brain_record calls
- [ ] **6.1.3** Verify all 20+ tests pass covering CRUD, demand signals, contradiction detection, and category validation
- [ ] **6.1.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 6.2: B2 Schema & Migration
**Branch:** `task/6.2-b2-schema-migration`
**Stream refs:** B-07, B-08

- [ ] **6.2.1** Write tests for schema creation, migration idempotency, and data integrity (TDD)
- [ ] **6.2.2** Create SQLite schema — entries, links, embeddings, demand_signals tables with versioned migration system
- [ ] **6.2.3** Implement B1-to-B2 migration script — parse all .brain/ JSON files, validate, insert into SQLite, generate migration report
- [ ] **6.2.4** Verify migration is idempotent and preserves all metadata
- [ ] **6.2.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 6.3: B2 Query Interface
**Branch:** `task/6.3-b2-query-interface`
**Stream refs:** B-09

- [ ] **6.3.1** Write tests for FTS5 keyword search, date range filtering, category/project filters, backward compatibility (TDD)
- [ ] **6.3.2** Implement SQLite-based query interface with FTS5 full-text search, temporal filtering, category and project filters
- [ ] **6.3.3** Update brain_query to dispatch to B2 when SQLite DB exists while maintaining backward-compatible CLI
- [ ] **6.3.4** Verify queries return results in < 100ms for 1000+ entries
- [ ] **6.3.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 6.4: B2 Semantic Search
**Branch:** `task/6.4-b2-semantic-search`
**Stream refs:** B-10, B-11

- [ ] **6.4.1** Write tests for embedding generation, storage, model version tracking, and similarity search ranking (TDD)
- [ ] **6.4.2** Implement embedding generation pipeline — pluggable backends, model version tracking, offline mode with pre-computed embeddings
- [ ] **6.4.3** Implement similarity search — cosine distance computation, `brain_query --semantic "topic"` returning ranked entries
- [ ] **6.4.4** Blend keyword and semantic signals when both are available
- [ ] **6.4.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 6.5: B3 Scaffold
**Branch:** `task/6.5-b3-scaffold`
**Stream refs:** B-12, B-13

- [ ] **6.5.1** Write tests for MCP server startup, tool registration, and basic request/response (TDD)
- [ ] **6.5.2** Create MCP server scaffold — 8 tool endpoints (brain_record, brain_query, brain_retrieve, brain_strengthen, brain_supersede, brain_status, brain_audit, brain_purge)
- [ ] **6.5.3** Write tests for Postgres schema deployment and migration tracking (TDD)
- [ ] **6.5.4** Deploy Postgres+pgvector schema with migration tracking, rollback capability, connection pooling
- [ ] **6.5.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 6.6: Graduation Metrics
**Branch:** `task/6.6-graduation-metrics`
**Stream refs:** B-21

- [ ] **6.6.1** Write tests for metric collection, threshold evaluation, and dashboard output (TDD)
- [ ] **6.6.2** Implement B1-to-B2 graduation measurement — hit rate (>= 85%), precision (>= 90%), entry count (>= 50), rolling 7-day window
- [ ] **6.6.3** Implement B2-to-B3 graduation measurement — reuse rate (>= 30%), agent task completion improvement (>= 5%), semantic search precision (>= 80%)
- [ ] **6.6.4** Add graduation readiness dashboard endpoint to control plane
- [ ] **6.6.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 6.7: Provenance-Aware Brain
**Branch:** `task/6.7-provenance-aware-brain`
**Stream refs:** B-29

- [ ] **6.7.1** Write tests for provenance field propagation, confidence scoring by source type, and query filtering by provenance (TDD)
- [ ] **6.7.2** Add provenance fields to brain entries — source_agent, source_type (direct observation / MCP response / A2A / handoff), source_server, confidence level
- [ ] **6.7.3** Implement confidence defaults based on source classification (direct > derived from MCP > received via A2A)
- [ ] **6.7.4** Update brain_query to return provenance metadata; support filtering and weighting by provenance trust
- [ ] **6.7.5** Run full test suite, all linters, cleanup, and pass CI pipeline

---

## Phase 7: MCP Server & Platform Integration
**Branch:** `slush/phase-7-mcp-platform`
**Scope:** Stand up the MCP server scaffold with Brain and Fleet tools, implement MCP server security hardening (behavioral baselining, trust decay, manifest snapshots, hash verification, canary operations), define the platform adapter interface, refactor Claude Code into the adapter pattern, and build the observability foundation.
**Sessions:** 65-76

### Definition of Done
- [ ] MCP server starts, accepts connections via stdio and HTTP+SSE, and serves Brain and Fleet tools
- [ ] Behavioral baselining monitors MCP server runtime behavior and alerts on anomalies
- [ ] Trust decay enforces periodic re-verification of MCP servers
- [ ] Tool manifest snapshots detect runtime tool mutations and block unapproved changes
- [ ] Version hash verification blocks tampered server binaries at startup
- [ ] Canary operations detect data exfiltration and response manipulation
- [ ] Platform adapter interface is defined and Claude Code is refactored to implement it
- [ ] Structured JSON logging, distributed tracing, Prometheus metrics, and health checks are operational
- [ ] All tests pass, linters clean, CI pipeline green

### Task 7.1: MCP Server Scaffold & Configuration
**Branch:** `task/7.1-mcp-scaffold`
**Stream refs:** M-01a, M-01b

- [ ] **7.1.1** Write tests for MCP server startup, transport negotiation (stdio + HTTP+SSE), tool discovery, and concurrent request handling (TDD)
- [ ] **7.1.2** Implement core MCP server with JSON-RPC protocol, dual transport, tool registry, health check endpoint, and request logging
- [ ] **7.1.3** Write tests for configuration loading, tool enable/disable, agent-to-tool access mappings (TDD)
- [ ] **7.1.4** Implement MCP server configuration system with per-project overrides, version pinning, and trust classification
- [ ] **7.1.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 7.2: Brain MCP Tools
**Branch:** `task/7.2-brain-tools`
**Stream refs:** M-02

- [ ] **7.2.1** Write tests for brain_query and brain_record MCP tools (TDD)
- [ ] **7.2.2** Implement brain_query with ranked results and brain_record with Brain entry persistence
- [ ] **7.2.3** Write tests for brain_retrieve and brain_strengthen MCP tools (TDD)
- [ ] **7.2.4** Implement brain_retrieve (link traversal, configurable depth) and brain_strengthen (usefulness score increment with agent attribution)
- [ ] **7.2.5** Write tests for brain_audit and brain_purge MCP tools with RBAC (TDD)
- [ ] **7.2.6** Implement brain_audit and brain_purge with role-based access control enforcement
- [ ] **7.2.7** Run test suite, linters, cleanup, and pass CI pipeline

### Task 7.3: Fleet MCP Tools
**Branch:** `task/7.3-fleet-tools`
**Stream refs:** M-03

- [ ] **7.3.1** Write tests for fleet_status, agent_registry, and task_route MCP tools (TDD)
- [ ] **7.3.2** Implement fleet_status tool with agent count, task counts, budget summary, and alert data
- [ ] **7.3.3** Implement agent_registry tool with capability-based agent discovery
- [ ] **7.3.4** Implement task_route tool with routing chain returning recommendations without executing assignments
- [ ] **7.3.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 7.4: MCP Behavioral Baselining & Trust Decay
**Branch:** `task/7.4-mcp-behavior-trust`
**Stream refs:** M-10, M-11

- [ ] **7.4.1** Write tests for behavioral baseline recording and anomaly detection with synthetic data (TDD)
- [ ] **7.4.2** Implement mcp_behavior_monitor PostToolUse hook with rolling statistical model and configurable alert thresholds
- [ ] **7.4.3** Write tests for trust decay and re-verification scheduling (TDD)
- [ ] **7.4.4** Implement MCP server trust decay with configurable re-verification cadence and trust freeze on tool discovery deltas
- [ ] **7.4.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 7.5: MCP Manifest Snapshots & Hash Verification
**Branch:** `task/7.5-mcp-manifest-hash`
**Stream refs:** M-12, M-13

- [ ] **7.5.1** Write tests for manifest snapshot capture, runtime comparison, and hard block on unapproved changes (TDD)
- [ ] **7.5.2** Implement tool manifest snapshot and continuous comparison guard
- [ ] **7.5.3** Write tests for binary hash recording and pre-startup verification (TDD)
- [ ] **7.5.4** Implement version pinning with SHA-256 binary hash verification as runtime enforcement gate
- [ ] **7.5.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 7.6: MCP Canary Operations
**Branch:** `task/7.6-mcp-canary`
**Stream refs:** M-14

- [ ] **7.6.1** Write tests for canary injection, verification, and egress detection (TDD)
- [ ] **7.6.2** Implement PreToolUse canary injection hook with cryptographic tagging
- [ ] **7.6.3** Implement PostToolUse canary verification and egress monitoring for canary marker leakage
- [ ] **7.6.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 7.7: Platform Adapter Interface & Claude Code Refactor
**Branch:** `task/7.7-platform-adapter`
**Stream refs:** PA-01, PA-02

- [ ] **7.7.1** Write tests for abstract adapter interface contract — lifecycle hooks, context injection, tool permissions, event emission (TDD)
- [ ] **7.7.2** Define the platform adapter interface as a TypeScript interface with full JSDoc
- [ ] **7.7.3** Write tests for Claude Code adapter — hook payload translation, config loading, event emission (TDD)
- [ ] **7.7.4** Extract all Claude Code-specific logic into `platform/claude-code/` implementing the adapter interface
- [ ] **7.7.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 7.8: Observability Foundation
**Branch:** `task/7.8-observability`
**Stream refs:** OB-01, OB-02, OB-03, OB-04

- [ ] **7.8.1** Write tests for structured JSON logging with required fields (TDD)
- [ ] **7.8.2** Implement log_structured function for hooks and structured logger for control plane; replace all echo/console.log
- [ ] **7.8.3** Write tests for distributed tracing — trace ID propagation, span relationships, trace reconstruction (TDD)
- [ ] **7.8.4** Implement distributed tracing with trace/span ID generation and cross-component propagation
- [ ] **7.8.5** Write tests for Prometheus metrics and health check aggregation (TDD)
- [ ] **7.8.6** Implement /metrics endpoint with hook latency, pass/fail counters, governance overhead ratio; implement /health aggregating all component probes
- [ ] **7.8.7** Run full test suite, all linters, cleanup, and pass CI pipeline

---

## Phase 8: Governance, Autonomy & Data Intelligence
**Branch:** `slush/phase-8-governance-autonomy`
**Scope:** Build the meta-governance agent framework (Sentinel, Arbiter, Compliance Monitor), implement progressive autonomy with trust-based permission gating, establish the data ecosystem (knowledge graph, gardener, curator, harvester agents), add cascade containment circuit breakers, and enforce A2A payload inspection with data classification tags.
**Sessions:** 77-88

### Definition of Done
- [ ] Governance agent framework supports Sentinel, Arbiter, and Compliance Monitor with event bus and intervention protocol
- [ ] Progressive autonomy tracks trust per agent per category with automatic promotion, demotion, and permission gating
- [ ] Knowledge graph links Brain entries with typed, directional relationships and multi-hop traversal
- [ ] Knowledge maintenance agents (gardener, curator, harvester) produce structured proposals
- [ ] Cascade containment circuit breakers quarantine compromised data and suspend affected A2A connections
- [ ] A2A payload inspection runs through quarantine layers; data classification tags enforce cross-server flow control
- [ ] All tests pass, linters clean, CI pipeline green

### Task 8.1: Governance Event Bus & Intervention Protocol
**Branch:** `task/8.1-governance-infra`
**Stream refs:** MG-05, MG-07

- [ ] **8.1.1** Write tests for governance event bus — pub/sub, filtering, durable storage, event types (TDD)
- [ ] **8.1.2** Implement governance event bus with pub/sub, filtering, and durable event storage
- [ ] **8.1.3** Write tests for intervention protocol — escalation ladder (warn, restrict, suspend, terminate), cooldown, reversal (TDD)
- [ ] **8.1.4** Implement governance intervention protocol with all four escalation levels and full audit logging
- [ ] **8.1.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 8.2: Governance Agent Framework & Core Agents
**Branch:** `task/8.2-governance-agents`
**Stream refs:** MG-01, MG-02, MG-03, MG-04

- [ ] **8.2.1** Write tests for governance agent base template — event subscription, finding emission, self-modification prohibition (TDD)
- [ ] **8.2.2** Implement governance agent framework with base template enforcing governance agents cannot modify their own configuration
- [ ] **8.2.3** Write tests for Sentinel agent — loop detection, budget burn rate anomalies, scope drift, automatic intervention (TDD)
- [ ] **8.2.4** Implement Sentinel agent with four detection capabilities and intervention protocol integration
- [ ] **8.2.5** Write tests for Arbiter agent — contradictory output detection, overlapping scope claims, resolution strategies (TDD)
- [ ] **8.2.6** Implement Arbiter agent with conflict detection and evidence-based resolution
- [ ] **8.2.7** Write tests for Compliance Monitor — per-SO compliance scoring, bypass detection, degradation trends (TDD)
- [ ] **8.2.8** Implement Compliance Monitor validating all 16 Standing Orders
- [ ] **8.2.9** Run test suite, linters, cleanup, and pass CI pipeline

### Task 8.3: Trust Level Model & Scoring
**Branch:** `task/8.3-trust-model`
**Stream refs:** AU-01, AU-02, AU-04, AU-05

- [ ] **8.3.1** Write tests for trust level data model — four stages, per-category tracking, transition history (TDD)
- [ ] **8.3.2** Implement trust level data model with all four stages and per-category tracking
- [ ] **8.3.3** Write tests for trust scoring — outcome handling, severity weighting, score history (TDD)
- [ ] **8.3.4** Implement trust score calculation engine with severity-weighted adjustments
- [ ] **8.3.5** Write tests for trust demotion — critical failure revert, model change fleet-wide revert, security incident revert (TDD)
- [ ] **8.3.6** Implement automatic trust demotion with category-specific and fleet-wide triggers
- [ ] **8.3.7** Write tests for trust promotion — graduation criteria, operator approval flow, prerequisite verification (TDD)
- [ ] **8.3.8** Implement automatic trust promotion recommendations with operator approval gate
- [ ] **8.3.9** Run test suite, linters, cleanup, and pass CI pipeline

### Task 8.4: Trust-Based Permission Gating
**Branch:** `task/8.4-trust-gating`
**Stream refs:** AU-03

- [ ] **8.4.1** Write tests for permission gating — hooks adjust enforcement based on trust level dynamically (TDD)
- [ ] **8.4.2** Implement trust_gate hook reading per-category trust levels and switching between Propose and Autonomous enforcement
- [ ] **8.4.3** Write integration tests for end-to-end trust-based permission changes across stage transitions
- [ ] **8.4.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 8.5: Knowledge Graph
**Branch:** `task/8.5-knowledge-graph`
**Stream refs:** DE-01

- [ ] **8.5.1** Write tests for knowledge graph links — six link types, confidence scores, bidirectional traversal, multi-hop queries (TDD)
- [ ] **8.5.2** Implement entry_links schema and link creation/traversal integrated with brain_query
- [ ] **8.5.3** Run test suite, linters, cleanup, and pass CI pipeline

### Task 8.6: Knowledge Maintenance Agents
**Branch:** `task/8.6-knowledge-agents`
**Stream refs:** DE-02, DE-03, DE-04

- [ ] **8.6.1** Write tests for knowledge gardener — staleness, contradiction, duplicate, orphan detection (TDD)
- [ ] **8.6.2** Implement knowledge gardener agent producing structured maintenance reports
- [ ] **8.6.3** Write tests for knowledge curator — metadata enrichment, format standardization, quality scoring (TDD)
- [ ] **8.6.4** Implement knowledge curator agent producing improvement proposals with before/after comparisons
- [ ] **8.6.5** Write tests for knowledge harvester — extraction from git diffs, PR descriptions, commit messages (TDD)
- [ ] **8.6.6** Implement knowledge harvester agent with source attribution and Data Sensitivity Protocol enforcement
- [ ] **8.6.7** Run test suite, linters, cleanup, and pass CI pipeline

### Task 8.7: Cascade Containment Circuit Breakers
**Branch:** `task/8.7-circuit-breakers`
**Stream refs:** SEC-14

- [ ] **8.7.1** Write tests for cascade containment — Brain entry quarantine, A2A suspension, contamination graph tracing (TDD)
- [ ] **8.7.2** Implement circuit breaker triggered on MCP server compromise — quarantine affected Brain entries, suspend affected A2A connections
- [ ] **8.7.3** Implement contamination graph computation tracing data lineage from compromised server through agents and Brain entries
- [ ] **8.7.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 8.8: A2A Security — Payload Inspection & Data Classification
**Branch:** `task/8.8-a2a-security`
**Stream refs:** S-44, S-45

- [ ] **8.8.1** Write tests for A2A payload inspection — quarantine layers, injection detection, taint tracking (TDD)
- [ ] **8.8.2** Implement A2A content inspector running incoming messages through quarantine pipeline with taint propagation
- [ ] **8.8.3** Write tests for data classification tags — four sensitivity levels, server ceilings, cross-classification gates (TDD)
- [ ] **8.8.4** Implement data classification system with sensitivity labels, server ceilings, and Admiral authorization gate for cross-classification transfers
- [ ] **8.8.5** Run full test suite, all linters, cleanup, and pass CI pipeline

---

## Phase 9: Strategic Excellence & Showcase
**Branch:** `slush/phase-9-strategic-excellence`
**Scope:** Showcase Admiral as enterprise-ready and standards-aligned. Align with OWASP, NIST, ISO, EU AI Act, AEGIS, McKinsey, and IMDA. Build simulation, chaos, and e2e testing. Implement quality assurance system, rating system, and thesis validation. Harden remaining Standing Orders enforcement. Complete context engineering and codebase excellence tooling.
**Sessions:** 89-104

### Definition of Done
- [ ] OWASP Agentic Top 10, NIST Zero Trust, ISO 42001, and EU AI Act compliance crosswalks are complete
- [ ] Forrester AEGIS, KPMG TACO, McKinsey, and Singapore IMDA alignment documents are published
- [ ] Deterministic simulation testing replays 10+ recorded sequences
- [ ] Chaos testing suite covers 20+ failure scenarios with hooks surviving gracefully
- [ ] End-to-end session simulation passes with consistent state
- [ ] Quality assurance pipeline runs all 6 stages (lint, type-check, test, coverage, security, review)
- [ ] Rating system calculates ADM-1 through ADM-5 tiers automatically with CI integration
- [ ] Thesis validation metrics are defined with A/B comparison framework operational
- [ ] Context engineering system manages profiles, budgets, compression, and overflow
- [ ] Full test suite, all linters, and CI pipeline pass

### Task 9.1: Standards Compliance — Security Frameworks
**Branch:** `task/9.1-security-compliance`
**Stream refs:** R-01, R-04

- [ ] **9.1.1** Write validation tests for compliance document structure (TDD)
- [ ] **9.1.2** Create OWASP Agentic Top 10 crosswalk mapping each risk to Admiral failure modes and defenses (R-01)
- [ ] **9.1.3** Create NIST SP 800-207 Zero Trust alignment mapping Admiral identity tokens and access controls (R-04)
- [ ] **9.1.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 9.2: Standards Compliance — Industry & Regulatory
**Branch:** `task/9.2-industry-regulatory`
**Stream refs:** R-02, R-03, R-05, R-06, R-08, R-09

- [ ] **9.2.1** Write validation tests for crosswalk coverage metrics (TDD)
- [ ] **9.2.2** Create Forrester AEGIS framework crosswalk with per-domain coverage percentages (R-02)
- [ ] **9.2.3** Create KPMG TACO framework tagging for all agent roles (R-03)
- [ ] **9.2.4** Create McKinsey Agentic Organization mapping to 5 pillars (R-05)
- [ ] **9.2.5** Create Singapore IMDA regulatory alignment document (R-06)
- [ ] **9.2.6** Create ISO 42001 clause-by-clause mapping with Statement of Applicability template (R-08)
- [ ] **9.2.7** Create EU AI Act compliance mapping with risk classification crosswalk (R-09)
- [ ] **9.2.8** Run test suite, linters, cleanup, and pass CI pipeline

### Task 9.3: Simulation & Chaos Testing
**Branch:** `task/9.3-simulation-chaos`
**Stream refs:** X-01, X-02, X-03

- [ ] **9.3.1** Write test framework for simulation replay determinism and chaos scenario criteria (TDD)
- [ ] **9.3.2** Implement deterministic simulation testing harness with replay of 10+ recorded hook sequences (X-01)
- [ ] **9.3.3** Implement chaos testing suite with 20+ failure scenarios (missing jq, corrupted state, huge payloads, slow disk, concurrent execution, read-only FS) (X-02)
- [ ] **9.3.4** Implement end-to-end Claude Code session simulation covering full SessionStart through 50+ tool use cycles (X-03)
- [ ] **9.3.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 9.4: Quality Assurance System
**Branch:** `task/9.4-quality-assurance`
**Stream refs:** QA-01 to QA-10

- [ ] **9.4.1** Write tests for code review checks, quality pipeline stages, metrics collection, and trend detection (TDD)
- [ ] **9.4.2** Implement automated code review — naming, complexity, test presence, import hygiene, doc presence, file size checks (QA-01)
- [ ] **9.4.3** Implement multi-stage quality gate pipeline (lint, type-check, test, coverage, security, review) with self-healing loop (QA-03)
- [ ] **9.4.4** Implement quality metrics collection per module — complexity, coverage, churn, defect density, lint violations, test ratio (QA-04)
- [ ] **9.4.5** Implement quality trend analysis with moving averages and decline detection (QA-05)
- [ ] **9.4.6** Implement technical debt tracker scanning TODO/FIXME, skipped tests, outdated deps, code duplication (QA-06)
- [ ] **9.4.7** Implement composite quality score per module (0-100) with CI regression gate (QA-09, QA-10)
- [ ] **9.4.8** Run test suite, linters, cleanup, and pass CI pipeline

### Task 9.5: Rating System
**Branch:** `task/9.5-rating-system`
**Stream refs:** RT-01 to RT-10

- [ ] **9.5.1** Write tests for rating tier calculation, hard cap application, badge generation, and history tracking (TDD)
- [ ] **9.5.2** Define rating data model — 5 tiers (ADM-1 to ADM-5), 7 core dimensions, hard cap rules, certification suffixes (RT-01)
- [ ] **9.5.3** Implement automated rating calculation script with Rating Reports (RT-02)
- [ ] **9.5.4** Integrate rating into CI with regression detection and PR summaries (RT-03)
- [ ] **9.5.5** Implement SVG badge generation for all 5 tiers with color coding (RT-04)
- [ ] **9.5.6** Implement rating history tracking as append-only JSONL with per-dimension scores (RT-05)
- [ ] **9.5.7** Implement improvement recommendation engine and rating dashboard (RT-06, RT-09)
- [ ] **9.5.8** Run test suite, linters, cleanup, and pass CI pipeline

### Task 9.6: Thesis Validation
**Branch:** `task/9.6-thesis-validation`
**Stream refs:** TV-01 to TV-05

- [ ] **9.6.1** Write tests for thesis metrics schema, A/B framework mode switching, and case study template (TDD)
- [ ] **9.6.2** Define measurable thesis metrics with null hypotheses for both claims (TV-01)
- [ ] **9.6.3** Implement advisory vs enforcement A/B framework measuring violation rate, severity, quality, time (TV-02)
- [ ] **9.6.4** Create case study framework and document 5+ real enforcement case studies with counterfactual analysis (TV-03)
- [ ] **9.6.5** Implement longitudinal agent quality tracking correlated with governance milestones (TV-04)
- [ ] **9.6.6** Create developer experience survey framework with NPS adaptation (TV-05)
- [ ] **9.6.7** Run test suite, linters, cleanup, and pass CI pipeline

### Task 9.7: Context Engineering System
**Branch:** `task/9.7-context-engineering`
**Stream refs:** CE-01 to CE-10

- [ ] **9.7.1** Write tests for context profile zones, budget tracking, compression triggers, and overflow thresholds (TDD)
- [ ] **9.7.2** Implement context profile data model with three zones (standing 15-25%, session 50-65%, working 20-30%) and 50K hard limit (CE-01)
- [ ] **9.7.3** Implement context budget tracker with overrun warnings and sacrifice order triggers (CE-02)
- [ ] **9.7.4** Implement three compression strategies — summarization, prioritization, eviction (CE-03)
- [ ] **9.7.5** Implement context relevance scoring across five dimensions (CE-04)
- [ ] **9.7.6** Implement context injection ordering enforcing primacy/recency effects (CE-05)
- [ ] **9.7.7** Implement graduated overflow handling at 80/90/95/100% thresholds (CE-07)
- [ ] **9.7.8** Implement dynamic context allocation and predictive preloading (CE-08, CE-09)
- [ ] **9.7.9** Implement context audit trail and utilization dashboard (CE-06, CE-10)
- [ ] **9.7.10** Run test suite, linters, cleanup, and pass CI pipeline

### Task 9.8: Codebase Excellence Tooling
**Branch:** `task/9.8-codebase-excellence`
**Stream refs:** X-04, X-07, X-08, X-09, X-10, X-11, X-13, X-14, X-16, X-17

- [ ] **9.8.1** Write tests for hook profiler, contract validation, and license audit (TDD)
- [ ] **9.8.2** Implement hook execution profiler measuring p50/p95/p99 latency per hook type (X-04)
- [ ] **9.8.3** Implement cross-system unified event log writable by both shell hooks and TypeScript (X-07)
- [ ] **9.8.4** Implement automated API documentation generation with CI drift detection (X-08)
- [ ] **9.8.5** Add dependency license audit CI step (X-09)
- [ ] **9.8.6** Implement reproducible build verification (X-10)
- [ ] **9.8.7** Implement architecture visualization generating Mermaid diagrams (X-11)
- [ ] **9.8.8** Implement contract testing between hooks and control plane (X-13)
- [ ] **9.8.9** Implement security penetration testing suite with 30+ attack scenarios (X-14)
- [ ] **9.8.10** Implement git history quality audit and documentation coverage report (X-16, X-17)
- [ ] **9.8.11** Run full test suite, all linters, cleanup, and pass CI pipeline

---

## Phase 10: Future-Proofing & Platform Vision
**Branch:** `slush/phase-10-future-proofing`
**Scope:** Extend Admiral into indispensable infrastructure. Implement agent versioning, plugin architecture, multi-repo support, intent engineering, governance platform API, performance profiling, cost optimization, thesis completion, strategic positioning, collaboration patterns, and real-time dashboards.
**Sessions:** 104+

### Definition of Done
- [ ] Agent definitions are versioned with rollback; running sessions unaffected by mid-session changes
- [ ] Plugin system supports hook, agent, and integration extension points with sandboxed permissions
- [ ] Multi-repo governance enforces shared policies with per-repo overrides
- [ ] Intent engineering captures, decomposes, validates, and tracks structured intents through completion
- [ ] Governance platform API serves fleet status, policy management, audit trails, and event streaming
- [ ] Webhook integrations deliver governance events to Slack, PagerDuty, Jira, and generic HTTP
- [ ] Thesis validation includes governance overhead measurement, ROI model, and false positive tracking
- [ ] Agent collaboration patterns (pipeline, broadcast, consensus, delegation) are implemented
- [ ] Real-time fleet dashboard shows all active agents with live governance status
- [ ] Full test suite, all linters, and CI pipeline pass

### Task 10.1: Agent Lifecycle & Versioning
**Branch:** `task/10.1-agent-versioning`
**Stream refs:** IF-01

- [ ] **10.1.1** Write tests for version registry, mid-session isolation, and rollback (TDD)
- [ ] **10.1.2** Implement semantic versioning for agent definitions with version registry and changelogs
- [ ] **10.1.3** Implement session-scoped version pinning so running sessions are unaffected by definition changes
- [ ] **10.1.4** Implement rollback to previous agent definition versions
- [ ] **10.1.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.2: Plugin System & Multi-Repo
**Branch:** `task/10.2-plugins-multi-repo`
**Stream refs:** IF-03, IF-04

- [ ] **10.2.1** Write tests for plugin manifest validation, lifecycle hooks, sandboxing, and multi-repo config resolution (TDD)
- [ ] **10.2.2** Define plugin manifest schema for hook, agent, and integration extension points (IF-03)
- [ ] **10.2.3** Implement plugin loader with lifecycle management (install/enable/disable/uninstall) and permission sandboxing
- [ ] **10.2.4** Create example plugins for each extension point
- [ ] **10.2.5** Implement hub-and-spoke multi-repo central config with shared Standing Orders and per-repo overrides (IF-04)
- [ ] **10.2.6** Implement cross-repository Brain access with access control model
- [ ] **10.2.7** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.3: Intent Engineering — Capture & Validation
**Branch:** `task/10.3-intent-capture`
**Stream refs:** IE-01, IE-02, IE-03

- [ ] **10.3.1** Write tests for intent schema validation, decomposition, and validation checks (TDD)
- [ ] **10.3.2** Implement intent capture schema with six elements (goal, priority, constraints, failure modes, judgment boundaries, values) (IE-01)
- [ ] **10.3.3** Implement intent decomposition engine producing task graphs with inherited constraints (IE-02)
- [ ] **10.3.4** Implement intent validation — completeness, ambiguity detection, constraint consistency, achievability, scope estimation (IE-03)
- [ ] **10.3.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.4: Intent Engineering — Tracking, Routing & Intelligence
**Branch:** `task/10.4-intent-tracking`
**Stream refs:** IE-04, IE-05, IE-06, IE-07, IE-08

- [ ] **10.4.1** Write tests for intent tracking, routing, conflict detection, and template validation (TDD)
- [ ] **10.4.2** Implement intent tracking dashboard with status, sub-intent progress, health indicators (IE-04)
- [ ] **10.4.3** Implement intent-to-agent mapping with model tier selection and fallback routing (IE-05)
- [ ] **10.4.4** Implement intent history recording with pattern extraction and Brain integration (IE-06)
- [ ] **10.4.5** Create five intent templates (bug fix, feature, refactor, review, security audit) (IE-07)
- [ ] **10.4.6** Implement intent conflict detection — goal contradiction, constraint violation, resource contention, scope overlap, priority inversion (IE-08)
- [ ] **10.4.7** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.5: Governance Platform — Core API & Policies
**Branch:** `task/10.5-governance-api`
**Stream refs:** GP-01, GP-02

- [ ] **10.5.1** Write tests for API endpoints, authentication, and policy CRUD (TDD)
- [ ] **10.5.2** Implement governance REST API server with health, fleet status, policies, and audit endpoints (GP-01)
- [ ] **10.5.3** Implement policy management CRUD with append-only versioning and audit-logged deactivation (GP-02)
- [ ] **10.5.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.6: Governance Platform — Events, Reporting & SDK
**Branch:** `task/10.6-governance-events-sdk`
**Stream refs:** GP-05, GP-06, GP-07, GP-09

- [ ] **10.6.1** Write tests for SSE event streaming, report generation, SDK operations, and config rollback (TDD)
- [ ] **10.6.2** Implement governance event streaming via SSE and polling with filtering (GP-05)
- [ ] **10.6.3** Implement governance reporting — compliance, KPI, fleet health, audit, trend analysis (GP-06)
- [ ] **10.6.4** Build governance SDK with typed API wrappers and shell CLI wrapper (GP-07)
- [ ] **10.6.5** Implement governance configuration management with versioning, diff, rollback, export/import (GP-09)
- [ ] **10.6.6** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.7: Governance Platform — Integrations & Deployment
**Branch:** `task/10.7-governance-integrations`
**Stream refs:** GP-08, GP-10

- [ ] **10.7.1** Write tests for webhook delivery, filtering, rate limiting, and retry (TDD)
- [ ] **10.7.2** Implement webhook integrations for Slack, PagerDuty, Jira, and generic HTTP (GP-10)
- [ ] **10.7.3** Write governance deployment guide — single-operator, team, security hardening, runbook, recipes (GP-08)
- [ ] **10.7.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.8: Performance Profiling & Cost Optimization
**Branch:** `task/10.8-performance-cost`
**Stream refs:** IF-05, IF-06

- [ ] **10.8.1** Write tests for per-agent metric collection and cost optimization strategies (TDD)
- [ ] **10.8.2** Implement per-agent profiling — token usage, first-pass quality, revision depth, time-to-completion, context efficiency (IF-05)
- [ ] **10.8.3** Implement cost optimization engine with three strategies (minimize cost, maximize quality, balanced) (IF-06)
- [ ] **10.8.4** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.9: Thesis Completion — Cost, ROI & Community
**Branch:** `task/10.9-thesis-completion`
**Stream refs:** TV-06, TV-07, TV-08, TV-09, TV-10

- [ ] **10.9.1** Write tests for false positive tracking, overhead measurement, and ROI calculation (TDD)
- [ ] **10.9.2** Implement false positive tracking with per-hook aggregate metrics (TV-06)
- [ ] **10.9.3** Implement governance overhead measurement — hook latency, token ratio, context overhead, developer interruption cost (TV-07)
- [ ] **10.9.4** Build ROI calculation model with breakeven and sensitivity analysis (TV-08)
- [ ] **10.9.5** Create academic paper outline with 8 sections and target venue identification (TV-09)
- [ ] **10.9.6** Create community feedback collection framework with GitHub issue templates and triage process (TV-10)
- [ ] **10.9.7** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.10: Strategic Positioning & Community
**Branch:** `task/10.10-strategic-positioning`
**Stream refs:** R-07, R-10, R-11, R-12, R-13

- [ ] **10.10.1** Write validation tests for positioning document completeness (TDD)
- [ ] **10.10.2** Create AI Work OS positioning document reframing Admiral as OS for AI work (R-07)
- [ ] **10.10.3** Create competitive differentiation matrix vs LangGraph, CrewAI, AutoGen, Semantic Kernel (R-10)
- [ ] **10.10.4** Create enterprise adoption playbook — discovery, evaluation, pilot, rollout, operationalization (R-11)
- [ ] **10.10.5** Define open-source community strategy — governance model, contribution workflow, release cadence (R-12)
- [ ] **10.10.6** Create academic research positioning with literature survey (R-13)
- [ ] **10.10.7** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.11: Collaboration Patterns & Session Replay
**Branch:** `task/10.11-collaboration-replay`
**Stream refs:** IF-08, IF-11

- [ ] **10.11.1** Write tests for pipeline, broadcast, consensus, delegation patterns and session replay comparison (TDD)
- [ ] **10.11.2** Implement four collaboration patterns with handoff validation and trace spans (IF-11)
- [ ] **10.11.3** Implement session recording capturing tool invocations, hook executions, brain queries, context state (IF-08)
- [ ] **10.11.4** Implement session replay with comparison reporting (IF-08)
- [ ] **10.11.5** Run test suite, linters, cleanup, and pass CI pipeline

### Task 10.12: Real-Time Dashboard & Remaining Excellence
**Branch:** `task/10.12-realtime-dashboard`
**Stream refs:** IF-12, X-12, X-15, X-18

- [ ] **10.12.1** Write tests for SSE event delivery, dashboard rendering, and load test harness (TDD)
- [ ] **10.12.2** Implement real-time collaboration dashboard with fleet map, task board, event stream, resource meters, governance overlay via SSE (IF-12)
- [ ] **10.12.3** Implement contribution complexity analyzer for good-first-issue identification (X-12)
- [ ] **10.12.4** Implement control plane load testing harness — 1000+ concurrent connections, memory stability soak test (X-15)
- [ ] **10.12.5** Implement WCAG 2.1 AA accessibility audit for control plane dashboard (X-18)
- [ ] **10.12.6** Run full test suite, all linters, cleanup, and pass CI pipeline

### Task 10.13: Multi-Tenant, Policy DSL & Deferred Items
**Branch:** `task/10.13-deferred-vision`
**Stream refs:** IF-02, IF-07, IF-09, IF-10, GP-03, GP-04

- [ ] **10.13.1** Write tests for marketplace format, A/B routing, tenant isolation, and policy DSL parsing (TDD)
- [ ] **10.13.2** Design agent marketplace package format with publish/install workflow and trust boundaries (IF-02)
- [ ] **10.13.3** Implement A/B testing framework — experiment definition, traffic routing, statistical significance (IF-07)
- [ ] **10.13.4** Implement natural language policy compiler with suggest and apply modes (IF-09)
- [ ] **10.13.5** Implement governance compliance certification report aligned with Rating System (IF-10)
- [ ] **10.13.6** Implement multi-tenant support with isolated policies, audit trails, and Brain namespaces (GP-03)
- [ ] **10.13.7** Define governance policy DSL with threshold/pattern/temporal rules and linter (GP-04)
- [ ] **10.13.8** Run full test suite, all linters, cleanup, and pass CI pipeline
