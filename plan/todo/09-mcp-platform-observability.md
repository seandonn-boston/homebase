# TODO: MCP Integration, Platform Adapters & Observability

> Source: stream-16-mcp-integration.md (M-01 to M-14), stream-17-platform-adapters.md (PA-01 to PA-13), stream-25-observability.md (OB-01 to OB-15)

MCP is the protocol bridge between agents and the Admiral framework. Platform adapters decouple governance from any single tool. Observability makes the invisible visible. Together, these three streams connect agents to tools, extend Admiral beyond Claude Code, and ensure operators can see everything happening in the fleet.

---

## MCP Server Core

- [ ] **M-01a: Core MCP server implementation** — Create MCP server with JSON-RPC protocol, tool discovery, concurrent request handling, stdio and HTTP+SSE transports; lightweight with zero heavy runtime dependencies.
- [ ] **M-01b: MCP server configuration** — Configuration system for tool enablement, agent-to-tool access mappings, permission scoping, version pinning, trust classification; per-project overrides; validated at startup.
- [ ] **M-09: MCP server health endpoint and usage metrics** — `/health` endpoint with server status, uptime, connected clients, tool availability, storage backend health; usage metrics (requests per tool/agent, latency percentiles, error rates, token consumption).

## MCP Tools

### Brain Tools

- [ ] **M-02a: brain_query tool** — Semantic search across Brain entries with category/scope/temporal filters; B1 keyword matching, B2+ embeddings; universal tool available to all agents.
- [ ] **M-02b: brain_record tool** — Create new Brain entries with required field enforcement, duplicate detection; writes to B1 markdown or B2+ SQLite.
- [ ] **M-02c: brain_retrieve and brain_strengthen tools** — `brain_retrieve` fetches by ID with configurable link traversal depth; `brain_strengthen` increments usefulness score with agent attribution.
- [ ] **M-02d: brain_audit and brain_purge tools (Governed+)** — Admiral-only tools; `brain_audit` returns chronological audit trail; `brain_purge` permanently deletes with confirmation and self-audit record.

### Fleet Tools

- [ ] **M-03a: Fleet status tool** — `fleet_status` returns active agents, queued tasks, budget utilization, alert summary; filterable by role, health, task state.
- [ ] **M-03b: Agent registry query tool** — `agent_registry` accepts capability queries, returns matching agents ranked by relevance with availability and model tier.
- [ ] **M-03c: Task routing tool** — `task_route` returns routing recommendation with confidence score; read-only, does not assign tasks.

### Governance Tools

- [ ] **M-04a: Standing order status tool** — `standing_order_status` returns all Standing Orders with enforcement status, violation count, last violation timestamp.
- [ ] **M-04b: Compliance check tool** — `compliance_check` validates proposed actions against Standing Orders and boundaries; returns pass/fail with specific violation references.
- [ ] **M-04c: Escalation filing tool** — `escalation_file` creates structured escalation records routable to Orchestrator or Admiral based on severity; persisted for audit trail.

## MCP Auth & Security

- [ ] **M-05a: Identity token implementation** — Zero-trust identity verification; cryptographically signed tokens with agent_id, role, project_id, session_id, issued_at, expires_at; epoch-based fleet-wide revocation.
- [ ] **M-05b: Role-based access control** — RBAC middleware enforcing per-tool permissions from identity token role; configurable permission matrix; unauthorized calls rejected with clear error.
- [ ] **M-06: JSON Schema definitions for all MCP tools** — Input, output, and error schemas for all tools (Brain 6+, Fleet 3, Governance 3); served via tool discovery; versioned; validated at server level.
- [ ] **M-07a: Connection and permission tests (Level 1-2)** — Level 1: connectivity, tool discovery, minimal valid calls; Level 2: minimum-permission credentials, out-of-scope rejection, escalation prevention.
- [ ] **M-07b: Identity and integration tests (Level 3-4)** — Level 3: valid/no/expired/wrong-project/wrong-role/revoked tokens; Level 4: full Brain lifecycle through MCP.
- [ ] **M-07c: Security tests (Level 5)** — OWASP MCP Top 10: SSRF, injection, excessive permissions, undeclared egress monitoring.
- [ ] **M-08: Lightweight MCP client SDK** — Connection management (stdio + HTTP+SSE), tool discovery, auto token injection, typed errors, retry with exponential backoff; consumable by platform adapters.

## MCP Behavioral Security

- [ ] **M-10: Behavioral baselining — mcp_behavior_monitor hook** — PostToolUse hook recording per-server, per-tool behavioral baselines (response size, latency, egress, error rates); alerts on shadow tools, exfiltration signals, C2 latency patterns, covert channels; baselines reset on version update.
- [ ] **M-11: Trust decay for MCP servers** — Scheduled re-verification on configurable cadence; tool discovery diff triggers trust freeze; passive trust decay on missed verification windows; converts trust from ratchet to equilibrium.
- [ ] **M-12: Tool manifest snapshot and continuous comparison** — Cryptographic snapshot at registration; runtime periodic comparison; new/changed tools blocked until re-vetted; description drift detection catches tool poisoning.
- [ ] **M-13: Version pinning with binary hash verification** — SHA-256+ hash recorded at registration; verified before every server start; mismatch blocks startup, drops trust to zero; defends against rug pull scenarios.
- [ ] **M-14: Canary operations framework** — Inject known-safe canary data at randomized intervals; verify unmodified passage; detect canary in egress traffic (exfiltration); canaries indistinguishable from real inputs.

---

## Platform Adapter Interface

- [ ] **PA-01: Abstract platform adapter interface** — TypeScript interface covering lifecycle hooks, context injection, tool permission enforcement, configuration loading, event emission, subagent coordination; minimal contract with typed inputs/outputs.
- [ ] **PA-07: Platform capability matrix** — Comprehensive matrix documenting feature coverage per platform (Claude Code, Cursor, Windsurf, API-direct, VS Code); Full/Partial/None ratings with limitation notes.
- [ ] **PA-08: Shared adapter test suite** — Standardized test cases for every interface method; all adapters import and pass the shared suite; extension points for platform-specific tests.
- [ ] **PA-09: Platform-specific context injection** — Per-platform context injection strategies respecting size limits; priority budget allocation (Identity/Authority/Constraints never truncated); context sufficiency verification.

## Platform Adapter Implementations

- [ ] **PA-02a: Claude Code adapter refactor** — Extract all Claude Code-specific logic into `platform/claude-code/`; adapter translates hook payloads, context injection, config loading; no behavior change to existing hooks.
- [ ] **PA-02b: Claude Code adapter tests** — Full coverage of adapter interface; valid and invalid inputs; backward compatibility verification; test patterns documented as templates.
- [ ] **PA-03: Cursor IDE adapter** — Translate standing orders into `.cursorrules`; map tool permissions to Cursor's model; gap analysis documenting full/partial/none feature coverage.
- [ ] **PA-04: Windsurf/Codeium IDE adapter** — Translate governance into `.windsurfrules`; handle Cascade flows and multi-step execution; gap analysis.
- [ ] **PA-05: Headless API-direct adapter** — For CI/CD pipelines and scripted usage; lifecycle hooks as function calls; programmatic context assembly; JSON-lines event emission.
- [ ] **PA-06: VS Code extension scaffold** — Fleet status sidebar, agent identity status bar, alert notifications; communicates with MCP server for fleet data.
- [ ] **PA-10: Event-driven agent framework** — Trigger patterns: PR opened, CI failure, issue created, webhook, monitor finding; each with authority level, allowed actions, result routing, cost cap.
- [ ] **PA-11: Headless agent authority narrowing** — Default headless agents to Autonomous-1 tier; cannot merge PRs, delete branches, modify production infrastructure; enforced by hook.
- [ ] **PA-12: Scheduled agent runner** — Cron-like scheduler for maintenance agents (knowledge gardening, stale cleanup, health reports); config-driven with cost circuit breakers and monthly budget ceilings.
- [ ] **PA-13: Context bootstrap for headless agents** — Automated context assembly: load event payload, load Ground Truth, query Brain, apply scope constraints, configure result routing.

---

## Observability Stack

### Competitive Urgency

Ship causality tracing (OB-02 + OB-09) within **90 days** — before Perplexity Computer exposes subagent trace trees. Admiral's cross-platform tracing (CLI + API + browser + backend) is the defensible differentiator vs. single-surface competitors. Tracing data feeds the Brain, creating compounding value.

### Logging & Tracing Foundation

- [ ] **OB-01: Structured logging standard** — JSON logging across all components; required fields: timestamp, level, component, correlation ID, message, context; `log_structured` for hooks, structured logger for control plane.
- [ ] **OB-02: Distributed tracing** — Trace ID at session start, span IDs with parent-child relationships; propagated through hooks, control plane, brain; OpenTelemetry-compatible format; trace reconstruction by session ID.

### Metrics & Health

- [ ] **OB-03: Metrics collection** — Prometheus-compatible `/metrics` endpoint; hook latency histograms, pass/fail counters, event throughput, brain query latency, active sessions, governance overhead ratio.
- [ ] **OB-04: Health check aggregation** — `/health` endpoint aggregating component probes (hooks, control plane, brain, event log); healthy/degraded/unhealthy with diagnostics; responds in < 500ms.
- [ ] **OB-08: SLO/SLI definitions** — SLIs for all 7 core benchmarks (hook latency p99 < 100ms, governance overhead < 15%, etc.); 30-day rolling error budgets; alerts on excessive budget consumption.

### Alerting & Log Management

- [ ] **OB-05: Alert routing rules** — Route by severity (critical/high/medium/low) to configurable channels; deduplication, escalation on unacknowledged, suppression during maintenance; webhook delivery.
- [ ] **OB-06: Log aggregation** — Centralize all component logs into queryable append-only store; time/component/level/correlation-ID/full-text filters; rotation with configurable retention; query < 1s for 24h span.

### Visualization & Analysis

- [ ] **OB-07: Dashboard improvements** — Real-time event timeline, hook execution visualization (latency sparklines, pass/fail), brain query log with relevance scores; auto-refresh.
- [ ] **OB-09: Incident timeline reconstruction** — Given session ID, reconstruct complete chronological timeline with causal links; flag anomalies; < 5s for 1000 events; markdown and JSON output.
- [ ] **OB-10: Performance regression detection** — Compare current metrics against statistical baselines (rolling averages + stddev); detect > 20% latency increase, > 20% throughput decrease; run in CI per PR; auto-update baselines on merge.

## Fleet Control Plane Authorization & Tracing

- [ ] **OB-16: Intervention authorization model** — Authorization checks for all 10 intervention types per Fleet Control Plane Extension: any operator (pause agent, emergency halt), operator-level (kill task, adjust budget, override Propose-tier, reroute, promote/demote tier), owner-level (modify policies). Emergency halt callable by any tier; resume requires Owner. 403 on authorization failure.
- [ ] **OB-17: Canonical trace format specification** — JSON schema for fleet-wide causality tracing: trace ID, spans with parent-child relationships, causal links across tasks, agent identity per span, cost attribution, governance metadata. OpenTelemetry-exportable. Foundation for OB-02 and OB-09.

## Control Plane

- [ ] **OB-11: CP1 — CLI Dashboard baseline** — JSON-lines event logging (ts, event, agent, tool, duration_ms, tokens); terminal status display with agent state, task progress, token budget bar, error/retry counts; runaway detection (loop at 3+ errors, budget advisory at 90%+, idle detection).
- [ ] **OB-12: CP2 — Fleet Dashboard** — Fleet status answering five questions (running, healthy, consuming, attention, recent); agent detail drill-down; task flow visualization; four-tier alert system with fatigue prevention.
- [ ] **OB-13: CP3 — Governance Dashboard** — Governance agent health monitoring; decision authority visualization; intervention audit trail; policy management interface.
- [ ] **OB-14: Intervention catalog** — 10 operator actions: pause agent, pause fleet, emergency halt, kill task, adjust budget, override decision, reroute task, promote/demote tier, modify policy, inject context; each with confirmation, audit logging, reversal path.
- [ ] **OB-15: Session thermal model** — Budget as descriptive not prescriptive; budgets default to 0 (unlimited); warnings via additionalContext at advisory checkpoints; sessions can run "hot" without hard blocks.

---

## Dependencies

| Task | Depends on | Downstream |
|------|-----------|------------|
| M-01a | — | M-01b, M-09, M-10, M-12, M-14, PA-06, all MCP tools |
| M-01b | M-01a | M-11 |
| M-02a-d | M-01a | M-07b |
| M-03b | M-01a, Stream 14 F-13 (agent capability registry) | — |
| M-03c | M-01a, Stream 15 O-01 (routing engine) | — |
| M-05a | — | M-05b, M-07b |
| M-05b | M-05a | — |
| M-06 | M-02, M-03, M-04 (all tools defined) | M-07a |
| M-07b | M-05a, M-02a-c | — |
| M-08 | M-01a | PA-02a, PA-03, PA-04, PA-05, PA-06 |
| M-09 | M-01a | M-10, OB-03 (metrics integration) |
| M-10 | M-01a, M-09 | M-14 |
| M-11 | M-01b | — |
| M-12 | M-01a | — |
| M-14 | M-10 | — |
| PA-01 | — | PA-02a, PA-03, PA-04, PA-05, PA-06, PA-08, PA-09 |
| PA-02a | PA-01 | PA-02b, PA-07, PA-08 |
| PA-02b | PA-02a | — |
| PA-03 | PA-01 | PA-07 |
| PA-04 | PA-01 | PA-07 |
| PA-05 | PA-01 | PA-07 |
| PA-06 | PA-01, M-01a | PA-07 |
| PA-07 | PA-02a, PA-03, PA-04, PA-05, PA-06 | — |
| PA-08 | PA-01, PA-02a | — |
| PA-09 | PA-01, Stream 15 O-03a (context assembly) | — |
| OB-01 | — | OB-02, OB-06 |
| OB-02 | OB-01 | OB-09 |
| OB-03 | — | OB-05, OB-07, OB-08, OB-10 |
| OB-04 | — | OB-05, OB-07 |
| OB-05 | OB-03, OB-04 | — |
| OB-06 | OB-01 | OB-09 |
| OB-07 | OB-03, OB-04 | — |
| OB-08 | OB-03 | — |
| OB-09 | OB-02, OB-06 | — |
| OB-10 | OB-03 | — |
| OB-11 | — | OB-12 |
| OB-12 | OB-11 | OB-13 |
| OB-13 | OB-12, Stream 19 MG-01 | — |
| OB-14 | — | — |
| OB-15 | — | — |
