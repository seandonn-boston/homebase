# TODO: Meta-Governance

> Source: stream-19-meta-governance.md (MG-01 to MG-13)

The meta-governance layer is where governance agents monitor and enforce rules on other agents. Hooks are deterministic but narrow; governance agents provide the judgment-assisted layer that detects emergent patterns — scope drift, budget erosion, inter-agent conflicts — that no single hook can see.

---

## Governance Framework

- [ ] **MG-01: Governance agent framework** — Design the base template for governance agents (Sentinel, Arbiter, Compliance Monitor) with a shared interface: event subscription, finding emission, intervention authority levels (warn, restrict, suspend, terminate), audit trail production, and enforced self-modification prohibition.
- [ ] **MG-05: Governance event bus** — Implement a pub/sub event system carrying fleet events, governance findings, and intervention events with filtering by type/agent/severity and durable storage for audit. Start with single-process (shared log file), design for multi-process at fleet scale.
- [ ] **MG-06: Governance rule engine** — Build a configurable rule engine evaluating fleet behavior via declarative condition-action pairs (threshold, pattern, temporal, and composite rules). Rules are version-controlled and require Admiral approval to modify.
- [ ] **MG-07: Governance intervention protocol** — Implement the four-level escalation ladder (Warn, Restrict, Suspend, Terminate) with documented entry criteria, cooldown periods, reversal paths, and full-context audit records for each intervention.

## Core Governance Agents

- [ ] **MG-02: Sentinel agent full implementation** — Implement the Sentinel with four detection capabilities: cross-session loop detection, budget burn rate anomaly monitoring, gradual scope drift detection, and automatic intervention triggering via the escalation ladder.
- [ ] **MG-03: Arbiter agent** — Implement conflict resolution between agents handling contradictory outputs, overlapping scope claims, and ambiguous decision authority. Resolution strategies: precedence-based, evidence-based (Brain-backed rationale), and structured escalation to Admiral.
- [ ] **MG-04: Compliance Monitor agent** — Implement continuous compliance checking against all 16 Standing Orders: verify hook enforcement for mechanical SOs, sample and assess outputs for judgment-assisted SOs, and track compliance signal trends for advisory SOs. Produce periodic per-SO compliance reports.

## Self-Governance & Metrics

- [ ] **MG-09: Governance agent self-governance** — Enforce that governance agents cannot modify their own rules or configuration (hook-enforced), apply budget limits and intervention rate limits, run a meta-Sentinel on governance agents themselves, and maintain a separate tamper-evident audit trail.
- [ ] **MG-10: Governance metrics and KPIs** — Compute and persist six key metrics: intervention rate, false positive rate, detection latency, resolution time, compliance score trend, and governance overhead. Establish baseline targets and export for dashboard consumption.
- [ ] **MG-08: Governance audit dashboard** — Build a CLI view displaying active governance findings, intervention history, per-SO compliance scorecard, governance agent health status, and false positive tracking for rule tuning.

## Operations & Multi-Operator

- [ ] **MG-11: Multi-operator governance** — Implement operator roles (Owner/Operator/Observer) with an authority matrix. Higher tier wins conflicts; same tier defaults to conservative action. Emergency Halt is non-negotiable. Max 2-3 Operators per fleet.
- [ ] **MG-12: Operator handoff procedure** — Export full fleet state (trust calibration, roster, Brain health, task manifest) for incoming operator review and acknowledgment. Revoke outgoing identity tokens and renew for incoming.
- [ ] **MG-13: Fallback decomposer mode** — Enable Admiral to act as temporary Orchestrator when Orchestrator fails: generate 1-3 macro-tasks, route to Tier 1 specialists only, serial execution, 5-minute duration limit, automatic revert on Orchestrator recovery.

---

## Dependencies

| Task | Depends on | Downstream |
|------|-----------|------------|
| MG-01 | — | MG-02, MG-03, MG-04, MG-07, MG-09 |
| MG-05 | — | MG-02, MG-03, MG-04, MG-06, MG-07, MG-08, MG-10 |
| MG-06 | MG-05 | MG-09 |
| MG-07 | MG-01, MG-05 | MG-08, MG-10 |
| MG-02 | MG-01, MG-05 | MG-09 |
| MG-03 | MG-01, MG-05 | — |
| MG-04 | MG-01, MG-05 | — |
| MG-08 | MG-05, MG-07 | — |
| MG-09 | MG-01, MG-02, MG-06 | — |
| MG-10 | MG-05, MG-07 | Stream 20 (Data Ecosystem) |
| MG-11 | — | MG-03, MG-12 |
| MG-12 | MG-11 | — |
| MG-13 | — | — |
