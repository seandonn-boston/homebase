<!-- Admiral Framework v0.2.0-alpha -->
# CLAUDE.md

**Read `AGENTS.md` for full project instructions.** This file contains only Claude Code-specific configuration. All project overview, structure, versioning, conventions, and design principles live in `AGENTS.md` — the canonical, model-agnostic instruction file.

## Claude Code Specific

- **Configuration directory:** `.claude/` contains `settings.local.json` (hook permissions, allowed commands). All agent configuration changes require review.
- **Skills:** `.claude/skills/*.md` files load on-demand when file patterns or keywords match. Use for progressive disclosure of domain knowledge. *(Create this directory when adding skills.)*
- **Path-scoped rules:** `.claude/rules/*.md` apply only when working in matching directories. *(Create this directory when adding rules.)*
- **Agent definitions:** `.claude/agents/*.md` define per-agent identity, authority, and constraints. *(Create this directory when adding agent configs.)*
- **Hooks:** PreToolUse, PostToolUse, and other lifecycle hooks implement the enforcement spectrum (Section 08). Hooks are the deterministic enforcement layer — they fire every time regardless of context pressure. *(See `hooks/README.md` for hook specifications; create `.claude/hooks/` when implementing.)*
- **Subagents:** The Agent tool enables parallel work with coordination (Swarm Patterns, Section 20).

## Why Both Files Exist

Claude Code does not natively read `AGENTS.md` (as of March 2026). This `CLAUDE.md` file exists as the Claude Code entry point, pointing to `AGENTS.md` where the actual instructions live. When Claude Code adds native `AGENTS.md` support, this file can be reduced to tool-specific overrides only. See also: `admiral/part2-context.md` Section 07 (Configuration File Strategy) for the cross-tool portability pattern.
