# Stream 28: Inevitable Features — Future-Proofing the Framework

> *"The best way to predict the future is to invent it. The second best way is to build infrastructure that makes the future's requirements easy to satisfy." — Alan Kay (adapted)*

**Scope:** Features that will inevitably be needed as the Admiral Framework matures from a single-repository governance tool into operational infrastructure for AI workforces. Based on the inevitable features extension (`aiStrat/admiral/extensions/inevitable-features.md`), which identifies three capability shifts — fleet-wide causality tracing, living operational memory, and predictive fleet health — plus the structural requirements that emerge as teams scale from one project to many, from one team to an organization, and from experimentation to production. This stream covers agent versioning, marketplace concepts, plugin architecture, multi-repo support, performance profiling, cost optimization, A/B testing, session replay, natural language policies, compliance certification, collaboration patterns, and real-time dashboarding.

**Why this stream exists:** The inevitable features extension makes the case that certain capabilities create operational lock-in through genuine value — the system becomes hard to leave because leaving makes you objectively worse at operating your AI workforce. This stream plans the path from "useful tool" to "indispensable infrastructure." Each item is a stepping stone toward the three inevitable features: causality tracing, living memory, and predictive health. Build in order — each feature creates the data the next feature consumes.

---

## 28.1 Agent Lifecycle Management

- [ ] **IF-01: Agent versioning**
  - **Description:** Version agent definitions so updates do not break running sessions. Implement semantic versioning for agent definition files (AGENTS.md sections, Standing Orders, hook configurations). When an agent definition changes, the new version applies to new sessions while running sessions continue with the version they started with. Maintain a version registry that tracks: agent role, version number, effective date, changelog, and compatibility notes. Support rollback — if a new agent version degrades quality, revert to the previous version without restarting active sessions. Version information is embedded in session metadata and audit trails for traceability.
  - **Done when:** Agent definitions have version numbers. Running sessions are not affected by definition changes mid-session. Version registry tracks all agent versions with changelogs. Rollback to a previous version works without disrupting active sessions. Session metadata includes the agent definition version used.
  - **Files:** `admiral/versioning/agent-versions.ts` (new), `admiral/versioning/version-registry.json` (new), `admiral/tests/test_agent_versioning.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/admiral/extensions/inevitable-features.md` — Living Operational Memory (versioned knowledge)
  - **Depends on:** —

- [ ] **IF-02: Agent marketplace concept** ⏳ DEFERRED (Phase 3+)
  - **Description:** Design the framework for sharing agent definitions across teams and organizations. Define a package format for agent definitions that bundles: agent identity (role, boundaries, authority tiers), associated hooks, Standing Orders, brain entry templates, and test scenarios. Design a registry protocol for publishing, discovering, and installing agent packages. Address key questions: how are packages versioned (follows IF-01), how are trust boundaries maintained when importing external agents, how are imported agents sandboxed to prevent privilege escalation, how are package updates distributed. This is a design document and prototype — not a full marketplace implementation.
  > **Deferred rationale:** Agent marketplace concept; no agents exist yet to have a marketplace for.
  - **Done when:** Agent package format is defined with a JSON schema. A prototype `admiral agent publish` and `admiral agent install` workflow exists. Trust boundaries for imported agents are documented. At least 2 example agent packages are created from existing agent definitions. Design document covers versioning, trust, sandboxing, and distribution.
  - **Files:** `admiral/marketplace/package-schema.json` (new), `admiral/marketplace/README.md` (new), `admiral/cli/agent-package.sh` (new), `admiral/marketplace/examples/` (new directory)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/admiral/extensions/thesis.md` — the organizational form that Admiral enables
  - **Depends on:** IF-01

---

## 28.2 Extensibility

- [ ] **IF-03: Plugin system architecture**
  - **Description:** Design an extensibility model for custom hooks, agents, and integrations. Define plugin interfaces for three extension points: (1) hook plugins — custom hooks that integrate with the enforcement spectrum without modifying core hook infrastructure, (2) agent plugins — custom agent types with their own identity, authority, and governance requirements, (3) integration plugins — connectors to external systems (CI providers, notification channels, model providers, brain backends). Each plugin type has a manifest schema declaring: name, version, extension point, required permissions, configuration schema, and lifecycle hooks (install, enable, disable, uninstall). Plugins are sandboxed — they cannot access resources beyond their declared permissions.
  - **Done when:** Plugin manifest schema is defined for all 3 extension points. Plugin lifecycle (install/enable/disable/uninstall) is implemented. At least one example plugin exists for each extension point. Plugins are sandboxed with declared permissions. Plugin loading does not slow down core operations (< 10ms overhead per plugin).
  - **Files:** `admiral/plugins/manifest-schema.json` (new), `admiral/plugins/loader.sh` (new), `admiral/plugins/examples/` (new directory), `admiral/docs/plugin-development.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **IF-04: Multi-repository support**
  - **Description:** Govern agents across multiple repositories with shared policies. Enable a central Admiral configuration that applies governance policies (Standing Orders, enforcement spectrum, authority tiers, brain access) across multiple repositories. Design the architecture for: (1) shared Standing Orders that apply everywhere, (2) per-repository overrides that customize shared policies, (3) cross-repository brain access (agents in repo A can query knowledge from repo B, subject to access controls), (4) unified fleet health metrics aggregated across repositories, (5) cross-repository handoff validation. Start with a hub-and-spoke model where one repository holds the central configuration and others reference it.
  - **Done when:** Central configuration can be referenced from multiple repositories. Shared Standing Orders apply across repositories with per-repo overrides. Cross-repository brain access is designed with access control model. A prototype demonstrates governance enforcement across 2 repositories. Architecture document covers scaling considerations.
  - **Files:** `admiral/multi-repo/central-config-schema.json` (new), `admiral/multi-repo/README.md` (new), `admiral/multi-repo/repo-link.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/admiral/extensions/inevitable-features.md` — Living Memory (cross-project namespacing)
  - **Depends on:** IF-01

---

## 28.3 Performance and Cost Intelligence

- [ ] **IF-05: Agent performance profiling**
  - **Description:** Deep performance analysis of individual agents covering token usage, decision quality, task completion rate, and operational efficiency. Implement per-agent profiling that tracks: tokens consumed per task (input vs. output), first-pass quality rate (tasks passing QA without revision), average revision depth, time-to-completion distribution, context utilization efficiency (useful output tokens / total context tokens), authority tier usage (how often does the agent escalate vs. decide autonomously), and brain query effectiveness (how often do brain queries influence decisions). Generate per-agent profile reports that highlight strengths, weaknesses, and trends over time. Profiles feed into cost optimization (IF-06) and A/B testing (IF-07).
  - **Done when:** Per-agent profiling tracks all listed metrics. Profile reports generate on demand and on schedule (weekly). Reports show trends over configurable time windows. At least 3 agents have profiles with realistic data. Profiles are queryable via API for dashboard integration.
  - **Files:** `control-plane/src/agent-profiler.ts` (new), `control-plane/src/agent-profiler.test.ts` (new), `admiral/docs/agent-profiling.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** `aiStrat/admiral/reference/benchmarks.md` — Core Metrics, `aiStrat/admiral/reference/rating-system.md` — Individual Agent evaluation dimensions
  - **Depends on:** —

- [ ] **IF-06: Cost optimization engine**
  - **Description:** Optimize model tier selection for cost/quality tradeoff. Implement a decision engine that recommends the optimal model tier for each task based on: task complexity (estimated from task description and historical data), quality requirements (from authority tier — higher authority requires higher quality), cost budget (remaining budget and burn rate), historical performance (which model tier achieved what quality for similar tasks). The engine suggests — it does not enforce. Suggestions are logged and their outcomes tracked to improve future recommendations. Support configurable optimization strategies: minimize cost (cheapest model that meets quality floor), maximize quality (best model within budget), balanced (Pareto-optimal point on cost-quality curve).
  - **Done when:** Cost optimization engine recommends model tiers for tasks. Recommendations are based on task complexity, quality requirements, and budget. At least 3 optimization strategies are implemented. Recommendation outcomes are tracked for feedback. Engine suggestions are logged in the audit trail.
  - **Files:** `control-plane/src/cost-optimizer.ts` (new), `control-plane/src/cost-optimizer.test.ts` (new), `admiral/config/cost-optimization.json` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/admiral/reference/benchmarks.md` — Context Efficiency, Governance Overhead
  - **Depends on:** IF-05

- [ ] **IF-07: A/B testing framework for agents** ⏳ DEFERRED (Phase 3+)
  - **Description:** Test different agent configurations against each other to measure the impact of changes. Implement a framework that: (1) defines an experiment (two or more agent configurations, a success metric, and a sample size), (2) routes tasks to configurations based on the experiment assignment (round-robin or random), (3) tracks per-configuration metrics (first-pass quality, token usage, time-to-completion, revision depth), (4) computes statistical significance when the sample size is reached, (5) declares a winner and optionally promotes the winning configuration. Support experiments on: model tier selection, prompt variations, Standing Order variations, context profile variations, and hook configuration variations.
  > **Deferred rationale:** A/B testing framework for agents; need agents running first before testing variations.
  - **Done when:** Experiments can be defined, started, and concluded. Task routing splits traffic between configurations. Per-configuration metrics are tracked and compared. Statistical significance is computed (at minimum, a simple two-proportion z-test or Mann-Whitney U test). At least one example experiment is documented end-to-end.
  - **Files:** `control-plane/src/ab-testing.ts` (new), `control-plane/src/ab-testing.test.ts` (new), `admiral/docs/ab-testing-guide.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** IF-05

---

## 28.4 Debugging and Replay

- [ ] **IF-08: Agent replay and debugging**
  - **Description:** Record and replay agent sessions for debugging and training. Implement session recording that captures: every tool invocation (input and output), every hook execution (input, decision, output), every brain query and result, every handoff sent and received, context window state at key decision points, and model API requests and responses (with token counts). Recordings are stored in a structured format that supports replay — feeding the same inputs to the same agent configuration and comparing outputs. Replay mode enables: debugging production issues (what exactly happened?), training new agent configurations (does the new config produce better results on historical inputs?), and regression testing (does a change break previously-successful sessions?). Recordings have configurable retention and can be anonymized (scrub sensitive content while preserving structure).
  - **Done when:** Sessions can be recorded with all listed data points. Recordings can be replayed against the same or different agent configurations. Replay produces a comparison report (original vs. replay outputs). Recordings support retention policies and anonymization. At least one recorded session can be replayed successfully.
  - **Files:** `control-plane/src/session-recorder.ts` (new), `control-plane/src/session-replayer.ts` (new), `control-plane/src/session-recorder.test.ts` (new), `admiral/docs/session-replay.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/admiral/extensions/inevitable-features.md` — Feature 1 (Fleet-Wide Causality Tracing)
  - **Depends on:** —

---

## 28.5 Predictive Health Models

- [ ] **IF-13: Prediction model specifications and implementation**
  - **Description:** Implement the six prediction models defined in the inevitable-features extension for Predictive Fleet Health: (1) **Context exhaustion** — linear extrapolation with input size weighting from context utilization trend over last 10 operations; (2) **Budget exhaustion** — burn rate projection from token consumption rate and remaining work estimate; (3) **Quality degradation** — threshold-based warning when rolling first-pass rate and context health correlation align; (4) **Retry loop risk** — frequency-based detection of >3 errors in 5 minutes with same error signature; (5) **Tool failure cascade** — latency trend extrapolation against timeout threshold from MCP server metrics; (6) **Orchestrator overload** — multi-signal composite threshold from task queue depth, decomposition latency, and context utilization. As the spec notes: "Predictive health does not require machine learning or complex forecasting. Most predictions are simple trend extrapolation from operational data."
  - **Done when:** All 6 prediction models are implemented with the specified input signals and methods. Predictions are generated from real operational data (or synthetic test data). Each prediction produces a structured warning with confidence level and recommended action. Predictions feed into the alerting system (OB-05). Tests verify each prediction model with synthetic data.
  - **Files:** `control-plane/src/predictive-health/` (new directory), `control-plane/src/predictive-health/models.ts` (new), `control-plane/src/predictive-health/models.test.ts` (new)
  - **Size:** L
  - **Spec ref:** `aiStrat/admiral/extensions/inevitable-features.md` — Feature 3: Predictive Fleet Health / Prediction Models
  - **Depends on:** OB-03 (metrics collection), IF-05 (performance profiling)

---

## 28.6 Governance Evolution

- [ ] **IF-09: Natural language policy authoring** ⏳ DEFERRED (Phase 3+)
  - **Description:** Allow governance policies to be written in natural language and compiled to executable rules. Implement a policy compiler that translates human-readable policy statements into: hook configurations (for deterministic enforcement), Standing Order entries (for instruction-level enforcement), and alert rules (for monitoring-level enforcement). Example: "No agent may modify files outside its declared scope" compiles to a PreToolUse hook that checks file paths against the agent's scope declaration. The compiler operates in two modes: (1) suggest mode — proposes enforcement artifacts for human review, (2) apply mode — creates the artifacts after human approval. Natural language policies are version-controlled alongside the artifacts they generate, maintaining the link between intent and implementation.
  > **Deferred rationale:** Natural language policy authoring is a luxury feature; policies can be YAML/JSON first.
  - **Done when:** At least 10 common governance policies can be expressed in natural language and compiled to enforcement artifacts. Suggest mode produces human-reviewable proposals. Apply mode creates working hooks/SOs/alerts after approval. Policy-to-artifact mapping is traceable. Generated artifacts pass the same validation as hand-written artifacts.
  - **Files:** `admiral/policy/compiler.sh` (new), `admiral/policy/templates/` (new directory — policy-to-artifact templates), `admiral/policy/examples/` (new — example natural language policies), `admiral/tests/test_policy_compiler.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/admiral/extensions/inevitable-features.md` — thesis on governance vocabulary
  - **Depends on:** —

- [ ] **IF-10: Governance compliance certification** ⏳ DEFERRED (Phase 3+)
  - **Description:** Generate certifiable compliance reports for enterprise customers. Implement a certification report generator that produces reports aligned with the Admiral Rating System (`aiStrat/admiral/reference/rating-system.md`). Reports include: (1) Phase 1 evidence — automated metrics collection for all 7 core benchmarks, behavioral probe results, attack corpus pass rates, enforcement coverage audit, (2) Phase 2 preparation — structured templates for Human Judgment Gates with required evidence checklists, (3) rating determination — automated rating calculation based on metric caps and gate verdicts, (4) continuous validation status — current metric values against rating thresholds, re-evaluation trigger status. Reports are generated in both human-readable (PDF/markdown) and machine-readable (JSON) formats. This is the bridge between the rating system specification and operational certification.
  > **Deferred rationale:** Governance compliance certification overlaps with rating system (stream-32); consolidate later.
  - **Done when:** Certification reports generate with all Phase 1 evidence collected automatically. Human Judgment Gate templates are produced with pre-filled evidence. Rating calculation applies metric caps correctly. Reports include both markdown and JSON formats. At least one self-assessment (Tier 1) report can be generated end-to-end.
  - **Files:** `admiral/certification/report-generator.sh` (new), `admiral/certification/templates/` (new directory — gate templates), `admiral/certification/examples/` (new — example reports), `admiral/tests/test_certification.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/admiral/reference/rating-system.md` — The Evaluation Protocol (all 4 phases), Certification Tiers
  - **Depends on:** —

---

## 28.6 Multi-Agent Patterns

- [ ] **IF-11: Agent collaboration patterns**
  - **Description:** Implement common multi-agent patterns as reusable building blocks: (1) **Pipeline** — sequential processing where each agent's output feeds the next agent's input (e.g., Design -> Implement -> QA), (2) **Broadcast** — one agent sends a message to all agents in a group (e.g., Architecture decision broadcast), (3) **Consensus** — multiple agents vote on a decision, with configurable quorum requirements (e.g., multi-reviewer code review), (4) **Delegation** — an orchestrator assigns subtasks to specialized agents and aggregates results (the existing fleet pattern, formalized). Each pattern is implemented as a coordination primitive with: a defined protocol (message format, sequencing rules), governance integration (handoff validation per `v1.schema.json`, authority tier enforcement), and observability (trace spans per pattern step, pattern-level metrics). Patterns are composable — a pipeline stage can internally use delegation.
  - **Done when:** All 4 patterns are implemented with defined protocols. Each pattern produces valid handoff documents per v1.schema.json. Patterns integrate with the tracing infrastructure (trace spans per step). At least one working example demonstrates each pattern. Patterns are composable (documented and tested).
  - **Files:** `admiral/patterns/pipeline.sh` (new), `admiral/patterns/broadcast.sh` (new), `admiral/patterns/consensus.sh` (new), `admiral/patterns/delegation.sh` (new), `admiral/patterns/README.md` (new), `admiral/tests/test_patterns.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/handoff/v1.schema.json`, `aiStrat/admiral/extensions/inevitable-features.md` — Compounding Effect
  - **Depends on:** —

- [ ] **IF-12: Real-time collaboration dashboard**
  - **Description:** Live view of all active agents, their tasks, and governance status. Implement a real-time dashboard that shows: (1) agent fleet map — all active agents with their current status (idle/working/blocked/error), assigned task, and governance health, (2) task board — all active tasks with assignment, progress, and dependency visualization, (3) live event stream — real-time feed of governance events (hook executions, brain queries, handoffs, escalations) with filtering, (4) resource meters — budget consumption, context utilization, and token throughput in real-time, (5) governance overlay — visual indicator on each agent showing their authority tier, active Standing Orders, and any governance violations. Data is pushed via Server-Sent Events (SSE) for real-time updates without polling. The dashboard is the primary operational interface for an Admiral overseeing a running fleet — the equivalent of mission control.
  - **Done when:** Dashboard shows all 5 components with real-time updates via SSE. Agent status updates within 2 seconds of state change. Task board shows dependencies. Event stream is filterable. Resource meters update in real-time. Dashboard handles 20+ simultaneous agents without performance degradation.
  - **Files:** `control-plane/src/realtime-dashboard.ts` (new), `control-plane/public/fleet-dashboard.html` (new), `control-plane/src/sse-provider.ts` (new), `control-plane/src/sse-provider.test.ts` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** `aiStrat/admiral/extensions/inevitable-features.md` — Predictive Fleet Health (dashboard as decision surface)
  - **Depends on:** —

---

## Stream 28 Summary

| Subsection | Items | Total Size |
|---|---|---|
| 25.1 Agent Lifecycle Management | IF-01, IF-02 | 2L |
| 25.2 Extensibility | IF-03, IF-04 | 2L |
| 25.3 Performance and Cost Intelligence | IF-05, IF-06, IF-07 | 1M + 2L |
| 25.4 Debugging and Replay | IF-08 | 1L |
| 25.5 Governance Evolution | IF-09, IF-10 | 2L |
| 25.6 Multi-Agent Patterns | IF-11, IF-12 | 2L |
| **Totals** | **12 items** | **11L + 1M** |

**Critical path:** This stream is intentionally long-horizon. IF-01 (agent versioning) is the foundation for IF-02 (marketplace) and IF-04 (multi-repo). IF-05 (profiling) is the foundation for IF-06 (cost optimization) and IF-07 (A/B testing). Most items are independent and can be prioritized based on organizational need.

**Recommended execution order:**
1. **Foundation:** IF-01 (agent versioning), IF-05 (performance profiling), IF-08 (session replay) — independent, create data for later features.
2. **Extensibility:** IF-03 (plugin system), IF-04 (multi-repo, after IF-01) — framework architecture.
3. **Intelligence:** IF-06 (cost optimization, after IF-05), IF-07 (A/B testing, after IF-05) — data-driven optimization.
4. **Governance:** IF-09 (natural language policies), IF-10 (compliance certification) — governance maturity.
5. **Collaboration:** IF-11 (collaboration patterns), IF-12 (real-time dashboard) — fleet-scale operations.
6. **Marketplace:** IF-02 (marketplace, after IF-01) — ecosystem building, build last.

### 28.7 Competitive Urgency (from research/competitive-threat-strongdm-perplexity-comet-2026.md)

The three inevitable features are Admiral's defensible moat against point-solution convergence. Competitive timelines demand specific ship dates:

| Feature | Competitor Threat | Admiral Ship Target | Why |
|---|---|---|---|
| **Causality Tracing** | Perplexity Computer exposing subagent traces (est. 6–12 mo) | 90-day internal target | Designed for cross-platform scope |
| **Living Memory (Brain B2)** | Comet persistent user-AI interaction patterns (est. 12–18 mo) | 120-day internal target | Designed for compounding value across sessions/projects |
| **Predictive Health** | Leash trend analysis on enforcement data (est. 12–18 mo) | 180-day internal target | Requires 30+ days of trace/memory operational data |

**The compounding effect is the intended moat:** Each feature is designed to feed the next. Causality Tracing produces data for Living Memory. Living Memory produces patterns for Predictive Health. By 90 days of operation, the three features form a self-improving system competitors cannot replicate retroactively — they would need to also replicate the accumulated operational data.

**"Good enough" stack risk:** Enterprises may assemble StrongDM Leash (enforcement) + Perplexity Computer (orchestration) + Comet Enterprise (browser governance) as a point-solution stack. This stack covers enforcement, orchestration, and browser governance — but would miss persistent memory, graduated trust, behavioral governance, fleet coordination, and cross-platform scope. The inevitable features are designed to make Admiral categorically different from an assembled stack.

**Implication for this stream:** IF-05 (performance profiling), IF-08 (session replay), and IF-12 (real-time dashboard) are not Phase 8 luxuries — they are the building blocks for the three inevitable features. Consider promoting IF-05 and IF-08 to Phase 5–6 to feed causality tracing and predictive health data pipelines earlier.

---

**Alignment with Inevitable Features:** This stream's items create the building blocks for the three inevitable features identified in the extension document:
- **Causality Tracing** is enabled by IF-05 (profiling), IF-08 (replay), and IF-12 (real-time dashboard).
- **Living Operational Memory** is enabled by IF-01 (versioned agents), IF-04 (cross-repo knowledge), and IF-09 (natural language policies that compile to the memory layer).
- **Predictive Fleet Health** is enabled by IF-05 (performance data), IF-06 (cost modeling), IF-07 (comparative data from A/B tests), and IF-10 (certification that validates prediction accuracy).
