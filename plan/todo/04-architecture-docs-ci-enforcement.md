# TODO: Architecture, Documentation, CI/CD & Self-Enforcement

> Source streams: [Stream 3 — Architecture & Design](../stream-03-architecture.md), [Stream 4 — Documentation](../stream-04-documentation.md), [Stream 5 — CI/CD & Infrastructure](../stream-05-ci-cd.md), [Stream 6 — Self-Enforcement](../stream-06-self-enforcement.md)

---

## Stream 3: Architecture & Design (A-01 to A-12)

### 3.1 Schema & Validation

- [ ] **A-01:** Add JSON schema validation for hook payloads — schemas in `admiral/schemas/`, validation in `admiral/lib/schema_validate.sh`, fail-open per ADR-004 `[L]`
- [ ] **A-06:** Session state schema validation — validate `session_state.json` against schema at every write `[M]`

### 3.2 System Integration

- [ ] **A-02:** Bridge control plane and hooks — shared signal mechanism, bidirectional event flow via `event_log.jsonl` and `JournalIngester` `[L]`
- [ ] **A-07:** Unified cross-system event log — single JSONL log for hooks and control plane, coherent timeline `[L]`

### 3.3 Infrastructure & Tooling

- [ ] **A-03:** Document API endpoints — `control-plane/API.md` with method, path, request/response, status codes, curl examples `[M]`
- [ ] **A-04:** Add bash dependency checker script — check jq >= 1.6, sha256sum, uuidgen, flock, shellcheck; run in CI `[S]`
- [ ] **A-05:** Configuration consolidation — single `admiral/config/admiral.json` with schema validation, no hardcoded defaults `[L]`

### 3.4 Advanced Architecture

- [ ] **A-08:** Hook execution pipeline abstraction — formal 5-phase lifecycle: load -> validate -> execute -> emit -> report `[L]`
- [ ] **A-09:** Plugin architecture for hook extensions — plugin discovery in `admiral/plugins/hooks/`, manifest schema, example plugin `[L]`
- [ ] **A-10:** State machine for session lifecycle — 5 states (init -> active -> paused -> terminating -> complete), invalid transitions rejected `[L]`
- [ ] **A-11:** Event schema registry — versioned JSON schemas for all event types, CI-enforced registration `[L]`
- [ ] **A-12:** Configuration schema validation at startup — validate config at session start, report all errors, fail-closed `[M]`

### 3.5 Graceful Degradation

- [ ] **A-13:** Graceful degradation testing for optional components — verify Admiral degrades gracefully when Brain MCP, pgvector, control plane, or scanner are absent; component availability registry, degradation behavior specs, automated tests for individual and combined absence, clear user-facing messages `[L]`

---

## Stream 4: Documentation (D-01 to D-19)

### 4.1 Core Project Documents

- [ ] **D-01:** Create ADMIRAL_STYLE.md — naming conventions, error handling, jq patterns, exit codes, comment standards, testing requirements `[L]`
- [x] **D-02:** Add CODE_OF_CONDUCT.md — Contributor Covenant v2.1 `[S]` *Completed: reference-based approach linking to official Contributor Covenant v2.1 (full inline text triggers content filtering on enforcement language).*
- [x] **D-03:** Add LICENSE file — MIT license at repo root `[S]` *Completed: standard MIT License at repo root.*

### 4.2 Inline Documentation

- [ ] **D-04:** Add inline "why" comments to hooks — audit all 13+ hooks, annotate regex patterns, thresholds, state mutations, magic numbers `[L]`
- [ ] **D-05:** Add usage examples to templates — purpose, when to use, example invocation, expected output `[S]`

### 4.3 Architecture Decision Records

- [ ] **D-06:** ADR for hook payload schema — JSON over stdin/stdout rationale, fail-open, schema evolution strategy `[S]`
- [ ] **D-07:** ADR for event ID generation — UUID vs timestamp+counter vs ULID trade-offs `[S]`
- [ ] **D-12:** ADR for Standing Orders enforcement tiers — hook-enforced vs advisory vs guidance-only `[S]`
- [ ] **D-13:** ADR for fleet orchestration approach — centralized vs peer-to-peer vs hybrid, 3+ alternatives compared `[M]`
- [ ] **D-14:** ADR for brain level graduation criteria — B1 -> B2 -> B3 graduation metrics, automatic vs manual `[M]`

### 4.4 Operational Documentation

- [ ] **D-08:** Create operational runbook — setup, common failures, recovery procedures, 10+ failure scenarios `[L]`
- [ ] **D-09:** Create hook troubleshooting guide — all 13+ hooks with failure modes, debugging steps `[M]`
- [ ] **D-10:** Create Brain user guide — brain_query, brain_record, brain_retrieve, brain_audit CLI examples `[M]`
- [ ] **D-11:** Create security model document — threat model, attack surfaces, defense layers, quarantine `[L]`

### 4.5 Contributor & Reference Documentation

- [ ] **D-15:** Glossary of Admiral Framework terms — 25+ terms with definitions, examples, cross-references `[M]`
- [ ] **D-16:** Quick-start tutorial for new contributors — clone-to-PR in 30 minutes `[M]`
- [ ] **D-17:** Hook development guide — hook anatomy, lifecycle, worked example from zero `[L]`
- [ ] **D-18:** FAQ document — 20+ questions across general, architecture, development, operations, security `[M]`
- [ ] **D-19:** API versioning strategy — versioning scheme, backward compatibility, deprecation policy, breaking changes `[M]`

---

## Stream 5: CI/CD & Infrastructure (C-01 to C-15)

### 5.1 Quality Gates

- [ ] **C-01:** Add coverage threshold gate — CI fails on coverage regression, configurable threshold `[M]`
- [ ] **C-08:** Dependency license audit — block on GPL/copyleft, warn on unknown licenses `[S]`
- [ ] **C-09:** Reproducible build verification — two consecutive builds produce identical output `[S]`

### 5.2 Cross-Platform & Security

- [ ] **C-02:** Add matrix CI builds — ubuntu + macOS for TypeScript and hook tests `[S]`
- [ ] **C-03:** Add CodeQL security scanning — TypeScript + bash analysis, block on high/critical, weekly schedule `[S]`

### 5.3 Integration & Performance

- [ ] **C-04:** Add integration test stage — end-to-end: start server, run hooks, verify event flow `[L]`
- [ ] **C-05:** Add benchmark regression detection — warn on >10% regression, PR comment with comparison `[M]`
- [ ] **C-14:** End-to-end smoke test in CI — health endpoint, send/retrieve event, < 30 seconds `[M]`

### 5.4 Developer Experience & Automation

- [ ] **C-06:** Enable git hooks in CI — run project pre-commit checks, document local setup `[S]`
- [ ] **C-07:** Automated changelog generation — conventional commits to CHANGELOG.md on merge to main `[M]`
- [ ] **C-10:** Automated release tagging workflow — semver from conventional commits, GitHub Release `[M]`
- [ ] **C-11:** PR size limits — warn on PRs > 500 lines changed, exclude generated/lock files `[S]`
- [ ] **C-12:** Stale branch cleanup automation — auto-delete merged branches, issue for stale unmerged `[S]`
- [ ] **C-13:** CI build caching optimization — cache node_modules, .tsbuildinfo, ShellCheck binary `[S]`
- [ ] **C-15:** Dependency update automation — Dependabot/Renovate, auto-merge patches, grouped updates `[S]`

---

## Stream 6: Self-Enforcement (P-01 to P-10)

### 6.1 Self-Enforced Discipline

- [ ] **P-01:** `fix:` commits require test changes — CI check warns on fix commits with no test file modifications `[M]`
- [ ] **P-02:** Documentation discipline — CI validates module doc comments in `.ts`, header comments in `.hooks/*.sh`, ADR template compliance `[M]`

### 6.2 Meta-Governance

- [ ] **P-03:** Meta-test — Admiral tests its own hooks — start control plane, run hooks, ingest events, assert correctness `[L]`
- [ ] **P-04:** Quality metrics dashboard — test counts, coverage, hook count, SO count, ADR count, benchmarks at `/dashboard/quality` `[L]`

### 6.3 Self-Enforcement (Dog-Fooding)

- [ ] **P-05:** Pre-commit hook enforcement — extend `.githooks/pre-commit` to validate AGENTS.md, ADR templates, SO format; < 5 seconds `[M]`
- [ ] **P-06:** Deduplication detection in CI — track duplication percentage, warn above 15% threshold, report top-5 fragments `[M]`

### 6.4 Automated Drift & Compliance

- [ ] **P-07:** Spec-implementation drift detector — compare spec features vs implementation, report new drift per PR `[L]`
- [ ] **P-08:** Plan auto-validation — verify `plan/index.md` counts match stream files, no orphaned refs, no duplicate IDs `[M]`
- [ ] **P-09:** Standing Order compliance audit — enforcement matrix (enforced/instructed/advisory/unenforced) for all 16 SOs `[M]`
- [ ] **P-10:** Hook coverage report — spec-defined hooks vs implemented, hook-to-SO coverage, JSON + markdown output `[M]`

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
