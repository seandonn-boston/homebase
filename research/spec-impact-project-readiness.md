# How the Team Coordination Mindset Changes the Specs

**Date:** March 16, 2026
**Type:** Spec gap analysis — what the failure mode analysis reveals about missing framework concepts
**Status:** Approved — conservative position adopted. See "Revised Position" section below.
**Decision:** Keep readiness assessment, preparation phase, failure modes, anti-patterns. Drop agent-led discovery mode, reconnaissance phase, and Stage 0. Ground Truth creation is a human responsibility.

---

## The Core Problem

The Admiral spec has an implicit assumption baked into its foundation:

**The spec assumes Ground Truth already exists.**

Part 1 (Strategy) says: "Define Mission. Define Boundaries. Define Success Criteria." Part 2 (Context) says: "Load Ground Truth into every agent's context." The Pre-Flight Checklist says: "Verify Mission, Boundaries, Success Criteria exist." The entire downstream system — fleet composition, enforcement, quality gates, the Brain — builds on top of these inputs.

But the team coordination analysis revealed three project states where Ground Truth doesn't exist and can't simply be "defined":

1. **Greenfield:** No codebase, no conventions, no architecture decisions yet. Ground Truth must be *created* as the project takes shape.
2. **Legacy with no maintainers:** Ground Truth exists implicitly in the codebase but no human can articulate it. Ground Truth must be *discovered*.
3. **Teams that don't write things down:** Ground Truth exists in people's heads and verbal habits. Ground Truth must be *extracted*.

The spec treats Ground Truth as an input. For a significant portion of real-world projects, Ground Truth is an *output* that must be produced before Admiral can function.

---

## What Needs to Change (By Spec Part)

### Part 1 — Strategy: Add Project Readiness Concept

**Current state:** Part 1 opens with the Strategy Triangle (Mission → Boundaries → Success Criteria) and says "if any vertex is missing, the fleet will infer one, and the inference will be subtly wrong." This is correct but incomplete. It identifies the failure without providing a path for projects that genuinely cannot fill in the triangle yet.

**What's missing:** A concept of **Project Readiness Levels** that acknowledges the triangle must sometimes be *built* rather than *filled in*. The spec currently has `Current Phase: [greenfield | feature-add | refactor | migration | maintenance]` — but it treats all phases as having the same precondition: Ground Truth exists.

**Proposed change:**

Add a **Project Readiness Assessment** before the Strategy Triangle. Three readiness states:

| Readiness State | Ground Truth Status | Admiral Can Do | Admiral Cannot Do |
|---|---|---|---|
| **Ready** | Mission, Boundaries, Success Criteria defined. Tech stack chosen. Conventions documented. | Full fleet operations at any profile. | — |
| **Partially Ready** | Some Ground Truth exists but is incomplete, undocumented, or out of date. | Starter profile. Discovery-mode agents to fill gaps. Enforcement on known constraints only. | Fleet-level operations requiring complete Ground Truth. Governance agents (they'd enforce standards that don't exist). |
| **Not Ready** | No documented Ground Truth. Greenfield with no decisions made, or legacy with no maintainers. | Reconnaissance only. Read-only fleet exploration. Ground Truth generation assistance. | Any autonomous modification. Any enforcement beyond budget/loop detection. |

**Why this matters for the spec:** The Pre-Flight Checklist (Appendix A) currently has checkboxes for Mission, Boundaries, Success Criteria. If you can't check them, the spec implies "don't deploy Admiral." But for greenfield and legacy projects, Admiral should help *create* the Ground Truth — the framework should have an on-ramp for projects that aren't ready yet, not just a gate that keeps them out.

**Spec-level impact:** Low structural change. Adds a section to Part 1 before the Strategy Triangle. Updates the Pre-Flight Checklist to include a readiness assessment as Step 0.

---

### Part 2 — Context: Add Ground Truth Discovery Mode

**Current state:** Ground Truth is presented as a document you write and maintain. The template assumes you know the answers: "Stack: [Exact versions]. Infra: [Topology]. Access: [Per-role list]."

**What's missing:** A **Ground Truth Discovery** pattern for projects where the answers aren't known. This is distinct from writing Ground Truth — it's using agents to *find* Ground Truth that's embedded in a codebase, implicit in team behavior, or scattered across undocumented systems.

**Proposed change:**

Add a Ground Truth Discovery section after the existing Ground Truth section. Three discovery patterns:

**Pattern 1: Codebase Archaeology (Legacy projects)**
- Deploy a single agent in read-only mode
- Systematic codebase mapping: dependency graph, module boundaries, naming patterns, framework versions, test coverage
- Output: Draft Ground Truth document with confidence levels (verified / inferred / unknown)
- Human reviews and corrects before Ground Truth is finalized
- Brain seeded with archaeological findings

**Pattern 2: Convention Extraction (Teams with implicit knowledge)**
- Interview-style: agent reads existing code and proposes conventions based on observed patterns
- "It appears the convention is camelCase for functions and PascalCase for components — based on 847 occurrences vs. 12 violations. Is this correct?"
- Human confirms, corrects, or clarifies
- Output: Documented conventions derived from actual practice, not ideal practice

**Pattern 3: Incremental Ground Truth (Greenfield projects)**
- Ground Truth starts minimal: just Mission and tech stack
- Ground Truth grows as decisions are made during early development
- Brain records every architectural decision with rationale
- Periodic Ground Truth synthesis: agent reviews Brain entries and proposes Ground Truth updates
- Human approves additions

**Why this matters for the spec:** The current spec creates a chicken-and-egg problem. You need Ground Truth to deploy Admiral, but you might need Admiral to create Ground Truth. Discovery mode breaks the deadlock.

**Spec-level impact:** Medium. New section in Part 2. New agent capability (discovery mode) that may need a fleet definition. Updates to the Brain seeding process. New confidence levels on Ground Truth entries.

---

### Part 6 — Execution: Add a Pre-Fleet Phase

**Current state:** Work Decomposition assumes the Spec-First Pipeline: Mission → Requirements → Design → Tasks → Implementation. The template says "Pipeline entry: Fleet takes over at [Requirements | Design | Tasks | Implementation]."

**What's missing:** A phase *before* Requirements where the fleet is doing reconnaissance, not execution. The current pipeline assumes someone (human or fleet) already understands the problem space well enough to write requirements. For legacy codebases and unfamiliar projects, understanding the problem space IS the first task.

**Proposed change:**

Add **Phase 0: Reconnaissance** to the Spec-First Pipeline:

```
Phase 0: Reconnaissance (new)
  → Phase 1: Requirements
    → Phase 2: Design
      → Phase 3: Tasks
        → Phase 4: Implementation
```

Reconnaissance phase characteristics:
- Fleet: single agent, read-only access, no write permissions
- Output: codebase map, dependency graph, identified patterns, draft Ground Truth, risk assessment
- Authority: everything is Propose or Escalate — the fleet makes zero autonomous decisions
- Brain: seeded with findings, all marked as `confidence: inferred`
- Exit criteria: human reviews reconnaissance output and declares the project "Ready" (sufficient Ground Truth to proceed)
- Budget: separate from implementation budget — reconnaissance cost is an investment in reducing rework

**Why this matters for the spec:** Without Phase 0, teams deploying Admiral on legacy or unfamiliar codebases jump straight to decomposition and implementation. The fleet starts making changes to a codebase it doesn't understand, using conventions it hasn't verified, against standards that don't exist. The reconnaissance phase makes "understand before acting" a first-class concept.

**Spec-level impact:** Medium. New pipeline phase. New fleet mode (read-only). May require a new agent definition (Reconnaissance Agent or expand the Context Curator role).

---

### Part 3 — Enforcement: Add Graduated Enforcement for Incomplete Ground Truth

**Current state:** Enforcement assumes the constraints are known. Hooks enforce token budgets, loop detection, scope boundaries, prohibitions. The Decision Authority model assumes the tiers are calibrated.

**What's missing:** An enforcement model for projects where constraints are only partially known. If you don't know the full scope boundary (because the codebase is undocumented), the scope_boundary_guard has nothing to enforce. If you don't have coding conventions documented, the QA Agent has nothing to verify against.

**Proposed change:**

Add **Enforcement Readiness** concept — the enforcement layer scales with Ground Truth completeness:

| Ground Truth State | Available Enforcement | Not Available |
|---|---|---|
| **Minimal** (Mission + tech stack only) | Token budget, loop detection, basic prohibitions (no rm -rf, no secrets) | Scope boundaries, convention enforcement, quality gates beyond "it compiles" |
| **Partial** (some conventions, some architecture) | Above + known scope boundaries + documented conventions | Full quality gates, comprehensive prohibitions |
| **Complete** (full Ground Truth) | Full enforcement spectrum | — |

**Why this matters for the spec:** The current Pre-Flight Checklist implies enforcement is binary — either you have it or you don't. In reality, enforcement is graduated. A team with partial Ground Truth should deploy partial enforcement, not no enforcement. The three hooks that work without Ground Truth (budget, loops, basic prohibitions) are valuable from day zero. The rest should come online as Ground Truth is established.

**Spec-level impact:** Low. Clarification rather than structural change. Updates to the enforcement spectrum documentation. Updates to the Pre-Flight Checklist to indicate which enforcement items are Ground-Truth-dependent vs. universal.

---

### Part 7 — Quality: Add Failure Modes for Incomplete Ground Truth

**Current state:** The 20 failure modes catalog assumes normal fleet operations. They address what goes wrong when agents are working on understood codebases with documented standards.

**What's missing:** Failure modes specific to operating without complete Ground Truth:

| # | Failure Mode | Description | Primary Defense |
|---|---|---|---|
| 21 | **Convention Inference** | Agent infers conventions from code patterns; inferred convention is actually a historical mistake that was never corrected | Require human confirmation of inferred conventions before they enter Ground Truth |
| 22 | **Archaeology Hallucination** | Agent "discovers" patterns in legacy code that don't exist — seeing structure where there is only accident | Confidence tagging on all discovery findings; human review before Brain seeding |
| 23 | **Ground Truth Premature Crystallization** | Partial Ground Truth treated as complete; fleet enforces incomplete rules as if they were comprehensive | Explicit Ground Truth completeness state; alerts when enforcement references undefined Ground Truth |
| 24 | **Legacy Entanglement** | Agent modifies code with undocumented dependencies; change breaks unrelated systems | Reconnaissance phase mandatory for legacy; read-only before write |
| 25 | **Implicit Convention Override** | Fleet establishes new conventions that conflict with undocumented but intentional existing conventions | Shadow mode before enforcement; human validation of any fleet-proposed convention |

**Spec-level impact:** Low. Additions to the existing failure mode catalog. Each failure mode follows the existing format.

---

### Part 8 — Operations: Expand Fleet Lifecycle with Pre-Deployment Phase

**Current state:** Fleet Scaling & Lifecycle covers Standup → Acceleration → Steady State → Wind-Down → Dormant. The lifecycle starts at Standup, which assumes the fleet is being deployed.

**What's missing:** A phase before Standup that covers the preparation work: readiness assessment, Ground Truth discovery, safety net scaffolding, Brain seeding.

**Proposed change:**

Add **Phase: Preparation** before Standup:

| Phase | Activity | Duration | Admiral Profile |
|---|---|---|---|
| **Preparation** (new) | Readiness assessment. Ground Truth discovery/creation. Safety net scaffolding (CI, tests, linting if absent). Brain seeding. | Days to weeks depending on project state | None → Starter (at phase exit) |
| **Standup** | Fleet deployment. Initial configuration. First governed sessions. | Days to 1 week | Starter |
| **Acceleration** | Fleet throughput increases. Progressive autonomy begins. | Weeks | Team → Governed |
| ... | (existing phases unchanged) | ... | ... |

**Preparation phase activities by project type:**

| Project Type | Preparation Activities | Expected Duration |
|---|---|---|
| Greenfield | Write Mission, Boundaries, Success Criteria. Choose tech stack. Document conventions. Minimal — may be done in an afternoon. | Hours to 1 day |
| Existing (well-documented) | Verify Ground Truth matches reality. Seed Brain with key decisions. Configure scope boundaries from CODEOWNERS. | Hours to 1 day |
| Existing (poorly documented) | Convention extraction. Ground Truth generation from codebase analysis. Interview team for tribal knowledge. Brain seeding. | 1-3 days |
| Legacy (no maintainers) | Full reconnaissance phase. Codebase archaeology. Safety net scaffolding (add CI, characterization tests, linting). Ground Truth generation. | 1-2 weeks |

**Spec-level impact:** Medium. New lifecycle phase. Cross-references to Part 1 (readiness) and Part 2 (discovery). Updates to the Pre-Flight Checklist flow.

---

### Progressive Autonomy Extension: Add Stage 0

**Current state:** Four stages: Manual Oversight → Assisted Automation → Partial Autonomy → Full Autonomy. Stage 1 (Manual Oversight) is the starting point.

**What's missing:** A stage before Manual Oversight where the fleet isn't doing productive work — it's doing reconnaissance, mapping, and Ground Truth discovery. Call it **Stage 0: Discovery**.

| Stage | Operator Role | Fleet Role | Output |
|---|---|---|---|
| **0: Discovery** (new) | Defines what's known and unknown. Reviews fleet findings. Builds Ground Truth. | Read-only exploration. Pattern detection. Dependency mapping. Convention inference. | Draft Ground Truth. Codebase map. Risk assessment. Brain seed entries. |
| **1: Manual Oversight** | Reviews every fleet decision | Proposes all actions | Implemented work (with full human review) |
| ... | (unchanged) | ... | ... |

**Why Stage 0 matters:** It legitimizes the work that needs to happen before a fleet can be productive. Currently, teams that need reconnaissance either skip it (and the fleet makes mistakes on an unfamiliar codebase) or do it outside Admiral (losing the benefit of Brain recording and structured output). Making it a formal stage means it has infrastructure support, exit criteria, and a clear graduation signal.

**Graduation signal for Stage 0 → Stage 1:** Ground Truth is complete enough to pass the Starter Pre-Flight Checklist. Human has reviewed and approved all discovery findings. Brain is seeded with initial entries.

**Spec-level impact:** Low. Addition to the Progressive Autonomy extension. Cross-reference from Part 8 (Preparation phase).

---

### Index.md: Add Readiness to Quick-Start Profiles

**Current state:** Quick-Start Profiles (Starter through Enterprise) describe what Admiral components to deploy. They assume the project is ready to receive them.

**What's missing:** A readiness qualifier on each profile indicating what project state is required:

| Profile | Required Readiness | If Not Ready |
|---|---|---|
| **Starter** | Mission + Boundaries + tech stack defined | Enter Preparation phase first |
| **Team** | Full Ground Truth documented + fleet roles clear | Deploy Starter, use it to complete Ground Truth |
| **Governed** | Ground Truth stable + quality gates operational | Deploy Team, stabilize before advancing |
| **Production** | All of above + operational history (weeks of Brain entries) | Deploy Governed, accumulate history |
| **Enterprise** | All of above + multi-team coordination patterns proven | Deploy Production per-team first |

**Spec-level impact:** Minimal. One additional column in the Quick-Start Profiles table. Cross-reference to Part 1 readiness assessment.

---

### Pre-Flight Checklist (Appendix A): Add Step 0

**Current state:** The checklist starts with "Part 1 — Strategy: Mission defined, Boundaries defined, Success Criteria defined." If you can't check these, you're stuck.

**Proposed change:**

Add **Step 0: Readiness Assessment** before the Starter Profile checklist:

```
### Step 0 — Readiness Assessment

Before checking Starter items, assess project readiness:

- [ ] Can you write the Mission statement right now? (If no: you need a strategy session, not Admiral.)
- [ ] Do documented coding conventions exist? (If no: enter Preparation phase — extract or create them.)
- [ ] Do quality gates exist (CI, tests, linter)? (If no: scaffold them before deploying enforcement.)
- [ ] Does someone understand the codebase well enough to define scope boundaries?
  (If no: enter Reconnaissance — deploy read-only agent to map the codebase first.)
- [ ] Has the team agreed on what decisions the fleet can make autonomously?
  (If no: default to everything as Propose/Escalate. Widen later.)

If all five are checked: proceed to Starter Profile.
If 1-2 are unchecked: proceed to Starter with those items as immediate tasks.
If 3+ are unchecked: enter Preparation phase before deploying Admiral.
```

**Spec-level impact:** Minimal. Prepends one section to the existing checklist.

---

## What Does NOT Need to Change

Not every gap requires a spec change. Some things are better handled in documentation, tooling, or implementation:

| Gap | Why NOT a Spec Change |
|---|---|
| "Teams that don't write things down" | Admiral can't fix organizational culture. The spec already requires written Ground Truth. The Preparation phase is the forcing function — if you can't produce Ground Truth, you're not ready. This is a human problem, not a framework problem. |
| "When overhead exceeds value" | The spec already has the "don't start at Enterprise" warning. The minimum viable usage threshold is a product/pricing question, not a spec question. |
| "Migration from other frameworks" | This is an integration concern, not a governance concern. The spec's model-agnostic, platform-agnostic design already supports coexistence. Migration guides belong in implementation docs, not the framework spec. |
| "Teams that only use AI occasionally" | Admiral at Starter profile is already lightweight (30 min config, 3 hooks). If that's too much overhead, the team doesn't need governance — they need to use AI more. |

---

## ~~Summary: The Five Spec Changes~~ (Superseded — see Revised Position below)

~~| Change | Spec Location | Impact | New Concept |~~
~~|---|---|---|---|~~
~~| **Project Readiness Levels** | Part 1 (before Strategy Triangle) | Low | Ready / Partially Ready / Not Ready |~~
~~| **Ground Truth Discovery Mode** | Part 2 (after Ground Truth) | Medium | Archaeology, extraction, incremental patterns |~~
~~| **Reconnaissance Phase (Phase 0)** | Part 6 (before Requirements) | Medium | Read-only fleet exploration |~~
~~| **Preparation Lifecycle Phase** | Part 8 (before Standup) | Medium | Pre-deployment readiness activities |~~
~~| **Discovery Stage (Stage 0)** | Progressive Autonomy extension | Low | Pre-operational fleet mode |~~

---

## Revised Position (Approved)

After critical review, three of the five proposals were identified as dangerous — they contradict the spec's core thesis ("deterministic enforcement beats advisory guidance") by deploying agents in judgment-heavy, context-poor situations where enforcement has nothing to enforce.

### What We're Implementing

| Change | Spec Location | Impact | Status |
|---|---|---|---|
| **Project Readiness Assessment** | Part 1 (before Strategy Triangle) | Low | **Implementing** |
| **5 new failure modes** | Part 7 (Failure Mode Catalog) | Low | **Implementing** |
| **Preparation lifecycle phase** | Part 8 (before Standup) | Medium | **Implementing** (human-led, scoped down) |
| **Step 0 readiness check** | Appendix A (Pre-Flight Checklist) | Low | **Implementing** |
| **Anti-patterns for agent-led discovery** | Parts 1, 2, Progressive Autonomy | Low | **Implementing** |

### What We're NOT Implementing (and Why)

| Proposal | Why Dropped |
|---|---|
| **Ground Truth Discovery Mode** (Part 2) | An agent discovering Ground Truth without Ground Truth is the most dangerous agent in the fleet pretending to be the safest. Convention Inference from code patterns treats historical accidents as intentional decisions. The "because" behind decisions — the intent — cannot be found in code. Ground Truth creation is a human responsibility. |
| **Reconnaissance Phase / Phase 0** (Part 6) | Creates false confidence. Agent produces a structured codebase map, human trusts it, but the map reflects what the agent understood — not what actually exists. The gap between those is exactly where legacy projects are most dangerous. If a human can't understand the codebase, an agent can't either — it just sounds more confident about its misunderstanding. |
| **Discovery Stage / Stage 0** (Progressive Autonomy) | Stage 1 (Manual Oversight) already covers the right posture: all decisions Propose/Escalate, agents recommend, humans decide. A separate Stage 0 adds complexity without adding safety. The human should do Ground Truth work while running Stage 1. |

### The Revised Philosophy

Instead of: *"Tell me what you know and I'll help you figure out the rest."*

The spec says: *"Tell me what you know. If it's not enough, here's exactly what's missing and why you (the human) need to figure it out before I can help. Once you do, I'll make sure nobody forgets it."*

The framework is the on-ramp AND the highway — but the human drives onto the on-ramp. The fleet doesn't pull them on.

---
