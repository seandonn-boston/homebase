# ADR-006: Event ID Generation

## Status

Accepted

## Context

Every event in the Admiral control plane needs a unique identifier. The ID must be unique across concurrent agents, sortable is desirable but not required, and the generation must be fast (called on every tool use).

### Alternatives considered

| Approach | Uniqueness | Sortability | Speed | Dependencies |
|----------|-----------|-------------|-------|-------------|
| `Date.now()` | Poor — collisions under concurrency | Yes (temporal) | Fast | None |
| `Date.now() + counter` | Better — still collides across processes | Yes | Fast | None |
| `crypto.randomUUID()` (v4) | Excellent — 122 bits of entropy | No | Fast | Node.js built-in |
| ULID | Excellent — 80 bits entropy + 48-bit timestamp | Yes (lexicographic) | Fast | External dependency |

## Decision

Use `crypto.randomUUID()` with an `evt_` prefix: `evt_<uuid-v4>`.

### Rationale

- **Uniqueness**: UUID v4 provides 122 bits of randomness. Collision probability is negligible even across thousands of concurrent agents.
- **No external dependencies**: `crypto.randomUUID()` is a Node.js built-in (per ADR-002: zero runtime dependencies).
- **Replaced `Date.now()`**: The original implementation (Q-05) used `Date.now()` which collides when two events are emitted in the same millisecond — common during batch operations.
- **ULID rejected**: Would add a runtime dependency (`ulid` package). Sortability is not required — events already have a `timestamp` field for ordering.
- **Prefix `evt_`**: Makes IDs self-describing in logs and distinguishable from other UUID-based identifiers (agent IDs, trace IDs).

## Consequences

- Event IDs are not temporally sortable. Use the `timestamp` field for ordering.
- IDs are 40 characters (`evt_` + 36-char UUID). This is acceptable for JSON payloads but verbose in log output.
- All existing tests were updated when `Date.now()` was replaced (Q-05). New tests should not depend on ID format beyond the `evt_` prefix.
