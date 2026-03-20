# Stream 22: Intent Engineering — Beyond Prompt Engineering

> *"The measure of intent engineering is not whether the instruction is long. It is whether the agent, encountering an unexpected situation halfway through execution, has enough context to either make the right call or know that it cannot." — Admiral Framework, intent-engineering.md*

**Scope:** Implement the intent engineering framework that goes beyond simple prompts to structured intent capture, decomposition, validation, and tracking. Based on the intent engineering extension document. Intent engineering is the shared dialect between Admirals and agents — it ensures that every instruction communicates purpose, constraints, failure modes, and judgment boundaries, not just desired outputs.

**Why this matters:** Prompt engineering optimizes a single call. Context engineering optimizes information flow. Intent engineering optimizes the entire decision space — it tells agents not just what to do, but why it matters, what must not happen, and when to stop and ask a human. Without structured intent, agents fill ambiguity with assumptions. Those assumptions compound into failures that are invisible until they are expensive. Intent engineering makes the implicit explicit, reducing the gap between what the Admiral means and what the agent does.

---

## 22.1 Intent Capture

- [ ] **IE-01: Intent capture schema**
  - **Description:** Define the structured format for capturing user intent based on the six elements from the intent engineering extension: (1) **Goal** — the outcome, not the steps; (2) **Priority** — how this ranks against competing work; (3) **Constraints** — what must not happen; (4) **Failure modes** — what to do when things go wrong; (5) **Judgment boundaries** — where the agent's authority ends and the human's begins; (6) **Values** — principles guiding ambiguous decisions. The schema must be: machine-parseable (JSON schema for validation and tooling), human-readable (text rendering for agent prompts and Admiral review), and progressively completable (not all six elements are required for every intent, but missing elements are flagged). Include validation rules: a goal is always required; constraints and failure modes are required for Propose-tier and above; judgment boundaries are required for Escalate-tier.
  - **Done when:** JSON schema for intent capture exists with all six elements. Text rendering produces the pattern format from the spec. Validation rules enforce required fields by authority tier. Schema supports progressive completion with warnings for missing elements. Tests verify schema validation, text rendering, and progressive completion.
  - **Files:** `admiral/intent/schema.json` (new), `admiral/intent/intent.sh` (new — rendering and validation), `admiral/intent/tests/test_intent_schema.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Intent Engineering extension — The Six Elements of Intent; Part 11 — Standing Orders (SO 5: Decision Authority tiers)
  - **Depends on:** —

- [ ] **IE-02: Intent decomposition engine**
  - **Description:** Implement a system that breaks high-level intents into actionable sub-intents for agent assignment. When an Admiral provides a complex intent (e.g., "migrate authentication from sessions to JWT with backward compatibility"), the decomposition engine: (1) identifies the distinct sub-goals within the intent; (2) preserves the parent intent's constraints, failure modes, and values in each sub-intent (constraints flow down, not up); (3) assigns appropriate authority tiers to each sub-intent based on risk assessment; (4) identifies dependencies between sub-intents (which must complete before others can start); (5) maps each sub-intent to the agent category most qualified to handle it. The decomposition output is a structured task graph with intent-rich task assignments — not bare task descriptions, but full intent-engineered instructions per the six-element pattern.
  - **Done when:** Decomposition engine accepts a high-level intent and produces a task graph of sub-intents. Each sub-intent inherits parent constraints and values. Authority tiers are assigned based on sub-intent risk. Dependencies are identified. Agent category mapping is proposed. Tests verify decomposition of at least three example intents of varying complexity.
  - **Files:** `admiral/intent/decompose.sh` (new), `admiral/intent/tests/test_decompose.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Intent Engineering extension — The Six Elements of Intent; Part 6 — Work Decomposition; Part 4 — Fleet Composition (agent routing)
  - **Depends on:** IE-01

- [ ] **IE-03: Intent validation**
  - **Description:** Implement validation that verifies captured intent is complete, unambiguous, and achievable before agent assignment. Validation checks: (1) **Completeness** — are all required elements present for the intent's authority tier? (2) **Ambiguity detection** — does the goal contain vague terms ("improve performance," "make it better") without measurable criteria? Flag and suggest concrete alternatives. (3) **Constraint consistency** — do the constraints conflict with each other or with the goal? (e.g., "deploy to production" with "do not access production environment"). (4) **Achievability assessment** — given the current fleet composition and available tools, can this intent be fulfilled? Flag if required agent roles or tools are missing. (5) **Scope estimation** — is the intent appropriately scoped for the available budget and timeline? The validator produces a structured report with pass/warn/fail per check and suggested improvements.
  - **Done when:** Validator checks all five categories. Produces structured reports with per-check results and improvement suggestions. Ambiguity detection flags at least 10 common vague patterns. Constraint consistency detects direct contradictions. Tests verify detection of incomplete, ambiguous, conflicting, and unachievable intents.
  - **Files:** `admiral/intent/validate.sh` (new), `admiral/intent/tests/test_validate.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Intent Engineering extension — Writing Intent-Engineered Instructions; Part 11 — Standing Orders (SO 15: Pre-Work Validation)
  - **Depends on:** IE-01

---

## 22.2 Intent Tracking and Routing

- [ ] **IE-04: Intent tracking dashboard**
  - **Description:** Build a view that tracks intent progress from capture through completion. The dashboard shows: (1) **Active intents** — all in-progress intents with their current status (captured, decomposed, assigned, in-progress, blocked, completed); (2) **Sub-intent progress** — for decomposed intents, show the task graph with per-sub-intent status; (3) **Intent health** — flag intents where sub-intents are blocked, where constraints are being violated, or where the work is drifting from the original intent; (4) **Intent history** — completed intents with outcomes, allowing the Admiral to review whether the original intent was actually fulfilled; (5) **Constraint violation alerts** — real-time alerts when agent work appears to violate an intent's stated constraints or cross a judgment boundary. The dashboard integrates with the control plane (if available) or operates as a standalone CLI view.
  - **Done when:** Dashboard renders active intents with status, sub-intent progress graphs, health indicators, and constraint violation alerts. Intent history is queryable. CLI output is structured and readable. Tests verify rendering with synthetic intent data across all status states.
  - **Files:** `admiral/intent/dashboard.sh` (new), `control-plane/src/intent-view.ts` (new, if integrating with control plane), `admiral/intent/tests/test_dashboard.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 9 — Fleet Observability; Part 8 — Fleet Health Metrics
  - **Depends on:** IE-01, IE-02

- [ ] **IE-05: Intent-to-agent mapping**
  - **Description:** Implement the logic that maps intent categories to appropriate agent types and model tiers. The mapping considers: (1) **Intent category** — what domain does the intent address (backend, frontend, security, data, infrastructure, etc.)?; (2) **Required expertise** — what agent roles are needed based on the intent's goal and constraints?; (3) **Model tier selection** — based on intent complexity and risk, which model tier is appropriate (Tier 1 for high-risk/complex, Tier 3 for routine)?; (4) **Multi-agent coordination** — does the intent require multiple agents working together, and if so, what is the coordination pattern (sequential, parallel, pipeline)?; (5) **Fallback routing** — if the preferred agent type is unavailable, what alternatives exist? The mapping produces a routing plan that the Orchestrator can execute.
  - **Done when:** Mapping accepts a validated intent and produces a routing plan with agent assignments, model tier selections, and coordination patterns. Fallback routes are included. Routing plans are structured and machine-readable. Tests verify routing for at least five distinct intent categories with varying complexity levels.
  - **Files:** `admiral/intent/routing.sh` (new), `admiral/intent/tests/test_routing.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 4 — Fleet Composition (agent categories, model tiers); Part 6 — Execution (task routing)
  - **Depends on:** IE-01, IE-03

---

## 22.3 Intent Learning and Templates

- [ ] **IE-06: Intent history and learning**
  - **Description:** Record intent patterns to improve future intent capture and routing. Implement: (1) **Intent outcome recording** — when an intent completes, record the full lifecycle: original intent, decomposition, agent assignments, execution path, and final outcome (success/partial/failure with reasons); (2) **Pattern extraction** — identify recurring intent patterns (e.g., "migration intents always need backward compatibility constraints," "security intents always need human judgment boundaries for risk acceptance"); (3) **Routing effectiveness tracking** — did the agent-to-intent mapping produce good outcomes? Track which mappings led to successful completions vs. rework; (4) **Brain integration** — store intent patterns and routing effectiveness as Brain entries (category: pattern) so they inform future intent processing. Over time, the system learns which intents succeed and which fail, and why.
  - **Done when:** Intent outcomes are recorded with full lifecycle data. Pattern extraction identifies at least three recurring intent patterns from synthetic data. Routing effectiveness is tracked per agent-intent combination. Brain entries are created for significant patterns. Tests verify outcome recording, pattern extraction, and Brain integration.
  - **Files:** `admiral/intent/learning.sh` (new), `admiral/intent/tests/test_learning.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 12 — Loop 1: Agent Calibration Loop; Part 5 — Knowledge Protocol (Brain recording)
  - **Depends on:** IE-01, IE-05

- [ ] **IE-07: Intent templates**
  - **Description:** Create pre-defined intent templates for common development tasks. Each template pre-fills the six intent elements with sensible defaults that the Admiral can customize. Templates: (1) **Bug fix** — goal: reproduce and fix; constraints: no new features, minimal code changes; failure modes: if root cause unclear, escalate; judgment boundaries: if fix requires architecture changes, stop and propose; (2) **Feature implementation** — goal: implement per spec; constraints: follow existing patterns, no scope creep; failure modes: if spec is ambiguous, clarify before building; judgment boundaries: design decisions above component level require approval; (3) **Refactoring** — goal: improve code quality without changing behavior; constraints: all tests must continue passing, no API changes; failure modes: if refactoring scope grows, checkpoint and reassess; (4) **Code review** — goal: identify issues, assess quality; constraints: review only, no code changes; judgment boundaries: severity classification of found issues; (5) **Security audit** — goal: identify vulnerabilities; constraints: no exploitation, read-only access; failure modes: if vulnerability found, escalate immediately; judgment boundaries: risk acceptance requires Admiral decision. Templates are extensible — teams can add project-specific templates.
  - **Done when:** Five templates exist with all six intent elements pre-filled. Templates are loadable and customizable. Template format supports extension with custom templates. Tests verify that each template passes intent validation (IE-03) and produces valid decompositions (IE-02).
  - **Files:** `admiral/intent/templates/` (new directory), `admiral/intent/templates/bug_fix.json` (new), `admiral/intent/templates/feature.json` (new), `admiral/intent/templates/refactor.json` (new), `admiral/intent/templates/review.json` (new), `admiral/intent/templates/security_audit.json` (new), `admiral/intent/tests/test_templates.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Intent Engineering extension — Writing Intent-Engineered Instructions (full example)
  - **Depends on:** IE-01, IE-03

- [ ] **IE-09: Human inflection point detection**
  - **Description:** Implement detection of "human inflection points" — moments where agent execution must pause for human judgment. Per the intent engineering extension, these are decisions involving taste, ethics, strategy, stakeholder judgment, or novel ambiguity where "an agent that encounters a human inflection point must stop and fetch the human angle. Not approximate it. Not infer it from patterns. Not skip it." Implement as a detection layer that: (1) identifies inflection point signals in the current task context (keywords, authority tier boundaries, constraint proximity), (2) maps to the Escalate decision-authority tier from Part 3, (3) integrates with Standing Orders (which encode many inflection points as escalation triggers), (4) surfaces the inflection point to the operator with context about why human judgment is needed. Intent engineering makes these triggers understandable, not just enforceable.
  - **Done when:** Inflection point detector identifies at least 5 categories of human-required decisions (taste, ethics, strategy, stakeholder, novel ambiguity). Detection integrates with Escalate tier enforcement. Operator receives structured notification with context. Tests verify detection of each inflection category.
  - **Files:** `admiral/intent/inflection-detector.sh` (new), `admiral/intent/tests/test_inflection.sh` (new)
  - **Size:** M
  - **Spec ref:** Intent Engineering extension — The Human Inflection Point; Part 3 — Decision Authority Tiers (Escalate)
  - **Depends on:** IE-01

- [ ] **IE-10: Judgment boundary enforcement**
  - **Description:** Enforce the judgment boundaries defined in captured intents. When an intent specifies judgment boundaries (element 5 of the six-element intent), implement runtime enforcement that: (1) monitors agent actions against declared boundaries, (2) detects when an agent is approaching or crossing a boundary (e.g., making design decisions above component level when the intent restricts to component-level), (3) triggers escalation before the boundary is crossed, not after, (4) logs boundary proximity events for intent health tracking (IE-04). Judgment boundaries are the operational translation of "where the agent's authority ends and the human's begins."
  - **Done when:** Judgment boundaries from captured intents are enforced at runtime. Boundary proximity triggers pre-emptive escalation. Boundary violations are logged and reported to intent health dashboard. At least 3 boundary types are enforceable (scope, risk level, architectural impact). Tests verify enforcement and pre-emptive escalation.
  - **Files:** `admiral/intent/boundary-enforcer.sh` (new), `admiral/intent/tests/test_boundaries.sh` (new)
  - **Size:** M
  - **Spec ref:** Intent Engineering extension — Writing Intent-Engineered Instructions (judgment boundaries element); Part 3 — Enforcement Spectrum
  - **Depends on:** IE-01, IE-03

- [ ] **IE-08: Intent conflict detection**
  - **Description:** Implement detection of conflicts between concurrent intents. Conflicts arise when: (1) **Goal contradiction** — two intents have mutually exclusive goals (e.g., "add feature X to module M" and "remove module M"); (2) **Constraint violation** — one intent's goal violates another intent's constraints (e.g., intent A constrains "no changes to auth module" while intent B's goal requires auth module changes); (3) **Resource contention** — two intents require the same agent type and the fleet does not have enough capacity; (4) **Scope overlap** — two intents operate on the same files or modules, risking merge conflicts; (5) **Priority inversion** — a low-priority intent is blocking a high-priority intent's resource needs. When a conflict is detected, produce a structured conflict report with: the conflicting intents, the type of conflict, and recommended resolution (reorder, defer, merge, or escalate to Admiral).
  - **Done when:** Conflict detection identifies all five conflict types. Produces structured conflict reports with resolution recommendations. Detection runs when new intents are added (not just at decomposition time). Tests verify detection of each conflict type with synthetic intent pairs.
  - **Files:** `admiral/intent/conflict.sh` (new), `admiral/intent/tests/test_conflict.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 10 — Multi-Operator Governance (conflict resolution); Part 11 — Escalation Protocol
  - **Depends on:** IE-01, IE-03
