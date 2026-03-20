# Stream 25: Observability — See Everything, Miss Nothing

> *"Observability is not about dashboards. It is about being able to ask arbitrary questions about your system's behavior without having to deploy new code." — Charity Majors*

**Scope:** Comprehensive observability stack for the Admiral runtime. Covers structured logging, distributed tracing, metrics collection, health aggregation, alerting, log centralization, dashboard enhancements, SLO/SLI definitions, incident timeline reconstruction, and performance regression detection. Extends the Fleet Observability specification (Part 9) and the framework benchmarks defined in `aiStrat/admiral/reference/benchmarks.md`.

**Why this stream exists:** You cannot govern what you cannot see. The Admiral Framework governs AI agent fleets — but governance without observability is enforcement in the dark. When a fleet degrades, the Admiral needs to know what happened, when, where, and why — in seconds, not hours. This stream builds the infrastructure that makes the invisible visible.

---

## 25.1 Logging and Tracing Foundation

- [ ] **OB-01: Structured logging standard**
  - **Description:** Define and implement structured JSON logging across all components — hooks (bash), control plane (TypeScript), and brain queries. Every log entry must include: timestamp (ISO 8601), level (debug/info/warn/error/fatal), component (hook name, server module, brain operation), correlation ID (linking related operations across components), message, and structured context fields. Replace all `echo` statements in hooks with a `log_structured` function. Replace all `console.log` calls in the control plane with a structured logger. Define log level conventions: debug (development only), info (operational events), warn (recoverable issues), error (failures requiring attention), fatal (unrecoverable failures).
  - **Done when:** All hooks use `log_structured` instead of raw echo for operational output. All control plane modules use a structured logger. Every log entry is valid JSON with required fields. Log level conventions are documented and enforced in code review.
  - **Files:** `admiral/lib/log.sh` (new or modify existing), `control-plane/src/logger.ts` (new), `admiral/docs/logging-standard.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 9 — Fleet Observability
  - **Depends on:** —

- [ ] **OB-02: Distributed tracing**
  - **Description:** Trace requests across hooks, control plane, and brain with correlation IDs. Generate a trace ID at session start and propagate it through every hook invocation, control plane API call, and brain query. Each operation within a trace gets a span ID with parent-child relationships. Record span start/end times, status (ok/error), and key attributes. Store traces in a format compatible with OpenTelemetry or a lightweight custom format that can be exported to OpenTelemetry later. Enable trace-based debugging: given a session ID, reconstruct the complete sequence of operations.
  - **Done when:** Every hook invocation carries a trace ID and span ID. Control plane API requests are traced. Brain queries include trace context. A trace can be reconstructed from its ID showing the full operation tree. Trace data is queryable via the control plane API.
  - **Files:** `admiral/lib/tracing.sh` (new), `control-plane/src/tracing.ts` (new), `control-plane/src/tracing.test.ts` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 9 — Fleet Observability, `aiStrat/admiral/extensions/inevitable-features.md` — Feature 1 (Fleet-Wide Causality Tracing)
  - **Depends on:** OB-01

---

## 25.2 Metrics and Health

- [ ] **OB-03: Metrics collection**
  - **Description:** Collect and expose Prometheus-compatible metrics for all Admiral components. Core metrics to implement: hook execution latency (histogram, per hook), hook pass/fail rate (counter, per hook), event throughput (counter, events per second), brain query latency (histogram), brain entry count (gauge), control plane API request latency (histogram, per endpoint), active sessions (gauge), governance overhead ratio (gauge — governance tokens / total tokens). Expose metrics at a `/metrics` endpoint on the control plane server in Prometheus exposition format. Include metric labels for component, operation, and status.
  - **Done when:** `/metrics` endpoint returns Prometheus-format metrics. All listed core metrics are collected. Metrics include appropriate labels. A Prometheus instance can scrape the endpoint and display metrics. Metric names follow Prometheus naming conventions.
  - **Files:** `control-plane/src/metrics.ts` (new), `control-plane/src/metrics.test.ts` (new), `control-plane/src/server.ts` (modify — add /metrics endpoint)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/admiral/reference/benchmarks.md` — Core Metrics (7 benchmarks)
  - **Depends on:** —

- [ ] **OB-04: Health check aggregation**
  - **Description:** Aggregate health from all components (hooks, control plane, brain) into a single health endpoint. The `/health` endpoint returns a structured response showing: overall status (healthy/degraded/unhealthy), per-component status with last check time, dependency status (filesystem, brain MCP server, model API), and degradation details when not fully healthy. Implement health check probes: hooks (verify key hooks execute successfully), control plane (internal self-check), brain (connectivity and query latency), event log (file accessibility and write latency). Health status feeds into alerting (OB-05) and the dashboard (OB-07).
  - **Done when:** `/health` endpoint returns aggregated health status. All component health probes are implemented. Degraded components include diagnostic details. Health endpoint responds in < 500ms even when components are unhealthy.
  - **Files:** `control-plane/src/health.ts` (new), `control-plane/src/health.test.ts` (new), `control-plane/src/server.ts` (modify — add /health endpoint)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **OB-08: SLO/SLI definitions**
  - **Description:** Define service level objectives (SLOs) and service level indicators (SLIs) for Admiral components based on the framework benchmarks. SLIs to define: hook execution latency (p99 < 100ms), event ingestion latency (p99 < 500ms), brain query latency (p99 < 1s), control plane API availability (> 99.9%), first-pass quality rate (> 75%), governance overhead ratio (< 15%). SLOs to define: error budget per SLI over 30-day rolling windows. Implement SLO tracking that calculates remaining error budget and alerts when budget is being consumed too quickly. This bridges the gap between raw metrics (OB-03) and operational decision-making.
  - **Done when:** SLIs are defined with measurement methods for all 7 core benchmarks. SLOs are defined with 30-day rolling windows. Error budget calculation is implemented. SLO status is visible via API endpoint. Alerts fire when error budget consumption rate exceeds threshold.
  - **Files:** `admiral/docs/slo-definitions.md` (new), `control-plane/src/slo-tracker.ts` (new), `control-plane/src/slo-tracker.test.ts` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/admiral/reference/benchmarks.md` — all 7 core metrics
  - **Depends on:** OB-03

---

## 25.3 Alerting and Log Management

- [ ] **OB-05: Alert routing rules**
  - **Description:** Route alerts to appropriate channels based on severity and component. Define alert routing rules: critical alerts (security incidents, audit chain breaks, identity violations) route to immediate notification channels, high alerts (SLO budget depletion, enforcement failures) route to operational channels, medium alerts (performance degradation, elevated error rates) route to monitoring channels, low alerts (informational, trend changes) route to digest summaries. Implement alert deduplication (same alert within a window produces one notification, not N), alert escalation (unacknowledged alerts escalate after configurable timeout), and alert suppression (during maintenance windows). Support webhook-based notification delivery for integration with Slack, PagerDuty, or custom endpoints.
  - **Done when:** Alert routing rules are configurable per severity and component. Deduplication prevents alert storms. Escalation works for unacknowledged alerts. At least one notification channel (webhook) is implemented. Alert history is queryable via API.
  - **Files:** `control-plane/src/alerting.ts` (new), `control-plane/src/alerting.test.ts` (new), `admiral/config/alert-rules.json` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** OB-03, OB-04

- [ ] **OB-06: Log aggregation**
  - **Description:** Centralize logs from hooks, control plane, and brain into a single queryable store. Hooks write structured JSON logs to a shared log directory. The control plane collects and indexes these logs alongside its own. Implement a log query API that supports: time range filtering, component filtering, level filtering, correlation ID lookup, and full-text search on message and context fields. Store logs in an append-only format with rotation (configurable max size and retention period). The aggregated log store replaces the need to manually inspect individual log files across components.
  - **Done when:** All component logs are centralized into a single queryable store. Log query API supports time range, component, level, and correlation ID filters. Log rotation prevents unbounded disk usage. Query response time is < 1s for queries spanning up to 24 hours of logs.
  - **Files:** `control-plane/src/log-aggregator.ts` (new), `control-plane/src/log-aggregator.test.ts` (new), `control-plane/src/server.ts` (modify — add /api/logs endpoint)
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** OB-01

---

## 25.4 Visualization and Analysis

- [ ] **OB-07: Dashboard improvements**
  - **Description:** Enhance the control plane dashboard with real-time event timeline, hook execution visualization, and brain query log. Event timeline: scrollable, filterable timeline showing all events in chronological order with color-coding by type (hook, brain, session, error). Hook execution visualization: per-hook latency sparklines, pass/fail rate over time, and currently active hooks. Brain query log: recent brain queries with results, latency, and relevance scores. Add auto-refresh with configurable interval. The dashboard should be the primary operational interface — the place where an Admiral goes first to understand fleet status.
  - **Done when:** Dashboard shows real-time event timeline with filtering. Hook execution is visualized with latency and pass/fail metrics. Brain query log shows recent queries with results. Dashboard auto-refreshes. All data is sourced from existing API endpoints (no separate data pipeline required).
  - **Files:** `control-plane/src/server.ts` (modify — enhance dashboard routes), `control-plane/public/dashboard.html` (modify or new)
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** OB-03, OB-04

- [ ] **OB-09: Incident timeline reconstruction**
  - **Description:** Given a session ID, reconstruct the complete timeline of events, decisions, and outcomes. Aggregate data from event logs, audit trails, hook execution records, brain queries, and trace spans into a single chronological narrative. Each timeline entry shows: timestamp, component, operation, inputs, outputs, status, and causal links to related events. The reconstruction should highlight anomalies (unusual latency, failed operations, escalations) and provide a clear root-cause analysis path. This is the operational foundation for the Causality Tracing inevitable feature.
  - **Done when:** Given a session ID, the API returns a complete ordered timeline of all operations. Timeline entries include causal links (which operation triggered which). Anomalies are flagged in the timeline. Reconstruction completes in < 5 seconds for sessions with up to 1000 events. Output is both human-readable (markdown) and machine-readable (JSON).
  - **Files:** `control-plane/src/timeline.ts` (new), `control-plane/src/timeline.test.ts` (new), `control-plane/src/server.ts` (modify — add /api/timeline/:sessionId endpoint)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/admiral/extensions/inevitable-features.md` — Feature 1 (Fleet-Wide Causality Tracing)
  - **Depends on:** OB-02, OB-06

- [ ] **OB-10: Performance regression detection**
  - **Description:** Automated detection of performance degradation across releases. Compare current metric values against historical baselines to detect regressions. Track: hook execution latency (detect > 20% increase), event throughput (detect > 20% decrease), brain query latency (detect > 30% increase), API response time (detect > 20% increase). Use statistical methods (rolling averages with standard deviation) rather than fixed thresholds to account for natural variation. Run as part of CI on every PR — compare PR branch metrics against main branch baseline. Emit warnings when regressions are detected with specific metrics and magnitudes.
  - **Done when:** CI detects performance regressions by comparing against baselines. Regression detection uses statistical methods (not just fixed thresholds). Warnings identify the specific metric, magnitude, and affected component. Baselines are updated automatically when PRs merge to main.
  - **Files:** `control-plane/src/perf-baseline.ts` (new), `.github/workflows/perf-regression.yml` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/admiral/reference/benchmarks.md` — Baseline Expectations
  - **Depends on:** OB-03

---

## 25.5 Fleet Control Plane Authorization and Tracing

- [ ] **OB-16: Intervention authorization model**
  - **Description:** Implement the authorization model for fleet control plane interventions defined in the Fleet Control Plane Extension. Each intervention type requires a specific operator authorization level: any operator can pause an agent or trigger emergency halt; operator-level can pause fleet, kill tasks, adjust budgets, override Propose-tier decisions, reroute tasks, promote/demote model tiers, inject context; owner-level required for modifying policies (Standing Orders). Emergency halt is special: any operator at any tier can trigger immediately, but resuming after emergency halt requires Owner authorization. Implement authorization checks at the API layer that enforce these tiers before executing interventions.
  - **Done when:** All 10 intervention types have authorization checks. Authorization tiers match the Fleet Control Plane Extension catalog. Emergency halt is callable by any tier. Resume-after-halt requires Owner. Authorization failures return 403 with required tier. All authorization decisions are audit logged. Tests verify each authorization level.
  - **Files:** `control-plane/src/intervention-auth.ts` (new), `control-plane/src/intervention-auth.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Fleet Control Plane Extension — Full Intervention Catalog (CP3)
  - **Depends on:** OB-14

- [ ] **OB-17: Canonical trace format specification**
  - **Description:** Define the canonical trace format for fleet-wide causality tracing. The inevitable-features extension describes the narrative structure (reverse causal chains with ← arrows showing which agent, what inputs/outputs, costs, outcomes) and cross-task causality chains, but does not specify a concrete JSON schema. This item defines that schema: trace ID, spans (with parent-child relationships, start/end times, status, key attributes), causal links between spans across tasks, agent identity per span, and cost attribution per span. The format must be compatible with OpenTelemetry export while capturing Admiral-specific fields (authority tier, governance decisions, Brain queries). This is the foundation that OB-02 (distributed tracing) and OB-09 (timeline reconstruction) implement.
  - **Done when:** Canonical trace format JSON schema exists. Schema captures spans, causal links, agent identity, cost, and governance metadata. Format is exportable to OpenTelemetry. At least 3 example traces demonstrate the format for single-agent, multi-agent pipeline, and cross-task scenarios. Schema is validated by OB-02 implementation.
  - **Files:** `admiral/observability/trace-format.schema.json` (new), `admiral/observability/trace-examples/` (new directory), `admiral/docs/trace-format.md` (new)
  - **Size:** M
  - **Spec ref:** `aiStrat/admiral/extensions/inevitable-features.md` — Feature 1 (Fleet-Wide Causality Tracing); Part 9 — Fleet Observability
  - **Depends on:** —

---

## 25.6 Control Plane Progressive Implementation

- [ ] **OB-11: CP1 — CLI Dashboard baseline**
  - **Description:** Structured JSON-lines event logging with fields (ts, event, agent, tool, duration_ms, tokens). Terminal status display showing agent state, task progress, token budget bar, error/retry counts, last 3 events. Runaway detection: loop at 3+ errors, token budget advisory at 90%+, idle detection.
  - **Files:** `control-plane/src/cp1-cli.ts`, `control-plane/src/cp1-terminal.ts`
  - **Size:** L (3+ hours)
  - **Spec ref:** Fleet Control Plane Extension — CP1

- [ ] **OB-12: CP2 — Fleet Dashboard**
  - **Description:** Fleet status answering five questions: what's running, what's healthy, what's consuming resources, what needs attention, what happened recently. Agent detail drill-down. Task flow visualization. Alert system with four severity tiers (CRITICAL/HIGH/MEDIUM/LOW) with alert fatigue prevention (deduplication, suppression, severity gating).
  - **Files:** `control-plane/src/cp2-fleet-dashboard.ts`, `control-plane/public/fleet.html`
  - **Size:** L (3+ hours)
  - **Spec ref:** Fleet Control Plane Extension — CP2

- [ ] **OB-13: CP3 — Governance Dashboard**
  - **Description:** Governance agent health monitoring. Decision authority visualization. Intervention audit trail. Policy management interface. Connects to meta-governance agents (Stream 19).
  - **Files:** `control-plane/src/cp3-governance.ts`, `control-plane/public/governance.html`
  - **Size:** L (3+ hours)
  - **Spec ref:** Fleet Control Plane Extension — CP3
  - **Depends on:** Stream 19 MG-01

- [ ] **OB-14: Intervention catalog**
  - **Description:** Implement 10 operator intervention actions: pause agent, pause fleet, emergency halt, kill task, adjust budget, override decision, reroute task, promote/demote tier, modify policy, inject context. Each action has confirmation requirement, audit logging, and reversal path.
  - **Files:** `control-plane/src/interventions.ts`, `control-plane/src/interventions.test.ts`
  - **Size:** L (3+ hours)
  - **Spec ref:** Fleet Control Plane Extension — Interventions

- [ ] **OB-15: Session thermal model**
  - **Description:** Budget as descriptive (not prescriptive). Budgets default to 0 (unlimited). Warnings via additionalContext at advisory checkpoints. Sessions can run "hot" without hard blocks at 100%.
  - **Files:** `control-plane/src/thermal-model.ts`
  - **Size:** M (1-3 hours)
  - **Spec ref:** Fleet Control Plane Extension — Session Thermal Model

---

## Stream 25 Summary

| Subsection | Items | Total Size |
|---|---|---|
| 25.1 Logging and Tracing Foundation | OB-01, OB-02 | 2L |
| 25.2 Metrics and Health | OB-03, OB-04, OB-08 | 3M |
| 25.3 Alerting and Log Management | OB-05, OB-06 | 1M + 1L |
| 25.4 Visualization and Analysis | OB-07, OB-09, OB-10 | 2L + 1M |
| 25.5 Control Plane Progressive Implementation | OB-11, OB-12, OB-13, OB-14, OB-15 | 4L + 1M |
| **Totals** | **15 items** | **9L + 6M** |

### 25.6 Competitive Urgency (from research/competitive-threat-strongdm-perplexity-comet-2026.md)

Fleet-wide causality tracing is one of three "inevitable features" that create operational lock-in. Competitors are converging:

- **Perplexity Computer** is exposing subagent trace trees — within 6–12 months, Perplexity may offer causality tracing for its own orchestrated agents.
- **StrongDM Leash** has enforcement-layer Record data that could evolve into trend analysis (12–18 months).

**Internal target:** Ship causality tracing (OB-02 + OB-09) within **90 days** (internal target). Admiral is designed for cross-platform tracing — Perplexity can only trace Perplexity agents, Leash can only trace containerized agents. Admiral is designed to trace across CLI, API, browser, and backend.

**Implication:** OB-02 (distributed tracing) and OB-09 (incident timeline reconstruction) together form the foundation for the Causality Tracing inevitable feature. Prioritize these above dashboard polish (OB-07) and SLO tracking (OB-08). Tracing data feeds the Brain (Stream 11) — each traced session produces knowledge entries that compound over time.

---

**Critical path:** OB-01 (structured logging) is the foundation — everything else depends on consistent, structured log output. OB-02 (tracing) depends on OB-01 and enables OB-09 (timeline reconstruction). OB-03 (metrics) enables OB-05 (alerting), OB-08 (SLOs), OB-10 (regression detection), and OB-07 (dashboard).

**Recommended execution order:**
1. **Foundation:** OB-01 (structured logging), OB-03 (metrics), OB-04 (health checks) — no dependencies, enable everything else.
2. **Core:** OB-02 (tracing, after OB-01), OB-05 (alerting, after OB-03+OB-04), OB-06 (log aggregation, after OB-01).
3. **Analysis:** OB-08 (SLOs, after OB-03), OB-10 (regression detection, after OB-03).
4. **Capstone:** OB-07 (dashboard, after OB-03+OB-04), OB-09 (timeline reconstruction, after OB-02+OB-06).
