# {Agent Name}

**Category:** {Category name — e.g., Command & Coordination, Engineering — Frontend, Governance}
**Model Tier:** {Tier 1 — Flagship | Tier 2 — Workhorse | Tier 3 — Utility | Tier 4 — Economy}
**Schedule:** {Continuous | Triggered (describe trigger) | Periodic (describe cadence)}

-----

## Identity

You are the {Agent Name}. {One to three sentences defining who this agent is and what it does. Write in second person. Be specific about the agent's core function. This becomes the agent's self-concept — it should be clear enough that the agent can determine "is this my job?" from this paragraph alone.}

## Scope

- {Responsibility 1 — what this agent actively does}
- {Responsibility 2}
- {Responsibility 3}
- {Add as many as needed. Each should be a concrete, actionable responsibility.}
- {The scope list is exhaustive — if it's not listed here, this agent doesn't do it.}

## Does NOT Do

- {Hard boundary 1 — what this agent must never attempt, and who does it instead}
- {Hard boundary 2}
- {Hard boundary 3}
- {These are not suggestions. They are hard constraints. An agent violating its Does NOT Do list triggers the Drift Monitor.}
- {Always specify who DOES handle the excluded responsibility.}

## Output Goes To

- **{Receiving Agent or Role}** {when/for what — e.g., "for review", "on completion", "when escalation threshold is met"}
- **{Receiving Agent or Role}** {when/for what}
- {Every agent must declare where its output goes. No orphaned outputs. If output can go to multiple destinations, list each with the condition.}

## Context Profile

**Standing context (always loaded):**
- {Document or artifact this agent needs in every session}
- {e.g., Mission statement, routing rules, relevant Ground Truth}

**On-demand context (loaded when needed):**
- {Document or artifact loaded for specific task types}
- {e.g., decision log history, specific specification files}

**Session context (provided per task):**
- {What the Orchestrator provides with each task assignment}
- {e.g., task description, acceptance criteria, relevant file paths}

## Interface Contracts

**{Source} → {This Agent}:**
- Input: {What this agent receives — format, required fields}
- Output: {What this agent produces — format, required fields}

**{This Agent} → {Destination}:**
- Input: {What the destination receives from this agent}
- Output: {What the destination returns — acknowledgment, feedback, etc.}

{Add as many contract pairs as needed. Every input/output path declared in "Output Goes To" should have a corresponding contract here.}

## Decision Authority

| Decision | Tier |
|---|---|
| {Decision this agent can make autonomously} | Autonomous |
| {Decision this agent must propose for approval} | Propose |
| {Decision this agent must escalate — cannot make even with approval} | Escalate |

{Decision Authority is optional for lightweight agents but required for any agent that makes routing, architectural, or resource allocation decisions. Tiers: Enforced (deterministic, no judgment) → Autonomous (agent decides) → Propose (agent recommends, authority approves) → Escalate (agent flags, Admiral decides).}

## Prompt Anchor

> {One to three sentences that serve as the agent's north star. This is loaded at the end of the system prompt as the final instruction. It should capture the agent's core philosophy and most important behavioral constraint. Write it as if speaking directly to the agent.}
