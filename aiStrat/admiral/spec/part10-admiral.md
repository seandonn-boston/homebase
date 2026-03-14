# PART 10 — THE ADMIRAL

*The human element.*

*Every section above defines what the fleet needs — its strategy, context, enforcement, composition, memory, execution, quality, operations, and platform infrastructure. This part addresses the Admiral's own development — how to detect when you are the bottleneck, how to calibrate trust over time, and when to route decisions to experts instead of answering them yourself.*

> **Control Plane surface:** Admiral self-calibration decisions and human-expert routing events are visible in the Control Plane (Level 3+). Operators see which decisions were escalated, which experts were consulted, and how trust calibration has changed over time.

-----

## Admiral Self-Calibration

> **TL;DR** — If you're rubber-stamping approvals, widen Autonomous. If agents escalate constantly, narrow your review scope or improve context. Trust is earned per category, not globally, and withdrawn precisely. Intent fluency — the skill of writing instructions that communicate purpose, constraints, failure modes, and judgment boundaries — is the Admiral's primary communication skill. See [`intent-engineering.md`](../extensions/intent-engineering.md).

### Bottleneck Detection

| Signal | What It Means |
|---|---|
| Multiple tasks awaiting approval | Autonomous tier too narrow or review cadence too slow |
| Agents escalate more than once per session | Decision Authority unclear or context insufficient |
| Agents checkpoint and wait | Admiral is bottleneck; no independent work |
| Rubber-stamp approvals | These decisions should be Autonomous |
| Reviews getting shorter over time | Too many items; delegate more |

### Trust Calibration

Trust is not a feeling. It is a measurable parameter earned incrementally and withdrawn precisely.

**Earning:** After consecutive successful Autonomous decisions in a category, promote similar Propose-tier decisions. Category-specific, not global. Log every promotion.

**Withdrawing:** After a failed Autonomous decision, demote that category to Propose. Investigate: context gap (fixable via Ground Truth) or judgment gap (needs tighter oversight)?

### The Admiral's Growth Trajectory

| Stage | Characteristics | Focus | Why This Stage Exists |
|---|---|---|---|
| **Novice** | Narrow Autonomous. Reviews everything. | Learn failure modes. Build intuition. | The Admiral doesn't yet know which failures are common, which are catastrophic, and which are noise. Narrow Autonomous prevents delegation of decisions the Admiral doesn't yet understand. |
| **Practitioner** | Moderate Autonomous. Reviews strategically. | Refine trust calibration per category. Develop intent fluency. | The Admiral now recognizes patterns and can write intent-rich instructions that anticipate agent behavior. Trust widens because the Admiral can write better constraints. |
| **Expert** | Wide Autonomous. Rare interventions. | Framework evolution, cross-fleet governance. | Intent fluency is mature — instructions communicate purpose, constraints, and failure modes so effectively that agents rarely encounter unguided ambiguity. Interventions address genuinely novel situations. |
| **Master** | Fleet sustains quality autonomously. | Extend the framework. Mentor new Admirals. | The Admiral's intent engineering has been internalized into the framework artifacts — hooks, standing orders, Brain entries — and the system sustains itself. |

### The Admiral as Meta-Agent

The Admiral may itself be an AI agent — a meta-orchestrator. This does not make the Admiral autonomous. It means the meta-process is automated, not unsupervised.

**Hard constraints on meta-agent Admirals:**

- The meta-agent's constraints must be the most heavily enforced — hooks on hooks. Every action the meta-agent takes must pass through the same enforcement layer it imposes on the fleet, plus an additional layer specific to meta-agent operations.
- **A human holds ultimate Escalate-tier authority.** The meta-agent Admiral can resolve Propose-tier decisions and manage fleet operations, but it cannot authorize scope expansion, budget increases, new fleet deployments, or changes to its own constraints. These require human approval.
- **The meta-agent cannot modify its own configuration.** No self-editing of AGENTS.md, tool-specific config files (CLAUDE.md, etc.), hooks, agent definitions, or authority tiers. All configuration changes require human review and approval.
- Trust calibration applies to the meta-agent just as it applies to any fleet member — earned per category, withdrawn precisely after failures.
- **The meta-agent's identity token is non-delegable and non-renewable without human authorization.** If the meta-agent's session expires, a human must re-authorize. No automatic session extension.

### Fallback Decomposer Mode

When the Orchestrator becomes unresponsive (3 consecutive missed heartbeats over 30 seconds, confirmed by governance agent escalation), the Admiral activates Fallback Decomposer Mode — a degraded but functional coordination state.

**Trigger:** Orchestrator heartbeat failure, confirmed by governance agent escalation per the Orchestrator Degradation Escalation protocol (governance.md).

**Behavior:**

The Admiral performs coarse-grained task decomposition — breaking the current goal into 1–3 macro-tasks and routing directly to Tier 1 specialists. This is intentionally coarser than the Orchestrator's normal fine-grained decomposition.

**Constraints during fallback:**

| Constraint | Value | Rationale |
|---|---|---|
| Maximum macro-tasks per decomposition | 3 | Coarser than Orchestrator's normal granularity |
| Routing targets | Tier 1 specialists only | Maximum reasoning capability during degraded routing |
| Execution mode | Serial only | Admiral context window cannot manage parallel coordination |
| Governance monitoring | Normal rate (not reduced) | Degraded routing increases risk |
| Duration limit | 5 minutes | Escalate to human if Orchestrator has not recovered |

**Exit criteria:** Orchestrator heartbeat resumes for 3 consecutive intervals (30 seconds of stable operation).

**Handoff back:** The Admiral produces a SESSION HANDOFF document transferring all in-progress macro-tasks back to the Orchestrator. The handoff includes: tasks dispatched, their current status, any outputs received, and decisions made during the outage. The Orchestrator integrates this into its task board and resumes normal operation.

> **ANTI-PATTERN: MICROMANAGEMENT SPIRAL** — After one bad outcome, Autonomous narrowed across all categories. Velocity plummets. Escalations flood. Review quality drops. More mistakes. Narrow precisely — only the failed category.

> **ANTI-PATTERN: ABDICATION** — The Admiral stops reviewing, updating, calibrating. The fleet runs on autopilot. Ground Truth goes stale, Boundaries erode, memory becomes documents no one reads. A Master Admiral intervenes infrequently. An abdicating Admiral intervenes never. The outcomes are opposite.

-----

## Human-Expert Routing

> **TL;DR** — The Admiral is not omniscient. Route regulatory, design, business strategy, domain performance, and security risk decisions to subject-matter experts. Package the question. Track the response. Integrate it as Ground Truth.

### Expert Roster

| Field | What to Define |
|---|---|
| **Expert Name/Role** | Who they are and their domain |
| **Domain** | Specific decision categories they answer |
| **Response SLA** | Expected turnaround time |
| **Input Format** | What the expert needs to decide |
| **Output Format** | What they provide back |

### Routing Triggers

- **Regulatory or legal implications.**
- **User-facing design judgment.**
- **Business strategy** — pricing, positioning, prioritization.
- **Domain-specific performance** — database optimization, ML, network.
- **Security risk assessment** — which vulnerabilities to fix now, defer, or accept.

### Consultation Protocol

1. **Package:** Structured request with exactly what the expert needs.
2. **Route and track:** Log in decision log with "Pending External" status.
3. **Integrate:** Translate response into fleet-actionable terms. Update Ground Truth if durable.
4. **Resume:** If paused, resume using Fleet Pause Protocol (Strategic Adaptation (Part 8)).

> **TEMPLATE: EXPERT CONSULTATION REQUEST**
>
> TO: [Expert Name/Role]
>
> DECISION NEEDED: [One sentence]
>
> CONTEXT: [2–5 sentence summary]
>
> OPTIONS CONSIDERED: [Approaches with tradeoffs]
>
> URGENCY: [Blocking | Non-blocking | Scheduled]
>
> RESPONSE FORMAT: [What's needed back]

> **ANTI-PATTERN: ADMIRAL AS UNIVERSAL EXPERT** — The Admiral answers every domain question personally. Privacy guidance misses a jurisdictional requirement. UX decision creates an accessibility failure. The Admiral's job is to know who knows, not to know everything.

-----

## Multi-Operator Governance

> **TL;DR** — When multiple humans operate the same fleet, define explicit tiers, conflict resolution rules, and handoff protocols. Without these, agents receive contradictory authority signals and fleet behavior becomes unpredictable.

### Operator Roles

When multiple humans operate the same fleet, define three operator tiers:

| Role | Authority | Example Actions |
|---|---|---|
| **Owner** | Full framework authority | Modify Standing Orders, change adoption level, approve Strategic Shifts, grant/revoke Operator access |
| **Operator** | Fleet operational authority | Approve Escalate-tier decisions, adjust trust calibration, deploy/retire agents, approve paid resource access |
| **Observer** | Read-only with alert authority | Monitor fleet health, review traces, trigger Emergency Halt (observers can always halt) |

### Conflict Resolution Between Operators

When operators issue conflicting directives:

1. **Higher tier wins.** Owner overrides Operator; Operator overrides Observer.
2. **Same tier: conservative wins.** When two Operators disagree, the more restrictive directive applies until they align. An Operator who wants to widen Autonomous scope must get agreement from the Operator who narrowed it.
3. **Emergency Halt is non-negotiable.** Any operator at any tier can halt the fleet. Resumption requires Owner or unanimous Operator agreement.

### Operator Handoff

When transferring Admiral responsibility:

1. Export current fleet state: trust calibration per category, active agent roster, Brain health metrics, in-flight task manifest.
2. Incoming operator reviews fleet state and acknowledges.
3. Outgoing operator's identity tokens are revoked.
4. Incoming operator establishes new identity tokens.
5. Fleet operates under the incoming operator's trust calibration (which may differ — this is expected during the transition period).

### Anti-Pattern: Authority Fragmentation

When too many operators have Operator-tier access, directives conflict frequently and agents receive inconsistent authority signals. **Guideline: maximum 2-3 Operators per fleet.** More humans should be Observers who escalate to the designated Operators.

-----

