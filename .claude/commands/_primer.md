# Command Primer

Operational definitions and concepts for executing `/next-todo`, `/phase-closeout`, `/repeat`, `/spawn-worker`, and any future commands in this system. This document bridges the abstract Admiral Framework spec (`aiStrat/`) with concrete command execution.

**When to read this:** If you're executing a command and a term is unclear, check here first. If it's not here, check `aiStrat/admiral/spec/` — but most of what you need should be grounded below.

---

## The System You're Operating In

### Admiral Framework

A governance system for AI agent fleets. The spec lives in `aiStrat/` (read-only). The implementation lives in `admiral/`, `control-plane/`, `.hooks/`, `.brain/`. The core thesis: **deterministic enforcement beats advisory guidance** — hooks that block dangerous actions fire every time, unlike instructions that degrade under context pressure.

### You Are Layer 3

Your context loads in three layers (see `aiStrat/fleet/context-injection.md`):

| Layer | What | Already loaded? |
|---|---|---|
| **1. Fleet** | Standing Orders, protocols, agent identity | Yes — via `session_start_adapter.sh` |
| **2. Project** | AGENTS.md, CLAUDE.md, boundaries, tech stack | Yes — via Claude Code |
| **3. Task** | The specific command you're executing | Yes — the command file |

**Implication:** Commands should not duplicate Layer 1 or Layer 2 content. Standing Orders, the Recovery Ladder, escalation format, Decision Authority tiers — you already have these. Commands add only what's unique to the task.

### Prompt Anatomy

Every agent's context follows: **Identity → Authority → Constraints → Knowledge → Task** (see `aiStrat/fleet/prompt-anatomy.md`). Commands are the **Task** section. Everything above is already established. The command tells you what to do — not who you are, what you're allowed to decide, or what you must never do.

---

## Who's Who

### Admiral

The human operator. In this project, that's the person who issued the command. The Admiral:
- Is the only entity that may merge slush branches to `main`.
- Receives all escalation reports.
- Grants or withdraws trust per category over time.
- May themselves be assisted by AI (meta-agent Admiral), but a human holds ultimate authority over scope, budget, and configuration changes.

When a command says "escalate to the Admiral" — it means stop work on the blocked item, produce a structured report (what's blocked, what you tried, what you need), and present it to the human.

### Orchestrator

The coordination agent that decomposes goals into tasks and routes them to specialists. In the current project, **you are acting as your own Orchestrator** — there's no separate orchestrator agent. You decompose, you route to yourself, you execute. The commands formalize what a dedicated Orchestrator would enforce: branch policy, PR flow, quality gates.

### Enforcement Hooks

Bash scripts in `.hooks/` that fire automatically at lifecycle events (session start, before tool use, after tool use). They are not optional. They are not advisory. If a hook blocks you, it's because a policy was violated — investigate, don't override.

Key hooks you'll encounter:
- **`scope_boundary_guard.sh`** — blocks writes to `aiStrat/`, `.github/workflows/`, `.claude/settings`.
- **`prohibitions_enforcer.sh`** — blocks dangerous commands (`rm -rf`, `--no-verify`, `--force`), secret patterns.
- **`token_budget_tracker.sh`** — warns at 80%, 90%, 100% budget utilization. Advisory, never blocks.
- **`loop_detector.sh`** — warns when you're repeating the same error. Advisory.

If a hook blocks you and you believe the block is wrong: escalate. Do not try to work around it.

### Brain

The project's persistent memory system. Currently at B1 (JSON files in `.brain/`, git-tracked, keyword search via grep). The Brain remembers decisions, failures, and lessons across sessions. Before making Propose-tier or Escalate-tier decisions, query the Brain for precedent. The `brain_context_router` hook will remind you if you forget.

---

## How Work Is Structured

### Work Hierarchy

| Level | Scope | Git artifact | PR? | Approval |
|---|---|---|---|---|
| **Phase** | Large body of work, multiple sessions | `slush/phase-<NN>-<slug>` branch | slush→main PR | Admiral only |
| **Task** | One meaningful chunk | `task/phase-<NN>/<task-id>-<slug>` branch | task→slush PR | Self-merge |
| **Subtask** | One commit-sized unit | Commit on task branch | No PR | Autonomous |

Phases are planned in `plan/ROADMAP.md`. Tasks are tracked in `plan/todo/*.md`. The hierarchy exists to keep work decomposed into manageable chunks — no single task should consume more than 40% of your context budget.

### Slush Branch

The integration branch for a phase. Named `slush/phase-<NN>-<slug>`. All task branches merge into slush. Slush merges into `main` only with Admiral approval after `/phase-closeout`. The name "slush" reflects that it's a working area — not clean enough for main, but structured enough to integrate.

### Source of Truth

- **What to build:** `plan/todo/*.md`
- **Build order:** `plan/ROADMAP.md`
- **Current scores:** `plan/index.md`
- **Spec (read-only):** `aiStrat/`
- **Implementation:** `admiral/`, `control-plane/`, `.hooks/`, `.brain/`
- **Session state (ephemeral):** `.admiral/session_state.json` — never commit this.

---

## How Decisions Work

### Decision Authority Tiers

| Tier | What you do | Example |
|---|---|---|
| **Enforced** | Hooks handle it. You don't decide. | Scope boundaries, secret detection |
| **Autonomous** | Do it and log the decision. | Variable naming, test creation, lint fixes |
| **Propose** | Draft the decision with rationale, present alternatives, wait for approval. | Architecture changes, schema changes, new dependencies |
| **Escalate** | Stop and flag immediately. | Scope changes, budget overruns, security concerns, contradictions |

When in doubt between tiers, choose the more conservative one.

### Recovery Ladder

When something goes wrong, follow this in order. No skipping steps. No looping at any step:

1. **Retry with variation** — genuinely different approach, not the same thing again. 2-3 attempts max.
2. **Fallback** — simpler approach that still satisfies requirements.
3. **Backtrack** — roll back to last checkpoint, try a fundamentally different path.
4. **Isolate and skip** — mark as blocked, document, move to next task.
5. **Escalate** — structured report to the Admiral.

### Escalation

Not failure — it's routing a decision to the entity with authority. The format:

```
ESCALATION REPORT
=================
AGENT: [Your role]
TASK: [What you were working on]
SEVERITY: [Critical | High | Medium]
BLOCKER: [One sentence]
CONTEXT: [What you were trying to accomplish]
APPROACHES ATTEMPTED: [What you tried at each Recovery Ladder step]
ROOT CAUSE ASSESSMENT: [Why the blocker exists]
WHAT'S NEEDED: [Specific action or decision required]
IMPACT: [What's blocked if unresolved]
RECOMMENDATION: [Your proposed resolution]
```

---

## How Quality Works

### Quality > Completeness

Incomplete excellent work beats complete mediocre work. If budget pressure forces a choice, reduce scope and maintain quality — then report the reduced scope. Three endpoints with full error handling and tests are worth more than five where the last two are untested and brittle.

### Self-Healing Loops

The enforcement hooks create automatic quality cycles: you write code → hooks check it (lint, types, tests) → failures are fed back to you → you fix → hooks re-check. This happens automatically. Your job is to fix what the hooks surface, not to disable the hooks.

### Completion Bias

The most common agent failure mode. The tendency to declare "done" prematurely — to say "yes" to all quality checks, to rubber-stamp your own assessments, to rush the last 30% when context is running low. Defenses:

- Honest self-assessment (Standing Order 4: Context Honesty).
- Evidence over assertion — show it working, don't just claim it works.
- If you find yourself saying "yes" to everything, slow down. Perfect scores are a red flag.

---

## How These Commands Relate

```
/next-todo          Execute one task from plan/todo/
    ↓ (repeat)
/simplify           Review for reuse, quality, efficiency
    ↓
/phase-closeout     Verify, harden, prepare phase for merge
    ↓
Admiral reviews     Human approves slush→main merge
    ↓
/repeat             Orchestrates the cycle across phases

/spawn-worker       Create a parallel worktree for concurrent execution
```

- `/next-todo` is the workhorse — it finds work, creates branches, executes tasks, merges PRs.
- `/phase-closeout` is the quality gate — it proves the phase is genuinely complete before the Admiral sees it.
- `/repeat` is the orchestrator — it chains commands into an event-driven loop across multiple phases.
- `/simplify` is the reviewer — it catches over-engineering, duplication, and quality issues.
- `/loop` is the timer — for recurring checks on an interval. Not for task execution.
- `/spawn-worker` is the parallelizer — it creates git worktrees so multiple Claude Code instances can work on different tasks simultaneously.

Each command trusts the others' contracts. `/repeat` doesn't re-verify what `/phase-closeout` already checked. `/phase-closeout` doesn't re-execute what `/next-todo` already built. The Output Contract from each command is the interface.

### Parallel Execution via Worktrees

Multiple Claude Code instances can work on different tasks simultaneously using git worktrees. Each worktree is a separate checkout of the same repository — same `.git` database, different branch.

**Coordination mechanism:** Branch existence is the task lock. When `/next-todo` creates `task/phase-07/sec-01-attack-corpus`, that branch is globally visible. Any other worker's `/next-todo` sees it and skips that task. No external coordination layer needed.

**The pattern:**

1. **Admiral** runs `/spawn-worker` (or `admiral/bin/spawn-worktree` directly) to create a worktree at `../helm-wt-<N>/`.
2. VS Code opens in the new worktree.
3. Each instance runs `/next-todo` or `/repeat` independently.
4. All task branches merge into the same slush branch — git handles ordering.
5. When done, `admiral/bin/spawn-worktree --remove ../helm-wt-<N>` cleans up.

**Constraints:**
- Git prevents the same branch from being checked out in two worktrees.
- Merge conflicts are resolved by the second merger, per standard `/next-todo` policy.
- Each worker consumes API tokens independently — diminishing returns beyond 3-4 parallel workers.
- `/phase-closeout` runs once, after all workers finish, from any worktree (or the main repo).

---

## Key Principles to Internalize

1. **You already have the rules.** Standing Orders are loaded. Hooks are active. Commands add task-specific instructions, not framework reminders.
2. **Git state is your memory.** Branches, commits, PRs, and TODO files survive session boundaries. Conversation history doesn't. When resuming, trust git over recall.
3. **Entry and exit states matter.** Every command defines what must be true before it starts and what must be true when it finishes. If the entry state isn't met, don't start. If the exit state isn't met, you're not done.
4. **Escalation is not failure.** It's the mechanism for routing decisions to the right authority. Suppressing escalation is the actual failure.
5. **Context is finite.** Every line you load competes with working space. The spec says reserve 30-40% for reasoning. Don't load what you don't need.
6. **Honest evaluation requires effort.** Saying "yes, this is complete" is easy. Proving it is hard. The hard version is always the right one.
