# Stream 16: Meta-Governance — Agents Governing Agents

> *"Quis custodiet ipsos custodes?" — Juvenal*

**Scope:** The complete meta-governance layer where governance agents monitor and enforce rules on other agents. Based on Part 10 of the Admiral Framework spec — Admiral Self-Calibration, Multi-Operator Governance, and the governance agent architecture referenced throughout the spec (Sentinel for loop/drift detection, Arbiter for conflict resolution, Compliance Monitor for Standing Order adherence). This stream builds the infrastructure that makes governance autonomous, auditable, and self-correcting.

**Why this matters:** Without meta-governance, enforcement depends on hooks alone. Hooks are deterministic but narrow — they catch what they are programmed to catch. Governance agents provide the judgment-assisted layer: they detect emergent patterns (scope drift over time, budget erosion across sessions, inter-agent conflicts) that no single hook can see. The governance layer is the immune system's adaptive component.

---

## 16.1 Governance Agent Framework

- [ ] **MG-01: Governance agent framework**
  - **Description:** Design and implement the base class/template for governance agents (Sentinel, Arbiter, Compliance Monitor). Define the shared interface: event subscription, finding emission, intervention authority, audit trail production. Governance agents are distinct from fleet agents — they operate on the fleet's behavior, not on user tasks. The framework must enforce that governance agents cannot be assigned user work and cannot modify their own configuration.
  - **Done when:** Base governance agent template exists with: event subscription interface, finding report format, intervention action types (warn, restrict, suspend, terminate), audit log integration, self-modification prohibition enforced. At least one governance agent (Sentinel) can be instantiated from the template.
  - **Files:** `admiral/governance/base.sh` (new), `admiral/governance/types.sh` (new), `admiral/governance/README.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 10 — Admiral Self-Calibration; Part 11 — Standing Orders (SO 1: Identity Discipline)
  - **Depends on:** —

---

## 16.2 Core Governance Agents

- [ ] **MG-02: Sentinel agent full implementation**
  - **Description:** Implement the Sentinel governance agent with four detection capabilities: (1) loop detection — identify agents repeating the same action pattern more than 3 times without progress, extending beyond what the existing `loop_detector` hook catches to include cross-session and multi-agent loops; (2) budget monitoring — track per-agent and per-task token consumption against budgets, detect burn rate anomalies; (3) scope drift detection — compare agent actions against their defined scope boundaries over time, detecting gradual drift that individual hook checks miss; (4) automatic intervention — when a violation is detected, execute the governance intervention protocol (MG-07). The Sentinel operates continuously during fleet sessions.
  - **Done when:** Sentinel detects loop patterns across agents, flags budget burn rate anomalies, identifies scope drift over a session, and triggers interventions per the escalation ladder. Integration tests demonstrate all four capabilities with synthetic fleet event streams.
  - **Files:** `admiral/governance/sentinel.sh` (new), `admiral/governance/tests/test_sentinel.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 10 — Bottleneck Detection, Fallback Decomposer Mode; Part 7 — Failure Mode Catalog (loop detection)
  - **Depends on:** MG-01, MG-05

- [ ] **MG-03: Arbiter agent**
  - **Description:** Implement the Arbiter governance agent for conflict resolution between agents. The Arbiter detects when two agents produce contradictory outputs for the same task, when agents claim overlapping scope, or when decision authority is ambiguous. Resolution strategies: (1) precedence-based — higher-authority agent wins; (2) evidence-based — agent with stronger Brain-backed rationale wins; (3) escalation — when neither strategy resolves, escalate to Admiral with a structured conflict report. The Arbiter also adjudicates when multiple operators issue conflicting directives (per Multi-Operator Governance in Part 10).
  - **Done when:** Arbiter detects contradictory agent outputs, resolves conflicts using precedence and evidence strategies, produces structured conflict reports for Admiral escalation, and handles multi-operator directive conflicts. Tests cover all three resolution strategies plus the escalation path.
  - **Files:** `admiral/governance/arbiter.sh` (new), `admiral/governance/tests/test_arbiter.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 10 — Multi-Operator Governance, Conflict Resolution Between Operators; Part 11 — Escalation Protocol
  - **Depends on:** MG-01, MG-05

- [ ] **MG-04: Compliance Monitor agent**
  - **Description:** Implement the Compliance Monitor governance agent for continuous compliance checking against Standing Orders. The monitor validates that all 16 Standing Orders are being observed by fleet agents during execution. For mechanically-enforceable SOs (SO 1, 3, 6, 8, 10, 15), verify hook enforcement is active and functioning. For judgment-assisted SOs (SO 5, 7, 9, 11, 12, 14, 16), sample agent outputs and assess compliance patterns. For advisory SOs (SO 2, 4, 13), track compliance signals over time and flag degradation trends. Produce a periodic compliance report with per-SO scores.
  - **Done when:** Compliance Monitor produces per-SO compliance scores, detects when hook enforcement is bypassed or disabled, identifies judgment-assisted SO compliance degradation trends, and generates structured compliance reports. Tests verify detection of at least one violation per mechanism type (mechanical, judgment-assisted, advisory).
  - **Files:** `admiral/governance/compliance_monitor.sh` (new), `admiral/governance/tests/test_compliance_monitor.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 11 — Standing Orders (all 16); `standing-orders-enforcement-map.md`
  - **Depends on:** MG-01, MG-05

---

## 16.3 Governance Infrastructure

- [ ] **MG-05: Governance event bus**
  - **Description:** Implement an event system for governance agents to communicate findings, subscribe to fleet events, and coordinate interventions. The event bus carries three event types: (1) fleet events — agent actions, tool calls, handoffs, escalations from the normal fleet operation; (2) governance findings — detection results from Sentinel, Arbiter, and Compliance Monitor; (3) intervention events — actions taken by governance agents (warnings issued, restrictions applied, agents suspended). The bus must support pub/sub, event filtering by type/agent/severity, and durable event storage for audit. Design for single-process operation initially (shared event log file) with a path to multi-process (IPC/message queue) at fleet scale.
  - **Done when:** Event bus supports pub/sub with filtering, stores events durably for audit, governance agents can subscribe to fleet events and publish findings, and intervention events are recorded. Tests verify event flow between publisher and subscriber, filtering, and durable storage.
  - **Files:** `admiral/governance/event_bus.sh` (new), `admiral/governance/events/` (new directory for event schemas), `admiral/governance/tests/test_event_bus.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 9 — Fleet Observability (event streaming)
  - **Depends on:** —

- [ ] **MG-06: Governance rule engine**
  - **Description:** Implement a configurable rule engine that governance agents use to evaluate fleet behavior. Rules are expressed as condition-action pairs in a declarative format (JSON or YAML). Conditions match against fleet events (agent role, action type, resource consumption, timing). Actions specify the governance response (log, warn, restrict, escalate). The rule engine supports: (1) threshold rules — "if token consumption exceeds 80% of budget, warn"; (2) pattern rules — "if same error signature appears 3 times in 5 minutes, intervene"; (3) temporal rules — "if no checkpoint in 30 minutes, warn"; (4) composite rules — AND/OR combinations of the above. Rules are version-controlled and require Admiral approval to modify.
  - **Done when:** Rule engine evaluates threshold, pattern, temporal, and composite rules against fleet event streams. Rules are loadable from configuration files. Rule changes are logged with change author and rationale. Tests cover all four rule types plus composite combinations.
  - **Files:** `admiral/governance/rule_engine.sh` (new), `admiral/governance/rules/` (new directory for rule definitions), `admiral/governance/tests/test_rule_engine.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 3 — Deterministic Enforcement (enforcement spectrum); Part 10 — Trust Calibration
  - **Depends on:** MG-05

- [ ] **MG-07: Governance intervention protocol**
  - **Description:** Define and implement the structured process for governance agent interventions. Interventions follow an escalation ladder: (1) **Warn** — log the finding, notify the agent and Orchestrator, no action restriction; (2) **Restrict** — narrow the agent's tool access or authority tier for the remainder of the session; (3) **Suspend** — pause the agent's current task, checkpoint state, reassign to another agent or queue for Admiral review; (4) **Terminate** — end the agent's session entirely, preserve all state for forensic review. Each intervention level has entry criteria (what triggers escalation to the next level), a cooldown period (how long before re-evaluation), and a reversal path (how the agent can return to normal operation). All interventions are logged with full context for audit.
  - **Done when:** Intervention protocol implemented with all four levels. Each level has documented entry criteria, cooldown, and reversal path. Interventions produce structured audit records. Tests verify the escalation ladder from warn through terminate, including cooldown and reversal.
  - **Files:** `admiral/governance/intervention.sh` (new), `admiral/governance/tests/test_intervention.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 10 — Admiral Self-Calibration (trust withdrawal); Part 11 — Emergency Halt Protocol
  - **Depends on:** MG-01, MG-05

---

## 16.4 Governance Oversight and Metrics

- [ ] **MG-08: Governance audit dashboard**
  - **Description:** Build a view (CLI and/or control plane integration) that displays all governance actions, interventions, and their outcomes. The dashboard surfaces: (1) active governance findings — current violations being tracked; (2) intervention history — what interventions were taken, on which agents, with what outcomes; (3) compliance scorecard — per-SO compliance scores from the Compliance Monitor; (4) governance agent health — are governance agents themselves running, responsive, and producing findings; (5) false positive tracking — interventions that were reversed or overridden by the Admiral, indicating the governance rules need tuning.
  - **Done when:** Dashboard renders governance state in CLI format. Shows active findings, intervention history, compliance scores, governance agent health, and false positive rates. Data sourced from governance event bus. Tests verify rendering with synthetic governance data.
  - **Files:** `admiral/governance/dashboard.sh` (new), `control-plane/src/governance-view.ts` (new, if integrating with control plane)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 9 — Fleet Observability, Fleet Control Plane
  - **Depends on:** MG-05, MG-07

- [ ] **MG-09: Governance agent self-governance**
  - **Description:** Implement constraints that prevent governance agents from going rogue. This is the "who watches the watchmen" problem. Safeguards: (1) governance agents cannot modify their own rules, configuration, or authority (enforced by hooks, not instructions); (2) governance agents are subject to the same budget limits as fleet agents; (3) governance agents' interventions are rate-limited — no more than N interventions per time window to prevent runaway governance; (4) a meta-Sentinel monitors governance agents for the same patterns (loops, drift, budget) that governance agents monitor in fleet agents; (5) all governance agent actions are logged to a separate, tamper-evident audit trail that governance agents cannot modify. The Admiral retains ultimate override authority over all governance actions.
  - **Done when:** Governance agents cannot modify their own configuration (hook-enforced). Intervention rate limits are active. Meta-Sentinel monitors governance agent behavior. Separate audit trail exists for governance actions. Tests demonstrate that a governance agent attempting self-modification is blocked, and that runaway intervention patterns are detected and halted.
  - **Files:** `admiral/governance/self_governance.sh` (new), `admiral/governance/tests/test_self_governance.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 10 — The Admiral as Meta-Agent (hard constraints on meta-agent Admirals)
  - **Depends on:** MG-01, MG-02, MG-06

- [ ] **MG-10: Governance metrics and KPIs**
  - **Description:** Define and implement metrics that track governance effectiveness. Key metrics: (1) intervention rate — how often governance agents intervene, trending over time; (2) false positive rate — interventions reversed or overridden by Admiral / total interventions; (3) detection latency — time from violation occurrence to governance detection; (4) resolution time — time from detection to resolution (intervention or Admiral decision); (5) compliance score trend — per-SO compliance over time; (6) governance overhead — what percentage of fleet resources are consumed by governance agents themselves. Metrics feed into the Data Ecosystem (Stream 17) as operational data. Establish baseline targets and track improvement.
  - **Done when:** All six metrics are computed from governance event data. Metrics are persisted and trend-trackable across sessions. Baseline targets are documented. Metrics are exportable for dashboard consumption. Tests verify metric computation with synthetic governance event sequences.
  - **Files:** `admiral/governance/metrics.sh` (new), `admiral/governance/tests/test_metrics.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 8 — Fleet Health Metrics; Part 12 — Stream 4: Admiral Operational Data
  - **Depends on:** MG-05, MG-07
