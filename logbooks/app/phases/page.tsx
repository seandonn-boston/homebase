import type { Metadata } from "next";
import NavLink from "@/components/NavLink";
import ShaLink from "@/components/ShaLink";

export const metadata: Metadata = {
  title: "Phase Impact",
};

export default function PhasesPage() {
  return (
    <article className="page-wider">
      <header className="frontispiece">
        <div className="eyebrow">The Helm Chronicle &middot; Companion</div>
        <h1>Phase Impact</h1>
        <p className="subtitle">
          Fifteen phases, equally weighed &mdash; what each one built, what each
          one changed, and why the codebase is different because of it.
        </p>
      </header>

      <p className="method">
        Each phase is presented with its PR merge stats (verified via{" "}
        <code>git show --stat</code>), key deliverables, and an impact
        statement. Phases are ordered chronologically, grouped into the three
        dependency tiers from the original ROADMAP.md. Line counts refer to
        insertions, not net change, unless marked otherwise.
      </p>

      {/* ═══════ TIER 1: Foundation ═══════ */}

      <div className="tier-break">
        <p>Tier One &mdash; Foundation</p>
        <p className="tier-sub">
          Strategy, quality infrastructure, and the self-enforcement pipeline
        </p>
      </div>

      {/* Phase 0 */}
      <section className="phase" id="phase-0" data-phase="0">
        <div className="phase-number">Phase 0</div>
        <h2>Strategy Before Code</h2>
        <div className="meta">
          <span className="stat">79 files</span>{" "}
          <span className="stat">+9,091</span>{" "}
          <span className="date">March 20&ndash;22</span> &middot;{" "}
          <a href="https://github.com/seandonn-boston/helm/pull/176">PR #176</a>{" "}
          &middot; <ShaLink sha="d292618" />
        </div>
        <p>
          The roadmap&rsquo;s gatekeeper. Phase 0 was designed so that nothing
          downstream could start until it passed. Ten validators shipped as
          executable bash scripts in <code>admiral/bin/</code> &mdash;{" "}
          <code>readiness_assess</code>, <code>go_no_go_gate</code>,{" "}
          <code>spec_first_gate</code>, <code>validate_boundaries</code>,{" "}
          <code>task_criteria</code>, and five more &mdash; each reading JSON
          ground-truth files and emitting structured pass/fail results. Thirteen
          spec-compliance test suites verified the validators against the actual
          specification. Twelve spec-debt amendment proposals (SD-01 through
          SD-15) addressed known gaps before any code was written.
        </p>
        <ul className="deliverables">
          <li><strong>Ground-truth schema</strong> &mdash; the single JSON structure (mission, boundaries, success criteria, deployment guards) that every subsequent validation hook reads from</li>
          <li><strong>10 executable validators</strong> in <code>admiral/bin/</code> with structured JSON output</li>
          <li><strong>13 spec-compliance test suites</strong> verifying validators against the specification</li>
          <li><strong>Reference constants file</strong> consolidating magic numbers into one source of truth</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> The ground-truth schema produced by Phase 0 is still the first file that <code>session_start_adapter.sh</code> loads on every session start. It was never refactored or replaced because it was designed before the code it governs. Most projects build first and validate later. This one refused to start building until it passed its own readiness check.</p>
      </section>

      {/* Phase 1 */}
      <section className="phase" id="phase-1" data-phase="1">
        <div className="phase-number">Phase 1</div>
        <h2>Codebase Quality &amp; Testing Foundation</h2>
        <div className="meta">
          <span className="stat">48 files</span>{" "}
          <span className="stat">+3,811</span>{" "}
          <span className="date">March 20&ndash;24</span> &middot;{" "}
          <a href="https://github.com/seandonn-boston/helm/pull/240">PR #240</a>{" "}
          &middot; <ShaLink sha="6d98648" />
        </div>
        <p>The testing infrastructure that every subsequent phase would build on. Shared Bash libraries arrived (<code>hook_utils.sh</code> at 212 lines, <code>jq_helpers.sh</code> at 161 lines, <code>schema_validate.sh</code> at 94 lines) alongside JSON schemas for hook payloads and session state. Benchmark harnesses for hook latency and Standing Order rendering. Four foundational test suites: injection detection (262 lines), concurrent state access (243 lines), session start adapter (236 lines), and Standing Orders (128 lines). On the TypeScript side, five test files for the control plane covering distributed tracing (321 lines), events (250 lines), ingest (225 lines), and instrumentation (180 lines).</p>
        <ul className="deliverables">
          <li><strong>ADMIRAL_STYLE.md</strong> (290 lines) &mdash; full coding style guide with naming conventions, exit code taxonomy, jq patterns</li>
          <li><strong>Shared Bash libraries</strong> &mdash; <code>hook_utils.sh</code>, <code>jq_helpers.sh</code>, <code>schema_validate.sh</code> providing common patterns for all hooks</li>
          <li><strong>JSON schemas</strong> for hook payloads and session state, enabling structural validation</li>
          <li><strong>Benchmark harnesses</strong> &mdash; <code>hook_latency.sh</code>, <code>so_render_bench.sh</code> establishing performance baselines</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Every hook written after Phase 1 sources <code>hook_utils.sh</code>. Every test written after Phase 1 follows the patterns established here. The style guide and schemas created a shared language between Bash and TypeScript that let the two halves of the codebase evolve in parallel without drifting apart. Infrastructure work is invisible when it works &mdash; and this infrastructure worked.</p>
      </section>

      {/* Phase 2 */}
      <section className="phase" id="phase-2" data-phase="2">
        <div className="phase-number">Phase 2</div>
        <h2>Architecture, CI/CD &amp; Self-Enforcement</h2>
        <div className="meta">
          <span className="stat">38 files</span>{" "}
          <span className="stat">+2,765</span>{" "}
          <span className="date">March 24</span> &middot;{" "}
          <a href="https://github.com/seandonn-boston/helm/pull/251">PR #251</a>{" "}
          &middot; <ShaLink sha="11b5bb8" />
        </div>
        <p>The project learned to police itself. Seven CLI tools shipped in <code>admiral/bin/</code>: <code>validate_plan</code> (135 lines), <code>detect_spec_drift</code> (120 lines), <code>quality_metrics</code> (128 lines), <code>validate_config</code> (114 lines), <code>detect_duplication</code> (90 lines), <code>benchmark_compare</code> (101 lines), and <code>check_dependencies</code> (144 lines). Five new GitHub Actions workflows automated changelogs, releases, stale branch cleanup, PR size checks, and a rule that bug-fix PRs must include tests. Versioned JSON schemas formalized the contract between hooks and the control plane. A <code>bridge.sh</code> library connected the Bash enforcement layer to the TypeScript runtime.</p>
        <ul className="deliverables">
          <li><strong>7 CLI enforcement tools</strong> &mdash; spec drift detection, plan validation, duplication scanning, dependency checking</li>
          <li><strong>5 CI/CD workflows</strong> &mdash; release automation, changelog generation, stale-branch cleanup, PR guardrails</li>
          <li><strong>Versioned schemas</strong> &mdash; <code>admiral-config.v1</code>, <code>event-types.registry</code>, <code>session-state.v1</code>, plus 3 hook-payload schemas</li>
          <li><strong>Architectural bridge</strong> &mdash; <code>bridge.sh</code>, <code>event_log.sh</code>, <code>session_lifecycle.sh</code> connecting Bash hooks to TypeScript</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Before Phase 2, the only way to know if the codebase had drifted from its specification was to read both and compare. After Phase 2, <code>detect_spec_drift</code> did it in seconds. The CI workflows ensured that quality gates ran on every pull request, not just when someone remembered to check. The project could now enforce its own standards without human intervention.</p>
      </section>

      {/* Phase 3 */}
      <section className="phase" id="phase-3" data-phase="3">
        <div className="phase-number">Phase 3</div>
        <h2>Core Spec Implementation</h2>
        <div className="meta">
          <span className="stat">60 files</span>{" "}
          <span className="stat">+7,200</span>{" "}
          <span className="date">March 25</span> &middot;{" "}
          <ShaLink sha="8dc3c7d" />
        </div>
        <p>The phase where the specification stopped being a description of what might exist and became a description of what does exist. Standing Orders became enforceable code: <code>so_enforcement.sh</code> with individual enforcement functions for all sixteen Standing Orders, <code>so_completeness_report</code> (SO-17), and <code>so_enforce_all</code>. A task router with four-stage capability scoring &mdash; task-type match, file-ownership match, capability match, trust-level filter &mdash; gave the fleet the ability to assign work to agents. Identity and tier validation hooks checked agent tokens on every tool call. Brain B1 gained consolidation, contradiction scanning, and demand signal extraction. Handoff and escalation protocols became an executable pipeline with context packaging and approval gates.</p>
        <ul className="deliverables">
          <li><strong>Standing Order enforcement</strong> &mdash; 16 individual functions plus completeness reporting and batch enforcement</li>
          <li><strong>Task router</strong> &mdash; 4-stage capability scoring for automated work assignment</li>
          <li><strong>Identity &amp; tier validation</strong> &mdash; hooks verifying agent tokens on every tool call</li>
          <li><strong>Brain B1 complete</strong> &mdash; <code>brain_consolidate</code>, <code>brain_contradiction_scan</code>, <code>brain_demand_signals</code></li>
          <li><strong>Handoff &amp; escalation pipeline</strong> &mdash; structured context packaging and approval gates</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> The gap between &ldquo;the spec says agents have identity tokens&rdquo; and &ldquo;the hook checks your token on every call&rdquo; closed here. Phase 3 is the commit where Helm&rsquo;s governance became real rather than aspirational. Everything the spec had promised for two months was now enforced at runtime.</p>
      </section>

      {/* ═══════ TIER 2: Capability ═══════ */}

      <div className="tier-break">
        <p>Tier Two &mdash; Capability</p>
        <p className="tier-sub">Fleet definition, orchestration, knowledge, and platform scale</p>
      </div>

      {/* Phase 4 */}
      <section className="phase" id="phase-4" data-phase="4">
        <div className="phase-number">Phase 4</div>
        <h2>Fleet Definition, Security &amp; Observability</h2>
        <div className="meta">
          <span className="stat">179 files</span>{" "}
          <span className="stat">+13,970</span>{" "}
          <span className="date">March 25&ndash;April 4</span> &middot;{" "}
          <a href="https://github.com/seandonn-boston/helm/pull/292">PR #292</a>{" "}
          &middot; <ShaLink sha="a99f1b9" />
        </div>
        <p>Delivered in four tiers over ten days, Phase 4 defined what the fleet <em>was</em> and how to watch it. Seventy-two agent definitions shipped as paired JSON and Markdown files: a machine-readable capability manifest alongside a human-readable role description for each agent. The <code>capability-registry.json</code> file &mdash; three thousand one hundred sixty-seven lines, the single largest file in the entire codebase &mdash; cross-references every agent against its tools, authorities, trust levels, and routing rules. A scaffold generator (<code>generate-agent.sh</code>, 177 lines) and a definition validator (<code>validate_agent_definitions.sh</code>, 226 lines) ensured the fleet taxonomy stayed consistent as it grew.</p>
        <p>The observability stack landed in the same phase: <code>alerting.ts</code> (208 lines), <code>metrics.ts</code> (253 lines), <code>slo-tracker.ts</code> (216 lines), <code>health.ts</code> (165 lines), <code>log-aggregator.ts</code> (166 lines), <code>tracing.ts</code> (144 lines), and <code>input-validation.ts</code> (117 lines). Security gained structured logging, injection detection (262 lines), input validation (159 lines), secret scanning, and an integrity auditor.</p>
        <ul className="deliverables">
          <li><strong>72 agent definitions</strong> &mdash; paired JSON + Markdown for each fleet role</li>
          <li><strong>capability-registry.json</strong> (3,167 lines) &mdash; the fleet&rsquo;s complete capability cross-reference</li>
          <li><strong>Full observability stack</strong> &mdash; alerting, metrics, SLO tracking, health checks, distributed tracing, log aggregation</li>
          <li><strong>Security layer</strong> &mdash; injection detection, input validation, secret scanning, integrity auditing</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Before Phase 4, the fleet was a concept described in prose. After Phase 4, the fleet was a typed data structure with seventy-two entries, each carrying machine-readable capabilities that the routing engine could query. The observability stack meant that when things went wrong, there was telemetry to explain why. You cannot govern what you cannot see.</p>
      </section>

      {/* Phase 5 */}
      <section className="phase" id="phase-5" data-phase="5">
        <div className="phase-number">Phase 5</div>
        <h2>Fleet Orchestration, MCP Server &amp; Autonomy</h2>
        <div className="meta">
          <span className="stat">117 files</span>{" "}
          <span className="stat">+23,118</span>{" "}
          <span className="date">March 25&ndash;April 4</span> &middot;{" "}
          <a href="https://github.com/seandonn-boston/helm/pull/294">PR #294</a>{" "}
          &middot; <ShaLink sha="e3d060e" />
        </div>
        <p>The largest phase by insertion count. Twenty-three thousand one hundred eighteen lines across one hundred seventeen files, delivered in four tiers. The MCP server gave the system an external interface: <code>server.ts</code>, <code>cli.ts</code>, <code>config.ts</code>, <code>protocol.ts</code>, <code>tool-registry.ts</code>, plus dedicated tool modules for brain operations (421 lines), fleet management (272 lines), governance queries (239 lines), and tool schemas (305 lines). Authentication via RBAC (90 lines) and token management (112 lines). Security hardening: behavior monitoring (231 lines), canary tokens (85 lines), hash verification, manifest guards (134 lines), and trust decay (101 lines).</p>
        <p>The routing engine spanned ten modules totaling two thousand five hundred fifty lines: <code>engine.ts</code> (322 lines) for core routing logic, <code>default-rules.ts</code> (647 lines) for rule definitions, <code>pipeline.ts</code> (284 lines) for multi-stage routing pipelines, <code>decomposition.ts</code> (232 lines) for task breakdown, <code>handoff.ts</code> (172 lines), <code>fleet-health.ts</code> (237 lines), and <code>scaling.ts</code> (200 lines). The trust and autonomy model: <code>trust-model.ts</code> (304 lines), <code>trust-scoring.ts</code> (415 lines), <code>trust-operations.ts</code> (491 lines) &mdash; a progressive delegation system where agents earned greater autonomy through demonstrated reliability. Seven governance modules totaling two thousand two hundred twenty-seven lines, including <code>governance-operations.ts</code> (542 lines) and <code>rule-engine.ts</code> (375 lines). Context intelligence: <code>context-intelligence.ts</code> (619 lines) for window optimization, <code>context-optimization.ts</code> (338 lines), <code>context-profile.ts</code> (295 lines). Five platform adapters: Claude Code, Cursor, VS Code, Windsurf, and a headless adapter (308 lines) for CI environments.</p>
        <ul className="deliverables">
          <li><strong>MCP server</strong> &mdash; complete Model Context Protocol implementation with RBAC, tool registry, and security hardening</li>
          <li><strong>Routing engine</strong> (10 modules, 2,550 lines) &mdash; multi-stage task routing with decomposition and fleet health awareness</li>
          <li><strong>Trust &amp; autonomy model</strong> &mdash; progressive delegation where agents earn autonomy through demonstrated reliability</li>
          <li><strong>Governance framework</strong> (7 modules, 2,227 lines) &mdash; rule engine, sentinel, compliance monitor, intervention, arbiter</li>
          <li><strong>Context intelligence</strong> (3 modules, 1,252 lines) &mdash; context window optimization and profiling</li>
          <li><strong>5 platform adapters</strong> &mdash; Claude Code, Cursor, VS Code, Windsurf, headless</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Phase 5 made Helm addressable from the outside. Before it, the system was a set of hooks that fired inside a single Claude Code session. After it, external tools could query governance state, route tasks, manage trust levels, and interact with the brain through a proper protocol server. The five platform adapters meant Helm was no longer coupled to a single IDE. The trust model introduced the concept that governance isn&rsquo;t just restriction &mdash; it&rsquo;s a ladder, where compliance is rewarded with greater autonomy.</p>
      </section>

      {/* Phase 6 */}
      <section className="phase" id="phase-6" data-phase="6">
        <div className="phase-number">Phase 6</div>
        <h2>Knowledge, Context &amp; Intent</h2>
        <div className="meta">
          <span className="stat">31 files</span>{" "}
          <span className="stat">+7,448</span>{" "}
          <span className="date">March 26</span> &middot;{" "}
          <ShaLink sha="7ca3da8" />
        </div>
        <p>Brain B1 was a flat-file JSON store with keyword grep. Phase 6 replaced it with B2: a SQLite database with FTS5 full-text search, enabling the knowledge system to answer questions it hadn&rsquo;t been given explicit keywords for. Intent engineering arrived in the same commit &mdash; <code>intent-capture.ts</code>, <code>intent-decomposition.ts</code>, <code>intent-validation.ts</code>, <code>intent-routing.ts</code> &mdash; a pipeline that took vague user requests, decomposed them into concrete tasks, validated each against the strategy triangle, and routed them to the appropriate fleet agents. Three knowledge maintenance agents shipped: the <strong>Gardener</strong> (prunes stale entries), the <strong>Curator</strong> (resolves contradictions), and the <strong>Harvester</strong> (extracts implicit knowledge from session logs). A PII detector covering email, SSN, credit card, API key, and JWT patterns was added to the security layer.</p>
        <ul className="deliverables">
          <li><strong>Brain B2</strong> &mdash; SQLite with FTS5 full-text search, replacing flat-file keyword grep</li>
          <li><strong>Intent engineering pipeline</strong> &mdash; capture, decomposition, validation, routing for ambiguous requests</li>
          <li><strong>3 knowledge maintenance agents</strong> &mdash; Gardener (pruning), Curator (contradiction resolution), Harvester (implicit knowledge extraction)</li>
          <li><strong>PII detection</strong> &mdash; email, SSN, credit card, API key, and JWT pattern matching</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> The jump from keyword grep to FTS5 search is the jump from &ldquo;do you have an entry called X&rdquo; to &ldquo;what do you know about X.&rdquo; The maintenance agents meant the brain wouldn&rsquo;t just accumulate &mdash; it would self-curate, pruning stale knowledge and resolving contradictions without human intervention. And intent engineering meant the system could do something productive with ambiguity instead of rejecting it.</p>
      </section>

      {/* Phase 7 */}
      <section className="phase" id="phase-7" data-phase="7">
        <div className="phase-number">Phase 7</div>
        <h2>Platform Scale &amp; Governance</h2>
        <div className="meta">
          <span className="stat">72 files</span>{" "}
          <span className="stat">+22,948</span>{" "}
          <span className="date">March 26</span> &middot;{" "}
          <ShaLink sha="7d3d103" />
        </div>
        <p>The single largest non-merge commit in the repository&rsquo;s history. Three entire subsystems landed at once. A Quality Assurance pipeline of ten bash scripts &mdash; <code>code_review.sh</code>, <code>test_generator.sh</code>, <code>pipeline.sh</code>, <code>metrics_collector.sh</code>, <code>trend_analyzer.sh</code>, <code>debt_tracker.sh</code>, <code>complexity_budget.sh</code>, <code>review_checklist.sh</code>, <code>quality_scorer.sh</code>, <code>regression_gate.sh</code> &mdash; covering the full lifecycle from review through trend analysis to regression prevention. A Rating System anchored by <code>rating-model.ts</code> at one thousand one hundred ninety-one lines (the single largest non-test TypeScript file in the repo), with <code>calculate-rating.ts</code> (725 lines), badge generator, history tracker, improvement recommender, benchmark comparisons, module-level ratings, dashboard, and alert system. A Governance Platform REST API: <code>governance-api.ts</code> (580 lines) with full CRUD, event streaming, configuration management, SDK client, and webhook dispatcher with rate limiting.</p>
        <ul className="deliverables">
          <li><strong>QA pipeline</strong> (10 bash scripts) &mdash; automated code review, test generation, quality scoring, regression gating</li>
          <li><strong>Rating System</strong> &mdash; <code>rating-model.ts</code> (1,191 lines), multi-dimensional scoring with history, benchmarks, and recommendations</li>
          <li><strong>Governance REST API</strong> &mdash; <code>governance-api.ts</code> (580 lines) with CRUD, events, webhooks, SDK client</li>
          <li><strong>capability-registry.json</strong> (3,167 lines) &mdash; cross-reference of all 71 agents and their routing rules</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Phase 7 turned Helm from a governed agent system into a governed agent <em>platform</em>. Before it, quality was a set of hooks that said &ldquo;no.&rdquo; After it, quality was a system that measured, scored, trended, and recommended. The REST API meant external tools could query and manage fleet policies without touching the codebase. The rating system gave governance a dashboard &mdash; not just enforcement, but visibility into how well the fleet was performing.</p>
      </section>

      {/* Phase 8 */}
      <section className="phase" id="phase-8" data-phase="8">
        <div className="phase-number">Phase 8</div>
        <h2>Excellence, Validation &amp; Thesis</h2>
        <div className="meta">
          <span className="stat">39 files</span>{" "}
          <span className="stat">+5,955</span>{" "}
          <span className="date">March 27&ndash;April 4</span> &middot;{" "}
          <a href="https://github.com/seandonn-boston/helm/pull/305">PR #305</a>{" "}
          &middot; <ShaLink sha="ea09d8e" />
        </div>
        <p>Phase 8 asked a question none of the previous phases had: <em>does governance actually work?</em> The thesis validation apparatus shipped eight TypeScript modules: <code>metrics-definition.ts</code> (514 lines) defining quantitative measurements for governance overhead, error reduction, and velocity impact; <code>ab-framework.ts</code> (400 lines) for controlled experiments comparing governed-vs-ungoverned agent performance; <code>roi-model.ts</code> (192 lines), <code>overhead-measurement.ts</code> (155 lines), <code>quality-tracking.ts</code> (146 lines), <code>case-studies.ts</code> (143 lines), <code>survey-framework.ts</code> (116 lines), and <code>false-positive-tracker.ts</code> (94 lines). Nine exemplary codebase modules demonstrated intended usage patterns: chaos testing (129 lines), sentinel agents (122 lines), session simulation (120 lines), hook profiling (119 lines), and build verification (189 lines). Eight future-proofing fleet features included prediction models (228 lines), agent versioning (189 lines), collaboration patterns (171 lines), a cost optimizer (157 lines), agent replay (141 lines), a plugin system (128 lines), multi-repo support (119 lines), and performance profiling (100 lines).</p>
        <ul className="deliverables">
          <li><strong>Thesis validation</strong> (8 modules, 1,760 lines) &mdash; metrics definitions, A/B framework, ROI model, overhead measurement</li>
          <li><strong>Exemplary codebase</strong> (9 modules, 1,197 lines) &mdash; chaos testing, sentinel agents, session simulation, hook profiling</li>
          <li><strong>Future-proofing</strong> (8 modules, 1,233 lines) &mdash; prediction models, agent versioning, plugin system, cost optimization</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> The thesis modules turned &ldquo;governance improves outcomes&rdquo; from an assertion into a testable hypothesis. The A/B framework could run governed-vs-ungoverned experiments. The metrics definitions established what &ldquo;better&rdquo; means in measurable terms. The exemplary modules provided working demonstrations rather than documentation &mdash; if you wanted to know how to use chaos testing, you could read the code that does it. Phase 8 completed the original nine-phase plan.</p>
      </section>

      {/* ═══════ TIER 3: Gap Closure ═══════ */}

      <div className="tier-break">
        <p>Tier Three &mdash; Gap Closure</p>
        <p className="tier-sub">The six phases that didn&rsquo;t exist when the roadmap was born</p>
      </div>

      {/* Phase 9 */}
      <section className="phase" id="phase-9" data-phase="9">
        <div className="phase-number">Phase 9</div>
        <h2>Quality Rigor &amp; Documentation</h2>
        <div className="meta">
          <span className="stat">115 files</span>{" "}
          <span className="stat">+11,784</span>{" "}
          <span className="date">March 27&ndash;28</span> &middot;{" "}
          <a href="https://github.com/seandonn-boston/helm/pull/306">PR #306</a>{" "}
          &middot; <ShaLink sha="ef2fdc6" />
        </div>
        <p>The first phase invented during execution. Phase 9 addressed a gap the original plan had not anticipated: the codebase was growing faster than anyone could learn it. Nine documentation files shipped: an Operational Runbook (620 lines), Hook Troubleshooting guide (391 lines), Security Model reference (378 lines), Hook Development Guide (366 lines), Quick Start (227 lines), Brain User Guide (169 lines), Glossary (122 lines), FAQ (110 lines), and API Versioning guide (106 lines). Five Architecture Decision Records (ADRs 005&ndash;009) documented the reasoning behind hook payload schemas, event ID generation, Standing Order enforcement tiers, fleet orchestration approach, and brain graduation criteria.</p>
        <p>The Evidence-Driven Development (EDD) gate system introduced a new enforcement paradigm: <code>edd_gate</code> (257 lines), <code>edd_spec.sh</code> (198 lines), and <code>edd_confirm.sh</code> (143 lines) required that plan items carry evidence of completion, not just a checkbox. Nine hook snapshot files enabled regression testing against known-good output. Property-based testing arrived via <code>ring-buffer.property.test.ts</code> (207 lines). Mutation testing configuration via Stryker. Orchestration patterns: broadcast (71 lines), consensus (109 lines), pipeline (72 lines). Session recording and replay for debugging agent behavior across sessions.</p>
        <ul className="deliverables">
          <li><strong>9 documentation files</strong> (2,389 lines) &mdash; runbook, troubleshooting, security model, quick start, brain guide, glossary, FAQ</li>
          <li><strong>5 Architecture Decision Records</strong> (ADRs 005&ndash;009) &mdash; documenting why, not just what</li>
          <li><strong>EDD gate system</strong> &mdash; evidence-driven completion requirements for plan items</li>
          <li><strong>Hook snapshot regression testing</strong> &mdash; 9 snapshots as known-good baselines</li>
          <li><strong>Property-based &amp; mutation testing</strong> &mdash; Stryker config, ring-buffer property tests</li>
          <li><strong>Session recorder/replayer</strong> &mdash; debugging agent behavior across sessions</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Phase 9 is the phase that made Helm learnable. Before it, understanding the system required reading the code or having been present for the build. After it, a new contributor could start from the Quick Start, progress through the Hook Development Guide, debug with the Troubleshooting guide, and understand architectural decisions through the ADRs. The EDD gate changed the definition of &ldquo;done&rdquo; from &ldquo;I checked the box&rdquo; to &ldquo;here is the evidence.&rdquo;</p>
      </section>

      {/* Phase 10 */}
      <section className="phase" id="phase-10" data-phase="10">
        <div className="phase-number">Phase 10</div>
        <h2>Security Hardening &amp; Brain B3</h2>
        <div className="meta">
          <span className="stat">52 files</span>{" "}
          <span className="stat">+9,330</span>{" "}
          <span className="date">March 28&ndash;30</span> &middot;{" "}
          <a href="https://github.com/seandonn-boston/helm/pull/345">PR #345</a>{" "}
          &middot; <ShaLink sha="dbb022c" />
        </div>
        <p>Two streams converged. The security hardening track delivered eleven task commits: a dependency vulnerability scanner (<code>audit_dependencies.sh</code>), an SBOM generator (<code>generate_sbom.sh</code>, 185 lines), a control-plane rate limiter (167 lines), injection Layer 2 structural validation, a privilege escalation enforcer (280 lines), a security regression test suite (354 lines), agent-to-agent communication inspection (307 lines), cascade containment with circuit breakers (337 lines), data classification tags with cross-server flow control (235 lines), and three Cedar policy examples for the Leash integration spec (182 lines). An Incident Response playbook (449 lines) defined five response phases across four critical scenarios.</p>
        <p>The Brain B3 track graduated the knowledge system a second time. <code>postgres-schema.ts</code> (355 lines) introduced five versioned Postgres/pgvector migrations with rollback support and connection pooling. <code>embedding-pipeline.ts</code> (278 lines) generated vector embeddings for brain entries. <code>similarity-search.ts</code> (207 lines) enabled blended-signal retrieval. <code>identity-tokens.ts</code> (227 lines) and <code>access-control.ts</code> (198 lines) restricted who could read and write brain knowledge. <code>sensitivity-classification.ts</code> (210 lines) tagged entries by sensitivity level. <code>audit-logging.ts</code> (199 lines) recorded every brain access. <code>self-instrumentation.ts</code> (642 lines &mdash; the largest file in the phase) let the brain monitor its own health. <code>cross-project-sharing.ts</code> (226 lines) enabled project-aware knowledge sharing with permissions and provenance.</p>
        <ul className="deliverables">
          <li><strong>Security regression suite</strong> (354 lines) &mdash; automated security testing framework</li>
          <li><strong>Cascade containment</strong> (337 lines) &mdash; circuit breakers for multi-agent failure scenarios</li>
          <li><strong>A2A inspection</strong> (307 lines) &mdash; agent-to-agent communication content inspection</li>
          <li><strong>Brain B3</strong> &mdash; Postgres/pgvector schema, embedding pipeline, similarity search, access control</li>
          <li><strong>Brain self-instrumentation</strong> (642 lines) &mdash; the brain monitoring its own health and performance</li>
          <li><strong>Incident Response playbook</strong> (449 lines) &mdash; 5 phases, 4 scenarios</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Security graduated from detection to containment. Before Phase 10, the system could identify threats (injection patterns, prompt manipulation). After Phase 10, it could contain them (cascade circuit breakers, blast-radius limiting, A2A inspection). The brain graduated from understanding to reasoning &mdash; B2 could search; B3 could search by meaning, control who accesses what, classify sensitivity, share across projects, and monitor its own health. The Cedar policy examples laid groundwork for formal, auditable governance policies.</p>
      </section>

      {/* Phase 11 */}
      <section className="phase" id="phase-11" data-phase="11">
        <div className="phase-number">Phase 11</div>
        <h2>Agent Execution Runtime</h2>
        <div className="meta">
          <span className="stat">~30 files</span>{" "}
          <span className="stat">+2,400</span>{" "}
          <span className="date">April 4</span> &middot;{" "}
          <ShaLink sha="25e20b8" />
        </div>
        <p>Built in sixty-four minutes on a Friday morning. Phase 11 existed because the team had noticed, during Phase 10, that the enforcement hooks and the brain could process and store &mdash; but nothing could <em>execute</em>. The spec described agents handing off tasks, but no code existed to schedule, persist, or supervise those handoffs.</p>
        <p>Sixteen feature commits between 10:03 and 11:07 EDT. An agent execution runtime session spawner (<ShaLink sha="e8afde4" />). A priority task queue with disk persistence (<ShaLink sha="f4e9a36" />). An execution limits enforcer with retry and escalation (<ShaLink sha="4657712" />). Execution state persistence with crash recovery (<ShaLink sha="58f00a3" />). A result aggregator for session, agent, and fleet metrics (<ShaLink sha="ccd81a3" />). A task decomposition DAG builder with cycle detection and validation (<ShaLink sha="ea7ad0f" />). Hook-to-B2 access patterns and query helpers. Brain B2 async write queue with replay and fallback behavior. Transactional safety tests and latency benchmarks. Four end-to-end multi-agent orchestration tests. One hundred thirty-three new tests total.</p>
        <ul className="deliverables">
          <li><strong>Session spawner</strong> &mdash; agent lifecycle management with startup, execution, and teardown</li>
          <li><strong>Priority task queue</strong> &mdash; disk-persisted, survives process crashes</li>
          <li><strong>Execution limits enforcer</strong> &mdash; retry logic with escalation to human when limits are hit</li>
          <li><strong>State persistence &amp; crash recovery</strong> &mdash; checkpoint and restore for in-flight work</li>
          <li><strong>DAG builder</strong> &mdash; task decomposition with cycle detection and dependency validation</li>
          <li><strong>Hook-to-B2 integration</strong> &mdash; async write queue with replay, fallback, and transactional safety</li>
          <li><strong>133 new tests</strong> including 4 end-to-end multi-agent orchestration tests</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Phase 11 filled the gap between governance and execution. Hooks could enforce rules. The brain could store knowledge. The routing engine could decide where work should go. But until Phase 11, nothing could actually <em>run</em> the work, persist its state across crashes, or aggregate its results. The task queue and DAG builder gave the fleet the ability to decompose, schedule, and supervise multi-step agent workflows &mdash; the operational core that all the governance infrastructure was designed to protect.</p>
      </section>

      {/* Phase 12 */}
      <section className="phase" id="phase-12" data-phase="12">
        <div className="phase-number">Phase 12</div>
        <h2>Developer Experience &amp; Monitoring</h2>
        <div className="meta">
          <span className="stat">74 files</span>{" "}
          <span className="stat">+4,538</span>{" "}
          <span className="date">April 8</span> &middot;{" "}
          <ShaLink sha="d3eb96f" />
        </div>
        <p>Built in forty-four minutes on an April Tuesday evening. Phase 12 was the admission that a system can be technically complete and still unusable. The DX subsystem shipped fourteen items in thirty minutes flat: <code>setup.sh</code> (222 lines) checking bash 4+, node 22+, npm, jq, git, optional shellcheck and sqlite3, then installing dependencies, building TypeScript, running tests, and validating directory structure. A companion <code>Makefile</code> (85 lines) with targets for setup, build, test, lint, ci, dev, and clean. A VS Code dev container with preconfigured extensions. IDE templates via <code>make ide</code>. Hot reload via <code>node --watch</code>. A hook development CLI (<code>admiral/bin/hook</code>, 217 lines) with four subcommands: scaffold (generates from template), validate (checks shebang, strict mode, hook_utils sourcing, ShellCheck), list (shows all hooks with type and status), and test (runs against a sample PreToolUse payload). A local CI runner. Changelog automation. A pre-flight checklist with five profiles and thirty-plus checks. Six development walkthroughs (adding a hook, adding an API endpoint, adding a Standing Order, adding a brain entry type, modifying the quarantine pipeline, adding an attack corpus entry). A debugging guide with decision trees. An error audit, API examples, and fifteen good-first-issues. An agent session simulator with three built-in scenarios that fire real hooks without needing an LLM API call.</p>
        <p>The monitoring subsystem shipped ten items in nine minutes: a scanner with five scan types, atomic state persistence, daily digests, custom scan rules (as JSON), scan history with ninety-day JSONL retention, weekly trend analysis, alert thresholds, and a handoff validator.</p>
        <ul className="deliverables">
          <li><strong>One-command setup</strong> &mdash; <code>setup.sh</code> + <code>Makefile</code> covering the full build-test-lint-dev cycle</li>
          <li><strong>Hook development CLI</strong> (217 lines) &mdash; scaffold, validate, list, test</li>
          <li><strong>6 development walkthroughs</strong> &mdash; step-by-step guides for common contribution tasks</li>
          <li><strong>Agent session simulator</strong> (170 lines) &mdash; 3 scenarios, real hooks, no API calls</li>
          <li><strong>Monitoring suite</strong> (10 items) &mdash; scanner, digests, trends, alerts, custom rules</li>
          <li><strong>15 good-first-issues</strong> &mdash; curated entry points for new contributors</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Phase 12 turned a codebase into a project. Before it, building Helm required knowing which dependencies to install, which build targets existed, and which TypeScript packages needed compilation in what order. After it, <code>bash setup.sh</code> handled everything. The hook CLI meant a contributor could scaffold, validate, and test a new hook without reading the internals. The session simulator meant you could exercise the governance system end-to-end without an Anthropic API key. The fifteen good-first-issues meant someone who had never seen the repo before had fifteen curated starting points.</p>
      </section>

      {/* Phase 13 */}
      <section className="phase" id="phase-13" data-phase="13">
        <div className="phase-number">Phase 13</div>
        <h2>Strategic Positioning &amp; Completion</h2>
        <div className="meta">
          <span className="stat">26 files</span>{" "}
          <span className="stat">+1,490</span>{" "}
          <span className="date">April 8</span> &middot;{" "}
          <ShaLink sha="4c5b640" />
        </div>
        <p>Built in thirty-three minutes. Phase 13 asked: where does Helm sit in a world of existing governance frameworks? Eight compliance crosswalk documents mapped Helm&rsquo;s governance model against external standards: NIST Zero Trust (121 lines, covering all seven tenets plus SPIFFE identity mapping), McKinsey&rsquo;s Five Pillars of agentic organizations (75 lines), EU AI Act risk classification (70 lines with gap analysis), ISO 42001 AI Management System (34 lines covering all eight control areas), and Singapore IMDA (33 lines). A twelve-dimension competitive matrix evaluated Helm against seven competitors. An enterprise playbook (125 lines) defined five adoption stages and scripted responses to ten common objections.</p>
        <p>Runnable tooling arrived alongside the positioning documents: a pentest runner (81 lines) that exercises the attack corpus against live hooks, a load test module (106 lines TypeScript) with configurable concurrency, a complexity analyzer (69 lines bash), and a WCAG 2.1 AA accessibility audit. Two TypeScript modules &mdash; <code>multi-tenant.ts</code> (71 lines) for tenant isolation with global policy inheritance, and <code>policy-dsl.ts</code> (128 lines) for threshold, pattern, and temporal rules with AND/OR/NOT composition. Design documents for an agent marketplace, real-time governance dashboard, NLP policy authoring, compliance certification scheme, A/B testing for agents, and an academic paper outline in conference format.</p>
        <ul className="deliverables">
          <li><strong>5 compliance crosswalks</strong> &mdash; NIST ZT, McKinsey, EU AI Act, ISO 42001, Singapore IMDA</li>
          <li><strong>Competitive analysis</strong> &mdash; 12-dimension matrix against 7 competitors, enterprise playbook</li>
          <li><strong>Security &amp; quality tooling</strong> &mdash; pentest runner, load tester, complexity analyzer, a11y audit</li>
          <li><strong>Policy DSL</strong> (128 lines) &mdash; declarative governance rule composition</li>
          <li><strong>Multi-tenant isolation</strong> (71 lines) &mdash; tenant-scoped policies with global inheritance</li>
          <li><strong>6 design documents</strong> &mdash; marketplace, dashboard, NLP authoring, certification, A/B testing, academic paper</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Phase 13 is the phase that made Helm legible to people who hadn&rsquo;t built it. A CISO evaluating governance frameworks can find the NIST Zero Trust crosswalk. An enterprise architect can read the competitive matrix. A sales engineer can use the objection playbook. The policy DSL demonstrated that governance rules don&rsquo;t have to be hardcoded in bash &mdash; they could eventually be authored in a declarative language. The design documents planted flags for future work without pretending the work was done.</p>
      </section>

      {/* Phase 14 */}
      <section className="phase" id="phase-14" data-phase="14">
        <div className="phase-number">Phase 14</div>
        <h2>Codebase Cleanup &amp; Refactoring</h2>
        <div className="meta">
          <span className="stat">~20 files</span>{" "}
          <span className="stat">net &minus;356</span>{" "}
          <span className="date">April 8</span> &middot;{" "}
          <ShaLink sha="b6e9a71" /> &middot; cleanup:{" "}
          <ShaLink sha="18279c9" />
        </div>
        <p>The final phase opened at 7:35 PM and was declared complete at 7:41 PM &mdash; six minutes of shellcheck suppression removal and a victory lap. Then, two hours and forty-one minutes later, the real work started.</p>
        <p>At 10:22 PM, <ShaLink sha="60c6b0a" /> fixed CI failures: removed unused variables, adjusted shellcheck severity, ran Biome formatting across one hundred five files. At 10:37 PM, <ShaLink sha="e7d42b0" /> found <strong>three real bugs</strong>. First: <code>brain_retriever.sh</code> had a pipe subshell bug &mdash; <code>while read</code> inside a pipe lost variable modifications, a classic bash gotcha fixed by capturing <code>jq</code> output to a variable instead. Second: <code>loop_detector.sh</code> was missing a <code>source</code> of <code>hook_config.sh</code>, causing command-not-found errors in subprocess contexts. Third: <code>parallel_coordinator.sh</code> had a dead first <code>jq</code> invocation using an incorrect <code>input</code> function &mdash; duplicate code where only the second implementation worked. At 10:41 PM, <ShaLink sha="a49a700" /> removed three hundred four lines of dead code, including two orphaned TypeScript modules (<code>agent-lifecycle.ts</code> and <code>tier-tracking.ts</code>, two hundred forty-two lines combined) that had been created <em>that same evening</em> during Phase 12 and were imported by nothing. Fixed an <code>any</code> type. Fixed a <code>forcePoushes</code> typo. Fixed <code>cd</code> without subshell modifying the caller&rsquo;s working directory. Fixed <code>getEffectivePolicies</code> ignoring its <code>tenantId</code> parameter. At 10:43 PM, <ShaLink sha="18279c9" /> extracted a shared <code>globMatch()</code> function from <code>engine.ts</code> (removing a thirty-line duplicate in <code>conflict-resolution.ts</code>) and sourced shared <code>SECRET_PATTERNS</code> via <code>hook_config.sh</code> instead of inline copies. Fifty-two lines deduplicated.</p>
        <ul className="deliverables">
          <li><strong>3 real bugs fixed</strong> &mdash; pipe subshell variable loss, missing source, dead jq invocation</li>
          <li><strong>304 lines of dead code removed</strong> &mdash; including 242 lines created that same evening</li>
          <li><strong>Deduplication</strong> &mdash; shared <code>globMatch()</code>, shared <code>SECRET_PATTERNS</code> via <code>hook_config.sh</code></li>
          <li><strong>Type safety</strong> &mdash; <code>any</code> &rarr; <code>{"Record<string, unknown>"}</code>, typo fixes, parameter fixes</li>
          <li><strong>CI alignment</strong> &mdash; Biome formatting across 105 files, shellcheck severity adjustment</li>
        </ul>
        <p className="impact"><strong>Impact:</strong> Phase 14 is proof that the cleanup phase is never ceremony. The premature &ldquo;ALL PHASES DONE&rdquo; at 7:41 PM was followed by three hours of actual work that found genuine bugs the build-at-speed sprint had introduced. The pipe subshell bug in <code>brain_retriever.sh</code> would have caused silent data loss in production. The orphaned modules created during Phase 12 were dead code within four hours of being written. Phase 14&rsquo;s net contribution is negative three hundred fifty-six lines &mdash; the only phase that made the codebase smaller &mdash; and that is its value.</p>
      </section>

      <footer className="end-border">
        <div className="nav-links">
          <NavLink href="/chronicle">&larr; The Chronicle</NavLink>
          <NavLink href="/graph">Commit Graph &rarr;</NavLink>
        </div>
        <div className="colophon">15 phases &middot; 20 days &middot; 1,206 files &middot; 9 April 2026</div>
      </footer>
    </article>
  );
}
