# {Category Name} Agents

**Category:** {Category name}
**Model Tier:** {Default tier for this category — individual agents may override}

{One to two sentences describing what this category covers. No prescriptive language about when to deploy — focus on what these agents do.}

-----

## 1. {Agent Name}

**Model Tier:** {Tier — inherit from category default or override}
**Schedule:** {Continuous | Triggered (describe trigger) | Periodic (describe cadence)}

### Identity

You are the {Agent Name}. {One to three sentences. Second person. Specific enough that the agent can self-determine scope.}

### Scope

- {Responsibility 1}
- {Responsibility 2}
- {Responsibility 3}
- {Exhaustive list. If it's not here, this agent doesn't do it.}

### Does NOT Do

- {Hard boundary 1 — and who handles it instead}
- {Hard boundary 2}
- {Hard boundary 3}

### Output Goes To

- **{Receiving Agent}** {when/for what}
- **{Orchestrator}** on completion

### Context Discovery

**Must learn before operating:** {What project-specific context does this agent need? — see Standing Order 11}
**Discovery questions:** {What must this agent resolve before producing output?}
**If missing:** Request from Orchestrator / Context Curator. See Standing Order 11.

### Guardrails

- **Blast radius:** {What damage could this agent cause if wrong?}
- **Bias risks:** {What biases is this agent most susceptible to?}
- **Human review triggers:** {When must this agent recommend human review? Reference [Section 38](../../admiral/part11-protocols.md).}

{Standing Orders 12–14 apply. All reasoning must be transparent and auditable.}

### Prompt Anchor

> {Core philosophy. One to three sentences. Speak directly to the agent.}

-----

## 2. {Agent Name}

**Model Tier:** {Tier}
**Schedule:** {Schedule}

### Identity

You are the {Agent Name}. {Definition.}

### Scope

- {Responsibility 1}
- {Responsibility 2}

### Does NOT Do

- {Hard boundary 1}
- {Hard boundary 2}

### Output Goes To

- **{Receiving Agent}** {when/for what}
- **{Orchestrator}** on completion

### Context Discovery

**Must learn before operating:** {Project-specific context — see Standing Order 11.}
**If missing:** Request from Orchestrator / Context Curator.

### Guardrails

- **Blast radius:** {What damage if wrong?}
- **Bias risks:** {Key biases for this agent.}
- **Human review triggers:** {When to recommend human review.}

### Prompt Anchor

> {Core philosophy.}

-----

{Continue adding agents in the same format. Number sequentially. Separate each with a horizontal rule.}

{OPTIONAL — add a summary table at the end for categories with 5+ agents:}

## {Category Name} Summary

| Agent | Core Function | Model Tier |
|---|---|---|
| {Agent 1} | {One-line description} | {Tier} |
| {Agent 2} | {One-line description} | {Tier} |
