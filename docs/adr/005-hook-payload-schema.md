# ADR-005: Hook Payload Schema

## Status

Accepted

## Context

Admiral hooks need to exchange structured data with Claude Code and with each other. Design choices: transport format (JSON, YAML, protobuf), delivery method (stdin/stdout, files, env vars, sockets), and schema evolution strategy.

## Decision

**JSON over stdin/stdout.** Hooks read payloads from stdin and write results to stdout. Stderr is reserved for logging (via `log.sh`).

### Rationale

- **JSON**: Claude Code natively produces and consumes JSON hook payloads. No conversion needed. `jq` is the only runtime dependency (per ADR-002).
- **stdin/stdout**: Claude Code's hook system pipes payloads on stdin and reads stdout. This is not a choice — it's a constraint of the platform. Using files or sockets would require an additional IPC layer.
- **stderr for logging**: Keeps hook output clean. Structured logs go to stderr and `.admiral/logs/`. Claude Code only processes stdout.

### Schema evolution

- Each payload type has a versioned JSON Schema in `admiral/schemas/` (e.g., `hook-payload-pre-tool-use.v1.schema.json`).
- Validation is fail-open per ADR-004: invalid payloads log a warning but don't block.
- New fields are additive (backward-compatible). Existing fields are never removed or renamed without a major version bump.
- `additionalProperties: true` in all schemas to allow forward compatibility.

## Consequences

- Hooks must handle missing or null fields gracefully (use `jq_get` with defaults via `jq_helpers.sh`).
- No binary payloads. Large data (screenshots, traces) must be referenced by path, not embedded.
- Schema validation at runtime is advisory-only. CI validates schema consistency via snapshot tests (T-20).
- Sub-hooks (called by adapters) receive enriched payloads with `session_state` merged in. This is an adapter responsibility, not a Claude Code contract.
