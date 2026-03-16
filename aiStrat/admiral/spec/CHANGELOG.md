# Version History

**v0.10.0-alpha (March 2026)**

- **Version consolidation.** Adopted `vMAJOR.MINOR.PATCH-stage.dateInMS` format. Single source of truth in `aiStrat/VERSION`; CI propagates to 4 display locations. Removed version strings from all non-CI-managed files.
- **Phase 1 complete.** Specification integrity hardening: version consistency, enforcement language refinement (Part 3 enforcement vs. monitoring distinction), standing orders classified by mechanism, empirical claims qualified, research-to-spec pipeline formalized.
- **Phase 2 complete.** Fortune 500 adoption simulation: 100 companies scored across 7 scenarios using FY2025 10-K data, sector analysis, prospect rankings, walk-away analysis, trend monitoring pipeline.
- **CI root-cause fix.** Version-bump workflow used line-number targeting (brittle); replaced with pattern-based sed matching.

**v0.9.0-alpha (March 2026)**

- **Specification hardening.** Resolved SD-01 (hook enforcement 4/15 → 8/15), SD-03 (fleet maturity language), SD-04 (Monitor quarantine Layers 3–5). Added hook test suite (34/34 passing).
- **Adoption simulation expansion.** Scaled from 50 to 100 companies with trend monitoring pipeline (`monitor.sh`, `snapshot.sh`, `diff.sh`).

**v0.8.0-alpha (March 2026)**

- **Event-driven Brain operations.** Added SPC-based anomaly detection for Brain health metrics with recursion prevention.
- **Control plane MVP.** SPC integration (Shewhart control charts + Western Electric rules), runaway detector, execution trace, HTTP dashboard server. 24 passing tests.
- **Möbius Loop.** Named the Brain's continuous feedback mechanism linking execution outcomes back to institutional memory.
- **Codebase review fixes.** Resolved version inconsistencies, narrative contradictions, and spec-debt items.

**v0.7.0-alpha (March 2026)**

- **Brain consultation integration.** Wired Brain query into all decision-making documentation. Context source routing logic (long context vs. RAG vs. escalate).
- **Hook infrastructure hardening.** Eliminated all deadlock vectors. Converted token budget gate from hard block to advisory checkpoint. Session Thermal Model for advisory budget dashboards.
- **Patent analysis.** Expanded from 7 to 23 distinct patent opportunities across the Admiral Framework.
- **QUICKSTART gap closure.** Updated bootstrap path, added end-to-end session log.

**v0.6.0-alpha (March 2026)**

- **Phase 4 completion.** Closed remaining implementation gaps from Phase 4.4. Updated QUICKSTART.md and planning documents.

**v0.5.3-alpha (March 2026)**

- **Resolved all 14 spec-gaps.** Concrete thresholds added to source spec files and mirrored in `reference-constants.md § Spec-Gap Resolved Thresholds`. See `reference/spec-gaps.md` for the gap inventory and resolutions.
- **Unified Trust Model.** Single canonical trust definition added to Part 3 (Enforcement) with per-agent, per-category scores, concrete promotion (5 consecutive successes) and demotion (any failure) thresholds. Parts 8 and 10 defer to this model.
- **Failure Chains.** Added cascading failure analysis to Part 7 (Quality) — three chains showing how single failures compound (Context Starvation → Hallucination → Sycophantic Drift → Governance Theater, and two others).
- **Protocol Coordination.** Added priority ordering, decision tree, composition rules, and boundary examples to Part 11 (Protocols) for when Emergency Halt, Human Referral, Escalation, and Handoff protocols fire simultaneously.
- **Claim qualification.** All uncited empirical claims across the spec qualified with "in our experience" or given citations. Affected Parts 2, 4, 6, 8, 9.
- **QUICKSTART.md created.** Bootstrap path for new adopters: zero to one governed agent in under 2 hours. Referenced from index.md and appendices.md.
- **Broken link fixes.** Corrected `../fleet/` and `../../research/` relative paths from spec files.

**v0.5.2-alpha (March 2026)**

- **Version bump for spec-gap resolution prep.** Structural cleanup and reference-constants consolidation.

**v0.5.1-alpha (March 2026)**

- **Minor corrections and version alignment.**

**v0.5.0-alpha (March 2026)**

- **12-part specification.** Added Part 12 (The Data Ecosystem) covering the enrichment pipeline, analytics layer, and data-driven improvement loops.
- **Progressive adoption model.** Seven independently-scaling components (Brain, Fleet, Enforcement, Control Plane, Security, Protocols, Data Ecosystem) with 5 profiles (Starter through Enterprise).
- **Reference constants registry.** Created `reference/reference-constants.md` consolidating all numeric thresholds from across the spec.

**v0.4.0-alpha (March 2026)**

- **Removed dual numbering system.** Eliminated the parallel numbering scheme (Parts + global Sections 01-48) across the entire specification. All cross-references now use descriptive names with Part identifiers (e.g., "Deterministic Enforcement (Part 3)" instead of "Section 08"). Approximately 344 section references rewritten across ~40 files.
- **Elevated Fleet Control Plane as a core concept.** The Control Plane is now defined progressively across all five profiles: Starter (CLI Dashboard), Team (Fleet Dashboard), Governed (Governance Dashboard), Production (Operations Dashboard), Enterprise (Federation Dashboard). Control Plane surface notes added to all 12 Part files. Rewrote `extensions/fleet-control-plane.md` with progressive profile structure.
- **Consolidated research directories.** Moved 8 research files from `aiStrat/research/` to root `research/` directory. Research files are no longer spec artifacts and do not carry version headers.
- **Fixed CI/CD workflow.** Dynamic version extraction from `index.md`, YAML validation dependency fix, broken link validation now fails on errors.
- **Updated `.gitignore`.** Added standard exclusions for dependencies, build output, IDE files, and OS artifacts.
- **MANIFEST rewrite.** Updated file inventory, removed stale entries, added missing files.
- **Control plane TypeScript reference.** Updated reference implementation with XSS fixes, proper URL parsing, JSON-lines output mode, and event retention limits.

**v0.3.1-alpha (March 2026)**

- **Organizational thesis added.** Created `admiral/extensions/thesis.md` articulating the core proposition that AI agents are permanent operational infrastructure, not transient tools.
- **Future operations analysis added.** Created `research/future-operations.md` mapping the transition from current state to full Admiral deployment.
- **Version header consistency.** Applied `v0.3.1-alpha` headers to all spec files within `aiStrat/` that were missed during the v0.3.0 → v0.3.1 bump. CI version check now matches the actual framework version.

**v0.3.0-alpha (March 2026)**

- **Brain restructured to 5 levels (B1-B3, DE4-DE5).** Brain is fully complete at B3 (Postgres + pgvector + MCP + identity tokens + zero-trust). DE4-DE5 add fleet-level and enterprise capabilities without modifying the Brain. Created `brain/level3-spec.md`.
- **5 Quick-Start Profiles.** Added Enterprise profile for multi-fleet coordination and cross-org federation. Pre-Flight Checklist and Quick-Start Sequence updated.
- **Infrastructure fixes.** Recreated CODEOWNERS with correct paths. Stubbed `ai-monitor.yml` (removed non-existent Python references). Cleaned `.gitignore` and `settings.local.json` of Python vestiges. Deleted empty `hooks.json`.
- **Deprecated reference cleanup.** Removed references to deleted reference implementation files (`admiral/protocols/`, `admiral/hooks/`). Rewrote implementation lessons to be implementation-agnostic.
- **Content corrections.** Fixed governance self-monitoring contradiction. Fixed domain.md duplicate output routing. Added `purge_regulation` to test_schema.sql. Fixed ATTACK_CORPUS category references (→ `failure` with metadata tag). Reconciled reading path between index.md and MANIFEST.md.
- **New specifications.** Monitor scanner spec, state schema, digest format. Framework benchmarks (7 core metrics). 4 spec-repo hook manifests. CI spec-validation workflow.
- **Fleet transparency.** Added notes to fleet README, specialists.md, generalists.md, and AGENTS.md acknowledging agent definitions are well-researched specifications, not battle-tested implementations.
- **Structural moves.** Relocated `research/` and `thesis/` to repository root (not spec artifacts). Updated versioning policy scope.
- **Tone adjustments.** Replaced Part 5 marketing subtitle. Adjusted sales pitch language. Condensed Metered Service Broker. Added bootstrap note to Pre-Flight Checklist.

**v0.2.0-alpha (March 2026)**

- Initial 11-part framework with 71 core + 34 extended agent definitions. Brain B1-B2 specs. 8 hook manifests. 18 attack corpus scenarios. Full doctrine, fleet, brain, and monitor specifications.
