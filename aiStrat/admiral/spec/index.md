# THE FLEET ADMIRAL FRAMEWORK

**A Workforce Toolkit for Autonomous AI Agent Fleets**

v0.18.8-alpha.1773791219509 · March 2026

-----

## What This Is

AI agents are not employees and they are not code. You cannot manage them with HR policies and you cannot validate them with traditional software tests. They are an entirely new category of resource — non-deterministic, amnesiac between sessions, prone to novel failure modes (hallucination, sycophantic drift, scope creep, context starvation), and incapable of learning from being told something twice. The people deploying agent fleets who recognize this have a massive head start over those still trying to make old frameworks fit.

This is a **Swiss army knife for that reality** — a reusable toolkit of patterns, agent definitions, enforcement strategies, and operational knowledge designed from scratch for how agents actually behave. It is the workforce itself, not overhead for building a specific product.

Pick the parts you need. A two-person team might use only the enforcement spectrum (Part 3) and five agent definitions. A platform team might deploy the full Brain, Monitor, and Fleet. The framework scales to what you need — you don't adopt all of it to use any of it.

-----

## Framework Lenses

Admiral is described through three different decompositions depending on context. These are complementary views of the same system, not competing taxonomies.

| Lens | Count | Names | Used Where | Purpose |
|---|---|---|---|---|
| **Repository Pillars** | 3 | Doctrine (`admiral/`), Fleet (`fleet/`), Design Artifacts (`brain/`, `monitor/`) | AGENTS.md, README.md | Organizes the file structure — where things live |
| **Pitch Pillars** | 5 | Role Architecture, Decision Authority & Enforcement, Visibility & Control Plane, Coordination & Execution, Institutional Memory (Brain) | Sales conversations, external communication | Explains what Admiral does — capability framing for non-technical audiences |
| **Scaling Components** | 7 | Brain, Fleet, Enforcement, Control Plane, Security, Protocols, Data Ecosystem | Per-Component Scaling (below), Quick-Start Profiles | Defines what you deploy and at what level — the operational building blocks |

The three Repository Pillars contain the seven Scaling Components. The five Pitch Pillars regroup the same capabilities for audience clarity. All three lenses describe the same framework.

-----

## Thesis

Admiral is **the operational infrastructure for AI workforces.**

Infrastructure platforms succeed when they enable a new way of operating, not just a new tool. Kubernetes enabled thousands of containers. Stripe enabled global payments overnight. Datadog enabled massive microservice architectures. Each one changed how organizations behaved.

Admiral enables a new form of organization: **the hybrid organization where AI agents are permanent, persistent members of the operational structure** — not tools invoked on demand, but workers with roles, responsibilities, memory, governance, and accountability. This form of organization is currently too dangerous to run. Five structural gaps prevent it: session amnesia, unenforced constraints, undetected compound failures, all-or-nothing trust, and no safe pause/resume. Admiral closes each one.

The new behavior Admiral enables: *treating AI capacity as an operational workforce, not a feature.*

See [`thesis.md`](../extensions/thesis.md) for the full analysis. *External reference: `research/future-operations.md` in the homebase repo root contains the underlying thought experiment.*

-----

## Per-Component Scaling

You don't need to read 200 pages before deploying your first agent. Each component scales independently — pick the level that matches your need for each one. Start with the Starter profile. Advance individual components when you hit their limits.

### Component Progression

| Component | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
|---|---|---|---|---|---|
| **Brain** (B) | File-based JSON, git-tracked, keyword search | SQLite + embeddings, semantic search | Postgres + pgvector + MCP, multi-agent concurrent access | — | — |
| **Fleet** (F) | Solo agent, Admiral as operator | 5–11 agents, Orchestrator routing, interface contracts | 12–20 agents + governance agents, decision authority tiers enforced | 20–40 agents, multi-orchestrator, federation | — |
| **Enforcement** (E) | Critical hooks only: token budget, loop detection, context health | Extended: model tier validation, identity validation, periodic monitoring | Full governance: heartbeat, cross-fleet coordination, async hooks | — | — |
| **Control Plane** (CP) | CLI Dashboard: terminal status, event logging, runaway detection | Fleet Dashboard: web UI, alerts, traces, basic intervention | Governance Dashboard: audit trail, policy management, governance health | Operations Dashboard: trend analysis, cost forecasting, external integrations | Federation Dashboard: cross-fleet, multi-operator governance |
| **Security** (S) | Structural validation + injection detection (Layers 1-2, LLM-free) | Full deterministic semantic analysis (Layer 3, LLM-airgapped) + LLM advisory (Layer 4, reject-only) | Full immune system with antibody learning (Layer 5) + zero-trust identity | — | — |
| **Protocols** (P) | All 15 Standing Orders loaded, critical escalations, informal handoff | Structured escalation/handoff with JSON schema validation, interface contracts | Automated trust calibration, SO drift detection, cross-domain referral routing | — | — |
| **Data Ecosystem** (DE) | Manual observation (Admiral closes loop) | Capture & Store (raw data collection, manual review) | Automated attribution (3 loops active, 3 agents deployed) | Full ecosystem (all 6 loops, all 5 agents, all 7 datasets) | Autonomous optimization (expanded autonomous tiers, predictive) |

A dash (—) means the component has reached its maximum level. Not every component needs five levels.

**Notation:** `B2+` means "Brain Level 2 or higher." A full configuration is a tuple: `B1 F1 E1 CP1 S1 P1 DE1`. Components are always listed in this order: Brain, Fleet, Enforcement, Control Plane, Security, Protocols, Data Ecosystem.

### Quick-Start Profiles

These are recommended combinations that satisfy all dependency rules. Start with Starter. Advance individual components when you hit their limits, or advance the whole profile when you're ready.

| Profile | B | F | E | CP | S | P | DE | Config Time | Build Time | When to Advance |
|---|---|---|---|---|---|---|---|---|---|---|
| **Starter** | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 30 min | 1–2 days | Need multiple specialists coordinating |
| **Team** | 2 | 2 | 1 | 2 | 1 | 2 | 2 | 2–4 hours | 1–2 weeks | Drift compounds across sessions |
| **Governed** | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 1–2 days | 2–4 weeks | Need scale or continuous operation |
| **Production** | 3 | 3 | 3 | 4 | 2 | 3 | 4 | 1–2 weeks | 1–2 months | Multiple fleets needed |
| **Enterprise** | 3 | 4 | 3 | 5 | 3 | 3 | 5 | 2–4 weeks | 2–4 months | Target state |

### Decision Workflow Quick Reference

Every agent decision follows the four-tier authority model (SO-05). The **Context Source Routing chain** (Part 2, SO-11) defines where agents look for information at each tier:

| Tier | Action | Context Source | Brain Required? |
|---|---|---|---|
| **Enforced** | Hooks handle it — agent doesn't decide | N/A | No |
| **Autonomous** | Proceed and log | Loaded context (standing + session + working) | Optional |
| **Propose** | Draft with rationale, wait for approval | Loaded context → Brain query → draft proposal | **Yes** — query before drafting |
| **Escalate** | Stop work, flag immediately | Loaded context → Brain query → escalation report | **Yes** — query before escalating |

The `brain_context_router` hook (PostToolUse, advisory) detects Propose/Escalate decisions made without a preceding `brain_query` and emits a warning. See Part 3 (Hook-Brain Integration) and Part 5 (Brain Integration with Decision Authority Tiers) for details.

> **Mix and match.** Profiles are starting points, not rules. You can run B1 with F3 if your fleet doesn't need semantic search. You can run B3 with F1 if a solo agent needs deep memory. The only constraint is the dependency matrix below.

### Cross-Component Dependencies

These constraints are enforced at configuration time. A configuration that violates any of these is invalid.

| If you choose... | You must also have... | Why |
|---|---|---|
| F2+ | P1+ | Routing requires Standing Orders |
| F3+ | E2+ | Governance agents need identity validation |
| E2+ | F2+ | Tier validation needs fleet roster |
| E3 | F3+ | Heartbeat monitoring needs governance agents |
| B3 | CP2+ | MCP infrastructure needs fleet dashboard for health monitoring |
| DE3+ | B2+ | Automated attribution needs semantic search (embeddings) |
| DE4+ | F3+ | Ecosystem agents need a governed fleet |
| CP3+ | F3+ | Governance dashboard needs governance agents to monitor |
| S3 | B2+ | Antibody patterns need embeddings for storage |
| P2+ | F2+ | Structured handoffs need multiple agents |
| P3 | F3+ | Trust calibration needs governance infrastructure |

**The most common mistake is starting at Enterprise.** The administrative overhead of 40+ agents, a full Brain, and 7 governance agents exceeds the value for any project that hasn't yet validated its fleet's core workflow. Start with the Starter profile.

> **The second most common mistake is building Production-level artifacts "while you're at it."** Starter means one agent. Do not build handoff protocols (there's no one to hand off to), escalation routing (there's no one to escalate through), governance heartbeat monitors (there are no governance agents), tier validation hooks (there's no fleet roster), or empty placeholder packages for future component levels. These add complexity without value and violate the Boundaries principle (Part 1): if it's not needed now, it's a non-goal. Define the *models* for progressive hardening (e.g., the identity model should exist so it can grow), but do not implement features that have no consumer at the current component level. Build what the Starter profile requires, deploy it as live enforcement, and stop.

> **Config time vs. build time:** The profiles have two time dimensions. **Config time** is for deploying Admiral on an existing platform (e.g., writing AGENTS.md and hooks for Claude Code). **Build time** is for implementing Admiral as code (building a hook engine, data models, test suites) — expect significantly longer. The reference implementation needed ~5,500 lines of Python, 148 tests, and 2 days plus a review cycle to reach verified Starter-profile completion. See Case Study 4 in Appendix D for the full account.

### What Each Component Adds

**Brain (B1 → B2 → B3):** B1 gives you persistent memory as flat files. B2 adds semantic search — queries match by meaning, not keywords. B3 adds concurrent multi-agent access via MCP, full vector indexing, and production-grade storage. Advance when keyword search misses relevant entries >30% of the time (B1→B2) or when multiple agents query simultaneously (B2→B3).

**Fleet (F1 → F2 → F3 → F4):** F1 is one agent doing everything. F2 adds coordinated specialists — the Orchestrator decomposes work, routes to the right agent, and enforces handoff contracts. This is where most of the productivity gain lives. F3 adds the fleet's immune system: governance agents that catch failure modes compounding across sessions. F4 adds multi-orchestrator coordination for scale.

**Enforcement (E1 → E2 → E3):** E1 deploys the three critical hooks — token budget gate, loop detection, context health. These fire deterministically regardless of context pressure. E2 adds model tier validation and identity hardening. E3 adds governance heartbeat monitoring and cross-fleet coordination with async hook execution.

**Control Plane (CP1 → CP2 → CP3 → CP4 → CP5):** CP1 is `htop` for agents — terminal status, event logging, runaway alerts. Each level adds scope: fleet-wide view (CP2), governance health and audit trail (CP3), trend analysis and cost forecasting (CP4), cross-fleet federation (CP5). The Control Plane exists at every level — it is not a luxury.

**Security (S1 → S2 → S3):** S1 validates structure and catches injection attacks with deterministic rules — no LLM involved. S2 adds the full five-layer quarantine including LLM-airgapped semantic analysis and LLM advisory (reject-only). S3 adds antibody learning and zero-trust identity verification.

**Protocols (P1 → P2 → P3):** P1 loads all 15 Standing Orders into every agent's context — these are non-negotiable at every level. P2 adds structured escalation and handoff with JSON schema validation. P3 adds automated trust calibration and SO drift detection.

**Data Ecosystem (DE1 → DE2 → DE3 → DE4 → DE5):** DE1 is the Admiral manually observing patterns. DE2 captures raw data. DE3 deploys 3 agents and activates 3 feedback loops for automated attribution. DE4 deploys all 5 agents, all 6 loops, all 7 datasets. DE5 expands autonomous tiers based on earned trust.

### Minimum Viable Reading Path

If you are starting with the Starter profile, you do not need to read the entire framework. **Start with [`QUICKSTART.md`](../../QUICKSTART.md)** — a linear, step-by-step guide to deploy your first governed agent with one hook in under 2 hours. For deeper context, these six files (~800 lines of targeted reading) give you everything else you need. Read the rest when you need it.

| Order | File | What to Read | Why |
|---|---|---|---|
| 1 | [`index.md`](index.md) | Glossary + Component Scaling | Shared vocabulary and your roadmap. |
| 2 | [`part1-strategy.md`](part1-strategy.md) | Full file | Mission, Boundaries, Success Criteria — the three inputs every agent needs. |
| 3 | [`part3-enforcement.md`](part3-enforcement.md) | Deterministic Enforcement only | The enforcement spectrum: hooks over instructions. Decision Authority and Configuration Security are F2+ — read them when you add a fleet. |
| 3.5 | [`intent-engineering.md`](../extensions/intent-engineering.md) | Six Elements of Intent | How to write mission, boundaries, and task assignments that give agents enough context to handle unexpected situations. |
| 4 | [`part11-protocols.md`](part11-protocols.md) | Standing Orders only | The sixteen non-negotiable rules loaded into every agent's standing context. |
| 4.5 | [`fleet-control-plane.md`](../extensions/fleet-control-plane.md) | CP1 section | The CLI dashboard: event logging, status, and runaway detection from day one. |
| 5 | [`appendices.md`](appendices.md) | Appendix A (Pre-Flight Checklist) | Go/no-go gate — confirms you have not missed anything critical. |

Start here. Advance individual components when you hit their limits.

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

6. **The Admiral Rating System.** A credit-rating-agency-style certification standard for AI automation. Five-grade scale (ADM-1 through ADM-5), ten universal rating dimensions, applied across agents, fleets, platforms, models, and workflows. Agents aren't humans and they aren't code — the rating system tests behavioral properties, not output correctness. See [`rating-system.md`](../reference/rating-system.md).

Admiral is complementary to agent SDKs and orchestration frameworks. They provide the runtime. Admiral provides the operational doctrine that makes the runtime safe, governed, and effective. See Appendix E for platform integration patterns.

-----

## How to Read This Document

This framework is split across fourteen core files (this index, twelve parts, and an appendices file). Extension documents and reference materials are listed in the Table of Contents below. Each part is a self-contained module that can be loaded into an agent's context independently.

**Humans (Admirals and implementers)** — You are the Admiral. Start here. Read the operating model and glossary, then work through parts in order or jump to whichever part addresses your current need. The prose, anti-patterns, and worked example are for you. This is the framework's primary audience today.

**LLM agents** — Individual part files will be loaded into your context as operational instructions. The TL;DR blocks, templates, and structured formats are for you. When a part file is loaded, treat its constraints as binding and its templates as required output formats. Refer to the glossary below for term definitions. Agent-facing content is designed for context injection — concise, structured, and unambiguous.

**Machines (future)** — CI pipelines, hook scripts, linters, and automation tooling will consume the artifacts this framework produces. Templates, checklists, and structured formats are designed to be parseable. Machine audience support is emerging — see `.github/workflows/spec-validation.yml` for initial CI tooling. Full machine-readable validation is a Production-profile capability.

> **This is not an AGENTS.md file.** It is the meta-framework that generates AGENTS.md files, agent definitions, hook scripts, skill files, and operational artifacts. Your actual configuration files (AGENTS.md, CLAUDE.md, .cursorrules, etc.) should be under 150 lines each. This framework is the source of truth they are distilled from.

-----

## Files

| File | Contents |
|---|---|
| [`index.md`](index.md) | This file. Operating model, glossary, table of contents. |
| [`thesis.md`](../extensions/thesis.md) | The organizational thesis: why Admiral exists and what new form of organization it enables. |
| [`part1-strategy.md`](part1-strategy.md) | Mission, Boundaries, Success Criteria |
| [`part2-context.md`](part2-context.md) | Context Engineering, Ground Truth, Context Window Strategy, Configuration File Strategy |
| [`part3-enforcement.md`](part3-enforcement.md) | Deterministic Enforcement, Decision Authority, Configuration Security |
| [`part4-fleet.md`](part4-fleet.md) | Fleet Composition, Tool & Capability Registry, Model Selection, Protocol Integration |
| [`part5-brain.md`](part5-brain.md) | Brain Architecture, Knowledge Protocol, Intelligence Lifecycle |
| [`part6-execution.md`](part6-execution.md) | Work Decomposition, Parallel Execution Strategy, Swarm Patterns |
| [`part7-quality.md`](part7-quality.md) | Quality Assurance, Failure Recovery, Known Agent Failure Modes |
| [`part8-operations.md`](part8-operations.md) | Institutional Memory, Adaptation Protocol, Cost Management, Fleet Health Metrics, Orchestrator Health Protocol, Fleet Scaling & Lifecycle, Inter-Fleet Governance |
| [`part9-platform.md`](part9-platform.md) | Fleet Observability, CI/CD & Event-Driven Operations, Fleet Evaluation & Benchmarking, Multi-Modal & Extended Capabilities |
| [`part10-admiral.md`](part10-admiral.md) | Admiral Self-Calibration, Human-Expert Routing, Multi-Operator Governance |
| [`part11-protocols.md`](part11-protocols.md) | Standing Orders, Escalation, Handoffs, Human Referral, Paid Resource Authorization, Data Sensitivity |
| [`intent-engineering.md`](../extensions/intent-engineering.md) | Intent Engineering: the shared dialect between Admirals and Brains |
| [`governance-platform.md`](../extensions/governance-platform.md) | The paradigm shift: ATC, not flight plans. Four pillars. Chaos-first architecture. |
| [`fleet-control-plane.md`](../extensions/fleet-control-plane.md) | Real-time operational surface: dashboard, alerts, interventions. |
| [`progressive-autonomy.md`](../extensions/progressive-autonomy.md) | Four stages from manual oversight to full autonomy. |
| [`inevitable-features.md`](../extensions/inevitable-features.md) | The three features that make Admiral indispensable. |
| [`rating-system.md`](../reference/rating-system.md) | The Admiral Rating System — the standard benchmark for AI automation ratings |
| [`part12-data-ecosystem.md`](part12-data-ecosystem.md) | Closed-Loop Architecture, Data Streams, Enrichment & Attribution, Ecosystem Agents, Feedback Loops, Dataset Strategy, Implementation Levels |
| [`appendices.md`](appendices.md) | Pre-Flight Checklist, Quick-Start Sequence, Worked Example |

-----

## The Operating Model

You are the Admiral. You provide the strategic context, constraints, and clarity that no AI can generate for itself. You may be a human operator, a meta-agent orchestrating other agents, or a hybrid of both. What matters is not whether you write code — it is whether the fleet has the context it needs to operate autonomously within defined boundaries. Your primary communication skill is **intent engineering** — structuring instructions around outcomes, values, constraints, failure modes, and judgment boundaries so that agents encountering unexpected situations can either make the right call or know that they cannot. See [`intent-engineering.md`](../extensions/intent-engineering.md).

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
| **Absence context** | What an agent explicitly does not know and must not assume. Negative tool lists, non-goals, "does not have access to" declarations. One of the five dimensions of context (Part 2). |
| **Admiral** | The operator of a fleet. May be a human, a meta-agent, or a hybrid. Provides strategic context, sets boundaries, calibrates trust, and holds Escalate-tier authority. |
| **Agent Card** | A structured description published by an A2A agent declaring its capabilities, accepted input formats, and authentication requirements. Used for agent discovery. |
| **Anti-pattern** | A documented failure mode arising from a common but counterproductive practice. Each anti-pattern in this framework names the bad practice, describes why it fails, and references the section that prevents it. |
| **Attribution chain** | The causal link from customer engagement event → AI agent decision → customer outcome. The Attribution Engine (Part 12) creates and maintains these chains. The depth of attribution chains determines the quality of feedback loops. |
| **Attribution lag** | The time elapsed between an AI agent decision and the customer outcome it influenced. Varies from minutes (direct interaction) to weeks (strategic impact). The attribution pipeline runs continuously to close gaps. |
| **Autonomous tier** | Decision authority level where the agent proceeds without asking. Logs the decision. Used for low-risk, reversible decisions within established patterns. |
| **Backtracking** | Recovery strategy where an agent rolls back to a saved checkpoint and tries a fundamentally different path, rather than retrying variations of the failed approach. |
| **Brain** | The fleet's long-term memory: a Postgres + pgvector database accessible via MCP that stores decisions, outcomes, lessons, failures, and patterns as vector embeddings. Transcends sessions, agents, and context windows. See Brain Architecture (Part 5). |
| **brain_query** | MCP tool for semantic search across Brain entries. Returns ranked results by cosine similarity, filtered by project, category, recency, and usefulness. See Knowledge Protocol (Part 5). |
| **brain_record** | MCP tool for writing a new entry to the Brain. Requires project, category, title, and content. Embedding is generated automatically. See Knowledge Protocol (Part 5). |
| **Boundaries** | Explicit constraints on what a project is NOT: non-goals, hard constraints, resource budgets, quality floors, and the LLM-Last boundary. See Boundaries (Part 1). |
| **Cascade map** | The dependency graph between framework artifacts. When one artifact changes, all downstream artifacts must be reviewed and revised. See Strategic Adaptation (Part 8). |
| **Calibration history** | Immutable record of trust calibration changes driven by outcome data. Shows which agents earned or lost autonomy, in what categories, based on what evidence. Part of the closed-loop data ecosystem. See Ecosystem Agents (Part 12). |
| **Checkpoint** | A structured summary written at chunk boundaries recording completed tasks, in-progress work, blockers, decisions, assumptions, and resource consumption. See Institutional Memory (Part 8). |
| **Closed-loop data ecosystem** | The system by which every output (agent decisions, customer outcomes, governance events) becomes an input that improves future outputs. Generates seven proprietary datasets that compound in value. Part 12. |
| **Chunk** | An independently completable, independently verifiable unit of work. Sized to consume no more than 40% of an agent's token budget. See Work Decomposition (Part 6). |
| **Completion bias** | Agent produces complete but degraded output near resource limits. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Configuration accretion** | Instruction files grow after each incident until agents ignore bloated rules. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Configuration injection** | Attack where an adversary modifies agent config files (AGENTS.md, CLAUDE.md, .cursorrules, hooks, skills) in a PR or through compromised CI. See Configuration Security (Part 3). |
| **Continuous AI Landscape Monitor** | Automated surveillance system (`monitor/`) that scans the AI ecosystem — model releases, agent patterns, trending tools — and feeds curated intelligence into the Brain through a quarantine layer. Runs on GitHub Actions (daily + weekly). See Intelligence Lifecycle (Part 5) and Event-Driven Operations (Part 9). |
| **Context engineering** | The discipline of designing information flows across an entire agent system — what information exists where, when, and why. Subsumes prompt engineering. See Context Engineering (Part 2). |
| **Context profile** | Per-role specification of what loads into an agent's context: standing context, session context, on-demand context, refresh triggers, sacrifice order. See Context Profiles (Part 2). |
| **Context starvation** | Agent lacks critical information needed for the task. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Context stuffing** | Agent context overloaded with artifacts "just in case," making output shallow. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Contract-first parallelism** | Coordination pattern where the interface contract between parallel agents is defined before work is dispatched. Neither agent may unilaterally modify the contract. See Contract-First Parallelism (Part 6). |
| **Decision authority** | The four-tier system (Enforced / Autonomous / Propose / Escalate) that defines what an agent may decide, recommend, or must stop and flag. See Decision Authority (Part 3). |
| **Decision log** | Chronological record of every non-trivial decision: timestamp, decision, alternatives considered, rationale, authority tier used. Part of institutional memory. See Institutional Memory (Part 8). |
| **Decay awareness** | Brain mechanism that flags entries not accessed within a configurable window for Admiral review. Knowledge that is never retrieved may be stale. See Brain Architecture (Part 5). |
| **Deterministic enforcement** | Constraints implemented as hooks, CI gates, linters, or type checkers that fire 100% of the time regardless of context pressure. Contrasted with advisory instructions. See Deterministic Enforcement (Part 3). |
| **Embedding** | A vector representation of text that captures semantic meaning. Used by the Brain (pgvector) to match queries by meaning, not keywords. See Brain Architecture (Part 5). |
| **Enforced tier** | Decision authority level handled by hooks, not agent judgment. The agent never makes this decision — the enforcement layer prevents or requires the action deterministically. |
| **Ecosystem agents** | Five agents managing the closed-loop data ecosystem: Engagement Analyst, Trend Analyst, Attribution Engine, Feedback Synthesizer, Ecosystem Health Monitor. See Ecosystem Agents (Part 12). |
| **Escalate tier** | Decision authority level where the agent stops all work and flags to the Admiral immediately. Used for scope changes, budget overruns, security concerns, contradictory requirements. |
| **Error signature** | A normalized representation of a hook failure used for cycle detection. Recommended: the first line of stderr concatenated with the exit code, with timestamps and line numbers stripped. Used by the self-healing loop (see Deterministic Enforcement, Part 3) to detect when an agent is producing the same failure repeatedly. |
| **Escalation report** | Structured document produced when an agent exhausts its recovery ladder: blocker, context, approaches attempted, root cause assessment, what's needed, impact, recommendation. See Failure Recovery (Part 7). |
| **Event-driven agent** | An agent triggered by repository or system events (PR opened, CI failed, scheduled cron) rather than interactive sessions. Requires pre-configured context bootstrapping and narrower authority tiers. See Event-Driven Operations (Part 9). |
| **Exemplar** | A tracked repository representing best-in-class agent tooling (e.g., Claude Code, Aider, Cline). The monitor watches exemplars for releases, configuration changes, and design patterns that should inform fleet configuration. See Intelligence Lifecycle (Part 5). |
| **Failure mode** | A systematic way agent fleets fail. Twenty cataloged in Failure Mode Catalog (Part 7) with primary defenses and warning signs. |
| **Feedback loop** | A mechanism by which outcomes flow back to improve inputs. Six loops in the data ecosystem: agent calibration, Brain strengthening, model tier optimization, product adaptation, governance optimization, ecosystem intelligence. See Six Feedback Loops (Part 12). |
| **Firm guidance** | Constraints in AGENTS.md, system prompts, or tool-specific config files (CLAUDE.md, .cursorrules). High reliability but degradable under context pressure, especially in long sessions. Middle tier of the enforcement spectrum. See Deterministic Enforcement (Part 3). |
| **Fleet** | A coordinated group of AI agents operating under a single orchestrator on a single project. Typically five to twelve specialists. |
| **Fleet evaluation** | The practice of measuring whether a fleet configuration produces better outcomes than alternatives, through controlled A/B testing and benchmarking against baselines. See Evaluation & Benchmarking (Part 9). |
| **Fleet observability** | The ability to understand fleet behavior through traces, logs, and metrics at the individual operation level. Monitoring tells you something is wrong; observability tells you why. See Fleet Observability (Part 9). |
| **Fleet pause protocol** | Six-step procedure for halting fleet operations, collecting checkpoints, cascading changes through artifacts, re-validating, rebriefing, and resuming. See Strategic Adaptation (Part 8). |
| **Ground truth** | The single source of reality for the fleet: domain ontology, tech stack versions, access/permissions, known issues, configuration artifacts. See Ground Truth (Part 2). |
| **Handoff document** | Narrative briefing written at session end, designed to be loaded at the next session start. Captures intent and reasoning, not just status. See Institutional Memory (Part 8). |
| **Hard enforcement** | Hooks, CI gates, linters, type checkers — mechanisms that fire deterministically regardless of context. Top tier of the enforcement spectrum. See Deterministic Enforcement (Part 3). |
| **Hierarchical drift** | Specialists drift upward and make orchestrator-level decisions. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Hook** | An executable program (shell script, Python, compiled binary) invoked by the agent runtime at a defined lifecycle point. Receives structured JSON on stdin, returns exit code (0=pass, non-zero=block) with stdout fed back to the agent. Timeout-enforced, idempotent, sandboxed. See Deterministic Enforcement (Part 3). |
| **Intelligence lifecycle** | The eight-stage pipeline for Brain knowledge: Capture → Embed → Store → Retrieve → Strengthen → Link → Surface → Review. See Intelligence Lifecycle (Part 5). |
| **Instruction decay** | Rules followed initially but ignored as session lengthens and context pressure builds. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Interface contract** | The defined format for handoffs between agents: what the sender delivers, what the receiver returns. See Fleet Composition (Part 4). |
| **Knowledge graph** | The network of linked Brain entries. Entries connected by relationship types (supports, contradicts, supersedes, elaborates, caused_by) that agents can traverse for reasoning chains. See Intelligence Lifecycle (Part 5). |
| **Knowledge protocol** | The MCP server interface that exposes the Brain to any AI agent. Tools: brain_record, brain_query, brain_retrieve, brain_strengthen, brain_supersede, brain_status, brain_audit, brain_purge. See Knowledge Protocol (Part 5). |
| **LLM-Last** | Design principle: if a deterministic tool (linter, type checker, formatter, regex) can do it, the LLM should not. Highest-impact cost and reliability lever. See Boundaries (Part 1). |
| **Computer use** | Agent capability to interact with graphical user interfaces — clicking, typing, scrolling, reading screen content. Requires sandboxed environment, strict time limits, and narrow Autonomous tier. See Multi-Modal Capabilities (Part 9). |
| **Extended thinking** | Dedicated reasoning tokens consumed before the model's response begins. Deeper reasoning, not longer output. 5-50x output volume. Must be budgeted separately. See Multi-Modal Capabilities (Part 9). |
| **Human inflection point** | A moment during execution where the correct action requires human judgment, taste, ethics, or strategic context that an LLM cannot derive from training data. The agent must stop and ask. See `admiral/extensions/intent-engineering.md`. |
| **Identity token** | Cryptographically signed, session-scoped, non-delegable credential binding an agent to a specific project, role, authority tier, and session. Verified by the Brain MCP server on every request. See Knowledge Protocol (Part 5). |
| **Intent engineering** | The practice of structuring instructions around outcomes, values, constraints, failure modes, and judgment boundaries — not just outputs. The evolution beyond prompt engineering and context engineering. The shared dialect between Admirals and Brains. See `admiral/extensions/intent-engineering.md`. |
| **MCP** | Model Context Protocol. Open standard (Anthropic, now Linux Foundation) for connecting agents to tools and data sources. Supports streaming, subscriptions, and discovery with trust signals. "USB-C for AI." |
| **Multi-hop retrieval** | Brain retrieval pattern that follows entry links to return full reasoning chains — cause → decision → outcome → consequence — not just the directly matching entry. Maximum depth: 3. See Intelligence Lifecycle (Part 5). |
| **MCP server** | A tool provider implementing the MCP standard. Extends agent capabilities. Must be registered, scoped, version-pinned, and audited. See Tool Registry (Part 4) and Protocol Integration (Part 4). |
| **Memory poisoning** | Attack where an adversary implants false information into agent long-term storage that persists across all future sessions. See Configuration Security (Part 3). |
| **Möbius Loop** | The Brain's self-improving feedback mechanism. Reads emit demand signals (writes). Writes trigger contradiction scans (reads). Self-instrumentation records Brain health as Brain entries. Consuming knowledge and improving knowledge are one continuous surface. See The Möbius Loop (Part 5). |
| **Meta-agent** | An AI agent serving as the Admiral — managing fleet composition, updating Ground Truth, making strategic decisions. Must have the most heavily enforced constraints. See Admiral Self-Calibration (Part 10). |
| **Mission** | One sentence defining what the project is. One sentence defining success. The gravitational center every agent decision orbits. See Mission (Part 1). |
| **Negative tool list** | Explicit declaration of tools and capabilities an agent does NOT have. Primary defense against phantom capabilities. See Tool Registry (Part 4). |
| **Non-goals** | Explicit statements of what the project is NOT. More powerful than goals because they eliminate entire categories of work. Part of Boundaries. See Boundaries (Part 1). |
| **Observability** | Understanding fleet behavior through external outputs — traces for individual operations, logs for event records, metrics for aggregate health. Distinct from monitoring: monitoring detects problems; observability diagnoses them. See Fleet Observability (Part 9). |
| **Outcome attribution** | The process of connecting a customer outcome to the AI agent decision that caused it. Three types: direct (agent explicitly names the interaction), temporal (outcome within time window), semantic (outcome description matches decision). See Data Enrichment Pipeline (Part 12). |
| **Orchestrator** | The coordinating agent that decomposes goals into tasks, routes to specialists, manages progress, and enforces standards. Does not write production code. |
| **Phantom capabilities** | Agent assumes tools or access it does not have. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Progressive disclosure** | Loading strategy where knowledge is provided on-demand via skills rather than front-loaded at startup. Preserves context window capacity. See Configuration File Strategy (Part 2). |
| **Prompt anatomy** | Standard structure for agent system prompts: Identity → Authority → Constraints → Knowledge → Task. See Context Engineering (Part 2). See also: [`fleet/prompt-anatomy.md`](../../fleet/prompt-anatomy.md) for the full reference specification. |
| **Propose tier** | Decision authority level where the agent drafts the decision with rationale, presents alternatives, and waits for approval. Used for architecture changes, schema migrations, new dependencies. |
| **Quarantine** | Five-layer immune system that validates all external content before it enters the Brain. Layers 1-3 are completely LLM-airgapped; Layer 4 is LLM advisory (reject-only); Layer 5 generates antibodies. See Configuration Security (Part 3). |
| **Quality floor** | Minimum acceptable quality bar, defined concretely. Prevents infinite refinement by defining "good enough." Part of Boundaries. See Boundaries (Part 1). |
| **Recovery ladder** | Five-step sequence agents follow when things go wrong. See Failure Recovery (Part 7) for the full ladder and backtracking requirements. |
| **Routing logic** | Rules the orchestrator uses to assign tasks to specialists: by task type, by file ownership, or by escalation. See Fleet Composition (Part 4). |
| **Scope creep** | Agents add unrequested features that collectively blow the budget. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Seed candidate** | A proposed Brain entry generated by the Continuous AI Landscape Monitor with `"approved": False`. Requires Admiral review before activation. Ensures external intelligence is curated, not blindly ingested. See Intelligence Lifecycle (Part 5). |
| **Self-healing quality loop** | Pattern where a hook detects a failure (lint error, test failure, type error), feeds the output back to the agent, the agent fixes it, and the hook re-checks. See Deterministic Enforcement (Part 3). |
| **Session amnesia** | Agent loses critical context between sessions despite checkpointing. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Silent failure** | Agent encounters an error and works around it without logging. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Skill** | A modular knowledge unit that loads into an agent's context only when a file pattern, keyword, or domain context matches. Implementation varies by tool (e.g., `.claude/skills/*.md` in Claude Code, `.cursor/rules/` in Cursor). See Configuration File Strategy (Part 2). |
| **Soft guidance** | Constraints in code comments, READMEs, or verbal instructions. Low reliability. Bottom tier of the enforcement spectrum. See Deterministic Enforcement (Part 3). |
| **Strengthening** | Brain mechanism where retrieved entries accumulate usefulness signals from consuming agents. High-usefulness entries rank higher in future queries. See Brain Architecture (Part 5). |
| **Spec-first pipeline** | Structured workflow: Requirements Spec → Design Spec → Task Decomposition → Implementation. Each phase produces artifacts feeding the next. See Work Decomposition (Part 6). |
| **Standing context** | The portion of an agent's context window that is always loaded: Mission, Boundaries, role definition, Ground Truth essentials. Typically 15–25% of the window. See Context Profiles (Part 2). |
| **Success criteria** | Machine-verifiable definition of "done" for a task: functional, quality, completeness, and negative criteria. See Success Criteria (Part 1). |
| **Swarm** | Advanced orchestration pattern where agents self-organize under a queen agent rather than following top-down routing. See Swarm Patterns (Part 6). |
| **Supersession** | Brain mechanism where outdated entries are not deleted but linked to their replacement via `superseded_by`. Preserves full decision history while defaulting to current knowledge. See Brain Architecture (Part 5). |
| **Sycophantic drift** | Agents increasingly agree with established framing over long sessions. See Failure Mode Catalog (Part 7) for diagnosis and defense. |
| **Trace** | An end-to-end record of a task as it flows through multiple agents, tools, and systems. Enables debugging specific failures by showing exactly what happened, in what order, at what cost. See Fleet Observability (Part 9). |
| **Trust calibration** | The practice of measuring and adjusting an agent's Autonomous tier based on track record. Earned per category, not globally. Withdrawn precisely after failures. See Admiral Self-Calibration (Part 10). |

-----

## Relationship to the Fleet and Monitor

The `fleet/` directory provides 71 core agent definitions (plus 34 extended agents in `fleet/agents/extras/`) organized by category. The `monitor/` directory specifies the continuous intelligence pipeline. The `brain/` directory contains the database schema and architecture specification for long-term memory.

| Admiral Topic | Companion Specification |
|---|---|
| Fleet Composition (Part 4) | `fleet/agents/` — agent definitions by category |
| Context Engineering (Part 2) | `fleet/prompt-anatomy.md`, `fleet/context-injection.md` |
| Decision Authority (Part 3) | Each agent definition includes a Decision Authority table |
| Model Selection (Part 4) | `fleet/model-tiers.md` — tier assignments for every agent |
| Fleet Composition — Routing (Part 4) | `fleet/routing-rules.md` — task-to-agent routing decision table |
| Brain Architecture (Part 5) | `brain/schema/001_initial.sql` — Postgres + pgvector schema |
| Protocols (Part 11) | Authoritative source; agents reference these protocols |
| Intelligence & Operations (Parts 4, 5, 8, 9) | `monitor/README.md` — ecosystem scanning, quarantine, seed generation |
| Configuration File Strategy (Part 2) | `AGENTS.md` — canonical model-agnostic instruction file; `CLAUDE.md` — Claude Code pointer |
| Deterministic Enforcement (Part 3) | `hooks/README.md` — hook ecosystem spec; `hooks/manifest.schema.json` — hook manifest schema |
| Data Ecosystem (Part 12) | `fleet/agents/extras/ecosystem.md` — closed-loop ecosystem agents; `brain/schema/002_data_ecosystem.sql` — ecosystem schema extension |
| Handoff Protocol (Part 11) | `handoff/v1.schema.json` — canonical JSON Schema for handoff validation |
| Configuration Security (Part 3) | `attack-corpus/README.md` — attack corpus spec and seed scenarios for Layer 3 |

> **Admiral is the engineering manual. Fleet is the parts catalog. Brain is the memory architecture. Monitor is the intelligence service. The Data Ecosystem is the flywheel.** Use the admiral to learn *what to do and why*. Use the fleet to learn *how to do it with specific agents*. Use the brain and monitor specs to understand *how knowledge persists and ecosystem intelligence flows*. Use the data ecosystem spec to understand *how every output becomes an input that compounds fleet intelligence*.

-----

## Table of Contents

Topics are ordered by impact and grouped by relevance.

| Topic | One-Line Summary | File |
|---|---|---|
| **PART 1 — STRATEGY** | *What are we building, what are the walls, and how do we know when we're done?* | [`part1-strategy.md`](part1-strategy.md) |
| Mission | The gravitational center every agent decision orbits. | |
| Boundaries | What the project is NOT — the single most effective tool against drift. | |
| Success Criteria | What "done" looks like, in terms a machine can verify. | |
| **PART 2 — CONTEXT** | *How does the right information reach the right agent at the right time?* | [`part2-context.md`](part2-context.md) |
| Context Engineering | The master discipline: designing information flows across the fleet. | |
| Ground Truth | The single source of reality for the world agents operate in. | |
| Context Window Strategy | How to allocate, load, and refresh an agent's working memory. | |
| Configuration File Strategy | How instruction files are structured, layered, and kept under 150 lines. | |
| **PART 3 — ENFORCEMENT** | *The gap between "should" and "must."* | [`part3-enforcement.md`](part3-enforcement.md) |
| Deterministic Enforcement | Hooks fire every time. Instructions can be forgotten. Know which is which. | |
| Decision Authority | What agents may decide, what they propose, and what they must escalate. | |
| Configuration Security | Agent configs are attack surfaces. Defend them like production code. | |
| **PART 4 — FLEET** | *Who does what, with what tools, on what models, speaking what protocols?* | [`part4-fleet.md`](part4-fleet.md) |
| Fleet Composition | Agent roster, routing logic, interface contracts, role boundaries. | |
| Tool & Capability Registry | What each agent can do — and explicitly cannot do. | |
| Model Selection | Matching model capability to role requirements across four tiers. | |
| Protocol Integration | MCP for tool access. A2A for agent-to-agent communication. | |
| **PART 5 — THE BRAIN** | *How does the fleet remember?* | [`part5-brain.md`](part5-brain.md) |
| Brain Architecture | Postgres + pgvector: the fleet's long-term memory with semantic understanding. | |
| The Knowledge Protocol | MCP server interface — any agent speaks to the Brain, now and always. | |
| Intelligence Lifecycle | How knowledge enters, strengthens, links, surfaces, and compounds over time. | |
| **PART 6 — EXECUTION** | *How work gets planned, parallelized, and completed.* | [`part6-execution.md`](part6-execution.md) |
| Work Decomposition | Breaking goals into chunks sized for full attention. | |
| Parallel Execution Strategy | Coordination patterns that prevent assumption divergence. | |
| Swarm Patterns | When and how to move beyond hierarchical orchestration. | |
| **PART 7 — QUALITY** | *How the fleet maintains standards and handles failure.* | [`part7-quality.md`](part7-quality.md) |
| Quality Assurance | Who checks, how they check, and what happens when the check fails. | |
| Failure Recovery | The recovery ladder: retry, fallback, backtrack, isolate, escalate. | |
| Known Agent Failure Modes | A field guide to twenty systematic ways agent fleets fail. | |
| **PART 8 — OPERATIONS** | *How work persists, adapts, and scales over time.* | [`part8-operations.md`](part8-operations.md) |
| Institutional Memory | Session persistence patterns that survive context window boundaries. | |
| Adaptation Protocol | Controlled response to change: tactical, strategic, and full pivot. | |
| Cost Management | Token economics, model tier optimization, and budget controls. | |
| Fleet Health Metrics | What to measure, what healthy looks like, and what to do when it doesn't. | |
| Fleet Scaling & Lifecycle | How fleets grow, shrink, and transition across project phases. | |
| Orchestrator Health Protocol | Heartbeat monitoring, failover, and recovery for the Orchestrator. | |
| Inter-Fleet Governance | Isolation, controlled sharing, and cross-fleet review across projects. | |
| **PART 9 — PLATFORM** | *The infrastructure that surrounds the fleet.* | [`part9-platform.md`](part9-platform.md) |
| Fleet Observability | Why a specific agent failed on a specific task — traces, not just metrics. | |
| CI/CD & Event-Driven Operations | Agents triggered by PRs, CI failures, schedules, and webhooks. | |
| Fleet Evaluation & Benchmarking | A/B testing fleet configs and measuring whether the fleet is worth it. | |
| Multi-Modal & Extended Capabilities | Computer use, extended thinking, structured outputs, vision. | |
| **PART 10 — THE ADMIRAL** | *The human element.* | [`part10-admiral.md`](part10-admiral.md) |
| Admiral Self-Calibration | Bottleneck detection, trust calibration, and growth trajectory. | |
| Human-Expert Routing | When the fleet needs expertise the Admiral doesn't have. | |
| Multi-Operator Governance | Multiple operators governing a single fleet: tiers, conflict resolution, handoff. | |
| **PART 11 — PROTOCOLS** | *The universal operating rules every agent follows.* | [`part11-protocols.md`](part11-protocols.md) |
| Standing Orders | Fifteen non-negotiable rules loaded into every agent's standing context. | |
| Escalation Protocol | How and when agents stop work and flag issues upward. | |
| Handoff Protocol | Structured format for transferring work between agents. | |
| Human Referral Protocol | When and how specialists recommend consulting a human professional. | |
| Paid Resource Authorization | Human-authorized access to paid software, licenses, and subscriptions. | |
| Data Sensitivity Protocol | Deterministic enforcement preventing PII, secrets, and credentials from entering persistent storage. | |
| **PART 12 — THE DATA ECOSYSTEM** | *How the fleet generates compounding intelligence from every interaction.* | [`part12-data-ecosystem.md`](part12-data-ecosystem.md) |
| Closed-Loop Architecture | Every output becomes an input. The flywheel that compounds fleet intelligence. | |
| Data Streams | Four data streams: customer engagement, trends, AI agent output, Admiral operational. | |
| Enrichment & Attribution | Semantic enrichment, outcome attribution, and cross-domain trend extraction. | |
| Ecosystem Agents | Five agents that manage the closed-loop feedback pipeline. | |
| Feedback Loops | Six loops connecting outcomes back to inputs for continuous improvement. | |
| Dataset Strategy | Seven proprietary datasets that compound in value over time. | |
| Implementation Levels | Progressive adoption from manual observation to autonomous optimization. | |
| **PART 13 — PROTOCOL INTEGRATION GUIDE (MCP + A2A)** | *The consolidated practitioner reference for MCP and A2A adoption, testing, and governance.* | [`part13-mcp-integration.md`](part13-mcp-integration.md) |
| Protocol References — Consolidated Map | Navigation table linking all MCP and A2A references across Parts 2–5, 9, 11, and appendices. | |
| MCP Server Selection Framework | Decision criteria, trust classification, addition/removal checklists. | |
| MCP Testing and Validation | Five test levels from connection validation to OWASP MCP Top 10. | |
| Incremental MCP Adoption Path | Six phases from no MCP (Starter) to full protocol maturity (Enterprise). | |
| A2A Testing and Validation | Five test levels from Agent Card discovery to cross-fleet security. | |
| Incremental A2A Adoption Path | Four phases from orchestrator-mediated handoffs to cross-fleet federation. | |
| Protocol Security Checklist | Per-server, per-connection, and fleet-wide review for both MCP and A2A. | |
| Common Protocol Anti-Patterns | Seven MCP and seven A2A anti-patterns with remedies. | |
| **INTENT ENGINEERING** | *The shared dialect between Admirals and Brains.* | [`intent-engineering.md`](../extensions/intent-engineering.md) |
| — Intent Engineering | Structuring instructions around outcomes, values, constraints, failure modes, and judgment boundaries. | |
| — The Six Elements of Intent | Goal, Priority, Constraints, Failure Modes, Judgment Boundaries, Values. | |
| — The Human Inflection Point | Where the agent's authority ends and the human's begins. This shall not be worked around. | |
| **GOVERNANCE PLATFORM** | *The paradigm shift: from toolkit to operating environment.* | [`governance-platform.md`](../extensions/governance-platform.md) |
| — The Paradigm Shift | Infrastructure must handle chaos, not elegance. Air traffic control, not flight plans. | |
| — The Four Pillars | Visibility, Control, Policy, Recovery — the foundations of fleet governance. | |
| — Chaos-First Architecture | Designing for the messy reality of production agent fleets. | |
| **FLEET CONTROL PLANE** | *The real-time operational surface.* | [`fleet-control-plane.md`](../extensions/fleet-control-plane.md) |
| — The Command Center | Fleet status, agent detail, task flow — the single management interface. | |
| — Alert System | Classification, fatigue prevention, and actionable notifications. | |
| — Operator Interventions | Pause, halt, kill, reroute, override — with audit trail. | |
| **PROGRESSIVE AUTONOMY** | *The four stages from manual oversight to full autonomy.* | [`progressive-autonomy.md`](../extensions/progressive-autonomy.md) |
| — The Four Stages | Manual Oversight → Assisted Automation → Partial Autonomy → Full Autonomy. | |
| — The Autonomy Matrix | Different capabilities at different stages in the same fleet. | |
| — Trust Mechanics | How trust is earned, tracked, and withdrawn per category. | |
| **INEVITABLE FEATURES** | *The three features that create operational lock-in through genuine value.* | [`inevitable-features.md`](../extensions/inevitable-features.md) |
| — Fleet-Wide Causality Tracing | From "something broke" to "here is exactly why." | |
| — Living Operational Memory | The Brain at three months: institutional wisdom, not just storage. | |
| — Predictive Fleet Health | From reactive to proactive: predicting failures before they happen. | |
| **APPENDICES** | | [`appendices.md`](appendices.md) |
| A | Pre-Flight Checklist | Go/no-go gate before fleet deployment. | |
| B | Quick-Start Sequence | Profile-structured operational order for standing up a new fleet. | |
| C | Worked Example | A complete SaaS application fleet, end to end. | |
| D | Case Studies | Four case studies: ungoverned, over-engineered, security-first, and reference implementation (Admiral-builds-Admiral). | |
| E | Platform Integration Patterns | How to use Admiral with Claude Code, Agent SDKs, and orchestration frameworks. | |
| F | Framework Versioning | Version policy, migration between versions, agent definition versioning. | |
| G | Implementation Status Map | Category 1/2/3 implementability for every framework component. | |
