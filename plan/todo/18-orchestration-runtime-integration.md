# TODO: Orchestration Runtime & Integration (Phase 11)

Source streams: **Stream 34 (Agent Execution Runtime, EX-01 to EX-06)** | **Stream 35 (Hook-to-B2 Integration, HB-01 to HB-06)** | **Stream 36 (End-to-End Multi-Agent Test, E2E-01 to E2E-04)**

---

## Agent Execution Runtime (Stream 34)

### Session Lifecycle Engine

- [x] **EX-01** — Session spawner: core engine that creates/manages agent sessions; resolves agent definitions, assembles context, tracks state (pending → running → complete/failed), emits lifecycle events `[L]`
- [x] **EX-02** — Task queue: priority queue (CRITICAL > HIGH > MEDIUM > LOW) with FIFO within priority; task state tracking, cancellation support, disk persistence for crash recovery `[L]`
- [ ] **EX-03** — Execution state persistence: atomic writes (tmp + rename), crash recovery (resume queued, retry/fail interrupted), JSONL with compaction `[M]`

### Task Lifecycle Management

- [x] **EX-04** — Timeout and retry handling: wall-clock timeout, token budget, file-write cap; graceful termination, configurable retries with exponential backoff, escalation on permanent failure `[M]`
- [ ] **EX-05** — Result aggregation: collect session results (status, duration, tokens, files, tests); per-task summaries, per-agent metrics, fleet-wide summary; API queryable `[M]`
- [ ] **EX-06** — Task decomposition interface: accept high-level tasks, produce subtask DAGs; validate (no cycles, valid agents), calculate critical path, identify parallel opportunities; integrates with O-07 `[L]`

## Hook-to-B2 Integration (Stream 35)

### Access Pattern & Implementation

- [x] **HB-01** — Access pattern selection: evaluate direct SQLite vs control plane API vs MCP; document as ADR-010; define hook-side API; prototype with <100ms P99 benchmark `[M]`
- [x] **HB-02** — Hook-side query helpers: `brain_query_precedent`, `brain_query_violations`, `brain_query_context`, `brain_check_pattern`; structured JSON, 50ms timeout, graceful fallback `[L]` *(implemented as part of HB-01)*
- [x] **HB-03** — Hook-side write helpers: `brain_record_decision`, `brain_record_violation`, `brain_record_pattern`; non-blocking, fire-and-forget with async queue; extend existing `brain_writer.sh` `[M]`

### Safety & Resilience

- [ ] **HB-04** — Transactional safety: WAL for hook-initiated writes, atomic batching, crash recovery, read isolation; fault injection tests (mid-write kill, disk full, lock contention) `[L]`
- [ ] **HB-05** — Fallback behavior: empty results on B2 unavailable, bounded write buffer (1000 entries, FIFO eviction), ordered replay on recovery, health check integration `[M]`
- [ ] **HB-06** — Latency benchmarks: 5 scenarios (single query, query+write, concurrent, cold/warm, FTS5 corpus); structured JSON output, baseline for regression detection `[S]`

## End-to-End Multi-Agent Test (Stream 36)

- [ ] **E2E-01** — Test harness: mock agents with predefined behaviors, real routing/runtime/handoff, assertion helpers for state/handoff/results `[L]`
- [ ] **E2E-02** — Happy path: task → Agent A → handoff → Agent B → aggregated result; validates routing, handoff schema, state transitions `[M]`
- [ ] **E2E-03** — Failure path: Agent A fails → degradation policy → re-route to Agent B → success; validates failure detection, re-routing, escalation events `[M]`
- [ ] **E2E-04** — CI integration: <30s smoke test in CI workflow, structured report, build fails on E2E failure `[S]`

---

## Dependencies

| Item | Depends on |
|------|-----------|
| EX-01 (session spawner) | Stream 8, Stream 14, Stream 15 (all complete) |
| EX-02 (task queue) | EX-01 |
| EX-03 (state persistence) | EX-01, EX-02 |
| EX-04 (timeouts/retries) | EX-01 |
| EX-05 (result aggregation) | EX-01, EX-03 |
| EX-06 (task decomposition) | EX-01, EX-02 |
| HB-01 (access pattern) | Stream 7, Stream 11 B2 (all complete) |
| HB-02 (query helpers) | HB-01 |
| HB-03 (write helpers) | HB-01 |
| HB-04 (transactional safety) | HB-02, HB-03 |
| HB-05 (fallback behavior) | HB-02, HB-03 |
| HB-06 (latency benchmarks) | HB-02, HB-03 |
| E2E-01 (test harness) | EX-01, Stream 15 (routing) |
| E2E-02 (happy path) | E2E-01 |
| E2E-03 (failure path) | E2E-01, EX-04 |
| E2E-04 (CI integration) | E2E-02, E2E-03 |

## Execution Order

Streams 34 and 35 are independent — can run in parallel. Stream 36 depends on Stream 34 (EX-01 at minimum).

**Recommended order:**
1. EX-01, HB-01 (independent roots)
2. EX-02, EX-04, HB-02, HB-03 (depend on step 1)
3. EX-03, EX-05, HB-04, HB-05, HB-06 (depend on step 2)
4. EX-06 (depends on EX-01 + EX-02)
5. E2E-01 (depends on EX-01)
6. E2E-02, E2E-03 (depend on E2E-01)
7. E2E-04 (depends on E2E-02 + E2E-03)
