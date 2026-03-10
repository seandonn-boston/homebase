<!-- Admiral Framework v0.2.0-alpha -->
# Model Tier Assignments

**Matching model capability to agent role requirements.**

Not every agent needs the most capable model. Model selection is a cost-quality tradeoff: use the minimum tier that produces acceptable output quality for the role. Promote when rework costs exceed the tier upgrade. Demote when output at a higher tier is indistinguishable from lower.

> **ENFORCEMENT:** Model tier assignments must be enforced via SessionStart hooks that validate the instantiated model against the tier specified here. A compromised orchestrator or misconfigured deployment that silently downgrades the Security Auditor from Tier 1 to Tier 3 degrades security review quality without any alert. The hook must reject agent sessions where the model does not meet the minimum tier for the role.

-----

## Tier Definitions

| Tier | Profile | Cost | Latency | When to Use |
|---|---|---|---|---|
| **Tier 1: Flagship** | Deepest reasoning, largest context, strongest code | Highest | Highest | Decisions with cascading consequences, adversarial reasoning, system-level analysis |
| **Tier 2: Workhorse** | Strong general capability, solid code generation | Moderate | Moderate | Implementation, review, most specialist work |
| **Tier 3: Utility** | Fast, cheap, reliable for well-defined tasks | Low | Low | Classification, formatting, pattern matching, validation |
| **Tier 4: Economy** | Near-frontier at fraction of cost | Lowest | Varies | High-volume batch processing, cost-sensitive operations |

-----

## Default Tier Assignments by Agent

These are starting recommendations. Calibrate based on observed output quality and rework rates.

### Tier 1 — Flagship

Agents that make decisions with cascading consequences, perform adversarial reasoning, or must hold complex system topology in view:

| Agent | Rationale |
|---|---|
| Orchestrator | Decomposition quality determines everything downstream |
| Architect | Structural decisions constrain all subsequent work |
| Mediator | Conflict resolution requires deep multi-perspective reasoning |
| Devil's Advocate | Must generate genuinely challenging counter-arguments |
| Red Team Agent | Adversarial review requires strongest reasoning |
| Incident Response Agent | Production incidents require deep judgment under pressure |
| Role Crystallizer | Fleet evolution requires system-level pattern recognition |
| Bias Sentinel | Must detect subtle cognitive biases across agent outputs |
| Scale agents 1–11 | Inhuman-scale analysis requires maximum reasoning capacity |

### Tier 2 — Workhorse

Agents that implement, review, and produce concrete deliverables:

| Agent | Rationale |
|---|---|
| Frontend Implementer | Strong code generation for UI work |
| Interaction Designer | Code generation + design sense |
| Accessibility Auditor | Standards-based analysis with judgment |
| Responsive Layout Agent | Code generation with cross-device reasoning |
| State Management Agent | Architecture + implementation |
| Backend Implementer | Core code generation |
| API Designer | Contract design requires balanced reasoning |
| Database Agent | Schema design + query optimization |
| Queue & Messaging Agent | Async pattern design |
| Cache Strategist | Performance reasoning |
| Integration Agent | Cross-system coordination |
| Migration Agent | Risk-aware transformation planning |
| Refactoring Agent | Code understanding + safe transformation |
| Dependency Manager | Ecosystem judgment |
| DevOps Agent | Pipeline design |
| Infrastructure Agent | IaC generation |
| Containerization Agent | Configuration generation |
| Observability Agent | Instrumentation design |
| QA Agent | Quality judgment |
| Unit Test Writer | Test design + edge case reasoning |
| E2E Test Writer | Cross-system test design |
| Performance Tester | Performance analysis |
| Chaos Agent | Failure scenario design |
| Regression Guardian | Behavioral stability analysis |
| Security Auditor | Vulnerability analysis |
| Penetration Tester | Attack path reasoning |
| Compliance Agent | Regulatory framework analysis |
| Privacy Agent | Data flow analysis |
| All Data & Analytics agents (extras/) | Data pipeline and analysis |
| All Documentation & Design agents | Content generation and analysis |
| Simulated User | Authentic user behavior simulation |
| Persona Agent | Persona-specific reasoning |
| All Domain Specialization agents (extras/) | Domain-specific implementation |
| All Lifecycle agents (except Incident Response) | Process management |
| Capacity Horizon Scanner (Scale #12) | Scale analysis at workhorse tier — structured scanning over deep reasoning |
| Context Curator | Context assembly judgment |
| Drift Monitor | Must detect subtle scope creep and mission drift across sessions |
| Hallucination Auditor | Must verify claims against available evidence |
| Context Health Monitor | Must assess context window utilization and instruction decay |
| Contradiction Detector | Must identify inconsistencies across multi-agent outputs |

### Tier 3 — Utility

Agents with well-defined inputs, simple decision logic, and structured outputs:

| Agent | Rationale |
|---|---|
| Triage Agent | Classification against defined taxonomy |
| Data Validator (extras/) | Schema and constraint checking |
| Pattern Enforcer | Rule-based scanning |
| Dependency Sentinel | Changelog monitoring and CVE matching |
| SEO Crawler | Structured audit against defined criteria |
| Token Budgeter | Cost tracking and budget enforcement against defined thresholds |
| Loop Breaker | Pattern matching for retry loops, circular handoffs, diminishing returns |

### Tier 4 — Economy

No default assignments. Use for high-volume batch variations of Tier 2/3 tasks where per-unit quality matters less than aggregate throughput.

-----

## Promotion and Demotion Signals

### Promote (move to higher tier) when:

- First-pass quality rate for the role drops below acceptable threshold
- Rework cost exceeds the cost difference between tiers
- The agent consistently requires human correction on judgment calls
- Error patterns indicate reasoning limitations rather than knowledge gaps

### Demote (move to lower tier) when:

- Output quality at the higher tier is indistinguishable from the lower tier
- A/B testing shows no meaningful quality difference between tiers
- The role's tasks have become more routine and well-defined over time
- Cost pressure requires optimization and the role's error tolerance allows it

### External signal: the Continuous Monitor

The Continuous AI Landscape Monitor (`monitor/`) tracks releases across 11 model providers and feeds new model intelligence into the Brain as CONTEXT entries. When a new model release appears in a monitor digest:

1. Review the release capabilities, benchmarks, and pricing.
2. Assess whether any current tier assignment should change (promote or demote).
3. If a Strategic Shift (see Adaptation Protocol, Section 25), cascade through fleet artifacts.
4. Record the tier decision in the Brain with rationale.

### How to test:

Run the same task through both tiers. Compare outputs against acceptance criteria. If the lower tier passes at the same rate, demote. If the lower tier produces measurably worse output, keep the higher tier.

-----

## Multi-Model Patterns

For cost optimization without quality sacrifice:

- **Economy-tier first draft, flagship-tier review:** 80% of token volume at economy cost, flagship quality gates catch issues. Effective for high-volume implementation work.
- **Different models for adversarial review:** Use a different model family for QA than for implementation. Different models have different blind spots — cross-model review catches more.
- **Flagship decomposition, workhorse execution:** The Orchestrator (flagship) decomposes tasks with deep reasoning, then specialists (workhorse) execute the well-defined chunks.

-----

## API Resilience: Degradation Policies

Model API outages, rate limits, and provider failures are not edge cases — they are operational realities. The fleet must degrade gracefully rather than halt entirely, while preventing silent quality erosion.

### Provider Abstraction Layer

A thin abstraction layer sits between the agent runtime and model providers. It reads the degradation policy from each agent's metadata and executes failover decisions deterministically:

1. On API failure (HTTP 5xx or timeout > 30s), retry with exponential backoff: 1s, 2s, 4s, 8s (max 30s, 4 retries).
2. After retries exhausted, consult the agent's degradation policy.
3. If `Degraded` is defined: switch to the fallback model, set `governance_audit_rate=2x`, and cap degraded-mode tasks (per the agent's `max_degraded_tasks` value).
4. If `Blocked`: queue the task, reject the session, and alert the Admiral. No silent degradation.
5. On primary recovery: flush the queue, resume normal operation, and generate a recovery report.

The abstraction does not choose fallback models on its own — it reads the per-agent policy defined below.

### Per-Agent Degradation Policy Template

Every agent definition may include an `API Resilience` section:

```
### API Resilience
- **Primary:** [model-id]
- **Degraded:** [fallback-model-id] (max N tasks before re-evaluation) | None
- **Blocked:** None — queue tasks for primary recovery
- **Rate Limit Strategy:** Exponential backoff (1s, 2s, 4s, 8s, max 30s)
```

If an agent definition omits this section, the tier-level default applies.

### Default Degradation Policies by Tier

| Tier | Primary | Degraded Fallback | Max Degraded Tasks | Blocked Behavior | Governance Audit Rate |
|---|---|---|---|---|---|
| **Tier 1: Flagship** | Flagship model | Tier 2 (Workhorse) | 3 | Queue for primary | 2x normal |
| **Tier 2: Workhorse** | Workhorse model | Tier 3 (Utility) | 5 | Queue for primary | 2x normal |
| **Tier 3: Utility** | Utility model | Tier 4 (Economy) | 10 | Queue for primary | 1.5x normal |
| **Tier 4: Economy** | Economy model | None | — | Queue for primary | Normal |

### Per-Agent Overrides

Critical agents override the tier defaults. These overrides are non-negotiable:

| Agent | Override | Rationale |
|---|---|---|
| **Security Auditor** | **Blocked** — no degradation | Security review quality cannot be silently reduced |
| **Red Team Agent** | **Blocked** — no degradation | Adversarial reasoning requires flagship capability |
| **Bias Sentinel** | **Blocked** — no degradation | Bias detection requires maximum reasoning depth |
| **Orchestrator** | **Degraded** to Tier 2, max 3 tasks | Fleet coordination must continue; coarser routing acceptable temporarily |
| **Incident Response Agent** | **Degraded** to Tier 2, max 2 tasks | Incidents can't wait; degraded response better than none |
| **Architect** | **Blocked** — no degradation | Architectural decisions have cascading consequences |

### Quality Gates During Degradation

When an agent operates on a fallback model, silent quality erosion is the primary risk. Mitigations:

1. **Governance audit rate doubles** for all degraded-mode outputs. The governance layer reviews degraded outputs at 2x the normal sampling rate.
2. **The Token Budgeter tracks degraded-mode spend separately.** Degraded-mode costs appear as a distinct line item, not blended into normal spend.
3. **Max degraded tasks per agent.** After N tasks on a fallback model, the agent pauses and the Admiral is notified for re-evaluation. This prevents indefinite operation at reduced quality.
4. **No cascading degradation.** An agent degraded from Tier 1 to Tier 2 cannot further degrade to Tier 3. If the Tier 2 fallback also fails, the agent is **Blocked**.

### Recovery Protocol

When the primary model API recovers:

1. The provider abstraction detects recovery (successful health check or first successful primary-model call).
2. Queued tasks for Blocked agents are released in priority order.
3. Degraded agents switch back to their primary model on their next task (not mid-task).
4. A recovery report is generated for the Admiral: duration of outage, tasks queued, tasks completed in degraded mode, agents affected.
5. Governance agents review all degraded-mode outputs produced during the outage at their next audit cycle.

### Enforcement

Model tier assignments and degradation policies are enforced via the `SessionStart: tier_validation` hook (Section 08). The hook validates the instantiated model against the tier specified here and consults the degradation policy on failure.
