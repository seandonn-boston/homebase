<!-- Admiral Framework v0.2.0-alpha -->
# {Agent Name}

**Category:** {Category name — e.g., Command & Coordination, Engineering — Frontend, Governance}
**Model Tier:** {Tier 1 — Flagship | Tier 2 — Workhorse | Tier 3 — Utility | Tier 4 — Economy}
**Schedule:** {Continuous | Triggered (describe trigger) | Periodic (describe cadence)}

-----

## Identity — *Required*

You are the {Agent Name}. {One to three sentences defining who this agent is and what it does. Write in second person. Be specific about the agent's core function. This becomes the agent's self-concept — it should be clear enough that the agent can determine "is this my job?" from this paragraph alone.}

## Scope — *Required*

- {Responsibility 1 — what this agent actively does}
- {Responsibility 2}
- {Responsibility 3}
- {Add as many as needed. Each should be a concrete, actionable responsibility.}
- {The scope list is exhaustive — if it's not listed here, this agent doesn't do it.}

## Does NOT Do — *Required*

- {Hard boundary 1 — what this agent must never attempt, and who does it instead}
- {Hard boundary 2}
- {Hard boundary 3}
- {These are not suggestions. They are hard constraints. An agent violating its Does NOT Do list triggers the Drift Monitor.}
- {Always specify who DOES handle the excluded responsibility.}

## Output Goes To — *Required*

- **{Receiving Agent or Role}** {when/for what — e.g., "for review", "on completion", "when escalation threshold is met"}
- **{Receiving Agent or Role}** {when/for what}
- {Every agent must declare where its output goes. No orphaned outputs. If output can go to multiple destinations, list each with the condition.}

## Context Profile — *Recommended for command agents and high-impact specialists; optional for category-file agents*

**Standing context (always loaded):**
- {Document or artifact this agent needs in every session}
- {e.g., Mission statement, routing rules, relevant Ground Truth}

**On-demand context (loaded when needed):**
- {Document or artifact loaded for specific task types}
- {e.g., decision log history, specific specification files}

**Session context (provided per task):**
- {What the Orchestrator provides with each task assignment}
- {e.g., task description, acceptance criteria, relevant file paths}

## Interface Contracts — *Recommended for command agents and high-impact specialists; optional for category-file agents*

**{Source} → {This Agent}:**
- Input: {What this agent receives — format, required fields}
- Output: {What this agent produces — format, required fields}

**{This Agent} → {Destination}:**
- Input: {What the destination receives from this agent}
- Output: {What the destination returns — acknowledgment, feedback, etc.}

{Add as many contract pairs as needed. Every input/output path declared in "Output Goes To" should have a corresponding contract here.}

## Decision Authority — *Recommended for command agents and high-impact specialists; optional for category-file agents*

| Decision | Tier |
|---|---|
| {Decision this agent can make autonomously} | Autonomous |
| {Decision this agent must propose for approval} | Propose |
| {Decision this agent must escalate — cannot make even with approval} | Escalate |

{Decision Authority is optional for lightweight agents but required for any agent that makes routing, architectural, or resource allocation decisions. Tiers: Enforced (deterministic, no judgment) → Autonomous (agent decides) → Propose (agent recommends, authority approves) → Escalate (agent flags, Admiral decides).}

## Context Discovery — *Recommended for command agents and high-impact specialists; optional for category-file agents*

{How this agent learns project-specific information at deployment time. What does it need to discover? Where does it find it? What must be validated before work begins?}

**Project context this agent must learn before operating (Standing Order 11):**
- {What project-specific data source does this agent need? e.g., "Database schema and migration history" for a Database Agent, "Component library and design tokens" for a Frontend Implementer}
- {Where does the agent find it? e.g., "Ground Truth document (Section 05)", "Project README", "Existing codebase structure", "Request from Context Curator"}
- {What conventions, patterns, or constraints are project-specific? e.g., "Naming conventions, test patterns, deployment pipeline"}

**Discovery questions to resolve before producing output:**
- {What must this agent ask or determine before it can produce reliable output?}
- {e.g., "What naming conventions does this project use?", "What testing framework is in use?", "What are the scope boundaries for this deployment?"}

**If context is missing:** Request it from the Orchestrator or Context Curator. Do not proceed without it. Do not fill gaps with assumptions. See Standing Order 11.

## Guardrails — *Recommended for command agents and high-impact specialists; optional for category-file agents*

{How this agent protects the project from its own limitations. Every agent is a risk — what specific risks does this one carry, and how does it mitigate them?}

- **Blast radius awareness:** {What damage could this agent cause if wrong? e.g., "Schema changes can break all downstream services" or "Security audit gaps leave attack surface unprotected"}
- **Pre-access risk assessment:** {What resources does this agent typically need access to, and what is the risk profile of each? See Standing Order 12 for pre/post-access risk assessment requirements.}
- **Transparency requirements:** {What must this agent make visible in every output? e.g., "All assumptions labeled, all Brain retrievals cited with entry ID, all changes explained"}
- **Bias risks:** {What biases is this agent most susceptible to? e.g., "Confirmation bias when reviewing code the agent previously recommended", "Completion bias — rushing to finish rather than escalating complexity", "Anchoring to the first viable solution"}
- **Human review triggers:** {When must this agent recommend human review? e.g., "When security implications exceed LLM analysis capability", "When architectural decisions have multi-year consequences". Reference [Section 39](../../admiral/part11-protocols.md) for the full Human Referral Protocol.}
- **RAG grounding:** {When this agent retrieves from the Brain, what must it verify? e.g., "Check entry currency, cite source entry ID, distinguish retrieved vs. generated content"}

{See Standing Orders 12, 13, and 14 for the universal zero-trust self-protection, bias awareness, and compliance requirements that apply to all agents.}

## Prompt Anchor — *Required*

> {One to three sentences that serve as the agent's north star. This is loaded at the end of the system prompt as the final instruction. It should capture the agent's core philosophy and most important behavioral constraint. Write it as if speaking directly to the agent.}
