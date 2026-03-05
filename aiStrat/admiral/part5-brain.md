# PART 5 — THE BRAIN

*Infrastructure designed for anything.*

*Parts 1–4 define what the fleet is, what it knows, how it's enforced, and who does the work. Part 5 gives the fleet long-term memory — a queryable knowledge system accessible through a standard protocol that any AI agent can speak. It replaces file-based persistence (Section 24) with a permanent knowledge system that captures not just what happened, but what it meant and why it mattered. Set up the Brain before the fleet starts executing (Part 6) so that every decision, lesson, and failure is captured from day one.*

-----

## 15 — BRAIN ARCHITECTURE

> **TL;DR** — A Postgres database with pgvector stores every decision, rationale, outcome, and lesson as vector embeddings that capture meaning, not keywords. One database. One schema. Any project. Any agent. Any time horizon.

### Start Simple: Validating the Brain Hypothesis

The full Brain specification below is enterprise-grade. Before committing to Postgres + pgvector + MCP, validate the core hypothesis: that persistent semantic memory improves fleet performance. Start with the lightest possible implementation, measure, then scale.

| Level | Storage | Retrieval | When to Advance |
|---|---|---|---|
| **Level 1: File-based** | JSON files in `.brain/` directory, one per entry. Git-tracked. | Keyword search via grep. Manual lookup. | When keyword search misses semantically relevant entries more than 30% of the time. |
| **Level 2: SQLite + embeddings** | Single SQLite file with entries table and vector column. Embeddings via local model or API. | Cosine similarity search. No multi-hop. | When concurrent agent access causes lock contention, or cross-project queries are needed. |
| **Level 3: Postgres + pgvector** | Full schema from `brain/schema/001_initial.sql`. HNSW indexes. | Multi-signal retrieval pipeline. Multi-hop traversal. | When retrieval latency or ranking quality needs the full specification below. |
| **Level 4: Full specification** | Everything in Levels 1-3 plus MCP server, identity tokens, quarantine, zero-trust access control. | Full retrieval with confidence levels, strengthening, decay awareness. | This is the target state for production fleets. |

Each level should run for at least 2 weeks of active fleet operation before advancing. Measure: retrieval hit rate (did the agent find what it needed?), retrieval precision (was the top result actually relevant?), and knowledge reuse rate (what percentage of Brain entries are accessed more than once?). If these metrics don't improve at the next level, the current level is sufficient.

> **ANTI-PATTERN: PREMATURE ARCHITECTURE** — Deploying Postgres + pgvector + MCP + identity tokens for a fleet that hasn't yet determined whether persistent memory helps. The infrastructure cost (setup, maintenance, security surface) is justified only when lighter approaches hit their limits. Start at Level 1. Graduate when you have evidence.

### Why a Database, Not Files

Institutional Memory (Section 24) defines five file-based persistence patterns — checkpoint files, ledger files, handoff documents, git-based state, and continuous operation. Files work for single-agent, single-project, single-session persistence. They break down when:

- **Multiple agents need the same knowledge simultaneously.** Files have no concurrency model. Two agents reading and writing the same checkpoint creates race conditions or stale reads.
- **Knowledge spans projects.** A lesson learned in Fleet A (e.g., "Prisma migrations must be reversible") is valuable in Fleet B. Files are siloed by project directory.
- **Semantic retrieval is needed.** "What decisions were made about authentication?" requires scanning every checkpoint, parsing unstructured text, and guessing which entries are relevant. Files support exact-match or keyword search. Meaning requires vectors.
- **History compounds.** After 50 sessions, file-based persistence produces hundreds of checkpoint files no agent can hold in context. A database can answer "what matters now" from any volume of history.
- **Audit and compliance demand structured records.** Files drift in format. A database enforces schema.

The Brain does not replace files for session-level work. Checkpoint files and handoff documents remain the right tool for intra-session persistence (see Institutional Memory, Section 24). The Brain is where durable knowledge goes — the decisions, rationale, and outcomes that should outlive any single session.

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

```sql
-- The atomic unit of knowledge
CREATE TABLE entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Classification
    project         TEXT NOT NULL,           -- Which project/fleet
    category        TEXT NOT NULL,           -- decision | outcome | lesson | context | failure | pattern

    -- Content
    title           TEXT NOT NULL,           -- Human-readable summary (one line)
    content         TEXT NOT NULL,           -- Full record: what happened, why, alternatives, rationale

    -- Semantic search
    embedding       vector(1536),            -- Vector embedding of title + content

    -- Metadata
    metadata        JSONB NOT NULL DEFAULT '{}',  -- Flexible: agent, section, tags, refs, authority_tier

    -- Provenance
    source_agent    TEXT,                    -- Which agent created this entry
    source_session  TEXT,                    -- Which session
    authority_tier  TEXT,                    -- enforced | autonomous | propose | escalate

    -- Strengthening
    access_count    INT NOT NULL DEFAULT 0,  -- How often retrieved
    usefulness      INT NOT NULL DEFAULT 0,  -- Net upvotes from consuming agents
    superseded_by   UUID REFERENCES entries(id)  -- Null if current; points to replacement if outdated
);

-- Semantic search index
CREATE INDEX ON entries USING hnsw (embedding vector_cosine_ops);

-- Filtered search indexes
CREATE INDEX ON entries (project, category);
CREATE INDEX ON entries (created_at);
CREATE INDEX ON entries (authority_tier);
CREATE INDEX ON entries ((metadata->>'tags')) USING gin;

-- Relationships between entries
CREATE TABLE entry_links (
    source_id   UUID NOT NULL REFERENCES entries(id),
    target_id   UUID NOT NULL REFERENCES entries(id),
    link_type   TEXT NOT NULL,              -- supports | contradicts | supersedes | elaborates | caused_by
    PRIMARY KEY (source_id, target_id, link_type)
);
```

### Entry Categories

| Category | What It Captures | Example |
|---|---|---|
| **decision** | A choice made, alternatives considered, rationale, authority tier used | "Chose JWT over session cookies because the API must be stateless for horizontal scaling" |
| **outcome** | The result of a decision or task — success, failure, or partial | "JWT implementation completed. Auth middleware passes all 47 test cases" |
| **lesson** | A reusable insight extracted from experience | "Prisma migrations fail silently when the database URL contains special characters. Always URL-encode credentials" |
| **context** | A snapshot of Ground Truth, environment state, or configuration at a point in time | "Tech stack as of 2026-02-15: Next.js 15.2, Postgres 16, pgvector 0.8.0" |
| **failure** | A failure mode encountered, diagnosis, and resolution | "Specialist drifted into orchestrator decisions (hierarchical drift, Section 23). Root cause: missing 'Does NOT Do' boundary in agent definition" |
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
- Embedding generation is a deterministic tool operation (LLM-Last principle, Section 02) — no flagship model needed.

### The Strengthening Model

Knowledge is not static. The Brain tracks which entries are useful and which have been superseded.

**Access tracking:** Every retrieval increments `access_count`. High-access entries are the fleet's working vocabulary — the knowledge agents actually use.

**Usefulness signal:** When an agent retrieves an entry and it contributes to a successful outcome, the consuming agent (or Admiral) increments `usefulness`. When an entry leads to a dead end, decrement. Net usefulness over time separates signal from noise.

**Supersession:** When a decision is reversed or a lesson is corrected, the old entry is not deleted. Its `superseded_by` field points to the replacement. History is preserved. Queries default to current entries but can traverse the supersession chain for full context.

**Decay awareness:** Entries that have not been accessed in a configurable window (e.g., 90 days) are flagged for review — not deleted, but surfaced to the Admiral for relevance assessment. Knowledge that is never retrieved may be stale.

> **ANTI-PATTERN: WRITE-ONLY MEMORY** — The Brain accumulates entries that are never queried. Decision logs grow unbounded. No agent benefits. The Brain is only valuable if it is read. Track access_count. If categories consistently show zero retrievals, the fleet either doesn't know the Brain exists (context gap) or the entries are not useful (quality gap). Diagnose and fix.

-----

## 16 — THE KNOWLEDGE PROTOCOL

> **TL;DR** — An MCP server exposes the Brain to any AI agent using a standard protocol. Agents write decisions, query semantically, and retrieve contextually relevant history — the same way, regardless of which agent, which model, or which tool built them. Humans use SQL. Machines use the API. Agents use MCP.

### MCP: The Universal Interface

The Model Context Protocol (Section 14) is how agents access tools and data sources. The Brain's MCP server makes the database a first-class tool in any agent's toolkit — no custom integration, no proprietary API, no coupling to a specific agent framework.

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

At every chunk boundary (Section 18), the agent records durable knowledge:

```
1. Chunk completes
2. Agent writes session checkpoint (file-based, Institutional Memory, Section 24) for intra-session use
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

When the recovery ladder (Section 22) reaches Escalate, the agent queries the Brain for similar failures before writing the escalation report:

```
1. Agent exhausts retry → fallback → backtrack → isolate
2. Before escalating, calls brain_query describing the failure
3. Brain may surface a resolution from a previous session or project
4. If found: agent tries the resolution before escalating
5. If not found: escalation report includes "No precedent found in Brain"
```

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

Tokens are the atomic unit of trust in the Brain's zero-trust model. Their lifecycle is fully specified:

**Issuance:**
- Tokens are issued by the fleet's identity authority (Admiral or automated identity service) at session start.
- Each token binds: agent identity, project scope, role, authority tier, session ID, and expiration time.
- Tokens are cryptographically signed. The Brain MCP server verifies the signature before processing any request.

**Scope:**
- A token grants access to exactly one project (or `_global` for cross-project orchestrators).
- A token grants exactly one authority tier. No token grants multiple tiers.
- A token grants exactly one role. An agent cannot claim a different role than its token specifies.

**Rotation:**
- Long-running sessions must rotate tokens at a configurable interval (default: 1 hour).
- Rotation requires re-authentication with the identity authority. Stale tokens are rejected.
- The Brain logs token rotation events in the audit trail.

**Revocation:**
- Any token can be revoked immediately by the Admiral or the Emergency Halt Protocol.
- Revocation is propagated to the Brain MCP server within one heartbeat interval (default: 10 seconds).
- A revoked token is permanently invalid. No re-issuance of the same token.
- When a token is revoked mid-operation, the in-flight operation completes but no subsequent operations are accepted.

**Delegation:**
- Tokens cannot be delegated. An agent cannot pass its token to another agent.
- If Agent A needs Agent B to access the Brain on its behalf, Agent B must obtain its own token from the identity authority with appropriate scope.
- This prevents privilege escalation through token sharing.

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

## 17 — INTELLIGENCE LIFECYCLE

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

**2. Embed.** The MCP server generates a vector embedding of the entry's title and content. This is automatic and immediate. The embedding model is a utility-tier concern (Section 13) — small, fast, cheap.

**3. Store.** The entry and its embedding are written atomically to Postgres. Indexes update. The entry is immediately queryable.

**4. Retrieve.** An agent calls `brain_query` with a natural language question. pgvector performs approximate nearest neighbor search. Results are ranked by cosine similarity, filtered by project/category/recency, and returned with scores.

**5. Strengthen.** The consuming agent signals whether the retrieved entry was useful. Over time, high-usefulness entries rise to the top of result rankings. Low-usefulness entries sink.

**6. Link.** Agents or the Admiral create explicit relationships between entries: "this decision *caused* this outcome," "this lesson *contradicts* that earlier lesson," "this pattern *elaborates* that decision." Links turn isolated records into a knowledge graph.

**7. Surface.** The Admiral or orchestrator periodically reviews Brain statistics — most accessed entries, highest usefulness scores, unlinked entries, superseded chains — and promotes key insights into Ground Truth (Section 05) or standing context (Section 06).

**8. Review.** At regular intervals (or triggered by fleet health metrics, Section 27), the Admiral audits the Brain: stale entries flagged, contradictions resolved, patterns extracted, cross-project knowledge validated.

### What to Capture

Not everything belongs in the Brain. File-based persistence (Institutional Memory, Section 24) handles ephemeral state. The Brain stores durable knowledge.

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
| Agent configuration files (CLAUDE.md, .cursorrules, etc.) | PATTERN | Direct extraction from exemplar repos |
| Fleet-relevant repos discovered via search | PATTERN | 13 targeted GitHub queries + 8 topic scans |
| Trending repos gaining traction | PATTERN | Star-surge detection with quality filtering |

**The quarantine layer:** Per the Monitor specification, all external content passes through the quarantine layer — a four-layer immune system (structural validation, injection detection, semantic analysis, antibody generation) — before reaching the Brain. Hostile content is rejected and converted into FAILURE entries that teach the fleet what adversarial patterns look like.

**The approval gate:** When deployed, Monitor findings arrive as seed candidates with `"approved": False`. Nothing enters the Brain without Admiral review. This prevents automated poisoning while keeping the intelligence pipeline flowing.

**How the fleet benefits:**

- **Model Selection (Section 13)** stays current — new releases trigger tier reassessment.
- **Agent definitions** evolve — patterns extracted from exemplar tools inform prompt design, tool configuration, and boundary definitions.
- **Ground Truth (Section 05)** is refreshed — ecosystem changes surface as context entries the Admiral can integrate.

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

For fleets already operating with file-based persistence (Institutional Memory, Section 24), the Brain is additive, not a replacement.

**Phase 1: Parallel operation.** Continue file-based checkpoints and handoff documents. Add brain_record calls at chunk boundaries for decisions, lessons, and failures. Agents begin querying the Brain but do not depend on it.

**Phase 2: Brain-first retrieval.** Agents query the Brain before consulting checkpoint files for historical context. Checkpoint files remain for session-level state. The Brain becomes the primary source for cross-session knowledge.

**Phase 3: Full integration.** SessionStart hooks query the Brain for relevant project history and inject it into standing context. Handoff documents are generated from Brain queries rather than written manually. File-based persistence handles only intra-session state.

> **ANTI-PATTERN: PREMATURE MIGRATION** — Ripping out file-based persistence before the Brain is proven. The Brain must demonstrate retrieval quality and reliability before it becomes the sole source of cross-session knowledge. Run both systems in parallel. Measure. Then migrate.

> **ANTI-PATTERN: BRAIN HOARDING** — Recording everything "just in case." Every routine task completion, every minor code change, every passing test. The Brain fills with noise. Retrieval quality degrades. Signal-to-noise ratio collapses. Be selective: capture what a future agent would need to make a better decision, not what happened in exhaustive detail.

-----

*The Fleet Admiral Framework · v5.0*

*Context is the currency of autonomous AI. The Brain is where that currency compounds.*
