# ADR-010: Hook-to-Brain B2 Access Pattern

## Status

Accepted

## Context

Hooks are bash scripts that enforce governance rules on every tool call. Brain B2 is a SQLite database with FTS5 full-text search that stores institutional memory (decisions, violations, patterns). Currently hooks operate statelessly — they can't query "has this pattern been seen before?" or "how many violations has this agent accumulated?"

Connecting hooks to Brain B2 would transform them from stateless rule enforcers into context-aware decision makers. Three access patterns were evaluated:

1. **Direct SQLite CLI** — Hooks call `sqlite3` directly against the B2 database file
2. **Control Plane API** — Hooks call the control plane REST API, which queries B2
3. **MCP Tool Calls** — Hooks invoke Brain MCP tools

## Decision

Use **Direct SQLite CLI** for hook-to-B2 reads, and an **async write queue** (file-based) for hook-to-B2 writes.

## Rationale

### Why Direct SQLite for reads

| Criterion | Direct SQLite | Control Plane API | MCP Tools |
|-----------|--------------|-------------------|-----------|
| Latency | ~5-20ms (sqlite3 CLI) | ~50-200ms (HTTP round-trip) | ~100-500ms (tool invocation) |
| Availability | Always (file on disk) | Requires server running | Requires MCP server running |
| Complexity | Low (shell + sqlite3) | Medium (HTTP client in bash) | High (MCP protocol in bash) |
| Concurrency | WAL mode handles concurrent readers | Server serializes | Server serializes |
| B3 migration path | Requires new adapter | API stays the same | Tools stay the same |

Direct SQLite wins on latency (<100ms budget), availability (hooks must work without the server), and simplicity (per ADR-001, hooks use bash + jq + coreutils). The B3 migration impact is acceptable — we create an abstraction layer (`brain_query.sh`) that can swap from `sqlite3` to `curl` when B3 (Postgres) arrives.

### Why async write queue for writes

Hook writes must be non-blocking (per ADR-004, fail-open philosophy). Direct SQLite writes risk lock contention with concurrent hook executions. Instead, writes go to a bounded append-only queue file (JSONL), which the control plane ingests asynchronously. This mirrors the existing `event_log.jsonl` pattern for hook-to-control-plane communication.

### B3 migration path

When Brain B3 (Postgres+pgvector) replaces B2, the `brain_query.sh` functions swap their implementation from `sqlite3` calls to either:
- `curl` calls to the control plane API (if Postgres is remote), or
- `psql` calls (if Postgres is local)

The function signatures and return formats stay the same. Hooks never know which backend is in use.

## Consequences

- Hooks gain access to institutional memory for context-aware decisions.
- `sqlite3` becomes a required dependency for hooks (already common on all target platforms).
- Hook startup cost increases by ~10-20ms per B2 query (acceptable within 100ms budget per ADR-001's ~50ms baseline).
- Write queue adds a new file (`.admiral/brain_write_queue.jsonl`) that the control plane must ingest.
- B3 migration requires updating `brain_query.sh` internals but not hook code.

## Implementation

- `admiral/lib/brain_query.sh` — Sourceable shell functions for hook-to-B2 queries
- `admiral/lib/brain_writer.sh` — Extended with queue-based async writes
- `.admiral/brain_write_queue.jsonl` — Bounded JSONL write queue (max 1000 entries)
