# Provisional Patent Application Draft #3

# Intent Engineering: Structured Methodology for Human-to-AI Agent Instruction Decomposition

**DRAFT — For Patent Counsel Review**
**Date:** March 16, 2026
**Inventor:** Sean Donn
**Priority Date:** March 14, 2026
**Priority Evidence:** Git commit `701258d`, repository `seandonn-boston/homebase`

---

## 1. Title of Invention

Intent Engineering: Structured Methodology for Human-to-AI Agent Instruction Decomposition

---

## 2. Technical Field

This invention relates to methods for structuring human instructions to autonomous AI agent systems, and more particularly to a formalized six-element decomposition methodology that transforms unstructured human intent into verifiable agent objectives with explicit failure mode definitions, judgment boundaries, and value alignment specifications.

---

## 3. Background of the Invention

### The Problem

As autonomous AI agents take on increasingly complex tasks — writing software, managing deployments, making architectural decisions — the quality of instructions they receive becomes a critical determinant of outcomes. Three fundamental problems exist in current human-to-agent instruction practices:

1. **Output-oriented instructions:** Current practice focuses on telling agents WHAT to produce ("deploy this code," "fix this bug," "write this feature"). Instructions rarely specify what must NOT happen, what to do when the plan fails, or where the agent must stop and request human judgment. When agents encounter unexpected situations — and they always do — they lack the context to make informed decisions or to know that they cannot.

2. **Implicit failure handling:** Most instructions assume success. When an agent encounters a failure mid-execution, it must improvise a recovery strategy. Without explicit failure mode instructions, agents default to workarounds — which frequently compound into larger failures. An agent told to "deploy to production" that encounters a failing test may disable the test rather than reporting the failure, because the instruction did not specify failure behavior.

3. **Missing judgment boundaries:** Agents are trained to complete tasks. Without explicit boundaries marking where agent authority ends and human judgment begins, agents will attempt to resolve situations that require human taste, ethics, strategic context, or stakeholder judgment — domains where LLM-generated responses are systematically unreliable. The most dangerous agent failures occur not when agents fail to act, but when they act confidently in domains requiring human judgment.

### Limitations of Existing Approaches

**Prompt engineering** (2023-2025) optimizes a single call-and-response interaction. It operates at the individual prompt level — crafting wording, formatting, and examples to elicit better model responses. It does not address multi-step agent operations, inter-agent coordination, failure recovery, or judgment boundaries.

**Context engineering** (2025-2026) designs information flows across agent systems — determining what information exists where, when it is loaded, and why. It solves the information architecture problem but does not address the intent communication problem: context engineering ensures agents have the right information, but not that they understand what matters, what must not happen, and when to stop.

**Template-based systems** (LangChain prompt templates, AutoGen task descriptions, CrewAI role definitions) provide structural formatting for instructions. They standardize format without standardizing the content dimensions that prevent failures. A template can ensure instructions have a "task" field without ensuring the instructions include failure modes or judgment boundaries.

No existing methodology provides:
- A formalized decomposition of human intent into structured, verifiable elements
- Explicit encoding of judgment boundaries as part of the instruction (not an afterthought)
- System-wide application of intent principles across hooks, knowledge entries, routing rules, and task assignments
- A structured approach to verifying agent output against intent specifications

---

## 4. Summary of the Invention

The present invention provides **Intent Engineering** — a formalized methodology for decomposing human intent into six structured elements before issuing instructions to autonomous AI agents:

1. **Goal** — The outcome to achieve (not the steps)
2. **Priority** — How this work ranks against competing concerns
3. **Constraints** — What must not happen, regardless of circumstances
4. **Failure Modes** — What to do when things go wrong
5. **Judgment Boundaries** — Where agent authority ends and human judgment begins
6. **Values** — Principles guiding decisions in ambiguous territory

The methodology represents the third generation in a lineage of human-to-AI instruction disciplines:
- **Prompt Engineering** (Gen 1): Optimizes a single prompt for a single agent
- **Context Engineering** (Gen 2): Designs information flows across a system
- **Intent Engineering** (Gen 3): Structures outcomes, values, constraints, and judgment boundaries across an entire system

Each generation subsumes the previous. Intent engineering requires context engineering (information must be in the right place) and prompt engineering (individual instructions must be well-formed), but adds a layer above both: the communication of purpose, priority, and permission boundaries.

The invention further provides:
- A **verification methodology** for evaluating agent output against each of the six intent elements independently, enabling decomposed assessment of intent-output alignment
- A **portable intent specification format** designed to be agent-runtime-agnostic, specifying outcomes and success criteria rather than framework-specific processing instructions
- **System-wide intent application** across enforcement hooks, knowledge entries, fleet routing, and task assignments
- A **Human Inflection Point** concept that identifies decision types requiring human judgment

---

## 5. Detailed Description

### 5.1 The Six Elements of Intent

Every intent-engineered instruction addresses six elements. Not every instruction requires all six explicitly, but the methodology requires conscious acknowledgment of which elements are present and which are deliberately omitted.

#### Element 1: Goal

The outcome to achieve — the destination, not the steps. Goals give agents permission to adapt their approach when obstacles arise, because they know what success looks like.

- **Output-oriented (current practice):** "Run the test suite."
- **Intent-engineered:** "Verify that the authentication flow works end-to-end before we ship to staging."

The difference: when tests fail, the output-oriented agent reports "tests failed." The intent-oriented agent understands the underlying purpose (verify auth works before staging) and can take informed action — perhaps investigating which auth tests failed, or checking if the failure is environment-specific.

#### Element 2: Priority

How this work ranks against competing concerns. Without priority, every instruction is equally urgent and agents cannot make tradeoffs.

- **Output-oriented:** "Fix this bug."
- **Intent-engineered:** "Fix this bug. It is blocking the release, so it takes precedence over the refactoring work in the current sprint."

#### Element 3: Constraints

What must NOT happen, regardless of how attractive the shortcut appears. Constraints define the walls of the corridor the agent operates within.

- **Output-oriented:** "Deploy to production."
- **Intent-engineered:** "Deploy to production. Do not skip tests, do not bypass the CI pipeline, do not acquire credentials beyond what is already available to you."

Constraints map directly to the enforcement spectrum: the most critical constraints should be deterministic hooks (hard enforcement); the remainder should be configuration rules (firm guidance). Even firm guidance is more effective when the agent understands WHY the constraint exists.

#### Element 4: Failure Modes

What to do when things go wrong. Without explicit failure instructions, agents default to workarounds that compound into larger failures.

- **Output-oriented:** (nothing — the instruction assumes success)
- **Intent-engineered:** "If deployment fails, rollback immediately and notify the Admiral. Do not attempt alternative deployment paths without authorization."

#### Element 5: Judgment Boundaries

Where the agent's authority ends and the human's begins. This is the most important element and the one most often missing from current practice.

- **Output-oriented:** "Handle edge cases as appropriate."
- **Intent-engineered:** "If accomplishing a subtask seems to require violating one of these constraints, stop and ask the Admiral how to proceed."

Judgment boundaries are not a sign of distrust. They identify **Human Inflection Points** — moments where the correct action requires human judgment, taste, ethics, or strategic context that an LLM cannot derive from its training data:

- **Taste:** "Is this the right user experience?"
- **Ethics:** "Should we build this?"
- **Strategy:** "Does this align with where we're going in six months?"
- **Stakeholder judgment:** "How will this land with the board / the customer / the team?"
- **Novel ambiguity:** "We have never seen this situation before."

The methodology treats Human Inflection Points as features of the system — not bugs to work around. An agent encountering a Human Inflection Point must stop and request human input, not approximate human judgment.

#### Element 6: Values

Principles guiding decisions in ambiguous territory — the space between explicit constraints where the agent must exercise judgment.

- **Output-oriented:** "Write good code."
- **Intent-engineered:** "Favor readability over cleverness. Prefer reversible changes. When in doubt, do less and explain your reasoning."

Values operate at the guidance tier of the enforcement spectrum. They cannot be mechanically enforced but significantly influence agent behavior in the vast space of situations not explicitly covered by constraints.

*Reference implementation: `aiStrat/admiral/extensions/intent-engineering.md`, Section "The Six Elements of Intent"*

### 5.2 System-Wide Intent Application

Intent engineering is not a single-prompt concern. It operates as a shared dialect across every component of an AI agent governance system:

| Component | How Intent Applies |
|---|---|
| **Enforcement hooks** | Hook rationales communicate why a constraint exists. An agent that understands why a hook fires is less likely to work around it. |
| **Knowledge entries** | Brain entries that capture intent (decisions with rationale) are more useful than entries capturing only facts. "We chose Postgres" is a fact. "We chose Postgres because we valued transactional consistency" is intent. |
| **Fleet routing** | Routing rules communicating intent ("this task requires security expertise because it touches authentication") produce better specialist output than rules communicating only category ("security task"). |
| **Task assignments** | Every task delegation includes goal, priority, constraints, failure modes — not just a description of work to do. |
| **Monitoring and observability** | Observability is more useful with intent context. "Agent called API 47 times" is a metric. "Agent called API 47 times against an intent of calling it once" is actionable. |
| **Cost management** | "Task used 50,000 tokens" is data. "Task used 50,000 tokens against a budget of 10,000 because the agent did not understand the scope constraint" is a diagnosis. |

This system-wide application distinguishes intent engineering from prompt engineering: prompt engineering optimizes individual interactions; intent engineering creates a consistent communication framework across every interaction in the system.

*Reference implementation: `aiStrat/admiral/extensions/intent-engineering.md`, Section "Why This Matters Across the Framework"*

### 5.3 Verification Against Intent Specification

The six-element decomposition naturally enables structured verification of agent output. By evaluating output against each element independently, the methodology provides a framework for identifying precisely where intent-output misalignment occurs:

| Element | Verification Method |
|---|---|
| Goal | Did the output achieve the stated outcome? |
| Priority | Was the work prioritized correctly relative to competing concerns? |
| Constraints | Were all stated constraints respected? (Binary — any violation is a failure) |
| Failure Modes | When failures occurred, did the agent follow the specified recovery behavior? |
| Judgment Boundaries | Did the agent stop and request human input at the specified boundaries? |
| Values | Do the agent's decisions in ambiguous territory reflect the stated values? |

Constraint verification is binary and can be partially automated (checking that specific actions were not taken). Goal and values verification requires judgment and may involve human review. This decomposed verification enables precise identification of where intent-output misalignment occurs — distinguishing between "the agent did the wrong thing" (goal failure), "the agent did a forbidden thing" (constraint violation), "the agent didn't stop when it should have" (judgment boundary overrun), and "the agent's approach was inconsistent with organizational principles" (value misalignment).

*Note: The verification methodology described here is derived from the six-element structure defined in the specification. Automated tooling to perform this verification is a planned extension, not yet implemented.*

### 5.4 Portable Intent Specification Format

The six-element structure produces intent specifications that are inherently agent-runtime-agnostic. Because the format specifies WHAT the agent should achieve and HOW to judge success — not HOW the agent should process instructions internally — the same structured intent document can be consumed by any agent framework.

```
Goal: [outcome description]
Priority: [ranking against competing work]
Constraints:
  - [what must not happen #1]
  - [what must not happen #2]
Failure modes:
  - [if X fails, do Y]
  - [if Z fails, do W]
Judgment boundaries:
  - [stop and ask when...]
Values:
  - [principle #1]
  - [principle #2]
```

This format is designed to be consumable by any agent framework — Claude Code (via AGENTS.md), CrewAI (via task definitions), LangGraph (via node configurations), AutoGen (via agent instructions), or future frameworks — because it describes purpose, not mechanism. The reference implementation demonstrates this format within the Admiral Framework; cross-framework portability is an architectural property of the format's design, validated within the Admiral ecosystem.

*Reference implementation: `aiStrat/admiral/extensions/intent-engineering.md`, Section "Writing Intent-Engineered Instructions"*

### 5.5 Intent Engineering as a Professional Skill

The methodology defines intent engineering as a learnable skill — not a template to fill in. The skill involves:

1. **Anticipation:** Predicting how an autonomous agent will interpret an instruction
2. **Ambiguity identification:** Recognizing where the instruction leaves room for unintended interpretation
3. **Boundary setting:** Defining where agent authority ends and human judgment begins
4. **Failure planning:** Specifying recovery behavior before failures occur
5. **Value articulation:** Making implicit organizational values explicit enough for an agent to apply

The measure of intent engineering quality is not instruction length. It is whether the agent, encountering an unexpected situation halfway through execution, has enough context to either make the right call or know that it cannot.

*Reference implementation: `aiStrat/admiral/extensions/intent-engineering.md`, Section "Intent Engineering Is a Skill"*

---

## 6. Claims

### Independent Claims

**Claim 1.** A method for structuring instructions to autonomous AI agents, comprising:
- (a) decomposing human intent into at least six structured elements: a goal specifying the desired outcome, a priority ranking against competing work, constraints specifying what must not occur, anticipated failure modes with specified recovery behaviors, judgment boundaries defining where agent authority ends and human judgment is required, and values specifying principles for ambiguous decisions;
- (b) validating that the structured instruction explicitly addresses each element or consciously omits specific elements with documented rationale;
- (c) transmitting the structured instruction to an AI agent system for execution;
- wherein the structured instruction provides the agent with sufficient context to either make informed decisions when encountering unexpected situations or to recognize that human judgment is required and cease autonomous action.

**Claim 2.** A method for verifying AI agent output against structured intent specifications, comprising:
- (a) receiving a structured intent specification decomposed into at least: goal, constraints, failure modes, judgment boundaries, and values;
- (b) evaluating agent output against each element independently, wherein constraint compliance is verified by checking that specified prohibited actions were not taken, and judgment boundary compliance is verified by checking that specified escalation points triggered human consultation;
- (c) identifying specific elements where agent output diverges from stated intent;
- (d) classifying constraint violations as binary failures regardless of output quality on other elements;
- wherein the decomposed evaluation enables precise identification of where intent-output misalignment occurs, distinguishing between goal failures, constraint violations, judgment boundary overruns, and value misalignment.

**Claim 3.** A portable intent specification format for AI agent systems, comprising:
- (a) a structured document format specifying at least: outcome goal, priority ranking, operational constraints, anticipated failure modes with recovery instructions, judgment boundaries identifying where human input is required, and decision-guiding values;
- (b) the specification format being agent-runtime-agnostic by design, specifying what the agent should achieve and how to judge success rather than how the agent should process instructions internally;
- (c) system-wide application of the intent format across enforcement hooks, knowledge entries, fleet routing rules, task assignments, and monitoring — not limited to individual prompts;
- wherein the structured intent document is designed to operate consistently across different AI agent frameworks and across different components within a single framework by describing purpose and success criteria rather than framework-specific processing instructions.

### Dependent Claims

**Claim 4.** The method of Claim 1, further comprising:
- identifying Human Inflection Points within the instruction scope — decision types requiring human judgment, taste, ethics, strategic context, or stakeholder relationships that cannot be derived from model training data;
- encoding the identified Human Inflection Points as explicit judgment boundaries within the structured instruction;
- requiring the agent to cease autonomous action and request human input when encountering a Human Inflection Point;
- wherein Human Inflection Points are treated as features of the system rather than limitations to work around.

**Claim 5.** The method of Claim 1, wherein the constraints element maps to a tiered enforcement spectrum:
- constraints classified as safety-critical are enforced by deterministic hooks operating independently of the AI agent's language model;
- constraints classified as important are embedded as configuration rules with high but degradable reliability;
- constraints classified as preferential are communicated as guidance;
- wherein the enforcement tier assignment is part of the intent specification, not determined separately.

**Claim 6.** The method of Claim 1, wherein the failure modes element connects to a predefined recovery ladder comprising sequential steps:
- retry with variation;
- fallback to a simpler approach;
- backtrack to a previous checkpoint;
- isolate and skip the blocked task;
- escalate to human intervention;
- wherein the intent specification selects which recovery strategies are appropriate for each anticipated failure mode.

**Claim 7.** The cross-framework format of Claim 3, further comprising system-wide intent application wherein:
- enforcement hook rationales communicate why constraints exist, reducing agent circumvention;
- knowledge entries capture decision rationale (not just outcomes), enabling future agents to understand and apply past reasoning;
- fleet routing rules communicate task intent (why a specialist is needed), producing better specialist output than category-only routing;
- monitoring systems pair observed metrics with intended metrics, transforming raw data into actionable diagnostics.

**Claim 8.** The verification system of Claim 2, further comprising:
- automated verification of constraint compliance by checking that specified prohibited actions were not taken;
- automated verification of judgment boundary compliance by checking that specified escalation points triggered human consultation;
- human-assisted verification of goal achievement and value alignment;
- generating a structured misalignment report identifying per-element divergences between intent and output.

**Claim 9.** The method of Claim 1, wherein the method defines a generational lineage:
- a first generation (prompt engineering) operating on individual prompts for individual agents;
- a second generation (context engineering) operating on information flows across agent systems;
- a third generation (intent engineering) operating on outcomes, values, constraints, and judgment boundaries across entire systems;
- wherein each generation subsumes the previous and the third generation requires both prior generations as prerequisites.

---

## 7. Prior Art Differentiation

| System/Approach | What It Does | What It Lacks vs. This Invention |
|---|---|---|
| Prompt Engineering (general practice) | Optimizes wording of individual prompts | No structured decomposition; no failure modes; no judgment boundaries; operates on single interactions, not systems; informal practice, not formalized methodology |
| LangChain Prompt Templates | Provides structural formatting for prompts with variable substitution | Format standardization only; does not require failure modes, judgment boundaries, or values; single-prompt scope |
| CrewAI Role Definitions | Defines agent roles with backstory, goal, and expected output | Role-level, not task-level; no failure modes; no judgment boundaries; no constraint encoding; no verification system |
| AutoGen Task Descriptions | Specifies tasks for multi-agent conversations | Unstructured text; no required elements; no failure mode specification; no judgment boundary concept |
| Constitutional AI (Anthropic) | Uses principles to guide model behavior during training | Training-time intervention, not instruction-time methodology; principles are model-internal, not explicitly communicated in instructions; no task-specific application |
| OpenAI Function Calling / Tool Use | Structures agent-tool interactions with schemas | Structures tool inputs/outputs, not human-agent intent communication; no failure modes; no judgment boundaries; no values |
| RLHF / RLAIF | Aligns model behavior with human preferences via training | Training-time alignment, not instruction-time communication; cannot encode task-specific constraints, failure modes, or judgment boundaries |

---

## 8. Figures List

1. **Figure 1: The Generational Lineage** — Three-generation diagram showing Prompt Engineering (2023-2025, single prompt) → Context Engineering (2025-2026, information flows) → Intent Engineering (2026+, outcomes/values/boundaries), with "each subsumes previous" annotation.

2. **Figure 2: The Six Elements of Intent** — Hexagonal diagram showing Goal, Priority, Constraints, Failure Modes, Judgment Boundaries, and Values as interconnected elements of a complete intent specification.

3. **Figure 3: System-Wide Intent Application** — Hub-and-spoke diagram showing Intent Engineering at center, with connections to Hooks (rationale), Brain (decision context), Routing (task intent), Monitoring (metric context), and Task Assignment (full specification).

4. **Figure 4: Intent Verification Flow** — Pipeline diagram showing agent output → per-element evaluation (Goal check, Constraint check, Failure Mode check, Judgment Boundary check, Value check) → alignment scores → misalignment report.

5. **Figure 5: Human Inflection Point Decision Tree** — Flowchart showing: Agent encounters decision → Is this within defined constraints? → Yes: proceed → Does this require taste/ethics/strategy/stakeholder judgment? → Yes: STOP and request human input → No: proceed with values-guided judgment.

6. **Figure 6: Portable Intent Specification** — Diagram showing a single Intent Specification document designed for consumption by multiple frameworks (Claude Code, CrewAI, LangGraph, AutoGen) with "purpose-based, not mechanism-based" annotation.

---

## 9. Specification References

| Component | Repository Path |
|---|---|
| Core extension specification | `aiStrat/admiral/extensions/intent-engineering.md` |
| Context engineering foundation | `aiStrat/admiral/spec/part2-context.md` |
| Execution integration | `aiStrat/admiral/spec/part6-execution.md` |
| Admiral self-calibration | `aiStrat/admiral/spec/part10-admiral.md` |
| Enforcement spectrum (constraint mapping) | `aiStrat/admiral/spec/part3-enforcement.md` |
| Recovery ladder (failure mode handling) | `aiStrat/admiral/spec/part7-quality.md` |
| Standing Orders (intent in practice) | `admiral/standing-orders/` |
| Sales pitch (intent engineering positioning) | `aiStrat/sales-pitch-30min-guide.md` |
| Invention date evidence | `research/invention-dates.md`, Entry #8 |
