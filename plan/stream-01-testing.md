# Stream 1: Testing — From 5/10 to 10/10

> *"You don't first build a system, then add a fuzzer. The starting point is sketching minimal interfaces that yield themselves to efficient fuzzing." — TigerBeetle*

**Current score:** 5/10
**Target score:** 10/10

**Gap summary:** 6 TS test files (206 tests), 34 hook tests, 39 quarantine tests. Gaps: no trace/ingest/instrumentation/events unit tests, no edge case tests, no fuzz/property-based tests, no coverage gates.

---

## 1.1 Unit Tests for Untested Modules

- [ ] **T-01: Add `trace.test.ts`**
  - **Description:** Unit tests for `ExecutionTrace` — `buildTrace()`, `buildAgentTrace()`, `renderAscii()`, `getStats()`. Test tree building with nested agent/task hierarchies, empty streams, single-event streams.
  - **Done when:** ≥80% branch coverage.
  - **Files:** `control-plane/src/trace.test.ts` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-02: Add `ingest.test.ts`**
  - **Description:** Unit tests for `JournalIngester` — `ingestNewLines()`, `start()`/`stop()`, `getStats()`. Test with valid JSONL, malformed lines, missing file, file growth, offset tracking.
  - **Done when:** ≥80% branch coverage.
  - **Files:** `control-plane/src/ingest.test.ts` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-03: Add `instrumentation.test.ts`**
  - **Description:** Unit tests for all AgentInstrumentation methods. Verify every public method is exercised and edge cases (null agents, missing fields) are handled.
  - **Done when:** ≥90% branch coverage, every public method tested.
  - **Files:** `control-plane/src/instrumentation.test.ts` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-04: Add `events.test.ts`**
  - **Description:** Dedicated unit tests for EventStream — ID generation, listener lifecycle, eviction, filters, counters. Verify that event ordering is preserved and listeners are cleaned up correctly.
  - **Done when:** ≥90% branch coverage.
  - **Files:** `control-plane/src/events.test.ts` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

---

## 1.2 Edge Case & Robustness Testing

- [ ] **T-05: Add malformed JSON edge case tests for server**
  - **Description:** Test URLs with special chars, very long URLs, concurrent requests, missing headers. Verify the server responds with appropriate error codes and does not crash or leak resources.
  - **Done when:** ≥5 new edge case tests in server.test.ts.
  - **Files:** `control-plane/src/server.test.ts`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-06: Add hook edge case tests**
  - **Description:** Extend test_hooks.sh with malformed JSON, missing jq, empty stdin, huge payloads, Unicode in tool names, concurrent execution. Every hook must handle gracefully (fail-open per ADR-004).
  - **Done when:** ≥10 new edge case tests, all hooks handle gracefully.
  - **Files:** `.hooks/tests/test_hooks.sh`
  - **Size:** M (1-3 hours)
  - **Spec ref:** ADR-004
  - **Depends on:** —

- [ ] **T-07: Add state.sh concurrent access tests**
  - **Description:** Test `with_state_lock` under concurrent access. Spawn multiple subshells simultaneously writing to shared state. Verify flock prevents data loss and corruption under concurrent writes.
  - **Done when:** flock prevents data loss under concurrent writes.
  - **Files:** `admiral/tests/test_state_concurrency.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-08: Add quarantine pipeline integration tests**
  - **Description:** Test full 5-layer quarantine pipeline with known-good and known-bad inputs end-to-end. Verify that every layer fires correctly and that the pipeline correctly quarantines all attack corpus items and passes clean items.
  - **Done when:** Pipeline correctly quarantines all attack corpus items and passes clean items.
  - **Files:** `admiral/monitor/quarantine/tests/test_pipeline_integration.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

---

## 1.3 Coverage Enforcement

- [ ] **T-09: Add coverage threshold gate to CI**
  - **Description:** Parse `--experimental-test-coverage` output, fail if coverage drops below threshold. Start with a realistic threshold and ratchet up over time as coverage improves.
  - **Done when:** CI fails on coverage regression.
  - **Files:** `.github/workflows/control-plane-ci.yml`, `CONTRIBUTING.md`
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-10: Add coverage badge to README**
  - **Description:** Generate coverage badge from CI output and display in README. Provides immediate visibility into project health.
  - **Done when:** README shows current coverage %.
  - **Files:** `README.md`, `.github/workflows/control-plane-ci.yml`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** T-09

---

## 1.4 Performance & Benchmarks

- [ ] **T-11: Add hook latency benchmark**
  - **Description:** Measure wall-clock time for each hook with typical payload. Cold start and warm. Output p50/p95/p99 table. Establishes baseline for performance regression detection.
  - **Done when:** Script produces latency table.
  - **Files:** `admiral/benchmarks/hook_latency.sh` (new), `docs/benchmarks/hook-latency.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-12: Add server performance benchmark**
  - **Description:** Benchmark server under load: /api/events with 100/1000/10000 events. Measure response time and memory. Identifies bottlenecks and establishes performance envelope.
  - **Done when:** Benchmark produces report.
  - **Files:** `control-plane/benchmarks/server-perf.ts` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-13: Add RingBuffer benchmark**
  - **Description:** Benchmark push, toArray, filter at 10K/100K/1M elements. Verify O(1) push and bounded memory. Proves data structure performance claims.
  - **Done when:** Push is O(1) amortized, memory bounded.
  - **Files:** `control-plane/benchmarks/ring-buffer-perf.ts` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-14: Add Standing Orders rendering benchmark**
  - **Description:** Measure time to render all 16 Standing Orders into text. Verify < 100ms. Standing Orders render on every session start, so latency matters.
  - **Done when:** Rendering latency measured and documented.
  - **Files:** `admiral/benchmarks/standing_orders_render.sh` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

---

## 1.5 Advanced Testing Techniques

- [ ] **T-15: Property-based testing for RingBuffer**
  - **Description:** Use property-based testing (e.g., fast-check) to verify RingBuffer invariants hold under random push/pop sequences. Properties to verify: (1) size never exceeds capacity, (2) toArray always returns elements in insertion order, (3) after N pushes to a buffer of capacity C, buffer contains min(N, C) elements, (4) evicted elements are always the oldest. Random sequences of push, pop, clear, and toArray operations should never produce an inconsistent state.
  - **Done when:** Property tests pass with 1000+ generated test cases. All four invariants are tested. No shrunk counterexamples found.
  - **Files:** `control-plane/src/ring-buffer.property.test.ts` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-16: Mutation testing setup**
  - **Description:** Configure Stryker (or equivalent mutation testing framework) to evaluate test suite effectiveness. Mutation testing modifies source code (e.g., flipping conditionals, removing statements) and verifies that tests catch the mutations. A high mutation score proves that tests are actually verifying behavior, not just executing code paths. Start with RingBuffer and EventStream as pilot modules, then expand.
  - **Done when:** Stryker configured, mutation score reported for pilot modules. Mutation score ≥80% for RingBuffer and EventStream. CI optionally runs mutation tests on schedule (weekly).
  - **Files:** `control-plane/stryker.config.json` (new), `.github/workflows/mutation-tests.yml` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** T-01, T-04

- [ ] **T-17: Test for standing_orders.sh rendering**
  - **Description:** Verify that standing_orders.sh correctly renders all 16 Standing Orders from their source files into the expected text output. Test each SO individually and verify the combined output. Check that SO numbering is correct, no SOs are skipped, and the rendered text matches expected format (title, body, enforcement level). Test with missing SO files to verify graceful degradation.
  - **Done when:** All 16 SOs render correctly. Missing SO files produce warnings, not crashes. Output format matches expected template. Test covers both individual and combined rendering.
  - **Files:** `admiral/tests/test_standing_orders_render.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Standing Orders spec (Parts 8-9)
  - **Depends on:** —

- [ ] **T-18: Test for injection_detect.sh**
  - **Description:** Verify all 5 quarantine layers in injection_detect.sh with a comprehensive attack corpus. Layer 1: known attack signatures. Layer 2: encoding bypass attempts (base64, URL encoding, Unicode). Layer 3: context-aware injection (prompt injection, jailbreak attempts). Layer 4: structural anomalies (deeply nested JSON, oversized fields). Layer 5: behavioral indicators (repeated patterns, timing anomalies). Test with both attack corpus (must detect) and benign corpus (must not false-positive).
  - **Done when:** All 5 layers tested with ≥10 attack vectors each. False positive rate < 1% on benign corpus. All attack corpus items correctly flagged.
  - **Files:** `admiral/monitor/quarantine/tests/test_injection_detect.sh` (new), `admiral/monitor/quarantine/tests/corpus/` (new — attack and benign test data)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 12 — Security
  - **Depends on:** —

- [ ] **T-19: Test for session_start_adapter.sh**
  - **Description:** Verify session initialization flow in session_start_adapter.sh. Test that the adapter correctly: (1) initializes session state file, (2) loads configuration, (3) renders Standing Orders, (4) writes session metadata, (5) emits session_start event to event log. Test with fresh state, existing state (resume), and corrupted state (recovery). Verify that environment variables are set correctly for downstream hooks.
  - **Done when:** All initialization steps verified. Fresh start, resume, and recovery paths tested. Environment variable propagation confirmed.
  - **Files:** `admiral/tests/test_session_start_adapter.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 4 — Session Lifecycle
  - **Depends on:** —

- [ ] **T-20: Snapshot tests for hook JSON output schemas**
  - **Description:** Create snapshot tests that capture the JSON output schema of every hook adapter. When a hook's output format changes, the snapshot test fails, forcing explicit acknowledgment of the schema change. This prevents accidental output drift that could break downstream consumers (control plane, CI, monitoring). Store snapshots as `.snap.json` files alongside test files.
  - **Done when:** Every hook adapter has a snapshot test. Snapshots are committed. CI fails on snapshot mismatch. Update process documented (how to intentionally update a snapshot).
  - **Files:** `.hooks/tests/snapshots/` (new directory), `.hooks/tests/test_hook_snapshots.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** A-01

- [ ] **T-21: Test for state.sh file locking under concurrent access**
  - **Description:** Specifically test that flock-based locking in state.sh works correctly under high concurrency. Spawn 20+ concurrent processes that all attempt to read-modify-write session state simultaneously. Verify: (1) no data corruption occurs, (2) all writes are serialized (no lost updates), (3) lock acquisition timeout works correctly, (4) stale lock files are cleaned up. This differs from T-07 by focusing specifically on the flock mechanism rather than the higher-level `with_state_lock` API.
  - **Done when:** 20 concurrent writers produce zero data corruption across 100 runs. Lock timeout behavior verified. Stale lock cleanup confirmed.
  - **Files:** `admiral/tests/test_flock_stress.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **T-22: Negative testing suite**
  - **Description:** Comprehensive negative testing across all hooks and core libraries. Verify that invalid inputs are rejected correctly with appropriate error messages and exit codes. Categories: (1) malformed JSON inputs to every hook, (2) missing required fields, (3) invalid field types (string where number expected), (4) out-of-range values (negative counts, future timestamps), (5) empty inputs, (6) inputs exceeding size limits. Every rejection must produce a structured error response (not a crash or silent failure).
  - **Done when:** Every hook has ≥5 negative test cases. All rejections produce structured error JSON. No hook crashes on invalid input (fail-open per ADR-004). Error messages are descriptive enough to diagnose the issue.
  - **Files:** `admiral/tests/test_negative_inputs.sh` (new), `.hooks/tests/test_negative_hooks.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** ADR-004
  - **Depends on:** —
