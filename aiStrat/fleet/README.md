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
    ├── data/                # Data engineering, analytics, ML, validation, visualization
    ├── design/              # UX research, design systems, copywriting, tech writing, diagrams
    ├── adversarial/         # Simulated users, devil's advocate, red team, persona agents
    ├── governance/          # ALWAYS DEPLOY: Token budgeter, drift, hallucination, bias, loops, context, contradictions
    ├── meta/                # Pattern enforcement, dependency sentinel, role crystallizer
    ├── domain/              # Auth, search, payments, real-time, media, notifications, i18n
    ├── scale/               # Inhuman-scale analysis (planetary, temporal, combinatorial, topology)
    └── lifecycle/           # Release, incident response, feature flags, SDK, monorepo, contracts
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
| Data & Analytics | `agents/data.md` | 5 | |
| Documentation & Design | `agents/design.md` | 5 | |
| Simulation & Adversarial | `agents/adversarial.md` | 4 | |
| Meta & Autonomous | `agents/meta.md` | 4 | |
| Domain Specialization | `agents/domain.md` | 7 | |
| Inhuman-Scale Analysis | `agents/scale.md` | 29 | |
| Release & Developer Platform | `agents/lifecycle.md` | 6 | |

**Total catalog: 100 agent definitions.** Each is independently deployable. Combine as the project demands.

-----

## Quick Reference

| I need to... | Start here |
|---|---|
| Understand generalist vs. specialist | `generalists.md` and `specialists.md` |
| Understand an agent's capabilities | `agents/[category].md` — read the agent definition |
| See what an agent needs to operate | Agent definition → Context Profile |
| See where an agent's output goes | Agent definition → Output Goes To |
| Know when to consult a human professional | [admiral/part11-protocols.md, Section 38](../admiral/part11-protocols.md) |
| Know the rules for paid resource access | [admiral/part11-protocols.md, Section 39](../admiral/part11-protocols.md) |
| Assemble a system prompt | `prompt-anatomy.md` |
| Inject project context into agents | `context-injection.md` |
| Route a task to the right agent | `routing-rules.md` |
| Understand handoff format between agents | `interface-contracts.md` |
| Choose the right model for an agent | `model-tiers.md` |
| Understand universal agent rules | [admiral/part11-protocols.md, Section 35](../admiral/part11-protocols.md) |

-----

## Relationship to admiral/

This fleet directory is a **companion** to the admiral framework, not a replacement. The framework (`admiral/`) defines the principles, anti-patterns, and meta-process for running autonomous AI agent systems. This directory (`fleet/`) provides the reusable, project-agnostic components those systems are assembled from.

**Admiral is the engineering manual. Fleet is the parts catalog.**

For the framework's cross-reference to fleet, see the "Relationship to the Fleet" section in [admiral/index.md](../admiral/index.md).
