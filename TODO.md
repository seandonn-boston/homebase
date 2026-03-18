# TODO.md — Admiral Framework: Complete Implementation & 10/10 Quality

**Last updated:** 2026-03-18
**Current profile:** Starter (F1, E1, B1) | **Target:** Governed (F3, E3, B3) + 10/10 quality
**Spec version:** v0.17.1-alpha | **Control plane:** v0.6.0-alpha

> *"Deterministic enforcement beats advisory guidance."* — This TODO is the roadmap to make that thesis self-evident.

---

## Format

```
Phase X — Epic-level work stream (one slush branch, one PR → main, requires Admiral approval)
  Task X.Y — Meaningful chunk (one branch off slush, one PR → slush, no human approval needed)
    Subtask X.Y.Z — One commit (atomic, bite-sized, pushed to task branch)
```

**Rules:**
- Each Phase's first action: create slush branch from main
- Each Task's first subtask: write tests (TDD) wherever applicable
- Each Task's final subtask: run test suite, linters, cleanup, pass CI
- Each Phase has a Definition of Done
- Phases merge to main only with human Admiral approval

---

## Phase 1 — Quality Foundation

> Bring existing code to pristine quality before building new features. Current score: 6/10 → Target: 9/10.

**Slush branch:** `phase-1/quality-foundation`
**Definition of Done:** Coverage ≥80% across all TS modules. All hooks have dedicated tests. CI enforces coverage gates, ShellCheck, matrix builds. Published coding standard exists. No silent failures.

### Task 1.1 — Unit Tests for Untested TypeScript Modules

- [ ] 1.1.1 — Write `trace.test.ts`: tests for `buildTrace()`, `buildAgentTrace()`, `renderAscii()`, `getStats()` covering empty stream, single agent, multi-agent forest, task nesting, ASCII output format
- [ ] 1.1.2 — Write `ingest.test.ts`: tests for `ingestNewLines()`, `start()`/`stop()`, `getStats()` covering missing file, empty file, valid JSONL, malformed lines, incremental reads, offset tracking
- [ ] 1.1.3 — Write `instrumentation.test.ts`: tests for all 10 public methods (`started`, `stopped`, `taskAssigned`, `taskCompleted`, `taskFailed`, `toolCalled`, `toolResult`, `tokenSpent`, `subtaskCreated`, `policyViolation`) plus `getTotalTokens()` accumulation
- [ ] 1.1.4 — Write `events.test.ts`: tests for ID generation uniqueness, listener add/remove/unsubscribe, RingBuffer eviction, all filter methods, `getEvictedCount()`, `getTotalEmitted()`, `clear()`
- [ ] 1.1.5 — Run test suite, linters, cleanup, pass CI

### Task 1.2 — Edge Case & Robustness Testing

- [ ] 1.2.1 — Write edge case tests for `server.test.ts`: URLs with special chars, very long URLs, requests during shutdown, concurrent requests, missing headers (≥5 new tests)
- [ ] 1.2.2 — Extend `.hooks/tests/test_hooks.sh` with edge cases: malformed JSON payloads, missing jq, empty stdin, very large payloads, Unicode tool names, concurrent hook execution (≥10 new tests)
- [ ] 1.2.3 — Write `admiral/tests/test_state_concurrency.sh`: spawn multiple subshells doing simultaneous read-modify-write via `with_state_lock`, verify no data loss
- [ ] 1.2.4 — Run test suite, linters, cleanup, pass CI

### Task 1.3 — Coverage Enforcement & Visibility

- [ ] 1.3.1 — Measure current coverage baseline using `npm run test:coverage`
- [ ] 1.3.2 — Add coverage threshold gate to `.github/workflows/control-plane-ci.yml` — fail if coverage drops below baseline minus 5%
- [ ] 1.3.3 — Add coverage badge to `README.md` generated from CI output
- [ ] 1.3.4 — Document coverage threshold in `CONTRIBUTING.md`
- [ ] 1.3.5 — Run test suite, linters, cleanup, pass CI

### Task 1.4 — Performance Benchmarks

- [ ] 1.4.1 — Write `admiral/benchmarks/hook_latency.sh`: measure wall-clock time for each hook with typical payload, output p50/p95/p99 table
- [ ] 1.4.2 — Write `control-plane/benchmarks/server-perf.ts`: benchmark `/api/events` with 100/1000/10000 events, measure response time and memory
- [ ] 1.4.3 — Write `control-plane/benchmarks/ring-buffer-perf.ts`: benchmark push/toArray/filter at 10K/100K/1M elements, verify O(1) push
- [ ] 1.4.4 — Document benchmark results in `docs/benchmarks/`
- [ ] 1.4.5 — Run test suite, linters, cleanup, pass CI

### Task 1.5 — Bash Hook Standardization

- [ ] 1.5.1 — Write tests for planned shared libraries (`admiral/tests/test_jq_helpers.sh`, `admiral/tests/test_hook_utils.sh`)
- [ ] 1.5.2 — Create `admiral/lib/jq_helpers.sh`: `jq_get_field()`, `jq_set_field()`, `jq_array_append()`, `jq_validate()`
- [ ] 1.5.3 — Create `admiral/lib/hook_utils.sh`: `hook_log()`, `hook_fail_soft()`, `hook_fail_hard()`, `hook_pass()`
- [ ] 1.5.4 — Refactor all 13 hooks to use shared jq helpers and error handling
- [ ] 1.5.5 — Define and enforce hook header standard; create `admiral/tests/test_hook_headers.sh`
- [ ] 1.5.6 — Run test suite, linters, cleanup, pass CI

### Task 1.6 — TypeScript Quality Improvements

- [ ] 1.6.1 — Write tests for new error types before creating them
- [ ] 1.6.2 — Replace `Date.now()` event IDs with `crypto.randomUUID()` in `events.ts`
- [ ] 1.6.3 — Create `control-plane/src/errors.ts` with typed error hierarchy (`AdmiralError`, `NotFoundError`, `ValidationError`, `StateCorruptionError`, `IngestionError`)
- [ ] 1.6.4 — Refactor `server.ts` and `ingest.ts` to use typed errors
- [ ] 1.6.5 — Improve `server.ts` URL routing: replace manual string splitting with declarative route table pattern
- [ ] 1.6.6 — Document TypeScript export conventions in `CONTRIBUTING.md`
- [ ] 1.6.7 — Run test suite, linters, cleanup, pass CI

### Task 1.7 — CI/CD Hardening

- [ ] 1.7.1 — Add matrix CI builds: ubuntu-latest + macos-latest for both TS and hook tests
- [ ] 1.7.2 — Add CodeQL security scanning workflow (`.github/workflows/codeql.yml`)
- [ ] 1.7.3 — Add integration test stage: start server, run hooks, verify events appear in control plane
- [ ] 1.7.4 — Add benchmark regression detection to CI (warn on >10% regression)
- [ ] 1.7.5 — Verify `git config core.hooksPath .githooks` is documented and enforced
- [ ] 1.7.6 — Run test suite, linters, cleanup, pass CI

### Task 1.8 — Documentation & Governance

- [ ] 1.8.1 — Create `ADMIRAL_STYLE.md` — published coding standard (naming, error handling, jq patterns, exit codes, comments, testing, commits)
- [ ] 1.8.2 — Add `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1)
- [ ] 1.8.3 — Add `LICENSE` file at repo root (MIT)
- [ ] 1.8.4 — Add inline "why" comments to all 13 hooks and `admiral/lib/state.sh`
- [ ] 1.8.5 — Add usage examples to all templates in `admiral/templates/`
- [ ] 1.8.6 — Write ADR-006: hook payload schema decisions
- [ ] 1.8.7 — Write ADR-007: event ID generation rationale
- [ ] 1.8.8 — Document all API endpoints in `control-plane/API.md` with curl examples
- [ ] 1.8.9 — Create `admiral/bin/check_deps` — bash dependency checker (jq ≥1.6, sha256sum, uuidgen, date, flock)
- [ ] 1.8.10 — Run test suite, linters, cleanup, pass CI

### Task 1.9 — Self-Enforcement (Eat Our Own Dog Food)

- [ ] 1.9.1 — Write tests for self-enforcement checks
- [ ] 1.9.2 — Create CI check: `fix:` commits require associated test file changes
- [ ] 1.9.3 — Create CI check: every `.ts` source file has module-level doc comment, every `.sh` hook has header
- [ ] 1.9.4 — Create meta-test: Admiral control plane monitors its own hook execution
- [ ] 1.9.5 — Extend dashboard with quality metrics (test count, coverage %, hook count, SO count, ADR count)
- [ ] 1.9.6 — Run test suite, linters, cleanup, pass CI

---

## Phase 2 — Standing Orders Full Enforcement (E1 → E3)

> Advance enforcement from 8/16 Standing Orders with hooks to 12/16 (E3 target). Spec: Part 3, Part 11.

**Slush branch:** `phase-2/standing-orders-e3`
**Definition of Done:** 12/16 Standing Orders have deterministic or advisory hook enforcement. Standing Orders enforcement map updated. All new hooks pass ShellCheck and have dedicated tests.

### Task 2.1 — SO-02 Output Routing Enforcement

- [ ] 2.1.1 — Write tests for output routing validation hook
- [ ] 2.1.2 — Implement `output_routing_validator.sh`: validate that agent outputs route to correct destinations per SO-02 rules
- [ ] 2.1.3 — Register hook in `post_tool_use_adapter.sh` chain
- [ ] 2.1.4 — Run test suite, linters, cleanup, pass CI

### Task 2.2 — SO-05 Decision Authority Enforcement

- [ ] 2.2.1 — Write tests for decision authority validation
- [ ] 2.2.2 — Implement `decision_authority_validator.sh`: detect Propose/Escalate-tier decisions being made autonomously, require Brain query evidence for tier validation
- [ ] 2.2.3 — Integrate with `brain_context_router.sh` — cross-reference Brain query recency with decision tier
- [ ] 2.2.4 — Run test suite, linters, cleanup, pass CI

### Task 2.3 — SO-07 Checkpointing Enforcement

- [ ] 2.3.1 — Write tests for checkpoint validation
- [ ] 2.3.2 — Implement `checkpoint_validator.sh`: verify checkpoint artifacts exist at task completion boundaries per SO-07
- [ ] 2.3.3 — Define checkpoint file format and location (`.admiral/checkpoints/`)
- [ ] 2.3.4 — Run test suite, linters, cleanup, pass CI

### Task 2.4 — SO-09 Communication Format Validation

- [ ] 2.4.1 — Write tests for communication format checking
- [ ] 2.4.2 — Implement `communication_format_validator.sh`: validate structured message format (situation/action/result pattern) on Write/Edit tool outputs
- [ ] 2.4.3 — Run test suite, linters, cleanup, pass CI

### Task 2.5 — SO-14 Compliance Boundary Hardening

- [ ] 2.5.1 — Write tests for compliance boundary checks
- [ ] 2.5.2 — Upgrade `compliance_ethics_advisor.sh` from advisory to enforcement: add configurable deny-list for regulated domains (HIPAA, PCI, GDPR keywords)
- [ ] 2.5.3 — Add hard-block (exit 2) for clear compliance violations (PII in logs, regulated data in brain entries)
- [ ] 2.5.4 — Run test suite, linters, cleanup, pass CI

### Task 2.6 — SO-16 Protocol Governance Enforcement

- [ ] 2.6.1 — Write tests for MCP server vetting
- [ ] 2.6.2 — Implement `protocol_registry_guard.sh`: block MCP tool calls to unapproved servers per SO-16 (spec debt SD-06)
- [ ] 2.6.3 — Create `admiral/config/approved_mcp_servers.json` — allowlist of vetted MCP servers
- [ ] 2.6.4 — Run test suite, linters, cleanup, pass CI

### Task 2.7 — SO-04 Context Honesty & SO-13 Bias Awareness

- [ ] 2.7.1 — Write tests for context honesty metrics
- [ ] 2.7.2 — Implement `context_honesty_monitor.sh`: track and log confidence levels per SO-04 (advisory — confidence thresholds inherently advisory)
- [ ] 2.7.3 — Implement bias awareness logging: flag declining finding rates >30% as potential sycophantic drift per SO-13
- [ ] 2.7.4 — Run test suite, linters, cleanup, pass CI

### Task 2.8 — Update Enforcement Map & Documentation

- [ ] 2.8.1 — Update `admiral/standing-orders/` enforcement map to reflect new hooks
- [ ] 2.8.2 — Update `admiral/IMPLEMENTATION_STATUS.md` with E3 enforcement level
- [ ] 2.8.3 — Write ADR-008: Standing Orders enforcement strategy (which SOs get hard-blocks vs advisory)
- [ ] 2.8.4 — Run test suite, linters, cleanup, pass CI

---

## Phase 3 — Brain B2: SQLite + Embeddings

> Persistent knowledge beyond session-scoped B1 files. Spec: Part 5, `brain/level2-spec.md`.

**Slush branch:** `phase-3/brain-b2-sqlite`
**Definition of Done:** Brain entries persist in SQLite. Semantic search via cosine similarity works. B1→B2 migration complete. All brain CLI tools use B2 backend. Tests cover schema, migration, search, and CRUD.

### Task 3.1 — SQLite Schema & Initialization

- [ ] 3.1.1 — Write tests for schema creation and initialization
- [ ] 3.1.2 — Implement SQLite schema creation from `brain/schema/002_brain_b2.sql` (entries, embeddings, links, access tracking)
- [ ] 3.1.3 — Create `admiral/brain/b2/init_db.sh` — database initialization script
- [ ] 3.1.4 — Create `admiral/brain/b2/schema.sql` — canonical schema file
- [ ] 3.1.5 — Run test suite, linters, cleanup, pass CI

### Task 3.2 — B1 → B2 Migration

- [ ] 3.2.1 — Write tests for migration (verify all B1 entries migrate correctly)
- [ ] 3.2.2 — Implement `admiral/brain/b2/migrate_b1.sh` — read all `.brain/**/*.json`, insert into SQLite
- [ ] 3.2.3 — Implement data validation: verify migrated entries match B1 content
- [ ] 3.2.4 — Document migration process in `admiral/brain/b2/README.md`
- [ ] 3.2.5 — Run test suite, linters, cleanup, pass CI

### Task 3.3 — CRUD Operations

- [ ] 3.3.1 — Write tests for all CRUD operations
- [ ] 3.3.2 — Implement `brain_record` for B2: insert entries with category, slug, content, metadata
- [ ] 3.3.3 — Implement `brain_retrieve` for B2: fetch by ID with link traversal
- [ ] 3.3.4 — Implement `brain_query` for B2: keyword search with SQLite FTS5
- [ ] 3.3.5 — Implement entry supersession: `brain_supersede` marks entries obsolete with `superseded_by` link
- [ ] 3.3.6 — Implement access tracking: increment `access_count` and `last_accessed_at` on retrieval
- [ ] 3.3.7 — Run test suite, linters, cleanup, pass CI

### Task 3.4 — Embedding Generation & Semantic Search

- [ ] 3.4.1 — Write tests for embedding storage and cosine similarity search
- [ ] 3.4.2 — Implement embedding generation pipeline (support both OpenAI API and local models via configuration)
- [ ] 3.4.3 — Implement cosine similarity search function in SQLite
- [ ] 3.4.4 — Implement `brain_query --semantic` flag for embedding-based search
- [ ] 3.4.5 — Benchmark search performance at 100/1000/10000 entries
- [ ] 3.4.6 — Run test suite, linters, cleanup, pass CI

### Task 3.5 — Demand Signal Tracking & Graduated Promotion

- [ ] 3.5.1 — Write tests for demand signal logging and retrieval miss tracking
- [ ] 3.5.2 — Implement demand signal logging: log every `brain_query` to `.brain/_demand/` with query text, timestamp, hit/miss
- [ ] 3.5.3 — Implement retrieval miss rate tracking: alert when >30% queries return no results (spec threshold for B2→B3 promotion)
- [ ] 3.5.4 — Implement contradiction scan before writes: check for conflicting entries
- [ ] 3.5.5 — Run test suite, linters, cleanup, pass CI

---

## Phase 4 — Control Plane CP2: Fleet Observability

> Advance dashboard from basic event stream to fleet-level visibility. Spec: Part 9.

**Slush branch:** `phase-4/control-plane-cp2`
**Definition of Done:** Dashboard shows Fleet View, Agent Detail View, Task Flow View, and Enforcement Dashboard. All views populated from real event data. Server supports all CP2 API endpoints with tests.

### Task 4.1 — Fleet View API & UI

- [ ] 4.1.1 — Write tests for fleet view API endpoint
- [ ] 4.1.2 — Implement `/api/fleet` endpoint: agent roster with real-time status, health, role, last activity
- [ ] 4.1.3 — Implement fleet view UI panel in dashboard: agent cards with status indicators
- [ ] 4.1.4 — Run test suite, linters, cleanup, pass CI

### Task 4.2 — Agent Detail View API & UI

- [ ] 4.2.1 — Write tests for agent detail API endpoint
- [ ] 4.2.2 — Implement `/api/agents/:id/detail` endpoint: context utilization, token breakdown, authority tier usage, Brain interaction patterns
- [ ] 4.2.3 — Implement agent detail UI panel: per-agent drill-down with charts
- [ ] 4.2.4 — Run test suite, linters, cleanup, pass CI

### Task 4.3 — Task Flow View API & UI

- [ ] 4.3.1 — Write tests for task flow API endpoint
- [ ] 4.3.2 — Implement `/api/tasks` endpoint: task decomposition tree, parallel execution status, blocked/queued visibility
- [ ] 4.3.3 — Implement task flow UI panel: interactive task tree with status coloring
- [ ] 4.3.4 — Run test suite, linters, cleanup, pass CI

### Task 4.4 — Enforcement Dashboard

- [ ] 4.4.1 — Write tests for enforcement metrics API
- [ ] 4.4.2 — Implement `/api/enforcement` endpoint: which hooks fired, violations blocked, SO enforcement coverage map
- [ ] 4.4.3 — Implement enforcement UI panel: SO coverage heatmap, violation timeline
- [ ] 4.4.4 — Run test suite, linters, cleanup, pass CI

### Task 4.5 — Cost Tracking & Budget Analytics

- [ ] 4.5.1 — Write tests for cost tracking API
- [ ] 4.5.2 — Implement `/api/costs` endpoint: token budget consumption per agent, cost per task, burn rate with 4 brackets (<50% normal, 50-80% caution, 80-95% warning, >95% critical)
- [ ] 4.5.3 — Implement cost UI panel: budget gauge, burn rate trend, per-agent breakdown
- [ ] 4.5.4 — Run test suite, linters, cleanup, pass CI

### Task 4.6 — Alerting Pipeline

- [ ] 4.6.1 — Write tests for alert routing
- [ ] 4.6.2 — Implement alert routing engine: push alerts to configurable destinations (JSONL file, webhook, stdout)
- [ ] 4.6.3 — Implement alert severity escalation: warning → critical → auto-pause chain
- [ ] 4.6.4 — Implement `/api/alerts/subscribe` for real-time alert streaming (SSE)
- [ ] 4.6.5 — Run test suite, linters, cleanup, pass CI

---

## Phase 5 — Fleet Orchestration Runtime

> The heart of Admiral: multi-agent task routing, handoffs, and coordination. Spec: Parts 4, 6.

**Slush branch:** `phase-5/fleet-orchestration`
**Definition of Done:** Orchestrator can decompose tasks, route to agents, manage handoffs, and coordinate parallel execution. Fleet roster validation enforces 1-12 agents. Escalation routing works end-to-end.

### Task 5.1 — Fleet Roster & Agent Registry

- [ ] 5.1.1 — Write tests for fleet roster validation (1-12 agents, role uniqueness)
- [ ] 5.1.2 — Implement `FleetRoster` class: agent registration, role mapping, health tracking
- [ ] 5.1.3 — Implement agent card system: capabilities, availability, authentication
- [ ] 5.1.4 — Create fleet roster configuration format (`admiral/config/fleet.json`)
- [ ] 5.1.5 — Run test suite, linters, cleanup, pass CI

### Task 5.2 — Task Decomposition Engine

- [ ] 5.2.1 — Write tests for task decomposition (budget ceiling, over-decomposition detection)
- [ ] 5.2.2 — Implement `TaskDecomposer` class: break tasks into chunks respecting 40% budget ceiling
- [ ] 5.2.3 — Implement over-decomposition detection: flag chunks using <20% budget
- [ ] 5.2.4 — Implement dependency tracking between chunks
- [ ] 5.2.5 — Run test suite, linters, cleanup, pass CI

### Task 5.3 — Routing Engine

- [ ] 5.3.1 — Write tests for task-to-agent routing decisions
- [ ] 5.3.2 — Implement routing decision tree from `fleet/routing-rules.md`
- [ ] 5.3.3 — Implement role-based routing: match task requirements to agent capabilities
- [ ] 5.3.4 — Implement fallback routing: retry with different agent on failure
- [ ] 5.3.5 — Run test suite, linters, cleanup, pass CI

### Task 5.4 — Handoff Protocol

- [ ] 5.4.1 — Write tests for handoff message format, validation, and delivery
- [ ] 5.4.2 — Implement handoff message format per Part 11 spec
- [ ] 5.4.3 — Implement handoff validation: verify output satisfies interface contract
- [ ] 5.4.4 — Implement handoff rejection & remediation: return non-compliant handoffs
- [ ] 5.4.5 — Run test suite, linters, cleanup, pass CI

### Task 5.5 — Escalation Routing

- [ ] 5.5.1 — Write tests for escalation routing to human experts
- [ ] 5.5.2 — Implement escalation routing engine: determine which human gets which escalation based on domain
- [ ] 5.5.3 — Implement escalation report validation: ensure all required fields present
- [ ] 5.5.4 — Implement recovery ladder enforcement: validate retry→fallback→backtrack→isolate→escalate progression
- [ ] 5.5.5 — Run test suite, linters, cleanup, pass CI

### Task 5.6 — Parallel Execution & Swarm Patterns

- [ ] 5.6.1 — Write tests for parallel task assignment and result collection
- [ ] 5.6.2 — Implement parallel work assignment with dependency-aware scheduling
- [ ] 5.6.3 — Implement checkpoint synchronization between parallel agents
- [ ] 5.6.4 — Implement assumption divergence detection: flag conflicting design decisions from parallel agents
- [ ] 5.6.5 — Implement worker heartbeat monitoring (60s timeout per spec)
- [ ] 5.6.6 — Run test suite, linters, cleanup, pass CI

---

## Phase 6 — Brain B3: Postgres + MCP Server

> Full knowledge system with MCP tools, identity, permissions, and knowledge graph. Spec: Part 5, `brain/level3-spec.md`.

**Slush branch:** `phase-6/brain-b3-mcp`
**Definition of Done:** MCP server implements all 8 brain tools. JWT identity tokens work. Permission matrix enforces per-agent access. Entry links support knowledge graph traversal. Quarantine pipeline integrated for external data.

### Task 6.1 — Postgres Schema & pgvector Setup

- [ ] 6.1.1 — Write tests for schema creation and pgvector configuration
- [ ] 6.1.2 — Implement schema from `brain/schema/001_initial.sql` with pgvector HNSW indexing
- [ ] 6.1.3 — Create deployment automation (Docker Compose for local dev, migration scripts for prod)
- [ ] 6.1.4 — Implement B2→B3 migration path
- [ ] 6.1.5 — Run test suite, linters, cleanup, pass CI

### Task 6.2 — MCP Server: Core Tools (brain_record, brain_query, brain_retrieve)

- [ ] 6.2.1 — Write tests for all three core MCP tools
- [ ] 6.2.2 — Implement MCP server scaffold (zero external deps, Node.js built-ins)
- [ ] 6.2.3 — Implement `brain_record` tool: write entries with category, content, metadata, sensitivity classification
- [ ] 6.2.4 — Implement `brain_query` tool: semantic search with 8 ranking signals, configurable result limit
- [ ] 6.2.5 — Implement `brain_retrieve` tool: fetch by ID with link traversal (supports, contradicts, supersedes, elaborates, caused_by)
- [ ] 6.2.6 — Run test suite, linters, cleanup, pass CI

### Task 6.3 — MCP Server: Management Tools (brain_strengthen, brain_supersede, brain_status, brain_audit, brain_purge)

- [ ] 6.3.1 — Write tests for all five management tools
- [ ] 6.3.2 — Implement `brain_strengthen`: increment usefulness signals
- [ ] 6.3.3 — Implement `brain_supersede`: mark entries obsolete with superseded_by link
- [ ] 6.3.4 — Implement `brain_status`: health/statistics (entry count, decay warnings, retrieval patterns)
- [ ] 6.3.5 — Implement `brain_audit`: query immutable audit log (Admiral-only access)
- [ ] 6.3.6 — Implement `brain_purge`: GDPR right-to-erasure with cascade
- [ ] 6.3.7 — Run test suite, linters, cleanup, pass CI

### Task 6.4 — Identity & Permissions

- [ ] 6.4.1 — Write tests for JWT token lifecycle and permission matrix
- [ ] 6.4.2 — Implement JWT token generation: session-scoped, non-delegable, with agent identity claims
- [ ] 6.4.3 — Implement token verification: validate claims, check expiry, prevent delegation
- [ ] 6.4.4 — Implement permission matrix: per-agent, per-operation access control (standard/elevated/restricted sensitivity tiers)
- [ ] 6.4.5 — Implement audit trail: append-only, tamper-evident log of all brain operations
- [ ] 6.4.6 — Run test suite, linters, cleanup, pass CI

### Task 6.5 — Quarantine Integration & Knowledge Graph

- [ ] 6.5.1 — Write tests for quarantine pipeline integration with brain writes
- [ ] 6.5.2 — Integrate `admiral/monitor/quarantine/quarantine_pipeline.sh` with brain_record: all external data passes through Layer 3→4→5 before storage
- [ ] 6.5.3 — Implement entry link traversal: multi-hop queries following supports/contradicts/supersedes/elaborates/caused_by relationships
- [ ] 6.5.4 — Implement entry decay tracking: 90-day access window, strengthening/supersession rates
- [ ] 6.5.5 — Run test suite, linters, cleanup, pass CI

---

## Phase 7 — Quality Assurance Pipeline

> Automated QA gates, recovery ladder, and self-healing. Spec: Part 7.

**Slush branch:** `phase-7/qa-pipeline`
**Definition of Done:** Recovery ladder (retry→fallback→backtrack→isolate→escalate) is automated. Self-healing loop works with max_retries=3 and cycle detection. SDLC quality gates block low-quality output.

### Task 7.1 — Recovery Ladder Automation

- [ ] 7.1.1 — Write tests for each recovery ladder step
- [ ] 7.1.2 — Implement recovery state machine: retry (same approach) → fallback (simpler approach) → backtrack (checkpoint rollback) → isolate (contain failure) → escalate (human handoff)
- [ ] 7.1.3 — Implement checkpoint persistence for backtrack step
- [ ] 7.1.4 — Run test suite, linters, cleanup, pass CI

### Task 7.2 — Self-Healing Loop

- [ ] 7.2.1 — Write tests for self-healing with cycle detection
- [ ] 7.2.2 — Implement self-healing executor: detect error → attempt fix → verify → retry (max 3 attempts)
- [ ] 7.2.3 — Implement cycle detection: track `(check_name, error_signature)` tuples, halt on repeat
- [ ] 7.2.4 — Run test suite, linters, cleanup, pass CI

### Task 7.3 — SDLC Quality Gates

- [ ] 7.3.1 — Write tests for quality gate enforcement
- [ ] 7.3.2 — Implement automated code review gate: static analysis check before task completion
- [ ] 7.3.3 — Implement test coverage gate: verify coverage meets threshold for modified files
- [ ] 7.3.4 — Implement documentation gate: verify doc comments exist for new public APIs
- [ ] 7.3.5 — Run test suite, linters, cleanup, pass CI

---

## Phase 8 — Security & Zero-Trust Hardening

> Harden from advisory-only security to enforceable zero-trust. Spec: Part 9.

**Slush branch:** `phase-8/zero-trust`
**Definition of Done:** Identity validation on every tool call. Blast radius assessment automated. Privilege escalation blocked (not just detected). Audit trail is tamper-evident.

### Task 8.1 — Identity Validation Hook

- [ ] 8.1.1 — Write tests for identity token validation
- [ ] 8.1.2 — Implement `identity_validation.sh`: verify agent token claims before tool use per Part 11
- [ ] 8.1.3 — Implement token lifecycle: non-renewable, session expiry requiring human re-auth
- [ ] 8.1.4 — Run test suite, linters, cleanup, pass CI

### Task 8.2 — Blast Radius Assessment Automation

- [ ] 8.2.1 — Write tests for blast radius scoring
- [ ] 8.2.2 — Upgrade `zero_trust_validator.sh`: compute blast radius score for every action, block actions above threshold
- [ ] 8.2.3 — Implement risk scoring: file sensitivity × operation destructiveness × scope breadth
- [ ] 8.2.4 — Run test suite, linters, cleanup, pass CI

### Task 8.3 — Privilege Escalation Hard-Block

- [ ] 8.3.1 — Write tests for privilege escalation blocking
- [ ] 8.3.2 — Upgrade `prohibitions_enforcer.sh`: promote privilege escalation patterns from advisory to hard-block (exit 2)
- [ ] 8.3.3 — Add configurable allowlist for authorized privileged operations
- [ ] 8.3.4 — Run test suite, linters, cleanup, pass CI

### Task 8.4 — Tamper-Evident Audit Trail

- [ ] 8.4.1 — Write tests for audit trail integrity
- [ ] 8.4.2 — Implement hash-chained audit log: each entry includes hash of previous entry
- [ ] 8.4.3 — Implement audit trail validation: detect gaps or modifications
- [ ] 8.4.4 — Run test suite, linters, cleanup, pass CI

---

## Phase 9 — Data Ecosystem & Feedback Loops

> Closed-loop learning from execution to fleet adaptation. Spec: Part 12.

**Slush branch:** `phase-9/data-ecosystem`
**Definition of Done:** At least 3 of 6 feedback loops operational. Execution traces, enforcement events, and demand signals collected as structured datasets. Trend analysis produces actionable insights.

### Task 9.1 — Dataset Collection Infrastructure

- [ ] 9.1.1 — Write tests for dataset collection and aggregation
- [ ] 9.1.2 — Implement execution trace dataset: structured export from event stream
- [ ] 9.1.3 — Implement enforcement events dataset: aggregate hook fire events, violations, blocks
- [ ] 9.1.4 — Implement demand signals dataset: aggregate brain query logs
- [ ] 9.1.5 — Implement quality metrics dataset: test pass rates, coverage trends, defect density
- [ ] 9.1.6 — Implement cost dataset: token consumption per agent/task/session
- [ ] 9.1.7 — Run test suite, linters, cleanup, pass CI

### Task 9.2 — Feedback Loop: Execution → Control Plane

- [ ] 9.2.1 — Write tests for execution→control plane feedback
- [ ] 9.2.2 — Implement structured metrics emission from hooks (throughput, quality, escalation frequency, cost)
- [ ] 9.2.3 — Implement metrics aggregation pipeline in control plane
- [ ] 9.2.4 — Run test suite, linters, cleanup, pass CI

### Task 9.3 — Feedback Loop: Control Plane → Orchestrator

- [ ] 9.3.1 — Write tests for feedback-driven routing adjustments
- [ ] 9.3.2 — Implement routing feedback: adjust agent routing based on historical success rates
- [ ] 9.3.3 — Implement performance trending: identify improving/declining agents
- [ ] 9.3.4 — Run test suite, linters, cleanup, pass CI

### Task 9.4 — Feedback Loop: Brain → Execution (RAG Integration)

- [ ] 9.4.1 — Write tests for RAG-enhanced execution
- [ ] 9.4.2 — Implement automatic brain query injection: inject relevant brain entries into agent context at task start
- [ ] 9.4.3 — Implement brain query hit/miss tracking for retrieval quality measurement
- [ ] 9.4.4 — Run test suite, linters, cleanup, pass CI

---

## Phase 10 — Meta-Agent Governance

> Admiral as a meta-agent: AI-governed fleet with human oversight. Spec: Part 10.

**Slush branch:** `phase-10/meta-agent-governance`
**Definition of Done:** Governance agent enforces configuration immutability. Trust calibration tracks agent reliability per category. Sycophantic drift detection alerts on >30% finding decline. Human fallback always routes Escalate-tier to humans.

### Task 10.1 — Governance Agent Core

- [ ] 10.1.1 — Write tests for governance agent constraints
- [ ] 10.1.2 — Implement governance agent with hard constraints: cannot modify AGENTS.md, hooks, or authority tiers
- [ ] 10.1.3 — Implement configuration immutability enforcement: governance agent's own config is frozen
- [ ] 10.1.4 — Run test suite, linters, cleanup, pass CI

### Task 10.2 — Trust Calibration System

- [ ] 10.2.1 — Write tests for trust scoring and promotion
- [ ] 10.2.2 — Implement per-agent, per-category trust scoring
- [ ] 10.2.3 — Implement trust promotion algorithm: 5 consecutive successes for tier advancement per spec
- [ ] 10.2.4 — Implement trust withdrawal on failures
- [ ] 10.2.5 — Run test suite, linters, cleanup, pass CI

### Task 10.3 — Sycophantic Drift Detection

- [ ] 10.3.1 — Write tests for drift detection
- [ ] 10.3.2 — Implement finding rate tracker: monitor percentage of reviews that find issues
- [ ] 10.3.3 — Implement drift alert: flag >30% decline in finding rate as potential sycophancy
- [ ] 10.3.4 — Run test suite, linters, cleanup, pass CI

### Task 10.4 — Decision Authority Runtime Enforcement

- [ ] 10.4.1 — Write tests for authority tier enforcement
- [ ] 10.4.2 — Implement `project_maturity_calibration()`: adjust authority tiers based on project maturity
- [ ] 10.4.3 — Implement authority policy versioning: track and audit policy changes
- [ ] 10.4.4 — Run test suite, linters, cleanup, pass CI

---

## Phase 11 — Novel Engineering Practices

> Five practices from pristine codebases that no one else in the AI governance space is doing.

**Slush branch:** `phase-11/novel-practices`
**Definition of Done:** All 5 practices integrated. Mutation testing reveals test quality. Fitness functions prevent architectural decay. Contract tests catch breaking changes. Golden tests make state mutations visible. DX metrics track quality trends.

### Task 11.1 — Mutation Testing (Stryker)

- [ ] 11.1.1 — Add Stryker as dev dependency, configure for TypeScript
- [ ] 11.1.2 — Run initial mutation testing, establish baseline mutation score
- [ ] 11.1.3 — Fix tests that fail to kill mutants (improve test quality)
- [ ] 11.1.4 — Add mutation testing to CI (report-only, don't block)
- [ ] 11.1.5 — Run test suite, linters, cleanup, pass CI

### Task 11.2 — Architecture Fitness Functions

- [ ] 11.2.1 — Write fitness function: session state writes use atomic rename (not direct writes)
- [ ] 11.2.2 — Write fitness function: all hooks follow exit code contract (0/1/2)
- [ ] 11.2.3 — Write fitness function: TypeScript never directly manipulates bash state
- [ ] 11.2.4 — Write fitness function: no circular dependencies between TS modules
- [ ] 11.2.5 — Add fitness functions to CI
- [ ] 11.2.6 — Run test suite, linters, cleanup, pass CI

### Task 11.3 — Contract Testing (Hook & API Payloads)

- [ ] 11.3.1 — Define JSON Schema contracts for all hook stdin/stdout payloads
- [ ] 11.3.2 — Define JSON Schema contracts for all HTTP API request/response shapes
- [ ] 11.3.3 — Write contract tests: verify hooks produce/consume payloads matching schema
- [ ] 11.3.4 — Write contract tests: verify server endpoints match documented API shapes
- [ ] 11.3.5 — Run test suite, linters, cleanup, pass CI

### Task 11.4 — Golden/Snapshot Testing (Hook State)

- [ ] 11.4.1 — Create golden file infrastructure: `.golden/` directory with expected hook outputs
- [ ] 11.4.2 — Write golden tests for each hook: capture session_state.json before/after, compare to golden file
- [ ] 11.4.3 — Write golden tests for event_log.jsonl output format
- [ ] 11.4.4 — Add golden file update command (`UPDATE_GOLDEN=1 bash test_hooks.sh`)
- [ ] 11.4.5 — Run test suite, linters, cleanup, pass CI

### Task 11.5 — Developer Experience (DX) Metrics

- [ ] 11.5.1 — Implement DX metrics collector in CI: test count, coverage %, hook latency, CI pass rate, PR lead time
- [ ] 11.5.2 — Create `docs/metrics/dx-dashboard.md` with baseline metrics
- [ ] 11.5.3 — Add DX metrics to control plane dashboard
- [ ] 11.5.4 — Track agent-generated code quality: defect density for AI vs human commits
- [ ] 11.5.5 — Run test suite, linters, cleanup, pass CI

---

## Phase 12 — Session Persistence & Operations

> Institutional memory across sessions. Spec: Part 8.

**Slush branch:** `phase-12/session-persistence`
**Definition of Done:** Ledger files persist across sessions. Handoff documents generated at session end. Session state committed to git. Decision log queryable.

### Task 12.1 — Ledger Files

- [ ] 12.1.1 — Write tests for ledger file creation and reading
- [ ] 12.1.2 — Implement ledger file writer: running log maintained by hooks, persists across sessions
- [ ] 12.1.3 — Implement ledger file reader at SessionStart: inject relevant history into context
- [ ] 12.1.4 — Run test suite, linters, cleanup, pass CI

### Task 12.2 — Handoff Documents

- [ ] 12.2.1 — Write tests for handoff document generation
- [ ] 12.2.2 — Implement session-end hook: generate narrative briefing for next session
- [ ] 12.2.3 — Implement handoff document reader at SessionStart: load previous session's briefing
- [ ] 12.2.4 — Run test suite, linters, cleanup, pass CI

### Task 12.3 — Git-Based State Persistence

- [ ] 12.3.1 — Write tests for git-based checkpoint workflow
- [ ] 12.3.2 — Implement session state commit: checkpoint state to git at task completion
- [ ] 12.3.3 — Implement branch-as-workstream: use git branches to represent parallel work
- [ ] 12.3.4 — Run test suite, linters, cleanup, pass CI

### Task 12.4 — Fleet Health Metrics & Adaptation

- [ ] 12.4.1 — Write tests for metrics emission and collection
- [ ] 12.4.2 — Implement structured metrics emission from hooks: throughput, quality, escalation frequency, cost per task
- [ ] 12.4.3 — Implement metrics collection pipeline: aggregate per-agent, per-session
- [ ] 12.4.4 — Implement trend analysis: detect improving/declining fleet performance over time
- [ ] 12.4.5 — Implement benchmark validation: compare actual metrics against targets in `benchmarks.md`
- [ ] 12.4.6 — Run test suite, linters, cleanup, pass CI

---

## Phase 13 — Cross-Platform Adapters & Config Ecosystem

> Beyond Claude Code: support Cursor, Windsurf, and direct API agents. Spec: Parts 2, 9.

**Slush branch:** `phase-13/cross-platform`
**Definition of Done:** At least one additional platform adapter (Cursor) works alongside Claude Code. Config ecosystem supports rule files, agent files, and skill files.

### Task 13.1 — Platform Adapter Abstraction

- [ ] 13.1.1 — Write tests for platform-agnostic hook contract
- [ ] 13.1.2 — Extract platform-agnostic hook contract from Claude Code adapters
- [ ] 13.1.3 — Define adapter interface: input translation, output translation, hook invocation
- [ ] 13.1.4 — Run test suite, linters, cleanup, pass CI

### Task 13.2 — Cursor Adapter

- [ ] 13.2.1 — Write tests for Cursor adapter
- [ ] 13.2.2 — Implement Cursor adapter: translate `.cursorrules` format to Admiral hook contract
- [ ] 13.2.3 — Document Cursor integration in `docs/adapters/cursor.md`
- [ ] 13.2.4 — Run test suite, linters, cleanup, pass CI

### Task 13.3 — Config Ecosystem

- [ ] 13.3.1 — Write tests for config file discovery and validation
- [ ] 13.3.2 — Implement rule file discovery: scan `.claude/rules/*.md` for path-scoped rules
- [ ] 13.3.3 — Implement agent definition files: `.claude/agents/*.md` for per-agent identity/authority
- [ ] 13.3.4 — Implement skill files: `.claude/skills/*.md` for progressive disclosure
- [ ] 13.3.5 — Implement config validation: enforce 150-line budget per file, check consistency
- [ ] 13.3.6 — Run test suite, linters, cleanup, pass CI

---

## Phase Dependencies

```
Phase 1 (Quality Foundation) — no dependencies, start here
Phase 2 (Standing Orders E3) — depends on Phase 1 (hook standardization)
Phase 3 (Brain B2) — depends on Phase 1 (testing infrastructure)
Phase 4 (Control Plane CP2) — depends on Phase 1 (TypeScript quality)
Phase 5 (Fleet Orchestration) — depends on Phases 2, 3, 4
Phase 6 (Brain B3) — depends on Phase 3 (B2 migration path)
Phase 7 (QA Pipeline) — depends on Phases 4, 5
Phase 8 (Zero-Trust) — depends on Phase 2 (enforcement patterns)
Phase 9 (Data Ecosystem) — depends on Phases 4, 5 (control plane + orchestration)
Phase 10 (Meta-Agent) — depends on Phases 5, 6, 7
Phase 11 (Novel Practices) — depends on Phase 1 (testing infrastructure)
Phase 12 (Session Persistence) — depends on Phase 3 (Brain B2)
Phase 13 (Cross-Platform) — depends on Phase 2 (hook contracts)
```

## Profile Advancement Gates

| Profile | Requirements | Phases Required |
|---------|-------------|-----------------|
| **Starter (F1, E1, B1)** | ✅ Current state | — |
| **Team (F2, E2, B2)** | Fleet orchestration, 12/16 SO enforcement, Brain B2, CP2 | 1, 2, 3, 4, 5 |
| **Governed (F3, E3, B3)** | Meta-agent, A2A protocol, Brain B3, QA pipeline, Data Ecosystem | 6, 7, 8, 9, 10 |

## Summary Statistics

| Metric | Count |
|--------|-------|
| Phases | 13 |
| Tasks | 58 |
| Subtasks | 235 |
| Estimated sessions | 40-60 |

---

## References

- [aiStrat/admiral/spec/](aiStrat/admiral/spec/) — Full Admiral Framework specification
- [admiral/IMPLEMENTATION_STATUS.md](admiral/IMPLEMENTATION_STATUS.md) — Current implementation status
- [research/pristine-github-repositories.md](research/pristine-github-repositories.md) — Pristine codebase patterns
- [research/pristine-repos-gap-analysis.md](research/pristine-repos-gap-analysis.md) — Gap analysis
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contributor guide
- [AGENTS.md](AGENTS.md) — Agent governance and decision authority
