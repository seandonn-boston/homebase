# PLAN2.md — Admiral Framework Implementation Plan (Phases 4-5)

## Context

Phases 1-3 of PLAN.md are complete: the spec (v0.5.3-alpha) is clean, concrete, and structurally coherent. PLAN.md Phases 4-5 say "build the MVP" and "build v1.0" but provide no task decomposition. This plan fills that gap.

**PLAN.md defines the scope strictly:**
- **MVP (Phase 4):** Starter profile (B1 F1 E1 CP1 S1 P1 DE1) — one governed agent with enforced hooks
- **v1.0 (Phase 5):** Team profile — multi-agent routing, handoff/escalation protocols, Brain L1, 3+ hooks, health dashboard
- **Explicitly NOT v1.0:** B2/B3, A2A mTLS, ecosystem agents, feedback loops, multi-operator governance, quarantine immune system, progressive autonomy automation

**What already exists:**
- `control-plane/` — TypeScript CP with event stream, runaway detector, execution trace, dashboard HTML (v0.1.0)
- `aiStrat/hooks/` — 13 hook spec directories with `hook.manifest.json` files (specs only, no executables)
- `aiStrat/brain/level1-spec.md` and `level2-spec.md` — Complete B1/B2 specs with code examples
- `aiStrat/hooks/manifest.schema.json` — JSON Schema for hook manifests
- `.claude/settings.local.json` — Exists (permissions only, no hooks configured)

**What does NOT exist:**
- No `.admiral/` directory, no `.brain/` directory, no `.hooks/` directory
- No executable hook scripts
- No Standing Orders data files or loader
- No root-level AGENTS.md (only `aiStrat/AGENTS.md` for the spec project)
- No Brain CLI tools
- No multi-agent orchestration

---

## File Deletion

Delete `CODEBASE-REVIEW-*.md` if any exist in repo root (user requested review file deletion).

---

## Phase 4: MVP (Starter Profile)

**Target:** B1 F1 E1 CP1 S1 P1 DE1
**Sessions:** 5-7
**Exit criteria:** A governed solo agent running with all E1 hooks firing deterministically. End-to-end example with actual output. QUICKSTART.md validated cold.

### 4.0 — Config Before Code (1 session)

The spec says "Config before code." Dog-food Admiral to build Admiral.

**Deliverables:**
1. Root `AGENTS.md` for homebase repo (governs the implementation work)
2. Standing Orders data files — 15 files in `admiral/standing-orders/`, one per SO, with structured metadata
3. `.admiral/` directory with template `session_state.json`
4. `.brain/` directory with `homebase/` and `_global/` subdirectories
5. `.gitignore` updates (`.admiral/session_state.json` runtime state ignored, templates tracked)

**Interface contracts (defined here, consumed by 4.1-4.2):**
- Session state JSON schema (from `reference-constants.md`)
- Hook adapter stdin/stdout contract per event type
- Brain entry JSON format (from `level1-spec.md`)

**Key files:**
- `aiStrat/admiral/reference/reference-constants.md` — session state schema, hook contracts
- `aiStrat/brain/level1-spec.md` — B1 entry format and directory structure
- `aiStrat/admiral/spec/part11-protocols.md` — Standing Orders text (lines 15-178)

**Verify:** AGENTS.md <150 lines, SO files parse, session state template valid JSON, `.brain/` structure matches level1-spec.md

---

### 4.1 — Hook Runtime + E1 Hooks (2 sessions)

This is the highest-uncertainty work. The adapter pattern between Claude Code's hook system and Admiral's hook contracts is architecturally critical.

**Session 4.1a: Hook Adapter + Session Start**

| Deliverable | Details |
|---|---|
| `pre_tool_use_adapter.sh` | Reads Claude Code PreToolUse payload, loads session state, fires `token_budget_gate` |
| `post_tool_use_adapter.sh` | Reads PostToolUse payload, fires `token_budget_tracker` → `loop_detector` → (every 10th) `context_health_check` |
| `session_start_adapter.sh` | Resets session state, fires `context_baseline`, outputs Standing Orders for context injection |
| Session state utilities | Bash functions for read/write `.admiral/session_state.json` via `jq` |
| `context_baseline.sh` | Records initial context metrics (10s timeout) |
| `.claude/settings.local.json` | Updated with hook registrations pointing to adapters |

**Session 4.1b: All E1 Hooks**

| Hook | Event | Timeout | Behavior |
|---|---|---|---|
| `token_budget_gate.sh` | PreToolUse | 5s | Exit 2 when `tokens_used >= token_budget` |
| `token_budget_tracker.sh` | PostToolUse | 5s | Estimate tokens, update state, warn at 80%, escalate at 90% |
| `loop_detector.sh` | PostToolUse | 5s | Track `(agent_id, error_sig)` tuples. Trigger at 3 same-error or 10 total |
| `context_health_check.sh` | PostToolUse (every 10th) | 10s | Check utilization >85%, validate critical sections present |

**Self-healing infrastructure:** Post-tool adapter tracks `(hook_name, error_sig)` tuples — MAX_RETRIES=3 per error, MAX_SESSION_RETRIES=10.

**Exit codes:** 0=pass, 1=soft fail, 2=hard block

**Key files:**
- `aiStrat/admiral/spec/part3-enforcement.md` — Hook execution model, exit codes, self-healing loops
- `aiStrat/hooks/*/hook.manifest.json` — Existing manifest specs for each hook
- `aiStrat/admiral/reference/reference-constants.md` — Token estimates per tool, timeout values

**Verify:** All hooks fire via Claude Code. Budget gate blocks at 100%. Tracker warns at 80%. Loop detector triggers after 3 identical errors. Context health fires every 10th call.

---

### 4.2 — B1 Brain + F1 Fleet (1 session)

**Can parallel with 4.1b** — different directories, no shared state.

| Deliverable | Details |
|---|---|
| `brain_record` script | Creates JSON in `.brain/{project}/` with naming `{YYYYMMDD-HHmmss}-{category}-{slug}.json`. Validates required fields. UUID via `uuidgen`. |
| `brain_query` script | Keyword search via `grep -rl` across `.brain/`. Filter by project/category. Formatted output. |
| `brain_retrieve` script | Read specific entry by filename or ID |
| `brain_audit` script | List entries >90 days since creation with no updates (decay awareness) |
| Agent identity template | `agent-identity.json` with: agent_id, role, authority_tier, project |
| CLAUDE.md update | Point to root AGENTS.md |

**Key files:**
- `aiStrat/brain/level1-spec.md` — Entry format, directory structure, naming convention, operations

**Verify:** `brain_record` creates valid JSON. `brain_query` finds entries by keyword. Identity loads at session start.

---

### 4.3 — Protocols, Security, CP1 (1 session)

| Component | Deliverable | Details |
|---|---|---|
| **P1** | Escalation report template | Structured markdown matching Part 11 format |
| **P1** | Emergency Halt behavior | Exit 2 with specific message format for data destruction, security breach, compliance violation |
| **P1** | Decision Authority table | Markdown format with the 4 tiers, validatable |
| **S1** | Injection detection patterns | 15-20 regex patterns for prompt injection, command injection, authority-spoofing |
| **S1** | Manifest validation | Validate hook manifests against `manifest.schema.json` at discovery |
| **CP1** | Event logging | Hooks log to `.admiral/event_log.jsonl` (tool calls, hook firings, escalations) |
| **CP1** | Trace ID | UUID generated at session start, propagated through all events |
| **CP1** | Session summary script | Reads event log + session state, produces human-readable summary |
| **DE1** | Checkpoint template | JSON with: completed, in_progress, blocked, decisions, assumptions, resources |

**Key files:**
- `aiStrat/admiral/spec/part11-protocols.md` — Escalation format, Emergency Halt triggers
- `control-plane/src/` — Existing TS code to understand CP patterns

**Verify:** Escalation template renders. Injection patterns catch basic prompt injection. Event log captures hook firings. Trace ID appears in all log entries.

---

### 4.4 — Integration + Dog-fooding (1-2 sessions)

**Entry:** All 4.0-4.3 complete and individually verified.

**Deliverables:**
1. End-to-end integration test with a real Claude Code session — hooks fire, agent works under governance, hook intervenes, task completes
2. QUICKSTART.md cold validation — follow it from scratch on clean project, document gaps, fix any issues
3. Real session log committed to repo showing governance in action
4. First brain entries — record decisions from 4.0-4.3 as B1 entries (dog-fooding)
5. Bug fixes from integration
6. `npm run build` passes for control-plane
7. Version bump to v0.6.0-alpha

**Exit criteria (from PLAN.md):**
- [ ] At least one hook fires deterministically on every qualifying event
- [ ] Standing Orders loaded and verified in agent context
- [ ] Decision authority tiers enforced (not just documented)
- [ ] End-to-end example documented with actual output
- [ ] Hook demonstrably prevents a bad outcome that advisory instructions would miss

---

## Phase 5: v1.0 (Team Profile)

**Target:** Multi-agent routing, handoff/escalation, Brain L1, 3+ hooks, health dashboard
**Sessions:** 9-14
**Entry:** Phase 4 complete and validated.
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
4.0 Config Before Code
 ├── 4.1a Adapter + SessionStart
 │    └── 4.1b E1 Hooks (budget, loop, context)
 ├── 4.2 B1 Brain + F1 Fleet  ←── parallel with 4.1b
 └── 4.3 Protocols/Security/CP1  ←── after 4.1, partial parallel with 4.2
      └── 4.4 Integration + Dog-fooding
           └── 5.0 Interface Contracts
                ├── 5.1 F2 Fleet + Orchestrator  ──┐
                ├── 5.2 P2 Protocols + 3rd Hook    ├── parallel tracks
                ├── 5.3 B2 Brain Upgrade           │
                └── 5.4 Health Dashboard       ────┘ (after 5.1 for agent data, 5.3 for brain data)
                     └── 5.5 Real Project + Case Study
```

**Parallelization savings:**
- Phase 4: 4.1b ∥ 4.2 saves ~1 session
- Phase 5: 5.1 ∥ 5.2 ∥ 5.3 saves ~4 sessions
- Compressed total: ~10-14 sessions (vs 14-20 sequential)

---

## Verification Plan

### After Phase 4 (MVP):
1. Fresh clone of repo → follow QUICKSTART.md → governed agent running in <2 hours
2. Assign task → hook fires on every tool call → budget gate blocks when budget near exhaustion
3. Introduce deliberate error loop → loop detector breaks cycle after 3 repeats
4. Review `.admiral/event_log.jsonl` → trace ID consistent, all hook firings recorded
5. Review `.brain/homebase/` → at least 3 brain entries from dog-fooding
6. `npm run build` passes for control-plane

### After Phase 5 (v1.0):
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
