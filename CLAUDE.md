# CLAUDE.md

**Read `AGENTS.md` for full project instructions.** This file contains only Claude Code-specific configuration.

## Claude Code Specific

- **Configuration directory:** `.claude/` contains `agents/` and `commands/`
- **Commands:** `.claude/commands/` contains reusable slash command prompts.
- **Primary TODO executor command:** `/next-todo` (defined in `.claude/commands/next-todo.md`) executes the next item from `plan/todo/` using phase/task/subtask branching, DoD, test/lint/CI, and Admiral escalation rules.
- **Phase completion command:** `/phase-closeout` (defined in `.claude/commands/phase-closeout.md`) executes end-of-phase whole-set validation, spellcheck/lint/security hardening, CI verification, and merge-readiness checks before merging to `main`.
- **Hooks:** `.hooks/` contains executable hook scripts. Adapters translate between Claude Code hook payloads and Admiral hook contracts.
- **Agent definitions:** See `AGENTS.md` for identity, authority, and constraints.
- **Standing Orders:** Loaded at session start via `session_start_adapter.sh`. Source data in `admiral/standing-orders/`.

## Why Both Files Exist

Claude Code does not natively read `AGENTS.md`. This file is the Claude Code entry point. When Claude Code adds native AGENTS.md support, this file can be reduced to tool-specific overrides only.

## Session Quick Start

When starting a new session, orient with:

1. **What to work on:** [`plan/index.md`](plan/index.md) — current scores and all 34 streams
2. **Execution order:** [`plan/ROADMAP.md`](plan/ROADMAP.md) — 9-phase dependency map
3. **Current phase:** Phase 0 — Strategy Foundation & Spec Debt Resolution
4. **Boundaries:** See `AGENTS.md` § Boundaries before making changes
