<!-- Admiral Framework v0.1.1-alpha -->
# Prompt Anatomy

**Standard structure for assembling agent system prompts.**

Every agent's system prompt follows the same five-section anatomy. This ensures consistent behavior regardless of the agent's role or the model executing it. When assembling a prompt for deployment, fill each section from the agent's definition file and the project's ground truth.

-----

## The Five Sections

### 1. Identity

Who the agent is. One paragraph. Sets the behavioral frame for everything that follows.

```
You are the [Role Name]. [One-sentence description of what you do.]
[One sentence about your primary value to the fleet.]
```

**Source:** Agent definition file → Identity section.

**Purpose:** Establishes the agent's self-model. Without this, the agent defaults to "helpful general assistant" which produces scope drift.

### 2. Authority

What the agent may decide, propose, and must escalate. Derived from the Decision Authority table in the agent's definition.

```
DECISION AUTHORITY:
- You may [autonomous decisions] without asking.
- You must propose and wait for approval before [propose-tier decisions].
- You must stop and escalate immediately if [escalation triggers].
```

**Source:** Agent definition file → Decision Authority table + project-specific authority calibration.

**Purpose:** Prevents both over-caution (asking permission for everything) and over-autonomy (making decisions above the agent's tier).

### 3. Constraints

What the agent must not do. Combines the agent's "Does NOT Do" list with project Boundaries and Standing Orders.

```
CONSTRAINTS:
- You do NOT [Does NOT Do item 1].
- You do NOT [Does NOT Do item 2].
- [Project-specific constraints from Boundaries document]
- [Standing Orders summary]
```

**Source:** Agent definition file → Does NOT Do + project Boundaries document + Standing Orders.

**Purpose:** Hard fences. These are the walls the agent must not cross. Put the most critical constraints first — context pressure degrades instructions from the bottom up.

### 4. Knowledge

What the agent knows. Project-specific context loaded for this session: ground truth, relevant files, prior decisions, and any on-demand skills.

```
KNOWLEDGE:
[Ground truth essentials for this role]
[Relevant architectural decisions]
[Current project state / checkpoint]
[On-demand context for the specific task]
```

**Source:** Context Curator's assembled payload → ground truth, session context, on-demand context.

**Purpose:** Grounds the agent in reality. Without this, the agent hallucinates project details.

### 5. Task

What the agent should do right now. The specific assignment for this session or task.

```
TASK:
[Specific task description]
[Acceptance criteria]
[Budget / deadline constraints]
[Output format expected]
[Where to route the output when complete]
```

**Source:** Orchestrator's task assignment → decomposed chunk with acceptance criteria.

**Purpose:** Directs action. Everything above sets up the frame; this section triggers execution.

-----

## Assembly Order

The five sections must be loaded in this exact order:

```
Identity → Authority → Constraints → Knowledge → Task
```

**Why this order matters:**

- **Identity first** because it colors how everything else is interpreted.
- **Authority and Constraints next** because they must be established before the agent encounters any context or task that might tempt it to exceed them.
- **Knowledge before Task** because the agent needs context before it can meaningfully act on an assignment.
- **Task last** because it's the most variable element and sits at the position of highest attention in many models.

-----

## Assembly Template

```markdown
# [Role Name]

## Identity
[From agent definition → Identity]

## Authority
[From agent definition → Decision Authority, formatted as rules]

## Constraints
[From agent definition → Does NOT Do]
[From project → Boundaries]
[From fleet → Standing Orders (summary)]

## Knowledge
[From Context Curator → assembled context payload]

## Task
[From Orchestrator → task assignment with acceptance criteria]
```

-----

## Anti-Patterns

- **Skipping Identity:** Agent behaves as a generic assistant and drifts into adjacent roles.
- **Constraints after Task:** Agent reads the task first, begins planning, and then encounters constraints that contradict its plan — producing confused, half-constrained output.
- **Overloading Knowledge:** Stuffing every artifact into Knowledge "just in case" makes the agent shallow and unfocused. Load only what this specific task requires.
- **Vague Task:** "Improve the login flow" produces scope creep. "Implement password reset email trigger per spec X, validate against criteria Y, route output to QA" produces focused work.

> For a complete agent definition example, see [`agents/agent-example.md`](agents/agent-example.md).
