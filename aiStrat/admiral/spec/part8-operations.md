<!-- Admiral Framework v0.4.0-alpha -->
# PART 8 — OPERATIONS

*How work persists, adapts, and scales over time.*

*Parts 1–7 cover a single fleet executing a single phase of work. Part 8 addresses the ongoing reality: sessions end, requirements change, budgets matter, fleets grow and shrink, and multiple projects run simultaneously. These six sections keep the enterprise healthy over time.*

> **Control Plane surface:** Cost tracking, fleet health metrics, and scaling recommendations are the Control Plane's primary operations surface (Level 3+). At Level 4+, trend analysis shows whether the fleet is getting more efficient over time.

-----

## Institutional Memory

> **TL;DR** — Agents lose context between sessions. Use checkpoint files, ledger files, handoff documents, or git-based state to persist across context window boundaries. Session persistence is the single biggest UX pain point in agentic coding.

### Session Persistence Patterns

**Value: Continuity > Velocity.** A fleet that moves fast but loses context between sessions wastes more time reconstructing state than it saved by moving fast. Every persistence pattern below exists to ensure that the next session starts with the *intent* of the previous session intact — not just the status, but the reasoning, the trade-offs, and the unresolved questions.

**1. Checkpoint Files:** Structured summaries at chunk boundaries. Simplest pattern.

> **TEMPLATE: SESSION CHECKPOINT**
>
> SESSION: [Date/time] | FLEET: [Project] | ORCHESTRATOR: [ID]
>
> COMPLETED: [Tasks finished with status]
>
> IN PROGRESS: [Current state]
>
> BLOCKED: [Tasks blocked with references]
>
> NEXT: [Ordered tasks for next session]
>
> DECISIONS MADE: [Count, with references to decision log]
>
> RECOVERY ACTIONS: [Any ladder invocations, or "None"]
>
> RESOURCES CONSUMED: [Tokens / budget, time / budget]
>
> ASSUMPTIONS: [New assumptions Admiral should validate]

**2. Ledger Files:** Running logs maintained by hooks. SessionStart hooks read the ledger to reconstruct context.

**3. Handoff Documents:** Narrative briefings at session end, designed for next session start. Capture intent and reasoning, not just status.

**4. Git-Based State:** Session state committed to git. Branches as work streams. Commits as checkpoints.

**5. Continuous Operation:** Persistent loops — implement, commit, wait for CI, merge, next task. Hooks maintain ledgers as backup.

### Which Pattern to Use

| Scenario | Pattern |
|---|---|
| Single developer, simple project | Checkpoint files |
| Team with shared fleet | Git-based state + handoff documents |
| Long-running autonomous fleet | Continuous operation + ledger files |
| Cross-session complex features | Handoff documents + checkpoint files |

### Decision Log

Chronological record of every non-trivial decision: timestamp, decision, alternatives considered, rationale, authority tier used. Enables the Admiral to audit any fleet's history in under five minutes.

> **ANTI-PATTERN: FALSE CHECKPOINTING** — Summaries that sound comprehensive but omit what was NOT done, what assumptions were made, what shortcuts were taken. Checkpoint reads "everything on track" when three things are subtly broken. Require explicit "Assumptions" and "Recovery Actions" fields. If both are empty, be suspicious. **Judgment boundary:** A checkpoint with empty Assumptions AND empty Recovery Actions is almost certainly incomplete — real work involves assumptions, and real sessions involve at least minor recoveries. Treat this as a signal to audit, not a signal of perfection.

-----

## Adaptation Protocol

> **TL;DR** — Three tiers of change: Tactical (update tasks, no pause), Strategic (pause, cascade through artifacts, resume), Full Pivot (halt, restart from scratch). Every artifact update must cascade through its downstream dependencies.

### Change Classification

| Classification | What Changed | Response |
|---|---|---|
| **Tactical Adjustment** | Task parameters, minor deadline shifts, requirement clarifications | Update affected tasks. No pause. Log. |
| **Strategic Shift** | Mission evolution, Boundary changes, Ground Truth updates, significant scope change | Pause at chunk boundary. Cascade through artifacts. Re-validate. Resume. |
| **Full Pivot** | Fundamental direction change, complete tech change, total scope replacement | Halt fleet. Treat as new deployment. Full Quick-Start. |

### External Intelligence as Adaptation Trigger

The Continuous AI Landscape Monitor (`monitor/`) is designed to surface ecosystem changes that may trigger adaptation. When the Admiral reviews monitor digests and approves seed candidates into the Brain, assess each finding against the change classification:

| Monitor Finding | Likely Classification | Cascade Target |
|---|---|---|
| New flagship model release (e.g., Opus 5) | Strategic Shift | Model Selection (Part 4) → Cost Management → Fleet Composition (Part 4) |
| New economy-tier model matching workhorse quality | Strategic Shift | Model Selection (Part 4) → Cost Management |
| Exemplar tool redesigns agent patterns | Tactical Adjustment | Agent definitions, prompt anatomy, context profiles |
| New MCP server ecosystem emerges | Tactical or Strategic | Tool Registry (Part 4) → Protocol Integration (Part 4) |
| Security vulnerability in tracked dependency | Strategic Shift | Configuration Security (Part 3) → Tool Registry (Part 4) |

The Monitor specification defines a daily scan cadence. The Admiral should review digests at matching cadence and classify findings before they accumulate into stale intelligence.

### The Cascade Map

Framework artifacts form a dependency graph. When one changes, downstream artifacts may become stale.

```
Mission ──→ Boundaries ──→ Success Criteria
     │            │                 │
     │            ▼                 ▼
     │     Work Decomposition ──→ Contract-First Parallelism
     │                                  │
     │                                  ▼
     │     Quality Assurance ──→ Fleet Health Metrics ──→ Cost Management
     │                                  │
     │                                  └──→ Fleet Observability ──→ Evaluation & Benchmarking
     │
     ▼
Ground Truth ──→ Fleet Composition ──→ Decision Authority ──→ Admiral Self-Calibration
                        │
                        ├──→ Context Profiles
                        ├──→ Context Engineering
                        ├──→ Tool Registry ──→ Protocol Integration
                        │                           │
                        │                           └──→ Brain Architecture ──→ Knowledge Protocol
                        │                                        │
                        │                                        └──→ Institutional Memory
                        ├──→ Model Selection ──→ Cost Management
                        └──→ Fleet Scaling & Lifecycle ──→ Event-Driven Operations

Deterministic Enforcement ──→ Configuration File Strategy ──→ Configuration Security
```

**The cascade rule:** Update an artifact, then review every downstream artifact. Revise any that are inconsistent.

**The order rule:** Always cascade top-down. Never update downstream before upstream is finalized. **Value: Consistency > Velocity.** Cascading takes time. Skipping the cascade is faster. But inconsistent artifacts produce agents with contradictory instructions, and the resulting confusion costs far more than the cascade saved.

### Fleet Pause Protocol

1. Complete the current chunk. Do not interrupt mid-task.
2. Collect all checkpoints including assumptions that may be affected.
3. Admiral updates affected artifacts in dependency order.
4. Run Pre-Flight Checklist against updated artifacts.
5. Rebrief each agent with updated context and explicit change summary.
6. Resume with elevated verification on the first post-resumption chunk.

> **ANTI-PATTERN: PATCH WITHOUT CASCADE** — Mission updated but Boundaries and Success Criteria left unchanged. Fleet operates with new direction but old constraints.

> **ANTI-PATTERN: PERPETUAL PIVOT** — Direction changes every session. Fleet never achieves momentum. If Strategic Shifts exceed once per major phase, fix the Mission.

-----

## Cost Management

> **TL;DR** — The biggest cost lever is LLM-Last design (Boundaries (Part 1)): eliminating 30-60% of LLM calls by routing to deterministic tools. Second: model tier assignment. Third: context size via progressive disclosure. Track spend in dollars, not just tokens.

### Cost Drivers and Levers

| Cost Driver | Lever | Impact |
|---|---|---|
| **LLM for deterministic tasks** | LLM-Last design (Boundaries (Part 1)) | **Highest.** Eliminates 30-60% of LLM calls. |
| **Model tier** | Demote where quality is indistinguishable at lower tier (Model Selection (Part 4)) | High. Economy-tier at 1/30th cost. |
| **Context size** | Progressive disclosure, <150 line rule (Configuration File Strategy (Part 2)) | High. Every loaded token is billed. |
| **Retry and rework** | Sharper criteria and self-healing hooks | Medium. Each retry doubles chunk cost. |
| **Over-decomposition** | Consolidate small chunks | Medium. Each chunk pays context tax. |
| **Tool call volume** | Cap calls per task | Lower but compounds at scale. |

### Cost Dimensions

Modern fleet costs break down into four distinct dimensions, each requiring separate tracking:

| Dimension | What It Measures | Why Track Separately |
|---|---|---|
| **Input tokens** | Context loaded into the model (standing + session + working) | Reveals context bloat. Grows with stuffing, shrinks with progressive disclosure. |
| **Output tokens** | Model-generated responses | Reveals verbosity. Should be proportional to task complexity. |
| **Thinking tokens** | Extended reasoning tokens consumed before response begins | Reveals reasoning intensity. Can be 5-50x output volume. Must be budgeted separately. |
| **Tool call costs** | API calls, MCP operations, external service invocations | Reveals tool efficiency. Brute-force solutions inflate this dimension. |

**Per-agent cost attribution:** Track costs at the agent level, not just the task level. This reveals which agents are cost-efficient vs. wasteful. An agent consistently consuming 3x its tier peers on equivalent tasks needs investigation: wrong model tier, poor context profile, or systematic retry loops.

### Cost Budgets

- **Per-session:** Maximum spend before pausing for review. Circuit breaker.
- **Per-phase:** Total allocation for a project phase. Exceeding triggers Strategic Shift.
- **Cost-per-chunk target:** Expected cost at each tier. Chunks exceeding 2x target warrant investigation.
- **Per-agent ceiling:** Maximum cost per agent per session. Prevents runaway agents from consuming the fleet's budget.
- **Extended thinking budget:** Separate allocation for thinking tokens. Default: 2x the output token budget. Enforce via model API parameters, not advisory instructions.

### Economy-Tier Strategy

Models like DeepSeek V3.2 at ~1/30th flagship cost change fleet economics:

- **Tier 4 for first drafts.** Economy draft, higher-tier review.
- **Bulk processing.** Migrations, formatting, boilerplate at economy rates.
- **Adversarial review at low cost.** Second model pass without doubling cost.

> **ANTI-PATTERN: COST BLINDNESS** — Token budgets tracked but never translated to dollars. The fleet runs three weeks before anyone checks the invoice. **Value: Transparency enables sustainable operations.** Cost tracking is not overhead — it is the feedback signal that prevents the fleet from consuming more resources than it produces in value. A fleet that cannot answer "what did this feature cost?" cannot answer "was this fleet worth it?"

### Metered Service Broker (Actionable — Deploy During Fleet Setup)

When a fleet shares pooled access to external subscription services (LLM API keys, SaaS platforms, streaming services, cloud resources), deploy a **metered service broker** to manage access, prevent credential leakage, and allocate costs fairly across agents and projects.

**Four-component architecture:**

| Component | Responsibility |
|---|---|
| **Credential Vault** | Encrypts pooled credentials at rest. Checkout/checkin lifecycle prevents concurrent overuse. Supports rotation and disabling. |
| **Session Broker** | Routes requests to available credentials (first-fit). Queues when at capacity (FIFO). Enforces max session duration. |
| **Billing Engine** | Per-second metered billing: `duration_seconds × (monthly_cost_cents / 2,592,000)`. Immutable usage ledger. |
| **Data Store** | Thread-safe storage for services, credentials, sessions, and immutable usage records. |

**Behavioral principles:** No credential leakage (agents never see raw credentials). Concurrency control via per-credential tier limits with queue-based backpressure. Fair-split billing proportional to actual usage. Append-only audit trail. Session states: QUEUED → ACTIVE → ENDED (normal) or EXPIRED (max duration exceeded).

**When to deploy:** Level 3+ fleets sharing pooled API keys or subscription accounts. At Level 2, manual credential management with per-agent API keys is sufficient.

**Integration points:** Billing output feeds per-agent cost attribution (this section). Session telemetry feeds Fleet Observability (Part 9). Credential vault integrates with Configuration Security (Part 3).

-----

## Fleet Health Metrics

> **TL;DR** — Track productivity, quality, and coordination metrics. Interpret them in combination. Every review ends with "no changes needed" or "metric X indicates problem Y — here is the adjustment."

### Productivity Metrics

| Metric | Healthy | Warning |
|---|---|---|
| **Throughput** (chunks/session) | Stable or increasing | Declining or erratic |
| **Budget Adherence** | 80–120% consistently | Consistent overruns or underruns |
| **Idle Time Ratio** | Under 15% | Over 25% — bottleneck |
| **Parallelism Utilization** | Steady increase | Near zero or 100% without contracts |

### Quality Metrics

| Metric | Healthy | Warning |
|---|---|---|
| **First-Pass Quality Rate** | Above 75% | Below 50% — unclear criteria. *Why 75%: below this threshold, rework volume exceeds new work volume, and the fleet is spending more time fixing than building.* |
| **Rework Ratio** | Under 10% | Above 20% — upstream problems |
| **Defect Escape Rate** | Near zero | Any consistent pattern |
| **Self-Heal Rate** | Above 80% | Below 50% — gates misconfigured |

### Coordination Metrics

| Metric | Healthy | Warning |
|---|---|---|
| **Escalation Rate** | Decreasing over time | Increasing — insufficient context or authority |
| **Assumption Accuracy** | Above 85% | Below 70% — Ground Truth stale |
| **Recovery Ladder Usage** | 1–2 per session | 5+ — environmental instability |
| **Handoff Rejection Rate** | Under 5% | Above 15% — contracts underspecified |

### Interpreting in Combination

- **Throughput up, Quality down:** Moving faster, cutting corners. Tighten quality floors.
- **Throughput stable, Escalation up:** More Admiral time needed. Widen Autonomous tier.
- **Idle up, Throughput down:** Bottleneck. Check Propose queue.
- **Recovery up, Accuracy down:** Ground Truth stale. Audit immediately.
- **Self-Heal down, Rework up:** Hooks or quality gates broken. Fix enforcement layer.

> **ANTI-PATTERN: METRIC THEATER** — Metrics collected but no adjustments result. Every review must end with action or explicit confirmation that no action is needed.

### Error Budgets

Complement threshold-based alerts with SRE-style error budgets to manage the velocity-quality trade-off:

**Defining an Error Budget:**
- Choose 2-3 key quality metrics (e.g., rework rate, hallucination rate, scope violations per session).
- Set an acceptable failure rate per metric per evaluation period (e.g., "rework rate below 15% per week").
- Track the budget burn rate: `(actual failures / budget allowance) × 100%`.

**Budget Responses:**
| Burn Rate | Response |
|---|---|
| < 50% | Normal operations. Fleet may experiment with wider Autonomous tiers or faster execution. |
| 50-80% | Caution. No new experiments. Monitor closely. |
| 80-100% | Tighten. Narrow Autonomous tiers, increase verification levels, slow execution pace. |
| > 100% (exhausted) | Pause non-critical work. Root-cause analysis required before resuming normal operations. All new tasks default to Propose tier until budget recovers. |

**Recalibration:** Error budgets should be recalibrated quarterly or after significant fleet changes (new agents, model upgrades, adoption level changes). Initial budgets for new fleets should be generous — tighten as baselines stabilize.

Error budgets formalize what Fleet Health Metrics' metric interpretation already implies: "Throughput up, Quality down" means the fleet is burning its error budget faster than expected.

-----

## Fleet Scaling & Lifecycle

> **TL;DR** — Fleets evolve through five phases: Standup → Acceleration → Steady State → Wind-Down → Dormant. Scale up when generalists produce lower quality in specific domains. Scale down when specialists idle.

### Scaling Signals

**Needs more specialization:** Generalist quality drops in a domain. Orchestrator can't decompose tasks it doesn't understand. Recurring unserved demand.

**Over-specialized:** Specialists idle for extended periods. More time coordinating than working. Interface violations from too many boundaries.

**Should split:** Orchestrator can't hold full roster in context. Subsystems have independent deployment cycles.

### Lifecycle Phases

| Phase | Characteristics | Admiral Focus |
|---|---|---|
| **Standup** | Narrow Autonomous. Frequent escalations. | Define artifacts. Build trust. Accept slower velocity. |
| **Acceleration** | Autonomous widening. Escalations decreasing. | Widen trust. Optimize tiers. Parallelize. |
| **Steady State** | Stable throughput. Rare escalations. | Monitor drift. Maintain Ground Truth. Optimize cost. |
| **Wind-Down** | Volume decreasing. Specialist knowledge less critical. | Consolidate roles. Demote tiers. Reduce fleet. |
| **Dormant** | Maintenance mode. Minimal fleet preserved. | Orchestrator + Implementer + QA on standby. Artifacts preserved. |

> **ANTI-PATTERN: PREMATURE DECOMMISSION** — Project enters maintenance, fleet decommissioned entirely. Six months later, a critical bug. Institutional memory gone. Maintain a dormant fleet.

### Agent Retirement Protocol

When removing an individual agent from a running fleet:

1. **Complete in-flight work.** Allow the agent to finish current tasks or explicitly reassign them via the Orchestrator.
2. **Update routing rules.** Remove the agent from `fleet/routing-rules.md` task mappings. Assign its tasks to the designated fallback agent or a replacement.
3. **Update interface contracts.** Remove or reassign any handoff contracts in `fleet/interface-contracts.md` that reference the retired agent.
4. **Archive Brain entries.** Do not delete the agent's Brain entries — they remain valuable as institutional memory. Tag them with `retired_agent: true` in metadata for filtering.
5. **Reset trust calibration.** If a replacement agent takes over, its trust calibration starts fresh (Novice tier) regardless of the predecessor's earned trust.
6. **Update fleet roster.** Remove from `fleet/README.md` and `fleet/model-tiers.md`.
7. **Notify dependent agents.** Any agent whose "Output Goes To" includes the retired agent must be updated.

**Anti-Pattern: Ghost Agents.** An agent removed from routing but still referenced in interface contracts or other agents' "Output Goes To" fields. The Drift Monitor should flag any references to agents not in the active roster.

-----

## Orchestrator Health Protocol

> **TL;DR** — The Orchestrator is the fleet's single coordination point. If it degrades, everything downstream degrades silently. This section defines how to detect Orchestrator degradation using existing governance agents and what to do when it's detected.

The Orchestrator processes more information than any other agent. It routes every task, validates every handoff, and tracks all parallel work streams. This makes it the most vulnerable to context degradation, and the most dangerous when it fails — because routing errors cascade to every downstream agent.

The Orchestrator cannot QA its own routing decisions (it says so in its own "Does NOT Do"). This section specifies who does.

### Orchestrator-Specific Monitoring

Existing governance agents carry Orchestrator-specific monitoring responsibilities. These are not new agents — they are targeted detection patterns added to the existing governance roster.

| Governance Agent | Orchestrator-Specific Signal | What It Catches |
|---|---|---|
| **Drift Monitor** | Routing decisions that send tasks to agents outside the task's domain (e.g., database work → Frontend Implementer) | Routing drift — the Orchestrator's own scope/role boundaries degrading |
| **Token Budgeter** | Orchestrator overhead exceeding 25% of session token budget | Coordination bloat — the fleet is spending more on routing than on work (Case Study 2 threshold: 60%) |
| **Context Health Monitor** | Orchestrator dropping standing context (Standing Orders, fleet roster, routing rules, interface contracts) as its session lengthens | Context degradation — the Orchestrator losing awareness of its own fleet. Standing Orders loss is the highest-severity signal: if the Orchestrator forgets its non-negotiable rules, all downstream behavior is ungoverned. |
| **Loop Breaker** | Tasks bouncing between Orchestrator and the same specialist without state change (decompose → route → reject → re-decompose → re-route → reject) | Decomposition loops — the Orchestrator unable to produce viable task specs |
| **Hallucination Auditor** | Routing to agents not in the active fleet roster, or referencing interface contracts that don't exist | Orchestrator hallucination — fabricating routing paths |
| **Contradiction Detector** | Orchestrator routing the same type of task to different agents in the same session without rationale | Routing inconsistency — decisions that contradict the Orchestrator's own prior routing |

### Degradation Detection Signals

The following signals indicate the Orchestrator is degrading. Any single signal is a warning. Two or more concurrent signals trigger the Orchestrator Degradation Response.

| Signal | Detection Method | Threshold |
|---|---|---|
| **Routing error rate rising** | Handoff rejection rate (Fleet Health Metrics) increasing within session | >15% rejection rate (healthy baseline: <5%) |
| **Overhead ratio climbing** | Orchestrator token consumption / total fleet token consumption | >25% of session budget on coordination |
| **Decomposition quality dropping** | Specialist agents requesting re-decomposition or reporting unclear acceptance criteria | 3+ re-decomposition requests in a single session |
| **Context amnesia** | Orchestrator re-routing tasks it already routed, losing track of in-flight parallel work, or dropping Standing Orders from standing context | Any duplicate routing within a session, or Standing Orders absent from context check |
| **Fleet roster drift** | Orchestrator referencing agents not in the active roster or missing agents that are active | Any phantom agent reference |

### Orchestrator Degradation Response

When degradation is detected, the response is graduated:

**Level 1 — Session Reset (automatic):**
- Triggered by: 2+ concurrent degradation signals.
- Action: Checkpoint all in-flight work. Reset the Orchestrator session. Reload standing context from ground truth (fleet roster, routing rules, contracts). Resume from checkpoint.
- Who triggers: Context Health Monitor recommends to Admiral; Admiral approves.

**Level 2 — Reduced Scope (Admiral-directed):**
- Triggered by: Level 1 reset fails to resolve signals, or signals recur within 2 sessions.
- Action: Reduce parallel work streams to serial execution. Orchestrator handles one task chain at a time, reducing context pressure. Governance agents continue monitoring.
- Who triggers: Admiral, based on governance agent reports.

**Level 3 — Orchestrator Rotation (Admiral-directed):**
- Triggered by: Persistent degradation across multiple session resets.
- Action: Stand up a fresh Orchestrator instance with clean context. Transfer the checkpoint state and fleet roster. The degraded Orchestrator's decision log is preserved for forensic review. The new instance starts with full standing context and the decision log loaded as reference (not as binding state).
- Who triggers: Admiral.

**No Level 4.** If Orchestrator rotation doesn't resolve the issue, the problem is not the Orchestrator — it's the fleet configuration (too many agents, too much parallel work, unclear routing rules). The Admiral should audit the fleet configuration per Fleet Scaling & Lifecycle (Scaling Signals: "Over-specialized" or "Should split").

### Routing Audit

The Orchestrator's routing decisions are spot-checked, not comprehensively reviewed (comprehensive review would cost more than the routing itself).

**Audit mechanism:** At every chunk boundary, the Drift Monitor samples the most recent 3 routing decisions and checks:
1. Did the task go to an agent whose Scope includes this task type?
2. Did the routing follow the routing rules in `fleet/routing-rules.md`?
3. Was the acceptance criteria in the task spec machine-verifiable?

**Audit failures** are logged and reported to the Admiral. They do not automatically override the routing — they surface the error for correction.

**Routing audit is not a new agent.** It is a periodic responsibility of the Drift Monitor, whose existing scope already includes detecting hierarchical drift and scope violations. Routing errors are scope violations by the Orchestrator.

-----

## Inter-Fleet Governance

> **TL;DR** — Multiple fleets are isolated by default. Sharing happens through Admiral Relay (manual) or A2A (automated). Review across fleets regularly for promotable patterns, systemic failures, and resource imbalances.

### Isolation Protocol

- **Knowledge isolation:** Each fleet receives ONLY project-relevant knowledge.
- **File system isolation:** Each fleet operates within its own directory structure.
- **Context isolation:** No agent has information about other projects.

### Controlled Sharing

**1. Admiral Relay (Manual):** Admiral extracts, validates, delivers knowledge from Fleet A to Fleet B as a Ground Truth update. Agents never communicate across fleet boundaries directly.

**2. Protocol-Based (Automated):** A2A enables structured cross-fleet communication with contracts and authentication. Each fleet publishes Agent Cards for shareable interfaces.

### Cross-Fleet Review

At regular intervals:
- **Promotable patterns:** Solutions from one fleet that should be generalized.
- **Systemic failures:** Repeated failure modes indicating framework gaps.
- **Resource imbalances:** Fleets consistently over or under budget.
- **Trust calibration updates:** Fleets that have earned wider autonomy.

-----

