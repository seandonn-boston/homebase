<!-- Admiral Framework v0.1.1-alpha -->
# Admiral Framework — Capitalization Plan

**Date:** 2026-03-05
**Question:** Admiral exists. How do we extract value from it?

---

## The Strategic Choice: Greenfield vs. Existing

### Greenfield

**Pros:**
- Start at Level 1 with clean slate — no retrofitting
- Validates the full adoption ladder (Level 1 → 2 → 3 → 4)
- Every decision from day one is governed, logged, and traceable
- The framework guides every step — mission, boundaries, fleet composition
- Proof is clean: "we built this entire thing using Admiral" is a strong signal

**Cons:**
- Slower to show results — you're building the project AND proving the framework
- No baseline to compare against (can't say "Admiral made this better" without a before state)
- Risk of over-engineering: temptation to deploy Level 4 on day one because you built Level 4

**Best for:** A project where the process IS the product — where you want to demonstrate Admiral's value to others, or where the project itself benefits from being built with visible governance from the start.

### Existing Project

**Pros:**
- Immediate baseline — you know what the project looks like without Admiral
- Can retrofit incrementally: hooks first, then boundaries, then fleet
- Fastest path to proving the enforcement spectrum (hooks vs. instructions)
- Tangible before/after comparison: "this is what changed"
- You already know the codebase, so context engineering has a head start

**Cons:**
- Retrofitting is messier than starting clean — existing conventions may conflict with Admiral patterns
- Adoption level is ambiguous (you're not starting at Level 1; you're somewhere between 1 and 2)
- Existing technical debt may confuse signal (did quality improve because of Admiral, or because you fixed the debt?)

**Best for:** Proving Admiral works in the real world. Fastest path to evidence.

---

## Recommended Approach: Existing First, Greenfield Second

**Phase 1 — Retrofit Admiral onto an existing project.** This proves the core thesis (enforcement spectrum, governance, context engineering) against a real codebase with real history. Pick the project with the most active development — the one where drift, scope creep, and context loss are already pain points. That's where Admiral adds the most visible value.

**Phase 2 — Start a greenfield project using Admiral from day one.** This validates the adoption ladder and produces a clean case study. By this point you've already proven the framework works, so you can apply lessons from Phase 1.

---

## Phase 1: Retrofitting an Existing Project

### Week 1 — Level 1: Disciplined Solo

The minimum viable Admiral deployment. 30 minutes of setup, immediate value.

**Step 1: Write the Mission (Section 01)**
One sentence: what the project is. One sentence: what success looks like. This already exists in your head — write it down in a format agents can consume.

**Step 2: Write the Boundaries (Section 02)**
Non-goals. Hard constraints. Tech stack with versions. File scope boundaries. Quality floor. LLM-Last boundary. This is the highest-value artifact — it prevents every future instance of scope creep.

**Step 3: Classify your constraints (Section 08)**
Go through your existing AGENTS.md (or create one). For each rule, ask: "If this is violated, does it matter?" If yes → it should be a hook. If no → it can stay as an instruction. Implement the hooks.

**Step 4: Load Standing Orders (Section 35)**
The 15 non-negotiable rules. Pick the 5 most relevant to your project and add them to your agent's standing context. Don't load all 15 on day one — that's context stuffing.

**Deliverable:** A governed single agent with enforcement. You can already measure: do hooks catch violations that instructions miss?

### Weeks 2–3 — Level 2: Core Fleet

**Step 5: Define 5–8 agent roles**
Pull from fleet/ catalog. Start with: Orchestrator, Backend Implementer, Frontend Implementer (if applicable), QA Agent, and 1–2 governance agents (Token Budgeter + Hallucination Auditor minimum).

**Step 6: Write routing rules**
Which agent handles which task type. Which agent owns which directories. What happens when routing is ambiguous.

**Step 7: Define interface contracts**
What each agent delivers to the next. Start with the 3 most common handoffs in your project.

**Step 8: Implement file-based checkpoints**
Session persistence. Decision log. Handoff documents. This is where cross-session knowledge loss gets addressed.

**Deliverable:** A coordinated fleet. Measurable: throughput, first-pass quality rate, handoff rejection rate. Compare to pre-Admiral baseline.

### Weeks 4+ — Level 3: Governed Fleet (if warranted)

Only advance if Level 2 hits its limits — sycophantic drift emerging, quality degrading across sessions, context loss compounding.

**Step 9: Deploy remaining governance agents**
Add Loop Breaker, Drift Monitor, Bias Sentinel as needed.

**Step 10: Brain Level 1 (file-based)**
JSON files in `.brain/`. Keyword search. Prove that persistent memory improves retrieval before scaling to SQLite or Postgres.

---

## Phase 2: Greenfield Project

Once Phase 1 has proven the framework, start a new project with Admiral from day one.

### What makes a good greenfield proving ground:

- **Multi-session complexity** — the project should require enough sessions that context loss, drift, and scope creep have time to emerge (a weekend project won't show Admiral's value)
- **Multiple specialist domains** — frontend + backend + database minimum, so fleet coordination matters
- **Clear success criteria** — machine-verifiable definition of done, so you can measure quality objectively
- **Real users or real stakes** — not a toy project; something where quality, security, and governance actually matter

### Greenfield adoption path:

1. Mission + Boundaries + Success Criteria (30 min)
2. AGENTS.md + hooks (30 min)
3. Fleet composition + routing (2 hours)
4. First task decomposition using spec-first pipeline (1 hour)
5. Execute Level 2. Graduate to Level 3 when evidence supports it.

---

## What Success Looks Like

### Minimum proof (Phase 1):
- Hooks catch violations that instructions miss — documented with specific examples
- First-pass quality rate is measurable and stable or improving
- Context loss between sessions is reduced (handoff documents work)
- At least one governance agent catches a real failure mode (drift, hallucination, loop)

### Strong proof (Phase 1 + 2):
- Before/after comparison on existing project shows measurable improvement
- Greenfield project reaches Level 2 without hitting the anti-patterns Admiral catalogs
- The enforcement spectrum is validated: critical constraints as hooks, preferences as instructions
- The adoption ladder works: Level 1 → 2 transition is smooth, Level 3 adds value when Level 2 hits limits

### Full validation (longer term):
- Brain proves useful — entries are retrieved and influence decisions
- Cross-session knowledge compounds (Brain entries accessed more than once)
- Fleet scales up and down appropriately (agents added when routing gaps emerge, retired when idle)
- The framework's own failure mode catalog is validated (you encounter the documented failure modes and the documented defenses work)

---

## Open Question

Which existing project, and which greenfield idea? The choice of project determines which parts of Admiral get tested first. A backend-heavy API project exercises different fleet agents than a full-stack app. A data pipeline project would stress the Brain and Monitor more than a UI project.

The best proving ground is whichever project has the most active development and the most pain from the problems Admiral solves: drift, context loss, scope creep, quality degradation across sessions.
