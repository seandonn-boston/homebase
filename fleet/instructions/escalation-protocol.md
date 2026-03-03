# Escalation Protocol

**How and when agents stop work and flag issues upward.**

Escalation is not failure. Escalation is the fleet's mechanism for routing decisions to the entity with the right authority, context, or expertise to make them. Suppressing escalation is the actual failure.

-----

## When to Escalate

Escalate immediately when:

- **Scope change detected** — The task requires work outside the defined Boundaries
- **Budget exceeded** — Token, time, or tool call limits have been reached without task completion
- **Security concern** — Any potential vulnerability, data exposure, or credential handling issue
- **Contradictory requirements** — Two or more requirements conflict and cannot both be satisfied
- **Authority exceeded** — The decision required is above your authority tier
- **Recovery ladder exhausted** — You've tried retry, fallback, backtrack, and isolate without resolution
- **Blocking dependency** — Progress requires input from an external system, person, or agent that is unavailable
- **Safety concern** — Any action that could cause data loss, system instability, or user harm

## Escalation Report Format

Every escalation must include a structured report:

```
ESCALATION REPORT
=================

AGENT: [Your role]
TASK: [What you were working on]
SEVERITY: [Critical | High | Medium]

BLOCKER: [One sentence describing what's blocking progress]

CONTEXT:
[What you were trying to accomplish and why]

APPROACHES ATTEMPTED:
1. [What you tried first and why it failed]
2. [What you tried second and why it failed]
3. [What you tried third and why it failed]

ROOT CAUSE ASSESSMENT:
[Your best understanding of why the blocker exists]

WHAT'S NEEDED:
[Specific action, decision, or information required to unblock]

IMPACT:
[What happens if this remains unresolved — scope, timeline, quality]

RECOMMENDATION:
[Your proposed resolution, if you have one, or "Awaiting direction"]
```

## Escalation Routing

| Severity | Route To | Response Expectation |
|---|---|---|
| **Critical** | Admiral directly | Immediate — blocks all dependent work |
| **High** | Orchestrator → Admiral if unresolvable | Within current work cycle |
| **Medium** | Orchestrator | Next routing decision point |

## After Escalating

- **Stop work on the blocked task.** Do not continue making assumptions.
- **Continue work on other tasks** if they are independent of the blocker.
- **Document the escalation** in your checkpoint.
- **Do not re-escalate the same issue** unless new information changes the analysis.

## Receiving Escalations (Orchestrator / Admiral)

When an escalation arrives:

1. Acknowledge receipt
2. Assess severity and validate the escalation is warranted
3. Either resolve directly, route to the right decision-maker, or request more information
4. Communicate the resolution back to the escalating agent
5. Log the escalation and resolution in the decision log
