# Admiral Framework v0.1.0-alpha — Resolution Plan

**Date:** 2026-03-05
**Source:** Adversarial review of entire codebase (46 markdown files + 1 SQL schema)
**Scope:** Spec-internal issues only. Excludes "battle-tested valor" concerns (production validation, competitive benchmarking, adoption proof).

---

## Pass 1 — Data Integrity (Text Corrections)

No design decisions needed. Grep, fix, verify.

### 1.1 Fix agent count: 71 → 67

- **Files:** `fleet/README.md:100`, `CLAUDE.md:14`, `admiral/index.md:229`
- **Root cause:** `fleet/specialists.md:60` correctly says 67. README and CLAUDE.md say 71. The 71 is stale — likely from before a category restructure.
- **Action:** Change all instances of "71 core" to "67 core". Grep the entire repo for "71" near "agent" or "core" to catch any others. Update the total (71+29=100) to (67+29=96) everywhere it appears.
- **Verification:** Count every agent definition across all fleet/agents/ files. Confirm sum matches.

### 1.2 Fix section numbering collision (two Section 35s)

- **Files:** `admiral/part10-admiral.md`, `admiral/part11-protocols.md`, `admiral/index.md`
- **Root cause:** Multi-Operator Governance was added to Part 10 as Section 35 without updating the numbering cascade. Part 11 already owned Section 35 (Standing Orders).
- **Action (recommended):** Renumber Part 10 to contain Sections 33, 34, 35 (Multi-Operator Governance). Renumber Part 11 to Sections 36–40 (Standing Orders through Paid Resource Authorization). Update the index.md table of contents. Grep all cross-references to Sections 35–39 and increment by 1.
- **Alternative:** Move Multi-Operator Governance into Part 11 as the first section (before Standing Orders) and renumber accordingly.
- **Verification:** Confirm no section number appears in more than one part file.

### 1.3 Fix appendices.md wrong section reference

- **File:** `admiral/appendices.md:267`
- **Current:** "Part 7 Configuration File Strategy"
- **Fix:** Change to "Section 07, Configuration File Strategy (Part 2 — Context)"
- **Verification:** Read the surrounding context to confirm no other Part/Section conflations.

### 1.4 Fix Standing Order cross-reference notation

- **File:** `admiral/part11-protocols.md:482`
- **Current:** "Standing Orders Section 35.4 (Context Honesty) and Section 35.5 (Decision Authority)"
- **Fix:** "Standing Order 4 (Context Honesty) and Standing Order 5 (Decision Authority)"
- **Verification:** Grep for "Section 35." to find any other instances of this notation pattern.

### 1.5 Fix adversarial.md header tier claim

- **File:** `fleet/agents/adversarial.md:4`
- **Current:** Header says "Model Tier: Tier 1 — Flagship" but Simulated User and Persona Agent are Tier 2.
- **Fix:** Remove the category-level tier claim. Each agent already declares its own tier. Replace with "Model Tier: Varies by agent (see individual definitions below)".
- **Verification:** Confirm all 4 agent definitions in the file have their own tier declarations.

### 1.6 Add brain_audit to part5-brain.md

- **Files:** `admiral/part5-brain.md` (Section 16), `brain/README.md:8`
- **Current:** brain/README.md lists 7 MCP tools including `brain_audit`. Part 5 Section 16 lists only 6.
- **Fix:** Add `brain_audit` tool contract to part5-brain.md Section 16 using the same format as the other six tools. Copy the contract from brain/README.md lines 106-118.
- **Verification:** Count tools in both files. Must match.

---

## Pass 2 — Schema Alignment

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

### 3.1 Resolve part4-fleet.md roster duplication

- **File:** `admiral/part4-fleet.md` (Section 11)
- **Current:** Lists 31 agents in a "Practical Role Catalog" that is a stale subset of the 67 agents in fleet/.
- **Action:** Remove the full roster enumeration from part4. Replace with:
  - A reference to `fleet/README.md` as the canonical agent catalog
  - The Core Fleet table (11 agents for minimum viable deployment) — this is useful context that belongs in doctrine
  - The Agent Roster template and principles (role definition format, "Does NOT Do" pattern, routing logic)
- **Rationale:** Part4 should define how to compose a fleet (principles). Fleet/ should define what's in the catalog (inventory). Currently both try to do both and disagree.
- **Verification:** Confirm part4 no longer contains agent counts that could go stale. Confirm fleet/README.md is the sole source for the catalog.

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
- Quarantine Layer 3 circular LLM dependency (needs security design)
- Governance agent overlap boundaries (needs decision rules — may be addressed during project application)
- Enforcement tooling for the spec itself (CI pipeline for cross-reference validation — worth building but separate effort)
- Performance benchmark sourcing (needs real data from a real project)
- Scale agent validation (needs production proof)

These become relevant when Admiral is applied to a project. They are the "battle-tested valor" concerns the user explicitly excluded from this plan.
