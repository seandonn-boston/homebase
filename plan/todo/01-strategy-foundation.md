# TODO: Strategy & Foundation

> Source: stream-00-strategy-triangle.md (ST-01 to ST-08)

The Strategy Triangle (Mission, Boundaries, Success Criteria) is the foundation everything else builds on. None of this exists as tooling today — no templates, no validation, no gates.

---

## Ground Truth Tooling

- [x] **ST-01: Ground Truth document template and tooling** — Create machine-readable YAML templates for Mission, Boundaries, and Success Criteria with all spec-defined fields; define `ground-truth.schema.json`; build `generate_ground_truth.sh` CLI to scaffold blank documents; build a validator that confirms filled-in documents have no empty required fields.
- [x] **ST-02: Project readiness assessment tool** — Build `readiness_assess.sh` that accepts a project root and Ground Truth path, checks Ground Truth completeness, CI config, test suite, linter config, and documented conventions, and outputs Ready/Partially Ready/Not Ready with a detailed breakdown and preparation path. *Completed: `admiral/bin/readiness_assess` with 5 checks (GT validation, boundaries, CI, tests, linting, conventions), --json mode, preparation path output, 23 test assertions.*
- [ ] **ST-03: Go/No-Go deployment gate** — Build `go_no_go_gate.sh` that invokes the readiness assessment (ST-02), exits non-zero for Not Ready projects, restricts Partially Ready to Starter profile, and supports Admiral override with justification logged to `override_log.jsonl`.

## Task-Level Strategy

- [ ] **ST-04: Task acceptance criteria template** — Create a machine-verifiable YAML/JSON template for task-level success criteria (functional, quality, completeness, negative criteria, verification level, failure guidance, judgment boundaries); build `validate_task_criteria.sh` that rejects tasks missing required fields.
- [ ] **ST-05: Spec-First pipeline gate** — Build `spec_first_gate.sh` that reads the Pipeline entry field from Ground Truth and verifies all upstream pipeline stage documents exist; create `pipeline_manifest.yaml` mapping stages to required artifacts.

## Validation & Enforcement

- [ ] **ST-06: Strategy Triangle validation hook** — Create a SessionStart hook that loads and validates the Ground Truth document against the schema on every session start; block on missing Ground Truth, warn on incomplete fields, log results for audit, and complete in under 2 seconds.
- [ ] **ST-07: LLM-Last boundary enforcement** — Add an LLM-Last check to the Ground Truth validator ensuring each project's Boundaries document includes an explicit LLM-Last section; provide a reference template with common deterministic-first and LLM-judgment patterns.
- [x] **ST-08: Boundaries checklist** — Build `validate_boundaries.sh` that reads the Boundaries section and reports which categories (Non-Goals, Hard Constraints, Resource Budgets) are present, intentionally N/A, or missing; integrate into readiness assessment (ST-02) so missing categories prevent Ready status.

---

## Dependencies

| Task | Depends on | Downstream |
|------|-----------|------------|
| ST-01 | — | ST-02, ST-03, ST-04, ST-05, ST-06, ST-07, ST-08 |
| ST-02 | ST-01 | ST-03 |
| ST-03 | ST-02 | — |
| ST-04 | ST-01 | Stream 8 (Execution Quality Ops — quality gates) |
| ST-05 | ST-01 | — |
| ST-06 | ST-01, Stream 7 (hook infrastructure) | — |
| ST-07 | ST-01, ST-06 | — |
| ST-08 | ST-01 | ST-02 |
