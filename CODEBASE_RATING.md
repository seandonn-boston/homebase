# Codebase Rating: B+ (7.5/10)

**Rated:** 2026-03-18 (updated)

## What It Is

Homebase is the operational headquarters for the **Admiral Framework** — a governance system for managing fleets of autonomous AI agents. It's a monorepo containing a comprehensive 114-file specification (~15,000 lines), a TypeScript control plane (v0.6.0-alpha, ~2,400 LoC), bash enforcement hooks, and strategic research documents.

Core thesis: *Deterministic enforcement beats advisory guidance.*

## Strengths

### Specification & Documentation (9/10)
- Exceptionally organized: 12-part spec with MANIFEST (48KB index), QUICKSTART, and clear entry points at every level
- 16 Standing Orders (SO-01 through SO-16) provide a concrete governance floor — JSON-encoded rules, not aspirational guidelines
- Decision authority tiers (Enforced → Autonomous → Propose → Escalate) are a genuinely novel pattern for agent governance
- AGENTS.md + CLAUDE.md layering is clean — governance rules in one, tool config in the other
- Research directory shows real competitive intelligence and market analysis

### Architecture & Design (8/10)
- Statistical Process Control for anomaly detection is industrial-grade: Shewhart control charts with all four Western Electric rules (beyond UCL, 2-of-3 past 2σ, 4-of-5 past 1σ, 8 consecutive same side). This is significantly more sophisticated than naive thresholds
- Baseline-excluded violation checks in `ControlChart.checkLatest()` — the latest point is tested against the prior distribution, so a spike can't dilute its own detection. Smart design
- Event-driven control plane with per-agent filtering, time-windowed queries, and configurable FIFO eviction
- Zero runtime dependencies — only `node:fs`, `node:assert/strict`, `node:test`. Disciplined and enforced via AGENTS.md boundaries
- Hook enforcement model (exit codes 0/1/2) is simple and correct

### Code Quality (7.5/10)
- TypeScript in strict mode, no `any` types across all sampled source files
- Clean separation of concerns: events → traces → instrumentation → detection → alerting
- `runaway-detector.ts` (572 lines) is the most complex file and is well-structured: clear interfaces, thorough JSDoc, inline explanations of SPC math
- Biome linting enforced in CI with import organization and consistent formatting
- Bash hooks use `set -euo pipefail`, proper quoting, and defensive `jq` parsing

### CI/CD & Workflow (8/10)
- 3 GitHub Actions workflows: spec validation, control plane build/test/lint, auto-versioning
- Conventional Commits with automated semver bumping on main merge
- Spec validation catches broken cross-references, invalid JSON/YAML, and VERSION format on every PR
- Daily AI ecosystem monitoring workflow (landscape scanner)

### Governance Model (8.5/10)
- The hook system actually works — `prohibitions_enforcer.sh` hard-blocks bypass patterns (`--no-verify`, `chmod .hooks/`, `[skip ci]`) with pattern-matching against real evasion techniques
- Advisory-only mode for secret detection (acknowledging false-positive risk) is a mature design choice
- Session state management with atomic writes prevents corruption
- Standing Orders are loaded at session start via hook adapter, not just documented

## Weaknesses

### Test Coverage (4/10) — The biggest gap
- Only 2 test files: `runaway-detector.test.ts` and `events-trace-ingest.test.ts`
- The tests that exist are well-written (proper isolation, clear assertions, edge cases covered)
- But: no integration tests (event ingest → detection → alerting pipeline)
- Hook scripts in `.hooks/` have a test harness (`admiral/tests/test_hooks.sh`) but it's not wired into CI
- No coverage reporting or codecov integration
- `server.ts`, `cli.ts`, `instrumentation.ts` are completely untested

### Implementation Maturity (5/10)
- Spec is at v0.18.12; control plane is at v0.6.0-alpha — the spec is far ahead of the implementation
- Brain is filesystem JSON (B1 only); spec calls for Postgres + pgvector (B2/B3)
- Dashboard defined in spec but not implemented
- MCP server defined but not shipped
- Fleet definitions (71 core + 34 extended roles) are specifications, not running code

### Scale Concerns (5/10)
- EventStream uses a plain array with `.shift()` for eviction — O(n) per eviction, will degrade at high event rates
- 10,000 event cap with FIFO eviction may drop events the detector still needs for pattern matching (the code comments acknowledge this)
- No partitioning, batching, or back-pressure mechanisms
- `generateId()` uses a module-level counter — not safe across multiple EventStream instances in the same process

### Structural Nits (6/10)
- `aiStrat/control-plane/` vs root `control-plane/` is confusing — two different things with the same name
- `.brain/` filesystem approach has no schema validation at write time
- Some hook adapters are thin pass-through wrappers that could be consolidated
- `fireAlert` in `RunawayDetector` swallows rejected promises from async `onAlert` callbacks (line 559: `.then()` with no `.catch()`)

## Summary Table

| Dimension | Score |
|---|---|
| Documentation & Spec | 9/10 |
| Architecture & Design | 8/10 |
| CI/CD & Automation | 8/10 |
| Code Quality | 7.5/10 |
| Governance Model | 8.5/10 |
| Test Coverage | 4/10 |
| Implementation Completeness | 5/10 |
| Scalability | 5/10 |
| **Overall** | **7.5/10 (B+)** |

## What Would Move This to an A

1. **Test coverage to 70%+** — Integration tests for the event→detection→alert pipeline, hook tests in CI, coverage reporting
2. **Fix the async gap** — Add `.catch()` to the `onAlert` promise chain in `RunawayDetector.fireAlert`
3. **EventStream performance** — Replace array + `.shift()` with a circular buffer or ring buffer for O(1) eviction
4. **Ship one real subsystem** — A working MCP server or Brain B2 (Postgres) would close the spec-implementation gap meaningfully
5. **Consolidate directory structure** — Resolve the `aiStrat/control-plane/` vs `control-plane/` confusion

## Bottom Line

This is a thoughtful, well-governed project with a mature specification and a promising but early implementation. The governance philosophy — deterministic enforcement over advisory guidance — is genuinely novel and well-executed in the hook system. The SPC-based anomaly detection is industrial-grade. The main risk is the growing gap between the ambition of the spec (v0.18.12) and the completeness of the implementation (v0.6.0-alpha), particularly in testing and the Brain/MCP/Dashboard subsystems.
