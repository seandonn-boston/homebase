# ADR-009: Brain Level Graduation Criteria

## Status

Accepted

## Context

The Admiral Brain system has three tiers:
- **B1 (File-based)**: JSON/JSONL storage, keyword search, basic retrieval
- **B2 (Indexed)**: pgvector-backed, semantic search, structured queries
- **B3 (Autonomous)**: Self-organizing, cross-session learning, pattern recognition

Graduation from one tier to the next must be measurable and deterministic to prevent premature advancement (capability claims without substance) or stagnation (ready but not promoted).

### Alternatives considered

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **Manual (human decision)** | Admin reviews metrics and promotes | High confidence, context-aware | Bottleneck, subjective, infrequent |
| **Automatic (threshold-based)** | Promote when all metrics meet targets | Fast, objective, reproducible | May promote on noise, no context |
| **Semi-automatic (recommend + confirm)** | System recommends, human confirms | Best of both, audit trail | Adds latency, requires human |

## Decision

**Semi-automatic: threshold-based recommendation with human confirmation.**

The `GraduationMeasurement` class (B-21, `admiral/brain/graduation.ts`) evaluates criteria and produces a recommendation. Promotion requires Admiral approval.

### B1 to B2 Criteria

| Metric | Target | Description |
|--------|--------|-------------|
| Hit rate | >= 85% | Percentage of queries that return relevant results |
| Precision | >= 90% | Percentage of returned results that are actually relevant |
| Entry count | >= 100 | Minimum knowledge base size for statistical significance |

### B2 to B3 Criteria

| Metric | Target | Description |
|--------|--------|-------------|
| Reuse rate | >= 70% | Percentage of stored knowledge accessed more than once |
| Semantic precision | >= 85% | Accuracy of vector similarity matches vs keyword baseline |

### Assessment protocol

1. `GraduationMeasurement.assessB1toB2(stats)` or `assessB2toB3(stats)` evaluates criteria
2. Returns `GraduationAssessment` with `ready: boolean`, individual criteria results, and recommendation text
3. Assessment history is tracked for trend analysis (`getTrend()` detects improving/declining/stable patterns)
4. Promotion is not automatic — the assessment is a recommendation that requires human confirmation

## Consequences

- **B1 is the only tier guaranteed to work everywhere.** B2 requires pgvector (external dependency). B3 is aspirational — no implementation exists yet.
- **Metrics can game.** Hit rate and precision are only meaningful if query patterns are representative. A test suite that only queries what it stored will show 100% hit rate.
- **Trend tracking** prevents promotion on a single good assessment. The system looks for sustained performance (3+ consecutive passing assessments by default).
- **No automatic demotion.** If metrics decline after graduation, the system logs warnings but does not revert to a lower tier. Demotion requires manual intervention.
- **B3 criteria are preliminary.** As B3 capabilities are implemented (Phase 10), the criteria will need refinement based on actual usage patterns.
