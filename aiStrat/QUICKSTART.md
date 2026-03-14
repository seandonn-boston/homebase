# Admiral Framework — Quick Start Guide

**Goal:** One governed agent running with one enforced hook in under 2 hours.

**Profile:** Starter (F1/E1/B1/P1/CP1/S1/DE1)

**Prerequisites:** A project repository. An AI coding tool (Claude Code, Cursor, Copilot, or similar).

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

## Step 3: Set Up One Hook (30 minutes)

Deploy **one** enforced hook. The token budget gate is the simplest starting point.

**What the hook does:** Blocks tool invocations when the session token budget is exhausted.

**For Claude Code**, add to `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": ["bash .hooks/token_budget_gate.sh"]
      }
    ]
  }
}
```

**Minimal hook implementation** (`.hooks/token_budget_gate.sh`):

```bash
#!/bin/bash
# Token budget gate — blocks actions when budget exhausted
# Exit 0 = allow, Exit 2 = block

# Read session state
STATE_FILE=".admiral/session_state.json"

if [ ! -f "$STATE_FILE" ]; then
  echo '{"tokens_used": 0, "token_budget": 200000}' > "$STATE_FILE"
  exit 0
fi

USED=$(jq -r '.tokens_used' "$STATE_FILE")
BUDGET=$(jq -r '.token_budget' "$STATE_FILE")

if [ "$USED" -ge "$BUDGET" ]; then
  echo "Token budget exhausted: $USED/$BUDGET. Session terminated." >&2
  exit 2
fi

exit 0
```

**Note:** This hook checks a budget threshold but does not track token usage itself. In production, pair it with a `PostToolUse` tracker hook that updates `tokens_used` after each tool call. For now, this hook validates the *pattern* — the hook fires, reads state, and can block execution.

**Verify:** Run the agent. Confirm the hook fires on every tool invocation. If it doesn't fire, the hook path or configuration is wrong — fix before proceeding.

---

## Step 4: Configure Decision Authority (15 minutes)

Add a Decision Authority table to your AGENTS.md (if not already done in Step 2). At the Starter profile, you are the Admiral — every Propose and Escalate decision comes to you.

**Starter-profile authority:**

| Decision Type | Tier | What Happens |
|---|---|---|
| Token budget enforcement | **Enforced** | Hook handles it (Step 3) |
| Code style, naming, test creation | **Autonomous** | Agent proceeds and logs |
| New dependencies, architecture changes | **Propose** | Agent drafts, you approve |
| Scope changes, security, budget overruns | **Escalate** | Agent stops, you decide |

---

## Step 5: Verify (20 minutes)

Run through this checklist:

- [ ] AGENTS.md exists, is under 150 lines, and includes Project Overview, Boundaries, and Decision Authority
- [ ] Standing Orders are referenced from AGENTS.md
- [ ] At least one hook fires deterministically on every qualifying event
- [ ] Decision Authority tiers are defined (even if minimal)
- [ ] The agent can complete a small task under governance (the hook fires, the agent works, the task completes)

**Test scenario:** Ask the agent to implement a small feature. Observe:
1. Does the hook fire? (Check hook logs)
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
3. **Add persistent memory** — Graduate to B1 when you want decisions to persist across sessions. Read `part5-brain.md § Start Simple`.

Each step is independent. Advance the component that's limiting you, not all components at once.
