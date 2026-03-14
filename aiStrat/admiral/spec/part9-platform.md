# PART 9 — PLATFORM

*The infrastructure that surrounds the fleet.*

> **Naming hazard:** "Platform" conflicts with Python's `platform` stdlib module and potentially with similar names in other languages. If implementing Part 9 concepts as a code package, use an alternative name (e.g., `platform_ops/`). See Appendix E, Implementation Pitfalls for details.

*Parts 1–8 define what the fleet is, what it knows, how it's enforced, who does the work, what it remembers, how it executes, how it maintains quality, and how it operates over time. Part 9 addresses the engineering infrastructure beneath all of that: how you see what agents are actually doing at runtime, how agents operate without a human pressing the button, and how you know whether your fleet configuration is any good. These three sections turn agent operations from artisanal session work into repeatable engineering.*

> **Control Plane surface:** The Control Plane consumes the instrumentation defined here. Fleet Observability provides the traces, logs, and metrics; the Control Plane provides the interface for operators to explore, filter, and act on them.

-----

## Fleet Observability

> **TL;DR** — Fleet Health Metrics (Part 8) tell you aggregate health. Observability tells you why a specific agent, on a specific task, in a specific session, produced a specific failure. Instrument with traces, not just metrics. If you can't debug a fleet failure from its telemetry alone, your observability is insufficient.

### Metrics vs. Observability

Fleet Health Metrics (Part 8) defines what to measure: throughput, quality rates, escalation frequency, cost adherence. Those are **metrics** — aggregate signals sampled at intervals. They answer "is the fleet healthy?"

Observability answers a different question: "why did Agent B fail on chunk 3 of task 7 during Tuesday's session?" That requires **traces** — end-to-end records of individual operations as they flow through agents, tools, and systems.

| Metrics (Fleet Health Metrics, Part 8) | Observability (this section) |
|---|---|
| Aggregate health signals | Individual operation debugging |
| Sampled at intervals | Continuous, per-operation recording |
| "Throughput is declining" | "Agent B spent 40K tokens retrying a type error because the schema was stale" |
| Dashboards and alerts | Trace exploration and root cause analysis |
| Answers: "Is something wrong?" | Answers: "What exactly went wrong and why?" |

### The Three Pillars for Agent Fleets

Traditional observability has three pillars — logs, metrics, traces. Agent fleets add a fourth.

**Constraint: Every operation must have a trace.** Untraced operations are invisible — they cannot be debugged, attributed, or optimized. If you cannot reconstruct what happened from the telemetry alone, the observability is insufficient. **Failure mode:** A metric dashboard shows "fleet healthy" while a specific agent silently retries 15 times per task because its context profile is misconfigured. Metrics see aggregate throughput; traces see the individual pathology.

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

### Native Model Telemetry

Modern frontier models emit structured telemetry that supplements hook-based instrumentation:

| Signal | What It Reveals | Source |
|---|---|---|
| **Input/output/thinking token breakdown** | Whether extended thinking is consuming disproportionate budget. Whether prompts are bloated relative to outputs. | Model API response metadata |
| **Cache hit rate** | Whether prompt caching is effective. Low hit rates indicate context is changing too frequently between calls. | Model API response metadata |
| **Time-to-first-token (TTFT)** | Model latency independent of output length. Spikes indicate provider congestion or excessively long prompts. | Model API response metadata |
| **Tool use patterns** | Which tools are called, in what order, how often. Reveals whether the agent is using tools efficiently or brute-forcing solutions. | Agent runtime |
| **Extended thinking token ratio** | Ratio of thinking tokens to output tokens. High ratios on routine tasks indicate the model is over-reasoning — consider a lower tier. | Model API response metadata |

**Integration:** Capture native telemetry alongside hook-based traces. The trace record for each tool call should include both the hook output (what the agent did) and the model telemetry (what the model consumed doing it). This dual-layer view enables cost attribution at the granularity needed for tier optimization.

### MCP Protocol Evolution

The framework assumes MCP as the universal tool access protocol. As MCP matures, the following capabilities become available and should be leveraged:

**Streaming context:** MCP servers can push context updates to agents in real-time rather than requiring pull-based queries. Use streaming for:
- Brain notifications when entries relevant to the current task are created or superseded by other agents
- CI/CD status updates during headless operations
- Real-time cost tracking updates as budget thresholds approach

**Subscriptions:** Agents can subscribe to MCP server events rather than polling. Use subscriptions for:
- Brain change notifications (new entries in the agent's project scope)
- Tool availability changes (MCP server goes offline/online)
- Security alerts (token revocation, anomaly detection)

**Discovery with trust signals:** MCP servers can self-advertise capabilities, security posture, and trust indicators. Before registering a new MCP server:
- Verify the server's declared capabilities match its actual behavior (capability probing)
- Check for SLSA provenance or equivalent supply-chain attestation
- Confirm the server's network egress matches its declared scope (no undeclared outbound connections)
- Pin the server version and, when deployed, monitor for updates through the Continuous Monitor

**Heterogeneous protocol support:** Not all agents in a fleet speak MCP. The framework must accommodate:
- Agents using Claude Agent SDK directly (native tool definitions, not MCP-wrapped)
- Agents using REST APIs for tool access
- Legacy agents using filesystem-based communication
- Cross-protocol translation at the Orchestrator level — the Orchestrator speaks all protocols; specialists speak their native protocol

### Instrumentation Strategy

**Hooks as instrumentation points.** The framework's hook system (Deterministic Enforcement (Part 3)) provides natural instrumentation:

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
| **Alerting** | Notification when signals cross thresholds | Integrated with metrics (Fleet Health Metrics, Part 8) warning thresholds |

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

## CI/CD & Event-Driven Operations

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
Security: All external content passes through the quarantine layer (5-layer immune system — 3 LLM-airgapped + 1 LLM advisory + antibody)
  before reaching seed candidates. See Configuration Security (Part 3) and Intelligence Lifecycle (Part 5).
Cost cap: GitHub API rate limits only — no LLM token costs (deterministic scanning)
```

### Context Bootstrapping for Headless Agents

Interactive agents receive context from the Admiral in real time. Headless agents must bootstrap their own context from pre-configured sources.

**The context bootstrap sequence:**

1. **Event payload.** The trigger event provides the immediate context — which PR, which CI failure, which issue.
2. **Ground Truth loading.** SessionStart hook loads project Ground Truth from the repository.
3. **Brain query.** Agent queries the Brain for relevant precedent based on the event context.
4. **Scope constraints.** Pre-configured boundaries limit the agent's authority. **Headless agents default to narrower authority than interactive agents** — this is a hard constraint, not a suggestion. No Admiral is present to catch mistakes. Actions that would be Autonomous in interactive mode should be Propose in headless mode. The cost of false caution (creating an issue instead of acting) is always lower than the cost of unreviewed autonomous action in an unattended context.
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

Some deployments may include scheduled agent roles (Docs Sync, Quality Review, Dependency Audit). These are not part of the core fleet catalog but represent common operational patterns. Scheduled agents need:

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

- **Report artifact:** Written to a known location in the repository (e.g., `.reports/` or tool-specific directory).
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
          # Agent loads AGENTS.md / CLAUDE.md and config automatically
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

## Fleet Evaluation & Benchmarking

> **TL;DR** — Fleet Health Metrics (Part 8) tell you if the fleet is operating normally. Evaluation asks a harder question: is this fleet configuration better than the alternative? A/B test fleet configs, benchmark against baselines, and measure whether the fleet outperforms manual development. Without evaluation, you're optimizing blind.

### Monitoring vs. Evaluation

| Monitoring (Fleet Health Metrics, Part 8) | Evaluation (this section) |
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

**Model tier assignments.** Model Selection (Part 4) says "A/B test: same task, both tiers, compare." This section defines how.

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

**4. Measure outcomes.** Use the metrics from Fleet Health Metrics (Part 8), plus:

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

## Multi-Modal and Extended Capabilities

> **TL;DR** — Modern agents can see (vision), interact with UIs (computer use), reason deeply (extended thinking), and produce structured outputs. Each capability changes cost, latency, and security profiles. Define when and how each is used.

### Computer Use

Agents with computer use capability can interact with graphical interfaces — clicking, typing, scrolling, reading screen content. This extends the fleet's reach beyond code and CLI into visual workflows.

**When to use computer use:**
- Visual regression testing — comparing UI screenshots against design specifications
- Interacting with third-party tools that lack APIs or MCP servers
- End-to-end workflow testing from the user's perspective
- Infrastructure management through web consoles when CLI/API alternatives are unavailable

**Security constraints for computer use:**
- Computer use agents operate in sandboxed environments with no access to production systems
- Screen captures are treated as potentially sensitive data — no persistence without Admiral authorization
- Computer use sessions have strict time limits (default: 5 minutes per interaction)
- All computer use actions are logged with screenshots for audit trail
- Computer use agents have the narrowest Autonomous tier — most actions require Propose-tier approval

**Cost implications:** Computer use is token-intensive (vision tokens for screen reading + action tokens for interaction). Budget accordingly — typically 3-5x the token cost of equivalent CLI operations.

### Extended Thinking

Frontier models support extended thinking — dedicated reasoning tokens that are consumed before the response begins. This is not the same as a longer response; it is deeper reasoning.

**When to enable extended thinking:**
- Propose-tier and Escalate-tier decisions where reasoning quality is critical
- Adversarial review and Devil's Advocate sessions
- Complex debugging where the failure mode is non-obvious
- Architecture decisions with long-term consequences

**When NOT to enable extended thinking:**
- Routine Autonomous-tier tasks (formatting, simple implementations, pattern-following)
- High-volume batch processing where cost scales with thinking tokens
- Tasks where the agent already has clear instructions and sufficient context

**Cost model:** Extended thinking tokens are billed at the same rate as output tokens but can be 5-50x the output volume. A task that costs $0.10 without extended thinking may cost $0.50-$5.00 with it. Budget extended thinking as a separate line item, not as part of the general token budget.

**Budget enforcement:** Set per-task thinking token limits. If extended thinking exceeds the limit, the model truncates reasoning — which is worse than not using extended thinking at all. Set limits high enough to be useful or disable extended thinking entirely.

### Structured Outputs

Models that support structured output (JSON mode, schema-constrained generation) can enforce output format compliance without post-processing validation.

**Use structured outputs for:**
- Handoff documents (Handoff Protocol) — enforce the HANDOFF schema at generation time
- Escalation reports (Escalation Protocol) — ensure all required fields are present
- Brain entries — enforce category, title, content, metadata structure
- Interface contracts — validate that specialist output matches the declared contract schema
- Decision logs — ensure timestamp, decision, alternatives, rationale, and tier are all present

**Integration with hooks:** Structured outputs complement but do not replace hook-based validation. The hook validates behavior; structured outputs validate format. Both are needed.

### Vision and Image Analysis

Agents with vision capabilities can analyze screenshots, diagrams, UI mockups, and visual artifacts.

**Fleet integration patterns:**
- QA Agent reviews screenshots of implemented UI against design specifications
- Accessibility Auditor checks visual contrast ratios and layout from rendered screenshots
- Architecture diagrams are analyzed for consistency with actual system topology
- Error screenshots from bug reports are analyzed for diagnostic information

**Security:** Images may contain sensitive information (credentials visible on screen, PII in UI, internal system names). Vision-processed images should be treated with the same sensitivity classification as text content. Do not persist processed images without classification.

-----

