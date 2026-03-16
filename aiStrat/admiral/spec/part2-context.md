# PART 2 — CONTEXT

*How does the right information reach the right agent at the right time?*

*Context is the currency of autonomous AI. These four sections are the framework's center of gravity. Most fleet performance problems that look like capability failures are actually context management failures — the wrong information loaded at the wrong time, or the right information missing entirely. Master these four sections and half the failure modes in Failure Mode Catalog (Part 7) become impossible.*

> **Control Plane surface:** Context utilization metrics — how much of each agent's context window is consumed, by what, and whether refresh triggers have fired — are visible in the Control Plane's Agent Detail View (CP2+).

-----

## Context Engineering

> **TL;DR** — Not just writing prompts — designing information flows across the entire fleet. What information exists where, when, and why. The discipline that subsumes prompt engineering.

Context engineering is the discipline of designing information flows across an entire agent system — not just crafting individual prompts, but architecting how the right information reaches the right agent at the right time in the right format.

Context engineering is the *mechanism*. Intent engineering is the *purpose*. Context engineering answers "what information exists where, when, and why." Intent engineering answers "what matters, what must not happen, and when must the human decide." You need both: intent without context produces agents that understand the goal but lack the information to achieve it; context without intent produces agents that have the information but don't know what matters. See [`intent-engineering.md`](../extensions/intent-engineering.md) for the full specification of intent engineering and its six elements.

### From Prompt Engineering to Context Engineering to Intent Engineering

| Prompt Engineering | Context Engineering | Intent Engineering |
|---|---|---|
| Crafting a single prompt for a single agent | Designing information flows across a fleet | Structuring instructions around outcomes, values, constraints, and failure modes |
| Optimizing one agent's output quality | Optimizing the system's collective output | Ensuring the system makes the right decisions when plans break down |
| Focus: word choice, instruction ordering | Focus: what information exists where, when, and why | Focus: what matters, what must not happen, when must a human decide |
| Operates at the prompt level | Operates at the system level | Operates at the judgment level |

### The Five Dimensions of Context

1. **Structural context:** How information is organized — file hierarchy, configuration layering, skill triggers, hook placement. Determines what the agent can access. *Why it matters:* An agent cannot act on information it cannot find. Structural context determines the ceiling of what the agent can reason about.

2. **Temporal context:** When information is loaded — at session start, on match, on request, at refresh points. Loading order affects primacy/recency weighting and attention distribution. *Why it matters:* Information loaded in the first **5–10% of the context window** (~10K–20K tokens in a 200K window) frames all subsequent reasoning. Constraints must arrive before tasks, or the agent reasons about the task unconstrained and retrofits boundaries later — by which point it has already committed to an approach that may violate them.

3. **Relational context:** How pieces of information relate to each other — dependency graphs, cascade maps, interface contracts. An agent that knows its task but not the contract with the adjacent agent produces incompatible output. *Why it matters:* Isolated facts without relationships produce locally correct but globally incoherent work.

4. **Authority context:** What weight each piece of information carries — enforced constraints vs. firm guidance vs. soft preferences. An agent that treats all instructions as equal will violate critical constraints when they compete with suggestions for attention. *Why it matters:* Without authority differentiation, the agent has no way to resolve conflicts between instructions. It will default to whichever instruction is most recent or most specific, which may not be the most important.

5. **Absence context:** What the agent explicitly does not know and must not assume. Negative tool lists, non-goals, and "does not have access to" declarations. Without absence context, agents fill gaps with hallucinated capabilities. *Why it matters:* Agents are trained to be helpful. Helpfulness without absence context produces confident fabrication — the agent invents plausible capabilities rather than admitting a gap.

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

## Ground Truth

> **TL;DR** — The single source of reality: what words mean, what the stack is, what tools exist, what's broken. Without it, agents hallucinate capabilities and misinterpret terms.

The Ground Truth document contains everything an agent needs to know about the world it operates in. Without it, agents will hallucinate tool availability, misinterpret domain terms, and make decisions based on stale assumptions.

Load it into every agent's context at the start of every session. Maintain and update it at the start of every major work phase.

### Domain Ontology

- **Domain glossary:** Project-specific terms and their precise definitions. Include terms that carry specific meaning here.
- **Naming conventions:** File, branch, variable, and component naming. Exhaustively specific.
- **Status definitions:** What "in progress," "blocked," "ready for review," and "done" mean concretely.
- **Architecture vocabulary:** What constitutes a "service," "layer," "module," or "feature" in this project.

### Environmental Facts

- **Tech stack and exact versions:** Not "React" but "React 19.1 with TypeScript 5.7, Vite 6.2, Tailwind 4.0." Reject vague version strings: `latest`, `stable`, `current`, `newest`, `recent`, and `lts` are all invalid. Vague versions cause phantom capability assumptions — an agent that believes it has "latest React" may assume features that do not exist in the actual installed version.
- **Infrastructure topology:** Where things run, how they connect, deployment targets, CI/CD details.
- **Access and permissions:** What APIs, services, files, and tools each role actually has access to. Enumerate explicitly.
- **Current known issues:** Bugs, limitations, workarounds, technical debt, "do not touch" areas and why.
- **External dependencies:** Third-party services, rate limits, SLAs, known instabilities.

### Ecosystem Intelligence as Ground Truth

The Continuous AI Landscape Monitor (`monitor/`) produces intelligence that may update Ground Truth:

- **Model capabilities change.** A new model release may alter optimal tier assignments, context window sizes, or tool support. When the Admiral approves a model release seed candidate into the Brain, review whether the tech stack versions or model references in Ground Truth need updating.
- **Agent patterns evolve.** Exemplar tools (Claude Code, Aider, Cline, etc.) change their configuration approaches. New patterns may warrant updating agent definitions, prompt anatomy, or configuration file strategy.
- **New tools emerge.** The monitor discovers fleet-relevant repos and MCP servers. These may belong in the Tool Registry (Part 4) or Ground Truth's external dependencies.

The monitor does not update Ground Truth automatically. It surfaces intelligence; the Admiral decides what enters Ground Truth and what remains Brain context.

### Configuration as Ground Truth

| Artifact | Purpose | Location | Review Cadence |
|---|---|---|---|
| `AGENTS.md` | Canonical project instructions (model-agnostic) | Repository root | Every phase |
| `CLAUDE.md` / tool-specific | Pointer to AGENTS.md + tool-specific config | Repository root | When tool config changes |
| Agent tool settings (e.g., `.claude/settings.json`) | Hooks, permissions, MCP config | Tool config directory | When enforcement changes |
| Agent definition files (e.g., `.claude/agents/*.md`) | Per-agent definitions | Tool config directory | When fleet composition changes |
| Skill files (e.g., `.claude/skills/*.md`) | On-demand knowledge | Tool config directory | When domain knowledge changes |

> **TEMPLATE: GROUND TRUTH DOCUMENT**
>
> PROJECT: [Name] | LAST UPDATED: [Date] | PHASE: [Current phase]
>
> ONTOLOGY: [Term]: [Definition]. Naming: [Convention rules]. Status: done = [conditions]; blocked = [conditions].
>
> ENVIRONMENT: Stack: [Exact versions]. Infra: [Topology]. Access: [Per-role list]. Known issues: [List]. External deps: [Service, limits, quirks].
>
> CONFIGURATION: AGENTS.md: [lines/date]. Tool pointers: [CLAUDE.md / .cursorrules / etc.]. Hooks: [count/last audit]. Skills: [count/domains]. MCP servers: [list/versions].

> **ANTI-PATTERN: PHANTOM CAPABILITIES** — Agents will confidently assume tools and access they do not have. An orchestrator might delegate a task assuming the specialist can query a database directly, when it can only read files. The specialist produces plausible-looking output grounded in fabricated data.

> **ANTI-PATTERN: AGENT-GENERATED GROUND TRUTH** — Deploying an agent to "discover" or "extract" Ground Truth from a codebase it has never seen. The agent produces well-structured, confident output — dependency graphs, convention lists, architecture summaries. The Admiral trusts the output because it looks professional. But the agent cannot distinguish convention from accident, intentional coupling from technical debt, or working workarounds from bugs. Code shows *what* was done, not *why*. The *why* — the intent behind decisions — is what Ground Truth must capture, and it lives in human memory, meeting notes, and design documents, not in code patterns. An agent can assist with mechanical facts (framework versions via `package.json`, dependency lists via `npm ls`, test coverage via CI output), but the judgment calls that make Ground Truth useful — "this is intentional," "this is technical debt," "don't touch this because..." — require human knowledge. See Project Readiness Assessment (Part 1) and Convention Inference / Archaeology Hallucination (failure modes #21-22, Part 7).

-----

## Context Window Strategy

> **TL;DR** — The context window is working memory. Load identity first (primacy), task last (recency), reference in the middle. Never exceed 150 lines of standing instructions.

Everything an agent can know, remember, and reason about must fit within the context window.

### Context Budget Allocation

| Zone | What It Contains | Typical Allocation | Priority |
|---|---|---|---|
| Standing Context | Mission, Boundaries, role definition, Ground Truth essentials | 15–25% | Loaded first, never sacrificed |
| Session Context | Last checkpoint, current task spec, interface contracts, relevant code | 50–65% | Loaded at session start, refreshed at chunk boundaries |
| Working Context | Active reasoning, tool outputs, intermediate results | 20–30% | Generated during execution, compressed as session grows |

### Context Window Scaling

The budget percentages above are reference points calibrated for 200K-token context windows. As models offer larger windows, apply these scaling principles:

- **Percentages are soft guides, not hard rules.** At 2M tokens, 15% standing context is 300K tokens — far more than any agent needs. Apply absolute ceilings: standing context must not exceed **50K tokens** (hard limit) regardless of window size. Issue a warning at **45K tokens** to trigger an audit of the context loading strategy.
- **Larger windows do not eliminate context engineering.** Attention quality degrades in longer contexts even when capacity permits. The primacy/recency loading principles remain important at any window size.
- **Larger windows enable richer task context, not bloated standing context.** The primary benefit of larger windows is carrying more project artifacts (full files, test suites, design docs) in the working context, not expanding the instruction payload.
- **Revisit the 40% chunk sizing rule** in Work Decomposition (Part 6) when windows grow significantly. Larger windows may permit larger chunks, but the principle — leave headroom for reasoning — still applies. Scale the absolute chunk size, not the percentage.

### Loading Order Protocol

1. **Load identity and constraints first.** Role definition, Decision Authority tier, Boundaries, Mission. Primacy ensures they function as foundational assumptions that frame all subsequent reasoning.
2. **Load reference material in the middle.** Ground Truth details, historical decisions, naming conventions. Available for reference without dominating reasoning.
3. **Load the current task last.** Task specification, acceptance criteria, relevant code. Recency ensures active reasoning is oriented toward immediate work.

**Resolving primacy vs. recency tension:** These effects complement, not compete. Primacy establishes the *frame* (who am I, what are my constraints). Recency directs the *focus* (what am I doing right now). If a task instruction appears to conflict with a constraint loaded at the top, **the constraint wins** — constraints are hard boundaries, tasks are requests within those boundaries. When in doubt, the agent must treat earlier-loaded constraints as having higher authority than later-loaded task details.

### Progressive Disclosure

- **Always loaded:** Mission (1-2 sentences), role identity, authority tier, critical constraints. Under 150 lines total. *These load first because they are the agent's intent foundation — who it is, what matters, and what lines must not be crossed. Every subsequent decision is framed by this context.*
- **Loaded on match:** Skills triggered by file patterns, task keywords, or domain context.
- **Loaded on request:** Full architectural history, cross-system diagrams, comprehensive reference.
- **Never loaded:** Other agents' internal context, other projects' artifacts, historical sessions older than the last checkpoint.

### Context Source Routing

Not all missing context should be solved the same way. Before an agent acts on incomplete information, it must determine **where** to look — not just **whether** something is missing. Follow this chain in order:

**Step 1 — Check loaded context.** The answer may already be in standing, session, or working context. Search before querying external sources. Use loaded context when:
- The information concerns current task artifacts (code, specs, configs already in view)
- The question is about the agent's own scope, authority, or constraints
- The data was loaded at session start or during a recent context refresh

**Step 2 — Query the Brain.** If loaded context is insufficient, call `brain_query` before proceeding. Query the Brain when:
- Making a **Propose-tier or Escalate-tier** decision (mandatory — see Part 5 anti-pattern: Brain Bypass)
- The task involves **precedent** — "has this been decided before?" or "what happened last time?"
- The agent needs **cross-project or cross-session** knowledge
- Confidence is below 80% and the missing information is **durable knowledge** (decisions, patterns, lessons), not ephemeral state
- Before creating a new pattern or convention that may already exist as a recorded lesson

**Step 3 — Escalate to human.** If neither loaded context nor the Brain resolves the gap:
- The information requires **business or product judgment** not captured in any store
- The question involves **access or authorization** the agent cannot self-resolve
- Flag the gap per SO-04 (Context Honesty) and SO-06 (Recovery Protocol)

> **Do not skip steps.** Jumping to Step 3 without checking the Brain wastes human attention. Jumping to Step 2 without checking loaded context wastes retrieval budget and adds latency. The chain is sequential for a reason.

> **ANTI-PATTERN: CONTEXT SOURCE CONFUSION** — An agent queries the Brain for information already present in its standing context, or escalates to a human for a question the Brain could answer. Both waste resources and signal poor context awareness. The routing chain above prevents this by enforcing lookup order. **Defense:** Standing Order 11 (Context Discovery) includes the routing chain as a required protocol.

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

> **ANTI-PATTERN: CONTEXT STUFFING** — Loading every artifact "just in case." Standing context consumes 60% of the window. Output becomes shallow and unfocused. More context is not better context. Curate ruthlessly. **Defense:** Standing Order 11 (Context Discovery) — agents must verify context source and relevance before loading.

-----

## Configuration File Strategy

> **TL;DR** — AGENTS.md under 150 lines. Move enforcement to hooks, reference material to skills, per-agent rules to agent files. Version all config files like code. Use AGENTS.md as the canonical source of truth; tool-specific files (CLAUDE.md, .cursorrules) should be thin pointers.

Configuration files are how the fleet receives its instructions. They are as important as source code — version them, review them, test them.

### AGENTS.md as Canonical Source

**AGENTS.md** is the model-agnostic instruction file standard, stewarded by the Agentic AI Foundation under the Linux Foundation. As of early 2026, it is supported by 20+ tools including Codex, Cursor, Copilot, Gemini CLI, Windsurf, Aider, Zed, Warp, Jules, Devin, and others.

**The recommended pattern:**

| File | Role | Who reads it |
|---|---|---|
| `AGENTS.md` | Canonical project instructions | Most AI coding tools natively |
| `CLAUDE.md` | Pointer to AGENTS.md + Claude Code-specific config | Claude Code |
| `.cursorrules` | Pointer to AGENTS.md + Cursor-specific config (if needed) | Cursor |
| Tool-specific files | Thin pointers with tool-only overrides | Their respective tools |

Tools that do not yet natively read AGENTS.md (e.g., Claude Code as of March 2026) use their tool-specific file as a pointer: `CLAUDE.md` opens with "Read AGENTS.md for full project instructions" and adds only tool-specific configuration (hook references, directory conventions, permissions). When the tool adds native support, the pointer file reduces to overrides only.

**Alternative for simple setups:** Symlink (`ln -s AGENTS.md CLAUDE.md`) works when no tool-specific configuration is needed.

### The Configuration Hierarchy

Configuration flows from broad to narrow, with narrower scopes overriding broader ones.

| Scope | Example (Claude Code) | Purpose |
|---|---|---|
| **Personal** | `~/.claude/settings.json` | User-level defaults, model preferences |
| **Organization** | Organization-level config | Shared standards across all repos |
| **Repository** | `AGENTS.md`, `CLAUDE.md`, `.cursorrules` | Project-specific instructions |
| **Path-specific** | `.claude/rules/*.md` | Rules that apply only to certain directories |
| **Role-specific** | `.claude/agents/*.md`, `.agent.md` | Per-agent identity, authority, constraints |
| **On-demand** | `.claude/skills/*.md` | Knowledge loaded only when context matches |
| **Enforcement** | `.claude/settings.json` (hooks), CI configs | Deterministic constraints |

Path-specific, role-specific, on-demand, and enforcement scopes are tool-dependent. The examples above use Claude Code conventions. Other tools provide equivalent mechanisms (e.g., Cursor uses `.cursor/rules/` for path-scoped rules).

### The 150-Line Rule

AGENTS.md should not exceed 150 lines. For each line, ask "Would removing this cause mistakes?" If not, remove it. In our experience, over-detailed instruction files hinder agent performance. Human-written, minimal instructions targeting non-inferable details show the best results.

**How to stay under 150 lines:**

- Move stable reference material to skills (on-demand, not at startup).
- Move enforcement constraints to hooks (deterministic, not occupying context).
- Move per-agent instructions to agent-specific files (each agent loads only its own).
- Move path-specific rules to path-scoped files (loaded only when working in that directory).
- What remains in AGENTS.md: project identity, tech stack, critical conventions, workflow essentials.
- **Standing Orders (Part 11) must be referenced or loaded from AGENTS.md.** Standing Orders are Starter-profile requirements (P1) — they define what hooks enforce. Load them before hooks, before infrastructure code. See the co-requirement note in Deterministic Enforcement (Part 3).

> **Creation order for new projects:** (1) Create AGENTS.md with project identity, tech stack, critical conventions. (2) Create tool-specific pointers (CLAUDE.md, .cursorrules). (3) Add skills as domain knowledge accumulates. (4) Add path-specific rules when directory-scoped conventions emerge. The first two are Starter-profile requirements. Skills and path rules are F2+.

> **ANTI-PATTERN: BUILDING THE TOOLBOX WITHOUT THE TOOLBOX** — When your project is itself a framework implementation, the temptation is to build the configuration infrastructure (hooks, skills, agent definitions) before creating the configuration files (AGENTS.md, Standing Orders). This inverts the dependency: the configuration files should govern how the infrastructure is built, not the other way around. Create AGENTS.md first, even if it's minimal. Iterate on it as the infrastructure matures.

### Cross-Tool Portability

The best AGENTS.md files share six characteristics (based on common patterns observed in open-source AGENTS.md files):

1. **Clear persona** — who the agent is and what it's responsible for.
2. **Executable commands** — exact shell commands, not descriptions.
3. **Concrete code examples** — show the pattern, don't describe it.
4. **Explicit boundaries** — what the agent does NOT do.
5. **Tech stack specifics** — exact versions and configurations.
6. **Coverage across six areas** — commands, testing, project structure, code style, git workflow, boundaries.

Sync tools exist for teams managing multiple configuration files from one source: Ruler (`@intellectronica/ruler`) distributes from a `.ruler/` directory to 30+ agent config formats; rule-porter converts bidirectionally between formats. For simple projects, the pointer pattern (tool-specific files reference AGENTS.md) is sufficient.

### Progressive Disclosure via Skills

```
# Example: Claude Code skill file
# .claude/skills/database-patterns.md
---
match: "prisma/**" OR "database" OR "migration" OR "schema"
---

Database conventions for this project:
- Use Prisma with PostgreSQL 16
- Migrations must be reversible
- [Specific patterns...]
```

The agent receives database knowledge only when working on database tasks. For all other tasks, that context is not loaded, preserving working memory. Other tools implement equivalent progressive disclosure mechanisms (e.g., Cursor rules with glob patterns).

> **TEMPLATE: CONFIGURATION AUDIT**
>
> AGENTS.md: [X] lines (target: <150). Last reviewed: [date]. Tool pointers: [CLAUDE.md / .cursorrules / etc.].
>
> Skills: [N] skill files covering [domains]. Hooks: [N] hooks covering [categories].
>
> Agent files: [N] agent definitions. Path rules: [N] path-specific rule files.

> **ANTI-PATTERN: CONFIGURATION ACCRETION** — After every incident, a new line is added to AGENTS.md. The file grows from 80 to 400 lines over three months. Instruction-following degrades with each addition. Treat config files like code: refactor regularly. When a constraint is critical enough to add, ask whether it should be a hook instead.

-----

