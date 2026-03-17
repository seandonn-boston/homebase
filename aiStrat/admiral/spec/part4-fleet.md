# PART 4 — FLEET

*Who does what, with what tools, on what models, speaking what protocols?*

*The Strategy triangle (Part 1) defines the destination. The Context discipline (Part 2) defines the information architecture. The Enforcement layer (Part 3) defines what's mandatory. Now: who actually does the work? These four sections define the agents, their capabilities, their model assignments, and their communication protocols.*

> **Control Plane surface:** Agent roster, status, health, and routing decisions are the Control Plane's primary Fleet View (F2+). At F1, the CLI status display shows the single agent's identity, model tier, and current task.

-----

## Fleet Composition

> **TL;DR** — Define every agent role, what it does, what it does NOT do, how tasks route to it, and how it hands off to others. Five to twelve agents, not fifty. The boring agents win.

Fleet Composition defines which agents exist, what each one specializes in, how the orchestrator routes tasks to the right specialist, and the interface contracts between them.

### Agent Roster

Define every agent role. Each needs a clear identity, a defined scope, and explicit boundaries on what it does not do. In our experience, **narrow, specialized, deeply integrated agents outperform ambitious generalists.**

| Role | Responsibility | Does NOT Do |
|---|---|---|
| Orchestrator | Decomposes goals, routes to specialists, manages progress, enforces standards | Write production code, make architectural decisions above its tier |
| Implementer | Writes code, implements features, follows specifications exactly | Choose architecture, add unrequested features, modify files outside scope |
| QA Agent | Reviews output, runs tests, validates against criteria, flags issues | Fix issues directly (sends back to Implementer), approve its own work |
| Database Agent | Designs schemas, writes migrations, optimizes queries | Modify application code, change API contracts without approval |
| Design Systems Agent | Produces UI/UX specifications, component layouts, style guidelines | Implement designs in code (hands off to Implementer) |

### Agent Catalog

The canonical agent catalog lives in [`fleet/README.md`](../../fleet/README.md). It contains 71 core agent definitions (67 specialists across 12 categories plus 4 command & coordination agents), with an additional 34 extended agents in `fleet/agents/extras/`.

Select agents based on the project's actual needs. Define "Does NOT Do" boundaries for each. See `fleet/README.md` for the complete catalog with agent counts per category.

### Core Fleet (Minimum Viable Deployment)

These are the agents to implement first. A fleet can operate effectively with just these roles. All other agents are enhancements to add when a project grows beyond what the core fleet handles.

| Priority | Agent | Role |
|---|---|---|
| 1 | **Orchestrator** | Routes tasks, coordinates workflow, manages handoffs |
| 2 | **Triage Agent** | Classifies incoming work, assigns priority and agent |
| 3 | **Backend Implementer** | Core code generation — API, data, logic |
| 4 | **Frontend Implementer** | UI, components, client-side logic |
| 5 | **QA Agent** | Testing, quality gates, acceptance verification |
| 6 | **Security Auditor** | Security review of all code changes |
| 7 | **Architect** | System design, technical decisions |
| 8 | **DevOps Agent** | Deployment, CI/CD, infrastructure |
| 9 | **Token Budgeter** | Governance — tracks and enforces token/cost budgets |
| 10 | **Hallucination Auditor** | Governance — detects fabricated facts, false citations |
| 11 | **Loop Breaker** | Governance — detects and terminates circular agent loops |

> **Note:** Agents 9-11 (Token Budgeter, Hallucination Auditor, Loop Breaker) are governance agents — deploy them at **F3+**. At F1-F2, their core functions are covered by deterministic hooks (E1: token budget gate, loop detection). The governance agents add analytical depth on top of those hooks. At F2, deploy agents 1-8 only.

**Do not deploy 71 agents for a project that needs 11.** The administrative cost of configuring, routing, and coordinating a large fleet exceeds the value for most projects. Start with the core 11. Add roles when the Orchestrator reports routing bottlenecks or when specific domain expertise gaps emerge.

### Routing Logic

- **Route by task type:** Database tasks → Database Agent. UI → Frontend Implementer. Tests → QA.
- **Route by file ownership:** Each specialist owns specific directories. Tasks touching those files route to the owner.
- **Escalate ambiguous routing:** If a task spans multiple specialists, decompose further. If decomposition fails, escalate to the Admiral.
- **Never route QA to the implementer who wrote the code.** This prevents conflict of interest — the same judgment that produced the code cannot objectively evaluate it. Different blind spots are the point.
- **QA conflict detection:** Validate the routing table for QA conflicts at configuration time. A task type matching any QA keyword (`review`, `qa`, `test`, `audit`, `verify`) assigned to an agent that also handles non-QA task types is a conflict of interest. This is a structural check at fleet configuration time, not a runtime judgment.
- **Tool permission validation:** Each agent's available tool list and denied tool list must be disjoint — `available ∩ denied = ∅`. A tool appearing in both lists indicates a configuration error and should be rejected at validation time.

Routing rules that communicate intent produce better specialist output. "Database task" is a category. "Schema migration that must be backward-compatible because we have live traffic" is intent. When routing includes the *why*, the specialist makes better trade-offs without additional round trips to the Orchestrator.

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

> **Clarification:** "Five to twelve" is the general fleet size recommendation for most projects. "Eight to twelve" is the upper bound before coordination costs dominate — it appears in the anti-pattern warning as the threshold at which fleet bloat becomes a risk, not as a minimum. Start at five; grow toward twelve only when routing bottlenecks or domain gaps justify it.

-----

## Tool & Capability Registry

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

Equally important: what the agent does NOT have. Agents will hallucinate capabilities that seem plausible from their training data. The negative tool list is the primary defense because it creates an explicit boundary: "I cannot do X" is more reliable than inferring "I can do everything except X" from a positive list. Before proceeding with any task that requires tools, agents must verify each required tool is on their positive list. If any are missing, escalate before attempting workarounds.

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

### Brain Tools (Universal)

The following Brain tools are available to **all agents** regardless of role, and are the primary interface to institutional memory. They are provided via MCP server (B2+) or CLI (B1).

| Tool | Purpose | When to Use |
|---|---|---|
| `brain_query` | Semantic search across Brain entries | Before Propose/Escalate decisions; when confidence is low; when checking for precedent |
| `brain_record` | Create a new Brain entry | At chunk boundaries; after significant decisions; after resolving novel failures |
| `brain_retrieve` | Fetch specific entry by ID with link traversal | When a `brain_query` result references linked entries |
| `brain_strengthen` | Signal that a retrieved entry was useful | After using a Brain entry to inform a decision |

See Part 5 (Brain Architecture) for full tool contracts and the Context Source Routing chain (Part 2) for when to query.

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

## Model Selection

> **TL;DR** — Match model capability to role requirements across four tiers. Flagship for orchestration, workhorse for implementation, utility for triage, economy for batch. Using the best model for every role wastes money. Using the cheapest for every role breaks quality.

Different models have different strengths. Model assignment affects quality, cost, and latency simultaneously.

**The cost of wrong-tier assignment:** Using flagship for triage wastes 10-30x the token cost with no quality improvement — triage is pattern matching, not deep reasoning. Using economy for orchestration risks poor decomposition — the Orchestrator's judgment shapes every downstream task, and a bad decomposition compounds through the entire pipeline. The tier strategy exists because not all decisions carry equal weight, and the model budget should reflect that priority.

### Model Landscape Updates

The model landscape changes frequently. The Continuous AI Landscape Monitor (`monitor/`) tracks releases across 11 model providers (Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek, xAI, Cohere, HuggingFace, Ollama, llama.cpp) and feeds new model intelligence into the Brain as CONTEXT entries. When the monitor surfaces a new release, the Admiral should reassess tier assignments using the promotion/demotion signals in `fleet/model-tiers.md`.

### Model Landscape (March 2026)

| Model | Strengths | Context | Best For |
|---|---|---|---|
| **Claude Opus 4.6** | Strongest coder among frontier models. 72.5% SWE-Bench (per [Anthropic model card](https://docs.anthropic.com/en/docs/about-claude/models), March 2026). | 1M tokens | Orchestrator, Architect, complex implementation |
| **Claude Sonnet 4.6** | Strong code generation. Good instruction following. Faster. | 200K tokens | Implementers, QA, most specialists |
| **Claude Haiku 4.5** | Fast, cheap, reliable for well-defined tasks. | 200K tokens | Triage, formatting, simple transforms |
| **GPT-5.2 Pro** | Highest reasoning scores (93.2% GPQA Diamond, per [OpenAI model card](https://openai.com/index/gpt-5), March 2026). | 1M tokens | Research, complex analysis, long-context |
| **DeepSeek V3.2** | Near-frontier at ~1/30th cost. | 128K tokens | High-volume utility, cost-sensitive tasks |
| **Gemini 3 Pro** | Strong agentic workflows. Intent alignment. | 2M tokens | Research, multi-document analysis |

> **Note on benchmarks:** Model capabilities and benchmark scores change rapidly. The numbers above reflect publicly reported figures as of March 2026 and should be verified against current model cards and release announcements before making tier assignments. The Continuous AI Landscape Monitor (`monitor/`) automates this verification.

### Model Tier Strategy

| Tier | Profile | Typical Roles |
|---|---|---|
| **Tier 1: Flagship** | Most capable. Deepest reasoning. | Orchestrator, Architect, Devil's Advocate, Red Team |
| **Tier 2: Workhorse** | Strong general capability. Moderate cost. | Implementers, QA, Database Agent, most specialists |
| **Tier 3: Utility** | Fast, cheap, reliable for well-defined tasks. | Triage, formatting, pattern matching |
| **Tier 4: Economy** | Near-frontier at fraction of cost. | High-volume utility, cost-sensitive batch processing |

**When to promote:** Role's First-Pass Quality Rate causes rework costing more than the tier upgrade. Or: the monitor surfaces a new model release with significantly improved capabilities at the same tier's price point.

**When to demote:** Output quality at a higher tier is indistinguishable from lower. A/B test: same task, both tiers, compare. Or: the monitor surfaces a new economy-tier model that matches current workhorse quality.

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

## Protocol Integration

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

> **Practitioner guide:** For server selection criteria, testing/validation procedures, incremental adoption paths, and security checklists for both MCP and A2A, see [Part 13 — Protocol Integration Guide](part13-mcp-integration.md).

### A2A — Agent-to-Agent Protocol

A2A enables structured communication between agents across process, machine, and organizational boundaries. Where MCP connects agents to tools, A2A connects agents to each other.

**Agent Discovery:**

Every A2A-capable agent publishes an Agent Card — a machine-readable declaration of:
- **Identity:** Verified agent name, role, fleet membership, and public key
- **Capabilities:** What tasks the agent can accept, input schemas, output schemas
- **Authentication:** Required auth method (API Key, OAuth 2.0, mTLS)
- **Availability:** Current status (available, busy, offline), queue depth, estimated response time

Agent Cards are registered with the fleet's discovery service (typically the Orchestrator or a dedicated registry). Agents discover each other through the registry, never through ad-hoc network scanning.

**Communication Contract:**

| Property | Specification |
|---|---|
| **Transport** | JSON-RPC 2.0 over HTTPS. Mutual TLS for cross-organization. |
| **Authentication** | Fleet-internal: signed API keys. Cross-fleet: OAuth 2.0 with RFC 8707 resource indicators to prevent cross-server token reuse. |
| **Message format** | Structured request with: sender identity, trace_id, task description, input payload, deadline, budget remaining. |
| **Response format** | Structured response with: status (accepted/rejected/completed/failed), output payload, resource consumed, errors. |
| **Timeout** | Configurable per request. Default: 5 minutes. Caller receives timeout error and moves to recovery ladder. |
| **Retry** | Caller may retry once after timeout. No automatic retry storms. |
| **Idempotency** | All A2A requests include a unique request_id. Receivers must handle duplicate requests idempotently. |

**Failure Handling:**

- **Agent offline:** Registry marks agent unavailable. Orchestrator routes to fallback agent or queues the request.
- **Mid-flight failure:** If an agent fails during task execution, it sends a partial result with status `failed` and error context. The caller decides: retry, fallback, or escalate.
- **Network partition:** A2A requests include a deadline. If no response arrives by deadline, the caller treats it as a timeout and follows the recovery ladder.
- **Identity spoofing:** All A2A messages are signed with the sender's private key. Receivers verify signatures against the registry's public key store. Unsigned messages are rejected.

**When to use A2A vs. Orchestrator-mediated handoffs:**

| Scenario | Use |
|---|---|
| Agents in the same session | Direct orchestration (no A2A needed) |
| Agents in different processes, same machine | A2A or shared filesystem with contracts |
| Agents across machines or organizations | A2A with full authentication and encryption |
| Agents using different LLM providers | A2A — provider-agnostic communication |
| Simple task delegation | Orchestrator-mediated handoff (Handoff Protocol, Part 11) |
| Complex multi-step collaboration | A2A with structured contracts |

### Protocol Security

- **MCP servers as exfiltration points:** Audit all servers.
- **A2A impersonation:** Verify identity through signed cards or mTLS.
- **Token misuse:** Use RFC 8707 Resource Indicators to prevent cross-server token reuse.
- **Credential delegation prevention:** A2A tokens are non-transferable. An agent cannot pass its authentication context to another agent. Each agent authenticates independently.

> **TEMPLATE: PROTOCOL REGISTRY**
>
> MCP SERVERS:
> - [Server]: [Version] — Agents: [list]. Permissions: [scope]. Trust: [official/community/internal].
>
> A2A CONNECTIONS:
> - [Agent A] ↔ [Agent B]: [Purpose]. Auth: [method]. Format: [JSON-RPC / custom].

-----

