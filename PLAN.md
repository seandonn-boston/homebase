# PLAN.md — Roadmap to a 10/10 Pristine Codebase

**Last updated:** 2026-03-18
**Target:** Elevate homebase to the quality standard of SQLite, TigerBeetle, Redis, and FoundationDB.
**Thesis:** A project whose core thesis is "deterministic enforcement beats advisory guidance" must be the most visible proof of that thesis. Our hooks, tests, and enforcement should be the showcase.

---

## Vision: What 10/10 Means for This Project

A 10/10 homebase codebase would exhibit these properties (inspired by [research/pristine-github-repositories.md](research/pristine-github-repositories.md)):

1. **Every module has tests.** No untested code paths. Coverage thresholds enforced in CI.
2. **The hook directory is the showcase.** The most tested, most consistent, most rigorously enforced code in the entire repository — because it IS the product.
3. **Zero surprise failures.** Every hook exit code is tested. Every JSON payload is validated. Every error path is documented.
4. **A stranger can contribute in 30 minutes.** Setup instructions, coding standards, templates, and examples get anyone productive fast.
5. **Published coding standards.** Like TigerBeetle's TIGER_STYLE.md — our standards are a publishable artifact, not tribal knowledge.
6. **Deterministic enforcement of our own quality.** Pre-commit hooks, CI gates, coverage thresholds — we eat our own dog food.
7. **Design docs precede code.** Every non-trivial decision has an ADR. Every API has documentation.

---

## Current Score

| Dimension | Score | Notes |
|---|---|---|
| Testing | 5/10 | 6 TS test files, hook tests in CI, but gaps in trace/ingest/instrumentation/events unit tests. No edge case, fuzz, or property-based testing. No coverage gates. |
| Code Quality Tooling | 7/10 | Biome, ShellCheck, pre-commit hooks, strict TS. Missing: coverage gates, security scanning, jq helpers. |
| Architecture | 7/10 | Clean separation, zero runtime deps, file locking. Missing: hook/control-plane integration, schema validation, typed errors. |
| Documentation | 6/10 | AGENTS.md, CONTRIBUTING.md, 5 ADRs, CHANGELOG. Missing: API docs, coding standard doc, inline "why" comments, LICENSE, CoC. |
| CI/CD | 7/10 | Build+test+lint+coverage+shellcheck+audit. Missing: coverage gates, matrix builds, security scanning, benchmarks. |
| Consistency | 6/10 | TS is clean. Bash hooks vary in jq patterns, error handling. Naming inconsistencies (kebab vs snake). |
| Contributor Experience | 7/10 | CONTRIBUTING.md, PR template, issue templates, CODEOWNERS. Missing: CoC, LICENSE, "good first issue" labels. |
| Error Handling | 5/10 | `errorJson()` exists, fail-open documented (ADR-004). But no typed error hierarchy, silent failures possible, hook pipeline errors invisible. |
| Performance | 2/10 | No benchmarks of any kind. Hook latency unmeasured. Server performance untested. |
| Overall | **6/10** | Strong foundation. Critical gaps in testing depth, performance measurement, and self-enforcement. |

---

## Work Streams

Each to-do item includes:
- **Description** — what needs to be done
- **Done when** — concrete acceptance criteria
- **Files** — files to create or modify
- **Size** — S (< 1 hour), M (1-3 hours), L (3+ hours)
- **Inspired by** — which pristine repo pattern motivates this

Items marked with `[ ]` are incomplete. Mark `[x]` when done.

---

### Stream 1: Testing — From 5/10 to 10/10

> *"You don't first build a system, then add a fuzzer. The starting point is sketching minimal interfaces that yield themselves to efficient fuzzing." — TigerBeetle*

#### 1.1 Unit Tests for Untested Modules

- [ ] **T-01: Add `trace.test.ts`**
  - **Description:** Unit tests for `ExecutionTrace` — `buildTrace()`, `buildAgentTrace()`, `renderAscii()`, `getStats()`. Test tree building with nested agent/task hierarchies, empty streams, single-event streams.
  - **Done when:** `trace.ts` has ≥80% branch coverage. Tests cover: empty stream, single agent, multi-agent forest, task nesting, ASCII rendering output format.
  - **Files:** `control-plane/src/trace.test.ts` (new)
  - **Size:** M
  - **Inspired by:** Redis — every data structure has its own test file

- [ ] **T-02: Add `ingest.test.ts`**
  - **Description:** Unit tests for `JournalIngester` — `ingestNewLines()`, `start()`/`stop()`, `getStats()`. Test with valid JSONL, malformed lines, missing file, file growth simulation, offset tracking.
  - **Done when:** `ingest.ts` has ≥80% branch coverage. Tests cover: missing file, empty file, valid lines, malformed lines, incremental reads, stats accuracy.
  - **Files:** `control-plane/src/ingest.test.ts` (new)
  - **Size:** M
  - **Inspired by:** SQLite — every I/O path is tested with error injection

- [ ] **T-03: Add `instrumentation.test.ts`**
  - **Description:** Unit tests for `AgentInstrumentation` — all convenience methods (`started`, `stopped`, `taskAssigned`, `taskCompleted`, `taskFailed`, `toolCalled`, `toolResult`, `tokenSpent`, `subtaskCreated`, `policyViolation`). Verify correct event types, data payloads, and token counting.
  - **Done when:** `instrumentation.ts` has ≥90% branch coverage. Every public method has at least one test.
  - **Files:** `control-plane/src/instrumentation.test.ts` (new)
  - **Size:** S
  - **Inspired by:** Go stdlib — every exported function has a test

- [ ] **T-04: Add `events.test.ts`**
  - **Description:** Dedicated unit tests for `EventStream` — ID generation uniqueness, listener add/remove, event eviction via RingBuffer, `getEventsByAgent()`, `getEventsByTask()`, `getEventsSince()`, `getEvictedCount()`, `getTotalEmitted()`, `clear()`.
  - **Done when:** `events.ts` has ≥90% branch coverage. Tests cover: listener lifecycle, eviction behavior, filter correctness, counter accuracy.
  - **Files:** `control-plane/src/events.test.ts` (new)
  - **Size:** S
  - **Inspired by:** FoundationDB — every state transition is tested

#### 1.2 Edge Case & Robustness Testing

- [ ] **T-05: Add malformed JSON edge case tests for server**
  - **Description:** Test `server.ts` with edge cases: URLs with special characters, very long URLs, requests during shutdown, concurrent requests, missing Content-Type headers.
  - **Done when:** ≥5 new edge case tests added to `server.test.ts`. No crashes on malformed input.
  - **Files:** `control-plane/src/server.test.ts` (modify)
  - **Size:** S
  - **Inspired by:** SQLite — fuzz testing for all input surfaces

- [ ] **T-06: Add hook edge case tests**
  - **Description:** Extend `.hooks/tests/test_hooks.sh` with edge cases: malformed JSON payloads, missing `jq`, empty stdin, very large payloads, Unicode in tool names, concurrent hook execution.
  - **Done when:** ≥10 new edge case tests. All hooks handle malformed input gracefully (fail-open per ADR-004).
  - **Files:** `.hooks/tests/test_hooks.sh` (modify)
  - **Size:** M
  - **Inspired by:** TigerBeetle — every subsystem has its own targeted fuzzer

- [ ] **T-07: Add state.sh concurrent access tests**
  - **Description:** Test `with_state_lock` under concurrent access. Spawn multiple subshells that simultaneously read-modify-write state. Verify no data loss or corruption.
  - **Done when:** Test demonstrates that `flock`-based locking prevents data loss under concurrent writes. Test passes on both Linux and macOS (or documents platform limitation).
  - **Files:** `admiral/tests/test_state_concurrency.sh` (new)
  - **Size:** M
  - **Inspired by:** FoundationDB — simulation testing for concurrent access

#### 1.3 Coverage Enforcement

- [ ] **T-08: Add coverage threshold gate to CI**
  - **Description:** Parse `--experimental-test-coverage` output in CI and fail if coverage drops below threshold. Start with a realistic baseline (measure current, set threshold 5% below), then ratchet up.
  - **Done when:** CI fails if line coverage drops below threshold. Threshold is documented in `CONTRIBUTING.md`.
  - **Files:** `.github/workflows/control-plane-ci.yml` (modify), `CONTRIBUTING.md` (modify)
  - **Size:** M
  - **Inspired by:** SQLite — 100% MC/DC coverage enforced

- [ ] **T-09: Add coverage badge to README**
  - **Description:** Generate coverage badge from CI output. Display in README.md.
  - **Done when:** README shows current coverage percentage. Badge updates on each CI run.
  - **Files:** `README.md` (modify), `.github/workflows/control-plane-ci.yml` (modify)
  - **Size:** S
  - **Inspired by:** ripgrep — visible quality indicators in README

#### 1.4 Performance & Benchmarks

- [ ] **T-10: Add hook latency benchmark**
  - **Description:** Create a benchmark script that measures the wall-clock time for each hook to execute with a typical payload. Measure cold start (first invocation) and warm (subsequent). Output a table of hook → p50/p95/p99 latency.
  - **Done when:** Script exists, runs, and produces a latency table. Results documented in `docs/benchmarks/hook-latency.md`.
  - **Files:** `admiral/benchmarks/hook_latency.sh` (new), `docs/benchmarks/hook-latency.md` (new)
  - **Size:** M
  - **Inspired by:** Redis — built-in `redis-benchmark` tool

- [ ] **T-11: Add server performance benchmark**
  - **Description:** Benchmark `server.ts` under load: measure response time for `/api/events` with 100, 1000, and 10000 events in the stream. Measure memory usage. Use Node.js built-in `performance` API (no external deps).
  - **Done when:** Benchmark script exists and produces a performance report. Results documented.
  - **Files:** `control-plane/benchmarks/server-perf.ts` (new), `docs/benchmarks/server-perf.md` (new)
  - **Size:** M
  - **Inspired by:** SQLite — `speedtest1` program with published results

- [ ] **T-12: Add RingBuffer benchmark**
  - **Description:** Benchmark `RingBuffer` operations at scale — push, toArray, filter at 10K/100K/1M elements. Verify O(1) push and bounded memory.
  - **Done when:** Benchmark shows push is O(1) amortized. Memory usage is bounded at configured max.
  - **Files:** `control-plane/benchmarks/ring-buffer-perf.ts` (new)
  - **Size:** S
  - **Inspired by:** Go — `go test -bench` as standard practice

---

### Stream 2: Code Quality & Consistency — From 6/10 to 10/10

> *"One style, everywhere, enforced by tooling." — The pattern across all pristine repos*

#### 2.1 Bash Hook Standardization

- [ ] **Q-01: Create shared jq helpers library**
  - **Description:** Extract common jq patterns into `admiral/lib/jq_helpers.sh`. Functions: `jq_get_field()` (with default), `jq_set_field()`, `jq_array_append()`, `jq_validate()`. Refactor hooks to use these instead of ad-hoc jq invocations.
  - **Done when:** All hooks use shared helpers for common jq operations. No more inconsistent `// "default"` vs `// empty` vs bare patterns. `jq_helpers.sh` passes ShellCheck.
  - **Files:** `admiral/lib/jq_helpers.sh` (new), all `.hooks/*.sh` (modify)
  - **Size:** L
  - **Inspired by:** Go stdlib — one idiomatic way to do each thing

- [ ] **Q-02: Standardize hook error handling pattern**
  - **Description:** Create a shared error handling pattern in `admiral/lib/hook_utils.sh`. Functions: `hook_log()` (structured logging to stderr), `hook_fail_soft()` (exit 1 with log), `hook_fail_hard()` (exit 2 with log), `hook_pass()` (exit 0). Refactor all hooks to use these.
  - **Done when:** All 13 hooks use the shared error handling pattern. Exit code semantics are consistent and use the shared functions.
  - **Files:** `admiral/lib/hook_utils.sh` (new), all `.hooks/*.sh` (modify)
  - **Size:** L
  - **Inspired by:** Rust — `Result<T, E>` everywhere; one error pattern

- [ ] **Q-03: Document and enforce hook header standard**
  - **Description:** Define a mandatory header format for all hooks: purpose, exit codes, dependencies, Standing Order reference, last modified date. Create a ShellCheck-compatible header checker that runs in CI.
  - **Done when:** All 13 hooks have consistent headers. CI validates header presence.
  - **Files:** All `.hooks/*.sh` (modify), `admiral/tests/test_hook_headers.sh` (new)
  - **Size:** M
  - **Inspired by:** PostgreSQL — consistent header comments in every file

#### 2.2 TypeScript Quality Improvements

- [ ] **Q-04: Replace Date.now() event IDs with crypto.randomUUID()**
  - **Description:** `events.ts:generateId()` uses `Date.now()` + counter. Replace with `crypto.randomUUID()` (available in Node 19+) for collision-safe IDs across processes.
  - **Done when:** `generateId()` uses `crypto.randomUUID()`. Existing tests still pass. ID format is `evt_<uuid>`.
  - **Files:** `control-plane/src/events.ts` (modify), tests that check ID format (modify)
  - **Size:** S
  - **Inspired by:** TigerBeetle — static allocation and deterministic IDs

- [ ] **Q-05: Add typed error hierarchy**
  - **Description:** Create `control-plane/src/errors.ts` with a base `AdmiralError` class and specific subclasses: `NotFoundError`, `ValidationError`, `StateCorruptionError`, `IngestionError`. Refactor `server.ts` and `ingest.ts` to throw/catch typed errors.
  - **Done when:** No more `err instanceof Error ? err.message : String(err)` patterns. All catch blocks handle specific error types. `errorJson()` maps error types to HTTP status codes.
  - **Files:** `control-plane/src/errors.ts` (new), `control-plane/src/server.ts` (modify), `control-plane/src/ingest.ts` (modify)
  - **Size:** M
  - **Inspired by:** Rust `thiserror` — structured, typed errors everywhere

- [ ] **Q-06: Document TypeScript export conventions**
  - **Description:** Add a section to CONTRIBUTING.md documenting the export pattern: what goes in `index.ts`, when to export types vs classes vs functions, naming conventions for re-exports.
  - **Done when:** `CONTRIBUTING.md` has a "TypeScript Exports" section. `index.ts` follows the documented pattern.
  - **Files:** `CONTRIBUTING.md` (modify), `control-plane/src/index.ts` (modify if needed)
  - **Size:** S
  - **Inspired by:** Go — every package has a clear, documented export surface

- [ ] **Q-07: Improve server.ts URL routing**
  - **Description:** Replace manual `url.split("/").filter(Boolean)` parsing with a lightweight route table pattern. Create a `Router` class or use `URLPattern` (Node 22+). Eliminate the `agentId !== "resume"` guard smell.
  - **Done when:** URL routing uses a declarative pattern. No more string splitting for parameter extraction. All existing server tests still pass.
  - **Files:** `control-plane/src/server.ts` (modify), `control-plane/src/server.test.ts` (modify)
  - **Size:** M
  - **Inspired by:** Flask/Sinatra — clean, declarative routing

---

### Stream 3: Architecture & Design — From 7/10 to 10/10

> *"Clean module boundaries with explicit interfaces/contracts." — Pattern across all Tier 1 codebases*

- [ ] **A-01: Add JSON schema validation for hook payloads**
  - **Description:** Define JSON schemas for hook input/output payloads. Create a validation function in `admiral/lib/schema_validate.sh` that validates payloads against schemas using `jq`. Apply to adapter scripts.
  - **Done when:** Hook payload schemas are documented as JSON Schema files in `admiral/schemas/`. Adapters validate input before passing to hooks. Invalid payloads are logged (fail-open per ADR-004).
  - **Files:** `admiral/schemas/` (new directory), `admiral/lib/schema_validate.sh` (new), `.hooks/pre_tool_use_adapter.sh` (modify), `.hooks/post_tool_use_adapter.sh` (modify)
  - **Size:** L
  - **Inspired by:** TigerBeetle — 6,000+ assertions validating invariants at every layer

- [ ] **A-02: Bridge control plane and hooks**
  - **Description:** The TypeScript control plane (`RunawayDetector`) and bash hooks (`loop_detector.sh`) are parallel systems. Create a shared signal mechanism: hooks write to `event_log.jsonl`, control plane ingests and cross-references. When `RunawayDetector` fires an alert, write it to a file that hooks can read. When `loop_detector.sh` detects a loop, emit a JSONL event that the control plane ingests.
  - **Done when:** A loop detected by either system is visible in both. The control plane dashboard shows hook-detected loops. Hook exit codes reflect control-plane alerts.
  - **Files:** `control-plane/src/ingest.ts` (modify), `.hooks/loop_detector.sh` (modify), `admiral/lib/state.sh` (modify)
  - **Size:** L
  - **Inspired by:** FoundationDB — single unified simulation, not parallel systems

- [ ] **A-03: Document API endpoints**
  - **Description:** Create `control-plane/API.md` documenting every HTTP endpoint: method, path, request body, response shape, status codes, error responses. Include curl examples.
  - **Done when:** Every route in `server.ts` is documented with request/response examples. API.md is linked from README.
  - **Files:** `control-plane/API.md` (update if exists, create if not), `README.md` (modify)
  - **Size:** M
  - **Inspired by:** FastAPI — auto-generated but always-accurate API documentation

- [ ] **A-04: Add bash dependency checker script**
  - **Description:** Create `admiral/bin/check_deps` that verifies all required bash tools are available: `jq` (≥1.6), `sha256sum` or `shasum`, `uuidgen`, `date`, `flock`, `shellcheck` (optional). Run at session start and in CI.
  - **Done when:** Script checks all dependencies, reports versions, and exits non-zero if critical deps are missing. CI runs it before hook tests.
  - **Files:** `admiral/bin/check_deps` (new), `.github/workflows/hook-tests.yml` (modify)
  - **Size:** S
  - **Inspired by:** Lua — explicit about its zero-dependency constraint and what IS required

---

### Stream 4: Documentation — From 6/10 to 10/10

> *"Great codebases optimize for the reader, not the writer." — Pattern across all Tier 1 codebases*

- [ ] **D-01: Create ADMIRAL_STYLE.md — published coding standard**
  - **Description:** Create a TigerBeetle-style coding standard document. Cover: naming conventions (files, variables, functions), error handling patterns, jq usage patterns, exit code semantics, comment standards ("why" not "what"), testing requirements, commit message format. This should be a standalone document that someone could study independently of the codebase.
  - **Done when:** Document covers all coding conventions currently scattered across AGENTS.md, CONTRIBUTING.md, and tribal knowledge. Referenced from CONTRIBUTING.md and AGENTS.md.
  - **Files:** `ADMIRAL_STYLE.md` (new), `CONTRIBUTING.md` (modify), `AGENTS.md` (modify)
  - **Size:** L
  - **Inspired by:** TigerBeetle's [TIGER_STYLE.md](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md) — coding standards as a publishable artifact

- [ ] **D-02: Add CODE_OF_CONDUCT.md**
  - **Description:** Adopt Contributor Covenant v2.1 (the industry standard).
  - **Done when:** `CODE_OF_CONDUCT.md` exists at repo root. Referenced from CONTRIBUTING.md.
  - **Files:** `CODE_OF_CONDUCT.md` (new), `CONTRIBUTING.md` (modify)
  - **Size:** S
  - **Inspired by:** Every pristine open-source project has one

- [ ] **D-03: Add LICENSE file at repo root**
  - **Description:** Currently MIT is declared in `control-plane/package.json` but no `LICENSE` file exists at repo root. Create one.
  - **Done when:** `LICENSE` file exists at repo root with MIT license text. Year and copyright holder filled in.
  - **Files:** `LICENSE` (new)
  - **Size:** S
  - **Inspired by:** Standard open-source practice

- [ ] **D-04: Add inline "why" comments to hooks**
  - **Description:** Audit all 13 hooks and add "why" comments where logic isn't self-evident. Focus on: regex patterns, threshold values, state mutation logic, exit code decisions, jq filter chains. Do NOT add "what" comments.
  - **Done when:** Every non-obvious decision in hooks has a "why" comment. Magic numbers reference their source (e.g., "500ms timeout — empirical p95 from 50 sessions, see ADR-003").
  - **Files:** All `.hooks/*.sh` (modify), `admiral/lib/state.sh` (modify)
  - **Size:** L
  - **Inspired by:** Redis — HyperLogLog header comment is a mini-paper; PostgreSQL — extensive inline "why" comments

- [ ] **D-05: Add usage examples to templates**
  - **Description:** Each template in `admiral/templates/` should have a comment block showing when and how to use it, with a concrete example.
  - **Done when:** Each template file has a usage example. Templates are referenced from CONTRIBUTING.md.
  - **Files:** `admiral/templates/*.json` (modify), `admiral/templates/*.md` (modify), `CONTRIBUTING.md` (modify)
  - **Size:** S
  - **Inspired by:** Go stdlib — every type has example test functions

- [ ] **D-06: Add ADR for hook payload schema decisions**
  - **Description:** Document the design decision around hook I/O: why JSON over stdin/stdout, why fail-open on malformed payloads, what the payload schema looks like, how it evolved.
  - **Done when:** `docs/adr/006-hook-payload-schema.md` exists and follows ADR format.
  - **Files:** `docs/adr/006-hook-payload-schema.md` (new)
  - **Size:** S
  - **Inspired by:** CockroachDB — RFC for every major design decision

- [ ] **D-07: Add ADR for event ID generation**
  - **Description:** Document why event IDs use the current format, trade-offs considered (UUID vs timestamp+counter vs ULID), and the decision rationale.
  - **Done when:** `docs/adr/007-event-id-generation.md` exists.
  - **Files:** `docs/adr/007-event-id-generation.md` (new)
  - **Size:** S
  - **Inspired by:** PostgreSQL — major decisions documented with rationale

---

### Stream 5: CI/CD & Infrastructure — From 7/10 to 10/10

> *"Multi-stage pipelines: lint → build → test → coverage → integration → release" — Pattern across all pristine repos*

- [ ] **C-01: Add coverage threshold gate**
  - **Description:** Parse `--experimental-test-coverage` output in `control-plane-ci.yml`. Fail CI if line coverage drops below threshold. Start with current baseline minus 5%, ratchet up as tests are added.
  - **Done when:** CI fails on coverage regression. Threshold is documented.
  - **Files:** `.github/workflows/control-plane-ci.yml` (modify)
  - **Size:** M
  - **Inspired by:** SQLite — 100% MC/DC coverage enforced in CI

- [ ] **C-02: Add matrix CI builds**
  - **Description:** Run TypeScript tests on `ubuntu-latest` and `macos-latest`. Run hook tests on both. This validates POSIX compatibility claims.
  - **Done when:** CI matrix includes ubuntu + macOS. Both pass.
  - **Files:** `.github/workflows/control-plane-ci.yml` (modify), `.github/workflows/hook-tests.yml` (modify)
  - **Size:** S
  - **Inspired by:** ripgrep — tests on Linux, macOS, Windows

- [ ] **C-03: Add CodeQL security scanning**
  - **Description:** Add a GitHub Actions workflow that runs CodeQL on TypeScript and bash code. Run on PRs and weekly.
  - **Done when:** `.github/workflows/codeql.yml` exists. Scans TypeScript. Blocks PR on high/critical findings.
  - **Files:** `.github/workflows/codeql.yml` (new)
  - **Size:** S
  - **Inspired by:** Every serious open-source project runs static analysis

- [ ] **C-04: Add integration test stage to CI**
  - **Description:** Create a CI job that tests hooks and control plane together: start the server, run hooks that emit events, verify events appear in the control plane, verify alerts fire correctly.
  - **Done when:** Integration test job passes in CI. Tests at least one end-to-end flow.
  - **Files:** `.github/workflows/integration-tests.yml` (new) or extend existing, `admiral/tests/test_integration_e2e.sh` (new)
  - **Size:** L
  - **Inspired by:** FoundationDB — end-to-end simulation testing

- [ ] **C-05: Add benchmark regression detection to CI**
  - **Description:** After T-10 and T-11 benchmarks exist, run them in CI and compare against stored baselines. Warn (don't block) if performance regresses >10%.
  - **Done when:** CI runs benchmarks and comments on PRs if performance changes significantly.
  - **Files:** `.github/workflows/benchmarks.yml` (new)
  - **Size:** M
  - **Inspired by:** Deno — CI automatically runs benchmarks on every PR

- [ ] **C-06: Enable `git config core.hooksPath .githooks` in CI**
  - **Description:** Ensure CI environment uses the project's git hooks. Document in CONTRIBUTING.md that new developers should run this command.
  - **Done when:** CI uses project git hooks. CONTRIBUTING.md prominently documents the setup step (already partially done — verify and strengthen).
  - **Files:** `.github/workflows/*.yml` (modify if needed), `CONTRIBUTING.md` (verify)
  - **Size:** S
  - **Inspired by:** Self-enforcement — practice what we preach

---

### Stream 6: The Philosophical Gap — From "Good Enough" to "Showcase"

> *"Pristine repositories practice what they preach. SQLite's testing strategy IS the product." — [research/pristine-repos-gap-analysis.md](research/pristine-repos-gap-analysis.md)*

These items transform the hooks directory from "implementation code" into "the single best demonstration of what Admiral makes possible."

- [ ] **P-01: Admiral enforces its own test discipline**
  - **Description:** Create a hook or CI check that requires test additions for any bug fix commit. When a commit message starts with `fix:`, verify that at least one test file was also modified or added.
  - **Done when:** CI warns (soft-fail initially) when a `fix:` commit has no associated test changes.
  - **Files:** `.githooks/pre-commit` (modify) or `.github/workflows/` (modify)
  - **Size:** M
  - **Inspired by:** SQLite — regression test for every bug fix is non-negotiable

- [ ] **P-02: Admiral enforces its own documentation discipline**
  - **Description:** Create a CI check that verifies: every `.ts` source file has a module-level doc comment, every `.sh` hook has a header comment, every ADR follows the template format.
  - **Done when:** CI validates documentation presence. All existing files pass.
  - **Files:** `admiral/tests/test_documentation.sh` (new), `.github/workflows/` (modify)
  - **Size:** M
  - **Inspired by:** Go — `golint` enforces doc comments on every export

- [ ] **P-03: Create a "meta-test" — Admiral tests its own hooks**
  - **Description:** Create a test that uses the Admiral control plane to monitor Admiral's own hook execution. Start the control plane, run the hook test suite, ingest the resulting events, and verify that the control plane correctly detects the test patterns.
  - **Done when:** A test exists that proves the control plane can observe and analyze its own hook execution. This is the ultimate "eat your own dog food" test.
  - **Files:** `admiral/tests/test_self_observation.sh` (new), documentation in `docs/adr/` (new)
  - **Size:** L
  - **Inspired by:** TigerBeetle — the system tests itself under its own governance

- [ ] **P-04: Publish quality metrics dashboard**
  - **Description:** Extend the control plane dashboard to show codebase quality metrics: test count, coverage %, hook count, standing order count, ADR count, last benchmark results. Make the project's quality posture visible at a glance.
  - **Done when:** Dashboard shows quality metrics. Metrics update from CI data.
  - **Files:** `control-plane/src/dashboard/` (modify), `control-plane/src/server.ts` (modify)
  - **Size:** L
  - **Inspired by:** Every pristine project makes its quality visible (badges, dashboards, published test results)

---

## Execution Guide

### How to Use This Plan Across Sessions

1. **Pick a stream.** Each stream is independent. You can work on Stream 1 without completing Stream 2.
2. **Pick an item.** Items within a stream are roughly priority-ordered (top = highest priority). Some items have dependencies noted.
3. **Check the box.** When an item is complete, change `[ ]` to `[x]` and add the completion date.
4. **Update the score.** After completing items, re-assess the dimension score in the Current Score table.
5. **Commit PLAN.md changes.** Keep this file as the living roadmap.

### Dependencies Between Items

```
T-08 (coverage gate) depends on T-01 through T-04 (need tests to measure)
T-10, T-11 (benchmarks) are prerequisites for C-05 (benchmark CI)
Q-01 (jq helpers) should precede Q-02 (error handling) — both refactor hooks
A-01 (schema validation) should precede A-02 (bridge control plane + hooks)
P-01 (test discipline) depends on T-08 (coverage gate)
P-03 (meta-test) depends on A-02 (bridge) and T-06 (hook edge cases)
P-04 (quality dashboard) depends on T-10, T-11 (benchmarks) and T-09 (coverage badge)
```

### Recommended Session Order

1. **Session 1:** T-01, T-02, T-03, T-04 (unit tests for untested modules — biggest coverage impact)
2. **Session 2:** Q-01, Q-02 (standardize hooks — biggest consistency impact)
3. **Session 3:** T-08, C-01, T-09 (coverage enforcement — biggest enforcement impact)
4. **Session 4:** D-01, D-02, D-03 (documentation — quick wins)
5. **Session 5:** Q-04, Q-05, Q-07 (TypeScript quality — targeted improvements)
6. **Session 6:** A-01, A-04 (architecture — schema validation, dep checker)
7. **Session 7:** T-05, T-06, T-07 (edge case testing — robustness)
8. **Session 8:** C-02, C-03, C-04 (CI improvements — matrix, security, integration)
9. **Session 9:** T-10, T-11, T-12 (benchmarks — performance visibility)
10. **Session 10:** A-02, A-03 (architecture — bridge systems, API docs)
11. **Session 11:** P-01, P-02 (self-enforcement — eat our own dog food)
12. **Session 12:** D-04, D-05, D-06, D-07 (remaining documentation)
13. **Session 13:** C-05, P-03, P-04 (benchmark CI, meta-test, quality dashboard — capstone)

### Definition of Done: 10/10

The codebase is 10/10 when:
- [ ] All items in this plan are marked `[x]`
- [ ] Current Score table shows 9+ in every dimension
- [ ] A new contributor can set up, understand, and contribute in under 30 minutes
- [ ] The hook directory is the most tested code in the repository
- [ ] Every CI check passes on both Linux and macOS
- [ ] Coverage is ≥80% across all TypeScript modules
- [ ] Every hook has a dedicated test
- [ ] Every design decision has an ADR
- [ ] The project's quality is visible (badges, dashboard, published benchmarks)
- [ ] Admiral enforces its own quality standards through its own hooks

---

## References

- [research/pristine-github-repositories.md](research/pristine-github-repositories.md) — Catalog of pristine codebases and patterns
- [research/pristine-repos-gap-analysis.md](research/pristine-repos-gap-analysis.md) — Original gap analysis (partially stale — many items now complete)
- [docs/adr/005-codebase-review-2026-03.md](docs/adr/005-codebase-review-2026-03.md) — ADR documenting this review
- [CONTRIBUTING.md](CONTRIBUTING.md) — Current contributor guide
- [AGENTS.md](AGENTS.md) — Agent governance and decision authority
