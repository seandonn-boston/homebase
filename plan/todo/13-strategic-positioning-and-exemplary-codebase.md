# TODO: Strategic Positioning & Exemplary Codebase

> Source: stream-12-strategic-positioning.md (R-01 to R-13), stream-13-exemplary-codebase.md (X-01 to X-18)

Strategic positioning makes Admiral legible to enterprises, regulators, analysts, and academics. Exemplary codebase transforms Helm from "well-built" into a reference implementation others study and emulate. All R-items are deferred to Phase 3+; X-items are a mix of active and deferred work.

---

## Compliance Crosswalks

- [x] **R-01: OWASP Agentic Top 10 Crosswalk** *(DEFERRED Phase 3+)* — Map each OWASP agentic risk to Admiral failure modes and defenses (Standing Orders, hooks); document gaps with planned remediation references. *(Implemented: docs/compliance/owasp-agentic-mapping.md — all 10 risks mapped)*
- [x] **R-02: Forrester AEGIS Framework Alignment** *(DEFERRED Phase 3+)* — Map Admiral to AEGIS's 6 domains and 39 controls; produce crosswalk with coverage percentage per domain and overall summary for enterprise procurement. *(Implemented: docs/compliance/aegis-crosswalk.md)*
- [x] **R-03: KPMG TACO Framework Tagging** *(DEFERRED Phase 3+)* — Tag all 71 agent roles with TACO categories (Taskers, Automators, Collaborators, Orchestrators); include distribution statistics and classification rationale. *(Implemented: docs/compliance/taco-tagging.md)*
- [x] **R-04: NIST Zero Trust Alignment** *(DEFERRED Phase 3+)* — Map Admiral identity tokens and access control to NIST SP 800-207 and SPIFFE/SPIRE identity concepts; articulate zero trust enforcement boundaries.
- [x] **R-08: ISO 42001 (AI Management System) Alignment** *(DEFERRED Phase 3+)* — Clause-by-clause mapping of ISO 42001 to Admiral capabilities; produce coverage matrix and pre-populated Statement of Applicability template.
- [x] **R-09: EU AI Act Compliance Mapping** *(DEFERRED Phase 3+)* — Map EU AI Act articles to Admiral implementations; crosswalk decision authority tiers to risk levels, transparency checklists, human oversight mapping, and gap analysis.

## Industry Alignment

- [x] **R-05: McKinsey Agentic Organization Mapping** *(DEFERRED Phase 3+)* — Map Admiral's 11 spec parts to McKinsey's 5 pillars of the Agentic Organization; position governance agents as realization of McKinsey's embedded control agents concept.
- [x] **R-06: Singapore IMDA Regulatory Alignment** *(DEFERRED Phase 3+)* — Document Admiral-to-IMDA equivalences: Tool & Capability Registry as "action-space," Decision Authority Tiers as "autonomy levels"; produce document suitable for APAC procurement compliance review.

## Market & Community

- [x] **R-07: AI Work OS Positioning Document** *(DEFERRED Phase 3+)* — Reframe Admiral from "governance tool" to "operating system for AI work" with complete OS-to-Admiral concept mapping; produce executive summary for pitch decks and technical depth for engineering leadership. Updated positioning: **"Governance for AI workforces"** — distinct from "security for AI agents" (Leash) or "AI-powered enterprise" (Perplexity).
- [x] **R-10: Competitive Differentiation Matrix** *(DEFERRED Phase 3+)* — Feature-by-feature comparison against LangGraph, CrewAI, AutoGen, Semantic Kernel, **StrongDM Leash** (kernel enforcement), **Perplexity Computer** (multi-model orchestration), **Perplexity Comet Enterprise** (browser governance), and the **assembled "good enough" stack** (Leash + Computer + Comet). Compare across 10+ dimensions including cross-platform scope, persistent memory, graduated trust, behavioral governance, and fleet coordination. Include honest trade-off assessment and quarterly update cadence.
- [x] **R-11: Enterprise Adoption Playbook** *(DEFERRED Phase 3+)* — Step-by-step guide covering discovery, evaluation, pilot, rollout, and operationalization; include decision frameworks, persona-specific content, and top-10 objection FAQ.
## Simulation & Chaos Testing

- [x] **X-01: Deterministic Simulation Testing** — Create simulation harness that replays recorded hook sequences and verifies byte-identical outcomes across runs; normalize non-determinism (timestamps, random values); produce clear diffs on divergence. *(Implemented: `admiral/exemplary/simulation-testing.ts` — normalize, hash, run simulation with diff, 4 tests)*
- [x] **X-02: Chaos Testing for Hooks** — Inject 25+ failure scenarios; verify all hooks fail open and state files are never corrupted. *(Implemented: `admiral/exemplary/chaos-testing.ts` — 26 scenarios, payload generators, chaos test runner, 5 tests)*
- [x] **X-03: End-to-End Claude Code Session Simulation** — Simulate full session lifecycle with 50+ PreToolUse/PostToolUse cycles. *(Implemented: `admiral/exemplary/session-simulation.ts` — budget/loop/brain/error tracking, state progression, 5 tests)*
- [x] **X-05: Implement Sentinel Governance Agent** — Build first non-Claude-Code governed agent; Sentinel monitors for loops, budget violations, and scope drift via unified event log. *(Implemented: `admiral/exemplary/sentinel-agent.ts` — loop/budget/scope checks, alert accumulation, 4 tests)*
- [x] **X-06: Implement Triage Router Agent** — Build routing agent that assigns tasks based on type, capabilities, load, and availability; log routing decisions with rationale. *(Implemented: `admiral/exemplary/triage-router.ts` — capability matching, load-aware scoring, decision logging, 5 tests)*
- [ ] **X-14: Security Penetration Testing Suite** — Automated suite covering 30+ attack scenarios across 5+ categories. *(Deferred — requires running security infrastructure and attack corpus execution environment)*
- [ ] **X-15: Load Testing for Control Plane Server** — Verify server handles 1000+ concurrent connections. *(Deferred — requires running server and sustained load generation)*

## Profiling & Contract Testing

- [x] **X-04: Hook Execution Profiling** — Instrument hooks to record timing and subprocess calls; produce p50/p95/p99 execution times per hook type; identify bottlenecks with specific recommendations. *(Implemented: `admiral/exemplary/hook-profiling.ts` — percentile stats, bottleneck detection, report generation, 2 tests)*
- [x] **X-07: Cross-System Unified Event Log** — Single JSONL event log for both shell hooks and TypeScript control plane; query interface with filtering by source, event type, time range, and session ID. *(Implemented: `admiral/exemplary/unified-event-log.ts` — JSONL append, multi-filter query, file persistence, 2 tests)*
- [x] **X-13: Contract Testing Between Hooks and Control Plane** — Define contract schemas for every hook-to-control-plane boundary; validate both sides independently. *(Implemented: `admiral/exemplary/build-verification.ts` — 4 contract schemas, payload validator, 4 tests)*

## Code Quality Tooling

- [x] **X-08: Automated API Documentation Generation** — Generate `API.md` from `server.ts` route definitions via AST parsing; CI step verifies generated docs match committed docs. *(Implemented: `admiral/exemplary/code-quality-tools.ts` extractApiEndpoints + generateApiDocs, 2 tests)*
- [x] **X-09: Dependency License Audit in CI** — CI step scans all dependencies and flags incompatible licenses; allowlist mechanism for manually-reviewed exceptions. *(Implemented: `admiral/exemplary/code-quality-tools.ts` auditLicenses with configurable allowlist)*
- [x] **X-10: Reproducible Build Verification** — Verify TypeScript builds are deterministic (byte-identical output from same source); CI step automates two-build comparison. *(Implemented: `admiral/exemplary/build-verification.ts` — hash build output, compare builds, 3 tests)*
- [x] **X-11: Architecture Visualization** — Auto-generate Mermaid diagrams from codebase structure covering hook flow, event flow, and brain layer hierarchy. *(Implemented: `admiral/exemplary/build-verification.ts` — hook flow + module dependency Mermaid generators, 2 tests)*
- [ ] **X-12: Contribution Complexity Analyzer** *(DEFERRED Phase 3+)* — Script classifying codebase areas by contribution difficulty; generate ranked "good first issue" candidates based on complexity, coverage, and isolation.
- [x] **X-16: Git History Quality Audit** — Audit git history for conventional commits, large binaries, committed secrets, force pushes, and merge hygiene; produce quality report with score and remediation recommendations. *(Implemented: `admiral/exemplary/code-quality-tools.ts` auditGitHistory, 1 test)*
- [x] **X-17: Documentation Coverage Report** — Report showing JSDoc coverage for TypeScript and header comment coverage for shell scripts; target 80%+; prioritized list of top 20 undocumented areas by importance. *(Implemented: `admiral/exemplary/code-quality-tools.ts` checkDocCoverage, 1 test)*
- [ ] **X-18: Accessibility Audit for Dashboard** *(DEFERRED Phase 3+)* — WCAG 2.1 Level AA audit of control plane dashboard; keyboard navigation, screen reader compatibility, color contrast, focus management; axe-core in CI.

---

## Dependencies

| Task | Depends on | Notes |
|------|-----------|-------|
| R-04 | S-20 (data sensitivity) | Needs concrete security references |
| R-07 | All other R-items | Should be last in stream — needs implementation depth |
| R-08 | — | Benefits from R-01, R-04 completed first |
| R-09 | — | Benefits from R-04 for security references |
| R-11 | R-07, R-10 | Needs positioning clarity from both |
| X-01 | A-01 (schema validation) | Needs validated payloads for replay |
| X-02 | T-06 (edge cases) | Chaos extends edge case thinking |
| X-03 | S-01 through S-04 | Requires all hooks to exist |
| X-05 | S-23 (sentinel pattern) | Meta-governance prerequisite |
| X-06 | S-06 (registry), S-07 (routing) | Fleet composition prerequisites |
| X-13 | A-01 (schema validation) | Base JSON schemas |
| X-14 | S-19 (injection detection), S-20 (data sensitivity) | Defense implementations |
| X-15 | X-07 (unified event log) | Realistic event ingestion testing |
| X-18 | Dashboard implementation | Cannot audit what does not exist |
| R-01, R-02, R-03, R-05, R-06, R-10 | — | Independent |
| X-04, X-07, X-08, X-09, X-10, X-11, X-12, X-16, X-17 | — | Independent |
