# PROGRESSIVE AUTONOMY FRAMEWORK

*The four stages from manual oversight to full autonomy — and why infrastructure must support all of them simultaneously.*

> **Relationship to Adoption Profiles:** The five adoption profiles (Starter through Enterprise, see index.md) describe what components of Admiral you deploy. Progressive Autonomy describes how much independence you grant agents within whatever profile you have adopted. A Governed profile fleet (F3) can operate at any autonomy stage. These are orthogonal dimensions.

-----

## The Autonomy Mistake

The second most common mistake in AI infrastructure — after designing for elegance instead of chaos — is over-automation too early.

Many systems try to make agents fully autonomous from day one. But early users actually want:

- Control
- Observability
- Manual override

Full autonomy is a destination, not a starting point. And the path has four stages, each with distinct operator needs, infrastructure requirements, and failure modes.

-----

## The Four Stages

```
Stage 1: Manual Oversight
         |
         v
Stage 2: Assisted Automation
         |
         v
Stage 3: Partial Autonomy
         |
         v
Stage 4: Full Autonomy
```

**Critical insight:** Infrastructure must support all four stages simultaneously, because different parts of the same fleet will be at different stages. Your QA pipeline might be at Stage 3 while your security review is still at Stage 1. A newly added agent starts at Stage 1 regardless of where the rest of the fleet is.

### Stage 1: Manual Oversight

**The operator drives. Agents assist.**

| Dimension | Stage 1 Behavior |
|---|---|
| **Decision authority** | All decisions are Propose or Escalate. Agents recommend; humans decide. |
| **Execution** | Agents draft outputs. Humans review before any action is taken. |
| **Error handling** | Agents report errors. Humans direct recovery. |
| **Routing** | Humans assign tasks to specific agents. |
| **Budget** | Humans approve each significant token expenditure. |

**Why this stage exists:** The operator does not yet know which failures are common, which are catastrophic, and which are noise. They need to see every decision to build intuition. This maps directly to the Novice stage of Admiral Self-Calibration (Part 10).

**Operator experience:** Every agent output crosses the operator's desk. This is slow but safe. The operator builds a mental model of what agents do well and where they fail.

**Infrastructure requirements:**
- Propose-tier decisions must be clearly presented with context and alternatives
- Review queue with priority ordering
- Accept/reject/modify workflow for every agent output
- Full trace visibility for every action
- Easy override mechanisms

**Graduation signal:** The operator finds themselves rubber-stamping more than 70% of agent proposals. The proposals they reject follow predictable patterns that could be expressed as rules.

### Stage 2: Assisted Automation

**Agents handle routine work. Operators handle exceptions.**

| Dimension | Stage 2 Behavior |
|---|---|
| **Decision authority** | Routine, low-risk decisions are Autonomous. Novel or high-risk remain Propose/Escalate. |
| **Execution** | Agents execute routine tasks end-to-end. Complex tasks still require approval. |
| **Error handling** | Self-healing loops handle predictable errors. Novel errors escalate. |
| **Routing** | Orchestrator routes routine tasks. Operator routes ambiguous tasks. |
| **Budget** | Per-task budgets enforced by hooks. Operator reviews aggregate spending. |

**Why this stage exists:** The operator has seen enough patterns to trust agents with the predictable work. But they have also seen enough failures to know where agents cannot be trusted yet.

**Operator experience:** The daily work shifts from reviewing every output to reviewing exceptions. The operator focuses on the 20-30% of decisions that are genuinely hard. Most of the fleet's output is accepted without review.

**Infrastructure requirements:**
- Autonomous tier widened per category based on track record (Admiral Self-Calibration, Part 10)
- Exception queue — only non-routine items surface for review
- Pattern recognition — the system identifies which proposals the operator always accepts and suggests promoting them to Autonomous
- Budget dashboards replacing per-item approval
- Self-healing loop metrics showing what is being auto-resolved

**Graduation signal:** Exception rate drops below 15%. Escalations are genuinely novel, not repetitive. Self-healing resolves 80%+ of errors without operator involvement.

### Stage 3: Partial Autonomy

**The fleet operates independently. Operators govern.**

| Dimension | Stage 3 Behavior |
|---|---|
| **Decision authority** | Most decisions are Autonomous. Only scope changes, security, and architecture are Propose/Escalate. |
| **Execution** | Full task pipelines execute without approval. Quality gates are automated. |
| **Error handling** | Recovery ladder handles most failures. Operator sees post-mortem summaries. |
| **Routing** | Fully automated routing. Operator intervenes only for fleet composition changes. |
| **Budget** | Fleet-level budgets with automatic allocation. Operator reviews weekly trends. |

**Why this stage exists:** The governance infrastructure is mature enough that the rules — hooks, Standing Orders, quality gates, recovery ladders — do the work that manual oversight used to do. The operator's role shifts from supervising agents to governing the system.

**Operator experience:** The operator's primary interface is the Fleet Control Plane (fleet-control-plane.md). They check fleet health, review alerts, handle escalations, and adjust policy. They rarely interact with individual agent outputs.

**Infrastructure requirements:**
- Fleet Control Plane with real-time status, alerts, and intervention capabilities
- Policy management interface — operators modify rules, not individual decisions
- Trend analysis — is quality improving, stable, or degrading over time?
- Governance agent health monitoring (heartbeat, confidence, intervention frequency)
- Automated escalation with clear impact assessment

**Graduation signal:** The operator's interventions are exclusively strategic — fleet composition, policy changes, budget allocation. They have not overridden an individual agent decision in weeks.

### Stage 4: Full Autonomy

**The fleet is self-governing. Operators set strategy.**

| Dimension | Stage 4 Behavior |
|---|---|
| **Decision authority** | All operational decisions are Autonomous. Only strategic changes require human approval. |
| **Execution** | End-to-end, including deployment. Human review is the exception. |
| **Error handling** | Fleet self-heals from all common failures. Only novel, unprecedented failures escalate. |
| **Routing** | Fully automated including dynamic fleet scaling. |
| **Budget** | Self-managing within strategic allocation. |

**Why this stage exists:** The fleet has accumulated enough operational history — in the Brain, in the governance patterns, in the calibrated trust levels — that it can handle routine operations without human oversight. The human's role is strategic: what should the fleet work on, not how.

**Operator experience:** The operator sets objectives and constraints. The fleet determines how to achieve them. The operator reviews outcomes and adjusts strategy.

**Infrastructure requirements:**
- Everything from Stages 1-3, plus:
- Strategic objective interface — operators define goals and constraints, not tasks
- Autonomous fleet scaling and de-scaling based on workload
- Cross-fleet coordination for multi-project operations
- Long-term trend analysis and strategic recommendations
- Meta-agent Admiral capabilities (Admiral Self-Calibration, Part 10)

**Critical constraint:** Full autonomy does not mean unsupervised. The Fleet Control Plane remains active. Alerts still fire. Emergency halt is always available. Full autonomy means the fleet does not need humans for operational decisions — but humans retain strategic authority and emergency override.

-----

## The Autonomy Matrix

Different capabilities within the same fleet can be at different autonomy stages.

| Capability | Typical Starting Stage | Typical Mature Stage | Why the Asymmetry |
|---|---|---|---|
| Code implementation | Stage 2 | Stage 3-4 | Well-defined, testable, reversible |
| Code review / QA | Stage 2 | Stage 3 | Automated quality gates provide safety net |
| Security review | Stage 1 | Stage 2-3 | High blast radius; consequences of false negatives are severe |
| Architecture decisions | Stage 1 | Stage 2 | Long-term impact; hard to reverse |
| Deployment | Stage 1 | Stage 2-3 | Production impact; requires operational maturity |
| Dependency management | Stage 2 | Stage 3 | Supply-chain risk; needs quarantine maturity |
| Documentation | Stage 2 | Stage 4 | Low risk, easily reviewed, easily corrected |
| Test writing | Stage 2 | Stage 3-4 | Self-validating output; tests either pass or fail |

An operator might have full autonomy for documentation agents while maintaining manual oversight for security agents — in the same fleet, on the same project. The infrastructure must support this granularity.

-----

## Trust Mechanics

Autonomy advances through trust, and trust is earned per category through demonstrated competence.

### Trust Accumulation

```
Successful Autonomous decision in category X
  → Increment trust score for category X
  → After N consecutive successes, propose widening Autonomous tier for similar decisions
  → Operator approves or defers promotion

Failed Autonomous decision in category X
  → Reset trust score for category X
  → Narrow Autonomous tier to previous level for that category
  → Investigate: context gap (fixable) or capability gap (fundamental)?
```

### Trust Is Not Global

An agent that writes excellent code may produce terrible documentation. Trust calibration tracks each category independently:

| Category | Trust Level | Autonomy Stage | Basis |
|---|---|---|---|
| Code implementation | High | Stage 3 | 47/50 first-pass QA passes |
| Test writing | Medium | Stage 2 | 8/12 tests meaningful on first attempt |
| Documentation | Low | Stage 1 | 3/7 docs needed significant revision |
| Security review | Minimal | Stage 1 | Newly added capability, no track record |

### Trust Decay

Trust that is not exercised decays. If an agent has not performed category X work in 30 days, its trust level for category X resets to the previous stage. This prevents stale calibration from masking degraded performance (model updates, context drift, changed requirements).

-----

## Stage Transitions

### Advancing a Stage

| Prerequisite | Verification |
|---|---|
| Graduation signal met (defined per stage above) | Metrics confirm the signal over at least 2 weeks |
| No critical failures in the advancing category within the last 30 days | Failure log review |
| Infrastructure for the next stage is in place | Checklist verification |
| Operator explicitly approves the transition | Recorded decision |

### Reverting a Stage

| Trigger | Response |
|---|---|
| Critical failure in an autonomous operation | Immediate revert for the affected category |
| Quality metrics drop below red-flag thresholds (benchmarks.md) | Review and targeted revert |
| New agent added to fleet | New agent starts at Stage 1 regardless of fleet-wide stage |
| Major model change (new model version, new provider) | Revert to Stage 2 until recalibrated |
| Security incident | Fleet-wide revert to Stage 1 for security-related categories |

Stage reversions are not failures. They are the system working correctly — detecting that conditions have changed and adapting the oversight level accordingly.

-----

## Infrastructure Requirements by Stage

| Requirement | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|---|---|---|---|---|
| Review queue | Required | Required (exceptions only) | Optional | Not needed |
| Fleet Control Plane | Nice-to-have | Helpful | Required | Required |
| Automated quality gates | Helpful | Required | Required | Required |
| Self-healing loops | Optional | Required | Required | Required |
| Recovery ladder | Optional | Required | Required | Required |
| Policy management | Basic | Standard | Advanced | Full |
| Trend analysis | Manual | Semi-automated | Automated | Automated + predictive |
| Governance agents | Not needed | Optional | Required | Required |
| Meta-agent Admiral | Not applicable | Not applicable | Optional | Recommended |

-----

## Anti-Patterns

> **ANTI-PATTERN: PREMATURE AUTONOMY** — Jumping to Stage 4 because the demo looked impressive. Without the trust calibration, governance infrastructure, and operational history that Stages 1-3 build, fully autonomous fleets produce spectacular failures. The progression exists because each stage builds capabilities the next stage depends on.

> **ANTI-PATTERN: PERMANENT STAGE 1** — Never advancing beyond manual oversight because "we need to be careful." Perpetual manual review burns operator time, creates bottlenecks, and prevents the fleet from demonstrating the competence it may already have. If you are rubber-stamping 80% of proposals, you are at Stage 1 pretending there is no Stage 2.

> **ANTI-PATTERN: UNIFORM STAGE ASSIGNMENT** — Treating the entire fleet as one autonomy stage. Security review and documentation generation have fundamentally different risk profiles. A fleet where documentation agents have the same oversight as security agents is either over-governing documentation or under-governing security.

> **ANTI-PATTERN: STAGE WITHOUT INFRASTRUCTURE** — Declaring Stage 3 without having the Fleet Control Plane, governance agents, or automated quality gates. The stage is meaningless without the infrastructure that makes it safe. You are not at Stage 3 because you decided to stop reviewing. You are at Stage 3 because the system reviews for you.

-----
