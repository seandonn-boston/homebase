# Stream 27: Context Engineering — Optimal Context Window Utilization

> *"Context is the currency of autonomous AI. Most fleet performance problems that look like capability failures are actually context management failures." — Admiral Spec, Part 2*

**Scope:** Based on Part 2 of the spec. The context window is the agent's working memory — every token matters. This stream implements sophisticated context management to maximize the value of every token: tracking allocations, scoring relevance, compressing when necessary, and ensuring the right information reaches the right agent at the right time in the right format. Context engineering is where Admiral moves from governance framework to performance multiplier.

**Principle:** An agent with perfect instructions and insufficient context will fail. An agent with imperfect instructions and excellent context will succeed. Context engineering is the highest-leverage investment in agent quality.

---

## 27.1 Context Profiles & Budget Tracking

- [ ] **CE-01: Context profile implementation — Implement spec-defined context profiles with allocation tracking**
  - **Description:** Implement the three context zones defined in Part 2 (Standing Context 15-25%, Session Context 50-65%, Working Context 20-30%) as a runtime data model. Each zone tracks: allocated percentage, actual token count, items loaded, loading order, and last refresh timestamp. The implementation must enforce the Context Window Scaling rules: standing context must not exceed 50K tokens regardless of window size, with warnings at 45K. Create a `ContextProfile` data structure that agents declare at session start and that the runtime validates against throughout the session.
  - **Done when:** ContextProfile data model is implemented with three zones. Token allocation tracking is active per zone. The 50K standing context hard limit is enforced. Warning fires at 45K. Profile template from Part 2 (STANDING CONTEXT, SESSION CONTEXT, ON-DEMAND CONTEXT, REFRESH TRIGGERS, SACRIFICE ORDER) is machine-parseable.
  - **Files:** `admiral/context/context_profile.sh` (new), `admiral/context/tests/test_context_profile.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 2, Context Window Strategy; Context Budget Allocation table
  - **Depends on:** —

- [ ] **CE-02: Context budget tracker enhancement — Track actual vs allocated context usage**
  - **Description:** Enhance context tracking to compare actual token usage against allocated budgets per profile zone. The tracker monitors: (1) tokens consumed by standing context (identity, constraints, Ground Truth), (2) tokens consumed by session context (checkpoint, task spec, code), (3) tokens consumed by working context (reasoning, tool outputs). When actual usage exceeds allocated percentage for a zone, the tracker emits a warning and triggers the sacrifice order. Track budget adherence over time to identify zones that consistently over- or under-consume their allocation.
  - **Done when:** Per-zone token counting is implemented. Budget overrun warnings fire when a zone exceeds its allocation. Sacrifice order is triggered on overrun. Historical budget adherence is logged. Dashboard-ready metrics are emitted (JSON format).
  - **Files:** `admiral/context/budget_tracker.sh` (new), `admiral/context/tests/test_budget_tracker.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 2, Context Budget Allocation
  - **Depends on:** CE-01

---

## 27.2 Context Optimization

- [ ] **CE-03: Context compression strategies — Implement compression for long sessions**
  - **Description:** Implement three context compression strategies for when sessions approach context limits: (1) **Summarization** — compress verbose tool outputs into structured summaries preserving key facts, (2) **Prioritization** — rank context items by relevance to current task and evict lowest-ranked items first, (3) **Eviction** — remove items according to the sacrifice order defined in the context profile. The compression engine must preserve: identity and constraints (never compressed), active task context (compressed last), and decision log entries (compressed to key decisions only). Implement the sacrifice order as a configurable priority list per context profile.
  - **Done when:** Three compression strategies are implemented and selectable. Sacrifice order is configurable per profile. Identity and constraints are protected from compression. Compression triggers automatically when context utilization exceeds 85%. Compressed content preserves essential information (validated by reconstruction tests).
  - **Files:** `admiral/context/compression.sh` (new), `admiral/context/tests/test_compression.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 2, Context Window Strategy; Progressive Disclosure
  - **Depends on:** CE-01, CE-02

- [ ] **CE-04: Context relevance scoring — Score context items by task relevance**
  - **Description:** Implement a relevance scoring system that ranks context items against the current task. Scoring dimensions: (1) **Recency** — how recently the item was loaded or referenced, (2) **Frequency** — how often the item has been referenced in the current session, (3) **Semantic proximity** — how closely the item relates to the current task description (keyword overlap, file path proximity), (4) **Authority weight** — enforced constraints score higher than preferences, (5) **Dependency** — items referenced by other high-scoring items inherit relevance. The score determines eviction order during compression and loading priority during context refresh.
  - **Done when:** Relevance scoring produces a ranked list of context items. All 5 scoring dimensions are implemented. Scoring is fast enough for real-time use (< 100ms for 100 items). Eviction uses relevance scores (lowest score evicted first, subject to sacrifice order constraints). Scoring is logged for audit.
  - **Files:** `admiral/context/relevance_scorer.sh` (new), `admiral/context/tests/test_relevance_scorer.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 2, Context Engineering; Five Dimensions of Context
  - **Depends on:** CE-01

- [ ] **CE-05: Context injection ordering — Optimize loading order for model comprehension**
  - **Description:** Implement the Loading Order Protocol from Part 2 as an automated context assembler. The assembler enforces: (1) identity and constraints loaded first (primacy effect — frames all subsequent reasoning), (2) reference material loaded in the middle (available without dominating), (3) current task loaded last (recency effect — directs active focus). The assembler also enforces the primacy vs. recency tension resolution rule: when task instructions conflict with constraints loaded at the top, constraints win. The assembler produces a context payload in the correct order with section markers that the runtime can validate.
  - **Done when:** Context assembler produces correctly ordered payloads. Primacy zone (identity, constraints) is always first. Recency zone (current task) is always last. Section markers delineate zones. Ordering is validated by a PostToolUse hook. Conflict resolution rule (constraints > task instructions) is documented and testable.
  - **Files:** `admiral/context/context_assembler.sh` (new), `admiral/context/tests/test_context_assembler.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 2, Loading Order Protocol
  - **Depends on:** CE-01

---

## 27.3 Context Lifecycle Management

- [ ] **CE-06: Context window utilization dashboard — Visualize context usage across sessions**
  - **Description:** Create a dashboard view (integrated into the control plane) that visualizes how the context window is being used. Display: (1) per-zone utilization as a stacked bar (standing/session/working), (2) utilization over time within a session (line chart showing context growth), (3) top-10 largest context items with their relevance scores, (4) compression events and their impact (how much space was reclaimed), (5) sacrifice order execution log, (6) comparison against the spec-defined allocation targets. The dashboard should highlight anomalies: standing context exceeding 25%, working context growing without checkpoints, context approaching the window limit.
  - **Done when:** Dashboard displays all 6 metrics. Anomaly highlighting works for the 3 defined anomaly types. Data updates in near-real-time from session telemetry. Dashboard is accessible at `/dashboard/context` on the control plane.
  - **Files:** `control-plane/src/context-dashboard.ts` (new), `control-plane/src/context-metrics.ts` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 2, Context Window Strategy
  - **Depends on:** CE-01, CE-02

- [ ] **CE-07: Context overflow handling — Graceful degradation when context exceeds window**
  - **Description:** Implement graceful degradation when context approaches or exceeds the available window. The overflow handler follows a graduated response: (1) at 80% utilization — emit warning, begin relevance-based compression of working context, (2) at 90% utilization — compress session context, trigger checkpoint, alert the operator, (3) at 95% utilization — emergency compression: reduce to minimum viable context (identity + constraints + current task only), emit critical alert, (4) at 100% — force checkpoint and session handoff. At no point should overflow cause silent context loss. Every compression action is logged with what was removed and why.
  - **Done when:** All 4 graduated response levels are implemented. No silent context loss occurs at any utilization level. Every compression action is logged. Session handoff at 100% preserves all critical state. Overflow handling is tested with synthetic context payloads at each threshold.
  - **Files:** `admiral/context/overflow_handler.sh` (new), `admiral/context/tests/test_overflow_handler.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 2, Context Window Strategy; Context Window Scaling
  - **Depends on:** CE-01, CE-02, CE-03

- [ ] **CE-08: Dynamic context allocation — Adjust allocations based on task complexity**
  - **Description:** Implement dynamic context allocation that adjusts zone percentages based on task characteristics. Simple tasks (formatting, renaming) need minimal session context and more working context. Complex tasks (architecture decisions, multi-file refactors) need more session context for code and specs. The allocator classifies tasks by complexity (S/M/L from task decomposition) and adjusts the zone percentages accordingly while respecting the standing context hard limits. Allocation adjustments are logged and reversible.
  - **Done when:** Task complexity classification drives context allocation. At least 3 allocation profiles exist (simple, standard, complex). Allocation adjustments respect standing context hard limits. Adjustments are logged and visible in the context dashboard. Allocation profiles are configurable.
  - **Files:** `admiral/context/dynamic_allocator.sh` (new), `admiral/config/context_allocation_profiles.json` (new), `admiral/context/tests/test_dynamic_allocator.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 2, Context Budget Allocation; Context Window Scaling
  - **Depends on:** CE-01, CE-02

---

## 27.4 Context Intelligence

- [ ] **CE-09: Context preloading — Pre-load relevant context based on task prediction**
  - **Description:** Implement predictive context preloading that loads relevant context before the agent explicitly requests it. Preloading sources: (1) file dependencies — when a task targets file X, pre-load files that import/require X, (2) historical patterns — query the Brain for context that was useful in similar past tasks, (3) skill triggers — match task description against skill file patterns and pre-load matching skills, (4) interface contracts — when a task involves agent handoffs, pre-load the relevant interface contracts. Preloading must respect context budgets — preloaded items go into the session context zone and count against its allocation.
  - **Done when:** Predictive preloading fires for all 4 sources. Preloaded context respects zone budgets. Preloading reduces the number of mid-task context requests (measurable via before/after comparison). Preloaded items that go unused are deprioritized in future predictions (learning feedback loop).
  - **Files:** `admiral/context/preloader.sh` (new), `admiral/context/tests/test_preloader.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 2, Progressive Disclosure; Context Source Routing
  - **Depends on:** CE-01, CE-04

- [ ] **CE-10: Context audit trail — Log context available for each agent decision**
  - **Description:** Implement a comprehensive context audit trail that records what context was available to each agent for each decision. The audit trail captures: (1) context snapshot at decision time (what was loaded in each zone), (2) context that was requested but unavailable (gaps), (3) context that was compressed or evicted before the decision (potential information loss), (4) context source for each item (standing, on-demand, Brain query, tool output). The audit trail enables post-hoc analysis: "when the agent made decision X, what did it know and what was it missing?" This is essential for diagnosing context starvation and context stuffing failure modes.
  - **Done when:** Context snapshots are captured at every Propose-tier and Escalate-tier decision point. Context gaps are recorded. Compression/eviction history is linked to subsequent decisions. Source attribution is complete for all context items. Audit trail is queryable (by agent, by decision, by time range). Storage is efficient (snapshots store diffs, not full copies).
  - **Files:** `admiral/context/audit_trail.sh` (new), `admiral/context/tests/test_audit_trail.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 2, Context Engineering; Part 7, Context Starvation/Stuffing failure modes
  - **Depends on:** CE-01, CE-02
