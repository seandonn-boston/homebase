# Team Coordination Workflows: From Whiteboard to Fleet

**Date:** March 16, 2026
**Type:** Strategic analysis — adoption pathways by team coordination pattern
**Status:** Draft

---

## The Question

Admiral was designed to be deployable on anything. But "anything" spans an enormous range: two founders with a whiteboard, a 12-person startup running GitHub and Slack, a 50-person engineering org with Jira, Confluence, PagerDuty, and four-week sprint cycles. Each coordinates differently. Each needs Admiral to be immediately useful — not after months of configuration, but from day one.

How do we map the coordination patterns that actually exist in the wild to Admiral's progressive adoption model, so that every team — regardless of size, tooling, or process maturity — can start using Admiral meaningfully and grow toward the end state: a well-documented, well-governed fleet doing the work of those developers with minimal human-in-the-loop intervention?

---

## The Coordination Landscape

### How Teams Actually Coordinate

Every team, regardless of size, must solve five coordination problems:

| Problem | What It Answers | Examples |
|---|---|---|
| **Work tracking** | What needs to be done? Who's doing it? What's blocked? | Jira, Linear, GitHub Issues, Notion boards, sticky notes, whiteboard |
| **Communication** | How do we talk to each other in real time and async? | Slack, Teams, Discord, email, standup meetings, hallway conversations |
| **Knowledge management** | Where do we write things down? How do we find them later? | Confluence, Notion, Google Docs, README files, tribal knowledge |
| **Code coordination** | How do we work on the same codebase without stepping on each other? | GitHub, GitLab, Bitbucket, PR reviews, branch strategies |
| **Process governance** | How do we ensure quality, security, and consistency? | CI/CD, linters, code review policies, deployment approvals, SOC2 |

The tools differ. The problems do not. Admiral maps to these five problems, not to specific tools.

---

## Team Archetypes and Their Coordination Patterns

### Archetype 1: The Solo Builder (1 person)

**Coordination reality:**
- Work tracking: mental model, maybe a TODO.md or personal Notion
- Communication: none (internal monologue)
- Knowledge: in their head, scattered notes
- Code: single branch, push to main, maybe PRs for discipline
- Process: whatever they remember to do

**Pain points Admiral solves immediately:**
- Context loss between sessions (they forget what they decided yesterday)
- No quality enforcement (no one reviews their code)
- Budget blindness (no idea how much they're spending on AI)
- Scope creep (they over-build because no one says "that's enough")

**Admiral entry point: Starter profile (B1 F1 E1 CP1 S1 P1 DE1)**

| Admiral Component | Maps To | Replaces |
|---|---|---|
| Standing Orders | The discipline they wish they had | Self-discipline |
| CP1 (CLI dashboard) | "What is my agent doing right now?" | Watching terminal scroll |
| E1 (3 hooks) | Budget gate, loop detection, context health | Nothing (these didn't exist) |
| Brain B1 | Persistent decisions across sessions | Their memory |

**Day-one value:** One governed agent that remembers what it did yesterday, stops when it loops, and warns when it's burning budget. No new tools required. Lives in the terminal they already work in.

**Growth path:** Solo → Starter → Team (when they add a second agent or collaborator)

---

### Archetype 2: The Duo/Trio (2-3 people)

**Coordination reality:**
- Work tracking: whiteboard, shared Notion/Google Doc, GitHub Issues
- Communication: constant (they sit together or live in a shared chat)
- Knowledge: conversations, shared docs, "ask the other person"
- Code: GitHub with informal PR reviews, maybe trunk-based
- Process: implicit, trust-based — "we both know the standards"

**Pain points Admiral solves immediately:**
- The "I thought you were handling that" problem — no clear task ownership
- Knowledge that lives in one person's head and dies when they're unavailable
- Inconsistent quality when one person reviews the other's AI output vs. their own
- No shared understanding of what the AI agents decided or why

**Admiral entry point: Starter profile, advancing quickly to Team**

| Admiral Component | Maps To | Replaces |
|---|---|---|
| Brain B1→B2 | Shared memory that both can query | "Hey, why did we decide X?" conversations |
| F1→F2 | Coordinated specialists | Both running generic agents independently |
| CP1→CP2 | Fleet status visible to both | "What's your agent doing?" Slack messages |
| Standing Orders | Shared standards without arguing | Implicit norms that drift |

**Day-one value:** Both people can see what the fleet is doing. Decisions are recorded. When person A is offline, person B (or the fleet) can continue without losing context.

**Integration approach:**
- GitHub: already there — Admiral hooks into PRs and issues naturally
- Communication: lightweight — they talk anyway, Admiral reduces the need by making agent state visible
- No heavy tooling required

---

### Archetype 3: The Small Team (4-10 people)

**Coordination reality:**
- Work tracking: GitHub Issues or Linear, maybe a lightweight Jira setup
- Communication: Slack/Discord with channels, daily standups
- Knowledge: Notion or Confluence (probably messy), some wiki pages
- Code: GitHub with required PR reviews, branch protection
- Process: emerging — some CI/CD, some linting, code review norms forming

**Pain points Admiral solves:**
- Coordination overhead scaling faster than headcount
- Knowledge silos forming ("only Alice knows the payment system")
- PR review bottleneck — humans reviewing AI-generated code slowly
- Inconsistent agent behavior across team members' sessions
- No shared view of what the AI fleet is doing across the team

**Admiral entry point: Team profile (B2 F2 E1 CP2 S1 P2 DE2)**

| Admiral Component | Maps To | Replaces |
|---|---|---|
| F2 (Orchestrator + specialists) | Task routing that was previously manual | "Who should work on this?" standups |
| CP2 (Fleet Dashboard) | Shared operational visibility | "What's everyone's agent doing?" Slack thread |
| B2 (semantic search) | Queryable team knowledge | "Search Notion" or "ask Alice" |
| P2 (structured handoffs) | Clean agent-to-agent transitions | Messy context loss between people's sessions |
| Interface contracts | Predictable agent outputs | Inconsistent AI output quality |

**Integration approach:**
- **GitHub:** PR review agents, CI failure diagnosis, issue triage — these integrate as GitHub Actions or webhooks. The team already lives in GitHub; Admiral meets them there.
- **Slack:** Alert routing for CRITICAL/HIGH events. Escalations surface in a dedicated channel. Not everything — alert fatigue prevention from day one.
- **Linear/Issues:** Agent-created issues for findings, escalations that need human judgment. Bidirectional: issues can trigger agent work.

**Day-one value:** The fleet operates as a coordinated unit visible to all team members. The Brain replaces "tribal knowledge." PR review agents reduce the human review bottleneck. Cost is tracked and visible.

---

### Archetype 4: The Mid-Size Team (10-25 people)

**Coordination reality:**
- Work tracking: Jira or Linear with defined workflows, sprints or kanban
- Communication: Slack with structured channels, some meetings are ritualized
- Knowledge: Confluence or Notion with some structure, architecture decision records
- Code: GitHub/GitLab with branch strategies, CODEOWNERS, required reviews
- Process: defined CI/CD pipelines, code review policies, maybe SOC2 or similar

**Pain points Admiral solves:**
- Cross-team coordination (frontend team vs. backend team vs. platform team)
- Process enforcement that's currently manual (review policies, deployment gates)
- Scaling agent usage without losing governance — "everyone's running agents but nobody's watching"
- Cost attribution across teams
- Institutional knowledge that fragments as teams specialize

**Admiral entry point: Governed profile (B3 F3 E2 CP3 S2 P2 DE3)**

| Admiral Component | Maps To | Replaces |
|---|---|---|
| F3 (governance agents) | Automated quality, security, consistency enforcement | Manual review bottlenecks |
| CP3 (Governance Dashboard) | Policy management and audit trail | Scattered compliance processes |
| B3 (MCP, vector search) | Cross-team institutional memory | Confluence pages nobody reads |
| E2 (tier validation, identity) | Ensuring agents operate within authorized scope | Trust-based "hope nobody misconfigures" |
| DE3 (attribution, feedback loops) | Understanding which agent decisions produce good outcomes | Gut feel about "is AI helping?" |

**Integration approach:**
- **Jira/Linear:** Bidirectional sync. Agent work items created from Jira tickets. Agent completion updates Jira status. Escalations create Jira issues with full context.
- **Confluence/Notion:** Brain entries surface alongside existing documentation. Eventually, the Brain becomes the source of truth and docs are generated from it.
- **Slack:** Structured alert channels per team. Escalation routing respects on-call rotations. Summary digests replace noisy notifications.
- **GitHub:** Full CI/CD integration — PR review, CI failure diagnosis, post-merge validation, release notes generation.
- **PagerDuty/OpsGenie:** Fleet critical alerts route through existing incident management.

**Day-one value:** Governance agents watch what humans can't scale to watch. Cross-team knowledge flows through the Brain instead of getting lost in Slack threads. Cost is attributed per team. Policy changes propagate automatically.

---

### Archetype 5: The Large Engineering Org (25-50+ people)

**Coordination reality:**
- Work tracking: Jira with complex workflows, epics, sprints, cross-team dependencies
- Communication: Slack with hundreds of channels, Teams for external, structured meetings (sprint planning, retros, architecture reviews)
- Knowledge: Confluence with spaces per team, architecture decision records, runbooks, postmortems
- Code: GitHub/GitLab with enterprise features, CODEOWNERS, merge queues, environment management
- Process: mature CI/CD, security scanning, compliance requirements, deployment approval chains, SLAs

**Pain points Admiral solves:**
- The "50 engineers running AI agents independently with no coordination" problem
- Compliance and audit requirements for AI-generated code
- Cross-fleet coordination (multiple products, multiple teams, shared infrastructure)
- Budget management across organizational boundaries
- Institutional knowledge that's trapped in team silos
- The human bottleneck on oversight — not enough senior engineers to review everything

**Admiral entry point: Production or Enterprise profile**

| Admiral Component | Maps To | Replaces |
|---|---|---|
| CP4-CP5 (Operations/Federation) | Unified view across all teams' fleets | Fragmented team-level monitoring |
| Multi-Operator Governance | Role-based fleet access matching org structure | Ad-hoc access control |
| Cross-Fleet Brain Federation | Organization-wide institutional memory | Team-siloed knowledge |
| E3 (cross-fleet coordination) | Consistent policy enforcement org-wide | Per-team policy drift |
| DE4-DE5 (full data ecosystem) | Data-driven fleet optimization | Manual tuning |

**Integration approach:**
- **Jira:** Deep integration. Epic-level work decomposition maps to fleet task decomposition. Sprint velocity includes fleet throughput. Cross-team dependencies visible in Admiral and Jira simultaneously.
- **Confluence:** Admiral-generated documentation lives alongside human-written docs. Brain entries are the system of record; Confluence pages are the human-readable view.
- **Slack:** Structured integration — escalation channels, fleet status channels, digest channels. Integration with Slack workflows for approval chains.
- **GitHub Enterprise:** Organization-wide hooks, cross-repo fleet operations, merge queue integration, security scanning integration.
- **PagerDuty:** Fleet incidents route through the same incident management as production incidents.
- **Datadog/Grafana:** Fleet metrics exported to the same observability platform as production metrics.
- **SSO/RBAC:** Admiral's multi-operator governance maps to the org's identity provider.

---

## The Integration Architecture

### Principle: Meet Teams Where They Are

Admiral does not replace existing tools. It integrates with them. The integration follows a consistent pattern:

```
Existing Tool ←→ Admiral Integration Layer ←→ Admiral Core
     |                    |                        |
  (GitHub)        (webhooks, APIs,           (Brain, Fleet,
  (Jira)          MCP servers,              Enforcement,
  (Slack)         event bridges)            Control Plane)
  (Confluence)
```

### Integration Tiers

| Tier | What It Means | Examples |
|---|---|---|
| **Native** | Admiral has first-class support; works out of the box | GitHub (PRs, Issues, Actions), Git (hooks, branches) |
| **Supported** | Official integration exists; minimal configuration | Slack (alerts, escalations), Linear (work tracking) |
| **Bridged** | Integration via standard protocols (webhooks, APIs) | Jira, Confluence, PagerDuty, Datadog |
| **Custom** | Team builds integration using Admiral's event system | Internal tools, proprietary systems |

### The MCP Integration Pattern

MCP (Model Context Protocol) is the universal integration protocol. Each external tool becomes an MCP server that agents can access:

| MCP Server | What Agents Can Do | Team Size |
|---|---|---|
| `mcp-github` | Read/write PRs, issues, code, CI status | All |
| `mcp-slack` | Read channels, post messages, thread replies | 4+ |
| `mcp-jira` | Read/write tickets, update status, query backlogs | 10+ |
| `mcp-confluence` | Read/write pages, search knowledge base | 10+ |
| `mcp-linear` | Read/write issues, update project status | 4+ |
| `mcp-pagerduty` | Create incidents, acknowledge, resolve | 25+ |

MCP servers are added as the team's tool usage requires them. A solo builder doesn't need `mcp-jira`. A 50-person org doesn't need to configure `mcp-github` — it's already native.

---

## The Progression Path

### From Day One to Full Autonomy

The critical design insight: **every team starts by solving the same three problems**, regardless of size:

1. **"What is my agent doing?"** → CP1 (structured event logging, terminal status)
2. **"How do I stop it if it goes wrong?"** → E1 (loop detection, budget gate)
3. **"What did it decide and why?"** → Brain B1 (persistent memory)

These three capabilities are valuable for a solo founder and for a 50-person org. The difference is scale, not kind.

### The Growth Triggers

Teams advance Admiral profiles when they hit specific friction points — not on a schedule, not because a doc told them to:

| Friction Point | Signal | Admiral Response |
|---|---|---|
| "My agent forgot what it did yesterday" | Repeated context-setting, duplicated work | Brain B1 → B2 (semantic search) |
| "I need specialized agents for different tasks" | One agent doing everything poorly | F1 → F2 (Orchestrator + specialists) |
| "We can't all see what the fleet is doing" | Team members asking each other about agent state | CP1 → CP2 (Fleet Dashboard) |
| "Quality is inconsistent" | Some agent outputs great, others terrible | F2 → F3 (governance agents) |
| "We're spending too much and don't know where" | Budget surprises, no cost attribution | CP2 → CP3 → CP4 (cost tracking, forecasting) |
| "Teams are stepping on each other" | Cross-team conflicts, duplicate agent work | CP4 → CP5 (Federation) |
| "We need an audit trail for compliance" | Regulatory or organizational requirements | CP3 (audit trail, policy management) |
| "Our institutional knowledge keeps evaporating" | New team members can't find prior decisions | Brain B2 → B3 (full vector search, MCP) |

### The End State for Each Archetype

| Archetype | Realistic End State | Autonomy Stage | Human Role |
|---|---|---|---|
| Solo Builder | Stage 3-4: Fleet handles implementation, human handles strategy | Partial → Full Autonomy | Architect and product visionary |
| Duo/Trio | Stage 3: Fleet operates independently, humans govern and strategize | Partial Autonomy | Strategy, architecture, customer contact |
| Small Team (4-10) | Stage 3: Most operations autonomous, humans handle exceptions and strategy | Partial Autonomy | Product direction, complex architecture, stakeholder management |
| Mid-Size (10-25) | Stage 2-3: Routine work autonomous, complex work human-guided | Assisted → Partial | Strategy, cross-team coordination, governance tuning |
| Large Org (25-50+) | Stage 2-3: Per-capability autonomy (docs at Stage 4, security at Stage 2) | Mixed per capability | Organizational strategy, policy, compliance, high-judgment calls |

Note: larger organizations advance more slowly per-capability because the blast radius of autonomous failures is higher, compliance requirements are stricter, and organizational trust takes longer to build. This is correct behavior, not a limitation.

---

## What "Minimal Human-in-the-Loop" Actually Means

The end goal is not "no humans." It is: **humans only intervene when their judgment adds value that the fleet cannot provide.**

### Where Human Judgment Is Irreplaceable

| Domain | Why Humans Are Needed | Admiral's Role |
|---|---|---|
| **Strategy** | "What should we build next?" requires market understanding, customer empathy, vision | Admiral presents data (cost trends, quality metrics, fleet capacity); humans decide direction |
| **Ethics and values** | Tradeoff decisions with moral dimensions | Admiral flags the decision and escalates; humans choose |
| **Novel architecture** | Truly unprecedented design decisions with long-term consequences | Admiral provides Brain context (precedent, constraints); humans design |
| **Stakeholder communication** | Customer-facing decisions, partnership negotiations | Admiral drafts; humans review and deliver |
| **Security judgment** | Novel threat assessment, incident response strategy | Admiral detects and triages; humans decide response |
| **Taste and aesthetics** | Design quality, user experience polish, brand voice | Admiral implements; humans evaluate |

### Where Human Judgment Is Wasted

| Domain | Why the Fleet Should Handle It | Current State |
|---|---|---|
| **Routine code review** | Deterministic quality gates + governance agents catch what linters miss | Humans reviewing formatting and obvious bugs |
| **Test writing** | Self-validating output — tests pass or fail | Humans writing tests for straightforward code |
| **Documentation updates** | Mechanical, verifiable, low-risk | Humans manually updating docs |
| **Dependency updates** | Automated security scanning + quarantine | Humans reviewing Dependabot PRs |
| **Bug triage** | Pattern matching against known failure modes | Humans reading every bug report |
| **Deployment for known-good changes** | CI/CD + automated validation | Humans clicking "approve" on routine deploys |

The progression from "humans do everything" to "humans do only what matters" is the Progressive Autonomy Framework in action. It doesn't happen on day one. It happens over weeks and months as the fleet earns trust per-category through demonstrated competence.

---

## Integration Prioritization by Team Size

### What to integrate first (the "Day One Stack")

| Team Size | Day One Stack | Why These First |
|---|---|---|
| 1 | Git + terminal | They're already there |
| 2-3 | Git + GitHub + shared Brain | Shared visibility and memory |
| 4-10 | Git + GitHub + Slack (alerts only) + Brain | Team communication and fleet visibility |
| 10-25 | Git + GitHub + Slack + Jira/Linear + Brain + CI/CD | Work tracking and process integration |
| 25-50+ | All of above + Confluence + PagerDuty + Datadog + SSO | Full organizational integration |

### What NOT to integrate on day one

Regardless of team size, do **not** start with:
- Full Jira workflow automation (get basic tracking working first)
- Bidirectional Confluence sync (start with Brain, add Confluence export later)
- PagerDuty integration (start with Slack alerts, add PagerDuty when escalation patterns are clear)
- Datadog/Grafana export (start with CP1/CP2 built-in metrics, export when you need organization-wide dashboards)
- SSO/RBAC (start with simple operator identity, add SSO when multi-operator governance is needed)

The principle: **integrate what the team uses daily first, integrate what the team uses weekly second, integrate what the team uses monthly last.**

---

## The Accommodation Strategy

### How Admiral Serves All Sizes From Day One

The framework's progressive component model (B1-B3, F1-F4, E1-E3, CP1-CP5) already solves this at the architecture level. But architecture alone doesn't create adoption. The accommodation strategy is about **experience**:

| Principle | Implementation |
|---|---|
| **Zero-config start** | `admiral init` detects repo, suggests Starter profile, generates AGENTS.md + 3 hooks in < 5 minutes |
| **Immediate value** | First agent session shows: budget tracking, loop detection, persistent memory. No configuration required beyond init. |
| **Friction-triggered growth** | When the user hits a friction point (e.g., "I need a second agent"), Admiral suggests the next component: "You're running into coordination limits. Add an Orchestrator? `admiral add orchestrator`" |
| **Tool detection** | `admiral init` detects existing tools (GitHub, Slack, Jira via config files and environment) and suggests relevant integrations |
| **No mandatory integrations** | Every external tool integration is optional. Admiral works with just Git. Everything else is additive. |
| **Graduated complexity** | CP1 is a terminal view. CP2 is a web dashboard. CP3 adds governance. Each builds on the last. The solo builder never sees CP5 configuration. |

### The Onboarding Experience by Archetype

**Solo Builder (5 minutes):**
```
$ admiral init
Detected: Git repo, Node.js project, Claude Code
Suggested profile: Starter (B1 F1 E1 CP1 S1 P1 DE1)
Generated: AGENTS.md, 3 hooks (budget, loop, context)
Ready. Run your agent — Admiral is watching.
```

**Duo/Trio (30 minutes):**
```
$ admiral init --team
Detected: Git repo, GitHub remote, 2 contributors
Suggested profile: Team (B2 F2 E1 CP2 S1 P2 DE2)
Generated: AGENTS.md, hooks, Brain config, Orchestrator definition
Optional: Connect Slack for alerts? [y/n]
Ready. Both team members can see fleet status at localhost:3847
```

**Small Team (2-4 hours):**
```
$ admiral init --org
Detected: Git repo, GitHub org, Slack workspace, Linear project
Suggested profile: Team→Governed transition path
Generated: AGENTS.md, hooks, Brain config, Fleet definitions
Integrations configured: GitHub (native), Slack (alerts), Linear (work tracking)
Dashboard: https://admiral.internal/fleet
```

**Mid-Size and Large (1-2 days with dedicated setup):**
- Dedicated setup session with governance engineer
- Integration mapping workshop (which tools, which workflows)
- Phased rollout: one team first, then expand
- Custom MCP server development for proprietary tools

---

## The Convergence

Every team, regardless of starting point, converges on the same end state over time:

```
Day 1:    Human does work, AI assists occasionally
          Admiral provides: visibility, budget control, memory

Month 1:  Human directs work, AI executes routine tasks
          Admiral provides: coordination, quality enforcement, knowledge management

Month 6:  Human governs fleet, AI handles most implementation
          Admiral provides: governance, trend analysis, cost optimization

Year 1:   Human sets strategy, AI fleet operates semi-autonomously
          Admiral provides: full operational infrastructure, progressive autonomy

Year 2+:  Human provides judgment, AI fleet self-governs within policy
          Admiral provides: the operating environment — indispensable
```

The whiteboard becomes a Fleet Dashboard. The standup becomes a Morning Review. The code review becomes a QA Agent pipeline. The retrospective becomes a Fleet Evaluation Report. The org chart gains an AI workforce section.

The tools change. The coordination problems don't. Admiral solves the problems, not the tools.

---

## Where This Breaks Down

The coordination-to-Admiral mapping above tells a clean story. Reality is messier. These are the situations where the approach fails or needs significant adaptation.

### Situation 1: Greenfield Projects

A team starting from zero — no codebase, no architecture decisions, no conventions established.

**Why this is harder than it sounds:**

Admiral assumes Ground Truth exists. Mission, Boundaries, Success Criteria, tech stack, coding conventions — these are inputs to the framework, not outputs. A greenfield project hasn't made these decisions yet. The fleet can't enforce conventions that don't exist. The Brain has nothing to remember. The QA Agent has no standards to verify against.

**The trap:** Teams deploy Admiral on day one of a greenfield project and spend more time configuring governance than building the product. The framework becomes overhead before the project has enough mass to benefit from it.

**What actually works:**
- **Week 1-2:** Don't deploy Admiral. Make foundational decisions manually — tech stack, architecture, initial conventions. Write them down.
- **Week 3-4:** Deploy Starter profile once Ground Truth exists. One agent, three hooks, persistent memory. The Brain starts accumulating decisions from the first governed session.
- **Month 2+:** Advance to Team profile as the codebase grows and coordination needs emerge.

**The key insight:** Admiral governs work. Greenfield projects need to create the thing that gets governed before governance adds value. The Mission statement and Boundaries should exist before Admiral is deployed — and creating those is inherently a human activity.

**Exception:** If the greenfield project is being built *entirely* by a fleet (human provides strategy, fleet builds everything), then Admiral is needed from session one. But the human must front-load the Ground Truth: tech stack decisions, architecture decisions, coding conventions, and success criteria. The fleet cannot bootstrap its own governance context.

---

### Situation 2: Existing Projects with Active Teams

A codebase with history, conventions (written and unwritten), technical debt, and humans who know where the bodies are buried.

**Why this is different from the clean archetype model:**

The document assumes teams adopt Admiral and then the fleet starts working. But existing projects have:
- **Implicit conventions** that no one has written down. The fleet won't follow conventions it can't see.
- **Technical debt** that makes "correct" behavior ambiguous. Does the fleet follow the existing (messy) patterns or the ideal (clean) patterns? Neither answer is obviously right.
- **Existing workflows** that people are attached to. "We've always done PR reviews this way" — introducing a QA Agent into an established review culture creates friction.
- **Tribal knowledge** that exists only in people's heads. The Brain starts empty. The fleet is less knowledgeable than the junior developer who's been on the team for six months.

**What actually breaks:**
- QA Agent enforces standards the codebase doesn't follow → every PR gets flagged → alert fatigue → governance theater
- Fleet makes architecture decisions that contradict undocumented conventions → senior devs override → fleet loses trust → permanent Stage 1
- Brain has no history → fleet makes decisions that contradict prior team decisions it doesn't know about → rework

**What actually works:**
- **Ground Truth extraction sprint:** Before deploying Admiral, spend 1-2 days documenting what's currently true — not what's ideal, what's *true*. Coding conventions, architecture decisions, known tech debt, "don't touch this because" warnings.
- **Shadow mode first:** Deploy Admiral in observation-only mode. Hooks log but don't block. QA Agent reviews but doesn't gate. Let the fleet learn the codebase patterns before it starts enforcing.
- **Brain seeding:** Manually create Brain entries for the top 20 decisions the team has made. "We chose Postgres because X." "The auth system works this way because Y." "Don't refactor the payment module because Z." This front-loads institutional knowledge that would otherwise take months of sessions to accumulate.
- **Gradual authority:** Start with the fleet handling only new, well-scoped features — not refactors, not bug fixes in legacy code, not anything touching the parts of the codebase with heavy tribal knowledge.

---

### Situation 3: Legacy Projects with No Active Maintainers

This is the hardest case. A codebase that:
- Has no one who understands it well
- Has no written documentation (or documentation that's years out of date)
- Uses outdated dependencies, frameworks, or patterns
- May have no tests, no CI, no linting
- Exists because it works and no one wants to touch it

**Why Admiral's model fundamentally struggles here:**

Admiral's entire architecture assumes someone can provide Mission, Boundaries, and Success Criteria. It assumes Ground Truth exists or can be created. It assumes there are quality gates to enforce (tests, linters, type checkers). Legacy projects with no maintainers have *none of this*.

| Admiral Assumption | Legacy Reality |
|---|---|
| Mission is defined | No one knows what this project is supposed to do beyond "it runs in production" |
| Boundaries are explicit | No one knows what's safe to change |
| Ground Truth exists | The code is the only documentation, and it's contradictory |
| Quality gates work | No tests. No CI. `npm run lint` might not even run |
| Conventions are documented | The conventions are whatever the original developers did in 2019 |
| The Brain accumulates knowledge | There's no knowledge to accumulate — the starting point is total ignorance |

**What actually breaks:**
- The fleet can't determine what's intentional vs. accidental in the codebase. Is this weird pattern a bug or a workaround for a constraint that still exists?
- No tests means no safety net. The fleet can make changes that break production and have no way to detect it.
- Undocumented dependencies between components mean the fleet can't scope changes safely. Changing file A breaks file Q because of a coupling nobody documented.
- The fleet will try to "improve" legacy code that works. Scope Creep via Helpfulness (failure mode #7) is especially dangerous here — every improvement risks breaking something.

**What actually works (if anything):**

1. **Reconnaissance phase (human + fleet together):**
   - Deploy a single agent in read-only mode: map the codebase, identify dependencies, document what exists
   - Brain seeding from archaeology: "This module appears to handle X based on code analysis. Confidence: inferred."
   - Generate a codebase map before making any changes
   - This is NOT autonomous work. The human is reviewing every finding.

2. **Scaffold safety nets before touching anything:**
   - Add CI/CD if it doesn't exist
   - Add basic linting and type checking
   - Write characterization tests — tests that verify current behavior, not ideal behavior
   - These safety nets become the quality gates Admiral's hooks enforce

3. **Extremely narrow scope:**
   - Do NOT deploy a full fleet on a legacy codebase
   - One agent. One task at a time. Manual review of everything.
   - Boundaries: "You may only modify files in src/api/. You may not modify anything else."
   - Authority: everything is Propose or Escalate. Nothing is Autonomous.

4. **Accept that Stage 1 may be permanent:**
   - For some legacy codebases, full autonomy is never the right answer
   - The value is the Brain: as the fleet works on the codebase, it accumulates understanding that currently exists nowhere
   - Over months, the Brain becomes the documentation the project never had
   - This is valuable even if the fleet never advances past assisted automation

**The honest assessment:** Admiral can help with legacy projects, but the value proposition is different. It's not "the fleet does the work of 50 developers." It's "the fleet helps you understand and safely modify a codebase that no one understands." That's a slower, more cautious, more human-intensive use of the framework — and the document I wrote doesn't acknowledge that.

---

### Situation 4: Teams That Don't Write Things Down

Some teams coordinate entirely through meetings, hallway conversations, and "just ask Dave." They have no written process, no documented conventions, no ticket system — or they have these tools but don't use them consistently.

**Why this is a problem:**

Admiral hooks into written artifacts. Standing Orders are loaded from files. The Brain stores written entries. Hooks fire on tool calls. If the team's coordination happens verbally, Admiral has nothing to hook into.

**What actually breaks:**
- Ground Truth is supposed to come from documented conventions. If conventions are verbal, the fleet operates in a vacuum.
- Escalations require routing to a human. If there's no ticket system or structured communication channel, escalations go nowhere.
- The Brain records decisions. But if the important decisions happen in meetings and never get recorded, the Brain has a parallel (incomplete) history that diverges from reality.

**What actually works:**
- **Admiral as the forcing function for documentation.** The requirement to write Mission, Boundaries, and Success Criteria forces the conversation that the team has been avoiding. This is painful but valuable independent of AI agents.
- **Start with the Brain as the documentation system.** Instead of "adopt Admiral and then document things," flip it: "use the Brain to start documenting decisions, and Admiral becomes useful as a side effect."
- **Slack integration as the bridge.** If the team communicates in Slack, route fleet output there. Escalations become Slack messages. This meets the team where they are instead of demanding they adopt a new workflow.

---

### Situation 5: Teams Already Using Another Agent Framework

Teams running CrewAI, LangGraph, AutoGen, or custom orchestration who want to add governance.

**Why this is awkward:**

Admiral specifies its own fleet composition, routing rules, and agent definitions. A team already running CrewAI agents has their own agent definitions, routing, and memory. Admiral can't just wrap around an existing framework without friction.

**What actually works:**
- Admiral's enforcement layer (hooks, Standing Orders) is framework-agnostic. You can enforce token budgets, loop detection, and scope boundaries on any agent framework.
- The Brain works independently — any agent framework can write to and read from it via MCP.
- The governance agents (Loop Breaker, Token Budgeter, etc.) can observe any framework's output.
- What does NOT port easily: fleet composition (F2+), routing rules, interface contracts. These assume Admiral-native agent definitions.

**The honest answer:** Admiral-as-governance works with other frameworks. Admiral-as-operating-system requires migration. The document should be clear about which value proposition applies to which team.

---

### Situation 6: The Overhead Exceeds the Value

The most dangerous failure mode, and the one the document doesn't address at all.

**When Admiral is net-negative:**
- **Solo projects with short lifecycles.** If the project ships in two weeks and is never touched again, the Brain accumulates knowledge nobody will ever use. The governance overhead exceeds the value of governance.
- **Highly exploratory work.** Research spikes, prototyping, "just try things and see what happens." Admiral's enforcement and structure actively interfere with exploration. You don't need budget gates when you're throwing away the result.
- **Trivially simple projects.** A CRUD app with three endpoints doesn't need governance agents, fleet composition, or institutional memory. Using Admiral here is like deploying Kubernetes for a single static website.
- **Teams where AI agent usage is occasional.** If you use an AI agent once a week for 30 minutes, the cost of configuring and maintaining Admiral exceeds the value of governing those sessions.

**The principle the document should state but doesn't:** Admiral's value scales with the *volume and complexity of AI agent usage*. Below a certain threshold, it's overhead. The document presents Admiral as universally beneficial across all team sizes — it should instead identify the minimum viable agent usage that makes Admiral worthwhile.

---

## Revised Assessment: What the Archetype Model Gets Wrong

| What the Document Claims | What's Actually True |
|---|---|
| Every team starts with the same three capabilities | True for teams that already have Ground Truth. False for greenfield and legacy projects that need to create Ground Truth first. |
| Growth is friction-triggered | True, but the document doesn't address teams that never hit friction because their AI usage is too low to generate it. |
| The convergence path is universal | False. Legacy projects may never advance past Stage 1-2. Greenfield projects need a pre-Admiral phase. Short-lived projects never reach convergence. |
| "Minimal human-in-the-loop" is the end state | True for established, well-understood codebases. False for legacy code, novel architecture, and work requiring aesthetic judgment. |
| Tool integration follows a clean priority stack | True for new tool adoption. Messy for existing tool ecosystems where integrations conflict or overlap. |

---

## Open Questions

1. **What is the minimum AI agent usage volume** where Admiral becomes net-positive vs. overhead?
2. **What is the minimum integration surface for each tool?** (e.g., what's the simplest useful Jira integration?)
3. **Should Admiral provide a "coordination assessment" tool** that analyzes a team's current workflow and recommends the optimal Admiral profile and integration set?
4. **How do we handle teams that coordinate primarily through meetings** (no written process)? Admiral needs something to hook into.
5. **What's the migration path for teams already using another agent framework** (CrewAI, LangGraph, etc.) who want to add Admiral governance?
6. **How do we prevent the "integration tax"** — the cost of maintaining N integrations as external tools evolve?
7. **Should there be a formal "pre-Admiral" phase** for greenfield and legacy projects that creates the Ground Truth Admiral needs before the framework is deployed?
8. **What does a "read-only reconnaissance" mode look like** for legacy codebases where the fleet maps and documents before it modifies?

---
