# Singapore IMDA Regulatory Alignment (R-06)

> Admiral-to-IMDA equivalences for APAC procurement compliance

**Last updated:** 2026-04-09

---

## IMDA Model AI Governance Framework Mapping

| IMDA Concept | Admiral Equivalent | Evidence |
|---|---|---|
| **Action-space** (what an agent can do) | Tool & Capability Registry | Fleet registry defines per-agent tool permissions, capability lists, path restrictions |
| **Autonomy levels** | Decision Authority Tiers | 4 tiers: Enforced → Autonomous → Propose → Escalate |
| **Human-on-the-loop** | PreToolUse hooks + Admiral approval | Deterministic hooks check every action; Admiral intervenes on escalations |
| **Human-in-the-loop** | Propose tier + Approval API | High-risk decisions require human review via AU-11 |
| **Transparency** | Audit trail + Event stream | SHA-256 hash chain, EventStream captures every action |
| **Accountability** | Identity tokens + Decision logging | Every action linked to agent identity, every decision recorded to Brain |
| **Safety** | Standing Orders + Injection defense | 16 SOs, 90-pattern injection detector, 5-layer quarantine |
| **Robustness** | Chaos testing + Graceful degradation | Simulation testing, fault injection, exponential backoff |

## IMDA's Internal Governance Structures

| IMDA Requirement | Admiral Implementation |
|---|---|
| Clear roles and responsibilities | Agent definitions with explicit authority, constraints, Does-NOT-Do lists |
| Risk management | Progressive autonomy tracks risk per agent; escalation pipeline handles incidents |
| Data governance | Brain entry classification, quarantine pipeline, sensitivity labels |
| Operations management | Fleet health monitoring, session thermal model, alert routing |

## Suitability for APAC Procurement

This document demonstrates Admiral's alignment with Singapore's IMDA Model AI Governance Framework, suitable for inclusion in procurement compliance packages targeting APAC markets. Admiral's deterministic enforcement model (hooks fire on every tool call, regardless of context) exceeds the advisory-only governance typical of competing frameworks.
