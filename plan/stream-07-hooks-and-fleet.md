# Stream 7: Missing Hooks & Fleet Orchestration (Spec Parts 3)

> *"A specification without implementation is a wish list." — The Admiral Philosophy*

**Current score:** 3/10 | **Target:** 8/10

The spec requires 15 hooks — only 8 are implemented. Zero fleet orchestration code exists.

---

### 7.1 Missing Hooks (Part 3 — Enforcement)

The spec requires 15 hooks. 8 are implemented. 4 are missing entirely, and the relationship between hooks and Standing Orders is undocumented.

- [ ] **S-01: identity_validation.sh**
  - **Description:** Validates agent identity token at session start. Confirms the agent has a valid identity matching its claimed role. Rejects agents that cannot prove their identity against the fleet registry, preventing impersonation and unauthorized task execution.
  - **Done when:** Hook fires at SessionStart, validates identity fields (agent ID, role, tier) against registry, blocks invalid identities with exit code 2, logs validation result to state.
  - **Files:** `.hooks/identity_validation.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 3, SO-01

- [ ] **S-02: tier_validation.sh**
  - **Description:** Validates that the model tier assigned to an agent matches the requirements defined in the spec. Ensures high-capability tasks (architecture decisions, security reviews) are not silently assigned to low-tier models, which would degrade output quality without any warning.
  - **Done when:** Hook validates tier assignment against agent role requirements, warns on mismatch (exit 0 with warning), blocks critical mismatches (exit 2), integrates with session start flow.
  - **Files:** `.hooks/tier_validation.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 3, E2+

- [ ] **S-03: governance_heartbeat_monitor.sh**
  - **Description:** Monitors governance agent health by checking heartbeat signals. Ensures governance agents (Sentinel, Arbiter) are responsive and functioning. A governance agent that silently fails leaves all governed agents unmonitored, creating a single point of failure in the trust hierarchy.
  - **Done when:** Hook emits heartbeat check on configurable interval, alerts on missing heartbeat after threshold, logs heartbeat history to state, integrates with alerting pipeline (S-15 when available).
  - **Files:** `.hooks/governance_heartbeat_monitor.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 3, E3+

- [ ] **S-04: protocol_registry_guard.sh**
  - **Description:** Enforces SO-16 protocol governance rules with two enforcement surfaces: (1) **Protocol change governance** — validates that protocol changes (new protocols, modifications, deprecations) go through proper approval workflow rather than being unilaterally modified by individual agents. (2) **MCP server registration enforcement** — intercepts every PreToolUse event, extracts the target server identifier, and compares against the approved MCP server registry. Calls to unregistered MCP servers are hard-blocked. This directly resolves spec debt item SD-06 and closes the OWASP MCP09 (shadow server) gap identified in `admiral/MCP-SECURITY-ANALYSIS.md` Recommendation 2.
  - **Done when:** Hook validates protocol modifications against SO-16 rules (approval required, versioning enforced, backwards compatibility checked), blocks unauthorized protocol changes with exit code 2. Hook also maintains an approved MCP server registry (populated during Part 13 addition process), blocks calls to unregistered servers, and logs all blocked attempts with requesting agent identity and target endpoint.
  - **Files:** `.hooks/protocol_registry_guard.sh` (new), `admiral/config/approved_mcp_servers.json` (new)
  - **Size:** L
  - **Spec ref:** Part 3, SO-16, Part 13 S2, MCP-SECURITY-ANALYSIS.md Rec 2
  - **Depends on:** —

- [ ] **S-04b: Hook input/output contract specification**
  - **Description:** Document the formal input/output contracts for all hooks. Each hook receives structured JSON on stdin (`{ "event": "<EventType>", "tool": "<ToolName>", "params": { ... }, "agent_identity": "...", "trace_id": "..." }`). Output contract: exit code 0 = pass, non-zero = block. Stdout is captured and fed back to the agent as context. Stderr is logged. Hooks are synchronous executables with a 30s default timeout. Multiple hooks on the same event execute in declared order, fail-fast. Document per-hook JSON input shapes (e.g., `token_budget_tracker` receives `session_state.tokens_used` and `session_state.token_budget`; `loop_detector` receives `result.exit_code` and `result.error`). Create machine-readable contract schemas for each hook.
  - **Done when:** Contract spec exists with JSON schemas for every hook's input payload. Output contract (exit codes, stdout semantics, stderr logging) is documented. Per-hook input shapes are specified for all 15 hooks. Contract schemas are validateable by tooling.
  - **Files:** `admiral/docs/hook-contracts.md` (new), `admiral/hooks/schemas/` (new directory with per-hook JSON schemas)
  - **Size:** M
  - **Spec ref:** Part 3, Hook Execution Model

- [ ] **S-05: Standing Orders enforcement map**
  - **Description:** Document which hooks enforce which Standing Orders. Creates a complete mapping of all 16 Standing Orders to their enforcement mechanism — whether enforced by a hook (automated), by instruction embedding (agent-side), or by guidance only (advisory). This map is the accountability ledger for the entire governance system.
  - **Done when:** `admiral/docs/standing-orders-enforcement-map.md` exists with complete mapping of all 16 SOs, each entry identifies enforcement type (hook/instruction/guidance), lists the specific file(s) responsible, and notes any enforcement gaps.
  - **Files:** `admiral/docs/standing-orders-enforcement-map.md` (new)
  - **Size:** M
  - **Spec ref:** Part 3

---

### 7.2 Fleet Orchestration (Part 3 — Fleet Composition)

The spec defines 71 agent roles. Zero fleet orchestration code exists. Without orchestration, agents are manually assigned — defeating the purpose of a multi-agent framework.

- [ ] **S-06: Agent registry**
  - **Description:** Runtime registry mapping agent ID to capabilities, routing rules, model tier, and tool permissions. This is the foundational data structure that all fleet operations depend on. Without a registry, every other fleet feature must hardcode agent knowledge.
  - **Done when:** Registry loads from configuration file, validates entries against spec constraints (valid tiers, no conflicting permissions), provides lookup API (by ID, by capability, by tier), returns structured JSON responses.
  - **Files:** `admiral/fleet/registry.sh` (new) or `control-plane/src/fleet-registry.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 3

- [ ] **S-07: Task routing engine**
  - **Description:** Routes tasks to agents based on task type, file ownership rules, agent capability scores, and current agent load. The router is the brain of fleet orchestration — it decides which agent handles which work, replacing manual assignment with capability-aware dispatch.
  - **Done when:** Router accepts task description, queries registry for capable agents, applies routing rules (file ownership, specialization, tier requirements), selects optimal agent, returns routing decision with justification.
  - **Files:** `control-plane/src/task-router.ts` (new)
  - **Size:** L
  - **Spec ref:** Part 3

- [ ] **S-08: Tool permission matrix**
  - **Description:** Enforces per-agent tool permissions — which tools each agent may use, which are denied, and which require approval. The spec defines available and denied tool lists per agent; this item makes those lists enforceable at runtime rather than advisory.
  - **Done when:** Tool use is validated against the agent's allowed tool list before execution, denied tools are blocked with clear error messages, permission matrix is loaded from configuration, integrates with pre_tool_use hook.
  - **Files:** `admiral/fleet/permissions.json` (new), `.hooks/pre_tool_use_adapter.sh`
  - **Size:** M
  - **Spec ref:** Part 3

- [ ] **S-09: Fleet configuration validator**
  - **Description:** Validates fleet configuration against all spec-defined constraints: 1-12 agents per fleet, no overlap between available and denied tool lists, no routing conflicts (two agents claiming exclusive ownership of the same file pattern), valid tier assignments.
  - **Done when:** Validator catches all spec-defined invalid configurations, produces actionable error messages, runs as pre-flight check before fleet deployment, returns structured validation report.
  - **Files:** `admiral/fleet/validate_config.sh` (new)
  - **Size:** M
  - **Spec ref:** Part 3

---

## Summary

| Item | Description | Size | Spec Ref |
|---|---|---|---|
| S-01 | identity_validation.sh | M | Part 3, SO-01 |
| S-02 | tier_validation.sh | M | Part 3, E2+ |
| S-03 | governance_heartbeat_monitor.sh | M | Part 3, E3+ |
| S-04 | protocol_registry_guard.sh | L | Part 3, SO-16, MCP-SECURITY-ANALYSIS Rec 2 |
| S-05 | Standing Orders enforcement map | M | Part 3 |
| S-06 | Agent registry | L | Part 3 |
| S-07 | Task routing engine | L | Part 3 |
| S-08 | Tool permission matrix | M | Part 3 |
| S-09 | Fleet configuration validator | M | Part 3 |

**Totals:** 9 items — 3L + 6M across two subsections, all targeting Part 3 of the spec.

**Critical path:** S-06 (registry) must be implemented first — it is a hard dependency for S-07 (routing), S-08 (tool permissions), and S-09 (fleet validation). S-05 (enforcement map) is a prerequisite for identifying remaining hook gaps. Recommended order: S-05 → S-06 → S-01 through S-04 → S-08 → S-09 → S-07.
