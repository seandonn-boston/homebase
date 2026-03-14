<!-- Admiral Framework v0.4.0-alpha -->
# Brain Level 3 Specification — Full Brain (Postgres + pgvector + MCP)

**Level 3 is the complete Brain.** All Brain capabilities are fully specified at this level. Levels 4 and 5 of the Admiral Framework add fleet-level capabilities (scale agents, full enforcement, multi-fleet coordination) but do not modify the Brain architecture.

-----

## Overview

Level 3 replaces SQLite with Postgres + pgvector, adds the MCP server as the universal agent interface, introduces cryptographic identity tokens for zero-trust access control, and enables the quarantine layer for external intelligence. This is the production-grade Brain.

| Component | Technology | Purpose |
|---|---|---|
| Storage | Postgres + pgvector | Transactional, concurrent, vector-native |
| Interface | MCP server (8 tools) | Universal agent access protocol |
| Identity | JWT (ES256 recommended) | Zero-trust, session-scoped, non-delegable |
| Retrieval | Multi-signal pipeline + HNSW | Eight ranking signals, multi-hop traversal |
| Security | Sensitivity classification + permission matrix | Per-agent scoping, audit logging |
| Quarantine | 5-layer immune system | External intelligence validation |

-----

## Schema

The complete Postgres schema lives in `schema/001_initial.sql`. Three tables:

### entries

The atomic unit of knowledge. Key columns beyond Level 2:

| Column | Type | New at Level 3 | Purpose |
|---|---|---|---|
| `id` | UUID | Upgraded from TEXT | Native UUID generation |
| `embedding` | vector(1536) | Upgraded from BLOB | Native vector operations with HNSW indexing |
| `sensitivity` | TEXT | Yes | Classification: `standard`, `elevated`, `restricted` |
| `approved` | BOOLEAN | Yes | `true` for fleet entries, `false` for external/monitor entries pending review |
| `authority_tier` | TEXT | Yes | `enforced`, `autonomous`, `propose`, `escalate` |
| `source_session` | TEXT | Yes | Session tracking for provenance |
| `purge_regulation` | TEXT | Yes | Regulatory basis for right-to-erasure (e.g., "GDPR Art. 17") |

### entry_links

Typed relationships between entries: `supports`, `contradicts`, `supersedes`, `elaborates`, `caused_by`. Enables knowledge graph traversal and multi-hop retrieval.

### audit_log

Append-only, immutable record of every MCP operation. Key columns beyond Level 2:

| Column | Type | New at Level 3 | Purpose |
|---|---|---|---|
| `session_id` | TEXT | Yes | Binds operation to verified session |
| `entry_ids` | UUID[] | Yes | Array of affected entries per operation |
| `risk_flags` | JSONB | Yes | Machine-readable risk indicators |
| `ip_or_source` | TEXT | Yes | Request origin for forensics |

### Indexes

- **HNSW** on `entries.embedding` for approximate nearest neighbor search (cosine distance)
- **Composite** on `(project, category)`, `created_at`, `authority_tier`
- **GIN** on `metadata->'tags'` for JSONB tag queries
- **Partial** on `approved` WHERE `approved = false` (fast quarantine queries)
- **Partial** on `superseded_by` WHERE `superseded_by IS NOT NULL` (chain traversal)

-----

## MCP Server

The Brain exposes 8 tools via the Model Context Protocol. Any agent that speaks MCP can interact with the Brain — Claude Code, Agent SDK agents, third-party agents.

| Tool | Operation | Access |
|---|---|---|
| `brain_record` | Write a new entry | All agents (own project) |
| `brain_query` | Semantic search with ranking | All agents (own project); Orchestrator/Admiral (cross-project) |
| `brain_retrieve` | Fetch by ID with link traversal | All agents (own project) |
| `brain_strengthen` | Increment usefulness signal | All agents |
| `brain_supersede` | Mark entry obsolete, link replacement | Orchestrator/Admiral only |
| `brain_status` | Health and statistics | All agents |
| `brain_audit` | Query audit log | Admiral only |
| `brain_purge` | Right-to-erasure compliance | Admiral only |

See `brain/README.md` for detailed tool contracts (parameters, returns, errors).

-----

## Identity Tokens

Every MCP request requires a cryptographically verified identity token. No caller-declared identity is trusted.

### Token Format

| Claim | Type | Description |
|---|---|---|
| `token_id` | UUID | Unique token identifier |
| `agent_id` | string | Verified agent identity |
| `project` | string | Project scope |
| `role` | string | Agent role (maps to permission matrix) |
| `authority_tier` | enum | `enforced`, `autonomous`, `propose`, `escalate` |
| `session_id` | UUID | Session binding |
| `issued_at` | ISO 8601 | Token creation time |
| `expires_at` | ISO 8601 | Expiration (default 1 hour, max 4 hours) |
| `issuer` | string | Token issuer identity |

### Signing

- **Recommended:** ES256 (ECDSA with P-256 curve) — fast, compact, secure
- **Acceptable:** RS256 (RSA with SHA-256) — wider library support
- **Single-server only:** HS256 (HMAC) — shared secret, not for distributed deployments

### Verification (every request)

1. Signature validity
2. Expiration check (`expires_at > now()`)
3. Session validity (session not terminated)
4. Revocation status (token not in revocation list)

### Lifecycle

- Tokens are session-scoped and non-delegable
- Rotation: new token issued before expiration, old token remains valid for grace period
- Revocation: immediate via revocation list; epoch-based propagation for distributed deployments

-----

## Permission Matrix

| Operation | All Agents | Orchestrator | Admiral |
|---|---|---|---|
| Read own project | Yes | Yes | Yes |
| Read cross-project | No | Yes | Yes |
| Write own project | Yes | Yes | Yes |
| Supersede | No | Yes | Yes |
| Audit | No | No | Yes |
| Purge | No | No | Yes |

-----

## Sensitivity Classification

Assessed at write time by the MCP server, re-assessed at retrieval based on requesting agent's context.

| Level | Access | Examples |
|---|---|---|
| Standard | All authorized agents | Architecture decisions, coding patterns, general lessons |
| Elevated | Orchestrator + Admiral | Security findings, performance bottlenecks, vendor-specific details |
| Restricted | Admiral only | Compliance findings, cost data, personnel-related decisions |

-----

## Quarantine Layer

External intelligence (from the Monitor, third-party feeds, or cross-fleet federation) passes through a 5-layer immune system before Brain ingestion:

1. **Layer 1: Deterministic signature matching** — Known-bad pattern rejection (no LLM)
2. **Layer 2: Deterministic structural validation** — Schema/format compliance (no LLM)
3. **Layer 3: Deterministic semantic analysis** — Attack corpus pattern matching (no LLM)
4. **Layer 4: LLM advisory analysis** — Contextual threat assessment (LLM, advisory only)
5. **Layer 5: Antibody memory** — Previously quarantined patterns auto-rejected

Entries passing all 5 layers arrive with `approved = false`. Only the Admiral can set `approved = true`.

-----

## Multi-Signal Retrieval Pipeline

Level 3 applies eight ranking signals (defined in Part 5, Intelligence Lifecycle):

1. **Semantic similarity** — Cosine distance via pgvector HNSW
2. **Project relevance** — Same-project entries weighted higher
3. **Recency** — Recent entries preferred over stale ones
4. **Usefulness** — Entries with higher usefulness scores rank higher
5. **Currency** — Non-superseded entries preferred
6. **Category matching** — Category-appropriate entries weighted
7. **Provenance weight** — Higher authority tier entries rank higher
8. **Speculative discount** — Low-confidence entries discounted

Multi-hop traversal follows `entry_links` to build reasoning chains (e.g., decision → outcome → lesson).

-----

## Migration from Level 2

Column-for-column import with defaults for new fields:

| Level 2 SQLite | Level 3 Postgres | Migration Note |
|---|---|---|
| `id` (TEXT) | `id` (UUID) | Cast text to UUID |
| `embedding` (BLOB) | `embedding` (vector(1536)) | Deserialize blob, insert as vector. Re-embed if model differs. |
| `metadata` (TEXT) | `metadata` (JSONB) | Direct cast via `::jsonb` |
| `created_at` (TEXT) | `created_at` (TIMESTAMPTZ) | Parse ISO 8601 string |
| — | `sensitivity` | Default to `'standard'` |
| — | `approved` | Default to `true` (internal entries are pre-approved) |
| — | `authority_tier` | Default to `'autonomous'` or populate from source agent role |
| — | `source_session` | Default to `'migration'` |
| — | `last_accessed_at` | Set to `created_at` |
| `audit_log` (subset) | `audit_log` (full) | Add columns: `session_id`, `entry_ids` (UUID[]), `risk_flags` (JSONB), `ip_or_source` (TEXT) |

-----

## This Is the Complete Brain

No Brain changes occur at Levels 4 or 5 of the Admiral Framework. Level 4 adds fleet-level capabilities (scale agents, full enforcement, fleet observability) and Level 5 adds enterprise capabilities (multi-fleet coordination, cross-org federation). The Brain architecture at Level 3 supports all of these without modification — cross-project queries, cross-fleet federation, and multi-operator access are all handled by the identity token and permission matrix system defined here.
