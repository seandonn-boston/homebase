# PLAN2.md — Admiral Framework Implementation Plan (Phases 4-5)

## Context

Phases 1-3 of PLAN.md are complete: the spec (v0.5.3-alpha) is clean, concrete, and structurally coherent. PLAN.md Phases 4-5 say "build the MVP" and "build v1.0" but provide no task decomposition. This plan fills that gap.

**PLAN.md defines the scope strictly:**
- **MVP (Phase 4):** Starter profile (B1 F1 E1 CP1 S1 P1 DE1) — one governed agent with enforced hooks
- **v1.0 (Phase 5):** Team profile — multi-agent routing, handoff/escalation protocols, B2 Brain, 3+ hooks, health dashboard
- **Explicitly NOT v1.0:** B3, A2A mTLS, ecosystem agents, feedback loops, multi-operator governance, quarantine immune system, progressive autonomy automation

---

## Phase 4: MVP (Starter Profile) — STATUS: MOSTLY COMPLETE

**Target:** B1 F1 E1 CP1 S1 P1 DE1
**Sessions used:** 1 (compressed 4.0-4.3 into single session)
**Exit criteria:** A governed solo agent running with all E1 hooks firing deterministically. End-to-end example with actual output. QUICKSTART.md validated cold.

### 4.0 — Config Before Code — COMPLETE

| Deliverable | Status | Location |
|---|---|---|
| Root `AGENTS.md` | Done (67 lines) | `/AGENTS.md` |
| 15 Standing Orders JSON files | Done | `admiral/standing-orders/so01-*.json` through `so15-*.json` |
| Session state template | Done | `.admiral/session_state.json.template` |
| `.brain/` directory structure | Done | `.brain/homebase/`, `.brain/_global/` |
| `.gitignore` updates | Done | Runtime state ignored, templates tracked |
| `CLAUDE.md` pointer | Done | `/CLAUDE.md` |

### 4.1 — Hook Runtime + E1 Hooks — COMPLETE

**Adapters (translate Claude Code ↔ Admiral contracts):**

| Script | Event | Status |
|---|---|---|
| `.hooks/session_start_adapter.sh` | SessionStart | Done — resets state, injects all 15 SOs via `systemMessage` |
| `.hooks/pre_tool_use_adapter.sh` | PreToolUse | Done — fires `token_budget_gate`, exit 2 blocks |
| `.hooks/post_tool_use_adapter.sh` | PostToolUse | Done — fires tracker → loop_detector → health_check (every 10th) |

**E1 Hooks:**

| Hook | Verified Behavior |
|---|---|
| `token_budget_gate.sh` | Blocks at 100% utilization (exit 2). Passes below 100%. |
| `token_budget_tracker.sh` | Warns at 80%, escalates at 90%. Token estimates per tool type (Read=1000, Agent=5000, etc.) |
| `loop_detector.sh` | Tracks `(agent_id, error_sig)` tuples. Triggers at 3 same-error or 10 total. |
| `context_health_check.sh` | Fires every 10th call. Detects utilization >85% and missing critical sections (Identity/Authority/Constraints). |
| `context_baseline.sh` | Records initial context metrics at session start. |

**Shared libraries:**

| Library | Purpose |
|---|---|
| `admiral/lib/state.sh` | Session state CRUD, token estimation, error signature computation |
| `admiral/lib/standing_orders.sh` | SO loader + renderer for context injection |

**Claude Code registration:** `.claude/settings.local.json` has all three hook events configured.

### 4.2 — B1 Brain + F1 Fleet — COMPLETE

| Tool | Status | Location |
|---|---|---|
| `brain_record` | Done — creates JSON entries with UUID, timestamp, category validation | `admiral/bin/brain_record` |
| `brain_query` | Done — keyword search with project/category filtering | `admiral/bin/brain_query` |
| `brain_retrieve` | Done — lookup by filename, ID, or partial match | `admiral/bin/brain_retrieve` |
| `brain_audit` | Done — 90-day decay awareness report | `admiral/bin/brain_audit` |
| Agent identity template | Done | `admiral/templates/agent-identity.json` |
| Checkpoint template | Done | `admiral/templates/checkpoint.json` |
| Dog-food brain entries | Done (5 entries) | `.brain/homebase/` |

### 4.3 — Protocols, Security, CP1 — COMPLETE

| Component | Deliverable | Status | Location |
|---|---|---|---|
| **P1** | Escalation report template | Done | `admiral/templates/escalation-report.md` |
| **P1** | Decision authority table | Done | `admiral/templates/decision-authority.md` |
| **S1** | Injection detection (18 patterns) | Done | `admiral/lib/injection_detect.sh` |
| **S1** | Manifest validation | Done (in `injection_detect.sh`) | `admiral/lib/injection_detect.sh` |
| **CP1** | Event logging (.jsonl) | Done | Hooks log to `.admiral/event_log.jsonl` |
| **CP1** | Trace ID generation | Done | Session start generates UUID, propagated through events |
| **CP1** | Session summary | Done | `admiral/bin/session_summary` |
| **DE1** | Checkpoint template | Done | `admiral/templates/checkpoint.json` |

### 4.4 — Integration + Dog-fooding — PARTIALLY COMPLETE

**Completed:**
- [x] End-to-end integration test verified: session start → tool tracking → 80% warning → 90% escalation → 100% hard block (exit 2)
- [x] 5 brain entries recorded from implementation decisions (dog-fooding B1)
- [x] `npm run build` passes for control-plane
- [x] At least one hook fires deterministically on every qualifying event
- [x] Standing Orders loaded and verified in agent context (all 15 injected)
- [x] Decision authority tiers enforced (budget gate = Enforced tier)
- [x] Hook demonstrably prevents a bad outcome (budget exhaustion blocked)

**Remaining (Phase 4.4 gaps):**
- [ ] **QUICKSTART.md update** — `aiStrat/QUICKSTART.md` references old paths (e.g., `"matcher": "*"` instead of `"matcher": ""`, inline hook config instead of adapter pattern). Needs updating to reference actual implementation in `.hooks/` and `admiral/`.
- [ ] **End-to-end example document** — Integration test output verified but not committed as a standalone document showing governance in action. Create `admiral/examples/e2e-session-log.md` with real output.
- [ ] **Version bump to v0.6.0-alpha** — `package.json` in `control-plane/` still at v0.1.0. Bump and tag.
- [ ] **QUICKSTART.md cold validation** — Have someone unfamiliar with Admiral follow it and succeed. Can only validate after QUICKSTART.md is updated.

---

## Phase 5: v1.0 (Team Profile) — NOT STARTED

**Target:** Multi-agent routing, handoff/escalation, B2 Brain, 3+ hooks, health dashboard
**Sessions:** 9-14
**Entry:** Phase 4.4 gaps closed.
**Exit:** A team of 3 developers uses Admiral on a real 2-week project. Governance overhead <15% of tokens.

### 5.0 — Interface Contracts (1 session)

Contract-first. Define all interfaces before parallel work begins.

| Contract | Purpose |
|---|---|
| Fleet roster format | JSON/YAML defining agents with: agent_id, role, model_tier, authority_tier, tool_permissions, scope |
| Handoff document schema | JSON with: FROM, TO, VIA, TASK, DELIVERABLE, CONTEXT, ACCEPTANCE_CRITERIA, TRACE_ID |
| Escalation report schema | Structured JSON version of the P1 text template |
| A2A message format | JSON-RPC 2.0: request (sender, trace_id, task, input, deadline) → response (status, output, errors) |
| Health metrics collection format | How hooks report metrics for dashboard consumption |

**Verify:** All schemas validate with JSON Schema tooling. Cross-references are consistent (handoff refs agent IDs from roster, trace IDs match CP format).

---

### 5.1 — F2 Fleet + Orchestrator (2-3 sessions)

| Session | Deliverables |
|---|---|
| **5.1a** | Fleet roster config format. Agent definition loader. Routing rules engine (task keywords → agent match). Select agents from fleet catalog for project needs. |
| **5.1b** | Orchestrator agent definition. Task decomposition support. A2A messaging (5-min timeout, JSON-RPC 2.0). File-based task queue. Interface contract validation on handoffs. |

**Key files:**
- `aiStrat/admiral/spec/part4-fleet.md` — Fleet composition, routing, A2A protocol
- `aiStrat/fleet/` — Agent catalog definitions

**Verify:** Orchestrator routes to correct agent. A2A messages timeout correctly. Fleet roster rejects invalid configs.

---

### 5.2 — P2 Protocols + 3rd Hook (1-2 sessions)

| Deliverable | Details |
|---|---|
| Structured escalation | JSON schema validation on escalation reports |
| Handoff protocol | Required fields validation. Sender ≠ receiver. Completeness checks. |
| Handoff validation hook | PreToolUse hook that validates handoff docs before acceptance |
| 3rd enforced hook | Scope boundary enforcement or identity validation (from the 13 hook categories) |

**Key files:**
- `aiStrat/admiral/spec/part11-protocols.md` — Handoff protocol fields, escalation format

**Verify:** Handoff validation catches incomplete docs. Escalation reports pass schema. 3+ hooks fire deterministically.

---

### 5.3 — B2 Brain Upgrade (2-3 sessions)

| Session | Deliverables |
|---|---|
| **5.3a** | SQLite schema (`entries`, `entry_links`, `audit_log` tables from `level2-spec.md`). B1→B2 migration script (read `.brain/**/*.json`, generate embeddings via `text-embedding-3-small`, insert into SQLite). Embedding module with local `all-MiniLM-L6-v2` fallback. |
| **5.3b** | Semantic search with cosine similarity (min_score 0.7, limit 10, max 50). `brain_record` with auto-embedding. `brain_audit` for decay/supersession/access stats. MCP server exposing `brain_query`, `brain_record`, `brain_audit` as tools. |
| **5.3c** | Hook integration — hooks can call `brain_query` for context. Access count tracking. Entry supersession via `superseded_by`. Standing Orders injection includes relevant brain entries. |

**Key files:**
- `aiStrat/brain/level1-spec.md` — B1 format (migration source)
- `aiStrat/brain/level2-spec.md` — B2 spec with code examples for schema, migration, cosine similarity
- `aiStrat/brain/schema/` — SQL schema files

**Verify:** Semantic search finds entries keyword search misses. Migration preserves all entries. MCP server responds to tool calls. Cosine 0.7 threshold filters noise.

---

### 5.4 — Health Dashboard (2-3 sessions)

| Session | Deliverables |
|---|---|
| **5.4a** | Extend control-plane `EventStream` for multi-agent events. Add health metrics collection: throughput, first-pass quality rate, escalation rate. REST endpoints on `AdmiralServer`. |
| **5.4b** | Dashboard enhancements: agent roster with status, hook firing history, token budget per agent, health metrics display. Alert system for hook failures and budget warnings. |
| **5.4c** | Brain B2 integration with dashboard — brain entry counts, query stats, decay warnings visible. Checkpoint files per session. |

**Key files:**
- `control-plane/src/index.ts` — Existing TS CP to extend
- `control-plane/src/dashboard/` — Existing dashboard HTML
- `aiStrat/admiral/spec/part8-operations.md` — Fleet health metrics definitions

**Verify:** Dashboard shows agent status. Metrics display throughput/quality/escalation. Brain B2 stats visible.

---

### 5.5 — Real Project + Case Study (2 sessions)

**Deliverables:**
1. Complete a real 2-week project using Admiral governance with 2+ agents
2. Post-mortem documenting: what governance caught, governance overhead (target <15%), governance theater audit
3. Case Study 5 written from the post-mortem
4. Bug fixes from real usage
5. Version bump to v1.0.0 (drop -alpha, stability commitment)

**Exit criteria (from PLAN.md):**
- [ ] Multi-agent routing works (Orchestrator → Workers)
- [ ] Handoff protocol validated with acceptance criteria checks
- [ ] Escalation reports generated and routed correctly
- [ ] Brain B2 entries created with embeddings, semantic search working, MCP server operational
- [ ] 3+ hooks firing deterministically
- [ ] Health dashboard shows throughput, quality rate, escalation rate
- [ ] One real project completed with post-mortem
- [ ] Governance caught ≥1 issue that would have been missed
- [ ] Governance overhead <15% of total session tokens
- [ ] No governance theater — every component was used, not just present

---

## Dependency Graph

```
4.0 Config Before Code                              ✅ DONE
 ├── 4.1a Adapter + SessionStart                    ✅ DONE
 │    └── 4.1b E1 Hooks (budget, loop, context)     ✅ DONE
 ├── 4.2 B1 Brain + F1 Fleet                        ✅ DONE
 └── 4.3 Protocols/Security/CP1                     ✅ DONE
      └── 4.4 Integration + Dog-fooding             ⚠️  GAPS (see below)
           └── 5.0 Interface Contracts              ⬜ NOT STARTED
                ├── 5.1 F2 Fleet + Orchestrator  ──┐
                ├── 5.2 P2 Protocols + 3rd Hook    ├── parallel tracks
                ├── 5.3 B2 Brain Upgrade           │
                └── 5.4 Health Dashboard       ────┘
                     └── 5.5 Real Project + Case Study
```

**Phase 5 parallelization:** 5.1 ∥ 5.2 ∥ 5.3 saves ~4 sessions. Compressed Phase 5: ~6-8 sessions.

---

## Remaining Work Summary

### Immediate (close Phase 4.4 gaps):

| # | Task | Priority | Est. Effort |
|---|---|---|---|
| 1 | **Update `aiStrat/QUICKSTART.md`** to reference actual implementation paths (`.hooks/`, `admiral/`, adapter pattern, `settings.local.json` hook format) | High | 30 min |
| 2 | **Create `admiral/examples/e2e-session-log.md`** with real integration test output showing governance in action | High | 20 min |
| 3 | **Version bump** control-plane `package.json` to v0.6.0-alpha, git tag | Medium | 5 min |
| 4 | **QUICKSTART.md cold validation** — have someone unfamiliar follow it | Medium | External |

### Phase 5 (in order):

| # | Sub-Phase | Sessions | Dependencies | Key Spec Files |
|---|---|---|---|---|
| 5 | **5.0 Interface Contracts** — fleet roster, handoff, escalation, A2A schemas | 1 | Phase 4.4 gaps closed | `part4-fleet.md`, `part11-protocols.md` |
| 6 | **5.1 F2 Fleet + Orchestrator** — roster config, routing engine, A2A messaging, task queue | 2-3 | 5.0 | `part4-fleet.md`, `aiStrat/fleet/` |
| 7 | **5.2 P2 Protocols + 3rd Hook** — handoff validation, structured escalation, scope boundary hook | 1-2 | 5.0 | `part11-protocols.md` |
| 8 | **5.3 B2 Brain Upgrade** — SQLite schema, B1→B2 migration, semantic search, MCP server | 2-3 | 5.0 | `level2-spec.md`, `brain/schema/` |
| 9 | **5.4 Health Dashboard** — multi-agent event stream, REST API, dashboard UI, alerts | 2-3 | 5.1, 5.3 | `part8-operations.md`, `control-plane/src/` |
| 10 | **5.5 Real Project + Case Study** — 2-week real project, post-mortem, v1.0.0 release | 2 | All of above | — |

### Phase 5 verification (after completion):
1. Orchestrator assigns task to specialist → specialist completes → handoff validated → result accepted
2. Deliberate scope-change request → escalation report generated → routed to Admiral
3. Health dashboard shows live metrics for 2+ agents
4. Brain B2 semantic search finds relevant entries that keyword search would miss
5. MCP server responds to `brain_query`, `brain_record`, `brain_audit` tool calls
6. B1→B2 migration preserves all entries with embeddings generated
7. Post-mortem confirms governance overhead <15%

---

## What's Explicitly Deferred (from PLAN.md Part 4)

NOT built in Phases 4-5:
- Brain Level 3 (Postgres, pgvector, multi-agent concurrent access)
- A2A protocol with mTLS
- Five ecosystem agents (Part 12)
- Six feedback loops (Part 12)
- Seven proprietary datasets (Part 12)
- Multi-operator governance
- Quarantine immune system (5 layers)
- Rating system implementation
- Meta-agent Admiral
- Progressive autonomy automation
- Cloud deployment guides
