# PART 9 — PLATFORM

*The infrastructure that surrounds the fleet.*

*Parts 1–8 define what the fleet is, what it knows, how it's enforced, who does the work, what it remembers, how it executes, how it maintains quality, and how it operates over time. Part 9 addresses the engineering infrastructure beneath all of that: how you see what agents are actually doing at runtime, how agents operate without a human pressing the button, and how you know whether your fleet configuration is any good. These three sections turn agent operations from artisanal session work into repeatable engineering.*

-----

## 30 — FLEET OBSERVABILITY

> **TL;DR** — Fleet Health Metrics (Section 27) tell you aggregate health. Observability tells you why a specific agent, on a specific task, in a specific session, produced a specific failure. Instrument with traces, not just metrics. If you can't debug a fleet failure from its telemetry alone, your observability is insufficient.

### Metrics vs. Observability

Section 27 defines what to measure: throughput, quality rates, escalation frequency, cost adherence. Those are **metrics** — aggregate signals sampled at intervals. They answer "is the fleet healthy?"

Observability answers a different question: "why did Agent B fail on chunk 3 of task 7 during Tuesday's session?" That requires **traces** — end-to-end records of individual operations as they flow through agents, tools, and systems.

| Metrics (Section 27) | Observability (this section) |
|---|---|
| Aggregate health signals | Individual operation debugging |
| Sampled at intervals | Continuous, per-operation recording |
| "Throughput is declining" | "Agent B spent 40K tokens retrying a type error because the schema was stale" |
| Dashboards and alerts | Trace exploration and root cause analysis |
| Answers: "Is something wrong?" | Answers: "What exactly went wrong and why?" |

### The Three Pillars for Agent Fleets

Traditional observability has three pillars — logs, metrics, traces. Agent fleets add a fourth.

**1. Logs.** Per-agent, per-session text records of what happened.

- Tool calls and their results (success, failure, duration).
- Decisions made and the authority tier used.
- Recovery ladder invocations and outcomes.
- Checkpoint writes and context refreshes.

**2. Metrics.** Aggregate numerical signals collected at regular intervals.

- Token consumption per agent, per chunk, per session.
- Tool call counts and latency distributions.
- First-pass quality rate trends.
- Cost per chunk at each model tier.

**3. Traces.** End-to-end records of a task as it flows through the fleet.

```
Trace: task-0047 "Implement auth middleware"
├── Orchestrator: decompose (2.1s, 1,200 tokens)
│   └── brain_query: "auth middleware patterns" (340ms, 3 results)
├── Backend Implementer: implement (47.3s, 28,400 tokens)
│   ├── Read: src/middleware/auth.ts (120ms)
│   ├── Edit: src/middleware/auth.ts (89ms)
│   ├── Bash: npx tsc --noEmit (3.2s) → FAIL
│   ├── Edit: src/middleware/auth.ts (67ms) — self-heal
│   └── Bash: npx tsc --noEmit (2.8s) → PASS
├── QA Agent: review (12.1s, 8,300 tokens)
│   └── Issue: missing rate-limit check (Major)
├── Backend Implementer: fix (8.7s, 4,200 tokens)
│   └── Bash: npm test (5.1s) → PASS
└── QA Agent: re-review (6.4s, 3,100 tokens) → PASS
    Total: 76.6s, 45,200 tokens, $0.14
```

A trace tells you exactly what happened, in what order, at what cost. When throughput drops (metric), the trace tells you which step ballooned.

**4. Agent telemetry.** Fleet-specific signals that traditional observability doesn't cover.

- **Prompt/response token ratios.** A healthy agent's response is proportional to its prompt. Extreme ratios indicate context issues.
- **Authority tier usage patterns.** An agent that never uses Propose tier may be making decisions above its level silently.
- **Brain interaction patterns.** Agents that never query before deciding are flying blind. Agents that query but never strengthen are consuming without contributing.
- **Context window utilization.** How much of the window is standing context vs. working context. Agents near capacity produce degraded output.

### Instrumentation Strategy

**Hooks as instrumentation points.** The framework's hook system (Section 08) provides natural instrumentation:

- **PreToolUse / PostToolUse:** Log tool name, parameters, duration, result status. This is the atomic unit of a trace.
- **SessionStart:** Record session metadata — agent role, model tier, context loading summary.
- **TaskCompleted:** Record task-level summary — total tokens, total time, quality gate results, recovery actions.

**Trace correlation.** Every trace needs a correlation ID that flows through all operations in a task:

- The orchestrator generates a trace ID when decomposing work.
- Each specialist receives the trace ID with its task assignment.
- Every tool call, brain_record, and checkpoint includes the trace ID.
- Cross-agent handoffs carry the trace ID, enabling fleet-wide trace reconstruction.

**Sampling and cost.** Full tracing of every operation in a large fleet produces significant data volume. Strategies:

- **Always trace failures.** Any recovery ladder invocation triggers full tracing for that task.
- **Sample successes.** Trace 10-20% of successful operations for baseline analysis.
- **Full trace on demand.** Admiral can enable full tracing for specific agents, roles, or task types during investigation.

### Observability Infrastructure

| Component | Purpose | Options |
|---|---|---|
| **Trace collector** | Receives and stores trace data | OpenTelemetry Collector, Langfuse, LangSmith, custom |
| **Trace storage** | Queryable trace database | The Brain (entries with category `trace`), dedicated trace store, or both |
| **Dashboard** | Real-time fleet visualization | Grafana, custom web UI, or terminal-based |
| **Alerting** | Notification when signals cross thresholds | Integrated with metrics (Section 27) warning thresholds |

**OpenTelemetry integration.** OpenTelemetry is the industry standard for distributed tracing. Agent frameworks with native OTel support (Pydantic AI, VoltAgent) emit spans automatically. For frameworks without native support, wrap tool calls in spans manually via hooks.

**Brain as trace store.** For fleets already running the Brain (Part 5), traces can be stored as entries with `category: "trace"` and structured metadata. This makes traces queryable via brain_query — "show me all traces where the type checker failed more than twice" — and links them to the decisions and outcomes they produced.

### What Good Observability Enables

- **Root cause analysis in minutes, not hours.** Trace the failing task end-to-end instead of reading session logs.
- **Cost attribution.** Know exactly which agent, which task, which tool call consumed the budget.
- **Performance regression detection.** When a fleet gets slower, traces show whether it's model latency, tool call volume, retry loops, or context loading.
- **Fleet configuration optimization.** Compare traces before and after a model tier change, context strategy change, or enforcement change.
- **Onboarding.** New Admirals can watch traces of successful fleet operations to build intuition.

> **ANTI-PATTERN: DASHBOARD WITHOUT TRACES** — Dashboards showing green metrics while a specific agent silently retries 15 times per task. Metrics say "throughput is normal." Traces reveal "Agent C consumes 4x the tokens of Agent B on identical tasks because its context profile is misconfigured." Dashboards without drill-down into individual traces create false confidence.

> **ANTI-PATTERN: OVER-INSTRUMENTATION** — Logging every token, every internal reasoning step, every model attention weight. Storage costs exceed the fleet's operational budget. Alert fatigue sets in. Instrument at the tool call level, not the token level. You need to know what the agent did, not how it thought.

-----

## 31 — CI/CD & EVENT-DRIVEN OPERATIONS

> **TL;DR** — The framework so far assumes a human Admiral starts a session and agents execute. Production fleets also run headlessly — triggered by PRs, CI failures, schedules, and webhooks. Event-driven agents need pre-built context, automated result routing, and cost guardrails because no one is watching.

### Beyond Interactive Sessions

Parts 1–8 describe a fleet where the Admiral starts a session, provides context, and agents execute. This is the foundation. But production agent operations extend beyond interactive sessions into three additional modes:

| Mode | Trigger | Admiral Present? | Context Source |
|---|---|---|---|
| **Interactive** | Admiral starts session | Yes | Admiral provides real-time |
| **Event-driven** | Repository event (PR, issue, CI failure) | No | Pre-configured per event type |
| **Scheduled** | Cron or calendar trigger | No | Pre-configured per schedule |
| **Pipeline-embedded** | CI/CD stage execution | No | Pipeline context + artifacts |

### Event-Driven Agent Patterns

Agents triggered by repository or system events rather than human sessions.

**Pattern 1: PR Review Agent**

```
Trigger: Pull request opened or updated
Context: PR diff, linked issue, project Ground Truth, relevant Brain entries
Agent: QA Agent (Tier 2)
Actions: Review code, post inline comments, approve or request changes
Result routing: PR comments, status check
Cost cap: 50K tokens per review
```

**Pattern 2: CI Failure Diagnosis**

```
Trigger: CI pipeline fails on a branch
Context: Failed test output, recent commits on branch, relevant source files
Agent: Diagnostic Agent (Tier 2)
Actions: Analyze failure, identify root cause, post diagnosis, optionally push fix
Result routing: PR comment with diagnosis, optional fix commit
Cost cap: 30K tokens per diagnosis
```

**Pattern 3: Issue Triage**

```
Trigger: New issue created
Context: Issue body, project labels, similar closed issues (Brain query)
Agent: Triage Agent (Tier 3)
Actions: Classify priority, suggest labels, estimate complexity, link to related issues
Result routing: Issue labels, comment with analysis
Cost cap: 10K tokens per triage
```

**Pattern 4: Webhook-Triggered Operations**

```
Trigger: External event (deployment complete, monitoring alert, dependency advisory)
Context: Event payload, project Ground Truth, relevant Brain entries
Agent: Varies by event type
Actions: Event-specific response
Result routing: Event-specific destination
Cost cap: Event-specific budget
```

**Pattern 5: AI Landscape Monitor**

```
Trigger: Daily cron (07:00 UTC), weekly deep scan (Monday 06:00 UTC), manual dispatch
Context: Persistent state (state.json), watched repo list, search queries, RSS feeds
Agent: Scanner (Python, not an LLM agent — deterministic tool, LLM-Last principle)
Actions:
  - Track releases across 11 model providers and 20 exemplar repos
  - Discover trending repos via GitHub search and topic scans
  - Extract agent configuration files from exemplar repos
  - Scan RSS feeds for keyword-matching announcements
  - Fetch full web content for release notes, blog posts, documentation
Result routing:
  - Digest (markdown report) → committed to repo for Admiral review
  - Seed candidates (Python file with brain_record calls, approved: False) → Admiral reviews and approves
  - High-priority findings → automatic GitHub Issue creation
  - State (JSON) → committed to repo for persistence across runs
Security: All external content passes through quarantine.py (4-layer immune system)
  before reaching seed candidates. See Section 10 and Part 5, Section 17.
Cost cap: GitHub API rate limits only — no LLM token costs (deterministic scanning)
```

### Context Bootstrapping for Headless Agents

Interactive agents receive context from the Admiral in real time. Headless agents must bootstrap their own context from pre-configured sources.

**The context bootstrap sequence:**

1. **Event payload.** The trigger event provides the immediate context — which PR, which CI failure, which issue.
2. **Ground Truth loading.** SessionStart hook loads project Ground Truth from the repository.
3. **Brain query.** Agent queries the Brain for relevant precedent based on the event context.
4. **Scope constraints.** Pre-configured boundaries limit the agent's authority. Headless agents should have narrower Autonomous tiers than interactive agents — no Admiral is present to catch mistakes.
5. **Result routing configuration.** Where does the output go? PR comment, issue update, Slack notification, commit, or file artifact.

> **TEMPLATE: EVENT-DRIVEN AGENT DEFINITION**
>
> TRIGGER: [Event type and conditions]
>
> AGENT: [Role, model tier]
>
> CONTEXT BOOTSTRAP: [Ground Truth source, Brain query template, event-specific context]
>
> AUTHORITY: [Decision tiers — typically narrower Autonomous than interactive]
>
> ACTIONS: [What the agent may do]
>
> RESULT ROUTING: [Where output is delivered]
>
> COST CAP: [Maximum tokens per invocation]
>
> ESCALATION: [What happens when the agent can't complete — typically: log and create issue]

### Scheduled Agent Operations

Section 11 catalogs three scheduled agent roles (Docs Sync, Quality Review, Dependency Audit) but does not operationalize them. Scheduled agents need:

**Trigger configuration:**

| Agent | Cadence | Trigger Method |
|---|---|---|
| AI Landscape Monitor | Daily (07:00 UTC) + Weekly deep scan (Monday 06:00 UTC) | GitHub Actions (`ai-monitor.yml`) |
| Docs Sync | Monthly | Cron job or CI scheduled pipeline |
| Quality Review | Weekly | Cron job or CI scheduled pipeline |
| Dependency Audit | Biweekly | Cron job or CI scheduled pipeline |
| Custom | Configurable | Cron, webhook, or pipeline stage |

**Context bootstrapping:** Same sequence as event-driven agents, but the "event" is the schedule trigger. The agent receives a standing task description rather than a dynamic event payload.

**Result routing for scheduled agents:**

- **Report artifact:** Written to a known location in the repository (e.g., `.claude/reports/`).
- **Issue creation:** Findings above a severity threshold become issues.
- **Brain recording:** Every scheduled run records a summary entry for trend analysis.
- **Notification:** Summary sent to Slack, email, or dashboard.

**Cost attribution:** Scheduled agents run without human oversight. Per-invocation cost caps and monthly budget ceilings prevent runaway spending. Track scheduled agent costs separately from interactive session costs.

### Pipeline Integration Patterns

Agents embedded in CI/CD pipelines as first-class stages.

**GitHub Actions integration:**

```yaml
# .github/workflows/agent-review.yml
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  agent-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Agent PR Review
        uses: anthropics/claude-code-action@v1
        with:
          model: claude-sonnet-4-6
          max_tokens: 50000
          # Agent loads CLAUDE.md and .claude/ config automatically
```

**Pipeline stage patterns:**

| Stage | Agent Role | Input | Output |
|---|---|---|---|
| **Pre-merge review** | QA Agent | PR diff, tests | Approval or blocking comments |
| **Post-merge validation** | Integration Agent | Merged code, CI results | Issue creation if problems found |
| **Release notes** | Documentation Agent | Commits since last release | Generated changelog |
| **Post-deploy smoke test** | Simulated User | Deployed URL, test scenarios | Pass/fail report |

### Guardrails for Unattended Operations

Headless agents need stronger guardrails than interactive agents because no Admiral monitors them in real time.

**Cost circuit breakers:** Hard token limits per invocation. Monthly budget ceilings per scheduled agent. Alert when approaching limits.

**Authority narrowing:** Headless agents default to narrower Autonomous tiers. Actions that would be Autonomous in interactive mode become Propose in headless mode — with "Propose" meaning "log and create an issue" rather than "wait for human approval."

**Blast radius limits:** Headless agents should not merge PRs, delete branches, modify production infrastructure, or make irreversible changes without explicit configuration authorizing each action.

**Audit trail:** Every headless invocation records: trigger event, context loaded, actions taken, tokens consumed, result routing destination. Stored in the Brain for trend analysis.

> **ANTI-PATTERN: HEADLESS WITHOUT GUARDRAILS** — A PR review agent deployed with the same authority as an interactive session. It approves its own suggested changes, merges PRs, and triggers deployments — all while the Admiral sleeps. Headless agents are not interactive agents running unattended. They are a distinct operational mode requiring distinct constraints.

> **ANTI-PATTERN: ALERT STORM** — Every scheduled agent sends a Slack notification for every finding. Twenty notifications per day. All ignored within a week. Route findings to issues or reports. Reserve notifications for threshold-crossing events that require human attention.

-----

## 32 — FLEET EVALUATION & BENCHMARKING

> **TL;DR** — Fleet Health Metrics (Section 27) tell you if the fleet is operating normally. Evaluation asks a harder question: is this fleet configuration better than the alternative? A/B test fleet configs, benchmark against baselines, and measure whether the fleet outperforms manual development. Without evaluation, you're optimizing blind.

### Monitoring vs. Evaluation

| Monitoring (Section 27) | Evaluation (this section) |
|---|---|
| Is the fleet operating normally? | Is this configuration better than alternatives? |
| Continuous, real-time | Periodic, deliberate |
| Thresholds and alerts | Controlled experiments |
| "First-pass quality rate is 78%" | "Fleet config A produces 78% vs. config B's 85%" |
| Reactive: something looks wrong | Proactive: which option is best? |

### What to Evaluate

**Fleet configuration changes.** Any modification to fleet setup is a hypothesis:

- "Promoting the implementer from Tier 2 to Tier 1 will improve first-pass quality."
- "Adding a dedicated QA agent will reduce defect escape rate."
- "Switching from checkpoint files to Brain-first persistence will reduce session amnesia."
- "Widening Autonomous tier after 10 successful chunks will improve throughput."

Without evaluation, these are assumptions. With evaluation, they become data.

**Model tier assignments.** Section 13 says "A/B test: same task, both tiers, compare." This section defines how.

**Prompt and context changes.** Revised agent instructions, new skills, modified context profiles — any context engineering change affects output quality. Measure it.

**Enforcement changes.** Adding or removing hooks, adjusting quality gates, modifying self-healing loops. Does the change improve outcomes or just add friction?

### A/B Testing Methodology

**1. Define the hypothesis.** One change, one expected outcome.

```
HYPOTHESIS: Switching QA Agent from Sonnet to Opus will reduce defect escape rate
CHANGE: QA Agent model tier 2 → tier 1
EXPECTED: Defect escape rate drops from 5% to under 2%
COST: ~3x increase in QA token cost
```

**2. Select representative tasks.** Tasks must be comparable:

- Same complexity level.
- Same domain (don't compare a CRUD endpoint against a distributed cache).
- Sufficient sample size — at least 10 tasks per configuration for statistical significance.

**3. Control variables.** Only one variable changes between A and B:

- Same agent instructions.
- Same Ground Truth.
- Same enforcement layer.
- Same context profiles.
- Different: only the variable under test.

**4. Measure outcomes.** Use the metrics from Section 27, plus:

| Metric | What It Reveals |
|---|---|
| **First-pass quality rate** | Does the change reduce rework? |
| **Tokens per completed chunk** | Does the change affect efficiency? |
| **Defect escape rate** | Does the change catch more issues? |
| **Time to completion** | Does the change affect speed? |
| **Cost per chunk** | Does the change affect economics? |
| **Recovery ladder invocations** | Does the change reduce failures? |

**5. Analyze and decide.** Compare outcomes. If the change improves the target metric without degrading others, adopt it. If it improves one metric but degrades another, the Admiral makes a judgment call.

### Baseline Establishment

Before evaluating fleet configurations against each other, establish a baseline: what does the current approach produce?

**For new fleets:** The baseline is manual development. How long does a developer take to complete the same tasks? At what quality? At what cost (hours x rate)?

**For existing fleets:** The baseline is the current fleet configuration. Snapshot metrics before making changes.

**Baseline metrics:**

| Dimension | What to Measure |
|---|---|
| **Speed** | Time from task assignment to acceptance |
| **Quality** | Defect density, test coverage, first-pass rate |
| **Cost** | Tokens consumed, dollar cost, human review time |
| **Consistency** | Variance in quality and speed across similar tasks |
| **Rework** | Percentage of tasks requiring revision after initial delivery |

### Evaluation Cadence

| Trigger | What to Evaluate |
|---|---|
| **Phase transition** | Full evaluation: is the fleet configuration appropriate for the next phase? |
| **After major config change** | Targeted evaluation: did the change improve the target metric? |
| **Monthly (steady state)** | Trend analysis: are metrics improving, stable, or degrading? |
| **After fleet scaling** | Capacity evaluation: is the new fleet size producing proportional throughput? |
| **Quarterly** | Strategic evaluation: is the fleet outperforming the alternative (manual dev, different framework)? |

### The Evaluation Report

> **TEMPLATE: FLEET EVALUATION REPORT**
>
> PERIOD: [Date range]
>
> CONFIGURATION: [Fleet config under evaluation]
>
> BASELINE: [What this is compared against]
>
> HYPOTHESIS: [What we expected the change to achieve]
>
> TASKS EVALUATED: [Count, types, complexity distribution]
>
> RESULTS:
> | Metric | Baseline | Current | Change |
> |---|---|---|---|
> | [Metric 1] | [Value] | [Value] | [+/- %] |
>
> VERDICT: [Adopt | Revert | Modify and re-test]
>
> NEXT: [Follow-up actions]

### Evaluating Fleet vs. Manual Development

The strategic question every Admiral must eventually answer: is the fleet worth it?

**Dimensions of comparison:**

- **Speed.** Calendar time from requirement to deployed feature. Fleets typically win on parallelizable work and lose on deeply sequential, exploratory work.
- **Quality.** Defect density and consistency. Fleets with enforcement typically produce more consistent quality; human developers produce higher peak quality on novel problems.
- **Cost.** Fleet token costs vs. developer hours at market rates. The crossover point depends on task type, fleet maturity, and model pricing.
- **Scale.** Can the fleet handle more concurrent work streams than the team? This is often the decisive factor.
- **Knowledge retention.** With the Brain, fleet knowledge persists perfectly. Human teams lose institutional knowledge to attrition. Long-term, this compounds.

**What fleets excel at:** Repetitive tasks, enforcement-heavy workflows, parallel execution, consistent quality across high volume, 24/7 availability, perfect institutional memory.

**What humans excel at:** Novel problem solving, aesthetic judgment, stakeholder communication, ambiguous requirements, ethical reasoning, creative leaps.

**The hybrid model.** Most production deployments are hybrid: fleet handles implementation and verification, humans handle strategy and judgment. The evaluation should measure the hybrid, not the fleet in isolation.

> **ANTI-PATTERN: EVALUATION THEATER** — Metrics collected, reports generated, dashboards built — but no configuration ever changes as a result. Every evaluation must end with a concrete action: adopt, revert, modify, or confirm. If evaluations never lead to changes, you're either already optimal or not evaluating the right things.

> **ANTI-PATTERN: PREMATURE OPTIMIZATION** — A/B testing model tiers on a fleet that hasn't stabilized its agent definitions. Optimize the fundamentals first — clear roles, sharp context, working enforcement — before fine-tuning configuration variables. The biggest gains come from fixing broken foundations, not tweaking knobs.

-----

