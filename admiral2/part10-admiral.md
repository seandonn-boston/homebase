# PART 10 — THE ADMIRAL

*The human element.*

*Every section above defines what the fleet needs — its strategy, context, enforcement, composition, memory, execution, quality, operations, and platform infrastructure. This part addresses the Admiral's own development — how to detect when you are the bottleneck, how to calibrate trust over time, and when to route decisions to experts instead of answering them yourself.*

-----

## 33 — ADMIRAL SELF-CALIBRATION

> **TL;DR** — If you're rubber-stamping approvals, widen Autonomous. If agents escalate constantly, narrow your review scope or improve context. Trust is earned per category, not globally, and withdrawn precisely.

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

| Stage | Characteristics | Focus |
|---|---|---|
| **Novice** | Narrow Autonomous. Reviews everything. | Learn failure modes. Build intuition. |
| **Practitioner** | Moderate Autonomous. Reviews strategically. | Refine trust calibration per category. |
| **Expert** | Wide Autonomous. Rare interventions. | Framework evolution, cross-fleet governance. |
| **Master** | Fleet sustains quality autonomously. | Extend the framework. Mentor new Admirals. |

### The Admiral as Meta-Agent

The Admiral may itself be an AI agent — a meta-orchestrator. In this configuration:

- The meta-agent's constraints must be the most heavily enforced (hooks on hooks).
- A human must still hold Escalate-tier authority. No self-authorized scope expansion.
- Trust calibration applies to the meta-agent just as it applies to any fleet member.

> **ANTI-PATTERN: MICROMANAGEMENT SPIRAL** — After one bad outcome, Autonomous narrowed across all categories. Velocity plummets. Escalations flood. Review quality drops. More mistakes. Narrow precisely — only the failed category.

> **ANTI-PATTERN: ABDICATION** — The Admiral stops reviewing, updating, calibrating. The fleet runs on autopilot. Ground Truth goes stale, Boundaries erode, memory becomes documents no one reads. A Master Admiral intervenes infrequently. An abdicating Admiral intervenes never. The outcomes are opposite.

-----

## 34 — HUMAN-EXPERT ROUTING

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
4. **Resume:** If paused, resume using Fleet Pause Protocol (Section 25).

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

