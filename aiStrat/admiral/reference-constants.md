<!-- Admiral Framework v0.2.0-alpha -->
# Reference Implementation Constants

> **Audience:** Implementers building a runtime that conforms to the Admiral Framework spec. This file captures concrete values, algorithms, and integration details derived from the reference implementation (`admiral/`). These are not part of the specification's normative prose — they are the decisions an implementation must make that the spec intentionally leaves open.

-----

## Tool Token Estimation

Hooks that track token budgets need per-tool-invocation estimates. The following table provides conservative estimates for common Claude Code tools. Implementations targeting other platforms should calibrate their own estimates.

| Tool | Estimated Tokens | Rationale |
|---|---|---|
| Bash | 500 | Command + short output |
| Read | 1,000 | File content ingestion |
| Write | 800 | File content generation |
| Edit | 600 | Partial file modification |
| Glob | 300 | File listing (lightweight) |
| Grep | 500 | Search results |
| WebFetch | 2,000 | Full page content |
| WebSearch | 1,500 | Search result summaries |
| Agent | 5,000 | Subagent delegation (full context) |
| NotebookEdit | 800 | Cell modification |
| **Default** | **500** | **Fallback for unlisted tools** |

These estimates are intentionally conservative (biased high). Underestimating causes budget overruns; overestimating causes early warnings. Early warnings are preferable.

-----

## Context Budget Validation

Section 06 specifies budget allocation ranges: Standing 15–25%, Session 50–65%, Working 20–30%. The implementation adds one constraint not stated in the spec:

> **The three allocations must sum to exactly 100%.** A context profile where Standing + Session + Working ≠ 100% is a configuration error and should be rejected at validation time, not discovered at runtime when context overflows.

-----

## Hook Dependency Algorithms

### Cycle Detection: DFS Three-Color

The spec says "detect circular dependencies" but does not prescribe an algorithm. The reference implementation uses depth-first search with three-color vertex marking:

- **WHITE (0):** Unvisited node.
- **GRAY (1):** Currently in the recursion stack (visiting its dependencies).
- **BLACK (2):** Fully processed (all dependencies explored).

A cycle exists when a GRAY node encounters another GRAY node during DFS traversal. The cycle path is reconstructed from the recursion stack.

### Execution Order: Kahn's Algorithm with Registration-Order Tie-Breaking

The spec says "topological sort" and "declaration order" for hooks at the same dependency level. The reference implementation uses Kahn's algorithm (BFS-based topological sort) with a specific tie-breaking rule:

1. Build in-degree map for all hooks registered to the current event.
2. Seed the queue with zero-in-degree hooks in **registration order** (the order they appeared in hook discovery).
3. When a node's in-degree reaches zero, insert it into the queue at the position that maintains registration order relative to other queue entries.

This produces deterministic ordering: dependencies first, declaration order among peers.

-----

## Error Signature Formulas

The spec defines error signatures conceptually. The reference implementation uses two distinct formulas for different subsystems:

### Self-Healing Loop Signature

```
SHA256(hook_name + ":" + first_line_of_error.lower() + ":" + exit_code)[:16]
```

- **Input:** Hook name, first line of error output (lowercased, stripped), exit code.
- **Purpose:** Tracks retry attempts per hook per distinct error. Different exit codes for the same error text produce different signatures.
- **Truncation:** First 16 hex characters of SHA-256 (64-bit collision space — sufficient for session-scoped tracking).

### Loop Detector Signature

```
SHA256(agent_id + ":" + error.strip().lower())[:16]
```

- **Input:** Agent identity string, full error message (lowercased, stripped).
- **Purpose:** Tracks error recurrence across tool invocations within a session. Uses agent ID instead of hook name because the loop detector monitors tool-level errors, not hook-level errors.
- **Key difference:** Does NOT include exit code. Groups errors by content regardless of exit code.

> **Why two formulas?** The self-healing loop operates at the hook execution layer (same hook failing repeatedly). The loop detector operates at the tool execution layer (same tool error recurring across invocations). Different scopes require different signature inputs.

-----

## Token Budget Alert Thresholds

The `token_budget_tracker` hook issues alerts at two thresholds:

| Utilization | Alert String | Meaning | Exit Code |
|---|---|---|---|
| >= 90% | `"ESCALATION"` | Agent should escalate remaining work | 0 (pass) |
| >= 80% | `"WARNING"` | Agent should conserve tokens | 0 (pass) |

Both thresholds use `>=` (inclusive). Alerts are advisory (exit 0); they do not block actions. The alert type is a string literal in the hook's JSON stdout under the `"alert"` key. An agent may receive both alerts in a single session as utilization crosses each threshold.

The `token_budget_gate` hook (PreToolUse) blocks at 100% utilization with exit code 2. At 99.99% utilization, the gate allows the action.

-----

## Loop Detection Thresholds

The `loop_detector` hook implements dual-threshold activation:

| Constant | Value | Meaning |
|---|---|---|
| MAX_SAME_ERROR | 3 | Same error signature recurs this many times |
| MAX_TOTAL_ERRORS | 10 | Total distinct error signatures in a session |

Loop detection triggers when **EITHER** threshold is crossed. These are the same defaults as the self-healing loop's `max_retries` and `max_session_retries`, but they apply at the tool-error level (loop detector) rather than the hook-error level (self-healing).

-----

## Self-Healing Behavioral Details

Beyond the parameters documented in Section 08 (max_retries: 3, max_session_retries: 10):

### Consecutive Identical Error Early-Exit

When the same error signature recurs on the **immediately next** failure (consecutive identical signature), the self-healing loop breaks immediately — it does not wait for the max_retries count. Rationale: if the agent's fix attempt produced the exact same error, the fix did not work and retrying the same approach is wasteful. This is stricter than the max_retries threshold.

### Retry Config Valid Range

The recovery ladder's retry config accepts 1–5 retries as the valid range. The spec recommends 2–3, but implementations should accept 1 (for fast-failing hooks) and up to 5 (for flaky external dependencies).

### Success Resets Counters

A successful hook execution clears all retry records for that hook and resets cycle detection state. This prevents stale error history from triggering false loop detection after the agent has recovered.

-----

## Exit Code Conventions

Hook exit codes follow the Claude Code convention:

| Exit Code | Meaning | Runtime Behavior |
|---|---|---|
| **0** | Pass | Action allowed. Stdout may contain context injected into agent's window. |
| **1** | Fail (soft) | Hook detected an issue. Stdout contains diagnostic information. Does not block. |
| **2** | Block (hard) | Action is blocked. Stderr contains reason shown to agent. Used for budget exhaustion, loop detection. |

> **Platform note:** Exit code 2 is specific to Claude Code's hook contract. Other platforms may use different conventions. The adapter layer (see below) translates between platform conventions and the framework's internal hook results.

### Hook Result Success Criterion

A hook result passes if and only if BOTH conditions are true:

```
passed = (exit_code == 0) AND (not timed_out)
```

A timeout always means failure, regardless of exit code. Exit codes and timeouts are independent failure channels. On timeout, exit code is forced to 1 and stderr contains a timeout message.

-----

## Session State Persistence

The runtime maintains session state in `.admiral/session_state.json` with the following structure:

```json
{
  "session_id": "",
  "started_at": 1710000000.0,
  "tokens_used": 0,
  "token_budget": 200000,
  "tool_call_count": 0,
  "hook_state": {},
  "context": {
    "standing_context_tokens": 0,
    "total_capacity": 200000,
    "current_utilization": 0.0,
    "standing_context_present": []
  }
}
```

- **Loaded** at the start of each hook invocation.
- **Saved** after each hook chain completes (even on failure).
- **Reset** at SessionStart (fresh session, zero counters).
- `current_utilization` is computed as `tokens_used / token_budget` after each tool call.
- `hook_state` is a dict keyed by hook name, carrying state between invocations (e.g., `loop_detector.error_counts`).

-----

## Standing Orders Injection

At `SessionStart`, the runtime injects Standing Orders into the agent's context window via stdout. The injected block includes:

1. A header: `"Admiral Level 1 — Standing Orders"`
2. The full rendered Standing Orders text (all 15 orders with rules)
3. A session enforcement summary listing active hooks
4. The current token budget

This stdout is captured by the platform (Claude Code) and prepended to the agent's context. It is the mechanism by which Standing Orders become part of the agent's working context rather than merely existing in specification files.

-----

## Critical Context Sections

The context health check hook validates the presence of three critical sections by exact string name in `context.standing_context_present`:

1. **`"Identity"`** — Who the agent is, what role it plays.
2. **`"Authority"`** — What decisions the agent can make autonomously vs. must escalate.
3. **`"Constraints"`** — What the agent must not do.

If any of these three sections is missing from the standing context, the health check fails (exit code 1). Other context sections (Knowledge, Task, Ground Truth) are valuable but not critical — their absence produces a warning, not a failure.

**Utilization threshold:** The health check also fails (exit code 1) when `current_utilization >= 0.85` (85%). Both conditions — missing sections and high utilization — trigger exit 1 (soft fail), not exit 2 (block). They can co-occur; when both trigger, the issues list contains both.

-----

## Hook Adapter Pattern

The reference implementation uses a three-handler adapter that translates between the platform's hook payload format and the framework's internal hook contracts:

| Handler | Event | Hooks Fired | Key Behavior |
|---|---|---|---|
| `session_start` | SessionStart | context_baseline | Resets state, records baseline, injects Standing Orders |
| `pre_tool_use` | PreToolUse | token_budget_gate | Blocks if budget exhausted (exit 2) |
| `post_tool_use` | PostToolUse | token_budget_tracker, loop_detector, context_health_check | Tracks tokens, detects loops, checks context health |

The adapter handles:
- Reading the platform's JSON payload from stdin.
- Translating platform fields (e.g., `tool_name`, `tool_response`) into the framework's internal payload format.
- Loading/saving session state between invocations.
- Converting hook results back to platform exit codes.

This pattern allows the same hook implementations to work across different platforms by swapping only the adapter layer.

-----

## Hook Manifest Validation

### Name Pattern

Hook names must match:

```
^[a-z][a-z0-9_]*$
```

First character: lowercase letter. Subsequent: lowercase letters, digits, underscores. No hyphens, PascalCase, or leading digits.

### Version Pattern

Hook versions must be strict semantic versioning:

```
^\d+\.\d+\.\d+$
```

Three numeric parts separated by dots (e.g., `1.0.0`). No pre-release suffixes, build metadata, or `v` prefix.

### Events Uniqueness

The `events` list must not contain duplicate lifecycle event types. A hook can bind to multiple events, but each event appears at most once.

### Timeout Configuration

- **Field name:** `timeout_ms` (milliseconds)
- **Minimum:** 100ms
- **Maximum:** 300,000ms (5 minutes)
- **On timeout:** Exit code forced to 1, stderr contains `"Hook timed out after Nms"`

-----

## Hook Discovery

Hook discovery scans a directory tree for `hook.manifest.json` files, then locates executables using a three-stage fallback:

1. **Exact match:** `{hook_dir}/{manifest.name}.py`
2. **Any Python file:** First `.py` file in the hook's directory
3. **Implementations directory:** `{implementations_dir}/{manifest.name}.py`

A manifest without a locatable executable is rejected at discovery time (`FileNotFoundError`). All manifests are discovered and validated before any hooks execute — dependency validation occurs after full discovery.

-----

## Fleet and Work Constants

| Constant | Value | Section | Meaning |
|---|---|---|---|
| FLEET_MIN_AGENTS | 1 | 11 | Single-agent fleets valid at Level 1 |
| FLEET_MAX_AGENTS | 12 | 11 | Maximum agents in a single fleet |
| CHUNK_BUDGET_CEILING_PCT | 40 | 18 | Max % of agent budget for one work chunk |
| STANDING_CONTEXT_MAX_LINES | 150 | 06 | Hard limit on standing context size |

`FleetRoster` rejects configurations outside 1–12 agents. The spec recommends 5–12 for Level 2+, but single-agent (Level 1) is valid.

-----

## Decision Authority Reference Defaults

`DecisionAuthority.with_common_defaults()` provides 10 pre-configured decision assignments for rapid Level 2 setup:

| Decision | Default Tier | Rationale |
|---|---|---|
| Token budget allocation | ENFORCED | Hook-controlled, no agent discretion |
| Loop detection response | ENFORCED | Automated, deterministic |
| Code pattern violations | AUTONOMOUS | Agent fixes without asking |
| Test coverage gaps | AUTONOMOUS | Agent writes tests without asking |
| Documentation updates | AUTONOMOUS | Agent updates docs without asking |
| Architecture changes | PROPOSE | Requires Admiral review |
| Dependency upgrades | PROPOSE | Risk assessment needed |
| Enforcement config changes | ESCALATE | Security-critical |
| Security decisions | ESCALATE | Always requires human review |
| Scope contradictions | ESCALATE | Ambiguity resolution |

`project_maturity_calibration()` adjusts tiers based on project context: strong tests, greenfield status, and self-healing widen the AUTONOMOUS tier; external-facing narrows it.

-----

## Minimum Dependency Set

| Package | Version | Required At |
|---|---|---|
| Python | ≥ 3.11 | All levels |
| pydantic | ≥ 2.5.0 | All levels (model validation) |
| jsonschema | ≥ 4.20.0 | All levels (manifest schema validation) |
| pytest | ≥ 8.0 | Development (test runner) |
| numpy | ≥ 1.26 | Optional (Brain similarity computations) |
| psycopg | ≥ 3.1 | Optional (Brain PostgreSQL persistence) |
| pgvector | ≥ 0.2 | Optional (Brain vector similarity search) |
| mcp | ≥ 1.0 | Optional (MCP protocol integration) |

The optional dependencies correspond to Level 3+ features. A Level 1–2 implementation requires only Python, pydantic, jsonschema, and pytest.
