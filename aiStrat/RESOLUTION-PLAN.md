<!-- Admiral Framework v0.2.0-alpha -->
# Admiral Framework v0.1.0-alpha — Resolution Plan

**Date:** 2026-03-05
**Status:** All items resolved as of 2026-03-08. Version bumped to v0.1.1-alpha.
**Source:** Adversarial review of entire codebase (46 markdown files + 1 SQL schema)
**Scope:** Spec-internal issues only. Excludes "battle-tested valor" concerns (production validation, competitive benchmarking, adoption proof).

---

## Pass 1 — Data Integrity (Text Corrections)

No design decisions needed. Grep, fix, verify.

### 1.1 Fix agent count ~~71 → 67~~ — RESOLVED

- **Status:** ✅ Resolved. The correct count is **71** (67 specialists + 4 command = 71 core). All references now say 71.
- **Note:** The original plan's diagnosis was inverted — 71 was correct, 67 was the stale count. Fixed in fleet/README.md, part4-fleet.md, and CLAUDE.md.

### 1.2 Fix section numbering collision (two Section 35s) — RESOLVED

- **Status:** ✅ Resolved. Part 10 contains Sections 33-35, Part 11 contains Sections 36-41. No collision.

### 1.3 Fix appendices.md wrong section reference — RESOLVED

- **Status:** ✅ Resolved. References now correctly use "Configuration File Strategy (07)" and "Section 07, Configuration File Strategy (Part 2 — Context)".

### 1.4 Fix Standing Order cross-reference notation — RESOLVED

- **Status:** ✅ Resolved. References now use "Standing Order 4 (Context Honesty) and Standing Order 5 (Decision Authority)".

### 1.5 Fix adversarial.md header tier claim — RESOLVED

- **Status:** ✅ Resolved. Header now reads "Model Tier: Varies by agent (see individual definitions below)".

### 1.6 Add brain_audit to part5-brain.md — RESOLVED

- **Status:** ✅ Resolved. Part 5 Section 16 now lists all 8 MCP tools (brain_record, brain_query, brain_retrieve, brain_strengthen, brain_supersede, brain_status, brain_audit, brain_purge), matching brain/README.md.

---

## Pass 2 — Schema Alignment — ALL RESOLVED

All items in Pass 2 are implemented in the current schema (`brain/schema/001_initial.sql`). The schema includes: audit_log fields (2.1), approved field (2.2), non-nullable provenance (2.3), REVOKE TRUNCATE (2.4), embedding_model tracking (2.5), last_accessed_at decay tracking (2.6).

Update `brain/schema/001_initial.sql` to match what the spec promises. Kill the inline schema duplication in part5-brain.md.

### 2.1 Add missing audit_log fields

- **File:** `brain/schema/001_initial.sql`
- **Add columns:**
  ```sql
  project      TEXT NOT NULL,
  entry_ids    UUID[],
  result       TEXT NOT NULL CHECK (result IN ('success', 'denied', 'error')),
  risk_flags   JSONB NOT NULL DEFAULT '[]'
  ```
- **Add indexes:**
  ```sql
  CREATE INDEX idx_audit_log_timestamp ON audit_log (timestamp);
  CREATE INDEX idx_audit_log_agent_id ON audit_log (agent_id);
  CREATE INDEX idx_audit_log_project ON audit_log (project);
  CREATE INDEX idx_audit_log_operation ON audit_log (operation);
  ```
- **Verification:** Compare audit_log columns against brain/README.md brain_audit return schema. Every field in the return value must have a column.

### 2.2 Add approved field for Monitor integration

- **File:** `brain/schema/001_initial.sql`
- **Add:**
  ```sql
  approved     BOOLEAN NOT NULL DEFAULT true
  ```
- **Rationale:** Monitor inserts with `approved = false`. Brain queries default to `WHERE approved = true`. Admiral flips to `true` after review.
- **Add index:**
  ```sql
  CREATE INDEX idx_entries_approved ON entries (approved) WHERE approved = false;
  ```
- **Verification:** Confirm monitor/README.md seed candidate workflow is consistent with this column.

### 2.3 Make provenance fields non-nullable

- **File:** `brain/schema/001_initial.sql`
- **Change:**
  ```sql
  source_agent    TEXT NOT NULL,
  source_session  TEXT NOT NULL,
  ```
- **Bootstrap handling:** Document that system-generated entries (schema bootstrap, manual imports) use `'SYSTEM'` and `'BOOTSTRAP'` as sentinel values.
- **Verification:** Confirm part5-brain.md provenance tracking description is consistent.

### 2.4 Harden audit_log immutability

- **File:** `brain/schema/001_initial.sql`
- **Add after existing rules:**
  ```sql
  REVOKE TRUNCATE ON audit_log FROM PUBLIC;
  ```
- **Add comment documenting:** The audit_log table owner should be a restricted database role, not the application user. Application connects via a role that has INSERT but not TRUNCATE, UPDATE, DELETE, or rule-alter privileges.
- **Verification:** Confirm the spec's "immutable, append-only" claim is defensible with these additions.

### 2.5 Add embedding lifecycle tracking

- **File:** `brain/schema/001_initial.sql`
- **Add to entries table:**
  ```sql
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  ```
- **Rationale:** Tracks which model produced each embedding. Makes future model migrations queryable (`SELECT * FROM entries WHERE embedding_model != 'new-model'`).
- **Verification:** Confirm part5-brain.md "pluggable embedding interface" claim is now grounded.

### 2.6 Add decay tracking

- **File:** `brain/schema/001_initial.sql`
- **Add to entries table:**
  ```sql
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  ```
- **Add index:**
  ```sql
  CREATE INDEX idx_entries_last_accessed ON entries (last_accessed_at);
  ```
- **Rationale:** Part5 promises "entries not accessed in 90 days flagged for review." `access_count` tells frequency but not recency. Application code updates `last_accessed_at` on every `brain_query`/`brain_retrieve` hit.
- **Verification:** Confirm part5-brain.md decay awareness description is now implementable.

### 2.7 Kill inline schema duplication in part5-brain.md

- **File:** `admiral/part5-brain.md:57-105`
- **Action:** Replace the full inline schema with a 5-line summary of the tables (entries, entry_links, audit_log) and a pointer: "See `brain/schema/001_initial.sql` for the canonical schema."
- **Rationale:** The inline copy is already stale. Two sources of truth guarantees drift. The SQL file is the single source of truth.
- **Verification:** Confirm no other file contains an inline copy of the schema.

---

## Pass 3 — Structural Deduplication

### 3.1 Resolve part4-fleet.md roster duplication — RESOLVED

- **Status:** ✅ Resolved. Part 4 Section 11 now contains:
  - A reference to `fleet/README.md` as the canonical agent catalog (line 29)
  - The Core Fleet table (11 agents for minimum viable deployment)
  - Agent Roster template and principles (role definition format, "Does NOT Do" pattern, routing logic)
  - No stale agent counts — dynamic count deferred to fleet/README.md.

---

## Execution Order

| Order | Items | Estimated Time | Dependencies |
|---|---|---|---|
| 1 | Pass 1 (1.1–1.6) | 30 min | None |
| 2 | Pass 2 (2.1–2.7) | 30 min | None (independent of Pass 1) |
| 3 | Pass 3 (3.1) | 30 min | Pass 1.1 must be done first (agent count fixed before dedup) |

Passes 1 and 2 can run in parallel. Pass 3 depends on Pass 1.1.

---

## Out of Scope (Acknowledged, Not Addressed Here)

These are real issues identified in the adversarial review that require design decisions or production validation, not spec text fixes:

- Identity token format specification (needs architecture decision)
- ~~Quarantine Layer 3 circular LLM dependency (needs security design)~~ — **Resolved:** Layer 3 callout in part3-enforcement.md was stale, not a design issue. Fixed to correctly describe Layer 3 as deterministic and LLM-airgapped.
- ~~Governance agent overlap boundaries (needs decision rules)~~ — **Resolved:** Mutual boundary acknowledgments added to 6 overlapping agent pairs' Does NOT Do sections.
- Enforcement tooling for the spec itself (CI pipeline for cross-reference validation — worth building but separate effort)
- Performance benchmark sourcing (needs real data from a real project)
- Scale agent validation (needs production proof)

These become relevant when Admiral is applied to a project. They are the "battle-tested valor" concerns the user explicitly excluded from this plan.
