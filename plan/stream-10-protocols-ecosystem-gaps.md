# Stream 10: Protocols, Data Ecosystem & Additional Spec Gaps (Spec Parts 11, 12)

> *"Protocols without tooling are suggestions. Tooling without protocols is chaos." — The Admiral Philosophy*

**Current score:** 3/10 | **Target:** 8/10

Protocols have partial implementation through standing orders but no tooling. Data ecosystem has no feedback loops or ecosystem agents.

---

### 10.1 Protocol Completeness (Part 11)

The spec defines several operational protocols. Some have partial implementation through standing orders; none have tooling support.

- [ ] **S-26: Human referral protocol tooling**
  - **Description:** Template renderer and routing mechanism for human professional referrals. When an agent determines a task requires human expertise (legal review, medical advice, specialized engineering), it generates a structured referral report that a human can act on — not a vague "ask a human" but a complete brief with context, findings so far, and specific questions.
  - **Done when:** Agents can generate structured referral reports from a template, reports include context summary/findings/specific questions/urgency level, routing mechanism directs reports to appropriate human role.
  - **Files:** `admiral/protocols/human-referral.sh` (new), `admiral/templates/human-referral.md` (new)
  - **Size:** M
  - **Spec ref:** Part 11

- [ ] **S-27: Paid resource authorization broker**
  - **Description:** Credential vault, cost tracking, and session-scoped allocation for paid tool access. When agents need to use paid APIs or services, the broker manages credentials (never exposed to agents directly), tracks costs against budgets, and allocates usage within session-scoped limits to prevent runaway spending.
  - **Done when:** Broker manages credential storage (encrypted at rest), tracks per-session and per-agent costs, enforces budget limits (blocks requests exceeding budget), provides cost reporting, credentials never appear in agent context or logs.
  - **Files:** `admiral/protocols/resource-broker.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 11

- [ ] **S-28: Context budget validation**
  - **Description:** Validate that context profile allocations sum to 100% and fall within spec-defined ranges: Standing Orders 15-25%, Session Context 50-65%, Working Memory 20-30%. Invalid allocations waste context window capacity or leave agents without sufficient working memory.
  - **Done when:** Invalid allocations are detected and warned at session start, allocations outside spec ranges trigger warnings, allocations not summing to 100% trigger errors, integrates with session start hook.
  - **Files:** `admiral/lib/context_budget.sh` (new), `.hooks/session_start_adapter.sh`
  - **Size:** S
  - **Spec ref:** Part 11

---

### 10.2 Data Ecosystem (Part 12)

The spec defines a data ecosystem where agents both consume and produce knowledge through the Brain. Current Brain implementation supports storage and retrieval but has no feedback loops or ecosystem agents.

- [ ] **S-29: Feedback loop reference implementation**
  - **Description:** Implement one end-to-end feedback loop connecting Brain query results to agent performance measurement to Brain content improvement. When an agent uses Brain knowledge and the outcome is measurable (test passes, review accepted, task completed successfully), that outcome feeds back to improve the Brain entry's confidence score and relevance ranking.
  - **Done when:** One complete feedback loop is operational — Brain entry is queried, agent uses it, outcome is measured, outcome updates Brain entry metadata (confidence, usage count, last-success timestamp), subsequent queries benefit from updated metadata.
  - **Files:** `admiral/data-ecosystem/feedback-loop.sh` (new)
  - **Size:** L
  - **Spec ref:** Part 12

- [ ] **S-30: Ecosystem agent prototype**
  - **Description:** Build one of the 5 spec-defined ecosystem agents. Recommended starting point: the simplest agent that connects to the existing Brain infrastructure — likely a "knowledge gardener" that identifies stale Brain entries (not queried in N days), low-confidence entries (repeated negative feedback), and contradictory entries (conflicting advice on the same topic).
  - **Done when:** Agent runs autonomously on a schedule, queries Brain for maintenance targets, produces a structured report of recommended actions (archive stale, flag low-confidence, reconcile contradictions), can optionally execute maintenance actions with approval.
  - **Files:** `admiral/data-ecosystem/agent/` (new)
  - **Size:** L
  - **Spec ref:** Part 12

---

### Additional Spec Gaps

- [ ] **S-31: Context engineering profiles** — Implement 3 context profiles (SO 15-25%, Session 50-65%, Working Memory 20-30%). Done when: Profiles defined, allocations tracked. Files: `admiral/lib/context_profiles.sh` (new). Size: M. Spec ref: Part 2

- [ ] **S-32: Token budget enforcement** — Enforce session/tool token budgets. Done when: Budgets enforced, alerts on limits. Files: `.hooks/token_budget_tracker.sh`, `admiral/lib/token_budget.sh` (new). Size: M. Spec ref: Part 2, SO-15

- [ ] **S-33: Model tier selection engine** — Tier 1 Opus, Tier 2 Sonnet, Tier 3 Haiku. Done when: Selection based on task type. Files: `control-plane/src/model-tiers.ts` (new). Size: M. Spec ref: Part 3

- [ ] **S-34: File ownership rules engine** — Per-agent file ownership with globs. Done when: Rules loaded, validated. Files: `admiral/fleet/file_ownership.sh` (new). Size: M. Spec ref: Part 3

- [ ] **S-35: Agent lifecycle management** — States: idle, active, suspended, terminated. Done when: States tracked, transitions validated. Files: `admiral/fleet/lifecycle.sh` (new). Size: M. Spec ref: Part 3

- [ ] **S-36: Checkpoint and recovery** — SO-07 checkpointing. Done when: Checkpoints at intervals, recovery works. Files: `admiral/lib/checkpoint.sh` (new). Size: L. Spec ref: SO-07

- [ ] **S-37: Communication format enforcement** — SO-09 structured output. Done when: Outputs validated. Files: `admiral/lib/comm_format.sh` (new). Size: S. Spec ref: SO-09

- [ ] **S-38: Bias detection** — SO-13 bias awareness. Done when: Bias patterns detected. Files: `admiral/lib/bias_detect.sh` (new). Size: M. Spec ref: SO-13

- [ ] **S-39: Compliance and ethics** — SO-14 for regulated domains. Done when: Domain rules enforced. Files: `admiral/lib/compliance.sh` (new). Size: M. Spec ref: SO-14

- [ ] **S-40: Inter-agent communication** — Structured agent-to-agent messages. Done when: Schema defined, routing works. Files: `admiral/protocols/inter-agent-comm.sh` (new). Size: L. Spec ref: Part 5

- [ ] **S-41: Session state versioning** — Version session state schema. Done when: Auto-migrated on load. Files: `admiral/lib/state.sh`. Size: M. Spec ref: Part 11

- [ ] **S-42: Hook manifest validation** — Validate against manifest.schema.json. Done when: All validated, CI enforces. Files: `admiral/tests/test_hook_manifests.sh` (new). Size: S. Spec ref: Part 3

- [ ] **S-43: Progressive autonomy** — Trust levels with competence. Done when: Trust tracked, routing aware. Files: `admiral/governance/progressive-autonomy.sh` (new). Size: L. Spec ref: Extensions

---

### 10.3 MCP/A2A Security (from MCP-SECURITY-ANALYSIS.md)

- [ ] **S-44: A2A payload content inspection**
  - **Description:** Treat A2A task content with the same suspicion as external content. Run incoming A2A messages through Layers 1-2 of the quarantine pipeline (deterministic pattern matching, schema validation) before execution. Establish behavioral baselines for each agent's typical output patterns and flag statistically anomalous outputs for quarantine before they propagate to downstream agents. Implement taint tracking — data flowing through the agent mesh carries taint flags indicating which agents contributed to it, with configurable maximum taint depth. This addresses the cascading compromise vector (ATK-0028) and trust transitivity attacks (ATK-0029) from `admiral/MCP-SECURITY-ANALYSIS.md` Section 5.
  - **Done when:** A2A messages pass through quarantine Layers 1-2 before execution. Injection patterns in A2A payloads are detected and blocked. Output anomaly detection flags unusual agent behavior. Taint tracking records agent contribution chain. Tests verify cascade containment with synthetic compromise scenarios.
  - **Files:** `admiral/protocols/a2a_content_inspector.sh` (new), `admiral/tests/test_a2a_content_inspection.sh` (new)
  - **Size:** L
  - **Spec ref:** MCP-SECURITY-ANALYSIS.md Rec 8; Part 4 A2A Protocol Security; ATK-0028, ATK-0029
  - **Depends on:** S-40 (inter-agent communication)

- [ ] **S-45: Data classification tags and cross-server flow control**
  - **Description:** Introduce sensitivity labels (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`) that attach to data at the point of origin. MCP server tool responses carry the classification of the data they return. Each MCP server is assigned a maximum sensitivity level it can receive. Cross-classification transfers (data from a higher-sensitivity server to a lower-sensitivity destination) require explicit Admiral authorization. Data objects carry origin metadata through the pipeline, enabling audit trails showing how sensitive data moved between servers and agents. This addresses the cross-server exfiltration vector (ATK-0026) from `admiral/MCP-SECURITY-ANALYSIS.md` Section 4.4.
  - **Done when:** Data classification labels are defined and enforced. Server sensitivity ceilings are configurable. Cross-classification transfers require approval gates. Provenance tracking follows data through the pipeline. Tests verify label enforcement and transfer gates.
  - **Files:** `admiral/protocols/data_classification.sh` (new), `admiral/config/server_sensitivity.json` (new), `admiral/tests/test_data_classification.sh` (new)
  - **Size:** L
  - **Spec ref:** MCP-SECURITY-ANALYSIS.md Rec 11; OWASP MCP10; ATK-0026; Part 4, Part 8
  - **Depends on:** —

---

### Summary

| Subsection | Items | Sizes | Spec Parts Covered |
|---|---|---|---|
| 10.1 Protocol Completeness | S-26 through S-28 | 1L + 1M + 1S | Part 11 |
| 10.2 Data Ecosystem | S-29 through S-30 | 2L | Part 12 |
| Additional Spec Gaps | S-31 through S-43 | 4L + 7M + 2S | Parts 2, 3, 5, 11, SO-07, SO-09, SO-13, SO-14, Extensions |
| 10.3 MCP/A2A Security | S-44 through S-45 | 2L | MCP-SECURITY-ANALYSIS Recs 8, 11 |
| **Totals** | **20 items** | **9L + 8M + 3S** | **11 spec areas** |
