<!-- Admiral Framework v0.3.1-alpha -->
# INTENT ENGINEERING

*The shared dialect between Admirals and Brains.*

-----

## What Intent Engineering Is

**Intent engineering** is the practice of structuring instructions around outcomes, values, constraints, failure modes, and judgment boundaries — not just outputs. It is the evolution beyond prompt engineering (crafting a single call-and-response) and beyond context engineering (designing information flows across a system). Intent engineering ensures that every instruction communicates *why* the work matters, *what lines must not be crossed*, and *what to do when things go wrong*.

An output-oriented prompt says: **"Deploy this code to production."**

An intent-engineered instruction says:

> Deploy this code to production. The goal is to ship this feature within two weeks. This is important but not urgent enough to justify skipping tests or other pipeline events. If deployment fails, rollback and notify the Admiral rather than attempting workarounds. Do not acquire credentials that are not already available to you. Do not edit credentials, passwords, or permissions without authorization from the Admiral. If accomplishing the goal of a subtask seems to violate one of these constraints, stop and ask how to proceed.

The difference is not length. The difference is that the second instruction gives the agent everything it needs to make good decisions *when the plan breaks down* — which it will.

-----

## The Lineage

| Generation | Discipline | Operates On | Core Question |
|---|---|---|---|
| 2023–2025 | **Prompt Engineering** | A single prompt for a single agent | "How do I word this so the model gives me what I want?" |
| 2025–2026 | **Context Engineering** | Information flows across a fleet | "What information exists where, when, and why?" |
| 2026– | **Intent Engineering** | Outcomes, values, and judgment boundaries across an entire system | "What matters, what must not happen, and when must the human decide?" |

Each generation subsumes the previous. Intent engineering does not replace context engineering — it requires it. You still need the five dimensions of context (Section 04). You still need the enforcement spectrum (Section 08). Intent engineering adds a layer above both: the communication of *purpose, priority, and permission boundaries* that allows agents to exercise judgment within defined limits rather than following brittle scripts.

-----

## The Six Elements of Intent

Every intent-engineered instruction — whether it is a mission statement, a task assignment, a hook rationale, or a Brain entry — should address six elements. Not every instruction needs all six explicitly, but the Admiral should be conscious of which elements are present and which are deliberately omitted.

### 1. Goal

What the outcome should be. Not the steps — the destination.

- **Weak:** "Run the test suite."
- **Intent:** "Verify that the authentication flow works end-to-end before we ship to staging."

The goal gives the agent permission to adapt its approach when obstacles arise, because it knows *what success looks like*, not just what buttons to press.

### 2. Priority

How this work ranks against competing concerns. Without priority, every instruction is equally urgent and agents cannot make trade-offs.

- **Weak:** "Fix this bug."
- **Intent:** "Fix this bug. It is blocking the release, so it takes precedence over the refactoring work in the current sprint."

### 3. Constraints

What must not happen, regardless of how attractive the shortcut appears. Constraints are the walls of the corridor the agent operates within.

- **Weak:** "Deploy to production."
- **Intent:** "Deploy to production. Do not skip tests, do not bypass the CI pipeline, do not acquire credentials beyond what is already available to you."

Constraints map directly to the enforcement spectrum (Section 08). The most critical constraints should be hooks. The rest should be firm guidance. But even firm guidance is more effective when the agent understands *why* the constraint exists.

### 4. Failure Modes

What to do when things go wrong. Without explicit failure instructions, agents default to workarounds — which compound into larger failures.

- **Weak:** (nothing — the instruction assumes success)
- **Intent:** "If deployment fails, rollback immediately and notify the Admiral. Do not attempt alternative deployment paths without authorization."

This element connects directly to the recovery ladder (Section 22) and the failure mode catalog (Section 23). Intent engineering makes the recovery path part of the instruction, not an afterthought.

### 5. Judgment Boundaries

Where the agent's authority ends and the human's begins. This is the most important element of intent engineering and the one most often missing.

- **Weak:** "Handle edge cases as appropriate."
- **Intent:** "If accomplishing a subtask seems to require violating one of these constraints, stop and ask the Admiral how to proceed."

Judgment boundaries are not a sign of distrust. They are a sign of clarity. They tell the agent: *here is where I need the human angle — taste, ethics, strategic context, stakeholder relationships, or domain expertise that you cannot derive from your training data.*

### 6. Values

What principles should guide decisions in ambiguous territory — the space between explicit constraints where the agent must exercise judgment.

- **Weak:** "Write good code."
- **Intent:** "Favor readability over cleverness. Prefer reversible changes. When in doubt, do less and explain your reasoning."

Values are the softest element and the hardest to enforce. They operate at the guidance tier of the enforcement spectrum. But when an agent has internalized the values of a well-written instruction, it makes better decisions in the vast space of situations the Admiral did not explicitly anticipate.

-----

## Why This Matters Across the Framework

Intent engineering is not a single document's concern. It is the shared dialect that connects every component of the Admiral Framework:

| Component | How Intent Engineering Applies |
|---|---|
| **Admiral self-calibration** (Section 33) | Intent fluency is the Admiral's primary skill. Every mission statement, boundary, and escalation trigger is an exercise in intent engineering. |
| **Agent hooks** (Section 08) | Hooks enforce constraints, but the *rationale* in the hook manifest communicates intent. An agent that understands why a hook exists is less likely to fight it. |
| **Brain knowledge protocol** (Section 16) | Brain entries that capture intent — not just facts — are more useful for future retrieval. "We chose Postgres over MongoDB" is a fact. "We chose Postgres over MongoDB because we valued transactional consistency over schema flexibility for this domain" is intent. |
| **Fleet routing** (Section 11) | Routing rules that communicate intent ("this task requires security expertise because it touches authentication") produce better specialist output than routing rules that communicate only category ("security task"). |
| **Input channel listeners** (Section 31) | Event-driven agents need intent-rich context bootstrapping. A CI failure trigger that says "the build broke" is less useful than one that says "the build broke on the authentication module, which is release-blocking." |
| **Monitoring** (Section 30) | Observability is more useful when you know what the intent was. A trace that shows "agent called API 47 times" becomes diagnostic only when paired with "the intent was to call it once." |
| **Token brokerage** (Section 26) | Cost management decisions require intent. "This task used 50,000 tokens" is a metric. "This task used 50,000 tokens against a budget of 10,000 because the agent did not understand the scope constraint" is actionable. |
| **Attack corpus** (attack-corpus/) | Attack scenarios are more useful when they capture adversarial *intent*, not just adversarial *inputs*. Understanding what an attacker is trying to achieve helps the fleet defend against novel variations. |

-----

## The Human Inflection Point

Intent engineering demands that every participant in the system — Admiral, Brain, agent — recognizes **human inflection points**: moments where the correct action requires human judgment, taste, ethics, or strategic context that an LLM cannot derive from its training data.

These inflection points are not bugs in the system. They are features. They are the moments where the Admiral's role is irreplaceable:

- **Taste:** "Is this the right user experience?" — no amount of A/B testing data substitutes for a product vision.
- **Ethics:** "Should we build this?" — capability is not permission.
- **Strategy:** "Does this align with where we're going in six months?" — agents optimize locally; Admirals think globally.
- **Stakeholder judgment:** "How will this land with the board / the customer / the team?" — social and political context that does not exist in any training corpus.
- **Novel ambiguity:** "We have never seen this situation before." — agents are pattern matchers; genuinely novel situations require human reasoning.

**This shall not be worked around.** An agent that encounters a human inflection point must stop and fetch the human angle. Not approximate it. Not infer it from patterns. Not skip it because it would slow down the pipeline. Stop and ask.

The Standing Orders (Section 36) encode many of these inflection points as escalation triggers. Intent engineering is the discipline that makes those triggers *understandable* — not just to the agent executing them, but to the Admiral writing them and the Brain storing them.

-----

## Writing Intent-Engineered Instructions

### The Pattern

```
[GOAL]               — What outcome we are trying to achieve.
[PRIORITY]           — How this ranks against competing work.
[CONSTRAINTS]        — What must not happen.
[FAILURE MODES]      — What to do when it goes wrong.
[JUDGMENT BOUNDARIES] — Where to stop and ask a human.
[VALUES]             — What principles guide ambiguous decisions.
```

### Example: Full Intent-Engineered Task Assignment

```
Goal: Migrate the user authentication module from session-based to JWT.
The migration must be backward-compatible for 30 days to allow
all clients to update.

Priority: This is the highest-priority engineering task this sprint.
It blocks the mobile app release. Deprioritize non-blocking
refactoring work if there are resource conflicts.

Constraints:
- Do not change the public API contract. Internal implementation
  changes only.
- Do not store JWTs in localStorage (XSS risk). Use httpOnly cookies.
- Do not introduce new dependencies without Propose-tier approval.
- Do not modify the permissions model. Authentication changes only.

Failure modes:
- If backward compatibility cannot be maintained, escalate immediately.
  Do not ship a breaking change.
- If the migration requires database schema changes, produce a
  migration plan for Admiral review before executing.
- If tests fail after the migration, rollback and report. Do not
  attempt to fix failing tests by weakening assertions.

Judgment boundaries:
- The session expiry duration for JWTs requires product input.
  Propose a default but flag for Admiral decision.
- If the migration surfaces security concerns in adjacent modules,
  report them but do not expand scope without authorization.

Values:
- Security over convenience. If a simpler approach is less secure,
  take the more secure path.
- Reversibility. Prefer changes that can be rolled back over
  changes that burn bridges.
```

-----

## Intent Engineering Is a Skill

Intent engineering is not a template to fill in. It is a skill that Admirals develop through practice — the skill of anticipating how an autonomous agent will interpret an instruction, where it will encounter ambiguity, and what it will do in the absence of guidance.

Every Admiral will need this skill. Every Brain must be able to interpret intent-rich entries and surface them at the right moment. It is the shared dialect of the framework — the linguistics of human-agent collaboration, purpose-built for a world where the agents are capable enough to do real damage when they misunderstand what matters.

The measure of intent engineering is not whether the instruction is long. It is whether the agent, encountering an unexpected situation halfway through execution, has enough context to either *make the right call* or *know that it cannot*.
