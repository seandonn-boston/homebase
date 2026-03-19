# Stream 3: Architecture & Design — From 5/10 to 10/10

> *"Clean module boundaries with explicit interfaces/contracts." — Pattern across all Tier 1 codebases*

**Current score:** 5/10
**Target score:** 10/10

**Gap summary:** Clean separation, zero runtime deps, file locking in place. Missing: hook/control-plane integration, schema validation, typed errors, fleet orchestration, execution patterns, meta-governance.

---

## 3.1 Schema & Validation

- [ ] **A-01: Add JSON schema validation for hook payloads**
  - **Description:** Define JSON schemas for hook I/O. Create validation function in `admiral/lib/schema_validate.sh`. Apply to adapters. Schemas define the contract between Claude Code and Admiral hooks — without them, payload changes are invisible and break things silently. Validation follows fail-open per ADR-004: invalid payloads are logged but do not block execution.
  - **Done when:** Schemas exist in `admiral/schemas/`. Adapters validate input. Invalid payloads logged (fail-open per ADR-004).
  - **Files:** `admiral/schemas/` (new), `admiral/lib/schema_validate.sh` (new), `.hooks/pre_tool_use_adapter.sh`, `.hooks/post_tool_use_adapter.sh`
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 3 — Enforcement
  - **Depends on:** —

- [ ] **A-06: Session state schema validation**
  - **Description:** Validate session_state.json structure against a JSON schema at every write. Catches state corruption early — before it propagates through the system and causes confusing downstream failures. Schema defines required fields, types, and allowed values.
  - **Done when:** Malformed state writes are caught and logged. Schema rejects invalid state mutations.
  - **Files:** `admiral/lib/state.sh`, `admiral/schemas/session_state.schema.json` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 4 — Session Lifecycle
  - **Depends on:** A-01

---

## 3.2 System Integration

- [ ] **A-02: Bridge control plane and hooks**
  - **Description:** Create shared signal mechanism between hooks and control plane. Hooks write to event_log.jsonl, control plane ingests via JournalIngester. RunawayDetector alerts produce file-based signals hooks can read. loop_detector.sh events become JSONL entries for control plane. This closes the gap between the two halves of the system.
  - **Done when:** Loop detected by either system is visible in both. Events flow bidirectionally.
  - **Files:** `control-plane/src/ingest.ts`, `.hooks/loop_detector.sh`, `admiral/lib/state.sh`
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 2 — Control Plane
  - **Depends on:** —

- [ ] **A-07: Unified cross-system event log**
  - **Description:** Hooks and control plane share a single JSONL event log. Both can write and query. Currently events from hooks and the control plane live in separate stores, making it impossible to see a unified timeline. A single log enables correlation of hook executions with control plane decisions.
  - **Done when:** Events from both systems in one log. Control plane dashboard shows hook events. Timeline is coherent.
  - **Files:** `admiral/lib/event_log.sh` (new), `control-plane/src/ingest.ts`
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 2 — Control Plane
  - **Depends on:** A-02

---

## 3.3 Infrastructure & Tooling

- [ ] **A-03: Document API endpoints**
  - **Description:** Create/update `control-plane/API.md` with every endpoint: method, path, request/response schemas, status codes, curl examples. An undocumented API is an unusable API. This is the reference that contributors and integrators need.
  - **Done when:** Every route documented with method, path, request/response, status codes, and curl examples.
  - **Files:** `control-plane/API.md`, `README.md`
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **A-04: Add bash dependency checker script**
  - **Description:** Check for required tools: jq >= 1.6, sha256sum/shasum, uuidgen, date, flock, shellcheck. Reports versions and exits non-zero on missing critical deps. Prevents the "works on my machine" problem for bash hook development.
  - **Done when:** Script reports versions, exits non-zero on missing critical deps. Runs in CI.
  - **Files:** `admiral/bin/check_deps` (new), `.github/workflows/hook-tests.yml`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **A-05: Configuration consolidation**
  - **Description:** Single source of truth for all config. Currently scattered across config.json, hardcoded defaults in hooks, schema templates, and AGENTS.md. Create `admiral/config/admiral.json` as canonical config with schema validation. Every hook reads config from one place. No more hardcoded defaults.
  - **Done when:** Single config file, validated at session start. No hardcoded config values in hooks.
  - **Files:** `admiral/config/admiral.json` (new), `admiral/config/schema.json` (new), `admiral/lib/config.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** A-01

---

## 3.4 Advanced Architecture

- [ ] **A-08: Hook execution pipeline abstraction**
  - **Description:** Define and implement a formal hook lifecycle pipeline: load -> validate -> execute -> emit -> report. Currently each hook implements its own ad-hoc lifecycle, leading to inconsistencies in validation, event emission, and error reporting. The pipeline abstraction provides a single entry point (`run_hook()`) that handles the entire lifecycle, ensuring every hook validates its input (via A-01 schemas), emits a start/complete event, reports execution time, and handles errors consistently. Each phase is a discrete function that can be tested independently.
  - **Done when:** `run_hook()` function implements the full 5-phase lifecycle. All hooks use `run_hook()` as their entry point. Each phase is independently testable. Hook execution time is automatically measured and reported.
  - **Files:** `admiral/lib/hook_pipeline.sh` (new), all `.hooks/*_adapter.sh`
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 3 — Enforcement
  - **Depends on:** Q-02, A-01

- [ ] **A-09: Plugin architecture for hook extensions**
  - **Description:** Allow custom hooks without modifying core Admiral code. Define a plugin discovery mechanism: hooks in `admiral/plugins/hooks/` are automatically loaded alongside core hooks. Plugins follow the same lifecycle (A-08) and schema validation (A-01) as core hooks. Plugin manifest (`plugin.json`) declares hook type, priority, and dependencies. This enables third-party extensions and organization-specific customizations without forking.
  - **Done when:** Plugin directory scanned at session start. Plugin hooks execute alongside core hooks. Plugin manifest schema defined. At least one example plugin created. Core hooks unmodified.
  - **Files:** `admiral/plugins/` (new directory), `admiral/lib/plugin_loader.sh` (new), `admiral/schemas/plugin.schema.json` (new), `admiral/plugins/example/` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** A-08, A-01

- [ ] **A-10: State machine for session lifecycle**
  - **Description:** Formalize the session lifecycle as an explicit state machine with defined states: init -> active -> paused -> terminating -> complete. Currently session state transitions are implicit and scattered across multiple hooks and scripts. An explicit state machine makes transitions visible, prevents invalid state transitions (e.g., terminating -> init), and provides a single place to understand the session lifecycle. Each transition emits an event and validates preconditions.
  - **Done when:** State machine implemented with all 5 states. Invalid transitions rejected with descriptive errors. Every state transition emits an event. Current state queryable via API. State diagram documented.
  - **Files:** `admiral/lib/session_state_machine.sh` (new), `admiral/schemas/session_states.json` (new), `admiral/lib/state.sh` (modify)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 4 — Session Lifecycle
  - **Depends on:** A-06

- [ ] **A-11: Event schema registry**
  - **Description:** Version and validate all event types in the system. Define a registry of event schemas (e.g., `hook.execution.start`, `hook.execution.complete`, `session.state.change`, `alert.runaway`) with versioned JSON schemas. Every event emitted must conform to its registered schema. Schema version is embedded in every event, enabling backward-compatible evolution. The registry is the source of truth for what events exist and what they contain.
  - **Done when:** Event schema registry created with schemas for all existing event types. Every event emission validates against the registry. Schema versions embedded in events. New event types require schema registration (CI enforced).
  - **Files:** `admiral/schemas/events/` (new directory), `admiral/lib/event_registry.sh` (new), `control-plane/src/events.ts` (modify)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 2 — Control Plane
  - **Depends on:** A-01, A-07

- [ ] **A-12: Configuration schema validation at startup**
  - **Description:** Validate `admiral/config.json` (or the consolidated config from A-05) against its JSON Schema at session startup, before any hooks execute. Catch configuration errors early — a missing field or wrong type in config should produce a clear error at startup, not a mysterious failure 30 minutes into a session. Report all validation errors at once (not just the first one). Provide helpful messages suggesting corrections.
  - **Done when:** Config validated at session start. All validation errors reported with field path and expected type. Helpful correction suggestions provided. Invalid config prevents session start (fail-closed for config errors). Validation integrated into session_start_adapter.sh.
  - **Files:** `admiral/lib/config_validate.sh` (new), `.hooks/session_start_adapter.sh` (modify)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** A-05, A-01
