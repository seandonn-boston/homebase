# The Fleet

**A project-agnostic toolbox of agent definitions, prompts, and routing for the Fleet Admiral Framework.**

The fleet is the toolbox. Each agent is a self-contained module — project-agnostic, independently deployable, and operationally inert until project context is injected. Where [admiral/](../admiral/) defines the principles and meta-process for running autonomous AI agent systems, this directory provides the concrete, reusable components that any Admiral can pull from the shelf and deploy.

The fleet organizes agents into two fundamental categories:

- **[Generalists](generalists.md)** handle the overhead — orchestration, triage, context management, and conflict resolution. They route work, manage flow, and keep the fleet coordinated.
- **[Specialists](specialists.md)** are deeply knowledgeable in their domain and complementary domains. They know when to pull in other agents' opinions and — most importantly — they know their own limitations as LLMs and will recommend consulting a real human professional when the situation demands it.

Every agent definition specifies:
- **What it needs** to operate (context, inputs, tools)
- **What it does** (scope, responsibilities)
- **What it does not do** (hard boundaries)
- **Where its output goes** (next agent, Orchestrator, or Admiral)

-----

## Directory Structure

```
fleet/
├── README.md               # This file
├── generalists.md           # Overhead & coordination agents
├── specialists.md           # Domain-expert philosophy & traits
├── model-tiers.md           # Model tier assignments and selection guidance
├── routing-rules.md         # Task routing rules and file ownership
├── interface-contracts.md   # Agent handoff specifications
├── prompt-anatomy.md        # System prompt assembly pattern
├── context-injection.md     # Context injection patterns
└── agents/                  # Agent definitions organized by category
    ├── agent-example.md     # Template for creating a new agent
    ├── agents-example.md    # Template for creating a category file
    ├── command/             # Command & Coordination (Orchestrator, Triage, Context Curator, Mediator)
    ├── engineering/         # Engineering specialists
    │   ├── frontend/        # UI, interaction, accessibility, state management
    │   ├── backend/         # Server logic, API, database, messaging, caching
    │   ├── cross-cutting/   # Architect, integration, migration, refactoring, dependencies
    │   └── infrastructure/  # DevOps, IaC, containers, observability
    ├── quality/             # QA, test writers, performance, chaos, regression
    ├── security/            # Security audit, penetration testing, compliance, privacy
    ├── design/              # UX research, design systems, copywriting, tech writing, diagrams
    ├── adversarial/         # Simulated users, devil's advocate, red team, persona agents
    ├── governance/          # ALWAYS DEPLOY: Token budgeter, drift, hallucination, bias, loops, context, contradictions
    ├── meta/                # Pattern enforcement, dependency sentinel, role crystallizer
    ├── scale/               # Inhuman-scale analysis (failure topology, decay, combinatorial, security)
    ├── lifecycle/           # Release, incident response, feature flags, SDK, monorepo, contracts
    └── extras/              # Extended agents held in reserve (domain, data, scale-extended)
        ├── README.md        # Index of extended agents with activation instructions
        ├── domain.md        # 7 domain specialists (auth, search, payments, real-time, media, notifications, i18n)
        ├── data.md          # 5 data & analytics agents (pipelines, analytics, ML, validation, visualization)
        └── scale-extended.md # 17 supplementary scale agents (planetary, temporal, cognitive, regulatory)
```

> **Protocols have moved.** Standing orders, escalation, handoff, human referral, and paid resource authorization protocols are now in [admiral/part11-protocols.md](../admiral/part11-protocols.md). These are universal framework rules, not fleet-specific tooling.

-----

## How This Toolbox Works

### Each Agent Is a Module

Agent definitions are self-contained specifications. They define the agent's identity, scope, boundaries, and output routing — everything needed to instantiate the agent on any project. They carry no project-specific knowledge.

To make an agent operational, inject project context using the patterns described in `context-injection.md`. The agent definition provides Layer 1 (fleet context). You provide Layer 2 (project context) and Layer 3 (task context).

### Output Routing Is Explicit

Every agent definition specifies where its output goes next. This is how agents compose into workflows — not through implicit coordination, but through explicit routing declarations. The `routing-rules.md` file provides default routing rules; the Orchestrator executes them.

### Protocols Live in the Admiral

Universal operational protocols — standing orders, escalation, handoff, human referral, and paid resource authorization — are defined in [admiral/part11-protocols.md](../admiral/part11-protocols.md). These are the authoritative source. Agent definitions reference these protocols but do not redefine them.

### Prompts Are Assembled, Not Monolithic

The `prompt-anatomy.md` file provides the assembly pattern for building complete system prompts from parts: Identity → Authority → Constraints → Knowledge → Task. Agent definitions supply the first three sections. Project context supplies Knowledge. The Orchestrator supplies the Task.

-----

## Agent Catalog

| Category | Location | Agent Count | Deploy |
|---|---|---|---|
| Command & Coordination | `agents/command/` | 4 | |
| **Governance** | **`agents/governance.md`** | **7** | **Always** |
| Engineering — Frontend | `agents/engineering/frontend/` | 5 | |
| Engineering — Backend | `agents/engineering/backend/` | 5 | |
| Engineering — Cross-Cutting | `agents/engineering/cross-cutting/` | 5 | |
| Engineering — Infrastructure | `agents/engineering/infrastructure/` | 4 | |
| Quality & Testing | `agents/quality.md` | 6 | |
| Security & Compliance | `agents/security.md` | 4 | |
| Documentation & Design | `agents/design.md` | 5 | |
| Simulation & Adversarial | `agents/adversarial.md` | 4 | |
| Meta & Autonomous | `agents/meta.md` | 4 | |
| Inhuman-Scale Analysis | `agents/scale.md` | 12 | |
| Release & Developer Platform | `agents/lifecycle.md` | 6 | |

**Core catalog: 67 agent definitions.** Each is independently deployable. Combine as the project demands. Start with the **Core Fleet** below (11 agents) and add specialists only when demonstrated need arises.

An additional **29 extended agents** are held in reserve in `agents/extras/` — domain specialists (7), data & analytics (5), and supplementary scale agents (17). See `agents/extras/README.md` for activation instructions.

> **Adoption guidance:** See the [Adoption Levels](../admiral/index.md#adoption-levels) in the Admiral Framework for a progressive path from single-agent to full fleet.

### Core Fleet (Minimum Viable Deployment)

These are the agents to implement first. A fleet can operate effectively with
just these roles. All other agents are enhancements to add when a project grows
beyond what the core fleet handles.

| Priority | Agent | Source | Role |
|---|---|---|---|
| 1 | **Orchestrator** | `agents/command/orchestrator.md` | Routes tasks, coordinates workflow, manages handoffs |
| 2 | **Triage Agent** | `agents/command/triage-agent.md` | Classifies incoming work, assigns priority and agent |
| 3 | **Backend Implementer** | `agents/engineering/backend/agents.md` | Core code generation — API, data, logic |
| 4 | **Frontend Implementer** | `agents/engineering/frontend/agents.md` | UI, components, client-side logic |
| 5 | **QA Agent** | `agents/quality.md` | Testing, quality gates, acceptance verification |
| 6 | **Security Auditor** | `agents/security.md` | Security review of all code changes |
| 7 | **Architect** | `agents/engineering/cross-cutting/agents.md` | System design, technical decisions |
| 8 | **DevOps Agent** | `agents/engineering/infrastructure/agents.md` | Deployment, CI/CD, infrastructure |
| 9 | **Token Budgeter** | `agents/governance.md` | Governance (always deploy) — tracks and enforces token/cost budgets |
| 10 | **Hallucination Auditor** | `agents/governance.md` | Governance (always deploy) — detects fabricated facts, false citations |
| 11 | **Loop Breaker** | `agents/governance.md` | Governance (always deploy) — detects and terminates circular agent loops |

**Do not deploy 67 agents for a project that needs 11.** The administrative cost of
configuring, routing, and coordinating a large fleet exceeds the value for most
projects. Start with the core 11. Add roles when the Orchestrator reports
routing bottlenecks or when specific domain expertise gaps emerge.

-----

## Quick Reference

| I need to... | Start here |
|---|---|
| Understand generalist vs. specialist | `generalists.md` and `specialists.md` |
| Understand an agent's capabilities | `agents/[category].md` — read the agent definition |
| See what an agent needs to operate | Agent definition → Context Profile |
| See where an agent's output goes | Agent definition → Output Goes To |
| Know when to consult a human professional | [admiral/part11-protocols.md, Section 39](../admiral/part11-protocols.md) |
| Know the rules for paid resource access | [admiral/part11-protocols.md, Section 40](../admiral/part11-protocols.md) |
| Assemble a system prompt | `prompt-anatomy.md` |
| Inject project context into agents | `context-injection.md` |
| Route a task to the right agent | `routing-rules.md` |
| Understand handoff format between agents | `interface-contracts.md` |
| Choose the right model for an agent | `model-tiers.md` |
| Understand universal agent rules | [admiral/part11-protocols.md, Section 36](../admiral/part11-protocols.md) |

-----

## Relationship to admiral/

This fleet directory is a **companion** to the admiral framework, not a replacement. The framework (`admiral/`) defines the principles, anti-patterns, and meta-process for running autonomous AI agent systems. This directory (`fleet/`) provides the reusable, project-agnostic components those systems are assembled from.

**Admiral is the engineering manual. Fleet is the parts catalog.**

For the framework's cross-reference to fleet, see the "Relationship to the Fleet" section in [admiral/index.md](../admiral/index.md).

-----

## Core Tenets

The fleet operates under the framework's Core Tenets: Fairness, Transparency, Reliability, Safety, Inclusivity, and Accountability. See [`admiral/part11-protocols.md`](../admiral/part11-protocols.md) for Standing Orders that enforce these principles.
