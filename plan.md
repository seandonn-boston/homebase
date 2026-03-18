Plan: Homebase 7.5 → 10/10
Context
Homebase is rated B+ (7.5/10). The biggest gaps are: test coverage (4/10), implementation completeness (5/10), scalability (5/10), and several known bugs. This plan addresses all of them in a single full-stack push: bug fixes, performance improvements, comprehensive tests, an MCP server, hook test CI integration, and coverage reporting.
Constraints: Zero runtime dependencies. Cannot modify aiStrat/ or .github/workflows/ without approval. Conventional Commits required.

Phase 1: Bug Fixes (7.5 → 8.0)
1a. Fix async promise swallowing in fireAlert
File: control-plane/src/runaway-detector.ts (lines 556-564)
Change: Add .catch() to the async onAlert promise chain. Log the error and still pause the agent on rejection.

shouldPause.then((pause) => {
  if (pause) this.pausedAgents.add(alert.agentId);
}).catch((err) => {
  console.error(`[admiral] onAlert rejected for ${alert.id}:`, err);
});


Commit: fix: handle rejected promises from async onAlert callback
1b. Scope eventCounter per instance
File: control-plane/src/events.ts (line 47-51)
Change: Move eventCounter from module-level to an instance field on EventStream.
Commit: fix: scope event counter per EventStream instance
1c. Scope alertCounter per instance
File: control-plane/src/runaway-detector.ts (line 348)
Change: Move alertCounter from module-level to an instance field on RunawayDetector.
Commit: fix: scope alert counter per RunawayDetector instance

Phase 2: Performance (8.0 → 8.5)
2a. Add RingBuffer<T> utility
New file: control-plane/src/ring-buffer.ts (~90 lines)
What: Generic circular buffer with O(1) push/evict, toArray(), filter(), iteration support. Zero dependencies.
Commit: feat: add RingBuffer<T> utility for O(1) eviction
2b. Replace EventStream array+splice with RingBuffer
File: control-plane/src/events.ts
Change: Replace private events: AgentEvent[] = [] with private events: RingBuffer<AgentEvent>. Update getEvents(), getEventsByAgent(), getEventsSince() to use RingBuffer's API. Public API shape unchanged (still returns AgentEvent[]).
Commit: perf: replace EventStream array+splice with RingBuffer
2c. Use RingBuffer in ControlChart
File: control-plane/src/runaway-detector.ts
Change: Replace private samples: SPCSample[] = [] + .shift() with RingBuffer<SPCSample>. All existing methods adapt to RingBuffer API.
Commit: perf: use RingBuffer in ControlChart for O(1) sample eviction

Phase 3: Comprehensive Test Coverage (8.5 → 9.0)
3a. RingBuffer tests
New file: control-plane/src/ring-buffer.test.ts (~150 lines)
Covers: Push/evict, capacity enforcement, iteration, toArray(), filter(), edge cases (empty, single-element, at-capacity).
Commit: test: add comprehensive RingBuffer tests
3b. Server HTTP API tests
New file: control-plane/src/server.test.ts (~300 lines)
Covers: All API routes (/health, /api/events, /api/alerts, /api/alerts/active, /api/trace, /api/trace/ascii, /api/config, /api/stats, /api/session), CORS headers, resume/resolve endpoints, 404 handling, health degraded state (503).
Approach: Start server on a random port, use node:http to make requests, assert JSON responses.
Commit: test: add HTTP API server tests
3c. Trace tests
New file: control-plane/src/trace.test.ts (~150 lines)
Covers: buildTrace() tree construction, buildAgentTrace() filtering, renderAscii() output format, getStats() aggregation, multi-agent forests, empty streams.
Commit: test: add trace tree building and rendering tests
3d. Instrumentation tests
New file: control-plane/src/instrumentation.test.ts (~100 lines)
Covers: All convenience methods (started, stopped, taskAssigned, toolCalled, tokenSpent, subtaskCreated, policyViolation), token accumulation, default taskId propagation.
Commit: test: add instrumentation hook tests
3e. CLI argument parsing tests
File: control-plane/src/cli.ts — extract parseArgs as an exported function
New file: control-plane/src/cli.test.ts (~60 lines)
Covers: Default values, --project-dir, --port, combined args.
Commit: test: add CLI argument parsing tests
3f. End-to-end pipeline integration test
New file: control-plane/src/integration.test.ts (~120 lines)
Covers: Full pipeline: createAdmiral() → instrument() → emit events → detector fires alert → agent paused → resume → alert resolved. Verifies the entire system works together.
Commit: test: add end-to-end pipeline integration tests
3g. Update test script to autodiscover
File: control-plane/package.json
Change: Update "test" script to "node --test dist/src/**/*.test.js" so new test files are automatically picked up.
Commit: chore: autodiscover all test files in test script

Phase 4: MCP Server (9.0 → 9.5)
4a. Brain B1 MCP Server — core tools
New file: control-plane/src/mcp-server.ts (~300 lines)
What: Implement a lightweight MCP server over stdio transport that exposes 4 Brain B1 tools:
	∙	brain_record — Write a JSON entry to .brain/{project}/
	∙	brain_query — Search entries by category/tags/text match
	∙	brain_retrieve — Fetch entry by ID with link traversal
	∙	brain_status — Health stats (entry count, categories, last write)
Design decisions:
	∙	Filesystem-backed (B1 level) — reads/writes .brain/ JSON files
	∙	No runtime dependencies — implements MCP JSON-RPC protocol directly over stdio using node:readline and process.stdin/process.stdout
	∙	Validates tool inputs with inline schema checks (no Zod — zero-dep policy)
	∙	Returns MCP-compliant JSON-RPC responses
Commit: feat: add Brain B1 MCP server with 4 core tools
4b. MCP Server tests
New file: control-plane/src/mcp-server.test.ts (~200 lines)
Covers: JSON-RPC message parsing, tool dispatch, brain_record round-trip, brain_query filtering, brain_retrieve by ID, brain_status output, error responses for invalid tool/params.
Commit: test: add MCP server unit tests
4c. MCP CLI entrypoint
New file: control-plane/src/mcp-cli.ts (~30 lines)
What: Standalone entry point: node dist/src/mcp-cli.js [--project-dir <path>]. Starts the MCP server on stdio.
File: control-plane/package.json — add "mcp" script
Commit: feat: add MCP server CLI entrypoint

Phase 5: CI Hardening (9.5 → 9.8)
5a. Add coverage reporting to CI
File: control-plane/package.json
Change: Add "test:coverage": "node --test --experimental-test-coverage dist/src/**/*.test.js" script.
File: .github/workflows/control-plane-ci.yml
Change: Replace npm test with npm run test:coverage in CI step.
Commit: ci: add native Node.js test coverage reporting
5b. Wire hook tests into CI
New file: .github/workflows/hook-tests.yml
What: New workflow triggered on changes to .hooks/** or admiral/**. Runs:
	∙	.hooks/tests/test_hooks.sh (430-line hook integration suite)
	∙	admiral/tests/test_brain_b1.sh
	∙	admiral/tests/test_hook_sequencing.sh
	∙	admiral/tests/test_escalation_resolution.sh
	∙	admiral/tests/test_state_persistence.sh
Commit: ci: add hook and admiral integration tests to CI

Phase 6: Code Quality Polish (9.8 → 10.0)
6a. Tighten public API types
File: control-plane/src/index.ts
Change: Add explicit AdmiralInstance return type for createAdmiral(). Export IngesterStats, RingBuffer, and SPCViolation types.
Commit: refactor: add AdmiralInstance type and export missing types
6b. Defensive error handling in server
File: control-plane/src/server.ts
Change: Wrap handleRequest body in try/catch to prevent unhandled exceptions from crashing the server. Return 500 with error details.
Commit: fix: add defensive error handling to HTTP server
6c. Update CODEBASE_RATING.md
File: CODEBASE_RATING.md
Change: Update all dimension scores and overall rating to reflect the improvements. Document what was done.
Commit: docs: update codebase rating to reflect improvements

Verification
After all changes:
	1.	Build: cd control-plane && npm run build — zero errors
	2.	Lint: npm run lint — zero warnings
	3.	Tests: npm test — all test files discovered and passing
	4.	Coverage: npm run test:coverage — report shows coverage across all modules
	5.	MCP Server: node dist/src/mcp-cli.js --project-dir /home/user/homebase — responds to JSON-RPC over stdio
	6.	Existing behavior preserved: Run existing runaway-detector.test.ts and events-trace-ingest.test.ts — all pass unchanged
	7.	Hook tests: bash .hooks/tests/test_hooks.sh — all pass
