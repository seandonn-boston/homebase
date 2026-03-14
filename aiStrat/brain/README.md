<!-- Admiral Framework v0.3.1-alpha -->
# The Brain — Architecture Specification

**Long-term fleet memory: Postgres + pgvector, accessible via MCP.**

This directory contains the architecture specification for the Brain — the fleet's durable knowledge system defined in [admiral/part5-brain.md](../admiral/part5-brain.md). It specifies:

- A database schema for storing decisions, outcomes, lessons, failures, and patterns as vector embeddings
- An MCP server interface exposing eight tools (`brain_record`, `brain_query`, `brain_retrieve`, `brain_strengthen`, `brain_supersede`, `brain_status`, `brain_audit`, `brain_purge`) that any AI agent can use
- A ranked retrieval pipeline combining eight signals: semantic similarity, project relevance, recency, usefulness, currency, category matching, provenance weight, and speculative discount. *Each signal prevents a specific failure mode: similarity prevents keyword-miss; recency prevents stale advice; usefulness prevents noise; provenance weight prevents trusting unverified entries as authoritative.*
- A zero-trust access control model with identity token lifecycle, mandatory audit logging, and sensitivity classification
- A pluggable embedding interface for generating vector representations

## MCP Tool Contracts

Each tool exposed by the Brain MCP server has a defined contract. See [admiral/part5-brain.md](../admiral/part5-brain.md) Section 16 for full behavioral semantics.

### brain_record

Record a new entry in the Brain.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project` | string | yes | Project identifier |
| `category` | string | yes | `decision` \| `outcome` \| `lesson` \| `context` \| `failure` \| `pattern` |
| `title` | string | yes | One-line human-readable summary |
| `content` | string | yes | Full detail: what, why, alternatives, rationale |
| `metadata` | object | no | Tags, references, related sections (stored as JSONB) |
| `links` | array | no | Array of `{target_id: UUID, link_type: string}` relationships |
| `sensitivity` | string | no | `standard` \| `elevated` \| `restricted` (default: `standard`). Allows callers to explicitly classify entry sensitivity rather than relying on implicit derivation from identity token. |

**Implicit fields (derived from identity token, not caller-supplied):** `source_agent`, `source_session`, `authority_tier`, `approved` (defaults to `true`; monitor seed candidates arrive with `approved = false`). Note: `sensitivity` defaults to `standard` if not provided explicitly; it may also be derived from the identity token's authority tier when omitted.

> **Approval workflow:** The `approved` column defaults to `true` for entries written by fleet agents. Monitor seed candidates arrive with `approved = false`. Approval is an Admiral-only SQL operation (`UPDATE entries SET approved = true WHERE id = ?`) performed outside the MCP tool layer. This is intentional: approval is a governance action exclusive to the Admiral, not an agent-accessible operation. No MCP tool provides approval to prevent any agent from self-approving content.

**Returns:** `{ id: UUID, source_agent: string, source_session: string }` — the newly created entry's identifier and confirmed implicit provenance values derived from the identity token.

**Errors:** `INVALID_CATEGORY` if category not in allowed set. `PROJECT_SCOPE_VIOLATION` if agent not assigned to the target project. `IDENTITY_VERIFICATION_FAILED` if token is invalid or expired.

### brain_query

Semantic search across entries.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | Natural language question or topic |
| `project` | string | no | Filter to a specific project (omit for cross-project) |
| `category` | string | no | Filter to a category |
| `limit` | integer | no | Max results (default: 10) |
| `min_score` | float | no | Minimum similarity threshold (default: 0.7) |
| `current_only` | boolean | no | Exclude superseded entries (default: true) |

**Returns:** `{ entries: [{ id, project, category, title, content, score, usefulness, created_at }] }` — ranked by composite score (similarity + usefulness + recency + other signals).

**Errors:** `CROSS_PROJECT_DENIED` if non-orchestrator agent omits project filter. `IDENTITY_VERIFICATION_FAILED`.

### brain_retrieve

Fetch a specific entry by ID, including its link graph.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | yes | Entry UUID |
| `depth` | integer | no | Link traversal depth (default: 1, max: 3) |

**Returns:** `{ entry: { id, project, category, title, content, metadata, source_agent, authority_tier, access_count, usefulness, superseded_by, created_at, updated_at }, links: [{ id, link_type, direction, entry }] }`.

**Errors:** `NOT_FOUND` if entry does not exist. `PROJECT_SCOPE_VIOLATION` if entry belongs to a project the agent cannot read.

### brain_strengthen

Signal that a retrieved entry was useful (or not).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | yes | Entry UUID |
| `useful` | boolean | yes | Whether the entry was useful |
| `context` | string | no | Brief note on why |

**Returns:** `{ id, usefulness: integer }` — the updated usefulness score.

**Errors:** `NOT_FOUND`. `IDENTITY_VERIFICATION_FAILED`.

### brain_supersede

Mark an entry as superseded by a new one. Restricted to orchestrator-level agents and Admiral.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `old_id` | UUID | yes | Entry being superseded |
| `new_id` | UUID | yes | Replacement entry |
| `reason` | string | no | Why the old entry is no longer current |

**Returns:** `{ old_id, new_id, status: "superseded" }`.

**Errors:** `NOT_FOUND` if either entry does not exist. `AUTHORITY_INSUFFICIENT` if caller is below orchestrator tier. `ALREADY_SUPERSEDED` if old entry is already superseded.

### brain_status

Health and statistics for the Brain.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project` | string | no | Filter to a specific project |

**Returns:** `{ entry_counts: { decision, outcome, lesson, context, failure, pattern }, avg_usefulness: float, total_entries: integer, storage_bytes: integer, oldest_entry: timestamp, newest_entry: timestamp }`.

**Errors:** `IDENTITY_VERIFICATION_FAILED`.

### brain_audit

Query the audit log. Restricted to Admiral.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project` | string | no | Filter to a specific project |
| `agent_id` | string | no | Filter to a specific agent |
| `operation` | string | no | Filter by operation type (`record` \| `query` \| `retrieve` \| `strengthen` \| `supersede` \| `audit` \| `purge` \| `status`) |
| `since` | timestamp | no | Only entries after this time |
| `limit` | integer | no | Max results (default: 50) |

**Returns:** `{ logs: [{ timestamp, agent_id, session_id, operation, project, entry_ids, result, risk_flags, details, ip_or_source }] }`.

**Errors:** `AUTHORITY_INSUFFICIENT` if caller is not Admiral. `IDENTITY_VERIFICATION_FAILED`.

### brain_purge

Permanently delete a Brain entry for regulatory compliance (right-to-erasure). Restricted to Admiral.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | yes | Entry UUID to purge |
| `regulation` | string | yes | Regulatory basis (e.g., "GDPR Art. 17", "CCPA", "internal-policy") |
| `reason` | string | yes | Human-readable justification for the purge |

**Behavior:** The entry's content, title, metadata, and embedding are permanently deleted. A tombstone record remains (entry ID, `purged_at` timestamp, `purge_reason`, and `regulation`) for audit trail completeness. The tombstone is not retrievable via `brain_query` or `brain_retrieve`. All `entry_links` referencing the purged entry are removed. An `audit_log` entry records the purge event without the purged content.

**Returns:** `{ id, status: "purged", purged_at: timestamp }`.

**Errors:** `AUTHORITY_INSUFFICIENT` if caller is not Admiral. `NOT_FOUND` if entry does not exist. `ALREADY_PURGED` if entry was previously purged.

> **Note:** The `audit_log` table now exists in the schema (`schema/001_initial.sql`). All eight MCP tools generate audit records on every invocation — see the Audit Logging section in Part 5, Section 16.

## Design Artifacts

```
brain/
├── README.md               # This file — architecture overview
├── level1-spec.md          # Level 1 (file-based) specification
├── level2-spec.md          # Level 2 (SQLite + embeddings) specification
├── level3-spec.md          # Level 3 (Postgres + pgvector + MCP — COMPLETE Brain)
└── schema/
    ├── 001_initial.sql     # Postgres + pgvector schema (entries, entry_links, audit_log, indexes)
    ├── test_schema.sql     # Schema parity tests
    └── test_sensitive_data_guard.sql  # Sensitive data rejection tests
```

## Relationship to the Admiral Framework

| Part 5 Section | What It Specifies |
|---|---|
| Section 15 — Brain Architecture | Schema design, entry categories, strengthening model, vector embeddings |
| Section 16 — Knowledge Protocol | MCP server tools, access control, audit logging, identity token lifecycle, RAG security |
| Section 17 — Intelligence Lifecycle | Retrieval pipeline, multi-hop retrieval, knowledge graph, cross-project intelligence |

## Architecture Decisions

- **Postgres + pgvector** chosen for combined structured/unstructured/vector storage in a single transactional system. No vendor lock-in.
- **MCP as the universal interface.** Any agent that speaks MCP speaks to the Brain — Claude Code, Agent SDK agents, third-party agents. Protocol-agnostic by design.
- **Zero-trust access control.** Identity tokens are cryptographically signed, session-scoped, non-delegable. No caller-declared identity trusted.
- **Embedding generation is pluggable.** The `EmbeddingProvider` interface accepts any implementation — OpenAI, local models, or future alternatives. The `embedding_model` column tracks which model produced each entry's embedding for migration purposes, but no MCP tool exposes embedding model selection or re-embedding. Embedding generation is an infrastructure concern managed at the MCP server configuration level, not an agent-facing operation. At Level 2 (SQLite), the embedding model is configured at deployment time. Agents interact with embeddings indirectly through `brain_query` (semantic search) and `brain_record` (automatic embedding on write).
- **Retrieval is multi-signal.** Vector similarity alone is insufficient. The pipeline applies eight ranking signals from Part 5, Section 17, including multi-hop traversal and contradiction awareness.
- **All access is audited.** Immutable, append-only audit log captures every operation with verified identity, risk flags, and sensitivity classification.

## Schema Overview

The schema (`schema/001_initial.sql`) defines three tables:

- **entries** — The atomic unit of knowledge: UUID, project, category, title, content, vector embedding (1536 dimensions), metadata (JSONB), provenance, authority tier, strengthening signals (access_count, usefulness), supersession chain, and `sensitivity` classification (`standard`, `elevated`, `restricted`).
- **entry_links** — Typed relationships between entries: supports, contradicts, supersedes, elaborates, caused_by. Enables knowledge graph traversal and multi-hop retrieval.
- **audit_log** — Append-only record of every MCP tool invocation: timestamp, agent identity, operation, project, affected entry IDs, result, and risk flags. Immutable by design — no UPDATE or DELETE permitted.

Indexes: HNSW for approximate nearest neighbor vector search, composite indexes for filtered queries (project + category, created_at, authority_tier), GIN index for JSONB tag queries.

## Data Sensitivity

**The Brain must never store PII, passwords, secrets, credentials, or sensitive information.** The Brain is a knowledge system, not a data warehouse. Secrets are liabilities, not knowledge — they create attack surface, require rotation tracking, and violate the principle that Brain entries should be freely queryable by any authorized agent. This is enforced deterministically at two layers:

1. **Application sanitizer** — scans all entry fields before storage, rejects entries containing sensitive patterns
2. **Database trigger** (`schema/001_initial.sql`) — SQL-level pattern rejection as defense-in-depth

Store **knowledge** (patterns, decisions, lessons), not **data** (emails, credentials, PII). See [admiral/part11-protocols.md, Section 41](../admiral/part11-protocols.md) for the full protocol.

## Security Model

See [admiral/part5-brain.md](../admiral/part5-brain.md) Section 16 for the full specification:

- **Identity tokens** with cryptographic signatures, session scoping, rotation, revocation, and non-delegation
- **Permission matrix** enforced at runtime: read own project (all agents), read cross-project (orchestrators/Admiral only), write own project, supersede (orchestrator/Admiral only)
- **Sensitivity classification** at write time: Standard, Elevated, Restricted
- **Quarantine integration** for external intelligence (monitor findings pass through 5-layer immune system — 3 LLM-airgapped deterministic layers + 1 LLM advisory layer + antibody — before Brain ingestion)
- **RAG security** including retrieval poisoning prevention, grounding requirements, and pipeline integrity checks
