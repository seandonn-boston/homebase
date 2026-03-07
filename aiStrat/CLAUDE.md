# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

aiStrat is the **Admiral Framework** — a comprehensive specification for AI agent fleet orchestration. It is a pure specification project: no executable code, no runtime dependencies. Every artifact is a design document defining how autonomous AI agent systems should be structured, secured, coordinated, and governed.

## Repository Structure

### Three Pillars

1. **Doctrine (admiral/)** — 11-part operational framework defining strategy, context engineering, enforcement, fleet composition, the Brain knowledge system, execution patterns, quality assurance, operations, platform integration, meta-agent governance, and universal protocols. Start with `admiral/index.md`.
2. **Fleet (fleet/)** — Agent catalog with 71 core role definitions (plus 29 extended in `fleet/agents/extras/`), prompt assembly patterns, routing rules, interface contracts, model tier assignments, and context injection guides. Each agent is a self-contained specification — project-agnostic, independently deployable.
3. **Design Artifacts (brain/, monitor/)** — Architecture specifications for the Brain (semantic long-term memory) and Monitor (ecosystem intelligence with immune system). Includes database schema and architectural diagrams, not code.

### Key Entry Points

| I need to... | Start here |
|---|---|
| Understand the full framework | `admiral/index.md` |
| See how agents are defined | `fleet/prompt-anatomy.md` |
| Understand the fleet catalog | `fleet/README.md` |
| Route a task to the right agent | `fleet/routing-rules.md` |
| Understand the Brain architecture | `admiral/part5-brain.md` + `brain/README.md` |
| Understand the immune system | `monitor/README.md` |
| See the database schema | `brain/schema/001_initial.sql` |
| Know the universal agent rules | `admiral/part11-protocols.md` |
| Understand the threat model | `admiral/part3-enforcement.md` (Section 10) |
| Start adopting the framework | `admiral/index.md` → Adoption Levels |
| Integrate with a platform | `admiral/appendices.md` → Appendix E |

## Versioning

- **Current version: v0.1.0-alpha** (pre-release, not yet published)
- The framework uses [semantic versioning](https://semver.org/) with pre-release labels: `MAJOR.MINOR.PATCH[-label]`
- The authoritative version string lives in `admiral/index.md` (line 5). All other version references must match it.
- **Version appears in exactly 2 places in source files:** `admiral/index.md` and `admiral/appendices.md` (Appendix F — Version Policy). Do not add version labels to other files.
- Review artifacts (`REVIEW.md`, `RESOLUTION-PLAN.md`) reference the version they reviewed. Keep these in sync when the version bumps.
- When making changes, verify no stale version strings exist: `grep -r "v[0-9]\+\.[0-9]" aiStrat/ --include="*.md"` should show only the current version.

## Working With This Repository

- **All content is markdown specification.** There is no code to run, test, or lint.
- **Edits should maintain internal consistency.** Cross-references between admiral/, fleet/, and design artifacts must stay aligned. Section numbers, agent names, and concept definitions must match across documents.
- **Security-first mindset.** This framework operates under zero-trust principles. Any addition must consider: What can go wrong? How is it enforced (not just documented)? What's the blast radius?
- **Precision over prose.** Prefer concrete templates, schemas, and decision trees over narrative descriptions. If something can be specified as a format, specify the format.

## Design Principles

- **Hooks over instructions** — Deterministic enforcement always outperforms advisory constraints
- **Zero-trust continuous verification** — Trust is never assumed, always earned, continuously re-evaluated
- **Defense in depth** — Multiple independent security layers, each sufficient to catch what others miss
- **Context is currency** — Agents are limited by context, not capability; context engineering is the primary lever
- **Progressive adoption** — Four adoption levels from single-agent to full fleet; never demand all-or-nothing
- **Specification as product** — The spec IS the deliverable; implementations are downstream consumers of this spec
