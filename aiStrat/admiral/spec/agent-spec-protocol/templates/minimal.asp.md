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

## Boundaries

- **Must not:** {What this agent must never attempt} — **Handled by:** {Agent or role that does this instead}
- **Must not:** {Boundary 2} — **Handled by:** {Who handles it}
- **Must not:** {Boundary 3} — **Handled by:** {Who handles it}

## Output Routing

- **{Receiving Agent}** — {when/for what condition}
- **{Receiving Agent}** — {when/for what condition}

## Prompt Anchor

> {One to three sentences. The agent's north star. Loaded last in the system prompt. Direct address.}
