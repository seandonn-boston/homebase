# TODO: Rating System & Thesis Validation

> Source: stream-32-rating-system.md (RT-01 to RT-10), stream-33-thesis-validation.md (TV-01 to TV-10)

The Rating System makes governance measurable — a five-tier scale (ADM-1 through ADM-5) with automated calculation, CI integration, and actionable improvement paths. Thesis Validation builds the evidence infrastructure to prove or disprove the core Admiral claim: deterministic enforcement beats advisory guidance, and AI agents can be governed as a workforce. Measurement without evidence is dashboard theater; claims without measurement are marketing.

---

## Rating Data Model & Calculation

- [ ] **RT-01: Rating system data model** — Define JSON schema for all 5 rating tiers (ADM-1 through ADM-5), 7 core evaluation dimensions per entity category, hard cap rules, Human Judgment Gate requirements, Phase 1 metric thresholds, and certification tier suffixes (-SA, -IA). Schema must be unambiguous — given the same inputs, any implementation produces the same rating.
- [ ] **RT-02: Automated rating calculation** — Implement `calculate_rating.sh` that collects 7 core benchmarks, runs behavioral probes, applies hard cap rules, identifies next-tier gate requirements, and produces a Rating Report in the reference format. The script should be honest — ADM-4 or ADM-5 initially is the correct result.

## Rating CI & Badges

- [ ] **RT-03: Rating CI integration** — Integrate rating calculation into CI: run on every significant change, compare against previous rating, alert on regressions, store results as artifacts, post rating summary to PR comments. Scheduled weekly runs for trend tracking. Job completes in < 5 minutes.
- [ ] **RT-04: Rating badges** — Generate SVG badges displaying current Admiral rating with color coding (ADM-1 gold, ADM-2 green, ADM-3 blue, ADM-4 yellow, ADM-5 red) and certification suffix. Badges update automatically from CI results and are embeddable in README files.

## Rating History & Advanced

- [ ] **RT-05: Rating history tracking** — Store every rating result as append-only JSONL with per-dimension scores over time. Link rating transitions to specific commits. Generate trend summaries for 30/60/90-day windows. Detect plateau patterns and suggest breakthrough actions.
- [ ] **RT-06: Rating improvement recommendations** — Analyze current rating and produce prioritized actions to improve it. Map gaps to concrete actions with effort estimates. Implement the Rating Progression table (ADM-5 to ADM-1) as specific, actionable steps referencing existing stream items.
- [ ] **RT-07: Per-module ratings** — Extend rating calculation to module/directory level. Scope all dimensions per module. Critical module ratings cap the project rating. Highlight consistency gaps between best and worst modules.
- [ ] **RT-08: Rating comparison benchmarks** — Contextualize Admiral rating against pristine repo standards (SQLite, TigerBeetle, Go stdlib), industry averages, and spec-defined targets. Comparison reports show "you are here" relative to benchmarks.
- [ ] **RT-09: Rating dashboard** — Add rating dashboard to control plane displaying overall rating with badge, per-dimension scores, history trend line, per-module heatmap, active hard caps, gate status, and next-tier requirements.
- [ ] **RT-10: Rating alerts** — Alert on rating regressions, hard cap threshold crossings, >15% dimension decline in 30 days, invalidated gates, and approaching rating expiration. Alerts include severity, trigger details, and recommended action.

## Thesis Metrics & Framework

- [ ] **TV-01: Thesis metrics definition** — Define measurable metrics for both thesis claims (enforcement beats advisory; agents can be governed as workforce). Specify evidence-for and evidence-against thresholds. State null hypotheses for scientific rigor.
- [ ] **TV-02: Advisory vs enforcement comparison** — Implement A/B framework running identical tasks under advisory-only and hard-blocking modes. Measure violation rate, violation severity, first-pass quality, completion time, and escalation rate. Minimum 10 task pairs with statistical significance methodology.
- [ ] **TV-03: Before/after case studies** — Document real instances where enforcement caught problems advisory guidance would have missed. Each case study includes counterfactual analysis and true positive / false positive classification. At least 5 case studies from actual Helm development.
- [ ] **TV-04: Agent quality improvement tracking** — Track agent output quality longitudinally correlated with governance maturity. Correlate first-pass quality, defect density, and escalation rate with specific governance additions. At least 3 governance milestones with before/after data.

## Thesis Evidence & Cost

- [ ] **TV-05: Developer experience survey framework** — Define short (< 5 minutes) survey covering friction, trust, productivity impact, and perceived value. Adapt Net Promoter Score for governance. Quarterly administration cadence with anonymization.
- [ ] **TV-06: False positive tracking** — Track every instance where hooks block legitimate actions. Capture per-incident details and aggregate per-hook false positive rates, developer-hours lost, and mean time to resolve. High false positive rates undermine the thesis.
- [ ] **TV-07: Governance overhead measurement** — Measure hook execution latency (p50/p95/p99), governance token ratio, governance-induced delays, context window overhead, and developer interruption cost. Compare against the 25% governance overhead hard cap.
- [ ] **TV-08: ROI calculation model** — Quantify costs (implementation, maintenance, runtime, friction) and benefits (bugs prevented, incidents avoided, rework reduction, knowledge preservation, onboarding acceleration). Produce breakeven analysis with sensitivity analysis on key assumptions.
- [ ] **TV-09: Academic paper outline** — Outline for research paper covering thesis, methodology, and evidence across 8 sections. Conference paper length (8000-12000 words). Detailed enough for independent section drafting. ⏳ DEFERRED (Phase 3+)
- [ ] **TV-10: Community feedback collection** — Define feedback channels, taxonomy (enforcement, documentation, developer experience, thesis challenge), triage process, and feedback-to-improvement pipeline. Make it easy for users to challenge the thesis — disagreement is evidence too.

---

## Dependencies

| Task | Depends on | Downstream |
|------|-----------|------------|
| RT-01 | — | RT-02, RT-06 |
| RT-02 | RT-01 | RT-03, RT-04, RT-05, RT-06, RT-07, RT-08, RT-09, RT-10 |
| RT-03 | RT-02 | — |
| RT-04 | RT-02 | — |
| RT-05 | RT-02 | RT-09, RT-10 |
| RT-06 | RT-01, RT-02 | — |
| RT-07 | RT-02 | RT-09 |
| RT-08 | RT-02 | — |
| RT-09 | RT-02, RT-05, RT-07 | — |
| RT-10 | RT-02, RT-05 | — |
| TV-01 | — | TV-02, TV-04, TV-09 |
| TV-02 | TV-01 | TV-09 |
| TV-03 | — | TV-09 |
| TV-04 | TV-01 | — |
| TV-05 | — | — |
| TV-06 | — | TV-08 |
| TV-07 | — | TV-08 |
| TV-08 | TV-06, TV-07 | — |
| TV-09 | TV-01, TV-02, TV-03 | — |
| TV-10 | — | — |
