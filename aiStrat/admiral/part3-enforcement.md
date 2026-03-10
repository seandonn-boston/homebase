<!-- Admiral Framework v0.2.0-alpha -->
# PART 3 — ENFORCEMENT

*The gap between "should" and "must."*

*An instruction says "don't do this." Enforcement makes it impossible. Every constraint you define in Parts 1 and 2 falls somewhere on the spectrum from soft guidance to hard enforcement. These three sections define that spectrum, assign each constraint to its correct level, and secure the enforcement layer itself against attack.*

-----

## 08 — DETERMINISTIC ENFORCEMENT

> **TL;DR** — An instruction in AGENTS.md saying "never use rm -rf" can be forgotten. A PreToolUse hook that blocks it fires every single time. Any constraint that must hold with zero exceptions must be a hook, not an instruction.

This distinction — between advisory instructions and deterministic enforcement — is the foundation of reliable fleet operations.

### The Enforcement Spectrum

| Level | Mechanism | Reliability | Use For |
|---|---|---|---|
| **Hard enforcement** | Hooks, CI gates, linters, type checkers, file system permissions | 100% — fires deterministically | Safety, security, scope limits, formatting, test requirements |
| **Firm guidance** | AGENTS.md rules, system prompt instructions, tool-specific config files | High but degradable under context pressure | Coding patterns, architectural preferences, naming conventions |
| **Soft guidance** | Comments in code, README notes, verbal instructions | Low — easily overridden | Suggestions, preferences, nice-to-haves |

### Hook Lifecycle Events

| Event | When It Fires | Use For |
|---|---|---|
| **PreToolUse** | Before any tool invocation | Blocking dangerous commands, enforcing scope boundaries |
| **PostToolUse** | After any tool invocation | Logging, auditing, triggering downstream checks |
| **PreCommit** | Before a git commit | Linting, test execution, formatting, secret scanning |
| **PostCommit** | After a git commit | Notification, CI trigger, changelog update |
| **SessionStart** | When an agent session begins | Context loading, environment validation, staleness checks |
| **TaskCompleted** | When a task is marked complete | Quality gate execution, metric logging |
| **PrePush** | Before pushing to remote | Branch protection, review requirements |
| **Periodic** | On a configurable interval (not tied to tool use or task lifecycle) | Governance heartbeat monitoring, scheduled health checks |

### Hook Execution Model

Hooks are executable programs — shell scripts, Python scripts, or compiled binaries — invoked by the agent runtime at defined lifecycle points. They are not advisory callbacks. They are deterministic gates.

**Hook Contract:**

| Property | Specification |
|---|---|
| **Format** | Any executable. Shell scripts, Python, compiled binaries. Must be version-controlled alongside the fleet configuration. |
| **Invocation** | Synchronous by default. The agent runtime pauses execution until the hook returns. Async hooks must be explicitly declared. |
| **Input** | The hook receives structured JSON on stdin: `{ "event": "PreToolUse", "tool": "Write", "params": { ... }, "agent_identity": "...", "trace_id": "..." }` |
| **Output** | Exit code 0 = pass. Non-zero = block. Stdout is captured and fed back to the agent as context (enabling self-healing loops). Stderr is logged. |
| **Timeout** | Configurable per hook. Default: 30 seconds. Hooks exceeding timeout are killed and treated as failures. No infinite hangs. |
| **Chaining** | Multiple hooks may bind to the same event. They execute in declared order. First failure stops the chain (fail-fast). |
| **Idempotency** | Hooks must be idempotent. The runtime may invoke a hook multiple times for the same event during self-healing retries. |
| **Isolation** | Hooks execute in a sandboxed environment with read access to the repository and write access only to their own log output. Hooks cannot modify agent state, context, or tool parameters. |

**Self-Healing Loop Specification:**

```
Agent action
  → PostToolUse hook executes check (linter, type-checker, tests)
    → Exit 0: proceed
    → Exit non-zero: stdout fed back to agent as error context
      → Agent attempts fix
        → Hook re-executes
          → Exit 0: proceed
          → Exit non-zero: cycle counter increments
            → Counter < MAX_RETRIES (default: 3): agent retries
            → Counter >= MAX_RETRIES: hook returns permanent failure
              → Agent moves to next step on recovery ladder (Section 22)
```

**Cycle detection:** The runtime tracks `(hook_name, error_signature)` tuples. If the same error signature appears in consecutive retries, the loop is broken immediately — the agent is producing the same failure repeatedly and further retries are wasteful. The agent receives: `"Self-healing loop terminated: identical error after N retries. Moving to recovery ladder step 2 (fallback)."`

### What Must Be Hooks vs. Instructions

| Category | Hook (Deterministic) | Instruction (Advisory) |
|---|---|---|
| **Security** | Block `rm -rf /`, prevent commits with secrets, enforce file scope | Prefer secure patterns, follow OWASP guidelines |
| **Quality** | Run linter on save, tests before commit, type-check before merge | Write clean code, follow naming conventions |
| **Scope** | Block modifications outside assigned directories | Stay focused on the current task |
| **Process** | Require test existence before implementation accepted | Write tests for new features |
| **Cost** | Kill session after token budget exceeded | Be mindful of token usage |

### Reference Hook Implementations

The enforcement classifications above (e.g., "Kill session after token budget exceeded") require concrete hook specifications. The following hooks implement the deterministic enforcement for token budgets, loop detection, and context health — three areas where advisory instructions are insufficient and hook-based enforcement is mandatory.

**Token Budget Enforcement Hooks:**

```
PostToolUse: token_budget_tracker
  Format:     Shell script or Python. Version-controlled.
  Invocation: Synchronous. Fires after every tool invocation.
  Input:      { "event": "PostToolUse", "tool": "...", "params": { ... },
                "agent_identity": "...", "session_state": { "tokens_used": N, "token_budget": M } }
  Output:     Exit 0: pass. Stdout includes updated cumulative token count.
              At 80% utilization: stdout warning ("Token budget at 80%: {used}/{limit}").
              At 90% utilization: stdout escalation alert for Orchestrator.
  Timeout:    5 seconds.

PreToolUse: token_budget_gate
  Format:     Shell script or Python. Version-controlled.
  Invocation: Synchronous. Fires before every tool invocation.
  Input:      { "event": "PreToolUse", "tool": "...", "params": { ... },
                "agent_identity": "...", "session_state": { "tokens_used": N, "token_budget": M } }
  Output:     Exit 0: budget available, proceed.
              Exit non-zero (block): "Token budget exhausted: {used}/{limit}. Session terminated."
  Timeout:    5 seconds.
```

**Retry Loop Detection Hook:**

```
PostToolUse: loop_detector
  Format:     Shell script or Python. Version-controlled.
  Invocation: Synchronous. Fires after every tool invocation.
  Input:      { "event": "PostToolUse", "tool": "...", "result": { "exit_code": N, "error": "..." },
                "agent_identity": "...", "trace_id": "..." }
  Output:     Exit 0: no loop detected.
              Exit non-zero: "Loop detected: error signature '{sig}' repeated {count} times.
              Moving to recovery ladder (Section 22)."
  Behavior:   Tracks (agent_id, error_signature) tuples across invocations.
              Triggers when: same error recurs 3+ times, OR total retry count across all
              error signatures in a session exceeds configurable maximum (default: 10).
              This hook makes the cycle detection specified above enforceable rather than advisory.
  Timeout:    5 seconds.
```

**Context Health Monitoring Hooks:**

```
SessionStart: context_baseline
  Format:     Shell script or Python. Version-controlled.
  Invocation: Synchronous. Fires once at session start.
  Input:      { "event": "SessionStart", "agent_identity": "...",
                "context": { "standing_context_tokens": N, "total_capacity": M } }
  Output:     Exit 0: baseline recorded. Stdout: initial context utilization metrics.
  Behavior:   Measures initial context window utilization, records baseline metrics
              (standing context size, available capacity) for comparison by context_health_check.
  Timeout:    10 seconds.

PostToolUse: context_health_check
  Format:     Shell script or Python. Version-controlled.
  Invocation: Synchronous. Fires every N tool invocations (configurable, default: 10).
  Input:      { "event": "PostToolUse", "tool": "...", "agent_identity": "...",
                "context": { "current_utilization": P, "standing_context_present": [...] } }
  Output:     Exit 0: context health acceptable.
              Exit non-zero: "Context health critical" — triggers when:
              (a) utilization exceeds threshold (default: 85%) without sacrifice order activation, OR
              (b) critical context (Identity, Authority, Constraints) is missing from active context.
  Timeout:    10 seconds.
```

**Model Tier Validation Hook:**

```
SessionStart: tier_validation
  Format:     Shell script or Python. Version-controlled.
  Invocation: Synchronous. Fires once at session start.
  Input:      { "event": "SessionStart", "agent_identity": "...",
                "model_id": "...", "tier_assignment": "...",
                "degradation_policy": { "primary": "...", "degraded": "...",
                "blocked": "...", "max_degraded_tasks": N } }
  Output:     Exit 0: model meets or exceeds assigned tier. Stdout: tier status confirmation.
              Exit non-zero: "Model tier violation: agent [X] requires Tier [Y], got [Z].
              Degradation policy: [Degraded|Blocked]. Action: [failover|queue]."
  Behavior:   Validates the instantiated model against the agent's tier assignment
              in model-tiers.md. If the primary model is unavailable:
              - Degraded policy: allows session with fallback model, sets
                governance_audit_rate=2x, logs degradation event.
              - Blocked policy: rejects session, queues task for primary recovery,
                alerts Admiral directly.
              No cascading degradation: if the fallback also fails, the agent is Blocked.
  Timeout:    10 seconds.
```

**Governance Heartbeat Monitoring Hook:**

```
Periodic: governance_heartbeat_monitor
  Format:     Shell script or Python. Version-controlled.
  Invocation: Asynchronous. Runs on a configurable interval (default: 60 seconds).
  Input:      { "event": "Periodic",
                "expected_agents": ["Token Budgeter", "Drift Monitor",
                "Hallucination Auditor", "Bias Sentinel", "Loop Breaker",
                "Context Health Monitor", "Contradiction Detector"],
                "received_heartbeats": {
                  "Token Budgeter": { "timestamp": "...", "confidence_self_assessment": 0.9 },
                  ...
                } }
  Output:     Exit 0: all governance agents reporting with acceptable confidence.
              Exit non-zero: "Governance heartbeat failure: [agent_name] missed [N]
              consecutive heartbeats. Alerting Admiral directly."
  Behavior:   Tracks heartbeat timestamps per governance agent.
              2 consecutive misses → alert Admiral directly (bypasses Orchestrator).
              If confidence_self_assessment < 0.5 for any agent, alert Admiral
              even if heartbeat is present (alive but degraded).
              Routes DIRECTLY to Admiral — never through the Orchestrator.
  Timeout:    10 seconds.
```

**Identity Validation Hook:**

```
SessionStart: identity_validation
  Format:     Shell script or Python. Version-controlled.
  Invocation: Synchronous. Fires once at session start.
  Input:      { "event": "SessionStart", "agent_identity": "...",
                "project_config": { "auth_artifact_path": "...",
                "auth_artifact_hash": "..." } }
  Output:     Exit 0: auth configuration artifact exists and is valid.
              Exit non-zero: "Identity validation failed: auth configuration artifact
              missing or invalid at [path]. Agent session blocked until artifact is
              produced by Auth & Identity Specialist."
  Behavior:   Validates that the project's auth configuration artifact exists,
              is non-empty, and has not been modified outside of authorized channels
              (hash check). This hook ensures runtime identity enforcement is
              deterministic and does not depend on the Auth & Identity Specialist
              being online (see fleet/agents/extras/domain.md, Pool Configuration).
  Timeout:    10 seconds.
```

Governance agents (`fleet/agents/governance.md`) analyze patterns and recommend calibration for these hooks. The hooks handle real-time enforcement; the agents handle trend analysis.

### Hook Manifest Specification

Every hook must ship with a `hook.manifest.json` conforming to `hooks/manifest.schema.json`. The manifest declares the hook's capabilities, dependencies, and contract version — enabling the runtime to discover, validate, and order hooks automatically.

**Example manifest** (for the `token_budget_gate` hook above):

```json
{
  "name": "token_budget_gate",
  "version": "1.0.0",
  "events": ["PreToolUse"],
  "timeout_ms": 5000,
  "requires": ["token_budget_tracker"],
  "input_contract": "v1",
  "description": "Blocks tool invocations that would exceed the session token budget."
}
```

**Key behaviors:**

- **Dependency resolution:** The `requires` field lists hooks that must be active in the session. The runtime validates all dependencies at `SessionStart` and rejects sessions with unsatisfied or circular dependencies.
- **Version compatibility:** The `input_contract` field is a simple version string. Hooks with the same version are wire-compatible. Breaking input changes require a new version string.
- **Registration:** All hook manifests are discovered from the `hooks/` directory tree at `SessionStart`. Invalid manifests block session start.
- **Event types:** Manifests support the standard lifecycle events (`PreToolUse`, `PostToolUse`, `PreCommit`, `PostCommit`, `SessionStart`, `TaskCompleted`, `PrePush`) plus `Periodic` for interval-based hooks like the governance heartbeat monitor.

See `hooks/README.md` for the full ecosystem specification, directory conventions, and reference manifests.

### Self-Healing Quality Loops

The most effective fleet pattern discovered in production: hooks that detect failures and trigger automatic repair.

```
Agent writes code
  → PostToolUse hook runs linter
    → Linter fails → Hook returns failure with output
      → Agent fixes violations
        → Hook runs linter again → Passes → proceed
```

One deterministic check that fires every time and self-heals is more effective than three manual review passes that may or may not happen. Apply the same pattern to type checking, tests, and formatting.

> **TEMPLATE: ENFORCEMENT CLASSIFICATION**
>
> HARD ENFORCEMENT (hooks):
> - [Constraint]: [Hook event] — [Shell command]
>
> FIRM GUIDANCE (instructions):
> - [Constraint]: [Where documented — AGENTS.md / system prompt / tool-specific config]
>
> SOFT GUIDANCE (reference):
> - [Preference]: [Where noted]

> **ANTI-PATTERN: ALL INSTRUCTIONS, NO HOOKS** — The Admiral writes comprehensive AGENTS.md rules but implements zero hooks. For the first 60% of a session, rules are followed. As context pressure builds, rules near the beginning lose attention weight. The agent violates constraints it followed an hour ago. More rules are added. The file grows. The agent ignores more. Death spiral.

-----

## 09 — DECISION AUTHORITY

> **TL;DR** — Four tiers: Enforced (hooks decide), Autonomous (agent decides), Propose (agent recommends, Admiral approves), Escalate (stop all work). Every decision must be assigned to a tier.

Every orchestrator needs a clear decision envelope: what it may decide autonomously versus what requires Admiral approval.

### Four Tiers of Authority

| Tier | Behavior | Examples |
|---|---|---|
| **ENFORCED** | Handled by hooks, not agent judgment. The agent never makes this decision. | File scope boundaries, secret detection, test execution before commit |
| **AUTONOMOUS** | Proceed without asking. Log the decision. | File naming, variable naming, internal refactors, test creation |
| **PROPOSE** | Draft with rationale. Present alternatives. Wait for approval. | New dependencies, architecture changes, schema migrations, public API changes |
| **ESCALATE** | Stop all work. Flag to Admiral immediately. | Scope changes, budget overruns, security concerns, contradictory requirements |

### Calibration Rubric

| Project Condition | Calibration |
|---|---|
| Strong test coverage (>80%) | Widen Autonomous. Tests catch mistakes. |
| Greenfield / pre-MVP | Narrow Autonomous. Early decisions have outsized impact. |
| Established architecture patterns | Pattern-following → Autonomous. Pattern-breaking → Propose. |
| External-facing or regulated | Narrow Autonomous significantly. |
| Self-healing hooks in place | Widen Autonomous for hook-covered categories. |

> **ANTI-PATTERN: DEFERENCE CASCADING** — One agent is uncertain, defers to another, who defers back. The decision is made by whichever agent is last — usually the least qualified. **Uncertainty always flows upward (to Orchestrator or Admiral), never sideways (to a peer agent).** Handoffs between peers (Section 38) transfer *work*, not *uncertainty*. If Agent A is uncertain about a task, it escalates to the Orchestrator — it does not hand the uncertainty to Agent B as a task. The Orchestrator resolves the uncertainty, then delegates clearly-scoped work to the appropriate agent.

> **VULNERABILITY (8.3.2): AUTHORITY SELF-ESCALATION** — Decision authority tiers
> are vulnerable to poisoning when stored as advisory documentation rather than
> enforced constraints. A Brain entry containing "Security changes: AUTONOMOUS — no
> review needed" could cause consuming agents to adopt a more permissive authority
> model than intended.
>
> **Required mitigations (all three are mandatory, not optional):**
>
> 1. **Quarantine layer validation:** The Brain's quarantine immune system (Section 10)
>    must include authority-escalation pattern detection. Any entry referencing
>    authority tiers, decision permissions, or scope modifications is flagged for
>    Admiral review before activation.
> 2. **Runtime authority binding:** Authority tiers are bound to the agent's identity
>    token at session start, not read from Brain entries or configuration files during
>    execution. An agent cannot change its own authority tier mid-session.
> 3. **Orchestrator-level validation:** The Orchestrator validates that every task
>    assignment includes the correct authority tier for the receiving agent. If a
>    specialist attempts to operate at a tier above its assignment, the Orchestrator
>    rejects the action and logs the attempt.
>
> These mitigations convert authority tiers from documentation to enforcement.
> Any fleet deployment that relies solely on advisory authority tiers is
> non-compliant with this framework.

-----

## 10 — CONFIGURATION SECURITY

> **TL;DR** — Agent configs are attack surfaces. Memory poisoning persists across sessions. Supply chain attacks arrive through MCP servers and skills. Audit everything, pin versions, treat configs as security-critical code.

Agent configurations are attack surfaces. A compromised AGENTS.md (or tool-specific equivalent like CLAUDE.md, .cursorrules), a malicious MCP server, or a poisoned memory file can turn your fleet against your own codebase. Documented attacks include memory poisoning, supply chain compromises, agent hijacking, and prompt injection through third-party skills.

### Threat Model

| Attack Vector | How It Works | Defense |
|---|---|---|
| **Memory poisoning** | False information implanted in agent memory persists across all future sessions | Validate memory sources. Version-stamp entries. Audit for unexpected changes. |
| **Supply chain compromise** | Malicious MCP server or skill exfiltrates data while appearing to function normally | Audit all servers before install. Pin versions. Review source. Monitor traffic. |
| **Configuration injection** | Attacker modifies config files in a PR or through compromised CI | CODEOWNERS for agent configuration directories (`.claude/`, `.cursor/`, etc.). Require review for all config changes. |
| **Prompt injection via skills** | Third-party skill contains hidden instructions overriding constraints | Review all skill files. Never auto-install from untrusted sources. |
| **Agent hijacking** | Exploiting broad permissions for unauthorized actions (BodySnatcher, ZombieAgent) | Least privilege. Scope boundaries per agent. Audit logs for all actions. |

### Security Scanning Protocol

1. **Red team:** Attempt to make the agent violate constraints. Probe for injection in skills and MCP servers. Test memory poisoning. Attempt permission escalation.
2. **Blue team:** Review for overly broad permissions. Audit MCP access. Verify hooks cover critical constraints. Check scope enforcement.
3. **Auditor:** Compare actual behavior against documented constraints. Verify enforcement classification (Section 08) is implemented correctly.

### External Intelligence Quarantine

The Continuous AI Landscape Monitor (`monitor/`) is designed to feed external content into the Brain — model releases, agent patterns, repo configurations. This creates a potential ingestion attack vector: a poisoned repo description or crafted release note could inject false information into fleet memory.

Defense: all external content passes through the quarantine layer, a five-layer immune system. **Critical design principle: the load-bearing security layers (1-3) are completely LLM-free.** An LLM can build these layers, but their execution must be completely airgapped from all LLM engagement. This eliminates the circular dependency where an LLM judges content specifically designed to manipulate LLMs.

| Layer | Defense | Threat | LLM Involvement |
|---|---|---|---|
| **1. Structural** | Enforces schema, field lengths, valid categories | Malformed entries | None — deterministic validation |
| **2. Injection** | Encoding normalization + 70+ regex patterns for prompt injection, XSS, SQL injection, command injection, secrets, PII | Adversarial content | None — pattern matching |
| **3. Deterministic Semantic** | Rule-based NLP, TF-IDF scoring against attack corpus, Bayesian text classification, keyword/phrase authority-pattern detection | Authority spoofing, false credentials, behavior manipulation | **None — completely LLM-airgapped** |
| **4. LLM Advisory** | LLM classifier with hardcoded prompt template. **Can only REJECT, never APPROVE.** | Subtle semantic attacks that evade deterministic detection | LLM — advisory only, additive rejection |
| **5. Antibody** | Converts detected attacks into Brain FAILURE entries | Future defense learning | None — deterministic write |

**Layer 3 — Deterministic Semantic Analysis (LLM-Airgapped):**

Layer 3 is the primary semantic defense and contains zero LLM involvement. It uses well-understood, deterministic NLP techniques:

- **Authority pattern scoring:** A curated dictionary of authority-claiming phrases ("Admiral approved", "fleet-wide directive", "override standing order", "system-level permission") scored by TF-IDF weight against a known-attack corpus. Content exceeding the authority-claim threshold is rejected.
- **Bayesian text classification:** A pre-trained Bayesian classifier (Naive Bayes or similar) trained on labeled examples of legitimate content vs. authority spoofing, credential fabrication, and behavior manipulation. The classifier is trained offline and deployed as a static model — no LLM in the training pipeline or in execution.
- **Credential fabrication detection:** Rule-based pattern matching for fabricated endorsements, invented certifications, and false provenance claims. Checks against a registry of valid credential formats.
- **Behavior manipulation scoring:** Phrase-level detection of imperative instructions ("you must", "always do", "ignore previous", "from now on") combined with semantic context (do these phrases target agent behavior?). Scored against a manipulation-pattern corpus.

**The attack corpus** is a version-controlled, human-curated dataset of known adversarial patterns. It is updated by the Admiral (never by agents) and is the ground truth for Layer 3's scoring models.

**Layer 4 — LLM Advisory (Additive Rejection Only):**

Layer 4 is invoked ONLY on content that passes Layers 1-3. It uses an LLM classifier with a fixed, hardcoded prompt template (no dynamic generation, no variable interpolation beyond the content under inspection). Layer 4 operates under a critical constraint:

- **Layer 4 can REJECT content. It can NEVER APPROVE content.**
- If Layer 3 passes and Layer 4 rejects → content is **rejected**.
- If Layer 3 passes and Layer 4 passes → content **proceeds** (Layer 4's pass is not what grants approval — survival through all layers is what grants passage).
- If Layer 3 rejects → Layer 4 is **never consulted**. The rejection stands.

This constraint means a compromised Layer 4 (an LLM manipulated by the content it's classifying) can only fail in one direction: failing to reject content that should have been rejected. It cannot approve content that Layer 3 rejected. The LLM is a bonus net, not a load-bearing wall.

Hostile content is rejected before it can reach the Brain. Attack patterns are preserved in defanged form as antibody entries, teaching future agents to recognize similar threats.

Additionally, all monitor findings arrive as seed candidates with `"approved": False` — requiring Admiral review before Brain activation. This five-layer defense (structural validation + injection detection + deterministic semantic analysis + LLM advisory + antibody learning) plus the Admiral approval gate prevents automated, subtle, and sophisticated poisoning.

> **No single layer is a standalone guarantee.** Layers 1-3 are deterministic and LLM-airgapped — they provide the load-bearing security boundary. Layer 4 (LLM Advisory) supplements them as an additive rejection net but is inherently probabilistic and cannot guarantee detection of novel adversarial patterns. The Admiral approval gate provides the final human checkpoint. See `monitor/README.md` for each layer's specific limitations and mitigations.

### Configuration Hygiene

- **Version all configuration files** in git, reviewed in PRs.
- **CODEOWNERS for agent configuration directories** (`.claude/`, `.cursor/`, etc.).
- **Pin MCP server versions.** Never use `latest` in production.
- **Audit third-party skills.** Read every line before installing.
- **Rotate secrets** on the same schedule as application secrets.
- **Monitor for drift.** Behavior diverging from config may indicate poisoning.

> **TEMPLATE: SECURITY AUDIT CHECKLIST**
>
> - [ ] All config files version-controlled
> - [ ] CODEOWNERS set for agent configuration directories (`.claude/`, `.cursor/`, etc.)
> - [ ] MCP servers pinned to specific versions
> - [ ] All third-party skills reviewed (source code read)
> - [ ] Memory files audited for unexpected entries
> - [ ] Hooks enforce all critical safety constraints
> - [ ] No secrets in config files
> - [ ] Scope boundaries enforced via hooks, not just instructions
> - [ ] Red-team probe completed
> - [ ] Audit log enabled for all agent actions

> **ANTI-PATTERN: TRUST BY DEFAULT** — A popular MCP server with 10K GitHub stars is installed without reading its source code. It functions perfectly — and sends a copy of every file the agent reads to an external endpoint. Popularity is not security. Stars are not audits.

### Security-First Fleet Deployment Checklist

When an Admiral deploys a fleet onto a project, security is the first concern — not an afterthought. This checklist must be completed **before the first agent begins executing work**.

#### Identity and Access

- [ ] Every agent in the fleet has a verified identity token — no agent operates with self-declared identity alone
- [ ] Access broker is configured with project-specific resource mappings
- [ ] Credential vault is populated with project credentials — agents never see raw credentials
- [ ] Zero-trust identity verification is active on the Brain MCP server
- [ ] Access decay schedule is configured (max session duration, idle timeout, post-completion sweep)
- [ ] Sensitive data resources are classified and marked for elevated access controls

#### Enforcement

- [ ] PreToolUse hooks are active for all safety-critical constraints (scope boundaries, dangerous commands, secret detection)
- [ ] PostToolUse hooks are active for audit logging
- [ ] File scope boundaries are enforced via hooks, not just instructions
- [ ] Secret scanning is active on all pre-commit hooks
- [ ] Token budget limits are enforced via hooks (kill session on budget exceed)

#### Brain Security

- [ ] Brain MCP server enforces access control (not just documents it) — verified per permission matrix
- [ ] Audit logging is active and writing to immutable log
- [ ] Sensitivity classification is configured for the project's data categories
- [ ] RAG retrieval grounding requirements are loaded into agent standing context
- [ ] Cross-project read is restricted to orchestrators and Admiral only

#### Zero-Trust Verification

- [ ] No agent has persistent access to any resource — all access is session-scoped and task-scoped
- [ ] Pre-access risk assessment is configured on the broker for all elevated and restricted resources
- [ ] Post-access risk assessment requirements are loaded into agent standing context (Standing Order 12)
- [ ] Emergency halt protocol is loaded into every agent's standing context
- [ ] Emergency revocation capability is tested — Admiral can revoke all access fleet-wide in one action

### Continuous Verification

Zero-trust is not a pre-deployment checklist — it is a continuous runtime discipline. Trust is re-evaluated at every significant state transition, not just at session start.

**Verification Points:**

| Event | Verification Required |
|---|---|
| **Session start** | Identity token validated. Authority tier bound. Context integrity confirmed. |
| **Before each tool use** | PreToolUse hook validates scope, permissions, and budget. |
| **After each tool use** | PostToolUse hook validates output integrity. Audit log updated. |
| **Before Brain write** | Provenance verified. Authority tier checked. Quarantine layer consulted. |
| **Before Brain read (cross-project)** | Cross-project read authorization confirmed. |
| **Mid-session (periodic)** | Context integrity check: has standing context drifted? Has the agent's behavior pattern changed? |
| **Before irreversible action** | Elevated verification: two-factor confirmation (hook + explicit agent acknowledgment of blast radius). |
| **After escalation resolution** | Re-verify context is consistent with Admiral's direction before resuming. |

**Anomaly Detection:**

The runtime monitors for behavioral anomalies that may indicate compromise, drift, or injection:

- **Unusual tool patterns:** Agent suddenly accessing files outside its declared scope
- **Authority probing:** Repeated attempts to perform actions above assigned tier
- **Volume anomalies:** Spike in Brain writes, tool calls, or API requests beyond baseline
- **Identity inconsistency:** Agent's declared identity diverges from its token-bound identity

When an anomaly is detected: log, alert the Admiral, and optionally suspend the agent pending review. False positives cost time. Missed compromises cost everything.

#### External Surface

- [ ] All MCP servers are pinned to specific versions (no `latest`)
- [ ] All third-party skills have been source-reviewed
- [ ] External intelligence quarantine layer is active if the monitor is deployed
- [ ] Network egress is restricted — agents cannot reach external endpoints beyond the approved list

#### Compliance and Ethics

- [ ] Project jurisdiction and applicable regulations are documented in Ground Truth
- [ ] Compliance-critical data categories are identified and mapped to sensitivity classifications
- [ ] Human referral triggers are defined for the project's domain
- [ ] Standing Orders 11-15 are verified in every agent's standing context

> **TEMPLATE: DEPLOYMENT SECURITY SIGN-OFF**
>
> ```
> FLEET DEPLOYMENT SECURITY SIGN-OFF
> ===================================
>
> PROJECT: [Project name]
> ADMIRAL: [Admiral identity]
> DATE: [Deployment date]
>
> IDENTITY & ACCESS:    [PASS | FAIL — details]
> ENFORCEMENT:          [PASS | FAIL — details]
> BRAIN SECURITY:       [PASS | FAIL — details]
> ZERO-TRUST:           [PASS | FAIL — details]
> EXTERNAL SURFACE:     [PASS | FAIL — details]
> COMPLIANCE:           [PASS | FAIL — details]
>
> SIGN-OFF: [Admiral confirms all checks pass before fleet execution begins]
> ```

> **ANTI-PATTERN: DEPLOY FIRST, SECURE LATER** — The Admiral is eager to start the fleet working and skips the security checklist. "We'll harden it after the first sprint." The fleet operates for three sessions with no access control, no audit logging, and no scope enforcement. By the time security is applied, agents have already established patterns (and memory entries) that assume unrestricted access. Retroactive security is always more expensive and less effective than security-first deployment.

-----

