# B1: File-Based Knowledge Store

**The lightest possible implementation of persistent fleet memory.**

B1 validates the core hypothesis — that persistent semantic memory improves fleet performance — without any infrastructure beyond the filesystem and git. Start here. Measure. Graduate when keyword search fails you.

-----

## Entry Format

Each entry is a single JSON file. The field names are a strict subset of the B3 Postgres `entries` table columns (see `schema/001_initial.sql`), ensuring straightforward import during graduation.

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

**Category values:** `decision` | `outcome` | `lesson` | `context` | `failure` | `pattern` — same as B3.

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

Keyword search via standard command-line tools. No semantic understanding — this is the primary limitation that drives graduation to B2.

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

## The Möbius Loop at B1

B1 implements lightweight versions of the Brain's Möbius Loop (see Part 5, The Möbius Loop). These are filesystem-based approximations of what becomes automated at B2+.

### Recursion Prevention at B1

Side-effects must not trigger further side-effects. At B1, this is enforced by structural separation:

- **Demand signals** write to `.brain/_demand/` — a separate directory, not via `brain_record`. No contradiction scan is triggered.
- **Contradiction scans** use `grep` against `.brain/{project}/` — a direct filesystem read, not via `brain_query`. No demand signal is emitted.
- **Self-instrumentation** writes to `.brain/_meta/` via `brain_record` — this triggers a contradiction scan (grep), which terminates. It does not emit a demand signal because it is not a query.

No path exists for infinite recursion at B1. At B2+, this structural separation is replaced by an explicit `origin` field on each operation (see Part 5, Recursion Prevention).

### Demand Signal

Every Brain query should be logged to `.brain/_demand/`. This makes the graduation criteria (missed retrieval rate) measurable rather than anecdotal.

**Demand record format:**

```json
{
  "query": "authentication approach",
  "agent": "architect",
  "project": "taskflow",
  "results_found": 2,
  "timestamp": "2026-03-05T14:25:00Z"
}
```

**Naming convention:** `{YYYYMMDD-HHmmss}-query-{slug}.json`

**Shell wrapper (optional):**

```bash
brain_log_query() {
  local query="$1" project="$2" results_found="$3" agent="${4:-manual}"
  local timestamp=$(date -u +%Y%m%d-%H%M%S)
  local slug=$(echo "$query" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | cut -c1-30)
  local dir=".brain/_demand"
  local file="${dir}/${timestamp}-query-${slug}.json"

  mkdir -p "$dir"
  cat > "$file" <<EOF
{
  "query": "${query}",
  "agent": "${agent}",
  "project": "${project}",
  "results_found": ${results_found},
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}
```

**Analyzing demand signals at B1:**

```bash
# Count queries with zero results (knowledge gaps)
grep -rl '"results_found": 0' .brain/_demand/ | wc -l

# Count total queries
ls .brain/_demand/ | wc -l

# Calculate missed retrieval rate
# (zero-result queries / total queries) — advance to B2 when >30%
```

### Contradiction Scan

Before recording a new Brain entry, scan for existing entries with overlapping content. At B1 this is a keyword-based approximation.

**Procedure:**

```bash
brain_check_conflicts() {
  local project="$1" tags="$2"
  # Search for entries sharing tags with the new entry
  for tag in $tags; do
    grep -rl "\"$tag\"" ".brain/${project}/" 2>/dev/null
  done | sort | uniq -c | sort -rn
  # Entries appearing multiple times share multiple tags — review these
}
```

Usage: `brain_check_conflicts "taskflow" "auth jwt api"` — returns entries sharing 2+ tags, sorted by overlap count. The writing agent reviews flagged entries before committing the new record.

**When conflicts are found:** The agent should either supersede the old entry (add a `superseded_by` note in the old entry's metadata) or document why both entries are valid (different context justifies different conclusions).

### Self-Instrumentation

The `_meta` namespace stores Brain health data as standard Brain entries.

**Directory:** `.brain/_meta/`

**What to record:**

- Health snapshots at session boundaries (entry count, categories breakdown, oldest entry age)
- Knowledge gaps detected from demand signal analysis
- Graduation criteria assessments (current missed retrieval rate)

**Example health snapshot:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "project": "_meta",
  "category": "context",
  "title": "Brain health snapshot 2026-03-15",
  "content": "Entry count: 47 (12 decision, 8 outcome, 15 lesson, 3 context, 6 failure, 3 pattern). Demand signals: 23 queries logged, 4 zero-result (17% miss rate, below 30% graduation threshold). Oldest entry: 2026-03-01. No supersession chains detected.",
  "metadata": { "tags": ["brain-health", "self-instrumentation"] },
  "source_agent": "admiral",
  "created_at": "2026-03-15T00:00:00Z"
}
```

-----

## Limitations

B1 is deliberately minimal. These limitations are features, not bugs — they define exactly when to graduate.

- **No semantic search.** "How did we handle user authentication?" will not find entries about "JWT" or "login flow" unless those exact keywords appear. This is the primary limitation. **Failure mode: silent knowledge loss.** The fleet has the answer but cannot find it — the agent makes a decision without consulting relevant precedent, potentially contradicting a prior decision that used different terminology. This compounds: each undiscovered precedent is a missed opportunity to learn from past work.
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

**Advance to B2 when:** Missed retrievals exceed 30% of searches over a 2-week period of active fleet operation. At that point, keyword search is failing often enough that the overhead of embedding generation and similarity search is justified.

-----

## Compatibility Note

The JSON fields used at B1 are a strict subset of the B3 Postgres `entries` table columns. Migration to B2 (SQLite) or B3 (Postgres) is a straightforward import:

| B1 JSON field | B2 SQLite column | B3 Postgres column |
|---|---|---|
| `id` | `id` (TEXT) | `id` (UUID) |
| `project` | `project` | `project` |
| `category` | `category` | `category` |
| `title` | `title` | `title` |
| `content` | `content` | `content` |
| `metadata` | `metadata` (JSON text) | `metadata` (JSONB) |
| `source_agent` | `source_agent` | `source_agent` |
| `created_at` | `created_at` | `created_at` (TIMESTAMPTZ) |

Fields present at B3 but absent at B1 (`embedding`, `embedding_model`, `access_count`, `usefulness`, `superseded_by`, `sensitivity`, `approved`, `authority_tier`, `source_session`, `last_accessed_at`) are populated with defaults during migration.
