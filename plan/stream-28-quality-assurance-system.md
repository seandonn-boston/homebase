# Stream 28: Quality Assurance System — Automated Quality at Scale

> *"Self-healing quality loops are more effective than multi-pass review. Reserve human-judgment review for what machines cannot check: logic correctness, design quality, architectural alignment." — Admiral Spec, Part 7*

**Scope:** Based on Part 7 of the spec. Quality assurance in an agent fleet is not code review — it is a closed-loop system that catches mechanical errors automatically, tracks quality trends over time, and escalates only the judgment calls that machines cannot make. This stream implements the complete quality assurance pipeline: automated checks, quality gates, metrics collection, trend analysis, technical debt tracking, and regression prevention.

**Principle:** Quality is a feedback loop, not a gate. The goal is not to block bad work but to make good work the path of least resistance. Every quality signal should be actionable, specific, and traceable to a concrete improvement.

---

## 28.1 Automated Review & Test Generation

- [ ] **QA-01: Code review automation — Automated code review checks**
  - **Description:** Implement an automated code review system that runs on every code change and checks for: (1) naming convention compliance (variables, functions, files match Ground Truth conventions), (2) cyclomatic complexity violations (functions exceeding configurable threshold), (3) test presence (every new source file has a corresponding test file, every bug fix commit includes a test), (4) import hygiene (no circular dependencies, no banned imports), (5) documentation presence (public functions have doc comments), (6) file size limits (files exceeding line count threshold trigger split recommendations). The review produces a structured report matching the QA Issue Report template from Part 7 (ISSUE, SEVERITY, LOCATION, EXPECTED, ACTUAL, CONFIDENCE).
  - **Done when:** All 6 check categories are implemented. Review produces structured reports per the Part 7 template. Severity levels (Blocker/Major/Minor/Cosmetic) are correctly assigned. Review runs in < 30 seconds for typical changesets. CI integration is complete. False positive rate < 5%.
  - **Files:** `admiral/quality/code_review.sh` (new), `admiral/quality/tests/test_code_review.sh` (new), `admiral/config/review_rules.json` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 7, Quality Assurance; Verification Levels
  - **Depends on:** —

- [ ] **QA-02: Test generation framework — Generate test skeletons for new code**
  - **Description:** Implement a framework that automatically generates test skeletons when new source files are created. The generator: (1) analyzes the public API of the new file (exported functions, classes, types), (2) generates a test file with describe/it blocks for each public function, (3) includes edge case placeholders (null input, empty input, boundary values, error cases), (4) follows the project's existing test conventions (import style, assertion library, file naming). The generated tests are skeletons — they contain the structure and placeholder assertions that a developer or agent fills in. This ensures test coverage is never an afterthought.
  - **Done when:** Test skeletons are generated for new `.ts` files (control plane) and new `.sh` files (hooks/admiral). Generated tests follow existing project conventions. Edge case placeholders are included. Generated tests compile/parse without errors (skeleton assertions may be `todo`/`skip`). Generator is callable as a standalone script and integratable into CI.
  - **Files:** `admiral/quality/test_generator.sh` (new), `admiral/quality/templates/test_template.ts` (new), `admiral/quality/templates/test_template.sh` (new), `admiral/quality/tests/test_test_generator.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 7, Self-Healing as Primary QA
  - **Depends on:** —

---

## 28.2 Quality Pipeline

- [ ] **QA-03: Quality gate pipeline — Multi-stage quality pipeline**
  - **Description:** Implement a multi-stage quality pipeline that runs checks in dependency order: (1) **Lint** — ShellCheck for `.sh`, Biome for `.ts`, (2) **Type-check** — `tsc --noEmit` for TypeScript, (3) **Test** — run test suites with failure reporting, (4) **Coverage** — check coverage thresholds (fail if below minimum), (5) **Security** — scan for secrets, known vulnerabilities, unsafe patterns, (6) **Review** — run automated code review (QA-01). Each stage produces a structured pass/fail result. The pipeline stops on first Blocker-severity failure but continues through Minor/Cosmetic issues to collect the full report. The pipeline implements the self-healing loop from Part 7: failures are fed back to the agent for fixing before proceeding.
  - **Done when:** All 6 stages are implemented and run in order. Pipeline stops on Blocker failures. Full report is collected for non-Blocker issues. Self-healing loop feeds failures back to agents. Pipeline runs in CI and is callable locally. Pipeline produces a summary JSON with per-stage pass/fail and timing.
  - **Files:** `admiral/quality/pipeline.sh` (new), `admiral/quality/tests/test_pipeline.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 7, Self-Healing as Primary QA; Verification Levels
  - **Depends on:** QA-01

- [ ] **QA-04: Quality metrics collection — Collect and track quality metrics per module**
  - **Description:** Implement a metrics collection system that gathers quality data per module (directory): (1) cyclomatic complexity (average and max per module), (2) test coverage percentage, (3) code churn rate (lines changed per week), (4) defect density (bugs found per 1000 lines), (5) lint violation count and trend, (6) test count and test-to-code ratio. Metrics are stored in a structured format (JSON) with timestamps for trend tracking. Collection runs automatically in CI and can be triggered manually. Metrics are emitted in a format consumable by the control plane dashboard.
  - **Done when:** All 6 metric types are collected per module. Metrics include timestamps for trend analysis. Collection runs in CI and produces JSON output. Metrics cover both TypeScript (control-plane) and bash (hooks/admiral) codebases. Historical data accumulates across CI runs (stored as artifacts or in a metrics file).
  - **Files:** `admiral/quality/metrics_collector.sh` (new), `admiral/quality/tests/test_metrics_collector.sh` (new), `admiral/quality/metrics/` (new directory for historical data)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 7, Quality Assurance
  - **Depends on:** —

---

## 28.3 Quality Intelligence

- [ ] **QA-05: Quality trend analysis — Track trends and alert on decline**
  - **Description:** Implement trend analysis over the collected quality metrics (QA-04). The analyzer: (1) computes moving averages for each metric over configurable windows (7-day, 30-day), (2) detects declining trends (3+ consecutive measurement periods with declining quality), (3) identifies modules with the steepest quality decline, (4) generates alerts when a metric drops below a threshold or declines by more than 10% over a window, (5) produces a trend report showing quality trajectory per module. Alerts are structured and actionable: they specify which metric declined, in which module, by how much, and link to the specific commits that introduced the decline.
  - **Done when:** Trend analysis runs on historical metrics data. Declining trends are detected and alerted. Alerts are specific and actionable (module, metric, magnitude, commits). Trend reports are generated in both human-readable and JSON formats. Alert thresholds are configurable.
  - **Files:** `admiral/quality/trend_analyzer.sh` (new), `admiral/quality/tests/test_trend_analyzer.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 7, Diagnostic Decision Tree (Output quality declining)
  - **Depends on:** QA-04

- [ ] **QA-06: Technical debt tracker — Identify and track debt with remediation estimates**
  - **Description:** Implement a technical debt tracking system that identifies and catalogs debt items automatically: (1) TODO/FIXME/HACK comments in code with file location and age, (2) modules with complexity above threshold but no refactoring plan, (3) test files with skipped tests and their age, (4) dependencies with known vulnerabilities or outdated versions, (5) code duplication above threshold (from Stream 6 P-06 deduplication detection). Each debt item gets an estimated remediation effort (S/M/L) based on scope and complexity. The tracker produces a prioritized debt backlog sorted by risk (blast radius x effort) and a "debt ratio" metric (debt items / total modules).
  - **Done when:** All 5 debt source categories are scanned. Debt items are cataloged with location, age, and estimated effort. Prioritized backlog is generated. Debt ratio metric is calculated and tracked over time. Report is produced in both human-readable and JSON formats.
  - **Files:** `admiral/quality/debt_tracker.sh` (new), `admiral/quality/tests/test_debt_tracker.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 7, Quality Assurance
  - **Depends on:** QA-04

- [ ] **QA-07: Code complexity budget — Set and enforce maximum complexity per module**
  - **Description:** Implement a complexity budget system where each module has a maximum allowed cyclomatic complexity. The budget enforcer: (1) calculates current complexity per function and per module, (2) compares against configured budgets (default + per-module overrides), (3) blocks commits that would push a module over its complexity budget, (4) provides a "complexity credit" system where reducing complexity in one area earns credits to add complexity elsewhere (net complexity must not increase), (5) generates refactoring recommendations for functions above the per-function threshold. Complexity budgets are a ratchet: they can be tightened but not loosened without Admiral approval.
  - **Done when:** Per-module complexity budgets are configurable. CI blocks commits exceeding budget. Complexity credit system tracks net complexity changes. Refactoring recommendations are generated for over-budget functions. Budget ratchet is enforced (loosening requires explicit approval flag).
  - **Files:** `admiral/quality/complexity_budget.sh` (new), `admiral/config/complexity_budgets.json` (new), `admiral/quality/tests/test_complexity_budget.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 7, Quality Assurance; Part 1, Quality Floor
  - **Depends on:** QA-04

---

## 28.4 Quality Scoring & Regression Prevention

- [ ] **QA-08: Review checklist automation — Generate checklists based on change risk profile**
  - **Description:** Implement automatic review checklist generation based on the files changed and their risk profile. The generator: (1) classifies changed files by risk (hooks = high, config = high, tests = low, docs = low), (2) generates a checklist appropriate to the risk level (high-risk changes get security review, backwards compatibility check, performance impact assessment; low-risk changes get basic correctness check), (3) includes domain-specific items (database changes get migration reversibility check, API changes get contract compliance check), (4) pre-fills items that can be verified automatically (lint passes, tests pass, coverage maintained). The checklist is output as a markdown checklist suitable for PR descriptions.
  - **Done when:** Risk classification covers all file types in the project. Checklists are generated with appropriate items per risk level. Automatically verifiable items are pre-filled. Checklists are output as markdown. Generation runs as a standalone script and is integratable into PR creation workflows.
  - **Files:** `admiral/quality/review_checklist.sh` (new), `admiral/config/risk_profiles.json` (new), `admiral/quality/tests/test_review_checklist.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 7, Verification Levels
  - **Depends on:** —

- [ ] **QA-09: Quality score per module — Calculate and display module quality scores**
  - **Description:** Implement a composite quality score for each module/directory that aggregates multiple quality dimensions into a single 0-100 score. Dimensions and weights: (1) test coverage (25%), (2) complexity compliance (20%), (3) lint cleanliness (15%), (4) documentation completeness (15%), (5) code churn stability (10%), (6) defect density (15%). The score provides a quick health assessment: green (80-100), yellow (60-79), red (0-59). Scores are displayed in a module quality table and tracked over time. The scoring formula is transparent and documented so teams understand exactly how to improve their score.
  - **Done when:** Quality score is calculated per module. All 6 dimensions contribute with documented weights. Scores are classified as green/yellow/red. Module quality table is generated. Scores are tracked over time with trend indicators. Scoring formula is documented and configurable.
  - **Files:** `admiral/quality/quality_scorer.sh` (new), `admiral/config/quality_weights.json` (new), `admiral/quality/tests/test_quality_scorer.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 7, Quality Assurance
  - **Depends on:** QA-04

- [ ] **QA-10: Quality regression prevention — Prevent merges that decrease quality scores**
  - **Description:** Implement a CI gate that prevents merges which would decrease quality scores below configured thresholds. The gate: (1) calculates quality scores for affected modules on the PR branch, (2) compares against the base branch scores, (3) blocks the merge if any module's score would drop below the red threshold (60) or decline by more than 10 points, (4) allows exceptions via an explicit quality-debt acknowledgment label on the PR (which requires Admiral approval), (5) produces a quality impact report showing score changes per affected module. This implements the quality ratchet: scores can improve freely but declining below thresholds requires explicit approval.
  - **Done when:** CI gate calculates and compares quality scores between PR and base branch. Merges are blocked when scores drop below threshold or decline significantly. Exception mechanism exists with approval requirement. Quality impact report is generated and posted to the PR. Gate runs in < 60 seconds for typical PRs.
  - **Files:** `admiral/quality/regression_gate.sh` (new), `.github/workflows/quality-gate.yml` (new), `admiral/quality/tests/test_regression_gate.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 7, Quality Assurance; Part 1, Quality Floor
  - **Depends on:** QA-09, QA-04
