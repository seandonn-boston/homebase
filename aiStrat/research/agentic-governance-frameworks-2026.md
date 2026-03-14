# Agentic AI Governance Frameworks: Comprehensive Research Report

**Date:** March 2026
**Scope:** Analysis of major governance frameworks, standards initiatives, and operating philosophies for agentic AI systems

---

## 1. McKinsey's "Agentic Organization" Framework

**Source:** [The agentic organization: Contours of the next paradigm for the AI era](https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-agentic-organization-contours-of-the-next-paradigm-for-the-ai-era) (Sept 2025); [Six shifts to build the agentic organization of the future](https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-organization-blog/six-shifts-to-build-the-agentic-organization-of-the-future) (Oct 2025)

**Core Thesis:** AI is bringing the largest organizational paradigm shift since the industrial and digital revolutions. The "agentic organization" unites humans and AI agents -- both virtual and physical -- working side by side at scale at near-zero marginal cost. This is not about bolting AI onto existing processes; it demands a fundamental redesign of the enterprise.

**Five Pillars:**
1. **Business Model** -- Competitive advantage via AI-first customer channels, real-time hyperpersonalization, proprietary data as a "walled garden" superpower.
2. **Operating Model** -- Shift from hierarchical org charts to "agentic networks" or "work charts" based on exchanging tasks and outcomes. Flat decision structures with high context sharing.
3. **Governance** -- Real-time, data-driven, embedded governance (not periodic paper-heavy exercises). Humans hold final accountability.
4. **Workforce, People, and Culture** -- Humans move from executing activities to owning end-to-end outcomes. New roles emerge: agent orchestrators, hybrid managers, AI coaches.
5. **Technology and Data** -- Democratized tech supported by an "agentic AI mesh." Agent-to-agent protocols for easier integration. Build-vs-buy decisions based on competitive distinctiveness.

**Six Shifts:**
1. Reimagine work as AI-first (end-to-end redesign, not AI as add-on)
2. Rethink leadership roles and capabilities (tech fluency, ethical decision-making, system thinking)
3. Redesign roles and profiles (agent orchestrators, hybrid managers, AI coaches)
4. Build a culture of continuous reinvention (exponential tech vs. linear human adaptation)
5. Reshape organizational structures (leaner, flatter, human+agent teams)
6. Embed governance as a design driver (not an afterthought)

**Key Vocabulary:** Agentic organization, agentic networks, work charts (vs. org charts), human+agent teams, "above the loop" (humans overseeing rather than executing), near-zero marginal cost.

**Strengths:**
- Comprehensive organizational lens -- addresses business model, people, culture, structure, not just technology
- Recognizes this as a paradigm shift comparable to the industrial revolution, setting appropriate urgency
- Strong on the human dimension: 75% of jobs will need redesign by 2030
- Governance positioned as a "design driver" rather than a compliance afterthought

**Weaknesses:**
- Very high-altitude. Offers no implementable specification, technical controls, or governance mechanisms
- No risk taxonomy or threat model
- Light on accountability mechanics -- says "humans hold final accountability" without detailing how
- Primarily a strategy consulting pitch; light on specifics that would distinguish it from generic digital transformation advice
- No mention of multi-agent coordination risks, security, or adversarial threats

**Depth:** High-level principles and organizational strategy. Think of it as a CEO/board-level narrative, not an implementation guide. It answers "what must change" but not "how to do it."

---

## 2. Singapore IMDA's Model AI Governance Framework for Agentic AI

**Source:** [IMDA MGF for Agentic AI](https://www.imda.gov.sg/-/media/imda/files/about/emerging-tech-and-research/artificial-intelligence/mgf-for-agentic-ai.pdf) (Jan 2026); [Press Release](https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/press-releases/2026/new-model-ai-governance-framework-for-agentic-ai)

**Core Thesis:** Agentic AI introduces qualitatively new risks (unauthorized actions, erroneous decisions, cascading failures) that require extending -- not replacing -- existing AI governance principles. Humans must remain accountable, and governance must be calibrated to the level of autonomy granted.

**Four Governance Dimensions:**
1. **Risk-based autonomy calibration** -- Organizations determine the appropriate level of autonomy granted to agents based on risk assessment
2. **Human accountability and oversight** -- Clear mechanisms defining who is responsible and how oversight works
3. **Technical and organizational safeguards** -- Testing, access controls, monitoring
4. **End-user responsibility through transparency** -- Users must understand what agents can do and how to intervene

**Five Risk Categories:** Erroneous actions, unauthorized actions, biased/unfair actions, data breaches, and disruption to connected systems.

**Strengths:**
- First-of-its-kind government-issued framework specifically for agentic AI
- Builds on Singapore's established governance stack (2019 MGF, AI Verify, Global AI Assurance Pilot)
- Maps to OECD AI Principles and GPAI standards, providing international interoperability
- Practical risk categories grounded in real deployment scenarios
- Balances innovation with governance -- voluntary but signals regulatory trajectory

**Weaknesses:**
- Voluntary, non-binding -- no enforcement mechanism
- Relatively brief and principle-level; lacks the control-by-control specificity of AEGIS or ATF
- Does not deeply address multi-agent systems, agent-to-agent trust, or orchestration risks
- Limited treatment of the security dimension (CSA Singapore addressed this separately)
- No maturity model or phased implementation path

**Depth:** Mid-level. More specific than McKinsey (names risk categories, defines governance dimensions) but less implementable than CSA's ATF or Forrester's AEGIS. Best described as a governance policy template rather than a technical specification.

---

## 3. Cloud Security Alliance's Agentic Trust Framework (ATF)

**Source:** [The Agentic Trust Framework: Zero Trust for AI Agents](https://cloudsecurityalliance.org/blog/2026/02/02/the-agentic-trust-framework-zero-trust-governance-for-ai-agents); full specification on GitHub (CC BY 4.0)

**Core Thesis:** No AI agent should be trusted by default, regardless of purpose or claimed capability. Trust must be earned through demonstrated behavior and continuously verified through monitoring. This extends Zero Trust (NIST 800-207) from network security to AI agent governance.

**Five Trust Elements:**
1. **Identity** -- Who is this agent? Verifiable agent identity.
2. **Behavior** -- Is this agent doing what it should? Behavioral monitoring and verification.
3. **Data Governance** -- What data can this agent access and how?
4. **Segmentation** -- What blast radius does a compromised agent have?
5. **Incident Response** -- What happens when an agent goes rogue?

**Maturity-Based Promotion Model:**
- **Intern** -- Read-only mode. Can access data and generate insights but cannot modify external systems. Minimum 2 weeks before promotion.
- **Junior** -- Can recommend actions with reasoning but requires explicit human approval.
- Progression continues through to **Principal** level.

**Key Vocabulary:** Agentic Zero Trust, trust elements, maturity promotion, Agent Trust Verifier, Veracity Core, ConvoGuard (AI firewall), Least Agency, earned trust.

**Strengths:**
- Most technically specific of all frameworks reviewed -- includes an open specification, maturity model, and reference implementation (12 independently deployed services)
- Builds on the well-understood Zero Trust paradigm, making it immediately intuitive to security professionals
- The maturity/promotion model (Intern to Principal) is practical and memorable -- maps agent autonomy to demonstrated trustworthiness
- Open specification (CC BY 4.0), community-driven, with actual running code
- Aligns with OWASP Agentic Security Initiative and CoSAI

**Weaknesses:**
- Narrowly focused on security/trust -- does not address organizational transformation, workforce, business models, or cultural change
- The promotion model's fixed time thresholds (e.g., 2 weeks as Intern) are somewhat arbitrary and may not fit all contexts
- Primarily developed by one author (Josh Woodruff), though under CSA's banner
- No direct regulatory mapping (unlike Forrester's AEGIS)
- Assumes organizations already have Zero Trust infrastructure, which many do not

**Depth:** Deep and implementable. This is the closest thing to an actual engineering specification among the frameworks reviewed. It has a reference implementation on GitHub, defined service boundaries, and concrete maturity criteria.

---

## 4. World Economic Forum's "AI Agents in Action" Framework

**Source:** [AI Agents in Action: Foundations for Evaluation and Governance](https://www.weforum.org/publications/ai-agents-in-action-foundations-for-evaluation-and-governance/) (Nov 2025, with Capgemini)

**Core Thesis:** Governance of AI agents must be "progressive" -- the level of oversight and safeguards should be directly correlated with the agent's classification (autonomy, authority, complexity) and evaluation outcomes. One-size-fits-all governance will either stifle innovation or leave high-risk agents ungoverned.

**Key Concepts:**
- **Agent Classification System** -- Structured methodology covering function, role (specialist vs. generalist), predictability (deterministic vs. non-deterministic), autonomy level, authority level, use case, and environmental complexity.
- **Progressive Governance** -- Adaptive oversight calibrated to classification and evaluation outcomes. High-autonomy/high-authority agents in complex environments require more safeguards.
- **Agent Card** -- A "resume" for each AI agent documenting capabilities, limitations, intended use, and evaluation results before "onboarding" into an organization.
- **Contextual Evaluation** -- Testing agents in environments that mirror actual deployment conditions, not just benchmarks.

**Emerging Risks Identified:**
- Orchestration drift (agents plugged into other agents without shared context)
- Semantic misalignment (two agents interpret the same instruction differently)
- Security and trust gaps in multi-agent ecosystems

**Key Vocabulary:** Progressive governance, agent card, contextual evaluation, orchestration drift, semantic misalignment, agent onboarding.

**Strengths:**
- The classification system is the most rigorous taxonomy of agent types across all frameworks reviewed
- "Progressive governance" is a genuinely useful conceptual contribution -- maps governance intensity to risk
- The "Agent Card" concept is practical and immediately implementable
- Identifies multi-agent coordination risks (orchestration drift, semantic misalignment) that most other frameworks ignore
- Multi-stakeholder credibility (WEF + Capgemini + broad industry input)

**Weaknesses:**
- As a WEF white paper, it is advisory and aspirational -- no enforcement, no compliance path
- Evaluation methodology is described at a conceptual level, not a detailed test specification
- Does not provide specific governance controls or technical mechanisms
- Limited guidance on implementation sequencing or organizational change management
- The breadth of the classification system could make it complex to apply in practice

**Depth:** Mid-level, leaning conceptual. Strongest on taxonomy and classification. The "Agent Card" and "Progressive Governance" concepts are portable and could be adopted into more technical frameworks.

---

## 5. NIST AI Agent Standards Initiative

**Source:** [NIST CAISI AI Agent Standards Initiative](https://www.nist.gov/caisi/ai-agent-standards-initiative) (Feb 2026); [Announcement](https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure)

**Core Thesis:** The next generation of autonomous AI agents needs industry-led technical standards and open protocols to ensure they can be adopted with confidence, function securely on behalf of users, and interoperate across the digital ecosystem. U.S. leadership at the technological frontier requires getting standards right.

**Focus Areas (anticipated):**
1. Security controls and risk management tailored to AI agents
2. Governance and oversight controls (human supervision, escalation, access controls, accountability)
3. Secure development lifecycle practices (validation, red-teaming, change management)
4. Monitoring, logging, and incident response
5. Agent identity and authorization (NCCoE concept paper on applying existing IAM standards to AI agents)

**Strengths:**
- NIST's track record of voluntary-to-mandatory influence (AI RMF appeared in executive orders, state laws, and procurement requirements within 18 months)
- International coordination with EU ENISA, Japan AIST, and ISO/IEC JTC 1/SC 42 -- aiming for mutual recognition by 2027
- Identity and authorization work (NCCoE concept paper) addresses a critical gap most frameworks ignore
- Public comment process ensures broad stakeholder input
- Will likely become the de facto U.S. compliance baseline

**Weaknesses:**
- Still in its earliest stages -- no published standard yet, only RFIs and concept papers
- Timeline is measured in years, not months. Substantive output expected 2027-2028
- Currently more of a "call for input" than a framework
- Scope is potentially enormous, raising concerns about focus and timeliness
- Government pace may lag behind the speed of agentic AI deployment

**Depth:** Currently shallow (pre-framework stage), but trajectory points toward deep, implementable standards. Organizations should monitor this closely but cannot rely on it today.

---

## 6. Forrester's AEGIS Framework

**Source:** [Introducing AEGIS](https://www.forrester.com/blogs/introducing-aegis-the-guardrails-cisos-need-for-the-agentic-enterprise/); [AEGIS as the New Standard for AI Governance](https://www.forrester.com/blogs/forrester-aegis-the-new-standard-for-ai-governance/)

**Core Thesis:** As enterprises race to deploy agentic AI, CISOs must pivot from securing systems to securing intent. Traditional cybersecurity architectures were not designed for self-directed agents that operate autonomously and make real-time decisions. AEGIS provides cross-referenced, regulation-aware guardrails.

**39 Controls Across Six Domains:**
1. **Governance, Risk, and Compliance (GRC)** -- Machine-executable, context-aware policy enforcement
2. **Identity and Access Management (IAM)** -- Agents treated as "hybrid identities" with just-in-time privileges
3. **Data Security and Privacy** -- Data integrity, unified governance, privacy-preserving operations
4. **Application Security and DevSecOps** -- Security embedded throughout the AI lifecycle
5. **Threat Management and Security Operations** -- Real-time monitoring, logging, detection engineering for AI-specific risks
6. **Zero Trust Principles** -- "Least agency" (minimal permissions for an agent's goals)

**Regulatory Crosswalk:** 80% of controls map to 4+ major frameworks. 15 controls map to all five of: NIST AI RMF, EU AI Act, OWASP Top 10 for LLMs, MITRE ATLAS, and ISO/IEC 42001:2023. The EU AI Act alone maps to 80 references within AEGIS.

**Companion Concepts:**
- **Agent on a Page** -- Documentation template for each agent: owner, purpose, context, knowledge base, tasks, tool access, cooperation patterns. Functions as both a business alignment tool and a threat model input.
- **Agent Control Plane** -- Vendor-agnostic management layer for visibility, governance, and control across a heterogeneous agent estate.

**Key Vocabulary:** AEGIS, least agency, hybrid identities, agent control plane, agent on a page, regulatory crosswalk, GRC-01/DATA-01 (control naming).

**Strengths:**
- Most regulation-aware framework reviewed -- explicit mapping to EU AI Act, NIST, OWASP, MITRE ATLAS, ISO 42001
- 39 controls provide concrete, auditable requirements (vs. principles alone)
- The "Agent on a Page" concept is immediately practical
- Phased implementation roadmap (governance first, then IAM, then DevSecOps, then Zero Trust)
- Introduces "least agency" as an evolution of "least privilege" for the agentic era
- CISO-oriented -- speaks the language of enterprise security leaders

**Weaknesses:**
- Behind Forrester's paywall; the full report with all 39 controls is not freely available
- Primarily security/CISO-focused -- does not address organizational design, culture, business model transformation
- The density of cross-references (5 frameworks, 39 controls) may create implementation paralysis
- No open specification or reference implementation (unlike CSA's ATF)
- Vendor-agnostic in principle but effectively requires significant tooling investment

**Depth:** Deep and implementable for security professionals. The regulatory crosswalk alone makes it valuable for compliance-driven organizations. However, it is a security framework, not a holistic organizational philosophy.

---

## 7. Gartner's AI TRiSM Framework

**Source:** [AI Trust, Risk and Security](https://www.gartner.com/en/articles/ai-trust-and-ai-risk); [AI TRiSM Guide](https://www.avepoint.com/blog/protect/ai-trism-framework-by-gartner-guide)

**Core Thesis:** AI introduces risks that existing evaluation and governance approaches were never designed to manage. Trust, Risk, and Security Management (TRiSM) provides layered defenses applicable to all AI implementations.

**Four-Layer Technology Pyramid:**
1. **AI Governance** (top) -- Unified visibility and traceability across all enterprise AI assets
2. **AI Runtime Inspection and Enforcement** -- Real-time monitoring of models, applications, and agent interactions for risks, anomalies, policy violations
3. **Information Governance** -- Ensuring AI models access only properly secured and permissioned data
4. **Infrastructure and Traditional Technology Protection** -- Standard cybersecurity applied to the AI stack

**Agentic-Specific Concepts:**
- **Guardian Agents** -- Gartner's concept of "Sentinels" (AI information posture management agents) and "Operatives" that provide real-time governance
- Prediction: 80% of unauthorized AI transactions through 2026 will stem from internal policy violations (oversharing, misuse), not external attacks

**Strengths:**
- Broad market influence -- Gartner's reach means AI TRiSM shapes vendor roadmaps and enterprise procurement
- The four-layer pyramid provides a clear mental model for what capabilities are needed
- "Guardian Agents" concept is forward-looking -- using AI to govern AI
- Strong data point: 80% of AI incidents will be internal, not adversarial -- shifts focus appropriately

**Weaknesses:**
- AI TRiSM predates the agentic era and was not designed specifically for autonomous agents
- More of a market category and technology taxonomy than an implementable governance framework
- Gartner's primary output is vendor evaluations and market guides, not open specifications
- No control-by-control mapping or regulatory crosswalk
- Behind Gartner's paywall for detailed content

**Depth:** Mid-level. Best understood as a technology market category that shapes what vendors build, rather than a governance framework organizations implement directly.

---

## 8. Additional Frameworks

### 8a. OWASP Top 10 for Agentic Applications

**Source:** [OWASP GenAI Security Project](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/) (Dec 2025)

**Top 10 Risks:** Goal Hijacking (ASI01), Tool Misuse (ASI02), Identity and Privilege Abuse (ASI03), Supply Chain Vulnerabilities (ASI04), Impact Chain / Blast Radius (ASI05), Memory and Context Poisoning (ASI06), Insecure Inter-Agent Communication (ASI07), Cascading Failures (ASI08), Human-Agent Trust Exploitation (ASI09), Rogue Agents (ASI10).

Community-driven with 100+ researchers, validated by NIST and European Commission representatives. The most authoritative threat taxonomy for agentic AI. Threat-focused, not governance-focused.

### 8b. OpenAI's "Practices for Governing Agentic AI Systems"

**Source:** [OpenAI Paper](https://openai.com/index/practices-for-governing-agentic-ai-systems/) (Dec 2023)

**Seven Practices:** Pre-evaluate agent suitability, maintain legibility of agent activity, implement automatic monitoring, ensure interruptibility, require human approval for significant decisions, limit agent capabilities, deploy gradual rollout.

Early and influential (Dec 2023). Clear accountability principle: someone must be accountable for every harm. Written before the agentic deployment wave of 2025; does not address multi-agent systems.

### 8c. KPMG's TACO Framework

**Source:** [KPMG AI Governance for the Agentic AI Era](https://kpmg.com/us/en/articles/2025/ai-governance-for-the-agentic-ai-era.html)

**Taxonomy:** Taskers (single goals), Automators (cross-system workflows), Collaborators (human-AI teamwork), Orchestrators (multi-agent coordination). Each type has different risk profiles and governance needs. Useful taxonomy for planning, not for implementation.

### 8d. Anthropic's Responsible Scaling Policy (v3.0)

**Source:** [Anthropic RSP v3.0](https://www.anthropic.com/news/responsible-scaling-policy-v3) (Feb 2026)

AI Safety Levels (ASL-1 through ASL-4+), Frontier Safety Roadmaps with transparent grading, Risk Reports every 3-6 months. Most explicit capability-scaling framework from any AI lab. Not a governance framework for deployers -- it governs the lab itself.

---

## Cross-Framework Synthesis

### The Landscape in Four Layers

| Layer | Frameworks | What They Provide |
|-------|-----------|-------------------|
| **Organizational Philosophy** | McKinsey Agentic Organization | Why the enterprise must change, what the future looks like |
| **Governance Principles** | Singapore IMDA MGF, WEF AI Agents in Action, OpenAI Practices | What principles should guide governance, how to classify and evaluate agents |
| **Security Controls** | Forrester AEGIS, CSA ATF, Gartner AI TRiSM | What specific controls to implement, how to map to regulations |
| **Threat Intelligence** | OWASP Top 10 for Agentic Apps | What can go wrong, what attack surfaces exist |

### What Exists Today vs. What Is Missing

- There is a surfeit of high-level principles and a growing body of security controls
- **No single end-to-end framework** spans from organizational philosophy through to implementable technical controls
- **Multi-agent governance** (agent-to-agent trust, orchestration drift, semantic misalignment) is the least mature area -- only the WEF paper seriously addresses it
- **Agent identity and authorization** is a critical gap that only NIST's NCCoE work and CSA's ATF are beginning to address
- **No framework adequately addresses liability allocation** in multi-party agent chains (who is responsible when Agent A calls Agent B which calls Agent C and something breaks?)
- The OWASP threat taxonomy and Forrester's regulatory crosswalk are the most practically useful artifacts for security teams today
- McKinsey's organizational lens and the WEF's classification system are the most useful artifacts for strategic leaders

### Key Convergent Concepts Across All Frameworks

- **"Least Agency"** (not just least privilege, but least autonomy)
- **Risk-proportional governance** (more autonomy = more oversight)
- **Agent identity** as a first-class governance concern
- **Human accountability** as non-negotiable, even as human involvement decreases
- **Governance must be continuous and embedded**, not periodic and document-based

---

## Sources

- [McKinsey: The Agentic Organization](https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-agentic-organization-contours-of-the-next-paradigm-for-the-ai-era)
- [McKinsey: Six Shifts](https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-organization-blog/six-shifts-to-build-the-agentic-organization-of-the-future)
- [Singapore IMDA MGF for Agentic AI (PDF)](https://www.imda.gov.sg/-/media/imda/files/about/emerging-tech-and-research/artificial-intelligence/mgf-for-agentic-ai.pdf)
- [Singapore IMDA Press Release](https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/press-releases/2026/new-model-ai-governance-framework-for-agentic-ai)
- [CSA Agentic Trust Framework](https://cloudsecurityalliance.org/blog/2026/02/02/the-agentic-trust-framework-zero-trust-governance-for-ai-agents)
- [WEF AI Agents in Action](https://www.weforum.org/publications/ai-agents-in-action-foundations-for-evaluation-and-governance/)
- [NIST AI Agent Standards Initiative](https://www.nist.gov/caisi/ai-agent-standards-initiative)
- [Forrester AEGIS Introduction](https://www.forrester.com/blogs/introducing-aegis-the-guardrails-cisos-need-for-the-agentic-enterprise/)
- [Forrester AEGIS as Governance Standard](https://www.forrester.com/blogs/forrester-aegis-the-new-standard-for-ai-governance/)
- [Gartner AI TRiSM](https://www.gartner.com/en/articles/ai-trust-and-ai-risk)
- [OWASP Top 10 for Agentic Applications](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/)
- [OpenAI Practices for Governing Agentic AI Systems](https://openai.com/index/practices-for-governing-agentic-ai-systems/)
- [KPMG AI Governance for the Agentic AI Era](https://kpmg.com/us/en/articles/2025/ai-governance-for-the-agentic-ai-era.html)
- [Anthropic RSP v3.0](https://www.anthropic.com/news/responsible-scaling-policy-v3)
- [NIST Announcement](https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure)
