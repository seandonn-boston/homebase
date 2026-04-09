# A/B Testing Framework for Agents (IF-07)

> Test different agent configurations against each other

---

## Design

Route tasks to variant configurations, track per-configuration metrics, compute statistical significance.

### Experiment Definition
```json
{
  "id": "exp-001",
  "name": "Sonnet vs Opus for code review",
  "variants": [
    {"id": "control", "agentConfig": {"model_tier": "tier2_workhorse"}, "weight": 50},
    {"id": "treatment", "agentConfig": {"model_tier": "tier1_flagship"}, "weight": 50}
  ],
  "metrics": ["quality_rate", "rework_rate", "duration", "token_cost"],
  "min_samples": 30,
  "significance_level": 0.05
}
```

### Traffic Routing
The routing engine assigns tasks to variants based on configured weights. Assignment is sticky per task (no mid-task variant switching).

### Statistical Analysis
- Chi-squared test for categorical metrics (quality rate)
- Two-sample t-test for continuous metrics (duration, cost)
- Winner declared when p-value < significance_level and min_samples reached
