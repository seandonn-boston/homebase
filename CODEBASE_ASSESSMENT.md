# Codebase Assessment — Helm

**Date:** 2026-03-20
**Scope:** Full repository analysis covering architecture, code quality, testing, CI/CD, and documentation.

---

## Executive Summary

Helm is a well-architected monorepo implementing the Admiral Framework for AI agent fleet governance. The codebase demonstrates strong engineering principles — zero runtime dependencies, deterministic enforcement via hooks, comprehensive specification documents, and thoughtful separation of concerns. It is in alpha stage with a solid foundation but has identifiable gaps in concurrency testing, CI enforcement, and some areas of code duplication.

**Overall Score: 7.5/10** — Production-capable core with alpha-stage rough edges.

| Category | Score | Summary |
|----------|-------|---------|
| Architecture & Design | 8.5/10 | Clean separation, strong governance model |
| TypeScript Code Quality | 7.8/10 | Strict typing, zero deps, minor duplication |
| Bash Hook Quality | 8.0/10 | Fail-open design, good security patterns |
| Test Coverage | 7.0/10 | Strong unit tests, weak integration/concurrency |
| CI/CD Pipeline | 6.5/10 | Functional but missing enforcement gates |
| Documentation | 9.0/10 | Exceptionally thorough specification and research |
| Security Posture | 8.0/10 | Input validation, scope enforcement, no critical issues |

---

## 1. Architecture & Design (8.5/10)

### Strengths

- **Seven-component architecture** (Brain, Fleet, Enforcement, Control Plane, Security, Protocols, Data Ecosystem) scales independently — well-decomposed.
- **Zero runtime dependency policy** in the control plane is rare and excellently executed. Only Node.js built-ins (`fs`, `http`, `path`) are used.
- **Fail-open hook design** — advisory hooks never block execution, enforcement hooks use explicit exit codes (0=pass, 1=soft-fail, 2=hard-block). This prevents governance from becoming a productivity tax.
- **Standing Orders pattern** — 15 behavioral constraints loaded at session start, providing a deterministic behavioral floor for all agents.
- **Decision authority tiers** (Enforced → Autonomous → Propose → Escalate) map cleanly to real organizational governance.

### Concerns

- **RunawayDetector does too much** — configuration management, alert generation, pattern detection, and SPC monitoring in a single 578-line class. Should be split into focused modules.
- **AdmiralServer mixes routing, business logic, and response formatting** (212 lines, monolithic switch statement). A router abstraction would improve testability.
- **Event data uses `Record<string, unknown>`** — intentional flexibility but breaks compile-time type safety. Discriminated unions based on EventType would be stronger.

---

## 2. TypeScript Control Plane (7.8/10)

**~3,100 lines of source code across 9 modules.**

### Strengths

- **Strict TypeScript** (`strict: true` in tsconfig) with no `any` types anywhere in the codebase.
- **Clean module boundaries** — events.ts (storage/notification), trace.ts (tree rendering), ring-buffer.ts (generic data structure), runaway-detector.ts (analysis), instrumentation.ts (API), ingest.ts (I/O), server.ts (HTTP), cli.ts (orchestration).
- **Well-designed public API** — `createAdmiral()` factory returns an `AdmiralInstance` facade. Exports are explicit and curated in `index.ts`.
- **RingBuffer<T>** is a clean generic with O(1) push and proper iterator protocol support.
- **Statistical Process Control (SPC)** implementation is thorough — Western Electric rules, control charts with mean/stddev, configurable sigma limits.

### Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Type assertions bypass safety | Medium | `ingest.ts:161`, `runaway-detector.ts:471` |
| String IDs lack branded types | Medium | AlertId/AgentId are plain strings |
| Promise race condition in onAlert | Medium | `runaway-detector.ts:556-571` — multiple alerts could fire before pause completes |
| Magic numbers | Low | `events.ts:46` (10,000 buffer), `runaway-detector.ts:59` (50,000 token spike) |
| ~30-40 lines of duplication | Low | Event filtering patterns repeated 3x in runaway-detector.ts |
| `emit()` takes 6 positional parameters | Low | `events.ts:64-70` — should use object parameter |

### Top Improvements

1. Create discriminated union types for event data payloads based on EventType
2. Add branded types for IDs (`type AlertId = string & { readonly __brand: unique symbol }`)
3. Extract RunawayDetector into focused sub-modules (detection, alerting, SPC)
4. Separate AdmiralServer routing from business logic
5. Enforce async consistency on `onAlert` callback

---

## 3. Bash Hook System (8.0/10)

**~3,800 lines across 14 hooks, 6 utilities, 2 libraries, 5 test suites.**

### Strengths

- **Consistent `set -euo pipefail`** across all scripts.
- **Structured JSON output** — hooks emit JSON for machine parsing, with `hook_state` persistence.
- **Comprehensive security patterns** — privilege escalation detection (sudo, chmod 777, setuid), secret scanning (API keys, SSNs, credit cards), scope boundary enforcement.
- **Heredoc-aware detection** — false positive regression tests verify documentation strings don't trigger enforcement rules.
- **Atomic state writes with flock** — `state.sh` prevents corruption from concurrent access.
- **Shared libraries** (`state.sh`, `standing_orders.sh`) reduce duplication for core operations.

### Issues

| Issue | Severity | Location |
|-------|----------|----------|
| jq output not validated for "null" | Medium | Multiple hooks — `jq -r` can return literal "null" string |
| No emergency escape hatch | Medium | No `ADMIRAL_SKIP_HOOKS=1` env var for recovery |
| ~50+ jq subprocess spawns per tool call | Low-Medium | `brain_context_router.sh:14-28` spawns 5 jq processes per event |
| State file permissions not set | Low | `state.sh:79` — relies on umask, should `chmod 600` |
| Error logs not separated by hook | Low | All hook errors go to single `hook_errors.log` |
| Unquoted parameter expansion | Low | `scope_boundary_guard.sh:65` — could fail with spaces in paths |

### Top Improvements

1. Add `[ "$var" != "null" ]` validation after all `jq -r` extractions
2. Implement `ADMIRAL_SKIP_HOOKS=1` emergency bypass
3. Batch jq invocations (single jq call with multiple output selectors)
4. Extract common patterns (`emit_hook_state_with_alert`, `get_hook_state`) to `state.sh`
5. Add `chmod 600` on state file writes

---

## 4. Test Coverage (7.0/10)

### TypeScript Tests (6 files, ~1,475 lines)

| Component | Estimated Coverage | Quality |
|-----------|--------------------|---------|
| RingBuffer | 95% | Excellent — all paths, stress tests |
| EventStream | 90% | Strong — pub/sub, filtering, immutability |
| ExecutionTrace | 75% | Good — tree building, weak on format validation |
| RunawayDetector / SPC | 70% | Good stats tests, SPC integration is flaky |
| Server | 60% | Endpoints covered, no concurrency/error tests |
| CLI | 30% | Argument parsing only, no execution tests |

**Key strength:** RingBuffer and ControlChart tests are thorough with boundary conditions, stress tests, and mathematical validation.

**Key weakness:** `runaway-detector.test.ts:279-284` has a timing-dependent SPC test with a comment acknowledging it "may or may not fire depending on timing." This is a flaky test.

### Bash Tests (5 suites, ~1,360 lines)

| Suite | Quality | What it covers |
|-------|---------|----------------|
| test_hooks.sh (488 lines) | Excellent | 70+ assertions, false positive regressions |
| test_hook_sequencing.sh (184 lines) | Excellent | Adapter chain composition, fail-fast |
| test_state_persistence.sh (270 lines) | Very Good | Corruption recovery, session boundaries |
| test_escalation_resolution.sh (258 lines) | Very Good | Privileged Escalation Guarantee |
| test_brain_b1.sh (160 lines) | Good | Round-trip record/query/retrieve |

### Critical Test Gaps

1. **No multi-agent scenarios** — integration.test.ts tests single agent only
2. **No concurrency tests** anywhere — race conditions undetected
3. **No stress/performance tests** — 10K event streams, large payloads untested
4. **No CLI e2e tests** — cli.test.ts only tests argument parsing
5. **No hook timeout tests** — hooks could hang indefinitely
6. **No signal handling tests** (SIGINT/SIGTERM)

---

## 5. CI/CD Pipeline (6.5/10)

### What Works

- **4 GitHub Actions workflows** covering control plane, hooks, spec validation, and version bumping.
- **Spec validation is exemplary** — semver checks, JSON/YAML syntax, markdown cross-references, hook manifest schema.
- **Dependency audit** catches supply chain vulnerabilities.
- **ShellCheck** enforces bash code quality.
- **Conventional commit-based version bumping** with automatic tag creation.

### What's Missing

| Gap | Impact |
|-----|--------|
| No coverage threshold enforcement | Coverage reports generated but not gated |
| No coverage reporting to PRs | Can't see coverage impact during review |
| No matrix testing | Only tests one Node.js version |
| No SAST/security scanning | Only dependency audit, no code scanning |
| No test result parsing | Bash tests output exit codes only, not structured reports |
| No artifact storage | No test reports or coverage reports archived |
| No e2e testing in CI | No full system tests (server startup → client connection) |
| ShellCheck doesn't block pre-commit | Runs as warnings only |
| Pre-commit lacks type checking | No `tsc --noEmit` |
| No secret detection in pre-commit | Could commit API keys |

### Top Improvements

1. Enforce coverage threshold (fail CI if < 75%)
2. Add Codecov/Coveralls integration
3. Make ShellCheck failures block commits
4. Add `tsc --noEmit` to pre-commit hook
5. Add Node.js version matrix testing (18, 20, 22)

---

## 6. Documentation (9.0/10)

### Exceptional

- **89 specification documents** in aiStrat/ — comprehensive framework definition covering strategy, enforcement, fleet management, brain architecture, protocols, and extensions.
- **25+ research documents** — competitive landscape analysis, AI model timelines, patent opportunities, governance frameworks survey.
- **AGENTS.md** — clear decision authority tiers, tech stack definition, and operational boundaries.
- **CONTRIBUTING.md** — well-defined development workflow with prerequisites and coding standards.
- **Standing Orders** — 15 formalized behavioral constraints with JSON schema.
- **Architecture Decision Records** in docs/ — preserves decision context.

### Minor Gaps

- No API documentation for the control plane HTTP endpoints (auto-generation from code would help).
- No troubleshooting guide for hook failures.
- Test directories lack README files explaining test scenarios.

---

## 7. Security Posture (8.0/10)

### Strengths

- **Multi-layer scope enforcement** — protected directory lists, path matching, override mechanism with explicit env var.
- **Privilege escalation detection** — sudo, chmod 777, setuid, chown patterns caught.
- **Secret scanning** — API keys, email addresses, SSNs, credit cards, phone numbers.
- **Zero-trust validation** — identity/auth checks on every tool invocation.
- **Fail-open design** — security hooks advise rather than block (except explicit enforcement hooks).
- **No runtime dependencies** — eliminates supply chain attack surface for control plane.
- **Dependency audit in CI** — catches known vulnerabilities.

### Concerns

- No SAST scanning beyond linting.
- No secret detection in pre-commit hook.
- State file permissions rely on umask rather than explicit `chmod`.
- No rate limiting on event log writes (potential disk exhaustion under high volume).

---

## 8. Summary of Top Priority Improvements

### Critical (Do First)

1. **Fix flaky SPC test** — `runaway-detector.test.ts:279-284` uses Date.now(); make deterministic with mock timestamps.
2. **Enforce coverage threshold** in CI — fail builds below 75%.
3. **Add jq output validation** — check for "null" string after all `jq -r` extractions in hooks.
4. **Add multi-agent integration test** — current integration.test.ts only covers single agent.

### High Priority (This Quarter)

5. **Split RunawayDetector** into detection, alerting, and SPC sub-modules.
6. **Add branded types** for AlertId, AgentId, EventId.
7. **Add `ADMIRAL_SKIP_HOOKS=1` emergency bypass** for recovery scenarios.
8. **Batch jq invocations** to reduce subprocess overhead (~50 per tool call).
9. **Add CLI e2e tests** — actual server startup and shutdown.
10. **Add Codecov integration** and coverage reporting to PRs.

### Medium Priority (Next Quarter)

11. Create discriminated union types for event data payloads.
12. Separate AdmiralServer routing from business logic.
13. Add concurrency and stress tests.
14. Add Node.js version matrix testing in CI.
15. Add secret detection to pre-commit hook.

---

*Assessment generated by automated codebase analysis. Scores reflect the current state relative to production readiness for a governance framework.*
