# Admiral Framework — Quick Start Guide

**Goal:** One governed agent running with enforced hooks in under 2 hours.

**Profile:** Starter (F1/E1/B1/P1/CP1/S1/DE1)

**Prerequisites:** A project repository. Claude Code (or another AI coding tool). `jq` installed. `uuidgen` available (or Python 3 fallback).

---

## Step 1: Read Standing Orders (15 minutes)

Read `admiral/spec/part11-protocols.md` — **Standing Orders section only** (lines 15–178).

These 15 rules are the governance foundation. Every hook you write enforces one or more of these orders. Do not skip this step.

**Key orders for Starter:**
- SO 4 (Context Honesty) — agents must flag missing context
- SO 5 (Decision Authority) — four-tier authority model
- SO 6 (Recovery Protocol) — five-step recovery ladder
- SO 8 (Quality Standards) — never lower quality to meet a deadline
- SO 10 (Prohibitions) — hard constraints on agent behavior

---

## Step 2: Write AGENTS.md (20 minutes)

Create `AGENTS.md` in your project root. Keep it under 150 lines.

**Required sections:**

```markdown
# AGENTS.md

## Project Overview
[Project name]. [One sentence describing what it does].

## Tech Stack
- [Language] [exact version]
- [Framework] [exact version]
- [Database] [exact version]
- [Other dependencies with exact versions]

## Conventions
- [Naming conventions]
- [File structure conventions]
- [Git workflow]

## Standing Orders
This project follows the Admiral Framework Standing Orders.
All 15 Standing Orders are loaded into agent context at session start.
See: admiral/spec/part11-protocols.md

## Boundaries
- Do NOT modify files outside [scope]
- Do NOT add dependencies without approval
- Do NOT skip tests

## Decision Authority
| Decision | Tier |
|---|---|
| Code style, naming, internal refactors | Autonomous |
| New dependencies, schema changes | Propose |
| Scope changes, security decisions | Escalate |
```

If your tool doesn't read AGENTS.md natively (e.g., Claude Code as of March 2026), create a tool-specific pointer file:

```markdown
# CLAUDE.md
**Read `AGENTS.md` for full project instructions.**
```

---

## Step 3: Set Up Directory Structure (10 minutes)

Create the Admiral runtime directories:

```bash
# Hook adapters (translate Claude Code ↔ Admiral contracts)
mkdir -p .hooks

# Admiral runtime state (session state, event log)
mkdir -p .admiral

# Brain persistent memory (B1 file-based)
mkdir -p .brain/{your-project}
mkdir -p .brain/_global

# Admiral libraries and config
mkdir -p admiral/lib
mkdir -p admiral/standing-orders
mkdir -p admiral/bin
mkdir -p admiral/templates
```

Copy the session state template:

```bash
cat > .admiral/session_state.json.template << 'EOF'
{
  "session_id": "",
  "started_at": 0,
  "tokens_used": 0,
  "token_budget": 200000,
  "tool_call_count": 0,
  "hook_state": {
    "loop_detector": {
      "error_counts": {},
      "total_errors": 0
    },
    "self_healing": {
      "retry_counts": {},
      "total_retries": 0
    }
  },
  "context": {
    "standing_context_tokens": 0,
    "total_capacity": 200000,
    "current_utilization": 0.0,
    "standing_context_present": []
  }
}
EOF
```

Add to `.gitignore`:

```
# Admiral runtime state (regenerated each session)
.admiral/session_state.json
.admiral/event_log.jsonl
```

---

## Step 4: Deploy Hooks (30 minutes)

Admiral uses an **adapter pattern**: Claude Code fires lifecycle events → adapter scripts translate the payload → individual hook scripts enforce governance.

### 4a. Configure Claude Code hooks

Add to `.claude/settings.local.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash $CLAUDE_PROJECT_DIR/.hooks/session_start_adapter.sh",
            "timeout": 30
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash $CLAUDE_PROJECT_DIR/.hooks/pre_tool_use_adapter.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash $CLAUDE_PROJECT_DIR/.hooks/post_tool_use_adapter.sh",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

**Key details:**
- `matcher: ""` matches all tools (empty string = wildcard in Claude Code hooks)
- `$CLAUDE_PROJECT_DIR` resolves to your project root at runtime
- Adapters read JSON from stdin and output JSON to stdout

### 4b. Create the token budget gate

This is the simplest enforced hook — blocks tool invocations when budget is exhausted.

**`.hooks/token_budget_gate.sh`:**

```bash
#!/bin/bash
# Admiral Framework — Token Budget Gate (PreToolUse)
# Exit 0: budget available. Exit 2: budget exhausted (hard block).
set -euo pipefail

PAYLOAD=$(cat)
TOKENS_USED=$(echo "$PAYLOAD" | jq -r '.session_state.tokens_used // 0')
TOKEN_BUDGET=$(echo "$PAYLOAD" | jq -r '.session_state.token_budget // 200000')

if [ "$TOKENS_USED" -ge "$TOKEN_BUDGET" ]; then
  echo "Token budget exhausted: ${TOKENS_USED}/${TOKEN_BUDGET}. Session terminated." >&2
  exit 2
fi

exit 0
```

### 4c. Create the pre-tool adapter

The adapter loads session state, injects it into the payload, and fires the budget gate.

**`.hooks/pre_tool_use_adapter.sh`:**

```bash
#!/bin/bash
# Admiral Framework — PreToolUse Hook Adapter
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
source "$PROJECT_DIR/admiral/lib/state.sh"

PAYLOAD=$(cat)
STATE=$(load_state)

# Inject session state into payload, then fire budget gate
echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' \
  | "$SCRIPT_DIR/token_budget_gate.sh"
```

### 4d. Create the session start adapter

Resets session state and injects Standing Orders into agent context.

**`.hooks/session_start_adapter.sh`:**

```bash
#!/bin/bash
# Admiral Framework — SessionStart Hook Adapter
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
source "$PROJECT_DIR/admiral/lib/state.sh"
source "$PROJECT_DIR/admiral/lib/standing_orders.sh"

PAYLOAD=$(cat)
SESSION_ID=$(echo "$PAYLOAD" | jq -r '.session_id // "unknown"')

# Reset session state
init_session_state "$SESSION_ID"

# Generate trace ID
TRACE_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")
set_state_field '.trace_id' "\"$TRACE_ID\""

# Render Standing Orders for context injection
SO_TEXT=$(render_standing_orders)

# Output: inject Standing Orders as system message
jq -n --arg msg "$SO_TEXT" '{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": $msg
}'
```

**Exit codes for all hooks:** 0 = pass, 1 = soft fail (warning), 2 = hard block.

**Verify:** Start a Claude Code session. Check that:
1. Session start injects Standing Orders (visible in agent context)
2. PreToolUse fires on every tool call (budget gate checks threshold)
3. The hook blocks execution when budget is exhausted

---

## Step 5: Configure Decision Authority (15 minutes)

Add a Decision Authority table to your AGENTS.md (if not already done in Step 2). At the Starter profile, you are the Admiral — every Propose and Escalate decision comes to you.

**Starter-profile authority:**

| Decision Type | Tier | What Happens |
|---|---|---|
| Token budget enforcement | **Enforced** | Hook handles it (Step 4) |
| Code style, naming, test creation | **Autonomous** | Agent proceeds and logs |
| New dependencies, architecture changes | **Propose** | Agent drafts, you approve |
| Scope changes, security, budget overruns | **Escalate** | Agent stops, you decide |

---

## Step 6: Verify (20 minutes)

Run through this checklist:

- [ ] AGENTS.md exists, is under 150 lines, and includes Project Overview, Boundaries, and Decision Authority
- [ ] Standing Orders are referenced from AGENTS.md
- [ ] Standing Orders are injected into agent context at session start (check for system message)
- [ ] At least one hook fires deterministically on every qualifying event
- [ ] Decision Authority tiers are defined (even if minimal)
- [ ] The agent can complete a small task under governance (the hook fires, the agent works, the task completes)

**Test scenario:** Ask the agent to implement a small feature. Observe:
1. Does the hook fire? (Check `.admiral/event_log.jsonl` for entries)
2. Does the agent respect its Boundaries? (Check for out-of-scope changes)
3. Does the agent escalate when it should? (Give it an ambiguous requirement)

If all three pass, your Starter profile is operational.

---

## What You Read (4 files, ~800 lines)

| Order | File | What You Got From It |
|---|---|---|
| 1 | `part11-protocols.md` (Standing Orders only) | The 15 non-negotiable rules |
| 2 | This file (QUICKSTART.md) | The bootstrap sequence |
| 3 | `part3-enforcement.md` (Deterministic Enforcement only) | How hooks work |
| 4 | `part1-strategy.md` (scan) | Mission, Boundaries, Success Criteria patterns |

---

## What NOT to Build Yet

At the Starter profile, these are explicitly out of scope:

- Multiple agents or an Orchestrator (that's F2)
- Handoff protocols (there's no one to hand off to)
- Governance agents (that's F3)
- Database-backed Brain (that's B2+; B1 file-based memory is part of Starter)
- Escalation routing (you ARE the escalation target)
- Identity validation hooks (that's E2)

Build these when you hit the limits of the Starter profile. See `admiral/spec/index.md § Per-Component Scaling` for graduation criteria.

---

## Adding More E1 Hooks (Optional — Next Session)

Once the budget gate is working, add the remaining E1 hooks via the **PostToolUse adapter**. The adapter chains hooks in order:

1. **`token_budget_tracker.sh`** — estimates token cost per tool call, updates `tokens_used` in session state, warns at 80% utilization, escalates at 90%
2. **`loop_detector.sh`** — tracks `(agent_id, error_signature)` tuples. Triggers after 3 identical errors or 10 total errors.
3. **`context_health_check.sh`** — fires every 10th tool call. Checks utilization >85%, validates critical context sections (Identity/Authority/Constraints) are present.

See the homebase reference implementation in `.hooks/` for working examples of all E1 hooks.

---

## Config Time vs. Build Time

| Dimension | What It Means | Time Estimate |
|---|---|---|
| **Config time** | Writing AGENTS.md, setting up hooks in your existing tool | ~1–2 hours (this guide) |
| **Build time** | Implementing Admiral as code (hook engine, data models, test suites) | ~1–2 days for Starter profile |

This guide covers **config time**. If you are building a framework implementation, see Case Study 4 (Appendix D) for the build-time account.

---

## Next Steps

When the Starter profile feels limiting:

1. **Add more hooks** — Loop detection (`loop_detector`) and context health (`context_health_check`) are the next two E1 hooks. See `part3-enforcement.md § Reference Hook Implementations`.
2. **Add a second agent** — Graduate to F2 when you need specialization. Read `part4-fleet.md § Fleet Composition`.
3. **Add persistent memory** — B1 file-based Brain stores decisions across sessions. See `admiral/bin/brain_record` for the CLI tools.

Each step is independent. Advance the component that's limiting you, not all components at once.
