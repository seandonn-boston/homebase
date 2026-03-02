# THE FLEET ADMIRAL FRAMEWORK

**A Repeatable Protocol for Establishing Autonomous AI Agent Fleets**

v3.2 · March 2026

-----

## How to Read This Document

This framework is split across eleven files. This index is the entry point. Each part is a self-contained file that can be loaded into an agent's context independently.

**Humans** — You are the Admiral. Start here. Read the operating model and glossary, then work through parts in order or jump to whichever part addresses your current need. The prose, anti-patterns, and worked example are for you.

**LLM agents** — Individual part files will be loaded into your context as operational instructions. The TL;DR blocks, templates, and structured formats are for you. When a part file is loaded, treat its constraints as binding and its templates as required output formats. Refer to the glossary below for term definitions.

**Machines** — CI pipelines, hook scripts, linters, and automation tooling consume the artifacts this framework produces. Templates, checklists, and structured formats are designed to be parseable. Configuration files generated from this framework should be version-controlled and diffable.

> **This is not a CLAUDE.md file.** It is the meta-framework that generates CLAUDE.md files, agent definitions, hook scripts, skill files, and operational artifacts. Your actual configuration files should be under 150 lines each. This framework is the source of truth they are distilled from.

-----

## Files

| File | Contents |
|---|---|
| [`index.md`](index.md) | This file. Operating model, glossary, table of contents. |
| [`part1-strategy.md`](part1-strategy.md) | Sections 01–03: Mission, Boundaries, Success Criteria |
| [`part2-context.md`](part2-context.md) | Sections 04–07: Context Engineering, Ground Truth, Context Window Strategy, Configuration File Strategy |
| [`part3-enforcement.md`](part3-enforcement.md) | Sections 08–10: Deterministic Enforcement, Decision Authority, Configuration Security |
| [`part4-fleet.md`](part4-fleet.md) | Sections 11–14: Fleet Composition, Tool & Capability Registry, Model Selection, Protocol Integration |
| [`part5-execution.md`](part5-execution.md) | Sections 15–17: Work Decomposition, Parallel Execution Strategy, Swarm Patterns |
| [`part6-quality.md`](part6-quality.md) | Sections 18–20: Quality Assurance, Failure Recovery, Known Agent Failure Modes |
| [`part7-operations.md`](part7-operations.md) | Sections 21–26: Institutional Memory, Adaptation Protocol, Cost Management, Fleet Health Metrics, Fleet Scaling & Lifecycle, Inter-Fleet Governance |
| [`part8-admiral.md`](part8-admiral.md) | Sections 27–28: Admiral Self-Calibration, Human-Expert Routing |
| [`part9-brain.md`](part9-brain.md) | Sections 29–31: Brain Architecture, Knowledge Protocol, Intelligence Lifecycle |
| [`appendices.md`](appendices.md) | Pre-Flight Checklist, Quick-Start Sequence, Worked Example |

-----

## The Operating Model

You are the Admiral. You provide the strategic context, constraints, and clarity that no AI can generate for itself. You may be a human operator, a meta-agent orchestrating other agents, or a hybrid of both. What matters is not whether you write code — it is whether the fleet has the context it needs to operate autonomously within defined boundaries.

Every autonomous AI system, regardless of intelligence, operates within the boundaries of what it has been told and what has been enforced. The quality of those boundaries — and the reliability of their enforcement — determines whether a fleet self-organizes into productive work or spirals into hallucination, scope creep, and wasted tokens.

> **CORE PRINCIPLE**
>
> AI agents are not limited by capability. They are limited by context.
>
> Instructions can be forgotten under context pressure. Enforcement mechanisms cannot. The Admiral's job is to determine which constraints are instructions and which are enforcement — then implement both.

-----

## Glossary

Terms are listed alphabetically. When these terms appear in any part file, they carry the definitions below.

| Term | Definition |
|---|---|
| **A2A** | Agent2Agent protocol. Open standard (Google, now Linux Foundation) for structured communication between agents across processes, machines, or organizations. Supports API Key, OAuth 2.0, mTLS auth. |
| **Absence context** | What an agent explicitly does not know and must not assume. Negative tool lists, non-goals, "does not have access to" declarations. One of the five dimensions of context (Section 04). |
| **Admiral** | The operator of a fleet. May be a human, a meta-agent, or a hybrid. Provides strategic context, sets boundaries, calibrates trust, and holds Escalate-tier authority. |
| **Agent Card** | A structured description published by an A2A agent declaring its capabilities, accepted input formats, and authentication requirements. Used for agent discovery. |
| **Anti-pattern** | A documented failure mode arising from a common but counterproductive practice. Each anti-pattern in this framework names the bad practice, describes why it fails, and references the section that prevents it. |
| **Autonomous tier** | Decision authority level where the agent proceeds without asking. Logs the decision. Used for low-risk, reversible decisions within established patterns. |
| **Backtracking** | Recovery strategy where an agent rolls back to a saved checkpoint and tries a fundamentally different path, rather than retrying variations of the failed approach. |
| **Brain** | The fleet's long-term memory: a Postgres + pgvector database accessible via MCP that stores decisions, outcomes, lessons, failures, and patterns as vector embeddings. Transcends sessions, agents, and context windows. Section 29. |
| **brain_query** | MCP tool for semantic search across Brain entries. Returns ranked results by cosine similarity, filtered by project, category, recency, and usefulness. Section 30. |
| **brain_record** | MCP tool for writing a new entry to the Brain. Requires project, category, title, and content. Embedding is generated automatically. Section 30. |
| **Boundaries** | Explicit constraints on what a project is NOT: non-goals, hard constraints, resource budgets, quality floors, and the LLM-Last boundary. Section 02. |
| **Cascade map** | The dependency graph between framework artifacts. When one artifact changes, all downstream artifacts must be reviewed and revised. Section 22. |
| **Checkpoint** | A structured summary written at chunk boundaries recording completed tasks, in-progress work, blockers, decisions, assumptions, and resource consumption. Section 21. |
| **Chunk** | An independently completable, independently verifiable unit of work. Sized to consume no more than 40% of an agent's token budget. Section 15. |
| **Completion bias** | Failure mode where an agent produces complete but degraded output rather than incomplete but excellent output when approaching resource limits. Section 20. |
| **Configuration accretion** | Failure mode where instruction files grow line-by-line after each incident until agents ignore the bloated rules. Section 20. |
| **Configuration injection** | Attack where an adversary modifies agent config files (CLAUDE.md, hooks, skills) in a PR or through compromised CI. Section 10. |
| **Context engineering** | The discipline of designing information flows across an entire agent system — what information exists where, when, and why. Subsumes prompt engineering. Section 04. |
| **Context profile** | Per-role specification of what loads into an agent's context: standing context, session context, on-demand context, refresh triggers, sacrifice order. Section 06. |
| **Context starvation** | Failure mode where an agent's context is underloaded, causing it to drift from Mission and infer incorrectly. Section 20. |
| **Context stuffing** | Failure mode where an agent's context is overloaded with artifacts "just in case," making output shallow and unfocused. Section 20. |
| **Contract-first parallelism** | Coordination pattern where the interface contract between parallel agents is defined before work is dispatched. Neither agent may unilaterally modify the contract. Section 16. |
| **Decision authority** | The four-tier system (Enforced / Autonomous / Propose / Escalate) that defines what an agent may decide, recommend, or must stop and flag. Section 09. |
| **Decision log** | Chronological record of every non-trivial decision: timestamp, decision, alternatives considered, rationale, authority tier used. Part of institutional memory. Section 21. |
| **Decay awareness** | Brain mechanism that flags entries not accessed within a configurable window for Admiral review. Knowledge that is never retrieved may be stale. Section 29. |
| **Deterministic enforcement** | Constraints implemented as hooks, CI gates, linters, or type checkers that fire 100% of the time regardless of context pressure. Contrasted with advisory instructions. Section 08. |
| **Embedding** | A vector representation of text that captures semantic meaning. Used by the Brain (pgvector) to match queries by meaning, not keywords. Section 29. |
| **Enforced tier** | Decision authority level handled by hooks, not agent judgment. The agent never makes this decision — the enforcement layer prevents or requires the action deterministically. |
| **Escalate tier** | Decision authority level where the agent stops all work and flags to the Admiral immediately. Used for scope changes, budget overruns, security concerns, contradictory requirements. |
| **Escalation report** | Structured document produced when an agent exhausts its recovery ladder: blocker, context, approaches attempted, root cause assessment, what's needed, impact, recommendation. Section 19. |
| **Failure mode** | A systematic way agent fleets fail. Twenty cataloged in Section 20 with primary defenses and warning signs. |
| **Firm guidance** | Constraints in CLAUDE.md, system prompts, or agents.md. High reliability but degradable under context pressure, especially in long sessions. Middle tier of the enforcement spectrum. Section 08. |
| **Fleet** | A coordinated group of AI agents operating under a single orchestrator on a single project. Typically five to twelve specialists. |
| **Fleet pause protocol** | Six-step procedure for halting fleet operations, collecting checkpoints, cascading changes through artifacts, re-validating, rebriefing, and resuming. Section 22. |
| **Ground truth** | The single source of reality for the fleet: domain ontology, tech stack versions, access/permissions, known issues, configuration artifacts. Section 05. |
| **Handoff document** | Narrative briefing written at session end, designed to be loaded at the next session start. Captures intent and reasoning, not just status. Section 21. |
| **Hard enforcement** | Hooks, CI gates, linters, type checkers — mechanisms that fire deterministically regardless of context. Top tier of the enforcement spectrum. Section 08. |
| **Hierarchical drift** | Failure mode where specialists drift upward and make orchestrator-level decisions. Section 20. |
| **Hook** | A shell command that executes deterministically at a defined lifecycle point (PreToolUse, PostToolUse, PreCommit, SessionStart, etc.). Not a request — executed code. Section 08. |
| **Intelligence lifecycle** | The eight-stage pipeline for Brain knowledge: Capture → Embed → Store → Retrieve → Strengthen → Link → Surface → Review. Section 31. |
| **Instruction decay** | Failure mode where rules in CLAUDE.md are followed initially but ignored as the session lengthens and context pressure builds. Section 20. |
| **Interface contract** | The defined format for handoffs between agents: what the sender delivers, what the receiver returns. Section 11. |
| **Knowledge graph** | The network of linked Brain entries. Entries connected by relationship types (supports, contradicts, supersedes, elaborates, caused_by) that agents can traverse for reasoning chains. Section 31. |
| **Knowledge protocol** | The MCP server interface that exposes the Brain to any AI agent. Tools: brain_record, brain_query, brain_retrieve, brain_strengthen, brain_supersede, brain_status. Section 30. |
| **LLM-Last** | Design principle: if a deterministic tool (linter, type checker, formatter, regex) can do it, the LLM should not. Highest-impact cost and reliability lever. Section 02. |
| **MCP** | Model Context Protocol. Open standard (Anthropic, now Linux Foundation) for connecting agents to tools and data sources. "USB-C for AI." |
| **MCP server** | A tool provider implementing the MCP standard. Extends agent capabilities. Must be registered, scoped, version-pinned, and audited. Section 12, Section 14. |
| **Memory poisoning** | Attack where an adversary implants false information into agent long-term storage that persists across all future sessions. Section 10. |
| **Meta-agent** | An AI agent serving as the Admiral — managing fleet composition, updating Ground Truth, making strategic decisions. Must have the most heavily enforced constraints. Section 27. |
| **Mission** | One sentence defining what the project is. One sentence defining success. The gravitational center every agent decision orbits. Section 01. |
| **Negative tool list** | Explicit declaration of tools and capabilities an agent does NOT have. Primary defense against phantom capabilities. Section 12. |
| **Non-goals** | Explicit statements of what the project is NOT. More powerful than goals because they eliminate entire categories of work. Part of Boundaries. Section 02. |
| **Orchestrator** | The coordinating agent that decomposes goals into tasks, routes to specialists, manages progress, and enforces standards. Does not write production code. |
| **Phantom capabilities** | Failure mode where an agent assumes tools or access it does not have and produces output grounded in hallucinated capabilities. Section 20. |
| **Progressive disclosure** | Loading strategy where knowledge is provided on-demand via skills rather than front-loaded at startup. Preserves context window capacity. Section 07. |
| **Prompt anatomy** | Standard structure for agent system prompts: Identity → Authority → Constraints → Knowledge → Task. Section 04. |
| **Propose tier** | Decision authority level where the agent drafts the decision with rationale, presents alternatives, and waits for approval. Used for architecture changes, schema migrations, new dependencies. |
| **Quality floor** | Minimum acceptable quality bar, defined concretely. Prevents infinite refinement by defining "good enough." Part of Boundaries. Section 02. |
| **Recovery ladder** | Five-step sequence agents follow when things go wrong: retry with variation → fallback → backtrack → isolate and skip → escalate. Section 19. |
| **Routing logic** | Rules the orchestrator uses to assign tasks to specialists: by task type, by file ownership, or by escalation. Section 11. |
| **Scope creep** | Failure mode where agents add unrequested features. Each reasonable in isolation; collectively they blow the budget. Section 20. |
| **Self-healing quality loop** | Pattern where a hook detects a failure (lint error, test failure, type error), feeds the output back to the agent, the agent fixes it, and the hook re-checks. Section 08. |
| **Session amnesia** | Failure mode where an agent loses critical context between sessions despite checkpointing mechanisms. Section 20. |
| **Silent failure** | Failure mode where an agent encounters an error, works around it without logging, and delivers a subtly incorrect result. Section 20. |
| **Skill** | A modular knowledge unit (`.claude/skills/*.md`) that loads into an agent's context only when a file pattern, keyword, or domain context matches. Section 07. |
| **Soft guidance** | Constraints in code comments, READMEs, or verbal instructions. Low reliability. Bottom tier of the enforcement spectrum. Section 08. |
| **Strengthening** | Brain mechanism where retrieved entries accumulate usefulness signals from consuming agents. High-usefulness entries rank higher in future queries. Section 29. |
| **Spec-first pipeline** | Structured workflow: Requirements Spec → Design Spec → Task Decomposition → Implementation. Each phase produces artifacts feeding the next. Section 15. |
| **Standing context** | The portion of an agent's context window that is always loaded: Mission, Boundaries, role definition, Ground Truth essentials. Typically 15–25% of the window. Section 06. |
| **Success criteria** | Machine-verifiable definition of "done" for a task: functional, quality, completeness, and negative criteria. Section 03. |
| **Swarm** | Advanced orchestration pattern where agents self-organize under a queen agent rather than following top-down routing. Section 17. |
| **Supersession** | Brain mechanism where outdated entries are not deleted but linked to their replacement via `superseded_by`. Preserves full decision history while defaulting to current knowledge. Section 29. |
| **Sycophantic drift** | Failure mode where agents increasingly agree with established framing over long sessions. QA finds fewer issues. Section 20. |
| **Trust calibration** | The practice of measuring and adjusting an agent's Autonomous tier based on track record. Earned per category, not globally. Withdrawn precisely after failures. Section 27. |

-----

## Table of Contents

Sections are ordered by impact and grouped by relevance.

| # | Section | One-Line Summary | File |
|---|---|---|---|
| | **PART 1 — STRATEGY** | *What are we building, what are the walls, and how do we know when we're done?* | [`part1-strategy.md`](part1-strategy.md) |
| 01 | Mission | The gravitational center every agent decision orbits. | |
| 02 | Boundaries | What the project is NOT — the single most effective tool against drift. | |
| 03 | Success Criteria | What "done" looks like, in terms a machine can verify. | |
| | **PART 2 — CONTEXT** | *How does the right information reach the right agent at the right time?* | [`part2-context.md`](part2-context.md) |
| 04 | Context Engineering | The master discipline: designing information flows across the fleet. | |
| 05 | Ground Truth | The single source of reality for the world agents operate in. | |
| 06 | Context Window Strategy | How to allocate, load, and refresh an agent's working memory. | |
| 07 | Configuration File Strategy | How instruction files are structured, layered, and kept under 150 lines. | |
| | **PART 3 — ENFORCEMENT** | *The gap between "should" and "must."* | [`part3-enforcement.md`](part3-enforcement.md) |
| 08 | Deterministic Enforcement | Hooks fire every time. Instructions can be forgotten. Know which is which. | |
| 09 | Decision Authority | What agents may decide, what they propose, and what they must escalate. | |
| 10 | Configuration Security | Agent configs are attack surfaces. Defend them like production code. | |
| | **PART 4 — FLEET** | *Who does what, with what tools, on what models, speaking what protocols?* | [`part4-fleet.md`](part4-fleet.md) |
| 11 | Fleet Composition | Agent roster, routing logic, interface contracts, role boundaries. | |
| 12 | Tool & Capability Registry | What each agent can do — and explicitly cannot do. | |
| 13 | Model Selection | Matching model capability to role requirements across four tiers. | |
| 14 | Protocol Integration | MCP for tool access. A2A for agent-to-agent communication. | |
| | **PART 5 — EXECUTION** | *How work gets planned, parallelized, and completed.* | [`part5-execution.md`](part5-execution.md) |
| 15 | Work Decomposition | Breaking goals into chunks sized for full attention. | |
| 16 | Parallel Execution Strategy | Coordination patterns that prevent assumption divergence. | |
| 17 | Swarm Patterns | When and how to move beyond hierarchical orchestration. | |
| | **PART 6 — QUALITY** | *How the fleet maintains standards and handles failure.* | [`part6-quality.md`](part6-quality.md) |
| 18 | Quality Assurance | Who checks, how they check, and what happens when the check fails. | |
| 19 | Failure Recovery | The recovery ladder: retry, fallback, backtrack, isolate, escalate. | |
| 20 | Known Agent Failure Modes | A field guide to twenty systematic ways agent fleets fail. | |
| | **PART 7 — OPERATIONS** | *How work persists, adapts, and scales over time.* | [`part7-operations.md`](part7-operations.md) |
| 21 | Institutional Memory | Session persistence patterns that survive context window boundaries. | |
| 22 | Adaptation Protocol | Controlled response to change: tactical, strategic, and full pivot. | |
| 23 | Cost Management | Token economics, model tier optimization, and budget controls. | |
| 24 | Fleet Health Metrics | What to measure, what healthy looks like, and what to do when it doesn't. | |
| 25 | Fleet Scaling & Lifecycle | How fleets grow, shrink, and transition across project phases. | |
| 26 | Inter-Fleet Governance | Isolation, controlled sharing, and cross-fleet review across projects. | |
| | **PART 8 — THE ADMIRAL** | *The human element.* | [`part8-admiral.md`](part8-admiral.md) |
| 27 | Admiral Self-Calibration | Bottleneck detection, trust calibration, and growth trajectory. | |
| 28 | Human-Expert Routing | When the fleet needs expertise the Admiral doesn't have. | |
| | **PART 9 — THE BRAIN** | *Infrastructure designed for anything.* | [`part9-brain.md`](part9-brain.md) |
| 29 | Brain Architecture | Postgres + pgvector: the fleet's long-term memory with semantic understanding. | |
| 30 | The Knowledge Protocol | MCP server interface — any agent speaks to the Brain, now and always. | |
| 31 | Intelligence Lifecycle | How knowledge enters, strengthens, links, surfaces, and compounds over time. | |
| | **APPENDICES** | | [`appendices.md`](appendices.md) |
| A | Pre-Flight Checklist | Go/no-go gate before fleet deployment. | |
| B | Quick-Start Sequence | Operational order for standing up a new fleet. | |
| C | Worked Example | A complete SaaS application fleet, end to end. | |
