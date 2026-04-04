# Admiral Framework Style Guide

Naming conventions, error handling patterns, exit codes, and testing requirements for contributors.

---

## File Naming

| Location | Convention | Examples |
|----------|-----------|---------|
| `.hooks/` | `snake_case.sh` | `loop_detector.sh`, `pre_tool_use_adapter.sh` |
| `admiral/lib/` | `snake_case.sh` | `hook_utils.sh`, `jq_helpers.sh`, `state.sh` |
| `admiral/bin/` | `snake_case` or `kebab-case` | `validate_fleet.sh`, `generate-agent.sh` |
| `admiral/tests/` | `test_<module>.sh` | `test_jq_helpers.sh`, `test_hook_utils.sh` |
| `admiral/config/` | `snake_case.json` | `fleet_registry.json`, `admiral.json` |
| `control-plane/src/` | `kebab-case.ts` | `ring-buffer.ts`, `events.ts` |
| TS tests | `<module>.test.ts` | `ring-buffer.test.ts`, `events.test.ts` |
| TS property tests | `<module>.property.test.ts` | `ring-buffer.property.test.ts` |

---

## Bash Conventions

### Variables

- **Global/exported**: `UPPER_CASE` — `SCRIPT_DIR`, `PROJECT_DIR`, `PAYLOAD`, `TOOL_NAME`
- **Local**: `lower_case` — `local errors=""`, `local result`, `local agent_count`
- **Module-private**: `_UPPER_CASE` prefix — `_HOOK_NAME`, `_REGISTRY_FILE`

### Functions

- **Public**: `snake_case` — `hook_init()`, `load_state()`, `jq_get()`
- **Private/internal**: `_snake_case` prefix — `_validate_state_schema()`, `_ensure_loaded()`

### Script Header

Every hook and library script must include:

```bash
#!/bin/bash
# Admiral Framework — <Name> (<Spec Reference>)
# <One-line description of purpose>
# <Additional design notes if needed>
#
# Exit codes: 0=pass/fail-open, 2=hard-block (if applicable)
# Timeout: <N>s (for hooks only)
set -euo pipefail
```

### Section Dividers

Use Unicode box-drawing characters for visual separation in libraries:

```bash
# ─── Section Name ────────────────────────────────────────────────
```

### jq Patterns

Use `admiral/lib/jq_helpers.sh` instead of inline jq. See Q-01 for the full API:

```bash
# Instead of: VAR=$(echo "$JSON" | jq -r '.field // "default"')
VAR=$(jq_get "$JSON" '.field' 'default')

# Instead of: JSON=$(echo "$JSON" | jq --argjson v "$VAL" '.field = $v')
JSON=$(jq_set "$JSON" '.field' "$VAL")

# Instead of: echo "$INPUT" | jq empty 2>/dev/null
jq_is_valid "$INPUT"
```

### Error Handling

Use `admiral/lib/hook_utils.sh` for standardized hook lifecycle:

```bash
source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
hook_init "my_hook_name"

# Advisory warning (fail-open, exit 0):
hook_fail_soft "Warning message" "$hook_state_json"

# Hard block (fail-closed, exit 2):
hook_fail_hard "Block reason"

# Success:
hook_pass "$output_json"

# Automatic fail-open recovery on unhandled errors:
hook_trap_fail_open
```

---

## Exit Code Taxonomy

| Code | Meaning | When to Use |
|------|---------|-------------|
| `0` | Success or fail-open | Default for all advisory hooks. Hook ran successfully or encountered a non-critical issue and chose not to block. |
| `1` | Error, fail-open | Hook encountered an error but degrades gracefully. The tool call is not blocked. |
| `2` | Hard-block, fail-closed | Tool execution is denied. Reserved for security-critical hooks: `prohibitions_enforcer`, `scope_boundary_guard`, `identity_validation`. |
| `3` | Configuration error | Hook cannot run due to missing or invalid configuration. Fail-open. |
| `4` | Dependency error | Required dependency (jq, sha256sum, etc.) is missing. Fail-open. |
| `126` | Hook disabled | Hook is intentionally disabled via configuration. |
| `127` | Hook not found | Hook script does not exist at expected path. |

**Rule**: When in doubt, exit 0. Only exit 2 when the action is provably dangerous (bypass attempts, privilege escalation, irreversible operations, writes to protected paths).

---

## TypeScript Conventions

### Naming

- **Files**: `kebab-case.ts` — `ring-buffer.ts`, `distributed-tracing.ts`
- **Classes**: `PascalCase` — `RingBuffer`, `EventStream`, `AlertRouter`
- **Interfaces/Types**: `PascalCase` — `Alert`, `TraceSpan`, `InstrumentationConfig`
- **Functions/methods**: `camelCase` — `startTrace()`, `generateTraceId()`, `toArray()`
- **Variables**: `camelCase` — `agentId`, `maxEvents`, `dedupWindowMs`
- **Constants**: `UPPER_CASE` — `DEFAULT_CAPACITY`, `MAX_RETRY_COUNT`
- **Private fields**: `private` keyword, camelCase — `private spans`, `private count`

### JSON Field Naming

JSON payloads use `snake_case` for field names:

```json
{
  "tool_name": "Bash",
  "tool_call_count": 42,
  "hook_state": {
    "loop_detector": { "total_errors": 0 }
  }
}
```

TypeScript code uses `camelCase` internally but `snake_case` at JSON boundaries.

### Exports

- **Named exports only.** No default exports. This ensures consistent import syntax and enables tree-shaking.
- **`index.ts` is the public API surface.** Only types and functions re-exported from `index.ts` are considered public. Internal modules may be imported directly for testing but are not part of the stable API.
- **Re-export from `index.ts`**, not barrel files. Each module exports its own types; `index.ts` selectively re-exports what consumers need.
- **Export types separately** with `export type` when the export is type-only (interfaces, type aliases). This enables `isolatedModules` compatibility.

```typescript
// In module file (events.ts):
export type EventType = "tool_called" | "tool_result" | ...;
export class EventStream { ... }

// In index.ts:
export { EventStream, EventType } from "./events";
export type { AgentEvent } from "./events";  // type-only re-export
```

- **Do not export internal helpers.** If a function is only used within its module, keep it unexported.
- **Group related exports** in `index.ts` by domain (events, detection, tracing, errors).

---

## Hook Output Contract

### PostToolUse hooks

Return JSON with optional `hook_state` and `alert`:

```json
{
  "hook_state": {
    "<hook_name>": { "<key>": "<value>" }
  },
  "alert": "Advisory message for the agent"
}
```

### PreToolUse hooks

Return JSON with `hookSpecificOutput`:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny",
    "additionalContext": "Message for the agent"
  }
}
```

### Adapter output

Return JSON with `continue` flag and optional `systemMessage`:

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "Advisory text"
}
```

---

## Testing Requirements

### Every task must have

1. **Happy path tests** — verify correct behavior with valid inputs.
2. **Unhappy path tests** — verify graceful handling of invalid inputs, missing data, and error conditions.

### Bash tests

- File: `admiral/tests/test_<module>.sh`
- Pattern: `assert_eq`, `assert_exit` helper functions
- Exit 0 on all pass, exit 1 on any failure
- Print `[PASS]` or `[FAIL]` per test case with summary

### TypeScript tests

- File: `<module>.test.ts` using `node:test` (`describe`, `it`)
- Assertions via `node:assert/strict`
- Property-based tests: `<module>.property.test.ts` using `fast-check`

### What to test

| Component | Required Coverage |
|-----------|------------------|
| Hook scripts | Valid payload, empty payload, malformed JSON, missing fields |
| Libraries | Public API functions, edge cases, error recovery |
| TypeScript modules | Constructor, public methods, boundary conditions |
| Configuration | Schema validation, missing config, corrupt config |

---

## Fail-Open vs Fail-Closed

The default posture is **fail-open** (ADR-004). Hooks that encounter errors should log the error and allow the tool call to proceed. This prevents hook failures from cascading into blocked work.

**Fail-closed** is reserved for security boundaries where allowing the action is more dangerous than blocking it:

| Hook | Mode | Rationale |
|------|------|-----------|
| `prohibitions_enforcer` | Fail-closed | Bypass attempts undermine all enforcement |
| `scope_boundary_guard` | Fail-closed | Writes to protected paths require approval |
| `identity_validation` | Fail-closed | Unregistered agents must not operate |
| All other hooks | Fail-open | Advisory warnings are safer than false blocks |

---

## Dependency Sourcing

Source shared libraries with fail-open guards:

```bash
if [ -f "$PROJECT_DIR/admiral/lib/hook_utils.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
fi
```

Critical libraries (like `state.sh` in adapters) can fail-hard if missing:

```bash
source "$PROJECT_DIR/admiral/lib/state.sh"
```

---

## Comment Standards

- Use comments to explain **why**, not **what**.
- Do not add comments to self-evident code.
- Use `# shellcheck disable=SCXXXX` with an inline explanation when suppressing ShellCheck warnings.
- Mark deferred/future work with the spec item ID: `# TODO: Deferred to Phase N (depends on X-NN)`.

---

## Structured Logging

Use `admiral/lib/log.sh` for operational logging:

```bash
source "$PROJECT_DIR/admiral/lib/log.sh"

log_info "component_name" "Message" '{"key": "value"}'
log_warn "component_name" "Warning message"
log_error "component_name" "Error details" '{"error": "context"}'
```

Log output goes to stderr and `.admiral/logs/admiral.jsonl`. Hook JSON output goes to stdout only.
