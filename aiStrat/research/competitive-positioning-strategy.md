<!-- Admiral Framework v0.3.1-alpha -->
# Admiral Competitive Positioning Strategy

**Date:** March 13, 2026
**Focus:** What to adopt, who to work with, where to hold firm

---

## SECTION 1: WHAT TO ADOPT

### Adopt the Vocabulary, Not the Architecture

Admiral's concepts are often more precise than competitors'. But precision doesn't matter if nobody finds you. The strategy: **adopt competitors' terminology as aliases and cross-references** so Admiral shows up when people search for what they already know.

---

### 1A. McKinsey's "Agentic Organization" Vocabulary

**Action:** Publish a mapping appendix showing how Admiral's 11 parts implement McKinsey's five pillars.

| McKinsey Pillar | Admiral Implementation |
|---|---|
| Business model | Section 06 (Strategy) — mission decomposition, value streams |
| Operating model | Sections 08-09 (Enforcement, Fleet) — role architecture, routing |
| Governance | Sections 08, 09, 23 (Enforcement spectrum, decision authority, standing orders) |
| Workforce, people, culture | Section 10 (Admiral role) — intent engineering, human inflection points |
| Technology and data | Sections 12, 14, 16 (Platform, Protocols, Brain) |

McKinsey's "embedded control agents" = Admiral's governance agents (Sentinel, Arbiter, Loop Breaker).
McKinsey's "humans above the loop" = Admiral's "Admiral" role.

**Do NOT** rename Admiral's parts to match McKinsey's pillars. Admiral's structure is more precise and implementation-oriented. Just build the bridge.

---

### 1B. Singapore IMDA's "Action-Space" and "Autonomy" Framing

**Action:** Add cross-references in Sections 09 and 12.

- "Action-space" = Admiral's Tool & Capability Registry (Section 12) + Negative Tool Lists
- "Autonomy" = Admiral's Decision Authority Tiers (Section 09)

One line in each section: *"This section implements what Singapore's MGF for Agentic AI calls 'autonomy' (Section 09) and 'action-space' (Section 12)."*

This positions Admiral as the implementation specification that satisfies Singapore's regulatory requirements.

---

### 1C. WEF's "Agent Cards"

**Action:** Define an "Agent Card" export format in Section 14 (Protocol Integration).

Admiral's agent definitions are already richer than WEF's Agent Card concept (71 roles with capability declarations, authority scoping, interface contracts). An Agent Card is a *subset* of an Admiral agent definition — the publicly shareable portion.

Make every Admiral agent definition capable of generating a standards-compliant Agent Card (compatible with A2A's Agent Card spec). This positions Admiral's fleet catalog as the **source-of-truth that produces Agent Cards**, rather than competing with the concept.

---

### 1D. OWASP Agentic Top 10

**Action:** Add a mapping table in Section 23 (Failure Modes).

Format: *"OWASP Risk X → Admiral Failure Modes Y, Z → Admiral Defenses (Standing Order N, Hook M, Governance Agent P)"*

OWASP catalogs risks. Admiral designs operational responses. The mapping shows Admiral *operationalizes* OWASP's risk identification.

---

### 1E. NIST Identity/Authorization Standards

**Action:** Add explicit references in Sections 14 and 16 to NIST SP 800-207 (Zero Trust), the NCCoE concept paper on AI agent identity, and SPIFFE/SPIRE.

Admiral's identity token specification already aligns with NIST's direction. Make the alignment visible.

---

### 1F. Forrester's AEGIS Framework (NEW — important find)

**Action:** Map Admiral's controls to AEGIS's 39 controls across six domains.

AEGIS (Agentic AI Enterprise Guardrails for Information Security) is Forrester's six-domain, 39-control framework for CISOs. 80% of its controls map to four or more major frameworks (NIST AI RMF, EU AI Act, OWASP, MITRE ATLAS, ISO 42001). It's becoming the CISO's checklist for agent security.

Admiral should publish a compliance crosswalk showing which Admiral sections satisfy which AEGIS controls. This makes Admiral "AEGIS-compatible" — a powerful claim when talking to security teams.

---

### 1G. KPMG's TACO Framework (NEW — important find)

**Action:** Acknowledge as an agent classification scheme. Map Admiral's 71 roles to TACO categories.

KPMG's TACO (Taskers, Automators, Collaborators, Orchestrators) is becoming the default vocabulary for classifying agent types in enterprise conversations. Admiral's 71 roles can be tagged with their TACO classification:
- Most specialist agents = Taskers or Automators
- Governance agents = Collaborators
- Command agents (Fleet Captain, Triage Router) = Orchestrators

This doesn't change Admiral's architecture — it adds a tag that KPMG-trained executives will recognize.

---

### 1H. Gartner AI TRiSM — "Guardian Agents"

**Action:** Acknowledge Gartner's vocabulary in Admiral's Monitor layer documentation.

Gartner's "Guardian Agents" concept (Sentinels and Operatives providing real-time governance) is functionally what Admiral already specifies — governance agents like Sentinel, Arbiter, Loop Breaker, Token Budgeter, and Hallucination Auditor. The difference: Gartner named the market category; Admiral specifies the roles.

Add a note in the Monitor/governance agent sections: *"These governance agents implement what Gartner's AI TRiSM framework calls 'Guardian Agents' — AI systems that monitor and govern other AI systems in real time."*

This matters because Gartner shapes procurement. When a CTO asks their Gartner analyst "do we have Guardian Agents?", the answer should be "yes, your Admiral-governed fleet includes five specialized governance agents."

---

### 1I. Anthropic RSP — AI Safety Levels

**Action:** Map Admiral's progressive adoption (L1-L4) to Anthropic's ASL levels in Section 06.

Anthropic's ASL-1 through ASL-4+ framework governs lab-side model safety. Admiral's L1-L4 governs deployment-side operational governance. They're different scopes but share the same principle: safety scales with capability. Making the mapping explicit positions Admiral as the deployment-side complement to Anthropic's development-side governance.

---

### What NOT to Adopt

**CSA ATF's "Intern → Principal" metaphor.** Acknowledge it, but don't adopt it. It maps agents to employee role titles, which contradicts Admiral's core thesis that agents are "neither employees nor software." Admiral's trust calibration (Section 33) is more granular — per-category, tied to specific authority tiers, not global role titles. Note it as "a simplified view of trust calibration suitable for security-focused audiences."

**Gartner's four-layer pyramid as organizational structure.** AI TRiSM's layers (Governance → Runtime Inspection → Information Governance → Infrastructure) are a technology purchasing taxonomy, not an operational architecture. Admiral's 11-part doctrine is purpose-built for how agents actually operate. Don't reorganize Admiral to match Gartner's buying guide.

---

## SECTION 2: WHO TO WORK WITH

### Integration Partners (Complementary)

| Partner | Relationship | Why |
|---|---|---|
| **Anthropic (MCP, Claude)** | Primary integration partner | MCP is Admiral's protocol layer. Claude is the reference model. Admiral provides governance doctrine that Anthropic intentionally leaves to users. |
| **Google (A2A, ADK)** | Protocol partner | A2A is Admiral's cross-agent communication layer. No overlap in value proposition. |
| **CrewAI** | Platform partner (with tension) | Leading orchestration framework. Publish an "Admiral on CrewAI" integration guide before CrewAI develops its own governance doctrine. |
| **LangGraph/LangSmith** | Platform partner | Lower competitive tension than CrewAI. Publish an "Admiral on LangGraph" integration guide. |
| **OWASP** | Risk taxonomy partner | Pure complement. OWASP defines risk categories; Admiral provides operational response. |

### Standards Bodies to Engage

| Body | Priority | Action |
|---|---|---|
| **NIST CAISI** | HIGHEST | Submit comments to AI Agent Standards Initiative. Position Admiral as reference implementation. Participate in sector-specific listening sessions. |
| **Singapore IMDA** | HIGH | Publish compliance mapping showing Admiral implements MGF for Agentic AI. |
| **Cloud Security Alliance** | HIGH | Engage ATF working group. Propose that ATF become a "security profile" within Admiral's broader governance framework. |
| **Linux Foundation (MCP, A2A)** | MEDIUM-HIGH | Track protocol specs. Participate in working groups to ensure governance use cases are represented. |
| **WEF** | MEDIUM | Vocabulary alignment (Agent Cards). Convening power, not technical collaboration. |
| **Forrester** | MEDIUM-HIGH | AEGIS compliance crosswalk. Forrester is the analyst firm most focused on agentic security. Publishing an AEGIS mapping makes Admiral auditable by security teams. |
| **Gartner** | MEDIUM | Position Admiral's governance agents as the implementation of Gartner's "Guardian Agents" concept. Get cited in Gartner's AI TRiSM Market Guide. |

### Platforms to Certify Compatibility With

| Platform | Priority | What "Compatible" Means |
|---|---|---|
| **Claude Code** | HIGHEST | Already the reference implementation platform. Publish Level 1-4 adoption guides specifically for Claude Code. |
| **CrewAI Enterprise** | HIGH | Admiral's fleet catalog deploys on CrewAI. Governance agents run as CrewAI crew members. |
| **LangGraph** | HIGH | Routing logic as LangGraph graphs. Governance hooks as node callbacks. |
| **Microsoft Agent Framework** | MEDIUM-HIGH | Standing orders and decision authority layer onto Microsoft's RBAC and lifecycle management. |
| **OpenAI Frontier** | MEDIUM | Model-agnostic stance means compatibility is still valuable despite competitive positioning overlap. |

---

## SECTION 3: WHERE TO HOLD FIRM

These are Admiral's non-negotiable positions — ideas that no competitor has, and architectural decisions that must not be diluted.

### Unique Ideas to Defend

#### 1. The Enforcement Spectrum (Hooks vs. Instructions)

**Admiral's most original and defensible insight.** The distinction between mechanical enforcement (hooks that fire 100% of the time regardless of context pressure) and advisory instructions (that degrade under context pressure) exists in no other framework, specification, government document, or consulting methodology.

CSA ATF talks about "controls." Singapore's MGF talks about "technical controls." NIST talks about "guardrails." Forrester AEGIS talks about "machine-executable enforcement." **None of them distinguish between enforcement classes based on reliability under context pressure.** This directly addresses instruction decay — a failure mode every long-running agent session encounters.

**Position:** Never merge the enforcement spectrum into a single "controls" or "guardrails" category. The three tiers (hard enforcement / firm guidance / soft guidance) with the explicit principle that safety and security constraints MUST be hooks is Admiral's most differentiated contribution.

---

#### 2. Standing Orders as Mechanical Invariants

Fifteen non-negotiable rules with an explicit priority hierarchy (Safety > Authority > Process > Communication > Scope). No other framework specifies invariant behavioral rules for agents. CSA ATF has "governance elements." Singapore's MGF has "governance dimensions." Forrester AEGIS has "controls." None produce a concrete, numbered, prioritized set of rules that every agent in a fleet must follow.

**Position:** Do not reduce Standing Orders to "best practices" or "guidelines." They are non-negotiable and mechanically loaded. Their power comes from their invariance.

---

#### 3. Intent Engineering as a Named Discipline

The formalization of intent engineering — structuring instructions around outcomes, values, constraints, failure modes, and judgment boundaries — as the evolution beyond prompt engineering and context engineering. The Six Elements of Intent (Goal, Priority, Constraints, Failure Modes, Judgment Boundaries, Values) provide a concrete methodology.

No other framework has named or formalized this practice. Anthropic talks about "context engineering." McKinsey talks about "operating model design." Neither provides a structured methodology.

**Position:** Continue developing intent engineering as Admiral's signature methodology. It has the potential to become the standard vocabulary for human-to-agent instruction design.

---

#### 4. The Brain as Fleet-Wide Institutional Memory

Other frameworks have agent memory. Admiral's Brain is architecturally different: fleet-wide institutional knowledge accumulation with vector embeddings, multi-hop reasoning chains, retrieval confidence levels, strengthening signals, decay awareness, and a quarantine immune system for external intelligence.

**Position:** Do not simplify the Brain to "agent memory" or "session history." The Brain's value is institutional knowledge that compounds across sessions, agents, and projects.

---

#### 5. The Human Inflection Point

The formal concept that there are moments during execution where the correct action requires human judgment, taste, ethics, or strategic context that an LLM cannot derive from training data — and the agent MUST stop and ask. Other frameworks talk about "human-in-the-loop" and "human override." Admiral uniquely formalizes the *recognition* of when human involvement is needed as a first-class concept.

**Position:** The Human Inflection Point is not just "escalation." It's a philosophical claim about the limits of autonomous agent authority.

---

### Architectural Decisions That Must Not Be Diluted

| Decision | Why It Matters |
|---|---|
| **"Agents are neither employees nor software"** | CSA ATF and KPMG use employee metaphors. Admiral must resist this — agents are amnesiac, non-deterministic, prone to hallucination, and incapable of learning from being told something twice. Employee metaphors lead to governance models that assume capabilities agents don't have. |
| **Model-agnostic by default** | OpenAI Frontier is model-locked. Microsoft privileges Azure AI. Admiral's stance is a strategic differentiator for enterprises running heterogeneous stacks. Do not optimize for any single provider. |
| **Specification as product** | Same form factor as NIST 800-53, OWASP Top 10, and Zero Trust (800-207) — all became industry standards precisely because they were implementation-agnostic. |
| **Progressive adoption (L1-L4) with anti-pattern warnings** | "The most common mistake is starting at Level 4." No other framework provides this guardrail. |
| **Zero-trust as default, not add-on** | CrewAI gates security behind Enterprise tier. LangSmith gates observability behind paid plans. In Admiral, security is architectural, not purchasable. |

---

## Summary Matrix

```
ADOPT their vocabulary, cite their standards:
  McKinsey → mapping appendix (five pillars)
  Singapore IMDA → cross-references ("action-space", "autonomy")
  WEF → Agent Card export format
  OWASP → risk mapping table
  NIST → identity standard references
  Forrester AEGIS → compliance crosswalk (39 controls)
  KPMG TACO → role classification tags
  Gartner TRiSM → "Guardian Agents" = Admiral's governance agents
  Anthropic RSP → ASL levels ↔ Admiral's L1-L4

ACKNOWLEDGE but differentiate:
  CSA ATF → simpler view of Admiral's trust calibration
  CrewAI Agent Repos → Admiral's fleet catalog is the governed superset
  Gartner 4-layer pyramid → purchasing taxonomy, not operational architecture

ENGAGE as standards partner:
  NIST CAISI (highest priority)
  Singapore IMDA
  Cloud Security Alliance
  Linux Foundation (MCP, A2A)
  Forrester (AEGIS crosswalk)
  Gartner (AI TRiSM Market Guide citation)

HOLD FIRM — non-negotiable:
  Enforcement spectrum (hooks vs. instructions)
  Standing Orders as mechanical invariants
  Intent engineering as named discipline
  Brain as fleet-wide institutional memory
  Human Inflection Point
  "Neither employees nor software"
  Model-agnostic
  Specification as product (doctrine IS the product)
  Progressive adoption with anti-pattern warnings
  Zero-trust as default
```

**Core strategic insight:** Admiral's competitors are converging on the same thesis, which validates the bet. The race is for the reference specification. **Adopt their words. Implement their aspirations. Hold firm on the original architecture.**

---

## Sources

- [McKinsey: The Agentic Organization](https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-agentic-organization-contours-of-the-next-paradigm-for-the-ai-era)
- [Singapore IMDA: MGF for Agentic AI](https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/press-releases/2026/new-model-ai-governance-framework-for-agentic-ai)
- [CSA: Agentic Trust Framework](https://cloudsecurityalliance.org/blog/2026/02/02/the-agentic-trust-framework-zero-trust-governance-for-ai-agents)
- [WEF: AI Agents in Action](https://www.weforum.org/publications/ai-agents-in-action-foundations-for-evaluation-and-governance/)
- [NIST: AI Agent Standards Initiative](https://www.nist.gov/caisi/ai-agent-standards-initiative)
- [Forrester: AEGIS Framework](https://www.forrester.com/blogs/introducing-aegis-the-guardrails-cisos-need-for-the-agentic-enterprise/)
- [KPMG: TACO Framework](https://kpmg.com/us/en/articles/2025/ai-governance-for-the-agentic-ai-era.html)
- [OWASP: Agentic Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
