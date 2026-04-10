# TODO: Architecture, Documentation, CI/CD & Self-Enforcement

> Source streams: [Stream 3 — Architecture & Design](../stream-03-architecture.md), [Stream 4 — Documentation](../stream-04-documentation.md), [Stream 5 — CI/CD & Infrastructure](../stream-05-ci-cd.md), [Stream 6 — Self-Enforcement](../stream-06-self-enforcement.md)

---

## Stream 3: Architecture & Design (A-01 to A-12)

### 3.1 Schema & Validation

- [x] **A-01:** Add JSON schema validation for hook payloads — schemas in `admiral/schemas/`, validation in `admiral/lib/schema_validate.sh`, fail-open per ADR-004 `[L]`
- [x] **A-06:** Session state schema validation — validate `session_state.json` against schema at every write `[M]`

### 3.2 System Integration

- [x] **A-02:** Bridge control plane and hooks — shared signal mechanism, bidirectional event flow via `event_log.jsonl` and `JournalIngester` `[L]`
- [x] **A-07:** Unified cross-system event log — single JSONL log for hooks and control plane, coherent timeline `[L]`

### 3.3 Infrastructure & Tooling

- [x] **A-03:** Document API endpoints — `control-plane/API.md` with method, path, request/response, status codes, curl examples `[M]`
- [x] **A-04:** Add bash dependency checker script — check jq >= 1.6, sha256sum, uuidgen, flock, shellcheck; run in CI `[S]`
- [x] **A-05:** Configuration consolidation — single `admiral/config/admiral.json` with schema validation, no hardcoded defaults `[L]`

### 3.4 Advanced Architecture

- [ ] ~~**A-08:** Hook execution pipeline abstraction — *Deferred to Phase 3.* — formal 5-phase lifecycle: load -> validate -> execute -> emit -> report `[L]`~~ → **MOVED 2026-04-10 to Phase 23 / Stream 46 (LC-A08)** — see `plan/todo/28-legacy-carryover-sweep.md`. Original Phase 3 home is closed; Phase 23 owns it.
- [ ] ~~**A-09:** Plugin architecture for hook extensions — *Deferred to Phase 3.* — plugin discovery in `admiral/plugins/hooks/`, manifest schema, example plugin `[L]`~~ → **MOVED 2026-04-10 to Phase 23 / Stream 46 (LC-A09)** — see `plan/todo/28-legacy-carryover-sweep.md`. Depends on LC-A08.
- [x] **A-10:** State machine for session lifecycle — 5 states (init -> active -> paused -> terminating -> complete), invalid transitions rejected `[L]`
- [x] **A-11:** Event schema registry — versioned JSON schemas for all event types, CI-enforced registration `[L]`
- [x] **A-12:** Configuration schema validation at startup — validate config at session start, report all errors, fail-closed `[M]`

### 3.5 Graceful Degradation

- [x] **A-13:** Graceful degradation testing for optional components — verify Admiral degrades gracefully when Brain MCP, pgvector, control plane, or scanner are absent; component availability registry, degradation behavior specs, automated tests for individual and combined absence, clear user-facing messages `[L]`

---

## Stream 4: Documentation (D-01 to D-19)

> **Phase 1 status:** D-02 (CoC) and D-03 (LICENSE) completed. Remaining D-items (D-01, D-04 through D-19) deferred to Phase 2 — they are documentation tasks that don't block Phase 2 architecture/CI work from starting. D-01 (style guide) is the highest priority deferred item as it gates Q-03, Q-13, and D-17.

### 4.1 Core Project Documents

- [x] **D-01:** Create ADMIRAL_STYLE.md — *Completed in Phase 9.* — Comprehensive style guide covering file naming, bash/TS conventions, exit code taxonomy (0/1/2/3/4/126/127), hook output contracts, testing requirements, fail-open/fail-closed patterns, jq helper usage, structured logging, and comment standards. `[L]`
- [x] **D-02:** Add CODE_OF_CONDUCT.md — Contributor Covenant v2.1 `[S]`
- [x] **D-03:** Add LICENSE file — MIT license at repo root `[S]`

### 4.2 Inline Documentation

- [ ] ~~**D-04:** Add inline "why" comments to hooks — *Deferred to Phase 2.* — audit all 13+ hooks, annotate regex patterns, thresholds, state mutations, magic numbers `[L]`~~ → **MOVED 2026-04-10 to Phase 23 / Stream 46 (LC-D04)** — see `plan/todo/28-legacy-carryover-sweep.md`. Original Phase 2 home is closed; Phase 23 owns it. Now scoped to all 21 hooks.
- [x] **D-05:** Add usage examples to templates — *Completed in Phase 9.* — Added `_purpose`, `_usage`, `_expected_output`/`_example_invocation` fields to ground-truth, task-criteria, and spec-change-impact templates `[S]`

### 4.3 Architecture Decision Records

- [x] **D-06:** ADR for hook payload schema — *Completed in Phase 9.* — ADR-005: JSON over stdin/stdout rationale, fail-open validation, additive schema evolution, `additionalProperties: true` for forward compat `[S]`
- [x] **D-07:** ADR for event ID generation — *Completed in Phase 9.* — ADR-006: `evt_<uuid-v4>` via `crypto.randomUUID()`, replaces `Date.now()`, ULID rejected (extra dependency), 4 alternatives compared `[S]`
- [x] **D-12:** ADR for Standing Orders enforcement tiers — *Completed in Phase 9.* — ADR-007: 3 tiers (hook-enforced hard, hook-enforced advisory, guidance-only) with SO-to-tier mapping for all 16 SOs `[S]`
- [x] **D-13:** ADR for fleet orchestration approach — *Completed in Phase 9.* — ADR-008: git-mediated hybrid (branch-based task claiming, file-system state, fleet registry, task router, handoff protocol), 3 alternatives compared `[M]`
- [x] **D-14:** ADR for brain level graduation criteria — *Completed in Phase 9.* — ADR-009: semi-automatic (recommend + confirm), B1->B2 (hit rate >= 85%, precision >= 90%, 100+ entries), B2->B3 (reuse rate >= 70%, semantic precision >= 85%), trend tracking `[M]`

### 4.4 Operational Documentation

- [x] **D-08:** Create operational runbook — *Completed in Phase 9.* — `docs/OPERATIONAL_RUNBOOK.md` with prerequisites, setup, session lifecycle, control plane ops, hook system, brain system, fleet ops, validation, 10 failure scenarios (hard blocks, state corruption, jq missing, server issues, loop detector, SO loading, brain queries, worktree conflicts, CI failures, config validation) with diagnosis and resolution, recovery procedures, monitoring reference `[L]`
- [x] **D-09:** Create hook troubleshooting guide — *Completed in Phase 9.* — `docs/HOOK_TROUBLESHOOTING.md` with quick reference table, general debugging steps, per-hook failure mode tables for all 17 hooks (6 hard-block, 11 advisory), common false positives, debug commands, resolution steps `[M]`
- [x] **D-10:** Create Brain user guide — *Completed in Phase 9.* — `docs/BRAIN_USER_GUIDE.md` with CLI examples for all 5 brain tools (record, query, retrieve, audit, consolidate), entry types, tier comparison, graduation criteria, hook integration, file layout `[M]`
- [x] **D-11:** Create security model document — *Completed in Phase 9.* — `docs/SECURITY_MODEL.md` with threat model (4 actors, 6 categories, 30 ATK scenarios), 5 attack surfaces, 4-tier defense architecture, identity/authorization (RBAC, token binding, tier enforcement), injection prevention (70+ patterns), 5-layer quarantine pipeline (LLM-airgapped layers 1-3), secret detection (40+ patterns), privilege escalation defense, hash-chained audit trail, residual risk analysis `[L]`

### 4.5 Contributor & Reference Documentation

- [x] **D-15:** Glossary of Admiral Framework terms — *Completed in Phase 9.* — 35+ terms across 7 domains (governance, work structure, hooks, brain, control plane, quality, configuration) with abbreviations table `[M]`
- [x] **D-16:** Quick-start tutorial for new contributors — *Completed in Phase 9.* — `docs/QUICK_START.md` with 6-step guided tutorial: prerequisites, clone/build, run tests, understand structure, pick work, make change/PR. Includes troubleshooting section and "what's next" pointers `[M]`
- [x] **D-17:** Hook development guide — *Completed in Phase 9.* — `docs/HOOK_DEVELOPMENT_GUIDE.md` with hook anatomy (header, boilerplate, exit codes), lifecycle (SessionStart/PreToolUse/PostToolUse), 5-step creation process, worked example (file size guard from zero), testing guide, adapter integration, common patterns (payload extraction, tool filtering, state management, structured output), and pre-submission checklist `[L]`
- [x] **D-18:** FAQ document — *Completed in Phase 9.* — `docs/FAQ.md` with 22 questions across 5 categories (general, architecture, development, operations, security) `[M]`
- [x] **D-19:** API versioning strategy — *Completed in Phase 9.* — `docs/API_VERSIONING.md`: semantic versioning per interface, additive-only evolution, backward compat rules, deprecation policy (1 phase cycle), breaking changes checklist, schema version table `[M]`

---

## Stream 5: CI/CD & Infrastructure (C-01 to C-15)

### 5.1 Quality Gates

- [x] **C-01:** Add coverage threshold gate — *Completed in T-09 (check-coverage.sh at 85% threshold, integrated into control-plane-ci.yml).* — CI fails on coverage regression, configurable threshold `[M]`
- [x] **C-08:** Dependency license audit — block on GPL/copyleft, warn on unknown licenses `[S]`
- [x] **C-09:** Reproducible build verification — *Satisfied by package-lock.json + deterministic tsc compilation.* `[S]`

### 5.2 Cross-Platform & Security

- [ ] ~~**C-02:** Add matrix CI builds — *Deferred (requires macOS runner access).* — ubuntu + macOS for TypeScript and hook tests `[S]`~~ → **MOVED 2026-04-10 to Phase 15 / Stream 38 (DV-06)** — see `plan/todo/20-dependency-version-realism.md`. Reclaimed by the Credibility Closure Tier as part of dependency reproducibility.
- [ ] ~~**C-03:** Add CodeQL security scanning — *Deferred (requires GitHub Advanced Security setup).* — TypeScript + bash analysis, block on high/critical, weekly schedule `[S]`~~ → **MOVED 2026-04-10 to Phase 23 / Stream 46 (LC-C03)** — see `plan/todo/28-legacy-carryover-sweep.md`. The GitHub Advanced Security setup is in scope here.

### 5.3 Integration & Performance

- [x] **C-04:** Add integration test stage `[L]`
- [x] **C-05:** Add benchmark regression detection `[M]`
- [x] **C-14:** End-to-end smoke test in CI `[M]`

### 5.4 Developer Experience & Automation

- [x] **C-06:** Enable git hooks in CI — *Pre-commit hook exists at .githooks/pre-commit (ShellCheck + Biome). CI enforces the same checks.* `[S]`
- [x] **C-07:** Automated changelog generation `[M]`
- [x] **C-10:** Automated release tagging workflow `[M]`
- [x] **C-11:** PR size limits — warn on PRs > 500 lines changed, exclude generated/lock files `[S]`
- [x] **C-12:** Stale branch cleanup automation — auto-delete merged branches, issue for stale unmerged `[S]`
- [x] **C-13:** CI build caching optimization — *Already configured: setup-node@v6 with `cache: 'npm'` in control-plane-ci.yml.* — cache node_modules, .tsbuildinfo, ShellCheck binary `[S]`
- [x] **C-15:** Dependency update automation — *Completed in Phase 9.* — Enhanced `.github/dependabot.yml`: weekly schedule (Monday), grouped minor/patch updates, commit message prefixes, 10 PR limit for npm, actions grouping `[S]`

---

## Stream 6: Self-Enforcement (P-01 to P-10)

### 6.1 Self-Enforced Discipline

- [x] **P-01:** `fix:` commits require test changes — CI check warns on fix commits with no test file modifications `[M]`
- [x] **P-02:** Documentation discipline — *Completed in Phase 9.* — Created `test_documentation.sh` validating: TS module doc comments, hook header blocks (purpose + exit codes), ADR format compliance (Status/Context/Decision/Consequences). CI workflow integration blocked by OAuth `workflow` scope. `[M]`

### 6.2 Meta-Governance

- [x] **P-03:** Meta-test — Admiral tests its own hooks `[L]`
- [x] **P-04:** Quality metrics dashboard `[L]`

### 6.3 Self-Enforcement (Dog-Fooding)

- [x] **P-05:** Pre-commit hook enforcement `[M]`
- [x] **P-06:** Deduplication detection in CI `[M]`

### 6.4 Automated Drift & Compliance

- [x] **P-07:** Spec-implementation drift detector `[L]`
- [x] **P-08:** Plan auto-validation — verify `plan/index.md` counts match stream files, no orphaned refs, no duplicate IDs `[M]`
- [ ] ~~**P-09:** Standing Order compliance audit — *Relocated to Phase 3 (`05-hooks-standing-orders-infrastructure.md`), depends on S-05.* `[M]`~~ → **MOVED 2026-04-10 to Phase 18 / Stream 41 (PE-09 enforcement completeness matrix)** — see `plan/todo/23-policy-enforcement-closure.md`. The Credibility Closure Tier reclaimed this as part of the policy → enforcement closure.
- [ ] ~~**P-10:** Hook coverage report — *Relocated to Phase 3 (`05-hooks-standing-orders-infrastructure.md`), depends on S-05.* `[M]`~~ → **MOVED 2026-04-10 to Phase 17 / Stream 40 (HD-07 hook coverage metric)** — see `plan/todo/22-hook-test-depth.md`. The Credibility Closure Tier reclaimed this as part of hook test depth.

---

## Dependencies

### Architecture (Stream 3)
| Item | Depends on |
|------|------------|
| A-05 | A-01 |
| A-06 | A-01 |
| A-07 | A-02 |
| A-08 | Q-02, A-01 |
| A-09 | A-08, A-01 |
| A-10 | A-06 |
| A-11 | A-01, A-07 |
| A-12 | A-05, A-01 |
| A-13 | A-05 |

### Documentation (Stream 4)
| Item | Depends on |
|------|------------|
| D-16 | D-02, D-03 |
| D-17 | D-01, Q-03 |
| D-19 | A-03 |

### CI/CD (Stream 5)
| Item | Depends on |
|------|------------|
| C-04 | A-02 |
| C-05 | T-11, T-12, T-13 |
| C-10 | C-07 |

### Self-Enforcement (Stream 6)
| Item | Depends on |
|------|------------|
| P-03 | A-02, T-06 |
| P-04 | T-09, T-10, T-11, T-12 |
| P-09 | S-05 |
| P-10 | S-05 |

### Cross-stream dependency notes
- **A-01** (schema validation) is the foundational item — 6 architecture items depend on it
- **A-02** (hook/control-plane bridge) unlocks A-07, C-04, and P-03
- **S-05** (Standing Orders enforcement map, Stream 8) gates P-09 and P-10
- **T-series** items (Stream 1 — Testing) gate C-05 and P-04
- **Q-series** items (Stream 2 — Code Quality) gate A-08 and D-17
- Items with no dependencies (start here): A-01, A-02, A-03, A-04, D-01–D-07, D-08–D-15, D-18, C-01–C-03, C-06–C-09, C-11–C-15, P-01, P-02, P-05, P-06, P-07, P-08
