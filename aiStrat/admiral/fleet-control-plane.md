<!-- Admiral Framework v0.3.1-alpha -->
# FLEET CONTROL PLANE

*The real-time operational surface where operators manage AI workforces.*

> **Relationship to Section 30 (Fleet Observability):** Section 30 defines the instrumentation — traces, logs, metrics, agent telemetry. The Fleet Control Plane defines what operators *do* with that instrumentation: the dashboard, the alerts, the interventions, the operational workflows. Observability is the data. The Control Plane is the interface.

-----

## The Command Center

The Fleet Control Plane is the single surface where operators see fleet state and act on it. It is to AI agent fleets what Kubernetes dashboards are to container clusters, what Datadog is to application infrastructure, what Stripe dashboards are to payment operations.

### Fleet Status View

The primary view answers five questions instantly:

1. **What is running?** — Active agents, their roles, their current tasks
2. **What is healthy?** — Green/yellow/red status for each agent and the fleet overall
3. **What is consuming resources?** — Token burn rate, budget remaining, cost trajectory
4. **What needs attention?** — Active alerts, pending escalations, blocked tasks
5. **What happened recently?** — Timeline of significant events, decisions, failures

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIRAL FLEET STATUS                      │
│                                                              │
│  Agents running: 32    Tasks active: 114    Budget burn: 42% │
│  Agents idle: 8        Tasks queued: 23     Time elapsed: 4h │
│  Agents failed: 1      Tasks blocked: 3     Est. remaining: 6h│
│                                                              │
│  Fleet Health: ██████████████████░░░░ 78% (NOMINAL)          │
│                                                              │
│  ⚠ ALERTS (3)                                                │
│  ├─ [HIGH] Research Agent-04 looping: 8 retries on same error│
│  │         → Loop Breaker engaged, agent paused              │
│  ├─ [MED]  Planner exceeded 80% budget threshold             │
│  │         → Token Budgeter warning issued                   │
│  └─ [LOW]  QA Agent-02 blocked on tool failure (MCP timeout) │
│            → Recovery ladder: retry 2/3                      │
│                                                              │
│  RECENT EVENTS                                               │
│  14:32  Orchestrator decomposed task-0089 into 5 chunks      │
│  14:31  Backend Impl-03 completed task-0084 (first-pass QA ✓)│
│  14:29  Security Auditor flagged CVE in dependency (escalated)│
│  14:28  Research Agent-04 entered retry loop (detected)       │
│  14:25  Budget checkpoint: 42% consumed, 58% remaining       │
└─────────────────────────────────────────────────────────────┘
```

### Agent Detail View

Drilling into any agent shows:

| Field | Content |
|---|---|
| **Identity** | Agent name, role, model tier, session ID |
| **Current task** | Task ID, description, progress estimate |
| **Resource consumption** | Tokens consumed (input/output/thinking), cost, time |
| **Decision history** | Recent decisions with authority tier used |
| **Health signals** | Context utilization, error rate, retry count, latency |
| **Dependencies** | Tools in use, other agents awaiting output, blocked-by list |

### Task Flow View

Shows work flowing through the fleet:

```
task-0089 "Implement payment webhook handler"
├── Decomposed by: Orchestrator (14:32)
├── Chunks: 5
│   ├── chunk-1: API endpoint scaffold     → Backend Impl-01 [DONE ✓]
│   ├── chunk-2: Webhook validation logic  → Backend Impl-02 [IN PROGRESS 60%]
│   ├── chunk-3: Event processing pipeline → Backend Impl-03 [QUEUED]
│   ├── chunk-4: Error handling & retries  → Backend Impl-01 [QUEUED]
│   └── chunk-5: Integration tests         → QA Agent-01 [WAITING on chunks 1-4]
├── Budget: 120K tokens allocated, 34K consumed (28%)
├── Quality gate: QA review required before merge
└── Deadline: none specified
```

-----

## Alert System

Alerts are the mechanism by which the fleet communicates "something needs attention" to operators. Without alerts, operators must actively watch the dashboard. With alerts, the dashboard watches itself and notifies operators when intervention may be needed.

### Alert Classification

| Severity | Meaning | Operator Action Required | Examples |
|---|---|---|---|
| **CRITICAL** | Fleet safety or integrity at risk | Immediate intervention | Security breach detected, emergency halt triggered, total budget exhaustion |
| **HIGH** | Agent failure requiring attention | Review within minutes | Agent in retry loop, budget threshold exceeded, escalation from recovery ladder |
| **MEDIUM** | Degraded performance or quality | Review within the hour | First-pass quality below threshold, latency spike, tool intermittent failure |
| **LOW** | Informational anomaly | Review when convenient | Unusual pattern detected, configuration drift, Brain entry decay warning |

### Alert Fatigue Prevention

The most dangerous failure mode for an alert system is alert fatigue — when operators receive so many alerts that they ignore all of them, including the critical ones.

**Defenses:**

| Defense | Mechanism |
|---|---|
| **Deduplication** | Same alert fires once, with a count, not once per occurrence |
| **Suppression windows** | Known issues can be suppressed for a time window after acknowledgment |
| **Escalation only** | Alerts that the fleet resolved automatically are logged, not surfaced |
| **Severity gating** | Operators configure which severities produce notifications vs. log entries |
| **Aggregation** | Multiple related alerts collapse into a single root-cause alert |

**The anti-pattern:** Every governance agent sends a Slack notification for every finding. Twenty notifications per day. All ignored within a week. Route findings to the dashboard. Reserve push notifications for CRITICAL and HIGH.

-----

## Operator Interventions

The Control Plane is not read-only. Operators act through it.

### Intervention Catalog

| Intervention | Scope | Reversible? | Authorization |
|---|---|---|---|
| **Pause agent** | Single agent | Yes (resume) | Any operator |
| **Pause fleet** | All agents | Yes (resume) | Operator or Owner |
| **Emergency halt** | All agents, immediate | Yes (requires Owner to resume) | Any tier (Section 35) |
| **Kill task** | Single task and its sub-tasks | No (task must be re-queued) | Operator |
| **Adjust budget** | Single agent or fleet-wide | Yes | Operator |
| **Override decision** | Single pending Propose-tier decision | No (decision is made) | Operator |
| **Reroute task** | Move task from one agent to another | Partial (progress may be lost) | Operator |
| **Promote/demote tier** | Change an agent's model tier | Yes | Operator |
| **Modify policy** | Change Standing Orders or enforcement | Varies | Owner |
| **Inject context** | Provide additional context to a running agent | No (context is consumed) | Operator |

### Intervention Audit Trail

Every intervention is recorded:

```
{
  "timestamp": "2026-03-14T14:33:12Z",
  "operator": "sean@admiral.dev",
  "intervention": "pause_agent",
  "target": "research-agent-04",
  "reason": "Retry loop detected, 8 consecutive failures on same error signature",
  "fleet_state_snapshot": { ... },
  "outcome": "Agent paused. Loop Breaker confirmed. Pending manual review."
}
```

This audit trail is non-deletable. It feeds into the Brain as operational memory — what interventions were needed, why, and what happened after. Over time, patterns in interventions reveal systematic issues that policy changes can address.

-----

## Operational Workflows

The Control Plane supports recurring operational patterns that operators perform.

### Morning Review

An operator arriving at the start of their shift sees:

1. **Overnight summary** — What happened while no one was watching. Tasks completed, failures recovered, escalations pending.
2. **Current fleet state** — The Fleet Status View above.
3. **Pending decisions** — Propose-tier decisions awaiting approval. Escalation reports awaiting review.
4. **Budget status** — Daily/weekly/monthly burn rate. Projected exhaustion date.
5. **Anomalies** — Anything that looks different from the fleet's normal operating pattern.

### Incident Response

When a CRITICAL or HIGH alert fires:

1. **Alert detail** — What happened, when, which agent, what was the trigger.
2. **Impact assessment** — Which tasks are affected. Which agents are blocked. What is the blast radius.
3. **Recovery status** — Has the recovery ladder been attempted? What step is it on? Did it succeed?
4. **Intervention options** — What can the operator do right now? (Pause, kill, reroute, escalate.)
5. **Post-incident** — After resolution, what should change? New policy? Different agent configuration? Brain entry for future reference?

### Fleet Scaling

When adding or removing agents:

1. **Current capacity** — How many agents of each type. Current utilization.
2. **Bottleneck analysis** — Which agent types are overloaded. Where is work queuing.
3. **Scaling recommendation** — Based on utilization patterns, what to add or remove.
4. **Validation** — After scaling, confirm the fleet is healthy and work is flowing.

-----

## Integration Points

The Control Plane does not exist in isolation. It integrates with the operator's existing tools.

| Integration | Direction | Purpose |
|---|---|---|
| **Slack/Teams** | Outbound | Alert notifications for CRITICAL/HIGH severity |
| **GitHub** | Bidirectional | PR creation, issue creation, CI status |
| **CI/CD** | Inbound | Pipeline events trigger fleet actions (Section 31) |
| **Datadog/Grafana** | Outbound | Fleet metrics exported for unified monitoring |
| **PagerDuty/OpsGenie** | Outbound | On-call routing for critical fleet failures |
| **Brain** | Bidirectional | Operational memory feeds fleet learning |

-----

## Metrics That Matter

The Control Plane surfaces metrics that help operators make decisions, not metrics that look impressive on a dashboard.

### Operator-Facing Metrics

| Metric | What It Tells the Operator | Action Trigger |
|---|---|---|
| **Fleet utilization** | Are agents busy or idle? | Scale up/down |
| **Task throughput** | How fast is work completing? | Investigate if declining |
| **Budget burn rate** | Will we run out of budget? | Adjust budget or scope |
| **Error rate (rolling 1h)** | Is something breaking more than usual? | Investigate root cause |
| **Escalation backlog** | Are pending decisions piling up? | Review and decide, or widen Autonomous |
| **First-pass quality (rolling)** | Is output quality stable? | Investigate if declining |
| **Mean time to recovery** | When things break, how fast do they heal? | Review recovery ladder if slow |

### Metrics That Do NOT Belong on the Primary Dashboard

| Metric | Why Not |
|---|---|
| Total tokens consumed (cumulative) | Vanity metric — does not inform action |
| Number of agents defined | Configuration metric — irrelevant to operations |
| Lines of code produced | Misleading — more is not better |
| Number of Brain entries | Quantity without quality signal |
| Uptime percentage | Meaningless for non-continuous fleets |

-----

## The Control Plane as Product Surface

This is where Admiral stops being a specification and starts being a product.

The specifications (Parts 1-11) define the rules. The Fleet Control Plane is where those rules become tangible — where operators see them working, where alerts fire when they are violated, where interventions enforce them.

**Every Admiral component has a Control Plane surface:**

| Component | Control Plane Surface |
|---|---|
| Enforcement (Part 3) | Hook execution status, violation log, enforcement coverage map |
| Fleet (Part 4) | Agent roster, status, routing visualization |
| Brain (Part 5) | Knowledge health, query patterns, decay warnings |
| Execution (Part 6) | Task decomposition view, parallel execution status |
| Quality (Part 7) | Quality gate results, failure mode frequency |
| Operations (Part 8) | Cost tracking, health metrics, scaling recommendations |
| Observability (Part 9) | Trace exploration, metric dashboards, alert management |

The Control Plane unifies all of these into one operational surface. Without it, each component is a separate concern that operators must mentally integrate. With it, the fleet is a single system with a single management interface.

-----

## Anti-Patterns

> **ANTI-PATTERN: DASHBOARD WITHOUT DRILL-DOWN** — A status page showing "32 agents running, 114 tasks active" with no way to click into a specific agent or task. Aggregate numbers are the starting point, not the destination. Operators need to go from "something is wrong" to "this specific thing is wrong" in two clicks.

> **ANTI-PATTERN: INTERVENTION WITHOUT CONFIRMATION** — An operator clicks "Emergency Halt" and all agents stop immediately with no confirmation dialog. High-impact interventions require confirmation. The cost of a 2-second confirmation dialog is negligible. The cost of an accidental fleet halt is not.

> **ANTI-PATTERN: HISTORICAL BLINDNESS** — A Control Plane that only shows current state. Operators need to answer "what changed?" as often as "what is?" Provide timeline views, diff views, and trend indicators alongside current-state displays.

> **ANTI-PATTERN: OPERATOR LOCK-IN** — A Control Plane that only works through its own UI. All interventions should also be available via API and CLI. Operators who prefer terminal access should not be forced into a web dashboard. The Control Plane is the canonical interface, not the only one.

-----
