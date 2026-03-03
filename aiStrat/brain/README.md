# The Brain

**Long-term fleet memory: Postgres + pgvector, accessible via MCP.**

This directory is the reference implementation of the Brain architecture defined in [admiral/part5-brain.md](../admiral/part5-brain.md). It provides:

- A database schema for storing decisions, outcomes, lessons, failures, and patterns as vector embeddings
- An MCP server exposing six tools (`brain_record`, `brain_query`, `brain_retrieve`, `brain_strengthen`, `brain_supersede`, `brain_status`) that any AI agent can use
- A ranked retrieval pipeline that combines semantic similarity, project relevance, recency, usefulness, currency, and category matching
- A pluggable embedding interface for generating vector representations

## Directory Structure

```
brain/
├── README.md               # This file
├── schema/
│   └── 001_initial.sql     # Postgres + pgvector schema (entries, entry_links, indexes)
├── core/
│   ├── models.py           # Data models (Entry, EntryLink, enums)
│   ├── store.py            # Thread-safe storage layer (in-memory + Postgres adapter)
│   ├── embeddings.py       # Pluggable embedding generation interface
│   └── retrieval.py        # 6-signal ranked retrieval pipeline
├── mcp/
│   └── server.py           # MCP server exposing all 6 Brain tools
├── services/
│   └── bootstrap.py        # Wiring and initialization
├── seeds/
│   └── seed_research.py    # Initial knowledge base (50 entries from framework research)
└── tests/
    └── test_store.py        # Store and retrieval tests
```

## Relationship to the Admiral Framework

| Part 5 Section | Implementation |
|---|---|
| Section 15 — Brain Architecture | `schema/001_initial.sql`, `core/models.py`, `core/store.py` |
| Section 16 — Knowledge Protocol | `mcp/server.py` (all 6 MCP tools) |
| Section 17 — Intelligence Lifecycle | `core/retrieval.py`, `core/embeddings.py` |

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 16+ with pgvector extension (for production use)
- An embedding model API key (OpenAI, or any compatible provider)

### In-Memory Mode (Development / Testing)

No database required. The in-memory store uses cosine similarity on Python lists:

```bash
python -m brain.services.bootstrap --mode memory
```

### Postgres Mode (Production)

```bash
# 1. Create the database and enable pgvector
psql -c "CREATE DATABASE fleet_brain;"
psql -d fleet_brain -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 2. Run the schema migration
psql -d fleet_brain -f brain/schema/001_initial.sql

# 3. Set environment variables
export BRAIN_DATABASE_URL="postgresql://user:pass@localhost:5432/fleet_brain"
export BRAIN_EMBEDDING_API_KEY="sk-..."

# 4. Start the MCP server
python -m brain.mcp.server
```

## Design Decisions

- **In-memory store for development.** Matches broker/'s pattern. Swappable for Postgres without changing the interface.
- **Embedding generation is pluggable.** The `EmbeddingProvider` protocol accepts any implementation — OpenAI, local models, or a mock for tests.
- **Retrieval is multi-signal.** Vector similarity alone is insufficient. The pipeline applies six ranking signals from Part 5, Section 17.
- **Access control is caller-declared.** The MCP server trusts the caller's declared identity (agent role, project). Authentication is handled at the MCP transport layer, not in business logic.
