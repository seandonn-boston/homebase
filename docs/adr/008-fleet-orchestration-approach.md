# ADR-008: Fleet Orchestration Approach

## Status

Accepted

## Context

The Admiral Framework supports multiple AI agents working concurrently (via git worktrees). These agents need coordination to avoid conflicts, share work, and maintain consistency. The orchestration approach must work within Claude Code's constraints: no persistent daemon, no shared memory, file-system-based communication.

### Alternatives considered

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **Centralized coordinator** | A long-running process assigns tasks and mediates conflicts | Strong consistency, global view | Requires daemon, single point of failure, complex setup |
| **Peer-to-peer** | Agents discover and negotiate with each other directly | No central authority, resilient | Complex protocol, consensus overhead, hard to debug |
| **Hybrid: git-mediated** | Git branches as coordination locks, file-system for state, no running coordinator | Zero infrastructure, crash-resilient, auditable | Eventual consistency, no real-time negotiation |

## Decision

**Hybrid: git-mediated orchestration.** No central coordinator process. Agents coordinate through:

1. **Branch-based task claiming**: Creating a `task/phase-<NN>/<id>` branch is an atomic claim. Other agents skip tasks whose branches exist. This is the core lock mechanism (see `/next-todo` Parallel Worker Awareness).

2. **File-system state**: Session state in `.admiral/session_state.json`, event logs in `.admiral/event_log.jsonl`, handoff files in `.admiral/handoffs/`. Each agent reads/writes its own state; shared state is append-only (JSONL logs).

3. **Fleet registry**: `admiral/config/fleet_registry.json` defines agent identities, capabilities, and tiers. Agents consult it at session start but don't modify it at runtime.

4. **Task router**: `admiral/lib/task_router.sh` assigns tasks based on agent capabilities and tier. No real-time negotiation — routing decisions are deterministic given the registry and current TODO state.

5. **Handoff protocol**: `admiral/lib/handoff.sh` enables structured agent-to-agent task transfer via JSON files, with validation and status tracking.

### Why not centralized

- Claude Code sessions are ephemeral. A coordinator would need to survive session boundaries, which requires external infrastructure (Redis, SQLite, etc.) — violating ADR-002 (zero runtime dependencies).
- Git is already the shared substrate. Branch operations are atomic and crash-safe.
- The Admiral Framework must work on a single developer's machine with no servers running.

### Why not peer-to-peer

- Claude Code agents cannot discover each other at runtime. They don't know how many agents are running or their identities.
- Consensus protocols (Raft, Paxos) require reliable messaging between participants. File-system polling is too slow and unreliable for real-time consensus.
- The complexity is unjustified for the typical fleet size (2-5 concurrent agents).

## Consequences

- **No real-time coordination**: If two agents start the same task simultaneously before either creates the branch, both will attempt to create it. Git will reject the second `git branch` if the first has pushed. This is a narrow race window (seconds) with a safe failure mode.
- **Eventual consistency**: An agent that completes a task and merges its PR may not be immediately visible to other agents until they `git fetch`. This is acceptable — tasks are independent within a phase.
- **Scalability limit**: This approach works for 2-10 concurrent agents. Beyond that, branch-based locking would create contention on `git fetch` and branch listing. This is sufficient for the framework's design target.
- **Audit trail**: All coordination is visible in git history. Branch creation timestamps, merge commits, and PR metadata provide a complete orchestration record.
