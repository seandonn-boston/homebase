# PART 4 — FLEET

*Who does what, with what tools, on what models, speaking what protocols?*

*The Strategy triangle (Part 1) defines the destination. The Context discipline (Part 2) defines the information architecture. The Enforcement layer (Part 3) defines what's mandatory. Now: who actually does the work? These four sections define the agents, their capabilities, their model assignments, and their communication protocols.*

-----

## 11 — FLEET COMPOSITION

> **TL;DR** — Define every agent role, what it does, what it does NOT do, how tasks route to it, and how it hands off to others. Five to twelve agents, not fifty. The boring agents win.

Fleet Composition defines which agents exist, what each one specializes in, how the orchestrator routes tasks to the right specialist, and the interface contracts between them.

### Agent Roster

Define every agent role. Each needs a clear identity, a defined scope, and explicit boundaries on what it does not do. The research is unambiguous: **narrow, specialized, deeply integrated agents outperform ambitious generalists.**

| Role | Responsibility | Does NOT Do |
|---|---|---|
| Orchestrator | Decomposes goals, routes to specialists, manages progress, enforces standards | Write production code, make architectural decisions above its tier |
| Implementer | Writes code, implements features, follows specifications exactly | Choose architecture, add unrequested features, modify files outside scope |
| QA Agent | Reviews output, runs tests, validates against criteria, flags issues | Fix issues directly (sends back to Implementer), approve its own work |
| Database Agent | Designs schemas, writes migrations, optimizes queries | Modify application code, change API contracts without approval |
| Design Agent | Produces UI/UX specifications, component layouts, style guidelines | Implement designs in code (hands off to Implementer) |

### Practical Role Catalog

Select from these based on the project's actual needs. Define "Does NOT Do" boundaries for each.

**Command & Coordination**

| # | Role | Responsibility |
|---|---|---|
| 1 | Orchestrator | Decomposes goals, routes to specialists, manages progress |
| 2 | Triage Agent | Classifies work by type, priority, and complexity; routes to queue |
| 3 | Context Curator | Manages context window loading per role; compresses stale context |

**Engineering — Frontend**

| # | Role | Responsibility |
|---|---|---|
| 4 | Frontend Implementer | UI components, designs, browser-specific concerns |
| 5 | Accessibility Auditor | WCAG compliance, screen readers, keyboard navigation |
| 6 | State Management Agent | Client-side state architecture, data flow, cache sync |

**Engineering — Backend**

| # | Role | Responsibility |
|---|---|---|
| 7 | Backend Implementer | Server-side logic, business rules, request handling |
| 8 | API Designer | Endpoint contracts, versioning, request/response schemas |
| 9 | Database Agent | Schemas, migrations, query optimization, data integrity |
| 10 | Queue & Messaging Agent | Async workflows, event schemas, pub/sub, dead letters |

**Engineering — Cross-Cutting**

| # | Role | Responsibility |
|---|---|---|
| 11 | Architect | System structure, pattern evaluation, decision records |
| 12 | Integration Agent | Third-party APIs, data sync, webhooks, protocol translation |
| 13 | Migration Agent | System migrations, data transformations, version upgrades |
| 14 | Refactoring Agent | Restructures code without changing external behavior |
| 15 | Dependency Manager | Evaluates, updates, audits deps; version conflicts, license compliance |

**Engineering — Infrastructure**

| # | Role | Responsibility |
|---|---|---|
| 16 | DevOps Agent | CI/CD pipelines, deployment automation, build systems |
| 17 | Infrastructure Agent | Cloud resources via IaC, network config, resource scaling |
| 18 | Observability Agent | Logging, metrics, distributed tracing, alerting rules |

**Quality & Testing**

| # | Role | Responsibility |
|---|---|---|
| 19 | QA Agent | Reviews output against criteria, validates deliverables |
| 20 | Unit Test Writer | Unit tests, fixtures, edge case coverage |
| 21 | E2E Test Writer | Integration tests, cross-system workflow validation |
| 22 | Performance Tester | Load testing, benchmarking, profiling, bottlenecks |

**Security & Compliance**

| # | Role | Responsibility |
|---|---|---|
| 23 | Security Auditor | Vulnerability scanning, auth flow review, dependency CVE audit |
| 24 | Compliance Agent | Regulatory framework validation, policy enforcement |

**Adversarial & Meta**

| # | Role | Responsibility |
|---|---|---|
| 25 | Simulated User | Tests workflows as a real user — happy path, deviations, UX friction |
| 26 | Devil's Advocate | Challenges decisions, argues opposing positions, stress-tests assumptions |
| 27 | Red Team Agent | Adversarial review: reasoning gaps, failure modes, rigor |
| 28 | Meta-Agent Builder | Generates new agent definitions and skill files from descriptions |

**Scheduled Agents**

| # | Role | Cadence | Responsibility |
|---|---|---|---|
| 29 | Docs Sync | Monthly | Audits documentation against code, flags stale docs |
| 30 | Quality Review | Weekly | Comprehensive quality analysis across the codebase |
| 31 | Dependency Audit | Biweekly | Outdated deps, security advisories, license changes |

### Routing Logic

- **Route by task type:** Database tasks → Database Agent. UI → Frontend Implementer. Tests → QA.
- **Route by file ownership:** Each specialist owns specific directories. Tasks touching those files route to the owner.
- **Escalate ambiguous routing:** If a task spans multiple specialists, decompose further. If decomposition fails, escalate to the Admiral.

### Interface Contracts

When one agent's output becomes another agent's input, the handoff must follow a defined contract.

- **Implementer → QA:** Code diff, changed files, intended behavior, test commands. Returns: pass/fail with file and line references.
- **Design → Implementer:** Component spec with layout, spacing, colors, states, interactions. Returns: implemented component with preview link.
- **Orchestrator → Specialist:** Task description, acceptance criteria, context files, budget. Returns: deliverable, status, issues, assumptions.

> **TEMPLATE: FLEET ROSTER**
>
> FLEET: [Project Name]
>
> ORCHESTRATOR: [Model/config] — authority tier, context loading strategy
>
> SPECIALISTS:
> - [Role]: scope, file ownership, interface contracts, schedule (continuous | triggered | cron)
>
> ROUTING: [Decision tree or rules for task assignment]

> **ANTI-PATTERN: FLEET BLOAT** — The fleet grows to twenty-five agents. The orchestrator cannot hold the full roster in context. Routing becomes a maze. Interface contracts multiply quadratically. Upper bound for a single fleet: eight to twelve active specialists before coordination costs dominate.

-----

## 12 — TOOL & CAPABILITY REGISTRY

> **TL;DR** — Define what each agent CAN do (tool list, MCP servers) and explicitly what it CANNOT do (negative tool list). Phantom capabilities — agents assuming access they don't have — is one of the most common and expensive failures.

An agent's tool set is the boundary between what it can reason about and what it can actually do.

### Registry Structure

For each agent role, define a Tool Registry:

| Field | What to Define |
|---|---|
| **Tool Name** | Exact name as it appears in the agent's tool list |
| **Capability** | What the tool does in one sentence |
| **Scope Limits** | What the tool cannot do or is restricted from doing |
| **Shared State** | Whether outputs are visible to other agents |

### Negative Tool List

Equally important: what the agent does NOT have.

- No shell access: "You do not have shell access. Do not generate shell commands."
- No HTTP: "You cannot access external URLs. Do not attempt API calls."
- Read-only: "You can read files but cannot write or modify them."

### MCP Server Registry

| Server | Capability | Scope Limits | Security |
|---|---|---|---|
| **GitHub MCP** | Repo management, PR creation, issue tracking | Scoped to project repos only | OAuth, minimal permissions |
| **Supabase MCP** | Database operations via natural language | Read-only for QA; read-write for DB Agent | Row-level security, scoped key |
| **Sequential Thinking** | Deliberative reasoning through thought sequences | No side effects | No external access |
| **Filesystem MCP** | File read/write operations | Scoped to project directory only | No access outside project root |

### Tool Interaction Contracts

- **Ownership boundaries:** Which agent owns write access to which files.
- **Conflict resolution:** What happens if two agents modify the same resource.
- **Tool output as handoff:** When one agent's tool output becomes another's input, make the contract explicit.

> **TEMPLATE: TOOL REGISTRY**
>
> ROLE: [Agent role]
>
> AVAILABLE TOOLS: [Tool Name]: [Capability]. Scope: [Limits]. Shared state: [Yes/No].
>
> MCP SERVERS: [Server]: [Capability]. Scope: [Limits]. Auth: [Method].
>
> NOT AVAILABLE: [Tools the agent does not have and must not assume]
>
> INTERACTION CONTRACTS: [Shared resource]: Owned by [Agent]. [Other Agent] has [access level].

> **ANTI-PATTERN: TOOL HALLUCINATION** — An agent without web access confidently references "the API documentation I retrieved" — but it never retrieved anything. The Negative Tool List is the primary defense.

-----

## 13 — MODEL SELECTION

> **TL;DR** — Match model capability to role requirements across four tiers. Flagship for orchestration, workhorse for implementation, utility for triage, economy for batch. Using the best model for every role wastes money. Using the cheapest for every role breaks quality.

Different models have different strengths. Model assignment affects quality, cost, and latency simultaneously.

### Model Landscape (February 2026)

| Model | Strengths | Context | Best For |
|---|---|---|---|
| **Claude Opus 4.6** | Strongest coder among frontier models. 72.5% SWE-Bench. | 1M tokens | Orchestrator, Architect, complex implementation |
| **Claude Sonnet 4.6** | Strong code generation. Good instruction following. Faster. | 200K tokens | Implementers, QA, most specialists |
| **Claude Haiku 4.5** | Fast, cheap, reliable for well-defined tasks. | 200K tokens | Triage, formatting, simple transforms |
| **GPT-5.2 Pro** | Highest reasoning scores (93.2% GPQA Diamond). | 1M tokens | Research, complex analysis, long-context |
| **DeepSeek V3.2** | Near-frontier at ~1/30th cost. | 128K tokens | High-volume utility, cost-sensitive tasks |
| **Gemini 3 Pro** | Strong agentic workflows. Intent alignment. | 2M tokens | Research, multi-document analysis |

### Model Tier Strategy

| Tier | Profile | Typical Roles |
|---|---|---|
| **Tier 1: Flagship** | Most capable. Deepest reasoning. | Orchestrator, Architect, Devil's Advocate, Red Team |
| **Tier 2: Workhorse** | Strong general capability. Moderate cost. | Implementers, QA, Database Agent, most specialists |
| **Tier 3: Utility** | Fast, cheap, reliable for well-defined tasks. | Triage, formatting, pattern matching |
| **Tier 4: Economy** | Near-frontier at fraction of cost. | High-volume utility, cost-sensitive batch processing |

**When to promote:** Role's First-Pass Quality Rate causes rework costing more than the tier upgrade.

**When to demote:** Output quality at a higher tier is indistinguishable from lower. A/B test: same task, both tiers, compare.

### Multi-Model Orchestration

Production systems now coordinate multiple models in a single workflow:

- Orchestrator on flagship, implementers on workhorse.
- QA pass through a competing model as adversarial review (different models have different blind spots).
- Economy-tier first draft, flagship-tier review — 80% of token volume at 1/30th cost.

> **TEMPLATE: MODEL ASSIGNMENT**
>
> | Role | Tier | Model | Rationale |
> |---|---|---|---|
> | Orchestrator | Tier 1 | [Model] | Deep reasoning for decomposition |
> | Implementer | Tier 2 | [Model] | Strong code generation |
> | QA Agent | Tier 2 | [Model] | Judgment for quality assessment |
> | Triage | Tier 3 | [Model] | Fast routing, minimal reasoning |
> | Batch tasks | Tier 4 | [Model] | High volume, cost sensitivity |

> **ANTI-PATTERN: UNIFORM MODEL ASSIGNMENT** — Same flagship model for every role. Three to five times the necessary cost. The Pattern Enforcer performs identically on utility-tier.

-----

## 14 — PROTOCOL INTEGRATION

> **TL;DR** — MCP connects agents to tools (USB-C for AI). A2A connects agents to other agents. Together they form the protocol layer enabling coordinated fleet operations.

### MCP — Tool Access Protocol

```
Agent ←→ MCP Client ←→ MCP Server ←→ Tool/Data Source
```

**What the Admiral must define:**

- **Server selection:** Which MCP servers does each role connect to?
- **Permission scoping:** Minimum permissions required per connection.
- **Version pinning:** Pin versions. Never `latest` in production.
- **Security classification:** Official vs. community vs. internal trust level.

### A2A — Agent-to-Agent Protocol

| Scenario | Use |
|---|---|
| Agents in the same process/session | Direct orchestration |
| Agents in different processes on same machine | A2A or shared filesystem with contracts |
| Agents across different machines/organizations | A2A with full authentication |
| Agents using different LLM providers | A2A — provider-agnostic communication |

**Agent Cards:** Each agent publishes a card describing capabilities, accepted formats, and auth requirements. The orchestrator discovers agents through their cards.

**Security:** API Key, OAuth 2.0, OpenID Connect, mTLS. Fleet-internal: API keys may suffice. Cross-organization: OAuth 2.0 minimum.

### Protocol Security

- **MCP servers as exfiltration points:** Audit all servers.
- **A2A impersonation:** Verify identity through signed cards or mTLS.
- **Token misuse:** Use RFC 8707 Resource Indicators to prevent cross-server token reuse.

> **TEMPLATE: PROTOCOL REGISTRY**
>
> MCP SERVERS:
> - [Server]: [Version] — Agents: [list]. Permissions: [scope]. Trust: [official/community/internal].
>
> A2A CONNECTIONS:
> - [Agent A] ↔ [Agent B]: [Purpose]. Auth: [method]. Format: [JSON-RPC / custom].

-----

