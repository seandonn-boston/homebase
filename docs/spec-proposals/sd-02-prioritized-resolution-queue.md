# SD-02: Prioritized Spec Debt Resolution Queue

> Cross-references the SD-01 inventory against all plan streams. Classifies each gap as blocking, constraining, or cosmetic and produces a prioritized resolution queue.
>
> Source: `docs/spec-proposals/sd-01-spec-debt-inventory.md`
>
> Date: 2026-03-20

---

## Classification Definitions

| Classification | Meaning | Action |
|---------------|---------|--------|
| **Blocking** | Implementation literally cannot proceed without resolution. Code would be built against wrong or missing spec. | Resolve before the affected stream begins. |
| **Constraining** | Implementation can begin but cannot fully complete or validate. Creates rework risk. | Resolve during or before the affected phase. |
| **Cosmetic** | Does not affect implementation correctness. Documentation, naming, or formatting gap. | Resolve opportunistically during related work. |

---

## Priority Queue

Ordered by: blocking items first, then by number of downstream streams affected, then by phase urgency.

### Priority 1 — Blocking (resolve before implementation begins)

| # | Item | Classification | Affected Streams | Phase Gate | Resolution Task |
|---|------|---------------|-----------------|------------|-----------------|
| 1 | **UNDERSPEC-01: Fleet Orchestration Protocol** | Blocking | 7, 8, 14, 15 | Phase 3 | SD-10 |
| 2 | **7 Missing Hooks** (identity_validation, tier_validation, governance_heartbeat_monitor, protocol_registry_guard, decision_authority_enforcer, output_routing_validator, recovery_protocol_handler) | Blocking | 7, 29 | Phase 3 | Stream 7 (S-01 to S-04) |
| 3 | **DEBT-03: SO-16 No Hook Enforcement** | Blocking | 7 (S-04), 16 | Phase 3 | S-04 in Stream 7 |
| 4 | **Part 3: Fleet Composition** (not started) | Blocking | 14, 15 | Phase 4 | Stream 14 (F-01+) |
| 5 | **Part 5: Execution Patterns** (not started) | Blocking | 8 | Phase 3 | Stream 8 (S-10+) |

**Why these are Priority 1:** Phases 3-5 cannot begin without fleet protocol definitions (UNDERSPEC-01), missing hooks block the enforcement spectrum thesis, and Parts 3/5 are zero-implementation spec parts that multiple streams depend on.

### Priority 2 — Constraining (resolve during affected phase)

| # | Item | Classification | Affected Streams | Phase Gate | Resolution Task |
|---|------|---------------|-----------------|------------|-----------------|
| 6 | **UNDERSPEC-02: Brain Graduation Automation** | Constraining | 11 | Phase 3 (B1), Phase 6 (B2/B3) | SD-11 |
| 7 | **UNDERSPEC-03: Cross-Platform Hook Normalization** | Constraining | 7, 17 | Phase 3 (hooks), Phase 7 (adapters) | SD-12 |
| 8 | **Part 1: Strategy & Context** (partial — context loading incomplete) | Constraining | 0, 30 | Phase 0/5 | ST-06, CE-01+ |
| 9 | **Part 2: Deterministic Enforcement** (53% hooks) | Constraining | 7, 29 | Phase 3 | S-01 to S-04 |
| 10 | **Part 4: Brain Knowledge** (B1 only) | Constraining | 11 | Phase 3/6 | B-01 to B-06 |
| 11 | **Part 9: Security** (advisory-only) | Constraining | 24 | Phase 4 | SEC-01+ |
| 12 | **Part 10: Meta-Agent Governance** (not started) | Constraining | 19 | Phase 5 | MG-01+ |
| 13 | **DEBT-01: Benchmark Targets Unvalidated** | Constraining | 32, 33 | Phase 8 | Measurement infra |

**Why these are Priority 2:** Each allows implementation to begin but creates risk of rework or incomplete validation. Brain graduation (UNDERSPEC-02) and cross-platform hooks (UNDERSPEC-03) affect Phase 3 and 7 respectively. Partial spec parts can be incrementally completed alongside implementation.

### Priority 3 — Cosmetic (resolve opportunistically)

| # | Item | Classification | Affected Streams | Phase Gate | Resolution Task |
|---|------|---------------|-----------------|------------|-----------------|
| 14 | **DEBT-02: Data Ecosystem Thin** | Cosmetic | 20 | Phase 6 | Reference impl |
| 15 | **Part 6: Quality Assurance** (partial) | Cosmetic | 6, 31 | Phase 2/7 | P-01+, QA-01+ |
| 16 | **Part 7: Operations** (partial — no alerting) | Cosmetic | 8, 25 | Phase 3/4 | S-14+, OB-01+ |
| 17 | **Part 8: Platform Integration** (Claude Code only) | Cosmetic | 17 | Phase 7 | PA-01+ |
| 18 | **Part 11: Universal Protocols** (partial) | Cosmetic | 10 | Phase 6 | S-26+ |
| 19 | **Part 12: Data Ecosystem** (partial) | Cosmetic | 20 | Phase 6 | DE-01+ |

**Why these are Priority 3:** These are partial implementations that can be completed in their natural phase without blocking upstream work. Data ecosystem thinness (DEBT-02) affects only Phase 6 work.

---

## Resolution Schedule by Phase

### Before Phase 1 (Current — Phase 0)

| Task | What | Status |
|------|------|--------|
| SD-01 | Spec debt inventory | **Done** |
| SD-02 | Prioritization (this document) | **Done** |
| SD-03 | Amendment proposals for active gaps | Pending |
| SD-04 | SO enforcement map completion | Pending |
| SD-05 | Hook manifest audit | Pending |
| SD-10 | Fleet orchestration protocol proposal | Pending (unblocked by SD-01) |
| SD-11 | Brain graduation proposal | Pending (unblocked by SD-01) |
| SD-12 | Cross-platform hooks proposal | Pending (unblocked by SD-01) |

### Before Phase 3

All Priority 1 items must be resolved:
- UNDERSPEC-01 (fleet protocol) — via SD-10
- Missing hooks spec clarity — via SD-04, SD-05
- SO-16 enforcement gap — via SD-03 amendment + S-04 implementation

### Before Phase 4

- UNDERSPEC-03 (cross-platform hooks) — via SD-12

### Before Phase 6

- UNDERSPEC-02 (Brain graduation) — via SD-11

### Before Phase 8

- DEBT-01 (benchmark validation) — via measurement infrastructure

---

## Immediate Next Actions

Based on this prioritization, the optimal execution order for remaining Phase 0 SD tasks:

1. **SD-04** (no deps) — SO enforcement map; feeds Priority 1 hook gap resolution
2. **SD-05** (no deps) — Hook manifest audit; feeds Priority 1 hook gap resolution
3. **SD-10** (deps: SD-01 done) — Fleet protocol proposal; highest-impact blocking item
4. **SD-11** (deps: SD-01 done) — Brain graduation proposal
5. **SD-12** (deps: SD-01 done) — Cross-platform hooks proposal
6. **SD-03** (deps: SD-01, SD-02 done) — Amendment proposals for all gaps
7. **SD-06** (no deps) — Reference constants audit
8. **SD-07** (no deps) — Spec version tracking

Items 1-3 are highest priority because they directly unblock Priority 1 blocking items that gate Phase 3.
