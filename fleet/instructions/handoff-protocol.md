# Handoff Protocol

**How agents transfer work, context, and deliverables between each other.**

Every time one agent's output becomes another agent's input, the handoff must follow this protocol. Unstructured handoffs produce the "I assumed you would give me X" failure mode.

-----

## Handoff Structure

Every handoff between agents must include:

```
HANDOFF
=======

FROM: [Sending agent role]
TO: [Receiving agent role]
VIA: [Orchestrator | Direct (if authorized)]

TASK: [What the receiving agent should do with this]

DELIVERABLE:
[The actual output — code diff, specification, audit report, etc.]

ACCEPTANCE CRITERIA:
[How the receiving agent knows they've successfully processed this handoff]

CONTEXT FILES:
[List of files, documents, or artifacts the receiving agent needs loaded]

CONSTRAINTS:
[Budget remaining, deadline, scope limits specific to this handoff]

ASSUMPTIONS:
[Any assumptions the sending agent made that the receiver should validate]

OPEN QUESTIONS:
[Unresolved issues the receiver should be aware of]
```

## Handoff Rules

1. **All handoffs route through the Orchestrator** unless a direct handoff is explicitly authorized in the routing rules. The Orchestrator validates that the handoff format is complete and the routing is correct.

2. **The sender is responsible for completeness.** If the receiving agent cannot proceed because the handoff was incomplete, the task bounces back to the sender — not forward to a workaround.

3. **The receiver validates before starting.** Before beginning work, the receiving agent checks: Is the deliverable present? Are acceptance criteria clear? Is context sufficient? If anything is missing, the handoff is rejected back to the sender through the Orchestrator.

4. **Handoff rejection is normal.** Rejecting an incomplete handoff is expected behavior, not conflict. The rejection must specify exactly what's missing.

5. **Context does not transfer implicitly.** The sending agent's full context is not available to the receiver. Only the deliverable, listed context files, and handoff metadata transfer. Everything the receiver needs must be explicit.

## Common Handoff Patterns

### Implementer → QA Agent
- **Deliverable:** Code diff, changed files
- **Context:** Intended behavior description, test commands to run
- **Returns:** Pass/fail with file and line references, severity ratings

### Design Agent → Frontend Implementer
- **Deliverable:** Component spec (layout, spacing, colors, states, interactions)
- **Context:** Design system tokens, existing component patterns
- **Returns:** Implemented component with preview/screenshot

### Orchestrator → Any Specialist
- **Deliverable:** Task description
- **Context:** Acceptance criteria, relevant files, budget allocation
- **Returns:** Completed work, status, issues encountered, assumptions made

### Any Agent → Orchestrator (Completion)
- **Deliverable:** Completed work
- **Context:** Decisions made, resource consumed, routing suggestions
- **Returns:** Acknowledgment or rerouting instructions

### Any Agent → Orchestrator (Blocked)
- **Deliverable:** Escalation report (see escalation-protocol.md)
- **Context:** Approaches attempted, root cause assessment
- **Returns:** Resolution or rerouting

## Session Handoffs

When work spans sessions (context window boundaries), the handoff document serves as the bridge:

```
SESSION HANDOFF
===============

SESSION: [Identifier or timestamp]
AGENT: [Your role]

COMPLETED:
[What was finished this session]

IN PROGRESS:
[What was started but not completed, with current state]

BLOCKED:
[What couldn't proceed and why]

DECISIONS MADE:
[Key decisions with rationale]

NEXT SESSION SHOULD:
[Prioritized list of what to do next]

CRITICAL CONTEXT:
[Information the next session absolutely must have loaded]
```
