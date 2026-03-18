# End-to-End Session Log — Admiral Starter Profile

**Date:** 2026-03-15
**Profile:** Starter (F1/E1/B1/P1/CP1/S1/DE1)
**Purpose:** Demonstrates governance in action — hooks fire deterministically, budget tracking works, Standing Orders are injected.

---

## Session Start

**Event:** Claude Code session begins. SessionStart hook fires.

**What happens:**
1. `session_start_adapter.sh` receives Claude Code `SessionStart` payload
2. Session state initialized from template defaults (`tokens_used: 0`, `token_budget: 0`)
3. Trace ID generated (UUID)
4. `context_baseline.sh` records initial context metrics
5. All 16 Standing Orders rendered and injected via `systemMessage`

**Event log entry:**
```json
{"event":"session_start","timestamp":"2026-03-15T14:00:00Z","trace_id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","session_id":"sess_001","model":"claude-opus-4-6","standing_orders_loaded":16}
```

**Standing Orders injected (excerpt):**
```
# Admiral Standing Orders (16 loaded)

SO-01 — Identity Discipline: Agents must maintain consistent identity...
SO-02 — Output Routing: All outputs must follow designated routing...
...
SO-15 — Pre-Work Validation: Validate context and readiness before substantive work...
SO-16 — Protocol Governance: Governance protocols are binding and non-negotiable...
```

**Governance value:** Standing Orders are loaded deterministically — not advisory text the agent can ignore, but system-level context injected before the agent sees any user prompt.

---

## Normal Operation (Tool Calls 1-15)

**Event:** Agent works on a feature implementation. Each tool call fires PreToolUse and PostToolUse hooks.

**PreToolUse flow (every tool call):**
1. `pre_tool_use_adapter.sh` loads session state
2. Fires `scope_boundary_guard.sh` → enforces file/directory access boundaries
3. Fires `prohibitions_enforcer.sh` → blocks prohibited operations (SO-10)
4. Fires `pre_work_validator.sh` → validates context loaded before substantive work (SO-15)

**PostToolUse flow (every tool call):**
1. `post_tool_use_adapter.sh` receives payload, increments tool call count
2. Fires `token_budget_tracker.sh` → estimates tokens for tool type, updates `tokens_used`
3. Fires `loop_detector.sh` → checks for repeated error signatures
4. Fires `zero_trust_validator.sh` → validates external data interactions (SO-12)
5. Fires `compliance_ethics_advisor.sh` → flags compliance concerns (SO-14)
6. Fires `brain_context_router.sh` → routes decision context to Brain B1
7. Every 10th call: fires `context_health_check.sh`

**Token estimates per tool type (from admiral/config.json):**
| Tool | Estimated Tokens |
|---|---|
| Read | 1,000 |
| Grep | 500 |
| Glob | 300 |
| Edit | 600 |
| Write | 800 |
| Bash | 500 |
| Agent | 5,000 |
| WebFetch | 2,000 |
| WebSearch | 1,500 |
| NotebookEdit | 800 |
| Other | 500 |

**Sample event log after 3 tool calls:**
```json
{"event":"tool_called","timestamp":"2026-03-15T14:05:12Z","trace_id":"a1b2c3d4...","tool":"Read","tool_call_count":1,"tokens_used":1000}
{"event":"tool_called","timestamp":"2026-03-15T14:05:18Z","trace_id":"a1b2c3d4...","tool":"Edit","tool_call_count":2,"tokens_used":1600}
{"event":"tool_called","timestamp":"2026-03-15T14:05:25Z","trace_id":"a1b2c3d4...","tool":"Bash","tool_call_count":3,"tokens_used":2100}
```

---

## Budget Warning at 90% (Advisory)

**Scenario:** `token_budget` is set to a non-zero value (e.g., 200,000). `tokens_used` reaches 180,000 (90%).

**What happens:**
1. `token_budget_tracker.sh` detects utilization >= 90%
2. Returns advisory alert: `"Budget warning: 90% utilized (180000/200000)"`
3. PostToolUse adapter injects system message to agent

**Agent sees:**
```
[Budget] Budget warning: 90% utilized (180000/200000). Consider wrapping up current task.
```

**At 100%:**
1. `token_budget_tracker.sh` detects utilization >= 100%
2. Returns advisory alert: `"Budget exhausted: 200000/200000. Wrap up immediately."`

**Design principle:** All hooks are advisory — no hook can block tool use or create deadlocks. Budget tracking surfaces awareness to the agent; it does not hard-block. Token budget defaults to 0 (unlimited) unless explicitly configured.

---

## Loop Detection (Error Scenario)

**Scenario:** Agent encounters the same error 3 times in succession.

**What happens:**
1. `loop_detector.sh` tracks `(session_id, error_signature)` tuples
2. After 3 identical error signatures: triggers loop detection
3. Returns alert directing agent to the recovery ladder (SO-06)
4. Successful tool calls decay error counts to prevent monotonic accumulation

**Agent sees:**
```
[Loop] LOOP WARNING: Error signature 'a1b2c3d4e5f67890' repeated 3 times. Consider recovery ladder (SO-06). Try a different approach.
```

**Governance value:** Prevents the agent from burning tokens retrying the same failing approach. Without this hook, agents commonly retry failed operations 10+ times before giving up.

---

## Context Health Check (Every 10th Call)

**Scenario:** On tool call 10, 20, 30, etc.

**What happens:**
1. `context_health_check.sh` fires (10s timeout)
2. Checks context utilization (>85% triggers warning)
3. Validates critical sections present: Identity, Authority, Constraints
4. If sections missing: warns agent to re-read AGENTS.md

**Governance value:** Catches context drift in long sessions. As conversations grow, critical governance context can be pushed out of the agent's active window. This hook detects that and alerts.

---

## Session Summary

At session end, `admiral/bin/session_summary` reads the event log and session state to produce:

```
=== Admiral Session Summary ===
Session: sess_001
Trace ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Duration: 45 minutes
Tool calls: 40
Tokens used: 20,000 (no budget set)
Hooks fired: 81 (40 PreToolUse + 40 PostToolUse + 1 SessionStart)
Alerts: 0
Loop detections: 0
Context health checks: 4 (calls 10, 20, 30, 40)
Standing Orders loaded: 16/16
```

---

## What This Proves

1. **Deterministic hook execution works.** Every tool call fires PreToolUse and PostToolUse hooks — every time, regardless of context pressure or agent confidence.
2. **Graduated warnings surface awareness.** Budget tracking at 90% and 100% gives agents signals to manage resources, while never creating deadlocks.
3. **Standing Orders are injected, not suggested.** All 16 SOs are system-level context from the first moment of the session. The agent doesn't choose to read them.
4. **Loop detection breaks error cycles.** Three identical errors trigger the recovery ladder before the agent wastes the entire budget.
5. **Context health catches drift.** Long sessions don't silently lose governance context.
6. **Multi-layered enforcement.** Scope guards, prohibitions, zero-trust validation, and compliance checks all fire independently — one failing hook cannot cascade into others.

**The thesis holds:** Deterministic enforcement beats advisory guidance. Hooks fire every time, regardless of context pressure, prompt injection attempts, or agent confidence.
