<!-- Admiral Framework v0.3.0-alpha -->
# AGENTS.md

This file provides guidance to any AI coding agent working with this repository. It is the canonical, model-agnostic instruction file for the Admiral Framework. Tool-specific entry points (e.g., `CLAUDE.md` for Claude Code) should reference this file and add only tool-specific configuration.

## Project Overview

aiStrat is the **Admiral Framework** — a comprehensive specification for AI agent fleet orchestration. It is a pure specification project: no executable code, no runtime dependencies. Every artifact is a design document defining how autonomous AI agent systems should be structured, secured, coordinated, and governed.

**Why this exists:** AI agents are not employees and they are not code. You cannot manage them with HR policies and you cannot validate them with traditional software tests. They are an entirely new category of resource — one that makes decisions, fails in novel ways, and forgets everything between sessions. Admiral is governance and operations designed from scratch for how agents actually behave. Model-agnostic, progressively adoptable, and built around the insight that deterministic enforcement always outperforms advisory instructions.

## Repository Structure

### Three Pillars

1. **Doctrine (admiral/)** — 11-part operational framework defining strategy, context engineering, enforcement, fleet composition, the Brain knowledge system, execution patterns, quality assurance, operations, platform integration, meta-agent governance, and universal protocols. Start with `admiral/index.md`.
2. **Fleet (fleet/)** — Agent catalog with 71 core role definitions (plus 29 extended in `fleet/agents/extras/`), prompt assembly patterns, routing rules, interface contracts, model tier assignments, and context injection guides. Each agent is a self-contained specification — project-agnostic, independently deployable.
3. **Design Artifacts (brain/, monitor/)** — Architecture specifications for the Brain (semantic long-term memory) and Monitor (ecosystem intelligence with immune system). Includes database schema and architectural diagrams, not code.

### Key Entry Points

| I need to... | Start here |
|---|---|
| Understand the full framework | `admiral/index.md` |
| See every file at a glance | `MANIFEST.md` |
| See how agents are defined | `fleet/prompt-anatomy.md` |
| Understand the fleet catalog | `fleet/README.md` |
| Route a task to the right agent | `fleet/routing-rules.md` |
| Understand the Brain architecture | `admiral/part5-brain.md` + `brain/README.md` |
| Understand the immune system | `monitor/README.md` |
| See the database schema | `brain/schema/001_initial.sql` |
| Know the universal agent rules | `admiral/part11-protocols.md` |
| Understand the threat model | `admiral/part3-enforcement.md` (Section 10) |
| Implement the framework | `admiral/reference-constants.md` |
| Start adopting the framework | `admiral/index.md` → Adoption Levels |
| Integrate with a platform | `admiral/appendices.md` → Appendix E |

## Versioning

- **Current version: v0.3.0-alpha** (pre-release, not yet published)
- The framework uses [semantic versioning](https://semver.org/) with pre-release labels: `MAJOR.MINOR.PATCH[-label]`
- The authoritative version string lives in `admiral/index.md` (line 6). All other version references must match it.
- **Version appears in 3 locations:** `admiral/index.md` (line 6, display version), `admiral/appendices.md` (Appendix F footer), and as an HTML comment `<!-- Admiral Framework vX.Y.Z-label -->` on line 1 of every `.md` file within `aiStrat/` (or SQL comment `-- Admiral Framework vX.Y.Z-label` on line 1 of every `.sql` file).
- **Version scope:** Version comments apply only to files within `aiStrat/`. Strategy documents (`research/`, `thesis/`) and sales materials at the repository root are not spec artifacts and are excluded from version stamping.
- **MANIFEST.md** is the semantic file catalog. Update it when files are added, removed, renamed, or when their content changes materially (new sections, restructured scope, changed agent counts). It should also be updated on version bumps.
- When bumping versions, update all markers: `grep -rn "v0\.[0-9]" aiStrat/ --include="*.md" --include="*.sql"` should show only the current version.

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
- **Tool-agnostic by default** — The framework targets AI agent capabilities, not specific vendors. Vendor-specific implementations are examples of general patterns, not the patterns themselves.
