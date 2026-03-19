# Stream 8: Brain Knowledge System — From B1 to B3

> *"Memory makes intelligence. Without persistent knowledge, every session starts from zero — the antithesis of institutional learning." — Admiral Framework Thesis*

**Current score:** 2/10 | **Target:** 8/10

**Current state:** B1 file-based brain with 9 JSON entries, manual creation only. Four CLI utilities (brain_record, brain_query, brain_retrieve, brain_audit). brain_context_router.sh hook detects Propose/Escalate decisions without preceding brain_query (advisory). No automatic entry creation. B2/B3 not started.

---

## Stream 8: Brain Knowledge System — From B1 to B3

> *"Memory makes intelligence. Without persistent knowledge, every session starts from zero — the antithesis of institutional learning." — Admiral Framework Thesis*

**Current state:** B1 file-based brain with 9 JSON entries across 2 projects (`homebase`, `traced-demo`), manual creation only via `admiral/bin/brain_record`. Four CLI utilities exist (`brain_record`, `brain_query`, `brain_retrieve`, `brain_audit`) — all grep/jq-based. `brain_context_router.sh` hook detects Propose/Escalate decisions made without a preceding `brain_query` (advisory only). No automatic entry creation from hooks. No demand signal tracking. No contradiction detection. B2 (SQLite) and B3 (Production/MCP) not started. Graduation criteria defined in spec but not measured.

**Dependencies:** B1 completion is prerequisite to B2. B2 graduation is prerequisite to B3. Quarantine pipeline (Stream 4 / SD-04) resolved — available for B-18 integration. Control plane (`control-plane/src/server.ts`) exists for B-21 dashboard integration.

---

### 8.1 B1 Completion (File-Based Brain)

- [ ] **B-01: Automatic brain entry creation from hooks**
  - **Description:** Hooks auto-record significant decisions (hard-blocks, escalations, new patterns) to `.brain/`. Create a shared `brain_writer.sh` library that hooks call to emit entries. Wire into at least `prohibitions_enforcer.sh` (records hard-block events), `loop_detector.sh` (records detected loops), and `scope_boundary_guard.sh` (records boundary violations).
  - **Done when:** At least 3 hooks emit brain entries on significant events; entries appear in `.brain/` with correct category, content, and source_agent without manual intervention.
  - **Files:** `.hooks/prohibitions_enforcer.sh`, `.hooks/loop_detector.sh`, `.hooks/scope_boundary_guard.sh`, `admiral/lib/brain_writer.sh` (new)
  - **Size:** M
  - **Spec ref:** level1-spec.md — Automatic Recording

- [ ] **B-02: Brain retrieval in hooks**
  - **Description:** Enhance `brain_context_router.sh` to not just detect missing queries, but actively query the Brain and return relevant entries into agent context. On Propose/Escalate-tier tool calls, the router should invoke `brain_query` with extracted keywords and inject matching entries as context enrichment in the hook response.
  - **Done when:** Router returns matching brain entries for current task context; entries are formatted as structured context blocks in hook output JSON; at least keyword-based matching functional.
  - **Files:** `.hooks/brain_context_router.sh`, `admiral/bin/brain_retrieve`
  - **Size:** M
  - **Spec ref:** level1-spec.md — Context Source Routing

- [ ] **B-03: Demand signal tracking**
  - **Description:** Track what agents search for but don't find in `.brain/_demand/`. When `brain_query` returns zero results, record the query term, timestamp, calling agent, and task context to a demand signal log. Expose demand signals via `brain_audit --demand` so operators can see what knowledge gaps exist.
  - **Done when:** Failed queries are recorded with timestamps in `.brain/_demand/`; demand signals visible via `brain_audit --demand`; at least query term, timestamp, and project captured.
  - **Files:** `admiral/bin/brain_query`, `.brain/_demand/` (new directory), `admiral/bin/brain_audit`
  - **Size:** S
  - **Spec ref:** level1-spec.md — Demand Signals

- [ ] **B-04: Contradiction scan on write**
  - **Description:** Before recording a new brain entry, scan existing entries for potential contradictions. Compare new entry's title and content against existing entries in the same project and category using keyword overlap. Emit a warning (not a hard-block) when potential contradictions are detected, including paths to conflicting entries.
  - **Done when:** `brain_record` warns on potential contradictions before writing; warning includes paths to conflicting entries; non-blocking (entry still written with a `contradicts` metadata field linking to flagged entries).
  - **Files:** `admiral/bin/brain_record`
  - **Size:** M
  - **Spec ref:** level1-spec.md — Contradiction Detection

- [ ] **B-05: Brain entry consolidation**
  - **Description:** Create `brain_consolidate` utility to merge or synthesize old entries with overlapping topics. Identify entries with high keyword overlap within the same project, present consolidation candidates, and allow merging into a single entry that preserves provenance (original entry IDs, timestamps, and source agents recorded in metadata).
  - **Done when:** `brain_consolidate` identifies redundant entries, produces merged entries with full provenance chain, and archives (not deletes) originals to `.brain/_archived/`.
  - **Files:** `admiral/bin/brain_consolidate` (new)
  - **Size:** M
  - **Spec ref:** level1-spec.md — Knowledge Maintenance

- [ ] **B-06: Brain B1 comprehensive tests**
  - **Description:** End-to-end test suite for all B1 brain utilities: `brain_query`, `brain_record`, `brain_retrieve`, `brain_audit`, `brain_consolidate`, and `brain_writer.sh`. Cover CRUD operations, edge cases (empty brain, special characters in titles, very long content), category validation, demand signal recording, contradiction detection, and concurrent access (two parallel `brain_record` calls should not corrupt data).
  - **Done when:** 20+ tests covering all utilities; all tests pass; concurrent access tested; edge cases for empty brain, invalid inputs, and large entries covered.
  - **Files:** `admiral/tests/test_brain_b1.sh` (new)
  - **Size:** M
  - **Spec ref:** level1-spec.md — Testing Requirements

---

### 8.2 B2 Implementation (SQLite Brain)

- [ ] **B-07: SQLite schema creation**
  - **Description:** Create SQLite schema matching level2-spec.md: `entries` table (id, project, category, title, content, source_agent, created_at, updated_at, superseded_by), `links` table (source_id, target_id, link_type, created_at), `embeddings` table (entry_id, vector BLOB, model_version), `demand_signals` table (query, project, timestamp, agent). Include versioned migration system so schema can evolve without data loss.
  - **Done when:** Schema created and loadable; migration script tracks version; schema matches spec-defined tables; indexes on project, category, created_at.
  - **Files:** `admiral/brain/b2/schema.sql` (new), `admiral/brain/b2/migrate.sh` (new)
  - **Size:** M
  - **Spec ref:** level2-spec.md — Schema Definition

- [ ] **B-08: Entry migration from B1 to B2**
  - **Description:** Script to import all `.brain/` JSON files into the SQLite database. Parse each JSON entry, validate required fields, insert into `entries` table. Migrate demand signals from `.brain/_demand/`. Generate migration report showing counts, skipped entries (with reasons), and validation warnings.
  - **Done when:** All B1 entries migrated with metadata preserved; migration is idempotent (re-running doesn't duplicate); report generated showing migration results.
  - **Files:** `admiral/brain/b2/migrate_from_b1.sh` (new)
  - **Size:** M
  - **Spec ref:** level2-spec.md — Migration Path

- [ ] **B-09: SQLite-based query interface**
  - **Description:** Replace grep-based `brain_query` with SQL queries against the SQLite database. Support keyword search (FTS5 full-text search), date range filtering (`--since`, `--until`), category filter, project filter, and result limiting. Maintain backward-compatible CLI interface so existing hooks and scripts continue to work.
  - **Done when:** Queries return results in <100ms for 1000+ entries; FTS5 index created; CLI interface backward-compatible with B1 `brain_query`; all existing query patterns still work.
  - **Files:** `admiral/brain/b2/query.sh` (new), `admiral/bin/brain_query` (updated to dispatch to B2 when SQLite DB exists)
  - **Size:** M
  - **Spec ref:** level2-spec.md — Query Interface

- [ ] **B-10: Embedding generation pipeline**
  - **Description:** Generate embeddings for semantic search. Support pluggable embedding backends: external API (OpenAI, local model server) or pre-computed vectors stored at build time. Core brain must not require runtime API access — offline mode uses pre-computed embeddings only. Store embeddings in the `embeddings` table with model version tracking for re-generation when models change.
  - **Done when:** Entries have embeddings stored in SQLite; embedding generation works with at least one backend; model version tracked; re-embedding on model change supported.
  - **Files:** `admiral/brain/b2/embed.sh` (new), `admiral/brain/b2/schema.sql` (embeddings table)
  - **Size:** L
  - **Spec ref:** level2-spec.md — Semantic Layer

- [ ] **B-11: Similarity search implementation**
  - **Description:** Vector similarity search using cosine distance computed in SQLite (custom function or application-side). Support `brain_query --semantic "topic"` that returns entries ranked by embedding similarity. Blend with keyword results when both signals available (keyword match boosts ranking).
  - **Done when:** `brain_query --semantic "topic"` returns relevant entries ranked by similarity; results blend keyword and semantic signals when both available; performance acceptable for 1000+ entries.
  - **Files:** `admiral/brain/b2/search.sh` (new), `admiral/bin/brain_query` (updated)
  - **Size:** L
  - **Spec ref:** level2-spec.md — Semantic Search

---

### 8.3 B3 Implementation (Production Brain)

- [ ] **B-12: MCP server scaffold**
  - **Description:** Create MCP (Model Context Protocol) server exposing 8 tool endpoints: `brain_record`, `brain_query`, `brain_retrieve`, `brain_strengthen` (increase entry confidence), `brain_supersede` (mark entry as replaced), `brain_status` (health and stats), `brain_audit` (compliance reporting), `brain_purge` (controlled deletion with audit trail). Server should start, register tools, handle basic request/response lifecycle.
  - **Done when:** Server starts and binds to configured port/socket; all 8 tools registered and discoverable via MCP protocol; basic request/response works for at least `brain_status` and `brain_query`; health check endpoint responds.
  - **Files:** `admiral/brain/b3/mcp-server/` (new directory), `admiral/brain/b3/mcp-server/index.ts` (new), `admiral/brain/b3/mcp-server/tools/` (new)
  - **Size:** L
  - **Spec ref:** level3-spec.md — MCP Interface

- [ ] **B-13: Postgres + pgvector schema deployment**
  - **Description:** Deploy production schema using Postgres with pgvector extension for native vector similarity search. Adapt from `aiStrat/brain/schema/001_initial.sql` and `002_data_ecosystem.sql` if they exist, or create from level3-spec.md. Include migration tracking, rollback capability, and connection pooling configuration.
  - **Done when:** Schema deployed to Postgres; pgvector extension enabled; migrations tracked and reversible; connection pooling configured; schema matches level3-spec.md requirements.
  - **Files:** `admiral/brain/b3/schema/` (new), `admiral/brain/b3/deploy.sh` (new)
  - **Size:** M
  - **Spec ref:** level3-spec.md — Storage Layer

- [ ] **B-14: Identity token lifecycle**
  - **Description:** Create, rotate, and revoke identity tokens for brain access. Each agent instance gets a unique token scoped to its role and project. Tokens have configurable TTL, support rotation without downtime (overlapping validity window), and revocation propagates immediately. Token format includes agent identity, clearance level, project scope, and expiry.
  - **Done when:** Token CRUD operations work; expired tokens rejected with clear error; rotation produces new token while old remains valid for grace period; revoked tokens immediately rejected; token metadata queryable for audit.
  - **Files:** `admiral/brain/b3/identity.ts` (new)
  - **Size:** L
  - **Spec ref:** level3-spec.md — Identity and Authentication

- [ ] **B-15: Access control enforcement**
  - **Description:** Per-agent, per-entry access control. Agents can only read entries at or below their clearance level. Write access scoped to agent's authorized projects. Admin operations (purge, supersede) restricted to elevated roles. Access decisions logged for audit trail.
  - **Done when:** Unauthorized read access returns 403 with reason; write access enforced per project scope; admin operations restricted; access control decisions logged; at least 3 clearance levels functional (read-only, contributor, admin).
  - **Files:** `admiral/brain/b3/access-control.ts` (new)
  - **Size:** L
  - **Spec ref:** level3-spec.md — Authorization

- [ ] **B-16: Multi-signal retrieval pipeline**
  - **Description:** Combine keyword (FTS), semantic (pgvector cosine similarity), temporal (recency boost), and link-based (graph proximity) signals for comprehensive retrieval. Each signal produces a scored result set; a fusion layer combines scores with configurable weights. Support query-time signal selection (e.g., `--signals keyword,semantic` to disable temporal/link).
  - **Done when:** Queries use multiple signals; results ranked by combined relevance score; signal weights configurable; query-time signal selection works; retrieval quality measurably better than single-signal.
  - **Files:** `admiral/brain/b3/retrieval.ts` (new)
  - **Size:** L
  - **Spec ref:** level3-spec.md — Multi-Signal Retrieval

- [ ] **B-17: Multi-hop link traversal**
  - **Description:** Navigate knowledge graph connections across entries. Given an entry, traverse `links` relationships (supports, contradicts, supersedes, related_to) to find connected knowledge up to N hops away. Support configurable depth limit, link-type filtering, and cycle detection. Results include traversal path for explainability.
  - **Done when:** Can traverse 2+ hops to find related knowledge; cycle detection prevents infinite loops; link-type filtering works; traversal path included in results; performance acceptable for graphs with 1000+ entries and 5000+ links.
  - **Files:** `admiral/brain/b3/graph.ts` (new)
  - **Size:** L
  - **Spec ref:** level3-spec.md — Knowledge Graph

- [ ] **B-18: Quarantine integration**
  - **Description:** Vet external intelligence through the 5-layer quarantine pipeline (already implemented in `admiral/monitor/quarantine/`) before brain ingestion. External content (from web, APIs, or untrusted agents) must pass all quarantine layers before being stored as brain entries. Quarantined entries get a `quarantine_status` metadata field tracking pipeline results.
  - **Done when:** External content passes quarantine pipeline before storage; quarantine results recorded in entry metadata; failed quarantine prevents entry creation with clear rejection reason; integration tested with existing quarantine test corpus (`attack_corpus.json`).
  - **Files:** `admiral/brain/b3/quarantine-bridge.ts` (new), `admiral/monitor/quarantine/quarantine_pipeline.sh`
  - **Size:** M
  - **Spec ref:** level3-spec.md — External Intelligence Vetting

- [ ] **B-19: Sensitivity classification**
  - **Description:** Classify entries by sensitivity level: public (shareable externally), internal (within organization), confidential (restricted teams), restricted (named individuals only). Classification can be set at creation or updated later. Queries automatically filter results by the requesting agent's maximum sensitivity clearance. Bulk reclassification supported for policy changes.
  - **Done when:** All entries have sensitivity labels (default: internal); queries respect classification — agents never see entries above their clearance; bulk reclassification works; sensitivity changes logged in audit trail.
  - **Files:** `admiral/brain/b3/sensitivity.ts` (new)
  - **Size:** M
  - **Spec ref:** level3-spec.md — Information Classification

- [ ] **B-20: Audit logging**
  - **Description:** Log all brain operations (reads, writes, searches, deletions, access denials, token operations) to an append-only audit log. Each log entry includes timestamp, agent identity, operation type, affected entry IDs, result (success/failure), and request metadata. Audit log queryable by time range, agent, operation type, and entry ID.
  - **Done when:** Complete audit trail in queryable format; all operation types logged; audit log is append-only (no modification or deletion of audit records); query interface supports filtering by time, agent, operation, and entry; retention policy configurable.
  - **Files:** `admiral/brain/b3/audit.ts` (new)
  - **Size:** M
  - **Spec ref:** level3-spec.md — Compliance and Audit

---

### 8.4 Brain Graduation Criteria

- [ ] **B-21: Graduation measurement system**
  - **Description:** Automated measurement of spec-defined graduation criteria for each brain level. B1-to-B2 graduation: hit rate >= 85% (queries that return useful results), precision >= 90% (returned results are relevant), entry count >= 50. B2-to-B3 graduation: reuse rate >= 30% (entries queried more than once), >= 5% improvement in agent task completion over baseline, semantic search precision >= 80%. Metrics collected per-session, aggregated over rolling 7-day window. Dashboard endpoint in control plane shows graduation readiness with per-criterion pass/fail.
  - **Done when:** Metrics collected per-session automatically; dashboard in control plane shows graduation readiness with per-criterion status; graduation thresholds configurable; historical trend data retained for at least 30 days.
  - **Files:** `admiral/brain/graduation-metrics.sh` (new), `control-plane/src/server.ts`
  - **Size:** L
  - **Spec ref:** level1-spec.md, level2-spec.md — Graduation Criteria

---

### Stream 8 Summary

| Phase | Tasks | Sizes | Estimated Effort |
|-------|-------|-------|-----------------|
| B1 Completion | B-01 through B-06 | 1S + 5M | ~6 sessions |
| B2 Implementation | B-07 through B-11 | 3M + 2L | ~7 sessions |
| B3 Implementation | B-12 through B-20 | 4L + 5M | ~14 sessions |
| Graduation | B-21 | 1L | ~2 sessions |
| **Total** | **21 tasks** | **1S + 13M + 7L** | **~29 sessions** |

**Critical path:** B-01 through B-06 (B1 completion) -> B-21 graduation metrics -> B-07 through B-11 (B2) -> B-21 validates B2 graduation -> B-12 through B-20 (B3). The graduation measurement system (B-21) should be built early so it can measure B1 and validate readiness for B2 transition.

**Parallelism opportunities:** Within B1, B-03 (demand signals) and B-04 (contradiction scan) are independent. Within B3, B-14/B-15 (identity/access) are independent of B-16/B-17 (retrieval/graph). B-18 (quarantine integration) depends on B-12 (MCP scaffold) but not on B-14/B-15.

### 8.5 Brain Excellence

- [ ] **B-22: Brain entry versioning** — Track versions with supersession chain. Done when: Version chain queryable, rollback supported. Files: `admiral/brain/versioning.sh` (new). Size: M

- [ ] **B-23: Brain entry expiration** — TTL-based expiration for time-sensitive knowledge. Done when: Optional TTL, auto-archive, warnings before TTL. Files: `admiral/brain/expiration.sh` (new). Size: M

- [ ] **B-24: Cross-project knowledge sharing** — Share entries across projects with permissions. Done when: Entries shareable, permissions enforced, provenance maintained. Files: `admiral/brain/sharing.sh` (new). Size: L

- [ ] **B-25: Brain usage analytics** — Track most/least used entries, gaps, ROI. Done when: Per-entry usage tracking, analytics endpoint, gap detection. Files: `admiral/brain/analytics.sh` (new). Size: M

- [ ] **B-26: Brain backup and restore** — Automated backup with point-in-time recovery. Done when: Scheduled backups, recovery works, integrity verified. Files: `admiral/brain/backup.sh` (new). Size: M

- [ ] **B-27: Brain schema migration testing** — Test B1→B2→B3 migrations. Done when: All types covered, metadata preserved, edge cases tested. Files: `admiral/tests/test_brain_migration.sh` (new). Size: M

- [ ] **B-28: Brain entry templates** — Pre-defined templates for common entry types. Done when: 5+ templates, --template flag, validation. Files: `admiral/brain/templates/` (new). Size: S

---

### Updated Stream 8 Summary

| Phase | Tasks | Sizes |
|---|---|---|
| 8.1 B1 Completion | B-01 to B-06 | 1S + 5M |
| 8.2 B2 Implementation | B-07 to B-11 | 3M + 2L |
| 8.3 B3 Implementation | B-12 to B-20 | 4L + 5M |
| 8.4 Graduation | B-21 | 1L |
| 8.5 Brain Excellence | B-22 to B-28 | 1S + 5M + 1L |
| **Total** | **28 items** | **2S + 18M + 8L** |
