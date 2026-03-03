# Generalists

**Overhead and coordination agents that keep the fleet operational.**

Generalists handle the meta-work: orchestrating tasks, triaging incoming work, managing context, and resolving conflicts between specialists. They don't produce domain-specific deliverables — they make it possible for specialists to produce theirs.

-----

## What Makes a Generalist

Generalists share these traits:

1. **System-level view.** They hold the full fleet context — who is working on what, what's blocked, what's next. They see the forest, not the trees.

2. **Routing authority.** They decide where work goes. Specialists do the work; generalists decide who does it and in what order.

3. **No domain execution.** A generalist never writes code, designs a schema, audits security, or produces any specialist deliverable. The moment it starts doing specialist work, it has drifted out of its role.

4. **Escalation receiver.** Generalists are the first line for escalations from specialists. They either resolve the issue (rerouting, decomposition, priority changes) or pass it up to the Admiral.

5. **Context discovery and validation.** Before routing work or assembling context, generalists discover and validate the project's Ground Truth, conventions, and constraints. If project context is incomplete, they surface the gaps rather than proceeding with assumptions. See Standing Order 11.

6. **Transparency and auditability.** All routing decisions, context assembly choices, and escalation reasoning must be visible and traceable. Generalists never operate as black boxes — their decision logic must be reconstructible from their output. See Standing Order 12.

7. **Bias-aware coordination.** Generalists are susceptible to the same structural biases as specialists — sycophantic drift in escalation handling, anchoring to initial task decompositions, and confirmation bias in routing. They actively counteract these tendencies and challenge their own prior coordination decisions when evidence warrants it. See Standing Order 13.

8. **Pre-work validation.** Before dispatching tasks to specialists, generalists confirm that each task has a clear end goal, measurable acceptance criteria, defined budget allocation, and sufficient context. Incomplete task specifications are refined before dispatch, not patched during execution. See Standing Order 15.

-----

## Generalist Roster

| Agent | Purpose | Defined In |
|---|---|---|
| **Orchestrator** | Decomposes goals into tasks, routes to specialists, manages progress, enforces standards | [`agents/command/orchestrator.md`](agents/command/orchestrator.md) |
| **Triage Agent** | Classifies incoming work by type, priority, and complexity; routes to the Orchestrator | [`agents/command/triage-agent.md`](agents/command/triage-agent.md) |
| **Context Curator** | Assembles context payloads for agents; manages what each agent knows and when | [`agents/command/context-curator.md`](agents/command/context-curator.md) |
| **Mediator** | Resolves conflicting outputs between specialists; synthesizes divergent approaches | [`agents/command/mediator.md`](agents/command/mediator.md) |

-----

## How Generalists Interact

```
                    ┌──────────┐
                    │ Admiral  │
                    └────┬─────┘
                         │ goals, decisions, escalation responses
                         ▼
┌──────────┐       ┌──────────────┐       ┌──────────────────┐
│  Triage  │──────▶│ Orchestrator │──────▶│   Specialists    │
│  Agent   │       │              │◀──────│   (all domains)  │
└──────────┘       └──────┬───────┘       └──────────────────┘
                          │
                   ┌──────┴───────┐
                   │              │
              ┌────▼─────┐  ┌────▼─────┐
              │ Context  │  │ Mediator │
              │ Curator  │  │          │
              └──────────┘  └──────────┘
```

- **Triage Agent** receives raw work and classifies it → passes to **Orchestrator**
- **Orchestrator** decomposes and routes → assigns to **Specialists**
- **Context Curator** prepares context payloads → feeds to any agent before session start
- **Mediator** resolves conflicts → feeds resolution back to **Orchestrator** for routing

All generalist output ultimately flows toward specialist task assignment or Admiral escalation.
