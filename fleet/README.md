# The Fleet

**A project-agnostic toolbox of agent definitions, instructions, prompts, and routing for the Fleet Admiral Framework.**

The fleet is the toolbox. Each agent is a self-contained module — project-agnostic, independently deployable, and operationally inert until project context is injected. Where [admiral2/](../admiral2/) defines the principles and meta-process for running autonomous AI agent systems, this directory provides the concrete, reusable components that any Admiral can pull from the shelf and deploy.

The fleet organizes agents into two fundamental categories:

- **[Generalists](generalists/)** handle the overhead — orchestration, triage, context management, and conflict resolution. They route work, manage flow, and keep the fleet coordinated.
- **[Specialists](specialists/)** are deeply knowledgeable in their domain and complementary domains. They know when to pull in other agents' opinions and — most importantly — they know their own limitations as LLMs and will recommend consulting a real human professional when the situation demands it.

Every agent definition specifies:
- **What it needs** to operate (context, inputs, tools)
- **What it does** (scope, responsibilities)
- **What it does not do** (hard boundaries)
- **Where its output goes** (next agent, Orchestrator, or Admiral)

-----

## Directory Structure

```
fleet/
├── generalists/            # Overhead & coordination — see generalists/README.md
├── specialists/            # Domain-expert philosophy & traits — see specialists/README.md
├── agents/                 # Agent definitions organized by category
│   ├── command/            # Command & Coordination (Orchestrator, Triage, Context Curator, Mediator)
│   ├── engineering/        # Engineering specialists
│   │   ├── frontend/       # UI, interaction, accessibility, state management
│   │   ├── backend/        # Server logic, API, database, messaging, caching
│   │   ├── cross-cutting/  # Architect, integration, migration, refactoring, dependencies
│   │   └── infrastructure/ # DevOps, IaC, containers, observability
│   ├── quality/            # QA, test writers, performance, chaos, regression
│   ├── security/           # Security audit, penetration testing, compliance, privacy
│   ├── data/               # Data engineering, analytics, ML, validation, visualization
│   ├── design/             # UX research, design systems, copywriting, tech writing, diagrams
│   ├── adversarial/        # Simulated users, devil's advocate, red team, persona agents
│   ├── governance/         # ALWAYS DEPLOY: Token budgeter, drift, hallucination, bias, loops, context, contradictions
│   ├── meta/               # Pattern enforcement, dependency sentinel, role crystallizer
│   ├── domain/             # Auth, search, payments, real-time, media, notifications, i18n
│   ├── scale/              # Inhuman-scale analysis (planetary, temporal, combinatorial, topology)
│   └── lifecycle/          # Release, incident response, feature flags, SDK, monorepo, contracts
├── instructions/           # Shared operational instructions all agents follow
│   ├── standing-orders.md
│   ├── escalation-protocol.md
│   ├── handoff-protocol.md
│   └── human-referral-protocol.md
├── prompts/                # System prompt templates and assembly guides
│   └── templates/          # Prompt anatomy, context injection patterns
├── routing/                # Task routing rules, file ownership, interface contracts
└── models/                 # Model tier assignments and selection guidance
```

-----

## How This Toolbox Works

### Each Agent Is a Module

Agent definitions are self-contained specifications. They define the agent's identity, scope, boundaries, and output routing — everything needed to instantiate the agent on any project. They carry no project-specific knowledge.

To make an agent operational, inject project context using the patterns described in `prompts/templates/context-injection.md`. The agent definition provides Layer 1 (fleet context). You provide Layer 2 (project context) and Layer 3 (task context).

### Output Routing Is Explicit

Every agent definition specifies where its output goes next. This is how agents compose into workflows — not through implicit coordination, but through explicit routing declarations. The `routing/` directory provides default routing rules; the Orchestrator executes them.

### Instructions Are Universal

The files in `instructions/` are project-agnostic operational protocols that every agent loads as standing context:
- **Standing Orders** — universal behavioral constraints (scope discipline, output routing, recovery protocol, quality standards)
- **Escalation Protocol** — when and how to stop work and flag upward
- **Handoff Protocol** — structured format for transferring work between agents
- **Human Referral Protocol** — when and how specialists recommend consulting real human professionals

### Prompts Are Assembled, Not Monolithic

The `prompts/templates/` directory provides the assembly pattern for building complete system prompts from parts: Identity → Authority → Constraints → Knowledge → Task. Agent definitions supply the first three sections. Project context supplies Knowledge. The Orchestrator supplies the Task.

-----

## Agent Catalog

| Category | Directory | Agent Count | Deploy |
|---|---|---|---|
| Command & Coordination | `agents/command/` | 4 | |
| **Governance** | **`agents/governance/`** | **7** | **Always** |
| Engineering — Frontend | `agents/engineering/frontend/` | 5 | |
| Engineering — Backend | `agents/engineering/backend/` | 5 | |
| Engineering — Cross-Cutting | `agents/engineering/cross-cutting/` | 5 | |
| Engineering — Infrastructure | `agents/engineering/infrastructure/` | 4 | |
| Quality & Testing | `agents/quality/` | 6 | |
| Security & Compliance | `agents/security/` | 4 | |
| Data & Analytics | `agents/data/` | 5 | |
| Documentation & Design | `agents/design/` | 5 | |
| Simulation & Adversarial | `agents/adversarial/` | 4 | |
| Meta & Autonomous | `agents/meta/` | 4 | |
| Domain Specialization | `agents/domain/` | 7 | |
| Inhuman-Scale Analysis | `agents/scale/` | 29 | |
| Release & Developer Platform | `agents/lifecycle/` | 6 | |

**Total catalog: 100 agent definitions.** Each is independently deployable. Combine as the project demands.

-----

## Quick Reference

| I need to... | Start here |
|---|---|
| Understand generalist vs. specialist | `generalists/README.md` and `specialists/README.md` |
| Understand an agent's capabilities | `agents/[category]/` — read the agent definition |
| See what an agent needs to operate | Agent definition → Context Profile |
| See where an agent's output goes | Agent definition → Output Goes To |
| Know when to consult a human professional | `instructions/human-referral-protocol.md` |
| Assemble a system prompt | `prompts/templates/prompt-anatomy.md` |
| Inject project context into agents | `prompts/templates/context-injection.md` |
| Route a task to the right agent | `routing/routing-rules.md` |
| Understand handoff format between agents | `routing/interface-contracts.md` |
| Choose the right model for an agent | `models/tier-assignments.md` |
| Understand universal agent rules | `instructions/standing-orders.md` |

-----

## Relationship to admiral2/

This fleet directory is a **companion** to the admiral2 framework, not a replacement. The framework (admiral2/) defines the principles, anti-patterns, and meta-process for running autonomous AI agent systems. This directory (fleet/) provides the reusable, project-agnostic components those systems are assembled from.

Admiral2 is the engineering manual. Fleet is the parts catalog.
