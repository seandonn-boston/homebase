# Agent Spec Protocol (ASP)

*The canonical format for defining what an agent is, what it can do, and who it answers to.*

-----

## Why ASP Exists

The Admiral Framework defines agents through markdown files (`agent-example.md`), JSON identity tokens (`agent-identity.json`), and prose scattered across Parts 3, 4, and 10. Each format captures a different facet — identity, authority, capabilities — but none captures the whole agent in one place. ASP unifies them.

An ASP document is a **complete, self-contained agent specification**. It tells the runtime everything it needs to instantiate the agent and tells the Admiral everything they need to govern it.

-----

## Design Principles

### 1. Authority Is Not Enforcement

The ASP defines **command relationships** — who can direct whom, who can suggest to whom, who must escalate to whom. These are the authority model.

**Enforcement** — what blocks execution versus what advises — lives in Part 3 (Deterministic Enforcement). The fleet has many actions. Only some are blocking (e.g., script injection detected by a PreToolUse hook). The rest are non-blocking (e.g., budget advisories, loop detection warnings, context health checks).

The ASP authority model does not conflate these concerns:

| Concern | Where It Lives | What It Governs |
|---|---|---|
| **Authority** | ASP `decision_authority` section | Who can command/demand/suggest/question whom |
| **Enforcement** | Part 3, hooks, Standing Orders | What halts execution vs. what advises |
| **Trust** | Part 3 Unified Trust Model | How authority tiers widen or narrow over time |

An agent's `decision_authority` in the ASP says "this agent can autonomously choose routing targets." Whether a specific routing decision is *blocked at runtime* by a scope boundary hook is an enforcement concern — handled by the hook, not by the ASP.

### 2. Separation of Specification and Instance

An ASP document describes an agent **role** — a reusable specification. It does not describe a running instance. Instance-level concerns (session ID, current token count, heartbeat state) are runtime state, not specification.

### 3. Progressive Disclosure

The ASP has 12 sections. Only 4 are required. A minimal ASP (Identity, Scope, Boundaries, Output Routing) is sufficient for a lightweight specialist. Production agents add Context Profile, Interface Contracts, Decision Authority, and Guardrails. Command agents add Liveness, Failover, and Discovery.

### 4. Composability via `extends`

Agents share patterns. A Frontend Implementer and a Backend Implementer share most of their structure — they differ in scope, file ownership, and tool access. ASP supports `extends` to inherit from a base spec and override specific sections.

-----

## ASP Sections

| # | Section | Required | Purpose |
|---|---|---|---|
| 1 | **Header** | Yes | Name, category, model tier, schedule |
| 2 | **Identity** | Yes | Who this agent is — self-concept in 1-3 sentences |
| 3 | **Scope** | Yes | Exhaustive list of responsibilities |
| 4 | **Boundaries** | Yes | What this agent does NOT do (hard constraints) |
| 5 | **Output Routing** | Yes | Where outputs go and under what conditions |
| 6 | **Context Profile** | Recommended | Standing, on-demand, and session context requirements |
| 7 | **Interface Contracts** | Recommended | Input/output schemas for each connection |
| 8 | **Decision Authority** | Recommended | Per-decision tier assignments (Enforced/Autonomous/Propose/Escalate) |
| 9 | **Context Discovery** | Optional | How the agent learns project-specific information |
| 10 | **Guardrails** | Recommended | Blast radius, bias risks, human review triggers |
| 11 | **Prompt Anchor** | Yes | 1-3 sentence north star loaded at end of system prompt |
| 12 | **Liveness & Failover** | Optional | Heartbeat spec, failure detection, recovery (command agents only) |

### Section Details

**Header** — Machine-readable metadata. Name, category, model tier, schedule, and optional `extends` reference.

**Identity** — Second-person prose ("You are the..."). Specific enough that the agent can determine "is this my job?" from this paragraph alone. This is the agent's self-concept — not a job description, but a statement of being.

**Scope** — Exhaustive list of what the agent actively does. If it's not listed, the agent doesn't do it. Each item is a concrete, actionable responsibility.

**Boundaries** — What the agent must never attempt, and who handles it instead. These are hard constraints. An agent violating its Boundaries triggers drift detection. Always specify who DOES handle the excluded responsibility — boundaries without redirects create gaps.

**Output Routing** — Where each type of output goes. Every agent must declare destinations. No orphaned outputs. Conditional routing (e.g., "to QA on completion, to Admiral on escalation") is explicit.

**Context Profile** — Three tiers: standing (always loaded), on-demand (loaded for specific task types), and session (provided per task by the Orchestrator). Maps to the context injection patterns in `fleet/context-injection.md`.

**Interface Contracts** — For each connection declared in Output Routing, define the input schema (what the agent receives) and output schema (what it produces). Contracts are the enforceable handshake — if the output doesn't match the contract, the handoff fails.

**Decision Authority** — Per-decision tier assignments. The four tiers (Enforced → Autonomous → Propose → Escalate) come from Part 3. The ASP assigns specific decisions to tiers for this agent. Optional `brain_query` column indicates when institutional memory should be consulted before deciding.

**Context Discovery** — How the agent learns project-specific information at deployment time. What does it need to discover? Where does it find it? What must be validated before work begins? References Standing Order 11 (Context Discovery).

**Guardrails** — Self-protection mechanisms. Blast radius awareness, bias risks, human review triggers, RAG grounding requirements. References Standing Orders 12-14. Every agent is a risk — this section names the specific risks and their mitigations.

**Prompt Anchor** — The agent's north star. Loaded last in the system prompt. Captures core philosophy and most important behavioral constraint. Direct address to the agent.

**Liveness & Failover** — Heartbeat specification (interval, format, failure threshold, monitors) and failover protocol (detection, fallback, recovery). Required only for command agents whose unavailability affects the entire fleet.

-----

## Authority Model

The ASP's `decision_authority` section defines **command relationships**, not enforcement behavior. The distinction matters:

### What Authority Governs

Authority determines *who can direct whom* and *what decisions require approval*:

- **Enforced**: Decision is handled by deterministic hooks. The agent never exercises judgment here.
- **Autonomous**: The agent decides without asking. Logs the decision.
- **Propose**: The agent drafts a recommendation with rationale and alternatives. Waits for approval.
- **Escalate**: The agent stops work and flags to the Admiral immediately.

### What Authority Does NOT Govern

Authority does NOT determine whether a specific runtime action is blocked or allowed. That is enforcement:

- A PreToolUse hook that detects script injection **blocks** the action (exit 2). This is enforcement.
- A PostToolUse hook that detects budget overrun **advises** the agent (exit 0 + warning). This is monitoring.
- The ASP's `decision_authority` says the agent can autonomously choose implementation patterns. Whether a specific pattern triggers a linter hook is an enforcement concern.

### The Relationship

Authority and enforcement are complementary layers:

```
Admiral
  ├── defines authority model (ASP) → who decides what
  ├── defines enforcement layer (Part 3) → what blocks vs. advises
  └── both operate simultaneously, neither subsumes the other

Agent receives task
  ├── checks decision_authority → "am I allowed to decide this?"
  ├── makes decision (if Autonomous) or proposes (if Propose)
  └── enforcement hooks fire on the resulting action
      ├── blocking hook (enforcement) → action prevented regardless of authority
      └── advisory hook (monitoring) → agent informed, retains agency
```

An agent with Autonomous authority for a decision category can still have its specific actions blocked by enforcement hooks. Authority says "you may decide." Enforcement says "but not like that." These are different questions answered by different systems.

-----

## File Format

ASP documents use **Markdown with YAML frontmatter**. The frontmatter contains machine-readable metadata (Header section). The body contains the remaining sections as markdown headings.

```markdown
---
asp_version: "1.0"
name: "Agent Name"
category: "Category"
model_tier: "tier2_workhorse"
schedule: "continuous"
extends: null
---

# Agent Name

## Identity
...

## Scope
...
```

### Why Markdown, Not JSON

Agent specs are read by both humans (Admirals reviewing fleet composition) and machines (runtimes instantiating agents). JSON is precise but hostile to prose. Markdown with YAML frontmatter is readable, diffable, and parseable. The JSON Schema (`asp.schema.json`) validates the structure; the markdown carries the content.

-----

## Validation

Two JSON Schemas are provided:

- **`asp.schema.json`** — Full schema validating all 12 sections. Use for production agents.
- **`asp-minimal.schema.json`** — Validates only sections 1-4 (Header, Identity, Scope, Boundaries). Use for lightweight specialists and early development.

Validation checks:
- All required sections present
- Header fields have valid values (model tier, schedule, category)
- Boundaries include redirect targets (who handles excluded responsibilities)
- Output Routing destinations are non-empty
- Decision Authority tiers are valid enum values
- `extends` reference points to a valid ASP document (if present)

-----

## Relationship to Existing Artifacts

| Existing Artifact | ASP Relationship |
|---|---|
| `agent-example.md` | ASP is the evolution. The template adds YAML frontmatter and formalizes optional sections. Existing agent definitions are valid ASP with minimal changes. |
| `agent-identity.json` | ASP Header replaces the identity JSON. The `asp_spec_ref` field in identity JSON points to the agent's ASP document. |
| Part 3 Decision Authority | ASP `decision_authority` section is a per-agent instantiation of the Part 3 model. Part 3 defines the tiers; ASP assigns decisions to them. |
| Part 4 Fleet Composition | ASP is the standard format for agent definitions referenced by Part 4. |
| Handoff Protocol (`handoff/v1`) | Interface Contracts in ASP define what goes into handoffs. The handoff schema defines how it's transmitted. |

-----

## Templates

Three templates are provided in `templates/`:

- **`minimal.asp.md`** — Sections 1-5 only. For lightweight specialists.
- **`standard.asp.md`** — Sections 1-8, 10-11. For most production agents.
- **`production.asp.md`** — All 12 sections. For command agents and critical infrastructure.

## Examples

Production-quality examples in `examples/`:

- **`orchestrator.asp.md`** — Full 12-section spec for the Orchestrator (command agent).
- **`custom-implementer.asp.md`** — Example using `extends` to inherit from a base implementer spec.

-----

## Versioning

ASP version is declared in the `asp_version` field of the YAML frontmatter. The current version is `1.0`.

Breaking changes (new required sections, renamed fields) increment the major version. Additive changes (new optional sections, new optional fields) increment the minor version.

-----

## See Also

- [Part 3 — Enforcement](../part3-enforcement.md) — Decision Authority tiers and enforcement spectrum
- [Part 4 — Fleet](../part4-fleet.md) — Fleet composition and agent definitions
- [Part 10 — Admiral](../part10-admiral.md) — Admiral self-calibration and trust
- [Intent Engineering](../../extensions/intent-engineering.md) — How to write intent-rich agent instructions
- [`fleet/agents/agent-example.md`](../../../../fleet/agents/agent-example.md) — Legacy template (ASP-compatible)
- [`handoff/v1.schema.json`](../../../../handoff/v1.schema.json) — Handoff protocol schema
