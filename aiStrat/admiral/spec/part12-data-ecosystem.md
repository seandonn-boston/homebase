# PART 12 — THE DATA ECOSYSTEM

*How the fleet generates compounding intelligence from every interaction.*

*Parts 1–11 define a governed fleet that executes, remembers, and adapts. Part 12 closes the loop — every customer interaction, every AI output, every governance event becomes a data signal that flows back into the system. The fleet does not just consume data; it generates unique, constantly refreshing datasets that no competitor can replicate because they emerge from the specific intersection of your customers, your agents, and your operational context.*

> **Control Plane surface:** Feedback loop health, data pipeline metrics, and dataset growth surface in the Control Plane at CP4+. Operators can see which loops are active, whether attribution is keeping pace with outcomes, and overall ecosystem health.

-----

## Closed-Loop Architecture

> **TL;DR** — Every output becomes an input. Customer engagement generates signals. AI agents process signals into decisions. Decisions produce outcomes. Outcomes generate new engagement. The Brain captures the full cycle. The fleet gets smarter with every rotation.

### The Fundamental Loop

```
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │   ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
    │   │  CUSTOMER    │    │  AI AGENT    │    │  OUTCOME    │  │
    │   │  ENGAGEMENT  │───▶│  PROCESSING  │───▶│  DELIVERY   │  │
    │   │              │    │              │    │             │  │
    │   └──────┬───────┘    └──────┬───────┘    └──────┬──────┘  │
    │          │                   │                    │         │
    │          ▼                   ▼                    ▼         │
    │   ┌──────────────────────────────────────────────────────┐  │
    │   │              DATA CAPTURE LAYER                      │  │
    │   │   Events · Signals · Outputs · Metadata · Feedback   │  │
    │   └───────────────────────┬──────────────────────────────┘  │
    │                           │                                  │
    │                           ▼                                  │
    │   ┌──────────────────────────────────────────────────────┐  │
    │   │              ENRICHMENT & ATTRIBUTION                │  │
    │   │   Embed · Link · Score · Attribute · Trend           │  │
    │   └───────────────────────┬──────────────────────────────┘  │
    │                           │                                  │
    │                           ▼                                  │
    │   ┌──────────────────────────────────────────────────────┐  │
    │   │                    THE BRAIN                         │  │
    │   │   Decisions · Outcomes · Lessons · Patterns          │  │
    │   └───────────────────────┬──────────────────────────────┘  │
    │                           │                                  │
    │                           ▼                                  │
    │   ┌──────────────────────────────────────────────────────┐  │
    │   │              FEEDBACK SIGNALS                        │  │
    │   │   Calibration · Adaptation · Optimization            │  │
    │   └───────────────────────┬──────────────────────────────┘  │
    │                           │                                  │
    │              ┌────────────┴─────────────┐                   │
    │              ▼                          ▼                   │
    │   ┌──────────────────┐     ┌───────────────────┐           │
    │   │  FLEET BEHAVIOR  │     │  PRODUCT/SERVICE  │           │
    │   │  IMPROVEMENT     │     │  IMPROVEMENT      │           │
    │   └──────────────────┘     └─────────┬─────────┘           │
    │                                       │                     │
    │                                       ▼                     │
    │                              ┌────────────────┐             │
    │                              │   CUSTOMER     │             │
    │                              │   EXPERIENCE   │─────────────┘
    │                              └────────────────┘
    └─────────────────────────────────────────────────────────────┘
```

### Why This Matters

Most organizations treat AI as a tool — it consumes data, produces output, and the data pipeline is someone else's problem. Admiral inverts this. The fleet is not just a consumer of data; it is a **generator of proprietary datasets** that compound in value with every interaction:

1. **Customer engagement data** tells you what customers do. Every competitor has this.
2. **AI decision data** tells you what your agents decided and why. No competitor has this unless they built it.
3. **Outcome attribution data** tells you which AI decisions drove which customer outcomes. The architecture for capturing this is replicable — the moat is the *accumulated dataset itself*, which emerges from the specific intersection of your agents, your customers, and your operational context over time.
4. **Feedback loop data** tells you how the system improved over time. This is the compound interest.

> **CORE INSIGHT:** The data ecosystem is not an add-on to Admiral. It is the reason Admiral exists. A governed fleet that captures every decision, outcome, and lesson creates a flywheel: better data → better decisions → better outcomes → more engagement → more data. An ungoverned fleet generates noise.

### The Four Data Domains

| Domain | What It Captures | Source | Refresh Rate | Uniqueness |
|--------|-----------------|--------|--------------|------------|
| **Customer Engagement** | Interactions, behaviors, preferences, feedback, support requests, feature usage, session patterns | Application events, user actions, feedback systems | Real-time (event stream) | Common — most products capture this |
| **Customer Trends** | Usage pattern shifts, cohort behavior, adoption curves, churn signals, sentiment drift, market response | Aggregated engagement data, time-series analysis | Hourly to daily (batch) | Moderate — requires analytical infrastructure |
| **AI Agent Output** | Decisions made, recommendations generated, content produced, code written, analyses performed, confidence levels | Brain entries, agent audit logs, handoff documents | Real-time (per agent action) | Rare — only governed fleets capture this systematically |
| **Admiral Operational** | Governance events, hook triggers, escalations, trust calibrations, fleet health metrics, cost data, failure recoveries | Audit log, hook logs, fleet health pipeline, governance agents | Real-time (per operation) | Unique — only Admiral generates this |

### Data Capture Principles

**1. Capture at the source.** Every data point is recorded where it originates — not reconstructed downstream. Customer events capture at the interaction layer. Agent outputs capture at the Brain. Governance events capture at the audit log. Reconstruction from logs is lossy; capture at source is lossless.

**2. Capture the "why," not just the "what."** An event log that says "user clicked button" is table stakes. A dataset that links "user clicked button → agent recommended X → recommendation was based on Brain entry Y → Brain entry Y was strengthened 14 times → strengthening came from outcomes Z₁…Z₁₄" is a proprietary asset. The Brain's provenance fields (`source_agent`, `source_session`) and link types (`supports`, `contradicts`, `caused_by`) exist specifically to enable this causal chain.

**3. Capture continuously, not in batches.** The loop runs at different cadences for different domains (real-time for engagement, daily for trends), but it never stops. Stale data is worse than no data because it creates false confidence. The Brain's decay awareness (90-day window) applies to all domains.

**4. Capture Admiral's own operations.** The fleet's governance data — which hooks fired, which escalations occurred, which trust calibrations changed — is itself a dataset. It reveals operational patterns invisible to any system that doesn't govern itself.

-----

## Data Streams

> **TL;DR** — Four data streams feed the ecosystem. Each has defined schemas, capture points, processing pipelines, and Brain integration. Stream data flows through the quarantine system (Configuration Security, Part 3) before entering the Brain.

### Stream 1: Customer Engagement

Customer engagement data captures every meaningful interaction between customers and the product or service powered by the fleet.

**Capture Points:**
- User interface interactions (clicks, navigation, search queries, form submissions)
- API calls and responses (request patterns, error rates, latency)
- Support interactions (tickets, chat transcripts, satisfaction scores)
- Feedback signals (ratings, reviews, NPS, feature requests, bug reports)
- Session behavior (duration, depth, return frequency, abandonment points)

**Event Schema:**

```json
{
  "event_id": "uuid",
  "timestamp": "ISO-8601",
  "event_type": "interaction | feedback | support | session",
  "customer_id": "anonymized-hash",
  "context": {
    "surface": "web | mobile | api | support",
    "session_id": "uuid",
    "feature_area": "string",
    "action": "string"
  },
  "payload": {},
  "ai_attribution": {
    "agent_id": "string | null",
    "brain_entry_id": "uuid | null",
    "decision_id": "uuid | null",
    "recommendation_confidence": "float | null"
  }
}
```

**Brain Integration:** Engagement events are not stored individually in the Brain (that would be a firehose). Instead, the **Engagement Analyst agent** (Ecosystem Agents) aggregates events into Brain entries:
- `pattern` entries for recurring engagement behaviors
- `outcome` entries when engagement correlates with business outcomes
- `lesson` entries when engagement reveals product or agent gaps

**Privacy Boundary:** Customer engagement data passes through the Data Sensitivity Protocol (Data Sensitivity Classification, Part 11) before any aggregation. Customer IDs are anonymized at capture. PII never enters the Brain — the sensitive data guard (database trigger) provides defense-in-depth.

### Stream 2: Customer Trends

Trend data emerges from aggregated engagement data over time. It reveals where customers are going, not just where they are.

**Capture Points:**
- Usage pattern time series (daily/weekly/monthly active usage by feature)
- Cohort behavior analysis (how groups of customers evolve over time)
- Adoption curves (new feature uptake velocity and saturation)
- Churn and retention signals (disengagement patterns, at-risk indicators)
- Sentiment analysis (aggregate feedback scoring over time windows)
- Market response (how external events correlate with customer behavior)

**Trend Schema:**

```json
{
  "trend_id": "uuid",
  "computed_at": "ISO-8601",
  "trend_type": "usage_shift | cohort_behavior | adoption_curve | churn_signal | sentiment_drift | market_response",
  "time_window": {
    "start": "ISO-8601",
    "end": "ISO-8601",
    "granularity": "hourly | daily | weekly | monthly"
  },
  "dimensions": {
    "feature_area": "string",
    "customer_segment": "string",
    "surface": "string"
  },
  "metrics": {
    "current_value": "float",
    "previous_value": "float",
    "change_rate": "float",
    "confidence": "float",
    "sample_size": "int"
  },
  "anomaly": {
    "detected": "boolean",
    "severity": "low | medium | high | critical",
    "baseline_deviation_sigma": "float"
  }
}
```

**Brain Integration:** Trends flow into the Brain as:
- `pattern` entries for significant trend shifts (change rate > threshold)
- `context` entries for baseline trend data that agents need for decision-making
- `failure` entries when trends reveal problems (churn spikes, adoption stalls)

**Trend-to-Adaptation Bridge:** When trend data triggers a threshold (defined per project in Ground Truth), the Trend Analyst agent generates an adaptation recommendation classified per Strategic Adaptation (Part 8):
- Tactical: "Feature X usage dropped 15% this week — investigate UX friction"
- Strategic: "Customer segment Y is migrating to competitor pattern Z — fleet pivot needed"

### Stream 3: AI Agent Output

Every decision, recommendation, and artifact produced by the fleet is captured as a data stream — not just for accountability, but because agent output data is the most strategically valuable dataset the ecosystem generates.

**Capture Points:**
- Brain entries created by agents (all categories: decision, outcome, lesson, context, failure, pattern)
- Handoff documents between agents (task state, rationale, trade-offs)
- Recommendations and confidence levels (what agents suggested, how certain they were)
- Generated artifacts (code, analysis, content, configurations)
- Tool invocations and results (which tools agents used and what they returned)
- Escalation events (what agents couldn't handle and why)

**Output Schema:**

```json
{
  "output_id": "uuid",
  "timestamp": "ISO-8601",
  "output_type": "brain_entry | handoff | recommendation | artifact | tool_result | escalation",
  "agent_id": "string",
  "session_id": "string",
  "project": "string",
  "context": {
    "task_id": "string",
    "chunk_id": "string",
    "authority_tier": "enforced | autonomous | propose | escalate",
    "model_tier": "tier1 | tier2 | tier3 | tier4"
  },
  "content": {
    "summary": "string",
    "detail": {},
    "confidence": "float | null"
  },
  "attribution": {
    "brain_entries_consulted": ["uuid"],
    "brain_entries_created": ["uuid"],
    "upstream_agent": "string | null",
    "downstream_agent": "string | null"
  },
  "resource_consumption": {
    "tokens_input": "int",
    "tokens_output": "int",
    "cost_usd": "float",
    "duration_ms": "int"
  }
}
```

**Brain Integration:** Agent outputs are already captured in the Brain through `brain_record`. The data ecosystem adds a metadata layer:
- **Attribution tracking:** Which customer engagement or trend data influenced the agent's decision
- **Outcome linking:** When a downstream outcome occurs, it is linked back to the agent output via `entry_links` with `caused_by` relationship
- **Performance scoring:** Agent outputs receive usefulness scores not just from other agents (strengthening) but from customer outcome data

**Unique Dataset Value:** This stream creates a dataset of "AI reasoning traces" — what the agent saw, what it decided, what confidence it had, and (once outcomes arrive) whether it was right. Over time, this becomes a training signal for agent calibration: which types of decisions do your agents make well? Which types do they consistently misjudge? This data exists nowhere outside your organization.

### Stream 4: Admiral Operational Data

The fleet's governance infrastructure generates its own data stream — one that reveals the health, efficiency, and evolution of the AI system itself.

**Capture Points:**
- Hook triggers and results (which constraints fired, pass/fail, frequency)
- Governance agent findings (drift detected, hallucination caught, loop broken)
- Trust calibration changes (which agents earned or lost autonomy, in what categories)
- Escalation patterns (what gets escalated, how often, resolution time)
- Fleet health metrics (agent utilization, queue depth, error rates)
- Cost tracking (per-agent, per-task, per-model-tier token consumption)
- Monitor intelligence (ecosystem changes detected, seed candidates generated)

**Operational Schema:**

```json
{
  "ops_event_id": "uuid",
  "timestamp": "ISO-8601",
  "event_type": "hook_trigger | governance_finding | calibration_change | escalation | health_metric | cost_event | monitor_finding",
  "source": {
    "component": "hook | governance_agent | orchestrator | monitor | brain",
    "component_id": "string"
  },
  "detail": {},
  "severity": "info | warning | error | critical",
  "fleet_state": {
    "active_agents": "int",
    "queue_depth": "int",
    "context_utilization_pct": "float"
  }
}
```

**Brain Integration:** Operational data flows into the Brain as:
- `pattern` entries for recurring operational behaviors (e.g., "Agent X consistently escalates database decisions")
- `lesson` entries for operational insights (e.g., "Tier 3 models produce 40% more hook failures on security tasks")
- `failure` entries for systemic issues (e.g., "Context starvation spike correlates with Monday morning task surges")

**Self-Improvement Signal:** This stream closes the loop on Admiral itself — the framework observes its own performance and generates data that drives its own improvement.

-----

## Enrichment & Attribution

> **TL;DR** — Raw data becomes intelligence through three processes: semantic enrichment (embedding and linking), outcome attribution (connecting decisions to results), and trend extraction (detecting patterns across time). These processes are continuous, not batch.

### Semantic Enrichment

Every data point entering the ecosystem is enriched with semantic context before storage:

1. **Embedding generation.** Content is embedded using the same model as the Brain (default: `text-embedding-3-small`). This enables semantic search across all four data domains — a customer trend can surface alongside the agent decision it influenced.

2. **Automatic linking.** The enrichment pipeline queries the Brain for semantically similar entries (cosine similarity > 0.85) and proposes `entry_links`. Links with confidence > 0.92 are created automatically (Autonomous tier). Links with confidence 0.85–0.92 are proposed for Admiral review (Propose tier).

3. **Cross-domain tagging.** Entries are tagged with metadata indicating which data streams contributed to them. A `pattern` entry might carry `{"data_streams": ["engagement", "agent_output"]}` indicating it emerged from the intersection of customer behavior and AI decisions.

### Outcome Attribution

The most valuable enrichment is **outcome attribution** — connecting an AI agent's decision to the customer outcome it produced.

**Attribution Chain:**
```
Customer Engagement Event
    → triggers AI Agent Processing
        → Agent consults Brain (brain_query)
            → Agent creates Decision (brain_record, category: decision)
                → Decision influences Product/Service behavior
                    → Customer experiences Outcome
                        → Outcome captured as Engagement Event
                            → Outcome Entry linked to Decision Entry
                                (entry_link: caused_by)
```

**Attribution Rules:**
- **Direct attribution:** Agent output explicitly names the customer interaction it responds to. Confidence: high.
- **Temporal attribution:** Customer outcome occurs within a configurable window after agent action on the same feature/surface. Confidence: medium.
- **Semantic attribution:** Outcome description is semantically similar to agent decision description. Confidence: low. Requires Admiral review before strengthening.

**Attribution Lag:** Customer outcomes may arrive hours, days, or weeks after the agent decision that influenced them. The attribution pipeline runs continuously, scanning new outcomes against historical decisions. The Brain's `last_accessed_at` field ensures that outcomes still find their source decisions even if those decisions haven't been queried recently.

### Trend Extraction

The enrichment pipeline computes trends across all four data domains:

**Engagement Trends:**
- Feature adoption velocity (new users per time window)
- Usage depth changes (actions per session, return frequency)
- Support volume and sentiment trends

**Agent Performance Trends:**
- Decision accuracy over time (attributed outcomes vs. decisions)
- Confidence calibration (do agents that say they're 90% confident get it right 90% of the time?)
- Model tier efficiency (quality per dollar across tiers)

**Operational Trends:**
- Hook failure rates by category and agent
- Escalation frequency and resolution time
- Fleet utilization and capacity trends

**Cross-Domain Trends (the most valuable):**
- "When agent confidence drops below 0.7, customer outcomes are 3x worse" → Recalibrate confidence thresholds
- "Customer churn correlates with escalation-heavy sessions" → Improve agent autonomy in churn-risk interactions
- "Feature X adoption accelerates when Agent Y handles onboarding" → Route onboarding to Agent Y

-----

## Ecosystem Agents

> **TL;DR** — Five specialized agents manage the data ecosystem. They are distinct from the existing Data & Analytics agents (which handle general-purpose data engineering). These agents operate specifically on the closed-loop feedback pipeline.

### Agent Roster

| Agent | Role | Model Tier | Schedule |
|-------|------|-----------|----------|
| **Engagement Analyst** | Aggregates customer engagement events into Brain-worthy patterns | Tier 2 | Continuous |
| **Trend Analyst** | Computes and monitors cross-domain trends, triggers adaptation | Tier 2 | Scheduled (hourly/daily) |
| **Attribution Engine** | Links outcomes to decisions, maintains the causal chain | Tier 2 | Continuous |
| **Feedback Synthesizer** | Converts attributed outcomes into fleet calibration signals | Tier 1 | Triggered (on attribution completion) |
| **Ecosystem Health Monitor** | Monitors data freshness, pipeline health, loop latency | Tier 3 | Continuous |

**Relationship to Existing Agents:**
- Data Engineer builds the pipelines these agents use
- Analytics Implementer instruments the capture points these agents consume
- Data Validator validates the data flowing through these agents' pipelines
- ML Engineer provides models (embeddings, anomaly detection) these agents invoke

### Engagement Analyst

**Identity:** You are the Engagement Analyst. You watch the stream of customer engagement events and extract signal from noise. You do not store every event — you identify the patterns, anomalies, and inflection points that matter, and record them in the Brain.

**Scope:**
- Monitor customer engagement event streams for patterns worth recording
- Aggregate events into Brain entries (pattern, outcome, lesson categories)
- Detect engagement anomalies (usage spikes, abandonment surges, sentiment shifts)
- Tag Brain entries with engagement context for attribution
- Maintain engagement baselines for trend comparison

**Does NOT Do:**
- Store individual customer events in the Brain (firehose prevention)
- Make product decisions based on engagement data (Propose tier only)
- Access raw customer data without anonymization
- Modify engagement capture instrumentation (Analytics Implementer's scope)

**Decision Authority:**
| Decision | Tier |
|----------|------|
| Record engagement pattern in Brain | Autonomous |
| Flag engagement anomaly | Autonomous |
| Recommend product change based on engagement | Propose |
| Modify engagement thresholds | Propose |

### Trend Analyst

**Identity:** You are the Trend Analyst. You compute trends across all four data domains and detect the cross-domain correlations that reveal systemic insights. You are the bridge between raw metrics and strategic adaptation.

**Scope:**
- Compute time-series trends across engagement, agent output, and operational data
- Detect cross-domain correlations (e.g., agent confidence vs. customer outcomes)
- Generate adaptation recommendations classified by Strategic Adaptation (Part 8) tiers
- Maintain trend baselines and anomaly thresholds
- Produce trend reports for Admiral review

**Does NOT Do:**
- Act on trends directly (generates recommendations, does not implement)
- Modify fleet composition or routing (Orchestrator's scope)
- Access individual customer data (works with aggregated trends only)
- Set business strategy (Admiral's scope)

**Decision Authority:**
| Decision | Tier |
|----------|------|
| Record trend in Brain | Autonomous |
| Flag trend anomaly | Autonomous |
| Recommend tactical adaptation based on trend | Propose |
| Recommend strategic adaptation based on trend | Escalate |

### Attribution Engine

**Identity:** You are the Attribution Engine. You close the loop by connecting outcomes to the decisions that caused them. Without attribution, the ecosystem is just a data lake. With attribution, it's a learning system.

**Scope:**
- Scan new outcome entries against historical decision entries
- Create `caused_by` links between outcomes and decisions
- Maintain attribution confidence scores and validation
- Track attribution lag metrics (time from decision to outcome)
- Strengthen or weaken Brain entries based on attributed outcomes

**Does NOT Do:**
- Generate outcomes (records links between existing entries)
- Override attribution created by other agents
- Access customer data directly (works with Brain entries only)
- Modify the decisions being attributed (read-only relationship to upstream)

**Decision Authority:**
| Decision | Tier |
|----------|------|
| Create high-confidence attribution link (> 0.92) | Autonomous |
| Create medium-confidence attribution link (0.85–0.92) | Propose |
| Strengthen Brain entry based on positive outcome | Autonomous |
| Weaken (supersede) Brain entry based on negative outcome | Propose |

### Feedback Synthesizer

**Identity:** You are the Feedback Synthesizer. You convert attributed outcomes into actionable calibration signals for the fleet. You are the mechanism by which the closed loop actually improves fleet behavior — not just records it.

**Scope:**
- Analyze attributed outcome data to generate fleet calibration signals
- Produce agent trust calibration recommendations (per Admiral Self-Calibration, Part 10)
- Generate model tier optimization recommendations (per Model Selection, Part 4)
- Identify Brain entries that should be strengthened, superseded, or reviewed
- Produce periodic synthesis reports for Admiral review

**Does NOT Do:**
- Modify agent trust tiers directly (Propose tier — Admiral approves)
- Change model tier assignments (Propose tier)
- Supersede Brain entries without Admiral review (for entries with negative outcomes)
- Make product or business decisions

**Decision Authority:**
| Decision | Tier |
|----------|------|
| Recommend trust calibration change | Propose |
| Recommend model tier change | Propose |
| Strengthen Brain entries with positive outcomes | Autonomous |
| Recommend superseding entries with negative outcomes | Propose |
| Generate synthesis report | Autonomous |

### Ecosystem Health Monitor

**Identity:** You are the Ecosystem Health Monitor. You watch the data ecosystem itself — not the data flowing through it, but the health of the pipes, the freshness of the feeds, and the latency of the loops. If the ecosystem stops flowing, the fleet stops learning.

**Scope:**
- Monitor data freshness across all four streams (engagement, trends, agent output, operational)
- Track pipeline latency (capture-to-Brain time for each stream)
- Detect data gaps (missing events, broken pipelines, stale aggregations)
- Monitor attribution lag and completion rates
- Alert on ecosystem degradation before it compounds

**Does NOT Do:**
- Fix pipelines (alerts Data Engineer)
- Interpret data quality (Data Validator's scope)
- Make decisions about data content
- Modify capture instrumentation

**Decision Authority:**
| Decision | Tier |
|----------|------|
| Log ecosystem health status | Autonomous |
| Alert on data freshness violation | Autonomous |
| Alert on pipeline failure | Autonomous |
| Recommend pipeline architecture change | Escalate |

-----

## Feedback Loops

> **TL;DR** — Six feedback loops connect outcomes back to inputs. Each loop has a defined cadence, trigger, and effect. The loops are the mechanism by which the ecosystem compounds — without them, data capture is just storage.

### Loop 1: Agent Calibration Loop

**Cadence:** Continuous (triggered by attribution completion)
**Signal:** Attributed outcomes reveal agent decision quality
**Effect:** Trust calibration adjustments per Admiral Self-Calibration (Part 10)

```
Agent Decision → Customer Outcome → Attribution → Performance Score
    ↑                                                    │
    └────────── Trust Calibration Adjustment ◄───────────┘
```

When outcome data shows that an agent consistently makes good decisions in a category, the Feedback Synthesizer recommends expanding its Autonomous tier for that category. When outcomes are consistently poor, it recommends contracting to Propose tier. The Admiral approves or rejects the calibration change.

**Compounding Effect:** Over time, agents earn trust in the categories where they perform well, and the fleet self-optimizes its decision authority distribution.

### Loop 2: Brain Strengthening Loop

**Cadence:** Continuous (triggered by outcome attribution)
**Signal:** Outcomes validate or invalidate Brain entries
**Effect:** Entry usefulness scores adjust; poor entries get superseded

```
Brain Entry consulted → Decision made → Outcome observed
    ↑                                         │
    └──── Strengthen (good) / Supersede (bad) ◄┘
```

Brain entries that consistently lead to good outcomes accumulate usefulness signals and rank higher in future queries. Entries that consistently lead to bad outcomes are flagged for supersession. This is the Brain's version of natural selection — knowledge that works survives; knowledge that doesn't gets replaced.

**Compounding Effect:** The Brain's knowledge quality improves monotonically. New agents querying the Brain get better answers because poor answers have been pruned by outcome data.

### Loop 3: Model Tier Optimization Loop

**Cadence:** Weekly (batch analysis)
**Signal:** Quality-per-dollar metrics across model tiers
**Effect:** Model tier reassignment recommendations per Model Selection (Part 4)

```
Task assigned to Model Tier → Agent produces output → Outcome quality scored
    ↑                                                          │
    └──── Tier reassignment if quality/cost ratio improves ◄───┘
```

If Tier 3 (Utility) models produce outcomes indistinguishable from Tier 2 (Workhorse) on certain task types, the Feedback Synthesizer recommends downtiering those tasks to save cost without quality loss. If Tier 2 models consistently produce poor outcomes on complex tasks, it recommends uptiering to Tier 1 (Flagship).

**Compounding Effect:** Token costs decrease over time as the fleet learns which tasks genuinely need expensive models and which don't.

### Loop 4: Product Adaptation Loop

**Cadence:** Daily (trend analysis) to weekly (strategic review)
**Signal:** Customer trend data reveals product gaps or opportunities
**Effect:** Adaptation recommendations per Strategic Adaptation (Part 8)

```
Customer uses product → Engagement data captured → Trends computed
    ↑                                                     │
    └──── Product/service adapted based on trends ◄───────┘
```

When trend data shows customers abandoning a feature, the Trend Analyst generates a tactical adaptation recommendation. When trend data shows a market-level shift, it generates a strategic adaptation recommendation. The Admiral classifies and acts on the recommendation.

**Compounding Effect:** The product evolves in direct response to customer behavior — not quarterly survey data or executive intuition, but continuous, quantified behavioral signals.

### Loop 5: Governance Optimization Loop

**Cadence:** Weekly (operational review)
**Signal:** Operational data reveals governance overhead or gaps
**Effect:** Hook configuration, Standing Order, and governance agent adjustments

```
Governance enforces constraint → Operational data captured → Efficiency analyzed
    ↑                                                              │
    └──── Governance tuned (tighter where needed, relaxed where safe) ◄┘
```

When operational data shows a hook firing thousands of times with 99.9% pass rate, the hook may be recalibrated to reduce overhead. When data shows a governance gap (failures occurring in an uncovered category), new hooks or governance agent rules are proposed.

**Compounding Effect:** Governance overhead converges to its minimum effective dose — tight where it matters, absent where it doesn't.

### Loop 6: Ecosystem Intelligence Loop

**Cadence:** Daily (monitor scan) to weekly (deep discovery)
**Signal:** External AI landscape changes detected by the Monitor
**Effect:** Fleet configuration adapted to ecosystem changes

```
AI ecosystem evolves → Monitor detects change → Seed candidate generated
    ↑                                                    │
    └──── Fleet adapted to ecosystem reality ◄───────────┘
```

This loop extends the existing Monitor (Intelligence Lifecycle, Part 5) by feeding Monitor intelligence not just into the Brain but into the full feedback pipeline. A new model release doesn't just become a Brain entry — it triggers a model tier reassessment (Loop 3), which may change agent assignments (Loop 1), which changes outcome patterns (Loop 2), which further optimizes the system.

**Compounding Effect:** The fleet stays current with the AI ecosystem automatically, rather than requiring manual review and update cycles.

-----

## Dataset Strategy

> **TL;DR** — The closed-loop ecosystem generates seven proprietary datasets. Each dataset compounds in value over time because it captures the unique intersection of your customers, your agents, and your operational context. These datasets are strategic assets, not byproducts.

### The Seven Proprietary Datasets

| # | Dataset | Contents | Replication Difficulty |
|---|---------|----------|------------|
| 1 | **Engagement Corpus** | Anonymized customer behavior patterns, aggregated by feature, segment, and time window | Shallow — competitors can build similar |
| 2 | **Trend Atlas** | Time-series trend data with anomaly markers, cross-domain correlations, and prediction baselines | Moderate — requires analytical maturity |
| 3 | **Decision Registry** | Every AI agent decision with context, confidence, alternatives considered, and authority tier used | Deep — requires governed fleet |
| 4 | **Outcome Ledger** | Attributed customer outcomes linked to the agent decisions that drove them | Very deep — requires attribution pipeline |
| 5 | **Calibration History** | Trust calibration changes over time: which agents earned/lost trust, in what categories, based on what evidence | Very deep — requires governance + feedback loops |
| 6 | **Operational Genome** | Fleet performance data: hook patterns, governance findings, cost curves, efficiency trends | Unique — only Admiral generates this |
| 7 | **Cross-Domain Insight Graph** | Knowledge graph linking entries across all six datasets above, revealing causal chains invisible in any single dataset | Unique — emerges only from the full ecosystem |

### Dataset Lifecycle

Each dataset follows a lifecycle that ensures freshness and prevents unbounded growth:

**1. Capture** → Data enters via one of the four streams (Data Streams).
**2. Enrich** → Semantic embedding, cross-linking, and tagging (Enrichment & Attribution).
**3. Store** → Brain entries with appropriate category, metadata, and sensitivity.
**4. Strengthen** → Entries that prove useful accumulate usefulness signals.
**5. Decay** → Entries not accessed within the decay window (90 days default) are flagged.
**6. Supersede** → Entries invalidated by new data are linked to replacements.
**7. Purge** → Entries subject to regulatory requirements (GDPR, CCPA) are purged per protocol.

### Freshness Requirements

| Dataset | Maximum Staleness | Refresh Trigger | Staleness Response |
|---------|-------------------|-----------------|-------------------|
| Engagement Corpus | 1 hour | New engagement events | Alert Ecosystem Health Monitor |
| Trend Atlas | 24 hours | Scheduled trend computation | Recompute from engagement corpus |
| Decision Registry | Real-time | Agent brain_record calls | Alert if agents stop recording |
| Outcome Ledger | 24 hours | Attribution pipeline completion | Backfill attribution for unlinked outcomes |
| Calibration History | On-change | Trust calibration events | N/A (event-driven) |
| Operational Genome | 1 hour | Operational event stream | Alert Ecosystem Health Monitor |
| Cross-Domain Insight Graph | 24 hours | Scheduled graph computation | Recompute from component datasets |

### Dataset Record Schemas

The four data streams (above) define event-level schemas for raw capture. The seven proprietary datasets aggregate, enrich, and link those events into higher-order records. Below are schemas for the two most strategically valuable datasets — the Decision Registry and the Outcome Ledger — which together form the backbone of outcome attribution.

**Decision Registry Record:**

```json
{
  "decision_id": "uuid",
  "recorded_at": "ISO-8601",
  "agent_id": "string",
  "session_id": "string",
  "project": "string",
  "decision": {
    "summary": "string",
    "category": "architecture | implementation | configuration | routing | escalation | other",
    "alternatives_considered": ["string"],
    "chosen_alternative": "string",
    "rationale": "string",
    "confidence": "float (0.0-1.0)"
  },
  "authority": {
    "tier_used": "autonomous | propose | escalate",
    "approval_required": "boolean",
    "approved_by": "string | null",
    "approval_latency_ms": "int | null"
  },
  "context_consumed": {
    "brain_entries_consulted": ["uuid"],
    "standing_context_tokens": "int",
    "working_context_tokens": "int"
  },
  "outcome_link": {
    "outcome_id": "uuid | null",
    "attribution_confidence": "float | null",
    "attribution_type": "direct | temporal | semantic | null"
  },
  "resource_cost": {
    "tokens_input": "int",
    "tokens_output": "int",
    "model_tier": "tier1 | tier2 | tier3",
    "cost_usd": "float"
  }
}
```

**Outcome Ledger Record:**

```json
{
  "outcome_id": "uuid",
  "recorded_at": "ISO-8601",
  "outcome_type": "customer_success | customer_failure | operational_improvement | operational_regression | neutral",
  "source_stream": "engagement | trend | agent_output | operational",
  "description": "string",
  "metrics": {
    "primary_metric": "string",
    "primary_value": "float",
    "baseline_value": "float",
    "delta_pct": "float"
  },
  "attribution": {
    "decision_ids": ["uuid"],
    "attribution_method": "direct | temporal | semantic",
    "confidence": "float (0.0-1.0)",
    "attribution_lag_hours": "float"
  },
  "brain_impact": {
    "entries_strengthened": ["uuid"],
    "entries_superseded": ["uuid"],
    "entries_created": ["uuid"]
  }
}
```

### Worked Example: Agent Calibration Loop (Loop 1)

This example traces a complete rotation of Loop 1 — from agent decision through customer outcome to trust calibration adjustment.

**Step 1: Agent Decision.** The Backend Implementer agent (Agent ID: `backend-impl`) is assigned a database migration task. It consults the Brain, finds 3 relevant entries about the project's migration patterns, and decides to use a zero-downtime migration strategy. Confidence: 0.88. Authority tier: Autonomous.

```
Decision Registry entry created:
  decision_id: "d-4a7f..."
  agent_id: "backend-impl"
  decision.summary: "Use zero-downtime migration with shadow table strategy"
  decision.confidence: 0.88
  authority.tier_used: "autonomous"
  context_consumed.brain_entries_consulted: ["b-112...", "b-347...", "b-891..."]
```

**Step 2: Outcome Observation.** 48 hours later, operational monitoring shows the migration completed with zero downtime and no data integrity issues. The QA Agent confirms all post-migration tests pass. An engagement event shows no customer-reported issues.

```
Outcome Ledger entry created:
  outcome_id: "o-8c3e..."
  outcome_type: "operational_improvement"
  description: "Zero-downtime migration completed successfully, 0 data integrity issues, 0 customer reports"
  metrics.primary_metric: "downtime_seconds"
  metrics.primary_value: 0
  metrics.baseline_value: 120 (previous migration average)
```

**Step 3: Attribution.** The Attribution Engine links the outcome to the decision. The temporal window (48 hours) and direct task relationship yield high confidence.

```
Outcome Ledger updated:
  attribution.decision_ids: ["d-4a7f..."]
  attribution.method: "direct"
  attribution.confidence: 0.95
  attribution.lag_hours: 48

Decision Registry updated:
  outcome_link.outcome_id: "o-8c3e..."
  outcome_link.attribution_confidence: 0.95
  outcome_link.attribution_type: "direct"
```

**Step 4: Brain Strengthening.** The 3 Brain entries that informed the decision are strengthened (usefulness scores increase). The decision itself is recorded as a new Brain `decision` entry with a positive outcome link.

**Step 5: Feedback Synthesis.** The Feedback Synthesizer observes that `backend-impl` has now made 6 consecutive successful Autonomous decisions in the "database-migration" category (threshold: 5). It generates a calibration recommendation:

```
Recommendation: Expand backend-impl Autonomous tier
  Category: database-migration
  Evidence: 6/6 successful outcomes, mean confidence 0.85, 0 escalations
  Proposed change: Promote "schema-change" decisions from Propose → Autonomous
    (currently backend-impl must propose schema changes for Admiral approval)
```

**Step 6: Admiral Review.** The Admiral reviews the recommendation, approves the trust expansion. `backend-impl` now has Autonomous authority for schema changes in the database-migration category. The Calibration History dataset records the change with full evidence chain.

**Loop complete.** The fleet is now slightly more autonomous in an area where it has demonstrated competence. The next rotation will test whether this expanded autonomy produces good outcomes — if it does, trust compounds further. If it doesn't, the counter resets.

### Data Retention & Compliance

All datasets operate under the Data Sensitivity Protocol (Data Sensitivity Classification, Part 11):
- Customer data is anonymized at capture — no PII enters the Brain
- The sensitive data guard trigger (database level) provides defense-in-depth
- Regulatory purge support (`purge_regulation` field) handles right-to-erasure requests
- Audit log tracks all operations for compliance reporting
- Decay awareness prevents indefinite retention of stale data

> **ANTI-PATTERN: DATA HOARDING** — Capturing everything "because we might need it later" creates unbounded storage, privacy risk, and noise that drowns signal. The Engagement Analyst exists specifically to filter events into Brain-worthy patterns. If an event doesn't contribute to a pattern, outcome, or lesson, it stays in the event stream and ages out — it does not enter the Brain.

-----

## Implementation Levels

> **TL;DR** — The data ecosystem follows Admiral's progressive adoption model. Start at DE1 with manual observation. Graduate when you need automated feedback.

### Progressive Adoption

| DE Level | What You Build | Brain Level Required | Feedback Loops Active |
|-------|---------------|---------------------|----------------------|
| **DE1: Manual Observation** | Instrument basic engagement events. Admiral manually reviews agent decisions and customer outcomes. No automated attribution. | B1 (file-based) | None automated — Admiral closes loop manually |
| **DE2: Capture & Store** | Deploy engagement event stream. Agent outputs captured in Brain. Basic trend computation (scripted). | B2 (SQLite + embeddings) | Loop 2 (Brain strengthening — manual) |
| **DE3: Automated Attribution** | Attribution Engine active. Outcome-to-decision linking. Engagement Analyst and Trend Analyst deployed. | B3 (Postgres + pgvector) | Loops 1, 2, 3 (automated with Admiral approval) |
| **DE4: Full Ecosystem** | All five ecosystem agents active. All six feedback loops running. Cross-domain insight graph computed. | B3 | All six loops |
| **DE5: Autonomous Optimization** | Feedback loops operate with expanded Autonomous tiers (earned through track record). Minimal Admiral intervention for routine calibrations. | B3 | All six — elevated autonomy |

**Start at DE1.** The most common mistake is deploying the full pipeline before validating that your fleet generates data worth capturing. Instrument engagement. Review agent decisions manually. If you see patterns that would improve the fleet, you're ready for DE2.

### DE Transition Criteria

| From → To | Transition When |
|-----------|-----------------|
| DE1 → DE2 | Admiral spends >2 hours/week manually reviewing agent decisions and spotting patterns |
| DE2 → DE3 | Brain has >100 entries with outcomes that could be attributed to decisions, but aren't linked |
| DE3 → DE4 | Attribution reveals cross-domain insights that manual review would miss |
| DE4 → DE5 | Feedback Synthesizer recommendations are approved >90% of the time for >3 months |

-----

## Relationship to Other Parts

| Admiral Topic | Data Ecosystem Role |
|---|---|
| Ground Truth (Part 2) | Data ecosystem configuration (thresholds, freshness requirements, attribution rules) becomes part of Ground Truth |
| Decision Authority (Part 3) | Ecosystem agents follow standard decision authority tiers; calibration loop adjusts tiers based on outcome data |
| Configuration Security (Part 3) | All external data passes through quarantine; ecosystem does not bypass immune system |
| Model Selection (Part 4) | Model tier optimization loop (Loop 3) uses outcome data to recommend tier changes |
| Brain Architecture (Part 5) | Ecosystem uses standard Brain schema with additional metadata tags for attribution and stream identification |
| Intelligence Lifecycle (Part 5) | Ecosystem extends the lifecycle with outcome attribution and feedback synthesis |
| Institutional Memory (Part 8) | Ecosystem data persists across sessions through the Brain — checkpoints reference ecosystem state |
| Strategic Adaptation (Part 8) | Trend data and feedback synthesis trigger adaptation recommendations |
| Fleet Health Metrics (Part 8) | Ecosystem Health Monitor extends fleet health with data pipeline metrics |
| Admiral Self-Calibration (Part 10) | Calibration loop provides data-driven input to trust calibration decisions |
