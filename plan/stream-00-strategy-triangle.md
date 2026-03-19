# Stream 0: Strategy Triangle (Spec Part 1)

> *"If any vertex is missing, the fleet will infer one, and the inference will be subtly wrong." — Part 1, Strategy*

**Current score:** 1/10 | **Target:** 8/10

The Strategy Triangle (Mission, Boundaries, Success Criteria) is the foundation everything else builds on. Part 1 defines Ground Truth creation, project readiness assessment, and the three vertices that every downstream artifact derives from. Today, none of this exists as tooling — no templates, no validation, no gates. Projects can enter fleet deployment without a single strategy vertex defined.

---

### 0.1 Ground Truth & Readiness

The spec is explicit: Ground Truth is an input to Admiral, not an output. Before filling in the Strategy Triangle, a project must be assessed for whether it *can* fill it in. These items create the tooling for that assessment and the machine-readable templates that capture the results.

- [ ] **ST-01: Ground Truth document template and tooling**
  - **Description:** Machine-readable templates for the three Strategy Triangle vertices: Mission, Boundaries, and Success Criteria. The spec provides prose templates (Mission Statement, Boundaries Document, Task Acceptance Criteria). This item converts those into structured, parseable formats (YAML or JSON) that hooks and validators can consume. A Ground Truth document is the single source of strategic truth for a project — without it in a machine-readable form, no downstream enforcement is possible.
  - **Done when:** Template files exist for Mission, Boundaries, and Success Criteria in a structured format (YAML/JSON). Each template includes all fields from the spec templates (Project Identity, Success State, Stakeholders, Current Phase, Pipeline Entry for Mission; Non-Goals, Hard Constraints, Resource Budgets, Quality Floor, LLM-Last for Boundaries; Functional, Quality, Completeness, Negative, Failure, Judgment Boundaries for Success Criteria). A CLI command or script generates a blank Ground Truth document from the templates. A validator confirms a filled-in document has no empty required fields.
  - **Files:** `admiral/strategy/templates/mission.yaml` (new), `admiral/strategy/templates/boundaries.yaml` (new), `admiral/strategy/templates/success-criteria.yaml` (new), `admiral/strategy/ground-truth.schema.json` (new), `admiral/strategy/generate_ground_truth.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 1 — Strategy Triangle
  - **Depends on:** Nothing — foundational item.

- [ ] **ST-02: Project readiness assessment tool**
  - **Description:** Evaluates a project against the three readiness states defined in Part 1: Ready, Partially Ready, and Not Ready. The tool examines whether Ground Truth exists and is complete, whether a tech stack is chosen, whether conventions are documented, and whether quality gates (CI, tests, linting) are operational. The output determines which Admiral profile (Starter through Enterprise) can be deployed and what preparation work remains. This prevents the anti-pattern of deploying a fleet to "discover" Ground Truth for a project where no human can articulate it.
  - **Done when:** A script accepts a project root path and a Ground Truth document path as input. It outputs one of three states (Ready, Partially Ready, Not Ready) with a detailed breakdown of what is present and what is missing. For "Partially Ready," it lists the specific gaps. For "Not Ready," it outputs the preparation path steps from the spec (Assess, Prepare, Verify, Deploy). The assessment checks: Ground Truth completeness (via ST-01 validator), CI configuration existence, test suite existence, linter configuration existence, documented conventions.
  - **Files:** `admiral/strategy/readiness_assess.sh` (new), `admiral/strategy/readiness_checks/` (new directory with per-check scripts)
  - **Size:** L
  - **Spec ref:** Part 1 — Strategy Triangle
  - **Depends on:** ST-01 (needs Ground Truth templates to validate against).

- [ ] **ST-03: Go/No-Go gate**
  - **Description:** A hard gate that prevents fleet deployment without a complete Strategy Triangle. This is the enforcement mechanism for the readiness assessment — ST-02 diagnoses, ST-03 blocks. The gate runs during fleet standup and refuses to proceed if the Ground Truth document is missing, incomplete, or fails validation. Without this gate, the readiness assessment is advisory only, and the spec is clear that advisory-only governance degrades to Governance Theater.
  - **Done when:** A pre-deployment hook or script runs the readiness assessment (ST-02) and exits non-zero if the project is "Not Ready." For "Partially Ready" projects, it permits only Starter profile deployment and emits a warning listing the gaps. For "Ready" projects, it permits any profile. The gate is invocable as a standalone script and integrable into fleet standup sequences. Bypass requires explicit Admiral (human) override with a recorded justification.
  - **Files:** `admiral/strategy/go_no_go_gate.sh` (new), `admiral/strategy/override_log.jsonl` (new, append-only)
  - **Size:** M
  - **Spec ref:** Part 1 — Strategy Triangle
  - **Depends on:** ST-02 (invokes readiness assessment).

---

### 0.2 Task-Level Strategy

The Strategy Triangle is not only a project-level concern. Part 1 specifies that every task delegation must include success criteria, and that the Spec-First Pipeline (Mission -> Requirements -> Design -> Tasks -> Implementation) must be respected. These items enforce strategy at the task level.

- [ ] **ST-04: Task acceptance criteria template**
  - **Description:** A machine-verifiable template for task-level success criteria, implementing the Task Acceptance Criteria template from Part 1. Every task delegated to an agent must include: functional criteria (testable behaviors), quality criteria (automated checks), completeness criteria (required artifacts beyond code), negative criteria (must-nots), verification level (Self-Check, Peer Review, Admiral Review), and failure guidance (what to do when criteria cannot be met). Without this, agents either under-deliver or loop indefinitely.
  - **Done when:** A task criteria template exists in a structured format (YAML/JSON). A validator confirms all required fields are present before task dispatch. The template includes the "judgment boundaries" field from the spec — explicitly naming where ambiguity exists and assigning a decision authority tier. Tasks submitted without criteria are rejected with a specific error listing the missing fields. A CLI command generates a blank task criteria document.
  - **Files:** `admiral/strategy/templates/task-criteria.yaml` (new), `admiral/strategy/task-criteria.schema.json` (new), `admiral/strategy/validate_task_criteria.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 1 — Strategy Triangle
  - **Depends on:** ST-01 (aligns with project-level Success Criteria format).

- [ ] **ST-05: Spec-First pipeline entry point**
  - **Description:** Enforces the Spec-First Pipeline defined in Part 1: Mission -> Requirements -> Design -> Tasks -> Implementation. The Mission defines at which pipeline stage the fleet takes over (recorded in Ground Truth as "Pipeline entry"). This item ensures that a spec exists before implementation begins — the fleet cannot skip upstream stages. If Pipeline entry is "Tasks," then Requirements and Design must already exist as documents. If Pipeline entry is "Implementation," then Requirements, Design, and Task decomposition must exist.
  - **Done when:** A validator checks the Pipeline entry field from Ground Truth and verifies that all upstream pipeline stages have corresponding documents or artifacts. Missing upstream artifacts block the pipeline with a specific error ("Pipeline entry is 'Tasks' but no Requirements document found"). The validator is invocable as a standalone script and integrable into task dispatch. The required artifact paths are configurable per project.
  - **Files:** `admiral/strategy/spec_first_gate.sh` (new), `admiral/strategy/pipeline_manifest.yaml` (new, maps pipeline stages to required artifacts)
  - **Size:** M
  - **Spec ref:** Part 1 — Strategy Triangle
  - **Depends on:** ST-01 (reads Pipeline entry from Ground Truth).

---

### 0.3 Validation Hooks & Enforcement

Strategy is only as strong as its enforcement. These items create the runtime hooks and validators that ensure the Strategy Triangle is not just documented but actively enforced throughout fleet operations.

- [ ] **ST-06: Strategy Triangle validation hook**
  - **Description:** A SessionStart hook that validates Ground Truth completeness every time a session begins. This is the runtime enforcement of the Strategy Triangle — it fires deterministically at session start, not on an advisory basis. The hook loads the project's Ground Truth document, validates it against the schema (ST-01), and emits warnings or blocks execution based on completeness. This catches Ground Truth drift — documents that were complete at deployment but have since become stale or incomplete due to project evolution.
  - **Done when:** A SessionStart hook script exists that loads and validates the Ground Truth document. Missing Ground Truth blocks the session with a clear error. Incomplete Ground Truth emits structured warnings listing the empty fields. The hook is registered in the hooks manifest. Validation results are logged for audit. The hook completes in under 2 seconds (strategy validation must not slow session startup significantly).
  - **Files:** `.hooks/strategy_triangle_validate.sh` (new), `admiral/strategy/validate_ground_truth.sh` (new, reusable validation logic)
  - **Size:** M
  - **Spec ref:** Part 1 — Strategy Triangle
  - **Depends on:** ST-01 (schema and templates to validate against).

- [ ] **ST-07: LLM-Last boundary enforcement**
  - **Description:** Validates that the LLM-Last design principle is documented per project. Part 1 defines LLM-Last as "the single highest-impact cost and reliability lever in fleet operations" — if a static tool can do it, the LLM should not. This item ensures each project's Boundaries document includes an explicit LLM-Last section that partitions work between deterministic tools and LLM judgment. It does not enforce the boundary at runtime (that requires tool-call-level interception) but ensures the boundary is defined and reviewable.
  - **Done when:** The Ground Truth validator (ST-01) includes a specific check for the LLM-Last section within Boundaries. Projects without an LLM-Last section receive a warning during readiness assessment (ST-02) and session validation (ST-06). A reference LLM-Last template is provided with common deterministic-first patterns (formatting, linting, import sorting, dead code detection, test execution) and LLM-judgment patterns (architecture decisions, code review for logic, complex refactors). The template is customizable per project.
  - **Files:** `admiral/strategy/templates/llm-last.yaml` (new), `admiral/strategy/validate_llm_last.sh` (new)
  - **Size:** S
  - **Spec ref:** Part 1 — Strategy Triangle
  - **Depends on:** ST-01 (part of Boundaries template), ST-06 (hook runs this validation).

- [ ] **ST-08: Boundaries checklist**
  - **Description:** A structured, validatable checklist ensuring all Boundary categories from Part 1 are documented: Non-Goals (functional, quality, architectural), Hard Constraints (tech stack, deadlines, compatibility, regulatory, protocol scope), and Resource Budgets (token budget, time budget, tool call limits, scope boundary, quality floor). The spec is explicit that boundaries are "the single most effective tool against agent drift." An incomplete Boundaries document means entire categories of drift are unguarded.
  - **Done when:** A checklist validator reads the Boundaries section of Ground Truth and reports which categories are present, which are empty, and which are missing entirely. The validator distinguishes between "intentionally empty" (marked as N/A with justification) and "not addressed" (field absent or blank). The output is a structured report suitable for both human review and programmatic consumption. Integration with ST-02 (readiness assessment) is complete — a project with missing boundary categories cannot be "Ready."
  - **Files:** `admiral/strategy/validate_boundaries.sh` (new), `admiral/strategy/boundaries_checklist.yaml` (new, defines required categories and sub-categories)
  - **Size:** M
  - **Spec ref:** Part 1 — Strategy Triangle
  - **Depends on:** ST-01 (Boundaries template defines the categories to check).

---

## Summary

| Subsection | Items | Total Size | Focus |
|---|---|---|---|
| 0.1 Ground Truth & Readiness | ST-01 through ST-03 | 2L + 1M | Templates, assessment, deployment gate |
| 0.2 Task-Level Strategy | ST-04 through ST-05 | 2M | Per-task criteria, pipeline enforcement |
| 0.3 Validation Hooks & Enforcement | ST-06 through ST-08 | 2M + 1S | Runtime validation, LLM-Last, boundary completeness |
| **Totals** | **8 items** | **2L + 5M + 1S** | **Full Part 1 coverage** |

**Status:** All 8 items (ST-01 through ST-08) are unimplemented. No Ground Truth templates exist. No readiness assessment tooling exists. No gates prevent fleet deployment without strategy. No hooks validate the Strategy Triangle at runtime. The entire strategic foundation of the spec is unimplemented — every other stream builds on assumptions that this stream makes explicit and enforceable.

**Critical dependencies within this scope:**
- ST-01 (Ground Truth templates) is the foundational item — six of the remaining seven items depend on it directly.
- ST-02 (readiness assessment) depends on ST-01 and is itself a dependency of ST-03 (Go/No-Go gate).
- ST-06 (validation hook) depends on ST-01 and integrates ST-07 and ST-08 as sub-validations.

**Critical dependencies on other streams:**
- Stream 7 (Hooks & Fleet) — ST-06 requires hook infrastructure to be registered and invoked at SessionStart.
- Stream 8 (Execution Quality Ops) — ST-04 (task acceptance criteria) feeds into quality gates (S-13) and task dispatch.

**Recommended execution order:**
1. ST-01 (Ground Truth templates) — everything depends on this. Define the schema, create the templates, build the validator.
2. ST-04 (task acceptance criteria) — task-level counterpart to ST-01; can be built in parallel once ST-01 schema patterns are established.
3. ST-08 (boundaries checklist) — validates the most impactful vertex of the triangle; the spec calls boundaries "the single most effective tool against agent drift."
4. ST-07 (LLM-Last boundary enforcement) — small item that extends the boundaries validation with the highest-leverage single check.
5. ST-02 (readiness assessment) — integrates ST-01, ST-07, and ST-08 into a comprehensive project evaluation.
6. ST-03 (Go/No-Go gate) — wraps ST-02 in a blocking gate; quick to build once ST-02 exists.
7. ST-05 (Spec-First pipeline entry point) — enforces pipeline discipline; requires Ground Truth to contain Pipeline entry field.
8. ST-06 (Strategy Triangle validation hook) — runtime enforcement; depends on hook infrastructure and all validators being stable.
