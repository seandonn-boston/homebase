# Stream 35: Hook-to-B2 Integration

> Define and implement the integration path between bash hooks and Brain B2 (SQLite/FTS5), so hooks can leverage institutional memory rather than operating in a stateless vacuum.

**Scope:** Hooks currently operate statelessly — they enforce rules based on the current event without access to historical context. Brain B2 (SQLite with FTS5) stores institutional memory (past decisions, patterns, violations). This stream bridges the gap: hooks can query Brain B2 for context before making decisions, and write results back after execution. The integration must be fast (hooks are synchronous — <100ms latency budget), safe (hooks must not corrupt Brain state on failure), and resilient (hooks must work when B2 is unavailable).

**Principle:** A hook that can query "has this pattern been seen before?" is categorically more powerful than one that can only see the current event. Hook-to-B2 integration transforms hooks from stateless rule enforcers into context-aware decision makers.

---

## 35.1 Access Pattern Decision & Implementation

- [ ] **HB-01: Access pattern selection and documentation — Decide and document how hooks access Brain B2**
  - **Description:** Evaluate three access patterns for hook-to-B2 communication: (1) **Direct SQLite** — hooks call `sqlite3` directly against the B2 database file, (2) **Control plane API** — hooks call the control plane REST API which queries B2, (3) **MCP tool calls** — hooks invoke Brain MCP tools. Evaluate each against: latency (<100ms budget), transactional safety, deployment complexity, B3 migration path (Postgres compatibility), and failure modes. Select one pattern, document the decision as an ADR, and define the hook-side API (function signatures, error handling, timeout behavior).
  - **Done when:** ADR documenting the access pattern decision exists with trade-off analysis. Hook-side API is defined (function signatures, return types, error codes). Latency budget analysis is documented. B3 migration implications are assessed. The chosen pattern is prototyped with a benchmark proving <100ms P99.
  - **Files:** `docs/adr/adr-010-hook-brain-access-pattern.md` (new), `admiral/lib/brain_query.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 4 (Brain System), Part 2 (Hooks)
  - **Depends on:** Stream 7 (hooks), Stream 11 B2 (Brain SQLite)

- [ ] **HB-02: Hook-side query helpers — Read context from Brain before hook logic**
  - **Description:** Implement shell functions that hooks can source to query Brain B2 before making enforcement decisions. Helpers include: (1) `brain_query_precedent <pattern>` — search for prior decisions matching a pattern using FTS5, (2) `brain_query_violations <agent_id> <window>` — count recent violations by an agent within a time window, (3) `brain_query_context <key>` — retrieve a specific context entry by key, (4) `brain_check_pattern <pattern_hash>` — check if a specific code pattern has been seen before. All helpers must: return structured JSON, timeout after 50ms (half the hook budget), return empty/default on B2 unavailability, and log query latency for monitoring.
  - **Done when:** Four query helpers are implemented and tested. Each returns structured JSON. 50ms timeout is enforced. Graceful fallback on B2 unavailability (returns empty result, does not block hook). Query latency is logged. Helpers are sourceable from any hook via `. admiral/lib/brain_query.sh`.
  - **Files:** `admiral/lib/brain_query.sh` (extend from HB-01), `admiral/tests/test_brain_query.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 4 (Brain System)
  - **Depends on:** HB-01

- [ ] **HB-03: Hook-side write helpers — Write results back to Brain after hook execution**
  - **Description:** Implement shell functions that hooks can source to write results back to Brain B2 after execution. Helpers include: (1) `brain_record_decision <hook_name> <decision> <rationale>` — record a hook's enforcement decision and reasoning, (2) `brain_record_violation <hook_name> <agent_id> <violation_type> <details>` — record a policy violation, (3) `brain_record_pattern <pattern_hash> <pattern_type> <metadata>` — record a detected code pattern. All writes must: be non-blocking (fire-and-forget with async write queue), not fail the hook if Brain is unavailable, include timestamp and session context, and use the existing `brain_writer.sh` infrastructure where possible.
  - **Done when:** Three write helpers are implemented and tested. Writes are non-blocking (hook does not wait for write confirmation). Brain unavailability does not cause hook failure. Writes include timestamp and session context. Integration with existing `brain_writer.sh` is complete. Write queue handles burst writes without loss.
  - **Files:** `admiral/lib/brain_writer.sh` (extend existing), `admiral/tests/test_brain_writer_integration.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 4 (Brain System)
  - **Depends on:** HB-01

---

## 35.2 Safety & Resilience

- [ ] **HB-04: Transactional safety — Hooks must not corrupt Brain state on failure**
  - **Description:** Ensure that hook failures (crash, timeout, kill signal) cannot leave Brain B2 in an inconsistent state. Implement: (1) write-ahead logging for Brain writes initiated by hooks, (2) atomic write batching (all writes from a single hook execution succeed or none do), (3) crash recovery that replays incomplete transactions or rolls them back, (4) read isolation (hook queries see a consistent snapshot, not partial writes from concurrent hooks). Test with fault injection: kill hooks mid-write, simulate disk full, simulate SQLite lock contention.
  - **Done when:** Hook crashes cannot corrupt Brain state (verified by fault injection tests). Atomic batching ensures all-or-nothing writes. Crash recovery handles incomplete transactions. Read isolation prevents dirty reads. Fault injection test suite covers: mid-write kill, disk full, lock contention, concurrent hook execution.
  - **Files:** `admiral/lib/brain_transaction.sh` (new), `admiral/tests/test_brain_transaction_safety.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 4 (Brain System)
  - **Depends on:** HB-02, HB-03

- [ ] **HB-05: Fallback behavior — Hooks must work when B2 is unavailable**
  - **Description:** Define and implement fallback behavior for every hook-to-B2 interaction when B2 is unavailable (database locked, file missing, server down). Fallback policy: (1) queries return empty results (hooks fall back to stateless enforcement), (2) writes are buffered to a local file and replayed when B2 recovers, (3) hooks log a warning but never fail due to B2 unavailability, (4) a health check detects B2 availability and reports it in the control plane health endpoint. The write buffer must be bounded (max 1000 entries, FIFO eviction) and replayed in order on recovery.
  - **Done when:** All query helpers return empty/default when B2 is unavailable. Write buffer captures writes during B2 outage. Buffer replays on recovery in order. Buffer is bounded with FIFO eviction. Health check reports B2 availability. Hooks never fail due to B2 unavailability (verified by tests with B2 offline).
  - **Files:** `admiral/lib/brain_fallback.sh` (new), `admiral/tests/test_brain_fallback.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 4 (Brain System), ADR-004 (fail-open)
  - **Depends on:** HB-02, HB-03

- [ ] **HB-06: Latency benchmarks — Prove <100ms P99 for hook-to-B2 round trips**
  - **Description:** Create a benchmark suite that measures hook-to-B2 round-trip latency under realistic conditions: (1) single query latency, (2) query + write latency (typical hook pattern), (3) concurrent hook execution (5 hooks querying simultaneously), (4) cold start vs warm cache, (5) FTS5 search latency with realistic corpus size (1000+ entries). Benchmark must produce structured output compatible with the existing benchmark framework. Results are stored as baseline for regression detection.
  - **Done when:** Benchmark suite covers all 5 scenarios. P99 latency is <100ms for all scenarios. Results are structured JSON compatible with existing benchmarks. Baseline is stored for regression detection. Benchmark is runnable via `make benchmark-brain` or equivalent.
  - **Files:** `admiral/tests/benchmarks/bench_brain_query.sh` (new)
  - **Size:** S
  - **Spec ref:** Part 4 (Brain System)
  - **Depends on:** HB-02, HB-03

---

## Dependencies

| Item | Depends on |
|------|-----------|
| HB-01 (access pattern) | Stream 7 (hooks), Stream 11 B2 (Brain) — both complete |
| HB-02 (query helpers) | HB-01 |
| HB-03 (write helpers) | HB-01 |
| HB-04 (transactional safety) | HB-02, HB-03 |
| HB-05 (fallback behavior) | HB-02, HB-03 |
| HB-06 (latency benchmarks) | HB-02, HB-03 |
