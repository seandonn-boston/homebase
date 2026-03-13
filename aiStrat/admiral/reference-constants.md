<!-- Admiral Framework v0.3.0-alpha -->
# Reference Implementation Constants

> **Audience:** Implementers building a runtime that conforms to the Admiral Framework spec. This file captures concrete values, algorithms, and integration details that complement the normative spec prose — the decisions an implementation must make that the spec intentionally leaves open.
>
> **Relationship to spec:** This file derives its authority from the spec sections it references, creating an intentional bidirectional dependency — the spec defines intent and constraints, this file defines concrete constants, and each validates the other.

## Table of Contents

1. [Tool Token Estimation](#tool-token-estimation)
2. [Context Budget Validation](#context-budget-validation)
3. [Hook Dependency Algorithms](#hook-dependency-algorithms)
4. [Error Signature Formulas](#error-signature-formulas)
5. [Token Budget Alert Thresholds](#token-budget-alert-thresholds)
6. [Loop Detection Thresholds](#loop-detection-thresholds)
7. [Self-Healing Behavioral Details](#self-healing-behavioral-details)
8. [Exit Code Conventions](#exit-code-conventions)
9. [Session State Persistence](#session-state-persistence)
10. [Standing Orders Injection](#standing-orders-injection)
11. [Critical Context Sections](#critical-context-sections)
12. [Hook Adapter Pattern](#hook-adapter-pattern)
13. [Hook Manifest Validation](#hook-manifest-validation)
14. [Hook Discovery](#hook-discovery)
15. [Fleet and Work Constants](#fleet-and-work-constants)
16. [Decision Authority Reference Defaults](#decision-authority-reference-defaults)
17. [Minimum Dependency Set](#minimum-dependency-set)
18. [Hook Timeout Defaults](#hook-timeout-defaults)
19. [Context Health Check Invocation Frequency](#context-health-check-invocation-frequency)
20. [Governance Heartbeat Monitor](#governance-heartbeat-monitor)
21. [Context Window Absolute Ceilings](#context-window-absolute-ceilings)
22. [Token Depletion and Chunk Sizing](#token-depletion-and-chunk-sizing)
23. [Swarm Pattern Constants](#swarm-pattern-constants)
24. [Quality & Health Metric Thresholds](#quality--health-metric-thresholds)
25. [Admiral Fallback Decomposer Mode](#admiral-fallback-decomposer-mode)
26. [A2A Protocol Constants](#a2a-protocol-constants)
27. [Brain Configuration Constants](#brain-configuration-constants)
28. [Contract-First Parallelism Impact](#contract-first-parallelism-impact)
29. [LLM-Last Design Constants](#llm-last-design-constants)

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

-----

## Hook Timeout Defaults

The spec defines a default hook timeout and per-hook overrides. Implementers must apply the per-hook value when present, falling back to the global default.

| Hook | Timeout | Rationale |
|---|---|---|
| **Global default** | **30 seconds** | Safe ceiling for any hook without explicit config |
| token_budget_gate | 5 seconds | Lightweight arithmetic check; blocks tool use |
| token_budget_tracker | 5 seconds | Lightweight arithmetic check; advisory only |
| loop_detector | 5 seconds | Signature comparison; no I/O |
| context_baseline | 10 seconds | Reads context state; one-time at session start |
| context_health_check | 10 seconds | Reads context state; periodic |
| identity_validation | 10 seconds | String presence checks against context |
| governance_heartbeat_monitor | 10 seconds | Async heartbeat collection and evaluation |

All timeouts use `timeout_ms` in the manifest. On timeout, exit code is forced to 1 and stderr contains `"Hook timed out after Nms"`.

-----

## Context Health Check Invocation Frequency

The `context_health_check` hook does not fire on every tool invocation. It fires every **N tool invocations** (configurable, default: **10**). This reduces overhead while still catching context degradation before it compounds.

Implementers track `tool_call_count` in session state and fire the health check when `tool_call_count % N == 0`.

-----

## Governance Heartbeat Monitor

The governance heartbeat monitor runs **asynchronously** on a configurable interval, separate from the synchronous hook chain.

| Constant | Value | Meaning |
|---|---|---|
| Default interval | 60 seconds | Time between heartbeat checks |
| Missed heartbeat threshold | 2 consecutive misses | Triggers direct alert to Admiral (bypasses Orchestrator) |
| Confidence floor | 0.5 | If `confidence_self_assessment < 0.5` for any agent, alert Admiral even if heartbeat is present (alive but degraded) |

The monitor detects two failure modes: unresponsive agents (no heartbeat) and degraded agents (heartbeat present but low confidence). Both bypass the Orchestrator and alert the Admiral directly.

-----

## Context Window Absolute Ceilings

Section 06 defines percentage-based allocation ranges (Standing 15–25%, Session 50–65%, Working 20–30%). Two absolute limits complement the percentages:

| Constant | Value | Source | Meaning |
|---|---|---|---|
| Standing context absolute ceiling | 50K tokens | part2-context.md | Standing context should rarely exceed this regardless of window size. At 2M tokens, 15% = 300K — far more than any agent needs. |
| Context stuffing anti-pattern threshold | 60% standing context | part2-context.md | If standing context consumes ≥60% of the window, output becomes shallow and unfocused. This is a design smell, not a hard gate. |

-----

## Token Depletion and Chunk Sizing

Work decomposition constants govern how agents partition tasks to avoid quality degradation near budget exhaustion.

| Constant | Value | Source | Meaning |
|---|---|---|---|
| Chunk budget ceiling | 40% of agent budget | part6-execution.md | No single task should consume more than 40%. Agents near depletion rush to finish — they drop error handling, skip edge cases. |
| Quality degradation onset | ~60% through task | part6-execution.md | Agents produce high-quality work for the first 60% and rush the remaining 40%. The chunk ceiling prevents this by keeping each chunk well within the safe zone. |
| Over-decomposition signal | <20% budget used per chunk | part6-execution.md | Chunks using less than 20% of budget suggest the work was split too finely — coordination overhead exceeds the benefit. |

-----

## Swarm Pattern Constants

Swarm patterns (queen + workers) require health monitoring at the swarm level.

| Constant | Value | Source | Meaning |
|---|---|---|---|
| Worker heartbeat timeout | 60 seconds (configurable) | part6-execution.md | Queen detects missing worker heartbeat after this interval |
| Swarm error rate threshold | 30% | part6-execution.md | If >30% of workers fail on the same task type, the queen halts the swarm and escalates — the task specification is likely flawed |

-----

## Quality & Health Metric Thresholds

Operational dashboards use these thresholds to distinguish healthy fleet behavior from degradation.

### Execution Quality

| Metric | Healthy | Critical | Meaning |
|---|---|---|---|
| First-Pass Quality Rate | Above 75% | Below 50% | Below 75%, rework volume exceeds new work volume |
| Rework Ratio | Under 10% | Above 20% | Upstream problems — unclear criteria or stale Ground Truth |
| Self-Heal Rate | Above 80% | Below 50% | Below 50% means gates are misconfigured |
| Assumption Accuracy | Above 85% | Below 70% | Below 70% means Ground Truth is stale |
| Handoff Rejection Rate | Under 5% | Above 15% | Above 15% means contracts are underspecified |

### Cost & Efficiency

| Metric | Healthy | Critical | Meaning |
|---|---|---|---|
| Idle Time Ratio | Under 15% | Over 25% | Bottleneck — agents waiting on dependencies or orchestrator |
| Orchestrator Overhead | Under 25% of session budget | Over 25% | Coordination bloat — fleet spending more on routing than work |
| Budget Adherence | 80–120% consistently | Consistent overruns/underruns | Estimation calibration issue |

### Budget Burn Rate Brackets

| Utilization | Status | Action |
|---|---|---|
| < 50% | Normal | No action needed |
| 50–80% | Caution | Monitor closely |
| 80–100% | Tighten | Conserve tokens, defer non-critical work |
| > 100% | Exhausted | Pause non-critical work immediately |

### Orchestrator Overhead Case Study Reference

Case Study 2 documents an orchestrator consuming **60%** of the session token budget — the canonical example of coordination bloat. The 25% threshold exists to catch this pattern early.

-----

## Admiral Fallback Decomposer Mode

When the Orchestrator becomes unresponsive, the Admiral activates a degraded but functional coordination state.

| Constant | Value | Meaning |
|---|---|---|
| Orchestrator failure detection | 3 consecutive missed heartbeats over 30 seconds | Confirmed by governance agent escalation |
| Fallback mode duration limit | 5 minutes | Escalate to human if Orchestrator has not recovered |
| Fallback mode exit criteria | 3 consecutive stable intervals (30 seconds) | Orchestrator heartbeat must resume and remain stable |

-----

## A2A Protocol Constants

| Constant | Value | Meaning |
|---|---|---|
| Default request timeout | 5 minutes | Caller receives timeout error and moves to recovery ladder |

-----

## Brain Configuration Constants

### Query Defaults

| Constant | Value | Scope | Meaning |
|---|---|---|---|
| Default result limit | 10 | General queries (part5-brain.md) | Maximum results returned by default |
| Max result limit | 50 | Batch/admin queries (part5-brain.md) | Upper bound on result count |
| Cosine similarity min_score | 0.7 | All queries | Below 0.7, results are typically false positives — noise rather than signal |

### Token Lifecycle

| Constant | Value | Meaning |
|---|---|---|
| Default token lifetime | 1 hour | How long a brain access token remains valid |
| Maximum token lifetime | 4 hours | Hard ceiling regardless of configuration |
| Token rotation interval | 1 hour (configurable) | Matches default lifetime; long-running sessions must rotate |
| Revocation propagation | Within one heartbeat interval (~10 seconds) | Time for a revoked token to become invalid across the fleet |

### Decay and Graduation

| Constant | Value | Meaning |
|---|---|---|
| Decay awareness window | 90 days | Entries not accessed in this window are flagged for review (not deleted) |
| Level 1→2 graduation threshold | 30% missed retrieval rate over 2 weeks | When file-based brain can't keep up, migrate to vector store |
| Level 2 performance limit | ~10,000 entries | Beyond this, full-table scan latency degrades; advance to Level 3 (HNSW index) |

### Embedding Models

| Model | Dimensions | Requirements | Notes |
|---|---|---|---|
| text-embedding-3-small (OpenAI) | 1536 | API key + network | Best quality when API access is available |
| all-MiniLM-L6-v2 (local) | 384 | Python + sentence-transformers | Fully local, zero cost, lower quality |

-----

## Contract-First Parallelism Impact

Behavioral data from case studies documenting the effect of contract-first design on fleet coordination:

| Metric | Without Contracts | With Contracts |
|---|---|---|
| Handoff rejection rate | 18% | 3% |

This data supports the standing order requiring contract-first decomposition before parallel work assignment.

-----

## LLM-Last Design Constants

| Constant | Value | Source | Meaning |
|---|---|---|---|
| LLM call elimination rate | 30–60% | part8-operations.md | Percentage of LLM calls eliminated by deterministic pre-processing |
| Economy-tier cost ratio | 1/30th of flagship | part8-operations.md | Cost savings when routing simple tasks to smaller models |
