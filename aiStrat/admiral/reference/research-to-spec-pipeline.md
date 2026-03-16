# Research-to-Spec Pipeline

> **Audience:** Spec authors and Admiral. This document defines how research insights are formally incorporated into the Admiral Framework specification. It closes the gap between strategic research (in `research/`) and the canonical spec (in `aiStrat/`).
>
> **Update policy:** When new research is completed, add an entry to the Intake Log. When research is incorporated into the spec, move it to Incorporated. Research that is rejected or deferred should be documented with rationale.

-----

## Pipeline Process

```
Research created (research/)
  → Intake: logged here with summary and relevance assessment
    → Review: Admiral evaluates fit, priority, and spec impact
      → Incorporate: specific spec sections updated with citations
        → Close: entry moved to Incorporated with changelog
```

**Rules:**
1. Research does not modify spec directly. It feeds through this pipeline.
2. Every spec change driven by research must cite the source research document.
3. Strategic positioning (like the OS reframe) updates external-facing materials first, then spec language if warranted.
4. Research that contradicts existing spec requires an Escalate-tier decision before incorporation.

-----

## Incorporated Research

### R-01: AI Work OS Reframe

**Source:** `research/product-strategy-ai-work-os.md` (March 14, 2026)
**Core Insight:** Admiral's 15,000+ lines of specification already describe all operating system functions. Reframing from "governance framework" to "operating system for AI work" changes the adoption conversation from "do we need this?" to "which one do we use?"

**Spec Impact:**

| OS Function | Admiral Implementation | Spec Location |
|---|---|---|
| Process execution | Agent lifecycle, task routing, workflow decomposition | Parts 4, 6 |
| Process scheduling | Routing rules, model tier assignment, swarm patterns | Fleet routing-rules, model-tiers |
| Memory management | Brain architecture — persistent semantic memory | Brain L1-L3 specs |
| Security & access control | Zero-trust identity, decision authority tiers, enforcement spectrum | Parts 3, 11 |
| Inter-process communication | Interface contracts, agent-to-agent handoffs | Fleet interface-contracts |
| File system / storage | Institutional memory, context injection, ground truth | Parts 2, 5, 8 |
| Monitoring & logging | Fleet observability, cost tracking, failure mode catalog | Parts 7, 8, 9 |
| System administration | Admiral role, self-calibration, multi-operator governance | Part 10 |
| Device drivers | Model-agnostic abstraction layer, MCP integration | Parts 4, 11 |
| Boot sequence | Progressive adoption profiles, pre-flight checklist | Index, Appendices |

**Positioning Update:** External materials (sales pitch, index) should adopt the "AI Work OS" framing as the primary positioning. Spec internals retain precise technical language. The reframe is a positioning lens, not a spec rewrite.

**Status:** Incorporated into strategic positioning. Sales pitch updated to reference the OS metaphor. Spec language unchanged (intentional — the spec already describes OS functions; the reframe is about how we present them externally).

-----

### R-02: Engineering Ladder Mapping

**Source:** `research/future-operations.md` (March 14, 2026), `aiStrat/admiral/spec/part10-admiral.md`
**Core Insight:** Admiral creates new professional roles and career progressions that map to both the Admiral's personal growth trajectory and emerging organizational needs.

**Admiral Growth Trajectory** (already in spec, Part 10):

| Stage | Focus | Autonomy Level |
|---|---|---|
| **Novice** | Learn failure modes, build intuition | Narrow Autonomous — reviews everything |
| **Practitioner** | Refine trust calibration, develop intent fluency | Moderate Autonomous — reviews strategically |
| **Expert** | Framework evolution, cross-fleet governance | Wide Autonomous — rare interventions |
| **Master** | Extend the framework, mentor new Admirals | Fleet sustains quality autonomously |

**Emerging Organizational Roles** (from future-operations research):

| Role | Function | Maps To |
|---|---|---|
| **Fleet Admiral** | Governs multi-fleet operations across an organization | Admiral (Part 10) at Expert/Master stage |
| **Governance Engineer** | Implements and maintains enforcement hooks, standing orders | Hook implementer (Part 3) |
| **Brain Curator** | Manages institutional memory quality, relevance, and accuracy | Brain operator (Part 5) |
| **Fleet Ops** | Day-to-day fleet operation, monitoring, incident response | Orchestrator operator (Part 4) |
| **Intent Engineer** | Designs agent missions, boundaries, and success criteria using intent engineering | Intent engineering practitioner (Part 1) |

**Engineering Ladder Integration:**

| Traditional IC Level | Admiral-Era Equivalent | Key Skill Shift |
|---|---|---|
| Junior Engineer | Fleet Operator | From writing code → to reviewing fleet output and handling escalations |
| Senior Engineer | Intent Engineer / Governance Engineer | From implementation → to defining what to build and how to constrain it |
| Staff Engineer | Fleet Architect | From system design → to fleet topology, trust calibration, enforcement design |
| Principal Engineer | Fleet Admiral | From technical leadership → to multi-fleet governance strategy |

**Status:** Admiral growth trajectory exists in Part 10. Organizational role mapping and engineering ladder integration documented here as reference material for certification program design (R-03) and future-operations planning. No spec changes required — this is a reference mapping, not a spec modification.

-----

### R-03: Certification Process

**Source:** `research/monetizing-doctrine-playbook.md` (March 13, 2026), `aiStrat/admiral/reference/rating-system.md`
**Core Insight:** Certification creates career incentives, ecosystem demand, and a revenue engine. The ITIL/SAFe model proves pure doctrine can sustain a certification ecosystem.

**Certification Tiers:**

| Certification | Audience | Prerequisite | Assessment Method | Pricing Model |
|---|---|---|---|---|
| **Admiral Practitioner** | Anyone working with AI agents | None | Exam: foundational understanding of doctrine (L1-L2 adoption) | Free (freemium — drives adoption and vocabulary spread) |
| **Admiral Architect** | Fleet designers and governance leads | Practitioner | Exam + portfolio: design fleet governance for an organization (L3-L4) | Paid ($500-800, comparable to TOGAF) |
| **Admiral Certified Implementer (ACI)** | Consultants and trainers | Architect | Exam + demonstrated implementation + peer review | Paid ($1,000-2,000) |

**Organizational Certifications:**

| Certification | What It Proves | Assessment |
|---|---|---|
| **Admiral Compliant** | Organization has implemented the framework to a defined maturity level | Self-assessment (Tier 1) or independent assessment (Tier 2) per rating-system.md |
| **Admiral Certified Training Partner** | Authorized to deliver Admiral training and certification prep | Application + curriculum review + annual renewal |

**Certification ↔ Rating System Integration:**

The rating system (`rating-system.md`) provides the organizational assessment framework:
- **ADM-1 through ADM-5** ratings measure fleet governance maturity
- **Tier 1 (Self-Assessment)**, **Tier 2 (Independent)**, **Tier 3 (Full Certification)** assessment levels
- Individual certifications (Practitioner, Architect, ACI) are prerequisites for conducting Tier 2 and Tier 3 organizational assessments

**Freemium Rationale:** Anthropic Academy's free certification model (March 2, 2026) established a market expectation for free foundational AI certifications. Admiral Practitioner is free to match this expectation and drive adoption. Advanced certifications (Architect, ACI) remain paid because they certify a higher-order, vendor-neutral governance skill — comparable to TOGAF ($495-$1,200) or ITIL ($150-$1,000+), not to vendor product tutorials.

**Status:** Certification framework defined. Exam content and delivery infrastructure are Phase 5 (Commercialization) deliverables. Rating system already exists in spec. No spec changes required — certification is a business process built on top of the spec, not a spec modification.

-----

## Intake Log (Pending Incorporation)

| ID | Research Document | Summary | Priority | Spec Impact |
|----|------------------|---------|----------|-------------|
| R-04 | `research/competitive-landscape-2026.md` | Competitive positioning analysis | Medium | May update sales pitch competitive landscape section |
| R-05 | `research/patent-opportunity-analysis.md` | 23 patentable innovations identified | High | Phase 4 (IP Protection) — no spec changes, feeds patent filings |
| R-06 | `research/agentic-governance-frameworks-2026.md` | Governance framework landscape | Low | Reference material for positioning; spec is already differentiated |

-----

## Cross-References

- OS reframe strategy: `research/product-strategy-ai-work-os.md`
- Future operations: `research/future-operations.md`
- Monetization playbook: `research/monetizing-doctrine-playbook.md`
- Rating system: `rating-system.md`
- Admiral growth trajectory: `../spec/part10-admiral.md`
- Spec debt tracker: `spec-debt.md`
