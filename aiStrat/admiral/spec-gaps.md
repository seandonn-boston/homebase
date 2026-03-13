<!-- Admiral Framework v0.3.0-alpha -->
# Specification Gaps: Vague Behavioral Claims Needing Concrete Constants

> **Audience:** Spec authors and reviewers. This document identifies sections across the Admiral Framework that make behavioral claims without pinning down concrete numbers, thresholds, or constants. Each gap includes the vague phrase, what should be specified, and a suggested value inferred from context.

-----

## Severity Classification

- **Critical:** Load-bearing vagueness — runtime behavior depends on interpreting subjective terms
- **Moderate:** Behavioral guidance that would benefit from quantification
- **Minor:** Clarification needed but unlikely to cause implementation divergence

-----

## Critical Gaps

### 1. Standing Context Ceiling Language

**File:** `part2-context.md`, Section 06 (line ~168)
**Vague phrase:** "Standing context should **rarely** exceed 50K tokens regardless of window size"
**Problem:** "Rarely" is undefined. When is it acceptable to exceed 50K?

| Should Specify | Suggested Value |
|---|---|
| Hard ceiling for standing context | ≤50K tokens (hard limit) |
| Warning threshold | 45K tokens (triggers audit of context loading strategy) |

-----

### 2. Brain Level Advancement Criteria

**File:** `part5-brain.md`, Section 15 (lines ~25–26)
**Vague phrase:** "If these metrics **don't improve** at the next level, the current level is sufficient"
**Problem:** "Don't improve" is subjective. What percentage improvement constitutes success?

| Metric | Should Specify | Suggested Value |
|---|---|---|
| Retrieval hit rate | Minimum for advancement | ≥85% |
| Retrieval precision | Top result relevance | ≥90% |
| Knowledge reuse rate | Multi-access entries | ≥30% of entries accessed 2+ times |
| Improvement threshold | Minimum delta to justify level change | ≥5% improvement over 2-week baseline |

-----

### 3. Brain Supersession Rate

**File:** `part5-brain.md`, Section 15
**Vague phrase:** "Supersession rate: **Low and stable** | **High** — knowledge is frequently wrong"
**Problem:** No quantitative boundary between "low" and "high."

| Should Specify | Suggested Value |
|---|---|
| Healthy supersession rate | <10% of entries superseded per quarter |
| Warning threshold | >15% supersession per quarter — audit Brain entry quality |

-----

### 4. Over-Decomposition "Consistently" Trigger

**File:** `part6-execution.md`, Section 18 (line ~18)
**Vague phrase:** "If a chunk **consistently** uses less than 20%, it is over-decomposed"
**Problem:** "Consistently" is undefined. Once? Twice? Three times?

| Should Specify | Suggested Value |
|---|---|
| Re-decompose trigger | 2 consecutive chunks using <20% of budget |
| Session-level pattern | 3+ low-budget chunks in a single session |

-----

### 5. Tactical vs. Strategic Change Classification

**File:** `part8-operations.md`, Section 25 (line ~74)
**Vague phrases:**
- "**Significant** scope change"
- "**Mission evolution**"
- "**Minor** deadline shifts"

**Problem:** No thresholds distinguish Tactical Adjustment from Strategic Shift.

| Should Specify | Suggested Value |
|---|---|
| Scope expansion → Strategic | >15% expansion of original requirements |
| Scope reduction → Strategic | >10% reduction of original requirements |
| Deadline shift → Strategic | >1 week shift from original deadline |
| Mission change → Strategic | Any change to Mission statement text (clarifications are Tactical) |

-----

### 6. Health Metric Gray Zones

**File:** `part8-operations.md`, Section 27 (line ~240)
**Problem:** Metrics define "Healthy" and "Critical" thresholds but leave the zone between them undefined.

| Metric | Healthy | Undefined Zone | Critical |
|---|---|---|---|
| First-Pass Quality Rate | Above 75% | **50–75%** | Below 50% |
| Assumption Accuracy | Above 85% | **70–85%** | Below 70% |
| Orchestrator Overhead | Under 25% | **25–35%** | (60% in case study) |

**Suggested additions:**

| Metric | Yellow Zone | Yellow Zone Action |
|---|---|---|
| First-Pass Quality Rate | 50–75% | Audit acceptance criteria clarity; review Ground Truth freshness |
| Assumption Accuracy | 70–85% | Audit Ground Truth; increase assumption-flagging frequency |
| Orchestrator Overhead | 25–35% | Audit routing rules; consider reducing parallelism |
| Orchestrator Overhead | 35–50% | Active alert — reduce parallel work, simplify fleet topology |

-----

### 7. Orchestrator Overhead Graduated Response

**File:** `part8-operations.md`, Section 28b (line ~342)
**Problem:** Two data points (25% healthy, 60% case study) but no graduated response.

| Threshold | Status | Action |
|---|---|---|
| <20% | Normal | No action |
| 20–25% | Monitor | Track trend over sessions |
| 25–35% | Caution | Audit routing efficiency |
| 35–50% | Alert | Reduce parallel work, simplify fleet |
| 50%+ | Critical | Reduce fleet scope or split fleet |

-----

## Moderate Gaps

### 8. Context Loading Position

**File:** `part2-context.md`, Section 04 (line ~31)
**Vague phrase:** "Information loaded **early** frames all subsequent reasoning"
**Problem:** How early? First 10%? First 100 lines?

| Should Specify | Suggested Value |
|---|---|
| Standing context position | First 5–10% of context window (~10K–20K tokens in a 200K window) |

-----

### 9. QA Confidence Level Definitions

**File:** `part7-quality.md`, Section 21
**Vague phrases:**
- "Verified (tested)" — how many tests?
- "Assessed (reviewed **carefully**)" — what constitutes careful?
- "Assumed (**spot-checked**)" — what percentage?

| Confidence Level | Should Specify | Suggested Value |
|---|---|---|
| Verified | Minimum independent test cases | ≥2 independent test cases passing |
| Assessed | Minimum review coverage | ≥50% of changed lines reviewed |
| Assumed | Minimum sampling | ≥10% of implementation spot-checked |

-----

### 10. Sycophantic Drift Detection

**File:** `part7-quality.md`, Section 23 (line ~156)
**Vague phrases:**
- "**Declining** finding counts"
- "**Softening** language"

**Problem:** No threshold for when decline becomes drift.

| Should Specify | Suggested Value |
|---|---|
| Finding count decline trigger | >30% decrease session-over-session flags drift check |
| Severity language audit | Any "suggestion" replacing a previous "blocking issue" triggers review |

-----

### 11. Admiral Trust Promotion Threshold

**File:** `part10-admiral.md`, Section 33 (line ~28)
**Vague phrase:** "After **consecutive** successful Autonomous decisions in a category, promote similar Propose-tier decisions"
**Problem:** How many consecutive successes?

| Should Specify | Suggested Value |
|---|---|
| Consecutive success threshold | 5 consecutive successful decisions in the same category |
| Reset condition | Any failure resets the counter to 0 |

-----

### 12. Context Honesty Confidence Threshold

**File:** `part11-protocols.md`, Section 36 (line ~55)
**Vague phrase:** "If you don't have **enough** context to complete a task, say so immediately"
**Problem:** "Enough" is subjective.

| Should Specify | Suggested Value |
|---|---|
| Minimum confidence to proceed | ≥80% confidence that task can be completed without additional information |
| Escalation trigger | <80% confidence → flag to Admiral with specific missing context items |

-----

### 13. Headless Agent Authority Narrowing

**File:** `part9-platform.md`, Section 31 (line ~261)
**Vague phrase:** "Headless agents default to **narrower** Autonomous tiers"
**Problem:** How much narrower? One tier? Two?

| Should Specify | Suggested Value |
|---|---|
| Authority shift rule | Shift 1 tier down from interactive baseline |
| Mapping | Autonomous → Propose, Propose → Escalate, Escalate → unchanged |

-----

## Minor Gaps

### 14. Escalation Rate Improvement Expectation

**File:** `part8-operations.md`, Section 27 (line ~249)
**Vague phrase:** "Escalation Rate: **Decreasing over time** is healthy"
**Problem:** At what rate should it decrease?

| Should Specify | Suggested Value |
|---|---|
| Expected decline rate | 5–10% decrease per session during normal Acceleration phase |
| Plateau signal | If escalation rate is stable for 3+ sessions, review Decision Authority assignments |

-----

## Summary Table

| # | Severity | File | Vague Phrase | Suggested Constant |
|---|----------|------|-------------|-------------------|
| 1 | Critical | part2-context.md | "rarely exceed 50K" | Hard ceiling 50K; warning at 45K |
| 2 | Critical | part5-brain.md | "metrics don't improve" | Hit ≥85%, Precision ≥90%, Reuse ≥30%, Δ ≥5% |
| 3 | Critical | part5-brain.md | "Low and stable" supersession | <10%/quarter; warning at 15% |
| 4 | Critical | part6-execution.md | "consistently uses less than 20%" | 2 consecutive or 3+ in session |
| 5 | Critical | part8-operations.md | "significant scope change" | >15% expansion = Strategic |
| 6 | Critical | part8-operations.md | Health metric gray zones | Yellow zones: 50–75% FPQR, 70–85% accuracy |
| 7 | Critical | part8-operations.md | Orchestrator overhead graduated | 5-tier scale: <20% → 50%+ |
| 8 | Moderate | part2-context.md | "loaded early" | First 5–10% of window |
| 9 | Moderate | part7-quality.md | "reviewed carefully" | ≥2 tests, ≥50% review, ≥10% sampling |
| 10 | Moderate | part7-quality.md | "declining finding counts" | >30% session-over-session decrease |
| 11 | Moderate | part10-admiral.md | "consecutive successful" | 5 consecutive, reset on failure |
| 12 | Moderate | part11-protocols.md | "enough context" | ≥80% confidence to proceed |
| 13 | Moderate | part9-platform.md | "narrower Autonomous tiers" | Shift 1 tier down |
| 14 | Minor | part8-operations.md | "decreasing over time" | 5–10% per session decline |

-----

## Recommended Actions

1. **Immediate (v0.3.0):** Resolve Critical gaps #1–7 by adding concrete constants to the source spec files and mirroring them in `reference-constants.md`.
2. **Short-term (v0.4.0):** Resolve Moderate gaps #8–13 with quantitative thresholds.
3. **Ongoing:** Establish a "no vague thresholds" lint rule for spec PRs — every behavioral claim must have a number or explicitly cite another document that provides one.

-----

## Cross-References

- Constants registry: `reference-constants.md`
- Standing orders enforcement: `standing-orders-enforcement-map.md`
- Enforcement spectrum: `part3-enforcement.md`, Section 08
