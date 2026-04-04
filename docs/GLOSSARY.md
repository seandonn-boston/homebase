# Admiral Framework Glossary

Terms, definitions, and cross-references for the Admiral Framework. 25+ terms organized by domain.

---

## Governance & Identity

**Admiral** — The human operator who holds ultimate authority. Approves slush-to-main merges, grants trust, resolves escalations. See: Decision Authority, Escalation.

**Agent** — An AI instance (Claude Code session) operating under Admiral governance. Each agent has an identity, tier, and set of allowed tools defined in the fleet registry.

**Fleet** — The collection of all agents operating under Admiral governance. Coordinated via the fleet registry and git-based task locking.

**Fleet Registry** — Configuration file (`admiral/config/fleet_registry.json`) defining all agent identities, capabilities, tiers, and tool permissions.

**Standing Orders (SO)** — 16 numbered directives (SO-01 through SO-16) that govern agent behavior. Loaded at session start. Enforced via hooks (Tier 1/2) or agent training (Tier 3). See: ADR-007.

**Decision Authority** — Four tiers governing how decisions are made: **Enforced** (hooks handle it), **Autonomous** (do it and log), **Propose** (draft and wait), **Escalate** (stop and flag).

**Escalation** — Routing a decision to the Admiral because the agent lacks authority. Not failure — it's the correct response when boundaries are reached.

---

## Work Structure

**Phase** — A large body of work spanning multiple sessions. Has one slush branch and one slush-to-main PR. Phases 0-8 cover broad architecture; Phases 9-12 cover gap closure.

**Task** — A meaningful chunk within a phase. One task branch, one task-to-slush PR. Self-merged (no human approval needed).

**Subtask** — A single commit within a task. No branch, no PR.

**Slush Branch** — The integration branch for a phase (`slush/phase-<NN>-<slug>`). All task branches merge here. Merges to `main` only with Admiral approval.

**Task Branch** — A branch for one task (`task/phase-<NN>/<id>-<slug>`). Created from the slush branch, merged back into it.

**ROADMAP** — `plan/ROADMAP.md` — the phase dependency map and build order.

**TODO Files** — `plan/todo/*.md` — the source of truth for what needs to be done within each stream.

---

## Hooks & Enforcement

**Hook** — A bash script in `.hooks/` that fires automatically at lifecycle events (session start, before/after tool use). Hooks enforce policies, detect violations, and collect telemetry.

**Adapter** — A hook that orchestrates sub-hooks. `post_tool_use_adapter.sh` and `pre_tool_use_adapter.sh` are adapters that call individual enforcement hooks in sequence.

**Fail-Open** — Default hook behavior (ADR-004). On error, the hook logs the error and exits 0 (allows the action). Prevents hook failures from blocking work.

**Fail-Closed** — Reserved for security-critical hooks. On violation, the hook exits 2 (blocks the action). Used by `scope_boundary_guard`, `prohibitions_enforcer`, `identity_validation`.

**Exit Code Taxonomy** — Standardized exit codes: 0=pass/fail-open, 1=error/fail-open, 2=hard-block. See: ADMIRAL_STYLE.md, Q-02, Q-13.

---

## Brain & Knowledge

**Brain** — The project's persistent memory system. Stores decisions, patterns, and lessons across sessions.

**B1 (File-based)** — First brain tier. JSON/JSONL storage in `.brain/`, keyword search via grep, git-tracked. Zero external dependencies.

**B2 (Indexed)** — Second brain tier. pgvector-backed semantic search. Requires external database.

**B3 (Autonomous)** — Third brain tier. Self-organizing, cross-session learning, pattern recognition. Aspirational — not yet implemented.

**Graduation** — The process of advancing from one brain tier to the next. Threshold-based with human confirmation. See: ADR-009.

---

## Control Plane

**Control Plane** — TypeScript application (`control-plane/`) providing agent observability, runaway detection, and execution trace visualization.

**EventStream** — Core observable event bus. Agents emit events; the control plane processes them for alerting and tracing.

**RingBuffer** — Fixed-capacity circular buffer with O(1) push. Used for bounded event storage.

**Runaway Detector** — Real-time governance system using Statistical Process Control (SPC) to detect anomalous agent behavior patterns.

**SPC (Statistical Process Control)** — Control chart methodology applied to agent tool usage. Detects when usage patterns deviate from established baselines. See: ADR-003.

---

## Quality & Testing

**EDD (Evaluation-Driven Design)** — Task completion verification system. Each task can declare deterministic checks (commands) and probabilistic checks (human/agent review). See: EDD-01 through EDD-05.

**Evaluation Spec** — JSON file (`.admiral/edd-specs/`) declaring a task's Definition of Done as machine-readable checks. Schema: `evaluation-spec.v1.schema.json`.

**EDD Gate** — Validator (`admiral/bin/edd_gate`) that executes evaluation specs and returns pass/fail verdicts.

**Proof Artifact** — JSON file (`.admiral/proofs/`) recording task completion evidence: check results, output hashes, CI status.

**Recovery Ladder** — Escalating response to failures: retry with variation, fallback, backtrack, isolate and skip, escalate.

---

## Configuration & Libraries

**jq Helpers** — Shared library (`admiral/lib/jq_helpers.sh`) providing `jq_get`, `jq_set`, `jq_merge`, and other jq convenience functions. Fail-open per ADR-004.

**Hook Utils** — Shared library (`admiral/lib/hook_utils.sh`) providing standardized hook lifecycle: `hook_init`, `hook_pass`, `hook_fail_soft`, `hook_fail_hard`, `hook_recover`.

**Hook Config** — Shared library (`admiral/lib/hook_config.sh`) for centralized access to `admiral/config.json`.

**ADR (Architecture Decision Record)** — Documents in `docs/adr/` recording architectural choices with context, alternatives considered, and consequences.

---

## Abbreviations

| Abbr | Full | Context |
|------|------|---------|
| SO | Standing Order | SO-01 through SO-16 |
| EDD | Evaluation-Driven Design | Quality gate system |
| SPC | Statistical Process Control | Anomaly detection |
| ADR | Architecture Decision Record | Design documentation |
| DoD | Definition of Done | Task completion criteria |
| PR | Pull Request | GitHub merge workflow |
| CI | Continuous Integration | GitHub Actions |
| DX | Developer Experience | Contributor ergonomics |
