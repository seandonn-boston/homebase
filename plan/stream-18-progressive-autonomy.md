# Stream 18: Progressive Autonomy — Trust That Scales

> *"Full autonomy is a destination, not a starting point." — Admiral Spec, Progressive Autonomy Extension*

**Scope:** This stream implements the progressive autonomy framework from the extension spec. Trust levels govern how much independence agents have: how many decisions require human confirmation, how many actions execute autonomously, and when the system promotes or demotes agents based on demonstrated competence. The four stages — Manual Oversight, Assisted Automation, Partial Autonomy, Full Autonomy — coexist within the same fleet, with different capabilities at different stages simultaneously.

**Current state:** The progressive autonomy extension spec defines four stages, trust accumulation mechanics, trust decay, stage transition criteria, and infrastructure requirements per stage. The fleet control plane extension describes the operator interfaces for each stage. None of this is implemented. All agents currently operate at a fixed authority level defined at session start with no dynamic trust adjustment. Trust does not persist across sessions. There is no mechanism for earning or losing autonomy based on outcomes.

**Why this matters:** Without progressive autonomy, Admiral governance is binary: either the human reviews everything (slow, bottlenecked) or the agent acts freely (risky, unmonitored). Trust mechanics create the middle ground where agents earn independence through demonstrated competence. This is what makes fleet operations scale — the operator's attention focuses on the genuinely hard decisions while routine work flows autonomously. Trust that persists across sessions means agents do not start from zero every time, and trust that decays means stale calibration does not mask degraded performance.

---

## AU-01: Trust Level Data Model

- [ ] **AU-01: Define trust levels with transition criteria**
  - **Description:** Implement the trust level data model that represents the four autonomy stages: Stage 1 (Manual Oversight — all decisions are Propose/Escalate), Stage 2 (Assisted Automation — routine decisions are Autonomous, novel/high-risk remain Propose/Escalate), Stage 3 (Partial Autonomy — most decisions are Autonomous, only scope changes/security/architecture are Propose/Escalate), Stage 4 (Full Autonomy — all operational decisions are Autonomous, only strategic changes require human approval). Trust is tracked per agent per category (not globally) — an agent can be Stage 3 for code implementation while Stage 1 for security review. Data model must include: agent_id, category, current_stage, trust_score, consecutive_successes, consecutive_failures, last_exercised timestamp, and stage_transition_history.
  - **Done when:** Trust level data model is defined with TypeScript types. All four stages are represented with their decision authority mappings. Per-category tracking is supported. Stage transition history is recorded. Data model supports serialization for persistence (AU-06). Unit tests verify stage-to-authority mapping for all stage/category combinations.
  - **Files:** `fleet/autonomy/trust-model.ts` (new), `fleet/autonomy/trust-model.test.ts` (new), `fleet/autonomy/types.ts` (new)
  - **Size:** M
  - **Spec ref:** Progressive Autonomy Extension — The Four Stages, Trust Is Not Global

---

## AU-02: Trust Score Calculation

- [ ] **AU-02: Implement trust scoring based on decision outcomes**
  - **Description:** Implement the trust score calculation engine. After every autonomous decision, the outcome is recorded (success, failure, partial). Successful decisions increment the trust score for the relevant category. Failed decisions reset the trust score for that category (not globally). Partial successes increment at a reduced rate. The score calculation must account for decision severity — a successful high-risk autonomous decision carries more weight than a successful low-risk one. Trust scores are the basis for stage promotion and demotion decisions.
  - **Done when:** Trust score engine accepts decision outcomes (success/failure/partial) with category and severity. Scores increment on success, reset on failure, and partially increment on partial success. Score history is maintained for trend analysis. Unit tests verify score calculation for all outcome types and severity levels.
  - **Files:** `fleet/autonomy/trust-scoring.ts` (new), `fleet/autonomy/trust-scoring.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Progressive Autonomy Extension — Trust Accumulation
  - **Depends on:** AU-01

---

## AU-03: Trust-Based Permission Gating

- [ ] **AU-03: Implement trust-based permission gating**
  - **Description:** Implement the mechanism that translates trust levels into concrete permission changes. Higher trust = fewer confirmation prompts, more autonomous decisions. At Stage 1, every decision is Propose (agent recommends, human decides). At Stage 2, routine decisions matching patterns the operator has consistently approved become Autonomous. At Stage 3, most decisions are Autonomous with only scope/security/architecture remaining Propose/Escalate. The gating mechanism must integrate with the existing hook system — hooks that currently enforce Propose-tier behavior must dynamically check the agent's trust level for the relevant category and allow Autonomous execution when trust is sufficient.
  - **Done when:** Permission gating reads the agent's current trust level per category. Hooks dynamically adjust enforcement based on trust level (Propose at Stage 1, Autonomous at Stage 3 for qualifying decisions). The boundary between Autonomous and Propose is configurable per category. Integration test demonstrates the same action requiring approval at Stage 1 and executing autonomously at Stage 3.
  - **Files:** `fleet/autonomy/permission-gate.ts` (new), `fleet/autonomy/permission-gate.test.ts` (new), `.hooks/trust_gate.sh` (new)
  - **Size:** L
  - **Spec ref:** Progressive Autonomy Extension — The Four Stages (decision authority tables), Part 3 — Enforcement
  - **Depends on:** AU-01, AU-02

---

## AU-04: Trust Demotion on Failure

- [ ] **AU-04: Automatic trust reduction when agent makes errors**
  - **Description:** Implement automatic trust demotion when an agent produces failures in a category. A failed autonomous decision in category X resets the trust score for category X and narrows the Autonomous tier to the previous stage for that category. Demotion triggers include: critical failure in an autonomous operation (immediate revert for affected category), quality metrics dropping below red-flag thresholds, major model change (revert to Stage 2 until recalibrated), and security incident (fleet-wide revert to Stage 1 for security-related categories). Demotion must be immediate — there is no grace period for critical failures.
  - **Done when:** Trust demotion fires automatically on failure events. Category-specific demotion does not affect other categories. Critical failures produce immediate demotion. Model changes trigger fleet-wide revert to Stage 2. Security incidents trigger fleet-wide Stage 1 for security categories. All demotion events are logged with reason, previous stage, and new stage. Unit tests verify each demotion trigger.
  - **Files:** `fleet/autonomy/demotion.ts` (new), `fleet/autonomy/demotion.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Progressive Autonomy Extension — Reverting a Stage, Trust Accumulation (failure path)
  - **Depends on:** AU-01, AU-02

---

## AU-05: Trust Promotion on Consistent Success

- [ ] **AU-05: Automatic trust elevation after consistent success**
  - **Description:** Implement automatic trust promotion when an agent demonstrates consistent competence. After N consecutive successes in a category (configurable, default from spec: operator finds themselves rubber-stamping 70%+ of proposals at Stage 1 graduation, exception rate below 15% at Stage 2 graduation), the system proposes a stage promotion. Promotion is not automatic — it requires operator approval (recorded decision). Promotion prerequisites must be verified: graduation signal met over at least 2 weeks, no critical failures in the advancing category within 30 days, infrastructure for the next stage is in place, and operator explicitly approves.
  - **Done when:** Promotion engine detects when graduation criteria are met. Promotion recommendations are surfaced to the operator with supporting metrics (consecutive successes, time period, failure history). Operator can approve or defer. Approved promotions update the trust level immediately. All promotion prerequisites from the spec are checked. Promotion events are logged with full context.
  - **Files:** `fleet/autonomy/promotion.ts` (new), `fleet/autonomy/promotion.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Progressive Autonomy Extension — Advancing a Stage, graduation signals per stage
  - **Depends on:** AU-01, AU-02

---

## AU-06: Trust Persistence Across Sessions

- [ ] **AU-06: Store trust levels in Brain for cross-session persistence**
  - **Description:** Implement trust level persistence so that trust survives session boundaries. Trust levels, scores, and transition history are stored in the Brain as structured entries (category: CONTEXT or a new TRUST category). At session start, the agent's trust state is loaded from the Brain. At session end or at trust state changes, the updated trust state is written back. Must handle trust decay: if an agent has not performed category X work in 30 days (configurable), its trust level for category X resets to the previous stage. This prevents stale calibration from masking degraded performance.
  - **Done when:** Trust state persists across sessions via Brain storage. Session start loads trust state for the active agent. Trust changes are written to Brain immediately (not batched). Trust decay fires for categories not exercised within the configured window. Brain entries for trust state include full history for auditability. Integration test: set trust in session A, verify it loads in session B.
  - **Files:** `fleet/autonomy/persistence.ts` (new), `fleet/autonomy/persistence.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Progressive Autonomy Extension — Trust Decay
  - **Depends on:** AU-01, Stream 16 M-02b (brain_record), Stream 16 M-02a (brain_query)

---

## AU-07: Trust Dashboard

- [ ] **AU-07: Trust level visualization dashboard**
  - **Description:** Implement a trust dashboard that visualizes trust levels, trends, and recent trust-affecting decisions across the fleet. The dashboard shows: per-agent trust levels by category (Stage 1-4 with color coding), trust score trends over time (improving, stable, declining), recent promotions and demotions with reasons, upcoming graduation signals (which agents are close to promotion), trust decay warnings (which categories are approaching the 30-day inactivity threshold), and the autonomy matrix (which capabilities are at which stage fleet-wide, per the spec's Autonomy Matrix table).
  - **Done when:** Trust dashboard renders trust state for all active agents. Trust trends are visualized over configurable time periods. Promotions and demotions are shown with context. Decay warnings surface before decay fires (at 25 days of inactivity). Dashboard data is available via API for the Fleet Control Plane (CP3+ Governance Dashboard). Terminal-based rendering for CP1-level usage.
  - **Files:** `fleet/autonomy/dashboard.ts` (new), `fleet/autonomy/dashboard.test.ts` (new), `fleet/autonomy/dashboard-api.ts` (new)
  - **Size:** L
  - **Spec ref:** Progressive Autonomy Extension — The Autonomy Matrix, Fleet Control Plane extension — CP3 Governance Dashboard
  - **Depends on:** AU-01, AU-06

---

## AU-08: Trust Override Mechanism

- [ ] **AU-08: Human trust override with audit trail**
  - **Description:** Implement the mechanism for humans (Admirals/operators) to manually adjust trust levels. An operator can promote or demote any agent's trust in any category, bypassing the normal graduation criteria. Every override must include a reason and is recorded in the Brain as an auditable decision. Overrides are distinguished from automatic promotions/demotions in the trust history — the dashboard shows whether a trust change was earned (automatic) or imposed (manual override). Override authority is tiered: any operator can demote, only Owner-level operators can promote beyond Stage 2.
  - **Done when:** Operators can manually set trust levels per agent per category via CLI and API. Every override requires a reason string. Overrides are persisted in Brain with operator identity, timestamp, previous stage, new stage, and reason. Override authority is enforced (operator tier check for promotions). Dashboard distinguishes earned vs. overridden trust changes. Unit tests verify override mechanics and authority enforcement.
  - **Files:** `fleet/autonomy/override.ts` (new), `fleet/autonomy/override.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Progressive Autonomy Extension — Stage Transitions, Fleet Control Plane extension — CP3 Interventions
  - **Depends on:** AU-01, AU-06

---

## AU-09: Trust-Aware Routing

- [ ] **AU-09: Route sensitive tasks only to high-trust agents**
  - **Description:** Integrate trust levels into the routing engine (Stream 15, O-01). When routing a task, the routing engine considers not just capability matching but also the agent's trust level for the relevant category. Sensitive tasks (security review, architecture decisions, production deployment) require minimum trust thresholds — a Stage 1 agent cannot receive a production deployment task even if it has the capability. The routing engine must: check trust level against task sensitivity, prefer higher-trust agents when multiple candidates exist, and escalate when no agent meets the trust threshold for a sensitive task.
  - **Done when:** Routing engine checks trust levels when assigning tasks. Tasks with sensitivity annotations (configurable per task type) require minimum trust stages. Lower-trust agents receive lower-sensitivity tasks. No sensitive task routes to an agent below the trust threshold. Escalation fires when no qualifying agent exists. Unit tests verify trust-based routing for high and low sensitivity tasks.
  - **Files:** `fleet/autonomy/trust-routing.ts` (new), `fleet/autonomy/trust-routing.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Progressive Autonomy Extension — The Autonomy Matrix (asymmetric trust per capability), Part 4 — Routing Logic
  - **Depends on:** AU-01, Stream 15 O-01 (routing engine)

---

## AU-10: Trust Reporting and Analytics

- [ ] **AU-11: Admiral approval UI/API for trust promotions**
  - **Description:** Implement the operator-facing interface for approving or deferring trust promotions. Per Part 3's Unified Trust Model, when an agent accumulates 5 consecutive successful decisions in a category, the system presents the promotion for Admiral review. The Admiral approves or defers, and the decision is logged. The interface must: (1) present the promotion recommendation with supporting evidence (consecutive successes, time period, category, failure history), (2) accept approve/defer decisions with required rationale, (3) log decisions in the Brain as auditable entries, (4) be accessible via both CLI (for CP1-level usage) and API (for CP3+ dashboard integration). Stage 2 infrastructure requires pattern recognition — the system identifies which proposals the operator always accepts and suggests promoting them to Autonomous.
  - **Done when:** Promotion recommendations are surfaced via CLI and API. Approve/defer requires rationale. Decisions logged to Brain. Pattern recognition identifies rubber-stamped approvals. API endpoint exists for dashboard integration. Tests verify approval workflow.
  - **Files:** `fleet/autonomy/approval-api.ts` (new), `fleet/autonomy/approval-cli.sh` (new), `fleet/autonomy/approval-api.test.ts` (new)
  - **Size:** M
  - **Spec ref:** Part 3 — Unified Trust Model; Progressive Autonomy Extension — Stage Transitions; Fleet Control Plane Extension — CP3
  - **Depends on:** AU-01, AU-05

- [ ] **AU-10: Fleet-wide trust distribution reports and trend analytics**
  - **Description:** Implement reporting and analytics for trust across the fleet. Generate periodic reports showing: fleet-wide trust distribution (how many agents at each stage, per category), trust velocity (how fast agents are earning trust — time from Stage 1 to Stage 2 on average), demotion frequency (how often and why agents are demoted — recurring failure patterns), trust-cost correlation (does higher trust correlate with lower cost per task, as expected from reduced human review overhead), and operator override frequency (how often humans intervene in trust decisions — high override frequency suggests the automatic criteria need recalibration). Reports feed into the Fleet Evaluation framework (Part 9) for fleet configuration optimization.
  - **Done when:** Trust reports generate on demand and on schedule (weekly default). Reports include all five dimensions listed above. Trust velocity is calculated per agent and per category. Demotion patterns are analyzed for recurring causes. Cost correlation analysis compares review overhead at each trust stage. Reports are stored in Brain for trend analysis across months. Report format is structured (JSON) for programmatic consumption plus human-readable (markdown) for operator review.
  - **Files:** `fleet/autonomy/reporting.ts` (new), `fleet/autonomy/reporting.test.ts` (new)
  - **Size:** L
  - **Spec ref:** Progressive Autonomy Extension — Trust Mechanics, Part 9 — Fleet Evaluation & Benchmarking
  - **Depends on:** AU-01, AU-06, AU-07
