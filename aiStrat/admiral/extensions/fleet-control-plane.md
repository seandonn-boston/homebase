# FLEET CONTROL PLANE

*The real-time operational surface where operators manage AI workforces — from a single CLI agent to a federated enterprise fleet.*

> **Relationship to Fleet Observability (Part 9):** Fleet Observability defines the instrumentation — traces, logs, metrics, agent telemetry. The Fleet Control Plane defines what operators *do* with that instrumentation: the dashboard, the alerts, the interventions, the operational workflows. Observability is the data. The Control Plane is the interface.

> **Core principle:** The Control Plane is not a Level 3+ luxury. It exists at every adoption level, scaled to what the operator needs. A solo developer running one agent still needs to see what that agent is doing, catch runaway behavior, and understand what happened. The difference between levels is scope and sophistication, not presence or absence.

-----

## Progressive Control Plane by Adoption Level

The Control Plane grows with the fleet. Each level builds on the previous.

| Level | Surface | Primary Interface | Key Capabilities |
|---|---|---|---|
| **Level 1** — Disciplined Solo | CLI Dashboard | Terminal | Event logging, status, runaway detection |
| **Level 2** — Coordinated Team | Fleet Dashboard | Web UI | Fleet status, alerts, traces, basic intervention |
| **Level 3** — Governed Operations | Governance Dashboard | Web UI + API | Audit trail, policy management, governance health |
| **Level 4** — Scaled Operations | Operations Dashboard | Web UI + API + Integrations | Trend analysis, cost forecasting, external integrations |
| **Level 5** — Enterprise Federation | Federation Dashboard | Web UI + API + CLI + Federation Protocol | Cross-fleet view, multi-operator governance |

-----

## Level 1 — CLI Dashboard

*For a single operator running a single agent. The minimum viable Control Plane.*

### Structured Event Logging

Every agent action emits a structured JSON-lines event to stdout or a log file. This is the foundation all higher levels build on.

```jsonl
{"ts":"2026-03-14T14:32:01Z","event":"tool_call","agent":"impl-01","tool":"write_file","path":"src/api.ts","tokens":{"input":1200,"output":340},"duration_ms":2100}
{"ts":"2026-03-14T14:32:04Z","event":"task_start","agent":"impl-01","task":"implement-webhook","chunk":"1/3","budget_remaining":85000}
{"ts":"2026-03-14T14:32:18Z","event":"hook_result","agent":"impl-01","hook":"lint-check","exit_code":0,"duration_ms":450}
{"ts":"2026-03-14T14:33:01Z","event":"task_end","agent":"impl-01","task":"implement-webhook","chunk":"1/3","status":"complete","tokens_consumed":4200}
```

### Terminal Status Display

A compact terminal view (like `htop` for agents) showing the agent's current state:

```
┌─ ADMIRAL STATUS ──────────────────────────────────────┐
│  Agent: impl-01 (Backend Implementer)                  │
│  Task:  implement-webhook (chunk 2/3)                  │
│  Model: claude-sonnet-4-6 (Tier 2)                     │
│  Status: ACTIVE                                        │
│                                                        │
│  Tokens: ████████░░░░░░░░ 12,400 / 80,000 (15%)       │
│  Time:   12m 34s elapsed                               │
│  Errors: 0 | Retries: 0 | Hooks: 14 pass, 0 fail      │
│                                                        │
│  Last 3 events:                                        │
│  14:33:01  task_end     chunk 1/3 complete              │
│  14:33:04  task_start   chunk 2/3 started               │
│  14:33:08  tool_call    read_file src/webhooks.ts       │
└────────────────────────────────────────────────────────┘
```

### Runaway Detection

Even at Level 1, the Control Plane watches for runaway behavior:

| Detection | Trigger | Response |
|---|---|---|
| **Loop detection** | Same error signature 3+ times in sequence | Alert + auto-pause after 5 |
| **Token budget alert** | 80% of budget consumed | Warning displayed in status |
| **Token budget enforcement** | 100% of budget consumed | Agent halted |
| **Time limit** | Configurable max session duration | Warning at 80%, halt at 100% |
| **Idle detection** | No events for configurable interval | Warning displayed |

### What Level 1 Does NOT Include

- No web UI (terminal only)
- No fleet view (single agent)
- No persistent dashboard (status on demand or tail the log)
- No external integrations
- No governance agent monitoring

-----

## Level 2 — Fleet Dashboard

*For a coordinated team of 5-12 agents with an Orchestrator. The first multi-agent surface.*

Everything from Level 1, plus:

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
│  Agents running: 7     Tasks active: 12     Budget burn: 42% │
│  Agents idle: 1        Tasks queued: 5      Time elapsed: 4h │
│  Agents failed: 0      Tasks blocked: 1     Est. remaining: 6h│
│                                                              │
│  Fleet Health: ██████████████████░░░░ 78% (NOMINAL)          │
│                                                              │
│  ⚠ ALERTS (2)                                                │
│  ├─ [HIGH] Research Agent looping: 5 retries on same error   │
│  │         → Loop Breaker engaged, agent paused              │
│  └─ [MED]  Planner exceeded 80% budget threshold             │
│            → Token Budgeter warning issued                   │
│                                                              │
│  RECENT EVENTS                                               │
│  14:32  Orchestrator decomposed task-0089 into 5 chunks      │
│  14:31  Backend Impl-03 completed task-0084 (first-pass QA ✓)│
│  14:29  Security Auditor flagged CVE in dependency (escalated)│
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

Shows work flowing through the fleet as an execution trace tree:

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

### Alert System

Alerts communicate "something needs attention" to operators. Without alerts, operators must actively watch the dashboard. With alerts, the dashboard watches itself.

#### Alert Classification

| Severity | Meaning | Operator Action Required | Examples |
|---|---|---|---|
| **CRITICAL** | Fleet safety or integrity at risk | Immediate intervention | Security breach detected, emergency halt triggered, total budget exhaustion |
| **HIGH** | Agent failure requiring attention | Review within minutes | Agent in retry loop, budget threshold exceeded, escalation from recovery ladder |
| **MEDIUM** | Degraded performance or quality | Review within the hour | First-pass quality below threshold, latency spike, tool intermittent failure |
| **LOW** | Informational anomaly | Review when convenient | Unusual pattern detected, configuration drift, Brain entry decay warning |

#### Alert Fatigue Prevention

The most dangerous failure mode for an alert system is alert fatigue — when operators receive so many alerts that they ignore all of them, including the critical ones.

| Defense | Mechanism |
|---|---|
| **Deduplication** | Same alert fires once, with a count, not once per occurrence |
| **Suppression windows** | Known issues can be suppressed for a time window after acknowledgment |
| **Escalation only** | Alerts that the fleet resolved automatically are logged, not surfaced |
| **Severity gating** | Operators configure which severities produce notifications vs. log entries |
| **Aggregation** | Multiple related alerts collapse into a single root-cause alert |

**The anti-pattern:** Every governance agent sends a Slack notification for every finding. Twenty notifications per day. All ignored within a week. Route findings to the dashboard. Reserve push notifications for CRITICAL and HIGH.

### Basic Interventions

| Intervention | Scope | Reversible? |
|---|---|---|
| **Pause agent** | Single agent | Yes (resume) |
| **Pause fleet** | All agents | Yes (resume) |
| **Kill task** | Single task and its sub-tasks | No (task must be re-queued) |
| **Adjust budget** | Single agent or fleet-wide | Yes |

-----

## Level 3 — Governance Dashboard

*For organizations running governed fleets with governance agents. The trust and policy surface.*

Everything from Level 2, plus:

### Governance Agent Health

Monitor the health of governance agents themselves — the agents watching the agents:

| Governance Agent | Health Signal | Alert If |
|---|---|---|
| Scope Guardian | Last check timestamp, drift count | No check in 5 minutes |
| Quality Auditor | Audit queue depth, pass/fail ratio | Queue > 10 or pass rate < 70% |
| Token Budgeter | Budget tracking accuracy, alert count | Tracking drift > 5% |
| Loop Breaker | Detection latency, false positive rate | Detection > 30 seconds |
| Hallucination Spotter | Verification queue, catch rate | Queue > 5 or catch rate drops |
| Security Auditor | Scan coverage, finding severity | Unscanned commits > 3 |
| Consistency Checker | Cross-agent conflict count | Conflicts detected and unresolved |

### Decision Authority Visualization

Show which authority tier was used for each decision, enabling operators to see if agents are operating within their boundaries:

```
Recent Decisions (last hour):
  14:33  impl-01    AUTONOMOUS   Added error handler to webhook endpoint
  14:31  impl-03    AUTONOMOUS   Chose Map over Object for lookup table
  14:29  sec-audit  ESCALATE     Flagged CVE-2026-1234 in express dependency
  14:25  orch-01    PROPOSE      Suggested splitting task-0089 differently
  14:20  impl-02    AUTONOMOUS   Selected retry strategy for API calls
```

### Intervention Audit Trail

Every operator intervention is recorded in a non-deletable log that feeds into the Brain:

```json
{
  "timestamp": "2026-03-14T14:33:12Z",
  "operator": "sean@admiral.dev",
  "intervention": "pause_agent",
  "target": "research-agent-04",
  "reason": "Retry loop detected, 8 consecutive failures on same error signature",
  "fleet_state_snapshot": { "..." : "..." },
  "outcome": "Agent paused. Loop Breaker confirmed. Pending manual review."
}
```

This audit trail is non-deletable. It feeds into the Brain as operational memory — what interventions were needed, why, and what happened after. Over time, patterns in interventions reveal systematic issues that policy changes can address.

### Policy Management Interface

Operators modify policies, not individual decisions:

- View and edit Standing Orders enforcement status
- Adjust decision authority tiers per agent role (not per agent instance)
- Configure alert thresholds and suppression rules
- Set quality floor parameters
- Define escalation routing rules

### Full Intervention Catalog

| Intervention | Scope | Reversible? | Authorization |
|---|---|---|---|
| **Pause agent** | Single agent | Yes (resume) | Any operator |
| **Pause fleet** | All agents | Yes (resume) | Operator or Owner |
| **Emergency halt** | All agents, immediate | Yes (requires Owner to resume) | Any tier (see Multi-Operator Governance, Part 10) |
| **Kill task** | Single task and its sub-tasks | No (task must be re-queued) | Operator |
| **Adjust budget** | Single agent or fleet-wide | Yes | Operator |
| **Override decision** | Single pending Propose-tier decision | No (decision is made) | Operator |
| **Reroute task** | Move task from one agent to another | Partial (progress may be lost) | Operator |
| **Promote/demote tier** | Change an agent's model tier | Yes | Operator |
| **Modify policy** | Change Standing Orders or enforcement | Varies | Owner |
| **Inject context** | Provide additional context to a running agent | No (context is consumed) | Operator |

-----

## Level 4 — Operations Dashboard

*For mature operations with trend analysis, forecasting, and external tool integration.*

Everything from Level 3, plus:

### Trend Analysis

Move from "what is happening now" to "what is changing over time":

- Quality trend: Is first-pass quality improving or degrading across sessions?
- Cost trend: Is cost per task decreasing as agents learn (Brain strengthening)?
- Error trend: Are the same failure modes recurring or being eliminated?
- Recovery trend: Is mean time to recovery improving?
- Escalation trend: Are fewer decisions being escalated (trust calibration working)?

### Cost Tracking and Forecasting

| Metric | Current | Trend | Forecast |
|---|---|---|---|
| Daily token spend | $12.40 | ↓ 8% vs last week | $11.40 next week |
| Cost per completed task | $0.34 | ↓ 12% vs last month | Improving |
| Budget utilization | 67% | Stable | On track for 30-day budget |
| Model tier distribution | 60% T2, 30% T3, 10% T1 | Shifting toward T2 | Recommend more T2 |

### External Integrations

| Integration | Direction | Purpose |
|---|---|---|
| **Slack/Teams** | Outbound | Alert notifications for CRITICAL/HIGH severity |
| **GitHub** | Bidirectional | PR creation, issue creation, CI status |
| **CI/CD** | Inbound | Pipeline events trigger fleet actions (see Event-Driven Operations, Part 9) |
| **Datadog/Grafana** | Outbound | Fleet metrics exported for unified monitoring |
| **PagerDuty/OpsGenie** | Outbound | On-call routing for critical fleet failures |
| **Brain** | Bidirectional | Operational memory feeds fleet learning |

### Operational Workflows

#### Morning Review

An operator arriving at the start of their shift sees:

1. **Overnight summary** — What happened while no one was watching. Tasks completed, failures recovered, escalations pending.
2. **Current fleet state** — The Fleet Status View.
3. **Pending decisions** — Propose-tier decisions awaiting approval. Escalation reports awaiting review.
4. **Budget status** — Daily/weekly/monthly burn rate. Projected exhaustion date.
5. **Anomalies** — Anything that looks different from the fleet's normal operating pattern.

#### Incident Response

When a CRITICAL or HIGH alert fires:

1. **Alert detail** — What happened, when, which agent, what was the trigger.
2. **Impact assessment** — Which tasks are affected. Which agents are blocked. What is the blast radius.
3. **Recovery status** — Has the recovery ladder been attempted? What step is it on? Did it succeed?
4. **Intervention options** — What can the operator do right now? (Pause, kill, reroute, escalate.)
5. **Post-incident** — After resolution, what should change? New policy? Different agent configuration? Brain entry for future reference?

#### Fleet Scaling

When adding or removing agents:

1. **Current capacity** — How many agents of each type. Current utilization.
2. **Bottleneck analysis** — Which agent types are overloaded. Where is work queuing.
3. **Scaling recommendation** — Based on utilization patterns, what to add or remove.
4. **Validation** — After scaling, confirm the fleet is healthy and work is flowing.

-----

## Level 5 — Federation Dashboard

*For enterprise deployments with multiple fleets, multiple operators, and cross-fleet coordination.*

Everything from Level 4, plus:

### Cross-Fleet View

See all fleets managed by the organization in a single view:

```
┌─────────────────────────────────────────────────────────────┐
│                  ADMIRAL FEDERATION STATUS                    │
│                                                              │
│  Fleet: product-api     Agents: 8   Health: ██████████ 95%  │
│  Fleet: mobile-app      Agents: 6   Health: ████████░░ 80%  │
│  Fleet: data-pipeline   Agents: 12  Health: ██████████ 98%  │
│  Fleet: docs-site       Agents: 3   Health: ██████████ 100% │
│                                                              │
│  Total agents: 29    Total active tasks: 47                  │
│  Federation health: 93% (NOMINAL)                            │
│  Cross-fleet conflicts: 0                                    │
└─────────────────────────────────────────────────────────────┘
```

### Cross-Fleet Brain Federation

- Brain synchronization status between fleet-specific and shared Brain instances
- Knowledge flow visualization: which fleets are producing knowledge, which are consuming
- Cross-fleet knowledge conflict detection and resolution

### Multi-Operator Governance

- Operator permission matrix: who can intervene in which fleet
- Cross-operator conflict resolution (two operators issuing contradictory interventions)
- Delegation and escalation chains across operator tiers
- Audit trail spanning all operators across all fleets

### Cross-Fleet Hook Coordination

- Shared hooks that apply across fleets (organization-wide policies)
- Fleet-specific hook overrides and their justification
- Hook version management across fleet boundaries

-----

## Metrics That Matter

The Control Plane surfaces metrics that help operators make decisions, not metrics that look impressive on a dashboard.

### Operator-Facing Metrics

| Metric | What It Tells the Operator | Action Trigger | Level |
|---|---|---|---|
| **Token budget remaining** | Will this agent finish its task? | Adjust budget or scope | L1+ |
| **Error count (session)** | Is this agent struggling? | Investigate if > 3 | L1+ |
| **Fleet utilization** | Are agents busy or idle? | Scale up/down | L2+ |
| **Task throughput** | How fast is work completing? | Investigate if declining | L2+ |
| **Budget burn rate** | Will we run out of budget? | Adjust budget or scope | L2+ |
| **Error rate (rolling 1h)** | Is something breaking more than usual? | Investigate root cause | L2+ |
| **Escalation backlog** | Are pending decisions piling up? | Review and decide, or widen Autonomous | L3+ |
| **First-pass quality (rolling)** | Is output quality stable? | Investigate if declining | L3+ |
| **Mean time to recovery** | When things break, how fast do they heal? | Review recovery ladder if slow | L3+ |
| **Cost per task (trend)** | Is the fleet getting more efficient? | Investigate if increasing | L4+ |
| **Cross-fleet health** | Are all fleets healthy? | Drill into unhealthy fleet | L5 |

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

The specifications (Parts 1-12) define the rules. The Fleet Control Plane is where those rules become tangible — where operators see them working, where alerts fire when they are violated, where interventions enforce them.

**Every Admiral component has a Control Plane surface:**

| Component | Control Plane Surface | Level |
|---|---|---|
| Strategy (Part 1) | Mission alignment alerts, boundary violation detection | L1+ |
| Enforcement (Part 3) | Hook execution status, violation log, enforcement coverage map | L2+ |
| Fleet (Part 4) | Agent roster, status, routing visualization | L2+ |
| Brain (Part 5) | Knowledge health, query patterns, decay warnings | L3+ |
| Execution (Part 6) | Task decomposition view, parallel execution status | L2+ |
| Quality (Part 7) | Quality gate results, failure mode frequency | L2+ |
| Operations (Part 8) | Cost tracking, health metrics, scaling recommendations | L3+ |
| Observability (Part 9) | Trace exploration, metric dashboards, alert management | L2+ |
| Admiral (Part 10) | Self-calibration decisions, human-expert routing visibility | L3+ |
| Protocols (Part 11) | Escalation and handoff events in the event stream | L2+ |
| Data Ecosystem (Part 12) | Feedback loop health, dataset metrics | L4+ |

The Control Plane unifies all of these into one operational surface. Without it, each component is a separate concern that operators must mentally integrate. With it, the fleet is a single system with a single management interface.

-----

## Anti-Patterns

> **ANTI-PATTERN: NO CONTROL PLANE AT ALL** — Running agents with no structured logging, no status display, no runaway detection. "I'll just watch the terminal output." This works until the agent runs for 30 minutes, produces 50,000 tokens of output, and you have no idea what it did or why. Even Level 1 needs structured event logging.

> **ANTI-PATTERN: DASHBOARD WITHOUT DRILL-DOWN** — A status page showing "32 agents running, 114 tasks active" with no way to click into a specific agent or task. Aggregate numbers are the starting point, not the destination. Operators need to go from "something is wrong" to "this specific thing is wrong" in two clicks.

> **ANTI-PATTERN: INTERVENTION WITHOUT CONFIRMATION** — An operator clicks "Emergency Halt" and all agents stop immediately with no confirmation dialog. High-impact interventions require confirmation. The cost of a 2-second confirmation dialog is negligible. The cost of an accidental fleet halt is not.

> **ANTI-PATTERN: HISTORICAL BLINDNESS** — A Control Plane that only shows current state. Operators need to answer "what changed?" as often as "what is?" Provide timeline views, diff views, and trend indicators alongside current-state displays.

> **ANTI-PATTERN: OPERATOR LOCK-IN** — A Control Plane that only works through its own UI. All interventions should also be available via API and CLI. Operators who prefer terminal access should not be forced into a web dashboard. The Control Plane is the canonical interface, not the only one.

> **ANTI-PATTERN: LEVEL 4 BEFORE LEVEL 1** — Building a sophisticated web dashboard with Datadog integration before you have structured event logging. Each level depends on the previous. You cannot visualize what you do not capture.

-----
