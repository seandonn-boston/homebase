# Admiral Adoption Scoring Model

**Version:** 1.0.0
**Last Updated:** 2026-03-15

---

## Overview

This model computes an **Adoption Likelihood Score (0-100)** for each Fortune 500 company under each of 7 parameterized scenarios. The score represents the probability-weighted likelihood that the company would adopt Admiral's governance framework (as doctrine, certification, or platform) within 18 months of the scenario conditions becoming true.

## Methodology

### Step 1: Base Score Computation

For each company, compute a weighted sum across 8 factors:

```
base_score = Σ (factor_score × factor_weight) for all 8 factors
```

Each factor is scored 0-100 based on confirmed data. Weights sum to 1.0.

### Step 2: Scenario Modifier Application

Each scenario applies two modifiers:
- **regulatory_pressure_boost:** Added to the regulatory pressure factor score (before weighting)
- **urgency_boost:** Added to the final base score (after weighting)

```
scenario_adjusted = base_score + (regulatory_boost × regulatory_weight) + urgency_boost
```

### Step 3: Walk-Away Factor Deductions

Four walk-away conditions are evaluated. Each deducts from the scenario-adjusted score:

| Factor | Deduction | Condition |
|---|---|---|
| Build Internally | -30 | Engineering headcount >5,000 AND known platform team |
| No Agents | -40 | Zero agent tooling signals |
| Compliance-Only Governance | -20 | Governance posture is compliance-only |
| Open-Source Only | -15 | Company predominantly uses OSS AI tooling |

Walk-away deductions are scenario-sensitive: in S7 (Walk-Away), the "Build Internally" deduction is maximized. In S2 (Regulatory Trigger), the "Compliance-Only" deduction is reduced (regulation forces operational governance).

### Step 4: Score Clamping

Final score is clamped to [0, 100].

```
final_score = max(0, min(100, scenario_adjusted - walkaway_deductions))
```

## Interpretation

| Score Range | Interpretation | Action |
|---|---|---|
| 80-100 | **Strong Prospect** — High likelihood of adoption. Company has need, budget, posture, and external pressure. | Priority target for consulting/certification |
| 60-79 | **Moderate Prospect** — Likely to adopt under favorable conditions. May need a trigger event. | Monitor for trigger signals |
| 40-59 | **Conditional** — Would adopt only under specific scenario conditions (regulation, incident). | Track scenario probability |
| 20-39 | **Unlikely** — Structural barriers exist. Would need major market shift. | Low priority, revisit quarterly |
| 0-19 | **Walk-Away** — Company will not adopt Admiral in foreseeable future. | Document reasons, don't pursue |

## Limitations

1. **Data quality varies.** Not all companies disclose AI capex or engineering headcount. Estimates are marked as such.
2. **No prediction.** Scores reflect confirmed data weighted by scenario parameters. They do not predict what companies will actually do.
3. **Snapshot in time.** Scores are based on data available at evaluation date. Quarterly re-scoring is essential.
4. **Scenario independence.** Each scenario is scored independently. Real-world conditions may combine multiple scenarios.
5. **Walk-away factors are heuristic.** The -30/-40/-20/-15 deductions are judgment-based, not empirically calibrated. They should be refined with market feedback.

## Validation

The model is validated by checking:
1. **Face validity:** Do the top 20 prospects make intuitive sense given their known AI posture?
2. **Walk-away validity:** Do the bottom 20 align with companies known to build internally or not use agents?
3. **Sector coherence:** Do financial services score higher than consumer staples? (They should.)
4. **Scenario sensitivity:** Does S2 (Regulatory) boost heavily-regulated sectors more than S1 (Baseline)? (It should.)

If any of these checks fail, adjust weights or walk-away deductions and re-score.
