# Stream 23: Governance Platform — Admiral as a Service

> *"Products that win the infrastructure layer become the place operators live." — Admiral Framework, governance-platform.md*

**Scope:** Transform Admiral from a local development tool into a deployable governance platform. Based on the governance platform extension document. This stream builds the API layer, multi-tenant support, policy management, and integration capabilities that allow Admiral to serve as the operational environment where AI agent fleets are governed — not just a local configuration, but a shared service that teams build their workflows around.

**Why this matters:** Admiral's governance capabilities (policy enforcement, fleet visibility, audit trails, trust calibration) are currently embedded in local configuration files and hooks. This works for a single developer, but teams need shared governance — consistent policies across agents, centralized audit trails, real-time fleet visibility for all operators, and integration with existing operational tooling (Slack, Jira, PagerDuty). The governance platform makes Admiral the air traffic control tower, not just a flight manual.

**Competitive context:** The governance platform extension (`aiStrat/admiral/extensions/governance-platform.md`) defines four pillars: **Visibility** (fleet status, task progress, resource consumption, decision history, failure patterns), **Control** (emergency halt to authority override), **Policy** (hard limits to Standing Orders), and **Recovery** (self-healing to escalation). The "good enough" stack risk (StrongDM Leash + Perplexity Computer + Comet Enterprise) covers enforcement, orchestration, and browser governance as point solutions — but none offer the unified governance platform that this stream builds. Admiral's progression from Useful → Operational → Essential → **Indispensable** depends on this stream making governance the operational environment teams build workflows around, not an optional utility alongside their tools. The chaos-first architecture principle applies: real fleets are messy; infrastructure must handle this, not enforce elegance.

**Prerequisite awareness:** This stream depends heavily on core governance capabilities being stable (Streams 16-19). The API server (GP-01) can begin early, but multi-tenant support (GP-03) and policy language (GP-04) require the governance rule engine (MG-06) and intent schema (IE-01) to be in place.

---

## 23.1 Core Platform

- [ ] **GP-01: Governance API server**
  - **Description:** Implement a REST API server exposing all governance capabilities. The server provides a unified interface for: policy management (create, read, update, deactivate governance policies), agent management (view fleet composition, agent status, trust calibration), audit trail access (query governance events, interventions, escalation history), fleet health (real-time metrics, predictions, alerts), and Brain access (knowledge search, entry management). The API follows REST conventions with JSON request/response bodies. The server builds on the existing control plane server architecture (`control-plane/src/server.ts`) and extends it with governance-specific endpoints. Authentication is required for all endpoints. API versioning (`/api/v1/...`) supports future evolution without breaking clients.
  - **Done when:** API server starts and serves governance endpoints. At minimum: `GET /api/v1/health` (server health), `GET /api/v1/fleet/status` (fleet overview), `GET /api/v1/policies` (list policies), `GET /api/v1/audit/events` (query audit trail). Authentication is enforced. API versioning is in place. Tests verify all endpoints with valid and invalid requests, authentication enforcement, and error handling.
  - **Files:** `control-plane/src/governance-api.ts` (new), `control-plane/src/governance-api.test.ts` (new), `control-plane/src/auth.ts` (new — authentication middleware)
  - **Size:** L (3+ hours)
  - **Spec ref:** Governance Platform extension — The Four Pillars (Visibility, Control); Part 9 — Fleet Observability
  - **Depends on:** —

- [ ] **GP-01b: Visibility pillar API endpoints**
  - **Description:** Implement the Visibility pillar (pillar 1 of 4) as concrete API endpoints on the governance server. The governance-platform extension defines Visibility as: fleet status, task progress, resource consumption, decision history, and failure patterns. These are currently spread across the Fleet Control Plane (Part 9), Cost Management (Part 8), Brain audit trail, and Failure Mode Catalog (Part 7). This item unifies them behind a single governance API surface: `GET /api/v1/visibility/fleet-status` (aggregated fleet view), `GET /api/v1/visibility/task-progress` (active task board with progress), `GET /api/v1/visibility/resources` (token/budget consumption), `GET /api/v1/visibility/decisions` (decision history from Brain), `GET /api/v1/visibility/failures` (failure pattern summary). This is what makes the governance platform a single pane of glass rather than a collection of separate queries.
  - **Done when:** All 5 visibility endpoints return structured data. Endpoints aggregate from underlying systems (fleet registry, Brain, event log, cost tracker). Response format is consistent across endpoints. Tests verify each endpoint with synthetic data.
  - **Files:** `control-plane/src/visibility-api.ts` (new), `control-plane/src/visibility-api.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Governance Platform extension — The Four Pillars / 1. Visibility
  - **Depends on:** GP-01

- [ ] **GP-02: Policy management API**
  - **Description:** Implement CRUD operations for governance policies through the API. A governance policy is a named, versioned rule that the governance layer enforces. Operations: (1) **Create** — define a new policy with name, description, rule definition (from governance rule engine MG-06), enforcement level (enforce/monitor/disabled), and scope (fleet-wide, per-agent-role, per-project); (2) **Read** — retrieve a policy by ID or list all policies with filtering by status, scope, and enforcement level; (3) **Update** — modify a policy's rule definition or enforcement level, creating a new version (policies are append-only — updates create new versions, old versions are preserved for audit); (4) **Deactivate** — disable a policy without deleting it (deactivated policies remain in the audit trail). All policy changes require authentication and are logged with the change author, timestamp, and rationale.
  - **Done when:** All four CRUD operations work through the API. Policies are versioned (updates create new versions). Deactivation preserves audit trail. Policy changes are logged with author and rationale. Tests verify create, read, update, deactivate, version history, and access control.
  - **Files:** `control-plane/src/policies.ts` (new), `control-plane/src/policies.test.ts` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Governance Platform extension — Policy (pillar 3); Part 3 — Deterministic Enforcement
  - **Depends on:** GP-01, MG-06

---

## 23.2 Multi-Tenancy and Configuration

- [ ] **GP-03: Multi-tenant support** ⏳ DEFERRED (Phase 3+)
  - **Description:** Implement support for multiple teams or projects with isolated governance configurations. Each tenant has: (1) **Isolated policies** — policies defined for one tenant do not affect another; (2) **Isolated audit trails** — governance events are scoped to the tenant that generated them; (3) **Isolated Brain namespaces** — Brain entries are namespaced per tenant (consistent with the spec's cross-project namespacing); (4) **Shared global policies** — some policies (e.g., data sensitivity, emergency halt) apply across all tenants and cannot be overridden; (5) **Tenant-scoped authentication** — API access is scoped to a specific tenant, with cross-tenant access requiring elevated privileges. Tenant isolation must be enforced at the data layer, not just the API layer — a bug in the API should not leak data across tenants.
  > **Deferred rationale:** Multi-tenant support is enterprise scope; premature when single-tenant governance doesn't exist yet.
  - **Done when:** Multiple tenants can be created with isolated policies, audit trails, and Brain namespaces. Global policies apply across tenants. Cross-tenant data leakage is prevented at the data layer. Tenant-scoped authentication works. Tests verify tenant isolation, global policy enforcement, and cross-tenant access controls.
  - **Files:** `control-plane/src/tenants.ts` (new), `control-plane/src/tenants.test.ts` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 5 — Brain Architecture (cross-project namespacing); Part 10 — Multi-Operator Governance
  - **Depends on:** GP-01, GP-02

- [ ] **GP-04: Governance policy language** ⏳ DEFERRED (Phase 3+)
  - **Description:** Define a DSL or structured configuration format for expressing governance rules declaratively. The policy language must support: (1) **Threshold rules** — `when token_usage > 80% of budget then warn`; (2) **Pattern rules** — `when error_count(same_signature) > 3 within 5m then intervene`; (3) **Temporal rules** — `when no checkpoint within 30m then warn`; (4) **Scope selectors** — apply rules to specific agent roles, model tiers, or task categories; (5) **Action definitions** — specify what happens when a rule triggers (log, warn, restrict, suspend, escalate); (6) **Composition** — combine rules with AND/OR/NOT logic; (7) **Inheritance** — tenant policies can extend global policies without redefining them. The language should be expressible as JSON/YAML (for programmatic use) and as a human-readable text format (for Admiral review). Include a linter that validates policy syntax and detects common errors (conflicting rules, unreachable conditions, infinite loops).
  > **Deferred rationale:** Governance policy DSL is over-engineering at this stage; use JSON/YAML initially.
  - **Done when:** Policy language supports all seven capabilities. Policies can be expressed in JSON/YAML and rendered as human-readable text. A linter validates policy syntax and detects errors. At least 10 example policies demonstrate the language's expressiveness. Tests verify parsing, evaluation, composition, inheritance, and linter detection of common errors.
  - **Files:** `admiral/governance/policy_language/` (new directory), `admiral/governance/policy_language/parser.sh` (new), `admiral/governance/policy_language/evaluator.sh` (new), `admiral/governance/policy_language/linter.sh` (new), `admiral/governance/policy_language/examples/` (new), `admiral/governance/policy_language/tests/test_policy_language.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Governance Platform extension — Policy (pillar 3); Part 3 — Deterministic Enforcement (enforcement spectrum)
  - **Depends on:** MG-06

---

## 23.3 Event Streaming and Reporting

- [ ] **GP-05: Governance event streaming**
  - **Description:** Implement a real-time event stream of all governance actions for external consumers. The stream exposes governance events (policy evaluations, interventions, escalations, trust calibration changes, audit entries) via: (1) **Server-Sent Events (SSE)** endpoint — `GET /api/v1/events/stream` for real-time browser/CLI consumption; (2) **Polling endpoint** — `GET /api/v1/events?since=<timestamp>` for consumers that cannot maintain persistent connections; (3) **Event filtering** — consumers can filter by event type, severity, agent, tenant, and time range; (4) **Event schema** — every event follows a consistent schema (event_id, timestamp, type, severity, source, detail, tenant_id). The stream is the external-facing counterpart to the internal governance event bus (MG-05). Events are buffered for replay — consumers that disconnect can resume from their last-seen event ID.
  - **Done when:** SSE endpoint streams governance events in real-time. Polling endpoint returns events since a given timestamp. Filtering works by type, severity, agent, and tenant. Events follow a consistent schema. Replay from last-seen event ID works after disconnect. Tests verify streaming, polling, filtering, and replay.
  - **Files:** `control-plane/src/event-stream.ts` (new), `control-plane/src/event-stream.test.ts` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 9 — Fleet Observability (event streaming); Governance Platform extension — Visibility (pillar 1)
  - **Depends on:** GP-01, MG-05

- [ ] **GP-06: Governance reporting**
  - **Description:** Implement governance report generation for compliance reviews, operational analysis, and trend tracking. Report types: (1) **Compliance report** — per-Standing-Order compliance scores, hook enforcement coverage, policy violation summary, and remediation status for a given time period; (2) **Governance KPI report** — intervention rate, false positive rate, detection latency, resolution time, governance overhead (from MG-10 metrics) with trend lines; (3) **Fleet health report** — agent utilization, error rates, budget consumption, quality metrics, and predictive health warnings; (4) **Audit report** — complete governance event log for a time period, formatted for external audit review; (5) **Trend analysis** — cross-period comparison showing governance effectiveness improvement or degradation. Reports are generated on-demand via API (`POST /api/v1/reports/generate`) and can be scheduled for periodic generation.
  - **Done when:** All five report types are generated from governance data. Reports are available in structured JSON and human-readable text formats. On-demand generation works via API. Reports include visualizable data (tables, time series). Tests verify report generation for each type with synthetic governance data.
  - **Files:** `control-plane/src/reports.ts` (new), `control-plane/src/reports.test.ts` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Governance Platform extension — Visibility (pillar 1); Part 8 — Fleet Health Metrics
  - **Depends on:** GP-01, MG-10

---

## 23.4 Integration and Deployment

- [ ] **GP-07: Governance SDK**
  - **Description:** Build a client SDK for integrating with the governance platform from external tools and scripts. The SDK wraps the governance API with a typed, ergonomic interface. Capabilities: (1) **Policy management** — create, read, update, deactivate policies programmatically; (2) **Event subscription** — subscribe to governance event streams with type-safe event handlers; (3) **Fleet queries** — query fleet status, agent health, and trust calibration; (4) **Brain access** — search and retrieve Brain entries; (5) **Report generation** — trigger and retrieve governance reports. The SDK handles authentication, retry logic, error handling, and connection management. Initially target TypeScript/JavaScript (matching the control plane stack) with a shell wrapper for CLI integration.
  - **Done when:** SDK provides typed wrappers for all governance API endpoints. Event subscription with handlers works. Authentication is handled transparently. Retry logic handles transient failures. Shell wrapper provides CLI access to all SDK capabilities. Tests verify all SDK operations against a running governance API server.
  - **Files:** `control-plane/src/sdk/` (new directory), `control-plane/src/sdk/client.ts` (new), `control-plane/src/sdk/types.ts` (new), `control-plane/src/sdk/events.ts` (new), `control-plane/src/sdk/client.test.ts` (new), `admiral/governance/sdk_wrapper.sh` (new — shell wrapper)
  - **Size:** L (3+ hours)
  - **Spec ref:** Governance Platform extension — Toolkit vs. Environment
  - **Depends on:** GP-01, GP-02, GP-05

- [ ] **GP-08: Governance deployment guide**
  - **Description:** Write comprehensive documentation for deploying Admiral as a governance service. The guide covers: (1) **Single-operator deployment** — local deployment for individual use, minimal configuration; (2) **Team deployment** — shared server deployment with multi-operator support, authentication setup, and tenant configuration; (3) **Infrastructure requirements** — compute, storage, database (Postgres for Brain B3), and network requirements per expected fleet size; (4) **Security hardening** — TLS configuration, authentication provider integration, audit log protection, and network isolation; (5) **Operational runbook** — monitoring the governance platform itself, backup procedures, upgrade paths, and disaster recovery; (6) **Integration recipes** — step-by-step guides for connecting to common tools (CI/CD, chat, issue trackers). The guide follows the progressive adoption model — start simple, add complexity as needed.
  - **Done when:** Guide covers all six areas with step-by-step instructions. Single-operator deployment can be completed by following the guide alone. Infrastructure sizing recommendations are provided. Security checklist is actionable. At least two integration recipes are included.
  - **Files:** `docs/deployment-guide.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Governance Platform extension — The Progression to Indispensability
  - **Depends on:** GP-01, GP-03

- [ ] **GP-09: Governance configuration management**
  - **Description:** Implement version-controlled governance configurations with rollback capability. All governance configuration (policies, agent definitions, trust calibration settings, hook configurations, tenant settings) is stored as versioned configuration with: (1) **Version history** — every configuration change creates a new version with timestamp, author, and rationale; (2) **Diff capability** — compare any two configuration versions to see what changed; (3) **Rollback** — revert to any previous configuration version, with the rollback itself logged as a new version; (4) **Validation** — configuration changes are validated before application (schema validation, policy linting, conflict detection); (5) **Export/Import** — configurations can be exported for backup or migration and imported into another instance. Configuration management is the governance platform's equivalent of version control for code — every change is tracked, reversible, and auditable.
  - **Done when:** Configuration changes are versioned with history, author, and rationale. Diffs between versions are computable. Rollback creates a new version reverting to a prior state. Validation catches invalid configurations before application. Export/import works for full configuration sets. Tests verify version history, diff, rollback, validation rejection, and export/import round-trip.
  - **Files:** `control-plane/src/config-management.ts` (new), `control-plane/src/config-management.test.ts` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 10 — The Admiral as Meta-Agent (configuration modification constraints); Governance Platform extension — Control (pillar 2)
  - **Depends on:** GP-01, GP-02

- [ ] **GP-10: Governance webhook integrations**
  - **Description:** Implement outbound webhook integrations that send governance events to external services. Supported targets: (1) **Slack** — send governance alerts, intervention notifications, and escalation requests to Slack channels with formatted messages; (2) **PagerDuty** — trigger incidents for critical governance events (emergency halts, security violations, budget exhaustion); (3) **Jira** — create issues for governance findings that require follow-up (spec gaps, recurring policy violations, trust calibration reviews); (4) **Generic webhook** — send governance events as JSON payloads to any HTTP endpoint for custom integrations. Each integration supports: event type filtering (only send specific event types to specific targets), severity thresholds (only send events above a severity level), rate limiting (prevent flooding targets with high-volume events), and retry with backoff (handle target unavailability gracefully). Webhook configurations are managed through the policy management API (GP-02).
  - **Done when:** Webhook integrations send formatted payloads to Slack, PagerDuty, Jira, and generic HTTP endpoints. Event filtering, severity thresholds, and rate limiting work. Retry with backoff handles target failures. Webhook configurations are managed via API. Tests verify payload formatting, filtering, rate limiting, and retry behavior with mock targets.
  - **Files:** `control-plane/src/webhooks/` (new directory), `control-plane/src/webhooks/slack.ts` (new), `control-plane/src/webhooks/pagerduty.ts` (new), `control-plane/src/webhooks/jira.ts` (new), `control-plane/src/webhooks/generic.ts` (new), `control-plane/src/webhooks/webhooks.test.ts` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Governance Platform extension — The Progression to Indispensability (stage 3: Essential); Part 9 — Event-Driven Operations
  - **Depends on:** GP-01, GP-05
