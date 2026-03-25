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

- [ ] **A-08:** Hook execution pipeline abstraction — *Deferred to Phase 3.* — formal 5-phase lifecycle: load -> validate -> execute -> emit -> report `[L]`
- [ ] **A-09:** Plugin architecture for hook extensions — *Deferred to Phase 3.* — plugin discovery in `admiral/plugins/hooks/`, manifest schema, example plugin `[L]`
- [x] **A-10:** State machine for session lifecycle — 5 states (init -> active -> paused -> terminating -> complete), invalid transitions rejected `[L]`
- [x] **A-11:** Event schema registry — versioned JSON schemas for all event types, CI-enforced registration `[L]`
- [x] **A-12:** Configuration schema validation at startup — validate config at session start, report all errors, fail-closed `[M]`

### 3.5 Graceful Degradation

- [ ] **A-13:** Graceful degradation testing for optional components — *Deferred to Phase 3 (depends on A-05).* — verify Admiral degrades gracefully when Brain MCP, pgvector, control plane, or scanner are absent; component availability registry, degradation behavior specs, automated tests for individual and combined absence, clear user-facing messages `[L]`

---

## Stream 4: Documentation (D-01 to D-19)

> **Phase 1 status:** D-02 (CoC) and D-03 (LICENSE) completed. Remaining D-items (D-01, D-04 through D-19) deferred to Phase 2 — they are documentation tasks that don't block Phase 2 architecture/CI work from starting. D-01 (style guide) is the highest priority deferred item as it gates Q-03, Q-13, and D-17.

### 4.1 Core Project Documents

- [ ] **D-01:** Create ADMIRAL_STYLE.md — naming conventions, error handling, jq patterns, exit codes, comment standards, testing requirements `[L]` — *Deferred to Phase 2 (large scope, gates Q-03/Q-13/D-17).*
- [x] **D-02:** Add CODE_OF_CONDUCT.md — Contributor Covenant v2.1 `[S]`
- [x] **D-03:** Add LICENSE file — MIT license at repo root `[S]`

### 4.2 Inline Documentation

- [ ] **D-04:** Add inline "why" comments to hooks — *Deferred to Phase 2.* — audit all 13+ hooks, annotate regex patterns, thresholds, state mutations, magic numbers `[L]`
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

- [x] **C-01:** Add coverage threshold gate — *Completed in T-09 (check-coverage.sh at 85% threshold, integrated into control-plane-ci.yml).* — CI fails on coverage regression, configurable threshold `[M]`
- [x] **C-08:** Dependency license audit — block on GPL/copyleft, warn on unknown licenses `[S]`
- [x] **C-09:** Reproducible build verification — *Satisfied by package-lock.json + deterministic tsc compilation.* `[S]`

### 5.2 Cross-Platform & Security

- [ ] **C-02:** Add matrix CI builds — *Deferred (requires macOS runner access).* — ubuntu + macOS for TypeScript and hook tests `[S]`
- [ ] **C-03:** Add CodeQL security scanning — *Deferred (requires GitHub Advanced Security setup).* — TypeScript + bash analysis, block on high/critical, weekly schedule `[S]`

### 5.3 Integration & Performance

- [ ] **C-04:** Add integration test stage — *Deferred to Phase 3 (depends on A-02).* `[L]`
- [x] **C-05:** Add benchmark regression detection `[M]`
- [ ] **C-14:** End-to-end smoke test in CI — *Deferred to Phase 3 (depends on A-02 integration).* `[M]`

### 5.4 Developer Experience & Automation

- [x] **C-06:** Enable git hooks in CI — *Pre-commit hook exists at .githooks/pre-commit (ShellCheck + Biome). CI enforces the same checks.* `[S]`
- [x] **C-07:** Automated changelog generation `[M]`
- [x] **C-10:** Automated release tagging workflow `[M]`
- [x] **C-11:** PR size limits — warn on PRs > 500 lines changed, exclude generated/lock files `[S]`
- [x] **C-12:** Stale branch cleanup automation — auto-delete merged branches, issue for stale unmerged `[S]`
- [x] **C-13:** CI build caching optimization — *Already configured: setup-node@v6 with `cache: 'npm'` in control-plane-ci.yml.* — cache node_modules, .tsbuildinfo, ShellCheck binary `[S]`
- [ ] **C-15:** Dependency update automation — *Deferred (requires Dependabot/Renovate configuration).* — Dependabot/Renovate, auto-merge patches, grouped updates `[S]`

---

## Stream 6: Self-Enforcement (P-01 to P-10)

### 6.1 Self-Enforced Discipline

- [x] **P-01:** `fix:` commits require test changes — CI check warns on fix commits with no test file modifications `[M]`
- [ ] **P-02:** Documentation discipline — *Deferred to Phase 3 (depends on D-01 style guide).* `[M]`

### 6.2 Meta-Governance

- [ ] **P-03:** Meta-test — *Deferred to Phase 3 (depends on A-02 integration).* `[L]`
- [ ] **P-04:** Quality metrics dashboard — *Deferred to Phase 3 (depends on T-09, T-10, T-11, T-12).* `[L]`

### 6.3 Self-Enforcement (Dog-Fooding)

- [x] **P-05:** Pre-commit hook enforcement `[M]`
- [x] **P-06:** Deduplication detection in CI `[M]`

### 6.4 Automated Drift & Compliance

- [x] **P-07:** Spec-implementation drift detector `[L]`
- [x] **P-08:** Plan auto-validation — verify `plan/index.md` counts match stream files, no orphaned refs, no duplicate IDs `[M]`
- [ ] **P-09:** Standing Order compliance audit — *Deferred to Phase 3 (depends on S-05).* `[M]`
- [ ] **P-10:** Hook coverage report — *Deferred to Phase 3 (depends on S-05).* `[M]`

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
