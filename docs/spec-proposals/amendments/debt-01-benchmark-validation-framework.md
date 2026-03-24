# Amendment Proposal: DEBT-01 — Benchmark Validation Framework

> Formal amendment to address unvalidated benchmark targets in `reference/benchmarks.md`.

---

| Field | Value |
|-------|-------|
| **Gap ID** | DEBT-01 |
| **Affected Section** | `aiStrat/admiral/reference/benchmarks.md` |
| **Priority** | Constraining (per SD-02) — blocks Stream 33 (Thesis Validation) and Stream 32 (Rating System) |
| **Date** | 2026-03-20 |

---

## Current Text

> All targets in this document are hypothetical until validated through real-world deployment. Targets are informed estimates based on software engineering heuristics and analogous systems — not empirical measurements from Admiral-governed fleets.

The benchmarks table includes a "Validated" column that is empty for all rows. Targets such as "First-pass quality >75%", "Auto-recovery >80%", and governance overhead "<25%" have no empirical basis.

## Proposed Amendment

Add a **Benchmark Validation Framework** section to `benchmarks.md` specifying:

### 1. Measurement Infrastructure

Each benchmark target must have a corresponding measurement mechanism:

| Benchmark | Measurement Source | Collection Point |
|-----------|-------------------|-----------------|
| First-pass quality rate | QA Agent pass/fail on first review | PostToolUse hook on QA completion |
| Auto-recovery rate | Recovery ladder outcome tracking | Self-healing loop exit events |
| Governance overhead | Token usage: governance hooks vs. total | Token budget tracker aggregation |
| Enforcement coverage | Hook count / spec-defined hook count | Static analysis at CI time |
| Context waste | Tokens loaded but unused in output | Context health check metrics |

### 2. Validation Protocol

A benchmark target transitions from "Hypothetical" to "Validated" when:

1. **Measurement exists**: An automated collection mechanism produces the metric
2. **Baseline established**: At least 2 weeks of real fleet operation produces a baseline value
3. **Target calibrated**: The target is adjusted (if needed) based on the baseline — targets that are trivially easy or impossibly hard are recalibrated
4. **Validated column updated**: The benchmarks table records the validated value, date, and fleet configuration

### 3. Validation Status Taxonomy

| Status | Meaning |
|--------|---------|
| **Hypothetical** | No measurement infrastructure exists. Target is an informed estimate. |
| **Instrumented** | Measurement exists but insufficient data for baseline (<2 weeks). |
| **Baselined** | Baseline established. Target may need recalibration. |
| **Validated** | Target confirmed achievable through real fleet operation. |
| **Recalibrated** | Original target adjusted based on empirical data. Old target preserved for traceability. |

## Rationale

The spec correctly marks all targets as hypothetical. The gap is not the targets themselves but the absence of a defined path from hypothetical to validated. Without this framework:

- Stream 33 (Thesis Validation) cannot define what "enforcement beats advisory" means quantitatively
- Stream 32 (Rating System) has no calibrated baselines for tier boundaries
- The "Validated" column remains permanently empty

## Impact Assessment

- **No spec text changes required** — the amendment adds a new section to an existing reference document
- **Implementation streams affected**: Stream 33 (consumes validated benchmarks), Stream 32 (consumes calibrated tier boundaries), Stream 25 (implements measurement infrastructure)
- **Backward compatible**: Existing targets are unchanged; the framework adds validation status, not new targets
