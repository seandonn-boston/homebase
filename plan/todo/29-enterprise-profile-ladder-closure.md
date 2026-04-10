# TODO: aiStrat Enterprise Profile Ladder Closure (Phase 24)

> Source: `plan/ROADMAP.md` Phase 24, `plan/stream-47-f4-federation-asp-alignment.md`, `plan/stream-48-cp5-federation-dashboard.md`, `plan/stream-49-de5-autonomous-optimization.md`

**Resolves:** The aiStrat Enterprise profile (`B3 F4 E3 CP5 S3 P3 DE5`) is unreachable today. F4 federation, CP5 Federation Dashboard, DE5 autonomous optimization, and ASP full alignment are all missing or partial. Without this phase, "spec-complete" claims are inaccurate by the largest margin in the codebase.

**Phase exit:** Two-fleet federation runs in CI. Federation Dashboard shows live cross-fleet view. DE5 simulation passes 30-day accelerated run with safety gates verified. All 71 core + 34 extended agents are ASP-compliant. The Enterprise profile tuple is documented as runnable in `aiStrat/QUICKSTART.md` with a working configuration example.

---

## Stream 47 — F4 Multi-Orchestrator Federation & ASP Full Alignment

### Federation Protocol & Bus

- [ ] **F4-01** — Define federation protocol (discovery, join/leave, role declaration, handoff, conflict resolution, heartbeat). Output `docs/federation-protocol.md` + `admiral/schemas/federation-message.v1.schema.json`.
- [ ] **F4-02** — Implement federation message bus on `event-stream.ts` substrate, namespaced by `fleet_id`, signed with B3 identity tokens. Depends on F4-01.
- [ ] **F4-03** — Cross-fleet handoff request/grant/decline extending Stream 8 handoff protocol. Depends on F4-02.

### Orchestrator Election & Failover

- [ ] **F4-04** — Orchestrator role declaration and discovery; published capabilities. Depends on F4-02.
- [ ] **F4-05** — Orchestrator failover protocol with heartbeat timeout, election, and in-flight handoff preservation. Depends on F4-04.

### Federated Routing

- [ ] **F4-06** — Cross-fleet routing engine extending Stream 15 with federation-aware fallback. Depends on F4-02, F4-04.

### ASP Full Alignment (resolves F-15 from Phase 12)

- [ ] **F4-07** — ASP schema validator implementing `aiStrat/admiral/spec/agent-spec-protocol/validation/`.
- [ ] **F4-08** — Convert all 71 core agent definitions to ASP-compliant format (`extends`, authority relationships, negative tool lists, per-agent tier overrides). Depends on F4-07.
- [ ] **F4-09** — Convert all 34 extended agent definitions to ASP-compliant format. Depends on F4-07.
- [ ] **F4-10** — ASP CI validation: every PR-introduced agent definition must validate. Depends on F4-08, F4-09.

### Federation Smoke Test

- [ ] **F4-11** — 2-fleet federation smoke test in CI: spin up two fleets, complete cross-fleet handoff, verify result aggregation, verify health heartbeat. Depends on F4-03, F4-05, F4-06, F4-10.

---

## Stream 48 — CP5 Federation Dashboard

### Cross-Fleet Aggregation

- [ ] **CP5-01** — Federation telemetry aggregator subscribing to every fleet's bus, normalizing events, storing federation-level event store with backfill on join. Depends on Stream 47 (F4-02).
- [ ] **CP5-02** — Federation-wide trace view in `control-plane/src/dashboard/` showing cross-fleet handoffs as first-class trace edges. Depends on CP5-01.

### Multi-Operator Governance UI

- [ ] **CP5-03** — Operator identity model on Brain B3 token substrate. Document in ADR.
- [ ] **CP5-04** — Operator session management: login, token issuance, expiry, revocation, audit. Depends on CP5-03.
- [ ] **CP5-05** — Permission-scoped dashboard views enforced at API layer. Depends on CP5-04.

### Federation Health & Alerts

- [ ] **CP5-06** — Federation health aggregator (uptime, handoff success, bus latency, failover frequency) with traffic-light indicators. Depends on CP5-01.
- [ ] **CP5-07** — Cross-fleet alert routing to on-call operator via existing Slack/PagerDuty webhooks. Depends on CP5-06.

### Federation Audit Trail

- [ ] **CP5-08** — Federation-level append-only audit log with hash chain extending `audit-trail.ts`. Depends on CP5-01.
- [ ] **CP5-09** — Audit log REST query API with permission-scoped filtering. Depends on CP5-08.

---

## Stream 49 — DE5 Autonomous Optimization

### Expanded Tier Model

- [ ] **DE5-01** — Expanded autonomy tier model: Auto-low / Auto-medium / Auto-high sub-tiers with promotion criteria and demotion triggers. ADR + implementation. Depends on Stream 47.
- [ ] **DE5-02** — Trust-based auto-promotion using Stream 18 trust scores with observation window. Depends on DE5-01.
- [ ] **DE5-03** — Auto-demotion safety gates: immediate, logged, requires full observation window before re-promotion. Depends on DE5-02.

### Predictive Routing & Forecasting

- [ ] **DE5-04** — Predictive routing model on Brain `_meta` historical data; feature-weighted scoring with ML-pluggable architecture. Depends on Stream 47.
- [ ] **DE5-05** — Predictive cost forecasting on `cost-optimizer.ts` substrate; ±20% accuracy on 80% of test scenarios.

### Closed-Loop Tuning

- [ ] **DE5-06** — Routing weight tuning loop using Thompson sampling / UCB; converges in simulation. Depends on DE5-04.
- [ ] **DE5-07** — Context budget tuning loop based on utilization and outcome quality; converges in simulation.
- [ ] **DE5-08** — Trust threshold tuning loop with hysteresis to avoid oscillation. Depends on DE5-02, DE5-03.

### Safety Gates & Override

- [ ] **DE5-09** — Admiral override API: pause loop, revert most recent change, cooldown before re-applying. Logged in CP5-08. Depends on DE5-06, DE5-07, DE5-08.
- [ ] **DE5-10** — Anomaly detection on autonomous change rate/direction; pauses loops + raises CP5-07 alert on oscillation/runaway. Depends on DE5-09.

### Smoke Test

- [ ] **DE5-11** — 30-day simulated federation operation in CI (<5min wall-clock) exercising every DE5 mechanism with synthetic anomalies and Admiral overrides. Depends on DE5-02, DE5-03, DE5-06, DE5-07, DE5-08, DE5-09, DE5-10.

---

## Capstone

- [ ] **EP-01** — Document the runnable Enterprise profile configuration (`B3 F4 E3 CP5 S3 P3 DE5`) in `aiStrat/QUICKSTART.md` with a working example. Update `plan/index.md` Brain & Knowledge, Fleet & Orchestration, and Observability rows to reflect F4/CP5/DE5 achievement.
