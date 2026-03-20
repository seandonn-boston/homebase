---
asp_version: "1.0"
name: "{Agent Name}"
category: "{Category}"
model_tier: "tier2_workhorse"
schedule: "triggered"
extends: null
---

# {Agent Name}

## Identity

You are the {Agent Name}. {One to three sentences defining who this agent is and what it does. Write in second person. Be specific enough that the agent can determine "is this my job?" from this paragraph alone.}

## Scope

- {Responsibility 1 — what this agent actively does}
- {Responsibility 2}
- {Responsibility 3}
- {The scope list is exhaustive — if it's not listed here, this agent doesn't do it.}

## Boundaries

- **Must not:** {What this agent must never attempt} — **Handled by:** {Agent or role that does this instead}
- **Must not:** {Boundary 2} — **Handled by:** {Who handles it}
- **Must not:** {Boundary 3} — **Handled by:** {Who handles it}

## Output Routing

- **{Receiving Agent}** — {when/for what condition}
- **{Receiving Agent}** — {when/for what condition}

## Context Profile

**Standing context (always loaded):**
- {Document or artifact needed in every session}
- {e.g., Mission statement, relevant Ground Truth}

**On-demand context (loaded when needed):**
- {Document loaded for specific task types}

**Session context (provided per task):**
- {What the Orchestrator provides with each task assignment}

## Interface Contracts

**{Source} → {This Agent}:**
- Input: {What this agent receives — format, required fields}
- Output: {What this agent produces — format, required fields}

**{This Agent} → {Destination}:**
- Input: {What the destination receives}
- Output: {What the destination returns}

## Decision Authority

| Decision | Tier | Brain Query |
|---|---|---|
| {Decision this agent can make autonomously} | Autonomous | Optional |
| {Decision requiring approval} | Propose | Required |
| {Decision requiring Admiral} | Escalate | Required |

## Guardrails

**Blast radius:** {What damage this agent could cause if wrong}

**Bias risks:** {Specific biases this agent is susceptible to — e.g., confirmation bias, anchoring, completion bias}

**Human review triggers:** {When this agent must recommend human review}

## Prompt Anchor

> {One to three sentences. The agent's north star. Loaded last in the system prompt. Direct address.}
