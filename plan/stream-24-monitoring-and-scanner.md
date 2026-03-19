# Stream 24: Monitoring & Scanner — Automated Codebase Health

> *"What gets measured gets managed. What gets measured continuously gets managed proactively." — Adaptation of Peter Drucker*

**Scope:** Implement the automated monitoring and scanning infrastructure defined in the scanner specification (`aiStrat/monitor/scanner-spec.md`). Covers scanner implementation, digest generation, trend reporting, state management, custom scan rules, result history, CI integration, alert thresholds, dashboard integration, and handoff validation. This stream turns the specification into working infrastructure that watches the AI ecosystem and the codebase itself for changes that matter.

**Why this stream exists:** The AI landscape moves faster than any human can track. Model releases, framework updates, capability shifts, and regulatory changes happen weekly. The scanner is the Admiral's early warning system — it watches the ecosystem so the Admiral does not have to watch it manually. Combined with codebase health monitoring, it provides a continuous picture of both external threats and internal quality.

---

## 24.1 Core Scanner

- [ ] **MON-01: Scanner implementation**
  - **Description:** Implement the scanner from `aiStrat/monitor/scanner-spec.md`. The scanner supports five scan types: `full` (daily, all sources), `models` (model releases and capabilities), `patterns` (emerging agent patterns), `releases` (framework/tool releases), and `discover` (new repos, trend detection). Input sources include model providers, agent frameworks, research, community, and regulatory categories. The scanner must: (1) iterate through configured sources per scan type, (2) fetch updates since last scan (using state tracking), (3) classify findings by priority (HIGH/MEDIUM/LOW), (4) generate structured output for digest consumption, (5) create GitHub issues automatically for HIGH priority findings. Respect the security constraints: read-only external access, untrusted content handling, `--body-file` for issue creation.
  - **Done when:** All 5 scan types execute successfully. Scanner fetches from configured sources and detects new content since last scan. Findings are classified by priority. HIGH findings create GitHub issues. Scanner respects read-only and injection-safe constraints. State is updated after each scan run.
  - **Files:** `admiral/monitor/scanner.sh` (modify — extend existing), `admiral/monitor/scanner-lib.sh` (new — shared functions), `admiral/tests/test_scanner.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/monitor/scanner-spec.md` — Scan Types, Input Sources, Findings Classification
  - **Depends on:** MON-04

- [ ] **MON-04: Scanner state management**
  - **Description:** Track scanner state per `aiStrat/monitor/state-schema.json`. State includes: last scan timestamp per source, known entity versions (to detect updates vs. re-discoveries), watchlist configuration (repos, providers, topics), and scan history (what ran, what was found, success/failure). Implement atomic state updates — a scan that fails mid-run must not corrupt state. Provide state query functions: `get_last_scan <source>`, `is_known_version <entity> <version>`, `get_scan_history <days>`. State file lives at `monitor/state.json` and is validated against the schema on every read/write.
  - **Done when:** State file conforms to `state-schema.json`. State updates are atomic (no corruption on mid-run failures). Query functions return correct results. State survives scanner restarts. Schema validation catches invalid state writes.
  - **Files:** `admiral/monitor/state.sh` (new), `admiral/monitor/state.json` (new — initial state), `admiral/tests/test_scanner_state.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/monitor/scanner-spec.md` — State Management, `aiStrat/monitor/state-schema.json`
  - **Depends on:** —

---

## 24.2 Reporting

- [ ] **MON-02: Daily digest generation**
  - **Description:** Generate automated daily digests of codebase health metrics and scanner findings. Digest format follows `monitor/digest-format.md`. Each digest includes: scan date, sources checked, findings by priority, new releases detected, model updates, pattern shifts, and a summary of codebase health metrics (test count, coverage, hook count, Standing Order compliance). Digests are stored as markdown files at `monitor/digests/YYYY-MM-DD.md`. The daily digest runs as part of the `full` scan type (daily at 07:00 UTC) and can also be triggered manually.
  - **Done when:** Daily digests generate successfully in the specified format. Digests include both external findings (scanner) and internal metrics (codebase health). Digest files are stored with date-based naming. Manual trigger works. Digest content is human-readable and actionable.
  - **Files:** `admiral/monitor/digest.sh` (new), `admiral/monitor/digests/` (new directory), `admiral/tests/test_digest.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/monitor/scanner-spec.md` — Output section, `monitor/digest-format.md`
  - **Depends on:** MON-01

- [ ] **MON-03: Weekly trend reports**
  - **Description:** Generate weekly summaries of metric trends with visual indicators. Aggregate daily digest data into weekly trends showing: metric direction (improving/stable/degrading with arrow indicators), week-over-week deltas for key metrics (test count, coverage, hook count, scanner findings), notable events of the week (new HIGH findings, resolved issues, new releases adopted), and a forecast section highlighting upcoming risks or opportunities. The weekly report runs as part of the `discover` scan type (Monday 06:00 UTC). Include sparkline-style text visualizations for metric trends (e.g., `[---====++++]` showing improvement over the week).
  - **Done when:** Weekly reports generate from aggregated daily data. Trend indicators show direction and magnitude. Week-over-week deltas are calculated for all tracked metrics. Reports include text-based trend visualizations. Manual trigger works.
  - **Files:** `admiral/monitor/weekly_report.sh` (new), `admiral/tests/test_weekly_report.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/monitor/scanner-spec.md` — Scan Types (discover)
  - **Depends on:** MON-02, MON-06

---

## 24.3 Extensibility

- [ ] **MON-05: Custom scan rules**
  - **Description:** Allow defining custom scan rules for project-specific checks. Custom rules are defined as JSON or YAML files in a `monitor/rules/` directory, each specifying: rule ID, description, scan type (which scan triggers this rule), check command (shell command that performs the check), expected output pattern (regex or exit code), severity (HIGH/MEDIUM/LOW), and remediation guidance. The scanner loads custom rules alongside built-in rules and includes their results in digests. Provide a `make scan-rule <name>` scaffold command that generates a rule template. Validate rule files against a rule schema on load.
  - **Done when:** Custom rules can be defined in `monitor/rules/`. Scanner loads and executes custom rules alongside built-in rules. Rule results appear in digests. Scaffold command generates valid rule templates. At least 3 example custom rules are provided (e.g., check for TODO count, check for dependency freshness, check for documentation coverage).
  - **Files:** `admiral/monitor/rules/` (new directory), `admiral/monitor/rules/schema.json` (new), `admiral/monitor/rules/examples/` (new — example rules), `admiral/monitor/custom_rules.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** MON-01

- [ ] **MON-06: Scan result history**
  - **Description:** Store and query historical scan results for trend analysis. Each scan run produces a structured result record: scan ID, timestamp, scan type, sources checked, findings count by priority, duration, and success/failure status. Results are stored in an append-only JSONL file (`monitor/scan-history.jsonl`). Provide query functions: `get_scans_since <date>`, `get_finding_trend <metric> <days>`, `get_scan_success_rate <days>`. Historical data feeds into weekly trend reports (MON-03) and performance regression detection. Implement retention policy (configurable, default 90 days) to prevent unbounded growth.
  - **Done when:** Every scan run writes a structured result record. Query functions return correct results. History file uses append-only JSONL format. Retention policy removes records older than the configured period. Historical data supports trend calculation for weekly reports.
  - **Files:** `admiral/monitor/scan_history.sh` (new), `admiral/monitor/scan-history.jsonl` (generated), `admiral/tests/test_scan_history.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** MON-04

---

## 24.4 Integration

- [ ] **MON-07: Scanner CI integration**
  - **Description:** Run the scanner as part of the CI pipeline, failing on critical findings. Add a CI workflow that executes a subset of scanner checks relevant to PR validation: (1) dependency vulnerability check (are new dependencies introducing known vulnerabilities?), (2) custom rule checks (do project-specific rules pass?), (3) handoff schema validation (do any modified handoff documents conform to v1.schema.json?). Full ecosystem scans (model releases, framework updates) run on schedule, not per-PR. CI integration should produce structured output that GitHub Actions can annotate on the PR.
  - **Done when:** CI runs scanner checks on every PR. Critical findings fail the CI check. Findings are annotated on the PR with file/line information where applicable. Scheduled scans run daily on the main branch. CI check completes in < 60 seconds.
  - **Files:** `.github/workflows/scanner-ci.yml` (new), `admiral/monitor/ci_checks.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/monitor/scanner-spec.md` — Findings Classification
  - **Depends on:** MON-01, MON-05

- [ ] **MON-08: Scanner alert thresholds**
  - **Description:** Configure thresholds that trigger alerts when exceeded. Define thresholds for: scan failure rate (> 3 consecutive failures triggers alert), HIGH findings count (> 5 unresolved HIGH findings triggers alert), metric degradation (any tracked metric degrading for 3+ consecutive days triggers alert), scan staleness (no successful scan in 48 hours triggers alert). Thresholds are configurable via a `monitor/thresholds.json` file. When a threshold is exceeded, the scanner creates a GitHub issue with the threshold details, current value, and recommended action.
  - **Done when:** Thresholds are configurable and evaluated after each scan. Threshold violations create GitHub issues. At least 4 threshold types are implemented (scan failure, HIGH count, metric degradation, staleness). Threshold configuration is validated against a schema.
  - **Files:** `admiral/monitor/thresholds.json` (new), `admiral/monitor/threshold_check.sh` (new), `admiral/tests/test_thresholds.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** MON-01, MON-06

- [ ] **MON-09: Scanner dashboard integration**
  - **Description:** Display scanner results in the control plane dashboard. Add a dashboard section showing: latest scan status per scan type (with timestamp and finding count), finding summary (HIGH/MEDIUM/LOW counts with trend indicators), recent findings list (filterable by priority and source), scan history timeline (last 30 days of scans with success/failure visualization), and codebase health metrics from the latest digest. Data is sourced from scan history (MON-06) and digest files (MON-02). The dashboard section auto-refreshes with the same interval as the main dashboard.
  - **Done when:** Control plane dashboard shows scanner results. Latest scan status is visible per scan type. Findings are listed and filterable. Scan history timeline shows 30 days. Dashboard data refreshes automatically.
  - **Files:** `control-plane/src/server.ts` (modify — add scanner data endpoints), `control-plane/src/scanner-data.ts` (new — scanner data reader), `control-plane/public/dashboard.html` (modify — add scanner section)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** MON-02, MON-06

- [ ] **MON-10: Handoff validation implementation**
  - **Description:** Validate agent handoffs against `aiStrat/handoff/v1.schema.json`. Implement a validation function that checks every handoff document for: (1) schema conformance (all required fields present: `from`, `to`, `via`, `task`, `deliverable`, `acceptance_criteria`), (2) field constraints (`via` must be "Orchestrator" or "Direct", `acceptance_criteria` must have at least 1 item), (3) referential integrity (if `context_files` are specified, verify the files exist), (4) session handoff completeness (if `session_handoff` is present, verify required subfields: `session_id`, `agent`, `completed`, `next_session_should`). Integrate validation as a hook that runs on handoff events and as a scanner rule that checks handoff documents in the repository.
  - **Done when:** Handoff documents are validated against v1.schema.json. All required fields and constraints are checked. Invalid handoffs are rejected with specific error messages identifying the validation failure. Validation runs both as a real-time hook and as a scanner rule. At least 5 test cases cover valid handoffs, missing required fields, invalid enum values, and malformed session handoffs.
  - **Files:** `admiral/lib/handoff_validator.sh` (new), `.hooks/validate_handoff.sh` (new), `admiral/tests/test_handoff_validator.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/handoff/v1.schema.json`
  - **Depends on:** —

---

## Stream 24 Summary

| Subsection | Items | Total Size |
|---|---|---|
| 24.1 Core Scanner | MON-01, MON-04 | 1L + 1M |
| 24.2 Reporting | MON-02, MON-03 | 2M |
| 24.3 Extensibility | MON-05, MON-06 | 2M |
| 24.4 Integration | MON-07, MON-08, MON-09, MON-10 | 4M |
| **Totals** | **10 items** | **1L + 9M** |

**Critical path:** MON-04 (state management) is the foundation — the scanner cannot track what it has already processed without state. MON-01 (scanner implementation) depends on MON-04 and enables MON-02 (digests), MON-05 (custom rules), MON-07 (CI), and MON-08 (thresholds). MON-06 (history) depends on MON-04 and enables MON-03 (weekly reports), MON-08 (thresholds), and MON-09 (dashboard). MON-10 (handoff validation) is independent.

**Recommended execution order:**
1. **Foundation:** MON-04 (state management), MON-10 (handoff validation) — no dependencies, enable the rest.
2. **Core:** MON-01 (scanner implementation, after MON-04), MON-06 (scan history, after MON-04).
3. **Reporting:** MON-02 (daily digests, after MON-01), MON-05 (custom rules, after MON-01).
4. **Integration:** MON-03 (weekly reports, after MON-02+MON-06), MON-07 (CI, after MON-01+MON-05), MON-08 (thresholds, after MON-01+MON-06), MON-09 (dashboard, after MON-02+MON-06).
