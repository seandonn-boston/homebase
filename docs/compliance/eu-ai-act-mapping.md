# EU AI Act Compliance Mapping (R-09)

> Maps EU AI Act articles to Admiral Framework implementations

**Last updated:** 2026-04-09

---

## Risk Classification Mapping

| EU AI Act Risk Level | Admiral Decision Authority Tier | Example |
|---|---|---|
| Unacceptable (prohibited) | Enforced (hard-block) | `prohibitions_enforcer.sh` blocks bypass attempts |
| High-risk | Propose (human review required) | Fleet resize, scope changes require Admiral approval |
| Limited risk | Autonomous (with constraints) | Routine code generation within scope boundaries |
| Minimal risk | Autonomous | Read-only operations, status queries |

## Key Article Mappings

### Article 6: Classification of AI Systems

Admiral's 4-tier Decision Authority model (Enforced → Autonomous → Propose → Escalate) maps directly to the EU AI Act's risk-based approach. Each agent's authority tier determines which operations require human oversight.

### Article 9: Risk Management System

| Requirement | Admiral Implementation |
|---|---|
| Identify and analyze risks | Standing Orders define known risk categories; Brain B2 stores risk precedents |
| Estimate and evaluate risks | Progressive Autonomy scores track trust levels; RunawayDetector monitors for anomalies |
| Adopt risk management measures | Hooks enforce deterministic risk mitigation on every tool call |
| Test and document | 384+ TS tests, 350+ bash tests, 30 ATK attack corpus scenarios |

### Article 13: Transparency

| Requirement | Admiral Implementation |
|---|---|
| Understandable instructions | AGENTS.md, CONTRIBUTING.md, development walkthroughs |
| Capabilities and limitations | Per-agent definitions with explicit Does-NOT-Do lists |
| Intended purpose | Ground Truth document, agent role descriptions |
| Human oversight measures | Decision Authority tiers, Admiral approval API (AU-11) |

### Article 14: Human Oversight

| Requirement | Admiral Implementation |
|---|---|
| Enable oversight by natural persons | Admiral (human operator) has ultimate authority; approval API for trust decisions |
| Override or stop system | Escalation pipeline, agent pausing via control plane |
| Understand capabilities | Fleet dashboard, governance dashboard, execution trace visualization |
| Intervene in real-time | PreToolUse hooks can hard-block any action before execution |

### Article 15: Accuracy, Robustness, Cybersecurity

| Requirement | Admiral Implementation |
|---|---|
| Accuracy measures | Quality gate pipeline (6 stages), test coverage enforcement |
| Robustness | Chaos testing, graceful degradation, fault injection tests |
| Cybersecurity | 5-layer injection defense, 90-pattern detector, attack corpus, SBOM generation |

---

## Gap Analysis

| EU AI Act Requirement | Status | Gap Description |
|---|---|---|
| Risk classification documentation | Covered | Decision Authority tiers serve as risk classification |
| Fundamental rights assessment | Partial | SO-13 (Bias Awareness) addresses bias; broader rights assessment framework could be extended |
| Registration in EU database | Not applicable | Admiral is a governance framework, not a standalone AI system requiring registration |
| Conformity assessment | Covered | Rating system (RT-01 to RT-10) provides self-assessment; ISO 42001 alignment provides external reference |

**Overall: High coverage with minor gap in fundamental rights assessment breadth.**
