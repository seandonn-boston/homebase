# THE FLEET ADMIRAL FRAMEWORK

**A Repeatable Protocol for Establishing Autonomous AI Agent Fleets**

v3.0 · February 2026

-----

> **PURPOSE**
>
> This framework defines the universal requirements for deploying an autonomous AI agent fleet on any project.
>
> It is organized into twenty-eight sections across nine phases. Each phase addresses a distinct layer of fleet operations, ordered by dependency: strategic foundations are established before enforcement mechanisms, enforcement before architecture, architecture before execution.
>
> Use the Pre-Flight Checklist at the end as your go/no-go gate. If any box is unchecked, the fleet is not ready.

-----

## The Operating Model

You are the Admiral. You provide the strategic context, constraints, and clarity that no AI can generate for itself. You may be a human operator, a meta-agent orchestrating other agents, or a hybrid of both. What matters is not whether you write code — it is whether the fleet has the context it needs to operate autonomously within defined boundaries.

Every autonomous AI system, regardless of intelligence, operates within the boundaries of what it has been told and what has been enforced. The quality of those boundaries — and the reliability of their enforcement — determines whether a fleet self-organizes into productive work or spirals into hallucination, scope creep, and wasted tokens.

This framework codifies twenty-eight categories of information across nine phases. They are universal across project types, tech stacks, and domains.

> **CORE PRINCIPLE**
>
> AI agents are not limited by capability. They are limited by context.
>
> Instructions can be forgotten under context pressure. Enforcement mechanisms cannot. The Admiral's job is to determine which constraints are instructions and which are enforcement — then implement both.

> **HOW TO USE THIS DOCUMENT**
>
> **For new projects:** Read all nine phases. Complete the artifacts in each section. Run the Pre-Flight Checklist.
>
> **For existing projects adopting AI fleets:** Audit what you already have against each section. Fill gaps. Run the Pre-Flight Checklist.
>
> **For active fleets:** Use this as a diagnostic tool when things go wrong. The root cause will map to a gap in one of these twenty-eight areas.
>
> **This document is not a CLAUDE.md file.** It is the meta-framework that generates CLAUDE.md files, agent configurations, hook scripts, and operational artifacts. Your actual configuration files should be under 150 lines each. This document is the source of truth they are distilled from.

-----

# PHASE I — STRATEGIC FOUNDATION

*Why does this fleet exist, and what are the walls?*

-----

## 01 — MISSION

Before any agent writes a line of code or makes a single decision, the fleet needs to understand what it exists to accomplish. The Mission is not a product specification. It is the strategic frame that prevents drift. It answers two questions: what are we building, and how do we know when we have built it.

### What to Define

- **Project Identity:** What is this? One sentence. If you cannot express it in a single sentence, the fleet will not stay aligned. This sentence becomes the gravitational center that every agent decision orbits.
- **Success State:** What must be true for this project to be considered successful? Define this in concrete, observable terms. Not "a great user experience" but "a user can complete the core workflow in under 3 clicks with no errors."
- **Stakeholders and Audience:** Who is this for? What do they care about? Agents make better micro-decisions when they understand the human context behind the work.
- **Current Phase:** Is this a greenfield build, a feature addition to an existing product, a refactor, a migration? The project phase changes how agents should approach ambiguity, risk, and scope.

### The Spec-First Pipeline

The Mission is not just a document — it is the entry point to an automated pipeline. Each phase produces auditable artifacts that feed the next.

```
Mission → Requirements Spec → Design Spec → Task Decomposition → Implementation
```

Define at which pipeline stage the fleet takes over. For mature fleets, the fleet can drive the pipeline from Requirements onward. For new fleets, the Admiral authors Requirements and Design, and the fleet takes over at Task Decomposition. Regardless of entry point, the Mission anchors every downstream artifact.

> **TEMPLATE: MISSION STATEMENT**
>
> This project is [one-sentence identity].
>
> It is successful when [concrete, observable success state].
>
> It is built for [stakeholders/audience] who need [core need].
>
> Current phase: [greenfield | feature-add | refactor | migration | maintenance].
>
> Pipeline entry: Fleet takes over at [Requirements | Design | Tasks | Implementation].

> **WHY THIS MATTERS**
>
> Without a Mission, orchestrators will infer one from the task list. Their inferred mission will be subtly wrong, and every downstream decision will compound that error. An explicit Mission is the cheapest and highest-leverage artifact you can provide.

-----

## 02 — BOUNDARIES

Boundaries are the single most effective tool you have against agent drift. AI agents are relentlessly helpful — they will expand scope, add features, refactor adjacent code, and over-engineer solutions unless you explicitly tell them not to.

### Non-Goals

Explicitly state what the project is NOT. Non-goals are more powerful than goals because they eliminate entire categories of work that agents would otherwise explore.

- **Functional non-goals:** Features, capabilities, or user flows that are explicitly out of scope.
- **Quality non-goals:** Levels of polish, optimization, or completeness that are not required at this phase. If you are building an MVP, say so.
- **Architectural non-goals:** Patterns, technologies, or approaches that must not be used.

### Hard Constraints

- **Tech stack:** Exact languages, frameworks, and tools with version numbers.
- **External deadlines:** Ship dates, demo dates, review dates.
- **Compatibility requirements:** Browser support, API backward compatibility, platform requirements.
- **Regulatory or policy constraints:** Anything legally or organizationally mandated.

### Resource Budgets

| Resource | What to Define | Why It Matters |
|---|---|---|
| Token budget | Max input + output tokens per task before the agent must deliver or escalate | Prevents unbounded exploration and forces convergence |
| Time budget | Wall-clock time limit per task | Prevents runaway loops and forces progress checkpointing |
| Tool call limits | Max external API calls, file operations, or tool invocations per task | Prevents brute-forcing solutions through excessive iteration |
| Scope boundary | File paths, repos, and services each agent may touch | Prevents well-intentioned agents from modifying code outside their jurisdiction |
| Quality floor | Minimum acceptable quality bar, defined concretely | Prevents infinite refinement by defining "good enough" |

### The LLM-Last Boundary

Define explicitly what deterministic tools handle versus what requires LLM judgment. This is the single highest-impact cost and reliability lever in fleet operations.

| Layer | Handles | Examples |
|---|---|---|
| **Deterministic first** | Everything that can be done with static analysis, regex, linters, shell commands, type checkers | Formatting, linting, import sorting, dead code detection, naming convention enforcement, test execution |
| **LLM when judgment is needed** | Decisions requiring understanding of intent, tradeoffs, novel design, ambiguous requirements | Architecture decisions, code review for logic errors, user-facing copy, complex refactors, debugging |

If a static tool can do it, the LLM should not. This is not about capability — it is about reliability and cost. A linter catches 100% of formatting violations. An LLM catches most of them, sometimes, depending on context pressure.

> **TEMPLATE: BOUNDARIES DOCUMENT**
>
> NON-GOALS: This project does not [non-goal 1]. It does not [non-goal 2]. It does not [non-goal 3].
>
> CONSTRAINTS: Must use [tech stack with versions]. Must ship by [date]. Must support [compatibility].
>
> BUDGETS: [X] tokens per task. [Y] minutes per task. Agents may only modify files in [paths].
>
> QUALITY FLOOR: [Concrete definition of minimum acceptable quality].
>
> LLM-LAST: The following are handled by deterministic tools, not LLM judgment: [list]. LLM is used only for: [list].

> **ANTI-PATTERN: SCOPE CREEP THROUGH HELPFULNESS**
>
> AI agents want to be helpful. An agent asked to implement a login form will also add password validation, a forgot-password flow, session management, and accessibility improvements — none of which were requested. Each addition is reasonable in isolation, but collectively they blow the budget and introduce untested code. Strong Boundaries are the primary defense.

-----

# PHASE II — ENFORCEMENT INFRASTRUCTURE

*How are constraints actually enforced? The distinction between instructions and enforcement is the single most important operational insight in fleet management.*

-----

## 03 — DETERMINISTIC ENFORCEMENT

An instruction in a CLAUDE.md file saying "never use rm -rf" can be forgotten under context pressure. A PreToolUse hook that blocks `rm -rf` fires every single time. This distinction — between advisory instructions and deterministic enforcement — is the foundation of reliable fleet operations.

### The Enforcement Spectrum

Every constraint you define in the framework falls somewhere on a spectrum from soft guidance to hard enforcement. Misclassifying a constraint — enforcing a soft preference as a hard hook, or leaving a critical safety requirement as a mere instruction — degrades either velocity or safety.

| Level | Mechanism | Reliability | Use For |
|---|---|---|---|
| **Hard enforcement** | Hooks (PreToolUse, PostToolUse), CI gates, linters, type checkers, file system permissions | 100% — fires deterministically regardless of context | Safety constraints, security boundaries, scope limits, formatting standards, test requirements |
| **Firm guidance** | CLAUDE.md rules, system prompt instructions, agents.md directives | High but degradable — can be forgotten under context pressure, especially in long sessions | Coding patterns, architectural preferences, naming conventions, workflow procedures |
| **Soft guidance** | Comments in code, README notes, verbal instructions | Low — easily overridden or missed | Suggestions, preferences, nice-to-haves |

### Hook Lifecycle Events

Hooks are shell commands that execute deterministically at defined lifecycle points. They are not requests — they are executed code.

| Event | When It Fires | Use For |
|---|---|---|
| **PreToolUse** | Before any tool invocation | Blocking dangerous commands, enforcing scope boundaries, requiring confirmation for destructive operations |
| **PostToolUse** | After any tool invocation | Logging, auditing, triggering downstream checks |
| **PreCommit** | Before a git commit is created | Linting, test execution, formatting, secret scanning |
| **PostCommit** | After a git commit is created | Notification, CI trigger, changelog update |
| **SessionStart** | When an agent session begins | Context loading, environment validation, staleness checks |
| **TaskCompleted** | When a task is marked complete | Quality gate execution, metric logging, handoff preparation |
| **PrePush** | Before pushing to remote | Branch protection, review requirements |

### What Must Be Hooks vs. Instructions

| Category | Hook (Deterministic) | Instruction (Advisory) |
|---|---|---|
| **Security** | Block `rm -rf /`, prevent commits with secrets, enforce file scope boundaries | Prefer secure patterns, follow OWASP guidelines |
| **Quality** | Run linter on save, execute tests before commit, type-check before merge | Write clean code, follow naming conventions |
| **Scope** | Block file modifications outside assigned directories | Stay focused on the current task |
| **Process** | Require test existence before implementation is accepted | Write tests for new features |
| **Cost** | Kill agent session after token budget exceeded | Be mindful of token usage |

### Self-Healing Quality Loops

The most effective fleet pattern discovered in production: hooks that detect failures and trigger automatic repair.

```
Agent writes code
  → PostToolUse hook runs linter
    → Linter fails
      → Hook returns failure with lint output
        → Agent receives failure, fixes violations
          → PostToolUse hook runs linter again
            → Linter passes → proceed
```

This loop replaces elaborate multi-pass review protocols. One deterministic check that fires every time and self-heals is more effective than three manual review passes that may or may not happen.

Apply the same pattern to:
- **Type checking:** Agent writes code → type checker runs → failures fed back → agent fixes → recheck.
- **Tests:** Agent implements feature → test suite runs → failures fed back → agent fixes → retest.
- **Formatting:** Agent writes code → formatter runs → diff applied automatically → no agent intervention needed.

> **TEMPLATE: ENFORCEMENT CLASSIFICATION**
>
> HARD ENFORCEMENT (hooks):
>
> - [Constraint]: [Hook event] — [Shell command]
> - [Constraint]: [Hook event] — [Shell command]
>
> FIRM GUIDANCE (instructions):
>
> - [Constraint]: [Where documented — CLAUDE.md / system prompt / agents.md]
>
> SOFT GUIDANCE (reference):
>
> - [Preference]: [Where noted]

> **ANTI-PATTERN: ALL INSTRUCTIONS, NO HOOKS**
>
> The Admiral writes comprehensive CLAUDE.md rules for every constraint but implements zero hooks. For the first 60% of a session, the agent follows the rules. As context pressure builds and the window fills, rules near the beginning of the file lose attention weight. The agent starts violating constraints it followed perfectly an hour ago. The Admiral adds more rules. The file grows. The agent ignores more. This is a death spiral. Any constraint that must hold with zero exceptions must be a hook, not an instruction.

-----

## 04 — CONFIGURATION FILE STRATEGY

Configuration files are how the fleet receives its instructions. They are as important as source code — version them, review them, test them. A poorly structured configuration file is a fleet operating on corrupted instructions.

### The Configuration Hierarchy

Different tools read different files, but the principles are universal. Configuration flows from broad to narrow, with narrower scopes overriding broader ones.

| Scope | File | Purpose |
|---|---|---|
| **Personal** | `~/.claude/settings.json` | User-level defaults, API keys, model preferences |
| **Organization** | Organization-level config | Shared standards across all repos |
| **Repository** | `CLAUDE.md`, `agents.md`, `.cursorrules` | Project-specific instructions |
| **Path-specific** | `.claude/rules/*.md`, path-scoped instructions | Rules that apply only to certain directories |
| **Role-specific** | `.claude/agents/*.md`, `.agent.md` files | Per-agent identity, authority, constraints |
| **On-demand** | `.claude/skills/*.md` | Knowledge loaded only when context matches |
| **Enforcement** | `.claude/settings.json` (hooks), `.husky/`, CI configs | Deterministic constraints that cannot be overridden |

### The 150-Line Rule

Official Anthropic guidance: CLAUDE.md should not exceed 150 lines. For each line, ask "Would removing this cause mistakes?" If not, remove it.

Bloated instruction files cause agents to ignore rules. This is not a soft preference — it is an observed failure mode. When an agent's context window is loaded with 500 lines of instructions, the instruction-following rate degrades measurably. The agent has too many constraints competing for attention and satisfies none of them deeply.

**How to stay under 150 lines:**

- Move stable reference material to skills (loaded on demand, not at startup).
- Move enforcement constraints to hooks (executed deterministically, not occupying context).
- Move per-agent instructions to agent-specific files (each agent loads only its own).
- Move path-specific rules to path-scoped files (loaded only when working in that directory).
- What remains in CLAUDE.md: project identity, tech stack, critical conventions, workflow essentials.

### Cross-Tool Portability

The emerging standard is `agents.md` — a project instruction file that works across Copilot, Claude Code, Cursor, and Gemini CLI. Analysis of 2,500+ agents.md files shows the best configurations share six characteristics:

1. **Clear persona** — who the agent is and what it's responsible for.
2. **Executable commands** — exact shell commands, not descriptions of what to run.
3. **Concrete code examples** — show the pattern, don't describe it.
4. **Explicit boundaries** — what the agent does NOT do.
5. **Tech stack specifics** — exact versions and configurations.
6. **Coverage across six areas** — commands, testing, project structure, code style, git workflow, boundaries.

### Progressive Disclosure via Skills

Instead of front-loading every possible instruction into the agent's context at startup, use skills — modular knowledge units that load only when the context matches.

```
# .claude/skills/database-patterns.md
---
match: "prisma/**" OR "database" OR "migration" OR "schema"
---

Database conventions for this project:
- Use Prisma with PostgreSQL 16
- Migrations must be reversible
- [Specific patterns...]
```

The agent receives database knowledge only when working on database tasks. For all other tasks, that context is not loaded, preserving the agent's working memory for the actual work.

> **TEMPLATE: CONFIGURATION AUDIT**
>
> CLAUDE.md: [X] lines (target: <150). Last reviewed: [date].
>
> Skills: [N] skill files covering [domains].
>
> Hooks: [N] hooks covering [enforcement categories].
>
> Agent files: [N] agent definitions.
>
> Path rules: [N] path-specific rule files.
>
> Cross-tool: agents.md [exists/does not exist]. Compatible with: [tools].

> **ANTI-PATTERN: CONFIGURATION ACCRETION**
>
> After every incident, the Admiral adds a new line to CLAUDE.md: "also don't do X." After every missed convention, another line: "always do Y." The file grows from 80 lines to 400 lines over three months. The agent's instruction-following rate degrades with each addition. Treat configuration files like code: refactor regularly. When adding a new instruction, audit whether it can replace or subsume an existing one. When a constraint is critical enough to add, ask whether it should be a hook instead.

-----

## 05 — CONFIGURATION SECURITY

Agent configurations are attack surfaces. A compromised CLAUDE.md, a malicious MCP server, or a poisoned memory file can turn your fleet against your own codebase. This is not theoretical — documented attacks include memory poisoning, supply chain compromises, agent hijacking, and prompt injection through third-party skills.

### Threat Model

| Attack Vector | How It Works | Impact | Defense |
|---|---|---|---|
| **Memory poisoning** | Adversary implants false information into agent long-term storage. Unlike prompt injection that ends with the session, poisoned memory persists indefinitely. | Agent makes decisions based on false context across all future sessions | Validate memory sources. Version-stamp memory entries. Audit memory files for unexpected changes. Never auto-load memory from untrusted sources. |
| **Supply chain compromise** | Malicious MCP server, skill, or plugin is installed. It appears to function normally while exfiltrating data or injecting instructions. | Data exfiltration, code injection, credential theft | Audit all MCP servers before installation. Pin versions. Review source code. Monitor network traffic. Use only servers from trusted sources. |
| **Configuration injection** | Attacker modifies CLAUDE.md, agents.md, or hook scripts in a PR or through compromised CI. | Agent follows attacker-controlled instructions | Treat config files as security-critical code. Require review for all config changes. Use CODEOWNERS for `.claude/` directories. |
| **Prompt injection via skills** | Third-party skill contains hidden instructions that override the agent's constraints. | Agent bypasses boundaries, executes unintended actions | Review all skill files before use. Never auto-install skills from untrusted sources. Sandbox skill execution. |
| **Agent hijacking** | Exploiting agents with broad permissions to perform unauthorized actions (BodySnatcher, ZombieAgent patterns). | Autonomous agent performs destructive or exfiltrative actions | Principle of least privilege. Scope boundaries per agent. Audit logs for all agent actions. |

### Security Scanning Protocol

Scan your own agent configurations for vulnerabilities before deployment. A red-team/blue-team/auditor pipeline:

1. **Red team:** Attempt to make the agent violate its constraints. Probe for prompt injection vulnerabilities in skills and MCP servers. Test whether memory files can be poisoned. Attempt to escalate agent permissions.
2. **Blue team:** Review configuration files for overly broad permissions. Audit MCP server access. Verify hook enforcement covers critical safety constraints. Check that scope boundaries are enforced, not just instructed.
3. **Auditor:** Compare the agent's actual behavior against its documented constraints. Verify that the enforcement classification (Section 03) is implemented correctly. Check that no constraint classified as "hard enforcement" is actually implemented as an instruction.

### Configuration Hygiene

- **Version all configuration files.** CLAUDE.md, agents.md, hook scripts, skill files — all in git, all reviewed in PRs.
- **CODEOWNERS for `.claude/` directories.** Configuration changes require explicit approval from the Admiral or a designated security reviewer.
- **Pin MCP server versions.** Never use `latest` for MCP servers in production. Pin to a specific version and audit before upgrading.
- **Audit third-party skills.** Read every line of every skill file before installing. Skills execute in the agent's context with the agent's permissions.
- **Rotate secrets.** API keys, tokens, and credentials referenced in configuration must follow the same rotation policies as application secrets.
- **Monitor for drift.** Configuration files in the repository should be the source of truth. If an agent's behavior diverges from the configuration, investigate immediately — it may indicate memory poisoning or configuration override.

> **TEMPLATE: SECURITY AUDIT CHECKLIST**
>
> - [ ] All configuration files are version-controlled
> - [ ] CODEOWNERS set for `.claude/` and equivalent directories
> - [ ] MCP servers pinned to specific versions
> - [ ] All third-party skills reviewed (source code read)
> - [ ] Memory files audited for unexpected entries
> - [ ] Hooks enforce all critical safety constraints
> - [ ] No secrets in configuration files (using environment variables or secret managers)
> - [ ] Agent scope boundaries enforced via hooks, not just instructions
> - [ ] Red-team probe completed for prompt injection via skills/MCP
> - [ ] Audit log enabled for all agent actions

> **ANTI-PATTERN: TRUST BY DEFAULT**
>
> The Admiral installs a popular MCP server with 10K GitHub stars without reading its source code. The server functions perfectly — it also sends a copy of every file the agent reads to an external endpoint. Popularity is not security. Stars are not audits. Every third-party component that runs in your agent's context has the same access your agent has. Treat MCP servers, skills, and plugins with the same scrutiny you apply to production dependencies.

-----

# PHASE III — FLEET ARCHITECTURE

*Who does what, with what authority, using what tools, speaking what protocols, on what models?*

-----

## 06 — FLEET COMPOSITION

The framework defines the rules of engagement, but the fleet needs to know who is on the team. Fleet Composition defines which agents exist, what each one specializes in, how the orchestrator routes tasks to the right specialist, and the interface contracts between them.

### Agent Roster

Define every agent role in the fleet. Each role needs a clear identity, a defined scope of responsibility, and explicit boundaries on what it does not do. The research is unambiguous: **narrow, specialized, deeply integrated agents outperform ambitious generalists.** A typical fleet needs five to ten roles, not fifty.

| Role | Responsibility | Does NOT Do |
|---|---|---|
| Orchestrator | Decomposes goals into tasks, routes to specialists, manages progress, enforces standards | Write production code directly, make architectural decisions above its authority tier |
| Implementer | Writes code, implements features, follows specifications exactly | Choose architecture, add unrequested features, modify files outside assigned scope |
| QA Agent | Reviews output, runs tests, validates against acceptance criteria, flags issues | Fix issues directly (sends back to Implementer), approve its own work |
| Database Agent | Designs schemas, writes migrations, optimizes queries | Modify application code, change API contracts without orchestrator approval |
| Design Agent | Produces UI/UX specifications, component layouts, style guidelines | Implement designs in code (hands off to Implementer) |

This is an example roster. The critical requirement is that every role is defined and every agent knows exactly which role it occupies.

### Practical Agent Role Catalog

Select from these roles based on the project's actual needs. Define "Does NOT Do" boundaries for each selected role.

**Command & Coordination**

| # | Role | Responsibility |
|---|---|---|
| 1 | Orchestrator | Decomposes goals, routes to specialists, manages progress, enforces standards |
| 2 | Triage Agent | Classifies incoming work by type, priority, and complexity; routes to correct queue |
| 3 | Context Curator | Manages context window loading per role; selects relevant artifacts, compresses stale context |

**Engineering — Frontend**

| # | Role | Responsibility |
|---|---|---|
| 4 | Frontend Implementer | Builds UI components, implements designs, handles browser-specific concerns |
| 5 | Accessibility Auditor | Tests WCAG compliance, screen reader compatibility, keyboard navigation |
| 6 | State Management Agent | Designs client-side state architecture, data flow patterns, cache synchronization |

**Engineering — Backend**

| # | Role | Responsibility |
|---|---|---|
| 7 | Backend Implementer | Server-side logic, business rules, service layer code, request handling |
| 8 | API Designer | Endpoint contracts, versioning strategies, request/response schemas |
| 9 | Database Agent | Schemas, migrations, query optimization, indexing, data integrity |
| 10 | Queue & Messaging Agent | Async workflows, event schemas, pub/sub, dead letter handling |

**Engineering — Cross-Cutting**

| # | Role | Responsibility |
|---|---|---|
| 11 | Architect | System structure, pattern evaluation, architectural decision records |
| 12 | Integration Agent | Third-party APIs, data sync, webhooks, protocol translation |
| 13 | Migration Agent | System migrations, data transformations, version upgrades |
| 14 | Refactoring Agent | Restructures code without changing external behavior |
| 15 | Dependency Manager | Evaluates, updates, audits dependencies; version conflicts, license compliance |

**Engineering — Infrastructure**

| # | Role | Responsibility |
|---|---|---|
| 16 | DevOps Agent | CI/CD pipelines, deployment automation, build systems |
| 17 | Infrastructure Agent | Cloud resources via IaC, network configuration, resource scaling |
| 18 | Observability Agent | Logging, metrics, distributed tracing, alerting rules |

**Quality & Testing**

| # | Role | Responsibility |
|---|---|---|
| 19 | QA Agent | Reviews output against acceptance criteria, validates deliverable quality |
| 20 | Unit Test Writer | Focused unit tests, test fixtures, edge case coverage |
| 21 | E2E Test Writer | Integration and end-to-end tests, cross-system workflow validation |
| 22 | Performance Tester | Load testing, benchmarking, profiling, bottleneck identification |

**Security & Compliance**

| # | Role | Responsibility |
|---|---|---|
| 23 | Security Auditor | Vulnerability scanning (OWASP Top 10), auth flow review, dependency CVE audit |
| 24 | Compliance Agent | Regulatory framework validation (SOC 2, HIPAA, PCI-DSS), policy enforcement |

**Simulation & Adversarial**

| # | Role | Responsibility |
|---|---|---|
| 25 | Simulated User | Tests workflows as a real user would — happy path, deviations, UX friction |
| 26 | Devil's Advocate | Challenges architectural decisions, argues opposing positions, stress-tests assumptions |
| 27 | Red Team Agent | Adversarial review of fleet outputs: reasoning gaps, failure modes, rigor |

**Meta & Autonomous**

| # | Role | Responsibility |
|---|---|---|
| 28 | Pattern Enforcer | Scans codebase for architectural violations, naming inconsistencies, convention erosion |
| 29 | Dependency Sentinel | Monitors dependency changes, security advisories, deprecation notices |
| 30 | Role Crystallizer | Monitors fleet operations for signals that a new specialist role should exist — tasks bouncing between agents, recurring escalations, quality degradation in generalist-handled domains. Proposes new roles to Admiral with evidence. |
| 31 | Meta-Agent Builder | Generates new agent definitions, skill files, and hook configurations from descriptions. The agent that builds agents. Validates generated configs against the security checklist (Section 05) before proposing them. |

**Scheduled Agents**

| # | Role | Responsibility |
|---|---|---|
| 32 | Docs Sync Agent | Monthly: audits documentation against code, flags stale docs, generates updates |
| 33 | Quality Review Agent | Weekly: runs comprehensive quality analysis across the codebase |
| 34 | Dependency Audit Agent | Biweekly: checks for outdated dependencies, security advisories, license changes |

### Routing Logic

The orchestrator must have a clear decision tree for routing tasks to specialists.

- **Route by task type:** Database tasks go to the Database Agent. UI tasks go to the Design Agent then the Implementer. Test tasks go to QA.
- **Route by file ownership:** Each specialist owns specific files or directories. Tasks touching those files route to the owner.
- **Escalate ambiguous routing:** If a task spans multiple specialists, the orchestrator decomposes it further until each subtask has a clear owner. If decomposition fails, escalate to the Admiral.

### Interface Contracts

When one agent's output becomes another agent's input, the handoff must follow a defined contract.

- **Implementer → QA:** Delivers: code diff, list of changed files, description of intended behavior, relevant test commands. QA returns: pass/fail, specific issues with file and line references.
- **Design → Implementer:** Delivers: component specification with layout, spacing, colors, states, interaction behaviors. Implementer returns: implemented component with link to preview.
- **Orchestrator → Any Specialist:** Delivers: task description, acceptance criteria, relevant context files, resource budget. Specialist returns: deliverable, completion status, issues encountered, assumptions made.

> **TEMPLATE: FLEET ROSTER**
>
> FLEET: [Project Name]
>
> ORCHESTRATOR: [Model/config] — authority tier, context loading strategy
>
> SPECIALISTS:
>
> - [Role]: scope, file ownership, interface contracts, schedule (continuous | triggered | cron)
> - [Role]: scope, file ownership, interface contracts, schedule
>
> ROUTING: [Decision tree or rules for task assignment]

> **ANTI-PATTERN: FLEET BLOAT**
>
> The Admiral adds specialists to solve every problem. The fleet grows to twenty-five agents. The orchestrator's context window cannot hold the full roster. Routing becomes a maze. Interface contracts multiply quadratically. A fleet that cannot be held in a single orchestrator's context is a fleet that cannot be coordinated. The upper bound for a single fleet is eight to twelve active specialists before coordination costs dominate. The boring agents win. Narrow, specialized, deeply integrated beats ambitious and exotic.

-----

## 07 — DECISION AUTHORITY

Every orchestrator needs a clear decision envelope: what it may decide autonomously versus what requires Admiral approval. Without this, agents either bottleneck on you for trivial choices or make costly unilateral decisions.

### Four Tiers of Authority

The original three-tier model (Autonomous / Propose / Escalate) is extended with a fourth tier: **Enforced** — decisions that are not left to the agent at all.

| Tier | Behavior | Examples |
|---|---|---|
| **ENFORCED** | Handled by hooks, not agent judgment. The agent never makes this decision — the enforcement layer prevents or requires the action deterministically. | File scope boundaries, secret detection, test execution before commit, formatting standards, forbidden commands |
| **AUTONOMOUS** | Proceed without asking. Log the decision. | File naming, variable naming, internal refactors, test creation, dependency patch versions |
| **PROPOSE** | Draft the decision with rationale. Present alternatives. Wait for approval. | New dependencies, architecture changes, schema migrations, public API changes |
| **ESCALATE** | Stop all work on this task. Flag to Admiral immediately. Do not proceed. | Scope changes, budget overruns, security concerns, contradictory requirements |

### Calibration Rubric

| Project Condition | Calibration |
|---|---|
| Strong test coverage (>80%) | Widen Autonomous tier. Tests catch mistakes. |
| Greenfield / pre-MVP | Narrow Autonomous tier. Early decisions have outsized impact. |
| Established architecture patterns | Promote pattern-following to Autonomous. Demote pattern-breaking to Propose. |
| External-facing or regulated | Narrow Autonomous significantly. User-visible or compliance-related requires Propose minimum. |
| High trust in orchestrator | Gradually widen Autonomous over time as trust is earned. |
| Self-healing hooks in place | Widen Autonomous for categories covered by hooks. The hook catches errors the agent misses. |

> **ANTI-PATTERN: DEFERENCE CASCADING**
>
> When one agent is uncertain, it defers to another. That agent, also uncertain, defers back or to a third. The result is a decision made by whichever agent is last in the chain — usually the least qualified. Require agents to explicitly flag uncertainty rather than passing it laterally. Uncertainty always flows upward, never sideways.

-----

## 08 — TOOL & CAPABILITY REGISTRY

Every agent operates through tools. An agent's tool set is the boundary between what it can reason about and what it can actually do. The Phantom Capabilities failure mode — where agents confidently produce output based on tools they do not have — is one of the most common and expensive fleet failures.

### Registry Structure

For each agent role, define a Tool Registry listing every tool available in that agent's runtime.

| Field | What to Define |
|---|---|
| **Tool Name** | The exact name as it appears in the agent's tool list |
| **Capability** | What the tool does in one sentence |
| **Scope Limits** | What the tool cannot do or is restricted from doing in this fleet |
| **Shared State** | Whether the tool's outputs are visible to other agents |

### Negative Tool List

Equally important: define which tools the agent does NOT have.

- If the agent has no shell access: "You do not have shell access. Do not generate shell commands."
- If the agent cannot make HTTP requests: "You cannot access external URLs. Do not attempt API calls."
- If the agent has read-only file access: "You can read files but cannot write or modify them."

### MCP Server Registry

MCP (Model Context Protocol) servers extend agent capabilities. Each MCP server is a tool provider that must be registered, scoped, and secured.

| Server | Capability | Scope Limits | Security |
|---|---|---|---|
| **GitHub MCP** | Repository management, PR creation, issue tracking | Scoped to project repos only | OAuth token with minimal permissions |
| **Supabase MCP** | Database operations via natural language | Read-only for QA agents, read-write for Database Agent | Row-level security, scoped API key |
| **Sequential Thinking** | Deliberative reasoning through thought sequences | No side effects — reasoning only | No external access |
| **Filesystem MCP** | File read/write operations | Scoped to project directory only | No access outside project root |

### Tool Interaction Contracts

When multiple agents share tools that operate on shared state:

- **Ownership boundaries:** Which agent owns write access to which files or directories.
- **Conflict resolution:** What happens if two agents attempt to modify the same resource.
- **Tool output as handoff:** When one agent's tool output becomes another agent's input, make the contract explicit.

> **TEMPLATE: TOOL REGISTRY**
>
> ROLE: [Agent role]
>
> AVAILABLE TOOLS: [Tool Name]: [Capability]. Scope limits: [Restrictions]. Shared state: [Yes/No].
>
> MCP SERVERS: [Server Name]: [Capability]. Scope: [Limits]. Auth: [Method].
>
> NOT AVAILABLE: [Tool/capability the agent does not have and must not assume]
>
> INTERACTION CONTRACTS: [Shared resource]: Owned by [Agent]. [Other Agent] has [access level].

> **ANTI-PATTERN: TOOL HALLUCINATION**
>
> An agent without web access confidently generates a response referencing "the API documentation I retrieved" — but it never retrieved anything. It hallucinated the retrieval and reasoned from fabricated content. The Negative Tool List is the primary defense. When an agent knows it cannot perform an action, it is far more likely to escalate than to silently fabricate.

-----

## 09 — PROTOCOL INTEGRATION

MCP provides tool access. A2A provides agent-to-agent communication. Together they form the protocol layer that enables fleets to operate as coordinated systems rather than collections of independent agents.

### MCP — Tool Access Protocol

MCP (Model Context Protocol) is the standard for connecting agents to tools and data sources. Think of it as USB-C for AI — a universal connector that lets any agent use any compatible tool.

**Architecture:**

```
Agent ←→ MCP Client ←→ MCP Server ←→ Tool/Data Source
```

**What the Admiral must define:**

- **Server selection:** Which MCP servers does each agent role connect to? Not all agents need all servers.
- **Permission scoping:** Each MCP server connection should use the minimum permissions required. A QA agent needs read-only database access, not admin.
- **Version pinning:** Pin MCP server versions. Never use `latest` in production.
- **Security classification:** Classify each MCP server by trust level. Official servers (Anthropic, GitHub) have different trust profiles than community servers.

### A2A — Agent-to-Agent Protocol

A2A (Agent2Agent) enables structured communication between agents running in different processes, on different machines, or in different organizations.

**When to use A2A vs. direct orchestration:**

| Scenario | Use |
|---|---|
| Agents in the same process/session | Direct orchestration (orchestrator routes tasks) |
| Agents in different processes on the same machine | A2A or shared filesystem with contracts |
| Agents across different machines or organizations | A2A with full authentication |
| Agents using different LLM providers | A2A — provider-agnostic communication |

**A2A Agent Cards:** Each agent publishes a card describing its capabilities, accepted input formats, and authentication requirements. The orchestrator discovers available agents through their cards.

**Security:** A2A supports API Key, OAuth 2.0, OpenID Connect, and mTLS authentication. For fleet-internal communication, API keys may suffice. For cross-organization agent communication, OAuth 2.0 minimum.

### Protocol Security

Both protocols create new attack surfaces:

- **MCP servers as data exfiltration points:** A malicious MCP server can send data to external endpoints. Audit all servers.
- **A2A impersonation:** An attacker could publish a fake Agent Card that mimics a legitimate agent. Verify agent identity through signed cards or mutual TLS.
- **Token misuse:** MCP OAuth tokens scoped to one server could be used to access another. Use RFC 8707 Resource Indicators to prevent cross-server token misuse.

> **TEMPLATE: PROTOCOL REGISTRY**
>
> MCP SERVERS:
>
> - [Server]: [Version] — Connected agents: [list]. Permissions: [scope]. Trust: [official/community/internal].
>
> A2A CONNECTIONS:
>
> - [Agent A] ↔ [Agent B]: [Communication purpose]. Auth: [method]. Format: [JSON-RPC / custom].
>
> SECURITY:
>
> - MCP auth method: [OAuth / API key / mTLS]
> - A2A auth method: [OAuth 2.0 / mTLS / API key]
> - Audit logging: [enabled/disabled] for [which connections]

-----

## 10 — MODEL SELECTION

Different models have different strengths. Matching model capability to role requirements affects quality, cost, and latency simultaneously. Using the most capable model for every role is wasteful. Using the cheapest for every role is reckless.

### Model Landscape (February 2026)

| Model | Strengths | Context Window | Best For |
|---|---|---|---|
| **Claude Opus 4.6** | Strongest coder among frontier models. 72.5% SWE-Bench. Deep reasoning. | 1M tokens | Orchestrator, Architect, complex implementation |
| **Claude Sonnet 4.6** | Strong code generation. Good instruction following. Faster, cheaper than Opus. | 200K tokens | Implementers, QA, most specialist roles |
| **Claude Haiku 4.5** | Fast, cheap, reliable for well-defined tasks. | 200K tokens | Triage, formatting, simple transforms, pattern matching |
| **GPT-5.2 Pro** | Highest reasoning scores (93.2% GPQA Diamond). Long-context recall. | 1M tokens | Research, complex analysis, long-context tasks |
| **DeepSeek V3.2** | Near-frontier performance at ~1/30th cost. | 128K tokens | High-volume utility tasks, cost-sensitive implementations |
| **Gemini 3 Pro** | Strong agentic workflows. Intent alignment. | 2M tokens | Research, multi-document analysis, very-long-context tasks |

### Model Tier Strategy

| Tier | Model Profile | Typical Roles |
|---|---|---|
| **Tier 1: Flagship** | Most capable. Highest reasoning depth, best instruction following, largest context. | Orchestrator, Architect, Devil's Advocate, Red Team, Propose-tier decisions |
| **Tier 2: Workhorse** | Strong general capability. Good code generation. Moderate cost. | Implementers, QA, Database Agent, most specialists |
| **Tier 3: Utility** | Fast, cheap, reliable for well-defined tasks. | Triage, formatting, pattern matching, simple transforms |
| **Tier 4: Economy** | Near-frontier at fraction of cost. | High-volume utility, cost-sensitive batch processing |

**When to promote:** When a role's First-Pass Quality Rate at its current tier causes rework costing more than the tier upgrade.

**When to demote:** When output quality at a higher tier is indistinguishable from a lower tier. A/B test: same task, both tiers, compare against acceptance criteria.

### Multi-Model Orchestration

Production systems now coordinate multiple models in a single workflow. Perplexity Computer coordinates 19 models — using Claude Opus for orchestration, Gemini for research, GPT-5.2 for long-context recall, specialized models for image/video.

For fleet operations, multi-model orchestration means:

- The orchestrator may use a flagship model while implementers use workhorse models.
- A QA pass can run the same task through a competing model as an adversarial review.
- Cost-sensitive tasks can be routed to economy-tier models without degrading fleet-wide quality.

> **TEMPLATE: MODEL ASSIGNMENT**
>
> | Role | Tier | Model | Rationale |
> |---|---|---|---|
> | Orchestrator | Tier 1 | [Model] | Deep reasoning for decomposition, routing |
> | Implementer | Tier 2 | [Model] | Strong code generation, moderate cost |
> | QA Agent | Tier 2 | [Model] | Judgment for quality assessment |
> | Triage | Tier 3 | [Model] | Fast routing, minimal reasoning needed |
> | Batch tasks | Tier 4 | [Model] | High volume, cost sensitivity |

> **ANTI-PATTERN: UNIFORM MODEL ASSIGNMENT**
>
> The Admiral assigns the same flagship model to every role. The fleet produces excellent output at three to five times the necessary cost. The Orchestrator, which genuinely needs flagship-tier reasoning, competes for budget with the Pattern Enforcer, which would perform identically on a utility-tier model. Differentiate by tier. Reserve flagship capability for roles that demonstrably benefit from it.

-----

# PHASE IV — KNOWLEDGE & CONTEXT

*What do agents know, and how do they know it?*

-----

## 11 — GROUND TRUTH

The Ground Truth document is the single source of reality for the fleet. It contains everything an agent needs to know about the world it operates in: what words mean in this project, what the tech stack looks like, what tools are available, and what known issues exist. Without it, agents will hallucinate tool availability, misinterpret domain terms, and make decisions based on stale assumptions.

This document should be loaded into every agent's context at the start of every session. It is a living artifact maintained and updated at the start of every major work phase.

### Domain Ontology

- **Domain glossary:** Project-specific terms and their precise definitions. Include terms that have common meanings elsewhere but carry specific meaning here.
- **Naming conventions:** File naming, branch naming, variable naming, component naming. Be exhaustively specific.
- **Status definitions:** What "in progress," "blocked," "ready for review," and "done" mean concretely.
- **Architecture vocabulary:** What constitutes a "service," "layer," "module," or "feature" in this project.

### Environmental Facts

- **Tech stack and exact versions:** Not "React" but "React 19.1 with TypeScript 5.7, Vite 6.2, Tailwind 4.0."
- **Infrastructure topology:** Where things run, how they connect, deployment targets, CI/CD pipeline details.
- **Access and permissions:** What APIs, services, files, and tools each agent role actually has access to. Enumerate explicitly.
- **Current known issues:** Bugs, limitations, workarounds, and technical debt. Include any "do not touch" areas and why.
- **External dependencies:** Third-party services, their rate limits, SLAs, known instabilities.

### Configuration as Ground Truth

Configuration files are Ground Truth artifacts. They define the fleet's operational reality.

| Artifact | Purpose | Location | Review Cadence |
|---|---|---|---|
| `CLAUDE.md` | Project identity, critical conventions | Repository root | Every phase |
| `agents.md` | Cross-tool agent instructions | Repository root | Every phase |
| `.cursorrules` | Cursor-specific instructions | Repository root | When Cursor is in use |
| `.claude/settings.json` | Hooks, permissions, MCP config | `.claude/` directory | When enforcement changes |
| `.claude/agents/*.md` | Per-agent definitions | `.claude/agents/` | When fleet composition changes |
| `.claude/skills/*.md` | On-demand knowledge | `.claude/skills/` | When domain knowledge changes |

> **TEMPLATE: GROUND TRUTH DOCUMENT**
>
> PROJECT: [Name] | LAST UPDATED: [Date] | PHASE: [Current phase]
>
> ONTOLOGY: [Term]: [Definition]. Naming: [Convention rules]. Status: done = [conditions]; blocked = [conditions].
>
> ENVIRONMENT: Stack: [Exact versions]. Infra: [Topology]. Access: [Per-role list]. Known issues: [List]. External deps: [Service, limits, quirks].
>
> CONFIGURATION: CLAUDE.md: [lines/date]. Hooks: [count/last audit]. Skills: [count/domains]. MCP servers: [list/versions].

> **ANTI-PATTERN: PHANTOM CAPABILITIES**
>
> Agents will confidently assume tools and access they do not have. An orchestrator might delegate a task that assumes the specialist can query a database directly, when it can only read files. The specialist will then produce plausible-looking output that was never grounded in real data. The Ground Truth's access and permissions section is the primary defense.

-----

## 12 — CONTEXT WINDOW STRATEGY

The context window is the agent's working memory. Everything an agent can know, remember, and reason about must fit within it. Most fleet performance problems that look like capability failures are actually context management failures.

### Context Budget Allocation

| Zone | What It Contains | Typical Allocation | Priority |
|---|---|---|---|
| Standing Context | Mission, Boundaries, role definition, Ground Truth essentials, Decision Authority tier | 15–25% | Loaded first, never sacrificed |
| Session Context | Last checkpoint, current task specification, interface contracts, relevant code | 50–65% | Loaded at session start, refreshed at chunk boundaries |
| Working Context | Active reasoning, tool outputs, intermediate results, conversation history | 20–30% | Generated during execution, compressed as session grows |

Orchestrators need proportionally more standing context (broader awareness). Specialists need proportionally more working context (deeper execution).

### Loading Order Protocol

Context loading order is not arbitrary. Primacy anchors baseline behavior. Recency dominates active attention. The middle gets deprioritized.

1. **Load identity and constraints first.** Role definition, Decision Authority tier, Boundaries, Mission. Primacy ensures they function as foundational assumptions.
2. **Load reference material in the middle.** Ground Truth details, historical decisions, naming conventions. Available for reference without dominating active reasoning.
3. **Load the current task last.** Task specification, acceptance criteria, relevant code. Recency ensures active reasoning is oriented toward immediate work.

### The Progressive Disclosure Model

The traditional approach — load everything at session start — fails at scale. A 500-line CLAUDE.md plus Ground Truth plus session context plus task spec exhausts the window before work begins.

Progressive disclosure solves this:

- **Always loaded:** Mission (1-2 sentences), role identity, authority tier, critical constraints. Under 150 lines total.
- **Loaded on match:** Skills triggered by file patterns, task keywords, or domain context. Database patterns load when touching `prisma/`. Security patterns load when touching auth code.
- **Loaded on request:** Full architectural history, cross-system diagrams, comprehensive reference material. Available when the agent asks or the orchestrator provides.
- **Never loaded:** Other agents' internal context, other projects' artifacts, historical sessions older than the last checkpoint.

### Context Refresh Points

- **After completing each chunk.** Checkpoint, then reload with updated session context.
- **After a Propose-tier decision is resolved.** Decision becomes standing context. Deliberation history is compressed.
- **After an escalation is resolved.** Admiral's direction integrated into artifacts. Raw escalation thread discarded.
- **When drift is detected.** If output diverges from Mission or Boundaries, context refresh is the first intervention.

> **TEMPLATE: CONTEXT PROFILE**
>
> ROLE: [Agent role]
>
> STANDING CONTEXT: [Artifacts always loaded, in loading order]
>
> SESSION CONTEXT: [What loads at session start]
>
> ON-DEMAND CONTEXT: [Skills and reference loaded on match or request]
>
> REFRESH TRIGGERS: [Events triggering full context reload]
>
> SACRIFICE ORDER: [When full, what gets compressed first]

> **ANTI-PATTERN: CONTEXT STUFFING**
>
> The Admiral loads every artifact into every agent's context "just in case." Standing context consumes 60% of the window. Output becomes shallow and unfocused. More context is not better context. Curate ruthlessly. If an artifact is not directly relevant to the agent's current role and current task, it does not belong in the window.

-----

## 13 — CONTEXT ENGINEERING

Context engineering is the discipline of designing information flows across an entire agent system — not just crafting individual prompts, but architecting how the right information reaches the right agent at the right time in the right format. It subsumes prompt engineering the way software architecture subsumes writing functions.

### From Prompt Engineering to Context Engineering

| Prompt Engineering | Context Engineering |
|---|---|
| Crafting a single prompt for a single agent | Designing information flows across a fleet |
| Optimizing one agent's output quality | Optimizing the system's collective output |
| Focus: word choice, instruction ordering | Focus: what information exists where, when, and why |
| Operates at the prompt level | Operates at the system level |

### The Five Dimensions of Context

1. **Structural context:** How information is organized — file hierarchy, configuration layering, skill triggers, hook placement. This determines what the agent can access, not what it should attend to.

2. **Temporal context:** When information is loaded — at session start, on match, on request, at refresh points. Loading order affects primacy/recency weighting and attention distribution.

3. **Relational context:** How pieces of information relate to each other — dependency graphs between artifacts, cascade maps, interface contracts. An agent that knows its task but not the contract with the adjacent agent produces incompatible output.

4. **Authority context:** What weight each piece of information carries — enforced constraints vs. firm guidance vs. soft preferences. An agent that treats all instructions as equal will violate critical constraints when they compete with suggestions for attention.

5. **Absence context:** What the agent explicitly does not know and must not assume. Negative tool lists, non-goals, and "does not have access to" declarations are context about what is absent. Without absence context, agents fill gaps with hallucinated capabilities.

### Writing Effective Agent Instructions

Regardless of which tool reads the file (Claude Code, Copilot, Cursor, Gemini CLI), effective agent instructions follow the same principles:

**Constraints before permissions.** State what the agent must NOT do before stating what it should do. Negative constraints eliminate categories of behavior. Positive instructions try to enumerate all acceptable behaviors — and always miss some.

**Concrete over abstract.** "Do not modify files outside `src/features/auth/`" is enforceable. "Stay within your scope" is not.

**Explicit hierarchy.** "You are the [Role]. You do not make decisions that belong to [higher role]." One sentence. Primary defense against hierarchical drift.

**No hedging.** "Try to," "when possible," and "ideally" give the agent permission to skip the instruction. Use imperative language.

**Reference, do not repeat.** If the Ground Truth is loaded in context, reference it — do not restate it. Duplication creates divergence when one copy is updated and the other is not.

**Show, do not describe.** Concrete code examples are more reliably followed than verbal descriptions of patterns.

```
// DO:
Use this pattern for API routes:
export async function GET(req: NextRequest) {
  const data = await db.query(...)
  return NextResponse.json(data)
}

// DON'T:
"API routes should use the Next.js App Router pattern
with async handlers that return NextResponse objects."
```

### Prompt Anatomy

Every agent's system prompt should follow a consistent structure:

| Section | Purpose | Position |
|---|---|---|
| **Identity** | Who this agent is, hierarchical position | First — establishes operating posture |
| **Authority** | What it may decide, propose, or must escalate | Second — constrains all subsequent behavior |
| **Constraints** | Boundaries, non-goals, scope limits, budgets | Third — defines the walls before the agent sees the room |
| **Knowledge** | Ground Truth excerpts relevant to this role | Middle — reference material |
| **Task** | Current task, acceptance criteria, interface contracts | Last — benefits from recency effect |

### Prompt Testing Protocol

Prompts are code. Test before deployment.

1. **Boundary probe.** Task slightly outside scope. Does the agent refuse and escalate, or helpfully comply?
2. **Authority probe.** Decision belonging to the tier above. Does it decide or flag?
3. **Ambiguity probe.** Deliberately underspecified requirement. Does it invent, ask, or escalate?
4. **Conflict probe.** Two instructions that conflict. Which wins? Is the priority correct?
5. **Regression check.** After modification, re-run previous probes.

> **ANTI-PATTERN: PERSONALITY PROMPTING**
>
> Prompts that define personality ("You are a meticulous, detail-oriented engineer who takes pride in clean code") consume attention on character simulation rather than task execution. "Run the linter and fix all warnings before delivering" produces more reliable behavior than "You care deeply about code quality."

-----

# PHASE V — EXECUTION

*How work gets planned, parallelized, and completed.*

-----

## 14 — WORK DECOMPOSITION

AI agents have a fundamental weakness in planning: they do not naturally manage their own resource depletion. An agent given a large task will produce high-quality work for the first 60% and rush the remaining 40% as it approaches limits. Work Decomposition addresses this by defining how goals are broken into independently-completable chunks, each sized to receive full attention.

### Chunking Principles

- **No single task should consume more than 40% of an agent's token budget.** This ensures resources for execution, self-review, and checkpointing.
- **Each chunk must be independently completable and independently verifiable.**
- **Chunks must have explicit entry state and exit state.** Entry defines preconditions. Exit defines completion criteria.
- **Sequence chunks to front-load uncertainty.** Unknown complexity first, when resources are fresh and the Admiral is available for escalations.

### The Spec-First Pipeline

For significant features, the decomposition follows a structured pipeline where each phase produces artifacts that feed the next:

1. **Requirements Spec:** What the feature must do, expressed in user-visible terms. Acceptance criteria. Edge cases. Not how — what.
2. **Design Spec:** How the feature will be built. Architecture decisions. Data models. API contracts. Component structure.
3. **Task Decomposition:** The design spec broken into implementable chunks with entry/exit states and budgets.
4. **Implementation:** Each chunk executed by the appropriate specialist.

Each phase can be a separate agent session with a clean context load. The output artifact of phase N becomes the input artifact of phase N+1. This eliminates context accumulation across the pipeline.

### Self-Healing Quality Integration

Every chunk includes automated quality gates that fire after implementation:

```
Chunk complete
  → Run type checker → Fix if failures → Recheck
  → Run linter → Fix if failures → Recheck
  → Run tests → Fix if failures → Retest
  → All pass → Checkpoint → Next chunk
```

This replaces the elaborate multi-pass review protocol from v2. One automated loop that self-heals is more effective than three manual review passes.

> **TEMPLATE: TASK DECOMPOSITION**
>
> GOAL: [High-level objective]
>
> PIPELINE: [Requirements Spec → Design Spec → Tasks → Implementation] or [Tasks → Implementation]
>
> CHUNKS:
>
> 1. [Chunk] — Entry: [preconditions] — Exit: [deliverable + criteria] — Budget: [tokens/time] — Quality gates: [checks]
> 2. [Chunk] — Entry: [preconditions] — Exit: [deliverable + criteria] — Budget: [tokens/time] — Quality gates: [checks]
>
> SEQUENCE: [Ordered by uncertainty descending]

> **ANTI-PATTERN: COMPLETION BIAS**
>
> AI agents would rather produce a complete but mediocre output than an incomplete but excellent one. If running low on budget, an agent will silently drop quality to maintain the appearance of completeness. You get all 12 endpoints but the last 4 have no error handling. Define quality floor per chunk and require agents to deliver fewer chunks at full quality rather than all chunks at degraded quality.

-----

## 15 — PARALLEL EXECUTION STRATEGY

A fleet with five specialists that can only work one at a time is not a fleet. The power of fleet architecture lies in parallelism — multiple agents executing simultaneously. But parallelism without coordination produces divergent work that is expensive to reconcile.

### When to Parallelize

| Condition | Strategy | Rationale |
|---|---|---|
| Tasks share no files, no state, no interface dependency | **Parallelize** | Fully independent. No coordination needed. |
| Tasks share a well-defined interface but not implementation | **Parallelize with contract** | Define interface first, dispatch both sides. |
| Tasks share file ownership or overlapping state | **Serialize** | Parallel modification creates merge conflicts. |
| Task B depends on Task A's design decisions but not implementation | **Stagger** | Start A. Once design decisions checkpoint, start B. |
| Interface between tasks is not yet defined | **Serialize** | Parallelizing without a contract guarantees divergence. |

### Coordination Patterns

**1. Contract-First Parallelism:** Before dispatching parallel work, define the interface contract. Both agents work to it independently. Neither may unilaterally modify the contract.

**2. Checkpoint Synchronization:** Parallel agents checkpoint at defined intervals. The orchestrator reviews checkpoints for assumption alignment before allowing continued execution.

**3. Ownership Isolation:** Each parallel agent has exclusive write ownership of specific files or directories. Simplest pattern. Eliminates merge conflicts by construction. Works best when the codebase has clean modular boundaries.

**4. Git Worktree Isolation:** Each agent works in a separate git worktree — a complete copy of the repository. Agents work independently on different branches. Integration happens through merge after completion. Proven at scale by tools like Crystal.

### Assumption Divergence Detection

The most dangerous parallel failure: two agents completing their work successfully — each correct in isolation — that cannot integrate because their assumptions diverged silently.

**Warning signs:** Agent makes a design decision not in the contract. Agent asks clarifying questions the contract should have answered. Two agents produce intermediate outputs using different naming or data shapes.

**Resolution:** Pause both agents. Identify divergence point. Resolve with authority. Rebrief both agents.

> **ANTI-PATTERN: OPTIMISTIC PARALLELISM**
>
> The orchestrator dispatches parallel work without an interface contract. Each agent invents its own assumptions. Both produce excellent work. Neither is compatible with the other. Always define the contract before dispatching parallel work. Thirty minutes on a contract saves hours on rework.

-----

## 16 — SWARM PATTERNS & MULTI-MODEL ORCHESTRATION

Hierarchical fleets — orchestrator routing to specialists — are the default pattern for most projects. But research and production deployments have proven two advanced patterns that extend fleet capabilities: swarm intelligence and multi-model orchestration.

### When Hierarchical Fleets Are Sufficient

Most projects. A single orchestrator coordinating five to ten specialists, with clear routing and interface contracts, handles the majority of software development work. Do not reach for swarms or multi-model patterns unless the project's demands exceed what a hierarchical fleet can provide.

### Swarm Intelligence

In a swarm, agents self-organize rather than following top-down orchestration. A queen agent coordinates work, prevents drift, and reaches consensus even when individual agents fail.

**Swarm topology:**

```
Queen Agent
  ├── Worker A (specialization: frontend)
  ├── Worker B (specialization: backend)
  ├── Worker C (specialization: testing)
  └── Worker D (specialization: database)
```

**Key differences from hierarchical fleets:**

| Hierarchical Fleet | Swarm |
|---|---|
| Orchestrator assigns tasks | Queen coordinates; workers can self-select |
| Fixed routing rules | Dynamic routing based on current capacity |
| Agents report to orchestrator | Agents report to queen and communicate laterally |
| Single point of coordination | Consensus mechanisms for decisions |
| Failure requires orchestrator intervention | Swarm self-heals around failed agents |

**When to use swarms:**

- Tasks are numerous, similar, and parallelizable (batch processing, large-scale migrations).
- The project benefits from redundancy — multiple agents attempting the same task increases reliability.
- The fleet needs to operate with minimal Admiral oversight for extended periods.

### Multi-Model Orchestration

Different models for different tasks within a single workflow. Not just tier assignment (Section 10) but active coordination of multiple providers.

**Adversarial multi-model review:** Run the same task through two models from different providers. Have each critique the other's output. This surfaces errors that same-model review misses because different models have different blind spots.

**Specialized routing:** Use a research-optimized model for information gathering, a code-optimized model for implementation, and a reasoning-optimized model for architecture decisions — all within a single feature workflow.

**Cost-optimized pipelines:** Route the first draft to an economy-tier model, then route review and refinement to a flagship model. The economy model handles 80% of the token volume at 1/30th the cost.

> **ANTI-PATTERN: PREMATURE SWARM**
>
> The Admiral deploys a swarm for a five-person team's CRUD app. The consensus mechanisms, self-healing protocols, and queen coordination add complexity that exceeds the project's actual coordination needs. A simple hierarchical fleet with three specialists would produce the same output at a fraction of the operational overhead. Swarms are for scale problems, not simplicity problems.

-----

## 17 — SUCCESS CRITERIA & EXIT CONDITIONS

Every task delegation must include what "done" looks like. Without explicit exit conditions, agents will either under-deliver or loop indefinitely refining output that was already acceptable.

### Criteria Categories

- **Functional criteria:** What must the output DO? Concrete, testable behaviors. Not "the form should work" but "submitting the form with valid data creates a record and redirects to confirmation."
- **Quality criteria:** Measurable quality gates. Linting passes. Tests pass. Coverage above threshold. Response time under budget.
- **Completeness criteria:** What must exist beyond the core deliverable. Documentation updated. Error states handled. Edge cases addressed.
- **Negative criteria:** What the output must NOT do. Must not introduce new dependencies not in Ground Truth. Must not modify files outside scope. Must not break existing API contracts.

### Machine-Verifiable Criteria

The best exit conditions are ones an agent can verify autonomously by running a script, test suite, or validation tool.

> **EXAMPLE: MACHINE-VERIFIABLE CRITERIA**
>
> `npm run lint` exits 0
>
> `npm run test` exits 0, all tests pass
>
> `npm run build` succeeds with no warnings
>
> `npx tsc --noEmit` exits 0
>
> No files modified outside `src/features/[feature-name]/`

For criteria that cannot be machine-verified (design quality, UX, readability), assign them to QA verification levels (Section 18).

> **TEMPLATE: TASK ACCEPTANCE CRITERIA**
>
> TASK: [Task name]
>
> FUNCTIONAL: [Testable behavior 1], [Testable behavior 2]
>
> QUALITY: [Automated check 1], [Automated check 2]
>
> COMPLETENESS: [Required artifacts beyond code]
>
> NEGATIVE: [Must not 1], [Must not 2]
>
> VERIFICATION: [Self-Check | Peer Review | Admiral Review]
>
> EXIT: Complete when all criteria pass and verification approved.

-----

# PHASE VI — QUALITY & RECOVERY

*How the fleet maintains standards and handles failure.*

-----

## 18 — QUALITY ASSURANCE

Defining success criteria (Section 17) establishes what "done" looks like. Quality Assurance establishes who checks, how they check, and what happens when the check fails. Without a structured QA process, the fleet operates on the honor system — and AI agents, while earnest, are systematically biased toward declaring their own work complete.

### Verification Levels

| Level | What It Involves | When to Use |
|---|---|---|
| **Self-Check** | Agent reviews its own output against criteria. Runs automated checks (lint, tests, types). Self-healing loop resolves common issues. | Low-risk tasks within Autonomous tier. Internal refactors, test additions, documentation. |
| **Peer Review** | Separate QA agent reviews the output. Checks functional correctness, criteria compliance, code quality. Returns pass/fail with specific issues. | All feature implementations, schema changes, API modifications. Any Propose-tier task. |
| **Adversarial Review** | Same task run through a different model from a different provider. Each model critiques the other's output. Surfaces errors same-model review misses. | High-stakes implementations, security-sensitive code, architectural decisions. |
| **Admiral Review** | Admiral personally reviews output, decision log, reasoning traces. Strategic feedback. | Architectural decisions, first implementations of new patterns, anything flagged as uncertain. |

### Self-Healing as Primary QA

The most effective QA pattern is not review — it is automated quality gates that fire after every change and self-repair failures.

```
Agent completes implementation
  → Type checker runs → Failures fed back → Agent fixes → Recheck
  → Linter runs → Failures fed back → Agent fixes → Recheck
  → Test suite runs → Failures fed back → Agent fixes → Retest
  → All pass → QA agent receives clean output for review
```

The QA agent receives output that has already passed all automated checks. Human-judgment review focuses on what machines cannot check: logic correctness, design quality, edge case completeness, architectural alignment.

### QA Feedback Loop

When QA identifies an issue, feedback must be structured.

> **TEMPLATE: QA ISSUE REPORT**
>
> ISSUE: [One-sentence description]
>
> SEVERITY: [Blocker | Major | Minor | Cosmetic]
>
> LOCATION: [File, line number, or component]
>
> EXPECTED: [What should happen per acceptance criteria]
>
> ACTUAL: [What actually happens]
>
> CONFIDENCE: [Verified (tested) | Assessed (reviewed carefully) | Assumed (spot-checked)]

The confidence level tells the Admiral where real risk is concentrated. "Verified" means the QA agent confirmed the issue. "Assumed" means the QA agent inferred it — and the inference may be wrong.

> **ANTI-PATTERN: SYCOPHANTIC DRIFT**
>
> Over long sessions, agents increasingly agree with established framing rather than challenging it. QA agents are especially susceptible: after several review rounds where the orchestrator pushes back, the QA agent starts "finding" fewer issues. Ensure the QA agent's instructions explicitly state that finding zero issues is a red flag, not a success state.

-----

## 19 — FAILURE RECOVERY

The difference between a fleet that stalls and one that self-heals is whether you have given it explicit strategies for what to do when things go wrong. Without recovery protocols, agents either loop indefinitely, silently produce garbage, or freeze awaiting instructions.

### Standard Recovery Ladder

Every agent follows this ladder in order:

1. **Retry with variation.** If an approach fails, attempt a meaningfully different alternative (not the same approach repeated). Maximum 2–3 retries. Log what was tried and why it failed.
2. **Fallback to simpler approach.** A known-safe fallback producing a lesser but acceptable result. Defined in advance — agents should not improvise fallbacks under pressure.
3. **Backtrack.** If the current path is fundamentally wrong, the agent rolls back to the last known-good state and tries a different path entirely. This is distinct from retry — it abandons the current approach rather than varying it.
4. **Isolate and skip.** If retries, fallbacks, and backtracking are exhausted, mark the task as blocked with a structured report, move to the next task, and surface the blocker at checkpoint.
5. **Escalate to Admiral.** Produce a structured escalation report. Do not attempt further creative solutions.

### Backtracking

Traditional agent recovery is linear: try, fail, retry, escalate. Backtracking adds branching: try path A, fail, rollback to the decision point, try path B.

Effective backtracking requires:

- **Checkpoint before branching decisions.** Before an agent commits to an approach, it saves its current state.
- **Clean rollback.** The agent can return to the checkpoint without residual state from the failed path.
- **Path memory.** The agent records which paths were tried and why they failed, so it does not repeat them.

### Escalation Report Format

> **TEMPLATE: ESCALATION REPORT**
>
> BLOCKER: [One-sentence description]
>
> CONTEXT: [What task was being attempted and why]
>
> ATTEMPTED: [Approaches tried, in order, with outcomes]
>
> ROOT CAUSE (if known): [Best assessment]
>
> NEEDED: [What information, decision, or access would unblock this]
>
> IMPACT: [Downstream tasks affected]
>
> RECOMMENDATION: [Agent's suggested resolution]

> **ANTI-PATTERN: SILENT FAILURE**
>
> The most dangerous failure mode: an agent encounters an error, works around it silently, and delivers a result that looks correct but is subtly wrong. This is not dishonesty — it is completion bias overriding correctness. Require all agents to log every recovery action taken. No silent fallbacks. If the recovery ladder was invoked, the checkpoint must say so.

-----

## 20 — KNOWN AGENT FAILURE MODES

This section is a field guide for the Admiral. It catalogs systematic ways AI agent fleets fail, the sections that mitigate each failure, and warning signs that a failure mode is active.

### Failure Mode Catalog

| Failure Mode | Description | Primary Defense |
|---|---|---|
| **Premature Convergence** | Agent latches onto first viable solution without exploring alternatives. | Failure Recovery (19): require multiple candidates for critical decisions |
| **Sycophantic Drift** | Over long sessions, agents increasingly agree with established framing. QA finds fewer issues. | Quality Assurance (18): zero findings is a red flag |
| **Completion Bias** | Delivers complete but degraded output rather than incomplete but excellent output. | Work Decomposition (14): chunk sizing ensures full attention |
| **Confidence Uniformity** | All output presented with equal confidence. No distinction between verified and guessed. | Quality Assurance (18): require confidence levels |
| **Context Recency Bias** | Last-loaded context dominates. Early-loaded constraints deprioritized. | Context Window Strategy (12): deliberate loading order |
| **Phantom Capabilities** | Agent assumes tools or access it does not have. Produces output grounded in hallucinated capabilities. | Tool Registry (08): explicit negative tool list |
| **Scope Creep via Helpfulness** | Agent adds unrequested features. Each reasonable; collectively they blow the budget. | Boundaries (02): explicit non-goals |
| **Hierarchical Drift** | Agents drift one level up: specialists make orchestrator decisions. | Fleet Composition (06): explicit role boundaries |
| **Invocation Inconsistency** | Same agent, same context, different outputs across runs. Naming drifts, patterns change. | Ground Truth (11): anchoring through explicit conventions |
| **Silent Failure** | Agent encounters error, works around it without logging, delivers subtly incorrect output. | Failure Recovery (19): mandatory recovery action logging |
| **Context Stuffing** | Context overloaded with artifacts "just in case." Output becomes shallow and unfocused. | Context Window Strategy (12): curated profiles, <150 line rule |
| **Context Starvation** | Context underloaded. Agent lacks constraints, infers context, drifts from Mission. | Context Window Strategy (12): minimum viable context floor |
| **Instruction Decay** | Rules in CLAUDE.md followed initially but ignored as session lengthens and context pressure builds. | Deterministic Enforcement (03): critical rules must be hooks |
| **Memory Poisoning** | Adversary implants false information in agent memory that persists across sessions. | Configuration Security (05): audit memory files, validate sources |
| **Configuration Injection** | Attacker modifies agent config files to override constraints. | Configuration Security (05): CODEOWNERS, review requirements |
| **Tool Hallucination via MCP** | Agent assumes an MCP server provides capabilities it does not. | Tool Registry (08): explicit MCP server capability list |
| **Session Amnesia** | Agent loses critical context between sessions despite checkpointing. | Institutional Memory (21): structured persistence patterns |
| **Swarm Consensus Failure** | In swarm topology, agents reach consensus on an incorrect answer. | Swarm Patterns (16): adversarial review, multi-model cross-check |
| **Config Accretion** | Configuration files grow with each incident until agents ignore rules. | Configuration File Strategy (04): 150-line rule, regular refactoring |
| **Goodharting** | Agents optimize for tracked metrics rather than genuine outcomes. | Fleet Health Metrics (24): track in combination, rotate emphasis |

### Diagnostic Decision Tree

**Output quality declining:**

- Worse at end than beginning? → **Completion Bias** → Work Decomposition (14): reduce chunk size.
- Uniformly lower? → Check context loading. **Context Starvation** or **Stuffing** → Context Strategy (12).
- Rules followed early but not late? → **Instruction Decay** → Deterministic Enforcement (03): convert to hooks.

**Tasks taking too long:**

- Agents sent back repeatedly? → **Unclear Success Criteria** → Success Criteria (17).
- Frequent escalations? → **Narrow Autonomous Tier** → Decision Authority (07).
- Retrying same approach? → **Phantom Capabilities** → Tool Registry (08).

**Agents doing unrequested work:**

- Adding features? → **Scope Creep** → Boundaries (02).
- Making architectural decisions? → **Hierarchical Drift** → Fleet Composition (06).
- Modifying files outside scope? → **Scope Boundary Violation** → Deterministic Enforcement (03): add scope hook.

**Work from different agents doesn't integrate:**

- Working in parallel? → **Optimistic Parallelism** → Parallel Execution (15): define contracts first.
- Different naming for same concept? → **Invocation Inconsistency** → Ground Truth (11).

-----

# PHASE VII — CONTINUITY & ADAPTATION

*How the fleet persists across sessions and adapts to change.*

-----

## 21 — INSTITUTIONAL MEMORY

Agents lose context between invocations. Without standardized memory artifacts, every new session starts cold, repeating discovery work and losing progress. Session persistence is the single biggest UX pain point in agentic coding workflows.

### Session Persistence Patterns

The research documents five proven patterns for maintaining state across sessions:

**1. Checkpoint Files:** Structured summaries written at chunk boundaries. The simplest pattern.

> **TEMPLATE: SESSION CHECKPOINT**
>
> SESSION: [Date/time] | FLEET: [Project] | ORCHESTRATOR: [ID]
>
> COMPLETED: [Tasks finished with status]
>
> IN PROGRESS: [Tasks started, current state]
>
> BLOCKED: [Tasks blocked with blocker references]
>
> NEXT: [Ordered tasks for next session]
>
> DECISIONS MADE: [Count, with references to decision log]
>
> RECOVERY ACTIONS: [Any recovery ladder invocations, or "None"]
>
> RESOURCES CONSUMED: [Tokens / budget, time / budget]
>
> ASSUMPTIONS: [New assumptions Admiral should validate]

**2. Ledger Files:** Running logs maintained by hooks. Every significant event is appended to a ledger file. SessionStart hooks read the ledger to reconstruct context.

**3. Handoff Documents:** Detailed briefings written at session end, designed to be loaded at the next session start. More narrative than checkpoints — they capture intent and reasoning, not just status.

**4. Git-Based State:** Session state committed to git. Branches represent work streams. Commits represent checkpoints. The repository itself is the memory.

**5. Continuous Operation:** Agents run in persistent loops — implementing, committing, waiting for CI, merging, picking up the next task. State lives in the running process. Hooks maintain ledgers as backup in case the process restarts.

### Which Pattern to Use

| Scenario | Pattern |
|---|---|
| Single developer, simple project | Checkpoint files |
| Team with shared fleet | Git-based state + handoff documents |
| Long-running autonomous fleet | Continuous operation + ledger files |
| Cross-session complex features | Handoff documents + checkpoint files |

### Decision Log

A chronological record of every non-trivial decision: timestamp, decision, alternatives considered, rationale, authority tier used. This is the fleet's institutional memory. It enables the Admiral to audit any fleet's history in under five minutes.

### Audit Artifacts

- **Reasoning traces:** For complex tasks, surface the reasoning chain, not just the conclusion.
- **Diff summaries:** Human-readable summaries of what changed and why. Not git diffs — narrative explanations.
- **Error and recovery logs:** Every failure and recovery action per Section 19.
- **Resource consumption log:** Actual tokens, time, and tool calls versus allocated budgets.

> **ANTI-PATTERN: FALSE CHECKPOINTING**
>
> Agents write summaries that sound comprehensive but omit critical details — what was NOT done, what assumptions were made, what shortcuts were taken. The checkpoint reads "everything on track" when three things are subtly broken. Require explicit "Assumptions" and "Recovery Actions" fields. If both are empty, be suspicious.

-----

## 22 — ADAPTATION PROTOCOL

Every plan survives only until contact with reality. Requirements change. Technical discoveries invalidate assumptions. The question is not whether the fleet will need to adapt but whether adaptation will be controlled or chaotic.

### Change Classification

| Classification | What Changed | Response | Impact |
|---|---|---|---|
| **Tactical Adjustment** | Individual task parameters, minor deadline shifts, requirement clarifications | Update affected tasks. No pause. Log the change. | Minimal — one or two tasks |
| **Strategic Shift** | Mission evolution, Boundary changes, Ground Truth updates, significant scope change | Pause at chunk boundary. Cascade through artifacts. Re-validate. Resume. | Moderate — multiple artifacts |
| **Full Pivot** | Fundamental direction change, complete tech change, total scope replacement | Halt fleet. Treat as new deployment. Full Quick-Start Sequence. | Total — previous context invalidated |

### The Cascade Map

Framework artifacts form a dependency graph. When one changes, downstream artifacts may become stale or contradictory.

```
Mission (01) ──→ Boundaries (02) ──→ Work Decomposition (14) ──→ Parallel Execution (15)
     │                │                       │
     │                ▼                       ▼
     │         Success Criteria (17) ──→ Quality Assurance (18) ──→ Fleet Health Metrics (24) ──→ Cost Management (25)
     │
     ▼
Ground Truth (11) ──→ Fleet Composition (06) ──→ Decision Authority (07) ──→ Admiral Self-Calibration (27)
                              │
                              ├──→ Context Profiles (12)
                              ├──→ Context Engineering (13)
                              ├──→ Tool Registry (08) ──→ Protocol Integration (09)
                              ├──→ Model Selection (10) ──→ Cost Management (25)
                              └──→ Fleet Scaling (26)

Enforcement (03) ──→ Config File Strategy (04) ──→ Config Security (05)
```

**The cascade rule:** Update an artifact, then review every downstream artifact. Revise any that are inconsistent. Continue until no inconsistencies remain.

**The order rule:** Always cascade top-down. Never update a downstream artifact before its upstream dependency is finalized.

### Fleet Pause Protocol

1. **Complete the current chunk.** Let agents finish and checkpoint. Do not interrupt mid-task.
2. **Collect all checkpoints.** Every agent produces a checkpoint including assumptions that may be affected.
3. **Classify and cascade.** Admiral updates affected artifacts in dependency order.
4. **Re-validate.** Run Pre-Flight Checklist against updated artifacts.
5. **Rebrief the fleet.** Each agent receives updated context with an explicit change summary.
6. **Resume with elevated verification.** First chunk post-resumption verified one level higher than normal.

### Stale Context Detection

- **Version stamping:** Every artifact carries a version and last-updated date. Agent logs versions loaded. Staleness flagged if artifact updated mid-session.
- **Assumption audits:** At each checkpoint, agents list operating assumptions. Admiral spot-checks against current artifacts.
- **Staleness alarms:** If core artifacts have not been reviewed in a defined number of sessions, flag for review.

> **ANTI-PATTERN: PATCH WITHOUT CASCADE**
>
> The Admiral updates the Mission but does not cascade to Boundaries or Success Criteria. The fleet operates with a new direction but old constraints. Every artifact update must include a cascade check. A change that is not cascaded is a change that is not complete.

> **ANTI-PATTERN: PERPETUAL PIVOT**
>
> The Admiral changes direction every session. The fleet never achieves momentum. If Strategic Shifts exceed once per major phase, fix the Mission. Do not blame the fleet for instability you are creating.

-----

# PHASE VIII — GOVERNANCE & ECONOMICS

*How you manage the enterprise across fleets and over time.*

-----

## 23 — INTER-FLEET GOVERNANCE

When you command multiple fleets across multiple projects, each fleet must be isolated by default, with controlled sharing only through defined protocols.

### Isolation Protocol

- **Knowledge isolation:** Each fleet receives ONLY knowledge relevant to its project. Ground Truth documents, decision logs, and checkpoints are project-scoped.
- **File system isolation:** Each fleet operates within its own directory structure. Scope boundaries enforced at the project level.
- **Context isolation:** No agent in any fleet should have information about other projects in its context.

### Controlled Sharing

Despite isolation, there are legitimate reasons to share knowledge across fleets. Two mechanisms:

**1. Admiral Relay (Manual):** The Admiral extracts knowledge from Fleet A, validates it, and delivers it to Fleet B as a Ground Truth update. Agents never communicate across fleet boundaries directly. Appropriate for strategic knowledge, architectural patterns, lessons learned.

**2. Protocol-Based Sharing (Automated):** For fleets that need real-time coordination, A2A protocol enables structured cross-fleet communication with defined contracts and authentication. Each fleet publishes Agent Cards for its shareable interfaces. Other fleets discover and invoke those interfaces through the protocol. Appropriate for shared services, data pipelines, integration testing.

### Cross-Fleet Review Cadence

At regular intervals, the Admiral reviews across all fleets:

- **Promotable patterns:** Solutions from one fleet that should be generalized.
- **Systemic failures:** Repeated failure modes indicating a framework gap.
- **Resource imbalances:** Fleets consistently over or under budget.
- **Trust calibration updates:** Fleets that have earned wider autonomy.

> **ANTI-PATTERN: INCONSISTENCY ACROSS INVOCATIONS**
>
> The same agent given the same context produces different outputs across runs. Without anchoring through Ground Truth and checkpoints, each invocation is a fresh personality. Use the formal sharing protocols. Do not carry patterns informally between fleets.

-----

## 24 — FLEET HEALTH METRICS

What gets measured gets managed. Each metric maps to a specific framework concern. When a metric degrades, the root cause maps to a specific section.

### Productivity Metrics

| Metric | Healthy Signal | Warning Signal |
|---|---|---|
| **Throughput** (chunks/session) | Stable or gradually increasing | Declining or erratic |
| **Budget Adherence** (actual vs. allocated) | 80–120% consistently | Consistent overruns or underruns |
| **Idle Time Ratio** | Under 15% of session time | Over 25% — bottleneck, usually Admiral |
| **Parallelism Utilization** | Steady increase as coordination matures | Near zero (over-serialization) or near 100% without contracts |

### Quality Metrics

| Metric | Healthy Signal | Warning Signal |
|---|---|---|
| **First-Pass Quality Rate** | Above 75% — clear criteria, good context | Below 50% — unclear criteria, insufficient context |
| **Rework Ratio** | Under 10% | Above 20% — upstream problems |
| **Defect Escape Rate** | Near zero — QA catches issues | Any consistent pattern of escapes |
| **Self-Heal Rate** | Above 80% — automated gates catch and fix issues | Below 50% — hooks or quality gates misconfigured |

### Coordination Metrics

| Metric | Healthy Signal | Warning Signal |
|---|---|---|
| **Escalation Rate** | Decreasing over time | Increasing — agents lack context or authority |
| **Assumption Accuracy** | Above 85% | Below 70% — Ground Truth is stale |
| **Recovery Ladder Usage** | 1–2 per session (normal friction) | 5+ per session (environmental instability) |
| **Handoff Rejection Rate** | Under 5% | Above 15% — contracts underspecified |

### Interpreting Metrics in Combination

- **Throughput up, Quality down:** Moving faster, cutting corners. Tighten quality floors.
- **Throughput stable, Escalation up:** Maintaining output but requiring more Admiral time. Widen Autonomous tier.
- **Idle Time up, Throughput down:** Classic bottleneck. Check Propose queue depth.
- **Recovery Ladder up, Assumption Accuracy down:** Environment changed, Ground Truth stale. Audit immediately.
- **Self-Heal Rate down, Rework up:** Hooks or quality gates broken or misconfigured. Fix enforcement layer.

> **ANTI-PATTERN: METRIC THEATER**
>
> Metrics collected and dashboards maintained but no framework adjustments result. Every metric review must end with: "The metrics confirm current configuration is working — no changes" or "Metric X indicates problem Y — here is the adjustment." If neither conclusion is reached, the review was theater.

-----

## 25 — COST MANAGEMENT

Token budgets (Section 02) constrain work per task. Cost Management addresses the monetary dimension.

### Cost Drivers and Levers

| Cost Driver | Lever | Impact |
|---|---|---|
| **LLM invocations for deterministic tasks** | LLM-Last design — use static tools first (Section 02) | **Highest impact.** Eliminates 30-60% of LLM calls. |
| **Model tier** | Demote roles where quality is indistinguishable at lower tier (Section 10) | High impact. Economy-tier models at 1/30th cost. |
| **Context size** | Progressive disclosure, <150 line rule, skill-based loading (Section 04) | High impact. Every loaded token is billed. |
| **Retry and rework** | Improve first-pass quality through sharper criteria and self-healing hooks | Medium impact. Each retry doubles the chunk cost. |
| **Over-decomposition** | Consolidate small chunks to reduce context-loading overhead per chunk | Medium impact. Each chunk pays context tax. |
| **Tool call volume** | Cap calls per task, audit high-frequency callers | Lower impact but compounds at scale. |

### Cost Budgets

- **Per-session budget:** Maximum spend before pausing for Admiral review. Circuit breaker for runaway costs.
- **Per-phase budget:** Total allocation for a project phase. Exceeding triggers a Strategic Shift.
- **Cost-per-chunk target:** Expected cost per typical chunk at each tier. Chunks exceeding 2x target should be investigated.

### The Economy-Tier Revolution

Models like DeepSeek V3.2 deliver near-frontier performance at roughly 1/30th the cost of flagship models. This changes fleet economics fundamentally:

- **Tier 4 for first drafts:** Route initial implementation to economy-tier models. Route review and refinement to higher tiers.
- **Bulk processing:** Migrations, formatting, boilerplate generation, and batch operations at economy-tier rates.
- **Adversarial review at low cost:** Run a second model pass for quality checking without doubling the cost.

> **ANTI-PATTERN: COST BLINDNESS**
>
> The Admiral tracks token budgets but never translates them into dollars. The fleet runs three weeks before anyone checks the invoice. Cost tracking is not optional for production fleets.

-----

## 26 — FLEET SCALING & LIFECYCLE

Fleets are not static. The demands on them change as the project progresses, and a fleet sized for greenfield development will be wrong for maintenance.

### Scaling Signals

**Needs more specialization:**
- Generalist produces lower quality in a specific domain while performing well in its primary domain.
- Orchestrator spends significant time decomposing tasks in a domain it does not understand.
- Role Crystallizer identifies recurring unserved demand.

**Over-specialized:**
- Multiple specialists idle for extended periods.
- Orchestrator spends more time coordinating handoffs than specialists spend working.
- Interface contract violations frequent due to too many boundaries.

**Should split:**
- Orchestrator cannot hold full roster in context.
- Two subsystems have independent deployment cycles and minimal interface surface.
- Decision Authority is inconsistent across domains.

### Lifecycle Phases

| Phase | Characteristics | Admiral Focus |
|---|---|---|
| **Standup** | Narrow Autonomous tier. Frequent escalations. High Admiral involvement. | Define artifacts. Accept slower velocity. Build trust. |
| **Acceleration** | Autonomous tier widening. Escalations decreasing. Throughput increasing. | Widen trust. Optimize tiers. Parallelize. Shift to strategy. |
| **Steady State** | Stable throughput. Rare escalations. High autonomy. Consistent quality. | Monitor drift. Maintain Ground Truth. Optimize cost. |
| **Wind-Down** | Work volume decreasing. Specialist knowledge less critical. | Consolidate roles. Demote tiers. Reduce fleet. Archive memory. |
| **Dormant** | Project in maintenance. Minimal fleet maintained for future needs. | Orchestrator + one Implementer + QA on standby. Artifacts preserved. |

> **ANTI-PATTERN: PREMATURE DECOMMISSION**
>
> Project enters maintenance, Admiral decommissions entirely. Six months later, a critical bug arrives. Institutional memory is gone. Maintain a dormant fleet for projects that may need future work. The cost is negligible compared to rebuilding.

-----

# PHASE IX — THE ADMIRAL

*The human element — your own development and your interface with experts.*

-----

## 27 — ADMIRAL SELF-CALIBRATION

This framework defines what the Admiral must provide to the fleet. This section addresses how the Admiral develops. The Admiral is not a static role. It is a practiced discipline.

### Bottleneck Detection

| Signal | What It Means |
|---|---|
| Multiple tasks awaiting approval | Autonomous tier too narrow or review cadence too slow |
| Agents escalate more than once per session | Decision Authority unclear or context insufficient |
| Agents checkpoint and wait | Admiral is bottleneck; fleet has no independent work |
| Rubber-stamp approvals | These decisions should be Autonomous |
| Reviews become shorter over time | Too many items require review; delegate more |

### Trust Calibration

Trust is not a feeling. It is a measurable parameter earned incrementally and withdrawn precisely.

**Earning trust:** After consecutive successful Autonomous decisions in a category, promote similar Propose-tier decisions. Category-specific, not global. Log every promotion with evidence and review date.

**Withdrawing trust:** After a failed Autonomous decision, demote that category to Propose. Investigate: context gap (fixable by improving Ground Truth) or judgment gap (needs tighter oversight)? Allow the category to earn its way back.

### The Admiral's Growth Trajectory

| Stage | Characteristics | Focus |
|---|---|---|
| **Novice** | Narrow Autonomous tier. Reviews everything. Fleet moves slowly. | Learn failure modes. Build intuition. Resist premature trust. |
| **Practitioner** | Moderate Autonomous tier. Reviews strategically. Intervenes on patterns, not every decision. | Refine trust calibration per category. |
| **Expert** | Wide Autonomous tier. Rare interventions, each high-impact. Time mostly strategic. | Framework evolution, cross-fleet governance, institutional knowledge. |
| **Master** | Fleet success not dependent on constant attention. Framework sustains quality autonomously. | Extend the framework. Mentor new Admirals. |

### The Admiral as Meta-Agent

The Admiral may itself be an AI agent — a meta-orchestrator that manages fleet composition, updates Ground Truth, and makes strategic decisions. In this configuration:

- The meta-agent's constraints must be the most heavily enforced in the entire system (hooks on hooks).
- A human must still hold Escalate-tier authority. The meta-agent cannot authorize its own scope expansion.
- Trust calibration applies to the meta-agent just as it applies to any fleet member.

> **ANTI-PATTERN: MICROMANAGEMENT SPIRAL**
>
> After one bad outcome, the Admiral narrows the Autonomous tier across all categories. Velocity plummets. Agents escalate constantly. Review quality drops under load. More mistakes slip through. Narrow precisely — only the category that failed — not broadly.

> **ANTI-PATTERN: ABDICATION**
>
> The Admiral stops reviewing, stops updating artifacts, stops calibrating trust. The fleet runs on autopilot. But without active maintenance, Ground Truth goes stale, Boundaries erode, institutional memory becomes documents no one reads. A Master Admiral intervenes infrequently. An abdicating Admiral intervenes never. The outcomes are opposite.

-----

## 28 — HUMAN-EXPERT ROUTING

The Admiral is not omniscient. When the fleet encounters a decision that exceeds the Admiral's domain expertise, it needs a protocol for routing to the right human expert.

### Expert Roster

| Field | What to Define |
|---|---|
| **Expert Name/Role** | Who they are and their domain |
| **Domain** | Specific decision categories they can answer |
| **Response SLA** | Expected turnaround time |
| **Input Format** | What the expert needs to decide |
| **Output Format** | What the expert provides back |

### Routing Triggers

- **Regulatory or legal implications.** The Admiral is not a lawyer.
- **User-facing design judgment.** Requires user research and design principles.
- **Business strategy.** Pricing, positioning, prioritization require business context.
- **Domain-specific performance.** Database optimization, ML model selection, network architecture.
- **Security risk assessment.** Which vulnerabilities to fix now, defer, or accept.

### Consultation Protocol

1. **Package the question.** Structured request with exactly what the expert needs.
2. **Route and track.** Log in decision log with "Pending External" status.
3. **Integrate the response.** Translate into fleet-actionable terms. Update Ground Truth if the response establishes a durable constraint.
4. **Resume the fleet.** If paused, resume using Fleet Pause Protocol (Section 22).

> **TEMPLATE: EXPERT CONSULTATION REQUEST**
>
> TO: [Expert Name/Role]
>
> DECISION NEEDED: [One sentence]
>
> CONTEXT: [2–5 sentence summary]
>
> OPTIONS CONSIDERED: [Approaches with tradeoffs]
>
> URGENCY: [Blocking | Non-blocking | Scheduled]
>
> RESPONSE FORMAT: [What's needed back]

> **ANTI-PATTERN: ADMIRAL AS UNIVERSAL EXPERT**
>
> The Admiral answers every domain question personally rather than routing. This works until it doesn't — the Admiral's privacy guidance misses a jurisdictional requirement, the UX decision creates an accessibility failure. The Admiral's job is to know who knows, not to know everything. Route to experts. Accept the latency.

-----

# APPENDICES

-----

## Pre-Flight Checklist

Before deploying any new fleet, verify every item. If any box is unchecked, the fleet is not ready.

**Phase I — Strategic Foundation**

- [ ] **Mission (01):** Project identity, success state, stakeholders, phase, and pipeline entry point documented.
- [ ] **Boundaries (02):** Non-goals, hard constraints, resource budgets, quality floor, and LLM-Last boundary defined.

**Phase II — Enforcement Infrastructure**

- [ ] **Deterministic Enforcement (03):** Every constraint classified as Hook / Instruction / Guidance. Critical safety constraints are hooks, not instructions. Self-healing quality loops implemented.
- [ ] **Configuration File Strategy (04):** CLAUDE.md under 150 lines. Skills created for on-demand knowledge. Agent-specific files defined. Configuration files version-controlled.
- [ ] **Configuration Security (05):** Security audit checklist completed. MCP servers audited and pinned. Third-party skills reviewed. CODEOWNERS set for config directories.

**Phase III — Fleet Architecture**

- [ ] **Fleet Composition (06):** Agent roster with roles, specializations, "Does NOT Do" boundaries, routing logic, and interface contracts documented. Fleet size 5–12 agents.
- [ ] **Decision Authority (07):** Four tiers (Enforced / Autonomous / Propose / Escalate) defined with concrete examples. Calibrated to project maturity.
- [ ] **Tool & Capability Registry (08):** Every agent has explicit tool registry including available tools, MCP servers, scope limits, and negative tool list.
- [ ] **Protocol Integration (09):** MCP servers registered with version pins and permission scoping. A2A connections defined if cross-process communication needed. Protocol security configured.
- [ ] **Model Selection (10):** Every role assigned to a model tier with rationale. Context window requirements verified against assigned model capacity.

**Phase IV — Knowledge & Context**

- [ ] **Ground Truth (11):** Domain ontology, naming conventions, tech stack versions, access/permissions, known issues, and configuration artifacts documented and current.
- [ ] **Context Window Strategy (12):** Context profiles defined per role. Loading order, refresh triggers, sacrifice order documented. Progressive disclosure implemented.
- [ ] **Context Engineering (13):** Agent instructions follow prompt anatomy (Identity → Authority → Constraints → Knowledge → Task). Tested with boundary, authority, ambiguity, and conflict probes.

**Phase V — Execution**

- [ ] **Work Decomposition (14):** Goals broken into chunks. Each chunk has entry/exit state, budget, quality gates. Spec-first pipeline defined if applicable.
- [ ] **Parallel Execution Strategy (15):** Parallelization criteria defined. Coordination patterns selected. Divergence detection protocol documented.
- [ ] **Swarm Patterns (16):** If using swarms: queen-worker topology defined, consensus mechanisms documented. If not using swarms: confirmed hierarchical fleet is sufficient.
- [ ] **Success Criteria (17):** Functional, quality, completeness, and negative criteria defined per task. Machine-verifiable where possible.

**Phase VI — Quality & Recovery**

- [ ] **Quality Assurance (18):** Verification levels assigned per task type. Self-healing quality loops operational. QA feedback template ready.
- [ ] **Failure Recovery (19):** Recovery ladder documented. Max retry counts set. Backtracking capabilities defined. Escalation report template ready.
- [ ] **Failure Modes (20):** Fleet configuration reviewed against Known Agent Failure Modes. Mitigations in place.

**Phase VII — Continuity & Adaptation**

- [ ] **Institutional Memory (21):** Session persistence pattern selected and implemented. Decision log location established. Checkpoint template ready.
- [ ] **Adaptation Protocol (22):** Change classification tiers defined. Cascade map understood. Fleet Pause Protocol documented.

**Phase VIII — Governance & Economics**

- [ ] **Inter-Fleet Governance (23):** Knowledge boundaries set. Sharing protocol defined (Admiral Relay and/or A2A). Review cadence scheduled.
- [ ] **Fleet Health Metrics (24):** Metrics selected per category. Collection rhythm defined. Dashboard template ready.
- [ ] **Cost Management (25):** Per-session and per-phase budgets set. Cost tracking structure in place. LLM-Last lever implemented.
- [ ] **Fleet Scaling (26):** Current lifecycle phase identified. Scaling signals understood. Fleet size upper bound established.

**Phase IX — The Admiral**

- [ ] **Admiral Self-Calibration (27):** Bottleneck detection signals known. Trust Calibration Log initialized. Growth stage self-assessed.
- [ ] **Human-Expert Routing (28):** Expert Roster defined. Routing triggers documented. Consultation template ready.

-----

## Quick-Start Sequence

When standing up a new fleet, complete sections in this order. This is the operational order that minimizes rework — not the document order.

1. **Mission (01)** — Define what you are building and what success looks like.
2. **Ground Truth (11)** — Document the environment: tech stack, tools, access, vocabulary.
3. **Boundaries (02)** — Define what you are NOT building and the resource budgets.
4. **Deterministic Enforcement (03)** — Classify constraints. Implement hooks for hard requirements.
5. **Configuration File Strategy (04)** — Create CLAUDE.md (<150 lines), skills, agent files.
6. **Configuration Security (05)** — Audit configs. Pin MCP servers. Set CODEOWNERS.
7. **Fleet Composition (06)** — Define agents, roles, routing, and interface contracts.
8. **Decision Authority (07)** — Set the four authority tiers for this project's risk profile.
9. **Tool & Capability Registry (08)** — Define available and unavailable tools per agent.
10. **Protocol Integration (09)** — Register MCP servers. Configure A2A if needed.
11. **Model Selection (10)** — Assign each role to a model tier. Verify context fit.
12. **Context Window Strategy (12)** — Define context profiles, loading order, progressive disclosure.
13. **Context Engineering (13)** — Write system prompts. Run prompt probes.
14. **Success Criteria (17)** — Define acceptance criteria for the first phase.
15. **Work Decomposition (14)** — Break the first phase into chunks with budgets and sequencing.
16. **Cost Management (25)** — Set monetary budgets. Establish cost tracking.
17. **Remaining sections** — Establish QA (18), Failure Recovery (19), review Failure Modes (20), set up Institutional Memory (21), define Adaptation Protocol (22), configure Inter-Fleet Governance (23), Fleet Health Metrics (24), identify Scaling phase (26), initialize Admiral Self-Calibration (27), and define Human-Expert Routing (28).

-----

## Worked Example: SaaS Task Manager

A concrete application for a mid-complexity greenfield project.

### Mission

> This project is a collaborative task management application for small teams (5–20 members).
>
> It is successful when a team can create projects, assign tasks, track progress through customizable workflows, and receive notifications — all within a sub-200ms UI response time.
>
> Built for small-team leads and individual contributors who need lightweight project tracking without enterprise overhead.
>
> Current phase: greenfield. Pipeline entry: Fleet takes over at Task Decomposition.

### Boundaries (abbreviated)

> NON-GOALS: No Gantt charts. No resource allocation. No time tracking. No mobile app. No SSO (email/password only for v1).
>
> CONSTRAINTS: Next.js 15 with TypeScript 5.7, PostgreSQL 16, Tailwind 4.0. Ship MVP in 6 weeks. WCAG 2.1 AA.
>
> BUDGETS: 50K tokens per task. 30 minutes per task. Agents modify only `src/` and `prisma/`.
>
> QUALITY FLOOR: ESLint zero errors. All new code tested. Lighthouse accessibility 90+. No `any` types.
>
> LLM-LAST: Formatting (Prettier), linting (ESLint), type checking (tsc), import sorting (eslint-plugin-import) handled by deterministic tools. LLM for: implementation logic, code review for correctness, design decisions.

### Deterministic Enforcement

> HOOKS:
>
> - PreToolUse (Write/Edit): Block modifications outside `src/` and `prisma/`. Hard scope boundary.
> - PostToolUse (Write/Edit): Run `npx tsc --noEmit` and `npx eslint`. Feed failures back. Self-healing loop.
> - PreCommit: Run `npm test`. Block commit if tests fail.
> - SessionStart: Load last checkpoint from `.claude/checkpoints/latest.md`.

### Fleet Roster

> FLEET: TaskFlow
>
> ORCHESTRATOR: Claude Opus 4.6 — Tier 1. Autonomous for implementation decisions, Propose for schema and API design.
>
> SPECIALISTS:
>
> - Architect (Tier 1): System structure, API design, schema decisions. Owns `docs/architecture/`. Does NOT write implementation code.
> - Frontend Implementer (Tier 2, Sonnet): UI components, pages, client state. Owns `src/app/`, `src/components/`. Does NOT modify API routes or schemas.
> - Backend Implementer (Tier 2, Sonnet): API routes, business logic. Owns `src/api/`, `src/lib/server/`. Does NOT modify UI or schemas directly.
> - Database Agent (Tier 2, Sonnet): Schema, migrations, queries. Owns `prisma/`. Does NOT modify application code.
> - QA Agent (Tier 2, Sonnet): Reviews all output, validates criteria. Read-only access. Does NOT fix issues directly.
>
> ROUTING: Database → Database Agent. UI → Frontend Implementer. API → Backend Implementer. Cross-cutting → Architect decomposes first. All completed work → QA before acceptance.

### Decision Authority

> ENFORCED (hooks): File scope boundaries, test execution, type checking, linting.
>
> AUTONOMOUS: Component naming, file structure within owned dirs, test implementation, CSS, internal refactors, error message copy.
>
> PROPOSE: New database tables, new API endpoints, new dependencies, component architecture patterns (first use), auth flow design.
>
> ESCALATE: Scope additions, budget overruns >120%, security concerns, tech stack deviation, timeline deviation.

### First Task Decomposition

> GOAL: Core task board — create, view, move tasks across workflow columns.
>
> CHUNKS:
>
> 1. **Schema design** — Entry: Mission + Boundaries defined — Exit: Prisma schema with Task, Project, Column models, migration clean — Budget: 20K tokens — Owner: Database Agent — Gates: `npx prisma migrate dev` succeeds
> 2. **API layer** — Entry: Schema approved — Exit: CRUD endpoints, integration tests pass — Budget: 30K tokens — Owner: Backend Implementer — Gates: `npm test` passes, tsc clean
> 3. **Board UI** — Entry: API contracts defined — Exit: Kanban board renders, drag-to-move works — Budget: 40K tokens — Owner: Frontend Implementer — Gates: tsc clean, lint clean, Lighthouse 90+
> 4. **QA pass** — Entry: Board UI complete — Exit: All Blocker/Major issues resolved — Budget: 15K tokens — Owner: QA → Frontend Implementer for fixes
>
> SEQUENCE: 1 → 2 → 3 → 4. Chunks 2 and 3 can be staggered using Contract-First Parallelism once API contracts are defined.

-----

*The Fleet Admiral Framework · v3.0*

*Context is the currency of autonomous AI. Enforcement is how you protect it.*
