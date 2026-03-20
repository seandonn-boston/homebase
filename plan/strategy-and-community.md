# Strategy & Community — Non-Engineering Items

> Items relocated from implementation streams because they are strategic, community, or academic tasks — not engineering work. They remain important but should not inflate the implementation plan's item count or distract from code-to-spec progress.

**Origin:** These items were identified during a plan gap analysis (2026-03-20) as not belonging in the engineering implementation plan.

---

## Community Strategy

- [ ] **R-12: Open-Source Community Strategy** *(DEFERRED Phase 3+)*
  - **Description:** Define a comprehensive plan for building a contributor community around Admiral. Cover governance model (benevolent dictator, steering committee, or foundation model), contribution workflow (fork-and-PR, issue triage process, review SLAs), release cadence (semantic versioning policy, LTS strategy, breaking change policy), community channels (discussions, Discord/Slack, office hours), recognition programs (contributor levels, maintainer path), and documentation requirements for contributions. Address the bootstrapping problem — how to attract the first 10, 100, and 1000 contributors. Include a licensing strategy review ensuring chosen license supports both open-source community and potential commercial offerings.
  - **Done when:** Community strategy document covering governance, contribution workflow, release cadence, and channels. First-contributor experience documented and tested (clone to merged PR in under 30 minutes). Maintainer onboarding guide. License compatibility analysis. Roadmap for first 12 months of community building with quarterly milestones.
  - **Files:** `docs/strategy/community-strategy.md` (new)
  - **Size:** M
  - **Originally in:** Stream 12 (Strategic Positioning)

## Academic Positioning

- [ ] **R-13: Academic Research Positioning** *(DEFERRED Phase 3+)*
  - **Description:** Position Admiral in the context of multi-agent systems (MAS) research and publish a framework description paper outline. Survey the academic landscape: BDI agent architectures, organizational models (AGR, MOISE+), normative multi-agent systems, electronic institutions, and recent LLM-based agent frameworks. Identify Admiral's novel contributions: governance-as-code for LLM agents, shell-native zero-dependency implementation, brain layer architecture for persistent agent memory, and standing orders as normative specifications. Draft an outline for a workshop or conference paper (suitable for AAMAS, AAAI, or a NeurIPS workshop) that positions Admiral as a practical contribution to the normative MAS literature.
  - **Done when:** Literature survey covering 20+ relevant papers across MAS governance, normative systems, and LLM agent frameworks. Clear articulation of Admiral's novel contributions vs. prior work. Paper outline with abstract, introduction, related work, system description, evaluation plan, and conclusion sections. Target venue identified with submission timeline. BibTeX file with all referenced works.
  - **Files:** `docs/strategy/academic-positioning.md` (new), `docs/strategy/paper-outline.md` (new)
  - **Size:** M
  - **Originally in:** Stream 12 (Strategic Positioning)

## Community Feedback

- [ ] **TV-10: Community feedback collection** *(relocated from Thesis Validation)*
  - **Description:** Create a framework for systematically collecting and acting on community feedback about Admiral's governance effectiveness. The framework includes: (1) feedback channels (GitHub Discussions categories, issue templates for governance feedback, structured feedback forms), (2) feedback taxonomy (enforcement feedback, documentation feedback, developer experience feedback, thesis challenge feedback), (3) feedback triage process (how feedback is categorized, prioritized, and routed to action), (4) feedback-to-improvement pipeline (how feedback becomes thesis evidence, spec changes, or implementation improvements), (5) public feedback summary (periodic summary of feedback received and actions taken, building trust through transparency). The framework should make it easy for users to challenge the thesis — disagreement is evidence too.
  - **Done when:** Feedback channels are defined with templates. Taxonomy covers all 4 feedback categories. Triage process is documented. Feedback-to-improvement pipeline is defined. Public summary template is created. GitHub issue templates for governance feedback are ready to deploy.
  - **Files:** `admiral/thesis/feedback/framework.md` (new), `admiral/thesis/feedback/templates/` (new directory), `admiral/thesis/feedback/triage_process.md` (new)
  - **Size:** S (< 1 hour)
  - **Originally in:** Stream 33 (Thesis Validation)

---

## Why These Items Were Relocated

These items share a common trait: they produce strategy documents, community infrastructure, or academic artifacts — not code that implements the Admiral spec. Keeping them in implementation streams inflates item counts and creates a misleading picture of engineering progress. They are still tracked and still valuable, but they belong in a separate planning context.

- **R-12** and **R-13** are community/academic strategy — they don't implement any spec part
- **TV-10** is community infrastructure — it creates feedback channels, not measurement code
