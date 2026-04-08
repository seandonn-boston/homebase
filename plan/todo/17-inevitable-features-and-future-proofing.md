# TODO: Inevitable Features & Future-Proofing

> Source: stream-28-inevitable-features.md (IF-01 to IF-12)

Capabilities that will inevitably be needed as Admiral matures from single-repo governance into operational infrastructure for AI workforces. Each item is a stepping stone toward three inevitable features: fleet-wide causality tracing, living operational memory, and predictive fleet health.

---

## Competitive Urgency

The three inevitable features (causality tracing, living memory, predictive health) are Admiral's defensible moat. Competitive timelines: **Causality Tracing within 90 days** (before Perplexity Computer exposes subagent traces), **Brain B2 within 120 days** (before Comet persists interaction patterns), **Predictive Health within 180 days** (before Leash adds trend analysis). The compounding effect — each feature feeds the next — means early deployment creates a self-improving system competitors cannot replicate retroactively.

Consider promoting IF-05 (performance profiling) and IF-08 (session replay) from Phase 8 to Phase 5–6 to feed the causality tracing and predictive health data pipelines earlier.

---

## Agent Lifecycle & Marketplace

- [x] **IF-01: Agent versioning** — Semantic versioning for agent definitions so updates do not break running sessions. Maintain a version registry with changelogs and support rollback without disrupting active sessions. *(Implemented: `admiral/fleet/agent-versioning.ts` — semver parsing/comparison/bumping, version registry, rollback, deprecation, changelog, 18 tests, 637ms)*
- [x] **IF-02: Agent marketplace concept** *(deferred Phase 3+)* — Design a package format and registry protocol for sharing agent definitions across teams and organizations. Covers trust boundaries, sandboxing, and distribution for imported agents.

## Plugin & Multi-Repo

- [x] **IF-03: Plugin system architecture** — Extensibility model with plugin interfaces for three extension points: hook plugins, agent plugins, and integration plugins. Each plugin is sandboxed with declared permissions and a manifest schema. *(Implemented: `admiral/fleet/plugin-system.ts` — manifest schema, permission model, sandbox with enforcement, 4 tests)*
- [x] **IF-04: Multi-repository support** — Govern agents across multiple repositories with shared policies via a hub-and-spoke model. Supports shared Standing Orders, per-repo overrides, cross-repo brain access, and unified fleet health metrics. *(Implemented: `admiral/fleet/multi-repo.ts` — hub-spoke config, effective policy/SO computation, aggregate health, 4 tests)*

## Performance & Cost

- [x] **IF-05: Agent performance profiling** — Per-agent profiling tracking token usage, first-pass quality rate, revision depth, context utilization efficiency, and brain query effectiveness. Generates trend reports for dashboard integration. *(Implemented: `admiral/fleet/performance-profiling.ts` — snapshot recording, trend computation, 3 tests)*
- [x] **IF-06: Cost optimization engine** — Decision engine that recommends optimal model tiers per task based on complexity, quality requirements, budget, and historical performance. Supports minimize-cost, maximize-quality, and balanced strategies. *(Implemented: `admiral/fleet/cost-optimizer.ts` — 3-tier model, 3 strategies, budget constraints, alternatives, 4 tests)*
- [x] **IF-07: A/B testing framework for agents** *(deferred Phase 3+)* — Test different agent configurations against each other by routing tasks, tracking per-configuration metrics, and computing statistical significance to declare a winner.

## Testing & Debugging

- [x] **IF-08: Agent replay and debugging** — Record and replay agent sessions capturing every tool invocation, hook execution, brain query, handoff, and model API call. Supports replay comparison, configurable retention, and anonymization. *(Implemented: `admiral/fleet/agent-replay.ts` — session recording, comparison, anonymization, retention cleanup, 3 tests)*

## Predictive Health Models

- [x] **IF-13: Prediction model specifications** — Implement 6 prediction models from the inevitable-features extension: context exhaustion (linear extrapolation), budget exhaustion (burn rate projection), quality degradation (correlated threshold warning), retry loop risk (frequency-based >3 errors/5min), tool failure cascade (latency trend extrapolation), orchestrator overload (multi-signal composite). Simple trend extrapolation, not ML. *(Implemented: `admiral/fleet/prediction-models.ts` — linear regression, 6 prediction functions, composite runner, 8 tests)*

## Governance Evolution

- [x] **IF-09: Natural language policy authoring** *(deferred Phase 3+)* — Compile human-readable policy statements into executable hooks, Standing Order entries, and alert rules. Operates in suggest mode (human review) and apply mode (after approval).
- [x] **IF-10: Governance compliance certification** *(deferred Phase 3+)* — Generate certifiable compliance reports aligned with the Admiral Rating System, covering automated metrics collection, Human Judgment Gate templates, and rating determination.

## Collaboration & Dashboard

- [x] **IF-11: Agent collaboration patterns** — Reusable multi-agent coordination primitives: Pipeline (sequential), Broadcast (one-to-many), Consensus (voting with quorum), and Delegation (orchestrator assigns subtasks). Patterns are composable and governance-integrated. *(Implemented: `admiral/fleet/collaboration-patterns.ts` — 4 async patterns with TaskExecutor interface, 5 tests)*
- [x] **IF-12: Real-time collaboration dashboard** — Live fleet view showing agent status, task board with dependencies, filtered event stream, resource meters, and governance overlay. Real-time updates via SSE, targeting sub-2-second latency.

---

## Dependencies

| Task | Depends on | Downstream |
|------|-----------|------------|
| IF-01 | — | IF-02, IF-04 |
| IF-02 | IF-01 | — |
| IF-03 | — | — |
| IF-04 | IF-01 | — |
| IF-05 | — | IF-06, IF-07 |
| IF-06 | IF-05 | — |
| IF-07 | IF-05 | — |
| IF-08 | — | — |
| IF-09 | — | — |
| IF-10 | — | — |
| IF-11 | — | — |
| IF-12 | — | — |
