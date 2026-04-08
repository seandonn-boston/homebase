# TODO: Developer Experience & Monitoring

> Source: stream-26-developer-experience.md (DX-01 to DX-13), stream-27-monitoring-and-scanner.md (MON-01 to MON-10)

Developer experience treats contributors as users of the development workflow. Monitoring treats codebase health and ecosystem awareness as continuous, automated processes. Together they ensure the Admiral Framework is both easy to contribute to and aware of changes that matter.

---

## Dev Environment Setup

- [x] **DX-02: One-command setup** — Create `make setup` (or `./setup.sh`) that installs all dependencies, validates the environment, and runs initial tests. Check for required system dependencies (bash 5+, jq, node, npm) with platform-specific install instructions. Must be idempotent and work on both macOS and Linux.
- [x] **DX-01: Dev container configuration** — Create a VS Code dev container (`.devcontainer/`) with all dependencies pre-installed: Node.js, jq, shellcheck, shfmt, biome, bash 5+, curl, git. Include recommended extensions and `postCreateCommand` running `npm install`. Container build time < 5 minutes; full test suite passes inside container.
- [x] **DX-08: IDE configuration templates** — Provide shared VS Code settings, launch configurations, and recommended extensions. Store as `.vscode/settings.json.template` to avoid overwriting personal settings. Include `make ide` target that copies templates into place if no local settings exist.

## Dev Workflow Tooling

- [x] **DX-04: Hot reload for control plane** — Auto-restart the control plane server on `.ts` file changes using `node --watch` or equivalent. `make dev` starts watch mode with development environment variables. Restart within 2 seconds; event log and state survive restarts.
- [x] **DX-05: Hook development CLI** — Create CLI to scaffold, test, and validate new hooks. `admiral hook scaffold <name>` generates from template with standard header, JSON parsing, error handling, structured logging. `admiral hook validate <name>` checks ShellCheck, header, exit codes, fail-open behavior (per ADR-004).
- [x] **DX-06: Local CI runner** — Create `make ci` that runs the full CI pipeline locally: shellcheck, biome, TypeScript compilation, unit tests, hook tests, quarantine tests, doc validation. Summary table with pass/fail and timing. Fail-fast by default, `--continue` flag available. Completes in < 2 minutes.
- [x] **DX-11: Changelog automation** — Auto-generate changelog entries from conventional commits (feat, fix, docs, refactor, test, chore). Group by category, highlight breaking changes, include commit hash links. `make changelog` for preview; integrate into release workflow.
- [x] **DX-13: Pre-Flight Checklist tooling** — Implement automated verification against profile-specific requirements (Starter/Team/Governed/Production/Enterprise). 54 verification items across 5 profiles. Outputs structured pass/fail report with remediation suggestions.

## Documentation & Onboarding

- [x] **DX-03: Interactive development guide** — Step-by-step walkthroughs for 6 common tasks: adding a hook, adding an API endpoint, adding a Standing Order, adding a brain entry type, modifying the quarantine pipeline, adding an attack corpus entry. Each includes prerequisites, commands, expected output, and verification.
- [x] **DX-07: Error message improvement audit** — Review all error messages across hooks, control plane, and CLI tools for clarity and actionability. Every message must answer: what went wrong, why it matters, what to do. Improve at least 20 messages with documented before/after.
- [x] **DX-09: Debugging guide** — Document how to debug hooks (bash), control plane (TypeScript), and brain queries. Include troubleshooting decision trees for at least 5 common symptoms (hook not firing, hook blocking unexpectedly, server crash, slow queries, missing events).
- [x] **DX-10: Example-driven documentation** — Create working, copy-paste-executable code examples for every API endpoint and tool. Cover event stream, trace, health, agent status, brain query, and all hook input/output formats. Smoke-test examples in CI.
- [x] **DX-12: Good first issues catalog** — Identify and maintain at least 15 well-scoped, self-contained issues for new contributors. Categorize by component and difficulty. Include a contributing guide covering the end-to-end contribution workflow.

## Local Testing & Simulation

- [x] **DX-14: Local agent session simulator** — CLI tool simulating multi-agent Admiral sessions without LLM API calls. Generates realistic hook payloads, triggers hooks, displays results. Scenario files define tool use sequences; supports multiple agent identities, brain interactions, and state progression visualization. `admiral session simulate <scenario>` with 3+ built-in scenarios.

---

## Scanner Core

- [x] **MON-04: Scanner state management** — Track scanner state per `aiStrat/monitor/state-schema.json`. State includes last scan timestamps, known entity versions, watchlist configuration, and scan history. Atomic updates prevent corruption on mid-run failures. Provide query functions: `get_last_scan`, `is_known_version`, `get_scan_history`.
- [x] **MON-01: Scanner implementation** — Implement the scanner from `aiStrat/monitor/scanner-spec.md` supporting 5 scan types: `full`, `models`, `patterns`, `releases`, `discover`. Fetch from configured sources, classify findings by priority (HIGH/MEDIUM/LOW), auto-create GitHub issues for HIGH findings. Respect read-only and injection-safe constraints.
- [x] **MON-05: Custom scan rules** — Allow defining custom scan rules as JSON/YAML in `monitor/rules/`. Each rule specifies: ID, description, scan type, check command, expected output, severity, remediation. Scaffold command generates templates. Include 3 example rules (TODO count, dependency freshness, documentation coverage).
- [ ] **MON-10: Handoff validation implementation** — Validate agent handoffs against `aiStrat/handoff/v1.schema.json`. Check schema conformance, field constraints, referential integrity, and session handoff completeness. Runs as both a real-time hook and a scanner rule.

## Scanner Reporting & Integration

- [x] **MON-02: Daily digest generation** — Generate automated daily digests of codebase health metrics and scanner findings. Include scan date, sources checked, findings by priority, new releases, model updates, pattern shifts, and codebase health metrics. Stored as `monitor/digests/YYYY-MM-DD.md`.
- [ ] **MON-03: Weekly trend reports** — Aggregate daily digests into weekly trends with direction indicators (improving/stable/degrading), week-over-week deltas, notable events, and forecast section. Include text-based sparkline visualizations for metric trends.
- [x] **MON-06: Scan result history** — Store structured scan result records in append-only JSONL (`monitor/scan-history.jsonl`). Provide query functions for trend analysis. Configurable retention policy (default 90 days) to prevent unbounded growth.
- [ ] **MON-07: Scanner CI integration** — Run scanner checks per-PR: dependency vulnerability check, custom rule checks, handoff schema validation. Annotate findings on the PR. Scheduled full scans run daily on main. CI check completes in < 60 seconds.
- [ ] **MON-08: Scanner alert thresholds** — Configure thresholds that trigger GitHub issue alerts: scan failure rate (> 3 consecutive), HIGH findings count (> 5 unresolved), metric degradation (3+ consecutive days), scan staleness (48 hours). Configurable via `monitor/thresholds.json`.
- [ ] **MON-09: Scanner dashboard integration** — Display scanner results in the control plane dashboard: latest scan status per type, finding summary with trends, filterable findings list, 30-day scan history timeline, and codebase health metrics from latest digest.

---

## Dependencies

| Task | Depends on | Downstream |
|------|-----------|------------|
| DX-02 | — | DX-01, DX-03, DX-12 |
| DX-01 | DX-02 | — |
| DX-08 | — | — |
| DX-04 | — | — |
| DX-05 | — | DX-03 |
| DX-06 | — | DX-12 |
| DX-11 | — | — |
| DX-13 | — | — |
| DX-03 | DX-02, DX-05 | — |
| DX-07 | — | — |
| DX-09 | — | — |
| DX-10 | — | — |
| DX-12 | DX-02, DX-06 | — |
| MON-04 | — | MON-01, MON-06 |
| MON-01 | MON-04 | MON-02, MON-05, MON-07, MON-08 |
| MON-05 | MON-01 | MON-07 |
| MON-10 | — | — |
| MON-02 | MON-01 | MON-03, MON-09 |
| MON-03 | MON-02, MON-06 | — |
| MON-06 | MON-04 | MON-03, MON-08, MON-09 |
| MON-07 | MON-01, MON-05 | — |
| MON-08 | MON-01, MON-06 | — |
| MON-09 | MON-02, MON-06 | — |
