# Stream 48: CP5 — Federation Dashboard

> Build the CP5 (Federation Dashboard) ladder rung the aiStrat spec defines: cross-fleet visibility, multi-operator governance UI, aggregated trace view across fleets, federation health monitoring, federation-level audit trail. Depends on Stream 47 federation telemetry.

**Phase:** 24 — aiStrat Enterprise Profile Ladder Closure

**Scope:** `aiStrat/admiral/spec/index.md` § Per-Component Scaling defines Control Plane CP5 as "Federation Dashboard: cross-fleet, multi-operator governance". The current control plane reaches CP4 (operations dashboard with trend analysis and cost forecasting per `plan/index.md` Observability row). CP5 requires aggregating views across multiple fleets, supporting multiple human operators with their own permissions, and serving a federation-level audit trail. The Federation Dashboard is the operator-facing complement to Stream 47's federation telemetry.

**Resolves:** The CP5 ladder gap that blocks the Enterprise profile.

**Principle:** A federation that cannot be observed cannot be operated. CP5 is what makes F4 governable.

---

## 48.1 Cross-Fleet Aggregation

- [ ] **CP5-01: Federation telemetry aggregator**
  - **Description:** Build a service that subscribes to every fleet's federation message bus, normalizes events into a federation-wide format, and stores them in a federation-level event store. Handles fleets joining and leaving dynamically. Backfills new fleets' historical events on join (configurable horizon).
  - **Done when:** Aggregator runs against a 2-fleet federation and produces a unified event stream.
  - **Files:** `control-plane/src/federation-aggregator.ts` (new), `control-plane/src/federation-aggregator.test.ts` (new)
  - **Size:** L
  - **Depends on:** Stream 47 (F4-02 message bus)

- [ ] **CP5-02: Federation-wide trace view**
  - **Description:** Extend the existing trace UI (`control-plane/src/dashboard/`) with a federation tab. Shows traces that span multiple fleets, with fleet boundaries clearly marked. Cross-fleet handoffs are first-class trace edges. Operators can filter by fleet, by cross-fleet edge, by orchestrator, by handoff outcome.
  - **Done when:** Federation trace view shows a 2-fleet handoff scenario as a single connected trace.
  - **Files:** `control-plane/src/dashboard/federation-traces.tsx` (new), `control-plane/src/dashboard/federation-traces.test.tsx` (new)
  - **Size:** L
  - **Depends on:** CP5-01

## 48.2 Multi-Operator Governance UI

- [ ] **CP5-03: Operator identity model**
  - **Description:** Define the operator identity model. Each operator is a human with: identity (OAuth or static credential), permission scope (which fleets they can view, which they can intervene in), session lifetime, audit fingerprint. Use the existing Brain B3 identity token system as the substrate. Document in `docs/adr/0NN-operator-identity.md`.
  - **Done when:** Operator identity model is documented and a 3-operator test scenario is defined.
  - **Files:** `admiral/governance/operator-identity.ts` (new), `docs/adr/0NN-operator-identity.md`
  - **Size:** M

- [ ] **CP5-04: Operator session management**
  - **Description:** Implement operator login, session token issuance, session expiry, session revocation, session audit logging. Each operator action is signed with their session token. Multiple operators can be active simultaneously.
  - **Done when:** Operator session management passes a 3-operator concurrent session test.
  - **Files:** `control-plane/src/operator-sessions.ts` (new), `control-plane/src/operator-sessions.test.ts` (new)
  - **Size:** L
  - **Depends on:** CP5-03

- [ ] **CP5-05: Permission-scoped dashboard views**
  - **Description:** The federation dashboard renders only the fleets and traces an operator has permission to see. Operators with cross-fleet permissions see the aggregated view; operators with single-fleet permissions see only their fleet. Permission boundaries are enforced at the API layer, not just the UI.
  - **Done when:** Two operators with different permissions see different views in an integration test.
  - **Files:** `control-plane/src/dashboard/permission-filter.ts` (new)
  - **Size:** M
  - **Depends on:** CP5-04

## 48.3 Federation Health Monitoring

- [ ] **CP5-06: Federation health aggregator**
  - **Description:** Aggregate per-fleet health metrics (from Stream 27 monitoring) into federation-wide health. Track: per-fleet uptime, cross-fleet handoff success rate, federation message bus latency, orchestrator failover frequency. Surface on the Federation Dashboard with traffic-light indicators.
  - **Done when:** Federation health view shows live metrics for a 2-fleet test federation.
  - **Files:** `control-plane/src/federation-health.ts` (new), `control-plane/src/federation-health.test.ts` (new)
  - **Size:** M
  - **Depends on:** CP5-01

- [ ] **CP5-07: Cross-fleet alert routing**
  - **Description:** When a fleet emits a federation-relevant alert (cross-fleet handoff failure, orchestrator unreachable, trust collapse), route it to the federation alert layer. Alert routing rules per operator (on-call rotation, severity filters). Use existing webhook infrastructure (Slack, PagerDuty).
  - **Done when:** Federation alert routing passes a test where a fleet emits a cross-fleet failure and the on-call operator is notified.
  - **Files:** `control-plane/src/federation-alerts.ts` (new)
  - **Size:** M
  - **Depends on:** CP5-06

## 48.4 Federation Audit Trail

- [ ] **CP5-08: Federation-level audit log**
  - **Description:** Append-only log of every federation-level event: fleet join/leave, orchestrator election, cross-fleet handoff, operator action, alert routing decision, permission grant/revoke. Hash-chained for tamper detection (extends the existing audit chain in `admiral/security/audit-trail.ts`).
  - **Done when:** Federation audit log captures a 2-fleet federation lifecycle and passes integrity verification.
  - **Files:** `admiral/governance/federation-audit.ts` (new), `admiral/governance/federation-audit.test.ts` (new)
  - **Size:** M
  - **Depends on:** CP5-01

- [ ] **CP5-09: Audit log query API**
  - **Description:** REST endpoints for querying the federation audit log: `GET /api/federation/audit?fleet=&operator=&since=&until=`, filtered by permission scope. Returns paginated, signed audit entries.
  - **Done when:** Audit query API serves a 2-fleet test federation's audit trail with permission filtering.
  - **Files:** `control-plane/src/federation-audit-api.ts` (new)
  - **Size:** S
  - **Depends on:** CP5-08

---

## Dependencies

| Item | Depends on |
|------|-----------|
| CP5-01 (aggregator) | Stream 47 (F4-02 message bus) |
| CP5-02 (trace view) | CP5-01 |
| CP5-03 (operator identity) | — |
| CP5-04 (sessions) | CP5-03 |
| CP5-05 (permission filter) | CP5-04 |
| CP5-06 (health aggregator) | CP5-01 |
| CP5-07 (alert routing) | CP5-06 |
| CP5-08 (audit log) | CP5-01 |
| CP5-09 (audit API) | CP5-08 |

**Phase-level depends on:** Stream 47 (Federation must exist before its dashboard can render).

---

## Exit Criteria

- Federation telemetry aggregator runs against a live 2-fleet federation.
- Federation Dashboard shows cross-fleet traces with fleet boundaries marked.
- 3 operators with different permission scopes can log in concurrently and see permission-filtered views.
- Federation health view shows live per-fleet and aggregated metrics.
- Cross-fleet alerts route to the correct on-call operator.
- Federation audit log is hash-chained, queryable, and permission-scoped.
- The Control Plane axis of `plan/index.md` is updated to reflect CP5 achievement.
