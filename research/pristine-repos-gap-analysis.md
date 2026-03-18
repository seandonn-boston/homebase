# Gap Analysis: Homebase vs. Pristine Repositories

Comparison of the homebase repository against the collective patterns observed in the world's best-engineered open source codebases (SQLite, Redis, Lua, PostgreSQL, CPython, FoundationDB, ripgrep, Go stdlib, etc.).

---

## Summary Scorecard

| Dimension | Pristine Standard | Homebase Current | Gap Severity |
|---|---|---|---|
| Testing | 100% coverage, simulation testing, property-based | 2 test files (TS), 1 bash test script | **Critical** |
| Code Quality Tooling | Linter + formatter + type checker, enforced in CI | Biome configured but no `.biome.json` config file; no pre-commit hooks enforcing it | **High** |
| Architecture | Clean module boundaries, minimal coupling | Good separation (hooks/control-plane/spec) but no interface contracts between layers | **Medium** |
| Documentation | Inline "why" comments, design docs, API docs | Strong high-level docs (README, AGENTS.md), sparse inline comments in hooks | **Medium** |
| Dependency Management | Minimal/zero dependencies | Zero runtime deps (good!), 3 dev deps. No lockfile committed? | **Low-Medium** |
| CI/CD | Build + test + lint + coverage + release | Build + test + lint (no coverage, no hook tests in CI) | **High** |
| Consistency | Uniform style enforced across all code | Mixed: TS is clean; bash hooks vary in style and error handling | **Medium** |
| Error Handling | Principled, consistent patterns | TS: decent. Bash: inconsistent (some fail-open, some fail-closed, not always documented) | **Medium** |
| Git Hygiene | Conventional commits, clean history, signed | Conventional commits (good!), but message discipline varies | **Low** |
| API Design | Clean, minimal, hard to misuse | Internal only; no published API surface yet | **Low** (early stage) |
| Contributor Experience | CONTRIBUTING.md, PR templates, issue templates, CoC | None of these exist | **High** |

---

## Detailed Gap Analysis

### 1. TESTING — Gap: Critical

**What pristine repos do:**
- SQLite: Test suite is 745x the size of the library. 100% branch coverage. Billions of test cases including fuzz testing, boundary value analysis, and out-of-memory testing.
- FoundationDB: Invented deterministic simulation testing. Trillion CPU-hours of simulated stress.
- Redis: Comprehensive test suite with TCL-based integration tests and unit tests.
- ripgrep: Property-based testing, regression tests for every bug fix, benchmarks.

**Where homebase stands:**
- 2 TypeScript test files: `runaway-detector.test.ts` (341 lines), `events-trace-ingest.test.ts`
- 1 bash test script: `.hooks/tests/test_hooks.sh` (430 lines) — thorough but not in CI
- 4 additional bash test scripts in `admiral/tests/` — also not in CI
- No coverage measurement
- No integration tests between hooks and control plane
- No fuzz testing or property-based testing
- No test for `server.ts`, `trace.ts`, `ingest.ts`, `instrumentation.ts`, `cli.ts`, or `events.ts` individually

**Specific gaps:**
- **Hook tests not in CI** — `.hooks/tests/test_hooks.sh` and `admiral/tests/` scripts exist but `control-plane-ci.yml` only runs `npm test`. Hook tests are never run automatically.
- **No coverage tracking** — No `c8`, `istanbul`, or similar. No coverage thresholds enforced.
- **Untested modules** — `server.ts` (204 lines of HTTP routing with URL parsing), `trace.ts`, `ingest.ts`, `cli.ts` have zero tests. `server.ts` has URL parsing logic that is the exact kind of code that benefits from testing.
- **No edge case testing** — No tests for malformed JSON payloads to hooks, no tests for concurrent state file access, no tests for large event streams.
- **No regression test discipline** — Pristine repos add a test for every bug fix. Recent commits like `fix: URL parsing bug` and `fix: brain_retrieve regex injection` don't reference associated test additions.

### 2. CI/CD — Gap: High

**What pristine repos do:**
- Multi-stage pipelines: lint → build → test → coverage → integration → release
- Coverage gates (fail if coverage drops below threshold)
- Matrix builds across OS/Node versions
- Automated dependency updates (Dependabot/Renovate)
- Branch protection rules enforcing green CI

**Where homebase stands:**
- `control-plane-ci.yml`: install → build → test → lint (good basics)
- `spec-validation.yml`: validates VERSION, JSON/YAML syntax, markdown cross-refs
- `version-bump.yml`: auto-bumps version on merge
- `ai-monitor.yml`: daily AI landscape scanning

**Specific gaps:**
- **No hook testing in CI** — The most critical enforcement code (bash hooks) is never tested in CI
- **No coverage reporting** — No coverage badge, no thresholds, no trend tracking
- **No matrix testing** — Only `ubuntu-latest`. No macOS testing despite POSIX-compatible aspirations
- **No integration testing stage** — Hooks and control plane are tested in isolation (when tested at all), never together
- **No Dependabot/Renovate** — Dependencies can go stale silently
- **No branch protection validation** — No evidence of required CI checks before merge

### 3. CODE QUALITY TOOLING — Gap: High

**What pristine repos do:**
- Linter config checked into repo (`.eslintrc`, `biome.json`, `clippy.toml`, `.golangci.yml`)
- Formatter enforced (no style debates in PRs)
- Pre-commit hooks that run linting/formatting
- Static analysis beyond linting (CodeQL, Semgrep, ShellCheck)
- Type checking at strictest level

**Where homebase stands:**
- Biome in `devDependencies`, invoked via `npx @biomejs/biome check`
- TypeScript `strict: true` (good)
- No Biome config file (no `.biome.json` or `biome.json`) — uses defaults only
- No ShellCheck for bash hooks
- No pre-commit hooks (ironic for a project about deterministic enforcement)
- No CodeQL or static analysis in CI

**Specific gaps:**
- **No ShellCheck** — 13 bash hook scripts totaling ~1000+ lines with no static analysis. ShellCheck would catch portability issues, quoting bugs, and POSIX compliance problems.
- **No Biome config file** — Can't customize rules, can't document style decisions, can't share preferences
- **No pre-commit hooks** — A project whose thesis is "deterministic hooks over advisory guidance" has no git pre-commit hooks enforcing its own code quality
- **No security scanning** — No CodeQL, no Semgrep, no `npm audit` in CI

### 4. DOCUMENTATION — Gap: Medium

**What pristine repos do:**
- SQLite: Every function has a doc comment explaining purpose, parameters, return values, and edge cases
- PostgreSQL: Extensive inline comments explaining *why*, not *what*
- Redis: Inline comments explain algorithms (e.g., HyperLogLog header comment is a mini-paper)
- Go stdlib: Every exported function has a godoc comment

**Where homebase stands:**
- Excellent high-level documentation: README.md, AGENTS.md, CLAUDE.md are thorough
- Spec documentation (aiStrat/) is comprehensive
- TypeScript files have module-level doc comments (good)
- Hook scripts have header comments explaining purpose and exit codes (good)

**Specific gaps:**
- **No API documentation** — Control plane has no generated or hand-written API docs. `server.ts` exposes 12+ HTTP endpoints with no documented request/response contracts.
- **No architecture decision records (ADRs)** — Major design decisions (why bash for hooks? why zero runtime deps? why SPC for runaway detection?) are not recorded as discrete documents.
- **Sparse inline comments in hooks** — Hook headers are good, but the logic inside (regex patterns, threshold values, state mutation) often lacks "why" comments. For example, `estimate_tokens()` in `state.sh` has magic numbers (500, 1000, 800...) with no explanation of how they were derived.
- **No changelog for control-plane** — `aiStrat/` has a CHANGELOG.md but the implementation code does not.
- **Template files lack usage examples** — `admiral/templates/` has JSON/MD templates but no documentation on when/how to use them.

### 5. ARCHITECTURE — Gap: Medium

**What pristine repos do:**
- Clean module boundaries with explicit interfaces/contracts
- Dependency injection over hard coupling
- No circular dependencies
- Clear data flow (events in → processing → output)
- Layered architecture with each layer independently testable

**Where homebase stands:**
- Good high-level separation: spec (aiStrat/) / runtime (admiral/) / control-plane / hooks
- TypeScript code has clean type definitions and reasonable module boundaries
- Zero runtime dependencies (strong architectural constraint)

**Specific gaps:**
- **No interface contracts between layers** — Hooks communicate via JSON payloads to/from stdin/stdout, but the payload schemas are defined only in the spec (`aiStrat/`), not validated at runtime. A hook can silently produce malformed output.
- **Shared mutable state via filesystem** — Multiple hooks read/write `.admiral/session_state.json` with no locking. `state.sh` does atomic writes (rename) but no file locking. Two hooks running concurrently could race.
- **Control plane and hooks are disconnected** — The TypeScript control plane and the bash hooks are two parallel systems with no integration. The control plane has its own `RunawayDetector` while hooks have their own `loop_detector.sh`. They don't share signals.
- **`server.ts` URL routing** — Manual string parsing (`url.split("/").filter(Boolean)`) instead of a URL pattern library. This is fragile and hard to extend. The `agentId` extraction logic at line 98 has a guard (`agentId !== "resume"`) that is a code smell.
- **Event ID generation** — `events.ts:49` uses `Date.now()` + counter for IDs. Not collision-safe across processes. Pristine projects use UUIDs or CRDTs.

### 6. CONSISTENCY — Gap: Medium

**What pristine repos do:**
- One style, everywhere, enforced by tooling
- Naming conventions documented and followed
- Error handling follows a single pattern throughout

**Where homebase stands:**
- TypeScript: consistent style, Biome-formatted
- Bash hooks: mostly consistent headers, but internal style varies

**Specific gaps:**
- **Mixed error handling in bash** — Some hooks use `set -euo pipefail` (good), but error handling within is inconsistent. `token_budget_tracker.sh` always exits 0. `scope_boundary_guard.sh` exits 2 on violations. `loop_detector.sh` always exits 0. The exit code semantics are documented in headers but there's no shared pattern or helper.
- **jq invocation style varies** — Some hooks use `jq -r '.field // "default"'`, others use `jq -r '.field // empty'`, others use variable assignment patterns. No standard jq wrapper.
- **Naming inconsistency** — Hook files use `snake_case.sh` (good, matches AGENTS.md convention), but Standing Order files use `so01-identity-discipline.json` (kebab-case). Templates mix `.json` and `.md` in the same directory.
- **TypeScript exports** — Some modules export classes, some export types + classes, `index.ts` re-exports selectively. No documented export convention.

### 7. ERROR HANDLING — Gap: Medium

**What pristine repos do:**
- Redis: Every system call is checked, errors are propagated with context
- SQLite: Every function returns error codes, rollback on failure
- Go stdlib: `(value, error)` tuple pattern everywhere
- Rust: `Result<T, E>` with custom error types

**Where homebase stands:**
- Bash hooks: fail-open design (documented), but silent failures are possible
- TypeScript: mix of try/catch and unchecked operations

**Specific gaps:**
- **Silent state corruption possible** — `save_state()` in `state.sh` silently keeps old state if new content is invalid JSON. This is "fail-open" by design but means bugs can go undetected.
- **No error types in TypeScript** — `server.ts` catches errors with `err instanceof Error ? err.message : String(err)` — a pattern that suggests no structured error hierarchy.
- **HTTP error responses inconsistent** — `server.ts` returns some errors as `{ error: "..." }` JSON, others as plain text (`"Missing agent ID"`, `"Not found"`). No standard error response shape.
- **Hook pipeline failures are invisible** — If a hook crashes (e.g., `jq` not installed), the adapter catches it, but there's no health reporting or alerting mechanism.

### 8. CONTRIBUTOR EXPERIENCE — Gap: High

**What pristine repos do:**
- `CONTRIBUTING.md` with setup instructions, coding standards, PR process
- PR template with checklist (tests added? docs updated? breaking changes?)
- Issue templates (bug report, feature request)
- Code of Conduct
- `CODEOWNERS` file for automatic review assignment
- "Good first issue" labels

**Where homebase stands:**
- None of these exist
- `AGENTS.md` and `CLAUDE.md` serve as contributor guides for AI agents, but not for human contributors

**Specific gaps:**
- **No CONTRIBUTING.md** — A human joining the project has no guide
- **No PR template** — No checklist ensuring tests are added, lints pass, docs are updated
- **No issue templates** — No structured way to report bugs or request features
- **No CODEOWNERS** — No automatic review routing
- **No Code of Conduct** — Standard for any serious open source project

### 9. DEPENDENCY MANAGEMENT — Gap: Low-Medium

**What pristine repos do:**
- Lock files committed (`package-lock.json`, `Cargo.lock`, `go.sum`)
- Dependency auditing in CI
- Minimal dependency surface
- Pinned versions, not ranges

**Where homebase stands:**
- Zero runtime dependencies (excellent — mirrors SQLite/Lua philosophy)
- 3 dev dependencies: `@biomejs/biome`, `@types/node`, `typescript`
- Uses `^` version ranges (caret = minor version float)

**Specific gaps:**
- **Unclear if `package-lock.json` is committed** — CI caches it (`cache-dependency-path: 'control-plane/package-lock.json'`), implying it exists, but it's not in `.gitignore` either. Should be explicitly committed for reproducible builds.
- **No `npm audit` in CI** — Dev dependencies can have vulnerabilities too
- **Bash dependencies undeclared** — Hooks require `jq`, `sha256sum`, `uuidgen`, `date` but there's no dependency check script or documented minimum versions

### 10. PERFORMANCE & BENCHMARKS — Gap: Medium

**What pristine repos do:**
- ripgrep: Comprehensive benchmarks comparing against alternatives
- Redis: Built-in `redis-benchmark` tool
- SQLite: `speedtest1` program with published results
- Go: `go test -bench` as standard practice

**Where homebase stands:**
- No benchmarks of any kind
- No performance testing for hooks (which run on every tool call and add latency)
- No load testing for the HTTP server

**Specific gaps:**
- **Hook latency unmeasured** — Every tool call passes through up to 4 hooks sequentially. Each spawns a bash process, reads/writes `session_state.json`, and pipes through `jq`. This latency is never measured.
- **No server benchmarks** — `server.ts` JSON-serializes the entire event array on every `/api/events` request. At 10,000 events, this could be significant.
- **No SPC monitor benchmarks** — The `ControlChart` does O(n) recalculation. Performance at scale is unknown.

---

## Priority Recommendations

### Must-Fix (Critical/High gaps)

1. **Add hook tests to CI** — Create a CI job that runs `.hooks/tests/test_hooks.sh` and `admiral/tests/*.sh`. This is the lowest-effort, highest-impact change. The tests already exist but aren't automated.

2. **Add ShellCheck to CI** — `shellcheck .hooks/*.sh admiral/lib/*.sh` catches real bugs. One-line addition to CI.

3. **Add coverage measurement** — Use `c8` (zero-config for Node.js test runner). Set a baseline threshold. Add to CI.

4. **Test untested modules** — `server.ts`, `trace.ts`, `ingest.ts` need basic tests. `server.ts` URL routing is the highest-risk untested code.

5. **Create CONTRIBUTING.md** — Document setup, testing, PR process, coding standards. Essential for any project that wants contributors.

6. **Add PR and issue templates** — `.github/PULL_REQUEST_TEMPLATE.md` and `.github/ISSUE_TEMPLATE/` with bug and feature templates.

### Should-Fix (Medium gaps)

7. **Add ShellCheck pre-commit hook** — Eat your own dog food. A project about deterministic enforcement should enforce its own code quality with hooks.

8. **Create ADRs** — Document key architectural decisions: why bash for hooks, why zero deps, why SPC for runaway detection, why fail-open.

9. **Standardize error responses** — Create a consistent HTTP error response shape in `server.ts`.

10. **Add file locking to state management** — `flock` in `state.sh` to prevent concurrent state corruption.

11. **Document API endpoints** — At minimum, a table of routes, methods, request/response shapes for `server.ts`.

12. **Standardize jq patterns in hooks** — Create a shared `jq_helpers.sh` or document the canonical patterns.

### Nice-to-Have (Low gaps)

13. **Add benchmarks for hook latency** — Measure the overhead hooks add per tool call.

14. **Add matrix CI builds** — Test on macOS (since hooks claim POSIX compatibility).

15. **Add Dependabot/Renovate** — Automated dependency updates.

16. **Commit and verify package-lock.json** — Ensure reproducible builds.

---

## The Philosophical Gap

The deepest gap is not in any single dimension but in the relationship between homebase's *thesis* and its *practice*:

> "Deterministic enforcement beats advisory guidance."

Yet the project itself lacks deterministic enforcement of its own code quality:
- No pre-commit hooks
- No coverage gates
- No mandatory test additions for bug fixes
- Hook tests exist but aren't enforced in CI

Pristine repositories practice what they preach. SQLite's testing strategy *is* the product. Redis's readable code *is* the documentation. FoundationDB's simulation testing *is* the correctness guarantee.

Homebase should make its own governance framework the most visible proof of its thesis. The hooks directory should be the single best demonstration of what Admiral makes possible — and that means those hooks should be the most thoroughly tested, most consistently styled, most rigorously enforced code in the entire repository.
