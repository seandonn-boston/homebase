# End-to-End Session Log — Admiral Starter Profile

**Date:** 2026-03-15
**Profile:** Starter (F1/E1/B1/P1/CP1/S1/DE1)
**Purpose:** Demonstrates governance in action — hooks fire deterministically, budget enforcement works, Standing Orders are injected.

---

## Session Start

**Event:** Claude Code session begins. SessionStart hook fires.

**What happens:**
1. `session_start_adapter.sh` receives Claude Code `SessionStart` payload
2. Session state reset to template defaults (`tokens_used: 0`, `token_budget: 200000`)
3. Trace ID generated (UUID)
4. `context_baseline.sh` records initial context metrics
5. All 15 Standing Orders rendered and injected via `systemMessage`

**Event log entry:**
```json
{"event":"session_start","timestamp":"2026-03-15T14:00:00Z","trace_id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","session_id":"sess_001","model":"claude-opus-4-6","standing_orders_loaded":15}
```

**Standing Orders injected (excerpt):**
```
# Admiral Standing Orders (15 loaded)

SO 1 — Mission Primacy: The Admiral's Mission statement is the highest-priority instruction...
SO 2 — Scope Discipline: Do not expand task scope without explicit authorization...
...
SO 15 — Zero Amnesia Tolerance: Treat every piece of provided context as binding...
```

**Governance value:** Standing Orders are loaded deterministically — not advisory text the agent can ignore, but system-level context injected before the agent sees any user prompt.

---

## Normal Operation (Tool Calls 1-15)

**Event:** Agent works on a feature implementation. Each tool call fires PreToolUse (budget gate) and PostToolUse (tracker + loop detector).

**PreToolUse flow (every tool call):**
1. `pre_tool_use_adapter.sh` loads session state
2. Injects state into payload
3. Fires `token_budget_gate.sh`
4. Budget gate checks `tokens_used < token_budget` → exit 0 (allow)

**PostToolUse flow (every tool call):**
1. `post_tool_use_adapter.sh` receives payload
2. Fires `token_budget_tracker.sh` → estimates tokens for tool type, updates `tokens_used`
3. Fires `loop_detector.sh` → checks for repeated error signatures
4. Every 10th call: fires `context_health_check.sh`

**Token estimates per tool type:**
| Tool | Estimated Tokens |
|---|---|
| Read | 1,000 |
| Grep | 500 |
| Glob | 200 |
| Edit | 1,500 |
| Write | 2,000 |
| Bash | 1,000 |
| Agent | 5,000 |
| Other | 500 |

**Sample event log after 15 tool calls:**
```json
{"event":"post_tool_use","timestamp":"2026-03-15T14:05:12Z","trace_id":"a1b2c3d4...","tool":"Read","tool_call_count":1,"tokens_used":1000}
{"event":"post_tool_use","timestamp":"2026-03-15T14:05:18Z","trace_id":"a1b2c3d4...","tool":"Edit","tool_call_count":2,"tokens_used":2500}
{"event":"post_tool_use","timestamp":"2026-03-15T14:05:25Z","trace_id":"a1b2c3d4...","tool":"Bash","tool_call_count":3,"tokens_used":3500}
```

---

## Budget Warning at 80% (Tool Call ~32)

**Event:** `tokens_used` reaches 160,000 (80% of 200,000 budget).

**What happens:**
1. `token_budget_tracker.sh` detects utilization >= 80%
2. Returns alert: `"Budget warning: 80% utilized (160000/200000)"`
3. PostToolUse adapter injects system message to agent

**Agent sees:**
```
[Budget] Budget warning: 80% utilized (160000/200000). Consider wrapping up current task.
```

**Governance value:** The agent is warned before budget exhaustion, giving it a chance to complete work gracefully rather than being hard-blocked mid-task.

---

## Budget Escalation at 90% (Tool Call ~36)

**Event:** `tokens_used` reaches 180,000 (90% of 200,000 budget).

**What happens:**
1. `token_budget_tracker.sh` detects utilization >= 90%
2. Returns alert: `"Budget critical: 90% utilized (180000/200000). Wrap up immediately."`
3. PostToolUse adapter injects system message

**Agent sees:**
```
[Budget] Budget critical: 90% utilized (180000/200000). Wrap up immediately.
```

---

## Budget Hard Block at 100% (Tool Call ~40)

**Event:** `tokens_used` reaches 200,000 (100% of budget). Agent attempts another tool call.

**What happens:**
1. `pre_tool_use_adapter.sh` fires before the tool executes
2. `token_budget_gate.sh` checks: `200000 >= 200000` → true
3. Outputs to stderr: `"Token budget exhausted: 200000/200000. Session terminated."`
4. Exits with code 2 (hard block)
5. Claude Code **blocks the tool invocation** — it never executes

**This is deterministic enforcement.** The agent cannot spend tokens it doesn't have, regardless of how persuasive or urgent its reasoning might be. An advisory instruction ("try to stay within budget") would be ignored under pressure. The hook cannot be ignored.

---

## Loop Detection (Error Scenario)

**Scenario:** Agent encounters the same error 3 times in succession.

**What happens:**
1. `loop_detector.sh` tracks `(agent_id, error_signature)` tuples
2. After 3 identical error signatures: triggers loop detection
3. Returns alert directing agent to the 5-step recovery ladder (SO 6)

**Agent sees:**
```
[Loop] Repeated error detected (3x): "ENOENT: no such file". Engage recovery ladder: 1) Re-read requirements, 2) Check assumptions, 3) Try alternative approach, 4) Reduce scope, 5) Escalate.
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
Tokens used: 200,000 / 200,000 (100%)
Hooks fired: 81 (40 PreToolUse + 40 PostToolUse + 1 SessionStart)
Alerts: 2 (1 budget warning, 1 budget critical)
Loop detections: 0
Context health checks: 4 (calls 10, 20, 30, 40)
Standing Orders loaded: 15/15
```

---

## What This Proves

1. **Deterministic enforcement works.** The budget gate blocked at exactly 100% — not approximately, not "when the agent felt like it." Exit code 2 = hard block, every time.
2. **Graduated warnings give agents time.** 80% warning → 90% escalation → 100% block. The agent can plan its exit rather than being surprised.
3. **Standing Orders are injected, not suggested.** All 15 SOs are system-level context from the first moment of the session. The agent doesn't choose to read them.
4. **Loop detection breaks error cycles.** Three identical errors trigger the recovery ladder before the agent wastes the entire budget.
5. **Context health catches drift.** Long sessions don't silently lose governance context.

**The thesis holds:** Deterministic enforcement beats advisory guidance. Hooks fire every time, regardless of context pressure, prompt injection attempts, or agent confidence.
