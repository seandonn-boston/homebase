# Stream 32: Rating System Implementation — Measuring Excellence

> *"The rating measures the system, not the model. A state-of-the-art model running without governance is ADM-5. A modest model under full Admiral governance with verified Human Judgment Gates can achieve ADM-2." — Admiral Rating System*

**Scope:** Based on the rating system reference. The Admiral Rating System defines a five-tier scale (ADM-1 Premier through ADM-5 Ungoverned) that measures governance quality across agents, fleets, platforms, models, and workflows. This stream implements the tooling to calculate ratings automatically, track them over time, integrate them into CI, and surface actionable improvement recommendations. The rating system makes governance visible, measurable, and improvable.

**Principle:** You cannot improve what you cannot measure. But measurement without action is dashboard theater. Every rating must connect to a specific, actionable path toward the next tier. The rating system exists to drive improvement, not to produce numbers.

---

## 32.1 Data Model & Calculation

- [ ] **RT-01: Rating system data model — Define dimensions, scales, and calculation formulas**
  - **Description:** Define the complete data model for the Admiral Rating System. This includes: (1) the 5 rating tiers (ADM-1 through ADM-5) with their criteria from the reference, (2) the 7 core automated evaluation dimensions per entity category (agents, fleets, platforms, models, workflows) from the reference tables, (3) the hard cap rules (first-pass quality <50% caps at ADM-4, etc.), (4) the Human Judgment Gate requirements per tier, (5) the Phase 1 metric thresholds that determine tier eligibility. The data model should be a JSON schema that tooling can validate against. Include the certification tier suffixes (-SA, -IA, no suffix).
  - **Done when:** JSON schema defines all rating tiers, dimensions, caps, and gate requirements. Schema is validated against the reference document (all rules from the Rating Scale, Phase 1 Hard Caps, and Gate Failure tables are represented). Schema is documented with examples for each tier. Calculation rules are unambiguous — given the same inputs, any implementation produces the same rating.
  - **Files:** `admiral/rating/schema/rating_model.json` (new), `admiral/rating/schema/README.md` (new), `admiral/rating/tests/test_schema_validation.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Rating System reference — Rating Scale, Evaluation Protocol, Hard Caps
  - **Depends on:** —

- [ ] **RT-02: Automated rating calculation — Script that calculates current ratings**
  - **Description:** Implement a rating calculation script that collects evidence and computes the current rating for the Admiral framework itself (self-assessment). The script: (1) collects the 7 core benchmarks from operational data (first-pass quality, recovery success rate, enforcement coverage, context efficiency, governance overhead, coordination overhead, knowledge reuse), (2) runs behavioral probes where applicable (identity discipline, authority compliance, boundary compliance), (3) applies hard cap rules from the data model, (4) identifies which Human Judgment Gates would need to be passed for the next tier, (5) produces a Rating Report in the format specified by the reference (ENTITY, CATEGORY, RATING, EVIDENCE SUMMARY, GATE VERDICTS, RATIONALE, CONDITIONS, RECOMMENDED IMPROVEMENTS). The script should be honest — it will likely produce ADM-4 or ADM-5 initially, and that is the correct result.
  - **Done when:** Rating calculation runs end-to-end. All 7 core benchmarks are collected (or marked as "insufficient data" with a plan to collect). Hard caps are applied correctly. Rating Report is produced in the reference format. The script can run against the current Helm repo and produce a truthful assessment. Results are reproducible.
  - **Files:** `admiral/rating/calculate_rating.sh` (new), `admiral/rating/tests/test_rating_calculation.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Rating System reference — Evaluation Protocol, Phase 1
  - **Depends on:** RT-01

---

## 32.2 CI Integration & Badges

- [ ] **RT-03: Rating CI integration — Calculate and report ratings in CI**
  - **Description:** Integrate the rating calculation into CI so that ratings are computed on every significant change and tracked over time. The CI job: (1) runs the rating calculation script (RT-02), (2) compares the result against the previous rating, (3) alerts if the rating would decrease (regression), (4) stores the rating result as a CI artifact for historical tracking, (5) posts a rating summary to PR comments showing current rating and impact of the change. The CI job should run on a schedule (weekly) for trend tracking and on-demand for PRs that modify governance-related files (hooks, standing orders, config).
  - **Done when:** CI job runs rating calculation. Rating regressions trigger alerts. Historical ratings are stored as artifacts. PR comments show rating impact. Scheduled weekly runs produce trend data. Job completes in < 5 minutes.
  - **Files:** `.github/workflows/rating-ci.yml` (new), `admiral/rating/ci_report.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Rating System reference — Phase 4, Continuous Validation
  - **Depends on:** RT-02

- [ ] **RT-04: Rating badges — Generate badges showing current ratings**
  - **Description:** Generate SVG badges displaying the current Admiral rating (e.g., "ADM-4 Provisional" with appropriate color coding: ADM-1 gold, ADM-2 green, ADM-3 blue, ADM-4 yellow, ADM-5 red). Badges are generated from the latest CI rating result and served as static files or via a badge service URL. Include the certification tier suffix when applicable (-SA for self-assessment). Badges should be embeddable in README files and documentation.
  - **Done when:** Badge generation produces correct SVG for all 5 rating tiers. Color coding matches tier severity. Certification suffix is displayed. Badges update automatically from CI results. Badge URL or file path is documented for embedding.
  - **Files:** `admiral/rating/badge_generator.sh` (new), `admiral/rating/badges/` (new directory for generated badges), `admiral/rating/tests/test_badge_generator.sh` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** Rating System reference — Rating Scale
  - **Depends on:** RT-02

---

## 32.3 Historical Tracking & Trends

- [ ] **RT-05: Rating history tracking — Store historical ratings and generate trend charts**
  - **Description:** Implement a rating history system that stores every rating calculation result with timestamp and generates trend visualizations. The system: (1) stores rating results in a structured log (JSON Lines), (2) tracks per-dimension scores over time (not just the aggregate rating), (3) identifies the specific changes that caused rating transitions (which commit moved the rating from ADM-5 to ADM-4), (4) generates a trend summary showing rating trajectory over the last 30/60/90 days, (5) detects plateau patterns (rating stuck at the same level for extended periods) and suggests actions to break through. History is append-only and immutable — past ratings cannot be retroactively modified.
  - **Done when:** Rating history is stored as append-only JSONL. Per-dimension tracking captures all 7 core benchmarks over time. Rating transitions are linked to specific commits. Trend summaries are generated for configurable time windows. Plateau detection works and produces actionable suggestions. History file is versioned in the repo.
  - **Files:** `admiral/rating/history/rating_log.jsonl` (new), `admiral/rating/history_tracker.sh` (new), `admiral/rating/tests/test_history_tracker.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Rating System reference — Phase 4, Continuous Validation
  - **Depends on:** RT-02

- [ ] **RT-06: Rating improvement recommendations — Suggest specific actions to improve ratings**
  - **Description:** Implement a recommendation engine that analyzes the current rating and produces specific, prioritized actions to improve it. For each dimension below target: (1) identify the gap between current and target value, (2) map the gap to concrete actions (e.g., "enforcement coverage at 40% — implement hooks for SO-03, SO-04, SO-05 to reach 60%"), (3) estimate effort for each action (S/M/L), (4) prioritize by impact (which actions move the rating needle most), (5) check prerequisites (some improvements depend on others). The recommendations should reference specific stream items from other plan files when applicable. The engine implements the Rating Progression table from the reference (what must happen to move from each tier to the next).
  - **Done when:** Recommendations are generated for every dimension below target. Each recommendation includes gap size, specific action, estimated effort, and priority. Prerequisites are identified. Recommendations reference existing plan items where applicable. The Rating Progression path (ADM-5->4->3->2->1) is fully mapped to concrete actions.
  - **Files:** `admiral/rating/recommender.sh` (new), `admiral/rating/tests/test_recommender.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Rating System reference — Rating Progression
  - **Depends on:** RT-01, RT-02

---

## 32.4 Module-Level & Comparative Ratings

- [ ] **RT-07: Per-module ratings — Calculate ratings at the module level**
  - **Description:** Extend the rating system to calculate ratings at the module/directory level, not just project level. This reveals quality variance across the codebase: the hooks directory might be ADM-3 while the control plane is ADM-4. Per-module ratings use the same dimensions but scoped to the module's files: (1) test coverage for that module, (2) complexity within that module, (3) enforcement coverage for hooks in that module's domain, (4) documentation completeness for that module. Module ratings roll up to the project rating (project rating cannot exceed the lowest module rating for critical modules).
  - **Done when:** Ratings are calculated per module. All applicable dimensions are scoped correctly. Module ratings are displayed in a table. Critical modules are identified (their ratings cap the project rating). The gap between best and worst module is highlighted as a consistency metric.
  - **Files:** `admiral/rating/module_rating.sh` (new), `admiral/config/module_criticality.json` (new), `admiral/rating/tests/test_module_rating.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Rating System reference — What Gets Rated
  - **Depends on:** RT-02

- [ ] **RT-08: Rating comparison benchmarks — Compare against industry and pristine repo standards**
  - **Description:** Implement benchmark comparison that contextualizes the Admiral rating against external standards. Comparisons: (1) pristine repo standards from the gap analysis (SQLite, TigerBeetle, Go stdlib — what rating would they achieve?), (2) industry averages for similar projects (open-source governance frameworks, CLI tools, agent platforms), (3) the Admiral spec's own stated targets (what rating does the spec describe as the goal for each adoption profile?). The benchmark data is manually curated (not scraped) and stored as reference data. Comparison reports show "you are here" relative to benchmarks.
  - **Done when:** At least 3 pristine repo benchmarks are defined. Industry average estimates are documented with methodology. Spec-defined targets are mapped to rating tiers. Comparison report shows current rating relative to all benchmarks. Benchmark data is versioned and reviewable.
  - **Files:** `admiral/rating/benchmarks/pristine_repos.json` (new), `admiral/rating/benchmarks/industry_averages.json` (new), `admiral/rating/benchmark_comparison.sh` (new), `admiral/rating/tests/test_benchmark_comparison.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Rating System reference — Admiral as the Standard
  - **Depends on:** RT-02

---

## 32.5 Dashboard & Alerts

- [ ] **RT-09: Rating dashboard — Display ratings in control plane with visual indicators**
  - **Description:** Add a rating dashboard to the control plane that displays: (1) current overall rating with tier badge and color coding, (2) per-dimension scores as a radar chart or bar chart, (3) rating history trend line, (4) per-module rating heatmap (green/yellow/red), (5) active hard caps and their impact, (6) Human Judgment Gate status (passed/pending/failed), (7) next-tier requirements (what must improve to reach the next rating). The dashboard is the single place where governance health is visible at a glance.
  - **Done when:** Dashboard displays all 7 elements. Visual indicators use consistent color coding (gold/green/blue/yellow/red for tiers). Data refreshes from the latest CI rating result. Dashboard is accessible at `/dashboard/rating` on the control plane. Layout is clear and information-dense without being cluttered.
  - **Files:** `control-plane/src/rating-dashboard.ts` (new), `control-plane/src/rating-data.ts` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Rating System reference — The Evidence Chain
  - **Depends on:** RT-02, RT-05, RT-07

- [ ] **RT-10: Rating alerts — Alert when ratings drop below thresholds**
  - **Description:** Implement an alerting system for rating regressions and threshold violations. Alert triggers: (1) overall rating decreases (e.g., ADM-3 to ADM-4), (2) any dimension crosses a hard cap threshold (e.g., enforcement coverage drops below 50%), (3) any dimension declines by more than 15% in a 30-day window, (4) a Human Judgment Gate that was previously passed is invalidated by a governance change, (5) rating expiration approaching (within 30 days of the 12-month validity period). Alerts are structured (severity, trigger, current value, threshold, recommended action) and delivered via CI annotations and control plane notifications.
  - **Done when:** All 5 alert triggers are implemented. Alerts include severity, trigger details, and recommended action. Alerts fire in CI and are visible in the control plane. Alert history is logged. False alert rate is low (alerts only fire on genuine regressions, not measurement noise).
  - **Files:** `admiral/rating/alerts.sh` (new), `admiral/config/rating_alert_thresholds.json` (new), `admiral/rating/tests/test_rating_alerts.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Rating System reference — Phase 4, Re-evaluation Triggers
  - **Depends on:** RT-02, RT-05
