<!-- Admiral Framework v0.3.0-alpha -->
# Brain Level 2: SQLite + Embeddings

**Semantic search without infrastructure overhead.**

Level 2 adds vector embeddings and similarity search to the Brain while keeping the operational footprint minimal — a single SQLite file, no server process, no Postgres. This is the right level when keyword search misses semantically relevant entries but concurrent multi-agent access and cross-project queries are not yet critical.

-----

## SQLite Schema

The schema mirrors the core columns from `schema/001_initial.sql` (Level 3/4 Postgres). Column names are identical to enable straightforward migration.

```sql
CREATE TABLE entries (
    id              TEXT PRIMARY KEY,          -- UUID as text
    created_at      TEXT NOT NULL,             -- ISO 8601 timestamp
    updated_at      TEXT NOT NULL,

    -- Classification
    project         TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('decision', 'outcome', 'lesson', 'context', 'failure', 'pattern')),

    -- Content
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,

    -- Semantic search (serialized float array, not pgvector)
    embedding       BLOB,
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',

    -- Metadata
    metadata        TEXT NOT NULL DEFAULT '{}',   -- JSON stored as text

    -- Provenance
    source_agent    TEXT NOT NULL,

    -- Strengthening
    access_count    INTEGER NOT NULL DEFAULT 0,
    usefulness      INTEGER NOT NULL DEFAULT 0,
    superseded_by   TEXT REFERENCES entries(id) ON DELETE SET NULL,

    -- Decay tracking — needed for decay awareness even at Level 2
    last_accessed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_entries_project_category ON entries (project, category);
CREATE INDEX idx_entries_created_at ON entries (created_at);

CREATE TABLE entry_links (
    source_id   TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    target_id   TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    link_type   TEXT NOT NULL CHECK (link_type IN ('supports', 'contradicts', 'supersedes', 'elaborates', 'caused_by')),
    created_at  TEXT NOT NULL,
    PRIMARY KEY (source_id, target_id, link_type)
);

CREATE TABLE audit_log (
    id          TEXT PRIMARY KEY,
    timestamp   TEXT NOT NULL,
    operation   TEXT NOT NULL CHECK (operation IN ('record', 'query', 'retrieve', 'strengthen', 'supersede', 'audit', 'purge', 'status')),
    agent_id    TEXT NOT NULL,
    project     TEXT NOT NULL,
    entry_id    TEXT,
    result      TEXT NOT NULL CHECK (result IN ('success', 'denied', 'error')),
    details     TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_audit_log_timestamp ON audit_log (timestamp);
CREATE INDEX idx_audit_log_project ON audit_log (project);
```

**Key differences from Level 3/4 Postgres:**
- `id` is TEXT (UUID string), not native UUID.
- `embedding` is BLOB (serialized float array), not `vector(1536)`.
- `metadata` is TEXT (JSON string), not JSONB. Use `json_extract()` for queries.
- No HNSW index — similarity search is a full table scan (acceptable to ~10,000 entries).
- No `sensitivity`, `approved`, `authority_tier`, or `source_session` columns. These are Level 3/4 concerns.
- The `audit_log` table at Level 2 omits `session_id`, `entry_ids` (array), `risk_flags`, and `ip_or_source`. These columns are added during the Level 2→3 migration to support the full zero-trust audit model.
- No immutability rules on `audit_log` (SQLite lacks Postgres RULE enforcement). Treat as convention.

-----

## Embedding Generation

Embeddings convert text into vectors that capture semantic meaning, enabling "authentication" to match "JWT" and "login flow."

**Recommended models:**

| Model | Dimensions | Requires | Best For |
|---|---|---|---|
| `text-embedding-3-small` (OpenAI) | 1536 | API key + network | Best quality. Use when API access is available. |
| `all-MiniLM-L6-v2` (local) | 384 | Python + sentence-transformers | Fully local. No API key, no network. Lower quality but zero cost. |

**Concatenation rule:** Embed `title + " " + content`. The title provides a dense summary; the content provides full detail.

**Python example (OpenAI):**

```python
import openai

def generate_embedding(title: str, content: str) -> list[float]:
    text = f"{title} {content}"
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding
```

**Python example (local):**

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def generate_embedding(title: str, content: str) -> list[float]:
    text = f"{title} {content}"
    return model.encode(text).tolist()
```

**Storage:** Serialize the float array to bytes for the BLOB column.

```python
import struct

def embedding_to_blob(embedding: list[float]) -> bytes:
    return struct.pack(f'{len(embedding)}f', *embedding)

def blob_to_embedding(blob: bytes, dimensions: int) -> list[float]:
    return list(struct.unpack(f'{dimensions}f', blob))
```

-----

## Retrieval Interface

Cosine similarity between the query embedding and all stored embeddings. This is a full table scan — no index acceleration — which is acceptable up to approximately 10,000 entries.

**Why the 0.7 default threshold (`min_score`):** Below 0.7, results are typically false positives — entries that share surface-level vocabulary but address different concerns. A query about "authentication" at 0.5 similarity might return entries about "authorization" or "certificates" that are related but not relevant to the specific decision at hand. The 0.7 threshold prevents agents from acting on shallow matches. **Judgment boundary:** If a query returns no results above 0.7 but the agent believes relevant entries exist, it should try reformulating the query before lowering the threshold. Lowering the threshold is a last resort, not a first response.

```python
import math
import sqlite3
import struct

def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

def brain_query(db_path: str, query_embedding: list[float],
                project: str = None, category: str = None,
                limit: int = 10, min_score: float = 0.7,
                dimensions: int = 1536) -> list[dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    sql = "SELECT * FROM entries WHERE superseded_by IS NULL"
    params = []
    if project:
        sql += " AND project = ?"
        params.append(project)
    if category:
        sql += " AND category = ?"
        params.append(category)

    rows = conn.execute(sql, params).fetchall()
    results = []
    for row in rows:
        if row["embedding"] is None:
            continue
        stored = list(struct.unpack(f'{dimensions}f', row["embedding"]))
        score = cosine_similarity(query_embedding, stored)
        if score >= min_score:
            results.append({
                "id": row["id"],
                "project": row["project"],
                "category": row["category"],
                "title": row["title"],
                "content": row["content"],
                "score": round(score, 4),
                "usefulness": row["usefulness"],
                "created_at": row["created_at"]
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    # Update access_count for returned entries
    for r in results[:limit]:
        conn.execute("UPDATE entries SET access_count = access_count + 1, last_accessed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?", (r["id"],))
    conn.commit()
    conn.close()
    return results[:limit]
```

-----

## Migration from Level 1

Import each JSON file from `.brain/`, generate its embedding, and insert into SQLite.

```python
import json
import glob
import sqlite3
import struct

def migrate_level1_to_level2(brain_dir: str, db_path: str, embed_fn, dimensions: int):
    """
    brain_dir: path to .brain/ directory
    db_path: path to the SQLite database file
    embed_fn: function(title, content) -> list[float]
    dimensions: embedding dimensions (1536 for text-embedding-3-small, 384 for MiniLM)
    """
    conn = sqlite3.connect(db_path)
    # Create schema (run the CREATE TABLE statements above)

    files = glob.glob(f"{brain_dir}/**/*.json", recursive=True)
    for filepath in files:
        with open(filepath) as f:
            entry = json.load(f)

        embedding = embed_fn(entry["title"], entry["content"])
        blob = struct.pack(f'{dimensions}f', *embedding)

        conn.execute(
            """INSERT INTO entries (id, project, category, title, content,
               embedding, metadata, source_agent, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (entry["id"], entry["project"], entry["category"],
             entry["title"], entry["content"], blob,
             json.dumps(entry.get("metadata", {})),
             entry.get("source_agent", "migration"),
             entry["created_at"], entry["created_at"])
        )

    conn.commit()
    conn.close()
    print(f"Migrated {len(files)} entries from {brain_dir} to {db_path}")
```

After migration, verify by running a representative query against the SQLite database and comparing results to what Level 1 keyword search would have returned.

-----

## Limitations

Level 2 is a stepping stone. These limitations define when to graduate to Level 3.

- **Single-writer lock.** SQLite allows only one writer at a time. Concurrent agent writes will block or fail with `SQLITE_BUSY`. Acceptable for sequential agent execution or low-concurrency fleets.
- **No HNSW index.** Similarity search is a full table scan computing cosine similarity against every entry. Performance degrades linearly with entry count. Acceptable up to ~10,000 entries.
- **No multi-hop retrieval.** The `entry_links` table exists but there is no built-in traversal engine. Multi-hop queries require application-level graph traversal.
- **No access control** beyond filesystem permissions on the SQLite file. No identity tokens, no per-agent scoping, no sensitivity classification.
- **No quarantine integration.** External content must be manually reviewed before insertion. No automated immune system.
- **No real-time concurrent reads during writes.** SQLite's WAL mode helps but does not match Postgres MVCC for concurrent read/write workloads.

-----

## Graduation Criteria

Advance to Level 3 (Postgres + pgvector) when any of:

1. **Concurrent access contention.** Multiple agents writing simultaneously causes `SQLITE_BUSY` errors or measurable wait times. Track write failures per session.
2. **Cross-project query needs.** Regular need to query across projects from multiple agents simultaneously.
3. **Retrieval latency.** Full-scan cosine similarity exceeds 500ms per query (typically around 10,000+ entries).
4. **Access control requirements.** Need for per-agent scoping, sensitivity classification, or identity tokens.
5. **Multi-hop retrieval needs.** Regular need to traverse entry link graphs for reasoning chains.

-----

## Compatibility Note

The schema is designed for column-for-column import to Level 3 Postgres:

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
| `audit_log` (subset) | `audit_log` (full) | Add columns: `session_id`, `entry_ids` (UUID[]), `risk_flags` (JSONB), `ip_or_source` (TEXT). Backfill `session_id` from `details` JSON if available, otherwise `'migration'`. |
