# ADR-007: Standing Orders Enforcement Tiers

## Status

Accepted

## Context

The Admiral Framework has 16 Standing Orders (SO-01 through SO-16). Not all can or should be enforced the same way. Some are automatable (pattern matching), some require judgment (ethical compliance), and some are purely advisory (work practices).

## Decision

Three enforcement tiers, each with a different mechanism:

### Tier 1: Hook-Enforced (Hard)

Violations are detected and blocked in real-time by PreToolUse hooks. The agent cannot proceed without resolution.

| SO | Name | Hook |
|----|------|------|
| SO-03 | Scope Boundaries | `scope_boundary_guard.sh` (exit 2) |
| SO-10 | Prohibitions | `prohibitions_enforcer.sh` (exit 2) |
| SO-12 | Zero-Trust (privilege escalation subset) | `prohibitions_enforcer.sh` (exit 2) |

**Rationale**: These protect critical boundaries where the cost of a false negative (unauthorized action) exceeds the cost of a false positive (blocked legitimate action).

### Tier 2: Hook-Enforced (Advisory)

Violations are detected and reported as warnings via PostToolUse hooks. The agent is informed but not blocked.

| SO | Name | Hook |
|----|------|------|
| SO-06 | Recovery Ladder | `loop_detector.sh` (exit 0 + alert) |
| SO-08 | Quality Standards | CI pipeline + linters |
| SO-12 | Zero-Trust (data validation subset) | `zero_trust_validator.sh` (exit 0 + alert) |
| SO-14 | Compliance & Ethics | `compliance_ethics_advisor.sh` (exit 0 + alert) |
| SO-15 | Pre-Work Validation | `pre_work_validator.sh` (exit 0 + advisory) |

**Rationale**: These involve judgment calls with high false-positive risk. Hard-blocking would disrupt legitimate work. Advisory + escalation is the correct pattern per ADR-004.

### Tier 3: Guidance-Only

Not enforced by hooks. Compliance depends on the agent's training, CLAUDE.md instructions, and Standing Orders injection at session start.

| SO | Name | Enforcement |
|----|------|-------------|
| SO-01 | Identity & Role | Session start injection |
| SO-02 | Authority Model | Session start injection |
| SO-04 | Communication Standards | Agent training |
| SO-05 | Knowledge Management | Agent training + Brain B1 |
| SO-07 | Handoff Protocol | Agent training |
| SO-09 | Accountability | Event log + audit trail |
| SO-11 | Continuous Improvement | Agent training |
| SO-13 | SDLC Quality Gates | CI pipeline |
| SO-16 | Context Management | Agent training |

**Rationale**: These govern behavior that cannot be reduced to pattern matching. They shape how the agent thinks and communicates, not what specific actions it takes.

## Consequences

- Tier 1 hooks are the highest-reliability requirement. Bugs in these hooks block work.
- Tier 2 hooks can be noisy. False positives are acceptable because they don't block.
- Tier 3 compliance is not verifiable in real-time. Post-hoc audit (event logs, brain entries) is the only check.
- Moving a SO from Tier 3 to Tier 2 requires writing a new hook. Moving from Tier 2 to Tier 1 requires changing exit codes from 0 to 2 — a high-stakes decision.
