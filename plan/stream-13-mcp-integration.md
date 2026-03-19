# Stream 13: MCP Integration — Model Context Protocol Implementation

> *"MCP connects agents to tools. USB-C for AI." — Admiral Spec, Part 4*

**Scope:** This stream implements the MCP server that exposes Admiral capabilities as tools that AI models can call. Based on Part 13 of the spec, it covers the MCP server scaffold, Brain tools, Fleet tools, Governance tools, authentication, schema definitions, integration tests, client SDK, and server health/metrics. The MCP server is the protocol bridge between agents and the Admiral framework — without it, agents cannot query the Brain, check fleet status, or interact with governance infrastructure programmatically.

**Current state:** The spec defines 8 Brain MCP tools (`brain_query`, `brain_record`, `brain_retrieve`, `brain_strengthen`, `brain_supersede`, `brain_audit`, `brain_purge`, `brain_context_router`), references Fleet and Governance MCP surfaces, and provides a full incremental adoption path (Phase 0-5). None of this is implemented. The Brain exists only at B1 (file-based, manual creation). MCP server selection, testing, and security frameworks are specified but not built.

**Why this matters:** MCP is the universal tool access protocol for the fleet. Every agent needs Brain tools to query institutional memory before making decisions. The Orchestrator needs Fleet tools to check agent availability and route tasks. Governance agents need Governance tools to check compliance and file escalations. Without the MCP server, agents are disconnected from the framework's intelligence layer.

---

## M-01: MCP Server Scaffold

- [ ] **M-01a: Core MCP server implementation**
  - **Description:** Create the MCP server that hosts Admiral tools. The server must implement the MCP protocol (JSON-RPC based), support tool discovery (clients can query available tools), and handle concurrent requests from multiple agents. Must support both stdio transport (for local/CLI usage) and HTTP+SSE transport (for networked usage). The server should be lightweight with zero heavy runtime dependencies, consistent with the project's dependency philosophy.
  - **Done when:** MCP server starts, accepts connections via stdio and HTTP+SSE, responds to tool discovery requests with the full tool catalog, handles concurrent requests without race conditions. Health check endpoint responds. Server logs all requests with agent identity and timestamps.
  - **Files:** `mcp-server/src/server.ts` (new), `mcp-server/src/transport.ts` (new), `mcp-server/src/registry.ts` (new), `mcp-server/package.json` (new), `mcp-server/tsconfig.json` (new)
  - **Size:** L
  - **Spec ref:** Part 13 — MCP Server Selection Framework, Part 4 — Protocol Integration

- [ ] **M-01b: MCP server configuration**
  - **Description:** Create configuration system for the MCP server: which tools are enabled, which agents can access which tools, permission scoping per tool, version pinning, and trust classification (official/internal). Configuration must follow the Server Addition Checklist from Part 13 Section 2. Must support per-project configuration overrides.
  - **Done when:** Server reads configuration from a config file. Tools can be enabled/disabled per deployment. Agent-to-tool access mappings are enforced. Configuration changes require server restart (no hot-reload of security boundaries). Configuration schema is validated at startup.
  - **Files:** `mcp-server/src/config.ts` (new), `mcp-server/config.schema.json` (new), `mcp-server/config.default.json` (new)
  - **Size:** M
  - **Spec ref:** Part 13 Section 2 — MCP Server Selection Framework

---

## M-02: Brain MCP Tools

- [ ] **M-02a: brain_query tool**
  - **Description:** Implement the `brain_query` MCP tool — semantic search across Brain entries. Accepts a natural language query and returns matching entries ranked by relevance. Must support filtering by category (DECISION, CONTEXT, PATTERN, OUTCOME), project scope, and temporal range. At B2+, uses embeddings for semantic search. At B1, falls back to keyword matching. Must be available to all agents (universal tool per Part 4).
  - **Done when:** `brain_query` accepts query string and optional filters, returns ranked results with similarity scores. B1 mode uses keyword matching against file-based Brain. Results include entry ID, title, category, relevance score, and summary. Tool schema is defined and validated.
  - **Files:** `mcp-server/src/tools/brain-query.ts` (new), `mcp-server/src/tools/brain-query.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 5 — Brain Architecture, Part 4 — Brain Tools (Universal)

- [ ] **M-02b: brain_record tool**
  - **Description:** Implement the `brain_record` MCP tool — create a new Brain entry. Accepts category, title, content, metadata (project, agent_id, trace_id), and optional links to related entries. Must enforce required fields per the Brain entry schema. Must record at chunk boundaries, after significant decisions, and after resolving novel failures. At B1, writes to markdown files. At B2+, writes to SQLite with embeddings.
  - **Done when:** `brain_record` creates Brain entries with all required fields. Entry is persisted in the appropriate storage backend (B1 file or B2 database). Duplicate detection prevents recording identical entries. Tool schema is defined and validated.
  - **Files:** `mcp-server/src/tools/brain-record.ts` (new), `mcp-server/src/tools/brain-record.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 5 — Brain Architecture, Part 4 — Brain Tools (Universal)

- [ ] **M-02c: brain_retrieve and brain_strengthen tools**
  - **Description:** Implement `brain_retrieve` (fetch specific entry by ID with link traversal) and `brain_strengthen` (signal that a retrieved entry was useful, incrementing its usefulness score). `brain_retrieve` must follow linked entries to provide full context chains. `brain_strengthen` must update the entry's usefulness score and record which agent found it useful, enabling quality-based ranking over time.
  - **Done when:** `brain_retrieve` fetches entries by ID, follows links to related entries (configurable depth), returns the full context chain. `brain_strengthen` increments usefulness score with agent attribution. Both tools have defined schemas and pass validation.
  - **Files:** `mcp-server/src/tools/brain-retrieve.ts` (new), `mcp-server/src/tools/brain-strengthen.ts` (new), `mcp-server/src/tools/brain-retrieve.test.ts` (new), `mcp-server/src/tools/brain-strengthen.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 5 — Brain Architecture, Part 4 — Brain Tools (Universal)

- [ ] **M-02d: brain_audit and brain_purge tools (Governed+)**
  - **Description:** Implement `brain_audit` (Admiral-only tool that returns the complete audit trail of all Brain operations with agent identity and timestamps) and `brain_purge` (Admiral-only tool for regulatory compliance that permanently deletes entries matching criteria). Both are restricted to Admiral role only. `brain_purge` requires confirmation and produces an audit record of the purge itself.
  - **Done when:** `brain_audit` returns chronological audit trail filterable by agent, time range, and operation type. `brain_purge` deletes matching entries with confirmation step and audit record. Both tools reject non-Admiral callers. Role-based access control is enforced at the MCP server level.
  - **Files:** `mcp-server/src/tools/brain-audit.ts` (new), `mcp-server/src/tools/brain-purge.ts` (new), `mcp-server/src/tools/brain-audit.test.ts` (new), `mcp-server/src/tools/brain-purge.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 5 — Brain Architecture, Part 13 Phase 4 — Full MCP Governance

---

## M-03: Fleet MCP Tools

- [ ] **M-03a: Fleet status tool**
  - **Description:** Implement `fleet_status` MCP tool — returns current fleet state: active agents (name, role, model tier, current task, health status), queued tasks, budget utilization, and alert summary. This is the programmatic equivalent of the CP2 Fleet Status View. Must support filtering by agent role, health status, or task state.
  - **Done when:** `fleet_status` returns structured fleet state. Agents can query fleet status to make routing decisions. Response includes agent count, task counts (active/queued/blocked), budget summary, and active alerts. Tool schema is defined.
  - **Files:** `mcp-server/src/tools/fleet-status.ts` (new), `mcp-server/src/tools/fleet-status.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Fleet Control Plane extension — CP2 Fleet Status View

- [ ] **M-03b: Agent registry query tool**
  - **Description:** Implement `agent_registry` MCP tool — query the agent capability registry to find agents matching capability requirements. Accepts a capability query (task type, required tools, or free-text description) and returns matching agents with their capabilities, availability, and model tier. This enables the Orchestrator to discover agents programmatically rather than relying on hard-coded routing tables.
  - **Done when:** `agent_registry` accepts capability queries and returns matching agents ranked by relevance. Results include agent name, capabilities, availability status, model tier, and file ownership patterns. Tool schema is defined.
  - **Files:** `mcp-server/src/tools/agent-registry.ts` (new), `mcp-server/src/tools/agent-registry.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 4 — Tool & Capability Registry
  - **Depends on:** Stream 11 F-13 (agent capability registry)

- [ ] **M-03c: Task routing tool**
  - **Description:** Implement `task_route` MCP tool — given a task description, returns the recommended agent assignment using the routing engine (Stream 12, O-01). This allows any agent to suggest routing for discovered work without being the Orchestrator. The tool returns the routing decision (agent, confidence, fallback) but does not execute the assignment — only the Orchestrator can assign tasks.
  - **Done when:** `task_route` accepts task description and returns routing recommendation with confidence score. Tool is read-only (does not assign tasks). Routing uses the full routing chain (task-type -> file-ownership -> capability-match). Tool schema is defined.
  - **Files:** `mcp-server/src/tools/task-route.ts` (new), `mcp-server/src/tools/task-route.test.ts` (new)
  - **Size:** M
  - **Spec ref:** `fleet/routing-rules.md`, Part 4 — Routing Logic
  - **Depends on:** Stream 12 O-01 (routing engine)

---

## M-04: Governance MCP Tools

- [ ] **M-04a: Standing order status tool**
  - **Description:** Implement `standing_order_status` MCP tool — returns the current enforcement status of all Standing Orders: which are active, which are suspended, which have been violated in the current session, and violation counts. This enables governance agents to monitor Standing Order compliance programmatically.
  - **Done when:** `standing_order_status` returns all Standing Orders with enforcement status, violation count, and last violation timestamp. Governance agents can query this to detect enforcement gaps. Tool schema is defined.
  - **Files:** `mcp-server/src/tools/standing-order-status.ts` (new), `mcp-server/src/tools/standing-order-status.test.ts` (new)
  - **Size:** S
  - **Spec ref:** Part 3 — Enforcement

- [ ] **M-04b: Compliance check tool**
  - **Description:** Implement `compliance_check` MCP tool — validates a proposed action or output against applicable Standing Orders, boundaries, and constraints. Returns pass/fail with specific violations cited. This is the programmatic equivalent of the governance review that currently happens through hooks.
  - **Done when:** `compliance_check` accepts a proposed action description and returns compliance verdict with specific Standing Order or boundary references for any violations. False negatives (passing a non-compliant action) are treated as critical bugs. Tool schema is defined.
  - **Files:** `mcp-server/src/tools/compliance-check.ts` (new), `mcp-server/src/tools/compliance-check.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 3 — Enforcement, Part 4 — Fleet Composition (governance agents)

- [ ] **M-04c: Escalation filing tool**
  - **Description:** Implement `escalation_file` MCP tool — allows any agent to file a structured escalation to the Orchestrator or Admiral. Escalation includes: escalation type, description, severity, context, recommended resolution, and the agent's identity. This formalizes the escalation protocol as a tool call rather than requiring agents to format escalation reports manually.
  - **Done when:** `escalation_file` creates structured escalation records routable to the Orchestrator or Admiral based on severity. Escalations are persisted for audit trail. Escalation queue is queryable via `fleet_status`. Tool schema is defined.
  - **Files:** `mcp-server/src/tools/escalation-file.ts` (new), `mcp-server/src/tools/escalation-file.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 11 — Escalation Protocol, `fleet/interface-contracts.md` (Orchestrator -> Admiral Escalation)

---

## M-05: MCP Authentication and Authorization

- [ ] **M-05a: Identity token implementation**
  - **Description:** Implement the zero-trust identity verification system for MCP requests. Every MCP request must include a verifiable identity token containing: agent_id, role, project_id, session_id, issued_at, expires_at. Tokens are cryptographically signed. The MCP server validates tokens on every request — no request without a valid token is processed. Must support token lifecycle: issuance at session start, validation on every call, expiration after session end, and revocation (individual and fleet-wide via epoch mechanism).
  - **Done when:** Identity tokens are issued at agent session start, included in every MCP request, validated by the server, and rejected when invalid/expired/revoked. Emergency fleet-wide revocation via epoch increment works. Token format follows Part 5 Token Format Contract.
  - **Files:** `mcp-server/src/auth/tokens.ts` (new), `mcp-server/src/auth/tokens.test.ts` (new), `mcp-server/src/auth/middleware.ts` (new), `mcp-server/src/auth/middleware.test.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 5 — Zero-Trust Identity Verification, Part 13 Phase 4

- [ ] **M-05b: Role-based access control**
  - **Description:** Implement role-based access control for MCP tools. Different agent roles have access to different tools. Example: `brain_audit` and `brain_purge` are Admiral-only. `fleet_status` may be accessible to all agents but with filtered data (agents see their own status; Orchestrator sees all agents). Permission matrix must be configurable and enforced at the MCP server level, not at the tool level.
  - **Done when:** Access control middleware enforces per-tool permissions based on the caller's role from their identity token. Unauthorized tool calls are rejected with a clear "insufficient permissions" error. Permission matrix is configurable via server config. Tests verify access control for every tool with both authorized and unauthorized callers.
  - **Files:** `mcp-server/src/auth/rbac.ts` (new), `mcp-server/src/auth/rbac.test.ts` (new), `mcp-server/src/auth/permissions.json` (new)
  - **Size:** M
  - **Spec ref:** Part 5 — Zero-Trust Identity Verification
  - **Depends on:** M-05a

---

## M-06: MCP Tool Schema Definitions

- [ ] **M-06: JSON Schema definitions for all MCP tools**
  - **Description:** Create formal JSON Schema definitions for all MCP tool inputs and outputs. Each tool must have: input schema (parameters with types, required fields, validation rules), output schema (return type with all fields typed), and error schema (error codes, messages, recovery hints). Schemas must be served via the MCP tool discovery endpoint so clients can validate before calling. Schemas must be versioned.
  - **Done when:** Every MCP tool (Brain: 6+, Fleet: 3, Governance: 3) has input, output, and error JSON Schemas. Schemas are served via tool discovery. Schema validation is enforced at the server level (invalid inputs are rejected before tool execution). All schemas are versioned with a schema version field.
  - **Files:** `mcp-server/schemas/brain-query.schema.json` (new), `mcp-server/schemas/brain-record.schema.json` (new), `mcp-server/schemas/brain-retrieve.schema.json` (new), `mcp-server/schemas/brain-strengthen.schema.json` (new), `mcp-server/schemas/brain-audit.schema.json` (new), `mcp-server/schemas/brain-purge.schema.json` (new), `mcp-server/schemas/fleet-status.schema.json` (new), `mcp-server/schemas/agent-registry.schema.json` (new), `mcp-server/schemas/task-route.schema.json` (new), `mcp-server/schemas/standing-order-status.schema.json` (new), `mcp-server/schemas/compliance-check.schema.json` (new), `mcp-server/schemas/escalation-file.schema.json` (new) (all new)
  - **Size:** L
  - **Spec ref:** Part 13, Part 5 — The Knowledge Protocol

---

## M-07: MCP Integration Tests

- [ ] **M-07a: Connection and permission tests (Level 1-2)**
  - **Description:** Implement MCP test Levels 1 and 2 from Part 13 Section 3. Level 1 (Connection Validation): connect to server, discover tools, verify tool list matches expected set, call each tool with minimal valid parameters, verify response format. Level 2 (Permission Boundary): configure minimum-permission credentials, verify permitted operations succeed, verify out-of-scope operations fail explicitly (not silently), verify permission escalation fails.
  - **Done when:** Level 1 tests verify connectivity and tool discovery for the Admiral MCP server. Level 2 tests verify permission boundaries for each role (Admiral, Orchestrator, Specialist, Governance). All tests pass. Tests are runnable in CI.
  - **Files:** `mcp-server/tests/level1-connection.test.ts` (new), `mcp-server/tests/level2-permissions.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 13 Section 3 — MCP Testing and Validation

- [ ] **M-07b: Identity and integration tests (Level 3-4)**
  - **Description:** Implement MCP test Levels 3 and 4 from Part 13 Section 3. Level 3 (Identity and Access Control): test with valid token, no token, expired token, wrong-project token, wrong-role token, revoked token — only valid tokens succeed. Level 4 (Integration): full lifecycle test — brain_record -> brain_query -> brain_strengthen -> brain_supersede -> brain_query with current_only=true -> verify audit_log.
  - **Done when:** Level 3 tests verify zero-trust identity enforcement. Level 4 tests verify full Brain lifecycle through MCP. All tests pass. Tests are runnable in CI.
  - **Files:** `mcp-server/tests/level3-identity.test.ts` (new), `mcp-server/tests/level4-integration.test.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 13 Section 3 — MCP Testing and Validation
  - **Depends on:** M-05a, M-02a, M-02b, M-02c

- [ ] **M-07c: Security tests (Level 5)**
  - **Description:** Implement MCP test Level 5 from Part 13 Section 3 (OWASP MCP Top 10 Validation). Test for: SSRF (send internal network URLs as parameters), injection (shell metacharacters, SQL fragments, path traversal in tool parameters), excessive permissions (compare granted vs. minimum required), and egress monitoring (verify no undeclared outbound connections during test run).
  - **Done when:** All OWASP MCP Top 10 tests pass. No injection vectors succeed. No SSRF is possible. Permission scope matches minimum required. No undeclared egress detected. Tests are runnable in CI.
  - **Files:** `mcp-server/tests/level5-security.test.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 13 Section 3 — Level 5 Security Testing

---

## M-08: MCP Client SDK

- [ ] **M-08: Lightweight MCP client SDK**
  - **Description:** Create a lightweight client library for interacting with the Admiral MCP server. The SDK must handle: connection management (stdio and HTTP+SSE), tool discovery, request/response serialization, identity token injection (automatic inclusion in every request), error handling with typed errors, and retry logic (exponential backoff for transient failures). The SDK is used by platform adapters (Stream 14) and by agents that need programmatic access to Admiral tools.
  - **Done when:** SDK connects to the Admiral MCP server via both transports. All tools are callable through typed wrapper functions. Identity tokens are automatically injected. Errors are typed and include recovery hints. Retry logic handles transient failures. SDK is published as a package consumable by platform adapters.
  - **Files:** `mcp-server/client/index.ts` (new), `mcp-server/client/types.ts` (new), `mcp-server/client/connection.ts` (new), `mcp-server/client/tools.ts` (new), `mcp-server/client/client.test.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 13, Part 4 — Protocol Integration

---

## M-09: MCP Server Health and Metrics

- [ ] **M-09: MCP server health endpoint and usage metrics**
  - **Description:** Implement a health endpoint (`/health`) and usage metrics collection for the MCP server. Health endpoint returns: server status, uptime, connected clients, tool availability, and storage backend health (Brain database connectivity). Usage metrics track: requests per tool, requests per agent, latency percentiles (p50/p95/p99), error rates, and token consumption per tool call. Metrics feed the Fleet Control Plane for MCP server monitoring.
  - **Done when:** Health endpoint responds with structured health data. Usage metrics are collected for every tool call. Metrics are queryable via API. Latency percentiles are calculated. Error rates are tracked per tool. Metrics data is available for the Fleet Control Plane to consume.
  - **Files:** `mcp-server/src/health.ts` (new), `mcp-server/src/metrics.ts` (new), `mcp-server/src/health.test.ts` (new), `mcp-server/src/metrics.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 9 — Fleet Observability, Part 13
