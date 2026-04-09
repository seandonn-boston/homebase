# Real-Time Collaboration Dashboard (IF-12)

> Live fleet view with SSE updates

---

## Components

1. **Agent Status Panel**: Live status of all agents (active/idle/blocked)
2. **Task Board**: Dependencies, assignment, progress
3. **Event Stream**: Filtered real-time events (configurable per event type)
4. **Resource Meters**: Token budgets, session thermal state, queue depth
5. **Governance Overlay**: Active Standing Orders, recent violations, alert status

## Architecture

```
Control Plane Server (port 4510)
  ├── GET /api/dashboard/stream  → SSE endpoint (real-time events)
  ├── GET /api/dashboard/state   → Current fleet snapshot
  └── GET /dashboard             → Dashboard HTML/JS

Browser Client
  ├── EventSource connection to /api/dashboard/stream
  ├── Renders panels from SSE events
  └── Filters via URL params (?agent=X&type=tool_called)
```

## SSE Event Format
```
event: agent_event
data: {"type":"tool_called","agentId":"backend-implementer","tool":"Write","timestamp":1700000000}

event: alert
data: {"type":"loop_detected","agentId":"agent-1","severity":"warning"}

event: thermal
data: {"sessionId":"ses_1","temperature":"warm","consumed":45000,"budget":100000}
```

## Latency Target
Sub-2-second from event emission to dashboard render. SSE provides push semantics — no polling overhead.

## Prerequisites
- SSE support in AdmiralServer (extend server.ts)
- EventStream listener that forwards to SSE connections
- Static HTML/JS dashboard (no framework — vanilla JS for zero dependencies)
