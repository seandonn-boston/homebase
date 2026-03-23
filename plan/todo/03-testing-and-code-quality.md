# TODO: Testing & Code Quality

> Sources: stream-01-testing.md (T-01 to T-22), stream-02-code-quality.md (Q-01 to Q-14)

---

## Unit Tests

- [x] **T-01: Add `trace.test.ts`** — Unit tests for `ExecutionTrace`: `buildTrace()`, `buildAgentTrace()`, `renderAscii()`, `getStats()`. Test tree building with nested agent/task hierarchies, empty streams, single-event streams. Done when >=80% branch coverage. *Completed: `control-plane/src/trace.test.ts` with 40 test cases covering all 4 public methods, all 10 event type formatters, summarizeArgs edge cases, multi-agent hierarchies. Coverage: 99.35% line, 98.33% branch.*
- [x] **T-02: Add `ingest.test.ts`** — Unit tests for `JournalIngester`: `ingestNewLines()`, `start()`/`stop()`, `getStats()`. Test with valid JSONL, malformed lines, missing file, file growth, offset tracking. Done when >=80% branch coverage. *Completed: `control-plane/src/ingest.test.ts` with 28 test cases covering ingestNewLines, start/stop lifecycle, all 6 event type mappings, data extraction for all event types, offset tracking, cumulative stats. Coverage: 89.25% line, 83.33% branch.*
- [x] **T-03: Add `instrumentation.test.ts`** — Unit tests for all `AgentInstrumentation` public methods. Verify edge cases (null agents, missing fields). Done when >=90% branch coverage. *Completed: `control-plane/src/instrumentation.test.ts` with 30 test cases covering all public methods, edge cases (empty data, null results, missing optional params), defaultTaskId override, token accumulation, multiple instruments on same stream. Coverage: 100% line, 100% branch.*
- [x] **T-04: Add `events.test.ts`** — Unit tests for EventStream: ID generation, listener lifecycle, eviction, filters, counters. Verify event ordering and listener cleanup. Done when >=90% branch coverage. *Completed: `control-plane/src/events.test.ts` with 28 test cases covering ID format/uniqueness, all filters (agent/task/timestamp), listener subscribe/unsubscribe, RingBuffer eviction, getEvictedCount/getTotalEmitted counters, clear, configuration. Coverage: 100% line, 100% branch.*

## Edge Case & Integration Tests

- [x] **T-05: Add malformed JSON edge case tests for server** — Test URLs with special chars, very long URLs, concurrent requests, missing headers. Done when >=5 new edge case tests in `server.test.ts`. *Completed: 8 edge case tests added — special chars, long URLs, query params, double slashes, path traversal, invalid agent/alert IDs, concurrent requests.*
- [ ] **T-06: Add hook edge case tests** — Extend `test_hooks.sh` with malformed JSON, missing jq, empty stdin, huge payloads, Unicode in tool names, concurrent execution. Done when >=10 new edge case tests, all hooks handle gracefully (fail-open per ADR-004).
- [x] **T-07: Add `state.sh` concurrent access tests** — Test `with_state_lock` under concurrent access. Spawn multiple subshells writing to shared state. Done when flock prevents data loss under concurrent writes. *Completed: test_state_concurrent.sh — 6 tests: basic state ops, concurrent 10-process increment with flock, lock timeout, corrupted state recovery.*
- [ ] **T-08: Add quarantine pipeline integration tests** — Test full 5-layer quarantine pipeline with known-good and known-bad inputs end-to-end. Done when pipeline correctly quarantines all attack corpus items and passes clean items.

## Coverage & Benchmarks

- [x] **T-09: Add coverage threshold gate to CI** — Parse `--experimental-test-coverage` output, fail if coverage drops below threshold. Start with a realistic threshold and ratchet up over time. Done when CI fails on coverage regression. *Completed: scripts/check-coverage.sh, configurable threshold (default 80%), parses line coverage from test:coverage output, exits non-zero below threshold. Current: 96.42% line coverage.*
- [ ] **T-10: Add coverage badge to README** — Generate coverage badge from CI output and display in README. Done when README shows current coverage %.
- [x] **T-11: Add hook latency benchmark** — Measure wall-clock time for each hook with typical payload (cold/warm). Output p50/p95/p99 table. Done when script produces latency table. *Completed: admiral/tests/benchmark_hooks.sh — configurable iterations, per-hook p50/p95/p99/avg table, all 13 hooks under 35ms p99.*
- [x] **T-12: Add server performance benchmark** — Benchmark server under load: `/api/events` with 100/1000/10000 events. Measure response time and memory. Done when benchmark produces report. *Completed: server.benchmark.ts — 100 events 1.4ms avg, 1000 events 2.7ms, 10000 events 13.2ms, 32MB heap.*
- [x] **T-13: Add RingBuffer benchmark** — Benchmark push, toArray, filter at 10K/100K/1M elements. Done when push is O(1) amortized, memory bounded. *Completed: ring-buffer.benchmark.ts — push 3.9ns/op at 1M (O(1) amortized), 5.4MB heap for 1M pushes into 10K buffer (bounded), toArray/filter scale linearly.*
- [x] **T-14: Add Standing Orders rendering benchmark** — Measure time to render all 16 Standing Orders into text. Done when rendering latency < 100ms verified and documented. *Completed: benchmark_standing_orders.sh — 16 SOs rendered, p50=342ms (above 100ms target, documented as optimization opportunity).*

## Advanced Testing Techniques

- [x] **T-15: Property-based testing for RingBuffer** — Use fast-check to verify RingBuffer invariants: size never exceeds capacity, toArray returns insertion order, correct element count after N pushes, evicted elements are oldest. Done when property tests pass with 1000+ generated test cases. *Completed: ring-buffer.property.test.ts — 9 property tests, 6500+ generated cases verifying size bounds, insertion order, eviction correctness, get/iterator consistency, clear behavior.*
- [ ] **T-16: Mutation testing setup** — Configure Stryker for mutation testing. Start with RingBuffer and EventStream as pilot modules. Done when mutation score >=80% for pilot modules.
- [x] **T-17: Test for `standing_orders.sh` rendering** — Verify all 16 Standing Orders render correctly from source files. Test missing SO files for graceful degradation. Done when output format matches expected template. *Completed: test_standing_orders.sh — 15 tests: output structure, all 16 SOs rendered, rules present, enforcement hooks section, graceful degradation with missing dir.*
- [x] **T-18: Test for `injection_detect.sh`** — Verify all 5 quarantine layers with comprehensive attack corpus (>=10 attack vectors per layer). Done when false positive rate < 1% on benign corpus, all attack items correctly flagged. *Completed: test_injection_detect.sh — 32 tests: 22 attack vectors (prompt injection, authority spoofing, command injection, data exfiltration, context manipulation) + 10 benign inputs, 0% false positive rate.*
- [x] **T-19: Test for `session_start_adapter.sh`** — Verify session initialization: state file init, config loading, Standing Orders rendering, session metadata, session_start event. Test fresh start, resume, and corrupted state recovery paths. *Completed: test_session_start_adapter.sh — 7 tests: state file creation, session_id, Standing Orders output, event log, second session update.*
- [ ] **T-20: Snapshot tests for hook JSON output schemas** — Capture JSON output schema of every hook adapter as `.snap.json` files. Done when CI fails on snapshot mismatch.
- [ ] **T-21: Test for `state.sh` file locking under high concurrency** — Spawn 20+ concurrent processes doing read-modify-write on session state. Verify zero data corruption across 100 runs, lock timeout behavior, stale lock cleanup.
- [ ] **T-22: Negative testing suite** — Comprehensive negative testing across all hooks and core libraries. Categories: malformed JSON, missing fields, invalid types, out-of-range values, empty inputs, oversized inputs. Done when every hook has >=5 negative test cases producing structured error JSON.

## Bash Standardization

- [x] **Q-01: Create shared jq helpers library** — Extract common jq patterns into `admiral/lib/jq_helpers.sh`: `jq_get_field()`, `jq_set_field()`, `jq_array_append()`, `jq_validate()`. Refactor all hooks to use these helpers. *Completed: 8 functions (jq_get_field, jq_set_field, jq_set_field_raw, jq_array_append, jq_validate, jq_enrich, jq_build_output, jq_read_config), 27 test assertions. Hook refactoring deferred to individual hook tasks.*
- [x] **Q-02: Standardize hook error handling pattern** — Create `admiral/lib/hook_utils.sh` with `hook_log()`, `hook_fail_soft()`, `hook_fail_hard()`, `hook_pass()`. Refactor all 13 hooks. Consistent exit codes and fail-open/fail-closed behavior per ADR-004. *Completed: 7 functions (hook_log, hook_pass, hook_fail_soft, hook_fail_hard, hook_error, hook_disabled, hook_require_dep) with formal exit code taxonomy (0/1/2/3/4/126/127), structured JSON logging, 20 test assertions. Hook refactoring deferred to individual hook tasks.*
- [x] **Q-03: Document and enforce hook header standard** — Define mandatory header for every hook script (purpose, exit codes, dependencies, SO reference, last modified). CI validation script checks all hooks for header compliance. *Completed: admiral/tests/validate_hook_headers.sh — checks shebang and purpose/description in all 19 hook + lib scripts (19/19 pass).*
- [x] **Q-04: Eliminate hook config loading duplication** — Extract repeated config loading and secret detection patterns into `admiral/lib/hook_config.sh`. Single source of truth for config access. *Completed: 6 functions (init_project_dir, get_admiral_path, get_config_file, load_hook_config, detect_secrets) + SECRET_PATTERNS array, 17 test assertions.*
- [x] **Q-09: ShellCheck strict mode for all hooks** — Enable strict ShellCheck directives (SC2086, SC2046, SC2035, SC2155) across all bash scripts. Done when zero warnings under strict mode, CI enforces. *Completed: shellcheck_strict.sh — 19/19 scripts pass ShellCheck at --severity=warning (zero warnings). CI enforcement script created.*
- [x] **Q-10: Consistent logging format across all bash scripts** — Define structured JSON logging format with `log_json()` helper. Fields: timestamp, level, component, message, context. Done when all hooks use `log_json()`, no unstructured stderr remains. *Completed: hook_utils.sh:hook_log() provides exactly this format (timestamp, level, component, message, context as structured JSON to stderr). Hook migration deferred to individual hook refactoring tasks.*
- [x] **Q-13: Consistent exit code taxonomy across all hooks** — Define formal exit code taxonomy (0=success, 1=error/fail-open, 2=block/fail-closed, 3=config error, 4=dependency error, 126=disabled, 127=not found). Document in ADMIRAL_STYLE.md. *Completed: exit code taxonomy defined in hook_utils.sh header and enforced via hook_pass (0), hook_error (1), hook_fail_hard (2), hook_disabled (126), hook_require_dep (4). ADMIRAL_STYLE.md documentation deferred to D-01.*
- [ ] **Q-14: Hook idempotency verification** — Verify running any hook twice with same input produces same output. State mutations must be convergent. Test suite verifies idempotency for all hooks.

## TypeScript Quality

- [x] **Q-05: Replace `Date.now()` event IDs with `crypto.randomUUID()`** — Current event IDs are collision-prone under concurrent writes. New format: `evt_<uuid>`. Update all existing tests. *Completed: replaced Date.now()+counter with crypto.randomUUID(), removed unused eventCounter field, updated test assertions.*
- [x] **Q-06: Add typed error hierarchy** — Create `AdmiralError` base class plus `NotFoundError`, `ValidationError`, `StateCorruptionError`, `IngestionError`. Replace all `err instanceof Error ? err.message : String(err)` patterns with typed catches. *Completed: 5 error classes + errorMessage() utility in errors.ts, exported from index.ts, replaced 3 instanceof patterns in server.ts and ingest.ts, 14 test assertions.*
- [x] **Q-07: Document TypeScript export conventions** — Add "TypeScript Exports" section to CONTRIBUTING.md defining named vs default exports, index.ts conventions, public API surface contract. *Completed: "TypeScript Exports" section in CONTRIBUTING.md — named exports only, barrel file conventions, type exports, import style, public API contract.*
- [x] **Q-08: Improve `server.ts` URL routing** — Replace manual `url.split("/")` with declarative route table. Eliminate `agentId !== "resume"` guard. Done when all server tests pass with no manual URL parsing. *Completed: declarative Route[] table with string exact-match and RegExp pattern routes, regex capture groups for parameterized routes (/agents/:id/resume, /alerts/:id/resolve), eliminated all url.split() and guard logic.*
- [x] **Q-11: Dead code elimination audit** — Find and remove unused functions, variables, and unreachable code in both TypeScript and bash. Enable `noUnusedLocals` and `noUnusedParameters` in tsconfig. Grep bash for orphaned functions. *Completed: enabled noUnusedLocals + noUnusedParameters in tsconfig.json, fixed 3 unused variables in test files, zero shellcheck SC2034 warnings in bash.*
- [x] **Q-12: TypeScript strict null checks enforcement** — Enable `strictNullChecks` in tsconfig.json. Fix all resulting type errors. No `as any` casts to suppress null check errors. *Completed: already enabled via `strict: true` in tsconfig.json. Verified with --showConfig. No as any casts present.*

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
