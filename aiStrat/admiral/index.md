<!-- Admiral Framework v0.3.1-alpha -->
# THE FLEET ADMIRAL FRAMEWORK

**A Workforce Toolkit for Autonomous AI Agent Fleets**

v0.3.1-alpha · March 2026
v0.3.1-alpha · March 2026

-----

## What This Is

AI agents are not employees and they are not code. You cannot manage them with HR policies and you cannot validate them with traditional software tests. They are an entirely new category of resource — non-deterministic, amnesiac between sessions, prone to novel failure modes (hallucination, sycophantic drift, scope creep, context starvation), and incapable of learning from being told something twice. The people deploying agent fleets who recognize this have a massive head start over those still trying to make old frameworks fit.

This is a **Swiss army knife for that reality** — a reusable toolkit of patterns, agent definitions, enforcement strategies, and operational knowledge designed from scratch for how agents actually behave. It is the workforce itself, not overhead for building a specific product.

Pick the parts you need. A two-person team might use only the enforcement spectrum (Part 3) and five agent definitions. A platform team might deploy the full Brain, Monitor, and Fleet. The framework scales to what you need — you don't adopt all of it to use any of it.

-----

## Adoption Levels

You don't need to read 200 pages before deploying your first agent. Start at Level 1. Graduate when you hit the limits of your current level.

| Level | What You Use | Time to Value | When to Advance |
|---|---|---|---|
| **Level 1: Disciplined Solo** | Create AGENTS.md (<150 lines) and tool-specific pointers (CLAUDE.md, etc.). Define enforcement spectrum (Section 08). Deploy hooks for safety-critical constraints — token budget, loop detection, and context health (Section 08) — as live enforcement in your agent runtime, not just as tested code. Load Standing Orders (Section 36) into agent context. One agent with clear Identity/Scope/Boundaries. Simple identity model (agent-id + role, no cryptographic signing) for authority binding. Brain Level 1 (file-based JSON). | 30 min (config) / 1-2 days (build) | When you need multiple specialists coordinating on a single task. |
| **Level 2: Core Fleet** | Everything in Level 1 plus Fleet Composition (Section 11) with 5–8 agents, routing rules, interface contracts, and the recovery ladder. Hook-based enforcement for budget, loops, and context health (no governance agents required). Brain Level 2 (SQLite + embeddings). File-based checkpoints for session persistence. | 2–4 hours | When convention drift, scope creep, or hallucination compound across sessions and you can't catch them manually. |
| **Level 3: Governed Fleet** | Everything in Level 2 plus 3–7 governance agents (Token Budgeter, Hallucination Auditor, Loop Breaker minimum). Add Drift Monitor, Bias Sentinel, Context Health Monitor, and Contradiction Detector as fleet size and risk warrant. Decision authority tiers enforced. **Brain Level 3 (Postgres + pgvector + MCP + identity tokens + zero-trust) — the Brain is fully complete at this level.** Spec-only quarantine layer for external intelligence. | 1–2 days | When cross-session knowledge reuse is critical, or when fleet size exceeds what one Orchestrator can effectively govern. |
| **Level 4: Full Framework** | Everything in Level 3 plus full fleet with scale agents for review cycles, fleet observability, Continuous Monitor (operational), and full enforcement coverage across all 15 Standing Orders. Brain unchanged from Level 3. | 1–2 weeks | When operating at scale with multiple concurrent projects and continuous deployment. |
| **Level 5: Enterprise** | Everything in Level 4 plus cross-fleet Brain federation, multi-operator governance, cross-fleet hooks, multi-source intelligence, and multi-fleet coordination. | 2–4 weeks | Target state for organizations running multiple independent fleets across teams or products. |

**The most common mistake is starting at Level 5.** The administrative overhead of 40+ agents, a full Brain, and 7 governance agents exceeds the value for any project that hasn't yet validated its fleet's core workflow. Start at Level 1. Each level builds on the previous one. Skip nothing.

> **The second most common mistake is building Level 2–5 artifacts "while you're at it."** Level 1 means one agent. Do not build handoff protocols (there's no one to hand off to), escalation routing (there's no one to escalate through), governance heartbeat monitors (there are no governance agents), tier validation hooks (there's no fleet roster), or empty placeholder packages for future levels. These add complexity without value and violate the Boundaries principle (Section 02): if it's not needed now, it's a non-goal. Define the *models* for progressive hardening (e.g., the identity model should exist so it can grow), but do not implement features that have no consumer at the current level. Build what Level 1 requires, deploy it as live enforcement, and stop.

> **Config time vs. build time:** The "Time to Value" column has two meanings depending on your context. If you are **configuring** Admiral on an existing platform (e.g., writing AGENTS.md and hooks for Claude Code), the time estimates are for configuration. If you are **implementing** Admiral as code (building a hook engine, data models, test suites), expect significantly longer — the config-to-build ratio varies by level but is typically 50-100x for Level 1. The reference implementation needed ~5,500 lines of Python, 148 tests, and 2 days plus a review cycle to reach verified Level 1 completion. See Case Study 4 in Appendix D for the full account.

### What Each Level Adds

**Level 1 → 2:** You go from one agent to coordinated specialists. The Orchestrator decomposes work, routes to the right agent, and enforces handoff contracts. This is where most of the productivity gain lives.

**Level 2 → 3:** You add the fleet's immune system. Governance agents add analytical capabilities on top of the deterministic hooks already present at Levels 1-2. They catch the failure modes that compound silently over multiple sessions — sycophantic drift, hallucination, scope creep, cross-agent patterns. Without them, quality degrades gradually and invisibly.

**Level 3 → 4:** You add persistent memory and ecosystem intelligence. The Brain captures lessons that outlive sessions. The Monitor captures lessons that outlive the fleet. Identity tokens and zero-trust access control harden the system for continuous, unsupervised operation.

### Minimum Viable Reading Path

If you are starting at Level 1, you do not need to read the entire framework. These six files (~800 lines of targeted reading) give you everything you need to deploy your first governed agent. Read the rest when you need it.

| Order | File | What to Read | Why |
|---|---|---|---|
| 1 | [`index.md`](index.md) | Glossary + Adoption Levels | Shared vocabulary and your roadmap. |
| 2 | [`part1-strategy.md`](part1-strategy.md) | Full file | Mission, Boundaries, Success Criteria — the three inputs every agent needs. |
| 3 | [`part3-enforcement.md`](part3-enforcement.md) | Section 08 only | The enforcement spectrum: hooks over instructions. Sections 09 (Decision Authority) and 10 (Configuration Security) are Level 2+ — read them when you add a fleet. |
| 3.5 | [`intent-engineering.md`](intent-engineering.md) | Six Elements of Intent | How to write mission, boundaries, and task assignments that give agents enough context to handle unexpected situations. |
| 4 | [`part11-protocols.md`](part11-protocols.md) | Section 36 (Standing Orders) only | The fifteen non-negotiable rules loaded into every agent's standing context. |
| 5 | [`appendices.md`](appendices.md) | Appendix A (Pre-Flight Checklist) | Go/no-go gate — confirms you have not missed anything critical. |

Start here. Graduate to the full framework when you hit the limits of Level 1.

-----

## Why Admiral

Other frameworks solve agent orchestration. Admiral solves agent *governance*.

(Landscape as of March 2026 — verify current state via Monitor or manual review)

| Framework | What It Provides | What It Lacks |
|---|---|---|
| **CrewAI / AutoGen / LangGraph** | Agent definition, routing, tool calling, memory | No enforcement spectrum (hooks vs instructions). No governance agents. No failure mode catalog. No decision authority tiers. No persistent semantic memory with retrieval confidence. |
| **OpenAI Swarm** | Lightweight agent handoffs | Explicitly "educational" — no production governance, no security model, no quality assurance pipeline. |
| **Anthropic Agent SDK** | Agent runtime, tool use, handoffs, guardrails | Runtime, not doctrine. Provides the engine; Admiral provides the operating manual. Complementary, not competitive. |
| **Custom orchestration** | Full control | You build everything from scratch, including every failure mode Admiral has already cataloged and every governance pattern already specified. |

**Admiral's unique contributions:**

1. **The enforcement spectrum.** The insight that constraints exist on a reliability continuum (hooks → firm guidance → soft guidance) and that the most important constraints must be hooks, not instructions. No other framework makes this distinction.

2. **Governance agents as first-class citizens.** Seven agents that operationalize 20 documented failure modes — sycophantic drift, hallucination, scope creep, retry loops, context starvation, convention erosion, contradiction. These are structural LLM weaknesses that every fleet encounters. Most frameworks ignore them.

3. **Zero-trust continuous verification.** Identity tokens, access control per Brain entry, quarantine for external intelligence, configuration security audits. Most frameworks treat security as an afterthought. Admiral treats it as the first thought.

4. **The Brain specification.** Persistent semantic memory with vector retrieval, multi-hop reasoning chains, retrieval confidence levels, strengthening signals, and decay awareness. This is fleet institutional memory, not just chat history.

5. **Decision authority tiers.** Enforced/Autonomous/Propose/Escalate with concrete calibration rubric. Every agent knows exactly what it can decide, what it should recommend, and what it must escalate. No other framework provides this granularity.

Admiral is complementary to agent SDKs and orchestration frameworks. They provide the runtime. Admiral provides the operational doctrine that makes the runtime safe, governed, and effective. See Appendix E for platform integration patterns.

-----

## How to Read This Document

This framework is split across fourteen files. This index is the entry point. Each part is a self-contained module that can be loaded into an agent's context independently.

**Humans (Admirals and implementers)** — You are the Admiral. Start here. Read the operating model and glossary, then work through parts in order or jump to whichever part addresses your current need. The prose, anti-patterns, and worked example are for you. This is the framework's primary audience today.

**LLM agents** — Individual part files will be loaded into your context as operational instructions. The TL;DR blocks, templates, and structured formats are for you. When a part file is loaded, treat its constraints as binding and its templates as required output formats. Refer to the glossary below for term definitions. Agent-facing content is designed for context injection — concise, structured, and unambiguous.

**Machines (future)** — CI pipelines, hook scripts, linters, and automation tooling will consume the artifacts this framework produces. Templates, checklists, and structured formats are designed to be parseable. Machine audience support is emerging — see `.github/workflows/spec-validation.yml` for initial CI tooling. Full machine-readable validation is a Level 4+ capability.

> **This is not an AGENTS.md file.** It is the meta-framework that generates AGENTS.md files, agent definitions, hook scripts, skill files, and operational artifacts. Your actual configuration files (AGENTS.md, CLAUDE.md, .cursorrules, etc.) should be under 150 lines each. This framework is the source of truth they are distilled from.

-----

## Files

| File | Contents |
|---|---|
| [`index.md`](index.md) | This file. Operating model, glossary, table of contents. |
| [`part1-strategy.md`](part1-strategy.md) | Sections 01–03: Mission, Boundaries, Success Criteria |
| [`part2-context.md`](part2-context.md) | Sections 04–07: Context Engineering, Ground Truth, Context Window Strategy, Configuration File Strategy |
| [`part3-enforcement.md`](part3-enforcement.md) | Sections 08–10: Deterministic Enforcement, Decision Authority, Configuration Security |
| [`part4-fleet.md`](part4-fleet.md) | Sections 11–14: Fleet Composition, Tool & Capability Registry, Model Selection, Protocol Integration |
| [`part5-brain.md`](part5-brain.md) | Sections 15–17: Brain Architecture, Knowledge Protocol, Intelligence Lifecycle |
| [`part6-execution.md`](part6-execution.md) | Sections 18–20: Work Decomposition, Parallel Execution Strategy, Swarm Patterns |
| [`part7-quality.md`](part7-quality.md) | Sections 21–23: Quality Assurance, Failure Recovery, Known Agent Failure Modes |
| [`part8-operations.md`](part8-operations.md) | Sections 24–29 + 28b: Institutional Memory, Adaptation Protocol, Cost Management, Fleet Health Metrics, Orchestrator Health Protocol, Fleet Scaling & Lifecycle, Inter-Fleet Governance |
| [`part9-platform.md`](part9-platform.md) | Sections 30–32 + 32b: Fleet Observability, CI/CD & Event-Driven Operations, Fleet Evaluation & Benchmarking, Multi-Modal & Extended Capabilities |
| [`part10-admiral.md`](part10-admiral.md) | Sections 33–35: Admiral Self-Calibration, Human-Expert Routing, Multi-Operator Governance |
| [`part11-protocols.md`](part11-protocols.md) | Sections 36–41: Standing Orders, Escalation, Handoffs, Human Referral, Paid Resource Authorization, Data Sensitivity |
| [`intent-engineering.md`](intent-engineering.md) | Intent Engineering: the shared dialect between Admirals and Brains |
| [`governance-platform.md`](governance-platform.md) | The paradigm shift: ATC, not flight plans. Four pillars. Chaos-first architecture. |
| [`fleet-control-plane.md`](fleet-control-plane.md) | Real-time operational surface: dashboard, alerts, interventions. |
| [`progressive-autonomy.md`](progressive-autonomy.md) | Four stages from manual oversight to full autonomy. |
| [`inevitable-features.md`](inevitable-features.md) | The three features that make Admiral indispensable. |
| [`appendices.md`](appendices.md) | Pre-Flight Checklist, Quick-Start Sequence, Worked Example |

-----

## The Operating Model

You are the Admiral. You provide the strategic context, constraints, and clarity that no AI can generate for itself. You may be a human operator, a meta-agent orchestrating other agents, or a hybrid of both. What matters is not whether you write code — it is whether the fleet has the context it needs to operate autonomously within defined boundaries. Your primary communication skill is **intent engineering** — structuring instructions around outcomes, values, constraints, failure modes, and judgment boundaries so that agents encountering unexpected situations can either make the right call or know that they cannot. See [`intent-engineering.md`](intent-engineering.md).

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
| **Brain** | The fleet's long-term memory: a Postgres + pgvector database accessible via MCP that stores decisions, outcomes, lessons, failures, and patterns as vector embeddings. Transcends sessions, agents, and context windows. Section 15. |
| **brain_query** | MCP tool for semantic search across Brain entries. Returns ranked results by cosine similarity, filtered by project, category, recency, and usefulness. Section 16. |
| **brain_record** | MCP tool for writing a new entry to the Brain. Requires project, category, title, and content. Embedding is generated automatically. Section 16. |
| **Boundaries** | Explicit constraints on what a project is NOT: non-goals, hard constraints, resource budgets, quality floors, and the LLM-Last boundary. Section 02. |
| **Cascade map** | The dependency graph between framework artifacts. When one artifact changes, all downstream artifacts must be reviewed and revised. Section 25. |
| **Checkpoint** | A structured summary written at chunk boundaries recording completed tasks, in-progress work, blockers, decisions, assumptions, and resource consumption. Section 24. |
| **Chunk** | An independently completable, independently verifiable unit of work. Sized to consume no more than 40% of an agent's token budget. Section 18. |
| **Completion bias** | Agent produces complete but degraded output near resource limits. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Configuration accretion** | Instruction files grow after each incident until agents ignore bloated rules. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Configuration injection** | Attack where an adversary modifies agent config files (AGENTS.md, CLAUDE.md, .cursorrules, hooks, skills) in a PR or through compromised CI. Section 10. |
| **Continuous AI Landscape Monitor** | Automated surveillance system (`monitor/`) that scans the AI ecosystem — model releases, agent patterns, trending tools — and feeds curated intelligence into the Brain through a quarantine layer. Runs on GitHub Actions (daily + weekly). Section 17, Section 31. |
| **Context engineering** | The discipline of designing information flows across an entire agent system — what information exists where, when, and why. Subsumes prompt engineering. Section 04. |
| **Context profile** | Per-role specification of what loads into an agent's context: standing context, session context, on-demand context, refresh triggers, sacrifice order. Section 06. |
| **Context starvation** | Agent lacks critical information needed for the task. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Context stuffing** | Agent context overloaded with artifacts "just in case," making output shallow. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Contract-first parallelism** | Coordination pattern where the interface contract between parallel agents is defined before work is dispatched. Neither agent may unilaterally modify the contract. Section 19. |
| **Decision authority** | The four-tier system (Enforced / Autonomous / Propose / Escalate) that defines what an agent may decide, recommend, or must stop and flag. Section 09. |
| **Decision log** | Chronological record of every non-trivial decision: timestamp, decision, alternatives considered, rationale, authority tier used. Part of institutional memory. Section 24. |
| **Decay awareness** | Brain mechanism that flags entries not accessed within a configurable window for Admiral review. Knowledge that is never retrieved may be stale. Section 15. |
| **Deterministic enforcement** | Constraints implemented as hooks, CI gates, linters, or type checkers that fire 100% of the time regardless of context pressure. Contrasted with advisory instructions. Section 08. |
| **Embedding** | A vector representation of text that captures semantic meaning. Used by the Brain (pgvector) to match queries by meaning, not keywords. Section 15. |
| **Enforced tier** | Decision authority level handled by hooks, not agent judgment. The agent never makes this decision — the enforcement layer prevents or requires the action deterministically. |
| **Escalate tier** | Decision authority level where the agent stops all work and flags to the Admiral immediately. Used for scope changes, budget overruns, security concerns, contradictory requirements. |
| **Error signature** | A normalized representation of a hook failure used for cycle detection. Recommended: the first line of stderr concatenated with the exit code, with timestamps and line numbers stripped. Used by the self-healing loop (Section 08) to detect when an agent is producing the same failure repeatedly. |
| **Escalation report** | Structured document produced when an agent exhausts its recovery ladder: blocker, context, approaches attempted, root cause assessment, what's needed, impact, recommendation. Section 22. |
| **Event-driven agent** | An agent triggered by repository or system events (PR opened, CI failed, scheduled cron) rather than interactive sessions. Requires pre-configured context bootstrapping and narrower authority tiers. Section 31. |
| **Exemplar** | A tracked repository representing best-in-class agent tooling (e.g., Claude Code, Aider, Cline). The monitor watches exemplars for releases, configuration changes, and design patterns that should inform fleet configuration. Section 17. |
| **Failure mode** | A systematic way agent fleets fail. Twenty cataloged in Section 23 with primary defenses and warning signs. |
| **Firm guidance** | Constraints in AGENTS.md, system prompts, or tool-specific config files (CLAUDE.md, .cursorrules). High reliability but degradable under context pressure, especially in long sessions. Middle tier of the enforcement spectrum. Section 08. |
| **Fleet** | A coordinated group of AI agents operating under a single orchestrator on a single project. Typically five to twelve specialists. |
| **Fleet evaluation** | The practice of measuring whether a fleet configuration produces better outcomes than alternatives, through controlled A/B testing and benchmarking against baselines. Section 32. |
| **Fleet observability** | The ability to understand fleet behavior through traces, logs, and metrics at the individual operation level. Monitoring tells you something is wrong; observability tells you why. Section 30. |
| **Fleet pause protocol** | Six-step procedure for halting fleet operations, collecting checkpoints, cascading changes through artifacts, re-validating, rebriefing, and resuming. Section 25. |
| **Ground truth** | The single source of reality for the fleet: domain ontology, tech stack versions, access/permissions, known issues, configuration artifacts. Section 05. |
| **Handoff document** | Narrative briefing written at session end, designed to be loaded at the next session start. Captures intent and reasoning, not just status. Section 24. |
| **Hard enforcement** | Hooks, CI gates, linters, type checkers — mechanisms that fire deterministically regardless of context. Top tier of the enforcement spectrum. Section 08. |
| **Hierarchical drift** | Specialists drift upward and make orchestrator-level decisions. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Hook** | An executable program (shell script, Python, compiled binary) invoked by the agent runtime at a defined lifecycle point. Receives structured JSON on stdin, returns exit code (0=pass, non-zero=block) with stdout fed back to the agent. Timeout-enforced, idempotent, sandboxed. Section 08. |
| **Intelligence lifecycle** | The eight-stage pipeline for Brain knowledge: Capture → Embed → Store → Retrieve → Strengthen → Link → Surface → Review. Section 17. |
| **Instruction decay** | Rules followed initially but ignored as session lengthens and context pressure builds. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Interface contract** | The defined format for handoffs between agents: what the sender delivers, what the receiver returns. Section 11. |
| **Knowledge graph** | The network of linked Brain entries. Entries connected by relationship types (supports, contradicts, supersedes, elaborates, caused_by) that agents can traverse for reasoning chains. Section 17. |
| **Knowledge protocol** | The MCP server interface that exposes the Brain to any AI agent. Tools: brain_record, brain_query, brain_retrieve, brain_strengthen, brain_supersede, brain_status, brain_audit, brain_purge. Section 16. |
| **LLM-Last** | Design principle: if a deterministic tool (linter, type checker, formatter, regex) can do it, the LLM should not. Highest-impact cost and reliability lever. Section 02. |
| **Computer use** | Agent capability to interact with graphical user interfaces — clicking, typing, scrolling, reading screen content. Requires sandboxed environment, strict time limits, and narrow Autonomous tier. Section 32b. |
| **Extended thinking** | Dedicated reasoning tokens consumed before the model's response begins. Deeper reasoning, not longer output. 5-50x output volume. Must be budgeted separately. Section 32b. |
| **Human inflection point** | A moment during execution where the correct action requires human judgment, taste, ethics, or strategic context that an LLM cannot derive from training data. The agent must stop and ask. See `admiral/intent-engineering.md`. |
| **Identity token** | Cryptographically signed, session-scoped, non-delegable credential binding an agent to a specific project, role, authority tier, and session. Verified by the Brain MCP server on every request. Section 16. |
| **Intent engineering** | The practice of structuring instructions around outcomes, values, constraints, failure modes, and judgment boundaries — not just outputs. The evolution beyond prompt engineering and context engineering. The shared dialect between Admirals and Brains. See `admiral/intent-engineering.md`. |
| **MCP** | Model Context Protocol. Open standard (Anthropic, now Linux Foundation) for connecting agents to tools and data sources. Supports streaming, subscriptions, and discovery with trust signals. "USB-C for AI." |
| **Multi-hop retrieval** | Brain retrieval pattern that follows entry links to return full reasoning chains — cause → decision → outcome → consequence — not just the directly matching entry. Maximum depth: 3. Section 17. |
| **MCP server** | A tool provider implementing the MCP standard. Extends agent capabilities. Must be registered, scoped, version-pinned, and audited. Section 12, Section 14. |
| **Memory poisoning** | Attack where an adversary implants false information into agent long-term storage that persists across all future sessions. Section 10. |
| **Meta-agent** | An AI agent serving as the Admiral — managing fleet composition, updating Ground Truth, making strategic decisions. Must have the most heavily enforced constraints. Section 33. |
| **Mission** | One sentence defining what the project is. One sentence defining success. The gravitational center every agent decision orbits. Section 01. |
| **Negative tool list** | Explicit declaration of tools and capabilities an agent does NOT have. Primary defense against phantom capabilities. Section 12. |
| **Non-goals** | Explicit statements of what the project is NOT. More powerful than goals because they eliminate entire categories of work. Part of Boundaries. Section 02. |
| **Observability** | Understanding fleet behavior through external outputs — traces for individual operations, logs for event records, metrics for aggregate health. Distinct from monitoring: monitoring detects problems; observability diagnoses them. Section 30. |
| **Orchestrator** | The coordinating agent that decomposes goals into tasks, routes to specialists, manages progress, and enforces standards. Does not write production code. |
| **Phantom capabilities** | Agent assumes tools or access it does not have. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Progressive disclosure** | Loading strategy where knowledge is provided on-demand via skills rather than front-loaded at startup. Preserves context window capacity. Section 07. |
| **Prompt anatomy** | Standard structure for agent system prompts: Identity → Authority → Constraints → Knowledge → Task. Section 04. See also: [`fleet/prompt-anatomy.md`](../fleet/prompt-anatomy.md) for the full reference specification. |
| **Propose tier** | Decision authority level where the agent drafts the decision with rationale, presents alternatives, and waits for approval. Used for architecture changes, schema migrations, new dependencies. |
| **Quarantine** | Five-layer immune system that validates all external content before it enters the Brain. Layers 1-3 are completely LLM-airgapped; Layer 4 is LLM advisory (reject-only); Layer 5 generates antibodies. See Section 10. |
| **Quality floor** | Minimum acceptable quality bar, defined concretely. Prevents infinite refinement by defining "good enough." Part of Boundaries. Section 02. |
| **Recovery ladder** | Five-step sequence agents follow when things go wrong. See Section 22 for the full ladder and backtracking requirements. |
| **Routing logic** | Rules the orchestrator uses to assign tasks to specialists: by task type, by file ownership, or by escalation. Section 11. |
| **Scope creep** | Agents add unrequested features that collectively blow the budget. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Seed candidate** | A proposed Brain entry generated by the Continuous AI Landscape Monitor with `"approved": False`. Requires Admiral review before activation. Ensures external intelligence is curated, not blindly ingested. Section 17. |
| **Self-healing quality loop** | Pattern where a hook detects a failure (lint error, test failure, type error), feeds the output back to the agent, the agent fixes it, and the hook re-checks. Section 08. |
| **Session amnesia** | Agent loses critical context between sessions despite checkpointing. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Silent failure** | Agent encounters an error and works around it without logging. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Skill** | A modular knowledge unit that loads into an agent's context only when a file pattern, keyword, or domain context matches. Implementation varies by tool (e.g., `.claude/skills/*.md` in Claude Code, `.cursor/rules/` in Cursor). Section 07. |
| **Soft guidance** | Constraints in code comments, READMEs, or verbal instructions. Low reliability. Bottom tier of the enforcement spectrum. Section 08. |
| **Strengthening** | Brain mechanism where retrieved entries accumulate usefulness signals from consuming agents. High-usefulness entries rank higher in future queries. Section 15. |
| **Spec-first pipeline** | Structured workflow: Requirements Spec → Design Spec → Task Decomposition → Implementation. Each phase produces artifacts feeding the next. Section 18. |
| **Standing context** | The portion of an agent's context window that is always loaded: Mission, Boundaries, role definition, Ground Truth essentials. Typically 15–25% of the window. Section 06. |
| **Success criteria** | Machine-verifiable definition of "done" for a task: functional, quality, completeness, and negative criteria. Section 03. |
| **Swarm** | Advanced orchestration pattern where agents self-organize under a queen agent rather than following top-down routing. Section 20. |
| **Supersession** | Brain mechanism where outdated entries are not deleted but linked to their replacement via `superseded_by`. Preserves full decision history while defaulting to current knowledge. Section 15. |
| **Sycophantic drift** | Agents increasingly agree with established framing over long sessions. See Section 23 (Failure Mode Catalog) for diagnosis and defense. |
| **Trace** | An end-to-end record of a task as it flows through multiple agents, tools, and systems. Enables debugging specific failures by showing exactly what happened, in what order, at what cost. Section 30. |
| **Trust calibration** | The practice of measuring and adjusting an agent's Autonomous tier based on track record. Earned per category, not globally. Withdrawn precisely after failures. Section 33. |

-----

## Relationship to the Fleet and Monitor

The `fleet/` directory provides 71 core agent definitions (plus 29 extended agents in `fleet/agents/extras/`) organized by category. The `monitor/` directory specifies the continuous intelligence pipeline. The `brain/` directory contains the database schema and architecture specification for long-term memory.

| Admiral Section | Companion Specification |
|---|---|
| Section 11 (Fleet Composition) | `fleet/agents/` — agent definitions by category |
| Section 04 (Context Engineering) | `fleet/prompt-anatomy.md`, `fleet/context-injection.md` |
| Section 09 (Decision Authority) | Each agent definition includes a Decision Authority table |
| Section 13 (Model Selection) | `fleet/model-tiers.md` — tier assignments for every agent |
| Section 11 (Routing Logic) | `fleet/routing-rules.md` — task-to-agent routing decision table |
| Section 15 (Brain Architecture) | `brain/schema/001_initial.sql` — Postgres + pgvector schema |
| Part 11 (Protocols) | Authoritative source; agents reference these protocols |
| Sections 13, 17, 25, 31 (Intelligence) | `monitor/README.md` — ecosystem scanning, quarantine, seed generation |
| Section 07 (Configuration File Strategy) | `AGENTS.md` — canonical model-agnostic instruction file; `CLAUDE.md` — Claude Code pointer |
| Section 08 (Deterministic Enforcement) | `hooks/README.md` — hook ecosystem spec; `hooks/manifest.schema.json` — hook manifest schema |
| Section 38 (Handoff Protocol) | `handoff/v1.schema.json` — canonical JSON Schema for handoff validation |
| Section 10 (Configuration Security) | `attack-corpus/README.md` — attack corpus spec and seed scenarios for Layer 3 |

> **Admiral is the engineering manual. Fleet is the parts catalog. Brain is the memory architecture. Monitor is the intelligence service.** Use the admiral to learn *what to do and why*. Use the fleet to learn *how to do it with specific agents*. Use the brain and monitor specs to understand *how knowledge persists and ecosystem intelligence flows*.

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
| | **PART 5 — THE BRAIN** | *Infrastructure designed for anything.* | [`part5-brain.md`](part5-brain.md) |
| 15 | Brain Architecture | Postgres + pgvector: the fleet's long-term memory with semantic understanding. | |
| 16 | The Knowledge Protocol | MCP server interface — any agent speaks to the Brain, now and always. | |
| 17 | Intelligence Lifecycle | How knowledge enters, strengthens, links, surfaces, and compounds over time. | |
| | **PART 6 — EXECUTION** | *How work gets planned, parallelized, and completed.* | [`part6-execution.md`](part6-execution.md) |
| 18 | Work Decomposition | Breaking goals into chunks sized for full attention. | |
| 19 | Parallel Execution Strategy | Coordination patterns that prevent assumption divergence. | |
| 20 | Swarm Patterns | When and how to move beyond hierarchical orchestration. | |
| | **PART 7 — QUALITY** | *How the fleet maintains standards and handles failure.* | [`part7-quality.md`](part7-quality.md) |
| 21 | Quality Assurance | Who checks, how they check, and what happens when the check fails. | |
| 22 | Failure Recovery | The recovery ladder: retry, fallback, backtrack, isolate, escalate. | |
| 23 | Known Agent Failure Modes | A field guide to twenty systematic ways agent fleets fail. | |
| | **PART 8 — OPERATIONS** | *How work persists, adapts, and scales over time.* | [`part8-operations.md`](part8-operations.md) |
| 24 | Institutional Memory | Session persistence patterns that survive context window boundaries. | |
| 25 | Adaptation Protocol | Controlled response to change: tactical, strategic, and full pivot. | |
| 26 | Cost Management | Token economics, model tier optimization, and budget controls. | |
| 27 | Fleet Health Metrics | What to measure, what healthy looks like, and what to do when it doesn't. | |
| 28 | Fleet Scaling & Lifecycle | How fleets grow, shrink, and transition across project phases. | |
| 28b | Orchestrator Health Protocol | Heartbeat monitoring, failover, and recovery for the Orchestrator. | |
| 29 | Inter-Fleet Governance | Isolation, controlled sharing, and cross-fleet review across projects. | |
| | **PART 9 — PLATFORM** | *The infrastructure that surrounds the fleet.* | [`part9-platform.md`](part9-platform.md) |
| 30 | Fleet Observability | Why a specific agent failed on a specific task — traces, not just metrics. | |
| 31 | CI/CD & Event-Driven Operations | Agents triggered by PRs, CI failures, schedules, and webhooks. | |
| 32 | Fleet Evaluation & Benchmarking | A/B testing fleet configs and measuring whether the fleet is worth it. | |
| 32b | Multi-Modal & Extended Capabilities | Computer use, extended thinking, structured outputs, vision. | |
| | **PART 10 — THE ADMIRAL** | *The human element.* | [`part10-admiral.md`](part10-admiral.md) |
| 33 | Admiral Self-Calibration | Bottleneck detection, trust calibration, and growth trajectory. | |
| 34 | Human-Expert Routing | When the fleet needs expertise the Admiral doesn't have. | |
| 35 | Multi-Operator Governance | Multiple operators governing a single fleet: tiers, conflict resolution, handoff. | |
| | **PART 11 — PROTOCOLS** | *The universal operating rules every agent follows.* | [`part11-protocols.md`](part11-protocols.md) |
| 36 | Standing Orders | Fifteen non-negotiable rules loaded into every agent's standing context. | |
| 37 | Escalation Protocol | How and when agents stop work and flag issues upward. | |
| 38 | Handoff Protocol | Structured format for transferring work between agents. | |
| 39 | Human Referral Protocol | When and how specialists recommend consulting a human professional. | |
| 40 | Paid Resource Authorization | Human-authorized access to paid software, licenses, and subscriptions. | |
| 41 | Data Sensitivity Protocol | Deterministic enforcement preventing PII, secrets, and credentials from entering persistent storage. | |
| | **INTENT ENGINEERING** | *The shared dialect between Admirals and Brains.* | [`intent-engineering.md`](intent-engineering.md) |
| — | Intent Engineering | Structuring instructions around outcomes, values, constraints, failure modes, and judgment boundaries. | |
| — | The Six Elements of Intent | Goal, Priority, Constraints, Failure Modes, Judgment Boundaries, Values. | |
| — | The Human Inflection Point | Where the agent's authority ends and the human's begins. This shall not be worked around. | |
| | **GOVERNANCE PLATFORM** | *The paradigm shift: from toolkit to operating environment.* | [`governance-platform.md`](governance-platform.md) |
| — | The Paradigm Shift | Infrastructure must handle chaos, not elegance. Air traffic control, not flight plans. | |
| — | The Four Pillars | Visibility, Control, Policy, Recovery — the foundations of fleet governance. | |
| — | Chaos-First Architecture | Designing for the messy reality of production agent fleets. | |
| | **FLEET CONTROL PLANE** | *The real-time operational surface.* | [`fleet-control-plane.md`](fleet-control-plane.md) |
| — | The Command Center | Fleet status, agent detail, task flow — the single management interface. | |
| — | Alert System | Classification, fatigue prevention, and actionable notifications. | |
| — | Operator Interventions | Pause, halt, kill, reroute, override — with audit trail. | |
| | **PROGRESSIVE AUTONOMY** | *The four stages from manual oversight to full autonomy.* | [`progressive-autonomy.md`](progressive-autonomy.md) |
| — | The Four Stages | Manual Oversight → Assisted Automation → Partial Autonomy → Full Autonomy. | |
| — | The Autonomy Matrix | Different capabilities at different stages in the same fleet. | |
| — | Trust Mechanics | How trust is earned, tracked, and withdrawn per category. | |
| | **INEVITABLE FEATURES** | *The three features that create operational lock-in through genuine value.* | [`inevitable-features.md`](inevitable-features.md) |
| — | Fleet-Wide Causality Tracing | From "something broke" to "here is exactly why." | |
| — | Living Operational Memory | The Brain at three months: institutional wisdom, not just storage. | |
| — | Predictive Fleet Health | From reactive to proactive: predicting failures before they happen. | |
| | **APPENDICES** | | [`appendices.md`](appendices.md) |
| A | Pre-Flight Checklist | Go/no-go gate before fleet deployment. | |
| B | Quick-Start Sequence | Level-structured operational order for standing up a new fleet. | |
| C | Worked Example | A complete SaaS application fleet, end to end. | |
| D | Case Studies | Four case studies: ungoverned, over-engineered, security-first, and reference implementation (Admiral-builds-Admiral). | |
| E | Platform Integration Patterns | How to use Admiral with Claude Code, Agent SDKs, and orchestration frameworks. | |
| F | Framework Versioning | Version policy, migration between versions, agent definition versioning. | |
| G | Implementation Status Map | Category 1/2/3 implementability for every framework component. | |
