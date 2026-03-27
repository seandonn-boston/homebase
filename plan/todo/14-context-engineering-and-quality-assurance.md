# TODO: Context Engineering & Quality Assurance

> Sources: stream-30-context-engineering.md (CE-01 to CE-10), stream-31-quality-assurance-system.md (QA-01 to QA-10)

Context engineering treats the context window as the agent's working memory — every token matters. Quality assurance closes the loop with automated checks, metrics, trend analysis, and regression prevention. Together they move Admiral from governance framework to performance multiplier.

---

## Context Profiles & Budget

- [ ] **CE-01: Context profile implementation** — Implement the three context zones (Standing 15-25%, Session 50-65%, Working 20-30%) as a runtime data model with allocation tracking, token counting per zone, the 50K standing context hard limit, and a machine-parseable profile template (STANDING CONTEXT, SESSION CONTEXT, ON-DEMAND CONTEXT, REFRESH TRIGGERS, SACRIFICE ORDER).
- [ ] **CE-02: Context budget tracker enhancement** — Track actual vs allocated token usage per profile zone; emit warnings and trigger sacrifice order on budget overruns; log historical budget adherence; produce dashboard-ready JSON metrics.

## Context Optimization

- [ ] **CE-03: Context compression strategies** — Implement three compression strategies (summarization, prioritization, eviction) that trigger automatically at 85% utilization; protect identity and constraints from compression; make sacrifice order configurable per profile; validate compressed content preserves essential information.
- [ ] **CE-04: Context relevance scoring** — Score context items across five dimensions (recency, frequency, semantic proximity, authority weight, dependency); produce a ranked list in < 100ms for 100 items; drive eviction order during compression and loading priority during refresh.
- [ ] **CE-05: Context injection ordering** — Implement the Loading Order Protocol as an automated context assembler: identity and constraints first (primacy), reference material in the middle, current task last (recency); enforce constraints-over-task conflict resolution; validate ordering via PostToolUse hook.

## Context Lifecycle & Intelligence

- [ ] **CE-06: Context window utilization dashboard** — Visualize per-zone utilization, utilization over time, top-10 largest items with relevance scores, compression events, sacrifice order log, and comparison against spec-defined targets; highlight anomalies (standing > 25%, working growth without checkpoints, nearing window limit).
- [ ] **CE-07: Context overflow handling** — Implement graduated degradation: warning at 80%, session context compression and checkpoint at 90%, emergency minimum-viable-context at 95%, forced checkpoint and session handoff at 100%; log every compression action with what was removed and why; no silent context loss.
- [ ] **CE-08: Dynamic context allocation** — Adjust zone percentages based on task complexity (simple/standard/complex); respect standing context hard limits; log adjustments; expose allocation profiles as configurable JSON.
- [ ] **CE-09: Context preloading** — Pre-load context from four sources (file dependencies, historical patterns via Brain, skill triggers, interface contracts) before the agent requests it; respect zone budgets; deprioritize unused preloads in future predictions via learning feedback loop.
- [ ] **CE-10: Context audit trail** — Capture context snapshots at every Propose-tier and Escalate-tier decision point; record gaps, compression/eviction history, and source attribution; make the trail queryable by agent, decision, or time range; store diffs for efficiency.

## Code Review & Test Generation

- [x] **QA-01: Code review automation** — Run automated checks on every code change: naming conventions, cyclomatic complexity, test presence, import hygiene, documentation presence, file size limits; produce structured reports per the Part 7 QA Issue Report template (ISSUE, SEVERITY, LOCATION, EXPECTED, ACTUAL, CONFIDENCE); target < 30s and < 5% false positive rate. *(Implemented: `admiral/quality/code-review.ts` — 6 checkers, structured QA Issue Reports, 38 tests, 213ms)*
- [ ] **QA-02: Test generation framework** — Generate test skeletons for new `.ts` and `.sh` files with describe/it blocks for each public function, edge case placeholders, and project convention adherence; skeletons must compile/parse without errors; callable standalone and integratable into CI.

## Quality Pipeline & Metrics

- [ ] **QA-03: Quality gate pipeline** — Multi-stage pipeline (lint, type-check, test, coverage, security, review) that stops on Blocker failures, collects full reports for non-Blockers, and feeds failures back to agents via the self-healing loop; produce summary JSON with per-stage pass/fail and timing.
- [ ] **QA-04: Quality metrics collection** — Collect per-module metrics (cyclomatic complexity, test coverage, code churn, defect density, lint violations, test-to-code ratio) with timestamps; output JSON consumable by the control plane dashboard; accumulate historical data across CI runs.
- [ ] **QA-08: Review checklist automation** — Generate risk-appropriate review checklists based on changed files; classify file risk (hooks/config = high, tests/docs = low); include domain-specific items; pre-fill automatically verifiable items; output as markdown for PR descriptions.

## Quality Intelligence

- [ ] **QA-05: Quality trend analysis** — Compute moving averages (7-day, 30-day) over collected metrics; detect declining trends (3+ consecutive periods); generate actionable alerts linking metric, module, magnitude, and causal commits; configurable thresholds.
- [ ] **QA-06: Technical debt tracker** — Scan five debt sources (TODO/FIXME/HACK comments, high-complexity modules, skipped tests, vulnerable/outdated dependencies, code duplication); estimate remediation effort (S/M/L); produce prioritized backlog sorted by risk and a debt ratio metric.
- [ ] **QA-07: Code complexity budget** — Enforce per-module maximum cyclomatic complexity; block over-budget commits in CI; implement a complexity credit system (net complexity must not increase); generate refactoring recommendations; budgets ratchet — loosening requires Admiral approval.
- [ ] **QA-09: Quality score per module** — Aggregate six dimensions into a 0-100 composite score: test coverage (25%), complexity compliance (20%), lint cleanliness (15%), documentation completeness (15%), defect density (15%), code churn stability (10%); classify green/yellow/red; track over time with trend indicators.
- [ ] **QA-10: Quality regression prevention** — CI gate that blocks merges dropping a module below the red threshold (60) or declining by more than 10 points; exception via quality-debt acknowledgment label requiring Admiral approval; post quality impact report to the PR; run in < 60s.

---

## Dependencies

| Task | Depends on | Downstream |
|------|-----------|------------|
| CE-01 | — | CE-02, CE-03, CE-04, CE-05, CE-06, CE-07, CE-08, CE-09, CE-10 |
| CE-02 | CE-01 | CE-03, CE-06, CE-07, CE-08, CE-10 |
| CE-03 | CE-01, CE-02 | CE-07 |
| CE-04 | CE-01 | CE-09 |
| CE-05 | CE-01 | — |
| CE-06 | CE-01, CE-02 | — |
| CE-07 | CE-01, CE-02, CE-03 | — |
| CE-08 | CE-01, CE-02 | — |
| CE-09 | CE-01, CE-04 | — |
| CE-10 | CE-01, CE-02 | — |
| QA-01 | — | QA-03 |
| QA-02 | — | — |
| QA-03 | QA-01 | — |
| QA-04 | — | QA-05, QA-06, QA-07, QA-09, QA-10 |
| QA-05 | QA-04 | — |
| QA-06 | QA-04 | — |
| QA-07 | QA-04 | — |
| QA-08 | — | — |
| QA-09 | QA-04 | QA-10 |
| QA-10 | QA-09, QA-04 | — |
