# Hook Input/Output Contracts

> Formal specification of JSON schemas for all hook inputs, output contracts, per-hook payload shapes, exit code semantics, and timeout behavior.

**Last updated:** 2026-03-25

---

## Lifecycle Events

Admiral hooks fire at three lifecycle points:

| Event | When | Adapter | Can Block? |
|-------|------|---------|-----------|
| **SessionStart** | Session begins | `session_start_adapter.sh` | Yes (exit 2) |
| **PreToolUse** | Before tool invocation | `pre_tool_use_adapter.sh` | Yes (exit 2) |
| **PostToolUse** | After tool invocation | `post_tool_use_adapter.sh` | No (advisory only) |

---

## Input Contracts

### SessionStart Input

```json
{
  "session_id": "string",
  "model": "string"
}
```

Schema: `admiral/schemas/hook-payload-session-start.v1.schema.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | No | Unique session identifier. Defaults to `"unknown"`. |
| `model` | string | No | Model name (e.g., `"claude-opus-4"`). Defaults to `"unknown"`. |
| `agent_id` | string | No | Agent identifier for fleet operations. |
| `agent_name` | string | No | Fallback for `agent_id`. |

### PreToolUse Input

```json
{
  "tool_name": "string",
  "tool_input": { ... }
}
```

Schema: `admiral/schemas/hook-payload-pre-tool-use.v1.schema.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tool_name` | string | Yes | Tool being invoked: `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `NotebookEdit`, `Agent`, `AskUserQuestion`, `Skill`. |
| `tool_input` | object | No | Tool-specific parameters. |
| `tool_input.command` | string | — | For `Bash`: the command string. |
| `tool_input.file_path` | string | — | For `Read`/`Write`/`Edit`: target file path. |
| `tool_input.content` | string | — | For `Write`: file content. |
| `tool_input.old_string` | string | — | For `Edit`: string to replace. |
| `tool_input.new_string` | string | — | For `Edit`: replacement string. |

### PostToolUse Input

```json
{
  "tool_name": "string",
  "tool_input": { ... },
  "tool_response": "string | object | null"
}
```

Schema: `admiral/schemas/hook-payload-post-tool-use.v1.schema.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tool_name` | string | Yes | Tool that was invoked. |
| `tool_input` | object | No | Tool-specific parameters (same as PreToolUse). |
| `tool_response` | string/object/null | No | Tool output. May be truncated for large responses. |

---

## Output Contracts

All hooks output JSON to stdout. The output shape depends on the lifecycle event.

### SessionStart Output

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "string"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `continue` | boolean | `true` to continue session, `false` to block. |
| `suppressOutput` | boolean | `true` to suppress the system message. |
| `systemMessage` | string | Text injected into agent context (Standing Orders, warnings). |

### PreToolUse Output

```json
{
  "continue": true,
  "advisory": "string (optional)",
  "reason": "string (optional)"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `continue` | boolean | `true` to allow tool use, `false` to block. |
| `advisory` | string | Advisory message for the agent (visible as system message). |
| `reason` | string | Machine-readable reason code for the decision. |

When blocking (exit 2):

```json
{
  "continue": false,
  "reason": "scope_violation",
  "blocked_path": "/path/to/file",
  "advisory": "Write to protected path aiStrat/ is blocked."
}
```

### PostToolUse Output

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "string (optional)"
}
```

PostToolUse hooks are always advisory (exit 0). They inject context via `systemMessage`.

---

## Exit Code Semantics

| Code | Meaning | Behavior |
|------|---------|----------|
| `0` | **Pass** | Hook approves or provides advisory context. Tool use continues. |
| `1` | **Error** | Hook encountered an internal error. Fail-open per ADR-004 — tool use continues. |
| `2` | **Hard-block** | Hook rejects the action. Tool use is prevented. Agent receives rejection reason. |

**Fail-open design (ADR-004):** Infrastructure failures (exit 1) never block tool use. Only deliberate policy decisions (exit 2) can block. This ensures monitoring systems cannot deadlock the system they monitor.

---

## Per-Hook Payload Shapes

### SessionStart Hooks

#### `session_start_adapter.sh`
- **Input:** SessionStart payload
- **Output:** `{ continue, suppressOutput, systemMessage }` with Standing Orders
- **Dispatches to:** `context_baseline.sh`, `identity_validation.sh`, `tier_validation.sh`

#### `context_baseline.sh`
- **Input:** SessionStart payload (piped from adapter)
- **Output:** None (writes to session state via `set_state_field`)
- **State written:** `.hook_state.context_baseline.standing_context_tokens`

#### `identity_validation.sh` (S-01)
- **Input:** SessionStart payload with optional `agent_id`/`agent_name`
- **Output:** `{ validated, reason, agent_id, role, model_tier, capabilities, severity }`
- **Exit codes:** 0 (always — advisory only)

#### `tier_validation.sh` (S-02)
- **Input:** SessionStart payload with `agent_id` and `model`
- **Output:** `{ validated, [blocked], [downgraded], [upgraded], agent_id, expected_tier, actual_tier, severity }`
- **Exit codes:** 0 (pass/advisory), 2 (critical tier mismatch)

#### `ground_truth_validator.sh` (ST-06, ST-07)
- **Input:** SessionStart payload
- **Output:** `{ validated, ground_truth_file, llm_last_check, [advisory], severity }`
- **Exit codes:** 0 (always — advisory only)

### PreToolUse Hooks

#### `pre_tool_use_adapter.sh`
- **Input:** PreToolUse payload
- **Output:** `{ continue, advisory }` aggregated from sub-hooks
- **Dispatches to:** `scope_boundary_guard.sh`, `prohibitions_enforcer.sh`, `pre_work_validator.sh`

#### `scope_boundary_guard.sh` (SO-03)
- **Input:** `{ tool_name, tool_input.file_path, tool_input.command }`
- **Output:** `{ allowed, [reason], [blocked_path] }`
- **Exit codes:** 0 (allowed), 2 (blocked — protected path write)
- **Protected paths:** `aiStrat/`, `.github/workflows/`, `.claude/settings`

#### `prohibitions_enforcer.sh` (SO-10)
- **Input:** `{ tool_name, tool_input.command, tool_input.content, tool_input.file_path }`
- **Output:** `{ allowed, [violations[]], [severity] }`
- **Exit codes:** 0 (pass/advisory), 2 (blocked — bypass/privilege/irreversible)
- **Scans:** Command patterns (operations) and content patterns (data/secrets)

#### `protocol_registry_guard.sh` (SO-16, S-04)
- **Input:** `{ tool_name, tool_input.command, tool_input.file_path, tool_input.content }`
- **Output:** `{ allowed, reason, [server], [advisory], [severity] }`
- **Exit codes:** 0 (allowed), 2 (blocked — unapproved MCP server or `latest` version)

#### `tool_permission_guard.sh` (S-08)
- **Input:** `{ tool_name }` + session state `.agent_id`
- **Output:** `{ allowed, reason, [agent_id], [role], [tool], [advisory], [severity] }`
- **Exit codes:** 0 (allowed/warning), 2 (blocked — denied tool for agent role)

#### `pre_work_validator.sh` (SO-15)
- **Input:** `{ tool_name, tool_input }` + session state
- **Output:** `{ validated, checks: { standing_orders, budget, prior_reads, project_readiness } }`
- **Exit codes:** 0 (always — advisory only)

### PostToolUse Hooks

#### `post_tool_use_adapter.sh`
- **Input:** PostToolUse payload
- **Output:** `{ continue, suppressOutput, systemMessage }` aggregated from sub-hooks
- **Dispatches to:** `token_budget_tracker.sh`, `loop_detector.sh`, `context_health_check.sh` (every 10th), `zero_trust_validator.sh`, `compliance_ethics_advisor.sh`, `brain_context_router.sh`

#### `governance_heartbeat_monitor.sh` (S-03)
- **Input:** `{ tool_name }` + session state heartbeat tracking
- **Output:** `{ healthy, alerts, [advisory], severity }`
- **Exit codes:** 0 (always — advisory only)
- **Monitors:** Sentinel and Arbiter governance agent heartbeats

#### `token_budget_tracker.sh` (SO-08)
- **Input:** `{ tool_name }` + session state budget fields
- **Output:** `{ tokens_used, budget_total, percentage, [warning] }`
- **Exit codes:** 0 (always)
- **Warnings at:** 80%, 90%, 100% of budget

#### `loop_detector.sh` (SO-06)
- **Input:** `{ tool_name, tool_response }` + session state error tracking
- **Output:** `{ loop_detected, error_count, [warning] }`
- **Exit codes:** 0 (always)
- **Triggers at:** 3+ identical errors, 10+ total errors

#### `context_health_check.sh`
- **Input:** Session state `.standing_context` fields
- **Output:** `{ healthy, [missing_sections[]] }`
- **Exit codes:** 0 (always)
- **Fires:** Every 10th tool call (configurable)

#### `zero_trust_validator.sh` (SO-12)
- **Input:** `{ tool_name, tool_input, tool_response }`
- **Output:** `{ [untrusted_data], [blast_radius], [excessive_scope] }`
- **Exit codes:** 0 (always)
- **Flags:** External data (WebFetch/WebSearch), high-blast writes, excessive Bash scope

#### `compliance_ethics_advisor.sh` (SO-14)
- **Input:** `{ tool_name, tool_input, tool_response }`
- **Output:** `{ [pii_detected[]], [compliance_files[]], compliance_flags_count }`
- **Exit codes:** 0 (always)
- **Detects:** Email, SSN, phone, credit card patterns; compliance-sensitive filenames

#### `brain_context_router.sh` (SO-05, SO-11)
- **Input:** `{ tool_name }` + session state brain query tracking
- **Output:** `{ [brain_bypass], [brain_stale], brain_queries_count }`
- **Exit codes:** 0 (always)
- **Alerts:** Propose/Escalate without brain_query, stale queries (20+ tool calls)

---

## Timeout Semantics

| Parameter | Default | Description |
|-----------|---------|-------------|
| Hook timeout | 30s | Maximum execution time per hook invocation. |
| SessionStart total | 5s | Total time for all SessionStart hooks combined. |
| PreToolUse total | 2s | Total time for all PreToolUse hooks (critical path). |
| PostToolUse total | 5s | Total time for all PostToolUse hooks (off critical path). |

**Timeout behavior:** A hook that exceeds its timeout is killed and treated as exit 1 (fail-open). The adapter logs the timeout and continues.

**Performance targets:**
- Individual hook execution: < 500ms p95
- Full PreToolUse pipeline: < 1s p95
- Full PostToolUse pipeline: < 2s p95

---

## State Contract

Hooks read and write session state via `admiral/lib/state.sh`:

| Function | Purpose |
|----------|---------|
| `load_state` | Load `.admiral/session_state.json` |
| `get_state_field <path>` | Read a field (jq path) |
| `set_state_field <path> <value>` | Write a field atomically |
| `with_state_lock <command>` | Execute under file lock |

Hook-specific state is namespaced under `.hook_state.<hook_name>`:

```json
{
  "hook_state": {
    "token_budget_tracker": { "tokens_used": 5000 },
    "loop_detector": { "error_counts": {} },
    "brain_context_router": { "brain_queries_count": 0, "last_brain_query_tool_call": 0 },
    "zero_trust": { "external_data_count": 0 },
    "compliance_ethics_advisor": { "compliance_flags_count": 0 }
  }
}
```

---

## Event Logging Contract

All hooks log events to `.admiral/event_log.jsonl` via `admiral/lib/event_log.sh`:

```json
{
  "event": "string",
  "timestamp": "ISO-8601",
  "trace_id": "string",
  "session_id": "string",
  "data": { ... }
}
```

Event types: `session_start`, `tool_called`, `token_spent`, `policy_violation`, `pre_tool_use`, `identity_validated`, `tier_validated`.

---

## References

- [ADR-004 — Fail-Open Hook Design](../../docs/adr/ADR-004-fail-open-hook-design.md)
- [Spec Part 3 — Deterministic Enforcement](../../aiStrat/admiral/spec/part3-enforcement.md)
- [Hook Payload Schemas](../schemas/)
- [Standing Orders Enforcement Map](standing-orders-enforcement-map.md)
