# PART 8 — OPERATIONS

*How work persists, adapts, and scales over time.*

*Parts 1–7 cover a single fleet executing a single phase of work. Part 8 addresses the ongoing reality: sessions end, requirements change, budgets matter, fleets grow and shrink, and multiple projects run simultaneously. These six sections keep the enterprise healthy over time.*

-----

## 24 — INSTITUTIONAL MEMORY

> **TL;DR** — Agents lose context between sessions. Use checkpoint files, ledger files, handoff documents, or git-based state to persist across context window boundaries. Session persistence is the single biggest UX pain point in agentic coding.

### Session Persistence Patterns

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

> **ANTI-PATTERN: FALSE CHECKPOINTING** — Summaries that sound comprehensive but omit what was NOT done, what assumptions were made, what shortcuts were taken. Checkpoint reads "everything on track" when three things are subtly broken. Require explicit "Assumptions" and "Recovery Actions" fields. If both are empty, be suspicious.

-----

## 25 — ADAPTATION PROTOCOL

> **TL;DR** — Three tiers of change: Tactical (update tasks, no pause), Strategic (pause, cascade through artifacts, resume), Full Pivot (halt, restart from scratch). Every artifact update must cascade through its downstream dependencies.

### Change Classification

| Classification | What Changed | Response |
|---|---|---|
| **Tactical Adjustment** | Task parameters, minor deadline shifts, requirement clarifications | Update affected tasks. No pause. Log. |
| **Strategic Shift** | Mission evolution, Boundary changes, Ground Truth updates, significant scope change | Pause at chunk boundary. Cascade through artifacts. Re-validate. Resume. |
| **Full Pivot** | Fundamental direction change, complete tech change, total scope replacement | Halt fleet. Treat as new deployment. Full Quick-Start. |

### External Intelligence as Adaptation Trigger

The Continuous AI Landscape Monitor (`monitor/`) surfaces ecosystem changes that may trigger adaptation. When the Admiral reviews monitor digests and approves seed candidates into the Brain, assess each finding against the change classification:

| Monitor Finding | Likely Classification | Cascade Target |
|---|---|---|
| New flagship model release (e.g., Opus 5) | Strategic Shift | Model Selection (13) → Cost Management (26) → Fleet Composition (11) |
| New economy-tier model matching workhorse quality | Strategic Shift | Model Selection (13) → Cost Management (26) |
| Exemplar tool redesigns agent patterns | Tactical Adjustment | Agent definitions, prompt anatomy, context profiles |
| New MCP server ecosystem emerges | Tactical or Strategic | Tool Registry (12) → Protocol Integration (14) |
| Security vulnerability in tracked dependency | Strategic Shift | Configuration Security (10) → Tool Registry (12) |

The monitor runs daily. The Admiral should review digests at matching cadence and classify findings before they accumulate into stale intelligence.

### The Cascade Map

Framework artifacts form a dependency graph. When one changes, downstream artifacts may become stale.

```
Mission (01) ──→ Boundaries (02) ──→ Success Criteria (03)
     │                │                       │
     │                ▼                       ▼
     │         Work Decomposition (18) ──→ Parallel Execution (19)
     │                                        │
     │                                        ▼
     │         Quality Assurance (21) ──→ Fleet Health Metrics (27) ──→ Cost Management (26)
     │                                        │
     │                                        └──→ Fleet Observability (30) ──→ Fleet Evaluation (32)
     │
     ▼
Ground Truth (05) ──→ Fleet Composition (11) ──→ Decision Authority (09) ──→ Admiral Self-Calibration (33)
                              │
                              ├──→ Context Profiles (06)
                              ├──→ Context Engineering (04)
                              ├──→ Tool Registry (12) ──→ Protocol Integration (14)
                              │                                 │
                              │                                 └──→ Brain Architecture (15) ──→ Knowledge Protocol (16)
                              │                                              │
                              │                                              └──→ Institutional Memory (24)
                              ├──→ Model Selection (13) ──→ Cost Management (26)
                              └──→ Fleet Scaling (28) ──→ CI/CD Operations (31)

Enforcement (08) ──→ Config Strategy (07) ──→ Config Security (10)
```

**The cascade rule:** Update an artifact, then review every downstream artifact. Revise any that are inconsistent.

**The order rule:** Always cascade top-down. Never update downstream before upstream is finalized.

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

## 26 — COST MANAGEMENT

> **TL;DR** — The biggest cost lever is LLM-Last design (Section 02): eliminating 30-60% of LLM calls by routing to deterministic tools. Second: model tier assignment. Third: context size via progressive disclosure. Track spend in dollars, not just tokens.

### Cost Drivers and Levers

| Cost Driver | Lever | Impact |
|---|---|---|
| **LLM for deterministic tasks** | LLM-Last design (Section 02) | **Highest.** Eliminates 30-60% of LLM calls. |
| **Model tier** | Demote where quality is indistinguishable at lower tier (Section 13) | High. Economy-tier at 1/30th cost. |
| **Context size** | Progressive disclosure, <150 line rule (Section 07) | High. Every loaded token is billed. |
| **Retry and rework** | Sharper criteria and self-healing hooks | Medium. Each retry doubles chunk cost. |
| **Over-decomposition** | Consolidate small chunks | Medium. Each chunk pays context tax. |
| **Tool call volume** | Cap calls per task | Lower but compounds at scale. |

### Cost Budgets

- **Per-session:** Maximum spend before pausing for review. Circuit breaker.
- **Per-phase:** Total allocation for a project phase. Exceeding triggers Strategic Shift.
- **Cost-per-chunk target:** Expected cost at each tier. Chunks exceeding 2x target warrant investigation.

### Economy-Tier Strategy

Models like DeepSeek V3.2 at ~1/30th flagship cost change fleet economics:

- **Tier 4 for first drafts.** Economy draft, higher-tier review.
- **Bulk processing.** Migrations, formatting, boilerplate at economy rates.
- **Adversarial review at low cost.** Second model pass without doubling cost.

> **ANTI-PATTERN: COST BLINDNESS** — Token budgets tracked but never translated to dollars. The fleet runs three weeks before anyone checks the invoice.

-----

## 27 — FLEET HEALTH METRICS

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
| **First-Pass Quality Rate** | Above 75% | Below 50% — unclear criteria |
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

-----

## 28 — FLEET SCALING & LIFECYCLE

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

-----

## 29 — INTER-FLEET GOVERNANCE

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

