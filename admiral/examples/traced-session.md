# Traced Multi-Agent Session

Demonstrates the Admiral Framework's three pillars working together: **hooks** (enforcement), **brain** (memory), and **control plane** (observability).

## What This Proves

1. Hooks fire on every tool call and emit structured events to `.admiral/event_log.jsonl`
2. Brain B1 records decisions and retrieves them mid-session
3. The control plane ingests hook events and serves them via API
4. The dashboard renders real session data (token budget, tool calls, alerts)

## Running the Session

```bash
# Hooks + Brain only (no server needed)
./admiral/examples/traced-session-runner.sh

# Full stack: hooks + brain + control plane + trace capture
./admiral/examples/traced-session-runner.sh --with-server
```

## Session Flow

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐
│ Session      │    │  Brain B1    │    │ Control Plane │
│ Start Hook   │    │  (Memory)    │    │ (Observability)│
└──────┬───────┘    └──────┬───────┘    └───────┬───────┘
       │                   │                    │
  1. Init session     2. Record 3 entries       │
  Standing Orders        (decision,             │
  injected               pattern, lesson)       │
       │                   │                    │
  3. 10 tool calls ────────────────────► Events emitted
  (post_tool_use          │              to event_log.jsonl
   hooks fire)            │                    │
       │             4. Query brain       5. Ingest events
       │             for "hooks"          Serve via API
       │                   │                    │
  6. Capture artifacts ────┴────────────────────┘
     (event log, session state, brain entries, trace)
```

## Artifacts Produced

| File | Description |
|---|---|
| `traced-session-output/event_log.jsonl` | All hook events (one JSON per line) |
| `traced-session-output/session_state.json` | Final session state (tokens, tool count, hook state) |
| `traced-session-output/brain_entries.txt` | Brain query results |
| `traced-session-output/control_plane_events.json` | Events as seen by control plane (with `--with-server`) |
| `traced-session-output/trace_ascii.txt` | ASCII execution trace (with `--with-server`) |
| `traced-session-output/stats.json` | Aggregated stats (with `--with-server`) |

## Event Schema

Each line in `event_log.jsonl` follows this structure:

```json
{
  "event": "tool_called",
  "timestamp": "2026-03-16T04:00:00Z",
  "trace_id": "uuid",
  "session_id": "traced-session-001",
  "agent_id": "claude-code",
  "agent_name": "Claude Code Agent",
  "tool": "Read",
  "tool_call_count": 5,
  "tokens_used": 3500
}
```

Event types: `session_start`, `tool_called`, `token_spent`, `policy_violation`

## How It Maps to Admiral Architecture

| Admiral Component | Implementation | Status |
|---|---|---|
| Deterministic Enforcement | `.hooks/*.sh` (34/34 tests passing) | Operational |
| Long-term Memory (B1) | `admiral/bin/brain_*` (JSON on filesystem) | Operational |
| Observability | `control-plane/` (event stream, runaway detector) | Operational |
| Event Pipeline | Hooks → JSONL → `JournalIngester` → EventStream | Wired |
| Dashboard | `control-plane/src/dashboard/index.html` | Live data |
| Agent Configs | `.claude/agents/*.md` (7 agents) | Deployed |
