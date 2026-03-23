# SD-04: Standing Orders Enforcement Map Completion

> For each of the 8 advisory-only SOs, propose a hook or document why it is inherently advisory with alternative monitoring. Address the SO-14 (Compliance, Ethics, Legal) safety-tier gap specifically.
>
> Date: 2026-03-20

---

## Current State

| Level | SOs Covered | Status |
|-------|------------|--------|
| E1 (Runtime Essentials) | SO-01, SO-06, SO-10 (budget), SO-11 | Achieved |
| E2 (Boundary Enforcement) | SO-03, SO-10 (full), SO-12, SO-15 | Current |
| E3 (Full Coverage) | SO-02, SO-04, SO-05, SO-07, SO-08, SO-09, SO-13, SO-14, SO-16 | Target |

**Hook-enforced:** 8/16 (SO-01, SO-03, SO-06, SO-08 partial, SO-10, SO-11, SO-12, SO-15)
**Advisory-only:** 8/16 (SO-02, SO-04, SO-05, SO-07, SO-09, SO-13, SO-14, SO-16)

---

## Advisory-Only Standing Orders: Proposals

### SO-02: Output Routing

| Field | Value |
|-------|-------|
| **Nature** | Operational — route outputs to correct destination |
| **Can it be mechanically enforced?** | Partially. Structural checks (output has destination field) are mechanical. Routing correctness requires semantic understanding. |
| **Proposal** | Implement `output_routing_validator` (PostToolUse) that validates: (1) outputs to external systems include explicit destination, (2) file writes target expected directories per task scope, (3) git operations target expected branches. |
| **Enforcement type** | Advisory — flag misrouted outputs, never block |
| **Implementation stream** | Stream 7, task S-04b or new subtask |
| **Priority** | Low — misrouting is rare and self-correcting |

### SO-04: Context Honesty

| Field | Value |
|-------|-------|
| **Nature** | Critical — agents must declare confidence level and assumptions |
| **Can it be mechanically enforced?** | No. Confidence assessment and assumption declaration are inherently judgment activities. An agent cannot mechanically verify its own honesty. |
| **Why inherently advisory** | Context honesty requires metacognition — the ability to assess what you know vs. don't know. No deterministic check can validate whether an agent's confidence claim is accurate. |
| **Alternative monitoring** | (1) Track escalation rate vs. error rate — low escalation + high error suggests overconfidence. (2) Post-hoc analysis of assumptions that proved wrong. (3) Brain B2+ can store assumption-outcome pairs for pattern detection. |
| **Proposal** | No hook. Monitor via metrics in Brain entries. Flag agents with >3 failed assumptions per session in post-session audit. |
| **Priority** | N/A — inherently advisory |

### SO-05: Decision Authority

| Field | Value |
|-------|-------|
| **Nature** | Operational — agents must respect Autonomous/Propose/Escalate tiers |
| **Can it be mechanically enforced?** | Partially. Some decision tier boundaries can be detected deterministically (e.g., architecture changes, new dependencies, scope changes). |
| **Proposal** | Implement `decision_authority_enforcer` (PreToolUse) that: (1) detects high-impact file operations (new directories, schema changes, dependency additions), (2) checks against the Decision Authority table in AGENTS.md, (3) blocks Escalate-tier actions without prior Admiral approval. |
| **Enforcement type** | Hard-block for Escalate-tier; advisory for Propose-tier |
| **Implementation stream** | Stream 7, new task or S-04b extension |
| **Priority** | Medium — prevents unauthorized high-impact changes |

### SO-07: Checkpointing

| Field | Value |
|-------|-------|
| **Nature** | High — agents must checkpoint assumptions, decisions, blockers |
| **Can it be mechanically enforced?** | Partially. Checkpoint artifact existence is mechanical (file exists, has required fields). Checkpoint completeness and accuracy require judgment. |
| **Why partially advisory** | A checkpoint file can exist but contain garbage. Validating that recorded assumptions are accurate requires semantic understanding. |
| **Alternative monitoring** | (1) Track checkpoint frequency — warn if no checkpoint after N tool calls. (2) Validate checkpoint JSON structure against schema. (3) Brain B1 stores checkpoints; post-session audit can flag sessions with zero checkpoints. |
| **Proposal** | Implement `checkpoint_reminder` (PostToolUse, every 20th call) that: (1) checks if a checkpoint has been created this session, (2) warns if no checkpoint exists after 20+ tool calls, (3) validates checkpoint JSON structure if file exists. Advisory only. |
| **Priority** | Low — useful but not blocking |

### SO-09: Communication Format

| Field | Value |
|-------|-------|
| **Nature** | High — structured communication with AGENT, TASK, STATUS fields |
| **Can it be mechanically enforced?** | Partially. Structural elements (required fields present) are mechanical. Content quality requires judgment. |
| **Proposal** | No separate hook recommended. Communication format is enforced by the session start adapter (loads standing orders with format requirements) and by Brain entry schema validation. Adding a PostToolUse hook to parse every output for format compliance would be high-overhead and low-value. |
| **Alternative monitoring** | Brain entry validation already enforces structured format for persistent records. Ephemeral communication format is best enforced by context loading. |
| **Priority** | N/A — adequately covered by context loading |

### SO-13: Bias Awareness

| Field | Value |
|-------|-------|
| **Nature** | High — metacognitive discipline to recognize and counteract biases |
| **Can it be mechanically enforced?** | No. Bias recognition is inherently a judgment activity. An agent cannot mechanically verify whether it has considered anchoring bias, confirmation bias, or sunk cost fallacy. |
| **Why inherently advisory** | Bias awareness requires introspection and counterfactual thinking. No deterministic rule can detect "this agent is anchored on its first approach and ignoring better alternatives." |
| **Alternative monitoring** | (1) Post-session analysis: flag sessions where first approach was never revised despite errors. (2) Brain B2+ can track "approach persistence" — how often an agent abandons failing strategies. (3) Sycophantic drift detection (spec-defined: >30% finding decrease triggers review). |
| **Proposal** | No hook. Monitor via post-session metrics. The sycophantic drift detection threshold (GAP-10, resolved) provides one mechanical signal. |
| **Priority** | N/A — inherently advisory |

### SO-14: Compliance, Ethics, Legal — CRITICAL GAP

| Field | Value |
|-------|-------|
| **Nature** | **Safety-tier** — legal/regulatory compliance, ethical boundaries |
| **Can it be mechanically enforced?** | Partially. Configurable deny-lists for restricted actions, entities, and data categories can be enforced deterministically. Ethical judgment cannot. |
| **Why this is a critical gap** | SO-14 is the only safety-tier standing order with zero deterministic enforcement. All other critical SOs (SO-01, SO-03, SO-06, SO-10, SO-12, SO-15) have hooks. A compliance violation discovered post-hoc has higher blast radius than other SO violations. |
| **Proposal** | Implement `compliance_boundary_check` (PreToolUse) that: (1) maintains a configurable deny-list of restricted actions/entities/data categories at `admiral/config/compliance_boundaries.json`, (2) checks file writes and Bash commands against the deny-list, (3) hard-blocks on deny-list match with mandatory Admiral escalation, (4) logs all compliance checks to audit trail. |
| **Enforcement type** | Hard-block on deny-list match; advisory for edge cases |
| **Implementation stream** | Stream 29, new SO-14 enforcement task |
| **Priority** | **HIGH** — safety-tier gap must be closed before E3 |
| **Deny-list categories** | PII patterns (SSN, credit card, email in bulk), regulated data markers (HIPAA, PCI, GDPR), restricted operations (external API calls to unapproved endpoints, data export to unapproved destinations) |

### SO-16: Protocol Governance

| Field | Value |
|-------|-------|
| **Nature** | Operational — MCP server vetting and A2A connection approval |
| **Can it be mechanically enforced?** | Partially. Server name validation against an approved registry is fully mechanical. Trust classification and security review require judgment. |
| **Proposal** | Implement `protocol_registry_guard` (PreToolUse) that: (1) maintains an approved server registry at `admiral/config/approved_servers.json`, (2) intercepts MCP tool calls and validates server name against registry, (3) blocks calls to unapproved servers, (4) validates version pins (reject "latest"). |
| **Enforcement type** | Hard-block on unapproved server; advisory on version concerns |
| **Implementation stream** | Stream 7, task S-04 |
| **Priority** | Medium — blocks S-04 in Stream 7; needed before MCP integration (Phase 5) |

---

## Summary: Enforcement Map Completion

| SO | Current | Proposed | Inherently Advisory? | Hook Needed |
|----|---------|----------|---------------------|-------------|
| SO-02 | Advisory | Advisory + hook | No | `output_routing_validator` (low priority) |
| SO-04 | Advisory | Advisory + metrics | **Yes** | None — monitor via Brain metrics |
| SO-05 | Advisory | Partially enforced | No | `decision_authority_enforcer` (medium priority) |
| SO-07 | Advisory | Advisory + reminder | No | `checkpoint_reminder` (low priority) |
| SO-09 | Advisory | Advisory (adequate) | Partially | None — covered by context loading |
| SO-13 | Advisory | Advisory + metrics | **Yes** | None — monitor via post-session analysis |
| SO-14 | Advisory | **Partially enforced** | No | **`compliance_boundary_check` (HIGH priority)** |
| SO-16 | Advisory | Partially enforced | No | `protocol_registry_guard` (medium priority) |

### Inherently Advisory (3 SOs — no hook will help)
- **SO-04** (Context Honesty) — metacognitive; cannot self-verify
- **SO-09** (Communication Format) — adequately covered by context loading
- **SO-13** (Bias Awareness) — metacognitive; no deterministic signal

### Proposed New Hooks (5 SOs)
1. **`compliance_boundary_check`** — SO-14 — **HIGH priority** (safety-tier gap)
2. **`decision_authority_enforcer`** — SO-05 — Medium priority
3. **`protocol_registry_guard`** — SO-16 — Medium priority (already tracked as S-04)
4. **`output_routing_validator`** — SO-02 — Low priority
5. **`checkpoint_reminder`** — SO-07 — Low priority

### E3 Target After Implementation
With the 5 proposed hooks: **13/16 SOs with hook enforcement (81%)**, exceeding the 80%+ target in benchmarks.md. The 3 inherently advisory SOs (SO-04, SO-09, SO-13) have documented alternative monitoring strategies.
