# AGENTS.md

This file governs AI agents working on the homebase repository — the Admiral Framework implementation. For the framework specification itself, see `aiStrat/AGENTS.md`.

## Project Overview

Homebase is the implementation repository for the **Admiral Framework** — an AI agent fleet governance system. It contains both the framework specification (`aiStrat/`) and the runtime implementation (`admiral/`, `control-plane/`, `.hooks/`, `.brain/`). The core thesis: deterministic enforcement beats advisory guidance.

## Tech Stack

- **Runtime hooks:** Bash (POSIX-compatible), requires `jq` for JSON processing
- **Control plane:** TypeScript 5.x, Node.js 18+
- **Brain B1:** JSON files on filesystem, git-tracked
- **Build:** `tsc` (TypeScript compiler), no bundler
- **CI:** GitHub Actions
- **Shell utilities:** `uuidgen`, `sha256sum`, `date` (GNU coreutils)

## Conventions

- Hook scripts: executable, `#!/bin/bash`, POSIX-compatible where possible
- Hook names: `snake_case` matching `^[a-z][a-z0-9_]*$`
- Brain entries: `{YYYYMMDD-HHmmss}-{category}-{slug}.json`
- Commit messages: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.)
- File structure: implementation in `admiral/`, `control-plane/`, `.hooks/`; specs in `aiStrat/`
- All JSON must be valid and parseable by `jq`
- Hook exit codes: 0=pass, 1=soft-fail, 2=hard-block

## Standing Orders

This project follows the Admiral Framework Standing Orders (all 15).
Standing Orders are loaded into agent context at session start via the `session_start_adapter.sh` hook.
Source data: `admiral/standing-orders/`
Spec reference: `aiStrat/admiral/spec/part11-protocols.md`

## Boundaries

- Do NOT modify spec files in `aiStrat/` without explicit approval
- Do NOT add runtime dependencies to control-plane (zero-dependency policy)
- Do NOT store secrets, credentials, or PII in any file
- Do NOT modify `.github/workflows/` without approval
- Do NOT skip tests or disable linters to make code pass
- Do NOT commit `.admiral/session_state.json` (runtime ephemeral state)

## Decision Authority

| Decision | Tier | Rationale |
|---|---|---|
| Hook exit codes, token budget enforcement | **Enforced** | Hooks handle deterministically |
| Variable naming, file naming, internal refactors, test creation | **Autonomous** | Low-risk, reversible |
| Code style within hooks, comment wording | **Autonomous** | Convention-following |
| New shell dependencies (beyond jq, coreutils) | **Propose** | Portability impact |
| Hook timeout values, budget thresholds | **Propose** | Operational impact |
| Architecture changes, new directories | **Propose** | Structural impact |
| Schema changes to session state or brain entries | **Propose** | Interface contract |
| Spec modifications in `aiStrat/` | **Escalate** | Spec is frozen |
| Security-related decisions | **Escalate** | Always requires human review |
| Scope changes to PLAN.md milestones | **Escalate** | Strategic decisions |
| Changes to Standing Orders text | **Escalate** | Governance foundation |

## Ground Truth

- Session state schema: `aiStrat/admiral/reference/reference-constants.md`
- Hook contracts: `aiStrat/admiral/spec/part3-enforcement.md`
- Brain entry format: `aiStrat/brain/level1-spec.md`
- Standing Orders text: `aiStrat/admiral/spec/part11-protocols.md`
