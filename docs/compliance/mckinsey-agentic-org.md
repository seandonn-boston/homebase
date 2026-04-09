# McKinsey Agentic Organization Mapping (R-05)

> Maps Admiral's 11 spec parts to McKinsey's 5 pillars of the Agentic Organization

**Last updated:** 2026-04-09

---

## McKinsey's 5 Pillars → Admiral Mapping

### 1. Agentic Strategy & Operating Model

> McKinsey: Organizations must redesign operating models around AI agents as first-class participants.

| Admiral Component | Mapping |
|---|---|
| Spec Part 1: Identity & Authority | Defines agent roles, authority tiers, and governance boundaries |
| Ground Truth Document | Strategic foundation that scopes every agent's mission |
| Fleet Registry | Formal operating model for 71+ agent roles |

### 2. Embedded Control Agents

> McKinsey: Control agents monitor, govern, and intervene in real-time alongside worker agents.

| Admiral Component | Mapping |
|---|---|
| Governance Agents (Sentinel, Arbiter, Compliance Monitor) | Direct realization of McKinsey's embedded control concept |
| Meta-Governance (Stream 19) | Self-governing agents that monitor the governance agents themselves |
| RunawayDetector | Real-time anomaly detection embedded in the control plane |

### 3. Trust & Graduated Autonomy

> McKinsey: Trust must be earned incrementally through demonstrated performance.

| Admiral Component | Mapping |
|---|---|
| Progressive Autonomy (Stream 18) | 4-stage trust model (Supervised → Guided → Trusted → Autonomous) |
| Trust Scoring | Per-agent quality rates, rework costs, consecutive success tracking |
| Admiral Approval API (AU-11) | Human-in-the-loop for trust promotion decisions |

### 4. Knowledge & Institutional Memory

> McKinsey: Agentic organizations accumulate institutional knowledge that persists across sessions.

| Admiral Component | Mapping |
|---|---|
| Brain System (B1 → B2 → B3) | Three-tier knowledge persistence with graduation criteria |
| Knowledge Graph | 6 link types, multi-hop traversal, contradiction resolution |
| Maintenance Agents (Gardener, Curator, Harvester) | Automated knowledge lifecycle management |
| Context Engineering (Stream 30) | Optimal context window utilization for every agent |

### 5. Measurement & Continuous Improvement

> McKinsey: Systematic measurement of agent performance drives continuous improvement.

| Admiral Component | Mapping |
|---|---|
| Rating System (RT-01 to RT-10) | 5-tier rating scale (ADM-1 to ADM-5) with automated calculation |
| Quality Assurance System (QA-01 to QA-10) | 6-stage quality gate pipeline, debt tracking, complexity budgets |
| Thesis Validation (TV-01 to TV-09) | Evidence-based measurement of governance effectiveness |
| Scanner & Monitoring (MON-01 to MON-10) | Continuous ecosystem and codebase health monitoring |

---

## Coverage Assessment

| McKinsey Pillar | Admiral Coverage | Key Differentiator |
|---|---|---|
| Strategy & Operating Model | Full | Formal spec with 11 parts, not just guidelines |
| Embedded Control Agents | Full | Deterministic enforcement (hooks), not just advisory |
| Trust & Graduated Autonomy | Full | Quantitative trust scoring, not just policy |
| Knowledge & Institutional Memory | Full | Three-tier Brain with semantic search |
| Measurement & Improvement | Full | Automated rating, thesis validation with evidence |

**Admiral's key differentiator: deterministic enforcement. McKinsey describes what organizations should do; Admiral provides the infrastructure to actually do it.**
