# AGENTS.md

This file provides guidance to any AI coding agent working with this repository. It is the canonical, model-agnostic instruction file for the Admiral Framework. Tool-specific entry points (e.g., `CLAUDE.md` for Claude Code) should reference this file and add only tool-specific configuration.

## Project Overview

aiStrat is the **Admiral Framework** — a comprehensive specification for AI agent fleet orchestration. The core deliverable is specification: design documents defining how autonomous AI agent systems should be structured, secured, coordinated, and governed. Early-stage implementation code exists in `control-plane/` (TypeScript control plane MVP) and `brain/schema/` (Postgres schema), with supporting scripts in `monitor/`. The fleet catalog (71 core + 34 extended agent definitions) represents high-quality specifications based on production patterns — not battle-tested implementations. As Admiral matures through real-world deployments, these will be validated and refined.

**Why this exists:** AI agents are not employees and they are not code. You cannot manage them with HR policies and you cannot validate them with traditional software tests. They are an entirely new category of resource — one that makes decisions, fails in novel ways, and forgets everything between sessions. Admiral is governance and operations designed from scratch for how agents actually behave. Model-agnostic, progressively adoptable, and built around the insight that deterministic enforcement always outperforms advisory instructions.

## Repository Structure

### Three Pillars

1. **Doctrine (admiral/)** — 12-part operational framework defining strategy, context engineering, enforcement, fleet composition, the Brain knowledge system, execution patterns, quality assurance, operations, platform integration, meta-agent governance, universal protocols, and the closed-loop data ecosystem. Cross-references use descriptive Part-based names (e.g., "Deterministic Enforcement (Part 3)") — no section numbers. Start with `admiral/spec/index.md`.
2. **Fleet (fleet/)** — Agent catalog with 71 core role definitions (plus 34 extended in `fleet/agents/extras/`), prompt assembly patterns, routing rules, interface contracts, model tier assignments, and context injection guides. Each agent is a self-contained specification — project-agnostic, independently deployable.
3. **Design Artifacts (brain/, monitor/)** — Architecture specifications for the Brain (semantic long-term memory) and Monitor (ecosystem intelligence with immune system). Includes database schema (SQL), shell scripts, and architectural diagrams — implementation-adjacent artifacts that define schemas and tooling, not application logic.

### Key Entry Points

| I need to... | Start here |
|---|---|
| Understand the full framework | `admiral/spec/index.md` |
| See every file at a glance | `MANIFEST.md` |
| See how agents are defined | `fleet/prompt-anatomy.md` |
| Understand the fleet catalog | `fleet/README.md` |
| Route a task to the right agent | `fleet/routing-rules.md` |
| Understand the Brain architecture | `admiral/spec/part5-brain.md` + `brain/README.md` |
| Understand the immune system | `monitor/README.md` |
| See the database schema | `brain/schema/001_initial.sql` |
| Know the universal agent rules | `admiral/spec/part11-protocols.md` |
| Understand the threat model | `admiral/spec/part3-enforcement.md` (Configuration Security) |
| Implement the framework | `admiral/reference/reference-constants.md` |
| Start adopting the framework | `admiral/spec/index.md` → Per-Component Scaling |
| Integrate with a platform | `admiral/spec/appendices.md` → Appendix E |

## Versioning

- **Current version: v0.8.3-alpha** (pre-release, not yet published)
- The framework uses [semantic versioning](https://semver.org/) with pre-release labels: `MAJOR.MINOR.PATCH[-label]`
- The **single source of truth** for the version is `aiStrat/VERSION`. This is a plain text file containing only the version string (e.g., `v0.4.0-alpha`).
- **Versions are bumped automatically** on merge to main via `.github/workflows/version-bump.yml`. The bump type is determined by commit messages using [Conventional Commits](https://www.conventionalcommits.org/):
  - `fix:`, `docs:`, `chore:`, `refactor:`, `ci:`, `style:`, `perf:`, `test:` → **patch** (e.g., v0.4.0 → v0.4.1)
  - `feat:` → **minor** (e.g., v0.4.0 → v0.5.0)
  - `BREAKING CHANGE:` in body or `!` after type (e.g., `feat!:`) → **major** (e.g., v0.4.0 → v1.0.0)
  - No conventional prefix → **patch** (default)
- The workflow also updates `admiral/spec/index.md` line 6 and creates a git tag.
- **Manual bumps** are not needed. If you must bump manually, update `aiStrat/VERSION` and `admiral/spec/index.md` line 6.
- Per-file version comments (`<!-- Admiral Framework vX.Y.Z -->`) are legacy and no longer enforced by CI. Do not add them to new files.
- **MANIFEST.md** is the semantic file catalog. Update it when files are added, removed, renamed, or when their content changes materially.

## Working With This Repository

- **Primarily markdown specification.** Early-stage TypeScript code exists in `control-plane/` (repo root) and reference sketches in `aiStrat/control-plane/`. Database schema lives in `brain/schema/`.
- **Edits should maintain internal consistency.** Cross-references between admiral/, fleet/, and design artifacts must stay aligned. Section numbers, agent names, and concept definitions must match across documents.
- **Security-first mindset.** This framework operates under zero-trust principles. Any addition must consider: What can go wrong? How is it enforced (not just documented)? What's the blast radius?
- **Precision over prose.** Prefer concrete templates, schemas, and decision trees over narrative descriptions. If something can be specified as a format, specify the format.

## Design Principles

- **Hooks over instructions** — Deterministic enforcement always outperforms advisory constraints
- **Zero-trust continuous verification** — Trust is never assumed, always earned, continuously re-evaluated
- **Defense in depth** — Multiple independent security layers, each sufficient to catch what others miss
- **Context is currency** — Agents are limited by context, not capability; context engineering is the primary lever
- **Progressive adoption** — Seven independently-scaling components with five Quick-Start Profiles from single-agent to enterprise; never demand all-or-nothing
- **Specification as product** — The spec IS the deliverable; implementations are downstream consumers of this spec
- **Tool-agnostic by default** — The framework targets AI agent capabilities, not specific vendors. Vendor-specific implementations are examples of general patterns, not the patterns themselves.
