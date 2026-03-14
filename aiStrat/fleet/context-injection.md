<!-- Admiral Framework v0.3.0-alpha -->
# Context Injection Guide

**How to inject project-specific context into project-agnostic agent definitions.**

Fleet agents are toolbox components — they are project-agnostic by design. They become operational when project context is injected at deployment time. This guide defines what context each agent category needs and how to provide it.

-----

## The Context Stack

Every deployed agent receives context in three layers:

```
┌─────────────────────────────┐
│  Layer 3: Task Context      │  ← Changes per task
│  (specific assignment)      │
├─────────────────────────────┤
│  Layer 2: Project Context   │  ← Changes per project
│  (ground truth, boundaries) │
├─────────────────────────────┤
│  Layer 1: Fleet Context     │  ← Stable across projects
│  (agent def, standing       │
│   orders, protocols)        │
└─────────────────────────────┘
```

**Layer 1 (Fleet Context)** comes from this fleet/ directory. It's project-agnostic.

**Layer 2 (Project Context)** comes from the project's ground truth, boundaries, and configuration. This is what transforms a toolbox agent into a project-specific operator.

**Layer 3 (Task Context)** comes from the Orchestrator's task decomposition. It's the specific assignment for this work session.

-----

## Project Context Checklist

Before an agent can operate on a project, inject these into Layer 2:

### For All Agents

| Context Item | Source | Purpose |
|---|---|---|
| Mission statement | Admiral / project docs | Alignment anchor for all decisions |
| Boundaries | Admiral / project docs | What not to do, hard constraints, budgets |
| Tech stack | Ground truth | Languages, frameworks, versions, tools |
| Directory structure | Ground truth | Where things live in this project |
| Naming conventions | Ground truth | How this project names things |
| Active issues / known gotchas | Ground truth | What's already known to be broken or tricky |

### For Engineering Agents (additionally)

| Context Item | Source | Purpose |
|---|---|---|
| Architecture overview | Architect / ADRs | How components relate |
| API contracts | API Designer / OpenAPI specs | Interface definitions |
| Database schema | Database Agent / migration files | Data model |
| Test patterns | QA Agent / existing tests | How tests are structured in this project |
| CI/CD pipeline | DevOps Agent / pipeline config | How code gets deployed |

### For Quality Agents (additionally)

| Context Item | Source | Purpose |
|---|---|---|
| Acceptance criteria format | Project standards | What "done" looks like |
| Quality floor | Boundaries | Minimum acceptable quality bar |
| Test infrastructure | DevOps / Ground truth | What test runners, frameworks, and environments exist |

### For Security Agents (additionally)

| Context Item | Source | Purpose |
|---|---|---|
| Trust boundaries | Architecture overview | Where security domains begin and end |
| Compliance requirements | Boundaries / legal | Which regulatory frameworks apply |
| Auth architecture | Ground truth | How identity and access work |
| Data classification | Privacy requirements | What data sensitivity levels exist |

### For Governance Agents (additionally)

| Context Item | Source | Purpose |
|---|---|---|
| Fleet roster | `fleet/README.md` + project config | Which agents are deployed, their roles and routing |
| Agent definitions | Agent definition files | Each agent's Identity, Scope, Does NOT Do — needed to detect drift |
| Quality thresholds | Boundaries / project config | Acceptable error rates, review pass rates, budget limits |
| Ground truth conventions | Ground truth | Baseline conventions against which drift is measured |
| Decision log | Brain / ADRs | Prior decisions that agents must not contradict |
| Failure mode priorities | `governance.md` ownership table | Which failure modes to prioritize for this project |

### For Domain & Data Agents (additionally)

| Context Item | Source | Purpose |
|---|---|---|
| Domain-specific regulations | Legal / compliance docs | PCI, HIPAA, GDPR, accessibility standards applicable to this project |
| Domain model | Architecture / Ground truth | Business entities, relationships, invariants |
| Data sources and schemas | Data pipelines / Ground truth | Where data comes from, what shape it has |
| Integration points | Architecture overview | External APIs, third-party services, vendor contracts |

-----

## Injection Patterns

### Pattern 1: Configuration File

The most common pattern. Create a project-specific configuration file that agents reference:

```markdown
# Project Context: [Project Name]

## Mission
[One sentence]

## Boundaries
[Non-goals, constraints, budgets]

## Tech Stack
[Languages, frameworks, versions]

## Architecture
[Component overview, key decisions]

## Conventions
[Naming, file structure, patterns]
```

### Pattern 2: Skills / Progressive Disclosure

For context too large to fit in standing context, use skill files that load on demand when relevant file patterns or keywords are encountered:

```
# Example: Claude Code skill files (other tools have equivalent mechanisms)
.claude/skills/database-patterns.md    → Loads when touching db/ files
.claude/skills/auth-architecture.md    → Loads when touching auth/ files
.claude/skills/api-conventions.md      → Loads when touching api/ files
```

### Pattern 3: Ground Truth Registry

A structured inventory of all project-specific knowledge sources:

```markdown
## Ground Truth Registry

| Topic | Source | Location | Freshness |
|---|---|---|---|
| API contracts | OpenAPI spec | docs/api/openapi.yaml | Updated per release |
| DB schema | Migrations | db/migrations/ | Updated per migration |
| Architecture | ADRs | docs/decisions/ | Updated per decision |
| Dependencies | Package manifest | package.json | Updated per install |
```

-----

## Context Budget Guidelines

Context windows are finite. Budget context allocation by priority:

| Priority | Content | Typical Allocation |
|---|---|---|
| **Critical** | Identity, Authority, Constraints, Mission, Boundaries | 15–25% |
| **High** | Ground truth relevant to current task | 20–30% |
| **Medium** | Architectural context, prior decisions | 10–20% |
| **Low** | Nice-to-have reference material | 0–10% |
| **Reserved** | Working space for agent reasoning and output | 30–40% |

When context pressure builds, sacrifice from the bottom up. **Never sacrifice Identity, Authority, or Constraints** — these are the agent's intent foundation. They produce the most expensive failures when lost because the agent continues operating without knowing who it is, what it may decide, or what lines it must not cross. Reference material can be re-fetched; identity and constraints cannot be reconstructed from first principles.

**Judgment boundary for context sufficiency:** If an agent cannot answer "what is my role?", "what may I decide without asking?", and "what must I not do?" from its loaded context alone, the context is insufficient regardless of how much task detail is present. These three questions are the minimum viable intent.
