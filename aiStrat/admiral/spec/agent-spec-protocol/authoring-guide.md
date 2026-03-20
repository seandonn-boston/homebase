# ASP Authoring Guide

*How to write agent specs that work.*

-----

## Start with the Right Template

| Your Agent | Template | Why |
|---|---|---|
| Lightweight specialist (formatter, pattern enforcer, simple transform) | `minimal.asp.md` | Sections 1-5 are sufficient. Over-specifying a simple agent wastes effort. |
| Most production agents (implementers, QA, security, design) | `standard.asp.md` | Sections 1-8 + 10-11. Decision Authority and Guardrails catch the failure modes that matter. |
| Command agents (Orchestrator, Triage) or critical infrastructure | `production.asp.md` | All 12 sections. Liveness and Failover are essential when unavailability affects the entire fleet. |

-----

## Writing Each Section Well

### Identity: Be Specific, Not Aspirational

The Identity is the agent's self-concept. It answers: "Is this my job?"

**Bad:** "You are a helpful coding assistant that can do many things."

**Good:** "You are the Backend Implementer. You write server-side code — API endpoints, data access layers, and business logic — following the project's established patterns and conventions."

The Identity should be specific enough that when the agent receives a task outside its domain, it knows to reject or escalate rather than attempt it.

### Scope: Exhaustive, Not Suggestive

The scope list is a closed set. If a responsibility isn't listed, the agent doesn't do it. This is the opposite of how most job descriptions work — scope is not "here are some things you might do" but "here is everything you do."

**Test:** Can you look at the scope list and determine whether "migrate the database to a new schema" is this agent's job? If the answer isn't clear, the scope is too vague.

### Boundaries: Always Include the Redirect

Every boundary must say who handles the excluded responsibility. A boundary without a redirect creates a gap — the agent knows it shouldn't do X, but nobody knows who should.

**Bad:** "Must not modify CI/CD pipelines."

**Good:** "Must not modify CI/CD pipelines — Handled by: DevOps Agent."

### Decision Authority: Separate Authority from Enforcement

The Decision Authority section defines *who decides*, not *what blocks*. This is the most common confusion in ASP authoring.

| What you're defining | Where it goes |
|---|---|
| "This agent can autonomously choose implementation patterns" | Decision Authority (Autonomous tier) |
| "The linter must pass before code is accepted" | Part 3 enforcement hooks — NOT in the ASP |
| "This agent must get Admiral approval for new dependencies" | Decision Authority (Propose tier) |
| "Script injection is blocked at the tool level" | Part 3 enforcement hooks — NOT in the ASP |

The fleet has many actions. Only some are blocking (enforcement hooks like script injection detection, scope boundary guards). The rest are non-blocking (budget advisories, loop warnings, context health checks). The ASP's Decision Authority is about command relationships between agents and the Admiral — not about what the enforcement layer blocks or allows.

### Guardrails: Name the Specific Risks

Generic guardrails are useless. "Be careful" is not a guardrail.

**Bad blast radius:** "This agent could cause problems if it makes mistakes."

**Good blast radius:** "Decomposition errors cascade to every downstream agent. A bad routing decision wastes an entire agent's context window."

**Bad bias risk:** "This agent might be biased."

**Good bias risk:** "Anchoring to familiar decomposition patterns; over-routing to frequently-used specialists; under-utilizing newly activated agents."

### Prompt Anchor: The Last Word

The Prompt Anchor is loaded at the very end of the system prompt — it's the last thing the agent reads before starting work. It should capture the single most important behavioral principle.

**Test:** If the agent remembered nothing else from its spec, would this anchor keep it on track?

-----

## Using `extends`

The `extends` field in the YAML header points to a base ASP document. All sections from the base are inherited. Sections present in the extending document override the base.

### When to Use It

Use `extends` when two agents share >70% of their spec but differ in scope, file ownership, or domain constraints. The Payment Service Implementer example extends the base Backend Implementer — it inherits the general backend identity, interface contracts, and context profile, but overrides scope and boundaries with payment-specific concerns.

### When NOT to Use It

Don't use `extends` for agents in different categories. A QA Agent and an Implementer share almost nothing — forcing inheritance creates confusing specs where the reader must mentally merge two documents to understand the agent.

### Override Rules

1. If a section exists in both base and extension, the **extension wins entirely** — no merging.
2. If a section exists only in the base, it is inherited as-is.
3. If a section exists only in the extension, it is added.
4. The Header is never inherited — every ASP document must have its own complete Header.

-----

## Common Mistakes

### 1. Scope Creep Through Vagueness

"Handle all backend concerns" is not a scope item — it's an invitation to do everything. Be specific: "Write API endpoint handlers for the REST API following OpenAPI spec."

### 2. Boundaries Without Redirects

"Must not touch the database" tells the agent what not to do but leaves a gap — who does the database work? Always include "Handled by: Database Agent."

### 3. Decision Authority That Duplicates Enforcement

If a constraint is enforced by a hook, it's `Enforced` tier — the agent never exercises judgment. Don't also list it as `Autonomous` or `Propose`. The hook handles it.

### 4. Over-Specifying Lightweight Agents

A Pattern Enforcer that checks naming conventions doesn't need Liveness & Failover, Context Discovery, or 15 Interface Contracts. Use the minimal template. Add sections when the agent's role demands them, not because the template has blanks.

### 5. Identity That Reads Like a Job Description

"You are responsible for..." is a job description. "You are the Orchestrator. You coordinate, you do not implement." is an identity. The agent should internalize who it *is*, not just what it *does*.

-----

## Validation Checklist

Before deploying an agent with an ASP:

- [ ] All required sections present (Identity, Scope, Boundaries, Output Routing, Prompt Anchor)
- [ ] Identity is second-person and specific enough to answer "is this my job?"
- [ ] Scope is an exhaustive closed set — no open-ended items
- [ ] Every Boundary includes a redirect to the responsible agent
- [ ] Output Routing has no orphaned destinations (every destination has a corresponding Interface Contract if using standard/production template)
- [ ] Decision Authority tiers don't duplicate enforcement hooks
- [ ] Guardrails name specific risks, not generic warnings
- [ ] Prompt Anchor captures the single most important behavioral principle
- [ ] `extends` reference (if present) points to a valid ASP document
- [ ] YAML frontmatter `model_tier` matches the intended deployment
