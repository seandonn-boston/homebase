# Admiral Framework — Improvement Plan & Definition of Done

**Date:** 2026-03-14
**Starting version:** v0.5.0-alpha
**Current rating:** 6.8/10 (codebase review v2) → 7.8/10 (deep review of Parts 8-12)
**Target:** Ship a credible, usable v1.0

---

## Part 1: Six Pillars of Improvement

### Pillar 1: Trust Unification

**Problem:** Trust calibration is scattered across four files (Part 3, Part 6, Part 8, Part 10) with no unified model. Part 10 says "consecutive successful decisions" promote trust but never defines how many. Part 3 defines three enforcement tiers. Part 6 assumes trust exists. Part 8 monitors trust health without defining what trust *is*.

**Work:**
1. Create a single trust model definition (in Part 3 or a new reference doc) that defines:
   - The three decision authority tiers (Autonomous / Propose / Escalate) — already exist
   - Per-category trust scores with concrete promotion/demotion thresholds (spec-gaps.md #11 suggests 5 consecutive successes — adopt or justify alternative)
   - Trust state transitions: what resets trust, what degrades it, what promotes it
   - Where trust state lives (Brain? Config? Session state?)
2. Update Parts 6, 8, and 10 to reference the unified model instead of re-defining fragments

**Files touched:** `part3-enforcement.md`, `part6-execution.md`, `part8-operations.md`, `part10-admiral.md`, `reference-constants.md`
**Definition of done:** A single reader can trace from "what is trust?" → "how is it measured?" → "how does it change?" → "where is it stored?" without leaving the reference chain.

---

### Pillar 2: Bootstrap Sequence

**Problem:** To implement Starter profile, you need Standing Orders (Part 11) and AGENTS.md (Part 2) before hooks (Part 3). But the Pre-Flight Checklist assumes you've already read the whole spec. The "30-minute Starter" claim is config time, not deployment time, and this distinction is buried in a footnote. A newcomer hitting the spec cold has no clear path.

**Work:**
1. Write a `QUICKSTART.md` in `aiStrat/` (max 200 lines) that provides:
   - A linear, numbered sequence: "Do this first, then this, then this"
   - Exact files to read in order (not all 12 parts — just the 3-4 needed for Starter)
   - A working example: one agent + one hook + Standing Orders loaded
   - Time estimates that distinguish config vs. implementation
2. Update `index.md` "Minimum Viable Reading Path" to reference QUICKSTART.md
3. Update appendices Pre-Flight Checklist to reference QUICKSTART.md as prerequisite

**Files touched:** New `QUICKSTART.md`, `index.md`, `appendices.md`
**Definition of done:** A developer unfamiliar with Admiral can go from zero to one governed agent running with one enforced hook in under 2 hours by following QUICKSTART.md linearly, without needing to read any other file.

---

### Pillar 3: Claim Qualification

**Problem:** The spec makes several claims without verifiable sources (ETH Zurich, "2,500+ AGENTS.md analysis", SWE-Bench scores). This undermines a framework about zero-trust verification. Additionally, Part 12's moat claim (outcome attribution is proprietary) conflates architecture with data.

**Work:**
1. Audit every empirical claim in the spec for citation status
2. For each uncited claim, do one of:
   - Find and add proper citation (DOI, URL, author, date)
   - Rewrite as anecdotal observation: "In our experience..." or "Common patterns suggest..."
   - Remove if unverifiable and non-essential
3. Soften Part 12's moat language: the architecture is replicable; the moat is the *accumulated dataset* produced by a well-run fleet over time, not the infrastructure itself
4. Fix Case Study 4 inconsistencies (5,300/126 vs 5,500/148) — pick the correct numbers or explain the discrepancy

**Files touched:** `part2-context.md`, `part4-fleet.md`, `part12-data-ecosystem.md`, `appendices.md`
**Definition of done:** Every empirical claim in the spec either has a verifiable citation or is explicitly framed as observation/experience. Zero claims presented as research without sources.

---

### Pillar 4: Spec Trimming & Threshold Resolution

**Problem:** The spec has 26,000+ lines but many sections are vague on critical operational details. spec-gaps.md identifies 14 gaps (7 critical, 6 moderate, 1 minor) — none have been resolved since v0.4.0. Meanwhile, the spec keeps growing (Part 12 added 701 lines). The spec-to-code ratio is ~26:1.

**Work:**
1. Resolve all 7 critical spec-gaps by adding concrete constants to the source spec files:
   - Standing context ceiling: hard 50K limit, warning at 45K
   - Brain advancement: hit rate ≥85%, precision ≥90%, reuse ≥30%
   - Brain supersession: <10%/quarter healthy, >15% audit trigger
   - Over-decomposition: 2 consecutive chunks <20% budget = re-decompose
   - Tactical vs. Strategic: >15% scope expansion = Strategic
   - Health metric yellow zones: define the 50-75% FPQR zone
   - Orchestrator overhead: 5-tier graduated response
2. Resolve 6 moderate spec-gaps with thresholds
3. Mirror all constants in `reference-constants.md`
4. Freeze spec growth: no new Parts, no new agent definitions, no new protocols until v1.0 implementation catches up
5. Delete orphaned `.md-example` files
6. Fix MANIFEST.md "11 parts" → 12
7. Fix AGENTS.md "not code" claim for Design Artifacts
8. Fix index.md "fourteen files" count
9. Remove HTML comment artifact from Part 11

**Files touched:** All spec parts with gaps, `reference-constants.md`, `MANIFEST.md`, `AGENTS.md`, `index.md`, `part11-protocols.md`, orphaned `.md-example` files (delete)
**Definition of done:** spec-gaps.md shows zero Critical gaps. All surviving defects from codebase review v2 are resolved. `reference-constants.md` is the single source of truth for every threshold in the framework.

---

### Pillar 5: Failure Narrative Integration

**Problem:** The spec teaches through anti-patterns but doesn't connect failures into a coherent narrative. Case studies are isolated. The failure mode catalog (Part 7) lists 20 modes but doesn't show how they chain. A reader learns individual failure modes but not failure *dynamics*.

**Work:**
1. Add a "Failure Chains" section to Part 7 showing how failures cascade:
   - Context starvation → hallucination → sycophantic drift → governance theater
   - Over-decomposition → orchestrator overhead → cost overrun → fleet collapse
   - Trust miscalibration → rubber-stamp approvals → security breach → emergency halt
2. Connect Case Studies 1-3 (appendices) to specific failure chains
3. Keep this concise — max 50 lines added to Part 7, not a new document

**Files touched:** `part7-quality.md`, `appendices.md` (cross-references only)
**Definition of done:** A reader can trace from any single failure mode to its likely upstream cause and downstream consequences in under 2 minutes.

---

### Pillar 6: Decision Boundary Procedures

**Problem:** Multiple protocols overlap without coordination. Standing Order 5 says "choose conservative tier when in doubt." SO 3 says "hand back out-of-scope tasks." The Human Referral Protocol says "always refer for safety/legal." The Escalation Protocol says "escalate for scope changes." When a situation triggers multiple protocols simultaneously (e.g., security concern in a regulated industry), the spec doesn't say which takes priority or how they coordinate.

**Work:**
1. Add a "Protocol Coordination" section to Part 11 (max 30 lines) that defines:
   - Priority order when multiple protocols fire: Emergency Halt > Human Referral > Escalation > Handoff
   - Decision tree: "Is there immediate risk?" → Halt. "Does it need a human professional?" → Refer. "Does it exceed my authority?" → Escalate. "Is it someone else's work?" → Handoff.
   - Explicit statement that protocols compose (you can both escalate AND refer)
2. Add concrete examples for the 3 most common ambiguous boundaries

**Files touched:** `part11-protocols.md`
**Definition of done:** An agent (or human reading the spec) encountering an ambiguous situation can determine which protocol to invoke in under 30 seconds using the decision tree.

---

## Part 2: Definition of Done

### Design Complete (Stop Designing)

**Gate:** All six pillars above are implemented in the spec. No new specification work beyond these pillars until implementation catches up.

**Concrete criteria:**
- [ ] Trust model unified in one place, referenced from all others
- [ ] QUICKSTART.md exists and has been validated (someone can follow it cold)
- [ ] Zero uncited empirical claims
- [ ] All 14 spec-gaps resolved with concrete thresholds
- [ ] All codebase review v2 defects resolved (issues #10-22)
- [ ] Failure chains documented in Part 7
- [ ] Protocol coordination decision tree in Part 11
- [ ] Spec freeze in effect: no new Parts, agents, or protocols

**When you know you're done:** A fresh reader rates the spec ≥8.5/10 on a critical review with the same methodology as the current review. Zero Critical gaps. Zero High-severity defects.

---

### MVP Complete (Stop Building MVP)

**What MVP is:** The minimum implementation that proves the thesis — "deterministic enforcement beats advisory guidance" — with working code someone can actually use.

**MVP scope (and nothing more):**
1. One complete Starter profile deployment running on Claude Code:
   - AGENTS.md with Mission, Boundaries, Ground Truth
   - Standing Orders loaded into agent context
   - One enforced hook (token budget gate or scope boundary)
   - Decision authority tiers configured (Autonomous / Propose / Escalate)
2. QUICKSTART.md validated end-to-end (someone followed it, it worked)
3. Control plane MVP operational (already exists — event streaming, runaway detection, dashboard)
4. One documented example: task assigned → agent works → hook fires → governance intervenes → task completes correctly

**Concrete criteria:**
- [ ] `npm run build` passes (control-plane)
- [ ] At least one hook fires deterministically on every qualifying event
- [ ] Standing Orders loaded and verified in agent context
- [ ] Decision authority tiers enforced (not just documented)
- [ ] End-to-end example documented with actual output (not hypothetical)
- [ ] QUICKSTART.md followed cold by someone who didn't write it — they succeed

**When you know you're done:** Someone who has never seen Admiral can clone the repo, follow QUICKSTART.md, and have a governed agent running with enforced hooks within 2 hours. The hook demonstrably prevents a bad outcome that advisory instructions would miss.

---

### v1.0 Complete (Stop Building v1)

**What v1.0 is:** A complete, stable Starter-to-Team implementation that a small team (1-5 people) can adopt for real project work.

**v1.0 scope:**
1. Everything in MVP, plus:
2. Team profile operational:
   - Orchestrator agent routing tasks to 2+ worker agents
   - Handoff protocol enforced with validation hooks
   - Escalation protocol operational with structured reports
3. Brain Level 1 operational (markdown files with manual curation)
4. At least 3 hooks enforced (token budget, scope boundary, one more from the 13 categories)
5. Health metrics collected and viewable (control plane dashboard)
6. One real project completed using Admiral governance (not a demo — actual work product)

**Concrete criteria:**
- [ ] All MVP criteria met
- [ ] Multi-agent routing works (Orchestrator → Workers)
- [ ] Handoff protocol validated with acceptance criteria checks
- [ ] Escalation reports generated and routed correctly
- [ ] Brain L1 entries created, queried, and used in agent decisions
- [ ] 3+ hooks firing deterministically
- [ ] Health dashboard shows throughput, quality rate, escalation rate
- [ ] One real project completed with post-mortem documenting what governance caught
- [ ] Semantic versioning at v1.0.0 (drop -alpha label)
- [ ] Framework version policy: "the API surface, Standing Orders, agent definition format, Brain schema, and enforcement model will not change without notice" — stability commitment

**When you know you're done:** A team of 3 developers uses Admiral to complete a real 2-week project. Post-mortem shows: (a) governance caught at least one issue that would have been missed without it, (b) governance overhead was <15% of total session tokens, (c) no governance theater — every governance component was used, not just present.

---

### Release Requirements (What Must Be True to Publish)

**For MVP release (public alpha):**
- [ ] QUICKSTART.md validated by external user
- [ ] All Critical and High defects from codebase review resolved
- [ ] Zero uncited empirical claims
- [ ] Working example with actual output included in repo
- [ ] LICENSE file present
- [ ] README.md updated with accurate scope (what works today, not what's planned)
- [ ] CI passes (spec-validation workflow green)
- [ ] Version: v0.6.0-alpha or v0.7.0-alpha (depending on scope of changes)

**For v1.0 release (public stable):**
- [ ] All MVP release requirements met
- [ ] All v1.0 completion criteria met
- [ ] At least one external team has used Admiral on a real project and provided feedback
- [ ] spec-gaps.md shows zero Critical, zero Moderate gaps
- [ ] Post-mortem from real project usage published as Case Study 5
- [ ] Stability commitment: no breaking changes without major version bump
- [ ] Version: v1.0.0

---

## Part 3: Execution Order

**Phase 1 — Fix the spec (Pillars 3, 4):** ~1-2 sessions
Claim qualification and spec trimming are the fastest wins. They fix credibility issues and resolve known defects without structural changes. Do these first because they make the spec honest before we build on it.

**Phase 2 — Add structure (Pillars 1, 5, 6):** ~1-2 sessions
Trust unification, failure chains, and protocol coordination add structural clarity. These require careful cross-referencing but don't change the framework's substance — they connect what's already there.

**Phase 3 — Bootstrap path (Pillar 2):** ~1 session
QUICKSTART.md depends on the spec being clean (Phase 1) and structurally coherent (Phase 2). Write it last so it references the final state.

**Phase 4 — MVP implementation:** ~2-4 sessions
Build the minimum working example: one agent, one hook, Standing Orders, decision authority. Validate QUICKSTART.md end-to-end.

**Phase 5 — v1.0 implementation:** ~4-8 sessions
Multi-agent routing, handoff protocol, escalation, Brain L1, health dashboard. Run a real project. Write Case Study 5.

---

## Part 4: What We Explicitly Will NOT Do Before v1.0

These are explicitly out of scope. They are not forgotten — they are deferred.

- Brain Level 2 or 3 (Postgres, pgvector, MCP)
- A2A protocol with mTLS
- Five ecosystem agents (Part 12)
- Six feedback loops (Part 12)
- Seven proprietary datasets (Part 12)
- Multi-operator governance
- Quarantine immune system (5 layers)
- Rating system implementation
- Meta-agent Admiral
- Progressive autonomy automation
- Cloud deployment guides
- Any new specification Parts

The spec for these features exists and is preserved. Implementation waits until v1.0 proves the core thesis works.
