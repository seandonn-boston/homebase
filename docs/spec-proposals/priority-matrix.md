# Spec Debt Priority Matrix

> **SD-02 deliverable.** Classification and prioritization of all spec debt items from the inventory (SD-01).
>
> **Last updated:** 2026-03-20

---

## Classification Key

| Classification | Meaning | Action |
|---------------|---------|--------|
| **Blocking** | Implementation cannot proceed without resolution | Resolve before affected stream begins |
| **Constraining** | Implementation can proceed but may need rework | Resolve before affected stream completes |
| **Cosmetic** | Spec language improvement, no implementation impact | Resolve opportunistically |

---

## Priority Queue — Blocking Items

These must be resolved first. Ordered by downstream impact (number of streams blocked).

| Priority | Item | Affected Streams | Resolution |
|----------|------|-----------------|------------|
| **P1** | IMPL-02: Fleet orchestration runtime | 7, 8, 14, 15 | Implement agent registry + routing (Phase 3-5 work) |
| **P2** | UNDERSPEC-01: Fleet orchestration protocol | 14, 15 | Write SD-10 amendment proposal defining concrete protocol |
| **P3** | IMPL-01: 4 missing hooks | 7, 29 | Implement identity_validation, tier_validation, governance_heartbeat_monitor, protocol_registry_guard |
| **P4** | IMPL-04: Execution patterns runtime | 8 | Implement handoff, escalation, parallel coordination |
| **P5** | IMPL-09: Cross-agent protocol | 10, 15 | Define and implement inter-agent communication |
| **P6** | IMPL-03: Brain B2/B3 | 11, 16, 20 | Blocking only for B2+ phase work; B1 proceeds independently |

---

## Priority Queue — Constraining Items

Can be resolved in parallel with implementation, but must complete before stream finishes.

| Priority | Item | Affected Streams | Resolution |
|----------|------|-----------------|------------|
| **C1** | IMPL-12: SO enforcement (8/16) | 7, 29 | Propose hooks for advisory-only SOs (SD-04) |
| **C2** | DEBT-03: SO-16 protocol governance | 7, 16, 29 | Implement protocol_registry_guard hook |
| **C3** | UNDERSPEC-03: Cross-platform hooks | 17 | Write SD-12 amendment proposal |
| **C4** | UNDERSPEC-02: Brain graduation | 11 | Write SD-11 amendment proposal |
| **C5** | IMPL-05: SDLC quality gates | 31, 32 | Integrate automated review + coverage tracking |
| **C6** | DEBT-02: Data ecosystem thin | 20 | Deepen spec with worked examples |
| **C7** | IMPL-06: Alerting pipeline | 25 | Build push alert system |
| **C8** | IMPL-07: Cross-platform adapters | 17 | Build adapter interface + implementations |
| **C9** | IMPL-08: Meta-governance | 19 | Implement Sentinel, Arbiter, Compliance Monitor |
| **C10** | IMPL-10: Long-term analytics | 20, 33 | Build analytics pipeline |
| **C11** | DEBT-01: Benchmark targets | 32, 33 | Gather empirical data once fleet is operational |

---

## Resolution Dependencies

```
UNDERSPEC-01 (fleet protocol spec) ← IMPL-02 (fleet orchestration code)
                                    ← IMPL-04 (execution patterns)
                                    ← IMPL-09 (cross-agent protocol)

IMPL-01 (missing hooks) ← IMPL-12 (SO enforcement completeness)
                         ← DEBT-03 (SO-16 enforcement)

UNDERSPEC-02 (brain graduation) ← IMPL-03 (Brain B2/B3)

UNDERSPEC-03 (cross-platform hooks) ← IMPL-07 (adapters)
```

---

## Phase Alignment

| Phase | Items to Resolve | Rationale |
|-------|-----------------|-----------|
| Phase 0 (now) | SD-01 through SD-12 (spec proposals) | Spec clarity before code |
| Phase 1 | — | Codebase quality, no spec debt items |
| Phase 2 | — | Architecture + CI, no spec debt items |
| Phase 3 | IMPL-01, IMPL-02, IMPL-04 | Core spec implementation |
| Phase 4 | IMPL-12, DEBT-03 | Security + fleet definitions need SO coverage |
| Phase 5 | IMPL-09, IMPL-03 (B2) | Fleet routing needs protocols; MCP needs Brain |
| Phase 6 | IMPL-03 (B3), DEBT-02, IMPL-10 | Knowledge system + data ecosystem |
| Phase 7 | IMPL-05, IMPL-07, IMPL-08 | Platform scale needs quality gates + adapters |
| Phase 8 | DEBT-01, IMPL-06 | Thesis validation needs empirical benchmarks |

---

## Immediate Actions (Phase 0)

1. **Write SD-10 amendment** (fleet orchestration protocol) — highest-impact blocking spec gap
2. **Write SD-11 amendment** (brain graduation) — constraining but early clarity helps
3. **Write SD-12 amendment** (cross-platform hooks) — constraining but early clarity helps
4. **Complete SD-04** (SO enforcement map) — identifies which SOs need hooks
5. **Complete SD-05** (hook manifest audit) — identifies manifest/implementation gaps
6. **Complete SD-06** (reference constants audit) — ensures code matches spec values
