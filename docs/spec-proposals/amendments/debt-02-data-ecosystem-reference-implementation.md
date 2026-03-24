# Amendment Proposal: DEBT-02 — Data Ecosystem Reference Implementation

> Formal amendment to address the thinnest doctrine part: `part12-data-ecosystem.md`.

---

| Field | Value |
|-------|-------|
| **Gap ID** | DEBT-02 |
| **Affected Section** | `aiStrat/admiral/spec/part12-data-ecosystem.md` |
| **Priority** | Cosmetic (per SD-02) — affects Stream 20 (Phase 6), does not block current work |
| **Date** | 2026-03-20 |

---

## Current Text

Part 12 defines 6 feedback loops, 7 datasets, and 5 ecosystem agents with dataset schemas and worked examples (v0.8.1). However, no reference implementation exists for any feedback loop or ecosystem agent. The spec is conceptually complete but has no executable reference to validate against.

## Proposed Amendment

Add a **Reference Implementation Requirements** section to `part12-data-ecosystem.md` specifying:

### 1. Minimum Viable Reference

Before Stream 20 implementation begins, at least one feedback loop must have an end-to-end reference implementation in `admiral/data-ecosystem/`:

| Component | What to Build | Purpose |
|-----------|--------------|---------|
| **One feedback loop** | Select the simplest loop (recommendation: Quality Feedback Loop — captures QA pass/fail outcomes and feeds them back to improve future agent assignments) | Prove the loop pattern works before building all 6 |
| **One dataset** | The dataset consumed by the selected loop | Prove the dataset schema is implementable |
| **One ecosystem agent** | The agent that operates the selected loop | Prove the agent contract is sufficient |

### 2. Selection Criteria for Reference Loop

The reference loop should be selected based on:

1. **Lowest dependency count** — fewest upstream components required
2. **Highest validation signal** — produces measurable improvement evidence
3. **Smallest scope** — can be implemented in a single task

### 3. Reference Implementation Structure

```
admiral/data-ecosystem/
  reference/
    README.md                    # Which loop, why, how to run
    loop.sh                      # The feedback loop implementation
    dataset-schema.json          # Schema for the loop's dataset
    agent-contract.md            # The ecosystem agent's interface contract
    tests/
      test_loop.sh               # Happy path and failure tests
```

### 4. Validation Gate

Stream 20 implementation should not proceed beyond the reference loop until:

- The reference loop runs end-to-end without manual intervention
- The loop produces at least one measurable metric (e.g., QA pass rate delta)
- The dataset schema handles the reference loop's actual data (not just example data)

## Rationale

The spec is well-designed conceptually but untested in practice. Building all 6 feedback loops against an untested pattern risks discovering structural problems late. A single reference implementation de-risks the entire stream at minimal cost.

This is classified as Cosmetic because it affects only Phase 6 work (Stream 20). No current implementation is blocked. The amendment ensures Phase 6 starts efficiently when the time comes.

## Impact Assessment

- **No changes to existing spec text** — adds a new section
- **Implementation streams affected**: Stream 20 (Data Ecosystem) — gains a reference to build against; Stream 11 (Brain B2/B3) — Brain graduation depends on data ecosystem feedback loops
- **Backward compatible**: No existing behavior changes
