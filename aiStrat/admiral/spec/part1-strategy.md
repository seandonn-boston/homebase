# PART 1 — STRATEGY

*What are we building, what are the walls, and how do we know when we're done?*

*These three sections form a closed triangle. Together they answer the only questions that matter before any agent touches a keyboard: the destination, the fences, and the finish line. Every downstream artifact — agent definitions, task decompositions, quality gates — derives from this triangle. If any vertex is missing, the fleet will infer one, and the inference will be subtly wrong.*

> **Control Plane surface:** Mission alignment and boundary violations surface as alerts in the Fleet Control Plane at all profiles (Starter through Enterprise). When an agent's actions diverge from Mission or cross a Boundary, the Control Plane flags it immediately.

-----

## Project Readiness Assessment

> **TL;DR** — Before filling in the Strategy Triangle, assess whether you *can* fill it in. Ground Truth is an input to Admiral, not an output. If you cannot define Mission, Boundaries, and Success Criteria, you are not ready to deploy a fleet — you are ready to do the human work that makes deployment possible.

The Strategy Triangle (Mission → Boundaries → Success Criteria) is the foundation everything else builds on. But the triangle assumes a critical precondition: **someone can articulate what this project is, what it is not, and what "done" looks like.** For many real-world projects, that precondition is not met.

### Three Readiness States

| Readiness State | Ground Truth Status | What the Admiral (Human) Must Do | What Admiral (Framework) Can Do |
|---|---|---|---|
| **Ready** | Mission, Boundaries, Success Criteria defined. Tech stack chosen. Conventions documented. Quality gates operational (CI, tests, linting). | Proceed to fleet deployment at any profile. | Full fleet operations. All enforcement. All governance. |
| **Partially Ready** | Some Ground Truth exists but is incomplete, undocumented, or out of date. Common for existing projects with tribal knowledge or outdated docs. | Document the undocumented. Verify existing docs match reality. Establish quality gates where missing. | Starter profile only. Enforcement limited to universal constraints (budget, loops, basic prohibitions). No convention enforcement until conventions are documented. |
| **Not Ready** | No documented Ground Truth. Greenfield with no decisions made, or legacy with no maintainers and no documentation. | Create Ground Truth from scratch. For greenfield: make and document foundational decisions (tech stack, architecture, conventions). For legacy: study the codebase, interview stakeholders if any exist, write characterization tests. | Nothing useful. The fleet cannot govern what is not defined. Deploying Admiral here produces Governance Theater — hooks enforcing nothing, agents operating without context, false confidence from structured output. |

### Why "Not Ready" Cannot Be Solved by Agents

Ground Truth creation requires:

- **Strategic judgment:** "What are we building and why?" — requires understanding market, users, and organizational goals.
- **Historical context:** "Why was this decision made?" — requires access to the humans who made it, or at minimum their written rationale. Code shows *what* was done, not *why*.
- **Organizational knowledge:** "Who owns what? What's politically sensitive? What's sacred?" — requires social and institutional context no agent possesses.
- **Intent discrimination:** "Is this pattern a convention or an accident?" — requires understanding whether observed behavior was intentional. An agent analyzing code can count occurrences but cannot determine intent. See Convention Inference (failure mode #21, Part 7).

These are exactly the capabilities Part 10 (Human-Expert Routing) identifies as requiring human judgment. Ground Truth creation hits every trigger. The framework's own philosophy — that human judgment is irreplaceable for strategy, ethics, novel architecture, and institutional knowledge — applies to the creation of the framework's own inputs.

### The Preparation Path

Projects in the "Partially Ready" or "Not Ready" state enter a **Preparation phase** (see Fleet Scaling & Lifecycle, Part 8) before fleet deployment:

1. **Assess:** Which readiness state is this project in? Use the Step 0 questions in the Pre-Flight Checklist (Appendix A).
2. **Prepare:** The Admiral (human) creates or completes Ground Truth. For existing projects, this may involve documenting conventions, establishing CI/CD, writing characterization tests, and interviewing team members. For greenfield, this means making and recording foundational decisions.
3. **Verify:** Run the Starter Pre-Flight Checklist. If Mission, Boundaries, and Success Criteria are checkable, proceed. If not, continue preparation.
4. **Deploy:** Enter the Standup lifecycle phase with a Starter profile.

> **ANTI-PATTERN: AGENT-LED GROUND TRUTH CREATION** — Deploying a fleet to "discover" Ground Truth for a project where no human can articulate it. The agent infers conventions from code patterns, treating historical accidents as intentional decisions. It produces a structured, confident-sounding Ground Truth document. The human trusts it because it's well-formatted. The enforcement layer now enforces wrong rules. This is worse than having no Ground Truth — it's false confidence with deterministic enforcement behind it. Ground Truth creation is a human responsibility. The Brain preserves and extends Ground Truth; it does not create it.

-----

## Mission

> **TL;DR** — One sentence that defines what you're building. One sentence that defines success. Without these, every agent decision drifts.

Before any agent writes a line of code or makes a single decision, the fleet needs to understand what it exists to accomplish. The Mission is not a product specification. It is the strategic frame that prevents drift.

### What to Define

- **Project Identity:** What is this? One sentence. If you cannot express it in a single sentence, the fleet will not stay aligned.
- **Success State:** What must be true for this project to be considered successful? Concrete, observable terms. Not "a great user experience" but "a user can complete the core workflow in under 3 clicks with no errors."
- **Stakeholders and Audience:** Who is this for? Agents make better micro-decisions when they understand the human context behind the work.
- **Current Phase:** Greenfield, feature addition, refactor, migration, or maintenance. The phase changes how agents approach ambiguity, risk, and scope.

### The Spec-First Pipeline

The Mission is the entry point to the Spec-First Pipeline (Mission → Requirements → Design → Tasks → Implementation). Define at which pipeline stage the fleet takes over. See Work Decomposition (Part 6) for the full pipeline specification and chunking principles.

> **TEMPLATE: MISSION STATEMENT**
>
> This project is [one-sentence identity].
>
> It is successful when [concrete, observable success state].
>
> It is built for [stakeholders/audience] who need [core need].
>
> Current phase: [greenfield | feature-add | refactor | migration | maintenance].
>
> Pipeline entry: Fleet takes over at [Requirements | Design | Tasks | Implementation].

> **WHY THIS MATTERS** — Without a Mission, orchestrators will infer one from the task list. Their inferred mission will be subtly wrong, and every downstream decision will compound that error.

-----

## Boundaries

> **TL;DR** — Non-goals eliminate more bad work than goals create good work. Define what the project is NOT, the resource budgets, and the line between LLM and deterministic tooling.

Boundaries are the single most effective tool against agent drift. AI agents are relentlessly helpful — they will expand scope, add features, refactor adjacent code, and over-engineer solutions unless you explicitly tell them not to.

### Non-Goals

Explicitly state what the project is NOT. Non-goals eliminate entire categories of work that agents would otherwise explore. They are more powerful than goals because a single non-goal can prevent hundreds of misguided decisions — an agent that knows "no mobile app" never wastes tokens evaluating responsive breakpoints, touch targets, or native API access.

- **Functional non-goals:** Features, capabilities, or user flows that are explicitly out of scope.
- **Quality non-goals:** Levels of polish, optimization, or completeness that are not required at this phase.
- **Architectural non-goals:** Patterns, technologies, or approaches that must not be used.

### Hard Constraints

Hard constraints prevent catastrophic misalignment — the class of errors where the work is technically excellent but strategically wrong. An agent that builds the right feature on the wrong framework, or ships a polished UI a day after the demo, has failed regardless of code quality.

- **Tech stack:** Exact languages, frameworks, and tools with version numbers.
- **External deadlines:** Ship dates, demo dates, review dates.
- **Compatibility requirements:** Browser support, API backward compatibility, platform requirements.
- **Regulatory or policy constraints:** Anything legally or organizationally mandated.
- **Protocol scope:** MCP servers approved for use, A2A requirements (if any), and trust classification policy. See [Part 13](part13-mcp-integration.md) Section 2 for server selection criteria.

### Resource Budgets

| Resource | What to Define | Why It Matters |
|---|---|---|
| Token budget | Max tokens per task before the agent must deliver or escalate | Prevents unbounded exploration |
| Time budget | Wall-clock time limit per task | Prevents runaway loops |
| Tool call limits | Max API calls or tool invocations per task | Prevents brute-forcing solutions |
| Scope boundary | File paths, repos, and services each agent may touch | Prevents modification outside jurisdiction |
| Quality floor | Minimum acceptable quality bar, defined concretely | Prevents infinite refinement |

### The LLM-Last Boundary

The single highest-impact cost and reliability lever in fleet operations.

| Layer | Handles | Examples |
|---|---|---|
| **Deterministic first** | Everything achievable with static analysis, regex, linters, shell commands, type checkers | Formatting, linting, import sorting, dead code detection, test execution |
| **LLM when judgment is needed** | Decisions requiring understanding of intent, tradeoffs, novel design | Architecture decisions, code review for logic errors, complex refactors, debugging |

If a static tool can do it, the LLM should not. A linter catches 100% of formatting violations. An LLM catches most of them, sometimes, depending on context pressure.

> **TEMPLATE: BOUNDARIES DOCUMENT**
>
> NON-GOALS: This project does not [non-goal 1]. It does not [non-goal 2]. It does not [non-goal 3].
>
> CONSTRAINTS: Must use [tech stack with versions]. Must ship by [date]. Must support [compatibility].
>
> BUDGETS: [X] tokens per task. [Y] minutes per task. Agents may only modify files in [paths].
>
> QUALITY FLOOR: [Concrete definition of minimum acceptable quality].
>
> LLM-LAST: Deterministic tools handle: [list]. LLM handles: [list].

> **ANTI-PATTERN: SCOPE CREEP THROUGH HELPFULNESS** — An agent asked to implement a login form will also add password validation, a forgot-password flow, session management, and accessibility improvements — none requested. Each reasonable in isolation; collectively they blow the budget.

-----

## Success Criteria

> **TL;DR** — Every task needs a machine-verifiable definition of "done." Without one, agents either under-deliver or loop forever.

Every task delegation must include what "done" looks like. Without explicit exit conditions, agents either under-deliver or loop indefinitely refining output that was already acceptable.

Success Criteria belong in the Strategy tier because they must be defined before work is decomposed. Criteria shape the decomposition, not the other way around.

### Criteria Categories

- **Functional:** What must the output DO? Not "the form should work" but "submitting the form with valid data creates a record and redirects to confirmation."
- **Quality:** Measurable gates. Linting passes. Tests pass. Coverage above threshold.
- **Completeness:** What must exist beyond the core deliverable. Docs updated. Error states handled.
- **Negative:** What the output must NOT do. No new dependencies not in Ground Truth. No files modified outside scope.
- **Failure:** What happens when the criteria cannot be met? Criteria without failure guidance create a judgment vacuum — the agent must decide between partial delivery, workarounds, and escalation with no signal from the Admiral about which is preferred. Specify: "If [criterion] cannot be met, [escalate | deliver partial with explanation | block and report]."
- **Judgment boundaries:** Where is the criterion ambiguous? "Tests pass" is clear. "Error states handled" requires judgment about which error states matter. Name the ambiguity explicitly and assign it a decision authority tier.

### Machine-Verifiable Criteria

The best exit conditions are ones an agent can verify autonomously by running a command.

> **EXAMPLE: MACHINE-VERIFIABLE CRITERIA**
>
> `npm run lint` exits 0
>
> `npm run test` exits 0, all tests pass
>
> `npm run build` succeeds with no warnings
>
> `npx tsc --noEmit` exits 0
>
> No files modified outside `src/features/[feature-name]/`

For criteria that cannot be machine-verified (design quality, UX, readability), assign them to QA verification levels in Quality Assurance (Part 7).

> **TEMPLATE: TASK ACCEPTANCE CRITERIA**
>
> TASK: [Task name]
>
> FUNCTIONAL: [Testable behavior 1], [Testable behavior 2]
>
> QUALITY: [Automated check 1], [Automated check 2]
>
> COMPLETENESS: [Required artifacts beyond code]
>
> NEGATIVE: [Must not 1], [Must not 2]
>
> VERIFICATION: [Self-Check | Peer Review | Admiral Review]
>
> EXIT: Complete when all criteria pass and verification level approved.

-----

