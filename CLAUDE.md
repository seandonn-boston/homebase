# CLAUDE.md

**Read `AGENTS.md` for full project instructions.** This file contains only Claude Code-specific configuration.

## Claude Code Specific

- **Configuration directory:** `.claude/` contains `settings.local.json`
- **Hooks:** `.hooks/` contains executable hook scripts. Adapters translate between Claude Code hook payloads and Admiral hook contracts.
- **Agent definitions:** See `AGENTS.md` for identity, authority, and constraints.
- **Standing Orders:** Loaded at session start via `session_start_adapter.sh`. Source data in `admiral/standing-orders/`.

## Why Both Files Exist

Claude Code does not natively read `AGENTS.md`. This file is the Claude Code entry point. When Claude Code adds native AGENTS.md support, this file can be reduced to tool-specific overrides only.
