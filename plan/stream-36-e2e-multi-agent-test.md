# Stream 36: End-to-End Multi-Agent Test Scenario

> A concrete integration test proving two or more agents can hand off work and complete a task through the Admiral orchestration layer.

**Scope:** Build an end-to-end test that exercises the full orchestration stack: task assignment, agent execution, handoff, result collection. The test proves that the routing engine, execution runtime, state persistence, and result aggregation work together in a real scenario. Includes both a happy path (Agent A completes, hands off to Agent B, which completes) and a failure path (Agent A fails, task re-routes to Agent B). Runs in CI as a smoke test for the orchestration layer.

**Principle:** A system that has never been tested end-to-end has never been tested. Unit tests prove components work; this test proves the system works.

---

## 36.1 Test Infrastructure

- [ ] **E2E-01: Test harness for multi-agent scenarios — Scaffold the test infrastructure**
  - **Description:** Create a test harness that can simulate multi-agent scenarios without requiring actual LLM API calls. The harness provides: (1) mock agent implementations that execute predefined behaviors (succeed, fail, timeout, produce output), (2) a test task that requires two agents to complete (e.g., "analyze code" → Agent A produces analysis → handoff → Agent B produces fix), (3) assertion helpers for verifying execution state, handoff completeness, and result correctness. The harness uses the real routing engine, execution runtime, and handoff protocol — only the agent execution is mocked.
  - **Done when:** Test harness can simulate multi-agent scenarios. Mock agents execute predefined behaviors. Real routing, execution runtime, and handoff protocol are used. Assertion helpers verify state transitions, handoff payloads, and results. Harness is reusable for additional scenarios.
  - **Files:** `control-plane/src/e2e-orchestration.test.ts` (new), `control-plane/src/test-helpers/mock-agent.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 5 (Execution Patterns), Part 3 (Fleet Management)
  - **Depends on:** EX-01 (session spawner), Stream 15 (routing)

- [ ] **E2E-02: Happy path scenario — Agent A → handoff → Agent B → result**
  - **Description:** Implement the happy path test: (1) submit a task requiring two agents (code analysis → code fix), (2) routing engine assigns Agent A (analyzer), (3) Agent A executes and produces a handoff payload with analysis results, (4) handoff protocol validates the payload and routes to Agent B (fixer), (5) Agent B executes using the handoff context and produces the final result, (6) result aggregator collects both results and produces a combined report. Assert: both agents executed, handoff payload was valid, final result contains contributions from both agents, execution state shows complete lifecycle for both sessions.
  - **Done when:** Happy path test passes end-to-end. Routing correctly selects both agents. Handoff payload is validated against schema. Both agents produce results. Final aggregated result contains contributions from both. All state transitions are correct (pending → running → complete for both sessions).
  - **Files:** `control-plane/src/e2e-orchestration.test.ts` (extend from E2E-01)
  - **Size:** M
  - **Spec ref:** Part 5 (Execution Patterns)
  - **Depends on:** E2E-01

- [ ] **E2E-03: Failure and re-route scenario — Agent A fails → re-route to Agent B**
  - **Description:** Implement the failure path test: (1) submit a task assigned to Agent A, (2) Agent A fails (mock throws error or times out), (3) execution runtime detects failure and triggers retry/re-route per the degradation policy, (4) routing engine selects Agent B as fallback, (5) Agent B executes successfully and produces the result, (6) result aggregator records the failure, re-route, and eventual success. Assert: Agent A failure is detected and recorded, re-routing happens per degradation policy, Agent B succeeds, final result is correct, execution history shows the full failure → re-route → success chain.
  - **Done when:** Failure test passes end-to-end. Agent A failure is detected within timeout. Re-routing selects correct fallback agent. Agent B succeeds on the re-routed task. Execution history records failure, re-route decision, and success. Escalation event is emitted for the initial failure.
  - **Files:** `control-plane/src/e2e-orchestration.test.ts` (extend from E2E-01)
  - **Size:** M
  - **Spec ref:** Part 5 (Execution Patterns), Part 3 (Degradation Policy)
  - **Depends on:** E2E-01, EX-04 (timeout/retry)

- [ ] **E2E-04: CI integration — Run E2E test as smoke test in CI**
  - **Description:** Add the end-to-end orchestration test to the CI pipeline as a smoke test. The test must: (1) complete in <30 seconds (no LLM calls, all agents mocked), (2) run after unit tests pass, (3) produce a structured test report, (4) fail the CI build if either scenario (happy path or failure path) fails. Add to the existing test workflow alongside the unit test suite.
  - **Done when:** E2E test runs in CI. Completes in <30 seconds. Produces structured output. CI build fails if E2E test fails. Test is positioned after unit tests in the workflow.
  - **Files:** `.github/workflows/ci.yml` (extend existing)
  - **Size:** S
  - **Spec ref:** —
  - **Depends on:** E2E-02, E2E-03

---

## Dependencies

| Item | Depends on |
|------|-----------|
| E2E-01 (test harness) | EX-01 (session spawner), Stream 15 (routing) — both should exist |
| E2E-02 (happy path) | E2E-01 |
| E2E-03 (failure path) | E2E-01, EX-04 (timeout/retry) |
| E2E-04 (CI integration) | E2E-02, E2E-03 |
