# Model Tier Assignments

**Matching model capability to agent role requirements.**

Not every agent needs the most capable model. Model selection is a cost-quality tradeoff: use the minimum tier that produces acceptable output quality for the role. Promote when rework costs exceed the tier upgrade. Demote when output at a higher tier is indistinguishable from lower.

-----

## Tier Definitions

| Tier | Profile | Cost | Latency | When to Use |
|---|---|---|---|---|
| **Tier 1: Flagship** | Deepest reasoning, largest context, strongest code | Highest | Highest | Decisions with cascading consequences, adversarial reasoning, system-level analysis |
| **Tier 2: Workhorse** | Strong general capability, solid code generation | Moderate | Moderate | Implementation, review, most specialist work |
| **Tier 3: Utility** | Fast, cheap, reliable for well-defined tasks | Low | Low | Classification, formatting, pattern matching, validation |
| **Tier 4: Economy** | Near-frontier at fraction of cost | Lowest | Varies | High-volume batch processing, cost-sensitive operations |

-----

## Default Tier Assignments by Agent

These are starting recommendations. Calibrate based on observed output quality and rework rates.

### Tier 1 — Flagship

Agents that make decisions with cascading consequences, perform adversarial reasoning, or must hold complex system topology in view:

| Agent | Rationale |
|---|---|
| Orchestrator | Decomposition quality determines everything downstream |
| Architect | Structural decisions constrain all subsequent work |
| Mediator | Conflict resolution requires deep multi-perspective reasoning |
| Devil's Advocate | Must generate genuinely challenging counter-arguments |
| Red Team Agent | Adversarial review requires strongest reasoning |
| Incident Response Agent | Production incidents require deep judgment under pressure |
| Role Crystallizer | Fleet evolution requires system-level pattern recognition |
| Bias Sentinel | Must detect subtle cognitive biases across agent outputs |
| All Scale agents (1–29) | Inhuman-scale analysis requires maximum reasoning capacity |

### Tier 2 — Workhorse

Agents that implement, review, and produce concrete deliverables:

| Agent | Rationale |
|---|---|
| Frontend Implementer | Strong code generation for UI work |
| Interaction Designer | Code generation + design sense |
| Accessibility Auditor | Standards-based analysis with judgment |
| Responsive Layout Agent | Code generation with cross-device reasoning |
| State Management Agent | Architecture + implementation |
| Backend Implementer | Core code generation |
| API Designer | Contract design requires balanced reasoning |
| Database Agent | Schema design + query optimization |
| Queue & Messaging Agent | Async pattern design |
| Cache Strategist | Performance reasoning |
| Integration Agent | Cross-system coordination |
| Migration Agent | Risk-aware transformation planning |
| Refactoring Agent | Code understanding + safe transformation |
| Dependency Manager | Ecosystem judgment |
| DevOps Agent | Pipeline design |
| Infrastructure Agent | IaC generation |
| Containerization Agent | Configuration generation |
| Observability Agent | Instrumentation design |
| QA Agent | Quality judgment |
| Unit Test Writer | Test design + edge case reasoning |
| E2E Test Writer | Cross-system test design |
| Performance Tester | Performance analysis |
| Chaos Agent | Failure scenario design |
| Regression Guardian | Behavioral stability analysis |
| Security Auditor | Vulnerability analysis |
| Penetration Tester | Attack path reasoning |
| Compliance Agent | Regulatory framework analysis |
| Privacy Agent | Data flow analysis |
| All Data & Analytics agents | Data pipeline and analysis |
| All Documentation & Design agents | Content generation and analysis |
| Simulated User | Authentic user behavior simulation |
| Persona Agent | Persona-specific reasoning |
| All Domain Specialization agents | Domain-specific implementation |
| All Lifecycle agents (except Incident Response) | Process management |
| Context Curator | Context assembly judgment |
| Drift Monitor | Must detect subtle scope creep and mission drift across sessions |
| Hallucination Auditor | Must verify claims against available evidence |
| Context Health Monitor | Must assess context window utilization and instruction decay |
| Contradiction Detector | Must identify inconsistencies across multi-agent outputs |

### Tier 3 — Utility

Agents with well-defined inputs, simple decision logic, and structured outputs:

| Agent | Rationale |
|---|---|
| Triage Agent | Classification against defined taxonomy |
| Data Validator | Schema and constraint checking |
| Pattern Enforcer | Rule-based scanning |
| Dependency Sentinel | Changelog monitoring and CVE matching |
| SEO Crawler | Structured audit against defined criteria |
| Token Budgeter | Cost tracking and budget enforcement against defined thresholds |
| Loop Breaker | Pattern matching for retry loops, circular handoffs, diminishing returns |

### Tier 4 — Economy

No default assignments. Use for high-volume batch variations of Tier 2/3 tasks where per-unit quality matters less than aggregate throughput.

-----

## Promotion and Demotion Signals

### Promote (move to higher tier) when:

- First-pass quality rate for the role drops below acceptable threshold
- Rework cost exceeds the cost difference between tiers
- The agent consistently requires human correction on judgment calls
- Error patterns indicate reasoning limitations rather than knowledge gaps

### Demote (move to lower tier) when:

- Output quality at the higher tier is indistinguishable from the lower tier
- A/B testing shows no meaningful quality difference between tiers
- The role's tasks have become more routine and well-defined over time
- Cost pressure requires optimization and the role's error tolerance allows it

### How to test:

Run the same task through both tiers. Compare outputs against acceptance criteria. If the lower tier passes at the same rate, demote. If the lower tier produces measurably worse output, keep the higher tier.

-----

## Multi-Model Patterns

For cost optimization without quality sacrifice:

- **Economy-tier first draft, flagship-tier review:** 80% of token volume at economy cost, flagship quality gates catch issues. Effective for high-volume implementation work.
- **Different models for adversarial review:** Use a different model family for QA than for implementation. Different models have different blind spots — cross-model review catches more.
- **Flagship decomposition, workhorse execution:** The Orchestrator (flagship) decomposes tasks with deep reasoning, then specialists (workhorse) execute the well-defined chunks.
