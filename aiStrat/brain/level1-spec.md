<!-- Admiral Framework v0.2.0-alpha -->
# Brain Level 1: File-Based Knowledge Store

**The lightest possible implementation of persistent fleet memory.**

Level 1 validates the core hypothesis — that persistent semantic memory improves fleet performance — without any infrastructure beyond the filesystem and git. Start here. Measure. Graduate when keyword search fails you.

-----

## Entry Format

Each entry is a single JSON file. The field names are a strict subset of the Level 3/4 Postgres `entries` table columns (see `schema/001_initial.sql`), ensuring straightforward import during graduation.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "project": "taskflow",
  "category": "decision",
  "title": "Chose JWT over session cookies for stateless API auth",
  "content": "The API must support horizontal scaling behind a load balancer. Session cookies require sticky sessions or a shared session store. JWT tokens are self-contained and stateless. Trade-off: JWT revocation is harder (mitigated by short expiry + refresh tokens). Alternatives considered: session cookies with Redis, OAuth2 only.",
  "metadata": {
    "tags": ["auth", "architecture", "api"]
  },
  "source_agent": "architect",
  "created_at": "2026-03-05T14:30:22Z"
}
```

**Required fields:** `id`, `project`, `category`, `title`, `content`, `source_agent`, `created_at`.

**Optional fields:** `metadata` (defaults to `{}`).

**Category values:** `decision` | `outcome` | `lesson` | `context` | `failure` | `pattern` — same as Level 3/4.

**ID generation:** Use any UUID v4 generator. Shell: `uuidgen`. Python: `uuid.uuid4()`. The ID must be unique across all entries in all projects.

-----

## Directory Structure

```
.brain/
├── taskflow/
│   ├── 20260305-143022-decision-jwt-auth.json
│   ├── 20260305-160415-outcome-jwt-implementation.json
│   └── 20260306-091200-lesson-prisma-url-encoding.json
└── _global/
    └── 20260310-083000-pattern-contract-first-parallelism.json
```

- One subdirectory per project, matching the `project` field.
- `_global/` for cross-project knowledge (promoted by the Admiral).
- Git-tracked. Every entry is version-controlled with the repository.
- `.brain/` lives at the repository root.

-----

## Naming Convention

```
{YYYYMMDD-HHmmss}-{category}-{slug}.json
```

- **Timestamp:** UTC, matching `created_at`.
- **Category:** One of the six entry categories.
- **Slug:** Lowercase, hyphenated, 3-5 words summarizing the title. Keep under 50 characters.

Examples:
- `20260305-143022-decision-jwt-auth.json`
- `20260306-091200-lesson-prisma-url-encoding.json`
- `20260310-083000-pattern-contract-first-parallelism.json`

-----

## Recording Interface

Direct file write. No server, no database, no dependencies.

**Shell wrapper (optional):**

```bash
brain_record() {
  local project="$1" category="$2" title="$3" content="$4" agent="${5:-manual}"
  local timestamp=$(date -u +%Y%m%d-%H%M%S)
  local slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | cut -c1-50)
  local id=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")
  local dir=".brain/${project}"
  local file="${dir}/${timestamp}-${category}-${slug}.json"

  mkdir -p "$dir"
  cat > "$file" <<EOF
{
  "id": "${id}",
  "project": "${project}",
  "category": "${category}",
  "title": "${title}",
  "content": "${content}",
  "metadata": { "tags": [] },
  "source_agent": "${agent}",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  echo "Recorded: ${file}"
}
```

Usage: `brain_record "taskflow" "decision" "Chose JWT for auth" "JWT chosen because..." "architect"`

-----

## Retrieval Interface

Keyword search via standard command-line tools. No semantic understanding — this is the primary limitation that drives graduation to Level 2.

**Search by content:**

```bash
grep -rl "authentication" .brain/taskflow/
```

**Search by category:**

```bash
ls .brain/taskflow/*-decision-*.json
```

**Search by title keyword:**

```bash
grep -l '"title".*authentication' .brain/taskflow/*.json
```

**Read a specific entry:**

```bash
cat .brain/taskflow/20260305-143022-decision-jwt-auth.json | python3 -m json.tool
```

**List all entries for a project, sorted by date:**

```bash
ls -1 .brain/taskflow/ | sort
```

**Cross-project search:**

```bash
grep -rl "prisma" .brain/
```

-----

## Limitations

Level 1 is deliberately minimal. These limitations are features, not bugs — they define exactly when to graduate.

- **No semantic search.** "How did we handle user authentication?" will not find entries about "JWT" or "login flow" unless those exact keywords appear. This is the primary limitation.
- **No concurrency model.** Two agents writing to `.brain/` simultaneously could create race conditions. Acceptable for single-agent or low-concurrency fleets.
- **No cross-project queries** without filesystem traversal. Querying across projects requires searching multiple directories manually.
- **No structured relationships** between entries. No `entry_links`, no knowledge graph, no multi-hop retrieval.
- **No access control** beyond filesystem permissions. Any agent with repository access can read and write any entry.
- **No strengthening signals.** No `access_count`, no `usefulness` tracking. Entries are static after creation.
- **No supersession chain.** Outdated entries must be manually identified and removed or annotated.

-----

## Graduation Criteria

Track "missed retrievals" — instances where an agent searches for a concept and the relevant entry exists but keyword search does not find it. Methods to track:

1. **Manual observation:** When an agent makes a decision without consulting a relevant Brain entry that exists, note it.
2. **Search log:** Keep a simple log of searches and whether they returned the expected entries.
3. **Post-session review:** After each session, check whether Brain entries that should have informed decisions were actually found and used.

**Advance to Level 2 when:** Missed retrievals exceed 30% of searches over a 2-week period of active fleet operation. At that point, keyword search is failing often enough that the overhead of embedding generation and similarity search is justified.

-----

## Compatibility Note

The JSON fields used at Level 1 are a strict subset of the Level 3/4 Postgres `entries` table columns. Migration to Level 2 (SQLite) or Level 3 (Postgres) is a straightforward import:

| Level 1 JSON field | Level 2 SQLite column | Level 3 Postgres column |
|---|---|---|
| `id` | `id` (TEXT) | `id` (UUID) |
| `project` | `project` | `project` |
| `category` | `category` | `category` |
| `title` | `title` | `title` |
| `content` | `content` | `content` |
| `metadata` | `metadata` (JSON text) | `metadata` (JSONB) |
| `source_agent` | `source_agent` | `source_agent` |
| `created_at` | `created_at` | `created_at` (TIMESTAMPTZ) |

Fields present in Level 3/4 but absent at Level 1 (`embedding`, `embedding_model`, `access_count`, `usefulness`, `superseded_by`, `sensitivity`, `approved`, `authority_tier`, `source_session`, `last_accessed_at`) are populated with defaults during migration.
