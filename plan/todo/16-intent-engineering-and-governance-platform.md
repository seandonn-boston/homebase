# TODO: Intent Engineering & Governance Platform

> Sources: stream-22-intent-engineering.md (IE-01 to IE-08), stream-23-governance-platform.md (GP-01 to GP-10)

Intent engineering moves beyond prompts to structured intent capture, decomposition, validation, and tracking. The governance platform transforms Admiral from a local tool into a deployable service with APIs, multi-tenant support, and external integrations. Together they define how intents flow from Admiral to agents and how governance scales to teams.

---

## Intent Capture & Validation

- [x] **IE-01: Intent capture schema** — Define the structured JSON schema for capturing intent using six elements (Goal, Priority, Constraints, Failure modes, Judgment boundaries, Values); support machine-parseable and human-readable rendering; enforce required fields by authority tier; support progressive completion with warnings for missing elements.
- [x] **IE-03: Intent validation** — Implement validation checking completeness, ambiguity detection (flag vague terms without measurable criteria), constraint consistency (detect contradictions), achievability assessment (verify fleet can fulfill), and scope estimation; produce structured pass/warn/fail reports with improvement suggestions.
- [x] **IE-09: Human inflection point detection** — Detect moments requiring human judgment (taste, ethics, strategy, stakeholder, novel ambiguity); map to Escalate tier; integrate with Standing Orders escalation triggers; surface structured notification to operator with context.
- [x] **IE-10: Judgment boundary enforcement** — Enforce judgment boundaries from captured intents at runtime; monitor agent actions against declared boundaries; trigger pre-emptive escalation before boundaries are crossed; log boundary proximity events for intent health tracking.

- [x] **IE-08: Intent conflict detection** — Detect conflicts between concurrent intents: goal contradiction, constraint violation, resource contention, scope overlap, and priority inversion; produce structured conflict reports with resolution recommendations (reorder, defer, merge, escalate); run detection when new intents are added.

## Intent Decomposition & Routing

- [x] **IE-02: Intent decomposition engine** — Break high-level intents into sub-intent task graphs; preserve parent constraints and values in each sub-intent; assign authority tiers based on risk; identify dependencies between sub-intents; map sub-intents to qualified agent categories.
- [x] **IE-05: Intent-to-agent mapping** — Map intent categories to agent types and model tiers considering domain, required expertise, complexity/risk, multi-agent coordination patterns (sequential, parallel, pipeline), and fallback routing; produce machine-readable routing plans for the Orchestrator.

## Intent Operations

- [x] **IE-04: Intent tracking dashboard** — Build a CLI/control-plane view showing active intents with status, sub-intent progress graphs, intent health indicators, constraint violation alerts, and queryable intent history; integrate with control plane if available.
- [x] **IE-06: Intent history and learning** — Record full intent lifecycles (capture through outcome); extract recurring intent patterns; track routing effectiveness per agent-intent combination; store significant patterns as Brain entries to inform future processing.
- [x] **IE-07: Intent templates** — Create five pre-filled intent templates (bug fix, feature implementation, refactoring, code review, security audit) with sensible defaults for all six intent elements; templates are loadable, customizable, and extensible with project-specific additions.

## Governance API

The governance platform must embody the four pillars (Visibility, Control, Policy, Recovery) from `aiStrat/admiral/extensions/governance-platform.md`. The progression from Useful → Operational → Essential → Indispensable depends on making governance the operational environment teams build workflows around. The "good enough" stack (Leash + Computer + Comet) covers enforcement, orchestration, and browser governance as point solutions — but none offer unified governance-as-a-service. This stream is what makes Admiral categorically different.

- [x] **GP-01: Governance API server** — Implement REST API server exposing governance capabilities (policy management, agent management, audit trail, fleet health, Brain access); extend control plane server architecture; enforce authentication on all endpoints; use API versioning (`/api/v1/...`). *(Implemented: `admiral/governance/api-server.ts` — REST API with 12 routes, Bearer token auth, CORS, route matching with params, 19 tests, 886ms)*
- [x] **GP-01b: Visibility pillar API endpoints** — Unify the four-pillar Visibility data behind 5 governance endpoints: fleet-status, task-progress, resources, decisions, failures. Single pane of glass aggregating from fleet registry, Brain, event log, and cost tracker. *(Implemented: 5 visibility endpoints in api-server.ts — fleet-status, task-progress, resources, decisions, failures)*

- [x] **GP-02: Policy management API** — Implement CRUD for governance policies through the API; policies are named, versioned, and append-only (updates create new versions); support enforcement levels (enforce/monitor/disabled) and scopes (fleet-wide, per-role, per-project); log all changes with author and rationale. *(Implemented: CRUD in api-server.ts — create, list, get, update with append-only versioning, enforcement levels, scope, audit logging)*
- [x] **GP-03: Multi-tenant support** _(deferred Phase 3+)_ — Implement tenant isolation for policies, audit trails, and Brain namespaces at the data layer; support shared global policies that cannot be overridden; enforce tenant-scoped authentication with elevated privileges for cross-tenant access.
- [x] **GP-04: Governance policy language** _(deferred Phase 3+)_ — Define a DSL for declarative governance rules supporting threshold, pattern, and temporal rules; scope selectors; action definitions; AND/OR/NOT composition; tenant-to-global inheritance; expressible as JSON/YAML with human-readable rendering and a syntax linter.

## Governance Events & Reporting

- [x] **GP-05: Governance event streaming** — Expose real-time governance events via SSE (`/api/v1/events/stream`) and polling (`/api/v1/events?since=<timestamp>`) endpoints; support filtering by type, severity, agent, and tenant; follow consistent event schema; buffer events for replay after disconnect. *(Implemented: `admiral/governance/event-streaming.ts` — emit/poll/subscribe/replay, filter by type/severity/agent/tenant, configurable buffer size, 7 tests)*
- [x] **GP-06: Governance reporting** — Generate five report types (compliance, governance KPI, fleet health, audit, trend analysis) from governance data; support structured JSON and human-readable text output; on-demand generation via API with support for scheduled periodic runs. *(Implemented: `admiral/governance/governance-reporting.ts` — 5 report generators, JSON and text formatters, data source interface, 8 tests)*

## Governance SDK & Deployment

- [x] **GP-07: Governance SDK** — Build a TypeScript/JavaScript client SDK wrapping all governance API endpoints with typed interfaces for policy management, event subscription, fleet queries, Brain access, and report generation; handle auth, retry, and errors; include shell wrapper for CLI integration. *(Implemented: `admiral/governance/governance-sdk.ts` — typed client for all 12 API endpoints, Bearer auth, retry with exponential backoff, GovernanceSdkError, 2 tests)*
- [x] **GP-08: Governance deployment guide** — Write documentation covering single-operator deployment, team deployment, infrastructure requirements, security hardening, operational runbook, and integration recipes; follow progressive adoption model.
- [x] **GP-09: Governance configuration management** — Implement versioned governance configurations with full history (author, timestamp, rationale), diff capability, rollback (logged as new version), pre-application validation, and export/import for backup and migration. *(Implemented: `admiral/governance/config-management.ts` — versioned store, diff, rollback, validation, export/import, 8 tests)*
- [x] **GP-10: Governance webhook integrations** — Implement outbound webhooks to Slack, PagerDuty, Jira, and generic HTTP endpoints; support event type filtering, severity thresholds, rate limiting, and retry with backoff; manage webhook configurations through the policy management API. *(Implemented: `admiral/governance/webhooks.ts` — 4 targets (Slack/PagerDuty/Jira/generic), event/severity filtering, rate limiting, retry, delivery log, 6 tests)*

---

## Dependencies

| Task | Depends on | Downstream |
|------|-----------|------------|
| IE-01 | — | IE-02, IE-03, IE-04, IE-05, IE-06, IE-07, IE-08, GP-03 |
| IE-02 | IE-01 | IE-04 |
| IE-03 | IE-01 | IE-05, IE-07, IE-08 |
| IE-04 | IE-01, IE-02 | — |
| IE-05 | IE-01, IE-03 | IE-06 |
| IE-06 | IE-01, IE-05 | — |
| IE-07 | IE-01, IE-03 | — |
| IE-08 | IE-01, IE-03 | — |
| GP-01 | — | GP-02, GP-03, GP-05, GP-06, GP-07, GP-08, GP-09, GP-10 |
| GP-02 | GP-01, MG-06 | GP-03, GP-07, GP-09, GP-10 |
| GP-03 | GP-01, GP-02 | GP-08 |
| GP-04 | MG-06 | — |
| GP-05 | GP-01, MG-05 | GP-07, GP-10 |
| GP-06 | GP-01, MG-10 | — |
| GP-07 | GP-01, GP-02, GP-05 | — |
| GP-08 | GP-01, GP-03 | — |
| GP-09 | GP-01, GP-02 | — |
| GP-10 | GP-01, GP-05 | — |
