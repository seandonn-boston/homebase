# PREPARATION: ai-fundamental-truths.md v1.0.0-alpha

**Status:** Pre-release preparation
**Created:** 2026-03-24
**Current version:** Unversioned draft (February 2026, revised March 2026)
**Target:** v1.0.0-alpha

This document tracks all major updates planned for the first versioned release of `ai-fundamental-truths.md`. The assessment of 2026-03-24 revealed structural issues that, if left unaddressed, will undermine the document's credibility with exactly the audience it needs to reach. These are not cosmetic fixes. They are load-bearing changes to the epistemological framework.

---

## Why This Is a Major Version Update

The document's central framing — calling its two foundational claims "axioms" — is wrong by the formal definition of the word. Axioms are self-evident, unfalsifiable starting assumptions. Both statements in the document are empirical claims supported by evidence, hedged with caveats, and expected to be revised. The document even says so explicitly.

This matters because:

1. The document positions itself as intellectually rigorous in a hype-filled space
2. Mislabeling the epistemology undercuts that positioning at the foundation
3. Fixing the label cascades into every section that builds on it
4. The "What's Not Going Anywhere" section has a logical tension with the second foundational claim that must be resolved

Everything downstream braces for the aftershock of getting the foundation right.

---

## Update Registry

### U-01: Restructure Epistemological Foundation ~~Rename "Axioms" to "Operating Premises"~~

**Priority:** Critical — this is the structural fix everything else depends on
**Status:** COMPLETE (2026-03-24), revised same day
**Changes applied:**
  - Added new "Three First Principles" section with three foundational principles: (1) Capability that exists will be deployed, (2) Value tracks scarcity not effort, (3) Beliefs must yield to evidence
  - Renamed "The Two Axioms" to "The Two Operating Premises"
  - Updated self-referential "This axiom applies" to "This premise applies"
  - The document now has correct epistemological layering: first principles (foundations we reason from) → operating premises (evidence-backed, revisable) → derived claims
**Naming evolution:** "Axioms" → challenged as not truly self-evident/unfalsifiable (nuclear weapons suppress capability; diamonds manufacture scarcity; Kuhn shows beliefs resist evidence) → renamed to "First Principles" — the foundations against which claims are evaluated, not claims of logical irreducibility. The title "Fundamental Truths" already draws the reader in; "First Principles" signals the deepest layer; "Operating Premises" signals the evidence-backed layer. The reader discovers increasing depth as they move through the document.

---

### U-02: Resolve the Premise 2 / "Not Going Anywhere" Tension

**Priority:** Critical — logical inconsistency in the core argument
**Section:** "What's Not Going Anywhere" vs. Premise 2
**Current state:** Premise 2 says "what we know today may not be true tomorrow" and claims this applies to AI in a way it doesn't apply to other fields. The "What's Not Going Anywhere" section then lists things that are durably, confidently human (taste, judgment, conviction).
**Problem:** If you truly believe Premise 2, you cannot also confidently assert that taste, judgment, and conviction are permanent human advantages. The document half-acknowledges this in the FAQ (line 117-118) but doesn't resolve it in the main body.
**Change:** Add explicit framing to "What's Not Going Anywhere" that acknowledges the tension. Options:
  - Frame these as "current advantages with no visible expiration" rather than permanent truths
  - Add falsifiability criteria inline (not just in the FAQ)
  - Explicitly state that Premise 2 applies to this section too, and define what would change the assessment
**Cascade:** FAQ section on "Won't AI eventually automate taste and judgment too?" may need to move closer to the main claims or be cross-referenced more directly.

---

### U-03: Source Integrity Audit

**Priority:** High — credibility of evidence base
**Section:** All inline citations + Sources section
**Current state:** Three sources are already flagged as unverified or qualified (lines 16, 188, 204). Several other figures cite generic landing pages rather than specific reports.
**Issues to resolve:**
  - **$10.30/$3.70 ROI figures:** Cited in-text (line 86) without qualification, but flagged as unverified in the Sources section (line 204). Must be consistent — either verify the figure and remove the source caveat, or qualify it inline.
  - **CrewAI "1.7 billion agentic workflows":** Links to crewai.com homepage, not a specific study or report. Needs a direct source or explicit "company-reported, unverified" qualifier.
  - **Generic landing page citations:** Several sources link to product homepages rather than specific reports (CBO, METR, arxiv.org root). These need specific URLs or acknowledgment that the specific report could not be pinned.
  - **ICSE 2026 study:** Links to the conference homepage, not the specific paper. Needs the actual paper citation.
  - **"Agents of Chaos" study:** Links to arxiv.org root, not a specific paper.
**Change:** Audit every citation. For each: verify the claim against the source, pin to a specific URL where possible, and add inline qualification where the source is company-reported or unverified. Maintain the document's existing practice of honest flagging — extend it to all citations that need it.

---

### U-04: Clarify Unfalsifiable Claims in "What's Not Going Anywhere"

**Priority:** High — analytical rigor
**Section:** "What's Not Going Anywhere"
**Current state:** Taste, judgment, conviction, relationships, and "knowing which question to ask" are presented as durably human with no clear criteria for when the document would concede they've been automated.
**Problem:** This is the weakest analytical section because it's the most resistant to being proven wrong. The FAQ gives a vague bar ("AI systems that reliably identify novel, valuable problems") but the main section has no falsifiability criteria.
**Change:** For each claimed durable advantage, add a brief, specific falsifiability condition. What observable event would cause this document to revise the claim? This mirrors the strong epistemic practice already shown in the FAQ's "What would change your mind" section — extend it into the body.

---

### U-05: Tighten the ETH Zurich Citation

**Priority:** Medium — repeated citation, diminishing returns
**Section:** Lines 74, 118, 144
**Current state:** The same ETH Zurich study (Gloaguen et al.) is cited three times to support three different points (taste, FAQ on automating judgment, directing vs. doing).
**Problem:** Overreliance on a single study. The 2-3% performance difference is a narrow finding being stretched across multiple arguments. Repetition makes the evidence base look thinner than it is.
**Change:** Keep the strongest use (likely the "directing vs. doing" section, line 144, where it most directly applies). For the other two uses, either find additional supporting evidence or reduce the citation to a parenthetical cross-reference rather than a featured data point.

---

### U-06: Add Version Header and Change Log

**Priority:** Medium — document governance
**Section:** Header
**Current state:** "Created: February 2026 / Revised: March 2026" — no version number, no change tracking
**Problem:** A document that says "some of what's written here will be wrong within a year" needs a versioning system so readers know which version they're looking at and what changed.
**Change:** Add semantic version (v1.0.0-alpha), add a brief changelog section at the bottom (or link to one), establish the convention for future updates.

---

### U-07: Strengthen the Solow Paradox Analysis

**Priority:** Low — already good, could be sharper
**Section:** FAQ — "Why isn't it showing up in the productivity data?"
**Current state:** The Solow paradox is invoked correctly, but the analysis could cut deeper.
**Problem:** The document notes electrification took 30+ years but doesn't explore *why* — organizational redesign, complementary innovations, workforce retraining. These are the same barriers AI faces, and naming them specifically would strengthen the argument.
**Change:** Add 1-2 sentences naming the specific parallels: organizational redesign (factory floor → workflow restructuring), complementary innovations (electric motors → context engineering tooling), workforce retraining (machinists → AI-literate knowledge workers). This makes the analogy do more analytical work.

---

### U-08: Introduce "The Conditions" as a New Structural Layer

**Priority:** Critical — new load-bearing layer in the document's epistemological architecture
**Section:** New section, positioned between the First Principles and the Operating Premises
**Current state:** The document has no concept of an operating environment through which axioms propagate. Once U-01 correctly separates first principles from operating premises, the structural relationship between them is implicit: the reader must infer that the premises are downstream consequences of the first principles operating in a particular environment. That environment is never named.

**The discovery:**

A systematic analysis of the entire Admiral Framework codebase on 2026-03-24 revealed that a specific structural constraint — invisible knowledge asymmetry between collaborators — is already the implicit design principle behind approximately 40% of the framework's governance infrastructure, despite never being named. Four of sixteen Standing Orders exist to manage it (SO-04 Context Honesty, SO-11 Context Discovery, SO-12 Zero-Trust, SO-13 Bias Awareness). The verification level hierarchy in Part 7 is tiered by who can see which blind spots. The Brain spec (Part 5) explicitly warns against information asymmetry between humans and agents. The enforcement spectrum (Part 3) is designed around the fact that hooks and agents have different models of what "dangerous" means. The Project Readiness Assessment (Part 1) states the constraint perfectly: "Code shows what was done, not why."

The framework was built in response to this force. It didn't have a name for it.

**The proposition:**

Introduce "The Conditions" as a structural layer — the atmosphere through which the first principles move. The first principles state what is true. The Conditions describe the environment in which those truths play out. The Operating Premises are what you observe when first principles operate through conditions.

The hierarchy:

```
First Principles (foundations we reason from)
  - Capability that exists will be deployed
  - Value tracks scarcity, not effort
  - Beliefs must yield to evidence
        │
        │ operate through
        ▼
The Conditions (structural environment, always present)
  - Knowledge asymmetry between collaborators is invisible to all parties
  - [potentially others — see below]
        │
        │ producing
        ▼
Operating Premises (empirical, AI-specific)
  - AI capabilities keep improving and nobody knows when it stops
  - What we know today may not be true tomorrow
        │
        │ which explain
        ▼
What's Gone / What's Not Going Anywhere / What Skills Matter Now
```

**The first Condition: Knowledge asymmetry between collaborators is invisible to all parties.**

At any frozen moment, what each participant in a system — human, AI, team, organization — holds as knowledge is different from what every other participant holds. The asymmetry is structural, not incidental. No participant can see the full shape of the gap. You don't know what you don't know, you don't know what your collaborator doesn't know, and they don't know what you don't know. The gap is invisible from every vantage point.

This is not an observation about AI. It's a property of multi-participant systems. But AI makes it newly and uniquely dangerous, and the three first principles explain exactly why:

**Interaction with First Principle 1 — "Capability that exists will be deployed":**

Capabilities are being deployed in contexts you can't observe. Your collaborator adopted a tool last week that changes what they can do, and neither of you has surfaced that yet. An AI agent gained access to a repository context that reshapes its understanding, and the human directing it doesn't know the agent's model just shifted. First Principle 1 means capability deployment is inevitable. The Condition means that deployment happens across invisible boundaries. The combination: you get blindsided not by malice but by the simple fact that capability diffused faster than awareness of that diffusion.

This interaction also explains a specific failure mode the thesis document identifies: why speed-as-differentiator collapsed. Speed wasn't disrupted by faster humans. It was disrupted because the capability gap between "person using AI" and "person not using AI" became invisible to the person not using AI — they couldn't see what they were competing against until the market had already repriced their work.

**Interaction with First Principle 2 — "Value tracks scarcity, not effort":**

The ability to see knowledge asymmetry is itself scarce, and therefore valuable. Most people cannot identify the moment when two collaborators are optimizing for different objectives because neither surfaced their mental model. The person who can see that gap — who can say "we're talking past each other because you're assuming X and I'm assuming Y" — is operating at the exact intersection of taste, judgment, and conviction that the document identifies as durably valuable.

First Principle 2 says value follows scarcity. The Condition reveals a specific, structural source of scarcity: the ability to see what others can't see about what they can't see. This also explains why the document's "knowing which question to ask" is listed as a durable skill — the right question is precisely the one that surfaces an invisible asymmetry.

This interaction changes the "What's Not Going Anywhere" section from assertion to derivation. Taste, judgment, and conviction aren't valuable because they're mystically human. They're valuable because they're the only faculties that operate on the invisible layer. Taste sees the gap between "correct" and "good" that no metric captures. Judgment sees the gap between "well-defined problem" and "actual situation" that no spec covers. Conviction bridges the gap between "what the data suggests" and "what we should do" that no algorithm resolves. These faculties are durable because they address a structural condition, not because they're immune to automation.

**Interaction with First Principle 3 — "Beliefs must yield to evidence":**

Beliefs yield to evidence *when the evidence is accessible*. Knowledge asymmetry is the friction that delays First Principle 3. The contradicting evidence exists — but it's in someone else's head, context window, training data, or institutional memory. Beliefs persist longer than they should not because people are stubborn (though they are), but because the evidence that would update the belief is distributed across minds that can't see each other's holdings.

In human-human collaboration, social protocols evolved over centuries to partially surface this: meetings, code review, peer review, cross-functional teams, adversarial peer review in science. In human-AI collaboration, those protocols barely exist. The context window is opaque. The model's uncertainty is hidden behind confident prose. The human's intent is compressed into a prompt. Both sides are flying blind about what the other doesn't hold.

This interaction also strengthens the Solow paradox analysis in the FAQ. Macro productivity data shows no AI-driven spike not just because organizational redesign takes decades — but because the evidence of where AI is already working is distributed across thousands of organizations that can't see each other's results. First Principle 3 says the evidence will eventually prevail. The Condition explains why "eventually" is measured in years, not months.

**Why "Condition" and not "First Principle":**

The three first principles assert directional truths about reality — capability deploys, value follows scarcity, evidence wins. Each makes a claim that could theoretically be falsified (a capability that is suppressed forever, a market that permanently rewards effort over scarcity, a belief that persists despite overwhelming evidence). Knowledge asymmetry doesn't assert a direction. It describes a constraint on observation itself. It's not a force. It's the medium through which forces operate. It's closer to a law of thermodynamics (entropy always increases in a closed system) than to a postulate of geometry.

You don't prove it or disprove it. You design around it or you get burned by it.

**Why "Conditions" (plural):**

This analysis surfaced one condition definitively. There may be others. Candidates that emerged during the codebase analysis but were not explored in depth:

- **Attention is finite and non-transferable** — even if knowledge is available, the capacity to process it is bounded. Context windows and human working memory are both hard limits on how much asymmetry can be surfaced at any moment.
- **Complexity compounds non-linearly** — each new participant, tool, or capability multiplies the interaction space faster than it multiplies the workforce. The asymmetry surface area grows faster than the capacity to observe it.
- **Trust requires accountability, and accountability requires identity persistence** — AI agents lack stable identity across sessions. Trust built in one context doesn't carry to the next.

These are noted as potential future conditions, not proposed for v1.0.0-alpha. The first Condition — invisible knowledge asymmetry — has sufficient evidence from the codebase analysis and is the most load-bearing. The others require their own rigorous analysis before earning a place in the document.

**What changes in the document's argument if The Conditions are adopted:**

*"What's Gone"* gains explanatory depth. Execution value didn't collapse because AI is fast — it collapsed because the asymmetry between expert and novice became invisible to the market. When a junior with Claude can approximate a senior's output for a growing range of tasks, the employer can't see the quality gap until it surfaces in production. The asymmetry in skill didn't disappear. It became invisible to the people pricing it.

*"What's Not Going Anywhere"* gains structural grounding and resolves the U-02 tension. These aren't permanent human advantages asserted on faith. They're faculties that address a structural condition. They remain valuable as long as the Condition holds — which is to say, as long as multi-participant systems exist. If AI develops the ability to reliably detect invisible knowledge asymmetry without human guidance, this section needs to be rewritten. That's the falsifiability condition U-04 is looking for.

*"What Skills Matter Now"* gains a unifying thread. Every skill listed is a specific technique for managing knowledge asymmetry: finding the right problem = seeing an asymmetry others can't see. Directing instead of doing = managing asymmetry across agents. Editing instead of generating = closing the gap between what was generated and what was meant. Communicating precisely = reducing asymmetry at the interface. Adapting fast = updating when new asymmetry is revealed.

**Cascade:**
- U-01 (rename to operating premises) must complete first — The Conditions sit between first principles and premises in the hierarchy
- U-02 (Premise 2 / "Not Going Anywhere" tension) may partially resolve through The Conditions framing — the tension between "knowledge invalidates" and "taste is durable" is explained by the Condition: taste is durable because it operates on the invisible layer, not the knowledge layer
- U-04 (falsifiability) gains a concrete angle: the falsifiability condition for durable human advantages becomes "AI systems that can reliably detect invisible knowledge asymmetry without human guidance"
- All downstream sections gain a deeper explanatory layer connecting back to The Conditions
- The Admiral Framework spec should eventually name The Conditions as the foundational design principle its governance infrastructure already implicitly follows — but that is a separate effort from the thesis document update

**Open sub-questions for U-08:**
1. Does the document introduce The Conditions as a formal section with its own header, or weave it into the axioms section as "the environment in which these axioms operate"?
2. How much evidence should accompany The Conditions in the thesis vs. being developed in a separate supporting document?
3. Should the Admiral Framework codebase evidence (Standing Orders, verification levels, etc.) be cited in the thesis, or is that too self-referential for a public-facing document?
4. Is there a risk that The Conditions layer makes the document's architecture too complex for the target audience? (Counter: the audience is people navigating AI strategy professionally. They can handle a three-tier epistemology if each tier earns its place.)

---

## Sequencing

```
U-01 (first principles + operating premises)  ← COMPLETE. Everything else references this.
  │
  ├── U-08 (The Conditions)    ← New structural layer. Depends on U-01.
  │     │
  │     ├── U-02 (resolve tension)   ← Informed by Conditions framing
  │     ├── U-04 (falsifiability)    ← Gains concrete angle from Conditions
  │     │
  ├── U-02 (resolve tension)   ← Depends on U-01; deepened by U-08
  ├── U-04 (falsifiability)    ← Depends on U-01; deepened by U-08
  │
U-03 (source audit)            ← Independent. Can run in parallel.
U-05 (ETH Zurich tightening)   ← Independent.
U-06 (versioning)              ← Do last. Captures all changes in the changelog.
U-07 (Solow analysis)          ← Independent. Low priority.
```

---

## Open Questions

1. ~~**What should the new label be?**~~ **RESOLVED: "Operating Premises."** Evaluated seven candidates (Operating Premises, Foundational Assumptions, Working Premises, Governing Observations, Anchor Theses, Load-Bearing Beliefs, Starting Conditions) across epistemic accuracy, rhetorical force, and project fit. Operating Premises is epistemically correct (these are premises, not axioms), carries sufficient weight ("operating" = actively in use), fits under the existing document title without conflict, and matches the document's direct voice. Section header becomes: **"The Two Operating Premises."**

2. **How far to push falsifiability in U-04?** Adding falsifiability criteria to every claim in "What's Not Going Anywhere" could make the section feel defensive. Need to find the right balance between intellectual honesty and confident assertion. U-08 offers a concrete angle: durable advantages are durable because they address a structural condition, not because they're mystically human.

3. **Source verification scope for U-03.** Full verification of every cited figure would require accessing paywalled reports (Bloomberg, Goldman Sachs, McKinsey). Decision needed on whether to verify and cite, or qualify as "reported by [source], not independently verified."

4. **Does the closing paragraph (line 182) survive?** The "some things are worth doing even when they produce no value" paragraph is the document's most human moment. It's also the only section with no evidence, no argument, and no analytical function. It works because it breaks pattern. Confirm it stays.

5. **How should The Conditions interact with the three first principles in the document's presentation?** The first principles (Capability that exists will be deployed; Value tracks scarcity, not effort; Beliefs must yield to evidence) are being introduced in v1.0.0. The Conditions sit between first principles and operating premises. The structural relationship — first principles operate through conditions to produce observable premises — needs a presentation format that is clear without being academic. See U-08 open sub-questions.

6. **Are there additional Conditions beyond knowledge asymmetry?** The codebase analysis surfaced candidates (finite attention, non-linear complexity, identity persistence). These need independent rigorous analysis before inclusion. V1.0.0-alpha may ship with one Condition and note that the layer is extensible.

---

## Validation Criteria

v1.0.0-alpha is ready when:

- [ ] No claim in the document is labeled with an epistemological status it doesn't earn
- [ ] The two foundational claims are correctly categorized as Operating Premises
- [ ] The three first principles are introduced and clearly distinguished from the Operating Premises
- [ ] The Conditions layer is introduced with at least the first Condition (knowledge asymmetry) and its interaction with each axiom is demonstrated
- [ ] The hierarchy (First Principles → Conditions → Operating Premises → Consequences) is structurally clear
- [ ] The tension between Premise 2 and "What's Not Going Anywhere" is explicitly acknowledged and resolved
- [ ] Every inline citation either links to a specific source or carries an explicit qualification
- [ ] Each "durable human advantage" has a stated falsifiability condition grounded in The Conditions
- [ ] The document carries a version number and changelog
- [ ] All updates have been reviewed for cascading effects on other thesis documents in `thesis/`
