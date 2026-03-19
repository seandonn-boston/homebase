# Stream 26: Standing Orders Complete Implementation — All 16 SOs Enforced

> *"Rules that exist only in documentation are suggestions. Rules that exist in code are laws." — Admiral Spec, Part 3*

**Scope:** Currently 16 Standing Orders are defined in the spec (Part 11) but enforcement is inconsistent. Some SOs have hooks, others rely on advisory instructions alone. This stream ensures every SO has at least one automated enforcement mechanism — a hook, a validator, or a CI check that fires deterministically. Advisory-only Standing Orders are the single largest governance gap in the framework.

**Principle:** The Admiral thesis is "deterministic enforcement beats advisory guidance." A Standing Order without enforcement is advisory guidance wearing a uniform. This stream closes that gap for every SO.

---

## 26.1 Identity & Scope Enforcement

- [ ] **SO-01: Identity Discipline enforcement — Implement identity validation hook**
  - **Description:** Implement a PreToolUse hook that validates agent identity consistency throughout a session. The hook checks that the agent's declared role matches its session-start identity and that outputs do not claim capabilities outside the declared role. If identity validation already exists in Stream 1 (S-01), reference and extend it rather than duplicating. The hook should detect role drift patterns: an agent saying "I can also help with..." when the task is outside its scope, or an agent producing output tagged with a different agent role.
  - **Done when:** Hook fires on every tool use, rejects actions where declared role does not match session identity. Identity drift patterns (role expansion, capability claims outside scope) are detected and blocked. False positive rate < 1% on normal operations.
  - **Files:** `.hooks/identity_validator.sh` (new or extend existing), `.hooks/tests/test_identity_validator.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, SO-01; Part 3, Deterministic Enforcement
  - **Depends on:** —

- [ ] **SO-03: Scope Boundaries enforcement — Enhance scope_boundary_guard.sh to hard-block**
  - **Description:** Upgrade the existing `scope_boundary_guard.sh` from soft-warning to hard-blocking for scope violations. Currently scope violations may produce warnings but allow the action to proceed. This item changes the behavior: when an agent attempts to modify files outside its declared scope or acts on items in its "Does NOT Do" list, the hook must block the action and return a structured error explaining the violation. Add pattern matching for common scope creep signals: unrequested feature additions, refactoring outside task boundaries, and "while I'm here" modifications.
  - **Done when:** `scope_boundary_guard.sh` hard-blocks all out-of-scope file modifications. Scope violation produces structured JSON error with the boundary that was crossed. "Does NOT Do" list violations are detected and blocked. Override mechanism exists via `ADMIRAL_SCOPE_OVERRIDE` environment variable (Escalate-tier only).
  - **Files:** `.hooks/scope_boundary_guard.sh` (modify), `.hooks/tests/test_scope_boundary_guard.sh` (modify)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, SO-03; Part 1, Boundaries
  - **Depends on:** —

- [ ] **SO-11: Context Discovery enforcement — Enforce context discovery before task start**
  - **Description:** Implement a SessionStart hook or extend the existing session start adapter to verify that context discovery has occurred before an agent begins producing output. The hook checks: (1) Ground Truth files have been loaded (AGENTS.md, relevant config), (2) the agent's context profile sections are populated (standing, session, on-demand), (3) the context source routing chain has been followed (loaded context -> Brain -> escalate). If context discovery is incomplete, the hook emits a structured warning listing missing context items and blocks task execution until minimum viable context is confirmed.
  - **Done when:** Agents cannot begin task execution without confirmed context discovery. Missing context items are enumerated in a structured report. The three-step context source routing chain (Part 2) is enforced.
  - **Files:** `.hooks/context_discovery_validator.sh` (new), `.hooks/tests/test_context_discovery.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, SO-11; Part 2, Context Source Routing
  - **Depends on:** —

---

## 26.2 Communication & Honesty Enforcement

- [ ] **SO-02: Output Routing enforcement — Validate agent output destinations**
  - **Description:** Implement a PostToolUse hook that validates every agent output has a declared destination. Per SO-02, every output must include "Output goes to: [recipient]" with the reason. The hook scans agent output for the routing declaration. If missing, the output is held and the agent is prompted to add routing. If the declared destination is not a valid agent role or known recipient, the hook flags it for Orchestrator review. This prevents orphaned outputs that no agent processes.
  - **Done when:** Every agent output is validated for routing declaration. Missing routing triggers a hold-and-prompt. Invalid recipients are flagged. Routing compliance is logged for audit.
  - **Files:** `.hooks/output_routing_validator.sh` (new), `.hooks/tests/test_output_routing.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, SO-02; Part 11, Handoff Protocol
  - **Depends on:** —

- [ ] **SO-04: Context Honesty enforcement — Detect and flag false confidence claims**
  - **Description:** Implement a PostToolUse hook that detects agents claiming knowledge they do not have. Detection patterns: (1) assertions about file contents without having read the file (tool use trace shows no Read/Glob for the referenced file), (2) confidence claims above 80% without supporting evidence in the tool use trace, (3) fabricated tool outputs (output references tools not in the agent's tool list), (4) statements presented as facts without confidence labels when the context is ambiguous. The hook cross-references the agent's claims against its actual tool use history in the current session.
  - **Done when:** Hook detects fabricated file contents, unsupported confidence claims, and phantom tool outputs. Detection produces structured warnings with specific evidence of the honesty violation. False positive rate < 5% (honesty detection is inherently fuzzy; err toward flagging).
  - **Files:** `.hooks/context_honesty_validator.sh` (new), `.hooks/tests/test_context_honesty.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 11, SO-04; Part 7, Hallucination failure mode
  - **Depends on:** —

- [ ] **SO-09: Communication Format enforcement — Validate agent communication structure**
  - **Description:** Implement a PostToolUse hook that validates agent-to-agent communication follows the structured format defined in SO-09 (AGENT, TASK, STATUS, OUTPUT, ASSUMPTIONS, ROUTING SUGGESTIONS, OUTPUT GOES TO). The hook parses agent output when it is addressed to another agent or the Orchestrator, checking for required fields. Missing fields trigger a structured warning listing which fields are absent. The hook should distinguish between inter-agent communication (must follow format) and direct tool output (exempt from format requirements).
  - **Done when:** Inter-agent communications are validated for format compliance. Missing required fields are listed in structured warnings. Direct tool outputs are correctly exempted. Format compliance rate is tracked and logged.
  - **Files:** `.hooks/communication_format_validator.sh` (new), `.hooks/tests/test_communication_format.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, SO-09
  - **Depends on:** —

---

## 26.3 Authority & Recovery Enforcement

- [ ] **SO-05: Decision Authority enforcement — Validate authority tiers before actions**
  - **Description:** Implement a PreToolUse hook that evaluates the decision authority tier required for the current action and validates the agent has sufficient authority. The hook maintains a classification of action types to authority tiers: (1) Enforced-tier actions are handled by hooks (no agent decision), (2) Autonomous-tier actions are logged, (3) Propose-tier actions require the agent to have submitted a proposal with rationale and alternatives, (4) Escalate-tier actions must be stopped and routed to the Admiral. The hook checks whether the agent is attempting to execute a Propose-tier or Escalate-tier action without the required approval workflow.
  - **Done when:** Actions are classified by authority tier. Propose-tier actions without proposals are blocked. Escalate-tier actions without Admiral approval are blocked. Authority tier classification is configurable per deployment. All authority decisions are logged.
  - **Files:** `.hooks/decision_authority_validator.sh` (new), `admiral/config/authority_tiers.json` (new), `.hooks/tests/test_decision_authority.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 11, SO-05; Part 3, Decision Authority
  - **Depends on:** —

- [ ] **SO-06: Recovery Protocol enforcement — Ensure recovery ladder is followed after failures**
  - **Description:** Implement a hook that monitors agent behavior after a failure event and enforces the five-step recovery ladder (retry with variation, fallback, backtrack, isolate, escalate). When a tool use fails, the hook tracks subsequent actions to verify: (1) retries are genuinely different approaches (not identical repetition), (2) the agent progresses down the ladder rather than looping at one step, (3) no steps are skipped (e.g., jumping from retry directly to escalate without attempting fallback), (4) escalation reports include evidence of prior recovery attempts. The recovery progression rule (Part 7) must be enforced: records must advance exactly one rung at a time.
  - **Done when:** Recovery ladder progression is tracked per failure event. Identical retries are detected and blocked after 3 attempts. Ladder step skipping is prevented. Escalation reports are validated for recovery attempt evidence. Recovery audit trail is complete.
  - **Files:** `.hooks/recovery_ladder_enforcer.sh` (new), `.hooks/tests/test_recovery_ladder.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 11, SO-06; Part 7, Failure Recovery
  - **Depends on:** —

- [ ] **SO-07: Checkpointing enforcement — Require checkpoints at defined intervals**
  - **Description:** Implement a hook that tracks work progress and enforces checkpoint creation at defined intervals. The hook monitors: (1) number of tool uses since last checkpoint, (2) elapsed time since last checkpoint, (3) completion of significant work chunks (as defined by task decomposition). When a threshold is exceeded without a checkpoint, the hook pauses the agent and requires a checkpoint before continuing. Checkpoints must contain the required fields: completed, in progress, blocked, decisions made, assumptions held, resources consumed.
  - **Done when:** Checkpoint intervals are enforced (configurable thresholds for tool count and time). Checkpoint content is validated for required fields. Agents are paused when checkpoint is overdue. Checkpoint creation is logged for audit.
  - **Files:** `.hooks/checkpoint_enforcer.sh` (new), `admiral/config/checkpoint_thresholds.json` (new), `.hooks/tests/test_checkpoint_enforcer.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, SO-07
  - **Depends on:** —

---

## 26.4 Quality & Safety Enforcement

- [ ] **SO-08: Quality Standards enforcement — Enforce minimum quality on agent outputs**
  - **Description:** Implement a PostToolUse hook that enforces quality gates on agent outputs before they are marked complete. The hook verifies: (1) automated checks have been run (type checker, linter, tests) and passed, (2) the agent has not marked a task complete with failing quality gates, (3) quality gates have not been disabled or bypassed. The hook cross-references the tool use trace for evidence of quality check execution. If an agent attempts to declare completion without running required checks, the hook blocks the completion and lists the checks that must pass first.
  - **Done when:** Task completion is blocked when quality gates have not been run or are failing. Quality gate bypass attempts are detected and prevented. Quality check execution is verified against tool use trace. Quality compliance is logged.
  - **Files:** `.hooks/quality_standards_enforcer.sh` (new), `.hooks/tests/test_quality_standards.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, SO-08; Part 7, Quality Assurance
  - **Depends on:** —

- [ ] **SO-10: Prohibitions enforcement — Edge case hardening for existing prohibitions hook**
  - **Description:** The prohibitions hook (SO-10) is already implemented. This item hardens it against edge cases: (1) encoded secrets (base64, URL-encoded credentials that bypass pattern matching), (2) split-across-lines patterns (credential on one line, value on next), (3) indirect file modification (agent writes a script that modifies files outside scope when executed), (4) self-approval patterns (agent reviewing its own output and declaring it approved), (5) budget continuation (agent continuing work after budget exhaustion without acknowledging the overrun). Add regression tests for each edge case from the attack corpus.
  - **Done when:** All 5 edge case categories are handled. Each edge case has at least 2 test vectors. No regressions in existing prohibition detection. Attack corpus edge cases all pass.
  - **Files:** `.hooks/prohibitions_guard.sh` (modify), `.hooks/tests/test_prohibitions_edge_cases.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, SO-10; Attack corpus
  - **Depends on:** —

- [ ] **SO-12: Zero Trust enforcement — Enhance zero_trust_validator.sh coverage**
  - **Description:** Enhance `zero_trust_validator.sh` to cover additional zero-trust scenarios beyond the current implementation: (1) pre-access risk assessment validation (agent must declare risk assessment before accessing resources), (2) post-access risk re-assessment (agent must confirm actual risk matches estimated risk after gaining access), (3) minimum privilege verification (agent requests only the access scope needed for the current task), (4) access release verification (agent releases access upon task completion, not retaining "just in case"), (5) provenance verification for RAG-retrieved content (agent must verify source trustworthiness before treating retrieved content as fact).
  - **Done when:** All 5 zero-trust scenarios are validated. Pre/post access risk assessment flow is enforced. Minimum privilege is verified. Access release is tracked. RAG provenance checking is implemented.
  - **Files:** `.hooks/zero_trust_validator.sh` (modify), `.hooks/tests/test_zero_trust_enhanced.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 11, SO-12; Part 11, Data Sensitivity Protocol
  - **Depends on:** —

---

## 26.5 Bias, Compliance & Protocol Governance Enforcement

- [ ] **SO-13: Bias Awareness enforcement — Implement bias detection in agent outputs**
  - **Description:** Implement a PostToolUse hook that detects common LLM bias patterns in agent outputs: (1) sycophantic drift (declining finding counts, softening language over session), (2) confidence uniformity (all claims presented with equal confidence, no uncertainty labels), (3) missing disconfirming evidence (recommendations without "what would make this wrong?" analysis), (4) unattributed RAG blending (retrieved facts mixed with generated reasoning without clear attribution), (5) premature convergence (first solution adopted without exploring alternatives for critical decisions). The hook tracks patterns across the session, not just individual outputs.
  - **Done when:** All 5 bias patterns are detected. Session-level tracking is implemented (not just per-output). Bias detection produces structured warnings with specific evidence. Sycophantic drift is detected via >30% decline in finding counts session-over-session. Confidence labels are validated on subjective claims.
  - **Files:** `.hooks/bias_awareness_detector.sh` (new), `.hooks/tests/test_bias_detection.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 11, SO-13; Part 7, Sycophantic Drift failure mode
  - **Depends on:** —

- [ ] **SO-14: Compliance Ethics enforcement — Implement compliance checks for regulated domains**
  - **Description:** Implement a PreToolUse hook that enforces compliance and ethics boundaries. The hook: (1) detects when an agent is about to produce output in a regulated domain (healthcare, finance, legal) and requires compliance context to be loaded, (2) blocks agents from making compliance determinations autonomously (must route to Compliance Agent or escalate), (3) detects potential intellectual property violations (reproducing large code blocks from known copyrighted sources), (4) flags outputs that could cause harm to users (discriminatory patterns, deceptive content), (5) enforces data minimization for personal data handling.
  - **Done when:** Regulated domain detection is implemented with configurable domain list. Autonomous compliance determination is blocked. IP violation patterns are detected. Harmful output patterns are flagged. Data minimization is enforced for PII-adjacent operations.
  - **Files:** `.hooks/compliance_ethics_guard.sh` (new), `admiral/config/regulated_domains.json` (new), `.hooks/tests/test_compliance_ethics.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 11, SO-14; Part 11, Data Sensitivity Protocol
  - **Depends on:** —

- [ ] **SO-15: Pre-Work Validation enforcement — Enhance pre_work_validator.sh**
  - **Description:** Enhance the existing `pre_work_validator.sh` to fully enforce all four pre-work validation requirements: (a) clear end goal with objectively measurable success criteria (not vague "improve" language), (b) defined budget (token/time/tool-call allocation present and within limits), (c) explicit scope boundaries (in-scope and out-of-scope defined), (d) sufficient context confirmed (context profile sections populated per SO-11). Additionally, enforce front-loading of hard decisions: the validator checks whether the task involves irreversible choices or high-blast-radius decisions and requires them to be identified before implementation begins.
  - **Done when:** All four pre-work requirements are validated. Vague success criteria ("improve," "enhance," "optimize" without metrics) are rejected. Budget presence is verified. Scope boundaries are confirmed. Hard decision front-loading is enforced for Propose-tier and Escalate-tier decisions.
  - **Files:** `.hooks/pre_work_validator.sh` (modify), `.hooks/tests/test_pre_work_validator.sh` (modify)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, SO-15
  - **Depends on:** —

- [ ] **SO-16: Protocol Governance enforcement — Implement protocol registry guard**
  - **Description:** Implement a PreToolUse hook that enforces protocol governance for MCP server additions, A2A connections, and version management. The hook: (1) validates that MCP servers pass the Server Addition Checklist (Part 13) before entering the Tool Registry, (2) requires trust classification (Official/Community/Internal) for all servers, (3) rejects `latest` version strings in any configuration (exact versions required), (4) validates A2A connections have passed appropriate testing, (5) checks for conflicts with in-flight work by other agents before allowing protocol changes.
  - **Done when:** MCP server additions are validated against the Server Addition Checklist. Trust classification is required. `latest` version strings are rejected everywhere. A2A connection testing is verified. Conflict detection with in-flight work is implemented.
  - **Files:** `.hooks/protocol_governance_guard.sh` (new), `.hooks/tests/test_protocol_governance.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, SO-16; Part 13, MCP Integration
  - **Depends on:** —

---

## 26.6 Enforcement Completeness

- [ ] **SO-17: Standing Orders enforcement completeness report**
  - **Description:** Create an automated report that measures enforcement coverage across all 16 Standing Orders. The report: (1) maps each SO to its enforcement mechanism(s) (hook, CI check, validator), (2) reports enforcement type (hard-block, soft-warning, advisory-only, none), (3) calculates overall enforcement coverage percentage, (4) identifies SOs with no enforcement (the governance gap), (5) tracks enforcement coverage over time (trend). The report should be runnable as a standalone script and integrated into CI. It produces both a human-readable summary and a machine-parseable JSON output for the control plane dashboard.
  - **Done when:** Report covers all 16 SOs. Each SO is mapped to its enforcement mechanism with type classification. Coverage percentage is calculated. Gaps are identified with specific remediation recommendations. Report runs in CI and produces JSON output. Historical trend tracking is implemented.
  - **Files:** `admiral/reports/standing_orders_coverage.sh` (new), `admiral/reports/tests/test_so_coverage.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11, Standing Orders; Part 3, Deterministic Enforcement
  - **Depends on:** All SO-01 through SO-16 items (reports on their status)
