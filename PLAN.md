# PLAN.md — Roadmap to a 10/10 Pristine Codebase

**Last updated:** 2026-03-18

**Target:** Transform this project from a strong prototype into a showcase-quality, fully-governed, spec-complete AI agent orchestration platform — a codebase that earns a 10/10 on every dimension.

**Thesis:** A pristine codebase is not about perfection — it is about predictability, discoverability, and confidence. Every file should justify its existence. Every behavior should be tested. Every decision should be documented. A stranger should be able to clone this repo and ship a contribution within 30 minutes.

---

## Vision: What 10/10 Means for This Project

1. **Every module has tests.** No source file exists without a corresponding test file. Coverage gates enforce minimums. Property-based and fuzz tests cover edge cases. Quarantined tests trend toward zero.

2. **Hooks are a showcase.** The hook system is the crown jewel — every hook is implemented, tested, documented, and measurably fast. Hook pipelines are observable, errors are typed and surfaced, and the entire lifecycle is deterministic.

3. **Zero surprise failures.** CI catches everything before merge. No silent failures. No flaky tests. No "works on my machine." Every error has a type, a message, and a recovery path.

4. **A stranger can contribute in 30 minutes.** Clone, install, run tests, read CONTRIBUTING.md, find a "good first issue," open a PR. No tribal knowledge required. No undocumented setup steps. No mystery configuration.

5. **Published coding standards.** ADMIRAL_STYLE.md defines naming, error handling, jq patterns, file organization, and commit conventions. Biome, ShellCheck, and custom lint rules enforce them automatically.

6. **Deterministic self-enforcement.** The spec is the source of truth. Spec-validation in CI ensures the codebase matches the spec. Drift is detected automatically. Meta-governance ensures governance itself is governed.

7. **Design docs precede code.** Every significant change starts with an ADR or design doc. The ADR index is complete and current. Architecture decisions are searchable and linked from the code they govern.

---

## Current Score

| Dimension | Score | Notes |
|---|---|---|
| Testing | 5/10 | 6 TS test files (206 tests), 34 hook tests, 39 quarantine tests. Gaps: no trace/ingest/instrumentation/events unit tests, no edge case tests, no fuzz/property-based tests, no coverage gates. |
| Code Quality Tooling | 7/10 | Biome, ShellCheck, pre-commit hooks, strict TS. Missing: coverage gates, security scanning, jq helpers, typed error hierarchy. |
| Architecture | 5/10 | Clean separation, zero runtime deps, file locking. Missing: hook/control-plane integration, schema validation, typed errors, fleet orchestration, execution patterns, meta-governance. |
| Spec Implementation | 3/10 | 8/15 hooks implemented (53%). Fleet orchestration 0%. Brain B2/B3 0%. Execution patterns 0%. Meta-governance 0%. Only Claude Code governed out of 71 defined agent roles. |
| Documentation | 6/10 | AGENTS.md, CONTRIBUTING.md, 5 ADRs, CHANGELOG, API.md. Missing: ADMIRAL_STYLE.md, LICENSE, CoC, runbook, troubleshooting guide, inline "why" comments. |
| CI/CD | 7/10 | Build+test+lint+coverage+shellcheck+audit+spec-validation. Missing: coverage gates, matrix builds, security scanning, benchmarks, integration tests. |
| Consistency | 6/10 | TS is clean. Bash hooks vary in jq patterns, error handling. Naming inconsistencies (kebab vs snake). Config scattered across 3+ locations. |
| Contributor Experience | 7/10 | CONTRIBUTING.md, PR template, issue templates, CODEOWNERS. Missing: CoC, LICENSE, "good first issue" labels, troubleshooting guide. |
| Error Handling | 5/10 | `errorJson()` exists, fail-open documented (ADR-004). No typed error hierarchy, silent failures possible, hook pipeline errors invisible. |
| Performance | 2/10 | No benchmarks of any kind. Hook latency unmeasured. Server performance untested. |
| Brain & Knowledge | 2/10 | B1 file-based with 9 entries, manual creation only. B2/B3 not started. No automatic recording, no semantic search, no retrieval in hooks. |
| Fleet & Orchestration | 1/10 | 71 agent roles defined in spec. Only Claude Code actually governed. No routing, no handoff, no parallel execution. |
| Security & Compliance | 4/10 | Advisory zero-trust hook, injection detection (layers 3-5). Missing: data sensitivity layers 1-2, privilege escalation hardening, audit trail, compliance crosswalks. |
| Strategic Positioning | 2/10 | Competitive analysis exists. Missing: OWASP/AEGIS/TACO/NIST/McKinsey/IMDA crosswalks, AI Work OS positioning. |
| **Overall** | **4/10** | Strong foundation in hooks and control plane. Critical gaps in spec implementation, brain system, fleet orchestration, and strategic positioning. |

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

- [ ] **T-01: Add `trace.test.ts`** — Unit tests for `ExecutionTrace` — `buildTrace()`, `buildAgentTrace()`, `renderAscii()`, `getStats()`. Test tree building with nested agent/task hierarchies, empty streams, single-event streams. Done when: ≥80% branch coverage. Files: `control-plane/src/trace.test.ts` (new). Size: M. Inspired by: Redis
- [ ] **T-02: Add `ingest.test.ts`** — Unit tests for `JournalIngester` — `ingestNewLines()`, `start()`/`stop()`, `getStats()`. Test with valid JSONL, malformed lines, missing file, file growth, offset tracking. Done when: ≥80% branch coverage. Files: `control-plane/src/ingest.test.ts` (new). Size: M. Inspired by: SQLite
- [ ] **T-03: Add `instrumentation.test.ts`** — Unit tests for all AgentInstrumentation methods. Done when: ≥90% branch coverage, every public method tested. Files: `control-plane/src/instrumentation.test.ts` (new). Size: S. Inspired by: Go stdlib
- [ ] **T-04: Add `events.test.ts`** — Dedicated unit tests for EventStream — ID generation, listener lifecycle, eviction, filters, counters. Done when: ≥90% branch coverage. Files: `control-plane/src/events.test.ts` (new). Size: S. Inspired by: FoundationDB

#### 1.2 Edge Case & Robustness Testing

- [ ] **T-05: Add malformed JSON edge case tests for server** — Test URLs with special chars, very long URLs, concurrent requests, missing headers. Done when: ≥5 new edge case tests in server.test.ts. Size: S. Inspired by: SQLite fuzz testing
- [ ] **T-06: Add hook edge case tests** — Extend test_hooks.sh with malformed JSON, missing jq, empty stdin, huge payloads, Unicode in tool names, concurrent execution. Done when: ≥10 new edge case tests, all hooks handle gracefully (fail-open per ADR-004). Files: `.hooks/tests/test_hooks.sh`. Size: M. Inspired by: TigerBeetle
- [ ] **T-07: Add state.sh concurrent access tests** — Test `with_state_lock` under concurrent access. Spawn multiple subshells simultaneously. Done when: flock prevents data loss under concurrent writes. Files: `admiral/tests/test_state_concurrency.sh` (new). Size: M. Inspired by: FoundationDB simulation
- [ ] **T-08: Add quarantine pipeline integration tests** — Test full 5-layer quarantine pipeline with known-good and known-bad inputs end-to-end. Done when: Pipeline correctly quarantines all attack corpus items and passes clean items. Files: `admiral/monitor/quarantine/tests/test_pipeline_integration.sh` (new). Size: M. Inspired by: Defense-in-depth testing

#### 1.3 Coverage Enforcement

- [ ] **T-09: Add coverage threshold gate to CI** — Parse `--experimental-test-coverage` output, fail if coverage drops below threshold. Start realistic, ratchet up. Done when: CI fails on coverage regression. Files: `.github/workflows/control-plane-ci.yml`, `CONTRIBUTING.md`. Size: M. Inspired by: SQLite 100% MC/DC
- [ ] **T-10: Add coverage badge to README** — Generate from CI. Done when: README shows current coverage %. Files: `README.md`, `.github/workflows/control-plane-ci.yml`. Size: S. Inspired by: ripgrep

#### 1.4 Performance & Benchmarks

- [ ] **T-11: Add hook latency benchmark** — Measure wall-clock time for each hook with typical payload. Cold start and warm. Output p50/p95/p99 table. Done when: Script produces latency table. Files: `admiral/benchmarks/hook_latency.sh` (new), `docs/benchmarks/hook-latency.md` (new). Size: M. Inspired by: redis-benchmark
- [ ] **T-12: Add server performance benchmark** — Benchmark server under load: /api/events with 100/1000/10000 events. Measure response time and memory. Done when: Benchmark produces report. Files: `control-plane/benchmarks/server-perf.ts` (new). Size: M. Inspired by: SQLite speedtest1
- [ ] **T-13: Add RingBuffer benchmark** — Benchmark push, toArray, filter at 10K/100K/1M elements. Verify O(1) push and bounded memory. Done when: Push is O(1) amortized, memory bounded. Files: `control-plane/benchmarks/ring-buffer-perf.ts` (new). Size: S. Inspired by: Go `go test -bench`
- [ ] **T-14: Add Standing Orders rendering benchmark** — Measure time to render all 16 Standing Orders into text. Verify < 100ms. Done when: Rendering latency measured and documented. Files: `admiral/benchmarks/standing_orders_render.sh` (new). Size: S. Inspired by: Performance visibility

---

### Stream 2: Code Quality & Consistency — From 6/10 to 10/10

> *"One style, everywhere, enforced by tooling." — The pattern across all pristine repos*

#### 2.1 Bash Hook Standardization

- [ ] **Q-01: Create shared jq helpers library** — Extract common jq patterns into `admiral/lib/jq_helpers.sh`. Functions: `jq_get_field()`, `jq_set_field()`, `jq_array_append()`, `jq_validate()`. Refactor all hooks. Done when: All hooks use shared helpers, no inconsistent jq patterns. Files: `admiral/lib/jq_helpers.sh` (new), all `.hooks/*.sh`. Size: L. Inspired by: Go stdlib
- [ ] **Q-02: Standardize hook error handling pattern** — Create shared pattern in `admiral/lib/hook_utils.sh`. Functions: `hook_log()`, `hook_fail_soft()`, `hook_fail_hard()`, `hook_pass()`. Done when: All 13 hooks use shared functions. Files: `admiral/lib/hook_utils.sh` (new), all `.hooks/*.sh`. Size: L. Inspired by: Rust Result<T,E>
- [ ] **Q-03: Document and enforce hook header standard** — Mandatory header: purpose, exit codes, dependencies, SO reference, last modified. CI validates. Done when: All 13 hooks have consistent headers, CI checks. Files: all `.hooks/*.sh`, `admiral/tests/test_hook_headers.sh` (new). Size: M. Inspired by: PostgreSQL
- [ ] **Q-04: Eliminate hook config loading duplication** — Extract repeated config loading and secret detection patterns into shared library. Done when: No duplicated patterns across hooks. Files: `admiral/lib/hook_config.sh` (new), `.hooks/*.sh`. Size: M. Inspired by: DRY principle

#### 2.2 TypeScript Quality Improvements

- [ ] **Q-05: Replace Date.now() event IDs with crypto.randomUUID()** — Collision-safe IDs. Done when: Uses crypto.randomUUID(), ID format `evt_<uuid>`. Files: `control-plane/src/events.ts`. Size: S. Inspired by: TigerBeetle deterministic IDs
- [ ] **Q-06: Add typed error hierarchy** — Create AdmiralError base + NotFoundError, ValidationError, StateCorruptionError, IngestionError. Done when: No `err instanceof Error ? err.message : String(err)` patterns. Files: `control-plane/src/errors.ts` (new), `control-plane/src/server.ts`, `control-plane/src/ingest.ts`. Size: M. Inspired by: Rust thiserror
- [ ] **Q-07: Document TypeScript export conventions** — Add section to CONTRIBUTING.md. Done when: CONTRIBUTING.md has "TypeScript Exports" section. Files: `CONTRIBUTING.md`, `control-plane/src/index.ts`. Size: S. Inspired by: Go package exports
- [ ] **Q-08: Improve server.ts URL routing** — Replace manual url.split("/") with declarative route table. Eliminate `agentId !== "resume"` guard. Done when: Declarative routing, all server tests pass. Files: `control-plane/src/server.ts`, `control-plane/src/server.test.ts`. Size: M. Inspired by: Flask/Sinatra
## Stream 3: Architecture & Design — From 5/10 to 10/10

> *"Clean module boundaries with explicit interfaces/contracts." — Pattern across all Tier 1 codebases*

- [ ] **A-01: Add JSON schema validation for hook payloads** — Define JSON schemas for hook I/O. Create validation function in `admiral/lib/schema_validate.sh`. Apply to adapters. Done when: Schemas in `admiral/schemas/`, adapters validate input, invalid payloads logged (fail-open per ADR-004). Files: `admiral/schemas/` (new), `admiral/lib/schema_validate.sh` (new), `.hooks/pre_tool_use_adapter.sh`, `.hooks/post_tool_use_adapter.sh`. Size: L. Inspired by: TigerBeetle 6000+ assertions
- [ ] **A-02: Bridge control plane and hooks** — Create shared signal mechanism: hooks write to event_log.jsonl, control plane ingests. RunawayDetector alerts → file hooks can read. loop_detector.sh → JSONL event for control plane. Done when: Loop detected by either system visible in both. Files: `control-plane/src/ingest.ts`, `.hooks/loop_detector.sh`, `admiral/lib/state.sh`. Size: L. Inspired by: FoundationDB unified simulation
- [ ] **A-03: Document API endpoints** — Create/update `control-plane/API.md` with every endpoint: method, path, request/response, status codes, curl examples. Done when: Every route documented. Files: `control-plane/API.md`, `README.md`. Size: M. Inspired by: FastAPI
- [ ] **A-04: Add bash dependency checker script** — Check jq ≥1.6, sha256sum/shasum, uuidgen, date, flock, shellcheck. Done when: Script reports versions, exits non-zero on missing critical deps. Files: `admiral/bin/check_deps` (new), `.github/workflows/hook-tests.yml`. Size: S. Inspired by: Lua explicit deps
- [ ] **A-05: Configuration consolidation** — Single source of truth for all config. Currently scattered across config.json, hardcoded defaults in hooks, schema templates, AGENTS.md. Create `admiral/config/admiral.json` as canonical config with schema validation. Done when: Single config file, validated at session start. Files: `admiral/config/admiral.json` (new), `admiral/config/schema.json` (new), `admiral/lib/config.sh` (new). Size: L. Inspired by: Kubernetes single-source config
- [ ] **A-06: Session state schema validation** — Validate session_state.json structure against schema at every write. Done when: Malformed state writes are caught and logged. Files: `admiral/lib/state.sh`, `admiral/schemas/session_state.schema.json` (new). Size: M. Inspired by: JSON Schema validation
- [ ] **A-07: Unified cross-system event log** — Hooks and control plane share single JSONL event log. Both can write and query. Done when: Events from both systems in one log, control plane dashboard shows hook events. Files: `admiral/lib/event_log.sh` (new), `control-plane/src/ingest.ts`. Size: L. Inspired by: Unified observability

---

## Stream 4: Documentation — From 6/10 to 10/10

> *"Great codebases optimize for the reader, not the writer." — Pattern across all Tier 1 codebases*

- [ ] **D-01: Create ADMIRAL_STYLE.md** — TigerBeetle-style coding standard. Cover: naming, error handling, jq patterns, exit codes, comment standards, testing requirements, commit format. Done when: Covers all conventions, referenced from CONTRIBUTING.md and AGENTS.md. Files: `ADMIRAL_STYLE.md` (new), `CONTRIBUTING.md`, `AGENTS.md`. Size: L. Inspired by: TigerBeetle TIGER_STYLE.md
- [ ] **D-02: Add CODE_OF_CONDUCT.md** — Contributor Covenant v2.1. Done when: Exists, referenced from CONTRIBUTING.md. Files: `CODE_OF_CONDUCT.md` (new), `CONTRIBUTING.md`. Size: S.
- [ ] **D-03: Add LICENSE file** — MIT license at repo root (declared in package.json but no file). Done when: LICENSE exists with correct year/holder. Files: `LICENSE` (new). Size: S.
- [ ] **D-04: Add inline "why" comments to hooks** — Audit all 13 hooks, add "why" comments for non-obvious logic. Focus: regex patterns, thresholds, state mutations, exit code decisions, jq filters. Done when: Every non-obvious decision has a "why" comment. Magic numbers reference sources. Files: all `.hooks/*.sh`, `admiral/lib/state.sh`. Size: L. Inspired by: Redis HyperLogLog header
- [ ] **D-05: Add usage examples to templates** — Each template gets comment block with when/how to use. Done when: Each template has usage example. Files: `admiral/templates/*.json`, `admiral/templates/*.md`, `CONTRIBUTING.md`. Size: S. Inspired by: Go example tests
- [ ] **D-06: Add ADR for hook payload schema** — Document why JSON over stdin/stdout, why fail-open on malformed, schema evolution. Done when: `docs/adr/006-hook-payload-schema.md` exists. Files: `docs/adr/006-hook-payload-schema.md` (new). Size: S.
- [ ] **D-07: Add ADR for event ID generation** — Document UUID vs timestamp+counter vs ULID trade-offs. Done when: `docs/adr/007-event-id-generation.md` exists. Files: `docs/adr/007-event-id-generation.md` (new). Size: S.
- [ ] **D-08: Create operational runbook** — Production deployment, monitoring, troubleshooting guide for control plane and hooks. Done when: Runbook covers setup, common failures, recovery procedures. Files: `docs/operations/runbook.md` (new). Size: L. Inspired by: Google SRE handbook
- [ ] **D-09: Create hook troubleshooting guide** — Common hook failures, how to debug, how to test locally. Done when: Guide covers all 13 hooks. Files: `docs/operations/hook-troubleshooting.md` (new). Size: M. Inspired by: Production-ready systems
- [ ] **D-10: Create Brain user guide** — How to use brain_query, brain_record, brain_retrieve, brain_audit CLI tools. Done when: Guide with examples for each tool. Files: `docs/brain-user-guide.md` (new). Size: M.
- [ ] **D-11: Create security model document** — Document threat model, attack surfaces, defense layers, security assumptions. Done when: Comprehensive security model. Files: `docs/security/security-model.md` (new). Size: L. Inspired by: Security-first design
- [ ] **D-12: Add ADR for Standing Orders enforcement** — Document which SOs are hook-enforced vs advisory vs guidance, and why. Done when: `docs/adr/008-standing-order-enforcement-tiers.md` exists. Files: `docs/adr/008-standing-order-enforcement-tiers.md` (new). Size: S.

---

## Stream 5: CI/CD & Infrastructure — From 7/10 to 10/10

> *"Multi-stage pipelines: lint → build → test → coverage → integration → release" — Pattern across all pristine repos*

- [ ] **C-01: Add coverage threshold gate** — Parse coverage output in CI, fail below threshold. Start realistic, ratchet. Done when: CI fails on regression. Files: `.github/workflows/control-plane-ci.yml`. Size: M. Inspired by: SQLite 100% MC/DC
- [ ] **C-02: Add matrix CI builds** — Run TS tests on ubuntu + macOS. Run hook tests on both. Done when: Matrix includes ubuntu + macOS, both pass. Files: `.github/workflows/control-plane-ci.yml`, `.github/workflows/hook-tests.yml`. Size: S. Inspired by: ripgrep cross-platform
- [ ] **C-03: Add CodeQL security scanning** — GitHub Actions workflow for TS + bash. Run on PRs + weekly. Done when: `.github/workflows/codeql.yml` exists, blocks on high/critical. Files: `.github/workflows/codeql.yml` (new). Size: S.
- [ ] **C-04: Add integration test stage** — Test hooks + control plane together: start server, run hooks, verify events, verify alerts. Done when: Integration job passes. Files: `.github/workflows/integration-tests.yml` (new), `admiral/tests/test_integration_e2e.sh` (new). Size: L. Inspired by: FoundationDB e2e
- [ ] **C-05: Add benchmark regression detection** — Run benchmarks in CI, compare baselines. Warn (don't block) on >10% regression. Done when: CI comments on PRs for perf changes. Files: `.github/workflows/benchmarks.yml` (new). Size: M. Inspired by: Deno CI benchmarks
- [ ] **C-06: Enable git hooks in CI** — Ensure CI uses project git hooks. Done when: CI uses project hooks, CONTRIBUTING.md documents setup. Files: `.github/workflows/*.yml`, `CONTRIBUTING.md`. Size: S.
- [ ] **C-07: Automated changelog generation** — Generate CHANGELOG.md from conventional commits. Done when: CHANGELOG auto-updates on merge. Files: `.github/workflows/changelog.yml` (new). Size: M. Inspired by: Conventional changelog
- [ ] **C-08: Dependency license audit** — Verify all deps are license-compatible in CI. Done when: CI fails on incompatible licenses. Files: `.github/workflows/control-plane-ci.yml`. Size: S.
- [ ] **C-09: Reproducible build verification** — Verify TS builds are deterministic. Done when: Two consecutive builds produce identical output. Files: `.github/workflows/control-plane-ci.yml`. Size: S.
### Stream 6: The Philosophical Gap — From "Good Enough" to "Showcase"

> *"Pristine repositories practice what they preach. SQLite's testing strategy IS the product." — [research/pristine-repos-gap-analysis.md](research/pristine-repos-gap-analysis.md)*

These items transform the hooks directory from "implementation code" into "the single best demonstration of what Admiral makes possible." The philosophical gap is not about missing features — it is about the distance between what Admiral *enforces on others* and what it *demands of itself*. Closing this gap is what separates a tool from a movement.

#### 6.1 Self-Enforced Discipline

- [ ] **P-01: Admiral enforces its own test discipline** — Create a CI check that requires test additions for any bug fix commit. When a commit message starts with `fix:`, verify that at least one test file was also modified or added in the same commit. This is the SQLite principle: every bug that escapes is a regression test gap, and the system itself must prevent that gap from persisting. The check should be a soft-fail (warning annotation) initially, escalating to hard-fail once the test suite reaches critical mass (after T-09 coverage gate is in place). Done when: CI warns on `fix:` commit with no associated test changes. A PR with `fix:` in the title and zero test file changes receives a visible warning annotation. Files: `.github/workflows/control-plane-ci.yml` (modify — add test-discipline job), `.github/workflows/hook-tests.yml` (modify — add parallel check for `.sh` test changes). Size: M. Inspired by: SQLite — regression test for every bug fix is non-negotiable

- [ ] **P-02: Admiral enforces its own documentation discipline** — Create a CI validation script that checks three documentation invariants: (1) every `.ts` source file in `control-plane/src/` (excluding test files and `index.ts`) has a module-level doc comment within the first 10 lines, (2) every `.sh` file in `.hooks/` has a header comment block containing at minimum: purpose, exit codes, and Standing Order reference, (3) every ADR in `docs/adr/` follows the template format (contains Status, Context, Decision, and Consequences sections). The script should output a clear report listing all violations with file paths and line numbers. Done when: CI validates documentation presence and all existing files pass. The validation script is itself documented with a header comment. Files: `admiral/tests/test_documentation.sh` (new), `.github/workflows/control-plane-ci.yml` (modify — add doc-discipline job). Size: M. Inspired by: Go `golint` — enforces doc comments on every exported symbol; the Go team considers undocumented exports to be bugs

#### 6.2 Meta-Governance — The System Observes Itself

- [ ] **P-03: Create a "meta-test" — Admiral tests its own hooks** — This is the capstone self-referential test. The test starts the Admiral control plane server, then executes the hook test suite (`.hooks/tests/test_hooks.sh`), which writes events to `event_log.jsonl`. The control plane ingests those events via `JournalIngester`. The test then queries the control plane API (`/api/events`, `/api/agents`) and verifies that: (a) hook execution events were ingested, (b) the `RunawayDetector` did not fire false positives during normal test execution, (c) event counts match the expected number of hook invocations, (d) the execution trace (`/api/traces`) shows a coherent timeline. This proves that Admiral can observe, analyze, and reason about its own behavior — the ultimate dog-fooding test. Depends on: A-02 (bridge control plane and hooks), T-06 (hook edge cases). Done when: A single test script starts the control plane, runs hook tests, ingests events, queries the API, and asserts correctness. The test passes in CI. Files: `admiral/tests/test_self_observation.sh` (new), `.github/workflows/integration-tests.yml` (modify — add self-observation job). Size: L. Inspired by: TigerBeetle — the system tests itself under its own governance; a compiler that cannot compile itself is not finished

- [ ] **P-04: Publish quality metrics dashboard** — Extend the control plane dashboard to display codebase quality metrics as a first-class feature. Metrics to surface: total test count (TS + bash), line coverage percentage, hook count (implemented / total from spec), Standing Order count, ADR count, last benchmark results (hook latency p95, server throughput), and a "quality trend" indicator showing direction of change. Data sources: CI artifacts (coverage reports, test counts), file system scans (count `.test.ts` files, count `docs/adr/*.md`, count `.hooks/*.sh`), and benchmark output files. The dashboard should be accessible at `/dashboard/quality` and auto-refresh. Depends on: T-09 (coverage gate), T-11/T-12 (benchmarks), T-10 (coverage badge). Done when: Dashboard shows all listed metrics. Metrics update automatically from CI data (either via file artifacts or a lightweight metrics file that CI writes). A screenshot of the dashboard is linked from README.md. Files: `control-plane/src/server.ts` (modify — add `/dashboard/quality` route), `control-plane/src/quality-metrics.ts` (new — metrics collection logic), `.github/workflows/control-plane-ci.yml` (modify — write metrics artifact). Size: L. Inspired by: Every pristine project makes its quality posture visible — badges, dashboards, published test results; the act of measuring changes behavior

#### 6.3 Self-Enforcement — Eating Our Own Dog Food

- [ ] **P-05: Pre-commit hook enforcement of own standards** — Extend the existing `.githooks/pre-commit` hook (which already runs ShellCheck on `.sh` and Biome on `.ts`) to also validate: (a) AGENTS.md format consistency — section headers follow the defined hierarchy, no broken internal links, (b) ADR template compliance — any staged `docs/adr/*.md` file contains required sections (Status, Context, Decision, Consequences), (c) Standing Order format — any staged `admiral/standing-orders/*.md` file follows the SO template. The hook must remain fast (< 5 seconds total) by only checking staged files, not the entire repo. Use `git diff --cached --name-only` to scope checks. Each validation failure should print the file, line number, and specific violation. Done when: Pre-commit hook catches ShellCheck violations, Biome errors, AGENTS.md inconsistencies, ADR template violations, and SO format issues before they reach CI. All currently committed files pass the expanded checks. Files: `.githooks/pre-commit` (modify — extend existing hook with AGENTS.md/ADR/SO validation functions). Size: M. Inspired by: Self-dog-fooding — Admiral's own development workflow should be the most rigorously enforced workflow in the repository; if the cobbler's children have no shoes, the tool has no credibility

- [ ] **P-06: Deduplication detection in CI** — Add a CI step that detects code duplication across the codebase, with particular focus on bash hooks (where copy-paste patterns are most likely to accumulate). Use `jscpd` (zero-config, supports bash and TypeScript) or a lightweight custom script that computes similarity hashes for function bodies. Track the "refactoring ratio" — the percentage of commits that reduce duplication vs. those that increase it. Report metrics: total duplicate blocks, total duplicated lines, duplication percentage, and top-5 most duplicated fragments with file locations. The check should warn (not block) when duplication exceeds a threshold (start at 15%, ratchet down). This directly addresses the GitClear research finding that AI-assisted coding increases code duplication by 2-3x when unchecked. Done when: CI reports duplication metrics on every PR. Duplication percentage is visible in CI output. PRs that increase duplication above threshold receive a warning annotation. Files: `.github/workflows/control-plane-ci.yml` (modify — add duplication-detection job), `admiral/tests/test_duplication.sh` (new — bash-specific duplication detection for hooks). Size: M. Inspired by: GitClear research on AI code quality degradation — "moved code" and duplication are the primary quality signals that degrade under AI-assisted development; measuring prevents the problem

---## Stream 7: Admiral Spec Implementation — Closing the Spec-to-Code Gap

> *"A specification without implementation is a wish list. Implementation without tests is a hope. Only tested implementation is truth." — The Admiral Philosophy*

The Admiral Framework specification defines 12 parts. Only parts 1, 2, 4, 7, 8, 9, 11, 12 are partially implemented. Parts 3 (fleet), 5 (execution patterns), 6 (quality gates), and 10 (meta-governance) have **NO** implementation. This stream systematically closes every gap between what the spec promises and what the code delivers.

**Spec coverage before this stream:** ~40% of spec parts have partial implementation, 0% have complete implementation.
**Spec coverage target after this stream:** 100% of spec parts have at least reference implementation.

---

### 7.1 Missing Hooks (Part 3 — Enforcement)

The spec requires 15 hooks. 8 are implemented. 4 are missing entirely, and the relationship between hooks and Standing Orders is undocumented.

- [ ] **S-01: identity_validation.sh**
  - **Description:** Validates agent identity token at session start. Confirms the agent has a valid identity matching its claimed role. Rejects agents that cannot prove their identity against the fleet registry, preventing impersonation and unauthorized task execution.
  - **Done when:** Hook fires at SessionStart, validates identity fields (agent ID, role, tier) against registry, blocks invalid identities with exit code 2, logs validation result to state.
  - **Files:** `.hooks/identity_validation.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 3, SO-01

- [ ] **S-02: tier_validation.sh**
  - **Description:** Validates that the model tier assigned to an agent matches the requirements defined in the spec. Ensures high-capability tasks (architecture decisions, security reviews) are not silently assigned to low-tier models, which would degrade output quality without any warning.
  - **Done when:** Hook validates tier assignment against agent role requirements, warns on mismatch (exit 0 with warning), blocks critical mismatches (exit 2), integrates with session start flow.
  - **Files:** `.hooks/tier_validation.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 3, E2+

- [ ] **S-03: governance_heartbeat_monitor.sh**
  - **Description:** Monitors governance agent health by checking heartbeat signals. Ensures governance agents (Sentinel, Arbiter) are responsive and functioning. A governance agent that silently fails leaves all governed agents unmonitored, creating a single point of failure in the trust hierarchy.
  - **Done when:** Hook emits heartbeat check on configurable interval, alerts on missing heartbeat after threshold, logs heartbeat history to state, integrates with alerting pipeline (S-15 when available).
  - **Files:** `.hooks/governance_heartbeat_monitor.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 3, E3+

- [ ] **S-04: protocol_registry_guard.sh**
  - **Description:** Enforces SO-16 protocol governance rules. Validates that protocol changes (new protocols, protocol modifications, protocol deprecations) go through proper approval workflow rather than being unilaterally modified by individual agents.
  - **Done when:** Hook validates protocol modifications against SO-16 rules (approval required, versioning enforced, backwards compatibility checked), blocks unauthorized protocol changes with exit code 2.
  - **Files:** `.hooks/protocol_registry_guard.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 3, SO-16

- [ ] **S-05: Standing Orders enforcement map**
  - **Description:** Document which hooks enforce which Standing Orders. Creates a complete mapping of all 16 Standing Orders to their enforcement mechanism — whether enforced by a hook (automated), by instruction embedding (agent-side), or by guidance only (advisory). This map is the accountability ledger for the entire governance system.
  - **Done when:** `admiral/docs/standing-orders-enforcement-map.md` exists with complete mapping of all 16 SOs, each entry identifies enforcement type (hook/instruction/guidance), lists the specific file(s) responsible, and notes any enforcement gaps.
  - **Files:** `admiral/docs/standing-orders-enforcement-map.md` (new)
  - **Size:** M
  - **Spec ref:** Part 3

---

### 7.2 Fleet Orchestration (Part 3 — Fleet Composition)

The spec defines 71 agent roles. Zero fleet orchestration code exists. Without orchestration, agents are manually assigned — defeating the purpose of a multi-agent framework.

- [ ] **S-06: Agent registry**
  - **Description:** Runtime registry mapping agent ID to capabilities, routing rules, model tier, and tool permissions. This is the foundational data structure that all fleet operations depend on. Without a registry, every other fleet feature must hardcode agent knowledge.
  - **Done when:** Registry loads from configuration file, validates entries against spec constraints (valid tiers, no conflicting permissions), provides lookup API (by ID, by capability, by tier), returns structured JSON responses.
  - **Files:** `admiral/fleet/registry.sh` (new) or `control-plane/src/fleet-registry.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 3

- [ ] **S-07: Task routing engine**
  - **Description:** Routes tasks to agents based on task type, file ownership rules, agent capability scores, and current agent load. The router is the brain of fleet orchestration — it decides which agent handles which work, replacing manual assignment with capability-aware dispatch.
  - **Done when:** Router accepts task description, queries registry for capable agents, applies routing rules (file ownership, specialization, tier requirements), selects optimal agent, returns routing decision with justification.
  - **Files:** `control-plane/src/task-router.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 3

- [ ] **S-08: Tool permission matrix**
  - **Description:** Enforces per-agent tool permissions — which tools each agent may use, which are denied, and which require approval. The spec defines available and denied tool lists per agent; this item makes those lists enforceable at runtime rather than advisory.
  - **Done when:** Tool use is validated against the agent's allowed tool list before execution, denied tools are blocked with clear error messages, permission matrix is loaded from configuration, integrates with pre_tool_use hook.
  - **Files:** `admiral/fleet/permissions.json` (new), `.hooks/pre_tool_use_adapter.sh`
  - **Size:** M
  - **Spec ref:** Part 3

- [ ] **S-09: Fleet configuration validator**
  - **Description:** Validates fleet configuration against all spec-defined constraints: 1-12 agents per fleet, no overlap between available and denied tool lists, no routing conflicts (two agents claiming exclusive ownership of the same file pattern), valid tier assignments.
  - **Done when:** Validator catches all spec-defined invalid configurations, produces actionable error messages, runs as pre-flight check before fleet deployment, returns structured validation report.
  - **Files:** `admiral/fleet/validate_config.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 3

---

### 7.3 Execution Patterns (Part 5)

The spec defines three execution patterns — handoff, escalation, and parallel coordination. None are implemented. These patterns are how agents collaborate; without them, multi-agent work is just sequential single-agent work repeated.

- [ ] **S-10: Handoff protocol**
  - **Description:** Structured agent-to-agent handoff with JSON schema validation. When one agent completes its portion of work and needs another agent to continue, the handoff protocol ensures all necessary context, state, and intent are transferred completely. Incomplete handoffs are the primary cause of lost context in multi-agent systems.
  - **Done when:** Handoff schema (`handoff/v1.schema.json`) is defined, handoffs are validated against schema before acceptance, incomplete handoffs (missing required fields) are rejected with specific error, handoff history is logged for audit.
  - **Files:** `admiral/handoff/` (new directory), `admiral/handoff/schema.json` (new), `admiral/handoff/validate.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 5

- [ ] **S-11: Escalation pipeline**
  - **Description:** Implements the spec's 5-step escalation process: (1) intake — classify the issue by type and severity; (2) evaluation — determine root cause and query Brain for precedent; (3) resolution path generation — produce candidate solutions ranked by confidence; (4) Admiral decision — select resolution path with authority tracking; (5) execution — apply the chosen resolution and record the outcome as new precedent. This is the conflict resolution backbone of the entire framework.
  - **Done when:** Escalation flows through all 5 steps sequentially, Brain is queried for precedent at step 2, multiple resolution paths are generated at step 3, decision is recorded with authority level at step 4, outcome is persisted as precedent at step 5.
  - **Files:** `admiral/escalation/pipeline.sh` (new), `admiral/escalation/intake.sh` (new), `admiral/escalation/resolve.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 5, Part 11

- [ ] **S-12: Parallel execution coordinator**
  - **Description:** Coordinates parallel agent tasks with dependency tracking. Determines which tasks can run concurrently (no shared file ownership, no data dependencies) and which must be sequenced. Manages the lifecycle of parallel task groups: dispatch, monitor, collect results, detect failures.
  - **Done when:** Coordinator accepts a task graph with dependency edges, schedules independent tasks for parallel execution, blocks dependent tasks until prerequisites complete, handles partial failure (one task fails, others continue or abort based on policy).
  - **Files:** `control-plane/src/parallel-coordinator.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 5

---

### 7.4 Quality Assurance Gates (Part 6)

The spec defines SDLC quality automation — automated gates that prevent low-quality work from merging. Currently, quality is entirely advisory; nothing enforces it.

- [ ] **S-13: SDLC quality gate hooks**
  - **Description:** Pre-merge quality gates that enforce minimum standards: test coverage above configured threshold, linting passes with zero errors, review checklist is complete (no unchecked items). These gates transform quality standards from "should" to "must."
  - **Done when:** Quality gates block merges that fail any configured requirement, thresholds are configurable per-project, gate results are reported with specific failures (not just pass/fail), integrates with CI pipeline.
  - **Files:** `.githooks/pre-push` (new), `admiral/quality/gates.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 6

- [ ] **S-14: Structured code review checklist**
  - **Description:** Automated code review validation against a structured checklist covering security (no hardcoded secrets, input validation), performance (no N+1 queries, no unbounded loops), readability (naming conventions, documentation of non-obvious logic), and correctness (error handling, edge cases).
  - **Done when:** PR template includes the full checklist, CI validates that all checklist items are explicitly addressed (checked or marked N/A), incomplete reviews are flagged, review completion percentage is tracked.
  - **Files:** `.github/PULL_REQUEST_TEMPLATE.md`, `admiral/quality/review_checklist.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 6

---

### 7.5 Operations & Alerting (Part 7)

The control plane exists but operates as a closed system. Events are collected but not pushed externally. Health checks are minimal. Event storage is volatile.

- [ ] **S-15: Alerting pipeline**
  - **Description:** Push alerts from the control plane to external systems via configurable endpoints (webhook URL, local file, structured log). The RunawayDetector already identifies problems — this item ensures those problems reach humans or external systems rather than silently accumulating in an in-memory buffer.
  - **Done when:** Alerts flow from RunawayDetector (and other detectors) to at least one configured endpoint, alert payload includes severity/source/timestamp/details, delivery failures are retried with backoff, alert configuration is loaded from config file.
  - **Files:** `control-plane/src/alerting.ts` (new), `control-plane/src/server.ts`
  - **Size:** L
  - **Spec ref:** Part 7

- [ ] **S-16: Persistent event store**
  - **Description:** Long-term event storage beyond the in-memory ring buffer. Writes events to a JSONL file on disk so that event history survives server restarts. The in-memory ring buffer is appropriate for real-time queries but insufficient for historical analysis or post-incident investigation.
  - **Done when:** Events are written to a JSONL file on disk as they are ingested, file is rotated at configurable size threshold, events persist across server restarts, historical events can be queried from disk when not in memory.
  - **Files:** `control-plane/src/persistent-store.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 7

- [ ] **S-17: Health check endpoint enhancement**
  - **Description:** Expand the /api/health endpoint to expose comprehensive diagnostics: hook execution statistics (success/failure/skip counts), state file age (detect stale state), event ingestion lag (time between event creation and processing), alert rate (alerts per minute over sliding window).
  - **Done when:** `/api/health` returns all listed diagnostics in structured JSON, each metric includes current value and threshold status (healthy/degraded/critical), endpoint remains fast (sub-100ms response time).
  - **Files:** `control-plane/src/server.ts`
  - **Size:** M
  - **Spec ref:** Part 7

---

### 7.6 Platform Adapters (Part 8)

Currently only Claude Code has an adapter. The spec envisions platform-agnostic operation. Without a defined adapter interface, each new platform integration is built from scratch.

- [ ] **S-18: Generic adapter interface**
  - **Description:** Define the adapter contract — what methods any IDE or platform adapter must implement to integrate with the Admiral Framework. Then refactor the existing Claude Code adapter to conform to this interface, proving the interface is sufficient for a real integration.
  - **Done when:** Interface is documented with all required methods (session lifecycle, hook dispatch, tool permission check, event emission), Claude Code adapter is refactored to implement the interface, a second adapter can be built by following the interface alone.
  - **Files:** `admiral/adapters/interface.md` (new), `admiral/adapters/claude-code/` (restructure)
  - **Size:** M
  - **Spec ref:** Part 8

- [ ] **S-19: API-direct adapter**
  - **Description:** Adapter for direct API usage without any IDE — headless mode. Enables hooks to be triggered via CLI or API calls, making the Admiral Framework usable in CI/CD pipelines, automated testing, and scripted workflows where no human is operating an IDE.
  - **Done when:** All hooks can be triggered via CLI commands, session lifecycle (start/stop) is managed programmatically, hook results are returned as structured output (JSON), adapter passes the same integration tests as the Claude Code adapter.
  - **Files:** `admiral/adapters/api-direct/` (new)
  - **Size:** L
  - **Spec ref:** Part 8

---

### 7.7 Security Hardening (Part 9)

Security infrastructure exists (zero-trust validator, prohibitions enforcer) but lacks data sensitivity handling and audit trails. The spec defines layered security; current implementation covers the outer layers only.

- [ ] **S-20: Data sensitivity Layer 1 — Pattern-based PII detection**
  - **Description:** Pattern-based detection for PII (email addresses, SSNs, credit card numbers, API keys, JWT tokens) before data is stored in the Brain. This is the first line of defense — a fast regex-based scanner that catches obvious PII before it enters persistent storage.
  - **Done when:** Sanitizer catches all OWASP-listed PII patterns, runs before every Brain write operation, produces a sanitization report (what was found, what was redacted), false positive rate is measurable and below 5%.
  - **Files:** `admiral/security/sanitizer.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 9

- [ ] **S-21: Data sensitivity Layer 2 — Database-level rejection**
  - **Description:** Database-level rejection trigger for B2/B3 Brain writes containing PII. This is the second line of defense — even if Layer 1 misses something, the database itself refuses to store PII. Defense in depth: if the application layer fails, the data layer catches it.
  - **Done when:** SQL trigger on Brain tables rejects INSERT/UPDATE operations containing PII patterns, rejection is logged with the specific pattern matched, trigger covers all B2 and B3 tier tables.
  - **Files:** `aiStrat/brain/schema/` (extend)
  - **Size:** M
  - **Spec ref:** Part 9

- [ ] **S-22: Security audit trail**
  - **Description:** Persistent log of all security-relevant events: blocked tool uses, injection attempt detections, privilege escalation attempts, PII detection events, zero-trust validation failures. This trail is essential for post-incident forensics and compliance evidence.
  - **Done when:** All security events from existing hooks (prohibitions_enforcer, zero_trust_validator) and new hooks (sanitizer, database trigger) are logged to `admiral/logs/security.jsonl`, each entry includes timestamp/event type/agent ID/action taken/details, log is append-only.
  - **Files:** `admiral/security/audit.sh` (new), `.hooks/prohibitions_enforcer.sh`, `.hooks/zero_trust_validator.sh`
  - **Size:** M
  - **Spec ref:** Part 9

---

### 7.8 Meta-Agent Governance (Part 10)

The spec defines agents governing other agents — the meta-governance layer. This is entirely unimplemented. Without it, agent quality degrades silently because no one is watching the watchers.

- [ ] **S-23: Sentinel agent pattern**
  - **Description:** Implement the loop-breaking governance agent that monitors other agents for runaway behavior, circular dependencies, and infinite loops. The Sentinel observes agent output patterns and intervenes when it detects repetitive or non-converging behavior — the automated version of a human noticing "this agent is stuck."
  - **Done when:** Sentinel detects loops (repeated identical outputs), breaks loops (sends interrupt signal), logs loop detection events, operates with minimal overhead (sampling-based observation, not full output interception).
  - **Files:** `admiral/agents/sentinel.sh` (new) or `control-plane/src/sentinel.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 10

- [ ] **S-24: Decision authority tracking**
  - **Description:** Track per-agent, per-category decision authority with dynamic promotion and demotion. An agent that makes 5 consecutive successful decisions in a category is promoted to higher authority (less oversight required). An agent that makes 1 failed decision is demoted (more oversight required). This creates a trust-but-verify system that adapts to agent reliability.
  - **Done when:** Authority tiers are tracked per agent per decision category, promotion occurs after 5 consecutive successes, demotion occurs after 1 failure, authority state persists across sessions, authority level influences routing decisions.
  - **Files:** `admiral/governance/authority-tracker.sh` (new), `admiral/lib/state.sh`
  - **Size:** L
  - **Spec ref:** Part 10

- [ ] **S-25: Governance health dashboard**
  - **Description:** Visibility into the meta-governance layer: which agents are currently governed, their authority tier states, decision history, promotion/demotion events, and Sentinel intervention history. Without visibility, meta-governance is a black box that humans cannot audit or tune.
  - **Done when:** Dashboard endpoint returns governance state as structured JSON, shows per-agent authority tiers, shows recent decisions with outcomes, shows Sentinel intervention log, accessible via control plane API.
  - **Files:** `control-plane/src/server.ts`
  - **Size:** M
  - **Spec ref:** Part 10

---

### 7.9 Protocol Completeness (Part 11)

The spec defines several operational protocols. Some have partial implementation through standing orders; none have tooling support.

- [ ] **S-26: Human referral protocol tooling**
  - **Description:** Template renderer and routing mechanism for human professional referrals. When an agent determines a task requires human expertise (legal review, medical advice, specialized engineering), it generates a structured referral report that a human can act on — not a vague "ask a human" but a complete brief with context, findings so far, and specific questions.
  - **Done when:** Agents can generate structured referral reports from a template, reports include context summary/findings/specific questions/urgency level, routing mechanism directs reports to appropriate human role.
  - **Files:** `admiral/protocols/human-referral.sh` (new), `admiral/templates/human-referral.md` (new)
  - **Size:** M
  - **Spec ref:** Part 11

- [ ] **S-27: Paid resource authorization broker**
  - **Description:** Credential vault, cost tracking, and session-scoped allocation for paid tool access. When agents need to use paid APIs or services, the broker manages credentials (never exposed to agents directly), tracks costs against budgets, and allocates usage within session-scoped limits to prevent runaway spending.
  - **Done when:** Broker manages credential storage (encrypted at rest), tracks per-session and per-agent costs, enforces budget limits (blocks requests exceeding budget), provides cost reporting, credentials never appear in agent context or logs.
  - **Files:** `admiral/protocols/resource-broker.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 11

- [ ] **S-28: Context budget validation**
  - **Description:** Validate that context profile allocations sum to 100% and fall within spec-defined ranges: Standing Orders 15-25%, Session Context 50-65%, Working Memory 20-30%. Invalid allocations waste context window capacity or leave agents without sufficient working memory.
  - **Done when:** Invalid allocations are detected and warned at session start, allocations outside spec ranges trigger warnings, allocations not summing to 100% trigger errors, integrates with session start hook.
  - **Files:** `admiral/lib/context_budget.sh` (new), `.hooks/session_start_adapter.sh`
  - **Size:** S
  - **Spec ref:** Part 11

---

### 7.10 Data Ecosystem (Part 12)

The spec defines a data ecosystem where agents both consume and produce knowledge through the Brain. Current Brain implementation supports storage and retrieval but has no feedback loops or ecosystem agents.

- [ ] **S-29: Feedback loop reference implementation**
  - **Description:** Implement one end-to-end feedback loop connecting Brain query results to agent performance measurement to Brain content improvement. When an agent uses Brain knowledge and the outcome is measurable (test passes, review accepted, task completed successfully), that outcome feeds back to improve the Brain entry's confidence score and relevance ranking.
  - **Done when:** One complete feedback loop is operational — Brain entry is queried, agent uses it, outcome is measured, outcome updates Brain entry metadata (confidence, usage count, last-success timestamp), subsequent queries benefit from updated metadata.
  - **Files:** `admiral/data-ecosystem/feedback-loop.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 12

- [ ] **S-30: Ecosystem agent prototype**
  - **Description:** Build one of the 5 spec-defined ecosystem agents. Recommended starting point: the simplest agent that connects to the existing Brain infrastructure — likely a "knowledge gardener" that identifies stale Brain entries (not queried in N days), low-confidence entries (repeated negative feedback), and contradictory entries (conflicting advice on the same topic).
  - **Done when:** Agent runs autonomously on a schedule, queries Brain for maintenance targets, produces a structured report of recommended actions (archive stale, flag low-confidence, reconcile contradictions), can optionally execute maintenance actions with approval.
  - **Files:** `admiral/data-ecosystem/agent/` (new)
  - **Size:** L
  - **Spec ref:** Part 12

---

### Stream 7 Summary

| Subsection | Items | Total Size | Spec Parts Covered |
|---|---|---|---|
| 7.1 Missing Hooks | S-01 through S-05 | 5M | Part 3 |
| 7.2 Fleet Orchestration | S-06 through S-09 | 2L + 2M | Part 3 |
| 7.3 Execution Patterns | S-10 through S-12 | 3L | Part 5 |
| 7.4 Quality Gates | S-13 through S-14 | 2M | Part 6 |
| 7.5 Operations & Alerting | S-15 through S-17 | 1L + 2M | Part 7 |
| 7.6 Platform Adapters | S-18 through S-19 | 1L + 1M | Part 8 |
| 7.7 Security Hardening | S-20 through S-22 | 3M | Part 9 |
| 7.8 Meta-Governance | S-23 through S-25 | 2L + 1M | Part 10 |
| 7.9 Protocol Completeness | S-26 through S-28 | 1L + 1M + 1S | Part 11 |
| 7.10 Data Ecosystem | S-29 through S-30 | 2L | Part 12 |
| **Totals** | **30 items** | **11L + 16M + 1S** | **8 spec parts** |

**Critical path:** S-06 (registry) blocks S-07 (routing), S-08 (permissions), and S-09 (validation). S-15 (alerting) blocks S-03 (heartbeat). S-23 (Sentinel) blocks S-25 (dashboard). Start with the registry.

**Recommended execution order:**
1. **Foundation:** S-05 (enforcement map), S-06 (registry), S-28 (context budget) — establish the knowledge base and data structures everything else depends on.
2. **Enforcement:** S-01 through S-04 (missing hooks), S-08 (tool permissions), S-09 (fleet validator) — close enforcement gaps.
3. **Orchestration:** S-07 (routing), S-10 (handoff), S-11 (escalation) — enable multi-agent collaboration.
4. **Quality & Security:** S-13, S-14 (quality gates), S-20 through S-22 (security hardening) — harden the system.
5. **Operations:** S-15 through S-17 (alerting, persistence, health) — make the system observable.
6. **Governance:** S-23 through S-25 (Sentinel, authority tracking, dashboard) — add meta-governance.
7. **Platform & Protocols:** S-18, S-19 (adapters), S-26, S-27 (protocols) — extend reach.
8. **Ecosystem:** S-12 (parallel coordinator), S-29, S-30 (feedback, ecosystem agent) — complete the vision.
## Stream 8: Brain Knowledge System — From B1 to B3

> *"Memory makes intelligence. Without persistent knowledge, every session starts from zero — the antithesis of institutional learning." — Admiral Framework Thesis*

**Current state:** B1 file-based brain with 9 JSON entries across 2 projects (`homebase`, `traced-demo`), manual creation only via `admiral/bin/brain_record`. Four CLI utilities exist (`brain_record`, `brain_query`, `brain_retrieve`, `brain_audit`) — all grep/jq-based. `brain_context_router.sh` hook detects Propose/Escalate decisions made without a preceding `brain_query` (advisory only). No automatic entry creation from hooks. No demand signal tracking. No contradiction detection. B2 (SQLite) and B3 (Production/MCP) not started. Graduation criteria defined in spec but not measured.

**Dependencies:** B1 completion is prerequisite to B2. B2 graduation is prerequisite to B3. Quarantine pipeline (Stream 4 / SD-04) resolved — available for B-18 integration. Control plane (`control-plane/src/server.ts`) exists for B-21 dashboard integration.

---

### 8.1 B1 Completion (File-Based Brain)

- [ ] **B-01: Automatic brain entry creation from hooks**
  - **Description:** Hooks auto-record significant decisions (hard-blocks, escalations, new patterns) to `.brain/`. Create a shared `brain_writer.sh` library that hooks call to emit entries. Wire into at least `prohibitions_enforcer.sh` (records hard-block events), `loop_detector.sh` (records detected loops), and `scope_boundary_guard.sh` (records boundary violations).
  - **Done when:** At least 3 hooks emit brain entries on significant events; entries appear in `.brain/` with correct category, content, and source_agent without manual intervention.
  - **Files:** `.hooks/prohibitions_enforcer.sh`, `.hooks/loop_detector.sh`, `.hooks/scope_boundary_guard.sh`, `admiral/lib/brain_writer.sh` (new)
  - **Size:** M
  - **Spec ref:** level1-spec.md — Automatic Recording

- [ ] **B-02: Brain retrieval in hooks**
  - **Description:** Enhance `brain_context_router.sh` to not just detect missing queries, but actively query the Brain and return relevant entries into agent context. On Propose/Escalate-tier tool calls, the router should invoke `brain_query` with extracted keywords and inject matching entries as context enrichment in the hook response.
  - **Done when:** Router returns matching brain entries for current task context; entries are formatted as structured context blocks in hook output JSON; at least keyword-based matching functional.
  - **Files:** `.hooks/brain_context_router.sh`, `admiral/bin/brain_retrieve`
  - **Size:** M
  - **Spec ref:** level1-spec.md — Context Source Routing

- [ ] **B-03: Demand signal tracking**
  - **Description:** Track what agents search for but don't find in `.brain/_demand/`. When `brain_query` returns zero results, record the query term, timestamp, calling agent, and task context to a demand signal log. Expose demand signals via `brain_audit --demand` so operators can see what knowledge gaps exist.
  - **Done when:** Failed queries are recorded with timestamps in `.brain/_demand/`; demand signals visible via `brain_audit --demand`; at least query term, timestamp, and project captured.
  - **Files:** `admiral/bin/brain_query`, `.brain/_demand/` (new directory), `admiral/bin/brain_audit`
  - **Size:** S
  - **Spec ref:** level1-spec.md — Demand Signals

- [ ] **B-04: Contradiction scan on write**
  - **Description:** Before recording a new brain entry, scan existing entries for potential contradictions. Compare new entry's title and content against existing entries in the same project and category using keyword overlap. Emit a warning (not a hard-block) when potential contradictions are detected, including paths to conflicting entries.
  - **Done when:** `brain_record` warns on potential contradictions before writing; warning includes paths to conflicting entries; non-blocking (entry still written with a `contradicts` metadata field linking to flagged entries).
  - **Files:** `admiral/bin/brain_record`
  - **Size:** M
  - **Spec ref:** level1-spec.md — Contradiction Detection

- [ ] **B-05: Brain entry consolidation**
  - **Description:** Create `brain_consolidate` utility to merge or synthesize old entries with overlapping topics. Identify entries with high keyword overlap within the same project, present consolidation candidates, and allow merging into a single entry that preserves provenance (original entry IDs, timestamps, and source agents recorded in metadata).
  - **Done when:** `brain_consolidate` identifies redundant entries, produces merged entries with full provenance chain, and archives (not deletes) originals to `.brain/_archived/`.
  - **Files:** `admiral/bin/brain_consolidate` (new)
  - **Size:** M
  - **Spec ref:** level1-spec.md — Knowledge Maintenance

- [ ] **B-06: Brain B1 comprehensive tests**
  - **Description:** End-to-end test suite for all B1 brain utilities: `brain_query`, `brain_record`, `brain_retrieve`, `brain_audit`, `brain_consolidate`, and `brain_writer.sh`. Cover CRUD operations, edge cases (empty brain, special characters in titles, very long content), category validation, demand signal recording, contradiction detection, and concurrent access (two parallel `brain_record` calls should not corrupt data).
  - **Done when:** 20+ tests covering all utilities; all tests pass; concurrent access tested; edge cases for empty brain, invalid inputs, and large entries covered.
  - **Files:** `admiral/tests/test_brain_b1.sh` (new)
  - **Size:** M
  - **Spec ref:** level1-spec.md — Testing Requirements

---

### 8.2 B2 Implementation (SQLite Brain)

- [ ] **B-07: SQLite schema creation**
  - **Description:** Create SQLite schema matching level2-spec.md: `entries` table (id, project, category, title, content, source_agent, created_at, updated_at, superseded_by), `links` table (source_id, target_id, link_type, created_at), `embeddings` table (entry_id, vector BLOB, model_version), `demand_signals` table (query, project, timestamp, agent). Include versioned migration system so schema can evolve without data loss.
  - **Done when:** Schema created and loadable; migration script tracks version; schema matches spec-defined tables; indexes on project, category, created_at.
  - **Files:** `admiral/brain/b2/schema.sql` (new), `admiral/brain/b2/migrate.sh` (new)
  - **Size:** M
  - **Spec ref:** level2-spec.md — Schema Definition

- [ ] **B-08: Entry migration from B1 to B2**
  - **Description:** Script to import all `.brain/` JSON files into the SQLite database. Parse each JSON entry, validate required fields, insert into `entries` table. Migrate demand signals from `.brain/_demand/`. Generate migration report showing counts, skipped entries (with reasons), and validation warnings.
  - **Done when:** All B1 entries migrated with metadata preserved; migration is idempotent (re-running doesn't duplicate); report generated showing migration results.
  - **Files:** `admiral/brain/b2/migrate_from_b1.sh` (new)
  - **Size:** M
  - **Spec ref:** level2-spec.md — Migration Path

- [ ] **B-09: SQLite-based query interface**
  - **Description:** Replace grep-based `brain_query` with SQL queries against the SQLite database. Support keyword search (FTS5 full-text search), date range filtering (`--since`, `--until`), category filter, project filter, and result limiting. Maintain backward-compatible CLI interface so existing hooks and scripts continue to work.
  - **Done when:** Queries return results in <100ms for 1000+ entries; FTS5 index created; CLI interface backward-compatible with B1 `brain_query`; all existing query patterns still work.
  - **Files:** `admiral/brain/b2/query.sh` (new), `admiral/bin/brain_query` (updated to dispatch to B2 when SQLite DB exists)
  - **Size:** M
  - **Spec ref:** level2-spec.md — Query Interface

- [ ] **B-10: Embedding generation pipeline**
  - **Description:** Generate embeddings for semantic search. Support pluggable embedding backends: external API (OpenAI, local model server) or pre-computed vectors stored at build time. Core brain must not require runtime API access — offline mode uses pre-computed embeddings only. Store embeddings in the `embeddings` table with model version tracking for re-generation when models change.
  - **Done when:** Entries have embeddings stored in SQLite; embedding generation works with at least one backend; model version tracked; re-embedding on model change supported.
  - **Files:** `admiral/brain/b2/embed.sh` (new), `admiral/brain/b2/schema.sql` (embeddings table)
  - **Size:** L
  - **Spec ref:** level2-spec.md — Semantic Layer

- [ ] **B-11: Similarity search implementation**
  - **Description:** Vector similarity search using cosine distance computed in SQLite (custom function or application-side). Support `brain_query --semantic "topic"` that returns entries ranked by embedding similarity. Blend with keyword results when both signals available (keyword match boosts ranking).
  - **Done when:** `brain_query --semantic "topic"` returns relevant entries ranked by similarity; results blend keyword and semantic signals when both available; performance acceptable for 1000+ entries.
  - **Files:** `admiral/brain/b2/search.sh` (new), `admiral/bin/brain_query` (updated)
  - **Size:** L
  - **Spec ref:** level2-spec.md — Semantic Search

---

### 8.3 B3 Implementation (Production Brain)

- [ ] **B-12: MCP server scaffold**
  - **Description:** Create MCP (Model Context Protocol) server exposing 8 tool endpoints: `brain_record`, `brain_query`, `brain_retrieve`, `brain_strengthen` (increase entry confidence), `brain_supersede` (mark entry as replaced), `brain_status` (health and stats), `brain_audit` (compliance reporting), `brain_purge` (controlled deletion with audit trail). Server should start, register tools, handle basic request/response lifecycle.
  - **Done when:** Server starts and binds to configured port/socket; all 8 tools registered and discoverable via MCP protocol; basic request/response works for at least `brain_status` and `brain_query`; health check endpoint responds.
  - **Files:** `admiral/brain/b3/mcp-server/` (new directory), `admiral/brain/b3/mcp-server/index.ts` (new), `admiral/brain/b3/mcp-server/tools/` (new)
  - **Size:** L
  - **Spec ref:** level3-spec.md — MCP Interface

- [ ] **B-13: Postgres + pgvector schema deployment**
  - **Description:** Deploy production schema using Postgres with pgvector extension for native vector similarity search. Adapt from `aiStrat/brain/schema/001_initial.sql` and `002_data_ecosystem.sql` if they exist, or create from level3-spec.md. Include migration tracking, rollback capability, and connection pooling configuration.
  - **Done when:** Schema deployed to Postgres; pgvector extension enabled; migrations tracked and reversible; connection pooling configured; schema matches level3-spec.md requirements.
  - **Files:** `admiral/brain/b3/schema/` (new), `admiral/brain/b3/deploy.sh` (new)
  - **Size:** M
  - **Spec ref:** level3-spec.md — Storage Layer

- [ ] **B-14: Identity token lifecycle**
  - **Description:** Create, rotate, and revoke identity tokens for brain access. Each agent instance gets a unique token scoped to its role and project. Tokens have configurable TTL, support rotation without downtime (overlapping validity window), and revocation propagates immediately. Token format includes agent identity, clearance level, project scope, and expiry.
  - **Done when:** Token CRUD operations work; expired tokens rejected with clear error; rotation produces new token while old remains valid for grace period; revoked tokens immediately rejected; token metadata queryable for audit.
  - **Files:** `admiral/brain/b3/identity.ts` (new)
  - **Size:** L
  - **Spec ref:** level3-spec.md — Identity and Authentication

- [ ] **B-15: Access control enforcement**
  - **Description:** Per-agent, per-entry access control. Agents can only read entries at or below their clearance level. Write access scoped to agent's authorized projects. Admin operations (purge, supersede) restricted to elevated roles. Access decisions logged for audit trail.
  - **Done when:** Unauthorized read access returns 403 with reason; write access enforced per project scope; admin operations restricted; access control decisions logged; at least 3 clearance levels functional (read-only, contributor, admin).
  - **Files:** `admiral/brain/b3/access-control.ts` (new)
  - **Size:** L
  - **Spec ref:** level3-spec.md — Authorization

- [ ] **B-16: Multi-signal retrieval pipeline**
  - **Description:** Combine keyword (FTS), semantic (pgvector cosine similarity), temporal (recency boost), and link-based (graph proximity) signals for comprehensive retrieval. Each signal produces a scored result set; a fusion layer combines scores with configurable weights. Support query-time signal selection (e.g., `--signals keyword,semantic` to disable temporal/link).
  - **Done when:** Queries use multiple signals; results ranked by combined relevance score; signal weights configurable; query-time signal selection works; retrieval quality measurably better than single-signal.
  - **Files:** `admiral/brain/b3/retrieval.ts` (new)
  - **Size:** L
  - **Spec ref:** level3-spec.md — Multi-Signal Retrieval

- [ ] **B-17: Multi-hop link traversal**
  - **Description:** Navigate knowledge graph connections across entries. Given an entry, traverse `links` relationships (supports, contradicts, supersedes, related_to) to find connected knowledge up to N hops away. Support configurable depth limit, link-type filtering, and cycle detection. Results include traversal path for explainability.
  - **Done when:** Can traverse 2+ hops to find related knowledge; cycle detection prevents infinite loops; link-type filtering works; traversal path included in results; performance acceptable for graphs with 1000+ entries and 5000+ links.
  - **Files:** `admiral/brain/b3/graph.ts` (new)
  - **Size:** L
  - **Spec ref:** level3-spec.md — Knowledge Graph

- [ ] **B-18: Quarantine integration**
  - **Description:** Vet external intelligence through the 5-layer quarantine pipeline (already implemented in `admiral/monitor/quarantine/`) before brain ingestion. External content (from web, APIs, or untrusted agents) must pass all quarantine layers before being stored as brain entries. Quarantined entries get a `quarantine_status` metadata field tracking pipeline results.
  - **Done when:** External content passes quarantine pipeline before storage; quarantine results recorded in entry metadata; failed quarantine prevents entry creation with clear rejection reason; integration tested with existing quarantine test corpus (`attack_corpus.json`).
  - **Files:** `admiral/brain/b3/quarantine-bridge.ts` (new), `admiral/monitor/quarantine/quarantine_pipeline.sh`
  - **Size:** M
  - **Spec ref:** level3-spec.md — External Intelligence Vetting

- [ ] **B-19: Sensitivity classification**
  - **Description:** Classify entries by sensitivity level: public (shareable externally), internal (within organization), confidential (restricted teams), restricted (named individuals only). Classification can be set at creation or updated later. Queries automatically filter results by the requesting agent's maximum sensitivity clearance. Bulk reclassification supported for policy changes.
  - **Done when:** All entries have sensitivity labels (default: internal); queries respect classification — agents never see entries above their clearance; bulk reclassification works; sensitivity changes logged in audit trail.
  - **Files:** `admiral/brain/b3/sensitivity.ts` (new)
  - **Size:** M
  - **Spec ref:** level3-spec.md — Information Classification

- [ ] **B-20: Audit logging**
  - **Description:** Log all brain operations (reads, writes, searches, deletions, access denials, token operations) to an append-only audit log. Each log entry includes timestamp, agent identity, operation type, affected entry IDs, result (success/failure), and request metadata. Audit log queryable by time range, agent, operation type, and entry ID.
  - **Done when:** Complete audit trail in queryable format; all operation types logged; audit log is append-only (no modification or deletion of audit records); query interface supports filtering by time, agent, operation, and entry; retention policy configurable.
  - **Files:** `admiral/brain/b3/audit.ts` (new)
  - **Size:** M
  - **Spec ref:** level3-spec.md — Compliance and Audit

---

### 8.4 Brain Graduation Criteria

- [ ] **B-21: Graduation measurement system**
  - **Description:** Automated measurement of spec-defined graduation criteria for each brain level. B1-to-B2 graduation: hit rate >= 85% (queries that return useful results), precision >= 90% (returned results are relevant), entry count >= 50. B2-to-B3 graduation: reuse rate >= 30% (entries queried more than once), >= 5% improvement in agent task completion over baseline, semantic search precision >= 80%. Metrics collected per-session, aggregated over rolling 7-day window. Dashboard endpoint in control plane shows graduation readiness with per-criterion pass/fail.
  - **Done when:** Metrics collected per-session automatically; dashboard in control plane shows graduation readiness with per-criterion status; graduation thresholds configurable; historical trend data retained for at least 30 days.
  - **Files:** `admiral/brain/graduation-metrics.sh` (new), `control-plane/src/server.ts`
  - **Size:** L
  - **Spec ref:** level1-spec.md, level2-spec.md — Graduation Criteria

---

### Stream 8 Summary

| Phase | Tasks | Sizes | Estimated Effort |
|-------|-------|-------|-----------------|
| B1 Completion | B-01 through B-06 | 1S + 5M | ~6 sessions |
| B2 Implementation | B-07 through B-11 | 3M + 2L | ~7 sessions |
| B3 Implementation | B-12 through B-20 | 4L + 5M | ~14 sessions |
| Graduation | B-21 | 1L | ~2 sessions |
| **Total** | **21 tasks** | **1S + 13M + 7L** | **~29 sessions** |

**Critical path:** B-01 through B-06 (B1 completion) -> B-21 graduation metrics -> B-07 through B-11 (B2) -> B-21 validates B2 graduation -> B-12 through B-20 (B3). The graduation measurement system (B-21) should be built early so it can measure B1 and validate readiness for B2 transition.

**Parallelism opportunities:** Within B1, B-03 (demand signals) and B-04 (contradiction scan) are independent. Within B3, B-14/B-15 (identity/access) are independent of B-16/B-17 (retrieval/graph). B-18 (quarantine integration) depends on B-12 (MCP scaffold) but not on B-14/B-15.
## Stream 9: Strategic Positioning & Standards Alignment

> *"If you want to be adopted by enterprises, speak their language. Map your capabilities to the frameworks they already use." — Enterprise adoption pattern*

The Admiral Framework needs industry alignment to be recognized by enterprises and regulators. These items create crosswalks, mappings, and positioning documents that translate Admiral's capabilities into the vocabulary of established governance frameworks, regulatory bodies, and strategic consultancies. Each deliverable makes Admiral legible to a different audience — security teams (OWASP, NIST), analysts (Forrester, McKinsey), regulators (Singapore IMDA), and enterprise buyers (AI Work OS positioning).

- [ ] **R-01: OWASP Agentic Top 10 Crosswalk**
  - **Description:** Map each OWASP agentic risk to Admiral failure modes and defenses (Standing Orders, hooks). For every risk in the OWASP Agentic Top 10, identify the specific Standing Order clauses, hook implementations, and architectural decisions that mitigate it. Where gaps exist, document them honestly and reference planned remediation items.
  - **Done when:** Complete mapping with specific SO and hook references for each risk. Every OWASP agentic risk has at least one Admiral defense documented. Gap analysis included for any partially-covered risks.
  - **Files:** `docs/compliance/owasp-agentic-mapping.md` (new)
  - **Size:** M

- [ ] **R-02: Forrester AEGIS Framework Alignment**
  - **Description:** Map Admiral to the Forrester AEGIS framework's 6 domains and 39 controls. Produce a crosswalk document that claims "AEGIS-compatible" status with evidence. For each domain, calculate a coverage percentage based on how many controls Admiral satisfies fully, partially, or not at all.
  - **Done when:** Crosswalk document with coverage percentage per domain. All 39 controls addressed with current status (full/partial/planned). Overall coverage summary suitable for enterprise procurement review.
  - **Files:** `docs/compliance/aegis-crosswalk.md` (new)
  - **Size:** L

- [ ] **R-03: KPMG TACO Framework Tagging**
  - **Description:** Tag all 71 agent roles defined in the Admiral spec with KPMG TACO categories (Taskers, Automators, Collaborators, Orchestrators). This classification makes Admiral's agent taxonomy immediately legible to consulting teams performing AI maturity assessments.
  - **Done when:** Every agent role has a TACO classification. Summary statistics show distribution across categories. Classification rationale documented for non-obvious assignments.
  - **Files:** `docs/compliance/taco-tagging.md` (new)
  - **Size:** M

- [ ] **R-04: NIST Zero Trust Alignment**
  - **Description:** Map Admiral identity tokens and access control mechanisms to NIST SP 800-207 (Zero Trust Architecture) and SPIFFE/SPIRE identity concepts. Show how Admiral's agent identity model, tool authorization, and session-scoped permissions align with zero trust principles of "never trust, always verify."
  - **Done when:** Explicit references to NIST SP 800-207 sections in security documentation. Mapping between Admiral identity primitives and SPIFFE/SPIRE concepts. Clear articulation of where Admiral enforces zero trust and where traditional trust boundaries remain.
  - **Files:** `docs/compliance/nist-zero-trust.md` (new)
  - **Size:** M

- [ ] **R-05: McKinsey Agentic Organization Mapping**
  - **Description:** Map Admiral's 11 spec parts to McKinsey's 5 pillars of the Agentic Organization. Demonstrate that Admiral's governance agents correspond to McKinsey's concept of embedded control agents. This mapping positions Admiral as a concrete implementation of McKinsey's strategic vision.
  - **Done when:** Visual mapping with detailed explanations connecting each Admiral spec part to McKinsey pillars. Narrative showing Admiral governance agents as the realization of McKinsey's embedded control agents concept. Suitable for executive presentation.
  - **Files:** `docs/compliance/mckinsey-mapping.md` (new)
  - **Size:** M

- [ ] **R-06: Singapore IMDA Regulatory Alignment**
  - **Description:** Document how Admiral satisfies Singapore's IMDA AI governance framework requirements. Establish specific equivalences: Tool & Capability Registry maps to IMDA's "action-space" concept, Decision Authority Tiers map to "autonomy levels." Singapore is a leading AI regulatory jurisdiction, making this alignment valuable for APAC enterprise adoption.
  - **Done when:** Regulatory compliance document ready for enterprise review. Each IMDA requirement mapped to Admiral implementation. Document suitable for submission during procurement compliance review in Singapore-regulated industries.
  - **Files:** `docs/compliance/imda-alignment.md` (new)
  - **Size:** M

- [ ] **R-07: AI Work OS Positioning Document**
  - **Description:** Reframe Admiral from "governance tool" to "operating system for AI work." Construct a detailed metaphor mapping Admiral concepts to OS concepts: hook execution as process scheduling, Standing Orders as kernel policy, brain layers as memory hierarchy, identity tokens as security principals, tool registry as device drivers, event log as syslog, IPC as inter-agent messaging, and state files as filesystem storage. This reframing shifts Admiral from a compliance cost to an infrastructure investment.
  - **Done when:** Positioning document with clear narrative arc. Complete OS-to-Admiral concept mapping table. Executive summary suitable for pitch decks. Technical depth suitable for engineering leadership buy-in.
  - **Files:** `docs/strategy/ai-work-os-positioning.md` (new)
  - **Size:** L

---

## Stream 10: Exemplary Codebase — Beyond 10/10

> *"The difference between a good codebase and a legendary one is that the legendary one anticipated the questions you haven't asked yet." — Engineering excellence*

These items transform homebase from "well-built" into "a reference implementation that others study and emulate." Each item draws inspiration from legendary engineering practices — FoundationDB's simulation testing, Netflix's chaos engineering, FastAPI's auto-documentation — and applies them to the Admiral context. The goal is a codebase that does not merely work but demonstrates how agentic governance infrastructure should be built.

- [ ] **X-01: Deterministic Simulation Testing**
  - **Description:** Create a simulation harness that replays recorded hook sequences and verifies deterministic outcomes. Feed the same input and get the same output, every time. Record real hook invocation sequences during test sessions, then replay them through the hook pipeline to verify that state transitions, brain entries, and output are byte-identical across runs.
  - **Done when:** Simulation replays 10+ recorded sequences deterministically. Any non-determinism (timestamps, random values) is identified and normalized. Replay failures produce clear diffs showing divergence point.
  - **Files:** `admiral/simulation/replay.sh` (new), `admiral/simulation/recordings/` (new)
  - **Size:** L
  - **Inspired by:** FoundationDB trillion-CPU-hour simulation

- [ ] **X-02: Chaos Testing for Hooks**
  - **Description:** Randomly inject failures into the hook execution environment: missing `jq`, corrupted state file, huge payloads (1MB+), slow disk (simulated via sleep), concurrent hook execution, read-only filesystem, missing environment variables, and malformed JSON input. Verify that every hook fails open per ADR-004 — no hook failure should block the developer's workflow.
  - **Done when:** Chaos suite runs 20+ failure scenarios, all hooks survive gracefully. Each scenario documents the failure mode, expected behavior, and actual behavior. No hook causes Claude Code to hang or crash under any chaos condition.
  - **Files:** `admiral/tests/chaos/chaos_runner.sh` (new), `admiral/tests/chaos/scenarios/` (new)
  - **Size:** L
  - **Inspired by:** Netflix Chaos Monkey

- [ ] **X-03: End-to-End Claude Code Session Simulation**
  - **Description:** Simulate a complete Claude Code session lifecycle: SessionStart hook fires, followed by 50+ PreToolUse/PostToolUse cycles across diverse tool types (Bash, Read, Write, Edit, Grep), then session end. Verify state progression is consistent, token tracking accumulates correctly, loop detection triggers at the right thresholds, and brain entries are written and readable throughout.
  - **Done when:** Full session simulation passes with consistent state throughout. Token counts are accurate. Loop detection fires when expected. Brain entries persist correctly across the simulated session. State file never becomes corrupted.
  - **Files:** `admiral/tests/test_e2e_session.sh` (new)
  - **Size:** L
  - **Inspired by:** Integration testing best practice

- [ ] **X-04: Hook Execution Profiling**
  - **Description:** Measure and visualize hook execution timing and call chains. Instrument each hook to record start time, end time, and subprocess calls. Identify bottlenecks where hook latency impacts developer experience. Produce a timing report showing p50, p95, and p99 execution times per hook type.
  - **Done when:** Profiler produces timing report per hook. Bottlenecks identified with specific recommendations. Report includes historical comparison capability to detect performance regressions.
  - **Files:** `admiral/benchmarks/hook_profiler.sh` (new)
  - **Size:** M
  - **Inspired by:** Performance engineering

- [ ] **X-05: Implement Sentinel Governance Agent**
  - **Description:** Build the first non-Claude-Code governed agent. Sentinel monitors other agents for loops, budget violations, and scope drift. It reads the unified event log, applies governance rules from Standing Orders, and can intervene by flagging issues or escalating to human operators. This is the reference implementation of Part 10 (Meta-Agent Governance) from the Admiral spec.
  - **Done when:** Sentinel observes and intervenes on governed agent issues. Demonstrated detection of at least three governance violation types: infinite loops, budget overruns, and scope drift. Intervention actions are logged and auditable.
  - **Files:** `admiral/agents/sentinel/` (new)
  - **Size:** L
  - **Inspired by:** Meta-agent governance spec (Part 10)

- [ ] **X-06: Implement Triage Router Agent**
  - **Description:** Build a routing agent that receives incoming tasks and assigns them to appropriate agents based on task type, agent capabilities, current load, and agent availability. This is the reference implementation of Part 3 (Fleet Composition) from the Admiral spec, demonstrating multi-agent coordination in practice.
  - **Done when:** Router correctly assigns tasks in test scenarios covering at least 5 different task types. Routing decisions are logged with rationale. Fallback behavior works when preferred agent is unavailable.
  - **Files:** `admiral/agents/triage-router/` (new)
  - **Size:** L
  - **Inspired by:** Fleet composition spec (Part 3)

- [ ] **X-07: Cross-System Unified Event Log**
  - **Description:** Establish a single JSONL event log that both the shell-based hook system and the TypeScript control plane can write to and query. Events from hook executions, state transitions, brain writes, and control plane API calls all flow into one stream. This enables unified observability across the entire Admiral stack.
  - **Done when:** Events from both systems visible in a single log. Query interface supports filtering by source, event type, time range, and session ID. Dashboard or CLI tool can render a unified timeline of a session's events.
  - **Files:** `admiral/lib/event_log.sh` (new), `control-plane/src/ingest.ts`
  - **Size:** L
  - **Inspired by:** Unified observability

- [ ] **X-08: Automated API Documentation Generation**
  - **Description:** Generate `API.md` directly from `server.ts` route definitions using TypeScript AST parsing or runtime introspection. Extract route paths, HTTP methods, request/response types, and handler documentation. Ensure API docs never drift from the actual implementation.
  - **Done when:** API docs stay in sync with code automatically. CI step verifies generated docs match committed docs. Any route change without corresponding doc update fails the build.
  - **Files:** `control-plane/scripts/gen-api-docs.ts` (new)
  - **Size:** M
  - **Inspired by:** FastAPI auto-docs

- [ ] **X-09: Dependency License Audit in CI**
  - **Description:** Add a CI step that scans all project dependencies (npm packages, referenced tools) and verifies license compatibility. Flag any dependency with a license incompatible with the project's license. Prevent accidental introduction of GPL or other copyleft dependencies into an MIT/Apache-licensed project.
  - **Done when:** CI fails on incompatible licenses. License report generated as build artifact. Allowlist mechanism exists for manually-reviewed exceptions.
  - **Files:** `.github/workflows/control-plane-ci.yml`
  - **Size:** S

- [ ] **X-10: Reproducible Build Verification**
  - **Description:** Verify that TypeScript builds are deterministic — the same source input produces byte-identical compiled output. Run the build twice in CI and compare artifacts. Non-deterministic builds undermine trust in the supply chain and make it impossible to verify that a deployed artifact matches its source.
  - **Done when:** Two consecutive builds produce byte-identical artifacts. CI step automates this verification. Any non-determinism is documented and either fixed or explicitly accepted with rationale.
  - **Files:** `.github/workflows/control-plane-ci.yml`
  - **Size:** S

- [ ] **X-11: Architecture Visualization**
  - **Description:** Auto-generate architecture diagrams from codebase structure. Produce diagrams showing hook flow (which hooks call which libraries), event flow (how events propagate from hooks through the event log to the control plane), and brain layers (how context flows from standing orders through session state to tool-level decisions). Use a text-based diagram format (Mermaid or similar) that can be version-controlled.
  - **Done when:** Diagrams generated and committed to `docs/architecture/`. Generation script runs in CI to detect drift. Diagrams cover at least three views: hook flow, event flow, and brain layer hierarchy.
  - **Files:** `docs/architecture/` (new), generation script
  - **Size:** M
  - **Inspired by:** Visual documentation

- [ ] **X-12: Contribution Complexity Analyzer**
  - **Description:** Build a script that classifies areas of the codebase by contribution difficulty. Analyze file complexity (lines of code, cyclomatic complexity), test coverage, number of dependencies, and historical change frequency. Automatically generate a list of "good first issue" candidates — files or modules that are low-complexity, well-tested, and relatively isolated.
  - **Done when:** Script generates a ranked list of easy-to-contribute areas. Output includes rationale for each recommendation. Results can be used to auto-label GitHub issues with difficulty tags.
  - **Files:** `admiral/scripts/contribution-analyzer.sh` (new)
  - **Size:** M
  - **Inspired by:** Open-source contributor experience
## Execution Guide

### Item Count Summary

| Stream | Items | Size Distribution |
|---|---|---|
| Stream 1: Testing | T-01 to T-14 (14 items) | 4S, 6M, 4L |
| Stream 2: Code Quality | Q-01 to Q-08 (8 items) | 2S, 3M, 3L |
| Stream 3: Architecture | A-01 to A-07 (7 items) | 1S, 2M, 4L |
| Stream 4: Documentation | D-01 to D-12 (12 items) | 5S, 3M, 4L |
| Stream 5: CI/CD | C-01 to C-09 (9 items) | 4S, 3M, 2L |
| Stream 6: Self-Enforcement | P-01 to P-06 (6 items) | 0S, 4M, 2L |
| Stream 7: Spec Implementation | S-01 to S-30 (30 items) | 1S, 13M, 16L |
| Stream 8: Brain System | B-01 to B-21 (21 items) | 1S, 10M, 10L |
| Stream 9: Strategic Positioning | R-01 to R-07 (7 items) | 0S, 5M, 2L |
| Stream 10: Exemplary Codebase | X-01 to X-12 (12 items) | 2S, 3M, 7L |
| **Total** | **126 items** | **20S, 52M, 54L** |

### How to Use This Plan Across Sessions

1. **Pick a stream.** Each stream is mostly independent. Streams 1-6 are "quality" focused. Streams 7-8 are "spec implementation" focused. Streams 9-10 are "strategic" focused.
2. **Pick an item.** Items within a stream are roughly priority-ordered (top = highest priority). Check dependencies below.
3. **Check the box.** When complete, change `[ ]` to `[x]` and add date.
4. **Update the score.** After completing items, re-assess the Current Score table.
5. **Commit PLAN.md changes.** Keep this as the living roadmap.

### Critical Path: Recommended Priority Order

**Phase 1: Foundation (Sessions 1-4) — Quality baseline**
1. T-01 through T-04 — Unit tests for untested modules (biggest coverage impact)
2. Q-01, Q-02 — Standardize hooks (biggest consistency impact)
3. T-09, C-01 — Coverage enforcement (biggest enforcement impact)
4. D-01, D-02, D-03 — Documentation quick wins (ADMIRAL_STYLE, CoC, LICENSE)

**Phase 2: Self-Enforcement (Sessions 5-7) — Eat our own dog food**
5. Q-05, Q-06, Q-08 — TypeScript quality (typed errors, routing)
6. A-01, A-04, A-06 — Schema validation, dep checker, state validation
7. P-01, P-02, P-05 — Self-enforcement hooks

**Phase 3: Spec Gaps — Critical (Sessions 8-12) — Close the spec-to-code gap**
8. S-01 through S-04 — Missing hooks (identity, tier, heartbeat, protocol)
9. S-05 — Standing Orders enforcement map
10. B-01, B-02, B-03 — Brain B1 completion (auto-record, retrieval, demand signals)
11. S-10, S-11 — Handoff + escalation pipeline
12. S-06, S-07 — Agent registry + task routing

**Phase 4: Robustness (Sessions 13-16) — Edge cases and hardening**
13. T-05, T-06, T-07 — Edge case testing
14. S-20, S-22 — Security hardening (data sensitivity, audit trail)
15. A-02, A-07 — Hook/control-plane bridge, unified event log
16. C-02, C-03, C-04 — CI matrix, security scanning, integration tests

**Phase 5: Performance & Observability (Sessions 17-19)**
17. T-11, T-12, T-13 — Benchmarks
18. S-15, S-16, S-17 — Alerting, persistent store, health check
19. C-05 — Benchmark regression detection

**Phase 6: Brain Evolution (Sessions 20-24)**
20. B-06 — Brain B1 comprehensive tests
21. B-07 through B-09 — Brain B2 core (schema, migration, query)
22. B-10, B-11 — Brain B2 semantic (embeddings, similarity)
23. B-12, B-13 — Brain B3 scaffold (MCP server, schema)
24. B-14 through B-20 — Brain B3 features

**Phase 7: Strategic & Excellence (Sessions 25-30)**
25. R-01, R-04 — OWASP and NIST alignment (highest enterprise value)
26. R-02, R-03, R-05, R-06 — Remaining compliance crosswalks
27. R-07 — AI Work OS positioning
28. X-01, X-02, X-03 — Simulation, chaos, e2e testing
29. X-05, X-06 — Sentinel + Triage Router agents
30. S-23, S-24, S-25 — Meta-governance (Sentinel pattern, authority tracking)

### Dependencies Between Items

```
# Stream 1 dependencies
T-09 (coverage gate) depends on T-01 through T-04 (need tests to measure)
T-11, T-12 (benchmarks) are prerequisites for C-05 (benchmark CI)

# Stream 2 dependencies
Q-01 (jq helpers) should precede Q-02 (error handling) — both refactor hooks
Q-06 (typed errors) should precede Q-08 (routing) — both refactor server.ts

# Stream 3 dependencies
A-01 (schema validation) should precede A-02 (bridge) and A-06 (state schema)
A-05 (config consolidation) should precede S-06 (fleet registry)

# Stream 6 dependencies
P-01 (test discipline) depends on T-09 (coverage gate)
P-03 (meta-test) depends on A-02 (bridge) and T-06 (hook edge cases)
P-04 (quality dashboard) depends on T-11, T-12 (benchmarks) and T-10 (coverage badge)

# Stream 7 dependencies
S-01 through S-04 (missing hooks) can be done independently
S-05 (enforcement map) should precede S-23 (sentinel) — need map to know what to govern
S-06 (registry) should precede S-07 (routing) — need registry to route
S-10 (handoff) should precede S-12 (parallel coordinator) — need handoff for coordination
S-11 (escalation) depends on B-02 (brain retrieval) — escalation queries Brain for precedent
S-20, S-21 (data sensitivity) should precede B-12 (MCP server) — brain needs PII guards

# Stream 8 dependencies
B-01 through B-06 (B1 completion) before B-07 (B2 start)
B-07 through B-11 (B2 complete) before B-12 (B3 start)
B-21 (graduation metrics) depends on B-06 (B1 tests) and B-11 (B2 similarity)

# Stream 9 dependencies
R-01 (OWASP) can be done independently (references existing hooks/SOs)
R-04 (NIST) should follow S-20 (data sensitivity) for concrete references
R-07 (AI Work OS) should be last — needs implementation depth to back up claims

# Stream 10 dependencies
X-01 (simulation) depends on A-01 (schema validation) — needs validated payloads
X-02 (chaos) depends on T-06 (edge cases) — chaos extends edge case thinking
X-03 (e2e session) depends on S-01 through S-04 (all hooks exist)
X-05 (sentinel) depends on S-23 (sentinel pattern) — meta-governance prerequisite
X-06 (triage router) depends on S-06 (registry) and S-07 (routing)
X-07 (unified event log) is same as A-07 — deduplicate
```

### Definition of Done: 10/10

The codebase is 10/10 when:
- [ ] All 126 items in this plan are marked `[x]`
- [ ] Current Score table shows 9+ in every dimension
- [ ] A new contributor can set up, understand, and contribute in under 30 minutes
- [ ] The hook directory is the most tested code in the repository
- [ ] Every CI check passes on both Linux and macOS
- [ ] Coverage is ≥80% across all TypeScript modules
- [ ] Every hook has a dedicated test and edge case tests
- [ ] Every design decision has an ADR
- [ ] The project's quality is visible (badges, dashboard, published benchmarks)
- [ ] Admiral enforces its own quality standards through its own hooks
- [ ] Brain B1 is fully operational with automatic recording and retrieval
- [ ] All 15 spec-defined hooks are implemented and tested
- [ ] Fleet orchestration handles at least 3 agent roles
- [ ] Standing Orders enforcement map is 100% complete
- [ ] At least 3 compliance crosswalk documents are published
- [ ] Security audit trail captures all enforcement events
- [ ] Escalation pipeline handles structured escalation flow

---

## References

- [research/pristine-github-repositories.md](research/pristine-github-repositories.md) — Catalog of pristine codebases and patterns
- [research/pristine-repos-gap-analysis.md](research/pristine-repos-gap-analysis.md) — Gap analysis against pristine patterns
- [research/product-strategy-ai-work-os.md](research/product-strategy-ai-work-os.md) — AI Work OS positioning strategy
- [research/competitive-positioning-strategy.md](research/competitive-positioning-strategy.md) — Competitive and regulatory alignment
- [docs/adr/005-codebase-review-2026-03.md](docs/adr/005-codebase-review-2026-03.md) — Independent codebase quality audit
- [admiral/IMPLEMENTATION_STATUS.md](admiral/IMPLEMENTATION_STATUS.md) — Spec-to-implementation tracking
- [admiral/SPEC-DEBT-NEXT-STEPS.md](admiral/SPEC-DEBT-NEXT-STEPS.md) — Spec debt resolution
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contributor guide
- [AGENTS.md](AGENTS.md) — Agent governance and decision authority
- [aiStrat/admiral/reference/spec-debt.md](aiStrat/admiral/reference/spec-debt.md) — Specification debt tracking
