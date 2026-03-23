# SD-06: Reference Constants Audit

> **Source spec:** `aiStrat/admiral/reference/reference-constants.md`
> **Implementation registry:** `admiral/config/reference_constants.json`
> **Validation script:** `admiral/bin/validate_constants_sync`
> **Audit date:** 2026-03-23

## Summary

All 29 constant sections from `reference-constants.md` have been audited against the implementation registry and codebase. **No divergences found.** All spec-defined constants are captured in the machine-readable registry, and the values match.

## Audit Results

### Section 1: Tool Token Estimation (11 constants)

| Constant | Spec Value | Registry Value | Code Reference | Status |
|----------|-----------|----------------|----------------|--------|
| Bash | 500 | 500 | `admiral/lib/state.sh:149` | Match |
| Read | 1,000 | 1000 | `admiral/lib/state.sh:150` | Match |
| Write | 800 | 800 | `admiral/lib/state.sh:151` | Match |
| Edit | 600 | 600 | `admiral/lib/state.sh:152` | Match |
| Glob | 300 | 300 | `admiral/lib/state.sh:153` | Match |
| Grep | 500 | 500 | `admiral/lib/state.sh:154` | Match |
| WebFetch | 2,000 | 2000 | `admiral/lib/state.sh:155` | Match |
| WebSearch | 1,500 | 1500 | `admiral/lib/state.sh:156` | Match |
| Agent | 5,000 | 5000 | `admiral/lib/state.sh:157` | Match |
| NotebookEdit | 800 | 800 | `admiral/lib/state.sh:158` | Match |
| Default | 500 | 500 | `admiral/lib/state.sh:159` | Match |

**Note:** Token estimates also exist in `admiral/config.json` under `tokenEstimates`. Both sources are kept in sync by `admiral/bin/validate_constants_sync`.

### Section 2: Context Budget Allocation (6 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Standing min | 15% | 15 | Match |
| Standing max | 25% | 25 | Match |
| Session min | 50% | 50 | Match |
| Session max | 65% | 65 | Match |
| Working min | 20% | 20 | Match |
| Working max | 30% | 30 | Match |

### Section 3: Token Budget Thresholds (2 constants)

| Constant | Spec Value | Registry Value | Code Reference | Status |
|----------|-----------|----------------|----------------|--------|
| Warning | >= 80% | 80 | `.hooks/token_budget_tracker.sh` | Match |
| Escalation | >= 90% | 90 | `.hooks/token_budget_tracker.sh` | Match |

### Section 4: Loop Detection (3 constants)

| Constant | Spec Value | Registry Value | Code Reference | Status |
|----------|-----------|----------------|----------------|--------|
| MAX_SAME_ERROR | 3 | 3 | `admiral/config.json`, `.hooks/loop_detector.sh` | Match |
| MAX_TOTAL_ERRORS | 10 | 10 | `admiral/config.json`, `.hooks/loop_detector.sh` | Match |
| SUCCESS_DECAY | 1 | 1 | `admiral/config.json`, `.hooks/loop_detector.sh` | Match |

### Section 5: Self-Healing (4 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| max_retries | 3 | 3 | Match |
| max_session_retries | 10 | 10 | Match |
| retry_min | 1 | 1 | Match |
| retry_max | 5 | 5 | Match |

### Section 6: Exit Codes (3 constants)

| Constant | Spec Value | Registry Value | Code Reference | Status |
|----------|-----------|----------------|----------------|--------|
| Pass | 0 | 0 | All hooks | Match |
| Fail (soft) | 1 | 1 | All hooks | Match |
| Block (hard) | 2 | 2 | `.hooks/prohibitions_enforcer.sh`, `.hooks/scope_boundary_guard.sh` | Match |

### Section 7: Hook Timeouts (8 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Global default | 30,000 ms | 30000 | Match |
| Budget hooks | 5,000 ms | 5000 | Match |
| Loop detector | 5,000 ms | 5000 | Match |
| Context baseline | 10,000 ms | 10000 | Match |
| Context health | 10,000 ms | 10000 | Match |
| Identity validation | 10,000 ms | 10000 | Match |
| Heartbeat monitor | 10,000 ms | 10000 | Match |
| Minimum | 100 ms | 100 | Match |
| Maximum | 300,000 ms | 300000 | Match |

### Section 8: Hook Manifest Patterns (2 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Name pattern | `^[a-z][a-z0-9_]*$` | `^[a-z][a-z0-9_]*$` | Match |
| Version pattern | `^\d+\.\d+\.\d+$` | `^\\d+\\.\\d+\\.\\d+$` | Match |

### Section 9: Context Health Check (1 constant)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Invocation frequency | Every 10 tool calls | 10 | Match |

### Section 10: Context Ceilings (3 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Standing ceiling | 50K tokens | 50000 | Match |
| Standing warning | 45K tokens | 45000 | Match |
| Stuffing threshold | 60% | 60 | Match |

### Section 11: Fleet Constants (4 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Min agents | 1 | 1 | Match |
| Max agents | 12 | 12 | Match |
| Chunk budget ceiling | 40% | 40 | Match |
| Standing context max lines | 150 | 150 | Match |

### Section 12: Token Depletion (2 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Quality degradation onset | ~60% | 60 | Match |
| Over-decomposition threshold | <20% | 20 | Match |

### Section 13: Governance Heartbeat (3 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Interval | 60 seconds | 60 | Match |
| Missed threshold | 2 | 2 | Match |
| Confidence floor | 0.5 | 0.5 | Match |

### Section 14: Admiral Fallback (5 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Missed heartbeats | 3 | 3 | Match |
| Failure window | 30 seconds | 30 | Match |
| Duration limit | 5 minutes | 300 | Match |
| Exit stable intervals | 3 | 3 | Match |
| Stable interval | 30 seconds | 30 | Match |

### Section 15: A2A Protocol (1 constant)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Request timeout | 5 minutes | 300 | Match |

### Section 16: Brain Query (3 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Default result limit | 10 | 10 | Match |
| Max result limit | 50 | 50 | Match |
| Cosine min score | 0.7 | 0.7 | Match |

### Section 17: Brain Token Lifecycle (4 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Default lifetime | 1 hour | 3600 | Match |
| Max lifetime | 4 hours | 14400 | Match |
| Rotation interval | 1 hour | 3600 | Match |
| Revocation propagation | ~10 seconds | 10 | Match |

### Section 18: Brain Decay & Graduation (4 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Decay window | 90 days | 90 | Match |
| B1->B2 missed rate | 30% | 30 | Match |
| B1->B2 eval period | 2 weeks | 14 | Match |
| B2 entry limit | ~10,000 | 10000 | Match |

### Section 19: Swarm Constants (2 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Heartbeat timeout | 60 seconds | 60 | Match |
| Error rate threshold | 30% | 30 | Match |

### Section 20: Quality Metrics (10 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| First-pass healthy | 75% | 75 | Match |
| First-pass critical | 50% | 50 | Match |
| Rework healthy | 10% | 10 | Match |
| Rework critical | 20% | 20 | Match |
| Self-heal healthy | 80% | 80 | Match |
| Self-heal critical | 50% | 50 | Match |
| Assumption healthy | 85% | 85 | Match |
| Assumption critical | 70% | 70 | Match |
| Handoff healthy | 5% | 5 | Match |
| Handoff critical | 15% | 15 | Match |

### Section 21: Efficiency Constants (4 constants)

| Constant | Spec Value | Registry Value | Status |
|----------|-----------|----------------|--------|
| Idle healthy | 15% | 15 | Match |
| Idle critical | 25% | 25 | Match |
| Orch overhead normal | 20% | 20 | Match |
| Orch overhead monitor | 25% | 25 | Match |
| Orch overhead caution | 35% | 35 | Match |
| Orch overhead alert | 50% | 50 | Match |

## Constants Not in Registry

The following spec sections define algorithms, patterns, or reference data rather than numeric constants. They are not suitable for the JSON registry but are documented here for completeness:

| Section | Type | Reason Not in Registry |
|---------|------|----------------------|
| Hook Dependency Algorithms (DFS, Kahn's) | Algorithm | Implementation choice, not a constant |
| Error Signature Formulas | Algorithm | Two SHA-256 formulas documented in spec |
| Session State Persistence | Schema | JSON structure, not a threshold |
| Standing Orders Injection | Process | Injection ordering, not a constant |
| Critical Context Sections | Enum | ["Identity", "Authority", "Constraints"] — hardcoded in context_health_check.sh |
| Hook Adapter Pattern | Architecture | Three-handler pattern, not a constant |
| Hook Discovery | Process | Three-stage fallback, not a constant |
| Decision Authority Defaults | Enum/mapping | 10 pre-configured decisions — not numeric constants |
| Minimum Dependency Set | Package list | Version requirements, not thresholds |
| Contract-First Parallelism | Case study data | Observational, not prescriptive |
| LLM-Last Design Constants | Ranges | 30-60% and 1/30th are descriptive ranges |
| Spec-Gap Resolved Thresholds | Duplicates | These mirror thresholds already in their source spec files |

## Enforcement

- **CI validation:** `admiral/bin/validate_constants_sync` runs in CI and fails on any divergence between `reference_constants.json` and `admiral/config.json`.
- **Drift detection:** Any PR that modifies either config file triggers the sync validator.
- **Process:** To add a new constant, add it to `reference_constants.json` first, then reference it in code.
