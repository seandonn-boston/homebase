# Stream 13: Exemplary Codebase — Beyond 10/10

> *"The difference between a good codebase and a legendary one is that the legendary one anticipated the questions you haven't asked yet." — Engineering excellence*

**Current Score:** 4/10 (Overall)
**Target Score:** 10/10
**Items:** X-01 to X-18 (18 items)
**Size Distribution:** 2S, 5M, 11L

---

## Overview

These items transform homebase from "well-built" into "a reference implementation that others study and emulate." Each item draws inspiration from legendary engineering practices — FoundationDB's simulation testing, Netflix's chaos engineering, FastAPI's auto-documentation — and applies them to the Admiral context. The goal is a codebase that does not merely work but demonstrates how agentic governance infrastructure should be built.

---

## Tasks

- [ ] **X-01: Deterministic Simulation Testing**
  - **Description:** Create a simulation harness that replays recorded hook sequences and verifies deterministic outcomes. Feed the same input and get the same output, every time. Record real hook invocation sequences during test sessions, then replay them through the hook pipeline to verify that state transitions, brain entries, and output are byte-identical across runs.
  - **Done when:** Simulation replays 10+ recorded sequences deterministically. Any non-determinism (timestamps, random values) is identified and normalized. Replay failures produce clear diffs showing divergence point.
  - **Files:** `admiral/simulation/replay.sh` (new), `admiral/simulation/recordings/` (new)
  - **Size:** L
  - **Inspired by:** FoundationDB trillion-CPU-hour simulation
  - **Depends on:** A-01 (schema validation) — needs validated payloads

- [ ] **X-02: Chaos Testing for Hooks**
  - **Description:** Randomly inject failures into the hook execution environment: missing `jq`, corrupted state file, huge payloads (1MB+), slow disk (simulated via sleep), concurrent hook execution, read-only filesystem, missing environment variables, and malformed JSON input. Verify that every hook fails open per ADR-004 — no hook failure should block the developer's workflow.
  - **Done when:** Chaos suite runs 20+ failure scenarios, all hooks survive gracefully. Each scenario documents the failure mode, expected behavior, and actual behavior. No hook causes Claude Code to hang or crash under any chaos condition.
  - **Files:** `admiral/tests/chaos/chaos_runner.sh` (new), `admiral/tests/chaos/scenarios/` (new)
  - **Size:** L
  - **Inspired by:** Netflix Chaos Monkey
  - **Depends on:** T-06 (edge cases) — chaos extends edge case thinking

- [ ] **X-03: End-to-End Claude Code Session Simulation**
  - **Description:** Simulate a complete Claude Code session lifecycle: SessionStart hook fires, followed by 50+ PreToolUse/PostToolUse cycles across diverse tool types (Bash, Read, Write, Edit, Grep), then session end. Verify state progression is consistent, token tracking accumulates correctly, loop detection triggers at the right thresholds, and brain entries are written and readable throughout.
  - **Done when:** Full session simulation passes with consistent state throughout. Token counts are accurate. Loop detection fires when expected. Brain entries persist correctly across the simulated session. State file never becomes corrupted.
  - **Files:** `admiral/tests/test_e2e_session.sh` (new)
  - **Size:** L
  - **Inspired by:** Integration testing best practice
  - **Depends on:** S-01 through S-04 (all hooks exist)

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
  - **Depends on:** S-23 (sentinel pattern) — meta-governance prerequisite

- [ ] **X-06: Implement Triage Router Agent**
  - **Description:** Build a routing agent that receives incoming tasks and assigns them to appropriate agents based on task type, agent capabilities, current load, and agent availability. This is the reference implementation of Part 3 (Fleet Composition) from the Admiral spec, demonstrating multi-agent coordination in practice.
  - **Done when:** Router correctly assigns tasks in test scenarios covering at least 5 different task types. Routing decisions are logged with rationale. Fallback behavior works when preferred agent is unavailable.
  - **Files:** `admiral/agents/triage-router/` (new)
  - **Size:** L
  - **Inspired by:** Fleet composition spec (Part 3)
  - **Depends on:** S-06 (registry) and S-07 (routing)

- [ ] **X-07: Cross-System Unified Event Log**
  - **Description:** Establish a single JSONL event log that both the shell-based hook system and the TypeScript control plane can write to and query. Events from hook executions, state transitions, brain writes, and control plane API calls all flow into one stream. This enables unified observability across the entire Admiral stack.
  - **Done when:** Events from both systems visible in a single log. Query interface supports filtering by source, event type, time range, and session ID. Dashboard or CLI tool can render a unified timeline of a session's events.
  - **Files:** `admiral/lib/event_log.sh` (new), `control-plane/src/ingest.ts`
  - **Size:** L
  - **Inspired by:** Unified observability
  - **Spec ref:** Deduplicate with A-07 if that item exists

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

- [ ] **X-12: Contribution Complexity Analyzer** ⏳ DEFERRED (Phase 3+)
  - **Description:** Build a script that classifies areas of the codebase by contribution difficulty. Analyze file complexity (lines of code, cyclomatic complexity), test coverage, number of dependencies, and historical change frequency. Automatically generate a list of "good first issue" candidates — files or modules that are low-complexity, well-tested, and relatively isolated.
  > **Deferred rationale:** Nice-to-have contribution complexity analyzer; not blocking core implementation.
  - **Done when:** Script generates a ranked list of easy-to-contribute areas. Output includes rationale for each recommendation. Results can be used to auto-label GitHub issues with difficulty tags.
  - **Files:** `admiral/scripts/contribution-analyzer.sh` (new)
  - **Size:** M
  - **Inspired by:** Open-source contributor experience

- [ ] **X-13: Contract Testing Between Hooks and Control Plane**
  - **Description:** Verify that hook JSON output matches control plane input expectations. Hooks produce JSON (event payloads, state updates, brain entries) that the control plane ingests. Without contract tests, changes to either side can silently break the integration. Build a contract test suite that captures the agreed-upon JSON schemas at the boundary, then validates both sides against those schemas independently. Include tests for edge cases: empty payloads, missing optional fields, extra fields (forward compatibility), and maximum payload sizes.
  - **Done when:** Contract schemas defined for every hook-to-control-plane boundary (event ingest, state sync, brain entry format). Hook tests validate output against schemas. Control plane tests validate input parsing against the same schemas. Any schema change requires updating both sides and their tests. CI runs contract tests on every PR touching hooks or control plane code.
  - **Files:** `admiral/tests/contracts/` (new), `control-plane/src/__tests__/contracts/` (new), `admiral/schemas/contracts/` (new)
  - **Size:** L
  - **Depends on:** A-01 (schema validation) for base JSON schemas

- [ ] **X-14: Security Penetration Testing Suite**
  - **Description:** Build an automated security testing suite based on the attack corpus (`aiStrat/attack-corpus/`). For each known attack vector (prompt injection, privilege escalation, data exfiltration, tool abuse, identity spoofing), create a test that attempts the attack against Admiral's defenses and verifies it is blocked or mitigated. Include both known attacks from the corpus and synthetic attacks generated from attack patterns. The suite should run in CI and produce a security posture report showing which attacks are mitigated, which are detected-but-not-blocked, and which succeed (requiring remediation).
  - **Done when:** Test suite covers 30+ attack scenarios across at least 5 attack categories. Each test documents the attack vector, expected defense, and actual outcome. Security posture report generated as CI artifact. No critical or high-severity attacks succeed without detection. Suite is extensible — adding new attacks requires only adding a test file, not modifying the runner.
  - **Files:** `admiral/tests/security/pentest_runner.sh` (new), `admiral/tests/security/attacks/` (new), `admiral/tests/security/report.sh` (new)
  - **Size:** L
  - **Depends on:** S-19 (injection detection) and S-20 (data sensitivity) for defense implementations

- [ ] **X-15: Load Testing for Control Plane Server**
  - **Description:** Verify the control plane server handles 1000+ concurrent connections gracefully. Build a load testing harness that simulates realistic traffic patterns: event ingestion bursts (100 events/second), concurrent dashboard connections (50+ WebSocket clients), simultaneous API queries, and mixed read/write workloads. Measure response times under load, identify breaking points, and document capacity limits. Include soak testing (sustained load over 30+ minutes) to detect memory leaks and resource exhaustion.
  - **Done when:** Load test harness produces reproducible results. Server handles 1000+ concurrent connections without crashing. Response time p99 under load is documented. Memory usage remains stable over 30-minute soak test (no unbounded growth). Breaking point identified and documented. Performance regression test added to CI (lightweight version that runs in seconds).
  - **Files:** `control-plane/tests/load/load_test.ts` (new), `control-plane/tests/load/scenarios/` (new), `control-plane/tests/load/report.ts` (new)
  - **Size:** L
  - **Depends on:** X-07 (unified event log) for realistic event ingestion testing

- [ ] **X-16: Git History Quality Audit**
  - **Description:** Build an automated audit script that analyzes the git history for quality signals. Check that commit messages follow conventional commits format (feat/fix/docs/chore/refactor prefix), no force pushes exist in the history, no large binary files were committed (threshold: 1MB), no secrets or credentials appear in any commit (scanning patterns for API keys, tokens, passwords), merge commits follow a consistent pattern, and branch naming conventions are followed. Produce a quality report with a score and specific remediation recommendations.
  - **Done when:** Audit script runs against the full git history and produces a quality report. Report covers: conventional commit compliance percentage, large file violations, secret scanning results, force push detection, and merge hygiene. Script can run in CI as a gate (fail on critical violations like committed secrets). Historical violations are documented in an allowlist with remediation status.
  - **Files:** `admiral/scripts/git-history-audit.sh` (new)
  - **Size:** M
  - **Inspired by:** Supply chain security and repository hygiene

- [ ] **X-17: Documentation Coverage Report**
  - **Description:** Build an automated report showing which modules, functions, and files have documentation vs. which do not. For TypeScript files, check for JSDoc comments on exported functions and classes. For shell scripts, check for header comments explaining purpose, inputs, and outputs. For the overall project, verify that every directory with code has a corresponding entry in architecture docs or a local README. Produce a coverage percentage and a prioritized list of undocumented areas ranked by file importance (change frequency, number of imports/callers).
  - **Done when:** Report covers all TypeScript and shell files in the project. Documentation coverage percentage calculated (target: 80%+). Prioritized list of top 20 undocumented areas with importance ranking. CI step tracks coverage trend over time (does not gate, but reports). Report distinguishes between "no docs" and "stale docs" (docs that reference non-existent functions or outdated signatures).
  - **Files:** `admiral/scripts/doc-coverage.sh` (new), `control-plane/scripts/doc-coverage.ts` (new)
  - **Size:** M
  - **Inspired by:** Code coverage applied to documentation

- [ ] **X-18: Accessibility Audit for Dashboard** ⏳ DEFERRED (Phase 3+)
  - **Description:** Ensure the control plane dashboard meets basic accessibility standards (WCAG 2.1 Level AA). Audit keyboard navigation (all interactive elements reachable via Tab, actionable via Enter/Space), screen reader compatibility (proper ARIA labels, semantic HTML, meaningful alt text), color contrast (minimum 4.5:1 ratio for normal text, 3:1 for large text), focus management (visible focus indicators, logical focus order), and responsive design (usable at 200% zoom). Use automated tools (axe-core, Lighthouse accessibility audit) supplemented by manual testing of key user flows.
  > **Deferred rationale:** WCAG 2.1 AA accessibility audit; dashboard does not exist yet. Defer until dashboard is built.
  - **Done when:** Automated accessibility audit passes with zero critical violations. All interactive dashboard elements are keyboard-accessible. Screen reader can navigate the full dashboard and announce all data meaningfully. Color contrast meets WCAG 2.1 AA minimums. Accessibility test added to CI using axe-core or equivalent. Manual audit checklist completed for top 5 user flows (session list, session detail, event timeline, brain viewer, settings).
  - **Files:** `control-plane/tests/accessibility/` (new), `control-plane/playwright.config.ts` (modify for accessibility tests)
  - **Size:** L
  - **Depends on:** Control plane dashboard implementation being substantially complete

---

## Dependencies

```
X-01 (simulation) depends on A-01 (schema validation) — needs validated payloads
X-02 (chaos) depends on T-06 (edge cases) — chaos extends edge case thinking
X-03 (e2e session) depends on S-01 through S-04 (all hooks exist)
X-05 (sentinel) depends on S-23 (sentinel pattern) — meta-governance prerequisite
X-06 (triage router) depends on S-06 (registry) and S-07 (routing)
X-07 (unified event log) is same as A-07 — deduplicate
X-13 (contract testing) depends on A-01 (schema validation) for base JSON schemas
X-14 (security pentest) depends on S-19 (injection detection) and S-20 (data sensitivity)
X-15 (load testing) depends on X-07 (unified event log) for realistic event ingestion
X-18 (accessibility) depends on dashboard implementation being substantially complete
X-09, X-10, X-11, X-12, X-16, X-17 can be done independently
```

## Execution Notes

The original 12 items (X-01 through X-12) established the vision for a legendary codebase through simulation testing, chaos engineering, profiling, agent implementations, and developer experience tooling. The 6 new items (X-13 through X-18) fill critical gaps: X-13 (contract testing) prevents the most common integration failure mode between hooks and control plane. X-14 (security pentest) operationalizes the attack corpus into automated defense validation. X-15 (load testing) ensures the control plane is production-ready under real traffic. X-16 (git history audit) enforces supply chain hygiene. X-17 (doc coverage) applies the coverage mindset to documentation. X-18 (accessibility) ensures the dashboard serves all users. Together, these 18 items cover every dimension of codebase excellence: correctness, resilience, performance, security, documentation, and accessibility.
