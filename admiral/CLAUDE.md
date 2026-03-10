# CLAUDE.md — Admiral Implementation (Claude Code Entry Point)

**Read `AGENTS.md` for full project instructions.** This file contains only Claude Code-specific configuration.

## Claude Code Specific

- **Package:** `admiral/` — Python package implementing the Admiral Framework spec
- **Tests:** `python -m pytest admiral/tests/ -v` from the repo root
- **Spec reference:** `aiStrat/` contains the authoritative specification
- **Hooks:** `admiral/hooks/` implements the enforcement spectrum (Section 08)
- **Standing Orders:** `admiral/protocols/standing_orders.py` — 15 non-negotiable rules (Section 36)

## Why Both Files Exist

Claude Code reads `CLAUDE.md` as its entry point. `AGENTS.md` is the canonical, model-agnostic instruction file per Section 07. When Claude Code adds native `AGENTS.md` support, this file reduces to tool-specific overrides only.
