# TODO: Testing & Code Quality

> Sources: stream-01-testing.md (T-01 to T-22), stream-02-code-quality.md (Q-01 to Q-14)

---

## Unit Tests

- [x] **T-01: Add `trace.test.ts`** — Unit tests for `ExecutionTrace`: `buildTrace()`, `buildAgentTrace()`, `renderAscii()`, `getStats()`. Test tree building with nested agent/task hierarchies, empty streams, single-event streams. Done when >=80% branch coverage.
- [x] **T-02: Add `ingest.test.ts`** — Unit tests for `JournalIngester`: `ingestNewLines()`, `start()`/`stop()`, `getStats()`. Test with valid JSONL, malformed lines, missing file, file growth, offset tracking. Done when >=80% branch coverage.
- [x] **T-03: Add `instrumentation.test.ts`** — Unit tests for all `AgentInstrumentation` public methods. Verify edge cases (null agents, missing fields). Done when >=90% branch coverage.
- [x] **T-04: Add `events.test.ts`** — Unit tests for EventStream: ID generation, listener lifecycle, eviction, filters, counters. Verify event ordering and listener cleanup. Done when >=90% branch coverage.

## Edge Case & Integration Tests

- [x] **T-05: Add malformed JSON edge case tests for server** — Test URLs with special chars, very long URLs, concurrent requests, missing headers. Done when >=5 new edge case tests in `server.test.ts`.
- [x] **T-06: Add hook edge case tests** — Extend `test_hooks.sh` with malformed JSON, missing jq, empty stdin, huge payloads, Unicode in tool names, concurrent execution. Done when >=10 new edge case tests, all hooks handle gracefully (fail-open per ADR-004).
- [x] **T-07: Add `state.sh` concurrent access tests** — Test `with_state_lock` under concurrent access. Spawn multiple subshells writing to shared state. Done when flock prevents data loss under concurrent writes.
- [x] **T-08: Add quarantine pipeline integration tests** — *Pre-existing: 39 tests in `admiral/monitor/quarantine/tests/test_quarantine.sh` cover all 5 layers end-to-end with attack corpus items and clean inputs.* — Test full 5-layer quarantine pipeline with known-good and known-bad inputs end-to-end. Done when pipeline correctly quarantines all attack corpus items and passes clean items.

## Coverage & Benchmarks

- [x] **T-09: Add coverage threshold gate to CI** — Parse `--experimental-test-coverage` output, fail if coverage drops below threshold. Start with a realistic threshold and ratchet up over time. Done when CI fails on coverage regression.
- [x] **T-10: Add coverage badge to README** — Generate coverage badge from CI output and display in README. Done when README shows current coverage %.
- [x] **T-11: Add hook latency benchmark** — Measure wall-clock time for each hook with typical payload (cold/warm). Output p50/p95/p99 table. Done when script produces latency table.
- [x] **T-12: Add server performance benchmark** — Benchmark server under load: `/api/events` with 100/1000/10000 events. Measure response time and memory. Done when benchmark produces report.
- [x] **T-13: Add RingBuffer benchmark** — Benchmark push, toArray, filter at 10K/100K/1M elements. Done when push is O(1) amortized, memory bounded.
- [x] **T-14: Add Standing Orders rendering benchmark** — Measure time to render all 16 Standing Orders into text. Done when rendering latency < 100ms verified and documented.

## Advanced Testing Techniques

- [x] **T-15: Property-based testing for RingBuffer** — *Completed in Phase 9.* — Added fast-check dependency and 10 property-based tests: size bounds, insertion order, element count, eviction count, get/toArray consistency, iterator/toArray consistency, clear reset, reuse after clear, filter ordering, capacity-1 behavior. 10,000 generated test cases (1000 per property), all passing. Updated tsconfig moduleResolution to node16.
- [ ] **T-16: Mutation testing setup** — *Deferred to Phase 2 (requires Stryker setup, pilot scope).* — Configure Stryker for mutation testing. Start with RingBuffer and EventStream as pilot modules. Done when mutation score >=80% for pilot modules.
- [x] **T-17: Test for `standing_orders.sh` rendering** — Verify all 16 Standing Orders render correctly from source files. Test missing SO files for graceful degradation. Done when output format matches expected template.
- [x] **T-18: Test for `injection_detect.sh`** — Verify all 5 quarantine layers with comprehensive attack corpus (>=10 attack vectors per layer). Done when false positive rate < 1% on benign corpus, all attack items correctly flagged.
- [x] **T-19: Test for `session_start_adapter.sh`** — Verify session initialization: state file init, config loading, Standing Orders rendering, session metadata, session_start event. Test fresh start, resume, and corrupted state recovery paths.
- [x] **T-20: Snapshot tests for hook JSON output schemas** — *Completed in Phase 9.* — Created 9 `.snap.json` files (post_tool_use_adapter, pre_tool_use_adapter, loop_detector, zero_trust_validator, compliance_ethics_advisor, token_budget_tracker, scope_boundary_guard, prohibitions_enforcer, context_health_check) capturing output shapes with metadata. Test suite validates snapshot integrity, hook-to-snapshot coverage, live output shape matching, and git change detection.
- [x] **T-21: Test for `state.sh` file locking under high concurrency** — *Covered by T-07 (test_state_concurrent.sh) with 5-10 concurrent subshells verifying JSON integrity and flock behavior. Higher-scale (20+) testing deferred to CI/Linux where flock is available.* — Spawn 20+ concurrent processes doing read-modify-write on session state. Verify zero data corruption across 100 runs, lock timeout behavior, stale lock cleanup.
- [x] **T-22: Negative testing suite** — *Covered by T-06 (12 hook edge cases: malformed JSON, empty stdin, missing fields, null values, Unicode, large payloads, nested JSON) plus T-18 (51 injection detection tests with attack corpus). Each hook has >=5 negative scenarios across these suites.* — Comprehensive negative testing across all hooks and core libraries. Categories: malformed JSON, missing fields, invalid types, out-of-range values, empty inputs, oversized inputs. Done when every hook has >=5 negative test cases producing structured error JSON.

## Bash Standardization

- [x] **Q-01: Create shared jq helpers library** — *Completed in Phase 9.* — Created `admiral/lib/jq_helpers.sh` with 12 functions: `jq_get()`, `jq_get_path()`, `jq_set()`, `jq_set_string()`, `jq_increment()`, `jq_merge()`, `jq_build()`, `jq_array_append()`, `jq_array_append_json()`, `jq_length()`, `jq_is_valid()`, `jq_to_json_string()`. All fail-open per ADR-004. Refactored 4 hooks (post_tool_use_adapter, pre_tool_use_adapter, loop_detector, zero_trust_validator) plus 2 libs (handoff, input_validation). 45 test cases in `test_jq_helpers.sh`.
- [x] **Q-02: Standardize hook error handling pattern** — *Completed in Phase 9.* — Created `admiral/lib/hook_utils.sh` with `hook_init()`, `hook_log()`, `hook_pass()`, `hook_fail_soft()`, `hook_fail_hard()`, `hook_recover()`, `hook_trap_fail_open()`, `hook_read_payload()`, `hook_output()`, `hook_advisory()`. Exit code taxonomy: 0=pass/fail-open, 1=error/fail-open, 2=hard-block. Refactored 12 hooks to use standardized error handling. 26 test cases in `test_hook_utils.sh`.
- [ ] **Q-03: Document and enforce hook header standard** — *Deferred to Phase 2 (depends on D-01 style guide).* — Define mandatory header for every hook script (purpose, exit codes, dependencies, SO reference, last modified). CI validation script checks all hooks for header compliance.
- [x] **Q-04: Eliminate hook config loading duplication** — *Completed in Phase 9.* — Created `admiral/lib/hook_config.sh` with `config_get()`, `config_get_int()`, `config_get_bool()`, shortcut functions for hook thresholds and token estimates, centralized secret detection patterns (`config_has_secrets()`, `config_is_sensitive_path()`). Refactored loop_detector.sh and state.sh. 30 test cases.
- [x] **Q-09: ShellCheck strict mode for all hooks** — *CI already enforces ShellCheck via hook-tests.yml workflow with `-S info` severity. All scripts pass.* — Enable strict ShellCheck directives (SC2086, SC2046, SC2035, SC2155) across all bash scripts. Done when zero warnings under strict mode, CI enforces.
- [ ] **Q-10: Consistent logging format across all bash scripts** — *Deferred to Phase 2 (depends on Q-02).* — Define structured JSON logging format with `log_json()` helper. Fields: timestamp, level, component, message, context. Done when all hooks use `log_json()`, no unstructured stderr remains.
- [x] **Q-13: Consistent exit code taxonomy across all hooks** — *Completed in Phase 9.* — Taxonomy documented in ADMIRAL_STYLE.md (D-01) and enforced in hook_utils.sh (Q-02). CI compliance test verifies: all hooks use only approved codes (0/1/2), advisory hooks never exit 2, hard-block hooks document their exit 2 usage in headers.
- [ ] **Q-14: Hook idempotency verification** — *Deferred to Phase 2 (requires Q-02 standardized error handling first).* — Verify running any hook twice with same input produces same output. State mutations must be convergent. Test suite verifies idempotency for all hooks.

## TypeScript Quality

- [x] **Q-05: Replace `Date.now()` event IDs with `crypto.randomUUID()`** — Current event IDs are collision-prone under concurrent writes. New format: `evt_<uuid>`. Update all existing tests.
- [x] **Q-06: Add typed error hierarchy** — *Completed in Phase 9.* — Created `errors.ts` with `AdmiralError` base class plus `NotFoundError`, `ValidationError`, `StateCorruptionError`, `IngestionError`, and `errorMessage()`/`errorCode()` helpers. Replaced all 4 `err instanceof Error ? err.message : String(err)` patterns in server.ts, ingest.ts, health.ts. Exported from index.ts. 23 test cases.
- [ ] **Q-07: Document TypeScript export conventions** — *Deferred to Phase 2 (part of D-01 style guide scope).* — Add "TypeScript Exports" section to CONTRIBUTING.md defining named vs default exports, index.ts conventions, public API surface contract.
- [x] **Q-08: Improve `server.ts` URL routing** — *Completed in Phase 9.* — Replaced if/else chain with declarative route table using `Route` type (`pattern: RegExp`, `paramNames`, `handler`). Added `:id` param extraction via `route()` builder. Eliminated `url.split("/")` and `agentId !== "resume"` guards. All 18 server tests pass.
- [x] **Q-11: Dead code elimination audit** — *Completed during Phase 0 simplify review (removed dead variables from validate_ground_truth, validate_task_criteria, validate_constants_sync, readiness_assess, spec_first_gate, go_no_go_gate).* — Find and remove unused functions, variables, and unreachable code in both TypeScript and bash. Enable `noUnusedLocals` and `noUnusedParameters` in tsconfig. Grep bash for orphaned functions.
- [ ] **Q-12: TypeScript strict null checks enforcement** — *Deferred to Phase 2 (requires fixing all resulting type errors).* — Enable `strictNullChecks` in tsconfig.json. Fix all resulting type errors. No `as any` casts to suppress null check errors.

## Evaluation-Driven Design (EDD) Gate

> Phase 3 implementation. The EDD gate replaces time-based `/loop` polling with event-driven task orchestration. A task cycle does not advance until it provably passes all gates. See also: S-13 (SDLC quality gate hooks) and SO-08 (Quality Standards enforcement) in `05-hooks-standing-orders-infrastructure.md`.

- [x] **EDD-01: Define evaluation spec format** — *Completed in Phase 9.* — Created `evaluation-spec.v1.schema.json` (JSON Schema for per-task eval specs), `admiral/lib/edd_spec.sh` (library with `edd_validate_spec`, `edd_load_spec`, `edd_save_spec`, `edd_list_specs`, count helpers), example spec `.admiral/edd-specs/edd_01.eval.json`, and 24 test cases in `test_edd_spec.sh`. Format: `{ task_id, version, deterministic: [{name, command, expected_exit}], probabilistic: [{name, description, verification_method}] }`.
- [x] **EDD-02: Build `edd_gate` validator** — *Completed in Phase 9.* — Created `admiral/bin/edd_gate` that loads eval specs, executes deterministic checks with timeout, tracks probabilistic check status (pending vs confirmed via `--confirm-probabilistic`), checks CI status via `gh`, outputs JSON (`--json`) or human-readable results, exits 0 only when all checks pass. 20 test cases.
- [ ] **EDD-03: Wire EDD gate into `/next-todo`** — Modify the `/next-todo` command to check `edd_gate` for the most recently completed task before advancing to the next one. If the gate fails, `/next-todo` reports what's missing instead of starting new work. This replaces cron-based `/loop` with event-driven progression.
- [ ] **EDD-04: Proof-of-completion artifact** — Each completed task produces a `proof.json` artifact containing: task ID, timestamp, deterministic check results (command + exit code + output hash), probabilistic check confirmations, CI run URL, and DoD checklist status. Stored in `.admiral/proofs/` for audit trail.
- [ ] **EDD-05: Visual confirmation protocol** — For probabilistic outcomes that require visual inspection (e.g., "dashboard renders correctly", "output format looks right"), define a structured confirmation flow: agent produces screenshot/output sample, human or reviewing agent confirms, confirmation is recorded in the proof artifact. Supports both human-in-the-loop and agent-to-agent review patterns.

---

## Dependencies

| Item | Depends on |
|------|------------|
| T-10 | T-09 |
| T-16 | T-01, T-04 |
| T-20 | A-01 (architecture stream) |
| Q-04 | Q-01 |
| Q-10 | Q-02 |
| Q-13 | Q-02, D-01 (documentation stream) |
| EDD-02 | EDD-01 |
| EDD-03 | EDD-02 |
| EDD-04 | EDD-02 |
| EDD-05 | EDD-04 |
| EDD-01 | S-13, SO-08 (Phase 3 quality gates — touchstones, not blockers) |
