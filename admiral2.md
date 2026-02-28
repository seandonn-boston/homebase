# THE FLEET ADMIRAL FRAMEWORK

**A Repeatable Protocol for Establishing Autonomous AI Agent Fleets**

v3.1 · February 2026

-----

## How to Read This Document

This document is written for three audiences simultaneously:

**Humans** — You are the Admiral. You read this to understand what artifacts to produce, what decisions to make, and how to diagnose problems. The prose, anti-patterns, and worked example are for you.

**LLM agents** — Sections of this document will be loaded into your context as operational instructions. The TL;DR blocks, templates, and structured formats are for you. When a section is loaded into your context, treat its constraints as binding and its templates as required output formats.

**Machines** — CI pipelines, hook scripts, linters, and automation tooling consume the artifacts this framework produces. The templates, checklists, and structured formats are designed to be parseable. Configuration files generated from this framework should be version-controlled and diffable.

> **This document is not a CLAUDE.md file.** It is the meta-framework that generates CLAUDE.md files, agent definitions, hook scripts, skill files, and operational artifacts. Your actual configuration files should be under 150 lines each. This document is the source of truth they are distilled from.

-----

## Table of Contents

Sections are ordered by impact and grouped by relevance. Strategy anchors everything. Context is the highest-leverage operational discipline. Enforcement makes constraints reliable. Fleet defines who operates. Execution defines how work flows. Quality catches what slips. Operations keeps the system healthy over time. The Admiral is the human element.

| # | Section | One-Line Summary |
|---|---|---|
| | **PART 1 — STRATEGY** | *What are we building, what are the walls, and how do we know when we're done?* |
| 01 | Mission | The gravitational center every agent decision orbits. |
| 02 | Boundaries | What the project is NOT — the single most effective tool against drift. |
| 03 | Success Criteria | What "done" looks like, in terms a machine can verify. |
| | **PART 2 — CONTEXT** | *How does the right information reach the right agent at the right time?* |
| 04 | Context Engineering | The master discipline: designing information flows across the fleet. |
| 05 | Ground Truth | The single source of reality for the world agents operate in. |
| 06 | Context Window Strategy | How to allocate, load, and refresh an agent's working memory. |
| 07 | Configuration File Strategy | How instruction files are structured, layered, and kept under 150 lines. |
| | **PART 3 — ENFORCEMENT** | *The gap between "should" and "must."* |
| 08 | Deterministic Enforcement | Hooks fire every time. Instructions can be forgotten. Know which is which. |
| 09 | Decision Authority | What agents may decide, what they propose, and what they must escalate. |
| 10 | Configuration Security | Agent configs are attack surfaces. Defend them like production code. |
| | **PART 4 — FLEET** | *Who does what, with what tools, on what models, speaking what protocols?* |
| 11 | Fleet Composition | Agent roster, routing logic, interface contracts, role boundaries. |
| 12 | Tool & Capability Registry | What each agent can do — and explicitly cannot do. |
| 13 | Model Selection | Matching model capability to role requirements across four tiers. |
| 14 | Protocol Integration | MCP for tool access. A2A for agent-to-agent communication. |
| | **PART 5 — EXECUTION** | *How work gets planned, parallelized, and completed.* |
| 15 | Work Decomposition | Breaking goals into chunks sized for full attention. |
| 16 | Parallel Execution Strategy | Coordination patterns that prevent assumption divergence. |
| 17 | Swarm Patterns | When and how to move beyond hierarchical orchestration. |
| | **PART 6 — QUALITY** | *How the fleet maintains standards and handles failure.* |
| 18 | Quality Assurance | Who checks, how they check, and what happens when the check fails. |
| 19 | Failure Recovery | The recovery ladder: retry, fallback, backtrack, isolate, escalate. |
| 20 | Known Agent Failure Modes | A field guide to twenty systematic ways agent fleets fail. |
| | **PART 7 — OPERATIONS** | *How work persists, adapts, and scales over time.* |
| 21 | Institutional Memory | Session persistence patterns that survive context window boundaries. |
| 22 | Adaptation Protocol | Controlled response to change: tactical, strategic, and full pivot. |
| 23 | Cost Management | Token economics, model tier optimization, and budget controls. |
| 24 | Fleet Health Metrics | What to measure, what healthy looks like, and what to do when it doesn't. |
| 25 | Fleet Scaling & Lifecycle | How fleets grow, shrink, and transition across project phases. |
| 26 | Inter-Fleet Governance | Isolation, controlled sharing, and cross-fleet review across projects. |
| | **PART 8 — THE ADMIRAL** | *The human element.* |
| 27 | Admiral Self-Calibration | Bottleneck detection, trust calibration, and growth trajectory. |
| 28 | Human-Expert Routing | When the fleet needs expertise the Admiral doesn't have. |
| | **APPENDICES** | |
| A | Pre-Flight Checklist | Go/no-go gate before fleet deployment. |
| B | Quick-Start Sequence | Operational order for standing up a new fleet. |
| C | Worked Example | A complete SaaS application fleet, end to end. |

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

# PART 1 — STRATEGY

*What are we building, what are the walls, and how do we know when we're done?*

*These three sections form a closed triangle. Together they answer the only questions that matter before any agent touches a keyboard: the destination, the fences, and the finish line. Every downstream artifact — agent definitions, task decompositions, quality gates — derives from this triangle. If any vertex is missing, the fleet will infer one, and the inference will be subtly wrong.*

-----

## 01 — MISSION

> **TL;DR** — One sentence that defines what you're building. One sentence that defines success. Without these, every agent decision drifts.

Before any agent writes a line of code or makes a single decision, the fleet needs to understand what it exists to accomplish. The Mission is not a product specification. It is the strategic frame that prevents drift.

### What to Define

- **Project Identity:** What is this? One sentence. If you cannot express it in a single sentence, the fleet will not stay aligned.
- **Success State:** What must be true for this project to be considered successful? Concrete, observable terms. Not "a great user experience" but "a user can complete the core workflow in under 3 clicks with no errors."
- **Stakeholders and Audience:** Who is this for? Agents make better micro-decisions when they understand the human context behind the work.
- **Current Phase:** Greenfield, feature addition, refactor, migration, or maintenance. The phase changes how agents approach ambiguity, risk, and scope.

### The Spec-First Pipeline

The Mission is the entry point to an automated pipeline. Each phase produces auditable artifacts that feed the next.

```
Mission → Requirements Spec → Design Spec → Task Decomposition → Implementation
```

Define at which pipeline stage the fleet takes over. For mature fleets, the fleet drives the pipeline from Requirements onward. For new fleets, the Admiral authors Requirements and Design, and the fleet takes over at Task Decomposition.

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

> **WHY THIS MATTERS** — Without a Mission, orchestrators will infer one from the task list. Their inferred mission will be subtly wrong, and every downstream decision will compound that error.

-----

## 02 — BOUNDARIES

> **TL;DR** — Non-goals eliminate more bad work than goals create good work. Define what the project is NOT, the resource budgets, and the line between LLM and deterministic tooling.

Boundaries are the single most effective tool against agent drift. AI agents are relentlessly helpful — they will expand scope, add features, refactor adjacent code, and over-engineer solutions unless you explicitly tell them not to.

### Non-Goals

Explicitly state what the project is NOT. Non-goals eliminate entire categories of work that agents would otherwise explore.

- **Functional non-goals:** Features, capabilities, or user flows that are explicitly out of scope.
- **Quality non-goals:** Levels of polish, optimization, or completeness that are not required at this phase.
- **Architectural non-goals:** Patterns, technologies, or approaches that must not be used.

### Hard Constraints

- **Tech stack:** Exact languages, frameworks, and tools with version numbers.
- **External deadlines:** Ship dates, demo dates, review dates.
- **Compatibility requirements:** Browser support, API backward compatibility, platform requirements.
- **Regulatory or policy constraints:** Anything legally or organizationally mandated.

### Resource Budgets

| Resource | What to Define | Why It Matters |
|---|---|---|
| Token budget | Max tokens per task before the agent must deliver or escalate | Prevents unbounded exploration |
| Time budget | Wall-clock time limit per task | Prevents runaway loops |
| Tool call limits | Max API calls or tool invocations per task | Prevents brute-forcing solutions |
| Scope boundary | File paths, repos, and services each agent may touch | Prevents modification outside jurisdiction |
| Quality floor | Minimum acceptable quality bar, defined concretely | Prevents infinite refinement |

### The LLM-Last Boundary

The single highest-impact cost and reliability lever in fleet operations.

| Layer | Handles | Examples |
|---|---|---|
| **Deterministic first** | Everything achievable with static analysis, regex, linters, shell commands, type checkers | Formatting, linting, import sorting, dead code detection, test execution |
| **LLM when judgment is needed** | Decisions requiring understanding of intent, tradeoffs, novel design | Architecture decisions, code review for logic errors, complex refactors, debugging |

If a static tool can do it, the LLM should not. A linter catches 100% of formatting violations. An LLM catches most of them, sometimes, depending on context pressure.

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
> LLM-LAST: Deterministic tools handle: [list]. LLM handles: [list].

> **ANTI-PATTERN: SCOPE CREEP THROUGH HELPFULNESS** — An agent asked to implement a login form will also add password validation, a forgot-password flow, session management, and accessibility improvements — none requested. Each reasonable in isolation; collectively they blow the budget.

-----

## 03 — SUCCESS CRITERIA

> **TL;DR** — Every task needs a machine-verifiable definition of "done." Without one, agents either under-deliver or loop forever.

Every task delegation must include what "done" looks like. Without explicit exit conditions, agents either under-deliver or loop indefinitely refining output that was already acceptable.

Success Criteria belong in the Strategy tier because they must be defined before work is decomposed. Criteria shape the decomposition, not the other way around.

### Criteria Categories

- **Functional:** What must the output DO? Not "the form should work" but "submitting the form with valid data creates a record and redirects to confirmation."
- **Quality:** Measurable gates. Linting passes. Tests pass. Coverage above threshold.
- **Completeness:** What must exist beyond the core deliverable. Docs updated. Error states handled.
- **Negative:** What the output must NOT do. No new dependencies not in Ground Truth. No files modified outside scope.

### Machine-Verifiable Criteria

The best exit conditions are ones an agent can verify autonomously by running a command.

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
> EXIT: Complete when all criteria pass and verification level approved.

-----

# PART 2 — CONTEXT

*How does the right information reach the right agent at the right time?*

*Context is the currency of autonomous AI. These four sections are the framework's center of gravity. Most fleet performance problems that look like capability failures are actually context management failures — the wrong information loaded at the wrong time, or the right information missing entirely. Master these four sections and half the failure modes in Section 20 become impossible.*

-----

## 04 — CONTEXT ENGINEERING

> **TL;DR** — Not just writing prompts — designing information flows across the entire fleet. What information exists where, when, and why. The discipline that subsumes prompt engineering.

Context engineering is the discipline of designing information flows across an entire agent system — not just crafting individual prompts, but architecting how the right information reaches the right agent at the right time in the right format.

### From Prompt Engineering to Context Engineering

| Prompt Engineering | Context Engineering |
|---|---|
| Crafting a single prompt for a single agent | Designing information flows across a fleet |
| Optimizing one agent's output quality | Optimizing the system's collective output |
| Focus: word choice, instruction ordering | Focus: what information exists where, when, and why |
| Operates at the prompt level | Operates at the system level |

### The Five Dimensions of Context

1. **Structural context:** How information is organized — file hierarchy, configuration layering, skill triggers, hook placement. Determines what the agent can access.

2. **Temporal context:** When information is loaded — at session start, on match, on request, at refresh points. Loading order affects primacy/recency weighting and attention distribution.

3. **Relational context:** How pieces of information relate to each other — dependency graphs, cascade maps, interface contracts. An agent that knows its task but not the contract with the adjacent agent produces incompatible output.

4. **Authority context:** What weight each piece of information carries — enforced constraints vs. firm guidance vs. soft preferences. An agent that treats all instructions as equal will violate critical constraints when they compete with suggestions for attention.

5. **Absence context:** What the agent explicitly does not know and must not assume. Negative tool lists, non-goals, and "does not have access to" declarations. Without absence context, agents fill gaps with hallucinated capabilities.

### Writing Effective Agent Instructions

Regardless of which tool reads the file (Claude Code, Copilot, Cursor, Gemini CLI), effective instructions follow the same principles:

**Constraints before permissions.** State what the agent must NOT do before stating what it should do. Negative constraints eliminate categories of behavior.

**Concrete over abstract.** "Do not modify files outside `src/features/auth/`" is enforceable. "Stay within your scope" is not.

**Explicit hierarchy.** "You are the [Role]. You do not make decisions that belong to [higher role]." One sentence.

**No hedging.** "Try to," "when possible," and "ideally" give the agent permission to skip the instruction.

**Reference, do not repeat.** If the Ground Truth is loaded, reference it — do not restate it. Duplication creates divergence.

**Show, do not describe.** Code examples are more reliably followed than verbal descriptions.

```
// DO — show the pattern:
export async function GET(req: NextRequest) {
  const data = await db.query(...)
  return NextResponse.json(data)
}

// DON'T — describe the pattern:
"API routes should use the Next.js App Router pattern
with async handlers that return NextResponse objects."
```

### Prompt Anatomy

Every agent's system prompt should follow a consistent structure:

| Section | Purpose | Position |
|---|---|---|
| **Identity** | Who this agent is, hierarchical position | First — establishes operating posture |
| **Authority** | What it may decide, propose, or must escalate | Second — constrains all subsequent behavior |
| **Constraints** | Boundaries, non-goals, scope limits, budgets | Third — defines the walls before the room |
| **Knowledge** | Ground Truth excerpts relevant to this role | Middle — reference material |
| **Task** | Current task, acceptance criteria, interface contracts | Last — benefits from recency effect |

### Prompt Testing Protocol

Prompts are code. Test before deployment.

1. **Boundary probe.** Task slightly outside scope. Does the agent refuse or comply?
2. **Authority probe.** Decision belonging to the tier above. Does it decide or flag?
3. **Ambiguity probe.** Underspecified requirement. Does it invent, ask, or escalate?
4. **Conflict probe.** Two instructions that conflict. Which wins?
5. **Regression check.** After modification, re-run previous probes.

> **ANTI-PATTERN: PERSONALITY PROMPTING** — "You are a meticulous, detail-oriented engineer who takes pride in clean code" consumes attention on character simulation. "Run the linter and fix all warnings before delivering" produces more reliable behavior than "You care deeply about code quality."

-----

## 05 — GROUND TRUTH

> **TL;DR** — The single source of reality: what words mean, what the stack is, what tools exist, what's broken. Without it, agents hallucinate capabilities and misinterpret terms.

The Ground Truth document contains everything an agent needs to know about the world it operates in. Without it, agents will hallucinate tool availability, misinterpret domain terms, and make decisions based on stale assumptions.

Load it into every agent's context at the start of every session. Maintain and update it at the start of every major work phase.

### Domain Ontology

- **Domain glossary:** Project-specific terms and their precise definitions. Include terms that carry specific meaning here.
- **Naming conventions:** File, branch, variable, and component naming. Exhaustively specific.
- **Status definitions:** What "in progress," "blocked," "ready for review," and "done" mean concretely.
- **Architecture vocabulary:** What constitutes a "service," "layer," "module," or "feature" in this project.

### Environmental Facts

- **Tech stack and exact versions:** Not "React" but "React 19.1 with TypeScript 5.7, Vite 6.2, Tailwind 4.0."
- **Infrastructure topology:** Where things run, how they connect, deployment targets, CI/CD details.
- **Access and permissions:** What APIs, services, files, and tools each role actually has access to. Enumerate explicitly.
- **Current known issues:** Bugs, limitations, workarounds, technical debt, "do not touch" areas and why.
- **External dependencies:** Third-party services, rate limits, SLAs, known instabilities.

### Configuration as Ground Truth

| Artifact | Purpose | Location | Review Cadence |
|---|---|---|---|
| `CLAUDE.md` | Project identity, critical conventions | Repository root | Every phase |
| `agents.md` | Cross-tool agent instructions | Repository root | Every phase |
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

> **ANTI-PATTERN: PHANTOM CAPABILITIES** — Agents will confidently assume tools and access they do not have. An orchestrator might delegate a task assuming the specialist can query a database directly, when it can only read files. The specialist produces plausible-looking output grounded in fabricated data.

-----

## 06 — CONTEXT WINDOW STRATEGY

> **TL;DR** — The context window is working memory. Load identity first (primacy), task last (recency), reference in the middle. Never exceed 150 lines of standing instructions.

Everything an agent can know, remember, and reason about must fit within the context window.

### Context Budget Allocation

| Zone | What It Contains | Typical Allocation | Priority |
|---|---|---|---|
| Standing Context | Mission, Boundaries, role definition, Ground Truth essentials | 15–25% | Loaded first, never sacrificed |
| Session Context | Last checkpoint, current task spec, interface contracts, relevant code | 50–65% | Loaded at session start, refreshed at chunk boundaries |
| Working Context | Active reasoning, tool outputs, intermediate results | 20–30% | Generated during execution, compressed as session grows |

### Loading Order Protocol

1. **Load identity and constraints first.** Role definition, Decision Authority tier, Boundaries, Mission. Primacy ensures they function as foundational assumptions.
2. **Load reference material in the middle.** Ground Truth details, historical decisions, naming conventions. Available for reference without dominating reasoning.
3. **Load the current task last.** Task specification, acceptance criteria, relevant code. Recency ensures active reasoning is oriented toward immediate work.

### Progressive Disclosure

- **Always loaded:** Mission (1-2 sentences), role identity, authority tier, critical constraints. Under 150 lines total.
- **Loaded on match:** Skills triggered by file patterns, task keywords, or domain context.
- **Loaded on request:** Full architectural history, cross-system diagrams, comprehensive reference.
- **Never loaded:** Other agents' internal context, other projects' artifacts, historical sessions older than the last checkpoint.

### Context Refresh Points

- **After completing each chunk.** Checkpoint, then reload with updated session context.
- **After a Propose-tier decision is resolved.** Decision becomes standing context.
- **After an escalation is resolved.** Admiral's direction integrated into artifacts.
- **When drift is detected.** Context refresh is the first intervention.

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

> **ANTI-PATTERN: CONTEXT STUFFING** — Loading every artifact "just in case." Standing context consumes 60% of the window. Output becomes shallow and unfocused. More context is not better context. Curate ruthlessly.

-----

## 07 — CONFIGURATION FILE STRATEGY

> **TL;DR** — CLAUDE.md under 150 lines. Move enforcement to hooks, reference material to skills, per-agent rules to agent files. Version all config files like code.

Configuration files are how the fleet receives its instructions. They are as important as source code — version them, review them, test them.

### The Configuration Hierarchy

Configuration flows from broad to narrow, with narrower scopes overriding broader ones.

| Scope | File | Purpose |
|---|---|---|
| **Personal** | `~/.claude/settings.json` | User-level defaults, model preferences |
| **Organization** | Organization-level config | Shared standards across all repos |
| **Repository** | `CLAUDE.md`, `agents.md`, `.cursorrules` | Project-specific instructions |
| **Path-specific** | `.claude/rules/*.md` | Rules that apply only to certain directories |
| **Role-specific** | `.claude/agents/*.md`, `.agent.md` | Per-agent identity, authority, constraints |
| **On-demand** | `.claude/skills/*.md` | Knowledge loaded only when context matches |
| **Enforcement** | `.claude/settings.json` (hooks), CI configs | Deterministic constraints |

### The 150-Line Rule

Official guidance: CLAUDE.md should not exceed 150 lines. For each line, ask "Would removing this cause mistakes?" If not, remove it.

**How to stay under 150 lines:**

- Move stable reference material to skills (on-demand, not at startup).
- Move enforcement constraints to hooks (deterministic, not occupying context).
- Move per-agent instructions to agent-specific files (each agent loads only its own).
- Move path-specific rules to path-scoped files (loaded only when working in that directory).
- What remains in CLAUDE.md: project identity, tech stack, critical conventions, workflow essentials.

### Cross-Tool Portability

`agents.md` works across Copilot, Claude Code, Cursor, and Gemini CLI. Analysis of 2,500+ agents.md files shows the best share six characteristics:

1. **Clear persona** — who the agent is and what it's responsible for.
2. **Executable commands** — exact shell commands, not descriptions.
3. **Concrete code examples** — show the pattern, don't describe it.
4. **Explicit boundaries** — what the agent does NOT do.
5. **Tech stack specifics** — exact versions and configurations.
6. **Coverage across six areas** — commands, testing, project structure, code style, git workflow, boundaries.

### Progressive Disclosure via Skills

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

The agent receives database knowledge only when working on database tasks. For all other tasks, that context is not loaded, preserving working memory.

> **TEMPLATE: CONFIGURATION AUDIT**
>
> CLAUDE.md: [X] lines (target: <150). Last reviewed: [date].
>
> Skills: [N] skill files covering [domains]. Hooks: [N] hooks covering [categories].
>
> Agent files: [N] agent definitions. Path rules: [N] path-specific rule files.
>
> Cross-tool: agents.md [exists/absent]. Compatible with: [tools].

> **ANTI-PATTERN: CONFIGURATION ACCRETION** — After every incident, a new line is added to CLAUDE.md. The file grows from 80 to 400 lines over three months. Instruction-following degrades with each addition. Treat config files like code: refactor regularly. When a constraint is critical enough to add, ask whether it should be a hook instead.

-----

# PART 3 — ENFORCEMENT

*The gap between "should" and "must."*

*An instruction says "don't do this." Enforcement makes it impossible. Every constraint you define in Parts 1 and 2 falls somewhere on the spectrum from soft guidance to hard enforcement. These three sections define that spectrum, assign each constraint to its correct level, and secure the enforcement layer itself against attack.*

-----

## 08 — DETERMINISTIC ENFORCEMENT

> **TL;DR** — An instruction in CLAUDE.md saying "never use rm -rf" can be forgotten. A PreToolUse hook that blocks it fires every single time. Any constraint that must hold with zero exceptions must be a hook, not an instruction.

This distinction — between advisory instructions and deterministic enforcement — is the foundation of reliable fleet operations.

### The Enforcement Spectrum

| Level | Mechanism | Reliability | Use For |
|---|---|---|---|
| **Hard enforcement** | Hooks, CI gates, linters, type checkers, file system permissions | 100% — fires deterministically | Safety, security, scope limits, formatting, test requirements |
| **Firm guidance** | CLAUDE.md rules, system prompt instructions, agents.md | High but degradable under context pressure | Coding patterns, architectural preferences, naming conventions |
| **Soft guidance** | Comments in code, README notes, verbal instructions | Low — easily overridden | Suggestions, preferences, nice-to-haves |

### Hook Lifecycle Events

| Event | When It Fires | Use For |
|---|---|---|
| **PreToolUse** | Before any tool invocation | Blocking dangerous commands, enforcing scope boundaries |
| **PostToolUse** | After any tool invocation | Logging, auditing, triggering downstream checks |
| **PreCommit** | Before a git commit | Linting, test execution, formatting, secret scanning |
| **PostCommit** | After a git commit | Notification, CI trigger, changelog update |
| **SessionStart** | When an agent session begins | Context loading, environment validation, staleness checks |
| **TaskCompleted** | When a task is marked complete | Quality gate execution, metric logging |
| **PrePush** | Before pushing to remote | Branch protection, review requirements |

### What Must Be Hooks vs. Instructions

| Category | Hook (Deterministic) | Instruction (Advisory) |
|---|---|---|
| **Security** | Block `rm -rf /`, prevent commits with secrets, enforce file scope | Prefer secure patterns, follow OWASP guidelines |
| **Quality** | Run linter on save, tests before commit, type-check before merge | Write clean code, follow naming conventions |
| **Scope** | Block modifications outside assigned directories | Stay focused on the current task |
| **Process** | Require test existence before implementation accepted | Write tests for new features |
| **Cost** | Kill session after token budget exceeded | Be mindful of token usage |

### Self-Healing Quality Loops

The most effective fleet pattern discovered in production: hooks that detect failures and trigger automatic repair.

```
Agent writes code
  → PostToolUse hook runs linter
    → Linter fails → Hook returns failure with output
      → Agent fixes violations
        → Hook runs linter again → Passes → proceed
```

One deterministic check that fires every time and self-heals is more effective than three manual review passes that may or may not happen. Apply the same pattern to type checking, tests, and formatting.

> **TEMPLATE: ENFORCEMENT CLASSIFICATION**
>
> HARD ENFORCEMENT (hooks):
> - [Constraint]: [Hook event] — [Shell command]
>
> FIRM GUIDANCE (instructions):
> - [Constraint]: [Where documented — CLAUDE.md / system prompt / agents.md]
>
> SOFT GUIDANCE (reference):
> - [Preference]: [Where noted]

> **ANTI-PATTERN: ALL INSTRUCTIONS, NO HOOKS** — The Admiral writes comprehensive CLAUDE.md rules but implements zero hooks. For the first 60% of a session, rules are followed. As context pressure builds, rules near the beginning lose attention weight. The agent violates constraints it followed an hour ago. More rules are added. The file grows. The agent ignores more. Death spiral.

-----

## 09 — DECISION AUTHORITY

> **TL;DR** — Four tiers: Enforced (hooks decide), Autonomous (agent decides), Propose (agent recommends, Admiral approves), Escalate (stop all work). Every decision must be assigned to a tier.

Every orchestrator needs a clear decision envelope: what it may decide autonomously versus what requires Admiral approval.

### Four Tiers of Authority

| Tier | Behavior | Examples |
|---|---|---|
| **ENFORCED** | Handled by hooks, not agent judgment. The agent never makes this decision. | File scope boundaries, secret detection, test execution before commit |
| **AUTONOMOUS** | Proceed without asking. Log the decision. | File naming, variable naming, internal refactors, test creation |
| **PROPOSE** | Draft with rationale. Present alternatives. Wait for approval. | New dependencies, architecture changes, schema migrations, public API changes |
| **ESCALATE** | Stop all work. Flag to Admiral immediately. | Scope changes, budget overruns, security concerns, contradictory requirements |

### Calibration Rubric

| Project Condition | Calibration |
|---|---|
| Strong test coverage (>80%) | Widen Autonomous. Tests catch mistakes. |
| Greenfield / pre-MVP | Narrow Autonomous. Early decisions have outsized impact. |
| Established architecture patterns | Pattern-following → Autonomous. Pattern-breaking → Propose. |
| External-facing or regulated | Narrow Autonomous significantly. |
| Self-healing hooks in place | Widen Autonomous for hook-covered categories. |

> **ANTI-PATTERN: DEFERENCE CASCADING** — One agent is uncertain, defers to another, who defers back. The decision is made by whichever agent is last — usually the least qualified. Uncertainty always flows upward, never sideways.

-----

## 10 — CONFIGURATION SECURITY

> **TL;DR** — Agent configs are attack surfaces. Memory poisoning persists across sessions. Supply chain attacks arrive through MCP servers and skills. Audit everything, pin versions, treat configs as security-critical code.

Agent configurations are attack surfaces. A compromised CLAUDE.md, a malicious MCP server, or a poisoned memory file can turn your fleet against your own codebase. Documented attacks include memory poisoning, supply chain compromises, agent hijacking, and prompt injection through third-party skills.

### Threat Model

| Attack Vector | How It Works | Defense |
|---|---|---|
| **Memory poisoning** | False information implanted in agent memory persists across all future sessions | Validate memory sources. Version-stamp entries. Audit for unexpected changes. |
| **Supply chain compromise** | Malicious MCP server or skill exfiltrates data while appearing to function normally | Audit all servers before install. Pin versions. Review source. Monitor traffic. |
| **Configuration injection** | Attacker modifies config files in a PR or through compromised CI | CODEOWNERS for `.claude/`. Require review for all config changes. |
| **Prompt injection via skills** | Third-party skill contains hidden instructions overriding constraints | Review all skill files. Never auto-install from untrusted sources. |
| **Agent hijacking** | Exploiting broad permissions for unauthorized actions (BodySnatcher, ZombieAgent) | Least privilege. Scope boundaries per agent. Audit logs for all actions. |

### Security Scanning Protocol

1. **Red team:** Attempt to make the agent violate constraints. Probe for injection in skills and MCP servers. Test memory poisoning. Attempt permission escalation.
2. **Blue team:** Review for overly broad permissions. Audit MCP access. Verify hooks cover critical constraints. Check scope enforcement.
3. **Auditor:** Compare actual behavior against documented constraints. Verify enforcement classification (Section 08) is implemented correctly.

### Configuration Hygiene

- **Version all configuration files** in git, reviewed in PRs.
- **CODEOWNERS for `.claude/` directories.**
- **Pin MCP server versions.** Never use `latest` in production.
- **Audit third-party skills.** Read every line before installing.
- **Rotate secrets** on the same schedule as application secrets.
- **Monitor for drift.** Behavior diverging from config may indicate poisoning.

> **TEMPLATE: SECURITY AUDIT CHECKLIST**
>
> - [ ] All config files version-controlled
> - [ ] CODEOWNERS set for `.claude/` and equivalent directories
> - [ ] MCP servers pinned to specific versions
> - [ ] All third-party skills reviewed (source code read)
> - [ ] Memory files audited for unexpected entries
> - [ ] Hooks enforce all critical safety constraints
> - [ ] No secrets in config files
> - [ ] Scope boundaries enforced via hooks, not just instructions
> - [ ] Red-team probe completed
> - [ ] Audit log enabled for all agent actions

> **ANTI-PATTERN: TRUST BY DEFAULT** — A popular MCP server with 10K GitHub stars is installed without reading its source code. It functions perfectly — and sends a copy of every file the agent reads to an external endpoint. Popularity is not security. Stars are not audits.

-----

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

# PART 5 — EXECUTION

*How work gets planned, parallelized, and completed.*

*Strategy says what. Context says how agents know. Enforcement says what's mandatory. Fleet says who. Now: how does actual work flow? These three sections cover decomposition, parallelization, and advanced orchestration patterns.*

-----

## 15 — WORK DECOMPOSITION

> **TL;DR** — Break goals into chunks that each consume no more than 40% of an agent's token budget. Each chunk is independently completable, independently verifiable, with explicit entry and exit states.

AI agents do not naturally manage resource depletion. Given a large task, an agent produces high-quality work for the first 60% and rushes the remaining 40%.

### Chunking Principles

- **No single task should consume more than 40% of token budget.** Ensures resources for execution, self-review, and checkpointing.
- **Each chunk must be independently completable and independently verifiable.**
- **Chunks must have explicit entry state and exit state.**
- **Sequence chunks to front-load uncertainty.** Unknown complexity first, when resources are fresh.

### The Spec-First Pipeline

For significant features, each phase produces artifacts feeding the next:

1. **Requirements Spec:** What the feature must do. Acceptance criteria. Edge cases. Not how — what.
2. **Design Spec:** How it will be built. Architecture. Data models. API contracts. Components.
3. **Task Decomposition:** Design spec broken into chunks with entry/exit states and budgets.
4. **Implementation:** Each chunk executed by the appropriate specialist.

Each phase can be a separate session with clean context. The output of phase N becomes the input of phase N+1.

### Self-Healing Quality Integration

Every chunk includes automated quality gates:

```
Chunk complete
  → Type checker → Fix if failures → Recheck
  → Linter → Fix if failures → Recheck
  → Tests → Fix if failures → Retest
  → All pass → Checkpoint → Next chunk
```

> **TEMPLATE: TASK DECOMPOSITION**
>
> GOAL: [High-level objective]
>
> PIPELINE: [Requirements → Design → Tasks → Implementation] or [Tasks → Implementation]
>
> CHUNKS:
> 1. [Chunk] — Entry: [preconditions] — Exit: [deliverable + criteria] — Budget: [tokens/time] — Gates: [checks]
>
> SEQUENCE: [Ordered by uncertainty descending]

> **ANTI-PATTERN: COMPLETION BIAS** — Agents would rather produce complete but mediocre output than incomplete but excellent output. If running low on budget, an agent silently drops quality. You get all 12 endpoints but the last 4 have no error handling. Define quality floor per chunk. Fewer chunks at full quality beats all chunks at degraded quality.

-----

## 16 — PARALLEL EXECUTION STRATEGY

> **TL;DR** — Parallelize when tasks share no state. Serialize when they share files. Always define the interface contract before dispatching parallel work. Thirty minutes on a contract saves hours on rework.

The power of fleet architecture lies in parallelism. But parallelism without coordination produces divergent work expensive to reconcile.

### When to Parallelize

| Condition | Strategy |
|---|---|
| No shared files, state, or interface dependency | **Parallelize** |
| Shared interface but not implementation | **Parallelize with contract** |
| Shared file ownership or overlapping state | **Serialize** |
| B depends on A's design decisions but not implementation | **Stagger** — start B once A's design checkpoints |
| Interface not yet defined | **Serialize** — parallelizing without a contract guarantees divergence |

### Coordination Patterns

**1. Contract-First Parallelism:** Define the interface contract first. Both agents work to it independently. Neither may unilaterally modify it.

**2. Checkpoint Synchronization:** Parallel agents checkpoint at intervals. Orchestrator reviews for assumption alignment.

**3. Ownership Isolation:** Each agent has exclusive write ownership of specific directories. Eliminates merge conflicts by construction.

**4. Git Worktree Isolation:** Each agent works in a separate worktree — a complete repository copy on a different branch. Integration happens through merge after completion.

### Assumption Divergence Detection

**Warning signs:** Agent makes a design decision not in the contract. Agent asks questions the contract should answer. Two agents produce outputs using different naming or data shapes.

**Resolution:** Pause both. Identify divergence point. Resolve with authority. Rebrief both.

> **ANTI-PATTERN: OPTIMISTIC PARALLELISM** — Parallel work dispatched without an interface contract. Each agent invents assumptions. Both produce excellent work. Neither is compatible with the other.

-----

## 17 — SWARM PATTERNS

> **TL;DR** — Hierarchical fleets (orchestrator + specialists) handle most projects. Swarms and multi-model orchestration extend capabilities for scale and adversarial quality — but add complexity. Don't reach for them unless you need them.

### When Hierarchical Fleets Are Sufficient

Most projects. A single orchestrator coordinating five to ten specialists handles the majority of software development work.

### Swarm Intelligence

Agents self-organize rather than following top-down orchestration. A queen coordinates, prevents drift, reaches consensus even when agents fail.

```
Queen Agent
  ├── Worker A (frontend)
  ├── Worker B (backend)
  ├── Worker C (testing)
  └── Worker D (database)
```

| Hierarchical Fleet | Swarm |
|---|---|
| Orchestrator assigns tasks | Queen coordinates; workers self-select |
| Fixed routing rules | Dynamic routing by capacity |
| Single point of coordination | Consensus mechanisms |
| Failure requires orchestrator intervention | Self-heals around failed agents |

**When to use swarms:** Tasks are numerous, similar, and parallelizable. The fleet needs to operate with minimal Admiral oversight for extended periods.

### Multi-Model Orchestration

- **Adversarial review:** Same task through two models from different providers. Each critiques the other. Different blind spots surface different errors.
- **Specialized routing:** Research model for gathering, code model for implementation, reasoning model for architecture — within one workflow.
- **Cost-optimized pipelines:** Economy-tier first draft, flagship-tier review. 80% of token volume at 1/30th the cost.

> **ANTI-PATTERN: PREMATURE SWARM** — A swarm deployed for a CRUD app. Consensus mechanisms and queen coordination add complexity exceeding the project's needs. A simple fleet with three specialists produces the same output at a fraction of the overhead.

-----

# PART 6 — QUALITY

*How the fleet maintains standards and handles failure.*

*Strategy defines the target. Execution produces the work. Quality is the feedback loop that closes the gap. These three sections define how work is verified, how failures are recovered, and a comprehensive catalog of the ways agent fleets systematically fail.*

-----

## 18 — QUALITY ASSURANCE

> **TL;DR** — Self-healing quality loops (automated checks that fix their own failures) are more effective than multi-pass review. Reserve human-judgment review for what machines cannot check: logic correctness, design quality, architectural alignment.

### Verification Levels

| Level | What It Involves | When to Use |
|---|---|---|
| **Self-Check** | Agent reviews own output. Runs automated checks. Self-healing loop. | Low-risk Autonomous-tier tasks |
| **Peer Review** | Separate QA agent reviews. Pass/fail with specific issues. | Feature implementations, schema changes, API modifications |
| **Adversarial Review** | Same task through different model/provider. Each critiques the other. | High-stakes, security-sensitive, architectural decisions |
| **Admiral Review** | Admiral reviews output, decision log, reasoning traces. | Architecture decisions, first implementations of new patterns |

### Self-Healing as Primary QA

```
Agent completes implementation
  → Type checker → Failures fed back → Agent fixes → Recheck
  → Linter → Failures fed back → Agent fixes → Recheck
  → Tests → Failures fed back → Agent fixes → Retest
  → All pass → QA agent receives clean output for review
```

QA focuses on what machines cannot check: logic correctness, design quality, edge case completeness, architectural alignment.

### QA Feedback Loop

> **TEMPLATE: QA ISSUE REPORT**
>
> ISSUE: [One sentence]
>
> SEVERITY: [Blocker | Major | Minor | Cosmetic]
>
> LOCATION: [File, line number, or component]
>
> EXPECTED: [Per acceptance criteria]
>
> ACTUAL: [What actually happens]
>
> CONFIDENCE: [Verified (tested) | Assessed (reviewed carefully) | Assumed (spot-checked)]

> **ANTI-PATTERN: SYCOPHANTIC DRIFT** — Over long sessions, agents increasingly agree with established framing. QA finds fewer issues. After several review rounds where the orchestrator pushes back, the QA agent starts "finding" fewer issues. Ensure QA instructions state that finding zero issues is a red flag.

-----

## 19 — FAILURE RECOVERY

> **TL;DR** — Five-step recovery ladder: retry with variation, fallback to simpler approach, backtrack to last-known-good state, isolate and skip, escalate. No silent recoveries. Every recovery action is logged.

Without recovery protocols, agents loop indefinitely, silently produce garbage, or freeze.

### Standard Recovery Ladder

1. **Retry with variation.** Meaningfully different alternative (not the same approach repeated). Max 2–3 retries. Log each.
2. **Fallback to simpler approach.** Known-safe fallback producing lesser but acceptable result. Defined in advance.
3. **Backtrack.** Roll back to last known-good state. Try a different path entirely. Distinct from retry — abandons the current approach.
4. **Isolate and skip.** Mark task as blocked with structured report. Move to next task. Surface at checkpoint.
5. **Escalate to Admiral.** Structured escalation report. No further creative solutions.

### Backtracking

Effective backtracking requires:

- **Checkpoint before branching decisions.** Save state before committing to an approach.
- **Clean rollback.** Return to checkpoint without residual state from the failed path.
- **Path memory.** Record which paths were tried and why they failed.

> **TEMPLATE: ESCALATION REPORT**
>
> BLOCKER: [One sentence]
>
> CONTEXT: [What task was being attempted]
>
> ATTEMPTED: [Approaches tried, in order, with outcomes]
>
> ROOT CAUSE (if known): [Best assessment]
>
> NEEDED: [What would unblock this]
>
> IMPACT: [Downstream tasks affected]
>
> RECOMMENDATION: [Agent's suggested resolution]

> **ANTI-PATTERN: SILENT FAILURE** — An agent encounters an error, works around it silently, delivers a subtly wrong result. This is completion bias overriding correctness. Require all agents to log every recovery action. No silent fallbacks.

-----

## 20 — KNOWN AGENT FAILURE MODES

> **TL;DR** — Twenty systematic failure modes cataloged with their primary defenses and warning signs. Use the Diagnostic Decision Tree when things go wrong.

### Failure Mode Catalog

| Failure Mode | Description | Primary Defense |
|---|---|---|
| **Premature Convergence** | Latches onto first viable solution without exploring alternatives | Recovery (19): require multiple candidates for critical decisions |
| **Sycophantic Drift** | Increasingly agrees with established framing over time | QA (18): zero findings is a red flag |
| **Completion Bias** | Delivers complete but degraded output rather than incomplete but excellent | Decomposition (15): chunk sizing ensures full attention |
| **Confidence Uniformity** | All output presented with equal confidence regardless of certainty | QA (18): require confidence levels |
| **Context Recency Bias** | Last-loaded context dominates; early constraints deprioritized | Context Strategy (06): deliberate loading order |
| **Phantom Capabilities** | Assumes tools or access it does not have | Tool Registry (12): explicit negative tool list |
| **Scope Creep via Helpfulness** | Adds unrequested features; each reasonable, collectively budget-blowing | Boundaries (02): explicit non-goals |
| **Hierarchical Drift** | Specialists make orchestrator-level decisions | Fleet Composition (11): explicit role boundaries |
| **Invocation Inconsistency** | Same context, different outputs across runs; naming drifts | Ground Truth (05): explicit conventions |
| **Silent Failure** | Encounters error, works around it without logging | Recovery (19): mandatory recovery logging |
| **Context Stuffing** | Overloaded context → shallow, unfocused output | Context Strategy (06): curated profiles, <150 line rule |
| **Context Starvation** | Underloaded context → drifts from Mission, infers incorrectly | Context Strategy (06): minimum viable context floor |
| **Instruction Decay** | Rules followed early, ignored as session lengthens | Enforcement (08): critical rules must be hooks |
| **Memory Poisoning** | False info in agent memory persists across sessions | Security (10): audit memory files |
| **Configuration Injection** | Attacker modifies config to override constraints | Security (10): CODEOWNERS, review requirements |
| **Tool Hallucination via MCP** | Assumes MCP server provides capabilities it does not | Tool Registry (12): explicit MCP capability list |
| **Session Amnesia** | Loses critical context between sessions despite checkpointing | Memory (21): structured persistence patterns |
| **Swarm Consensus Failure** | Agents reach consensus on an incorrect answer | Swarm (17): adversarial review, multi-model cross-check |
| **Config Accretion** | Config files grow until agents ignore rules | Config Strategy (07): 150-line rule, regular refactoring |
| **Goodharting** | Optimizes tracked metrics rather than genuine outcomes | Metrics (24): track in combination, rotate emphasis |

### Diagnostic Decision Tree

**Output quality declining:**
- Worse at end than beginning? → **Completion Bias** → Decomposition (15): reduce chunk size.
- Uniformly lower? → **Context Starvation** or **Stuffing** → Context Strategy (06).
- Rules followed early but not late? → **Instruction Decay** → Enforcement (08): convert to hooks.

**Tasks taking too long:**
- Sent back repeatedly? → **Unclear Success Criteria** → Criteria (03).
- Frequent escalations? → **Narrow Autonomous Tier** → Decision Authority (09).
- Retrying same approach? → **Phantom Capabilities** → Tool Registry (12).

**Agents doing unrequested work:**
- Adding features? → **Scope Creep** → Boundaries (02).
- Making architectural decisions? → **Hierarchical Drift** → Fleet Composition (11).
- Modifying files outside scope? → Enforcement (08): add scope hook.

**Work from different agents doesn't integrate:**
- Working in parallel? → **Optimistic Parallelism** → Parallel Execution (16): define contracts first.
- Different naming for same concept? → **Invocation Inconsistency** → Ground Truth (05).

-----

# PART 7 — OPERATIONS

*How work persists, adapts, and scales over time.*

*Parts 1–6 cover a single fleet executing a single phase of work. Part 7 addresses the ongoing reality: sessions end, requirements change, budgets matter, fleets grow and shrink, and multiple projects run simultaneously. These six sections keep the enterprise healthy over time.*

-----

## 21 — INSTITUTIONAL MEMORY

> **TL;DR** — Agents lose context between sessions. Use checkpoint files, ledger files, handoff documents, or git-based state to persist across context window boundaries. Session persistence is the single biggest UX pain point in agentic coding.

### Session Persistence Patterns

**1. Checkpoint Files:** Structured summaries at chunk boundaries. Simplest pattern.

> **TEMPLATE: SESSION CHECKPOINT**
>
> SESSION: [Date/time] | FLEET: [Project] | ORCHESTRATOR: [ID]
>
> COMPLETED: [Tasks finished with status]
>
> IN PROGRESS: [Current state]
>
> BLOCKED: [Tasks blocked with references]
>
> NEXT: [Ordered tasks for next session]
>
> DECISIONS MADE: [Count, with references to decision log]
>
> RECOVERY ACTIONS: [Any ladder invocations, or "None"]
>
> RESOURCES CONSUMED: [Tokens / budget, time / budget]
>
> ASSUMPTIONS: [New assumptions Admiral should validate]

**2. Ledger Files:** Running logs maintained by hooks. SessionStart hooks read the ledger to reconstruct context.

**3. Handoff Documents:** Narrative briefings at session end, designed for next session start. Capture intent and reasoning, not just status.

**4. Git-Based State:** Session state committed to git. Branches as work streams. Commits as checkpoints.

**5. Continuous Operation:** Persistent loops — implement, commit, wait for CI, merge, next task. Hooks maintain ledgers as backup.

### Which Pattern to Use

| Scenario | Pattern |
|---|---|
| Single developer, simple project | Checkpoint files |
| Team with shared fleet | Git-based state + handoff documents |
| Long-running autonomous fleet | Continuous operation + ledger files |
| Cross-session complex features | Handoff documents + checkpoint files |

### Decision Log

Chronological record of every non-trivial decision: timestamp, decision, alternatives considered, rationale, authority tier used. Enables the Admiral to audit any fleet's history in under five minutes.

> **ANTI-PATTERN: FALSE CHECKPOINTING** — Summaries that sound comprehensive but omit what was NOT done, what assumptions were made, what shortcuts were taken. Checkpoint reads "everything on track" when three things are subtly broken. Require explicit "Assumptions" and "Recovery Actions" fields. If both are empty, be suspicious.

-----

## 22 — ADAPTATION PROTOCOL

> **TL;DR** — Three tiers of change: Tactical (update tasks, no pause), Strategic (pause, cascade through artifacts, resume), Full Pivot (halt, restart from scratch). Every artifact update must cascade through its downstream dependencies.

### Change Classification

| Classification | What Changed | Response |
|---|---|---|
| **Tactical Adjustment** | Task parameters, minor deadline shifts, requirement clarifications | Update affected tasks. No pause. Log. |
| **Strategic Shift** | Mission evolution, Boundary changes, Ground Truth updates, significant scope change | Pause at chunk boundary. Cascade through artifacts. Re-validate. Resume. |
| **Full Pivot** | Fundamental direction change, complete tech change, total scope replacement | Halt fleet. Treat as new deployment. Full Quick-Start. |

### The Cascade Map

Framework artifacts form a dependency graph. When one changes, downstream artifacts may become stale.

```
Mission (01) ──→ Boundaries (02) ──→ Success Criteria (03)
     │                │                       │
     │                ▼                       ▼
     │         Work Decomposition (15) ──→ Parallel Execution (16)
     │                                        │
     │                                        ▼
     │         Quality Assurance (18) ──→ Fleet Health Metrics (24) ──→ Cost Management (23)
     │
     ▼
Ground Truth (05) ──→ Fleet Composition (11) ──→ Decision Authority (09) ──→ Admiral Self-Calibration (27)
                              │
                              ├──→ Context Profiles (06)
                              ├──→ Context Engineering (04)
                              ├──→ Tool Registry (12) ──→ Protocol Integration (14)
                              ├──→ Model Selection (13) ──→ Cost Management (23)
                              └──→ Fleet Scaling (25)

Enforcement (08) ──→ Config Strategy (07) ──→ Config Security (10)
```

**The cascade rule:** Update an artifact, then review every downstream artifact. Revise any that are inconsistent.

**The order rule:** Always cascade top-down. Never update downstream before upstream is finalized.

### Fleet Pause Protocol

1. Complete the current chunk. Do not interrupt mid-task.
2. Collect all checkpoints including assumptions that may be affected.
3. Admiral updates affected artifacts in dependency order.
4. Run Pre-Flight Checklist against updated artifacts.
5. Rebrief each agent with updated context and explicit change summary.
6. Resume with elevated verification on the first post-resumption chunk.

> **ANTI-PATTERN: PATCH WITHOUT CASCADE** — Mission updated but Boundaries and Success Criteria left unchanged. Fleet operates with new direction but old constraints.

> **ANTI-PATTERN: PERPETUAL PIVOT** — Direction changes every session. Fleet never achieves momentum. If Strategic Shifts exceed once per major phase, fix the Mission.

-----

## 23 — COST MANAGEMENT

> **TL;DR** — The biggest cost lever is LLM-Last design (Section 02): eliminating 30-60% of LLM calls by routing to deterministic tools. Second: model tier assignment. Third: context size via progressive disclosure. Track spend in dollars, not just tokens.

### Cost Drivers and Levers

| Cost Driver | Lever | Impact |
|---|---|---|
| **LLM for deterministic tasks** | LLM-Last design (Section 02) | **Highest.** Eliminates 30-60% of LLM calls. |
| **Model tier** | Demote where quality is indistinguishable at lower tier (Section 13) | High. Economy-tier at 1/30th cost. |
| **Context size** | Progressive disclosure, <150 line rule (Section 07) | High. Every loaded token is billed. |
| **Retry and rework** | Sharper criteria and self-healing hooks | Medium. Each retry doubles chunk cost. |
| **Over-decomposition** | Consolidate small chunks | Medium. Each chunk pays context tax. |
| **Tool call volume** | Cap calls per task | Lower but compounds at scale. |

### Cost Budgets

- **Per-session:** Maximum spend before pausing for review. Circuit breaker.
- **Per-phase:** Total allocation for a project phase. Exceeding triggers Strategic Shift.
- **Cost-per-chunk target:** Expected cost at each tier. Chunks exceeding 2x target warrant investigation.

### Economy-Tier Strategy

Models like DeepSeek V3.2 at ~1/30th flagship cost change fleet economics:

- **Tier 4 for first drafts.** Economy draft, higher-tier review.
- **Bulk processing.** Migrations, formatting, boilerplate at economy rates.
- **Adversarial review at low cost.** Second model pass without doubling cost.

> **ANTI-PATTERN: COST BLINDNESS** — Token budgets tracked but never translated to dollars. The fleet runs three weeks before anyone checks the invoice.

-----

## 24 — FLEET HEALTH METRICS

> **TL;DR** — Track productivity, quality, and coordination metrics. Interpret them in combination. Every review ends with "no changes needed" or "metric X indicates problem Y — here is the adjustment."

### Productivity Metrics

| Metric | Healthy | Warning |
|---|---|---|
| **Throughput** (chunks/session) | Stable or increasing | Declining or erratic |
| **Budget Adherence** | 80–120% consistently | Consistent overruns or underruns |
| **Idle Time Ratio** | Under 15% | Over 25% — bottleneck |
| **Parallelism Utilization** | Steady increase | Near zero or 100% without contracts |

### Quality Metrics

| Metric | Healthy | Warning |
|---|---|---|
| **First-Pass Quality Rate** | Above 75% | Below 50% — unclear criteria |
| **Rework Ratio** | Under 10% | Above 20% — upstream problems |
| **Defect Escape Rate** | Near zero | Any consistent pattern |
| **Self-Heal Rate** | Above 80% | Below 50% — gates misconfigured |

### Coordination Metrics

| Metric | Healthy | Warning |
|---|---|---|
| **Escalation Rate** | Decreasing over time | Increasing — insufficient context or authority |
| **Assumption Accuracy** | Above 85% | Below 70% — Ground Truth stale |
| **Recovery Ladder Usage** | 1–2 per session | 5+ — environmental instability |
| **Handoff Rejection Rate** | Under 5% | Above 15% — contracts underspecified |

### Interpreting in Combination

- **Throughput up, Quality down:** Moving faster, cutting corners. Tighten quality floors.
- **Throughput stable, Escalation up:** More Admiral time needed. Widen Autonomous tier.
- **Idle up, Throughput down:** Bottleneck. Check Propose queue.
- **Recovery up, Accuracy down:** Ground Truth stale. Audit immediately.
- **Self-Heal down, Rework up:** Hooks or quality gates broken. Fix enforcement layer.

> **ANTI-PATTERN: METRIC THEATER** — Metrics collected but no adjustments result. Every review must end with action or explicit confirmation that no action is needed.

-----

## 25 — FLEET SCALING & LIFECYCLE

> **TL;DR** — Fleets evolve through five phases: Standup → Acceleration → Steady State → Wind-Down → Dormant. Scale up when generalists produce lower quality in specific domains. Scale down when specialists idle.

### Scaling Signals

**Needs more specialization:** Generalist quality drops in a domain. Orchestrator can't decompose tasks it doesn't understand. Recurring unserved demand.

**Over-specialized:** Specialists idle for extended periods. More time coordinating than working. Interface violations from too many boundaries.

**Should split:** Orchestrator can't hold full roster in context. Subsystems have independent deployment cycles.

### Lifecycle Phases

| Phase | Characteristics | Admiral Focus |
|---|---|---|
| **Standup** | Narrow Autonomous. Frequent escalations. | Define artifacts. Build trust. Accept slower velocity. |
| **Acceleration** | Autonomous widening. Escalations decreasing. | Widen trust. Optimize tiers. Parallelize. |
| **Steady State** | Stable throughput. Rare escalations. | Monitor drift. Maintain Ground Truth. Optimize cost. |
| **Wind-Down** | Volume decreasing. Specialist knowledge less critical. | Consolidate roles. Demote tiers. Reduce fleet. |
| **Dormant** | Maintenance mode. Minimal fleet preserved. | Orchestrator + Implementer + QA on standby. Artifacts preserved. |

> **ANTI-PATTERN: PREMATURE DECOMMISSION** — Project enters maintenance, fleet decommissioned entirely. Six months later, a critical bug. Institutional memory gone. Maintain a dormant fleet.

-----

## 26 — INTER-FLEET GOVERNANCE

> **TL;DR** — Multiple fleets are isolated by default. Sharing happens through Admiral Relay (manual) or A2A (automated). Review across fleets regularly for promotable patterns, systemic failures, and resource imbalances.

### Isolation Protocol

- **Knowledge isolation:** Each fleet receives ONLY project-relevant knowledge.
- **File system isolation:** Each fleet operates within its own directory structure.
- **Context isolation:** No agent has information about other projects.

### Controlled Sharing

**1. Admiral Relay (Manual):** Admiral extracts, validates, delivers knowledge from Fleet A to Fleet B as a Ground Truth update. Agents never communicate across fleet boundaries directly.

**2. Protocol-Based (Automated):** A2A enables structured cross-fleet communication with contracts and authentication. Each fleet publishes Agent Cards for shareable interfaces.

### Cross-Fleet Review

At regular intervals:
- **Promotable patterns:** Solutions from one fleet that should be generalized.
- **Systemic failures:** Repeated failure modes indicating framework gaps.
- **Resource imbalances:** Fleets consistently over or under budget.
- **Trust calibration updates:** Fleets that have earned wider autonomy.

-----

# PART 8 — THE ADMIRAL

*The human element.*

*Every section above defines what the fleet needs. This section addresses the Admiral's own development — how to detect when you are the bottleneck, how to calibrate trust over time, and when to route decisions to experts instead of answering them yourself.*

-----

## 27 — ADMIRAL SELF-CALIBRATION

> **TL;DR** — If you're rubber-stamping approvals, widen Autonomous. If agents escalate constantly, narrow your review scope or improve context. Trust is earned per category, not globally, and withdrawn precisely.

### Bottleneck Detection

| Signal | What It Means |
|---|---|
| Multiple tasks awaiting approval | Autonomous tier too narrow or review cadence too slow |
| Agents escalate more than once per session | Decision Authority unclear or context insufficient |
| Agents checkpoint and wait | Admiral is bottleneck; no independent work |
| Rubber-stamp approvals | These decisions should be Autonomous |
| Reviews getting shorter over time | Too many items; delegate more |

### Trust Calibration

Trust is not a feeling. It is a measurable parameter earned incrementally and withdrawn precisely.

**Earning:** After consecutive successful Autonomous decisions in a category, promote similar Propose-tier decisions. Category-specific, not global. Log every promotion.

**Withdrawing:** After a failed Autonomous decision, demote that category to Propose. Investigate: context gap (fixable via Ground Truth) or judgment gap (needs tighter oversight)?

### The Admiral's Growth Trajectory

| Stage | Characteristics | Focus |
|---|---|---|
| **Novice** | Narrow Autonomous. Reviews everything. | Learn failure modes. Build intuition. |
| **Practitioner** | Moderate Autonomous. Reviews strategically. | Refine trust calibration per category. |
| **Expert** | Wide Autonomous. Rare interventions. | Framework evolution, cross-fleet governance. |
| **Master** | Fleet sustains quality autonomously. | Extend the framework. Mentor new Admirals. |

### The Admiral as Meta-Agent

The Admiral may itself be an AI agent — a meta-orchestrator. In this configuration:

- The meta-agent's constraints must be the most heavily enforced (hooks on hooks).
- A human must still hold Escalate-tier authority. No self-authorized scope expansion.
- Trust calibration applies to the meta-agent just as it applies to any fleet member.

> **ANTI-PATTERN: MICROMANAGEMENT SPIRAL** — After one bad outcome, Autonomous narrowed across all categories. Velocity plummets. Escalations flood. Review quality drops. More mistakes. Narrow precisely — only the failed category.

> **ANTI-PATTERN: ABDICATION** — The Admiral stops reviewing, updating, calibrating. The fleet runs on autopilot. Ground Truth goes stale, Boundaries erode, memory becomes documents no one reads. A Master Admiral intervenes infrequently. An abdicating Admiral intervenes never. The outcomes are opposite.

-----

## 28 — HUMAN-EXPERT ROUTING

> **TL;DR** — The Admiral is not omniscient. Route regulatory, design, business strategy, domain performance, and security risk decisions to subject-matter experts. Package the question. Track the response. Integrate it as Ground Truth.

### Expert Roster

| Field | What to Define |
|---|---|
| **Expert Name/Role** | Who they are and their domain |
| **Domain** | Specific decision categories they answer |
| **Response SLA** | Expected turnaround time |
| **Input Format** | What the expert needs to decide |
| **Output Format** | What they provide back |

### Routing Triggers

- **Regulatory or legal implications.**
- **User-facing design judgment.**
- **Business strategy** — pricing, positioning, prioritization.
- **Domain-specific performance** — database optimization, ML, network.
- **Security risk assessment** — which vulnerabilities to fix now, defer, or accept.

### Consultation Protocol

1. **Package:** Structured request with exactly what the expert needs.
2. **Route and track:** Log in decision log with "Pending External" status.
3. **Integrate:** Translate response into fleet-actionable terms. Update Ground Truth if durable.
4. **Resume:** If paused, resume using Fleet Pause Protocol (Section 22).

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

> **ANTI-PATTERN: ADMIRAL AS UNIVERSAL EXPERT** — The Admiral answers every domain question personally. Privacy guidance misses a jurisdictional requirement. UX decision creates an accessibility failure. The Admiral's job is to know who knows, not to know everything.

-----

# APPENDICES

-----

## A — Pre-Flight Checklist

Before deploying any new fleet, verify every item. If any box is unchecked, the fleet is not ready.

**Part 1 — Strategy**

- [ ] **Mission (01):** Project identity, success state, stakeholders, phase, pipeline entry point.
- [ ] **Boundaries (02):** Non-goals, hard constraints, resource budgets, quality floor, LLM-Last boundary.
- [ ] **Success Criteria (03):** Functional, quality, completeness, and negative criteria. Machine-verifiable where possible.

**Part 2 — Context**

- [ ] **Context Engineering (04):** Instructions follow prompt anatomy (Identity → Authority → Constraints → Knowledge → Task). Tested with probes.
- [ ] **Ground Truth (05):** Ontology, naming, tech stack versions, access/permissions, known issues, configuration artifacts.
- [ ] **Context Window Strategy (06):** Profiles per role. Loading order, refresh triggers, sacrifice order. Progressive disclosure.
- [ ] **Configuration File Strategy (07):** CLAUDE.md under 150 lines. Skills, agent files, path rules defined. All version-controlled.

**Part 3 — Enforcement**

- [ ] **Deterministic Enforcement (08):** Every constraint classified Hook / Instruction / Guidance. Critical safety as hooks. Self-healing loops.
- [ ] **Decision Authority (09):** Four tiers with concrete examples. Calibrated to project maturity.
- [ ] **Configuration Security (10):** Security audit checklist completed. MCP servers audited and pinned. CODEOWNERS set.

**Part 4 — Fleet**

- [ ] **Fleet Composition (11):** Roster with roles, "Does NOT Do" boundaries, routing, interface contracts. 5–12 agents.
- [ ] **Tool & Capability Registry (12):** Per-agent tool registry including negative tool list and MCP servers.
- [ ] **Model Selection (13):** Every role assigned to tier with rationale. Context requirements verified.
- [ ] **Protocol Integration (14):** MCP servers registered and pinned. A2A configured if needed.

**Part 5 — Execution**

- [ ] **Work Decomposition (15):** Chunks with entry/exit states, budgets, quality gates. Spec-first pipeline if applicable.
- [ ] **Parallel Execution (16):** Parallelization criteria. Coordination patterns. Divergence detection.
- [ ] **Swarm Patterns (17):** Confirmed hierarchical fleet sufficient, or swarm topology defined.

**Part 6 — Quality**

- [ ] **Quality Assurance (18):** Verification levels per task type. Self-healing loops operational. QA template ready.
- [ ] **Failure Recovery (19):** Recovery ladder documented. Max retries set. Escalation template ready.
- [ ] **Failure Modes (20):** Configuration reviewed against catalog. Mitigations in place.

**Part 7 — Operations**

- [ ] **Institutional Memory (21):** Persistence pattern selected. Decision log location established. Checkpoint template ready.
- [ ] **Adaptation Protocol (22):** Change tiers defined. Cascade map understood. Pause Protocol documented.
- [ ] **Cost Management (23):** Per-session and per-phase budgets. Cost tracking in place. LLM-Last implemented.
- [ ] **Fleet Health Metrics (24):** Metrics selected. Collection rhythm defined.
- [ ] **Fleet Scaling (25):** Lifecycle phase identified. Scaling signals understood. Size upper bound set.
- [ ] **Inter-Fleet Governance (26):** Knowledge boundaries set. Sharing protocol defined. Review cadence scheduled.

**Part 8 — The Admiral**

- [ ] **Admiral Self-Calibration (27):** Bottleneck signals known. Trust log initialized. Growth stage assessed.
- [ ] **Human-Expert Routing (28):** Expert Roster defined. Routing triggers documented. Consultation template ready.

-----

## B — Quick-Start Sequence

Operational order for standing up a new fleet. This minimizes rework — not the document order.

1. **Mission (01)** — What you are building. What success looks like.
2. **Ground Truth (05)** — Tech stack, tools, access, vocabulary.
3. **Boundaries (02)** — What you are NOT building. Resource budgets.
4. **Success Criteria (03)** — Machine-verifiable definition of "done."
5. **Deterministic Enforcement (08)** — Classify constraints. Implement hooks.
6. **Configuration File Strategy (07)** — CLAUDE.md (<150 lines), skills, agent files.
7. **Configuration Security (10)** — Audit configs. Pin MCP servers. Set CODEOWNERS.
8. **Fleet Composition (11)** — Agents, roles, routing, interface contracts.
9. **Decision Authority (09)** — Four authority tiers for this project's risk profile.
10. **Tool & Capability Registry (12)** — Available and unavailable tools per agent.
11. **Model Selection (13)** — Assign each role to a tier. Verify context fit.
12. **Protocol Integration (14)** — Register MCP servers. Configure A2A if needed.
13. **Context Engineering (04)** — Write system prompts. Run probes.
14. **Context Window Strategy (06)** — Profiles, loading order, progressive disclosure.
15. **Work Decomposition (15)** — Break first phase into chunks.
16. **Cost Management (23)** — Monetary budgets. Cost tracking.
17. **Remaining sections** — QA (18), Recovery (19), Failure Modes (20), Memory (21), Adaptation (22), Metrics (24), Scaling (25), Governance (26), Admiral (27), Expert Routing (28).

-----

## C — Worked Example: SaaS Task Manager

A concrete application for a mid-complexity greenfield project.

### Mission (01)

> This project is a collaborative task management application for small teams (5–20 members).
>
> It is successful when a team can create projects, assign tasks, track progress through customizable workflows, and receive notifications — all within sub-200ms UI response time.
>
> Built for small-team leads and individual contributors who need lightweight project tracking without enterprise overhead.
>
> Current phase: greenfield. Pipeline entry: Fleet takes over at Task Decomposition.

### Boundaries (02)

> NON-GOALS: No Gantt charts. No resource allocation. No time tracking. No mobile app. No SSO (email/password only for v1).
>
> CONSTRAINTS: Next.js 15, TypeScript 5.7, PostgreSQL 16, Tailwind 4.0. Ship MVP in 6 weeks. WCAG 2.1 AA.
>
> BUDGETS: 50K tokens per task. 30 minutes per task. Agents modify only `src/` and `prisma/`.
>
> QUALITY FLOOR: ESLint zero errors. All new code tested. Lighthouse accessibility 90+. No `any` types.
>
> LLM-LAST: Formatting (Prettier), linting (ESLint), type checking (tsc), import sorting handled by deterministic tools. LLM for: implementation logic, code review, design decisions.

### Success Criteria (03)

> `npm run lint` exits 0. `npm run test` exits 0, all pass. `npm run build` succeeds. `npx tsc --noEmit` exits 0. No files outside `src/` and `prisma/` modified. Lighthouse accessibility 90+.

### Enforcement (08)

> HOOKS:
>
> - PreToolUse (Write/Edit): Block modifications outside `src/` and `prisma/`.
> - PostToolUse (Write/Edit): Run `npx tsc --noEmit` and `npx eslint`. Self-healing loop.
> - PreCommit: Run `npm test`. Block commit if tests fail.
> - SessionStart: Load last checkpoint from `.claude/checkpoints/latest.md`.

### Fleet Roster (11)

> FLEET: TaskFlow
>
> ORCHESTRATOR: Claude Opus 4.6 — Tier 1. Autonomous for implementation, Propose for schema and API.
>
> SPECIALISTS:
>
> - Architect (Tier 1): System structure, API design, schema decisions. Owns `docs/architecture/`. Does NOT write implementation code.
> - Frontend Implementer (Tier 2, Sonnet): UI components, pages, client state. Owns `src/app/`, `src/components/`. Does NOT modify API or schemas.
> - Backend Implementer (Tier 2, Sonnet): API routes, business logic. Owns `src/api/`, `src/lib/server/`. Does NOT modify UI or schemas.
> - Database Agent (Tier 2, Sonnet): Schema, migrations, queries. Owns `prisma/`. Does NOT modify application code.
> - QA Agent (Tier 2, Sonnet): Reviews all output. Read-only access. Does NOT fix issues directly.
>
> ROUTING: Database → Database Agent. UI → Frontend Implementer. API → Backend Implementer. Cross-cutting → Architect decomposes. All completed work → QA before acceptance.

### Decision Authority (09)

> ENFORCED (hooks): File scope boundaries, test execution, type checking, linting.
>
> AUTONOMOUS: Component naming, file structure within owned dirs, test implementation, CSS, internal refactors.
>
> PROPOSE: New tables, new endpoints, new dependencies, architecture patterns (first use), auth flow.
>
> ESCALATE: Scope additions, budget overruns >120%, security concerns, tech stack deviation.

### First Task Decomposition (15)

> GOAL: Core task board — create, view, move tasks across workflow columns.
>
> CHUNKS:
>
> 1. **Schema** — Entry: Mission + Boundaries — Exit: Prisma schema with Task, Project, Column; migration clean — Budget: 20K tokens — Owner: Database Agent — Gates: `npx prisma migrate dev` succeeds
> 2. **API layer** — Entry: Schema approved — Exit: CRUD endpoints, integration tests pass — Budget: 30K tokens — Owner: Backend Implementer — Gates: `npm test`, tsc clean
> 3. **Board UI** — Entry: API contracts defined — Exit: Kanban board renders, drag-to-move — Budget: 40K tokens — Owner: Frontend Implementer — Gates: tsc, lint, Lighthouse 90+
> 4. **QA pass** — Entry: Board UI complete — Exit: All Blocker/Major resolved — Budget: 15K tokens — Owner: QA → Frontend Implementer for fixes
>
> SEQUENCE: 1 → 2 → 3 → 4. Chunks 2 and 3 staggered via Contract-First Parallelism once API contracts are defined.

-----

*The Fleet Admiral Framework · v3.1*

*Context is the currency of autonomous AI. Enforcement is how you protect it.*
