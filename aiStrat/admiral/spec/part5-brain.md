# PART 5 — THE BRAIN

*How does the fleet remember?*

*Parts 1–4 define what the fleet is, what it knows, how it's enforced, and who does the work. Part 5 gives the fleet long-term memory — a queryable knowledge system accessible through a standard protocol that any AI agent can speak. It replaces file-based persistence (Institutional Memory, Part 8) with a permanent knowledge system that captures not just what happened, but what it meant and why it mattered. Set up the Brain before the fleet starts executing (Part 6) so that every decision, lesson, and failure is captured from day one.*

> **Control Plane surface:** Knowledge health, query patterns, and decay warnings surface in the Control Plane at B3+. Operators can see which Brain entries are being retrieved, which are strengthening, and which are decaying from disuse.

-----

## Brain Architecture

> **TL;DR** — A Postgres database with pgvector stores every decision, rationale, outcome, and lesson as vector embeddings that capture meaning, not keywords. One database. One schema. Any project. Any agent. Any time horizon.

### Start Simple: Validating the Brain Hypothesis

The full Brain specification below is enterprise-grade. Before committing to Postgres + pgvector + MCP, validate the core hypothesis: that persistent semantic memory improves fleet performance. Start with the lightest possible implementation, measure, then scale.

| Level | Storage | Retrieval | When to Advance |
|---|---|---|---|
| **B1: File-based** | JSON files in `.brain/` directory, one per entry. Git-tracked. See `brain/level1-spec.md` for entry format, directory layout, naming convention, and retrieval interface. | Keyword search via grep. Manual lookup. | When keyword search misses semantically relevant entries more than 30% of the time. |
| **B2: SQLite + embeddings** | Single SQLite file with entries table and vector column. Embeddings via local model or API. See `brain/level2-spec.md` for SQLite schema, embedding generation, similarity search, and B1 migration path. | Cosine similarity search. No multi-hop. | When concurrent agent access causes lock contention, or cross-project queries are needed. |
| **B3: Full Brain (COMPLETE)** | Postgres + pgvector with full schema from `brain/schema/001_initial.sql`. HNSW indexes. MCP server with 8 tools. Identity tokens (JWT). Zero-trust access control. Sensitivity classification. Quarantine layer. See `brain/level3-spec.md`. | Multi-signal retrieval pipeline. Multi-hop traversal. Confidence levels. Strengthening and decay awareness. | **B3 is the Brain's maximum level.** No Brain changes at the Production or Enterprise profiles. |

**The Brain is fully specified at B3.** The Production and Enterprise profiles of the Admiral Framework add fleet-level capabilities (scale agents, full enforcement, fleet observability, multi-fleet coordination) but do not modify the Brain architecture. If you have reached B3, you have the complete knowledge system.

Each level should run for at least 2 weeks of active fleet operation before advancing. Measure: retrieval hit rate (did the agent find what it needed?), retrieval precision (was the top result actually relevant?), and knowledge reuse rate (what percentage of Brain entries are accessed more than once?). Advance when these thresholds are met: **hit rate ≥85%**, **precision ≥90%**, **reuse rate ≥30%** of entries accessed 2+ times, with **≥5% improvement** over the 2-week baseline at the next level. If these metrics don't improve at the next level, the current level is sufficient.

**Supersession rate:** A healthy Brain has a supersession rate of **<10% of entries superseded per quarter**. A rate **>15% per quarter** indicates Brain entry quality issues and should trigger an audit of entry creation practices.

> **ANTI-PATTERN: PREMATURE ARCHITECTURE** — Deploying the full B3 Brain (Postgres + pgvector + MCP + identity tokens) for a fleet that hasn't yet determined whether persistent memory helps. The infrastructure cost (setup, maintenance, security surface) is justified only when lighter approaches hit their limits. Start at B1. Graduate when you have evidence.

### Why a Database, Not Files

Institutional Memory (Part 8) defines five file-based persistence patterns — checkpoint files, ledger files, handoff documents, git-based state, and continuous operation. Files work for single-agent, single-project, single-session persistence. They break down when:

- **Multiple agents need the same knowledge simultaneously.** Files have no concurrency model. Two agents reading and writing the same checkpoint creates race conditions or stale reads.
- **Knowledge spans projects.** A lesson learned in Fleet A (e.g., "Prisma migrations must be reversible") is valuable in Fleet B. Files are siloed by project directory.
- **Semantic retrieval is needed.** "What decisions were made about authentication?" requires scanning every checkpoint, parsing unstructured text, and guessing which entries are relevant. Files support exact-match or keyword search. Meaning requires vectors.
- **History compounds.** After 50 sessions, file-based persistence produces hundreds of checkpoint files no agent can hold in context. A database can answer "what matters now" from any volume of history.
- **Audit and compliance demand structured records.** Files drift in format. A database enforces schema.

The Brain does not replace files for session-level work. Checkpoint files and handoff documents remain the right tool for intra-session persistence (see Institutional Memory, Part 8). The Brain is where durable knowledge goes — the decisions, rationale, and outcomes that should outlive any single session.

### Technology Choice: Postgres + pgvector

| Requirement | Why Postgres + pgvector |
|---|---|
| **Structured + unstructured** | Relational tables for structured records (decisions, outcomes, metadata). JSONB columns for flexible payloads. Vector columns for semantic search. One system, not three. |
| **Vector embeddings** | pgvector provides native vector storage and similarity search. Embeddings capture meaning — "authentication flow" matches "login system" and "auth handshake" without keyword overlap. |
| **Maturity and ecosystem** | Postgres is the most deployed relational database in production. pgvector is the most widely adopted vector extension. No vendor lock-in. No proprietary APIs. |
| **Transactional integrity** | ACID guarantees. A decision record and its embedding are written atomically. No partial writes. No orphaned vectors. |
| **Scalability** | Handles single-project use (thousands of records) through enterprise use (millions) without architectural changes. HNSW and IVFFlat indexes for fast approximate nearest neighbor search at scale. |
| **Tooling** | Standard SQL for humans. Standard drivers for machines. MCP server for agents. Every audience has a native interface. |

### Schema Design

The Brain schema is deliberately simple. Complexity lives in the embeddings, not the tables.

**Core tables:**

- **`entries`** — The atomic unit of knowledge: classification, content, vector embedding, metadata, provenance, sensitivity, approval status, strengthening signals, and decay tracking.
- **`entry_links`** — Typed relationships between entries (supports, contradicts, supersedes, elaborates, caused_by). Enables knowledge graph traversal and multi-hop retrieval.
- **`audit_log`** — Append-only record of every MCP tool invocation: timestamp, agent identity, operation, project, affected entry IDs, result, and risk flags. Immutable by design.

See `brain/schema/001_initial.sql` for the canonical schema.

### Entry Categories

| Category | What It Captures | Example |
|---|---|---|
| **decision** | A choice made, alternatives considered, rationale, authority tier used | "Chose JWT over session cookies because the API must be stateless for horizontal scaling" |
| **outcome** | The result of a decision or task — success, failure, or partial | "JWT implementation completed. Auth middleware passes all 47 test cases" |
| **lesson** | A reusable insight extracted from experience | "Prisma migrations fail silently when the database URL contains special characters. Always URL-encode credentials" |
| **context** | A snapshot of Ground Truth, environment state, or configuration at a point in time | "Tech stack as of 2026-02-15: Next.js 15.2, Postgres 16, pgvector 0.8.0" |
| **failure** | A failure mode encountered, diagnosis, and resolution | "Specialist drifted into orchestrator decisions (hierarchical drift, Failure Mode Catalog, Part 7). Root cause: missing 'Does NOT Do' boundary in agent definition" |
| **pattern** | A reusable solution or anti-pattern extracted from one or more projects | "Contract-first parallelism reduces handoff rejection rate from 18% to 3% when API contracts are defined before frontend and backend work begins" |

### Vector Embeddings: Meaning, Not Keywords

Traditional search matches text. Vector search matches meaning.

```
Query: "How did we handle user authentication?"

Keyword search returns:
  ✓ Records containing "authentication"
  ✗ Misses "login flow," "auth middleware," "session management," "JWT implementation"

Vector search returns:
  ✓ All of the above — the embeddings for these terms are semantically close
  ✓ Also surfaces: "OAuth consideration we rejected" (related decision)
  ✓ Also surfaces: "Rate limiting on auth endpoints" (related context)
```

**Embedding generation:**

- Use a dedicated embedding model (e.g., text-embedding-3-small at 1536 dimensions, or any open-source alternative).
- Embed the concatenation of `title + content` — title provides a dense summary, content provides full detail.
- Re-embed when content is updated. Never serve stale embeddings.
- Embedding generation is a deterministic tool operation (LLM-Last principle, Boundaries, Part 1) — no flagship model needed.

### The Strengthening Model

Knowledge is not static. The Brain tracks which entries are useful and which have been superseded.

**Access tracking:** Every retrieval increments `access_count`. High-access entries are the fleet's working vocabulary — the knowledge agents actually use.

**Usefulness signal:** When an agent retrieves an entry and it contributes to a successful outcome, the consuming agent (or Admiral) increments `usefulness`. When an entry leads to a dead end, decrement. Net usefulness over time separates signal from noise.

**Supersession:** When a decision is reversed or a lesson is corrected, the old entry is not deleted. Its `superseded_by` field points to the replacement. History is preserved. Queries default to current entries but can traverse the supersession chain for full context.

**Decay awareness:** Entries that have not been accessed in a configurable window (e.g., 90 days) are flagged for review — not deleted, but surfaced to the Admiral for relevance assessment. Knowledge that is never retrieved may be stale.

> **ANTI-PATTERN: WRITE-ONLY MEMORY** — The Brain accumulates entries that are never queried. Decision logs grow unbounded. No agent benefits. The Brain is only valuable if it is read. Track access_count. If categories consistently show zero retrievals, the fleet either doesn't know the Brain exists (context gap) or the entries are not useful (quality gap). Diagnose and fix.

-----

## The Knowledge Protocol

> **TL;DR** — An MCP server exposes the Brain to any AI agent using a standard protocol. Agents write decisions, query semantically, and retrieve contextually relevant history — the same way, regardless of which agent, which model, or which tool built them. Humans use SQL. Machines use the API. Agents use MCP.

### MCP: The Universal Interface

The Model Context Protocol (Protocol Integration, Part 4) is how agents access tools and data sources. The Brain's MCP server makes the database a first-class tool in any agent's toolkit — no custom integration, no proprietary API, no coupling to a specific agent framework.

**Why MCP, not a custom API:**

- **Any agent can use it.** Claude Code, OpenHands, Devin, CrewAI agents, custom Agent SDK agents — if they speak MCP, they speak to the Brain. Today and in the future.
- **Discovery is built in.** The MCP server declares its tools, their parameters, and their return types. An agent encountering the Brain for the first time can introspect its capabilities.
- **Authentication is standard.** OAuth 2.0 or API key auth, same as any other MCP server.
- **The protocol evolves.** As MCP evolves (streaming, subscriptions, richer types), the Brain gains capabilities without schema changes.

### MCP Server Tools

The Brain MCP server exposes a focused set of tools:

```
brain_record
  Record a new entry in the Brain.
  Parameters:
    project     (required)  — Project identifier
    category    (required)  — decision | outcome | lesson | context | failure | pattern
    title       (required)  — One-line human-readable summary
    content     (required)  — Full detail: what, why, alternatives, rationale
    metadata    (optional)  — Tags, references, related sections
    links       (optional)  — Array of {target_id, link_type} relationships
  Returns: entry ID

brain_query
  Semantic search across entries.
  Parameters:
    query       (required)  — Natural language question or topic
    project     (optional)  — Filter to a specific project (omit for cross-project)
    category    (optional)  — Filter to a category
    limit       (optional)  — Max results (default: 10)
    min_score   (optional)  — Minimum similarity threshold (default: 0.7)
    current_only (optional) — Exclude superseded entries (default: true)
  Returns: ranked entries with similarity scores

brain_retrieve
  Fetch a specific entry by ID, including its link graph.
  Parameters:
    id          (required)  — Entry UUID
    depth       (optional)  — Link traversal depth (default: 1)
  Returns: entry with linked entries

brain_strengthen
  Signal that a retrieved entry was useful (or not).
  Parameters:
    id          (required)  — Entry UUID
    useful      (required)  — true | false
    context     (optional)  — Brief note on why
  Returns: updated usefulness score

brain_supersede
  Mark an entry as superseded by a new one.
  Parameters:
    old_id      (required)  — Entry being superseded
    new_id      (required)  — Replacement entry
    reason      (optional)  — Why the old entry is no longer current
  Returns: confirmation

brain_status
  Health and statistics for the Brain.
  Parameters:
    project     (optional)  — Filter to a specific project
  Returns: entry counts by category, avg usefulness, access patterns, storage metrics

brain_audit
  Query the audit log. Restricted to Admiral.
  Parameters:
    project     (optional)  — Filter to a specific project
    agent_id    (optional)  — Filter to a specific agent
    operation   (optional)  — Filter by operation type (record | query | retrieve | strengthen | supersede | purge)
    since       (optional)  — Only entries after this timestamp
    limit       (optional)  — Max results (default: 50)
  Returns: audit log entries with timestamp, agent_id, operation, project, entry_ids, result, risk_flags

brain_purge
  Permanently delete a Brain entry. Admiral only. For regulatory compliance (right-to-erasure).
  Parameters:
    id          (required)  — Entry UUID to purge
    regulation  (required)  — Regulatory basis (e.g., "GDPR Art. 17", "CCPA", "internal-policy")
    reason      (required)  — Human-readable justification for the purge
  Behavior:
    - The entry's content, title, metadata, and embedding are permanently deleted.
    - A tombstone record remains: the entry ID, purged_at timestamp, purge_reason, and regulation are preserved.
    - The tombstone is not retrievable via brain_query or brain_retrieve. It exists only for audit trail completeness.
    - All entry_links referencing the purged entry are removed.
    - An audit_log entry records the purge event. The audit log does NOT contain the purged content — only the entry ID, regulation, reason, and timestamp.
  Returns: { id, status: "purged", purged_at: timestamp }
  Errors: AUTHORITY_INSUFFICIENT if caller is not Admiral. NOT_FOUND. ALREADY_PURGED if entry was previously purged.
```

### Multi-Audience Access

The Brain serves three audiences through three interfaces, all reading the same data:

| Audience | Interface | Use Case |
|---|---|---|
| **Humans** | SQL client, dashboard, or web UI | Audit decision history. Review fleet patterns. Assess knowledge quality. Run ad-hoc queries. "Show me every authentication decision across all projects." |
| **LLM Agents** | MCP server (brain_query, brain_record) | Retrieve contextually relevant history before making decisions. Record decisions for future agents. "What lessons exist about database migrations in this project?" |
| **Machines** | REST API or direct SQL | CI/CD pipelines query for known failure patterns. Dashboards aggregate fleet health. Automation scripts read configuration snapshots. Monitoring alerts on anomaly patterns. |

### Agent Integration Patterns

**Pattern 1: Query Before Deciding**

Before making a Propose-tier or Escalate-tier decision, the agent queries the Brain for relevant precedent:

```
1. Agent receives task requiring architectural decision
2. Agent calls brain_query("authentication approach for stateless API", project="taskflow")
3. Brain returns: previous decision (JWT chosen), rationale, outcome, related lessons
4. Agent uses precedent to inform proposal — or notes deviation with justification
5. After decision is made, agent calls brain_record with the new decision
```

**Pattern 2: Record at Chunk Boundaries**

At every chunk boundary (Work Decomposition, Part 6), the agent records durable knowledge:

```
1. Chunk completes
2. Agent writes session checkpoint (file-based, Institutional Memory, Part 8) for intra-session use
3. Agent calls brain_record for any decisions, outcomes, lessons, or failures worth persisting
4. Brain entries outlive the session; checkpoint file does not need to
```

**Pattern 3: Cross-Project Intelligence**

When starting a new project, the orchestrator queries the Brain without a project filter to surface transferable knowledge:

```
1. New fleet stands up for Project B
2. Orchestrator calls brain_query("common failure modes in Next.js projects")
3. Brain returns lessons and patterns from Project A
4. Orchestrator incorporates relevant entries into Project B's Ground Truth
```

**Pattern 4: Failure Forensics**

When the recovery ladder (Failure Recovery, Part 7) reaches Escalate, the agent queries the Brain for similar failures before writing the escalation report:

```
1. Agent exhausts retry → fallback → backtrack → isolate
2. Before escalating, calls brain_query describing the failure
3. Brain may surface a resolution from a previous session or project
4. If found: agent tries the resolution before escalating
5. If not found: escalation report includes "No precedent found in Brain"
```

### Brain Integration with Decision Authority Tiers

The Brain is not a passive archive. It is an active participant in the decision workflow. Every Propose-tier and Escalate-tier decision should be informed by institutional memory. The Context Source Routing chain (Part 2, Standing Order 11) formalizes this, and the `brain_context_router` hook enforces it.

**Autonomous decisions:** Brain query is optional. The agent has earned trust in this category and may proceed on loaded context alone. However, agents should still query when the decision involves a pattern they haven't encountered in this session.

**Propose-tier decisions:** Brain query is **mandatory**. Before drafting a proposal, the agent must call `brain_query` with the decision topic. This surfaces:
- Prior decisions on the same topic (avoid re-litigating settled questions)
- Lessons from similar decisions in other projects (cross-project intelligence)
- Outcomes of previous approaches (avoid repeating mistakes)

Example: `brain_query("authentication approach for stateless API", project="taskflow")` → returns JWT decision, rationale, and outcome from a prior session.

**Escalate-tier decisions:** Brain query is **mandatory**. Before writing the escalation report, the agent must call `brain_query` describing the blocker. The escalation report must include a "Brain Consulted" section showing what was queried and what was found (or "No precedent found"). This ensures the Admiral receives escalations that have already exhausted institutional knowledge.

**Recovery ladder integration:** Before advancing to Step 4 (Isolate) or Step 5 (Escalate) of the recovery ladder (Part 7), agents must query the Brain for similar failures. The Failure Forensics pattern (above) codifies this. See also the `brain_context_router` hook which detects and warns when Propose/Escalate decisions are made without a preceding `brain_query`.

> **Why mandatory for Propose/Escalate but not Autonomous?** Autonomous decisions are high-frequency, low-risk, and within established patterns — adding a Brain query to every one would create latency without proportional value. Propose and Escalate decisions are low-frequency, high-impact, and often novel — exactly the cases where institutional memory prevents the most expensive mistakes.

### Access Control

Not every agent should read or write everything. **Access control is mandatory and enforced — not advisory.**

| Permission | Who | Why |
|---|---|---|
| **Read own project** | All agents in the fleet | Agents need project-specific history |
| **Read cross-project** | Orchestrators, Admiral | Cross-pollination requires trust |
| **Write** | All agents (own project only) | Every agent contributes knowledge |
| **Write cross-project** | Admiral only | Cross-project entries must be validated |
| **Supersede** | Admiral, orchestrator | Correcting the record requires authority |
| **Delete** | Admiral only (soft delete) | The Brain does not forget; it supersedes |

#### Zero-Trust Identity Verification

The Brain operates on zero-trust principles. **Caller-declared identity is never trusted.**

- Every MCP request must include a verifiable identity token — not just an agent name string.
- The MCP server validates the token against the fleet's identity registry before executing any operation.
- If identity cannot be verified, the request is rejected. No fallback to "trust the caller."
- The identity token binds the agent to a specific project, role, and permission scope. An agent cannot claim a different role or project than its token authorizes.
- Tokens are session-scoped and expire. A token from a prior session does not grant access in the current session.

### Identity Token Lifecycle

Tokens are the atomic unit of trust in the Brain's zero-trust model. Their lifecycle is fully specified.

#### Token Format Contract

Every identity token implementation — regardless of format — MUST satisfy this contract. The contract defines what a token must contain and how it must behave. Implementations that satisfy the contract are compliant; those that do not are non-compliant regardless of their underlying technology.

**Required claims (every token MUST contain all of these):**

| Claim | Type | Description |
|---|---|---|
| `token_id` | UUID | Unique identifier for this specific token instance. Used for revocation tracking. |
| `agent_id` | string | Verified identity of the agent (e.g., `orchestrator`, `frontend-implementer`). Must match the fleet roster. |
| `project` | string | Project scope. Exactly one project, or `_global` for cross-project orchestrators. |
| `role` | string | Agent's role in the fleet. Maps to fleet roster entry. |
| `authority_tier` | enum | One of: `enforced`, `autonomous`, `propose`, `escalate`. Bound at issuance, immutable for the token's lifetime. |
| `session_id` | UUID | The session this token is valid for. Tokens are session-scoped. |
| `issued_at` | ISO 8601 timestamp | When the token was issued. |
| `expires_at` | ISO 8601 timestamp | When the token expires. Default lifetime: 1 hour. Maximum lifetime: 4 hours. |
| `issuer` | string | Identity of the issuing authority (Admiral or identity service). |

**Signing requirements:**
- Tokens MUST be cryptographically signed by the issuing authority.
- The signing algorithm MUST use asymmetric cryptography (the verifier should not need the signing key) OR HMAC with a key known only to the issuer and the verifier (Brain MCP server).
- The signing key MUST NOT be accessible to any agent. Agents receive tokens; they cannot forge them.
- The Brain MCP server MUST verify the signature before processing any request. Invalid signatures are rejected with no fallback.

**Verification requirements:**
- The Brain MCP server maintains a verification key (public key for asymmetric, shared secret for HMAC).
- Verification checks: signature validity, expiration (`expires_at` > now), session validity (`session_id` is active), and revocation status (`token_id` not in revocation list).
- All four checks MUST pass. Failure of any single check rejects the request.

#### Reference Format: JWT

The reference implementation format is JSON Web Token (RFC 7519). Implementations MAY use alternative formats (PASETO, custom) provided they satisfy the token format contract above.

**JWT header:**
```json
{
  "alg": "ES256",
  "typ": "JWT"
}
```

**Algorithm:** ES256 (ECDSA with P-256 and SHA-256) is the RECOMMENDED signing algorithm. It provides asymmetric signing (the verification key cannot forge tokens) with compact signatures. RS256 (RSA with SHA-256) is ACCEPTABLE. HS256 (HMAC-SHA256) is ACCEPTABLE for single-server deployments where the Brain MCP server and identity authority share infrastructure.

**Prohibited:** The `none` algorithm MUST NOT be accepted. The `alg` header MUST be validated against an allowlist, not parsed dynamically. This prevents algorithm confusion attacks.

**JWT payload (maps to required claims):**
```json
{
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "sub": "frontend-implementer",
  "project": "taskflow",
  "role": "specialist",
  "authority_tier": "autonomous",
  "session_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "iat": 1709712000,
  "exp": 1709715600,
  "iss": "admiral-identity-service"
}
```

**Claim mapping:** `jti` → `token_id`, `sub` → `agent_id`, `iat` → `issued_at`, `exp` → `expires_at`, `iss` → `issuer`. Custom claims (`project`, `role`, `authority_tier`, `session_id`) are namespaced under the JWT payload directly.

#### Lifecycle

**Issuance:**
- Tokens are issued by the fleet's identity authority (Admiral or automated identity service) at session start.
- Each token binds: agent identity, project scope, role, authority tier, session ID, and expiration time per the claims schema above.
- Tokens are cryptographically signed. The Brain MCP server verifies the signature before processing any request.

**Scope:**
- A token grants access to exactly one project (or `_global` for cross-project orchestrators).
- A token grants exactly one authority tier. No token grants multiple tiers.
- A token grants exactly one role. An agent cannot claim a different role than its token specifies.

**Rotation:**
- Long-running sessions must rotate tokens at a configurable interval (default: 1 hour, matching the default `expires_at` lifetime).
- Rotation requires re-authentication with the identity authority. The identity authority issues a new token with a fresh `token_id`, new `issued_at`/`expires_at`, and the same `session_id`. The old token is added to the revocation list.
- Stale tokens (past `expires_at`) are rejected without consulting the revocation list.
- The Brain logs token rotation events in the audit trail.

**Revocation:**
- Any token can be revoked immediately by the Admiral or the Emergency Halt Protocol.
- Revocation is propagated to the Brain MCP server within one heartbeat interval (default: 10 seconds).
- The revocation list is an in-memory set of `token_id` values. It is append-only during a session. Expired tokens are pruned from the list automatically (they would fail the `expires_at` check regardless).
- A revoked token is permanently invalid. No re-issuance of the same `token_id`.
- When a token is revoked mid-operation, the in-flight operation completes but no subsequent operations are accepted.

**Delegation:**
- Tokens cannot be delegated. An agent cannot pass its token to another agent.
- If Agent A needs Agent B to access the Brain on its behalf, Agent B must obtain its own token from the identity authority with appropriate scope.
- This prevents privilege escalation through token sharing.

**Emergency Revocation:**
- The Emergency Halt Protocol (Escalation Protocol, Part 11) can revoke ALL active tokens fleet-wide in a single action.
- Implementation: the identity authority broadcasts a revocation epoch. The Brain MCP server rejects all tokens issued before the revocation epoch timestamp, regardless of their individual `expires_at`.
- This provides O(1) fleet-wide revocation without enumerating individual tokens.

#### Mandatory Enforcement

The permission matrix above is **not documentation — it is a runtime enforcement requirement.** The Brain MCP server must:

1. **Verify identity** on every request (see zero-trust above).
2. **Check project scope** — reject writes to projects the agent is not assigned to.
3. **Check operation authority** — reject supersede operations from agents below orchestrator level.
4. **Enforce read boundaries** — non-orchestrator agents querying `brain_query(project=None)` (cross-project) receive only their own project's results.
5. **Log every access** — see Audit Logging below.

Any Brain implementation that does not enforce these checks is non-compliant with the framework, regardless of what the documentation says.

#### Audit Logging

Every Brain operation is logged for accountability and forensic review:

| Field | What It Records |
|---|---|
| **timestamp** | When the operation occurred |
| **agent_identity** | Verified identity of the requesting agent (not self-declared) |
| **operation** | Which MCP tool was called (record, query, retrieve, strengthen, supersede) |
| **project** | Which project was accessed |
| **entry_ids** | Which entries were read, written, or modified |
| **result** | Success, denied (with reason), or error |
| **risk_flags** | Any sensitivity flags triggered (PII detected, cross-project access, supersession of high-usefulness entry) |

Audit logs are:
- **Immutable** — append-only. No agent can modify or delete audit records.
- **Reviewable** — the Admiral can query audit logs at any time for compliance review.
- **Alertable** — anomalous patterns (unusual access volume, repeated denials, cross-project probing) trigger alerts to the Admiral.

#### Sensitivity Classification

Not all Brain entries carry the same risk. The Brain classifies entry sensitivity:

| Level | Criteria | Additional Controls |
|---|---|---|
| **Standard** | General decisions, patterns, lessons with no sensitive content | Normal access control |
| **Elevated** | Entries referencing credentials, infrastructure configs, security posture | Logged read access, restricted to assigned agents |
| **Restricted** | Entries containing PII, financial data, compliance-critical records | Admiral-approved access only, access logged per-read, automatic decay |

Sensitivity is assessed at write time (by the MCP server, not the writing agent) and re-assessed when entries are retrieved in new contexts.

### Compliance Operations

**Right-to-erasure (brain_purge):** When regulatory requirements (GDPR Article 17, CCPA, or internal data retention policy) mandate permanent deletion, `brain_purge` removes all recoverable content while preserving a tombstone for audit trail integrity. This is distinct from supersession: superseded entries retain their full content for historical context; purged entries are permanently destroyed. Only the Admiral may invoke `brain_purge`, and the regulatory basis must be specified.

**Data retention:** Entries classified as `restricted` sensitivity should have a configurable retention period. When the retention period expires, the Admiral is alerted for review — entries may be purged, downgraded to a lower sensitivity, or explicitly retained with documented justification. The retention period is project-specific and recorded in Ground Truth.

**Supersession vs. purging:** Supersession is a knowledge management operation — old knowledge is replaced by new knowledge, but the historical record is preserved. Purging is a compliance operation — content is destroyed because it must not exist. These are fundamentally different operations with different authorization requirements and different audit semantics. Never use supersession as a substitute for purging when regulatory deletion is required. The `brain_supersede` audit trail preserves content; the `brain_purge` audit trail preserves only the fact that content was destroyed, the regulatory basis, and the justification — never the content itself.

### RAG Security — Retrieval Integrity and Grounding

The Brain is the fleet's primary knowledge retrieval system — a RAG (Retrieval-Augmented Generation) pipeline. RAG introduces specific security risks that must be addressed:

#### Retrieval Poisoning Prevention

If an attacker or a malfunctioning agent writes misleading entries to the Brain, every future agent that retrieves those entries will be influenced by poisoned knowledge. Defenses:

- **Provenance tracking**: Every entry records its source agent, session, and authority tier. Entries from lower-authority sources are flagged when retrieved alongside higher-authority entries.
- **Usefulness signal**: The strengthening model (access_count, usefulness) surfaces well-validated entries and deprioritizes unreliable ones. Entries with net-negative usefulness are flagged for Admiral review.
- **Quarantine integration**: External intelligence passes through the quarantine layer before Brain ingestion. Internal entries from agents that have triggered security alerts are flagged for review.
- **Contradiction detection**: When a retrieved entry contradicts another entry on the same topic, both are surfaced with the conflict clearly labeled. The consuming agent must not silently pick one.

#### Retrieval Grounding Requirements

When an agent retrieves Brain entries and uses them to inform its output, the following grounding rules apply:

1. **Cite the source.** Any claim derived from a Brain entry must reference the entry ID. No unattributed use of retrieved knowledge.
2. **Distinguish retrieved from generated.** The agent must clearly separate "The Brain says X (entry UUID)" from "I infer Y based on this." Consumers of the agent's output must be able to tell which parts came from retrieval and which from generation.
3. **Check currency.** Before relying on a retrieved entry, verify it has not been superseded. Stale entries used as current fact are a grounding failure.
4. **Assess relevance.** A high similarity score does not guarantee relevance. The agent must evaluate whether the retrieved entry actually applies to the current context before incorporating it.
5. **Never fabricate retrieval results.** If the Brain returns no relevant entries, the agent reports "No precedent found" — it does not generate plausible-sounding fake precedent.

#### RAG Pipeline Integrity

The end-to-end RAG pipeline (query → embed → search → rank → retrieve → ground → output) must maintain integrity at each stage:

| Stage | Integrity Check |
|---|---|
| **Query** | Is the query well-formed and scoped to authorized projects? |
| **Embed** | Is the embedding model the expected version? Has it been tampered with? |
| **Search** | Are results filtered by access control before ranking? |
| **Rank** | Are ranking signals (similarity, usefulness, recency) applied consistently? |
| **Retrieve** | Are returned entries complete and unmodified from storage? |
| **Ground** | Does the consuming agent cite, distinguish, and validate retrieved content? |
| **Output** | Is the final output auditable — can a reviewer trace every claim to its source? |

> **ANTI-PATTERN: BRAIN BYPASS** — Agents that never query the Brain before decisions. They make the same mistakes as previous sessions. They re-litigate settled questions. Wire brain_query into the decision workflow — either as a hook trigger or as a required step in the Propose-tier template.

> **ANTI-PATTERN: BLIND TRUST IN RETRIEVAL** — An agent retrieves a Brain entry with high similarity score and incorporates it into its output without checking provenance, currency, or relevance. The entry was superseded two sessions ago. The agent's output is built on stale knowledge presented as current fact. Always verify before grounding.

-----

## Intelligence Lifecycle

> **TL;DR** — Knowledge enters the Brain as raw entries, gets strengthened through use and validation, linked into a knowledge graph, and surfaces to agents as contextually relevant intelligence. The lifecycle turns data into wisdom.

### The Knowledge Pipeline

```
Capture → Embed → Store → Retrieve → Strengthen → Link → Surface → Review
   ▲
   │
External Intelligence (Monitor)
```

Knowledge enters the Brain from two channels:

- **Internal capture:** Agents record decisions, outcomes, lessons, and failures from their own work.
- **External intelligence:** The Continuous AI Landscape Monitor (`monitor/`) is designed to feed curated ecosystem intelligence — model releases, agent patterns, emerging tools — through a quarantine layer before it reaches the Brain.

Both channels converge at the same pipeline. External entries arrive as seed candidates with `"approved": False` — requiring Admiral review before activation.

**1. Capture.** An agent calls `brain_record` with a decision, outcome, lesson, or failure. Content should include the *why*, not just the *what* — rationale is what makes an entry useful to future agents.

**2. Embed.** The MCP server generates a vector embedding of the entry's title and content. This is automatic and immediate. The embedding model is a utility-tier concern (Model Selection, Part 4) — small, fast, cheap.

**3. Store.** The entry and its embedding are written atomically to Postgres. Indexes update. The entry is immediately queryable.

**4. Retrieve.** An agent calls `brain_query` with a natural language question. pgvector performs approximate nearest neighbor search. Results are ranked by cosine similarity, filtered by project/category/recency, and returned with scores.

**5. Strengthen.** The consuming agent signals whether the retrieved entry was useful. Over time, high-usefulness entries rise to the top of result rankings. Low-usefulness entries sink.

**6. Link.** Agents or the Admiral create explicit relationships between entries: "this decision *caused* this outcome," "this lesson *contradicts* that earlier lesson," "this pattern *elaborates* that decision." Links turn isolated records into a knowledge graph.

**7. Surface.** The Admiral or orchestrator periodically reviews Brain statistics — most accessed entries, highest usefulness scores, unlinked entries, superseded chains — and promotes key insights into Ground Truth (Part 2) or standing context (Context Profiles, Part 2).

**8. Review.** At regular intervals (or triggered by Fleet Health Metrics, Part 8), the Admiral audits the Brain: stale entries flagged, contradictions resolved, patterns extracted, cross-project knowledge validated.

### What to Capture

Not everything belongs in the Brain. File-based persistence (Institutional Memory, Part 8) handles ephemeral state. The Brain stores durable knowledge.

| Capture | Don't Capture |
|---|---|
| Decisions with rationale and alternatives | Routine task completions with no lessons |
| Outcomes that confirm or contradict expectations | Intermediate work products |
| Lessons learned from failures or surprises | Raw tool output or log files |
| Failure modes encountered and their resolutions | Session checkpoint data (use files) |
| Patterns that worked across multiple contexts | Agent internal reasoning traces |
| Ground Truth snapshots at phase boundaries | Temporary workarounds with no lasting value |
| Configuration changes and their motivations | Draft content before finalization |

### Retrieval Quality

Vector similarity alone is not enough. The Brain's retrieval pipeline applies multiple signals:

1. **Semantic similarity** (pgvector cosine distance) — the primary ranking signal.
2. **Project relevance** — entries from the current project rank higher than cross-project entries.
3. **Recency** — more recent entries rank higher when similarity scores are close.
4. **Usefulness** — entries with higher net usefulness scores rank higher.
5. **Currency** — superseded entries are excluded by default (retrievable via explicit flag).
6. **Category match** — when the query implies a category (e.g., "what went wrong with..." implies `failure`), category-matched entries rank higher.
7. **Provenance weight** — entries from higher-authority sources (HUMAN, ENFORCED) rank above entries from lower-authority sources (AGENT, MONITOR) when similarity scores are close.
8. **Contradiction awareness** — when two retrieved entries contradict each other (linked via `contradicts` relationship), both are returned with the conflict explicitly flagged. The consuming agent must resolve the contradiction, not silently pick one.

### Multi-Hop Retrieval

Single-pass retrieval answers "what is relevant to my query?" Multi-hop retrieval answers "what is the full reasoning chain behind a decision?"

**How it works:**

1. Agent queries: "Why did we choose JWT for authentication?"
2. Brain returns the primary entry (the JWT decision).
3. Agent requests `brain_retrieve(id, depth: 2)` — follows links two levels deep.
4. Brain returns: the decision + the context that caused it + the outcome that resulted + any lessons or failures linked to the outcome.
5. The agent now has the full chain: cause → decision → outcome → consequence.

**When to use multi-hop:**
- Before making a Propose-tier decision that reverses or extends a prior decision
- When a retrieved entry references other entries (links exist)
- During failure forensics — tracing the causal chain from symptom to root cause
- During cross-project intelligence queries — understanding whether a pattern applies in the current context

**Traversal limits:**
- Default depth: 1 (entry + immediate links)
- Maximum depth: 3 (prevents runaway graph traversal)
- Maximum nodes returned: 50 (prevents context overflow from dense graphs)
- Cycle detection: the traversal engine tracks visited nodes and never revisits them

### Retrieval Confidence

Every retrieval result includes a confidence indicator reflecting the quality of the match:

| Confidence | Criteria | Agent Action |
|---|---|---|
| **High** | Similarity > 0.85, same project, high usefulness, not superseded | Use directly with citation |
| **Medium** | Similarity 0.70–0.85, or cross-project, or moderate usefulness | Use with verification — check currency and applicability |
| **Low** | Similarity 0.50–0.70, or low usefulness, or superseded entries included | Treat as suggestive, not authoritative. Verify independently before relying on it |
| **Conflict** | Multiple entries contradict each other | Present both sides. Do not silently resolve. Escalate if the decision depends on which is correct |

### The Knowledge Graph

Entry links create a navigable graph of fleet intelligence:

```
Decision: "Use JWT for auth"
  ├── elaborates → Context: "API must be stateless for horizontal scaling"
  ├── caused_by  → Lesson: "Session cookies fail with multiple load balancer targets"
  ├── supports   → Pattern: "Stateless auth simplifies fleet agent access to APIs"
  └── caused     → Outcome: "Auth middleware passes all 47 tests, 12ms avg latency"
                      └── contradicts → Failure: "JWT refresh token rotation race condition under load"
                                            └── caused → Decision: "Add Redis-backed token blacklist"
```

Agents traversing links get not just an answer but the *reasoning chain* behind it. When `brain_retrieve` is called with `depth: 2`, the agent receives the entry and two levels of linked entries — enough context to understand why a decision was made and what happened after.

### External Intelligence: The Continuous Monitor

The Brain does not only learn from the fleet's own experience. The Continuous AI Landscape Monitor (`monitor/`) specifies an automated surveillance system designed to scan the AI ecosystem and feed curated intelligence into the Brain.

**What the monitor captures:**

| Finding Kind | Brain Category | Source |
|---|---|---|
| Model/SDK releases | CONTEXT | GitHub Releases API across 11 providers |
| Official docs, blog posts, RSS announcements | CONTEXT | Provider blogs, RSS feeds, release content URLs |
| Exemplar tool updates (Claude Code, Aider, Cline, etc.) | PATTERN | 20 tracked repos with watch-for criteria |
| Agent configuration files (AGENTS.md, CLAUDE.md, .cursorrules, etc.) | PATTERN | Direct extraction from exemplar repos |
| Fleet-relevant repos discovered via search | PATTERN | 13 targeted GitHub queries + 8 topic scans |
| Trending repos gaining traction | PATTERN | Star-surge detection with quality filtering |

**The quarantine layer:** Per the Monitor specification, all external content passes through the quarantine layer — a five-layer immune system (structural validation, injection detection, deterministic semantic analysis [LLM-airgapped], LLM advisory [reject-only], antibody generation) — before reaching the Brain. The load-bearing layers (1-3) are completely LLM-free; the LLM layer can only reject, never approve. Hostile content is rejected and converted into FAILURE entries that teach the fleet what adversarial patterns look like.

**The approval gate:** When deployed, Monitor findings arrive as seed candidates with `"approved": False`. Nothing enters the Brain without Admiral review. This prevents automated poisoning while keeping the intelligence pipeline flowing.

**How the fleet benefits:**

- **Model Selection (Part 4)** stays current — new releases trigger tier reassessment.
- **Agent definitions** evolve — patterns extracted from exemplar tools inform prompt design, tool configuration, and boundary definitions.
- **Ground Truth (Part 2)** is refreshed — ecosystem changes surface as context entries the Admiral can integrate.

> **ANTI-PATTERN: INTELLIGENCE WITHOUT ACTION** — The Monitor is configured to run daily, digests accumulate, seed candidates pile up — but the Admiral never reviews them and findings never reach the Brain. Intelligence has value only when it changes fleet behavior. Review cadence must match scan cadence.

### Cross-Project Intelligence

The Brain's greatest long-term value is knowledge that transfers across projects.

**Lessons** are the most transferable category. "Prisma migrations fail silently when the database URL contains special characters" applies everywhere Prisma is used, regardless of project.

**Patterns** are the second most transferable. "Contract-first parallelism reduces handoff rejection rate" is project-agnostic.

**Decisions** are project-specific but informative. "We chose JWT over sessions" matters to the current project but may inform similar decisions elsewhere.

**Cross-project promotion workflow:**

1. Admiral reviews Brain entries from completed projects.
2. Entries with high usefulness scores and broad applicability are flagged.
3. Admiral creates a new entry with `project: "_global"` (or a shared namespace) that distills the project-specific knowledge into a transferable form.
4. New fleets query `_global` entries during standup for relevant precedent.

### Brain Health Metrics

| Metric | Healthy | Warning |
|---|---|---|
| **Write rate** | Steady entries per session | Zero writes — agents aren't recording |
| **Read rate** | Queries before Propose/Escalate decisions | Zero reads — agents aren't consulting |
| **Usefulness ratio** | Net positive across categories | Net negative — entries are misleading |
| **Supersession rate** | Low and stable | High — knowledge is frequently wrong |
| **Link density** | Increasing over time | Flat — entries are isolated, not connected |
| **Cross-project query rate** | Present during fleet standup | Zero — knowledge is siloed |
| **Stale entry count** | Low (regular review) | Growing — Admiral not reviewing |

### Migration from File-Based Persistence

For fleets already operating with file-based persistence (Institutional Memory, Part 8), the Brain is additive, not a replacement.

**Phase 1: Parallel operation.** Continue file-based checkpoints and handoff documents. Add brain_record calls at chunk boundaries for decisions, lessons, and failures. Agents begin querying the Brain but do not depend on it.

**Phase 2: Brain-first retrieval.** Agents query the Brain before consulting checkpoint files for historical context. Checkpoint files remain for session-level state. The Brain becomes the primary source for cross-session knowledge.

**Phase 3: Full integration.** SessionStart hooks query the Brain for relevant project history and inject it into standing context. Handoff documents are generated from Brain queries rather than written manually. File-based persistence handles only intra-session state.

> **ANTI-PATTERN: PREMATURE MIGRATION** — Ripping out file-based persistence before the Brain is proven. The Brain must demonstrate retrieval quality and reliability before it becomes the sole source of cross-session knowledge. Run both systems in parallel. Measure. Then migrate.

> **ANTI-PATTERN: BRAIN HOARDING** — Recording everything "just in case." Every routine task completion, every minor code change, every passing test. The Brain fills with noise. Retrieval quality degrades. Signal-to-noise ratio collapses. Be selective: capture what a future agent would need to make a better decision, not what happened in exhaustive detail.

-----

## Event-Driven Operations

> **TL;DR** — Brain reads and writes are not passive. Every query emits a demand signal. Every record triggers a contradiction scan. Every operation feeds self-instrumentation. These side-effects are what turn a knowledge store into a knowledge *system*.

### Recursion Prevention

Event-driven operations create side-effects on Brain operations. Without explicit boundaries, side-effects can trigger further operations that trigger further side-effects — an infinite loop. This section defines the invariants that prevent recursion.

**The core rule: side-effects are terminal.** A side-effect produced by a Brain operation MUST NOT trigger another side-effect. Concretely:

| Operation | Side-Effect | Side-Effect Classification | Can Trigger Further Side-Effects? |
|---|---|---|---|
| `brain_query` | Demand signal record | **Operational write** | No |
| `brain_record` | Contradiction scan | **Operational read** | No |
| `brain_record` to `_meta` | (none) | — | N/A |
| `brain_supersede` | (none beyond the supersession itself) | — | N/A |

**Three classes of Brain operation:**

1. **Agent-initiated** — An agent calls `brain_query`, `brain_record`, `brain_retrieve`, etc. These trigger side-effects (demand signal, contradiction scan).
2. **Operational** — Side-effects of agent-initiated operations. Demand signal writes and contradiction scan reads are operational. Operational operations NEVER trigger further side-effects. They bypass the event-driven hooks entirely.
3. **Scheduled** — Self-instrumentation writes to `_meta`, triggered by session boundaries or periodic assessment. These are agent-initiated by the Admiral or a SessionStart hook — they trigger contradiction scans (which are operational and terminate), but they do NOT emit demand signals (they are not queries).

**Implementation requirements:**

- **B1:** Structural separation enforces this. Demand signals write to `.brain/_demand/` (not via `brain_record`, so no contradiction scan). Contradiction scans use `grep` (not via `brain_query`, so no demand signal). Self-instrumentation uses `brain_record` to `_meta/` (triggers a contradiction scan via grep, which terminates). No path exists for recursion.
- **B2+:** The MCP server MUST tag each internal operation with an `origin` field: `agent`, `operational`, or `scheduled`. The event-driven hooks check this field and skip side-effects for `operational` origins. This is a hard enforcement — not advisory. A missing `origin` field defaults to `agent` (safe direction: more side-effects, not fewer, preventing silent data loss from miscategorized operations).

**Why this matters:** At B1, recursion prevention is accidental — an artifact of using separate directories and grep. At B2+, where all operations flow through the same MCP server and database, recursion prevention must be explicit and enforced. The `origin` field is the mechanism.

### Demand Signal (Read Hooks)

Every `brain_query` operation generates a **demand record** as a side-effect. This is not access logging — it captures *what the fleet needs to know*, regardless of whether the Brain has the answer.

**Demand record fields:**

| Field | Type | Description |
|---|---|---|
| `query_text` | string | The natural language query as submitted |
| `agent_id` | string | Verified identity of the querying agent |
| `project` | string | Project scope of the query |
| `results_returned` | integer | Number of entries returned (0 = knowledge gap) |
| `max_similarity` | float | Highest similarity score among results (0.0 if no results) |
| `timestamp` | ISO 8601 | When the query was executed |

**What demand signals reveal over time:**

- **Knowledge gaps:** Queries that consistently return 0 results or low similarity scores indicate topics the fleet needs to know about but hasn't recorded. These are the Brain's blind spots.
- **Over-reliance:** Entries that appear in results disproportionately often may indicate the fleet is anchoring on a single precedent rather than developing independent analysis. Flag when any single entry appears in >20% of query results over a rolling 7-day window.
- **Decay candidates:** Entries that once appeared in results but no longer do (because newer, higher-usefulness entries have displaced them) are natural decay candidates.
- **Retrieval failure rate:** The ratio of queries returning 0 results to total queries. At B1, this is the primary graduation criterion (advance to B2 when >30%). At B2+, it measures embedding quality.

**B1 implementation:** Append demand records to `.brain/_demand/` as lightweight JSON files. One file per query, same timestamp-slug naming convention. These files are inputs to the graduation criteria — they make "missed retrievals" measurable rather than anecdotal.

**B2+ implementation:** Demand records are stored in a dedicated `demand_log` table. Aggregation queries surface knowledge gaps, over-reliance patterns, and retrieval failure rates. The `brain_status` tool includes demand signal summaries.

### Contradiction Scan (Write Hooks)

Every `brain_record` operation triggers a **contradiction scan** before the entry is committed. The scan searches for existing entries that may conflict with the new entry.

**Scan procedure:**

1. **Tag overlap search:** Find existing entries with overlapping tags in the same project. At B1, this is a keyword match against filenames and `metadata.tags`. At B2+, this is a vector similarity search.
2. **Category-aware filtering:** Focus on entries of the same category (a new `decision` is most likely to contradict an existing `decision` on the same topic, not an `outcome` or `lesson`).
3. **Conflict detection:** If any existing entry covers the same topic with a different conclusion, the scan flags the conflict.
4. **Response:** The conflict flag is returned to the writing agent alongside the new entry confirmation. The writing agent must either:
   - Acknowledge the conflict and explain why the new entry supersedes the old one (triggering `brain_supersede`)
   - Acknowledge the conflict as a legitimate divergence (different context justifies different conclusion)
   - Withdraw the new entry if the existing entry is still correct

**What contradiction scans prevent:**

- **Silent knowledge drift:** Two entries on the same topic reaching different conclusions, with no link between them. Future agents may retrieve either one depending on query phrasing, producing inconsistent fleet behavior.
- **Decision amnesia:** An agent making a decision that was already made differently in a prior session, without awareness of the precedent.
- **Supersession neglect:** Old entries that should be superseded remaining active because no one checked.

**B1 implementation:** On `brain_record`, run `grep -l` against `.brain/{project}/` for entries sharing 2+ tags with the new entry. Return filenames of potential conflicts in the shell wrapper output. The writing agent reviews manually.

**B2+ implementation:** On `brain_record`, the MCP server performs a vector similarity search scoped to the same project and category. Entries with similarity >0.80 to the new entry are returned as potential conflicts. If any conflicts have a `contradicts` relationship type available, the link is suggested automatically.

### Self-Instrumentation (_meta Namespace)

The Brain records knowledge about itself in a reserved `_meta` project namespace. This is not a separate system — it uses the same entry format, same categories, same retrieval interface. The Brain is its own subject.

**What `_meta` captures:**

| Category | Example Entry | Trigger |
|---|---|---|
| `context` | Health snapshot: write rate, read rate, entry count, stale count | Periodic (once per session or daily) |
| `failure` | Knowledge gap detected: 5 queries about "deployment rollback" returned 0 results this week | Demand signal aggregation |
| `pattern` | Query pattern: 73% of queries are `decision`-category, only 4% are `failure`-category | Demand signal aggregation |
| `outcome` | Graduation criteria: missed retrieval rate at 24% (below 30% threshold) | Periodic assessment |
| `decision` | Retention decision: 12 entries older than 90 days reviewed, 3 superseded, 9 retained | Admiral review |

**Why self-instrumentation matters:**

- **Brain health is fleet knowledge.** A Brain with degrading retrieval quality affects every agent's decision-making. Recording this as a Brain entry means agents can query "is the Brain healthy?" the same way they query any other topic.
- **Graduation criteria become auditable.** Instead of anecdotal tracking of missed retrievals, the `_meta` namespace contains concrete `outcome` entries documenting the graduation assessment over time.
- **Gap analysis is persistent.** When demand signals reveal a knowledge gap, the `_meta/failure` entry persists until the gap is filled — preventing the same blind spot from being discovered and forgotten across sessions.

**B1 implementation:** `.brain/_meta/` directory. Health snapshots recorded at session boundaries by the Admiral or SessionStart hook. Knowledge gap entries created when demand signal analysis (grep across `_demand/` files) reveals patterns.

**B2+ implementation:** `_meta` is a reserved project namespace. Brain MCP tools write self-instrumentation entries automatically. `brain_status` output is also recorded as a `_meta/context` entry. Governance agents (Context Health Monitor, specifically) can query `_meta` for Brain health trends.

**Access control:** `_meta` entries are readable by all agents (Brain health affects everyone). Only the Admiral, orchestrator, and the Brain MCP server itself can write to `_meta`. This prevents agents from polluting the self-instrumentation namespace.

-----

*Context is the currency of autonomous AI. The Brain is where that currency compounds.*
