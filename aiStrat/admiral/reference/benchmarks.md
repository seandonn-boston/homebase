# Framework Benchmarks

> **Audience:** Implementers and evaluators measuring Admiral Framework effectiveness. These benchmarks define what "good" looks like for an Admiral-governed fleet.

> **Maturity Note:** All targets in this document are hypothetical until validated through real-world deployment. Targets are informed estimates based on software engineering heuristics and analogous systems — not empirical measurements from Admiral-governed fleets. As real-world data becomes available, targets should be updated and marked as validated.

-----

## Core Metrics

### 1. Governance Overhead

What percentage of total tokens go to governance agents vs. productive work?

| Metric | Definition | Target | Red Flag |
|---|---|---|---|
| Governance token ratio | `governance_tokens / total_tokens` | < 15% | > 25% |
| Governance latency | Time added by governance checks per task | < 5% of task time | > 15% |

Governance overhead should decrease as the fleet matures — governance agents learn patterns and require less active monitoring.

### 2. First-Pass Quality

What percentage of agent outputs pass QA without revision?

| Metric | Definition | Target | Red Flag |
|---|---|---|---|
| First-pass rate | `outputs_passing_qa / total_outputs` | > 75% | < 50% |
| Revision depth | Average number of revision cycles per output | < 1.5 | > 3 |

### 3. Recovery Success Rate

What percentage of failures are resolved by the recovery ladder without human escalation?

| Metric | Definition | Target | Red Flag |
|---|---|---|---|
| Auto-recovery rate | `failures_resolved_by_ladder / total_failures` | > 80% | < 60% |
| Escalation rate | `human_escalations / total_failures` | < 10% | > 25% |
| Mean time to recovery | Average time from failure detection to resolution | < 30s (hook) / < 5min (ladder) | > 15min |

### 4. Context Efficiency

How much useful output does the fleet produce per token of context consumed?

| Metric | Definition | Target | Red Flag |
|---|---|---|---|
| Output-to-context ratio | `useful_output_tokens / total_context_tokens` | > 0.3 | < 0.1 |
| Context waste | `unused_context_tokens / total_context_tokens` | < 20% | > 40% |

### 5. Enforcement Coverage

What percentage of safety-critical rules have deterministic (hook) enforcement?

| Metric | Definition | Target | Red Flag |
|---|---|---|---|
| Hook coverage | `hook_enforced_SOs / total_SOs` | > 80% (12/15) | < 50% (7/15) |
| Current state | 4/15 (27%) | — | Acknowledged gap |
| Safety-tier coverage | `hook_enforced_safety_SOs / total_safety_SOs` | 100% | < 75% |

### 6. Fleet Coordination Overhead

How much time and tokens are spent on handoffs vs. actual task work?

| Metric | Definition | Target | Red Flag |
|---|---|---|---|
| Handoff overhead | `handoff_tokens / total_tokens` | < 10% | > 20% |
| Handoff success rate | `successful_handoffs / total_handoffs` | > 95% | < 85% |
| Coordination latency | Time between task completion and next agent pickup | < 2s | > 10s |

### 7. Knowledge Reuse Rate

What percentage of Brain entries are accessed more than once?

| Metric | Definition | Target | Red Flag |
|---|---|---|---|
| Reuse rate | `entries_accessed_more_than_once / total_entries` | > 40% | < 15% |
| Mean usefulness | Average usefulness score across accessed entries | > 2.0 | < 0.5 |
| Stale entry ratio | `entries_not_accessed_in_30_days / total_entries` | < 30% | > 60% |

-----

## Competitive Differentiators

These are capabilities unique to or pioneered by the Admiral Framework:

| Differentiator | What It Means | Measurable Signal |
|---|---|---|
| **Enforcement spectrum** | Hooks > instructions > guidance — only framework with explicit enforcement hierarchy | % of constraints with deterministic enforcement |
| **Progressive adoption** | 5 profiles from solo agent to enterprise fleet with per-component scaling — no all-or-nothing | Time-to-value at each profile; adoption profile distribution |
| **Built-in attack corpus** | 18+ adversarial scenarios with structured testing methodology | Scenarios tested, pass rates, new scenarios discovered |
| **Context as budgeted resource** | Token budgets, context health monitoring, sacrifice ordering | Context waste ratio, budget adherence |
| **Intent engineering** | Evolution beyond prompt engineering — six elements of intent | First-pass quality improvement when using intent framework |
| **Self-aware governance** | Governance agents monitor themselves; enforcement map tracks gaps | Governance self-monitoring uptime; enforcement progression |

-----

## Measurement Cadence

| Profile | Recommended Cadence | Focus |
|---|---|---|
| Starter | Weekly manual review | First-pass quality, context waste |
| Team | Per-session automated | + Recovery rate, handoff overhead |
| Governed | Continuous | + Governance overhead, knowledge reuse |
| Production–Enterprise | Continuous + dashboards | All metrics, trend analysis, cross-fleet comparison |

-----

## Baseline Expectations

These are order-of-magnitude expectations, not guarantees. Actual performance depends on domain, model selection, and implementation quality.

| Phase | Governance Overhead | First-Pass Quality | Recovery Rate | Enforcement Coverage | Basis | Validated |
|---|---|---|---|---|---|---|
| Initial deployment | 20-30% | 50-60% | 60-70% | 27% (4/15) | Informed estimate from analogous systems | Not yet |
| After 2 weeks | 15-20% | 65-75% | 75-85% | 50%+ (target) | Informed estimate | Not yet |
| After 3 months | 10-15% | 75-85% | 85-95% | 80%+ (target) | Informed estimate | Not yet |
| Mature fleet | < 10% | > 85% | > 95% | > 90% | Informed estimate | Not yet |
